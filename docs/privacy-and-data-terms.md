# VeilCore privacy and data terms (lawyer-review copy)

> **For the founders and a lawyer to review. Not legal advice.** This is the source of the
> privacy policy veilcore.org publishes at `/privacy` (`bboard-ui/src/i18n/privacy-policy/en.ts`,
> shown by `components/site/PrivacyPolicy.tsx` in a mainnet build; German, Spanish, French and
> Japanese beside it). The published text is below, section by section, with where each claim
> comes from in the code. Change the two together. Where the code and this text disagree, the
> code is right and both texts change. Nothing here has been checked against the law of any
> country: the questions for the lawyer are at the end.
>
> Last updated 25 November 2026, to describe veilcore.org once the open pull requests are
> deployed: site #142, #143, #145, #146, #147, #148, #149, #208, #211, #215 and registry #10, #11, #12
> (live sync and the recovery sheet; offline sealing and a timestamp per record; two Bitcoin
> explorers and alerts; scanning and QR labels; parentage results; the Bitcoin header check and
> the passkey check page; what a spreadsheet import keeps in the browser; every key
> the browser keeps, in five groups). Before that, 15 October to 8 November 2026 (sealed records, locked
> names, private lab signatures). The test site keeps its own short note (`m.privacy.*`).

## What the page leaves out, and why

- **Paid plans** (Paddle; `VITE_PAID_PLANS`, the registry's `BILLING`), **royalties paid in
  NIGHT on Midnight** (`ONCHAIN_PAYMENTS = !IS_MAINNET`) and **stablecoin payments on Cardano**
  (`STABLECOIN_PAY_ON_MAINNET = false`, with its sanctions-list check and Cardano relay) are
  built and switched off on veilcore.org. The page says the site takes no payments and that it
  will be updated before any payment feature is turned on. A payment partner's receipt (a
  company the two parties choose) is not a VeilCore payment feature and is listed.
- **Ask's optional on-device model** (downloaded from Hugging Face) is only in a build with
  `VITE_ASK_MODEL`, which the mainnet deploy doesn't set, and the model isn't pinned
  (`model-manifest.json` `"pinned": false`). The page says Ask works on the device.
- **Viability results** are off on mainnet (`VIABILITY_RESULTS_OFF`).
- **Incorporation.** The page says VeilCore's founders run the site, the registry and the fee
  sponsor, and gives hunter@veilcore.org. It says nothing about incorporation (question 1).
- **"We don't use your records to breed, test or train anything."** True of the code today,
  but not yet a founders' commitment, so it is not on the page (question 15).

## The published text, with its sources

### The short version

- Your DNA files, lab report files and photos never leave your device; the browser makes a
  SHA-256 of each. (`veilcore/` file pickers hash locally; the CSP's `connect-src` allows no
  upload host.)
- What you type is locked in the browser before it is sent; the server stores it locked and we
  don't have the key. (Sealed records, registry README "Sealed records".)
- The server can read what it needs: a record's ID, proof code, dates and what you choose to
  show.
- Only codes, and what the holder chooses to prove, go on public networks (Midnight; Bitcoin
  through OpenTimestamps). Typed content goes there only as a number proved exactly. Nobody can
  delete it.
- No sale of data, no ads, no analytics or tracking, no cookies. (Checked: no `document.cookie`,
  no analytics or error-reporting library in the site, sponsor or registry; the CSP allows no
  third-party script; `privacy-policy.test.ts` keeps it so for the site.)
- You can download and delete; for anything else, hunter@veilcore.org.

### Who we are

VeilCore's founders run the website, the registry and the fee sponsor. Contact:
hunter@veilcore.org.

### What stays on your device

