// The partner's one-call check (record-check/src/check.ts) against a stand-in registry:
// how each registry answer maps to the plain verdict. Dated, undated, tampered, withdrawn
// receipts, unchecked names, the key in the link, disclosed fields, the lab report
// pairing, and the date stamp look-up wired to @veilcore/contracts' checkBatchAnchor.
// All records are test data.
// SPDX-License-Identifier: Apache-2.0
/* eslint-disable @typescript-eslint/require-await -- the stand-ins replace fetch */
import { createHash, randomBytes } from 'node:crypto';
import {
  ContractMaintenanceAuthority,
  createCircuitContext,
  createConstructorContext,
  sampleContractAddress,
  sampleSigningKey,
  signatureVerifyingKey,
  type ContractState,
} from '@midnight-ntwrk/compact-runtime';
import {
  buildBatch,
  canonicalise,
  generateKeypair,
  signAttestation,
  signRetraction,
  type InclusionProof,
  type SignedAttestation,
} from 'veilcore-records';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { Contract } from '../../../contract/src/managed/veilcore/contract/index.js';
import { PREPROD_ADDRESSES } from '../../src/network';
import {
  checkRecord as checkCore,
  CUT,
  LinkError,
  parseCheckLink,
  RegistryError,
  type RecordCheck,
} from '../src/index';
import { checkRecord, onChainChecker } from '../src/node';
import { asText, exitCodeOf, main } from '../src/cli';

const NOW = Date.parse('2026-10-15T12:00:00Z');
const REG = 'http://registry.test';
const hex = (n = 32) => randomBytes(n).toString('hex');
const sha256 = (b: string | Uint8Array) => createHash('sha256').update(b).digest('hex');
const H = (tag: string, ...parts: string[]) => {
  const t = Buffer.alloc(32);
  t.write(tag, 'utf8');
  return createHash('sha256')
    .update(Buffer.concat([t, ...parts.map((p) => Buffer.from(p, 'hex'))]))
    .digest('hex');
};

// A record that names its key, sealed as the site seals it (test data).
const SECRET = hex();
const KEY = H('veilcore:v1:commit', SECRET);
const KEY_SALT = H('veilcore:v1:keysalt', SECRET);
const FIELDS = {
  breedingMethod: '',
  bredBy: 'Test breeder',
  dateCreated: '2026-10-01',
  loggedAt: 1_760_000_000_000,
  nonce: hex(),
  notes: 'Test data.',
  parents: [],
  photoFingerprints: [],
  refId: '',
  strainName: 'Practice record',
  keyBinding: H('veilcore:v1:keybind', KEY, KEY_SALT),
};
const CONTENT = sha256(canonicalise(FIELDS));
const FP = H('veilcore:v1:keyrecord', FIELDS.keyBinding, CONTENT);
const OTHER_FP = hex();
const ID = `VEIL-${hex(16).toUpperCase()}`;
const LAB_SHA = sha256('test lab report');
const TX = hex();
const LINK = `https://veilcore.org/verify/${ID}?fp=${FP}`;

const ANCHOR = {
  chain: 'midnight',
  network: 'preprod',
  contractAddress: '7a'.repeat(32),
  txHash: TX,
  blockHeight: 4242,
  anchoredAt: '2026-10-11T10:00:00.000Z',
  testNetwork: true,
};

let proof: InclusionProof;
let otherProof: InclusionProof;
let lab: { publicKey: string; privateKey: string };
let report: SignedAttestation;
let receipt: SignedAttestation;

const CHECKED_NAME = {
  source: 'licence-listing',
  sourceUrl: 'https://cannabis.example.gov/licensees',
  licenceNo: 'TL-1',
  emailDomain: 'lab.example',
  checkedAt: '2026-10-01',
  checkedBy: 'HR',
  expiresAt: '2027-10-01',
  checkedName: 'Practice Lab',
};
const registeredAs = (over: Record<string, unknown> = {}) => ({
  displayName: 'Practice Lab',
  accreditation: null,
  vetted: true,
  nameCheck: CHECKED_NAME,
  nameCheckStatus: 'checked',
  ...over,
});
const served = (a: SignedAttestation, over: Record<string, unknown> = {}) => ({
  ...a,
  strength: 'signed',
  vettedAttester: true,
  registeredAs: registeredAs(),
  retraction: null,
  ...over,
});

beforeAll(async () => {
  const batch = await buildBatch([FP, OTHER_FP, hex()], 'B-20261011-TEST');
  proof = { ...batch.proofs[FP], anchor: ANCHOR };
  otherProof = { ...batch.proofs[OTHER_FP], anchor: ANCHOR };
  lab = await generateKeypair();
  const base = {
    subjectCommitment: FP,
    hashAlgorithm: 'sha256' as const,
    issuedAt: '2026-10-12T09:00:00Z',
    attester: { publicKey: lab.publicKey, displayName: 'Practice Lab' },
  };
  report = await signAttestation(
    { ...base, attestationId: 'att_report', type: 'laboratory-report', documentHash: LAB_SHA },
    lab.privateKey,
  );
  receipt = await signAttestation(
    { ...base, attestationId: 'att_receipt', type: 'chain-of-custody', documentHash: sha256('sample 1') },
    lab.privateKey,
  );
});

