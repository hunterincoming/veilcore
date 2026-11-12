// A lab result, version 2 (veilcore/lab-result/v2; SDK SPEC 11.12; docs/lab-signing.md, "Version 2").
//
// Version 1 (lab-numbers.ts) is a document record of numbers a lab signed. It names the plant
// only by its name, and says nothing of the sample, the method or the panel: the link from the
// numbers to the plant lived in a registry attestation, outside what the lab signed. A
// reproducibility scientist would not accept that as a sample-to-result link (panel review,
// 7 Nov 2026), and a result argued in a dispute has to be argued about a stated method.
//
// Version 2 keeps the same record and the same signature (so the claims contract, which is
// frozen, checks it exactly as before), and adds a RESULT STATEMENT inside what is signed:
//
//   statement   a small JSON document: the tested record's proof code, the sample ID, the
//               lab's accession number, the method and its version, the marker panel and its
//               version, the result, QC figures, the date tested (and received), and,
//               optionally, which earlier result of the lab's this one replaces and why;
//   the record  a document record (SPEC 11.11) of type lab-report whose `files` include one
//               file named lab-result.json: the SHA-256 and size of the statement's canonical
//               bytes (SPEC 4.4). Its field set (SPEC 4.5) carries the result's call (detected,
//               matches, consistent...) and figures, so a holder can prove one of them on
//               Midnight without showing the rest;
//   signature   the lab's Schnorr signature over the record commitment (lab-attest.ts), as in v1.
//
// So the statement is covered by the signature through the file hash, its call is in the field
// set too, and the two must agree. No genetic data is in any of it: a comparison names the
// records compared by proof code, and a DNA mark is sealed as a salted SHA-256, its sequence
// shown only in a dispute (markSeal). VeilCore never tests DNA, never marks it, and vouches
// for no result: it dates what a lab signed.
//
// A viability result (SPEC 11.12, "Viability") is a test for viable organisms in a sample taken
// before or after a kill step: a fungal meal heat-treated so no live culture leaves the site, an
// inactivated vaccine or cell line, heat-treated seed, a sterilised substrate. It carries what a
// microbiology report holds (the batch, the portion, each medium with its time and temperature,
// the limit of detection, what grew, the controls), names the strain record the batch was made
// from by proof code only, and an after-sample may name its before-sample's result. A run whose
// positive control didn't grow, or whose negative control did, isn't signed. "None recovered" is
// never "dead" or "sterile" anywhere it is shown.
//
// The lab's NAME on a result is a separate binding at the registry (claims-key.ts
// resultBindingHash): its key, the tested record's proof code and the statement's bindingSalt,
// 32 random bytes made here for every result. The salt is what keeps the binding from being read
// back: the key is in every result file and the result's code is the binding's own subject, so
// without it anyone with a list of proof codes could see which records a lab tested (SPEC 11.12,
// "Why the binding is salted"). A result signed before the salt has no name binding read for it.
//
// Version 1 bundles keep checking exactly as before (lab-numbers.ts readLabNumbers).
// SPDX-License-Identifier: Apache-2.0

import { canonicalise } from 'veilcore-records';
import { sha256 } from '@noble/hashes/sha2.js';
import { claimMaterial, commitmentHex } from './claims-input';
import { checkedDocumentFields, DOCUMENT_PROFILE, type DocumentFile } from './document-profile';
import { makeFieldSet, RESULT_CALL_SCHEMAS, SCHEMAS } from './field-set';
import { newNonce } from './commitment';
import { claimsKeyFor } from './claims-key';
import { readLabSignature, signLabRequest, type LabSignature } from './lab-attest';
import { committedOnly, labNumbersProblem, type LabNumbersRecord } from './lab-numbers';

export const LAB_RESULT_FORMAT = 'veilcore/lab-result/v2';
/** The name of the statement's entry in the record's files. Exactly one, always this name. */
export const RESULT_FILE_NAME = 'lab-result.json';

export const RESULT_KINDS = ['numbers', 'pathogen', 'match', 'lineage', 'dna-mark', 'viability', 'retraction'] as const;
export type ResultKind = (typeof RESULT_KINDS)[number];
export const REPLACE_REASONS = ['re-test', 'correction', 'retraction'] as const;
export type ReplaceReason = (typeof REPLACE_REASONS)[number];

/** The call schema each kind's field set is sealed under ('numbers' names its own form). */
export const CALL_SCHEMA: Readonly<Record<Exclude<ResultKind, 'numbers'>, string>> = {
  pathogen: 'veilcore/schema/pathogen/v1',
  match: 'veilcore/schema/genetic-match/v1',
  lineage: 'veilcore/schema/lineage-check/v1',
  'dna-mark': 'veilcore/schema/dna-mark/v1',
  viability: 'veilcore/schema/viability/v1',
  retraction: 'veilcore/schema/lab-retraction/v1',
};

export type MethodRef = { readonly id: string; readonly version: string };
export type QcFigure = { readonly name: string; readonly value: string };
export type Replaces = { readonly result: string; readonly reason: ReplaceReason };

