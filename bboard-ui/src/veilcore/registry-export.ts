// Everything VeilCore's registry holds for this browser's holder key, in one file
// (GET /api/export, round 5). Records, licences, sharing choices, each record's inclusion
// proof and the batches they belong to, so leaving VeilCore never means losing anything.
// Lab reports are not in it: they are locked files, opened from the plant's page.
// The registry allows a few exports a minute per holder key.
// SPDX-License-Identifier: Apache-2.0

import { holderKeyIfAny } from './holder';
import { readJson, isObject, isString } from './json';

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
  return { blob: await res.blob() };
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
