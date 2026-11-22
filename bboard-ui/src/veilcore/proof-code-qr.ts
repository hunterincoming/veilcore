// A record's proof code as a lab scans it (docs/scan-and-labels.md "Proof code QR").
//
// The record page shows the proof code as a QR code, so a lab can scan it into its result form
// with a phone or laptop camera or a USB barcode scanner instead of copying 64 characters. The
// code carries the proof code and a check, nothing else: the proof code is already public on the
// record's check page and in every check link and label (privacy-and-data-terms.md), so a QR of it
// shows no more than the text beside it.
//
// The QR text is `VCP` + the 64 hex characters + 4 hex check characters, upper case, 71 letters and
// digits:
//   - letters and digits only, because a USB scanner acting as a keyboard sends US key positions:
//     on a French or German layout `: / ? = # -` arrive as other characters. What still garbles
//     (AZERTY digits, a/q) turns into a non-hex character or a failed check, and is caught;
//   - upper case, so the QR uses its alphanumeric mode and stays small (version 4 at level M);
//     read without regard to case, so a scanner with Caps Lock on still works;
//   - `VCP` ("VeilCore proof code") says what it is, so another 64-hex value scanned by mistake (a
//     DNA report's SHA-256, a lab result's code) is not taken for a proof code;
//   - the check is CRC-16/CCITT-FALSE of the 64 hex characters: every one-character error, and a
//     dropped or doubled character (the length changes), is refused.
//
// readProofCode also takes what labs were given before: the bare 64-hex code, and a check link
// (the label's and the certificate's QR code), read for its `fp`.
// SPDX-License-Identifier: Apache-2.0

/** What starts the QR text: "VeilCore proof code". */
export const PROOF_QR_PREFIX = 'VCP';

const HEX64 = /^[0-9a-f]{64}$/i;

/** CRC-16/CCITT-FALSE (poly 0x1021, start 0xFFFF) of an ASCII string, as 4 upper-case hex. */
export const proofCheck = (text: string): string => {
  let crc = 0xffff;
  for (let i = 0; i < text.length; i++) {
    crc ^= (text.charCodeAt(i) & 0xff) << 8;
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
};

/** The QR text for a proof code. Throws for anything but 64 hex characters. */
export const proofCodeQrText = (code: string): string => {
  if (!HEX64.test(code)) throw new Error('A proof code is 64 hex characters.');
  const up = code.toUpperCase();
  return `${PROOF_QR_PREFIX}${up}${proofCheck(up)}`;
};

export type ProofCodeReading =
  | { readonly ok: true; readonly code: string; readonly from: 'qr' | 'link' | 'plain' }
  /** check: it looks like the record page's QR text but didn't read right; notCode: anything else. */
  | { readonly ok: false; readonly why: 'empty' | 'check' | 'notCode' };

/** A link's `fp` (query first, then after the #), when it is 64 hex. */
const fpOf = (link: string): string | undefined => {
  let u: URL;
  try {
    u = new URL(link, 'https://scan.invalid');
  } catch {
    return undefined;
  }
  const fp = u.searchParams.get('fp') ?? new URLSearchParams(u.hash.replace(/^#/, '')).get('fp');
  return fp && HEX64.test(fp) ? fp.toLowerCase() : undefined;
};

/**
 * What was scanned, pasted or typed into a proof code box, read as a proof code (lower case), or
 * why not. Nothing is guessed: a link must name exactly one proof code, and the QR text must pass
 * its check.
 */
export const readProofCode = (raw: string): ProofCodeReading => {
  // A scanner may add spaces, line breaks, Tab, STX/ETX; none belongs to any form of the code.
  // eslint-disable-next-line no-control-regex
  const t = raw.replace(/[\s\u0000-\u001f\u007f-\u009f]+/g, '');
  if (t === '') return { ok: false, why: 'empty' };
  if (HEX64.test(t)) return { ok: true, code: t.toLowerCase(), from: 'plain' };
  if (t.slice(0, PROOF_QR_PREFIX.length).toUpperCase() === PROOF_QR_PREFIX) {
    const m = /^[0-9a-f]{68}$/i.exec(t.slice(PROOF_QR_PREFIX.length));
    if (!m) return { ok: false, why: 'check' };
    const code = m[0].slice(0, 64).toUpperCase();
    return proofCheck(code) === m[0].slice(64).toUpperCase()
      ? { ok: true, code: code.toLowerCase(), from: 'qr' }
      : { ok: false, why: 'check' };
  }
  if (/^(https?:\/\/|\/)\S+$/i.test(t)) {
    // A label printed with the name carries the name's salt (64 hex) too: `fp` says which is which.
    const fp = fpOf(t);
    if (fp) return { ok: true, code: fp, from: 'link' };
    const codes = [...t.matchAll(/(?:^|[^0-9a-f])([0-9a-f]{64})(?=[^0-9a-f]|$)/gi)].map((m) => m[1].toLowerCase());
    if (codes.length === 1) return { ok: true, code: codes[0], from: 'link' };
  }
  return { ok: false, why: 'notCode' };
};
