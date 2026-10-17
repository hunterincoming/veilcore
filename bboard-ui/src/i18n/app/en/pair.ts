// The record app in English: saving a lab report to a plant (components/wizard/Step2PairDna.tsx,
// the optional screen when logging and the plant page's "Save a lab report"). Source text; see log.ts.
// SPDX-License-Identifier: Apache-2.0

export const pair = {
  'app.pair.aFile': 'a file',
  'app.pair.noPlant': 'Could not find the plant to save it to.',
  'app.pair.savedTitle': 'DNA report saved to this plant',
  'app.pair.fpLabel': 'PAIRING CODE',
  'app.pair.openedHere': 'Opened and saved here, on your device.',
  'app.pair.stayed': 'The report file stayed on your device.',
  'app.pair.openedHereSub':
    'The lab sent it locked so only you could open it. Only its code and file name were saved with your record.',
  'app.pair.stayedSub':
    'It was read here in your browser to make its code. Its code and file name were saved with your record.',
  'app.pair.fileSha':
    'File SHA-256: <b>{sha}</b>. This is the code a lab signs: compare it with the lab’s. The pairing code above is made from it, so the pairing can be dated on the network.',
  'app.pair.labMatch': 'This file matches the lab report {lead}, by its SHA-256 (signature checked in this browser).',
  'app.pair.noLabMatch': 'No lab signature on this plant matches this file, so it stays your own statement.',
  'app.pair.recordChip': 'Record · {fp}',
  'app.pair.pairingChip': 'Pairing · {fp}',
  'app.pair.conflicts.one': 'Heads up: this DNA report is also saved to {count} other record you hold{tail}',
  'app.pair.conflicts.other': 'Heads up: this DNA report is also saved to {count} other records you hold{tail}',
  'app.pair.earliest': '. This record was sealed earliest, by the clocks of the devices that sealed them.',
  'app.pair.earlier': ". {name} was sealed earlier ({date}, by its device's clock).",
  'app.pair.saved':
    "Saved. Your DNA report's code is saved with this plant's record, as your statement that this report belongs to it. It is not a check of the genetics. {dated}",
  'app.pair.dateBelow': 'It is not dated yet: date it below if you want the pairing on the network.',
  'app.pair.notDated': 'It is not dated yet.',
  'app.pair.notDatedHere': 'In {thisSite} the pairing isn’t dated yet.',
  'app.pair.seeCertificate': 'Continue: see the certificate',
  'app.pair.title': 'Save your DNA report to this plant',
  'app.pair.intro':
    'Got your DNA report back? Save it to this plant. This is what ties your record to the actual plant: a fresh test can later be compared against it.',
  'app.pair.savingTo': 'Saving to: <b>{name}</b> · bred by {by}',
  'app.pair.replaces':
    '<b>This plant already has a DNA report saved: “{name}”{saved}.</b> Saving this one replaces it. Your plant page, its certificate and links you share will show the new one, not the old one. Nothing is deleted from your device.',
  'app.pair.replacesChain':
    '<b>This plant already has a DNA report saved: “{name}”{saved}.</b> Saving this one replaces it. Your plant page, its certificate and links you share will show the new one, not the old one. Nothing is deleted from your device. If you dated the old pairing on the network, that date stays there.',
  'app.pair.savedOn': ', saved {date}',
  'app.pair.noDna':
    "VeilCore doesn't test DNA: you save the DNA report your testing lab gave you. Your device reads it to make its code; the file is never uploaded. Its code and file name are saved with your record. {after}",
  'app.pair.afterChain': 'Afterwards you can also date the pairing on the network.',
  'app.pair.afterDemo': 'In {thisSite} the pairing isn’t dated yet; on VeilCore’s contract it is.',
  'app.pair.tap': 'Tap to choose your DNA report',
  'app.pair.drag': 'Drag your DNA report here, or click to choose',
  'app.pair.dropHint': 'The report file your testing lab returned — read locally, never uploaded.',
  'app.pair.fromLab':
    'This is the lab report your lab sent through VeilCore. Once it’s saved, this page checks it against the lab’s signature.',
  'app.pair.labCanSign':
    'A lab can also sign its report with its own key; a signed one carries more weight than one you save yourself. Here, save the DNA report file you have.',
  'app.pair.fingerprinting': 'Making its code on your device…',
  'app.pair.replace': 'Replace the saved DNA report',
  'app.pair.skip': 'No report yet: skip',
  'app.pair.chooseFirst': 'Choose the DNA report file first.',
  'app.pair.fingerprinted': 'Its code was made in your browser.',
  'app.pair.sealedFp': 'PROOF CODE',
  'app.pair.chosen': '{title}. Chosen: {name}',
  'app.pair.ready': '{kb} KB · ready to make its code on this device · choose again to replace it',
  // chain/PairDnaOnChainPanel.tsx: dating the pairing on the test network.
  'app.pair.chain.noKeys':
    'This browser does not hold the record’s keys, so it cannot date the pairing. Restore them from your backup.',
  'app.pair.chain.stampFirst':
    "Add your plant's date stamp first (from its page) if you also want to date this lab report on the network.",
  'app.pair.chain.other':
    'This record already has a dated pairing of a different report. Dating a second one is not supported yet, so this report is not dated. Keep the first one’s evidence file and backup.',
  'app.pair.chain.dated': 'This pairing is dated on the test network against this record.',
  'app.pair.chain.label': 'Pairing',
  'app.pair.chain.toShow':
    'To show it, give someone the report and this evidence file. Keep a copy with the report: without its salt the pairing can never be shown.',
  'app.pair.chain.backupAgain': 'Download the record keys backup again: the one you have does not hold this pairing.',
  'app.pair.chain.download': 'Download the evidence file',
  'app.pair.chain.title': 'Also date this pairing on the test network (optional)',
  'app.pair.chain.intro':
    'This puts a code on chain, permanently, next to this record’s identity. The code is made from the report’s SHA-256 and a random number kept in this browser, so it says nothing about the report and nobody can copy it to their own record. Afterwards you download an evidence file: with it and the report, anyone can check that this record’s holder had the report by that date.',
  'app.pair.chain.earlier':
    'An earlier attempt was sent but not confirmed. It may have landed. Sending again uses the same code, so it cannot pair a second, different one.',
  'app.pair.chain.sendAgain': 'Send again',
  'app.pair.chain.date': 'Date the pairing',
  'app.pair.chain.testOnly':
    'Test network only. This shows whoever controlled this record’s identity had the report, or its SHA-256, by the date it lands. It is not a check of the genetics.',
};
