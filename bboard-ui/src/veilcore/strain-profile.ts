// A strain or line record: one microbial strain, cell line or insect line (docs/strain-profile.md,
// SPEC 11.9). Draft until it is marked final: test networks only (STRAIN_RECORDS_ENABLED).
//
// Why one profile for all of these and not one each: a standard shouldn't need a new record
// type for every organism. What a culture collection, a cell bank and an insect-rearing
// facility all record is the same shape: what it is (group, species), what it's called (a
// name and the holder's own designation), where copies are deposited (culture collection or
// patent deposit numbers), how it was made (wild isolate, neutron irradiation, chemical
// mutagenesis, crossing, editing...), which generation or passage, and which strain(s) it came
// from. Those are the fields below, named the way culture collections and INSDC (GenBank's
// `strain` and `culture_collection`) name them.
//
// The fingerprint rules don't change, exactly as for animal records (animal-profile.ts): the
// profile says which fields are sealed and in what form, and a value in any other form is
// refused, never tidied. Inside the app a strain keeps the shared record shape:
//   strainName  the strain's name                refId           the holder's designation
//   bredBy      who made or isolated it          taxon           species
//   dateCreated when it was made (as stated)     breedingMethod  how it was made
//   parents     parent strain(s): name, deposit number in individualId, recordId if logged
//   strain      group, deposits, generation
// SPDX-License-Identifier: Apache-2.0

/** The profile a strain or line record is sealed under. */
export const STRAIN_PROFILE = 'veilcore/profile/strain/v1';

export const STRAIN_GROUPS = [
  'bacterium',
  'archaeon',
  'yeast',
  'filamentous-fungus',
  'microalga',
  'protist',
  'virus',
  'cell-line',
  'insect',
  'other',
] as const;
export type StrainGroup = (typeof STRAIN_GROUPS)[number];

/** What a strain record has that a plant record doesn't. */
export type StrainDetails = {
  readonly group: StrainGroup;
  /** Culture collection or patent deposit numbers as the collection writes them: "NBRC 3301", "NITE BP-01234". */
  readonly deposits: readonly string[];
  /** Generation or passage, free text: "M2", "P5", "F3". '' when not stated. */
  readonly generation: string;
};

export type StrainRecordLike = {
  readonly profile?: string;
  readonly strainName: string;
  readonly bredBy: string;
  readonly dateCreated: string;
  readonly notes: string;
  readonly loggedAt: number;
  readonly nonce: string;
  readonly keyBinding?: string;
  readonly taxon?: string;
  readonly refId?: string;
  readonly breedingMethod?: string;
  readonly photoFingerprints?: readonly string[];
  readonly parents?: readonly { recordId?: string; name: string; individualId?: string }[];
  readonly strain?: Partial<StrainDetails>;
};

/** A strain or line record (by its profile). */
export const isStrain = (r: { readonly profile?: string } | undefined): boolean => r?.profile === STRAIN_PROFILE;

/** The sealed fields, under the profile's names. Nothing is filled in: a missing value stays missing. */
export const strainFieldsOf = (r: StrainRecordLike): Record<string, unknown> => ({
  deposits: r.strain?.deposits ? [...r.strain.deposits] : undefined,
  designation: r.refId,
  generation: r.strain?.generation,
  group: r.strain?.group,
  loggedAt: r.loggedAt,
  madeOn: r.dateCreated,
  maker: r.bredBy,
  method: r.breedingMethod,
  name: r.strainName,
  nonce: r.nonce,
  notes: r.notes,
  parents: (r.parents ?? []).map((p) => ({
    deposit: p.individualId,
    name: p.name,
    ...(p.recordId !== undefined ? { recordId: p.recordId } : {}),
  })),
  photoFingerprints: r.photoFingerprints ?? [],
  profile: r.profile,
  species: r.taxon,
  ...(r.keyBinding !== undefined ? { keyBinding: r.keyBinding } : {}),
});

// ---- validation (the profile's canonical form) ---------------------------------------------

export const STRAIN_LINE_MAX = 200;
export const STRAIN_NOTES_MAX = 20_000;
export const STRAIN_DEPOSITS_MAX = 8;

const REQUIRED = [
  'deposits',
  'designation',
  'generation',
  'group',
  'loggedAt',
  'madeOn',
  'maker',
  'method',
  'name',
  'nonce',
  'notes',
  'parents',
  'photoFingerprints',
  'profile',
  'species',
] as const;
const ALLOWED = new Set<string>([...REQUIRED, 'keyBinding']);
const LINES = ['species', 'name', 'designation', 'method', 'generation', 'maker'] as const;

const HEX64 = /^[0-9a-f]{64}$/;
const NONCE = /^(?:[0-9a-f]{2}){32,64}$/;
const RECORD_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const CONTROL = /\p{Cc}/u;

const lineProblem = (what: string, v: unknown): string | undefined => {
  if (typeof v !== 'string') return `${what} must be text`;
  if (Array.from(v).length > STRAIN_LINE_MAX) return `${what} must be at most ${STRAIN_LINE_MAX} characters`;
  if (CONTROL.test(v)) return `${what} must be one line, with no tabs or control characters`;
  if (v !== v.trim()) return `${what} must not start or end with a space`;
  return undefined;
};

const isCalendarDate = (v: string): boolean => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]);
};

