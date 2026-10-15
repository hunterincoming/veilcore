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
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import InboxIcon from '@mui/icons-material/MoveToInboxOutlined';
import { useNavigate } from 'react-router-dom';
import {
  attachReceipt,
  arrivalDetailsOf,
  claimTransfer,
  CUSTODY_LIMITS,
  custodyDigest,
  custodyOf,
  custodyProblems,
  custodySubject,
  hasDetails,
  parseShareCode,
  codeMissingLock,
  MISSING_LOCK_WORDS,
  publicFingerprintOf,
  quantityPhrase,
  sameDetails,
  sampleDetailsOf,
  setArrival,
  signReceiptWith,
  type ArrivalDetails,
  type CustodySubject,
  type SampleDetails,
} from '../veilcore/transfers';
import { hydrate, sealReceived, updateReceivedNotes, type StrainRecord } from '../veilcore/records';
import { loadAttester, type AttesterProfile } from '../veilcore/attester-keys';
import {
  deliveryForRecord,
  labChanged,
  markReceiptLinked,
  rememberDelivery,
  type LabDelivery,
} from '../veilcore/lab-results';
import { arrivalLine, custodyDifferences, sampleLine, type LabReceipt } from '../veilcore/custody';
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
const ReceiptStatement: React.FC<{
  subject: CustodySubject;
  attester: AttesterProfile;
  transferId?: string;
  /** The sample details it covers (transfers.ts custodyDigest), when there are any. */
  sample?: SampleDetails;
  arrival?: ArrivalDetails;
}> = ({ subject, attester, transferId, sample, arrival }) => (
  <Box sx={{ p: 1.5, borderRadius: 1, background: 'rgba(22,32,27,0.04)', fontSize: 13 }} data-receipt-statement="">
    <Typography variant="body2">“{receiptWords(subject, transferId)}”</Typography>
    {sample && hasDetails(sample) && (
      <Typography variant="body2" sx={{ mt: 0.5, overflowWrap: 'anywhere' }}>
        <b>The breeder wrote:</b> {sampleLine(sample)}
      </Typography>
    )}
    {arrival && hasDetails(arrival) && (
      <Typography variant="body2" sx={{ mt: 0.5, overflowWrap: 'anywhere' }}>
        <b>On arrival:</b> {arrivalLine(arrival)}
      </Typography>
    )}
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

type ArrivalInput = Record<'sampleId' | 'sealNumber' | 'arrivedOn' | 'condition' | 'labRef', string> & {
  sealIntact: '' | 'yes' | 'no' | 'no-seal';
};

/**
 * The form starts from what the breeder wrote (the lab confirms or corrects each) and what
 * the lab wrote before. Not from the lab's private reference on the plant page ("Only you
 * see this"), and the date isn't filled in: a
 * receipt nobody wrote anything on is signed exactly as before (no sample details, nothing
 * sent to the registry first).
 */
const arrivalStart = (sample: SampleDetails, prior: ArrivalDetails): ArrivalInput => ({
  sampleId: prior.sampleId ?? sample.sampleId ?? '',
  sealNumber: prior.sealNumber ?? sample.sealNumber ?? '',
  sealIntact: prior.sealIntact ?? '',
  arrivedOn: prior.arrivedOn ?? '',
  condition: prior.condition ?? '',
  labRef: prior.labRef ?? '',
});

/** How the sample arrived: the lab confirms or corrects what the breeder wrote. */
const ArrivalForm: React.FC<{ value: ArrivalInput; onChange: (v: ArrivalInput) => void; disabled: boolean }> = ({
  value,
  onChange,
  disabled,
}) => {
  const field = (k: Exclude<keyof ArrivalInput, 'sealIntact'>) => ({
    value: value[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      onChange({ ...value, [k]: e.target.value.slice(0, CUSTODY_LIMITS.arrival[k]) }),
    fullWidth: true,
    size: 'small' as const,
    disabled,
  });
  return (
    <Stack spacing={1.25} data-arrival-form="">
      <Typography variant="subtitle2">How it arrived</Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mt: '0 !important' }}>
        Check the tube or bag. Change anything that isn&apos;t what the breeder wrote. All optional.
      </Typography>
      <TextField label="Sample ID on arrival" {...field('sampleId')} />
      <TextField label="Seal number on arrival" {...field('sealNumber')} />
      <Box>
        <Typography variant="body2" id="seal-intact-label">
          Seal intact?
        </Typography>
        <RadioGroup
          row
          aria-labelledby="seal-intact-label"
          value={value.sealIntact}
          onChange={(e) => onChange({ ...value, sealIntact: e.target.value as ArrivalInput['sealIntact'] })}
        >
          <FormControlLabel value="yes" control={<Radio size="small" />} label="Yes" disabled={disabled} />
          <FormControlLabel value="no" control={<Radio size="small" />} label="No" disabled={disabled} />
          <FormControlLabel value="no-seal" control={<Radio size="small" />} label="No seal" disabled={disabled} />
        </RadioGroup>
      </Box>
      <TextField
        label="Arrived on"
        type="date"
        helperText="The day it reached you."
        slotProps={{ inputLabel: { shrink: true } }}
        {...field('arrivedOn')}
      />
      <TextField
        label="Condition"
        placeholder="e.g. cold, bag dry, roots intact"
        multiline
        maxRows={4}
        {...field('condition')}
      />
      <TextField
        label="Your accession no."
        helperText="Goes on your receipt, so the breeder sees it."
        {...field('labRef')}
      />
    </Stack>
  );
};

