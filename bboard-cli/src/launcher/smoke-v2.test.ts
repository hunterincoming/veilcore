// The contract v2 smoke run end to end, against Midnight's real ledger code (ledger-v9) holding the
// contracts in a local LedgerState, as deploy-v2.test.ts does: v2 is deployed there by the deploy
// command itself (one stand-in verifier key for every circuit), then the smoke command calls every
// circuit through midnight-js's own findDeployedContract and callTx, and each transaction is
// applied by the ledger. No node, indexer, proof server, wallet or real key is involved; proofs
// are placeholders and the ledger is told not to verify them.
// SPDX-License-Identifier: Apache-2.0
/* eslint-disable @typescript-eslint/require-await -- the fakes stand in for async interfaces */
import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import pino from 'pino';
import * as L from 'ledger-v9-committee';
import {
  LedgerTransaction,
  SerializedContractState,
  SerializedLedgerParameters,
  SerializedZswapChainState,
  createMidnightProviderFromHandlers,
  createProofProviderFromHandlers,
  createWalletProviderFromHandlers,
  type UnprovenTx,
} from '@midnight-ntwrk/midnight-js-types';
import { type Prompt } from '../prompt';
import { main as deployV2, type KeyStore } from './deploy-v2';
import {
  type Deps,
  type SmokeModules,
  MAINNET_REFUSAL,
  keyProblems,
  loadSmoke,
  main,
  mainnetPinProblems,
  parseOptions,
  pinnedMainnetAddresses,
} from './smoke-v2';
import { MANAGED, constructorStateBytes, haveCompiled } from '../../../scripts/v2/constructor.mjs';
import { emptySession, readSession } from '../../../scripts/v2/session.mjs';

const NET = 'undeployed';
const PROVER_STOP = 'no proof server in this test';
const V4 = new Uint8Array(
  readFileSync(path.resolve(import.meta.dirname, '../../../scripts/committee/fixtures/zkir-v3-example.verifier')),
);
const sha = (b: Uint8Array): string => createHash('sha256').update(b).digest('hex');
const dir = (): string => mkdtempSync(path.join(tmpdir(), 'smoke-v2-'));
const COMPILED = haveCompiled('veilcore') && haveCompiled('veilcore-claims');
const circuitsOf = (name: string): string[] =>
  readdirSync(path.join(MANAGED, name, 'zkir'))
    .filter((f) => f.endsWith('.zkir'))
    .map((f) => f.slice(0, -'.zkir'.length))
    .sort();

/** A test passphrase for the in-memory key file (not a secret: nothing real is behind it). */
const PASS = 'test-passphrase-not-real';

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

/** A deploy-session record that names both contracts, for the refusals. */
const recordFile = (network = 'preprod'): string => {
  const f = path.join(dir(), 'record.json');
  const s = emptySession({
    network,
    commit: 'test',
    compiler: '0.36.1',
    fingerprintsSha256: '22'.repeat(32),
    publicKey: '11'.repeat(32),
  });
  s.contracts.veilcore.address = '33'.repeat(32);
  s.contracts.veilcore.deploy = { txHash: 'ab'.repeat(32) };
  s.contracts['veilcore-claims'].address = '44'.repeat(32);
  s.contracts['veilcore-claims'].deploy = { txHash: 'cd'.repeat(32) };
  writeFileSync(f, JSON.stringify(s));
  return f;
};

describe('smoke-v2: options', () => {
  it('needs a network and a record', () => {
    expect(() => parseOptions(['--v2-record', 'r.json'])).toThrow(/--network preprod/);
    expect(() => parseOptions(['--network', 'preprod'])).toThrow(/--v2-record/);
    expect(() => parseOptions(['--network', 'preview', '--v2-record', 'r'])).toThrow(/Unknown network/);
    expect(parseOptions(['--network', 'preprod', '--v2-record', 'r.json'])).toEqual({
      network: 'preprod',
      record: 'r.json',
      teamOnly: false,
    });
  });

  it('refuses mainnet without --i-understand-team-only, and the flag anywhere else', () => {
    expect(() => parseOptions(['--network', 'mainnet', '--v2-record', 'r'])).toThrow(MAINNET_REFUSAL);
    expect(() => parseOptions(['--network', 'preprod', '--v2-record', 'r', '--i-understand-team-only'])).toThrow(
      /mainnet only/,
    );
    expect(parseOptions(['--network', 'mainnet', '--i-understand-team-only', '--v2-record', 'r']).teamOnly).toBe(true);
  });

  it('on mainnet without the flag, nothing is read or opened', async () => {
    let opened = 0;
    const code = await main(['--network', 'mainnet', '--v2-record', recordFile('mainnet')], {
      logger: capture().logger,
      prompt: scripted([]),
      openSender: async () => {
        opened++;
        return undefined;
      },
    });
    expect(code).toBe(2);
    expect(opened).toBe(0);
  });
});

