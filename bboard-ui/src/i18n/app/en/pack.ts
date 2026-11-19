// The record app in English: the pack for the authority (veilcore/authority-pack.ts,
// components/authority-pack). Spanish is the language most packs are made in; this is the source
// text the translations follow key by key. Source text; see log.ts.
//
// "Record" here always says whose: a "VeilCore record" (or its "VeilCore ID") is one sealed in
// this app; a "registration number" is a national register's. Read by an authority, a bare
// "not in the record" would sound like "the variety isn't registered".
// SPDX-License-Identifier: Apache-2.0

export const pack = {
  // components/flow/AppHome.tsx: the way in.
  'app.pack.home': 'Pack for REPROCANN / SEDRONAR',
  // components/authority-pack/AuthorityPackPage.tsx: the form.
  'app.pack.title': 'Pack for REPROCANN / SEDRONAR',
  'app.pack.intro':
    'For a medical-cannabis association in Argentina. It lays out what your VeilCore records show for a period, as supporting material for the six-monthly statement and the production record, says what is missing, and gives each VeilCore record’s check link. You check it, sign it and send it yourself.',
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
  'app.pack.form.countsHelp':
    'Type the figures you declare. The sums below are a hint only: a sum of sealed grow batches is not an inventory.',
  'app.pack.form.sumsPlants':
    'Your grow batches dated in this period add up to {plants} plants (batches with this count: {counted} of {batches}).',
  'app.pack.form.sumsFlower':
    'They add up to {inFlower} plants in flower (batches with this count: {counted} of {batches}).',
  'app.pack.form.sumsNone': 'No grow batch dated in this period has sealed plant counts.',
  'app.pack.form.plants': 'Total plants',
  'app.pack.form.inFlower': 'Plants in flower',
  'app.pack.form.patients': 'Number of linked patients',
  'app.pack.form.patientsHelp':
    'A number only, never names. It is used to draw this pack and nothing else: it is not saved, and it is not sent to VeilCore or anyone else.',
  'app.pack.form.badNumber': 'Type a whole number, or leave it empty.',
  'app.pack.form.lang': 'Language of the pack',
  'app.pack.form.make': 'Make the pack',
  'app.pack.form.making': 'Looking up each VeilCore record’s date…',
  'app.pack.form.print': 'Print or save as PDF',
  'app.pack.form.printHelp': 'In the print window, choose “Save as PDF” and A4 paper.',
  'app.pack.form.linksWarn':
    'Each check link in the pack carries that VeilCore record’s sealed details after the #, so whoever opens it sees them: {list}.',
  'app.pack.form.linksLocal': 'Some are kept on this device only. Sending the pack is how their details leave it.',
  'app.pack.form.none': 'No grow batch or harvest lot is dated in this period in this browser.',
  'app.pack.form.failed': 'The pack couldn’t be made: {reason}',
  // The pack itself.
  'app.pack.doc.title': 'Supporting material for the six-monthly report and production record',
  'app.pack.doc.sub': 'Made from the association’s own VeilCore records.',
  'app.pack.doc.notFormShort': 'Not an official form.',
  'app.pack.doc.rules':
    'For the six-monthly sworn statement and the chromatography report per batch (art. 4 ter, item f, of Res. MS 800/2021, as incorporated by Res. MS 1780/2025), and for the production record of the cultivation plan (same article, item h).',
  'app.pack.doc.association': 'Association: {name}',
  'app.pack.doc.preparedBy': 'Prepared by: {name}',
  'app.pack.doc.period': 'Period: {from} to {to}',
  'app.pack.doc.made': 'Made on {at} from {records} in this browser.',
  'app.pack.doc.records.one': 'one VeilCore record',
  'app.pack.doc.records.other': '{count} VeilCore records',
  'app.pack.doc.pageOf': 'page {page} of {pages}',
  'app.pack.doc.gapsTitle': 'Before sending: what is missing',
  'app.pack.doc.gapsNone': 'Nothing missing that these VeilCore records show.',
  'app.pack.doc.variety': '1. Registered variety used',
  'app.pack.doc.varietyHelp':
    'The plants or strains the grow batches name. The registration number is the one the holder typed and sealed in the VeilCore record; nobody checked it against the register.',
  'app.pack.doc.col.variety': 'Variety',
  'app.pack.doc.col.registration': 'Registration number',
  'app.pack.doc.col.record': 'VeilCore ID',
  'app.pack.doc.regNone': 'No number given in VeilCore',
  'app.pack.doc.varietyNone': 'The grow batches in these VeilCore records name no source record.',
  'app.pack.doc.sourceMissing': '{name} (VeilCore ID {id}): named by a grow batch, not in this browser.',
  'app.pack.doc.plants': '2. Plants',
  'app.pack.doc.plantsTotal': 'Total plants',
  'app.pack.doc.plantsFlower': 'Plants in flower',
  'app.pack.doc.notGiven': 'Not given',
  'app.pack.doc.typed': 'As declared by the officer when making this pack. Not taken from a sealed VeilCore record.',
  'app.pack.doc.sums':
    'For reference only: the grow batches sealed in the period add up to {plants} plants and {inFlower} in flower. A sum of sealed batches is not an inventory.',
  'app.pack.doc.patients': '3. Linked patients',
  'app.pack.doc.patientsNote':
    'A number only, typed by the officer when making this pack. It is not in any VeilCore record, and it was not sent to VeilCore.',
  'app.pack.doc.production': '4. Production record',
  'app.pack.doc.productionHelp':
    'Each step is a VeilCore record sealed by the association, naming the one before it. That link is the holder’s own statement: nobody checks it against the VeilCore record it names.',
  'app.pack.doc.col.step': 'Step',
  'app.pack.doc.col.name': 'Name and VeilCore ID',
  'app.pack.doc.col.date': 'Date',
  'app.pack.doc.col.figures': 'Figures (as sealed)',
  'app.pack.doc.col.about': 'About',
  'app.pack.doc.outside': 'Dated before this period: a harvest lot in the period is about it.',
  'app.pack.doc.batchFigures': '{plants} plants, {inFlower} in flower',
  'app.pack.doc.batchNoFigures': 'No counts sealed',
  'app.pack.doc.lotFigures': '{plants} plants harvested',
  'app.pack.doc.chromatography': '5. Chromatography report per harvest lot',
  'app.pack.doc.chromatographyHelp':
    'A lab report or certificate of analysis sealed as a VeilCore record about the lot. Its numbers are shown only when a laboratory’s signature on them checks and the lab is identified.',
  'app.pack.doc.lot': 'Lot {lot}',
  'app.pack.doc.labSigned': 'Result signed by a laboratory. {signer}',
  'app.pack.doc.document':
    'Sealed document: “{title}”. The report is the laboratory’s file; what it says is in that file, not in this pack.',
  'app.pack.doc.labUnnamed':
    'A lab signature is kept with it, but no laboratory is identified behind it here, so its numbers are not shown.',
  'app.pack.doc.missing': 'Missing: no chromatography report about this lot in these VeilCore records.',
  'app.pack.doc.proofs': '6. Proof codes, check links and dates',
  'app.pack.doc.proofsHelp':
    'Anyone can open each check link for free, with no account. A VeilCore record shows prior possession of its file and details by its date. It does not show that what it says is true.',
  'app.pack.doc.recordId': 'VeilCore ID {id}',
  'app.pack.doc.proofCode': 'Proof code',
  'app.pack.doc.checkLink': 'Check link',
  'app.pack.doc.onPaper': 'On paper: open {site}/verify and enter VeilCore ID {id}.',
  'app.pack.doc.noLink': 'No check link: this VeilCore record isn’t sealed yet.',
  'app.pack.doc.local': 'Kept on the association’s device only.',
  'app.pack.doc.dateRests': 'What the date rests on',
  'app.pack.role.source': 'Source',
  'app.pack.role.grow-batch': 'Grow batch',
  'app.pack.role.harvest-lot': 'Harvest lot',
  'app.pack.role.report': 'Lab report',
  'app.pack.doc.notForm':
    'We know of no official form published for this statement. VeilCore files nothing for the association. The association checks this pack, signs it and sends it itself.',
  'app.pack.doc.handover':
    'Made from the VeilCore records in this browser only. VeilCore records sealed on another officer’s device are in it only once restored here from that officer’s backup.',
  'app.pack.doc.signSign': 'Signature',
  'app.pack.doc.signName': 'Name in print',
  'app.pack.doc.signRole': 'Capacity (legal representative / Technical Manager)',
  'app.pack.doc.signDate': 'Date',
  // What each date rests on (authority-pack.ts dateLines).
  'app.pack.date.unsealed': 'Not sealed, so nothing dates it.',
  'app.pack.date.none': 'Not dated on any network yet.',
  'app.pack.date.pending': 'In a batch, not dated on any network yet.',
  'app.pack.date.test': ' A test network: practice data, not a real date.',
  'app.pack.date.checked':
    'On {where}: checked by this browser when the pack was made. The batch root is in transaction {tx}, block {block}, {at}.{test}',
  'app.pack.date.failed':
    'On {where}: not confirmed. This browser looked the transaction up and it did not match what VeilCore’s registry reports. Don’t rely on that date; the check link shows why.',
  'app.pack.date.reported':
    'On {where}: {date}, as VeilCore’s registry reports it. Not checked by this browser; the check link looks it up.{test}',
  'app.pack.date.noTime': 'time not given',
  'app.pack.date.bitcoin':
    'Bitcoin: VeilCore’s registry reports the batch root in Bitcoin block {block} ({at}). Check it with the batch’s OpenTimestamps file.',
  'app.pack.date.bitcoinPending': 'Bitcoin: stamp pending, not yet in a Bitcoin block.',
  'app.pack.date.tsa':
    'RFC 3161: the batch root carries a timestamp from {tsa}, at {at} as the token states. The token checked against the batch root in this browser; this VeilCore record’s inclusion proof links it to that root.',
  'app.pack.date.tsaUnnamed': 'a timestamp authority',
  'app.pack.date.tsaQualified':
    'VeilCore’s registry states that authority is qualified under {scheme}. Check the trusted list yourself before relying on that.',
  // The gaps, at the top of the pack.
  'app.pack.gap.chromatography': 'Lot {lot}: no chromatography report.',
  'app.pack.gap.registration': '{name}: no variety registration number was given.',
  'app.pack.gap.source': '{name}: a grow batch names it, but it isn’t in this browser.',
  'app.pack.gap.noBatches': 'No grow batch is dated in this period.',
  'app.pack.gap.noLots': 'No harvest lot is dated in this period.',
  'app.pack.gap.plants': 'Total plants: not given.',
  'app.pack.gap.inFlower': 'Plants in flower: not given.',
  'app.pack.gap.plantsPartial.one': 'One grow batch in the period has no sealed plant count.',
  'app.pack.gap.plantsPartial.other': '{count} grow batches in the period have no sealed plant count.',
  'app.pack.gap.inFlowerPartial.one': 'One grow batch in the period has no sealed count of plants in flower.',
  'app.pack.gap.inFlowerPartial.other': '{count} grow batches in the period have no sealed count of plants in flower.',
  'app.pack.gap.patients': 'Number of linked patients: not given.',
  'app.pack.gap.undated.one': 'One VeilCore record is not dated on any network yet.',
  'app.pack.gap.undated.other': '{count} VeilCore records are not dated on any network yet.',
  'app.pack.gap.unchecked.one':
    'One date is VeilCore’s registry’s report, not checked on Midnight’s main network by this browser.',
  'app.pack.gap.unchecked.other':
    '{count} dates are VeilCore’s registry’s report, not checked on Midnight’s main network by this browser.',
  'app.pack.gap.locked.one':
    'One VeilCore record in this browser is locked (sealed with a key it doesn’t have) and is left out.',
  'app.pack.gap.locked.other':
    '{count} VeilCore records in this browser are locked (sealed with a key it doesn’t have) and are left out.',
};
