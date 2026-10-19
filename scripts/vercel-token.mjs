// The Vercel token for the deploy scripts, so a deploy doesn't stop on "Not authorized"
// when the CLI's own login has expired. Read from the environment (VERCEL_TOKEN) or from
// the Mac's keychain, where it is saved once:
//
//   security add-generic-password -a veilcore -s veilcore-vercel-token -w
//
// (it asks for the token and stores it; nothing goes into a file or the shell history).
// The token is only ever put into the Vercel CLI's own environment, never printed, never in
// the build's environment and never in the release manifest.
// SPDX-License-Identifier: Apache-2.0

import { execFileSync } from 'node:child_process';

export const KEYCHAIN_SERVICE = 'veilcore-vercel-token';

/** The token, or undefined when there is none (the CLI then uses its own login). */
export const vercelToken = (env = process.env, read = execFileSync) => {
  if (env.VERCEL_TOKEN?.trim()) return env.VERCEL_TOKEN.trim();
  if (process.platform !== 'darwin') return undefined;
  try {
    const t = read('security', ['find-generic-password', '-s', KEYCHAIN_SERVICE, '-w'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return t || undefined;
  } catch {
    return undefined;
  }
};

/** The environment for a Vercel CLI call: the given one plus the token when there is one. */
export const vercelEnv = (env) => {
  const token = vercelToken(env);
  return token ? { ...env, VERCEL_TOKEN: token } : env;
};
