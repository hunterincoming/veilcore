// New phone or cleared browser: open the backup file, get everything back.
// Reads the one-file backup and the older files (backup.ts, restoreAny).
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useId, useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Collapse, Stack, TextField, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import DoneIcon from '@mui/icons-material/CheckCircle';
import { BackupNeedsPassword, restoreAny, type RestoreResult } from '../../veilcore/backup';
import { BackupPasswordAsk } from './BackupStep';
import { allRecords, hydrate, useSealedView } from '../../veilcore/records';
import { lockedWords } from '../LockedRecords';
import { restoredKeysLine } from '../stage/record-kinds';
import { holderKeyIfAny, setHolderKey } from '../../veilcore/holder';
import { AppHeader } from '../AppHeader';
import { FlowFrame, ScreenHeading } from './FlowFrame';
import { rich, useT } from '../../i18n/app';
import { enT, type Translator } from '../../i18n/translate';
import { backupMessageWords } from './backup-words';
import { SupportDetails } from '../SupportDetails';
import { PasskeyRestore } from './PasskeyCopy';
import { adoptRestoredCopy } from '../../veilcore/passkey-backup';

/** "2 lab deliveries and 1 lab code": what else the file brought back, or '' for nothing. */
export const labWork = (r: RestoreResult, tr: Translator = enT): string => {
  const deliveries = r.deliveries ? tr.tp('app.backup.nDeliveries', r.deliveries) : '';
  const codes = r.sentCodes ? tr.tp('app.backup.nCodes', r.sentCodes) : '';
  return deliveries && codes ? tr.t('app.backup.and', { a: deliveries, b: codes }) : deliveries || codes;
};

