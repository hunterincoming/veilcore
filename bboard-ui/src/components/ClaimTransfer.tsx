// Receiving a cultivar.
//
// Claiming records that someone holding the sender's code took delivery. A recipient
// with an attester key can then sign a chain-of-custody confirmation about the record
// they received from — their own statement, which is what makes it evidence.
//
// The lab sees exactly what it signs, and signs only when it says so (attack round D).
// The signature used to be made straight after the claim, over a source commitment the
// registry chose, with the dialog saying only "Confirm receipt": a registry that lied
// could get a vetted lab's signature over any record. Now the claim and the signature
// are two steps; the second shows the source record, its full fingerprint and the
// lab's own key, refuses if the registry's answers about the source disagree, and
// reports a signature that was not recorded instead of discarding the result.
//
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import InboxIcon from '@mui/icons-material/MoveToInboxOutlined';
import { useNavigate } from 'react-router-dom';
import {
  attachReceipt,
  claimTransfer,
  custodySubject,
  parseShareCode,
  codeMissingLock,
  MISSING_LOCK_WORDS,
  publicFingerprintOf,
  quantityPhrase,
  type CustodySubject,
} from '../veilcore/transfers';
import { hydrate, sealReceived, updateReceivedNotes, type StrainRecord } from '../veilcore/records';
import { loadAttester, attestRecord, type AttesterProfile } from '../veilcore/attester-keys';
import {
  deliveryForRecord,
  labChanged,
  markReceiptLinked,
  rememberDelivery,
  type LabDelivery,
} from '../veilcore/lab-results';
import type { LabReceipt } from '../veilcore/custody';
import { LAB_RESULTS_ENABLED } from '../config/network';

/** Opens the header's receive dialog from elsewhere on the page (a lab's first screen). */
export const OPEN_RECEIVE_EVENT = 'veilcore:open-receive';

/**
 * What the lab's receipt says, in words a lab can stand behind. It used to read "I
 * received 1 cuttings of X from record VEIL-…": a lab knows what label was on the
 * package and which code it came under, not what the plant is or which record it is.
 */
export const receiptWords = (subject: CustodySubject, transferId?: string): string => {
  const qty = quantityPhrase(subject.quantity);
  return `A sample labelled “${subject.cultivar || 'unlabelled'}”${qty ? ` (${qty}, as the breeder wrote it)` : ''} arrived${transferId ? ` under lab code ${transferId}` : ''}.`;
};

