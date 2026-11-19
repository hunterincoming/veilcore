// New phone or cleared browser: get everything back.
//
// First, Face ID: the records saved with VeilCore (veilcore/account-copy.ts), found with any of
// this site's passkeys, their date shown before anything changes, then "Welcome back. N records
// are here." and, for documents kept on the person's other device only, where they are. "Other
// ways" holds the backup file (backup.ts restoreAny, which also reads the older files) and the
// typed holder key, as before.
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
import { accountCopyOn, adoptFound, findAccountCopy, markBroughtBack, type Found } from '../../veilcore/account-copy';
import { PASSKEY_WORDS } from '../../veilcore/passkey-backup';
import { oldPasskeysHaveOtherName } from '../../veilcore/passkey-backup';
import { deviceWords, unlockWordFor } from './KeepSafe';
import { deviceUnlockAvailable } from '../../veilcore/passkey-backup';
import type { AppKey } from '../../i18n/app/en';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

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
  // When the records came from the copy saved with VeilCore: what it said, for the result.
  const [fromAccount, setFromAccount] = useState<Found>();
  const [found, setFound] = useState<Found>();
  const [asking, setAsking] = useState(false);
  const [others, setOthers] = useState(false);
  const [deviceUnlock, setDeviceUnlock] = useState<boolean>();
  const account = accountCopyOn();
  useEffect(() => {
    let on = true;
    void deviceUnlockAvailable().then((v) => on && setDeviceUnlock(v));
    return () => {
      on = false;
    };
  }, []);
  // On a computer that isn't a Mac, the passkey is most often on the person's phone: the button
  // says "Use a passkey" and the browser offers "Use a phone" (first-time-user pass on step 2).
  const ua = navigator.userAgent;
  const appleOrAndroid = /iPhone|iPad|iPod|Macintosh|Mac OS X|Android/.test(ua);
  const word = appleOrAndroid ? unlockWordFor(ua, deviceUnlock === true) : 'passkey';
  const find = (hostName = false) => {
    setAsking(true);
    setProblem(undefined);
    findAccountCopy({ hostName })
      .then(setFound)
      .catch((e: unknown) => setProblem(e instanceof Error ? e.message : String(e)))
      .finally(() => setAsking(false));
  };
  // This device couldn't start saving after the records came back (review New-9): said, with Try again.
  const [adoptProblem, setAdoptProblem] = useState<string>();
  const adopt = async () => {
    setAdoptProblem(undefined);
    try {
      await adoptFound();
    } catch (e) {
      setAdoptProblem(e instanceof Error ? e.message : String(e));
    }
  };
  const restore = async (f: File, password?: string, fromCopy?: Found, all = false) => {
    setBusy(true);
    setProblem(undefined);
    try {
      // The copy saved with VeilCore isn't a backup file: restoring marks nothing by itself;
      // its own check marks what it holds once this browser keeps it (adoptFound).
      const r = await restoreAny(f, password, fromCopy ? (all ? fromCopy.restoreAll : fromCopy.restore) : {});
      setWaiting(undefined);
      if (fromCopy) {
        // "Bring them anyway": listed as restored, so the copy keeps them from now on (New-5).
        if (all) markBroughtBack(fromCopy.deleted);
        await adopt();
        setFromAccount(fromCopy);
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
              {account ? t('app.account.restore.lead') : t('app.backup.restoreIntro')}
            </Typography>
          </Box>
          {done ? (
            <Stack spacing={2}>
              <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
                <DoneIcon color="success" sx={{ fontSize: 36 }} aria-hidden="true" />
                <Typography
                  variant="h6"
                  component="h2"
                  tabIndex={-1}
                  ref={doneRef}
                  data-restore-done={fromAccount ? 'account' : 'file'}
                >
                  {fromAccount
                    ? tr.tp('app.account.restore.welcome', allRecords().length)
                    : done.records > 0 || done.holderKey === 'restored'
                      ? t('app.backup.plantsBack')
                      : done.labSignature || labWork(done, tr)
                        ? t('app.backup.restored')
                        : t('app.backup.nothingNew')}
                </Typography>
              </Stack>
              {/* Documents kept on the other device only: never synced, so where they are is said (UX review #8). */}
              {fromAccount?.elsewhere.map((d) => (
                <Typography key={d.kind} variant="body1" data-restore-elsewhere={d.kind}>
                  {tr.tp('app.account.restore.elsewhere', d.count, { device: deviceWords(d.kind, tr) })}
                </Typography>
              ))}
              <Typography variant="body1" color="text.secondary">
                {/* From the copy saved with VeilCore, the welcome above has said it; no key counts. */}
                {done.records > 0 && !fromAccount
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
              {/* The records the file itself carried (backup.ts recordData): what came back from it. */}
              {done.fromFile && 'error' in done.fromFile && (
                <Alert severity="warning" variant="outlined" data-from-file="problem">
                  {t('app.backup.fromFileProblem', { why: done.fromFile.error })}
                </Alert>
              )}
              {done.fromFile && 'added' in done.fromFile && done.fromFile.added > 0 && (
                <Typography variant="body2" color="text.secondary" data-from-file="added">
                  {t('app.backup.fromFileAdded', { n: tr.num(done.fromFile.added) })}
                </Typography>
              )}
              {fromAccount && (
                <Typography variant="body2" color="text.secondary" data-from-passkey="">
                  {t('app.account.restore.savedOn', { date: tr.date(fromAccount.savedAt) })}
                </Typography>
              )}
              {adoptProblem && (
                <Alert
                  severity="warning"
                  variant="outlined"
                  data-restore-adopt-failed=""
                  action={
                    <Button color="inherit" variant="outlined" onClick={() => void adopt()} sx={{ minHeight: 44 }}>
                      {t('app.account.restore.tryAgain')}
                    </Button>
                  }
                >
                  {t('app.account.restore.adoptFailed', { why: backupMessageWords(adoptProblem, tr) })}
                </Alert>
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
              {account && (
                <Stack spacing={1} data-restore-account="">
                  {/* The copy's date first, and nothing changes until they say so (attack pass 21 Oct, finding 6). */}
                  {found ? (
                    <Alert severity="info" variant="outlined" data-passkey-found="">
                      {t('app.account.restore.found', {
                        date: new Date(found.savedAt).toLocaleString(tr.locale, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        }),
                      })}
                      <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
                        <Button
                          variant="contained"
                          disabled={busy}
                          onClick={() => {
                            const f = found;
                            setFound(undefined);
                            void restore(f.file, undefined, f);
                          }}
                        >
                          {t('app.account.restore.bring')}
                        </Button>
                        <Button color="inherit" onClick={() => setFound(undefined)}>
                          {t('app.account.restore.notThis')}
                        </Button>
                      </Stack>
                      {/* Records deleted on another device: counted, never left out silently (New-5). */}
                      {found.deleted.length > 0 && (
                        <Box sx={{ mt: 1.5 }} data-restore-deleted={found.deleted.length}>
                          <Typography variant="body2">
                            {tr.tp('app.account.restore.deleted', found.deleted.length)}
                          </Typography>
                          <Button
                            color="inherit"
                            disabled={busy}
                            onClick={() => {
                              const f = found;
                              setFound(undefined);
                              void restore(f.file, undefined, f, true);
                            }}
                            sx={{ minHeight: 44, px: 0 }}
                          >
                            {t('app.account.restore.bringAnyway')}
                          </Button>
                        </Box>
                      )}
                    </Alert>
                  ) : (
                    <Button
                      variant="contained"
                      size="large"
                      fullWidth
                      disabled={busy || asking}
                      onClick={() => find()}
                      startIcon={asking ? <CircularProgress size={18} color="inherit" /> : undefined}
                      sx={{ py: 1.5, fontSize: '1.05rem' }}
                      data-passkey-restore=""
                    >
                      {t(`app.account.use.${word}` as AppKey)}
                    </Button>
                  )}
                  {appleOrAndroid && (
                    <Typography variant="body2" color="text.secondary">
                      {t('app.account.restore.sameAccount')}
                    </Typography>
                  )}
                  <Typography variant="body2" color="text.secondary" data-restore-use-phone="">
                    {t('app.account.restore.usePhone')}
                  </Typography>
                  {oldPasskeysHaveOtherName() && !found && (
                    <Button
                      color="inherit"
                      onClick={() => find(true)}
                      disabled={asking}
                      sx={{ alignSelf: 'flex-start', minHeight: 44, px: 0 }}
                    >
                      {t('app.account.restore.oldName', { host: location.hostname })}
                    </Button>
                  )}
                </Stack>
              )}
              {account && problem && (
                <Alert severity="warning" variant="outlined">
                  {backupMessageWords(problem, tr)}
                  {/* A passkey from before the pin, made on www, is found only there (review New-10). */}
                  {problem === PASSKEY_WORDS.noCopy && location.hostname === 'veilcore.org' && (
                    <Box sx={{ mt: 0.5 }}>
                      <a href="https://www.veilcore.org/restore">{t('app.account.restore.tryWww')}</a>
                    </Box>
                  )}
                </Alert>
              )}
              {account && (
                <Button
                  color="inherit"
                  onClick={() => setOthers(!others)}
                  aria-expanded={others}
                  endIcon={others ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  sx={{ minHeight: 44, px: 0, alignSelf: 'flex-start' }}
                  data-restore-other-ways=""
                >
                  {t('app.account.restore.otherWays')}
                </Button>
              )}
              <Collapse in={!account || others || !!waiting}>
                <Stack spacing={2.5}>
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
                  {waiting && <BackupPasswordAsk busy={busy} onOpen={(password) => void restore(waiting, password)} />}
                  {!account && problem && (
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
                            htmlInput: {
                              style: { fontFamily: 'monospace' },
                              autoCapitalize: 'none',
                              spellCheck: false,
                            },
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
                </Stack>
              </Collapse>
            </>
          )}
        </Stack>
      </FlowFrame>
    </Box>
  );
};
