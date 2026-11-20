// A batch's Bitcoin stamp, checked in this browser (docs/bitcoin-header-check.md).
//
// 1. The stamp file (OpenTimestamps) is read with verify.html's own reader (verify-core.js
//    readStamp): it must start from SHA-256 of the batch root, and its steps name a Bitcoin
//    block N and the value N's merkle root must be.
// 2. Block N's header, and the headers between it and a checkpoint this release pins, come
//    from two explorers that must agree (evidence-page/btc-header-fetch.js), and are checked
//    here (evidence-page/btc-header-chain.js): proof of work, one hash chain, the pinned
//    checkpoint, and on the way up Bitcoin's difficulty rule.
// 3. Block N's header must carry the stamp's merkle root.
//
// The result says exactly how far it got: linked to a checkpoint (checked here), only the
// explorers' word (too far from every checkpoint this release pins), failed, or not reached.
// Nothing is asked of the network until the visitor asks for it (the check page's button):
// the explorers see the visitor's internet address and which block, never the record.
// SPDX-License-Identifier: Apache-2.0

import { VeilcoreVerify } from '../../../evidence-page/verify-core.js';
import { checkBlock, type FetchOpts } from '../../../evidence-page/btc-header-fetch.js';
import type { Checkpoint, HeaderAt } from '../../../evidence-page/btc-header-chain.js';
import checkpointsFile from '../../../evidence-page/btc-checkpoints.json';
import e2eChain from '../../e2e-fixtures/btc-e2e-chain.json';

// Only in the end-to-end build (package.json e2e:build sets VITE_E2E_FIXTURES=1): the browser
// tests pin real block 438 and serve a practice block 439 mined on it (e2e-fixtures/
// btc-e2e-chain.json), since no record's proof can fold to a real stamped batch. The condition
// is a constant in every other build, so those builds pin btc-checkpoints.json only.
const E2E_FIXTURES = import.meta.env.VITE_E2E_FIXTURES === '1';

/** The checkpoints this release pins. */
export const PINNED: readonly Checkpoint[] = (
  E2E_FIXTURES ? e2eChain.checkpoints : (checkpointsFile as { checkpoints: Checkpoint[] }).checkpoints
).map((c) => ({ height: c.height, hash: c.hash }));

/** Why a check failed, as a page words it. The English detail stays in `reason`. */
export type FailKind = 'stamp' | 'mismatch' | 'headers';

export type BitcoinCheck =
  /** The stamp holds only a stamping server's promise so far. */
  | { readonly status: 'pending' }
  /** Block N carries the stamp's value and links to a pinned checkpoint, all checked here. */
  | {
      readonly status: 'linked';
      readonly height: number;
      readonly hash: string;
      readonly time: number;
      readonly checkpoint: Checkpoint;
      readonly direction: 'down' | 'up';
      readonly explorers: readonly string[];
      /** The headers checked, for the evidence bundle (proof/bitcoin-headers.json). */
      readonly headers: readonly HeaderAt[];
    }
  /** Too far from every pinned checkpoint: both explorers agree block N carries the value. */
  | {
      readonly status: 'explorers';
      readonly height: number;
      readonly hash: string;
      readonly time: number;
      readonly explorers: readonly string[];
    }
  | { readonly status: 'failed'; readonly kind: FailKind; readonly reason: string }
  | { readonly status: 'unreachable'; readonly reason: string };

/** Check a stamp file against a batch root (lowercase hex), with two explorers. */
export const checkStamp = async (
  rootHex: string,
  ots: Uint8Array,
  opts: FetchOpts & { readonly checkpoints?: readonly Checkpoint[] } = {},
): Promise<BitcoinCheck> => {
  const read = await VeilcoreVerify.readStamp(ots, rootHex);
  if (!('bitcoin' in read)) return { status: 'failed', kind: 'stamp', reason: read.reason };
  if (read.status === 'pending' || read.bitcoin.length === 0) return { status: 'pending' };
  const pins = opts.checkpoints ?? PINNED;
  let first: BitcoinCheck | undefined;
  for (const att of read.bitcoin) {
    if (!att.merkleRoot) continue;
    const r = await checkBlock(att.height, pins, opts);
    if (r.status === 'unreachable') return { status: 'unreachable', reason: r.reason };
    if (r.status === 'failed') {
      first ??= { status: 'failed', kind: 'headers', reason: r.reason };
      continue;
    }
    const root = r.status === 'linked' ? r.linked.merkleRoot : r.read.merkleRoot;
    if (root !== att.merkleRoot) {
      first ??= {
        status: 'failed',
        kind: 'mismatch',
        reason: `block ${att.height}'s merkle root is ${root}, not the stamp's ${att.merkleRoot}`,
      };
      continue;
    }
    if (r.status === 'linked')
      return {
        status: 'linked',
        height: att.height,
        hash: r.linked.hash,
        time: r.linked.time,
        checkpoint: r.linked.checkpoint,
        direction: r.linked.direction,
        explorers: r.explorers,
        headers: r.headers,
      };
    first ??= { status: 'explorers', height: att.height, hash: r.hash, time: r.read.time, explorers: r.explorers };
  }
  return first ?? { status: 'failed', kind: 'stamp', reason: 'no Bitcoin step in the stamp file runs in this browser' };
};

/** What the evidence bundle carries as proof/bitcoin-headers.json, for verify.html. */
export type BundleHeaders = {
  readonly format: 'veilcore/bitcoin-headers/v1';
  readonly height: number;
  readonly checkpoint: Checkpoint;
  readonly headers: readonly HeaderAt[];
  readonly from: readonly string[];
  readonly fetchedAt: string;
};

export const bundleHeaders = (c: BitcoinCheck, now = new Date()): BundleHeaders | null =>
  c.status === 'linked'
    ? {
        format: 'veilcore/bitcoin-headers/v1',
        height: c.height,
        checkpoint: c.checkpoint,
        headers: c.headers,
        from: c.explorers,
        fetchedAt: now.toISOString(),
      }
    : null;
