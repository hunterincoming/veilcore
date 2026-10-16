// What a network call says it is doing (veilcore/chain/*.ts progress), in the visitor's
// language. The chain code words its steps in English; each one it can say is matched here.
// Anything else is shown as it came.
// SPDX-License-Identifier: Apache-2.0

import { enT, type Translator } from '../../i18n/translate';
import type { AppKey } from '../../i18n/app/en';

const KNOWN: [string, AppKey][] = [
  ['Reading the contract from the network…', 'app.chain.progress.reading'],
  ['Checking this site’s proving files against the contract…', 'app.chain.progress.checkingFiles'],
  ['Preparing the transaction on your device…', 'app.chain.progress.preparing'],
  ['Proving on your device. This can take a minute on a phone…', 'app.chain.progress.provingPhone'],
  ['Waiting for the network to include it (usually under a minute)…', 'app.chain.progress.waiting'],
  ['Proving on your device…', 'app.chain.progress.proving'],
  ['Doing a little work to show this is a person, not a script…', 'app.chain.progress.work'],
  ['Sending it to VeilCore, which pays the network fee…', 'app.chain.progress.sending'],
  ['Downloading the proving keys (first time only)…', 'app.chain.progress.keys'],
  ['Downloading the public parameters (first time only)…', 'app.chain.progress.params'],
  ['Sending the answer back…', 'app.chain.progress.answer'],
  ['Reading the answer from the network…', 'app.chain.progress.readingAnswer'],
];

export const progressWords = (message: string | undefined, tr: Translator = enT): string | undefined => {
  if (message === undefined) return undefined;
  const known = KNOWN.find(([m]) => m === message);
  return known ? tr.t(known[1]) : message;
};