type Answers = {
  verify?: unknown;
  verifyStatus?: number;
  proof?: unknown;
  proofStatus?: number;
  attestations?: unknown[];
};

/** A stand-in registry: the three public routes, and the URLs it was asked. */
const registry = (a: Answers = {}) => {
  const asked: string[] = [];
  const fetch = (async (url: string | URL) => {
    const u = new URL(String(url));
    asked.push(u.pathname + u.search);
    const reply = (status: number, body: unknown) =>
      ({ status, ok: status < 400, json: async () => body }) as unknown as Response;
    if (u.pathname.startsWith('/verify/'))
      return reply(
        a.verifyStatus ?? 200,
        a.verify ?? {
          found: true,
          id: ID,
          cultivar: 'Practice record',
          recordFingerprint: FP,
          keyBound: true,
          registryFirstSeen: '2026-10-10T08:00:00.000Z',
          disclosed: [],
        },
      );
    if (u.pathname.startsWith('/proof/')) return reply(a.proofStatus ?? 200, a.proof ?? proof);
    if (u.pathname.startsWith('/attestations/subject/')) {
      const list = a.attestations ?? [];
      return reply(200, { attestations: list, total: list.length, limit: 100, offset: 0 });
    }
    return reply(404, { error: 'not found' });
  }) as typeof globalThis.fetch;
  return { fetch, asked };
};

const run = (link: string, a: Answers = {}, extra: Parameters<typeof checkCore>[1] = {}) => {
  const r = registry(a);
  return checkCore(link, { registry: REG, fetch: r.fetch, now: NOW, ...extra }).then((c) => ({ c, asked: r.asked }));
};

/** The registry's /verify answer when the holder shares lab status, with its delivery receipts. */
const withCustody = (custody: unknown) => ({
  found: true,
  id: ID,
  cultivar: 'Practice record',
  recordFingerprint: FP,
  keyBound: true,
  custody,
});

/** Words the product never uses about a record (README "product copy rules"). */
const FORBIDDEN = [
  /\bown(s|ed|er|ership)?\b/i,
  /track and trace/i,
  /\bvouches for\b/i,
  /\bcertified\b/i,
  /\bauthentic/i,
  /\bgenuine\b/i,
];
const expectPlainWords = (c: RecordCheck) => {
  const all = JSON.stringify(c) + asText(c);
  for (const w of FORBIDDEN) expect(all).not.toMatch(w);
};

describe('the link', () => {
  it('reads a site link, a bare id and the key parameters', () => {
    expect(parseCheckLink(LINK)).toEqual({ recordId: ID, fingerprint: { state: 'given', value: FP } });
    expect(parseCheckLink(ID)).toEqual({ recordId: ID, fingerprint: { state: 'absent' } });
    expect(
      parseCheckLink(`${LINK.replace(FP, FP.toUpperCase())}&show=existence&chain=${KEY}&ks=${KEY_SALT}&cd=${CONTENT}`),
    ).toEqual({
      recordId: ID,
      fingerprint: { state: 'given', value: FP },
      show: 'existence',
      key: { key: KEY, keySalt: KEY_SALT, contentHash: CONTENT },
    });
    expect(parseCheckLink(`${LINK.slice(0, -3)}`).fingerprint).toEqual({ state: 'invalid', cut: true });
    expect(parseCheckLink(`${LINK}zz`).fingerprint).toEqual({ state: 'invalid' });
  });

  it('refuses what names no record', () => {
    for (const bad of [
      '',
      'not a link',
      'https://veilcore.org/',
      'javascript:alert(1)',
      'https://x.example/verify/%E0%A4%A',
      'https://x.example/verify/<b>',
    ])
      expect(() => parseCheckLink(bad)).toThrow(LinkError);
  });

  it('asks the partner’s registry, never the link’s host', async () => {
    const r = registry();
    const seen: string[] = [];
    const spy = (async (u: string | URL, i?: RequestInit) => {
      seen.push(new URL(String(u)).origin);
      return r.fetch(u, i);
    }) as typeof fetch;
    await checkCore(`https://evil.example/verify/${ID}?fp=${FP}`, { registry: REG, fetch: spy, now: NOW });
    expect(new Set(seen)).toEqual(new Set([REG]));
  });
});

