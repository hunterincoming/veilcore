// The one box for anything someone sent you. It works out what was pasted, so nobody has
// to know the difference between a delivery code, a record link, a proof request and an
// agreement to sign (the kiosk rule: show one code, the system decides).
//
// Links keep only their path: the app opens its own page for it, whatever host the link
// was written with, so a pasted link can never send anyone to another site.
//
// Whitespace anywhere is dropped first: email wraps long codes and links across lines,
// and none of the things recognised here contains a space. A record ID on its own opens
// its check page. Something that starts like a delivery code but isn't one whole is
// called cut off, rather than opening Receive with half a code.
// SPDX-License-Identifier: Apache-2.0

export type Pasted =
  | { readonly kind: 'delivery'; readonly code: string }
  | { readonly kind: 'delivery-cut-off' }
  | { readonly kind: 'record-link'; readonly path: string }
  | { readonly kind: 'agreement-to-sign'; readonly path: string }
  | { readonly kind: 'prove-request'; readonly challenge: string }
  | { readonly kind: 'prove-link'; readonly path: string }
  | { readonly kind: 'unknown' };

const DELIVERY = /^TR-[0-9A-F]{8}(\.[0-9a-z]+(\.age1[02-9ac-hj-np-z]{58})?)?$/i;
const CHALLENGE = /^(0x)?[0-9a-f]{64}$/i;
const PROVE_ID = /^PR-[0-9A-F]{32}$/i;
const RECORD_ID = /^VEIL-[0-9A-Z]{4,40}$/i;

const pathOf = (raw: string): string | undefined => {
  // "veilcore.org/verify/…" copied without its https:// is still a link.
  const withScheme = /^[a-z0-9.-]+\.[a-z]{2,}(:\d+)?\//i.test(raw) ? `https://${raw}` : raw;
  try {
    const u = new URL(withScheme, 'https://paste.invalid');
    return `${u.pathname}${u.search}${u.hash}`;
  } catch {
    return undefined;
  }
};

export const recognise = (raw: string): Pasted => {
  const v = raw.replace(/\s+/g, '');
  if (!v) return { kind: 'unknown' };
  if (DELIVERY.test(v)) return { kind: 'delivery', code: v };
  if (/^TR-/i.test(v)) return { kind: 'delivery-cut-off' };
  if (PROVE_ID.test(v)) return { kind: 'prove-link', path: `/prove/${v.toUpperCase()}` };
  if (RECORD_ID.test(v)) return { kind: 'record-link', path: `/verify/${v.toUpperCase()}` };
  if (CHALLENGE.test(v)) return { kind: 'prove-request', challenge: v.replace(/^0x/i, '').toLowerCase() };
  if (v.includes('/')) {
    const path = pathOf(v);
    if (path && /^\/verify\/[^/?#]+/.test(path) && !path.startsWith('/verify/example')) {
      return { kind: 'record-link', path };
    }
    const prove = path && /^\/prove\/(PR-[0-9A-F]{32})(?:[/?#]|$)/i.exec(path);
    // Keep the answer token (#t=, 16 bytes as base64url = 22 characters): without it the
    // holder's page can't send the answer.
    if (prove) {
      const token = /#t=[A-Za-z0-9_-]{22}$/.exec(path)?.[0] ?? '';
      return { kind: 'prove-link', path: `/prove/${prove[1].toUpperCase()}${token}` };
    }
    if (path && /^\/license\/[^/?#]+\/sign(\/|$|\?|#)/.test(path)) return { kind: 'agreement-to-sign', path };
  }
  return { kind: 'unknown' };
};
