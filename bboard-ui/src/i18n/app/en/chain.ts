// The record app in English: what a failed network call says (log-flow-state.ts
// stampProblem and chainProblem), wherever it is shown. Source text; see log.ts.
// SPDX-License-Identifier: Apache-2.0

export const chain = {
  'app.chain.inAboutMinutes.one': 'in about {count} minute',
  'app.chain.inAboutMinutes.other': 'in about {count} minutes',
  'app.chain.inAFewMinutes': 'in a few minutes',
  'app.chain.txParen': ' (transaction {tx})',
  'app.chain.mayHaveGoneOut':
    "It may already have gone out{tx}. Don't try again until that transaction has been checked on the network.",
  'app.chain.nothingSent': ' Nothing was sent.',
  'app.chain.unreachable': "Couldn't reach the network.{nothingSent} Try again {when}.",
  'app.chain.didntGoThrough': "That didn't go through.{nothingSent} Try again {when}.",
  'app.chain.didntGoThroughBecause': "That didn't go through: {reason}.{nothingSent}",
  'app.chain.details': 'Details',
  'app.chain.stampMayHaveGoneOut':
    "Your date stamp may already have gone out{tx}. Your plant is saved. Don't try again until that transaction has been checked on the network.",
  'app.chain.stampUnreachable':
    "Couldn't reach the network. Your plant is saved. Try again {when}, or do the date stamp later.",
  'app.chain.stampDidntGoThrough':
    "The date stamp didn't go through. Your plant is saved. Try again {when}, or do the date stamp later.",
  // components/chain/progress-words.ts: the chain code's progress lines, word for word.
  'app.chain.progress.reading': 'Reading the contract from the network…',
  'app.chain.progress.checkingFiles': 'Checking this site’s proving files against the contract…',
  'app.chain.progress.preparing': 'Preparing the transaction on your device…',
  'app.chain.progress.provingPhone': 'Proving on your device. This can take a minute on a phone…',
  'app.chain.progress.waiting': 'Waiting for the network to include it (usually under a minute)…',
  'app.chain.progress.proving': 'Proving on your device…',
  'app.chain.progress.work': 'Doing a little work to show this is a person, not a script…',
  'app.chain.progress.sending': 'Sending it to VeilCore, which pays the network fee…',
  'app.chain.progress.keys': 'Downloading the proving keys (first time only)…',
  'app.chain.progress.params': 'Downloading the public parameters (first time only)…',
  'app.chain.progress.answer': 'Sending the answer back…',
  'app.chain.progress.readingAnswer': 'Reading the answer from the network…',
  // components/chain/ChainStatusLine.tsx
  'app.chain.working': 'Working…',
  'app.chain.txLine': '{label}: transaction {tx} · block {block}',
  // components/chain/FamilyOnChain.tsx: a record's parents and offspring on Midnight.
  'app.family.title': 'Family on Midnight',
  'app.family.intro':
    'Parentage both holders agreed to, on chain. It is what lets anyone check a plant’s line, and what carries a parent’s offspring royalty down to its descendants. A confirmed link is public and permanent: it can’t be undone, and royalties the parent’s holder takes on later show on this record’s line too.',
  'app.family.reading': 'Reading the chain…',
  'app.family.parents': 'Parents:',
  'app.family.noneConfirmed': 'none confirmed',
  'app.family.offspring': 'Offspring:',
  'app.family.waitingParent':
    'Waiting for {name} to confirm it is a parent. Its holder sees this on their record’s page.',
  'app.family.theRecord': 'the record {key}',
  'app.family.takeBack': 'Take back',
  'app.family.putOnChain': 'Put “{name}” on Midnight as a parent',
  'app.family.pasteLabel': 'A parent held by someone else: their check link or on-chain key',
  'app.family.nameIt': 'Name it',
  'app.family.namesParent':
    '{who} names this record as a parent. Confirm only if it really came from this plant. Confirming is public and permanent, and anything owed on this plant, now or later, will show on its line.',
  'app.family.confirm': 'Confirm',
  'app.family.confirmQ':
    'Confirm this plant is a parent of {who}? Only confirm a record you know came from it. This is public and permanent: its line, and anything owed on this plant now or later, will show on it.{fixes}',
  'app.family.confirmFixes': ' Once a record has confirmed offspring, its own parents can’t change.',
  'app.family.notConfirmed': 'Not confirmed.',
  'app.family.noParentHere': 'This browser doesn’t hold that parent’s record.',
  'app.family.step1': 'Naming the parent on Midnight (1 of 2)…',
  'app.family.step2': 'Confirming it from the parent (2 of 2)…',
  'app.family.readError': 'Couldn’t read the chain: {error}',
  'app.family.named': '“{name}” (key {key})',
  'app.family.namedKey': 'the record with key {key}',
};
