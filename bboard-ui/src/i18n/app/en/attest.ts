// The record app in English: a laboratory's signature on a document's numbers
// (veilcore/lab-numbers.ts; docs/lab-signing.md). What a lab adds when it sends a report,
// what the breeder sees, the panel on the record, the genetic forms, and the claim check.
// SPDX-License-Identifier: Apache-2.0

export const attest = {
  // The genetic forms a laboratory fills (public/schemas/variety-*, animal-parentage-v1.json).
  'app.doc.schema.variety-similarity': 'Genetic similarity to one named variety',
  'app.doc.schema.variety-identity': 'Variety identity (match to its reference profile)',
  'app.doc.schema.animal-parentage': 'Animal parentage (SNP, ICAR)',
  'app.doc.slot.similarity': 'Similarity to the named variety',
  'app.doc.slot.markersCompared': 'Markers compared',
  'app.doc.slot.markersDiffering': 'Markers that differ',
  'app.doc.slot.missingCalls': 'Missing calls',
  'app.doc.slot.comparedVariety': 'Registration no. of the variety compared',
  'app.doc.slot.panel': 'Marker panel (code)',
  'app.doc.slot.match': 'Match to the reference profile',
  'app.doc.slot.unitsTested': 'Seeds or plants tested',
  'app.doc.slot.offTypes': 'Off-types found',
  'app.doc.slot.variety': 'Registration no. of the variety',
  'app.doc.slot.species': 'Species (code)',
  'app.doc.slot.panelSnps': 'SNPs in the panel',
  'app.doc.slot.sireCompared': 'SNPs compared with the sire',
  'app.doc.slot.sireConflicts': 'Conflicts with the sire',
  'app.doc.slot.sireOutcome': 'Sire outcome (0 accepted, 1 doubtful, 2 excluded)',
  'app.doc.slot.damCompared': 'SNPs compared with the dam',
  'app.doc.slot.damConflicts': 'Conflicts with the dam',
  'app.doc.slot.damOutcome': 'Dam outcome (0 accepted, 1 doubtful, 2 excluded)',
  'app.doc.slot.trioConflicts': 'Conflicts across the trio',
  'app.doc.slot.trioOutcome': 'Trio outcome (0 accepted, 1 doubtful, 2 excluded)',
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
  'app.attest.signedBy': 'Signing key {key}.',
  'app.attest.publishText': 'Publish the signature on Midnight, so the links you copy can show it.',
  'app.attest.publish': 'Publish it on Midnight',
  'app.attest.publishing': 'Publishing…',
  'app.attest.published':
    'Published on Midnight in block {block}. The links you copy under “What you’ve proved” now include it.',
  'app.attest.stale': 'The signature kept with this record no longer checks against it. Add it again.',

  // What "Prove one number" says once the numbers are signed.
  'app.claim.labSigned': 'Signing key {key} signed these numbers, and the links include that signature.',

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
  'app.claim.check.labKey': 'Signing key',
  'app.claim.check.labFailed':
    'The laboratory signature isn’t confirmed: {reason} Read the numbers as the holder’s own.',
  'app.claim.check.whatLab':
    'What this shows: the number sealed in that record meets the bound (or is that value), and the key above signed that record’s numbers. What it doesn’t: whose key that is, or that the certificate is genuine. Every bound proved about a number is public, and together they narrow it.',
};
