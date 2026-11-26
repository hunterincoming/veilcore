// The check page's key state beside a date (docs/contract-v2.md 3.3 and section 7): who could
// change the contract that dated a batch, read from the contract state the network recorded at
// that call and judged against the pinned entry's published key states, as the partner kit does
// (partner-kit/src/verify.ts checkBatchAnchor). With version 1 alone (mainnet before the v2 pin) nothing
// changes: the authority is not even read.
//
// Version 2 is pinned on a made-up address, the way the real pin will be: an entry added to
// deployments/mainnet.json with its keyStates. Its states are fixtures/v2-anchor-fixture.json
// (v2's ledger data after one anchorBatch, inside a real ledger 9 state) with the maintenance
// authority set to each case; v1's are real mainnet answers (fixtures/v1-mainnet-anchors.json).
// SPDX-License-Identifier: Apache-2.0
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import * as Ledger9 from '@midnightntwrk/ledger-v9';
import golden from './fixtures/v1-mainnet-anchors.json';
import v2 from './fixtures/v2-anchor-fixture.json';
import { checkAnchorOnChain, type AnchorCheck, type AnchorCheckDeps } from './anchor-check';
import { maintenanceAuthorityOf } from './anchor-decode';
import { anchorContractsFor, countedContractsFor, type PinnedContract } from './config';
import { anchorLine, keyStateWords } from '../../components/verify/anchor-words';
import { MAINNET_PINNED, PREPROD_PINNED, pinnedContractsFrom } from '../../../../api/src/pinned-contracts';
import { authorityReportOf, matchKeyState } from '../../../../api/src/key-states';
import { makeTranslator, type Translator } from '../../i18n/translate';
import { utcStamp } from '../time';
import { appEn } from '../../i18n/app/en';
import { appDe } from '../../i18n/app/de';
import { appEs } from '../../i18n/app/es';
import { appFr } from '../../i18n/app/fr';
import { appJa } from '../../i18n/app/ja';

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const V1 = golden.contract;
const V2 = v2.contract;
const v1Tx = golden.transactions.find((t) => t.stateLedger === 'ledger9')!;
const V1_STATE = v1Tx.indexerAnswer.byHash[0].contractActions[0].state;
const TX = 'ab'.repeat(32);
const BLOCK_MS = Date.UTC(2026, 11, 1, 12, 0, 0);

const hexToBytes = (h: string) => Uint8Array.from(h.match(/../g) ?? [], (b) => parseInt(b, 16));
const bytesToHex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');

/** v2's fixture state with its maintenance authority replaced: `keys` signing keys, `threshold`, `counter`. */
const v2StateWith = (keys: number, threshold: number, counter: bigint): string => {
  const s = Ledger9.ContractState.deserialize(hexToBytes(v2.stateHex));
  const committee = Array.from({ length: keys }, () => Ledger9.signatureVerifyingKey(Ledger9.sampleSigningKey()));
  s.maintenanceAuthority = new Ledger9.ContractMaintenanceAuthority(committee, threshold, counter);
  return bytesToHex(s.serialize());
};

const SINGLE = {
  retired: false,
  committee: 1,
  threshold: 1,
  counter: 16,
  block: 3600000,
  label: 'one key, not yet handed to the committee',
};
const COMMITTEE = {
  retired: false,
  committee: 3,
  threshold: 2,
  counter: 19,
  block: 3700000,
  label: 'held by the 2-of-3 committee',
};

const fullJson = JSON.parse(read('../../../../deployments/mainnet.json')) as {
  contracts: Record<string, unknown>[];
};
/** deployments/mainnet.json with its version 1 entries only, as it was before v2's pin. */
const mainnetJson = { ...fullJson, contracts: fullJson.contracts.filter((c) => (c.contractVersion ?? 1) === 1) };
/** deployments/mainnet.json with version 2's main contract pinned, listing `keyStates`. */
const pinnedWithV2 = (keyStates: readonly unknown[]) =>
  pinnedContractsFrom({
    ...mainnetJson,
    contracts: [
      ...mainnetJson.contracts,
      {
        ...(mainnetJson.contracts.find((c) => c.name === 'veilcore') as Record<string, unknown>),
        contractVersion: 2,
        source: 'contract-v2/src/veilcore.compact',
        address: V2,
        keyStates,
      },
    ],
  });

const answer = (actions: { address: string; state: string; entryPoint: string }[]) =>
  new Response(
    JSON.stringify({
      data: {
        byHash: [
          {
            hash: TX,
            block: { height: 3600100, timestamp: BLOCK_MS },
            identifiers: [],
            transactionResult: { status: 'SUCCESS' },
            contractActions: actions,
          },
        ],
        byId: [],
      },
    }),
  );

const run = (
  network: string,
  contracts: readonly PinnedContract[],
  counted: readonly string[],
  call: { address: string; state: string },
  root: string,
  extra: Partial<AnchorCheckDeps> = {},
): Promise<AnchorCheck> =>
  checkAnchorOnChain(
    { network, txId: TX, contracts, counted, expectedRoot: root },
    {
      buildNetwork: network,
      indexers: ['https://relay.example/indexer'],
      fetch: () => Promise.resolve(answer([{ ...call, entryPoint: 'anchorBatch' }])),
      ...extra,
    },
  );

