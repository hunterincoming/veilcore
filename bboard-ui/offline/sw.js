// VeilCore's offline worker (docs/offline.md). Served as /sw.js; the build writes it from this
// file with the registry's address filled in (vite.config.ts offlineWorker). Plain JavaScript,
// one file, no importScripts and nothing from another site.
//
// What it does:
//   1. Keeps a copy of the app (the files the build listed in /offline-shell.json) so the site
//      opens with no signal. Every file is checked against the release list a release deploy
//      publishes (/release.json, /releases/<network>/<commit>.json, scripts/release-manifest.mjs)
//      before it is kept: a file whose SHA-256 is not the listed one is never kept or served. A
//      site with no release list (a build on someone's own computer) gets no offline copy.
//   2. One copy per release, named by its commit. A new release is noticed on the next page load
//      with signal (and when the page says it is back online), copied whole and checked, and only
//      then used; the old copy is deleted. Pages are always asked of the network first: the
//      copy is used only when the network can't answer (no signal, or no answer in 8 seconds).
//   3. Leaves everything else alone: requests to other sites (the registry, the sponsor, Midnight)
//      are never touched, nor is any request that asks not to be cached (the site checks on
//      /check-this-site, npm run check:site), nor /release.json, /releases/ or this file.
//   4. Background Sync, where the browser has it (Chrome on Android): when signal comes back
//      with VeilCore closed, it sends the proof codes of records sealed with no signal (only
//      { id, recordFingerprint, keyBinding? }, what PUT /api/records/dating takes, never anything
//      typed), so they are dated then and not at the next visit. Open VeilCore pages are told to
//      send as well.
//
// The kill switch is offline/sw-kill.js (VITE_OFFLINE=off): the same address, a worker that
// deletes every copy and unregisters itself.
// SPDX-License-Identifier: Apache-2.0
'use strict';

/* The registry's address, filled in by the build; empty in a build without one. */
const API_BASE = '__VEILCORE_API_BASE__';

const SHELL_PREFIX = 'veilcore-shell-';
const META_CACHE = 'veilcore-offline-meta';
const META_KEY = '/__veilcore-offline/active';
const SHELL_LIST = '/offline-shell.json';
const NAVIGATION_TIMEOUT_MS = 8000;
const RELEASE_FORMAT = 'veilcore-release/v1';
const MANIFEST_FORMAT = 'veilcore-release-manifest/v1';
const SHELL_FORMAT = 'veilcore-offline-shell/v1';
const SYNC_TAG = 'veilcore-send';
const DB_NAME = 'veilcore-offline';
const DB_STORE = 'kv';
const DB_KEY = 'dating';
/* Never answered from a copy: the release list, the worker itself. */
const NEVER = [/^\/release\.json$/, /^\/releases\//, /^\/sw\.js$/, /^\/offline-shell\.json$/];

const HEX64 = /^[0-9a-f]{64}$/;
const COMMIT = /^[0-9a-f]{40}$/;
const NETWORK = /^[a-z][a-z0-9-]{0,31}$/;
const PATH = /^\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]*$/;

const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const hex = (buf) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
const sha256 = async (buf) => hex(await crypto.subtle.digest('SHA-256', buf));

