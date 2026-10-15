# Require a VeilCore record

For membership schemes, genetics libraries, breed and plant registries, lab intake desks,
marketplaces and rights bodies that want each applicant to bring a VeilCore record. Part 1
is for the person running the program. Part 2 is for whoever looks after the website or
the intake system.

You can set this up without talking to VeilCore. Checking is free, needs no account, and
needs no agreement with us.

---

## Part 1: for the program manager

### What a VeilCore record is

The applicant writes down what their material is (a plant, a line, an animal, a lot) on
veilcore.org or in their own software. Their computer makes a fingerprint of that
description: a short code that changes if one letter of the description changes. The
description stays with them. Only the fingerprint goes to VeilCore's registry, and from
there into a date stamp on Midnight, a public blockchain.

They send you a **check link**. Anyone can open it.

### What requiring a record gives you

- **A fixed description.** The record was sealed before they applied. If they later show
  you the description, you can tell whether it is the one they sealed. Nobody can quietly
  change it afterwards.
- **A date.** Once the record is in a dated batch, anyone can look up when its fingerprint
  existed by. The date comes from Midnight, not from VeilCore and not from the applicant.
- **Lab signatures, checked.** If a lab signed a receipt for a sample, or a lab report,
  you see it, and whether VeilCore's operator matched the lab's name to a public licence
  or accreditation listing.
- **A key.** Records made since 14 October 2026 name the depositor's key. They can later
  prove they still control the record.
- **The same check for everyone.** Every applicant's link is checked the same way, by your
  page, in a few seconds.

### What it does not give you

VeilCore never vouches. The check tells you what was checked and whose word the rest is.
It does not show:

- what the material is. VeilCore never sees genetics;
- that the description is true. It only shows the description hasn't changed;
- who holds the material, or the record, today;
- that a lab's work is right. A checked name means VeilCore's operator matched the name
  to a public listing on a given day, nothing more;
- parentage. Parents named in a record are the depositor's word;
- any right, licence or legal status.

A date on a test network ("preprod") is practice data and carries no weight.

### What the applicant does

1. Makes a record for each accession (on veilcore.org, or their own software using the
   open format).
2. Opens the record, chooses **Show someone**, picks what the check page may show, and
   presses **Copy link**. The link looks like `https://veilcore.org/verify/VEIL-…?fp=…`.
   The QR code on the record's certificate holds the same kind of link.
3. Pastes it into your form, one per accession.

