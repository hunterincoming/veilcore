// The evidence bundle: one .zip a holder downloads from the plant page, with everything
// anyone needs to check the record's date without VeilCore (docs/evidence-bundle.md).
//
//   gatherEvidence   what the registry has: GET /records/:id/evidence (one call, holder key),
//                    or, from a registry without it, the public /proof, /attestations and
//                    .ots routes. Nothing from it is taken on trust: the proof is checked
//                    against the record here, and the bundle's own page checks it again.
//   buildEvidence    evidence.json: the sealed fields exactly as fingerprinted, the proof,
//                    the batch, what to look up, the lab report pairing, lab signatures,
//                    and (only if the holder ticks it) the record's key.
//   bundleFiles      every file in the zip, README.txt and verify.html included.
//
// The lab report file goes in only if the holder ticks it and picks the file, and only if
// it is the file saved to this plant. The key goes in only if the holder ticks it: with it,
// anyone can tie the record to its key on the network.
// SPDX-License-Identifier: Apache-2.0

import { zipSync, strToU8 } from 'fflate';
import { verifyAttestation, verifyRetraction } from 'veilcore-records';
import type { InclusionProof, SignedAttestation, Retraction } from 'veilcore-records';
import type { StrainRecord } from '../records';
import type { RecordKeys } from '../record-keys';
import {
  canonicalise,
  committedRecordFields,
  contentHashOf,
  fingerprintRecord,
  pairingFingerprintOfSha,
} from '../commitment';
import { bindingForSecret, isHex64, KEY_BOUND_ALGORITHM } from '../key-binding';
import { dnaBindingOf } from '../dna-link';
import { LAB_SALT_PARAM, isBoundLabDocument, labLinkParams, signsReport } from '../lab-doc';
import { checkProof } from '../proofs';
import { holderKeyIfAny } from '../holder';
import { custodyView } from '../custody';
import { receiptCovers, sentByMe, type SentTransfer } from '../transfers';
import { isObject, isString, isNumber, readJson } from '../json';
import { DOCS, DOCS_COMMIT, DOCS_VERSION, REPO_VIEW } from '../docs';
import { verifyPageHtml, SDK_VERSION } from './verify-page';
import { EXAMINER_FILE, examinerSummaryHtml } from './examiner';
import { DECLARATION_FILE, declarationText } from './declaration';
import {
  anchorLookup,
  bitcoinSteps,
  midnightSteps,
  networkWords,
  oneLine,
  sealedNameOf,
  subjectOf,
  utcWords,
  wrap,
} from './words';
import { enT, forKind } from '../../i18n/translate';
import { isAnimal } from '../animal-profile';
import { dnaTieMeaning, dnaTieSentence, isTied, type DnaTie } from '../dna-tie';

export { anchorLookup, bitcoinSteps, midnightSteps } from './words';
export type { AnchorLookup } from './words';

const BASE = import.meta.env.VITE_API_BASE ?? '';

export const EVIDENCE_FORMAT = 'veilcore-evidence-bundle/v1';
/** Where the lab report file goes, when the holder includes it: nothing else is in there. */
export const LAB_FILE_DIR = 'lab/report';
const CONTENT_ALGORITHM = 'sha256/canonical-json/v1';
/** The OpenTimestamps file header: anything else from a registry is left out, not shipped. */
const OTS_MAGIC = '\x00OpenTimestamps\x00\x00Proof\x00';

// ---- what the registry has -----------------------------------------------------------

export type BatchFacts = {
  readonly batchId: string;
  readonly root: string;
  readonly sealedAt?: string;
  readonly recordCount?: number;
  readonly anchor: Record<string, unknown> | null;
  /** Anchors the batch had before its current one. null: this registry didn't say. */
  readonly earlierAnchors: Record<string, unknown>[] | null;
  readonly opentimestamps: {
    readonly available: boolean;
    readonly status: string;
    readonly bitcoinBlockHeight?: number;
    readonly bitcoinBlockTime?: string;
    readonly calendars?: string[];
    readonly file?: string;
  };
};

export type Gathered = {
  /** Where it came from: the one-call evidence route, or the older public routes. */
  readonly source: 'evidence-route' | 'public-routes';
  /** This registry's own clock: when it first saw this record's content. */
  readonly registryFirstSeen: string | null;
  /** The inclusion proof, checked here against the record. */
  readonly proof: InclusionProof | null;
  /** The registry gave a proof that didn't check against this record; it was left out. */
  readonly proofRefused: boolean;
  readonly batch: BatchFacts | null;
  /** The batch's .ots file. */
  readonly ots: Uint8Array | null;
  /** Lab signatures (attestations) about the record's proof code, as served. */
  readonly attestations: Record<string, unknown>[];
};

