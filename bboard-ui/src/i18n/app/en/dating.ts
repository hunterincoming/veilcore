// Dating first, the key date stamp tried again by itself, "Pick up where you left off" and
// "Copy details for support" (17 Oct 2026, CONTRACT.md #38). The record's own date never waits
// for the backup: its proof code goes into the next batch the moment it is sealed.
// SPDX-License-Identifier: Apache-2.0

export const dating = {
  'app.chain.progress.starting': 'Starting the prover on your device…',

  'app.log.recordDatedNext.one': 'Record dated: in the next batch (about every {count} minute on the test network)',
  'app.log.recordDatedNext.other': 'Record dated: in the next batch (about every {count} minutes on the test network)',
  'app.log.recordDatedNextPlain': 'Record dated: in the next batch',
  'app.log.inSeconds': 'in {n} s',
  'app.log.retryingIn': 'Trying again by itself {when} (try {n}).',
  'app.log.retriesUsed':
    'It was tried several times. Try again when you like: your record’s own date doesn’t wait for this.',
  'app.log.tryNow': 'Try again now',
  'app.log.keepsTrying': 'It keeps trying by itself while VeilCore is open, and Home shows it until it goes through.',

  'app.plant.nextBatch': 'in the next batch',
  'app.plant.nextBatchEvery.one': 'about every {count} minute on the test network',
  'app.plant.nextBatchEvery.other': 'about every {count} minutes on the test network',
  'app.plant.notSentYet': 'not sent to VeilCore yet; trying again by itself',
  'app.plant.keyStampRetrying': 'Key date stamped: not yet. It didn’t go through, and it’s tried again by itself.',
  'app.plant.keyStampMaySent':
    'Key date stamped: not yet. One may already have gone out, so it isn’t sent again by itself: check below before trying again.',
  'app.plant.keyStampCannot': 'Key date stamped: not yet. This site can’t make it now; the reason is below.',

  'app.home.restoreFirstTitle': 'Used VeilCore on another device?',
  'app.home.restoreFirstText':
    'Restore your backup file first. Your records, their keys and the key that opens them come back to this browser.',
  'app.home.restoreFirstButton': 'Restore your backup',

  'app.pickup.title': 'Pick up where you left off',
  'app.pickup.open': 'Open',
  'app.pickup.tryNow': 'Try now',
  'app.pickup.saveBackup': 'Save my backup',
  'app.pickup.freshBackupButton': 'Save a fresh backup',
  'app.pickup.openAgreements': 'Open agreements',
  'app.pickup.dating.notSent': '{name}: sealed. Its proof code goes to VeilCore as soon as VeilCore can be reached.',
  'app.pickup.dating.next': '{name}: in the next batch to be dated.',
  'app.pickup.dating.nextEvery.one': '{name}: in the next batch to be dated (about every {count} minute).',
  'app.pickup.dating.nextEvery.other': '{name}: in the next batch to be dated (about every {count} minutes).',
  'app.pickup.dating.batched': '{name}: in a batch, waiting for its date stamp.',
  'app.pickup.dating.progress': 'Step {n} of {total} toward its date',
  'app.pickup.more.one': 'and {count} more on its way to a date',
  'app.pickup.more.other': 'and {count} more on their way to a date',
  'app.pickup.stamp.retrying':
    'Key date stamp for {name} didn’t go through yet. It’s tried again by itself; next try {when}.',
  'app.pickup.stamp.now': 'Key date stamp for {name}: trying now…',
  'app.pickup.stamp.paused': 'Key date stamp for {name} didn’t go through after several tries.',
  'app.pickup.stamp.sent':
    'Key date stamp for {name} may already have gone out. Check it on its page before trying again.',
  'app.pickup.stamp.cannot': 'Key date stamp for {name} can’t be made from this site now. Its page says why.',
  'app.pickup.lockedCopies.one':
    '{count} locked copy not uploaded yet — save and check your backup. Your record’s date isn’t waiting on this.',
  'app.pickup.lockedCopies.other':
    '{count} locked copies not uploaded yet — save and check your backup. Your records’ dates aren’t waiting on this.',
  'app.pickup.freshBackup.one': 'Your last backup doesn’t have the keys of {count} newer record. Save a fresh backup.',
  'app.pickup.freshBackup.other':
    'Your last backup doesn’t have the keys of {count} newer records. Save a fresh backup.',
  'app.pickup.deliveriesSent.one': '{count} lab delivery sent, not received yet.',
  'app.pickup.deliveriesSent.other': '{count} lab deliveries sent, not received yet.',
  'app.pickup.deliveriesUnsigned.one': '{count} delivery received by the lab, receipt not signed yet.',
  'app.pickup.deliveriesUnsigned.other': '{count} deliveries received by the lab, receipts not signed yet.',
  'app.pickup.labUnsigned.one': '{count} sample received, receipt not signed yet.',
  'app.pickup.labUnsigned.other': '{count} samples received, receipts not signed yet.',
  'app.pickup.results.one': '{count} lab report waiting to be opened.',
  'app.pickup.results.other': '{count} lab reports waiting to be opened.',
  'app.pickup.agreements.one': '{count} agreement waiting for the other party to countersign.',
  'app.pickup.agreements.other': '{count} agreements waiting for the other party to countersign.',

  'app.support.copy': 'Copy details for support',
  'app.support.copied': 'Copied. Paste it into an email to VeilCore.',
  'app.support.email': 'Email it to {email}',
  'app.support.selectIt': 'This browser wouldn’t copy it. Select the text below and copy it:',
};
