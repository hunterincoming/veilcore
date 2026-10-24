// /check-this-site: does this site serve the code it was released with? (CONTRACT.md #31, #32)
//
// Every release deploy writes a manifest, the SHA-256 of every file served, the security
// headers, the build settings, the git commit and the date, publishes it with the code
// (releases/<network>/<commit>.json) and puts a copy and a small /release.json on the site
// (scripts/release-manifest.mjs). This page reads /release.json, then fetches every listed
// file from this site and compares it with the list (the list the site serves, or one the
// visitor downloaded from the public code); since round 6 (the fifth review's finding 1) it
// also fetches every page address the app serves, with random ids, and a random address, and
// holds each to the listed index.html and the listed headers, and checks the page it is
// running in has no script the listed page doesn't.
//
// It says plainly what it can't do: it runs on the site it checks, so a site that lies could
// lie here too, and no check can prove a host sent everyone the same files. The check that
// needs nothing from VeilCore is the script, run from a copy of the public code: npm run
// check:site -- <address> (scripts/check-site.mjs); and anyone can rebuild the release and
// compare: npm run check:rebuild -- <manifest>. Same checking code (scripts/release-check.mjs).
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useState } from 'react';
import { useI18n } from '../../i18n';
import { SiteShell } from './SiteShell';
import {
  allMatch,
  checkRelease,
  extraScripts,
  isManifest,
  manifestPath,
  readRelease,
  releaseMatches,
  routesMatch,
  type Manifest,
  type Release,
  type ReleaseCheck,
} from '../../../../scripts/release-check.mjs';

/** Where the site's code is published, with each release's list. */
export const CODE_REPO = 'https://github.com/hunterincoming/veilcore';

type State =
  | { kind: 'loading' }
  | { kind: 'none'; problem: string }
  | { kind: 'ready'; release: Release }
  | { kind: 'checking'; release: Release; done: number; total: number }
  | { kind: 'done'; release: Release; result: ReleaseCheck; manifest: Manifest; extra: string[] }
  | { kind: 'bad-list'; release: Release; why: 'none' | 'other' };

