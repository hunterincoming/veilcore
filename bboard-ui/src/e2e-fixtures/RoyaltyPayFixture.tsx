// End-to-end fixture, only in the e2e build (VITE_E2E_FIXTURES=1, package.json e2e:build; App.tsx
// adds the route only then, and every other build leaves this file out). A live license's
// royalties need two devices and a license on Midnight, which a browser test can't make, so
// this page stands in for the license page around the real RoyaltyLedger: a deal between two
// fixed practice keys, its messages signed and sealed by the app's own code (deal-client say)
// and sent to the test's stand-in registry, and the ledger shown for either side.
//
//   /e2e/royalty-pay?side=issuer|licensee&scenario=overdue|soon|usd[&start=YYYY-MM-DD][&method=…]
//
// `start` pins the license's start date (the page shows the one it used, data-e2e-start), so a
// test can move the browser's clock and still open the same deal; `method` sets the payout's
// method in the usd scenario (a Cardano token this build can't pay, for instance). The page
// offers no revoke: revoking is tested on the real license page (e2e/royalty-revoke.spec.ts),
// with Midnight's two steps stood in for (veilcore/chain/e2e-chain.ts). The terms it used are on
// window.__e2eTerms, so that test can make the license the real page opens.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Container, Stack, Typography } from '@mui/material';
import { publicOf } from '../veilcore/deal';
import { readAll, say, useDeal, type DealParty } from '../veilcore/deal-client';
import { RoyaltyLedger } from '../components/licensing/RoyaltyLedger';
import { addDays, addMonths, periodsOf } from '../veilcore/royalty-periods';
import { applyPreset, termsToSeal, utcDay } from '../veilcore/royalty-terms';
import { emptyTermsFor } from '../components/licensing/LicenseTermsFields';
import type { LicenseTerms } from '../veilcore/licenses';
import { cardanoMethod, tokensFor } from '../veilcore/cardano-pay';
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
const termsFor = (dueIn: number, pinned?: string): LicenseTerms => {
  const today = utcDay();
  let start = pinned && /^\d{4}-\d{2}-\d{2}$/.test(pinned) ? pinned : addMonths(today, -6);
  for (let i = 0; i < 400 && !pinned; i++) {
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
  const method = new URLSearchParams(location.search).get('method');
  await say(
    issuer,
    scenario === 'usd' && (token || method)
      ? {
          type: 'payout',
          method: new URLSearchParams(location.search).get('method') ?? cardanoMethod(token.code),
          account: payoutAddress(),
          currency: 'USD',
          rate: '1',
        }
      : {
          type: 'payout',
          method: 'bank',
          account: 'Hana Rivera',
          currency: 'USD',
          details: 'Practice Bank, account 000-PRACTICE',
        },
  );
  const first = periodsOf(terms.reporting!, terms.startDate, terms.endDate, utcDay())[0];
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
  const [q] = useSearchParams();
  const side = q.get('side') === 'licensee' ? 'licensee' : 'issuer';
  const scenario = q.get('scenario') ?? 'overdue';
  const start = q.get('start') ?? undefined;
  const terms = useMemo(() => termsFor(scenario === 'soon' ? 3 : -20, start), [scenario, start]);
  const [ready, setReady] = useState(false);
  const [problem, setProblem] = useState<string>();
  useEffect(() => {
    (window as unknown as { __e2eTerms?: LicenseTerms }).__e2eTerms = terms;
  }, [terms]);
  useEffect(() => {
    void seed(terms, scenario).then(
      () => setReady(true),
      (e: unknown) => setProblem(e instanceof Error ? e.message : String(e)),
    );
  }, [terms, scenario]);
  const p = useMemo(() => party(side), [side]);
  const deal = useDeal(ready ? p : undefined, 3_000);

  return (
    <Container maxWidth="sm" sx={{ py: 2, px: 2 }} data-e2e-fixture="">
      <LanguageBar />
      <Stack spacing={2}>
        <Typography variant="h5" component="h1">
          {side === 'issuer' ? 'Hana Rivera → Practice Grower' : 'Practice Grower → Hana Rivera'}
        </Typography>
        {problem && <Alert severity="error">{problem}</Alert>}
        <span data-e2e-start={terms.startDate} hidden />
        {ready && (
          <RoyaltyLedger
            party={p}
            side={side}
            terms={terms}
            entries={deal.entries}
            refresh={deal.refresh}
            agreementType="license"
            {...(side === 'issuer' ? { publicRecordId: E2E_RECORD } : {})}
          />
        )}
      </Stack>
    </Container>
  );
};
