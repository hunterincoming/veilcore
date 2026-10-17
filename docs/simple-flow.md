# The simple flow (13 Oct 2026)

Hunter, after the no-wallet run: "the site is confusing … it needs to be so simple you
can't mess it up", with the in-store Amazon returns flow as the bar. This is what was
built on `feat/simple-flow`, why, and what is still to do.

## The rules

1. One thing per screen. The app leads.
2. Anything from another person comes in by tapping a link, or by pasting it into the one
   box on Home. The app works out what it is (`veilcore/paste.ts`).
3. Every journey ends back on the plant's page, and that page always says what to do next.
4. VeilCore never sees genetics and never holds anyone's key.

The research behind each choice is in the report "Simple record app UX research"
(usability psychology, wizard and kiosk studies, key-backup field data, trust and adoption).

## What changed (step 1: no server changes)

- **Logging a plant** (`components/flow/LogFlow.tsx`, `/new`): the plant (name, bred by,
  own date; more details tucked away) → *Is this right?* with a Change link per line →
  one button seals and date-stamps → optional lab report → save the backup and check it →
  the plant's page.
  - The backup is last so it holds everything (a pairing's salt included). Until it is
    checked the keys live in the browser and Home says "Finish: save your backup".
  - A browser that won't keep them (private window) is asked for the backup before the
    date stamp.
- **One backup file** (`veilcore/backup.ts`): holder key, every record's keys, a lab's
  signing key. Saving it does not count; opening the saved copy and reading it back
  does (`checkBackup`). Restore (`/restore`) reads it and the older files (one record's
  keys, the holder-key text file), and refuses anything that would replace a different key.
  Not encrypted yet: see "Open decisions".
- **Home** (`components/flow/AppHome.tsx`, `/records`): first visit is one button. After
  that: your plants with one status line each (unfinished ones first in words), Log new,
  the paste box, My agreements (Practice only), New phone? Export / import / start over
  moved under More. Labs get a two-job panel.
- **The plant's page** (`RecordDetail.tsx`): four status lines (public date stamp, lab
  report, confirmed by a lab, backup checked), one suggested next step (`NextStep.tsx`,
  now also backup and date stamp), then one list, each row with its section's icon.
  Fingerprints, attestations, settlement, history and export are under Technical details.
- **Header**: wordmark, language, network badge. Its five buttons each moved to one home.
- **Light app pages** (`lightTheme`, `config/theme.ts`): dark text on a light ground for
  the app and for the pages people are sent to (check a record, sign an agreement). The
  public site keeps the dark brand. Hunter's call after comparing the light mockup with the
  dark build; easier to read for longer and in daylight. The neon teal, unreadable as text
  on white, became `ACCENT` (#00785A) on these pages. (Since 17 October 2026 the
  palette is pollen and ink: ink `INK_COLOR` #16181D on herbarium paper #F6F3EC, and one
  colour, pollen gold `POLLEN` #F6DA3C, as a fill under ink and never as text; red is kept
  for errors. Headings are Libre Caslon Text Bold. See `config/theme.ts`.)
- **Sections** (`components/flow/FlowFrame.tsx`): Log, Send & receive, License &
  royalties, Prove & check; Okabe–Ito colours, always with icon and name.
- **Delivery codes**: "Text or email it. Don't write it on the package: whoever has this
  code can confirm the delivery."
- **One switch for agreements**: `AGREEMENTS_LIVE` in `config/copy.ts`; `PRACTICE_LABEL`
  reads from it.

Removed: the six-step wizard (`WizardShell`, `ProgressPath`, `Step1LogStrain`,
`Step2LabTransfer`, `Step6ShareOrLicense`), the old dashboard, `AttentionBar`,
`HolderKeyPanel` (its restore-by-typing is on `/restore`).

## Checked

- Site tests 114 pass (9 new: backup, paste); typecheck and lint clean.
- Walked at phone size (390×844) against a local registry, preview build: role → first
  Home → log → check → seal → report (skipped) → backup saved, copy checked → plant page →
  Home → paste box (unknown text; a delivery code opens Receive with the code filled in) →
  a second, empty browser restores from the file and shows the plant.
- **Not run here**: the real-chain date stamp inside the new flow (needs the preprod
  Blockfrost key, which stays on Hunter's Mac). It calls the same `anchorOnChain` the old
  panel did; run it locally before merging.

## Step 2a: "Prove it" by link (`feat/prove-by-link`, registry `feat/prove-relay`)

- The checker, on the plant's check page, taps **Make a link to send them** (optional
  name). Their browser makes the challenge and keeps it for a week
  (`chain/challenge-book.ts`); the registry stores the request (`POST /prove-requests`)
  and gives an id. The link is `/prove/PR-…`.
- The holder opens it (or pastes it in the Home box). If this device holds the plant it
  names: who asked (marked "VeilCore hasn't checked that"), what proving sends, one
  **Prove it** button. The transaction id goes back by itself. No plant here: restore.
- The checker's page checks every few seconds, and checks each answer on chain against
  the challenge and identity *its own browser kept* (`prove-relay.ts` `checkAnswers`),
  never the registry's copy. The registry can make a check fail, never pass. Opening the
  same link again in the checker's browser shows the request and its answer.
- No holder key is sent either way (it would tie the holder's account to the plant's
  on-chain identity). Requests last a week and take at most five answers.
