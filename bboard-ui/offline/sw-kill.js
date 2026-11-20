// The kill switch for VeilCore's offline worker (docs/offline.md, "If the worker goes wrong").
//
// A service worker outlives the deploy that put it there: one that went wrong (a bad build, a
// host serving something it shouldn't) keeps answering pages until a new worker replaces it. A
// build with VITE_OFFLINE=off writes this file as /sw.js instead of offline/sw.js. Every browser
// that has the old worker fetches /sw.js again on its next page load (it is served no-cache and
// registered with updateViaCache: 'none'), gets this, and this:
//   - has no fetch handler, so from now on every request goes to the network as if no worker
//     had ever been there;
//   - deletes every copy the offline worker kept, and the proof codes it held for Background
//     Sync (the page still keeps its own list of what waits to be sent, in its own storage);
//   - unregisters itself, and reloads open VeilCore pages so they come from the network.
// The page in such a build registers no worker and unregisters any it finds (src/offline/register.ts).
// SPDX-License-Identifier: Apache-2.0
'use strict';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const k of await caches.keys()) if (k.startsWith('veilcore-')) await caches.delete(k);
      // Awaited; "blocked" (a page still has it open) is settled by that page, which in a
      // kill-switch build deletes it too (src/offline/register.ts).
      await new Promise((resolve) => {
        try {
          const req = indexedDB.deleteDatabase('veilcore-offline');
          req.onsuccess = req.onerror = req.onblocked = () => resolve(undefined);
        } catch {
          resolve(undefined);
        }
      });
      await self.registration.unregister();
      for (const c of await self.clients.matchAll({ type: 'window' })) {
        try {
          await c.navigate(c.url);
        } catch {
          /* a page this worker doesn't control: it reloads from the network next time anyway */
        }
      }
    })(),
  );
});
