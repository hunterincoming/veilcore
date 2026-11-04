// A laboratory signs the numbers it measured (docs/lab-signing.md).
//
// Without this, the numbers sealed with a document are the holder's as typed: a claim like
// "similarity to the closest variety is at most 95 %" says only that the holder typed a number
// that meets it. With it, the laboratory that did the genotyping signs the record itself, and the
// claims contract's proveAttested publishes that signature's key on Midnight. A claim on the same
// record, read with it, is then a claim on numbers that laboratory signed.
//
// Three small files go between two people, nothing through VeilCore:
//
//   1. the holder downloads a REQUEST: the record's sealed fields and its numbers with their
//      field secret, so the laboratory can recompute exactly what it is signing;
//   2. the laboratory opens it on /lab with its KEY file, reads every number against its own
//      report, and signs: out comes a SIGNATURE file;
//   3. the holder adds the signature to the record (checked here against the record and the
//      key) and proves it on Midnight.
//
// The signing is contract/src/attest.ts, the same code the contract's tests check against
// schnorr.compact: Schnorr over Jubjub on the record commitment (SPEC 4.5), which binds every
// number and every sealed field, so a signature can't be moved to another record.
//
// A key is a key: who holds it is not something this site or the contract knows. A laboratory
// publishes its key (on its own website, on its reports) and a checker compares.
// SPDX-License-Identifier: Apache-2.0

import {
  attesterKeyOf,
  isSigningKey,
  signRecord,
  verifyRecordSignature,
  type AttestationSignature,
  type JubjubPoint,
} from '../../../contract/src/attest';
import { claimMaterial, commitmentHex } from './claims-input';
import { checkedDocumentFields, isDocument, type DocumentRecordLike } from './document-profile';
import { SCHEMAS, fieldSetOf, type HeldFieldSet } from './field-set';
import { fieldSetRootOf } from 'veilcore-records';

const HEX64 = /^[0-9a-f]{64}$/;
const DEC = /^(0|[1-9]\d{0,99})$/;
const h64 = (n: bigint): string => n.toString(16).padStart(64, '0');
const toHex = (b: Uint8Array): string => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
const unhex = (h: string): Uint8Array => Uint8Array.from(h.match(/../g) ?? [], (b) => parseInt(b, 16));

/** A key as text: x then y, 64 hex characters each. What a laboratory publishes. */
export const keyHex = (k: JubjubPoint): string => h64(k.x) + h64(k.y);
export const keyFromHex = (t: string): JubjubPoint | undefined => {
  const s = t.trim().toLowerCase().replace(/\s+/g, '');
  if (!/^[0-9a-f]{128}$/.test(s)) return undefined;
  const k = { x: BigInt('0x' + s.slice(0, 64)), y: BigInt('0x' + s.slice(64)) };
  return isSigningKey(k) ? k : undefined;
};
export { keyShort } from './lab-key-text';

// ---- the holder's request ----------------------------------------------------------------------

/** The record's sealed fields a request carries: everything its commitment is made from. */
type RequestRecord = DocumentRecordLike & { readonly fieldSet: HeldFieldSet };

export type LabRequest = {
  readonly kind: 'veilcore-lab-request';
  readonly v: 1;
  /** The record commitment to be signed, hex (claims-input.ts). */
  readonly commitment: string;
  readonly record: RequestRecord;
};

const requestFields = (r: RequestRecord): RequestRecord => ({
  ...(r.profile !== undefined ? { profile: r.profile } : {}),
  strainName: r.strainName,
  bredBy: r.bredBy,
  dateCreated: r.dateCreated,
  notes: r.notes,
  loggedAt: r.loggedAt,
  nonce: r.nonce,
  ...(r.keyBinding !== undefined ? { keyBinding: r.keyBinding } : {}),
  ...(r.refId !== undefined ? { refId: r.refId } : {}),
  ...(r.document !== undefined ? { document: r.document } : {}),
  ...(r.fieldSchema !== undefined ? { fieldSchema: r.fieldSchema } : {}),
  ...(r.fieldSetRoot !== undefined ? { fieldSetRoot: r.fieldSetRoot } : {}),
  fieldSet: r.fieldSet,
});

/** The request file for a record with sealed numbers. */
export const labRequestFor = async (r: RequestRecord): Promise<LabRequest> => {
  const m = await claimMaterial(r);
  return { kind: 'veilcore-lab-request', v: 1, commitment: commitmentHex(m), record: requestFields(r) };
};

/**
 * A request, checked: the numbers and fields it carries make the commitment it names, under a
 * schema this site publishes. What the laboratory reads is then exactly what it signs.
 */
