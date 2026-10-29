// The record app in English: document records (docs/document-profile.md): sealing one
// (components/document/DocumentNew.tsx), its page (DocumentDetail.tsx) and the check page a
// document check link opens (DocumentCheck.tsx). Source text; see log.ts.
// SPDX-License-Identifier: Apache-2.0

export const document = {
  // ---- where it starts (LogFlow.tsx, under the kind choice) ----
  'app.doc.orDocument': 'Sealing a document instead? A permit, a COA, a contract, a transport document.',
  'app.doc.orDocumentAction': 'Seal a document',
  // ---- sealing one (DocumentNew.tsx) ----
  'app.doc.new.title': 'Seal a document',
  'app.doc.new.intro':
    'Pick the file. It stays on this device: only its SHA-256 (a code worked out from its bytes), its name and its size are sealed, with a date nobody can backdate.',
  'app.doc.new.proves':
    'What this will show: a file with exactly these bytes was in your hands by the date it is sealed on. Not that the document is genuine, that the issuer issued it, or that what it says is true.',
  'app.doc.f.files': 'Files',
  'app.doc.f.filesHelp': 'Up to {max}: a contract and its annexes, a COA and its chromatograms.',
  'app.doc.f.add': 'Add a file',
  'app.doc.f.addMore': 'Add another file',
  'app.doc.f.reading': 'Reading {name}…',
  'app.doc.f.tooLarge': '{name} is larger than {mb} MB, so it can’t be read here.',
  'app.doc.f.duplicate': '{name} is the same file as one already added.',
  'app.doc.f.full': 'That’s {max} files, the most one document can have.',
  'app.doc.f.remove': 'Remove {name}',
  'app.doc.f.title': 'Title',
  'app.doc.f.titleHelp': 'What you’d call it: “Transport document 0042”, “COA batch 7”.',
  'app.doc.f.type': 'Type',
  'app.doc.f.issuer': 'Issued by (optional)',
  'app.doc.f.issuerHelp': 'As written on it. This is your statement; it doesn’t show they issued it.',
  'app.doc.f.reference': 'Reference number (optional)',
  'app.doc.f.referenceHelp': 'A permit number, an invoice number, a lot.',
  'app.doc.f.issued': 'Date on the document (optional)',
  'app.doc.f.about': 'What it’s about (optional)',
  'app.doc.f.aboutHelp': 'Records of yours it concerns: a COA with the plant it tested.',
  'app.doc.f.aboutNone': 'None',
  'app.doc.f.holder': 'Held by',
  'app.doc.f.holderHelp': 'You, or your organisation.',
  'app.doc.f.notes': 'Notes (optional)',
  'app.doc.need.file': 'Add the file first.',
  'app.doc.need.title': 'Give it a title.',
  'app.doc.need.holder': 'Say who holds it.',
  'app.doc.seal': 'Seal it',
  'app.doc.sealing': 'Sealing…',
  'app.doc.type.permit': 'Permit or licence',
  'app.doc.type.certificate-of-analysis': 'Certificate of analysis (COA)',
  'app.doc.type.lab-report': 'Lab report',
  'app.doc.type.contract': 'Contract or agreement',
  'app.doc.type.protocol': 'Protocol or SOP',
  'app.doc.type.transport': 'Transport or shipping document',
  'app.doc.type.invoice': 'Invoice or receipt',
  'app.doc.type.other': 'Something else',
  // ---- its page (DocumentDetail.tsx) ----
  'app.doc.kind': 'Document',
  'app.doc.homeLine': 'Document · {type}',
  'app.doc.k.type': 'Type',
  'app.doc.k.issuer': 'Issued by (your statement)',
  'app.doc.k.issuerHolder': 'Issued by (the holder’s statement)',
  'app.doc.k.reference': 'Reference',
  'app.doc.k.issued': 'Date on the document',
  'app.doc.k.files': 'Files',
  'app.doc.k.about': 'About',
  'app.doc.k.holder': 'Held by',
  'app.doc.k.notes': 'Notes',
  'app.doc.k.sealed': 'Sealed (this device’s clock)',
  'app.doc.k.dated': 'Date on Midnight',
  'app.doc.k.proofCode': 'Proof code',
  'app.doc.fileSize': '{size} bytes',
  'app.doc.share.title': 'Let someone check it',
  'app.doc.share.text':
    'Send them the file and this link. Their browser checks that the file is byte for byte one sealed here, and when it was dated: nothing is uploaded, and the answer doesn’t rest on VeilCore’s word.',
  'app.doc.share.warn':
    'The link shows whoever has it everything in this document record: its title, type, issuer, reference, date, each file’s name and SHA-256, the names of the records it’s about, and your notes. Never the file itself.',
  'app.doc.share.copy': 'Copy the check link',
  'app.doc.share.copied': 'Copied.',
  'app.doc.compare.title': 'Is this the same file?',
  'app.doc.compare.text': 'Pick a file to compare with the ones sealed here. It isn’t uploaded.',
  'app.doc.compare.pick': 'Pick a file',
  'app.doc.compare.match': '<b>{name}</b> is byte for byte {sealed}, sealed here.',
  'app.doc.compare.noMatch': '<b>{name}</b> is not any of the files sealed here. Not one byte may differ.',
  'app.doc.compare.tooLarge': 'That file is larger than {mb} MB, so it can’t be read here.',
  // ---- the check page (DocumentCheck.tsx) ----
  'app.doc.check.title': 'Check a document',
  'app.doc.check.intro':
    'Someone sent you a document and this link. Pick the file they sent: your browser works out its SHA-256 (nothing is uploaded) and checks it against the sealed record in the link and its date on Midnight.',
  'app.doc.check.missing': 'This link has no document record in it. Ask whoever sent it for the whole link.',
  'app.doc.check.unreadable': 'This link is damaged. Ask for it again.',
  'app.doc.check.notDoc': 'What’s in this link isn’t a document record that can be checked here.',
  'app.doc.check.recomputed': 'Proof code, recomputed here from the link',
  'app.doc.check.notDated':
    'Nothing dates this record yet, or the link was changed. Don’t rely on it until it shows a date.',
  'app.doc.check.what':
    'What this shows: a file with exactly these bytes was in the holder’s hands by that date. What it doesn’t: that the document is genuine, that the issuer issued it, or that what it says is true. “Issued by” is the holder’s statement.',
  'app.doc.check.inLink': 'In the link (the holder’s own words)',
};
