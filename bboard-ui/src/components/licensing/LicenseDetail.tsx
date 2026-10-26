// LicenseDetail (/license/:id) — the breeder's view of a license instrument: terms,
// lifecycle actions (issue → shareable counter-sign link → active, revoke, renew), and
// the royalty obligation log (records only — VeilCore never moves money).
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import { Alert, Box, Button, Divider, Paper, Snackbar, Stack, TextField, Typography } from '@mui/material';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBackOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopyOutlined';
import {
  useLicenses,
  getLicense,
  issueLicense,
  revokeLicense,
  addRoyalty,
  effectiveState,
  agreementType,
  agreementRows,
  agreementLabel,
  VEILCORE_FEE_PCT,
  SHOW_VEILCORE_FEE,
  feeNote,
  veilcoreFee,
  dealValueOf,
  signedByTwoParties,
  royaltyProtectionPending,
  type License,
  useAgreementsWaitForBackup,
} from '../../veilcore/licenses';
import { canonicalUrl } from '../../config/network';
import { getRecord, allRecords } from '../../veilcore/records';
import { offspringOf } from '../stage/self-chain';
import { shortFingerprint } from '../../veilcore/commitment';
import { AppHeader } from '../AppHeader';
import { rich, useT } from '../../i18n/app';
import type { Translator } from '../../i18n/translate';
import { LicenseStateChip } from './LicenseStateChip';
import { isPracticeAgreement } from '../../veilcore/agreements-real';
import { ShareLicense } from './ShareLicense';
import { AgreementTypeChip } from './AgreementTypeChip';
import { AgreementsBackupFirst } from './AgreementsBackupFirst';
import { AGREEMENTS_ON_CHAIN } from '../../config/copy';
import { chainNotReady } from '../../veilcore/chain/config';
import { RealLicensePanel } from './RealLicensePanel';
import { ConfirmInline } from './DealSteps';

const money = (n: number, tr: Translator) => `$${n.toLocaleString(tr.locale, { maximumFractionDigits: 2 })}`;

const TermsSummary: React.FC<{ l: License; tr: Translator }> = ({ l, tr }) => (
  <Stack spacing={1}>
    {agreementRows(l, tr).map((r) => (
      <Row key={r.k} k={r.k} v={r.v} />
    ))}
  </Stack>
);

const Row: React.FC<{ k: string; v: string }> = ({ k, v }) => (
  <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between' }}>
    <Typography variant="body2" color="text.secondary">
      {k}
    </Typography>
    <Typography variant="body2" sx={{ textAlign: 'right' }}>
      {v}
    </Typography>
  </Stack>
);

