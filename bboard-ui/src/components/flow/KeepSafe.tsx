// Records saved with VeilCore (veilcore/account-copy.ts), on screen:
//
//   - KeepSafeSheet: "Keep your records safe". It opens by itself once, after the first record is
//     saved (value first, setup second: the UX review), on a device that can unlock a passkey
//     itself; after that, from "Fix it" on the account line. Never by itself inside a flow that
//     seals records: there, the flow's own backup step offers this device's lock beside the file,
//     so a seal is followed by one prompt, not two (the simplify-unlock plan, phase 1). One big
//     button, "This device's lock", with one line saying what that is (the phone's passcode,
//     fingerprint or face): not "Face ID", which hid that the passcode works too and pushed
//     biometrics. "Other ways" is the file.
//   - AccountStatusLine: the one account-level line on Home that replaced every per-record "not
//     in your backup" label. Shown only when something is wrong.
//   - AccountKeeper: mounted with the app's frame (App.tsx): keeps the copy saved by itself and
//     holds the sheet.
//
// Right after a passkey that stays on this device is set up, the recovery sheet is offered (easy
// mode step 3, RecoverySheet.tsx): it is the way to count at all there. Where the passkey syncs,
// it is not offered then (one prompt after a seal): it waits in Settings, and Home asks once,
// after the third record (account-copy.ts sheetReminder). When a passkey can't open the records any more and a checked sheet can,
// the sheet's code sets Face ID up again on the same records (account-copy.ts addFaceIdHere).
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import DoneIcon from '@mui/icons-material/CheckCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import {
  accountCopyOn,
  addFaceIdHere,
  checkAccount,
  dismissNotice,
  dismissSheetReminder,
  keepDeletedHere,
  forgetDevice,
  keepSafeShownBefore,
  noteKeepSafeShown,
  setUpAccount,
  startAccountSync,
  syncNow,
  unlockHere,
  useAccountState,
  type AccountState,
  type DeviceKind,
} from '../../veilcore/account-copy';
import { deviceUnlockAvailable } from '../../veilcore/passkey-backup';
import { useVaultNeedsBackup, vaultKeyIfAny } from '../../veilcore/vault';
import { deviceOnlyBackedUp, hydrate, isKeptOnDeviceOnly, useRecords } from '../../veilcore/records';
import { useRecordKeys } from '../../veilcore/record-keys';
import { keysOnlyHere } from './keys-only-here';
import { rich, useT } from '../../i18n/app';
import type { Translator } from '../../i18n/translate';
import type { AppKey } from '../../i18n/app/en';
import { errorReason, errorWords } from '../../i18n/error-words';
import { RecoverySheetHost, RecoverySheetPrompt, openRecoverySheet } from './RecoverySheet';
import { SHEET_WORDS } from '../../veilcore/recovery-code';
import { TextField } from '@mui/material';
import { PasskeyCheckLink } from './PasskeyCheckLink';
import { CODE_FONT } from '../../config/theme';

/** Opens the sheet from anywhere ("Fix it" on Home, a "save your backup" button). */
export const OPEN_KEEP_SAFE_EVENT = 'veilcore:open-keep-safe';
export const openKeepSafe = (): void => {
  window.dispatchEvent(new Event(OPEN_KEEP_SAFE_EVENT));
};

/**
 * 'deviceLock': this device unlocks the passkey itself (its passcode, PIN, fingerprint or face,
 * whichever the person set up: the button never names one). 'passkey': it can't, and the browser
 * offers another device ("Use a phone").
 */
export type UnlockWord = 'deviceLock' | 'passkey';

/** The button's words for this device: what it will actually ask for. */
export const unlockWordFor = (_ua: string, deviceUnlock: boolean): UnlockWord =>
  deviceUnlock ? 'deviceLock' : 'passkey';

/** The one line under "This device's lock": a phone's words or a computer's. */
export const deviceLockHintFor = (ua: string): AppKey =>
  /iPhone|iPad|iPod|Android/.test(ua) ? 'app.account.deviceLock.hint' : 'app.account.deviceLock.hintComputer';
