// Step 4 — Check a report matches a record. The holder picks a lab report file; it is
// fingerprinted in this browser and compared with the report fingerprints paired to the
// records this browser holds. Nothing is sent anywhere, so the result is for the holder:
// nobody else sees it or can verify it from here. It shows possession of a matching
// file, nothing about ownership, and it is not a proof a third party can check. A third
// party checks a record on the verify page, and its date once the record is anchored.
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import FactCheckIcon from '@mui/icons-material/FactCheckOutlined';
import GppBadIcon from '@mui/icons-material/GppBadOutlined';
import { fingerprintFile } from '../../veilcore/commitment';
import { findByDnaFingerprint } from '../../veilcore/records';
import { Dropzone } from './Dropzone';
import { FingerprintReveal } from './FingerprintReveal';
import { isTouch } from '../flow/FlowFrame';
import { useT } from '../../i18n/app';

export const Step4CheckReport: React.FC<{ onBack: () => void; onRestart: () => void; onDone?: () => void }> = ({
  onBack,
  onRestart,
  onDone,
}) => {
  const { t } = useT();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; name?: string; id?: string; fingerprint?: string }>();
  const [error, setError] = useState<string>();

  const onCheck = async () => {
    if (!file) return;
    setBusy(true);
    setError(undefined);
    setResult(undefined);
    try {
      const reportHex = await fingerprintFile(file);
      const match = findByDnaFingerprint(reportHex);
      setResult({ ok: !!match, name: match?.strainName, id: match?.id, fingerprint: reportHex });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h5" component="h2" tabIndex={-1} data-screen-heading="" sx={{ mb: 0.5 }}>
          {t('app.plant.check.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('app.plant.check.intro')}
        </Typography>
      </Box>

      <Alert icon={<FactCheckIcon />} severity="info" variant="outlined">
        {t('app.plant.check.forYou')}
      </Alert>

      {!result?.ok && (
        <Dropzone
          file={file}
          onFile={setFile}
          title={isTouch() ? t('app.plant.check.tap') : t('app.plant.check.drag')}
          hint={t('app.plant.check.hint')}
        />
      )}

      {error && (
        <Alert severity="error" variant="outlined">
          {error}
        </Alert>
      )}

      {result && !result.ok && (
        <Alert icon={<GppBadIcon />} severity="error" variant="outlined">
          {t('app.plant.check.none')}
        </Alert>
      )}

      {result?.ok && (
        <Stack spacing={2}>
          <FingerprintReveal
            fingerprint={result.fingerprint ?? ''}
            headline={t('app.plant.check.found')}
            sub={t('app.plant.check.foundSub')}
          />
          <Alert severity="success" variant="outlined">
            <Typography variant="subtitle2">{t('app.plant.check.matches', { name: result.name ?? '' })}</Typography>
            <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
              {t('app.plant.check.meaning', { id: result.id ?? '' })}
            </Typography>
          </Alert>
        </Stack>
      )}

      <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
        <Button variant="text" onClick={onBack}>
          {t('app.common.back')}
        </Button>
        {!result?.ok ? (
          <Button
            variant="contained"
            size="large"
            disabled={busy || !file}
            startIcon={busy ? <CircularProgress size={18} color="inherit" /> : undefined}
            onClick={onCheck}
          >
            {busy ? t('app.plant.check.checking') : t('app.plant.check.checkIt')}
          </Button>
        ) : onDone ? (
          <Button variant="contained" onClick={onDone}>
            {t('app.home.continue')}
          </Button>
        ) : (
          <Button variant="contained" onClick={onRestart}>
            {t('app.prove.done')}
          </Button>
        )}
      </Stack>
    </Stack>
  );
};
