// Lab results: locked to one plant, opened only with that plant's secret, and the lock
// travels in the lab code rather than through the registry.
import { describe, expect, it } from 'vitest';
import { x25519 } from '@noble/curves/ed25519.js';
import { bech32 } from '@scure/base';
import {
  RECIPIENT,
  RESULT_CAP,
  RESULT_ROWS_CAP,
  lockReport,
  openReport,
  reportFingerprint,
  resultIdentityFor,
  resultRecipientFor,
  liveResults,
  resultState,
  sendRefusal,
  sentRowWords,
  type ResultSummary,
} from './lab-results';
import { parseShareCode, quantityPhrase, shareCodeFor } from './transfers';
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

  it('is one lock per delivery: another delivery of the same plant can’t open it, older per-plant codes still open', async () => {
    const one = await resultRecipientFor(SECRET, 'TR-0A1B2C3D');
    const two = await resultRecipientFor(SECRET, 'TR-99999999');
    expect(one).toMatch(RECIPIENT);
    expect(new Set([one, two, await resultRecipientFor(SECRET)]).size).toBe(3);
    // The label is the documented one: HKDF info "veilcore:v1:lab-results:x25519:<transferId>".
    expect(resultIdentityFor(SECRET, 'tr-0a1b2c3d')).toBe(resultIdentityFor(SECRET, 'TR-0A1B2C3D'));

    const locked = await lockReport(report, one);
    expect(await openReport(locked, SECRET, 'TR-0A1B2C3D')).toEqual(report);
    // Opened as a different delivery, or as the plant without the delivery: refused.
    await expect(openReport(locked, SECRET, 'TR-99999999')).rejects.toThrow(/not locked for this plant/);
    await expect(openReport(locked, SECRET)).rejects.toThrow(/not locked for this plant/);
    await expect(openReport(locked, OTHER, 'TR-0A1B2C3D')).rejects.toThrow(/not locked for this plant/);

    // A code made before per-delivery locks carries the per-plant lock: still opens.
    const older = await lockReport(report, await resultRecipientFor(SECRET));
    expect(await openReport(older, SECRET, 'TR-0A1B2C3D')).toEqual(report);
  });

  it('refuses to lock without a lock', async () => {
    await expect(lockReport(report, 'age1nope')).rejects.toThrow(/no lock/);
  });
});

describe('the lab code carries the lock', () => {
  it('round-trips, stays one pasteable code, and old codes still read', async () => {
    const lock = await resultRecipientFor(SECRET);
    const claim = '9f8e7d6c'.repeat(4); // the registry's claim code: 16 random bytes, hex
    const code = shareCodeFor('TR-0A1B2C3D', claim, lock);
    expect(code).toBe(`TR-0A1B2C3D.${claim}.${lock}`);
    expect(parseShareCode(code)).toEqual({ transferId: 'TR-0A1B2C3D', claimCode: claim, resultLock: lock });
    expect(recognise(code)).toEqual({ kind: 'delivery', code });
    expect(parseShareCode('TR-0A1B2C3D.9f8e7d6c')).toEqual({ transferId: 'TR-0A1B2C3D', claimCode: '9f8e7d6c' });
    expect(parseShareCode('TR-0A1B2C3D.9f8e7d6c.age1junk').resultLock).toBeUndefined();
    expect(shareCodeFor('TR-0A1B2C3D', undefined, lock)).toBe('TR-0A1B2C3D');
  });
});

const r = (id: string, extra: Partial<ResultSummary> = {}): ResultSummary => ({
  id,
  size: 100,
  sha256: 'c'.repeat(64),
  createdAt: 1,
  ...extra,
});

