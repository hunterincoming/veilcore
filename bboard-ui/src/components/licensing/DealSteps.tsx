// A license's steps, one line each, the current one marked (steps.ts), and a short "how this
// works" kept closed until asked for. The current step's own controls go under it, so a
// person reads one instruction and has one button.
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import { Alert, Box, Button, Collapse, Stack, TextField, Typography } from '@mui/material';
import CheckIcon from '@mui/icons-material/CheckCircle';
import NowIcon from '@mui/icons-material/ArrowForwardOutlined';
import LaterIcon from '@mui/icons-material/RadioButtonUncheckedOutlined';
import type { Step } from './steps';
import { useT } from '../../i18n/app';

export const DealSteps: React.FC<{ steps: readonly Step[]; children?: React.ReactNode }> = ({ steps, children }) => {
  const tr = useT();
  return (
    <Box component="ol" sx={{ listStyle: 'none', p: 0, m: 0 }} data-deal-steps="">
      {steps.map((s, i) => (
        <Box
          component="li"
          key={s.title}
          data-step-state={s.state}
          aria-current={s.state === 'now' ? 'step' : undefined}
          sx={{ py: 0.75 }}
        >
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'flex-start' }}>
            {s.state === 'done' ? (
              <CheckIcon fontSize="small" color="success" aria-label={tr.t('app.lic.ui.done')} sx={{ mt: 0.25 }} />
            ) : s.state === 'now' ? (
              <NowIcon fontSize="small" aria-label={tr.t('app.lic.ui.now')} sx={{ mt: 0.25 }} />
            ) : (
              <LaterIcon
                fontSize="small"
                aria-label={tr.t('app.lic.ui.later')}
                sx={{ mt: 0.25, color: 'text.disabled' }}
              />
            )}
            <Typography
              variant="body1"
              sx={{
                fontWeight: s.state === 'now' ? 700 : 400,
                color: s.state === 'later' ? 'text.secondary' : 'text.primary',
              }}
            >
              {i + 1}. {s.title}
            </Typography>
          </Stack>
          {s.state === 'now' && children && <Box sx={{ pl: { xs: 0, sm: 4 }, pt: 1.25, pb: 0.5 }}>{children}</Box>}
        </Box>
      ))}
    </Box>
  );
};

/** The why, for whoever wants it: closed until asked. */
export const HowItWorks: React.FC<{ children: React.ReactNode; label?: string }> = ({ children, label }) => {
  const tr = useT();
  const [open, setOpen] = useState(false);
  return (
    <Box>
      <Button size="small" color="inherit" onClick={() => setOpen(!open)} aria-expanded={open} sx={{ px: 0 }}>
        {open ? tr.t('app.lic.ui.hide') : (label ?? tr.t('app.lic.ui.how'))}
      </Button>
      <Collapse in={open}>
        <Typography variant="body2" color="text.secondary" sx={{ pb: 1 }}>
          {children}
        </Typography>
      </Collapse>
    </Box>
  );
};

/** The one thing to do now, or whose turn it is. */
export const NextUp: React.FC<{ text: string; yours: boolean }> = ({ text, yours }) => {
  const tr = useT();
  return (
    <Alert
      severity={yours ? 'warning' : 'info'}
      variant={yours ? 'standard' : 'outlined'}
      data-next-up={yours ? 'yours' : 'theirs'}
    >
      <b>{yours ? tr.t('app.lic.ui.yourTurn') : tr.t('app.lic.ui.theirTurn')}</b>
      {text}
    </Alert>
  );
};

/**
 * An action that can't be undone, confirmed on the page rather than in a browser pop-up (a
 * pop-up is blocked in some in-app browsers and easy to tap through on a phone). With
 * `reason`, the confirm asks for one.
 */
export const ConfirmInline: React.FC<{
  label: string;
  question: string;
  confirmLabel: string;
  disabled?: boolean;
  reason?: string;
  onConfirm: (reason: string) => void;
}> = ({ label, question, confirmLabel, disabled, reason, onConfirm }) => {
  const tr = useT();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  if (!open)
    return (
      <Button
        color="error"
        variant="text"
        disabled={disabled}
        onClick={() => setOpen(true)}
        sx={{ alignSelf: 'flex-start' }}
      >
        {label}
      </Button>
    );
  return (
    <Alert severity="error" variant="outlined" data-confirm-inline="">
      <Typography variant="body2" sx={{ mb: 1 }}>
        {question}
      </Typography>
      {reason && (
        <TextField
          size="small"
          fullWidth
          label={reason}
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 200))}
          sx={{ mb: 1 }}
        />
      )}
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
        <Button
          color="error"
          variant="contained"
          disabled={disabled}
          onClick={() => {
            setOpen(false);
            onConfirm(text.trim());
          }}
        >
          {confirmLabel}
        </Button>
        <Button color="inherit" onClick={() => setOpen(false)}>
          {tr.t('app.lic.ui.keepIt')}
        </Button>
      </Stack>
    </Alert>
  );
};
