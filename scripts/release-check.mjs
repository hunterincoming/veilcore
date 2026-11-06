// Check a live copy of the site against its release manifest (CONTRACT.md #31, #32: "Don't
// trust us, check").
//
// Every release deploy (npm run deploy:test, deploy:mainnet, deploy:prod) writes a manifest:
// the SHA-256 of every file the site serves, the response headers that matter (the content
// security policy and the other security headers), the build settings (every VITE_* value,
// the build mode, and the Node and npm versions), the git commit it was built from and the
// date (scripts/release-manifest.mjs), at releases/<network>/<commit>.json, which is committed
// and published with the code. The deploy also puts a small /release.json on the site that
// names the network and the commit. This module fetches the live files and compares them with
// the manifest, and since round 6 (the fifth review's finding 1) it also fetches every page
// address the app serves, with fresh random ids, and a random address, the way a browser asks
// for a page, and requires each to be exactly the listed index.html with the listed headers:
// a host could serve the listed files to a checker and other code on the pages people open.
// It runs in a browser (the /check-this-site page) and in Node (npm run check:site -- <url>):
// fetch and WebCrypto only.
//
// What it shows, and what it can't: that the files this check received match the published
// list. Anyone can also rebuild the release from the published code and compare
// (npm run check:rebuild -- <manifest>, scripts/check-rebuild.mjs). Neither can prove a host
// sent everyone the same files: a host can tell one request from another.
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

/**
 * The response headers a manifest records and a check compares (round 6, finding 1): the
 * security headers scripts/vercel-config.mjs sets on every response. Lower case.
 */
export const SECURITY_HEADERS = Object.freeze([
  'content-security-policy',
  'strict-transport-security',
  'x-frame-options',
  'x-content-type-options',
  'referrer-policy',
  'permissions-policy',
  'cross-origin-opener-policy',
  'cross-origin-resource-policy',
]);

const isStringMap = (v) => isObject(v) && Object.entries(v).every(([k, x]) => typeof k === 'string' && typeof x === 'string');

/**
 * A manifest's build settings (round 6): the build mode, every VITE_* setting the build saw
 * (names and values; none is a secret, release-manifest.mjs refuses one that looks like a
 * key), and the Node and npm versions. What npm run check:rebuild builds with.
 */
export const isBuildFacts = (v) =>
  isObject(v) &&
  typeof v.mode === 'string' &&
  /^[a-z][a-z0-9-]{0,31}$/.test(v.mode) &&
  isStringMap(v.settings) &&
  Object.keys(v.settings).every((k) => /^VITE_[A-Z0-9_]{1,64}$/.test(k)) &&
  typeof v.node === 'string' &&
  typeof v.npm === 'string';

/**
 * Whether a value is a release manifest: every file a path and a SHA-256; since round 6 the
 * headers (lower-case names to values) and the build facts, when present, well formed. A
 * manifest from before round 6 has neither, and a check says what that leaves unchecked.
 */
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
  Object.entries(v.files).every(([p, h]) => PATH.test(p) && !p.split('/').includes('..') && typeof h === 'string' && HEX64.test(h)) &&
  (v.headers === undefined || (isStringMap(v.headers) && Object.keys(v.headers).every((k) => k === k.toLowerCase()))) &&
  (v.build === undefined || isBuildFacts(v.build));

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

/**
 * The page addresses the app serves (bboard-ui/src/App.tsx), with `:id` where an id goes. A
 * check fills each id with a fresh random one, so a host can't keep a list of the addresses a
 * checker asks for. A test (bboard-ui/src/round6.test.ts) holds this list to App.tsx's routes.
 */
export const APP_ROUTES = Object.freeze([
  '/',
  '/founders',
  '/privacy',
  '/terms',
  '/check-this-site',
  '/partners',
  '/verify',
  '/verify/example',
  '/verify/:record?fp=:hex',
  '/records',
  '/records/import',
  '/restore',
  '/backup',
  '/docs/spec',
  '/implementations',
  '/new',
  '/documents/new',
  '/check-document',
  '/check-claim',
  '/prove/:prove',
  '/prove-license/:prove',
  '/record/:record',
  '/record/:record/license',
  '/licenses',
  '/license/:license',
  '/license/:license/sign',
  '/license-invite/:invite',
  '/claim',
  '/lender',
  '/intake',
  '/intake/send',
]);

/**
 * What a browser sends when it opens a page (rather than fetching a file): a host could serve
 * the listed index.html to a fetch and other code to a page load. In a browser these names are
 * the browser's own, and fetch() leaves them as it would; from Node they are sent as written.
 */
export const NAVIGATE_HEADERS = Object.freeze({
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'sec-fetch-dest': 'document',
  'sec-fetch-mode': 'navigate',
  'sec-fetch-site': 'none',
  'sec-fetch-user': '?1',
  'upgrade-insecure-requests': '1',
  'user-agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
});

