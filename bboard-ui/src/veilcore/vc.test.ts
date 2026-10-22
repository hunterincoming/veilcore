// W3C Verifiable Credentials (vc.ts) against the W3C's own eddsa-jcs-2022 test vectors
// (fixtures/w3c-eddsa-jcs-2022, from github.com/w3c/vc-di-eddsa): same canonical bytes, same
// hash, same signature, byte for byte.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { base58 } from '@scure/base';
import { sha256 } from '@noble/hashes/sha2.js';
import { ed25519 } from '@noble/curves/ed25519.js';
import { didKeyOf, jcs, publicOfDidKey, signCredential, verifyCredential } from './vc';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures/w3c-eddsa-jcs-2022');
const read = (f: string) => fs.readFileSync(path.join(dir, f), 'utf8');
const json = (f: string) => JSON.parse(read(f)) as Record<string, unknown>;
const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

const keyPair = json('keyPair.json') as { publicKeyMultibase: string; privateKeyMultibase: string };
// Multikey: 0x8026 then the 32-byte Ed25519 secret.
const priv = base58.decode(keyPair.privateKeyMultibase.slice(1));
const secretHex = hex(priv.slice(2));

describe('eddsa-jcs-2022, the W3C test vectors', () => {
  it('the key pair: our did:key is theirs', () => {
    expect([priv[0], priv[1]]).toEqual([0x80, 0x26]);
    const pub = hex(ed25519.getPublicKey(priv.slice(2)));
    expect(didKeyOf(pub)).toBe(`did:key:${keyPair.publicKeyMultibase}`);
    expect(publicOfDidKey(`did:key:${keyPair.publicKeyMultibase}`)).toBe(pub);
  });

  it('JCS gives the canonical document and proof configuration', () => {
    expect(jcs(json('unsigned.json'))).toBe(read('canonDocJCS.txt').trim());
    const config: Record<string, unknown> = { ...(json('signedJCS.json').proof as Record<string, unknown>) };
    delete config.proofValue;
    expect(jcs(config)).toBe(read('proofCanonJCS.txt').trim());
    const combined = hex(
      new Uint8Array([
        ...sha256(new TextEncoder().encode(jcs(config))),
        ...sha256(new TextEncoder().encode(jcs(json('unsigned.json')))),
      ]),
    );
    expect(combined).toBe(read('combinedHashJCS.txt').trim());
  });

  it('signing the unsigned credential gives the W3C’s signed credential exactly', () => {
    const signed = signCredential(json('unsigned.json'), secretHex, '2023-02-24T23:36:38Z');
    expect(jcs(signed)).toBe(jcs(json('signedJCS.json')));
  });

  it('the W3C’s signed credential verifies; any change to it does not', () => {
    const signed = json('signedJCS.json');
    const v = verifyCredential(signed);
    expect(v.verified).toBe(true);
    expect(verifyCredential({ ...signed, name: 'Changed' }).verified).toBe(false);
    const proof = signed.proof as Record<string, unknown>;
    expect(verifyCredential({ ...signed, proof: { ...proof, created: '2024-01-01T00:00:00Z' } }).verified).toBe(false);
    // A signature from another key, under the same verification method: refused.
    const other = signCredential(json('unsigned.json'), hex(ed25519.utils.randomSecretKey()), '2023-02-24T23:36:38Z');
    expect(
      verifyCredential({
        ...signed,
        proof: { ...proof, proofValue: (other.proof as { proofValue: string }).proofValue },
      }).verified,
    ).toBe(false);
    expect(verifyCredential({ ...signed, proof: { ...proof, proofPurpose: 'authentication' } }).verified).toBe(false);
    expect(
      verifyCredential({ ...signed, proof: { ...proof, verificationMethod: `${String(proof.verificationMethod)}#x` } })
        .verified,
    ).toBe(false);
    // The proof's @context must lead the document's.
    expect(verifyCredential({ ...signed, '@context': ['https://www.w3.org/ns/credentials/v2'] }).verified).toBe(false);
  });

  it('JCS sorts by UTF-16 code units and refuses what JSON can’t hold', () => {
    // RFC 8785 section 3.2.3's ordering example, in part.
    expect(jcs({ '\u20ac': 1, '\r': 2, '\ud83d\ude00': 3, '1': 4, '\u0080': 5 })).toBe(
      '{"\\r":2,"1":4,"\u0080":5,"\u20ac":1,"\ud83d\ude00":3}',
    );
    expect(jcs({ b: [1, 'x', null, true], a: { d: 1e21, c: 0.5 } })).toBe(
      '{"a":{"c":0.5,"d":1e+21},"b":[1,"x",null,true]}',
    );
    expect(() => jcs({ a: Number.NaN })).toThrow();
    expect(() => jcs({ a: '\ud800' })).toThrow('lone surrogate');
    expect(() => jcs({ '\udc00': 1 })).toThrow('lone surrogate');
  });
});
