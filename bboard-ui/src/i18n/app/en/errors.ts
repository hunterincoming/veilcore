// The record app in English: what a failure says (i18n/error-words.ts). Each sentence here
// is, word for word, what the record code (veilcore/*) throws or returns, so the screen can
// say it in the visitor's language; error-words.test.ts checks every thrown sentence has one.
// Source text; see log.ts.
// SPDX-License-Identifier: Apache-2.0

export const errors = {
  // Anything the app has no sentence for (a browser's own error): a sentence, then the details.
  'app.err.unknown': 'Something went wrong. Try again.',
  'app.err.technical': 'Something went wrong. Technical details (in English): {detail}',
  'app.err.technicalReason': 'a technical problem (details in English: {detail})',

  // The registry.
  'app.err.registry.unexpected': 'Unexpected answer from the registry.',
  'app.err.registry.notAsExpected': 'The registry did not answer as expected.',
  'app.err.registry.answered': 'the registry answered {status}',
  'app.err.registry.unexpectedLower': 'unexpected response from the registry',
  'app.err.registry.refusedCorrection': 'The registry refused this correction, so nothing was changed. {refusals}',

  // The network and the contracts.
  'app.err.chain.unreachable':
    'Could not reach the Midnight network or the sponsor. Nothing was sent. Try again in a few minutes.',
  'app.err.chain.contractNotFound': 'VeilCore’s contract was not found on the network. Nothing was sent.',
  'app.err.chain.demoNotFound': 'The demo contract was not found on the network.',
  'app.err.chain.claimsNotFound': 'The claims contract was not found on the network.',
  'app.err.chain.otherContract':
    'The contract on the network is not the one this site was built for. Nothing was sent.',
  'app.err.chain.otherClaimsContract':
    'The claims contract on the network is not the one this site was built for. Nothing was sent.',
  'app.err.chain.filesMismatch':
    'This site’s proving files are not the ones the contract on the network uses. Nothing was sent.',
  'app.err.chain.claimsFilesMismatch':
    'This site’s proving files are not the ones the claims contract uses. Nothing was sent.',
  'app.err.chain.circuitFilesMismatch': "This site's proving files for {circuit} are not the ones the contract uses.",
  'app.err.chain.filesMissing': 'The proving files for {circuit} are not on this site yet.',
  'app.err.chain.proofFileWrong':
    'A proving file was not the exact file this site was built to use, so it was not used. Nothing was sent.',
  'app.err.chain.proofFilesUnreachable':
    'The proving files could not be downloaded right now. Nothing was sent. Try again in a few minutes.',
  'app.err.chain.paramsMissing': 'The public parameters (k={k}) are not on this site yet.',
  'app.err.chain.callFailed': 'The network included the call but it did not succeed ({status}).',
  'app.err.chain.hashUnreadable': 'The network included it, but its transaction hash could not be read',
  'app.err.chain.claimFailed': 'The network included the claim but it did not succeed ({status}).',
  'app.err.chain.noSlot': 'Could not find a free license slot. Nothing was sent.',
  'app.err.chain.notSendersRecord':
    'This link names a record that isn’t the sender’s. Nothing was sent: ask them for a new link.',
  'app.err.chain.pow': 'Could not finish the proof of work.',
  'app.err.chain.notToSponsor': 'Nothing was sent to the sponsor.',
  'app.err.chain.proverStart': 'The prover could not start in this browser: {reason}',
  'app.err.chain.proverSlow': 'The prover did not start in time. Try again, or on a laptop.',
  'app.err.chain.noRecordKeys': 'This browser does not hold the record’s keys.',
  'app.err.chain.pairingNotSaved': 'This browser could not save the pairing’s random number, so nothing was sent.',
  'app.err.chain.noIdentity': 'This record has no on-chain identity yet.',
  'app.err.chain.notTx': 'That is not a transaction id.',
  'app.err.chain.badRandom': 'The random generator returned a degenerate value.',
  // Checking an answer to a challenge (chain/ownership-check.ts, chain/license-check.ts).
  'app.err.chain.noIdentityToCheck': 'This record has no on-chain identity to check.',
  'app.err.chain.notOurChallenge': 'This page did not make that challenge. Make a new one and send it.',
  'app.err.chain.challengeUsed': 'That challenge was already answered once. Make a new one.',
  'app.err.chain.notOurRequest': 'This page did not make that challenge. Make a new request.',
  'app.err.chain.requestUsed': 'That challenge was already answered once. Make a new request.',
  'app.err.chain.noRecordKey': 'No record key to check against.',
  'app.err.chain.callUnreadable': 'could not read that transaction from Midnight right now; try again in a few minutes',
  'app.err.chain.noSuchTx': 'Midnight has no such transaction.',
  'app.err.chain.indexerUnreachable': 'could not reach the Midnight network’s indexer; try again in a few minutes',
  'app.err.chain.stateUnreadable': 'could not read the contract’s current state; try again in a few minutes',

  // Numbers sealed in a document, and claims about them.
  'app.err.claims.noNumbers': 'This document has no sealed numbers.',
  'app.err.claims.noSchema': 'No published schema {schema}.',
  'app.err.claims.otherSchema': 'The schema on this site is not the one the numbers were sealed under.',
  'app.err.claims.notOnCertificate': 'That number was not on the certificate when it was sealed.',
  'app.err.claims.boundNotMet': 'The sealed number doesn’t meet that bound, so it can’t be proved.',
  'app.err.claims.sigOtherRecord': 'That signature is for a different record.',
  'app.err.claims.sigNoCheck': 'That signature doesn’t check: it wasn’t made for this record by that key.',
  'app.err.claims.tooMany': 'Too many claims for one link.',
  'app.err.claims.onePerNumber': 'One claim per number in a link.',
  'app.err.claims.sameRecord': 'Claims in one link must be on the same record, form and contract.',
  'app.err.claims.provingOff': 'Proving is off for this record until you turn it on, on its page. Nothing was sent.',
  'app.err.claims.confirmPublish': 'Publishing the number itself needs your confirmation first. Nothing was sent.',
  'app.err.claims.notOffered': 'That claim isn’t offered on this kind of result. Nothing was sent.',
  'app.err.claims.slotNotNumber': 'Slot {slot} is not a number in {schema}.',
  // Checking a claim link (claim-link.ts, chain/claim-check.ts).
  'app.err.claims.noLabSignature': 'The link names no laboratory signature.',
  'app.err.claims.txNotLabSignature': 'That transaction is not a laboratory signature.',
  'app.err.claims.labSigOtherRecord': 'That laboratory signature is on a different record.',
  'app.err.claims.otherKey': 'That record was signed by a different key.',
  'app.err.claims.unknownSchema': 'The link names a schema this site doesn’t publish.',
  'app.err.claims.otherKind': 'That transaction made a different kind of claim.',
  'app.err.claims.otherRecord': 'That claim is about a different record.',
  'app.err.claims.otherSchemaClaim': 'That claim was made under a different schema.',
  'app.err.claims.otherNumber': 'That claim is about a different number.',
  'app.err.claims.otherBound': 'That claim proved a different bound.',
  'app.err.claims.notANumber': 'That claim published something that isn’t a number.',
  'app.err.claims.otherValue': 'That claim published a different value.',
  'app.err.claims.noContract': 'This site can’t read claims: no claims contract is configured.',
  'app.err.claims.notOurContract': 'The link names a claims contract that isn’t VeilCore’s on this network.',

  // Laboratory signatures and lab reports.
  'app.err.lab.notRequest': 'That file isn’t a request for a laboratory signature.',
  'app.err.lab.noForm': 'The request uses numbers this site doesn’t publish a form for.',
  'app.err.lab.notInForm': 'The request’s numbers aren’t in the form it names. Don’t sign it; ask for it again.',
  'app.err.lab.cantCheck': 'The request can’t be checked: {reason}',
  'app.err.lab.notDocument': 'it isn’t a document record.',
  'app.err.lab.rootMismatch': 'its numbers don’t make the root it sealed.',
  'app.err.lab.notRecord': 'The request’s numbers don’t make the record it names. Don’t sign it; ask for it again.',
  'app.err.lab.notKey': 'That isn’t a laboratory signing key.',
  'app.err.lab.notSignature': 'That file isn’t a laboratory signature.',
  'app.err.lab.sigKeyNotLab': 'That signature’s key isn’t a laboratory signing key.',
  'app.err.lab.numbersUnreadable': 'The numbers in this report can’t be read.',
  'app.err.lab.numbersTooLarge': 'The numbers are too large to send.',
  'app.err.lab.noLock': 'The lab code has no lock for lab reports in it.',
  'app.err.lab.notLockedHere': 'This lab report was not locked for this plant, or the file is damaged.',
  'app.err.lab.signatureDamaged': 'The lab signature in that file is damaged. Nothing was changed.',
  'app.err.lab.keyExists':
    'An attester key already exists in this browser. Publish it again or download its backup; a new one was not made.',

  // Licenses and lending.
  'app.err.lic.licensorSigns': 'Only the licensor signs these credentials.',
  'app.err.lic.otherStatement': 'That confirmation is for another statement.',
  'app.err.lic.alreadyIssued': 'Already issued on chain: cancel it instead.',
  'app.err.lic.notOnChain': 'This license is not on chain.',
  'app.err.lic.noDealMessages': 'This license has no deal messages yet.',
  'app.err.lic.badKey': 'The other side’s key is not a usable key.',
  'app.err.lic.handOnNotReady': 'The hand-on is not ready to complete.',
  'app.err.lic.evidenceTooLarge': 'That file is over 50 MB. Attach a report for just this period.',
  'app.err.lic.fileEmpty': 'That file is empty.',
  'app.err.lic.notIssuedByTx': 'That transaction did not issue this license.',
  'app.err.lic.notLiveByTx': 'That transaction did not make this license live.',
  'app.err.lend.needWords': 'A claim needs words for the loan.',
  'app.err.lend.needName': 'Give the name holders will see.',
  'app.err.lend.noIdentity': 'No lender identity in this browser.',
  'app.err.lend.notRecordKey': 'That is not a record’s on-chain key.',
  'app.err.lend.notOwnIdentity': 'A claim can’t be on your own identity.',
  'app.err.lend.wordsTooLong': 'Keep the words for the loan under 200 characters.',

  // Records, imports, documents and keys.
  'app.err.rec.importTooLarge': 'That file is larger than 20 MB. Nothing was imported.',
  'app.err.rec.notExport': 'That file is not a VeilCore records export. Nothing was imported.',
  'app.err.rec.notExportShort': 'That file is not a VeilCore records export.',
  'app.err.rec.unreadableEntries': 'That file has {count} entries this version cannot read. Nothing was imported.',
  'app.err.rec.deviceOnlyImport': '{id}: only a document can be kept on this device only. Nothing was imported.',
  'app.err.rec.codeMismatch': '{id}: its proof code does not match its fields. Nothing was imported.',
  'app.err.rec.noNonce': '{id}: it has a proof code but no nonce, so it cannot be checked. Nothing was imported.',
  'app.err.rec.exportMismatch':
    '{id}: its proof code does not match its stored fields, so an export could not be tied to what the registry holds. Nothing was exported.',
  'app.err.rec.fileTooLarge': '{file} is larger than 200 MB, so it was not read. Nothing was sent or saved.',
  'app.err.rec.strainCantSeal': "This strain record can't be sealed: {problems}.",
  'app.err.rec.animalCantSeal': "This animal record can't be sealed: {problems}.",
  'app.err.rec.docCantSeal': "This document record can't be sealed: {problems}.",
  'app.err.rec.docCantShare': "This document record can't be shared: {problems}.",
  'app.err.rec.chainTooLarge': 'This chain is too large for one link. Send each record’s own link instead.',
  'app.err.rec.aboutItself': 'A record can’t be about itself.',
  'app.err.keys.notKeysFile': 'That is not a VeilCore record-keys file.',
  'app.err.keys.damaged': 'That file is damaged: the keys in it are not readable.',
  'app.err.keys.differentKeys': 'This browser already holds different keys for that record. Nothing was changed.',
  'app.err.keys.noVault': 'This browser has no vault key.',
  'app.err.keys.holderKey': 'A holder key is 64 hexadecimal characters.',
  'app.err.keys.proofCode': 'A proof code is 64 hex characters.',
  'app.err.sheet.noSheet': 'That spreadsheet has no sheet in it.',
  'app.err.sheet.wrongKind': 'That kind of spreadsheet isn’t read here. Save it as Excel (.xlsx) or CSV and pick that.',
  'app.err.sheet.notXlsx':
    "That file couldn't be opened as an Excel (.xlsx) file. Save it as .xlsx or CSV and try again.",
  'app.err.sheet.tooLarge': 'That spreadsheet is too large to read here. Save it with fewer rows and try again.',
  'app.err.sheet.fileTooLarge': 'That file is larger than {mb} MB. Import up to {rows} rows at a time.',
};