/** Sign the receipt, or turn the sample away (signs nothing). Both the dialog and the plant page use it. */
const ReceiptChoice: React.FC<{
  subject: CustodySubject;
  attester: AttesterProfile;
  transferId?: string;
  /**
   * The sample details on this delivery: what the breeder wrote, and what this lab wrote
   * before. Absent where the delivery isn't known here: then the receipt covers none.
   */
  custody?: { sample: SampleDetails; arrival: ArrivalDetails };
  busy: boolean;
  onSign: (arrival?: ArrivalDetails) => void;
  onReject: (reason: 'damaged' | 'wrong-sample') => void;
  /** The dialog's "Don't sign": go to the record without deciding. */
  onLater?: () => void;
}> = ({ subject, attester, transferId, custody, busy, onSign, onReject, onLater }) => {
  const [received, setReceived] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [input, setInput] = useState<ArrivalInput>(() => arrivalStart(custody?.sample ?? {}, custody?.arrival ?? {}));
  const arrival = custody ? arrivalDetailsOf(input) : undefined;
  // A value the registry would refuse (a tab, a hidden character, 31 February) is said here,
  // and nothing is signed until it is fixed: arrivalDetailsOf would otherwise drop it.
  const problems = custody ? custodyProblems('arrival', input) : [];
  const differs = custody && arrival ? custodyDifferences(custody.sample, arrival) : [];
  return (
    <Stack spacing={1.5}>
      {custody && <ArrivalForm value={input} onChange={setInput} disabled={busy} />}
      {problems.length > 0 && (
        <Alert severity="warning" variant="outlined" data-arrival-problem="">
          {problems.map((p) => (
            <Box key={p} component="span" sx={{ display: 'block' }}>
              {p}
            </Box>
          ))}
        </Alert>
      )}
      {differs.length > 0 && (
        <Alert severity="info" variant="outlined" data-arrival-differs="">
          Different from what the breeder wrote. The breeder sees this on your receipt:
          {differs.map((d) => (
            <Box key={d} component="span" sx={{ display: 'block' }}>
              {d}.
            </Box>
          ))}
        </Alert>
      )}
      <Typography variant="body2" color="text.secondary">
        Your key can sign a receipt for this delivery. This is exactly what the receipt says:
      </Typography>
      <ReceiptStatement
        subject={subject}
        attester={attester}
        transferId={transferId}
        sample={custody?.sample}
        arrival={arrival}
      />
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
        <Button variant="contained" onClick={() => onSign(arrival)} disabled={busy || !received || problems.length > 0}>
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

/**
 * Sign the receipt. With sample details on the delivery, the lab's arrival details are
 * stored first, and the receipt is signed over what the lab saw and typed: the breeder's
 * details as shown on this screen and the lab's own entries, normalised as the registry
 * stores them (transfers.ts custodyDigest). Round 2 of the 15 Oct review: it used to sign
 * whatever the registry echoed back, so a registry that changed a value got the lab's
 * signature over something the lab never wrote. Now, if the echo differs from either, nothing
 * is signed.
 */
const signReceipt = async (
  attester: AttesterProfile,
  subject: CustodySubject,
  custody?: { transferId: string; sample: SampleDetails; arrival: ArrivalDetails },
): Promise<Signed> => {
  let digest: string | undefined;
  if (custody && (hasDetails(custody.sample) || hasDetails(custody.arrival))) {
    const problems = custodyProblems('arrival', custody.arrival);
    if (problems.length) return { error: `${problems.join(' ')} Nothing was signed` };
    const shown = sampleDetailsOf(custody.sample);
    const typed = arrivalDetailsOf(custody.arrival);
    const stored = await setArrival(custody.transferId, typed);
    if ('error' in stored) {
      // A registry from before sample details: with nothing from the breeder, sign as before.
      if (!(/can’t keep sample details/.test(stored.error) && !hasDetails(custody.sample))) {
        return { error: `your arrival details weren’t saved (${stored.error}), so nothing was signed` };
      }
    } else {
      if (!sameDetails(stored.arrival, typed) || !sameDetails(stored.sample, shown)) {
        return {
          error:
            'the registry saved sample details different from the ones on this screen, so nothing was signed. Reload the page and check them again',
        };
      }
      digest = await custodyDigest(custody.transferId, shown, typed);
    }
  }
  const out = await signReceiptWith(attester, subject, digest);
  if ('error' in out) return out;
  labChanged();
  return out;
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
  // The delivery's sample details (null while loading; undefined when the registry can't say).
  const [custody, setCustody] = useState<{ sample: SampleDetails; arrival: ArrivalDetails } | null | undefined>(
    transferId ? null : undefined,
  );
  useEffect(() => {
    if (!transferId) return;
    let live = true;
    void custodyOf(transferId).then((c) => {
      if (live) setCustody('error' in c ? undefined : { sample: c.sample, arrival: c.arrival });
    });
    return () => {
      live = false;
    };
  }, [transferId]);

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
  if (subject === null || custody === null)
    return <Typography variant="body2">Checking the breeder&apos;s record…</Typography>;
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
        custody={custody}
        busy={busy}
        onSign={(arrival) => {
          setBusy(true);
          setError(undefined);
          void (async () => {
            const signed = await signReceipt(
              attester,
              subject,
              transferId && custody && arrival ? { transferId, sample: custody.sample, arrival } : undefined,
            );
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
  | {
      step: 'sign';
      subject: CustodySubject;
      attester: AttesterProfile;
      transferId: string;
      /** What the breeder wrote about the sample (the claim's answer). */
      sample: SampleDetails;
    }
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
        : { step: 'sign', subject, attester, transferId, sample: res.sample ?? {} },
    );
  };

  const sign = async (arrival?: ArrivalDetails) => {
    if (stage.step !== 'sign') return;
    setBusy(true);
    setError(null);
    const signed = await signReceipt(
      stage.attester,
      stage.subject,
      arrival ? { transferId: stage.transferId, sample: stage.sample, arrival } : undefined,
    );
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
                custody={{ sample: stage.sample, arrival: {} }}
                busy={busy}
                onSign={(arrival) => void sign(arrival)}
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
