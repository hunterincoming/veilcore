// The record app in English: the backup (components/flow/BackupStep.tsx, BackupPage.tsx,
// RestorePage.tsx, backup-words.ts, stage/record-kinds.ts). Source text; see log.ts.
// SPDX-License-Identifier: Apache-2.0

export const backup = {
  'app.backup.title': 'Save your backup',
  'app.backup.done': 'Done',
  'app.backup.shareTitle': 'VeilCore backup',
  'app.backup.onlyWay':
    "<b>This file is the only way to prove you hold your plants</b>, and to get them back on a new phone or computer. VeilCore can't recover it or make another.",
  'app.backup.saveIt': 'Save it',
  'app.backup.saved': 'Saved',
  'app.backup.savedSub': '{file} · one file for everything',
  'app.backup.saveFile': 'Save backup file',
  'app.backup.copyTitle': 'Put a copy somewhere else',
  'app.backup.wayBack': 'If this phone or computer breaks, that copy is your way back.',
  'app.backup.actAsYou': 'This file lets anyone who has it act as you. Keep it somewhere only you can open.',
  'app.backup.sentCopy': 'Sent a copy ✓',
  'app.backup.sendCopy': 'Send a copy (email, Drive, Files…)',
  'app.backup.shareFailed': "This browser couldn't open its share menu.",
  'app.backup.byHand':
    "Email it to yourself, or put it on Google Drive, iCloud or a USB stick. It's the file you just saved, in your Downloads folder.",
  'app.backup.checkTitle': 'Check it works',
  'app.backup.itWorks': 'It works.',
  'app.backup.openIntro':
    "Open the copy you just saved. We'll make sure it opens and has everything. Nothing is uploaded.",
  'app.backup.openCopy': 'Open my saved copy',
  'app.backup.saveFirst': 'Save the backup file first.',
  'app.backup.turnsOn': 'This turns on once the check passes.',
  // RestorePage.tsx
  'app.backup.restoreTitle': 'Get your plants back',
  'app.backup.restoreIntro': 'New phone or computer, or cleared your browser? Open the backup file you saved.',
  'app.backup.plantsBack': 'Your plants are back.',
  'app.backup.restored': 'Restored.',
  'app.backup.nothingNew': 'Nothing new in that file.',
  'app.backup.sentence': '{s} ',
  'app.backup.labSigBack': "Your lab's signature is back too. ",
  'app.backup.workRestored': '{work} restored. ',
  'app.backup.worksLikeBefore': 'Everything works like before.',
  'app.backup.nDeliveries.one': '{count} lab delivery',
  'app.backup.nDeliveries.other': '{count} lab deliveries',
  'app.backup.nCodes.one': '{count} lab code',
  'app.backup.nCodes.other': '{count} lab codes',
  'app.backup.and': '{a} and {b}',
  'app.backup.seeMyPlants': 'See my plants',
  'app.backup.lookIn':
    'Look in your email, Drive or iCloud, or on your USB stick. Any file name is fine. Nothing is uploaded.',
  'app.backup.openFile': 'Open my backup file',
  'app.backup.onlyKey': 'Have only your holder key (64 characters)?',
  'app.backup.keyLabel': 'Your holder key (64 characters)',
  'app.backup.useIt': 'Use it',
  'app.backup.olderVersion':
    "Only if you copied it from an older version of this site: it isn't shown anywhere now. That finds your records, but they stay locked until you open your backup file. A plant's date-stamp keys are only in that file too.",
  'app.backup.cantFind':
    "<b>Can't find the file?</b> Then nobody can bring the plants back, us included: we never had your key. That's what lets you prove you hold them. If your old device still works, open VeilCore there and save a new backup.",
  // stage/record-kinds.ts
  'app.backup.holds.none': 'Your records are in it.',
  'app.backup.holds.records.one': 'Your record is in it.',
  'app.backup.holds.records.other': 'All {count} of your records are in it.',
  'app.backup.holds.plants.one': 'Your plant is in it.',
  'app.backup.holds.plants.other': 'All {count} of your plants are in it.',
  'app.backup.restoredPlants.one': 'Keys for {count} plant restored.',
  'app.backup.restoredPlants.other': 'Keys for {count} plants restored.',
  'app.backup.restoredRecords.one': 'Keys for {count} record restored ({plants}, {datings}).',
  'app.backup.restoredRecords.other': 'Keys for {count} records restored ({plants}, {datings}).',
  'app.backup.nPlants.one': '{count} plant',
  'app.backup.nPlants.other': '{count} plants',
  'app.backup.nDatedReports.one': '{count} dated lab report',
  'app.backup.nDatedReports.other': '{count} dated lab reports',
  // backup-words.ts: veilcore/backup.ts's reasons, word for word.
  'app.backup.err.notBackup': "That file isn't a VeilCore backup. Pick the file you saved from VeilCore.",
  'app.backup.err.olderFile': "That's an older or different file. Pick the backup you just saved.",
  'app.backup.err.otherSet': 'That backup belongs to a different set of records. Pick the one you just saved.',
  'app.backup.err.notNow': "That backup doesn't hold your records as they are now. Save a new one and check that.",
  'app.backup.err.noLabSignature': "That backup doesn't hold your lab's signature. Save a new one and check that.",
  'app.backup.err.noDeliveries': "That backup doesn't hold your latest deliveries. Save a new one and check that.",
  'app.backup.err.differentKeys':
    'This browser already holds different keys for one of those plants. Nothing was changed.',
  'app.backup.err.differentSet': 'This browser is already using a different set of records. Nothing was changed.',
  'app.backup.err.differentLab': 'This browser already has a different lab signature. Nothing was changed.',
  'app.backup.err.missingLatest.one':
    'That backup is missing the latest for {count} of your records. Save a new one and check that.',
  'app.backup.err.missingLatest.other':
    'That backup is missing the latest for {count} of your records. Save a new one and check that.',
};