/** /release.json as a release deploy writes it, or null. */
const readRelease = async () => {
  let res;
  try {
    res = await fetch('/release.json', { cache: 'no-store', credentials: 'same-origin', redirect: 'error' });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  let v;
  try {
    v = JSON.parse(await res.text());
  } catch {
    return null;
  }
  return isObject(v) && v.format === RELEASE_FORMAT && NETWORK.test(String(v.network)) && COMMIT.test(String(v.commit)) ? v : null;
};

/** The release's file list, for exactly that network and commit, or null. */
const readManifest = async (rel) => {
  let res;
  try {
    res = await fetch(`/releases/${rel.network}/${rel.commit}.json`, { cache: 'no-store', credentials: 'same-origin', redirect: 'error' });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  let m;
  try {
    m = JSON.parse(await res.text());
  } catch {
    return null;
  }
  if (!isObject(m) || m.format !== MANIFEST_FORMAT || m.network !== rel.network || m.commit !== rel.commit || !isObject(m.files)) return null;
  for (const [p, h] of Object.entries(m.files)) if (!PATH.test(p) || p.split('/').includes('..') || !HEX64.test(String(h))) return null;
  if (m.headers !== undefined && !isObject(m.headers)) return null;
  return m;
};

/** The active copy: { commit, network, files } (files: the release list's path -> SHA-256), or null. */
const readActive = async () => {
  try {
    const meta = await caches.open(META_CACHE);
    const r = await meta.match(META_KEY);
    if (!r) return null;
    const v = await r.json();
    return isObject(v) && COMMIT.test(String(v.commit)) && isObject(v.files) ? v : null;
  } catch {
    return null;
  }
};

const writeActive = async (active) => {
  const meta = await caches.open(META_CACHE);
  await meta.put(META_KEY, new Response(JSON.stringify(active), { headers: { 'content-type': 'application/json' } }));
};

/**
 * A file from the network, kept only if its bytes are the listed ones. Its response headers are
 * kept as the site sent them (the Content-Security-Policy among them), so a page from the copy
 * runs under the same policy as one from the network.
 */
const fetchVerified = async (path, want) => {
  const res = await fetch(path, { cache: 'no-store', credentials: 'same-origin', redirect: 'error' });
  if (!res.ok) throw new Error(`${path} answered ${res.status}`);
  const body = await res.arrayBuffer();
  if ((await sha256(body)) !== want) throw new Error(`${path} is not the listed file`);
  return new Response(body, { status: 200, statusText: 'OK', headers: res.headers });
};

/** A copy already kept, re-checked against the listed SHA-256, so an unchanged file isn't fetched again. */
const reuse = async (oldCache, path, want) => {
  if (!oldCache) return null;
  const hit = await oldCache.match(path);
  if (!hit) return null;
  const body = await hit.clone().arrayBuffer();
  return (await sha256(body)) === want ? new Response(body, { status: 200, statusText: 'OK', headers: hit.headers }) : null;
};

/** The listed headers the site sends on its pages, as the release list records them, if it does. */
const headersMatch = (res, listed) =>
  !isObject(listed) || Object.entries(listed).every(([name, value]) => (res.headers.get(name) ?? '').trim() === String(value).trim());

/**
 * Copy a release whole, checked, into its own cache, then make it the active one and delete the
 * others. Throws (and changes nothing in use) if any file isn't the listed one.
 */
const installRelease = async (rel, man) => {
  const listWant = man.files[SHELL_LIST];
  if (!listWant) throw new Error('this release lists no offline shell');
  const listRes = await fetchVerified(SHELL_LIST, listWant);
  const shell = await listRes.json();
  if (!isObject(shell) || shell.format !== SHELL_FORMAT || !Array.isArray(shell.files)) throw new Error('not an offline shell list');
  const paths = [...new Set(['/index.html', ...shell.files.filter((p) => typeof p === 'string')])];
  for (const p of paths) if (!man.files[p]) throw new Error(`${p} is not in the release list`);
  const before = await readActive();
  const oldCache = before ? await caches.open(SHELL_PREFIX + before.commit) : null;
  const name = SHELL_PREFIX + rel.commit;
  const cache = await caches.open(name);
  try {
    let next = 0;
    const one = async () => {
      while (next < paths.length) {
        const p = paths[next++];
        // The page is always fetched again: its headers (the policy it runs under) may change
        // with a release even when its bytes don't, and they must be the listed ones.
        const res = (p === '/index.html' ? null : await reuse(oldCache, p, man.files[p])) ?? (await fetchVerified(p, man.files[p]));
        if (p === '/index.html' && !headersMatch(res, man.headers)) throw new Error('the page is not sent with the listed headers');
        await cache.put(p, res);
      }
    };
    await Promise.all([one(), one(), one(), one()]);
  } catch (e) {
    await caches.delete(name);
    throw e;
  }
  await writeActive({ commit: rel.commit, network: rel.network, files: man.files, at: new Date().toISOString() });
  for (const k of await caches.keys()) if (k.startsWith(SHELL_PREFIX) && k !== name) await caches.delete(k);
  return true;
};

/**
 * Pages this worker answered from a copy, by client id: the release they came from. Kept with the
 * copy's own record, not in memory: the browser stops an idle worker and starts it again.
 */
const SERVED_KEY = '/__veilcore-offline/served';
const readServed = async () => {
  try {
    const r = await (await caches.open(META_CACHE)).match(SERVED_KEY);
    const v = r ? await r.json() : {};
    return isObject(v) ? v : {};
  } catch {
    return {};
  }
};
const rememberServed = async (clientId, commit) => {
  const open = new Set((await self.clients.matchAll({ type: 'window', includeUncontrolled: true })).map((c) => c.id));
  const now = Object.fromEntries(Object.entries(await readServed()).filter(([id]) => open.has(id)));
  now[clientId] = commit;
  await (await caches.open(META_CACHE)).put(SERVED_KEY, new Response(JSON.stringify(now), { headers: { 'content-type': 'application/json' } }));
};

/**
 * A new release is copied: each open page is told, and told it is older (`stale`) when it came
 * from an older copy, so it can offer to reload (offline/register.ts). A page from the network is
 * that release already.
 */
const tellRelease = async (commit) => {
  const served = await readServed();
  for (const c of await self.clients.matchAll({ type: 'window', includeUncontrolled: true })) {
    const from = served[c.id];
    c.postMessage({ type: 'veilcore-release', commit, stale: from !== undefined && from !== commit });
  }
};

/** Look for a new release and copy it. One check at a time, at most every 30 seconds. */
let checking = null;
let lastCheck = 0;
const checkForUpdate = (force = false) => {
  if (checking) return checking;
  if (!force && Date.now() - lastCheck < 30_000) return Promise.resolve(false);
  lastCheck = Date.now();
  checking = (async () => {
    const rel = await readRelease();
    if (!rel) return false;
    const active = await readActive();
    if (active && active.commit === rel.commit && (await caches.has(SHELL_PREFIX + rel.commit))) return false;
    const man = await readManifest(rel);
    if (!man) return false;
    try {
      await installRelease(rel, man);
    } catch (e) {
      // A newer release is out and couldn't be copied: the copy in use is now an old release.
      // Noted once, so a copy left behind is not used for ever (stale, below).
      if (active && !active.supersededSince) await writeActive({ ...active, supersededSince: Date.now() });
      throw e;
    }
    await tellRelease(rel.commit);
    return true;
  })()
    .catch(() => false)
    .finally(() => {
      checking = null;
    });
  return checking;
};

/**
 * How long a copy is still used once a newer release is out that couldn't be copied (a host
 * problem, or someone slowing the connection to keep a fixed page from arriving): a week. After
 * that the old copy is not served, and the site needs signal until the new one is copied.
 */
const SUPERSEDED_MAX_MS = 7 * 86_400_000;
const stale = (active) => typeof active.supersededSince === 'number' && Date.now() - active.supersededSince > SUPERSEDED_MAX_MS;

const fromCopy = async (path) => {
  const active = await readActive();
  if (!active || stale(active)) return undefined;
  const cache = await caches.open(SHELL_PREFIX + active.commit);
  return cache.match(path);
};

/** A page: the network first; the copy only when the network can't answer. */
const navigate = async (event) => {
  const net = fetch(event.request);
  // Whatever the network does, look for a new release once it answers.
  event.waitUntil(net.then(() => checkForUpdate(), () => undefined));
  let timer;
  const timedOut = new Promise((resolve) => {
    timer = setTimeout(() => resolve('timeout'), NAVIGATION_TIMEOUT_MS);
  });
  try {
    const first = await Promise.race([net, timedOut]);
    if (first !== 'timeout') return first;
  } catch {
    /* no network: the copy below */
  } finally {
    clearTimeout(timer);
  }
  const active = await readActive();
  const copy = await fromCopy('/index.html');
  if (copy && active && !stale(active)) {
    // Remembered, so once a newer release is copied this page is told it is older (tellRelease).
    if (event.resultingClientId) event.waitUntil(rememberServed(event.resultingClientId, active.commit).catch(() => undefined));
    return copy;
  }
  return net;
};

/**
 * A built file (content-addressed: its name changes with its content). The copy first, then the
 * network; a listed file fetched from the network is kept once its bytes are checked.
 */
const asset = async (request, path) => {
  const active = await readActive();
  if (active && !stale(active)) {
    const cache = await caches.open(SHELL_PREFIX + active.commit);
    const hit = await cache.match(path);
    if (hit) return hit;
  }
  const res = await fetch(request);
  const want = active?.files?.[path];
  if (res.ok && want && res.type === 'basic') {
    const body = await res.clone().arrayBuffer();
    if ((await sha256(body)) === want) {
      try {
        const cache = await caches.open(SHELL_PREFIX + active.commit);
        await cache.put(path, new Response(body, { status: 200, statusText: 'OK', headers: res.headers }));
      } catch {
        /* full: served from the network as it came */
      }
    }
  }
  return res;
};

/** Any other file of this site: the network, then the copy when there's no network. */
const other = async (request, path) => {
  try {
    return await fetch(request);
  } catch (e) {
    const copy = await fromCopy(path);
    if (copy) return copy;
    throw e;
  }
};

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(checkForUpdate(true));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const active = await readActive();
      for (const k of await caches.keys())
        if (k.startsWith(SHELL_PREFIX) && (!active || k !== SHELL_PREFIX + active.commit)) await caches.delete(k);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // A request that asks not to be cached is a check of what the site serves now: never a copy.
  if (req.cache === 'no-store' || req.cache === 'reload' || req.cache === 'no-cache') return;
  // Part of a file (video, audio): the network's own answer, never a whole copy in its place.
  if (req.headers && req.headers.has && req.headers.has('range')) return;
  if (NEVER.some((re) => re.test(url.pathname))) return;
  if (req.mode === 'navigate') return event.respondWith(navigate(event));
  if (url.pathname.startsWith('/assets/')) return event.respondWith(asset(req, url.pathname));
  event.respondWith(other(req, url.pathname));
});

