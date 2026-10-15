// /verify/example — what a record's check page looks like, line by line, with a note on
// what each line means. For a visitor who has no record id yet (the "Verify a record"
// demo on the home page sends them to /verify, which links here).
//
// Nothing here is fetched or checked, and the page says so at the top and in its title.
// Every line is drawn with the grey "reported" mark, never the tick: a tick on made-up
// data would be the thing VeilCore's check page exists to avoid. The legend shows what a
// tick means instead.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Alert, Box, Container, Divider, Paper, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import VerifiedIcon from '@mui/icons-material/VerifiedOutlined';
import LockIcon from '@mui/icons-material/LockOutlined';
import { ACCENT } from '../../config/theme';
import { IS_MAINNET, networkLabel } from '../../config/network';
import { Fact, FactKey } from './DisclosedFacts';
import { GENETICS_LABEL } from '../../veilcore/disclosure';

const Note: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography variant="caption" sx={{ display: 'block', color: ACCENT, pl: 3.25, mt: -0.5, mb: 0.5 }}>
    {children}
  </Typography>
);

export const VerifyExample: React.FC = () => (
  <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
    <Container maxWidth="sm" sx={{ py: { xs: 5, md: 8 } }}>
      <Stack
        component={RouterLink}
        to="/"
        aria-label="VeilCore home"
        direction="row"
        spacing={1.25}
        sx={{
          alignItems: 'center',
          justifyContent: 'center',
          mb: 3,
          mx: 'auto',
          width: 'fit-content',
          minHeight: 44,
          textDecoration: 'none',
          color: 'text.primary',
        }}
      >
        <Box sx={{ width: 12, height: 12, borderRadius: '50%', background: ACCENT, boxShadow: `0 0 14px ${ACCENT}` }} />
        <Typography variant="h6" sx={{ letterSpacing: '0.3em', fontWeight: 600 }}>
          VEILCORE
        </Typography>
      </Stack>

      <Alert severity="info" variant="outlined" sx={{ mb: 3 }}>
        <Typography variant="subtitle2">Example: a made-up record.</Typography>
        <Typography variant="body2">
          This shows what a record&apos;s check page looks like, with a note under each line. Nothing on it was looked
          up or checked.
        </Typography>
      </Alert>

      <Paper sx={{ p: { xs: 3, md: 4 } }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
          <VerifiedIcon sx={{ color: 'text.disabled', fontSize: 30 }} />
          <Box>
            <Typography variant="overline" sx={{ color: 'text.secondary' }}>
              Example · in a sealed batch · anchor reported
            </Typography>
            <Typography variant="h5">Harbour Mist (example)</Typography>
          </Box>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          VEIL-EXAMPLE
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <Stack spacing={1.25}>
          <Fact ok={false}>
            This link was made for fingerprint 3f9a0c41e2b7…, and the registry reports the same fingerprint for this
            record.
          </Fact>
          <Note>
            The fingerprint is in the link itself, so the page can&apos;t be fooled into showing another record&apos;s
            checks.
          </Note>
          <Fact ok={false}>
            Checked in this browser: this fingerprint is in batch 41, and its path folds to the batch root.
          </Fact>
          <Note>On a real record this line has a tick: your own browser checks that the record is in the batch.</Note>
          <Fact ok={false}>
            The registry reports that root was recorded on {networkLabel(IS_MAINNET ? 'mainnet' : 'preprod')}, in a
            transaction it names.
          </Fact>
          <Note>
            That transaction is what dates the record. Look it up on a Midnight explorer, such as midnightexplorer.com,
            before relying on the date.
          </Note>
          <Fact ok={false}>
            Lab report (file SHA-256 7c1e04d2…9b3a51), signature verified in this browser. Signed by a key named
            “Example Lab” (name not checked).
          </Fact>
          <Note>
            A lab can sign its receipt for a sample, and its lab report, with its own key. Each line says which it is.
            The page checks the signature; whether the key is a lab you trust is your call.
          </Note>

          <Divider sx={{ my: 0.5 }} />
          <Typography variant="overline" color="text.secondary" sx={{ display: 'block' }}>
            Shared by the holder · reported by the registry
          </Typography>
          <Fact ok={false}>
            The holder saved a lab report to this record. Its file (SHA-256 7c1e04d2…9b3a51) matches the lab report
            signed by a key named “Example Lab” (name not checked): signature checked in this browser.
          </Fact>
          <Note>The holder chooses which facts appear here. Anything not shared is listed as not shared.</Note>
          <Divider sx={{ my: 0.5 }} />
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <LockIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
            <Typography variant="body2" color="text.disabled">
              {GENETICS_LABEL}
            </Typography>
          </Stack>
        </Stack>

        <Divider sx={{ my: 2.5 }} />
        <Stack spacing={1}>
          <FactKey />
          <Typography variant="body2" color="text.secondary">
            ✓ this page checked the line itself, in your browser. ○ VeilCore&apos;s registry or the holder reports it;
            this page didn&apos;t check it. ⊗ a check failed, or a lab withdrew what it signed.
          </Typography>
        </Stack>
      </Paper>

      <Stack direction="row" spacing={3} sx={{ justifyContent: 'center', mt: 3, flexWrap: 'wrap', rowGap: 1 }}>
        <Box component={RouterLink} to="/verify" sx={{ color: ACCENT, py: 1 }}>
          Check a real record
        </Box>
        <Box component={RouterLink} to="/" sx={{ color: ACCENT, py: 1 }}>
          What is VeilCore?
        </Box>
      </Stack>
    </Container>
  </Box>
);
