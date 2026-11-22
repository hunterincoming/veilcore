// /help: short answers for someone in the middle of a task (onboarding audit, 14 Nov 2026:
// the site had five FAQ questions and no help page; /help, /faq and /contact were 404s).
//
// Every answer says what this site does today and nothing about later. What works where for
// labs and agreements is not repeated here: the home page's list (#live) is the one place it
// is kept, so this page links to it. The contact address is the one on /privacy.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { useI18n } from '../../i18n';
import type { StringKey } from '../../i18n/en';
import { SiteShell } from './SiteShell';

export const HELP_CONTACT = 'hunter@veilcore.org';
export const HELP_TOOL_URL = 'https://github.com/hunterincoming/veilcore-sdk#open-a-veilcore-backup-without-veilcore';

type Item = { readonly n: number; readonly to?: string; readonly href?: string; readonly answer?: false };

/** The sections in page order: how many questions each has, and where an answer links. */
export const HELP_SECTIONS: readonly { readonly id: string; readonly items: readonly Item[] }[] = [
  { id: 'start', items: [{ n: 1 }, { n: 2 }, { n: 3 }] },
  { id: 'make', items: [{ n: 1 }, { n: 2 }, { n: 3 }] },
  { id: 'backup', items: [{ n: 1 }, { n: 2 }, { n: 3 }, { n: 4, to: '/restore' }, { n: 5 }] },
  { id: 'show', items: [{ n: 1 }, { n: 2 }, { n: 3 }] },
  {
    id: 'check',
    items: [{ n: 1, to: '/verify' }, { n: 2 }, { n: 3 }, { n: 4, to: '/docs/evidence', answer: false }],
  },
  { id: 'labs', items: [{ n: 1, to: '/how-it-works#live' }] },
  { id: 'wrong', items: [{ n: 1, to: '/status' }, { n: 2 }, { n: 3, href: HELP_TOOL_URL }] },
];

export const Help: React.FC = () => {
  const { t } = useI18n();
  const k = (s: string) => t(s as StringKey);
  const { hash } = useLocation();
  // /contact and links like /help#backup land on their section.
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);
  return (
    <SiteShell>
      <header className="wrap page">
        <h1>{t('m.help.title')}</h1>
        <p>{t('m.help.lede')}</p>
      </header>
      <section className="privacy-note help-page">
        <div className="wrap">
          {HELP_SECTIONS.map((s) => (
            <React.Fragment key={s.id}>
              <h2 className="privacy-full" id={s.id}>
                {k(`m.help.${s.id}.t`)}
              </h2>
              <dl>
                {s.items.map((i) => (
                  <div key={i.n}>
                    <dt>{k(`m.help.${s.id}.${i.n}q`)}</dt>
                    <dd>
                      {i.answer === false ? null : <>{k(`m.help.${s.id}.${i.n}a`)} </>}
                      {i.to && <RouterLink to={i.to}>{k(`m.help.${s.id}.${i.n}link`)}</RouterLink>}
                      {i.href && (
                        <a href={i.href} rel="noopener noreferrer">
                          {k(`m.help.${s.id}.${i.n}link`)}
                        </a>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </React.Fragment>
          ))}
          <h2 className="privacy-full" id="contact">
            {t('m.help.contact.t')}
          </h2>
          <p>{t('m.help.contact.p')}</p>
          <p>
            <a href={`mailto:${HELP_CONTACT}`}>{HELP_CONTACT}</a>
          </p>
        </div>
      </section>
    </SiteShell>
  );
};
