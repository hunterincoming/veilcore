// The pack for the authority as a page (veilcore/authority-pack.ts): what prints, laid out for
// A4. Plain document markup, no app widgets, so the browser's PDF reads like a document: the gaps
// first, then the six parts in the order the rules list them, then the footer and the signature
// lines. Everything is in the pack's language (`tr`), which may not be the screen's.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Box } from '@mui/material';
import type { Translator } from '../../i18n/translate';
import type { AppKey } from '../../i18n/app/en';
import {
  batchCounts,
  dateLineItems,
  dayOf,
  gapWords,
  registrationOf,
  type AuthorityPack,
  type PackItem,
  type ReportLine,
} from '../../veilcore/authority-pack';
import { isKeptOnDeviceOnly, type StrainRecord } from '../../veilcore/records';
import { documentKindOf } from '../../veilcore/document-kind';
import { CODE_FONT } from '../../config/theme';

/** A string as a CSS string literal: quotes, backslashes, line breaks and "<" escaped. */
export const cssString = (v: string): string =>
  `"${v
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/</g, '\\3C ')
    .replace(/[\n\r\u2028\u2029]+/g, ' ')}"`;

/**
 * The page on A4, and a running footer on every printed page (CSS margin boxes): the association
 * and the period on the left, "page X of Y" on the right, in the pack's language. Made per pack,
 * since it carries what the officer typed (escaped as a CSS string, never as markup).
 */
export const pageCss = (left: string, pageOf: string): string => {
  const [before = '', rest = ''] = pageOf.split('\u0001');
  const [middle = '', after = ''] = rest.split('\u0002');
  const right = [
    before && cssString(before),
    'counter(page)',
    middle && cssString(middle),
    'counter(pages)',
    after && cssString(after),
  ]
    .filter(Boolean)
    .join(' ');
  const box =
    'font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; font-size: 7.5pt; color: #4b4f57;';
  return `@page { size: A4; margin: 14mm 12mm 17mm; @bottom-left { content: ${cssString(left)}; ${box} } @bottom-right { content: ${right}; ${box} } }`;
};

/**
 * In print, only the pack: the site's header and footer, the form, and Ask's button are left out,
 * on A4 with plain margins. Rows and record blocks don't break across pages.
 */
export const PACK_PRINT_STYLES = {
  '@media print': {
    'header[data-site-header], footer:not(.pack-footer), [data-no-print], .MuiFab-root': { display: 'none !important' },
    // The app's cream page colour would show round the pack's edge: everything prints on white.
    'html, body, #root, #root > div, main': { background: '#fff !important' },
    main: { padding: '0 !important', margin: '0 !important', maxWidth: 'none !important' },
    '[data-authority-pack-page]': { maxWidth: 'none !important' },
    '[data-authority-pack]': {
      border: '0 !important',
      padding: '0 !important',
      margin: '0 !important',
      fontSize: '9pt !important',
      boxShadow: 'none !important',
      borderRadius: '0 !important',
      background: 'transparent !important',
    },
  },
} as const;

const INK = '#16181d';
const MUTED = '#4b4f57';
const LINE = '#c9ccd2';
const WARN = '#8a3b00';
const WARN_BG = '#fff4e5';

