# Laboratory-signed numbers, and genetic similarity

Status: built, in this repo. Not live on veilcore.org until a laboratory signature has been
published and checked once on mainnet.

## The problem

A breeder applying for plant variety protection must show the new variety is distinct from every
variety already known. More and more, the evidence is genetic. For soybean, the USDA Plant
Variety Protection Office uses a SNP method as a confirmatory tool: genotype the variety on the
BARCSoySNP6K panel and compute its similarity to known varieties (identical SNP calls divided by
SNPs called in both). The paper behind it (Crop Science, 2020) treats 96 % similarity as a
conservative point of demarcation. For maize, the International Seed Federation's guidelines on
essentially derived varieties use SNP similarity the same way, with thresholds that shift the
burden of proof.

Breeders don't want to hand over the genotype. The seed trade's own position (ASTA) is that
genetic data can reveal confidential business information, and that the breeder should state
whether the variety meets a threshold instead of disclosing the raw data. UPOV's working group
reports the same fear of molecular data leaking.

Before this, VeilCore could already prove one number without showing it ("prove one number",
docs/claims-screen.md). What it could not show is who measured the number: the numbers were the
holder's as typed.

## What this adds

1. **Three published forms** (`bboard-ui/public/schemas/`, served at `/schemas/`): soybean
   (`soybean-snp-similarity/v1`), maize (`maize-snp-similarity/v1`) and any crop, fungus or other
   organism (`genetic-similarity/v1`, where the certificate names the panel and method). Same four
   numbers in each: similarity to the closest variety compared (percent, two decimals), markers
   compared, markers that differ, varieties compared against.
2. **A laboratory signs the record.** The holder downloads a request; the laboratory opens it at
   `/lab` with its key, reads every number and field against its own report, signs, and sends back
   a signature file. The holder adds it to the record. Nothing passes through VeilCore.
3. **The signature goes on Midnight**: the claims contract's `proveAttested` (deployed with the
   claims contract; no contract change) publishes the laboratory's key and the record it signed.
   The numbers stay private.
4. **Claim links carry it.** A link to "similarity to the closest variety is at most 95.00 %"
   also names the `proveAttested` transaction. The check page reads both from Midnight and says
   which key signed the numbers.

So a breeder can show an examiner, a buyer or a court: "a laboratory with this key measured this
variety at no more than 95 % similar to anything it was compared with", dated, without the
genotype, the exact figure, or which variety was closest.

## Files

| File | Who makes it | Holds |
| --- | --- | --- |
| `…-lab-request.json` | the holder | the record's sealed fields, its numbers and their field secret, and the commitment to sign |
| `…-veilcore-lab-key.json` | the laboratory, once | the laboratory's signing secret and public key. Never leaves the laboratory. |
| `…-lab-signature.json` | the laboratory | the commitment, the public key, the Schnorr signature. No numbers. |

## What it shows, and what it doesn't

- Shows: the key signed exactly this record (every number and every sealed field, through the
  record commitment, SPEC 4.5), and the claim's bound holds for the number in it.
- Doesn't show whose key it is. The site says so every time. A laboratory publishes its key on its
  own website and reports, and the checker compares. A list of known laboratory keys is a later
  step, not this one.
- Doesn't show the certificate is genuine, or that the laboratory's method was sound.

## Security notes

- The signing is `contract/src/attest.ts`, the code the contract's own tests check against
  `schnorr.compact`; the browser's randomness comes from `crypto.getRandomValues`
  (`src/shims/node-crypto.ts`). Nonces are 512 random bits reduced mod the group order.
- The signature binds the record commitment, so it can't be moved to another record, even one
  with the same numbers (fresh salts make a different commitment). Tested against the contract
  circuit in the simulator (`lab-attest.test.ts`).
- The request gives the laboratory the field secret. It already knows the numbers; with the
  secret it could also make claims about this record. That's the trust the holder already gives
  the laboratory that measured them.
- The laboratory's key file is the laboratory's identity here. If it leaks, anyone can sign as it.
  There is no revocation on chain; a laboratory that loses its key publishes a new one and says
  from when.
- A stored signature is checked again against the record every time the page opens, so a record
  restored or edited by hand never shows "signed" when it no longer is.

## Sources

- USDA AMS, PVPO notice 12, soybean molecular marker similarity method (Jan 2021).
- "Single nucleotide polymorphisms facilitate distinctness-uniformity-stability testing of soybean
  cultivars", Crop Science (2020), doi:10.1002/csc2.20201.
- UPOV BMT/20/5 (2021), on breeders' concerns about molecular data.
- ISF guidelines for handling disputes on essentially derived varieties (maize).
