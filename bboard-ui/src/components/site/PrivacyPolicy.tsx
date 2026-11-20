// /privacy on veilcore.org: the privacy policy (Privacy.tsx shows it in a mainnet build; the test
// site keeps its short note). The words are i18n/privacy-policy/<lang>.ts, m.pp.*, in all five
// languages; the lawyer-review copy is docs/privacy-and-data-terms.md. The layout is here:
// which sections, in which order, and which rows each table has. privacy-policy.test.ts checks
// every key this names exists in every language.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { useI18n, type Lang } from '../../i18n';
import type { StringKey } from '../../i18n/en';

/** The day the policy last changed, as YYYY-MM-DD: change it with the words. */
export const POLICY_UPDATED = '2026-11-20';

/** The rows of each table, in order: m.pp.<section>.<row>.<cell>. */
export const DEVICE_ROWS = [
  'files',
  'vault',
  'recordkeys',
  'labkey',
  'deviceonly',
  'scan',
  'labels',
  'sheet',
  'passkey',
  'ask',
] as const;
export const SERVER_ROWS = [
  'records',
  'facts',
  'shown',
  'holder',
  'copy',
  'delivery',
  'labs',
  'results',
  'prove',
  'invites',
  'deals',
  'notices',
  'obligations',
  'receipts',
  'batches',
] as const;
export const OTHER_ROWS = [
  'vercel',
  'railway',
  'blockfrost',
  'midnight',
  'ots',
  'tsa',
  'explorers',
  'backblaze',
  'labsite',
  'passkey',
] as const;
export const SHORT = [1, 2, 3, 4, 5, 6] as const;
export const CHAIN = [1, 2, 3, 4, 5, 6, 7] as const;
export const DONT = [1, 2, 3] as const;
export const RIGHTS = ['see', 'delete', 'keep', 'fix', 'ask'] as const;
export const TECH = ['storage', 'locking', 'network', 'logs', 'backups'] as const;

/** Every key the page shows: the test holds each language to it. */
export const POLICY_KEYS: readonly string[] = [
  'm.pp.title',
  'm.pp.updated',
  'm.pp.lede',
  'm.pp.short.t',
  ...SHORT.map((n) => `m.pp.short.${n}`),
  'm.pp.who.t',
  'm.pp.who.p',
  'm.pp.device.t',
  'm.pp.col.what',
  'm.pp.device.col',
  ...DEVICE_ROWS.flatMap((r) => [`m.pp.device.${r}.t`, `m.pp.device.${r}.p`]),
  'm.pp.browser.t',
  'm.pp.browser.p1',
  'm.pp.browser.p2',
  'm.pp.server.t',
  'm.pp.server.p',
  'm.pp.col.read',
  'm.pp.col.keep',
  ...SERVER_ROWS.flatMap((r) => [`m.pp.server.${r}.t`, `m.pp.server.${r}.read`, `m.pp.server.${r}.keep`]),
  'm.pp.server.logs',
  'm.pp.server.purge',
  'm.pp.server.backup',
  'm.pp.chain.t',
  'm.pp.chain.p1',
  ...CHAIN.map((n) => `m.pp.chain.${n}`),
  'm.pp.chain.p2',
  'm.pp.ts.t',
  'm.pp.ts.p1',
  'm.pp.ts.p2',
  'm.pp.others.t',
  'm.pp.others.p',
  'm.pp.col.service',
  'm.pp.col.does',
  'm.pp.col.gets',
  ...OTHER_ROWS.flatMap((r) => [`m.pp.others.${r}.n`, `m.pp.others.${r}.does`, `m.pp.others.${r}.gets`]),
  'm.pp.others.links',
  'm.pp.dont.t',
  ...DONT.map((n) => `m.pp.dont.${n}`),
  'm.pp.pay.t',
  'm.pp.pay.p',
  'm.pp.rights.t',
  ...RIGHTS.flatMap((r) => [`m.pp.rights.${r}.t`, `m.pp.rights.${r}.p`]),
  'm.pp.changes.t',
  'm.pp.changes.p',
  'm.pp.tech.t',
  ...TECH.map((n) => `m.pp.tech.${n}`),
];

