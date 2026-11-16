# A production chain as document records (16 Nov 2026)

Status: built, with unit tests and a browser test against the stand-in registry. Not yet run on
the test network or the main network; the site says so until it has (`config/copy.ts`
`DOCUMENT_CHAIN_RUN_ON_MAINNET`, and the "what's live where" row).

## What it is

A holder records the steps of a production run as separate records, each naming the one before:

    source record  <-  grow batch  <-  harvest lot  <-  lab report
    (a plant or        (a document)    (a document)     (a document)
     strain record)

Each is dated on its own, like any record. A third party handed the link can open each record's
page from the one after it and see each one's date.

Nothing was added to the record format, the registry, the contracts or the sponsor:

- The link is the document profile's own `about` field (`{ name, recordId? }`, up to 20, sealed
  with the record: SPEC 11.11). It already took any record id. Only the picker on "Seal a
  document" left documents out; it no longer does.
- A grow batch and a harvest lot are document records of type `other` with a field set (SPEC
  4.5) under one of two new published forms. Which kind a record is, is read back from its
  sealed schema id (`bboard-ui/src/veilcore/document-kind.ts`). No type was added: the list of
  eight is fixed.
- The lab report is an ordinary document record (type `lab-report` or `certificate-of-analysis`),
  exactly as before, with "About" set to the lot.

## The two forms

New files, new ids. Existing forms are untouched. A form is permanent once a record is sealed
under it; a change is a new file with a new version.

| Form | File | Slots | Schema id |
|---|---|---|---|
| `veilcore/schema/grow-batch/v1` | `bboard-ui/public/schemas/grow-batch-v1.json` | 0 `growBatch.plants` (whole number), 1 `growBatch.plantsInFlower` (whole number), 2 `growBatch.areaSquareMetres` (m², two decimals: scale 100) | `7097171519711309010fd94b067495aea1daedea497e32dce477b77a6c08f4e6` |
| `veilcore/schema/harvest-lot/v1` | `bboard-ui/public/schemas/harvest-lot-v1.json` | 0 `harvestLot.plantsHarvested` (whole number), 1 `harvestLot.wetWeightGrams` (whole grams), 2 `harvestLot.dryWeightGrams` (whole grams) | `0646b5804dc25df288b5711689470b0b4e38562189e69562e2d0fe47b97edf19` |

The numbers are what the holder typed. Nobody measured them for the holder, and each form's
title says so. They are sealed so that one can be proved later ("at most 100 plants") without
showing the others (`docs/claims-screen.md`). Each range proof makes a limit public, and several
proofs about one number narrow it.

Counts and weights go in the field set and nowhere else: not in the title, not in the notes
(SPEC 4.5: a value in a field set shall not also be in the committed fields). The screen says
so; it cannot check free text.

## Sealing one

"Seal a document" (`/documents/new`) starts with three choices: **Grow batch**, **Harvest lot**,
**Any other document**. The first two are the same screen with:

- the form already chosen, and its three numbers;
- the reference field named "Batch ID" or "Lot ID" (required);
- the date;
- a site label and a variety, which go into the notes as two lines ("Site: …", "Variety: …");
- "What it's about": the source record for a batch, the batch for a lot;
- a title that defaults to the kind and the ID ("Grow batch B-0042").

### The file

A document record needs at least one file. That rule is not weakened. Two ways to meet it:

1. **The holder's own batch sheet** (the default, and the better one). It dates a working
   document the holder already keeps, so the record shows more than the typed fields do.
2. **A sheet made in the browser**, for a holder with no file. Plain text, from the ID, date,
   site, variety, holder and the names under "About". It holds no count and no weight. The same
   details give the same bytes on any device and in any language
   (`document-chain.ts` `batchSheetText`: fixed labels, NFC, one line each, line feeds, UTF-8).
   It is saved to the device when made, and the holder is told to keep it: the file is needed
   for "Is this the same file?".

Which is safer: the holder's own file is stronger evidence, since it existed apart from this
app. The made sheet adds nothing the sealed fields don't already say; what it does is let a
holder with no file seal a record at all, and it can be made again from the same details if
it is lost. It is offered second, and worded as the fallback.

## What a link shows, and what it does not

- **`about` is the holder's statement.** It is sealed with the record, so it can't be changed
  after the record's date. Neither VeilCore nor Midnight checks it against the record it names.
- **It names a record by its ID, not by its proof code.** Nothing in the sealed fields ties
  that ID to a proof code. On a check page, which record an ID is comes from one of two places:
  the link's sender (who put the record in the link), or the registry (which reports the proof
  code it holds for an ID). Neither is a check by Midnight.
- **A chain is only as strong as each link's own date and proof code.** Each record shows prior
  possession of its own file and fields by its own date. The chain adds the holder's sealed
  statement of how they relate; it does not show that the lot came from the batch.
