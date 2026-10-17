// The record app in English: animal records (veilcore/animal-profile.ts, docs/animal-profile.md).
// Source text; see log.ts.
//
// Two kinds of key:
//   app.animal.*            words only an animal record has: its form, its fields, sire and dam.
//   app.animal.v.<key>      the same sentence as <key>, for an animal instead of a plant. A
//                           screen showing an animal record asks for <key> as always, and
//                           gets this one (translate.ts forKind). Keep each one saying exactly
//                           what <key> says, every limit included, with "animal" for "plant".
// SPDX-License-Identifier: Apache-2.0

export const animal = {
  // flow/AnimalForm.tsx: the logging flow's first screen.
  'app.animal.choice.label': 'What are you logging?',
  'app.animal.choice.plant': 'A plant',
  'app.animal.choice.animal': 'An animal',
  'app.animal.title': 'Log your animal',
  'app.animal.name': 'Animal’s name',
  'app.animal.namePlaceholder': 'e.g. Practice Cow',
  // AnimalForm.tsx: the name field (app.animal.name is also a column and a review line).
  'app.animal.nameField': 'Animal’s name',
  'app.animal.individualId': 'Individual ID',
  'app.animal.individualIdHelp': 'The number on its ear tag or registration, exactly as written.',
  'app.animal.idScheme': 'ID scheme',
  'app.animal.idSchemeHelp': 'Which numbering the ID belongs to. Pick one or type your own.',
  'app.animal.scheme.jp': 'Japan cattle ID (10 digits)',
  'app.animal.scheme.earTag': 'Ear tag',
  'app.animal.scheme.microchip': 'Microchip',
  'app.animal.scheme.herdBook': 'Herd book number',
  'app.animal.scheme.usda840': 'USDA 840 / AIN tag',
  'app.animal.scheme.breedReg': 'Breed association registration no.',
  'app.animal.species': 'Species',
  'app.animal.speciesPlaceholder': 'e.g. Cattle (Bos taurus)',
  'app.animal.breed': 'Breed',
  'app.animal.breedPlaceholder': 'e.g. Japanese Black',
  'app.animal.sex': 'Sex',
  'app.animal.sex.female': 'Female',
  'app.animal.sex.male': 'Male',
  'app.animal.sex.unknown': 'Not stated',
  'app.animal.dob': 'Date of birth (your own note)',
  'app.animal.dobHelp': 'Leave it empty if you don’t know it. The public date stamp comes from the network.',
  'app.animal.breeder': 'Breeder or holder',
  'app.animal.breederPlaceholder': 'Your name or farm',
  'app.animal.more': '+ Add sire, dam, herd, photos or notes',
  'app.animal.sire': 'Sire',
  'app.animal.dam': 'Dam',
  'app.animal.sireId': 'Sire’s individual ID',
  'app.animal.damId': 'Dam’s individual ID',
  'app.animal.parentHelp': 'Pick an animal you’ve logged, or type its name.',
  'app.animal.parentHelpNone': 'Type its name. Animals you log here can be picked later.',
  'app.animal.linkedId': 'From the record you picked.',
  'app.animal.herd': 'Herd or farm (optional)',
  'app.animal.idShort': 'ID',
  'app.animal.need.nameOrId': 'A name or an individual ID, the species, and the breeder or holder are all you need.',
  'app.animal.need.scheme': 'Say which ID scheme the individual ID belongs to.',
  'app.animal.need.species': 'Add the species.',
  'app.animal.need.breeder': 'Add the breeder or holder.',
  'app.animal.unsaved': 'You have an unsaved animal: {name}.',
  // The "Is this right?" screen.
  'app.animal.k.animal': 'Animal',
  'app.animal.k.speciesBreed': 'Species and breed',
  'app.animal.k.born': 'Born (your note)',
  'app.animal.notStated': 'Not stated',
  'app.animal.idIn': '{id} ({scheme})',
  'app.animal.x.sire': 'Sire: {v}',
  'app.animal.x.dam': 'Dam: {v}',
  'app.animal.x.herd': 'Herd: {v}',

  // An animal's page (RecordDetail.tsx), Home and the family tree.
  'app.animal.f.statedBirth': 'Date of birth (holder’s statement)',
  'app.animal.noLicensing': 'Agreements and royalties aren’t available for animal records yet.',
  'app.animal.tree.sire': 'Sire',
  'app.animal.tree.dam': 'Dam',
  'app.animal.home.yourRecords': 'Your records',

  // The check page (pages/VerifyPage.tsx, verify/DisclosedFacts.tsx).
  'app.animal.verify.sireLine': 'Sire, as the holder states it: {v}',
  'app.animal.verify.damLine': 'Dam, as the holder states it: {v}',
  'app.animal.verify.idLine': 'Individual ID, as the holder states it: {id} ({scheme})',
  'app.animal.verify.noId': 'No individual ID recorded.',
  'app.animal.v.app.verify.noParents': 'No sire or dam recorded.',
  'app.animal.v.app.plant.fix.name': 'Animal’s name',
  'app.animal.v.app.plant.fix.bredBy': 'Breeder or holder',
  'app.animal.v.app.verify.nameTyped': 'Animal’s name, as the holder typed it: ',

  // lab-import/BulkImportPage.tsx: a list of animals.
  'app.animal.import.dob': 'Date of birth',
  'app.animal.import.scheme': 'ID scheme, for every individual ID in the file',
  'app.animal.import.schemeHelp': 'For example: Japan cattle ID (10 digits), or ear tag.',
  'app.animal.import.species': 'Species, for rows that don’t say',
  'app.animal.import.breeder': 'Breeder or holder, for rows that don’t say',
  'app.animal.import.pickHint':
    'Pick the column with each animal’s name or individual ID, and say which ID scheme the IDs belong to.',

  // ---- the plant's sentences, for an animal (translate.ts forKind) ----
  'app.animal.v.app.log.reportIntro':
    "<b>Optional.</b> Already have a DNA report for this animal? This is what ties your record to the actual animal. Add it now and it's kept with the record. No report yet? Skip: the animal's page shows how to get one.",
  'app.animal.v.app.log.sealingPlant': 'Sealing your animal…',
  'app.animal.v.app.log.sealStampsKey':
    "Sealing also date stamps your animal's key, so you can prove you hold its record later. Only a code made from the key goes out.",
  'app.animal.v.app.log.publicStampLater':
    "Its public date stamp comes when its batch is dated on {datedOn}. Your animal's page shows when that has happened. Nothing for you to do.",
  'app.animal.v.app.log.publicDateLater':
    "Its public date comes when its batch is dated on {datedOn}. Your animal's page shows it then.",
  'app.animal.v.app.log.keyStampedAt':
    "Key date stamped: {when}. Your animal's key is dated too, so you can prove you hold its record later.{bound} Nothing about the animal went out.",
  'app.animal.v.app.log.keyStamped':
    "Key date stamped. Your animal's key is dated too, so you can prove you hold its record later.{bound} Nothing about the animal went out.",
  'app.animal.v.app.log.stampingTitle': 'Sealed. Date stamping your animal’s key…',
  'app.animal.v.app.log.onlyFingerprint':
    "Only a code made from your animal's key goes out, nothing about the animal. Free: VeilCore pays the network fee.",
  'app.animal.v.app.log.stampingAria': 'Date stamping your animal’s key',
  'app.animal.v.app.log.keepOpen':
    'Keep this screen open, about a minute. If it closes, nothing is lost: your animal is saved, and its page will offer the date stamp again.',
  'app.animal.v.app.chain.stampMayHaveGoneOut':
    "Your date stamp may already have gone out{tx}. Your animal is saved. Don't try again until that transaction has been checked on the network.",
  'app.animal.v.app.chain.stampUnreachable':
    "Couldn't reach the network. Your animal is saved. Try again {when}, or do the date stamp later.",
  'app.animal.v.app.chain.stampDidntGoThrough':
    "The date stamp didn't go through. Your animal is saved. Try again {when}, or do the date stamp later.",
  'app.animal.v.app.pair.noPlant': 'Could not find the animal to save it to.',
  'app.animal.v.app.pair.savedTitle': 'DNA report saved to this animal',
  'app.animal.v.app.pair.noLabMatch':
    'No lab signature on this animal matches this file, so it stays your own statement.',
  'app.animal.v.app.pair.saved':
    "Saved. Your DNA report's code is saved with this animal's record, as your statement that this report belongs to it. It is not a check of the genetics. {dated}",
  'app.animal.v.app.pair.title': 'Save your DNA report to this animal',
  'app.animal.v.app.pair.intro':
    'Got your DNA report back? Save it to this animal. This is what ties your record to the actual animal: a fresh test can later be compared against it.',
  'app.animal.v.app.pair.savingTo': 'Saving to: <b>{name}</b> · breeder or holder {by}',
  'app.animal.v.app.pair.replaces':
    '<b>This animal already has a DNA report saved: “{name}”{saved}.</b> Saving this one replaces it. Your animal’s page, its certificate and links you share will show the new one, not the old one. Nothing is deleted from your device.',
  'app.animal.v.app.pair.replacesChain':
    '<b>This animal already has a DNA report saved: “{name}”{saved}.</b> Saving this one replaces it. Your animal’s page, its certificate and links you share will show the new one, not the old one. Nothing is deleted from your device. If you dated the old pairing on the network, that date stays there.',
  'app.animal.v.app.pair.chain.stampFirst':
    "Add your animal's date stamp first (from its page) if you also want to date this lab report on the network.",
  'app.animal.v.app.plant.notHereText':
    "If you sealed it in another browser, save a backup there and open it here (Get your records back). If it is someone else's record, open the verify link they gave you instead.",
  'app.animal.v.app.plant.bredByName': 'Breeder or holder: {name}',
  'app.animal.v.app.plant.action.saveReport': 'Save a DNA report to this animal',
  'app.animal.v.app.plant.f.reportSaved': 'saved to this animal ({file}) · pairing code {fp}{sha}',
  'app.animal.v.app.plant.backToPlant': 'Back to the animal',
  'app.animal.v.app.plant.tie.tied': 'Tied to the animal',
  'app.animal.v.app.plant.tie.notYet': 'Not tied to the animal yet',
  'app.animal.v.app.plant.tie.notNow': 'Not tied to the animal now',
  'app.animal.v.app.plant.tie.openedNotSaved': 'a lab report is open, not saved to this animal',
  'app.animal.v.app.plant.tie.sentence': 'Tied to the animal: {what}, {date}.',
  'app.animal.v.app.plant.tie.sentenceNoDate': 'Tied to the animal: {what}.',
  'app.animal.v.app.plant.tie.sentenceNone': 'Not tied to the animal yet: {what}.',
  'app.animal.v.app.plant.tie.sentenceNot': 'Not tied to the animal now: {what}.',
  'app.animal.v.app.plant.tie.means':
    'A DNA report lets a lab compare a new test of an animal with it. It doesn’t show by itself that an animal matches.',
  'app.animal.v.app.plant.tie.sub': 'Report {date}. A lab can compare a new test of the animal with it.',
  'app.animal.v.app.plant.tie.why': 'A DNA report from your lab is what ties a record to the animal itself.',
  'app.animal.v.app.plant.savedToPlant': 'saved to this animal',
  'app.animal.v.app.plant.openedNotSaved': 'opened, not saved to this animal',
  'app.animal.v.app.plant.keyStampLine':
    'Key date stamped: {when}. Your animal’s key is dated too, so you can prove you hold its record later.',
  'app.animal.v.app.plant.next.backup.why':
    'This animal’s keys are only on this device right now. If it breaks or the browser is cleared, nobody can prove you hold its record. Saving takes a minute.',
  'app.animal.v.app.plant.next.corrected.why':
    'The lab replaced the DNA report saved to this animal. Until you save the corrected one, your animal’s page, certificate and links say the saved one was replaced.',
  'app.animal.v.app.plant.next.labWithdrew.whyNewer':
    'It stays saved to this animal, and your certificate and links say it was withdrawn. A newer lab report is here: open it and save it instead.',
  'app.animal.v.app.plant.next.labWithdrew.why':
    'It stays saved to this animal, and your certificate and links say it was withdrawn. Ask the lab for a new one.',
  'app.animal.v.app.plant.next.open.why':
    'It’s locked so only you can open it, with this animal’s key. Opening it checks the lab’s signature here.',
  'app.animal.v.app.plant.next.sample.whySaved':
    'You’ve saved a DNA report to this animal, which is your own statement. A lab signing that it received a sample adds a second party, which is stronger evidence than your statement alone.',
  'app.animal.v.app.plant.next.sample.why':
    'Right now this record is your own account of the animal. A lab signing that it received a sample, and sending a lab report back, makes it stronger evidence than your own account.',
  'app.animal.v.app.plant.next.dna.title': 'Get a DNA report for this animal',
  'app.animal.v.app.plant.next.dna.why':
    'A dated record shows a description existed. A DNA report (a lab’s genetic profile of the animal) is what ties your record to the actual animal. Two ways to get one:',
  'app.animal.v.app.plant.next.dna.haveText':
    'Save it to this animal. It’s read on your device; the file is never uploaded.',
  'app.animal.v.app.plant.next.date.why':
    'It’s saved to this animal, but nothing dates it yet. Dating it shows the report existed by that date, without showing anyone the markers.',
  'app.animal.v.app.plant.next.save.title': 'Save the DNA report to this animal',
  'app.animal.v.app.plant.next.save.why':
    'A lab signed that it received a sample. When its DNA report comes back, save it to this animal: that is what ties your record to the animal, so a later test can be compared with it.',
  'app.animal.v.app.plant.next.save.action': 'Save it to this animal',
  'app.animal.v.app.plant.next.ready.why':
    'A lab signed that it received a sample, and a DNA report is saved to this animal. Agreements and royalties aren’t available for animal records yet.',
  'app.animal.v.app.plant.tree.none': 'No sire or dam recorded yet.',
  'app.animal.v.app.plant.anchor.keysNotHere':
    'This animal’s key isn’t in this browser. Get it back from your backup file: a new key wouldn’t match the sealed record.',
  'app.animal.v.app.plant.bundle.keyIs':
    '(The record’s key is the public ID of the key made for this animal when you sealed it. Its secret part stays in your backup and never goes in the bundle.)',
  'app.animal.v.app.plant.bundle.checkedAgainst':
    'It’s checked against the one saved to this animal before it goes in.',
  'app.animal.v.app.plant.cert.intro':
    "For your files and your lawyer: the sealed record, a fresh check that it hasn't changed, whether it is anchored, whether a DNA report ties it to the animal, and any lab receipt. It carries the record details but no genetic data or lab files. The QR code opens the record's public check page.",
  'app.animal.v.app.plant.att.noReceipt':
    'No lab has signed a receipt for this animal yet. A record only you stand behind is weaker evidence than one a lab signs for. Send a sample to a lab: their receipt is signed with their key, not yours.',
  'app.animal.v.app.verify.field.parent-names': 'Sire and dam (names and IDs)',
  'app.animal.v.app.verify.alwaysShown':
    "Always shown: the record ID, its proof code ({fp}), when the registry first stored it, and what this page could check about its batch and any signed attestations (a lab's receipt, a lab report). The animal's name only when the link carries it (yours do, unless you leave it out) or you choose to show it.",
  'app.animal.v.app.verify.ownReceiptTail':
    ' You see this because the animal is in this browser; someone you send the link to sees only the signature line above.',
  'app.animal.v.app.prove.openCheckPage': "Open the animal's check page",
  'app.animal.v.app.prove.doneText':
    "They'll see the answer on their page. Nothing about the animal was sent: only proof that you hold its record.",
  'app.animal.v.app.prove.thePlant': 'the animal',
  'app.animal.v.app.prove.thisPlant': 'this animal',
  'app.animal.v.app.prove.whatSends':
    "<b>What this sends:</b> only proof that you hold this animal's record, put on the test network. No name, no genetics, nothing about your other records.",
  'app.animal.v.app.prove.answering': "Answering tells whoever sent you this link that you hold this animal's record.",
  'app.animal.v.app.prove.watch.notWho': "It doesn't show who they are or who bred the animal.",
  'app.animal.v.app.prove.watch.holderStatement':
    "That this key belongs to this animal's record is the holder's statement for now. It doesn't show who they are or who bred the animal.",
  'app.animal.v.app.prove.watch.stampedYour':
    'Your animal’s key was date stamped on {when}. That dates the key, not the record.',
  'app.animal.v.app.prove.watch.stampedThisEarlier':
    'This animal’s key was date stamped on the network earlier. That dates the key, not the record.',
  'app.animal.v.app.prove.own.title': 'Prove you hold this animal’s key (test network)',
  'app.animal.v.app.prove.own.stampFirst':
    'Set up proof you hold it first: press “Set up proof you hold it” on the animal’s page. The proof is about the animal record’s on-chain identity, which that step creates.',
  // The lab report panels, a delivery and the saved report's sentence, for an animal.
  'app.animal.v.app.lab.sentence.none': 'No DNA report is saved to this animal.',
  'app.animal.v.app.lab.sentence.self':
    'A DNA report file is saved to this animal. No lab signature matches it, so it is the holder’s own statement.',
  'app.animal.v.app.lab.sentence.replaced':
    'The DNA report saved to this animal was replaced by the lab{on} with a corrected one. {tail}',
  'app.animal.v.app.lab.sentence.withdrawn': 'The DNA report saved to this animal was withdrawn by the lab{on}. {tail}',
  'app.animal.v.app.lab.results.replacedNewer':
    '<b>The DNA report saved to this animal was replaced by the lab.</b> Save the corrected one: open it, then tap “Save it to this animal”.',
  'app.animal.v.app.lab.results.replacedNone':
    '<b>The DNA report saved to this animal was replaced by the lab.</b> No current report from {lab}: the original was replaced and the correction withdrawn.',
  'app.animal.v.app.lab.results.withdrawn':
    '<b>The lab report saved to this animal was withdrawn by the lab.</b> It stays saved until you save another, and your certificate and links say it was withdrawn.',
  'app.animal.v.app.lab.results.withdrawnNewer':
    '<b>The lab report saved to this animal was withdrawn by the lab.</b> It stays saved until you save another, and your certificate and links say it was withdrawn. A newer lab report is here: open it, then save it to this animal.',
  'app.animal.v.app.lab.results.locked':
    'Locked so only you can open them, with this animal’s key from your backup. VeilCore stores them locked and doesn’t have the key.',
  'app.animal.v.app.lab.results.noKey':
    "This animal's key isn't on this device, so its lab reports can't be opened here. <link>Get your records back from your backup</link> first.",
  'app.animal.v.app.lab.results.whatOthersSee':
    '<b>What others can see.</b> The lab’s signature is public; the report isn’t. Anyone with a link to this animal’s check page sees that a lab report about it was signed, the report file’s SHA-256, and the name the lab’s key is registered under: marked “name not checked” unless VeilCore’s operator has matched it to a public license or accreditation listing. If you save the report to this animal and share “Whether a DNA report is saved” in Show someone, they also see that the saved file matches it.',
  'app.animal.v.app.lab.results.nothingYet':
    'Nothing yet. When a lab you sent a sample of this animal to sends a lab report, it shows up here.',
  'app.animal.v.app.lab.results.savedHere': ' · saved to this animal',
  'app.animal.v.app.lab.results.stillSaved': '. It is still saved to this animal.',
  'app.animal.v.app.lab.results.replacesSaved':
    'A lab report is already saved to this animal. Saving this one replaces it; you confirm on the next screen.',
  'app.animal.v.app.lab.send.nothingYet':
    "Nothing has changed yet. Your animal's page shows “waiting” until they enter the code, and can show this code again. They paste it into the box on VeilCore's Home.",
  'app.animal.v.app.lab.send.takenFromHelp': "The animal's individual ID, or where the sample was taken.",
};
