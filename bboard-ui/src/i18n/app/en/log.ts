// The record app in English: logging a plant (components/flow/LogFlow.tsx). This is the
// source text: every word here is shown exactly as the app showed it before it was
// translated. A value that starts with a space joins the sentence before it; a translation
// puts its own spacing there (Japanese: none).
//
// The stage questions are stage-notes.ts's own words (STAGE_PROMPT, SELECTED_PROMPT,
// SEAL_EACH_STAGE), copied rather than imported so the word files can use the translator
// without a loop of imports; translations.test.ts checks they still match.
// SPDX-License-Identifier: Apache-2.0

export const log = {
  'app.log.stepOf': 'Step {n} of {total}',
  'app.log.optional': 'Optional',
  'app.log.method.f1': 'Seed — F1',
  'app.log.method.f2': 'Seed — F2',
  'app.log.method.s1': 'Seed — selfed (S1)',
  'app.log.method.backcross': 'Seed — backcross',
  'app.log.method.clone': 'Clone / cutting',
  'app.log.method.tissue': 'Tissue culture',
  'app.log.method.selection': 'Selection',
  'app.log.method.landrace': 'Landrace / heirloom',
  'app.log.method.other': 'Other',
  'app.log.nextSaveBackup': 'Next: save your backup',
  'app.log.reportIntro':
    "<b>Optional.</b> Already have a DNA report for this plant? This is what ties your record to the actual plant. Add it now and it's kept with the record. No report yet? Skip: the plant's page shows how to get one.",
  'app.log.finish': 'Finish',
  'app.log.nextStageTitle': 'Log the next generation or selection',
  'app.log.opening': 'Opening {id}…',
  'app.log.notInBrowser': "If it doesn't open, that plant isn't in this browser. <link>Log a new plant instead</link>",
  'app.log.keptEitherWay': 'It stays kept in this browser either way.',
  'app.log.keepAndStart': 'Keep it and start the next stage',
  'app.log.continueThat': 'Continue that plant',
  'app.log.unsavedPlant': 'You have an unsaved plant: {name}.',
  'app.log.noNameYet': '(no name yet)',
  'app.log.title': 'Log your plant',
  'app.log.fillIn': "Fill in what you know. You'll check it on the next screen.",
  'app.log.sealEachStage': 'A record dates nothing earlier than the day it’s sealed. Seal each stage when it happens.',
  'app.log.parentLinked': ' Its parent is {name}, already linked below.',
  'app.log.keptLastTime': 'We kept what you typed last time.',
  'app.log.startOver': 'Start over',
  'app.log.nameLabel': 'Plant or line name',
  'app.log.namePlaceholder': 'e.g. Harbour Mist',
  // LogFlow.tsx, AnimalForm.tsx, CorrectRecord.tsx: under the name field. The name is the
  // one thing typed into a record that isn't locked (CONTRACT.md #4 strainName).
  'app.log.nameHelp':
    'Locked like the other details. Your check links carry it after the #, so the people you send a link to see it, and anyone they pass it on to.',
  'app.log.eg': 'e.g. {v}',
  'app.log.egNextSelection': 'e.g. {name}, next selection',
  'app.log.bredBy': 'Bred by',
  'app.log.bredByPlaceholder': 'Your name or business',
  'app.log.whenMade': 'When you made it (your own note)',
  'app.log.whenMadeHelp': 'The public date stamp comes from the network. This is just what you tell people.',
  'app.log.stagePrompt': 'What stage is this? (e.g. F3, second clone run)',
  'app.log.stageHelp': 'Sealed in the notes as “Stage: …”.',
  'app.log.selectedPrompt': 'What did you select for?',
  'app.log.selectedHelp': 'Sealed in the notes as “Selected for: …”.',
  'app.log.fewer': '− Fewer details',
  'app.log.more': '+ Add parents, species, photos or notes',
  'app.log.parents': 'Parents',
  'app.log.parentsHelp': "Pick a plant you've logged, or type a name and press Enter.",
  'app.log.species': 'Species',
  'app.log.speciesPlaceholder': 'e.g. Solanum lycopersicum',
  'app.log.howMade': 'How it was made',
  'app.log.howMadeStageHelp': 'How was this stage made? It isn’t carried over from the parent.',
  'app.log.notSaying': 'Not saying',
  'app.log.readingPhotos': 'Reading photos…',
  'app.log.addPhotos': 'Add photos',
  'app.log.photos.one': '{count} photo',
  'app.log.photos.other': '{count} photos',
  'app.log.photosStay': 'Photos stay on your device. Only a code made from each is kept.',
  'app.log.refId': 'Your own lot or reference number',
  'app.log.notes': 'Notes',
  'app.log.nextCheck': 'Next: check it',
  'app.log.readingYourPhotos': 'Reading your photos…',
  'app.log.nameAndBreeder': 'A name and who bred it are all you need.',
  'app.log.reviewTitle': 'Is this right?',
  'app.log.fixNow': 'Fix anything now.',
  'app.log.k.plant': 'Plant or line',
  'app.log.k.made': 'Made (your note)',
  'app.log.k.more': 'More details',
  'app.log.noneAdded': 'None added',
  'app.log.x.stage': 'Stage: {v}',
  'app.log.x.selectedFor': 'Selected for: {v}',
  'app.log.x.parents': 'Parents: {v}',
  'app.log.x.species': 'Species: {v}',
  'app.log.x.madeBy': 'Made by: {v}',
  'app.log.x.ref': 'Your reference: {v}',
  'app.log.x.notes': 'Notes added',
  'app.log.sealedWarn':
    "<b>Once sealed, this part can't change.</b> You can add reports and corrections later; a correction is a new record that points back to this one. That's what makes the date stamp worth something.",
  'app.log.savedOn':
    'The details are stored locked on {server}, so you can come back to them, and we don’t have the key. The name is locked too; your check links carry it after the #, for the people you send them to. Only a proof code is dated on {datedOn}.',
  'app.log.sealing': 'Sealing…',
  'app.log.seal': 'Seal it',
  'app.log.sealingPlant': 'Sealing your plant…',
  'app.log.sealStampsKey':
    "Sealing also date stamps your plant's key, so you can prove you hold it later. Only a code made from the key goes out.",
  'app.log.sealed': 'Sealed',
  'app.log.publicStampLater':
    "Its public date stamp comes when its batch is dated on {datedOn}. Your plant's page shows when that has happened. Nothing for you to do.",
  'app.log.privateWindow':
    "This browser won't keep anything after you close it (a private window, or site data is blocked). Save your backup first, then we'll add the date stamp.",
  'app.log.backupFirstTitle': 'Save your backup first',
  'app.log.nowStamp': 'Now add the date stamp',
  'app.log.recordDatedWaiting': 'Record dated: waiting for a batch',
  'app.log.publicDateLater':
    "Its public date comes when its batch is dated on {datedOn}. Your plant's page shows it then.",
  'app.log.keyStampedAt':
    "Key date stamped: {when}. Your plant's key is dated too, so you can prove you hold it later.{bound} Nothing about the plant went out.",
  'app.log.keyStamped':
    "Key date stamped. Your plant's key is dated too, so you can prove you hold it later.{bound} Nothing about the plant went out.",
  'app.log.keyBound': ' The sealed record names this key, so nobody can swap in another.',
  'app.log.stampFailedTitle': 'Sealed. Key not date stamped yet',
  'app.log.stampingTitle': 'Sealed. Date stamping your plant’s key…',
  'app.log.onlyFingerprint':
    "Only a code made from your plant's key goes out, nothing about the plant. Free: VeilCore pays the network fee.",
  'app.log.stampingAria': 'Date stamping your plant’s key',
  'app.log.stampLater': 'Do the date stamp later',
  'app.log.keepOpen':
    'Keep this screen open, about a minute. If it closes, nothing is lost: your plant is saved, and its page will offer the date stamp again.',
};
