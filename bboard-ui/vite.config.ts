// This file is part of midnightntwrk/example-counter.
// Copyright (C) Midnight Foundation
// SPDX-License-Identifier: Apache-2.0
// Licensed under the Apache License, Version 2.0 (the "License");
// You may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { defineConfig, loadEnv, type Plugin, type ResolvedConfig } from 'vite';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
// The published documents (SPEC, EVIDENCE, INTEGRATING) are vendored in src/docs from an
// exact SDK commit (see src/veilcore/docs.ts); nothing is resolved from a package for them.
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import { readMainnetPins } from '../scripts/mainnet-pins.mjs';
import { readPolicyStatus } from '../scripts/maintenance-policy.mjs';
import { mainnetOriginProblem, plainHttpsOrigin, VEILCORE_ORIGIN } from '../scripts/canonical-origin.mjs';
import { agreementsLive, llmsFullTxt, llmsTxt, robotsTxt, sitemapXml, statusFlags, structuredData } from './findable';

// What the site says about where records are dated depends on the build mode, never on
// hand-edited strings: `--mode mainnet` describes Midnight's main network, every other
// mode a test network (src/config/network.ts, src/config/copy.ts, i18n/en-mainnet.ts).
//
// A mainnet build refuses to start until the main contract's address is pinned in
// api/src/deploy-guard.ts, the one place it is kept (scripts/mainnet-pins.mjs). The
// addresses are shown on the site (display only: nothing in this site sends a
// transaction) and come from that file, not from an environment variable that could say
// something else.
//
// Whether the site may call the maintenance policy decided comes from the policy's own
// status line (docs/maintenance-policy.md, scripts/maintenance-policy.mjs): only
// "**Status: APPROVED" turns off "proposed, not decided", and a status line it cannot
// read stops the build.
const mainnetBuild = (mode: string, command: string) => {
  if (mode !== 'mainnet') return { veilcore: '', claims: '', policyApproved: false };
  const pins = readMainnetPins();
  if (!pins.ok) throw new Error(`\n\nThe mainnet website was not built. ${pins.problem}\n`);
  const policy = readPolicyStatus();
  if (!policy.ok) throw new Error(`\n\nThe mainnet website was not built. ${policy.problem}\n`);
  const env = { ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env };
  // The in-browser transactions (src/veilcore/chain/) on mainnet: only as npm run
  // deploy:mainnet sets them up with the mainnet sponsor (scripts/deploy-mainnet.mjs), i.e.
  // VeilCore's pinned contract, an https sponsor and the indexer through the relay. Anything
  // else (a flag left in the shell from a test run) is refused here, not only at run time.
  if (env.VITE_REAL_CHAIN === '1') {
    const contract = (env.VITE_REAL_CHAIN_CONTRACT_ADDRESS ?? '').trim().toLowerCase().replace(/^0x/, '');
    const ready =
      contract === pins.veilcore &&
      /^https:\/\//.test(env.VITE_SPONSOR_URL ?? '') &&
      /^https:\/\//.test(env.VITE_INDEXER_URL ?? '') &&
      /^wss:\/\//.test(env.VITE_INDEXER_WS_URL ?? '');
    if (!ready)
      throw new Error(
        "\n\nThe mainnet website was not built: VITE_REAL_CHAIN=1 is set without the mainnet sponsor's settings (left from a test run?). Use npm run deploy:mainnet with VEILCORE_MAINNET_SPONSOR, or close this terminal or run: unset VITE_REAL_CHAIN VITE_SPONSOR_URL\n",
      );
  }
  if (env.VITE_NETWORK_ID !== 'mainnet') {
    throw new Error(
      '\n\nThe mainnet website was not built: bboard-ui/.env.mainnet must set VITE_NETWORK_ID=mainnet.\n',
    );
  }
  if (command === 'build' && !/^https:\/\//.test(env.VITE_API_BASE ?? '')) {
    throw new Error(
      '\n\nThe mainnet website was not built: VITE_API_BASE (the registry address) is not set. Use npm run deploy:mainnet from the repository folder.\n',
    );
  }
  // Where its links and QR codes point (scripts/canonical-origin.mjs): veilcore.org for
  // VeilCore's registry, the copy's own address for any other (docs/SELF-HOSTING.md).
  const origin = mainnetOriginProblem({ api: env.VITE_API_BASE, canonical: env.VITE_CANONICAL_ORIGIN });
  if (origin) throw new Error(`\n\nThe mainnet website was not built: ${origin}\n`);
  return { veilcore: pins.veilcore, claims: pins.claims, policyApproved: policy.approved };
};

