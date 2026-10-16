// Everything VeilCore's registry holds for this browser's holder key, in one file
// (GET /api/export, round 5). Records, licences, sharing choices, each record's inclusion
// proof and the batches they belong to, so leaving VeilCore never means losing anything.
// Lab reports are not in it: they are locked files, opened from the plant's page.
// The registry allows a few exports a minute per holder key.
//
// The registry holds records and licences sealed (vault.ts), so the file would be mostly
// ciphertext. They are opened here, in the browser, before the file is written; a row this
// browser has no key for keeps its `sealed` and a note saying why.
// SPDX-License-Identifier: Apache-2.0

import { holderKeyIfAny } from './holder';
import { readJson, isObject, isString } from './json';
import { isSealedRow, openRow, type RowKind } from './vault';

/** Said in the file beside a row this browser couldn't open. */
export const LOCKED_ROW_NOTE =
  'Sealed with a key this browser does not have, so it is left as the registry holds it. Restore the backup file that has the key, then download again.';
/** Said at the top of the file. */
export const OPENED_NOTE =
  'Records and licenses were opened in your browser with your vault key before this file was saved. VeilCore holds them sealed and cannot read them.';

const openAll = async (kind: RowKind, rows: unknown): Promise<{ rows: unknown[]; locked: number }> => {
  if (!Array.isArray(rows)) return { rows: [], locked: 0 };
  let locked = 0;
  const out: unknown[] = [];
  for (const row of rows) {
    if (!isObject(row) || !isString(row.id) || !isSealedRow(row)) {
      out.push(row);
      continue;
    }
    const opened = await openRow(kind, row.id, row.sealed);
    if (!opened.ok) {
      locked++;
      out.push({ ...row, note: LOCKED_ROW_NOTE });
      continue;
    }
    // The registry's own public fields on top of what was sealed, as api-store.ts does.
    const { sealed: _sealed, ...pub } = row;
    void _sealed;
    const sealedPart = opened.value;
    const full = kind === 'records' && isObject(sealedPart.supersedes) ? { supersedes: sealedPart.supersedes } : {};
    out.push({ ...sealedPart, ...pub, ...full });
  }
  return { rows: out, locked };
};

/**
 * The export as the holder should keep it: every row this browser can open, opened. A
 * file that isn't the export's JSON is passed on as it came.
 */
export const openExport = async (text: string): Promise<string> => {
  let v: unknown;
  try {
    v = JSON.parse(text);
  } catch {
    return text;
  }
  if (!isObject(v)) return text;
  const records = await openAll('records', v.records);
  const licenses = await openAll('licenses', v.licenses);
  return JSON.stringify(
    {
      ...v,
      opened: OPENED_NOTE,
      ...(records.locked + licenses.locked ? { lockedRows: records.locked + licenses.locked } : {}),
      records: records.rows,
      licenses: licenses.rows,
    },
    null,
    2,
  );
};

const BASE = import.meta.env.VITE_API_BASE ?? '';

export const REGISTRY_EXPORT_NAME = 'veilcore-export.json';

/** Fetch the export. No holder key here means nothing has been saved to the registry from this browser. */
export const fetchRegistryExport = async (
  fetcher: typeof fetch = fetch,
): Promise<{ blob: Blob } | { error: string }> => {
  const key = holderKeyIfAny();
  if (!key)
    return { error: 'Nothing has been saved to VeilCore from this browser yet, so there is nothing to download.' };
  let res: Response;
  try {
    res = await fetcher(`${BASE}/api/export`, { headers: { 'x-holder-key': key }, cache: 'no-store' });
  } catch {
    return { error: 'Couldn’t reach VeilCore. Check your connection and try again.' };
  }
  if (res.status === 429) return { error: 'Downloads are limited to a few a minute. Try again in a minute.' };
  if (!res.ok) {
    const body = await readJson(res).catch(() => undefined);
    return {
      error: `VeilCore couldn’t make the download (${isObject(body) && isString(body.error) ? body.error : `answer ${res.status}`}).`,
    };
  }
  // Opened here before it is written: the registry's copy is sealed.
  return { blob: new Blob([await openExport(await res.text())], { type: 'application/json' }) };
};

/** Fetch it and save it as a file. */
export const downloadRegistryExport = async (): Promise<{ ok: true } | { error: string }> => {
  const out = await fetchRegistryExport();
  if ('error' in out) return out;
  const url = URL.createObjectURL(out.blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = REGISTRY_EXPORT_NAME;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { ok: true };
};
