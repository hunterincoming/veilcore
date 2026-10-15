// The Node entry: the browser-safe check, plus the date stamp looked up on Midnight.
//
// The look-up is @veilcore/contracts' checkBatchAnchor (partner-kit/src/verify.ts, verifier
// rule 7): the transaction must be a single anchorBatch call at VeilCore's pinned contract
// (never the address the registry names), on mainnet and preprod carrying the pinned
// build's verifier keys, and the contract state right after it must hold exactly this
// batch root. With a second indexer, both must agree. It is loaded only when asked for, so
// a partner who only checks the registry installs nothing from Midnight.
// SPDX-License-Identifier: Apache-2.0

import { checkRecord as checkRecordCore, type AnchorChecker, type CheckOptions, type RecordCheck } from './check.js';

export * from './index.js';

export type ChainOptions = {
  /** The indexer's GraphQL URL. Default: the network's public one (mainnet and preprod: Blockfrost, with blockfrostProjectId). */
  readonly indexer?: string;
  /** A second, independent indexer: both must give the same answer. */
  readonly secondIndexer?: string;
  readonly blockfrostProjectId?: string;
  readonly timeoutMs?: number;
};

type BatchAnchorCheck = (o: {
  network: 'mainnet' | 'preprod';
  indexer?: string;
  secondIndexer?: string;
  blockfrostProjectId?: string;
  timeoutMs?: number;
  txId: string;
  root: Uint8Array;
}) => Promise<{ accepted: boolean; reason: string; blockHeight?: number; blockTime?: number }>;

/** The package that does the look-up. A variable, so bundlers leave it to be found at run time. */
const CONTRACTS = '@veilcore/contracts';
const loadContracts = async (): Promise<{ checkBatchAnchor?: BatchAnchorCheck }> =>
  (await import(CONTRACTS)) as { checkBatchAnchor?: BatchAnchorCheck };

/** What checkBatchAnchor throws when an indexer answered and the answer refuses the report. */
const REFUSALS =
  /^(No such transaction|That transaction|The two indexers disagree|The second indexer does not confirm)/;

/** A date stamp look-up on Midnight, for checkRecord's `checkAnchor`. */
export const onChainChecker =
  (o: ChainOptions = {}, load: () => Promise<{ checkBatchAnchor?: BatchAnchorCheck }> = loadContracts): AnchorChecker =>
  async ({ network, txId, root }) => {
    if (network !== 'mainnet' && network !== 'preprod')
      return {
        status: 'not-checked',
        reason: `the registry names the ${network} network; only mainnet and preprod are looked up`,
      };
    let checkBatchAnchor: BatchAnchorCheck | undefined;
    try {
      checkBatchAnchor = (await load()).checkBatchAnchor;
    } catch {
      checkBatchAnchor = undefined;
    }
    if (typeof checkBatchAnchor !== 'function')
      return {
        status: 'not-checked',
        reason:
          'looking the date up on Midnight needs @veilcore/contracts (npm install --save-exact @veilcore/contracts@0.2.0)',
      };
    try {
      const v = await checkBatchAnchor({
        network,
        ...(o.indexer ? { indexer: o.indexer } : {}),
        ...(o.secondIndexer ? { secondIndexer: o.secondIndexer } : {}),
        ...(o.blockfrostProjectId ? { blockfrostProjectId: o.blockfrostProjectId } : {}),
        ...(o.timeoutMs ? { timeoutMs: o.timeoutMs } : {}),
        txId,
        root: Uint8Array.from(Buffer.from(root, 'hex')),
      });
      if (!v.accepted) return { status: 'not-confirmed', reason: v.reason };
      // A date stamp with no block time dates nothing.
      if (typeof v.blockTime !== 'number' || !Number.isFinite(v.blockTime))
        return { status: 'not-confirmed', reason: 'the indexer gave no block time for that transaction' };
      return { status: 'checked', blockHeight: v.blockHeight, blockTime: v.blockTime };
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      // The indexer answered and the answer refuses the registry's report: not confirmed.
      if (REFUSALS.test(reason)) return { status: 'not-confirmed', reason };
      // The network, indexer and contract named don't agree: nothing was read.
      if (/^Refusing:/.test(reason)) return { status: 'not-checked', reason };
      return { status: 'unreachable', reason };
    }
  };

/**
 * checkRecord, with `chain` to look the date stamp up on Midnight. Without `chain` (or
 * `checkAnchor`) the date is reported as the registry's word.
 */
export const checkRecord = (
  linkOrId: string,
  opts: CheckOptions & { readonly chain?: ChainOptions } = {},
): Promise<RecordCheck> =>
  checkRecordCore(linkOrId, {
    ...opts,
    checkAnchor: opts.checkAnchor ?? (opts.chain ? onChainChecker(opts.chain) : undefined),
  });