const base64ToBytes = (b64: string): Uint8Array | null => {
  try {
    const bin = atob(b64);
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
};

const looksLikeOts = (b: Uint8Array | null): b is Uint8Array =>
  !!b && b.length > OTS_MAGIC.length && String.fromCharCode(...b.subarray(0, OTS_MAGIC.length)) === OTS_MAGIC;

const anchorObject = (v: unknown): Record<string, unknown> | null => (isObject(v) && isString(v.network) ? v : null);

/**
 * The registry's answer, held to the record: the proof must be about this fingerprint and
 * fold to its root; the batch must be the proof's batch with the proof's root.
 */
export const reconcile = async (
  fingerprint: string,
  raw: {
    source: Gathered['source'];
    registryFirstSeen?: unknown;
    proof?: unknown;
    batch?: unknown;
    ots?: Uint8Array | null;
    attestations?: unknown;
  },
): Promise<Gathered> => {
  const state =
    raw.proof === null || raw.proof === undefined
      ? { status: 'none' as const }
      : await checkProof(fingerprint, raw.proof);
  const proof = state.status === 'none' ? null : state.proof;
  let batch: BatchFacts | null = null;
  if (proof) {
    const b = isObject(raw.batch) ? raw.batch : null;
    const sameBatch = !!b && b.batchId === proof.batchId && b.root === proof.root;
    const ots = sameBatch && isObject(b.opentimestamps) ? b.opentimestamps : null;
    const proofOts = Array.isArray((proof as unknown as Record<string, unknown>).anchors)
      ? ((proof as unknown as Record<string, unknown>).anchors as unknown[]).find(
          (a) => isObject(a) && a.kind === 'opentimestamps',
        )
      : undefined;
    const otsFacts = ots ?? (isObject(proofOts) ? { available: true, ...proofOts } : null);
    const otsOk = looksLikeOts(raw.ots ?? null);
    batch = {
      batchId: proof.batchId,
      root: proof.root,
      ...(sameBatch && isString(b.sealedAt)
        ? { sealedAt: b.sealedAt }
        : proof.sealedAt
          ? { sealedAt: proof.sealedAt }
          : {}),
      ...(sameBatch && isNumber(b.recordCount) ? { recordCount: b.recordCount } : {}),
      anchor: (sameBatch ? anchorObject(b.anchor) : null) ?? anchorObject(proof.anchor),
      earlierAnchors:
        sameBatch && Array.isArray(b.earlierAnchors)
          ? b.earlierAnchors.filter((a): a is Record<string, unknown> => anchorObject(a) !== null)
          : null,
      opentimestamps: {
        available: otsOk,
        status: otsFacts && otsFacts.status === 'bitcoin' ? 'bitcoin' : otsFacts && otsOk ? 'pending' : 'none',
        ...(otsFacts && isNumber(otsFacts.bitcoinBlockHeight)
          ? { bitcoinBlockHeight: otsFacts.bitcoinBlockHeight }
          : {}),
        ...(otsFacts && isString(otsFacts.bitcoinBlockTime) ? { bitcoinBlockTime: otsFacts.bitcoinBlockTime } : {}),
        ...(otsFacts && Array.isArray(otsFacts.calendars) ? { calendars: otsFacts.calendars.filter(isString) } : {}),
        ...(otsOk ? { file: 'proof/root.bin.ots' } : {}),
      },
    };
  }
  const attestations = (Array.isArray(raw.attestations) ? raw.attestations : []).filter(
    (a): a is Record<string, unknown> => isObject(a) && a.subjectCommitment === fingerprint,
  );
  return {
    source: raw.source,
    registryFirstSeen: isString(raw.registryFirstSeen) ? raw.registryFirstSeen : null,
    proof,
    proofRefused: raw.proof !== null && raw.proof !== undefined && proof === null,
    batch,
    ots: proof && looksLikeOts(raw.ots ?? null) ? (raw.ots as Uint8Array) : null,
    attestations,
  };
};

const unreachable = 'Couldn’t reach VeilCore. Check your connection and try again.';

/** From a registry without /records/:id/evidence: the public routes, one at a time. */
const fromPublicRoutes = async (fingerprint: string, fetcher: typeof fetch): Promise<Gathered | { error: string }> => {
  try {
    const p = await fetcher(`${BASE}/proof/${encodeURIComponent(fingerprint)}`, { cache: 'no-store' });
    const proof = p.ok ? await readJson(p) : null;
    const a = await fetcher(`${BASE}/attestations/subject/${encodeURIComponent(fingerprint)}?limit=100`, {
      cache: 'no-store',
    });
    const body = a.ok ? await readJson(a) : null;
    let ots: Uint8Array | null = null;
    if (isObject(proof) && isString(proof.batchId)) {
      const hasOts =
        Array.isArray(proof.anchors) && proof.anchors.some((x) => isObject(x) && x.kind === 'opentimestamps');
      if (hasOts) {
        const o = await fetcher(`${BASE}/batches/${encodeURIComponent(proof.batchId)}/root.bin.ots`, {
          cache: 'no-store',
        });
        if (o.ok) ots = new Uint8Array(await o.arrayBuffer());
      }
    }
    return reconcile(fingerprint, {
      source: 'public-routes',
      proof,
      ots,
      attestations: isObject(body) ? body.attestations : [],
    });
  } catch {
    return { error: unreachable };
  }
};

/** Everything the registry has for this record, checked against it. */
export const gatherEvidence = async (
  record: Pick<StrainRecord, 'id' | 'recordFingerprint'>,
  fetcher: typeof fetch = fetch,
): Promise<Gathered | { error: string }> => {
  const fingerprint = record.recordFingerprint;
  if (!isHex64(fingerprint)) return { error: 'This record isn’t sealed yet, so there is nothing to check.' };
  const key = holderKeyIfAny();
  if (key) {
    let res: Response;
    try {
      res = await fetcher(`${BASE}/records/${encodeURIComponent(record.id)}/evidence`, {
        headers: { 'x-holder-key': key },
        cache: 'no-store',
      });
    } catch {
      return { error: unreachable };
    }
    if (res.status === 429) return { error: 'Downloads are limited to a few a minute. Try again in a minute.' };
    if (res.ok) {
      const body = await readJson(res).catch(() => undefined);
      if (isObject(body) && body.format === 'veilcore-record-evidence/v1') {
        const otsB64 =
          isObject(body.batch) && isObject(body.batch.opentimestamps) ? body.batch.opentimestamps.ots : null;
        return reconcile(fingerprint, {
          source: 'evidence-route',
          registryFirstSeen: body.registryFirstSeen,
          proof: body.proof,
          batch: body.batch,
          ots: isString(otsB64) ? base64ToBytes(otsB64) : null,
          attestations: body.attestations,
        });
      }
    }
    // A registry from before the evidence route (404), or a record it doesn't hold under
    // this key: the public routes have the same proof and signatures.
  }
  return fromPublicRoutes(fingerprint, fetcher);
};

// ---- the bundle's contents -------------------------------------------------------------

export type EvidenceOptions = {
  /** Put the record's key in: lets anyone tie the record to its key on the network. */
  readonly includeKey: boolean;
  /** The lab report file, when the holder ticks it and picks it. Checked before it goes in. */
  readonly labFile?: { readonly name: string; readonly bytes: Uint8Array };
  /** For tests: when the bundle was made. */
  readonly now?: Date;
  /**
   * The holder's sent deliveries (transfers.ts sentByMe), for the sample details on this
   * plant's deliveries. downloadEvidenceBundle reads them; absent, the bundle has none.
   */
  readonly deliveries?: readonly SentTransfer[];
  /**
   * The id of the record that dates the DNA report saved to this plant ("Date this DNA
   * report"), when there is one. README.txt says so; that record has its own bundle.
   */
  readonly dnaReportDatedBy?: string;
  /**
   * How many of this record's linked parents are the holder's own records locked in this
   * browser (sealed with a vault key it doesn't have). README.txt says they are left out.
   */
  readonly lockedParents?: number;
};

/** How many of a record's linked parents are locked here (records.ts lockedRecords ids). */
export const lockedParentsOf = (record: StrainRecord, locked: ReadonlySet<string>): number =>
  new Set((record.parents ?? []).map((p) => p.recordId).filter((id): id is string => !!id && locked.has(id))).size;

/** One delivery's sample details, as the breeder and the lab each wrote them. */
export type CustodyEntry = {
  readonly transferId: string;
  /**
   * Whether the lab code was used (the registry's claimed_at). Absent in bundles made before
   * it was kept; false: nobody used the code, so no lab received anything through it.
   */
  readonly received?: boolean;
  /** The lab's receipt signature tied to this delivery, if any. */
  readonly receiptAttestationId: string | null;
  /**
   * Whether the receipt's signature covers these details, worked out in the holder's browser
   * (custody.ts custodyView): `covered`, `changed` (the lab changed them after signing),
   * `not-covered` (a receipt from before sample details), or `unsigned` (no receipt
   * signature that checks, and isn't withdrawn, is in this bundle).
   */
  readonly covered: 'covered' | 'changed' | 'not-covered' | 'unsigned';
  /** What the breeder wrote when making the lab code. */
  readonly sample: Readonly<Record<string, string>>;
  /** What the lab wrote on arrival. */
  readonly arrival: Readonly<Record<string, string>>;
  /** Where the two differ, one plain line each. */
  readonly differences: readonly string[];
  /**
   * Sample details sealed with the delivery's offer key (CONTRACT.md #27): the salt the
   * breeder sealed with them, so anyone can recompute the receipt's `_sc2_` digest:
   * SHA-256 of the canonical JSON of { format: "veilcore/sample-custody/v2", transferId,
   * salt, sample, arrival }. Absent for a delivery made before they were sealed (`_sc1_`).
   */
  readonly salt?: string;
  readonly format?: 'veilcore/sample-custody/v2';
  /** Sealed, and the holder's browser had no key to open them: nothing of them is in the bundle. */
  readonly locked?: boolean;
};

export type Evidence = {
  readonly format: typeof EVIDENCE_FORMAT;
  readonly createdAt: string;
  readonly madeBy: string;
  readonly spec: {
    /** The spec's own version line. */
    readonly version: string;
    /** The SDK release and commit the site's copy of the spec came from. */
    readonly sdkVersion: string;
    readonly sdkCommit: string;
    readonly canonicalisationFrom: string;
  };
  readonly record: {
    readonly id: string;
    readonly fingerprint: string;
    readonly fingerprintAlgorithm: string;
    readonly sealedFields: Record<string, unknown>;
    /** The exact text whose SHA-256 is the content hash: record/sealed-fields.canonical.json. */
    readonly canonical: string;
    readonly contentHash: string;
    /** When the holder's device sealed it, by that device's clock: the holder's own statement. */
    readonly sealedAtDeviceClock: string;
  };
  readonly registry: { readonly firstSeen: string | null; readonly source: Gathered['source']; readonly note: string };
  readonly proof: InclusionProof | null;
  readonly batch: BatchFacts | null;
  readonly labReport: {
    readonly pairingFingerprint: string;
    readonly fileSha256?: string;
    readonly fileName?: string;
    readonly pairedAt?: string;
    readonly fileIncluded?: string;
    /**
     * What a check link shows of it (round 5, CONTRACT.md #29): the registry publishes only
     * H("veilcore:v1:dnapair", the file's SHA-256, the record's proof code, pairSalt), never
     * the SHA-256. pairSalt is the record's own, in the holder's check link after #ds=.
     */
    readonly pairSalt?: string;
    readonly pairBinding?: string;
    /**
     * The lab report salt (round 6, CONTRACT.md #34; lab-doc.ts): a lab signed this report
     * bound with it, so the examiner can make the signed code again from the file's SHA-256
     * and the proof code. Only the sender and the lab hold it otherwise.
     */
    readonly labSalt?: string;
  } | null;
  readonly signatures: Record<string, unknown>[];
  /**
   * The sample details on the holder's deliveries of this plant that a lab signed a receipt
   * for, and whether the receipt covers them (custody.ts custodyView). Only in bundles made
   * where the holder's deliveries could be read; absent otherwise.
   */
  readonly custody?: readonly CustodyEntry[];
  readonly key: {
    readonly identity: string;
    readonly keySalt: string;
    readonly keyBinding: string;
    readonly contentHash: string;
    /** The key's own date stamp: dates the key, not the record (SPEC 3.6.1). */
    readonly keyStamp?: {
      readonly network: string;
      readonly contractAddress: string;
      readonly txHash: string;
      readonly blockHeight: number;
      readonly anchoredAt?: string;
    };
  } | null;
};

const iso = (ms: number): string => new Date(ms).toISOString();

/** "Version 0.1 - August 2026, revised 14 October 2026 (...)": the spec's own line. */
export const specVersionLine = (spec: string = DOCS.spec.md): string =>
  spec
    .split('\n')
    .find((l) => /^Version /.test(l))
    ?.trim() ?? `the spec in VeilCore SDK ${DOCS_VERSION}`;
const hexOf = (b: Uint8Array): string => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
const sha256OfBytes = async (bytes: Uint8Array): Promise<string> =>
  hexOf(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes as unknown as BufferSource)));