// A mainnet build that names another site as its own (VITE_CANONICAL_ORIGIN): a copy someone
// else runs. It asks not to be indexed and leaves out veilcore.org's sitemap and llms files.
const isVeilcoreOrg = (mode: string): boolean => {
  if (mode !== 'mainnet') return false;
  const set = String({ ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env }.VITE_CANONICAL_ORIGIN ?? '').trim();
  return !set || plainHttpsOrigin(set) === VEILCORE_ORIGIN;
};

// The page description search engines and link previews show, by mode.
const DESCRIPTION = {
  test: 'An open record format for plant, animal and microbial genetics. Seal a record on your own computer; only its proof code is dated on Midnight. Test site: practice records on a Midnight test network. No security audit yet.',
  mainnet:
    "An open record format for plant, animal and microbial genetics. Seal a record on your own computer; only its proof code is dated, on Midnight's main network. Free to check, no account.",
};

const siteDescription = (mode: string): Plugin => ({
  name: 'veilcore-site-description',
  transformIndexHtml: (html) =>
    html.replace('%VEILCORE_DESCRIPTION%', mode === 'mainnet' ? DESCRIPTION.mainnet : DESCRIPTION.test),
});

// What the page says before its script runs: a plain summary inside #root, which React
// replaces as soon as it starts. Search engines, link readers and AI assistants that don't
// run JavaScript read only this, so it carries the facts people look for: what VeilCore is,
// where it stands, who runs it, that checking is free, and that there is no token. Plain
// HTML and no script (the Content-Security-Policy allows none inline); index.html styles it
// in the site's paper and ink for the moment before the app draws.
const SUMMARY_HEAD = `<main class="static-summary">
<h1>VeilCore: dated, private records for plant, animal and microbial genetics</h1>
<p>A breeder or lab logs a record of a cultivar, an animal line or a microbial strain in the browser. Everything typed is locked there before it is sent, and VeilCore doesn't have the key. DNA files never leave the device. Only a 32-byte proof code is dated on Midnight. Later a buyer, examiner or court can check what the record said and when it existed: free, with no account. A record shows a description was held by a date. It isn't ownership, and VeilCore doesn't test DNA.</p>`;

const SUMMARY_TAIL = `<h2>Team</h2>
<ul>
<li>Makoto (Mako) Steiner, co-founder and CEO (Tokyo): mako@veilcore.org</li>
<li>Hunter Roberts, co-founder and COO (New Jersey): hunter@veilcore.org</li>
</ul>
<h2>No token</h2>
<p>VeilCore has never sold a token, coin or presale. Anyone offering one in VeilCore's name is not us.</p>
<p>Code and spec: <a href="https://github.com/hunterincoming/veilcore">the app and contracts</a> and <a href="https://github.com/hunterincoming/veilcore-sdk">the open record format</a>.</p>
</main>`;

// Licenses on veilcore.org: the line follows AGREEMENTS_LIVE (config/copy.ts), as llms.txt does.
const LICENSES_PRACTICE = '<li>Practice only on veilcore.org: licenses, royalties and lab agreements.</li>';
const LICENSES_LIVE =
  '<li>Licenses, royalty statements and lab agreements are made on veilcore.org, between the two parties, with real transactions. Paying royalties on Midnight itself is on the test site only.</li>';

