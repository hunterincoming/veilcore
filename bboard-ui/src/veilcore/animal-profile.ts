// An animal record: one animal, logged by its breeder or a registry (docs/animal-profile.md,
// SPEC 11.8). Version 1 is final: any change to the fields below is a new profile, v2.
//
// The fingerprint rules don't change. A profile says which fields are sealed and in what
// form; for `veilcore/profile/animal-individual/v1` they are the ones below, hashed exactly
// as a plant record's are (SHA-256 of the canonical JSON, with the key folded in at the
// top when the record names its key). A plant record never reaches this file: every
// record without this profile is sealed and checked exactly as before.
//
// Inside this app an animal record keeps the shared record shape, so every screen that
// shows a record's name, date, photos, DNA report and key still works:
//   strainName  the animal's name              refId    its individual ID
//   bredBy      breeder or holder              taxon    species
//   dateCreated date of birth (as stated)      parents  sire and dam, each with a role
//   animal      breed, ID scheme, sex, herd
// animalFieldsOf turns that into the profile's own field names, which are what is sealed
// and what an export's `fields` carries. The registry does the same (lineage/animal-profile.mjs),
// checked against the same vectors (contract/vectors/animal-individual-v1.json).
// SPDX-License-Identifier: Apache-2.0

/** The profile an animal record is sealed under. */
export const ANIMAL_PROFILE = 'veilcore/profile/animal-individual/v1';

export type AnimalSex = 'female' | 'male' | 'unknown';
export const ANIMAL_SEXES: readonly AnimalSex[] = ['female', 'male', 'unknown'];

/** What an animal record has that a plant record doesn't. */
export type AnimalDetails = {
  readonly breed: string;
  /** The ID scheme the individual ID belongs to, free text: "Japan cattle ID (10 digits)", "ear tag". */
  readonly idScheme: string;
  readonly sex: AnimalSex;
  /** Herd or farm, optional ('' when none). */
  readonly herd: string;
};

export type ParentRole = 'sire' | 'dam';

/** A sire or dam as it is sealed: a linked record (recordId), or a name and ID typed in. */
export type AnimalParentFields = {
  readonly role: ParentRole;
  readonly name: string;
  readonly individualId: string;
  readonly recordId?: string;
};

/** The sealed fields of an animal record, under the profile's own names. */
export type AnimalFields = {
  readonly profile: typeof ANIMAL_PROFILE;
  readonly species: string;
  readonly breed: string;
  readonly name: string;
  readonly individualId: string;
  readonly idScheme: string;
  readonly sex: AnimalSex;
  readonly dateOfBirth: string;
  readonly parents: readonly AnimalParentFields[];
  readonly breeder: string;
  readonly herd: string;
  readonly notes: string;
  readonly photoFingerprints: readonly string[];
  readonly loggedAt: number;
  readonly nonce: string;
  readonly keyBinding?: string;
};

/** The record shape this app keeps, as far as an animal record needs it. */
export type AnimalRecordLike = {
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
  readonly photoFingerprints?: readonly string[];
  readonly parents?: readonly { recordId?: string; name: string; role?: string; individualId?: string }[];
  readonly animal?: Partial<AnimalDetails>;
};

/** An animal record (by its profile). Everything else is a plant record, old ones included. */
export const isAnimal = (r: { readonly profile?: string } | undefined): boolean => r?.profile === ANIMAL_PROFILE;

/**
 * The sealed fields, under the profile's names, from the app's record. Nothing is filled in
 * here: a value the record lacks stays missing, and validateAnimalFields refuses it.
 */
