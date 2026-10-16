# Animal records (16 Oct 2026, draft)

**In one line:** a breeder or a registry can log one animal, with its ID, its sire and dam,
and tie a DNA report to it, dated, using everything plant records already use.

The record fields are a draft (SPEC section 11.8). They are on the test site only: the
mainnet site doesn't offer "An animal" yet (`ANIMAL_RECORDS_ENABLED` in
`bboard-ui/src/config/network.ts`).

## The problem it answers

Branded beef is counterfeited. A label can carry a real animal's ID number, but nothing
dated and tamper-evident ties a DNA test to that specific animal. Herd books keep the
pedigree; they don't give each entry a date nobody can backdate.

## What a record holds

The profile is `veilcore/profile/animal-individual/v1`. One record is one animal.

| Field | Plain words | Needed? |
|---|---|---|
| Species | e.g. "Cattle (Bos taurus)" | yes |
| Breed | e.g. "Japanese Black" | no |
| Name | the animal's name | a name or an ID |
| Individual ID | the number on its ear tag or registration, as written | a name or an ID |
| ID scheme | which numbering the ID belongs to, free text: "Japan cattle ID (10 digits)", "ear tag" | yes, if there is an ID |
| Sex | female, male, or not stated | no |
| Date of birth | as the holder states it, or empty | no |
| Sire, dam | a logged animal (linked), or a name and an ID typed in | no |
| Breeder or holder | who logs it | yes |
| Herd or farm | | no |
| Notes, photos | photos are fingerprinted on the device, never uploaded | no |

## How it is sealed

Exactly as a plant: the same date stamp, the same random nonce, the same key the record
names (SPEC 3.6.1), the same backup. The fingerprint rules don't change at all. The profile
only says which fields go in and in what form:

- every field is present, empty where not given; no other field;
- one-line fields have no line breaks, tabs or spaces at either end, and at most 200
  characters;
- sex is `female`, `male` or `unknown`; date of birth is `YYYY-MM-DD` or empty;
- at most a sire and a dam, the sire first, each `{ role, name, individualId }` plus
  `recordId` when it is a logged animal.

A record in any other form is refused, never tidied: one animal written two ways would seal
as two records. The site (`bboard-ui/src/veilcore/animal-profile.ts`), the registry
(`lineage/animal-profile.mjs`) and the SDK (TypeScript and Python) all check this, against
the same vectors: `contract/vectors/animal-individual-v1.json`, made by
`contract/scripts/animal-individual-vectors.mjs` with no checker's code.

Plant records are untouched: a record without this profile is sealed and checked exactly as
before, and every published plant vector still matches byte for byte.

Inside the app an animal keeps the shared record shape (name in `strainName`, breeder in
`bredBy`, date of birth in `dateCreated`, species in `taxon`, individual ID in `refId`,
sire and dam in `parents`, the rest in `animal`), so every screen that shows a record's
name, date, photos, DNA report and key keeps working. What is sealed, and what an export's
`fields` carries, uses the profile's own names.

## What an animal record gets

- **A date nobody can backdate**, the same batch and anchor as a plant.
- **A DNA report tied to it:** saved on the device, paired with the record, and dated by a
  record of its own ("Date this DNA report"). The page says "Tied to the animal".
- **Sire and dam**, linked to their own records when the holder logged them; the family
  tree shows them by role.
- **Lab codes:** a lab signs a receipt for a sample (hair, blood) with its own key and can
  send a signed lab report back. The lab's received record names the animal (ID and scheme,
  species, breed, sex), never its herd, pedigree or notes.
- **Show someone:** the holder picks what the check page shows. Sire and dam, with their
  IDs, come under "Sire and dam"; the individual ID and its scheme under a switch of their
  own, off unless the holder turns it on.
- **Certificate and evidence bundle:** labelled for an animal (Individual ID, Sire, Dam);
  `verify.html` checks it offline like any other record.
- **Collection import:** a spreadsheet of animals, with column guesses for ID, sire, dam,
  date of birth, breed and sex (English and Japanese column names). The ID scheme is typed
  once for the file. A sire or dam whose ID is already logged here is linked to its record.

## What it doesn't get, and why

- **Claims (SPEC 4.5) are not offered.** The profile defines no field set. The distinct
  claim ("differs in at least k values") answers a question about varieties. An animal's
  DNA is asked about identity (is this sample from this animal?) and parentage (do the sire
  and dam fit?). Cattle tests for both commonly use standard STR panels, and increasingly SNP
  panels; either way the answer is a match or an exclusion a lab works out across two or
  three profiles. That is what the lab's signed report says; this format dates it and ties
  it to the record. (The claims themselves don't depend on SNP data: the example field set
  is SSR loci. The reason is the question, not the marker type.)
- **Agreements and royalties are not available for animal records yet.** Their terms speak of
  propagation and offspring declared from a variety. The plant page's "License it" row and
  the agreement screen say so for an animal.
- **No "next generation" row.** An animal's offspring is another animal logged with it as
  sire or dam.
- **A correction** changes an animal's name, breeder or notes; its ID, sex, sire and dam
  can't be corrected from the page yet.

## What it doesn't show

What any record doesn't (SPEC 9.3): that the description is true, that a carcass or a cut is
this animal, or who holds the animal now. The individual ID is the holder's statement; that
it belongs to the animal is for the scheme that issued it to say. VeilCore tests no DNA and
vouches for no one.
