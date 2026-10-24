// /partners: "Require a VeilCore record", for a program that wants its applicants to bring
// one (a membership, a genetics library, a registry, a lab's intake, a marketplace). The
// page is docs/partners/require-a-record.md in the site's light design, with the form field
// it describes (<veilcore-record-check>, partner-kit/record-check) running live: paste a
// check link and it is checked in this browser against the registry this site uses.
//
// Its words are in the app's text, i18n/app/<language>/partners.ts (app.partners.*). Code
// (the attribute names, the HTML example, the command line) stays here, the same in every
// language. The live field (partner-kit/record-check) has its own words, in English.
// VeilCore never vouches, and the page says so where it matters.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { SiteShell } from '../site/SiteShell';
import { rich, useT } from '../../i18n/app';
import type { AppKey } from '../../i18n/app/en';
import './partners.css';

const API: string = import.meta.env.VITE_API_BASE ?? '';
const GUIDE = 'https://github.com/hunterincoming/veilcore/blob/main/docs/partners/require-a-record.md';
const KIT = 'https://github.com/hunterincoming/veilcore/tree/main/partner-kit/record-check';
/** The site's contact address (the privacy page's). */
const CONTACT = 'hunter@veilcore.org';

const SNIPPET = `<script type="module" src="/vendor/veilcore-record-check.js"></script>

<form action="/apply" method="post">
  <veilcore-record-check name="veilcore_link" required></veilcore-record-check>
  <button>Apply</button>
</form>`;

/** The live field. The element's code loads only on this page, on first view. */
const Demo: React.FC = () => {
  const { t } = useT();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let live = true;
    void import('../../../../partner-kit/record-check/src/element').then(() => live && setReady(true));
    return () => {
      live = false;
    };
  }, []);
  // The registry this site uses; on a build that reaches it through this site, this site.
  const registry = API || window.location.origin;
  return (
    <div className="pk-demo" data-ready={ready ? 'yes' : 'no'}>
      {ready ? (
        React.createElement('veilcore-record-check', {
          registry,
          'check-page': window.location.origin,
          label: t('app.partners.demo.label'),
        })
      ) : (
        <p className="pk-muted">{t('app.partners.demo.loading')}</p>
      )}
    </div>
  );
};

/** Terms and what each means, as rows of a <dl>. */
const Terms: React.FC<{ items: [AppKey, AppKey][] }> = ({ items }) => {
  const { t } = useT();
  return (
    <>
      {items.map(([term, def]) => (
        <div key={term}>
          <dt>{t(term)}</dt>
          <dd>{t(def)}</dd>
        </div>
      ))}
    </>
  );
};

const GIVES: [AppKey, AppKey][] = [
  ['app.partners.gives.1.t', 'app.partners.gives.1.d'],
  ['app.partners.gives.2.t', 'app.partners.gives.2.d'],
  ['app.partners.gives.3.t', 'app.partners.gives.3.d'],
  ['app.partners.gives.4.t', 'app.partners.gives.4.d'],
];
const NOT: AppKey[] = [
  'app.partners.not.1',
  'app.partners.not.2',
  'app.partners.not.3',
  'app.partners.not.4',
  'app.partners.not.5',
];
const STEPS: [AppKey, AppKey[]][] = [
  [
    'app.partners.steps.applicant',
    ['app.partners.steps.applicant.1', 'app.partners.steps.applicant.2', 'app.partners.steps.applicant.3'],
  ],
  ['app.partners.steps.you', ['app.partners.steps.you.1', 'app.partners.steps.you.2', 'app.partners.steps.you.3']],
];
/** The field's options: the attribute as it is written, in every language, and what it does. */
const OPTIONS: [string, AppKey][] = [
  ['allow-test-network', 'app.partners.form.allowTest'],
  ['when-unreachable="allow"', 'app.partners.form.unreachable'],
];
const DEV: [AppKey, AppKey][] = [
  ['app.partners.dev.1', 'app.partners.dev.1.d'],
  ['app.partners.dev.2', 'app.partners.dev.2.d'],
  ['app.partners.dev.3', 'app.partners.dev.3.d'],
  ['app.partners.dev.4', 'app.partners.dev.4.d'],
];

