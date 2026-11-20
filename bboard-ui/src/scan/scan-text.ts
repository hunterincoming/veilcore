// What a scan or a tag reader gives, made into what goes in the box (docs/scan-and-labels.md).
//
// Everything here runs on the device. Nothing scanned is sent anywhere by scanning: it goes into
// the field the person pressed Scan beside, exactly as if they had typed it, and from there only
// where that field already goes (a sealed record's locked part, or the paste box's own checks).
//
// Bluetooth stick readers (Allflex RS420, Gallagher and the like) pair as a keyboard: the tag
// number arrives as a burst of key presses, usually with Enter or Tab after it, sometimes a
// space or a line break before or after. readerKeyDown keeps Enter from submitting a form, and
// cleanReading trims what the reader added, so the number lands as the tag says it.
// SPDX-License-Identifier: Apache-2.0

/** Longest text a scan puts in a field: a QR code can hold far more than any ID box needs. */
export const SCAN_MAX = 500;

/**
 * A reading made fit for one line: control characters (CR, LF, Tab, the GS separator some
 * barcodes carry, STX/ETX from readers) become spaces, then the ends are trimmed. Spaces inside
 * stay: an ISO 11784 tag can be printed "982 000123456789", and the ID hint ignores them.
 */
export const cleanReading = (raw: string): string =>
  raw
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]+/g, ' ')
    .trim()
    .slice(0, SCAN_MAX);

/**
 * A field's key handler for a stick reader that types into it. Enter after the number: keep it
 * from submitting or moving on, and trim. Tab: trimmed, and the focus moves on as usual.
 * Returns true when it handled the key.
 */
export const readerKeyDown = (
  e: { key: string; preventDefault: () => void },
  value: string,
  set: (v: string) => void,
): boolean => {
  if (e.key !== 'Enter' && e.key !== 'Tab') return false;
  if (e.key === 'Enter') e.preventDefault();
  const v = cleanReading(value);
  if (v !== value) set(v);
  return true;
};

/**
 * A scanned check link, as the path to open on this site: the label QR codes VeilCore prints
 * (and the certificate's) are /verify/<id>?fp=…#…. Only the path, query and fragment are kept,
 * whatever host the code names, so a code can never send anyone to another site (the paste
 * box's rule, veilcore/paste.ts). Undefined for anything else.
 */
export const checkPathOf = (raw: string): string | undefined => {
  const v = raw.replace(/\s+/g, '');
  if (!v.includes('/')) return undefined;
  const withScheme = /^[a-z0-9.-]+\.[a-z]{2,}(:\d+)?\//i.test(v) ? `https://${v}` : v;
  let u: URL;
  try {
    u = new URL(withScheme, 'https://scan.invalid');
  } catch {
    return undefined;
  }
  if (!/^\/verify\/[^/?#]+$/.test(u.pathname) || u.pathname.startsWith('/verify/example')) return undefined;
  return `${u.pathname}${u.search}${u.hash}`;
};

/** A record ID on its own (veilcore/paste.ts RECORD_ID), as a label or a typed note may carry it. */
export const isRecordId = (raw: string): boolean => /^VEIL-[0-9A-Z]{4,40}$/i.test(raw.replace(/\s+/g, ''));

/** The formats a scan reads: QR codes and the common 1-D and 2-D barcodes on tags, tubes and seed lots. */
export const NATIVE_FORMATS = [
  'qr_code',
  'data_matrix',
  'code_128',
  'code_39',
  'code_93',
  'codabar',
  'ean_13',
  'ean_8',
  'upc_a',
  'upc_e',
  'itf',
  'pdf417',
  'aztec',
] as const;

/** The same formats, in the bundled reader's names (zxing-wasm). */
export const BUNDLED_FORMATS = [
  'QRCode',
  'DataMatrix',
  'Code128',
  'Code39',
  'Code93',
  'Codabar',
  'EAN13',
  'EAN8',
  'UPCA',
  'UPCE',
  'ITF',
  'PDF417',
  'Aztec',
] as const;