describe('smoke-v2: refusals before the wallet', () => {
  const base = (out: ReturnType<typeof capture>, answers: string[], extra: Partial<Deps> = {}): Deps => ({
    logger: out.logger,
    prompt: scripted(answers),
    stack: () => [],
    keys: () => [],
    load: async () => ({ SMOKE_CALLS: 34 }) as SmokeModules,
    openSender: async () => {
      throw new Error('the wallet must not be opened');
    },
    ...extra,
  });

  it('refuses when the stack or the proof server pin is wrong', async () => {
    const out = capture();
    const code = await main(
      ['--network', 'preprod', '--v2-record', recordFile()],
      base(out, [], { stack: () => ['The proof server 9.0.2 digest is not filled in yet.'] }),
    );
    expect(code).toBe(1);
    expect(out.text()).toMatch(/digest is not filled in yet/);
  });

  it('refuses a record for another network, or one whose deploy did not finish', async () => {
    const out = capture();
    expect(await main(['--network', 'preprod', '--v2-record', recordFile('mainnet')], base(out, []))).toBe(1);
    expect(out.text()).toMatch(/is for mainnet, not preprod/);
    const f = recordFile();
    const r = JSON.parse(readFileSync(f, 'utf8')) as { contracts: Record<string, { deploy: unknown }> };
    r.contracts['veilcore-claims'].deploy = null;
    writeFileSync(f, JSON.stringify(r));
    const out2 = capture();
    expect(await main(['--network', 'preprod', '--v2-record', f], base(out2, []))).toBe(1);
    expect(out2.text()).toMatch(/no deployed veilcore-claims/);
  });

  it('refuses when the keys are not built here', async () => {
    const out = capture();
    expect(
      await main(
        ['--network', 'preprod', '--v2-record', recordFile()],
        base(out, [], { keys: () => keyProblems(dir()) }),
      ),
    ).toBe(1);
    expect(out.text()).toMatch(/has no keys: build them on this Mac first/);
  });

  it('on mainnet, refuses unless both v2 addresses are pinned', async () => {
    const args = ['--network', 'mainnet', '--i-understand-team-only', '--v2-record', recordFile('mainnet')];
    const out = capture();
    expect(await main(args, base(out, ['SMOKE V2 ON MAINNET'], { pinned: () => ['33'.repeat(32)] }))).toBe(1);
    expect(out.text()).toMatch(/veilcore-claims 4{64} is not pinned in deployments\/mainnet\.json/);
    expect(out.text()).not.toMatch(/This calls every circuit/);
    // The repository's real list today: v1 only, so a v2 record is refused.
    const out2 = capture();
    expect(await main(args, base(out2, ['SMOKE V2 ON MAINNET'], { pinned: undefined }))).toBe(1);
    expect(out2.text()).toMatch(/veilcore 3{64} is not pinned/);
    expect(pinnedMainnetAddresses()).toContain('a04de0a2684f3713276325649540c7278ffd07cba8b014e7489844f319a02347');
    expect(mainnetPinProblems({ veilcore: 'AB'.repeat(32) }, ['ab'.repeat(32)])).toEqual([]);
  });

  it('stops unless SMOKE V2 is typed (SMOKE V2 ON MAINNET on mainnet)', async () => {
    const out = capture();
    expect(await main(['--network', 'preprod', '--v2-record', recordFile()], base(out, ['yes']))).toBe(1);
    expect(out.text()).toMatch(/Stopped\. Nothing was sent\./);
    const out2 = capture();
    expect(
      await main(
        ['--network', 'mainnet', '--i-understand-team-only', '--v2-record', recordFile('mainnet')],
        base(out2, ['SMOKE V2'], { pinned: () => ['33'.repeat(32), '44'.repeat(32)] }),
      ),
    ).toBe(1);
    expect(out2.text()).toMatch(/MAINNET: these are real transactions/);
    expect(out2.text()).toMatch(/Stopped\. Nothing was sent\./);
  });
});

/* **********************************************************************
 * End to end on the ledger's own code.
 */