export const useDeviceLockHint = (): AppKey =>
  deviceLockHintFor(typeof navigator !== 'undefined' ? navigator.userAgent : '');

const useUnlock = (): { word: UnlockWord; deviceUnlock: boolean | undefined } => {
  const [deviceUnlock, setDeviceUnlock] = useState<boolean>();
  useEffect(() => {
    let on = true;
    void deviceUnlockAvailable().then((v) => on && setDeviceUnlock(v));
    return () => {
      on = false;
    };
  }, []);
  return { word: unlockWordFor(navigator.userAgent, deviceUnlock === true), deviceUnlock };
};

/** This device's word for unlocking a passkey ("This device's lock", or "Use a passkey"). */
export const useUnlockWord = (): UnlockWord => useUnlock().word;
/** Whether this device can unlock a passkey itself (undefined until the browser says). */
export const useDeviceUnlock = (): { deviceUnlock: boolean | undefined } => {
  const { deviceUnlock } = useUnlock();
  return { deviceUnlock };
};

/**
 * The word for getting records back on this device, the same on every screen that offers it
 * (Home's first card, the restore page): on a computer that isn't a Mac the passkey is most often
 * on the person's phone, so "a passkey", and the browser offers "Use a phone" (first-time-user
 * pass on step 2; the live test on Windows, 19 Nov 2026).
 */
export const useRestoreUnlockWord = (): UnlockWord => {
  const { deviceUnlock } = useUnlock();
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  return /iPhone|iPad|iPod|Macintosh|Mac OS X|Android/.test(ua) ? unlockWordFor(ua, deviceUnlock === true) : 'passkey';
};

export const deviceWords = (kind: DeviceKind, tr: Translator): string => tr.t(`app.account.device.${kind}` as AppKey);

/**
 * The sheet. `onClose` when it is closed, whatever happened. `onFile` replaces going to the backup
 * page for "Keep a file myself" (a flow's own backup step, already on screen behind it).
 */