export type NumbersResult = { readonly form: string };
export type PathogenResult = {
  readonly target: string;
  readonly sampleType: string;
  readonly detected: boolean;
  /** Cycle threshold, a decimal with at most two places, under 100 ("31.25"). */
  readonly ct?: string;
};
export type MatchResult = {
  /** The proof code the other sample was sent under. */
  readonly other: string;
  /** That sample's ID, when the lab has it. */
  readonly otherSampleId?: string;
  readonly matches: boolean;
  readonly compared?: number;
  readonly differing?: number;
};
export type LineageResult = {
  /** The proof codes of the one or two parents named. */
  readonly parents: readonly string[];
  readonly consistent: boolean;
  readonly compared?: number;
  /** Conflicts with each parent, in the order named. */
  readonly conflicts?: readonly number[];
};
export type MarkResult = {
  /** markSeal(sequence, salt): the mark sealed, never the sequence. */
  readonly seal: string;
  readonly found: boolean;
  /** The lab's own name for the mark (not its sequence). */
  readonly label?: string;
};

export const VIABILITY_STAGES = ['before', 'after'] as const;
export type ViabilityStage = (typeof VIABILITY_STAGES)[number];
/** A medium, and how long and at what temperature it was incubated, as the report states them. */
export type Culture = { readonly medium: string; readonly time: string; readonly temperature: string };
/** A decimal as the report prints it, and its unit ("100", "CFU/g"). */
export type Amount = { readonly value: string; readonly unit: string };
export type ViabilityResult = {
  /** The batch or lot the sample was taken from. */
  readonly batch: string;
  readonly stage: ViabilityStage;
  /** The kill step's method and parameters, as the sender states them: an after-sample's only. */
  readonly killStep?: string;
  /** An after-sample's: the code of the result for the same batch's before-sample. */
  readonly before?: string;
  /** The proof code of the strain record the batch was made from. Nothing of the record itself. */
  readonly strain: string;
  /** YYYY-MM-DD: when the sample was taken. */
  readonly sampled: string;
  /** What the test recovers ("the production strain", "total yeasts and moulds"). */
  readonly target: string;
  /** The portion tested and its amount ("25 g of meal in 225 mL broth"). */
  readonly portion: string;
  readonly cultures: readonly Culture[];
  /** The limit of detection: above 0. */
  readonly lod: Amount;
  /** Whether viable organisms were recovered. */
  readonly detected: boolean;
  /**
   * What was recovered, as reported: above 0, only when some were, and optional then (an
   * enrichment or presence/absence test gives no count). None recovered
   * is below the limit of detection ("< 1 CFU per 25 g"), never a count of 0.
   */
  readonly count?: Amount;
  /** The positive control grew; a negative control, if run, didn't. An invalid run isn't signed. */
  readonly controls: { readonly positive: string; readonly positiveGrew: true; readonly negativeGrew?: false };
};

export type LabResultStatement = {
  readonly format: typeof LAB_RESULT_FORMAT;
  readonly kind: ResultKind;
  /** The proof code of the record the sample came from. */
  readonly subject: string;
  readonly sampleId: string;
  readonly accession: string;
  readonly method: MethodRef;
  readonly panel?: MethodRef;
  /** YYYY-MM-DD. */
  readonly tested: string;
  readonly received?: string;
  readonly qc?: readonly QcFigure[];
  readonly result?: NumbersResult | PathogenResult | MatchResult | LineageResult | MarkResult | ViabilityResult;
  readonly replaces?: Replaces;
  /**
   * The salt of the lab's name binding (claims-key.ts resultBindingHash): 32 random bytes, hex,
   * one per result, made by makeLabResult. Absent on results signed before salts were added,
   * which still check but never carry the lab's name.
   */
  readonly bindingSalt?: string;
};

/** Why a statement or a result can't be used: a code the screens put in words (app.lr.problem.*). */
export const PROBLEM_CODES = [
  'unreadable',
  'format',
  'kind',
  'subject',
  'sampleId',
  'accession',
  'method',
  'panel',
  'tested',
  'received',
  'qc',
  'result',
  'target',
  'sampleType',
  'ct',
  'other',
  'parents',
  'counts',
  'seal',
  'label',
  'replaces',
  'form',
  'file',
  'issued',
  'calls',
  'signature',
  'inconclusive',
  'future',
  'duplicate',
  'csvResult',
  'ctMissing',
  'bindingSalt',
  'batch',
  'stage',
  'killStep',
  'before',
  'strain',
  'sampled',
  'portion',
  'cultures',
  'lod',
  'count',
  'controls',
  'lodNumber',
  'countNumber',
] as const;
export type ProblemCode = (typeof PROBLEM_CODES)[number];

export class LabResultProblem extends Error {
  constructor(
    readonly code: ProblemCode,
    message: string,
  ) {
    super(message);
  }
}
const fail = (code: ProblemCode, message: string): never => {
  throw new LabResultProblem(code, message);
};

// ---- the statement's form ---------------------------------------------------------------------

const HEX64 = /^[0-9a-f]{64}$/;
const CONTROL = /\p{Cc}/u;
/** Format characters (bidi controls, zero-width spaces): two values that look the same must be the same. */
const FORMAT = /\p{Cf}/u;
/** A mark label that could be the sequence itself: ten or more of A, C, G, T in a row. */
const SEQUENCE_RUN = /[ACGT]{10,}/i;
const CT = /^(0|[1-9]\d?)(\.\d{1,2})?$/;
export const LINE_MAX = 200;
export const QC_MAX = 12;
export const QC_LINE_MAX = 60;
/** Counts are whole numbers up to a billion: a panel, not a genome. */
export const COUNT_MAX = 1_000_000_000;
/** A decimal as a report prints it: no sign, no exponent, 15 whole digits and 6 decimals at most. */
export const DECIMAL = /^(0|[1-9]\d{0,14})(\.\d{1,6})?$/;
const ZERO = /^0(\.0+)?$/;
/** The most media one viability result names (a USP <71> sterility test uses two). */
export const CULTURES_MAX = 4;
/** A medium's time and temperature, and a unit: short, like a QC figure. */
export const SHORT_MAX = 60;

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** One line: text, 1 to `max` characters, no control characters, no space at either end. */
export const isLine = (v: unknown, max = LINE_MAX): v is string =>
  typeof v === 'string' &&
  v !== '' &&
  Array.from(v).length <= max &&
  !CONTROL.test(v) &&
  !FORMAT.test(v) &&
  v === v.trim();

