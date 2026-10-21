// /terms — the terms of use. Written for the people who use VeilCore, in plain English,
// and true of what the code does: every promise here is one the code keeps (docs/
// agreements-live.md says what VeilCore never does). The English text governs; other
// languages get a line saying so.
//
// Who runs VeilCore comes from config/copy.ts OPERATOR, so incorporating changes one line.
// The sections about licenses and royalties apply where the site offers them: on mainnet
// that is once AGREEMENTS_LIVE is on.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { SiteShell } from './SiteShell';
import { OPERATOR, TERMS_UPDATED } from '../../config/copy';

type Section = { readonly id: string; readonly title: string; readonly body: readonly React.ReactNode[] };

const SECTIONS: readonly Section[] = [
  {
    id: 'what',
    title: 'What VeilCore is',
    body: [
      'VeilCore is a tool for dating records of plant and animal genetics on Midnight, a public blockchain, and for keeping a signed, dated record of the licenses and royalties people agree between themselves. It is run by ' +
        OPERATOR +
        ' (“we”).',
      'By using this website or VeilCore’s registry you agree to these terms. If you use VeilCore for a business, you agree for that business.',
    ],
  },
  {
    id: 'not',
    title: 'What VeilCore is not',
    body: [
      'We are not a party to any license, share, transfer or other agreement you make. We are not a broker, an escrow agent, a bank, a lender, a money transmitter or a payment service. We never hold or move your money. We are not your lawyer, and nothing on this site is legal, tax or financial advice.',
      'A dated record shows that whoever controlled the record’s key had it by that date. It is evidence of prior possession of a record, not proof of ownership, of who bred anything, or that the genetics are what anyone says. We don’t check what you type.',
    ],
  },
  {
    id: 'yours',
    title: 'Your part',
    body: [
      'Use VeilCore only for what is lawful where you and the other party are. That includes the laws on cannabis and other controlled plants, on moving plant or animal material, on plant variety rights, and on taxes. You are responsible for knowing them.',
      'Record and license only what you have the right to. Don’t put other people’s personal details into a record without a lawful reason to.',
      'Keep your backup file safe. Your keys are made in your browser and we don’t have them, so we can’t recover a record, a license or a deal you lose the keys to.',
    ],
  },
  {
    id: 'agreements',
    title: 'Licenses, agreements and royalties',
    body: [
      'The terms of a license are between you and the other party. VeilCore records that the license exists, when it was issued, activated or revoked, and the messages the two of you send each other about it: the terms, each side’s agreement to them, statements of what is owed, replies, and notices of payment.',
      'Each of those messages is signed by the person who sent it and encrypted so that only the two of you can read it. Its fingerprint is dated on Midnight. Either of you may show your messages to anyone, a court included, and anyone can check the signatures. We can’t read them, and we don’t decide disputes.',
      'Amounts the site works out from the terms are a convenience. Check them before you agree to them.',
      'A license stays live on Midnight until the breeder revokes it, whatever end date its terms give. A royalty on offspring stays on the record it was accepted for until the breeder releases it.',
    ],
  },
  {
    id: 'payments',
    title: 'Payments',
    body: [
      'Royalties are paid directly between the parties, or through a payment partner the payer chooses. Payment partners are independent companies with their own terms and their own licences. A receipt from a payment partner is that partner’s statement, signed with its key; whether VeilCore checked the partner’s name is shown beside it.',
      'Using VeilCore is free today. If that changes, we will say so on this page before it applies, and a change will never apply to anything already done.',
    ],
  },
  {
    id: 'chain',
    title: 'What can’t be undone',
    body: [
      'What goes on Midnight, and the fingerprints dated in our batches (also on Bitcoin, through OpenTimestamps), can’t be changed or removed by anyone, us included. Only fingerprints and commitments go there, never your genetics, your terms or your name.',
    ],
  },
  {
    id: 'service',
    title: 'The service',
    body: [
      'We run VeilCore as it is, and we may change it, pause it or stop it. We pay the network fees for the steps this site offers, within daily limits, and may stop doing so. The code is open: anyone can check what it does and run it themselves.',
      'To the extent the law allows, we give no warranties, and we are not liable for indirect or consequential losses, lost profits, lost keys, or what other people do with VeilCore. Nothing here limits what the law does not let us limit.',
      'We may stop serving anyone who abuses VeilCore, its registry or its fee sponsor.',
    ],
  },
  {
    id: 'changes',
    title: 'Changes to these terms',
    body: [
      'We will post any change here, with its date, before it applies. Using VeilCore after that means you accept the change.',
    ],
  },
];

export const Terms: React.FC = () => {
  const { t, lang } = useI18n();
  return (
    <SiteShell>
      <header className="wrap page">
        <h1>{t('m.foot.terms')}</h1>
        <p lang="en">Last updated {TERMS_UPDATED}.</p>
        {lang !== 'en' && <p>{t('m.terms.inEnglish')}</p>}
      </header>
      <section className="privacy-note" lang="en">
        <div className="wrap">
          <dl>
            {SECTIONS.map((s) => (
              <div key={s.id} id={s.id}>
                <dt>{s.title}</dt>
                {s.body.map((p, i) => (
                  <dd key={i}>{p}</dd>
                ))}
              </div>
            ))}
            <div id="privacy">
              <dt>Your data</dt>
              <dd>
                What we keep, where, for how long, and how to get it deleted:{' '}
                <RouterLink to="/privacy">privacy</RouterLink>.
              </dd>
            </div>
          </dl>
          <p className="privacy-contact">
            <a href="mailto:hunter@veilcore.org">hunter@veilcore.org</a>
          </p>
        </div>
      </section>
    </SiteShell>
  );
};