export const KeepSafeSheet: React.FC<{ open: boolean; onClose: () => void; onFile?: () => void }> = ({
  open,
  onClose,
  onFile,
}) => {
  const tr = useT();
  const { t } = tr;
  const navigate = useNavigate();
  const { word, deviceUnlock } = useUnlock();
  const hint = useDeviceLockHint();
  const state = useAccountState();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string>();
  const [done, setDone] = useState<{ counted: boolean }>();
  const [others, setOthers] = useState(false);
  // Only the recovery sheet can set Face ID up again here: its code, typed (never kept).
  const [code, setCode] = useState('');
  useEffect(() => {
    if (open) {
      setProblem(undefined);
      setDone(undefined);
      setOthers(false);
      setCode('');
    }
  }, [open]);
  const needsSheet = problem === SHEET_WORDS.needsSheet || (problem !== undefined && code !== '');

  const go = async () => {
    setBusy(true);
    setProblem(undefined);
    try {
      const out = needsSheet
        ? await addFaceIdHere(code)
        : state.kind === 'older' || (state.kind === 'saved' && state.locked)
          ? await unlockHere()
          : await setUpAccount();
      setCode('');
      await hydrate().catch(() => undefined);
      if (!out.ok) setProblem(out.reason);
      else setDone({ counted: out.counted === true });
    } catch (e) {
      setProblem(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  const toFile = () => {
    onClose();
    if (onFile) onFile();
    else void navigate('/backup');
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="xs" data-keep-safe="">
      {done ? (
        <>
          <DialogTitle component="h2" sx={{ pb: 1 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <DoneIcon color="success" aria-hidden="true" />
              <span>{t('app.account.saved.title')}</span>
            </Stack>
          </DialogTitle>
          <DialogContent>
            <Typography variant="body1" data-keep-safe-done={done.counted ? 'counted' : 'bound'}>
              {done.counted ? t('app.account.saved.text') : t('app.account.saved.bound')}
            </Typography>
            {/* Offered at once only where it is needed to count (a passkey that stays on this
                device); where the passkey syncs it waits for Settings and one later reminder,
                so a seal is followed by one prompt. Never where a checked sheet exists. */}
            {!done.counted && !(state.kind === 'saved' && state.sheet?.checked) && (
              <RecoverySheetPrompt
                bound={!done.counted}
                onMake={() => {
                  onClose();
                  openRecoverySheet('make');
                }}
              />
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            {!done.counted && (
              <Button onClick={toFile} sx={{ minHeight: 44 }}>
                {t('app.account.saved.download')}
              </Button>
            )}
            <Button variant={done.counted ? 'contained' : 'outlined'} onClick={onClose} sx={{ minHeight: 44 }}>
              {/* Where the sheet is required, closing is said for what it is (first-time-user pass). */}
              {done.counted ? t('app.account.saved.done') : t('app.recovery.prompt.laterBound')}
            </Button>
          </DialogActions>
        </>
      ) : (
        <>
          <DialogTitle component="h2" sx={{ pb: 0.5 }}>
            {t('app.account.sheet.title')}
          </DialogTitle>
          <DialogContent>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {t('app.account.sheet.lead')}
            </Typography>
            <Button
              variant="contained"
              size="large"
              fullWidth
              disabled={busy}
              onClick={() => void go()}
              startIcon={busy ? <CircularProgress size={18} color="inherit" /> : undefined}
              sx={{ py: 1.5, fontSize: '1.05rem' }}
              data-keep-safe-go=""
            >
              {t(`app.account.use.${word}` as AppKey)}
            </Button>
            {word === 'deviceLock' && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }} data-keep-safe-hint="">
                {t(hint)}
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.25 }}>
              {t('app.account.sheet.how')}
            </Typography>
            {deviceUnlock === false && (
              <Typography variant="body2" sx={{ mt: 1 }} data-keep-safe-use-phone="">
                {t('app.account.sheet.usePhone')}
              </Typography>
            )}
            {busy && (
              <Typography variant="body2" sx={{ mt: 1 }} role="status">
                {t('app.account.sheet.twice')}
              </Typography>
            )}
            {problem && (
              <Alert severity="warning" variant="outlined" sx={{ mt: 1.5 }} data-keep-safe-problem="">
                {needsSheet
                  ? errorWords(problem, tr)
                  : t('app.account.sheet.failed', { why: errorReason(problem, tr) })}
                {!needsSheet && <PasskeyCheckLink words="failed" />}
              </Alert>
            )}
            {needsSheet && (
              <Stack spacing={1} sx={{ mt: 1.5 }} data-keep-safe-sheet-code="">
                <TextField
                  label={t('app.recovery.confirm.label')}
                  value={code}
                  onChange={(e) => setCode(e.target.value.slice(0, 64))}
                  fullWidth
                  slotProps={{
                    htmlInput: {
                      autoComplete: 'off',
                      autoCapitalize: 'characters',
                      autoCorrect: 'off',
                      spellCheck: false,
                      style: { fontFamily: CODE_FONT },
                    },
                  }}
                />
                <Button
                  variant="contained"
                  disabled={busy || !code.trim()}
                  onClick={() => void go()}
                  sx={{ minHeight: 44, alignSelf: 'flex-start' }}
                  data-keep-safe-sheet-go=""
                >
                  {t('app.account.sheet.setUpAgain')}
                </Button>
                {/* No sheet after all (one made and never printed): a way on, said for what it does. */}
                <Button
                  color="inherit"
                  disabled={busy}
                  onClick={() => {
                    if (!window.confirm(t('app.account.sheet.noSheetConfirm'))) return;
                    setBusy(true);
                    setProblem(undefined);
                    setCode('');
                    void setUpAccount({ withoutSheet: true })
                      .then(async (out) => {
                        await hydrate().catch(() => undefined);
                        if (!out.ok) setProblem(out.reason);
                        else setDone({ counted: out.counted === true });
                      })
                      .catch((e: unknown) => setProblem(e instanceof Error ? e.message : String(e)))
                      .finally(() => setBusy(false));
                  }}
                  sx={{ minHeight: 44, alignSelf: 'flex-start', px: 0 }}
                  data-keep-safe-no-sheet=""
                >
                  {t('app.account.sheet.noSheet')}
                </Button>
              </Stack>
            )}
            <Box sx={{ mt: 1.5 }}>
              <Button
                color="inherit"
                onClick={() => setOthers(!others)}
                aria-expanded={others}
                endIcon={others ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                sx={{ minHeight: 44, px: 0 }}
              >
                {t('app.account.sheet.otherWays')}
              </Button>
              <Collapse in={others}>
                <Stack spacing={0.5} sx={{ pt: 0.5 }}>
                  <Button variant="outlined" onClick={toFile} sx={{ minHeight: 44, alignSelf: 'flex-start' }}>
                    {t('app.account.sheet.file')}
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    {t('app.account.sheet.fileHint')}
                  </Typography>
                </Stack>
              </Collapse>
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button color="inherit" onClick={onClose} disabled={busy} sx={{ minHeight: 44 }}>
              {t('app.account.sheet.notNow')}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
};

/**
 * Pages where the sheet never opens by itself: agreements being signed, a restore, the backup
 * itself, Settings, and the flows that seal records (their backup step offers this device's lock
 * itself: one prompt after a seal, not the sheet and then the step).
 */
export const QUIET =
  /^\/(restore|backup|settings|license\/[^/]+\/sign|license-invite|prove-license|claim|lender|prove|new|documents\/new|records\/import)\b/;

/**
 * With the app's frame: keeps the copy saved by itself, and opens the sheet once, by itself,
 * the first time a record waits for a backup (the vault key exists only after the first save),
 * where this device can unlock a passkey itself.
 */
export const AccountKeeper: React.FC = () => {
  const [open, setOpen] = useState(false);
  const needsBackup = useVaultNeedsBackup();
  const state = useAccountState();
  const { pathname } = useLocation();
  useEffect(() => {
    if (!accountCopyOn()) return;
    startAccountSync();
    void checkAccount();
  }, []);
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(OPEN_KEEP_SAFE_EVENT, show);
    return () => window.removeEventListener(OPEN_KEEP_SAFE_EVENT, show);
  }, []);
  useEffect(() => {
    if (!needsBackup || state.kind !== 'none' || !vaultKeyIfAny() || keepSafeShownBefore() || QUIET.test(pathname))
      return;
    let on = true;
    void deviceUnlockAvailable().then((yes) => {
      if (!on || !yes || keepSafeShownBefore()) return;
      noteKeepSafeShown();
      setOpen(true);
    });
    return () => {
      on = false;
    };
  }, [needsBackup, state.kind, pathname]);
  if (state.kind === 'off') return null;
  return (
    <>
      <KeepSafeSheet open={open} onClose={() => setOpen(false)} />
      <RecoverySheetHost />
    </>
  );
};

type Line = {
  words: React.ReactNode;
  button?: string;
  act?: () => void;
  /** A second, quieter button ("Later"). */
  second?: { label: string; act: () => void };
  mark: string;
  severity: 'warning' | 'info';
};

/** What the account line says, worst first; undefined when all is well (nothing is shown). */
export const accountLine = (
  s: AccountState,
  facts: { unbacked: boolean; deviceOnly: number },
  tr: Translator,
  act: {
    fix: () => void;
    file: () => void;
    settings: () => void;
    retry: () => void;
    gone: (id: string) => void;
    ok: () => void;
    keep: (ids: readonly string[]) => void;
    sheet: () => void;
    later: () => void;
    reverify: () => void;
  },
): Line | undefined => {
  const { t, tp } = tr;
  const b = { b: (c: React.ReactNode) => <b>{c}</b> };
  if (s.kind === 'off') {
    return facts.deviceOnly > 0
      ? {
          words: rich(tp('app.account.line.deviceOnly', facts.deviceOnly), b),
          button: t('app.account.line.download'),
          act: act.file,
          mark: 'device-only',
          severity: 'warning',
        }
      : undefined;
  }
  if (s.kind === 'older')
    return {
      words: rich(t('app.account.line.older'), b),
      button: t('app.account.line.continue'),
      act: act.fix,
      mark: 'older',
      severity: 'warning',
    };
  if (s.kind === 'none')
    return facts.unbacked
      ? {
          words: rich(t('app.account.line.none'), b),
          button: t('app.account.line.fix'),
          act: act.fix,
          mark: 'none',
          severity: 'warning',
        }
      : facts.deviceOnly > 0
        ? {
            words: rich(tp('app.account.line.deviceOnly', facts.deviceOnly), b),
            button: t('app.account.line.download'),
            act: act.file,
            mark: 'device-only',
            severity: 'warning',
          }
        : undefined;
  // Gone at the registry: with records here not saved anywhere else, a warning; with nothing at
  // risk here (it was turned off, perhaps on another device), one quiet line.
  if (s.problem === 'missing')
    return facts.unbacked
      ? {
          words: rich(t('app.account.line.missing'), b),
          button: t('app.account.line.saveAgain'),
          act: act.fix,
          mark: 'missing',
          severity: 'warning',
        }
      : {
          words: rich(t('app.account.line.off'), b),
          button: t('app.account.line.saveAgain'),
          act: act.fix,
          mark: 'off',
          severity: 'info',
        };
  if (s.problem === 'slot-missing')
    return {
      words: rich(t('app.account.line.slotMissing'), b),
      button: t('app.account.line.fix'),
      act: act.fix,
      mark: 'slot-missing',
      severity: 'warning',
    };
  if (s.locked && facts.unbacked)
    return {
      words: rich(t('app.account.line.locked'), b),
      button: t('app.account.line.continue'),
      act: act.fix,
      mark: 'locked',
      severity: 'warning',
    };
  if (s.problem === 'older')
    return {
      words: rich(t('app.account.line.serverOlder'), b),
      button: t('app.account.line.download'),
      act: act.file,
      mark: 'server-older',
      severity: 'warning',
    };
  if (s.problem === 'failing' && facts.unbacked)
    return {
      words: rich(t('app.account.line.failing', { why: s.why ? errorReason(s.why, tr) : '' }), b),
      button: t('app.account.line.tryNow'),
      act: act.retry,
      mark: 'failing',
      severity: 'warning',
    };
  // A passkey that stays on this device: the recovery sheet is what makes it count (step 3).
  if (!s.counted && facts.unbacked)
    return {
      words: rich(t('app.account.line.bound'), b),
      button: t('app.account.line.makeSheet'),
      act: act.sheet,
      mark: 'bound',
      severity: 'warning',
    };
  // Records still here that another device deleted: kept on purpose, or not (review New-6).
  if (s.deletedHere.length > 0)
    return {
      words: rich(tp('app.account.line.deletedHere', s.deletedHere.length), b),
      button: t('app.account.line.keepThem'),
      act: () => act.keep(s.deletedHere),
      mark: 'deleted-here',
      severity: 'warning',
    };
  if (s.notice === 'healed')
    return {
      words: t('app.account.line.healed'),
      button: t('app.account.line.ok'),
      act: act.ok,
      mark: 'healed',
      severity: 'info',
    };
  if (s.unknownSlots.length > 0)
    return {
      words: rich(t('app.account.line.unknownSlot'), b),
      button: t('app.account.line.seeSettings'),
      act: act.settings,
      mark: 'unknown-slot',
      severity: 'warning',
    };
  if (facts.deviceOnly > 0)
    return {
      words: rich(tp('app.account.line.deviceOnly', facts.deviceOnly), b),
      button: t('app.account.line.download'),
      act: act.file,
      mark: 'device-only',
      severity: 'warning',
    };
  const stale = s.staleDevices[0];
  if (stale)
    return {
      words: t('app.account.line.stale', { device: deviceWords(stale.kind, tr), date: tr.date(stale.at) }),
      button: t('app.account.line.seeSettings'),
      act: act.settings,
      mark: 'stale',
      severity: 'info',
    };
  // The 90-day re-verify: one Face ID through the registry's copy of this device's way in.
  if (s.reverify)
    return {
      words: t('app.account.line.reverify'),
      button: t('app.account.line.check'),
      act: act.reverify,
      mark: 'reverify',
      severity: 'info',
    };
  // Once, after the third record, with no checked recovery sheet: one quiet line, never per record.
  if (s.sheetReminder && s.faceIdHere)
    return {
      words: rich(t('app.account.line.reminder'), b),
      button: t('app.account.line.makeSheet'),
      act: act.sheet,
      second: { label: t('app.account.line.later'), act: act.later },
      mark: 'sheet-reminder',
      severity: 'info',
    };
  return undefined;
};

/** How many documents kept on this device only aren't in a checked file yet. */
const deviceOnlyWaiting = (records: ReturnType<typeof useRecords>): number =>
  records.filter((r) => isKeptOnDeviceOnly(r) && !deviceOnlyBackedUp(r)).length;

/**
 * Home's one line about keeping records safe (the founder's decision: it replaced every
 * per-record "not in your backup" label). Nothing when all is well.
 */
export const AccountStatusLine: React.FC = () => {
  const tr = useT();
  const navigate = useNavigate();
  const state = useAccountState();
  const records = useRecords();
  useRecordKeys();
  const vaultUnbacked = useVaultNeedsBackup();
  // Documents kept on this device only have their own line (they need the file, whatever else is safe).
  const localOnly = new Set(records.filter((r) => isKeptOnDeviceOnly(r)).map((r) => r.id));
  const unbacked = vaultUnbacked || keysOnlyHere(records).some((id) => !localOnly.has(id));
  const deviceOnly = deviceOnlyWaiting(records);
  const [busy, setBusy] = useState(false);
  const line = accountLine(state, { unbacked, deviceOnly }, tr, {
    fix: openKeepSafe,
    file: () => void navigate('/backup'),
    settings: () => void navigate('/settings'),
    retry: () => {
      setBusy(true);
      void syncNow({ force: true }).finally(() => setBusy(false));
    },
    gone: forgetDevice,
    ok: dismissNotice,
    keep: (ids) => {
      setBusy(true);
      void keepDeletedHere(ids).finally(() => setBusy(false));
    },
    sheet: () => openRecoverySheet('make'),
    later: dismissSheetReminder,
    reverify: () => {
      setBusy(true);
      void unlockHere()
        .catch(() => openKeepSafe())
        .finally(() => setBusy(false));
    },
  });
  if (!line) return null;
  return (
    <Alert
      severity={line.severity}
      variant="outlined"
      data-account-line={line.mark}
      // On a phone the button goes under the words, not beside them in a narrow column.
      sx={{
        flexWrap: { xs: 'wrap', sm: 'nowrap' },
        '& .MuiAlert-action': { ml: { xs: 0, sm: 'auto' }, pl: { xs: 4.5, sm: 2 }, pt: { xs: 0, sm: 0.5 } },
      }}
      action={
        line.button ? (
          <Stack direction="row" spacing={1}>
            {line.second && (
              <Button color="inherit" disabled={busy} onClick={line.second.act} sx={{ minHeight: 44 }}>
                {line.second.label}
              </Button>
            )}
            <Button color="inherit" variant="outlined" disabled={busy} onClick={line.act} sx={{ minHeight: 44 }}>
              {line.button}
            </Button>
          </Stack>
        ) : undefined
      }
    >
      {line.words}
    </Alert>
  );
};
