// No package's install script runs on `npm ci` (the root .npmrc), on this machine, in CI or on
// the Mac that builds and deploys veilcore.org. A dependency taken over upstream would otherwise
// run its own code there on the next install.
//
//   - the root .npmrc says ignore-scripts=true, and nothing after it turns that off;
//   - no package.json carries `allowScripts`: npm 11.6.2 doesn't read it, so it only looked safe;
//   - the lockfile's packages with install scripts are the ones checked to work without them
//     (each loads a prebuilt part, or falls back to plain JavaScript). A new one fails here until
//     someone checks the build, the tests and the deploy work with its script not run, and adds it.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/** What the root .npmrc sets, with comments and blank lines left out (later lines win). */
const npmrc = (): Map<string, string> => {
  const set = new Map<string, string>();
  for (const raw of read('.npmrc').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    set.set(line.slice(0, eq).trim().toLowerCase(), line.slice(eq + 1).trim());
  }
  return set;
};

/** Every package.json in the workspace that git tracks (not node_modules). */
const packageFiles = (): string[] => {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const d of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      if (d.name === 'node_modules' || d.name === 'dist' || d.name.startsWith('.')) continue;
      const rel = path.join(dir, d.name);
      if (d.isDirectory()) walk(rel);
      else if (d.name === 'package.json') out.push(rel);
    }
  };
  walk('.');
  return out;
};

/**
 * Checked 26 Nov 2026 with a clean `npm ci` under ignore-scripts=true (npm 11.6.2): the site
 * build, every unit and browser test, the contract tests (--skip-zk), the CLI, api, sponsor,
 * partner kit and scripts suites all pass without these scripts.
 */
const CHECKED_WITHOUT_SCRIPTS: Record<string, string> = {
  'node_modules/@swc/core': 'its native part comes as a prebuilt optional package',
  'node_modules/classic-level': 'ships prebuilt binaries; node-gyp-build finds them at run time',
  'node_modules/cpu-features': 'optional; ssh2 works without it',
  'node_modules/esbuild': 'its binary comes as a prebuilt optional package (@esbuild/<platform>)',
  'node_modules/fsevents': 'macOS only, ships its compiled part; only file watching uses it',
  'node_modules/msgpackr-extract': 'optional, prebuilt per platform; msgpackr falls back to JavaScript',
  'node_modules/playwright/node_modules/fsevents': 'macOS only, ships its compiled part',
  'node_modules/protobufjs': 'the script only checks versions',
  'node_modules/ssh2': 'its optional native crypto falls back to JavaScript',
};

describe('install scripts stay off', () => {
  it('the root .npmrc turns them off, and nothing after it turns them back on', () => {
    expect(npmrc().get('ignore-scripts'), '.npmrc must say ignore-scripts=true').toBe('true');
  });

  it('no package.json carries allowScripts (npm does not read it)', () => {
    const files = packageFiles();
    expect(files).toContain('package.json');
    for (const f of files) {
      const pkg = JSON.parse(read(f)) as Record<string, unknown>;
      expect(Object.keys(pkg), f).not.toContain('allowScripts');
    }
  });

  it('every lockfile package with an install script has been checked to work without it', () => {
    const lock = JSON.parse(read('package-lock.json')) as {
      packages: Record<string, { hasInstallScript?: boolean }>;
    };
    const withScripts = Object.entries(lock.packages)
      .filter(([, v]) => v.hasInstallScript)
      .map(([k]) => k)
      .sort();
    expect(withScripts).toEqual(Object.keys(CHECKED_WITHOUT_SCRIPTS).sort());
  });
});
