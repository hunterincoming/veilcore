// The committee launcher end to end, against Midnight's real ledger code (ledger-v9 1.0.1)
// holding a contract in a local LedgerState: install from a paper key (dry run, then sent), a
// request two holders sign, submit (dry run, then sent), and the mainnet switch (off unless
// --send-on-mainnet and a matching dry-run record are given; "mainnet" here is only the word
// on the command line, the ledger is the local one and no network is touched). The wallet is replaced by providers that
// apply the transaction to that ledger, so signatures, threshold and counter are the
// ledger's own checks; no node, indexer, proof server or wallet is involved.
// SPDX-License-Identifier: Apache-2.0
/* eslint-disable @typescript-eslint/require-await -- the fakes stand in for async interfaces */
import { describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import pino from 'pino';
import * as L from 'ledger-v9-committee';
import {
  SerializedContractState,
  createMidnightProviderFromHandlers,
  createProofProviderFromHandlers,
  createWalletProviderFromHandlers,
  type UnprovenTx,
} from '@midnight-ntwrk/midnight-js-types';
import { type Prompt } from '../prompt';
import { DRY_RUN_FORMAT, MAINNET_OFF, main, parseOptions, UsageError, type Ctx } from './committee';
import { makeKeyCard, signRequest, type Request } from '../../../scripts/committee/core.mjs';
import { MAINNET_VEILCORE_ADDRESS } from '../../../api/src/deploy-guard';

const NET = 'undeployed';

const sk = (hex: string): L.SigningKey => ({ tag: 'schnorr', value: hex });
/** A new throwaway signing key, as hex. */
const newKey = (): string => L.sampleSigningKey().value;

/**
 * A local ledger as a network on Midnight Ledger 9 (2.x), or one still on Ledger 8 (1.x).
 * `anyAddress`: the reader answers for any address with this one contract (for the mainnet
 * switch tests, where the tool always asks for the pinned mainnet address).
 */
const chain = (protocolVersion = 2_001_000, anyAddress = false) => {
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
  const paperKey = newKey();
  const cs = new L.ContractState();
  cs.maintenanceAuthority = new L.ContractMaintenanceAuthority([L.signatureVerifyingKey(sk(paperKey))], 1, 0n);
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
    queryContractState: async (a: string) => ({
      protocolVersion,
      contractState: SerializedContractState.fromBytes('v9', state.index(anyAddress ? deploy.address : a)!.serialize()),
    }),
    queryLatestProtocolVersion: async () => protocolVersion,
    watchForTxData: async (txId: string) => ({ era: 'v9', txId, blockHeight: 7, status: 'SucceedEntirely' }),
  } as unknown as Ctx['reader'];
  // A maintenance update has no circuit to prove: proving it only changes its stage.
  const placeholderProver = {
    check: async () => [],
    prove: async () => new L.Proof('0100').serialize(),
    lookupKey: async () => undefined,
  };
  type Tx9 = L.Transaction<L.SignatureEnabled, L.PreProof, L.PreBinding>;
  const read9 = (tx: { deserialize(d: never): unknown }) => tx.deserialize({ v9: L.Transaction } as never) as Tx9;
  let opened = 0;
  const openSender: Ctx['openSender'] = async () => {
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
            apply(read9(tx));
            sent++;
            return `tx${sent}`;
          },
        }),
        config: { networkId: NET, ttlSeconds: 3600 },
      },
      stop: async () => undefined,
    };
  };
  return {
    paperKey,
    address: deploy.address,
    reader,
    openSender,
    sent: () => sent,
    opened: () => opened,
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
  const keys = { hunter: newKey(), mako: newKey(), backup: newKey() };
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

  it('mainnet is off by default: sending needs --send-on-mainnet and a dry-run record', () => {
    const cards = ['--card', 'a', '--card', 'b', '--card', 'c'];
    const submit = ['mainnet', 'submit', '--request', 'r.json', '--sig', 's1.json', '--sig', 's2.json'];
    for (const argv of [
      ['mainnet', 'install', ...cards],
      ['mainnet', 'install', ...cards, '--send-on-mainnet'],
      ['mainnet', 'install', ...cards, '--dry-run-record', 'd.json'],
      submit,
      [...submit, '--send-on-mainnet'],
      [...submit, '--dry-run-record', 'd.json'],
    ])
      expect(() => parseOptions(argv), argv.join(' ')).toThrow(MAINNET_OFF);
    // What still works on mainnet without them: reading, a request file, a dry run.
    expect(parseOptions(['mainnet', 'show']).command).toBe('show');
    expect(parseOptions(['mainnet', 'install', ...cards, '--dry-run']).dryRun).toBe(true);
    expect(parseOptions([...submit, '--dry-run']).dryRun).toBe(true);
    // Both given: the command line is accepted (the record is then checked against the chain).
    const both = parseOptions(['mainnet', 'install', ...cards, '--send-on-mainnet', '--dry-run-record', 'd.json']);
    expect(both).toMatchObject({ sendOnMainnet: true, dryRunRecord: 'd.json', dryRun: false });
    // The flags mean nothing anywhere else, and never together with --dry-run.
    const addr = ['--address', 'ab'.repeat(32)];
    expect(() => parseOptions(['undeployed', 'install', ...addr, ...cards, '--send-on-mainnet'])).toThrow(
      /mainnet only/,
    );
    expect(() =>
      parseOptions(['mainnet', 'install', ...cards, '--dry-run', '--send-on-mainnet', '--dry-run-record', 'd.json']),
    ).toThrow(/for the run that sends/);
    expect(() => parseOptions(['mainnet', 'show', '--send-on-mainnet'])).toThrow(/for the run that sends/);
  });
});