/**
 * A date tested later than tomorrow on this computer's calendar: almost always a typo. Refused
 * where a lab types or imports one; never when checking a result (a check doesn't depend on a clock).
 */
export const isFutureDate = (date: string, now = new Date()): boolean => {
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const tomorrow = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  return date > tomorrow;
};

export const isCalendarDate = (v: unknown): v is string => {
  if (typeof v !== 'string') return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]);
};

const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= COUNT_MAX;

const onlyKeys = (o: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []) =>
  required.every((k) => k in o) && Object.keys(o).every((k) => required.includes(k) || optional.includes(k));

const isRef = (v: unknown): v is MethodRef =>
  isObject(v) && onlyKeys(v, ['id', 'version']) && isLine(v.id) && isLine(v.version);

const isAmount = (v: unknown, positive: boolean): v is Amount =>
  isObject(v) &&
  onlyKeys(v, ['value', 'unit']) &&
  typeof v.value === 'string' &&
  DECIMAL.test(v.value) &&
  !(positive && ZERO.test(v.value)) &&
  isLine(v.unit, SHORT_MAX);

const viabilityProblem = (r: Record<string, unknown>): void => {
  if (
    !onlyKeys(
      r,
      ['batch', 'stage', 'strain', 'sampled', 'target', 'portion', 'cultures', 'lod', 'detected', 'controls'],
      ['killStep', 'before', 'count'],
    )
  )
    fail('result', 'The result isn’t in its form.');
  if (!isLine(r.batch)) fail('batch', 'Name the batch or lot: one line.');
  if (!VIABILITY_STAGES.includes(r.stage as ViabilityStage))
    fail('stage', 'Say whether the sample was taken before or after the kill step.');
  if (r.stage === 'after' ? !isLine(r.killStep) : r.killStep !== undefined)
    fail('killStep', 'An after-sample names its kill step, one line; a before-sample doesn’t.');
  if (r.before !== undefined && (r.stage !== 'after' || typeof r.before !== 'string' || !HEX64.test(r.before)))
    fail('before', 'Only an after-sample names a before-sample’s result, by its 64-hex code.');
  if (typeof r.strain !== 'string' || !HEX64.test(r.strain))
    fail('strain', 'Name the strain record by its proof code, 64 hex characters.');
  if (!isCalendarDate(r.sampled)) fail('sampled', 'The date sampled is a real date, YYYY-MM-DD.');
  if (!isLine(r.target)) fail('target', 'Name what the test recovers.');
  if (!isLine(r.portion)) fail('portion', 'Name the portion tested and its amount.');
  const c = r.cultures;
  if (
    !Array.isArray(c) ||
    c.length < 1 ||
    c.length > CULTURES_MAX ||
    !c.every(
      (x) =>
        isObject(x) &&
        onlyKeys(x, ['medium', 'time', 'temperature']) &&
        isLine(x.medium) &&
        isLine(x.time, SHORT_MAX) &&
        isLine(x.temperature, SHORT_MAX),
    ) ||
    new Set(c.map((x) => canonicalise(x))).size !== c.length
  )
    fail('cultures', `Media: 1 to ${CULTURES_MAX}, each with its time and temperature, none repeated.`);
  if (!isAmount(r.lod, true)) fail('lod', 'The limit of detection is a number above 0, with its unit.');
  if (typeof r.detected !== 'boolean') fail('result', 'Say whether viable organisms were recovered.');
  // None recovered is below the limit of detection, never a count of 0: the count is left out.
  if (r.detected === false && r.count !== undefined)
    fail('count', 'No count when none were recovered: the limit of detection says it.');
  // Some recovered: a count is optional (enrichment and presence/absence tests give none), above 0 when given.
  if (r.detected === true && r.count !== undefined && !isAmount(r.count, true))
    fail('count', 'A count, when given, is a number above 0 with its unit.');
  const k = r.controls;
  if (
    !isObject(k) ||
    !onlyKeys(k, ['positive', 'positiveGrew'], ['negativeGrew']) ||
    !isLine(k.positive) ||
    k.positiveGrew !== true ||
    (k.negativeGrew !== undefined && k.negativeGrew !== false)
  )
    fail(
      'controls',
      'Name the positive control, which grew; a run whose positive control didn’t grow, or whose negative control did, isn’t signed.',
    );
};