/** The exact receipt, shown in full before anything is signed. */
const ReceiptStatement: React.FC<{ subject: CustodySubject; attester: AttesterProfile; transferId?: string }> = ({
  subject,
  attester,
  transferId,
}) => (
  <Box sx={{ p: 1.5, borderRadius: 1, background: 'rgba(22,32,27,0.04)', fontSize: 13 }}>
    <Typography variant="body2">“{receiptWords(subject, transferId)}”</Typography>
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
      About the breeder&apos;s record {subject.sourceRecordId}, fingerprint
    </Typography>
    <Typography sx={{ fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all' }}>
      {subject.sourceCommitment}
    </Typography>
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
      Pointing at your received record
    </Typography>
    <Typography sx={{ fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all' }}>
      {subject.receivedRecordFingerprint}
    </Typography>
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
      Signed by your key ({attester.displayName ?? 'unnamed'})
    </Typography>
    <Typography sx={{ fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all' }}>
      {attester.keypair.publicKey}
    </Typography>
  </Box>
);

/** Sign the receipt, or turn the sample away (signs nothing). Both the dialog and the plant page use it. */
const ReceiptChoice: React.FC<{
  subject: CustodySubject;
  attester: AttesterProfile;
  transferId?: string;
  busy: boolean;
  onSign: () => void;
  onReject: (reason: 'damaged' | 'wrong-sample') => void;
  /** The dialog's "Don't sign": go to the record without deciding. */
  onLater?: () => void;
}> = ({ subject, attester, transferId, busy, onSign, onReject, onLater }) => {
  const [received, setReceived] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" color="text.secondary">
        Your key can sign a receipt for this delivery. This is exactly what the receipt says:
      </Typography>
      <ReceiptStatement subject={subject} attester={attester} transferId={transferId} />
      <Typography variant="caption" color="text.secondary">
        The fingerprint came from the registry and matches what its public page reports for {subject.sourceRecordId}. If
        the breeder gave you a fingerprint, compare it before signing.
      </Typography>
      <FormControlLabel
        control={<Checkbox checked={received} onChange={(e) => setReceived(e.target.checked)} />}
        label={<Typography variant="body2">I physically received this material.</Typography>}
      />
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, justifyContent: 'flex-end' }}>
        {onLater && (
          <Button onClick={onLater} disabled={busy}>
            Don&apos;t sign
          </Button>
        )}
        <Button variant="contained" onClick={onSign} disabled={busy || !received}>
          Sign with my key
        </Button>
      </Stack>
      {rejecting ? (
        <Stack spacing={1}>
          <Typography variant="body2">
            Turn it away? Nothing is signed and the breeder isn&apos;t told by VeilCore: let them know yourself.
          </Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            <Button variant="outlined" onClick={() => onReject('damaged')} disabled={busy}>
              It arrived damaged
            </Button>
            <Button variant="outlined" onClick={() => onReject('wrong-sample')} disabled={busy}>
              It&apos;s the wrong sample
            </Button>
            <Button onClick={() => setRejecting(false)} disabled={busy}>
              Cancel
            </Button>
          </Stack>
        </Stack>
      ) : (
        <Button color="inherit" size="small" onClick={() => setRejecting(true)} sx={{ alignSelf: 'flex-start' }}>
          Received but rejected (damaged or wrong sample)
        </Button>
      )}
    </Stack>
  );
};

/** What this browser knows about the delivery a received record came from. */
const deliveryOf = (record: StrainRecord, transferId: string): LabDelivery =>
  deliveryForRecord(record.id) ?? {
    transferId,
    receivedRecordId: record.id,
    ...(record.receivedFrom ? { sourceRecordId: record.receivedFrom } : {}),
    ...(record.receivedFromCommitment ? { sourceCommitment: record.receivedFromCommitment } : {}),
    ...(record.resultLock ? { recipient: record.resultLock } : {}),
    receivedAt: record.receivedAt ?? Date.now(),
  };

/**
 * Tie a signed receipt to its delivery (round 3). Until it is tied, the breeder's page
 * doesn't call it a receipt: a signature over a public fingerprint is something anyone
 * can make; tying it to the delivery needs the key that used the lab code.
 */
const linkReceipt = async (delivery: LabDelivery, attestationId: string): Promise<string | null> => {
  const out = await attachReceipt(delivery.transferId, attestationId);
  if ('error' in out) return out.error;
  markReceiptLinked(delivery, attestationId);
  labChanged();
  return null;
};

type Signed = { attestationId: string } | { error: string };

const signReceipt = async (attester: AttesterProfile, subject: CustodySubject): Promise<Signed> => {
  const out = await attestRecord(
    attester,
    subject.sourceCommitment,
    subject.receivedRecordFingerprint,
    'chain-of-custody',
  );
  if (out.error || !out.attestationId) return { error: out.error ?? 'no answer from the registry' };
  labChanged();
  return { attestationId: out.attestationId };
};

const unlinkedWords = (err: string) =>
  `Your receipt is signed, but it couldn’t be linked to this delivery (${err}), so the breeder can’t see it yet. Try again, or link it later from the plant’s page.`;

/** "Link it": for a receipt that is signed but not tied to its delivery yet. */
const LinkReceipt: React.FC<{ delivery: LabDelivery; attestationId: string; onDone: () => void }> = ({
  delivery,
  attestationId,
  onDone,
}) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  return (
    <Stack spacing={1.5}>
      <Typography variant="body2">
        Your receipt is signed. Link it to this delivery so the breeder sees it: until then their page doesn&apos;t
        count it, because anyone can sign a statement about a plant, but only whoever used the lab code can link one to
        the delivery.
      </Typography>
      <Button
        variant="contained"
        disabled={busy}
        sx={{ alignSelf: 'flex-start', minHeight: 44 }}
        onClick={() => {
          setBusy(true);
          setError(undefined);
          void linkReceipt(delivery, attestationId).then((err) => {
            setBusy(false);
            if (err) setError(unlinkedWords(err));
            else onDone();
          });
        }}
      >
        {busy ? 'Linking…' : 'Link it'}
      </Button>
      {error && (
        <Alert severity="warning" variant="outlined">
          {error}
        </Alert>
      )}
    </Stack>
  );
};

const rejectReceipt = (recordId: string, reason: 'damaged' | 'wrong-sample') => {
  updateReceivedNotes(recordId, { receiptRejected: { reason, at: Date.now() } });
  labChanged();
};

/** The plant page's "Sign receipt", for a lab that didn't sign when it received the sample. */
export const SignReceiptPanel: React.FC<{
  record: StrainRecord;
  /** The lab's own receipt as the plant page read it; a signed, unlinked one is linked here. */
  receipt?: LabReceipt | null;
  onDone: () => void;
}> = ({ record, receipt, onDone }) => {
  const attester = loadAttester();
  const [subject, setSubject] = useState<CustodySubject | { refuse: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  // Signed here, but not linked to the delivery: the next step is linking, not signing again.
  const [unlinked, setUnlinked] = useState<string>();
  const transferId = record.transferId ?? deliveryForRecord(record.id)?.transferId;

  useEffect(() => {
    if (!record.receivedFrom) return;
    let live = true;
    void publicFingerprintOf(record.receivedFrom).then((publicFingerprint) => {
      if (!live) return;
      setSubject(
        custodySubject({
          receivedRecordId: record.id,
          sealed: record,
          claim: { descendedFrom: record.receivedFrom ?? '' },
          publicFingerprint,
        }),
      );
    });
    return () => {
      live = false;
    };
  }, [record]);

  const toLink = unlinked ?? (receipt?.kind === 'signed' && !receipt.linked ? receipt.attestationId : undefined);
  if (toLink && transferId) {
    return (
      <Stack spacing={2}>
        <Typography variant="h5" component="h2" tabIndex={-1} data-screen-heading="">
          Link your receipt
        </Typography>
        <LinkReceipt delivery={deliveryOf(record, transferId)} attestationId={toLink} onDone={onDone} />
      </Stack>
    );
  }
  if (!attester) {
    return (
      <Alert severity="info" variant="outlined">
        Set up your lab&apos;s signature first; then you can sign that this sample arrived.
      </Alert>
    );
  }
  if (subject === null) return <Typography variant="body2">Checking the breeder&apos;s record…</Typography>;
  if ('refuse' in subject) {
    return (
      <Alert severity="warning" variant="outlined">
        {subject.refuse}
      </Alert>
    );
  }
  return (
    <Stack spacing={2}>
      <Typography variant="h5" component="h2" tabIndex={-1} data-screen-heading="">
        Sign receipt
      </Typography>
      <ReceiptChoice
        subject={subject}
        attester={attester}
        transferId={record.transferId}
        busy={busy}
        onSign={() => {
          setBusy(true);
          setError(undefined);
          void (async () => {
            const signed = await signReceipt(attester, subject);
            if ('error' in signed) {
              setBusy(false);
              setError(`Your receipt was not recorded: ${signed.error}.`);
              return;
            }
            const err = transferId
              ? await linkReceipt(deliveryOf(record, transferId), signed.attestationId)
              : 'this plant has no lab code on this device';
            setBusy(false);
            if (err) {
              setUnlinked(signed.attestationId);
              setError(unlinkedWords(err));
            } else onDone();
          })();
        }}
        onReject={(reason) => {
          rejectReceipt(record.id, reason);
          onDone();
        }}
      />
      {error && (
        <Alert severity="warning" variant="outlined">
          {error}
        </Alert>
      )}
    </Stack>
  );
};

type Stage =
  | { step: 'code' }
  | { step: 'sign'; subject: CustodySubject; attester: AttesterProfile; transferId: string }
  | { step: 'unlinked'; delivery: LabDelivery; attestationId: string; recordId: string }
  | { step: 'refused'; recordId: string; reason: string };

export const ClaimTransfer: React.FC<{
  variant?: 'button' | 'text';
  /** Mounted for the paste box only: no button of its own (a breeder's header). */
  hideButton?: boolean;
}> = ({ variant = 'text', hideButton }) => {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>({ step: 'code' });
  const navigate = useNavigate();

  // One dialog, in the header, which stays mounted while the page under it changes (a
  // lab's first screen gives way to its records list the moment a transfer is claimed).
  useEffect(() => {
    // The paste box sends the code it recognised, so nobody types it twice.
    const show = (e: Event) => {
      const pasted = (e as CustomEvent<{ code?: string } | undefined>).detail?.code;
      if (pasted) setCode(pasted);
      setOpen(true);
    };
    window.addEventListener(OPEN_RECEIVE_EVENT, show);
    return () => window.removeEventListener(OPEN_RECEIVE_EVENT, show);
  }, []);

  const close = () => {
    setOpen(false);
    setStage({ step: 'code' });
    setError(null);
  };

  const finish = (recordId: string) => {
    close();
    setCode('');
    void navigate(`/record/${recordId}`);
  };

  const claim = async () => {
    if (!code.trim()) return;
    const { transferId, claimCode, resultLock } = parseShareCode(code);
    setBusy(true);
    setError(null);
    const res = await claimTransfer(transferId, claimCode);
    if ('error' in res) {
      setError(res.error);
      setBusy(false);
      return;
    }
    await hydrate();
    // Seal the received record with the recipient's own commitment. They are not
    // copying the sender's evidence — they are committing to what they received:
    // this material, this quantity, this date, from this source. The breeder's note and
    // lock are kept beside it, outside the fingerprint, in the lab's own set.
    const sealed = await sealReceived(res.recordId, {
      ...(res.note ? { deliveryNote: res.note.slice(0, 2000) } : {}),
      ...(resultLock ? { resultLock } : {}),
    });
    // Also kept in this browser (and its backup), so this lab can send lab reports back
    // even if the record's copy is missing (lab-results.ts).
    rememberDelivery({
      transferId,
      receivedRecordId: res.recordId,
      sourceRecordId: res.descendedFrom,
      ...(sealed?.receivedFromCommitment ? { sourceCommitment: sealed.receivedFromCommitment } : {}),
      ...(resultLock ? { recipient: resultLock } : {}),
      receivedAt: Date.now(),
    });

    const attester = loadAttester();
    if (!attester) {
      setBusy(false);
      finish(res.recordId);
      return;
    }
    const subject = custodySubject({
      receivedRecordId: res.recordId,
      sealed,
      claim: res,
      publicFingerprint: sealed?.receivedFrom ? await publicFingerprintOf(sealed.receivedFrom) : null,
    });
    setBusy(false);
    setStage(
      'refuse' in subject
        ? { step: 'refused', recordId: res.recordId, reason: subject.refuse }
        : { step: 'sign', subject, attester, transferId },
    );
  };

  const sign = async () => {
    if (stage.step !== 'sign') return;
    setBusy(true);
    setError(null);
    const signed = await signReceipt(stage.attester, stage.subject);
    if ('error' in signed) {
      setBusy(false);
      setError(
        `Delivery received, but your signed receipt was not recorded: ${signed.error}. You can sign it later from the plant’s page.`,
      );
      return;
    }
    // Tie it to the delivery, so the breeder's page counts it (round 3).
    const recordId = stage.subject.receivedRecordId;
    const delivery = deliveryForRecord(recordId) ?? {
      transferId: stage.transferId,
      receivedRecordId: recordId,
      receivedAt: Date.now(),
    };
    const err = await linkReceipt(delivery, signed.attestationId);
    setBusy(false);
    if (err) {
      setStage({ step: 'unlinked', delivery, attestationId: signed.attestationId, recordId });
      setError(unlinkedWords(err));
      return;
    }
    finish(recordId);
  };

  return (
    <>
      {!hideButton && (
        <Button
          variant={variant === 'button' ? 'outlined' : 'text'}
          startIcon={<InboxIcon />}
          onClick={() => setOpen(true)}
        >
          Receive material
        </Button>
      )}

      <Dialog open={open} onClose={close} maxWidth="sm" fullWidth>
        <DialogTitle>
          {stage.step === 'sign'
            ? 'Sign what you received?'
            : stage.step === 'unlinked'
              ? 'Link your receipt'
              : 'Receive material'}
        </DialogTitle>
        <DialogContent>
          {stage.step === 'code' && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Enter the lab code the breeder gave you. You get your own record of what you received, linked to theirs,
                and the registry records that someone holding this code took delivery. If you have a signing key, you
                see exactly what you would sign before anything is signed.
              </Typography>
              <TextField
                label="Lab code"
                placeholder="TR-XXXXXXXX.xxxxxxxx…"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void claim();
                }}
                fullWidth
                slotProps={{ htmlInput: { style: { fontFamily: 'monospace', letterSpacing: 1 } } }}
              />
              {LAB_RESULTS_ENABLED && codeMissingLock(code) && (
                <Alert severity="warning" variant="outlined" data-missing-lock="">
                  {MISSING_LOCK_WORDS}
                </Alert>
              )}
            </Stack>
          )}

          {stage.step === 'sign' && (
            <Box sx={{ pt: 1 }}>
              <ReceiptChoice
                subject={stage.subject}
                attester={stage.attester}
                transferId={stage.transferId}
                busy={busy}
                onSign={() => void sign()}
                onReject={(reason) => {
                  rejectReceipt(stage.subject.receivedRecordId, reason);
                  finish(stage.subject.receivedRecordId);
                }}
                onLater={() => finish(stage.subject.receivedRecordId)}
              />
            </Box>
          )}

          {stage.step === 'unlinked' && (
            <Box sx={{ pt: 1 }}>
              <LinkReceipt
                delivery={stage.delivery}
                attestationId={stage.attestationId}
                onDone={() => finish(stage.recordId)}
              />
            </Box>
          )}

          {stage.step === 'refused' && (
            <Alert severity="warning" variant="outlined" sx={{ mt: 1 }}>
              The delivery is received and your record created. {stage.reason}
            </Alert>
          )}

          {error && (
            <Alert severity="warning" variant="outlined" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Only confirm what you actually received. This is a statement other people will rely on.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          {stage.step === 'code' && (
            <>
              <Button onClick={close}>Cancel</Button>
              <Button variant="contained" onClick={() => void claim()} disabled={busy || !code.trim()}>
                Receive it
              </Button>
            </>
          )}
          {(stage.step === 'refused' || stage.step === 'unlinked') && (
            <Button variant={stage.step === 'refused' ? 'contained' : 'text'} onClick={() => finish(stage.recordId)}>
              Go to the record
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};
