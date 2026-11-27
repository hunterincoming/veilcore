# Backup restore drill

A backup nobody has restored is a hope, not a backup. This drill proves that a holder gets
everything back from the backup file alone, on a device with nothing on it. Part of it runs by
itself on every change; part of it is a 10-minute check a founder does by hand on a real phone
and laptop.

## What runs by itself (on every change)

Two tests, both in `bboard-ui`. Either one fails if anything stops coming back.

**`src/veilcore/restore-drill.test.ts`** (unit tests, `npx vitest run src/veilcore/restore-drill.test.ts`).
The app's own code, in several pretend browsers against a stand-in registry:

- One browser makes a representative set: a plant, an animal, a child plant that names the
  plant as its parent, a document with numbers that a lab signed and a claim was made on, a
  document kept on this device only, a DNA report paired with the plant (and the pairing on
  chain), the plant's date stamp, a lab's own signing key (in a lab's browser), and a license
  on the plant whose royalty report is settled between two browsers (the licensee reports and
  says "I paid", the licensor confirms it was received).
- Each saves a backup with a password. A browser with nothing in it restores from that file.
- Everything is compared byte for byte: the holder key, the vault key, every record's keys
  (with its date stamp and DNA pairing), every record's fields, the lab signature and its
  Midnight call, the claim, the license and its keys, the licensee's license secret, the lab's
  signing key.
- Then it is used: every record's proof code recomputes, every record's key still matches the
  key the record names, every inclusion proof in the file folds to its batch root, the lab
  signature still checks against the record, the licensor and the licensee both read the whole
  deal and send a new message with the restored keys, and the restored lab key is the one that
  signed.
- With the registry gone: the file alone brings back every record, key, lab signature and
  claim. The license is the one gap (below).
- The two dates that don't depend on Midnight (from 26 Nov): the stand-in registry stamps the
  batch root on Bitcoin (an OpenTimestamps file, pending at first) and with a local
  timestamp authority (RFC 3161, made with openssl), and gives each record's proof code a token
  of its own. The file carries all of them (`stamps`). Restored with the registry gone, they
  are *carried* on the new device (kept apart from what the registry gives, `src/veilcore/stamps.ts`),
  and the evidence bundle made there still carries `root.bin.ots` and `root.tst`:
  `verify.html`'s own reader reads the Bitcoin file against the batch root, and the SDK and
  `openssl ts -verify` (the bundle README's step) both pass the token. README.txt,
  EXAMINER-SUMMARY.html, evidence.json and verify.html's own code all say the batch data is
  from a backup file and not yet confirmed, and none says our registry reported it. A backup
  made there, still without the registry, carries all of it forward (`stamps.carried`), nothing
  in `proofs`; the first backup with the registry back fills the registry's part again.
- A pending Bitcoin stamp is kept, the next backup takes the finished one once the registry
  has it, and neither a registry serving the pending one again nor an older file takes the
  finished one away.
- Doctored stamps are refused (no stamp is counted, the bundle has none, no later backup carries
  them): another batch's files under this batch (with its own root, or said to start from this
  root), this batch's files under another batch's name, a changed token or Bitcoin file, one
  record's token moved onto another record, a token from a timestamp authority the site doesn't
  pin, a pinned authority's token outside its certificate's dates, and Bitcoin files padded past
  16 KB. A file naming the records under hundreds of batches, or with proofs for codes not held
  here, adds at most two batches per record.
- Made-up files (reviews of PR #233; proof codes are public, so anyone can build one):
  - on the original device, a made-up file changes nothing the registry gave: the bundle still
    has the registry's root and finished stamp;
  - on a new device with the registry gone, a made-up file restored after the genuine one never
    blocks or drops it: the restore page says the backup files disagree, the bundle shows the
    newest root and the other beside it (`proof/alternative-1`), labelled, the next backup carries
    both, restoring the genuine file again puts it first, and once the registry is back its
    answer is the one used;
  - two made-up files can't push out the genuine one restored after them, and at most two roots
    are carried per batch, the newest kept;
  - flags in a file saying its data is confirmed change nothing;
  - a made-up root for a record whose batch the registry gave is shown with the registry's root
    beside it;
  - if the registry later gives another root for a sealed batch, the first root and its
    finished Bitcoin stamp stay, the new answer is carried, and the backup page warns.
- Kept stamps go only when their record is deleted on that browser, not when a record is missing
  from one backup.
- A wrong password, no password, a cut-off file and a changed file are all refused, and nothing
  is written. A file with a record that was edited after sealing puts back none of the records
  (all or nothing) and says why; the keys come back.
- Restoring the same file twice adds nothing.
- A record made while the registry was out of reach (still waiting to be saved) is in the file
  and comes back.
- The file opens without the website: the evidence bundle's offline checks (`verify.html`'s own
  code) recompute every record in it, and `npx veilcore-records backup` and `deal` read it with
  the password.
- Every storage name the site uses (`veilcore.` names anywhere; `veilcore-` and `veilcore:` names
  in files that touch browser storage, such as the offline worker's IndexedDB `veilcore-offline`)
  is listed as either carried in the backup or not needed after a restore, with the reason. A new
  one fails the test until someone decides which.

**`e2e/backup-restore-drill.spec.ts`** (browser test, `npm run e2e:build` then
`npx playwright test e2e/backup-restore-drill.spec.ts`). The same in a real browser, through the
real pages: the plant is logged on the real log page, both backups are saved on the real backup
page with a password, and every restore goes through the real restore page. It also checks, in
the browser: the wrong-password and cut-off-file messages, that the restored record page opens
its locked details, that the check page finds the record and its name, and that a prove link
finds the key to answer with (before the restore the same link says there's nothing here to
prove with). The rest of the set is made on a test-only page that is never in a real build
(`src/e2e-fixtures/RestoreDrillFixture.tsx`), because a browser test can't get a real lab's
signature or a real license on chain.

Both were checked to fail when restore is broken on purpose (licenses held left out of the
restore, and lab signatures left out), then put back. The stamp tests were checked the same way
on the design as it is now (26 Nov, after the third review of PR #233), one break at a time:
a restore writing into the registry's part, carried data left out of the file, the two-roots-
per-batch cap off, the newest item evicted instead of the oldest, 64 KB files allowed from a
file, a registry root change overwriting the first, the bundle using the oldest carried item,
no alternatives in the bundle, unpinned tokens taken, certificate dates ignored, a disagreement
not reported, no pruning on delete, README not labelled, and verify.html not reading the source.
Each made at least one test fail. Not tested: the 512 KB budget itself, which the other caps keep
real files well under.

## What the drill found (26 Nov 2026)

Fixed in the same change:

1. **A record's lab signature, the Midnight call that published it, and the claims made on its
   numbers were not in the backup file.** With VeilCore's registry there, they came back from
   the registry; with it gone, the record came back without them. The file now carries them
   (`heldEvidence`), and a restore puts each one back only onto its own record and only once it
   checks against that record (`src/veilcore/held-evidence.ts`).
2. **A licensee's backup that holds a license but no records said "Nothing new in that file."**
   The license had come back. The restore page now says "Restored."

3. (Foundation review, 26 Nov.) **The Bitcoin stamp files and RFC 3161 tokens were not in the
   file.** With the registry and its backups gone, a holder kept only the Midnight date. The
   file now carries them (`stamps`). The browser keeps what the registry gave; what a restored
   file brings is carried apart, checked for form, capped, and labelled as not confirmed
   wherever it is used (`src/veilcore/stamps.ts`).

Known gaps, not fixed here:

4. **The license itself (terms, state, royalty log) is not in the file.** It lives on VeilCore's
   registry. The file has the license's keys and every signed message of the deal
   (`dealRecords`, checkable with `npx veilcore-records deal <file>`), so the history survives,
   but with the registry gone the app can't show the license from the file. Carrying it means
   restoring agreements the way records are restored (each checked, none overwriting one already
   there); that is a design change of its own.
5. **`npx veilcore-records backup` (version 0.18.1) reports a document with sealed numbers as
   "DOES NOT MATCH".** Its fingerprint leaves out the field-set step of SPEC 4.5, which the app
   and `verify.html` both do. The record is fine (the drill checks it with `verify.html`'s code).
   The fix is in `veilcore-sdk` (`computeRecordFingerprint` in the published package), not in
   this repository. The drill expects exactly this one failure, so a fixed version makes it fail
   and the line gets updated.
6. **`npx veilcore-records backup` doesn't read `stamps` yet.** The files are in the backup as
   the registry served them (base64 `.ots` and `.tst`), and the app checks them on restore;
   checking them from the command line is a change for `veilcore-sdk`.
7. **An evidence bundle made with the registry gone has no lab signatures the registry
   serves** (no `lab/signatures.json`, and `evidence.json` says the bundle was made from the
   browser's copy). The record's own lab signature still comes back onto the record.
8. Small things a new device doesn't get, by design or for later: payment partner keys a checker
   named, records a checker watches, remembered spreadsheet column layouts, and which spreadsheet
   rows were already sealed. None of them is a holder's record or key.

## The 10-minute manual drill (by hand, a real phone and laptop)

Not done yet. Do it once before showing VeilCore to anyone new, then once a quarter. It checks what a test can't:
a real phone, real downloads, a real password typed by a person.

You need: your laptop, your phone, and 10 minutes. Use a practice record (put "(test data)" in
its name). Don't use your real records' browser for the restore: the phone browser in step 4
must have never opened VeilCore.

1. **Laptop: make a practice record.** Open veilcore.org, log a plant named
   "Drill (test data) <today's date>". Wait until it shows as saved.
2. **Laptop: save a backup with a password.** Open veilcore.org/backup (or Settings →
   "Download a copy"). Leave "Lock it with a password (suggested)" on, type a password you will remember for the next 10 minutes, save the file, then "Open my
   saved copy" and type the password. It must say "It works."
3. **Get the file to the phone** the way a real person would: AirDrop, email it to yourself, or
   a cloud drive. Note which.
4. **Phone: a browser with nothing in it.** Use a browser you don't use for VeilCore, or a
   private tab. Open veilcore.org/restore.
5. **Wrong password first.** Tap "Open my backup file", pick the file, type a wrong password
   under "The backup's password" and tap "Open it". It must say "That password doesn't open
   this backup. Nothing was changed."
6. **Right password.** Tap "Open my backup file" again, pick the file, type the right password
   and tap "Open it". It must show when the
   backup was made and how many records it holds. Tap "Bring them here". It must say "Your
   records are back."
7. **Phone: open the record.** It must show its name and details (not "This record is locked").
   Tap "Open check page": it must find the record and say the name matches.
8. **Prove by link (optional, 2 more minutes).** On the laptop, in a private window, open the
   record's check page and make a link to ask for proof. Open that link on the phone. It must
   offer "Prove it". You don't have to send it.
9. **Clean up.** Close the private tab (or clear the site's data in that browser) and delete the
   copy of the file you sent yourself, if it went by email.

### What to record

Write one file, `docs/log/backup-drill-<date>.md`, with:

- the date, and who did it;
- the laptop and its browser, the phone and its browser (and its version);
- how the file got to the phone;
- the file's name and size, and the number of records the restore page said it holds;
- for each of steps 2 and 5 to 8: passed or not, in a word, and what the screen said if not;
- how long it took, start to finish;
- anything confusing, even if it worked.

If a step fails, stop and write down exactly what the screen said. Don't clear anything first.
