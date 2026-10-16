// Writes .vercel/output/config.json for the prebuilt deploy (npm run deploy:prod).
// Security headers on every page, then files, then the single-page app fallback.
// SPDX-License-Identifier: Apache-2.0
import { writeFileSync } from 'node:fs';

// The registry API the site talks to. Must match the VITE_API_BASE the site was built
// with (deploy:prod sets it on the build step), or every API call is blocked by
// connect-src below. Override with VEILCORE_API_ORIGIN when deploying against another.
const API_ORIGIN = new URL(
  process.env.VEILCORE_API_ORIGIN || process.env.VITE_API_BASE || 'https://veilcore-api-production.up.railway.app',
).origin;

// A key in any indexer address would be published inside the page for anyone to use. The
// same test as bboard-ui/src/veilcore/chain/config.ts carriesKey: a key-named query or
// fragment parameter, compared after decoding (so project%5Fid is caught as project_id),
// or a user name or password in the address.
const KEY_PARAM = /^(project[_-]?id|api[_-]?key|apikey|key|token|access[_-]?token|auth|authorization|secret|password)$/i;
export const carriesKey = (v) => {
  let u;
  try {
    u = new URL(String(v).trim());
  } catch {
    let raw = String(v);
    try {
      raw = decodeURIComponent(raw);
    } catch {
      /* keep the raw text */
    }
    return /[?&#;](project[_-]?id|api[_-]?key|apikey|key|token|access[_-]?token|auth|secret|password)=/i.test(raw);
  }
  if (u.username || u.password) return true;
  const names = [...new URLSearchParams(u.search).keys(), ...new URLSearchParams(u.hash.replace(/^#/, '')).keys()];
  return names.some((n) => KEY_PARAM.test(n.trim()));
};

// The chain features' indexer, and the check page's fallback on a test network
// (config.ts readIndexersFor): never with a key, in any build (the page carries the
// value whether or not VITE_REAL_CHAIN is set), and only over https / wss.
for (const [name, scheme] of [
  ['VITE_INDEXER_URL', 'https:'],
  ['VITE_INDEXER_WS_URL', 'wss:'],
]) {
  const v = (process.env[name] || '').trim();
  if (!v) continue;
  if (carriesKey(v))
    throw new Error(`${name} carries a key (project_id=…). That build is for your own computer only; it is never deployed.`);
  let u;
  try {
    u = new URL(v);
  } catch {
    throw new Error(`${name} is not an address.`);
  }
  if (u.protocol !== scheme) throw new Error(`${name} must start with ${scheme}//.`);
}

// Real-chain builds (VITE_REAL_CHAIN=1, see bboard-ui/src/veilcore/chain/config.ts) also
// talk to Midnight's indexer (https and wss) and to VeilCore's sponsor service. Proofs
// are made in a worker from this site's own /keys, /zkir and /params, so nothing else
// is needed. A build without the flag gets exactly the policy below and nothing more.
const REAL_CHAIN = process.env.VITE_REAL_CHAIN === '1';
const chainOrigins = [];
if (REAL_CHAIN) {
  const sponsor = process.env.VITE_SPONSOR_URL;
  if (!sponsor) throw new Error('VITE_REAL_CHAIN=1 needs VITE_SPONSOR_URL (the sponsor service), or the site cannot reach it.');
  const network = (process.env.VITE_NETWORK_ID || 'preprod').toLowerCase();
  if (network === 'mainnet') throw new Error('VITE_REAL_CHAIN=1 is for a test network only.');
  // Midnight's own preprod indexer shut on 9 October 2026; preprod needs the indexer named.
  if (network === 'preprod' && !(process.env.VITE_INDEXER_URL && process.env.VITE_INDEXER_WS_URL))
    throw new Error('VITE_REAL_CHAIN=1 on preprod needs VITE_INDEXER_URL and VITE_INDEXER_WS_URL (Midnight runs no public preprod indexer).');
  const indexer = new URL(process.env.VITE_INDEXER_URL || `https://indexer.${network}.midnight.network/api/v4/graphql`);
  const indexerWs = new URL(process.env.VITE_INDEXER_WS_URL || `wss://indexer.${network}.midnight.network/api/v4/graphql/ws`);
  chainOrigins.push(new URL(sponsor).origin, indexer.origin, `${indexerWs.protocol}//${indexerWs.host}`);
}

// The check page reads Midnight itself (bboard-ui/src/veilcore/chain/anchor-check.ts), on
// every network and with or without the flag: VITE_INDEXER_RELAY_URL (on mainnet the only
// way, through VeilCore's relay, docs/check-on-chain.md) and an optional second indexer,
// VITE_INDEXER_SECOND_URL. Without them the page says the date is the registry's report.
// Never a key in either: the page would publish it.
for (const name of ['VITE_INDEXER_RELAY_URL', 'VITE_INDEXER_SECOND_URL']) {
  const v = (process.env[name] || '').trim();
  if (!v) continue;
  if (carriesKey(v))
    throw new Error(`${name} carries a key (project_id=…). The page would publish it; point it at the relay instead.`);
  let u;
  try {
    u = new URL(v);
  } catch {
    throw new Error(`${name} is not an address.`);
  }
  if (u.protocol !== 'https:') throw new Error(`${name} must be an https address.`);
  if (!chainOrigins.includes(u.origin)) chainOrigins.push(u.origin);
}
// The second indexer counts only if it is another one: the page compares origin and path,
// without a trailing slash, and drops a second that is the first written differently.
{
  const indexerKey = (v) => {
    const u = new URL(v);
    return `${u.origin}${u.pathname.replace(/\/+$/, '')}`;
  };
  const relay = (process.env.VITE_INDEXER_RELAY_URL || '').trim();
  const second = (process.env.VITE_INDEXER_SECOND_URL || '').trim();
  if (relay && second && indexerKey(relay) === indexerKey(second))
    throw new Error('VITE_INDEXER_SECOND_URL is the same indexer as VITE_INDEXER_RELAY_URL; a second check needs a different one.');
}

// The content security policy. Checked against the built site in headless Chromium
// (every main page, zero violations; bboard-ui/src/hardening-roundD.test.ts) before each
// tightening:
//   script-src   only our own bundles. 'wasm-unsafe-eval' lets the Midnight on-chain
//                runtime compile its WebAssembly; it does not allow eval() of strings.
//   style-src    MUI and Emotion inject <style> tags at runtime, so 'unsafe-inline' is
//                needed for styles (not for scripts). Rendered documents can no longer
//                carry style attributes (DocPage forbids them), which is what made this
//                a phishing-overlay risk.
//   font-src     the Atkinson Hyperlegible Next file is bundled by @fontsource; no
//                Google Fonts. data: for any small font Vite inlines.
//   img-src      data: and blob: for QR codes and certificate images (html-to-image).
//   connect-src  our own origin (the .wasm file) and the registry API. Nothing on GitHub:
//                the documents are bundled at build time now (attack round D), and the
//                old entry allowed every repository on raw.githubusercontent.com. If the
//                app starts talking to a Midnight indexer or proof server, those origins
//                have to be added here.
//   Trusted Types  the one HTML sink (DocPage) goes through a policy that sanitises, so
//                no other code can hand a string to innerHTML and have it run.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob:",
  `connect-src 'self' ${API_ORIGIN}${chainOrigins.length ? ` ${chainOrigins.join(' ')}` : ''}`,
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  // 'self', not 'none': html-to-image sets a same-origin <base> while it inlines the
  // fonts for the certificate PNG.
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
  "require-trusted-types-for 'script'",
  // veilcore-docs: DocPage's sanitising policy. dompurify: the policy DOMPurify makes for
  // its own parsing, created once when it loads.
  'trusted-types veilcore-docs dompurify',
  'upgrade-insecure-requests',
].join('; ');

export const headers = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': csp,
  // Vercel adds HSTS on its own domains; whether it does on the veilcore.org alias was
  // not verified, so it is set here. Two years, subdomains included. Not "preload": that
  // is a submission to browser vendors and hard to undo, so it is Hunter's call.
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
  // No other origin gets a handle on a veilcore.org window, where the keys live.
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
};

writeFileSync(
  '.vercel/output/config.json',
  JSON.stringify(
    {
      version: 3,
      routes: [{ src: '/(.*)', headers, continue: true }, { handle: 'filesystem' }, { src: '/.*', dest: '/index.html' }],
    },
    null,
    2,
  ),
);
console.log('wrote .vercel/output/config.json');
