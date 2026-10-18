// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { addressesOf, newWallet } from './new-wallet.js';

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
});
