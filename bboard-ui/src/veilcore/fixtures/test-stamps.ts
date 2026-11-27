// For tests: the two non-Midnight clocks' files, made here with no network.
//   - testTsa(): a Time Stamping Authority made with openssl (as tsa-bundle.test.ts and the
//     registry's own test do): tokens on 32 raw bytes, exactly as the registry asks for a batch
//     root or a proof code;
//   - otsFile(): an OpenTimestamps file that starts from SHA-256 of a root, holding a calendar's
//     promise (pending) or naming a Bitcoin block, in the format verify.html reads
//     (evidence-page/verify-core.js parseOts; the e2e evidence-bundle test builds the same).
// SPDX-License-Identifier: Apache-2.0

import { createHash, randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

export type TestTsa = {
  /** A token (base64 DER) on these 32 bytes, given as hex. */
  tokenFor: (hex: string) => string;
  /** The root certificate, PEM, for `openssl ts -verify -CAfile`. */
  readonly caFile: string;
  readonly dir: string;
  done: () => void;
};

export const testTsa = (name = 'Test TSA'): TestTsa => {
  const dir = mkdtempSync(join(tmpdir(), 'veilcore-test-tsa-'));
  const ssl = (...a: string[]) => execFileSync('openssl', a, { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
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
  ssl('req', '-newkey', 'rsa:2048', '-nodes', '-keyout', 'tsa.key', '-out', 'tsa.csr', '-subj', `/CN=${name}`);
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
  return {
    dir,
    caFile: join(dir, 'ca.pem'),
    tokenFor: (hex: string) => {
      writeFileSync(join(dir, 'data.bin'), Buffer.from(hex, 'hex'));
      ssl('ts', '-query', '-data', 'data.bin', '-sha256', '-cert', '-out', 'q.tsq');
      ssl('ts', '-reply', '-config', 'tsa.cnf', '-queryfile', 'q.tsq', '-token_out', '-out', 'tok.der');
      return readFileSync(join(dir, 'tok.der')).toString('base64');
    },
    done: () => rmSync(dir, { recursive: true, force: true }),
  };
};

const leb = (n: number): Buffer => {
  const out: number[] = [];
  do {
    let b = n & 0x7f;
    n = Math.floor(n / 128);
    if (n) b |= 0x80;
    out.push(b);
  } while (n);
  return Buffer.from(out);
};
const varbytes = (b: Buffer): Buffer => Buffer.concat([leb(b.length), b]);

const MAGIC = Buffer.concat([
  Buffer.from([0]),
  Buffer.from('OpenTimestamps'),
  Buffer.from([0, 0]),
  Buffer.from('Proof'),
  Buffer.from([0, 0xbf, 0x89, 0xe2, 0xe8, 0x84, 0xe8, 0x92, 0x94]),
]);

/** An OpenTimestamps file for the root (hex): a calendar's promise, or naming Bitcoin block `bitcoin`. */
export const otsFile = (rootHex: string, opts: { readonly bitcoin?: number } = {}): Buffer => {
  const digest = createHash('sha256').update(Buffer.from(rootHex, 'hex')).digest();
  const x = randomBytes(16);
  const attestation =
    opts.bitcoin !== undefined
      ? Buffer.concat([Buffer.from('0588960d73d71901', 'hex'), varbytes(leb(opts.bitcoin))])
      : Buffer.concat([
          Buffer.from('83dfe30d2ef90c8e', 'hex'),
          varbytes(varbytes(Buffer.from('https://calendar.test.invalid'))),
        ]);
  // append x, sha256, then the attestation.
  return Buffer.concat([
    MAGIC,
    Buffer.from([1, 0x08]),
    digest,
    Buffer.from([0xf0]),
    varbytes(x),
    Buffer.from([0x08, 0x00]),
    attestation,
  ]);
};
