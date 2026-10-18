// The home page, laid out from Mako's 25 September template. Order (round 5, 15 October:
// shorter, plain headings, breeders first): hero with the live fingerprint and a one-line
// status, what it's for (one situation per reader), how it works, sharing proof instead of
// data (the claims contract), what you get and where it stops, if VeilCore disappears,
// questions, the demo, where things stand with what's live where, updates, one collapsed
// section for technical readers, contact by audience with the two founders.
//
// Technical detail (SHA-256, test vectors, OpenTimestamps, the contract addresses, the
// claims contract's status, the maintenance key) lives only in "For technical readers":
// still on the page, still true, but out of a breeder's way.
//
// The fingerprint in the hero is a real record commitment (veilcore-records), not a
// stand-in hash: what a visitor sees change is what the format publishes.
//
// Content rules (Mako's): "prior possession", never "ownership"; no customer, pilot or
// partner claims; plant AND animal genetics; the three implementations have one author and
// are never called independent; the status tiles stay honest and current, and the
// technical section says plainly who holds the maintenance key (docs/maintenance-policy.md,
// APPROVED 7 Oct).
// Strings that flip on mainnet day are grouped in i18n/en.ts under "MAINNET DAY".
//
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { computeCommitment, newNonce } from 'veilcore-records';
import { IS_TEST_SITE, MAINNET_SENDS, useI18n } from '../../i18n';
import { FOUNDERS_MAIL, RoleLine, SDK_REPO, SiteShell, X_HANDLE } from './SiteShell';
import { FoldGroup, FoldItem, FoldPoint, usePhone } from './Fold';
import { hasRecordsHere } from './returning';
import { IS_MAINNET, MAINNET_CLAIMS_ADDRESS, MAINNET_CONTRACT_ADDRESS, explorerFor } from '../../config/network';

const TESTNET_REPO = 'https://github.com/hunterincoming/veilcore-midnight-testnet';
/** The public test site (docs/test-site.md). It goes live with this release. */
const TEST_SITE_URL = 'https://test.veilcore.org';
/** Our own reviews (not audits), listed in the public repository's audit pack, section 8. */
const REVIEWS_URL = `${TESTNET_REPO}/blob/main/docs/audit/README.md#8-history-of-internal-attack-rounds`;

/**
 * A founder's photo, as on the Founders page. The initials show only if the photo can't
 * load. Not lazy: it is two small files, and a lazy one showed as initials in a full-page
 * screenshot (persona review, 17 Oct).
 */
const Avatar: React.FC<{ initials: string; photo: string }> = ({ initials, photo }) => {
  const [failed, setFailed] = useState(false);
  return (
    <span className="avatar">{failed ? initials : <img src={photo} alt="" onError={() => setFailed(true)} />}</span>
  );
};

/** Read by screen readers, not shown. */
const SR_ONLY: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

/**
 * A section laid out like an entry in a register or log book: the heading in a narrow left
 * column (it stays in view while you read the section), the entry to its right. Sections
 * start on the same left edge, so they are told apart by that edge and by space, not by
 * rules (site.css, "the register"). Below 1100px the heading sits above the entry.
 */
const Entry: React.FC<{ title: React.ReactNode; h?: 'h2' | 'h3'; className?: string; children: React.ReactNode }> = ({
  title,
  h: H = 'h2',
  className,
  children,
}) => (
  <div className={`wrap reg${className ? ` ${className}` : ''}`}>
    <H className="reg-h">{title}</H>
    <div className="entry">{children}</div>
  </div>
);

/** A heading written in two halves, read as one sentence. */
const Two: React.FC<{ a: string; b: string }> = ({ a, b }) => {
  const { sp } = useI18n();
  return (
    <>
      {a}
      {sp}
      <em>{b}</em>
    </>
  );
};

