// Sending a cultivar to a lab or another breeder.
//
// This is where a record stops being the holder's own claim. When the recipient
// confirms receipt, the attestation is recorded against their key — which is the single
// biggest increase in what the record is worth as evidence, and the only way to get one.
//
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SendIcon from '@mui/icons-material/SendOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopyOutlined';
import { offerTransfer, shareCodeFor } from '../veilcore/transfers';
import { ensureKeys } from '../veilcore/record-keys';
import { resultRecipientFor } from '../veilcore/lab-results';
import type { StrainRecord } from '../veilcore/records';

export const SendToLab: React.FC<{
  record: StrainRecord;
  /** Draw the opener yourself (the plant page's action list); default is a button. */
  trigger?: (open: () => void) => React.ReactNode;
}> = ({ record, trigger }) => {
  const [open, setOpen] = useState(false);
  const [handle, setHandle] = useState('');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [transferId, setTransferId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const send = async () => {
    if (!handle.trim()) return;
    setBusy(true);
    setError(null);
    const res = await offerTransfer(record.id, handle.trim(), {
      quantity: quantity.trim() || undefined,
      note: note.trim() || undefined,
    });
    if ('error' in res) setError(res.error);
    else {
      // The plant's lock goes in the code, so the lab can send results back that only
      // this plant's holder can open (lab-results.ts).
      const lock = await resultRecipientFor(ensureKeys(record.id).recordSecret).catch(() => undefined);
      setTransferId(shareCodeFor(res.transferId, res.claimCode, lock));
    }
    setBusy(false);
  };

  const reset = () => {
    setOpen(false);
    setTransferId(null);
    setHandle('');
    setQuantity('');
    setNote('');
    setError(null);
  };

  const copyCode = async () => {
    if (!transferId) return;
    await navigator.clipboard.writeText(transferId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {trigger ? (
        trigger(() => setOpen(true))
      ) : (
        <Button variant="outlined" startIcon={<SendIcon />} onClick={() => setOpen(true)}>
          Send to a lab
        </Button>
      )}

      <Dialog open={open} onClose={reset} maxWidth="sm" fullWidth>
        <DialogTitle>{transferId ? 'Ready to send' : `Send ${record.strainName}`}</DialogTitle>
        <DialogContent>
          {transferId ? (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Alert severity="success" variant="outlined">
                Give this code to {handle}. When they enter it, they confirm they received the material, and that
                confirmation is added to your record. It also lets a lab send results back that only you can open.
              </Alert>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 1,
                  background: 'rgba(22,32,27,0.04)',
                  fontFamily: 'monospace',
                  fontSize: 20,
                  textAlign: 'center',
                  letterSpacing: 1,
                  wordBreak: 'break-all',
                }}
              >
                {transferId}
              </Box>
              <Button size="small" variant="outlined" startIcon={<ContentCopyIcon />} onClick={copyCode}>
                {copied ? 'Copied' : 'Copy code'}
              </Button>
              <Alert severity="warning" variant="outlined">
                <b>Text or email it to them. Don&apos;t write it on the package:</b> whoever has this code can confirm
                the delivery.
              </Alert>
              <Typography variant="caption" color="text.secondary">
                Nothing has changed yet. The transfer completes when they enter the code; until then your record is
                unchanged. They can paste it into the box on VeilCore&apos;s Home.
              </Typography>
            </Stack>
          ) : (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                They get their own record of what they received, linked to yours. When they confirm receipt, it is
                recorded under their key, not yours: a second party on your record.
              </Typography>
              <TextField
                label="Who are you sending it to?"
                helperText="A name or handle for them, so you both know which transfer this is."
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                fullWidth
              />
              <TextField
                label="Quantity (optional)"
                placeholder="e.g. 10 cuttings"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                fullWidth
              />
              <TextField label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} fullWidth />
              {error && (
                <Alert severity="warning" variant="outlined">
                  {error}
                </Alert>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={reset}>{transferId ? 'Done' : 'Cancel'}</Button>
          {!transferId && (
            <Button variant="contained" onClick={send} disabled={busy || !handle.trim()}>
              Create transfer
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};
