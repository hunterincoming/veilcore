# Documents kept on this device only (15 Nov 2026)

Status: live on veilcore.org. Built with unit and browser tests and reviewed three times against a
registry that lies. First run on the main network on 16 November 2026: a document sealed with the
choice ticked, dated in a batch, and checked from its check link, file matched byte for byte
(`config/copy.ts` `DEVICE_ONLY_RUN_ON_MAINNET`). Not yet tried there: restoring one from a backup
on a second device, and a passkey copy on a phone.

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
| A code made from the record's key (its identity, and a commitment to its recovery secret) | Midnight, through VeilCore's fee service | Only if the holder presses "date stamp" on the record's page | The key's own date. A stamp that failed is tried again by itself; nothing starts the first one but that button: not sealing, not the background, not a "Do it for me" job |
| The proof code, in a batch's root | Midnight | When the batch is anchored | The date |
| A claim about one number: the record's commitment (a hash), the form's id, which field, and the limit with its direction, or the number itself for "exactly" | Midnight, through VeilCore's fee service | Only if the holder turns on "Prove one number" on that record's page and proves one (see "Proving a number") | The holder's own choice to make that fact public |

Never sent, by any path:

- the title, type, issuer, reference, date, holder, notes, "about" links;
- the files' names, sizes and SHA-256 codes (and, as for every document, the files themselves);
- any numbers typed for a certificate or a batch, to the registry. A number goes to Midnight
  only if the holder proves it "exactly" (see "Proving a number");
- a locked copy of any of the above;
- the mark itself (`deviceOnly`).

`id` is 128 random bits. `recordFingerprint` is the salted proof code. `keyBinding` is a hash of
the record's own key. None is made from what was typed in a way that can be turned back.

The key date stamp was left as the holder's own button, not switched off: it sends nothing
typed, and the page says what it sends before the button. Nothing else starts it. Sealing a
document doesn't (plants start theirs on the log screen). The background only tries again a
stamp that was started and failed. Ask's "Do it for me" jobs leave such a record out
(`ask-job/prepare.ts` `own`, `ask/plan.ts`), and a job that names one all the same stamps
nothing (`ask-job/senders.ts` `sendStamp`). A test runs each of these.

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
   not the expected one (`deviceOnlyConflict`). Nothing of that answer is kept past the load it
   came in, so the warning goes when the registry answers as expected again.

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
  and never uploaded, and the mark is never taken off: an unmarked row for a record kept here
  changes nothing. A marked record that is not a document stops the whole import.
- **The mark is set when a record is sealed, and by nothing after.** A marked row for a record
  this browser knows as an ordinary one (it waits in the send queue, or its locked copy was
  opened or saved here) is refused and counted as not imported. Otherwise a record could be
  shown as "on this device only" while an unmarked copy of it waited to be sent.
- **The send queue never holds one.** Keeping a record on the device, showing it and deleting
  it each take its id out of the queue first; the queue's reader leaves out any id kept on the
  device every time it is read; and the last gate checks again when a save is built.
- **The mark is this browser's word.** A row the registry sends never carries it into the app
  (`api-store.ts` load strips it).
- **Other routes.** Sharing by link (`PUT /api/records/:id/disclosure`), sending to a lab
  (`POST /transfers`), receiving a delivery into it, corrections, taking the registry's "older
  copy", converting a plain row, and licences (`licenses.ts`, for every caller) are refused for
  such a record by id. The lab-signature step is not shown on its page. "Prove one number" is
  shown only after the holder turns it on there (see "Proving a number").
- **The dating row** is built field by field from the three fields above (`sendDatingRows`).

One answer of the registry's is believed, because it can't be made up: a locked box under an id
that this browser's vault key opens. Only the holder's key makes one. A backup file that marks
such a record is not obeyed for it: its locked copy has left, so it stays an ordinary record.

## Named by another record

Added 16 Nov 2026, after a review found the leak. A document's "About" (and a plant's parents)
is sealed into the record that names it. An ordinary record's sealed fields go to the registry
in its locked copy. So an ordinary document "about" a record kept on this device only sent that
record's title and ID to the registry, where a second browser with the holder's keys read them
back.

The rule: **a record that leaves this device can't name a record kept on this device only.**
Only a record that is itself kept here may. It is enforced in the data layer, not only on the
screen (`outbox.ts` `namesDeviceOnly`, by the named record's ID, from this browser's own store):

