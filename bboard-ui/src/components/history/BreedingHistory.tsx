// "Breeding history (draft)": from this record and its linked ancestors held in this browser,
// one .zip with a printable breeding history under three plain headings, a one-page cover
// note, and each record's evidence bundle (veilcore/breeding-history/export.ts).
// SPDX-License-Identifier: Apache-2.0

import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/FileDownloadOutlined';
import { allRecords, getRecord, type StrainRecord } from '../../veilcore/records';
import { datedReportsOf } from '../stage/lab-report-notes';
import { downloadBreedingHistory } from '../../veilcore/breeding-history/export';
import { walkHistory, MAX_HISTORY_RECORDS } from '../../veilcore/breeding-history/walk';
import { InEnglishNote, useT } from '../../i18n/app';

/** The label's English (app.history.label): the files it makes stay in English. */
export const BREEDING_HISTORY_LABEL = 'Breeding history (draft)';

export const BreedingHistory: React.FC<{ record: StrainRecord }> = ({ record }) => {
  const { t, tp } = useT();
  const label = t('app.history.label');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const sealed = !!record.recordFingerprint && !!record.nonce;

  const summary = useMemo(() => (open ? walkHistory(record, getRecord) : null), [open, record]);
  const theirs = summary?.outside.filter((o) => o.kind === 'theirs').length ?? 0;
  const named = summary?.outside.filter((o) => o.kind === 'named').length ?? 0;
  const leftOut = summary?.outside.filter((o) => o.kind === 'left-out').length ?? 0;

  const close = () => {
    setOpen(false);
    setError(null);
    setDone(null);
  };

  const download = async () => {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const out = await downloadBreedingHistory(record, {
        lookup: getRecord,
        labDatingsOf: (id) => datedReportsOf(id, allRecords()),
      });
      if ('error' in out) setError(out.error);
      else setDone(out.name);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Stack spacing={1}>
        <Typography variant="overline" sx={{ display: 'block' }}>
          {label}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('app.history.intro')}
        </Typography>
        <Box>
          <Button
            size="small"
            variant="outlined"
            startIcon={<DownloadIcon />}
            disabled={!sealed}
            onClick={() => setOpen(true)}
          >
            {label}
          </Button>
        </Box>
      </Stack>
      <Dialog open={open} onClose={close} fullWidth maxWidth="sm" aria-labelledby="breeding-history-title">
        <DialogTitle id="breeding-history-title">{label}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5}>
            <Alert severity="info" variant="outlined" role="note">
              {t('app.history.notEarlier')}
            </Alert>
            <Typography variant="body2">
              {t('app.history.oneFile')}
              <InEnglishNote />
            </Typography>
            {summary && (
              <Typography variant="body2" color="text.secondary">
                {tp('app.history.held', summary.nodes.length)}
                {theirs ? tp('app.history.theirs', theirs) : ''}
                {named ? tp('app.history.named', named) : ''}
                {leftOut ? tp('app.history.leftOut', leftOut, { max: MAX_HISTORY_RECORDS }) : ''}
                {t('app.history.end')}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary">
              {t('app.history.notPut')}
            </Typography>
            {error && (
              <Alert severity="error" variant="outlined">
                {error}
              </Alert>
            )}
            {done && (
              <Alert severity="success" variant="outlined">
                {t('app.history.downloaded', { name: done })}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={close}>{t('app.common.close')}</Button>
          <Button
            variant="contained"
            disableElevation
            startIcon={<DownloadIcon />}
            disabled={busy || !sealed}
            onClick={() => void download()}
          >
            {busy ? t('app.plant.bundle.making') : t('app.plant.bundle.downloadButton')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
