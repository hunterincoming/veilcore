# Strain and line records (22 Oct 2026, draft)

**In one line:** a lab, a culture collection or a breeder can log one microbial strain, cell
line or insect line, with its deposit numbers and parent strains, and tie a DNA report to it,
dated, using everything plant records already use.

**Draft, test networks only.** The profile `veilcore/profile/strain/v1` (SPEC section 11.9)
may still change before it is marked final. "A strain or line" is offered only on test-network
builds (`STRAIN_RECORDS_ENABLED` in `bboard-ui/src/config/network.ts`). To offer it on
veilcore.org: mark SPEC 11.9 final, then switch that flag on. Strain records already made
show as strains everywhere, whatever the flag says. Test-network deploys refuse a registry
whose `/health` doesn't list `strain-profile-v1` (`scripts/registry-features.mjs`).

## Why one record type for all of these

A culture collection, a cell bank and an insect-rearing facility all record the same things:
what it is, what it's called, where copies are deposited, how it was made, which generation,
and what it came from. A new record type per organism would never become a standard. So one
profile, with a "kind" field:

bacterium, archaeon, yeast, filamentous fungus (mold, mushroom), microalga, protist, virus or
phage, cell line, insect line, something else.

## What a record holds

| Field | Plain words | Needed? |
|---|---|---|
| Kind | from the list above | yes (defaults to bacterium) |
| Species | e.g. "Saccharomyces cerevisiae" | yes |
| Strain name | | a name or a designation |
| Designation | the holder's own code, as in their lab book | a name or a designation |
| Deposit numbers | culture collection or patent deposit numbers, as the collection writes them, up to 8 | no |
| How it was made | wild isolate, neutron beam, heavy-ion beam, UV, chemical, adaptive evolution, cross, fusion, editing, subculture, or the holder's own words | no |
| Generation or passage | M2, P5, F3, as the holder writes it | no |
| Made or isolated on | as the holder states it | no |
| Parent strains | up to two: a logged strain (linked), or a name and deposit number typed in | no |
| Made or isolated by | | yes |
| Notes, photos | photos are fingerprinted on the device, never uploaded | no |

Ion and neutron beam irradiation are in the list on purpose: quantum-beam breeding is in real
use in Japan, including for brewing yeasts (RIKEN's heavy-ion beam work, for example).

## How it is sealed

Exactly as a plant or an animal: the same date stamp, nonce, key and backup. The fingerprint
rules don't change. The profile only says which fields go in and in what form, and a value in
any other form is refused, never tidied. The site (`bboard-ui/src/veilcore/strain-profile.ts`)
and the registry (`lineage/strain-profile.mjs`) check this against the same vectors,
`contract/vectors/strain-v1.json`, made by `contract/scripts/strain-vectors.mjs` with no
checker's code.

Inside the app a strain keeps the shared record shape: name in `strainName`, maker in
`bredBy`, date in `dateCreated`, species in `taxon`, designation in `refId`, method in
`breedingMethod`, a parent's deposit number in its `individualId`, and `strain` for kind,
deposits and generation.

## What works for a strain

- Logging it (the first screen's third choice), the "Is this right?" screen, sealing, the key's
  date stamp, the backup.
- Saving a DNA report (for a strain usually a genome sequence or a typing result) and dating it.
- Parent strains, linked to their own records when logged here.
- Labs: lab codes, signed receipts, signed reports; the offer a lab receives names the kind,
  deposits and generation, never the parents.
- Show someone: the parent strains with their deposit numbers under "Parent strains", the
  method under "How it was made", the maker under "Made or isolated by". The check page says
  "strain" throughout.
- The certificate, corrections, the evidence bundle (its verify.html and examiner summary label
  a strain's fields), the envelope export.

## What doesn't, yet, and why

- **Licensing and royalties.** A strain license turns on use, subculture and derived strains,
  not on cuttings or seed. The plant terms would say the wrong thing, so strains get none until
  they have terms of their own. The record page and the license page say so.
- **Next stage.** A derived strain is logged as a new strain with its parent linked.
- **Claims (SPEC 4.5).** Same reason as animals: the questions asked of a strain's DNA are
  identity and relatedness, answered by a lab's report, not a count of differing values.
- **Bulk import.** Rows import as plants or animals only.

## What it does not establish

A strain record shows a description of a strain existed by a date. It is **not a deposit**: it
does not replace depositing the strain with a recognised depositary, which is what patent
procedure relies on for microorganisms. A deposit number in the record is the holder's
statement until the depositary confirms it. It doesn't show a culture is viable, pure, or the
strain described; a DNA report tied to it, and a lab's signed report, are how that gets
checked.

## Translations

The form and every strain sentence are in English, Japanese, Spanish, German and French. The
non-English text is machine-assisted and needs a fluent speaker's check before veilcore.org
offers strains (`docs/translations/README.md`). `src/i18n/strain-words.test.ts` checks that no
strain sentence says plant, cultivar, variety or "bred" in any language.
