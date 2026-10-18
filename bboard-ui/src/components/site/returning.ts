// Whether this browser already holds someone's records: a holder key, or records waiting in
// the local outbox. Read straight from storage (no app code loaded), so the public pages can
// offer "Your records" to someone coming back, instead of only "Try the demo".
// SPDX-License-Identifier: Apache-2.0

export const HOLDER_STORAGE = 'veilcore.holder.v1';
export const OUTBOX_STORAGE = 'veilcore.outbox.v1';

export const hasRecordsHere = (store: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage): boolean => {
  try {
    if (!store) return false;
    if (/^[0-9a-f]{64}$/i.test(store.getItem(HOLDER_STORAGE) ?? '')) return true;
    const out = store.getItem(OUTBOX_STORAGE);
    if (!out) return false;
    const parsed: unknown = JSON.parse(out);
    return Array.isArray(parsed)
      ? parsed.length > 0
      : !!parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0;
  } catch {
    return false;
  }
};
