// Round 5 (CONTRACT.md #28, #29): what a check link carries after the #, which no server
// receives: the record's name (`n`, base64url of UTF-8) and its DNA pairing salt (`ds`).
// And what a grant publishes: the name only when the holder chooses it, and a saved DNA
// report only as a code bound with the record's own salt.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { NAME_PARAM, linkParam, nameFromLink, nameParam, verifyPath } from './verify-link';
import { DNA_SALT_PARAM, dnaBindingOf, dnaLinkParams, dnaLinkValues, matchesBinding, withPairSalt } from './dna-link';
import { dnaPairBinding } from './chain/pairing';
import { createHash } from 'node:crypto';

/** A pairing fingerprint as the contract commits to a report: H("veilcore:v1:commit", SHA-256). */
const fingerprintPairing = (sha: string): string => {
  const t = Buffer.alloc(32);
  t.write('veilcore:v1:commit', 'utf8');
  return createHash('sha256')
    .update(Buffer.concat([t, Buffer.from(sha, 'hex')]))
    .digest('hex');
};

const FP = 'ab'.repeat(32);

describe('the name in a check link', () => {
  it('goes after the #, and comes back exactly, in any script', () => {
    for (const name of ['Blue Dream', 'Ébène №5 🌱', '早生みどり', 'a&b=c#d?e/f']) {
      const path = verifyPath('VEIL-1', FP, nameParam(name));
      const [beforeHash, hash] = path.split('#');
      expect(beforeHash).toBe(`/verify/VEIL-1?fp=${FP}`);
      expect(beforeHash).not.toContain(NAME_PARAM + '=');
      expect(hash).toMatch(new RegExp(`^${NAME_PARAM}=[A-Za-z0-9_-]+$`));
      expect(nameFromLink(`#${hash}`)).toBe(name);
    }
  });
  it('an empty name adds nothing; a damaged one reads as no name', () => {
    expect(nameParam('   ')).toEqual({});
    expect(verifyPath('VEIL-1', FP, nameParam(''))).toBe(`/verify/VEIL-1?fp=${FP}`);
    for (const h of ['', '#', `#${NAME_PARAM}=`, `#${NAME_PARAM}=@@@`, `#${NAME_PARAM}=_w`])
      expect(nameFromLink(h)).toBeNull();
    // A name given as a link value always goes after the #.
    expect(verifyPath('VEIL-1', FP, { [NAME_PARAM]: 'eA' })).toBe(`/verify/VEIL-1?fp=${FP}#${NAME_PARAM}=eA`);
  });
  it('the salt goes after the # too, and is read only from there', () => {
    const path = verifyPath('VEIL-1', FP, { ...nameParam('P'), [DNA_SALT_PARAM]: 'cd'.repeat(32) });
    expect(path.split('#')[0]).not.toContain(DNA_SALT_PARAM);
    const [search, hash] = [path.split('#')[0].split('?')[1], path.split('#')[1]];
    expect(linkParam(DNA_SALT_PARAM, `?${search}`, `#${hash}`)).toBe('cd'.repeat(32));
  });
});

describe('a saved DNA report, bound', () => {
  const SHA = '5a'.repeat(32);
  type Rec = {
    id: string;
    recordFingerprint: string;
    dnaFingerprint?: string;
    dnaFileSha256?: string;
    dnaPairSalt?: string;
  };
  const base: Rec = {
    id: 'VEIL-1',
    recordFingerprint: FP,
    dnaFingerprint: fingerprintPairing(SHA),
    dnaFileSha256: SHA,
  };

  it('a record with a report gets its own salt once, kept for good', () => {
    const r = withPairSalt(base);
    expect(r.dnaPairSalt).toMatch(/^[0-9a-f]{64}$/);
    expect(withPairSalt(r)).toBe(r);
    expect(withPairSalt<Rec>({ id: 'VEIL-2', recordFingerprint: FP })).toEqual({ id: 'VEIL-2', recordFingerprint: FP });
    expect(withPairSalt(base).dnaPairSalt).not.toBe(r.dnaPairSalt);
  });

  it('the binding names the file, the record’s proof code and the salt; only the salt goes in the link', () => {
    const r = withPairSalt(base);
    const b = dnaBindingOf(r)!;
    expect(b).toBe(dnaPairBinding(SHA, FP, r.dnaPairSalt));
    expect(b).not.toContain(SHA);
    expect(dnaLinkParams(r)).toEqual({ [DNA_SALT_PARAM]: r.dnaPairSalt });
    expect(dnaLinkParams(base)).toEqual({});
    const v = dnaLinkValues(r.dnaPairSalt, FP)!;
    expect(matchesBinding(b, SHA, v.identity, v.salt)).toBe('file');
    expect(matchesBinding(b, '5b'.repeat(32), v.identity, v.salt)).toBe(false);
    expect(matchesBinding(b, SHA, 'cd'.repeat(32), v.salt)).toBe(false);
    expect(matchesBinding(b, SHA, v.identity, 'ef'.repeat(32))).toBe(false);
    expect(dnaLinkValues(null, FP)).toBeNull();
    expect(dnaLinkValues(r.dnaPairSalt, null)).toBeNull();
  });

  it('an older pairing without the file’s SHA-256 is bound over its pairing fingerprint, and still checks', () => {
    const older = withPairSalt<Rec>({ id: 'VEIL-3', recordFingerprint: FP, dnaFingerprint: fingerprintPairing(SHA) });
    const b = dnaBindingOf(older)!;
    expect(matchesBinding(b, SHA, FP, older.dnaPairSalt, fingerprintPairing)).toBe('pairing');
    expect(matchesBinding(b, SHA, FP, older.dnaPairSalt)).toBe(false);
  });
});
