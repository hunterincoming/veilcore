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
import { useI18n } from '../../i18n';
import { FOUNDERS_MAIL, SDK_REPO, SiteShell, X_HANDLE } from './SiteShell';
import { FoldGroup, FoldItem, FoldPoint, usePhone } from './Fold';
import { IS_MAINNET, MAINNET_CLAIMS_ADDRESS, MAINNET_CONTRACT_ADDRESS, explorerFor } from '../../config/network';

const TESTNET_REPO = 'https://github.com/hunterincoming/veilcore-midnight-testnet';
/** The public test site (docs/test-site.md). It goes live with this release. */
const TEST_SITE_URL = 'https://test.veilcore.org';

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

  return (
    <div className="hash-demo" role="group" aria-label={t('m.hero.demoLabel')}>
      <div className="hd-card">
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
        <div className="arrow" aria-hidden="true" />
        <div className="hd-out">
          <p className="hd-zone">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3.5" y="5" width="17" height="15" rx="2" />
              <path d="M3.5 10h17M8 3v4M16 3v4" />
            </svg>
            {t('m.hero.goes')}
          </p>
          <div className="digest">
            {hash
              ? [...hash].map((c, i) =>
                  prev.current && prev.current[i] !== c ? (
                    <span key={`${i}-${c}`} className="chg">
                      {c}
                    </span>
                  ) : (
                    <React.Fragment key={i}>{c}</React.Fragment>
                  ),
                )
              : '—'}
          </div>
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
    <span>
      <time dateTime={p.iso}>{p.date}</time>
      <span className="tag">{p.tag}</span>
    </span>
    <h3>{p.title}</h3>
    <p>{p.text}</p>
    <span className="go">{p.go}</span>
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
  ['share', true, true, false],
  ['lab', true, true, false],
  ['results', false, true, true],
  ['dna', true, true, false],
  ['prove', false, true, true],
  ['claims', true, false, true],
  ['lic', true, true, true],
] as const;

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
            <a href={TEST_SITE_URL} rel="noopener noreferrer" target="_blank">
              {t('m.live.colTest')}
            </a>{' '}
            <span className="soon">{t('m.live.colTestNote')}</span>
          </th>
          <th scope="col">{t('m.live.colNot')}</th>
        </tr>
      </thead>
      <tbody>
        {LIVE_ROWS.map(([row, ...has]) => (
          <tr key={row}>
            <th scope="row">{t(`m.live.${row}.t`)}</th>
            {cols.map(([col, chip, name], i) =>
              has[i] ? (
                <td key={col}>
                  <span className={chip}>{name}</span> {t(`m.live.${row}.${col}` as Parameters<typeof t>[0])}
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
      <h3 className="sub-h">
        {t('m.live.title1')} <em>{t('m.live.title2')}</em>
      </h3>
      <p className="lede">{t('m.live.lede')}</p>
      {/* On a phone the list stays one tap away, so the page reads in a few minutes. */}
      {phone ? (
        <details className="older-posts live-fold">
          <summary>{t('m.live.show')}</summary>
          {table}
        </details>
      ) : (
        table
      )}
    </div>
  );
};

/** Everything a technical reader wants, in one block that stays closed until asked for. */
const Technical: React.FC = () => {
  const { t } = useI18n();
  return (
    <section id="technical">
      <div className="wrap">
        <h2>{t('m.tech.title')}</h2>
        <p className="lede">{t('m.tech.lede')}</p>
        <details className="tech">
          <summary className="btn">{t('m.tech.show')}</summary>
          <div className="points">
            <div className="pt">
              <h3>{t('m.tech.check.t')}</h3>
              <p>
                {t('m.tech.check.p')} <RouterLink to="/docs/spec">{t('m.open.6link')}</RouterLink>
              </p>
            </div>
            <div className="pt">
              <h3>{t('m.tech.impl.t')}</h3>
              <p>
                {t('m.tech.impl.p')} <RouterLink to="/implementations">{t('m.open.1link')}</RouterLink>
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
                {t('m.status.keyText')}{' '}
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
      </div>
    </section>
  );
};

export const Home: React.FC = () => {
  const { t, lang } = useI18n();
  const { hash } = useLocation();
  const [showVideo, setShowVideo] = useState(false);
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
      <header className={`wrap hero${lang === 'ja' ? ' cjk' : ''}`} id="top">
        <div className="hero-text">
          <div className="label">{t('m.hero.label')}</div>
          <h1>
            {t('m.hero.title1')} <em>{t('m.hero.title2')}</em>
          </h1>
          <p className="lede">{t('m.hero.lede')}</p>
          <div className="hero-actions">
            <a className="btn solid" href="#demo">
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

      <section id="about">
        <div className="wrap">
          <div className="label">{t('m.for.label')}</div>
          <h2 className="wide">
            {t('m.for.title1')} <em>{t('m.for.title2')}</em>
          </h2>
          <p className="lede">{t('m.for.lede')}</p>
          <div className="points three">
            <FoldPoint mode="hide" defaultOpen title={t('m.for.1t')}>
              {t('m.for.1p')}
            </FoldPoint>
            <FoldPoint mode="hide" title={t('m.for.2t')}>
              {t('m.for.2p')} <a href="#claims">{t('m.for.2link')}</a>
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
              {t('m.for.5p')}{' '}
              <a href={`${FOUNDERS_MAIL}&subject=${encodeURIComponent('Animal records')}`}>{t('m.for.5ask')}</a>
            </FoldPoint>
          </div>
        </div>
      </section>

      <section id="how">
        <div className="wrap">
          <div className="label">{t('m.how.label')}</div>
          <h2>
            {t('m.how.title1')} <em>{t('m.how.title2')}</em>
          </h2>
          <div className="steps">
            {(['1', '2', '3', '4'] as const).map((n) => (
              <div className="step" key={n}>
                <span className="n">{t(`m.step${n}.n`)}</span>
                <h3>{t(`m.step${n}.title`)}</h3>
                <p>{t(`m.step${n}.text`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="claims">
        <div className="wrap">
          <div className="label">{t('m.claims.label')}</div>
          <h2>
            {t('m.claims.title1')} <em>{t('m.claims.title2')}</em>
          </h2>
          <p className="lede">{t('m.claims.lede')}</p>
          <div className="claims">
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
          </div>
        </div>
      </section>

      <section id="value">
        <div className="wrap">
          <div className="label">{t('m.get.label')}</div>
          <h2>
            {t('m.get.title1')} <em>{t('m.get.title2')}</em>
          </h2>
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
        </div>
      </section>

      <section id="open">
        <div className="wrap">
          <div className="label">{t('m.open.label')}</div>
          <h2>
            {t('m.open.title1')} <em>{t('m.open.title2')}</em>
          </h2>
          <div className="points">
            <FoldPoint mode="clamp" title={t('m.open.1t')}>
              {t('m.open.1p')}
            </FoldPoint>
            <FoldPoint mode="clamp" title={t('m.open.2t')}>
              {t('m.open.2p')}
            </FoldPoint>
            <FoldPoint mode="clamp" title={t('m.open.6t')}>
              {t('m.open.6p')} <RouterLink to="/docs/spec">{t('m.open.6link')}</RouterLink>
            </FoldPoint>
            <FoldPoint mode="clamp" title={t('m.open.4t')}>
              {t('m.open.4p')}
            </FoldPoint>
          </div>
        </div>
      </section>

      <section id="questions">
        <div className="wrap">
          <div className="label">{t('m.faq.label')}</div>
          <h2>
            {t('m.faq.title1')} <em>{t('m.faq.title2')}</em>
          </h2>
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
                {t('m.faq.3a')} <RouterLink to="/docs/evidence">{t('m.faq.3link')}</RouterLink>
              </p>
            </details>
            <details>
              <summary>{t('m.faq.4q')}</summary>
              <p>
                {t('m.faq.4a')} <RouterLink to="/privacy">{t('m.faq.4link1')}</RouterLink>{' '}
                <RouterLink to="/docs/integrate">{t('m.faq.4link2')}</RouterLink>
              </p>
            </details>
            <details>
              <summary>{t('m.faq.6q')}</summary>
              <p>{t('m.faq.6a')}</p>
            </details>
          </div>
        </div>
      </section>

      <section id="demo">
        <div className="wrap">
          <div className="label">{t('m.demo.label')}</div>
          <h2>
            {t('m.demo.title1')} <em>{t('m.demo.title2')}</em>
          </h2>
          <p className="lede">
            {t('m.demo.lede')}{' '}
            <RouterLink to="/privacy" className="inline">
              {t('m.demo.privacy')}
            </RouterLink>
          </p>
          <div className="demos">
            <RouterLink className="demo" to="/new">
              <span className="ic">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 4h10l4 4v12H5z" />
                  <path d="M9 13l2 2 4-4" />
                </svg>
              </span>
              <h3>{t('m.demo.create.title')}</h3>
              <p>{t('m.demo.create.text')}</p>
              <div className="meta-row">
                <span className="chip live">{t('m.chip.interactive')}</span>
                <span className="chip">{t('m.chip.3min')}</span>
              </div>
            </RouterLink>
            <RouterLink className="demo" to="/verify">
              <span className="ic">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="11" cy="11" r="6.5" />
                  <path d="M16 16l4.5 4.5" />
                </svg>
              </span>
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
              <span className="ic">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="M10 9.5l5 2.5-5 2.5z" />
                </svg>
              </span>
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
                src="/media/veilcore-walkthrough.mp4"
                poster="/media/veilcore-walkthrough.jpg"
                controls
                autoPlay
                playsInline
                preload="metadata"
                aria-label={t('m.demo.video.title')}
              />
            </div>
          )}
        </div>
      </section>

      <section id="status">
        <div className="wrap">
          <div className="label">{t('m.status.label')}</div>
          <h2>
            {t('m.status.title1')} <em>{t('m.status.title2')}</em>
          </h2>
          <p className="lede">{t('m.status.lede')}</p>
          <div className="status three">
            <div className="stat ok">
              <b>{t('m.stat2.b')}</b>
              <span>{t('m.stat2.s')}</span>
            </div>
            <div className="stat">
              <b>{t('m.stat3.b')}</b>
              <span>{t('m.stat3.s')}</span>
            </div>
            <div className="stat">
              <b>{t('m.stat4.b')}</b>
              <span>{t('m.stat4.s')}</span>
            </div>
          </div>
          <LiveWhere phone={phone} />
        </div>
      </section>

      <section id="updates">
        <div className="wrap">
          <div className="label">{t('m.updates.label')}</div>
          <h2>
            {t('m.updates.title1')} <em>{t('m.updates.title2')}</em>
          </h2>
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
            <span>·</span>
            <span>
              {t('m.updates.follow')}{' '}
              <a className="x-link" href={X_HANDLE} rel="noopener noreferrer" target="_blank">
                @VeilCoreProof
              </a>
            </span>
          </div>
        </div>
      </section>

      <Technical />

      <section id="contact">
        <div className="wrap">
          <div className="label">{t('m.contact.label')}</div>
          <h2>
            {t('m.contact.title1')} <em>{t('m.contact.title2')}</em>
          </h2>
          <dl className="audiences two">
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
          <div className="team-row" id="team" role="group" aria-label={`${t('m.team.title1')} ${t('m.team.title2')}`}>
            <div className="team">
              {(
                [
                  ['Mako Steiner', 'MS', '/team/mako.jpg', 'm.mako.role', 'm.mako.short'],
                  ['Hunter Roberts', 'HR', '/team/hunter.jpg', 'm.hunter.role', 'm.hunter.short'],
                ] as const
              ).map(([name, initials, photo, role, short]) => (
                <RouterLink className="person" to="/founders" key={name}>
                  <span className="avatar">
                    {initials}
                    <img src={photo} alt="" loading="lazy" onError={(e) => e.currentTarget.remove()} />
                  </span>
                  <span>
                    <h3>{name}</h3>
                    <span className="role">{t(role)}</span>
                    <p>{t(short)}</p>
                  </span>
                </RouterLink>
              ))}
            </div>
            <RouterLink className="more" to="/founders">
              {t('m.team.more')}
            </RouterLink>
          </div>
        </div>
      </section>
    </SiteShell>
  );
};
