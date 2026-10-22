// W3C Verifiable Credentials, signed the standard way: Data Integrity with the eddsa-jcs-2022
// cryptosuite (W3C Recommendation, "Data Integrity EdDSA Cryptosuites v1.0"), keys as did:key.
//
// Why this suite: it is plain JSON canonicalised with RFC 8785 (JCS) and signed with Ed25519,
// the same key type every VeilCore deal already uses, so a credential needs no JSON-LD
// processing and no new keys. Any verifier that supports the W3C suite (Digital Bazaar's,
// Spruce's, the EU wallet's) checks it without VeilCore. The tests run the W3C's own test
// vectors through this code and get the W3C's signature byte for byte.
//
// Only did:key verification methods are resolved here: the key is in the identifier itself,
// so checking a credential needs nothing fetched from anywhere.
// SPDX-License-Identifier: Apache-2.0

import { ed25519 } from '@noble/curves/ed25519.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { base58 } from '@scure/base';

const utf8 = (s: string): Uint8Array => new TextEncoder().encode(s);
const hex = (b: Uint8Array): string => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
const fromHex = (h: string): Uint8Array => Uint8Array.from(h.match(/../g) ?? [], (b) => parseInt(b, 16));

/**
 * RFC 8785 JSON Canonicalization Scheme: object keys sorted by UTF-16 code units, no
 * whitespace, strings and numbers as ECMAScript's JSON.stringify writes them (which is what
 * RFC 8785 adopts). Refuses what JSON can't hold.
 */
export const jcs = (v: unknown): string => {
  if (v === null || typeof v === 'boolean' || typeof v === 'string') return JSON.stringify(v);
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) throw new Error('JCS: numbers must be finite');
    return JSON.stringify(v);
  }
  if (Array.isArray(v)) return `[${v.map(jcs).join(',')}]`;
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    const keys = Object.keys(o)
      .filter((k) => o[k] !== undefined)
      .sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${jcs(o[k])}`).join(',')}}`;
  }
  throw new Error(`JCS: can't encode a ${typeof v}`);
};

const ED25519_PUB = [0xed, 0x01];

/** did:key for an Ed25519 public key (hex): multicodec 0xed01, base58-btc multibase. */
export const didKeyOf = (publicHex: string): string => {
  const pub = fromHex(publicHex);
  if (pub.length !== 32) throw new Error('An Ed25519 public key is 32 bytes.');
  return `did:key:z${base58.encode(new Uint8Array([...ED25519_PUB, ...pub]))}`;
};

/** The Ed25519 public key (hex) inside a did:key, or undefined for anything else. */
export const publicOfDidKey = (did: string): string | undefined => {
  const m = /^did:key:z([1-9A-HJ-NP-Za-km-z]+)$/.exec(did);
  if (!m) return undefined;
  try {
    const b = base58.decode(m[1]);
    return b.length === 34 && b[0] === ED25519_PUB[0] && b[1] === ED25519_PUB[1] ? hex(b.slice(2)) : undefined;
  } catch {
    return undefined;
  }
};

/** A did:key's verification method: the DID, then its own key as the fragment. */
export const verificationMethodOf = (did: string): string => `${did}#${did.slice('did:key:'.length)}`;

export type DataIntegrityProof = {
  readonly type: 'DataIntegrityProof';
  readonly cryptosuite: 'eddsa-jcs-2022';
  readonly created?: string;
  readonly verificationMethod: string;
  readonly proofPurpose: string;
  readonly '@context'?: unknown;
  readonly proofValue: string;
};

type Doc = Record<string, unknown>;

/** hashData (section 3.3.4): SHA-256 of the proof configuration, then of the document. */
const hashData = (proofConfig: Doc, unsecured: Doc): Uint8Array =>
  new Uint8Array([...sha256(utf8(jcs(proofConfig))), ...sha256(utf8(jcs(unsecured)))]);

