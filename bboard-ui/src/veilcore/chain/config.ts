// Whether this build sends real transactions, and where. Everything here comes from the
// build's environment (bboard-ui/.env.<mode>), so a build without VITE_REAL_CHAIN=1
// behaves exactly as the demo always has: nothing is sent to any network.
//
//   VITE_REAL_CHAIN=1                     turn the real-chain features on
//   VITE_REAL_CHAIN_CONTRACT_ADDRESS=…    the demo contract on preprod (64 hex characters)
//   VITE_SPONSOR_URL=https://…            the sponsor service that pays the fees
//   VITE_INDEXER_URL / VITE_INDEXER_WS_URL  the network's indexer (required on preprod: see INDEXERS)
// SPDX-License-Identifier: Apache-2.0

import { MAINNET_CONTRACT_ADDRESS, NETWORK } from '../../config/network';

const env = import.meta.env as unknown as Record<string, string | undefined>;

/** The flag. Off unless the build says exactly "1". */
export const REAL_CHAIN: boolean = env.VITE_REAL_CHAIN === '1';

const addr = (env.VITE_REAL_CHAIN_CONTRACT_ADDRESS ?? '').trim().toLowerCase().replace(/^0x/, '');
/** The contract the demo writes to, or undefined when none is configured. */
export const CHAIN_CONTRACT: string | undefined = /^[0-9a-f]{64}$/.test(addr) ? addr : undefined;

const sponsor = (env.VITE_SPONSOR_URL ?? '').trim().replace(/\/$/, '');
export const SPONSOR_URL: string | undefined = /^https?:\/\/[^\s]+$/.test(sponsor) ? sponsor : undefined;

// Midnight's own public indexers, where it still runs one. Preprod has none since 9 October
// 2026 (it is served by Blockfrost, which needs a project id): a preprod build must set
// VITE_INDEXER_URL and VITE_INDEXER_WS_URL. A project id in those is a key inside the page,
// so such a build is for this computer only; scripts/vercel-config.mjs refuses to deploy it.
const INDEXERS: Record<string, { http: string; ws: string }> = {
  preview: {
    http: 'https://indexer.preview.midnight.network/api/v4/graphql',
    ws: 'wss://indexer.preview.midnight.network/api/v4/graphql/ws',
  },
};

export const INDEXER_HTTP: string | undefined = env.VITE_INDEXER_URL?.trim() || INDEXERS[NETWORK]?.http;
export const INDEXER_WS: string | undefined = env.VITE_INDEXER_WS_URL?.trim() || INDEXERS[NETWORK]?.ws;

// ── Reading the chain on the public check page (anchor-check.ts) ──────────────────────
//
// The check page looks up the transaction the registry says dated a batch. That needs an
// indexer the browser can reach with no key in the page. Midnight runs a keyless one only
// on Preview; preprod and mainnet are served by Blockfrost, which needs a project id
// (docs.midnight.network/relnotes/network). So a hosted build reads through a relay that
// holds the id on its server (sponsor/src/indexer-relay.ts, docs/check-on-chain.md):
//
//   VITE_INDEXER_RELAY_URL=https://…/indexer   the relay's query address. Required for
//                                              the check on mainnet; a test build falls
//                                              back to VITE_INDEXER_URL (the sponsor's
//                                              relay on test.veilcore.org).
//   VITE_INDEXER_SECOND_URL=https://…          optional: a second, independent indexer.
//                                              When set, both must give the same answer.
//
// None may carry a key: a URL with a key in it is ignored here (and refused by
// scripts/vercel-config.mjs, which runs the same test), so the page never publishes one.
// The test-network fallback (VITE_INDEXER_URL) goes through the same filter.

/**
 * Query or fragment parameter names that hold a key. Compared after URLSearchParams has
 * decoded them, so project%5Fid or API-KEY are caught as well as project_id.
 */
const KEY_PARAM =
  /^(project[_-]?id|api[_-]?key|apikey|key|token|access[_-]?token|auth|authorization|secret|password)$/i;

