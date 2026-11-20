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
  checks it, switches to it, then deletes the old one. The page itself is always fetched again
  (never reused from the old copy), since its headers can change when its bytes don't.
- **A copy left behind expires.** Once `/release.json` names a newer release that hasn't been
  copied, for any reason (a host problem, a release list that can't be read, someone slowing the
  connection to keep a fix from arriving), the old copy is served only when the network fails
  outright, never on a slow answer, and for 48 hours at most.
  That mark is kept in Cache Storage, which the page can write, as it can IndexedDB: code
  injected into one visit could clear it. It still can't make the worker serve other bytes (each
  file is checked against the worker, below), and the browser replaces the worker itself on its
  own `/sw.js` check, so the old copy lasts no longer than the old worker.
- **Re-checked when served, against the worker itself.** The browser's Cache Storage is
  writable from the page, so code injected into one visit could plant a file, or rewrite the
  copy's own record, and outlive the fix. Nothing kept there is trusted: the build writes the
  SHA-256 of every file of the copy into `/sw.js` itself (`SHELL_FILES`, vite.config.ts), and a
  kept file is hashed against that each time it is served. One that doesn't match is not served
  (the network is asked). The kept page is served with the headers written into `/sw.js` when
  the release is made (`PAGE_HEADERS`, scripts/vercel-config.mjs), never the kept ones; other
  kept files with their type and `nosniff` only. `/sw.js` is fetched past every cache and held
  to the release list (`npm run check:site` checks both values against it), so each release's
  worker vouches for its own copy; a new release brings a new worker, which the page asks for on
  every load with signal and when signal comes back. A worker left with its placeholders (a build
  no release was made from) never serves the kept page.
- **Whose word it is.** The worker checks the host against itself: `/release.json` and the
  release list come from the same host as the files, unsigned. That catches a partial or mixed
  deploy and a corrupted file. It doesn't stop a compromised deploy that serves a matching list;
  network-first pages and the browser's own `/sw.js` check limit how long that lasts. What
  checks the host against the code is `npm run check:site`, against the `releases/` committed in
  this repository.
- **Network first.** Pages always come from the network when it answers (within 8 seconds).
  The copy is used only when it doesn't. The worker remembers which open pages it answered
  from a copy; once signal is back and a newer release is copied, those pages say "A newer
  version of VeilCore is ready" with a Reload button.
- **Hands off.** It never answers a request to another site (the registry, the sponsor,
  Midnight), any request that asks not to be cached (the site's own checks,
  `/check-this-site` and `npm run check:site`), a request for part of a file (`Range`),
  `/release.json`, `/releases/`, or itself. A page a worker controls can't vouch for that
  worker: the check that needs nothing from the site is `npm run check:site`, which asks for
  `/sw.js` the way a browser asks for a worker (`Service-Worker: script`) and holds it to the list.
- **No third-party code.** One file, no `importScripts`.

### Sending when signal is back

- **VeilCore open:** the page sends the moment the browser says it is online (and on its
  30-second sync, as before).
