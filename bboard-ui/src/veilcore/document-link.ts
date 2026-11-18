// A document check link (docs/document-profile.md, "How someone checks a document").
//
// A fingerprint the holder merely says is a file's proves nothing: it could be said after the
// date. So the link carries the document record's sealed fields themselves, after the #
// (a browser never sends that part to a server). The checker's browser recomputes the record's
// proof code from them with the same rules as any record (SPEC 3.6.1, 4.4), looks up the date
// of exactly that proof code (its inclusion proof, then the anchor on Midnight), and hashes the
// file the checker picks. Nothing in the link is believed: fields that don't recompute to a
// dated proof code date nothing, and a file that isn't byte for byte one of them matches
// nothing.
//
//   /check-document#d=<base64url of {"v":1,"fields":{…the sealed fields…}}>
//
// A link with its chain (docs/document-chain.md) carries more, and only when the holder asks
// for that link: beside `fields`, a `chain` list of the records this one is about, and the ones
// those are about. A document in it comes with its own sealed fields, so its check page can be
// opened from this one; any other record comes with its proof code, for its public check page.
//
//   {"v":1,"fields":{…},"chain":[{"id":"<record id>","fields":{…}},{"id":"<record id>","code":"<proof code>"}]}
//
// `chain` is outside the sealed fields: it is what the link's sender put there, and nothing
// seals a record ID to a proof code. Each record in it is checked on its own page, by its own
// proof code and date. A site build from before this reads `fields` and ignores `chain`.
// Following a link to a document in the chain stays in the browser: the link out carries that
// one record's fields after the #, and the app hands the rest of the chain to the next page
// itself (the router's own state, never the address). So the address can't be made to say
// where a page was opened from, and a long chain isn't repeated in every link on the page.
// SPDX-License-Identifier: Apache-2.0

import { LANGUAGE_CODES } from '../config/languages';
import { base64urlnopad } from '@scure/base';
import { fingerprintRecord } from './commitment';
import { verifyPath } from './verify-link';
import { upstreamOf } from './document-chain';
import {
  DOCUMENT_PROFILE,
  RECORD_ID,
  isDocument,
  validateDocumentFields,
  type DocumentAbout,
  type DocumentFile,
  type DocumentRecordLike,
  type DocumentType,
  documentFieldsOf,
} from './document-profile';

export const DOCUMENT_CHECK_PATH = '/check-document';

/** The sealed fields of a document record, as the profile names them. */
export type DocumentFields = {
  readonly about: readonly DocumentAbout[];
  readonly files: readonly DocumentFile[];
  readonly holder: string;
  readonly issued: string;
  readonly issuer: string;
  readonly keyBinding?: string;
  readonly fieldSchema?: string;
  readonly fieldSetRoot?: string;
  readonly loggedAt: number;
  readonly nonce: string;
  readonly notes: string;
  readonly profile: string;
  readonly reference: string;
  readonly title: string;
  readonly type: DocumentType;
};

/** The app's record shape for these fields: what fingerprintRecord takes. */
export const appRecordOfFields = (f: DocumentFields): DocumentRecordLike & { parents: []; photoFingerprints: [] } => ({
  profile: f.profile,
  strainName: f.title,
  bredBy: f.holder,
  dateCreated: f.issued,
  notes: f.notes,
  loggedAt: f.loggedAt,
  nonce: f.nonce,
  ...(f.keyBinding !== undefined ? { keyBinding: f.keyBinding } : {}),
  ...(f.fieldSchema !== undefined ? { fieldSchema: f.fieldSchema, fieldSetRoot: f.fieldSetRoot } : {}),
  refId: f.reference,
  parents: [],
  photoFingerprints: [],
  document: { type: f.type, issuer: f.issuer, files: f.files, about: f.about },
});

/** The link for a document record the holder has: its sealed fields after the #. */
/** `?lang=xx` for a language other than English, so the link opens in the sender's language. */
// A draft language goes too: the holder chose it, and the page shows the same draft notice.
const langQuery = (lang?: string): string =>
  lang && (LANGUAGE_CODES as readonly string[]).includes(lang) && lang !== 'en' ? `?lang=${lang}` : '';

