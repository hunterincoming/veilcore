// What a record's page says about where its record stands beyond the record itself (round 3):
//   - it is kept in this browser and not saved on VeilCore yet (L1, L12): why, and what to do;
//   - before records were locked it shared things the app won't share again without asking
//     (P2): share them again, or not;
//   - VeilCore's server shows a different sharing choice than the one kept with the record
//     (P3, the deploy window): open the share screen to choose.
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import { Alert, Button, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  confirmGrant,
  discardUnsaved,
  RECORDS_KEY,
  unsavedReason,
  useRecords,
  type StrainRecord,
} from '../veilcore/records';
import { rowStateOf } from '../veilcore/api-store';
import { labelOf, useGrantDifference } from '../veilcore/disclosure';
import { useVaultNeedsBackup } from '../veilcore/vault';
import { useRecordT } from '../i18n/app';
import { enT } from '../i18n/translate';
import { SupportDetails } from './SupportDetails';

export const RecordSaveNotices: React.FC<{ record: StrainRecord; onShare?: () => void }> = ({ record, onShare }) => {
  useRecords();
  useVaultNeedsBackup();
  const tr = useRecordT(record);
  const { t } = tr;
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string>();
  const unsaved = unsavedReason(record.id);
  const differs = useGrantDifference(record.id);
  const ask = record.grantToConfirm ?? [];
  const isNew = rowStateOf(RECORDS_KEY, record.id) === undefined;

  const answer = async (share: boolean) => {
    setBusy(true);
    setProblem(undefined);
    const out = await confirmGrant(record.id, share);
    setBusy(false);
    if ('error' in out) setProblem(t('app.sealed.grantAsk.failed', { error: out.error }));
  };

  const letGo = async () => {
    if (!window.confirm(t('app.sealed.unsaved.discardConfirm'))) return;
    await discardUnsaved(record.id);
    if (isNew) void navigate('/records');
  };

  if (!unsaved && !ask.length && !differs) return null;
  return (
    <Stack spacing={1.5} sx={{ mb: 2 }}>
      {unsaved && (
        <Alert
          severity="warning"
          variant="outlined"
          data-unsaved={unsaved}
          action={
            unsaved === 'backup' ? (
              <Button
                color="inherit"
                variant="outlined"
                onClick={() => void navigate('/backup')}
                sx={{ minHeight: 44 }}
              >
                {t('app.home.saveIt')}
              </Button>
            ) : (
              <Button color="inherit" onClick={() => void letGo()} sx={{ minHeight: 44 }}>
                {t(isNew ? 'app.sealed.unsaved.discardNew' : 'app.sealed.unsaved.discardChange')}
              </Button>
            )
          }
        >
          {t(`app.sealed.unsaved.${unsaved}`)}
          {/* Waiting for the backup is not a failure; the other two are. */}
          {unsaved !== 'backup' && (
            <SupportDetails step="save to VeilCore" error={enT.t(`app.sealed.unsaved.${unsaved}`)} />
          )}
        </Alert>
      )}
      {ask.length > 0 && (
        <Alert severity="info" variant="outlined" data-grant-ask="">
          <Typography variant="body2" sx={{ mb: 1 }}>
            {t('app.sealed.grantAsk.text', {
              keys: ask.map((k) => labelOf(k, tr)).join(t('app.prove.share.semicolon')),
            })}
          </Typography>
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
            <Button variant="outlined" disabled={busy} onClick={() => void answer(true)} sx={{ minHeight: 44 }}>
              {t('app.sealed.grantAsk.yes')}
            </Button>
            <Button disabled={busy} onClick={() => void answer(false)} sx={{ minHeight: 44 }}>
              {t('app.sealed.grantAsk.no')}
            </Button>
          </Stack>
          {problem && (
            <Typography variant="body2" sx={{ mt: 1 }} role="status">
              {problem}
            </Typography>
          )}
        </Alert>
      )}
      {differs && (
        <Alert
          severity="warning"
          variant="outlined"
          data-grant-differs=""
          action={
            onShare && (
              <Button color="inherit" variant="outlined" onClick={onShare} sx={{ minHeight: 44 }}>
                {t('app.sealed.grantDiffers.open')}
              </Button>
            )
          }
        >
          {t('app.sealed.grantDiffers.text')}
        </Alert>
      )}
    </Stack>
  );
};