describe('dated', () => {
  it('a reported date stamp, not looked up: the registry’s word, on a test network', async () => {
    const { c } = await run(LINK);
    expect(c.recordExists).toBe(true);
    expect(c.fingerprintMatches).toBe(true);
    expect(c.dated).toMatchObject({
      status: 'reported',
      checkedOnChain: false,
      inBatch: true,
      batch: 'B-20261011-TEST',
      batchRoot: proof.root,
      network: 'preprod',
      testNetwork: true,
      txId: TX,
      blockTime: null,
      blockHeight: null,
      reportedDate: '2026-10-11T10:00:00.000Z',
    });
    expect(c.whatThisDoesNotShow.join(' ')).toMatch(/test network/);
    expect(c.whatThisDoesNotShow.join(' ')).toMatch(/until the transaction is looked up on Midnight/);
    // A test network date: exit 1 unless the partner allows test networks.
    expect(exitCodeOf(c)).toBe(1);
    expect(exitCodeOf(c, { allowTestNetwork: true })).toBe(0);
    expectPlainWords(c);
  });

  it('looked up and confirmed: the block’s time, from the chain; mainnet is not a test network', async () => {
    const at = Date.parse('2026-10-11T10:00:07Z');
    const checker = vi.fn(async () => ({ status: 'checked' as const, blockHeight: 971004, blockTime: at }));
    const { c } = await run(
      LINK,
      { proof: { ...proof, anchor: { ...ANCHOR, network: 'mainnet', testNetwork: false } } },
      { checkAnchor: checker },
    );
    expect(checker).toHaveBeenCalledWith({ network: 'mainnet', txId: TX, root: proof.root });
    expect(c.dated).toMatchObject({
      status: 'checked-on-chain',
      checkedOnChain: true,
      blockHeight: 971004,
      blockTime: '2026-10-11T10:00:07.000Z',
      testNetwork: false,
    });
    expect(c.summary).toMatch(/Date stamp checked on mainnet: 2026-10-11T10:00:07.000Z/);
    expect(c.whatThisDoesNotShow.join(' ')).not.toMatch(/test network/);
  });

  it('looked up and not confirmed: said plainly, and the CLI exits 1', async () => {
    const { c } = await run(
      LINK,
      {},
      {
        checkAnchor: async () => ({ status: 'not-confirmed', reason: 'that transaction timestamped a different root' }),
      },
    );
    expect(c.dated).toMatchObject({ status: 'not-confirmed', checkedOnChain: false, blockTime: null });
    expect(c.problems.join(' ')).toMatch(/different root/);
    expect(c.summary).toMatch(/NOT confirmed/);
    expect(exitCodeOf(c)).toBe(1);
  });

  it('a look-up that could not be made, or threw: the date stays the registry’s word', async () => {
    const { c } = await run(
      LINK,
      {},
      { checkAnchor: async () => ({ status: 'unreachable', reason: 'the indexer did not answer' }) },
    );
    expect(c.dated.status).toBe('not-looked-up');
    const t = await run(LINK, {}, { checkAnchor: async () => Promise.reject(new Error('boom')) });
    expect(t.c.dated).toMatchObject({ status: 'not-looked-up', reason: 'boom' });
    expect(exitCodeOf(t.c, { allowTestNetwork: true })).toBe(0);
  });
});

describe('undated', () => {
  it('in a sealed batch with no date stamp', async () => {
    const { anchor: _a, ...bare } = proof;
    void _a;
    const { c } = await run(LINK, { proof: bare });
    expect(c.dated).toMatchObject({ status: 'no-date-stamp', inBatch: true, network: null, txId: null });
    expect(c.summary).toMatch(/no date stamp yet/);
  });

  it('not in a batch yet (the registry has no proof)', async () => {
    const { c } = await run(LINK, { proofStatus: 404, proof: { error: 'not yet batched' } });
    expect(c.dated).toMatchObject({ status: 'not-in-a-batch', inBatch: false });
    expect(c.problems).toEqual([]);
  });
});