export const documentCheckLink = (record: DocumentRecordLike, origin: string, lang?: string): string => {
  const fields = documentFieldsOf(record);
  const problems = validateDocumentFields(fields);
  if (problems.length) throw new Error(`This document record can't be shared: ${problems.join('; ')}.`);
  return `${origin}${DOCUMENT_CHECK_PATH}${langQuery(lang)}#d=${encode({ v: 1, fields })}`;
};

const HEX64 = /^[0-9a-f]{64}$/;

/** A record a link carries beside its own: a document with its sealed fields, or any record with its proof code. */
export type ChainEntry =
  | { readonly id: string; readonly fields: DocumentFields }
  | { readonly id: string; readonly code: string };

/** The most records a link's chain may carry. */
export const CHAIN_ENTRIES_MAX = 40;
/**
 * The most a link may carry after `#d=`, in characters. An ordinary document link is far under
 * it (20,000 characters of notes and 20 files come to about 150,000); a link over it is refused
 * whole, never read in part, and is never made.
 */
export const LINK_CHARS_MAX = 600_000;

const encode = (payload: unknown): string => base64urlnopad.encode(new TextEncoder().encode(JSON.stringify(payload)));

type HeldForChain = DocumentRecordLike & { readonly id: string; readonly recordFingerprint?: string };

/**
 * The records to carry with a document's link: everything it is about that this browser holds,
 * and what those are about (document-chain.ts upstreamOf), nearest first. A document whose
 * fields can't be shared, or a record with no proof code, is left out.
 */
export const chainEntriesFor = (record: HeldForChain, records: readonly HeldForChain[]): ChainEntry[] =>
  upstreamOf(record, records)
    .flatMap((step): ChainEntry[] => {
      const r = step.record;
      if (!r) return [];
      if (isDocument(r)) {
        const fields = documentFieldsOf(r);
        return validateDocumentFields(fields).length ? [] : [{ id: r.id, fields: fields as unknown as DocumentFields }];
      }
      return r.recordFingerprint && HEX64.test(r.recordFingerprint) ? [{ id: r.id, code: r.recordFingerprint }] : [];
    })
    .slice(0, CHAIN_ENTRIES_MAX);

/**
 * The link for a document record with its chain: its sealed fields, and the records it is
 * about that this browser holds. Whoever has the link sees every one of those documents'
 * fields too, so it is made only when the holder asks for it.
 */
export const documentChainLink = (
  record: HeldForChain,
  records: readonly HeldForChain[],
  origin: string,
  lang?: string,
): string => {
  const fields = documentFieldsOf(record);
  const problems = validateDocumentFields(fields);
  if (problems.length) throw new Error(`This document record can't be shared: ${problems.join('; ')}.`);
  const chain = chainEntriesFor(record, records);
  const d = encode({ v: 1, fields, ...(chain.length ? { chain } : {}) });
  if (d.length > LINK_CHARS_MAX)
    throw new Error('This chain is too large for one link. Send each record’s own link instead.');
  return `${origin}${DOCUMENT_CHECK_PATH}${langQuery(lang)}#d=${d}`;
};

/** The chain a link's payload carries: every well-formed entry, each record once. Anything else is dropped. */
export const readChain = (v: unknown): ChainEntry[] => {
  if (!Array.isArray(v)) return [];
  const out: ChainEntry[] = [];
  const seen = new Set<string>();
  for (const e of v.slice(0, CHAIN_ENTRIES_MAX) as unknown[]) {
    if (typeof e !== 'object' || e === null) continue;
    const o = e as { id?: unknown; fields?: unknown; code?: unknown };
    if (typeof o.id !== 'string' || !RECORD_ID.test(o.id) || seen.has(o.id)) continue;
    if (o.fields !== undefined) {
      const f = o.fields as Record<string, unknown> | null;
      if (!f || f.profile !== DOCUMENT_PROFILE || validateDocumentFields(f).length) continue;
      out.push({ id: o.id, fields: f as unknown as DocumentFields });
    } else if (typeof o.code === 'string' && HEX64.test(o.code)) out.push({ id: o.id, code: o.code });
    else continue;
    seen.add(o.id);
  }
  return out;
};

