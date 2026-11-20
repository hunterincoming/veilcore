// Reading an NFC tag into a field: Web NFC, which only Chrome on Android has
// (developer.mozilla.org/docs/Web/API/NDEFReader). Elsewhere the button isn't shown. An iPhone
// still opens a link written on a tag by itself, which covers "tap to check" without this.
//
// One tag, then it stops: the first text or link record goes into the field, on the device,
// like a scan. Nothing is written to any tag.
// SPDX-License-Identifier: Apache-2.0

import { cleanReading } from './scan-text';

type NdefRecord = { recordType: string; encoding?: string; data?: DataView };
type NdefReading = { message: { records: NdefRecord[] } };
type NdefReaderLike = EventTarget & { scan: (o?: { signal?: AbortSignal }) => Promise<void> };

/** Whether this browser can read NFC tags (Chrome on Android, in a secure page). */
export const nfcAvailable = (): boolean => typeof window !== 'undefined' && 'NDEFReader' in window;

/** The text of a tag's first text or link record, or undefined when it has neither. */
export const textOfRecords = (records: readonly NdefRecord[]): string | undefined => {
  for (const r of records) {
    if (!r.data) continue;
    if (r.recordType === 'text')
      return cleanReading(new TextDecoder(r.encoding || 'utf-8').decode(r.data)) || undefined;
    if (r.recordType === 'url' || r.recordType === 'absolute-url')
      return cleanReading(new TextDecoder().decode(r.data)) || undefined;
  }
  return undefined;
};

/**
 * Wait for one tag and give its text. Rejects with 'empty' for a tag with no text or link,
 * with the browser's own error when NFC is off or refused, and with an AbortError on `signal`.
 */
export const readOneTag = (signal: AbortSignal): Promise<string> =>
  new Promise((resolve, reject) => {
    const Reader = (window as unknown as { NDEFReader: new () => NdefReaderLike }).NDEFReader;
    const reader = new Reader();
    const stop = new AbortController();
    signal.addEventListener(
      'abort',
      () => {
        stop.abort();
        reject(new DOMException('stopped', 'AbortError'));
      },
      { once: true },
    );
    reader.addEventListener('reading', (e) => {
      const text = textOfRecords((e as unknown as NdefReading).message.records);
      stop.abort();
      if (text) resolve(text);
      else reject(new Error('empty'));
    });
    reader.addEventListener('readingerror', () => {
      stop.abort();
      reject(new Error('empty'));
    });
    reader.scan({ signal: stop.signal }).catch(reject);
  });
