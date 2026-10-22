// /intake and /intake/send: a partner's intake page sends the breeder here, and gets a record
// back only if the breeder says so (veilcore/intake.ts says why it is built this way).
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AppHeader } from '../AppHeader';
import { FlowFrame, ScreenHeading } from './FlowFrame';
import { rich, useT } from '../../i18n/app';
import {
  allowRecord,
  clearIntake,
  hostOf,
  loadIntake,
  oddHost,
  parseIntake,
  returnUrl,
  saveIntake,
  type KeptIntake,
} from '../../veilcore/intake';
import { useRecords } from '../../veilcore/records';
import { verifyPath } from '../../veilcore/verify-link';
import { emptyDraft, loadDraft, saveDraft } from './log-flow-state';
import { loadLogKind } from './animal-draft';
import { emptyStrainDraft } from './strain-draft';
import { STRAIN_RECORDS_ENABLED } from '../../config/network';

const HEX64 = /^[0-9a-f]{64}$/;

const Frame: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box>
    <AppHeader />
    <FlowFrame section="log">
      <Stack spacing={2.5}>{children}</Stack>
    </FlowFrame>
  </Box>
);

/** Leave VeilCore for the partner's own page (an address the breeder was shown). */
const leaveFor = (url: string) => {
  clearIntake();
  window.location.assign(url);
};

/** /intake: what the partner asked, then a new record or one already made. */
export const IntakePage: React.FC = () => {
  const { search } = useLocation();
  const navigate = useNavigate();
  const { t } = useT();
  const parsed = useMemo(() => parseIntake(search), [search]);
  // Current records only: a superseded one would send its old proof code (re-check finding 5).
  const records = useRecords().filter((r) => HEX64.test(r.recordFingerprint) && !r.supersededBy);
  useEffect(() => {
    if (parsed.ok) saveIntake(parsed.request);
  }, [parsed]);

  if (!parsed.ok)
    return (
      <Frame>
        <ScreenHeading>{t('app.intake.err.title')}</ScreenHeading>
        <Alert severity="warning" variant="outlined" data-intake-refused="">
          {t(`app.intake.err.${parsed.problem}`)} {t('app.intake.err.help')}
        </Alert>
      </Frame>
    );
  const r = parsed.request;
  const host = hostOf(r);

  const startNew = () => {
    // Their reference and suggested name go into the form; a draft already started here keeps
    // what was typed, and only gains the reference if it has none.
    const had = loadDraft();
    // A strain (the last kind chosen here) gets the suggested name in its own form; the
    // partner's reference is a plant's "your reference" and has no strain field, so it stays
    // with the partner. The kind can still be changed on the form.
    const strain = !had && STRAIN_RECORDS_ENABLED && loadLogKind() === 'strain';
    saveDraft(
      had
        ? { ...had, refId: had.refId || (r.ref ?? '') }
        : strain
          ? {
              ...emptyDraft(),
              kind: 'strain',
              strain: { ...emptyStrainDraft(), name: r.name ?? '' },
              refId: r.ref ?? '',
            }
          : { ...emptyDraft(), strainName: r.name ?? '', refId: r.ref ?? '' },
    );
    void navigate('/new');
  };

  return (
    <Frame>
      <Box>
        <ScreenHeading>{t('app.intake.title', { host })}</ScreenHeading>
        <Typography variant="body1" sx={{ mt: 1 }}>
          {rich(t('app.intake.intro', { host }), { b: (c) => <b>{c}</b> })}
        </Typography>
        {oddHost(host) && (
          <Alert severity="warning" variant="outlined" sx={{ mt: 1 }}>
            {t('app.intake.oddHost', { host })}
          </Alert>
        )}
        {r.ref && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {t('app.intake.ref')}{' '}
            <Box component="code" sx={{ fontFamily: 'monospace', bgcolor: 'action.hover', px: 0.5 }}>
              {r.ref}
            </Box>
          </Typography>
        )}
      </Box>
      <Button variant="contained" size="large" fullWidth onClick={startNew} sx={{ py: 1.5 }} data-intake-new="">
        {t('app.intake.new')}
      </Button>
      {records.length > 0 && (
        <Box>
          <Typography variant="subtitle2" component="h2" sx={{ fontWeight: 700, mb: 1 }}>
            {t('app.intake.pick')}
          </Typography>
          <Stack spacing={1}>
            {records.map((rec) => (
              <Button
                key={rec.id}
                variant="outlined"
                fullWidth
                sx={{ justifyContent: 'flex-start', textTransform: 'none', minHeight: 48 }}
                onClick={() => {
                  allowRecord(rec.id);
                  void navigate(`/intake/send?record=${encodeURIComponent(rec.id)}`);
                }}
              >
                {rec.strainName || rec.id} · {rec.id}
              </Button>
            ))}
          </Stack>
        </Box>
      )}
      <Button color="inherit" onClick={() => leaveFor(returnUrl(r, 'declined'))} sx={{ alignSelf: 'flex-start' }}>
        {t('app.intake.back', { host })}
      </Button>
      <StayButton />
    </Frame>
  );
};