export const RestorePage: React.FC = () => {
  const pick = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<RestoreResult>();
  const [problem, setProblem] = useState<string>();
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState('');
  const keyBoxId = useId();
  const doneRef = useRef<HTMLHeadingElement>(null);
  const tr = useT();
  const { t } = tr;
  const { locked } = useSealedView();
  // The result replaces the screen: focus goes to what happened.
  useEffect(() => {
    if (done) doneRef.current?.focus();
  }, [done]);

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

  // A locked backup (a password on the file) waits here for its password; nothing changes until it opens.
  const [waiting, setWaiting] = useState<File>();
  // When the backup came from the passkey copy: the date it was saved, said on the result.
  const [fromPasskey, setFromPasskey] = useState<string>();
  const [found, setFound] = useState<{ file: File; savedAt: string }>();
  const restore = async (f: File, password?: string, passkeySavedAt?: string) => {
    setBusy(true);
    setProblem(undefined);
    try {
      const r = await restoreAny(f, password);
      setWaiting(undefined);
      if (passkeySavedAt) {
        adoptRestoredCopy(passkeySavedAt);
        setFromPasskey(passkeySavedAt);
      }
      await hydrate();
      setDone(r);
    } catch (e) {
      if (e instanceof BackupNeedsPassword) setWaiting(f);
      else setProblem(e instanceof Error ? e.message : String(e));
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
            <ScreenHeading>{t('app.backup.restoreTitle')}</ScreenHeading>
            <Typography variant="body1" color="text.secondary">
              {t('app.backup.restoreIntro')}
            </Typography>
          </Box>
          {done ? (
            <Stack spacing={2}>
              <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
                <DoneIcon color="success" sx={{ fontSize: 36 }} aria-hidden="true" />
                <Typography variant="h6" component="h2" tabIndex={-1} ref={doneRef}>
                  {done.records > 0 || done.holderKey === 'restored'
                    ? t('app.backup.plantsBack')
                    : done.labSignature || labWork(done, tr)
                      ? t('app.backup.restored')
                      : t('app.backup.nothingNew')}
                </Typography>
              </Stack>
              <Typography variant="body1" color="text.secondary">
                {done.records > 0
                  ? t('app.backup.sentence', {
                      s: restoredKeysLine(
                        done.recordIds ?? Array.from({ length: done.records }, () => ''),
                        allRecords(),
                        tr,
                      ),
                    })
                  : ''}
                {done.labSignature ? t('app.backup.labSigBack') : ''}
                {labWork(done, tr) ? t('app.backup.workRestored', { work: labWork(done, tr) }) : ''}
                {t('app.backup.worksLikeBefore')}
              </Typography>
              {fromPasskey && (
                <Typography variant="body2" color="text.secondary" data-from-passkey="">
                  {t('app.backup.passkey.from', { date: new Date(fromPasskey).toLocaleDateString() })}
                </Typography>
              )}
              {/* Records the file had no key for (an older file, or only the holder key) stay locked. */}
              {locked.length > 0 && (
                <Alert severity="warning" variant="outlined" data-still-locked="">
                  {done.vaultKey === 'none' ? t('app.sealed.backup.olderFile') : lockedWords(locked, tr)}
                </Alert>
              )}
              <Button component={RouterLink} to="/records" variant="contained" size="large" fullWidth sx={{ py: 1.5 }}>
                {t('app.backup.seeMyPlants')}
              </Button>
            </Stack>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary">
                {t('app.backup.lookIn')}
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
                {t('app.backup.openFile')}
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
              {/* The copy's date first, and nothing changes until they say so (attack pass 21 Oct, finding 6). */}
              {found ? (
                <Alert severity="info" variant="outlined" data-passkey-found="">
                  {t('app.backup.passkey.found', { date: new Date(found.savedAt).toLocaleString() })}
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Button
                      variant="contained"
                      disabled={busy}
                      onClick={() => {
                        const f = found;
                        setFound(undefined);
                        void restore(f.file, undefined, f.savedAt);
                      }}
                    >
                      {t('app.backup.passkey.restoreIt')}
                    </Button>
                    <Button color="inherit" onClick={() => setFound(undefined)}>
                      {t('app.backup.passkey.notThis')}
                    </Button>
                  </Stack>
                </Alert>
              ) : (
                <PasskeyRestore
                  busy={busy}
                  onFile={(file, savedAt) => {
                    setProblem(undefined);
                    setFound({ file, savedAt });
                  }}
                  onProblem={setProblem}
                />
              )}
              {waiting && <BackupPasswordAsk busy={busy} onOpen={(password) => void restore(waiting, password)} />}
              {problem && (
                <Alert severity="warning" variant="outlined">
                  {backupMessageWords(problem, tr)}
                  <SupportDetails step="restore from backup" error={backupMessageWords(problem)} />
                </Alert>
              )}
              <Box>
                <Button
                  color="inherit"
                  onClick={() => setTyping(!typing)}
                  aria-expanded={typing}
                  aria-controls={keyBoxId}
                  sx={{ minHeight: 44, px: 0 }}
                >
                  {t('app.backup.onlyKey')}
                </Button>
                <Collapse in={typing} id={keyBoxId}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ pt: 1 }}>
                    <TextField
                      label={t('app.backup.keyLabel')}
                      value={typed}
                      onChange={(e) => setTyped(e.target.value)}
                      fullWidth
                      slotProps={{
                        htmlInput: { style: { fontFamily: 'monospace' }, autoCapitalize: 'none', spellCheck: false },
                      }}
                    />
                    <Button
                      variant="outlined"
                      onClick={() => void applyTypedKey()}
                      disabled={!typed.trim()}
                      sx={{ minHeight: 48 }}
                    >
                      {t('app.backup.useIt')}
                    </Button>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {t('app.backup.olderVersion')}
                  </Typography>
                </Collapse>
              </Box>
              <Alert severity="info" variant="outlined">
                {rich(t('app.backup.cantFind'), { b: (c) => <b>{c}</b> })}
              </Alert>
            </>
          )}
        </Stack>
      </FlowFrame>
    </Box>
  );
};