- The share screen has a switch, on by default for date-stamped plants: "Let them check
  the date stamp and ask me to prove I hold it". It adds the plant's on-chain identity to
  the link; without it the check page cannot offer the button. Only people with the link
  can match the holder's proofs to the plant.
- Copying codes by hand is still there under "Do it by hand instead".
- **The record names its own key (14 Oct, `docs/identity-in-record.md`, SPEC 3.6.1).** A
  plant's key is made before it is sealed, and the sealed record carries `keyBinding`
  (the key, hidden with a salt from the record secret); the fingerprint is built around
  it. The share link adds the key's salt (`ks`) and the hash of the sealed details (`cd`).
  The check page recomputes the fingerprint from the link's key, `ks` and `cd`, and makes
  no request unless it matches the link's fingerprint (which must match the registry's):
  "The key in this link isn't the one this record names." Each answer is checked against
  it again. Confirmed then says: "Whoever answered controls this record's own key, right
  now. The record named that key when it was sealed, so it can't be swapped." Older
  records keep the earlier wording, labelled "Older record: key not bound to this
  record."; a bound record whose link leaves `ks`/`cd` out is refused, not downgraded
  (the registry's `/verify` says `keyBound`). New keys are never made for a bound record:
  only its backup brings its key back.
- **What the date stamp dates.** The date stamp on test builds (`anchor`) dates the plant's
  key, not its details: a key can be named by a record sealed later. The record and its
  key are dated together when its fingerprint's batch is dated. The plant screens now say
  "your plant's key" for the first.
- **Correction to the commit message of 9f19804**: it says the checker's check failed in
  the browser. It failed on the local development server only, where Vite's stand-in for
  Node's `crypto` (imported through `contract/src/pairing.ts` and
  `api/src/state-check.ts`) throws as soon as the module loads. A built site only calls
  it if a SHA-256 is actually needed there, which the possession check doesn't: Hunter's
  13 Oct preprod run (built site) said Accepted. Site builds and the dev server now get
  SHA-256 from `src/shims/node-crypto.ts` (tested against Node's), so neither can trip
  on it.
- Walked at phone size against a local registry with a test-chain build (network calls
  blocked): ask → link → holder's page → stranger's page → paste box → answer arrives →
  checker reopens the link → expired link. **Not run**: a real proof and a real check on
  preprod (needs the Blockfrost key on Hunter's Mac).

## Browser tests (14 Oct)

`bboard-ui/e2e` (README there): the built site in Chromium at phone size, every other
request refused. CI now runs the site's unit tests and `site.spec.ts` (stand-in registry);
`flow.spec.ts` runs the whole journey against a real registry before merging. Checked
that a test fails when the behaviour it covers is broken. Found on the way: a failed date
stamp left the logging flow with only "Try again"; it now also offers "Do the date stamp
later", which carries on to the backup.

## Lab results, signed and locked (14 Oct; registry `feat/lab-results`)

- Each plant has a lock made from its own record secret (HKDF, `veilcore/lab-results.ts`).
  Nothing new to back up: the backup already holds the secret.
- "Send it to a lab" puts the lock's public half in the delivery code
  (`TR-….<claim>.age1…`). It travels with the code, not through the registry, so the
  registry never gets the chance to give the lab a lock of its own. Old codes still work;
  a lab with one can't send locked results and is told to ask for a new code.
- The lab, on the received plant's page: **Send results back to the breeder** → choose
  the file → **Sign, lock and send**. Its browser signs the file's fingerprint with the
  lab's key (a `laboratory-report` attestation, public), locks the file (the open `age`
  format, X25519), and uploads only the locked file.
- The registry (`lineage/lab-results.mjs`) refuses anything that isn't an age file, lets
  only the delivery's receiver add, only its sender read or delete; 5 per delivery, 15 MB.
- The breeder: the plant's page says a result came back → **Open**. Their browser opens it
  with the plant's secret and calls it the lab's only if the lab signed that exact file
  (and says when the same lab also confirmed receiving the sample). **Save the report**,
  or **Pair it with this plant** (the pairing screen with the file already chosen).
- Anyone can open a result outside VeilCore with the free `age` tool and the plant's key.
  Since round 3 of sealed records a report is padded before it is locked, so its stored size
  says little: the opened file ends with zeros and a 16-byte trailer (its length and
  `VCPAD\0` `1\n`), which the app takes off. The lab's lock comes only from the lab code or
  from the sender's sealed offer, never from a row on the registry.
- Tested: unit tests (lock/open, wrong plant refused, code format), registry tests
  (who may do what, readable files refused, limits), and the whole round trip in a browser
  against a real registry (`e2e/flow.spec.ts`), including that the stored file can't be
  read.
- Also: the older browser suite (`src/hardening-roundD.test.ts`) was skipping without a
  build and still pointed at screens the simple flow removed. It now follows the new
  screens, uses the repository's own Playwright, and runs in CI on a fresh build.

## Next (step 2: server pieces)

Then the examiner's "prove it's distinct" screens, and the company side of signing.

## Open decisions

- Encrypt the backup file with a password? A password can be forgotten (the restore
  failure the research measured). Until decided, steer people to Drive, iCloud or USB as
  well as email. Decide before mainnet.
- Keep or drop the per-record anchor panel's "backup first" rule on the plant page (the
  new flow date-stamps before the backup when the browser keeps storage).