const resultProblem = (kind: ResultKind, subject: string, r: unknown): void => {
  if (kind === 'retraction') {
    if (r !== undefined) fail('result', 'A withdrawal carries no result.');
    return;
  }
  if (!isObject(r)) return fail('result', 'The result is missing or isn’t in its form.');
  switch (kind) {
    case 'numbers':
      if (!onlyKeys(r, ['form']) || !isLine(r.form)) fail('form', 'The result must name the form of its numbers.');
      return;
    case 'pathogen':
      if (!onlyKeys(r, ['target', 'sampleType', 'detected'], ['ct'])) fail('result', 'The result isn’t in its form.');
      if (!isLine(r.target)) fail('target', 'Name what was tested for.');
      if (!isLine(r.sampleType)) fail('sampleType', 'Name the kind of sample.');
      if (typeof r.detected !== 'boolean') fail('result', 'Say whether it was detected.');
      if (r.ct !== undefined && (typeof r.ct !== 'string' || !CT.test(r.ct)))
        fail('ct', 'Ct is a number under 100 with at most two decimals.');
      return;
    case 'match':
      if (!onlyKeys(r, ['other', 'matches'], ['otherSampleId', 'compared', 'differing']))
        fail('result', 'The result isn’t in its form.');
      if (r.otherSampleId !== undefined && !isLine(r.otherSampleId))
        fail('sampleId', 'The other sample’s ID is one line.');
      if (typeof r.other !== 'string' || !HEX64.test(r.other) || r.other === subject)
        fail('other', 'Name the other record by its proof code, not the same one.');
      if (typeof r.matches !== 'boolean') fail('result', 'Say whether they match.');
      if (r.compared !== undefined && (!isCount(r.compared) || r.compared < 1))
        fail('counts', 'Counts are whole numbers.');
      if (r.differing !== undefined && !isCount(r.differing)) fail('counts', 'Counts are whole numbers.');
      if (isCount(r.compared) && isCount(r.differing) && r.differing > r.compared)
        fail('counts', 'More markers can’t differ than were compared.');
      return;
    case 'lineage': {
      if (!onlyKeys(r, ['parents', 'consistent'], ['compared', 'conflicts']))
        fail('result', 'The result isn’t in its form.');
      const p = r.parents;
      if (
        !Array.isArray(p) ||
        p.length < 1 ||
        p.length > 2 ||
        p.some((x) => typeof x !== 'string' || !HEX64.test(x) || x === subject) ||
        new Set(p).size !== p.length
      )
        fail('parents', 'Name one or two parents by their proof codes, each once, not the sample’s own record.');
      if (typeof r.consistent !== 'boolean') fail('result', 'Say whether it is consistent.');
      if (r.compared !== undefined && (!isCount(r.compared) || r.compared < 1))
        fail('counts', 'Counts are whole numbers.');
      if (r.conflicts !== undefined) {
        const c = r.conflicts;
        if (!Array.isArray(c) || c.length !== (p as unknown[]).length || !c.every(isCount))
          fail('counts', 'Give conflicts for each parent named, as whole numbers.');
        if (isCount(r.compared) && (c as number[]).some((x) => x > (r.compared as number)))
          fail('counts', 'More markers can’t conflict than were compared.');
      }
      return;
    }
    case 'viability':
      viabilityProblem(r);
      return;
    case 'dna-mark':
      if (!onlyKeys(r, ['seal', 'found'], ['label'])) fail('result', 'The result isn’t in its form.');
      if (typeof r.seal !== 'string' || !HEX64.test(r.seal)) fail('seal', 'The mark’s seal is 64 hex characters.');
      if (typeof r.found !== 'boolean') fail('result', 'Say whether the mark was found.');
      if (r.label !== undefined && (!isLine(r.label) || SEQUENCE_RUN.test(r.label)))
        fail('label', 'The mark’s name is one line, and not the sequence.');
      return;
  }
};

const STATEMENT_REQUIRED = ['format', 'kind', 'subject', 'sampleId', 'accession', 'method', 'tested'] as const;
const STATEMENT_OPTIONAL = ['panel', 'received', 'qc', 'result', 'replaces', 'bindingSalt'] as const;

/** A binding salt: 64 lowercase hex characters, not all one byte value (SPEC 11.12). */
export const isBindingSalt = (v: unknown): v is string =>
  typeof v === 'string' && HEX64.test(v) && !/^(..)\1{31}$/.test(v);

/** A new binding salt, from the browser's secure generator. */
export const newBindingSalt = (): string => {
  for (;;) {
    const s = Array.from(crypto.getRandomValues(new Uint8Array(32)), (x) => x.toString(16).padStart(2, '0')).join('');
    if (isBindingSalt(s)) return s;
  }
};

/**
 * A statement in its canonical form, checked: every rule of SPEC 11.12. A value in any other
 * form is refused, never tidied (a statement is hashed, and one result written two ways would
 * be two results). Throws a LabResultProblem.
 */
