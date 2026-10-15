// The committee launcher end to end, against Midnight's real ledger code (ledger-v8) holding
// a contract in a local LedgerState: install from a paper key (dry run, then sent), a request
// two holders sign, submit (dry run, then sent). The wallet is replaced by providers that
// apply the transaction to that ledger, so signatures, threshold and counter are the
// ledger's own checks; no node, indexer, proof server or wallet is involved.
// SPDX-License-Identifier: Apache-2.0
/* eslint-disable @typescript-eslint/require-await -- the fakes stand in for async interfaces */
import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import pino from 'pino';
import * as L from '@midnight-ntwrk/ledger-v8';
import { type Prompt } from '../prompt';
import { main, parseOptions, UsageError, type Ctx } from './committee';
import { makeKeyCard, signRequest, type Request } from '../../../scripts/committee/core.mjs';
import { MAINNET_VEILCORE_ADDRESS } from '../../../api/src/deploy-guard';

const NET = 'undeployed';

const chain = () => {
  let state = L.LedgerState.blank(NET);
  const strict = new L.WellFormedStrictness();
  strict.enforceBalancing = false;
  strict.verifyContractProofs = false;
  strict.verifyNativeProofs = false;
  const apply = (tx: L.Transaction<L.SignatureEnabled, L.PreProof, L.PreBinding>) => {
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
  const paperKey = L.sampleSigningKey();
  const cs = new L.ContractState();
  cs.maintenanceAuthority = new L.ContractMaintenanceAuthority([L.signatureVerifyingKey(paperKey)], 1, 0n);
  const deploy = new L.ContractDeploy(cs);
  apply(
    L.Transaction.fromParts(
      NET,
      undefined,
      undefined,
      L.Intent.new(new Date(Date.now() + 3_600_000)).addDeploy(deploy),
    ),
  );
  let sent = 0;
  const reader = {
    queryContractState: async (a: string) => state.index(a),
    watchForTxData: async (txId: string) => ({ txId, blockHeight: 7, status: 'SucceedEntirely' }),
  } as unknown as Ctx['reader'];
  const openSender: Ctx['openSender'] = async () => ({
    providers: {
      publicDataProvider: reader,
      proofProvider: { proveTx: async (tx: unknown) => tx },
      walletProvider: { balanceTx: async (tx: unknown) => tx },
      midnightProvider: {
        submitTx: async (tx: Parameters<typeof apply>[0]) => {
          apply(tx);
          sent++;
          return `tx${sent}`;
        },
      },
    },
    stop: async () => undefined,
  });
  return {
    paperKey,
    address: deploy.address,
    reader,
    openSender,
    sent: () => sent,
    authority: () => state.index(deploy.address)!.maintenanceAuthority,
  };
};

/** A prompt that answers from lists; hidden answers come from their own list. */
const scripted = (answers: string[], hidden: string[] = []): Prompt =>
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

const dir = () => mkdtempSync(path.join(tmpdir(), 'committee-launcher-'));

const holders = (d: string) => {
  const keys = { hunter: L.sampleSigningKey(), mako: L.sampleSigningKey(), backup: L.sampleSigningKey() };
  const files = Object.entries(keys).map(([h, k]) => {
    const f = path.join(d, `${h}.json`);
    writeFileSync(f, JSON.stringify(makeKeyCard(h, k)));
    return f;
  });
  return { keys, files, cardArgs: files.flatMap((f) => ['--card', f]) };
};

describe('the command line', () => {
  it('refuses what it cannot do', () => {
    expect(() => parseOptions([])).toThrow(UsageError);
    expect(() => parseOptions(['mainnet', 'launch'])).toThrow(/show, install, request or submit/);
    expect(() => parseOptions(['mainnet', 'install', '--card', 'a', '--card', 'b'])).toThrow(/three key cards/);
    expect(() => parseOptions(['mainnet', 'show', '--address', 'ab'.repeat(32)])).toThrow(/pinned/);
    expect(parseOptions(['mainnet', 'show', '--address', MAINNET_VEILCORE_ADDRESS]).network).toBe('mainnet');
    expect(() => parseOptions(['preprod', 'show'])).toThrow(/--address/);
    expect(() =>
      parseOptions(['preprod', 'request', '--address', 'ab'.repeat(32), '--retire', '--remove', 'x']),
    ).toThrow(/one of/);
    expect(() => parseOptions(['preprod', 'submit', '--request', 'r.json'])).toThrow(/signature files/);
    expect(() => parseOptions(['preprod', 'show', '--address', 'ab'.repeat(32), '--dry-run'])).toThrow(/never sends/);
    expect(() => parseOptions(['preprod', 'show', '--address', 'ab'.repeat(32), '--frobnicate'])).toThrow(
      /Unknown option/,
    );
  });
});

describe('install, request, sign, submit: against the real ledger', () => {
  it('a dry run checks the paper key and sends nothing; the real run installs 2 of 3', async () => {
    const c = chain();
    const d = dir();
    const h = holders(d);
    const base = [NET, 'install', '--address', c.address, ...h.cardArgs];

    // Dry run: a mistyped paper key is caught, the right one accepted, nothing sent.
    const dry = capture();
    const wrong = L.sampleSigningKey();
    expect(
      await main([...base, '--dry-run'], {
        reader: c.reader,
        openSender: c.openSender,
        prompt: scripted([], [wrong, c.paperKey]),
        logger: dry.logger,
      }),
    ).toBe(0);
    expect(dry.text()).toMatch(/not the one on chain/);
    expect(dry.text()).toMatch(/DRY RUN, nothing sent/);
    expect(dry.text()).not.toContain(c.paperKey);
    expect(dry.text()).not.toContain(wrong);
    expect(c.sent()).toBe(0);
    expect(c.authority().committee.length).toBe(1);

    // Not confirmed: nothing sent.
    expect(
      await main(base, {
        reader: c.reader,
        openSender: c.openSender,
        prompt: scripted(['no'], [c.paperKey]),
        logger: capture().logger,
      }),
    ).toBe(1);
    expect(c.sent()).toBe(0);

    // Sent.
    const run = capture();
    const receipt = path.join(d, 'done.json');
    expect(
      await main([...base, '--out', receipt], {
        reader: c.reader,
        openSender: c.openSender,
        prompt: scripted(['INSTALL'], [c.paperKey]),
        logger: run.logger,
        sendOptions: { waitMs: 1 },
      }),
    ).toBe(0);
    expect(c.sent()).toBe(1);
    const a = c.authority();
    expect(a.committee.length).toBe(3);
    expect(a.threshold).toBe(2);
    expect(a.counter).toBe(1n);
    const r = JSON.parse(readFileSync(receipt, 'utf8')) as { authorityAfter: { threshold: number; counter: string } };
    expect(r.authorityAfter).toMatchObject({ threshold: 2, counter: '1' });
    expect(readFileSync(receipt, 'utf8')).not.toContain(c.paperKey);

    // Again: already installed, nothing asked, nothing sent.
    expect(
      await main(base, { reader: c.reader, openSender: c.openSender, prompt: scripted([]), logger: capture().logger }),
    ).toBe(0);
    expect(c.sent()).toBe(1);

    // From now on: a request, two holders sign, one person submits.
    const reqFile = path.join(d, 'retire.json');
    expect(
      await main([NET, 'request', '--address', c.address, '--retire', '--reason', 'test', '--out', reqFile], {
        reader: c.reader,
        prompt: scripted([]),
        logger: capture().logger,
      }),
    ).toBe(0);
    const req = JSON.parse(readFileSync(reqFile, 'utf8')) as Request;
    const sig = (k: string, n: string) => {
      const f = path.join(d, n);
      writeFileSync(f, JSON.stringify(signRequest(req, k)));
      return f;
    };
    const m = sig(h.keys.mako, 'm.json');
    const b = sig(h.keys.backup, 'b.json');
    const sub = [NET, 'submit', '--request', reqFile];

    const one = capture();
    expect(
      await main([...sub, '--sig', m, '--dry-run'], { reader: c.reader, prompt: scripted([]), logger: one.logger }),
    ).toBe(1);
    expect(one.text()).toMatch(/1 valid signature.*2 are needed/);

    const twoDry = capture();
    expect(
      await main([...sub, '--sig', m, '--sig', b, '--dry-run'], {
        reader: c.reader,
        prompt: scripted([]),
        logger: twoDry.logger,
      }),
    ).toBe(0);
    expect(twoDry.text()).toMatch(/RETIRE/);
    expect(twoDry.text()).toMatch(/DRY RUN/);
    expect(c.sent()).toBe(1);

    expect(
      await main([...sub, '--sig', m, '--sig', b, '--out', path.join(d, 'retired.json')], {
        reader: c.reader,
        openSender: c.openSender,
        prompt: scripted(['SEND']),
        logger: capture().logger,
        sendOptions: { waitMs: 1 },
      }),
    ).toBe(0);
    expect(c.authority().committee.length).toBe(0);
    expect(existsSync(path.join(d, 'retired.json'))).toBe(true);
  });

  it('install refuses a committee holding the current paper key', async () => {
    const c = chain();
    const d = dir();
    const h = holders(d);
    writeFileSync(h.files[0], JSON.stringify(makeKeyCard('hunter', c.paperKey)));
    const out = capture();
    expect(
      await main([NET, 'install', '--address', c.address, ...h.cardArgs, '--dry-run'], {
        reader: c.reader,
        prompt: scripted([], [c.paperKey]),
        logger: out.logger,
      }),
    ).toBe(1);
    expect(out.text()).toMatch(/current maintenance key/);
  });
});
