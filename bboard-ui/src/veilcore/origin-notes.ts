// "Where it came from": what a holder knows about material they did not breed (a landrace, an
// heirloom, seed from a genebank or another breeder), written into the record's notes.
//
// Why the notes. A plant record seals exactly the fields in commitment.ts plantRecordFields, and
// every implementation (this app, the registry, the SDKs in three languages) computes the same
// fingerprint from them. A new sealed field would need a new profile version and all of them
// changed together; the notes are already sealed, locked and committed, and change nothing about
// how any record hashes. So, like the stage header (components/stage/stage-notes.ts), these go in
// the notes as a block of labelled lines, then a blank line, then the holder's own notes:
//
//   Where it came from: Sierra Mazateca, seed from a community seed bank
//   Collection or community: Banco Comunitario de Semillas
//   Country of origin: MEX
//   Received on: 2019-03-04
//   SMTA: 00AB12
//   DOI or PUID: 10.18730/ABC123
//
//   <anything else the holder wrote>
//
// The labels are always this English, whatever language the screen is in, so every record reads
// the same; the screens show them in the visitor's language. Each value is flattened to one line
// when it is written (control characters and bidirectional overrides too), so a value can never
// start a line of its own and be read as another label. And the holder's own notes can't pose as
// a block: when they would start with one of these labels (or a batch's, or the stage header's),
// they are sealed after a "Notes:" line, which no reader takes for a label (guardNotes).
// The MCPD codes (FAO/Bioversity Multi-Crop Passport Descriptors v2.1) come from a genebank's
// passport sheet through the bulk import, kept as the sheet wrote them, with the code's meaning
// in brackets for SAMPSTAT, COLLSRC and MLSSTAT.
//
// Every line is the holder's own statement: nobody checked it. A record with these lines still
// says nothing about who bred the material: the date shows the holder had the record by then,
// not who bred it or where it came from (the check page says so).
// SPDX-License-Identifier: Apache-2.0

/**
 * One line: every line break, control character, line or paragraph separator and bidirectional
 * override or isolate becomes a space (an override could make a value display as another).
 */