export const checkedStatement = (v: unknown): LabResultStatement => {
  if (!isObject(v)) return fail('unreadable', 'That isn’t a lab result.');
  if (v.format !== LAB_RESULT_FORMAT) fail('format', 'That isn’t a version 2 lab result.');
  if (!onlyKeys(v, STATEMENT_REQUIRED, STATEMENT_OPTIONAL)) fail('format', 'The result has fields it shouldn’t.');
  if (!RESULT_KINDS.includes(v.kind as ResultKind)) fail('kind', 'The kind of result isn’t one this format has.');
  const kind = v.kind as ResultKind;
  if (typeof v.subject !== 'string' || !HEX64.test(v.subject))
    fail('subject', 'The tested record’s proof code is 64 hex characters.');
  if (!isLine(v.sampleId)) fail('sampleId', 'The sample ID is one line, not empty.');
  if (!isLine(v.accession)) fail('accession', 'The lab’s accession number is one line, not empty.');
  if (!isRef(v.method)) fail('method', 'Name the method and its version.');
  if (v.panel !== undefined && !isRef(v.panel)) fail('panel', 'Name the panel and its version, or neither.');
  if (!isCalendarDate(v.tested)) fail('tested', 'The date tested is a real date, YYYY-MM-DD.');
  if (v.received !== undefined && (!isCalendarDate(v.received) || v.received > (v.tested as string)))
    fail('received', 'The date received is a real date, not after the date tested.');
  if (v.qc !== undefined) {
    const q = v.qc;
    if (
      !Array.isArray(q) ||
      q.length < 1 ||
      q.length > QC_MAX ||
      !q.every(
        (x) =>
          isObject(x) && onlyKeys(x, ['name', 'value']) && isLine(x.name, QC_LINE_MAX) && isLine(x.value, QC_LINE_MAX),
      ) ||
      new Set(q.map((x) => (x as QcFigure).name)).size !== q.length
    )
      fail('qc', `QC figures: 1 to ${QC_MAX}, each a name and a value, names not repeated.`);
  }
  if (v.bindingSalt !== undefined && !isBindingSalt(v.bindingSalt))
    fail('bindingSalt', 'The salt of the lab’s name is 64 hex characters, not all the same byte.');
  resultProblem(kind, v.subject as string, v.result);
  if (kind === 'viability') {
    const sampled = (v.result as ViabilityResult).sampled;
    if (sampled > (v.tested as string) || (v.received !== undefined && sampled > (v.received as string)))
      fail('sampled', 'The date sampled is not after the date received or the date tested.');
  }
  if (v.replaces !== undefined) {
    const r = v.replaces;
    if (
      !isObject(r) ||
      !onlyKeys(r, ['result', 'reason']) ||
      typeof r.result !== 'string' ||
      !HEX64.test(r.result) ||
      !REPLACE_REASONS.includes(r.reason as ReplaceReason)
    )
      fail(
        'replaces',
        'A replaced result is named by its 64-hex code, with a re-test, correction or retraction reason.',
      );
  }
  const reason = (v.replaces as Replaces | undefined)?.reason;
  if ((kind === 'retraction') !== (reason === 'retraction'))
    fail('replaces', 'A withdrawal names the result it withdraws, and only a withdrawal gives that reason.');
  return v as LabResultStatement;
};

/** What a screen shows when a statement or a result can't be used. */
export const problemOf = (e: unknown): { code: ProblemCode; message: string } =>
  e instanceof LabResultProblem
    ? { code: e.code, message: e.message }
    : { code: 'unreadable', message: e instanceof Error ? e.message : String(e) };

// ---- hashing ----------------------------------------------------------------------------------

const enc = new TextEncoder();
const hex = (b: Uint8Array): string => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
const unhex = (h: string): Uint8Array => Uint8Array.from(h.match(/../g) ?? [], (b) => parseInt(b, 16));

/** The statement's canonical bytes (SPEC 4.4): what its entry in `files` is the SHA-256 and size of. */
export const statementBytes = (s: LabResultStatement): Uint8Array => enc.encode(canonicalise(s));

/** The file entry the record seals for a statement. */
export const statementFile = (s: LabResultStatement): DocumentFile => {
  const b = statementBytes(s);
  return { name: RESULT_FILE_NAME, sha256: hex(sha256(b)), size: b.length };
};

// ---- the DNA mark: sealed, shown only in a dispute -------------------------------------------

const MARK_TAG = enc.encode('veilcore:dnamark:v1\0');
export const MARK_MIN = 10;
export const MARK_MAX = 100_000;

/**
 * A sequence as a person pastes it (FASTA, spaces, line breaks, lower case) in the one form a
 * seal is made over: A, C, G and T, upper case. Header lines (">…") and white space go; anything
 * else stays, so sequenceProblem refuses it rather than a seal quietly covering something else.
 */
export const tidySequence = (text: string): string =>
  text
    .split(/\r?\n|\r/)
    .filter((l) => !l.trimStart().startsWith('>'))
    .join('')
    .replace(/\s+/g, '')
    .toUpperCase();

export const sequenceOk = (s: string): boolean => new RegExp(`^[ACGT]{${MARK_MIN},${MARK_MAX}}$`).test(s);

/** seal = SHA-256("veilcore:dnamark:v1" 0x00 || salt (32 bytes) || the sequence, ASCII), hex. */
export const markSeal = (sequence: string, saltHex: string): string => {
  if (!sequenceOk(sequence)) throw new LabResultProblem('seal', 'A mark is 10 to 100,000 letters, A, C, G or T only.');
  if (!HEX64.test(saltHex)) throw new LabResultProblem('seal', 'The salt is 64 hex characters.');
  const s = unhex(saltHex);
  const q = enc.encode(sequence);
  const all = new Uint8Array(MARK_TAG.length + 32 + q.length);
  all.set(MARK_TAG);
  all.set(s, MARK_TAG.length);
  all.set(q, MARK_TAG.length + 32);
  return hex(sha256(all));
};

/** What the lab keeps to show the mark in a dispute. VeilCore never holds it. */
export type MarkOpening = {
  readonly kind: 'veilcore-dna-mark-opening';
  readonly v: 1;
  readonly seal: string;
  readonly sequence: string;
  readonly salt: string;
};

export const newMarkOpening = (sequence: string): MarkOpening => {
  const salt = hex(crypto.getRandomValues(new Uint8Array(32)));
  return { kind: 'veilcore-dna-mark-opening', v: 1, seal: markSeal(sequence, salt), sequence, salt };
};

/** An opening file, read: undefined when it isn't one. */
export const readMarkOpening = (text: string): MarkOpening | undefined => {
  try {
    const o = JSON.parse(text) as Record<string, unknown>;
    if (
      o?.kind !== 'veilcore-dna-mark-opening' ||
      o.v !== 1 ||
      typeof o.sequence !== 'string' ||
      typeof o.salt !== 'string' ||
      typeof o.seal !== 'string'
    )
      return undefined;
    return { kind: 'veilcore-dna-mark-opening', v: 1, seal: o.seal, sequence: o.sequence, salt: o.salt };
  } catch {
    return undefined;
  }
};

