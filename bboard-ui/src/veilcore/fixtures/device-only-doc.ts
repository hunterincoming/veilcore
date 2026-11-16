// A document as /documents/new seals it, with something typed in every field, for the tests of
// documents kept on this device only (docs/device-only-records.md).
// SPDX-License-Identifier: Apache-2.0

import type { FakeRegistry } from './fake-registry';
import { fileOf, settle, type Browser } from './browsers';

/** Something typed into every field a document has: none of it may be in any request. */
export const MARKERS = [
  'Residency permit 0042',
  'Practice Authority of Nowhere',
  'REF-7781-ZZ',
  'Association Held-By-Marker',
  'notes nobody outside may read',
  'permit-scan-marker.pdf',
];
export const FILE_SHA = 'ab'.repeat(32);
export const RECORDS = 'veilcore.records.v1';
export const DEVICE_ONLY_STORE = 'veilcore.device-only.v1';

export const sealDoc = (b: Browser, title = MARKERS[0]) =>
  b.run(async () => {
    const { sealDocumentRecord } = await import('../seal-record');
    return sealDocumentRecord({
      title,
      type: 'permit',
      issuer: MARKERS[1],
      reference: MARKERS[2],
      issued: '2026-11-01',
      files: [{ name: MARKERS[5], sha256: FILE_SHA, size: 1234 }],
      about: [],
      holder: MARKERS[3],
      notes: MARKERS[4],
    });
  });

export const until = async (check: () => boolean | Promise<boolean>, ms = 5000) => {
  const end = Date.now() + ms;
  while (!(await check())) {
    if (Date.now() > end) throw new Error('still not true');
    await settle(20);
  }
};

export const pathOf = (url: string) => new URL(url).pathname;

/** Seal a document kept on this device only, and wait for its dating row to go. */
export const sealOnDevice = async (reg: FakeRegistry, b: Browser, title?: string) => {
  const sealed = await sealDoc(b, title);
  return b.run(async () => {
    const r = b.m.records.createRecord({ ...sealed, deviceOnly: true });
    await until(() =>
      reg.sent.some((p) => p.method === 'PUT' && pathOf(p.url) === '/api/records/dating' && p.body.includes(r.id)),
    );
    await settle(100);
    return r;
  });
};

export const backupText = (b: Browser) => b.run(() => b.m.backup.backupFileText());
/** Save a backup in this browser and check it, as the backup step does. */
export const backUp = async (b: Browser) => {
  const text = await backupText(b);
  const out = await b.run(() => b.m.backup.checkBackup(fileOf(text)));
  return { text, out };
};

/**
 * Of this record, the registry was sent its dating row and nothing else: no request names what
 * was typed or the mark, no save of the record set names the record, and every write that names
 * it is the three-field dating row.
 */
export const nothingLeft = (reg: FakeRegistry, record: { id: string }): string[] => {
  const problems: string[] = [];
  for (const r of reg.sent) {
    const all = `${r.url}\n${r.body}`;
    for (const m of [...MARKERS, 'deviceOnly', FILE_SHA])
      if (all.includes(m)) problems.push(`${r.method} ${pathOf(r.url)} carries ${m}`);
    if (r.method === 'GET' || !all.includes(record.id)) continue;
    if (pathOf(r.url) !== '/api/records/dating') problems.push(`${r.method} ${pathOf(r.url)} names the record`);
    else
      for (const row of JSON.parse(r.body) as Record<string, unknown>[])
        for (const k of Object.keys(row))
          if (!['id', 'recordFingerprint', 'keyBinding'].includes(k)) problems.push(`the dating row carries ${k}`);
  }
  return problems;
};