describe('tampered', () => {
  it('the link’s fingerprint is not the registry’s: nothing else is asked or checked', async () => {
    const { c, asked } = await run(LINK, {
      verify: { found: true, id: ID, recordFingerprint: OTHER_FP, keyBound: true },
    });
    expect(c.fingerprintMatches).toBe(false);
    expect(c.dated.status).toBe('not-checked');
    expect(c.labReceipts).toEqual([]);
    expect(asked.every((p) => p.startsWith('/verify/'))).toBe(true);
    expect(c.summary).toMatch(/^Do not rely on this link/);
    expect(exitCodeOf(c)).toBe(1);
  });

  it('a damaged fingerprint in the link', async () => {
    const { c } = await run(`https://veilcore.org/verify/${ID}?fp=${FP.slice(2)}zz`);
    expect(c.fingerprintMatches).toBe(false);
    expect(c.linkLooksCut).toBe(false);
    expect(c.problems.join(' ')).toMatch(/damaged/);
  });

  it('a link cut off: said so, not called a different fingerprint', async () => {
    for (const cut of [
      `https://veilcore.org/verify/${ID}?fp=${FP.slice(0, 40)}`,
      `https://veilcore.org/verify/${ID}?fp=${FP.slice(0, 12)}…`,
      `https://veilcore.org/verify/${ID}?fp=${FP.slice(0, 12)}...`,
      `https://veilcore.org/verify/${ID}?fp=`,
      `https://veilcore.org/verify/${ID}?fp`,
      `https://veilcore.org/verify/${ID}?f`,
      `https://veilcore.org/verify/${ID}?`,
    ]) {
      const { c } = await run(cut);
      expect(c.linkLooksCut, cut).toBe(true);
      expect(c.fingerprintMatches, cut).toBe(false);
      expect(c.summary, cut).toBe(`${CUT} Nothing was checked.`);
      expect(c.summary).not.toMatch(/different fingerprint/);
      expect(c.problems).toEqual([CUT]);
      expect(exitCodeOf(c)).toBe(1);
    }
    // Cut before the record id is whole: refused as a link, in the same words.
    for (const cut of [
      'https://veilcore.org/verif',
      'https://veilcore.org/verify/',
      `https://veilcore.org/verify/VEIL-AB12…`,
    ])
      expect(() => parseCheckLink(cut), cut).toThrow(CUT);
    // A record with no such id, from a cut link, says the link looks cut off.
    const nf = await run(`https://veilcore.org/verify/${ID}?fp=${FP.slice(0, 30)}`, {
      verifyStatus: 404,
      verify: { found: false },
    });
    expect(nf.c.summary).toBe(`${CUT} Nothing was checked.`);
  });

  it('a proof about another record, or one that does not fold, is not this record’s date', async () => {
    for (const bad of [
      otherProof,
      { ...proof, root: OTHER_FP },
      { ...proof, path: [{ sibling: hex(), siblingIsLeft: true }] },
    ]) {
      // Even with a date stamp "confirmed" on mainnet: the proof doesn't tie it to this record.
      const { c } = await run(
        LINK,
        { proof: { ...bad, anchor: { ...ANCHOR, network: 'mainnet' } } },
        { checkAnchor: async () => ({ status: 'checked', blockTime: NOW }) },
      );
      expect(c.dated).toMatchObject({ status: 'proof-fails', inBatch: false, checkedOnChain: false });
      expect(c.problems.join(' ')).toMatch(/inclusion proof does not check out/);
      expect(c.summary).toMatch(/inclusion proof does NOT check out/);
      expect(exitCodeOf(c)).toBe(1);
      expect(exitCodeOf(c, { allowTestNetwork: true })).toBe(1);
    }
  });

  it('disclosed fields: matching ones hash to the fingerprint; one changed field does not', async () => {
    expect((await run(LINK, {}, { fields: FIELDS })).c.disclosedFieldsMatch).toBe(true);
    // An export's registered-fingerprint block, exactly as the site writes it, is unwrapped.
    const block = {
      fingerprint: FP,
      algorithm: 'sha256/key-bound/v1',
      recompute: 'H(…)',
      fields: FIELDS,
      sealedAt: '2026-10-01T00:00:00Z',
      notCovered: [],
    };
    expect((await run(LINK, {}, { fields: block })).c.disclosedFieldsMatch).toBe(true);
    // Anything else holding `fields` is hashed whole: fake fields beside the real ones don't pass.
    for (const wrapped of [
      { strainName: 'Rare Elite Cut', bredBy: 'Famous Breeder', fields: FIELDS },
      { fields: FIELDS, fingerprint: FP },
      { ...block, strainName: 'Rare Elite Cut' },
      { ...block, algorithm: 'sha1' },
    ]) {
      const w = await run(LINK, {}, { fields: wrapped });
      expect(w.c.disclosedFieldsMatch, JSON.stringify(Object.keys(wrapped))).toBe(false);
      expect(exitCodeOf(w.c, { allowTestNetwork: true })).toBe(1);
    }
    expect((await run(LINK, {}, { fields: { strainName: 'x', fields: FIELDS } })).c.problems.join(' ')).toMatch(
      /hashed whole, as given/,
    );
    const { c } = await run(LINK, {}, { fields: { ...FIELDS, strainName: 'Something else' } });
    expect(c.disclosedFieldsMatch).toBe(false);
    expect(exitCodeOf(c)).toBe(1);
    expect((await run(LINK, {}, { fields: [1, 2] })).c.disclosedFieldsMatch).toBe(false);
  });

  it('a signature that does not verify, or names another record, does not count', async () => {
    const forged = served({ ...report, documentHash: sha256('another report') });
    const elsewhere = served({ ...receipt, subjectCommitment: OTHER_FP });
    const { c } = await run(LINK, { attestations: [forged, elsewhere, { junk: true }] });
    expect(c.labReceipts).toHaveLength(1);
    expect(c.labReceipts[0]).toMatchObject({ signatureVerified: false, counts: false, nameCheckRecord: null });
    expect(c.labReceipts[0].words).toMatch(/does not verify/);
    expect(c.problems.join(' ')).toMatch(/2 signatures .* not about this fingerprint/);
  });
});