self.addEventListener('message', (event) => {
  if (event.origin && event.origin !== self.location.origin) return;
  const type = isObject(event.data) ? event.data.type : undefined;
  if (type === 'veilcore-check') event.waitUntil(checkForUpdate(true));
  else if (type === 'veilcore-active')
    event.waitUntil(
      readActive().then((a) => event.source?.postMessage({ type: 'veilcore-active', commit: a ? a.commit : null, network: a ? a.network : null })),
    );
});

// ---- Background Sync: the proof codes of records sealed with no signal ------------------------

const openDb = () =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(DB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
const dbDo = async (mode, fn) => {
  const db = await openDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, mode);
      const out = fn(tx.objectStore(DB_STORE));
      tx.oncomplete = () => resolve(out?.result);
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
};

const ROW_ID = /^[A-Za-z0-9_.:-]{1,128}$/;
const HOLDER = /^[0-9a-f]{64}$/i;

/** Send what the page left, when no page is open to do it. Throws so the browser tries again. */
const sendQueued = async () => {
  // Open pages send too (their own sync); a tab the browser froze may not, so the worker sends
  // regardless. Sending a dating row twice changes nothing: the registry answers it as dated.
  for (const c of await self.clients.matchAll({ type: 'window' })) c.postMessage({ type: 'veilcore-send-now' });
  if (!/^https?:\/\//.test(API_BASE)) return;
  const q = await dbDo('readonly', (s) => s.get(DB_KEY));
  if (!isObject(q) || !HOLDER.test(String(q.holderKey)) || !Array.isArray(q.rows)) return;
  const rows = q.rows
    .filter((r) => isObject(r) && ROW_ID.test(String(r.id)) && HEX64.test(String(r.recordFingerprint)))
    .slice(0, 100)
    .map((r) => ({ id: r.id, recordFingerprint: r.recordFingerprint, ...(HEX64.test(String(r.keyBinding)) ? { keyBinding: r.keyBinding } : {}) }));
  if (rows.length === 0) return;
  const res = await fetch(`${API_BASE}/api/records/dating`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'x-holder-key': q.holderKey },
    body: JSON.stringify(rows),
    credentials: 'omit',
  });
  if (!res.ok) throw new Error(`the registry answered ${res.status}`);
  const body = await res.json().catch(() => ({}));
  const done = new Set([...(Array.isArray(body.dated) ? body.dated : []), ...(Array.isArray(body.rejected) ? body.rejected.map((r) => r && r.id) : [])]);
  // Only what was answered is taken off; the page reads the registry at the next visit anyway.
  // Read again inside the write: the page may have changed the list meanwhile.
  await dbDo('readwrite', (s) => {
    const get = s.get(DB_KEY);
    get.onsuccess = () => {
      const now = get.result;
      if (!isObject(now) || !Array.isArray(now.rows)) return;
      const left = now.rows.filter((r) => !(isObject(r) && done.has(r.id)));
      if (left.length) s.put({ ...now, rows: left }, DB_KEY);
      else s.delete(DB_KEY);
    };
  });
};

self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAG) event.waitUntil(sendQueued());
});
