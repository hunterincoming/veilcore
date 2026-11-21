// QR labels for records (docs/scan-and-labels.md): the sizes, how labels fall on pages, and what
// each label's QR code carries. Drawn and printed on the device (LabelsPage.tsx); nothing is sent.
//
// What a label carries: the record's check link with only its public parts, the record ID and
// the proof code (`?fp=`), which the check page shows to anyone. The name and its salt
// (`#n=…&ns=…`, verify-link.ts nameLinkParams) only when the holder ticks "the record's name
// too", because anyone who scans the label then reads the name. Never the DNA report's salt, the
// lab report's, the on-chain links or anything sealed: the holder's own check link may carry
// those, a label never does.
// SPDX-License-Identifier: Apache-2.0

import { canonicalUrl } from '../../config/network';
import { linkName, nameLinkParams, verifyPath } from '../../veilcore/verify-link';
import { isKeptOnDeviceOnly, unsavedReason, type StrainRecord } from '../../veilcore/records';

export type LabelSize = 'thermal' | 'letter' | 'a4';
export const LABEL_SIZES: readonly LabelSize[] = ['thermal', 'letter', 'a4'];

/** One label stock, in millimetres. */
export type Layout = {
  readonly page: { readonly w: number; readonly h: number };
  /** For CSS @page: the paper's own name where it has one. */
  readonly pageCss: string;
  readonly label: { readonly w: number; readonly h: number };
  readonly cols: number;
  readonly rows: number;
  /** Top-left corner of the first label. */
  readonly top: number;
  readonly left: number;
  /** From one label's corner to the next one's. */
  readonly pitchX: number;
  readonly pitchY: number;
};

const IN = 25.4;

/**
 * The sizes. Avery's published sizes for 5160 (2⅝ × 1 in, 3 across and 10 down, 2.75 in
 * horizontal pitch, 1 in vertical pitch) and L7160 (63.5 × 38.1 mm, 21 a sheet: 3 × 7); the
 * margins follow from the paper: (8.5 − 3 × 2⅝ − 2 × ⅛) / 2 = 3⁄16 in at the sides and
 * (11 − 10) / 2 = ½ in at the top; (297 − 7 × 38.1) / 2 = 15.15 mm at the top of A4 and
 * (210 − 63.5 − 2 × 66.04) / 2 = 7.21 mm at the sides with Avery's 2.6 in (66.04 mm) pitch.
 * Thermal: one 2 × 1 in label per page, as label printers take them.
 */
export const LAYOUTS: Record<LabelSize, Layout> = {
  thermal: {
    page: { w: 2 * IN, h: 1 * IN },
    pageCss: '2in 1in',
    label: { w: 2 * IN, h: 1 * IN },
    cols: 1,
    rows: 1,
    top: 0,
    left: 0,
    pitchX: 2 * IN,
    pitchY: 1 * IN,
  },
  letter: {
    page: { w: 8.5 * IN, h: 11 * IN },
    pageCss: 'letter',
    label: { w: 2.625 * IN, h: 1 * IN },
    cols: 3,
    rows: 10,
    top: 0.5 * IN,
    left: 0.1875 * IN,
    pitchX: 2.75 * IN,
    pitchY: 1 * IN,
  },
  a4: {
    page: { w: 210, h: 297 },
    pageCss: 'A4',
    label: { w: 63.5, h: 38.1 },
    cols: 3,
    rows: 7,
    top: 15.15,
    left: 7.21,
    pitchX: 66.04,
    pitchY: 38.1,
  },
};

export const perPage = (l: Layout): number => l.cols * l.rows;

/**
 * The labels on each page: every record `copies` times, in order, after `skip` places already
 * used on the first sheet (null for a place left blank). Thermal stock has nothing to skip.
 */
export const paginate = <T>(items: readonly T[], copies: number, skip: number, l: Layout): (T | null)[][] => {
  const n = perPage(l);
  const c = Math.max(1, Math.min(100, Math.floor(copies) || 1));
  const s = n === 1 ? 0 : Math.max(0, Math.min(n - 1, Math.floor(skip) || 0));
  const slots: (T | null)[] = [...Array<null>(s).fill(null), ...items.flatMap((it) => Array<T>(c).fill(it))];
  if (!items.length) return [];
  const pages: (T | null)[][] = [];
  for (let i = 0; i < slots.length; i += n) {
    const page = slots.slice(i, i + n);
    while (page.length < n) page.push(null);
    pages.push(page);
  }
  return pages;
};

/** Where the label in place `i` of a page sits: its top-left corner, in millimetres. */
export const slotAt = (i: number, l: Layout): { x: number; y: number } => ({
  x: l.left + (i % l.cols) * l.pitchX,
  y: l.top + Math.floor(i / l.cols) * l.pitchY,
});

/** "VEIL-3F9A…C21B" for today's 32-hex IDs; a shorter, older ID whole. */
export const shortId = (id: string): string => {
  const m = /^VEIL-([0-9A-F]{32})$/i.exec(id);
  return m ? `VEIL-${m[1].slice(0, 4).toUpperCase()}…${m[1].slice(-4).toUpperCase()}` : id;
};

export type Labelled = { id: string; recordFingerprint?: string; strainName?: string; nameSalt?: string };

/** Whether a record can have a label: its check page has a proof code to check against. */
export const hasCheckPage = (r: Labelled): boolean => /^[0-9a-f]{64}$/.test(r.recordFingerprint ?? '');

