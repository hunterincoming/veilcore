// What this browser keeps about collection imports (bulk-import.ts): which rows became which
// records. Apart from the importer so Home can read it (which plants came from an import,
// and so have their key date stamps queued) without loading the file readers.
// SPDX-License-Identifier: Apache-2.0

import type { StrainRecord } from './records';

export const LEDGER_KEY = 'veilcore.bulk-import.v1';

export type LedgerEntry = {
  readonly recordId: string;
  readonly fingerprint: string;
  readonly state: 'pending' | 'sealed';
  readonly at: number;
  /** The whole record while it is waiting to be confirmed (it is what the registry gets anyway). */
  readonly record?: StrainRecord;
};

export type Ledger = { version: 1; rows: Record<string, LedgerEntry> };

export const loadLedger = (): Ledger => {
  try {
    const v = JSON.parse(localStorage.getItem(LEDGER_KEY) ?? 'null') as Ledger | null;
    if (v && v.version === 1 && v.rows && typeof v.rows === 'object') return v;
  } catch {
    /* nothing kept, or unreadable: start empty */
  }
  return { version: 1, rows: {} };
};

/** False when this browser won't keep it (private window, full storage). */
export const saveLedger = (l: Ledger): boolean => {
  try {
    localStorage.setItem(LEDGER_KEY, JSON.stringify(l));
    return true;
  } catch {
    return false;
  }
};

/** Every record an import in this browser made, oldest first. */
export const importedRecordIds = (ledger: Ledger = loadLedger()): string[] =>
  Object.values(ledger.rows)
    .filter((e) => e.state === 'sealed' && typeof e.recordId === 'string')
    .sort((a, b) => (a.at ?? 0) - (b.at ?? 0))
    .map((e) => e.recordId);
