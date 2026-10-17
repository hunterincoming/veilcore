// /check-this-site: does this site serve the code it was released with? (CONTRACT.md #31)
//
// Every release deploy writes a manifest, the SHA-256 of every file served, the git commit
// and the date, publishes it with the code (releases/<network>/<commit>.json) and puts a
// copy and a small /release.json on the site (scripts/release-manifest.mjs). This page reads
// /release.json, then fetches every listed file from this site and compares it with the list:
// the list the site serves, or one the visitor downloaded from the public code.
//
// It says plainly what it can't do: it runs on the site it checks, so a site that lies could
// lie here too. The check that needs nothing from VeilCore is the script, run from a copy of
// the public code: npm run check:site -- <address> (scripts/check-site.mjs). Same checking
// code (scripts/release-check.mjs).
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useState } from 'react';
import { useI18n } from '../../i18n';
import { SiteShell } from './SiteShell';
import {
  allMatch,
  checkFiles,
  isManifest,
  manifestPath,
  readRelease,
  type FileCheck,
  type Manifest,
  type Release,
} from '../../../../scripts/release-check.mjs';

/** Where the site's code is published, with each release's list. */
export const CODE_REPO = 'https://github.com/hunterincoming/veilcore-midnight-testnet';

type State =
  | { kind: 'loading' }
  | { kind: 'none'; problem: string }
  | { kind: 'ready'; release: Release }
  | { kind: 'checking'; release: Release; done: number; total: number }
  | { kind: 'done'; release: Release; result: FileCheck; manifest: Manifest }
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
    const result = await checkFiles(origin, manifest, {
      onProgress: (done, total) => setState({ kind: 'checking', release, done, total }),
    });
    setState({ kind: 'done', release, result, manifest });
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
            {state.kind === 'checking' && <p>{t('m.checksite.checking', { done: String(state.done), total: String(state.total) })}</p>}
            {state.kind === 'bad-list' && (
              <p data-bad-list={state.why}>{t(state.why === 'other' ? 'm.checksite.otherList' : 'm.checksite.noList')}</p>
            )}
            {state.kind === 'done' && (
              <div data-result={allMatch(state.result) ? 'all-match' : 'differs'}>
                {state.manifest.uncommittedChanges === true && <p>{t('m.checksite.uncommitted')}</p>}
                {allMatch(state.result) ? (
                  <p>
                    <strong>{t('m.checksite.allMatch', { total: String(state.result.total) })}</strong>
                  </p>
                ) : (
                  <>
                    <p>
                      <strong>
                        {t('m.checksite.someDiffer', {
                          matched: String(state.result.matched.length),
                          total: String(state.result.total),
                        })}
                      </strong>
                    </p>
                    <ul>
                      {state.result.differ.map((p) => (
                        <li key={`d${p}`}>{t('m.checksite.differs', { path: p })}</li>
                      ))}
                      {state.result.missing.map((p) => (
                        <li key={`m${p}`}>{t('m.checksite.missing', { path: p })}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </SiteShell>
  );
};