| What | What happens to it | Source |
|---|---|---|
| DNA reports, lab report files, photos | Hashed in the browser, never uploaded | CSP `connect-src` |
| The vault key | Browser and backup file; never sent unlocked. With "Saved with VeilCore" on, inside the locked account copy (the backup file's keys, `backup.ts accountContents`) | `veilcore/account-copy.ts` |
| Each record's secret keys | Browser and backup file; a locked copy goes with the record | `record-keys.ts` |
| A lab's private signing key | The lab's browser and backup; only the public key is sent unlocked; with "Saved with VeilCore" on, the private key is inside the locked copy (`backup.ts`) | `attester-keys.ts` |
| A document kept on this device only | Nothing typed is sent, locked or not; the registry gets its ID, proof code and key binding; with "Saved with VeilCore" on, its ID and keys go inside the locked copy | `docs/device-only-records.md` |
| The camera, when scanning | Frames read in the tab and dropped; only the decoded text goes into the box | `docs/scan-and-labels.md`, PR #147 |
| QR labels | Drawn on the device and printed by the browser; ID and proof code, the name only if ticked | `docs/scan-and-labels.md` |
| Proof code QR (record page) | Drawn on the device; the proof code and a check, nothing else; a lab's scan is read on its device and goes only into its form | `docs/scan-and-labels.md` |
| The recovery sheet's code | Made on the device; never sent (slot id, token and key come from it by HKDF) and never stored | `docs/passkey-backup.md`, PR #143 |
| The passkey check page | Tests in the browser; nothing sent | `docs/passkey-support.md`, PR #148 |
| Ask | Shortcuts only, on the device; typing sends nothing; an approved "Do it for me" job saves, sends reports or dates what was approved; jobs are local, deleted 7 days after they end | `docs/ask-veilcore.md`, `ask-job/store.ts` |
| A spreadsheet you import | Read in the browser, never uploaded; only the picked details of each row are saved, locked, as records. The last import's rows (every column, the file name, each row's outcome) stay in local storage `veilcore.bulk-import.job.v1` until the next file is chosen, "Import another file" or "Remove it" is pressed. Remembered columns (`veilcore.import-layouts.v1`: column names, which is which, the header row, the defaults set there: breeder, species, ID system and date order), for up to 20 sheets (`MAX_LAYOUTS`; the one used longest ago is dropped), stay until "Forget". Neither is sent | `veilcore/bulk-import.ts`, `veilcore/import-layouts.ts` |

### What your browser keeps

Local storage, session storage, IndexedDB and Cache Storage on this device, no cookies. The page
opens by saying some of these are secrets and some are what the person typed, kept unlocked;
anyone who can read the browser's storage could read or use them, and clearing it loses them
unless they are in the backup file. Then five plain groups, and the full key names under
"Technical details", by the same groups. Local storage unless the table says otherwise.

**Unlocked at rest.** Unfinished records (`veilcore.log-draft.v1` and its `.next.<record>` keys),
records waiting to be saved (`veilcore.outbox.v1`), records whose correction got no clear answer
(`veilcore.unsure.v1`: the whole record before and after), device-only documents
(`veilcore.device-only.v1`), the last import's rows (`veilcore.bulk-import.job.v1`), recipient
names (`veilcore.outbox-names.v1`), the sender's note and quantity kept with a code being received
(`veilcore.receiving-claims.v1`) and a lender's claim words (`veilcore.lender.v1`) are plain JSON in
local storage. Only the deal outbox is stored encrypted. The page says so in the groups, and the
technical locking line reads "locked by your browser … before they are sent; the ones it keeps
here … are stored unlocked". Encrypting them with the vault key, which sits in the same storage,
would add nothing against someone who can read it.

**Not browser storage.** `veilcore.records.v1` and `veilcore.licenses.v1` are the registry's
collection names (`api-store.ts kindFor`); `store.ts` uses `apiStore`, and `localStore` is unused.
The records live in page memory and come from the registry. The page says only that an older
version may have left those two keys, that nothing reads them, and that clearing site data
removes them.

**Kept complete by a test.** `privacy-policy.test.ts` scans the site's code (and `offline/sw.js`)
and fails on any storage name that is neither listed in every language nor in its `NOT_STORAGE`
exemptions (Web Lock names, message types, file and format names, hashing labels, storage
probes, the two collection names above, and the two payment keys that are off on veilcore.org).
It finds `veilcore.` strings anywhere, `veilcore:`/`veilcore-` strings in files that touch
storage, names built on a storage name (`${KEY}.next.${id}`, KEY + '.x'), and the first argument
of every Web Storage, IndexedDB and Cache Storage call when it is a string or a constant, whatever
it starts with.

