// Round 5 (fresh reviewer: breeder, lab tech, buyer): the smaller fixes, each pinned.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const local = new Map<string, string>();
let answer: () => Response = () => new Response('[]', { status: 200 });
const asked: { url: string; headers: Record<string, string> }[] = [];

beforeAll(() => {
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => local.get(k) ?? null,
    setItem: (k: string, v: string) => void local.set(k, v),
    removeItem: (k: string) => void local.delete(k),
  });
  vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
    asked.push({ url: String(url), headers: (init?.headers ?? {}) as Record<string, string> });
    return Promise.resolve(answer());
  });
});
afterAll(() => vi.unstubAllGlobals());

describe('saving a lab report keeps the file’s SHA-256 and where it came from', () => {
  it('pairDna stores the SHA-256 and the lab report id, and a new pairing replaces both', async () => {
    const records = await import('./veilcore/records');
    const { fingerprintRecord, newNonce } = await import('./veilcore/commitment');
    const fields = {
      nonce: newNonce(),
      strainName: 'P',
      bredBy: 'B',
      dateCreated: '2026-10-15',
      notes: '',
      loggedAt: Date.now(),
    };
    const rec = records.createRecord({ ...fields, recordFingerprint: await fingerprintRecord(fields) });
    const a = records.pairDna(rec.id, 'd7'.repeat(32), 'a.pdf', { fileSha256: 'AB'.repeat(32), resultId: 'LR-1' });
    expect(a?.dnaFileSha256).toBe('ab'.repeat(32));
    expect(a?.dnaResultId).toBe('LR-1');
    const b = records.pairDna(rec.id, 'd8'.repeat(32), 'own.pdf', { fileSha256: 'cd'.repeat(32) });
    expect(b?.dnaFileSha256).toBe('cd'.repeat(32));
    expect(b?.dnaResultId).toBeUndefined();
    expect(records.isStrainRecord(b)).toBe(true);
  });
});

describe('the check page footer names what each signature is', () => {
  it('says “a lab’s receipt” and “a lab report”, and keeps the count', async () => {
    const { checkedSummary } = await import('./veilcore/verify-link');
    expect(
      checkedSummary({
        bound: true,
        proofChecked: false,
        signaturesChecked: 2,
        signatureKinds: ['Lab’s receipt for a sample', 'Lab report (file SHA-256 3bb6af…111111)'],
      }),
    ).toBe(
      'Checked in this browser: the link’s fingerprint matches the one the registry reports and 2 signatures about it (a lab’s receipt, a lab report). Everything else is the VeilCore registry’s report.',
    );
    expect(
      checkedSummary({ bound: true, proofChecked: false, signaturesChecked: 1, signatureKinds: ['Lab report (x)'] }),
    ).toMatch(/one signature about it \(a lab report\)/);
  });
});

describe('a lab code without its lock part is caught at Receive', () => {
  it('warns for an id and claim with no lock, not for a full code or a half-typed one', async () => {
    const { codeMissingLock, MISSING_LOCK_WORDS } = await import('./veilcore/transfers');
    const lock = `age1${'q'.repeat(58)}`;
    expect(codeMissingLock('TR-0A1B2C3D.abcd1234')).toBe(true);
    expect(codeMissingLock('TR-0A1B2C3D.abcd1234.age1short')).toBe(true);
    expect(codeMissingLock(`TR-0A1B2C3D.abcd1234.${lock}`)).toBe(false);
    expect(codeMissingLock('TR-0A1B2C3D')).toBe(false);
    expect(codeMissingLock('')).toBe(false);
    expect(MISSING_LOCK_WORDS).toBe(
      'This code is missing its last part; you can receive the sample but can’t send a report back until you have the full code.',
    );
  });
});

describe('Download everything VeilCore holds for you', () => {
  it('asks GET /api/export with the holder key, and says plainly when it can’t', async () => {
    const { fetchRegistryExport } = await import('./veilcore/registry-export');
    local.delete('veilcore.holder.v1');
    const none = await fetchRegistryExport();
    expect('error' in none && none.error).toMatch(/Nothing has been saved to VeilCore from this browser yet/);

    local.set('veilcore.holder.v1', '9'.repeat(64));
    answer = () => new Response('{"format":"veilcore-registry-export/v1"}', { status: 200 });
    asked.length = 0;
    const ok = await fetchRegistryExport();
    expect('blob' in ok).toBe(true);
    expect(asked[0].url).toBe('https://registry.test/api/export');
    expect(asked[0].headers['x-holder-key']).toBe('9'.repeat(64));

    answer = () => new Response('{"error":"slow down"}', { status: 429 });
    const limited = await fetchRegistryExport();
    expect('error' in limited && limited.error).toMatch(/limited to a few a minute/);
  });
});

describe('the Bitcoin stamp file is offered only when the batch has one', () => {
  it('reads the proof’s anchors, and builds the address from the proof’s own batch', async () => {
    const { bitcoinStampFor } = await import('./veilcore/proofs');
    const base = { commitment: 'a'.repeat(64), root: 'b'.repeat(64), batchId: 'batch-7', path: [] };
    expect(bitcoinStampFor(base as never)).toBeUndefined();
    const withOts = {
      ...base,
      anchors: [{ kind: 'opentimestamps', status: 'pending', ots: 'https://evil.example/x.ots' }],
    };
    expect(bitcoinStampFor(withOts as never)).toEqual({
      otsUrl: 'https://registry.test/batches/batch-7/root.bin.ots',
      rootUrl: 'https://registry.test/batches/batch-7/root.bin',
      status: 'pending',
    });
  });
});

describe('words the reviewer flagged', () => {
  it('Show someone says what is shared now and what saving does', async () => {
    const { sharedNowWords } = await import('./veilcore/disclosure');
    expect(sharedNowWords({ show: [], updatedAt: null }, true)).toBe(
      'Shared now: only the basics. The switches above are a suggestion and aren’t saved yet. “Get the link” saves the switches above, and the check page then shows exactly that.',
    );
    expect(sharedNowWords({ show: ['parent-names'], updatedAt: 'x' }, false)).toBe(
      'Shared now: Parent cultivar names.',
    );
  });

  it('the checker’s Confirmed screen dates the key, not the record', async () => {
    const { keyStampWords } = await import('./veilcore/prove-relay');
    expect(keyStampWords(true)).toBe(
      'This plant’s key was date stamped on the network earlier. That dates the key, not the record.',
    );
    expect(keyStampWords(true, Date.UTC(2026, 9, 15, 12))).toMatch(
      /^Your plant’s key was date stamped on .*2026.*\. That dates the key, not the record\.$/,
    );
  });

  it('the lab’s receipt row never reads “You confirmed receipt — not signed yet”', async () => {
    const { labReceiptRow, keyStampLine } = await import('./components/flow/plant-status-words');
    expect(labReceiptRow({ kind: 'not-signed' })).toEqual({
      done: false,
      id: 'Receipt not signed yet',
      label: 'Receipt not signed yet',
      value: '',
    });
    expect(keyStampLine(undefined)).toBe(
      'Key date stamped: not yet. Your plant’s key is dated too, so you can prove you hold it later.',
    );
  });

  it('the lab is warned that withdrawing a correction leaves the breeder with nothing', async () => {
    const { WITHDRAW_CORRECTION_WARNING } = await import('./veilcore/lab-results');
    expect(WITHDRAW_CORRECTION_WARNING).toBe(
      'The original stays replaced. The breeder will have no live report from you until you send one.',
    );
  });
});
