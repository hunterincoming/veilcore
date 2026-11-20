// The Bitcoin row of the check page's "What each fact rests on" (who-vouches.ts): the registry's
// word until the visitor presses "Check on Bitcoin", then this browser's own check
// (veilcore/bitcoin/stamp-check.ts, docs/bitcoin-header-check.md).
//
// Nothing is fetched until the button is pressed: the check asks two block explorers that are
// not VeilCore's, and they see the visitor's internet address and the block number (the button's
// note says so). The stamp file comes from the registry's public route for the proof's own
// batch, as the plant page's download does (proofs.ts bitcoinStampFor).
// SPDX-License-Identifier: Apache-2.0

import { useCallback, useEffect, useRef, useState } from 'react';
import { bitcoinStampFor, type ProofState } from '../../veilcore/proofs';
import type { BitcoinRow } from './who-vouches';

export const useBitcoinCheck = (
  proof: ProofState | 'checking' | undefined,
): { row: BitcoinRow | undefined; run: (() => void) | undefined } => {
  const p = proof !== undefined && proof !== 'checking' && proof.status !== 'none' ? proof.proof : undefined;
  const stamp = p ? bitcoinStampFor(p) : undefined;
  const [row, setRow] = useState<BitcoinRow | undefined>(undefined);
  const live = useRef(0);

  const idle: BitcoinRow | undefined = !stamp
    ? undefined
    : stamp.status === 'pending'
      ? { state: 'pending' }
      : { state: 'reported', ...(stamp.height === undefined ? {} : { height: stamp.height }) };

  // A new proof starts over.
  const key = p ? `${p.batchId}:${p.root}` : '';
  useEffect(() => {
    live.current += 1;
    setRow(undefined);
  }, [key]);

  const run = useCallback(() => {
    if (!p || !stamp || stamp.status !== 'bitcoin') return;
    const mine = ++live.current;
    const height = stamp.height;
    const set = (r: BitcoinRow) => {
      if (live.current === mine) setRow(r);
    };
    set({ state: 'checking', ...(height === undefined ? {} : { height }) });
    void (async () => {
      let ots: Uint8Array;
      try {
        const res = await fetch(stamp.otsUrl, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        ots = new Uint8Array(await res.arrayBuffer());
      } catch {
        set({ state: 'unreachable', ...(height === undefined ? {} : { height }) });
        return;
      }
      try {
        const { checkStamp } = await import('../../veilcore/bitcoin/stamp-check');
        const r = await checkStamp(p.root, ots);
        if (r.status === 'linked')
          set({ state: 'linked', height: r.height, checkpoint: r.checkpoint.height, time: r.time });
        else if (r.status === 'explorers') set({ state: 'explorers', height: r.height, explorers: r.explorers });
        else if (r.status === 'failed') set({ state: 'failed', kind: r.kind });
        else if (r.status === 'pending') set({ state: 'pending' });
        else set({ state: 'unreachable', ...(height === undefined ? {} : { height }) });
      } catch {
        set({ state: 'unreachable', ...(height === undefined ? {} : { height }) });
      }
    })();
    // p and stamp are recomputed every render from `proof`; `key` names them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, stamp?.status, stamp?.otsUrl, stamp?.height]);

  return {
    row: row ?? idle,
    run: stamp?.status === 'bitcoin' ? run : undefined,
  };
};
