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
import { createHash } from 'node:crypto';
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
import {
  makeConfirmation,
  makeKeyCard,
  makeRequest,
  signRequest,
  type KeyCard,
  type Request,
} from '../../../scripts/committee/core.mjs';
import { MAINNET_VEILCORE_ADDRESS } from '../../../api/src/deploy-guard';
import { emptySession, writeSession } from '../../../scripts/v2/session.mjs';

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

const WHO = ['hunter', 'mako', 'backup'] as const;

/** Three holders' keys and card files. `practice`: as a rehearsal makes them (keygen --practice). */
const holders = (d: string, practice = false) => {
  const keys = { hunter: newKey(), mako: newKey(), backup: newKey() };
  const cards = WHO.map((h) => makeKeyCard(practice ? `practice-${h}` : h, keys[h], undefined, { practice }));
  const files = WHO.map((h, i) => {
    const f = path.join(d, `${h}.json`);
    writeFileSync(f, JSON.stringify(cards[i]));
    return f;
  });
  /** Each holder's confirmation of the change in a dry-run record, as cli.mjs confirm writes it. */
  const confirmArgs = (recordFile: string, who: readonly (typeof WHO)[number][] = WHO, name = 'confirm'): string[] => {
    const { request } = JSON.parse(readFileSync(recordFile, 'utf8')) as { request: Request };
    return who.flatMap((h) => {
      const f = path.join(d, `${name}-${h}.json`);
      writeFileSync(f, JSON.stringify(makeConfirmation(request, cards[WHO.indexOf(h)], keys[h])));
      return ['--confirm', f];
    });
  };
  return { keys, cards, files, cardArgs: files.flatMap((f) => ['--card', f]), confirmArgs };
};

/**
 * A contract v2 deploy-session record naming `address` (with `paperKey` as its temporary key), as
 * `npm run deploy-v2` writes it, and a stand-in docs/fingerprints-v2.md whose every key is the
 * compactc 0.36.1 fixture.
 */
const V4_FILE = path.resolve(import.meta.dirname, '../../../scripts/committee/fixtures/zkir-v3-example.verifier');
const v2Record = (d: string, address: string, paperKey: string, network = 'mainnet') => {
  const r = emptySession({
    network,
    commit: 'test',
    compiler: '0.36.1',
    fingerprintsSha256: '00'.repeat(32),
    publicKey: L.signatureVerifyingKey(sk(paperKey)).value,
  });
  r.contracts.veilcore.address = address;
  r.contracts.veilcore.deploy = { txHash: '11'.repeat(32) };
  const file = writeSession(path.join(d, `v2-record-${network}.json`), r, { first: true });
  const vkSha = createHash('sha256').update(readFileSync(V4_FILE)).digest('hex');
  const rows = [
    ...Array.from({ length: 24 }, (_, i) => `| \`veilcore/keys/circuit${i}.verifier\` | \`${vkSha}\` |`),
    ...Array.from({ length: 5 }, (_, i) => `| \`veilcore-claims/keys/claim${i}.verifier\` | \`${vkSha}\` |`),
  ];
  const table = path.join(d, 'fingerprints-v2.md');
  writeFileSync(
    table,
    ['Commit abcdef0, compiler 0.36.1.', '', '| File | SHA-256 |', '|---|---|', ...rows, ''].join('\n'),
  );
  return { file, table, args: ['--v2-record', file, '--fingerprints', table] };
};

