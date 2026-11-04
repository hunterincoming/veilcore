// The record app in English: a laboratory's signature on a document's numbers
// (veilcore/lab-attest.ts; docs/lab-attested-similarity.md). The /lab page, the panel on a
// document's page, the genetic similarity forms, and what the claim check says about it.
// SPDX-License-Identifier: Apache-2.0

export const attest = {
  // The genetic similarity forms (public/schemas/*-similarity-v1.json).
  'app.doc.schema.soybean-snp-similarity': 'Soybean genetic similarity (SNP, BARCSoySNP6K)',
  'app.doc.schema.maize-snp-similarity': 'Maize genetic similarity (SNP)',
  'app.doc.schema.genetic-similarity': 'Genetic similarity (any crop or strain)',
  'app.doc.slot.similarity': 'Similarity to the closest variety',
  'app.doc.slot.markersCompared': 'Markers compared',
  'app.doc.slot.markersDiffering': 'Markers that differ',
  'app.doc.slot.varietiesCompared': 'Varieties compared against',
  'app.doc.nums.badWhole': 'A whole number, like 5103.',
  'app.claim.boundBadWhole': 'A whole number.',

  // On a document's page: getting the laboratory's signature, and publishing it.
  'app.labnums.title': 'Numbers from this report, signed by you (optional)',
  'app.labnums.text':
    'Pick the form and type the numbers exactly as in your report. They are sealed into a record you sign and sent locked with the report. The breeder can then prove one number without showing the others, as a number your lab signed.',
  'app.labnums.resultTitle': 'Name of this result (your report reference)',
  'app.labnums.inReport': 'Numbers the lab signed with this report ({form}):',
  'app.labnums.addText':
    'Add them as a record you hold. Then you can publish the lab’s signature on Midnight and prove one number at a time.',
  'app.labnums.add': 'Add the signed numbers as a record',
  'app.labnums.openRecord': 'Open the record with these numbers',
  'app.labnums.cantUse': 'This report carries numbers that can’t be used: {reason}',
  'app.labnums.otherPlant': 'they are about a different plant.',
  'app.labnums.otherReport': 'they name a different report file.',
  'app.attest.title': 'Laboratory signature',
  'app.attest.signedBy': 'Signed by laboratory key {key}.',
  'app.attest.publishText': 'Publish the signature on Midnight, so the links you copy can show it.',
  'app.attest.publish': 'Publish it on Midnight',
  'app.attest.publishing': 'Publishing…',
  'app.attest.published':
    'Published on Midnight in block {block}. The links you copy under “What you’ve proved” now include it.',
  'app.attest.stale': 'The signature kept with this record no longer checks against it. Add it again.',

  // What "Prove one number" says once the numbers are signed.
  'app.claim.labSigned': 'Laboratory key {key} signed these numbers, and the links include that signature.',

  // The claim check page, when the link names a laboratory signature.
  'app.claim.check.labOk':
    'The numbers in that record were signed with key {key}, published on Midnight in block {block}{date}.',
  'app.claim.check.labWithdrawn': 'The laboratory has withdrawn this signature. Read the numbers as the holder’s own.',
  'app.claim.check.labConflict':
    'More than one laboratory claims this key, so no name is shown. Read the numbers as the holder’s own.',
  'app.claim.check.labUnidentified':
    'No laboratory has said this key is theirs for this record. Read the numbers as the holder’s own.',
  'app.claim.check.labAbout': 'The results are about the record with proof code',
  'app.claim.check.labFieldSecret': 'The laboratory knows these numbers too, and could prove things about them itself.',
  'app.claim.check.labKey': 'Laboratory key',
  'app.claim.check.labFailed':
    'The laboratory signature isn’t confirmed: {reason} Read the numbers as the holder’s own.',
  'app.claim.check.whatLab':
    'What this shows: the number sealed in that record meets the bound (or is that value), and the key above signed that record’s numbers. What it doesn’t: whose key that is, or that the certificate is genuine. Every bound proved about a number is public, and together they narrow it.',
};
