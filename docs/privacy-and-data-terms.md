# VeilCore privacy and data terms (draft)

> **DRAFT for the founders and a lawyer to review. Not published. Not legal advice.**
> Written 15 October 2026 from what the code does today: the site (`bboard-ui`), the
> registry (`veilcore-api`, `server.js` and `lineage/`), the fee sponsor and indexer relay
> (`sponsor/`), and the site's own privacy page (`/privacy`, `i18n/en.ts` and
> `en-mainnet.ts`, `m.privacy.*`). Where the code and this text disagree, the code is right
> and this text must change. Questions for the lawyer are at the end. Nothing here has been
> checked against the law of any country.

## The short version

- Your genetic data, lab report files and photos **stay on your device**. Your browser
  works out their fingerprints; the files are never uploaded.
- What you type (plant names, breeder names, dates, notes, agreement terms) **is kept on
  VeilCore's server**, so you can come back to it. A record's plant name shows on its public
  check page. Don't type anything you need to keep secret.
- Only a **batch fingerprint** goes on a public network (Midnight, and Bitcoin through
  OpenTimestamps). Nothing you typed goes there. Once there, nobody can delete it,
  including us.
- A lab report a lab sends back to you through VeilCore is **locked so only you can open
  it**, and **deleted after 180 days**.
- We **don't sell** your data, show **no ads**, run **no analytics or tracking**, and set
  **no cookies**.
- You can **download** everything we hold for you at any time, and ask us to **delete** it.

## Who we are

VeilCore isn't incorporated yet. VeilCore's founders run the website, the registry and the
fee sponsor. Contact: hunter@veilcore.org. *[Entity name, address and, if needed, an EU or
UK representative go here once VeilCore is incorporated.]*

## What never leaves your device

| What | Where it stays |
|---|---|
| Genetic data, DNA reports, lab report files, photos you add | Read by your browser to work out a fingerprint (SHA-256). Never uploaded. |
| Each record's secret key (made when you seal a record that names its key) | Your browser and the backup file you save. Never sent to VeilCore. |
| A lab's private signing key | The lab's own browser. Only the public key is sent. |

## What your browser keeps

The site uses your browser's local storage, on this device only. No cookies.

| Kept | What it is |
|---|---|
| Your holder key (`veilcore.holder.v1`) | The key that finds your records on the server. A copy is sent with every save (below). |
| Your records and licences (`veilcore.records.v1`, `veilcore.licenses.v1`) | Your own copy, so the site works without the server. |
| Record keys (`veilcore.record-keys.v1`) | The secret keys of records that name their key. Save your backup: if this browser's data is cleared, they are gone. |
| A lab's signing key (`veilcore.attester.v1`) | Only if you set one up as a lab. |
| Deliveries, codes, opened lab reports (`veilcore.lab-deliveries.v1`, `veilcore.sent-codes.v1`, `veilcore.opened-results.v1`) | Lab codes you made or used and which reports you've opened. |
| Check requests (`veilcore.prove-asks.v1`, `veilcore.verifier-challenges.v1`, `veilcore.verifier-challenges.lasting.v1`) | Requests you made to someone to prove they control a record's key, and their answers. |
| A form you haven't finished (`veilcore.log-draft.v1`) | So a half-typed record isn't lost. |
| A random fee-sponsor ticket (`veilcore.sponsor-ticket.v1`) | Made for the date-stamp service only. Not your holder key. |
| Your role and language (`veilcore.role.v1`, `veilcore.lang`), a "seen this" flag (`veilcore.lab-visibility-seen.v1`) | Settings. |

To remove them, clear this site's data in your browser settings. Save your holder key and
record backup first.

## What VeilCore's server (the registry) keeps

| What | Why | How long |
|---|---|---|
| Your records as you typed them: plant and breeder names, species, dates, notes, reference numbers, parents, fingerprints of the record, photos and lab reports, lab report file names | So you can come back to them, and so a record can be checked | Until you ask us to delete it. No set period. |
| Your holder key, stored as a one-way digest (`h1:` + SHA-256), never as sent | To find your records | As long as your records |
| When the registry first saw each record | The registry's own date for it (its word only) | As long as the record |
| Licences and agreement terms, counterparties | Licences you issue | Until you ask us to delete them |
| Your sharing choices for each record's public check page | What a stranger with the link sees | As long as the record |
| Lab codes: who a delivery is addressed to, quantity, note, the lab code, and (when filled in) the sample details: sample ID, seal number, where and when it was taken, a witness's name, and what the lab wrote on arrival | So a lab can take delivery and sign a receipt | No set period |
| Labs: public signing key, the name the key gives itself, role, and VeilCore's name-check notes | So signatures can be checked and named | No set period |
| Lab signatures (attestations) and withdrawals | Public statements labs choose to publish | No set period |
| Locked lab reports a lab sends you (encrypted to your key with `age`; the server can't open them), with their size and SHA-256 | So you can collect them | **Deleted 180 days after they arrive**, checked every hour. Not in backups. Off on the main site for now. |
| Requests to prove control of a record's key, with the asker's name as typed and the answers | The prove-by-link feature | **Deleted after 7 days** |
| Batches: each record's fingerprint, its inclusion proof, the batch root, where it was anchored, and the Bitcoin stamp | So anyone can check a record's date | Kept: they are what make old records checkable |

**Request logs.** The registry writes no request log (no request logger exists, and
`test/no-request-logging.test.mjs` fails if one is added). Rate limits count requests per
network address block in memory only: nothing is written to disk, and the counts are lost
when the server restarts. The registry's console output is start-up and error messages.

**Backups.** Once a day, if backups are switched on, a copy of the whole database is
encrypted (with `age`, to a key the server never holds) and sent to a storage bucket
(Backblaze B2). The bucket is meant to lock each copy so it can't be deleted early. Lab
report files aren't in it. *[Lock period and how long copies are kept: to be set.]*

## What goes on a public network

- **Midnight.** VeilCore puts a batch's root (one fingerprint standing for every record in the
  batch) into a transaction on Midnight's network. On the main network this is done by
  hand. Nothing you typed is in it. It is public and permanent.
