// The breeding history's two pages: breeding-history.html (the genealogy, one row per
// record, blank boxes for what VeilCore doesn't hold, under three plain headings) and
// COVER-NOTE.html (one page: what this is, what it shows, what it doesn't).
//
// Text only, like the evidence bundle's examiner summary: no script, loads nothing, links
// nowhere; the Content-Security-Policy forbids scripts and every request, and every value
// is HTML-escaped (evidence/examiner.ts escapeHtml), so a plant's name can never become
// markup. Plain headings, never a copy of an office's form: forms change version, and a
// look-alike that is out of date does damage (product-ideas.md, "What not to build").
// "Draft. Not legal advice." is on every printed page (a table header the browser repeats)
// and at the top of every section.
// SPDX-License-Identifier: Apache-2.0

import { shortFingerprint } from '../commitment';
import { escapeHtml } from '../evidence/examiner';
import { networkWords, oneLine, utcWords } from '../evidence/words';
import { parseStageNotes } from './notes';
import type { BreedingHistory, HistoryNode, OutsideParent, ParentLink } from './walk';

export const HISTORY_FILE = 'breeding-history.html';
export const COVER_FILE = 'COVER-NOTE.html';
export const DRAFT_LINE = 'Draft. Not legal advice.';
/** The most of a record's other notes a row shows; the whole notes are in its evidence bundle. */
export const NOTES_SHOWN = 600;

/** A record's date stamp, as the registry reported it when the export was made. */
export type DateStamp =
  | {
      readonly kind: 'stamped';
      readonly network: string;
      /** The time the registry reported, ISO; null when it gave none. */
      readonly at: string | null;
      readonly test: boolean;
    }
  | { readonly kind: 'batch-only' }
  | { readonly kind: 'none'; readonly proofRefused?: boolean }
  | { readonly kind: 'unsealed' };

export type RowFacts = {
  readonly stamp: DateStamp;
  /** The record's evidence bundle folder in this export, or why it has none. */
  readonly bundle: { readonly folder: string } | { readonly refused: string };
};

export type HistoryPages = {
  readonly history: BreedingHistory;
  /** By record ID. A record with no entry is treated as not dated. */
  readonly facts: ReadonlyMap<string, RowFacts>;
  readonly madeAt: Date;
  /**
   * By plant record ID: the records held here that date one of its lab reports
   * (components/stage/lab-report-date.ts). Named in the plant's row; the report isn't in this export.
   */
  readonly labDatings?: ReadonlyMap<string, readonly string[]>;
};

const nameOf = (n: HistoryNode): string => oneLine(n.record.strainName || '(no name)') || '(no name)';

const outsideWords = (l: { kind: string; name: string; recordId?: string }): string =>
  l.kind === 'theirs'
    ? `${oneLine(l.name)} (linked record ${oneLine(l.recordId)}, held by someone else: their record, not in this history)`
    : l.kind === 'left-out'
      ? `${oneLine(l.name)} (record ${oneLine(l.recordId)}, held here but left out of this export)`
      : `${oneLine(l.name)} (named by the breeder, no record)`;

/**
 * The pedigree on one line: "Gen 3 (#3) from [Gen 2 (#2) from Gen 1 (#1)] × Pollen donor
 * (named by the breeder, no record)". #n is the record's row in the stage table. A record
 * already spelled out earlier in the line is named again without its parents; a link that
 * loops back says so.
 */
export const genealogyLine = (h: BreedingHistory): string => {
  const byId = new Map(h.nodes.map((n) => [n.record.id, n]));
  const spelled = new Set<string>();
  const render = (n: HistoryNode): { text: string; nested: boolean } => {
    const label = `${nameOf(n)} (#${n.row})`;
    if (!n.parents.length || spelled.has(n.record.id)) return { text: label, nested: false };
    spelled.add(n.record.id);
    const parts = n.parents.map((l: ParentLink) => {
      if (l.kind !== 'held') return outsideWords(l);
      const p = byId.get(l.recordId);
      if (!p) return outsideWords({ kind: 'theirs', name: l.name, recordId: l.recordId });
      if (l.loops) return `${nameOf(p)} (#${p.row}; the links loop back here)`;
      const inner = render(p);
      return inner.nested ? `[${inner.text}]` : inner.text;
    });
    return { text: `${label} from ${parts.join(' × ')}`, nested: true };
  };
  const root = byId.get(h.root.id);
  return root ? render(root).text : nameOf({ record: h.root } as HistoryNode);
};

