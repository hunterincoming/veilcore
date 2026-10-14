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
  on white, became `ACCENT` (#00785A) on these pages.
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

## Next (step 2: server pieces)

- **"Prove it" without copy-paste**: the checker's request reaches the holder as a link;
  the answer goes back through the registry and the checker's page updates.
- **Lab results locked to the breeder**: the delivery code carries the breeder's
  encryption key; the lab's browser encrypts the report to it and signs its fingerprint;
  the registry stores only the locked file and the signature; the breeder's plant page
  opens it.

Then the examiner's "prove it's distinct" screens, and the company side of signing.

## Open decisions

- Encrypt the backup file with a password? A password can be forgotten (the restore
  failure the research measured). Until decided, steer people to Drive, iCloud or USB as
  well as email. Decide before mainnet.
- Keep or drop the per-record anchor panel's "backup first" rule on the plant page (the
  new flow date-stamps before the backup when the browser keeps storage).