const sx = {
  color: INK,
  bgcolor: '#fff',
  border: `1px solid ${LINE}`,
  borderRadius: 1,
  p: { xs: 2, sm: 4 },
  fontSize: { xs: '13px', sm: '13.5px' },
  lineHeight: 1.45,
  overflowWrap: 'anywhere',
  '& h1': { fontSize: '1.5em', m: 0, lineHeight: 1.2 },
  '& h2': {
    fontSize: '1.12em',
    mt: 3,
    mb: 0.75,
    pb: 0.25,
    borderBottom: `1.5px solid ${INK}`,
    breakAfter: 'avoid',
  },
  '& h3': { fontSize: '1em', mt: 1.5, mb: 0.5, breakAfter: 'avoid' },
  '& p': { my: 0.5 },
  '& .muted': { color: MUTED },
  '& .small': { fontSize: '0.86em' },
  '& .mono': { fontFamily: CODE_FONT, fontSize: '0.84em' },
  // A record ID wraps anywhere rather than leaving "VEIL-" alone on a line.
  '& .id': {
    fontFamily: CODE_FONT,
    fontSize: '0.8em',
    wordBreak: 'break-all',
    color: MUTED,
  },
  '& .meta': { display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 0.25, mt: 1.5 },
  '& .gaps': {
    border: `2px solid ${WARN}`,
    bgcolor: WARN_BG,
    borderRadius: 1,
    p: 1.5,
    mt: 2,
    breakInside: 'avoid',
    '& h2': { mt: 0, borderBottom: 0, color: WARN },
    '& ul': { m: 0, pl: 2.5 },
    '& li': { my: 0.25 },
    '&[data-pack-gaps="none"]': { borderColor: LINE, bgcolor: '#f4f6f4', '& h2': { color: INK } },
  },
  '& table': { width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', my: 1 },
  '& th, & td': { textAlign: 'left', verticalAlign: 'top', p: '5px 6px', borderTop: `1px solid ${LINE}` },
  '& th': { color: MUTED, fontWeight: 600, fontSize: '0.86em' },
  '& tr': { breakInside: 'avoid' },
  '& .figure': { fontSize: '1.6em', fontWeight: 700, lineHeight: 1.1 },
  '& .figures': { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, my: 1 },
  '& .block': { borderTop: `1px solid ${LINE}`, py: 1, breakInside: 'avoid' },
  '& .missing': { color: WARN, fontWeight: 700 },
  // The still-testing line under a record's date: not colour alone, so it survives a grey print.
  '& .warn-line': {
    color: WARN,
    fontWeight: 700,
    border: `1.5px solid ${WARN}`,
    borderRadius: '3px',
    padding: '2px 6px',
    my: 0.5,
    listStyle: 'none',
    marginLeft: '-1.2em',
  },
  '& .lot': { borderLeft: `3px solid ${LINE}`, pl: 1.5, my: 1, breakInside: 'avoid' },
  '& .lot[data-chromatography="missing"]': { borderLeftColor: WARN },
  '& a': { color: '#0b4fa8' },
  '& .sign': {
    display: 'grid',
    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
    columnGap: 4,
    rowGap: 5,
    mt: 5,
    breakInside: 'avoid',
  },
  '& .sign div': { borderTop: `1px solid ${INK}`, pt: 0.5, fontSize: '0.86em', color: MUTED },
  '& .not-form': { fontWeight: 700, mt: 0.5 },
  '& footer.pack-footer': { mt: 3, pt: 1, borderTop: `1px solid ${LINE}`, fontSize: '0.9em', breakInside: 'avoid' },
  // A phone: the production table's rows become stacked blocks, each value under its label.
  '@media (max-width: 600px)': {
    '& table.rows thead, & table.rows colgroup': { display: 'none' },
    '& table.rows, & table.rows tbody': { display: 'block', width: '100%' },
    '& table.rows tr, & table.rows td': { display: 'block', width: 'auto' },
    '& table.rows tr': { borderTop: `1.5px solid ${LINE}`, py: 0.5 },
    '& table.rows td': { borderTop: 0, p: '2px 0' },
    '& table.rows td::before': { content: 'attr(data-label)', display: 'block', color: MUTED, fontSize: '0.8em' },
  },
} as const;

const nameOf = (r: StrainRecord): string => r.strainName || r.id;

/** The link's visible words: its address up to the path, then an ellipsis; the whole link is behind it. */
const linkText = (href: string): string => {
  try {
    const u = new URL(href);
    const path = u.pathname.length > 32 ? `${u.pathname.slice(0, 32)}…` : u.pathname;
    return `${u.host}${path}${u.search || u.hash ? '…' : ''}`;
  } catch {
    return href.slice(0, 48);
  }
};

/** The site a check link is on, as a person types it: its host (veilcore.org). */
const siteOf = (href: string): string => {
  try {
    return new URL(href).host;
  } catch {
    return 'veilcore.org';
  }
};

const Gaps: React.FC<{ pack: AuthorityPack; tr: Translator }> = ({ pack, tr }) => (
  <section className="gaps" data-pack-gaps={pack.gaps.length ? 'some' : 'none'}>
    <h2>{tr.t('app.pack.doc.gapsTitle')}</h2>
    {pack.gaps.length ? (
      <ul>
        {pack.gaps.map((g, i) => (
          <li key={i} data-gap={g.kind}>
            {/* A date on a contract still in testing: marked, as its line under the record is. */}
            {g.kind === 'testing' ? <strong>⚠ {gapWords(g, tr)}</strong> : gapWords(g, tr)}
          </li>
        ))}
      </ul>
    ) : (
      <p>{tr.t('app.pack.doc.gapsNone')}</p>
    )}
  </section>
);

const Report: React.FC<{ line: ReportLine; tr: Translator }> = ({ line, tr }) =>
  line.kind === 'lab-signed' ? (
    <Box data-report={line.record.id} data-report-kind="lab-signed">
      <p>{tr.t('app.pack.doc.labSigned', { signer: line.signer })}</p>
      <p className="small">
        {line.numbers
          .map(
            (n) =>
              `${tr.t(`app.doc.slot.${n.path.split('.').pop()}` as AppKey)} ${n.value}${n.unit ? ` ${n.unit}` : ''}`,
          )
          .join(' · ')}
      </p>
      <p className="small muted">{tr.t('app.pack.doc.recordId', { id: line.record.id })}</p>
    </Box>
  ) : (
    <Box data-report={line.record.id} data-report-kind="document">
      <p>{tr.t('app.pack.doc.document', { title: nameOf(line.record) })}</p>
      {line.labSignature && <p className="small muted">{tr.t('app.pack.doc.labUnnamed')}</p>}
      <p className="small muted">{tr.t('app.pack.doc.recordId', { id: line.record.id })}</p>
    </Box>
  );

const figuresOf = (r: StrainRecord, tr: Translator): string => {
  const kind = documentKindOf(r);
  const vals = r.fieldSet?.values ?? [];
  const n = (v: string | null | undefined) => (v && /^\d+$/.test(v) ? tr.num(Number(v)) : undefined);
  if (kind === 'grow-batch') {
    const c = batchCounts(r);
    return c.plants === undefined
      ? tr.t('app.pack.doc.batchNoFigures')
      : tr.t('app.pack.doc.batchFigures', { plants: c.plants, inFlower: c.inFlower ?? '?' });
  }
  if (kind === 'harvest-lot') {
    const p = n(vals[0]);
    return p === undefined ? '' : tr.t('app.pack.doc.lotFigures', { plants: p });
  }
  return '';
};

const ProofBlock: React.FC<{ item: PackItem; tr: Translator }> = ({ item, tr }) => {
  const r = item.record;
  return (
    <div className="block" data-pack-item={r.id} data-role={item.role}>
      <p>
        <strong>{nameOf(r)}</strong>
        {' · '}
        {tr.t(`app.pack.role.${item.role}` as AppKey)}
        {' · '}
        {item.day}
      </p>
      <p className="small muted">
        {tr.t('app.pack.doc.recordId', { id: r.id })}
        {isKeptOnDeviceOnly(r) ? ` · ${tr.t('app.pack.doc.local')}` : ''}
      </p>
      <p className="small">
        {tr.t('app.pack.doc.proofCode')}: <span className="mono">{r.recordFingerprint || '—'}</span>
      </p>
      <p className="small">
        {item.link ? (
          <>
            {tr.t('app.pack.doc.checkLink')}:{' '}
            <a href={item.link} target="_blank" rel="noopener noreferrer" data-check-link="">
              {linkText(item.link)}
            </a>
          </>
        ) : (
          <span className="missing">{tr.t('app.pack.doc.noLink')}</span>
        )}
      </p>
      {item.link && (
        // A printed link can't be clicked: say where to type the ID on paper.
        <p className="small muted" data-on-paper="">
          {tr.t('app.pack.doc.onPaper', { site: siteOf(item.link), id: r.id })}
        </p>
      )}
      <p className="small muted">{tr.t('app.pack.doc.dateRests')}:</p>
      <ul className="small" style={{ margin: 0, paddingLeft: '1.2em' }} data-date-lines="">
        {dateLineItems(item.date, tr).map((l, i) =>
          l.warn ? (
            // A date on a contract still in testing (docs/contract-v2.md 7, condition 5): a
            // warning that reads on a black-and-white printout too: the ⚠ mark, bold, and a box.
            <li key={i} className="warn-line" data-v2-caution="">
              <strong>⚠ {l.text}</strong>
            </li>
          ) : (
            <li key={i}>{l.text}</li>
          ),
        )}
      </ul>
    </div>
  );
};

export const PackDocument: React.FC<{ pack: AuthorityPack; tr: Translator }> = ({ pack, tr }) => {
  const s = pack.selection;
  const { counts, form } = pack;
  const made = `${pack.madeAt.toISOString().slice(0, 10)} ${pack.madeAt.toISOString().slice(11, 16)} UTC`;
  const byId = new Map(pack.items.map((i) => [i.record.id, i.record]));
  const aboutWords = (r: StrainRecord): string =>
    (r.document?.about ?? [])
      .map((a) => (a.recordId && byId.get(a.recordId) ? nameOf(byId.get(a.recordId) as StrainRecord) : a.name))
      .join(', ');
  const steps: { r: StrainRecord; role: PackItem['role']; outside?: boolean }[] = [
    ...s.sources.map((r) => ({ r, role: 'source' as const })),
    ...s.batches.map((b) => ({ r: b.record, role: 'grow-batch' as const, outside: b.outside })),
    ...s.lots.map((r) => ({ r, role: 'harvest-lot' as const })),
  ];
  const periodText = tr.t('app.pack.doc.period', { from: s.period.from, to: s.period.to });
  const running = [form.association, periodText].filter(Boolean).join(' · ');
  const col = {
    step: tr.t('app.pack.doc.col.step'),
    name: tr.t('app.pack.doc.col.name'),
    date: tr.t('app.pack.doc.col.date'),
    figures: tr.t('app.pack.doc.col.figures'),
    about: tr.t('app.pack.doc.col.about'),
  };

  return (
    <Box component="article" sx={sx} data-authority-pack="" data-pack-lang={tr.lang}>
      <style data-pack-page="">
        {pageCss(running, tr.t('app.pack.doc.pageOf', { page: '\u0001', pages: '\u0002' }))}
      </style>
      <header>
        <h1>{tr.t('app.pack.doc.title')}</h1>
        <p className="muted">{tr.t('app.pack.doc.sub')}</p>
        <p className="not-form" data-pack-not-form="">
          {tr.t('app.pack.doc.notFormShort')}
        </p>
        <p className="small">{tr.t('app.pack.doc.rules')}</p>
        <div className="meta small">
          {form.association && <span>{tr.t('app.pack.doc.association', { name: form.association })}</span>}
          {form.preparedBy && <span>{tr.t('app.pack.doc.preparedBy', { name: form.preparedBy })}</span>}
          <span data-pack-doc-period="">{tr.t('app.pack.doc.period', { from: s.period.from, to: s.period.to })}</span>
          <span>{tr.t('app.pack.doc.made', { at: made, records: tr.tp('app.pack.doc.records', pack.held) })}</span>
        </div>
      </header>

      <Gaps pack={pack} tr={tr} />

      <section data-pack-section="variety">
        <h2>{tr.t('app.pack.doc.variety')}</h2>
        <p className="small muted">{tr.t('app.pack.doc.varietyHelp')}</p>
        {s.sources.length ? (
          <table>
            <thead>
              <tr>
                <th scope="col">{tr.t('app.pack.doc.col.variety')}</th>
                <th scope="col">{tr.t('app.pack.doc.col.registration')}</th>
                <th scope="col">{tr.t('app.pack.doc.col.record')}</th>
              </tr>
            </thead>
            <tbody>
              {s.sources.map((r) => {
                const reg = registrationOf(r);
                return (
                  <tr key={r.id} data-variety={r.id}>
                    <td>
                      <strong>{nameOf(r)}</strong>
                    </td>
                    <td className={reg ? undefined : 'missing'} data-registration={reg || 'none'}>
                      {reg || tr.t('app.pack.doc.regNone')}
                    </td>
                    <td className="id">{r.id}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="missing">{tr.t('app.pack.doc.varietyNone')}</p>
        )}
        {s.missingSources.map((m) => (
          <p key={m.id} className="small missing">
            {tr.t('app.pack.doc.sourceMissing', { name: m.name, id: m.id })}
          </p>
        ))}
      </section>

      <section data-pack-section="plants">
        <h2>{tr.t('app.pack.doc.plants')}</h2>
        <div className="figures">
          <div>
            <div className="small muted">{tr.t('app.pack.doc.plantsTotal')}</div>
            <div className="figure" data-pack-plants-total="">
              {counts.plants !== undefined ? tr.num(counts.plants) : tr.t('app.pack.doc.notGiven')}
            </div>
          </div>
          <div>
            <div className="small muted">{tr.t('app.pack.doc.plantsFlower')}</div>
            <div className="figure" data-pack-plants-flower="">
              {counts.inFlower !== undefined ? tr.num(counts.inFlower) : tr.t('app.pack.doc.notGiven')}
            </div>
          </div>
        </div>
        <p className="small muted">{tr.t('app.pack.doc.typed')}</p>
        {(counts.sums.plants !== undefined || counts.sums.inFlower !== undefined) && (
          <p className="small muted" data-pack-sums="">
            {tr.t('app.pack.doc.sums', {
              plants: counts.sums.plants !== undefined ? tr.num(counts.sums.plants) : '—',
              inFlower: counts.sums.inFlower !== undefined ? tr.num(counts.sums.inFlower) : '—',
            })}
          </p>
        )}
      </section>

      <section data-pack-section="patients">
        <h2>{tr.t('app.pack.doc.patients')}</h2>
        <div className="figure" data-pack-patients="">
          {form.patients !== undefined ? tr.num(form.patients) : tr.t('app.pack.doc.notGiven')}
        </div>
        <p className="small muted">{tr.t('app.pack.doc.patientsNote')}</p>
      </section>

      <section data-pack-section="production">
        <h2>{tr.t('app.pack.doc.production')}</h2>
        <p className="small muted">{tr.t('app.pack.doc.productionHelp')}</p>
        <table className="rows">
          <colgroup>
            <col style={{ width: '16%' }} />
            <col style={{ width: '30%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '20%' }} />
            <col style={{ width: '20%' }} />
          </colgroup>
          <thead>
            <tr>
              <th scope="col">{col.step}</th>
              <th scope="col">{col.name}</th>
              <th scope="col">{col.date}</th>
              <th scope="col">{col.figures}</th>
              <th scope="col">{col.about}</th>
            </tr>
          </thead>
          <tbody>
            {steps.map(({ r, role, outside }) => (
              <tr key={r.id} data-production={r.id} data-role={role}>
                <td data-label={col.step}>{tr.t(`app.pack.role.${role}` as AppKey)}</td>
                <td data-label={col.name}>
                  <strong>{nameOf(r)}</strong>
                  <br />
                  <span className="id">{r.id}</span>
                  {outside && (
                    <>
                      <br />
                      <span className="small muted">{tr.t('app.pack.doc.outside')}</span>
                    </>
                  )}
                </td>
                <td data-label={col.date}>{dayOf(r)}</td>
                <td data-label={col.figures}>{figuresOf(r, tr)}</td>
                <td data-label={col.about}>{role === 'source' ? '' : aboutWords(r)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section data-pack-section="chromatography">
        <h2>{tr.t('app.pack.doc.chromatography')}</h2>
        <p className="small muted">{tr.t('app.pack.doc.chromatographyHelp')}</p>
        {s.lots.length === 0 && <p className="missing">{tr.t('app.pack.gap.noLots')}</p>}
        {s.lots.map((lot) => {
          const lines = pack.reports.get(lot.id) ?? [];
          const status = lines.some((l) => l.kind === 'lab-signed')
            ? 'lab-signed'
            : lines.length
              ? 'document'
              : 'missing';
          return (
            <div key={lot.id} className="lot" data-lot={lot.id} data-chromatography={status}>
              <h3>{tr.t('app.pack.doc.lot', { lot: lot.refId || nameOf(lot) })}</h3>
              {lines.length ? (
                lines.map((l) => <Report key={l.record.id} line={l} tr={tr} />)
              ) : (
                <p className="missing">{tr.t('app.pack.doc.missing')}</p>
              )}
            </div>
          );
        })}
      </section>

      <section data-pack-section="proofs">
        <h2>{tr.t('app.pack.doc.proofs')}</h2>
        <p className="small muted">{tr.t('app.pack.doc.proofsHelp')}</p>
        {pack.items.map((i) => (
          <ProofBlock key={i.record.id} item={i} tr={tr} />
        ))}
      </section>

      <footer className="pack-footer" data-pack-footer="">
        <p>{tr.t('app.pack.doc.notForm')}</p>
        <p className="small muted">{tr.t('app.pack.doc.handover')}</p>
        <div className="sign" data-pack-sign="">
          <div>{tr.t('app.pack.doc.signSign')}</div>
          <div>{tr.t('app.pack.doc.signName')}</div>
          <div>{tr.t('app.pack.doc.signRole')}</div>
          <div>{tr.t('app.pack.doc.signDate')}</div>
        </div>
      </footer>
    </Box>
  );
};