export const CheckThisSite: React.FC = () => {
  const { t } = useI18n();
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    let live = true;
    void readRelease(origin).then((r) => {
      if (!live) return;
      setState(r.ok ? { kind: 'ready', release: r.release } : { kind: 'none', problem: r.problem });
    });
    return () => {
      live = false;
    };
  }, [origin]);

  const run = async (release: Release, manifest: unknown) => {
    if (!isManifest(manifest)) return setState({ kind: 'bad-list', release, why: 'none' });
    if (manifest.commit !== release.commit || manifest.network !== release.network)
      return setState({ kind: 'bad-list', release, why: 'other' });
    setState({ kind: 'checking', release, done: 0, total: Object.keys(manifest.files).length + 1 });
    const result = await checkRelease(origin, manifest, {
      onProgress: (done, total) => setState({ kind: 'checking', release, done, total }),
    });
    // The page this browser is running: no script the listed index.html doesn't have.
    let extra: string[] = [];
    try {
      const listed = await fetch(`${origin}/index.html`, { cache: 'no-store' });
      const text = listed.ok ? await listed.text() : '';
      extra = text ? extraScripts(document, text) : [];
    } catch {
      extra = [];
    }
    setState({ kind: 'done', release, result, manifest, extra });
  };

  const fromSite = async (release: Release) => {
    let body: unknown = null;
    try {
      const res = await fetch(`${origin}/${manifestPath(release.network, release.commit)}`, { cache: 'no-store' });
      body = res.ok ? JSON.parse(await res.text()) : null;
    } catch {
      body = null;
    }
    await run(release, body);
  };

  const fromFile = async (release: Release, file: File | undefined) => {
    if (!file) return;
    let body: unknown = null;
    try {
      body = JSON.parse(await file.text());
    } catch {
      body = null;
    }
    await run(release, body);
  };

  const release = state.kind === 'loading' || state.kind === 'none' ? undefined : state.release;
  const busy = state.kind === 'checking';

  return (
    <SiteShell>
      <header className="wrap page">
        <h1 tabIndex={-1} data-screen-heading="">
          {t('m.checksite.title')}
        </h1>
        <p>{t('m.checksite.lede')}</p>
      </header>
      <section className="privacy-note" data-check-site={state.kind}>
        <div className="wrap">
          {state.kind === 'loading' && <p>{t('m.checksite.reading')}</p>}
          {state.kind === 'none' && <p data-no-release="">{t('m.checksite.noRelease')}</p>}
          {release && (
            <>
              <p data-release={release.commit}>
                {t('m.checksite.release', {
                  commit: release.commit,
                  network: release.network,
                  date: release.date.slice(0, 10),
                })}
              </p>
              <p>{t('m.checksite.how')}</p>
              <p>
                {t('m.checksite.trust', { command: `npm run check:site -- ${origin}` })}{' '}
                {t('m.checksite.rebuild', {
                  command: `npm run check:rebuild -- ${manifestPath(release.network, release.commit)}`,
                })}{' '}
                <a
                  href={`${CODE_REPO}/blob/main/${manifestPath(release.network, release.commit)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t('m.checksite.listLink')}
                </a>
              </p>
              <p className="check-site-actions">
                <button type="button" disabled={busy} onClick={() => void fromSite(release)} data-check-from="site">
                  {t('m.checksite.useSite')}
                </button>{' '}
                <label className={busy ? 'disabled' : undefined}>
                  {t('m.checksite.useFile')}{' '}
                  <input
                    type="file"
                    accept="application/json,.json"
                    disabled={busy}
                    data-check-from="file"
                    onChange={(e) => void fromFile(release, e.target.files?.[0])}
                  />
                </label>
              </p>
            </>
          )}
          <div role="status" aria-live="polite">
            {state.kind === 'checking' && (
              <p>{t('m.checksite.checking', { done: String(state.done), total: String(state.total) })}</p>
            )}
            {state.kind === 'bad-list' && (
              <p data-bad-list={state.why}>
                {t(state.why === 'other' ? 'm.checksite.otherList' : 'm.checksite.noList')}
              </p>
            )}
            {state.kind === 'done' && (
              <div data-result={releaseMatches(state.result) && state.extra.length === 0 ? 'all-match' : 'differs'}>
                {state.manifest.uncommittedChanges === true && <p>{t('m.checksite.uncommitted')}</p>}
                {allMatch(state.result.files) ? (
                  <p>
                    <strong>{t('m.checksite.allMatch', { total: String(state.result.files.total) })}</strong>
                  </p>
                ) : (
                  <>
                    <p>
                      <strong>
                        {t('m.checksite.someDiffer', {
                          matched: String(state.result.files.matched.length),
                          total: String(state.result.files.total),
                        })}
                      </strong>
                    </p>
                    <ul>
                      {state.result.files.differ.map((p) => (
                        <li key={`d${p}`}>{t('m.checksite.differs', { path: p })}</li>
                      ))}
                      {state.result.files.missing.map((p) => (
                        <li key={`m${p}`}>{t('m.checksite.missing', { path: p })}</li>
                      ))}
                    </ul>
                  </>
                )}
                {routesMatch(state.result.routes) ? (
                  <p data-pages="all-match">
                    <strong>{t('m.checksite.pagesMatch', { total: String(state.result.routes.total) })}</strong>
                  </p>
                ) : (
                  <div data-pages="differs">
                    <p>
                      <strong>
                        {t('m.checksite.pagesDiffer', {
                          matched: String(state.result.routes.matched.length),
                          total: String(state.result.routes.total),
                        })}
                      </strong>
                    </p>
                    <ul>
                      {[...state.result.routes.differ, ...state.result.routes.missing].map((p) => (
                        <li key={`p${p}`}>{t('m.checksite.pageDiffers', { path: p })}</li>
                      ))}
                      {[...new Set(state.result.routes.headerDiffers.map((h) => h.name))].map((name) => (
                        <li key={`h${name}`}>{t('m.checksite.headerDiffers', { name })}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {!state.result.routes.headersListed && <p>{t('m.checksite.noHeaders')}</p>}
                {state.extra.length > 0 && (
                  <ul data-extra-scripts="">
                    {state.extra.map((x) => (
                      <li key={x}>{t('m.checksite.extraScript', { script: x })}</li>
                    ))}
                  </ul>
                )}
                <p>{t('m.checksite.limit')}</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </SiteShell>
  );
};
