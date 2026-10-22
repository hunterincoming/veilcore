// A license and its confirmed payments as W3C Verifiable Credentials (vc.ts), for the licensee
// to show anyone, in the format wallets, regulators and other systems already read.
//
// The licensor's page signs them with its own key for this deal and sends them over the deal's
// channel; the licensee's page checks each one and offers it as a file. Two kinds:
//   - VeilCoreLicenseCredential: "I, the licensor, licensed the holder of this key under the
//     agreement with this fingerprint, recorded on Midnight under this commitment";
//   - VeilCoreRoyaltyPaymentCredential: "I received this amount for this royalty statement".
//
// What a credential does not say: the terms (only their fingerprint, so the two can show them
// to whoever they choose), or that the license is still live. A credential is a signed
// statement made once; whether the license is live now is answered on Midnight, by the holder
// proving it (VeilCore verifier rule 5). Each credential says so in its own description.
//
// Issuer and subject are did:key identifiers of the two deal keys: the keys both sides already
// read to each other as the 6-digit code, so the licensee knows the issuer's key is the
// licensor's.
// SPDX-License-Identifier: Apache-2.0

import { didKeyOf, publicOfDidKey, signCredential, verifyCredential } from './vc';
import { publicOf } from './deal';
import type { DealEntry, DealParty } from './deal-client';
import { NETWORK } from '../config/network';
import { CHAIN_CONTRACT } from './chain/config';

export const VC_CONTEXT = 'https://www.w3.org/ns/credentials/v2';
export const LICENSE_CREDENTIAL = 'VeilCoreLicenseCredential';
export const PAYMENT_CREDENTIAL = 'VeilCoreRoyaltyPaymentCredential';

const iso = (t: number) => new Date(t).toISOString().replace(/\.\d{3}Z$/, 'Z');

type Credential = Record<string, unknown>;

const keysOf = (p: DealParty) => {
  if (p.side !== 'issuer') throw new Error('Only the licensor signs these credentials.');
  return { issuer: publicOf(p.mySecret), licensee: p.theirPublic };
};

const ledger = (p: DealParty) => ({
  chain: 'midnight',
  network: NETWORK,
  ...(CHAIN_CONTRACT ? { contract: CHAIN_CONTRACT } : {}),
  commitment: p.commitment,
  licensorRecord: p.issuerRecord,
});

/** The license, signed by the licensor, once the licensee has agreed to its terms. */
export const licenseCredential = (
  p: DealParty,
  agreed: { agreementType: string; agreementFingerprint: string; agreedAt: number },
  now = Date.now(),
): Credential => {
  const k = keysOf(p);
  return signCredential(
    {
      '@context': [VC_CONTEXT],
      id: `urn:veilcore:license:${p.commitment}`,
      type: ['VerifiableCredential', LICENSE_CREDENTIAL],
      name: 'VeilCore license',
      description:
        'A license between two parties, recorded on Midnight with VeilCore. The terms stay private to the two of them: agreementFingerprint commits to them. Whether the license is still live is checked on Midnight, not by this credential.',
      issuer: didKeyOf(k.issuer),
      validFrom: iso(agreed.agreedAt),
      credentialSubject: {
        id: didKeyOf(k.licensee),
        license: {
          agreementType: agreed.agreementType,
          agreementFingerprint: agreed.agreementFingerprint,
          ledger: ledger(p),
        },
      },
    },
    p.mySecret,
    iso(now),
  );
};

type Statement = Extract<DealEntry, { type: 'statement' }>;
type Received = Extract<DealEntry, { type: 'received' }>;

/** A confirmed payment, signed by the licensor (the payee). */
export const paymentCredential = (
  p: DealParty,
  statement: Statement,
  received: Received,
  now = Date.now(),
): Credential => {
  const k = keysOf(p);
  if (received.statementSig !== statement.signature) throw new Error('That confirmation is for another statement.');
  return signCredential(
    {
      '@context': [VC_CONTEXT],
      id: `urn:veilcore:royalty-payment:${statement.signature.slice(0, 32)}`,
      type: ['VerifiableCredential', PAYMENT_CREDENTIAL],
      name: 'VeilCore royalty payment',
      description:
        'The licensor confirms receiving this royalty payment from the license holder. Signed by the licensor; VeilCore never holds or moves the money.',
      issuer: didKeyOf(k.issuer),
      validFrom: iso(received.at),
      credentialSubject: {
        id: didKeyOf(k.licensee),
        royaltyPayment: {
          statementId: statement.statementId,
          statementSignature: statement.signature,
          periodFrom: statement.periodFrom,
          periodTo: statement.periodTo,
          amount: received.amount,
          currency: received.currency,
          ...(statement.evidence ? { salesReportSha256: statement.evidence.sha256 } : {}),
          ledger: ledger(p),
        },
      },
    },
    p.mySecret,
    iso(now),
  );
};

export type CheckedCredential = {
  readonly kind: 'license' | 'payment';
  readonly credential: Credential;
  /** For a payment: the statement it confirms. */
  readonly statementSignature?: string;
};

const typesOf = (c: Credential): unknown[] => (Array.isArray(c.type) ? (c.type as unknown[]) : []);

/**
 * The credentials the licensor sent in this deal that check out here: signed by the licensor's
 * deal key, about the licensee's, for this license. Anything else is left out.
 */
export const credentialsIn = (entries: readonly DealEntry[], p: DealParty): CheckedCredential[] => {
  const issuer = p.side === 'issuer' ? publicOf(p.mySecret) : p.theirPublic;
  const licensee = p.side === 'issuer' ? p.theirPublic : publicOf(p.mySecret);
  const out: CheckedCredential[] = [];
  const seen = new Set<string>();
  for (const e of entries) {
    if (e.type !== 'credential' || e.from !== 'issuer') continue;
    const v = verifyCredential(e.credential);
    if (!v.verified || v.signer !== issuer) continue;
    const d = v.document;
    const subject = d.credentialSubject as Record<string, unknown> | undefined;
    if (typeof d.issuer !== 'string' || publicOfDidKey(d.issuer) !== issuer) continue;
    if (!subject || typeof subject.id !== 'string' || publicOfDidKey(subject.id) !== licensee) continue;
    const body = (subject.license ?? subject.royaltyPayment) as Record<string, unknown> | undefined;
    const l = body?.ledger as Record<string, unknown> | undefined;
    if (!l || l.commitment !== p.commitment || l.licensorRecord !== p.issuerRecord) continue;
    const id = typeof d.id === 'string' ? d.id : '';
    if (seen.has(id)) continue;
    seen.add(id);
    const types = typesOf(d);
    if (types.includes(LICENSE_CREDENTIAL)) out.push({ kind: 'license', credential: e.credential });
    else if (types.includes(PAYMENT_CREDENTIAL) && body && typeof body.statementSignature === 'string')
      out.push({ kind: 'payment', credential: e.credential, statementSignature: body.statementSignature });
  }
  return out;
};

export const downloadCredential = (c: CheckedCredential): void => {
  const blob = new Blob([JSON.stringify(c.credential, null, 2)], { type: 'application/vc+json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const id = (typeof c.credential.id === 'string' ? c.credential.id : '').split(':').pop()?.slice(0, 8) ?? 'credential';
  a.download = `veilcore-${c.kind}-credential-${id}.json`;
  a.click();
  URL.revokeObjectURL(url);
};