export const LicenseDetail: React.FC = () => {
  useLicenses();
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const license = getLicense(id);
  const tr = useT();
  const [toast, setToast] = useState<string>();
  const blocked = useAgreementsWaitForBackup();
  const [royaltyInput, setRoyaltyInput] = useState('');
  const [royaltyNote, setRoyaltyNote] = useState('');

  if (!license) {
    return (
      <Box>
        <AppHeader />
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography sx={{ mb: 1 }}>{tr.t('app.lic.detail.notHere')}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {tr.t('app.lic.detail.notHereWhy')}
          </Typography>
          <Button component={RouterLink} to="/licenses" startIcon={<ArrowBackIcon />}>
            {tr.t('app.lic.detail.yours')}
          </Button>
        </Paper>
      </Box>
    );
  }

  const state = effectiveState(license);
  const type = agreementType(license);
  // Where this site sends transactions, every agreement is made for real, between two browsers:
  // on chain a license, a breeder share and a lab transfer are each a license from the record,
  // and their terms travel over the deal's own channel.
  const real = AGREEMENTS_ON_CHAIN && chainNotReady() === undefined;
  const record = getRecord(license.recordId);
  const signLink = canonicalUrl(`/license/${encodeURIComponent(license.id)}/sign`);
  // Breeder-share lineage: if the counterparty may breed with the material, any cultivar
  // they later log with this one as a parent is exposed through the lineage graph.
  const showLineageNote = type === 'breeder-share' && license.terms.mayBreed;
  const knownDerivatives = showLineageNote ? offspringOf(license.recordId, allRecords()).length : 0;

  const copy = async (text: string, msg: string) => {
    await navigator.clipboard.writeText(text);
    setToast(msg);
  };

  const onRevoke = (reason: string) => {
    if (blocked) return;
    revokeLicense(license.id, reason || tr.t('app.lic.detail.noReason'));
    setToast(tr.t('app.lic.detail.revoked'));
  };

  const owed = (n: number) =>
    license.terms.royaltyType === 'percent'
      ? n * ((Number(license.terms.royaltyAmount) || 0) / 100)
      : n * (Number(license.terms.royaltyAmount) || 0);

  const onLogRoyalty = () => {
    const n = Number(royaltyInput);
    if (!n || blocked) return;
    addRoyalty(license.id, n, owed(n), royaltyNote.trim());
    setRoyaltyInput('');
    setRoyaltyNote('');
    setToast(tr.t('app.lic.detail.royaltyRecorded'));
  };

  const totalOwed = license.royaltyLog.reduce((s, e) => s + e.amountOwed, 0);
  const totalDeal = license.royaltyLog.reduce((s, e) => s + dealValueOf(license, e.input), 0);
  const totalFee = veilcoreFee(totalDeal);
  const royaltyInputLabel =
    license.terms.royaltyType === 'percent'
      ? tr.t('app.lic.detail.salesInput')
      : tr.t('app.lic.detail.unitsInput', { basis: license.terms.unitBasis });

  return (
    <Box>
      <AppHeader />
      <AgreementsBackupFirst />
      <Button component={RouterLink} to="/licenses" size="small" startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>
        {tr.t('app.lic.detail.all')}
      </Button>

      <Stack
        direction="row"
        sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 2 }}
      >
        <Box>
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="h4">
              {agreementLabel(type, tr)} · {record?.strainName ?? license.recordId}
            </Typography>
            <AgreementTypeChip type={type} />
          </Stack>
          <Typography variant="caption" color="text.secondary">
            {license.id} {license.supersedesId ? tr.t('app.lic.detail.amends', { id: license.supersedesId }) : ''}
          </Typography>
        </Box>
        <LicenseStateChip license={license} size="medium" />
      </Stack>

      <Stack spacing={2.5}>
        {royaltyProtectionPending(license) && (
          <Alert severity="warning" variant="outlined" data-royalty-pending-text="">
            {tr.t('app.lic.royaltyPending.text')}
          </Alert>
        )}
        <Paper sx={{ p: { xs: 2.5, md: 3 } }}>
          <Typography variant="overline" sx={{ display: 'block', mb: 1.5 }}>
            {tr.t('app.lic.detail.terms')}
          </Typography>
          <TermsSummary l={license} tr={tr} />
          <Divider sx={{ my: 2 }} />
          <Alert severity="info" variant="outlined">
            {license.dnaFingerprint
              ? tr.t('app.lic.detail.attachedCode', { code: shortFingerprint(license.dnaFingerprint) })
              : tr.t('app.lic.detail.attached')}
          </Alert>
          {showLineageNote && (
            <Alert severity="info" variant="outlined" sx={{ mt: 1.5 }}>
              {tr.t('app.lic.detail.lineage', { name: record?.strainName ?? tr.t('app.lic.detail.thisCultivar') })}
              {knownDerivatives > 0 ? ` ${tr.tp('app.lic.detail.derivatives', knownDerivatives)}` : ''}
            </Alert>
          )}
        </Paper>

        {/* lifecycle actions */}
        <Paper sx={{ p: { xs: 2.5, md: 3 } }}>
          <Typography variant="overline" sx={{ display: 'block', mb: 0.5 }}>
            {tr.t('app.lic.detail.status')}
          </Typography>
          {real && isPracticeAgreement(license, real) && (
            <Alert severity="info" variant="outlined" sx={{ mb: 1.75 }} data-practice-agreement-text="">
              {tr.t('app.lic.practice.text')}
            </Alert>
          )}
          {!real && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.75 }}>
              {tr.t('app.copy.agreementsSimulated')}
            </Typography>
          )}

          {real && (state === 'draft' || state === 'sent' || license.onChain) && (
            <RealLicensePanel license={license} blocked={blocked} onToast={setToast} />
          )}

          {!real && state === 'draft' && (
            <Stack spacing={1.5} sx={{ alignItems: 'flex-start' }}>
              <Typography variant="body2" color="text.secondary">
                {tr.t('app.lic.detail.draft')}
              </Typography>
              <Button
                variant="contained"
                disabled={blocked}
                onClick={() =>
                  void issueLicense(license.id)
                    .then(() => setToast(tr.t('app.lic.detail.issuedToast')))
                    .catch(() => undefined)
                }
              >
                {tr.t('app.lic.detail.issue')}
              </Button>
            </Stack>
          )}

          {!real && state === 'sent' && (
            <Stack spacing={1.5}>
              <Alert severity="warning" variant="outlined">
                {rich(tr.t('app.lic.detail.sent'), { b: (c) => <b>{c}</b> })}
              </Alert>
              <TextField
                label={tr.t('app.lic.detail.signLink')}
                value={signLink}
                fullWidth
                size="small"
                slotProps={{ input: { readOnly: true } }}
              />
              <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  startIcon={<ContentCopyIcon />}
                  onClick={() => copy(signLink, tr.t('app.lic.detail.copied'))}
                >
                  {tr.t('app.lic.detail.copyLink')}
                </Button>
                <Button component={RouterLink} to={`/license/${encodeURIComponent(license.id)}/sign`} variant="text">
                  {tr.t('app.lic.detail.openSign')} {tr.t('app.copy.simulatedTag')}
                </Button>
                <ConfirmInline
                  label={tr.t('app.lic.detail.revoke')}
                  question={tr.t('app.lic.detail.revokeQ')}
                  confirmLabel={tr.t('app.lic.detail.revokeYes')}
                  reason={tr.t('app.lic.detail.revokeReason')}
                  disabled={blocked}
                  onConfirm={onRevoke}
                />
              </Stack>
            </Stack>
          )}

          {state === 'active' && !license.onChain && (
            <Stack spacing={1.5}>
              <Alert severity="success" variant="outlined">
                {tr.t(signedByTwoParties(license) ? 'app.lic.detail.activeTwo' : 'app.lic.detail.activeOne', {
                  date: tr.date(license.licenseeSignedAt ?? license.createdAt),
                })}
              </Alert>
              <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
                <ShareLicense license={license} />
                <Button
                  variant="outlined"
                  onClick={() => navigate(`/record/${license.recordId}/license?supersede=${license.id}`)}
                >
                  {tr.t('app.lic.detail.renewAmend')}
                </Button>
                <ConfirmInline
                  label={tr.t('app.lic.detail.revoke')}
                  question={tr.t('app.lic.detail.revokeQ')}
                  confirmLabel={tr.t('app.lic.detail.revokeYes')}
                  reason={tr.t('app.lic.detail.revokeReason')}
                  disabled={blocked}
                  onConfirm={onRevoke}
                />
              </Stack>
            </Stack>
          )}

          {state === 'expired' && (
            <Stack spacing={1.5} sx={{ alignItems: 'flex-start' }}>
              <Alert severity="info" variant="outlined">
                {tr.t('app.lic.detail.expired', { date: license.terms.endDate })}
              </Alert>
              <Button
                variant="outlined"
                onClick={() => navigate(`/record/${license.recordId}/license?supersede=${license.id}`)}
              >
                {tr.t('app.lic.detail.renew')}
              </Button>
            </Stack>
          )}

          {state === 'revoked' && !license.onChain && (
            <Alert severity="error" variant="outlined">
              {license.revokedAt
                ? tr.t('app.lic.detail.revokedOn', {
                    date: tr.date(license.revokedAt),
                    reason: license.revokedReason ?? '',
                  })
                : tr.t('app.lic.detail.revokedNoDate', { reason: license.revokedReason ?? '' })}
            </Alert>
          )}
        </Paper>

        {/* royalty ledger — license agreements only; its per-sale/unit mechanics don't apply to
            lab transfers or breeder shares (a breeder share's offspring-royalty fee shows in the
            terms summary above, not as a sales ledger). */}
        {type === 'license' && (state === 'active' || license.royaltyLog.length > 0) && (
          <Paper sx={{ p: { xs: 2.5, md: 3 } }}>
            <Typography variant="overline" sx={{ display: 'block', mb: 0.5 }}>
              {tr.t('app.lic.detail.royalties')}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
              {tr.t('app.lic.detail.noMoney')}
            </Typography>
            {state === 'active' && (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
                <TextField
                  label={royaltyInputLabel}
                  value={royaltyInput}
                  onChange={(e) => setRoyaltyInput(e.target.value)}
                  size="small"
                  sx={{ maxWidth: 200 }}
                />
                <TextField
                  label={tr.t('app.lic.detail.note')}
                  value={royaltyNote}
                  onChange={(e) => setRoyaltyNote(e.target.value)}
                  size="small"
                  fullWidth
                />
                <Button variant="outlined" onClick={onLogRoyalty}>
                  {tr.t('app.lic.detail.record')}
                </Button>
              </Stack>
            )}
            {license.royaltyLog.length > 0 ? (
              <Stack spacing={1.25}>
                {license.royaltyLog.map((e, i) => {
                  const dv = dealValueOf(license, e.input);
                  return (
                    <Box key={i} sx={{ p: 1, borderRadius: 1, background: 'rgba(30,34,39,0.02)' }}>
                      <Typography variant="caption" color="text.secondary">
                        {tr.date(e.at)}
                        {e.note ? ` · ${e.note}` : ''}
                      </Typography>
                      <Row k={tr.t('app.lic.detail.dealValue')} v={money(dv, tr)} />
                      <Row k={tr.t('app.lic.detail.yourRoyalty')} v={money(e.amountOwed, tr)} />
                      {SHOW_VEILCORE_FEE && (
                        <Row
                          k={tr.t('app.lic.detail.feeShort', { pct: VEILCORE_FEE_PCT })}
                          v={money(veilcoreFee(dv), tr)}
                        />
                      )}
                    </Box>
                  );
                })}
                <Divider />
                <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                  <Typography variant="subtitle2">{tr.t('app.lic.detail.totalDeal')}</Typography>
                  <Typography variant="subtitle2">{money(totalDeal, tr)}</Typography>
                </Stack>
                <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    {tr.t('app.lic.detail.totalRoyalty')}
                  </Typography>
                  <Typography variant="body2">{money(totalOwed, tr)}</Typography>
                </Stack>
                {SHOW_VEILCORE_FEE && (
                  <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      {tr.t('app.lic.detail.feeShort', { pct: VEILCORE_FEE_PCT })}
                    </Typography>
                    <Typography variant="body2">{money(totalFee, tr)}</Typography>
                  </Stack>
                )}
                {SHOW_VEILCORE_FEE && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                    {feeNote(tr)}
                  </Typography>
                )}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                {tr.t('app.lic.detail.nothingYet')}
                {SHOW_VEILCORE_FEE ? ` ${feeNote(tr)}` : ''}
              </Typography>
            )}
          </Paper>
        )}
      </Stack>

      <Snackbar
        open={!!toast}
        autoHideDuration={2500}
        onClose={() => setToast(undefined)}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
};