/** Whether a record can have a label now: VeilCore has it, so its check page can check it. */
export const labelReady = (r: StrainRecord): boolean =>
  hasCheckPage(r) && !unsavedReason(r.id) && !isKeptOnDeviceOnly(r);

/**
 * The longest name a label's QR code carries (characters). Longer, the code gets too dense to
 * read on a 1 inch label (review, 20 Nov): the name is printed, cut to fit, but not put in the code.
 */
export const QR_NAME_MAX = 60;

/**
 * The address a label's QR code opens: the check page with the record ID and proof code, and
 * the name (with its salt, so the page can say it matches) only when the holder chose to show it.
 */
export const labelLink = (r: Labelled, showName: boolean): string =>
  canonicalUrl(
    verifyPath(
      r.id,
      r.recordFingerprint,
      showName && [...linkName(r.strainName ?? '')].length <= QR_NAME_MAX ? nameLinkParams(r) : {},
    ),
  );

/** The paper most people near this browser use: US Letter in the Americas that use it, A4 elsewhere. */
export const defaultSize = (locale: string): LabelSize =>
  /-(US|CA|MX|PH|CL|CO|VE|GT|CR|PA|DO|PR|SV|NI|HN|BO)\b/i.test(locale) ? 'letter' : locale === 'en' ? 'letter' : 'a4';

/** A name cut to fit a label line, with an ellipsis when it was cut. */
export const fitName = (name: string, max: number): string => {
  const chars = [...name.normalize('NFC').replace(/\s+/g, ' ').trim()];
  return chars.length <= max ? chars.join('') : `${chars.slice(0, Math.max(1, max - 1)).join('')}…`;
};

/** The QR code's settings, the same on screen, in print and in the downloaded PDF (label-pdf.ts). */
export const QR_LEVEL = 'M';
/** Modules of white round the code, inside the label's own edge. */
export const QR_MARGIN = 2;

export const LABEL_FONTS = {
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  sans: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
} as const;

/** One line of a label's text: its baseline at (x, y), in a page's millimetres, at most `room` wide. */
export type LabelLine = {
  readonly text: string;
  readonly size: number;
  readonly font: keyof typeof LABEL_FONTS;
  readonly weight: 400 | 700;
  readonly x: number;
  readonly y: number;
  readonly room: number;
};

/**
 * Where everything on one label goes, for the label whose corner is at (x, y): the QR code (a
 * square, its margin inside) and the lines of text beside it, centred in the label's height. The
 * screen and print (LabelSheet.tsx) and the downloaded PDF (label-pdf.ts) both draw from this.
 */
export const labelParts = (
  r: Labelled,
  showName: boolean,
  scanToCheck: string,
  x: number,
  y: number,
  l: Layout,
): {
  qr: { x: number; y: number; size: number; value: string };
  text: { x: number; w: number };
  lines: LabelLine[];
} => {
  const { w, h } = l.label;
  // The quiet zone round the code: two modules inside it (QR_MARGIN) and the label's edge.
  const pad = Math.min(2.5, h * 0.08);
  const qr = h - 2 * pad;
  const tx = x + pad + qr + 2;
  const room = w - (tx - x) - pad;
  // Type sized to the label's height: about 3 mm on a 1 inch label, larger on L7160.
  const big = Math.min(4.2, h * 0.13);
  const small = big * 0.8;
  const name =
    showName && r.strainName?.trim() ? fitName(r.strainName, Math.max(4, Math.floor(room / (small * 0.55)))) : '';
  const raw: Omit<LabelLine, 'x' | 'y' | 'room'>[] = [
    { text: shortId(r.id), size: big, font: 'mono', weight: 700 },
    { text: scanToCheck, size: small, font: 'sans', weight: 400 },
    ...(name ? [{ text: name, size: small, font: 'sans' as const, weight: 700 as const }] : []),
  ];
  const total = raw.reduce((n, li) => n + li.size * 1.35, 0);
  let cy = y + (h - total) / 2;
  const lines = raw.map((li) => {
    cy += li.size * 1.35;
    return { ...li, x: tx, y: cy - li.size * 0.3, room };
  });
  return {
    qr: { x: x + pad, y: y + pad, size: qr, value: labelLink(r, showName) },
    text: { x: tx, w: room },
    lines,
  };
};

const FILE_SIZE: Record<LabelSize, string> = { thermal: '2x1in', letter: 'letter', a4: 'a4' };

/**
 * The downloaded file's name: `veilcore-labels-<record ID>-<paper>.pdf` for one record, the
 * day's date in its place for several (the date on this device, so it matches the person's day).
 */
export const labelFileName = (ids: readonly string[], size: LabelSize, now: Date = new Date()): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const what = ids.length === 1 && /^[A-Za-z0-9-]{1,64}$/.test(ids[0]) ? ids[0] : day;
  return `veilcore-labels-${what}-${FILE_SIZE[size]}.pdf`;
};

/** The labels page (LabelsPage.tsx). */
export const LABELS_PATH = '/records/labels';
/**
 * What a page sends it, in this tab's router state (never the address): the records to print
 * (ticked), others offered with them (not ticked: a record's batch), and where Back goes.
 */
export type LabelsState = {
  readonly ids: readonly string[];
  readonly also?: readonly string[];
  readonly back?: string;
};
