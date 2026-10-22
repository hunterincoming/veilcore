// The passkey copy of the backup (veilcore/passkey-backup.ts): made and kept up to date from
// the backup screen, opened from the restore screen. Offered beside the file, never instead of
// it: a deleted passkey takes its copy's key with it.
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import DoneIcon from '@mui/icons-material/CheckCircle';
import {
  deletePasskeyCopy,
  fetchPasskeyCopy,
  makePasskeyCopy,
  passkeyCopySavedAt,
  passkeyCopyState,
  passkeysAvailable,
  updatePasskeyCopy,
} from '../../veilcore/passkey-backup';
import { PASSKEY_BACKUP } from '../../config/copy';
import { hydrate } from '../../veilcore/records';
import { useT } from '../../i18n/app';
import { backupMessageWords } from './backup-words';

const dateOf = (iso: string | undefined) => (iso ? new Date(iso).toLocaleDateString() : '');

/** On the backup screen: make the copy, or bring it up to date. */
export const PasskeyCopyMaker: React.FC = () => {
  const tr = useT();
  const { t } = tr;
  const [state, setState] = useState(() => (PASSKEY_BACKUP ? passkeyCopyState() : 'none'));
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string>();
  const [removed, setRemoved] = useState(false);
  if (!PASSKEY_BACKUP || !passkeysAvailable()) return null;

  const run = async (f: () => Promise<{ ok: boolean; reason?: string } | void>) => {
    setBusy(true);
    setProblem(undefined);
    setRemoved(false);
    try {
      const r = await f();
      if (r && !r.ok && r.reason) setProblem(r.reason);
    } catch (e) {
      setProblem(e instanceof Error ? e.message : String(e));
    } finally {
      // A save may have merged in another device's newer copy first.
      await hydrate().catch(() => undefined);
      setBusy(false);
      setState(passkeyCopyState());
    }
  };

  return (
    <Box data-passkey-copy="" sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
      <Typography variant="subtitle2" component="p" sx={{ fontWeight: 700 }}>
        {t('app.backup.passkey.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        {t('app.backup.passkey.why')}
      </Typography>
      <Typography variant="body2" sx={{ mt: 0.5 }}>
        {t('app.backup.passkey.keepFile')}
      </Typography>
      <Box role="status" sx={{ mt: 1.25 }}>
        {state === 'current' && (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <DoneIcon color="success" fontSize="small" aria-hidden="true" />
            <Typography variant="body2">
              {t('app.backup.passkey.current', { date: dateOf(passkeyCopySavedAt()) })}
            </Typography>
          </Stack>
        )}
        {state === 'behind' && (
          <Typography variant="body2">
            {t('app.backup.passkey.behind', { date: dateOf(passkeyCopySavedAt()) })}
          </Typography>
        )}
        {removed && <Typography variant="body2">{t('app.backup.passkey.removed')}</Typography>}
      </Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1.25 }}>
        {state !== 'current' && (
          <Button
            variant="outlined"
            size="large"
            fullWidth
            disabled={busy}
            onClick={() => void run(state === 'none' ? makePasskeyCopy : updatePasskeyCopy)}
            startIcon={busy ? <CircularProgress size={18} color="inherit" /> : undefined}
            sx={{ py: 1.3 }}
          >
            {state === 'none' ? t('app.backup.passkey.make') : t('app.backup.passkey.update')}
          </Button>
        )}
        {state !== 'none' && (
          <Button
            color="inherit"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await deletePasskeyCopy();
                setRemoved(true);
              })
            }
            sx={{ minHeight: 44 }}
          >
            {t('app.backup.passkey.remove')}
          </Button>
        )}
      </Stack>
      {problem && (
        <Alert severity="warning" variant="outlined" sx={{ mt: 1.25 }}>
          {backupMessageWords(problem, tr)}
        </Alert>
      )}
    </Box>
  );
};

/** On the restore screen: get the copy with any of this site's passkeys. */
export const PasskeyRestore: React.FC<{
  busy: boolean;
  onFile: (file: File, savedAt: string) => void;
  onProblem: (message: string) => void;
}> = ({ busy, onFile, onProblem }) => {
  const { t } = useT();
  const [asking, setAsking] = useState(false);
  if (!PASSKEY_BACKUP || !passkeysAvailable()) return null;
  return (
    <Stack spacing={0.75} data-passkey-restore="">
      <Button
        variant="outlined"
        size="large"
        fullWidth
        disabled={busy || asking}
        onClick={() => {
          setAsking(true);
          fetchPasskeyCopy()
            .then((got) => onFile(got.file, got.savedAt))
            .catch((e: unknown) => onProblem(e instanceof Error ? e.message : String(e)))
            .finally(() => setAsking(false));
        }}
        startIcon={asking ? <CircularProgress size={18} color="inherit" /> : undefined}
        sx={{ py: 1.5 }}
      >
        {t('app.backup.passkey.restore')}
      </Button>
      <Typography variant="caption" color="text.secondary">
        {t('app.backup.passkey.restoreHint')}
      </Typography>
    </Stack>
  );
};
