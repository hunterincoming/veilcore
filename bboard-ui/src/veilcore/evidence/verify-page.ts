// verify.html for the evidence bundle: one self-contained page that checks a record offline.
//
// Made from three files, each copied in as it is:
//   - the page and its display code: bboard-ui/evidence-page/verify.template.html;
//   - the checks: bboard-ui/evidence-page/verify-core.js (plain browser JavaScript);
//   - the canonicalisation of the published SDK, veilcore-records' own dist/canonical.js,
//     the exact code the site and the registry hash with, minus its one `export` keyword.
// and the bundle's evidence.json and Bitcoin stamp file, put in as data. The page loads nothing else and its
// Content-Security-Policy forbids it to.
// SPDX-License-Identifier: Apache-2.0

import template from '../../../evidence-page/verify.template.html?raw';
import core from '../../../evidence-page/verify-core.js?raw';
import sdkCanonical from '../../../../node_modules/veilcore-records/dist/canonical.js?raw';
import sdkPackage from 'veilcore-records/package.json';

/** The SDK version whose canonicalisation is copied into the page. */
export const SDK_VERSION: string = (sdkPackage as { version: string }).version;

/** The SDK's canonical.js as a classic script: its single `export` keyword removed, nothing else. */
export const canonicalScript = (): string => {
  const exports = sdkCanonical.match(/^export /gm) ?? [];
  if (
    exports.length !== 1 ||
    /^\s*import\s/m.test(sdkCanonical) ||
    !/^export const canonicalise =/m.test(sdkCanonical)
  ) {
    // A newer SDK laid out differently: refuse rather than ship a page that can't run.
    throw new Error('veilcore-records dist/canonical.js has changed shape; update evidence/verify-page.ts');
  }
  return sdkCanonical.replace(/^export const canonicalise =/m, 'const canonicalise =');
};

/** The checks, as the page runs them. */
export const coreScript = (): string => core;

const CLOSES_SCRIPT = /<\/script/i;

/**
 * Evidence as data inside a <script type="application/json">: every "<" escaped, so no
 * value (a plant's name, a lab's) can close the element or open a comment.
 */
export const embedJson = (value: unknown): string =>
  JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

/** Replace one placeholder that must be there exactly once. split/join: no `$` patterns. */
const put = (html: string, marker: string, value: string): string => {
  const parts = html.split(marker);
  if (parts.length !== 2) throw new Error(`verify.html template: ${marker} must appear exactly once`);
  return parts.join(value);
};

const toBase64 = (b: Uint8Array): string => {
  let bin = '';
  for (let i = 0; i < b.length; i += 0x8000) bin += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(bin);
};

/**
 * The page, with this evidence inside it, and the bundle's Bitcoin stamp file (base64) so
 * the page reads what the file itself shows rather than repeating the registry's report.
 */
export const verifyPageHtml = (evidence: unknown, stamp?: Uint8Array | null): string => {
  const canon = canonicalScript();
  if (CLOSES_SCRIPT.test(canon) || CLOSES_SCRIPT.test(core)) throw new Error('a script would end its own element');
  let html = template;
  html = put(html, '@@SDK_VERSION@@', SDK_VERSION);
  html = put(html, '/*@@CANONICAL@@*/', canon);
  html = put(html, '/*@@VERIFY_CORE@@*/', core);
  html = put(html, '@@EVIDENCE_JSON@@', embedJson(evidence));
  html = put(html, '@@STAMP_JSON@@', embedJson(stamp && stamp.length ? toBase64(stamp) : null));
  return html;
};
