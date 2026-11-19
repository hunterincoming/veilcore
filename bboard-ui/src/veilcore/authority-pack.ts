// The pack for the authority (Argentina, medical-cannabis associations): one printable document
// an association's officer makes from the records it already keeps here, for a chosen period.
//
// What the rules ask an association for (Ministerio de Salud Res. 1780/2025, which amends
// Res. 800/2021; oversight delegated to SEDRONAR by Res. 376/2026 art. 17):
//   - a six-monthly sworn statement with the total plants, plants in flower, the number of linked
//     patients and the registered variety used (art. 4 ter, inc. f);
//   - a chromatography report for each batch (art. 4 ter, inc. f);
//   - a sworn cultivation plan with a production record, by a Technical Manager (art. 4 ter, inc. h);
//   - a permit for one year at a time (art. 10).
// No form is published for the statement and no format for the lab report, and everything is
// sent by email as PDFs. So this is not a form: it lays out what the records show, says what is
// missing, and gives each record's proof code and check link. The association signs and sends it.
//
// Where each part comes from:
//   variety         the source records the grow batches are about: the name, and the variety
//                   registration number sealed in the record's notes (origin-notes.ts), if any.
//   plant counts    the grow batches dated in the period (their sealed numbers, as the holder
//                   counted them), or what the officer types; the pack says which.
//   linked patients typed by the officer when making the pack. A number only. It is used to
//                   draw the page and nothing else: never saved, never sent (gatherPackFacts
//                   is given the records, never the form).
//   production      sources, grow batches and harvest lots, with their dates.
//   chromatography  per harvest lot: a lab-signed result (its numbers shown only when a lab
//                   stands behind them: claim-call.ts labStands), or the lab's report sealed
//                   as a document, or "missing". Missing items are listed first, as gaps.
//   dates           each record's proof code, check link, and what its date rests on
//                   (Midnight, Bitcoin, RFC 3161), worded as the check pages word them: a date is
//                   "checked" only when this browser looked it up on Midnight and found it.
//
// Several officers over time: the pack is made from the records in this browser. It says how
// many that is, counts records locked here (sealed with a key this browser doesn't have), and
// says that another officer's records are in it only once restored here from their backup.
// SPDX-License-Identifier: Apache-2.0

import type { StrainRecord } from './records';
import type { AnchorCheck } from './chain/anchor-check';
import { aboutIdsOf } from './document-chain';
import { documentKindOf } from './document-kind';
import { isDocument } from './document-profile';
import { labStands } from './claim-call';
import { parseOriginBlock } from './origin-notes';
import { parseStageHeader } from '../components/stage/stage-notes';
import type { Translator } from '../i18n/translate';
import { networkWords } from '../i18n/network-words';

/** A period, both days included, YYYY-MM-DD. */
export type PackPeriod = { readonly from: string; readonly to: string };

const DAY = /^\d{4}-\d{2}-\d{2}$/;
export const isDay = (s: string): boolean => DAY.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));

/** The day `months` months before `day`, plus one: six months back from 2026-11-18 is 2026-05-19. */
export const monthsBefore = (day: string, months: number): string => {
  const d = new Date(`${day}T00:00:00Z`);
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - months, d.getUTCDate()));
  // 31 August minus six months is 28 or 29 February, not 2 or 3 March.
  if (target.getUTCDate() !== d.getUTCDate()) target.setUTCDate(0);
  target.setUTCDate(target.getUTCDate() + 1);
  return target.toISOString().slice(0, 10);
};

/** The last six months up to `today`, both days included. */
export const lastSixMonths = (today: string): PackPeriod => ({ from: monthsBefore(today, 6), to: today });

/** A one-year permit's year from its start day (Res. 1780/2025 art. 10): start to the day before the anniversary. */
export const permitYear = (start: string): PackPeriod => {
  const d = new Date(`${start}T00:00:00Z`);
  // The anniversary (29 February rolls to 1 March), less one day.
  const end = new Date(Date.UTC(d.getUTCFullYear() + 1, d.getUTCMonth(), d.getUTCDate()) - 86_400_000);
  return { from: start, to: end.toISOString().slice(0, 10) };
};

