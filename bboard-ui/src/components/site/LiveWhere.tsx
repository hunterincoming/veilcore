// What works, and where: one row per feature, and for each the sites it works on. On the home
// page folded under its title (#live); on How it works open (#where), as in the site design (21 Nov
// 2026). Every cell is chosen by the config flags in config/copy.ts (ROYALTIES_RUN_ON_MAINNET,
// LAB_SIGNING_RUN_ON_MAINNET and the rest) and the build, never written in by hand: when a flag
// turns on, the table says so in every language. Moved here from Home.tsx unchanged.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { useLocation } from 'react-router-dom';
import { IS_TEST_SITE, MAINNET_SENDS, THIS_BUILD, useI18n } from '../../i18n';
import { IS_MAINNET } from '../../config/network';
import {
  AGREEMENTS_LIVE,
  DEVICE_ONLY_CLAIMS_RUN_ON_MAINNET,
  DEVICE_ONLY_RUN_ON_MAINNET,
  DOCUMENT_CHAIN_RUN_ON_MAINNET,
  LAB_SIGNING_RUN_ON_MAINNET,
  ROYALTIES_RUN_ON_MAINNET,
  ROYALTIES_RUN_ON_TEST,
} from '../../config/copy';
import { APP_REPO, SR_ONLY, Two, arrowed } from './night-parts';

/** Our own reviews (not audits), listed in the public repository's audit pack, section 8. */
const REVIEWS_URL = `${APP_REPO}/blob/main/docs/audit/README.md#8-history-of-internal-attack-rounds`;

/** The public test site (docs/test-site.md). */
export const TEST_SITE_URL = 'https://test.veilcore.org';

/**
 * What's live where: one row per feature, and for each the sites it works on. Read from
 * the code and docs on 14 October 2026 (i18n/en.ts, "What's live where"); a cell left out
 * means the feature isn't there (a dash on wide screens, nothing on a phone). A table on
 * wide screens; on a phone each row stacks, and each cell names its site.
 */
const LIVE_ROWS = [
  ['stamp', true, true, false],
  // The registry stamps every sealed batch on Bitcoin (OpenTimestamps), and the plant page
  // offers the batch's stamp file (round 5). The test site's registry runs with it off
  // (docs/no-wallet-run-12oct.md), so no test-site cell.
  ['btc', true, false, false],
  // The check page looking the date up on Midnight itself (docs/check-on-chain.md): on the
  // test site through the sponsor's relay; on veilcore.org once the read-only relay is live
  // (its cell says "Not yet" in en.ts, "Yes." from the mainnet overlay on a build with one).
  ['chain', true, true, false],
  ['share', true, true, false],
  ['lab', true, true, false],
  // Lab reports locked to the breeder: on veilcore.org too since 16 Oct 2026 (config/network.ts).
  ['results', true, true, false],
  // Numbers and results a lab signs (config/network.ts LAB_SIGNING_ENABLED): switched on for
  // veilcore.org too (from the first site deploy that carries it). Its cell says "built, not yet tried" until it has worked there
  // (config/copy.ts LAB_SIGNING_RUN_ON_MAINNET, cellKey below).
  ['signed', true, true, false],
  // A document kept on this device only (config/network.ts DEVICE_ONLY_RECORDS_ENABLED): on in
  // every build. Its veilcore.org cell says "built, not yet tried" until one has been sealed and
  // checked there (config/copy.ts DEVICE_ONLY_RUN_ON_MAINNET, cellKey below).
  ['local', true, true, false],
  // A production chain as document records (config/network.ts DOCUMENT_CHAIN_ENABLED), and
  // proving a number from a document kept on the device only (DEVICE_ONLY_CLAIMS_ENABLED): on in
  // every build. Neither has been tried on a network yet, so both cells say "built", and the
  // veilcore.org cell keeps saying so until each has worked there (config/copy.ts
  // DOCUMENT_CHAIN_RUN_ON_MAINNET, DEVICE_ONLY_CLAIMS_RUN_ON_MAINNET, cellKey below).
  ['docchain', true, true, false],
  ['localclaims', true, true, false],
  ['dna', true, true, false],
  ['prove', false, true, true],
  ['claims', true, false, true],
  ['lic', true, true, true],
] as const;

