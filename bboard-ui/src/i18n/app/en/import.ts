// The record app in English: dating a whole collection from a spreadsheet
// (components/lab-import/BulkImportPage.tsx). What veilcore/bulk-import.ts says about a row, and
// the results file, stay in English. Source text; see log.ts.
// SPDX-License-Identifier: Apache-2.0

export const importing = {
  'app.import.noRows':
    'That file has no rows under its column names. One row should name the columns, with a row per plant under it.',
  'app.import.title': 'Date your whole collection',
  'app.import.intro':
    'Already keep a spreadsheet of your plants or accessions? Seal every row as its own record in one go, each with a date stamp, as if you had logged them one by one.',
  'app.import.fileKind':
    'A CSV or Excel (.xlsx) file, first sheet only, with a row that names the columns (a title above it is fine). Up to {max} rows at a time.',
  'app.import.notKept':
    "This browser won't keep anything after you close it (a private window, or site data is blocked). Each record's key lives in this browser until you save your backup, so open this page in a normal window.",
  'app.import.reading': 'Reading your file…',
  'app.import.choose': 'Choose a file',
  'app.import.normalWindow': 'Open this page in a normal browser window to use it.',
  'app.import.readHere':
    'Your file is read here, in this browser, and isn’t uploaded. For each row, only the details you pick on the next screen are saved, the same details as logging one plant. {server} stores them locked, the plant name included, and we don’t have the key. Only a proof code is dated on {dated}.',
  'app.import.testSite': 'This is a test site: records made here are test data.',
  'app.import.earlierStamps': 'Key date stamps from earlier imports',
  'app.import.rowLine': 'Row {line}: {text}',
  'app.import.row': 'Row {line}',
  'app.import.end': '.',
  'app.import.notGiven': 'Not given',
  // bulk-import.ts FIELD_LABELS, word for word.
  'app.import.field.strainName': 'Plant or line name',
  'app.import.field.refId': 'Your ID (accession or lot number)',
  'app.import.field.taxon': 'Species',
  'app.import.field.parents': 'Parents',
  'app.import.field.parents2': 'Second parent',
  'app.import.field.bredBy': 'Bred by',
  'app.import.field.dateCreated': 'Date (your own note)',
  'app.import.field.notes': 'Notes',
  'app.import.header.title': 'Which row has the column names?',
  'app.import.header.intro':
    'We picked the row that looks like the column names. Rows above it, like a title, are left out.',
  'app.import.header.label': 'The column names are in',
  'app.import.header.names': 'Column names (row {line})',
  'app.import.header.firstAt': 'First plant (row {line})',
  'app.import.header.first': 'First plant',
  'app.import.header.noRows': 'No rows under this one.',
  'app.import.header.under.one': '{count} row under the column names',
  'app.import.header.under.other': '{count} rows under the column names',
  'app.import.header.above.one': '; {count} row above it is left out',
  'app.import.header.above.other': '; {count} rows above them are left out',
  'app.import.header.next': 'Next: which column is which',
  'app.import.header.pickHint': 'Pick a row with plants under it.',
  'app.import.header.back': 'Pick a different file',
  'app.import.cols.title': 'Which column is which?',
  'app.import.cols.intro':
    'We guessed from the column names. Check each one. Only the plant name is needed; columns you leave out are never sent. The plant name is locked like the rest: the check links in your results file carry it, so whoever you send a link to sees it. If the names are secret, pick a column of code names.',
  'app.import.cols.example': 'For example: {v}',
  'app.import.cols.twoParents': 'Two parents in one cell are fine, like “Mother x Father”.',
  'app.import.cols.pick': 'Pick a column',
  'app.import.cols.notInFile': 'Not in my file',
  'app.import.cols.bredBy': 'Bred by, where a row doesn’t say',
  'app.import.cols.bredByHelp': 'Your name or business, if you bred them. Leave empty if you don’t know.',
  'app.import.cols.dates': 'How are dates written?',
  'app.import.cols.datesHelp':
    'Some dates, like 03/04/2021, could be either. Pick how your file writes them, or they are kept as written.',
  'app.import.cols.auto': 'Keep unclear dates as written',
  'app.import.cols.mdy': 'Month first (03/14/2021)',
  'app.import.cols.dmy': 'Day first (14/03/2021)',
  'app.import.cols.next': 'Next: check the rows',
  'app.import.cols.pickHint': 'Pick the column with the plant or line name.',
  'app.import.cols.back': 'Change the column names row',
  'app.import.card.name': 'Plant or line',
  'app.import.card.id': 'Your ID',
  'app.import.card.date': 'Date (your note)',
  'app.import.check.title': 'Is this right?',
  'app.import.check.ready.one': '{count} row ready to seal',
  'app.import.check.ready.other': '{count} rows ready to seal',
  'app.import.check.already': ' · {n} sealed before, left as they are',
  'app.import.check.problems': ' · {n} can’t be sealed',
  'app.import.check.pickRow': 'Pick the row',
  'app.import.check.headerRows.one':
    'Row {rows} looks like column names, not a plant, so it is left out. If your column names are in that row, pick it as the column names row.',
  'app.import.check.headerRows.other':
    'Rows {rows} look like column names, not plants, so they are left out. If your column names are in one of them, pick it as the column names row.',
  'app.import.check.firstRows.one': 'The first row, exactly as they will be sealed',
  'app.import.check.firstRows.other': 'The first {count} rows, exactly as they will be sealed',
  'app.import.check.ambiguous.one':
    '{count} date could be day-first or month-first, so it is kept as written. To change that, go back and pick how your file writes dates.',
  'app.import.check.ambiguous.other':
    '{count} dates could be day-first or month-first, so they are kept as written. To change that, go back and pick how your file writes dates.',
  'app.import.check.cantSeal.one': "{count} row can't be sealed",
  'app.import.check.cantSeal.other': "{count} rows can't be sealed",
  'app.import.check.fixThem.one':
    'It is left out. Fix it in your file and import it again later: rows already sealed are skipped.',
  'app.import.check.fixThem.other':
    'They are left out. Fix them in your file and import it again later: rows already sealed are skipped.',
  'app.import.check.more': 'And {n} more. The results file lists every one.',
  'app.import.check.onceSealed':
    "<b>Once sealed, these can't change.</b> You can add reports and corrections later; a correction is a new record that points back to the old one.",
  'app.import.check.savedOn':
    'The details above are saved on {server}, one record per row, locked, the plant names included, and we don’t have the key. The check links in your results file carry each name, for the people you send them to. Only a proof code of each is dated on {dated}. A date stamp shows the details existed by that date; it doesn’t confirm they are right.',
  'app.import.check.sealN.one': 'Seal {count} record',
  'app.import.check.sealN.other': 'Seal {count} records',
  'app.import.check.nothing': 'Nothing to seal',
  'app.import.check.everyRow': 'Every row is either sealed already or can’t be sealed.',
  'app.import.check.back': 'Change the columns',
  'app.import.seal.sealing': 'Sealing your records…',
  'app.import.seal.paused': 'Sealing paused',
  'app.import.seal.pickUp': 'Pick up where you stopped',
  'app.import.seal.toSeal.one': '{file}: {count} row to seal.',
  'app.import.seal.toSeal.other': '{file}: {count} rows to seal.',
  'app.import.seal.aria': 'Sealing your records',
  'app.import.seal.of': 'Sealed {done} of {total}',
  'app.import.seal.keepOpen': 'Keep this page open.',
  'app.import.seal.kept':
    'If it closes, come back to this page: it carries on where it stopped, and never seals a row twice.',
  'app.import.seal.notKept':
    'This browser couldn’t keep the progress: if the page closes, pick the same file again. Rows already sealed are skipped.',
  'app.import.seal.carryOn': 'Carry on sealing',
  'app.import.seal.stop': "Stop here and finish with what's sealed",
  'app.import.sum.sealed.one': 'Sealed {count} record',
  'app.import.sum.sealed.other': 'Sealed {count} records',
  'app.import.sum.nothingNew': 'Nothing new sealed',
  'app.import.sum.before.one': '{count} row sealed before, left as they are.',
  'app.import.sum.before.other': '{count} rows sealed before, left as they are.',
  'app.import.sum.notSealed.one': '{count} row not sealed:',
  'app.import.sum.notSealed.other': '{count} rows not sealed:',
  'app.import.sum.waiting.one': '{count} row not sealed yet. Import the file again to seal them.',
  'app.import.sum.waiting.other': '{count} rows not sealed yet. Import the file again to seal them.',
  'app.import.sum.stampsHere':
    "Your records are already sealed and will be dated by their batch on {dated}; that doesn't depend on their key stamps. Each plant's key also gets its own date stamp from this browser, about {perDay} a day, so {n} queued take about {days}. They start after your backup.",
  'app.import.sum.byBatch':
    'Their public date stamp comes when their batch is dated on {dated}. Nothing for you to do.',
  'app.import.sum.untilSaved': "Until it's saved and checked, the new records' keys are only in this browser.",
  'app.import.sum.noDna.one':
    '{count} of these plants has no DNA report yet, so it isn’t tied to the plant itself. To add one, open the plant’s page and follow “Get a DNA report for this plant”: send a sample to a lab with a lab code, or save a report you already have.',
  'app.import.sum.noDna.other':
    '{count} of these plants have no DNA report yet, so they aren’t tied to the plants themselves. To add one, open a plant’s page and follow “Get a DNA report for this plant”: send a sample to a lab with a lab code, or save a report you already have.',
  'app.import.days.one': '{count} day',
  'app.import.days.other': '{count} days',
  'app.import.stamps.heading': 'Key date stamps',
  'app.import.stamps.of': '{heading}: {stamped} of {total}',
  'app.import.stamps.already':
    "Your records are already sealed and will be dated by their batch on {dated}. That doesn't depend on these key stamps.",
  'app.import.stamps.each':
    "Each plant's key also gets a date stamp from this browser, so you can prove you hold it later. The free fee service does about {perDay} a day from each browser{queued}. They go out while this page is open. Each plant's own page can do its stamp too.",
  'app.import.stamps.queued': ', so {n} queued take about {days}',
  'app.import.stamps.stamping': 'Date stamping {name}…',
  'app.import.stamps.allDone': 'All done.',
  'app.import.stamps.goOn': 'Go on',
  'app.import.stamps.saveIt': 'Save it',
  'app.import.stamps.newSince.one': '{count} key date stamp landed after your backup. Save a new backup to keep it.',
  'app.import.stamps.newSince.other':
    '{count} key date stamps landed after your backup. Save a new backup to keep them.',
  'app.import.done.title': 'Your collection is sealed',
  'app.import.done.new.one': '{count} new record',
  'app.import.done.new.other': '{count} new records',
  'app.import.done.before': ', {n} sealed before',
  'app.import.done.notSealed': ', {n} not sealed',
  'app.import.done.download': 'Download the results (CSV)',
  'app.import.done.downloadText':
    'Your rows as they were, each with its record ID, proof code and a link anyone can open to check it. Made here; nothing is uploaded.',
  'app.import.done.csvDna': ' Its “DNA report” column says which records have none yet.',
  'app.import.done.byBatch':
    "Their public date stamp comes when their batch is dated on {dated}. Each plant's page shows when that has happened. Nothing for you to do.",
  'app.import.done.dateStamp':
    "A date stamp shows the details existed by that date. It doesn't confirm they are right.",
  'app.import.done.toPlants': 'Go to your plants',
  'app.import.done.another': 'Import another file',
};
