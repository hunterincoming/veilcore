// A strain or line record's sentences (strain-profile.ts): each is the plant sentence for the
// same key with "strain" for "plant" (forKind in translate.ts picks them for a strain record).
// SPDX-License-Identifier: Apache-2.0

export const strain = {
  'app.strain.v.app.verify.noParents': 'No parents recorded.',
  'app.strain.v.app.plant.fix.name': 'Strain name',
  'app.strain.v.app.plant.fix.bredBy': 'Made or isolated by',
  'app.strain.v.app.verify.namePublished': 'Name the holder chose to show: ',
  'app.strain.v.app.verify.nameMatches': 'Name matches the record: ',
  'app.strain.v.app.verify.nameUnchecked': 'Name given in this link (not checked): ',
  'app.strain.v.app.log.reportIntro':
    "<b>Optional.</b> Already have a DNA report for this strain? This is what ties your record to the actual strain. Add it now and it's kept with the record. No report yet? Skip: the strain's page shows how to get one.",
  'app.strain.v.app.log.sealingPlant': 'Sealing your strain…',
  'app.strain.v.app.log.sealStampsKey':
    "Sealing also date stamps your strain's key, so you can prove you hold it later. Only a code made from the key goes out.",
  'app.strain.v.app.log.publicStampLater':
    "Its public date stamp comes when its batch is dated on {datedOn}. Your strain's page shows when that has happened. Nothing for you to do.",
  'app.strain.v.app.log.publicDateLater':
    "Its public date comes when its batch is dated on {datedOn}. Your strain's page shows it then.",
  'app.strain.v.app.log.keyStampedAt':
    "Key date stamped: {when}. Your strain's key is dated too, so you can prove you hold it later.{bound} Nothing about the strain went out.",
  'app.strain.v.app.log.keyStamped':
    "Key date stamped. Your strain's key is dated too, so you can prove you hold it later.{bound} Nothing about the strain went out.",
  'app.strain.v.app.log.stampingTitle': 'Sealed. Date stamping your strain’s key…',
  'app.strain.v.app.log.onlyFingerprint':
    "Only a code made from your strain's key goes out, nothing about the strain. Free: VeilCore pays the network fee.",
  'app.strain.v.app.log.stampingAria': 'Date stamping your strain’s key',
  'app.strain.v.app.log.keepOpen':
    'Keep this screen open, about a minute. If it closes, nothing is lost: your strain is saved, and its page will offer the date stamp again.',
  'app.strain.v.app.chain.stampMayHaveGoneOut':
    "Your date stamp may already have gone out{tx}. Your strain is saved. Don't try again until that transaction has been checked on the network.",
  'app.strain.v.app.chain.stampUnreachable':
    "Couldn't reach the network. Your strain is saved. Try again {when}, or do the date stamp later.",
  'app.strain.v.app.chain.stampDidntGoThrough':
    "The date stamp didn't go through. Your strain is saved. Try again {when}, or do the date stamp later.",
  'app.strain.v.app.pair.noPlant': 'Could not find the strain to save it to.',
  'app.strain.v.app.pair.savedTitle': 'DNA report saved to this strain',
  'app.strain.v.app.pair.noLabMatch':
    'No lab signature on this strain matches this file, so it stays your own statement.',
  'app.strain.v.app.pair.saved':
    "Saved. Your DNA report's code is saved with this strain's record, as your statement that this report belongs to it. It is not a check of the genetics. {dated}",
  'app.strain.v.app.pair.title': 'Save your DNA report to this strain',
  'app.strain.v.app.pair.intro':
    'Got your DNA report back? Save it to this strain. This is what ties your record to the actual strain: a fresh test can later be compared against it.',
  'app.strain.v.app.pair.savingTo': 'Saving to: <b>{name}</b> · made or isolated by {by}',
  'app.strain.v.app.pair.replaces':
    '<b>This strain already has a DNA report saved: “{name}”{saved}.</b> Saving this one replaces it. Your strain page, its certificate and links you share will show the new one, not the old one. Nothing is deleted from your device.',
  'app.strain.v.app.pair.replacesChain':
    '<b>This strain already has a DNA report saved: “{name}”{saved}.</b> Saving this one replaces it. Your strain page, its certificate and links you share will show the new one, not the old one. Nothing is deleted from your device. If you dated the old pairing on the network, that date stays there.',
  'app.strain.v.app.pair.chain.stampFirst':
    "Add your strain's date stamp first (from its page) if you also want to date this lab report on the network.",
  'app.strain.v.app.plant.notHereText':
    "If you sealed it in another browser, save a backup there and open it here (Get your strains back). If it is someone else's record, open the verify link they gave you instead.",
  'app.strain.v.app.plant.bredByName': 'Made or isolated by {name}',
  'app.strain.v.app.plant.action.saveReport': 'Save a DNA report to this strain',
  'app.strain.v.app.plant.f.reportSaved': 'saved to this strain ({file}) · pairing code {fp}{sha}',
  'app.strain.v.app.plant.backToPlant': 'Back to the strain',
  'app.strain.v.app.plant.tie.tied': 'Tied to the strain',
  'app.strain.v.app.plant.tie.notYet': 'Not tied to the strain yet',
  'app.strain.v.app.plant.tie.notNow': 'Not tied to the strain now',
  'app.strain.v.app.plant.tie.openedNotSaved': 'a lab report is open, not saved to this strain',
  'app.strain.v.app.plant.tie.sentence': 'Tied to the strain: {what}, {date}.',
  'app.strain.v.app.plant.tie.sentenceNoDate': 'Tied to the strain: {what}.',
  'app.strain.v.app.plant.tie.sentenceNone': 'Not tied to the strain yet: {what}.',
  'app.strain.v.app.plant.tie.sentenceNot': 'Not tied to the strain now: {what}.',
  'app.strain.v.app.plant.tie.means':
    'A DNA report lets a lab compare a new test of a strain with it. It doesn’t show by itself that a strain matches.',
  'app.strain.v.app.plant.tie.sub': 'Report {date}. A lab can compare a new test of the strain with it.',
  'app.strain.v.app.plant.tie.why': 'A DNA report from your lab is what ties a record to the strain itself.',
  'app.strain.v.app.plant.savedToPlant': 'saved to this strain',
  'app.strain.v.app.plant.openedNotSaved': 'opened, not saved to this strain',
  'app.strain.v.app.plant.keyStampLine':
    'Key date stamped: {when}. Your strain’s key is dated too, so you can prove you hold it later.',
  'app.strain.v.app.plant.next.backup.why':
    'This strain’s keys are only on this device right now. If it breaks or the browser is cleared, nobody can prove you hold it. Saving takes a minute.',
  'app.strain.v.app.plant.next.corrected.why':
    'The lab replaced the DNA report saved to this strain. Until you save the corrected one, your strain page, certificate and links say the saved one was replaced.',
  'app.strain.v.app.plant.next.labWithdrew.whyNewer':
    'It stays saved to this strain, and your certificate and links say it was withdrawn. A newer lab report is here: open it and save it instead.',
  'app.strain.v.app.plant.next.labWithdrew.why':
    'It stays saved to this strain, and your certificate and links say it was withdrawn. Ask the lab for a new one.',
  'app.strain.v.app.plant.next.open.why':
    'It’s locked so only you can open it, with this strain’s key. Opening it checks the lab’s signature here.',
  'app.strain.v.app.plant.next.sample.whySaved':
    'You’ve saved a DNA report to this strain, which is your own statement. A lab signing that it received a sample adds a second party, which is stronger evidence than your statement alone.',
  'app.strain.v.app.plant.next.sample.why':
    'Right now this record is your own account of the strain. A lab signing that it received a sample, and sending a lab report back, makes it stronger evidence than your own account.',
  'app.strain.v.app.plant.next.dna.title': 'Get a DNA report for this strain',
  'app.strain.v.app.plant.next.dna.why':
    'A dated record shows a description existed. A DNA report (a lab’s DNA fingerprint of the strain) is what ties your record to the actual strain. Two ways to get one:',
  'app.strain.v.app.plant.next.dna.haveText':
    'Save it to this strain. It’s read on your device; the file is never uploaded.',
  'app.strain.v.app.plant.next.date.why':
    'It’s saved to this strain, but nothing dates it yet. Dating it shows the report existed by that date, without showing anyone the markers.',
  'app.strain.v.app.plant.next.save.title': 'Save the DNA report to this strain',
  'app.strain.v.app.plant.next.save.why':
    'A lab signed that it received a sample. When its DNA report comes back, save it to this strain: that is what ties your record to the strain, so a later test can be compared with it.',
  'app.strain.v.app.plant.next.save.action': 'Save it to this strain',
  'app.strain.v.app.plant.next.ready.why':
    'A lab signed that it received a sample, and a DNA report is saved to this strain. You can send material onward or license it, with terms that apply to offspring declared from this record.',
  'app.strain.v.app.plant.tree.none':
    'No lineage recorded yet. Add parent strains when logging to build the family tree.',
  'app.strain.v.app.plant.anchor.keysNotHere':
    'This strain’s key isn’t in this browser. Get it back from your backup file: a new key wouldn’t match the sealed record.',
  'app.strain.v.app.plant.bundle.keyIs':
    '(The record’s key is the public ID of the key made for this strain when you sealed it. Its secret part stays in your backup and never goes in the bundle.)',
  'app.strain.v.app.plant.bundle.checkedAgainst':
    'It’s checked against the one saved to this strain before it goes in.',
  'app.strain.v.app.plant.cert.intro':
    "For your files and your lawyer: the sealed record, a fresh check that it hasn't changed, whether it is anchored, whether a DNA report ties it to the strain, any lab receipt and active licenses. It carries the record details but no genetic data or lab files. The QR code opens the record's public check page.",
  'app.strain.v.app.plant.att.noReceipt':
    'No lab has signed a receipt for this strain yet. A record only you stand behind is weaker evidence than one a lab signs for. Send a sample to a lab: their receipt is signed with their key, not yours.',
  'app.strain.v.app.verify.field.parent-names': 'Parent strains (names and deposit numbers)',
  'app.strain.v.app.verify.alwaysShown':
    "Always shown: the record ID, its proof code ({fp}), when the registry first stored it, and what this page could check about its batch and any signed attestations (a lab's receipt, a lab report). The name only when the link carries it (yours do only when you switch that on) or you choose to show it.",
  'app.strain.v.app.verify.ownReceiptTail':
    ' You see this because the strain is in this browser; someone you send the link to sees only the signature line above.',
  'app.strain.v.app.prove.openCheckPage': "Open the strain's check page",
  'app.strain.v.app.prove.doneText':
    "They'll see the answer on their page. Nothing about the strain was sent: only proof that you hold its record.",
  'app.strain.v.app.prove.thePlant': 'the strain',
  'app.strain.v.app.prove.thisPlant': 'this strain',
  'app.strain.v.app.prove.whatSends':
    "<b>What this sends:</b> only proof that you hold this strain's record, put on the test network. No name, no genetics, nothing about your other strains.",
  'app.strain.v.app.prove.answering': "Answering tells whoever sent you this link that you hold this strain's record.",
  'app.strain.v.app.prove.watch.notWho': "It doesn't show who they are or who made or isolated the strain.",
  'app.strain.v.app.prove.watch.holderStatement':
    "That this key belongs to this strain's record is the holder's statement for now. It doesn't show who they are or who made or isolated the strain.",
  'app.strain.v.app.prove.watch.stampedYour':
    'Your strain’s key was date stamped on {when}. That dates the key, not the record.',
  'app.strain.v.app.prove.watch.stampedThisEarlier':
    'This strain’s key was date stamped on the network earlier. That dates the key, not the record.',
  'app.strain.v.app.prove.own.title': 'Prove you hold this strain’s key (test network)',
  'app.strain.v.app.prove.own.stampFirst':
    'Set up proof you hold it first: press “Set up proof you hold it” on the strain’s page. The proof is about the strain’s on-chain identity, which that step creates.',
  'app.strain.v.app.lab.sentence.none': 'No DNA report is saved to this strain.',
  'app.strain.v.app.lab.sentence.self':
    'A DNA report file is saved to this strain. No lab signature matches it, so it is the holder’s own statement.',
  'app.strain.v.app.lab.sentence.replaced':
    'The DNA report saved to this strain was replaced by the lab{on} with a corrected one. {tail}',
  'app.strain.v.app.lab.sentence.withdrawn': 'The DNA report saved to this strain was withdrawn by the lab{on}. {tail}',
  'app.strain.v.app.lab.results.replacedNewer':
    '<b>The DNA report saved to this strain was replaced by the lab.</b> Save the corrected one: open it, then tap “Save it to this strain”.',
  'app.strain.v.app.lab.results.replacedNone':
    '<b>The DNA report saved to this strain was replaced by the lab.</b> No current report from {lab}: the original was replaced and the correction withdrawn.',
  'app.strain.v.app.lab.results.withdrawn':
    '<b>The lab report saved to this strain was withdrawn by the lab.</b> It stays saved until you save another, and your certificate and links say it was withdrawn.',
  'app.strain.v.app.lab.results.withdrawnNewer':
    '<b>The lab report saved to this strain was withdrawn by the lab.</b> It stays saved until you save another, and your certificate and links say it was withdrawn. A newer lab report is here: open it, then save it to this strain.',
  'app.strain.v.app.lab.results.locked':
    'Locked so only you can open them, with this strain’s key from your backup. VeilCore stores them locked and doesn’t have the key.',
  'app.strain.v.app.lab.results.noKey':
    "This strain's key isn't on this device, so its lab reports can't be opened here. <link>Get your strains back from your backup</link> first.",
  'app.strain.v.app.lab.results.whatOthersSee':
    '<b>What others can see.</b> The lab’s signature is public; the report isn’t. Anyone with a link to this strain’s check page sees that a lab report about it was signed, the report file’s SHA-256, and the name the lab’s key is registered under: marked “name not checked” unless VeilCore’s operator has matched it to a public license or accreditation listing. If you save the report to this strain and share “Whether a DNA report is saved” in Show someone, they also see that the saved file matches it.',
  'app.strain.v.app.lab.results.nothingYet':
    'Nothing yet. When a lab you sent this strain to sends a lab report, it shows up here.',
  'app.strain.v.app.lab.results.savedHere': ' · saved to this strain',
  'app.strain.v.app.lab.results.stillSaved': '. It is still saved to this strain.',
  'app.strain.v.app.lab.results.replacesSaved':
    'A lab report is already saved to this strain. Saving this one replaces it; you confirm on the next screen.',
  'app.strain.v.app.lab.send.nothingYet':
    "Nothing has changed yet. Your strain's page shows “waiting” until they enter the code, and can show this code again. They paste it into the box on VeilCore's Home.",
  'app.strain.v.app.lab.send.takenFromHelp': 'The mother strain or its location tag.',
  // What a strain is made by, not bred by (strain-words.test).
  'app.strain.v.app.plant.f.method': 'How it was made',
  'app.strain.v.app.plant.f.statedDate': 'Stated date made or isolated (the holder’s claim)',
  'app.strain.v.app.plant.fix.field.cultivarName': 'strain name',
  'app.strain.v.app.plant.fix.field.breederName': 'made or isolated by',
  'app.strain.v.app.plant.fix.field.breedingMethod': 'how it was made',
  'app.strain.v.app.verify.field.breeding-method': 'How it was made',
  'app.strain.v.app.verify.field.bred-by': 'Made or isolated by',
  'app.strain.v.app.verify.method': 'How it was made, as the holder states it: {method}',
  'app.strain.v.app.verify.noMethod': 'No method recorded.',
  'app.strain.v.app.verify.bredByShared': 'Made or isolated by, as the holder wrote it: {name}',
  'app.strain.v.app.verify.noBredBy': 'No maker recorded.',
};