const stampDay = (at: string | null): string | null => utcWords(at);

/** The date stamp cell's words: in the row itself, never in a footnote. */
export const dateStampWords = (f: RowFacts | undefined): string => {
  const s: DateStamp = f?.stamp ?? { kind: 'none' };
  const bundle = f?.bundle;
  switch (s.kind) {
    case 'unsealed':
      return 'Not sealed, so nothing dates it.';
    case 'batch-only':
      return 'In a batch, not dated on any network yet.';
    case 'none':
      return `Not dated on any network yet.${s.proofRefused ? ' The registry’s proof didn’t check against this record, so it was left out.' : ''}`;
    case 'stamped': {
      const when = stampDay(s.at);
      return (
        `${when ?? 'Time not given'}, on ${networkWords(s.network)}, as VeilCore’s registry reported it.` +
        (s.test ? ' A test network: practice data, not a real date.' : '') +
        (bundle && 'folder' in bundle
          ? ` Check it with verify.html in evidence/${bundle.folder}/.`
          : ' No evidence bundle could be made for this record, so this export can’t check it.')
      );
    }
  }
};

/** Whether the row carries a date stamp at all (for the page's own markers and the cover note). */
const isStamped = (f: RowFacts | undefined): boolean => f?.stamp.kind === 'stamped';

const parentWords = (n: HistoryNode, byId: Map<string, HistoryNode>): string =>
  n.parents.length
    ? n.parents
        .map((l) => {
          if (l.kind !== 'held') return outsideWords(l);
          const p = byId.get(l.recordId);
          return p ? `${nameOf(p)} (#${p.row}${l.loops ? '; the links loop back here' : ''})` : outsideWords(l);
        })
        .join(' × ')
    : 'None named';

const cut = (s: string, max: number): string =>
  s.length > max
    ? `${s.slice(0, max).trimEnd()}… (cut short here; the whole notes are in this record’s evidence bundle)`
    : s;

const td = (label: string, html: string, cls = ''): string =>
  `<td data-label="${escapeHtml(label)}"${cls ? ` class="${cls}"` : ''}>${html}</td>`;

const COLS = [
  '#',
  'Record',
  'Stated date (the breeder’s statement)',
  'Date stamp',
  'Stage',
  'Selected for',
  'How it was made',
] as const;

