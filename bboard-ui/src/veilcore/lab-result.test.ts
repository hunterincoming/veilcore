// Lab result v2 (lab-result.ts): the statement's form, its binding to the record the lab signs,
// the call in the field set, the sealed DNA mark, replacing, and the frozen claims contract
// accepting the signature exactly as for v1.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from 'vitest';
import { generateKeypair } from 'veilcore-records';
import {
  LAB_RESULT_FORMAT,
  RESULT_FILE_NAME,
  checkBinding,
  checkedStatement,
  makeLabResult,
  markSeal,
  newMarkOpening,
  openingMatches,
  readLabResult,
  readResultsText,
  replacedBy,
  resultsFile,
  statementFile,
  tidySequence,
  type LabResultBundle,
  type LabResultInput,
  type LabResultStatement,
} from './lab-result';
import { readLabNumbers } from './lab-numbers';
import { SCHEMAS, schemaIdHex } from './field-set';
import { checkedDocumentFields } from './document-profile';
import vectors from './fixtures/lab-result-v2.json';
import { claimMaterial } from './claims-input';
import { signatureParts } from './lab-attest';
import { claimsKeyFor, claimsKeyText, findBinding, resultBindingHash, bindingIdSuffix } from './claims-key';
import { sha256 } from '@noble/hashes/sha2.js';
import { ClaimsSimulator } from '../../../contract/src/test/claims-simulator';
import { claimFromCells } from '../../../contract/src/verify-claims';

/** A plain copy, as a file would carry it, typed as what readLabResult takes. */
type Raw = Record<string, unknown> & LabResultBundle;
const copy = (x: unknown): Raw => JSON.parse(JSON.stringify(x)) as Raw;

const unhex = (h: string): Uint8Array => Uint8Array.from(h.match(/../g) ?? [], (b) => parseInt(b, 16));
const A = 'a1'.repeat(32);
const B = 'b2'.repeat(32);
const C = 'c3'.repeat(32);

const base = {
  subject: A,
  sampleId: 'S-0412',
  accession: 'LAB-26-1187',
  method: { id: 'RT-qPCR HLVd SOP-14', version: '3' },
  tested: '2026-11-05',
  received: '2026-11-03',
  qc: [{ name: 'Internal control Ct', value: '24.1' }],
};

const pathogen: LabResultInput = {
  labName: 'Example Plant Lab',
  statement: {
    ...base,
    kind: 'pathogen',
    result: { target: 'HLVd', sampleType: 'leaf', detected: false },
  },
};