describe('a lab report’s state, as the breeder and the lab see it', () => {
  it('is live, withdrawn by the lab, or replaced by a corrected file', () => {
    const list = [
      r('LR-A', { attestationId: 'att_a' }),
      r('LR-B', { withdrawnAt: 5 }),
      r('LR-C', { replaces: 'LR-A' }),
    ];
    expect(resultState(list[0], list)).toBe('replaced');
    expect(resultState(list[1], list)).toBe('withdrawn');
    expect(resultState(list[2], list)).toBe('live');
    // Withdrawing a correction doesn't bring the old report back (round 3): the lab withdrew
    // its signature on the old one as replaced, and its file with it.
    const undone = [r('LR-A', { withdrawnAt: 4 }), r('LR-C', { replaces: 'LR-A', withdrawnAt: 9 })];
    expect(resultState(undone[0], undone)).toBe('replaced');
    expect(resultState(undone[1], undone)).toBe('withdrawn');
    expect(liveResults(undone)).toEqual([]);
    // Even from an older registry that left the old file in place.
    const kept = [r('LR-A'), r('LR-C', { replaces: 'LR-A', withdrawnAt: 9 })];
    expect(resultState(kept[0], kept)).toBe('replaced');
    expect(sendRefusal('d'.repeat(64), kept, new Map(), 'LR-A')).toMatch(/already been withdrawn or replaced/);
  });

  it('“N sent” counts only reports that still stand', () => {
    const list = [r('LR-A'), r('LR-B', { withdrawnAt: 5 }), r('LR-C', { replaces: 'LR-A' })];
    expect(liveResults(list).map((x) => x.id)).toEqual(['LR-C']);
  });

  it('the lab’s own list never calls a report it signed and withdrew or replaced “not signed”', () => {
    const mine = { signed: new Map([['att_c', 'e'.repeat(64)]]), retracted: new Set(['att_a', 'att_b']) };
    const list = [
      r('LR-A', { attestationId: 'att_a', withdrawnAt: 4 }),
      r('LR-B', { attestationId: 'att_b', withdrawnAt: 6 }),
      r('LR-C', { attestationId: 'att_c', replaces: 'LR-A' }),
    ];
    const words = list.map((x) => sentRowWords(resultState(x, list), x, mine));
    expect(words[0]).toBe('Replaced by your corrected file.');
    expect(words[1]).toMatch(/^Withdrawn on /);
    expect(words[2]).toMatch(/^Signed by your key/);
    for (const w of words) expect(w).not.toMatch(/Not signed/);
    // Signature withdrawn but the file not (a withdrawal cut short): it says what's left to do.
    const half = r('LR-D', { attestationId: 'att_a' });
    expect(sentRowWords('live', half, mine)).toMatch(/still with the registry/);
    // Signed by some other key: only then "not signed by the key in this browser".
    expect(sentRowWords('live', r('LR-E', { attestationId: 'att_zz' }), mine)).toMatch(/Not signed by the key/);
  });
});

describe('checked before the lab signs anything', () => {
  const sha = 'd'.repeat(64);
  it('refuses the same file twice, a full delivery, and correcting one that is gone', () => {
    const signed = new Map([['att_a', sha]]);
    expect(sendRefusal(sha, [r('LR-A', { attestationId: 'att_a' })], signed)).toMatch(/already sent this exact file/);
    // The same file again is fine once the first was withdrawn.
    expect(sendRefusal(sha, [r('LR-A', { attestationId: 'att_a', withdrawnAt: 2 })], signed)).toBeNull();
    const full = Array.from({ length: RESULT_CAP }, (_, i) => r(`LR-${i}`));
    expect(sendRefusal(sha, full, new Map())).toMatch(/most it can take/);
    // Withdrawn ones don't count toward the five, but every row counts toward twenty.
    const withdrawn = Array.from({ length: RESULT_ROWS_CAP }, (_, i) => r(`LR-${i}`, { withdrawnAt: 3 }));
    expect(sendRefusal(sha, withdrawn.slice(0, 6), new Map())).toBeNull();
    expect(sendRefusal(sha, withdrawn, new Map())).toMatch(/new lab code/);
    expect(sendRefusal(sha, [r('LR-A', { withdrawnAt: 2 })], new Map(), 'LR-A')).toMatch(/already been withdrawn/);
    expect(sendRefusal(sha, [r('LR-A')], new Map(), 'LR-A')).toBeNull();
    expect(sendRefusal('e'.repeat(64), [r('LR-A', { attestationId: 'att_a' })], signed)).toBeNull();
  });
});

describe('the quantity, as the breeder wrote it', () => {
  it('reads “1 cuttings” as “1 cutting” and leaves anything else alone', () => {
    expect(quantityPhrase('1 cuttings')).toBe('1 cutting');
    expect(quantityPhrase('one seeds')).toBe('one seed');
    expect(quantityPhrase('10 cuttings')).toBe('10 cuttings');
    expect(quantityPhrase('1 glass')).toBe('1 glass');
    expect(quantityPhrase('1 tube of tissue')).toBe('1 tube of tissue');
    expect(quantityPhrase('  ')).toBeUndefined();
  });
});