const summaryOf = (live: boolean) => ({
  mainnetSends: `${SUMMARY_HEAD}
<h2>Where it stands</h2>
<ul>
<li>On Midnight's main network since 8 October 2026. Open to first users since 20 October 2026; every record so far is the team's own test data.</li>
<li>Works on veilcore.org: sealing records; batches dated on Midnight automatically; proving a record by link; dating a DNA report pairing; lab receipts and reports signed with the lab's own key. No wallet needed: VeilCore pays the network fee.</li>
${live ? LICENSES_LIVE : LICENSES_PRACTICE}
<li>No formal audit yet. Twelve rounds of adversarial review are public.</li>
</ul>
${SUMMARY_TAIL}`,
  mainnet: `${SUMMARY_HEAD}
<h2>Where it stands</h2>
<ul>
<li>On Midnight's main network since 8 October 2026. Every record so far is the team's own test data.</li>
<li>Practice only on veilcore.org: licenses, royalties and lab agreements. No formal audit yet.</li>
</ul>
${SUMMARY_TAIL}`,
  test: `${SUMMARY_HEAD}
<p>This is the test site: records made here are practice records on a Midnight test network and carry no evidential weight. The real site is <a href="https://veilcore.org">veilcore.org</a>.</p>
${SUMMARY_TAIL}`,
});

// Being found (findable.ts): veilcore.org gets a sitemap, llms.txt and llms-full.txt, and who
// VeilCore is as schema.org data; every other build (test sites, and a mainnet copy someone else
// runs, isVeilcoreOrg above) asks not to be indexed. No dates in these
// files, so a rebuild from the same commit gives the same bytes (npm run check:rebuild).
const findable = (mode: string): Plugin => {
  const indexed = isVeilcoreOrg(mode);
  const root = fileURLToPath(new URL('.', import.meta.url));
  return {
    name: 'veilcore-findable',
    transformIndexHtml: (html) =>
      html.replace(
        '</head>',
        indexed
          ? `  <script type="application/ld+json">${structuredData()}</script>\n  </head>`
          : '  <meta name="robots" content="noindex" />\n  </head>',
      ),
    generateBundle() {
      const emit = (fileName: string, source: string) => this.emitFile({ type: 'asset', fileName, source });
      emit('robots.txt', robotsTxt(indexed));
      if (!indexed) return;
      const flags = statusFlags(root);
      emit('sitemap.xml', sitemapXml());
      emit('llms.txt', llmsTxt(flags));
      emit('llms-full.txt', llmsFullTxt(root, flags));
    },
  };
};

const siteSummary = (mode: string, sends: boolean): Plugin => {
  const SUMMARY = summaryOf(agreementsLive(fileURLToPath(new URL('.', import.meta.url))));
  return {
    name: 'veilcore-site-summary',
    transformIndexHtml: (html) =>
      html.replace(
        '<div id="root"></div>',
        `<div id="root">${mode === 'mainnet' ? (sends ? SUMMARY.mainnetSends : SUMMARY.mainnet) : SUMMARY.test}</div>`,
      ),
  };
};

// The font the first screen is drawn in, asked for with the page instead of after the
// script has run and the browser has worked out which ones it needs: Atkinson Hyperlegible
// Next, one variable file for body text and headings alike. Latin only; the latin-ext subset
// stays as @fontsource declares it (font-display: swap, fetched only when a page uses it).
// Same-origin files, so the Content-Security-Policy's font-src 'self' covers them.
const PRELOAD_FONTS = [/^atkinson-hyperlegible-next-latin-wght-normal-[\w-]+\.woff2$/];
const preloadFonts = (): Plugin => ({
  name: 'veilcore-preload-fonts',
  apply: 'build',
  transformIndexHtml: {
    order: 'post',
    handler: (_html, ctx) => {
      const files = Object.keys(ctx.bundle ?? {});
      return PRELOAD_FONTS.flatMap((re) => {
        const file = files.find((f) => re.test(f.split('/').pop() ?? ''));
        return file
          ? [
              {
                tag: 'link',
                attrs: { rel: 'preload', href: `/${file}`, as: 'font', type: 'font/woff2', crossorigin: '' },
                injectTo: 'head' as const,
              },
            ]
          : [];
      });
    },
  },
});

