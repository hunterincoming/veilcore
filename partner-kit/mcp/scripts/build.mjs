// Builds veilcore-mcp: dist/veilcore-mcp.js, the stdio server, one file with record-check's
// check inside (veilcore-records stays a dependency). esbuild is already the partner kit's.
// SPDX-License-Identifier: Apache-2.0
import { mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { build } from 'esbuild';

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.join(here, '..');
const outdir = process.argv[2] ? path.resolve(process.argv[2]) : path.join(pkg, 'dist');

rmSync(outdir, { recursive: true, force: true });
mkdirSync(outdir, { recursive: true });
await build({
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  packages: 'external',
  legalComments: 'inline',
  logLevel: 'warning',
  entryPoints: [path.join(pkg, 'src', 'bin.ts')],
  outfile: path.join(outdir, 'veilcore-mcp.js'),
  banner: { js: '#!/usr/bin/env node' },
});