/** Whether an opening shows the mark a result sealed: its sequence and salt make that seal. */
export const openingMatches = (o: Pick<MarkOpening, 'sequence' | 'salt'>, seal: string): boolean => {
  try {
    return markSeal(o.sequence, o.salt) === seal;
  } catch {
    return false;
  }
};

// ---- the call, in the field set ---------------------------------------------------------------

const SLOTS = 16;
const blank = (): (bigint | null)[] => Array.from({ length: SLOTS }, () => null);
const b = (x: boolean): bigint => (x ? 1n : 0n);
const n = (x: number | undefined): bigint | null => (x === undefined ? null : BigInt(x));

/** The form a result's field set is sealed under. */
export const schemaForResult = (s: LabResultStatement): string =>
  s.kind === 'numbers' ? (s.result as NumbersResult).form : CALL_SCHEMA[s.kind];

/**
 * The field set's numbers for a result whose call the statement carries (every kind but
 * 'numbers', whose numbers the lab types under its form). They must agree with the statement.
 */
export const callValues = (s: LabResultStatement): (bigint | null)[] => {
  const v = blank();
  switch (s.kind) {
    case 'pathogen': {
      const r = s.result as PathogenResult;
      v[0] = b(r.detected);
      if (r.ct !== undefined) {
        const [w, f = ''] = r.ct.split('.');
        v[1] = BigInt(w) * 100n + BigInt((f + '00').slice(0, 2));
      }
      break;
    }
    case 'match': {
      const r = s.result as MatchResult;
      [v[0], v[1], v[2]] = [b(r.matches), n(r.compared), n(r.differing)];
      break;
    }
    case 'lineage': {
      const r = s.result as LineageResult;
      [v[0], v[1], v[2], v[3]] = [b(r.consistent), n(r.compared), n(r.conflicts?.[0]), n(r.conflicts?.[1])];
      break;
    }
    case 'dna-mark':
      v[0] = b((s.result as MarkResult).found);
      break;
    case 'viability': {
      const r = s.result as ViabilityResult;
      [v[0], v[1]] = [b(r.detected), r.stage === 'after' ? 1n : 0n];
      break;
    }
    case 'retraction':
      v[0] = 1n;
      break;
    case 'numbers':
      throw new Error('A numbers result’s values are typed under its form.');
  }
  return v;
};

// ---- making and reading a result ---------------------------------------------------------------

/** What the lab gives: the statement (its format is filled in), and the numbers for a 'numbers' result. */
export type LabResultInput = {
  readonly labName: string;
  /** The lab's name for the result; the accession number when empty. */
  readonly title?: string;
  readonly statement: Omit<LabResultStatement, 'format'>;
  /** A 'numbers' result: its form's numbers, as stored (the value times the slot's scale). */
  readonly values?: readonly (bigint | null)[];
  /** The report file it goes with, when there is one: its name, SHA-256 and size. Never its bytes. */
  readonly report?: DocumentFile;
};

export type LabResultRecord = LabNumbersRecord;

/** What travels to the holder: v2 of the lab-numbers bundle. */
export type LabResultBundle = {
  readonly kind: 'veilcore-lab-numbers';
  readonly v: 2;
  readonly record: LabResultRecord;
  readonly signature: LabSignature;
  readonly statement: LabResultStatement;
};

/**
 * Seal and sign one result. Returns the bundle, the commitment the lab signed (the result's
 * code: what a later result names in `replaces`) and the claims key's text (lab-attest.ts).
 */
export const makeLabResult = async (
  attesterPrivateKeyPkcs8: string,
  input: LabResultInput,
  now = Date.now(),
): Promise<{ readonly bundle: LabResultBundle; readonly commitment: string; readonly keyText: string }> => {
  // Every result gets its own salt for the lab's name binding, unless the input brings one.
  const statement = checkedStatement({
    format: LAB_RESULT_FORMAT,
    ...input.statement,
    bindingSalt: input.statement.bindingSalt ?? newBindingSalt(),
  });
  const schema = schemaForResult(statement);
  if (statement.kind === 'numbers') {
    if (!SCHEMAS[schema] || RESULT_CALL_SCHEMAS.includes(schema)) fail('form', 'No published form for these numbers.');
  }
  const values = statement.kind === 'numbers' ? (input.values ?? []) : callValues(statement);
  if (statement.kind === 'numbers') {
    const p = labNumbersProblem(schema, values);
    if (p) fail('calls', p);
  }
  const fs = await makeFieldSet(schema, values);
  const labName = input.labName.trim();
  const record: LabResultRecord = {
    profile: DOCUMENT_PROFILE,
    strainName: (input.title ?? '').trim() || statement.accession,
    bredBy: labName,
    dateCreated: statement.tested,
    notes: '',
    loggedAt: now,
    nonce: newNonce(),
    refId: statement.accession,
    document: {
      type: 'lab-report',
      issuer: labName,
      files: [...(input.report ? [input.report] : []), statementFile(statement)],
      about: [{ name: statement.sampleId }],
    },
    fieldSchema: fs.fieldSchema,
    fieldSetRoot: fs.fieldSetRoot,
    fieldSet: fs.held,
  };
  checkedDocumentFields(record);
  const commitment = commitmentHex(await claimMaterial(record));
  const k = claimsKeyFor(attesterPrivateKeyPkcs8);
  const signature = signLabRequest(
    { secretN: k.secret, name: '' },
    { kind: 'veilcore-lab-request', v: 1, commitment, record },
  );
  return {
    bundle: { kind: 'veilcore-lab-numbers', v: 2, record, signature, statement },
    commitment,
    keyText: k.keyText,
  };
};

