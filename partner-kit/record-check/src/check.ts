// One call for a partner that requires a VeilCore record: give it the check link the
// depositor pasted, get back a plain JSON answer saying what was checked, by whom, and what
// none of it shows.
//
// Runs in Node and in a browser (WebCrypto and fetch only). It asks the registry the
// PARTNER names, through its public routes, no key and no account:
//   GET /verify/:id                        the record, as its holder chose to share it
//   GET /proof/:fingerprint                its inclusion proof (batch, root, date stamp)
//   GET /attestations/subject/:fingerprint lab signatures about it
// and then checks for itself whatever can be checked: the link's fingerprint against the
// registry's answer, the inclusion proof folding to its batch root, every signature and
// withdrawal, the lab report pairing, the record's key against the fingerprint, and (when
// the depositor disclosed them) the sealed fields against the fingerprint. The date stamp
// is looked up on Midnight only when an anchor checker is given (the Node entry wires
// @veilcore/contracts' checkBatchAnchor); otherwise it is reported as the registry's word.
//
// VeilCore never vouches. Nothing here is a verdict about the material: the answer says
// which facts were checked and which are someone's word, and the partner decides.
// SPDX-License-Identifier: Apache-2.0

import { COMMITMENT_ALGORITHM, verifyInclusion, type InclusionProof } from 'veilcore-records';
import { fingerprintOfFields, isHex64, keyMatchesFingerprint } from './hash.js';
import { CUT, LinkError, parseCheckLink, type CheckLink } from './link.js';
import { checkSignatures, cleanName, type CustodyEntry, type LabReceipt } from './signatures.js';

/** VeilCore's public registry. A partner may name another (or a copy it runs). */
export const DEFAULT_REGISTRY = 'https://veilcore-api-production.up.railway.app';
export const FORMAT = 'veilcore-record-check/v1';

/** The answer of a date stamp look-up on Midnight. */
export type AnchorLookup =
  | { readonly status: 'checked'; readonly blockHeight?: number; readonly blockTime: number }
  | { readonly status: 'not-confirmed'; readonly reason: string }
  | { readonly status: 'unreachable'; readonly reason: string }
  | { readonly status: 'not-checked'; readonly reason: string };

/**
 * Looks a batch root's date stamp up on chain: the transaction the registry names must be
 * VeilCore's date stamp call, at the contract the checker pins (never the address the
 * registry names), and have written exactly `root`. Never throws.
 */
export type AnchorChecker = (a: {
  readonly network: string;
  readonly txId: string;
  readonly root: string;
}) => Promise<AnchorLookup>;

export type CheckOptions = {
  /** The registry to ask. Default: VeilCore's public registry. Never taken from the link. */
  readonly registry?: string;
  /**
   * The record's sealed fields, when the depositor disclosed them: the evidence bundle's
   * record/sealed-fields.json, or an export's `org.veilcore.registered-fingerprint` block
   * (whose `fields` are then used). They are hashed here, exactly as given, and must give
   * the link's fingerprint. Any other object is hashed whole: a `fields` key inside
   * something else is not unwrapped.
   */
  readonly fields?: unknown;
  /** Looks the date stamp up on Midnight. Without it the date is the registry's report. */
  readonly checkAnchor?: AnchorChecker;
  readonly fetch?: typeof fetch;
  /** Per request. Default 15 s. */
  readonly timeoutMs?: number;
  /** For tests: the clock name checks are judged by. */
  readonly now?: number;
};

export type DatedStatus =
  /** Looked up on Midnight: that transaction wrote this batch root; the block is the date. */
  | 'checked-on-chain'
  /** The registry reports a date stamp; not looked up here. */
  | 'reported'
  /** Looked up, and the chain does not bear the registry's report out. */
  | 'not-confirmed'
  /** The registry sent an inclusion proof and it does not check out for this fingerprint. */
  | 'proof-fails'
  /** The look-up could not be made (indexer unreachable, network not supported). */
  | 'not-looked-up'
  /** In a sealed batch; no date stamp yet. */
  | 'no-date-stamp'
  /** Not in a batch, as far as can be checked. */
  | 'not-in-a-batch'
  /** Nothing to check against: the link names no fingerprint, or another one. */
  | 'not-checked';

