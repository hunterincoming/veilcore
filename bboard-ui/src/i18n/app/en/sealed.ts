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
  // AppHome.tsx: the last load
  'app.sealed.truncated':
    'VeilCore sent only part of your records, so some may be missing here. Reload the page to try again.',
  'app.sealed.unreadable.one': '{count} record came back in a form this version can’t read, so it isn’t shown.',
  'app.sealed.unreadable.other': '{count} records came back in a form this version can’t read, so they aren’t shown.',
  'app.sealed.backupNeeded':
    '<b>Save a new backup.</b> Your records are now locked with a key only this browser has. Without the backup file you can’t open them anywhere else.',
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
};