/** A file name safe in any zip tool and file system. */
export const safeFileName = (name: string): string => {
  const cleaned = name
    .replace(/[\\/]/g, '-')
    .replace(/[^A-Za-z0-9 ._()-]/g, '')
    .replace(/ {2,}/g, ' ')
    .replace(/^\.+/, '')
    .trim()
    .slice(0, 120)
    .trim();
  return cleaned || 'lab-report.bin';
};

/** The saved lab report's SHA-256: kept on the record since round 5, else from a lab signature it matches. */
const savedSha = (record: StrainRecord, attestations: readonly Record<string, unknown>[]): string | undefined => {
  if (!record.dnaFingerprint) return undefined;
  if (record.dnaFileSha256 && isHex64(record.dnaFileSha256.toLowerCase())) return record.dnaFileSha256.toLowerCase();
  for (const a of attestations) {
    if (isString(a.documentHash) && pairingFingerprintOfSha(a.documentHash) === record.dnaFingerprint)
      return a.documentHash;
  }
  return undefined;
};

/** { labSalt } when a lab signed the saved report bound to the record with one of its deliveries' salts. */
const labLinkParamsAsSalt = (
  record: StrainRecord,
  fileSha256: string,
  attestations: readonly Record<string, unknown>[],
): { labSalt?: string } => {
  const atts = attestations.filter(
    (a): a is { attestationId: string; subjectCommitment: string; documentHash: string } =>
      isString(a.attestationId) && isString(a.subjectCommitment) && isString(a.documentHash),
  );
  const ls = labLinkParams({ dnaFileSha256: fileSha256, offerKeys: record.offerKeys }, atts)[LAB_SALT_PARAM];
  return ls ? { labSalt: ls } : {};
};

/** Thrown with words for the holder; nothing is downloaded. */
export class BundleRefusal extends Error {}

/**
 * Every delivery of this plant the holder made, with the sample details each side wrote and
 * the lab's receipt for it (custody.ts custodyView): the declaration says which were signed
 * for and which lab codes were never used (round 2 of the 15 Oct review). "covered" only when
 * the receipt's signature is in the bundle, checks here, is about this record and isn't
 * withdrawn by its signer.
 */
export const custodyEntries = async (
  record: Pick<StrainRecord, 'id' | 'recordFingerprint'>,
  deliveries: readonly SentTransfer[],
  attestations: readonly Record<string, unknown>[],
): Promise<CustodyEntry[]> => {
  const out: CustodyEntry[] = [];
  for (const t of deliveries) {
    if (t.source_record !== record.id) continue;
    const receiptId = t.receipt_attestation_id ?? undefined;
    // A delivery with no sample details written: still listed, with whether a receipt's id
    // carries the digest of "nothing written" (it then covers that).
    const view = custodyView(t, receiptId) ?? {
      sample: {},
      arrival: {},
      signed: receiptId ? receiptCovers(receiptId, t) : ('not-covered' as const),
      differences: [],
    };
    let covered: CustodyEntry['covered'] = view.signed;
    if (receiptId) {
      const a = attestations.find((x) => x.attestationId === receiptId);
      const valid =
        !!a &&
        a.type === 'chain-of-custody' &&
        a.subjectCommitment === record.recordFingerprint &&
        (await verifyAttestation(a as unknown as SignedAttestation).catch(() => false));
      const r = a && isObject(a.retraction) ? (a.retraction as unknown as Retraction) : null;
      const withdrawn = !!a && !!r && (await verifyRetraction(r, a as unknown as SignedAttestation).catch(() => false));
      if (!valid || withdrawn) covered = 'unsigned';
    } else covered = 'unsigned';
    const strings = (d: object): Record<string, string> =>
      Object.fromEntries(Object.entries(d).filter((e): e is [string, string] => isString(e[1]) && e[1] !== ''));
    out.push({
      transferId: t.id,
      received: typeof t.claimed_at === 'number',
      receiptAttestationId: receiptId ?? null,
      covered,
      sample: strings(view.sample),
      arrival: strings(view.arrival),
      differences: covered === 'covered' ? [...view.differences] : [],
      ...(t.custodyFormat === 2 && t.custodySalt
        ? { salt: t.custodySalt, format: 'veilcore/sample-custody/v2' as const }
        : {}),
      ...(t.custodyLocked ? { locked: true } : {}),
    });
  }
  return out;
};