/** A record's day: the date written on it, or else the day it was sealed (UTC). */
export const dayOf = (r: Pick<StrainRecord, 'dateCreated' | 'loggedAt'>): string =>
  isDay(r.dateCreated ?? '') ? r.dateCreated : new Date(r.loggedAt).toISOString().slice(0, 10);

const inPeriod = (day: string, p: PackPeriod): boolean => day >= p.from && day <= p.to;

/** The published form of a certificate of analysis' cannabinoid numbers (public/schemas/potency-v1.json). */
export const POTENCY_SCHEMA = 'veilcore/schema/potency/v1';
const GROW_BATCH_SCHEMA = 'veilcore/schema/grow-batch/v1';
/** The document types a chromatography report is sealed as. */
export const REPORT_TYPES: readonly string[] = ['certificate-of-analysis', 'lab-report'];

/**
 * Whether a record could be a lot's chromatography report: a lab report or certificate of
 * analysis, with no numbers or with cannabinoid numbers. A lab result v2 (a pathogen, a
 * comparison, a DNA mark) or a report of genetic numbers is not one.
 */
export const isChromatographyReport = (r: StrainRecord): boolean =>
  isDocument(r) &&
  REPORT_TYPES.includes(r.document?.type ?? '') &&
  !r.labResult &&
  (r.fieldSchema === undefined || r.fieldSet?.schema === POTENCY_SCHEMA);

/** The variety registration number sealed in a source record's notes, or ''. */
export const registrationOf = (r: Pick<StrainRecord, 'notes'>): string =>
  (parseOriginBlock(parseStageHeader(r.notes).rest).origin.registration ?? '').trim();

/** The records a pack covers. Worked out from the records this browser holds; nothing is sent. */
export type PackSelection = {
  readonly period: PackPeriod;
  /** The source records the batches are about: plants (or strains), never documents. */
  readonly sources: readonly StrainRecord[];
  /** Named by a batch, but not held here: listed by the name sealed in the batch. */
  readonly missingSources: readonly { readonly id: string; readonly name: string }[];
  /** Grow batches dated in the period, and those a lot in the period is about (outside: true). */
  readonly batches: readonly { readonly record: StrainRecord; readonly outside: boolean }[];
  readonly lots: readonly StrainRecord[];
  /** By lot ID: the lab reports about it, oldest first. */
  readonly reports: ReadonlyMap<string, readonly StrainRecord[]>;
};

export const selectPack = (records: readonly StrainRecord[], period: PackPeriod): PackSelection => {
  // A corrected record's later version stands in for it (corrections.ts): the original is left out.
  const live = records.filter((r) => !r.supersededBy);
  const byId = new Map(live.map((r) => [r.id, r]));
  const byDay = (a: StrainRecord, b: StrainRecord) =>
    dayOf(a).localeCompare(dayOf(b)) || a.loggedAt - b.loggedAt || a.id.localeCompare(b.id);
  const lots = live.filter((r) => documentKindOf(r) === 'harvest-lot' && inPeriod(dayOf(r), period)).sort(byDay);
  const batches = new Map<string, { record: StrainRecord; outside: boolean }>();
  for (const r of live)
    if (documentKindOf(r) === 'grow-batch' && inPeriod(dayOf(r), period))
      batches.set(r.id, { record: r, outside: false });
  for (const lot of lots)
    for (const id of aboutIdsOf(lot)) {
      const b = byId.get(id);
      if (b && documentKindOf(b) === 'grow-batch' && !batches.has(id)) batches.set(id, { record: b, outside: true });
    }
  const sources = new Map<string, StrainRecord>();
  const missing = new Map<string, string>();
  for (const { record: b } of batches.values())
    for (const a of b.document?.about ?? []) {
      if (!a.recordId || a.recordId === b.id) continue;
      const s = byId.get(a.recordId);
      if (s && !isDocument(s)) sources.set(s.id, s);
      else if (!s) missing.set(a.recordId, a.name || a.recordId);
    }
  const reports = new Map<string, StrainRecord[]>();
  for (const lot of lots)
    reports.set(lot.id, live.filter((r) => isChromatographyReport(r) && aboutIdsOf(r).includes(lot.id)).sort(byDay));
  return {
    period,
    sources: [...sources.values()].sort(byDay),
    missingSources: [...missing].map(([id, name]) => ({ id, name })),
    batches: [...batches.values()].sort((a, b) => byDay(a.record, b.record)),
    lots,
    reports,
  };
};

