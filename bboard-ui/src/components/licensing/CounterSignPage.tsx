// CounterSignPage (/license/:id/sign) — meant as the licensee's view. It is not one yet:
// the agreement is read from this browser's own registry set, so the page only opens for
// the issuer, and the issuer is the only one who can press "sign" (attack round D). It
// says so, records which holder key pressed it, and never says "both parties have
// signed" unless two different keys did. Counter-signing by the other party needs the
// registry to serve the agreement to them and take their key's signature; not built.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, Container, Divider, Paper, Stack, Typography } from '@mui/material';
import { useParams } from 'react-router-dom';
import {
  useLicenses,
  getLicense,
  countersignLicense,
  signedByTwoParties,
  isIssuer,
  startLicenseSync,
  effectiveState,
  agreementType,
  agreementRows,
  agreementLabel,
  royaltyProtectionPending,
  useAgreementsWaitForBackup,
} from '../../veilcore/licenses';
import { Wordmark } from '../Wordmark';
import { AgreementsBackupFirst } from './AgreementsBackupFirst';
import { LanguageBar } from '../../i18n/LanguagePicker';
import { useT } from '../../i18n/app';
import { startRecordSync } from '../../veilcore/records';

const Line: React.FC<{ k: string; v: string }> = ({ k, v }) => (
  <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between' }}>
    <Typography variant="body2" color="text.secondary">
      {k}
    </Typography>
    <Typography variant="body2" sx={{ textAlign: 'right' }}>
      {v}
    </Typography>
  </Stack>
);

export const CounterSignPage: React.FC = () => {
  useLicenses();
  useEffect(() => {
    startLicenseSync();
    startRecordSync();
  }, []);
  const { id = '' } = useParams();
  const license = getLicense(id);
  const tr = useT();
  const [issuerHere, setIssuerHere] = useState<boolean | null>(null);
  const blocked = useAgreementsWaitForBackup();
  useEffect(() => {
    if (license) void isIssuer(license).then(setIssuerHere);
  }, [license]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="sm" sx={{ py: { xs: 5, md: 8 } }}>
        <LanguageBar />
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', justifyContent: 'center', mb: 4 }}>
          <Wordmark />
        </Stack>

        {!license ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography sx={{ mb: 1 }}>{tr.t('app.lic.sign.notHere')}</Typography>
            <Typography variant="body2" color="text.secondary">
              {tr.t('app.lic.sign.notHereWhy')}
            </Typography>
          </Paper>
        ) : (
          <Paper sx={{ p: { xs: 3, md: 4 } }}>
            <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mb: 0.5, flexWrap: 'wrap' }}>
              <Typography variant="h5">{tr.t('app.lic.sign.title')}</Typography>
              <Chip size="small" variant="outlined" label={agreementLabel(agreementType(license), tr)} />
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
              {tr.t('app.lic.sign.intro', { site: tr.t('app.copy.thisSite') })}
            </Typography>

            <Stack spacing={1}>
              {agreementRows(license, tr).map((r) => (
                <Line key={r.k} k={r.k} v={r.v} />
              ))}
            </Stack>

            {agreementType(license) === 'breeder-share' && license.terms.mayBreed && (
              <Alert severity="info" variant="outlined" sx={{ mt: 2 }}>
                {tr.t('app.lic.sign.mayBreed')}
              </Alert>
            )}

            <Divider sx={{ my: 2.5 }} />

            {effectiveState(license) === 'sent' && (
              <Stack spacing={1.5}>
                {issuerHere !== false && (
                  <Alert severity="warning" variant="outlined">
                    {tr.t('app.lic.sign.issuerHere')}
                  </Alert>
                )}
                <Typography variant="body2" color="text.secondary">
                  {tr.t('app.lic.sign.whatItRecords')}
                </Typography>
                <AgreementsBackupFirst />
                <Button
                  variant="contained"
                  size="large"
                  disabled={blocked}
                  onClick={() => void countersignLicense(license.id).catch(() => undefined)}
                >
                  {issuerHere === false
                    ? tr.t('app.lic.sign.accept')
                    : tr.t('app.lic.sign.markActive', { tag: tr.t('app.copy.simulatedTag') })}
                </Button>
              </Stack>
            )}

            {effectiveState(license) === 'draft' && (
              <Alert severity="info" variant="outlined">
                {tr.t('app.lic.sign.notIssued')}
              </Alert>
            )}

            {effectiveState(license) === 'active' && (
              <Stack spacing={1.5}>
                {royaltyProtectionPending(license) && (
                  <Alert severity="warning" variant="outlined" data-royalty-pending-text="">
                    {tr.t('app.lic.royaltyPending.text')}
                  </Alert>
                )}
                <Alert severity={signedByTwoParties(license) ? 'success' : 'info'} variant="outlined">
                  {tr.t(signedByTwoParties(license) ? 'app.lic.sign.activeTwo' : 'app.lic.sign.activeOne')}{' '}
                  {tr.t('app.lic.sign.worth')}
                </Alert>
                {/* This button used to set a boolean and render "license proven". No
                    circuit ran, nothing was checked, and the word next to it was
                    zero-knowledge — a button that prints a success message is the
                    simulate button this project removed once already. It now says what
                    it is. Wiring it to proveLicense means a wallet, a proof server and
                    a deployed contract, which the web app does not have. */}
                <Alert severity="info" variant="outlined">
                  {tr.t('app.copy.licenseProofNote')}
                </Alert>
              </Stack>
            )}

            {effectiveState(license) === 'expired' && (
              <Alert severity="info" variant="outlined">
                {tr.t('app.lic.sign.expired', { date: license.terms.endDate })}
              </Alert>
            )}
            {effectiveState(license) === 'revoked' && (
              <Alert severity="error" variant="outlined">
                {tr.t('app.lic.sign.revoked', { reason: license.revokedReason ?? '' })}
              </Alert>
            )}

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2.5 }}>
              {tr.t('app.copy.agreementsSimulated')}
            </Typography>
          </Paper>
        )}
      </Container>
    </Box>
  );
};
