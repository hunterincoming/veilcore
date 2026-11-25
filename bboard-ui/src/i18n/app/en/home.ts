// The record app in English: Home (components/flow/AppHome.tsx, plant-status-words.ts,
// stage/record-kinds.ts). Source text; see log.ts.
// SPDX-License-Identifier: Apache-2.0

export const home = {
  'app.home.firstRecord': 'Let’s make your first record',
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
  'app.home.start': 'Make a record',
  'app.home.spreadsheet': 'Have a spreadsheet? Date your whole collection',
  'app.home.newPhone': 'New phone? Get your records back',
  'app.home.newPhoneLab': "New phone? Get your lab's key and samples back",
  'app.home.labWhatShows': 'What does my signature show?',
  'app.home.labShows':
    "It shows that your key signed: that a sample arrived, or which report you sent. It doesn't show who holds the key: anyone can register a key under any name.",
  'app.home.breederToo': "I'm a breeder too",
  'app.home.imALab': "I'm a lab",
  'app.home.whatStops': 'What stops someone logging my material first?',
  'app.home.samplesReceived': 'Samples received',
  'app.home.yourRecords': 'Your records',
  'app.home.logNew': 'Make a record',
  'app.home.saveIt': 'Save it',
  'app.home.finishBackupLine': '<b>Finish: save your backup.</b> {line}',
  'app.home.keysOnlyHereRecords.one': 'A record has keys only on this device.',
  'app.home.keysOnlyHereRecords.other': '{count} records have keys only on this device.',
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
  'app.home.labSignature': "Your lab's signing key",
  'app.home.setUpLabSignature': "Set up your lab's signing key",
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
  'app.home.trust.title': '“What stops me from logging <em>your</em> material?”',
  'app.home.trust.lede': 'Three things stand behind a VeilCore record:',
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
  // lab/LabDoor.tsx: /for-labs, asked once of a breeder with records of their own
  'app.home.labDoor.title': 'Add lab tools?',
  'app.home.labDoor.what': "You'll see a lab view with your signing key and samples you receive.",
  'app.home.labDoor.text': 'Your records stay as they are.',
  'app.home.labDoor.add': 'Add lab tools',
  'app.home.labDoor.notNow': 'Not now',
  'app.labpage.title': 'VeilCore for labs',
  'app.labpage.lede':
    'Sign the results you already produce. The breeder can show them, and whoever they show can check which key signed them, and when. Your own system keeps working as it does.',
  'app.labpage.setUp': 'Set up your lab',
  'app.labpage.gets.title': 'What your lab gets',
  'app.labpage.gets.key.t': 'A signing key.',
  'app.labpage.gets.key.p':
    'Made in your browser. The receipts and results you sign carry it, and anyone you show them to can check the signature.',
  'app.labpage.gets.arrived.t': 'A signed receipt for each sample.',
  'app.labpage.gets.arrived.p':
    'A breeder sends a sample with a VeilCore lab code. You confirm it arrived, or turn it away, and sign that.',
  'app.labpage.gets.results.t': 'Results locked to the breeder.',
  'app.labpage.gets.results.p':
    'Only the breeder, your lab and whoever sent the sample see them, and only the breeder can show them to anyone else.',
  'app.labpage.work.title': 'What changes in your work',
  'app.labpage.work.p1':
    'Nothing in your own system. When a sample comes with a lab code, you paste or scan the code, confirm the delivery, and later sign your result.',
  'app.labpage.work.p2':
    'Your sample data and client names stay with you. VeilCore keeps the receipts you sign, and your results locked so only the breeder can open them.',
  'app.labpage.cost.title': 'What it costs',
  'app.labpage.cost.p': 'Free to try. Plans for labs are built and not switched on.',
  'app.labpage.own.title': 'Use it your way',
  'app.labpage.own.lede':
    "You never have to use veilcore.org. All of VeilCore's code is open, under the Apache-2.0 license.",
  'app.labpage.own.site.t': 'Use veilcore.org.',
  'app.labpage.own.site.p': 'Nothing to set up. We run the server and pay the network fees.',
  'app.labpage.own.plug.t': 'Plug it into your own software.',
  'app.labpage.own.plug.p':
    'Your system keeps your data and adds a proof code for each record, with the smart contracts package @veilcore/contracts.',
  'app.labpage.own.plug.link': 'How to plug it in →',
  'app.labpage.own.run.t': 'Run your own copy.',
  'app.labpage.own.run.p':
    'The website, the server that keeps records and the fee service are all open code. You would host them and pay your own network fees. The self-hosting guide lists every part and setting.',
  'app.labpage.own.run.link': 'The self-hosting guide →',
  'app.labpage.own.plainly':
    'Plainly: running your own copy is possible from the open code, but nobody outside VeilCore has done it yet, so doing it without our help is untested. A copy uses your own address and name once it is built with them, as the guide says. The main records smart contract has a maintenance key, which we hold. The claims smart contract has none.',
  'app.labpage.own.policyLink': 'Who holds the maintenance key, and when it may be used →',
  'app.labpage.own.codeLink': 'The code on GitHub →',
  'app.labpage.gone.title': 'If VeilCore disappears',
  'app.labpage.gone.p':
    "What's already dated stays dated: the dates are on Midnight, and a breeder's backup file holds their records and the proofs to check them with free, open tools. What stops is making new records and passing lab codes along, until someone runs a server from the open code.",
  'app.labpage.gone.link': 'Everything that keeps working without us →',
  // SaveProblemBar.tsx
  'app.home.saveProblem.records': 'records',
  'app.home.saveProblem.agreements': 'agreements',
  'app.home.saveProblem.unreachable':
    'VeilCore couldn’t be reached, so your latest {what} aren’t saved there yet. They’re kept in this browser and sent again with the next save.',
  'app.home.saveProblem.text':
    'The registry did not store some of your {what}, so they have been put back to what it holds: {list}',
  // RecordFinder.tsx
  'app.home.sort.recent': 'Newest first',
  'app.home.sort.oldest': 'Oldest first',
  'app.home.sort.name': 'Name',
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
    "That's a request to prove you hold a record, but none of the records on this device has a date stamp yet. On a new device? Get your records back from your backup first.",
  'app.home.paste.unknown':
    "That doesn't look like a VeilCore code or link. Copy the whole thing they sent you and try again.",
  'app.home.paste.label': 'Someone sent you a code or link?',
  'app.home.paste.placeholder': 'Paste it here',
  'app.home.paste.go': 'Go',
  'app.home.paste.orMake': 'Nothing to paste? Make a record',
  'app.home.paste.hint': "A lab code, a record link or an agreement to sign. We'll work out which.",
  'app.home.paste.whichRecord': "That's a request to prove you hold a record. Which one did they ask about?",
  // plant-status-words.ts: a plant's line on Home.
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
  'app.home.datingSealed': '{dated} · sealed {date}',
  // flow/BackupNeeded.tsx: Home's one backup line, for the whole account, only while one is needed.
  'app.home.backupLine':
    '<b>Not in your backup yet.</b> Until you save it, what you’ve recorded is kept only in this browser.',
  // RegistryExportButton.tsx
  'app.home.export.label': 'Download your records and agreements from VeilCore',
  'app.home.export.done':
    "Downloaded: your records, agreements, sharing choices and every inclusion proof. Deliveries, their sample details and lab reports aren't in it: open them from the delivery or the plant's page. Your keys are in your backup file, not in this one.",
  // PlanBox.tsx, billing.ts, records.ts: paid plans (off unless VITE_PAID_PLANS=on)
  'app.plan.full':
    'Your free records are used up, so no new record was made. Everything you already have keeps verifying. Choose a plan on your records page to add more.',
  'app.plan.unknown':
    'VeilCore couldn’t check your plan just now, so no new record was made. Check your connection and try again.',
  'app.plan.box.free': 'Free plan: {held} of {cap} dated records',
  'app.plan.box.left': 'Free dated records left: {n}',
  'app.plan.box.countsDeleted': 'Dated records count even if you later delete them.',
  'app.plan.changeFull':
    'This change would date a new version, and your free dated records are used up, so nothing was changed. Everything you already have keeps verifying. Choose a plan on your records page to date more.',
  'app.plan.receiveFull':
    'There’s no free dated record left to receive this delivery. Your code is kept in this browser: choose a plan on your records page, then enter it again.',
  'app.plan.box.rules': 'A record’s first correction is free. Receiving a delivery needs one free dated record.',
  'app.plan.box.paid': 'Your plan: {plan}',
  'app.plan.name.breeder': 'Breeder',
  'app.plan.name.lab': 'Lab',
  'app.plan.name.free': 'Free',
  'app.plan.choose': 'Choose a plan',
  'app.plan.buy.breeder': 'Breeder plan',
  'app.plan.buy.lab': 'Lab plan',
  'app.plan.opens':
    'Opens Paddle’s page in a new tab. Paddle sells the plans for VeilCore and takes the payment; VeilCore never sees your card or your email.',
  'app.plan.keep': 'Whatever you choose, every record you already have keeps verifying.',
  'app.plan.recheck': 'Paid? Check again',
  'app.plan.err.off': 'Plans can’t be bought from this browser yet.',
  'app.plan.err.unreachable': 'Paddle’s page couldn’t be opened just now. Try again shortly.',
  'app.plan.err.busy': 'Too many tries in an hour. Try again later.',
  'app.plan.err.noRecord': 'Save a record first: a plan is for the records you date.',
  'app.plan.err.blocked': 'Your browser blocked Paddle’s page. Allow pop-ups for this site, then try again.',
  'app.plan.buy.other': '{plan} plan',
  'app.plan.importFull':
    'This file has {n} records new to VeilCore, and your free plan can date {left} more. Nothing was imported. Choose a plan on your records page to date more.',
  'app.plan.box.full':
    'Your free records are used up. Everything you already have keeps verifying. Choose a plan to add more.',
  'app.home.labSheet': "Seal today's sheet",
  'app.labpage.work.sheet':
    'Export a spreadsheet of your cultures or samples each day? Seal the whole sheet at once. After the first time, this device remembers its columns, so the next day it is one button.',
  'app.labpage.work.sheetLink': "Seal today's sheet",
};
