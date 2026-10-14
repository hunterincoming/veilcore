// Lab results: locked to one plant, opened only with that plant's secret, and the lock
// travels in the delivery code rather than through the registry.
import { describe, expect, it } from 'vitest';
import { x25519 } from '@noble/curves/ed25519.js';
import { bech32 } from '@scure/base';
import {
  RECIPIENT,
  lockReport,
  openReport,
  reportFingerprint,
  resultIdentityFor,
  resultRecipientFor,
} from './lab-results';
import { parseShareCode, shareCodeFor } from './transfers';
import { recognise } from './paste';

const SECRET = '3f'.repeat(32);
const OTHER = '40'.repeat(32);
const report = new TextEncoder().encode('%PDF-1.7 a lab report, markers A12 B7 C33');

describe('the plant’s lock', () => {
  it('is the same every time for a plant, different between plants, and a standard age key', async () => {
    expect(resultIdentityFor(SECRET)).toBe(resultIdentityFor(SECRET));
    expect(resultIdentityFor(SECRET)).not.toBe(resultIdentityFor(OTHER));
    expect(resultIdentityFor(SECRET)).toMatch(/^AGE-SECRET-KEY-1[02-9AC-HJ-NP-Z]{58}$/);
    const recipient = await resultRecipientFor(SECRET);
    expect(recipient).toMatch(RECIPIENT);
    // The recipient is plain X25519 of the identity's scalar: what any age tool computes.
    const scalar = bech32.decodeToBytes(resultIdentityFor(SECRET).toLowerCase()).bytes;
    expect(recipient).toBe(bech32.encodeFromBytes('age', x25519.getPublicKey(scalar)));
  });

  it('opens only with the plant’s secret, and gives back the exact bytes', async () => {
    const locked = await lockReport(report, await resultRecipientFor(SECRET));
    expect(new TextDecoder().decode(locked.slice(0, 22))).toBe('age-encryption.org/v1\n');
    expect(new TextDecoder().decode(locked)).not.toContain('markers');
    expect(await openReport(locked, SECRET)).toEqual(report);
    await expect(openReport(locked, OTHER)).rejects.toThrow(/not locked for this plant/);
    expect(reportFingerprint(report)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('refuses to lock without a lock', async () => {
    await expect(lockReport(report, 'age1nope')).rejects.toThrow(/no lock/);
  });
});

describe('the delivery code carries the lock', () => {
  it('round-trips, stays one pasteable code, and old codes still read', async () => {
    const lock = await resultRecipientFor(SECRET);
    const code = shareCodeFor('TR-0A1B2C3D', '9f8e7d6c', lock);
    expect(code).toBe(`TR-0A1B2C3D.9f8e7d6c.${lock}`);
    expect(parseShareCode(code)).toEqual({ transferId: 'TR-0A1B2C3D', claimCode: '9f8e7d6c', resultLock: lock });
    expect(recognise(code)).toEqual({ kind: 'delivery', code });
    expect(parseShareCode('TR-0A1B2C3D.9f8e7d6c')).toEqual({ transferId: 'TR-0A1B2C3D', claimCode: '9f8e7d6c' });
    expect(parseShareCode('TR-0A1B2C3D.9f8e7d6c.age1junk').resultLock).toBeUndefined();
    expect(shareCodeFor('TR-0A1B2C3D', undefined, lock)).toBe('TR-0A1B2C3D');
  });
});
