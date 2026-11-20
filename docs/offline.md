# Works with no signal, dated in seconds

Two things, 19 November 2026:

1. **No signal.** veilcore.org opens, and records can be made and sealed, with no internet. Each
   one is dated when its proof code is sent, never earlier.
2. **In seconds.** The moment the registry takes a proof code it asks a timestamp authority
   (RFC 3161) for a timestamp on it. The record's page and check page show it within seconds:
   "Timestamped 14:03:12 by freetsa.org — Midnight date follows in the next batch".

## The one rule

The date VeilCore can prove is when the proof code reached someone who can witness it: the
registry, a timestamp authority, Midnight. Working offline makes sealing easy; it can't make the
date earlier. So a record sealed with no signal says:

> Sealed on this phone at 05:02 (your phone's clock). Dated when it's sent.

The phone's clock is anyone's to set, so it is said as the phone's, and nothing calls it a date.

## How it works

### The offline worker (`bboard-ui/offline/sw.js`, served as `/sw.js`)

- **What it keeps.** The files the build lists in `/offline-shell.json` (`vite.config.ts`
  `offlineWorker`): the app's code and styles, its fonts and icons, and WebAssembly under 2 MB.
  About 11 MB. Never the proving keys, Ask's model, videos, or the large Midnight and Cardano
  libraries: proving needs the network anyway.
- **Only what the release list says.** It copies nothing unless the site has a release list
  (`/release.json` and `/releases/<network>/<commit>.json`, written by every release deploy,
  `scripts/release-manifest.mjs`). Every file is checked against its listed SHA-256 before it is
  kept; a file that doesn't match stops the whole copy, and the copy in use stays. The page is
  kept with the headers it was sent with (the Content-Security-Policy among them), and those
  must be the listed ones. A build on someone's own computer has no list, so no copy.
- **One copy per release.** Named by its commit. The worker looks for a new release on every
  page load with signal, and when the page says it is back online; it copies the new one whole,
  checks it, switches to it, then deletes the old one.
- **Network first.** Pages always come from the network when it answers (within 8 seconds).
  The copy is used only when it doesn't. The worker remembers which open pages it answered
  from a copy; once signal is back and a newer release is copied, those pages say "A newer
  version of VeilCore is ready" with a Reload button.
- **Hands off.** It never answers a request to another site (the registry, the sponsor,
  Midnight), any request that asks not to be cached (the site's own checks,
  `/check-this-site` and `npm run check:site`), `/release.json`, `/releases/`, or itself.
- **No third-party code.** One file, no `importScripts`.

### Sending when signal is back

- **VeilCore open:** the page sends the moment the browser says it is online (and on its
  30-second sync, as before).
- **VeilCore closed, Chrome on Android or a computer:** Background Sync. The page leaves the
  worker exactly what `PUT /api/records/dating` takes for records waiting to be dated (id,
  proof code, key binding) and the holder key, in this site's IndexedDB
  (`src/offline/dating-mirror.ts`). When signal comes back the browser wakes the worker, which
  sends them, so they are dated then. Nothing typed, no vault key, no locked copy: the locked
  copy waits for the page, as it always has.
- **iPhone and iPad:** no Background Sync. Records are sent the next time VeilCore is opened.
- The outbox itself stays where it was (`veilcore/outbox.ts`, the browser's local storage). It
  already survives reloads and a closed browser; moving it would touch every save path for no
  gain, since the worker only needs the dating rows.

### What waits for signal

Proving, the key date stamp, checking, sharing, lab hand-overs, licences: anything that needs
the registry, the sponsor or Midnight. The app says so in one line at the top ("No signal. You
can still make and seal records here…"). The key date stamp waits without spending a try and
starts by itself when signal is back.

### Installing (Home Screen)

Home shows "Use VeilCore with no signal" once there is a record:

- **Chrome, Edge, Samsung Internet:** an "Add to Home Screen" button.
- **iPhone, iPad:** the steps in Safari, and the two surprises, said first. The Home Screen app
  has its own storage, apart from Safari, so it opens empty: open it once with signal and get
  the records back there (Face ID or the backup file), after letting anything still waiting in
  Safari send. And on the Home Screen VeilCore isn't cleared the way Safari clears sites after
  7 days without a visit. Keep the backup anyway.

## The timestamp in seconds

The registry (`veilcore-api`, `lineage/record-stamps.mjs`) queues each proof code new to a
record for a token from each timestamp authority in `VEILCORE_TSA_URL`, and answers the save at
once; the requests run after, one at a time per authority, spaced out, falling back to the
batch's token if an authority is slow, down or busy. `GET /proof/:commitment/instant` serves
them. The site (`src/veilcore/instant-stamp.ts`):

- checks every token in the browser against the proof code (imprint, signature, time-stamping
  key usage) and drops one that doesn't check;
- takes the time from the token, not from the registry's answer;
- shows one line per authority, and on the check page one row each in "What each fact rests
  on": signed and checked here when the link carried the proof code, the registry's word when
  it didn't (the same rule as a lab's signature).

An older registry has no such route: the site shows nothing and works as before. The site's
deploy still requires `record-timestamp-v1`, so the registry goes first.

## If the worker goes wrong (the kill switch)

A worker outlives a bad deploy. To remove it from every browser:

1. Build and deploy the site with `VITE_OFFLINE=off` (the deploy scripts pass it through, and the
   release list records it). `/sw.js` is then `offline/sw-kill.js`: no fetch handler; it deletes
   every copy and the Background Sync list, unregisters itself and reloads open pages.
2. `/sw.js` is served `Cache-Control: no-cache, no-store, must-revalidate`
   (`scripts/vercel-config.mjs`) and registered with `updateViaCache: 'none'`, so every browser
   fetches the new one on its next page load.
3. That build's pages register no worker and unregister any they find.

`npm run check:site` and `/check-this-site` check the worker: it is served with that header, a
kill-switch build's worker answers no requests, and every file it keeps is on the release list.
The end-to-end test `e2e/offline.spec.ts` runs the kill switch against a live copy.

## Limits, plainly

- Storage is the browser's. A browser can clear it (private windows, "clear site data", low
  storage, Safari's 7-day rule outside the Home Screen). The backup is still what keeps records.
- A device's clock is not evidence. Only the dates from the registry, a timestamp authority and
  Midnight are.
- The timestamp authority sees a SHA-256 of the proof code and when it was asked.
