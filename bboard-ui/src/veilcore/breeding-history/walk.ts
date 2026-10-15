// The breeding history's records: from one record, its linked ancestors held in this
// browser, one row each, oldest generation first (product-ideas.md #2).
//
// Three kinds of parent, never mixed up:
//   held     a linked record in this browser: it gets a row, and its own parents are walked.
//   theirs   a linked record that isn't in this browser: someone else holds it. Listed by the
//            id and name as sealed, never given a row or a bundle here.
//   named    a parent the breeder typed in with no record behind it.
// Links can loop (a record listed as its own ancestor): every record is visited once, and
// the link that closes a loop is kept and marked, not followed.
// SPDX-License-Identifier: Apache-2.0

import type { StrainRecord } from '../records';

/**
 * The most records one export walks. The registry gives each holder 20 evidence downloads a
 * minute, and every record in the history needs one; the rest of a longer history is listed
 * as left out, with its record IDs, rather than refused or half-made.
 */
export const MAX_HISTORY_RECORDS = 15;

export type ParentLink =
  | { readonly kind: 'held'; readonly recordId: string; readonly name: string; readonly loops: boolean }
  | { readonly kind: 'theirs'; readonly recordId: string; readonly name: string }
  | { readonly kind: 'named'; readonly name: string }
  | { readonly kind: 'left-out'; readonly recordId: string; readonly name: string };

export type HistoryNode = {
  readonly record: StrainRecord;
  /** 1 is the oldest generation; the record the export started from is the last row. */
  readonly row: number;
  /** Steps from the starting record, by the longest path (0 for the starting record). */
  readonly depth: number;
  readonly parents: readonly ParentLink[];
};

/** A parent that isn't a row here, with the rows that name it. */
export type OutsideParent = {
  readonly kind: 'theirs' | 'named' | 'left-out';
  readonly name: string;
  readonly recordId?: string;
  readonly namedBy: readonly number[];
};

export type BreedingHistory = {
  readonly root: StrainRecord;
  /** In row order: oldest generation first, the starting record last. */
  readonly nodes: readonly HistoryNode[];
  readonly outside: readonly OutsideParent[];
  /** Some link closes a loop. */
  readonly loops: boolean;
};

/** A link before loops are found. */
type RawLink =
  | { readonly kind: 'held'; readonly recordId: string; readonly name: string }
  | Exclude<ParentLink, { kind: 'held' }>;

const nameOf = (name: unknown): string => (typeof name === 'string' && name.trim() ? name.trim() : '(no name)');

export const walkHistory = (
  root: StrainRecord,
  lookup: (id: string) => StrainRecord | undefined,
  limit: number = MAX_HISTORY_RECORDS,
): BreedingHistory => {
  // Nearest generations first, so a history longer than the limit keeps the newest steps.
  const held = new Map<string, StrainRecord>([[root.id, root]]);
  const links = new Map<string, RawLink[]>();
  const queue: StrainRecord[] = [root];
  while (queue.length) {
    const r = queue.shift() as StrainRecord;
    const out: RawLink[] = [];
    for (const p of Array.isArray(r.parents) ? r.parents : []) {
      const name = nameOf(p?.name);
      const id = typeof p?.recordId === 'string' && p.recordId.trim() ? p.recordId.trim() : null;
      if (!id) {
        out.push({ kind: 'named', name });
        continue;
      }
      if (held.has(id)) {
        out.push({ kind: 'held', recordId: id, name });
        continue;
      }
      const found = lookup(id);
      if (!found || found.id !== id) out.push({ kind: 'theirs', recordId: id, name });
      else if (held.size >= limit) out.push({ kind: 'left-out', recordId: id, name });
      else {
        held.set(id, found);
        queue.push(found);
        out.push({ kind: 'held', recordId: id, name });
      }
    }
    links.set(r.id, out);
  }

  // Which held links close a loop: a depth-first walk from the starting record; a link to a
  // record still on the current path is one.
  const loopEdges = new Set<string>();
  const state = new Map<string, 'open' | 'done'>();
  const visit = (id: string) => {
    state.set(id, 'open');
    for (const l of links.get(id) ?? []) {
      if (l.kind !== 'held') continue;
      const s = state.get(l.recordId);
      if (s === 'open') loopEdges.add(`${id}\u0000${l.recordId}`);
      else if (s === undefined) visit(l.recordId);
    }
    state.set(id, 'done');
  };
  visit(root.id);

  // Depth: the longest path from the starting record, loops cut.
  const depth = new Map<string, number>([[root.id, 0]]);
  const order: string[] = [];
  const seen = new Set<string>();
  const topo = (id: string) => {
    seen.add(id);
    for (const l of links.get(id) ?? [])
      if (l.kind === 'held' && !loopEdges.has(`${id}\u0000${l.recordId}`) && !seen.has(l.recordId)) topo(l.recordId);
    order.push(id);
  };
  topo(root.id);
  for (const id of order.reverse()) {
    const d = depth.get(id) ?? 0;
    for (const l of links.get(id) ?? []) {
      if (l.kind !== 'held' || loopEdges.has(`${id}\u0000${l.recordId}`)) continue;
      if ((depth.get(l.recordId) ?? -1) < d + 1) depth.set(l.recordId, d + 1);
    }
  }

  const sorted = [...held.values()].sort(
    (a, b) =>
      (depth.get(b.id) ?? 0) - (depth.get(a.id) ?? 0) ||
      (a.loggedAt ?? 0) - (b.loggedAt ?? 0) ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
  const rowOf = new Map(sorted.map((r, i) => [r.id, i + 1]));
  const nodes: HistoryNode[] = sorted.map((r) => ({
    record: r,
    row: rowOf.get(r.id) as number,
    depth: depth.get(r.id) ?? 0,
    parents: (links.get(r.id) ?? []).map(
      (l): ParentLink => (l.kind === 'held' ? { ...l, loops: loopEdges.has(`${r.id}\u0000${l.recordId}`) } : l),
    ),
  }));

  const outside = new Map<string, OutsideParent & { namedBy: number[] }>();
  for (const n of nodes) {
    for (const l of n.parents) {
      if (l.kind === 'held') continue;
      const key = l.kind === 'named' ? `named\u0000${l.name}` : `${l.kind}\u0000${l.recordId}`;
      const o = outside.get(key) ?? {
        kind: l.kind,
        name: l.name,
        ...(l.kind === 'named' ? {} : { recordId: l.recordId }),
        namedBy: [],
      };
      if (!o.namedBy.includes(n.row)) o.namedBy.push(n.row);
      outside.set(key, o);
    }
  }

  return { root, nodes, outside: [...outside.values()], loops: loopEdges.size > 0 };
};
