// The contract v2 deploy command end to end, against Midnight's real ledger code (ledger-v9)
// holding the contracts in a local LedgerState. The wallet is replaced by providers that apply
// each transaction to that ledger through midnight-js's own submitTx, so the deploy, the
// temporary key's signatures and the counters are the ledger's own checks. No node, indexer,
// proof server, wallet or real key is involved; the "age" key file is held in memory.
// SPDX-License-Identifier: Apache-2.0
/* eslint-disable @typescript-eslint/require-await -- the fakes stand in for async interfaces */
import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import pino from 'pino';
import * as L from 'ledger-v9-committee';
import {
  LedgerTransaction,
  SerializedContractState,
  createMidnightProviderFromHandlers,
  createProofProviderFromHandlers,
  createWalletProviderFromHandlers,
  type UnprovenTx,
} from '@midnight-ntwrk/midnight-js-types';
import { type Prompt } from '../prompt';
import { type Deps, type KeyStore, main, parseOptions } from './deploy-v2';
import { encryptWithPassphrase, passphraseProblem } from '../age-key';
import { createDecipheriv, createHmac, hkdfSync, scryptSync } from 'node:crypto';
import { readSession } from '../../../scripts/v2/session.mjs';

const NET = 'undeployed';
const V4 = new Uint8Array(
  readFileSync(path.resolve(import.meta.dirname, '../../../scripts/committee/fixtures/zkir-v3-example.verifier')),
);
const sha = (b: Uint8Array): string => createHash('sha256').update(b).digest('hex');
const MAIN = Array.from({ length: 24 }, (_, i) => `circuit${i}`);
const CLAIMS = Array.from({ length: 5 }, (_, i) => `claim${i}`);

const dir = (): string => mkdtempSync(path.join(tmpdir(), 'deploy-v2-'));

const table = (d: string): string => {
  const f = path.join(d, 'fingerprints-v2.md');
  writeFileSync(
    f,
    [
      'Commit abcdef0, compiler 0.36.1.',
      '',
      '| File | SHA-256 |',
      '|---|---|',
      ...MAIN.map((n) => `| \`veilcore/keys/${n}.verifier\` | \`${sha(V4)}\` |`),
      ...CLAIMS.map((n) => `| \`veilcore-claims/keys/${n}.verifier\` | \`${sha(V4)}\` |`),
      '',
    ].join('\n'),
  );
  return f;
};

/** A local ledger standing in for the network, the wallet and the indexer. */
const chain = () => {
  let state = L.LedgerState.blank(NET);
  const strict = new L.WellFormedStrictness();
  strict.enforceBalancing = false;
  strict.verifyContractProofs = false;
  strict.verifyNativeProofs = false;
  type Tx9 = L.Transaction<L.SignatureEnabled, L.PreProof, L.PreBinding>;
  const apply = (tx: Tx9): void => {
    const now = BigInt(Math.floor(Date.now() / 1000));
    const v = tx.eraseProofs().wellFormed(state, strict, new Date());
    const [next, result] = state.apply(
      v,
      new L.TransactionContext(state, {
        secondsSinceEpoch: now,
        secondsSinceEpochErr: 30,
        parentBlockHash: '00'.repeat(32),
        lastBlockTime: now - 6n,
      }),
    );
    if (result.type !== 'success') throw new Error(`refused by the ledger: ${result.error ?? result.type}`);
    state = next;
  };
  const read9 = (tx: { deserialize(d: never): unknown }): Tx9 => tx.deserialize({ v9: L.Transaction } as never) as Tx9;
  const has = (a: string): boolean => {
    try {
      return state.index(a) !== undefined;
    } catch {
      return false;
    }
  };
  let sent = 0;
  let opened = 0;
  const finalized = new Map<string, Uint8Array>();
  const reader = {
    queryContractState: async (a: string) =>
      has(a)
        ? {
            protocolVersion: 2_001_000,
            contractState: SerializedContractState.fromBytes('v9', state.index(a)!.serialize()),
          }
        : null,
    queryLatestProtocolVersion: async () => 2_001_000,
    watchForTxData: async (txId: string) => ({
      era: 'v9',
      txId,
      txHash: txId.padStart(64, '0'),
      blockHeight: 7 + sent,
      status: 'SucceedEntirely',
      tx: LedgerTransaction.fromBytes('v9', 'Finalized', finalized.get(txId)!),
    }),
  };
  const placeholderProver = {
    check: async () => [],
    prove: async () => new L.Proof('0100').serialize(),
    lookupKey: async () => undefined,
  };
  const openSender: NonNullable<Deps['openSender']> = async () => {
    opened++;
    return {
      providers: {
        publicDataProvider: reader,
        proofProvider: createProofProviderFromHandlers({
          v8: undefined,
          v9: (tx: UnprovenTx) => read9(tx).prove(placeholderProver, L.CostModel.initialCostModel()),
        }),
        walletProvider: createWalletProviderFromHandlers({
          v8: undefined,
          v9: async (tx: { deserialize(d: never): unknown }) => read9(tx).bind(),
          getCoinPublicKey: () => '00'.repeat(32),
          getEncryptionPublicKey: () => '00'.repeat(32),
        }),
        midnightProvider: createMidnightProviderFromHandlers({
          v8: undefined,
          v9: async (tx: { deserialize(d: never): unknown }) => {
            const t = read9(tx);
            apply(t);
            sent++;
            const id = `${sent}`.padStart(8, '0');
            finalized.set(id, t.serialize());
            return id;
          },
        }),
        config: { networkId: NET, ttlSeconds: 3600 },
      },
      stop: async () => undefined,
    } as never;
  };
  return { openSender, sent: () => sent, opened: () => opened, state: () => state, has };
};