/** Drop the request and stay on VeilCore: nothing goes to the partner, and no later record is offered to them. */
const StayButton: React.FC<{ to?: string }> = ({ to = '/records' }) => {
  const { t } = useT();
  const navigate = useNavigate();
  return (
    <Button
      color="inherit"
      sx={{ alignSelf: 'flex-start' }}
      onClick={() => {
        clearIntake();
        void navigate(to);
      }}
    >
      {t('app.intake.stay')}
    </Button>
  );
};

/** /intake/send?record=…: what goes back, to whom, and the breeder's yes or no. */
export const IntakeSendPage: React.FC = () => {
  const [params] = useSearchParams();
  const { t } = useT();
  const [request] = useState<KeptIntake | undefined>(() => loadIntake());
  const id = params.get('record') ?? '';
  const record = useRecords().find((x) => x.id === id);
  const navigate = useNavigate();

  if (!request)
    return (
      <Frame>
        <ScreenHeading>{t('app.intake.err.title')}</ScreenHeading>
        <Alert severity="warning" variant="outlined">
          {t('app.intake.err.gone')}
        </Alert>
      </Frame>
    );
  const host = hostOf(request);
  // Only a record picked or finished for this request (re-check finding 2): the partner's page
  // can't link straight here with some other record already chosen.
  if (!request.allowed.includes(id))
    return (
      <Frame>
        <ScreenHeading>{t('app.intake.err.title')}</ScreenHeading>
        <Alert severity="warning" variant="outlined" data-intake-not-picked="">
          {t('app.intake.err.notPicked')}
        </Alert>
        <Button
          variant="outlined"
          onClick={() =>
            void navigate(
              '/intake?' + new URLSearchParams({ return: request.returnTo, state: request.state }).toString(),
            )
          }
        >
          {t('app.intake.pickAgain')}
        </Button>
        <StayButton />
      </Frame>
    );
  if (!record || !HEX64.test(record.recordFingerprint))
    return (
      <Frame>
        <ScreenHeading>{t('app.intake.send.title', { host })}</ScreenHeading>
        <Typography variant="body1">{t('app.intake.send.opening', { id })}</Typography>
        <StayButton />
      </Frame>
    );
  const checkLink = `${window.location.origin}${verifyPath(record.id, record.recordFingerprint)}`;
  return (
    <Frame>
      <Box>
        <ScreenHeading>{t('app.intake.send.title', { host })}</ScreenHeading>
        <Typography variant="body1" sx={{ mt: 1 }}>
          {/* No markup from the name: it may be text the partner suggested (re-check finding 3). */}
          {t('app.intake.send.what', { id: record.id, name: record.strainName || record.id })}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {t('app.intake.send.not')}
        </Typography>
      </Box>
      <Button
        variant="contained"
        size="large"
        fullWidth
        sx={{ py: 1.5 }}
        data-intake-send=""
        onClick={() =>
          leaveFor(returnUrl(request, { recordId: record.id, proofCode: record.recordFingerprint, checkLink }))
        }
      >
        {t('app.intake.send.button', { host })}
      </Button>
      <Button color="inherit" onClick={() => leaveFor(returnUrl(request, 'declined'))} sx={{ alignSelf: 'flex-start' }}>
        {t('app.intake.back', { host })}
      </Button>
      <StayButton to={`/record/${encodeURIComponent(record.id)}`} />
      <Typography variant="caption" color="text.secondary">
        {t('app.intake.send.kept')}
      </Typography>
    </Frame>
  );
};

/** On the log flow, while a partner is waiting: whom it's for. */
export const IntakeBanner: React.FC = () => {
  const { t } = useT();
  const [request, setRequest] = useState(() => loadIntake());
  if (!request) return null;
  return (
    <Alert
      severity="info"
      variant="outlined"
      sx={{ mb: 2 }}
      data-intake-banner=""
      action={
        <Button
          color="inherit"
          size="small"
          onClick={() => {
            clearIntake();
            setRequest(undefined);
          }}
        >
          {t('app.intake.stay')}
        </Button>
      }
    >
      {t('app.intake.banner', { host: hostOf(request) })}
    </Alert>
  );
};