/** Every record whose proof code and date the pack shows, each once. */
export const packRecords = (s: PackSelection): StrainRecord[] => {
  const seen = new Map<string, StrainRecord>();
  for (const r of [...s.sources, ...s.batches.map((b) => b.record), ...s.lots, ...[...s.reports.values()].flat()])
    seen.set(r.id, r);
  return [...seen.values()];
};

// ---- what each date rests on ---------------------------------------------------------------

/** What a record's date rests on, as looked up when the pack was made. */
export type DateFacts = {
  /** unsealed: no proof code. none: not in a batch. pending: in a batch, no anchor. anchored: the registry reports one. */
  readonly state: 'unsealed' | 'none' | 'pending' | 'anchored';
  readonly midnight?: {
    readonly network: string;
    readonly txHash?: string;
    /** The time the registry reports for the anchor, ISO. */
    readonly reportedAt?: string;
    /** This browser's own look-up on Midnight; undefined when there was nothing to look up. */
    readonly check?: AnchorCheck;
  };
  /** The batch root's Bitcoin stamp (OpenTimestamps), as the registry reports it. */
  readonly bitcoin?: {
    readonly status: 'bitcoin' | 'pending';
    readonly blockHeight?: number;
    readonly blockTime?: string;
  };
  /** An RFC 3161 token on the batch root that checked here against the root. */
  readonly tsa?: { readonly genTime?: string; readonly tsa?: string; readonly qualified?: string };
};

/** Checked on Midnight's main network by this browser: the only date the pack calls checked. */
export const dateChecked = (d: DateFacts | undefined): boolean =>
  d?.state === 'anchored' && d.midnight?.check?.status === 'checked' && d.midnight.network === 'mainnet';

const utc = (t: number | string | undefined): string | undefined => {
  if (t === undefined) return undefined;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return undefined;
  const iso = d.toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
};

/**
 * The lines saying what one record's date rests on, in the pack's language. A Midnight date is
 * "checked" only when this browser found the batch root in that transaction; otherwise it is the
 * registry's report, said as such. A test network says it is practice data. Bitcoin and RFC 3161
 * are the batch root's, linked to this record by its inclusion proof, and are worded that way.
 */