/**
 * What ties a statement to the record the lab signed (SPEC 11.12, "Binding"): a lab report,
 * exactly one statement file whose SHA-256 and size are the statement's, dated the day tested,
 * and a field set under the kind's form whose call agrees with the statement. Throws.
 */
export const checkBinding = (record: LabResultRecord, statement: LabResultStatement): void => {
  const d = record.document;
  if (d?.type !== 'lab-report') fail('file', 'A lab result is a lab report record.');
  const entries = (d?.files ?? []).filter((f) => f.name === RESULT_FILE_NAME);
  const want = statementFile(statement);
  if (entries.length !== 1 || entries[0].sha256 !== want.sha256 || entries[0].size !== want.size)
    fail('file', 'The result statement isn’t the one the lab signed.');
  if (record.dateCreated !== statement.tested) fail('issued', 'The record’s date isn’t the date tested.');
  const about = d?.about ?? [];
  if (about.length !== 1 || about[0].name !== statement.sampleId || about[0].recordId !== undefined)
    fail('file', 'The record doesn’t name the sample the result names.');
  if (record.refId !== statement.accession) fail('file', 'The record’s reference isn’t the accession number.');
  if (d?.issuer !== record.bredBy) fail('file', 'The record names two different labs.');
  const schema = schemaForResult(statement);
  if (record.fieldSet?.schema !== schema) fail('calls', 'The signed numbers aren’t under the result’s form.');
  if (statement.kind === 'numbers') {
    if (RESULT_CALL_SCHEMAS.includes(schema)) fail('form', 'No published form for these numbers.');
    return;
  }
  const want2 = callValues(statement).map((x) => (x === null ? null : x.toString()));
  const have = record.fieldSet.values;
  if (want2.some((x, i) => (have[i] ?? null) !== x)) fail('calls', 'The signed numbers don’t agree with the result.');
};

/**
 * A v2 bundle from an opened report or a file the lab handed over, checked: the statement in its
 * form, bound to the record, the record in canonical form with numbers that make its root and
 * commitment, and a signature by the key it names that the claims contract will accept.
 */
export const readLabResult = async (o: Record<string, unknown>): Promise<LabResultBundle> => {
  if (o?.kind !== 'veilcore-lab-numbers' || o.v !== 2) fail('unreadable', 'That isn’t a version 2 lab result.');
  const statement = checkedStatement(o.statement);
  const raw = o.record as LabResultRecord | undefined;
  if (
    !isObject(raw) ||
    !isObject(raw.fieldSet) ||
    !Array.isArray((raw.fieldSet as { values?: unknown }).values) ||
    raw.keyBinding !== undefined
  )
    fail('unreadable', 'The result’s record can’t be read.');
  let record: LabResultRecord;
  try {
    record = committedOnly(raw as LabResultRecord);
  } catch {
    return fail('unreadable', 'The result’s record can’t be read.');
  }
  checkBinding(record, statement);
  let commitment: string;
  try {
    commitment = commitmentHex(await claimMaterial(record));
    const { readLabRequest } = await import('./lab-attest');
    await readLabRequest(JSON.stringify({ kind: 'veilcore-lab-request', v: 1, commitment, record }));
  } catch (e) {
    return fail('unreadable', e instanceof Error ? e.message : String(e));
  }
  if (statement.kind === 'numbers') {
    const p = labNumbersProblem(record.fieldSet.schema, record.fieldSet.values);
    if (p) fail('calls', p);
  }
  let signature: LabSignature;
  try {
    signature = readLabSignature(JSON.stringify(o.signature), commitment);
  } catch (e) {
    return fail('signature', e instanceof Error ? e.message : String(e));
  }
  return { kind: 'veilcore-lab-numbers', v: 2, record, signature, statement };
};

/** The code a result is known by: the commitment its lab signed. */
export const resultCode = (r: Pick<LabResultBundle, 'signature'>): string => r.signature.record;

// ---- several results in one file ----------------------------------------------------------------

/** A lab's file of results signed in one go (CSV signing): each still its own signed result. */
export type LabResultFile = {
  readonly kind: 'veilcore-lab-results';
  readonly v: 2;
  readonly results: readonly unknown[];
};
export const RESULTS_FILE_MAX = 500;

export const resultsFile = (bundles: readonly LabResultBundle[]): LabResultFile => ({
  kind: 'veilcore-lab-results',
  v: 2,
  results: bundles,
});

/**
 * Every result in a file a lab handed over: one result, or a file of them. Each is checked on
 * its own; one that fails doesn't stop the rest.
 */
export const readResultsText = async (
  text: string,
): Promise<readonly ({ ok: true; bundle: LabResultBundle } | { ok: false; code: ProblemCode; message: string })[]> => {
  let o: unknown;
  try {
    o = JSON.parse(text);
  } catch {
    return [{ ok: false, code: 'unreadable', message: 'That file isn’t a lab result.' }];
  }
  const items =
    isObject(o) && o.kind === 'veilcore-lab-results' && o.v === 2 && Array.isArray(o.results)
      ? o.results.slice(0, RESULTS_FILE_MAX)
      : [o];
  const out: ({ ok: true; bundle: LabResultBundle } | { ok: false; code: ProblemCode; message: string })[] = [];
  for (const item of items) {
    try {
      if (isObject(item) && item.kind === 'veilcore-lab-numbers' && item.v === 1)
        fail('format', 'That is a version 1 lab result: it opens with the report it came in.');
      out.push({ ok: true, bundle: await readLabResult(item as Record<string, unknown>) });
    } catch (e) {
      out.push({ ok: false, ...problemOf(e) });
    }
  }
  return out;
};