describe('install, request, sign, submit: against the real ledger', () => {
  it('on a network still on Ledger 8: refused before any wallet is opened, nothing sent', async () => {
    const c = chain(1_000_000);
    const d = dir();
    const h = holders(d);
    const out = capture();
    expect(
      await main([NET, 'install', '--address', c.address, ...h.cardArgs], {
        reader: c.reader,
        openSender: c.openSender,
        prompt: scripted(['INSTALL'], [c.paperKey]),
        logger: out.logger,
        sendOptions: { waitMs: 1 },
      }),
    ).not.toBe(0);
    expect(out.text()).toMatch(/not on Midnight Ledger 9.*Nothing was built or sent/);
    expect(c.opened()).toBe(0);
    expect(c.sent()).toBe(0);
    expect(c.authority().committee.length).toBe(1);
  });

  it('a dry run checks the paper key and sends nothing; the real run installs 2 of 3', async () => {
    const c = chain();
    const d = dir();
    const h = holders(d);
    const base = [NET, 'install', '--address', c.address, ...h.cardArgs];

    // Dry run: a mistyped paper key is caught, the right one accepted, nothing sent.
    const dry = capture();
    const wrong = newKey();
    const dryRecord = path.join(d, 'dry.json');
    expect(
      await main([...base, '--dry-run', '--out', dryRecord], {
        reader: c.reader,
        openSender: c.openSender,
        prompt: scripted([], [wrong, c.paperKey]),
        logger: dry.logger,
      }),
    ).toBe(0);
    expect(dry.text()).toMatch(/not the one on chain/);
    expect(dry.text()).toMatch(/DRY RUN, nothing sent/);
    // Exactly what will change: the key now, the three keys after, the counter, the warning.
    const paperPublic = L.signatureVerifyingKey(sk(c.paperKey)).value;
    expect(dry.text()).toMatch(
      new RegExp(`Now: +1 key\\(s\\), 1 signature\\(s\\) needed, counter 0\\.\\n +1\\. ${paperPublic}`),
    );
    expect(dry.text()).toMatch(/After: +3 keys, 2 signatures needed, counter 1\./);
    for (const f of h.files)
      expect(dry.text()).toContain((JSON.parse(readFileSync(f, 'utf8')) as { publicKey: string }).publicKey);
    expect(dry.text()).toMatch(/wrong committee key is PERMANENT/);
    const rec = JSON.parse(readFileSync(dryRecord, 'utf8')) as Record<string, string>;
    expect(rec).toMatchObject({ format: DRY_RUN_FORMAT, network: NET, counterBefore: '0', counterAfter: '1' });
    expect(readFileSync(dryRecord, 'utf8')).not.toContain(c.paperKey);
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
      await main([...sub, '--sig', m, '--dry-run', '--out', path.join(d, 'dry-one.json')], {
        reader: c.reader,
        prompt: scripted([]),
        logger: one.logger,
      }),
    ).toBe(1);
    expect(existsSync(path.join(d, 'dry-one.json'))).toBe(false);
    expect(one.text()).toMatch(/1 valid signature.*2 are needed/);

    const twoDry = capture();
    expect(
      await main([...sub, '--sig', m, '--sig', b, '--dry-run', '--out', path.join(d, 'dry-retire.json')], {
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
      await main(
        [NET, 'install', '--address', c.address, ...h.cardArgs, '--dry-run', '--out', path.join(d, 'x.json')],
        {
          reader: c.reader,
          prompt: scripted([], [c.paperKey]),
          logger: out.logger,
        },
      ),
    ).toBe(1);
    expect(out.text()).toMatch(/current maintenance key/);
    expect(existsSync(path.join(d, 'x.json'))).toBe(false);
  });
});

describe('the mainnet switch (a local ledger; only the word "mainnet" on the command line)', () => {
  /** `main` for the word mainnet, on the local ledger `c`. */
  const run = async (c: ReturnType<typeof chain>, argv: string[], answers: string[], hidden: string[]) => {
    const out = capture();
    const code = await main(['mainnet', ...argv], {
      reader: c.reader,
      openSender: c.openSender,
      prompt: scripted(answers, hidden),
      logger: out.logger,
      sendOptions: { waitMs: 1 },
    });
    return { code, text: out.text() };
  };

  it('install: refused without the flag and the record; a dry run sends nothing; a record for another change or counter is refused', async () => {
    const c = chain(2_001_000, true);
    const d = dir();
    const h = holders(d);
    const install = ['install', ...h.cardArgs];

    // No flag: refused on the command line, exit 2, before the chain is read or a key typed.
    let hiddenAsked = 0;
    const out = capture();
    const prompt = scripted(['INSTALL', 'INSTALL ON MAINNET'], [c.paperKey]);
    const askHidden = prompt.askHidden;
    (prompt as { askHidden: Prompt['askHidden'] }).askHidden = async (q) => (hiddenAsked++, askHidden(q));
    expect(
      await main(['mainnet', ...install], { reader: c.reader, openSender: c.openSender, prompt, logger: out.logger }),
    ).toBe(2);
    expect(hiddenAsked).toBe(0);
    expect(c.opened()).toBe(0);

    // The dry run: everything checked, a record written, nothing sent.
    const record = path.join(d, 'dry-mainnet.json');
    const dry = await run(c, [...install, '--dry-run', '--out', record], [], [c.paperKey]);
    expect(dry.code).toBe(0);
    expect(dry.text).toMatch(/DRY RUN, nothing sent/);
    expect(dry.text).toMatch(/--send-on-mainnet --dry-run-record/);
    expect(dry.text).toMatch(/wrong committee key is PERMANENT/);
    expect(c.opened()).toBe(0);
    expect(c.sent()).toBe(0);
    const rec = JSON.parse(readFileSync(record, 'utf8')) as Record<string, string>;
    expect(rec).toMatchObject({
      format: DRY_RUN_FORMAT,
      network: 'mainnet',
      contractAddress: MAINNET_VEILCORE_ADDRESS,
    });

    const send = (file: string) => [...install, '--send-on-mainnet', '--dry-run-record', file];
    const refused = async (file: string, why: RegExp, cardArgs = h.cardArgs) => {
      const r = await run(
        c,
        ['install', ...cardArgs, '--send-on-mainnet', '--dry-run-record', file],
        ['INSTALL ON MAINNET'],
        [c.paperKey],
      );
      expect(r.code).toBe(1);
      expect(r.text).toMatch(why);
      expect(r.text).toMatch(/Nothing was sent|not a dry-run record|Could not read/);
      expect(c.opened()).toBe(0);
      expect(c.sent()).toBe(0);
      expect(c.authority().committee.length).toBe(1);
    };
    // No such record; not a record; a record for a test network; for another counter; for other keys.
    await refused(path.join(d, 'missing.json'), /Could not read the dry-run record/);
    writeFileSync(path.join(d, 'junk.json'), JSON.stringify({ hello: 1 }));
    await refused(path.join(d, 'junk.json'), /not a dry-run record/);
    const edited = (name: string, change: Record<string, string>) => {
      const f = path.join(d, name);
      writeFileSync(f, JSON.stringify({ ...rec, ...change }));
      return f;
    };
    await refused(edited('net.json', { network: 'undeployed' }), /is for undeployed, not mainnet/);
    await refused(
      edited('counter.json', { counterBefore: '5' }),
      /dry run was made at counter 5; the chain now shows 0/,
    );
    await refused(edited('addr.json', { contractAddress: 'ab'.repeat(32) }), /different contract/);
    const others = holders(dir());
    await refused(record, /different change than this one/, others.cardArgs);

    // The record of this change, the flag, but the plain word: not sent.
    const plain = await run(c, send(record), ['INSTALL'], [c.paperKey]);
    expect(plain.code).toBe(1);
    expect(c.sent()).toBe(0);

    expect(c.opened()).toBe(1);

    // All of it: the flag, the matching record, and INSTALL ON MAINNET typed out. Only now is
    // the transaction handed over. The local ledger has no contract at the pinned mainnet
    // address, so it refuses it there: the switch is what is shown here, not a mainnet change.
    const done = await run(c, send(record), ['INSTALL ON MAINNET'], [c.paperKey]);
    expect(done.text).toMatch(/This is MAINNET/);
    expect(done.text).toMatch(/exactly what will change/);
    expect(done.text).toMatch(/submitTx rejected the transaction/);
    expect(done.code).toBe(1);
    expect(c.opened()).toBe(2);
    expect(c.sent()).toBe(0);
    expect(c.authority().committee.length).toBe(1);
  });

  it('submit: the same switch for a change two holders signed', async () => {
    const c = chain(2_001_000, true);
    const d = dir();
    const h = holders(d);
    // The committee is put in place on the local ledger first (as a test network would be).
    expect(
      await main([NET, 'install', '--address', c.address, ...h.cardArgs, '--out', path.join(d, 'i.json')], {
        reader: c.reader,
        openSender: c.openSender,
        prompt: scripted(['INSTALL'], [c.paperKey]),
        logger: capture().logger,
        sendOptions: { waitMs: 1 },
      }),
    ).toBe(0);
    const reqFile = path.join(d, 'req.json');
    expect((await run(c, ['request', '--retire', '--out', reqFile], [], [])).code).toBe(0);
    const req = JSON.parse(readFileSync(reqFile, 'utf8')) as Request;
    const sigs = (['mako', 'backup'] as const).flatMap((who) => {
      const f = path.join(d, `${who}-sig.json`);
      writeFileSync(f, JSON.stringify(signRequest(req, h.keys[who])));
      return ['--sig', f];
    });
    const submit = ['submit', '--request', reqFile, ...sigs];
    expect((await run(c, submit, ['SEND ON MAINNET'], [])).code).toBe(2);
    const record = path.join(d, 'dry.json');
    expect((await run(c, [...submit, '--dry-run', '--out', record], [], [])).code).toBe(0);
    expect(c.sent()).toBe(1);
    const stale = path.join(d, 'stale.json');
    writeFileSync(
      stale,
      JSON.stringify({ ...(JSON.parse(readFileSync(record, 'utf8')) as object), counterBefore: '0' }),
    );
    const no = await run(c, [...submit, '--send-on-mainnet', '--dry-run-record', stale], ['SEND ON MAINNET'], []);
    expect(no.code).toBe(1);
    expect(no.text).toMatch(/Start again from a new dry run/);
    expect(c.sent()).toBe(1);
    expect(c.opened()).toBe(1);
    // The flag, the matching record and the words: handed over, and refused by the local
    // ledger, which has no contract at the pinned mainnet address.
    const yes = await run(c, [...submit, '--send-on-mainnet', '--dry-run-record', record], ['SEND ON MAINNET'], []);
    expect(yes.text).toMatch(/submitTx rejected the transaction/);
    expect(c.opened()).toBe(2);
    expect(c.sent()).toBe(1);
    expect(c.authority().committee.length).toBe(3);
  });
});
