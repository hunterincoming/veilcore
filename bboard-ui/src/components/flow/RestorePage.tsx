// New phone or cleared browser: open the backup file, get everything back.
// Reads the one-file backup and the older files (backup.ts, restoreAny).
// SPDX-License-Identifier: Apache-2.0

import React, { useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Collapse, Stack, TextField, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import DoneIcon from '@mui/icons-material/CheckCircle';
import { restoreAny, type RestoreResult } from '../../veilcore/backup';
import { hydrate } from '../../veilcore/records';
import { holderKeyIfAny, setHolderKey } from '../../veilcore/holder';
import { AppHeader } from '../AppHeader';
import { FlowFrame } from './FlowFrame';

export const RestorePage: React.FC = () => {
  const pick = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<RestoreResult>();
  const [problem, setProblem] = useState<string>();
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState('');

  const applyTypedKey = async () => {
    setProblem(undefined);
    try {
      const current = holderKeyIfAny();
      if (current && current.toLowerCase() !== typed.trim().toLowerCase()) {
        throw new Error('This browser is already using a different set of records. Nothing was changed.');
      }
      if (!current) setHolderKey(typed);
      await hydrate();
      setDone({ records: 0, holderKey: current ? 'already' : 'restored', labSignature: false });
    } catch (e) {
      setProblem(e instanceof Error ? e.message : String(e));
    }
  };

  const restore = async (f: File) => {
    setBusy(true);
    setProblem(undefined);
    try {
      const r = await restoreAny(f);
      await hydrate();
      setDone(r);
    } catch (e) {
      setProblem(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box>
      <AppHeader />
      <FlowFrame section="log">
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="h4" component="h1" sx={{ fontSize: { xs: '1.8rem', md: '2.2rem' } }}>
              Get your plants back
            </Typography>
            <Typography variant="body1" color="text.secondary">
              New phone or computer, or cleared your browser? Open the backup file you saved.
            </Typography>
          </Box>
          {done ? (
            <Stack spacing={2}>
              <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
                <DoneIcon color="primary" sx={{ fontSize: 36 }} />
                <Typography variant="h6">
                  {done.records > 0 || done.holderKey === 'restored'
                    ? 'Your plants are back.'
                    : 'Nothing new in that file.'}
                </Typography>
              </Stack>
              <Typography variant="body1" color="text.secondary">
                {done.records > 0 ? `Keys for ${done.records} plant${done.records === 1 ? '' : 's'} restored. ` : ''}
                {done.labSignature ? "Your lab's signature is back too. " : ''}
                Everything works like before.
              </Typography>
              <Button component={RouterLink} to="/records" variant="contained" size="large" fullWidth sx={{ py: 1.5 }}>
                See my plants
              </Button>
            </Stack>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary">
                Look in your email, Drive or iCloud, or on your USB stick. Any file name is fine. Nothing is uploaded.
              </Typography>
              <Button
                variant="contained"
                size="large"
                fullWidth
                disabled={busy}
                onClick={() => pick.current?.click()}
                startIcon={busy ? <CircularProgress size={18} color="inherit" /> : undefined}
                sx={{ py: 1.5 }}
              >
                Open my backup file
              </Button>
              <input
                ref={pick}
                type="file"
                accept="application/json,.json,text/plain,.txt"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (f) void restore(f);
                }}
              />
              {problem && (
                <Alert severity="warning" variant="outlined">
                  {problem}
                </Alert>
              )}
              <Box>
                <Button color="inherit" onClick={() => setTyping(!typing)} sx={{ minHeight: 44, px: 0 }}>
                  Only have your holder key written down?
                </Button>
                <Collapse in={typing}>
                  <Stack direction="row" spacing={1} sx={{ pt: 1 }}>
                    <TextField
                      label="Holder key (64 characters)"
                      value={typed}
                      onChange={(e) => setTyped(e.target.value)}
                      fullWidth
                      slotProps={{ htmlInput: { style: { fontFamily: 'monospace' } } }}
                    />
                    <Button variant="outlined" onClick={() => void applyTypedKey()} disabled={!typed.trim()}>
                      Use it
                    </Button>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    That brings back your records. A plant&apos;s date-stamp keys are only in the backup file.
                  </Typography>
                </Collapse>
              </Box>
              <Alert severity="info" variant="outlined">
                <b>Can&apos;t find the file?</b> Then nobody can bring the plants back, us included: we never had your
                key. That&apos;s what keeps them yours. If your old device still works, open VeilCore there and save a
                new backup.
              </Alert>
            </>
          )}
        </Stack>
      </FlowFrame>
    </Box>
  );
};
