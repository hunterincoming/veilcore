// A document record: one document (a permit, a COA, a contract, a protocol, a transport
// document), sealed by the fingerprints of its files (docs/document-profile.md, SPEC 11.10).
// Draft until it is marked final: test networks only (DOCUMENT_RECORDS_ENABLED).
//
// The file never leaves the device: its SHA-256, name and size are sealed, the way
// OpenTimestamps and document-timestamping services hash locally and stamp only the hash. What
// VeilCore adds is what every record has: private until the holder shows it, a date on Midnight
// (and on Bitcoin, through the batch's OpenTimestamps proof), and links to the genetic records
// the document is about.
//
// The fingerprint rules don't change, exactly as for animal and strain records: the profile
// says which fields are sealed and in what form, and a value in any other form is refused,
// never tidied. Inside the app a document keeps the shared record shape:
//   strainName  the document's title           refId        its reference number
//   bredBy      who holds and seals it          dateCreated  the date written on it (as stated)
//   notes       notes
//   document    type, issuer, files, about
// `about` is NOT `parents`: a document is not descended from anything, and the family tree,
// descent checks and royalties must never treat it as an offspring.
// SPDX-License-Identifier: Apache-2.0

/** The profile a document record is sealed under. */
export const DOCUMENT_PROFILE = 'veilcore/profile/document/v1';

