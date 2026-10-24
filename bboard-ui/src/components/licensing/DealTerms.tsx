// The terms of a real license as they reach the licensee: over the deal's private channel
// (deal.ts), signed by the issuer, and checked here against the agreement's fingerprint
// (licenses.ts sealAgreement). The licensee agrees to exactly what they read: their signed
// agreement names that fingerprint.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useState } from 'react';
import { Alert, Box, Paper, Stack, Typography } from '@mui/material';
import {
  agreementRows,
  sealAgreement,
  type AgreementType,
  type License,
  type LicenseTerms,
} from '../../veilcore/licenses';
import type { AgreementCopy } from '../../veilcore/held-licenses';
import type { DealEntry } from '../../veilcore/deal-client';
import { rich, useT } from '../../i18n/app';

export type Offered = { ok: true; copy: AgreementCopy } | { ok: false; reason: string } | undefined;

/** The first terms the issuer sent, checked. Undefined while none has arrived. */
export const useOfferedTerms = (entries: readonly DealEntry[] | undefined): Offered => {
  const [offered, setOffered] = useState<Offered>();
  const tr = useT();
  const first = entries?.find((e) => e.type === 'terms' && !e.mine);
  const key = first?.signature ?? '';
  useEffect(() => {
    if (!first || first.type !== 'terms') return setOffered(undefined);
    let on = true;
    void sealAgreement(
      first.agreementType as AgreementType,
      first.terms as unknown as LicenseTerms,
      first.recordFingerprint,
      first.agreementSalt,
    )
      .then(({ agreementFingerprint }) => {
        if (!on) return;
        setOffered(
          agreementFingerprint === first.agreementFingerprint
            ? {
                ok: true,
                copy: {
                  type: first.agreementType,
                  terms: first.terms,
                  recordFingerprint: first.recordFingerprint,
                  agreementSalt: first.agreementSalt,
                  agreementFingerprint: first.agreementFingerprint,
                },
              }
            : {
                ok: false,
                reason: tr.t('app.lic.terms.mismatch'),
              },
        );
      })
      .catch(() => on && setOffered({ ok: false, reason: tr.t('app.lic.terms.unchecked') }));
    return () => {
      on = false;
    };
  }, [key, tr]);
  return offered;
};

export const TermsBox: React.FC<{ offered: Offered; agreedAt?: number }> = ({ offered, agreedAt }) => {
  const tr = useT();
  if (!offered) {
    return (
      <Typography variant="body2" color="text.secondary">
        {tr.t('app.lic.terms.waiting')}
      </Typography>
    );
  }
  if (!offered.ok) {
    return (
      <Alert severity="error" variant="outlined">
        {offered.reason}
      </Alert>
    );
  }
  const rows = agreementRows(
    {
      type: offered.copy.type as AgreementType,
      terms: offered.copy.terms as unknown as LicenseTerms,
    } as License,
    tr,
  );
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        {agreedAt ? tr.t('app.lic.terms.titleAgreed', { date: tr.date(agreedAt) }) : tr.t('app.lic.terms.title')}
      </Typography>
      <Stack spacing={0.75}>
        {rows.map((r) => (
          <Box key={r.k} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '11rem 1fr' }, gap: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              {r.k}
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
              {r.v}
            </Typography>
          </Box>
        ))}
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.25 }}>
        {rich(
          tr.t('app.lic.terms.signed'),
          {},
          { fp: <span style={{ fontFamily: 'monospace' }}>{offered.copy.agreementFingerprint.slice(0, 16)}…</span> },
        )}
      </Typography>
    </Paper>
  );
};