export const animalFieldsOf = (r: AnimalRecordLike): Record<string, unknown> => ({
  breed: r.animal?.breed,
  breeder: r.bredBy,
  dateOfBirth: r.dateCreated,
  herd: r.animal?.herd,
  idScheme: r.animal?.idScheme,
  individualId: r.refId,
  loggedAt: r.loggedAt,
  name: r.strainName,
  nonce: r.nonce,
  notes: r.notes,
  parents: (r.parents ?? []).map((p) => ({
    individualId: p.individualId,
    name: p.name,
    role: p.role,
    ...(p.recordId !== undefined ? { recordId: p.recordId } : {}),
  })),
  photoFingerprints: r.photoFingerprints ?? [],
  profile: r.profile,
  sex: r.animal?.sex,
  species: r.taxon,
  ...(r.keyBinding !== undefined ? { keyBinding: r.keyBinding } : {}),
});

// ---- validation (the profile's canonical form) ---------------------------------------------

/** The most characters in a one-line field, and in notes. */
export const ANIMAL_LINE_MAX = 200;
export const ANIMAL_NOTES_MAX = 20_000;

const REQUIRED = [
  'breed',
  'breeder',
  'dateOfBirth',
  'herd',
  'idScheme',
  'individualId',
  'loggedAt',
  'name',
  'nonce',
  'notes',
  'parents',
  'photoFingerprints',
  'profile',
  'sex',
  'species',
] as const;
const ALLOWED = new Set<string>([...REQUIRED, 'keyBinding']);
const LINES = ['species', 'breed', 'name', 'individualId', 'idScheme', 'breeder', 'herd'] as const;

const HEX64 = /^[0-9a-f]{64}$/;
const NONCE = /^(?:[0-9a-f]{2}){32,64}$/;
const RECORD_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const CONTROL = /\p{Cc}/u;

/** A one-line value: no control characters (line breaks, tabs), no spaces at either end. */
const lineProblem = (what: string, v: unknown): string | undefined => {
  if (typeof v !== 'string') return `${what} must be text`;
  if (Array.from(v).length > ANIMAL_LINE_MAX) return `${what} must be at most ${ANIMAL_LINE_MAX} characters`;
  if (CONTROL.test(v)) return `${what} must be one line, with no tabs or control characters`;
  if (v !== v.trim()) return `${what} must not start or end with a space`;
  return undefined;
};

/** A real calendar date, YYYY-MM-DD. */
export const isCalendarDate = (v: string): boolean => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]);
};

/**
 * What is wrong with an animal record's sealed fields, one plain sentence each; [] when they
 * are in the profile's canonical form. A value in any other form is refused, never tidied:
 * one animal written two ways would seal as two different records.
 */
export const validateAnimalFields = (fields: unknown): string[] => {
  if (typeof fields !== 'object' || fields === null || Array.isArray(fields)) return ['the fields must be an object'];
  const f = fields as Record<string, unknown>;
  const out: string[] = [];
  if (f.profile !== ANIMAL_PROFILE) out.push(`profile must be ${ANIMAL_PROFILE}`);
  for (const k of REQUIRED) if (f[k] === undefined) out.push(`${k} is missing`);
  for (const k of Object.keys(f)) if (!ALLOWED.has(k)) out.push(`${k} is not a field of this profile`);
  for (const k of LINES) {
    if (f[k] === undefined) continue;
    const p = lineProblem(k, f[k]);
    if (p) out.push(p);
  }
  if (f.notes !== undefined) {
    if (typeof f.notes !== 'string') out.push('notes must be text');
    else if (Array.from(f.notes).length > ANIMAL_NOTES_MAX)
      out.push(`notes must be at most ${ANIMAL_NOTES_MAX} characters`);
  }
  const text = (k: string) => (typeof f[k] === 'string' ? f[k] : '');
  if (f.species !== undefined && text('species') === '') out.push('species must not be empty');
  if (f.breeder !== undefined && text('breeder') === '') out.push('breeder must not be empty');
  if (f.name !== undefined && f.individualId !== undefined && text('name') === '' && text('individualId') === '')
    out.push('a name or an individual ID is needed');
  if (text('individualId') !== '' && f.idScheme !== undefined && text('idScheme') === '')
    out.push('idScheme must say which ID scheme the individual ID belongs to');
  if (text('idScheme') !== '' && f.individualId !== undefined && text('individualId') === '')
    out.push('idScheme is given but individualId is empty');
  if (f.sex !== undefined && !ANIMAL_SEXES.includes(f.sex as AnimalSex))
    out.push('sex must be female, male or unknown');
  if (
    f.dateOfBirth !== undefined &&
    f.dateOfBirth !== '' &&
    !(typeof f.dateOfBirth === 'string' && isCalendarDate(f.dateOfBirth))
  )
    out.push('dateOfBirth must be empty or a date written YYYY-MM-DD');
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
      out.push('each photo fingerprint must be 64 lowercase hex characters');
  }
  if (f.parents !== undefined) out.push(...parentProblems(f.parents));
  return out;
};

