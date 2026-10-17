// The record app in English: the public check page (pages/VerifyPage.tsx, components/verify/*,
// and saved-report.ts publicReportLine). Source text; see log.ts.
// SPDX-License-Identifier: Apache-2.0

export const verify = {
  // saved-report.ts publicReportLine and withdrawnSignaturesLine
  'app.verify.report.notSaved': 'The holder has not saved a DNA report to this record.',
  'app.verify.report.pending':
    'Which DNA report is saved isn’t shown right now: the record changed after the holder chose to share it, and their app hasn’t sent the update yet.',
  'app.verify.report.asOf': ' (as of when this link was made)',
  'app.verify.report.staleNote':
    ' This link was made when a different file was saved; this line is about the one saved now.',
  'app.verify.report.matches':
    'The holder saved a DNA report to this record{asOf}. Its file (SHA-256 {sha}) matches the lab report {lead}: signature checked in this browser.{rest}{staleNote}',
  'app.verify.report.which': 'The DNA report saved to this record{asOf} (SHA-256 {sha})',
  'app.verify.report.replaced': '{which} was replaced by its lab on {on} with a corrected one. {tail}{staleNote}',
  'app.verify.report.withdrawn': '{which} was withdrawn by its lab on {on}. {tail}{staleNote}',
  'app.verify.report.ownSha':
    'The holder saved a DNA report file to this record{asOf} (SHA-256 {sha}). No lab signature on this record matches it, so it is the holder’s own statement.{staleNote}',
  'app.verify.report.own':
    'The holder saved a DNA report file to this record. No lab signature on this record matches it, so it is the holder’s own statement.{staleNote}',
  'app.verify.report.unnamedSigned':
    'The holder saved a DNA report to this record. This link doesn’t name the file, so this page can’t tell whether it is the signed lab report listed above.',
  'app.verify.report.unnamedWithdrawn':
    'The holder saved a DNA report to this record. This link doesn’t name the file, and every lab report signed about this record was withdrawn by its lab, so it is the holder’s own statement.',
  'app.verify.report.unnamedNone':
    'The holder saved a DNA report to this record. No lab has signed a lab report about this record, so it is the holder’s own statement.',
  'app.verify.kind.receipts.one': 'a lab’s receipt',
  'app.verify.kind.receipts.other': '{count} lab receipts',
  'app.verify.kind.reports.one': 'a lab report',
  'app.verify.kind.reports.other': '{count} lab reports',
  'app.verify.kind.statements.one': 'a signed statement',
  'app.verify.kind.statements.other': '{count} signed statements',
  'app.verify.kind.and': ' and ',
  'app.verify.withdrawnSignatures.one': 'One signature was withdrawn by its signer, so it is not counted: {what}.',
  'app.verify.withdrawnSignatures.other':
    '{count} signatures were withdrawn by their signers, so they are not counted: {what}.',
  // components/verify/anchor-words.ts: the batch's date stamp, looked up on Midnight.
  'app.verify.anchor.registryDate': '{date}, as VeilCore’s registry reports it',
  'app.verify.anchor.noDate': 'not given (VeilCore’s registry gives no date for that transaction)',
  'app.verify.anchor.lookingUp': 'Looking that transaction up on {network}…',
  'app.verify.anchor.twoIndexers': ' Two separate Midnight indexers gave the same answer.',
  'app.verify.anchor.checked':
    'Checked on Midnight: this batch root was written by transaction {tx} in block {block} at {at}.{two}{test}',
  'app.verify.anchor.failed': 'Not confirmed on Midnight: {reason}. Don’t rely on the date the registry reports.',
  'app.verify.anchor.dateNotChecked': 'The date is {date}; not checked here.',
  'app.verify.anchor.oneIndexer': 'Only one of the two Midnight indexers answered, and both must. {date}',
  'app.verify.anchor.noIndexer': 'Couldn’t reach a Midnight indexer. {date}',
  'app.verify.anchor.headingTest': 'Date stamp checked on a test network: practice data, not a real date',
  'app.verify.anchor.headingChecked': 'Date stamp checked on Midnight',
  'app.verify.anchor.headingFailed': 'Date stamp not confirmed on Midnight',
  'app.verify.anchor.eventTestTitle': 'Date stamp checked on a test network',
  'app.verify.anchor.eventChecked':
    'Batch {batch}: this page found the batch root in transaction {tx}, block {block}, on {where}.{test}',
  'app.verify.anchor.eventFailed': 'Batch {batch}: {reason}. Don’t rely on the date the registry reports.',
  'app.verify.anchor.whyChecking': 'This page is looking it up on Midnight.',
  'app.verify.anchor.whyUnreachable': 'This page couldn’t reach Midnight to check it.',
  'app.verify.anchor.whyNotLooked': 'This page has not looked it up on Midnight.',
  'app.verify.anchor.eventReportedTitle': 'Date stamp reported by the registry',
  'app.verify.anchor.inTx': ' in transaction {tx}',
  'app.verify.anchor.eventReported':
    'Batch {batch}: the registry reports the batch root was recorded on {where}{tx}. The date is {date}. {why} Don’t rely on the date until it is checked.{test}',
  'app.verify.anchor.summaryAdd': '{summary} Checked on Midnight: the batch root’s date stamp.',
  // veilcore/disclosure.ts: the facts a holder can share (Show someone and the check page).
  'app.verify.field.existence': 'Prior possession (shown only once anchored)',
  'app.verify.field.attestation-status': 'Whether a DNA report is saved',
  'app.verify.field.descent-clean': 'Lineage status, as the registry reports it',
  'app.verify.field.sealed-at': 'When it was sealed (the holder’s device clock)',
  'app.verify.field.parent-names': 'Parent cultivar names',
  'app.verify.field.breeding-method': 'Breeding method',
  'app.verify.field.individual-id': 'Individual ID and its scheme',
  'app.verify.field.genetics': 'The genetics themselves — never disclosed, by design',
  // veilcore/verify-link.ts: the check page's heading and footer.
  'app.verify.sum.reports.one': 'a lab report',
  'app.verify.sum.reports.other': '{count} × lab report',
  'app.verify.sum.receipts.one': 'a lab’s receipt',
  'app.verify.sum.receipts.other': '{count} × lab’s receipt',
  'app.verify.sum.statements.one': 'a signed statement',
  'app.verify.sum.statements.other': '{count} × signed statement',
  'app.verify.sum.what': ' ({list})',
  'app.verify.sum.comma': ', ',
  'app.verify.sum.bound': 'the link’s proof code matches the one the registry reports',
  'app.verify.sum.inBatch': 'the record is in its batch',
  'app.verify.sum.signatures.one': 'one signature about it{what}',
  'app.verify.sum.signatures.other': '{count} signatures about it{what}',
  'app.verify.sum.nothing':
    'Nothing on this page could be checked in this browser: it is all the VeilCore registry’s report.',
  'app.verify.sum.list': '{rest} and {last}',
  'app.verify.sum.checked':
    'Checked in this browser: {list}. Everything else is the VeilCore registry’s report.{unbound}',
  'app.verify.sum.unbound':
    ' This link names no proof code, so those checks used the registry’s own and nothing is ticked.',
  'app.verify.heading.nothingSealed': 'Record found, nothing sealed',
  'app.verify.heading.unbound': 'The registry’s report: this link has no proof code to check against',
  'app.verify.heading.checking': 'Checking…',
  'app.verify.heading.reported': 'Date stamp reported by the registry, not checked here',
  'app.verify.heading.pending': 'In a batch, no date stamp yet',
  'app.verify.heading.none': 'No date stamp yet',
  // pages/VerifyPage.tsx: the public check page.
  'app.verify.thisId': 'this ID',
  'app.verify.kindReceipt': 'Lab’s receipt for a sample',
  'app.verify.kindReport': 'Lab report (file SHA-256 {sha})',
  'app.verify.kindStatement': 'Signed statement',
  'app.verify.forWhom': 'For the proof code the registry reports: ',
  'app.verify.homeAria': 'VeilCore home',
  'app.verify.intro':
    "This page checks a VeilCore record: a proof code made from a description of genetic material, dated once it's anchored, published without the genetics. Checking is free and needs no account. <link>What is VeilCore?</link>",
  'app.verify.checkingRecord': 'Checking the record',
  'app.verify.notFound': 'No record found for {id}',
  'app.verify.notFoundText':
    "This verification link doesn't match any record in the registry. Check the link is complete and unmodified.",
  'app.verify.goHome': 'Go to veilcore.org',
  'app.verify.mismatch.title': "This link's proof code doesn't match the record: nothing checked",
  'app.verify.mismatch.dontRely': 'Do not rely on this page.',
  'app.verify.mismatch.text':
    '{start}but the registry reports {reported} for {id}. Its answer is not about the record the link names, so this page has checked nothing and shows none of it. Ask whoever gave you the link for the record itself.',
  'app.verify.mismatch.linked': 'This link was made for the record with proof code {fp}, ',
  'app.verify.mismatch.invalid':
    'This link carries a proof code that is not valid (it should be 64 hexadecimal characters); it may have been cut short or changed, ',
  'app.verify.mismatch.reportedFp': 'proof code {fp}',
  'app.verify.mismatch.noFp': 'no proof code',
  'app.verify.mismatch.inLink': 'Proof code in the link: {fp}',
  'app.verify.mismatch.chip': "The registry's answer does not match this link — nothing on this page was checked",
  'app.verify.nameTyped': 'Name, as the holder typed it: ',
  'app.verify.recordId': 'Record ID: {id}',
  'app.verify.noCommitment':
    'This record carries no commitment, so nothing about it can be checked. It exists in the registry and that is all.',
  'app.verify.boundFact':
    'This link was made for proof code {fp}, and the registry reports the same proof code for this record{firstSeen}. The fields it covers are not shared, so this page cannot recompute it.',
  'app.verify.firstStored': ', first stored on {date}',
  'app.verify.unboundFact':
    'The registry reports a record with proof code {fp}{firstSeen}. The fields it covers are not shared, so this page cannot recompute it.',
  'app.verify.noFpInLink':
    "This link does not name the record's proof code, so this page cannot tell whether the registry answered with this record's proof code or another's. Nothing below is ticked. A link made now from the record ends in ?fp=…; ask the holder for one.",
  'app.verify.noStampYet':
    'No date stamp yet, as far as this page can tell: there is no proof here that the record is in a batch with a date stamp, so there is nothing to check.',
  'app.verify.batchBound':
    'Checked in this browser: this proof code is in batch {batch}, and its path folds to the batch root {root}….',
  'app.verify.batchUnbound':
    "{forWhom}it is in batch {batch}, and its path folds to the batch root {root}…. Checked here, but against the registry's own proof code.",
  'app.verify.rootReported':
    'The registry reports that root was recorded on {network}{tx}. Its date: {date}.{notLooked}{test}',
  'app.verify.notLooked': ' This page has not looked it up; do that before relying on the date.',
  'app.verify.batchNoStamp': 'The batch has no date stamp on Midnight yet.',
  'app.verify.sigLine': '{forWhom}{kind}, signature verified in this browser. {lead}.',
  'app.verify.sampleDetails': 'Sample details, as the registry reports them:',
  'app.verify.moreSigs': '{forWhom}And {n} more signatures, each verified in this browser.',
  'app.verify.noneVerified': 'The registry reports a signed attestation, but none could be verified in this browser.',
  'app.verify.noneSigned': "No lab's receipt or lab report has been signed about this record.",
  'app.verify.badSigs.one': 'One signature the registry reports doesn’t verify in this browser, so it is not counted.',
  'app.verify.badSigs.other':
    '{count} signatures the registry reports don’t verify in this browser, so they are not counted.',
  'app.verify.ownReceipt': '{lead}, linked to your delivery {tx}.',
  'app.verify.ownReceiptTail':
    ' You see this because the plant is in this browser; someone you send the link to sees only the signature line above.',
  'app.verify.sharedTitle': 'Shared by the holder · reported by the registry',
  'app.verify.notGranted': 'This link asked for {list}, which the holder has not chosen to share.',
  'app.verify.unavailable':
    'This link asked for facts about the holder rather than this record ({list}). The registry never answers those.',
  'app.verify.footer': 'Proof code {fp} · only the facts above were sent · no genetics disclosed',
  // components/verify/DisclosedFacts.tsx: the marks, and the facts the holder shared.
  'app.verify.mark.checked': 'Checked in this browser',
  'app.verify.mark.reported': 'Not checked here',
  'app.verify.mark.failed': 'Failed or withdrawn',
  'app.verify.mark.key': 'What the marks mean',
  'app.verify.own.preview':
    "Prior possession: shown only once the registry reports this record's batch anchored, and then as the registry's report.",
  'app.verify.own.anchored':
    "Prior possession: the registry reports this record's batch anchored on {network}.{found}{test}",
  'app.verify.own.found':
    ' This page found that date stamp on Midnight itself (above). It dates the record, not who held it.',
  'app.verify.own.notConfirmed': ' This page has not confirmed it on the chain.',
  'app.verify.own.notAnchored': "Prior possession: not anchored yet, so its date rests on this registry's records.",
  'app.verify.dna.saved': 'The holder saved a DNA report to this record.',
  'app.verify.lineage.intact':
    'The registry reports the lineage intact — an unbroken chain back to the sealed record. This page has not checked it.',
  'app.verify.lineage.notChecked':
    'Lineage: not checked on this page. The registry does not walk descent for a shared link.',
  'app.verify.sealedAt': "Sealed, by the holder's device clock: {date}. This is the holder's own statement.{first}",
  'app.verify.firstStoredBy': ' First stored by this registry: {date}.',
  'app.verify.parents': 'Parents, as the holder states them: {list}',
  'app.verify.noParents': 'No parents recorded.',
  'app.verify.method': 'Breeding method, as the holder states it: {method}',
  'app.verify.noMethod': 'No breeding method recorded.',
  'app.verify.sharedNothing': 'The holder has shared nothing beyond the basics above.',
  'app.verify.notShared': 'Not shared by the holder: {list}.',
  'app.verify.alwaysShown':
    "Always shown: the record ID, its proof code ({fp}), when the registry first stored it, and what this page could check about its batch and any signed attestations (a lab's receipt, a lab report). The name only when the link carries it (yours do, unless you leave it out) or you choose to show it.",
  // components/verify/VerifyExample.tsx: a made-up record, line by line.
  'app.verify.ex.title': 'Example: a made-up record.',
  'app.verify.ex.intro':
    "This shows what a record's check page looks like, with a note under each line. Nothing on it was looked up or checked.",
  'app.verify.ex.status': 'Example · in a sealed batch · anchor reported',
  'app.verify.ex.name': 'Harbour Mist (example)',
  'app.verify.ex.fact1':
    'This link was made for proof code 3f9a0c41e2b7…, and the registry reports the same proof code for this record.',
  'app.verify.ex.note1':
    "The proof code is in the link itself, so the page can't be fooled into showing another record's checks.",
  'app.verify.ex.fact2':
    'Checked in this browser: this proof code is in batch 41, and its path folds to the batch root.',
  'app.verify.ex.note2':
    'On a real record this line has a tick: your own browser checks that the record is in the batch.',
  'app.verify.ex.fact3':
    'Checked on Midnight: this batch root was written by transaction 9c41e0…b27d in block 2973563 at 2026-10-11 14:03 UTC.{test}',
  'app.verify.ex.note3':
    "That transaction, on {network}, is what dates the record. On a real record your browser asks a Midnight indexer for it and checks it wrote this batch root to VeilCore's contract. If no indexer answers, the line says so and the date is only the registry's report: look the transaction up on a Midnight explorer, such as midnightexplorer.com, before relying on it.",
  'app.verify.ex.fact4':
    'Lab report (file SHA-256 7c1e04d2…9b3a51), signature verified in this browser. Signed by a key named “Example Lab” (name not checked).',
  'app.verify.ex.note4':
    'A lab can sign its receipt for a sample, and its lab report, with its own key. Each line says which it is. The page checks the signature; whether the key is a lab you trust is your call.',
  'app.verify.ex.fact5':
    'The holder saved a DNA report to this record. Its file (SHA-256 7c1e04d2…9b3a51) matches the lab report signed by a key named “Example Lab” (name not checked): signature checked in this browser.',
  'app.verify.ex.note5': 'The holder chooses which facts appear here. Anything not shared is listed as not shared.',
  'app.verify.ex.marks':
    "✓ this page checked the line itself, in your browser. ○ VeilCore's registry or the holder reports it; this page didn't check it. ⊗ a check failed, or a lab withdrew what it signed.",
  'app.verify.ex.checkReal': 'Check a real record',
  'app.verify.ex.what': 'What is VeilCore?',
  'app.verify.noNameInLink': "The holder didn't include the name in this link.",
  'app.verify.field.name': 'Its name',
  'app.verify.nameShared': 'Its name, shown by the holder to anyone with the ID: {name}',
  'app.verify.noNameShared': 'No name recorded.',
  'app.verify.field.bred-by': 'Bred by',
  'app.verify.bredByShared': 'Bred by, as the holder wrote it: {name}',
  'app.verify.noBredBy': 'No breeder recorded.',
  'app.verify.mark.anyName':
    "A signer's name is the name its key was registered under. Anyone can register a key under any name, so a name shows who signed only when it says it was matched to a public listing.",
  'app.verify.summary.checked': 'Record existed by {date}: this page checked it on Midnight.{test}',
  'app.verify.summary.reported':
    "Record existed by {date}. VeilCore's registry says so; this page hasn't checked it on Midnight yet.{test}",
  'app.verify.summary.yourself': 'Check it yourself',
  'app.verify.self.explorer': 'Open a Midnight explorer for {network}, such as {url} (type the address in yourself).',
  'app.verify.self.anyExplorer': 'Open a Midnight explorer for {network}.',
  'app.verify.self.tx': 'Search for transaction {tx}. Its block time is the date.',
  'app.verify.self.contract': "Check that it succeeded and called VeilCore's contract {contract}.",
  'app.verify.self.noContract': "(the registry didn't name it)",
  'app.verify.self.root':
    "Check that it wrote batch root {root}. An explorer may not show it: the record's evidence bundle, from its holder, says how to read it another way.",
  'app.verify.dnaCheck.help':
    'Have the DNA report file the holder sent you? Choose it to check it is the one saved with this record. The file is read in this browser and never sent anywhere.',
  'app.verify.dnaCheck.button': 'Check a DNA report file',
  'app.verify.dnaCheck.reading': 'Reading the file…',
  'app.verify.dnaCheck.tooBig': 'That file is too large to check here.',
  'app.verify.dnaCheck.matches': '{file} is the DNA report the holder saved with this record.',
  'app.verify.dnaCheck.differs': '{file} is not the DNA report saved with this record.',
  'app.verify.dnaCheck.noSalt':
    'This link doesn’t carry what is needed to check the DNA report file. Ask the holder for their check link and the file.',
  'app.verify.report.fileMatches': 'The file you chose is the one saved.',
  'app.verify.report.fileDiffers': 'The file you chose is not the one saved.',
  'app.verify.report.chooseFile':
    'The holder saved a DNA report to this record. To see which, choose the file the holder sent you: this page checks it against the record, using what is in this link.',
  'app.verify.report.noSaltInLink':
    'The holder saved a DNA report to this record. Which file it is can be checked only with the holder’s own check link and the file.',
};
