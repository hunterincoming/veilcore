// The record app in English: Home (components/flow/AppHome.tsx, plant-status-words.ts,
// stage/record-kinds.ts). Source text; see log.ts.
// SPDX-License-Identifier: Apache-2.0

export const home = {
  'app.home.firstPlant': 'Let’s log your first plant or animal',
  'app.home.oldLinks':
    'Check links and QR codes made before 17 October 2026 no longer show your records’ names: VeilCore keeps names locked now, so the registry has none to show. To share a name, open the record, choose Show someone, switch the name on, and send the new link. A new certificate has a new QR code.',
  'app.home.continueDraftNamed': 'Continue your draft: {name}',
  'app.home.continueDraft': 'Continue your draft',
  'app.home.draftKept': 'What you typed is kept in this browser. Pick up where you left off.',
  'app.home.aboutThreeMinutes':
    'About 3 minutes. When you’re done it has a public date stamp, and you hold the only key.',
  'app.home.aboutThreeMinutesByHand':
    "About 3 minutes. When you're done it's sealed; its public date comes when we anchor its batch (by hand for now). You hold the only key.",
  'app.home.continue': 'Continue',
  'app.home.start': 'Start',
  'app.home.spreadsheet': 'Have a spreadsheet? Date your whole collection',
  'app.home.newPhone': 'New phone? Get your records back',
  'app.home.newPhoneLab': "New phone? Get your lab's key and samples back",
  'app.home.labWhatShows': 'What does my signature show?',
  'app.home.labShows':
    "It shows that your key signed: that a sample arrived, or which report you sent. It doesn't show who holds the key: anyone can register a key under any name.",
  'app.home.breederToo': "I'm a breeder too",
  'app.home.imALab': "I'm a lab",
  'app.home.whatStops': 'What stops someone logging my plant or animal first?',
  'app.home.samplesReceived': 'Samples received',
  'app.home.yourPlants': 'Your plants',
  'app.home.logNew': 'Log new',
  'app.home.saveIt': 'Save it',
  'app.home.finishBackupLine': '<b>Finish: save your backup.</b> {line}',
  'app.home.keysOnlyHerePlants.one': 'A plant has keys only on this device.',
  'app.home.keysOnlyHerePlants.other': '{count} plants have keys only on this device.',
  'app.home.keysOnlyHereRecords.one': 'A record has keys only on this device.',
  'app.home.keysOnlyHereRecords.other': '{count} records have keys only on this device.',
  'app.home.resetWarningPlants.one':
    'A plant has keys with no checked backup. Save your backup first: clearing the browser later would lose them for good.',
  'app.home.resetWarningPlants.other':
    '{count} plants have keys with no checked backup. Save your backup first: clearing the browser later would lose them for good.',
  'app.home.resetWarningRecords.one':
    'A record has keys with no checked backup. Save your backup first: clearing the browser later would lose them for good.',
  'app.home.resetWarningRecords.other':
    '{count} records have keys with no checked backup. Save your backup first: clearing the browser later would lose them for good.',
  'app.home.resetConfirm':
    'Start over in this browser with a new, empty set?\n\nNothing is deleted. Your current records stay on VeilCore’s registry, locked. You can get them back only with your current keys, which will be downloaded now in one file. Keep it.',
  'app.home.startedOver': 'Started over. Restore your old records any time from the holder key file.',
  'app.home.imported.one': 'Imported {count} record.',
  'app.home.imported.other': 'Imported {count} records.',
  'app.home.alreadyHere.one': ' {count} already here was left as they are.',
  'app.home.alreadyHere.other': ' {count} already here were left as they are.',
  'app.home.importFailed': 'Import failed.',
  'app.home.labJobs': "Your lab's jobs",
  'app.home.labJobsText':
    "Confirm what arrives, then send results back from the record's page. Both are signed with your lab's own key, not by us, and results are locked so only the breeder can open them.",
  'app.home.confirmDelivery': 'Confirm a delivery',
  'app.home.labSignature': "Your lab's signature",
  'app.home.setUpLabSignature': "Set up your lab's signature",
  'app.home.openPlant': 'Open {name}',
  'app.home.quoted': '“{v}”',
  'app.home.labReportWaiting': 'Lab report waiting',
  'app.home.openAgreements': 'Open my agreements',
  'app.home.myAgreements': 'My agreements ({n})',
  'app.home.more': 'More',
  'app.home.saveABackup': 'Save a backup',
  'app.home.exportAll': 'Export all records',
  'app.home.importRecords': 'Import records',
  // TrustPanel.tsx
  'app.home.trust.title': '“What stops me from logging <em>your</em> cultivar?”',
  'app.home.trust.lede': 'Three things make a VeilCore record hard to fake:',
  'app.home.trust.1t': 'An earlier record shows as earlier',
  'app.home.trust.1b':
    'Once records are anchored, anyone can check which was anchored first. Before that, a record’s time is its device’s clock. A record is evidence, not a registration: it shows what you had and when, but doesn’t settle a dispute on its own.',
  'app.home.trust.2t': 'A paired report can be compared later',
  'app.home.trust.2b':
    'Pairing saves your DNA report’s code with the record, as your statement, so a fresh test of the material can later be compared with it. When you pair through VeilCore’s contract on Midnight, the pairing is dated too: it shows the record was paired with that report by then, not who had the report first. In {thisSite}, pairings aren’t dated yet.',
  'app.home.trust.3t': 'A second party takes delivery',
  'app.home.trust.3b':
    'When material is transferred, whoever takes it confirms receipt with their own key. That puts a second party on the record, not just you. It shows someone took delivery, not who they are.',
  // RolePicker.tsx (veilcore/role.ts ROLE_COPY) and AppFooter.tsx (ROLE_VIEW)
  'app.home.role.title': 'Which describes you?',
  'app.home.role.intro':
    "This only changes what we show you first. It doesn't limit what you can do, and you can change it at the bottom of any page.",
  'app.home.role.breeder.label': 'I breed or hold genetics',
  'app.home.role.breeder.blurb': 'Seal records of what you hold, send samples to labs, and license what you have bred.',
  'app.home.role.lab.label': 'I run a lab or receive material',
  'app.home.role.lab.blurb':
    'Receive material from clients, confirm what arrived, and sign your reports with your own key.',
  'app.home.role.both.label': 'Both',
  'app.home.role.both.blurb': 'You breed, and you also receive material from others.',
  'app.home.roleView.breeder': 'Breeder view',
  'app.home.roleView.lab': 'Lab view',
  'app.home.roleView.both': 'Breeder and lab view',
  'app.home.roleChange': '{view} · change',
  'app.home.chooseView': 'Breeder or lab? Choose your view',
  // SaveProblemBar.tsx
  'app.home.saveProblem.records': 'records',
  'app.home.saveProblem.agreements': 'agreements',
  'app.home.saveProblem.text':
    'The registry did not store some of your {what}, so they have been put back to what it holds: {list}',
  // RecordFinder.tsx
  'app.home.sort.recent': 'Newest first',
  'app.home.sort.oldest': 'Oldest first',
  'app.home.sort.name': 'Cultivar name',
  'app.home.sort.breeder': 'Bred by',
  'app.home.search.lab': 'Name, breeder, TR code, note or your accession no.',
  'app.home.search.breeder': 'Name, breeder, or your own reference',
  'app.home.search.aria': 'Search',
  'app.home.search.nothing':
    'Nothing matches "{q}". Search covers the name, who bred it, the record identifier, your own reference, and for a received sample its lab code and the breeder\'s note.',
  'app.home.search.nOfTotal': '{matched} of {total}',
  // PasteBox.tsx
  'app.home.paste.ownCode': "That's your own code. Send it to the lab; don't receive it here.",
  'app.home.paste.cutOff': 'That code looks cut off. Copy the whole lab code they sent you.',
  'app.home.paste.noneStamped':
    "That's a request to prove you hold a plant, but none of the plants on this device has a date stamp yet. On a new device? Get your plants back from your backup first.",
  'app.home.paste.unknown':
    "That doesn't look like a VeilCore code or link. Copy the whole thing they sent you and try again.",
  'app.home.paste.label': 'Someone sent you a code or link?',
  'app.home.paste.placeholder': 'Paste it here',
  'app.home.paste.go': 'Go',
  'app.home.paste.hint':
    "A lab code, a record link, a request to prove you hold a record, or an agreement to sign. We'll work out which.",
  'app.home.paste.whichPlant': "That's a request to prove you hold a plant. Which one did they ask about?",
  // plant-status-words.ts: a plant's line on Home.
  'app.home.notFinished': 'Not finished · next: save your backup',
  'app.home.receivedFrom': 'Received from {name}',
  'app.home.receivedFromNamed': 'From {name} · their record {id}',
  'app.home.receivedFromName': 'From {name}',
  'app.home.sealedOn': 'Sealed {date}',
  'app.home.labReportSaved': 'lab report saved',
  'app.home.keyStampQueued': 'key date stamp queued',
  'app.home.keyNotStamped': 'key not date stamped yet',
  'app.home.reportsSent.one': '{count} lab report sent',
  'app.home.reportsSent.other': '{count} lab reports sent',
  'app.home.reportWithdrawn': 'lab report withdrawn',
  // stage/record-kinds.ts: a record that dates a lab report, on Home.
  'app.home.labReportDated': 'DNA report dated',
  'app.home.datesReportFor': 'Dates a DNA report for {name}',
  'app.home.aPlant': 'a plant',
  'app.home.datingUnfinished': '{dated} · not finished · next: save your backup',
  'app.home.datingSealed': '{dated} · sealed {date}',
  // RegistryExportButton.tsx
  'app.home.export.label': 'Download your records and agreements from VeilCore',
  'app.home.export.done':
    "Downloaded: your records, agreements, sharing choices and every inclusion proof. Deliveries, their sample details and lab reports aren't in it: open them from the delivery or the plant's page. Your keys are in your backup file, not in this one.",
};
