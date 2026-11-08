// Signing lab results in the lab's browser (lab-result-sign.ts): a rate-limited registry stops
// the run's name posting instead of stalling it for an hour; a withdrawal is attempted even when
// the new result's name couldn't be posted, and a failed one is reported, never silent; and a
// result kept from the record the lab holds downloads as a file that checks again.
// SPDX-License-Identifier: Apache-2.0
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateKeypair } from 'veilcore-records';

const calls = { attest: [] as string[], retract: [] as string[], bound: new Map<string, string>() };
let attestAnswer: (n: number) => { attestationId?: string; error?: string } = () => ({ attestationId: 'att_ok' });
let retractAnswer: () => { retracted?: boolean; error?: string } = () => ({ retracted: true });

vi.mock('./attester-keys', () => ({
  attestRecord: (_p: unknown, subject: string) => {
    calls.attest.push(subject);
    return Promise.resolve(attestAnswer(calls.attest.length));
  },
  retract: (_p: unknown, id: string) => {
    calls.retract.push(id);
    return Promise.resolve(retractAnswer());
  },
}));
vi.mock('./records', () => {
  let n = 0;
  return {
    newRecordId: () => `rec_${++n}`,
    createRecords: () => Promise.resolve({ ok: true, refused: [] }),
    setLabResultBinding: (id: string, b: string) => calls.bound.set(id, b),
  };
});

const { signResults, recordInputFor, withdrawReplaced } = await import('./lab-result-sign');
const { makeLabResult, readLabResult } = await import('./lab-result');
const { committedOnly } = await import('./lab-numbers');

const A = 'a1'.repeat(32);
const statement = (sampleId: string) => ({
  kind: 'pathogen' as const,
  subject: A,
  sampleId,
  accession: `L-${sampleId}`,
  method: { id: 'RT-qPCR', version: '3' },
  tested: '2026-11-05',
  result: { target: 'HLVd', sampleType: 'leaf', detected: false },
});

const lab = await generateKeypair();
const attester = { keypair: lab, displayName: 'E2E Lab', role: 'laboratory' } as never;

beforeEach(() => {
  calls.attest = [];
  calls.retract = [];
  calls.bound.clear();
  attestAnswer = () => ({ attestationId: 'att_ok' });
  retractAnswer = () => ({ retracted: true });
});

describe('signing a run', () => {
  it('stops posting names after the registry refuses twice for its write limit, and keeps every result', async () => {
    attestAnswer = (n) =>
      n <= 2 ? { attestationId: `att_${n}` } : { error: 'too many requests; try again in a minute' };
    const waited: number[] = [];
    const out = await signResults(
      attester,
      Array.from({ length: 6 }, (_, i) => ({ labName: 'E2E Lab', statement: statement(`S${i}`) })),
      [],
      undefined,
      (ms) => {
        waited.push(ms);
        return Promise.resolve();
      },
    );
    expect(out.every((r) => r.ok)).toBe(true);
    // Two named, then one refused (and retried once after a minute), then the rest not tried.
    expect(calls.attest).toHaveLength(4);
    expect(waited).toEqual([61_000]);
    expect(out.filter((r) => r.ok && r.bound)).toHaveLength(2);
    expect(out.filter((r) => r.ok && !r.bound)).toHaveLength(4);
  });

  it('withdraws the replaced result’s name even when the new name couldn’t be posted, and says when it can’t', async () => {
    const first = await makeLabResult(lab.privateKey, { labName: 'E2E Lab', statement: statement('S1') });
    const held = [
      {
        ...(await recordInputFor(first.bundle)),
        id: 'old',
        labResult: { statement: first.bundle.statement, bindingId: 'att_old' },
      },
    ] as never[];
    attestAnswer = () => ({ error: 'could not reach the registry' });
    const [r] = await signResults(
      attester,
      [
        {
          labName: 'E2E Lab',
          statement: {
            ...statement('S1'),
            kind: 'retraction',
            result: undefined,
            replaces: { result: first.commitment, reason: 'retraction' },
          } as never,
        },
      ],
      held,
    );
    expect(r).toMatchObject({ ok: true, bound: false, withdrew: { code: first.commitment, ok: true } });
    expect(calls.retract).toEqual(['att_old']);
    // The registry refuses the withdrawal: reported, not swallowed.
    retractAnswer = () => ({ error: 'could not reach the registry' });
    const again = await withdrawReplaced(
      attester,
      {
        ...first.bundle,
        statement: { ...first.bundle.statement, replaces: { result: first.commitment, reason: 're-test' } },
      },
      held,
    );
    expect(again).toEqual({ code: first.commitment, ok: false, error: 'could not reach the registry' });
    // A result not in this browser can't be withdrawn here, and says so.
    const none = await withdrawReplaced(
      attester,
      {
        ...first.bundle,
        statement: { ...first.bundle.statement, replaces: { result: 'ee'.repeat(32), reason: 're-test' } },
      },
      held,
    );
    expect(none).toMatchObject({ ok: false, error: 'not in this browser' });
  });

  it('a result kept as the lab’s record downloads as a file that checks again (the record page’s download)', async () => {
    const { bundle } = await makeLabResult(lab.privateKey, { labName: 'E2E Lab', statement: statement('S9') });
    // What the record holds after a save: extra fields beside the committed ones.
    const kept = { ...(await recordInputFor(bundle)), nameSalt: 'ab'.repeat(32), licenseIds: [], rev: 3 };
    const { about: _about, ...signature } = kept.labSignature!;
    void _about;
    const again = {
      kind: 'veilcore-lab-numbers',
      v: 2,
      record: committedOnly(kept as never),
      signature,
      statement: kept.labResult!.statement,
    };
    const back = await readLabResult(JSON.parse(JSON.stringify(again)) as Record<string, unknown>);
    expect(back.signature.record).toBe(bundle.signature.record);
  });
});