export const dateLines = (d: DateFacts | undefined, tr: Translator): string[] => {
  if (!d || d.state === 'unsealed') return [tr.t('app.pack.date.unsealed')];
  if (d.state === 'none') return [tr.t('app.pack.date.none')];
  if (d.state === 'pending') return [tr.t('app.pack.date.pending')];
  const m = d.midnight;
  const out: string[] = [];
  if (m) {
    const where = networkWords(m.network, tr);
    const test = m.network === 'mainnet' ? '' : tr.t('app.pack.date.test');
    const c = m.check;
    if (c?.status === 'checked')
      out.push(
        tr.t('app.pack.date.checked', {
          where,
          tx: c.txHash,
          block: String(c.blockHeight),
          at: utc(c.blockTime) ?? '',
          test,
        }),
      );
    else if (c?.status === 'failed') out.push(tr.t('app.pack.date.failed', { where, reason: c.reason }));
    else
      out.push(
        tr.t('app.pack.date.reported', {
          where,
          date: utc(m.reportedAt) ?? tr.t('app.pack.date.noTime'),
          test,
        }),
      );
  }
  if (d.bitcoin?.status === 'bitcoin')
    out.push(
      tr.t('app.pack.date.bitcoin', {
        block: d.bitcoin.blockHeight !== undefined ? String(d.bitcoin.blockHeight) : '?',
        at: utc(d.bitcoin.blockTime) ?? tr.t('app.pack.date.noTime'),
      }),
    );
  else if (d.bitcoin?.status === 'pending') out.push(tr.t('app.pack.date.bitcoinPending'));
  if (d.tsa) {
    out.push(
      tr.t('app.pack.date.tsa', {
        tsa: d.tsa.tsa || tr.t('app.pack.date.tsaUnnamed'),
        at: utc(d.tsa.genTime) ?? tr.t('app.pack.date.noTime'),
      }),
    );
    if (d.tsa.qualified) out.push(tr.t('app.pack.date.tsaQualified', { scheme: d.tsa.qualified }));
  }
  return out;
};

// ---- the lab's word -------------------------------------------------------------------------

/** A lab signature's verdict, as claim-call.ts labStands reads it. */
export type LabVerdict =
  | { readonly ok: boolean; readonly lab?: { readonly ok: boolean; readonly signer?: { readonly kind: string } } }
  | undefined;

/** One lab report about a lot, as the pack shows it. */
export type ReportLine =
  | {
      /** A laboratory stands behind the numbers (labStands): they are shown, as the lab signed them. */
      readonly kind: 'lab-signed';
      readonly record: StrainRecord;
      /** Who signed, in the signer wording every page uses (attesters.ts signerLabel). */
      readonly signer: string;
      /** The numbers as the lab signed them: slot path, value as a person reads it. */
      readonly numbers: readonly { readonly path: string; readonly value: string; readonly unit?: string }[];
    }
  | {
      /** The lab's report sealed as a document. `labSignature`: one is kept, but no lab stands behind it. */
      readonly kind: 'document';
      readonly record: StrainRecord;
      readonly labSignature: boolean;
    };

/** The potency slots, in order, with their scale (public/schemas/potency-v1.json). */
const POTENCY_SLOTS: readonly { path: string; scale: number; unit: string }[] = [
  'totalThc',
  'delta9Thc',
  'thca',
  'totalCbd',
  'cbda',
  'cbg',
  'totalCannabinoids',
  'moisture',
].map((k) => ({ path: `potency.${k}`, scale: 1000, unit: '%' }));

const shown = (stored: string, scale: number): string => {
  const places = Math.round(Math.log10(scale));
  const s = BigInt(stored)
    .toString()
    .padStart(places + 1, '0');
  return places ? `${s.slice(0, -places)}.${s.slice(-places)}` : s;
};

/** A report line: the lab's numbers only when a lab stands behind them, else the sealed document. */
export const reportLine = (r: StrainRecord, verdict: LabVerdict, signer: string): ReportLine => {
  if (r.labSignature && r.fieldSet?.schema === POTENCY_SCHEMA && labStands(verdict))
    return {
      kind: 'lab-signed',
      record: r,
      signer,
      numbers: POTENCY_SLOTS.flatMap((s, i) => {
        const v = r.fieldSet?.values[i];
        return v === null || v === undefined || !/^\d+$/.test(v)
          ? []
          : [{ path: s.path, value: shown(v, s.scale), unit: s.unit }];
      }),
    };
  return { kind: 'document', record: r, labSignature: !!r.labSignature };
};

// ---- the pack -------------------------------------------------------------------------------

/** What the officer types when making the pack. Kept in the page only: never saved, never sent. */
export type PackForm = {
  /** Total plants and plants in flower, typed: used instead of the batches' numbers when given. */
  readonly plants?: number;
  readonly inFlower?: number;
  /** The number of linked patients. A number only. */
  readonly patients?: number;
  /** The association's name and who prepared the pack, as typed: printed on it. */
  readonly association?: string;
  readonly preparedBy?: string;
};