If your rules ask for more, they can also send their **evidence bundle** (a zip they
download from the record's page). It lets you check everything with no VeilCore at all.

### What you do

1. Add the VeilCore field to your application form (Part 2: one line of HTML), or ask for
   links by email and paste each one into the field on veilcore.org/partners.
2. Decide what you accept. For example:

| Level | You accept a record when… |
|---|---|
| Basic | the record exists and the link matches it |
| Dated | …and it has a date stamp on Midnight's main network |
| Lab-backed | …and a lab whose name VeilCore's operator checked signed a receipt for a sample |
| Full | …and the applicant gave you the sealed description (from the evidence bundle), and it matches |

3. Keep the check result with the application. The form field hands it to your page.

### Cost

Free to check, for you and for everyone else. No account, no key, no contract with
VeilCore. The field and the library are open source (Apache-2.0).

### Sample policy wording

> **Sample text, not legal advice.** Adapt it to your own rules and have it reviewed by
> whoever reviews your rules.

For a membership:

> Applicants must provide a VeilCore record check link for each accession they deposit.
> The record must exist, and the link must match it. [Program] checks each link when the
> application is received and keeps the result with the application.
>
> A VeilCore record is the applicant's statement about their material, fingerprinted and
> dated. Accepting a record does not mean [Program] or VeilCore confirms what the material
> is, who holds it, or any right in it.

For a registry or library accession:

> Each accession must carry a VeilCore record check link. Records must be dated on
> Midnight's main network before the accession date. Where a lab receipt is claimed, it
> must be signed by a lab whose name VeilCore's operator has matched to a public listing.
> [Registry] may ask the depositor for the record's evidence bundle and, under
> confidentiality, the sealed description, and may refuse an accession whose description
> does not match its fingerprint.

For a marketplace listing:

> Listings of genetic material must link a VeilCore record. The listing shows the record's
> check result. [Marketplace] does not confirm the material or the seller's rights by
> showing it.

---

## Part 2: technical

Status, 15 October 2026: the kit is in `partner-kit/record-check` of the VeilCore
repository. It is **not on npm yet**; until it is, build it there (`npm run build`) and
copy the files below.

### The form field

One self-contained file, `veilcore-record-check.js` (about 33 KB). Put it on your own
site (don't load it from someone else's), then:

```html
<script type="module" src="/vendor/veilcore-record-check.js"></script>

<form action="/apply" method="post">
  <veilcore-record-check name="veilcore_link" required></veilcore-record-check>
  <button>Apply</button>
</form>
```

- `required`: the form won't submit until the link leads to a record that exists and
  matches the link.
- `name`: the field's name in the submitted form. The value is the link.
- `registry`: which registry to ask. Default: VeilCore's public registry. It is never
  taken from the pasted link: a stranger's link must not choose who answers for it.
- `check-page`: where "Open the full check page" points. Default `https://veilcore.org`.
- `label`, `value`: the field's label and starting value.
- Event `veilcore-check` (bubbles out of the field): `event.detail` is the full answer
  (below). Keep it with the application, or apply stricter rules than `required`:

```js
document.addEventListener('veilcore-check', (e) => {
  const c = e.detail;
  const dated = c.dated.checkedOnChain && !c.dated.testNetwork;
  const labBacked = c.labReceipts.some((r) => r.counts && r.kind === 'lab-receipt' && r.signer.nameCheck === 'checked');
  // your rule here
});
```

The check runs in the visitor's browser. In the browser the date stamp is shown as the
registry's report; the field links to the full check page, which looks it up on
Midnight. To look it up yourself, use the library on your server (below).

**Content Security Policy.** `script-src` must allow wherever you serve the file (usually
`'self'`) and `connect-src` must allow the registry
(`https://veilcore-api-production.up.railway.app` by default). Nothing else: no
`style-src` exception in current browsers (styles are a constructed stylesheet), no
images, frames or fonts. It writes no HTML strings, so it works with
`require-trusted-types-for 'script'`. It is tested under
`default-src 'none'; script-src 'self'; connect-src <registry>; style-src 'none';
require-trusted-types-for 'script'; trusted-types 'none'`.

**Privacy.** No cookies, no storage, no tracking, no analytics. The only requests are the
three public reads below, sent with no credentials and no referrer.

**Accessibility.** A real label, a hint, and a status line read out by screen readers.
Keyboard only works (Enter checks; focus stays put). Each line starts with a word
("Checked:", "Registry's word:", "Not counted:"), so nothing depends on colour. Touch
targets are 44 px. Colours can be changed with CSS custom properties on the element:
`--vc-accent`, `--vc-ink`, `--vc-muted`, `--vc-line`, `--vc-paper`, `--vc-bad`,
`--vc-warn`.

### The library (Node or browser)

```js
import { checkRecord } from '@veilcore/partner-kit';

const c = await checkRecord('https://veilcore.org/verify/VEIL-…?fp=…', {
  fields,                           // optional: the sealed description (record/sealed-fields.json)
  chain: { blockfrostProjectId },   // optional, Node: look the date stamp up on Midnight
});
```

The date stamp look-up uses `checkBatchAnchor` from `@veilcore/contracts`
(`npm install --save-exact @veilcore/contracts@0.2.0` beside it). The transaction must
be a single date stamp call at VeilCore's pinned contract (never the address the registry
names), carry the pinned build's verifier keys, and leave exactly this batch root in the
contract. Give `chain.indexer` and `chain.secondIndexer` to ask indexers you choose; with
two, both must agree.

It throws `LinkError` for a link that names no record and `RegistryError` when the
registry can't be asked. Everything else is in the answer:

