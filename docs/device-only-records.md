# Documents kept on this device only (15 Nov 2026)

Status: built, with unit and browser tests, and reviewed once against a registry that lies. Not yet run on the main network; the site says so
until it has (`config/copy.ts` `DEVICE_ONLY_RUN_ON_MAINNET`).

## What it is

A choice on "Seal a document" (`/documents/new`), off unless the holder ticks it:
**Keep this record on this device and in my backup only.**

A document sealed that way is dated like any record. Its fields stay in the holder's browser and
backup file. VeilCore's server is never sent them, locked or not.

## Why

Normally the browser sends two things when a record is sealed:

1. the proof code alone (`PUT /api/records/dating`, "dating first", CONTRACT.md #38), then
2. a locked copy of the typed fields (`PUT /api/records`, AES-256-GCM, the key never sent).

The locked copy is what lets a holder get their records back on a new device from the vault key
alone. Some holders work under a rule that nothing they type may leave their own computer, even
locked. For them step 2 must never happen. The registry already keeps and batches a proof code
that never gets a locked copy, so this needed no change to the registry, the contracts or the
sponsor.

## Why documents only

A document's check link carries its sealed fields after the `#`. The checker's browser works the
proof code out again from them and looks its date up by proof code. Nothing in that needs the
registry to hold the record.

Other kinds of record lean on the locked copy the registry keeps: check pages that show chosen
values, handing a sample to a lab, licences, corrections. They are not offered this choice.
`createRecord` refuses the mark on anything but a document.

## What is sent, and what is not

"Nothing you type is sent" is the promise. It is not "nothing is sent". Everything that leaves
the device for such a record:

| What leaves | To whom | When | Why |
|---|---|---|---|
| `{ id, recordFingerprint, keyBinding }` (`PUT /api/records/dating`) | VeilCore's registry | Once, when sealed (tried again until it arrives) | So the proof code goes into the next batch and gets its date |
| The holder key, in a header | The registry | With that request and with every read | To find the holder's rows |
| The record id or the proof code, in the address of reads (`GET /records/:id/evidence`, `GET /proof/:code`) | The registry | When the holder opens the record or downloads its evidence bundle | To fetch the batch's inclusion proof |
| The network address and the time of each of those requests | The registry and its host | Always, as with any request | Not kept in a request log (the registry writes none), but seen |
| The record's id and its keys, inside the passkey copy, locked with a key only the passkey makes | The registry (`/vault`) | Only if the holder keeps a passkey copy (where the build offers one) | The passkey copy is the keys of every record. It never holds a record's contents, so it can't bring this record back |
| A code made from the record's key (its identity, and a commitment to its recovery secret) | Midnight, through VeilCore's fee service | Only if the holder presses "date stamp" on the record's page | The key's own date. A stamp that failed is tried again by itself; nothing starts the first one but the button |
| The proof code, in a batch's root | Midnight | When the batch is anchored | The date |

Never sent, by any path:

- the title, type, issuer, reference, date, holder, notes, "about" links;
- the files' names, sizes and SHA-256 codes (and, as for every document, the files themselves);
- any numbers typed for a certificate;
- a locked copy of any of the above;
- the mark itself (`deviceOnly`).

`id` is 128 random bits. `recordFingerprint` is the salted proof code. `keyBinding` is a hash of
the record's own key. None is made from what was typed in a way that can be turned back.

The key date stamp was left as the holder's own button, not switched off: it sends nothing
typed, it is never started for a document by sealing it (plants start theirs on the log screen;
`DocumentNew` does not), and the page says what it sends before the button. A test holds both.

## Fail closed

Two rules, applied everywhere:

1. **When unsure whether a record is kept on this device only, it is not sent.** The test is
   `outbox.ts` `neverSend`: the record carries the mark, **or** its id is in this browser's own
   store. A row in any other shape under such an id is not sent either.
2. **The registry's answer about such a record changes nothing.** The registry should hold its
   proof code and nothing else. Whatever it answers instead (an emptied row, a locked box, a
   plain row, another proof code, a claim's stub, nothing), this device's copy is what is shown
   and what goes in the backup. The registry's row is never merged into it, never shown in its
   place, never a reason to send or to take the mark off. The record's page says the answer was
   not the expected one (`deviceOnlyConflict`).

How:

- **Its own store.** It is kept under `veilcore.device-only.v1` in the browser, per holder key.
  It is never put in the outbox (`veilcore.outbox.v1`), the queue of records waiting to be
  sent. A tab still running an older build of the site sends whatever is in that queue, and
  knows nothing about this key. `putInOutbox` drops such a record whoever calls it.
- **Every save of the record set** goes through `records.ts` `saveRecords`, which takes them
  out first. That covers the first save, the sync, the save after a change, the saves held for
  a backup, the retry after being offline, and a restore.
- **The last gate.** `api-store.ts` `sealForSave` builds every `PUT /api/records` body. Its
  first check, before it looks at anything the registry said about the row, skips such a record:
  not sealed, not sent, not counted as held.
- **A restore** (`importRecordRows`) puts a marked record into this device's store and nowhere
  else, decided from the file and this browser alone. It is never put back over a registry row
  and never uploaded, and the mark is never taken off. A marked record that is not a document
  stops the whole import.
- **The mark is this browser's word.** A row the registry sends never carries it into the app
  (`api-store.ts` load strips it).
- **Other routes.** Sharing by link (`PUT /api/records/:id/disclosure`), sending to a lab
  (`POST /transfers`), receiving a delivery into it, corrections, taking the registry's "older
  copy", converting a plain row, and licences (`licenses.ts`, for every caller) are refused for
  such a record by id. "Prove one number" and the lab-signature step are not shown on its page.
- **The dating row** is built field by field from the three fields above (`sendDatingRows`).

One answer of the registry's is believed, because it can't be made up: a locked box under an id
that this browser's vault key opens. Only the holder's key makes one. A backup file that marks
such a record is not obeyed for it: its locked copy has left, so it stays an ordinary record.

## The backup

The record's only other copy is a backup file saved **after** it was sealed.

- Sealing one leads straight to the save-and-check backup step, before the record's page.
- Each such record is tracked: in a checked backup or not (`veilcore.device-only-backup.v1`,
  by id and proof code). Until it is, its page and its card say "not in a backup yet" and that
  this browser holds the only copy.
- The backup check (`checkBackup`) refuses a file that doesn't hold every one of them as it is
  now. A backup saved earlier fails it.
- A backup that can't hold them is not made. The reason is shown; no file is saved without them.
- The file carries the record whole (`recordData`), with its document details and the mark,
  and its inclusion proof once it is in a batch. Restoring it on another browser puts the
  record under `veilcore.device-only.v1` there and sends nothing but, if the registry doesn't
  have it, the dating row.
- **The passkey copy does not hold it.** That copy lives on the registry, so it carries keys
  only. It holds this record's id and keys (locked), never its contents. The wording says so.

This fixed a gap on the way: the backup's `recordData` left out a document's own details
(`document`, `fieldSchema`, `fieldSetRoot`, `fieldSet`), so a document could not be put back
from the file alone. They are in it now, for every document.

## What the holder is told

Before choosing, on the sealing screen: nothing typed is sent, and exactly what is (the id, the
proof code, the key binding); VeilCore's server can't give the record back; the only copies are
this browser's and a backup saved after sealing, not an earlier one and not a passkey copy;
anyone with the check link and the file can still check it; the choice can't be changed after.

On the record's page: "Kept on this device only"; whether it is in a checked backup; what has
left the device; what the key date stamp would send; and, if the registry answered with
anything but the proof code, that it did. On "Your records": "On this device only", with "not
in a backup yet" until it is. Never "locked copy not uploaded yet".

All of it in English, German, Spanish, French and Japanese.

## Deleting one

"Delete from this device", on the record's page, after a warning. The record and its keys go
from this browser. Nothing is sent. The registry keeps what it was sent when the record was
sealed (the id, the proof code, the key binding), so the date still stands for anyone holding
the check link. A backup file that holds the record still holds it.

## Limits

- **Clear the browser's data with no backup that holds it and the record is gone.** VeilCore
  has nothing to give back but the fact that a proof code was dated.
- **Switching it on later is not possible.** A record whose locked copy was saved has already
  left the device; marking it would be false.
- **Switching it off later is not offered.** Uploading the locked copy afterwards can't be
  undone, and one wrong click would break the rule the holder chose this for. To have a copy on
  VeilCore, seal the document again without the choice. (It gets a new date.)
- **No corrections** of such a record, for now: seal a new one.
- **No "prove one number"** for such a record: proving sends details out of the browser.
- **A hand-edited backup file** with the mark taken out restores as an ordinary record, which
  is uploaded. The file is the holder's own; the app doesn't edit it.
- **Another browser with the same holder key and no backup** sees nothing for this record: the
  registry's row is only a proof code.
- **The dating row can't be taken back** from the registry by the app. It is an id, a proof
  code and a key binding.
- **A registry that shows rows locked with another key can stop a restore**, for every record,
  as before. It can't make the restore upload anything.
- The promise is about what the app sends. The check link shows the record's fields to whoever
  the holder sends it to; that is the holder's choice each time.

## How it was tested

- `bboard-ui/src/veilcore/device-only.test.ts` (unit, against the in-memory registry with the
  real one's rules; it reads back every request sent): sealing; the saves held for a backup
  going out; reload and repeated syncs; a change to the record; sharing, sending and correcting
  refused; sealed while offline, then the retry; a save handed the record directly; the backup
  file round trip and a restore into an empty browser; the registry gone after a restore; the
  mark refused on a plant; and an ordinary document still saved exactly as before.
- `bboard-ui/src/veilcore/device-only-dishonest.test.ts`, with
  `fixtures/dishonest-registry.ts`: the registry empties the row (the purge), then for each of
  six other answers (emptied, a locked box, a plain row, another proof code, a claim's stub,
  nothing): the device copy is shown, is in the next backup, a restore elsewhere keeps it on
  the device, and no request but the dating row carries anything. Also: a marked record that
  is not a document stops an import, and the bulk and awaited paths refuse the mark.
- `bboard-ui/src/veilcore/device-only-backup.test.ts`: a backup saved before sealing doesn't
  count and is refused by the check; a backup that can't hold the record isn't made; what the
  passkey copy holds; deleting from the device; licences; the key date stamp.
- `bboard-ui/e2e/device-only-document.spec.ts` (a real browser against the stand-in registry):
  seals one with the vault key already backed up, sees "not in a backup yet" until a backup is
  saved and checked, checks the stand-in was sent the dating row and nothing else, that the
  check link verifies in a browser with nothing in it, and deletes it from the device.
- `bboard-ui/src/i18n/copy-truth.test.ts`: the "what's live where" row, the privacy note, and
  the sentences that say what leaves the device.
