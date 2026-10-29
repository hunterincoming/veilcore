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
// SPDX-License-Identifier: Apache-2.0

import { base64urlnopad } from '@scure/base';
import { fingerprintRecord } from './commitment';
import {
  DOCUMENT_PROFILE,
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
  refId: f.reference,
  parents: [],
  photoFingerprints: [],
  document: { type: f.type, issuer: f.issuer, files: f.files, about: f.about },
});

/** The link for a document record the holder has: its sealed fields after the #. */
export const documentCheckLink = (record: DocumentRecordLike, origin: string): string => {
  const fields = documentFieldsOf(record);
  const problems = validateDocumentFields(fields);
  if (problems.length) throw new Error(`This document record can't be shared: ${problems.join('; ')}.`);
  const payload = new TextEncoder().encode(JSON.stringify({ v: 1, fields }));
  return `${origin}${DOCUMENT_CHECK_PATH}#d=${base64urlnopad.encode(payload)}`;
};

export type ReadLink =
  | { readonly ok: true; readonly fields: DocumentFields; readonly fingerprint: string }
  | { readonly ok: false; readonly why: 'missing' | 'unreadable' | 'not-a-document' };

/** The link's sealed fields, checked against the profile, and the proof code they recompute to. */
export const readDocumentLink = async (hash: string): Promise<ReadLink> => {
  const d = new URLSearchParams(hash.replace(/^#/, '')).get('d');
  if (!d) return { ok: false, why: 'missing' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(base64urlnopad.decode(d)));
  } catch {
    return { ok: false, why: 'unreadable' };
  }
  const o = parsed as { v?: unknown; fields?: unknown } | null;
  if (typeof o !== 'object' || o === null || o.v !== 1) return { ok: false, why: 'unreadable' };
  const fields = o.fields as Record<string, unknown> | undefined;
  if (!fields || fields.profile !== DOCUMENT_PROFILE || validateDocumentFields(fields).length)
    return { ok: false, why: 'not-a-document' };
  const f = fields as unknown as DocumentFields;
  return { ok: true, fields: f, fingerprint: await fingerprintRecord(appRecordOfFields(f)) };
};