/**
 * How results in one set stand towards each other (SPEC 11.12, "Replacing"): a result is
 * replaced (or withdrawn) only by a later one SIGNED BY THE SAME KEY that names it. A result
 * naming one signed by another key changes nothing about it.
 */
export const replacedBy = (
  all: readonly LabResultBundle[],
): Map<string, { readonly by: string; readonly reason: ReplaceReason }> => {
  const keyOf = new Map(all.map((r) => [resultCode(r), r.signature.key]));
  const byCode = new Map(all.map((r) => [resultCode(r), r]));
  const out = new Map<string, { by: string; reason: ReplaceReason }>();
  for (const r of all) {
    const rep = r.statement.replaces;
    const old = byCode.get(rep?.result ?? '');
    // Same key, same record tested, and not tested before the one it replaces (SPEC 11.12).
    if (
      rep &&
      old &&
      keyOf.get(rep.result) === r.signature.key &&
      rep.result !== resultCode(r) &&
      old.statement.subject === r.statement.subject &&
      r.statement.tested >= old.statement.tested &&
      // Two results naming each other replace neither.
      old.statement.replaces?.result !== resultCode(r)
    )
      out.set(rep.result, { by: resultCode(r), reason: rep.reason });
  }
  return out;
};

/**
 * How an after-sample's viability result stands to the before-sample result it names (SPEC 11.12,
 * "The pair"): 'paired' only when that result is here, signed by the same key, a viability result
 * at stage before, for the same batch, strain record and target, not sampled after the
 * after-sample, and neither result is replaced or withdrawn by another one here (replacedBy).
 * 'missing' when it isn't among these results; 'unpaired' when it is but fails one of the first
 * rules; 'broken' when they would pair but one of the two was replaced or withdrawn ('side' says
 * which). A pair whose two tests named different methods is still a pair, and says so.
 */
export type ViabilityPair =
  | { readonly state: 'paired'; readonly before: LabResultBundle; readonly methodsDiffer: boolean }
  | { readonly state: 'missing' | 'unpaired'; readonly code: string }
  | {
      readonly state: 'broken';
      readonly code: string;
      readonly side: 'before' | 'after';
      readonly reason: ReplaceReason;
      readonly by: string;
    };

export const viabilityPairs = (all: readonly LabResultBundle[]): Map<string, ViabilityPair> => {
  const byCode = new Map(all.map((r) => [resultCode(r), r]));
  const replaced = replacedBy(all);
  const out = new Map<string, ViabilityPair>();
  for (const a of all) {
    if (a.statement.kind !== 'viability') continue;
    const ar = a.statement.result as ViabilityResult;
    if (ar.stage !== 'after' || ar.before === undefined) continue;
    const b = byCode.get(ar.before);
    if (!b) {
      out.set(resultCode(a), { state: 'missing', code: ar.before });
      continue;
    }
    const br = b.statement.result as ViabilityResult | undefined;
    const pairs =
      b.signature.key === a.signature.key &&
      b.statement.kind === 'viability' &&
      br?.stage === 'before' &&
      br.batch === ar.batch &&
      br.strain === ar.strain &&
      br.target === ar.target &&
      br.sampled <= ar.sampled;
    if (!pairs) {
      out.set(resultCode(a), { state: 'unpaired', code: ar.before });
      continue;
    }
    // A withdrawn or replaced result is no longer evidence about the other: the pair is broken.
    const gone = replaced.get(ar.before) ?? replaced.get(resultCode(a));
    if (gone) {
      const side = replaced.has(ar.before) ? 'before' : 'after';
      out.set(resultCode(a), { state: 'broken', code: ar.before, side, reason: gone.reason, by: gone.by });
      continue;
    }
    const [am, bm] = [a.statement.method, b.statement.method];
    out.set(resultCode(a), { state: 'paired', before: b, methodsDiffer: am.id !== bm.id || am.version !== bm.version });
  }
  return out;
};

/** A kept result, as the lab's records hold it (records.ts StrainRecord): only what naming needs. */
type HeldResult = {
  readonly labSignature?: { readonly record: string; readonly key: string };
  readonly labResult?: { readonly statement: LabResultStatement; readonly bindingId?: string };
};

/**
 * The lab's results that still need its name: kept, signed, not yet bound, and not replaced or
 * withdrawn since by a later result of the same key (naming one of those would put the lab's
 * name back on a result it no longer stands behind). A result signed before binding salts can't
 * be named at all: its binding could only be the unsalted kind no checker reads.
 */
export const unboundToName = <R extends HeldResult>(records: readonly R[]): R[] => {
  const replaced = new Set(
    records.flatMap((r) => {
      const rep = r.labResult?.statement.replaces;
      const old = rep && records.find((o) => o.labSignature?.record === rep.result);
      return rep && old && old.labSignature?.key === r.labSignature?.key ? [rep.result] : [];
    }),
  );
  return records.filter(
    (r) =>
      r.labResult &&
      r.labSignature &&
      !r.labResult.bindingId &&
      r.labResult.statement.bindingSalt !== undefined &&
      !replaced.has(r.labSignature.record),
  );
};

export { HEX64 as RESULT_CODE_PATTERN };
