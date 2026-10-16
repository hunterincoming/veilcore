// End to end, without a browser: a lab's 25-row accession log (CSV) goes through the same
// code the page runs (read → guess the columns → check → seal through the real records
// store and registry client → backup → results file), against a stand-in registry that
// stores by id as the real one does. Along the way the tab "closes" mid-import (fresh
// modules, same browser storage, same registry) and a save's answer is lost, and still
// every row ends up sealed exactly once.
// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it, vi } from 'vitest';

const local = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => local.get(k) ?? null,
  setItem: (k: string, v: string) => void local.set(k, v),
  removeItem: (k: string) => void local.delete(k),
});

/** The registry: records by id, per holder key; a save is an upsert per id. */
const held = new Map<string, Record<string, unknown>>();
const puts: string[][] = [];
let loseNextPutAnswer = false;
vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const method = (init?.method ?? 'GET').toUpperCase();
  const json = (v: unknown) =>
    Promise.resolve(new Response(JSON.stringify(v), { status: 200, headers: { 'content-type': 'application/json' } }));
  if (url.endsWith('/api/records')) {
    if (method === 'PUT') {
      const body = JSON.parse(init?.body as string) as Record<string, unknown>[];
      puts.push(body.map((r) => r.id as string));
      for (const r of body) held.set(r.id as string, r);
      if (loseNextPutAnswer) {
        loseNextPutAnswer = false;
        return Promise.reject(new TypeError('Failed to fetch')); // stored, but the answer never came back
      }
      return json({ ok: true });
    }
    return json([...held.values()]);
  }
  if (url.endsWith('/api/licenses')) return json(method === 'GET' ? [] : { ok: true });
  return Promise.reject(new Error(`no network in this test: ${method} ${url}`));
});

const ORIGIN = 'https://test.veilcore.org';
const HEADERS = ['Accession #', 'Cultivar', 'Species', 'Parentage', 'Breeder', 'Date received', 'Comments'];
const rowsIn = Array.from({ length: 25 }, (_, i) => {
  const n = i + 1;
  return [
    `TC-${String(n).padStart(4, '0')}`,
    n === 3 ? 'Café; "Noir"' : `Line ${n}`,
    n % 2 ? 'Fragaria × ananassa' : 'Rubus idaeus',
    n % 5 === 0 ? `Line ${n - 1} x Line ${n - 2}` : '',
    n === 7 ? '' : 'Green Lab',
    n === 4 ? '44562' : `${String((n % 28) + 1).padStart(2, '0')}.03.2024`,
    n === 9 ? 'two\nlines' : '',
  ];
});
const cell = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const CSV = `\uFEFF${[HEADERS, ...rowsIn].map((r) => r.map(cell).join(';')).join('\r\n')}\r\n`;
const fileOf = (text: string, name: string) => {
  const b = new TextEncoder().encode(text);
  return { name, size: b.length, arrayBuffer: () => Promise.resolve(b.slice().buffer) } as unknown as File;
};

/** A tab: the modules as a newly opened page loads them. */
const openTab = async () => {
  vi.resetModules();
  const bi = await import('../../veilcore/bulk-import');
  const records = await import('../../veilcore/records');
  const keys = await import('../../veilcore/record-keys');
  const backup = await import('../../veilcore/backup');
  const binding = await import('../../veilcore/key-binding');
  await records.hydrate(); // the app's frame does this on arrival (startRecordSync)
  return { bi, records, keys, backup, binding };
};