const flattenAnswer = (s: string | undefined): string =>
  (s ?? '')
    .replace(/[\p{Cc}\u2028\u2029\u202A-\u202E\u2066-\u2069]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Who the material is from: bred by the holder, received, or a community's landrace or heirloom. */
export type OriginSource = 'bred' | 'received' | 'landrace';
export const ORIGIN_SOURCES: readonly OriginSource[] = ['bred', 'received', 'landrace'];

/** The breeding method a landrace or heirloom is sealed with (breeding-methods.ts, always this English). */
export const LANDRACE_METHOD = 'Landrace / heirloom';

export type Origin = {
  /** Free text: a community, a place, a seed bank, the person it came from. */
  readonly from: string;
  readonly collection: string;
  /** As written: a name, or an ISO 3166-1 three-letter code (MCPD ORIGCTY). */
  readonly country: string;
  /** When the holder received it: YYYY-MM-DD from the form, or as a passport sheet wrote it. */
  readonly received: string;
  readonly permit: string;
  readonly smta: string;
  readonly ircc: string;
  /** A GLIS DOI or another permanent unique identifier (MCPD PUID). */
  readonly doi: string;
  /** MCPD SAMPSTAT (biological status, 300 = traditional cultivar / landrace), from an import. */
  readonly sampStat: string;
  /** MCPD COLLSRC (collecting or acquisition source), from an import. */
  readonly collSrc: string;
  /** MCPD DONORNAME and DONORCODE: who it was received from, from an import. */
  readonly donor: string;
  /** MCPD INSTCODE: the institute holding the accession, from an import. */
  readonly instCode: string;
  /** MCPD COLLSITE: where it was collected, from an import. */
  readonly collSite: string;
  /** MCPD MLSSTAT: whether it is in the Plant Treaty's Multilateral System, from an import. */
  readonly mlsStat: string;
  /** MCPD ANCEST: the pedigree as the sheet wrote it, from an import. */
  readonly ancest: string;
};
export type OriginField = keyof Origin;

/** The label each value is sealed under, in this order. Never translated: see the top of this file. */
export const ORIGIN_LABELS: readonly (readonly [OriginField, string])[] = [
  ['from', 'Where it came from: '],
  ['collection', 'Collection or community: '],
  ['country', 'Country of origin: '],
  ['received', 'Received on: '],
  ['permit', 'Permit: '],
  ['smta', 'SMTA: '],
  ['ircc', 'IRCC: '],
  ['doi', 'DOI or PUID: '],
  ['sampStat', 'MCPD SAMPSTAT: '],
  ['collSrc', 'MCPD COLLSRC: '],
  ['donor', 'Donor: '],
  ['instCode', 'Holding institute (INSTCODE): '],
  ['collSite', 'Collecting site: '],
  ['mlsStat', 'MCPD MLSSTAT: '],
  ['ancest', 'Pedigree (ANCEST): '],
];

/**
 * Labels other notes headers start with: the stage header (stage-notes.ts) and a batch's lines
 * (ask/batch.ts). Kept here so the holder's own notes can never begin like any of them.
 */
const OTHER_LABELS = ['Stage: ', 'Selected for: ', 'Sire semen code: ', 'Lot: ', 'Lot size: '];

/** The line put before the holder's own notes when they would start like a label. */
export const NOTES_GUARD = 'Notes:';

/**
 * The holder's own notes, trimmed, sealed so they can't pose as a labelled block: when the first
 * line starts with any label, a "Notes:" line goes first. Notes that don't are unchanged.
 */
export const guardNotes = (notes: string): string => {
  const rest = notes.trim();
  const first = rest.split(/\r\n|\r|\n/, 1)[0] ?? '';
  const looks = [...ORIGIN_LABELS.map(([, l]) => l), ...OTHER_LABELS].some((l) => first.startsWith(l));
  return looks ? `${NOTES_GUARD}\n${rest}` : rest;
};

/** The most characters kept per value (a draft keeps no more than it would seal). */
export const ORIGIN_MAX = 200;

export const emptyOrigin = (): Origin => ({
  from: '',
  collection: '',
  country: '',
  received: '',
  permit: '',
  smta: '',
  ircc: '',
  doi: '',
  sampStat: '',
  collSrc: '',
  donor: '',
  instCode: '',
  collSite: '',
  mlsStat: '',
  ancest: '',
});

export const originHasContent = (o: Partial<Origin> | undefined): boolean =>
  !!o && ORIGIN_LABELS.some(([k]) => flattenAnswer(o[k]) !== '');

/** A stored origin read back: strings only, each cut to ORIGIN_MAX. */
export const parseOrigin = (v: unknown): Origin | undefined => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return undefined;
  const o = v as Record<string, unknown>;
  const out = { ...emptyOrigin() } as Record<OriginField, string>;
  for (const [k] of ORIGIN_LABELS) if (typeof o[k] === 'string') out[k] = o[k].slice(0, ORIGIN_MAX);
  return out;
};

/** The labelled lines, one per value given, in ORIGIN_LABELS order. */
export const originLines = (o: Partial<Origin> | undefined): string[] =>
  o
    ? ORIGIN_LABELS.flatMap(([k, label]) => {
        const v = flattenAnswer(o[k]).slice(0, ORIGIN_MAX);
        return v ? [`${label}${v}`] : [];
      })
    : [];

/**
 * The notes a record is sealed with: the origin block first, a blank line, then the rest as
 * written; with no block, the holder's notes guarded so they can't pose as one (guardNotes).
 */