describe('lab receipts', () => {
  it('a checked name: named, with the listing, and VeilCore doesn’t vouch', async () => {
    const { c } = await run(LINK, {
      verify: withCustody([{ receiptAttestationId: 'att_receipt', covered: 'covered', differences: [] }]),
      attestations: [served(receipt)],
    });
    const r = c.labReceipts[0];
    expect(r).toMatchObject({
      kind: 'lab-receipt',
      signatureVerified: true,
      withdrawn: false,
      counts: true,
      signer: { publicKey: lab.publicKey, registeredName: 'Practice Lab', nameCheck: 'checked' },
      nameCheckRecord: {
        listingHost: 'cannabis.example.gov',
        number: 'TL-1',
        numberKind: 'license',
        checkedOn: '2026-10-01',
        expiresOn: '2027-10-01',
      },
    });
    expect(r.words).toBe(
      'Lab’s receipt for a sample, signature verified, signed by Practice Lab. VeilCore’s operator matched this name to cannabis.example.gov (license TL-1) on 2026-10-01. VeilCore doesn’t vouch for the lab’s work. Its signature covers the sample details, and what arrived matches what was sent.',
    );
    expect(r.custody).toEqual({ covered: 'covered', differences: [], clean: true });
    expect(c.summary).toMatch(/1 lab signature verified \(1 with a name VeilCore’s operator checked\)/);
    expectPlainWords(c);
  });

  it('unchecked names: no mark, expired, another name, a non-https listing, a withdrawn mark', async () => {
    const cases: [Record<string, unknown>, string][] = [
      [
        {
          vettedAttester: false,
          registeredAs: registeredAs({ vetted: false, nameCheck: null, nameCheckStatus: 'not-checked' }),
        },
        'not-checked',
      ],
      [{ registeredAs: registeredAs({ nameCheck: { ...CHECKED_NAME, expiresAt: '2026-10-14' } }) }, 'expired'],
      [{ registeredAs: registeredAs({ nameCheck: null, nameCheckStatus: 'expired' }) }, 'expired'],
      [{ registeredAs: registeredAs({ displayName: 'Practice Lab LLC' }) }, 'not-checked'],
      [
        { registeredAs: registeredAs({ nameCheck: { ...CHECKED_NAME, sourceUrl: 'http://cannabis.example.gov/' } }) },
        'not-checked',
      ],
      [
        {
          vettedAttester: false,
          registeredAs: registeredAs({ vetted: false, nameCheck: null, nameCheckStatus: 'withdrawn' }),
        },
        'withdrawn',
      ],
      [{ vettedAttester: false, registeredAs: null }, 'not-checked'],
    ];
    for (const [over, status] of cases) {
      const { c } = await run(LINK, { attestations: [served(report, over)] });
      const r = c.labReceipts[0];
      expect(r.signer.nameCheck, JSON.stringify(over)).toBe(status);
      expect(r.nameCheckRecord).toBeNull();
      expect(r.counts).toBe(true);
      expect(r.words).toMatch(/signed by a key named “Practice Lab( LLC)?” \(name not checked\)/);
      expect(r.words).not.toMatch(/matched this name/);
    }
  });

  it('a bidi trick in a registered name is cleaned before it is printed', async () => {
    const { c } = await run(LINK, {
      attestations: [
        served(receipt, {
          vettedAttester: false,
          registeredAs: registeredAs({ displayName: 'Lab‮evil​  X', vetted: false, nameCheck: null }),
        }),
      ],
    });
    expect(c.labReceipts[0].signer.registeredName).toBe('Lab evil X');
  });

  it('withdrawn receipts: a withdrawal the signer signed stops it counting; an unsigned one is ignored', async () => {
    const retraction = await signRetraction(
      {
        attestationId: receipt.attestationId,
        attesterPublicKey: lab.publicKey,
        reason: 'sample-compromised',
        retractedAt: '2026-10-13T00:00:00Z',
      },
      lab.privateKey,
    );
    const tied = withCustody([{ receiptAttestationId: 'att_receipt', covered: 'covered', differences: [] }]);
    const { c } = await run(LINK, { verify: tied, attestations: [served(receipt, { retraction })] });
    expect(c.labReceipts[0]).toMatchObject({
      withdrawn: true,
      counts: false,
      withdrawalNotSigned: false,
      nameCheckRecord: null,
    });
    expect(c.labReceipts[0].words).toMatch(/withdrawn by its signer/);
    expect(c.summary).toMatch(/No lab signature counts for it\. 1 withdrawn by its signer\./);

    const other = await generateKeypair();
    const notTheirs = await signRetraction({ ...retraction, attesterPublicKey: other.publicKey }, other.privateKey);
    for (const fake of [
      { ...retraction, signature: '00'.repeat(64) },
      notTheirs,
      { ...retraction, attestationId: 'att_other' },
    ]) {
      const t = await run(LINK, { verify: tied, attestations: [served(receipt, { retraction: fake })] });
      expect(t.c.labReceipts[0]).toMatchObject({ withdrawn: false, withdrawalNotSigned: true, counts: true });
    }
  });

  it('a lab report: matched to the report saved now through the record’s pairing fingerprint', async () => {
    const shared = {
      found: true,
      id: ID,
      recordFingerprint: FP,
      dnaPairedByHolder: true,
      dnaPairingFingerprint: H('veilcore:v1:commit', LAB_SHA),
    };
    expect((await run(LINK, { verify: shared, attestations: [served(report)] })).c.labReceipts[0]).toMatchObject({
      kind: 'lab-report',
      documentSha256: LAB_SHA,
      matchesSavedReport: true,
    });
    const other = { ...shared, dnaPairingFingerprint: H('veilcore:v1:commit', sha256('newer report')) };
    const t = await run(LINK, { verify: other, attestations: [served(report)] });
    expect(t.c.labReceipts[0].matchesSavedReport).toBe(false);
    expect(t.c.labReceipts[0].words).toMatch(/not the report file saved to this record now/);
    // The holder doesn't share it: unknown, never false.
    expect((await run(LINK, { attestations: [served(report)] })).c.labReceipts[0].matchesSavedReport).toBeNull();
    // Shared: none saved.
    expect(
      (
        await run(LINK, {
          verify: { ...shared, dnaPairedByHolder: false, dnaPairingFingerprint: undefined },
          attestations: [served(report)],
        })
      ).c.labReceipts[0].matchesSavedReport,
    ).toBe(false);
  });
});

