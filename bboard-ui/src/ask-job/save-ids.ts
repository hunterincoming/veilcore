// Saving the IDs typed in Add IDs (components/ask/AddIds.tsx), one correction per young. What the
// screen showed was checked against the records this tab had then; another device may have
// saved since (verification X6). So before each correction the records are read afresh, the
// boxes rebuilt from them and every rule checked again (an ID twice, one a young of the litter
// has, one another of the person's animals has); if anything differs from what the person saw,
// nothing more is sent and the screen shows what changed. Corrections already made stay made.
//
// The read must reach the registry (verification X6b): offline, or when it answers a read with
// an error, this browser's copy can't show what another device saved, so nothing is saved and the
// person is told to try again online. Two devices online pressing Save in the same second can
// still each read before the other's write lands; after the last correction the records are read
// once more, and an ID now on two animals is said, naming both, so it is fixed the same day.
// SPDX-License-Identifier: Apache-2.0

import type { StrainRecord } from '../veilcore/records';
import { checkBoxes, otherIds, rowsOfLitter, type IdRow, type Litter } from './ids';
import { isAnimal } from '../veilcore/animal-profile';
import { isReceivedRecord } from '../ask/hint';

/** What saving needs of records.ts, passed in so two devices can be tested side by side. */
export type RecordsApi = {
  /** Read from the registry: true only when it answered (records.ts refresh). */
  refresh: () => Promise<boolean>;
  allRecords: () => readonly StrainRecord[];
  issueCorrection: (id: string, edits: Partial<StrainRecord>, reason: string) => Promise<StrainRecord | undefined>;
};

/** An ID the save used, now on another live animal too (a same-second save on another device). */
export type Clash = { readonly id: string; readonly names: readonly string[] };

export type SaveIdsResult =
  | { readonly saved: number; readonly clashes?: readonly Clash[]; readonly unchecked?: true }
  /** The registry couldn't be read: nothing more sent. */
  | { readonly offline: true; readonly saved: number }
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
  const used: string[] = [];
  for (;;) {
    // Right before each correction: what other devices and tabs did meanwhile, from the registry.
    if (!(await api.refresh())) return { offline: true, saved: done.size };
    const now = checkNow(litter, values, api.allRecords());
    const left = shown.filter(([r]) => !done.has(r.key));
    if (Object.keys(now.errors).length || key(now.pairs) !== key(left)) return { changed: true, saved: done.size };
    const next = now.pairs[0];
    if (!next) return done.size ? { saved: done.size, ...(await afterwards(used, api)) } : { saved: 0 };
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
    used.push(id);
  }
};

/** Read once more after saving: an ID the save used that is now on two live animals, by name. */
const afterwards = async (
  used: readonly string[],
  api: RecordsApi,
): Promise<{ clashes?: Clash[]; unchecked?: true }> => {
  if (!(await api.refresh())) return { unchecked: true };
  const live = api
    .allRecords()
    .filter((r) => isAnimal(r) && !isReceivedRecord(r) && !r.supersededBy && r.refId?.trim());
  const clashes: Clash[] = [];
  for (const id of used) {
    const on = live.filter((r) => r.refId!.trim().toUpperCase() === id.toUpperCase());
    if (on.length > 1) clashes.push({ id, names: on.map((r) => r.strainName) });
  }
  return clashes.length ? { clashes } : {};
};
