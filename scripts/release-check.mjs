// Check a live copy of the site against its release manifest (CONTRACT.md #31: "Don't trust
// us, check").
//
// Every release deploy (npm run deploy:test, npm run deploy:mainnet) writes a manifest:
// the SHA-256 of every file the site serves, the git commit it was built from and the date
// (scripts/release-manifest.mjs), at releases/<network>/<commit>.json, which is committed
// and published with the code. The deploy also puts a small /release.json on the site that
// names the network and the commit. This module fetches the live files and compares them
// with the manifest. It runs in a browser (the /check-this-site page) and in Node
// (npm run check:site -- <url>): fetch and WebCrypto only.
//
// A page served by the site can only check the site against the site's own word, so the page
// says so; the script, run from a copy of the public code, checks against the copy of the
// manifest in that code, and needs nothing from VeilCore.
// SPDX-License-Identifier: Apache-2.0

export const RELEASE_FORMAT = 'veilcore-release/v1';
export const MANIFEST_FORMAT = 'veilcore-release-manifest/v1';

const HEX64 = /^[0-9a-f]{64}$/;
const COMMIT = /^[0-9a-f]{40}$/;
const NETWORK = /^[a-z][a-z0-9-]{0,31}$/;
/** A served path as a manifest names it: "/" then safe characters, never "..". */
const PATH = /^\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]*$/;

const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

/** SHA-256 of bytes, as 64 lowercase hex characters. */
export const sha256Hex = async (bytes) =>
  Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (b) => b.toString(16).padStart(2, '0')).join('');

/** Whether a value is a release.json as a deploy writes it. */
export const isRelease = (v) =>
  isObject(v) &&
  v.format === RELEASE_FORMAT &&
  typeof v.network === 'string' &&
  NETWORK.test(v.network) &&
  typeof v.commit === 'string' &&
  COMMIT.test(v.commit) &&
  typeof v.date === 'string';

/** Whether a value is a release manifest: every file a path and a SHA-256. */
export const isManifest = (v) =>
  isObject(v) &&
  v.format === MANIFEST_FORMAT &&
  typeof v.network === 'string' &&
  NETWORK.test(v.network) &&
  typeof v.commit === 'string' &&
  COMMIT.test(v.commit) &&
  typeof v.date === 'string' &&
  isObject(v.files) &&
  Object.keys(v.files).length > 0 &&
  Object.entries(v.files).every(([p, h]) => PATH.test(p) && !p.split('/').includes('..') && typeof h === 'string' && HEX64.test(h));

/** Where a release's manifest is kept, in the code and on the site. */
export const manifestPath = (network, commit) => `releases/${network}/${commit}.json`;

const origin = (url) => String(url).trim().replace(/\/+$/, '');

/**
 * The site's /release.json: which network and commit it says it was built from. A site that
 * has none (a build made outside a release deploy) answers with the app's page instead.
 * @returns {Promise<{ ok: true, release: any } | { ok: false, problem: string }>}
 */
export const readRelease = async (site, fetchImpl = fetch) => {
  let res;
  try {
    res = await fetchImpl(`${origin(site)}/release.json`, { cache: 'no-store' });
  } catch (e) {
    return { ok: false, problem: `Could not reach ${origin(site)} (${e instanceof Error ? e.message : String(e)}).` };
  }
  if (!res.ok) return { ok: false, problem: `${origin(site)}/release.json answered ${res.status}.` };
  let body;
  try {
    body = JSON.parse(await res.text());
  } catch {
    body = null;
  }
  if (!isRelease(body))
    return {
      ok: false,
      problem: `${origin(site)} has no release list: it was not published by a release deploy, so there is nothing to check it against.`,
    };
  return { ok: true, release: body };
};

/**
 * Fetch every file the manifest lists from the site and compare its SHA-256. Each path is
 * fetched as served, without the browser's cache. `/` is fetched too, and must be the
 * manifest's /index.html: that is the page a visitor gets.
 * @returns {Promise<{ total: number, matched: string[], differ: string[], missing: string[] }>}
 */
export const checkFiles = async (site, manifest, { fetchImpl = fetch, concurrency = 6, onProgress } = {}) => {
  const base = origin(site);
  const entries = Object.entries(manifest.files).sort(([a], [b]) => (a < b ? -1 : 1));
  if (manifest.files['/index.html']) entries.push(['/', manifest.files['/index.html']]);
  const matched = [];
  const differ = [];
  const missing = [];
  let done = 0;
  let next = 0;
  const one = async ([path, want]) => {
    let res;
    try {
      res = await fetchImpl(`${base}${path.split('/').map((s) => encodeURIComponent(decodeURIComponentSafe(s))).join('/')}`, {
        cache: 'no-store',
      });
    } catch {
      res = null;
    }
    if (!res || !res.ok) missing.push(path);
    else if ((await sha256Hex(await res.arrayBuffer())) === want) matched.push(path);
    else differ.push(path);
    done++;
    onProgress?.(done, entries.length);
  };
  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, entries.length)) }, async () => {
    while (next < entries.length) await one(entries[next++]);
  });
  await Promise.all(workers);
  const sort = (l) => l.sort((a, b) => (a < b ? -1 : 1));
  return { total: entries.length, matched: sort(matched), differ: sort(differ), missing: sort(missing) };
};

const decodeURIComponentSafe = (s) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

/** Whether a check found every file as listed. */
export const allMatch = (r) => r.total > 0 && r.differ.length === 0 && r.missing.length === 0 && r.matched.length === r.total;
