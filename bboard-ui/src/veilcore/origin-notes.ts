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
// when it is written, so a value can never start a line of its own and be read as another label.
// The MCPD codes (FAO/Bioversity Multi-Crop Passport Descriptors v2.1) come from a genebank's
// passport sheet through the bulk import, kept as the sheet wrote them.
//
// A record with these lines still says nothing about who bred the material: a date shows who
// held a record first, not who bred it or where it came from (the check page says so).
// SPDX-License-Identifier: Apache-2.0

/** One line: every kind of line break becomes a space (as stage-notes.ts flattenAnswer). */
const flattenAnswer = (s: string | undefined): string =>
  (s ?? '').replace(/\s*[\r\n\u2028\u2029\u0085\v\f]+\s*/g, ' ').trim();

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
];

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

/** The notes a record is sealed with: the origin block first, a blank line, then the rest as written. */
export const originNotes = (o: Partial<Origin> | undefined, notes: string): string => {
  const lines = originLines(o);
  const rest = notes.trim();
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

/** MCPD SAMPSTAT codes for wild, weedy and traditional material: nobody's own breeding. */
export const isTraditionalOrWild = (sampStat: string): boolean => /^(1\d\d|2\d\d|300)$/.test(sampStat.trim());
