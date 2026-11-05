# VeilCore and the genetic-resources treaties

Written 5 November 2026, after an outside standards review found the docs said nothing
about the Nagoya Protocol, the Plant Treaty (ITPGRFA) or digital sequence information
(DSI). Governments that might one day lean on VeilCore read every proposal through these
treaties, so where VeilCore stands has to be plain. Not legal advice.

## The position

- **VeilCore is not a system for tracking genetic sequence data.** It never receives
  sequences or genotypes in readable form: what reaches its servers is a fingerprint, the
  holder's own copy locked with a key only the holder has, and the few readable fields that
  let a record be found and checked (`docs/privacy-and-data-terms.md`). It dates a holder's own record of their own material, by a
  fingerprint, and the holder shows a record, or one fact from it, only when they choose.
- **It doesn't decide or report anyone's benefit-sharing.** It records nothing on anyone's
  behalf and sends nothing to any authority.
- **It can hold, privately, what a holder already has to keep.** A permit number, a
  transfer agreement's ID, or the document itself, kept with the record it covers and shown
  only when the holder chooses (for example to an office, a buyer or a court).

## Why the line matters

- **DSI is contested.** At the Plant Treaty's Governing Body (GB-11, November 2025) the
  parties agreed to note that its information system, GLIS, "is not currently serving as a
  repository for, or a tracking and tracing system of, DSI/GSD", and the Netherlands, Egypt,
  Sweden and the United States asked to delete text noting progress on DSI benefit-sharing
  elsewhere ([ENB 9:878](https://enb.iisd.org/sites/default/files/2025-11/enb09878e.pdf)).
  A tool pitched as DSI tracking would meet the same resistance from those governments.
- **The Cali Fund** (CBD decision 16/2) asks companies that use DSI to contribute. Its
  design is still being argued. VeilCore takes no side and makes no claim about it.
- **Cannabis** stays one profile, never the headline, in any conversation with a UN body or
  a government: they work under the drug conventions.

## Where VeilCore helps without taking a side

- **Nagoya Protocol.** A holder can keep the internationally recognised certificate of
  compliance (IRCC) number from the ABS Clearing-House with the record of the material it
  covers, dated, and prove it later without publishing the record.
- **Plant Treaty.** A holder can keep the Standard Material Transfer Agreement (SMTA) ID
  and the GLIS DOI of the accession they received, the same way.
- **WIPO Treaty on Intellectual Property, Genetic Resources and Associated Traditional
  Knowledge** (adopted 24 May 2024; binding once in force): patent applicants must disclose the country of origin
  or source of genetic resources an invention is based on. A dated record of where material
  came from, made at the time, is evidence for that disclosure.

None of this needs a new field type. The number goes in the record's notes, and the
permit or agreement itself can be kept as a document record (`docs/document-profile.md`)
about the plant or animal record: fingerprinted on the device, dated, and shown only when the
holder chooses. Typed fields that check the formats (IRCC, SMTA, GLIS DOI) are a possible later
step, after a lawyer and a user have asked for them.

## Words to use and to avoid

| Use | Avoid |
| --- | --- |
| a dated record of your own material | DSI traceability, sequence tracking |
| shown only when you choose | compliance reporting, monitoring |
| evidence of where material came from, and when | proof of legal access, proof of benefit-sharing |
| prior possession | ownership |
