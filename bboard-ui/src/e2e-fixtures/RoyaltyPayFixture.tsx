// End-to-end fixture, only in the e2e build (VITE_E2E_FIXTURES=1, package.json e2e:build; App.tsx
// adds the route only then, and every other build leaves this file out). A live license's
// royalties need two devices and a license on Midnight, which a browser test can't make, so
// this page stands in for the license page around the real RoyaltyLedger: a deal between two
// fixed practice keys, its messages signed and sealed by the app's own code (deal-client say)
// and sent to the test's stand-in registry, and the ledger shown for either side.
//
//   /e2e/royalty-pay?side=issuer|licensee&scenario=overdue|soon|usd
//
// "Revoke for non-payment" here sends the same signed notice and the same public notice as the
// license page (RealLicensePanel.tsx); the revocation on Midnight itself is the one step left
// out, because the test has no chain to prove it on.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Container, Stack, Typography } from '@mui/material';
import { publicOf } from '../veilcore/deal';
import { readAll, say, sayOnce, useDeal, type DealParty } from '../veilcore/deal-client';
import { RoyaltyLedger } from '../components/licensing/RoyaltyLedger';
import { ledgerOf, type Report } from '../veilcore/royalty-ledger';
import { addDays, addMonths, periodsOf } from '../veilcore/royalty-periods';
import { applyPreset, localDay, termsToSeal } from '../veilcore/royalty-terms';
import { emptyTermsFor } from '../components/licensing/LicenseTermsFields';
import type { LicenseTerms } from '../veilcore/licenses';
import { noticeRef, syncNotices, type LicenseNotice } from '../veilcore/license-notices';
import { cardanoMethod, tokensFor } from '../veilcore/cardano-pay';
import { useT } from '../i18n/app';
import { LanguageBar } from '../i18n/LanguagePicker';

/** Practice keys and license, fixed so the two sides' pages open the same channel. */
const ISSUER_SECRET = '1a'.repeat(32);
const LICENSEE_SECRET = '2b'.repeat(32);
const COMMITMENT = '3c'.repeat(32);
const ISSUER_RECORD = '4d'.repeat(32);
export const E2E_RECORD = `VEIL-${'E2'.repeat(16)}`;

const party = (side: 'issuer' | 'licensee'): DealParty =>
  side === 'issuer'
    ? {
        side,
        mySecret: ISSUER_SECRET,
        theirPublic: publicOf(LICENSEE_SECRET),
        commitment: COMMITMENT,
        issuerRecord: ISSUER_RECORD,
      }
    : {
        side,
        mySecret: LICENSEE_SECRET,
        theirPublic: publicOf(ISSUER_SECRET),
        commitment: COMMITMENT,
        issuerRecord: ISSUER_RECORD,
      };

/**
 * A start date that puts the first quarter's payment due `dueIn` days from today (negative:
 * already late), the rest of the terms a clone license at 2.50 USD a cutting.
 */
const termsFor = (dueIn: number): LicenseTerms => {
  const today = localDay();
  let start = addMonths(today, -6);
  for (let i = 0; i < 400; i++) {
    const first = periodsOf({ every: 'quarter', reportDueDays: 30, paymentDueDays: 14 }, start, undefined, today)[0];
    if (first && first.paymentDue === addDays(today, dueIn)) break;
    start = addDays(start, first && first.paymentDue > addDays(today, dueIn) ? -1 : 1);
  }
  return termsToSeal({
    ...applyPreset(
      'clone',
      {
        ...emptyTermsFor('license'),
        licensee: 'Practice Grower',
        licensor: 'Hana Rivera',
        territory: 'New Jersey',
        startDate: start,
        endDate: addMonths(start, 24),
      },
      { kind: 'plant', currency: 'USD', governingLaw: 'New Jersey' },
    ),
    royalty: {
      kind: 'per-unit',
      amount: '2.50',
      unit: 'cutting',
      unitDefinition: 'A cutting sold or given away counts once.',
    },
    reporting: { every: 'quarter', reportDueDays: 30, paymentDueDays: 14 },
  });
};

/** The licensor's Cardano address on preprod for the stablecoin scenario (the test gives it). */
const payoutAddress = (): string => new URLSearchParams(location.search).get('payTo') ?? '';