const XSD_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

/**
 * Sign a credential (section 3.3.1). `secretHex` is the Ed25519 secret; the verification method
 * is its own did:key. `created` is an XML Schema dateTime, seconds precision by default.
 */
export const signCredential = <T extends Doc>(
  unsecured: T,
  secretHex: string,
  created: string = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
): T & { proof: DataIntegrityProof } => {
  if ('proof' in unsecured) throw new Error('That document already has a proof.');
  if (!XSD_DATETIME.test(created)) throw new Error('created must be an XML Schema dateTime.');
  const secret = fromHex(secretHex);
  const did = didKeyOf(hex(ed25519.getPublicKey(secret)));
  const config: Doc = {
    type: 'DataIntegrityProof',
    cryptosuite: 'eddsa-jcs-2022',
    created,
    verificationMethod: verificationMethodOf(did),
    proofPurpose: 'assertionMethod',
    ...(unsecured['@context'] !== undefined ? { '@context': unsecured['@context'] } : {}),
  };
  const signature = ed25519.sign(hashData(config, unsecured), secret);
  return { ...unsecured, proof: { ...config, proofValue: `z${base58.encode(signature)}` } as DataIntegrityProof };
};

export type Verified =
  | { readonly verified: true; readonly signer: string; readonly document: Doc }
  | { readonly verified: false; readonly reason: string };

const startsWith = (whole: unknown, prefix: unknown): boolean => {
  const w = Array.isArray(whole) ? whole : [whole];
  const p = Array.isArray(prefix) ? prefix : [prefix];
  return p.length <= w.length && p.every((x, i) => jcs(x) === jcs(w[i]));
};

/**
 * Verify a credential's eddsa-jcs-2022 proof (section 3.3.2) for a did:key verification
 * method. Returns the signer's public key (hex) and the document without its proof.
 */
export const verifyCredential = (secured: unknown): Verified => {
  try {
    if (typeof secured !== 'object' || secured === null || Array.isArray(secured))
      return { verified: false, reason: 'not a JSON object' };
    const { proof, ...rest } = secured as Doc;
    if (typeof proof !== 'object' || proof === null || Array.isArray(proof))
      return { verified: false, reason: 'no single proof' };
    const { proofValue, ...options } = proof as Doc;
    if (options.type !== 'DataIntegrityProof' || options.cryptosuite !== 'eddsa-jcs-2022')
      return { verified: false, reason: 'not an eddsa-jcs-2022 proof' };
    if (options.created !== undefined && (typeof options.created !== 'string' || !XSD_DATETIME.test(options.created)))
      return { verified: false, reason: 'created is not a dateTime' };
    if (typeof proofValue !== 'string' || !proofValue.startsWith('z'))
      return { verified: false, reason: 'proofValue is not base58-btc' };
    const signature = base58.decode(proofValue.slice(1));
    if (signature.length !== 64) return { verified: false, reason: 'proofValue is not a 64-byte signature' };
    const unsecured: Doc = { ...rest };
    if (options['@context'] !== undefined) {
      if (!startsWith(rest['@context'], options['@context']))
        return { verified: false, reason: "the proof's @context doesn't match the document's" };
      unsecured['@context'] = options['@context'];
    }
    const vm = options.verificationMethod;
    if (typeof vm !== 'string') return { verified: false, reason: 'no verificationMethod' };
    const [did, fragment] = vm.split('#');
    const pub = publicOfDidKey(did);
    if (!pub || fragment !== did.slice('did:key:'.length))
      return { verified: false, reason: 'the verification method is not an Ed25519 did:key' };
    const ok = ed25519.verify(signature, hashData(options, unsecured), fromHex(pub), { zip215: false });
    return ok
      ? { verified: true, signer: pub, document: unsecured }
      : { verified: false, reason: 'the signature does not match' };
  } catch {
    return { verified: false, reason: 'unreadable' };
  }
};
