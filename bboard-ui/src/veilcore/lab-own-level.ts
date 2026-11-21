// The lab's own identity level, for its signing key screen (docs/lab-identity-levels.md): what
// check pages say about its key today. Read from the registry's public record of the key
// (GET /attesters/<public key>) and worked out with the same checks a check page makes
// (attesters.ts labIdentity), the key's own signature naming its website included, so the lab
// sees exactly what a reader of its signatures sees.
// SPDX-License-Identifier: Apache-2.0

import { checkDomainRecords, labIdentity, type LabIdentity, type ResolvedAttestation } from './attesters';
import { readJson, isObject, isString } from './json';

const BASE = import.meta.env.VITE_API_BASE ?? '';
const HEX64 = /^[0-9a-f]{64}$/;

/**
 * The registry's record of a key as a stand-in for one valid signature by it: the level of a key
 * is what every signature it makes shows (while it isn't withdrawn).
 */
export const ownIdentityFrom = async (
  publicKey: string,
  body: unknown,
  now: number = Date.now(),
): Promise<LabIdentity | null> => {
  if (!isObject(body) || body.publicKey !== publicKey) return null;
  const displayName = isString(body.displayName) ? body.displayName : undefined;
  const status = body.nameCheckStatus;
  const registeredAs = {
    ...(displayName !== undefined ? { displayName } : {}),
    nameCheck: isObject(body.nameCheck) ? body.nameCheck : null,
    ...(status === 'checked' || status === 'expired' || status === 'not-checked' || status === 'withdrawn'
      ? { nameCheckStatus: status }
      : {}),
  };
  const domains = await checkDomainRecords(publicKey, {
    domainCheck: body.domainCheck ?? null,
    domainWithdrawn: body.domainWithdrawn ?? null,
  });
  const stand = {
    attestationId: 'own-level',
    type: 'laboratory-report',
    subjectCommitment: '0'.repeat(64),
    attester: { publicKey, ...(displayName !== undefined ? { displayName } : {}) },
    documentHash: '0'.repeat(64),
    hashAlgorithm: 'sha256',
    issuedAt: new Date(now).toISOString(),
    signature: 'own',
    strength: 'signed',
    vettedAttester: body.vetted === true,
    registeredAs: { ...registeredAs, ...domains },
    retraction: null,
    signatureValid: true,
  } as unknown as ResolvedAttestation;
  return labIdentity(stand, now);
};

/** The key's level now, or null when the registry couldn't be asked or doesn't know the key. */
export const loadOwnIdentity = async (publicKey: string): Promise<LabIdentity | null> => {
  if (!HEX64.test(publicKey)) return null;
  try {
    const res = await fetch(`${BASE}/attesters/${publicKey}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return await ownIdentityFrom(publicKey, await readJson(res));
  } catch {
    return null;
  }
};