describe('a lab result v2', () => {
  it('binds the statement into what the lab signs, and reads back checked', async () => {
    const lab = await generateKeypair();
    const { bundle, commitment, keyText } = await makeLabResult(lab.privateKey, pathogen);
    expect(keyText).toBe(claimsKeyFor(lab.privateKey).keyText);
    expect(bundle.statement.format).toBe(LAB_RESULT_FORMAT);
    expect(bundle.record.bredBy).toBe('Example Plant Lab');
    expect(bundle.record.refId).toBe('LAB-26-1187');
    expect(bundle.record.dateCreated).toBe('2026-11-05');
    expect(bundle.record.document?.files).toEqual([statementFile(bundle.statement)]);
    expect(bundle.record.document?.files?.[0].name).toBe(RESULT_FILE_NAME);
    expect(bundle.record.fieldSet.schema).toBe('veilcore/schema/pathogen/v1');
    expect(bundle.record.fieldSet.values.slice(0, 2)).toEqual(['0', null]);
    const back = await readLabResult(copy(bundle));
    expect(back.signature.record).toBe(commitment);
    // Through the report path too: readLabNumbers takes v2 and still checks v1 as before.
    const viaReport = await readLabNumbers(JSON.stringify(bundle));
    expect(viaReport.signature.record).toBe(commitment);
  });

  it('carries the report file it goes with, first, and the statement file after it', async () => {
    const lab = await generateKeypair();
    const report = { name: 'r.pdf', sha256: 'ef'.repeat(32), size: 999 };
    const { bundle } = await makeLabResult(lab.privateKey, { ...pathogen, report });
    expect(bundle.record.document?.files?.map((f) => f.name)).toEqual(['r.pdf', RESULT_FILE_NAME]);
  });

  it('is refused when the statement, the call or the signature was changed', async () => {
    const lab = await generateKeypair();
    const { bundle } = await makeLabResult(lab.privateKey, pathogen);
    const o = copy(bundle);
    // The statement changed after signing: its hash no longer matches the sealed file entry.
    const detected = {
      ...o,
      statement: { ...o.statement, result: { ...(o.statement.result as object), detected: true } },
    };
    await expect(readLabResult(detected)).rejects.toMatchObject({ code: 'file' });
    const otherSample = { ...o, statement: { ...o.statement, sampleId: 'S-9999' } };
    await expect(readLabResult(otherSample)).rejects.toMatchObject({ code: 'file' });
    const otherSubject = { ...o, statement: { ...o.statement, subject: B } };
    await expect(readLabResult(otherSubject)).rejects.toMatchObject({ code: 'file' });
    // The call changed: the field set no longer agrees with the statement.
    const values = [...o.record.fieldSet.values];
    values[0] = '1';
    const flipped = { ...o, record: { ...o.record, fieldSet: { ...o.record.fieldSet, values } } };
    await expect(readLabResult(flipped)).rejects.toMatchObject({ code: 'calls' });
    // Another key's signature.
    const other = await generateKeypair();
    const { bundle: theirs } = await makeLabResult(other.privateKey, pathogen);
    const swapped = { ...o, signature: { ...theirs.signature, record: o.signature.record } };
    await expect(readLabResult(swapped)).rejects.toMatchObject({ code: 'signature' });
  });

  it('is accepted by the claims contract’s own proveAttested, so the call can be proved on Midnight', async () => {
    const lab = await generateKeypair();
    const { bundle } = await makeLabResult(lab.privateKey, pathogen);
    const m = await claimMaterial(bundle.record);
    const { key, signature } = signatureParts(bundle.signature);
    const sim = new ClaimsSimulator();
    sim.call({ attester: key, signature }, 'proveAttested', m.commitment);
    const c = claimFromCells(sim.state);
    expect(c.kind).toBe('attested');
    expect(c.attester).toEqual(claimsKeyFor(lab.privateKey).key);
  });

  it('makes each kind’s call from its own fields', async () => {
    const lab = await generateKeypair();
    const mk = (statement: LabResultInput['statement']) => makeLabResult(lab.privateKey, { labName: 'L', statement });
    const match = await mk({
      ...base,
      kind: 'match',
      panel: { id: 'CannSNP90', version: '2.1' },
      result: { other: B, matches: true, compared: 90, differing: 0 },
    });
    expect(match.bundle.record.fieldSet.values.slice(0, 3)).toEqual(['1', '90', '0']);
    const lineage = await mk({
      ...base,
      kind: 'lineage',
      result: { parents: [B, C], consistent: true, compared: 88, conflicts: [0, 1] },
    });
    expect(lineage.bundle.record.fieldSet.values.slice(0, 4)).toEqual(['1', '88', '0', '1']);
    const ct = await mk({
      ...base,
      kind: 'pathogen',
      result: { target: 'HLVd', sampleType: 'root', detected: true, ct: '31.5' },
    });
    expect(ct.bundle.record.fieldSet.values.slice(0, 2)).toEqual(['1', '3150']);
    const opening = newMarkOpening('ACGTACGTACGTTGCA');
    const mark = await mk({ ...base, kind: 'dna-mark', result: { seal: opening.seal, found: true, label: 'Mark 7' } });
    expect(mark.bundle.record.fieldSet.schema).toBe('veilcore/schema/dna-mark/v1');
    expect(JSON.stringify(mark.bundle)).not.toContain('ACGTACGTACGTTGCA');
    const numbers = await makeLabResult(lab.privateKey, {
      labName: 'L',
      statement: { ...base, kind: 'numbers', result: { form: 'veilcore/schema/seed-quality/v1' } },
      values: [9600n],
    });
    expect(numbers.bundle.record.fieldSet.schema).toBe('veilcore/schema/seed-quality/v1');
    for (const r of [match, lineage, ct, mark, numbers]) await readLabResult(copy(r.bundle));
    // A numbers result can't use a call form, and a genetic form still needs what was compared.
    await expect(
      makeLabResult(lab.privateKey, {
        labName: 'L',
        statement: { ...base, kind: 'numbers', result: { form: 'veilcore/schema/pathogen/v1' } },
        values: [1n],
      }),
    ).rejects.toMatchObject({ code: 'form' });
    await expect(
      makeLabResult(lab.privateKey, {
        labName: 'L',
        statement: { ...base, kind: 'numbers', result: { form: 'veilcore/schema/variety-identity/v1' } },
        values: [9900n],
      }),
    ).rejects.toMatchObject({ code: 'calls' });
  });
});

