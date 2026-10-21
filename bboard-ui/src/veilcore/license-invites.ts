// A real two-party license, between two browsers, without codes copied by hand.
//
// On chain (contract veilcore.compact) a license takes three calls by two people:
//   1. the LICENSEE makes a license secret and, from it, the license commitment against the
//      issuer record's current head; the secret never leaves the licensee's browser;
//   2. the ISSUER sends issueLicense(commitment) from its record: PENDING;
//   3. the LICENSEE sends countersignLicense, proving the secret: ACTIVE.
// The registry's license invites (veilcore-api lineage/license-invites.mjs) carry the
// messages between them: the issuer posts an invite, the licensee answers with the
// commitment, each side posts its transaction id for the other.
//
// The registry is only a mailbox and is never believed. Every transaction id the other side
// posts is read from the network here (verifyIssued, verifyActivated): it must be the right
// call, on VeilCore's contract, leaving this license in the right state. So the registry can
// stall a license but never make one look live.
//
// Who may write: the issuer's browser makes two random tokens and sends the registry only
// their SHA-256. The ACCEPT token goes in the licensee's link fragment
// (/license-invite/LI-…#t=…), which browsers never send to a server; the ISSUER token stays
// with the issuer's agreement (sealed in its registry set). Knowing an invite id is enough to
// read it, never to write.
// SPDX-License-Identifier: Apache-2.0

import { isObject, isString, isNumber, readJson } from './json';
import { answerTokenHash, newAnswerToken } from './prove-relay';

const BASE = import.meta.env.VITE_API_BASE ?? '';
const HEX64 = /^[0-9a-f]{64}$/;
export const INVITE_ID = /^LI-[0-9A-F]{32}$/;
const unreachable = 'could not reach the VeilCore registry; check your connection and try again';

export type LicenseInvite = {
  readonly id: string;
  /** The issuer record's on-chain identity (origin). */
  readonly identity: string;
  /** The issuer's words for the licensee. */
  readonly label: string;
  readonly createdAt: number;
  readonly expiresAt: number;
  readonly commitment: string | null;
  readonly issuerRecord: string | null;
  readonly acceptedAt: number | null;
  readonly issueTx: string | null;
  readonly issuedAt: number | null;
  readonly activateTx: string | null;
  readonly activatedAt: number | null;
};

const hexOrNull = (v: unknown): v is string | null => v === null || (isString(v) && HEX64.test(v));
const numOrNull = (v: unknown): v is number | null => v === null || isNumber(v);

const isInvite = (v: unknown): v is LicenseInvite =>
  isObject(v) &&
  isString(v.id) &&
  INVITE_ID.test(v.id) &&
  isString(v.identity) &&
  HEX64.test(v.identity) &&
  isString(v.label) &&
  isNumber(v.createdAt) &&
  isNumber(v.expiresAt) &&
  hexOrNull(v.commitment) &&
  hexOrNull(v.issuerRecord) &&
  numOrNull(v.acceptedAt) &&
  hexOrNull(v.issueTx) &&
  numOrNull(v.issuedAt) &&
  hexOrNull(v.activateTx) &&
  numOrNull(v.activatedAt);

const errorOf = async (res: Response): Promise<string> => {
  const body = await readJson(res).catch(() => undefined);
  return isObject(body) && isString(body.error) ? body.error : `the registry answered ${res.status}`;
};

const post = async (path: string, body: unknown): Promise<unknown> => {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(unreachable);
  }
  if (!res.ok) throw new Error(await errorOf(res));
  return readJson(res);
};

/** What the issuer keeps (with its agreement) to drive one invite. */
export type IssuerInvite = {
  readonly inviteId: string;
  /** The licensee's token, kept so the issuer can show the link again. */
  readonly acceptToken: string;
  /** The issuer's own token: only it can post the issue. */
  readonly issuerToken: string;
};

/**
 * The issuer invites a licensee to a license on the record with this on-chain identity.
 * Returns what the issuer keeps; the link is inviteLink(...).
 */
export const createInvite = async (identity: string, label: string): Promise<IssuerInvite> => {
  const id = identity.trim().toLowerCase();
  if (!HEX64.test(id)) throw new Error('This record has no on-chain identity yet.');
  const acceptToken = newAnswerToken();
  const issuerToken = newAnswerToken();
  const out = await post('/license-invites', {
    identity: id,
    label: label.trim(),
    acceptTokenHash: await answerTokenHash(acceptToken),
    issuerTokenHash: await answerTokenHash(issuerToken),
  });
  if (!isObject(out) || !isString(out.id) || !INVITE_ID.test(out.id))
    throw new Error('The registry did not answer as expected.');
  return { inviteId: out.id, acceptToken, issuerToken };
};

/** The licensee's link: the accept token rides in the fragment, never sent to a server. */
export const invitePath = (inviteId: string, acceptToken: string): string =>
  `/license-invite/${encodeURIComponent(inviteId)}#t=${encodeURIComponent(acceptToken)}`;

/** Read an invite; undefined when it doesn't exist or has expired. */
export const getInvite = async (inviteId: string): Promise<LicenseInvite | undefined> => {
  if (!INVITE_ID.test(inviteId)) return undefined;
  let res: Response;
  try {
    res = await fetch(`${BASE}/license-invites/${encodeURIComponent(inviteId)}`, { cache: 'no-store' });
  } catch {
    throw new Error(unreachable);
  }
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error(await errorOf(res));
  const v = await readJson(res);
  if (!isInvite(v)) throw new Error('The registry did not answer as expected.');
  // The id it answered for must be the one asked for: a swapped invite would mislead a page.
  if (v.id !== inviteId) throw new Error('The registry did not answer as expected.');
  return v;
};

