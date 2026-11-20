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
  deleteRecord,
  discardUnsaved,
  letGoNow,
  letGoOf,
  proofCodeSent,
  unsavedReason,
  useRecords,
  type StrainRecord,
} from '../veilcore/records';
import { dateForDelete } from '../veilcore/proofs';
import { DELETE_WHY, deleteDateKey } from './delete-words';
import { labelOf, useGrantDifference } from '../veilcore/disclosure';
import { useVaultNeedsBackup } from '../veilcore/vault';
import { useRecordT } from '../i18n/app';
import { enT } from '../i18n/translate';
import { SupportDetails } from './SupportDetails';
import { sealedHereWords } from './offline/offline-words';
import { useOfflineState } from '../offline/register';

export const RecordSaveNotices: React.FC<{ record: StrainRecord; onShare?: () => void }> = ({ record, onShare }) => {
  useRecords();
  useVaultNeedsBackup();
  const tr = useRecordT(record);
  const { t } = tr;
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string>();
  const unsaved = unsavedReason(record.id);
  const { online } = useOfflineState();
  const differs = useGrantDifference(record.id);
  const ask = record.grantToConfirm ?? [];
  // The button's label only (records.ts letGoOf): VeilCore's earlier copy shown again ('undo'),
  // or delete. What actually happens is worked out again on click (letGoNow).
  const label = letGoOf(record.id);
  const [letGoProblem, setLetGoProblem] = useState<string>();

  const answer = async (share: boolean) => {
    setBusy(true);
    setProblem(undefined);
    const out = await confirmGrant(record.id, share);
    setBusy(false);
    if ('error' in out) setProblem(t('app.sealed.grantAsk.failed', { error: out.error }));
  };

  const letGo = async () => {
    setLetGoProblem(undefined);
    setBusy(true);
    const how = await letGoNow(record.id);
    setBusy(false);
    if (how === 'busy') return setLetGoProblem(t('app.sealed.unsaved.letGoBusy'));
    if (how === 'unknown') return setLetGoProblem(t('app.sealed.unsaved.letGoUnknown'));
    if (how === 'delete') {
      // Its proof code reached VeilCore: deleted the way the delete panel deletes, its date read
      // fresh and said first, because once its keys go nobody can prove what that code dated.
      const now = await dateForDelete(record.recordFingerprint);
      const loss = now === 'none' ? '' : `\n\n${t('app.sealed.unsaved.deleteDatedLoss')}`;
      const ask = `${t('app.sealed.unsaved.deleteConfirm', { name: record.strainName || record.id })}\n\n${t(deleteDateKey(now, record.copy === true && !!record.labSignature))}${loss}`;
      if (!window.confirm(ask)) return;
      setBusy(true);
      const out = await deleteRecord(record.id);
      setBusy(false);
      if ('error' in out) setLetGoProblem(t('app.plant.delete.failed', { reason: t(DELETE_WHY[out.error]) }));
      else void navigate('/records');
      return;
    }
    if (!window.confirm(t(how === 'undo' ? 'app.sealed.unsaved.undoConfirm' : 'app.sealed.unsaved.discardConfirm')))
      return;
    setBusy(true);
    const out = await discardUnsaved(record.id, how);
    setBusy(false);
    if (out === 'busy') setLetGoProblem(t('app.sealed.unsaved.letGoBusy'));
    else if (out === 'unknown') setLetGoProblem(t('app.sealed.unsaved.letGoUnknown'));
    else if (out === 'reload-failed') setLetGoProblem(t('app.sealed.unsaved.undoReloadFailed'));
    else if (out === 'changed') setLetGoProblem(t('app.sealed.unsaved.letGoChanged'));
    else if (how === 'discard') void navigate('/records');
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
              <Button color="inherit" disabled={busy} onClick={() => void letGo()} sx={{ minHeight: 44 }}>
                {t(label === 'undo' ? 'app.sealed.unsaved.discardChange' : 'app.sealed.unsaved.discardNew')}
              </Button>
            )
          }
        >
          {/* Sealed with no signal (docs/offline.md): when, by this device's clock, and that the
              date comes when it is sent. Never a date before then. */}
          {!proofCodeSent(record.id) && record.loggedAt > 0 && (
            <Typography variant="body2" sx={{ mb: 0.75, fontWeight: 700 }} data-sealed-here="">
              {sealedHereWords(record.loggedAt, tr)}
              {!online && ` ${t('app.offline.goesBySelf')}`}
            </Typography>
          )}
          {t(`app.sealed.unsaved.${unsaved}`)}
          {letGoProblem && (
            <Typography variant="body2" sx={{ mt: 1 }} role="status" data-let-go-problem="">
              {letGoProblem}
            </Typography>
          )}
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
