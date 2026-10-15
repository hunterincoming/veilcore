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
import { checkProof } from '../proofs';
import { holderKeyIfAny } from '../holder';
import { isObject, isString, isNumber, readJson } from '../json';
import { DOCS, DOCS_COMMIT, DOCS_VERSION, REPO_VIEW } from '../docs';
import { verifyPageHtml, SDK_VERSION } from './verify-page';

const BASE = import.meta.env.VITE_API_BASE ?? '';

export const EVIDENCE_FORMAT = 'veilcore-evidence-bundle/v1';
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
  /** Lab signatures (attestations) about the record's fingerprint, as served. */
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
  } | null;
  readonly signatures: Record<string, unknown>[];
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
    .replace(/^\.+/, '')
    .trim()
    .slice(0, 120);
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

/** Thrown with words for the holder; nothing is downloaded. */
export class BundleRefusal extends Error {}

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
      'This record’s fingerprint doesn’t match its details, so a bundle couldn’t be tied to it. Nothing was downloaded.',
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
          `${options.labFile.name || 'That file'} isn’t the lab report saved to this plant, so it wasn’t included. Nothing was downloaded.`,
        );
      }
      fileSha256 = sha;
      fileIncluded = `lab/${safeFileName(options.labFile.name)}`;
    }
    labReport = {
      pairingFingerprint: record.dnaFingerprint,
      ...(fileSha256 ? { fileSha256 } : {}),
      ...(record.dnaFileName ? { fileName: record.dnaFileName } : {}),
      ...(record.dnaPairedAt ? { pairedAt: iso(record.dnaPairedAt) } : {}),
      ...(fileIncluded ? { fileIncluded } : {}),
    };
  } else if (options.labFile) {
    throw new BundleRefusal('No lab report is saved to this plant, so there is nothing to include.');
  }

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
    key,
  };
};

// ---- the words ---------------------------------------------------------------------------

/** A lab signature the holder's browser checked, for the README. */
type SignatureLine = { ok: boolean; withdrawn: boolean; text: string };

const TYPE_WORDS: Record<string, string> = {
  'laboratory-report': 'a lab report',
  'chain-of-custody': 'a receipt for a sample',
};

export const signatureLines = async (
  signatures: readonly Record<string, unknown>[],
  fingerprint: string,
  savedFileSha?: string,
): Promise<SignatureLine[]> => {
  const out: SignatureLine[] = [];
  for (const a of signatures) {
    const attester = isObject(a.attester) ? a.attester : {};
    const key = isString(attester.publicKey) ? attester.publicKey : '(no key)';
    const valid = await verifyAttestation(a as unknown as SignedAttestation).catch(() => false);
    if (!valid || a.subjectCommitment !== fingerprint) {
      out.push({
        ok: false,
        withdrawn: false,
        text: `A signature (${String(a.attestationId)}) that does not check. Ignore it.`,
      });
      continue;
    }
    const r = isObject(a.retraction) ? (a.retraction as unknown as Retraction) : null;
    const withdrawn = r ? await verifyRetraction(r, a as unknown as SignedAttestation).catch(() => false) : false;
    const what = TYPE_WORDS[String(a.type)] ?? `"${String(a.type)}"`;
    const name = isString(attester.displayName) ? ` (it calls itself "${attester.displayName}"; not checked)` : '';
    const saved = savedFileSha && a.documentHash === savedFileSha ? ' It is the lab report saved to this plant.' : '';
    const text =
      `The key ${key}${name} signed ${what} with SHA-256 ${String(a.documentHash)}, about this record, at ${String(a.issuedAt)} (the signer's own clock).${saved}` +
      (withdrawn && r ? ` The same key withdrew it at ${r.retractedAt} (${r.reason}).` : '');
    out.push({ ok: true, withdrawn, text });
  }
  return out;
};

const NETWORK_WORDS: Record<string, string> = {
  mainnet: "Midnight's main network",
  preprod: 'Midnight preprod (a test network)',
  preview: 'Midnight Preview (a test network)',
};
const networkWords = (n: unknown): string => (isString(n) && NETWORK_WORDS[n]) || `the Midnight network "${String(n)}"`;

