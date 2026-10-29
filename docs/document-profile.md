# Document records (29 Oct 2026, draft)

**In one line:** anyone can seal a document (a permit, a certificate of analysis, a contract, a
protocol, a transport document) so they can later show that exactly this file existed by a
date, without the file ever leaving their device.

**Draft, test networks only.** The profile `veilcore/profile/document/v1` (SPEC section 11.10)
may still change before it is marked final. "A document" is offered only where
`DOCUMENT_RECORDS_ENABLED` is on (`bboard-ui/src/config/network.ts`). To offer it on
veilcore.org: mark SPEC 11.10 final, then switch that flag on. Deploys refuse a registry whose
`/health` doesn't list `document-profile-v1`.

## The problem it answers

Genetics work runs on paperwork, and the paperwork is where disputes start:

- A cultivation association has to show a regulator its protocols, plant counts and transport
  documents as they were on a date, not as they were tidied up later.
- A breeder and a seed shipper pass COAs, viroid tests and genetic descriptions across a border;
  each side wants to know the file it holds is the one the other sent.
- A license or transfer agreement signed on paper or by e-signature should be pinned to the
  genetics it is about.

What they need is the same: a date nobody can backdate on the exact bytes of a file, kept
private until they choose to show it, checkable by anyone without trusting VeilCore.

## Borrowed, on purpose

- **OpenTimestamps** (Bitcoin): hash the file locally, timestamp only the hash; anyone holding
  the file and the proof can check it with no server. VeilCore already stamps every batch root
  with OpenTimestamps as a second, independent date (registry `lineage/ots.mjs`), so a sealed
  document gets a Midnight date and a Bitcoin date.
- **Document-timestamping services** (Woleet, OriginStamp and similar): the file is never
  uploaded; the page that checks it hashes the dropped file in the browser.
- **What they don't do, and this does:** the record is private by default, and the holder
  chooses what a checker sees (the file's fingerprint, its title, who issued it), the same
  "Show someone" every VeilCore record has. A document can name the genetic records it is
  about, so a COA sits with the plant or animal it describes.

## What a record holds

One record is one document. A document can have up to 20 files (a contract and its annexes;
a COA and its chromatograms); each is sealed by its fingerprint.

| Field | Plain words | Needed? |
|---|---|---|
| Title | e.g. "Transport document 0042", "COA batch 7" | yes |
| Type | permit; certificate of analysis; lab report; contract or agreement; protocol or SOP; transport or shipping document; invoice or receipt; other | yes (defaults to other) |
| Issued by | who issued it, as written on it | no |
| Reference | its number: permit number, invoice number, lot | no |
| Date on the document | as written on it, `YYYY-MM-DD`, or empty | no |
| Files | for each: its name, its SHA-256, its size in bytes | at least one |
| About | genetic records it concerns: a logged record (linked) or a name typed in | no |
| Held by | who seals it | yes |
| Notes | | no |

## How it is sealed

Exactly as every record: the same date stamp, the same random nonce, the same key the record
names (SPEC 3.6.1), the same backup. The profile says which fields go in and in what form:

- every field is present, empty where not given; no other field;
- one-line fields have no line breaks, tabs or spaces at either end, and at most 200 characters;
- type is one of `permit`, `certificate-of-analysis`, `lab-report`, `contract`, `protocol`,
  `transport`, `invoice`, `other`; the document date is `YYYY-MM-DD` or empty;
- files: 1 to 20, each `{ name, sha256, size }`: a one-line name, 64 lowercase hex characters,
  a whole number of bytes from 0 to 2^53 - 1; no two files with the same SHA-256;
- about: at most 20, each `{ name }` plus `recordId` when it is a logged record.

A record in any other form is refused, never tidied: one document written two ways would seal
as two records. The site, the registry and the SDK (TypeScript and Python) all check this
against the same vectors, made without any checker's code.

## Privacy

- **The file never leaves the device.** Only its SHA-256, name and size are sealed, and like
  every sealed field they stay in the sealed record until the holder shares them.
- **Its fingerprint is shared only when the holder chooses** ("The file's fingerprint" in Show
  someone, off by default). A plain SHA-256 of a well-known file is guessable by anyone who has
  the file; that is why it is not public by default.
- **The registry sees what it sees for any record:** a sealed box and its proof code.

## What a checker sees, and does

The check page shows what the holder shared and the record's date. With the fingerprint
shared, it offers **"Compare a file"**: the checker picks the file they were sent, the browser
hashes it (nothing is uploaded) and says whether it is byte for byte one of the sealed files.

## What it shows, and what it does not

- **Shows:** a file with exactly these bytes was in the holder's hands by the record's date.
- **Does not show:** that the document is genuine, that the issuer issued it, or that what it
  says is true. "Issued by" is the holder's statement. A lab's own signature on a report is a
  different thing (lab codes, SPEC section 7) and stays that way.
- **Does not show** that nothing else existed: a holder could seal two versions. What it rules
  out is a version made after the date being passed off as the earlier one.

## What a document record doesn't get, and why

- **No licensing, no DNA report, no lab codes, no family tree:** those are about genetics. A
  document points at the genetics through "About".
- **A correction** changes the title, type, issuer, reference, date, about and notes. The files
  can't be changed by a correction: a different file is a different document.

## Where it shows

- **Home:** under "Documents", apart from plants, animals and strains.
- **Log a record:** "A document" beside a plant, an animal and a strain.
- **A genetic record's page:** documents that name it under "About".
- **Certificate and evidence bundle:** labelled for a document; `verify.html` checks it offline.