const randomHex = (bytes) => Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) => b.toString(16).padStart(2, '0')).join('');

/** APP_ROUTES with fresh random ids, and one random address the app doesn't have. */
export const routesToCheck = () => [
  ...APP_ROUTES.map((r) =>
    r
      .replace(':record', `VEIL-${randomHex(16).toUpperCase()}`)
      .replace(':prove', `PR-${randomHex(8).toUpperCase()}`)
      .replace(':license', `LIC-${randomHex(8).toUpperCase()}`)
      .replace(':invite', `LI-${randomHex(16).toUpperCase()}`)
      .replace(':hex', randomHex(32)),
  ),
  `/${randomHex(8)}/${randomHex(8)}`,
];

/**
 * Fetch every page address (routesToCheck) the way a browser opens a page, and require each
 * answer to be exactly the listed /index.html, with the listed headers. A manifest without
 * headers (made before round 6) has the pages checked and the headers not: `headersListed`
 * says so.
 * @returns {Promise<{ total: number, matched: string[], differ: string[], missing: string[],
 *   headerDiffers: { path: string, name: string }[], headersListed: boolean }>}
 */
export const checkRoutes = async (site, manifest, { fetchImpl = fetch, routes = routesToCheck(), concurrency = 4, onProgress } = {}) => {
  const base = origin(site);
  const want = manifest.files['/index.html'];
  const listed = isObject(manifest.headers) ? manifest.headers : null;
  const matched = [];
  const differ = [];
  const missing = [];
  const headerDiffers = [];
  let next = 0;
  let done = 0;
  const one = async (path) => {
    let res;
    try {
      res = await fetchImpl(`${base}${path}`, { cache: 'no-store', headers: NAVIGATE_HEADERS, redirect: 'manual' });
    } catch {
      res = null;
    }
    if (!res || !res.ok) missing.push(path);
    else {
      const body = await res.arrayBuffer();
      if (want && (await sha256Hex(body)) === want) matched.push(path);
      else differ.push(path);
      if (listed)
        for (const [name, value] of Object.entries(listed))
          if ((res.headers.get(name) ?? '').trim() !== value.trim()) headerDiffers.push({ path, name });
    }
    done++;
    onProgress?.(done, routes.length);
  };
  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, routes.length)) }, async () => {
    while (next < routes.length) await one(routes[next++]);
  });
  await Promise.all(workers);
  return { total: routes.length, matched, differ, missing, headerDiffers, headersListed: !!listed };
};

/** Whether every page address was the listed index.html, with the listed headers. */
export const routesMatch = (r) =>
  r.total > 0 && r.matched.length === r.total && r.differ.length === 0 && r.missing.length === 0 && r.headerDiffers.length === 0;

/**
 * The whole check: every listed file, then every page address. `total` and `done` in
 * onProgress count both.
 */
export const checkRelease = async (site, manifest, { fetchImpl = fetch, onProgress, routes } = {}) => {
  const fileCount = Object.keys(manifest.files).length + (manifest.files['/index.html'] ? 1 : 0);
  const pages = routes ?? routesToCheck();
  const total = fileCount + pages.length;
  const files = await checkFiles(site, manifest, { fetchImpl, onProgress: (d) => onProgress?.(d, total) });
  const pagesOut = await checkRoutes(site, manifest, {
    fetchImpl,
    routes: pages,
    onProgress: (d) => onProgress?.(fileCount + d, total),
  });
  return { files, routes: pagesOut };
};

/** Whether a whole check found everything as listed. */
export const releaseMatches = (r) => allMatch(r.files) && routesMatch(r.routes);

/**
 * The page a browser is showing, against the listed index.html (round 6): every script in it
 * must be one the listed page has, by its address or, for one written into the page, its text.
 * The /check-this-site page runs this on itself: a host that changed the page it sent this
 * browser, and served the listed one to the checks, is caught here if the change is a script
 * still in the page. It can't catch a change that removes itself.
 * @returns {string[]} the scripts in the live page the listed one doesn't have (src, or the
 *   start of an inline script's text)
 */
export const extraScripts = (liveDoc, listedHtml) => {
  const parsed = new DOMParser().parseFromString(listedHtml, 'text/html');
  const key = (el, base) => {
    const src = el.getAttribute('src');
    if (src) {
      try {
        return `src:${new URL(src, base).pathname}`;
      } catch {
        return `src:${src}`;
      }
    }
    return `inline:${(el.textContent ?? '').trim()}`;
  };
  const base = liveDoc.location?.href ?? 'http://x/';
  const allowed = new Set([...parsed.querySelectorAll('script')].map((el) => key(el, base)));
  return [...liveDoc.querySelectorAll('script')]
    .map((el) => key(el, base))
    .filter((k) => !allowed.has(k))
    .map((k) => (k.startsWith('inline:') ? `inline script: ${k.slice(7, 60)}` : k.slice(4)));
};