/**
 * With the mainnet sponsor live (scripts/deploy-mainnet.mjs), "prove it by link" works on
 * veilcore.org exactly as on the test site, so its cell says the same thing the test cell does.
 */
type LiveRow = (typeof LIVE_ROWS)[number];
// Read when drawn, not when this file loads: it is in a chunk the How it works page shares, and
// the i18n chunk sets THIS_BUILD only after its language has loaded (vite.config.ts).
const CLAIMS_ON_SITE = () => THIS_BUILD.claimsOnSite === true;
/** veilcore.org itself, built with licenses on and the mainnet sponsor live. */
const LICENSES_ON_SITE = () => THIS_BUILD.agreementsLive === true && MAINNET_SENDS;
const liveRows = (): readonly LiveRow[] =>
  LIVE_ROWS.map((r): LiveRow => {
    if (MAINNET_SENDS && r[0] === 'prove') return ['prove', true, true, false] as unknown as LiveRow;
    // Licenses: a tick in the veilcore.org column on every build while AGREEMENTS_LIVE is on. The
    // cell's words (cellKey, below) say "Yes" once royalties have worked on veilcore.org
    // (config/copy.ts ROYALTIES_RUN_ON_MAINNET): on veilcore.org's own build, and on the test
    // site and the demo too, since it is a fact about veilcore.org. Until then they say licenses
    // come with the deploy (m.live.lic.mainNext).
    if (AGREEMENTS_LIVE && r[0] === 'lic') return ['lic', true, true, false] as unknown as LiveRow;
    // "Prove one number" on veilcore.org (the sponsor pays for VeilCore's claims contract).
    if (CLAIMS_ON_SITE() && r[0] === 'claims') return ['claims', true, true, false] as unknown as LiveRow;
    return r;
  });
const cellKey = (row: string, col: string) =>
  (MAINNET_SENDS && row === 'prove' && col === 'main'
    ? 'm.live.prove.test'
    : AGREEMENTS_LIVE && row === 'lic' && col === 'main'
      ? // "Yes" only once royalties have worked on veilcore.org. After that, a mainnet build says
        // "Yes" only with licenses on (veilcore.org's own build); the test site and the demo say
        // it too, since it is a fact about veilcore.org, not about the build.
        !ROYALTIES_RUN_ON_MAINNET
        ? 'm.live.lic.mainNext'
        : LICENSES_ON_SITE() || !IS_MAINNET
          ? 'm.live.lic.live'
          : 'm.live.lic.next'
      : // The test site: licenses are there; royalties say "Yes" only once v2 has run there.
        row === 'lic' && col === 'test' && !ROYALTIES_RUN_ON_TEST
        ? 'm.live.lic.testNext'
        : CLAIMS_ON_SITE() && row === 'claims' && col !== 'not'
          ? 'm.live.claims.live'
          : // Lab signing: "Yes" on veilcore.org only once it has worked there, on every build.
            LAB_SIGNING_RUN_ON_MAINNET && row === 'signed' && col === 'main'
            ? 'm.live.signed.live'
            : // Kept on this device only: "Yes" on veilcore.org only once it has worked there.
              DEVICE_ONLY_RUN_ON_MAINNET && row === 'local' && col === 'main'
              ? 'm.live.local.live'
              : // A production chain, and a number proved from a device-only document: the same rule.
                DOCUMENT_CHAIN_RUN_ON_MAINNET && row === 'docchain' && col === 'main'
                ? 'm.live.docchain.live'
                : DEVICE_ONLY_CLAIMS_RUN_ON_MAINNET && row === 'localclaims' && col === 'main'
                  ? 'm.live.localclaims.live'
                  : `m.live.${row}.${col}`) as Parameters<ReturnType<typeof useI18n>['t']>[0];

