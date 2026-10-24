// W3C Verifiable Credentials for a license and its confirmed payments (veilcore/credentials.ts).
// The licensor signs and sends them over the deal's channel; both sides can download them.
// SPDX-License-Identifier: Apache-2.0

import React, { useMemo } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import type { DealEntry, DealParty } from '../../veilcore/deal-client';
import type { DealBody } from '../../veilcore/deal';
import {
  credentialsIn,
  downloadCredential,
  licenseCredential,
  paymentCredential,
  type AgreedTerms,
  type CheckedCredential,
} from '../../veilcore/credentials';
import { useT } from '../../i18n/app';

type Statement = Extract<DealEntry, { type: 'statement' }>;
type Received = Extract<DealEntry, { type: 'received' }>;

export const DealCredentials: React.FC<{
  party: DealParty;
  entries: readonly DealEntry[];
  confirmed: readonly { statement: Statement; received: Received }[];
  busy: boolean;
  onSend: (b: DealBody) => void;
  /** From this page's own stored license (never from a message): what the two agreed to. */
  agreed: AgreedTerms | undefined;
}> = ({ party, entries, confirmed, busy, onSend, agreed }) => {
  const tr = useT();
  const have = useMemo(() => credentialsIn(entries, party, agreed), [entries, party, agreed]);
  // The licensee's signed agreement to exactly these terms (attack pass 21 Oct, finding 1).
  const agree = agreed
    ? (entries.find(
        (e) => e.type === 'agree' && e.from === 'licensee' && e.agreementFingerprint === agreed.agreementFingerprint,
      ) as Extract<DealEntry, { type: 'agree' }> | undefined)
    : undefined;
  const licenseSent = have.some((c) => c.kind === 'license');
  const unsentPayments = confirmed.filter((c) => !have.some((h) => h.statementSignature === c.statement.signature));
  const issuer = party.side === 'issuer';
  if (!agree && have.length === 0) return null;

  const label = (c: CheckedCredential) => {
    if (c.kind === 'license') return tr.t('app.lic.vc.license');
    const st = entries.find((e) => e.type === 'statement' && e.signature === c.statementSignature) as
      | Extract<DealEntry, { type: 'statement' }>
      | undefined;
    return st ? tr.t('app.lic.vc.paymentFor', { from: st.periodFrom, to: st.periodTo }) : tr.t('app.lic.vc.payment');
  };

  return (
    <Box data-deal-credentials="">
      <Typography variant="subtitle2" component="h4" sx={{ fontWeight: 700 }}>
        {tr.t('app.lic.vc.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {tr.t(issuer ? 'app.lic.vc.introIssuer' : 'app.lic.vc.introLicensee')}
      </Typography>
      <Stack spacing={1} sx={{ mt: 1 }}>
        {issuer && agree && agreed && !licenseSent && (
          <Button
            variant="outlined"
            disabled={busy}
            sx={{ alignSelf: 'flex-start' }}
            onClick={() =>
              onSend({
                type: 'credential',
                credential: licenseCredential(party, {
                  agreementType: agreed.agreementType,
                  agreementFingerprint: agreed.agreementFingerprint,
                  agreedAt: Math.max(agree.at, agreed.notBefore ?? 0),
                }),
              })
            }
          >
            {tr.t('app.lic.vc.sendLicense')}
          </Button>
        )}
        {issuer &&
          unsentPayments.map((c) => (
            <Button
              key={c.statement.signature}
              variant="outlined"
              disabled={busy}
              sx={{ alignSelf: 'flex-start' }}
              onClick={() =>
                onSend({ type: 'credential', credential: paymentCredential(party, c.statement, c.received) })
              }
            >
              {tr.t('app.lic.vc.sendPayment', { from: c.statement.periodFrom, to: c.statement.periodTo })}
            </Button>
          ))}
        {have.map((c) => (
          <Button
            key={typeof c.credential.id === 'string' ? c.credential.id : c.kind}
            size="small"
            color="inherit"
            sx={{ alignSelf: 'flex-start' }}
            onClick={() => downloadCredential(c)}
          >
            {tr.t('app.lic.vc.download', { what: label(c) })}
          </Button>
        ))}
        {!issuer && have.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            {tr.t('app.lic.vc.none')}
          </Typography>
        )}
      </Stack>
    </Box>
  );
};
