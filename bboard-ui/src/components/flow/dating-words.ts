// "Record dated: in the next batch (about every 5 minutes on the test network)".
//
// Dating first (CONTRACT.md #38): a record's proof code is sent to VeilCore the moment it is
// sealed, before its locked copy (which waits for a checked backup), so it is in the next
// batch whatever else is still to do. How often a batch is dated is the anchoring job's own
// setting, read from the fee service's public status (sponsor/src/anchorer.ts publicStatus:
// `everyMinutes`) on a test build. Where that isn't known (a build with no fee service: on
// veilcore.org batches are anchored by hand) the line says "in the next batch" and no time.
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState } from 'react';
import { enT, type Translator } from '../../i18n/translate';
import { SPONSOR_URL } from '../../veilcore/chain/config';
import { isTestNetwork } from '../../config/network';

let cadence: number | undefined;
let asked: Promise<number | undefined> | undefined;

/** The anchoring job's interval in minutes, from the fee service's status, if it says. */
export const anchorCadence = (fetchFn: typeof fetch = fetch): Promise<number | undefined> =>
  (asked ??= (async () => {
    if (!SPONSOR_URL) return undefined;
    try {
      const r = await fetchFn(`${SPONSOR_URL}/sponsor/status`, { signal: AbortSignal.timeout(8000) });
      if (!r.ok) return undefined;
      const s = (await r.json()) as { anchorer?: { enabled?: unknown; everyMinutes?: unknown } };
      const n = s.anchorer?.enabled === true ? s.anchorer.everyMinutes : undefined;
      cadence = typeof n === 'number' && Number.isInteger(n) && n > 0 && n <= 24 * 60 ? n : undefined;
      return cadence;
    } catch {
      return undefined;
    }
  })());

/** The cadence for a screen: undefined until (and unless) the fee service says. */
export const useAnchorCadence = (): number | undefined => {
  const [n, setN] = useState<number | undefined>(cadence);
  useEffect(() => {
    let live = true;
    void anchorCadence().then((v) => live && setN(v));
    return () => {
      live = false;
    };
  }, []);
  return n;
};

/** The record's date line while its proof code waits for the next batch. */
export const nextBatchWords = (tr: Translator = enT, minutes: number | undefined = cadence): string =>
  minutes !== undefined && isTestNetwork()
    ? tr.tp('app.log.recordDatedNext', minutes)
    : tr.t('app.log.recordDatedNextPlain');

/** The same, as the plant page's "Record dated" value and its small line. */
export const nextBatchRow = (
  tr: Translator = enT,
  minutes: number | undefined = cadence,
): { value: string; sub?: string } =>
  minutes !== undefined && isTestNetwork()
    ? { value: tr.t('app.plant.nextBatch'), sub: tr.tp('app.plant.nextBatchEvery', minutes) }
    : { value: tr.t('app.plant.nextBatch') };

/** For tests: forget what the fee service said. */
export const __resetCadenceForTests = (): void => {
  cadence = undefined;
  asked = undefined;
};