export const buildEvidence = async (
  record: StrainRecord,
  gathered: Gathered,
  options: EvidenceOptions,
  keys?: RecordKeys,
): Promise<Evidence> => {
  const now = options.now ?? new Date();
  if (!record.recordFingerprint || !record.nonce) {
    throw new BundleRefusal(
      'This record was sealed before its details were kept in a form anyone can check, so no bundle can be made.',
    );
  }
  const input = { ...record, nonce: record.nonce };
  if ((await fingerprintRecord(input)) !== record.recordFingerprint) {
    throw new BundleRefusal(
      'This record’s proof code doesn’t match its details, so a bundle couldn’t be tied to it. Nothing was downloaded.',
    );
  }
  const sealedFields = committedRecordFields(input);
  const canonical = canonicalise(sealedFields);
  const contentHash = await contentHashOf(input);

  let key: Evidence['key'] = null;
  if (options.includeKey) {
    if (!record.keyBinding)
      throw new BundleRefusal('This record was sealed before records named their key, so there is no key to include.');
    if (!keys?.recordSecret) {
      throw new BundleRefusal(
        'This record’s key isn’t in this browser. Open your backup here first, or leave the key out.',
      );
    }
    const b = bindingForSecret(keys.recordSecret);
    if (b.keyBinding !== record.keyBinding) {
      throw new BundleRefusal(
        'The key in this browser isn’t the one this record names, so it was not included. Nothing was downloaded.',
      );
    }
    const stamp = keys.anchor && keys.anchor.identity === b.identity ? keys.anchor : undefined;
    key = {
      identity: b.identity,
      keySalt: b.keySalt,
      keyBinding: b.keyBinding,
      contentHash,
      ...(stamp
        ? {
            keyStamp: {
              network: stamp.network,
              contractAddress: stamp.contractAddress,
              txHash: stamp.txHash,
              blockHeight: stamp.blockHeight,
              ...(stamp.anchoredAt ? { anchoredAt: iso(stamp.anchoredAt) } : {}),
            },
          }
        : {}),
    };
  }

  let labReport: Evidence['labReport'] = null;
  if (record.dnaFingerprint) {
    let fileSha256 = savedSha(record, gathered.attestations);
    let fileIncluded: string | undefined;
    if (options.labFile) {
      const sha = await sha256OfBytes(options.labFile.bytes);
      const matches = fileSha256 ? sha === fileSha256 : pairingFingerprintOfSha(sha) === record.dnaFingerprint;
      if (!matches) {
        throw new BundleRefusal(
          `${options.labFile.name || 'That file'} isn’t the lab report saved to this ${isAnimal(record) ? 'animal' : 'plant'}, so it wasn’t included. Nothing was downloaded.`,
        );
      }
      fileSha256 = sha;
      // In a folder of its own, so no name can land on another file in the bundle.
      fileIncluded = `${LAB_FILE_DIR}/${safeFileName(options.labFile.name)}`;
    }
    labReport = {
      pairingFingerprint: record.dnaFingerprint,
      ...(fileSha256 ? { fileSha256 } : {}),
      ...(record.dnaFileName ? { fileName: record.dnaFileName } : {}),
      ...(record.dnaPairedAt ? { pairedAt: iso(record.dnaPairedAt) } : {}),
      ...(fileIncluded ? { fileIncluded } : {}),
      ...(record.dnaPairSalt && dnaBindingOf(record)
        ? { pairSalt: record.dnaPairSalt, pairBinding: dnaBindingOf(record) }
        : {}),
      ...(fileSha256 ? labLinkParamsAsSalt(record, fileSha256, gathered.attestations) : {}),
    };
  } else if (options.labFile) {
    throw new BundleRefusal(
      `No lab report is saved to this ${isAnimal(record) ? 'animal' : 'plant'}, so there is nothing to include.`,
    );
  }

  const custody = options.deliveries ? await custodyEntries(record, options.deliveries, gathered.attestations) : [];

  return {
    format: EVIDENCE_FORMAT,
    createdAt: now.toISOString(),
    madeBy: 'The VeilCore site, from this browser’s copy of the record.',
    spec: {
      version: specVersionLine(),
      sdkVersion: DOCS_VERSION,
      sdkCommit: DOCS_COMMIT,
      canonicalisationFrom: `veilcore-records ${SDK_VERSION}, dist/canonical.js`,
    },
    record: {
      id: record.id,
      fingerprint: record.recordFingerprint,
      fingerprintAlgorithm: record.keyBinding ? KEY_BOUND_ALGORITHM : CONTENT_ALGORITHM,
      sealedFields,
      canonical,
      contentHash,
      sealedAtDeviceClock: iso(record.loggedAt),
    },
    registry: {
      firstSeen: gathered.registryFirstSeen,
      source: gathered.source,
      note: 'firstSeen is VeilCore’s registry’s own clock, its word only. The anchor is the transaction the registry operator reported; nobody has looked it up on the chain for you.',
    },
    proof: gathered.proof,
    batch: gathered.batch,
    labReport,
    signatures: gathered.attestations,
    ...(custody.length ? { custody } : {}),
    key,
  };
};

// ---- the words ---------------------------------------------------------------------------

/** A lab signature the holder's browser checked, for README.txt, EXAMINER-SUMMARY.html and the declaration. */
export type SignatureLine = {
  ok: boolean;
  withdrawn: boolean;
  text: string;
  /** The signed statement, as served, for the summary's table. Present when ok. */
  attestationId?: string;
  type?: string;
  /** "a lab report", "a receipt for a sample", or the type in quotes. */
  what?: string;
  /**
   * What the signed SHA-256 (documentHash) is of, in words: a lab report file's, or, for a
   * receipt, the lab's own record of the delivery (never the sample itself).
   */
  documentWords?: string;
  publicKey?: string;
  /** The name the key gives itself: not checked. */
  displayName?: string;
  documentHash?: string;
  issuedAt?: string;
  withdrawnAt?: string;
  withdrawnReason?: string;
  /** It is about the lab report saved to this plant. */
  savedReport?: boolean;
};

const TYPE_WORDS: Record<string, string> = {
  'laboratory-report': 'a lab report',
  'chain-of-custody': 'a receipt for a sample',
};

