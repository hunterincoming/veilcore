// Whether a lab result was signed by the lab key this browser holds (mainnet lab run, step 11,
// 18 Nov): the check page said "You signed this result" only once the result's name binding id
// was on a loaded record, and records aren't loaded on that page until asked. Whether this
// browser's key made the signature is known here, from the key alone, with nothing sent.
// SPDX-License-Identifier: Apache-2.0

/** True when `signatureKey` (a lab signature's key, hex) is this attester's signing key. */
export const signedWithKey = async (attesterPrivateKeyPkcs8: string, signatureKey: string): Promise<boolean> => {
  const [{ claimsKeyFor }, { keyHex }] = await Promise.all([import('./claims-key'), import('./lab-attest')]);
  try {
    return keyHex(claimsKeyFor(attesterPrivateKeyPkcs8).key) === signatureKey.toLowerCase();
  } catch {
    return false;
  }
};

/** The same, for the lab key kept in this browser (none: false). */
export const signedInThisBrowser = async (signatureKey: string): Promise<boolean> => {
  const { loadAttester } = await import('./attester-keys');
  const a = loadAttester();
  return a ? signedWithKey(a.keypair.privateKey, signatureKey) : false;
};
