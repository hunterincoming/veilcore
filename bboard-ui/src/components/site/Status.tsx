// /status: whether the service that dates records for this site is running, read live from
// its public status in the visitor's own browser (the same reading dating-words.ts uses).
// It reports what the service says and nothing else: no history and no promise of a time.
// A build with no fee service says so.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { SPONSOR_URL } from '../../veilcore/chain/config';
import { SiteShell } from './SiteShell';
import { lastRun, statusLine, type StatusReading } from './status-words';

type State = { kind: 'loading' } | { kind: 'none' } | { kind: 'unreachable' } | { kind: 'ok'; s: StatusReading };

export const Status: React.FC = () => {
  const { t, lang } = useI18n();
  const [state, setState] = useState<State>(SPONSOR_URL ? { kind: 'loading' } : { kind: 'none' });
  useEffect(() => {
    if (!SPONSOR_URL) return;
    let live = true;
    void (async () => {
      try {
        const r = await fetch(`${SPONSOR_URL}/sponsor/status`, { signal: AbortSignal.timeout(8000) });
        const next: State = r.ok ? { kind: 'ok', s: (await r.json()) as StatusReading } : { kind: 'unreachable' };
        if (live) setState(next);
      } catch {
        if (live) setState({ kind: 'unreachable' });
      }
    })();
    return () => {
      live = false;
    };
  }, []);
  const when = state.kind === 'ok' ? lastRun(state.s) : undefined;
  return (
    <SiteShell>
      <header className="wrap page">
        <h1>{t('m.status.page.title')}</h1>
        <p>{t('m.status.page.lede')}</p>
      </header>
      <section className="privacy-note">
        <div className="wrap" aria-live="polite" data-status={state.kind}>
          {state.kind === 'loading' && <p>{t('m.status.page.loading')}</p>}
          {state.kind === 'none' && <p>{t('m.status.page.none')}</p>}
          {state.kind === 'unreachable' && <p>{t('m.status.page.unreachable')}</p>}
          {state.kind === 'ok' && (
            <>
              <dl>
                <div>
                  <dt>{t('m.status.page.service')}</dt>
                  <dd data-status-line={statusLine(state.s)}>{t(`m.status.page.${statusLine(state.s)}`)}</dd>
                </div>
                {when && (
                  <div>
                    <dt>{t('m.status.page.lastRun')}</dt>
                    <dd>{when.toLocaleString(lang)}</dd>
                  </div>
                )}
              </dl>
              <p>{t('m.status.page.checked')}</p>
            </>
          )}
          <p className="privacy-contact">
            <RouterLink to="/help">{t('m.status.page.help')}</RouterLink>
          </p>
        </div>
      </section>
    </SiteShell>
  );
};
