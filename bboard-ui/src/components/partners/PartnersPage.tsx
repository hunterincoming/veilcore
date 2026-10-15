// /partners: "Require a VeilCore record", for a program that wants its applicants to bring
// one (a membership, a genetics library, a registry, a lab's intake, a marketplace). The
// page is docs/partners/require-a-record.md in the site's light design, with the form field
// it describes (<veilcore-record-check>, partner-kit/record-check) running live: paste a
// check link and it is checked in this browser against the registry this site uses.
//
// English only for now: the words are kept together in TEXT so they can move to the i18n
// files in one step. VeilCore never vouches, and the page says so where it matters.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { SiteShell } from '../site/SiteShell';
import './partners.css';

const API: string = import.meta.env.VITE_API_BASE ?? '';
const GUIDE = 'https://github.com/hunterincoming/veilcore-midnight-testnet/blob/main/docs/partners/require-a-record.md';
const KIT = 'https://github.com/hunterincoming/veilcore-midnight-testnet/tree/main/partner-kit/record-check';
/** The site's contact address (the privacy page's). */
const CONTACT = 'hunter@veilcore.org';

const TEXT = {
  label: 'For partners',
  title: 'Require a VeilCore record.',
  titleEm: 'Free to check. No account.',
  lede: 'If your membership, library, registry or marketplace asks applicants for a VeilCore record, you can check every one in seconds, on your own form, without talking to us.',
  gives: {
    title: 'What requiring a record gives you',
    items: [
      [
        'A fixed description',
        'The record was sealed before they applied. If they show you the description later, you can tell whether it is the one they sealed.',
      ],
      [
        'A date',
        'Once the record is in a dated batch, anyone can look up when its fingerprint existed by. The date comes from Midnight, not from VeilCore or the applicant.',
      ],
      [
        'Lab signatures, checked',
        'Receipts for samples and lab reports, each signature checked, and whether VeilCore’s operator matched the lab’s name to a public listing. A receipt counts only when the registry ties it to a delivery of the record, and you see whether what arrived matches what was sent.',
      ],
      ['The same check for everyone', 'Every applicant’s link is checked the same way, by your page.'],
    ],
  },
  not: {
    title: 'What it does not show',
    lede: 'VeilCore never vouches. The check says what was checked and whose word the rest is. You decide.',
    items: [
      'What the material is. VeilCore never sees genetics.',
      'That the description is true, only that it hasn’t changed.',
      'Who holds the material, or the record, today.',
      'That a lab’s work is right. A checked name means a public listing was matched, nothing more.',
      'Parentage, rights, licenses or legal status.',
    ],
  },
  demo: {
    title: 'Try it',
    lede: 'Paste a record’s check link. It is checked in this browser, against the registry this site uses. Nothing is sent anywhere else, and nothing is kept.',
    label: 'VeilCore record check link',
    loading: 'Loading the field…',
  },
  steps: {
    title: 'Who does what',
    applicant: {
      title: 'The applicant',
      items: [
        'Makes a record for each accession, on veilcore.org or in their own software.',
        'Opens the record, chooses “Show someone”, and presses “Copy link”.',
        'Pastes the link into your form. If your rules ask, sends the record’s evidence bundle too.',
      ],
    },
    you: {
      title: 'You',
      items: [
        'Add the field to your form (below), or paste links you receive into the field on this page.',
        'Decide what you accept: the link matches; or also dated on Midnight’s main network; or also a lab receipt from a lab whose name was checked.',
        'Keep the check result with the application.',
      ],
    },
  },
  form: {
    title: 'Add it to your form',
    lede: 'One file, about 40 KB, served from your site. With “required”, the form will not submit until the link leads to a record that matches it and nothing contradicts it. If the applicant changes the link, it has to be checked again.',
    options: [
      [
        'allow-test-network',
        'Also accept records dated on a test network. For trying it out: test dates carry no weight, so by default they are refused.',
      ],
      [
        'when-unreachable="allow"',
        'If VeilCore’s registry can’t be reached, let the form go with the link marked as not checked (the form also sends <name>-unchecked). Without it, a required field blocks the whole form while the registry is down.',
      ],
    ],
    csp: 'Your Content Security Policy needs script-src for wherever you serve the file and connect-src for the registry. No style, image or frame exceptions; it works with Trusted Types. No cookies, no storage, no tracking.',
    status:
      'Not on npm yet: build it from partner-kit/record-check in the VeilCore repository and serve the file from your site.',
  },
  facts: {
    title: 'Before you rely on it',
    cost: ['Cost', 'Checking is free, for you and for everyone else. No account, no key, no contract.'],
    support: ['Support', 'Email', 'There is no support agreement or response time.'],
    data: [
      'Data',
      'A check sends the registry the record’s id and fingerprint, nothing about the applicant or your form. Like any website, the registry gets the visitor’s network address with each request, for rate limits. What VeilCore keeps is on the',
      'privacy page',
      'Fuller data terms are a draft being reviewed; until they are published, the privacy page is what applies.',
    ],
    down: [
      'If the registry is down',
      'Nothing can be checked. By default a required field then blocks the form until the registry answers again. With when-unreachable="allow" the form goes through with the link marked as not checked, and you check it later on this page.',
    ],
    gone: [
      'If VeilCore stops',
      'The field and the check pages on veilcore.org stop working. Records can still be checked from their evidence bundles, which check offline against an open format. Ask for evidence bundles if your program must not depend on VeilCore.',
    ],
    npm: ['Not on npm yet', 'Build the kit from the VeilCore repository and serve the field’s file from your site.'],
  },
  policy: {
    title: 'Sample policy wording',
    note: 'Sample text, not legal advice. Adapt it to your own rules.',
    text: [
      'Applicants must provide a VeilCore record check link for each accession they deposit. The record must exist, and the link must match it. [Program] checks each link when the application is received and keeps the result with the application.',
      'A VeilCore record is the applicant’s statement about their material, fingerprinted and dated. Accepting a record does not mean [Program] or VeilCore confirms what the material is, who holds it, or any right in it.',
    ],
  },
  dev: {
    title: 'For developers',
    items: [
      [
        'One call',
        'checkRecord(link) in Node or a browser returns plain JSON: recordExists, fingerprintMatches, dated (network, batch, transaction, block time, checkedOnChain), keyBound, labReceipts with each name check, and whatThisDoesNotShow.',
      ],
      [
        'On Midnight',
        'In Node, with @veilcore/contracts installed, the date stamp is looked up on chain: VeilCore’s pinned contract, the pinned build, exactly this batch root.',
      ],
      [
        'Command line',
        'partner-kit check <link> prints the same answer. Exit 0: the record exists, the link matches and nothing contradicts it. Exit 1: something does not hold, including a date on a test network (unless --allow-test-network) or an inclusion proof that does not check out. Exit 2: nothing could be checked.',
      ],
      [
        'Without VeilCore',
        'A record’s evidence bundle checks offline, and the format is open. If VeilCore is gone, records whose evidence bundles you hold still check.',
      ],
    ],
    guide: 'Read the full guide',
    kit: 'The kit’s source',
  },
} as const;