/** The date in the reader's language ("20 November 2026", "2026年11月20日"). */
export const policyDate = (lang: Lang): string =>
  new Date(`${POLICY_UPDATED}T12:00:00Z`).toLocaleDateString(lang === 'en' ? 'en-GB' : lang, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

/** A table that stacks into labelled rows on a phone (site.css .policy-table). */
const PolicyTable: React.FC<{ cols: readonly string[]; rows: readonly (readonly string[])[]; label: string }> = ({
  cols,
  rows,
  label,
}) => (
  <table className="policy-table" aria-label={label}>
    <thead>
      <tr>
        {cols.map((c) => (
          <th key={c} scope="col">
            {c}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {rows.map((cells) => (
        <tr key={cells[0]}>
          {cells.map((c, i) =>
            i === 0 ? (
              <th key={i} scope="row">
                {c}
              </th>
            ) : (
              <td key={i} data-col={cols[i]}>
                {c}
              </td>
            ),
          )}
        </tr>
      ))}
    </tbody>
  </table>
);

export const PrivacyPolicy: React.FC = () => {
  const { t, lang } = useI18n();
  const k = (s: string) => t(s as StringKey);
  const h2 = (id: string, key: string) => (
    <h2 className="privacy-full" id={id}>
      {k(key)}
    </h2>
  );
  return (
    <>
      <header className="wrap page">
        <h1>{k('m.pp.title')}</h1>
        <p data-policy-updated="">{t('m.pp.updated', { date: policyDate(lang) })}</p>
        <p>{k('m.pp.lede')}</p>
      </header>
      <section className="privacy-note policy" data-privacy-policy="">
        <div className="wrap">
          <div className="policy-short">
            <h2 id="short">{k('m.pp.short.t')}</h2>
            <ul>
              {SHORT.map((n) => (
                <li key={n}>{k(`m.pp.short.${n}`)}</li>
              ))}
            </ul>
          </div>

          {h2('who', 'm.pp.who.t')}
          <p>{k('m.pp.who.p')}</p>

          {h2('device', 'm.pp.device.t')}
          <PolicyTable
            label={k('m.pp.device.t')}
            cols={[k('m.pp.col.what'), k('m.pp.device.col')]}
            rows={DEVICE_ROWS.map((r) => [k(`m.pp.device.${r}.t`), k(`m.pp.device.${r}.p`)])}
          />

          {h2('browser', 'm.pp.browser.t')}
          <p>{k('m.pp.browser.p1')}</p>
          <p>{k('m.pp.browser.p2')}</p>

          {h2('server', 'm.pp.server.t')}
          <p>{k('m.pp.server.p')}</p>
          <PolicyTable
            label={k('m.pp.server.t')}
            cols={[k('m.pp.col.what'), k('m.pp.col.read'), k('m.pp.col.keep')]}
            rows={SERVER_ROWS.map((r) => [
              k(`m.pp.server.${r}.t`),
              k(`m.pp.server.${r}.read`),
              k(`m.pp.server.${r}.keep`),
            ])}
          />
          <p>{k('m.pp.server.logs')}</p>
          <p>{k('m.pp.server.purge')}</p>
          <p>{k('m.pp.server.backup')}</p>

          {h2('public', 'm.pp.chain.t')}
          <p>{k('m.pp.chain.p1')}</p>
          <ul>
            {CHAIN.map((n) => (
              <li key={n}>{k(`m.pp.chain.${n}`)}</li>
            ))}
          </ul>
          <p>{k('m.pp.chain.p2')}</p>

          {h2('timestamps', 'm.pp.ts.t')}
          <p>{k('m.pp.ts.p1')}</p>
          <p>{k('m.pp.ts.p2')}</p>

          {h2('others', 'm.pp.others.t')}
          <p>{k('m.pp.others.p')}</p>
          <PolicyTable
            label={k('m.pp.others.t')}
            cols={[k('m.pp.col.service'), k('m.pp.col.does'), k('m.pp.col.gets')]}
            rows={OTHER_ROWS.map((r) => [
              k(`m.pp.others.${r}.n`),
              k(`m.pp.others.${r}.does`),
              k(`m.pp.others.${r}.gets`),
            ])}
          />
          <p>{k('m.pp.others.links')}</p>

          {h2('dont', 'm.pp.dont.t')}
          <ul>
            {DONT.map((n) => (
              <li key={n}>{k(`m.pp.dont.${n}`)}</li>
            ))}
          </ul>

          {h2('payments', 'm.pp.pay.t')}
          <p>{k('m.pp.pay.p')}</p>

          {h2('choices', 'm.pp.rights.t')}
          <dl>
            {RIGHTS.map((r) => (
              <div key={r}>
                <dt>{k(`m.pp.rights.${r}.t`)}</dt>
                <dd>{k(`m.pp.rights.${r}.p`)}</dd>
              </div>
            ))}
          </dl>

          {h2('changes', 'm.pp.changes.t')}
          <p>{k('m.pp.changes.p')}</p>

          <details className="tech policy-tech" id="technical">
            <summary>{k('m.pp.tech.t')}</summary>
            {TECH.map((n) => (
              <p key={n}>{k(`m.pp.tech.${n}`)}</p>
            ))}
          </details>

          <p className="privacy-contact">
            <a href="mailto:hunter@veilcore.org">{t('m.privacy.contact')}</a>
          </p>
        </div>
      </section>
    </>
  );
};
