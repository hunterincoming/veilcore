// The record app in English: lab results, version 2 (veilcore/lab-result.ts; docs/lab-signing.md, "Version 2").
// The lab's tools (sign one result, or a spreadsheet's worth), the result's facts wherever they
// show, and the page that checks a result file. Source text; see log.ts.
// SPDX-License-Identifier: Apache-2.0

export const labresult = {
  // ---- kinds of result ----
  'app.lr.kind.numbers': 'Numbers under a published form',
  'app.lr.kind.pathogen': 'Pathogen or viroid test',
  'app.lr.kind.match': 'Genotype comparison with another record',
  'app.lr.kind.lineage': 'Parentage check',
  'app.lr.kind.dna-mark': 'DNA mark',
  'app.lr.kind.retraction': 'Withdrawal of an earlier result',

  // ---- the calls' forms (public/schemas/pathogen-v1.json and the others; field-set.ts) ----
  'app.doc.schema.pathogen': 'Pathogen or viroid test (the call)',
  'app.doc.schema.genetic-match': 'Comparison with another record (the call)',
  'app.doc.schema.lineage-check': 'Parentage check (the call)',
  'app.doc.schema.dna-mark': 'DNA mark (the call)',
  'app.doc.schema.lab-retraction': 'Withdrawal of a lab result',
  'app.doc.slot.detected': 'Detected (1 yes, 0 no)',
  'app.doc.slot.ct': 'Ct',
  'app.doc.slot.matches': 'Match (1 yes, 0 no)',
  'app.doc.slot.compared': 'Markers compared',
  'app.doc.slot.differing': 'Markers that differ',
  'app.doc.slot.consistent': 'Consistent (1 yes, 0 excluded)',
  'app.doc.slot.conflictsFirst': 'Conflicts with the first parent',
  'app.doc.slot.conflictsSecond': 'Conflicts with the second parent',
  'app.doc.slot.found': 'Mark found (1 yes, 0 no)',
  'app.doc.slot.withdrawn': 'Withdrawal',

  // ---- the result's facts (ResultFacts.tsx) ----
  'app.lr.f.kind': 'Kind of result',
  'app.lr.f.subject': 'Record the sample was sent under (proof code)',
  'app.lr.f.sampleId': 'Sample ID',
  'app.lr.f.accession': 'Lab accession number',
  'app.lr.f.method': 'Method',
  'app.lr.f.panel': 'Marker panel',
  'app.lr.f.version': '{id}, version {version}',
  'app.lr.f.tested': 'Date tested',
  'app.lr.f.received': 'Date received',
  'app.lr.f.qc': 'Run and QC',
  'app.lr.f.target': 'Tested for',
  'app.lr.f.sampleType': 'Sample type',
  'app.lr.f.call': 'Result',
  'app.lr.f.ct': 'Target Ct',
  'app.lr.f.other': 'Compared with a sample sent under (proof code)',
  'app.lr.f.compared': 'Markers compared',
  'app.lr.f.differing': 'Markers that differ',
  'app.lr.f.parents': 'Parents named (proof codes)',
  'app.lr.f.conflicts': 'Conflicts with each parent named',
  'app.lr.f.seal': 'Mark seal (the sequence isn’t in it)',
  'app.lr.f.label': 'Mark name',
  'app.lr.f.code': 'Result code',
  'app.lr.call.detected': 'Detected',
  'app.lr.call.notDetected': 'Not detected',
  'app.lr.call.match': 'Same genotype at the markers compared',
  'app.lr.call.noMatch': 'Different genotype at the markers compared',
  'app.lr.call.consistent': 'Consistent with the parents named',
  'app.lr.call.excluded': 'Excluded',
  'app.lr.call.found': 'Mark found',
  'app.lr.call.notFound': 'Mark not found',
  'app.lr.call.withdrawn': 'Withdraws the result it names',
  'app.lr.reason.re-test': 're-test',
  'app.lr.reason.correction': 'correction',
  'app.lr.reason.retraction': 'withdrawal',
  'app.lr.replacesLine': 'Replaces result {code} ({reason}).',
  'app.lr.note.lineage':
    'Consistent with descent is not proof of descent: it says no marker the lab compared rules these parents out.',
  'app.lr.note.mark':
    'The mark’s sequence is sealed: only a salted SHA-256 of it is in the result. The lab that recorded it holds the sequence, which can be checked against this seal in a dispute. VeilCore doesn’t mark or test DNA.',
  'app.lr.note.never':
    'VeilCore didn’t take or test this sample and doesn’t vouch for the result. It shows that this lab’s key signed this result, and the batch date shows it existed by then. That the sample came from the named record is the sender’s word unless a custody record shows more.',

  // ---- the lab's tools (LabResultsPage.tsx) ----
  'app.lr.tools.title': 'Sign lab results',
  'app.lr.tools.intro':
    'For a lab: sign each result together with the record the sender named for the sample, the method, the sample ID and your accession number. Each result is kept as a record you hold and dated in the next hourly batch. Give each result, as its own file, to whoever sent that sample.',
  'app.lr.tools.testOnly': 'Lab results are on the test network only. They aren’t on veilcore.org yet.',
  'app.lr.tools.setUp': 'Set up your lab’s signing key first.',
  'app.lr.tools.single': 'One result',
  'app.lr.tools.csv': 'From a spreadsheet (CSV)',
  'app.lr.tools.open': 'Sign lab results',
  'app.lr.tools.check': 'Check a result file',
  'app.lr.tools.signedOne': 'Signed and kept',
  'app.lr.tools.signedMany': 'Signed and kept: {n}',
  'app.lr.tools.signedText':
    'Each is a record you hold, dated in the next hourly batch. Give each file to whoever sent the sample: they can check it and add it to their own records.',
  'app.lr.tools.download': 'Download the result file',
  'app.lr.tools.downloadAll': 'Download each result as its own file (zip)',
  'app.lr.tools.summary': 'Download a summary for your LIMS (CSV)',
  'app.lr.tools.bound': 'Your lab’s name is on it.',
  'app.lr.tools.notBound':
    'Signed and kept, but your lab’s name isn’t on {n} of them yet ({error}). A checker sees only your key until it is: use “Add your lab’s name” below.',
  'app.lr.tools.markKeep':
    'Download the mark’s sequence file and keep it safe. Without it the sequence can’t be shown in a dispute, and VeilCore doesn’t keep a copy.',
  'app.lr.tools.markDownload': 'Download the mark’s sequence file',
  'app.lr.tools.another': 'Sign another',
  'app.lr.tools.failed': 'Nothing was signed: {error}',
  'app.lr.tools.rowFailed': 'Not signed: {problem}',
  'app.lr.tools.yours': 'Results you signed',
  'app.lr.tools.none': 'None yet.',

  // ---- one result (ResultForm.tsx) ----
  'app.lr.form.kind': 'What kind of result',
  'app.lr.form.subject': 'Proof code the sender gave for this sample',
  'app.lr.form.subjectHelp': 'From the sample’s record or its check link: 64 characters.',
  'app.lr.form.sampleId': 'Sample ID (the sender’s)',
  'app.lr.form.accession': 'Your accession number',
  'app.lr.form.method': 'Method or SOP',
  'app.lr.form.methodVersion': 'Method version',
  'app.lr.form.panel': 'Marker panel (optional)',
  'app.lr.form.panelVersion': 'Panel version',
  'app.lr.form.tested': 'Date tested',
  'app.lr.form.received': 'Date received (optional)',
  'app.lr.form.title': 'Name of this result (optional)',
  'app.lr.form.qc': 'Run and QC details (optional)',
  'app.lr.form.qcName': 'QC figure',
  'app.lr.form.qcValue': 'Value',
  'app.lr.form.qcAdd': 'Add a QC figure',
  'app.lr.form.qcRemove': 'Remove',
  'app.lr.form.target': 'Tested for (pick or type, for example HLVd)',
  'app.lr.form.sampleType': 'Sample type (leaf, root, petiole, TC plantlet, pooled…)',
  'app.lr.form.call': 'Result',
  'app.lr.form.ct': 'Target Ct (optional)',
  'app.lr.form.other': 'Proof code the other sample was sent under',
  'app.lr.form.compared': 'Markers compared (optional)',
  'app.lr.form.differing': 'Markers that differ (optional)',
  'app.lr.form.parent1': 'Proof code of the first parent',
  'app.lr.form.parent2': 'Proof code of the second parent (optional)',
  'app.lr.form.conflicts1': 'Conflicts with the first parent (optional)',
  'app.lr.form.conflicts2': 'Conflicts with the second parent (optional)',
  'app.lr.form.sequence': 'The mark’s sequence (A, C, G, T)',
  'app.lr.form.sequenceHelp':
    'Paste the sequence or a FASTA entry: header lines and spaces are ignored. Sealed in this browser and never sent. Only a salted SHA-256 of it goes into the result.',
  'app.lr.form.markLabel': 'Your name for the mark (optional)',
  'app.lr.form.markIntro':
    'The mark is a DNA sequence your lab recorded for this line: one already in its genome, or a tag applied to the material. VeilCore doesn’t mark or test DNA: it dates your lab’s signed record of it.',
  'app.lr.form.compareIntro':
    'Records are named by proof code only. No genotype goes into the result or anywhere else.',
  'app.lr.form.replaces': 'Replaces an earlier result of yours (optional)',
  'app.lr.form.withdraws': 'The result to withdraw',
  'app.lr.form.replacesNone': 'None',
  'app.lr.form.replacesCode': 'Or its result code',
  'app.lr.form.reason': 'Why',
  'app.lr.form.sign': 'Sign this result',
  'app.lr.form.signing': 'Signing…',
  'app.lr.form.numbersIntro': 'Type the numbers exactly as in your report.',

  // ---- the spreadsheet (ResultsCsv.tsx) ----
  'app.lr.csv.kind': 'What the rows are',
  'app.lr.csv.defaults': 'The same for every row (a column in the file overrides it)',
  'app.lr.csv.template': 'Download a template',
  'app.lr.csv.choose': 'Choose the CSV file',
  'app.lr.csv.intro':
    'One row per sample and target. Each row becomes its own signed result. Needed columns: subject (the proof code the sender gave), sample id, accession, result. The template has the rest, including the run and QC details.',
  'app.lr.csv.ready': '{ok} ready to sign. {bad} won’t be signed: fix them and run them again.',
  'app.lr.csv.tooMany':
    'This file has {rows} rows, and one run signs at most {n}. Nothing was read: split it, and start the next file at line {next}.',
  'app.lr.csv.empty': 'The file has no rows under its header.',
  'app.lr.csv.columns': 'The file needs columns named subject, sample id and accession.',
  'app.lr.csv.row': 'Line {line}: {problem}',
  'app.lr.csv.sign': 'Sign {n} results',
  'app.lr.csv.progress': 'Signed {done} of {total}…',

  // ---- why a result can't be used ----
  'app.lr.problem.unreadable': 'It can’t be read.',
  'app.lr.problem.format': 'It isn’t a version 2 lab result.',
  'app.lr.problem.kind': 'The kind of result isn’t one this format has.',
  'app.lr.problem.subject': 'The proof code of the record tested is 64 hex characters.',
  'app.lr.problem.sampleId': 'Type the sample ID: one line.',
  'app.lr.problem.accession': 'Type your accession number: one line.',
  'app.lr.problem.method': 'Name the method and its version.',
  'app.lr.problem.panel': 'Name the panel and its version, or neither.',
  'app.lr.problem.tested':
    'The date tested is a real date. Write it as YYYY-MM-DD (03/11/2026 could be 3 November or 11 March).',
  'app.lr.problem.received': 'The date received is a real date, not after the date tested.',
  'app.lr.problem.qc': 'Each QC figure needs a name and a value, at most 8, names not repeated.',
  'app.lr.problem.result': 'Choose the result.',
  'app.lr.problem.target': 'Name what was tested for.',
  'app.lr.problem.sampleType': 'Name the kind of sample.',
  'app.lr.problem.ct':
    'Ct is a number under 100 with at most two decimals (24.13, not 24.1287). Round it in the file the way your report shows it.',
  'app.lr.problem.other': 'Name the other record by its proof code, not the sample’s own.',
  'app.lr.problem.parents': 'Name one or two parents by proof code, each once, not the sample’s own record.',
  'app.lr.problem.counts': 'Counts are whole numbers, and no more can differ than were compared.',
  'app.lr.problem.seal': 'A mark is 10 to 100,000 letters, A, C, G or T only.',
  'app.lr.problem.label': 'The mark’s name is one line.',
  'app.lr.problem.replaces': 'Name the result replaced by its 64-character code, with a reason.',
  'app.lr.problem.form': 'Choose the form of the numbers.',
  'app.lr.problem.file': 'The result statement isn’t the one the lab signed.',
  'app.lr.problem.issued': 'The record’s date isn’t the date tested.',
  'app.lr.problem.calls':
    'The signed numbers don’t agree with the result, or one that names what was compared is missing.',
  'app.lr.problem.signature': 'The signature doesn’t check: it wasn’t made for this result by that key.',

  // ---- checking a result file (LabResultCheck.tsx) ----
  'app.lr.check.title': 'Check a lab result',
  'app.lr.check.intro':
    'Choose the result file a lab gave you. It is checked in this browser. Nothing in it is sent unless you ask for the lab’s name: then only the result’s code goes to the registry.',
  'app.lr.check.choose': 'Choose the result file',
  'app.lr.check.bad': 'This result can’t be used: {problem}',
  'app.lr.check.looking': 'Looking up whose key it is…',
  'app.lr.check.replacedBy': 'Replaced by result {code}, signed by the same key ({reason}).',
  'app.lr.check.namesOther':
    'It names result {code} as replaced. That result isn’t in this file, or another key signed it, so nothing here changes it.',
  'app.lr.check.disputeTitle': 'In a dispute: check the mark’s sequence file',
  'app.lr.check.disputeText':
    'The lab that recorded the mark keeps a file with the sequence. Choose it to see whether it is the sequence sealed in this result. It is checked here and not sent.',
  'app.lr.check.disputeChoose': 'Choose the sequence file',
  'app.lr.check.disputeYes':
    'It matches: this is the sequence the lab sealed ({n} letters) by this result’s date. Whether a plant in dispute carries it needs a new test of that plant.',
  'app.lr.check.disputeNo': 'It doesn’t match this result’s seal.',
  'app.lr.check.disputeBad': 'That file isn’t a mark’s sequence file.',
  'app.lr.check.add': 'Add it as a record you hold',
  'app.lr.check.addText':
    'This sample was sent under one of your records. Add the result to that record to publish the lab’s signature on Midnight. You can then show the result (for example “not detected”) without showing the rest.',
  'app.lr.check.open': 'Open the record',
  'app.lr.check.find': 'Find the record this sample was sent under',
  'app.lr.check.finding': 'Looking in your records…',
  'app.lr.check.notYours':
    'The sample isn’t from one of the records in this browser, so there is nothing to add it to.',
  'app.lr.check.yours': 'You signed this result: it is in your records.',

  // ---- on a record and in the lab's delivery flow ----
  'app.lr.panelTitle': 'Lab result',
  'app.lr.inReport': 'The lab’s signed result with this report ({kind}):',
  'app.lr.out.title': 'A signed result with this report (optional)',
  'app.lr.out.text':
    'Bound to this delivery’s record, with the method and the sample. It is sealed into a record you sign and sent locked with the report. The breeder can show the result without showing the rest.',
  'app.lr.f.otherSampleId': 'Other sample ID',
  'app.lr.f.counts': '({compared} markers compared, {differing} differ)',
  'app.lr.note.match':
    'A match says the two samples gave the same calls at the markers the lab compared, within the lab’s own rule. It doesn’t say they are the same plant or the same variety, and it says nothing about markers that weren’t compared.',
  'app.lr.note.current':
    'This is what the lab signed, tested on {tested}. A later result may replace it: ask the lab or the holder for the latest result for this sample.',
  'app.lr.tools.downloadOne': 'Download',
  'app.lr.tools.archive': 'Download all results in one file (for your records, not to send)',
  'app.lr.tools.withdrawFailed':
    'Result {code} still carries your lab’s name: withdrawing it failed ({error}). Sign the withdrawal again from the browser where {code} was signed.',
  'app.lr.tools.unsigned': 'Rows not signed: {n}. The summary lists them as not signed: fix them and run them again.',
  'app.lr.tools.markFirst': 'Save the mark’s sequence file before you sign another.',
  'app.lr.tools.nameRetry': 'Add your lab’s name to {n} results',
  'app.lr.tools.nameLeft': 'Added to {named}. {left} still to do ({error}): try again in a minute.',
  'app.lr.tools.nameDone': 'Your lab’s name is now on {named} more results.',
  'app.lr.form.qcUsual': 'Add the usual qPCR run details',
  'app.lr.form.otherSampleId': 'The other sample’s ID (optional)',
  'app.lr.problem.csvResult':
    'The result cell isn’t one this kind of result takes (for a pathogen test: detected or not detected).',
  'app.lr.problem.inconclusive':
    'Only detected or not detected can be signed. An inconclusive or invalid result isn’t signed: re-test it and sign the re-test.',
  'app.lr.problem.future': 'The date tested is after tomorrow. Check it.',
  'app.lr.problem.duplicate': 'The same accession, sample and target are already on another line of this file.',
  'app.lr.check.nameText':
    'To show the lab’s name, the result’s code is sent to the registry, which looks up the lab’s own binding. Nothing else in the file is sent.',
  'app.lr.check.nameFind': 'Find the lab’s name',
  'app.lr.check.replaced':
    'The lab replaced this result with a later one. Its signature still checks: this is what the lab signed, but ask the lab or the holder for the latest result for this sample.',
  'app.lr.check.withdrawn':
    'This lab no longer stands behind this result. The signature still checks. It may have been replaced by a later result: ask the lab or the holder for the latest result for this sample.',
  'app.lr.claim.onlyCall':
    'This claim proves the result only. What was tested for, or which records were compared, is in the lab’s result file, not in this claim. If you have that file, choose it: it is checked here, against this claim, and not sent.',
  'app.lr.claim.choose': 'Choose the lab’s result file',
  'app.lr.claim.same': 'The result file is for the same signed result as this claim:',
  'app.lr.claim.otherResult': 'That file is for a different result, not the one this claim is about.',
  'app.lr.tools.markLeave':
    'The mark’s sequence file isn’t saved. If you leave now it is lost for good, and the seal can never be opened in a dispute. Leave anyway?',
  'app.lr.problem.ctMissing':
    'A detected result with no Ct (Undetermined, N/A, >40) contradicts itself. Check that the result and Ct columns aren’t mixed up.',
};