export const signatureLines = async (
  signatures: readonly Record<string, unknown>[],
  fingerprint: string,
  savedFileSha?: string,
  /** What the record describes: "the lab report saved to this plant" or "… this animal". */
  subject: 'plant' | 'animal' = 'plant',
  /** The lab report salt (round 6, lab-doc.ts): a bound lab report signature is matched with it. */
  labSalt?: string,
): Promise<SignatureLine[]> => {
  const out: SignatureLine[] = [];
  for (const a of signatures) {
    const attester = isObject(a.attester) ? a.attester : {};
    const key = isString(attester.publicKey) ? attester.publicKey : '(no key)';
    // Made before round 6 over the report's SHA-256 (CONTRACT.md #34): the registry shows it
    // only to the delivery's sender and lab. Said so, never as a signature that fails.
    if (a.documentWithheld === true) {
      out.push({
        ok: false,
        withdrawn: false,
        text: `The registry says the key ${key} signed a lab report about this record at ${oneLine(a.issuedAt)}. It was signed before 17 October 2026, over the report file's SHA-256, so the registry shows it only to the delivery's sender and lab, and it isn't in this bundle.`,
      });
      continue;
    }
    const valid = await verifyAttestation(a as unknown as SignedAttestation).catch(() => false);
    if (!valid || a.subjectCommitment !== fingerprint) {
      out.push({
        ok: false,
        withdrawn: false,
        text: `A signature (${oneLine(a.attestationId)}) that does not check. Ignore it.`,
      });
      continue;
    }
    const r = isObject(a.retraction) ? (a.retraction as unknown as Retraction) : null;
    const withdrawn = r ? await verifyRetraction(r, a as unknown as SignedAttestation).catch(() => false) : false;
    // Everything the signer typed goes on one line: a line break or direction mark in a name
    // or a type can't start lines of its own in README.txt or the declaration (words.ts oneLine).
    const what = TYPE_WORDS[String(a.type)] ?? `"${oneLine(a.type)}"`;
    const displayName = isString(attester.displayName) ? oneLine(attester.displayName) : undefined;
    const name = displayName !== undefined ? ` (it calls itself "${displayName}"; not checked)` : '';
    const bound =
      a.type === 'laboratory-report' &&
      isString(a.attestationId) &&
      isBoundLabDocument({ attestationId: a.attestationId });
    const saved =
      savedFileSha &&
      a.type === 'laboratory-report' &&
      isString(a.attestationId) &&
      isString(a.subjectCommitment) &&
      signsReport(
        {
          attestationId: a.attestationId,
          subjectCommitment: a.subjectCommitment,
          documentHash: isString(a.documentHash) ? a.documentHash : undefined,
        },
        savedFileSha,
        labSalt ? [labSalt] : [],
      )
        ? ` It is the lab report saved to this ${subject}.`
        : '';
    const doc = oneLine(a.documentHash);
    const receipt = a.type === 'chain-of-custody';
    const documentWords = receipt
      ? 'the code of the lab’s own record of the delivery (not a hash of the sample)'
      : bound
        ? 'a code that binds the lab report file to this record with a salt only the sender and the lab hold (lab/lab-report-pairing.json labSalt, when the holder included it)'
        : a.type === 'laboratory-report'
          ? 'the SHA-256 of the lab report file'
          : 'the SHA-256 of the signed document';
    const text =
      (receipt
        ? `The key ${key}${name} signed ${what} about this record at ${oneLine(a.issuedAt)} (the signer's own clock). Its signed SHA-256, ${doc}, is the code of the lab's own record of the delivery, not a hash of the sample.`
        : bound
          ? `The key ${key}${name} signed ${what} about this record at ${oneLine(a.issuedAt)} (the signer's own clock), over the code ${doc}, which binds the report file to this record with a salt only the sender and the lab hold.${saved}`
          : `The key ${key}${name} signed ${what} with SHA-256 ${doc}, about this record, at ${oneLine(a.issuedAt)} (the signer's own clock).${saved}`) +
      (withdrawn && r ? ` The same key withdrew it at ${oneLine(r.retractedAt)} (${oneLine(r.reason)}).` : '');
    out.push({
      ok: true,
      withdrawn,
      text,
      attestationId: oneLine(a.attestationId),
      type: oneLine(a.type),
      what,
      documentWords,
      publicKey: key,
      ...(displayName !== undefined ? { displayName } : {}),
      documentHash: doc,
      issuedAt: oneLine(a.issuedAt),
      ...(withdrawn && r ? { withdrawnAt: oneLine(r.retractedAt), withdrawnReason: oneLine(r.reason) } : {}),
      savedReport: !!saved,
    });
  }
  return out;
};

/** Every file in the bundle, with what it is, in the order README.txt lists them. */
/** The partner kit release the check script installs: on npm, with checkBatchAnchor (docs/PARTNERS.md). */
export const CONTRACTS_PACKAGE = '@veilcore/contracts@0.2.0';
/** The networks a Blockfrost project id reads (partner-kit network.ts BlockfrostNetwork). */
const SCRIPT_NETWORKS = ['mainnet', 'preprod'];

/**
 * proof/check-on-midnight.mjs (persona review, 17 Oct): the one command that reads the batch
 * root from Midnight without any VeilCore server, for an examiner whose explorer doesn't show
 * it. Only for a batch recorded in a transaction on a network Blockfrost serves.
 */
export const checkScriptFor = (ev: Evidence): string | null => {
  const a = ev.batch?.anchor;
  if (!a || !isString(a.txHash) || !isString(a.network) || !SCRIPT_NETWORKS.includes(a.network) || !ev.batch)
    return null;
  const network: string = a.network;
  const s = (v: string) => JSON.stringify(v);
  return [
    "// Checks on Midnight that the transaction below wrote this record's batch root, without any",
    '// VeilCore server: it asks a Midnight indexer (Blockfrost) directly.',
    '//',
    "// It runs VeilCore's published, open-source checking code (" + CONTRACTS_PACKAGE + ' on npm); read it',
    '// first if you like. You need Node 24 and a free Blockfrost project id for Midnight ' + network + '.',
    '// In this folder:',
    '//',
    '//   npm install --save-exact ' + CONTRACTS_PACKAGE,
    '//   node check-on-midnight.mjs YOUR_BLOCKFROST_PROJECT_ID',
    '//',
    '// It prints "accepted": true with the block and its time when that transaction wrote this',
    "// root (exit 0), and false with the reason when it didn't (exit 1).",
    "import { checkBatchAnchor } from '@veilcore/contracts';",
    '',
    'const blockfrostProjectId = process.argv[2];',
    'if (!blockfrostProjectId) {',
    "  console.error('Give your Blockfrost project id: node check-on-midnight.mjs YOUR_BLOCKFROST_PROJECT_ID');",
    '  process.exit(2);',
    '}',
    'const verdict = await checkBatchAnchor({',
    `  network: ${s(network)},`,
    '  blockfrostProjectId,',
    `  txId: ${s(a.txHash)},`,
    ...(isString(a.contractAddress) ? [`  address: ${s(a.contractAddress)},`] : []),
    `  root: Buffer.from(${s(ev.batch.root)}, 'hex'),`,
    '});',
    "console.log(JSON.stringify(verdict, (_k, v) => (typeof v === 'bigint' ? String(v) : v), 2));",
    'process.exit(verdict.accepted ? 0 : 1);',
    '',
  ].join('\n');
};

