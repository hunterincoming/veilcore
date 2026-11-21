# A laboratory's parentage result (ICAR 2023)

What the site does with a laboratory's signed parentage result under the published form
`animal-parentage/v1`, and what that shows. Code: `bboard-ui/src/veilcore/parentage.ts`,
`marker-claims.ts` (what the panel offers), `components/document/ProveNumber.tsx` (the panel) and
`ClaimCheck.tsx` (the check page). No contract change: the claims are the frozen claims contract's
range claims and the laboratory's signature (`proveAttested`).

**Status: live on veilcore.org since 21 Nov 2026.** A DEMO lab signed an animal-parentage/v1
result with invented counts; the holder, in a second browser, published it (block 3553789) and
proved the five bounds (blocks 3553856, 3553891, 3554384, 3554445, 3554479); a stranger's check
page confirms five of ICAR 2023's parentage checks (conflicts with the sire, the dam and the trio;
SNPs compared with each parent). ICAR's minimums of 185 SNPs read for each animal and 165 read in
all three are applied by the lab, not proved.
Each proof took about 2–3.5 minutes in a desktop browser; five proofs on an older phone may run
out of memory, so do parentage on a computer for now.

## In plain words

A breeder wants to show that a calf fits its stated sire and dam without showing anyone the
three DNA profiles.

1. The breeder sends the three samples to a laboratory, each under its dated record.
2. The laboratory genotypes them, counts the conflicts the way ICAR's 2023 guidelines say, and
   signs the counts under `animal-parentage/v1`. It sends the breeder the result file.
3. The breeder adds the file to their records and, from the result's page, proves five facts on
   Midnight: ICAR's conflict bounds and its minimum of SNPs compared with each parent. No genotype
   and no count is published.
4. Anyone with the link can check it. Where every claim checks and a laboratory stands behind the
   numbers, the check page says:

> **Meets five of ICAR 2023's parentage checks.** A laboratory's signed parentage result, dated on
> Midnight. The holder proved, without showing the genotypes or the counts, that it meets ICAR
> 2023's conflict limits and its minimum of SNPs compared with each parent. The laboratory saw the
> genotypes. Consistent with descent is not proof of descent. VeilCore tested nothing.

Under it: the five bounds proved, and "Not proved": ICAR's minimums of 185 SNPs read for each
animal and 165 read in all three of the offspring, sire and dam. The form has no number for them;
the laboratory applies them.

That sentence is the claim, all of it. Never say "private parentage test", "proves the sire", or
anything about ownership. Never "meets ICAR 2023 acceptance" either: ICAR's acceptance also needs
its minimums of SNPs read for each animal and in all three of the trio, and the form carries
neither. The page says which five checks were proved and which two minimums were not.

## ICAR 2023's rules, as the site uses them

From ICAR, *Guidelines for Parentage Verification and Parentage Discovery Based on SNP Genotypes*
(May 2023), verification on the 195-SNP ISAG panel:

| Test | Accepted | Doubtful | Excluded |
|---|---|---|---|
| One parent (opposing homozygotes) | 0 to 2 conflicts | 3 to 5 | more than 5 |
| Trio (both parents homozygous for one allele, offspring heterozygous) | 0 to 3 | 4 to 7 | more than 7 |

The minimums (verification, point 3 and steps 1 and 2):

| Minimum | ICAR's number | What it counts | On the form? |
|---|---|---|---|
| Each animal | 185 (95% of 195, rounded down) | SNPs called for that animal, offspring and each parent | No |
| Offspring and one parent | 175 = 195 - 2 x (195 - 185) | SNPs called in both | Yes, slots 2 and 5 |
| Trio step | 165 = 195 - 3 x (195 - 185) | SNPs called in all three: offspring, sire and dam | No |

The trio's 165 is not "SNPs the two parents share": it is what is left when each of the three
animals may miss up to 10 SNPs.

The February 2025 revision (on ICAR's site as "Revised February 2025, reviewed together with
Applicants Guide October 2025") keeps every verification number above: the 195-SNP panel, 185,
175 and 165, and both sets of bands. It also has parentage discovery on 554 SNPs (percent bands),
which the site does not use.

Sources: [May 2023](https://www.icar.org/wp-content/uploads/documents/Guidelines-for-Parentage-Verification-and-Parentage-Discovery-Based-on-SNP-Genotypes-May-2023.pdf),
[February 2025, reviewed October 2025](https://www.icar.org/wp-content/uploads/documents/Guidelines-for-Parentage-Verification-and-Parentage-Discovery-Based-on-SNP-Genotypes-October-2025.pdf).
The documents have no page numbers; the rules are under "Parentage verification", point 3 and
steps 1 and 2.

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
- **Never "(within ICAR's accepted band)" for a test the laboratory didn't accept.** A conflict claim is offered
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
  any direction. The check page says "meets five of ICAR 2023's parentage checks" only for the five bounds or
  stricter ones (`meetsAcceptance`).

## When the check page says "meets five of ICAR 2023's parentage checks"

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
- **ICAR's other two minimums.** The form has no slot for the SNPs called for each animal (ICAR's
  minimum of 185) or the SNPs called in all three of the offspring, sire and dam (ICAR's minimum
  of 165 for the trio step). The laboratory applies them before it grades; no claim shows them,
  and the page says "Not proved". At least 175 compared with each parent does not imply 185 for
  each animal: an offspring with 180 SNPs called can still have 180 in common with a parent.
  Showing them would need a new form with slots for them and more than five claims on a link.
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

- **A phone run.** The 21 Nov 2026 mainnet run (status above) used a desktop browser. Five
  proofs in a row on a real phone have not been tried.
- **The sire's registration number.** The form holds it (slot 10), and a certificate usually names
  the sire. Proving it would be a sixth claim, one more than a link carries, and it publishes the
  number itself. Left for a decision.
- **`lineage-check/v1`**, the generic parentage call inside lab results v2, keeps its existing
  offers (the call, conflicts with each parent, markers compared). For animals,
  `animal-parentage/v1` is the form that matches what a breed society reads.
- **The genotypes inside the proof** (the laboratory signs genotypes, the proof computes ICAR's
  counts, and two owners need not swap DNA). That needs a new, audited contract and is a research
  prototype only.