describe('importing a 25-row accession log, end to end', () => {
  it('all 25 sealed once, through a closed tab and a lost answer; the backup holds them; the results file is right', async () => {
    // ── Tab 1: pick the file, check the columns and rows, start sealing ──
    let tab = await openTab();
    const sheet = await tab.bi.readSheet(fileOf(CSV, 'accessions.csv'));
    expect(sheet).toMatchObject({ kind: 'csv', delimiter: ';', headers: HEADERS });
    expect(sheet.rows).toHaveLength(25);
    const mapping = tab.bi.guessMapping(sheet.headers);
    expect(mapping.columns).toEqual({
      refId: 0,
      strainName: 1,
      taxon: 2,
      parents: 3,
      parents2: null,
      bredBy: 4,
      dateCreated: 5,
      notes: 6,
    });
    const checked = tab.bi.checkRows(sheet, mapping, { existing: tab.records.allRecords() });
    expect(checked).toMatchObject({ ready: 25, already: 0, problems: 0, blocked: undefined });
    const first = checked.rows[2].fields;
    expect(first).toMatchObject({ strainName: 'Café; "Noir"', refId: 'TC-0003', dateCreated: '2024-03-04' });
    expect(checked.rows[3].fields.dateCreated).toBe('2022-01-01'); // an Excel serial in a CSV
    expect(checked.rows[4].fields.parents).toEqual([{ name: 'Line 4' }, { name: 'Line 3' }]);

    let job: import('../../veilcore/bulk-import').Job = {
      version: 1,
      fileName: 'accessions.csv',
      startedAt: Date.now(),
      headers: sheet.headers,
      delimiter: sheet.delimiter,
      rows: checked.rows,
      phase: 'sealing',
      outcomes: {},
    };
    expect(tab.bi.saveJob(job)).toBe(true);

    // The first batch lands; the second is stored but its answer is lost.
    let batches = 0;
    const r1 = await tab.bi.sealRows(job.rows, {
      batchSize: 10,
      gapMs: 0,
      commit: async (b) => {
        batches++;
        if (batches === 2) loseNextPutAnswer = true;
        return tab.bi.registryCommit(b);
      },
    });
    expect(r1.stopped).toMatch(/^Couldn't reach VeilCore's server\. The last 10 rows were kept here/);
    job = { ...job, outcomes: { ...job.outcomes, ...r1.outcomes } };
    tab.bi.saveJob(job);
    expect(tab.bi.jobSummary(job)).toMatchObject({ sealed: 10, waiting: 15 });
    const lostAt = puts.length - 1;
    const lostBatch = puts[lostAt].slice(0, 10);

    // ── Tab 2: the page is opened again; it picks the job up and carries on ──
    tab = await openTab();
    const resumed = tab.bi.loadJob();
    expect(resumed?.phase).toBe('sealing');
    const r2 = await tab.bi.sealRows(resumed!.rows, { batchSize: 10, gapMs: 0 });
    expect(r2.stopped).toBeUndefined();
    job = { ...resumed!, outcomes: { ...resumed!.outcomes, ...r2.outcomes }, phase: 'sealed' };
    tab.bi.saveJob(job);
    expect(tab.bi.jobSummary(job)).toEqual({ sealed: 25, before: 0, notSealed: 0, waiting: 0 });
    // The batch whose answer was lost went again as the same records.
    expect(puts.slice(lostAt + 1).some((p) => p.slice(0, 10).join() === lostBatch.join())).toBe(true);

    // Exactly 25 records at the registry, one per row, and the app shows them.
    expect(held.size).toBe(25);
    const mine = tab.records.allRecords();
    expect(mine).toHaveLength(25);
    expect(new Set(mine.map((r) => tab.bi.recordRowHash(r))).size).toBe(25);
    const ids = tab.bi.jobRecordIds(job);
    expect(new Set(ids)).toEqual(new Set(mine.map((r) => r.id)));
    for (const r of mine) {
      expect(await tab.records.checkIntegrity(r)).toBe('match');
      const k = tab.keys.keysFor(r.id);
      expect(k).toBeDefined();
      expect(r.keyBinding).toBe(tab.binding.bindingForSecret(k!.recordSecret).keyBinding);
    }
    expect(mine.find((r) => r.refId === 'TC-0007')?.bredBy).toBe('');
    expect(mine.find((r) => r.refId === 'TC-0009')?.notes).toBe('two\nlines');

    // ── Backup: the one-file backup holds every new record's keys, and its check passes ──
    const contents = tab.backup.backupContents();
    const inBackup = new Set(contents.records.map((e) => e.recordId));
    for (const id of ids) expect(inBackup.has(id)).toBe(true);
    const saved = { text: () => Promise.resolve(JSON.stringify(contents)) } as unknown as File;
    expect(await tab.backup.checkBackup(saved)).toMatchObject({ ok: true, records: 25 });
    expect(tab.keys.keysWithoutBackup()).toHaveLength(0);

    // ── The results file: each original row, its record, fingerprint and check link ──
    const csv = tab.bi.resultsCsv(job, ORIGIN);
    const back = tab.bi.parseCsv(csv).rows.filter((r) => r.some(Boolean));
    expect(back).toHaveLength(26);
    expect(back[0]).toEqual([...HEADERS, 'VeilCore record ID', 'Fingerprint', 'Check link', 'Result', 'DNA report']);
    const byRef = new Map(mine.map((r) => [r.refId, r]));
    back.slice(1).forEach((row, i) => {
      expect(row.slice(0, 7)).toEqual(rowsIn[i]);
      const r = byRef.get(rowsIn[i][0]);
      expect(r).toBeDefined();
      expect(row.slice(7)).toEqual([
        r!.id,
        r!.recordFingerprint,
        `${ORIGIN}/verify/${r!.id}?fp=${r!.recordFingerprint}`,
        'Sealed',
        tab.bi.NO_DNA_REPORT,
      ]);
    });

    // ── The same file again: everything is sealed already, nothing new is made ──
    const again = tab.bi.checkRows(await tab.bi.readSheet(fileOf(CSV, 'accessions.csv')), mapping, {
      existing: tab.records.allRecords(),
    });
    expect(again).toMatchObject({ ready: 0, already: 25, problems: 0 });
  });
});