/** True when a URL carries a key: a key-named parameter, or a user name or password in it. */
export const carriesKey = (v: string): boolean => {
  let u: URL;
  try {
    u = new URL(v.trim());
  } catch {
    // Not a URL at all: look for the names in the raw text, decoded where it can be.
    let raw = v;
    try {
      raw = decodeURIComponent(v);
    } catch {
      /* keep the raw text */
    }
    return /[?&#;](project[_-]?id|api[_-]?key|apikey|key|token|access[_-]?token|auth|secret|password)=/i.test(raw);
  }
  if (u.username || u.password) return true;
  const names = [...new URLSearchParams(u.search).keys(), ...new URLSearchParams(u.hash.replace(/^#/, '')).keys()];
  return names.some((n) => KEY_PARAM.test(n.trim()));
};

/** An indexer URL the page may read: https (or http on this computer only), no key in it. */
export const readUrl = (v: string | undefined): string | undefined => {
  const s = (v ?? '').trim();
  if (!s || carriesKey(s)) return undefined;
  try {
    const u = new URL(s);
    const local = u.hostname === '127.0.0.1' || u.hostname === 'localhost';
    return u.protocol === 'https:' || (u.protocol === 'http:' && local) ? s : undefined;
  } catch {
    return undefined;
  }
};

/** The same indexer however it is written: origin and path, without a trailing slash. */
export const sameIndexer = (a: string, b: string): boolean => {
  const key = (s: string) => {
    const u = new URL(s);
    return `${u.origin}${u.pathname.replace(/\/+$/, '')}`;
  };
  try {
    return key(a) === key(b);
  } catch {
    return a === b;
  }
};

/** The indexers the check page reads, first one first. Empty when none is configured. */
export const readIndexersFor = (
  network: string,
  e: { relay?: string; second?: string; indexer?: string },
): string[] => {
  // Mainnet reads only through the relay named for it, never a test build's leftover
  // VITE_INDEXER_URL. A test network falls back to the indexer its chain features use,
  // held to the same rules (no key, https).
  const first = readUrl(e.relay) ?? (network === 'mainnet' ? undefined : readUrl(e.indexer));
  const second = readUrl(e.second);
  if (!first) return [];
  return second && !sameIndexer(second, first) ? [first, second] : [first];
};

export const READ_INDEXERS: readonly string[] = readIndexersFor(NETWORK, {
  relay: env.VITE_INDEXER_RELAY_URL,
  second: env.VITE_INDEXER_SECOND_URL,
  indexer: INDEXER_HTTP,
});

/** True when the check page has an indexer to read Midnight with (the landing copy says so). */
export const CHAIN_READS: boolean = READ_INDEXERS.length > 0;

/**
 * The contract a batch root must have been written to: on mainnet the one pinned in
 * api/src/deploy-guard.ts (vite.config.ts passes it in), on a test network the demo
 * contract this build uses. Never the address the registry names.
 */
export const anchorContractFor = (
  network: string,
  mainnetPin: string,
  demo: string | undefined,
): string | undefined => {
  if (network !== 'mainnet') return demo;
  const a = mainnetPin.trim().toLowerCase();
  return /^[0-9a-f]{64}$/.test(a) ? a : undefined;
};
export const ANCHOR_CONTRACT: string | undefined = anchorContractFor(NETWORK, MAINNET_CONTRACT_ADDRESS, CHAIN_CONTRACT);

/** Why the real-chain features cannot run in this build, or undefined when they can. */
export const chainNotReady = (): string | undefined => {
  if (!REAL_CHAIN) return 'This build does not send transactions.';
  if (NETWORK === 'mainnet') return 'The website demo only sends transactions on a test network.';
  if (!CHAIN_CONTRACT) return 'No demo contract address is configured (VITE_REAL_CHAIN_CONTRACT_ADDRESS).';
  if (!SPONSOR_URL) return 'No sponsor service is configured (VITE_SPONSOR_URL).';
  if (!INDEXER_HTTP || !INDEXER_WS) return 'No indexer is configured for this network.';
  return undefined;
};

/** True when this build can send real transactions. */
export const CHAIN_READY: boolean = chainNotReady() === undefined;

/** The circuits the browser may call in phase 1, and nothing else. */
export const BROWSER_CIRCUITS = ['anchor', 'proveOwnership', 'pairDna'] as const;
export type BrowserCircuit = (typeof BROWSER_CIRCUITS)[number];
