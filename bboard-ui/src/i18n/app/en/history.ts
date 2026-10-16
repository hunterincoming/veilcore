// The record app in English: the breeding history download (components/history/BreedingHistory.tsx).
// The files it makes stay in English. Source text; see log.ts.
// SPDX-License-Identifier: Apache-2.0

export const history = {
  'app.history.label': 'Breeding history (draft)',
  'app.history.intro':
    'This plant and the parents linked to it that you hold here, one row per record, with each record’s date stamp and evidence bundle. A draft to copy from for a variety application. Not legal advice.',
  'app.history.notEarlier':
    'A record dates nothing earlier than the day it was sealed. Each step sealed when it happened carries its own date; a history typed up the week you apply is worth what any typed-up history is worth.',
  'app.history.oneFile':
    'One file with a printable breeding history (the family line, then one row per record: the date you gave, its date stamp, the stage and what you selected for, how it was made), set out under plain headings for a US PVP application, a UPOV-style questionnaire and a Japanese application. Boxes for what VeilCore doesn’t hold (uniformity, stability, variants) are left blank for you. A one-page cover note says what it shows and what it doesn’t, and each record’s evidence bundle is inside.',
  'app.history.held.one': '{count} record you hold here',
  'app.history.held.other': '{count} records you hold here',
  'app.history.theirs.one': ', {count} linked parent held by someone else (listed as theirs)',
  'app.history.theirs.other': ', {count} linked parents held by someone else (listed as theirs)',
  'app.history.named.one': ', {count} parent named with no record',
  'app.history.named.other': ', {count} parents named with no record',
  'app.history.leftOut.one': ', {count} record left out (it takes the nearest {max})',
  'app.history.leftOut.other': ', {count} records left out (it takes the nearest {max})',
  'app.history.end': '.',
  'app.history.notPut':
    'Your records’ keys and lab report files are not put in. Where a lab report is saved to a plant, its evidence bundle does hold the report’s SHA-256 and the fingerprint that pairs it with the plant, so anyone later shown the file can match it. VeilCore doesn’t vouch for anything a record says. Draft. Not legal advice.',
  'app.history.downloaded':
    'Downloaded {name}. Open COVER-NOTE.html inside it first, then breeding-history.html to print.',
  'app.history.locked.one': ', {count} locked record left out (this browser doesn’t have its key)',
  'app.history.locked.other': ', {count} locked records left out (this browser doesn’t have their key)',
};