const PARENT_KEYS = new Set(['role', 'name', 'individualId', 'recordId']);

const parentProblems = (parents: unknown): string[] => {
  if (!Array.isArray(parents)) return ['parents must be a list'];
  if (parents.length > 2) return ['parents may name a sire and a dam, nothing more'];
  const out: string[] = [];
  const roles: string[] = [];
  parents.forEach((p: unknown, i) => {
    const at = `parent ${i + 1}`;
    if (typeof p !== 'object' || p === null || Array.isArray(p)) {
      out.push(`${at} must be an object`);
      return;
    }
    const q = p as Record<string, unknown>;
    for (const k of Object.keys(q)) if (!PARENT_KEYS.has(k)) out.push(`${at}: ${k} is not a parent field`);
    if (q.role !== 'sire' && q.role !== 'dam') out.push(`${at}: role must be sire or dam`);
    else roles.push(q.role);
    for (const k of ['name', 'individualId'] as const) {
      if (q[k] === undefined) out.push(`${at}: ${k} is missing`);
      else {
        const pr = lineProblem(`${at}: ${k}`, q[k]);
        if (pr) out.push(pr);
      }
    }
    if (q.recordId !== undefined && !(typeof q.recordId === 'string' && RECORD_ID.test(q.recordId)))
      out.push(`${at}: recordId is not a record id`);
    if (q.recordId === undefined && q.name === '' && q.individualId === '')
      out.push(`${at}: needs a name, an individual ID or a linked record`);
  });
  if (roles.length === 2 && roles[0] === roles[1]) out.push('parents may name one sire and one dam');
  else if (roles.length === 2 && roles[0] !== 'sire') out.push('the sire comes before the dam');
  return out;
};

/** The sealed fields, checked: throws the first problem, so nothing malformed is ever sealed. */
export const checkedAnimalFields = (r: AnimalRecordLike): Record<string, unknown> => {
  const fields = animalFieldsOf(r);
  const problems = validateAnimalFields(fields);
  if (problems.length) throw new Error(`This animal record can't be sealed: ${problems.join('; ')}.`);
  return fields;
};

// ---- small helpers the screens share --------------------------------------------------------

type ParentLike = {
  readonly recordId?: string;
  readonly name: string;
  readonly role?: string;
  readonly individualId?: string;
};

export const sireOf = (r: { readonly parents?: readonly ParentLike[] }): ParentLike | undefined =>
  r.parents?.find((p) => p.role === 'sire');
export const damOf = (r: { readonly parents?: readonly ParentLike[] }): ParentLike | undefined =>
  r.parents?.find((p) => p.role === 'dam');

/** A parent in one line: "Yasufuku (ID 1234567890)", the name alone, or the ID alone. */
export const parentLine = (p: ParentLike | undefined, idWord = 'ID'): string => {
  if (!p) return '';
  const id = p.individualId?.trim();
  const name = p.name.trim();
  if (name && id) return `${name} (${idWord} ${id})`;
  return name || (id ? `${idWord} ${id}` : '');
};

/** What a record is called on screen: its name, or for an animal with no name, its individual ID. */
export const recordTitle = (r: {
  readonly strainName?: string;
  readonly refId?: string;
  readonly profile?: string;
  readonly id: string;
}): string => r.strainName?.trim() || (isAnimal(r) && r.refId?.trim()) || r.id;