export type Dated = {
  readonly status: DatedStatus;
  /** True only for 'checked-on-chain'. */
  readonly checkedOnChain: boolean;
  /** The inclusion proof was checked here: the fingerprint is in the batch and folds to its root. */
  readonly inBatch: boolean;
  readonly batch: string | null;
  readonly batchRoot: string | null;
  readonly network: string | null;
  /** A test network can be reset; its dates carry no evidential weight. */
  readonly testNetwork: boolean | null;
  readonly txId: string | null;
  /** From the chain, only when checked there. */
  readonly blockHeight: number | null;
  /** ISO 8601 UTC, from the chain, only when checked there. */
  readonly blockTime: string | null;
  /** The date the registry reports for the stamp: its word. */
  readonly reportedDate: string | null;
  /** The registry reports a Bitcoin stamp file (OpenTimestamps) for the batch: 'pending' is a calendar's promise. */
  readonly bitcoinStamp: 'bitcoin' | 'pending' | null;
  readonly reason: string;
};

export type KeyBound = {
  /** The registry's report that the record names its key (records sealed since 14 October 2026). */
  readonly recordNamesKey: boolean | null;
  /**
   * The key in the link (chain=, ks=, cd=), matched to the fingerprint here: 'matches' says
   * the record named this key when it was sealed.
   */
  readonly keyInLink: 'matches' | 'does-not-match' | 'incomplete' | 'not-given';
  readonly key: string | null;
  readonly reason: string;
};

export type RecordCheck = {
  readonly format: typeof FORMAT;
  readonly checkedAt: string;
  readonly registry: string;
  readonly recordId: string;
  /** The registry has a record with this id. */
  readonly recordExists: boolean;
  /**
   * The link names a fingerprint and the registry reports the same one for this id. null:
   * the link names none (a bare id or an old link), so nothing could be tied to the link.
   * false: do not rely on anything about this record; nothing else was checked.
   */
  readonly fingerprintMatches: boolean | null;
  /** The link looks cut off (its fingerprint stops short): ask for the whole link. */
  readonly linkLooksCut: boolean;
  readonly fingerprint: string | null;
  /** The disclosed sealed fields hash to the fingerprint (null: none were given). */
  readonly disclosedFieldsMatch: boolean | null;
  readonly dated: Dated;
  readonly keyBound: KeyBound;
  readonly labReceipts: readonly LabReceipt[];
  /** How many signatures the registry holds about the fingerprint (it sends at most 100). */
  readonly labReceiptsTotal: number;
  /** The registry's clock: when it first stored this content. Its word. */
  readonly registryFirstSeen: string | null;
  /** The holder has replaced this record with a corrected one. */
  readonly supersededBy: string | null;
  /**
   * The name the holder typed for the material (their word), cleaned: from the link (after
   * the #), or the one the holder published. null: the holder didn't include it in the link.
   */
  readonly nameByHolder: string | null;
  /** One plain paragraph saying the above. */
  readonly summary: string;
  readonly whatThisDoesNotShow: readonly string[];
  /** Things that could not be checked, in plain words. */
  readonly problems: readonly string[];
};

export class RegistryError extends Error {}
export { LinkError };

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const MAX_DEPTH = 64;

const isProof = (v: unknown): v is InclusionProof =>
  isObject(v) &&
  isHex64(v.commitment) &&
  isHex64(v.root) &&
  typeof v.batchId === 'string' &&
  Array.isArray(v.path) &&
  v.path.length <= MAX_DEPTH &&
  v.path.every((s) => isObject(s) && isHex64(s.sibling) && typeof s.siblingIsLeft === 'boolean') &&
  (v.anchor === undefined || v.anchor === null || isObject(v.anchor));

