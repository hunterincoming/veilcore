// Where a mainnet build's shared links and QR codes point (bboard-ui/src/config/network.ts
// CANONICAL_ORIGIN), checked before anything is built (bboard-ui/vite.config.ts).
//
// veilcore.org's own build talks to VeilCore's registry and points at veilcore.org. A copy run
// from this code with its own registry (docs/SELF-HOSTING.md) must point at itself, or every
// label it prints sends whoever scans it to veilcore.org, whose registry has never heard of the
// record. So, in a mainnet build:
//   - VeilCore's registry: VITE_CANONICAL_ORIGIN unset (or exactly https://veilcore.org). A
//     test-site address left in the shell (scripts/deploy-test-site.mjs sets one) is refused,
//     so veilcore.org's labels can never point at test.veilcore.org.
//   - any other registry: VITE_CANONICAL_ORIGIN must be set, to the copy's own https address.
// SPDX-License-Identifier: Apache-2.0

import { DEFAULT_API } from './site-mainnet-preflight.mjs';

export const VEILCORE_ORIGIN = 'https://veilcore.org';

const trimSlash = (v) => String(v ?? '').trim().replace(/\/+$/, '');

/** The origin of a plain https address (no path, query, fragment or login), or undefined. */
export const plainHttpsOrigin = (v) => {
  try {
    const u = new URL(String(v).trim());
    return u.protocol === 'https:' && u.pathname === '/' && !u.search && !u.hash && !u.username && !u.password
      ? u.origin
      : undefined;
  } catch {
    return undefined;
  }
};

/**
 * What is wrong with a mainnet build's link origin, in plain words, or undefined when fine.
 * @param {{ api?: string, canonical?: string }} env VITE_API_BASE and VITE_CANONICAL_ORIGIN
 * @returns {string | undefined}
 */
export const mainnetOriginProblem = ({ api, canonical }) => {
  const set = String(canonical ?? '').trim();
  const origin = set ? plainHttpsOrigin(set) : undefined;
  if (set && !origin)
    return `VITE_CANONICAL_ORIGIN (${set}) must be a plain https address with nothing after the name, like https://records.example.org.`;
  const veilcoreRegistry = trimSlash(api) === trimSlash(DEFAULT_API);
  if (veilcoreRegistry && origin && origin !== VEILCORE_ORIGIN)
    return `VITE_CANONICAL_ORIGIN is set to ${origin}, but this build talks to VeilCore's registry, so it is veilcore.org's build and its links must point at veilcore.org (left from a test-site run?). Close this terminal or run: unset VITE_CANONICAL_ORIGIN`;
  if (!veilcoreRegistry && trimSlash(api) && (!origin || origin === VEILCORE_ORIGIN))
    return `This build talks to a registry that is not VeilCore's (${trimSlash(api)}), so set VITE_CANONICAL_ORIGIN to this site's own https address. Without it every link and QR code points at veilcore.org, which has never heard of your records (docs/SELF-HOSTING.md).`;
  return undefined;
};