/** An in-memory stand-in for the age-encrypted key file. */
const PASS = 'correct horse battery';
const memoryKeys = () => {
  const files = new Map<string, string>();
  const passphrases = new Map<string, string>();
  const store: KeyStore = {
    create: (f, k, p) => {
      if (files.has(f)) throw new Error('exists');
      files.set(f, k);
      passphrases.set(f, p);
    },
    open: (f) => {
      const k = files.get(f);
      if (k === undefined) throw new Error('no such key file');
      return k;
    },
  };
  return { store, files, passphrases };
};

const scripted = (answers: string[], hidden: string[] = [PASS, PASS]): Prompt =>
  ({
    rli: {
      question: async () => answers.shift() ?? '',
      on: () => undefined,
      off: () => undefined,
      close: () => undefined,
    },
    askHidden: async () => hidden.shift() ?? '',
    askHiddenLines: async () => [],
    asking: () => false,
  }) as unknown as Prompt;

const capture = () => {
  const lines: string[] = [];
  const logger = pino({ level: 'info' }, { write: (s: string) => lines.push((JSON.parse(s) as { msg: string }).msg) });
  return { logger, text: () => lines.join('\n') };
};

const deps = (
  c: ReturnType<typeof chain>,
  keys: ReturnType<typeof memoryKeys>,
  out: ReturnType<typeof capture>,
  answers: string[],
  extra: Partial<Deps> = {},
  hidden?: string[],
): Deps => ({
  logger: out.logger,
  prompt: scripted(answers, hidden),
  txActions: async () => [],
  keyStore: keys.store,
  stack: () => [],
  openSender: c.openSender,
  latestTx: async () => ({ txHash: '22'.repeat(32) }),
  constructorBytes: async () => new L.ContractState().serialize(),
  localKey: () => V4,
  wait: async () => undefined,
  commit: 'test',
  ...extra,
});