- **VeilCore closed, Chrome on Android or a computer:** Background Sync. The page leaves the
  worker exactly what `PUT /api/records/dating` takes for records waiting to be dated (id,
  proof code, key binding) and the holder key, in this site's IndexedDB
  (`src/offline/dating-mirror.ts`). When signal comes back the browser wakes the worker, which
  sends them, so they are dated then. Nothing typed, no vault key, no locked copy: the locked
  copy waits for the page, as it always has. Forgetting the holder key deletes this copy too.
  The worker never sends while a check or prove page is open (CONTRACT.md #36): it waits and the
  browser tries again later. A send already under way when someone starts over can still finish
  once; it is a dating row, nothing more.
- **iPhone and iPad (and Safari, Firefox):** no Background Sync. The screen says so: "Its proof
  code goes the next time you open VeilCore with signal."
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

## Whose timestamp (the pins)

A timestamp is shown only when the certificate that signed it is one this site pins:
`bboard-ui/src/config/tsa-pins.json`, by the SHA-256 of the certificate, published with every
release as `/tsa-pins.json` (so each release list says which keys it trusts). The name shown
is the pin's. A token counts only when its own time falls within that certificate's life (the
pin's `notBefore` and `validUntil`), so a key that leaks after its certificate expires or is
retired can't date anything. Without the pin, a registry that lied could sign a token with a certificate of its
own making, name it after any authority and give it any time. With no pins, nothing is shown.

Pinned on 20 November 2026 (copies in `docs/tsa-pins/`):

| Authority | Certificate | SHA-256 | How it was checked |
| --- | --- | --- | --- |
| FreeTSA | `www.freetsa.org`, TSA, valid to Feb 2040 | `32e841a9…91fc` | The PEM file's SHA-256 is the one FreeTSA publishes for `tsa.crt` on freetsa.org; it chains to FreeTSA's root, whose published hash also matches (`openssl verify -purpose timestampsign`). One source only: the certificate, the root and both hashes all come from freetsa.org (FreeTSA's root is in no operating system's trust store). The real FreeTSA token below is the second, independent check. |
| DigiCert | Timestamp Responder 2025 1, to Sep 2036 | `4aa03fa2…0a33` | Byte-identical in two unrelated public copies of DigiCert token chains; chains to DigiCert Trusted Root G4 in the operating system's trust store; Time Stamping only. |
| DigiCert | Timestamp Responder 2026 1, to Nov 2037 | `2da09da7…ebfc` | The same. |

As a last check, two real tokens from 15 November 2026 found in a public repository (one from
FreeTSA, one from DigiCert) were run through `scripts/tsa-signer.mjs`, the parser the site
uses: each resolves to its pinned certificate (DigiCert's to the 2026 responder).

**Sectigo is not pinned.** Its current signer (Public Time Stamping Signer R36) couldn't be
checked from two sources here (the session's network allows neither sectigo.com nor a live
token), so its tokens aren't shown until it is. To add it, or a new certificate after an
authority rotates: `node scripts/tsa-pin.mjs https://timestamp.sectigo.com` asks for a live
token, finds the certificate that signed it the way the site does, and prints it with the
`openssl verify` command to run before the entry goes in. An authority that rotates its
certificate stops being shown until its new one is pinned: nothing wrong is shown meanwhile.

When the pinned authorities' times are more than five minutes apart, the page says they
disagree and leads with none of them. The registry's "qualified" label (eIDAS, JP-MIC) is not
shown: it is the registry's word, not tied to a pin.

## The timestamp in seconds

The registry (`veilcore-api`, `lineage/record-stamps.mjs`) queues each proof code new to a
record for a token from each timestamp authority in `VEILCORE_TSA_URL`, and answers the save at
once; the requests run after, one at a time per authority, spaced out, falling back to the
batch's token if an authority is slow, down or busy. `GET /proof/:commitment/instant` serves
them. The site (`src/veilcore/instant-stamp.ts`):

- checks every token in the browser against the proof code (imprint, signature, time-stamping
  key usage) and drops one that doesn't check, or isn't signed by a pinned certificate (above);
- takes the time from the token, not from the registry's answer, and the name from the pin;
- leads with the minute (the checks list gives the second): anyone with a check link can read
  when the registry took the proof code, and for a record sealed with no signal that is when the
  device got signal back. The privacy page says so;
- leads only on a check link that carries the proof code; without one the proof code is the
  registry's report, and the checks list says so;
- shows one line per authority, and on the check page one row each in "What each fact rests
  on": signed and checked here when the link carried the proof code, the registry's word when
  it didn't (the same rule as a lab's signature).

An older registry has no such route: the site shows nothing and works as before. The site's
deploy still requires `record-timestamp-v1`, so the registry goes first.

## If the worker goes wrong (the kill switch)

A worker outlives a bad deploy. To remove it from every browser:

1. Build and deploy the site with `VITE_OFFLINE=off` (the deploy scripts pass it through, and the
   release list records it). `/sw.js` is then `offline/sw-kill.js`: no fetch handler; it deletes
   every copy and the Background Sync list, unregisters itself and reloads open pages. That
   build's pages delete the copies too, in case they unregister the old worker before the
   browser fetches the kill switch.
2. `/sw.js` is served `Cache-Control: no-cache, no-store, must-revalidate`
   (`scripts/vercel-config.mjs`) and registered with `updateViaCache: 'none'`, so every browser
   fetches the new one on its next page load.
3. That build's pages register no worker and unregister any they find.
4. Keep the kill-switch build deployed for at least a few weeks before shipping the worker
   again: a browser gets it only on its next page load with signal, and a phone offline for a
   while keeps the old worker until then.

`npm run check:site` and `/check-this-site` check the worker: it is served with that header and
the listed Content-Security-Policy (its `connect-src` limits where it can send anything), it is
the listed file when asked for the way a browser asks for a worker, a kill-switch build's worker
answers no requests, and every file it keeps is on the release list.
The end-to-end test `e2e/offline.spec.ts` runs the kill switch against a live copy.

## Limits, plainly

- Storage is the browser's. A browser can clear it (private windows, "clear site data", low
  storage, Safari's 7-day rule outside the Home Screen). The backup is still what keeps records.
- A device's clock is not evidence, and the screen says "not checked". Only the dates from the
  registry, a pinned timestamp authority and Midnight are.
- The timestamp authority sees a SHA-256 of the proof code and when it was asked. One holder
  can have at most 20 proof codes waiting per authority; past that, and when an authority is
  slow or down, the batch's timestamp dates them as before.
