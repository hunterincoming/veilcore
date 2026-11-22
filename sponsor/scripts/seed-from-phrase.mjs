// npm run seed-from-phrase -w sponsor [-- preprod] [-- --to-file <path>]
//
// For a wallet made in a wallet app (1AM) ONLY for the sponsor. Asks for its 24 words without
// showing them, turns them into the wallet's seed exactly as the operator tool does
// (BIP-39, then the Midnight HD wallet: bboard-cli midnight-wallet-provider.ts), prints the
// wallet's addresses so you can check them against the app, and puts the seed on the
// clipboard for Railway's SPONSOR_SEED. Nothing is saved and nothing is sent anywhere.
//
// The addresses are for mainnet unless you add `preprod` (a test-network wallet). The clipboard
// is pbcopy on a Mac, wl-copy or xclip on Linux. With none of them (a server, Windows), add
// `--to-file <path>`: the seed is written there, readable by you only, and nothing else is
// saved. Delete the file once the seed is in your host's secret settings.
// Never use this with the 1AM wallet that deployed the contract.
// SPDX-License-Identifier: Apache-2.0

import { execFileSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { mnemonicToSeedSync, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { addressesOf } from '../dist/new-wallet.js';

const args = process.argv.slice(2);
const network = args.includes('preprod') ? 'preprod' : 'mainnet';
const fileAt = args.indexOf('--to-file');
const toFile = fileAt >= 0 ? args[fileAt + 1] : undefined;
if (fileAt >= 0 && !toFile) {
  console.error('\n--to-file needs a path, e.g. --to-file ./sponsor-seed.txt\n');
  process.exit(1);
}
if (toFile && existsSync(toFile)) {
  console.error(`\n${toFile} already exists. Choose a new path; nothing was written.\n`);
  process.exit(1);
}

/** Puts the seed on the clipboard; the clearing command, or undefined when no clipboard tool works. */
const toClipboard = (text) => {
  for (const [cmd, a, clear] of [
    ['pbcopy', [], 'pbcopy < /dev/null'],
    ['wl-copy', [], 'wl-copy --clear'],
    ['xclip', ['-selection', 'clipboard'], 'printf "" | xclip -selection clipboard'],
  ]) {
    try {
      execFileSync(cmd, a, { input: text, stdio: ['pipe', 'ignore', 'ignore'] });
      return clear;
    } catch {
      /* not here; try the next */
    }
  }
  return undefined;
};

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
const { unshielded, dust } = addressesOf(seed, network);
let where;
if (toFile) {
  writeFileSync(toFile, `${seed}\n`, { mode: 0o600, flag: 'wx' });
  where = `The seed is in ${toFile} (readable by you only; not shown). Put it in your host's secret settings as SPONSOR_SEED, then delete the file.`;
} else {
  const clear = toClipboard(seed);
  if (!clear) {
    console.error('\nNo clipboard tool here (pbcopy, wl-copy or xclip). Nothing was saved. Run this again with --to-file <path>.\n');
    process.exit(1);
  }
  where = `The seed is now on your clipboard (not shown). Paste it into your host's secret settings as SPONSOR_SEED.\nThen clear the clipboard: ${clear}`;
}
console.log(`
Check these ${network} addresses against the new wallet in the app. They must match exactly:

   ADDRESS:  ${unshielded}
   DUST:     ${dust}

${where}
`);