export type Gap =
  | { readonly kind: 'chromatography'; readonly lot: string }
  | { readonly kind: 'registration'; readonly source: string }
  | { readonly kind: 'source'; readonly name: string }
  | { readonly kind: 'noBatches' }
  | { readonly kind: 'noLots' }
  | { readonly kind: 'counts' }
  | { readonly kind: 'countsPartial'; readonly n: number }
  | { readonly kind: 'patients' }
  | { readonly kind: 'undated'; readonly n: number }
  | { readonly kind: 'unchecked'; readonly n: number }
  | { readonly kind: 'locked'; readonly n: number };

export type PackCounts = {
  /** Where the numbers come from: the grow batches, the officer, or nowhere. */
  readonly source: 'batches' | 'typed' | 'none';
  readonly plants?: number;
  readonly inFlower?: number;
  /** Grow batches dated in the period, and how many of them have no sealed numbers here. */
  readonly batches: number;
  readonly batchesWithout: number;
};

export type PackItem = {
  readonly record: StrainRecord;
  readonly role: 'source' | 'grow-batch' | 'harvest-lot' | 'report';
  readonly day: string;
  readonly link?: string;
  readonly date?: DateFacts;
};

export type AuthorityPack = {
  readonly selection: PackSelection;
  readonly madeAt: Date;
  readonly form: PackForm;
  readonly counts: PackCounts;
  readonly reports: ReadonlyMap<string, readonly ReportLine[]>;
  readonly items: readonly PackItem[];
  readonly gaps: readonly Gap[];
  /** Records in this browser, and those locked here (sealed with a key this browser doesn't have). */
  readonly held: number;
  readonly locked: number;
};

/** A grow batch's sealed plant counts, from the holder's copy: [plants, in flower]. */
export const batchCounts = (r: StrainRecord): { plants?: number; inFlower?: number } => {
  if (r.fieldSet?.schema !== GROW_BATCH_SCHEMA) return {};
  const n = (v: string | null | undefined) => (v && /^\d+$/.test(v) ? Number(v) : undefined);
  return { plants: n(r.fieldSet.values[0]), inFlower: n(r.fieldSet.values[1]) };
};

const whole = (n: number | undefined): n is number => n !== undefined && Number.isSafeInteger(n) && n >= 0;

/** Total plants and plants in flower: as typed when the officer typed them, else the batches' sum. */
export const countsOf = (s: PackSelection, form: PackForm): PackCounts => {
  const inside = s.batches.filter((b) => !b.outside).map((b) => b.record);
  const counted = inside.map(batchCounts);
  const without = counted.filter((c) => c.plants === undefined).length;
  const base = { batches: inside.length, batchesWithout: without };
  if (whole(form.plants) || whole(form.inFlower))
    return {
      source: 'typed',
      ...(whole(form.plants) ? { plants: form.plants } : {}),
      ...(whole(form.inFlower) ? { inFlower: form.inFlower } : {}),
      ...base,
    };
  const with_ = counted.filter((c) => c.plants !== undefined);
  if (!with_.length) return { source: 'none', ...base };
  return {
    source: 'batches',
    plants: with_.reduce((a, c) => a + (c.plants ?? 0), 0),
    ...(with_.some((c) => c.inFlower !== undefined)
      ? { inFlower: with_.reduce((a, c) => a + (c.inFlower ?? 0), 0) }
      : {}),
    ...base,
  };
};

/** Facts looked up for the pack, by record ID. */
export type PackFacts = {
  readonly dates: ReadonlyMap<string, DateFacts>;
  /** By lab report record ID: the lab signature's verdict and who signed, when it has one. */
  readonly labs: ReadonlyMap<string, { readonly verdict: LabVerdict; readonly signer: string }>;
  /** By record ID: its check link. */
  readonly links: ReadonlyMap<string, string>;
};