// What this build saw (round 6, CONTRACT.md #32): the mode and every VITE_* setting, from the
// mode's .env file and the environment alike, with the SHA-256 of the index.html it made.
// Written to .vite/veilcore-build-settings.json (never into the site), where a release deploy's
// scripts/release-manifest.mjs reads it into the published manifest, so anyone can rebuild the
// release with the same settings (npm run check:rebuild). The output depends on them: the same
// commit built with one extra setting changed 140 of 144 files (the fifth review, finding 1).
const recordBuildSettings = (): Plugin => {
  let config: ResolvedConfig | undefined;
  return {
    name: 'veilcore-build-settings',
    apply: 'build',
    configResolved(c) {
      config = c;
    },
    closeBundle() {
      if (!config) return;
      const out = resolve(config.root, config.build.outDir);
      const index = join(out, 'index.html');
      if (!existsSync(index)) return;
      const settings = Object.fromEntries(
        Object.entries(config.env as Record<string, unknown>)
          .filter(([k, v]) => k.startsWith('VITE_') && typeof v === 'string')
          .sort(([a], [b]) => (a < b ? -1 : 1)),
      );
      const dir = join(config.root, '.vite');
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        join(dir, 'veilcore-build-settings.json'),
        `${JSON.stringify(
          {
            format: 'veilcore-build-settings/v1',
            mode: config.mode,
            outDir: relative(config.root, out),
            indexHtmlSha256: createHash('sha256').update(readFileSync(index)).digest('hex'),
            settings,
          },
          null,
          2,
        )}\n`,
      );
    },
  };
};

// Ask's on-device model (docs/ask-veilcore.md, v2.1): VITE_ASK_MODEL, from the environment or
// the mode's .env file, made a constant in the code so a build without it leaves the model out
// entirely: no workers, no WebLLM, and no model library files (public/ask-model/ is removed from
// the output). A test or evaluation build ('test', 'eval') is refused for the site's modes.
const askModelFlag = (mode: string): string => {
  const v = String({ ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env }.VITE_ASK_MODEL ?? '').trim();
  if (v && !['on', 'test', 'eval'].includes(v))
    throw new Error(`\n\nVITE_ASK_MODEL=${v}: use on, test or eval, or leave it unset.\n`);
  if ((v === 'test' || v === 'eval') && (mode === 'mainnet' || mode === 'preprod'))
    throw new Error(`\n\nVITE_ASK_MODEL=${v} is a build for tests on this computer, never for --mode ${mode}.\n`);
  return v;
};
const askModelFiles = (flag: string): Plugin => {
  let config: ResolvedConfig | undefined;
  return {
    name: 'veilcore-ask-model-files',
    apply: 'build',
    configResolved(c) {
      config = c;
    },
    closeBundle() {
      if (!config || flag) return;
      rmSync(resolve(config.root, config.build.outDir, 'ask-model'), { recursive: true, force: true });
    },
  };
};