- `seal-record.ts` `sealDocumentRecord` refuses when told the record will be an ordinary one;
- `records.ts` `createRecord`, `createRecordSaved` and `createRecords` refuse, whoever sealed it;
- the send queue (`putInOutbox`) doesn't take it;
- the last gate (`api-store.ts` `sealForSave`) refuses it and says why;
- a restore doesn't import an ordinary row that names a record kept here, or one the same file
  marks as kept here, and counts it as not imported.

On "Seal a document" such a record is shown in the list but can't be picked until "Keep this
record on this device" is ticked, and the screen says why.

What was looked at beside this, and where a device-only record's name, ID or fields can still go:

- **Licences, lab hand-overs, sharing by link, corrections:** refused for such a record by ID,
  as before. A record that names one can't exist as an ordinary record, so none carries it there.
- **Bulk import:** makes plants and animals with parents; a parent that is a record kept here
  is refused by `createRecords`.
- **Ask:** reads record names in the browser. Its model runs in the browser, and a "Do it for
  me" job leaves such a record out. Nothing of it is sent.
- **A link with its chain:** carries such a record's sealed fields to whoever the holder sends
  the link to. That is the holder's choice; the warning marks those records.
- **The holder's own "About" link:** opens `/verify/<id>`, which sends the ID to the registry
  (which already has it) from the holder's address. Said beside the link.
- **Not caught:** a name typed by hand into another record's title, notes or an "About" entry
  without a link. The app can't tell what free text refers to.

## Proving a number

Added 16 Nov 2026. Until then "Prove one number" was hidden for such a record, because proving
sends something out of the browser. That was a cautious default, not a need: the proof is made
in the browser, and the number and its salt are not sent (`docs/claims-screen.md`).

Now it is the holder's choice, on that record's page:

- **Off every time the page is opened.** The page says what proving would do and shows no way
  to do it until the holder ticks "Show 'Prove one number' for this record". The choice is not
  kept.
- **What would be published is said before the button**, from what is picked: the form, the
  field, the limit and the direction, public and permanent on Midnight; the number itself is not
  published for "at most" and "at least", and is for "exactly"; each limit proved narrows the
  number; the number is what the holder typed, not what a lab measured.
- **"Exactly" is asked for twice.** It publishes a number that has never left the device, so
  the button stays off until a second box is ticked, and the claim call refuses without it
  (`prove-number.ts` `proveNumber`).

**What VeilCore can tell from a claim.** A claim names the record's commitment. The record's
proof code is made from that commitment and its key binding (`claim-link.ts`), and the registry
holds both the proof code and the key binding, beside the holder key that sent them. So VeilCore
can match a public claim to the registry's row for this record and to that holder key, and learn,
say, that this holder's record is a grow batch with at most so many plants (or the number, for
"exactly"). Anyone who has the record's check link can match the claim to the record too.
"Nothing is sent to the registry" is true and is not the whole of it, so the page says both,
before the choice and again before the button: what you prove is public on Midnight in a way
that VeilCore, and anyone who has this record's check link, can tie to this record, and VeilCore
can also tie it to the holder key that dated the record. The same is true of a claim from any
record, and the same sentence is on every "Prove one number" panel.

The call itself (`prove-number.ts` `proveNumber`) refuses a record kept on this device only
unless proving is switched on for such records and the holder turned it on, and refuses
"exactly" without its second confirmation. The page is not the only guard.

Every request a claim makes:

| Request | To whom | What it carries |
|---|---|---|
| The claims contract's state | Midnight's indexer (through VeilCore's relay where the build uses one) | The claims contract's address. Nothing of the record |
| The proving files | This website's own host | The circuit's name |
| The proved transaction | VeilCore's fee service (the sponsor), which pays the fee and passes it to Midnight | What becomes public: the record's commitment, the form's id, the slot, and the limit with its direction or, for "exactly", the number. Not the other numbers, not the salts, nothing else typed |
| Waiting for it to be included | Midnight's indexer | The transaction's id |
| **The registry** | | **Nothing.** The claim is kept on this device's copy of the record, which is never uploaded |

The record's page then says that facts were proved and are public, and no longer says that
nothing typed was sent to VeilCore: it says none of it went to VeilCore's registry.

Limits: the list of claims made (their links) lives on this device's copy and goes into the next
backup; a backup saved before a claim doesn't list it, though the claim itself stays on
Midnight. Not yet tried on a network: `config/copy.ts` `DEVICE_ONLY_CLAIMS_RUN_ON_MAINNET` is
off, and the "what's live where" row says "built, not yet tried".

## The backup

The record's only other copy is a backup file saved **after** it was sealed.

- Sealing one leads straight to the save-and-check backup step, before the record's page.
- Each such record is tracked: in a checked backup or not (`veilcore.device-only-backup.v1`,
  by id and proof code). Until it is, its page and its card say "not in a backup yet" and that
  this browser holds the only copy.
- The backup check (`checkBackup`) refuses a file that doesn't hold every one of them as it is
  now. A backup saved earlier fails it.
- A backup that would leave a readable one out is not made. The reason is shown; no file is
  saved without them. (An entry that can't be read is another matter: see "A damaged entry".)
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

## A damaged entry

If an entry in the device-only store can't be read as a record (damaged storage), it stops
nothing. The backup is made as usual and carries the entry exactly as stored
(`deviceOnlyUnreadable`), and the backup step says one record couldn't be read. Other records'
saves go on. Home lists the entry by its id, with "Save the entry to a file" and "Delete it
from this device". A restore puts the entry back as it was, unless it reads as a record after
all or its id is a record this browser knows as an ordinary one (a hand-made file can't mark a
record that way). It is never sent: its id is still
kept on the device, readable or not.

## Deleting one

"Delete from this device", on the record's page, after a warning. The record and its keys go
from this browser, and anything under its id is taken out of the send queue first. Nothing is
sent. What stays elsewhere, and the warning says so: the registry keeps what it was sent when
the record was sealed (the id, the proof code, the key binding), so the date still stands for
anyone holding the check link; a passkey copy still holds its id and keys until that copy is
updated; a key stamp, if one was made, stays on Midnight; a backup file that holds the record
still holds it.

## Limits

- **Clear the browser's data with no backup that holds it and the record is gone.** VeilCore
  has nothing to give back but the fact that a proof code was dated.
- **Switching it on later is not possible.** A record whose locked copy was saved has already
  left the device; marking it would be false.
- **Switching it off later is not offered.** Uploading the locked copy afterwards can't be
  undone, and one wrong click would break the rule the holder chose this for. To have a copy on
  VeilCore, seal the document again without the choice. (It gets a new date.)
- **No corrections** of such a record, for now: seal a new one.
- **"Prove one number" is off unless the holder turns it on** for that record, each time. What
  is proved is public on Midnight for good and can't be taken back.
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
  the device, and no request but the dating row carries anything. Then the same with every
  route lying at once (rows, the dating answer, proofs, evidence, sharing choices, agreements,
  deliveries) and any unexpected route refused and counted. Also: a marked record that is not
  a document stops an import; the bulk and awaited paths refuse the mark; a marked row for a
  record in the send queue is refused; a copy left in the queue is purged and deleting uploads
  nothing; an unmarked row never clears the mark.
- `bboard-ui/src/veilcore/device-only-backup.test.ts`: a backup saved before sealing doesn't
  count and is refused by the check; a damaged entry doesn't block the backup or another
  record's upload, and is carried raw, listed, restored and deletable; a passkey copy made and
  read back for real (what it holds, and that a restore from it brings keys, not the record);
  deleting from the device; licences; and that neither the background nor a "Do it for me" job
  stamps the key (each is run, with the stamp itself watched).
- `bboard-ui/e2e/device-only-document.spec.ts` (a real browser against the stand-in registry):
  seals one with the vault key already backed up, sees "not in a backup yet" until a backup is
  saved and checked, checks the stand-in was sent the dating row and nothing else, that the
  check link verifies in a browser with nothing in it, and deletes it from the device.
- `bboard-ui/src/veilcore/device-only-claims.test.ts` (the registry deny-by-default: every
  request kept, an unexpected route refused and counted; the claim call a stand-in that keeps
  what it is given): the panel is off by default and the page shows no way to prove; turned on,
  it says what would be published; "exactly" needs its second confirmation, on the page and in
  the call; a range claim and an exact one are made, and no request to the registry carries
  anything typed, the numbers' secret, the claim, its commitment or its transaction, and nothing
  but reads follow; the claims are kept on the device's copy; an ordinary document proves as
  before. Not covered here: the real claim call, whose own test (`chain/claims-call.test.ts`)
  shows the number and its salt are not in the transaction.
- `bboard-ui/src/i18n/copy-truth.test.ts`: the "what's live where" row, the privacy note, and
  the sentences that say what leaves the device.