describe('chain of custody: a receipt only when tied to a delivery', () => {
  it('a chain-of-custody signature the registry ties to no delivery: a signed statement, not counted', async () => {
    // Anyone can register a key under a lab-like name and sign one about any fingerprint.
    const stranger = await generateKeypair();
    const selfMade = await signAttestation(
      {
        attestationId: 'att_selfmade',
        type: 'chain-of-custody',
        subjectCommitment: FP,
        attester: { publicKey: stranger.publicKey, displayName: 'Acme Analytical Labs' },
        documentHash: sha256('whatever'),
        hashAlgorithm: 'sha256',
        issuedAt: '2026-10-15T00:00:00Z',
      },
      stranger.privateKey,
    );
    for (const verify of [
      undefined,
      withCustody([]),
      withCustody([{ receiptAttestationId: 'att_selfmad', covered: 'covered', differences: [] }]),
      withCustody([{ receiptAttestationId: 'att_selfmade', covered: 'yes', differences: [] }]),
      withCustody('att_selfmade'),
    ]) {
      const { c } = await run(LINK, {
        verify,
        attestations: [served(selfMade, { vettedAttester: false, registeredAs: null })],
      });
      const r = c.labReceipts[0];
      expect(r, JSON.stringify(verify)).toMatchObject({
        kind: 'custody-statement',
        signatureVerified: true,
        counts: false,
      });
      expect(r.custody).toBeUndefined();
      expect(r.words).toBe(
        'Signed custody statement (not tied to a delivery): signature verified, signed by a key named “Acme Analytical Labs” (name not checked). The registry ties it to no delivery of this record, and anyone can sign one, so it is not counted.',
      );
      expect(r.words).not.toMatch(/receipt for a sample/);
      expect(c.summary).toMatch(/No lab signature counts for it/);
    }
  });

  it('tied to a delivery: a receipt; what differs, or a change after signing, is said plainly and never clean', async () => {
    const cases: [unknown, Record<string, unknown>, RegExp][] = [
      [
        {
          receiptAttestationId: 'att_receipt',
          covered: 'covered',
          differences: ['Seal number differs: sent 4471, received 4417'],
        },
        { covered: 'covered', clean: false },
        /What arrived does NOT match what was sent: Seal number differs: sent 4471, received 4417\.$/,
      ],
      [
        { receiptAttestationId: 'att_receipt', covered: 'changed', differences: [] },
        { covered: 'changed', clean: false },
        /changed its arrival details after signing, so its signature does NOT cover them\.$/,
      ],
      [
        { receiptAttestationId: 'att_receipt', covered: 'not-covered', differences: [] },
        { covered: 'not-covered', clean: false },
        /doesn’t cover the sample details \(an older receipt\)\.$/,
      ],
    ];
    for (const [entry, custody, words] of cases) {
      const { c } = await run(LINK, { verify: withCustody([entry]), attestations: [served(receipt)] });
      const r = c.labReceipts[0];
      expect(r.kind).toBe('lab-receipt');
      expect(r.counts).toBe(true);
      expect(r.custody).toMatchObject(custody);
      expect(r.words).toMatch(words);
      if ((custody.covered as string) !== 'not-covered')
        expect(c.summary).toMatch(
          /1 lab receipt for a sample does NOT match what was sent, or was changed after signing/,
        );
      else expect(c.summary).not.toMatch(/does NOT match/);
    }
    // A difference with a control character is cleaned before it is printed.
    const { c } = await run(LINK, {
      verify: withCustody([
        { receiptAttestationId: 'att_receipt', covered: 'covered', differences: ['Seal\u202e differs', 7, null] },
      ]),
      attestations: [served(receipt)],
    });
    expect(c.labReceipts[0].custody?.differences).toEqual(['Seal differs']);
  });
});

