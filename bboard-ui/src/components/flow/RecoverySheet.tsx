// The recovery sheet (easy mode step 3): a printed code that opens the records saved with VeilCore
// on a new device, if the person loses their Apple or Google account, or the one device a passkey
// that doesn't sync is on (veilcore/account-copy.ts makeRecoverySheet, confirmRecoverySheet;
// recovery-code.ts for the code).
//
//   - RecoverySheetPrompt: the card on the "Saved." screen, right after Face ID is set up (the
//     founder's strong prompt). For a passkey that stays on its device it is the way to count at
//     all, and says so.
//   - RecoverySheetDialog: make it (one Face ID), print it or save it as a PDF, then type the
//     whole code back: checked through the registry's own copy of its slot (security review B2).
//     "Skip for now" only where a synced passkey already counts.
//   - SheetPaper: the sheet as printed. The UX review's words (section 3), the passkey's tag, and
//     the one line against phishing. Printing shows the sheet alone (a print-only copy outside
//     the app, below); the code is never written to storage, a URL or a file name.
//   - RecoverySheetHost: with the app's frame (KeepSafe.tsx AccountKeeper), opened from anywhere.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import DoneIcon from '@mui/icons-material/CheckCircle';
import { confirmRecoverySheet, makeRecoverySheet, useAccountState, type MadeSheet } from '../../veilcore/account-copy';
import { SHEET_WORDS, groupCode } from '../../veilcore/recovery-code';
import { useT } from '../../i18n/app';
import { backupMessageWords } from './backup-words';

export const OPEN_RECOVERY_EVENT = 'veilcore:open-recovery-sheet';
export type RecoveryMode = 'make' | 'check';
export const openRecoverySheet = (mode: RecoveryMode = 'make'): void => {
  window.dispatchEvent(new CustomEvent<RecoveryMode>(OPEN_RECOVERY_EVENT, { detail: mode }));
};

/** The site the sheet sends people back to: this one, without "www." (passkeys are pinned to the apex). */
export const sheetSite = (): string =>
  typeof location !== 'undefined' ? location.hostname.replace(/^www\./, '') : 'veilcore.org';

/** The card on the "Saved." screen. */
export const RecoverySheetPrompt: React.FC<{ bound?: boolean; onMake: () => void; onLater?: () => void }> = ({
  bound,
  onMake,
  onLater,
}) => {
  const { t } = useT();
  return (
    <Paper variant="outlined" sx={{ p: 2, mt: 2 }} data-recovery-prompt={bound ? 'bound' : 'synced'}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', mb: 0.75 }}>
        <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700 }}>
          {t('app.recovery.prompt.title')}
        </Typography>
        <Chip size="small" label={t('app.recovery.prompt.recommended')} />
      </Stack>
      <Typography variant="body2" sx={{ mb: 1.5 }}>
        {bound ? t('app.recovery.prompt.bound') : t('app.recovery.prompt.text')}
      </Typography>
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
        <Button variant="contained" onClick={onMake} sx={{ minHeight: 44 }} data-recovery-make="">
          {t('app.recovery.prompt.make')}
        </Button>
        {onLater && (
          <Button color="inherit" onClick={onLater} sx={{ minHeight: 44 }}>
            {t('app.recovery.prompt.later')}
          </Button>
        )}
      </Stack>
    </Paper>
  );
};