/** A local Ledger 9 standing in for the network, the wallet and the indexer. */
const ledgerChain = () => {
  let state = L.LedgerState.blank(NET);
  const strict = new L.WellFormedStrictness();
  strict.enforceBalancing = false;
  strict.verifyContractProofs = false;
  strict.verifyNativeProofs = false;
  type Tx9 = L.Transaction<L.SignatureEnabled, L.PreProof, L.PreBinding>;
  let height = 1;
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
    height++;
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
  const finalized = new Map<string, Uint8Array>();
  /** Each contract's deploy: its transaction id and starting state. */
  const deploys = new Map<string, { txId: string; state: Uint8Array }>();
  const contractState = (a: string) => SerializedContractState.fromBytes('v9', state.index(a)!.serialize());
  const reader = {
    queryContractState: async (a: string) =>
      has(a)
        ? {
            protocolVersion: 2_001_000,
            contractState: contractState(a),
            ledgerParameters: SerializedLedgerParameters.fromBytes('v9', state.parameters.serialize()),
          }
        : null,
    queryZSwapAndContractState: async (a: string) =>
      has(a)
        ? {
            protocolVersion: 2_001_000,
            contractState: contractState(a),
            zswapChainState: SerializedZswapChainState.fromBytes('v9', new L.ZswapChainState().serialize()),
            ledgerParameters: SerializedLedgerParameters.fromBytes('v9', state.parameters.serialize()),
          }
        : null,
    queryBlock: async () => ({
      hash: height.toString(16).padStart(64, '0'),
      height,
      protocolVersion: 2_001_000,
      timestamp: Date.now(),
    }),
    queryLatestProtocolVersion: async () => 2_001_000,
    queryDeployContractState: async (a: string) =>
      deploys.has(a)
        ? { protocolVersion: 2_001_000, contractState: SerializedContractState.fromBytes('v9', deploys.get(a)!.state) }
        : null,
    watchForDeployTxData: async (a: string) => reader.watchForTxData(deploys.get(a)!.txId),
    watchForTxData: async (txId: string) => ({
      era: 'v9',
      txId,
      txHash: txId.padStart(64, '0'),
      blockHeight: 7 + sent,
      blockHash: height.toString(16).padStart(64, '0'),
      status: 'SucceedEntirely',
      tx: LedgerTransaction.fromBytes('v9', 'Finalized', finalized.get(txId)!),
    }),
  };
  const placeholderProver = {
    check: async () => [],
    prove: async () => new L.Proof('0100').serialize(),
    lookupKey: async () => undefined,
  };
  /** Every contract call handed to the prover: [address, circuit]. */
  const proving: [string, string][] = [];
  const proofProvider = createProofProviderFromHandlers({
    v8: undefined,
    v9: async (tx: UnprovenTx) => {
      const t = read9(tx);
      const calls: [string, string][] = [];
      t.intents?.forEach((i) =>
        i.actions.forEach((a) => {
          if (a instanceof L.ContractCall)
            calls.push([
              a.address,
              typeof a.entryPoint === 'string' ? a.entryPoint : Buffer.from(a.entryPoint).toString(),
            ]);
        }),
      );
      // A deploy or a key insert needs no ZK proof. A contract call does, and a real one needs the
      // keys built on the Mac and a proof server: the run stops here, at the prover's door.
      if (calls.length > 0) {
        proving.push(...calls);
        throw new Error(PROVER_STOP);
      }
      return t.prove(placeholderProver, L.CostModel.initialCostModel());
    },
  });
  let opened = 0;
  const openSender = async () => {
    opened++;
    return {
      providers: {
        publicDataProvider: reader,
        proofProvider,
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
            t.intents?.forEach((i) =>
              i.actions.forEach((a) => {
                if (a instanceof L.ContractDeploy)
                  deploys.set(a.address, { txId: id, state: a.initialState.serialize() });
              }),
            );
            return id;
          },
        }),
        config: { networkId: NET, ttlSeconds: 3600 },
      },
      stop: async () => undefined,
      proofServer: 'http://127.0.0.1:1',
    } as never;
  };
  return { openSender, proofProvider, proving, sent: () => sent, opened: () => opened };
};

/** A copy of the key-less build with the stand-in key as every circuit's verifier key. */
const managedWithStandInKeys = (): string => {
  const m = dir();
  for (const name of ['veilcore', 'veilcore-claims']) {
    cpSync(path.join(MANAGED, name), path.join(m, name), { recursive: true });
    mkdirSync(path.join(m, name, 'keys'), { recursive: true });
    // The compiler's manifest certifies every file the zk config provider reads: list the keys
    // in it as a build with keys would.
    const manifestFile = path.join(m, name, 'compiler', 'contract-manifest.json');
    const manifest = JSON.parse(readFileSync(manifestFile, 'utf8')) as Record<string, unknown>;
    const keys: Record<string, unknown> = { type: 'directory' };
    const PROVER = new Uint8Array([0]);
    for (const c of circuitsOf(name)) {
      writeFileSync(path.join(m, name, 'keys', `${c}.verifier`), V4);
      writeFileSync(path.join(m, name, 'keys', `${c}.prover`), PROVER);
      keys[`${c}.verifier`] = { type: 'file', size: V4.length, hash: sha(V4) };
      keys[`${c}.prover`] = { type: 'file', size: PROVER.length, hash: sha(PROVER) };
    }
    writeFileSync(manifestFile, JSON.stringify({ ...manifest, keys }, null, 2));
  }
  return m;
};

