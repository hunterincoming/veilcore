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
  'app.doc.share.title': 'Prove you had this file',
  'app.doc.share.text':
    'Send them the file and this link. Their browser checks that the file is byte for byte one sealed here, and when it was dated: nothing is uploaded, and the answer doesn’t rest on VeilCore’s word.',
  'app.doc.share.warn':
    'The link shows whoever has it everything in this document record: its title, type, issuer, reference, date, each file’s name and SHA-256, the names of the records it’s about, and your notes. Never the file itself.',
  'app.doc.share.copy': 'Copy link: proves you had this file',
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
  'app.doc.nums.title': 'The numbers on it (optional)',
  'app.doc.nums.help':
    'Type them as printed. They’re sealed with the document so you can later prove one, like “total THC is at most 0.3 %”, without showing the others or the certificate.',
  'app.doc.nums.which': 'Which numbers',
  'app.doc.nums.none': 'None',
  'app.doc.nums.bad': 'A number with at most {places} decimals, like 0.21.',
  'app.doc.need.numbers': 'One of the numbers isn’t one this form can hold. Fix it, or clear it.',
  'app.doc.need.aNumber': 'Type at least one number, or choose “None”.',
  'app.doc.schema.potency': 'Cannabinoid potency',
  'app.doc.schema.seed-quality': 'Seed quality',
  'app.doc.slot.totalThc': 'Total THC',
  'app.doc.slot.delta9Thc': 'Delta-9 THC',
  'app.doc.slot.thca': 'THCA',
  'app.doc.slot.totalCbd': 'Total CBD',
  'app.doc.slot.cbda': 'CBDA',
  'app.doc.slot.cbg': 'CBG',
  'app.doc.slot.totalCannabinoids': 'Total cannabinoids',
  'app.doc.slot.moisture': 'Moisture',
  'app.doc.slot.germination': 'Germination',
  'app.doc.slot.pureSeed': 'Pure seed',
  'app.doc.slot.otherCropSeed': 'Other crop seed',
  'app.doc.slot.weedSeed': 'Weed seed',
  'app.doc.slot.inertMatter': 'Inert matter',
  'app.doc.nums.heldTitle': 'Its numbers',
  'app.doc.nums.heldText':
    'Sealed with this document as {schema}. Only you see them: the record holds a code that commits to them, not the numbers.',
  'app.claim.title': 'Prove one number',
  'app.claim.text':
    'Prove a fact about one number to anyone, without showing it, the other numbers or the certificate. The proof goes on Midnight, where anyone can check it.',
  'app.claim.notReady': 'Proving isn’t switched on for this site yet.',
  'app.claim.number': 'Which number',
  'app.claim.how': 'What to prove',
  'app.claim.atMost': 'It is at most…',
  'app.claim.atLeast': 'It is at least…',
  'app.claim.exactly': 'It is exactly this (shows the number)',
  'app.claim.bound': 'Bound',
  'app.claim.boundBad': 'A number with at most {places} decimals.',
  'app.claim.wontMeet': 'Your sealed number doesn’t meet that, so it can’t be proved. Nothing was sent.',
  'app.claim.exactWarn': 'This publishes {label}: {value} {unit}, for anyone to see, for good.',
  'app.claim.already': 'Already public about {label}: {list}.',
  'app.claim.leak': 'Each bound you prove is public for good, and together they narrow the number.',
  'app.claim.computer':
    'Proving takes a minute or two on a laptop and needs a lot of memory, so use a computer. Phones haven’t been tested yet.',
  'app.claim.go': 'Prove it on Midnight',
  'app.claim.going': 'Proving…',
  'app.claim.done': 'Proved on Midnight:',
  'app.claim.copy': 'Copy the link that proves this',
  'app.claim.copied': 'Copied.',
  'app.claim.made': 'What you’ve proved',
  'app.claim.line.atMost': '{label} is at most {bound} {unit}',
  'app.claim.line.atLeast': '{label} is at least {bound} {unit}',
  'app.claim.line.value': '{label} is {value} {unit}',
  'app.claim.holderTyped': 'The numbers are yours as typed: no laboratory signed them.',
  'app.claim.check.title': 'Check a claim',
  'app.claim.check.intro':
    'Someone sent you this link to show a fact about one number on a sealed certificate, without showing the number or the certificate. This page reads the claim from Midnight and checks it.',
  'app.claim.check.bad': 'This link can’t be read. Ask for it again.',
  'app.claim.check.checking': 'Reading the claim from Midnight…',
  'app.claim.check.okWhen': 'Proved on Midnight in block {block}{date}.',
  'app.claim.check.failed': 'Not confirmed: {reason} Don’t rely on it.',
  'app.claim.check.record': 'The record it’s about',
  'app.claim.check.what':
    'What this shows: the number sealed in that record meets the bound (or is that value). What it doesn’t: that a laboratory measured it, or that the certificate is genuine; the holder typed the numbers. Every bound proved about a number is public, and together they narrow it.',
  'app.claim.check.schema': 'Under the published form “{schema}”.',
  // EvidenceBundle.tsx: what differs for a document record.
  'app.doc.bundle.keyIs':
    '(The record’s key is the public ID of the key made for this document when you sealed it. Its secret part stays in your backup and never goes in the bundle.)',
  'app.doc.bundle.includeFiles':
    'Include a copy of the document. Without it, the bundle has only each file’s code, so whoever checks it needs the file from you separately.',
  'app.doc.bundle.chooseFiles': 'Choose the document’s file(s)',
  'app.doc.bundle.checkedAgainst': 'Each one is checked against the files sealed in this record before it goes in.',
  'app.doc.bundle.filesAria': 'The document’s files',
  'app.doc.bundle.chooseOrUntick': 'Choose the document’s file, or untick it.',
  // ---- kept on this device only (docs/device-only-records.md; DocumentNew.tsx, DocumentDetail.tsx) ----
  'app.doc.local.choice': 'Keep this record on this device and in my backup only',
  'app.doc.local.before': 'Before you choose:',
  'app.doc.local.p1':
    'Nothing you type here is sent to VeilCore, locked or not. What is sent, so the record gets its date: its ID, its proof code and its key binding (a code made from the record’s own key).',
  'app.doc.local.p2': 'VeilCore’s server can’t give this record back: it never has it.',
  'app.doc.local.p3':
    'The only copies are this browser’s and a backup file saved after sealing. A backup saved earlier doesn’t hold this record, and a passkey copy never does. You’ll be asked to save and check a backup as soon as it is sealed.',
  'app.doc.local.p4': 'Anyone with its check link and the file can still check it.',
  'app.doc.local.p5': 'This is chosen once, when sealing. It can’t be changed after.',
  'app.doc.local.title': 'Kept on this device only',
  'app.doc.local.text':
    'Nothing typed into this record was sent to VeilCore, locked or not. The only copies are in this browser and in the backup file you checked. Lose both and the record is gone: VeilCore can’t give it back. A backup saved before this record was sealed doesn’t hold it, and a passkey copy never does.',
  'app.doc.local.notBacked':
    'Not in a backup yet. This browser holds the only copy of this record: if its data is cleared now, the record is gone, and VeilCore can’t give it back. Save your backup file and check it now.',
  'app.doc.local.sent':
    'What has left this device: the record’s ID, its proof code and its key binding, sent to VeilCore to date it. Every request shows VeilCore your network address and the time. If you keep a passkey copy, it holds this record’s ID and its keys, locked, on VeilCore’s server; never what you typed.',
  'app.doc.local.stamp':
    'Date-stamping this record’s key is your choice, and nothing starts it but the button below. If you do it, a code made from the key goes to Midnight through VeilCore’s fee service. Nothing you typed goes with it.',
  'app.doc.local.conflict':
    'VeilCore’s server answered with something other than this record’s proof code alone. What you see is this device’s own copy. Nothing more is sent, and the server’s answer changes nothing here.',
  'app.doc.local.homeNotBacked': 'On this device only · not in a backup yet',
  'app.doc.local.backup': 'Save a backup',
  'app.doc.local.homeLine': 'On this device only',
  'app.doc.local.noProve':
    'Proving a number sends details from this browser, so it isn’t offered for a record kept on this device only.',
  'app.doc.local.staysHere': 'This record is kept on this device only, so this isn’t offered for it.',
  'app.doc.local.delete': 'Delete from this device',
  'app.doc.local.deleteConfirm':
    'Delete this record from this device? This can’t be undone here. A backup file that holds it still does. VeilCore keeps what it was already sent: the record’s ID, proof code and key binding. A passkey copy, if you keep one, still holds its ID and keys until you update that copy. If you date-stamped its key, that stays on Midnight. Its date still stands for anyone with the check link.',
  'app.doc.local.toRecord': 'Go to the record',
  'app.doc.local.backupNow':
    'Sealed. Now save a backup and check it: until you do, this browser holds the only copy of this record.',
  'app.doc.local.backupMissing':
    'That backup doesn’t hold your documents kept on this device only. Save a new one and check that.',
  'app.doc.local.backupFailed':
    'The backup couldn’t be made: a document kept on this device only couldn’t be put in it. Nothing was saved.',
  'app.doc.local.noCorrect':
    'A record kept on this device only can’t be corrected. Seal the document again as a new record.',
  'app.doc.local.unreadable.title': 'A record on this device couldn’t be read',
  'app.doc.local.unreadable.text':
    'Record {id} is kept on this device only, and its entry in this browser is damaged, so it can’t be shown. It is never sent anywhere. Your backup file carries the entry exactly as it is. You can save the entry to a file, or delete it from this device.',
  'app.doc.local.unreadable.export': 'Save the entry to a file',
  'app.doc.local.unreadable.delete': 'Delete it from this device',
  'app.doc.local.unreadable.deleteConfirm':
    'Delete this damaged entry from this device? This can’t be undone here. A backup file that carries it still does.',
  'app.doc.local.unreadable.backupNote':
    'One record kept on this device only couldn’t be read. This backup carries its entry exactly as it is, so nothing is lost with the file. Everything else is in it as usual.',
};
