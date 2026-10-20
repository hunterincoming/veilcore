// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { mnemonicToSeedSync } from '@scure/bip39';
import { WalletSeeds } from '@midnight-ntwrk/testkit-js';
import { addressesOf, newWallet } from './new-wallet.js';
import { deriveRoleSeeds } from './wallet.js';
import { loadConfig } from './config.js';

describe('new sponsor wallet', () => {
  it('makes a fresh 32-byte seed each time, with mainnet addresses', () => {
    const a = newWallet();
    const b = newWallet();
    expect(a.seed).toMatch(/^[0-9a-f]{64}$/);
    expect(a.seed).not.toBe(b.seed);
    expect(a.dust).toMatch(/^mn_dust1/);
    expect(a.unshielded).toMatch(/^mn_addr1/);
  });

  it('gives the addresses the sponsor itself will report for that seed', () => {
    const seed = 'ab'.repeat(32);
    expect(addressesOf(seed, 'mainnet')).toEqual(addressesOf(seed, 'mainnet'));
    expect(addressesOf(seed, 'preprod').dust).toMatch(/^mn_dust_preprod1/);
  });

  it('a 24-word phrase gives the same wallet the operator tool restores (seed-from-phrase)', () => {
    // testkit's public test phrase, never a real wallet's.
    const phrase = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art';
    const seed = Buffer.from(mnemonicToSeedSync(phrase)).toString('hex');
    expect(seed).toHaveLength(128);
    const tool = WalletSeeds.fromMnemonic(phrase);
    const ours = deriveRoleSeeds(seed);
    expect(Buffer.from(ours.dust).toString('hex')).toBe(Buffer.from(tool.dust).toString('hex'));
    expect(Buffer.from(ours.unshielded).toString('hex')).toBe(Buffer.from(tool.unshielded).toString('hex'));
    expect(addressesOf(seed, 'mainnet').dust).toMatch(/^mn_dust1/);
    // and the sponsor accepts that 128-character seed
    const env = {
      SPONSOR_SEED: seed,
      SPONSOR_FORBIDDEN_ADDRESSES: 'mn_addr1x',
      VEILCORE_CONTRACT_ADDRESS: '9c7b69275e53acc38fcbebff93c53febe46a3898580c11fd2c4b923fc5efb7a3',
      PROOF_SERVER_URL: 'http://p:6300',
      BLOCKFROST_PROJECT_ID: 'preprodTestProjectId123',
    };
    expect(loadConfig(env).seed).toBe(seed);
  });
});