const Fingerprint: React.FC = () => {
  const { t } = useI18n();
  const [cultivar, setCultivar] = useState('Harbour Mist');
  const [bredBy, setBredBy] = useState(() => t('m.hero.bredByDefault'));
  const [hash, setHash] = useState('');
  const prev = useRef('');
  const [nonce] = useState(() => newNonce());
  // The digest changes on every keystroke; reading 64 characters each time drowns out the
  // typing. Instead, once typing pauses, a short line says it changed.
  const [announce, setAnnounce] = useState('');
  const seen = useRef(false);
  useEffect(() => {
    if (!hash) return;
    if (!seen.current) {
      seen.current = true;
      return;
    }
    // The same words twice in a row aren't read again, so every other time it ends in a
    // no-break space a screen reader doesn't speak.
    const said = t('m.hero.fpUpdated');
    const timer = window.setTimeout(() => setAnnounce((a) => (a === said ? `${said}\u00a0` : said)), 800);
    return () => window.clearTimeout(timer);
  }, [hash, t]);

  useEffect(() => {
    let live = true;
    void computeCommitment({
      formatVersion: '0.1',
      recordId: 'demo',
      subjectType: 'plant-genetic-material',
      profile: 'veilcore/profile/plant-variety/v1',
      commitment: '',
      commitmentAlgorithm: 'sha256/canonical-json/v1',
      anchor: { chain: 'midnight', network: 'undeployed' },
      sealedAt: '2026-01-01T00:00:00Z',
      holder: { id: 'demo' },
      parents: [],
      attestations: [],
      // Name and breeder are envelope fields under the plant-variety profile, as in the app.
      subject: { name: cultivar, originator: bredBy || undefined },
      profileData: { nonce },
    } as never).then((h) => {
      if (!live) return;
      setHash((old) => {
        prev.current = old;
        return h;
      });
    });
    return () => {
      live = false;
    };
  }, [cultivar, bredBy, nonce]);

  // The fingerprint in groups of eight, the way a long lab code is printed: easier to read
  // aloud and to compare by eye. The characters themselves are unchanged.
  // A character that changed rolls in (site.css .chg), each a few milliseconds after the
  // one before it, like the wheels of a numbering stamp.
  let rolled = 0;
  const chars = [...hash].map((c, i) =>
    prev.current && prev.current[i] !== c ? (
      <span key={`${i}-${c}`} className="chg" style={{ '--i': rolled++ } as React.CSSProperties}>
        {c}
      </span>
    ) : (
      <React.Fragment key={i}>{c}</React.Fragment>
    ),
  );
  const groups: React.ReactNode[] = [];
  for (let i = 0; i < chars.length; i += 8)
    groups.push(
      <span className="g" key={i}>
        {chars.slice(i, i + 8)}
      </span>,
    );

  // A specimen sheet: what you type is its label, which stays with you; the gold strip
  // under it is the proof code, the only part that goes on Midnight; the DATED stamp says
  // what happens to that strip (plan: pollen and ink).
  return (
    <div className="hash-demo" role="group" aria-label={t('m.hero.demoLabel')}>
      <div className="hd-card">
        <span className="stamp" aria-hidden="true">
          <b>{t('m.hero.stampWord')}</b>
          <span>{t('m.hero.stampLine')}</span>
        </span>
        <div className="hd-in">
          <p className="hd-zone">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3" y="4" width="18" height="12" rx="2" />
              <path d="M8 20h8M12 16v4" />
            </svg>
            {t('m.hero.typed')}
          </p>
          <div className="fields">
            <div className="field">
              <label htmlFor="cv">{t('m.hero.cultivar')}</label>
              <input id="cv" value={cultivar} autoComplete="off" onChange={(e) => setCultivar(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="by">{t('m.hero.bredBy')}</label>
              <input id="by" value={bredBy} autoComplete="off" onChange={(e) => setBredBy(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="hd-out">
          <p className="hd-zone">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3.5" y="5" width="17" height="15" rx="2" />
              <path d="M3.5 10h17M8 3v4M16 3v4" />
            </svg>
            {t('m.hero.goes')}
          </p>
          <div className="digest">{hash ? groups : '—'}</div>
          <span role="status" style={SR_ONLY}>
            {announce}
          </span>
        </div>
      </div>
      <p className="note">
        <span className="note-long">{t('m.hero.note')}</span>
        <span className="note-short">{t('m.hero.noteShort')}</span>
      </p>
    </div>
  );
};

/** Mainnet builds: the two contract addresses, in full, so anyone can look them up. */
const Contracts: React.FC = () => {
  const { t } = useI18n();
  return (
    <div className="contracts">
      <h3>{t('m.addr.title')}</h3>
      <dl>
        <div>
          <dt>{t('m.addr.main')}</dt>
          <dd>
            <code>{MAINNET_CONTRACT_ADDRESS}</code>
          </dd>
        </div>
        <div>
          <dt>{t('m.addr.claims')}</dt>
          <dd>{MAINNET_CLAIMS_ADDRESS ? <code>{MAINNET_CLAIMS_ADDRESS}</code> : t('m.addr.claimsPending')}</dd>
        </div>
      </dl>
      <a className="more" href={explorerFor('mainnet')} rel="noopener noreferrer" target="_blank">
        {t('m.addr.explorer')}
      </a>
    </div>
  );
};

/** One update, dated first: the site is about dates, so updates read like a log book. */
const Post: React.FC<{
  href: string;
  date: string;
  iso: string;
  tag: string;
  title: string;
  text: string;
  go: string;
}> = (p) => (
  <a className="post" href={p.href} rel="noopener noreferrer" target="_blank">
    <span className="when">
      <time dateTime={p.iso}>{p.date}</time>
      <span className="tag">{p.tag}</span>
    </span>
    <div className="what">
      <h3>{p.title}</h3>
      <p>{p.text}</p>
      <span className="go">{p.go}</span>
    </div>
  </a>
);

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
const liveRows = (): readonly LiveRow[] =>
  MAINNET_SENDS
    ? LIVE_ROWS.map((r): LiveRow => (r[0] === 'prove' ? (['prove', true, true, false] as unknown as LiveRow) : r))
    : LIVE_ROWS;
const cellKey = (row: string, col: string) =>
  (MAINNET_SENDS && row === 'prove' && col === 'main' ? 'm.live.prove.test' : `m.live.${row}.${col}`) as Parameters<
    ReturnType<typeof useI18n>['t']
  >[0];

const LiveWhere: React.FC<{ phone: boolean }> = ({ phone }) => {
  const { t } = useI18n();
  const cols = [
    ['main', 'chip live', t('m.live.colMain')],
    ['test', 'chip', t('m.live.colTest')],
    ['not', 'chip', t('m.live.colNot')],
  ] as const;
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
          <th scope="col">{t('m.live.colNot')}</th>
        </tr>
      </thead>
      <tbody>
        {liveRows().map(([row, ...has]) => (
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
  return (
    <div className="live-where" id="live">
      <Entry h="h3" title={<Two a={t('m.live.title1')} b={t('m.live.title2')} />}>
        <p className="lede">{t('m.live.lede')}</p>
      </Entry>
      {/* A table this wide would wrap every cell in the entry column: it runs the full width.
          On a phone the list stays one tap away, so the page reads in a few minutes. */}
      <div className="wrap full">
        {phone ? (
          <details className="older-posts live-fold">
            <summary>{t('m.live.show')}</summary>
            {table}
          </details>
        ) : (
          table
        )}
      </div>
    </div>
  );
};

/** Everything a technical reader wants, in one block that stays closed until asked for. */
const Technical: React.FC = () => {
  const { t, sp } = useI18n();
  // Opened when arrived at from the app footer's "How checking works" (/#technical).
  const { hash } = useLocation();
  return (
    <section id="technical">
      <Entry title={t('m.tech.title')}>
        <p className="lede">{t('m.tech.lede')}</p>
        <details className="tech" open={hash === '#technical' || undefined}>
          <summary className="btn">{t('m.tech.show')}</summary>
          <div className="points">
            <div className="pt">
              <h3>{t('m.tech.check.t')}</h3>
              <p>
                {t('m.tech.check.p')}
                {sp}
                <RouterLink to="/docs/spec">{t('m.open.6link')}</RouterLink>
              </p>
            </div>
            <div className="pt">
              <h3>{t('m.tech.impl.t')}</h3>
              <p>
                {t('m.tech.impl.p')}
                {sp}
                <RouterLink to="/implementations">{t('m.open.1link')}</RouterLink>
              </p>
            </div>
            <div className="pt">
              <h3>{t('m.tech.btc.t')}</h3>
              <p>{t('m.tech.btc.p')}</p>
            </div>
            <div className="pt">
              <h3>{t('m.tech.dna.t')}</h3>
              <p>{t('m.tech.dna.p')}</p>
            </div>
            <div className="pt wide">
              <h3>{t('m.claims.statusTitle')}</h3>
              <p>{t('m.claims.status')}</p>
            </div>
            <div className="pt wide">
              <h3>{t('m.status.keyTitle')}</h3>
              <p>
                {t('m.status.keyText')}
                {sp}
                <a
                  href={`${TESTNET_REPO}/blob/main/docs/maintenance-policy.md`}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {t('m.status.keyLink')}
                </a>
              </p>
            </div>
          </div>
          {IS_MAINNET && <Contracts />}
        </details>
      </Entry>
    </section>
  );
};

/** The explainer in the page's language: every word in the video is translated (media-src/explainer). */
export const walkthroughFile = (lang: string, ext: 'mp4' | 'jpg'): string =>
  ['de', 'es', 'fr', 'ja'].includes(lang)
    ? `/media/veilcore-walkthrough.${lang}.${ext}`
    : `/media/veilcore-walkthrough.${ext}`;

export const Home: React.FC = () => {
  const { t, lang, sp } = useI18n();
  const { hash } = useLocation();
  const [showVideo, setShowVideo] = useState(false);
  const [returning] = useState(hasRecordsHere);
  const phone = usePhone();

  // Arriving from another page at /#section: the router does not scroll to it.
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  const post = (k: 'postB' | 'postA' | 'post0' | 'post1' | 'post2', doc: string, iso: string) => (
    <Post
      key={k}
      href={`${TESTNET_REPO}/blob/main/docs/${doc}`}
      iso={iso}
      date={t(`m.${k}.date`)}
      tag={t(`m.${k}.tag`)}
      title={t(`m.${k}.title`)}
      text={t(`m.${k}.text`)}
      go={t('m.updates.read')}
    />
  );
  const latest = [
    post('postB', 'mainnet-completeness.md', '2026-10-11'),
    post('postA', 'deployment-record-revision-4.md', '2026-10-08'),
  ];
  const third = post('post0', 'preprod-run-4oct.md', '2026-10-04');
  const older = [post('post1', 'self-audit-3oct.md', '2026-10-03'), post('post2', 'preprod-run-2oct.md', '2026-10-02')];

  return (
    <SiteShell>
      <div className="hero-band">
        <header className={`wrap hero${lang === 'ja' ? ' cjk' : ''}`} id="top">
          <div className="hero-text">
            <h1>
              {t('m.hero.title1')}
              {sp}
              <em>{t('m.hero.title2')}</em>
            </h1>
            <p className="lede">{t('m.hero.lede')}</p>
            <div className="hero-actions">
              {returning && (
                <RouterLink className="btn solid" to="/records" data-your-records="">
                  {t('m.nav.yours')}
                </RouterLink>
              )}
              <a className={returning ? 'btn' : 'btn solid'} href="#demo">
                {t('m.nav.demo')}
              </a>
              <a className="btn" href="#how">
                {t('m.hero.how')}
              </a>
            </div>
            <p className="hero-status">{t('m.hero.status')}</p>
          </div>
          <Fingerprint key={lang} />
        </header>
      </div>

      <section id="about">
        <Entry title={<Two a={t('m.for.title1')} b={t('m.for.title2')} />}>
          <p className="lede">{t('m.for.lede')}</p>
          <div className="points">
            <FoldPoint mode="hide" defaultOpen title={t('m.for.1t')}>
              {t('m.for.1p')}
            </FoldPoint>
            <FoldPoint mode="hide" title={t('m.for.2t')}>
              {t('m.for.2p')}
              {sp}
              <a href="#claims">{t('m.for.2link')}</a>
            </FoldPoint>
            <FoldPoint mode="hide" title={t('m.for.3t')}>
              {t('m.for.3p')}
            </FoldPoint>
            <FoldPoint mode="hide" title={t('m.for.4t')}>
              {t('m.for.4p')}
            </FoldPoint>
            <FoldPoint mode="hide" title={t('m.for.6t')}>
              {t('m.for.6p')}
            </FoldPoint>
            <FoldPoint mode="hide" title={t('m.for.5t')}>
              {t('m.for.5p')}
              {sp}
              <a href={`${FOUNDERS_MAIL}&subject=${encodeURIComponent('Animal records')}`}>{t('m.for.5ask')}</a>
            </FoldPoint>
          </div>
        </Entry>
      </section>

      <section id="how">
        <Entry title={<Two a={t('m.how.title1')} b={t('m.how.title2')} />}>
          {/* A real sequence, so an ordered list: the numerals are the list's own counter
              (site.css), joined by one line down the left, the order of time. */}
          <ol className="steps">
            {(['1', '2', '3', '4'] as const).map((n) => (
              <li className="step" key={n}>
                <h3>{t(`m.step${n}.title`)}</h3>
                <p>{t(`m.step${n}.text`)}</p>
              </li>
            ))}
          </ol>
        </Entry>
      </section>

      <section id="claims">
        <Entry title={<Two a={t('m.claims.title1')} b={t('m.claims.title2')} />}>
          <p className="lede">{t('m.claims.lede')}</p>
          <ul className="claim-list">
            {(['1', '2', '3', '4', '5'] as const).map((n) => (
              <FoldItem key={n} mode="hide" lead={t(`m.claims.${n}t`)}>
                {t(`m.claims.${n}p`)}
              </FoldItem>
            ))}
          </ul>
          <div className="claim-notes">
            <FoldItem tag="div" className="claim-limits" lead={t('m.claims.limitsTitle')}>
              {t('m.claims.limits')}
            </FoldItem>
            <RouterLink className="more" to="/docs/spec">
              {t('m.claims.link')}
            </RouterLink>
          </div>
        </Entry>
      </section>

      <section id="value">
        <Entry title={<Two a={t('m.get.title1')} b={t('m.get.title2')} />}>
          <div className="isnt">
            <div className="y">
              <h3>{t('m.get.title')}</h3>
              <ul>
                {(['1', '2', '3'] as const).map((n) => (
                  <FoldItem key={n} lead={t(`m.get.${n}a`)}>
                    {t(`m.get.${n}b`)}
                  </FoldItem>
                ))}
              </ul>
            </div>
            <div className="lim">
              <h3>{t('m.stops.title')}</h3>
              <ul>
                {(['1', '2', '3', '4'] as const).map((n) => (
                  <FoldItem key={n} lead={t(`m.stops.${n}a`)}>
                    {t(`m.stops.${n}b`)}
                  </FoldItem>
                ))}
                {/* Where VeilCore stops with labs: it shows who signed, never vouches. */}
                <FoldItem lead={t('m.open.3t')}>{t('m.open.3p')}</FoldItem>
              </ul>
            </div>
          </div>
        </Entry>
      </section>

      <section id="open">
        <Entry title={<Two a={t('m.open.title1')} b={t('m.open.title2')} />}>
          <div className="points">
            <FoldPoint mode="clamp" title={t('m.open.1t')}>
              {t('m.open.1p')}
            </FoldPoint>
            <FoldPoint mode="clamp" title={t('m.open.2t')}>
              {t('m.open.2p')}
            </FoldPoint>
            <FoldPoint mode="clamp" title={t('m.open.6t')}>
              {t('m.open.6p')}
              {sp}
              <RouterLink to="/docs/spec">{t('m.open.6link')}</RouterLink>
            </FoldPoint>
            <FoldPoint mode="clamp" title={t('m.open.4t')}>
              {t('m.open.4p')}
            </FoldPoint>
          </div>
        </Entry>
      </section>

      <section id="questions">
        <Entry title={<Two a={t('m.faq.title1')} b={t('m.faq.title2')} />}>
          <div className="faq">
            <details>
              <summary>{t('m.faq.1q')}</summary>
              <p>{t('m.faq.1a')}</p>
            </details>
            <details>
              <summary>{t('m.faq.2q')}</summary>
              <p>{t('m.faq.2a')}</p>
            </details>
            <details>
              <summary>{t('m.faq.3q')}</summary>
              <p>
                {t('m.faq.3a')}
                {sp}
                <RouterLink to="/docs/evidence">{t('m.faq.3link')}</RouterLink>
              </p>
            </details>
            <details>
              <summary>{t('m.faq.4q')}</summary>
              <p>
                {t('m.faq.4a')}
                {sp}
                <RouterLink to="/privacy">{t('m.faq.4link1')}</RouterLink>{' '}
                <RouterLink to="/docs/integrate">{t('m.faq.4link2')}</RouterLink>
              </p>
            </details>
            <details>
              <summary>{t('m.faq.6q')}</summary>
              <p>{t('m.faq.6a')}</p>
            </details>
          </div>
        </Entry>
      </section>

      {/* One of the two bands of colour on the page: where both "Try the demo" buttons land. */}
      <section id="demo" className="dark">
        <Entry title={<Two a={t('m.demo.title1')} b={t('m.demo.title2')} />}>
          <p className="lede">
            {t('m.demo.lede')}
            {sp}
            <RouterLink to="/privacy" className="inline">
              {t('m.demo.privacy')}
            </RouterLink>
          </p>
          <div className="demos">
            <RouterLink className="demo" to="/new">
              <h3>{t('m.demo.create.title')}</h3>
              <p>{t('m.demo.create.text')}</p>
              <div className="meta-row">
                <span className="chip live">{t('m.chip.interactive')}</span>
                <span className="chip">{t('m.chip.3min')}</span>
              </div>
            </RouterLink>
            <RouterLink className="demo" to="/verify">
              <h3>{t('m.demo.verify.title')}</h3>
              <p>{t('m.demo.verify.text')}</p>
              <div className="meta-row">
                <span className="chip live">{t('m.chip.interactive')}</span>
                <span className="chip">{t('m.chip.1min')}</span>
              </div>
            </RouterLink>
            <button
              type="button"
              className="demo"
              aria-expanded={showVideo}
              aria-controls="walkthrough"
              onClick={() => setShowVideo(!showVideo)}
            >
              <h3>{t('m.demo.video.title')}</h3>
              <p>{t('m.demo.video.text')}</p>
              <div className="meta-row">
                <span className="chip">{t('m.chip.video')}</span>
                <span className="chip">{t('m.chip.60s')}</span>
              </div>
            </button>
          </div>
          {showVideo && (
            <div className="walkthrough" id="walkthrough">
              <video
                key={lang}
                src={walkthroughFile(lang, 'mp4')}
                poster={walkthroughFile(lang, 'jpg')}
                controls
                autoPlay
                playsInline
                preload="metadata"
                aria-label={t('m.demo.video.title')}
              />
            </div>
          )}
        </Entry>
      </section>

      <section id="status">
        <Entry title={<Two a={t('m.status.title1')} b={t('m.status.title2')} />}>
          <p className="lede">{t('m.status.lede')}</p>
          <div className="status">
            <div className="stat ok">
              <b>{t('m.stat2.b')}</b>
              <span>{t('m.stat2.s')}</span>
            </div>
            <div className="stat">
              <b>{t('m.stat3.b')}</b>
              <span>
                {t('m.stat3.s')}
                {sp}
                {/* Where the reviews really are: the public repository's audit pack, section 8. */}
                <a href={REVIEWS_URL} rel="noopener noreferrer" target="_blank">
                  {t('m.stat3.link')}
                </a>
              </span>
            </div>
            <div className="stat">
              <b>{t('m.stat4.b')}</b>
              <span>{t('m.stat4.s')}</span>
            </div>
          </div>
        </Entry>
        <LiveWhere phone={phone} />
      </section>

      <section id="updates">
        <Entry title={<Two a={t('m.updates.title1')} b={t('m.updates.title2')} />}>
          {phone ? (
            <div className="posts">
              {latest}
              <FoldGroup label={t('m.updates.more')}>
                {third}
                {older}
              </FoldGroup>
            </div>
          ) : (
            <>
              <div className="posts">
                {latest}
                {third}
              </div>
              <details className="older-posts">
                <summary>{t('m.updates.older')}</summary>
                <div className="posts">{older}</div>
              </details>
            </>
          )}
          <div className="subscribe">
            <a className="more" href={`${SDK_REPO}/commits/main`} rel="noopener noreferrer" target="_blank">
              {t('m.updates.all')}
            </a>
            <span>
              {t('m.updates.follow')}{' '}
              <a className="x-link" href={X_HANDLE} rel="noopener noreferrer" target="_blank">
                @VeilCoreProof
              </a>
            </span>
          </div>
        </Entry>
      </section>

      <Technical />

      <section id="contact">
        <Entry title={<Two a={t('m.contact.title1')} b={t('m.contact.title2')} />}>
          <dl className="audiences">
            <div>
              <dt>{t('m.contact.1t')}</dt>
              <dd>
                <p>{t('m.contact.1p')}</p>
                <a className="btn solid" href={FOUNDERS_MAIL}>
                  {t('m.contact.email')}
                </a>
              </dd>
            </div>
            <div>
              <dt>{t('m.contact.2t')}</dt>
              <dd>
                <p>{t('m.contact.2p')}</p>
                <a className="btn" href={FOUNDERS_MAIL}>
                  {t('m.contact.email')}
                </a>
                <RouterLink className="btn" to="/docs/spec">
                  {t('m.contact.spec')}
                </RouterLink>
              </dd>
            </div>
            <div>
              <dt>{t('m.contact.3t')}</dt>
              <dd>
                <p>{t('m.contact.3p')}</p>
                <RouterLink className="btn" to="/docs/integrate">
                  {t('m.contact.integrate')}
                </RouterLink>
                <a className="btn" href={SDK_REPO} rel="noopener noreferrer" target="_blank">
                  GitHub
                </a>
              </dd>
            </div>
            <div>
              <dt>{t('m.contact.4t')}</dt>
              <dd>
                <p>{t('m.contact.4p')}</p>
                <a className="btn" href="mailto:mako@veilcore.org">
                  mako@veilcore.org
                </a>
              </dd>
            </div>
          </dl>
          <div
            className="team-row"
            id="team"
            role="group"
            aria-label={`${t('m.team.title1')}${sp}${t('m.team.title2')}`}
          >
            <div className="team">
              {(
                [
                  ['Mako Steiner', 'MS', '/team/mako.jpg', 'm.mako.role', 'm.mako.short'],
                  ['Hunter Roberts', 'HR', '/team/hunter.jpg', 'm.hunter.role', 'm.hunter.short'],
                ] as const
              ).map(([name, initials, photo, role, short]) => (
                <RouterLink className="person" to="/founders" key={name}>
                  <Avatar initials={initials} photo={photo} />
                  <span>
                    <h3>{name}</h3>
                    <RoleLine className="role" text={t(role)} />
                    <p>{t(short)}</p>
                  </span>
                </RouterLink>
              ))}
            </div>
            <RouterLink className="more" to="/founders">
              {t('m.team.more')}
            </RouterLink>
          </div>
        </Entry>
      </section>
    </SiteShell>
  );
};