export const acceptInvite = (inviteId: string, commitment: string, issuerRecord: string, token: string) =>
  post(`/license-invites/${encodeURIComponent(inviteId)}/accept`, { commitment, issuerRecord, token });

export const postIssued = (inviteId: string, txId: string, token: string) =>
  post(`/license-invites/${encodeURIComponent(inviteId)}/issued`, { txId, token });

export const postActivated = (inviteId: string, txId: string, token: string) =>
  post(`/license-invites/${encodeURIComponent(inviteId)}/activated`, { txId, token });

// --- checks on chain -------------------------------------------------------------------

export type ChainVerdict = { readonly ok: boolean; readonly reason: string };

type StateAfter = (
  txId: string,
  entryPoint: string,
) => Promise<{
  licenseStatusOf: { member(k: Uint8Array): boolean; lookup(k: Uint8Array): unknown };
}>;

const bytes = (h: string): Uint8Array => Uint8Array.from(h.match(/../g) ?? [], (b) => parseInt(b, 16));

const defaultStateAfter: StateAfter = async (txId, entryPoint) => {
  const { callState } = await import('../../../api/src/presentation-lookup');
  const { CHAIN_CONTRACT, INDEXER_HTTP } = await import('./chain/config');
  return callState(INDEXER_HTTP ?? '', CHAIN_CONTRACT ?? '', txId, entryPoint);
};

const statusAfter = async (
  txId: string,
  entryPoint: 'issueLicense' | 'countersignLicense',
  commitment: string,
  issuerRecord: string,
  stateAfter: StateAfter,
): Promise<'PENDING' | 'ACTIVE' | 'none'> => {
  const t = txId.trim().toLowerCase().replace(/^0x/, '');
  if (!HEX64.test(t)) throw new Error('That is not a transaction id.');
  const { licenseKeyOf } = await import('./chain/actions');
  const { LicenseState } = await import('../../../contract/src/managed/veilcore/contract/index.js');
  const l = await stateAfter(t, entryPoint);
  const k = bytes(licenseKeyOf(commitment, issuerRecord));
  if (!l.licenseStatusOf.member(k)) return 'none';
  const s = l.licenseStatusOf.lookup(k);
  return s === LicenseState.ACTIVE ? 'ACTIVE' : s === LicenseState.PENDING ? 'PENDING' : 'none';
};

/**
 * The licensee checks the issuer's transaction: a single issueLicense call on VeilCore's
 * contract, after which this license (its commitment, on the issuer's head) exists.
 */
export const verifyIssued = async (
  txId: string,
  commitment: string,
  issuerRecord: string,
  stateAfter: StateAfter = defaultStateAfter,
): Promise<ChainVerdict> => {
  try {
    const s = await statusAfter(txId, 'issueLicense', commitment, issuerRecord, stateAfter);
    return s === 'none'
      ? { ok: false, reason: 'That transaction did not issue this license.' }
      : { ok: true, reason: 'Issued on chain.' };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e) };
  }
};

/** The issuer checks the licensee's transaction: a single countersignLicense call leaving this license ACTIVE. */
export const verifyActivated = async (
  txId: string,
  commitment: string,
  issuerRecord: string,
  stateAfter: StateAfter = defaultStateAfter,
): Promise<ChainVerdict> => {
  try {
    const s = await statusAfter(txId, 'countersignLicense', commitment, issuerRecord, stateAfter);
    return s === 'ACTIVE'
      ? { ok: true, reason: 'Countersigned on chain: the license is live.' }
      : { ok: false, reason: 'That transaction did not make this license live.' };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e) };
  }
};

/**
 * The licensee's accept, with nothing sent before the secret is kept: make the secret here,
 * build the commitment against the issuer's current head (read from the chain), keep both in
 * this browser (held-licenses.ts), then answer the invite. A retried accept reuses the secret
 * already kept for this invite.
 */
export const acceptAsLicensee = async (invite: LicenseInvite, token: string): Promise<void> => {
  const { heldLicense, keepHeldLicense, newLicenseSecret } = await import('./held-licenses');
  let held = heldLicense(invite.id);
  if (!held) {
    const { indexerPublicDataProvider } = await import('@midnight-ntwrk/midnight-js-indexer-public-data-provider');
    const { CHAIN_CONTRACT, INDEXER_HTTP, INDEXER_WS } = await import('./chain/config');
    const { ledger } = await import('../../../contract/src/managed/veilcore/contract/index.js');
    const { licenseRequestFor } = await import('./chain/actions');
    const { setNetworkId } = await import('@midnight-ntwrk/midnight-js-network-id');
    const { NETWORK } = await import('../config/network');
    setNetworkId(NETWORK);
    const state = await indexerPublicDataProvider(
      INDEXER_HTTP ?? '',
      INDEXER_WS ?? '',
      globalThis.WebSocket as never,
    ).queryContractState(CHAIN_CONTRACT ?? '');
    if (!state) throw new Error('VeilCore’s contract was not found on the network. Nothing was sent.');
    const secret = newLicenseSecret();
    const req = licenseRequestFor(bytes(secret), invite.identity, ledger(state.data));
    held = keepHeldLicense({
      inviteId: invite.id,
      secret,
      commitment: req.commitment,
      identity: invite.identity,
      issuerRecord: req.issuerRecord,
      label: invite.label,
      acceptedAt: Date.now(),
    });
  }
  await acceptInvite(invite.id, held.commitment, held.issuerRecord, token);
};
