// Builds @veilcore/partner-kit:
//   dist/index.js                 the check, browser-safe (veilcore-records left as a dependency)
//   dist/node.js                  the same plus the date stamp look-up on Midnight (Node)
//   dist/cli.js                   the `partner-kit` command
//   dist/veilcore-record-check.js the <veilcore-record-check> form field: ONE self-contained
//                                 file (the SDK's browser build inside), to copy onto a site
//   dist/types/                   declarations
// SPDX-License-Identifier: Apache-2.0
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.join(here, '..');
const repo = path.join(pkg, '..', '..');
const dist = path.join(pkg, 'dist');
const src = (f) => path.join(pkg, 'src', f);

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

/** @type {import('esbuild').BuildOptions} */
const common = { bundle: true, format: 'esm', legalComments: 'inline', logLevel: 'warning' };
await build({
  ...common,
  platform: 'neutral',
  target: 'es2022',
  packages: 'external',
  entryPoints: [src('index.ts')],
  outfile: path.join(dist, 'index.js'),
});
await build({
  ...common,
  platform: 'node',
  target: 'node20',
  packages: 'external',
  entryPoints: [src('node.ts')],
  outfile: path.join(dist, 'node.js'),
});
await build({
  ...common,
  platform: 'node',
  target: 'node20',
  packages: 'external',
  entryPoints: [src('bin.ts')],
  outfile: path.join(dist, 'cli.js'),
  banner: { js: '#!/usr/bin/env node' },
});
// The copy-paste file: everything inside, nothing fetched but the registry's answers.
await build({
  ...common,
  platform: 'browser',
  target: 'es2022',
  conditions: ['browser'],
  // The SDK falls back to node:crypto only where WebCrypto is missing; never in a browser.
  external: ['node:crypto'],
  minify: true,
  entryPoints: [src('element.ts')],
  outfile: path.join(dist, 'veilcore-record-check.js'),
});

execFileSync(
  process.execPath,
  [path.join(repo, 'node_modules', 'typescript', 'bin', 'tsc'), '-p', path.join(pkg, 'tsconfig.types.json')],
  {
    stdio: 'inherit',
  },
);
const kb = (f) => `${(statSync(path.join(dist, f)).size / 1024).toFixed(0)} KB`;
console.log(
  `Built partner-kit/record-check/dist: index.js, node.js, cli.js, veilcore-record-check.js (${kb('veilcore-record-check.js')}), types/`,
);
