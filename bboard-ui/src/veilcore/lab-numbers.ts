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
import { claimsKeyFor } from './claims-key';
import { readLabSignature, signLabRequest, type LabSignature } from './lab-attest';

const HEX64 = /^[0-9a-f]{64}$/;

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
  const problem = labNumbersProblem(input.schema, input.values);
  if (problem) throw new Error(problem);
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
  const signature: LabSignature = signLabRequest(
    { secretN: k.secret, name: '' },
    { kind: 'veilcore-lab-request', v: 1, commitment, record },
  );
  return { numbers: { kind: 'veilcore-lab-numbers', v: 1, record, signature }, commitment, keyText: k.keyText };
};

/**
 * The bundle from an opened report, checked: a document record in canonical form, numbers that
 * make its sealed root and commitment under a published form, and a signature by the key it
 * names that the claims contract will accept. Throws in plain words.
 */
/**
 * Only what the commitment covers, rebuilt key by key: nothing else in what a lab sends can reach
 * the breeder's record (a field the lab added, like a claimed Midnight call or a correction, would
 * otherwise ride along into it).
 */
const committedOnly = (r: LabNumbersRecord): LabNumbersRecord => {
  const d = r.document;
  return {
    profile: r.profile,
    strainName: r.strainName,
    bredBy: r.bredBy,
    dateCreated: r.dateCreated,
    notes: r.notes,
    loggedAt: r.loggedAt,
    nonce: r.nonce,
    refId: r.refId,
    ...(d
      ? {
          document: {
            ...(d.type !== undefined ? { type: d.type } : {}),
            ...(d.issuer !== undefined ? { issuer: d.issuer } : {}),
            ...(d.files ? { files: d.files.map((f) => ({ name: f.name, sha256: f.sha256, size: f.size })) } : {}),
            ...(d.about
              ? {
                  about: d.about.map((a) => ({
                    name: a.name,
                    ...(a.recordId !== undefined ? { recordId: a.recordId } : {}),
                  })),
                }
              : {}),
          },
        }
      : {}),
    fieldSchema: r.fieldSchema,
    fieldSetRoot: r.fieldSetRoot,
    fieldSet: { schema: r.fieldSet.schema, values: [...r.fieldSet.values], fieldSecret: r.fieldSet.fieldSecret },
  };
};

/** Numbers that must be there, and percentages no more than 100 % (labNumbersProblem). */
const REQUIRED_SLOTS: Readonly<Record<string, readonly number[]>> = {
  'veilcore/schema/variety-similarity/v1': [0, 4, 5],
  'veilcore/schema/variety-identity/v1': [0, 3, 4],
  'veilcore/schema/animal-parentage/v1': [0, 10],
};

/** What is wrong with a lab's numbers under its form, or undefined. */
export const labNumbersProblem = (
  schemaId: string,
  values: readonly (bigint | string | null)[],
): string | undefined => {
  const schema = SCHEMAS[schemaId];
  if (!schema) return 'No published form for these numbers.';
  for (const slot of REQUIRED_SLOTS[schemaId] ?? [])
    if (values[slot] === null || values[slot] === undefined)
      return 'This form needs every number that names what was compared.';
  for (const s of schema.slots)
    if (
      s.unit === '%' &&
      values[s.slot] !== null &&
      values[s.slot] !== undefined &&
      BigInt(values[s.slot] as string) > 100n * BigInt(s.scale ?? 1)
    )
      return 'A percentage can’t be more than 100.';
  return undefined;
};

export const readLabNumbers = async (text: string): Promise<LabNumbers> => {
  let o: Record<string, unknown>;
  try {
    o = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error('The numbers in this report can’t be read.');
  }
  const raw = o?.record as LabNumbersRecord | undefined;
  if (
    o?.kind !== 'veilcore-lab-numbers' ||
    o.v !== 1 ||
    typeof raw !== 'object' ||
    raw === null ||
    typeof raw.fieldSet !== 'object' ||
    raw.fieldSet === null ||
    !Array.isArray(raw.fieldSet.values)
  )
    throw new Error('The numbers in this report can’t be read.');
  if (raw.keyBinding !== undefined) throw new Error('The numbers in this report can’t be read.');
  let record: LabNumbersRecord;
  try {
    record = committedOnly(raw);
  } catch {
    throw new Error('The numbers in this report can’t be read.');
  }
  const { readLabRequest } = await import('./lab-attest');
  // The same checks a laboratory makes on a request: form, plain numbers, root, canonical fields.
  const commitment = commitmentHex(await claimMaterial(record));
  await readLabRequest(JSON.stringify({ kind: 'veilcore-lab-request', v: 1, commitment, record }));
  if (!HEX64.test(commitment)) throw new Error('The numbers in this report can’t be read.');
  const problem = labNumbersProblem(record.fieldSet.schema, record.fieldSet.values);
  if (problem) throw new Error(problem);
  const signature = readLabSignature(JSON.stringify(o.signature), commitment);
  return { kind: 'veilcore-lab-numbers', v: 1, record, signature };
};