```jsonc
{
  "format": "veilcore-record-check/v1",
  "recordId": "VEIL-…",
  "recordExists": true,
  "fingerprintMatches": true,          // null: the link names no fingerprint; false: don't rely on it
  "fingerprint": "…",
  "disclosedFieldsMatch": null,        // true/false when you passed `fields`
  "dated": {
    "status": "checked-on-chain",      // or reported, not-confirmed, not-looked-up, no-date-stamp, not-in-a-batch, not-checked
    "checkedOnChain": true,
    "inBatch": true, "batch": "B-…", "batchRoot": "…",
    "network": "mainnet", "testNetwork": false,
    "txId": "…", "blockHeight": 123, "blockTime": "2026-10-11T10:00:07.000Z",  // from the chain only
    "reportedDate": "…",                // the registry's word
    "bitcoinStamp": "bitcoin",         // or pending, or null (the registry's report)
    "reason": "…"
  },
  "keyBound": { "recordNamesKey": true, "keyInLink": "matches", "key": "…", "reason": "…" },
  "labReceipts": [{
    "kind": "lab-receipt",             // or lab-report, signed-statement
    "signatureVerified": true, "withdrawn": false, "counts": true,
    "signer": { "publicKey": "…", "registeredName": "…", "nameCheck": "checked" },  // or not-checked, expired, withdrawn
    "nameCheckRecord": { "listing": "https://…", "listingHost": "…", "number": "TL-1", "numberKind": "license", "checkedOn": "…", "expiresOn": "…" },
    "matchesSavedReport": null,         // lab reports: is it the report saved to the record now?
    "words": "Lab's receipt for a sample, signature verified, signed by … VeilCore doesn't vouch for the lab's work."
  }],
  "labReceiptsTotal": 1,
  "registryFirstSeen": "…",            // the registry's clock
  "supersededBy": null,
  "summary": "Record found, and the link's fingerprint matches the registry's. …",
  "whatThisDoesNotShow": ["…"],
  "problems": []
}
```

What is checked where: the link's fingerprint against the registry's answer, the
inclusion proof (the fingerprint is in the batch and folds to its root), every signature
and withdrawal (Ed25519), the lab report pairing, the key in the link, and the sealed
description are all recomputed by the kit. Whether a record exists, when the registry
first saw it, and the name check record are the registry's word, and the answer says so.
Nothing is checked against a fingerprint the link doesn't name: with no `fp=` in the link
the answer says the checks used the registry's fingerprint, and with a different one it
checks nothing.

### The command

```sh
npx @veilcore/partner-kit check 'https://veilcore.org/verify/VEIL-…?fp=…'
npx @veilcore/partner-kit check '<link>' --fields sealed-fields.json --on-chain --text
```

JSON by default, plain words with `--text`. Exit status 0: the record exists, the link
matches, and nothing you gave contradicts it; 1: the check ran and that is not so; 2:
nothing could be checked. Exit 0 is not a verdict about the material: read the answer.
`--indexer`, `--second-indexer`, `--blockfrost-project-id` (or
`VEILCORE_BLOCKFROST_PROJECT_ID`) and `--registry` as in the library.

### The registry's public routes

All are free, need no key, and allow any origin (CORS).

| Route | What it answers |
|---|---|
| `GET /verify/:id[?show=…]` | The record as its holder chose to share it: fingerprint, whether it names its key, lab report pairing (if shared), the registry's anchor report. |
| `GET /proof/:fingerprint` | The inclusion proof: batch, path, root, the anchor the operator reported, the Bitcoin stamp status. |
| `GET /attestations/subject/:fingerprint?limit=&offset=` | Lab signatures about the fingerprint, with withdrawals and name check records (100 a page, `total`). |
| `GET /records/:id` | The public view of a record. |
| `GET /batches`, `/batches/:id/root.bin`, `/batches/:id/root.bin.ots` | Batches, and each batch root's Bitcoin stamp file (OpenTimestamps). |
| `GET /.well-known/veilcore-registry` | Which network and contract this registry anchors to. |

Rate limits: 600 reads a minute per client address (per /64 for IPv6); over that, `429`
for the rest of the minute. One check is three reads.

The older `GET /embed.js` badge shows the registry's report as HTML. It checks nothing in
the visitor's browser and needs `innerHTML`, so it does not run under Trusted Types. For
intake, use the field above.

### Checking without VeilCore

Ask the applicant for the record's **evidence bundle** (`docs/evidence-bundle.md`). Its
`verify.html` runs offline and recomputes the fingerprint from the sealed description,
the batch proof, the key, the lab report pairing and every signature. It then says which
transaction to look up on a Midnight explorer and how to check the Bitcoin stamp with the
OpenTimestamps client. The format is open (`SPEC.md` in veilcore-sdk), and the SDK
(`veilcore-records`) and this kit are Apache-2.0: if VeilCore disappeared, records would
still check.
