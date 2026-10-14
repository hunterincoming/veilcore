// Save the one-file backup, put a copy somewhere else, and check the copy opens.
//
// The step is done only when a saved copy is opened and read back (backup.ts). A checkbox
// saying "I saved it" was clicked without saving in the field data this replaced
// (Höltervennhoff et al., USENIX Security 2024: 28,093 "Confirm" clicks, ~11,555 saves).
// "Somewhere safe" became real places: on a phone, the share sheet sends the file to
// email, Drive or Files; elsewhere, plain words say where.
// SPDX-License-Identifier: Apache-2.0

import React, { useRef, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import DoneIcon from '@mui/icons-material/CheckCircle';
import { backupContents, backupFileName, checkBackup, downloadBackupAll } from '../../veilcore/backup';

const Done: React.FC<{ text: string; sub?: string }> = ({ text, sub }) => (
  <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
    <DoneIcon color="primary" />
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

const Part: React.FC<React.PropsWithChildren<{ n: number; title: string; active: boolean }>> = ({
  n,
  title,
  active,
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
    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
      {n}. {title}
    </Typography>
    {children}
  </Box>
);

export const BackupStep: React.FC<{ title: string; finishLabel: string; onDone: () => void }> = ({
  title,
  finishLabel,
  onDone,
}) => {
  const [saved, setSaved] = useState<string>();
  const [copied, setCopied] = useState(false);
  const [checked, setChecked] = useState<number>();
  const [problem, setProblem] = useState<string>();
  const [busy, setBusy] = useState(false);
  const pick = useRef<HTMLInputElement>(null);

  const fileForSharing = (): File =>
    new File([JSON.stringify(backupContents(), null, 2)], backupFileName(), { type: 'application/json' });
  const canShare = (() => {
    try {
      return typeof navigator !== 'undefined' && !!navigator.canShare?.({ files: [fileForSharing()] });
    } catch {
      return false;
    }
  })();

  const share = async () => {
    try {
      await navigator.share({ files: [fileForSharing()], title: 'VeilCore backup' });
      setCopied(true);
    } catch {
      /* closed the share sheet: nothing to say */
    }
  };

  const check = async (f: File) => {
    setBusy(true);
    setProblem(undefined);
    const r = await checkBackup(f);
    setBusy(false);
    if (r.ok) setChecked(r.records);
    else setProblem(r.reason);
  };

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="h4" component="h1" sx={{ fontSize: { xs: '1.8rem', md: '2.2rem' } }}>
          {title}
        </Typography>
        <Typography variant="body1" sx={{ mt: 0.5 }}>
          <b>This file is the only way to prove you hold your plants</b>, and to get them back on a new phone or
          computer. VeilCore can&apos;t recover it or make another.
        </Typography>
      </Box>

      <Part n={1} title="Save it" active={!saved}>
        {saved ? (
          <Done text="Saved" sub={`${saved} · one file for everything`} />
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

      <Part n={2} title="Put a copy somewhere else" active={!!saved && !copied && checked === undefined}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>
          If this phone or computer breaks, that copy is your way back.
        </Typography>
        {canShare ? (
          <Button
            variant="outlined"
            size="large"
            fullWidth
            disabled={!saved}
            onClick={() => void share()}
            sx={{ py: 1.3 }}
          >
            {copied ? 'Sent a copy ✓' : 'Send a copy (email, Drive, Files…)'}
          </Button>
        ) : (
          <Typography variant="body1">
            Email it to yourself, or put it on Google Drive, iCloud or a USB stick.
          </Typography>
        )}
      </Part>

      <Part n={3} title="Check it works" active={!!saved && checked === undefined}>
        {checked !== undefined ? (
          <Done
            text="It works."
            sub={
              checked === 0
                ? 'Your records are in it.'
                : checked === 1
                  ? 'Your plant is in it.'
                  : `All ${checked} of your plants are in it.`
            }
          />
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>
              Open the copy you just saved. We&apos;ll make sure it opens and has everything. Nothing is uploaded.
            </Typography>
            <Button
              variant="outlined"
              size="large"
              fullWidth
              disabled={!saved || busy}
              onClick={() => pick.current?.click()}
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
        disabled={checked === undefined}
        onClick={onDone}
        sx={{ py: 1.6 }}
      >
        {finishLabel}
      </Button>
      {checked === undefined && (
        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
          This turns on once the check passes.
        </Typography>
      )}
    </Stack>
  );
};