const SNIPPET = `<script type="module" src="/vendor/veilcore-record-check.js"></script>

<form action="/apply" method="post">
  <veilcore-record-check name="veilcore_link" required></veilcore-record-check>
  <button>Apply</button>
</form>`;

/** The live field. The element's code loads only on this page, on first view. */
const Demo: React.FC = () => {
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
          label: TEXT.demo.label,
        })
      ) : (
        <p className="pk-muted">{TEXT.demo.loading}</p>
      )}
    </div>
  );
};

export const PartnersPage: React.FC = () => (
  <SiteShell>
    <div className="pk">
      <header className="wrap page">
        <div className="label">{TEXT.label}</div>
        <h1>
          {TEXT.title} <em>{TEXT.titleEm}</em>
        </h1>
        <p>{TEXT.lede}</p>
      </header>

      <section aria-labelledby="pk-demo">
        <div className="wrap pk-narrow">
          <h2 id="pk-demo">{TEXT.demo.title}</h2>
          <p className="lede">{TEXT.demo.lede}</p>
          <Demo />
        </div>
      </section>

      <section aria-labelledby="pk-gives">
        <div className="wrap pk-two">
          <div>
            <h2 id="pk-gives">{TEXT.gives.title}</h2>
            <dl className="pk-list">
              {TEXT.gives.items.map(([t, d]) => (
                <div key={t}>
                  <dt>{t}</dt>
                  <dd>{d}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="pk-card">
            <h3>{TEXT.not.title}</h3>
            <p>{TEXT.not.lede}</p>
            <ul>
              {TEXT.not.items.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section aria-labelledby="pk-steps">
        <div className="wrap">
          <h2 id="pk-steps">{TEXT.steps.title}</h2>
          <div className="pk-two pk-steps">
            {[TEXT.steps.applicant, TEXT.steps.you].map((s) => (
              <div key={s.title} className="pk-card">
                <h3>{s.title}</h3>
                <ol>
                  {s.items.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="pk-form">
        <div className="wrap pk-narrow">
          <h2 id="pk-form">{TEXT.form.title}</h2>
          <p className="lede">{TEXT.form.lede}</p>
          <pre className="pk-code" tabIndex={0} aria-label="Example HTML">
            <code>{SNIPPET}</code>
          </pre>
          <dl className="pk-list">
            {TEXT.form.options.map(([t, d]) => (
              <div key={t}>
                <dt>
                  <code>{t}</code>
                </dt>
                <dd>{d}</dd>
              </div>
            ))}
          </dl>
          <p className="pk-muted">{TEXT.form.csp}</p>
          <p className="pk-muted">{TEXT.form.status}</p>
        </div>
      </section>

      <section aria-labelledby="pk-facts">
        <div className="wrap pk-narrow">
          <h2 id="pk-facts">{TEXT.facts.title}</h2>
          <dl className="pk-list">
            {[TEXT.facts.cost, TEXT.facts.down].map(([t, d]) => (
              <div key={t}>
                <dt>{t}</dt>
                <dd>{d}</dd>
              </div>
            ))}
            <div>
              <dt>{TEXT.facts.support[0]}</dt>
              <dd>
                {TEXT.facts.support[1]} <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. {TEXT.facts.support[2]}
              </dd>
            </div>
            <div>
              <dt>{TEXT.facts.data[0]}</dt>
              <dd>
                {TEXT.facts.data[1]} <RouterLink to="/privacy">{TEXT.facts.data[2]}</RouterLink>. {TEXT.facts.data[3]}
              </dd>
            </div>
            {[TEXT.facts.gone, TEXT.facts.npm].map(([t, d]) => (
              <div key={t}>
                <dt>{t}</dt>
                <dd>{d}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section aria-labelledby="pk-policy">
        <div className="wrap pk-narrow">
          <h2 id="pk-policy">{TEXT.policy.title}</h2>
          <p className="pk-note">{TEXT.policy.note}</p>
          <blockquote className="pk-quote">
            {TEXT.policy.text.map((t) => (
              <p key={t}>{t}</p>
            ))}
          </blockquote>
        </div>
      </section>

      <section aria-labelledby="pk-dev">
        <div className="wrap pk-narrow">
          <h2 id="pk-dev">{TEXT.dev.title}</h2>
          <dl className="pk-list">
            {TEXT.dev.items.map(([t, d]) => (
              <div key={t}>
                <dt>{t}</dt>
                <dd>{d}</dd>
              </div>
            ))}
          </dl>
          <p className="pk-links">
            <a href={GUIDE}>{TEXT.dev.guide}</a>
            <a href={KIT}>{TEXT.dev.kit}</a>
          </p>
        </div>
      </section>
    </div>
  </SiteShell>
);