/** The pack, from the selection, what was looked up, and what the officer typed. */
export const buildPack = (
  selection: PackSelection,
  facts: PackFacts,
  form: PackForm,
  ctx: { readonly madeAt: Date; readonly held: number; readonly locked: number },
): AuthorityPack => {
  const reports = new Map<string, ReportLine[]>();
  for (const lot of selection.lots)
    reports.set(
      lot.id,
      (selection.reports.get(lot.id) ?? []).map((r) => {
        const lab = facts.labs.get(r.id);
        return reportLine(r, lab?.verdict, lab?.signer ?? '');
      }),
    );
  const roleOf = (r: StrainRecord): PackItem['role'] =>
    selection.sources.includes(r)
      ? 'source'
      : documentKindOf(r) === 'grow-batch'
        ? 'grow-batch'
        : documentKindOf(r) === 'harvest-lot'
          ? 'harvest-lot'
          : 'report';
  const items: PackItem[] = packRecords(selection).map((r) => ({
    record: r,
    role: roleOf(r),
    day: dayOf(r),
    ...(facts.links.get(r.id) ? { link: facts.links.get(r.id) } : {}),
    ...(facts.dates.get(r.id) ? { date: facts.dates.get(r.id) } : {}),
  }));
  const counts = countsOf(selection, form);

  const gaps: Gap[] = [];
  for (const lot of selection.lots)
    if (!(reports.get(lot.id) ?? []).length) gaps.push({ kind: 'chromatography', lot: lot.refId || lot.strainName });
  if (!selection.lots.length) gaps.push({ kind: 'noLots' });
  if (!selection.batches.some((b) => !b.outside)) gaps.push({ kind: 'noBatches' });
  for (const s of selection.sources) if (!registrationOf(s)) gaps.push({ kind: 'registration', source: s.strainName });
  for (const m of selection.missingSources) gaps.push({ kind: 'source', name: m.name });
  if (counts.source === 'none' || (counts.source === 'typed' && (!whole(counts.plants) || !whole(counts.inFlower))))
    gaps.push({ kind: 'counts' });
  else if (counts.source === 'batches' && counts.batchesWithout)
    gaps.push({ kind: 'countsPartial', n: counts.batchesWithout });
  if (!whole(form.patients)) gaps.push({ kind: 'patients' });
  const undated = items.filter((i) => !i.date || i.date.state !== 'anchored').length;
  if (undated) gaps.push({ kind: 'undated', n: undated });
  const unchecked = items.filter((i) => i.date?.state === 'anchored' && !dateChecked(i.date)).length;
  if (unchecked) gaps.push({ kind: 'unchecked', n: unchecked });
  if (ctx.locked) gaps.push({ kind: 'locked', n: ctx.locked });

  return { selection, madeAt: ctx.madeAt, form, counts, reports, items, gaps, held: ctx.held, locked: ctx.locked };
};

/** A gap in the pack's language, one line. */
export const gapWords = (g: Gap, tr: Translator): string => {
  switch (g.kind) {
    case 'chromatography':
      return tr.t('app.pack.gap.chromatography', { lot: g.lot });
    case 'registration':
      return tr.t('app.pack.gap.registration', { name: g.source });
    case 'source':
      return tr.t('app.pack.gap.source', { name: g.name });
    case 'noBatches':
      return tr.t('app.pack.gap.noBatches');
    case 'noLots':
      return tr.t('app.pack.gap.noLots');
    case 'counts':
      return tr.t('app.pack.gap.counts');
    case 'countsPartial':
      return tr.tp('app.pack.gap.countsPartial', g.n);
    case 'patients':
      return tr.t('app.pack.gap.patients');
    case 'undated':
      return tr.tp('app.pack.gap.undated', g.n);
    case 'unchecked':
      return tr.tp('app.pack.gap.unchecked', g.n);
    case 'locked':
      return tr.tp('app.pack.gap.locked', g.n);
  }
};