export const fileList = (ev: Evidence, hasOts: boolean): { path: string; what: string }[] => {
  const out: { path: string; what: string }[] = [
    { path: 'README.txt', what: 'this file.' },
    {
      path: 'verify.html',
      what: 'the offline check page. Everything it needs is inside it; read its script to see exactly what it does.',
    },
    {
      path: EXAMINER_FILE,
      what: 'a printable summary for a lawyer or examiner: the record as sealed, its proof code, batch and transaction, how it was checked, lab signatures and sample receipts, and what it shows and does not. Open it in a browser and print it to PDF. It checks nothing itself; verify.html rechecks what it reports.',
    },
    {
      path: DECLARATION_FILE,
      what: "sample text for a written declaration about this record and bundle, with the bundle's facts and every file's SHA-256 filled in. Not legal advice: have a lawyer where you are adapt it.",
    },
    { path: 'evidence.json', what: 'everything below in one machine-readable file (verify.html carries a copy).' },
    { path: 'record/sealed-fields.json', what: 'the record exactly as sealed, made readable.' },
    { path: 'record/sealed-fields.canonical.json', what: 'the exact bytes the proof code was made from.' },
    {
      path: 'record/proof-code.txt',
      what: `the record's proof code, worked out from the sealed fields${ev.record.fingerprintAlgorithm === KEY_BOUND_ALGORITHM ? " and the record's key" : ''}.`,
    },
  ];
  if (ev.proof && ev.batch) {
    out.push(
      {
        path: 'proof/inclusion-proof.json',
        what: "the proof: the steps from the record's proof code to the batch root.",
      },
      { path: 'proof/batch-root.txt', what: 'the batch root, as text.' },
      { path: 'proof/root.bin', what: 'the batch root as 32 bytes: the file the Bitcoin stamp covers.' },
      { path: 'proof/anchors.json', what: "where the batch root was recorded, as VeilCore's registry reported it." },
    );
    if (hasOts) out.push({ path: 'proof/root.bin.ots', what: 'the Bitcoin stamp file (OpenTimestamps) for root.bin.' });
    if (checkScriptFor(ev))
      out.push({
        path: 'proof/check-on-midnight.mjs',
        what: 'a short script that reads the batch root from Midnight itself, with no VeilCore server (see "For technical readers").',
      });
  }
  if (ev.labReport) {
    out.push({
      path: 'lab/lab-report-pairing.json',
      what: `the lab report saved to this ${subjectOf(ev.record.sealedFields)}: its SHA-256${ev.labReport.fileSha256 ? '' : ' (not kept for this older pairing)'} and the code that pairs it with the ${subjectOf(ev.record.sealedFields)}.`,
    });
    if (ev.labReport.fileIncluded)
      out.push({ path: ev.labReport.fileIncluded, what: 'the lab report file itself, included by the holder.' });
  }
  if (ev.signatures.length)
    out.push({ path: 'lab/signatures.json', what: 'lab signatures about this record, as the registry stores them.' });
  if (ev.key)
    out.push({
      path: 'key/key-binding.json',
      what: "the record's key (its public ID) and the salt that ties it to the record. Included by the holder: with it, anyone can tie this record to everything its key does on the network.",
    });
  out.push({
    path: 'spec/SPEC-sections.md',
    what: `the parts of the record format these checks follow (spec ${ev.spec.version.replace(/^Version /, 'version ').replace(/ \(.*$/, '')}).`,
  });
  return out;
};

/**
 * README.txt's "TIED TO THE PLANT": whether a DNA report ties this record to the plant
 * (veilcore/dna-tie.ts, in the check page's neutral words), whether anything dates that
 * report, and what a DNA report does and doesn't show. From the signatures checked when
 * the bundle was made: a lab report signature on the saved file's SHA-256, withdrawn or not.
 */
export const tiedToPlantLines = (ev: Evidence, sigs: readonly SignatureLine[], datedBy?: string): string[] => {
  // (A test's evidence may carry only its lab report: then it reads as a plant's, as before.)
  const subject = subjectOf((ev as Partial<Evidence>).record?.sealedFields);
  // In English (the bundle's files are), with "animal" for an animal record (translate.ts forKind).
  const en = forKind(enT, subject);
  let tie: DnaTie;
  if (!ev.labReport) tie = { state: 'none' };
  else if (!ev.labReport.fileSha256) tie = { state: 'saved' };
  else {
    const signed = sigs.filter((x) => x.ok && x.savedReport && x.type === 'laboratory-report');
    const standing = signed.find((x) => !x.withdrawn);
    const gone = signed.find((x) => x.withdrawn);
    tie = standing
      ? {
          state: 'lab',
          lead:
            standing.displayName !== undefined
              ? `signed by a key named “${standing.displayName}” (name not checked; key ${standing.publicKey ?? ''})`
              : `signed by a key nobody has named (key ${standing.publicKey ?? ''})`,
        }
      : gone
        ? { state: gone.withdrawnReason === 'superseded' ? 'replaced' : 'withdrawn' }
        : { state: 'self' };
  }
  const out = [dnaTieSentence(tie, undefined, 'public', en)];
  if (isTied(tie)) {
    out.push(
      datedBy
        ? `A separate record, ${datedBy}, dates this DNA report's existence: it holds only the report's SHA-256. Its own evidence bundle has its date.`
        : "Nothing dates this DNA report yet: it was saved after sealing, so this record's batch doesn't date it.",
    );
    out.push(dnaTieMeaning(en));
  } else if (tie.state === 'none') {
    out.push(
      `A DNA report (a lab's genotype of the ${subject}) is what ties a record to the ${subject} itself. VeilCore doesn't test DNA.`,
    );
  }
  return out;
};

