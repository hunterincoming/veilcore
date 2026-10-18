// Makes a brand-new wallet for the mainnet sponsor and prints its seed and addresses.
// Run on your own computer: npm run new-wallet -w sponsor
// Nothing is sent anywhere and nothing is saved: the seed is printed once, here.
// SPDX-License-Identifier: Apache-2.0

import { randomBytes } from 'node:crypto';
import { DustSecretKey } from '@midnight-ntwrk/ledger-v8';
import { createKeystore, DustAddress } from '@midnight-ntwrk/wallet-sdk';
import { deriveRoleSeeds } from './wallet.js';

export type NewWallet = { readonly seed: string; readonly unshielded: string; readonly dust: string };

/** The addresses a seed has on a network: the same derivation the sponsor uses (wallet.ts). */
export const addressesOf = (seed: string, network: string): Omit<NewWallet, 'seed'> => {
  const s = deriveRoleSeeds(seed);
  return {
    unshielded: createKeystore(s.unshielded, network as never).getBech32Address().asString(),
    dust: DustAddress.encodePublicKey(network as never, DustSecretKey.fromSeed(s.dust).publicKey),
  };
};

export const newWallet = (network = 'mainnet'): NewWallet => {
  const seed = randomBytes(32).toString('hex');
  return { seed, ...addressesOf(seed, network) };
};

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const w = newWallet(process.argv[2] ?? 'mainnet');
  console.log(`
A new sponsor wallet (${process.argv[2] ?? 'mainnet'}). Shown once; nothing was saved.

1. Save this SEED in Apple Passwords as "VeilCore sponsor seed (mainnet)".
   It goes only into Railway (SPONSOR_SEED). Never into chat, email or a file.

   SEED:  ${w.seed}

2. The DUST address. Your NIGHT gets designated to this one (in Lace):

   DUST:  ${w.dust}

3. Its other address (for your notes; nothing needs sending to it):

   ADDRESS:  ${w.unshielded}

Now clear this window: press Command+K.
`);
}