/** The check page on mainnet with `pinned` as its list. */
const onMainnet = (pinned: ReturnType<typeof pinnedWithV2>, call: { address: string; state: string }, root: string) => {
  const both = { mainnet: pinned, preprod: PREPROD_PINNED };
  const contracts = anchorContractsFor('mainnet', V1, undefined, undefined, both);
  return run('mainnet', contracts, countedContractsFor('mainnet', contracts, both), call, root);
};

const LANGS: Record<string, Translator> = {
  en: makeTranslator('en', appEn),
  de: makeTranslator('de', appDe),
  es: makeTranslator('es', appEs),
  fr: makeTranslator('fr', appFr),
  ja: makeTranslator('ja', appJa),
};

describe('reading the maintenance authority from the state itself', () => {
  it('every real v1 mainnet state (both ledgers) is in v1’s published state: one key, counter 16', () => {
    const v1States = MAINNET_PINNED.find((e) => e.kind === 'veilcore')!.keyStates;
    for (const t of golden.transactions) {
      const a = authorityReportOf(maintenanceAuthorityOf(t.indexerAnswer.byHash[0].contractActions[0].state, 'v1'));
      expect(a, t.stateLedger).toEqual({ committee: 1, threshold: 1, counter: 16n, retired: false });
      expect(matchKeyState(v1States, a)?.label).toBe('one key, counter 16');
    }
  });

  it('v2 is read by v2’s decoder only, from ledger 9 bytes', () => {
    expect(authorityReportOf(maintenanceAuthorityOf(v2StateWith(3, 2, 19n), 'v2'))).toEqual({
      committee: 3,
      threshold: 2,
      counter: 19n,
      retired: false,
    });
    const ledger8 = golden.transactions.find((t) => t.stateLedger === 'ledger8')!;
    expect(() => maintenanceAuthorityOf(ledger8.indexerAnswer.byHash[0].contractActions[0].state, 'v2')).toThrow(
      /Not a ledger 9 contract state/,
    );
  });
});

describe('with version 1 alone pinned (mainnet before 25 November 2026)', () => {
  it('the authority is never read, nothing new is said, and the line reads exactly as before', async () => {
    const authorityOf = vi.fn(() => {
      throw new Error('must not be read');
    });
    const contracts = anchorContractsFor('mainnet', V1, undefined, undefined, {
      mainnet: pinnedContractsFrom(mainnetJson),
      preprod: PREPROD_PINNED,
    });
    expect(contracts).toHaveLength(1);
    const r = await run(
      'mainnet',
      contracts,
      countedContractsFor('mainnet', contracts),
      { address: V1, state: V1_STATE },
      v1Tx.root,
      {
        authorityOf,
      },
    );
    expect(authorityOf).not.toHaveBeenCalled();
    expect(r).toEqual({
      status: 'checked',
      txHash: TX,
      blockHeight: 3600100,
      blockTime: BLOCK_MS,
      indexers: 1,
      contract: { version: 'v1', address: V1 },
      nameContract: false,
    });
    for (const [lang, tr] of Object.entries(LANGS)) {
      const text = anchorLine(r, { network: 'mainnet', bound: true }, tr)?.text ?? '';
      expect(text, lang).toBe(
        tr.t('app.verify.anchor.checked', {
          tx: TX,
          block: '3600100',
          at: utcStamp(BLOCK_MS),
          contract: '',
          two: '',
          test: '',
        }),
      );
      expect(text, lang).not.toContain(tr.t('app.verify.anchor.keys.oneKey').trim().slice(0, 10));
    }
  });
});