export const PartnersPage: React.FC = () => {
  const { t } = useT();
  return (
    <SiteShell>
      <div className="pk">
        <header className="wrap page">
          <div className="label">{t('app.partners.label')}</div>
          <h1>
            {t('app.partners.title')} <em>{t('app.partners.titleEm')}</em>
          </h1>
          <p>{t('app.partners.lede')}</p>
        </header>

        <section aria-labelledby="pk-demo">
          <div className="wrap pk-narrow">
            <h2 id="pk-demo">{t('app.partners.demo.title')}</h2>
            <p className="lede">{t('app.partners.demo.lede')}</p>
            <Demo />
          </div>
        </section>

        <section aria-labelledby="pk-gives">
          <div className="wrap pk-two">
            <div>
              <h2 id="pk-gives">{t('app.partners.gives.title')}</h2>
              <dl className="pk-list">
                <Terms items={GIVES} />
              </dl>
            </div>
            <div className="pk-card">
              <h3>{t('app.partners.not.title')}</h3>
              <p>{t('app.partners.not.lede')}</p>
              <ul>
                {NOT.map((k) => (
                  <li key={k}>{t(k)}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section aria-labelledby="pk-steps">
          <div className="wrap">
            <h2 id="pk-steps">{t('app.partners.steps.title')}</h2>
            <div className="pk-two pk-steps">
              {STEPS.map(([title, items]) => (
                <div key={title} className="pk-card">
                  <h3>{t(title)}</h3>
                  <ol>
                    {items.map((k) => (
                      <li key={k}>{t(k)}</li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="pk-form">
          <div className="wrap pk-narrow">
            <h2 id="pk-form">{t('app.partners.form.title')}</h2>
            <p className="lede">{t('app.partners.form.lede')}</p>
            <pre className="pk-code" tabIndex={0} aria-label={t('app.partners.form.example')} lang="en">
              <code>{SNIPPET}</code>
            </pre>
            <dl className="pk-list">
              {OPTIONS.map(([attr, k]) => (
                <div key={attr}>
                  <dt>
                    <code>{attr}</code>
                  </dt>
                  <dd>{t(k)}</dd>
                </div>
              ))}
            </dl>
            <p className="pk-muted">{t('app.partners.form.csp')}</p>
            <p className="pk-muted">{t('app.partners.form.status')}</p>
          </div>
        </section>

        <section aria-labelledby="pk-facts">
          <div className="wrap pk-narrow">
            <h2 id="pk-facts">{t('app.partners.facts.title')}</h2>
            <dl className="pk-list">
              <Terms
                items={[
                  ['app.partners.facts.cost', 'app.partners.facts.cost.d'],
                  ['app.partners.facts.down', 'app.partners.facts.down.d'],
                ]}
              />
              <div>
                <dt>{t('app.partners.facts.support')}</dt>
                <dd>
                  {rich(t('app.partners.facts.support.d'), {
                    link: () => <a href={`mailto:${CONTACT}`}>{CONTACT}</a>,
                  })}
                </dd>
              </div>
              <div>
                <dt>{t('app.partners.facts.data')}</dt>
                <dd>
                  {rich(t('app.partners.facts.data.d'), {
                    link: (c) => <RouterLink to="/privacy">{c}</RouterLink>,
                  })}
                </dd>
              </div>
              <Terms
                items={[
                  ['app.partners.facts.gone', 'app.partners.facts.gone.d'],
                  ['app.partners.facts.npm', 'app.partners.facts.npm.d'],
                ]}
              />
            </dl>
          </div>
        </section>

        <section aria-labelledby="pk-policy">
          <div className="wrap pk-narrow">
            <h2 id="pk-policy">{t('app.partners.policy.title')}</h2>
            <p className="pk-note">{t('app.partners.policy.note')}</p>
            <blockquote className="pk-quote">
              <p>{t('app.partners.policy.1')}</p>
              <p>{t('app.partners.policy.2')}</p>
            </blockquote>
          </div>
        </section>

        <section aria-labelledby="pk-dev">
          <div className="wrap pk-narrow">
            <h2 id="pk-dev">{t('app.partners.dev.title')}</h2>
            <dl className="pk-list">
              <Terms items={DEV} />
            </dl>
            <p className="pk-links">
              <a href={GUIDE}>{t('app.partners.dev.guide')}</a>
              <a href={KIT}>{t('app.partners.dev.kit')}</a>
            </p>
          </div>
        </section>
      </div>
    </SiteShell>
  );
};