| Group (page words) | Keys | Secret? | How long, what clears it | Sent anywhere? | Source |
|---|---|---|---|---|---|
| **Your records and their secrets**: unfinished records, records waiting to be saved or checked, device-only documents, Ask's jobs, the last import and remembered columns; the holder key, the vault key, record keys and a lab's signing key | `veilcore.holder.v1`, `veilcore.vault.v1`, `veilcore.vault.made.v1`, `veilcore.record-keys.v1`, `veilcore.attester.v1`, `veilcore.log-draft.v1`, `veilcore.log-draft.v1.next.<record>`, `veilcore.device-only.v1`, `veilcore.outbox.v1`, `veilcore.unsure.v1`, `veilcore.bulk-import.job.v1`, `veilcore.import-layouts.v1`, `veilcore.bulk-import.v1`; IndexedDB `veilcore-offline`, `veilcore.account.v1`, `veilcore.ask.job.v1` | Yes: holder key, vault key, record keys, lab private key; `veilcore-offline` holds a second copy of the holder key; `veilcore.account.v1` holds two non-extractable WebCrypto keys. Not secret but unlocked: drafts, outbox, unsure, device-only and import rows | Until clearing site data; the backup file holds the keys and the records (`backup.ts BackupContents`), not the draft; Start over drops the holder key, `veilcore-offline` and the account keys (`records.ts startOver`, `holder.ts forgetHolderKey`); `veilcore-offline` also empties when nothing waits. A `veilcore.unsure.v1` entry goes at the first read of the registry for its holder key (`records.ts settleUnsure`, on start and every sync); one of a key no longer in use here (after Start over) is kept 30 days from when this browser first finds the key gone, then dropped (`records.ts UNSURE_KEEP_MS`, `sweepUnsure`), and the Start over question says so first. The key in use is never dropped by age: its records show as not saved yet | Outbox and `unsure` records go to the registry locked, with the holder key, as any save; record keys go locked with the record; the vault key never unlocked; device-only records never (`outbox.ts neverSend`); `veilcore-offline` rows (id, proof code, key binding) and the holder key go to `PUT /api/records/dating` from the service worker | `holder.ts`, `vault.ts`, `records.ts`, `record-keys.ts`, `attester-keys.ts`, `outbox.ts`, `log-flow-state.ts`, `bulk-import*.ts`, `import-layouts.ts`, `offline/dating-mirror.ts`, `account-key-store.ts`, `ask-job/store.ts` |
| **Licenses and deals**: licenses held (with their secrets), the keys of deals given, deal messages not yet delivered, a lender's claims, payment partner keys named | `veilcore.held-licenses.v1`, `veilcore.issuer-deals.v1`, `veilcore.deal-outbox.v1.<deal>`, `veilcore.lender.v1`, `veilcore.partnerKeys.v1` | Yes: each held license's secret and party secret, the issuer's deal keys, a lender's secrets; a lender's claim words are unlocked | Deal messages until delivered (then 10 minutes) or 30 days (`deal-outbox-store.ts KEEP_MS`); expired ones are removed from storage on every page load (`sweepDealOutboxes`, `main.tsx`), not only when that deal is next opened; the rest until clearing; the backup file holds held licenses, deal keys and the lender's secrets | Held license secrets never, except inside the locked saved copy; deal messages go encrypted with the deal's channel key; partner keys never (`payment-partners.ts`) | `licenses.ts`, `held-licenses.ts`, `deal-client.ts`, `lender.ts`, `payment-partners.ts` |
| **Things you're receiving or sending**: lab codes, a code being received (with what the sender sent with it), recipient names and delivery keys waiting for their record, opened reports, prove requests, a partner site's request, key stamps and lab report dating still to finish; recipient names and the sender's words are kept unlocked | `veilcore.lab-deliveries.v1`, `veilcore.sent-codes.v1`, `veilcore.opened-results.v1`, `veilcore.receiving.v1`, `veilcore.receiving-claims.v1`, `veilcore.receiving-refused.v1`, `veilcore.outbox-names.v1`, `veilcore.outbox-offer-keys.v1`, `veilcore.prove-asks.v1`, `veilcore.verifier-challenges.lasting.v1`, `veilcore.key-stamp-retry.v1`, `veilcore.lab-report-dating.v1`; session storage `veilcore.verifier-challenges.v1`, `veilcore:intake` | Yes: lab codes and codes being received (claim code and offer key), the breeder's lock on a lab's delivery, delivery (offer) keys waiting, a prove request's answer token | A code being received until its record is sealed and accepted, or the registry refuses it (`transfers.ts forgetReceivingCode`), or Start over, which asks first when no checked backup holds it (`forgetAllReceiving`, `receivingOnlyHere`). The backup file holds it (`backup.ts receiving`, an optional version 3 field; older files restore as before); the account copy does not. Prove requests 7 days; session challenges 24 hours; an intake request 1 hour, this tab only; lab codes made and a lab's deliveries are in the backup file | Names and offer keys go inside the record's locked copy; prove requests post the challenge and identity, and only the token's SHA-256 (`prove-relay.ts`); an intake answer (record ID, proof code, check link) goes to the partner's address only when the breeder sends it | `transfers.ts`, `lab-results.ts`, `outbox.ts`, `prove-relay.ts`, `chain/challenge-book.ts`, `chain/key-stamp.ts`, `stage/lab-report-date.ts`, `intake.ts` |
| **Settings and "already seen" markers** | `veilcore.lang`, `veilcore.role.v1`, `veilcore.bulk-import.stamps-on.v1`, `veilcore.bulk-import.stamps.v1`, `veilcore.sponsor-ticket.v1`, `veilcore.account-copy.v1`, `veilcore.account.device.v1`, `veilcore.account.last-passkey.v1`, `veilcore:passkey-copy`, `veilcore.rev.v1`, `veilcore.records.arrived.v1`, `veilcore.record-keys.forgotten.v1`, `veilcore.record-keys.forgotten-at.v1`, `veilcore.record-keys.restored.v1`, `veilcore.attester.backed-up.v1`, `veilcore.attester.backed-up.copy.v1`, `veilcore.issuer-deals-backed-up.v1`, `veilcore.issuer-deals-backed-up.copy.v1`, `veilcore.device-only-backup.v1`, `veilcore.receiving-backed-up.v1`, `veilcore.invite-unsure.v1.<license>`, `veilcore.record-watch.seen.v1`, `veilcore.ask.seen.v1`, `veilcore.draft-notice-closed.v1`, `veilcore.install-card.v1`, `veilcore.lab-visibility-seen.v2`, `veilcore.log-kind.v1`, `veilcore.note.old-links.v1`, `veilcore.stamp-pressed.v1`, `veilcore.account.keep-safe-shown.v1`, `veilcore.account.sheet-reminder.v1`, `veilcore.lock.<task>`; session storage `veilcore.record-watch.v1`, `veilcore.homescreen.fresh`, `veilcore.in-app-notice.closed`, `veilcore:backup-return` | No key and nothing typed. IDs (record IDs, a passkey's credential ID, the copy's ID and device list, a public key), times, a random ticket, a SHA-256 of the backup contents (`account-copy.ts sameAsOf`) | Until clearing; leases 30 seconds (`tab-lock.ts`); session ones with the tab | The sponsor ticket to the fee sponsor; the copy's ID to the registry when the copy is saved or checked; this device's ID only inside the sealed copy | `home-screen.ts PREFERENCE_KEYS`, `account-copy.ts`, `api-store.ts`, `record-keys.ts`, `record-watch.ts`, `tab-lock.ts` |
| **Caches of public files** | Cache Storage `veilcore-shell-<release>`, `veilcore-offline-meta`, `veilcore-zk-<contract>`, `veilcore-zk-claims-<contract>` | No: this site's code, and proving keys, circuits and parameters fetched from this site | The service worker replaces the shell per release; the kill switch, or a build with offline off, clears every `veilcore-` cache (`offline/register.ts`, `offline/sw-kill.js`) | No | `offline/sw.js`, `chain/zk-material.ts` |

