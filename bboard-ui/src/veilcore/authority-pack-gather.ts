// What the pack for the authority looks up (authority-pack.ts), one record at a time: each
// record's inclusion proof from the registry (GET /proof/<proof code>, checked here), its anchor
// looked up on Midnight, the batch root's Bitcoin stamp and RFC 3161 token as the proof names
// them (the token checked here against the root), and, for a lab report with a lab's signature,
// whether a lab stands behind it (the same look-up as the document page's lab panel).
//
// It is given the records and nothing else: the form the officer typed (above all the number of
// linked patients) is never passed here, so nothing in it can be sent. A record kept on this
// device only gets its proof looked up (its proof code is already with the registry, to be
// dated) but never its lab signature: that look-up sends more, and the document page doesn't
// make it for such a record either.
// SPDX-License-Identifier: Apache-2.0

import { timestampTokenBytes, verifyTimestampToken, type InclusionProof } from 'veilcore-records';
import type { StrainRecord } from './records';
import type { ProofState } from './proofs';
import type { AnchorCheck } from './chain/anchor-check';
import type { DateFacts, LabVerdict, PackFacts, PackSelection } from './authority-pack';
import { packRecords } from './authority-pack';
import { isObject, isNumber, isString } from './json';

const HEX64 = /^[0-9a-f]{64}$/;

export type GatherDeps = {
  /** The record's proof, checked against its proof code (proofs.ts proofFor). */
  readonly proof: (fingerprint: string) => Promise<ProofState>;
  /** The anchor looked up on Midnight (chain/anchor-lookup.ts lookUpAnchor); undefined: nothing to look up. */
  readonly anchor: (proof: InclusionProof) => Promise<AnchorCheck> | undefined;
  /** A lab signature's verdict and who signed, for a lab report that has one. */
  readonly lab: (record: StrainRecord) => Promise<{ verdict: LabVerdict; signer: string }>;
  /** The record's check link. */
  readonly link: (record: StrainRecord) => string | undefined;
  /** Whether the record is kept on this device only (records.ts isKeptOnDeviceOnly). */
  readonly deviceOnly: (record: StrainRecord) => boolean;
};

const anchorsOf = (proof: InclusionProof): Record<string, unknown>[] => {
  const a = (proof as unknown as Record<string, unknown>).anchors;
  return Array.isArray(a) ? a.filter(isObject) : [];
};

/** The batch root's RFC 3161 token, when the proof names one and it checks here against the root. */
const tsaOf = async (proof: InclusionProof): Promise<DateFacts['tsa']> => {
  const t = anchorsOf(proof).find((a) => a.kind === 'rfc3161' && isString(a.token));
  if (!t) return undefined;
  try {
    const bytes = timestampTokenBytes(t.token as string);
    if (!bytes) return undefined;
    const root = Uint8Array.from(proof.root.match(/../g) ?? [], (x) => parseInt(x, 16));
    const v = await verifyTimestampToken(bytes, root);
    if (!v?.ok) return undefined;
    const q = isObject(t.qualified) && isString(t.qualified.scheme) ? t.qualified.scheme : undefined;
    return {
      ...(v.genTime ? { genTime: v.genTime } : {}),
      ...(isString(t.tsa) ? { tsa: t.tsa } : {}),
      ...(q ? { qualified: q } : {}),
    };
  } catch {
    return undefined;
  }
};

const bitcoinOf = (proof: InclusionProof): DateFacts['bitcoin'] => {
  const o = anchorsOf(proof).find((a) => a.kind === 'opentimestamps');
  if (!o) return undefined;
  return {
    status: o.status === 'bitcoin' ? 'bitcoin' : 'pending',
    ...(isNumber(o.bitcoinBlockHeight) ? { blockHeight: o.bitcoinBlockHeight } : {}),
    ...(isString(o.bitcoinBlockTime) ? { blockTime: o.bitcoinBlockTime } : {}),
  };
};

/** What one record's date rests on. */
export const dateFactsOf = async (r: StrainRecord, deps: Pick<GatherDeps, 'proof' | 'anchor'>): Promise<DateFacts> => {
  if (!HEX64.test(r.recordFingerprint ?? '')) return { state: 'unsealed' };
  const state = await deps.proof(r.recordFingerprint);
  if (state.status === 'none') return { state: 'none' };
  const proof = state.proof;
  const [tsa, bitcoin] = [await tsaOf(proof), bitcoinOf(proof)];
  const extra = { ...(tsa ? { tsa } : {}), ...(bitcoin ? { bitcoin } : {}) };
  if (state.status === 'pending') return { state: 'pending', ...extra };
  const a = proof.anchor;
  let check: AnchorCheck | undefined;
  try {
    check = await deps.anchor(proof);
  } catch {
    check = undefined;
  }
  return {
    state: 'anchored',
    midnight: {
      network: a?.network ?? '',
      ...(a?.txHash ? { txHash: a.txHash } : {}),
      ...(a?.anchoredAt ? { reportedAt: a.anchoredAt } : {}),
      ...(check ? { check } : {}),
    },
    ...extra,
  };
};

/** Everything the pack looks up, one record at a time. Given the selection only, never the form. */
export const gatherPackFacts = async (selection: PackSelection, deps: GatherDeps): Promise<PackFacts> => {
  const dates = new Map<string, DateFacts>();
  const labs = new Map<string, { verdict: LabVerdict; signer: string }>();
  const links = new Map<string, string>();
  const reportIds = new Set([...selection.reports.values()].flat().map((r) => r.id));
  for (const r of packRecords(selection)) {
    dates.set(r.id, await dateFactsOf(r, deps));
    const link = deps.link(r);
    if (link) links.set(r.id, link);
    if (reportIds.has(r.id) && r.labSignature && !deps.deviceOnly(r)) {
      try {
        labs.set(r.id, await deps.lab(r));
      } catch {
        labs.set(r.id, { verdict: undefined, signer: '' });
      }
    }
  }
  return { dates, labs, links };
};