// The offline worker (docs/offline.md): /sw.js, written from offline/sw.js with the registry's
// address filled in, and /offline-shell.json, the files it keeps so the app opens with no
// signal. Both are ordinary files of the build, so a release lists and hashes them like any
// other (scripts/release-manifest.mjs), and the worker keeps only files whose SHA-256 is the
// listed one. The list is the app's own code and styles, its fonts and icons, and WebAssembly
// under 2 MB; never the proving keys, the on-device model, videos or the large Midnight and
// Cardano libraries (those wait for signal, as proving does). VITE_OFFLINE=off writes the kill
// switch (offline/sw-kill.js) as /sw.js instead, and the page then registers no worker.
const OFFLINE_SHELL_FORMAT = 'veilcore-offline-shell/v1';
const SHELL_PUBLIC = ['favicon.svg', 'icon.png', 'apple-touch-icon.png', 'manifest.webmanifest'];
const SHELL_ASSET = /\.(css|woff2?|svg|png|webp)$/;
const SHELL_WASM_MAX = 2 * 1024 * 1024;
const SHELL_ASSET_MAX = 512 * 1024;
const offlineFlag = (mode: string): 'on' | 'off' => {
  const v = String({ ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env }.VITE_OFFLINE ?? '').trim();
  if (v && v !== 'on' && v !== 'off')
    throw new Error(`\n\nVITE_OFFLINE=${v}: use on or off, or leave it unset (on).\n`);
  return v === 'off' ? 'off' : 'on';
};
const offlineWorker = (mode: string): Plugin => {
  let config: ResolvedConfig | undefined;
  return {
    name: 'veilcore-offline-worker',
    apply: 'build',
    configResolved(c) {
      config = c;
    },
    generateBundle(_options, bundle) {
      if (!config) return;
      const here = fileURLToPath(new URL('.', import.meta.url));
      const flag = offlineFlag(mode);
      if (flag === 'off') {
        this.emitFile({
          type: 'asset',
          fileName: 'sw.js',
          source: readFileSync(join(here, 'offline', 'sw-kill.js'), 'utf8'),
        });
        return;
      }
      const api = String(config.env.VITE_API_BASE ?? '')
        .trim()
        .replace(/\/+$/, '');
      if (api && !/^https?:\/\/[A-Za-z0-9.:[\]_~%/-]+$/.test(api))
        throw new Error(
          `\n\nThe offline worker was not built: VITE_API_BASE (${api}) is not a plain http(s) address.\n`,
        );
      const template = readFileSync(join(here, 'offline', 'sw.js'), 'utf8');
      if (!template.includes("'__VEILCORE_API_BASE__'")) throw new Error('offline/sw.js lost its registry placeholder');
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: template.replace("'__VEILCORE_API_BASE__'", JSON.stringify(api)),
      });
      const files = new Set<string>();
      for (const [name, out] of Object.entries(bundle)) {
        if (name === 'sw.js' || name === 'offline-shell.json') continue;
        if (out.type === 'chunk') files.add(`/${name}`);
        else {
          const size = typeof out.source === 'string' ? Buffer.byteLength(out.source) : out.source.byteLength;
          if (name.endsWith('.wasm') ? size <= SHELL_WASM_MAX : SHELL_ASSET.test(name) && size <= SHELL_ASSET_MAX)
            files.add(`/${name}`);
        }
      }
      for (const f of SHELL_PUBLIC) if (existsSync(join(config.publicDir, f))) files.add(`/${f}`);
      // The heading font, preloaded by index.html from the public folder.
      const fonts = join(config.publicDir, 'fonts');
      if (existsSync(fonts))
        for (const f of readdirSync(fonts).filter((n) => n.endsWith('.woff2'))) files.add(`/fonts/${f}`);
      this.emitFile({
        type: 'asset',
        fileName: 'offline-shell.json',
        source: `${JSON.stringify({ format: OFFLINE_SHELL_FORMAT, files: [...files].sort() }, null, 2)}\n`,
      });
    },
    // Once every file is written (the page and the public folder too): the SHA-256 of each file of
    // the offline copy goes into sw.js itself, which the worker checks every kept file against
    // before serving it (security re-check of PR #145, SW-1; docs/offline.md).
    closeBundle() {
      if (!config || offlineFlag(mode) === 'off') return;
      const out = resolve(config.root, config.build.outDir);
      const swFile = join(out, 'sw.js');
      if (!existsSync(swFile)) return;
      const shell = JSON.parse(readFileSync(join(out, 'offline-shell.json'), 'utf8')) as { files: string[] };
      const hashes: Record<string, string> = {};
      for (const p of ['/index.html', ...shell.files].sort())
        hashes[p] = createHash('sha256')
          .update(readFileSync(join(out, p.slice(1))))
          .digest('hex');
      const text = readFileSync(swFile, 'utf8');
      if (!text.includes("'__VEILCORE_SHELL_FILES__'")) throw new Error('offline/sw.js lost its shell placeholder');
      writeFileSync(swFile, text.replace("'__VEILCORE_SHELL_FILES__'", JSON.stringify(hashes)));
    },
  };
};

