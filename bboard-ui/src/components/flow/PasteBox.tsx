// "Someone sent you a code or link? Paste it here." One box; the app works out what it is
// (veilcore/paste.ts) and opens the screen for it.
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { recognise } from '../../veilcore/paste';
import { OPEN_RECEIVE_EVENT } from '../ClaimTransfer';
import { useRecords } from '../../veilcore/records';
import { useRecordKeys } from '../../veilcore/record-keys';

export const PasteBox: React.FC = () => {
  const [value, setValue] = useState('');
  const [problem, setProblem] = useState<string>();
  const [choose, setChoose] = useState<string>(); // a proof request, waiting for "which plant?"
  const navigate = useNavigate();
  const records = useRecords();
  const keys = useRecordKeys();
  const provable = records.filter((r) => keys[r.id]?.anchor);

  const go = () => {
    setProblem(undefined);
    setChoose(undefined);
    const p = recognise(value);
    switch (p.kind) {
      case 'delivery':
        window.dispatchEvent(new CustomEvent(OPEN_RECEIVE_EVENT, { detail: { code: p.code } }));
        setValue('');
        return;
      case 'record-link':
      case 'agreement-to-sign':
      case 'prove-link':
        void navigate(p.path);
        return;
      case 'prove-request':
        if (provable.length === 1) void navigate(`/record/${provable[0].id}?prove=${p.challenge}`);
        else if (provable.length > 1) setChoose(p.challenge);
        else
          setProblem(
            "That's a request to prove you hold a plant, but none of the plants on this device has a date stamp yet. On a new device? Get your plants back from your backup first.",
          );
        return;
      case 'unknown':
        setProblem("That doesn't look like a VeilCore code or link. Copy the whole thing they sent you and try again.");
    }
  };

  return (
    <Paper sx={{ p: { xs: 2, md: 2.5 } }}>
      <Typography
        component="label"
        htmlFor="paste-box"
        variant="subtitle1"
        sx={{ fontWeight: 700, display: 'block', mb: 1 }}
      >
        Someone sent you a code or link?
      </Typography>
      <Stack direction="row" spacing={1}>
        <TextField
          id="paste-box"
          placeholder="Paste it here"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') go();
          }}
          fullWidth
          size="medium"
        />
        <Button variant="contained" onClick={go} disabled={!value.trim()} sx={{ minWidth: 72 }}>
          Go
        </Button>
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
        A delivery code, a record link, a request to prove a plant, or an agreement to sign. We&apos;ll work out which.
      </Typography>
      {problem && (
        <Alert severity="info" variant="outlined" sx={{ mt: 1.5 }}>
          {problem}
        </Alert>
      )}
      {choose && (
        <Box sx={{ mt: 1.5 }}>
          <Typography variant="body1" sx={{ fontWeight: 700, mb: 1 }}>
            That&apos;s a request to prove you hold a plant. Which one did they ask about?
          </Typography>
          <Stack spacing={1}>
            {provable.map((r) => (
              <Button
                key={r.id}
                variant="outlined"
                onClick={() => void navigate(`/record/${r.id}?prove=${choose}`)}
                sx={{ justifyContent: 'flex-start', minHeight: 48 }}
              >
                {r.strainName}
              </Button>
            ))}
          </Stack>
        </Box>
      )}
    </Paper>
  );
};