/** The sheet as printed (and shown on screen before printing). */
export const SheetPaper: React.FC<{ sheet: MadeSheet; site: string }> = ({ sheet, site }) => {
  const tr = useT();
  const { t } = tr;
  return (
    <Box className="vc-sheet-paper" data-recovery-paper="" sx={{ color: 'text.primary' }}>
      <Typography variant="h5" component="h2" sx={{ fontWeight: 700, mb: 1 }}>
        {t('app.recovery.sheet.title')}
      </Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        {t('app.recovery.sheet.keep')}
      </Typography>
      <Typography variant="overline" component="p" sx={{ lineHeight: 1.4 }}>
        {t('app.recovery.sheet.codeLabel')}
      </Typography>
      <Box
        component="p"
        data-recovery-code=""
        sx={{
          m: 0,
          mb: 1,
          p: 1.5,
          border: '2px solid',
          borderColor: 'text.primary',
          borderRadius: 1,
          fontFamily: '"SFMono-Regular", Menlo, Consolas, "Liberation Mono", monospace',
          fontSize: { xs: '1.05rem', sm: '1.4rem' },
          fontWeight: 700,
          letterSpacing: '0.06em',
          textAlign: 'center',
        }}
      >
        {/* Wraps only between groups of four, never inside one. */}
        {groupCode(sheet.code)
          .split('-')
          .map((g, i, all) => (
            <Box component="span" key={i} sx={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
              {g}
              {i < all.length - 1 ? '-' : ''}
            </Box>
          ))}
      </Box>
      <Typography variant="caption" component="p" sx={{ mb: 1 }}>
        {t('app.recovery.sheet.letters')}
      </Typography>
      <Typography variant="body2" sx={{ mb: 1.5 }}>
        {t('app.recovery.sheet.made', { date: tr.date(sheet.createdAt) })}
        {sheet.tag ? ` ${t('app.recovery.sheet.passkey', { tag: sheet.tag })}` : ''}
      </Typography>
      <Typography variant="body2" sx={{ mb: 1 }}>
        {t('app.recovery.sheet.how', { site })}
      </Typography>
      <Typography variant="body2" sx={{ mb: 1, fontWeight: 700 }} data-recovery-phishing="">
        {t('app.recovery.sheet.phishing', { site })}
      </Typography>
      <Typography variant="body2" sx={{ mb: 1 }}>
        {t('app.recovery.sheet.anyone')}
      </Typography>
      <Typography variant="body2" sx={{ mb: 1 }}>
        {t('app.recovery.sheet.newer')}
      </Typography>
      <Typography variant="body2">{t('app.recovery.sheet.lost')}</Typography>
    </Box>
  );
};

/** Printing shows the sheet alone: a print-only copy at the top of the page, everything else hidden. */
const PRINT_CSS = `
@media screen { .vc-recovery-print { display: none !important; } }
@media print {
  body > *:not(.vc-recovery-print) { display: none !important; }
  .vc-recovery-print { display: block !important; padding: 12mm; }
  .vc-recovery-print, .vc-recovery-print * { color: #000 !important; background: #fff !important; }
}`;

const PrintCopy: React.FC<{ sheet: MadeSheet; site: string }> = ({ sheet, site }) =>
  createPortal(
    <div className="vc-recovery-print" data-recovery-print="">
      <style>{PRINT_CSS}</style>
      <SheetPaper sheet={sheet} site={site} />
    </div>,
    document.body,
  );

type Phase = 'intro' | 'show' | 'confirm' | 'done';

export const RecoverySheetDialog: React.FC<{ open: boolean; mode: RecoveryMode; onClose: () => void }> = ({
  open,
  mode,
  onClose,
}) => {
  const tr = useT();
  const { t } = tr;
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down('sm'));
  const state = useAccountState();
  const [phase, setPhase] = useState<Phase>('intro');
  const [sheet, setSheet] = useState<MadeSheet>();
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string>();
  // Whether a checked sheet existed before this one: then "any older sheet no longer works".
  const [hadOlder, setHadOlder] = useState(false);
  const site = sheetSite();
  useEffect(() => {
    if (!open) return;
    setPhase(mode === 'check' ? 'confirm' : 'intro');
    setSheet(undefined);
    setTyped('');
    setProblem(undefined);
  }, [open, mode]);
  // The code lives only in this dialog: gone with it.
  const close = () => {
    setSheet(undefined);
    setTyped('');
    onClose();
  };
  // "Skip for now" only where the records already count without the sheet (a synced passkey).
  const canSkip =
    state.kind === 'saved' && state.slots.some((s) => s.kind === 'passkey' && s.synced === true && !!s.verifiedAt);
  const hasSheet = state.kind === 'saved' && !!state.sheet;

  const make = async () => {
    setBusy(true);
    setProblem(undefined);
    try {
      setHadOlder(state.kind === 'saved' && !!state.sheet?.checked);
      setSheet(await makeRecoverySheet());
      setPhase('show');
    } catch (e) {
      setProblem(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  const check = async () => {
    setBusy(true);
    setProblem(undefined);
    try {
      await confirmRecoverySheet(typed, sheet?.slotId);
      setTyped('');
      setSheet(undefined);
      setPhase('done');
    } catch (e) {
      setProblem(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      // Without a passkey that syncs, the sheet is the only way back: not closed by a stray tap
      // before its code is checked (UX review: "Skip for now" only where a synced passkey exists).
      onClose={busy || (sheet && !canSkip) ? undefined : close}
      fullWidth
      fullScreen={phone && phase === 'show'}
      maxWidth="sm"
      data-recovery-dialog={phase}
    >
      {/* Only while it is shown: typing it back must come from the paper (security pass, S-5). */}
      {sheet && phase === 'show' && <PrintCopy sheet={sheet} site={site} />}
      <DialogTitle component="h2" sx={{ pb: 0.5 }}>
        {phase === 'done' ? (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <DoneIcon color="success" aria-hidden="true" />
            <span>{t('app.recovery.done.title')}</span>
          </Stack>
        ) : (
          t('app.recovery.title')
        )}
      </DialogTitle>
      <DialogContent>
        {phase === 'intro' && (
          <Stack spacing={1.5}>
            <Typography variant="body1">{t('app.recovery.intro')}</Typography>
            <Button
              variant="contained"
              size="large"
              fullWidth
              disabled={busy}
              onClick={() => void make()}
              startIcon={busy ? <CircularProgress size={18} color="inherit" /> : undefined}
              sx={{ py: 1.5 }}
              data-recovery-go=""
            >
              {t('app.recovery.prompt.make')}
            </Button>
            {busy && (
              <Typography variant="body2" role="status">
                {t('app.recovery.asking')}
              </Typography>
            )}
            {hasSheet && (
              <Button
                color="inherit"
                disabled={busy}
                onClick={() => setPhase('confirm')}
                sx={{ alignSelf: 'flex-start', minHeight: 44, px: 0 }}
                data-recovery-have-one=""
              >
                {t('app.recovery.haveOne')}
              </Button>
            )}
          </Stack>
        )}
        {phase === 'show' && sheet && (
          <Stack spacing={2}>
            <Alert severity="warning" variant="outlined" data-recovery-only-now="">
              {t('app.recovery.onlyNow')}
              <Box sx={{ mt: 0.75 }}>{t('app.recovery.noPrinter')}</Box>
            </Alert>
            <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
              <SheetPaper sheet={sheet} site={site} />
            </Paper>
          </Stack>
        )}
        {phase === 'confirm' && (
          <Stack spacing={1.5}>
            <Typography variant="body1">{t('app.recovery.confirm.lead')}</Typography>
            <TextField
              label={t('app.recovery.confirm.label')}
              value={typed}
              onChange={(e) => setTyped(e.target.value.slice(0, 64))}
              // Typed from the paper, never pasted from the screen (security pass on step 3, S-5).
              onPaste={(e) => e.preventDefault()}
              onDrop={(e) => e.preventDefault()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && typed.trim() && !busy) void check();
              }}
              fullWidth
              autoFocus
              slotProps={{
                htmlInput: {
                  'data-recovery-input': '',
                  autoComplete: 'off',
                  autoCapitalize: 'characters',
                  autoCorrect: 'off',
                  spellCheck: false,
                  style: { fontFamily: 'monospace', letterSpacing: '0.04em' },
                },
              }}
            />
          </Stack>
        )}
        {phase === 'done' && (
          <Typography variant="body1" data-recovery-done="">
            {hadOlder ? t('app.recovery.done.text') : t('app.recovery.done.first')}
          </Typography>
        )}
        {problem && (
          <Alert severity="warning" variant="outlined" sx={{ mt: 1.5 }} data-recovery-problem="">
            {/* A wrong code says what is wrong with it; anything else, that it didn't work and why. */}
            {problem === SHEET_WORDS.wrong && phase === 'confirm' && sheet
              ? t('app.recovery.err.noMatch')
              : Object.values(SHEET_WORDS).includes(problem)
                ? backupMessageWords(problem, tr)
                : t('app.recovery.failed', { why: backupMessageWords(problem, tr) })}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, flexWrap: 'wrap', gap: 1 }}>
        {phase === 'intro' && (
          <Button color="inherit" onClick={close} disabled={busy} sx={{ minHeight: 44 }}>
            {t('app.recovery.prompt.later')}
          </Button>
        )}
        {phase === 'show' && (
          <>
            <Button
              variant="outlined"
              onClick={() => window.print()}
              sx={{ minHeight: 44 }}
              data-recovery-print-button=""
            >
              {t('app.recovery.print')}
            </Button>
            <Button
              variant="contained"
              onClick={() => setPhase('confirm')}
              sx={{ minHeight: 44 }}
              data-recovery-next=""
            >
              {t('app.recovery.next')}
            </Button>
          </>
        )}
        {phase === 'confirm' && (
          <>
            {sheet && (
              <Button color="inherit" disabled={busy} onClick={() => setPhase('show')} sx={{ minHeight: 44 }}>
                {t('app.recovery.confirm.back')}
              </Button>
            )}
            {(canSkip || !sheet) && (
              <Button color="inherit" disabled={busy} onClick={close} sx={{ minHeight: 44 }} data-recovery-skip="">
                {sheet ? t('app.recovery.confirm.skip') : t('app.recovery.close')}
              </Button>
            )}
            <Button
              variant="contained"
              disabled={busy || !typed.trim()}
              onClick={() => void check()}
              startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
              sx={{ minHeight: 44 }}
              data-recovery-check=""
            >
              {t('app.recovery.confirm.check')}
            </Button>
          </>
        )}
        {phase === 'done' && (
          <Button variant="contained" onClick={close} sx={{ minHeight: 44 }}>
            {t('app.recovery.done.ok')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

/** With the app's frame: the dialog, opened from anywhere (openRecoverySheet). */
export const RecoverySheetHost: React.FC = () => {
  const [open, setOpen] = useState<RecoveryMode>();
  useEffect(() => {
    const show = (e: Event) => setOpen((e as CustomEvent<RecoveryMode>).detail ?? 'make');
    window.addEventListener(OPEN_RECOVERY_EVENT, show);
    return () => window.removeEventListener(OPEN_RECOVERY_EVENT, show);
  }, []);
  return <RecoverySheetDialog open={!!open} mode={open ?? 'make'} onClose={() => setOpen(undefined)} />;
};