describe('the key in the link', () => {
  it('matches the key the record named; another key, or part of one, does not', async () => {
    const withKey = (k: string, ks = KEY_SALT, cd = CONTENT) => `${LINK}&chain=${k}&ks=${ks}&cd=${cd}`;
    expect((await run(withKey(KEY))).c.keyBound).toMatchObject({
      recordNamesKey: true,
      keyInLink: 'matches',
      key: KEY,
    });
    const bad = await run(withKey(hex()));
    expect(bad.c.keyBound.keyInLink).toBe('does-not-match');
    expect(exitCodeOf(bad.c)).toBe(1);
    expect((await run(`${LINK}&chain=${KEY}&ks=${KEY_SALT}`)).c.keyBound.keyInLink).toBe('incomplete');
    // cd may come from the disclosed fields instead.
    expect((await run(`${LINK}&chain=${KEY}&ks=${KEY_SALT}`, {}, { fields: FIELDS })).c.keyBound.keyInLink).toBe(
      'matches',
    );
    expect((await run(LINK)).c.keyBound).toMatchObject({ recordNamesKey: true, keyInLink: 'not-given' });
  });
});

describe('no fingerprint in the link, no record, no registry', () => {
  it('a bare id: checked against the registry’s fingerprint, said so, never tied to the link', async () => {
    const { c } = await run(ID, { attestations: [served(receipt)] });
    expect(c.fingerprintMatches).toBeNull();
    expect(c.fingerprint).toBe(FP);
    expect(c.dated.inBatch).toBe(true);
    expect(c.problems.join(' ')).toMatch(/names no fingerprint/);
    expect(c.whatThisDoesNotShow.join(' ')).toMatch(/the link names no fingerprint/);
    expect(exitCodeOf(c)).toBe(1);
  });

  it('no record with that id', async () => {
    const { c } = await run(LINK, { verifyStatus: 404, verify: { found: false } });
    expect(c).toMatchObject({ recordExists: false, fingerprintMatches: null, labReceipts: [] });
    expect(c.summary).toMatch(/^No record with id/);
    expect(exitCodeOf(c)).toBe(1);
  });

  it('the registry unreachable, limiting, or answering nonsense: an error, not a verdict', async () => {
    const down = (async () => Promise.reject(new TypeError('fetch failed'))) as typeof fetch;
    await expect(checkCore(LINK, { registry: REG, fetch: down })).rejects.toThrow(RegistryError);
    await expect(run(LINK, { verifyStatus: 429, verify: { error: 'too many' } })).rejects.toThrow(/limiting/);
    await expect(run(LINK, { verify: '<html>' })).rejects.toThrow(RegistryError);
    await expect(checkCore(LINK, { registry: 'ftp://x' })).rejects.toThrow(RegistryError);
  });
});

// ---- the date stamp look-up (node.ts) ----

const COIN = '0'.repeat(64);
const zero = new Uint8Array(32);
const witnesses = new Proxy({}, { get: () => (ctx: { privateState: unknown }) => [ctx.privateState, zero] });
/** The real anchorBatch circuit run locally: a state no chain ever held. */
const forgedState = (root: string): string => {
  const c = new Contract(witnesses as never);
  const cs: ContractState = c.initialState(createConstructorContext({}, COIN)).currentContractState;
  const ctx = c.impureCircuits.anchorBatch(
    createCircuitContext(sampleContractAddress(), COIN, cs, {}) as never,
    Uint8Array.from(Buffer.from(root, 'hex')),
  ).context;
  cs.data = ctx.currentQueryContext.state;
  cs.maintenanceAuthority = new ContractMaintenanceAuthority([signatureVerifyingKey(sampleSigningKey())], 1, 1n);
  return Buffer.from(cs.serialize()).toString('hex');
};