/** The stage table: one row per record, oldest generation first. */
export const stageTable = (pages: HistoryPages): string => {
  const { history, facts } = pages;
  const byId = new Map(history.nodes.map((n) => [n.record.id, n]));
  const rows = history.nodes.map((n) => {
    const r = n.record;
    const f = facts.get(r.id);
    const notes = parseStageNotes(r.notes);
    const bundle = f?.bundle;
    const recordCell = [
      `<strong>${escapeHtml(nameOf(n))}</strong>`,
      `<span class="id">Record ID ${escapeHtml(r.id)}</span>`,
      `<span class="id">Fingerprint ${escapeHtml(shortFingerprint(r.recordFingerprint))}</span>`,
      r.bredBy ? `<span>Bred by ${escapeHtml(oneLine(r.bredBy))} (as written)</span>` : '',
      r.receivedFrom ? `<span>Came through a VeilCore delivery from ${escapeHtml(oneLine(r.receivedFrom))}</span>` : '',
      r.supersededBy
        ? `<span>Corrected later by record ${escapeHtml(r.supersededBy)}; this row is the original as sealed.</span>`
        : '',
      bundle && 'refused' in bundle
        ? `<span class="warn-text">No evidence bundle: ${escapeHtml(bundle.refused)}</span>`
        : '',
      ...(pages.labDatings?.get(r.id) ?? []).map(
        (id) => `<span data-lab-dated="${escapeHtml(id)}">Lab report dated in ${escapeHtml(id)}</span>`,
      ),
    ]
      .filter(Boolean)
      .join('<br>');
    const method = [
      escapeHtml(oneLine(r.breedingMethod || '') || '(not given)'),
      `Parents: ${escapeHtml(parentWords(n, byId))}`,
    ].join('<br>');
    const main =
      `<tr data-record="${escapeHtml(r.id)}" data-dated="${isStamped(f) ? 'yes' : 'no'}">` +
      td(COLS[0], String(n.row)) +
      td(COLS[1], recordCell) +
      td(
        COLS[2],
        `${escapeHtml(oneLine(r.dateCreated || '') || '(none given)')} <span class="muted">(the breeder’s statement)</span>`,
      ) +
      td(COLS[3], escapeHtml(dateStampWords(f)), isStamped(f) ? '' : 'undated') +
      td(COLS[4], escapeHtml(notes.stage ? oneLine(notes.stage) : '(not written)')) +
      td(COLS[5], escapeHtml(notes.selectedFor ? oneLine(notes.selectedFor) : '(not written)')) +
      td(COLS[6], method) +
      '</tr>';
    const other = notes.rest
      ? `<tr class="more"><td colspan="${COLS.length}" data-label="">Other notes, as written: ${escapeHtml(cut(oneLine(notes.rest), NOTES_SHOWN))}</td></tr>`
      : '';
    return main + other;
  });
  return `<table class="stages"><thead><tr>${COLS.map((c) => `<th scope="col">${escapeHtml(c)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>`;
};

const outsideTable = (outside: readonly OutsideParent[]): string => {
  if (!outside.length) return '';
  const what = (o: OutsideParent) =>
    o.kind === 'theirs'
      ? 'A linked record held by someone else. It is theirs: it isn’t in this browser, so it has no row or evidence bundle here. Its holder can export its own.'
      : o.kind === 'left-out'
        ? 'Held here, left out: this export takes the nearest records only. Export again from this record to cover its own history.'
        : 'Named by the breeder, no record. Nothing here dates it.';
  return (
    '<h3>Parents not in this history</h3>' +
    `<table class="plain"><thead><tr><th scope="col">Name as sealed</th><th scope="col">Record</th><th scope="col">What it is</th><th scope="col">Named by row</th></tr></thead><tbody>${outside
      .map(
        (o) =>
          `<tr data-outside="${escapeHtml(o.kind)}">${td('Name as sealed', escapeHtml(oneLine(o.name)))}${td('Record', escapeHtml(o.recordId ?? 'none'))}${td('What it is', escapeHtml(what(o)))}${td('Named by row', escapeHtml(o.namedBy.map((n) => `#${n}`).join(', ')))}</tr>`,
      )
      .join('')}</tbody></table>`
  );
};

/** Our own fixed words with Japanese in them, the Japanese marked so a browser picks a Japanese font. */
const withJapanese = (text: string): string =>
  escapeHtml(text).replace(/([\u3000-\u30ff\u4e00-\u9fff]+)/g, '<span lang="ja">$1</span>');

const p = (text: string, cls = ''): string => `<p${cls ? ` class="${cls}"` : ''}>${escapeHtml(text)}</p>`;
const list = (items: readonly string[]): string =>
  `<ul>${items.map((i) => `<li>${withJapanese(i)}</li>`).join('')}</ul>`;

/** A clearly marked empty box for what VeilCore doesn't hold. */
export const blankBox = (label: string): string =>
  `<div class="blank" data-blank="yes"><p class="blank-label"><span class="tag">To fill in yourself. VeilCore doesn’t hold this.</span> ${escapeHtml(label)}</p><div class="space"></div></div>`;

const COMMON_BLANKS = [
  'How you tested for uniformity, and what you found.',
  'Over how many generations (or propagation cycles) you checked stability, and how.',
  'Variants or off-types you saw: what kind, how to tell them apart, and how often (for example, how many in how many plants).',
];

type Section = {
  readonly id: string;
  /** Heading text; the Japanese part is marked as Japanese. */
  readonly heading: string;
  readonly intro: readonly string[];
  readonly blanks: readonly string[];
  readonly tableFirst: boolean;
};

const SECTIONS: readonly Section[] = [
  {
    id: 'us-pvp',
    heading: 'For a US PVP application (Exhibit A)',
    intro: [
      'Exhibit A asks for the variety’s origin and breeding history: its genealogy, the breeding method, and the later stages of selection and multiplication with what was selected for at each. It also asks how uniformity and stability were tested, over how many generations, and about variants and how often they occur.',
      'US Plant Variety Protection covers hemp only (0.3% or less delta-9 THC). For higher-THC cannabis the federal route is a USPTO plant patent, whose description asks for the origin or parentage; the genealogy and table below can serve there too.',
    ],
    blanks: [
      ...COMMON_BLANKS,
      'How the variety is propagated. The “How it was made” column mixes this with the breeding method.',
      'Where the starting stock plants came from, and any protection on them, with reference numbers.',
    ],
    tableFirst: false,
  },
  {
    id: 'upov-tq',
    heading: 'For a UPOV-style technical questionnaire (section 4.1)',
    intro: [
      'Section 4.1 asks for the breeding scheme: a controlled cross, a partially known cross, an unknown cross, a mutation, discovery and development, or other, naming the parent varieties where they are known.',
      'Some offices ask for the female parent first. VeilCore records don’t say which parent was which. Some offices also let you ask for this section to be kept confidential.',
    ],
    blanks: [
      'Which kind of breeding scheme this is. VeilCore’s “How it was made” field doesn’t use these categories.',
      'Which parent was the seed (female) parent and which the pollen (male) parent.',
      'If the variety was discovered: where and when, and how it was developed.',
      ...COMMON_BLANKS,
    ],
    tableFirst: false,
  },
  {
    id: 'jp-setsumeisho',
    heading: 'For a Japanese application (説明書 §4)',
    intro: [
      'Section 4 of the description (説明書, 出願品種の育成及び繁殖の方法) asks how the variety was bred and propagated, step by step, until it was complete. MAFF’s own template asks for the year, month and place of each step, and the date the traits were confirmed stable.',
      'The filing itself is written in Japanese. Have a Japanese agent prepare it.',
    ],
    blanks: [
      'The place of each step.',
      'The date the traits were confirmed stable.',
      'How the variety is propagated.',
      ...COMMON_BLANKS,
    ],
    tableFirst: true,
  },
];

const STYLE = `
  :root { --ink: #16201b; --muted: #55625b; --line: #cfd6d2; --note: #f2f5f3; --warn: #8a4b00; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 13px/1.45 system-ui, -apple-system, "Segoe UI", Roboto, "Hiragino Sans", "Noto Sans JP", sans-serif; color: var(--ink); background: #fff; }
  table.page { width: 100%; max-width: 900px; margin: 0 auto; border-collapse: collapse; table-layout: fixed; }
  table.page > thead td, table.page > tfoot td { padding: 6px 16px; font-size: 0.8em; color: var(--warn); font-weight: 600; }
  table.page > tbody > tr > td { padding: 4px 16px 32px; overflow-wrap: anywhere; }
  h1 { font-size: 1.35em; margin: 4px 0 2px; }
  h2 { font-size: 1.08em; margin: 22px 0 6px; padding-bottom: 2px; border-bottom: 1px solid var(--line); }
  h3 { font-size: 0.94em; margin: 12px 0 4px; }
  p { margin: 4px 0; }
  .muted { color: var(--muted); }
  .draft { color: var(--warn); font-weight: 600; }
  .note { background: var(--note); border-radius: 6px; padding: 8px 10px; margin: 8px 0; }
  .warn { border-left: 4px solid var(--warn); }
  .warn-text { color: var(--warn); }
  .genealogy { font-size: 0.95em; padding: 8px 10px; border: 1px solid var(--line); border-radius: 6px; }
  table.stages, table.plain { width: 100%; border-collapse: collapse; table-layout: fixed; margin: 6px 0; }
  table.stages th, table.stages td, table.plain th, table.plain td { text-align: left; vertical-align: top; padding: 4px 5px; border-top: 1px solid var(--line); overflow-wrap: anywhere; }
  table.stages th, table.plain th { color: var(--muted); font-weight: 500; font-size: 0.82em; }
  table.stages th:first-child { width: 2.2em; }
  table.stages td.undated { color: var(--warn); }
  table.stages tr.more td { border-top: none; color: var(--muted); font-size: 0.85em; padding-top: 0; }
  .id { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.78em; word-break: break-all; }
  .blank { border: 1.5px dashed var(--muted); border-radius: 6px; padding: 6px 10px; margin: 8px 0; break-inside: avoid; }
  .blank-label { margin: 0; }
  .blank .tag { display: block; font-size: 0.78em; font-weight: 600; color: var(--warn); }
  .blank .space { min-height: 5.5em; }
  ul { padding-left: 20px; margin: 4px 0; }
  li { margin: 2px 0; }
  section.office + section.office { break-before: page; }
  @media (max-width: 640px) {
    table.stages thead, table.plain thead { display: none; }
    table.stages tr, table.stages td, table.plain tr, table.plain td { display: block; width: auto; }
    table.stages tr, table.plain tr { border-top: 2px solid var(--line); padding: 4px 0; }
    table.stages td, table.plain td { border-top: none; padding: 2px 0; }
    table.stages td::before, table.plain td::before { content: attr(data-label); display: block; color: var(--muted); font-size: 0.78em; }
    table.page > tbody > tr > td { padding: 4px 12px 24px; }
  }
  @page { margin: 11mm; }
  @media print {
    body { font-size: 8.5pt; line-height: 1.3; }
    table.page { max-width: none; }
    table.page > tbody > tr > td { padding: 0 0 6px; }
    table.page > thead td, table.page > tfoot td { padding: 0 0 4px; font-size: 7.5pt; }
    h1 { font-size: 13pt; } h2 { font-size: 11pt; margin-top: 4px; break-after: avoid; } h3 { font-size: 9.5pt; break-after: avoid; }
    tr, li { break-inside: avoid; }
    .blank .space { min-height: 7em; }
  }
`;

const shell = (title: string, marker: string, body: string): string => `<!doctype html>
<!--
  VeilCore breeding history (draft). A printout made by the VeilCore site from the holder's
  own copy of the records. It has no script, loads nothing and checks nothing when opened;
  its Content-Security-Policy forbids scripts and every request. Each record's evidence
  bundle, in the evidence folder next to it, has a verify.html that does the checks offline.
  Draft. Not legal advice.
  SPDX-License-Identifier: Apache-2.0
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; form-action 'none'; base-uri 'none'">
<meta name="referrer" content="no-referrer">
<title>${escapeHtml(title)}</title>
<style>${STYLE}</style>
</head>
<body data-history="${marker}">
<table class="page" role="presentation">
<thead><tr><td>${escapeHtml(DRAFT_LINE)} ${escapeHtml(title)}</td></tr></thead>
<tfoot><tr><td>${escapeHtml(DRAFT_LINE)} VeilCore doesn’t vouch for anyone or for anything a record says.</td></tr></tfoot>
<tbody><tr><td>
${body}
</td></tr></tbody>
</table>
</body>
</html>
`;

const titleFor = (h: BreedingHistory): string =>
  `Breeding history (draft): ${oneLine(h.root.strainName || '(no name)') || '(no name)'}`;

const counts = (pages: HistoryPages) => {
  const n = pages.history.nodes.length;
  const dated = pages.history.nodes.filter((x) => isStamped(pages.facts.get(x.record.id))).length;
  const test = pages.history.nodes.some((x) => {
    const s = pages.facts.get(x.record.id)?.stamp;
    return s?.kind === 'stamped' && s.test;
  });
  return { n, dated, test };
};

const datingNote = (pages: HistoryPages): string => {
  const { n, dated, test } = counts(pages);
  const lines: string[] = [];
  if (dated < n)
    lines.push(
      `${n - dated} of the ${n} records ${n - dated === 1 ? 'is' : 'are'} not dated on any network yet. Their rows say so; nothing here dates them.`,
    );
  if (test) lines.push('Some dates are on a test network. A test network can be reset: treat those as practice data.');
  return lines.length ? `<div class="note warn" data-practice="yes">${lines.map((l) => p(l)).join('')}</div>` : '';
};

/** breeding-history.html. */
export const breedingHistoryHtml = (pages: HistoryPages): string => {
  const h = pages.history;
  const title = titleFor(h);
  const made = utcWords(pages.madeAt.toISOString()) ?? pages.madeAt.toISOString();
  const genealogy = `<h3>Genealogy</h3><p class="genealogy" data-genealogy="yes">${escapeHtml(genealogyLine(h))}</p>${p(
    '#n is the record’s row in the table below. Parents are as sealed in each record.',
    'muted',
  )}`;
  const table = `<h3>Stages, one row per record</h3>${p(
    'Oldest generation first. The stated date, stage, what was selected for and how it was made are the words sealed in each record. The date stamp rests on the network’s record; this file shows what VeilCore’s registry reported. Check it in each record’s verify.html or on the check page.',
    'muted',
  )}${stageTable(pages)}`;
  const outside = outsideTable(h.outside);
  const loops = h.loops
    ? p(
        'Some records’ links loop back on each other. The loop is shown where it closes and not followed further.',
        'warn-text',
      )
    : '';
  const sections = SECTIONS.map((s) => {
    const parts = s.tableFirst ? [table, genealogy, outside] : [genealogy, table, outside];
    return `<section class="office" id="${s.id}" data-office="${s.id}">
<h2>${withJapanese(s.heading)}</h2>
${p(DRAFT_LINE, 'draft')}
${s.intro.map((i) => `<p>${withJapanese(i)}</p>`).join('')}
${parts.join('\n')}
${loops}
<h3>Not held by VeilCore</h3>
${s.blanks.map(blankBox).join('')}
</section>`;
  }).join('\n');

  const body = `<h1>${escapeHtml(title)}</h1>
${p(DRAFT_LINE, 'draft')}
${p(`Made ${made} by the VeilCore site, from the holder’s own copy of ${h.nodes.length === 1 ? 'the record' : `${h.nodes.length} records`}. Read ${COVER_FILE} first: it says what this shows and what it doesn’t.`, 'muted')}
<div class="note">${p('The same history is set out three times below, each under a plain heading for one kind of application, so you can print just the pages you need. These are not the offices’ forms: copy what fits into the current form yourself, and fill in the boxes VeilCore can’t.')}${p('A record dates nothing earlier than the day it was sealed. A step sealed when it happened carries its own date; a history typed up the week of filing is worth what any typed-up history is worth.')}</div>
${datingNote(pages)}
${sections}`;
  return shell(title, 'veilcore-breeding-history/v1', body);
};

/** COVER-NOTE.html: one page. */
export const coverNoteHtml = (pages: HistoryPages): string => {
  const h = pages.history;
  const name = oneLine(h.root.strainName || '(no name)') || '(no name)';
  const made = utcWords(pages.madeAt.toISOString()) ?? pages.madeAt.toISOString();
  const { n, dated } = counts(pages);
  const received = h.nodes.filter((x) => !!x.record.receivedFrom).length;
  const theirs = h.outside.filter((o) => o.kind === 'theirs').length;
  const named = h.outside.filter((o) => o.kind === 'named').length;
  const leftOut = h.outside.filter((o) => o.kind === 'left-out').length;
  const title = `Cover note: breeding history (draft) of ${name}`;
  const body = `<h1>${escapeHtml(title)}</h1>
${p(DRAFT_LINE, 'draft')}
${p(`Made ${made} by the VeilCore site, from the holder’s own copy of the records.`, 'muted')}
${datingNote(pages)}
<h2>What this is</h2>
${p(`Records of the breeding steps of ${name}, one record per step, from the holder’s own copy: ${n} record${n === 1 ? '' : 's'}. ${n - dated} ${n - dated === 1 ? 'is' : 'are'} not dated on any network yet; ${dated} ${dated === 1 ? 'is' : 'are'} dated on a network, as VeilCore’s registry reported it.${received ? ` ${received} of them came through a VeilCore delivery from someone else: what ${received === 1 ? 'it says' : 'they say'} came from them.` : ''} Each record comes with its own evidence bundle, which anyone can check without VeilCore. An applicant may add this as supporting material (for example to US PVP Exhibit D, or as an annex to a technical questionnaire). No office requires it or has endorsed it.`)}
<h2>What it shows</h2>
${list([
  'For each record with a date stamp, once the stamp is looked up (each record’s verify.html says how): that record existed, unchanged, by that date. So the pedigree, stage and selection the breeder wrote in it existed by then.',
  'How the records link to each other: the parents as sealed in each one.',
])}
<h2>What it does not show</h2>
${list([
  'That anything the breeder wrote is true: names, parents, stages, what was selected for, stated dates.',
  'Anything earlier than the day each record was sealed. A record sealed the week of filing dates nothing before that week.',
  'Uniformity, stability or distinctness. Those come from growing trials; their boxes are left blank for the breeder.',
  'That the variety was never sold or given away, or who holds the plant or any rights in it now.',
  `Records held by someone else (${theirs}), parents named without a record (${named})${leftOut ? `, or records left out of this export (${leftOut})` : ''}: they are listed, not included.`,
  'VeilCore doesn’t vouch for anyone or for anything a record says. How much weight an office or court gives this is for them to decide.',
])}
<h2>Which office</h2>
${p('US Plant Variety Protection (USDA) covers hemp only: 0.3% or less delta-9 THC. Higher-THC cannabis has no PVP route; the federal option is a USPTO plant patent, for a variety that has been reproduced asexually (for example by cuttings). Other countries have their own rules. Check the current rules with the office or an agent.')}
<h2>In this folder</h2>
${list([
  `${HISTORY_FILE}: the genealogy and one row per record, under three plain headings (US PVP Exhibit A, a UPOV-style questionnaire section 4.1, a Japanese 説明書 §4), with blank boxes for what VeilCore doesn’t hold.`,
  `${COVER_FILE}: this page.`,
  'evidence/: one evidence bundle per record in this history, each with verify.html (checks it offline), README.txt and a printable examiner summary.',
])}`;
  return shell(title, 'veilcore-breeding-history-cover/v1', body);
};
