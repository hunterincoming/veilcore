// The record app in English: sealed records (veilcore/vault.ts, api-store.ts): locked
// records, a record that doesn't match its fingerprint, the vault key in the backup, and a
// lab code's offer key. Source text; see log.ts.
// SPDX-License-Identifier: Apache-2.0

export const sealed = {
  // api-store.ts: a save the browser refused itself (save-status.ts describeRefusals)
  'app.sealed.refuse.noKey':
    'this browser doesn’t have the key for your records, so nothing was saved. Restore your backup file first.',
  'app.sealed.refuse.mismatch': 'it doesn’t match its fingerprint, so it wasn’t saved',
  // RecordDetail.tsx, Step5ProveDisclosure.tsx, SendToLab.tsx
  'app.sealed.mismatch':
    'This record doesn’t match its fingerprint: it may have been changed since it was sealed. It won’t be saved again, sent or shared.',
  // LockedRecords.tsx (Home and a locked record's page)
  'app.sealed.locked.title.one': '{count} locked record',
  'app.sealed.locked.title.other': '{count} locked records',
  'app.sealed.locked.pageTitle': 'This record is locked',
  'app.sealed.locked.text':
    'This browser doesn’t have the key for these records. Restore the backup file saved after {date}. VeilCore can’t open them for you.',
  'app.sealed.locked.textNoDate':
    'This browser doesn’t have the key for these records. Restore your latest backup file. VeilCore can’t open them for you.',
  'app.sealed.locked.cantChange': 'A locked record can’t be changed or sent. You can delete it.',
  'app.sealed.locked.restore': 'Restore my backup',
  'app.sealed.locked.unnamed': 'Unnamed record',
  'app.sealed.locked.delete': 'Delete',
  'app.sealed.locked.deleteConfirm':
    'Delete {name} from VeilCore? It can’t be opened in this browser, and once it’s deleted nobody can bring it back.',
  'app.sealed.locked.deleted': 'Deleted.',
  'app.sealed.locked.deleteFailed': 'It wasn’t deleted: {error}',
  // LockedRecords.tsx LockedAgreements (Home and the agreements page)
  'app.sealed.lockedAgreements.title.one': '{count} locked agreement',
  'app.sealed.lockedAgreements.title.other': '{count} locked agreements',
  'app.sealed.lockedAgreements.text':
    'This browser doesn’t have the key for these agreements (licenses, lab transfers or breeder shares). Restore your latest backup file. VeilCore can’t open them for you.',
  'app.sealed.lockedAgreements.cantChange': 'A locked agreement can’t be changed or sent. You can delete it.',
  'app.sealed.lockedAgreements.name': 'Locked agreement',
  'app.sealed.lockedAgreements.deleteConfirm':
    'Delete agreement {id} from VeilCore? It can’t be opened in this browser, and once it’s deleted nobody can bring it back.',
  // AppHome.tsx: the last load
  'app.sealed.truncated':
    'VeilCore sent only part of your records, so some may be missing here. Reload the page to try again.',
  'app.sealed.unreadable.one': '{count} record came back in a form this version can’t read, so it isn’t shown.',
  'app.sealed.unreadable.other': '{count} records came back in a form this version can’t read, so they aren’t shown.',
  'app.sealed.backupNeeded':
    '<b>Save a new backup.</b> Your records are now locked with a key that only this browser has until you save a backup. Without the backup file you can’t open them anywhere else.',
  // ClaimTransfer.tsx, transfers.ts userFacingError
  'app.sealed.err.newCode':
    'This code was made before deliveries were locked, and it no longer works. Ask the sender for a new code.',
  'app.sealed.recv.missingKey':
    'This code is missing its last part. You can still receive it, but the sender’s details (who bred it, and when) won’t come with it. Ask for the full code first.',
  'app.sealed.recv.notOpened': 'The sender’s details couldn’t be opened with this code, so only the name came with it.',
  // backup.ts, backup-words.ts, RestorePage.tsx
  'app.sealed.backup.noVaultKey':
    'That backup doesn’t hold the key that opens your records. Save a new one and check that.',
  'app.sealed.backup.differentVault':
    'This browser already opens your records with a different key. Nothing was changed.',
  'app.sealed.backup.olderFile':
    'This file is from before records were locked, so it doesn’t have their key. Records locked since then stay locked until you open a newer backup file.',
  // Round 2 (CONTRACT.md #15-#26): saves the browser refuses itself
  'app.sealed.refuse.backupFirst':
    'it was saved before records were locked. Save a backup and check it first; then changes to it can be saved',
  'app.sealed.refuse.tooLarge': 'it’s too large to save. Shorten its notes and try again',
  'app.sealed.refuse.unknown':
    'VeilCore couldn’t be reached to check your records, so nothing was saved. Try again soon.',
  'app.sealed.refuse.cantStore':
    'this browser can’t keep the key that locks your records (a private window, or blocked site data), so nothing was saved',
  // LogFlow.tsx, AnimalForm.tsx, CorrectRecord.tsx: the size limit, said while typing
  'app.sealed.tooLarge':
    'This record is too large to save. Shorten its notes and try again. Nothing you typed was lost.',
  'app.sealed.size.near': '{used} KB of {max} KB used.',
  'app.sealed.size.over': 'Too large to save. Shorten the notes.',
  // LockedRecords.tsx: an older copy from the server
  'app.sealed.older.pageTitle': 'An older copy of this record',
  'app.sealed.older':
    'The server sent an older copy of this record than this browser last saved. If it’s the copy you want, use it; or delete it.',
  'app.sealed.olderKept.one':
    'The server sent an older copy of {count} record. This browser kept the newer copy and saves it again.',
  'app.sealed.olderKept.other':
    'The server sent older copies of {count} records. This browser kept the newer copies and saves them again.',
  // AppHome.tsx: import, the backup before older records are locked, a browser that keeps nothing
  'app.sealed.importLocked.one': ' {count} locked record was skipped: this browser doesn’t have its key.',
  'app.sealed.importLocked.other': ' {count} locked records were skipped: this browser doesn’t have their key.',
  'app.sealed.backupBeforeLocking':
    '<b>Save a backup.</b> Your older records will be locked once a backup file holds the key that opens them. Until then they stay on VeilCore’s server as they were saved, readable to VeilCore, and changes to them can’t be saved.',
  'app.sealed.cantStore':
    'This browser can’t keep the key that locks your records (a private window, or blocked site data). So your older records weren’t locked, and nothing new can be saved here. Open VeilCore in a normal window.',
  // EvidenceBundle.tsx
  'app.sealed.lockedParents.one': '{count} parent record is locked in this browser, so it is left out.',
  'app.sealed.lockedParents.other': '{count} parent records are locked in this browser, so they are left out.',
  // backup.ts
  'app.sealed.backup.cantCheck':
    'VeilCore couldn’t be reached to check which key your records use, so nothing was changed. Try again when you’re online.',
  // transfers.ts userFacingError
  'app.sealed.err.handleTag': 'This page and VeilCore’s server don’t match. Reload the page and try again.',
  // ClaimTransfer.tsx, FinishReceiving.tsx, receive.ts
  'app.sealed.recv.restoreFirst':
    'This browser doesn’t have the key for your records, so it can’t save what you receive. Restore your backup file first, then use the code.',
  'app.sealed.recv.cantCheck':
    'VeilCore couldn’t be reached to check your records, so nothing was received. Try again soon.',
  'app.sealed.recv.cantStore':
    'This browser can’t keep the key that locks your records (a private window, or blocked site data), so nothing was received. Open VeilCore in a normal window.',
  'app.sealed.recv.notFinished':
    'It was received, but its record wasn’t saved, so nothing was signed: {error}. Use “Finish receiving” on the record to try again.',
  'app.sealed.recv.failed': 'Something went wrong while receiving: {error}',
  'app.sealed.recv.notAccepted':
    'This record isn’t saved on VeilCore yet, so there is nothing to sign. Finish receiving it first.',
  'app.sealed.recv.finishTitle': 'This delivery isn’t finished',
  'app.sealed.recv.finishText':
    'It was received, but its record isn’t saved yet. Check the lab code below (paste it again if it’s empty), then finish.',
  'app.sealed.recv.finish': 'Finish receiving',
  'app.sealed.recv.finishing': 'Finishing…',
  'app.sealed.recv.noRecord': 'That record isn’t in this browser.',
  'app.sealed.recv.otherCode': 'That code is for a different delivery.',
  'app.sealed.recv.offerMissing':
    'VeilCore didn’t send the sender’s locked details for this code, so the record wasn’t finished. Try “Finish receiving” on the record later, or ask the sender.',
  // Round 3: held saves, the lost-key path, older copies, grants listed before locking
  'app.sealed.agreementsBackupFirst':
    'Save a backup and check it first. Until then, agreements can’t be made or changed here.',
  'app.sealed.backup.storageRefused':
    'This browser won’t keep anything right now (its storage is full, or blocked in a private window), so nothing was changed. Free up space or use a normal window, then try again.',
  'app.sealed.backupFirstAction': 'Save a backup and check it first. Then you can do this.',
  'app.sealed.correctBackupFirst': 'Save a backup and check it first. Then you can correct this record.',
  'app.sealed.correctionLeft':
    'Something went wrong taking the correction {id} back off VeilCore. Reload the page and check your records.',
  'app.sealed.grantAsk.text':
    'Before your records were locked, this record shared: {keys}. They aren’t shared again until you say so.',
  'app.sealed.grantAsk.yes': 'Share them again',
  'app.sealed.grantAsk.no': 'Don’t share them',
  'app.sealed.grantAsk.failed': 'That wasn’t saved: {error}',
  'app.sealed.grantDiffers.text':
    'VeilCore’s server shows a different sharing choice for this record than the one kept with it. Nothing was changed. Choose which one strangers see.',
  'app.sealed.grantDiffers.open': 'Choose',
  'app.sealed.importNotImported.one':
    ' {count} record on VeilCore is locked or emptied, and the file couldn’t put it back, so it wasn’t imported.',
  'app.sealed.importNotImported.other':
    ' {count} records on VeilCore are locked or emptied, and the file couldn’t put them back, so they weren’t imported.',
  'app.sealed.lost.button': 'I don’t have that backup',
  'app.sealed.lost.confirm':
    'Without that backup file, nobody can open these locked records and agreements, not even VeilCore. While they are on VeilCore, nothing new can be saved for you. Delete them from VeilCore and start a new key? This can’t be undone.',
  'app.sealed.lost.done':
    'Deleted. A new key is ready: save a backup and check it, and your new records will be saved.',
  'app.sealed.lost.failed': 'Nothing was deleted: {error}',
  'app.sealed.lost.nothing': 'nothing here is locked with a lost key',
  'app.sealed.older.use': 'Use this copy',
  'app.sealed.older.deleteConfirm':
    'Delete {name} from VeilCore? This older copy is the only copy on VeilCore’s server. Once it’s deleted, nobody can bring it back.',
  'app.sealed.recv.backupFirst':
    'This record was saved before records were locked. Save a backup and check it first; then you can sign.',
  'app.sealed.recv.backupFirstClaim': 'Save a backup and check it first, then use the code. Nothing was received yet.',
  'app.sealed.recv.noAnswer':
    'VeilCore didn’t answer ({error}). The code is kept in this browser. If it was received, it shows in your records with “Finish receiving”; if not, try again.',
  'app.sealed.refuse.backupFirstNew': 'nothing was saved yet. Save a backup and check it first',
  'app.sealed.unsaved.backup':
    'Not saved yet. Save your backup and check it; until then this is kept only in this browser.',
  'app.sealed.unsaved.key':
    'Not saved yet. This browser doesn’t have the key for your records on VeilCore. Restore your backup, or, if you don’t have it, use “I don’t have that backup” on your records page.',
  'app.sealed.unsaved.retry': 'Not saved on VeilCore yet. It’s kept in this browser and sent again with the next save.',
  'app.sealed.unsaved.short': 'Not saved yet — save your backup',
  'app.sealed.unsaved.shortRetry': 'Not saved yet',
  'app.sealed.unsaved.discardConfirm':
    'Let go of what this browser keeps for this record? It isn’t on VeilCore, so it can’t be brought back.',
  'app.sealed.unsaved.discardNew': 'Delete it',
  'app.sealed.unsaved.discardChange': 'Undo the change',
  'app.sealed.sendNotSaved':
    'This record isn’t saved on VeilCore yet, so it can’t be sent. Save a backup and check it first.',
};
