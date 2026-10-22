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
  type CheckedCredential,
} from '../../veilcore/credentials';

type Statement = Extract<DealEntry, { type: 'statement' }>;
type Received = Extract<DealEntry, { type: 'received' }>;

export const DealCredentials: React.FC<{
  party: DealParty;
  entries: readonly DealEntry[];
  confirmed: readonly { statement: Statement; received: Received }[];
  busy: boolean;
  onSend: (b: DealBody) => void;
}> = ({ party, entries, confirmed, busy, onSend }) => {
  const have = useMemo(() => credentialsIn(entries, party), [entries, party]);
  const agree = entries.find((e) => e.type === 'agree' && e.from === 'licensee') as
    | Extract<DealEntry, { type: 'agree' }>
    | undefined;
  const terms = entries.find((e) => e.type === 'terms' && e.from === 'issuer') as
    | Extract<DealEntry, { type: 'terms' }>
    | undefined;
  const licenseSent = have.some((c) => c.kind === 'license');
  const unsentPayments = confirmed.filter((c) => !have.some((h) => h.statementSignature === c.statement.signature));
  const issuer = party.side === 'issuer';
  if (!agree && have.length === 0) return null;

  const label = (c: CheckedCredential) =>
    c.kind === 'license'
      ? 'License credential'
      : `Payment credential: ${
          ((c.credential.credentialSubject as Record<string, unknown>).royaltyPayment as Record<string, string>)
            .periodFrom
        } to ${
          ((c.credential.credentialSubject as Record<string, unknown>).royaltyPayment as Record<string, string>)
            .periodTo
        }`;

  return (
    <Box data-deal-credentials="">
      <Typography variant="subtitle2" component="h4" sx={{ fontWeight: 700 }}>
        W3C credentials
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {issuer
          ? 'Signed by you, for them to show anyone in the standard W3C format. They hold the terms’ fingerprint, never the terms. Whether the license is still live is checked on Midnight.'
          : 'Signed by the licensor, in the standard W3C format that wallets and other systems read. They hold the terms’ fingerprint, never the terms. Whether your license is still live is checked on Midnight.'}
      </Typography>
      <Stack spacing={1} sx={{ mt: 1 }}>
        {issuer && agree && terms && !licenseSent && (
          <Button
            variant="outlined"
            disabled={busy}
            sx={{ alignSelf: 'flex-start' }}
            onClick={() =>
              onSend({
                type: 'credential',
                credential: licenseCredential(party, {
                  agreementType: terms.agreementType,
                  agreementFingerprint: agree.agreementFingerprint,
                  agreedAt: agree.at,
                }),
              })
            }
          >
            Send them a license credential
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
              Send a payment credential for {c.statement.periodFrom} to {c.statement.periodTo}
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
            Download: {label(c)}
          </Button>
        ))}
        {!issuer && have.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            None yet. The licensor sends them from their page.
          </Typography>
        )}
      </Stack>
    </Box>
  );
};
