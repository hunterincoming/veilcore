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
import {
  makeLabResult,
  problemOf,
  unboundToName,
  type LabResultBundle,
  type LabResultInput,
  type ProblemCode,
} from './lab-result';
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
      /**
       * For a result that replaces one of the lab's own: whether that one's name was withdrawn,
       * and why not when it wasn't (the result isn't in this browser, or the registry refused).
       */
      readonly withdrew?: {
        readonly code: string;
        readonly ok: boolean;
        readonly error?: string;
        readonly nothingToWithdraw?: boolean;
      };
    }
  | { readonly ok: false; readonly code: ProblemCode; readonly message: string };

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

const TOO_MANY = /too many requests/i;
/** The registry's answer when its write limit is reached: binding more now only waits. */
export const isRateLimited = (error: string | undefined): boolean => !!error && TOO_MANY.test(error);

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
  if (isRateLimited(out.error)) {
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
 * Withdraw the lab's name from the result a new one replaces: only one of this lab's own, by the
 * same key, held in this browser with its binding. Says what happened, so a failure is shown.
 */
export const withdrawReplaced = async (
  attester: AttesterProfile,
  bundle: LabResultBundle,
  mine: readonly StrainRecord[],
): Promise<{ code: string; ok: boolean; error?: string; nothingToWithdraw?: boolean }> => {
  const rep = bundle.statement.replaces!;
  const old = mine.find((r) => r.labSignature?.record === rep.result && r.labSignature?.key === bundle.signature.key);
  if (!old?.labResult) return { code: rep.result, ok: false, error: 'not in this browser' };
  // It never got the lab's name (the rate limit): there is nothing to withdraw, and
  // "Add your lab's name" leaves it out from now on (unboundToName).
  if (!old.labResult.bindingId) return { code: rep.result, ok: true, nothingToWithdraw: true };
  const out = await retract(
    attester,
    old.labResult.bindingId,
    rep.reason === 'retraction' ? 'issued-in-error' : 'superseded',
  );
  return out.error ? { code: rep.result, ok: false, error: out.error } : { code: rep.result, ok: true };
};

/**
 * Post the lab's name on results it signed and kept but couldn't name yet (the registry's write
 * limit, or offline). Stops at the first "too many" and says how many are left.
 */
export const nameUnbound = async (
  attester: AttesterProfile,
  records: readonly StrainRecord[],
): Promise<{ named: number; left: number; error?: string }> => {
  const todo = unboundToName(records);
  let named = 0;
  for (const r of todo) {
    const out = await bindResult(attester, r.labSignature!.record, r.labResult!.statement.subject, () =>
      Promise.resolve(),
    );
    if (!out.attestationId) return { named, left: todo.length - named, ...(out.error ? { error: out.error } : {}) };
    setLabResultBinding(r.id, out.attestationId);
    named++;
  }
  return { named, left: 0 };
};

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
  // After the registry has refused twice in a row for its write limit, the rest are signed and
  // kept but not named yet: "Add your lab's name" on /lab/results posts them later.
  let limited = false;
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
    const b = limited
      ? { error: 'too many requests; not tried' }
      : await bindResult(attester, m.commitment, m.bundle.statement.subject, wait);
    if (isRateLimited(b.error)) limited = true;
    const recordId = m.input.id ?? '';
    if (b.attestationId) setLabResultBinding(recordId, b.attestationId);
    // A result that replaces one of this lab's own: that one's name is withdrawn, whether or not
    // this one's name could be posted (a withdrawal must never be left undone by a rate limit).
    const withdrew = m.bundle.statement.replaces ? await withdrawReplaced(attester, m.bundle, mine) : undefined;
    out.push({
      ok: true,
      bundle: m.bundle,
      code: m.commitment,
      recordId,
      bound: !!b.attestationId,
      ...(b.error ? { bindError: b.error } : {}),
      ...(withdrew ? { withdrew } : {}),
    });
    onProgress?.(++done, toKeep.length);
  }
  return out;
};