/**
 * What the app hands the page a link in the chain opens, through the router and never through
 * the address: the record ID it was named by, the proof code of the page it was opened from,
 * and the rest of the chain, so the next link up can be followed the same way.
 */
export type OpenedFrom = { readonly namedAs: string; readonly from: string; readonly chain: readonly ChainEntry[] };

/** What a page was handed by the app's own navigation, checked for form; undefined for anything else. */
export const openedFrom = (state: unknown): OpenedFrom | undefined => {
  if (typeof state !== 'object' || state === null) return undefined;
  const o = state as { namedAs?: unknown; from?: unknown; chain?: unknown };
  if (typeof o.namedAs !== 'string' || !RECORD_ID.test(o.namedAs)) return undefined;
  if (typeof o.from !== 'string' || !HEX64.test(o.from)) return undefined;
  return { namedAs: o.namedAs, from: o.from, chain: readChain(o.chain) };
};

/** Where an `about` entry's link goes, and what stands behind it. */
export type AboutTarget =
  /** A document the link carries: its own check page, opened from the link alone (nothing is sent). */
  (
    | { readonly kind: 'document'; readonly to: string; readonly state: OpenedFrom }
    /** Any other record the link (or this device) has a proof code for: its public check page, checked against that code. */
    | { readonly kind: 'record'; readonly to: string }
    /** Only the record's ID is known: its public check page, worded there as the registry's report. */
    | { readonly kind: 'id-only'; readonly to: string }
  ) & { readonly state?: OpenedFrom };

/**
 * Where the link for a record an `about` entry names goes. A document carried in the chain
 * opens on the document check page: its own fields after the #, and the chain handed on by the
 * app (`state`). `from` is the proof code of the page the link is on.
 */
export const aboutTarget = (recordId: string, chain: readonly ChainEntry[], from = ''): AboutTarget => {
  const e = chain.find((x) => x.id === recordId);
  if (e && 'fields' in e)
    return {
      kind: 'document',
      to: `${DOCUMENT_CHECK_PATH}#d=${encode({ v: 1, fields: e.fields })}`,
      state: { namedAs: recordId, from, chain },
    };
  if (e) return { kind: 'record', to: verifyPath(recordId, e.code) };
  return { kind: 'id-only', to: verifyPath(recordId) };
};

export type ReadLink =
  | {
      readonly ok: true;
      readonly fields: DocumentFields;
      readonly fingerprint: string;
      /** The records the link carries beside this one ([] for a link without a chain). */
      readonly chain: readonly ChainEntry[];
    }
  | { readonly ok: false; readonly why: 'missing' | 'unreadable' | 'not-a-document' | 'too-large' };

/** The link's sealed fields, checked against the profile, and the proof code they recompute to. */
export const readDocumentLink = async (hash: string): Promise<ReadLink> => {
  const d = new URLSearchParams(hash.replace(/^#/, '')).get('d');
  if (!d) return { ok: false, why: 'missing' };
  if (d.length > LINK_CHARS_MAX) return { ok: false, why: 'too-large' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(base64urlnopad.decode(d)));
  } catch {
    return { ok: false, why: 'unreadable' };
  }
  const o = parsed as { v?: unknown; fields?: unknown; chain?: unknown } | null;
  if (typeof o !== 'object' || o === null || o.v !== 1) return { ok: false, why: 'unreadable' };
  const fields = o.fields as Record<string, unknown> | undefined;
  if (!fields || fields.profile !== DOCUMENT_PROFILE || validateDocumentFields(fields).length)
    return { ok: false, why: 'not-a-document' };
  const f = fields as unknown as DocumentFields;
  return {
    ok: true,
    fields: f,
    fingerprint: await fingerprintRecord(appRecordOfFields(f)),
    chain: readChain(o.chain),
  };
};
