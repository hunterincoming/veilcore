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
  OFFER_NOTE_MAX,
  OFFER_QUANTITY_MAX,
  rememberSentCode,
  sampleDetailsOf,
  sentCodeFor,
  shareCodeFor,
  labErrorWords,
  recipientName,
  type SampleDetails,
  type SentTransfer,
} from '../veilcore/transfers';
import { sampleLine } from '../veilcore/custody';
import { LAB_RESULTS_ENABLED } from '../config/network';
import { labChanged } from '../veilcore/lab-results';
import { ensureKeys } from '../veilcore/record-keys';
import { resultRecipientFor } from '../veilcore/lab-results';
import { integrityOf, type StrainRecord } from '../veilcore/records';
import { rich, useRecordT, useT } from '../i18n/app';
import { recordTitle } from '../veilcore/animal-profile';

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
  // The code was made, but the sealed sample details weren't stored (transfers.ts offerTransfer).
  const [sampleError, setSampleError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const tr = useRecordT(record);
  const { t } = tr;

  // A value the registry would refuse (a line break, a hidden character, 31 February) is
  // said under the form, and the code isn't made until it is fixed.
  const problems = custodyProblems('sample', sample, tr);

  // A record that doesn't match its fingerprint isn't sent (api-store.ts).
  const mismatch = integrityOf(record.id) === 'mismatch';

  const send = async () => {
    if (!handle.trim() || problems.length || mismatch) return;
    setBusy(true);
    setError(null);
    const res = await offerTransfer(record, handle.trim(), {
      quantity: quantity.trim() || undefined,
      note: note.trim() || undefined,
      sample,
    });
    if ('error' in res) setError(labErrorWords(res.error, tr));
    else {
      // This delivery's own lock goes in the code, so the lab can send lab reports back
      // that only this plant's holder can open (lab-results.ts). Not where lab reports are
      // off (config/network.ts): a code with a lock would promise something the registry
      // can't do there.
      const lock = LAB_RESULTS_ENABLED
        ? await resultRecipientFor(ensureKeys(record.id).recordSecret, res.transferId).catch(() => undefined)
        : undefined;
      // The offer key opens what the code's receiver learns about the plant; only the code carries it.
      const code = shareCodeFor(res.transferId, res.claimCode, lock, res.offerKey);
      // Kept here (and in the backup): the registry can't show the code again.
      rememberSentCode(code);
      setSampleError(res.sampleError ?? null);
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
    setSampleError(null);
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
          {t('app.plant.next.sample.action')}
        </Button>
      )}

      <Dialog open={open} onClose={reset} maxWidth="sm" fullWidth>
        <DialogTitle>
          {transferId ? t('app.lab.send.ready') : t('app.lab.send.title', { name: recordTitle(record) })}
        </DialogTitle>
        <DialogContent>
          {transferId ? (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Alert severity="success" variant="outlined">
                {t(LAB_RESULTS_ENABLED ? 'app.lab.send.giveWithResults' : 'app.lab.send.give', { handle })}
              </Alert>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 1,
                  background: 'rgba(30,34,39,0.04)',
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
                  {copied ? t('app.lab.send.copied') : t('app.lab.send.copy')}
                </Button>
                {canShare && <ShareCodeButton code={transferId} name={recordTitle(record)} />}
              </Stack>
              <Alert severity="warning" variant="outlined">
                {rich(t('app.lab.send.dontWrite'), { b: (c) => <b>{c}</b> })}
              </Alert>
              {sampleError && (
                <Alert severity="warning" variant="outlined" data-sample-not-saved="">
                  {t('app.lab.send.sampleNotSaved', { error: labErrorWords(sampleError, tr) })}
                </Alert>
              )}
              {!sampleError && sampleLine(sampleDetailsOf(sample)) && (
                <Typography variant="body2" data-sample-sent="">
                  {rich(
                    t('app.lab.send.labWillCheck'),
                    { b: (c) => <b>{c}</b> },
                    { line: sampleLine(sampleDetailsOf(sample), tr) },
                  )}
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary">
                {t('app.lab.send.nothingYet')}
              </Typography>
            </Stack>
          ) : (
            <Stack spacing={2} sx={{ pt: 1 }}>
              {mismatch && (
                <Alert severity="error" variant="outlined" data-integrity="mismatch">
                  {t('app.sealed.mismatch')}
                </Alert>
              )}
              <Typography variant="body2" color="text.secondary">
                {t('app.lab.send.intro')}
              </Typography>
              <TextField
                label={t('app.lab.send.who')}
                helperText={t('app.lab.send.whoHelp')}
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                fullWidth
              />
              <TextField
                label={t('app.lab.send.quantity')}
                placeholder={t('app.lab.send.quantityPlaceholder')}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value.slice(0, OFFER_QUANTITY_MAX))}
                helperText={
                  quantity.length >= OFFER_QUANTITY_MAX * 0.8
                    ? t('app.lab.send.count', { n: quantity.length, max: OFFER_QUANTITY_MAX })
                    : undefined
                }
                slotProps={{ htmlInput: { maxLength: OFFER_QUANTITY_MAX } }}
                fullWidth
              />
              <TextField
                label={t('app.lab.send.note')}
                helperText={
                  // The registry holds the offer only up to a size (transfers.ts OFFER_MAX_BYTES);
                  // capping the note here means a code is never refused after it was typed.
                  note.length >= OFFER_NOTE_MAX * 0.8
                    ? `${t('app.lab.send.noteHelp')} ${t('app.lab.send.count', { n: note.length, max: OFFER_NOTE_MAX })}`
                    : t('app.lab.send.noteHelp')
                }
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, OFFER_NOTE_MAX))}
                slotProps={{ htmlInput: { maxLength: OFFER_NOTE_MAX } }}
                fullWidth
              />
              {showSample ? (
                <Stack spacing={1.5} data-sample-details="">
                  <Typography variant="subtitle2">{t('app.lab.send.sample')}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: '0 !important' }}>
                    {t('app.lab.send.sampleHelp')}
                  </Typography>
                  <TextField label={t('app.lab.send.sampleId')} {...sampleField('sampleId')} />
                  <TextField label={t('app.lab.send.sealNumber')} {...sampleField('sealNumber')} />
                  <TextField
                    label={t('app.lab.field.takenFrom')}
                    helperText={t('app.lab.send.takenFromHelp')}
                    {...sampleField('takenFrom')}
                  />
                  <TextField
                    label={t('app.lab.field.takenOn')}
                    type="date"
                    slotProps={{ inputLabel: { shrink: true } }}
                    {...sampleField('takenOn')}
                  />
                  <TextField
                    label={t('app.lab.send.witness')}
                    helperText={t('app.lab.send.witnessHelp')}
                    {...sampleField('witness')}
                  />
                </Stack>
              ) : (
                <Button size="small" onClick={() => setShowSample(true)} sx={{ alignSelf: 'flex-start' }}>
                  {t('app.lab.send.addSample')}
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
          <Button onClick={reset}>{transferId ? t('app.backup.done') : t('app.common.cancel')}</Button>
          {!transferId && (
            <Button
              variant="contained"
              onClick={send}
              disabled={busy || !handle.trim() || problems.length > 0 || mismatch}
            >
              {t('app.lab.send.make')}
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

const ShareCodeButton: React.FC<{ code: string; name: string }> = ({ code, name }) => {
  const { t } = useT();
  return (
    <Button
      size="small"
      variant="outlined"
      startIcon={<ShareIcon />}
      sx={{ flex: 1, minHeight: 40 }}
      onClick={() => {
        // Cancelling the share sheet rejects; nothing to tell anyone.
        navigator.share({ title: t('app.lab.send.shareTitle', { name }), text: code }).catch(() => undefined);
      }}
    >
      {t('app.lab.send.share')}
    </Button>
  );
};

/**
 * "Sent to <handle>, waiting" on the breeder's plant page, for codes nobody has used yet,
 * with the code shown again when this browser (or the backup it came from) has it.
 */
export const WaitingDeliveries: React.FC<{ open: readonly SentTransfer[] }> = ({ open }) => {
  const [shown, setShown] = useState<string>();
  const tr = useT();
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
                  {shown === t.id ? tr.t('app.lab.send.hide') : tr.t('app.lab.send.showAgain')}
                </Button>
              ) : undefined
            }
          >
            {rich(
              tr.t('app.lab.send.waiting'),
              { b: (c) => <b>{c}</b> },
              { handle: recipientName(t, tr), date: tr.date(t.created_at) },
            )}
            {t.sample_custody && tr.t('app.lab.send.waitingSample', { line: sampleLine(t.sample_custody, tr) })}
            {!code && tr.t('app.lab.send.otherBrowser')}
            {shown === t.id && code && (
              <Box sx={{ mt: 1 }}>
                <Box
                  sx={{
                    p: 1.25,
                    borderRadius: 1,
                    background: 'rgba(30,34,39,0.04)',
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
                    {tr.t('app.lab.send.copy')}
                  </Button>
                  {typeof navigator.share === 'function' && <ShareCodeButton code={code} name={recipientName(t, tr)} />}
                </Stack>
              </Box>
            )}
          </Alert>
        );
      })}
    </Stack>
  );
};