describe('npm run deploy-v2', () => {
  it('the command line: mainnet needs --send-on-mainnet; the key file is always named', () => {
    expect(() => parseOptions(['mainnet', '--key-file', 'k.age'])).toThrow(/needs --send-on-mainnet/);
    expect(() => parseOptions(['preprod'])).toThrow(/--key-file/);
    expect(() => parseOptions(['preprod', '--key-file', 'k', '--send-on-mainnet'])).toThrow(/mainnet only/);
    expect(() => parseOptions(['preprod', '--key-file', 'k', '--keys-per-update', '9'])).toThrow(/1 to 8/);
    expect(parseOptions(['mainnet', '--key-file', 'k', '--send-on-mainnet']).sendOnMainnet).toBe(true);
  });

  it('deploys both contracts with the temporary key alone and every key in V4; prints the addresses; the key appears nowhere', async () => {
    const c = chain();
    const keys = memoryKeys();
    const out = capture();
    const d = dir();
    const record = path.join(d, 'record.json');
    const code = await main(
      [NET, '--key-file', path.join(d, 'temp.age'), '--out', record, '--fingerprints', table(d)],
      deps(c, keys, out, ['DEPLOY V2']),
    );
    expect(code, out.text()).toBe(0);
    const r = readSession(record);
    const key = keys.files.get(path.join(d, 'temp.age'))!;
    expect(r.temporaryKey.publicKey).toBe(L.signatureVerifyingKey({ tag: 'schnorr', value: key }).value);
    for (const [name, circuits] of [
      ['veilcore', MAIN],
      ['veilcore-claims', CLAIMS],
    ] as const) {
      const a = r.contracts[name].address!;
      const s = c.state().index(a)!;
      expect([...s.operations()].map(String).sort()).toEqual([...circuits].sort());
      expect(s.maintenanceAuthority.committee.length).toBe(1);
      expect(s.maintenanceAuthority.counter).toBe(BigInt(circuits.length));
      expect(out.text()).toContain(`${name} (v2) address: ${a}`);
    }
    expect(c.sent()).toBe(2 + 24 + 5);
    expect(out.text()).toMatch(/make no call to either contract until verify:deployment passes and v2 is pinned/);
    expect(out.text()).toMatch(/never by the contractVersion or predecessor fields/);
    expect(out.text()).not.toContain(key);
    expect(readFileSync(record, 'utf8')).not.toContain(key);
  });

  it('refuses before a key is made or a wallet opened: the wrong client stack, no fingerprints-v2.md', async () => {
    for (const [extra, args, why] of [
      [{ stack: () => ['@midnightntwrk/ledger-v9 is 1.0.0; contract v2 needs 1.0.2.'] }, [], /needs 1\.0\.2/],
      [{}, ['--fingerprints', '/nonexistent/fingerprints-v2.md'], /is not in this checkout/],
    ] as const) {
      const c = chain();
      const keys = memoryKeys();
      const out = capture();
      const d = dir();
      const code = await main(
        [
          NET,
          '--key-file',
          path.join(d, 'k.age'),
          '--out',
          path.join(d, 'r.json'),
          ...(args.length > 0 ? args : ['--fingerprints', table(d)]),
        ],
        deps(c, keys, out, ['DEPLOY V2'], extra),
      );
      expect(code).toBe(1);
      expect(out.text()).toMatch(why);
      expect(keys.files.size).toBe(0);
      expect(c.opened()).toBe(0);
      expect(existsSync(path.join(d, 'r.json'))).toBe(false);
    }
  });

  it('nothing is sent unless the word is typed; --resume finishes with the same key file and refuses another', async () => {
    const c = chain();
    const keys = memoryKeys();
    const d = dir();
    const t = table(d);
    const record = path.join(d, 'record.json');
    const no = capture();
    expect(
      await main(
        [NET, '--key-file', path.join(d, 'k.age'), '--out', record, '--fingerprints', t],
        deps(c, keys, no, ['deploy']),
      ),
    ).toBe(1);
    expect(c.opened()).toBe(0);
    expect(c.sent()).toBe(0);
    // The record and key file exist: finish it.
    const other = memoryKeys();
    other.store.create(path.join(d, 'k.age'), L.sampleSigningKey().value, PASS);
    const wrong = capture();
    expect(
      await main(
        [NET, '--key-file', path.join(d, 'k.age'), '--resume', record, '--fingerprints', t],
        deps(c, other, wrong, ['DEPLOY V2']),
      ),
    ).toBe(1);
    expect(wrong.text()).toMatch(/does not hold this record's temporary key/);
    const yes = capture();
    expect(
      await main(
        [NET, '--key-file', path.join(d, 'k.age'), '--resume', record, '--fingerprints', t],
        deps(c, keys, yes, ['DEPLOY V2']),
      ),
    ).toBe(0);
    expect(c.sent()).toBe(31);
    expect(readSession(record).contracts['veilcore-claims'].updates.length).toBe(5);
  });

  it('the key file passphrase: empty or short is refused and asked again; it is never logged', async () => {
    const c = chain();
    const keys = memoryKeys();
    const out = capture();
    const d = dir();
    const code = await main(
      [NET, '--key-file', path.join(d, 'k.age'), '--out', path.join(d, 'r.json'), '--fingerprints', table(d)],
      deps(c, keys, out, ['no'], {}, ['', 'short', PASS, 'mismatch', PASS, PASS]),
    );
    expect(code).toBe(1); // stopped at the typed word, after the key file was made
    expect(out.text()).toMatch(/The passphrase is empty/);
    expect(out.text()).toMatch(/The passphrase is 5 characters; use at least 12/);
    expect(out.text()).toMatch(/The two did not match/);
    expect(keys.passphrases.get(path.join(d, 'k.age'))).toBe(PASS);
    expect(out.text()).not.toContain(PASS);
    // Five empty answers: nothing is written.
    const none = memoryKeys();
    const out2 = capture();
    expect(
      await main(
        [NET, '--key-file', path.join(d, 'k2.age'), '--out', path.join(d, 'r2.json'), '--fingerprints', table(d)],
        deps(c, none, out2, ['DEPLOY V2'], {}, []),
      ),
    ).toBe(1);
    expect(none.files.size).toBe(0);
    expect(c.opened()).toBe(0);
  });
});

describe('the age key file (age-encryption.org/v1, scrypt)', () => {
  /** A reader written from the age spec, independent of the writer (real age 1.1.1 also read one: PR #190). */
  const decrypt = (file: Buffer, passphrase: string): Buffer => {
    const text = file.toString('latin1');
    const end = text.indexOf('\n---');
    const header = text.slice(0, end + 4);
    const macLine = text.slice(end + 1, text.indexOf('\n', end + 1));
    const lines = header.split('\n');
    expect(lines[0]).toBe('age-encryption.org/v1');
    const [, kind, saltB64, logN] = lines[1].split(' ');
    expect(kind).toBe('scrypt');
    const salt = Buffer.from(saltB64, 'base64');
    const wrapKey = scryptSync(passphrase, Buffer.concat([Buffer.from('age-encryption.org/v1/scrypt'), salt]), 32, {
      N: 2 ** Number(logN),
      r: 8,
      p: 1,
      maxmem: 512 * 1024 * 1024,
    });
    const open = (key: Buffer, nonce: Buffer, ct: Buffer): Buffer => {
      const dch = createDecipheriv('chacha20-poly1305', key, nonce, { authTagLength: 16 });
      dch.setAuthTag(ct.subarray(ct.length - 16));
      return Buffer.concat([dch.update(ct.subarray(0, ct.length - 16)), dch.final()]);
    };
    const fileKey = open(wrapKey, Buffer.alloc(12), Buffer.from(lines[2], 'base64'));
    const mac = createHmac('sha256', Buffer.from(hkdfSync('sha256', fileKey, Buffer.alloc(0), 'header', 32)))
      .update(header)
      .digest('base64')
      .replace(/=+$/, '');
    expect(macLine).toBe(`--- ${mac}`);
    const body = file.subarray(Buffer.byteLength(text.slice(0, text.indexOf('\n', end + 1) + 1), 'latin1'));
    const nonce = body.subarray(0, 16);
    const last = Buffer.alloc(12);
    last[11] = 1;
    return open(Buffer.from(hkdfSync('sha256', fileKey, nonce, 'payload', 32)), last, body.subarray(16));
  };

  it('writes a file the spec reads back with the passphrase, and only with it', () => {
    const key = `${'ab'.repeat(32)}\n`;
    const f = encryptWithPassphrase(Buffer.from(key), PASS);
    expect(f.toString('latin1')).toMatch(/^age-encryption\.org\/v1\n-> scrypt [A-Za-z0-9+/]{22} 18\n/);
    expect(f.toString('latin1')).not.toContain('ab'.repeat(32));
    expect(decrypt(f, PASS).toString()).toBe(key);
    expect(() => decrypt(f, 'another passphrase')).toThrow();
    expect(passphraseProblem('')).toMatch(/empty/);
    expect(passphraseProblem(PASS)).toBeNull();
  });
});