Ask's on-device model would add WebLLM's caches (`webllm/config`, `webllm/model`, `webllm/wasm`);
it is not on veilcore.org (above), and the test fails if the model is pinned and the page does
not name them. The two NIGHT-payment keys (`veilcore:onchain-sent`, `veilcore:onchain-counted`)
hold a payment's transaction ID per statement. They are written only by the NIGHT payment (`ONCHAIN_PAYMENTS = !IS_MAINNET`)
and the Cardano stablecoin payment (`STABLECOIN_PAY_ON_MAINNET = false`), both off on veilcore.org.

### What our server keeps

The registry (`veilcore-api`), hosted on Railway.

| What | Can we read it? | How long | Source |
|---|---|---|---|
| Records and agreements (name, breeder, species, dates, notes, reference numbers, parents, file codes and names, agreement terms and the other party, recipient names, record secret keys) | No: locked | Until deleted | `sealed.js` |
| Each record's ID, proof code, key binding, kind, name code, correction links, first seen, save count and last save, size bucket, parent links, batch and timestamps | Yes; `/verify/:id` shows anyone with the ID the proof code, first seen, correction links, anchor and whether signatures exist | As long as the record | `server.js`, `sealed.js` |
| What the holder chooses to show on the check page | Yes (public by ID) | Until turned off or deleted | `disclosure_grants` |
| The holder key | Only `h1:` + SHA-256 | As long as the records; afterwards in each tombstone and in `fingerprint_holders` | `holder-key.js` |
| Every proof code a holder key has held, with that key's digest and when first held | Yes | Never deleted (stops another key taking over an old proof code) | `fingerprint-holders.js` |
| The account copy (the backup file's contents except the records and codes still being received: keys, lab codes, licence and deal keys) and its slots (passkey, recovery sheet) | No: AES-256-GCM, padded; SHA-256 of tokens only. The registry sees which slots open which copy and their kind, the size bucket, when saved or checked, and each slot's `wrap` fingerprint (API #10); timing and address could let it guess the holder (`account-copy.mjs` header) | Until "Stop saving with VeilCore" | `lineage/account-copy.mjs` |
| Lab codes: source record, receiving account and time, a tag for the recipient; quantity, note and sample details locked with a key in the lab code | Partly | No set period | `lineage/transfer.mjs` |
| Labs: public key, name, role, website, the operator's name-check record and note, signatures; receipts and reports private to holder, lab and sender unless shown | Yes | No set period | `lineage/attesters.mjs` |
| Lab reports sent back | No: `age` to the record's key | 180 days; copies in backups until removed | `lineage/lab-results.mjs` `keepMs`, `backup.mjs` |
| Prove requests (asker's typed name, answers; the on-chain key named) | Yes, and anyone with the request's link | 7 days | `lineage/prove-requests.mjs` `ttlMs` |
| License invites (the issuer's label for the licensee, the record's on-chain identity, the licence commitment, both sides' nonces, transaction IDs) | Yes, and anyone with the invite's link | 30 days | `lineage/license-invites.mjs` `ttlMs` |
| Deal messages (terms, reports, answers, "I paid", "received", payout and business details) | No: locked to the two parties; the registry sees the license, count and arrival times | Until a party asks; empty deals 7 days | `lineage/deals.mjs` |
| License lines on a check page and the licensee's answers (type and date) | Yes, public by ID | Until the line is taken off or the record deleted; answers stay | README "License notices" |
| Royalty obligations (record covered, since when; anyone can ask) | Yes | As long as the license | `server.js` obligations |
| Payment partner receipts (amount, currency, account, reference, time) | Yes, to anyone with the statement's fingerprint | No set period | `lineage/payment-receipts.mjs` |
| Batches (proof codes, inclusion proofs, root, anchor, Bitcoin stamp, RFC 3161 tokens) | Yes | Kept | `lineage/batches.mjs` |

**Request logs.** The registry has no request logger (`test/no-request-logging.test.mjs`).
Rate limits count per address bucket (IPv4 address, IPv6 /64; some per /48) in memory only.
Console output is start-up and error messages. The per-record timestamp quota keeps each holder
key digest, TSA and request time for a day (`record_timestamp_usage`, `lineage/record-stamps.mjs`). The fee sponsor logs counters and outcomes only,
never a body, transaction, ticket or address (`sponsor/src/log.ts`); its per-address buckets
(/24, /48) and per-ticket quotas are in memory and dropped when their window passes
(`sponsor/src/limits.ts`). Vercel and Railway keep their own request logs.

**Before sealing.** Text saved before records were locked was removed on 18 October 2026, and
the key to the backups made before then was destroyed the same day.

**Backups.** Daily, the database is gzipped, encrypted with `age` to the operator's public key
and uploaded to Backblaze B2 under a new name; lab report files (already locked) go too
(`backup.mjs`). The bucket is set up with Object Lock, 30 days, compliance mode (README "Off-site
backups"). How long copies are kept after the lock is not set (question 5). A deleted record
stays in earlier backups until they are removed.

### What is public, for good

On Midnight (and Bitcoin, for batch roots, through OpenTimestamps): each batch root; a record's
key and its date stamp; a DNA report pairing's code when dated; parent and child links once both
holders confirm; that a record has a license, an obligation or a lender's claim, and when that
changed; a lab's public key when it signs a certificate; what a holder proves about a number (a
limit and its direction, or the exact value); for a parentage result (PR #149), only that ICAR
2023's bounds are met, with no genotype or count. The fee sponsor anchors batches on its
schedule; every other step shows a receipt first and goes from the browser through the fee
sponsor. Royalties in NIGHT are not on veilcore.org and not on the page.

### Timestamps, and checking on Bitcoin

- Registry #11 / site #145: on taking a proof code, the registry queues an RFC 3161 request to
  each TSA in `VEILCORE_TSA_URL` (FreeTSA and DigiCert are the ones the site pins,
  `bboard-ui/src/config/tsa-pins.json`; the registry README's example also lists Sectigo). The
  TSA receives SHA-256 of the proof code's 32 bytes, a nonce and the time, from the registry's
  address (`lineage/record-stamps.mjs`, `lineage/tsa.mjs`); batch roots likewise. The check page
  shows the time to the second.
- Site #148: "Check on Bitcoin" on a check page, and "Include Bitcoin block headers" in an
  evidence bundle, are the only times the browser contacts mempool.space and blockstream.info
  (block heights and headers; the explorers see the IP address, that a VeilCore batch is being
  checked, and which block). Registry #12 asks both explorers for every batch's block.

### Who else handles data

| Service | Does | Gets |
|---|---|---|
| Vercel | Hosts the site | IP address, pages and files loaded (a check page's address carries the record ID and proof code); request logs |
| Railway | Runs the registry, fee sponsor and indexer relay (on mainnet every chain read of the app goes through the relay) | IP address and requests (a check names the record ID); the registry's data at rest; request logs |
| Blockfrost | Indexer and node for the fee sponsor and relay | Transactions the sponsor sends, the relay's queries; from our service, never the visitor's address (`sponsor/src/indexer-relay.ts` forwards no client headers) |
| Midnight | The public network | Public transactions |
| OpenTimestamps calendars | `a.pool.opentimestamps.org`, `b.pool.opentimestamps.org`, `a.pool.eternitywall.com`, `ots.btc.catallaxy.com` | Batch roots, from the registry |
| Timestamp authorities | FreeTSA, DigiCert (and any set in `VEILCORE_TSA_URL`) | A SHA-256 of each proof code and batch root, and when, from the registry |
| Bitcoin explorers | mempool.space, blockstream.info | Block heights; from the browser only on request, with its IP address |
| Backblaze B2 | Backups | Encrypted files |
| A lab's own website | Daily check that it lists the lab's key (`lineage/lab-domain.mjs`) | A request from the registry |
| Passkey providers | Keep the passkey for "Saved with VeilCore" | That a passkey exists for veilcore.org; we never receive the passkey or its PRF output |

The browser can reach only the hosts in the CSP's `connect-src` (`scripts/vercel-config.mjs`):
the site, the registry, the sponsor and relay, mempool.space and blockstream.info. Camera:
`camera=(self)`; microphone and location off.

### Your choices

- **See and download**: "Export all records" (the browser's copy); "Download your records and
  agreements from VeilCore" (`GET /api/export`: records, licences, sharing choices), which leaves
  out deliveries and sample details, lab reports and signatures, royalty obligations, licence
  invites, deal messages, prove requests and per-record timestamp tokens; the backup file ("Download a copy" in
  Settings) holds the keys.
- **Delete**: "Delete this record" (`DELETE /api/records`, registry 17 Nov 2026) removes the
  record's body, locked copy, sharing choices and license lines; "Stop saving with VeilCore"
  deletes the account copy and every slot. Anything else by email with the IDs.
- **What stays**: anything on Midnight or Bitcoin; the record's tombstone (ID, holder key digest,
  proof code, deletion time: `tombstones.js`); `fingerprint_holders`; parent links and obligations already recorded; lab
  signatures; earlier backups until removed; copies others hold.
- **Correct**: a sealed record can't change; a correction is a new record pointing to it
  (`docs/corrections.md`).
- **Ask us**: hunter@veilcore.org, with record IDs (the registry finds records by ID or holder
  key, not by name).

### Changes to this policy

Posted on the page, with the date, before they apply.

---

## Open questions for the lawyer

1. **Who is responsible.** VeilCore isn't incorporated yet; the founders personally run the
   service. The page names the founders and gives an email address. Which entity should be
   named, and from when? Do we need an EU or UK representative?
2. **Controller or processor.** For records a breeder types, VeilCore looks like a
   controller. For a lab's or partner's records sealed inside their own systems, or under the
   managed service (agreement prepared privately, `docs/legal/README.md`), are we a processor? Do
   labs need a data processing agreement from us?
3. **Is a fingerprint personal data?** Batch roots on public networks can't be deleted. EU
   data protection authorities advise keeping personal data off chain and treating hashes
   with care ([EDPB Guidelines 02/2025 on blockchain](https://www.edpb.europa.eu/our-work-tools/documents/public-consultations/2025/guidelines-022025-processing-personal-data_sv?page=15)).
   Our design puts only salted commitments on chain. Is a written data protection impact
   assessment needed, and is this design enough?
4. **Names in records.** Breeder names, witness names, the asker's name on a check request,
   lab contact names, the label on a license invite: personal data of people who may not be our
   users. Lawful basis? Notice to them?
5. **Retention.** Lab reports (180 days), prove requests (7 days), license invites (30 days)
   and empty deals (7 days) have set periods. What periods should we set for records of people
   who stop using VeilCore, lab codes and sample details, deal messages, and backups after
   their 30-day lock? Can a backup lock period override a deletion request?
6. **Deletion limits.** Is our answer to a deletion request (server copy deleted; a tombstone
   with ID, proof code and time kept; anchors, proofs, published signatures and locked backups
   kept) acceptable under GDPR Article 17, the CCPA, Japan's APPI and Switzerland's FADP, and how
   must we say it?
7. **Where the servers are.** Which regions do Vercel, Railway, Blockfrost and Backblaze use
   for us? Are transfers out of the EU, UK, Japan or Switzerland covered (standard
   contractual clauses or similar)? Do we have each provider's data processing terms?
8. **Provider logs.** Vercel and Railway log addresses and requests. For how long, and must
   we name that period on the page?
9. **The record's name** is locked and travels in the holder's check links (after the #) and,
   if ticked, on a QR label; showing it on the public check page is opt-in. A forwarded link or
   a label carries the name too. Is that clear enough?
10. **Cannabis.** Some users work with cannabis genetics. Does holding their records raise
    data, licensing or disclosure concerns in the US, Japan or Switzerland, and should the
    terms say anything about lawful use?
11. **Ages.** Should the terms set a minimum age?
12. **Security incidents.** What must we notify, to whom, and how fast?
13. **The evidence bundle and declaration template.** They are marked "not legal advice". Is
    that enough, or do the terms need more?
14. **Test site.** The test site asks for made-up data and may be reset, and keeps its short
    note. Does it need its own, shorter terms?
15. **Training and breeding.** Nothing in the code uses records to breed, test or train
    anything. Should the page promise that, once the founders commit to it?
16. **Timestamp authorities.** Each one receives a SHA-256 of every proof code and the time, and
    some are run by one person. Do they need naming in full (the page says "such as FreeTSA and
    DigiCert"), and do we need terms with them?
17. **Payment partners.** Their receipts (amount, currency, account paid) are readable by anyone
    holding the statement's fingerprint. Is that the right default, and what must the page say
    before a payment feature of VeilCore's own is turned on?
18. **What a deletion keeps.** Each deleted record leaves a tombstone with the holder key's
    digest, and every proof code a holder key held stays tied to it for good, to stop takeovers.
    Is that a legitimate interest that survives an erasure request?
19. **Backblaze Object Lock.** The page says the bucket locks each copy for 30 days. Confirm the
    real bucket's setting before publishing.
20. **Rights wording.** The page says how to ask for access, deletion and correction by email.
    Must it name a supervisory authority, a response deadline, or the right to object and to
    portability in those words?
