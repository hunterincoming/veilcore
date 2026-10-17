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
  custodyDigestV2,
  custodyOf,
  custodyProblems,
  custodySubject,
  hasDetails,
  labErrorWords,
  parseShareCode,
  codeMissingLock,
  codeMissingOfferKey,
  forgetReceivingCode,
  keepReceivingCode,
  offerKeyForDelivery,
  openDeliveryCustody,
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
import { allRecords, hydrate, RECORDS_KEY, updateReceivedNotes, type StrainRecord } from '../veilcore/records';
import { rowStateOf, vaultReadiness } from '../veilcore/api-store';
import { finishReceiving } from '../veilcore/receive';
import { loadAttester, type AttesterProfile } from '../veilcore/attester-keys';
import {
  deliveryForRecord,
  labChanged,
  markReceiptLinked,
  rememberDelivery,
  type LabDelivery,
} from '../veilcore/lab-results';
import { arrivalLine, custodyDifferences, differenceWords, sampleLine, type LabReceipt } from '../veilcore/custody';
import { LAB_RESULTS_ENABLED } from '../config/network';
import { rich, useT } from '../i18n/app';
import { enT, type Translator } from '../i18n/translate';

/** Opens the header's receive dialog from elsewhere on the page (a lab's first screen). */
export const OPEN_RECEIVE_EVENT = 'veilcore:open-receive';

/**
 * What the lab's receipt says, in words a lab can stand behind. It used to read "I
 * received 1 cuttings of X from record VEIL-…": a lab knows what label was on the
 * package and which code it came under, not what the plant is or which record it is.
 */
export const receiptWords = (subject: CustodySubject, transferId?: string, tr: Translator = enT): string => {
  const qty = quantityPhrase(subject.quantity);
  return tr.t('app.lab.recv.statement', {
    label: subject.cultivar || tr.t('app.lab.recv.unlabelled'),
    qty: qty ? tr.t('app.lab.recv.statementQty', { qty }) : '',
    code: transferId ? tr.t('app.lab.recv.statementCode', { code: transferId }) : '',
  });
};

