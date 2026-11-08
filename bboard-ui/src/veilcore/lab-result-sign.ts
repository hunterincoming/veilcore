// Signing lab results v2 in the lab's browser, one or a spreadsheet's worth (lab-result.ts).
//
// For each result: seal and sign it (makeLabResult), keep it as a record the lab holds, so it is
// dated in the next hourly batch like any record (createRecords; nothing goes to Midnight per
// result), then post the lab's binding naming its key on that result (claims-key.ts
// resultBindingHash), which is what lets a checker print the lab's registered name. A result
// that replaces one of the lab's own earlier results withdraws that one's binding.
//
// The lab hands each result to whoever sent the sample as a file (or locked inside the report,
// LabResults.tsx). VeilCore keeps neither the statement nor the numbers in the clear.
// SPDX-License-Identifier: Apache-2.0

import type { AttesterProfile } from './attester-keys';
import { attestRecord, retract } from './attester-keys';
import { bindingIdSuffix, claimsKeyFor, resultBindingHash } from './claims-key';
import { fingerprintRecord } from './commitment';
import { makeLabResult, problemOf, type LabResultBundle, type LabResultInput, type ProblemCode } from './lab-result';
import { createRecords, newRecordId, setLabResultBinding, type NewRecordInput, type StrainRecord } from './records';

export type SignedResult =
  | {
      readonly ok: true;
      readonly bundle: LabResultBundle;
      readonly code: string;
      readonly recordId: string;
      /** Whether the lab's name binding was posted; a checker names the lab only when it was. */
      readonly bound: boolean;
      readonly bindError?: string;
    }
  | { readonly ok: false; readonly code: ProblemCode; readonly message: string };

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Post the lab's binding for one result; once more after a minute when the registry says "too many". */
export const bindResult = async (
  attester: AttesterProfile,
  commitment: string,
  subject: string,
  wait = pause,
): Promise<{ attestationId?: string; error?: string }> => {
  const k = claimsKeyFor(attester.keypair.privateKey);
  const post = () =>
    attestRecord(
      attester,
      commitment,
      resultBindingHash(k.keyText, subject),
      'other',
      bindingIdSuffix(k, attester.keypair.publicKey),
    );
  let out = await post();
  if (out.error && /too many requests/i.test(out.error)) {
    await wait(61_000);
    out = await post();
  }
  return out;
};

/** The record the lab keeps for a result it signed: the bundle's record, its signature and its statement. */
export const recordInputFor = async (bundle: LabResultBundle): Promise<NewRecordInput> => ({
  ...bundle.record,
  document: bundle.record.document as NewRecordInput['document'],
  id: newRecordId(),
  recordFingerprint: await fingerprintRecord(bundle.record),
  labSignature: { ...bundle.signature, about: bundle.statement.subject },
  labResult: { statement: bundle.statement },
  parents: [],
  photoFingerprints: [],
});

/**
 * Sign every input, keep them as records in one save, post each binding, and withdraw the
 * bindings of results they replace. Inputs that can't be signed are returned with why; the rest
 * go ahead. Throws only when the save itself fails (nothing was kept, so nothing was bound).
 */
export const signResults = async (
  attester: AttesterProfile,
  inputs: readonly LabResultInput[],
  mine: readonly StrainRecord[],
  onProgress?: (done: number, total: number) => void,
  wait = pause,
): Promise<SignedResult[]> => {
  const made: ({ bundle: LabResultBundle; commitment: string; input: NewRecordInput } | SignedResult)[] = [];
  for (const input of inputs) {
    try {
      const { bundle, commitment } = await makeLabResult(attester.keypair.privateKey, input);
      made.push({ bundle, commitment, input: await recordInputFor(bundle) });
    } catch (e) {
      made.push({ ok: false, ...problemOf(e) });
    }
  }
  const toKeep = made.filter(
    (m): m is { bundle: LabResultBundle; commitment: string; input: NewRecordInput } => 'input' in m,
  );
  if (toKeep.length) {
    const saved = await createRecords(toKeep.map((m) => m.input));
    const all = saved.refused.find((r) => r.id === '*');
    if (all || saved.offline) throw new Error(all?.reason ?? 'could not reach the registry');
    const refused = new Map(saved.refused.map((r) => [r.id, r.reason]));
    for (const m of toKeep) {
      const why = refused.get(m.input.id ?? '');
      if (why) Object.assign(m, { refused: why });
    }
  }
  const out: SignedResult[] = [];
  let done = 0;
  for (const m of made) {
    if (!('input' in m)) {
      out.push(m);
      continue;
    }
    const refused = (m as { refused?: string }).refused;
    if (refused) {
      out.push({ ok: false, code: 'unreadable', message: refused });
      continue;
    }
    const b = await bindResult(attester, m.commitment, m.bundle.statement.subject, wait);
    const recordId = m.input.id ?? '';
    if (b.attestationId) setLabResultBinding(recordId, b.attestationId);
    // A result that replaces one of this lab's own: that one's name binding is withdrawn.
    const rep = m.bundle.statement.replaces;
    if (rep && b.attestationId) {
      const old = mine.find((r) => r.labSignature?.record === rep.result && r.labResult?.bindingId);
      if (old?.labResult?.bindingId && old.labSignature?.key === m.bundle.signature.key)
        await retract(
          attester,
          old.labResult.bindingId,
          rep.reason === 'retraction' ? 'issued-in-error' : 'superseded',
        );
    }
    out.push({
      ok: true,
      bundle: m.bundle,
      code: m.commitment,
      recordId,
      bound: !!b.attestationId,
      ...(b.error ? { bindError: b.error } : {}),
    });
    onProgress?.(++done, toKeep.length);
  }
  return out;
};