/** The deal so far, sent once into the stand-in registry: a payout, an accepted report. */
const seed = async (terms: LicenseTerms, scenario: string) => {
  const issuer = party('issuer');
  const licensee = party('licensee');
  if ((await readAll(issuer)).length > 0) return;
  const token = tokensFor()[0];
  await say(
    issuer,
    scenario === 'usd' && token
      ? { type: 'payout', method: cardanoMethod(token.code), account: payoutAddress(), currency: 'USD', rate: '1' }
      : {
          type: 'payout',
          method: 'bank',
          account: 'Hana Rivera',
          currency: 'USD',
          details: 'Practice Bank, account 000-PRACTICE',
        },
  );
  const first = periodsOf(terms.reporting!, terms.startDate, terms.endDate, localDay())[0];
  await say(licensee, {
    type: 'statement',
    statementId: 'E2E-1',
    periodFrom: first.from,
    periodTo: first.to,
    basis: 'units',
    quantity: '400',
    currency: 'USD',
    amountOwed: '1000.00',
    lines: [{ kind: 'royalty', quantity: '400', rate: '2.50', amount: '1000.00' }],
  });
  const st = (await readAll(issuer)).find((e) => e.type === 'statement');
  if (st) await say(issuer, { type: 'reply', statementId: 'E2E-1', statementSig: st.signature, decision: 'accepted' });
};

export const RoyaltyPayFixture: React.FC = () => {
  const tr = useT();
  const [q] = useSearchParams();
  const side = q.get('side') === 'licensee' ? 'licensee' : 'issuer';
  const scenario = q.get('scenario') ?? 'overdue';
  const terms = useMemo(() => termsFor(scenario === 'soon' ? 3 : -20), [scenario]);
  const [ready, setReady] = useState(false);
  const [problem, setProblem] = useState<string>();
  const [revoked, setRevoked] = useState<string>();
  useEffect(() => {
    void seed(terms, scenario).then(
      () => setReady(true),
      (e: unknown) => setProblem(e instanceof Error ? e.message : String(e)),
    );
  }, [terms, scenario]);
  const p = useMemo(() => party(side), [side]);
  const deal = useDeal(ready ? p : undefined, 3_000);

  /** As RealLicensePanel does, but for the step on Midnight: the notice, then the public notice. */
  const revokeForNonPayment = async (r: Report) => {
    const today = localDay();
    await sayOnce(p, {
      type: 'notice',
      kind: 'breach',
      about: 'payment',
      periodFrom: r.statement.periodFrom,
      periodTo: r.statement.periodTo,
      statementSig: r.statement.signature,
      asOf: today,
      note: tr.t('app.rpay.revoke.note', { n: r.number }),
    });
    const reports = ledgerOf(deal.entries ?? []).reports;
    const revokedRef = noticeRef('revoked', COMMITMENT);
    const want = new Map<string, LicenseNotice>([[revokedRef, { kind: 'revoked', reason: 'non-payment', on: today }]]);
    await syncNotices(
      E2E_RECORD,
      want,
      new Set([revokedRef, ...reports.map((x) => noticeRef('overdue', x.statement.signature))]),
    );
    setRevoked(today);
  };

  return (
    <Container maxWidth="sm" sx={{ py: 2, px: 2 }} data-e2e-fixture="">
      <LanguageBar />
      <Stack spacing={2}>
        <Typography variant="h5" component="h1">
          {side === 'issuer' ? 'Hana Rivera → Practice Grower' : 'Practice Grower → Hana Rivera'}
        </Typography>
        {problem && <Alert severity="error">{problem}</Alert>}
        {revoked ? (
          <Alert severity="error" variant="outlined" data-license-gone="non-payment">
            {tr.t('app.rpay.revoke.done', { date: tr.date(`${revoked}T12:00:00`) })}
          </Alert>
        ) : (
          ready && (
            <RoyaltyLedger
              party={p}
              side={side}
              terms={terms}
              entries={deal.entries}
              refresh={deal.refresh}
              agreementType="license"
              {...(side === 'issuer'
                ? { publicRecordId: E2E_RECORD, onRevokeForNonPayment: (r: Report) => void revokeForNonPayment(r) }
                : {})}
            />
          )
        )}
      </Stack>
    </Container>
  );
};
