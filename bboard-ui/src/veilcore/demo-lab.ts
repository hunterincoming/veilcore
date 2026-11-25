// VeilCore's own demo lab: a key the founders run on veilcore.org to show a lab named through its
// website (bboard-ui/public/.well-known/veilcore-lab.json; docs/lab-domain-keys.md). It is a demo
// key, used only with invented data, and not a laboratory. Every page that names it says so
// (attesters.ts labIdentity and signerLabel, the evidence bundle), whatever name it was
// registered under, so nobody reads it as a lab (summit 5b item 16; SPEC 7: a registry doesn't
// vouch). demo-lab.test.ts holds this list equal to the keys that file publishes.
// SPDX-License-Identifier: Apache-2.0

export const DEMO_LAB_KEYS: ReadonlySet<string> = new Set([
  'a39921a2bf4c18c2dbea16e9b83958097f16f66e2fe0bf77be310dfe6c22138f',
]);

/** Whether this public key (hex) is VeilCore's demo lab key. */
export const isDemoLabKey = (publicKey: unknown): boolean =>
  typeof publicKey === 'string' && DEMO_LAB_KEYS.has(publicKey.toLowerCase());