describe('onChainChecker (wired to @veilcore/contracts checkBatchAnchor)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('the real checkBatchAnchor refuses a lying indexer on preprod: the date is not confirmed', async () => {
    const state = forgedState(proof.root);
    vi.stubGlobal('fetch', async () => ({
      ok: true,
      json: async () => ({
        data: {
          transactions: [
            {
              hash: TX,
              identifiers: [TX],
              transactionResult: { status: 'SUCCESS' },
              block: { height: 4242, timestamp: NOW },
              contractActions: [{ address: PREPROD_ADDRESSES.veilcore, state, entryPoint: 'anchorBatch' }],
            },
          ],
        },
      }),
    }));
    const r = registry();
    const c = await checkRecord(LINK, {
      registry: REG,
      fetch: r.fetch,
      now: NOW,
      chain: { indexer: 'http://indexer.test/' },
    });
    expect(c.dated.status).toBe('not-confirmed');
    expect(c.dated.reason).toMatch(/verifier keys at that transaction are not the pinned build's/);
    expect(c.dated.checkedOnChain).toBe(false);
  });

  it('maps checkBatchAnchor’s answers; other networks and a missing package are not looked up', async () => {
    const at = { network: 'preprod', txId: TX, root: proof.root };
    const fake = (v: unknown) => async () => ({ checkBatchAnchor: async () => v as never });
    expect(
      await onChainChecker({}, fake({ accepted: true, reason: 'ok', blockHeight: 7, blockTime: NOW }))(at),
    ).toEqual({ status: 'checked', blockHeight: 7, blockTime: NOW });
    expect(await onChainChecker({}, fake({ accepted: true, reason: 'ok' }))(at)).toMatchObject({
      status: 'not-confirmed',
    });
    expect(await onChainChecker({}, fake({ accepted: false, reason: 'nope' }))(at)).toEqual({
      status: 'not-confirmed',
      reason: 'nope',
    });
    expect(
      await onChainChecker({}, async () => ({ checkBatchAnchor: async () => Promise.reject(new Error('down')) }))(at),
    ).toEqual({ status: 'unreachable', reason: 'down' });
    const throwing = (m: string) => async () => ({ checkBatchAnchor: async () => Promise.reject(new Error(m)) });
    expect(await onChainChecker({}, throwing('No such transaction.'))(at)).toMatchObject({ status: 'not-confirmed' });
    expect(
      await onChainChecker({}, throwing('That transaction is not a single anchorBatch call on this contract.'))(at),
    ).toMatchObject({ status: 'not-confirmed' });
    expect(
      await onChainChecker(
        {},
        throwing('Refusing: the network is mainnet but the indexer x is not. Nothing was read.'),
      )(at),
    ).toMatchObject({ status: 'not-checked' });
    expect(await onChainChecker({}, async () => Promise.reject(new Error('not installed')))(at)).toMatchObject({
      status: 'not-checked',
      reason: /@veilcore\/contracts/,
    });
    expect(await onChainChecker({}, fake({ accepted: true }))({ ...at, network: 'preview' })).toMatchObject({
      status: 'not-checked',
    });
  });
});

describe('the CLI', () => {
  const capture = () => {
    let text = '';
    return { stream: { write: (s: string) => ((text += s), true) }, text: () => text };
  };
  it('usage and bad input exit 2; --help exits 0', async () => {
    const o = capture();
    const e = capture();
    expect(await main(['check'], o.stream, e.stream)).toBe(2);
    expect(await main(['nope', LINK], o.stream, e.stream)).toBe(2);
    expect(await main(['check', 'not a link', '--registry', REG], o.stream, e.stream)).toBe(2);
    expect(e.text()).toMatch(/not a check link/);
    expect(await main(['check', LINK, '--fields', '/nonexistent.json'], o.stream, e.stream)).toBe(2);
    expect(await main(['check', LINK, '--timeout', '0'], o.stream, e.stream)).toBe(2);
    expect(await main(['--help'], o.stream, e.stream)).toBe(0);
    expect(o.text()).toMatch(/partner-kit check <check link or record id>/);
    expect(o.text()).toMatch(/--allow-test-network/);
    expect(o.text()).toMatch(/inclusion proof doesn't check out/);
  });

  it('a test network date: exit 1, or 0 with --allow-test-network; a proof that fails: exit 1', async () => {
    const o = capture();
    const e = capture();
    vi.stubGlobal('fetch', registry().fetch);
    try {
      expect(await main(['check', LINK, '--registry', REG], o.stream, e.stream)).toBe(1);
      expect(await main(['check', LINK, '--registry', REG, '--allow-test-network'], o.stream, e.stream)).toBe(0);
      vi.stubGlobal('fetch', registry({ proof: otherProof }).fetch);
      expect(await main(['check', LINK, '--registry', REG, '--allow-test-network'], o.stream, e.stream)).toBe(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
