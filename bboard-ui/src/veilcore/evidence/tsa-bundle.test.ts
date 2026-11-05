// The batch root's RFC 3161 token in the evidence bundle: kept only when it checks against the
// root here, its time read from the token, and the file and the openssl step in the bundle.
// A local TSA made with openssl (as the registry's test does); no network.
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { strFromU8 } from 'fflate';
import type { InclusionProof } from 'veilcore-records';
import { buildEvidence, bundleFiles, readmeText, reconcile } from './bundle';
import { practiceBatch, practiceRecord } from './test-records';

let dir = '';
const ssl = (...a: string[]) => execFileSync('openssl', a, { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
const tokenFor = (rootHex: string): string => {
  writeFileSync(join(dir, 'root.bin'), Buffer.from(rootHex, 'hex'));
  ssl('ts', '-query', '-data', 'root.bin', '-sha256', '-cert', '-out', 'q.tsq');
  ssl('ts', '-reply', '-config', 'tsa.cnf', '-queryfile', 'q.tsq', '-token_out', '-out', 'tok.der');
  return readFileSync(join(dir, 'tok.der')).toString('base64');
};

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'tsa-bundle-'));
  writeFileSync(join(dir, 'ext.cnf'), 'extendedKeyUsage = critical,timeStamping\nbasicConstraints = CA:FALSE\n');
  ssl(
    'req',
    '-x509',
    '-newkey',
    'rsa:2048',
    '-nodes',
    '-keyout',
    'ca.key',
    '-out',
    'ca.pem',
    '-days',
    '2',
    '-subj',
    '/CN=Test Root',
  );
  ssl('req', '-newkey', 'rsa:2048', '-nodes', '-keyout', 'tsa.key', '-out', 'tsa.csr', '-subj', '/CN=Test TSA');
  ssl(
    'x509',
    '-req',
    '-in',
    'tsa.csr',
    '-CA',
    'ca.pem',
    '-CAkey',
    'ca.key',
    '-CAcreateserial',
    '-out',
    'tsa.pem',
    '-days',
    '2',
    '-extfile',
    'ext.cnf',
  );
  writeFileSync(
    join(dir, 'tsa.cnf'),
    `[ tsa ]\ndefault_tsa = t\n[ t ]\nserial = ${dir}/serial\nsigner_cert = ${dir}/tsa.pem\nsigner_key = ${dir}/tsa.key\nsigner_digest = sha256\ndefault_policy = 1.2.3.4.1\ndigests = sha256\ness_cert_id_alg = sha256\n`,
  );
  writeFileSync(join(dir, 'serial'), '01\n');
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const scenario = async (token: string | null) => {
  const record = await practiceRecord(0);
  const batch = await practiceBatch([record, await practiceRecord(1)]);
  const proof = { ...batch.proofs[record.recordFingerprint] };
  const g = await reconcile(record.recordFingerprint, {
    source: 'evidence-route',
    proof,
    batch: {
      batchId: batch.batchId,
      root: batch.root,
      sealedAt: '2026-11-05T12:00:00.000Z',
      anchor: null,
      opentimestamps: { available: false, status: 'none' },
      rfc3161: token
        ? {
            kind: 'rfc3161',
            token,
            tsa: 'https://tsa.example/',
            qualified: { scheme: 'eIDAS' },
            genTime: '1999-01-01T00:00:00Z',
          }
        : { available: false },
    },
  });
  return { record, batch, g };
};

describe('RFC 3161 token in the bundle', () => {
  it('a token over this root: kept, with the time the token states, the file and the steps', async () => {
    const first = await scenario(null);
    const { record, g } = await scenario(tokenFor(first.batch.root));
    expect(g.tst).not.toBeNull();
    expect(g.batch?.rfc3161.available).toBe(true);
    expect(g.batch?.rfc3161.genTime).not.toBe('1999-01-01T00:00:00Z'); // read from the token, not the registry
    expect(g.batch?.rfc3161.qualified).toEqual({ scheme: 'eIDAS' });
    const ev = await buildEvidence(record, g, { includeKey: false, now: new Date('2026-11-05T13:00:00Z') });
    const readme = readmeText(ev, []).replace(/\s+/g, ' ');
    expect(readme).toContain('THE DATES');
    expect(readme).toContain('openssl ts -verify -data root.bin -in root.tst -token_in');
    expect(readme).toContain('qualified under eIDAS');
    const files = await bundleFiles(ev, g, { includeKey: false });
    const tst = Object.entries(files).find(([k]) => k.endsWith('proof/root.tst'));
    expect(tst).toBeTruthy();
    writeFileSync(join(dir, 'b.tst'), tst![1]);
    writeFileSync(join(dir, 'b.bin'), Buffer.from(g.batch!.root, 'hex'));
    const out = ssl(
      'ts',
      '-verify',
      '-data',
      'b.bin',
      '-in',
      'b.tst',
      '-token_in',
      '-CAfile',
      'ca.pem',
      '-untrusted',
      'tsa.pem',
    ).toString();
    expect(out).toContain('Verification: OK');
    const anchors = Object.entries(files).find(([k]) => k.endsWith('proof/anchors.json'));
    expect((JSON.parse(strFromU8(anchors![1])) as { rfc3161: { available: boolean } }).rfc3161.available).toBe(true);
  });

  it('a token over another root is left out', async () => {
    const { g } = await scenario(tokenFor('ee'.repeat(32)));
    expect(g.tst).toBeNull();
    expect(g.batch?.rfc3161.available).toBe(false);
  });
});
