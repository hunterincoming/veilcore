// The record app in English: the check made when the app opens (veilcore/record-watch.ts;
// components/flow/RecordChanged.tsx). Shown only when something about a record this browser date
// stamped changed on the network that this browser didn't do. Calm and plain: what changed, then
// what to do. Never "theft protection": this site can't take a record back yet. Source text; see
// log.ts.
// SPDX-License-Identifier: Apache-2.0

export const watch = {
  'app.watch.this': 'Something about this record changed on the network that this browser didn’t do.',
  'app.watch.home.one': 'Something about “{name}” changed on the network that this browser didn’t do.',
  'app.watch.home.other': 'Something about {count} of your records changed on the network that this browser didn’t do.',
  'app.watch.change.recovered': 'Its recovery secret was used to move it to a new key.',
  'app.watch.change.moved': 'It was moved to a new key.',
  'app.watch.change.recovery-replaced': 'The secret that can move it to a new key was replaced.',
  'app.watch.what': 'Here’s what to do',
  'app.watch.hide': 'Hide what to do',
  'app.watch.step.you':
    'If you did this yourself, on another device or with VeilCore’s command-line tool, nothing is wrong.',
  'app.watch.step.copy':
    'If you didn’t, someone may have a copy of this browser’s keys or of a backup file. Stop using this computer for VeilCore until it has been checked, and don’t type your recovery sheet on it.',
  'app.watch.step.files': 'Keep your backup files offline, and give each one a password.',
  'app.watch.step.date': 'The date your record was first stamped stays on the network. Nobody can change it.',
  'app.watch.step.help':
    'This site can’t take a record back yet. <mail>Write to VeilCore</mail> and say which record. Never send its keys, a backup file or your recovery sheet.',
  'app.watch.open': 'Open “{name}”',
  'app.watch.seen': 'I did this myself',
};
