// "Breeding history (draft)": one .zip from a record and its linked ancestors held in this
// browser (product-ideas.md #2, mapping.md):
//
//   breeding-history-<id>/breeding-history.html   genealogy, one row per record, blank boxes,
//                                                 under three plain headings (html.ts)
//   breeding-history-<id>/COVER-NOTE.html         one page: what this is, shows, doesn't
//   breeding-history-<id>/evidence/<id>-evidence/ each record's evidence bundle, unchanged
//                                                 (evidence/bundle.ts)
//
// The evidence bundles are made exactly as the plant page's "Download evidence bundle"
// makes them, with neither the record's key nor the lab report file in them (those are the
// holder's choice, one record at a time, on the plant page).
// SPDX-License-Identifier: Apache-2.0

import { strToU8 } from 'fflate';
import type { StrainRecord } from '../records';
import { isHex64 } from '../key-binding';
import { sentByMe, type SentTransfer } from '../transfers';
import {
  BundleRefusal,
  bundleFiles,
  lockedParentsOf,
  bundleFolder,
  buildEvidence,
  gatherEvidence,
  safeFileName,
  zipFiles,
  type Gathered,
} from '../evidence/bundle';
import { isString } from '../json';
import { COVER_FILE, HISTORY_FILE, breedingHistoryHtml, coverNoteHtml, type RowFacts } from './html';
import { walkHistory, MAX_HISTORY_RECORDS, type BreedingHistory } from './walk';

export type HistoryDeps = {
  /** A record held in this browser, by ID. */
  readonly lookup: (id: string) => StrainRecord | undefined;
  /** What the registry has for one record (evidence/bundle.ts gatherEvidence). */
  readonly gather: (record: StrainRecord) => Promise<Gathered | { error: string }>;
  /** The holder's sent deliveries, for the sample details in each bundle (transfers.ts sentByMe). */
  readonly deliveries: () => Promise<readonly SentTransfer[]>;
  /** Records held here that date a lab report of this plant (components/stage/lab-report-notes.ts datedReportsOf). */
  readonly labDatingsOf?: (plantId: string) => readonly StrainRecord[];
  readonly now?: Date;
  readonly limit?: number;
  /** The holder's records this browser can't open, by id: left out and counted, never shown as someone else's. */
  readonly locked?: ReadonlySet<string>;
};

/** Thrown with words for the holder; nothing is downloaded. */
export class HistoryRefusal extends Error {}

export const historyFolder = (rootId: string): string => `breeding-history-${safeFileName(rootId)}`;
export const historyZipName = (rootId: string): string => `${historyFolder(rootId)}.zip`;

const stampOf = (g: Gathered): RowFacts['stamp'] => {
  const anchor = g.batch?.anchor ?? null;
  if (anchor && isString(anchor.network))
    return {
      kind: 'stamped',
      network: anchor.network,
      at: isString(anchor.anchoredAt) ? anchor.anchoredAt : null,
      test: anchor.network !== 'mainnet',
    };
  if (g.batch) return { kind: 'batch-only' };
  return { kind: 'none', ...(g.proofRefused ? { proofRefused: true } : {}) };
};

export type HistoryExport = {
  readonly history: BreedingHistory;
  readonly facts: ReadonlyMap<string, RowFacts>;
  /** Every file, by path inside the zip. */
  readonly files: Record<string, Uint8Array>;
};

/** Walk, gather, and make every file. One registry look-up per record, one at a time. */
export const breedingHistoryFiles = async (root: StrainRecord, deps: HistoryDeps): Promise<HistoryExport> => {
  const now = deps.now ?? new Date();
  const history = walkHistory(root, deps.lookup, deps.limit ?? MAX_HISTORY_RECORDS, deps.locked);
  const top = historyFolder(root.id);
  const files: Record<string, Uint8Array> = {};
  const facts = new Map<string, RowFacts>();
  let deliveries: readonly SentTransfer[] | null = null;

  for (const node of history.nodes) {
    const r = node.record;
    if (!isHex64(r.recordFingerprint ?? '')) {
      facts.set(r.id, {
        stamp: { kind: 'unsealed' },
        bundle: { refused: 'This record isn’t sealed yet, so there is nothing to check.' },
      });
      continue;
    }
    const gathered = await deps.gather(r);
    if ('error' in gathered) throw new HistoryRefusal(gathered.error);
    const stamp = stampOf(gathered);
    deliveries ??= await deps.deliveries();
    try {
      const lockedParents = lockedParentsOf(r, deps.locked ?? new Set());
      const ev = await buildEvidence(r, gathered, { includeKey: false, deliveries, now });
      const bundle = await bundleFiles(ev, gathered, {
        includeKey: false,
        now,
        ...(lockedParents ? { lockedParents } : {}),
      });
      for (const [path, bytes] of Object.entries(bundle)) {
        const at = `${top}/evidence/${path}`;
        if (files[at]) throw new HistoryRefusal('The breeding history couldn’t be made. Nothing was downloaded.');
        files[at] = bytes;
      }
      facts.set(r.id, { stamp, bundle: { folder: bundleFolder(r.id) } });
    } catch (e) {
      if (e instanceof HistoryRefusal) throw e;
      if (!(e instanceof BundleRefusal)) throw e;
      // A record no bundle can be made for still gets its row, saying why.
      facts.set(r.id, { stamp, bundle: { refused: e.message.replace(/ Nothing was downloaded\.$/, '') } });
    }
  }

  const labDatings = new Map<string, string[]>();
  for (const node of history.nodes) {
    const ids = (deps.labDatingsOf?.(node.record.id) ?? []).map((d) => d.id);
    if (ids.length) labDatings.set(node.record.id, ids);
  }
  const pages = { history, facts, madeAt: now, labDatings };
  files[`${top}/${HISTORY_FILE}`] = strToU8(breedingHistoryHtml(pages));
  files[`${top}/${COVER_FILE}`] = strToU8(coverNoteHtml(pages));
  return { history, facts, files };
};

/** Make the zip and download it. Returns words for the holder on any refusal. */
export const downloadBreedingHistory = async (
  root: StrainRecord,
  deps: Partial<HistoryDeps> & Pick<HistoryDeps, 'lookup'>,
): Promise<{ ok: true; name: string } | { error: string }> => {
  let zip: Uint8Array;
  try {
    const out = await breedingHistoryFiles(root, {
      gather: (r) => gatherEvidence(r),
      deliveries: () => sentByMe(),
      ...deps,
    });
    zip = zipFiles(out.files, deps.now ?? new Date());
  } catch (e) {
    return {
      error: e instanceof HistoryRefusal ? e.message : 'The breeding history couldn’t be made. Nothing was downloaded.',
    };
  }
  const name = historyZipName(root.id);
  const url = URL.createObjectURL(new Blob([zip as unknown as BlobPart], { type: 'application/zip' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { ok: true, name };
};
