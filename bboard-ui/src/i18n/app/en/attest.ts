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
  'app.attest.title': 'Laboratory signature',
  'app.attest.text':
    'Have the laboratory that measured these numbers sign them. Then what you prove is about numbers that laboratory signed, not numbers you typed.',
  'app.attest.request': 'Download the request for the laboratory',
  'app.attest.requestWarn':
    'The request holds these numbers and what’s needed to check them. Send it only to the laboratory.',
  'app.attest.how':
    'The laboratory opens it at {site}/lab, checks the numbers against its report, and sends you back a signature file.',
  'app.attest.add': 'Add the laboratory’s signature',
  'app.attest.addOther': 'Add a different signature',
  'app.attest.signedBy': 'Signed by laboratory key {key}.',
  'app.attest.fileSays': 'The signature file calls it “{name}”. That’s only a label: the key is what counts.',
  'app.attest.publishText': 'Publish the signature on Midnight, so the links you copy can show it.',
  'app.attest.publish': 'Publish it on Midnight',
  'app.attest.publishing': 'Publishing…',
  'app.attest.published':
    'Published on Midnight in block {block}. The links you copy under “What you’ve proved” now include it.',
  'app.attest.stale': 'The signature kept with this record no longer checks against it. Add it again.',
  'app.attest.added': 'Signature checked and added.',

  // What "Prove one number" says once the numbers are signed.
  'app.claim.labSigned': 'Laboratory key {key} signed these numbers, and the links include that signature.',

  // The claim check page, when the link names a laboratory signature.
  'app.claim.check.labOk':
    'The numbers in that record were signed by laboratory key {key}, published on Midnight in block {block}{date}.',
  'app.claim.check.labKey': 'Laboratory key',
  'app.claim.check.labWhose':
    'This site can’t tell you whose key this is. Compare it with the key the laboratory publishes.',
  'app.claim.check.labFailed':
    'The laboratory signature isn’t confirmed: {reason} Read the numbers as the holder’s own.',
  'app.claim.check.whatLab':
    'What this shows: the number sealed in that record meets the bound (or is that value), and the key above signed that record’s numbers. What it doesn’t: whose key that is, or that the certificate is genuine. Every bound proved about a number is public, and together they narrow it.',

  // /lab: the laboratory's side.
  'app.labsign.title': 'Sign numbers as a laboratory',
  'app.labsign.intro':
    'Someone sent you a request file. Check the numbers in it against your own report, then sign. Your signature lets them prove a fact about one number, like “similarity to the closest variety is at most 95 %”, as a number your laboratory signed, without showing the others.',
  'app.labsign.private': 'Everything here happens in this browser. Your key and the request never leave this computer.',
  'app.labsign.key.title': 'Your laboratory key',
  'app.labsign.key.none':
    'Make a key once, then sign everything with that same key, so the key you publish never changes.',
  'app.labsign.key.name': 'Laboratory name (a label for your own files)',
  'app.labsign.key.make': 'Make a new key',
  'app.labsign.key.open': 'Open your key file',
  'app.labsign.key.made':
    'Your key file was saved. Keep it private and backed up: anyone who has it can sign as your laboratory. If you lose it, make a new key and publish the new one.',
  'app.labsign.key.using': 'Signing with the key in “{name}”.',
  'app.labsign.key.public': 'Your public key',
  'app.labsign.key.publish':
    'Publish this on your website and on your reports. Whoever checks a claim compares the key it shows with this one: that’s how they know it was you.',
  'app.labsign.key.copy': 'Copy the public key',
  'app.labsign.key.copied': 'Copied.',
  'app.labsign.req.title': 'The request',
  'app.labsign.req.needKey': 'Make or open your key first.',
  'app.labsign.req.open': 'Open the request file',
  'app.labsign.req.what':
    'Check every line against your report. You sign all of it: the numbers and the details of the document.',
  'app.labsign.req.k.title': 'Document',
  'app.labsign.req.k.type': 'Type',
  'app.labsign.req.k.about': 'About',
  'app.labsign.req.k.issuer': 'Issued by',
  'app.labsign.req.k.reference': 'Reference',
  'app.labsign.req.k.holder': 'Holder',
  'app.labsign.req.k.issued': 'Date on it',
  'app.labsign.req.k.form': 'Form',
  'app.labsign.req.k.notes': 'Notes',
  'app.labsign.req.k.files': 'Files (their codes only)',
  'app.labsign.req.confirm': 'I checked every number against our report, and they are ours.',
  'app.labsign.req.sign': 'Sign and save the signature file',
  'app.labsign.req.done':
    'Signed. Send the signature file back to whoever sent you the request. It holds no numbers, only the signature.',
  'app.labsign.req.keep': 'The request holds the numbers. Don’t pass it on.',
};