export const readLabRequest = async (text: string): Promise<LabRequest> => {
  let o: Record<string, unknown>;
  try {
    o = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error('That file isn’t a request for a laboratory signature.');
  }
  const rec = o?.record as RequestRecord | undefined;
  if (
    o?.kind !== 'veilcore-lab-request' ||
    o.v !== 1 ||
    typeof o.commitment !== 'string' ||
    !HEX64.test(o.commitment) ||
    typeof rec !== 'object' ||
    rec === null ||
    typeof rec.fieldSet !== 'object' ||
    rec.fieldSet === null
  )
    throw new Error('That file isn’t a request for a laboratory signature.');
  const schema = SCHEMAS[rec.fieldSet.schema];
  if (!schema) throw new Error('The request uses numbers this site doesn’t publish a form for.');
  // Everything committed must be something the laboratory is shown: a number only in a slot the
  // form names (a value hidden in an unnamed slot would be signed unseen), written one way only
  // (so what is shown is exactly the number), and the record's sealed root must be the root of
  // these numbers, not merely a root the request names.
  const values = rec.fieldSet.values as unknown;
  const shown = new Set(schema.slots.filter((s) => s.type === 'uint').map((s) => s.slot));
  if (
    !Array.isArray(values) ||
    values.length !== 16 ||
    values.some((v, i) => v !== null && (typeof v !== 'string' || !/^(0|[1-9]\d{0,30})$/.test(v) || !shown.has(i))) ||
    typeof rec.fieldSet.fieldSecret !== 'string' ||
    !HEX64.test(rec.fieldSet.fieldSecret)
  )
    throw new Error('The request’s numbers aren’t in the form it names. Don’t sign it; ask for it again.');
  // A document record in the profile's canonical form (lengths, types, file codes): what the
  // laboratory reads is the same thing the record's own page would show.
  try {
    if (!isDocument(rec)) throw new Error('it isn’t a document record.');
    checkedDocumentFields(rec);
  } catch (e) {
    throw new Error(`The request can’t be checked: ${e instanceof Error ? e.message : String(e)}`);
  }
  let commitment: string;
  try {
    const root = toHex(await fieldSetRootOf(await fieldSetOf(rec.fieldSet)));
    if (root !== rec.fieldSetRoot) throw new Error('its numbers don’t make the root it sealed.');
    commitment = commitmentHex(await claimMaterial(rec));
  } catch (e) {
    throw new Error(`The request can’t be checked: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (commitment !== o.commitment)
    throw new Error('The request’s numbers don’t make the record it names. Don’t sign it; ask for it again.');
  return { kind: 'veilcore-lab-request', v: 1, commitment, record: requestFields(rec) };
};

// ---- the laboratory's signature ------------------------------------------------------------------

export type LabSignature = {
  readonly kind: 'veilcore-lab-signature';
  readonly v: 1;
  /** The record commitment signed, hex. */
  readonly record: string;
  /** The laboratory's public key (keyHex). */
  readonly key: string;
  /** The laboratory's name as on its key file: a label, never checked. */
  readonly name?: string;
  /** Schnorr signature: announcement (x, y) and response, decimal. */
  readonly rx: string;
  readonly ry: string;
  readonly s: string;
  /**
   * Kept with a record, not part of the signature file: the proof code of the record the
   * numbers are about, from the lab's report (lab-numbers.ts). Claim links carry it.
   */
  readonly about?: string;
};

export const signLabRequest = (key: { secretN: bigint; name: string }, req: LabRequest): LabSignature => {
  const sig = signRecord(key.secretN, unhex(req.commitment));
  return {
    kind: 'veilcore-lab-signature',
    v: 1,
    record: req.commitment,
    key: keyHex(attesterKeyOf(key.secretN)),
    ...(key.name ? { name: key.name } : {}),
    rx: sig.announcement.x.toString(),
    ry: sig.announcement.y.toString(),
    s: sig.response.toString(),
  };
};

/** The key and signature as the contract's witnesses take them. */
export const signatureParts = (s: LabSignature): { key: JubjubPoint; signature: AttestationSignature } => {
  const key = keyFromHex(s.key);
  if (!key) throw new Error('That isn’t a laboratory signing key.');
  return {
    key,
    signature: { announcement: { x: BigInt(s.rx), y: BigInt(s.ry) }, response: BigInt(s.s) },
  };
};

/**
 * A signature file, checked against the record it is for: same commitment, a real signing key,
 * and a signature the claims contract will accept (verifyRecordSignature does the contract's
 * own check). Throws in plain words.
 */
export const readLabSignature = (text: string, commitment: string): LabSignature => {
  let o: Record<string, unknown>;
  try {
    o = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error('That file isn’t a laboratory signature.');
  }
  const str = (k: string): string => {
    const x = o[k];
    return typeof x === 'string' ? x : '';
  };
  if (
    o?.kind !== 'veilcore-lab-signature' ||
    o.v !== 1 ||
    !HEX64.test(str('record')) ||
    !DEC.test(str('rx')) ||
    !DEC.test(str('ry')) ||
    !DEC.test(str('s'))
  )
    throw new Error('That file isn’t a laboratory signature.');
  if (str('record') !== commitment) throw new Error('That signature is for a different record.');
  const sig: LabSignature = {
    kind: 'veilcore-lab-signature',
    v: 1,
    record: str('record'),
    key: str('key').toLowerCase(),
    ...(str('name') ? { name: str('name').slice(0, 200) } : {}),
    rx: str('rx'),
    ry: str('ry'),
    s: str('s'),
  };
  let parts: ReturnType<typeof signatureParts>;
  try {
    parts = signatureParts(sig);
  } catch {
    throw new Error('That signature’s key isn’t a laboratory signing key.');
  }
  if (!verifyRecordSignature(parts.key, unhex(commitment), parts.signature))
    throw new Error('That signature doesn’t check: it wasn’t made for this record by that key.');
  return sig;
};

/** A stored signature still checks (records restored from a backup, or edited by hand). */
export const labSignatureChecks = (s: LabSignature, commitment: string): boolean => {
  try {
    readLabSignature(JSON.stringify(s), commitment);
    return true;
  } catch {
    return false;
  }
};
