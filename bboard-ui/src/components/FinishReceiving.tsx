// "Finish receiving" for a received record that is still the claim's stub (CONTRACT.md #22):
// the tab was closed after the claim, the save was refused, or the sender's details didn't
// open. The code kept in this browser (or pasted again) opens the sender's sealed offer,
// fetched again from the registry, and the record is sealed and saved as the claim would
// have done.
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import { Alert, Button, Stack, TextField, Typography } from '@mui/material';
import type { StrainRecord } from '../veilcore/records';
import { finishReceiving, isUnfinishedReceipt, keptCodeFor } from '../veilcore/receive';
import { labErrorWords } from '../veilcore/transfers';
import { useT } from '../i18n/app';

export const FinishReceiving: React.FC<{ record: StrainRecord }> = ({ record }) => {
  const tr = useT();
  const { t } = tr;
  const [code, setCode] = useState(() => keptCodeFor(record) ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  if (!isUnfinishedReceipt(record)) return null;
  const finish = async () => {
    if (!code.trim() || busy) return;
    setBusy(true);
    setError(undefined);
    try {
      const out = await finishReceiving(record.id, code, undefined, tr);
      if ('error' in out) setError(labErrorWords(out.error, tr));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Alert severity="warning" variant="outlined" sx={{ mb: 2 }} data-finish-receiving="">
      <Stack spacing={1.25}>
        <Typography variant="subtitle2" component="h2">
          {t('app.sealed.recv.finishTitle')}
        </Typography>
        <Typography variant="body2">{t('app.sealed.recv.finishText')}</Typography>
        <TextField
          label={t('app.lab.recv.codeLabel')}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          size="small"
          fullWidth
          slotProps={{ htmlInput: { style: { fontFamily: 'monospace' } } }}
        />
        <Button
          variant="contained"
          onClick={() => void finish()}
          disabled={busy || !code.trim()}
          sx={{ alignSelf: 'flex-start', minHeight: 44 }}
        >
          {busy ? t('app.sealed.recv.finishing') : t('app.sealed.recv.finish')}
        </Button>
        {error && <Typography variant="body2">{error}</Typography>}
      </Stack>
    </Alert>
  );
};