describe('the statement’s form', () => {
  const ok = { format: LAB_RESULT_FORMAT, ...pathogen.statement } as LabResultStatement;
  const refuse = (change: Record<string, unknown>, code: string) =>
    expect(() => checkedStatement({ ...ok, ...change })).toThrow(expect.objectContaining({ code }));

  it('takes a good one and refuses each broken rule, never tidying', () => {
    expect(checkedStatement(ok)).toBe(ok);
    refuse({ format: 'veilcore/lab-result/v1' }, 'format');
    refuse({ extra: 1 }, 'format');
    refuse({ kind: 'potency' }, 'kind');
    refuse({ subject: A.toUpperCase() }, 'subject');
    refuse({ sampleId: ' S-1' }, 'sampleId');
    refuse({ sampleId: '' }, 'sampleId');
    refuse({ accession: 'a\tb' }, 'accession');
    refuse({ method: { id: 'RT-qPCR' } }, 'method');
    refuse({ panel: { id: 'P', version: '' } }, 'panel');
    refuse({ tested: '2026-02-30' }, 'tested');
    refuse({ received: '2026-11-06' }, 'received');
    refuse({ qc: [] }, 'qc');
    refuse(
      {
        qc: [
          { name: 'a', value: '1' },
          { name: 'a', value: '2' },
        ],
      },
      'qc',
    );
    refuse({ result: { target: 'HLVd', sampleType: 'leaf', detected: false, ct: '31.255' } }, 'ct');
    refuse({ result: { target: 'HLVd', sampleType: 'leaf', detected: 'no' } }, 'result');
    refuse({ kind: 'match', result: { other: A, matches: true } }, 'other');
    refuse({ kind: 'match', result: { other: B, matches: true, compared: 5, differing: 6 } }, 'counts');
    refuse({ kind: 'lineage', result: { parents: [B, B], consistent: true } }, 'parents');
    refuse({ kind: 'lineage', result: { parents: [B, C], consistent: true, conflicts: [1] } }, 'counts');
    refuse({ kind: 'dna-mark', result: { seal: 'xyz', found: true } }, 'seal');
    refuse({ replaces: { result: B, reason: 'because' } }, 'replaces');
    refuse({ replaces: { result: B, reason: 'retraction' } }, 'replaces');
    refuse({ kind: 'retraction', result: undefined }, 'replaces');
    expect(
      checkedStatement({
        ...ok,
        kind: 'retraction',
        result: undefined,
        replaces: { result: B, reason: 'retraction' },
      }),
    ).toBeTruthy();
  });
});

