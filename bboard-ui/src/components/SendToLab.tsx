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
import ShareIcon from '@mui/icons-material/IosShareOutlined';
import {
  CUSTODY_LIMITS,
  custodyProblems,
  offerTransfer,
  rememberSentCode,
  sampleDetailsOf,
  sentCodeFor,
  shareCodeFor,
  userFacingError,
  type SampleDetails,
  type SentTransfer,
} from '../veilcore/transfers';
import { sampleLine } from '../veilcore/custody';
import { LAB_RESULTS_ENABLED } from '../config/network';
import { labChanged } from '../veilcore/lab-results';
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
  // The sample's chain of custody (transfers.ts SampleDetails), all optional.
  const [sample, setSample] = useState<Record<keyof SampleDetails, string>>(EMPTY_SAMPLE);
  const [showSample, setShowSample] = useState(false);
  const [busy, setBusy] = useState(false);
  const [transferId, setTransferId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // A value the registry would refuse (a line break, a hidden character, 31 February) is
  // said under the form, and the code isn't made until it is fixed.
  const problems = custodyProblems('sample', sample);

  const send = async () => {
    if (!handle.trim() || problems.length) return;
    setBusy(true);
    setError(null);
    const res = await offerTransfer(record.id, handle.trim(), {
      quantity: quantity.trim() || undefined,
      note: note.trim() || undefined,
      sample,
    });
    if ('error' in res) setError(userFacingError(res.error));
    else {
      // This delivery's own lock goes in the code, so the lab can send lab reports back
      // that only this plant's holder can open (lab-results.ts). Not where lab reports are
      // off (config/network.ts): a code with a lock would promise something the registry
      // can't do there.
      const lock = LAB_RESULTS_ENABLED
        ? await resultRecipientFor(ensureKeys(record.id).recordSecret, res.transferId).catch(() => undefined)
        : undefined;
      const code = shareCodeFor(res.transferId, res.claimCode, lock);
      // Kept here (and in the backup): the registry can't show the code again.
      rememberSentCode(code);
      setTransferId(code);
      labChanged();
    }
    setBusy(false);
  };

  const reset = () => {
    setOpen(false);
    setTransferId(null);
    setHandle('');
    setQuantity('');
    setNote('');
    setSample(EMPTY_SAMPLE);
    setShowSample(false);
    setError(null);
  };
  const sampleField = (k: keyof SampleDetails) => ({
    value: sample[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setSample({ ...sample, [k]: e.target.value.slice(0, CUSTODY_LIMITS.sample[k]) }),
    fullWidth: true,
    size: 'small' as const,
  });

  const copyCode = async () => {
    if (!transferId) return;
    await navigator.clipboard.writeText(transferId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

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
                Give this lab code to {handle}. When they enter it, they can sign that the sample arrived
                {LAB_RESULTS_ENABLED ? ', and send a lab report back that only you can open' : ''}.
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
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<ContentCopyIcon />}
                  onClick={() => void copyCode()}
                  sx={{ flex: 1, minHeight: 40 }}
                >
                  {copied ? 'Copied' : 'Copy code'}
                </Button>
                {canShare && <ShareCodeButton code={transferId} name={record.strainName} />}
              </Stack>
              <Alert severity="warning" variant="outlined">
                <b>Text or email it to them. Don&apos;t write it on the package:</b> whoever has this lab code can
                confirm the delivery.
              </Alert>
              {sampleLine(sampleDetailsOf(sample)) && (
                <Typography variant="body2" data-sample-sent="">
                  <b>The lab will check:</b> {sampleLine(sampleDetailsOf(sample))}.
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary">
                Nothing has changed yet. Your plant&apos;s page shows “waiting” until they enter the code, and can show
                this code again. They paste it into the box on VeilCore&apos;s Home.
              </Typography>
            </Stack>
          ) : (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                They get their own record of what they received, linked to yours. When they sign that it arrived, it is
                signed with their key, not yours: a second party on your record.
              </Typography>
              <TextField
                label="Who are you sending it to?"
                helperText="A name or handle for them, so you both know which delivery this is."
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
              <TextField
                label="Note for the lab (optional)"
                helperText="Only the lab sees it, once they enter the code."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                fullWidth
              />
              {showSample ? (
                <Stack spacing={1.5} data-sample-details="">
                  <Typography variant="subtitle2">The sample (optional)</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: '0 !important' }}>
                    The lab checks these when it arrives and confirms or corrects each one. Its signed receipt covers
                    what you wrote and what it found.
                  </Typography>
                  <TextField label="Sample ID / label on the tube or bag" {...sampleField('sampleId')} />
                  <TextField label="Seal or bag number" {...sampleField('sealNumber')} />
                  <TextField
                    label="Taken from"
                    helperText="The mother plant or its location tag."
                    {...sampleField('takenFrom')}
                  />
                  <TextField
                    label="Taken on"
                    type="date"
                    slotProps={{ inputLabel: { shrink: true } }}
                    {...sampleField('takenOn')}
                  />
                  <TextField
                    label="Witness (optional)"
                    helperText="Who saw it taken and sealed. VeilCore doesn’t check this."
                    {...sampleField('witness')}
                  />
                </Stack>
              ) : (
                <Button size="small" onClick={() => setShowSample(true)} sx={{ alignSelf: 'flex-start' }}>
                  Add the sample&apos;s label and seal (optional)
                </Button>
              )}
              {problems.length > 0 && (
                <Alert severity="warning" variant="outlined" data-sample-problem="">
                  {problems.map((p) => (
                    <Box key={p} component="span" sx={{ display: 'block' }}>
                      {p}
                    </Box>
                  ))}
                </Alert>
              )}
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
            <Button variant="contained" onClick={send} disabled={busy || !handle.trim() || problems.length > 0}>
              Make a code for the lab
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};

const EMPTY_SAMPLE: Record<keyof SampleDetails, string> = {
  sampleId: '',
  sealNumber: '',
  takenFrom: '',
  takenOn: '',
  witness: '',
};

const ShareCodeButton: React.FC<{ code: string; name: string }> = ({ code, name }) => (
  <Button
    size="small"
    variant="outlined"
    startIcon={<ShareIcon />}
    sx={{ flex: 1, minHeight: 40 }}
    onClick={() => {
      // Cancelling the share sheet rejects; nothing to tell anyone.
      navigator.share({ title: `Lab code for ${name}`, text: code }).catch(() => undefined);
    }}
  >
    Share
  </Button>
);

/**
 * "Sent to <handle>, waiting" on the breeder's plant page, for codes nobody has used yet,
 * with the code shown again when this browser (or the backup it came from) has it.
 */
export const WaitingDeliveries: React.FC<{ open: readonly SentTransfer[] }> = ({ open }) => {
  const [shown, setShown] = useState<string>();
  if (open.length === 0) return null;
  return (
    <Stack spacing={1}>
      {open.map((t) => {
        const code = sentCodeFor(t.id);
        return (
          <Alert
            key={t.id}
            severity="info"
            variant="outlined"
            icon={<SendIcon />}
            action={
              code ? (
                <Button
                  color="inherit"
                  onClick={() => setShown(shown === t.id ? undefined : t.id)}
                  sx={{ minHeight: 40 }}
                >
                  {shown === t.id ? 'Hide' : 'Show code again'}
                </Button>
              ) : undefined
            }
          >
            <b>Sent to {t.to_handle}, waiting</b> since {new Date(t.created_at).toLocaleDateString()}.
            {t.sample_custody && ` ${sampleLine(t.sample_custody)}.`}
            {!code && ' This code was made in another browser and isn’t in this one; make a new one if it’s lost.'}
            {shown === t.id && code && (
              <Box sx={{ mt: 1 }}>
                <Box
                  sx={{
                    p: 1.25,
                    borderRadius: 1,
                    background: 'rgba(22,32,27,0.04)',
                    fontFamily: 'monospace',
                    wordBreak: 'break-all',
                  }}
                >
                  {code}
                </Box>
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<ContentCopyIcon />}
                    onClick={() => void navigator.clipboard.writeText(code)}
                    sx={{ minHeight: 40 }}
                  >
                    Copy code
                  </Button>
                  {typeof navigator.share === 'function' && <ShareCodeButton code={code} name={t.to_handle} />}
                </Stack>
              </Box>
            )}
          </Alert>
        );
      })}
    </Stack>
  );
};
