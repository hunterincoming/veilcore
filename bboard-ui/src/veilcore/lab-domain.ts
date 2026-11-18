// A lab's key on the lab's own website (docs/lab-key-on-website.md, docs/lab-domain-keys.md).
//
// The registry looks at the website (a page can't: the site's connect-src only allows the
// registry, and opening it to every domain would let any injected script send data anywhere).
// What a page can check without VeilCore is the other half: that the key itself named the
// website. The registry serves the key's signature over the claim, and this file checks it.
//
// Also the did:web form of the key (W3C did:web, https://<domain>/.well-known/did.json), so a
// lab that publishes a DID document can list the same key there, and the same publication can
// later carry a did:midnight or a credential without a migration.
//
// SPDX-License-Identifier: Apache-2.0

/** What the key signs to name its website (registry lineage/lab-domain.mjs domainClaimPayload). */
export const domainClaimPayload = (publicKey: string, domain: string, issuedAt: number): string =>
  `veilcore:lab-domain:v1\n${publicKey}\n${domain}\n${issuedAt}`;

const HEX64 = /^[0-9a-f]{64}$/;
const HEX128 = /^[0-9a-f]{128}$/i;
const fromHex = (hex: string): Uint8Array => new Uint8Array((hex.match(/.{1,2}/g) ?? []).map((b) => parseInt(b, 16)));

const cache = new Map<string, Promise<boolean>>();

/**
 * Whether `signature` is `publicKey`'s Ed25519 signature naming `domain` at `issuedAt`. Checked
 * in this browser, so "the key names that website" is not the registry's word. Many signatures
 * by one lab carry the same claim: one check each.
 */
export const domainClaimValid = (publicKey: string, domain: string, claim: unknown): Promise<boolean> => {
  if (typeof claim !== 'object' || claim === null) return Promise.resolve(false);
  const { issuedAt, signature } = claim as { issuedAt?: unknown; signature?: unknown };
  if (!HEX64.test(publicKey) || typeof signature !== 'string' || !HEX128.test(signature)) return Promise.resolve(false);
  if (typeof issuedAt !== 'number' || !Number.isSafeInteger(issuedAt)) return Promise.resolve(false);
  const id = `${publicKey}|${domain}|${issuedAt}|${signature.toLowerCase()}`;
  const hit = cache.get(id);
  if (hit) return hit;
  const p = (async () => {
    try {
      const key = await crypto.subtle.importKey(
        'raw',
        fromHex(publicKey) as unknown as BufferSource,
        { name: 'Ed25519' },
        false,
        ['verify'],
      );
      return await crypto.subtle.verify(
        'Ed25519',
        key,
        fromHex(signature) as unknown as BufferSource,
        new TextEncoder().encode(domainClaimPayload(publicKey, domain, issuedAt)),
      );
    } catch {
      return false;
    }
  })();
  if (cache.size > 500) cache.clear();
  cache.set(id, p);
  return p;
};

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const base58btc = (bytes: Uint8Array): string => {
  let n = 0n;
  for (const b of bytes) n = n * 256n + BigInt(b);
  let out = '';
  while (n > 0n) {
    out = B58[Number(n % 58n)] + out;
    n /= 58n;
  }
  for (const b of bytes) {
    if (b !== 0) break;
    out = '1' + out;
  }
  return out;
};

/** The Ed25519 key as did:key / Multikey writes it: "z" + base58btc(0xed 0x01 + key), "z6Mk…". */
export const ed25519Multibase = (publicKeyHex: string): string =>
  'z' + base58btc(Uint8Array.from([0xed, 0x01, ...fromHex(publicKeyHex)]));

/** The verification method id VeilCore suggests for a lab key in a did:web document. */
export const didKeyId = (domain: string, publicKeyHex: string): string =>
  `did:web:${domain}#veilcore-${publicKeyHex.slice(0, 16)}`;

/** The key as a did:web verification method (Multikey), for a lab that already has a did.json. */
export const didVerificationMethod = (domain: string, publicKeyHex: string) => ({
  id: didKeyId(domain, publicKeyHex),
  type: 'Multikey',
  controller: `did:web:${domain}`,
  publicKeyMultibase: ed25519Multibase(publicKeyHex),
});

/**
 * A whole did.json for https://<domain>/.well-known/did.json listing the key for signing
 * statements (assertionMethod), for a lab without one. The registry reads it as it reads
 * veilcore-lab.json (lineage/lab-domain.mjs readDidDoc).
 */
export const didDocumentFor = (domain: string, publicKeyHex: string): string => {
  const vm = didVerificationMethod(domain, publicKeyHex);
  return (
    JSON.stringify(
      {
        '@context': ['https://www.w3.org/ns/did/v1', 'https://w3id.org/security/multikey/v1'],
        id: `did:web:${domain}`,
        verificationMethod: [vm],
        assertionMethod: [vm.id],
      },
      null,
      2,
    ) + '\n'
  );
};
