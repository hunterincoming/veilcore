// Who a receipt confirmation on the sender's record was addressed to (sealed records round 2,
// integration A3). The registry no longer writes `addressedTo` / `attesterHandle`: the name
// comes from the sender's own sealed data (records.ts sentTo); an old row's name is still
// shown until the purge; a tag is never shown as a name.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { attestationAddressee } from './transfers';

const TAG = 'ab'.repeat(32);
const att = (over: Record<string, unknown> = {}) => ({
  type: 'receipt-confirmed',
  attestedAt: Date.UTC(2026, 9, 16),
  transferId: 'TR-0A1B2C3D',
  ...over,
});

describe('attestationAddressee', () => {
  it('a delivery made since round 2: the name from the sender’s sealed record', () => {
    expect(attestationAddressee({ attestation: att(), sentTo: { 'TR-0A1B2C3D': 'Green Lab' } })).toBe('Green Lab');
    // Another delivery's name is not this one's.
    expect(attestationAddressee({ attestation: att(), sentTo: { 'TR-99999999': 'Other Lab' } })).toBeUndefined();
  });

  it('the sealed name wins over what an older claim wrote', () => {
    expect(
      attestationAddressee({ attestation: att({ addressedTo: 'old name' }), sentTo: { 'TR-0A1B2C3D': 'Green Lab' } }),
    ).toBe('Green Lab');
  });

  it('a row written before: addressedTo, then the older attesterHandle', () => {
    expect(attestationAddressee({ attestation: att({ addressedTo: 'bob' }) })).toBe('bob');
    expect(attestationAddressee({ attestation: att({ attesterHandle: 'carol' }) })).toBe('carol');
    expect(attestationAddressee({ attestation: att({ addressedTo: '', attesterHandle: 'carol' }) })).toBe('carol');
  });

  it('a tag is never a name, wherever it is found', () => {
    expect(attestationAddressee({ attestation: att({ addressedTo: TAG }) })).toBeUndefined();
    expect(attestationAddressee({ attestation: att({ attesterHandle: TAG.toUpperCase() }) })).toBeUndefined();
    expect(attestationAddressee({ attestation: att(), sentTo: { 'TR-0A1B2C3D': TAG } })).toBeUndefined();
    expect(attestationAddressee({ attestation: att({ addressedTo: TAG }), sentTo: { 'TR-0A1B2C3D': TAG } })).toBe(
      undefined,
    );
  });

  it('no attestation, or no name anywhere: nothing', () => {
    expect(attestationAddressee({})).toBeUndefined();
    expect(attestationAddressee({ attestation: att() })).toBeUndefined();
    expect(attestationAddressee({ attestation: att({ transferId: undefined }), sentTo: { '': 'x' } })).toBeUndefined();
  });
});