- **Bitcoin, through OpenTimestamps.** The same batch root is sent to public OpenTimestamps
  calendar servers, which put it into Bitcoin. Public and permanent.
- **A record's key.** If your record names its key and you make a date stamp for that key,
  the key's public ID is recorded on Midnight. It is a public ID, not the secret.

A fingerprint can't be turned back into what you typed: each record has a random salt.

## Public pages

A record's public check page (`/verify/:id`) shows its plant name and whatever else you
chose to share. Anyone with the link can see it. The registry doesn't record who looked.

## Who else handles data

| Service | What it does for us | What it sees |
|---|---|---|
| Vercel | Hosts the website | Your network address and the pages you load. Vercel logs requests. |
| Railway | Runs the registry, the fee sponsor and the indexer relay | Your network address and requests to them. Railway logs requests. |
| Blockfrost | Runs the Midnight indexer the check page reads through our relay | The relay's queries (which transaction is being checked), from the relay's address, not yours |
| Midnight network | Records batch roots and key stamps | Public transactions |
| OpenTimestamps calendars | Stamp batch roots on Bitcoin | Batch roots |
| Backblaze B2 | Stores encrypted backups | Encrypted files it can't open |

The fee sponsor logs counters and outcomes only, never a request body, a transaction, a
ticket or an address. *[Each provider's own log retention and data processing terms: to be
checked.]*

## What we don't do

- We don't sell or rent your data, or share it for advertising.
- No analytics, no tracking pixels, no third-party scripts or fonts, no cookies.
- We don't use your records to breed, test or train anything. *[Founders to confirm this
  as a commitment: nothing in the code does it today.]*
- VeilCore doesn't vouch for any record, breeder or lab.

## Your choices

- **Download.** On your records page, under More: **Export all records** downloads what
  this browser holds; **Download everything VeilCore holds for you** downloads what the
  server holds (`GET /api/export`), with every proof, checkable without us. Locked lab
  reports are opened from the delivery instead. **Download evidence bundle** on a plant's
  page gives one record's evidence.
- **Delete.** Email hunter@veilcore.org with your records' IDs. Deleting removes the
  server's copy of the records and their sharing choices (the server can also do this for
  your holder key directly: `DELETE /api/records`; the site has no button for it yet).
  Deleting **doesn't** remove: batch fingerprints and anchors already on Midnight or Bitcoin;
  the inclusion proofs the registry keeps for batches; signatures labs published; lab codes
  and their sample details; encrypted backups until their lock ends; and copies anyone you
  shared with already has.
- **Correct.** A sealed record can't change. A correction is a new record that points to
  the old one (`docs/corrections.md`).

## Changes to these terms

*[How users will be told about changes, and from when they apply.]*

---

## Open questions for the lawyer

1. **Who is responsible.** Until VeilCore is incorporated, the founders personally run the
   service. Which entity should be named, and from when? Do we need an EU or UK
   representative?
2. **Controller or processor.** For records a breeder types, VeilCore looks like a
   controller. For a lab's or partner's records sealed inside their own systems, or under the
   managed service (`docs/legal/managed-service-agreement-DRAFT.md`), are we a processor? Do
   labs need a data processing agreement from us?
3. **Is a fingerprint personal data?** Batch roots on public networks can't be deleted. EU
   data protection authorities advise keeping personal data off chain and treating hashes
   with care ([EDPB Guidelines 02/2025 on blockchain](https://www.edpb.europa.eu/our-work-tools/documents/public-consultations/2025/guidelines-022025-processing-personal-data_sv?page=15)).
   Our design puts only salted commitments on chain. Is a written data protection impact
   assessment needed, and is this design enough?
4. **Names in records.** Breeder names, witness names, the asker's name on a check request,
   lab contact names: personal data of people who may not be our users. Lawful basis? Notice
   to them?
5. **Retention.** Nothing but lab reports (180 days) and check requests (7 days) has a set
   period. What periods should we set for records of people who stop using VeilCore, lab
   codes and sample details, and backups? Can a backup lock period override a deletion
   request?
6. **Deletion limits.** Is our answer to a deletion request (server copy deleted; anchors,
   proofs, published signatures and locked backups kept) acceptable under GDPR Article 17,
   the CCPA, Japan's APPI and Switzerland's FADP, and how must we say it?
7. **Where the servers are.** Which regions do Vercel, Railway, Blockfrost and Backblaze use
   for us? Are transfers out of the EU, UK, Japan or Switzerland covered (standard
   contractual clauses or similar)? Do we have each provider's data processing terms?
8. **Provider logs.** Vercel and Railway log addresses and requests. For how long, and must
   we name that in the terms?
9. **The public check page** shows the plant name by default. Is that clear enough, and
   should it be opt-in?
10. **Cannabis.** Some users work with cannabis genetics. Does holding their records raise
    data, licensing or disclosure concerns in the US, Japan or Switzerland, and should the
    terms say anything about lawful use?
11. **Ages.** Should the terms set a minimum age?
12. **Security incidents.** What must we notify, to whom, and how fast?
13. **The evidence bundle and declaration template.** They are marked "not legal advice". Is
    that enough, or do the terms need more?
14. **Test site.** The test site asks for made-up data and may be reset. Does it need its
    own, shorter terms?