export const originNotes = (o: Partial<Origin> | undefined, notes: string): string => {
  const lines = originLines(o);
  const rest = guardNotes(notes);
  if (!lines.length) return rest;
  return rest ? `${lines.join('\n')}\n\n${rest}` : lines.join('\n');
};

/**
 * Read the block originNotes writes, at the start of `notes` (after a stage header, pass what
 * parseStageHeader leaves as `rest`). Only labelled lines, in any order, ended by a blank line or
 * the end; anything else is the holder's own notes, returned whole.
 */
export const parseOriginBlock = (notes: unknown): { origin: Partial<Origin>; rest: string } => {
  if (typeof notes !== 'string' || !notes) return { origin: {}, rest: '' };
  const lines = notes.split(/\r\n|\r|\n/);
  const origin: Partial<Record<OriginField, string>> = {};
  let i = 0;
  for (; i < lines.length; i++) {
    const hit = ORIGIN_LABELS.find(([, label]) => lines[i].startsWith(label));
    if (!hit || origin[hit[0]] !== undefined) break;
    origin[hit[0]] = lines[i].slice(hit[1].length).trim();
  }
  const ended = i === lines.length || lines[i] === '';
  if (i === 0 || !ended) return { origin: {}, rest: notes.trim() };
  return {
    origin,
    rest: lines
      .slice(i + 1)
      .join('\n')
      .trim(),
  };
};

/**
 * An MCPD ACQDATE (YYYYMMDD, unknown parts as dashes: "1968----") as it is sealed: a full date as
 * YYYY-MM-DD, anything else exactly as the sheet wrote it.
 */
export const acqDateOf = (v: string): string => {
  const s = v.trim();
  const m = /^(\d{4})(\d{2})(\d{2})$/.exec(s);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : s;
};

/** What an MCPD code's group means, in plain English (sealed) and as a key for the screens. */
export type McpdField = 'sampStat' | 'collSrc' | 'mlsStat';
const MCPD_GROUPS: Record<McpdField, readonly [RegExp, string, string][]> = {
  sampStat: [
    [/^1\d\d$/, 'wild', 'wild'],
    [/^2\d\d$/, 'weedy', 'weedy'],
    [/^300$/, 'landrace', 'traditional cultivar or landrace'],
    [/^4\d\d$/, 'research', 'breeding or research material'],
    [/^500$/, 'improved', 'advanced or improved cultivar'],
    [/^600$/, 'gmo', 'genetically modified'],
    [/^999$/, 'other', 'other'],
  ],
  collSrc: [
    [/^1\d$/, 'wild', 'wild habitat'],
    [/^2\d$/, 'farm', 'farm or cultivated habitat'],
    [/^30$/, 'market', 'market or shop'],
    [/^40$/, 'institute', 'institute, research station or genebank'],
    [/^50$/, 'seedCompany', 'seed company'],
    [/^6\d$/, 'weedy', 'weedy or disturbed habitat'],
    [/^99$/, 'other', 'other'],
  ],
  mlsStat: [
    [/^0$/, 'out', 'not in the Multilateral System'],
    [/^1$/, 'in', 'in the Multilateral System'],
  ],
};

/** The group an MCPD code belongs to ('landrace', 'farm'…), or undefined for a code not in the list. */
export const mcpdGroup = (field: McpdField, code: string): string | undefined =>
  MCPD_GROUPS[field].find(([re]) => re.test(code.trim()))?.[1];

/** A code as it is sealed: "300 (traditional cultivar or landrace)", or as written when unknown. */
export const mcpdWithMeaning = (field: McpdField, code: string): string => {
  const c = code.trim();
  const hit = MCPD_GROUPS[field].find(([re]) => re.test(c));
  return hit ? `${c} (${hit[2]})` : c;
};

/** MCPD SAMPSTAT codes for wild, weedy and traditional material: nobody's own breeding. */
export const isTraditionalOrWild = (sampStat: string): boolean => /^(1\d\d|2\d\d|300)$/.test(sampStat.trim());
