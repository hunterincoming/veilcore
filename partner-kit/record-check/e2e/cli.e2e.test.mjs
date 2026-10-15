// The `partner-kit check` command (dist/cli.js, as npx would run it) against a local
// registry seeded with test records, and the date stamp look-up through the installed
// @veilcore/contracts against a stand-in indexer that has no such transaction.
// Run: node --test e2e/cli.e2e.test.mjs (after npm run build). REGISTRY_DIR names a
// veilcore-api checkout. SPDX-License-Identifier: Apache-2.0
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { startRegistry } from './local-registry.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.join(here, '..', 'dist', 'cli.js');
const REGISTRY_DIR = process.env.REGISTRY_DIR ?? path.resolve(here, '../../../../backups');
const SCRATCH = process.env.E2E_SCRATCH ?? path.resolve(here, '../../../../../partner');
const PORT = Number(process.env.REGISTRY_PORT ?? 8920);

/** Run the CLI; resolves with its exit code and output (never rejects). */
const cli = (...args) =>
  new Promise((resolve) => {
    execFile(process.execPath, [CLI, ...args], { timeout: 120_000 }, (err, stdout, stderr) =>
      resolve({ code: err ? (typeof err.code === 'number' ? err.code : 99) : 0, stdout, stderr }),
    );
  });

let reg;
let work;
let indexer;
const indexerAsked = [];

before(async () => {
  reg = await startRegistry({ registryDir: REGISTRY_DIR, port: PORT, dir: SCRATCH });
  work = mkdtempSync(path.join(SCRATCH, 'cli-'));
  // A stand-in Midnight indexer: it knows no transactions.
  indexer = http.createServer((req, res) => {
    let body = '';
    req.on('data', (d) => (body += d));
    req.on('end', () => {
      indexerAsked.push(body);
      res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ data: { transactions: [] } }));
    });
  });
  await new Promise((r) => indexer.listen(PORT + 2, '127.0.0.1', r));
});

after(async () => {
  reg?.stop();
  if (work) rmSync(work, { recursive: true, force: true });
  await new Promise((r) => indexer?.close(r));
});

describe('partner-kit check, against a local registry', () => {
  it('a matching link with the key and the sealed fields: exit 0, the JSON answer', async () => {
    const fields = path.join(work, 'sealed-fields.json');
    writeFileSync(fields, JSON.stringify(reg.fields.bound));
    const r = await cli('check', reg.links.boundWithKey, '--registry', reg.base, '--fields', fields);
    assert.equal(r.code, 0, r.stderr);
    const c = JSON.parse(r.stdout);
    assert.equal(c.format, 'veilcore-record-check/v1');
    assert.equal(c.recordExists, true);
    assert.equal(c.fingerprintMatches, true);
    assert.equal(c.disclosedFieldsMatch, true);
    assert.equal(c.fingerprint, reg.records.bound.recordFingerprint);
    assert.deepEqual(
      {
        status: c.dated.status,
        checkedOnChain: c.dated.checkedOnChain,
        network: c.dated.network,
        batch: c.dated.batch,
        txId: c.dated.txId,
        blockTime: c.dated.blockTime,
      },
      {
        status: 'reported',
        checkedOnChain: false,
        network: 'preprod',
        batch: reg.batchId,
        txId: reg.txId,
        blockTime: null,
      },
    );
    assert.equal(c.keyBound.keyInLink, 'matches');
    assert.equal(c.keyBound.recordNamesKey, true);
    assert.deepEqual(
      c.labReceipts.map((x) => [x.kind, x.counts, x.signer.nameCheck, x.matchesSavedReport ?? null]).sort(),
      [
        ['lab-receipt', true, 'checked', null],
        ['lab-report', true, 'checked', true],
      ],
    );
    assert.ok(c.whatThisDoesNotShow.length >= 6);
  });

  it('a withdrawn receipt from a key nobody checked; an undated record', async () => {
    const older = JSON.parse((await cli('check', reg.links.older, '--registry', reg.base)).stdout);
    assert.equal(older.labReceipts.length, 1);
    assert.equal(older.labReceipts[0].withdrawn, true);
    assert.equal(older.labReceipts[0].counts, false);
    assert.equal(older.labReceipts[0].signer.nameCheck, 'not-checked');
    const undated = JSON.parse((await cli('check', reg.links.undated, '--registry', reg.base)).stdout);
    assert.equal(undated.dated.status, 'not-in-a-batch');
  });

  it('plain words with --text', async () => {
    const r = await cli('check', reg.links.bound, '--registry', reg.base, '--text');
    assert.equal(r.code, 0);
    assert.match(r.stdout, /^Record found, and the link’s fingerprint matches the registry’s\./);
    assert.match(r.stdout, /VeilCore’s operator matched this name to cannabis\.example\.gov \(license TL-1\)/);
    assert.match(r.stdout, /What this does not show:/);
  });

  it('an edited link, a wrong key, other sealed fields, a missing record: exit 1', async () => {
    const t = await cli('check', reg.links.tampered, '--registry', reg.base);
    assert.equal(t.code, 1);
    assert.equal(JSON.parse(t.stdout).fingerprintMatches, false);
    const k = await cli(
      'check',
      reg.links.boundWithKey.replace(/chain=[0-9a-f]{64}/, `chain=${'cd'.repeat(32)}`),
      '--registry',
      reg.base,
    );
    assert.equal(k.code, 1);
    assert.equal(JSON.parse(k.stdout).keyBound.keyInLink, 'does-not-match');
    const fields = path.join(work, 'other-fields.json');
    writeFileSync(fields, JSON.stringify({ ...reg.fields.bound, notes: 'changed' }));
    const f = await cli('check', reg.links.bound, '--registry', reg.base, '--fields', fields);
    assert.equal(f.code, 1);
    assert.equal(JSON.parse(f.stdout).disclosedFieldsMatch, false);
    const m = await cli('check', reg.links.missing, '--registry', reg.base);
    assert.equal(m.code, 1);
    assert.equal(JSON.parse(m.stdout).recordExists, false);
  });

  it('nothing checked: a bad link or no registry: exit 2', async () => {
    const bad = await cli('check', 'https://veilcore.org/', '--registry', reg.base);
    assert.equal(bad.code, 2);
    assert.match(bad.stderr, /does not point at a record/);
    const down = await cli('check', reg.links.bound, '--registry', `http://127.0.0.1:${PORT + 3}`, '--timeout', '5');
    assert.equal(down.code, 2);
    assert.match(down.stderr, /registry did not answer/);
  });

  it('--indexer: the date stamp is looked up through @veilcore/contracts, and not confirmed here', async () => {
    const r = await cli(
      'check',
      reg.links.bound,
      '--registry',
      reg.base,
      '--indexer',
      `http://127.0.0.1:${PORT + 2}/api/v4/graphql`,
    );
    const c = JSON.parse(r.stdout);
    assert.equal(r.code, 1, r.stderr);
    assert.equal(c.dated.status, 'not-confirmed');
    assert.equal(c.dated.checkedOnChain, false);
    assert.match(c.dated.reason, /No such transaction/);
    assert.ok(
      indexerAsked.some((b) => b.includes(reg.txId)),
      'the indexer was asked for the registry’s transaction',
    );
  });
});
