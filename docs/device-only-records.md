# Documents kept on this device only (15 Nov 2026)

Status: built, with unit and browser tests. Not yet run on the main network; the site says so
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

For a document kept on this device only, VeilCore's server is sent:

| Sent | When | Why |
|---|---|---|
| `{ id, recordFingerprint, keyBinding }` to `PUT /api/records/dating` | Once, when sealed (tried again until it arrives) | So the proof code goes into the next batch and gets its date |
| The holder key, in a header | With that request and with reads | To find the holder's rows |
| The record id, in the address of reads (`GET /records/:id/evidence`, `GET /proof/:code`) | When the holder opens the record or downloads its evidence bundle | To fetch the batch's inclusion proof |

Never sent, by any path:

- the title, type, issuer, reference, date, holder, notes, "about" links;
- the files' names, sizes and SHA-256 codes (and, as for every document, the files themselves);
- any numbers typed for a certificate;
- a locked copy of any of the above;
- the mark itself (`deviceOnly`).

`id` is 128 random bits. `recordFingerprint` is the salted proof code. `keyBinding` is a hash of
the record's own key. None is made from what was typed in a way that can be turned back.

## How it is kept from leaving

The record carries `deviceOnly: true`, set once when it is made.

- **Its own store.** It is kept under `veilcore.device-only.v1` in the browser, per holder key.
  It is never put in the outbox (`veilcore.outbox.v1`), which is the queue of records waiting to
  be sent. A tab still running an older build of the site sends whatever is in that queue, and
  knows nothing about this key. `putInOutbox` drops a marked record whoever calls it.
- **Every save of the record set** goes through `records.ts` `saveRecords`, which takes marked
  records out first. That covers the first save, the sync, the save after a change, the saves
  held for a backup, the retry after being offline, and a restore.
- **The last gate.** `api-store.ts` `sealForSave` builds every `PUT /api/records` body. It skips
  a marked record, so it is neither sealed, sent, nor counted as held.
- **Other routes.** Sharing by link (`PUT /api/records/:id/disclosure`), sending to a lab
  (`POST /transfers`) and corrections are refused for a marked record. A licence can't be
  started from one. "Prove one number" and the lab-signature step are not shown on its page.
- **The dating row** is built field by field from the three fields above (`sendDatingRows`).

## What the holder is told

Before choosing, on the sealing screen: nothing typed is sent, only the proof code; VeilCore's
server can't give the record back; the backup file is the only copy besides this browser; anyone
with the check link and the file can still check it; the choice can't be changed after.

On the record's page: "Kept on this device only", the same facts, and a button to save a backup.
On "Your records": "On this device only", never "locked copy not uploaded yet".

All of it in English, German, Spanish, French and Japanese.

## Backup and restore

The backup file carries the record whole (`recordData`), with its document details and the
mark, and its inclusion proof once it is in a batch. Restoring it on another browser puts the
record back under `veilcore.device-only.v1` there and sends nothing: the registry already has
the proof code.

This fixed a gap on the way: the backup's `recordData` left out a document's own details
(`document`, `fieldSchema`, `fieldSetRoot`, `fieldSet`), so a document could not be put back
from the file alone. They are in it now, for every document.

## Limits

- **Clear the browser's data with no backup and the record is gone.** VeilCore has nothing to
  give back but the fact that a proof code was dated.
- **Switching it on later is not possible.** A record whose locked copy was saved has already
  left the device; marking it would be false. An import that names such a record with the mark
  changes nothing.
- **Switching it off later is not offered.** Uploading the locked copy afterwards can't be
  undone, and one wrong click would break the rule the holder chose this for. To have a copy on
  VeilCore, seal the document again without the choice. (It gets a new date.)
- **No corrections** of such a record, for now: seal a new one.
- **No "prove one number"** for such a record: proving sends details out of the browser.
- **A hand-edited backup file** with the mark taken out restores as an ordinary record, which
  is uploaded. The file is the holder's own; the app doesn't edit it.
- **Another browser with the same holder key and no backup** sees nothing for this record: the
  registry's row is only a proof code.
- The promise is about VeilCore's server. The check link shows the record's fields to whoever
  the holder sends it to; that is the holder's choice each time.

## How it was tested

- `bboard-ui/src/veilcore/device-only.test.ts` (unit, against the in-memory registry with the
  real one's rules; it reads back every request sent): sealing; the saves held for a backup
  going out; reload and repeated syncs; a change to the record; sharing, sending and correcting
  refused; sealed while offline, then the retry; a save handed the record directly; the backup
  file round trip and a restore into an empty browser; the registry gone after a restore; the
  mark refused on a plant and ignored for a record already uploaded; and an ordinary document
  still saved exactly as before. With both gates switched off by hand, five of these fail.
- `bboard-ui/e2e/device-only-document.spec.ts` (a real browser against the stand-in registry):
  seals one with the vault key already backed up, and checks the stand-in was sent the dating
  row and nothing else, then that the check link verifies in a browser with nothing in it.
- `bboard-ui/src/i18n/copy-truth.test.ts`: the "what's live where" row and the privacy note.
