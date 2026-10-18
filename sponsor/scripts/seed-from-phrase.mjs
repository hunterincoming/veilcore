// npm run seed-from-phrase -w sponsor
//
// For a wallet made in a wallet app (1AM) ONLY for the sponsor. Asks for its 24 words without
// showing them, turns them into the wallet's seed exactly as the operator tool does
// (BIP-39, then the Midnight HD wallet: bboard-cli midnight-wallet-provider.ts), prints the
// wallet's addresses so you can check them against the app, and puts the seed on the
// clipboard for Railway's SPONSOR_SEED. Nothing is saved and nothing is sent anywhere.
// Never use this with the 1AM wallet that deployed the contract.
// SPDX-License-Identifier: Apache-2.0

import { execFileSync } from 'node:child_process';
import { createInterface } from 'node:readline';
import { mnemonicToSeedSync, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { addressesOf } from '../dist/new-wallet.js';

const askHidden = (question) =>
  new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => {
      if (s.includes(question)) process.stdout.write(s);
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
  });

const phrase = (await askHidden('Paste the NEW wallet’s 24 words (nothing will show), then press Enter: '))
  .trim()
  .toLowerCase()
  .split(/\s+/)
  .join(' ');
if (!validateMnemonic(phrase, wordlist)) {
  console.error('\nThat is not a valid recovery phrase. Check the words and run this again.\n');
  process.exit(1);
}
const seed = Buffer.from(mnemonicToSeedSync(phrase)).toString('hex');
const { unshielded, dust } = addressesOf(seed, 'mainnet');
execFileSync('pbcopy', { input: seed });
console.log(`
Check these against the new wallet in the app. They must match exactly:

   ADDRESS:  ${unshielded}
   DUST:     ${dust}

The seed is now on your clipboard (not shown). Paste it into Railway as SPONSOR_SEED.
Then clear the clipboard: pbcopy < /dev/null
`);