/** README.txt: what each file is, what it proves, what it doesn't. Plain words; formulas at the end. */
export const readmeText = (
  ev: Evidence,
  sigs: readonly SignatureLine[],
  hasOts = !!ev.batch?.opentimestamps.available,
  dnaReportDatedBy?: string,
  lockedParents = 0,
): string => {
  const name = oneLine(sealedNameOf(ev.record.sealedFields) || ev.record.id);
  const subject = subjectOf(ev.record.sealedFields);
  const anchor = ev.batch?.anchor ?? null;
  const tx = anchor && isString(anchor.txHash) ? anchor.txHash : null;
  const test = anchor ? anchor.network !== 'mainnet' : true;
  const bitcoin = ev.batch && hasOts ? ev.batch.opentimestamps : null;
  const L: string[] = [];
  L.push(`VeilCore evidence bundle: ${name} (${ev.record.id})`);
  L.push(
    `Made ${utcWords(ev.createdAt) ?? ev.createdAt} by the VeilCore site, from the holder's own copy of the record.`,
  );
  L.push('');
  L.push('WHAT THIS IS');
  L.push(
    "Everything needed to check this record's date without VeilCore: the record exactly as it was sealed, the proof that it's in a batch, where that batch was recorded, and verify.html, a page that does the checks on your own computer with no internet.",
  );
  L.push(
    "A batch is a group of records dated together. Its batch root is one code that stands for every record in it: the batch root is what gets recorded on Midnight, and this record's proof leads from its own proof code to it.",
  );
  if (lockedParents > 0) {
    L.push('');
    L.push(
      `${lockedParents} of this record's linked parents ${lockedParents === 1 ? 'is' : 'are'} the holder's own record${lockedParents === 1 ? '' : 's'}, locked in the browser this bundle was made in (sealed with a key it doesn't have), so ${lockedParents === 1 ? 'it is' : 'they are'} left out. The parents' names as sealed in this record are in it.`,
    );
  }
  if (test) {
    L.push('');
    L.push(
      anchor
        ? `This record is dated on ${networkWords(anchor.network)}. A test network can be reset and its dates carry no weight: treat this as practice data.`
        : 'This record is not dated on any network yet. Until it is, nothing here dates it.',
    );
  }
  L.push('');
  L.push(subject === 'animal' ? 'TIED TO THE ANIMAL' : 'TIED TO THE PLANT');
  L.push(...tiedToPlantLines(ev, sigs, dnaReportDatedBy));
  L.push('');
  L.push('HOW TO CHECK IT (nothing from VeilCore needed)');
  L.push(
    '1. Open verify.html in Chrome or Firefox (double-click it). It works offline. It should say "The files agree with each other", "Proof code matches" and "Proof leads to the batch root". If it says "Don\'t use this to date the record", stop there: the files have been changed.',
  );
  const lookup = ev.batch && anchor ? anchorLookup(anchor, ev.batch.root) : null;
  if (ev.batch && tx && lookup) {
    L.push('2. Date it on Midnight. These are the same steps verify.html shows:');
    midnightSteps(lookup).forEach((step, i) => L.push(`   ${String.fromCharCode(97 + i)}. ${step}`));
  } else if (ev.batch) {
    L.push(
      `2. Date it: the batch (${ev.batch.batchId}) isn't recorded on Midnight yet. Download a new bundle once it is.`,
    );
  } else {
    L.push("2. Date it: the record isn't in a batch yet. Download a new bundle once it is.");
  }
  if (bitcoin) {
    const reported =
      bitcoin.status === 'bitcoin'
        ? `in Bitcoin block ${isNumber(bitcoin.bitcoinBlockHeight) ? bitcoin.bitcoinBlockHeight : '(not given)'}`
        : 'pending, not yet in a Bitcoin block';
    L.push('3. Bitcoin (a second, separate date):');
    bitcoinSteps(bitcoin.status !== 'bitcoin').forEach((step, i) =>
      L.push(`   ${String.fromCharCode(97 + i)}. ${step}`),
    );
    L.push(
      `   VeilCore's registry reported the stamp as ${reported} when the bundle was made. verify.html reads the stamp file itself and says what it shows.`,
    );
  }
  if (ev.batch?.earlierAnchors && ev.batch.earlierAnchors.length) {
    for (const a of ev.batch.earlierAnchors) {
      L.push(
        `   Earlier, the same root was recorded on ${networkWords(a.network)} in transaction ${String(a.txHash)}. A later one took its place; both are listed in proof/anchors.json.`,
      );
    }
  }
  L.push('');
  L.push('WHAT EACH FILE IS');
  for (const f of fileList(ev, !!bitcoin)) L.push(`- ${f.path}: ${f.what}`);
  L.push('');
  L.push(`WHAT THIS PROVES, once step 2${bitcoin ? ' or step 3' : ''} checks out`);
  L.push(
    `- This record existed, unchanged, by the date of that transaction${bitcoin ? ' (or Bitcoin block)' : ''}. Whoever had it sealed held this record by that date.`,
  );
  if (ev.key) L.push("- The record named this key when it was sealed, so the key can't have been swapped since.");
  for (const s of sigs) L.push(`- ${s.text}`);
  L.push('');
  L.push('WHAT THIS DOES NOT PROVE');
  L.push('- That anything the record says is true: the name, who bred it, the stated date. The breeder wrote those.');
  L.push(`- Who holds the ${subject} or the record now.`);
  L.push("- That a signing key belongs to the lab it names. VeilCore doesn't vouch for anyone.");
  L.push(
    `- Any date at all until you find the batch root in the named transaction${bitcoin ? ' (or the Bitcoin stamp checks)' : ''}. VeilCore's registry reported the transaction${anchor && utcWords(anchor.anchoredAt) ? `, and its time as ${utcWords(anchor.anchoredAt)}` : ''}; it has not been checked on the chain for you.`,
  );
  if (ev.labReport) {
    L.push(
      `- When the lab report was saved to the ${subject}. That came after sealing and isn't inside the record's proof code, so the batch doesn't date it.`,
    );
  }
  if (ev.registry.firstSeen)
    L.push(
      `- The registry first saw this record at ${utcWords(ev.registry.firstSeen) ?? ev.registry.firstSeen}. That is the registry's own clock, its word only.`,
    );
  L.push(
    `- The sealing time in the record (${utcWords(ev.record.sealedAtDeviceClock) ?? ev.record.sealedAtDeviceClock}) is the holder's device clock, the holder's word only.`,
  );
  L.push('');
  L.push('FOR TECHNICAL READERS');
  L.push(
    '- H(tag, a, b, ...) below is SHA-256 over the tag padded with zero bytes to 32 bytes, then each 32-byte value in turn (spec section 3.6.1).',
  );
  L.push(
    ev.record.fingerprintAlgorithm === KEY_BOUND_ALGORITHM
      ? '- Proof code: this record names its own key, so it is H("veilcore:v1:keyrecord", keyBinding, contentHash), where contentHash is the SHA-256 of record/sealed-fields.canonical.json (spec sections 3.6.1 and 4.4).'
      : '- Proof code: the SHA-256 of record/sealed-fields.canonical.json, the canonical JSON of the sealed fields (spec section 4.4).',
  );
  L.push(
    '- Proof: start from SHA-256 of the text "00" + proof code; at each step take SHA-256 of "01" + left + right (hex text, the sibling on the side the step names); the result must be the batch root (spec section 5.4).',
  );
  if (ev.key)
    L.push(
      '- Key: keyBinding = H("veilcore:v1:keybind", identity, keySalt), from key/key-binding.json; it must equal the keyBinding in the sealed fields.',
    );
  if (ev.labReport)
    L.push(
      '- Lab report pairing: H("veilcore:v1:commit", SHA-256 of the lab report file) is the pairing code (spec section 3.7).',
    );
  if (ev.labReport?.pairBinding)
    L.push(
      '- On a check link: when the holder shares whether a DNA report is saved, the registry shows only H("veilcore:v1:dnapair", SHA-256 of the lab report file, proof code, pairSalt), the pairBinding in lab/lab-report-pairing.json, never the SHA-256. The holder\'s check link carries pairSalt after #ds=. With the file and that link anyone can recompute it; without them nobody can tell which file it is, or whether they hold the same one.',
    );
  if (tx)
    L.push(
      `- Reading the batch root from Midnight yourself: ask a Midnight indexer (GraphQL) for transactions(offset: { hash: "${tx}" }) with block { height timestamp } and, on a RegularTransaction, transactionResult { status } and contractActions { address state ... on ContractCall { entryPoint } }. The transaction must have status SUCCESS and exactly one call on the contract above, with entryPoint anchorBatch. Decode that call's state with VeilCore's compiled contract (its ledger) and read lastBatchRoot: it must be the batch root. Midnight's preprod and main network indexers are run by Blockfrost and need a project id.`,
    );
  if (tx && checkScriptFor(ev))
    L.push(
      `- Reading the batch root from Midnight with one command, no VeilCore server: in the proof folder, run npm install --save-exact ${CONTRACTS_PACKAGE} and then node check-on-midnight.mjs followed by your Blockfrost project id (free from blockfrost.io, for Midnight ${anchor && isString(anchor.network) ? anchor.network : ''}). It uses VeilCore's published checking code, so read it first if that matters; it prints "accepted": true and the block when the transaction wrote this root.`,
    );
  if (bitcoin)
    L.push(
      '- Bitcoin stamp: proof/root.bin.ots starts from SHA-256 of proof/root.bin; its steps end on the merkle root of the Bitcoin block it names.',
    );
  return wrap(L.join('\n')) + '\n';
};

