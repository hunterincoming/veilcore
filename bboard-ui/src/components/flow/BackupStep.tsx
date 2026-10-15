// Save the one-file backup, put a copy somewhere else, and check the copy opens.
//
// The step is done only when a saved copy is opened and read back (backup.ts). A checkbox
// saying "I saved it" was clicked without saving in the field data this replaced
// (Höltervennhoff et al., USENIX Security 2024: 28,093 "Confirm" clicks, ~11,555 saves).
// "Somewhere safe" became real places: on a phone, the share sheet sends the file to
// email, Drive or Files; elsewhere, plain words say where.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useId, useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import DoneIcon from '@mui/icons-material/CheckCircle';
import { backupContents, backupFileName, checkBackup, downloadBackupAll } from '../../veilcore/backup';
import { ScreenHeading, softDisabled } from './FlowFrame';
import { useRecords } from '../../veilcore/records';
import { backupHoldsLine } from '../stage/record-kinds';

const Done: React.FC<{ text: string; sub?: string }> = ({ text, sub }) => (
  <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
    <DoneIcon color="primary" aria-hidden="true" />
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
      borderColor: active ? 'primary.main' : 'divider',
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

  const fileForSharing = (): File =>
    new File([JSON.stringify(backupContents(), null, 2)], backupFileName(), { type: 'application/json' });
  const canShare = (() => {
    try {
      return typeof navigator !== 'undefined' && !!navigator.canShare?.({ files: [fileForSharing()] });
    } catch {
      return false;
    }
  })();

  const [shareFailed, setShareFailed] = useState(false);
  const share = async () => {
    setShareFailed(false);
    try {
      await navigator.share({ files: [fileForSharing()], title: 'VeilCore backup' });
      setCopied(true);
    } catch (e) {
      // Closing the share sheet is a choice, not a failure. Anything else (some desktop
      // browsers say they can share files and then refuse) gets the by-hand way, said plainly.
      if (!(e instanceof DOMException && e.name === 'AbortError')) setShareFailed(true);
    }
  };

  const check = async (f: File) => {
    setBusy(true);
    setProblem(undefined);
    const r = await checkBackup(f);
    setBusy(false);
    if (r.ok) setChecked(r.recordIds ?? []);
    else setProblem(r.reason);
  };

  return (
    <Stack spacing={2}>
      <Box>
        <ScreenHeading step={stepLabel} component={headingComponent}>
          {title}
        </ScreenHeading>
        <Typography variant="body1" sx={{ mt: 0.5 }}>
          <b>This file is the only way to prove you hold your plants</b>, and to get them back on a new phone or
          computer. VeilCore can&apos;t recover it or make another.
        </Typography>
      </Box>

      <Part n={1} level={partLevel} title="Save it" active={!saved}>
        {saved ? (
          <Box ref={savedRef} tabIndex={-1} role="status" sx={{ outline: 'none' }}>
            <Done text="Saved" sub={`${saved} · one file for everything`} />
          </Box>
        ) : (
          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={() => setSaved(downloadBackupAll())}
            sx={{ py: 1.4 }}
          >
            Save backup file
          </Button>
        )}
      </Part>

      <Part
        n={2}
        level={partLevel}
        title="Put a copy somewhere else"
        active={!!saved && !copied && checked === undefined}
      >
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>
          If this phone or computer breaks, that copy is your way back.
        </Typography>
        <Typography variant="body2" sx={{ mb: 1.25, fontWeight: 700 }} data-backup-warning="">
          This file lets anyone who has it act as you. Keep it somewhere only you can open.
        </Typography>
        {canShare ? (
          <Button
            variant="outlined"
            size="large"
            fullWidth
            {...softDisabled(!saved, saveHint)}
            onClick={() => saved && void share()}
            sx={{ py: 1.3 }}
          >
            {copied ? 'Sent a copy ✓' : 'Send a copy (email, Drive, Files…)'}
          </Button>
        ) : null}
        {canShare && shareFailed && (
          <Typography variant="body2" role="status" sx={{ mt: 1 }}>
            This browser couldn&apos;t open its share menu.
          </Typography>
        )}
        {(!canShare || shareFailed) && (
          <Typography variant="body1">
            Email it to yourself, or put it on Google Drive, iCloud or a USB stick. It&apos;s the file you just saved,
            in your Downloads folder.
          </Typography>
        )}
      </Part>

      <Part n={3} level={partLevel} title="Check it works" active={!!saved && checked === undefined}>
        {/* Always there, so the result is announced when it arrives. */}
        <Box role="status" ref={worksRef} tabIndex={checked !== undefined ? -1 : undefined} sx={{ outline: 'none' }}>
          {checked !== undefined && <Done text="It works." sub={backupHoldsLine(checked, records)} />}
        </Box>
        {checked === undefined && (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>
              Open the copy you just saved. We&apos;ll make sure it opens and has everything. Nothing is uploaded.
            </Typography>
            <Button
              variant="outlined"
              size="large"
              fullWidth
              {...softDisabled(!saved || busy, saveHint)}
              onClick={() => saved && !busy && pick.current?.click()}
              startIcon={busy ? <CircularProgress size={18} color="inherit" /> : undefined}
              sx={{ py: 1.3 }}
            >
              Open my saved copy
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
                Save the backup file first.
              </Typography>
            )}
          </>
        )}
        {problem && (
          <Alert severity="warning" variant="outlined" sx={{ mt: 1.5 }}>
            {problem}
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
          This turns on once the check passes.
        </Typography>
      )}
    </Stack>
  );
};