const iso = (ms: number): string => new Date(ms).toISOString();

/** The base list: true of every record, whatever was checked. */
const NEVER_SHOWN = [
  'What the material is. VeilCore never sees genetics: a record is the holder’s description, made into a proof code.',
  'That the description is true. A proof code shows the record hasn’t changed since it was sealed, not that what it says is right.',
  'Who holds the material, or the record, now. A date stamp can be made by anyone, and being in a batch is not possession; to see who controls the record now, ask the holder to prove it on the check page.',
  'That a lab’s work is right. A verified signature shows a key signed; a checked name shows VeilCore’s operator matched that key’s name to a public listing on a day. VeilCore doesn’t vouch for the lab.',
  'Parentage or lineage. Parents named in a record are the holder’s word.',
  'Any right, licence or legal status, or that the material meets any rule.',
];

/**
 * Check a record from its check link. Throws LinkError for a link that names no record and
 * RegistryError when the registry can't be asked; anything else is in the answer.
 */
export const checkRecord = async (linkOrId: string, opts: CheckOptions = {}): Promise<RecordCheck> => {
  const link: CheckLink = parseCheckLink(linkOrId);
  const registry = (opts.registry ?? DEFAULT_REGISTRY).replace(/\/+$/, '');
  if (!/^https?:\/\/[^/?#]+(\/[^?#]*)?$/.test(registry))
    throw new RegistryError('The registry address is not a web address.');
  const doFetch = opts.fetch ?? globalThis.fetch.bind(globalThis);
  const timeoutMs = opts.timeoutMs ?? 15_000;
  const now = opts.now ?? Date.now();
  const problems: string[] = [];
  const cut = link.fingerprint.state === 'invalid' && link.fingerprint.cut === true;

  const get = async (path: string): Promise<{ status: number; body: unknown }> => {
    const res = await doFetch(`${registry}${path}`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
      // No cookies or credentials: the check is anonymous by design.
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    });
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    return { status: res.status, body };
  };

  // 1. The record.
  const showQ = link.show !== undefined ? `?show=${encodeURIComponent(link.show)}` : '';
  let rec: { status: number; body: unknown };
  try {
    rec = await get(`/verify/${encodeURIComponent(link.recordId)}${showQ}`);
  } catch {
    throw new RegistryError('The registry did not answer. Nothing was checked; try again shortly.');
  }
  if (rec.status === 429) throw new RegistryError('The registry is limiting requests; try again in a minute.');
  const r = rec.body;
  if (rec.status === 404 || (isObject(r) && r.found === false)) {
    return finish({
      registry,
      recordId: link.recordId,
      recordExists: false,
      fingerprintMatches: null,
      linkLooksCut: cut,
      fingerprint: link.fingerprint.state === 'given' ? link.fingerprint.value : null,
      disclosedFieldsMatch: null,
      dated: notChecked('No record with this id in the registry.'),
      keyBound: { recordNamesKey: null, keyInLink: 'not-given', key: null, reason: 'No record.' },
      labReceipts: [],
      labReceiptsTotal: 0,
      registryFirstSeen: null,
      supersededBy: null,
      nameByHolder: null,
      problems,
    });
  }
  if (rec.status !== 200 || !isObject(r) || r.found !== true)
    throw new RegistryError(`The registry’s answer could not be read (status ${rec.status}). Nothing was checked.`);

  const reported = isHex64(r.recordFingerprint) ? r.recordFingerprint : null;
  const base = {
    registry,
    recordId: link.recordId,
    recordExists: true as const,
    linkLooksCut: cut,
    registryFirstSeen: typeof r.registryFirstSeen === 'string' ? r.registryFirstSeen : null,
    supersededBy:
      typeof r.supersededBy === 'string' && r.supersededBy.length <= 128 ? cleanName(r.supersededBy, 128) : null,
    // From the holder's link, after the # (round 5: the registry no longer has it), else the
    // one the holder published on purpose, or a record saved before names were sealed.
    nameByHolder: cleanName(link.name ?? r.cultivar),
  };

  // 2. Which fingerprint the rest is checked against. Only the link's, and only when the
  // registry reports the same: otherwise a registry could answer one id with another
  // record's fingerprint and borrow its proof and signatures.
  let fingerprintMatches: boolean | null;
  let fingerprint: string | null;
  if (link.fingerprint.state === 'given') {
    fingerprintMatches = reported === link.fingerprint.value;
    fingerprint = link.fingerprint.value;
  } else if (link.fingerprint.state === 'invalid') {
    fingerprintMatches = false;
    fingerprint = null;
    problems.push(cut ? CUT : 'The proof code in the link is damaged (it should be 64 hexadecimal characters).');
  } else {
    fingerprintMatches = null;
    fingerprint = reported;
  }
  const bound = fingerprintMatches === true;

  // 3. Disclosed fields, hashed here.
  let disclosedFieldsMatch: boolean | null = null;
  let fieldsContentHash: string | undefined;
  if (opts.fields !== undefined) {
    const block = registeredBlock(opts.fields);
    const fields = block ? block.fields : opts.fields;
    try {
      const f = await fingerprintOfFields(fields);
      fieldsContentHash = f.contentHash;
      disclosedFieldsMatch = fingerprint !== null && f.fingerprint === fingerprint;
      if (!disclosedFieldsMatch)
        problems.push(
          isObject(opts.fields) && 'fields' in opts.fields && !block
            ? 'The sealed fields given do not hash to the record’s proof code. They were hashed whole, as given: give record/sealed-fields.json from the evidence bundle, or an export’s org.veilcore.registered-fingerprint block as it is.'
            : 'The sealed fields given do not hash to the record’s proof code: they are not the fields it was sealed with.',
        );
    } catch (e) {
      disclosedFieldsMatch = false;
      problems.push(`The sealed fields given could not be hashed: ${e instanceof Error ? e.message : String(e)}.`);
    }
  }

  // 4. Key binding.
  const keyBound = await keyCheck(link, r.keyBound, bound ? fingerprint : null, fieldsContentHash);

  if (fingerprintMatches === false || fingerprint === null) {
    if (fingerprintMatches === false && link.fingerprint.state === 'given')
      problems.push(
        'The link was made for a different proof code than the registry reports for this id. Do not rely on it; ask the depositor for the record’s current check link.',
      );
    if (fingerprint === null && fingerprintMatches !== false)
      problems.push('The record carries no proof code (nothing was sealed), so nothing about it can be checked.');
    return finish({
      ...base,
      fingerprintMatches,
      fingerprint: link.fingerprint.state === 'given' ? link.fingerprint.value : reported,
      disclosedFieldsMatch,
      dated: notChecked(
        cut
          ? 'The link looks cut off, so there is no proof code to check.'
          : fingerprintMatches === false
            ? 'The link and the registry disagree about the proof code.'
            : 'Nothing is sealed.',
      ),
      keyBound,
      labReceipts: [],
      labReceiptsTotal: 0,
      problems,
    });
  }
  if (fingerprintMatches === null)
    problems.push(
      'The link names no proof code, so the checks below used the registry’s proof code and can’t be tied to the link. Ask the depositor for the check link the site makes (it contains ?fp=…).',
    );

  // 5. Inclusion proof and signatures, in parallel.
  const [proofRes, attRes] = await Promise.all([
    get(`/proof/${fingerprint}`).catch(() => null),
    get(`/attestations/subject/${fingerprint}?limit=100`).catch(() => null),
  ]);

  const dated = await dateOf(proofRes, fingerprint, opts.checkAnchor, problems);

  let labReceipts: LabReceipt[] = [];
  let labReceiptsTotal = 0;
  if (attRes === null || attRes.status !== 200 || !isObject(attRes.body) || !Array.isArray(attRes.body.attestations)) {
    problems.push('The registry did not send the lab signatures, so none were checked.');
  } else {
    const savedShared = typeof r.dnaPairedByHolder === 'boolean';
    const out = await checkSignatures(attRes.body.attestations, fingerprint, {
      now,
      custody: custodyOf(r.custody),
      savedReport: savedShared
        ? {
            paired: r.dnaPairedByHolder === true,
            binding: isHex64(r.dnaPairBinding) ? r.dnaPairBinding : null,
            // The binding names the record's proof code: only the link's own, once the registry
            // reports the same one, with the salt from after the #.
            dna: link.dnaSalt && bound && fingerprint ? { salt: link.dnaSalt, identity: fingerprint } : null,
          }
        : undefined,
    });
    labReceipts = out.receipts;
    labReceiptsTotal = typeof attRes.body.total === 'number' ? attRes.body.total : labReceipts.length;
    if (out.dropped > 0)
      problems.push(
        `${out.dropped} signature${out.dropped === 1 ? '' : 's'} in the registry’s answer ${out.dropped === 1 ? 'is' : 'are'} not about this proof code or could not be read, so ${out.dropped === 1 ? 'it was' : 'they were'} left out.`,
      );
  }

  return finish({
    ...base,
    fingerprintMatches,
    fingerprint,
    disclosedFieldsMatch,
    dated,
    keyBound,
    labReceipts,
    labReceiptsTotal,
    problems,
  });
};

/** The key-bound algorithm name an export's registered-fingerprint block uses (the site's KEY_BOUND_ALGORITHM). */
const KEY_BOUND_ALGORITHM = 'sha256/key-bound/v1';
const BLOCK_KEYS = new Set(['fingerprint', 'algorithm', 'recompute', 'fields', 'sealedAt', 'notCovered']);

/**
 * An export's org.veilcore.registered-fingerprint block, exactly: its algorithm marker, an
 * object of fields, and no keys the export doesn't write. Anything else is not unwrapped.
 */
const registeredBlock = (v: unknown): { fields: Record<string, unknown> } | null =>
  isObject(v) &&
  isObject(v.fields) &&
  (v.algorithm === COMMITMENT_ALGORITHM || v.algorithm === KEY_BOUND_ALGORITHM) &&
  Object.keys(v).every((k) => BLOCK_KEYS.has(k))
    ? { fields: v.fields }
    : null;

/** The sample-detail field names a sender's summary may list (never their values). */
const CUSTODY_FIELD_NAMES: readonly string[] = [
  'sampleId',
  'sealNumber',
  'takenFrom',
  'takenOn',
  'witness',
  'sealIntact',
  'arrivedOn',
  'condition',
  'labRef',
];

const isCoveredState = (v: unknown): v is 'covered' | 'changed' | 'not-covered' =>
  v === 'covered' || v === 'changed' || v === 'not-covered';

/**
 * The registry's list of lab receipts tied to deliveries of this record (sent when the
 * holder shares lab status): which receipt, whether its signature covers the sample details
 * recorded on the delivery, and how what arrived differs from what was sent. Anything out
 * of shape is dropped.
 */
const custodyOf = (v: unknown): CustodyEntry[] | undefined => {
  if (!Array.isArray(v)) return undefined;
  const out: CustodyEntry[] = [];
  for (const e of v.slice(0, 200)) {
    if (!isObject(e) || typeof e.receiptAttestationId !== 'string' || !e.receiptAttestationId) continue;
    // Sealed sample details (the registry can't read them) or removed ones: no `covered`.
    if (e.custody === 'sealed' || e.custody === 'removed') {
      const s = isObject(e.custodySummary) ? e.custodySummary : undefined;
      const covered: unknown = s?.covered;
      const summary =
        e.custody === 'sealed' &&
        e.custodySummaryBy === 'holder' &&
        s &&
        isCoveredState(covered) &&
        Array.isArray(s.differingFields)
          ? {
              covered,
              differingFields: s.differingFields.filter(
                (f): f is string => typeof f === 'string' && CUSTODY_FIELD_NAMES.includes(f),
              ),
            }
          : undefined;
      out.push({
        receiptAttestationId: e.receiptAttestationId,
        differences: [],
        custody: e.custody,
        ...(summary ? { custodySummary: summary } : {}),
      });
      continue;
    }
    if (e.covered !== 'covered' && e.covered !== 'changed' && e.covered !== 'not-covered') continue;
    const differences = Array.isArray(e.differences)
      ? e.differences
          .slice(0, 20)
          .map((d) => cleanName(d, 300))
          .filter((d): d is string => d !== null)
      : [];
    out.push({ receiptAttestationId: e.receiptAttestationId, covered: e.covered, differences });
  }
  return out;
};

const notChecked = (reason: string): Dated => ({
  status: 'not-checked',
  checkedOnChain: false,
  inBatch: false,
  batch: null,
  batchRoot: null,
  network: null,
  testNetwork: null,
  txId: null,
  blockHeight: null,
  blockTime: null,
  reportedDate: null,
  bitcoinStamp: null,
  reason,
});

const dateOf = async (
  res: { status: number; body: unknown } | null,
  fingerprint: string,
  checkAnchor: AnchorChecker | undefined,
  problems: string[],
): Promise<Dated> => {
  if (res === null) {
    problems.push('The registry did not answer for the inclusion proof, so the date was not checked.');
    return { ...notChecked('The registry did not answer for the inclusion proof.'), status: 'not-in-a-batch' };
  }
  if (res.status === 404)
    return { ...notChecked('Not in a batch yet, so there is no date stamp.'), status: 'not-in-a-batch' };
  const p = res.body;
  // A proof about another fingerprint folds to its root just as well; it says nothing here.
  if (!isProof(p) || p.commitment !== fingerprint || !(await verifyInclusion(p).catch(() => false))) {
    problems.push(
      'The registry’s inclusion proof does not check out for this proof code, so the date was not checked.',
    );
    return {
      ...notChecked('The registry sent an inclusion proof that does not check out for this proof code.'),
      status: 'proof-fails',
    };
  }
  const a = isObject(p.anchor) ? p.anchor : null;
  const anchors: unknown = (p as unknown as Record<string, unknown>).anchors;
  const ots = Array.isArray(anchors)
    ? (anchors.find((x) => isObject(x) && x.kind === 'opentimestamps') as Record<string, unknown> | undefined)
    : undefined;
  const network = a && typeof a.network === 'string' ? a.network.slice(0, 40) : null;
  const txId =
    a && typeof a.txHash === 'string' && /^(0x)?[0-9a-fA-F]{64}$/.test(a.txHash)
      ? a.txHash.toLowerCase().replace(/^0x/, '')
      : null;
  const common = {
    inBatch: true,
    batch: p.batchId.slice(0, 128),
    batchRoot: p.root,
    network,
    testNetwork: network === null ? null : network !== 'mainnet',
    txId,
    reportedDate: a && typeof a.anchoredAt === 'string' ? a.anchoredAt.slice(0, 40) : null,
    bitcoinStamp: ots ? (ots.status === 'bitcoin' ? ('bitcoin' as const) : ('pending' as const)) : null,
    blockHeight: null,
    blockTime: null,
    checkedOnChain: false,
  };
  if (!a || !network || !txId)
    return { ...common, status: 'no-date-stamp', reason: 'In a sealed batch; the batch has no date stamp yet.' };
  if (!checkAnchor)
    return {
      ...common,
      status: 'reported',
      reason: `The registry reports the batch root was recorded on ${network} in transaction ${txId}. Not looked up here: until it is, the date is the registry’s word.`,
    };
  let r: AnchorLookup;
  try {
    r = await checkAnchor({ network, txId, root: p.root });
  } catch (e) {
    r = { status: 'not-checked', reason: e instanceof Error ? e.message : String(e) };
  }
  if (r.status === 'checked')
    return {
      ...common,
      status: 'checked-on-chain',
      checkedOnChain: true,
      blockHeight: r.blockHeight ?? null,
      blockTime: iso(r.blockTime),
      reason: `Looked up on ${network}: transaction ${txId} is VeilCore’s date stamp call and wrote this batch root${
        r.blockHeight === undefined ? '' : ` in block ${r.blockHeight}`
      }, ${iso(r.blockTime)}.`,
    };
  if (r.status === 'not-confirmed') {
    problems.push(`The date stamp the registry reports was not confirmed on ${network}: ${r.reason}`);
    return { ...common, status: 'not-confirmed', reason: r.reason };
  }
  problems.push(`The date stamp could not be looked up on ${network}: ${r.reason}`);
  return { ...common, status: 'not-looked-up', reason: r.reason };
};

const keyCheck = async (
  link: CheckLink,
  reportedBound: unknown,
  fingerprint: string | null,
  fieldsContentHash: string | undefined,
): Promise<KeyBound> => {
  const recordNamesKey = typeof reportedBound === 'boolean' ? reportedBound : null;
  const k = link.key;
  if (!k) {
    return {
      recordNamesKey,
      keyInLink: 'not-given',
      key: null,
      reason:
        recordNamesKey === true
          ? 'The registry reports the record names its key; the link doesn’t carry it, so it was not matched here.'
          : recordNamesKey === false
            ? 'The registry reports an older record that names no key.'
            : 'No key in the link.',
    };
  }
  const contentHash = k.contentHash ?? fieldsContentHash;
  if (!isHex64(k.key) || !isHex64(k.keySalt) || !isHex64(contentHash) || fingerprint === null)
    return {
      recordNamesKey,
      keyInLink: 'incomplete',
      key: isHex64(k.key) ? k.key : null,
      reason:
        fingerprint === null
          ? 'The key was not matched: it is matched only to a proof code the link names and the registry reports.'
          : 'The link carries part of the key’s details (chain=, ks=, cd=), not all, so it was not matched.',
    };
  const ok = await keyMatchesFingerprint(k.key, k.keySalt, contentHash, fingerprint);
  return {
    recordNamesKey,
    keyInLink: ok ? 'matches' : 'does-not-match',
    key: k.key,
    reason: ok
      ? 'Matched here: the record named this key when it was sealed. That is not who controls the key now.'
      : 'The key in the link is not the one this record named when it was sealed.',
  };
};

type Parts = Omit<RecordCheck, 'format' | 'checkedAt' | 'summary' | 'whatThisDoesNotShow'>;

const finish = (p: Parts): RecordCheck => {
  const extra: string[] = [];
  if (p.dated.testNetwork)
    extra.push('A date on a test network: test networks can be reset, so the date carries no evidential weight.');
  if (p.dated.status === 'reported')
    extra.push(
      'The date itself, until the transaction is looked up on Midnight (give an indexer, or open the record’s check page).',
    );
  if (p.fingerprintMatches === null && p.recordExists)
    extra.push('That this answer is about the record the depositor meant: the link names no proof code.');
  return {
    format: FORMAT,
    checkedAt: new Date().toISOString(),
    ...p,
    summary: summaryOf(p),
    whatThisDoesNotShow: [...NEVER_SHOWN, ...extra],
  };
};

/**
 * Whether an answer is one a partner can accept without reading further: the record
 * exists, the link's fingerprint matches, and nothing contradicts it (the sealed fields
 * given, the key in the link, the registry's inclusion proof, the date stamp when looked
 * up), and the date is not on a test network unless `allowTestNetwork`. The CLI's exit 0
 * and the form field's validity. Not a verdict about the material.
 */
export const acceptable = (c: RecordCheck | null, o: { allowTestNetwork?: boolean } = {}): boolean =>
  !!c &&
  c.recordExists &&
  c.fingerprintMatches === true &&
  !c.linkLooksCut &&
  c.disclosedFieldsMatch !== false &&
  c.keyBound.keyInLink !== 'does-not-match' &&
  c.dated.status !== 'not-confirmed' &&
  c.dated.status !== 'proof-fails' &&
  (o.allowTestNetwork === true || c.dated.testNetwork !== true);

/** One plain paragraph. Never says the material is anything. */
export const summaryOf = (p: Parts): string => {
  if (p.linkLooksCut) return `${CUT} Nothing was checked.`;
  if (!p.recordExists) return `No record with id ${p.recordId} in the registry. Check the link is complete.`;
  if (p.fingerprintMatches === false)
    return 'Do not rely on this link: it was made for a different proof code than the registry reports for this record. Nothing was checked. Ask the depositor for the record’s current check link.';
  if (p.fingerprint === null) return 'Record found, but nothing in it is sealed, so nothing could be checked.';
  const parts: string[] = [];
  parts.push(
    p.fingerprintMatches
      ? 'Record found, and the link’s proof code matches the registry’s.'
      : 'Record found. The link names no proof code, so what follows is about the registry’s proof code for this id.',
  );
  if (p.disclosedFieldsMatch === true) parts.push('The sealed fields given hash to that proof code.');
  if (p.disclosedFieldsMatch === false) parts.push('The sealed fields given do not hash to that proof code.');
  const d = p.dated;
  parts.push(
    d.status === 'checked-on-chain'
      ? `Date stamp checked on ${d.network}${d.testNetwork ? ' (a test network)' : ''}: ${d.blockTime}.`
      : d.status === 'reported'
        ? `In batch ${d.batch}; the registry reports a date stamp on ${d.network}${d.testNetwork ? ' (a test network)' : ''}, not looked up here.`
        : d.status === 'not-confirmed'
          ? 'The date stamp the registry reports was NOT confirmed on chain.'
          : d.status === 'proof-fails'
            ? 'The registry’s inclusion proof does NOT check out for this proof code, so there is no date.'
            : d.status === 'not-looked-up'
              ? `In batch ${d.batch}; the date stamp could not be looked up, so the date is the registry’s word.`
              : d.status === 'no-date-stamp'
                ? `In batch ${d.batch}; no date stamp yet.`
                : 'Not in a batch yet: no date stamp.',
  );
  const counted = p.labReceipts.filter((x) => x.counts);
  const named = counted.filter((x) => x.signer.nameCheck === 'checked');
  const withdrawn = p.labReceipts.filter((x) => x.withdrawn).length;
  parts.push(
    counted.length === 0
      ? 'No lab signature counts for it.'
      : `${counted.length} lab signature${counted.length === 1 ? '' : 's'} verified (${named.length} with a name VeilCore’s operator checked).`,
  );
  if (withdrawn) parts.push(`${withdrawn} withdrawn by ${withdrawn === 1 ? 'its signer' : 'their signers'}.`);
  const custodyIssues = p.labReceipts.filter(
    (x) =>
      x.counts &&
      x.custody &&
      (x.custody.covered === 'changed' ||
        x.custody.differences.length > 0 ||
        x.custody.senderSays?.covered === 'changed' ||
        (x.custody.senderSays?.differingFields.length ?? 0) > 0),
  ).length;
  if (custodyIssues)
    parts.push(
      `${custodyIssues} lab receipt${custodyIssues === 1 ? '' : 's'} for a sample ${custodyIssues === 1 ? 'does' : 'do'} NOT match what was sent, or ${custodyIssues === 1 ? 'was' : 'were'} changed after signing.`,
    );
  if (p.keyBound.keyInLink === 'matches') parts.push('The key in the link is the one the record named.');
  if (p.keyBound.keyInLink === 'does-not-match') parts.push('The key in the link is NOT the one the record named.');
  if (p.supersededBy) parts.push(`The holder has replaced this record with a corrected one: ${p.supersededBy}.`);
  return parts.join(' ');
};
