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
  'app.doc.need.heading': 'Still needed before you can seal it:',
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
  'app.doc.share.notDatedYet':
    'Not dated yet. Whoever opens the link now will be told not to rely on it. Send it once this page shows a date.',
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
    'Someone sent you a document and this link. Pick the file they sent: your browser checks it is the same file, byte for byte (nothing is uploaded), and shows its date on Midnight, a public blockchain, checking it there itself when it can.',
  'app.doc.check.missing': 'This link has no document record in it. Ask whoever sent it for the whole link.',
  'app.doc.check.unreadable': 'This link is damaged. Ask for it again.',
  'app.doc.check.notDoc': 'What’s in this link isn’t a document record that can be checked here.',
  'app.doc.check.recomputed': 'Proof code, recomputed here from the link',
  'app.doc.check.registryOnly':
    'VeilCore’s registry gives this date. This page can’t check it on Midnight, so for now it rests on VeilCore’s word.',
  'app.doc.check.notConfirmed':
    'VeilCore’s registry gives this date, but this page couldn’t confirm it on Midnight just now. Try again in a few minutes before relying on it.',
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
  'app.claim.example':
    'For example: show a buyer that total THC is at most 0.3%, or that a batch has at most 9 plants in flower, without giving them the figure or the rest of the record. You pick the number and the limit. They get a link that checks it.',
  'app.claim.notReady': 'Proving isn’t switched on for this site yet.',
  'app.claim.number': 'Which number',
  'app.claim.how': 'What to prove',
  'app.claim.atMost': 'It is at most…',
  'app.claim.atLeast': 'It is at least…',
  'app.claim.exactly': 'It is exactly this (shows the number)',
  'app.claim.bound': 'The limit',
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
    'Someone sent you this link to show a fact about one number in a sealed document, without showing the number or the document. This page reads the claim from Midnight and checks it.',
  'app.claim.check.bad': 'This link can’t be read. Ask for it again.',
  'app.claim.check.checking': 'Reading the claim from Midnight…',
  'app.claim.check.okWhen': 'Proved on Midnight in block {block}{date}.',
  'app.claim.check.failed': 'Not confirmed: {reason} Don’t rely on it.',
  'app.claim.check.record': 'The record it’s about',
  'app.claim.check.what':
    'What this shows: the number sealed in that record meets the bound (or is that value). What it doesn’t: that a laboratory measured it, or that the document is genuine; the holder typed the numbers. Every bound proved about a number is public, and together they narrow it.',
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
    'Record {id} is kept on this device only, and its entry in this browser is damaged, so it can’t be shown. It is never sent anywhere. A backup saved now carries the entry exactly as it is. You can save the entry to a file, or delete it from this device.',
  'app.doc.local.unreadable.export': 'Save the entry to a file',
  'app.doc.local.unreadable.delete': 'Delete it from this device',
  'app.doc.local.unreadable.deleteConfirm':
    'Delete this damaged entry from this device? This can’t be undone here. A backup file that carries it still does.',
  'app.doc.local.unreadable.backupNote':
    'One record kept on this device only couldn’t be read. This backup carries its entry exactly as it is, so nothing is lost with the file. Everything else is in it as usual.',
  // ---- a production chain, and proving a number from a device-only record (docs/document-chain.md) ----
  'app.doc.chain.kind.grow-batch': 'Grow batch',
  'app.doc.chain.kind.harvest-lot': 'Harvest lot',
  'app.doc.schema.grow-batch': 'Grow batch',
  'app.doc.schema.harvest-lot': 'Harvest lot',
  'app.doc.slot.plants': 'Plants in this batch on the record’s date',
  'app.doc.slot.plantsInFlower': 'Of those, plants in the flowering stage on the record’s date',
  'app.doc.slot.areaSquareMetres': 'Floor area under cultivation for this batch, in square metres',
  'app.doc.slot.plantsHarvested': 'Plants harvested into this lot',
  'app.doc.slot.wetWeightGrams': 'Fresh weight at harvest, whole plants as cut, in grams',
  'app.doc.slot.dryWeightGrams': 'Dry weight of the lot as stored, in grams',
  'app.doc.chain.start.title': 'Recording a production chain?',
  'app.doc.chain.start.text':
    'Seal each step as its own record, each about the one before it: the source plant or strain, a grow batch, a harvest lot, the lab report. Each gets its own date.',
  'app.doc.chain.start.plain': 'Any other document',
  'app.doc.chain.f.titleHelp': 'Optional. Left empty, it is the kind and the ID. Don’t put counts or weights in it.',
  'app.doc.chain.f.reference.grow-batch': 'Batch ID',
  'app.doc.chain.f.reference.harvest-lot': 'Lot ID',
  'app.doc.chain.f.referenceHelp': 'As you write it in your own records.',
  'app.doc.chain.f.site': 'Site label (optional)',
  'app.doc.chain.f.siteHelp': 'Your own label for a room, a field or a facility. It goes in the notes.',
  'app.doc.chain.f.variety': 'Variety (optional)',
  'app.doc.chain.f.varietyHelp': 'It goes in the notes.',
  'app.doc.chain.f.numbers': 'Its numbers',
  'app.doc.chain.f.numbersHelp':
    'Counts and weights go here and nowhere else: don’t repeat them in the title or the notes. They are sealed as you type them, not as anyone measured them, so you can later prove one, like “at most 100 plants”, without showing the others.',
  'app.doc.chain.note.site': 'Site',
  'app.doc.chain.note.variety': 'Variety',
  'app.doc.chain.titleFor.grow-batch': 'Grow batch {id}',
  'app.doc.chain.titleFor.harvest-lot': 'Harvest lot {id}',
  'app.doc.chain.need.reference': 'Give its batch or lot ID.',
  'app.doc.chain.need.aNumber': 'Type at least one number.',
  'app.doc.chain.sheet.title': 'No file for it?',
  'app.doc.chain.sheet.text':
    'A record needs a file. Your own batch sheet is the better choice: it dates a working document you already keep. If you have none, this makes a plain-text sheet from the ID, date, site, variety, holder and “About” above, with no counts or weights, and saves it to this device. Fill those in first.',
  'app.doc.chain.sheet.make': 'Make a sheet from what I typed',
  'app.doc.chain.sheet.made':
    'Made and saved as {name}. Keep that file: it is needed to check the record, and it must stay byte for byte the same. If you change what you typed above, the sheet is not changed with it.',
  'app.doc.chain.aboutHelp':
    'Records of yours it concerns: a COA with the plant it tested, a harvest lot with its grow batch. This is your statement. Nothing checks it against the record you pick.',
  'app.doc.chain.aboutNote':
    '“About” is the holder’s own statement, sealed with this record. Neither VeilCore nor Midnight checks it against the record it names. A chain of records is only as strong as each record’s own date and proof code.',
  'app.doc.chain.carried':
    'The records linked here came in this link, from whoever sent it. The sealed record names each one by its ID only, so nothing here shows that a linked record is the one named.',
  'app.doc.chain.idOnly':
    'Where this link carries only a record’s ID, its page shows what VeilCore’s registry reports for that ID, with nothing ticked. For a checked date, ask the holder for that record’s own check link.',
  'app.doc.chain.namedAs':
    'You opened this from another record, which names it as record {id}. Nothing in the link ties that ID to this record’s proof code.',
  'app.doc.chain.askRegistry': 'See what VeilCore’s registry reports for record {id}',
  'app.doc.chain.askRegistrySends':
    'That page sends the record’s ID to VeilCore’s registry and, in its address, this proof code to the website’s host. Nothing else from this link.',
  'app.doc.chain.next.title': 'Next in its chain',
  'app.doc.chain.next.text': 'Seal the next step as its own record, about this one. It gets its own date.',
  'app.doc.chain.next.grow-batch': 'Record a grow batch from this',
  'app.doc.chain.next.harvest-lot': 'Record its harvest lot',
  'app.doc.chain.next.report': 'Seal its lab report',
  'app.doc.chain.title': 'Its chain, on this device',
  'app.doc.chain.text':
    'Worked out here from the records this browser holds, the ones kept on this device only among them. Nothing is asked of VeilCore for it, and a record held elsewhere isn’t listed.',
  'app.doc.chain.up': 'What this is about',
  'app.doc.chain.down': 'Records about this one',
  'app.doc.chain.none': 'None on this device.',
  'app.doc.chain.notHeld': '{name} (not on this device)',
  'app.doc.chain.share.title': 'Send it with its chain',
  'app.doc.chain.share.text':
    'This link also carries the records this one is about, and the ones those are about, so whoever checks it can open each one and see its date.',
  'app.doc.chain.share.warn':
    'Whoever has this link sees everything in each of those document records too, as the link above shows this one: {list}. Of a record that isn’t a document, it carries only the ID and the proof code.',
  'app.doc.chain.share.copy': 'Copy link with its chain',
  'app.doc.chain.share.copied': 'Copied.',
  'app.doc.local.p6':
    'If it has numbers, you can later choose to prove one. That publishes a fact about the number on Midnight, through VeilCore’s fee service, and only if you turn it on for that record.',
  'app.doc.local.prove.off': 'Proving a number isn’t switched on for a record kept on this device only.',
  'app.doc.local.prove.title': 'Prove one number: your choice',
  'app.doc.local.prove.text':
    'Off unless you turn it on here. Proving publishes a fact about one number on Midnight, for good, through VeilCore’s fee service. Nothing is sent to VeilCore’s registry. You are shown exactly what would be published before anything is proved.',
  'app.doc.local.prove.choice': 'Show “Prove one number” for this record',
  'app.doc.local.prove.publish.title': 'What will be published if you go ahead',
  'app.doc.local.prove.publish.range':
    'On Midnight, public and permanent: the form “{schema}”, the field “{label}”, the limit {bound} and the direction ({direction}), with a code that stands for this record. The number itself is not published. Every limit you prove narrows it.',
  'app.doc.local.prove.publish.exact':
    'On Midnight, public and permanent: the form “{schema}”, the field “{label}” and the number itself, {value}, with a code that stands for this record.',
  'app.doc.local.prove.publish.noBound': 'Type a limit to see exactly what would be published.',
  'app.doc.local.prove.publish.route':
    'It goes from this browser to Midnight through VeilCore’s fee service, which sees what is published, and your network address. Nothing is sent to VeilCore’s registry. The number is what you typed, not what a lab measured.',
  'app.doc.local.prove.direction.atMost': 'at most',
  'app.doc.local.prove.direction.atLeast': 'at least',
  'app.doc.local.prove.confirmExact': 'Yes, publish the number itself: {value}, on Midnight, for good.',
  'app.doc.local.textProved':
    'Nothing typed into this record was sent to VeilCore’s registry, locked or not. What you chose to prove about its numbers is public on Midnight. The only copies of the record are in this browser and in the backup file you checked. Lose both and the record is gone: VeilCore can’t give it back. A backup saved before this record was sealed doesn’t hold it, and a passkey copy never does.',
  'app.doc.local.proved':
    'You chose to prove facts about this record’s numbers. They went to Midnight through VeilCore’s fee service and are public for good; they are listed below. Nothing typed into this record was sent to VeilCore’s registry.',
  'app.claim.tie':
    'What you prove is public on Midnight in a way that VeilCore, and anyone who has this record’s check link, can tie to this record. VeilCore can also tie it to the holder key that dated the record.',
  'app.doc.local.aboutStaysHere':
    'This record names a record kept on this device only, so it must be kept on this device only too. Otherwise that record’s name and ID would go to VeilCore inside this one’s locked copy. Nothing was saved or sent.',
  'app.doc.chain.aboutLocalOnly':
    'A record kept on this device only can be picked only if this record is kept on this device only too (the box below). What a record is about is sealed into its locked copy, so an ordinary record would send that record’s name and ID to VeilCore.',
  'app.doc.check.tooLarge': 'This link carries more than a check link can. Ask the sender for each record’s own link.',
  'app.doc.chain.share.warnLocal':
    'Nothing typed into a record kept on this device only was ever sent to VeilCore’s registry. Copying this link hands what was typed into each one it carries (marked above, and this record if it is one) to whoever receives it.',
  'app.doc.chain.aboutHolderNote':
    'Opening one of these links asks VeilCore’s registry about that record’s ID, from your network address. For a record kept on this device only, that is one more thing the registry learns: that this browser looked it up.',
};
