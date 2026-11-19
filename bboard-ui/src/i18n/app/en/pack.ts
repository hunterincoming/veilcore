// The record app in English: the pack for the authority (veilcore/authority-pack.ts,
// components/authority-pack). Spanish is the language most packs are made in; this is the source
// text the translations follow key by key. Source text; see log.ts.
// SPDX-License-Identifier: Apache-2.0

export const pack = {
  // components/flow/AppHome.tsx: the way in.
  'app.pack.home': 'Pack for REPROCANN / SEDRONAR',
  'app.pack.homeText':
    'For an association in Argentina: the six-monthly figures and production record, from your records.',
  // components/authority-pack/AuthorityPackPage.tsx: the form.
  'app.pack.title': 'Pack for REPROCANN / SEDRONAR',
  'app.pack.intro':
    'For a medical-cannabis association in Argentina. It lays out what your records show for a period, for the six-monthly statement and the production record, says what is missing, and gives each record’s check link. You check it, sign it and send it yourself.',
  'app.pack.form.period': 'Period',
  'app.pack.form.periodSix': 'Last six months',
  'app.pack.form.periodPermit': 'Permit year',
  'app.pack.form.periodOther': 'Other dates',
  'app.pack.form.permitStart': 'Permit start date',
  'app.pack.form.from': 'From',
  'app.pack.form.to': 'To',
  'app.pack.form.badPeriod': 'Choose a start date on or before the end date.',
  'app.pack.form.association': 'Association’s name (printed on the pack)',
  'app.pack.form.preparedBy': 'Prepared by (printed on the pack)',
  'app.pack.form.countsTitle': 'Plants',
  'app.pack.form.countsFromBatches':
    'Your grow batches dated in this period add up to {plants} plants, {inFlower} in flower ({batches}). Leave the boxes empty to use these, or type the figures to declare.',
  'app.pack.form.countsNone':
    'No grow batch with plant counts is dated in this period. Type the figures to declare, or leave them empty and the pack will say they are missing.',
  'app.pack.form.batches.one': 'one batch',
  'app.pack.form.batches.other': '{count} batches',
  'app.pack.form.plants': 'Total plants',
  'app.pack.form.inFlower': 'Plants in flower',
  'app.pack.form.patients': 'Number of linked patients',
  'app.pack.form.patientsHelp':
    'A number only, never names. It is used to draw this pack and nothing else: it is not saved, and it is not sent to VeilCore or anyone else.',
  'app.pack.form.badNumber': 'Type a whole number, or leave it empty.',
  'app.pack.form.lang': 'Language of the pack',
  'app.pack.form.make': 'Make the pack',
  'app.pack.form.making': 'Looking up each record’s date…',
  'app.pack.form.print': 'Print or save as PDF',
  'app.pack.form.printHelp': 'In the print window, choose “Save as PDF” and A4 paper.',
  'app.pack.form.linksWarn':
    'Each check link in the pack carries that record’s sealed details after the #, so whoever opens it sees them: {list}.',
  'app.pack.form.linksLocal': 'Some are kept on this device only. Sending the pack is how their details leave it.',
  'app.pack.form.none': 'No grow batch or harvest lot is dated in this period in this browser.',
  'app.pack.form.failed': 'The pack couldn’t be made: {reason}',
  // The pack itself.
  'app.pack.doc.title': 'Six-monthly report and production record',
  'app.pack.doc.sub': 'Supporting material made from the association’s own records in VeilCore',
  'app.pack.doc.rules':
    'For the six-monthly sworn statement and the chromatography report per batch (Res. MS 1780/2025, art. 4 ter, item f), and for the production record of the cultivation plan (item h).',
  'app.pack.doc.association': 'Association: {name}',
  'app.pack.doc.preparedBy': 'Prepared by: {name}',
  'app.pack.doc.period': 'Period: {from} to {to}',
  'app.pack.doc.made': 'Made on {at} from {records} in this browser.',
  'app.pack.doc.records.one': 'one record',
  'app.pack.doc.records.other': '{count} records',
  'app.pack.doc.gapsTitle': 'Before sending: what is missing',
  'app.pack.doc.gapsNone': 'Nothing missing that these records show.',
  'app.pack.doc.variety': '1. Registered variety used',
  'app.pack.doc.varietyHelp':
    'The plants or strains the grow batches name. The registration number is as the holder sealed it in the record.',
  'app.pack.doc.col.variety': 'Variety',
  'app.pack.doc.col.registration': 'Registration number',
  'app.pack.doc.col.record': 'Record',
  'app.pack.doc.regNone': 'None in the record',
  'app.pack.doc.varietyNone': 'No source record is named by the grow batches in these records.',
  'app.pack.doc.sourceMissing': '{name} (record {id}): named by a grow batch, not in this browser.',
  'app.pack.doc.plants': '2. Plants',
  'app.pack.doc.plantsTotal': 'Total plants',
  'app.pack.doc.plantsFlower': 'Plants in flower',
  'app.pack.doc.notGiven': 'Not given',
  'app.pack.doc.fromBatches.one':
    'The sum of the one grow batch dated in the period, as counted on its date and sealed with it.',
  'app.pack.doc.fromBatches.other':
    'The sum of the {count} grow batches dated in the period, each as counted on its date and sealed with it.',
  'app.pack.doc.typed': 'Typed by the officer when making this pack. Not taken from a sealed record.',
  'app.pack.doc.countsNone': 'No plant counts are sealed in the grow batches of this period, and none were typed.',
  'app.pack.doc.patients': '3. Linked patients',
  'app.pack.doc.patientsNote':
    'A number only, typed by the officer when making this pack. It is not in any record, and it was not sent to VeilCore.',
  'app.pack.doc.production': '4. Production record',
  'app.pack.doc.productionHelp':
    'Each step is a record sealed by the association, naming the one before it. That link is the holder’s own statement: nobody checks it against the record it names.',
  'app.pack.doc.col.step': 'Step',
  'app.pack.doc.col.name': 'Name and ID',
  'app.pack.doc.col.date': 'Date',
  'app.pack.doc.col.figures': 'Figures (as sealed)',
  'app.pack.doc.col.about': 'About',
  'app.pack.doc.outside': 'Dated before this period: a harvest lot in the period is about it.',
  'app.pack.doc.batchFigures': '{plants} plants, {inFlower} in flower',
  'app.pack.doc.batchNoFigures': 'No counts sealed',
  'app.pack.doc.lotFigures': '{plants} plants harvested',
  'app.pack.doc.chromatography': '5. Chromatography report per harvest lot',
  'app.pack.doc.chromatographyHelp':
    'A lab report or certificate of analysis sealed as a record about the lot. Its numbers are shown only when a laboratory’s signature on them checks and the lab is identified.',
  'app.pack.doc.lot': 'Lot {lot}',
  'app.pack.doc.labSigned': 'Result signed by a laboratory. {signer}',
  'app.pack.doc.document':
    'Sealed document: “{title}”. The report is the laboratory’s file; what it says is in that file, not in this pack.',
  'app.pack.doc.labUnnamed':
    'A lab signature is kept with it, but no laboratory is identified behind it here, so its numbers are not shown.',
  'app.pack.doc.missing': 'Missing: no chromatography report about this lot in these records.',
  'app.pack.doc.proofs': '6. Proof codes, check links and dates',
  'app.pack.doc.proofsHelp':
    'Anyone can open each check link for free, with no account. A record shows prior possession of its file and details by its date. It does not show that what it says is true.',
  'app.pack.doc.recordId': 'Record {id}',
  'app.pack.doc.proofCode': 'Proof code',
  'app.pack.doc.checkLink': 'Check link',
  'app.pack.doc.noLink': 'No check link: this record isn’t sealed yet.',
  'app.pack.doc.local': 'Kept on the association’s device only.',
  'app.pack.doc.dateRests': 'What the date rests on',
  'app.pack.role.source': 'Source',
  'app.pack.role.grow-batch': 'Grow batch',
  'app.pack.role.harvest-lot': 'Harvest lot',
  'app.pack.role.report': 'Lab report',
  'app.pack.doc.notForm':
    'This is not an official form: none has been published for this statement. VeilCore files nothing for the association. The association checks this pack, signs it and sends it itself.',
  'app.pack.doc.handover':
    'Made from the records in this browser only. Records sealed on another officer’s device are in it only once restored here from that officer’s backup.',
  'app.pack.doc.sign': 'Signature of the Technical Manager',
  'app.pack.doc.signName': 'Name',
  'app.pack.doc.signDate': 'Date',
  // What each date rests on (authority-pack.ts dateLines).
  'app.pack.date.unsealed': 'Not sealed, so nothing dates it.',
  'app.pack.date.none': 'Not dated on any network yet.',
  'app.pack.date.pending': 'In a batch, not dated on any network yet.',
  'app.pack.date.test': ' A test network: practice data, not a real date.',
  'app.pack.date.checked':
    'On {where}: checked by this browser when the pack was made. The batch root is in transaction {tx}, block {block}, {at}.{test}',
  'app.pack.date.failed': 'On {where}: not confirmed: {reason}. Don’t rely on the date the registry reports.',
  'app.pack.date.reported':
    'On {where}: {date}, as VeilCore’s registry reports it. Not checked by this browser; the check link looks it up.{test}',
  'app.pack.date.noTime': 'time not given',
  'app.pack.date.bitcoin':
    'Bitcoin: VeilCore’s registry reports the batch root in Bitcoin block {block} ({at}). Check it with the batch’s OpenTimestamps file.',
  'app.pack.date.bitcoinPending': 'Bitcoin: stamp pending, not yet in a Bitcoin block.',
  'app.pack.date.tsa':
    'RFC 3161: the batch root carries a timestamp from {tsa}, at {at} as the token states. The token checked against the batch root in this browser; this record’s inclusion proof links it to that root.',
  'app.pack.date.tsaUnnamed': 'a timestamp authority',
  'app.pack.date.tsaQualified':
    'VeilCore’s registry states that authority is qualified under {scheme}. Check the trusted list yourself before relying on that.',
  // The gaps, at the top of the pack and above the button.
  'app.pack.gap.chromatography': 'Lot {lot}: no chromatography report.',
  'app.pack.gap.registration': '{name}: no variety registration number in the record.',
  'app.pack.gap.source': '{name}: a grow batch names it, but it isn’t in this browser.',
  'app.pack.gap.noBatches': 'No grow batch is dated in this period.',
  'app.pack.gap.noLots': 'No harvest lot is dated in this period.',
  'app.pack.gap.counts': 'Total plants or plants in flower: not given.',
  'app.pack.gap.countsPartial.one': 'One grow batch in the period has no plant counts sealed: the totals leave it out.',
  'app.pack.gap.countsPartial.other':
    '{count} grow batches in the period have no plant counts sealed: the totals leave them out.',
  'app.pack.gap.patients': 'Number of linked patients: not given.',
  'app.pack.gap.undated.one': 'One record is not dated on any network yet.',
  'app.pack.gap.undated.other': '{count} records are not dated on any network yet.',
  'app.pack.gap.unchecked.one':
    'One date is VeilCore’s registry’s report, not checked on Midnight’s main network by this browser.',
  'app.pack.gap.unchecked.other':
    '{count} dates are VeilCore’s registry’s report, not checked on Midnight’s main network by this browser.',
  'app.pack.gap.locked.one':
    'One record in this browser is locked (sealed with a key it doesn’t have) and is left out.',
  'app.pack.gap.locked.other':
    '{count} records in this browser are locked (sealed with a key it doesn’t have) and are left out.',
};
