// Numbers a laboratory signs, sent inside its locked report (docs/lab-signing.md).
//
// The lab writes the whole record, so its signature vouches only for what it wrote:
//   title     the lab's own name for the result (its report reference, by default)
//   issuer    the lab's registered name
//   holder    the name on the plant's record the lab received (the breeder's)
//   issued    the date on the report
//   files     the report file: its name, SHA-256 and size
//   about     the plant, by name
//   numbers   under a published form, with a fresh field secret
// The lab's browser seals it, signs its commitment with the lab's claims key (claims-key.ts,
// derived from the lab's attester key), publishes the binding attestation naming the plant's
// proof code, and puts { record, signature } inside the report it locks to the breeder. Only
// the breeder can open it. The breeder adds it as a document record they hold, and can then
// publish the signature on Midnight (proveAttested) and prove one number at a time.
//
// The lab keeps the field secret too (it made it): it could prove things about these numbers
// itself. The check page says so.
// SPDX-License-Identifier: Apache-2.0

import { claimMaterial, commitmentHex } from './claims-input';
import { checkedDocumentFields, DOCUMENT_PROFILE, type DocumentRecordLike } from './document-profile';
import { makeFieldSet, SCHEMAS, type HeldFieldSet } from './field-set';
import { newNonce } from './commitment';
import { claimsKeyFor, claimsKeyText } from './claims-key';
import { readLabSignature, type LabSignature } from './lab-attest';
import { signRecord } from '../../../contract/src/attest';

const HEX64 = /^[0-9a-f]{64}$/;
const fromHex = (h: string): Uint8Array => Uint8Array.from(h.match(/../g) ?? [], (x) => parseInt(x, 16));

/** What the lab types or already knows. */
export type LabNumbersInput = {
  readonly title: string;
  readonly labName: string;
  readonly holder: string;
  readonly plantName: string;
  readonly issued: string;
  readonly report: { readonly name: string; readonly sha256: string; readonly size: number };
  readonly schema: string;
  readonly values: readonly (bigint | null)[];
};

export type LabNumbersRecord = DocumentRecordLike & {
  readonly fieldSchema: string;
  readonly fieldSetRoot: string;
  readonly fieldSet: HeldFieldSet;
};

/** What travels inside the locked report. */
export type LabNumbers = {
  readonly kind: 'veilcore-lab-numbers';
  readonly v: 1;
  readonly record: LabNumbersRecord;
  readonly signature: LabSignature;
};

/**
 * Seal and sign. Returns the bundle and the commitment the binding attestation must name
 * (the caller publishes it with attestRecord, then locks the bundle into the report).
 */
export const makeLabNumbers = async (
  attesterPrivateKeyPkcs8: string,
  input: LabNumbersInput,
  now = Date.now(),
): Promise<{ readonly numbers: LabNumbers; readonly commitment: string; readonly keyText: string }> => {
  if (!SCHEMAS[input.schema]) throw new Error('No published form for these numbers.');
  const fs = await makeFieldSet(input.schema, input.values);
  const record: LabNumbersRecord = {
    profile: DOCUMENT_PROFILE,
    strainName: input.title.trim(),
    bredBy: input.holder.trim(),
    dateCreated: input.issued,
    notes: '',
    loggedAt: now,
    nonce: newNonce(),
    refId: '',
    document: {
      type: 'lab-report',
      issuer: input.labName.trim(),
      files: [{ name: input.report.name, sha256: input.report.sha256, size: input.report.size }],
      about: input.plantName.trim() ? [{ name: input.plantName.trim() }] : [],
    },
    fieldSchema: fs.fieldSchema,
    fieldSetRoot: fs.fieldSetRoot,
    fieldSet: fs.held,
  };
  checkedDocumentFields(record);
  const commitment = commitmentHex(await claimMaterial(record));
  const k = claimsKeyFor(attesterPrivateKeyPkcs8);
  const sig = signRecord(k.secret, fromHex(commitment));
  const signature: LabSignature = {
    kind: 'veilcore-lab-signature',
    v: 1,
    record: commitment,
    key: claimsKeyText(k.key),
    rx: sig.announcement.x.toString(),
    ry: sig.announcement.y.toString(),
    s: sig.response.toString(),
  };
  return { numbers: { kind: 'veilcore-lab-numbers', v: 1, record, signature }, commitment, keyText: k.keyText };
};

/**
 * The bundle from an opened report, checked: a document record in canonical form, numbers that
 * make its sealed root and commitment under a published form, and a signature by the key it
 * names that the claims contract will accept. Throws in plain words.
 */
export const readLabNumbers = async (text: string): Promise<LabNumbers> => {
  let o: Record<string, unknown>;
  try {
    o = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error('The numbers in this report can’t be read.');
  }
  const record = o?.record as LabNumbersRecord | undefined;
  if (o?.kind !== 'veilcore-lab-numbers' || o.v !== 1 || typeof record !== 'object' || record === null)
    throw new Error('The numbers in this report can’t be read.');
  if (record.keyBinding !== undefined) throw new Error('The numbers in this report can’t be read.');
  const { readLabRequest } = await import('./lab-attest');
  // The same checks a laboratory makes on a request: form, plain numbers, root, canonical fields.
  const commitment = commitmentHex(await claimMaterial(record));
  await readLabRequest(JSON.stringify({ kind: 'veilcore-lab-request', v: 1, commitment, record }));
  if (!HEX64.test(commitment)) throw new Error('The numbers in this report can’t be read.');
  const signature = readLabSignature(JSON.stringify(o.signature), commitment);
  return { kind: 'veilcore-lab-numbers', v: 1, record, signature };
};