/** The spec sections the checks follow, from the spec this site serves. */
export const specSectionsText = (spec: string = DOCS.spec.md): string => {
  const lines = spec.split('\n');
  const heading = /^(#{2,4}) (\d+(?:\.\d+)*)\b/;
  const wanted = ['3.6.1', '3.7', '4.4', '5', '7', '9'];
  const out: string[] = [];
  out.push(lines[0] ?? '# The VeilCore Record Format');
  const version = lines.find((l) => /^Version /.test(l));
  if (version) out.push('', version);
  out.push(
    '',
    `Sections copied from SPEC.md at commit ${DOCS_COMMIT} of the VeilCore SDK (${DOCS_VERSION}). The whole text: ${REPO_VIEW}/SPEC.md`,
  );
  for (const want of wanted) {
    const start = lines.findIndex((l) => heading.exec(l)?.[2] === want);
    if (start < 0) continue;
    const level = (heading.exec(lines[start]) as RegExpExecArray)[1].length;
    let end = start + 1;
    while (end < lines.length) {
      const m = /^(#{1,6}) /.exec(lines[end]);
      if (m && m[1].length <= level) break;
      end++;
    }
    out.push('', '---', '', ...lines.slice(start, end));
  }
  return (
    out
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trimEnd() + '\n'
  );
};

// ---- the zip -------------------------------------------------------------------------------

export const bundleFolder = (recordId: string): string => `${safeFileName(recordId)}-evidence`;

const json = (v: unknown): Uint8Array => strToU8(JSON.stringify(v, null, 2) + '\n');
const text = (s: string): Uint8Array => strToU8(s);

/** Every file in the bundle, by path inside the zip. */
export const bundleFiles = async (
  ev: Evidence,
  gathered: Gathered,
  options: EvidenceOptions,
): Promise<Record<string, Uint8Array>> => {
  const dir = bundleFolder(ev.record.id);
  const files: Record<string, Uint8Array> = {};
  const add = (path: string, bytes: Uint8Array) => {
    files[`${dir}/${path}`] = bytes;
  };
  const sigs = await signatureLines(
    ev.signatures,
    ev.record.fingerprint,
    ev.labReport?.fileSha256,
    subjectOf(ev.record.sealedFields),
    ev.labReport?.labSalt,
  );
  const ots = ev.proof && ev.batch && gathered.ots && ev.batch.opentimestamps.available ? gathered.ots : null;
  add('README.txt', text(readmeText(ev, sigs, ots !== null, options.dnaReportDatedBy, options.lockedParents)));
  add('verify.html', text(verifyPageHtml(ev, ots)));
  add('evidence.json', json(ev));
  add('record/sealed-fields.json', json(ev.record.sealedFields));
  add('record/sealed-fields.canonical.json', text(ev.record.canonical));
  add('record/proof-code.txt', text(`${ev.record.fingerprint}\n`));
  if (ev.proof && ev.batch) {
    add('proof/inclusion-proof.json', json(ev.proof));
    add('proof/batch-root.txt', text(`${ev.batch.root}\n`));
    add(
      'proof/root.bin',
      Uint8Array.from(ev.batch.root.match(/../g) ?? [], (b) => parseInt(b, 16)),
    );
    add(
      'proof/anchors.json',
      json({
        note: 'As VeilCore’s registry reported them. Look each transaction up on the named network: find the batch root in it.',
        batchId: ev.batch.batchId,
        batchRoot: ev.batch.root,
        current: ev.batch.anchor,
        earlier: ev.batch.earlierAnchors ?? 'not reported by this registry',
        opentimestamps: ev.batch.opentimestamps,
      }),
    );
    if (ots) add('proof/root.bin.ots', ots);
    const script = checkScriptFor(ev);
    if (script) add('proof/check-on-midnight.mjs', text(script));
  }
  if (ev.labReport) {
    add('lab/lab-report-pairing.json', json(ev.labReport));
    if (options.labFile && ev.labReport.fileIncluded) {
      // lab/report/ holds only this file, so it can't replace another file in the bundle.
      if (files[`${dir}/${ev.labReport.fileIncluded}`])
        throw new BundleRefusal('The bundle couldn’t be made. Nothing was downloaded.');
      add(ev.labReport.fileIncluded, options.labFile.bytes);
    }
  }
  if (ev.signatures.length) add('lab/signatures.json', json(ev.signatures));
  if (ev.key) add('key/key-binding.json', json(ev.key));
  add('spec/SPEC-sections.md', text(specSectionsText()));
  add(EXAMINER_FILE, text(examinerSummaryHtml(ev, sigs, ots !== null)));
  // Last: it lists every other file with its SHA-256.
  const others = Object.fromEntries(Object.entries(files).map(([k, v]) => [k.slice(dir.length + 1), v]));
  add(DECLARATION_FILE, text(await declarationText(ev, sigs, ots !== null, others)));
  return files;
};

/** The zip itself. */
export const zipFiles = (files: Record<string, Uint8Array>, at: Date = new Date()): Uint8Array =>
  zipSync(Object.fromEntries(Object.entries(files).map(([p, b]) => [p, [b, { mtime: at }]])), { level: 6 });

export const bundleName = (recordId: string): string => `${bundleFolder(recordId)}.zip`;

/** Gather, check, build and download. Returns words for the holder on any refusal. */
export const downloadEvidenceBundle = async (
  record: StrainRecord,
  keys: RecordKeys | undefined,
  options: EvidenceOptions,
): Promise<{ ok: true; name: string } | { error: string }> => {
  const gathered = await gatherEvidence(record);
  if ('error' in gathered) return gathered;
  // The sample details on this plant's deliveries: the holder's own, from the registry.
  // None (an older registry, no network) leaves them out; nothing else depends on them.
  const deliveries = options.deliveries ?? (await sentByMe());
  let zip: Uint8Array;
  try {
    const ev = await buildEvidence(record, gathered, { ...options, deliveries }, keys);
    zip = zipFiles(await bundleFiles(ev, gathered, options), options.now ?? new Date());
  } catch (e) {
    return { error: e instanceof BundleRefusal ? e.message : 'The bundle couldn’t be made. Nothing was downloaded.' };
  }
  const name = bundleName(record.id);
  const url = URL.createObjectURL(new Blob([zip as unknown as BlobPart], { type: 'application/zip' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { ok: true, name };
};