export const DOCUMENT_TYPES = [
  'permit',
  'certificate-of-analysis',
  'lab-report',
  'contract',
  'protocol',
  'transport',
  'invoice',
  'other',
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

/** One file of a document: what is sealed about it. Never its bytes. */
export type DocumentFile = {
  readonly name: string;
  /** SHA-256 of the file's bytes, 64 lowercase hex characters. */
  readonly sha256: string;
  /** Its size in bytes. */
  readonly size: number;
};

/** A genetic record the document is about: logged (recordId) or named. */
export type DocumentAbout = { readonly name: string; readonly recordId?: string };

/** What a document record has that a plant record doesn't. */
export type DocumentDetails = {
  readonly type: DocumentType;
  /** Who issued it, as written on it. '' when not stated. */
  readonly issuer: string;
  readonly files: readonly DocumentFile[];
  readonly about: readonly DocumentAbout[];
};

export type DocumentRecordLike = {
  readonly profile?: string;
  readonly strainName: string;
  readonly bredBy: string;
  readonly dateCreated: string;
  readonly notes: string;
  readonly loggedAt: number;
  readonly nonce: string;
  readonly keyBinding?: string;
  readonly refId?: string;
  readonly document?: Partial<DocumentDetails>;
};

/** A document record (by its profile). */
export const isDocument = (r: { readonly profile?: string } | undefined): boolean => r?.profile === DOCUMENT_PROFILE;

/** The sealed fields, under the profile's names. Nothing is filled in: a missing value stays missing. */
export const documentFieldsOf = (r: DocumentRecordLike): Record<string, unknown> => ({
  about: r.document?.about?.map((a) => ({
    name: a.name,
    ...(a.recordId !== undefined ? { recordId: a.recordId } : {}),
  })),
  files: r.document?.files?.map((f) => ({ name: f.name, sha256: f.sha256, size: f.size })),
  holder: r.bredBy,
  issued: r.dateCreated,
  issuer: r.document?.issuer,
  loggedAt: r.loggedAt,
  nonce: r.nonce,
  notes: r.notes,
  profile: r.profile,
  reference: r.refId,
  title: r.strainName,
  type: r.document?.type,
  ...(r.keyBinding !== undefined ? { keyBinding: r.keyBinding } : {}),
});

// ---- validation (the profile's canonical form) ---------------------------------------------

export const DOCUMENT_LINE_MAX = 200;
export const DOCUMENT_NOTES_MAX = 20_000;
export const DOCUMENT_FILES_MAX = 20;
export const DOCUMENT_ABOUT_MAX = 20;

const REQUIRED = [
  'about',
  'files',
  'holder',
  'issued',
  'issuer',
  'loggedAt',
  'nonce',
  'notes',
  'profile',
  'reference',
  'title',
  'type',
] as const;
const ALLOWED = new Set<string>([...REQUIRED, 'keyBinding']);
const LINES = ['title', 'issuer', 'reference', 'holder'] as const;

const HEX64 = /^[0-9a-f]{64}$/;
const NONCE = /^(?:[0-9a-f]{2}){32,64}$/;
const RECORD_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const CONTROL = /\p{Cc}/u;

const lineProblem = (what: string, v: unknown): string | undefined => {
  if (typeof v !== 'string') return `${what} must be text`;
  if (Array.from(v).length > DOCUMENT_LINE_MAX) return `${what} must be at most ${DOCUMENT_LINE_MAX} characters`;
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

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

const FILE_KEYS = new Set(['name', 'sha256', 'size']);
const fileProblems = (files: unknown): string[] => {
  if (!Array.isArray(files)) return ['files must be a list'];
  if (files.length < 1) return ['a document needs at least one file'];
  if (files.length > DOCUMENT_FILES_MAX) return [`files may list at most ${DOCUMENT_FILES_MAX}`];
  const out: string[] = [];
  files.forEach((f: unknown, i) => {
    const at = `file ${i + 1}`;
    if (!isObject(f)) {
      out.push(`${at} must be an object`);
      return;
    }
    for (const k of Object.keys(f)) if (!FILE_KEYS.has(k)) out.push(`${at}: ${k} is not a file field`);
    if (f.name === undefined) out.push(`${at}: name is missing`);
    else {
      const p = lineProblem(`${at}: name`, f.name);
      if (p) out.push(p);
      else if (f.name === '') out.push(`${at}: name must not be empty`);
    }
    if (!(typeof f.sha256 === 'string' && HEX64.test(f.sha256)))
      out.push(`${at}: sha256 must be 64 lowercase hex characters`);
    if (!(typeof f.size === 'number' && Number.isSafeInteger(f.size) && f.size >= 0))
      out.push(`${at}: size must be a whole number of bytes, 0 or more`);
  });
  const shas = files.map((f: unknown) => (isObject(f) ? f.sha256 : undefined));
  if (new Set(shas).size !== shas.length) out.push('each file is listed once (no two with the same SHA-256)');
  return out;
};

const ABOUT_KEYS = new Set(['name', 'recordId']);
const aboutProblems = (about: unknown): string[] => {
  if (!Array.isArray(about)) return ['about must be a list'];
  if (about.length > DOCUMENT_ABOUT_MAX) return [`about may name at most ${DOCUMENT_ABOUT_MAX} records`];
  const out: string[] = [];
  about.forEach((a: unknown, i) => {
    const at = `about ${i + 1}`;
    if (!isObject(a)) {
      out.push(`${at} must be an object`);
      return;
    }
    for (const k of Object.keys(a)) if (!ABOUT_KEYS.has(k)) out.push(`${at}: ${k} is not an about field`);
    if (a.name === undefined) out.push(`${at}: name is missing`);
    else {
      const p = lineProblem(`${at}: name`, a.name);
      if (p) out.push(p);
    }
    if (a.recordId !== undefined && !(typeof a.recordId === 'string' && RECORD_ID.test(a.recordId)))
      out.push(`${at}: recordId is not a record id`);
    if (a.recordId === undefined && a.name === '') out.push(`${at}: needs a name or a linked record`);
  });
  return out;
};

/** What is wrong with a document record's sealed fields, one sentence each; [] when none. */
export const validateDocumentFields = (fields: unknown): string[] => {
  if (!isObject(fields)) return ['the fields must be an object'];
  const f = fields;
  const out: string[] = [];
  if (f.profile !== DOCUMENT_PROFILE) out.push(`profile must be ${DOCUMENT_PROFILE}`);
  for (const k of REQUIRED) if (f[k] === undefined) out.push(`${k} is missing`);
  for (const k of Object.keys(f)) if (!ALLOWED.has(k)) out.push(`${k} is not a field of this profile`);
  for (const k of LINES) {
    if (f[k] === undefined) continue;
    const p = lineProblem(k, f[k]);
    if (p) out.push(p);
  }
  if (f.title === '') out.push('title must not be empty');
  if (f.holder === '') out.push('holder must not be empty');
  if (f.type !== undefined && !(DOCUMENT_TYPES as readonly unknown[]).includes(f.type))
    out.push(`type must be one of ${DOCUMENT_TYPES.join(', ')}`);
  if (f.files !== undefined) out.push(...fileProblems(f.files));
  if (f.about !== undefined) out.push(...aboutProblems(f.about));
  if (f.notes !== undefined) {
    if (typeof f.notes !== 'string') out.push('notes must be text');
    else if (Array.from(f.notes).length > DOCUMENT_NOTES_MAX)
      out.push(`notes must be at most ${DOCUMENT_NOTES_MAX} characters`);
  }
  if (f.issued !== undefined && f.issued !== '' && !(typeof f.issued === 'string' && isCalendarDate(f.issued)))
    out.push('issued must be empty or a date written YYYY-MM-DD');
  if (
    f.loggedAt !== undefined &&
    !(typeof f.loggedAt === 'number' && Number.isSafeInteger(f.loggedAt) && f.loggedAt >= 0)
  )
    out.push('loggedAt must be a whole number of milliseconds, 0 or more');
  if (f.nonce !== undefined && !(typeof f.nonce === 'string' && NONCE.test(f.nonce)))
    out.push('nonce must be 32 to 64 bytes of lowercase hex');
  if (f.keyBinding !== undefined && !(typeof f.keyBinding === 'string' && HEX64.test(f.keyBinding)))
    out.push('keyBinding must be 64 lowercase hex characters');
  return out;
};

/** The sealed fields, checked: throws the first problem, so nothing malformed is ever sealed. */
export const checkedDocumentFields = (r: DocumentRecordLike): Record<string, unknown> => {
  const fields = documentFieldsOf(r);
  const problems = validateDocumentFields(fields);
  if (problems.length) throw new Error(`This document record can't be sealed: ${problems.join('; ')}.`);
  return fields;
};

// ---- the file itself: hashed in the browser, never uploaded ---------------------------------

/** Files up to this size are hashed (a scanned contract or a lab's chromatogram fits). */
export const MAX_DOCUMENT_BYTES = 200 * 1024 * 1024;

const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, '0')).join('');

/** A file's name as sealed: no folders, no control characters, trimmed, at most 200 characters. */
export const documentFileName = (n: string): string =>
  Array.from(
    (n.split(/[\\/]/).pop() ?? '')
      // eslint-disable-next-line no-control-regex -- control characters are what this removes
      .replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  )
    .slice(0, DOCUMENT_LINE_MAX)
    .join('')
    .trim() || 'document';

/** What is sealed about a file: its SHA-256, its name and size. The bytes stay on the device. */
export const fingerprintFile = async (file: Blob & { readonly name?: string }): Promise<DocumentFile> => {
  if (file.size > MAX_DOCUMENT_BYTES) throw new Error('too-large');
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return { name: documentFileName(file.name ?? ''), sha256: hex(digest), size: file.size };
};

/** Which sealed file, if any, a file someone was sent is byte for byte. */
export const matchFile = (sealed: readonly DocumentFile[], sha256: string): DocumentFile | undefined =>
  sealed.find((f) => f.sha256 === sha256.toLowerCase());
