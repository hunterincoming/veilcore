// Who a mainnet build says it is: where its shared links and QR codes point
// (bboard-ui/src/config/network.ts CANONICAL_ORIGIN), and who runs it
// (bboard-ui/src/config/operator.ts). Checked before anything is built (bboard-ui/vite.config.ts).
//
// veilcore.org's own build talks to VeilCore's registry, points at veilcore.org and names
// VeilCore as its operator. A copy run from this code with its own registry
// (docs/SELF-HOSTING.md) must point at itself and name whoever runs it, or every label it
// prints sends people to veilcore.org, whose registry has never heard of the record, and its
// privacy policy and contact addresses name VeilCore. So, in a mainnet build:
//   - VeilCore's registry: VITE_CANONICAL_ORIGIN unset (or exactly https://veilcore.org), and no
//     VITE_OPERATOR_* setting. A test-site address left in the shell
//     (scripts/deploy-test-site.mjs sets one) is refused, so veilcore.org's labels can never point
//     at test.veilcore.org.
//   - any other registry: VITE_CANONICAL_ORIGIN set to the copy's own https address (never a
//     veilcore.org one), and all four VITE_OPERATOR_* settings.
// SPDX-License-Identifier: Apache-2.0

import { DEFAULT_API } from './site-mainnet-preflight.mjs';

export const VEILCORE_ORIGIN = 'https://veilcore.org';

/** The settings that name a copy's operator (bboard-ui/src/config/operator.ts). */
export const OPERATOR_SETTINGS = Object.freeze({
  VITE_OPERATOR_NAME: 'who runs this copy (a person or an organisation)',
  VITE_OPERATOR_EMAIL: 'the address people write to for help and to have data deleted',
  VITE_OPERATOR_PRIVACY_URL: 'your own privacy policy (an https address)',
  VITE_OPERATOR_TERMS_URL: 'your own terms of use (an https address)',
});

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

/** veilcore.org itself, or any name under it (www., test., …). */
export const isVeilcoreHost = (origin) => {
  try {
    const h = new URL(origin).hostname.toLowerCase().replace(/\.$/, '');
    return h === 'veilcore.org' || h.endsWith('.veilcore.org');
  } catch {
    return false;
  }
};

/** Whether a build's registry is VeilCore's own. */
export const isVeilcoreRegistry = (api) => trimSlash(api) === trimSlash(DEFAULT_API);

const httpsUrl = (v) => {
  try {
    const u = new URL(String(v).trim());
    return u.protocol === 'https:' && !u.username && !u.password;
  } catch {
    return false;
  }
};
const EMAIL = /^[^\s@<>()"'`\\$,;:{}]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/;

/**
 * What is wrong with a copy's operator settings, in plain words, or [] when fine.
 * @param {Record<string, string | undefined>} env
 * @param {boolean} required a mainnet build with someone else's registry
 */
export const operatorProblems = (env, required) => {
  const set = Object.keys(OPERATOR_SETTINGS).filter((k) => String(env[k] ?? '').trim());
  if (!required && set.length === 0) return [];
  const problems = [];
  const missing = Object.keys(OPERATOR_SETTINGS).filter((k) => !set.includes(k));
  if (missing.length)
    problems.push(
      `Set ${missing.map((k) => `${k} (${OPERATOR_SETTINGS[k]})`).join(', ')}. ` +
        (required
          ? 'This copy is run by you, not by VeilCore: its privacy policy, terms and contact address must be yours (docs/SELF-HOSTING.md).'
          : 'Set all four or none.'),
    );
  const email = String(env.VITE_OPERATOR_EMAIL ?? '').trim();
  if (email && (!EMAIL.test(email) || /@(.+\.)?veilcore\.org$/i.test(email)))
    problems.push(`VITE_OPERATOR_EMAIL (${email}) must be a plain email address of your own, not a veilcore.org one.`);
  for (const k of ['VITE_OPERATOR_PRIVACY_URL', 'VITE_OPERATOR_TERMS_URL']) {
    const v = String(env[k] ?? '').trim();
    if (v && !httpsUrl(v)) problems.push(`${k} (${v}) must be an https address.`);
    else if (v && isVeilcoreHost(new URL(v).origin)) problems.push(`${k} must be your own page, not one on veilcore.org.`);
  }
  const name = String(env.VITE_OPERATOR_NAME ?? '').trim();
  if (name && (name.length > 80 || /[<>{}]/.test(name)))
    problems.push('VITE_OPERATOR_NAME must be a plain name, at most 80 characters.');
  return problems;
};

/**
 * What is wrong with a mainnet build's link origin and operator, in plain words, or undefined when fine.
 * @param {{ api?: string, canonical?: string, env?: Record<string, string | undefined> }} input
 *   VITE_API_BASE, VITE_CANONICAL_ORIGIN, and the rest of the build's settings (for VITE_OPERATOR_*)
 * @returns {string | undefined}
 */
export const mainnetOriginProblem = ({ api, canonical, env = {} }) => {
  const set = String(canonical ?? '').trim();
  const origin = set ? plainHttpsOrigin(set) : undefined;
  if (set && !origin)
    return `VITE_CANONICAL_ORIGIN (${set}) must be a plain https address with nothing after the name, like https://records.example.org.`;
  const veilcoreRegistry = isVeilcoreRegistry(api);
  if (veilcoreRegistry && origin && origin !== VEILCORE_ORIGIN)
    return `VITE_CANONICAL_ORIGIN is set to ${origin}, but this build talks to VeilCore's registry, so it is veilcore.org's build and its links must point at veilcore.org (left from a test-site run?). Close this terminal or run: unset VITE_CANONICAL_ORIGIN`;
  if (veilcoreRegistry) {
    const left = Object.keys(OPERATOR_SETTINGS).filter((k) => String(env[k] ?? '').trim());
    if (left.length)
      return `${left.join(', ')} ${left.length > 1 ? 'are' : 'is'} set, but this build talks to VeilCore's registry, so it is veilcore.org's build and VeilCore runs it. Close this terminal or run: unset ${left.join(' ')}`;
    return undefined;
  }
  if (!trimSlash(api)) return undefined;
  if (!origin || isVeilcoreHost(origin))
    return `This build talks to a registry that is not VeilCore's (${trimSlash(api)}), so set VITE_CANONICAL_ORIGIN to this site's own https address${origin ? `, not ${origin}` : ''}. Otherwise every link and QR code points at veilcore.org, which has never heard of your records (docs/SELF-HOSTING.md).`;
  const op = operatorProblems(env, true);
  return op.length ? op.join(' ') : undefined;
};
