// Saving the IDs typed in Add IDs (components/ask/AddIds.tsx), one correction per young. What the
// screen showed was checked against the records this tab had then; another device may have
// saved since (verification X6). So before each correction the records are read afresh, the
// boxes rebuilt from them and every rule checked again (an ID twice, one a young of the litter
// has, one another of the person's animals has); if anything differs from what the person saw,
// nothing more is sent and the screen shows what changed. Corrections already made stay made.
// SPDX-License-Identifier: Apache-2.0

import type { StrainRecord } from '../veilcore/records';
import { checkBoxes, otherIds, rowsOfLitter, type IdRow, type Litter } from './ids';

/** What saving needs of records.ts, passed in so two devices can be tested side by side. */
export type RecordsApi = {
  hydrate: () => Promise<void>;
  allRecords: () => readonly StrainRecord[];
  issueCorrection: (id: string, edits: Partial<StrainRecord>, reason: string) => Promise<StrainRecord | undefined>;
};

export type SaveIdsResult =
  | { readonly saved: number }
  /** Something changed on another device or tab since the screen was drawn: nothing more sent. */
  | { readonly changed: true; readonly saved: number }
  /** A young's record isn't here any more. */
  | { readonly gone: string; readonly saved: number };

/** The boxes and their checks, from the records as they are now. */
export const checkNow = (
  litter: Pick<Litter, 'young'>,
  values: Readonly<Record<string, string>>,
  all: readonly StrainRecord[],
) => {
  const rows = rowsOfLitter(litter, all);
  return { rows, ...checkBoxes(rows, values, otherIds(all, rows)) };
};

const key = (pairs: readonly (readonly [IdRow, string])[]) =>
  pairs.map(([r, id]) => `${r.key}=${id.toUpperCase()}`).join('|');

/**
 * Save each young's ID as the person saw it (`shown`: the pairs on screen when Save was pressed),
 * one correction at a time, each only after the records are read afresh and every check passes
 * again with the same result.
 */
export const saveIds = async (
  litter: Pick<Litter, 'young'>,
  values: Readonly<Record<string, string>>,
  shown: readonly (readonly [IdRow, string])[],
  scheme: string,
  reason: string,
  api: RecordsApi,
): Promise<SaveIdsResult> => {
  const done = new Set<string>();
  for (;;) {
    // Right before each correction: what other devices and tabs did meanwhile.
    await api.hydrate();
    const now = checkNow(litter, values, api.allRecords());
    const left = shown.filter(([r]) => !done.has(r.key));
    if (Object.keys(now.errors).length || key(now.pairs) !== key(left)) return { changed: true, saved: done.size };
    const next = now.pairs[0];
    if (!next) return { saved: done.size };
    const [row, id] = next;
    if (!row.record) return { gone: row.name, saved: done.size };
    const fixed = await api.issueCorrection(
      row.record.id,
      {
        refId: id,
        animal: {
          breed: row.record.animal?.breed ?? '',
          herd: row.record.animal?.herd ?? '',
          sex: row.record.animal?.sex ?? 'unknown',
          idScheme: scheme.trim(),
        },
      },
      reason,
    );
    if (!fixed) return { gone: row.name, saved: done.size };
    done.add(row.key);
  }
};