describe('with version 2 pinned beside version 1', () => {
  it('a v2 batch with one key: the date names v2 and says the key is not yet handed to the committee, in all five languages', async () => {
    const r = await onMainnet(pinnedWithV2([SINGLE]), { address: V2, state: v2.stateHex }, v2.root);
    expect(r).toMatchObject({ status: 'checked', contract: { version: 'v2' }, nameContract: true });
    expect(r.status === 'checked' && r.keyState?.label).toBe('one key, not yet handed to the committee');
    expect(anchorLine(r, { network: 'mainnet', bound: true })?.text).toContain(
      'VeilCore contract version 2 gave this date. Who can change that contract: one key, not yet handed to the committee.',
    );
    for (const [lang, tr] of Object.entries(LANGS)) {
      const text = anchorLine(r, { network: 'mainnet', bound: true }, tr)?.text ?? '';
      expect(text, lang).toContain(tr.t('app.verify.anchor.keys.oneKey'));
      expect(text, lang).not.toMatch(/\{\w+\}/);
    }
  });

  it('a v2 batch after the handover: held by the 2-of-3 committee', async () => {
    const r = await onMainnet(
      pinnedWithV2([SINGLE, COMMITTEE]),
      { address: V2, state: v2StateWith(3, 2, 19n) },
      v2.root,
    );
    expect(r.status === 'checked' && r.keyState?.label).toBe('held by the 2-of-3 committee');
    expect(anchorLine(r, { network: 'mainnet', bound: true })?.text).toContain(
      'Who can change that contract: the 2-of-3 committee (2 of its 3 members must agree).',
    );
    for (const [lang, tr] of Object.entries(LANGS)) {
      const text = anchorLine(r, { network: 'mainnet', bound: true }, tr)?.text ?? '';
      expect(text, lang).toContain(tr.t('app.verify.anchor.keys.committee', { threshold: '2', committee: '3' }));
      expect(text, lang).not.toContain(tr.t('app.verify.anchor.keys.oneKey'));
      expect(text, lang).not.toMatch(/\{\w+\}/);
    }
  });

  it('REFUSED: a state in none of the published key states (a key swapped in, or the counter moved)', async () => {
    const why =
      'the keys that can change VeilCore’s contract were, at that call, in none of the states VeilCore published for it';
    // The committee installed, but only the single key is published.
    expect(await onMainnet(pinnedWithV2([SINGLE]), { address: V2, state: v2StateWith(3, 2, 19n) }, v2.root)).toEqual({
      status: 'failed',
      reason: why,
    });
    // One key still, but the counter moved: it has been used since it was published.
    expect(await onMainnet(pinnedWithV2([SINGLE]), { address: V2, state: v2StateWith(1, 1, 17n) }, v2.root)).toEqual({
      status: 'failed',
      reason: why,
    });
    const r = await onMainnet(pinnedWithV2([SINGLE]), { address: V2, state: v2StateWith(1, 1, 17n) }, v2.root);
    for (const [lang, tr] of Object.entries(LANGS))
      expect(anchorLine(r, { network: 'mainnet', bound: true }, tr)?.status, lang).toBe('failed');
  });

  it('a v1 batch: judged against v1’s own key states (real mainnet bytes pass), and no key words on its line', async () => {
    const r = await onMainnet(pinnedWithV2([SINGLE]), { address: V1, state: V1_STATE }, v1Tx.root);
    expect(r).toMatchObject({ status: 'checked', contract: { version: 'v1' }, nameContract: true });
    expect(r.status === 'checked' && 'keyState' in r).toBe(false);
    const text = anchorLine(r, { network: 'mainnet', bound: true })?.text ?? '';
    expect(text).toContain(' VeilCore contract version 1 gave this date.');
    expect(text).not.toContain('Who can change');
  });

  it('two indexers that disagree about who could change the contract: refused', async () => {
    const both = { mainnet: pinnedWithV2([SINGLE, COMMITTEE]), preprod: PREPROD_PINNED };
    const contracts = anchorContractsFor('mainnet', V1, undefined, undefined, both);
    const states = [v2.stateHex, v2StateWith(3, 2, 19n)];
    let n = 0;
    const r = await checkAnchorOnChain(
      {
        network: 'mainnet',
        txId: TX,
        contracts,
        counted: countedContractsFor('mainnet', contracts, both),
        expectedRoot: v2.root,
      },
      {
        buildNetwork: 'mainnet',
        indexers: ['https://one.example/indexer', 'https://two.example/indexer'],
        fetch: () => Promise.resolve(answer([{ address: V2, state: states[n++ % 2], entryPoint: 'anchorBatch' }])),
      },
    );
    expect(r).toEqual({ status: 'failed', reason: 'the two indexers disagree about that transaction' });
  });
});

describe('off mainnet, as the partner kit', () => {
  it('a test build’s v2 demo contract: no key states pinned, so none judged or shown', async () => {
    const contracts = anchorContractsFor('undeployed', V1, V2, 'v2');
    expect(contracts).toEqual([{ version: 'v2', address: V2 }]);
    const r = await run(
      'undeployed',
      contracts,
      countedContractsFor('undeployed', contracts),
      { address: V2, state: v2StateWith(1, 1, 99n) },
      v2.root,
    );
    expect(r).toMatchObject({ status: 'checked', nameContract: true });
    expect(r.status === 'checked' && 'keyState' in r).toBe(false);
  });
});

describe('keyStateWords', () => {
  it('words the matched state, never the deployments label, in every language', () => {
    for (const [lang, tr] of Object.entries(LANGS)) {
      expect(keyStateWords(undefined, tr), lang).toBe('');
      expect(keyStateWords({ retired: true, committee: 0, threshold: 1 }, tr), lang).toBe(
        tr.t('app.verify.anchor.keys.retired'),
      );
      expect(keyStateWords({ retired: false, committee: 1, threshold: 1 }, tr), lang).toBe(
        tr.t('app.verify.anchor.keys.oneKey'),
      );
      expect(keyStateWords({ retired: false, committee: 3, threshold: 2 }, tr), lang).toMatch(/2[^0-9]+3|3[^0-9]+2/);
    }
  });
});