/** The exact receipt, shown in full before anything is signed. */
const ReceiptStatement: React.FC<{
  subject: CustodySubject;
  attester: AttesterProfile;
  transferId?: string;
  /** The sample details it covers (transfers.ts custodyDigest), when there are any. */
  sample?: SampleDetails;
  arrival?: ArrivalDetails;
}> = ({ subject, attester, transferId, sample, arrival }) => {
  const tr = useT();
  const { t } = tr;
  const b = (c: React.ReactNode) => <b>{c}</b>;
  return (
    <Box sx={{ p: 1.5, borderRadius: 1, background: 'rgba(30,34,39,0.04)', fontSize: 13 }} data-receipt-statement="">
      <Typography variant="body2">{t('app.lab.recv.quoted', { v: receiptWords(subject, transferId, tr) })}</Typography>
      {sample && hasDetails(sample) && (
        <Typography variant="body2" sx={{ mt: 0.5, overflowWrap: 'anywhere' }}>
          {rich(t('app.lab.recv.breederWrote'), { b }, { line: sampleLine(sample, tr) })}
        </Typography>
      )}
      {arrival && hasDetails(arrival) && (
        <Typography variant="body2" sx={{ mt: 0.5, overflowWrap: 'anywhere' }}>
          {rich(t('app.lab.recv.onArrival'), { b }, { line: arrivalLine(arrival, tr) })}
        </Typography>
      )}
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
        {t('app.lab.recv.aboutRecord', { id: subject.sourceRecordId })}
      </Typography>
      <Typography sx={{ fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all' }}>
        {subject.sourceCommitment}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
        {t('app.lab.recv.pointing')}
      </Typography>
      <Typography sx={{ fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all' }}>
        {subject.receivedRecordFingerprint}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
        {t('app.lab.recv.signedByKey', { name: attester.displayName ?? t('app.lab.recv.unnamed') })}
      </Typography>
      <Typography sx={{ fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all' }}>
        {attester.keypair.publicKey}
      </Typography>
    </Box>
  );
};

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
  const { t } = useT();
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
      <Typography variant="subtitle2">{t('app.lab.recv.howArrived')}</Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mt: '0 !important' }}>
        {t('app.lab.recv.checkTube')}
      </Typography>
      <TextField label={t('app.lab.recv.sampleIdOnArrival')} {...field('sampleId')} />
      <TextField label={t('app.lab.recv.sealOnArrival')} {...field('sealNumber')} />
      <Box>
        <Typography variant="body2" id="seal-intact-label">
          {t('app.lab.recv.sealIntactQ')}
        </Typography>
        <RadioGroup
          row
          aria-labelledby="seal-intact-label"
          value={value.sealIntact}
          onChange={(e) => onChange({ ...value, sealIntact: e.target.value as ArrivalInput['sealIntact'] })}
        >
          <FormControlLabel
            value="yes"
            control={<Radio size="small" />}
            label={t('app.lab.recv.yes')}
            disabled={disabled}
          />
          <FormControlLabel
            value="no"
            control={<Radio size="small" />}
            label={t('app.lab.recv.no')}
            disabled={disabled}
          />
          <FormControlLabel
            value="no-seal"
            control={<Radio size="small" />}
            label={t('app.lab.recv.noSeal')}
            disabled={disabled}
          />
        </RadioGroup>
      </Box>
      <TextField
        label={t('app.lab.field.arrivedOn')}
        type="date"
        helperText={t('app.lab.recv.arrivedHelp')}
        slotProps={{ inputLabel: { shrink: true } }}
        {...field('arrivedOn')}
      />
      <TextField
        label={t('app.lab.field.condition')}
        placeholder={t('app.lab.recv.conditionPlaceholder')}
        multiline
        maxRows={4}
        {...field('condition')}
      />
      <TextField
        label={t('app.lab.recv.accession')}
        helperText={t('app.lab.recv.accessionHelp')}
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
  const tr = useT();
  const { t } = tr;
  const [input, setInput] = useState<ArrivalInput>(() => arrivalStart(custody?.sample ?? {}, custody?.arrival ?? {}));
  const arrival = custody ? arrivalDetailsOf(input) : undefined;
  // A value the registry would refuse (a tab, a hidden character, 31 February) is said here,
  // and nothing is signed until it is fixed: arrivalDetailsOf would otherwise drop it.
  const problems = custody ? custodyProblems('arrival', input, tr) : [];
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
          {t('app.lab.recv.differs')}
          {differs.map((d) => (
            <Box key={d} component="span" sx={{ display: 'block' }}>
              {t('app.lab.custody.line', { v: differenceWords(d, tr) })}
            </Box>
          ))}
        </Alert>
      )}
      <Typography variant="body2" color="text.secondary">
        {t('app.lab.recv.exactly')}
      </Typography>
      <ReceiptStatement
        subject={subject}
        attester={attester}
        transferId={transferId}
        sample={custody?.sample}
        arrival={arrival}
      />
      <Typography variant="caption" color="text.secondary">
        {t('app.lab.recv.fingerprintFrom', { id: subject.sourceRecordId })}
      </Typography>
      <FormControlLabel
        control={<Checkbox checked={received} onChange={(e) => setReceived(e.target.checked)} />}
        label={<Typography variant="body2">{t('app.lab.recv.physically')}</Typography>}
      />
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, justifyContent: 'flex-end' }}>
        {onLater && (
          <Button onClick={onLater} disabled={busy}>
            {t('app.lab.recv.dontSign')}
          </Button>
        )}
        <Button variant="contained" onClick={() => onSign(arrival)} disabled={busy || !received || problems.length > 0}>
          {t('app.lab.recv.signWithKey')}
        </Button>
      </Stack>
      {rejecting ? (
        <Stack spacing={1}>
          <Typography variant="body2">{t('app.lab.recv.turnAway')}</Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            <Button variant="outlined" onClick={() => onReject('damaged')} disabled={busy}>
              {t('app.lab.recv.damaged')}
            </Button>
            <Button variant="outlined" onClick={() => onReject('wrong-sample')} disabled={busy}>
              {t('app.lab.recv.wrongSample')}
            </Button>
            <Button onClick={() => setRejecting(false)} disabled={busy}>
              {t('app.common.cancel')}
            </Button>
          </Stack>
        </Stack>
      ) : (
        <Button color="inherit" size="small" onClick={() => setRejecting(true)} sx={{ alignSelf: 'flex-start' }}>
          {t('app.lab.recv.rejected')}
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
 * The delivery's sample details as the lab signs over them. `offerKey` and `salt`: sealed
 * with the delivery's offer key (CONTRACT.md #27), and the salt the breeder's sealed side
 * carries; without them, a delivery made before sample details were sealed.
 */
type SigningCustody = {
  transferId: string;
  sample: SampleDetails;
  arrival: ArrivalDetails;
  offerKey?: string;
  salt?: string;
};

/**
 * Sign the receipt. With sample details on the delivery, the lab's arrival details are
 * stored first, and the receipt is signed over what the lab saw and typed: the breeder's
 * details as shown on this screen and the lab's own entries, normalised as the registry
 * stores them (transfers.ts custodyDigest). Round 2 of the 15 Oct review: it used to sign
 * whatever the registry echoed back, so a registry that changed a value got the lab's
 * signature over something the lab never wrote. Now, if the echo differs from either, nothing
 * is signed.
 *
 * Sealed (CONTRACT.md #27): the arrival details are sealed with the offer key before they
 * are sent, the echo is opened here and compared the same way, and the receipt carries
 * custodyDigestV2 with the breeder's salt as `_sc2_`. The registry can't read either side.
 */
const signReceipt = async (
  attester: AttesterProfile,
  subject: CustodySubject,
  custody?: SigningCustody,
  tr: Translator = enT,
): Promise<Signed> => {
  let digest: string | undefined;
  let format: 1 | 2 = 1;
  const sealed = !!custody?.offerKey && !!custody.salt;
  if (custody && (sealed || hasDetails(custody.sample) || hasDetails(custody.arrival))) {
    const problems = custodyProblems('arrival', custody.arrival, tr);
    if (problems.length) return { error: tr.t('app.lab.recv.nothingSigned', { problems: problems.join(' ') }) };
    const shown = sampleDetailsOf(custody.sample);
    const typed = arrivalDetailsOf(custody.arrival);
    const stored = await setArrival(custody.transferId, typed, custody.offerKey);
    if ('error' in stored) {
      // A registry from before sample details: with nothing from the breeder, sign as before.
      if (!(/can’t keep sample details/.test(stored.error) && !hasDetails(custody.sample))) {
        return { error: tr.t('app.lab.recv.notSaved', { error: stored.error }) };
      }
    } else {
      if (stored.locked || !sameDetails(stored.arrival, typed) || !sameDetails(stored.sample, shown)) {
        return { error: tr.t('app.lab.recv.savedDifferent') };
      }
      if (sealed && custody.salt) {
        if (stored.salt !== custody.salt) return { error: tr.t('app.lab.recv.savedDifferent') };
        digest = await custodyDigestV2(custody.transferId, custody.salt, shown, typed);
        format = 2;
      } else if (!stored.sealed) {
        digest = await custodyDigest(custody.transferId, shown, typed);
      }
    }
  }
  const out = await signReceiptWith(attester, subject, digest, format);
  if ('error' in out) return out;
  labChanged();
  return out;
};

const unlinkedWords = (err: string, tr: Translator) => tr.t('app.lab.recv.unlinked', { error: err });

/** "Link it": for a receipt that is signed but not tied to its delivery yet. */
const LinkReceipt: React.FC<{ delivery: LabDelivery; attestationId: string; onDone: () => void }> = ({
  delivery,
  attestationId,
  onDone,
}) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const tr = useT();
  return (
    <Stack spacing={1.5}>
      <Typography variant="body2">{tr.t('app.lab.recv.linkIntro')}</Typography>
      <Button
        variant="contained"
        disabled={busy}
        sx={{ alignSelf: 'flex-start', minHeight: 44 }}
        onClick={() => {
          setBusy(true);
          setError(undefined);
          void linkReceipt(delivery, attestationId).then((err) => {
            setBusy(false);
            if (err) setError(unlinkedWords(labErrorWords(err, tr), tr));
            else onDone();
          });
        }}
      >
        {busy ? tr.t('app.lab.recv.linking') : tr.t('app.plant.next.link.action')}
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
  const tr = useT();
  const { t } = tr;
  // The delivery's sample details (null while loading; undefined when the registry can't say,
  // or they are sealed and this browser has no key for them).
  const [custody, setCustody] = useState<
    { sample: SampleDetails; arrival: ArrivalDetails; salt?: string; offerKey?: string } | null | undefined
  >(transferId ? null : undefined);
  const [custodyLocked, setCustodyLocked] = useState(false);
  useEffect(() => {
    if (!transferId) return;
    let live = true;
    void custodyOf(transferId).then((c) => {
      if (!live) return;
      setCustodyLocked(!('error' in c) && !!c.locked);
      const offerKey = offerKeyForDelivery(transferId);
      setCustody(
        'error' in c || c.locked
          ? undefined
          : {
              sample: c.sample,
              arrival: c.arrival,
              ...(c.sealed && c.salt && offerKey ? { salt: c.salt, offerKey } : {}),
            },
      );
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
          {t('app.plant.action.linkReceipt')}
        </Typography>
        <LinkReceipt delivery={deliveryOf(record, transferId)} attestationId={toLink} onDone={onDone} />
      </Stack>
    );
  }
  if (!attester) {
    return (
      <Alert severity="info" variant="outlined">
        {t('app.lab.recv.setUpFirst')}
      </Alert>
    );
  }
  // Never over a fingerprint the registry doesn't hold (CONTRACT.md #22).
  if (rowStateOf(RECORDS_KEY, record.id) !== 'open') {
    return (
      <Alert severity="warning" variant="outlined">
        {t('app.sealed.recv.notAccepted')}
      </Alert>
    );
  }
  if (subject === null || custody === null)
    return <Typography variant="body2">{t('app.lab.recv.checking')}</Typography>;
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
        {t('app.plant.action.signReceipt')}
      </Typography>
      {custodyLocked && (
        <Alert severity="info" variant="outlined" data-custody-locked="">
          {t('app.lab.custody.locked')}
        </Alert>
      )}
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
              transferId && custody && arrival ? { transferId, ...custody, arrival } : undefined,
              tr,
            );
            if ('error' in signed) {
              setBusy(false);
              setError(t('app.lab.recv.notRecorded', { error: signed.error }));
              return;
            }
            const err = transferId
              ? await linkReceipt(deliveryOf(record, transferId), signed.attestationId)
              : t('app.lab.recv.noCodeHere');
            setBusy(false);
            if (err) {
              setUnlinked(signed.attestationId);
              setError(unlinkedWords(labErrorWords(err, tr), tr));
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
      /** What the breeder wrote about the sample (the claim's answer, opened with the code's key when sealed). */
      sample: SampleDetails;
      /** Sealed sample details (CONTRACT.md #27): the code's offer key and the breeder's salt. */
      offerKey?: string;
      salt?: string;
      /** Sealed, and the code's key doesn't open them: the receipt can't cover them. */
      locked?: boolean;
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
  const tr = useT();
  const { t } = tr;

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
    if (!code.trim() || busy) return;
    const { transferId, claimCode, resultLock, offerKey } = parseShareCode(code);
    setBusy(true);
    setError(null);
    try {
      // A claim can't be undone or made twice: first make sure the received record can be
      // sealed and saved from this browser (CONTRACT.md #22).
      const ready = await vaultReadiness();
      if (ready === 'locked' || ready === 'unknown' || ready === 'cant-store') {
        setError(
          t(
            ready === 'locked'
              ? 'app.sealed.recv.restoreFirst'
              : ready === 'unknown'
                ? 'app.sealed.recv.cantCheck'
                : 'app.sealed.recv.cantStore',
          ),
        );
        return;
      }
      // Kept until the received record is sealed and accepted: the offer key and the lock
      // are only in the code.
      keepReceivingCode(code);
      const res = await claimTransfer(transferId, claimCode);
      if ('error' in res) {
        const stub = allRecords().some((r) => r.transferId?.toUpperCase() === transferId);
        if (!stub) forgetReceivingCode(transferId);
        setError(labErrorWords(res.error, tr));
        return;
      }
      // Also kept in this browser (and its backup), so this lab can send lab reports back
      // even if the record's copy is missing (lab-results.ts). Before sealing: the lock is
      // kept even if the record can't be finished now.
      rememberDelivery({
        transferId,
        receivedRecordId: res.recordId,
        sourceRecordId: res.descendedFrom,
        ...(res.parentCommitment ? { sourceCommitment: res.parentCommitment } : {}),
        ...(resultLock ? { recipient: resultLock } : {}),
        receivedAt: Date.now(),
      });
      await hydrate();
      // The registry leaves only a stub (the name, where it came from); what the sender said
      // about the material is in their sealed offer, opened here with the code's key, and the
      // received record is sealed with the recipient's own commitment and saved. Nothing goes
      // further until the registry has accepted it.
      const out = await finishReceiving(res.recordId, code, res, tr);
      if ('error' in out) {
        setStage({
          step: 'refused',
          recordId: res.recordId,
          reason: t('app.sealed.recv.notFinished', { error: out.error }),
        });
        return;
      }
      const sealed = out.record;
      const notOpened = out.offer === 'unopened' ? t('app.sealed.recv.notOpened') : null;

      const attester = loadAttester();
      if (!attester) {
        if (notOpened) setStage({ step: 'refused', recordId: res.recordId, reason: notOpened });
        else finish(res.recordId);
        return;
      }
      const subject = custodySubject({
        receivedRecordId: res.recordId,
        sealed,
        claim: res,
        publicFingerprint: sealed.receivedFrom ? await publicFingerprintOf(sealed.receivedFrom) : null,
      });
      if (notOpened && !('refuse' in subject)) setError(notOpened);
      // The breeder's sample details: sealed with the offer key in the code (CONTRACT.md #27),
      // or plain fields on a delivery made before.
      const sent = res.sampleSealed
        ? await openDeliveryCustody(transferId, res.sampleSealed, undefined, offerKey)
        : { sample: res.sample ?? {}, sealed: false as const };
      setStage(
        'refuse' in subject
          ? { step: 'refused', recordId: res.recordId, reason: [notOpened, subject.refuse].filter(Boolean).join(' ') }
          : {
              step: 'sign',
              subject,
              attester,
              transferId,
              sample: sent.sample,
              ...('salt' in sent && sent.salt && offerKey ? { salt: sent.salt, offerKey } : {}),
              ...('locked' in sent && sent.locked ? { locked: true } : {}),
            },
      );
    } catch (e) {
      setError(t('app.sealed.recv.failed', { error: e instanceof Error ? e.message : String(e) }));
    } finally {
      setBusy(false);
    }
  };

  const sign = async (arrival?: ArrivalDetails) => {
    if (stage.step !== 'sign') return;
    setBusy(true);
    setError(null);
    const signed = await signReceipt(
      stage.attester,
      stage.subject,
      arrival
        ? {
            transferId: stage.transferId,
            sample: stage.sample,
            arrival,
            ...(stage.offerKey && stage.salt ? { offerKey: stage.offerKey, salt: stage.salt } : {}),
          }
        : undefined,
      tr,
    );
    if ('error' in signed) {
      setBusy(false);
      setError(t('app.lab.recv.receivedNotRecorded', { error: signed.error }));
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
      setError(unlinkedWords(labErrorWords(err, tr), tr));
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
          {t('app.lab.recv.title')}
        </Button>
      )}

      <Dialog open={open} onClose={close} maxWidth="sm" fullWidth>
        <DialogTitle>
          {stage.step === 'sign'
            ? t('app.lab.recv.signTitle')
            : stage.step === 'unlinked'
              ? t('app.plant.action.linkReceipt')
              : t('app.lab.recv.title')}
        </DialogTitle>
        <DialogContent>
          {stage.step === 'code' && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {t('app.lab.recv.intro')}
              </Typography>
              <TextField
                label={t('app.lab.recv.codeLabel')}
                placeholder="TR-XXXXXXXX.xxxxxxxx…"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void claim();
                }}
                fullWidth
                slotProps={{ htmlInput: { style: { fontFamily: 'monospace', letterSpacing: 1 } } }}
              />
              {codeMissingOfferKey(code) && (
                <Alert severity="warning" variant="outlined" data-missing-offer-key="">
                  {t('app.sealed.recv.missingKey')}
                </Alert>
              )}
              {LAB_RESULTS_ENABLED && codeMissingLock(code) && (
                <Alert severity="warning" variant="outlined" data-missing-lock="">
                  {t('app.lab.recv.missingLock')}
                </Alert>
              )}
            </Stack>
          )}

          {stage.step === 'sign' && (
            <Box sx={{ pt: 1 }}>
              {stage.locked && (
                <Alert severity="info" variant="outlined" sx={{ mb: 1.5 }} data-custody-locked="">
                  {t('app.lab.custody.locked')}
                </Alert>
              )}
              <ReceiptChoice
                subject={stage.subject}
                attester={stage.attester}
                transferId={stage.transferId}
                custody={stage.locked ? undefined : { sample: stage.sample, arrival: {} }}
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
              {t('app.lab.recv.refused', { reason: stage.reason })}
            </Alert>
          )}

          {error && (
            <Alert severity="warning" variant="outlined" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              {t('app.lab.recv.onlyConfirm')}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          {stage.step === 'code' && (
            <>
              <Button onClick={close}>{t('app.common.cancel')}</Button>
              <Button variant="contained" onClick={() => void claim()} disabled={busy || !code.trim()}>
                {t('app.lab.recv.receiveIt')}
              </Button>
            </>
          )}
          {(stage.step === 'refused' || stage.step === 'unlinked') && (
            <Button variant={stage.step === 'refused' ? 'contained' : 'text'} onClick={() => finish(stage.recordId)}>
              {t('app.lab.recv.goToRecord')}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};
