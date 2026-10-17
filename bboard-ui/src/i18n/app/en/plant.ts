// The record app in English: a plant's page (components/RecordDetail.tsx, flow/PlantParts.tsx,
// flow/plant-status-words.ts and the parts they show). Source text; see log.ts.
// SPDX-License-Identifier: Apache-2.0

export const plant = {
  // RecordDetail.tsx
  'app.plant.notHere': "This record isn't in this browser",
  'app.plant.notHereText':
    "If you sealed it in another browser, save a backup there and open it here (Get your plants back). If it is someone else's record, open the verify link they gave you instead.",
  'app.plant.yourRecords': 'Your records',
  'app.plant.checkARecord': 'Check a record',
  'app.plant.home': 'Home',
  'app.plant.bredByName': 'Bred by {name}',
  'app.plant.corrected':
    'This record was corrected. A correction never edits or deletes it: it remains on file unchanged, and a later record supersedes it. <link>See the correction</link>',
  'app.plant.corrects':
    'This corrects an earlier record. Changed: {fields}. Reason given: {reason}. <link>See what it replaced</link>',
  'app.plant.evidenceLine':
    '<link>Download evidence bundle</link> <muted>to check this record’s date without VeilCore</muted>',
  'app.plant.open': 'Open',
  'app.plant.reportsCameBack.one': 'A lab report came back, locked so only you can open it.',
  'app.plant.reportsCameBack.other': '{count} lab reports came back, locked so only you can open them.',
  'app.plant.moreYouCanDo': 'More you can do',
  'app.plant.action.show': 'Show someone',
  'app.plant.action.showHint': 'Pick what they see',
  'app.plant.action.askedToProve': 'Someone asked me to prove I hold it',
  'app.plant.action.certificate': 'Certificate',
  'app.plant.action.sendResults': 'Send results back to the breeder',
  'app.plant.action.sendResultsHint': 'Signed by you, locked for them',
  'app.plant.action.signReceipt': 'Sign receipt',
  'app.plant.action.signReceiptHint': 'Sign that this sample arrived, or turn it away',
  'app.plant.action.linkReceipt': 'Link your receipt',
  'app.plant.action.linkReceiptHint': 'Your receipt is signed; link it to the delivery so the breeder sees it',
  'app.plant.action.labReports': 'Lab reports',
  'app.plant.action.sendToLab': 'Send it to a lab or breeder',
  'app.plant.action.licenseIt': 'License it',
  'app.plant.action.saveReport': 'Save a DNA report to this plant',
  'app.plant.action.checkReport': 'Check a report matches',
  'app.plant.action.familyTree': 'Family tree',
  'app.plant.action.freshBackup': 'Save a fresh backup',
  'app.plant.action.fix': 'Fix a mistake',
  'app.plant.agreements': 'Agreements',
  'app.plant.openAgreement': 'Open agreement {id}',
  'app.plant.unnamedCounterparty': 'unnamed counterparty',
  'app.plant.technicalDetails': 'Technical details',
  'app.plant.f.method': 'Breeding method',
  'app.plant.f.statedDate': "Stated creation date (breeder's claim)",
  'app.plant.f.sealedClock': "Sealed (this device's clock)",
  'app.plant.f.ref': 'Reference / lot ID',
  'app.plant.f.photos': 'Photos',
  'app.plant.f.photosSealed': '{n} sealed (fingerprints only; the images were never uploaded)',
  'app.plant.f.reportSaved': 'saved to this plant ({file}) · pairing fingerprint {fp}{sha}',
  'app.plant.f.file': 'file',
  'app.plant.f.fileSha': ' · file SHA-256 {sha}',
  'app.plant.f.notSavedYet': 'not saved yet',
  'app.plant.f.recordFingerprint': 'Record fingerprint',
  'app.plant.evidenceBundle': 'Evidence bundle',
  'app.plant.evidenceBundleText':
    'The record as sealed, its inclusion proof, the batch root, where the batch was recorded, the Bitcoin stamp file if there is one, and lab signatures about it, in one .zip. Its verify.html checks it with no internet and nothing from VeilCore, and says what to look up to date it.',
  'app.plant.exportFailed': 'The record could not be exported.',
  'app.plant.exportRecord': 'Export record',
  'app.plant.backToPlant': 'Back to the plant',
  'app.plant.backToRecord': 'Back to the record',
  // PlantParts.tsx: where the plant stands.
  'app.plant.mark.done': 'done',
  'app.plant.mark.failed': 'not confirmed',
  'app.plant.mark.reported': 'reported by the registry, not checked',
  'app.plant.mark.wait': 'not yet',
  'app.plant.recordDated': 'Record dated',
  'app.plant.labReport': 'Lab report',
  'app.plant.dnaReport': 'DNA report',
  'app.plant.tie.tied': 'Tied to the plant',
  'app.plant.tie.notYet': 'Not tied to the plant yet',
  'app.plant.tie.notNow': 'Not tied to the plant now',
  'app.plant.tie.lab': 'DNA report {lead}',
  'app.plant.tie.self': 'DNA report you saved (no lab signature matches it)',
  'app.plant.tie.selfPublic': 'DNA report the holder saved (no lab signature matches it)',
  'app.plant.tie.savedHolder': 'DNA report you saved',
  'app.plant.tie.savedPublic': 'DNA report the holder saved',
  'app.plant.tie.replaced': 'the lab replaced the DNA report saved here',
  'app.plant.tie.withdrawn': 'the lab withdrew the DNA report saved here',
  'app.plant.tie.add': 'add a DNA report',
  'app.plant.tie.noneSaved': 'no DNA report is saved to this record',
  'app.plant.tie.cameBack': 'a lab report came back: open it and save it here',
  'app.plant.tie.openedNotSaved': 'a lab report is open, not saved to this plant',
  'app.plant.tie.notDated': 'not dated yet',
  'app.plant.tie.dating': 'being dated ({status})',
  'app.plant.tie.datingPlain': 'being dated',
  'app.plant.tie.dated': 'dated {date}',
  'app.plant.tie.unconfirmed': 'not dated: {status}',
  'app.plant.tie.sentence': 'Tied to the plant: {what}, {date}.',
  'app.plant.tie.sentenceNoDate': 'Tied to the plant: {what}.',
  'app.plant.tie.sentenceNone': 'Not tied to the plant yet: {what}.',
  'app.plant.tie.sentenceNot': 'Not tied to the plant now: {what}.',
  'app.plant.tie.means':
    'A DNA report lets a lab compare a new test of a plant with it. It doesn’t show by itself that a plant matches.',
  'app.plant.tie.sub': 'Report {date}. A lab can compare a new test of the plant with it.',
  'app.plant.tie.why': 'A DNA report from your lab is what ties a record to the plant itself.',
  'app.plant.backupChecked': 'Backup checked',
  'app.plant.checking': 'checking…',
  'app.plant.savedToPlant': 'saved to this plant',
  'app.plant.arrivedNotOpened': 'arrived, not opened',
  'app.plant.openedNotSaved': 'opened, not saved to this plant',
  'app.plant.noneYet': 'none yet',
  'app.plant.labReceipt': 'Lab receipt',
  'app.plant.receiptSigned': 'Receipt signed',
  'app.plant.labCodeUsed': 'Lab code used',
  'app.plant.noReceiptSigned': 'no receipt signed',
  'app.plant.notSignedYet': 'not signed yet',
  // plant-status-words.ts
  'app.plant.receipt': 'Receipt',
  'app.plant.notLinkedYet': '{date}, not linked to the delivery yet',
  'app.plant.turnedAway': 'You turned it away',
  'app.plant.rejected.damaged': 'arrived damaged',
  'app.plant.rejected.wrongSample': 'wrong sample',
  'app.plant.receiptNotSigned': 'Receipt not signed yet',
  'app.plant.keyStampLine':
    'Key date stamped: {when}. Your plant’s key is dated too, so you can prove you hold it later.',
  'app.plant.done': 'done',
  'app.plant.notYet': 'not yet',
  'app.plant.labReportSent': 'Lab report sent',
  'app.plant.nSent': '{n} sent',
  'app.plant.withdrawnSendNew': 'withdrawn (you can send a new one)',
  'app.plant.waitingBatch': 'waiting for a batch',
  'app.plant.inBatchWaiting': 'in a batch, waiting for its date stamp',
  'app.plant.onTestNetwork': ' On a test network: practice data, not a real date.',
  'app.plant.checkedOnMidnight': '{date} — checked on Midnight',
  'app.plant.notConfirmed': 'date stamp not confirmed on Midnight',
  'app.plant.dontRely': '{reason}. Don’t rely on the date the registry reports.',
  'app.plant.lookingUp': 'Looking it up on Midnight…',
  'app.plant.couldntReach': 'Couldn’t reach Midnight to check it.',
  'app.plant.notChecked': 'Not checked on Midnight from this page.',
  'app.plant.registryReport': '{date} (VeilCore’s registry’s report)',
  'app.plant.dateNotGiven': 'date not given',
  // stage/record-kinds.ts: a record that dates a lab report, on its own page.
  'app.plant.labReportSha': 'Lab report SHA-256: {sha}',
  'app.plant.labReportCode': 'Lab report code: {code}',
  'app.plant.labAsSigned': 'Lab, as signed: {lab}',
  'app.plant.noLabMatched': 'no lab signature matched the saved file',
  'app.plant.next.backup.title': 'Save your backup',
  'app.plant.next.backup.why':
    'This plant’s keys are only on this device right now. If it breaks or the browser is cleared, nobody can prove you hold it. Saving takes a minute.',
  'app.plant.next.backup.action': 'Save my backup',
  'app.plant.next.dates.title': 'This record dates a DNA report',
  'app.plant.next.dates.why':
    'It holds only the report’s SHA-256, its lab report code and the lab’s name as signed, never the report. When its batch is dated, it shows the report existed by then, without showing anyone the markers.',
  'app.plant.next.stamp.why':
    'It’s sealed. Its key isn’t date stamped yet, and you need that to prove you hold it. It takes about a minute and it’s free.',
  'app.plant.next.rejected.title': 'You turned this sample away',
  'app.plant.next.rejected.why':
    'Nothing was signed. VeilCore doesn’t tell the breeder: let them know yourself, so they can send another.',
  'app.plant.next.setup.title': 'Set up your lab’s signature',
  'app.plant.next.setup.why':
    'Then you can sign that this sample arrived, and send the lab report back signed by your lab.',
  'app.plant.next.setup.action': 'Set it up',
  'app.plant.next.sign.title': 'Sign that it arrived',
  'app.plant.next.sign.why':
    'Your signed receipt is what lets the breeder trust a lab report from you: it shows your key had the sample.',
  'app.plant.next.sign.action': 'Sign receipt',
  'app.plant.next.link.title': 'Link your receipt to the delivery',
  'app.plant.next.link.why':
    'Your receipt is signed, but the breeder’s page only counts a receipt linked to their delivery. Only whoever used the lab code can link it.',
  'app.plant.next.link.action': 'Link it',
  'app.plant.next.signed.title': 'Receipt signed',
  'app.plant.next.signed.why':
    'The breeder sees your signed receipt. Lab reports can’t be sent back through VeilCore on this network yet: send yours the way you usually do.',
  'app.plant.next.sent.title': 'Lab report sent',
  'app.plant.next.withdrawn.title': 'Lab report withdrawn',
  'app.plant.next.send.title': 'Send results back to the breeder',
  'app.plant.next.sent.why': 'Only the breeder can open it. You can withdraw it, or send a corrected file.',
  'app.plant.next.withdrawn.why':
    'You withdrew what you sent, so the breeder has no current lab report from you. You can send a new one.',
  'app.plant.next.send.why':
    'Signed with your lab’s key and locked so only the breeder can open it. VeilCore doesn’t have its key.',
  'app.plant.next.sent.action': 'See what you sent',
  'app.plant.next.send.action': 'Send results back',
  'app.plant.next.corrected.title': 'Save the corrected DNA report',
  'app.plant.next.corrected.why':
    'The lab replaced the DNA report saved to this plant. Until you save the corrected one, your plant page, certificate and links say the saved one was replaced.',
  'app.plant.next.corrected.action': 'Open the corrected one',
  'app.plant.next.noCurrent.why':
    'The original was replaced and the correction withdrawn. Ask the lab to send one again. Until then your certificate and links say the saved one was replaced.',
  'app.plant.next.labWithdrew.title': 'The lab withdrew the DNA report saved here',
  'app.plant.next.labWithdrew.whyNewer':
    'It stays saved to this plant, and your certificate and links say it was withdrawn. A newer lab report is here: open it and save it instead.',
  'app.plant.next.labWithdrew.why':
    'It stays saved to this plant, and your certificate and links say it was withdrawn. Ask the lab for a new one.',
  'app.plant.next.labWithdrew.action': 'Open the newer one',
  'app.plant.next.open.why':
    'It’s locked so only you can open it, with this plant’s key. Opening it checks the lab’s signature here.',
  'app.plant.next.sample.title': 'Send a sample to a lab',
  'app.plant.next.sample.whySaved':
    'You’ve saved a DNA report to this plant, which is your own statement. A lab signing that it received a sample adds a second party, which is stronger evidence than your statement alone.',
  'app.plant.next.sample.why':
    'Right now this record is your own account of the plant. A lab signing that it received a sample, and sending a lab report back, makes it stronger evidence than your own account.',
  'app.plant.next.sample.action': 'Send to a lab',
  'app.plant.next.dna.title': 'Get a DNA fingerprint for this plant',
  'app.plant.next.dna.why':
    'A dated record shows a description existed. A DNA report (a lab’s genetic fingerprint of the plant) is what ties your record to the actual plant. Two ways to get one:',
  'app.plant.next.dna.labTitle': 'Send a sample to a lab',
  'app.plant.next.dna.labText':
    'Make a lab code and send a sample with it. The lab’s DNA report comes back here, locked so only you can open it.',
  'app.plant.next.dna.labSoon':
    'Getting the lab’s DNA report back here, locked so only you can open it, is coming to this site soon. For now, ask your lab for the report and save it here.',
  'app.plant.next.dna.haveTitle': 'Already have a DNA report?',
  'app.plant.next.dna.haveText': 'Save it to this plant. It’s read on your device; the file is never uploaded.',
  'app.plant.next.dna.haveAction': 'Save a DNA report',
  'app.plant.next.date.title': 'Date this DNA report',
  'app.plant.next.date.why':
    'It’s saved to this plant, but nothing dates it yet. Dating it shows the report existed by that date, without showing anyone the markers.',
  'app.plant.next.save.title': 'Save the DNA report to this plant',
  'app.plant.next.save.why':
    'A lab signed that it received a sample. When its DNA report comes back, save it to this plant: that is what ties your record to the plant, so a later test can be compared with it.',
  'app.plant.next.save.action': 'Save it to this plant',
  'app.plant.next.ready.title': 'This record is ready to use',
  'app.plant.next.ready.why':
    'A lab signed that it received a sample, and a DNA report is saved to this plant. You can send material onward or license it, with terms that apply to offspring declared from this record.',
  'app.plant.next.ready.action': 'Start an agreement',
  'app.plant.next.backTo': 'Back to {name}',
  'app.plant.next.noCurrent.title': 'No current DNA report from {lab}',
  'app.plant.next.open.title': 'Open the lab report from {lab}',
  'app.plant.next.label': 'Next step',
  'app.plant.next.stamp.title': 'Add the date stamp',
  'app.plant.next.stamp.action': 'Add the date stamp',
  'app.plant.next.open.action': 'Open',
  'app.plant.chain.sealed': 'Sealed',
  'app.plant.chain.reportSaved': 'DNA report saved',
  'app.plant.chain.receipt': 'Receipt confirmed',
  'app.plant.chain.licensed': 'Licensed',
  'app.plant.chain.licensedN': 'Licensed ({n})',
  // settlement-words.ts and SettlementStatus.tsx: the record's date on Midnight.
  'app.plant.date.chipNotAnchored': 'In a batch, not yet anchored',
  'app.plant.date.chipChecked': 'In a batch · date checked on {network}',
  'app.plant.date.chipFailed': 'In a batch · date stamp not confirmed',
  'app.plant.date.chipReported': 'In a batch · anchor reported on {network}',
  'app.plant.date.testNote': ' A test network can be reset and its dates carry no evidential weight.',
  'app.plant.date.head':
    "Checked in this browser: your record's fingerprint is in batch {batch}, and the path from it folds to the batch root.",
  'app.plant.date.looked': '{head} The registry reports that root was recorded on {network}.{test}',
  'app.plant.date.notLooked':
    '{head} The registry reports that root was recorded on {network}; this page has not looked the transaction up, so it is not shown as anchored. Look it up on the network before relying on the date.{test}',
  'app.plant.date.title': 'Date on Midnight',
  'app.plant.date.notInBatch':
    "Sealed on your device and kept on {server}. It isn't in a batch yet, so it isn't anchored. We anchor records together, in batches (by hand for now, so it can take a while), so one transaction covers many and you never need a wallet. Until then its date rests on this registry's records.",
  'app.plant.date.inBatchNotAnchored':
    "Checked in this browser: your record's fingerprint is in batch {batch}, which has not been anchored yet. When it is, the proof gains a reference to the transaction. Nothing about your record changes.",
  'app.plant.date.batchLine': 'batch {batch}',
  'app.plant.date.rootLine': 'root {root}…',
  'app.plant.date.txChecked': 'tx (checked on Midnight) {tx}',
  'app.plant.date.txReported': 'tx (reported by the registry) {tx}',
  'app.plant.date.downloadProof': 'Download inclusion proof',
  'app.plant.date.downloadStamp': 'Download Bitcoin stamp file',
  'app.plant.date.openExplorer': 'Open the explorer for {network}',
  'app.plant.date.fileConfirmed':
    'The file shows your record is in this batch. This page found the batch root in the named transaction on Midnight. Anyone can repeat that: the evidence bundle has everything they need and says how, and the check page does the same look-up in their own browser.',
  'app.plant.date.fileNotConfirmed':
    'The file shows your record is in this batch. It dates the record only once the batch root is found in the named transaction. The evidence bundle has everything needed to look that up and says how, and the check page does the look-up in the browser when it can reach Midnight.',
  'app.plant.date.stampPending':
    "The Bitcoin stamp file dates this batch's root on Bitcoin with the free OpenTimestamps tool: <code>ots verify root.bin.ots</code>, next to <link>the batch root file (root.bin)</link>. It is still pending: a promise from the stamping servers, not yet in a Bitcoin block. Run `ots upgrade` on it once Bitcoin confirms.",
  'app.plant.date.stampInBlock':
    "The Bitcoin stamp file dates this batch's root on Bitcoin with the free OpenTimestamps tool: <code>ots verify root.bin.ots</code>, next to <link>the batch root file (root.bin)</link>. It is in a Bitcoin block, so it checks against Bitcoin alone.",
  // RecordHistory.tsx
  'app.plant.history.title': 'History',
  'app.plant.history.correctionOf': 'Issued as a correction to {id}. Reason given: {reason}.',
  'app.plant.history.sealed':
    'The holder committed to a description of this material, dated by the sealing device’s clock.',
  'app.plant.history.received': 'Received',
  'app.plant.history.arrived': 'Arrived through a transfer from {from}.',
  'app.plant.history.arrivedQty': 'Arrived through a transfer from {from}, {qty}.',
  'app.plant.history.retracted': 'Attestation retracted',
  'app.plant.history.retractedDetail':
    'The attester withdrew it with a retraction signed by their key. Reason: {reason}. The attestation remains on record — retraction is not deletion.',
  'app.plant.history.corrected': 'Corrected',
  'app.plant.history.correctedDetail':
    'A later record supersedes this one. This record is unchanged and remains on file.',
  // LineageGraph.tsx and stage/StageRows.tsx
  'app.plant.tree.none': 'No lineage recorded yet. Add parent cultivars when logging to build the family tree.',
  'app.plant.tree.offspring': 'Offspring',
  'app.plant.tree.datedReports': 'Dated DNA reports (not offspring)',
  'app.plant.action.nextStage': 'Add the next generation or selection',
  'app.plant.action.nextStageHint': 'A new record with this plant as its parent. Seal each stage when it happens.',
  // stage/DateLabReport.tsx and lab-report-date.ts
  'app.plant.dated.refused': 'The registry didn’t save it ({reason}). Nothing was dated. Try again.',
  'app.plant.dated.line': 'DNA report dated: in <link></link> ({status})',
  'app.plant.dated.dated': 'dated {value}',
  'app.plant.dated.action': 'Date this DNA report',
  'app.plant.dated.why': 'So you can show this report existed by that date without showing anyone the markers.',
  'app.plant.dated.seals':
    "Seals a small record with only the report's SHA-256, its lab report code and the lab's name as signed. The report stays with you. Its date comes when its batch is dated.",
  'app.plant.dated.nameLabel': 'Name of the new record (public)',
  'app.plant.dated.nameHelp': 'Anyone with its check link sees this name. Change it if you like.',
  'app.plant.dated.elsewhere':
    'This DNA report is being dated in another tab or window. Wait a minute, then look again: it will show here.',
  // stage/LabReportOverview.tsx: the page of a record that dates a lab report.
  'app.plant.datingPage.title': 'This record dates a DNA report for <plant></plant>',
  'app.plant.datingPage.holds':
    "It holds only the report's SHA-256, its lab report code and the lab's name as signed, never the report. When its batch is dated, it shows the report existed by then, without showing anyone the markers.",
  'app.plant.datingPage.recordDated': 'Record dated: {value}',
  'app.plant.datingPage.backup': "<b>Save your backup.</b> This record's key is only on this device.",
  'app.plant.datingPage.sealedBy': 'Sealed by',
  'app.plant.datingPage.notesAsSealed': 'Notes, as sealed',
  'app.plant.datingPage.bundleText':
    'The record as sealed, its inclusion proof, the batch root and where the batch was recorded, in one .zip. Its verify.html checks it with no internet and nothing from VeilCore.',
  // chain/AnchorOnChainPanel.tsx: the plant's key, date stamped on the network.
  'app.plant.anchor.title': 'Anchor this record on {network}',
  'app.plant.anchor.anchored':
    'Anchored. Its on-chain identity is {id}…, recorded at block {block}{when}. The identity is kept in this browser and in your backup, not on VeilCore’s server: you share it by sending someone a checker’s link. This is a test network: it can be reset, and its dates carry no evidential weight.',
  'app.plant.anchor.chainClock': ' ({when}, the chain’s clock)',
  'app.plant.anchor.label': 'Anchor',
  'app.plant.anchor.notAvailable': 'Not available in this build: {why}',
  'app.plant.anchor.intro':
    'This gives the record an identity on the network that only this browser can act as. Your browser builds and proves the transaction itself; VeilCore pays the network fee and sees only what the network publishes. You need no wallet and no crypto. Later you can show someone who asks that your key existed by this block and that you still control it.',
  'app.plant.anchor.notKeeping':
    'This browser is not keeping what it stores (a private window, or site data blocked). The record’s keys would be lost when this tab closes, unless you download the backup.',
  'app.plant.anchor.understand': 'I understand, and I will download the backup',
  'app.plant.anchor.keysNotHere':
    'This plant’s key isn’t in this browser. Get it back from your backup file: a new key wouldn’t match the sealed record.',
  'app.plant.anchor.onlyNew':
    'Only for a record that has never had keys: if you anchored it before, or made its keys in another browser, restore them from your backup above instead. New keys would be a different identity.',
  'app.plant.anchor.makeKeys': '1. Make this record’s keys (in this browser)',
  'app.plant.anchor.anchorTest': '2. Anchor on the test network',
  'app.plant.anchor.backupFirst': 'Download the backup first',
  // chain/RecordKeysPanel.tsx
  'app.plant.keys.restoredFor': 'Restored keys for {id}.',
  'app.plant.keys.notNamed': 'Restored, but these aren’t the keys this record names. Check you chose the right file.',
  'app.plant.keys.notIdentity':
    'Restored, but these keys are not this record’s on-chain identity. Check you chose the right file.',
  'app.plant.keys.restored': 'Keys restored to this browser.',
  'app.plant.keys.removeBacked':
    'Remove this record’s keys from this browser? You can restore them from your backup file.',
  'app.plant.keys.removeUnbacked':
    'You have NOT downloaded a backup of these keys. If you remove them, this browser won’t take them back, and only your backup file, restored in a new browser, can bring them back. Remove them anyway?',
  'app.plant.keys.title': 'Record keys',
  'app.plant.keys.holds':
    'This browser holds the two secrets that prove you hold this record on chain. A copy also goes inside the record’s locked box on VeilCore, which only the key that locks your records opens. Clearing this browser deletes them here; restoring your backup brings them back.',
  'app.plant.keys.noBackup': 'No backup yet. Download it and keep it offline.',
  'app.plant.keys.downloadAgain': 'Download the backup again',
  'app.plant.keys.download': 'Download the backup (secret)',
  'app.plant.keys.remove': 'Remove from this browser',
  'app.plant.keys.notHeld':
    'This browser does not hold this record’s keys. If you made them elsewhere, restore them from your backup file.',
  'app.plant.keys.restore': 'Restore keys from a backup file',
  // EvidenceBundle.tsx: the evidence bundle's dialog (the bundle itself is in English).
  'app.plant.bundle.download': 'Download evidence bundle',
  'app.plant.bundle.chooseOrUntick': 'Choose the DNA report file, or untick it.',
  'app.plant.bundle.tooBig': '{name} is larger than 200 MB, so it wasn’t read.',
  'app.plant.bundle.intro':
    'One file with everything someone needs to check this record’s date without VeilCore: the record as it was sealed, proof that it’s in a dated batch, where that batch was recorded, and a page that does the checks offline. It also has a one-page summary to print for a lawyer or examiner, and sample text for a written declaration (not legal advice). A README inside says what it shows and what it doesn’t.',
  'app.plant.bundle.notSealed':
    'This record was sealed before its details were kept in a form anyone can check, so no bundle can be made for it.',
  'app.plant.bundle.includeKey': 'Include the record’s key.',
  'app.plant.bundle.keyIs':
    '(The record’s key is the public ID of the key made for this plant when you sealed it. Its secret part stays in your backup and never goes in the bundle.)',
  'app.plant.bundle.keyWith':
    'With it, anyone who has the bundle can tie this record to its key, and to everything that key does on the network. Leave it out unless they need it.',
  'app.plant.bundle.keyNotHere': 'The key isn’t in this browser. Open your backup here to include it.',
  'app.plant.bundle.includeLab':
    'Include the DNA report file. Without it, the bundle has only the report’s fingerprint, not what it says.',
  'app.plant.bundle.chooseLab': 'Choose the DNA report file',
  'app.plant.bundle.checkedAgainst': 'It’s checked against the one saved to this plant before it goes in.',
  'app.plant.bundle.labFileAria': 'DNA report file',
  'app.plant.bundle.downloaded':
    'Downloaded {name}. Open verify.html inside it to check it, or EXAMINER-SUMMARY.html to print a summary.',
  'app.plant.bundle.making': 'Making it…',
  'app.plant.bundle.downloadButton': 'Download',
  // wizard/Step3Certificate.tsx: the screen around the certificate (the card stays in English).
  'app.plant.cert.intro':
    "For your files and your lawyer: the sealed record, a fresh check that it hasn't changed, whether it is anchored, whether a DNA report ties it to the plant, any lab receipt and active licenses. It carries the record details but no genetic data or lab files. The QR code opens the record's public check page.",
  'app.plant.cert.jsonDone': 'Summary (JSON) downloaded.',
  'app.plant.cert.pngDone': 'Certificate downloaded.',
  'app.plant.cert.pngFailed': 'Could not render the certificate image.',
  'app.plant.cert.linkCopied': 'Verification link copied.',
  'app.plant.cert.copyLink': 'Copy verification link',
  'app.plant.cert.downloadPng': 'Download (PNG)',
  'app.plant.cert.downloadJson': 'Download summary (JSON)',
  'app.plant.cert.continue': 'Continue: choose what others see',
  // wizard/Step4CheckReport.tsx: check a report matches.
  'app.plant.check.title': 'Check a report matches this record',
  'app.plant.check.intro': 'Pick a lab report file to see whether it is the one paired with a record you hold.',
  'app.plant.check.forYou':
    "This check runs only in your browser and sends nothing, so it is for you. It shows you have a file matching the report paired with a record. It doesn't show who holds the plant, and nobody else can verify it from here. Others check a record on its verify page, and its date once the record is anchored.",
  'app.plant.check.tap': 'Tap to choose the lab report',
  'app.plant.check.drag': 'Drag the lab report here, or click to choose',
  'app.plant.check.hint': 'Read and fingerprinted locally, never uploaded.',
  'app.plant.check.none':
    'None of your records has this lab report saved to it. Save it to the right plant first, then check again.',
  'app.plant.check.found': 'Match found.',
  'app.plant.check.foundSub': 'This file was fingerprinted in your browser and was not uploaded.',
  'app.plant.check.matches': 'This file matches the report paired with {name}.',
  'app.plant.check.meaning':
    'Record {id}. A match means the file is byte-for-byte the one you paired; it says nothing about the genetics and nothing about who holds the plant.',
  'app.plant.check.checking': 'Checking on your device…',
  'app.plant.check.checkIt': 'Check it',
  // CorrectRecord.tsx: fixing a mistake. The consequences are veilcore/corrections.ts's own words.
  'app.plant.fix.field.cultivarName': 'cultivar name',
  'app.plant.fix.field.breederName': 'bred by',
  'app.plant.fix.field.breedingMethod': 'breeding method',
  'app.plant.fix.field.claimedCreationDate': 'stated creation date',
  'app.plant.fix.field.notes': 'notes',
  'app.plant.fix.field.internalReference': 'internal reference',
  'app.plant.fix.field.parents': 'parents',
  'app.plant.fix.field.attestations': 'attestations',
  'app.plant.fix.field.sealedAt': 'sealed date',
  'app.plant.fix.field.holder': 'holder',
  'app.plant.fix.c.cosmetic.cosmetic':
    'Nothing downstream is affected. Offspring keep their ancestry checks, and any agreements stand.',
  'app.plant.fix.c.cosmetic.material':
    'Offspring are unaffected: the material did not change. But anyone with an agreement on this record needs to know, because the terms may refer to what you changed.',
  'app.plant.fix.c.material.cosmetic':
    'Anyone relying on descent from this record needs to check again. Existing agreements are unaffected.',
  'app.plant.fix.c.material.material':
    'Both descent and existing agreements are affected. Offspring will need their ancestry checked again, and the other parties to your agreements need to be told.',
  'app.plant.fix.open': 'Correct this record',
  'app.plant.fix.title': 'Correct {id}',
  'app.plant.fix.intro':
    'This record stays exactly as it is. A correction creates a new record that supersedes it, and both remain on file. A correction overwrites nothing and deletes nothing: that is what keeps the original usable as evidence.',
  'app.plant.fix.name': 'Cultivar name (public)',
  'app.plant.fix.bredBy': 'Bred by',
  'app.plant.fix.notes': 'Notes',
  'app.plant.fix.does': 'What this correction does',
  'app.plant.fix.workedOut':
    'This is worked out from which fields you changed. Neither you nor we can set it; otherwise every correction would look harmless.',
  'app.plant.fix.why': 'Why are you correcting this?',
  'app.plant.fix.whyHelp':
    'Kept with the correction in your records. The public view shows which fields changed, not this reason.',
  'app.plant.fix.check': 'Check what this affects',
  'app.plant.fix.notSaved': 'The correction could not be saved.',
  'app.plant.fix.issue': 'Issue correction',
  // AttestationPanel.tsx: signatures about a record (Technical details).
  'app.plant.att.linked': '{date} · linked to your delivery {id}',
  'app.plant.att.verified': 'The signature was verified in this browser.',
  'app.plant.att.unverifiedRetraction':
    ' The registry also reports a retraction that is not signed by the lab, so it is ignored here.',
  'app.plant.att.codeUsed':
    "Someone used your lab code, but no lab has signed a receipt for it. A used code doesn't show who took the sample.",
  'app.plant.att.noReceipt':
    'No lab has signed a receipt for this plant yet. A record only you stand behind is weaker evidence than one a lab signs for. Send a sample to a lab: their receipt is signed with their key, not yours.',
  'app.plant.att.others':
    "Other signatures name this record: {n}, not tied to your deliveries. Anyone can sign a statement about a public fingerprint, so they aren't counted as a receipt.",
  'app.plant.att.title': 'Signatures about this record',
  'app.plant.att.nobody':
    'Nobody else has confirmed this record yet. A record only you stand behind is weaker evidence than one a second party confirms. Send the material to a lab: their confirmation is recorded under their key, not yours.',
  'app.plant.att.legacy':
    'Delivery taken on {date} by a party holding the code the sender issued{addressed}. Recorded before signing existed, so it establishes that a second party took delivery without proving who they are.',
  'app.plant.att.addressed': ', addressed to {who}',
};
