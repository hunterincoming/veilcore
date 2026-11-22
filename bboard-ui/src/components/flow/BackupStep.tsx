// Save the one-file backup, put a copy somewhere else, and check the copy opens.
//
// The step is done only when a saved copy is opened and read back (backup.ts). A checkbox
// saying "I saved it" was clicked without saving in the field data this replaced
// (Höltervennhoff et al., USENIX Security 2024: 28,093 "Confirm" clicks, ~11,555 saves).
// "Somewhere safe" became real places: on a phone, the share sheet sends the file to
// email, Drive or Files; elsewhere, plain words say where, with a button that saves the same
// file again (to a USB stick or a Drive folder). Step 2 is recommended, not required: the
// check in step 3 is what turns the finish button on.
//
// In the flows that seal records (LogFlow, BatchFlow, BulkImportPage, DocumentNew) this step is
// skipped when the records are already saved with VeilCore (way-back.ts). When it does show,
// the person has no way back yet, and the step offers both: this device's lock (the account
// copy, KeepSafe.tsx) or the file. Either one turns Finish on; this is the one prompt after a
// seal (the simplify-unlock plan, phase 1).
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useId, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import DoneIcon from '@mui/icons-material/CheckCircle';
import { backupFileName, backupFileText, checkBackup, downloadBackupAll } from '../../veilcore/backup';
import { isTouch, ScreenHeading, softDisabled } from './FlowFrame';
import { damagedDeviceOnly, useRecords } from '../../veilcore/records';
import { backupHoldsLine } from '../stage/record-kinds';
import { rich, useT } from '../../i18n/app';
import { backupMessageWords } from './backup-words';
import { loadAttester } from '../../veilcore/attester-keys';
import { getRole, isLab } from '../../veilcore/role';
import { prepareToReceive } from '../../veilcore/receive';
import { thisBrowserClearsAfterSevenDays } from './webkit-storage';
import { accountCopyOn, accountState, setUpAccount, unlockHere, useAccountState } from '../../veilcore/account-copy';
import { hydrate } from '../../veilcore/records';
import { SHEET_WORDS } from '../../veilcore/recovery-code';
import { openRecoverySheet } from './RecoverySheet';
import { useRecordKeys } from '../../veilcore/record-keys';
import { useVaultNeedsBackup, vaultKeyIfAny } from '../../veilcore/vault';
import { KeepSafeSheet, useDeviceUnlock, useDeviceLockHint } from './KeepSafe';
import { copyCountsHere, recordsHaveWayBack, savedWithVeilCore } from './way-back';

const Done: React.FC<{ text: string; sub?: string }> = ({ text, sub }) => (
  <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
    <DoneIcon color="success" aria-hidden="true" />
    <Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        {text}
      </Typography>
      {sub && (
        <Typography variant="body2" color="text.secondary">
          {sub}
        </Typography>
      )}
    </Box>
  </Stack>
);

/** The copy being saved with the records just sealed in it, before a flow ends (way-back.ts); seconds at most. */
export const SavingWithVeilCore: React.FC<{ step?: string }> = ({ step }) => {
  const { t } = useT();
  return (
    <Stack spacing={2} data-saving-with-veilcore="" role="status">
      <ScreenHeading step={step}>{t('app.backup.lock.saving')}</ScreenHeading>
      <CircularProgress size={22} aria-hidden="true" />
    </Stack>
  );
};

/** A locked backup's password, asked for when a file needs it (the check here, and restore). */
export const BackupPasswordAsk: React.FC<{ busy: boolean; onOpen: (password: string) => void }> = ({
  busy,
  onOpen,
}) => {
  const { t } = useT();
  const [pw, setPw] = useState('');
  return (
    <Stack spacing={1} sx={{ mt: 1.25 }} data-backup-password-ask="">
      <Typography variant="body2">{t('app.backup.pw.needed')}</Typography>
      <TextField
        type="password"
        label={t('app.backup.pw.checkLabel')}
        value={pw}
        autoFocus
        onChange={(e) => setPw(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && pw && !busy) onOpen(pw);
        }}
        autoComplete="current-password"
        fullWidth
      />
      <Button
        variant="contained"
        disabled={!pw || busy}
        onClick={() => onOpen(pw)}
        startIcon={busy ? <CircularProgress size={18} color="inherit" /> : undefined}
        sx={{ minHeight: 44 }}
      >
        {t('app.backup.pw.open')}
      </Button>
    </Stack>
  );
};

/** The shortest password the backup takes: long enough to resist guessing at 600,000 rounds. */
export const MIN_BACKUP_PASSWORD = 10;

