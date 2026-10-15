// Key date stamps for an imported collection, one at a time, while the page is open.
//
// On a test build each record's key is date stamped from this browser, and the fee
// service pays (LogFlow.tsx, Stamp). It gives each browser and each network only a few
// a day, so a collection's key stamps arrive over days, not minutes. This queue sends one,
// waits for it, then the next; when the fee service says "not now" it waits as long as it
// was told (kept in this browser, so a reopened page waits too). A stamp that may have
// gone out stops the queue: sending again could send it twice. Each plant's own page can
// still do its stamp at any time; the queue skips any that already have one.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useRef, useState } from 'react';
import { getRecord } from '../../veilcore/records';
import { ensureKeysFor, hexBytes, setAnchor, useRecordKeys } from '../../veilcore/record-keys';
import { CHAIN_CONTRACT } from '../../veilcore/chain/config';
import { NETWORK } from '../../config/network';
import { loadStampState, saveStampState, stampWait, type StampQueueState } from '../../veilcore/bulk-import';

export type KeyStampQueue = {
  readonly total: number;
  readonly stamped: number;
  /** The plant being stamped now, and the latest progress line. */
  readonly current?: { name: string; progress?: string };
  readonly pauseUntil?: number;
  readonly stopped?: string;
  /** Go on after a stop the holder has checked. */
  readonly resume: () => void;
};

export const useKeyStampQueue = (recordIds: readonly string[], enabled: boolean): KeyStampQueue => {
  const keys = useRecordKeys();
  const [state, setStateRaw] = useState<StampQueueState>(loadStampState);
  const [current, setCurrent] = useState<{ name: string; progress?: string }>();
  const [tick, setTick] = useState(0);
  const busy = useRef(false);
  const alive = useRef(true);
  // Set again on (re)mount: React's development mode mounts twice.
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const setState = (s: StampQueueState) => {
    saveStampState(s);
    setStateRaw(s);
  };

  const withKeys = recordIds.filter((id) => keys[id]);
  const waiting = withKeys.filter((id) => !keys[id]?.anchor);
  const next = waiting[0];
  const paused = state.pauseUntil !== undefined && Date.now() < state.pauseUntil;

  // Wake up when a pause ends (checked at least every minute, so a long pause is not one huge timer).
  useEffect(() => {
    if (!enabled || !paused || state.pauseUntil === undefined) return;
    const t = window.setTimeout(() => setTick((n) => n + 1), Math.min(state.pauseUntil - Date.now() + 500, 60_000));
    return () => window.clearTimeout(t);
  }, [enabled, paused, state.pauseUntil, tick]);

  useEffect(() => {
    if (!enabled || !next || paused || state.stopped || busy.current) return;
    busy.current = true;
    const record = getRecord(next) ?? { id: next };
    const name = 'strainName' in record && record.strainName ? record.strainName : next;
    setCurrent({ name });
    void (async () => {
      try {
        // The key the record named when it was sealed, never a new one.
        const k = ensureKeysFor(record);
        const { anchorOnChain, identityOf } = await import('../../veilcore/chain/actions');
        const secret = hexBytes(k.recordSecret);
        const receipt = await anchorOnChain(secret, hexBytes(k.recoverySecret), {
          progress: (p) => alive.current && setCurrent({ name, progress: p }),
        });
        setAnchor(next, {
          identity: identityOf(secret),
          network: NETWORK,
          contractAddress: CHAIN_CONTRACT ?? '',
          txId: receipt.txId,
          txHash: receipt.txHash,
          blockHeight: receipt.blockHeight,
          anchoredAt: receipt.blockTime,
        });
        if (state.pauseUntil !== undefined) setState({});
      } catch (e) {
        // The fee service's refusal carries how long to wait (retryAfterSeconds).
        setState(stampWait(e));
      } finally {
        busy.current = false;
        if (alive.current) {
          setCurrent(undefined);
          setTick((n) => n + 1);
        }
      }
    })();
  }, [enabled, next, paused, state.stopped, tick]);

  return {
    total: withKeys.length,
    stamped: withKeys.length - waiting.length,
    current,
    pauseUntil: paused ? state.pauseUntil : undefined,
    stopped: state.stopped,
    resume: () => setState({}),
  };
};