- **The numbers are the holder's.** A claim about one proves what was sealed, not what was true.
- **A record can't be about itself**, and a chain view that meets records naming each other
  lists each once and stops.

This limit is in the profile's version 1, which is final. A later version could add the named
record's proof code to an `about` entry; that would be a new profile, not a change to this one.

## Following a chain

### From a check link

The ordinary link ("Copy link: proves you had this file") is byte for byte what it was. On its
check page each "About" entry that names a record is now a link to that record's public check
page, `/verify/<record id>`. Without a proof code in the address that page words everything as
the registry's report and ticks nothing, and the document's page says so and says to ask the
holder for that record's own link.

**"Copy link with its chain"** is a second button, shown when the record is about something
this browser holds. Its link carries, beside the record's sealed fields:

    {"v":1,"fields":{…},"chain":[{"id":"<record id>","fields":{…}},{"id":"<record id>","code":"<proof code>"}]}

- a document in the chain comes with its own sealed fields, so its check page opens from the
  link alone;
- any other record comes with its ID and proof code, so its public check page is checked
  against that code.

Before the button, the page lists which records' details the link shows. It is the holder's
choice each time, as with any link. `chain` is outside the sealed fields. A site build from
before this reads `fields` and ignores it.

What happens when a checker follows a link:

| Target | Opens | Sent to a server |
|---|---|---|
| A document carried in the link | `/check-document#d=…&as=<record id>`, everything after the `#` | Nothing new. The page then asks the registry for the date by proof code (`GET /proof/<code>`), as any document check does |
| Another record with a proof code in the link | `/verify/<record id>?fp=<proof code>` | The record ID to the registry (`GET /verify/<id>`), the proof code in the page's address to the website's host, then `GET /proof/<code>` |
| A record named by ID only | `/verify/<record id>` | The record ID to the registry |

No sealed field is in any of those requests. A test opens the link's target with every request
refused and reads the record from the fragment alone.

A page opened from another record says so: "which names it as record …. Nothing in the link
ties that ID to this record's proof code." It offers one more link, to
`/verify/<id>?fp=<the proof code recomputed here>`, which asks the registry whether it holds
that proof code for that ID, and says what that sends.

### What the public check page shows for each kind of target

- **A plant, animal or strain record:** what its holder chose to show, its proof code, the
  batch it is in (checked in the browser against the proof code in the link) and the batch's
  date, looked up on Midnight when an indexer answers and otherwise worded as the registry's
  report.
- **A document the registry holds locked:** that a document with that ID exists, its proof
  code, its batch and date. Never its fields: the registry can't read them.
- **A document kept on the holder's device only:** the same. The registry holds its ID, proof
  code and key binding, which is what that page needs. Its date comes from the batch its proof
  code is in, as for any record.

### On the holder's own device

A record's page has "Its chain, on this device": **What this is about** (up) and **Records
about this one** (down), nearest first. It is worked out from the records this browser holds
(`document-chain.ts` `upstreamOf`, `downstreamOf`), including records kept on this device only.
No request is made for it. A record held elsewhere is not listed; a named record this browser
doesn't hold is listed by the name sealed with the link, marked "not on this device".

## Limits

- A document names at most 20 records.
- A chain view follows at most 32 links in one direction; a link's chain carries at most 40
  records.
- A link with its chain shows every carried document's sealed fields to whoever has it.
- A record kept on this device only can be in a chain like any other. Its fields are in a
  chain link only if the holder copies that link.
- No corrections of `about` yet: a wrong link is fixed by sealing the record again.
- The registry's `/verify/<id>` answer for a document says "a document", not which kind.
- The screen can't stop a count being typed into a title or notes.

## How it was tested

- `bboard-ui/src/veilcore/document-chain.test.ts`: the two schema ids, pinned and distinct from
  every other form's; the forms offered for a certificate's numbers unchanged; the kind read
  from the sealed schema id; a document about a document accepted by the profile as it stands,
  and a record about itself refused; the chain view up and down, with a record not held, with
  records that name each other, and with a record kept on this device only (and no request
  made); the ordinary link byte for byte as before; the link with its chain read back, read by
  the old rules, and followed with every request refused; a malformed chain entry dropped; the
  made sheet's exact bytes.
- `bboard-ui/src/veilcore/device-only-claims.test.ts`: see `device-only-records.md`.
- `bboard-ui/e2e/document-chain.spec.ts` (a real browser against the stand-in registry): a
  source record, a grow batch about it kept on the device only with a made sheet, a harvest lot
  about the batch, a lab report about the lot; the chain view; then the lab report's link with
  its chain opened in a browser with nothing in it, followed to the top, with each page's date
  line; and what the registry was sent for the batch.
- `bboard-ui/src/i18n/copy-truth.test.ts`: the "what's live where" rows and the sentences that
  say what a link is worth, in five languages.

Not tested here: a real registry, a real network, and the main network.