describe('a DNA mark', () => {
  it('is sealed with a salt, and an opening shows it only to whoever holds the opening', () => {
    expect(tidySequence('>mark 7\nacgt acgt\r\nACGT ACGT\n')).toBe('ACGTACGTACGTACGT');
    const o = newMarkOpening('ACGTACGTACGTACGT');
    expect(openingMatches(o, o.seal)).toBe(true);
    expect(openingMatches({ ...o, sequence: 'ACGTACGTACGTACGA' }, o.seal)).toBe(false);
    // Two seals of one sequence differ: the seal can't be guessed from a list of known marks.
    expect(newMarkOpening('ACGTACGTACGTACGT').seal).not.toBe(o.seal);
    expect(() => markSeal('ACGTN', o.salt)).toThrow();
    expect(markSeal('ACGTACGTAC', '00'.repeat(32))).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('replacing a result', () => {
  it('counts only a later result signed by the same key', async () => {
    const lab = await generateKeypair();
    const other = await generateKeypair();
    const first = await makeLabResult(lab.privateKey, pathogen);
    const retest = await makeLabResult(lab.privateKey, {
      ...pathogen,
      statement: { ...pathogen.statement, replaces: { result: first.commitment, reason: 're-test' } },
    });
    const stranger = await makeLabResult(other.privateKey, {
      ...pathogen,
      statement: { ...base, kind: 'retraction', replaces: { result: first.commitment, reason: 'retraction' } },
    });
    const map = replacedBy([first.bundle, retest.bundle]);
    expect(map.get(first.commitment)).toEqual({ by: retest.commitment, reason: 're-test' });
    expect(replacedBy([first.bundle, stranger.bundle]).size).toBe(0);
    // A file of results reads each on its own; a broken one doesn't stop the rest.
    const file = JSON.parse(JSON.stringify(resultsFile([first.bundle, retest.bundle]))) as { results: unknown[] };
    file.results.push({ kind: 'veilcore-lab-numbers', v: 2 });
    const read = await readResultsText(JSON.stringify(file));
    expect(read.map((r) => r.ok)).toEqual([true, true, false]);
  });
});

describe('the lab’s binding of its key to a v2 result', () => {
  it('names the lab on its own, without a report signature, and goes when withdrawn', async () => {
    const lab = await generateKeypair();
    const { bundle, commitment } = await makeLabResult(lab.privateKey, pathogen);
    const k = claimsKeyFor(lab.privateKey);
    const att = {
      attestationId: `att_x${bindingIdSuffix(k, lab.publicKey)}`,
      type: 'other',
      subjectCommitment: commitment,
      documentHash: resultBindingHash(claimsKeyText(k.key), bundle.statement.subject, bundle.statement.bindingSalt!),
      attester: { publicKey: lab.publicKey },
      signatureValid: true,
      retraction: null,
    };
    const salt = bundle.statement.bindingSalt;
    expect(salt).toMatch(/^[0-9a-f]{64}$/);
    expect(findBinding([att], commitment, k.key, A, [], salt).kind).toBe('bound');
    expect(
      findBinding([{ ...att, retraction: { reason: 'issued-in-error' } }], commitment, k.key, A, [], salt).kind,
    ).toBe('retracted');
    // About another record: no name. Without the salt: no name either.
    expect(findBinding([att], commitment, k.key, B, [], salt).kind).toBe('none');
    expect(findBinding([att], commitment, k.key, A, []).kind).toBe('none');
  });

  it('gives every result its own salt, and keeps one the input brings', async () => {
    const lab = await generateKeypair();
    const one = await makeLabResult(lab.privateKey, pathogen);
    const two = await makeLabResult(lab.privateKey, pathogen);
    expect(one.bundle.statement.bindingSalt).not.toBe(two.bundle.statement.bindingSalt);
    const given = 'ab'.repeat(16) + 'cd'.repeat(16);
    const kept = await makeLabResult(lab.privateKey, {
      ...pathogen,
      statement: { ...pathogen.statement, bindingSalt: given },
    });
    expect(kept.bundle.statement.bindingSalt).toBe(given);
    await expect(
      makeLabResult(lab.privateKey, {
        ...pathogen,
        statement: { ...pathogen.statement, bindingSalt: '00'.repeat(32) },
      }),
    ).rejects.toMatchObject({ code: 'bindingSalt' });
  });

  it('an outsider with the lab’s key and a list of proof codes can no longer link a result to its record', async () => {
    const lab = await generateKeypair();
    const k = claimsKeyFor(lab.privateKey);
    const keyText = claimsKeyText(k.key);
    const hexOf = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
    const codes = Array.from({ length: 100 }, () => hexOf(crypto.getRandomValues(new Uint8Array(32))));
    // Two of the lab's clients' records, tested; the rest are records the outsider has seen.
    const tested = [codes[17], codes[63]];
    const made = await Promise.all(
      tested.map((subject) =>
        makeLabResult(lab.privateKey, { ...pathogen, statement: { ...pathogen.statement, subject } }),
      ),
    );
    // What the registry serves to anyone: the lab's binding on each result's code. The key is in
    // every result file, so the outsider has it too.
    const published = made.map((m) => ({
      attestationId: `att_x${bindingIdSuffix(k, lab.publicKey)}`,
      type: 'other',
      subjectCommitment: m.commitment,
      documentHash: resultBindingHash(keyText, m.bundle.statement.subject, m.bundle.statement.bindingSalt!),
      attester: { publicKey: lab.publicKey },
      signatureValid: true,
      retraction: null,
    }));
    // The attack on the earlier, unsalted binding: hash each code with the key, compare.
    const unsalted = (c: string) =>
      hexOf(
        sha256(
          new Uint8Array([
            ...new TextEncoder().encode('veilcore:lab-result-binding:v2\0'),
            ...unhex(keyText),
            ...unhex(c),
          ]),
        ),
      );
    // Even holding the salt of the lab's OTHER result (shown to it on that result's check link).
    const leakedSalt = made[1].bundle.statement.bindingSalt!;
    const hits = codes.filter((c) =>
      published
        .slice(0, 1)
        .some(
          (p) =>
            p.documentHash === unsalted(c) ||
            p.documentHash === resultBindingHash(keyText, c, leakedSalt) ||
            findBinding([p], p.subjectCommitment, k.key, c, []).kind !== 'none',
        ),
    );
    expect(hits).toEqual([]);
    // The checker the holder shows the result to has the salt in the file and gets the lab's name.
    expect(
      findBinding([published[0]], made[0].commitment, k.key, tested[0], [], made[0].bundle.statement.bindingSalt).kind,
    ).toBe('bound');
    // And an unsalted binding, were a lab to post one, is never read.
    const old = { ...published[0], documentHash: unsalted(tested[0]) };
    expect(
      findBinding([old], made[0].commitment, k.key, tested[0], [], made[0].bundle.statement.bindingSalt).kind,
    ).toBe('none');
    expect(findBinding([old], made[0].commitment, k.key, tested[0], []).kind).toBe('none');
  });
});

// The SDK's vectors for SPEC 11.12 (veilcore-sdk conformance/lab-result-v2.json, copied byte for
// byte): computed there from the specification with node:crypto and the canonicaliser only, so
// this implementation is tested against values it did not compute.
describe('the SDK’s lab result vectors (SPEC 11.12)', () => {
  type Fields = Record<string, unknown> & {
    files: { name: string; sha256: string; size: number }[];
    about: { name: string }[];
  };
  type Vectors = {
    schemas: Record<string, unknown>;
    labStatements: { name: string; statement: unknown; sha256: string; size: number }[];
    labStatementRefusals: { name: string; statement: unknown }[];
    labBindings: { name: string; fields: Fields; statement: unknown; values: (string | null)[]; bound: boolean }[];
    markSeals: { name: string; sequence: string; salt: string; seal: string }[];
    markRefusals: { name: string; sequence: string; salt: string }[];
    labNameBindings: { name: string; key: string; subject: string; salt: string; nameBinding: string }[];
    labNameBindingRefusals: { name: string; key: string; subject: string; salt: string }[];
  };
  const v = vectors as unknown as Vectors;

  it('gives every statement’s file entry, and refuses every refusal', () => {
    for (const s of v.labStatements)
      expect(statementFile(checkedStatement(s.statement)), s.name).toEqual({
        name: RESULT_FILE_NAME,
        sha256: s.sha256,
        size: s.size,
      });
    for (const s of v.labStatementRefusals) expect(() => checkedStatement(s.statement), s.name).toThrow();
  });

  it('publishes the same call forms, by id', () => {
    for (const [id, doc] of Object.entries(v.schemas)) expect(SCHEMAS[id], id).toEqual(doc);
  });

  it('binds and refuses each record as the vectors do', async () => {
    const byHex = new Map<string, string>();
    for (const id of Object.keys(v.schemas)) byHex.set(await schemaIdHex(id), id);
    for (const b of v.labBindings) {
      const f = b.fields;
      const record = {
        profile: f.profile as string,
        strainName: f.title as string,
        bredBy: f.holder as string,
        dateCreated: f.issued as string,
        notes: f.notes as string,
        loggedAt: f.loggedAt as number,
        nonce: f.nonce as string,
        refId: f.reference as string,
        document: { type: f.type as 'lab-report', issuer: f.issuer as string, files: f.files, about: f.about },
        ...(f.fieldSchema !== undefined
          ? { fieldSchema: f.fieldSchema as string, fieldSetRoot: f.fieldSetRoot as string }
          : {}),
        ...(f.fieldSchema !== undefined
          ? {
              fieldSet: {
                schema: byHex.get(f.fieldSchema as string) ?? 'unknown',
                values: b.values,
                fieldSecret: '00'.repeat(32),
              },
            }
          : {}),
      } as unknown as Parameters<typeof checkBinding>[0];
      const run = () => {
        checkedDocumentFields(record);
        checkBinding(record, checkedStatement(b.statement));
      };
      if (b.bound) expect(run, b.name).not.toThrow();
      else expect(run, b.name).toThrow();
    }
  });

  it('seals marks as the vectors do', () => {
    for (const m of v.markSeals) expect(markSeal(m.sequence, m.salt), m.name).toBe(m.seal);
    for (const m of v.markRefusals) expect(() => markSeal(m.sequence, m.salt), m.name).toThrow();
  });

  it('makes the lab’s name bindings as the vectors do', () => {
    for (const b of v.labNameBindings) expect(resultBindingHash(b.key, b.subject, b.salt), b.name).toBe(b.nameBinding);
    for (const b of v.labNameBindingRefusals)
      expect(() => resultBindingHash(b.key, b.subject, b.salt), b.name).toThrow();
  });
});

describe('review fixes', () => {
  const ok = { format: LAB_RESULT_FORMAT, ...pathogen.statement } as LabResultStatement;

  it('refuses invisible format characters and a mark label that is a sequence; takes the other sample’s ID', () => {
    expect(() => checkedStatement({ ...ok, sampleId: 'S-04​12' })).toThrow(
      expect.objectContaining({ code: 'sampleId' }),
    );
    expect(() => checkedStatement({ ...ok, accession: 'L‮1' })).toThrow(expect.objectContaining({ code: 'accession' }));
    expect(() =>
      checkedStatement({
        ...ok,
        kind: 'dna-mark',
        result: { seal: 'd4'.repeat(32), found: true, label: 'mark acgtacgtac' },
      }),
    ).toThrow(expect.objectContaining({ code: 'label' }));
    expect(
      checkedStatement({ ...ok, kind: 'match', result: { other: B, otherSampleId: 'REF-7', matches: true } }),
    ).toBeTruthy();
  });

  it('counts a replacement only for the same record tested, and not by an earlier test', async () => {
    const lab = await generateKeypair();
    const first = await makeLabResult(lab.privateKey, pathogen);
    const mk = (statement: LabResultInput['statement']) => makeLabResult(lab.privateKey, { labName: 'L', statement });
    const otherRecord = await mk({
      ...pathogen.statement,
      subject: B,
      replaces: { result: first.commitment, reason: 're-test' },
    });
    const earlier = await mk({
      ...pathogen.statement,
      tested: '2026-11-04',
      received: '2026-11-03',
      replaces: { result: first.commitment, reason: 'correction' },
    });
    expect(replacedBy([first.bundle, otherRecord.bundle]).size).toBe(0);
    expect(replacedBy([first.bundle, earlier.bundle]).size).toBe(0);
  });

  it('refuses a record whose about or reference disagrees with the statement', async () => {
    const lab = await generateKeypair();
    const { bundle } = await makeLabResult(lab.privateKey, pathogen);
    const o = copy(bundle);
    const about = { ...o, record: { ...o.record, document: { ...o.record.document, about: [{ name: 'S-9999' }] } } };
    await expect(readLabResult(about)).rejects.toMatchObject({ code: 'file' });
    const ref = { ...o, record: { ...o.record, refId: 'LAB-0000' } };
    await expect(readLabResult(ref)).rejects.toMatchObject({ code: 'file' });
  });

  it('two results naming each other replace neither, and a record naming two labs is refused', async () => {
    const lab = await generateKeypair();
    const a = await makeLabResult(lab.privateKey, pathogen);
    const b = await makeLabResult(lab.privateKey, {
      ...pathogen,
      statement: { ...pathogen.statement, replaces: { result: a.commitment, reason: 're-test' } },
    });
    // A third, same day, naming b, and b names a: a is replaced, b is replaced by c.
    const c = await makeLabResult(lab.privateKey, {
      ...pathogen,
      statement: { ...pathogen.statement, replaces: { result: b.commitment, reason: 'correction' } },
    });
    expect(replacedBy([a.bundle, b.bundle, c.bundle]).size).toBe(2);
    // Mutual: build b' naming a, and a' naming b' is impossible to sign (codes), so check the rule directly.
    const mutualA = {
      ...a.bundle,
      statement: { ...a.bundle.statement, replaces: { result: b.commitment, reason: 're-test' as const } },
    };
    expect(replacedBy([mutualA, b.bundle]).size).toBe(0);
    const o = copy(a.bundle);
    const twoLabs = { ...o, record: { ...o.record, document: { ...o.record.document, issuer: 'Another Lab' } } };
    await expect(readLabResult(twoLabs)).rejects.toMatchObject({ code: 'file' });
  });

  it('reads a proof code only when the cell is one code, or a link ending in one', async () => {
    const { proofCodeOf } = await import('./lab-result-draft');
    expect(proofCodeOf(A.toUpperCase())).toBe(A);
    expect(proofCodeOf(`https://veilcore.org/verify/VEIL-1?fp=${A}`)).toBe(A);
    expect(proofCodeOf(`${A} ${B}`)).toBeUndefined();
    expect(proofCodeOf(`${A},${B}`)).toBeUndefined();
    expect(proofCodeOf(`code ${A}`)).toBeUndefined();
    expect(proofCodeOf(`https://x.example/${A}/${B}`)).toBeUndefined();
  });
});
