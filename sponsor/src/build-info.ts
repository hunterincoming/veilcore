// Which build is running: the Midnight package versions actually installed, and the commit or
// deployment the platform reports. Logged once at start-up, so the logs alone say whether the
// running sponsor is the one on main (error 138, Nov 2026: the open question was exactly that).
//
// Read from each package's own package.json on disk (their export maps hide it from import),
// looked up the way Node resolves packages: node_modules in this folder and each one above.
// Only variables the platform already sets are read; none is required.
//
// SPDX-License-Identifier: Apache-2.0

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const LOGGED_PACKAGES = [
  '@midnightntwrk/wallet-sdk',
  '@midnightntwrk/wallet-sdk-facade',
  '@midnightntwrk/wallet-sdk-dust-wallet',
  '@midnightntwrk/ledger-v9',
  '@midnightntwrk/ledger-v8',
  '@midnight-ntwrk/midnight-js-contracts',
  '@midnight-ntwrk/compact-runtime',
] as const;

/** The installed version of `name`, looking up from `from`; 'not found' if none. Never throws. */
export const installedVersion = (name: string, from: string): string => {
  try {
    let dir = from;
    for (;;) {
      const file = join(dir, 'node_modules', name, 'package.json');
      if (existsSync(file)) {
        const v = (JSON.parse(readFileSync(file, 'utf8')) as { version?: unknown }).version;
        return typeof v === 'string' ? v : 'unknown';
      }
      const up = dirname(dir);
      if (up === dir) return 'not found';
      dir = up;
    }
  } catch {
    return 'unknown';
  }
};

/** The fields of the start-up "build" line. */
export const buildInfo = (
  env: NodeJS.ProcessEnv,
  from: string = dirname(fileURLToPath(import.meta.url)),
): Record<string, string> => {
  const packages: Record<string, string> = {};
  for (const p of LOGGED_PACKAGES) packages[p] = installedVersion(p, from);
  const short = (v: string | undefined) => (v && /^[0-9a-zA-Z-]{1,64}$/.test(v.trim()) ? v.trim() : undefined);
  return {
    ...packages,
    // Railway sets the commit for a deploy from GitHub; a `railway up` upload has none.
    commit: short(env.RAILWAY_GIT_COMMIT_SHA) ?? 'not given',
    deployment: short(env.RAILWAY_DEPLOYMENT_ID) ?? 'unknown',
    node: process.version,
  };
};