/** What is wrong with a strain record's sealed fields, one sentence each; [] when none. */
export const validateStrainFields = (fields: unknown): string[] => {
  if (typeof fields !== 'object' || fields === null || Array.isArray(fields)) return ['the fields must be an object'];
  const f = fields as Record<string, unknown>;
  const out: string[] = [];
  if (f.profile !== STRAIN_PROFILE) out.push(`profile must be ${STRAIN_PROFILE}`);
  for (const k of REQUIRED) if (f[k] === undefined) out.push(`${k} is missing`);
  for (const k of Object.keys(f)) if (!ALLOWED.has(k)) out.push(`${k} is not a field of this profile`);
  for (const k of LINES) {
    if (f[k] === undefined) continue;
    const p = lineProblem(k, f[k]);
    if (p) out.push(p);
  }
  const text = (k: string) => (typeof f[k] === 'string' ? f[k] : '');
  if (f.species !== undefined && text('species') === '') out.push('species must not be empty');
  if (f.maker !== undefined && text('maker') === '') out.push('maker must not be empty');
  if (f.name !== undefined && f.designation !== undefined && text('name') === '' && text('designation') === '')
    out.push('a name or a designation is needed');
  if (f.group !== undefined && !(STRAIN_GROUPS as readonly unknown[]).includes(f.group))
    out.push(`group must be one of ${STRAIN_GROUPS.join(', ')}`);
  if (f.deposits !== undefined) {
    if (!Array.isArray(f.deposits) || f.deposits.length > STRAIN_DEPOSITS_MAX)
      out.push(`deposits must be a list of at most ${STRAIN_DEPOSITS_MAX}`);
    else {
      f.deposits.forEach((d: unknown, i) => {
        const p = lineProblem(`deposit ${i + 1}`, d);
        if (p) out.push(p);
        else if (d === '') out.push(`deposit ${i + 1} must not be empty`);
      });
      if (new Set(f.deposits).size !== f.deposits.length) out.push('each deposit is listed once');
    }
  }
  if (f.notes !== undefined) {
    if (typeof f.notes !== 'string') out.push('notes must be text');
    else if (Array.from(f.notes).length > STRAIN_NOTES_MAX)
      out.push(`notes must be at most ${STRAIN_NOTES_MAX} characters`);
  }
  if (f.madeOn !== undefined && f.madeOn !== '' && !(typeof f.madeOn === 'string' && isCalendarDate(f.madeOn)))
    out.push('madeOn must be empty or a date written YYYY-MM-DD');
  if (
    f.loggedAt !== undefined &&
    !(typeof f.loggedAt === 'number' && Number.isSafeInteger(f.loggedAt) && f.loggedAt >= 0)
  )
    out.push('loggedAt must be a whole number of milliseconds, 0 or more');
  if (f.nonce !== undefined && !(typeof f.nonce === 'string' && NONCE.test(f.nonce)))
    out.push('nonce must be 32 to 64 bytes of lowercase hex');
  if (f.keyBinding !== undefined && !(typeof f.keyBinding === 'string' && HEX64.test(f.keyBinding)))
    out.push('keyBinding must be 64 lowercase hex characters');
  if (f.photoFingerprints !== undefined) {
    if (!Array.isArray(f.photoFingerprints) || f.photoFingerprints.length > 500)
      out.push('photoFingerprints must be a list of at most 500');
    else if (!f.photoFingerprints.every((p) => typeof p === 'string' && HEX64.test(p)))
      out.push('each photo code must be 64 lowercase hex characters');
  }
  if (f.parents !== undefined) out.push(...parentProblems(f.parents));
  return out;
};

const PARENT_KEYS = new Set(['name', 'deposit', 'recordId']);

/** At most two parent strains (one for a mutant or a subculture; two for a cross, fusion or mating). */
const parentProblems = (parents: unknown): string[] => {
  if (!Array.isArray(parents)) return ['parents must be a list'];
  if (parents.length > 2) return ['parents may name at most two parent strains'];
  const out: string[] = [];
  parents.forEach((p: unknown, i) => {
    const at = `parent ${i + 1}`;
    if (typeof p !== 'object' || p === null || Array.isArray(p)) {
      out.push(`${at} must be an object`);
      return;
    }
    const q = p as Record<string, unknown>;
    for (const k of Object.keys(q)) if (!PARENT_KEYS.has(k)) out.push(`${at}: ${k} is not a parent field`);
    for (const k of ['name', 'deposit'] as const) {
      if (q[k] === undefined) out.push(`${at}: ${k} is missing`);
      else {
        const pr = lineProblem(`${at}: ${k}`, q[k]);
        if (pr) out.push(pr);
      }
    }
    if (q.recordId !== undefined && !(typeof q.recordId === 'string' && RECORD_ID.test(q.recordId)))
      out.push(`${at}: recordId is not a record id`);
    if (q.recordId === undefined && q.name === '' && q.deposit === '')
      out.push(`${at}: needs a name, a deposit number or a linked record`);
  });
  return out;
};

/** The sealed fields, checked: throws the first problem, so nothing malformed is ever sealed. */
export const checkedStrainFields = (r: StrainRecordLike): Record<string, unknown> => {
  const fields = strainFieldsOf(r);
  const problems = validateStrainFields(fields);
  if (problems.length) throw new Error(`This strain record can't be sealed: ${problems.join('; ')}.`);
  return fields;
};
