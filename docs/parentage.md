# A laboratory's parentage result (ICAR 2023)

What the site does with a laboratory's signed parentage result under the published form
`animal-parentage/v1`, and what that shows. Code: `bboard-ui/src/veilcore/parentage.ts`,
`marker-claims.ts` (what the panel offers), `components/document/ProveNumber.tsx` (the panel) and
`ClaimCheck.tsx` (the check page). No contract change: the claims are the frozen claims contract's
range claims and the laboratory's signature (`proveAttested`).

**Status: built, not yet run on the main network.** Lab signing is switched on at veilcore.org and
a laboratory's signed numbers have been proved on mainnet (a pathogen result, 18 Nov 2026,
`docs/lab-mainnet-test.md`). No parentage result has been signed and proved on mainnet yet. Until
it has, say "built, not yet run on the main network".

## In plain words

A breeder wants to show that a calf fits its stated sire and dam without showing anyone the
three DNA profiles.

1. The breeder sends the three samples to a laboratory, each under its dated record.
2. The laboratory genotypes them, counts the conflicts the way ICAR's 2023 guidelines say, and
   signs the counts under `animal-parentage/v1`. It sends the breeder the result file.
3. The breeder adds the file to their records and, from the result's page, proves five facts on
   Midnight: ICAR's acceptance bounds. No genotype and no count is published.
4. Anyone with the link can check it. Where every claim checks and a laboratory stands behind the
   numbers, the check page says:

> **Meets ICAR 2023 parentage acceptance.** A laboratory's signed parentage result, dated on
> Midnight. The holder proved it meets ICAR 2023 acceptance without showing the genotypes or the
> counts. The laboratory saw the genotypes. Consistent with descent is not proof of descent.
> VeilCore tested nothing.

Under it: the five bounds proved, and that ICAR's minimum of 165 SNPs the two parents share, for
the trio, is the laboratory's to apply and no claim shows it.

That sentence is the claim, all of it. Never say "private parentage test", "proves the sire", or
anything about ownership.

## ICAR 2023's rules, as the site uses them

From ICAR, *Guidelines for Parentage Verification and Parentage Discovery Based on SNP Genotypes*
(May 2023), verification on the 195-SNP ISAG panel:

| Test | Accepted | Doubtful | Excluded |
|---|---|---|---|
| One parent (opposing homozygotes) | 0 to 2 conflicts | 3 to 5 | more than 5 |
| Trio (both parents homozygous for one allele, offspring heterozygous) | 0 to 3 | 4 to 7 | more than 7 |

At least 175 SNPs called in common for the offspring and each parent, and 165 for the trio step.

## What the panel offers

On an `animal-parentage/v1` result, "Prove one number" offers exactly these, in this order, each
with a fixed bound:

| Offer | Slot | Claim |
|---|---|---|
| Conflicts with the sire | 3 | at most 2 |
| Conflicts with the dam | 6 | at most 2 |
| Conflicts across the trio | 8 | at most 3 |
| SNPs compared with the sire | 2 | at least 175 |
| SNPs compared with the dam | 5 | at least 175 |

- **The bound is ICAR's, never rounded from the count.** Every other genotype form fills a bound
  rounded away from the exact count, so the count stays private. On a parentage result that gave
  "at most 5" for any count from 0 to 4: the top of ICAR's doubtful band, underselling an accepted
  result. A fixed class bound also publishes less: only the band.
- **A bound the lab's number doesn't meet is not offered.** A sire with 4 conflicts gets no claim
  about the sire at all, never "at most 5", and the panel says why. If nothing meets ICAR's
  bounds, the panel says that instead of offering anything.
- **Never "(ICAR accepted)" for a test the laboratory didn't accept.** A conflict claim is offered
  only where the lab's own grade for that test (slots 4, 7 and 9) is 0, accepted. A missing
  grade is not accepted.
- **The trio only once both parents are accepted.** ICAR runs the trio step on parents already
  accepted, so a trio claim is offered only when both parents' counts and grades are accepted. A
  doubtful sire with a low trio count gets neither. The compared minimums are facts about the
  panel and are offered whenever they are met.
- **Nothing else.** No "at least" on a conflict count or "at most" on a compared count (they say
  nothing anyone asked), no exact values, not the lab's grades, not the registration numbers. A
  link carries at most five claims (`claim-link.ts`), and the five acceptance claims fill it.
- **The panel shows the bands** in plain words, and a parentage result's limits (below).
- The page and the call both enforce the list (`offerAllowed`, `prove-number.ts`). It is the
  site's policy: the claims contract has no such rule, and another client could prove any slot in
  any direction. The check page says "meets ICAR 2023 acceptance" only for the five bounds or
  stricter ones (`meetsAcceptance`).

## When the check page says "meets ICAR 2023 acceptance"

All of these, or it doesn't (each claim is then said on its own, in the laboratory's words where
it stands behind the numbers and in the holder's otherwise):

- the link carries all five claims, on one record, under `animal-parentage/v1`, each at least as
  strict as ICAR's bound;
- every one of them checked on Midnight;
- a laboratory stands behind the numbers: its signature checks, one laboratory is tied to the key
  through its own binding, and it hasn't withdrawn the result (`labStands`, `claim-call.ts`).

The page also says ICAR's bands, that the numbers are the laboratory's counts and not a breed
society's decision, and the limits.

## What it doesn't show

- **Private from the world, not from the laboratory.** The laboratory saw the three genotypes and
  the counts, as it does today. The trust left is in the laboratory: that it genotyped the right
  samples, counted correctly, and that its key is its own.
- **Consistent with descent is not proof of descent.** A close relative of the true parent can
  pass. In the research prototype's simulation on 195 SNPs, a full brother of the true sire was
  wrongly accepted 0.1 to 0.3 % of the time (synthetic data, unlinked loci; not a lab figure).
- **The trio's SNPs in common.** The form has no slot for the SNPs the two parents share (ICAR's
  minimum of 165 for the trio step). The laboratory applies it before it grades the trio; no
  claim shows it.
- **Which animals.** The claim is about the result record. The calf, sire and dam (by proof code),
  the panel and the method are in the laboratory's result file, not in the claim.
- **The animal in front of you.** A result says what the samples sent under those records showed,
  not that an animal is the one sampled (SPEC 9.3, 11.8).
- **A breed society's certificate.** It is not one. VeilCore tested nothing and vouches for no
  laboratory. Which laboratory keys count is for a breed society or a body that approves
  laboratories to publish; a laboratory can list its key on its own website
  (`docs/lab-domain-keys.md`).
- **Later results.** It is about the result as signed. The laboratory may have corrected it or
  tested again since.
- **Who can publish.** Anyone holding the record's numbers and its field secret can make claims:
  the holder, and the laboratory too.

## Not done here

- **A mainnet run.** First the test network, then a run by the maintainer in the style of
  `docs/lab-mainnet-test.md`: a laboratory signs an `animal-parentage/v1` result built from
  practice numbers, the holder proves the five bounds, a stranger checks the link.
- **The sire's registration number.** The form holds it (slot 10), and a certificate usually names
  the sire. Proving it would be a sixth claim, one more than a link carries, and it publishes the
  number itself. Left for a decision.
- **`lineage-check/v1`**, the generic parentage call inside lab results v2, keeps its existing
  offers (the call, conflicts with each parent, markers compared). For animals,
  `animal-parentage/v1` is the form that matches what a breed society reads.
- **The genotypes inside the proof** (the laboratory signs genotypes, the proof computes ICAR's
  counts, and two owners need not swap DNA). That needs a new, audited contract and is a research
  prototype only.