const NOT_PRACTICE =
  /WARNING: "(hunter|mako|backup)" \(.{17}\) is NOT a practice card, and this is undeployed, a test network\./g;

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
    // Confirmations go with the run that sends, on any network.
    expect(() => parseOptions(['mainnet', 'install', ...cards, '--dry-run', '--confirm', 'c.json'])).toThrow(
      /--confirm is for the run that sends/,
    );
    expect(
      parseOptions(['undeployed', 'install', ...addr, ...cards, '--confirm', 'a', '--confirm', 'b', '--confirm', 'c'])
        .confirms,
    ).toEqual(['a', 'b', 'c']);
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
    expect(DRY_RUN_FORMAT).toBe('veilcore-maintenance-dry-run/v2');
    expect(Math.abs(Date.parse(rec.createdAt) - Date.now())).toBeLessThan(60_000);
    expect((rec.request as unknown as Request).dataToSignSha256).toBe(rec.dataToSignSha256);
    // These are not practice cards, and this is a test network: a warning for each, not a refusal.
    expect(dry.text().match(NOT_PRACTICE)).toHaveLength(3);
    expect(dry.text()).toMatch(/Next, each of the three new holders signs the check code/);
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

  it('request --replace and submit refuse the single key in place as a member, as install does', async () => {
    const c = chain();
    const d = dir();
    const h = holders(d, true);
    writeFileSync(
      h.files[0],
      JSON.stringify(makeKeyCard('practice-hunter', c.paperKey, undefined, { practice: true })),
    );
    const refusal =
      /"practice-hunter" is the contract's current maintenance key \(.{17}\)\. Both founders hold paper copies of it, so it cannot be a committee member\. Make a new key\./;
    const reqFile = path.join(d, 'req.json');
    const asked = capture();
    expect(
      await main([NET, 'request', '--address', c.address, '--replace', ...h.cardArgs, '--out', reqFile], {
        reader: c.reader,
        prompt: scripted([]),
        logger: asked.logger,
      }),
    ).toBe(1);
    expect(asked.text()).toMatch(refusal);
    expect(existsSync(reqFile)).toBe(false);

    // A request file written by hand (the tool will not write one): submit refuses it before
    // any signature is counted or any wallet opened, dry run or not.
    const good = makeRequest({
      network: NET,
      contractAddress: c.address,
      current: c.authority(),
      actions: [{ kind: 'replace-authority', committee: h.cards, threshold: 2 }],
    });
    const bare = { ...good, dataToSign: undefined, dataToSignSha256: undefined };
    const withOld = JSON.parse(readFileSync(h.files[0], 'utf8')) as KeyCard;
    writeFileSync(
      reqFile,
      JSON.stringify({
        ...bare,
        actions: [{ kind: 'replace-authority', committee: [withOld, h.cards[1], h.cards[2]], threshold: 2 }],
      }),
    );
    const sigFile = path.join(d, 'sig.json');
    writeFileSync(sigFile, JSON.stringify(signRequest(good, c.paperKey)));
    for (const extra of [
      ['--dry-run', '--out', path.join(d, 'dry.json')],
      ['--out', path.join(d, 'done.json')],
    ]) {
      const sent = capture();
      expect(
        await main([NET, 'submit', '--request', reqFile, '--sig', sigFile, ...extra], {
          reader: c.reader,
          openSender: c.openSender,
          prompt: scripted(['SEND']),
          logger: sent.logger,
          sendOptions: { waitMs: 1 },
        }),
      ).toBe(1);
      expect(sent.text()).toMatch(refusal);
    }
    expect(existsSync(path.join(d, 'dry.json'))).toBe(false);
    expect(c.opened()).toBe(0);
    expect(c.sent()).toBe(0);
    expect(c.authority().committee.length).toBe(1);
  });

  it('a rehearsal with practice cards: no warning, and the confirmations are checked when given', async () => {
    const c = chain();
    const d = dir();
    const h = holders(d, true);
    const base = [NET, 'install', '--address', c.address, ...h.cardArgs];
    const record = path.join(d, 'dry.json');
    const dry = capture();
    expect(
      await main([...base, '--dry-run', '--out', record], {
        reader: c.reader,
        prompt: scripted([], [c.paperKey]),
        logger: dry.logger,
      }),
    ).toBe(0);
    expect(dry.text()).not.toMatch(/NOT a practice card/);
    expect(dry.text()).toMatch(/practice-hunter/);

    const attempt = async (confirms: string[]) => {
      const out = capture();
      let paperAsked = 0;
      const prompt = scripted(['INSTALL'], [c.paperKey]);
      const askHidden = prompt.askHidden;
      (prompt as { askHidden: Prompt['askHidden'] }).askHidden = async (q) => (paperAsked++, askHidden(q));
      const code = await main([...base, ...confirms, '--out', path.join(d, `done-${confirms.length}.json`)], {
        reader: c.reader,
        openSender: c.openSender,
        prompt,
        logger: out.logger,
        sendOptions: { waitMs: 1 },
      });
      return { code, text: out.text(), paperAsked };
    };
    // Two of three: refused before the paper key is asked for.
    const two = await attempt(h.confirmArgs(record, ['hunter', 'mako']));
    expect(two.code).toBe(1);
    expect(two.text).toMatch(/No valid confirmation from "practice-backup" \(.{17}\) for check code [0-9a-f]{16}\./);
    expect(two.text).toMatch(/Nothing was sent\./);
    expect(two.paperAsked).toBe(0);
    expect(c.opened()).toBe(0);
    // A holder whose stored key is not the card's cannot have made one; another key's signature under their name fails.
    const forged = path.join(d, 'forged.json');
    const real = JSON.parse(readFileSync(path.join(d, 'confirm-mako.json'), 'utf8')) as Record<string, string>;
    const hunters = JSON.parse(readFileSync(path.join(d, 'confirm-hunter.json'), 'utf8')) as Record<string, string>;
    writeFileSync(forged, JSON.stringify({ ...real, signature: hunters.signature }));
    const bad = await attempt([
      '--confirm',
      path.join(d, 'confirm-hunter.json'),
      '--confirm',
      forged,
      ...h.confirmArgs(record, ['backup']),
    ]);
    expect(bad.code).toBe(1);
    expect(bad.text).toMatch(/No valid confirmation from "practice-mako"/);
    expect(c.sent()).toBe(0);
    // All three: installed.
    const all = await attempt(h.confirmArgs(record));
    expect(all.code).toBe(0);
    expect(c.sent()).toBe(1);
    expect(c.authority().committee.length).toBe(3);
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
    // The handover of contract v2 (gate exception 1): its address from the deploy-session record.
    // (v1 with its single key takes only a retire on mainnet: see the gate tests below.)
    const c = chain(2_001_000, true);
    const d = dir();
    const h = holders(d);
    const v2 = v2Record(d, c.address, c.paperKey);
    const install = ['install', ...v2.args, ...h.cardArgs];

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
      contractAddress: c.address,
    });

    expect(dry.text).toMatch(/Next, each of the three new holders signs the check code/);
    expect(dry.text).toMatch(/within 24 hours/);
    const confirms = h.confirmArgs(record);
    const send = (file: string, confirmArgs = confirms) => [
      ...install,
      '--send-on-mainnet',
      '--dry-run-record',
      file,
      ...confirmArgs,
    ];
    const refused = async (file: string, why: RegExp, cardArgs = h.cardArgs, confirmArgs = confirms) => {
      // The paper key must not even be asked for, and no wallet opened.
      let paperAsked = 0;
      const openedBefore = c.opened();
      const out = capture();
      const prompt = scripted(['INSTALL ON MAINNET'], [c.paperKey]);
      const askHidden = prompt.askHidden;
      (prompt as { askHidden: Prompt['askHidden'] }).askHidden = async (q) => (paperAsked++, askHidden(q));
      const code = await main(
        ['mainnet', 'install', ...v2.args, ...cardArgs, '--send-on-mainnet', '--dry-run-record', file, ...confirmArgs],
        { reader: c.reader, openSender: c.openSender, prompt, logger: out.logger, sendOptions: { waitMs: 1 } },
      );
      const r = { code, text: out.text() };
      expect(r.code).toBe(1);
      expect(r.text).toMatch(why);
      expect(r.text).toMatch(/Nothing was sent|not a dry-run record|Could not read/);
      expect(paperAsked).toBe(0);
      expect(c.opened()).toBe(openedBefore);
      expect(c.sent()).toBe(0);
      expect(c.authority().committee.length).toBe(1);
    };
    // No such record; not a record; a record for a test network; for another counter; for other keys.
    await refused(path.join(d, 'missing.json'), /Could not read the dry-run record/);
    writeFileSync(path.join(d, 'junk.json'), JSON.stringify({ hello: 1 }));
    await refused(path.join(d, 'junk.json'), /not a dry-run record/);
    const edited = (name: string, change: Record<string, unknown>) => {
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

    // The record is a plain file, so everything in it is worked out again and compared.
    // Its age: more than 24 hours old, from the future, or with no time at all.
    const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
    await refused(
      edited('old.json', { createdAt: ago(24 * 3_600_000 + 60_000) }),
      /The dry-run record is more than 24 hours old \(made .*\)\. Make a new dry run, and send within 24 hours of it\./,
    );
    await refused(
      edited('future.json', { createdAt: ago(-3_600_000) }),
      /The dry-run record says it was made in the future/,
    );
    for (const createdAt of [undefined, 'yesterday', 0, '2026-11-14'])
      await refused(edited('untimed.json', { createdAt }), /The dry-run record does not say when it was made/);
    // Just inside the limit is fine as far as age goes (it is refused later only for the word typed).
    const nearlyOld = await run(c, send(edited('23h.json', { createdAt: ago(23 * 3_600_000) })), ['no'], [c.paperKey]);
    expect(nearlyOld.text).not.toMatch(/24 hours old/);
    expect(nearlyOld.text).toMatch(/Not sent\./);
    // The record of the tool before this one (no time, no request inside).
    await refused(
      edited('v1.json', { format: 'veilcore-maintenance-dry-run/v1', createdAt: undefined, request: undefined }),
      /is not a dry-run record \(veilcore-maintenance-dry-run\/v2\)\. Make a new dry run with this tool\./,
    );
    // A hand-written record with the four fields the old check read, and nothing else right.
    await refused(
      edited('bare.json', { request: undefined, change: undefined }),
      /The request inside the dry-run record is not acceptable/,
    );
    await refused(
      edited('after.json', { counterAfter: '9' }),
      /gives the counter after the change as 9; it would be 1/,
    );
    await refused(
      edited('lines.json', { change: ['Now: something else'] }),
      /What the dry-run record says will change is not what this run would change\./,
    );
    const inner = (JSON.parse(readFileSync(record, 'utf8')) as { request: Request }).request;
    await refused(
      edited('inner.json', { request: { ...inner, actions: [{ kind: 'retire' }], dataToSign: undefined } }),
      /The request inside the dry-run record is not this change\./,
    );
    await refused(
      edited('inner-net.json', { request: { ...inner, network: 'undeployed', dataToSign: undefined } }),
      /The request inside the dry-run record is not this change\./,
    );

    // The new holders' confirmations: all three, for exactly this change, or nothing is sent.
    const missing = (who: string) =>
      new RegExp(
        `No valid confirmation from "${who}" \\(.{17}\\) for check code ${rec.dataToSignSha256.slice(0, 16)}\\.`,
      );
    await refused(record, missing('hunter'), h.cardArgs, []);
    await refused(record, missing('backup'), h.cardArgs, h.confirmArgs(record, ['hunter', 'mako'], 'two'));
    await refused(record, /Could not read the confirmation/, h.cardArgs, [
      ...confirms.slice(0, 4),
      '--confirm',
      path.join(d, 'none.json'),
    ]);
    // A card with a key its holder does not have (a typo made when the card was written): the
    // card's own proof cannot be faked, so stand in for it with a holder who signs with another key.
    const wrongKey = path.join(d, 'wrong-key.json');
    const makos = JSON.parse(readFileSync(path.join(d, 'confirm-mako.json'), 'utf8')) as Record<string, string>;
    const hunters = JSON.parse(readFileSync(path.join(d, 'confirm-hunter.json'), 'utf8')) as Record<string, string>;
    writeFileSync(wrongKey, JSON.stringify({ ...makos, signature: hunters.signature }));
    await refused(record, missing('mako'), h.cardArgs, [
      ...confirms.slice(0, 2),
      '--confirm',
      wrongKey,
      ...confirms.slice(4),
    ]);
    // Confirmations made for another dry run (other keys): each is named, and each holder is still missing.
    const otherRecord = path.join(d, 'dry-others.json');
    expect(
      (await run(c, ['install', ...v2.args, ...others.cardArgs, '--dry-run', '--out', otherRecord], [], [c.paperKey]))
        .code,
    ).toBe(0);
    await refused(
      record,
      /Confirmation 1 was made for a different change/,
      h.cardArgs,
      others.confirmArgs(otherRecord),
    );

    // The record of this change, the flag, but the plain word: not sent.
    const plain = await run(c, send(record), ['INSTALL'], [c.paperKey]);
    expect(plain.code).toBe(1);
    expect(c.sent()).toBe(0);

    expect(c.opened()).toBe(2);

    // All of it: the flag, the matching record, and INSTALL ON MAINNET typed out. Only now is
    // the transaction handed over, and the local ledger (standing in for v2's address) takes it.
    const done = await run(
      c,
      [...send(record), '--out', path.join(d, 'receipt.json')],
      ['INSTALL ON MAINNET'],
      [c.paperKey],
    );
    expect(done.text).toMatch(/This is MAINNET/);
    expect(done.text).toMatch(/exactly what will change/);
    expect(done.code, done.text).toBe(0);
    expect(c.opened()).toBe(3);
    expect(c.sent()).toBe(1);
    expect(c.authority().committee.length).toBe(3);
    // The receipt names the transaction by its hash too (verify:deployment --receipt reads it).
    const receiptFile = /Receipt \(public, no secrets\) written to (\S+)\./.exec(done.text)?.[1];
    expect(receiptFile).toBeDefined();
  });

  it('practice cards are refused by every mainnet command, before a key is typed or the chain read', async () => {
    const c = chain(2_001_000, true);
    const d = dir();
    const p = holders(d, true);
    const real = holders(dir());
    const refusal =
      /"practice-(hunter|mako|backup)" is a PRACTICE card, made for a rehearsal\. Practice keys are thrown away, so a practice card is never accepted on mainnet\./;
    const record = path.join(d, 'dry.json');
    // One practice card among real ones is enough.
    const mixed = [...real.cardArgs.slice(0, 4), '--card', p.files[2]];
    for (const argv of [
      ['install', ...p.cardArgs, '--dry-run', '--out', record],
      ['install', ...mixed, '--dry-run', '--out', record],
      ['install', ...p.cardArgs, '--send-on-mainnet', '--dry-run-record', record],
      ['request', '--replace', ...p.cardArgs, '--out', path.join(d, 'req.json')],
      ['show', ...p.cardArgs],
    ]) {
      let asked = 0;
      let read = 0;
      const out = capture();
      const prompt = scripted(['INSTALL ON MAINNET'], [c.paperKey]);
      const askHidden = prompt.askHidden;
      (prompt as { askHidden: Prompt['askHidden'] }).askHidden = async (q) => (asked++, askHidden(q));
      const reader = {
        ...c.reader,
        queryContractState: async (a: string) => (read++, c.reader.queryContractState(a)),
      } as Ctx['reader'];
      const code = await main(['mainnet', ...argv], { reader, openSender: c.openSender, prompt, logger: out.logger });
      expect(code, argv.join(' ')).toBe(1);
      expect(out.text(), argv.join(' ')).toMatch(refusal);
      expect(asked).toBe(0);
      expect(read).toBe(0);
    }
    expect(existsSync(record)).toBe(false);
    expect(existsSync(path.join(d, 'req.json'))).toBe(false);

    // A request made on a test network with practice cards, relabelled for mainnet by hand:
    // submit refuses it, dry run or not.
    const local = makeRequest({
      network: NET,
      contractAddress: MAINNET_VEILCORE_ADDRESS,
      current: c.authority(),
      actions: [{ kind: 'replace-authority', committee: p.cards, threshold: 2 }],
    });
    const reqFile = path.join(d, 'relabelled.json');
    writeFileSync(reqFile, JSON.stringify({ ...local, network: 'mainnet', dataToSign: undefined }));
    const sigFile = path.join(d, 'sig.json');
    writeFileSync(sigFile, JSON.stringify(signRequest(local, c.paperKey)));
    for (const extra of [['--dry-run'], ['--send-on-mainnet', '--dry-run-record', record]]) {
      const r = await run(c, ['submit', '--request', reqFile, '--sig', sigFile, ...extra], ['SEND ON MAINNET'], []);
      expect(r.code).toBe(1);
      expect(r.text).toMatch(refusal);
    }
    expect(c.opened()).toBe(0);
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

describe('the mainnet gate and the key slot (docs/contract-v2.md 5)', () => {
  const run = async (c: ReturnType<typeof chain>, argv: string[], answers: string[] = [], hidden: string[] = []) => {
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

  it('v1 with its single key: an install or a replace is refused before the paper key is asked; a retire is allowed', async () => {
    const c = chain(2_001_000, true);
    const d = dir();
    const h = holders(d);
    let asked = 0;
    const out = capture();
    const prompt = scripted([], [c.paperKey]);
    const askHidden = prompt.askHidden;
    (prompt as { askHidden: Prompt['askHidden'] }).askHidden = async (q) => (asked++, askHidden(q));
    const code = await main(['mainnet', 'install', ...h.cardArgs, '--dry-run', '--out', path.join(d, 'x.json')], {
      reader: c.reader,
      openSender: c.openSender,
      prompt,
      logger: out.logger,
    });
    expect(code).toBe(1);
    expect(out.text()).toMatch(/On v1 with its single key, the only change allowed is one retire/);
    expect(asked).toBe(0);
    expect(existsSync(path.join(d, 'x.json'))).toBe(false);
    const replace = await run(c, ['request', '--replace', ...h.cardArgs, '--out', path.join(d, 'r.json')]);
    expect(replace.code).toBe(1);
    expect(replace.text).toMatch(/only change allowed is one retire/);
    const retire = await run(c, ['request', '--retire', '--out', path.join(d, 'retire.json')]);
    expect(retire.code, retire.text).toBe(0);
    const req = JSON.parse(readFileSync(path.join(d, 'retire.json'), 'utf8')) as Request;
    expect(req.current.keySlot).toBe('v3');
    expect(c.sent()).toBe(0);
  });

  it('v2 before the handover: listed keys go in V4, the slot coming from the record; nothing else is made', async () => {
    const c = chain(2_001_000, true);
    const d = dir();
    const v2 = v2Record(d, c.address, c.paperKey);
    const ok = await run(c, [
      'request',
      ...v2.args,
      '--insert',
      `circuit3=${V4_FILE}`,
      '--out',
      path.join(d, 'ins.json'),
    ]);
    expect(ok.code, ok.text).toBe(0);
    const req = JSON.parse(readFileSync(path.join(d, 'ins.json'), 'utf8')) as Request;
    expect(req.current.keySlot).toBe('v4');
    expect(req.actions[0]).toMatchObject({ kind: 'insert-key', circuit: 'circuit3', keySlot: 'v4' });
    // A circuit not in the table; a removal; V3 named for v2: each refused, no file written.
    const notListed = await run(c, [
      'request',
      ...v2.args,
      '--insert',
      `rewriteHolder=${V4_FILE}`,
      '--out',
      path.join(d, 'a.json'),
    ]);
    expect(notListed.text).toMatch(/"rewriteHolder" is not a circuit in docs\/fingerprints-v2\.md/);
    const removal = await run(c, ['request', ...v2.args, '--remove', 'circuit3', '--out', path.join(d, 'b.json')]);
    expect(removal.text).toMatch(/"remove-key" is not allowed on v2 before the handover/);
    const v3 = await run(c, [
      'request',
      ...v2.args,
      '--key-slot',
      'v3',
      '--insert',
      `circuit3=${V4_FILE}`,
      '--out',
      path.join(d, 'c.json'),
    ]);
    expect(v3.text).toMatch(/keys are in slot V4 \(contract v2\), not V3/);
    for (const f of ['a.json', 'b.json', 'c.json']) expect(existsSync(path.join(d, f))).toBe(false);
  });

  it('v2: a request that leaves the slot out (the old V3 default) is refused at submit, before any signature counts', async () => {
    const c = chain(2_001_000, true);
    const d = dir();
    const v2 = v2Record(d, c.address, c.paperKey);
    // Built with the slot left out everywhere, as a request made before the slot existed (or by
    // hand) would be: the core reads that as V3, and nothing in the file says otherwise.
    const noSlot = makeRequest({
      network: 'mainnet',
      contractAddress: c.address,
      current: c.authority(),
      actions: [{ kind: 'remove-key', circuit: 'circuit3' }],
    });
    const f = path.join(d, 'req.json');
    writeFileSync(f, JSON.stringify(noSlot));
    const sig = path.join(d, 'sig.json');
    writeFileSync(sig, JSON.stringify(signRequest(noSlot, c.paperKey)));
    const r = await run(c, ['submit', ...v2.args, '--request', f, '--sig', sig, '--dry-run']);
    expect(r.code).toBe(1);
    expect(r.text).toMatch(/The request says the contract's keys are in slot V3, but this contract's are in V4/);
    expect(c.sent()).toBe(0);
  });

  it('the handover on v2 signs with the temporary key from its age file, never typed; another key file is refused', async () => {
    const c = chain(2_001_000, true);
    const d = dir();
    const h = holders(d);
    const v2 = v2Record(d, c.address, c.paperKey);
    const files = new Map([
      ['temp.age', c.paperKey],
      ['other.age', newKey()],
    ]);
    const keyStore = {
      create: () => undefined,
      open: (f: string) => files.get(path.basename(f)) ?? '',
    };
    let typed = 0;
    const go = async (keyFile: string) => {
      const out = capture();
      const prompt = scripted([], []);
      const askHidden = prompt.askHidden;
      (prompt as { askHidden: Prompt['askHidden'] }).askHidden = async (q) => (typed++, askHidden(q));
      const code = await main(
        [
          'mainnet',
          'install',
          ...v2.args,
          ...h.cardArgs,
          '--temp-key-file',
          path.join(d, keyFile),
          '--dry-run',
          '--out',
          path.join(d, `dry-${keyFile}.json`),
        ],
        { reader: c.reader, openSender: c.openSender, prompt, logger: out.logger, keyStore },
      );
      return { code, text: out.text() };
    };
    const ok = await go('temp.age');
    expect(ok.code, ok.text).toBe(0);
    expect(ok.text).toMatch(/DRY RUN, nothing sent/);
    const bad = await go('other.age');
    expect(bad.code).toBe(1);
    expect(bad.text).toMatch(/does not hold the key that holds this contract now/);
    expect(typed).toBe(0);
    expect(() => parseOptions(['mainnet', 'show', '--temp-key-file', 'k.age'])).toThrow(
      /for contract v2 before its handover/,
    );
  });

  it('a record naming v1\u2019s pinned address as v2 is refused before anything is read', async () => {
    const c = chain(2_001_000, true);
    const d = dir();
    const v2 = v2Record(d, MAINNET_VEILCORE_ADDRESS, c.paperKey);
    const r = await run(c, ['request', ...v2.args, '--insert', `circuit3=${V4_FILE}`, '--out', path.join(d, 'x.json')]);
    expect(r.code).toBe(2);
    expect(r.text).toMatch(/is a pinned v1 address, never a v2 one/);
    expect(existsSync(path.join(d, 'x.json'))).toBe(false);
  });

  it('v2 before the handover can be closed for good: one retire, alone, signed from the temporary key file', async () => {
    const c = chain(2_001_000, true);
    const d = dir();
    const v2 = v2Record(d, c.address, c.paperKey);
    const r = await run(c, ['request', ...v2.args, '--retire', '--out', path.join(d, 'retire.json')]);
    expect(r.code, r.text).toBe(0);
    expect((JSON.parse(readFileSync(path.join(d, 'retire.json'), 'utf8')) as Request).actions).toEqual([
      { kind: 'retire' },
    ]);
    const keyStore = { create: () => undefined, open: () => c.paperKey };
    const out = capture();
    const dry = await main(
      [
        'mainnet',
        'submit',
        ...v2.args,
        '--request',
        path.join(d, 'retire.json'),
        '--temp-key-file',
        path.join(d, 't.age'),
        '--dry-run',
        '--out',
        path.join(d, 'dry-retire.json'),
      ],
      { reader: c.reader, openSender: c.openSender, prompt: scripted([]), logger: out.logger, keyStore },
    );
    expect(dry, out.text()).toBe(0);
    expect(out.text()).toMatch(/DRY RUN, nothing sent/);
    expect(c.sent()).toBe(0);
  });

  it('a record for another network, or an address with the record, is refused on the command line', async () => {
    const c = chain(2_001_000, true);
    const d = dir();
    const v2 = v2Record(d, c.address, c.paperKey, 'preprod');
    const r = await run(c, ['show', ...v2.args]);
    expect(r.code).toBe(2);
    expect(r.text).toMatch(/The record is for preprod, not mainnet/);
    expect(() => parseOptions(['preprod', 'show', '--v2-record', 'x.json', '--address', 'ab'.repeat(32)])).toThrow(
      /not both/,
    );
  });
});
