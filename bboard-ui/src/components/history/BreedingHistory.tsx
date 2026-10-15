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
import { getRecord, type StrainRecord } from '../../veilcore/records';
import { downloadBreedingHistory } from '../../veilcore/breeding-history/export';
import { walkHistory, MAX_HISTORY_RECORDS } from '../../veilcore/breeding-history/walk';

export const BREEDING_HISTORY_LABEL = 'Breeding history (draft)';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export const BreedingHistory: React.FC<{ record: StrainRecord }> = ({ record }) => {
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
      const out = await downloadBreedingHistory(record, { lookup: getRecord });
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
          {BREEDING_HISTORY_LABEL}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          This plant and the parents linked to it that you hold here, one row per record, with each record’s date stamp
          and evidence bundle. A draft to copy from for a variety application. Not legal advice.
        </Typography>
        <Box>
          <Button
            size="small"
            variant="outlined"
            startIcon={<DownloadIcon />}
            disabled={!sealed}
            onClick={() => setOpen(true)}
          >
            {BREEDING_HISTORY_LABEL}
          </Button>
        </Box>
      </Stack>
      <Dialog open={open} onClose={close} fullWidth maxWidth="sm" aria-labelledby="breeding-history-title">
        <DialogTitle id="breeding-history-title">{BREEDING_HISTORY_LABEL}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5}>
            <Alert severity="info" variant="outlined" role="note">
              A record dates nothing earlier than the day it was sealed. Each step sealed when it happened carries its
              own date; a history typed up the week you apply is worth what any typed-up history is worth.
            </Alert>
            <Typography variant="body2">
              One file with a printable breeding history (the family line, then one row per record: the date you gave,
              its date stamp, the stage and what you selected for, how it was made), set out under plain headings for a
              US PVP application, a UPOV-style questionnaire and a Japanese application. Boxes for what VeilCore doesn’t
              hold (uniformity, stability, variants) are left blank for you. A one-page cover note says what it shows
              and what it doesn’t, and each record’s evidence bundle is inside.
            </Typography>
            {summary && (
              <Typography variant="body2" color="text.secondary">
                {plural(summary.nodes.length, 'record you hold here', 'records you hold here')}
                {theirs
                  ? `, ${plural(theirs, 'linked parent', 'linked parents')} held by someone else (listed as theirs)`
                  : ''}
                {named ? `, ${plural(named, 'parent', 'parents')} named with no record` : ''}
                {leftOut
                  ? `, ${plural(leftOut, 'record', 'records')} left out (it takes the nearest ${MAX_HISTORY_RECORDS})`
                  : ''}
                .
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary">
              Your records’ keys and lab report files are not put in. VeilCore doesn’t vouch for anything a record says.
              Draft. Not legal advice.
            </Typography>
            {error && (
              <Alert severity="error" variant="outlined">
                {error}
              </Alert>
            )}
            {done && (
              <Alert severity="success" variant="outlined">
                Downloaded {done}. Open COVER-NOTE.html inside it first, then breeding-history.html to print.
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={close}>Close</Button>
          <Button
            variant="contained"
            disableElevation
            startIcon={<DownloadIcon />}
            disabled={busy || !sealed}
            onClick={() => void download()}
          >
            {busy ? 'Making it…' : 'Download'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