const fingerprintTable = (d: string): string => {
  const f = path.join(d, 'fingerprints-v2.md');
  writeFileSync(
    f,
    [
      'Commit abcdef0, compiler 0.36.1.',
      '',
      '| File | SHA-256 |',
      '|---|---|',
      ...['veilcore', 'veilcore-claims'].flatMap((n) =>
        circuitsOf(n).map((c) => `| \`${n}/keys/${c}.verifier\` | \`${sha(V4)}\` |`),
      ),
      '',
    ].join('\n'),
  );
  return f;
};

describe.skipIf(!COMPILED)('smoke-v2 end to end, on the ledger’s own code', () => {
  it('deploys v2, finds both contracts through midnight-js, and hands the first call to the prover', async () => {
    const chain = ledgerChain();
    const d = dir();
    const record = path.join(d, 'record.json');
    const files = new Map<string, string>();
    const keyStore: KeyStore = {
      create: (f, k) => void files.set(f, k),
      open: (f) => files.get(f)!,
    };
    const deployOut = capture();
    const deployed = await deployV2(
      [
        NET,
        '--key-file',
        path.join(d, 'temp.age'),
        '--out',
        record,
        '--fingerprints',
        fingerprintTable(d),
        '--keys-per-update',
        '8',
      ],
      {
        logger: deployOut.logger,
        prompt: scripted(['DEPLOY V2']),
        keyStore,
        stack: () => [],
        openSender: chain.openSender,
        latestTx: async () => ({ txHash: '22'.repeat(32) }),
        constructorBytes: (n) => constructorStateBytes(n),
        localKey: () => V4,
        wait: async () => undefined,
        commit: 'test',
      },
    );
    expect(deployed, deployOut.text()).toBe(0);
    const addresses = { veilcore: readSession(record).contracts.veilcore.address };

    const managed = managedWithStandInKeys();
    const out = capture();
    const json = path.join(d, 'smoke.json');
    let printed = '';
    const write = process.stdout.write.bind(process.stdout);
    process.stdout.write = (s: string) => {
      printed += s;
      return true;
    };
    let code: number;
    try {
      code = await main(['--network', NET, '--v2-record', record, '--out', json], {
        logger: out.logger,
        prompt: scripted(['SMOKE V2']),
        stack: () => [],
        keys: () => keyProblems(managed),
        load: async () => {
          const m = await loadSmoke();
          return {
            ...m,
            midnightSmokeChain: (x) =>
              (m.midnightSmokeChain as (d: unknown) => ReturnType<SmokeModules['midnightSmokeChain']>)({
                ...x,
                managed,
                proofProviderFor: () => chain.proofProvider,
              }),
          };
        },
        openSender: chain.openSender,
        commit: 'test',
      });
    } finally {
      process.stdout.write = write;
    }
    // Both contracts were found through midnight-js (their keys checked against the local
    // build), and the first call was built for the right contract and circuit and handed to the
    // prover. Proving and sending are what only the preprod run can show.
    expect(chain.proving, out.text()).toEqual([[addresses.veilcore, 'anchor']]);
    expect(code).toBe(1);
    expect(printed).toMatch(
      /1\s+main\s+anchor\s+anchor test record A\s+FAIL\s+proveTx rejected the transaction \(circuit 'anchor'\)/,
    );
    expect(printed).toMatch(/2\s+main\s+anchor\s+anchor test record B\s+NOT RUN/);
    expect(printed).toMatch(/^FAIL: 0 of 29 circuits passed/m);
    expect(printed).toMatch(/proveAttested/);
    const saved = JSON.parse(readFileSync(json, 'utf8')) as { network: string; rows: { result: string }[] };
    expect(saved.network).toBe(NET);
    expect(saved.rows.map((r) => r.result)).toEqual(['FAIL', ...Array.from({ length: 33 }, () => 'NOT RUN')]);
    // Test data only: no secret is in the saved table.
    expect(readFileSync(json, 'utf8')).not.toMatch(/privateState|geneticSecret|recoverySecret|licenseSecret/);
  }, 600_000);
});
