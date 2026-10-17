// Save the one-file backup, put a copy somewhere else, and check the copy opens.
//
// The step is done only when a saved copy is opened and read back (backup.ts). A checkbox
// saying "I saved it" was clicked without saving in the field data this replaced
// (Höltervennhoff et al., USENIX Security 2024: 28,093 "Confirm" clicks, ~11,555 saves).
// "Somewhere safe" became real places: on a phone, the share sheet sends the file to
// email, Drive or Files; elsewhere, plain words say where, with a button that saves the same
// file again (to a USB stick or a Drive folder). Step 2 is recommended, not required: the
// check in step 3 is what turns the finish button on.
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
import { useRecords } from '../../veilcore/records';
import { backupHoldsLine } from '../stage/record-kinds';
import { rich, useT } from '../../i18n/app';
import { backupMessageWords } from './backup-words';

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
}> = ({ title, finishLabel, onDone, stepLabel, headingComponent = 'h1' }) => {
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

  // A password on the file (persona review, 17 Oct): suggested, never forced. The password
  // lives only in this screen's memory while it's open; it's never stored or sent.
  const [usePassword, setUsePassword] = useState(false);
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

  const save = async () => {
    if (!pwReady || locking) return;
    setLocking(true);
    try {
      const now = Date.now();
      const text = await backupFileText(usePassword ? pw : undefined, now);
      savedText.current = text;
      savedAt.current = now;
      setLocked(usePassword);
      setSaved(downloadBackupAll(now, text));
    } finally {
      setLocking(false);
    }
  };

  const fileForSharing = (): File =>
    new File([savedText.current ?? ''], saved ?? backupFileName(), { type: 'application/json' });
  // Only phones and tablets get the share sheet. Desktop Chrome on a Mac says it can share a
  // file (canShare) and then throws on share(), so a computer gets the by-hand way at once.
  const canShare = (() => {
    try {
      return (
        isTouch() &&
        typeof navigator !== 'undefined' &&
        !!navigator.canShare?.({ files: [new File(['{}'], backupFileName(), { type: 'application/json' })] })
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
    downloadBackupAll(savedAt.current, savedText.current);
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
          {rich(t('app.backup.onlyWay'), { b: (c) => <b>{c}</b> })}
        </Typography>
      </Box>

      <Part n={1} level={partLevel} title={t('app.backup.saveIt')} active={!saved}>
        {saved ? (
          <Box ref={savedRef} tabIndex={-1} role="status" sx={{ outline: 'none' }}>
            <Done
              text={t('app.backup.saved')}
              sub={locked ? t('app.backup.pw.savedSub', { file: saved }) : t('app.backup.savedSub', { file: saved })}
            />
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
              variant="contained"
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
            <Typography variant="body1">{t('app.backup.byHand')}</Typography>
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
        <Box role="status" ref={worksRef} tabIndex={checked !== undefined ? -1 : undefined} sx={{ outline: 'none' }}>
          {checked !== undefined && <Done text={t('app.backup.itWorks')} sub={backupHoldsLine(checked, records, tr)} />}
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
              <Typography id={saveHint} variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
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

      <Button
        variant="contained"
        size="large"
        fullWidth
        {...softDisabled(checked === undefined, finishHint)}
        onClick={() => checked !== undefined && onDone()}
        sx={{ py: 1.6 }}
      >
        {finishLabel}
      </Button>
      {checked === undefined && (
        <Typography id={finishHint} variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
          {t('app.backup.turnsOn')}
        </Typography>
      )}
    </Stack>
  );
};
