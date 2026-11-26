// What a holder has, item by item, in one canonical form, for the backup restore drill: the unit
// drill (veilcore/restore-drill.test.ts) and the browser drill (e2e/backup-restore-drill.spec.ts,
// through RestoreDrillFixture.tsx) compare two browsers with it, byte for byte. Only tests use it.
// SPDX-License-Identifier: Apache-2.0

import type { RecordKeys } from '../veilcore/record-keys';
import type { StrainRecord } from '../veilcore/records';
import type { License, OnChainLicense } from '../veilcore/licenses';
import type { HeldLicense } from '../veilcore/held-licenses';
import type { AttesterProfile } from '../veilcore/attester-keys';

export type SnapshotSource = {
  readonly holderKey: string | null;
  readonly vaultKey: string | null;
  readonly keys: readonly RecordKeys[];
  readonly records: readonly StrainRecord[];
  readonly licenses: readonly License[];
  readonly issuerDeals: Readonly<Record<string, OnChainLicense>>;
  readonly held: readonly HeldLicense[];
  readonly lab: AttesterProfile | null;
  readonly deviceOnly: readonly string[];
  readonly revs: Readonly<Record<string, number>>;
};

/** JSON with every object's keys sorted: the same data gives the same bytes, whatever the order. */
export const canon = (v: unknown): string =>
  JSON.stringify(v ?? null, (_k, x: unknown) =>
    x && typeof x === 'object' && !Array.isArray(x)
      ? Object.fromEntries(Object.entries(x as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : 1)))
      : x,
  );

/** A "backed up" mark is about the browser, not the holder's data. */
const withoutMarks = (v: object): Record<string, unknown> =>
  Object.fromEntries(Object.entries(v).filter(([k]) => k !== 'backedUpAt' && k !== 'backedUpVia'));

/**
 * Item by item. Left out: when something was last backed up (a mark about the browser, not the
 * holder's data) and a record's empty licence list (createRecord's default, never saved). A
 * record's sealed copy of its own keys (`secrets`) is compared with the keys instead.
 */
export const snapshotOf = (s: SnapshotSource): Record<string, string> => {
  const out: Record<string, string> = {};
  out.holderKey = s.holderKey ?? '';
  out.vaultKey = s.vaultKey ?? '';
  const keysById = new Map(s.keys.map((k) => [k.recordId, k]));
  for (const k of s.keys) {
    out[`keys ${k.recordId}`] = canon(withoutMarks(k));
  }
  for (const r of s.records) {
    const { secrets, licenseIds, ...rest } = r as StrainRecord & { secrets?: { recordSecret?: string } };
    if (secrets && secrets.recordSecret !== keysById.get(r.id)?.recordSecret)
      out[`secrets ${r.id}`] = 'not the record’s keys';
    out[`record ${r.id}`] = canon({ ...rest, ...(licenseIds?.length ? { licenseIds } : {}) });
  }
  for (const l of s.licenses) out[`license ${l.id}`] = canon(l);
  for (const [id, d] of Object.entries(s.issuerDeals)) out[`license keys ${id}`] = canon(d);
  for (const h of s.held) {
    out[`held license ${h.inviteId}`] = canon(withoutMarks(h));
  }
  if (s.lab) out.labKey = canon(s.lab);
  out.deviceOnly = canon([...s.deviceOnly].sort());
  out.revs = canon(s.revs);
  return out;
};

/** The items that differ between two snapshots, each with the fields that differ. */
export const differ = (a: Record<string, string>, b: Record<string, string>): string[] =>
  [...new Set([...Object.keys(a), ...Object.keys(b)])]
    .filter((k) => a[k] !== b[k])
    .sort()
    .map((k) => {
      const x = (a[k]?.startsWith('{') ? JSON.parse(a[k]) : {}) as Record<string, unknown>;
      const y = (b[k]?.startsWith('{') ? JSON.parse(b[k]) : {}) as Record<string, unknown>;
      const fields = [...new Set([...Object.keys(x), ...Object.keys(y)])].filter((f) => canon(x[f]) !== canon(y[f]));
      return fields.length ? `${k}: ${fields.join(', ')}` : k;
    });
