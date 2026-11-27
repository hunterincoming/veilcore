// The record app in English: the backup (components/flow/BackupStep.tsx, BackupPage.tsx,
// RestorePage.tsx, backup-words.ts, stage/record-kinds.ts). Source text; see log.ts.
// SPDX-License-Identifier: Apache-2.0

export const backup = {
  'app.backup.title': 'Save your backup',
  'app.backup.done': 'Done',
  'app.backup.shareTitle': 'VeilCore backup',
  'app.backup.oneWay':
    '<b>A file you keep.</b> One of the ways to get your records back, and it works even without VeilCore.',
  'app.backup.lock.text':
    'Saves your records with VeilCore, locked so only you can open them: VeilCore doesn’t have the key.',
  'app.backup.lock.orFile': 'Or keep a file yourself',
  'app.backup.lock.savedTitle': 'Saved with VeilCore.',
  'app.backup.lock.savedText':
    'These records come back on a new device with your passkey. New ones save by themselves. A file you keep is in Settings, if you want one too.',
  'app.backup.lock.saving': 'Saving with VeilCore…',
  'app.backup.saveIt': 'Save it',
  'app.backup.saved': 'Saved',
  'app.backup.savedSub': '{file} · one file for everything',
  'app.backup.labKeyNotMade':
    'Your lab’s receiving key couldn’t be made just now, so this backup doesn’t hold it yet. The backup is good for everything else. Save a new one after your first record arrives.',
  'app.backup.saveFile': 'Save backup file',
  'app.backup.copyTitle': 'Put a copy somewhere else (recommended)',
  'app.backup.wayBack': 'If this phone or computer breaks, that copy is your way back.',
  'app.backup.safari':
    'This browser can clear a site’s data after 7 days without a visit. Your backup file is what brings your records back, so keep it.',
  'app.backup.actAsYou':
    'Anyone with this file can open your records and act as you, unless it has a password. Best: a USB stick or a password manager. Keep the password apart from the file.',
  'app.backup.sentCopy': 'Sent a copy ✓',
  'app.backup.sendCopy': 'Save a copy somewhere else (Files, Drive…)',
  'app.backup.shareFailed': "This browser couldn't open its share menu.",
  'app.backup.byHand': 'It’s the file you just saved, in your Downloads folder.',
  'app.backup.saveAgain': 'Save another copy',
  'app.backup.savedAgain': 'Saved another copy ✓',
  'app.backup.checkTitle': 'Check it works',
  'app.backup.itWorks': 'It works.',
  'app.backup.openIntro':
    "Open the copy you just saved. We'll make sure it opens and has everything. Nothing is uploaded.",
  'app.backup.openCopy': 'Open my saved copy',
  'app.backup.saveFirst': 'Save the backup file first.',
  'app.backup.turnsOn': 'This turns on once the check passes.',
  'app.backup.pw.add': 'Lock it with a password (suggested)',
  'app.backup.pw.why':
    'Then the file alone opens nothing: whoever has it also needs the password. If you forget it, nobody can open the file, us included.',
  'app.backup.pw.required':
    "A password is required: this file holds your lab's signing key, and whoever had it could sign results as your lab.",
  'app.backup.pw.label': 'Password for the backup file',
  'app.backup.pw.again': 'Type it again',
  'app.backup.pw.short': 'At least {n} characters.',
  'app.backup.pw.mismatch': "The two don't match.",
  'app.backup.pw.keep': 'Keep it in a password manager, or written down, apart from the file.',
  'app.backup.pw.locking': 'Locking the file…',
  'app.backup.pw.savedSub': '{file} · one file for everything, locked with your password',
  'app.backup.pw.needed': 'This backup has a password. Type it to open the file.',
  'app.backup.pw.wrong': "That password doesn't open this backup. Nothing was changed.",
  'app.backup.pw.checkLabel': "The backup's password",
  'app.backup.pw.open': 'Open it',
  // RestorePage.tsx
  'app.backup.restoreTitle': 'Get your records back',
  'app.backup.restoreIntro': 'New phone or computer, or cleared your browser? Open the backup file you saved.',
  'app.backup.ownOnly': 'Only open a file or code you saved yourself. VeilCore will never ask for or send you one.',
  'app.backup.preview.one': 'This backup was made on {date} and holds {count} record. Bring it here?',
  'app.backup.preview.other': 'This backup was made on {date} and holds {count} records. Bring them here?',
  'app.backup.previewUndated.one': 'This backup holds {count} record. Bring it here?',
  'app.backup.previewUndated.other': 'This backup holds {count} records. Bring them here?',
  'app.backup.plantsBack': 'Your records are back.',
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
  'app.backup.seeMyPlants': 'See my records',
  'app.backup.lookIn': 'Look on your USB stick, in your password manager or your cloud drive. Nothing is uploaded.',
  'app.backup.openFile': 'Open my backup file',
  'app.backup.onlyKey': 'Have only your holder key (64 characters)?',
  'app.backup.keyLabel': 'Your holder key (64 characters)',
  'app.backup.useIt': 'Use it',
  'app.backup.olderVersion':
    "Only if you copied it from an older version of this site: it isn't shown anywhere now. That finds your records, but they stay locked until you open your backup file. A record's date-stamp keys are only in that file too.",
  'app.backup.cantFind':
    "<b>Can't find the file?</b> Then nobody can bring the records back, us included: we never had your key. That's what lets you prove you hold them. If your old device still works, open VeilCore there and save a new backup.",
  // stage/record-kinds.ts
  'app.backup.holds.none': 'Your records are in it.',
  'app.backup.holds.records.one': 'Your record is in it.',
  'app.backup.holds.records.other': 'All {count} of your records are in it.',
  'app.backup.restoredPlants.one': 'Keys for {count} record restored.',
  'app.backup.restoredPlants.other': 'Keys for {count} records restored.',
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
  'app.backup.err.noLicenses': "That backup doesn't hold your latest licenses. Save a new one and check that.",
  'app.backup.err.noLender':
    "That backup doesn't hold your lender key and latest claims. Save a new one and check that.",
  'app.backup.err.noDeliveries': "That backup doesn't hold your latest deliveries. Save a new one and check that.",
  'app.backup.err.differentKeys':
    'This browser already holds different keys for one of those records. Nothing was changed.',
  'app.backup.err.differentSet': 'This browser is already using a different set of records. Nothing was changed.',
  'app.backup.err.differentLab': 'This browser already has a different lab signature. Nothing was changed.',
  'app.backup.err.missingLatest.one':
    'That backup is missing the latest for {count} of your records. Save a new one and check that.',
  'app.backup.err.missingLatest.other':
    'That backup is missing the latest for {count} of your records. Save a new one and check that.',
  // A passkey, and records saved with VeilCore (veilcore/passkey-backup.ts, account-copy.ts).
  'app.backup.passkey.err.unsupported':
    "This phone or browser can't make a passkey that opens a backup. Use the backup file, or try Safari on an iPhone (iOS 18.4 or newer) or Chrome.",
  'app.backup.passkey.err.cancelled': 'Cancelled. Nothing was changed.',
  'app.backup.passkey.err.noCopy':
    'No records saved with VeilCore were found for that passkey. Open your backup file instead.',
  'app.backup.passkey.err.unreachable': 'Could not reach the VeilCore registry. Check your connection and try again.',
  'app.backup.passkey.err.older':
    'The registry offered an older copy than this device has already seen. Nothing was changed. Try again later, and keep your backup file.',
  'app.backup.passkey.err.damaged': "That copy didn't open. It may have been changed. Open your backup file instead.",
  // A partner's intake (flow/IntakePage.tsx, veilcore/intake.ts).
  'app.intake.stay': 'Not now, stay on VeilCore',
  'app.intake.pickAgain': 'Pick a record for them',
  'app.intake.oddHost':
    'Check this address carefully: {host} is a number, a coded name or has a port, so it may not be who you expect.',
  'app.intake.err.notPicked': 'That record wasn’t picked for this request. Pick the record you want to send.',
  'app.intake.title': 'Record a sample for {host}',
  'app.intake.intro':
    '<b>{host}</b> asked you to record this sample with VeilCore. You make the record here, on VeilCore, and it stays yours. At the end you choose whether to send them its record ID, proof code and check link. Nothing else goes to them.',
  'app.intake.ref': 'Their reference, as they wrote it:',
  'app.intake.new': 'Record a new one',
  'app.intake.pick': 'Or send one you already recorded',
  'app.intake.back': 'Go back to {host} without sending',
  'app.intake.banner': 'Recording for {host}. At the end you choose what to send them.',
  'app.intake.send.title': 'Send this record to {host}?',
  'app.intake.send.what':
    'They get the record ID {id} ({name}), its proof code and its check link, so they can check it on VeilCore.',
  'app.intake.send.not': 'They don’t get your details, photos, DNA report, keys or backup.',
  'app.intake.send.button': 'Send to {host}',
  'app.intake.send.opening': 'Opening {id}…',
  'app.intake.send.kept': 'The record stays in your VeilCore either way.',
  'app.intake.err.title': 'This link can’t be used',
  'app.intake.err.help': 'Ask whoever sent it for a new one. Nothing was recorded or sent.',
  // Ways on from a link that can't be used: never a dead end (easy-mode review, 19 Nov).
  'app.intake.err.paste': 'Paste a code or link',
  'app.intake.err.records': 'Go to your records',
  'app.intake.err.lab': 'I run a lab: lab results',
  'app.intake.err.gone':
    'The request from the other site is no longer here (this tab was closed or reopened). Open their link again.',
  'app.intake.err.noReturn': 'It doesn’t say where to send you back.',
  'app.intake.err.tooLong': 'Its return address is too long.',
  'app.intake.err.notUrl': 'Its return address isn’t a web address.',
  'app.intake.err.notHttps': 'Its return address isn’t secure (https).',
  'app.intake.err.credentials': 'Its return address carries a user name or password.',
  'app.intake.err.hasHash': 'Its return address already has a # part.',
  'app.intake.err.badState': 'Its security value (state) is missing or malformed.',
  'app.backup.fromFileAdded': 'Records put back from the file itself: {n}.',
  'app.filebundle.open': 'Make an evidence bundle from a backup file',
  'app.filebundle.what':
    'This uses the date proofs inside your backup file, so it works when VeilCore can’t be reached. Nothing from the file is kept here, and the bundle says it comes from your backup file, not checked with VeilCore.',
  'app.filebundle.offline':
    'VeilCore can’t be reached right now. You can make the bundle from your backup file instead.',
  'app.filebundle.pick': 'Choose backup file',
  'app.filebundle.which': 'Record',
  'app.filebundle.make': 'Make the bundle',
  'app.filebundle.makeFor': 'Make the bundle for {name}',
  'app.filebundle.noneForRecord': 'That backup file has no date proofs for this record. Try a newer backup file.',
  'app.filebundle.noneHere':
    'None of the records in that file are on this device yet. Restore the file first, then make the bundle here.',
  'app.backup.fileIsLasting':
    'Your backup file on your own device is never changed by restoring; keep it — it’s the lasting copy.',
  'app.backup.rootChanged':
    'VeilCore’s server gave a different date record for {n} of your records than it gave before. That should never happen. The first one is kept, and both are in this backup. Keep this file, and contact VeilCore.',
  'app.backup.fromFileProblem': "The records inside the file couldn't be put back: {why} Your keys are restored.",
  'app.backup.passkey.err.busy': 'Your other device kept saving at the same moment. It tries again by itself.',
  // Summit 5b item 15: on the backup screen (BackupStep.tsx).
  'app.backup.neverAsks': 'VeilCore never asks for your backup file or code.',
};