/**
 * `open`: drawn open with its title as a section heading (How it works, #where); otherwise folded
 * under a smaller title (the home page, #live), opened when arrived at by /#live.
 */
export const LiveWhere: React.FC<{ open?: boolean }> = ({ open = false }) => {
  const { t } = useI18n();
  const { hash } = useLocation();
  const rows = liveRows();
  // The "Not yet" column is there only while some feature has a cell in it: an empty column
  // of dashes says nothing.
  const showNot = rows.some((r) => r[3]);
  const cols = (
    [
      ['main', 'chip live', t('m.live.colMain')],
      ['test', 'chip', t('m.live.colTest')],
      ['not', 'chip', t('m.live.colNot')],
    ] as const
  ).filter(([col]) => col !== 'not' || showNot);
  const table = (
    <table className="live-table">
      <thead>
        <tr>
          <th scope="col">
            <span style={SR_ONLY}>{t('m.live.feature')}</span>
          </th>
          <th scope="col">{t('m.live.colMain')}</th>
          <th scope="col">
            {/* On the test site itself, a link to itself reads oddly. No launch date beside it: a date like that goes stale. */}
            {IS_TEST_SITE ? (
              t('m.live.colTestHere')
            ) : (
              <a href={TEST_SITE_URL} rel="noopener noreferrer" target="_blank">
                {t('m.live.colTest')}
              </a>
            )}
          </th>
          {showNot && <th scope="col">{t('m.live.colNot')}</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map(([row, ...has]) => (
          <tr key={row}>
            <th scope="row">{t(`m.live.${row}.t`)}</th>
            {cols.map(([col, chip, name], i) =>
              has[i] ? (
                <td key={col}>
                  <span className={chip}>{name}</span> {t(cellKey(row, col))}
                </td>
              ) : (
                <td key={col} className="no">
                  <span aria-hidden="true">—</span>
                </td>
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
  if (open)
    return (
      <div className="k-live k-live-open">
        <p className="k-sub">{t('m.live.lede')}</p>
        <div className="k-live-scroll">{table}</div>
      </div>
    );
  // Folded on every screen size (the page is short); opened when arrived at by /#live, the
  // footer's "What's live where" and Help's answer for labs.
  return (
    <div className="k-live" id="live">
      <h3 className="k-h3">
        <Two a={t('m.live.title1')} b={t('m.live.title2')} />
      </h3>
      <p className="k-sub">{t('m.live.lede')}</p>
      <details className="older-posts live-fold" open={hash === '#live' || undefined}>
        <summary>{t('m.live.show')}</summary>
        {table}
      </details>
    </div>
  );
};

/** "Where things stand": the same three lines on the home page and How it works, and what is live now. */
export const StandList: React.FC = () => {
  const { t, sp } = useI18n();
  // Licenses with their royalty reports, and lab-signed results, have both worked on
  // veilcore.org (config/copy.ts): the line says so only while all three flags say so.
  const liveNow = AGREEMENTS_LIVE && ROYALTIES_RUN_ON_MAINNET && LAB_SIGNING_RUN_ON_MAINNET;
  return (
    <ul className="k-status">
      <li>
        <i className="k-m k-m-on" />
        <b>{t('m.stat2.b')}</b>
        {sp}
        {t('m.stat2.s')}
      </li>
      <li>
        <i className="k-m k-m-off" />
        <b>{t('m.stat3.b')}</b>
        {sp}
        {t('m.stat3.s')}
        {sp}
        {/* Where the reviews really are: the public repository's audit pack, section 8. */}
        <a href={REVIEWS_URL} rel="noopener noreferrer" target="_blank">
          {arrowed(t('m.stat3.link'))}
        </a>
      </li>
      <li>
        <i className="k-m k-m-on" />
        <b>{t('m.stat4.b')}</b>
        {sp}
        {t('m.stat4.s')}
      </li>
      {liveNow && (
        <li>
          <i className="k-m k-m-on" />
          {t('m.status.liveNow')}
        </li>
      )}
    </ul>
  );
};