// The timestamp authorities whose timestamps the site shows (src/config/tsa-pins.json, bundled
// into the page's code by veilcore/instant-stamp.ts): published as /tsa-pins.json too, so it is a
// file of its own in every release list and anyone can read which keys a release trusts.
const tsaPins = (): Plugin => ({
  name: 'veilcore-tsa-pins',
  apply: 'build',
  generateBundle() {
    const here = fileURLToPath(new URL('.', import.meta.url));
    this.emitFile({
      type: 'asset',
      fileName: 'tsa-pins.json',
      source: readFileSync(join(here, 'src', 'config', 'tsa-pins.json'), 'utf8'),
    });
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode, command }) => {
  // The end-to-end build trusts a test timestamp authority it is handed (veilcore/instant-stamp.ts
  // e2ePins): never for a site build (scripts/vercel-config.mjs refuses its files as well).
  if (
    command === 'build' &&
    (mode === 'mainnet' || mode === 'preprod') &&
    String({ ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env }.VITE_E2E_FIXTURES ?? '').trim() === '1'
  )
    throw new Error(`\n\nVITE_E2E_FIXTURES=1 is the end-to-end test build, never --mode ${mode}.\n`);
  const pins = mainnetBuild(mode, command);
  const askModel = askModelFlag(mode);
  return {
    cacheDir: './.vite',
    build: {
      target: 'esnext',
      // Minified: the unminified bundle was several times larger for every visitor.
      minify: true,
      // No source maps in the published bundle.
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Separate chunk for WASM modules to avoid top-level await issues
            if (id.includes('onchain-runtime-v3')) return 'wasm';
            // React (with its JSX runtime) and React Router each in a chunk of their own, so
            // the bundler never files them inside a chunk that waits for something.
            // vite-plugin-top-level-await wraps any chunk with a dynamic import (React
            // Router has one) in an async function; when that chunk also imports a waiting
            // chunk (i18n, which awaits its language), its exports are set only after a
            // microtask, and a chunk that imports it without waiting (MUI's Container from
            // Stack) crashed the built site with "n is not a function" (review of
            // ux-polish, 13 Nov). load-split.test.ts checks the built site for this.
            if (/[\\/]node_modules[\\/]react[\\/]/.test(id)) return 'react';
            if (/[\\/]node_modules[\\/]react-router(-dom)?[\\/]/.test(id)) return 'router';
          },
        },
      },
      commonjsOptions: {
        // Transform CommonJS to ESM more aggressively
        transformMixedEsModules: true,
        extensions: ['.js', '.cjs'],
        // Needed for Node.js modules
        ignoreDynamicRequires: true,
      },
    },
    plugins: [
      // The shared checking code hashes with node:crypto; the browser gets SHA-256 from
      // src/shims/node-crypto.ts instead of Vite's stub, which throws when used. A plugin,
      // not resolve.alias: Vite settles node: built-ins before aliases apply.
      {
        name: 'browser-node-crypto',
        enforce: 'pre' as const,
        resolveId(source: string) {
          return source === 'node:crypto' ? new URL('./src/shims/node-crypto.ts', import.meta.url).pathname : null;
        },
      },
      siteDescription(mode),
      siteSummary(
        mode,
        mode === 'mainnet' && { ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env }.VITE_REAL_CHAIN === '1',
      ),
      findable(mode),
      preloadFonts(),
      recordBuildSettings(),
      askModelFiles(askModel),
      offlineWorker(mode),
      tsaPins(),
      react(),
      // Configure WASM plugin with more options
      wasm(),
      topLevelAwait({
        // Be more permissive with top-level await
        promiseExportName: '__tla',
        promiseImportName: (i) => `__tla_${i}`,
      }),
      // Custom resolver for handling problematic modules
      {
        name: 'wasm-module-resolver',
        resolveId(source, importer) {
          // Special handling for the problematic module
          if (
            source === '@midnight-ntwrk/onchain-runtime-v3' &&
            importer &&
            importer.includes('@midnight-ntwrk/compact-runtime')
          ) {
            // Force dynamic import for this case
            return {
              id: source,
              external: false,
              moduleSideEffects: true,
            };
          }
          return null;
        },
      },
    ],
    // The proving worker (src/veilcore/chain/prover.worker.ts) loads Midnight's WebAssembly
    // prover, so it needs the same WebAssembly handling as the page. ES module workers; the
    // page's Content-Security-Policy allows worker-src 'self'. Used only by test-network
    // builds with VITE_REAL_CHAIN=1 (src/veilcore/chain/config.ts).
    worker: {
      format: 'es' as const,
      plugins: () => [wasm(), topLevelAwait({ promiseExportName: '__tla', promiseImportName: (i) => `__tla_${i}` })],
    },
    optimizeDeps: {
      rolldownOptions: {
        target: 'esnext',
        supported: { 'top-level-await': true },
        // Configure ESBuild to handle Node.js-style modules
        platform: 'browser',
        format: 'esm',
        loader: {
          '.wasm': 'binary',
        },
      },
      // Explicitly include these packages for pre-bundling, but force ESM
      include: ['@midnight-ntwrk/compact-runtime'],
      // Exclude WASM files and modules with top-level await from optimization
      // midnight-js 5 (Ledger 9 fork): the Ledger 9 ledger and runtime, and midnight-js's Ledger 8
      // copy, which it loads lazily (keep its chunk separate: migration guide, "Bundlers").
      exclude: [
        '@midnight-ntwrk/zkir-v2',
        '@midnightntwrk/ledger-v8',
        '@midnightntwrk/ledger-v9',
        '@midnightntwrk/onchain-runtime-v4',
        '@midnight-ntwrk/onchain-runtime-v3',
        '@midnight-ntwrk/onchain-runtime-v3/midnight_onchain_runtime_wasm_bg.wasm',
        '@midnight-ntwrk/onchain-runtime-v3/midnight_onchain_runtime_wasm.js',
      ],
    },
    define: {
      'import.meta.env.VITE_MAINNET_CONTRACT_ADDRESS': JSON.stringify(pins.veilcore),
      'import.meta.env.VITE_MAINNET_CLAIMS_ADDRESS': JSON.stringify(pins.claims),
      'import.meta.env.VITE_MAINTENANCE_POLICY_APPROVED': JSON.stringify(pins.policyApproved ? 'true' : ''),
      'import.meta.env.VITE_ASK_MODEL': JSON.stringify(askModel),
      'import.meta.env.VITE_OFFLINE': JSON.stringify(offlineFlag(mode)),
    },
    checks: {
      importIsUndefined: false,
      pluginTimings: false,
    },
    // Add specific import configuration for more control
    resolve: {
      // Ensure WASM files are loaded properly
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.wasm'],
      mainFields: ['browser', 'module', 'main'],
      // partner-kit carries its own copy of veilcore-records; use one.
      dedupe: ['veilcore-records'],
    },
  };
});