const wrap = (text: string, width = 78): string =>
  text
    .split('\n')
    .map((line) => {
      if (line.length <= width) return line;
      const indent = /^\s*(- |\d+\. )?/.exec(line)?.[0].replace(/[^ ]/g, ' ') ?? '';
      const words = line.split(' ');
      const lines: string[] = [];
      let cur = '';
      for (const w of words) {
        if (cur && (cur + ' ' + w).length > width) {
          lines.push(cur);
          cur = indent + w;
        } else cur = cur ? `${cur} ${w}` : w;
      }
      if (cur) lines.push(cur);
      return lines.join('\n');
    })
    .join('\n');

/** README.txt: what each file is, what it proves, what it doesn't. Plain words. */
export const readmeText = (ev: Evidence, sigs: readonly SignatureLine[]): string => {
  const name = isString(ev.record.sealedFields.strainName) ? ev.record.sealedFields.strainName : ev.record.id;
  const anchor = ev.batch?.anchor ?? null;
  const tx = anchor && isString(anchor.txHash) ? anchor.txHash : null;
  const test = anchor ? anchor.network !== 'mainnet' : true;
  const bitcoin = ev.batch?.opentimestamps.available ? ev.batch.opentimestamps : null;
  const L: string[] = [];
  L.push(`VeilCore evidence bundle: ${name} (${ev.record.id})`);
  L.push(`Made ${ev.createdAt} by the VeilCore site, from the holder's own copy of the record.`);
  L.push('');
  L.push('WHAT THIS IS');
  L.push(
    "Everything needed to check this record's date without VeilCore: the record exactly as it was sealed, the proof that its fingerprint is in a batch, where that batch was recorded, and verify.html, a page that does the checks on your own computer with no internet.",
  );
  if (test) {
    L.push('');
    L.push(
      anchor
        ? `This record is dated on ${networkWords(anchor.network)}. A test network can be reset and its dates carry no weight: treat this as practice data.`
        : 'This record is not dated on any network yet. Until it is, nothing here dates it.',
    );
  }
  L.push('');
  L.push('HOW TO CHECK IT (nothing from VeilCore needed)');
  L.push(
    '1. Open verify.html in Chrome or Firefox (double-click it). It works offline. It should say "Fingerprint matches" and, once the record is in a batch, "Proof leads to the batch root".',
  );
  if (ev.batch && tx && anchor) {
    L.push(
      `2. Date it: on a Midnight explorer for ${networkWords(anchor.network)}, find transaction ${tx}${isNumber(anchor.blockHeight) ? ` (block ${anchor.blockHeight})` : ''}. Check that it calls contract ${isString(anchor.contractAddress) ? anchor.contractAddress : '(not given)'} and records the batch root ${ev.batch.root}. If it does, this record existed, unchanged, by that transaction's time.`,
    );
  } else if (ev.batch) {
    L.push(
      `2. Date it: the batch (${ev.batch.batchId}) isn't recorded on Midnight yet. Download a new bundle once it is.`,
    );
  } else {
    L.push("2. Date it: the record isn't in a batch yet. Download a new bundle once it is.");
  }
  if (bitcoin) {
    L.push(
      `3. Bitcoin: the batch root was also stamped with OpenTimestamps. Drop proof/root.bin.ots and proof/root.bin on opentimestamps.org, or run "ots verify root.bin.ots" in the proof folder with the official OpenTimestamps client.${bitcoin.status === 'bitcoin' ? '' : ' This stamp was still pending when the bundle was made: run "ots upgrade root.bin.ots" first (it needs the internet once).'}`,
    );
  }
  if (ev.batch?.earlierAnchors && ev.batch.earlierAnchors.length) {
    for (const a of ev.batch.earlierAnchors) {
      L.push(
        `   Earlier, the same root was recorded on ${networkWords(a.network)} in transaction ${String(a.txHash)}. A later anchor took its place; both are listed in proof/anchors.json.`,
      );
    }
  }
  L.push('');
  L.push('WHAT EACH FILE IS');
  L.push(
    '- verify.html: the offline check page. Everything it needs is inside it; read its script to see exactly what it does.',
  );
  L.push('- evidence.json: everything below in one machine-readable file (verify.html carries a copy).');
  L.push('- record/sealed-fields.json: the record exactly as it was fingerprinted, made readable.');
  L.push('- record/sealed-fields.canonical.json: the exact bytes that were hashed (spec section 4.4).');
  L.push(
    `- record/fingerprint.txt: the record's fingerprint. ${ev.record.fingerprintAlgorithm === KEY_BOUND_ALGORITHM ? 'This record names its own key, so the fingerprint is H("veilcore:v1:keyrecord", keyBinding, SHA-256 of the canonical bytes) (spec section 3.6.1).' : 'It is the SHA-256 of the canonical bytes.'}`,
  );
  if (ev.proof) {
    L.push('- proof/inclusion-proof.json: the path from the fingerprint to the batch root (spec section 5.4).');
    L.push(
      '- proof/batch-root.txt and proof/root.bin: the batch root, as text and as the 32 bytes the Bitcoin stamp covers.',
    );
    L.push("- proof/anchors.json: where the batch root was recorded, as VeilCore's registry reported it.");
  }
  if (bitcoin) L.push('- proof/root.bin.ots: the Bitcoin stamp file (OpenTimestamps) for root.bin.');
  if (ev.labReport) {
    L.push(
      `- lab/lab-report-pairing.json: the lab report saved to this plant: its SHA-256${ev.labReport.fileSha256 ? '' : ' (not kept for this older pairing)'} and the pairing fingerprint (spec section 3.7).`,
    );
    if (ev.labReport.fileIncluded)
      L.push(`- ${ev.labReport.fileIncluded}: the lab report file itself, included by the holder.`);
  }
  if (ev.signatures.length)
    L.push('- lab/signatures.json: lab signatures about this record, as the registry stores them.');
  if (ev.key) {
    L.push(
      "- key/key-binding.json: the record's key and the salt that ties it to the record. Included by the holder: with it, anyone can tie this record to everything its key does on the network.",
    );
  }
  L.push(
    `- spec/SPEC-sections.md: the parts of the record format these checks follow (spec ${ev.spec.version.replace(/^Version /, 'version ').replace(/ \(.*$/, '')}).`,
  );
  L.push('');
  L.push('WHAT THIS PROVES, once step 2 or 3 checks out');
  L.push(
    '- This record existed, unchanged, by the date of that transaction (or Bitcoin block). Whoever had it sealed held this record by that date.',
  );
  if (ev.key) L.push("- The record named this key when it was sealed, so the key can't have been swapped since.");
  for (const s of sigs) L.push(`- ${s.text}`);
  L.push('');
  L.push('WHAT THIS DOES NOT PROVE');
  L.push('- That anything the record says is true: the name, who bred it, the stated date. The breeder wrote those.');
  L.push('- Who holds the plant or the record now.');
  L.push("- That a signing key belongs to the lab it names. VeilCore doesn't vouch for anyone.");
  L.push(
    "- Any date at all until you find the batch root in the named transaction (or the Bitcoin stamp checks). VeilCore's registry reported the transaction; it has not been checked on the chain for you.",
  );
  if (ev.labReport) {
    L.push(
      "- When the lab report was saved to the plant. That came after sealing and isn't inside the record's fingerprint, so the batch doesn't date it.",
    );
  }
  if (ev.registry.firstSeen)
    L.push(
      `- The registry first saw this record at ${ev.registry.firstSeen}. That is the registry's own clock, its word only.`,
    );
  L.push(
    `- The sealing time in the record (${ev.record.sealedAtDeviceClock}) is the holder's device clock, the holder's word only.`,
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
  const sigs = await signatureLines(ev.signatures, ev.record.fingerprint, ev.labReport?.fileSha256);
  add('README.txt', text(readmeText(ev, sigs)));
  add('verify.html', text(verifyPageHtml(ev)));
  add('evidence.json', json(ev));
  add('record/sealed-fields.json', json(ev.record.sealedFields));
  add('record/sealed-fields.canonical.json', text(ev.record.canonical));
  add('record/fingerprint.txt', text(`${ev.record.fingerprint}\n`));
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
    if (gathered.ots && ev.batch.opentimestamps.available) add('proof/root.bin.ots', gathered.ots);
  }
  if (ev.labReport) {
    add('lab/lab-report-pairing.json', json(ev.labReport));
    if (options.labFile && ev.labReport.fileIncluded) {
      files[`${dir}/${ev.labReport.fileIncluded}`] = options.labFile.bytes;
    }
  }
  if (ev.signatures.length) add('lab/signatures.json', json(ev.signatures));
  if (ev.key) add('key/key-binding.json', json(ev.key));
  add('spec/SPEC-sections.md', text(specSectionsText()));
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
  let zip: Uint8Array;
  try {
    const ev = await buildEvidence(record, gathered, options, keys);
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