const Part: React.FC<React.PropsWithChildren<{ n: number; title: string; active: boolean; level: 'h2' | 'h3' }>> = ({
  n,
  title,
  active,
  level,
  children,
}) => (
  <Box
    sx={{
      border: '1px solid',
      borderColor: active ? 'secondary.main' : 'divider',
      borderRadius: 2,
      p: 2,
      opacity: active ? 1 : 0.92,
    }}
  >
    <Typography variant="subtitle1" component={level} sx={{ fontWeight: 700, mb: 1, fontSize: '1rem' }}>
      {n}. {title}
    </Typography>
    {children}
  </Box>
);

export const BackupStep: React.FC<{
  title: string;
  finishLabel: string;
  onDone: () => void;
  /** The flow's step counter, read with the heading. */
  stepLabel?: string;
  /** h1 on its own screen; h2 inside the plant's page, under the plant's name. */
  headingComponent?: 'h1' | 'h2';
  /**
   * The records this step is for, in a flow that has just sealed them. With it, the step offers
   * this device's lock as well as the file, and Finish turns on once these records are saved
   * with VeilCore that way (way-back.ts). Left out (a fresh backup asked for on purpose), the
   * step is the file alone, as before.
   */
  wayBackFor?: readonly string[];
}> = ({ title, finishLabel, onDone, stepLabel, headingComponent = 'h1', wayBackFor }) => {
  const saveHint = useId();
  const finishHint = useId();
  const partLevel = headingComponent === 'h1' ? 'h2' : 'h3';
  const [saved, setSaved] = useState<string>();
  const [copied, setCopied] = useState(false);
  const [checked, setChecked] = useState<readonly string[]>();
  const records = useRecords();
  const [problem, setProblem] = useState<string>();
  const [busy, setBusy] = useState(false);
  const pick = useRef<HTMLInputElement>(null);
  const tr = useT();
  const { t } = tr;
  // Round 6: the button pressed goes away once it has done its job (Save, then Open my saved
  // copy), so focus moves to what it said: "Saved", then "It works." Tab goes on from there.
  const savedRef = useRef<HTMLDivElement>(null);
  const worksRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (saved) savedRef.current?.focus();
  }, [saved]);
  useEffect(() => {
    if (checked !== undefined) worksRef.current?.focus();
  }, [checked]);

  // A password on the file (persona review, 17 Oct): suggested, never forced. On by default since
  // the full review (22 Nov): a file without one opens the records for whoever finds it, and it
  // is easy to switch off. The password lives only in this screen's memory while it's open; it's
  // never stored or sent.
  const [usePassword, setUsePassword] = useState(true);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [locking, setLocking] = useState(false);
  const [locked, setLocked] = useState(false);
  // The exact text saved, so a copy sent through the share sheet is the same file.
  const savedText = useRef<string | undefined>(undefined);
  // When it was saved, so "Save another copy" makes the same file under the same name.
  const savedAt = useRef<number | undefined>(undefined);
  const pwShort = usePassword && pw.length > 0 && pw.length < MIN_BACKUP_PASSWORD;
  const pwDiffers = usePassword && pw2.length > 0 && pw !== pw2;
  const pwReady = !usePassword || (pw.length >= MIN_BACKUP_PASSWORD && pw === pw2);
  // A locked file picked for the check, waiting for its password.
  const [waiting, setWaiting] = useState<File>();
  // A lab's receiving key that couldn't be made before this backup (said, not blocking).
  const [labKeyMissing, setLabKeyMissing] = useState(false);

  // This device's lock, offered beside the file where the account copy can be set up here.
  const account = useAccountState();
  useRecordKeys();
  const vaultUnbacked = useVaultNeedsBackup();
  const { deviceUnlock } = useDeviceUnlock();
  const lockHint = useDeviceLockHint();
  // The sheet opens only where a passkey here can't open the saved records and the recovery
  // sheet's code is needed (it asks for it); everything else happens on this screen.
  const [lockOpen, setLockOpen] = useState(false);
  const [lockBusy, setLockBusy] = useState(false);
  const [lockProblem, setLockProblem] = useState<string>();
  // Set up, but on a passkey that stays on this device: the recovery sheet or the file still needed.
  const [lockBound, setLockBound] = useState(false);
  // Saved with VeilCore from this step, just now: a save that was read back and checked (never
  // only marks left from before, which may be stale: the independent review).
  const [lockSaved, setLockSaved] = useState(false);
  const afterSheet = () => {
    setLockOpen(false);
    if (!wayBackFor) return;
    if (wayBackFor.length) void savedWithVeilCore(wayBackFor).then((ok) => ok && setLockSaved(true));
    else if (copyCountsHere(accountState())) setLockSaved(true);
  };
  const saveWithLock = async () => {
    setLockBusy(true);
    setLockProblem(undefined);
    try {
      const out =
        account.kind === 'older' || (account.kind === 'saved' && account.locked)
          ? await unlockHere()
          : await setUpAccount();
      await hydrate().catch(() => undefined);
      if (!out.ok) setLockProblem(out.reason);
      else if (out.counted !== true) setLockBound(true);
      else setLockSaved(true);
    } catch (e) {
      const why = e instanceof Error ? e.message : String(e);
      if (why === SHEET_WORDS.needsSheet) setLockOpen(true);
      else setLockProblem(why);
    } finally {
      setLockBusy(false);
    }
  };
  const offersLock =
    !!wayBackFor &&
    accountCopyOn() &&
    deviceUnlock === true &&
    (account.kind === 'none' || account.kind === 'older' || (account.kind === 'saved' && account.locked));
  // Saved with VeilCore since this step opened (this device's lock, just now): the file is optional.
  const savedWithCopy =
    !!wayBackFor &&
    lockSaved &&
    copyCountsHere(account) &&
    (wayBackFor.length ? recordsHaveWayBack(wayBackFor) : !!vaultKeyIfAny() && !vaultUnbacked);
  const finishOn = checked !== undefined || savedWithCopy;

  const save = async () => {
    if (!pwReady || locking) return;
    setLocking(true);
    try {
      // A lab's backup holds the key its received records are locked with, made here first if
      // there is none yet. It used to be made only when the first code was used, after this
      // backup, so a lab that backed up first was asked to back up again (review, 12 Nov).
      // A lab ('lab' or 'both'). If the key can't be made now the backup is still saved, and
      // says so under "Saved" (review of ux-polish, 13 Nov: it used to fail silently).
      if (loadAttester() || isLab(getRole())) {
        const made = await prepareToReceive().catch(() => undefined);
        setLabKeyMissing(!made || !('ok' in made));
      }
      setProblem(undefined);
      const now = Date.now();
      const text = await backupFileText(usePassword ? pw : undefined, now);
      savedText.current = text;
      savedAt.current = now;
      setLocked(usePassword);
      setSaved(downloadBackupAll(now, text, t('app.backup.shareTitle')));
    } catch (e) {
      // A file that couldn't be made whole is not saved, and the reason is said (backup.ts: a
      // document kept on this device only that couldn't be put in it).
      setProblem(e instanceof Error ? e.message : String(e));
    } finally {
      setLocking(false);
    }
  };

  const fileForSharing = (): File =>
    new File([savedText.current ?? ''], saved ?? backupFileName(Date.now(), t('app.backup.shareTitle')), {
      type: 'application/json',
    });
  // Only phones and tablets get the share sheet. Desktop Chrome on a Mac says it can share a
  // file (canShare) and then throws on share(), so a computer gets the by-hand way at once.
  const canShare = (() => {
    try {
      return (
        isTouch() &&
        typeof navigator !== 'undefined' &&
        !!navigator.canShare?.({
          files: [
            new File(['{}'], backupFileName(Date.now(), t('app.backup.shareTitle')), { type: 'application/json' }),
          ],
        })
      );
    } catch {
      return false;
    }
  })();

  const [shareFailed, setShareFailed] = useState(false);
  const share = async () => {
    setShareFailed(false);
    try {
      await navigator.share({ files: [fileForSharing()], title: t('app.backup.shareTitle') });
      setCopied(true);
    } catch (e) {
      // Closing the share sheet is a choice, not a failure. Anything else (some desktop
      // browsers say they can share files and then refuse) gets the by-hand way, said plainly.
      if (!(e instanceof DOMException && e.name === 'AbortError')) setShareFailed(true);
    }
  };

  const [savedAgain, setSavedAgain] = useState(false);
  const saveAgain = () => {
    if (!saved || savedText.current === undefined) return;
    downloadBackupAll(savedAt.current, savedText.current, t('app.backup.shareTitle'));
    setSavedAgain(true);
    setCopied(true);
  };

  const check = async (f: File, password?: string) => {
    setBusy(true);
    setProblem(undefined);
    const r = await checkBackup(f, password);
    setBusy(false);
    if (r.ok) {
      setWaiting(undefined);
      setChecked(r.recordIds ?? []);
    } else if (r.needsPassword) {
      // Typing it again here is the check that the password is known, not only the file.
      setWaiting(f);
    } else setProblem(r.reason);
  };

  return (
    <Stack spacing={2}>
      <Box>
        <ScreenHeading step={stepLabel} component={headingComponent}>
          {title}
        </ScreenHeading>
        <Typography variant="body1" sx={{ mt: 0.5 }}>
          {rich(t('app.backup.oneWay'), { b: (c) => <b>{c}</b> })}
        </Typography>
      </Box>

      {savedWithCopy && checked === undefined ? (
        <Box role="status" data-backup-saved-with-copy="">
          <Done text={t('app.backup.lock.savedTitle')} sub={t('app.backup.lock.savedText')} />
        </Box>
      ) : lockBound ? (
        <Alert severity="warning" variant="outlined" data-backup-device-lock="bound">
          {t('app.account.saved.bound')}
          <Box sx={{ mt: 1 }}>
            <Button
              color="inherit"
              variant="outlined"
              onClick={() => openRecoverySheet('make')}
              sx={{ minHeight: 44 }}
              data-backup-make-sheet=""
            >
              {t('app.account.line.makeSheet')}
            </Button>
          </Box>
        </Alert>
      ) : (
        offersLock && (
          <Box data-backup-device-lock="">
            <Button
              variant="contained"
              size="large"
              fullWidth
              disabled={lockBusy}
              onClick={() => void saveWithLock()}
              startIcon={lockBusy ? <CircularProgress size={18} color="inherit" /> : undefined}
              sx={{ py: 1.4 }}
              data-backup-device-lock-go=""
            >
              {t('app.account.use.deviceLock')}
            </Button>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
              {t(lockHint)}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {t('app.backup.lock.text')}
            </Typography>
            {lockBusy && (
              <Typography variant="body2" sx={{ mt: 0.5 }} role="status">
                {t('app.account.sheet.twice')}
              </Typography>
            )}
            {lockProblem && (
              <Alert severity="warning" variant="outlined" sx={{ mt: 1 }} data-backup-device-lock-problem="">
                {t('app.account.sheet.failed', { why: backupMessageWords(lockProblem, tr) })}
              </Alert>
            )}
            <Typography variant="subtitle1" component="p" sx={{ mt: 2, fontWeight: 700 }}>
              {t('app.backup.lock.orFile')}
            </Typography>
          </Box>
        )
      )}
      {(offersLock || lockOpen) && (
        <KeepSafeSheet open={lockOpen} onClose={afterSheet} onFile={() => setLockOpen(false)} />
      )}

      {!(savedWithCopy && checked === undefined) && (
        <>
          <Part n={1} level={partLevel} title={t('app.backup.saveIt')} active={!saved}>
            {saved ? (
              <Box ref={savedRef} tabIndex={-1} role="status" sx={{ outline: 'none' }}>
                <Done
                  text={t('app.backup.saved')}
                  sub={
                    locked ? t('app.backup.pw.savedSub', { file: saved }) : t('app.backup.savedSub', { file: saved })
                  }
                />
                {/* Said plainly: an entry that couldn't be read is in the file as it is (backup.ts). */}
                {damagedDeviceOnly().length > 0 && (
                  <Alert severity="warning" variant="outlined" sx={{ mt: 1 }} data-backup-unreadable="">
                    {t('app.doc.local.unreadable.backupNote')}
                  </Alert>
                )}
                {labKeyMissing && (
                  <Alert severity="warning" variant="outlined" sx={{ mt: 1 }} data-lab-key-missing="">
                    {t('app.backup.labKeyNotMade')}
                  </Alert>
                )}
              </Box>
            ) : (
              <Stack spacing={1.25}>
                <Box data-backup-password="">
                  <FormControlLabel
                    control={<Switch checked={usePassword} onChange={() => setUsePassword((v) => !v)} />}
                    label={<Typography variant="body2">{t('app.backup.pw.add')}</Typography>}
                    sx={{ minHeight: 44, mr: 0 }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {t('app.backup.pw.why')}
                  </Typography>
                  {usePassword && (
                    <Stack spacing={1.25} sx={{ mt: 1.25 }}>
                      <TextField
                        type="password"
                        label={t('app.backup.pw.label')}
                        value={pw}
                        onChange={(e) => setPw(e.target.value)}
                        autoComplete="new-password"
                        error={pwShort}
                        helperText={t('app.backup.pw.short', { n: MIN_BACKUP_PASSWORD })}
                        fullWidth
                      />
                      <TextField
                        type="password"
                        label={t('app.backup.pw.again')}
                        value={pw2}
                        onChange={(e) => setPw2(e.target.value)}
                        autoComplete="new-password"
                        error={pwDiffers}
                        helperText={pwDiffers ? t('app.backup.pw.mismatch') : t('app.backup.pw.keep')}
                        fullWidth
                      />
                    </Stack>
                  )}
                </Box>
                <Button
                  // One yellow button at a time: this device's lock, when it is offered above.
                  variant={offersLock ? 'outlined' : 'contained'}
                  size="large"
                  fullWidth
                  disabled={!pwReady || locking}
                  onClick={() => void save()}
                  startIcon={locking ? <CircularProgress size={18} color="inherit" /> : undefined}
                  sx={{ py: 1.4 }}
                >
                  {locking ? t('app.backup.pw.locking') : t('app.backup.saveFile')}
                </Button>
              </Stack>
            )}
          </Part>

          <Part
            n={2}
            level={partLevel}
            title={t('app.backup.copyTitle')}
            // Recommended, not required: it never takes the highlight from step 3.
            active={false}
          >
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>
              {t('app.backup.wayBack')}
            </Typography>
            {/* Only where it is true: Safari, and every browser on an iPhone or iPad. */}
            {thisBrowserClearsAfterSevenDays() && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }} data-backup-safari="">
                {t('app.backup.safari')}
              </Typography>
            )}
            <Typography variant="body2" sx={{ mb: 1.25, fontWeight: 700 }} data-backup-warning="">
              {t('app.backup.actAsYou')}
            </Typography>
            {canShare && !shareFailed ? (
              <Button
                variant="outlined"
                size="large"
                fullWidth
                {...softDisabled(!saved, saveHint)}
                onClick={() => saved && void share()}
                sx={{ py: 1.3 }}
              >
                {copied ? t('app.backup.sentCopy') : t('app.backup.sendCopy')}
              </Button>
            ) : (
              <Stack spacing={1.25} data-backup-by-hand="">
                {shareFailed && (
                  <Typography variant="body2" role="status">
                    {t('app.backup.shareFailed')}
                  </Typography>
                )}
                {/* Where to keep it is said once, above (app.backup.actAsYou); where the file is,
                only once there is one. */}
                {saved && (
                  <Typography variant="body1" data-backup-saved-where="">
                    {t('app.backup.byHand')}
                  </Typography>
                )}
                <Button
                  variant="outlined"
                  size="large"
                  fullWidth
                  {...softDisabled(!saved, saveHint)}
                  onClick={saveAgain}
                  sx={{ py: 1.3 }}
                >
                  {savedAgain ? t('app.backup.savedAgain') : t('app.backup.saveAgain')}
                </Button>
              </Stack>
            )}
          </Part>

          <Part n={3} level={partLevel} title={t('app.backup.checkTitle')} active={!!saved && checked === undefined}>
            {/* Always there, so the result is announced when it arrives. */}
            <Box
              role="status"
              ref={worksRef}
              tabIndex={checked !== undefined ? -1 : undefined}
              sx={{ outline: 'none' }}
            >
              {checked !== undefined && <Done text={t('app.backup.itWorks')} sub={backupHoldsLine(checked, tr)} />}
            </Box>
            {checked === undefined && (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>
                  {t('app.backup.openIntro')}
                </Typography>
                {/* Filled once the file is saved: this is the next thing to do. */}
                <Button
                  variant={saved ? 'contained' : 'outlined'}
                  size="large"
                  fullWidth
                  {...softDisabled(!saved || busy, saveHint)}
                  onClick={() => saved && !busy && pick.current?.click()}
                  startIcon={busy ? <CircularProgress size={18} color="inherit" /> : undefined}
                  sx={{ py: 1.3 }}
                >
                  {t('app.backup.openCopy')}
                </Button>
                <input
                  ref={pick}
                  type="file"
                  accept="application/json,.json"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = '';
                    if (f) void check(f);
                  }}
                />
                {!saved && (
                  <Typography
                    id={saveHint}
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mt: 0.75 }}
                  >
                    {t('app.backup.saveFirst')}
                  </Typography>
                )}
              </>
            )}
            {waiting && checked === undefined && (
              <BackupPasswordAsk busy={busy} onOpen={(password) => void check(waiting, password)} />
            )}
            {problem && (
              <Alert severity="warning" variant="outlined" sx={{ mt: 1.5 }}>
                {backupMessageWords(problem, tr)}
              </Alert>
            )}
          </Part>
        </>
      )}

      <Button
        variant="contained"
        size="large"
        fullWidth
        {...softDisabled(!finishOn, finishHint)}
        onClick={() => finishOn && onDone()}
        sx={{ py: 1.6 }}
      >
        {finishLabel}
      </Button>
      {!finishOn && (
        <Typography id={finishHint} variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
          {t('app.backup.turnsOn')}
        </Typography>
      )}
    </Stack>
  );
};
