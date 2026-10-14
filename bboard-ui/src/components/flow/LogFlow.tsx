// Logging a plant, one thing per screen: the plant → check it → seal and date stamp →
// (lab report) → save the backup and check it → the plant's page.
//
// Why this order (docs/simple-flow.md):
//   - a check-your-answers screen comes before the one action that can't be undone;
//   - sealing and the date stamp are one button: two buttons for one intent is a chance to
//     stop halfway;
//   - the backup comes last, so it holds everything, including a lab report's pairing salt
//     (a backup saved before the pairing would not). Until it is checked, the record's
//     keys live in this browser and Home says "Finish: save your backup". A browser that
//     won't keep them (a private window) is asked for the backup BEFORE the date stamp.
//   - saving the file is not the same as having it: the step ends only when the saved copy
//     is opened and read back (backup.ts, checkBackup).
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import LockIcon from '@mui/icons-material/LockOutlined';
import DoneIcon from '@mui/icons-material/CheckCircleOutlined';
import { useNavigate } from 'react-router-dom';
import { fingerprintFile, fingerprintRecord, newNonce } from '../../veilcore/commitment';
import { allRecords, createRecord, type ParentRef } from '../../veilcore/records';
import { PLANT_VARIETY_PROFILE } from '../../veilcore/envelope';
import { ensureKeys, hexBytes, keysFor, setAnchor, storageKeeps, useRecordKeys } from '../../veilcore/record-keys';
import { CHAIN_CONTRACT, REAL_CHAIN, chainNotReady } from '../../veilcore/chain/config';
import { NETWORK } from '../../config/network';
import { identityOf } from '../../veilcore/chain/identity';
import { useChainCall } from '../chain/useChainCall';
import { Step2PairDna } from '../wizard/Step2PairDna';
import { AppHeader } from '../AppHeader';
import { BackupStep } from './BackupStep';
import { FlowFrame } from './FlowFrame';
import { OUR_SERVER, DATED_ON } from '../../config/copy';

/** Today on the person's own calendar, not UTC: at 9pm in New Jersey it is still today. */
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const BREEDING_METHODS = [
  'Seed — F1',
  'Seed — F2',
  'Seed — selfed (S1)',
  'Seed — backcross',
  'Clone / cutting',
  'Tissue culture',
  'Selection',
  'Landrace / heirloom',
  'Other',
];

type Draft = {
  strainName: string;
  bredBy: string;
  dateCreated: string;
  parents: ParentRef[];
  taxon: string;
  breedingMethod: string;
  refId: string;
  notes: string;
  photos: File[];
};

const emptyDraft = (): Draft => ({
  strainName: '',
  bredBy: '',
  dateCreated: today(),
  parents: [],
  taxon: '',
  breedingMethod: '',
  refId: '',
  notes: '',
  photos: [],
});

type Screen = 'plant' | 'review' | 'stamp' | 'report' | 'backup';

export const LogFlow: React.FC = () => {
  const [screen, setScreen] = useState<Screen>('plant');
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [recordId, setRecordId] = useState<string>();
  const navigate = useNavigate();

  const body = (() => {
    switch (screen) {
      case 'plant':
        return <PlantForm draft={draft} setDraft={setDraft} onNext={() => setScreen('review')} />;
      case 'review':
        return (
          <Review
            draft={draft}
            onChange={() => setScreen('plant')}
            onSealed={(id) => {
              setRecordId(id);
              setScreen('stamp');
            }}
          />
        );
      case 'stamp':
        return recordId ? <Stamp recordId={recordId} onNext={() => setScreen('report')} /> : null;
      case 'report':
        return recordId ? (
          <Step2PairDna
            recordId={recordId}
            onBack={() => setScreen('stamp')}
            onDone={() => setScreen('backup')}
            onSkip={() => setScreen('backup')}
            doneLabel="Next: save your backup"
            intro={
              <Alert severity="info" variant="outlined">
                <b>Optional.</b> Already have a lab report for this plant? Add it now and it&apos;s kept with the
                record. No report yet? Skip. You can add one any time from the plant&apos;s page.
              </Alert>
            }
          />
        ) : null;
      case 'backup':
        return (
          <BackupStep
            title="Save your backup"
            finishLabel="Finish"
            onDone={() => (recordId ? navigate(`/record/${recordId}`) : navigate('/records'))}
          />
        );
    }
  })();

  const step = {
    plant: 'Step 1 of 3',
    review: 'Step 1 of 3',
    stamp: 'Step 2 of 3',
    report: 'Optional',
    backup: 'Step 3 of 3',
  }[screen];

  return (
    <Box>
      <AppHeader />
      <FlowFrame section="log" step={step}>
        {body}
      </FlowFrame>
    </Box>
  );
};

// ---------------------------------------------------------------------------------------

const PlantForm: React.FC<{ draft: Draft; setDraft: (d: Draft) => void; onNext: () => void }> = ({
  draft,
  setDraft,
  onNext,
}) => {
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft({ ...draft, [k]: v });
  const hasMore = Boolean(
    draft.parents.length || draft.taxon || draft.breedingMethod || draft.refId || draft.notes || draft.photos.length,
  );
  const [more, setMore] = useState(hasMore);
  const photoRef = useRef<HTMLInputElement>(null);
  const parentOptions: ParentRef[] = allRecords().map((r) => ({ recordId: r.id, name: r.strainName }));
  const ready = draft.strainName.trim() && draft.bredBy.trim();

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h4" component="h1" sx={{ fontSize: { xs: '1.8rem', md: '2.2rem' } }}>
          Log your plant
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Fill in what you know. You&apos;ll check it on the next screen.
        </Typography>
      </Box>
      <TextField
        label="Plant or line name"
        required
        placeholder="e.g. Harbour Mist"
        value={draft.strainName}
        onChange={(e) => set('strainName', e.target.value)}
        fullWidth
        autoFocus
      />
      <TextField
        label="Bred by"
        required
        placeholder="Your name or business"
        value={draft.bredBy}
        onChange={(e) => set('bredBy', e.target.value)}
        fullWidth
      />
      <TextField
        label="When you made it (your own note)"
        type="date"
        value={draft.dateCreated}
        onChange={(e) => set('dateCreated', e.target.value)}
        helperText="The public date stamp comes from the network. This is just what you tell people."
        slotProps={{ inputLabel: { shrink: true } }}
        fullWidth
      />

      <Box>
        <Button variant="text" onClick={() => setMore(!more)} sx={{ px: 0 }}>
          {more ? '− Fewer details' : '+ Add parents, species, photos or notes'}
        </Button>
        <Collapse in={more}>
          <Stack spacing={2.5} sx={{ pt: 1.5 }}>
            <Autocomplete<ParentRef, true, false, true>
              multiple
              freeSolo
              options={parentOptions}
              getOptionLabel={(o) => (typeof o === 'string' ? o : o.name)}
              value={draft.parents}
              onChange={(_, val) =>
                set(
                  'parents',
                  val.map((v) => (typeof v === 'string' ? { name: v } : v)),
                )
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Parents"
                  helperText="Pick a plant you've logged, or type a name and press Enter."
                />
              )}
            />
            <TextField
              label="Species"
              placeholder="e.g. Solanum lycopersicum"
              value={draft.taxon}
              onChange={(e) => set('taxon', e.target.value)}
              fullWidth
            />
            <TextField
              select
              label="How it was made"
              value={draft.breedingMethod}
              onChange={(e) => set('breedingMethod', e.target.value)}
              fullWidth
            >
              <MenuItem value="">Not saying</MenuItem>
              {BREEDING_METHODS.map((m) => (
                <MenuItem key={m} value={m}>
                  {m}
                </MenuItem>
              ))}
            </TextField>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Button variant="outlined" onClick={() => photoRef.current?.click()}>
                Add photos
              </Button>
              {draft.photos.length > 0 && (
                <Chip
                  label={`${draft.photos.length} photo${draft.photos.length === 1 ? '' : 's'}`}
                  variant="outlined"
                />
              )}
              <input
                ref={photoRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => {
                  set('photos', [...draft.photos, ...Array.from(e.target.files ?? [])]);
                  e.target.value = '';
                }}
              />
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Photos stay on your device. Only their fingerprints are kept.
            </Typography>
            <TextField
              label="Your own lot or reference number"
              value={draft.refId}
              onChange={(e) => set('refId', e.target.value)}
              fullWidth
            />
            <TextField
              label="Notes"
              value={draft.notes}
              onChange={(e) => set('notes', e.target.value)}
              multiline
              minRows={2}
              fullWidth
            />
          </Stack>
        </Collapse>
      </Box>

      <Button variant="contained" size="large" fullWidth disabled={!ready} onClick={onNext} sx={{ py: 1.6 }}>
        Next: check it
      </Button>
      {!ready && (
        <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
          A name and who bred it are all you need.
        </Typography>
      )}
    </Stack>
  );
};

// ---------------------------------------------------------------------------------------

const Line: React.FC<{ k: string; v: string; empty?: boolean; onChange: () => void; action?: string }> = ({
  k,
  v,
  empty,
  onChange,
  action = 'Change',
}) => (
  <Stack
    direction="row"
    spacing={2}
    sx={{ alignItems: 'center', py: 1.2, borderBottom: '1px solid', borderColor: 'divider' }}
  >
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary">
        {k}
      </Typography>
      <Typography
        variant="body1"
        sx={{ fontWeight: 700, color: empty ? 'text.secondary' : undefined, wordBreak: 'break-word' }}
      >
        {v}
      </Typography>
    </Box>
    <Button variant="text" onClick={onChange}>
      {action}
    </Button>
  </Stack>
);

const Review: React.FC<{ draft: Draft; onChange: () => void; onSealed: (id: string) => void }> = ({
  draft,
  onChange,
  onSealed,
}) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const seal = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const loggedAt = Date.now();
      const photoFingerprints = await Promise.all(draft.photos.map((f) => fingerprintFile(f)));
      // The nonce is committed with the record and stored on it: without it nobody could
      // recompute the commitment, so the record would be unverifiable by anyone.
      const nonce = newNonce();
      const fields = {
        nonce,
        strainName: draft.strainName.trim(),
        bredBy: draft.bredBy.trim(),
        dateCreated: draft.dateCreated,
        notes: draft.notes.trim(),
        loggedAt,
        parents: draft.parents,
        breedingMethod: draft.breedingMethod,
        photoFingerprints,
        refId: draft.refId.trim(),
        profile: PLANT_VARIETY_PROFILE,
        taxon: draft.taxon.trim() || undefined,
      };
      const recordFingerprint = await fingerprintRecord(fields);
      onSealed(createRecord({ ...fields, recordFingerprint }).id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  const extras = [
    draft.parents.length ? `Parents: ${draft.parents.map((p) => p.name).join(' × ')}` : '',
    draft.taxon ? `Species: ${draft.taxon}` : '',
    draft.breedingMethod ? `Made by: ${draft.breedingMethod}` : '',
    draft.photos.length ? `${draft.photos.length} photo${draft.photos.length === 1 ? '' : 's'}` : '',
    draft.refId ? `Your reference: ${draft.refId}` : '',
    draft.notes ? 'Notes added' : '',
  ].filter(Boolean);

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h4" component="h1" sx={{ fontSize: { xs: '1.8rem', md: '2.2rem' } }}>
          Is this right?
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Fix anything now.
        </Typography>
      </Box>
      <Box>
        <Line k="Plant or line" v={draft.strainName} onChange={onChange} />
        <Line k="Bred by" v={draft.bredBy} onChange={onChange} />
        <Line k="Made (your note)" v={draft.dateCreated} onChange={onChange} />
        <Line
          k="More details"
          v={extras.length ? extras.join(' · ') : 'None added'}
          empty={!extras.length}
          onChange={onChange}
          action={extras.length ? 'Change' : 'Add'}
        />
      </Box>
      <Alert icon={<LockIcon />} severity="info" variant="outlined">
        <b>Once sealed, this part can&apos;t change.</b> You can add reports and corrections later; a correction is a
        new record that points back to this one. That&apos;s what makes the date stamp worth something.
      </Alert>
      <Typography variant="body2" color="text.secondary">
        The details are saved on {OUR_SERVER} so you can come back to them. Only a fingerprint is dated on {DATED_ON}.
      </Typography>
      {error && (
        <Alert severity="error" variant="outlined">
          {error}
        </Alert>
      )}
      <Button
        variant="contained"
        size="large"
        fullWidth
        disabled={busy}
        onClick={() => void seal()}
        startIcon={busy ? <CircularProgress size={18} color="inherit" /> : undefined}
        sx={{ py: 1.6 }}
      >
        {busy ? 'Sealing…' : REAL_CHAIN ? 'Seal it and date stamp it' : 'Seal it'}
      </Button>
    </Stack>
  );
};

// ---------------------------------------------------------------------------------------

const Stamp: React.FC<{ recordId: string; onNext: () => void }> = ({ recordId, onNext }) => {
  const keys = useRecordKeys()[recordId];
  const anchored = keys?.anchor;
  const call = useChainCall<void>();
  const started = useRef(false);
  const notReady = REAL_CHAIN ? chainNotReady() : undefined;
  const keeps = storageKeeps();
  const [backupFirstDone, setBackupFirstDone] = useState(false);

  const anchor = () =>
    call.run(async (progress) => {
      const k = ensureKeys(recordId);
      const { anchorOnChain } = await import('../../veilcore/chain/actions');
      const secret = hexBytes(k.recordSecret);
      const receipt = await anchorOnChain(secret, hexBytes(k.recoverySecret), { progress });
      setAnchor(recordId, {
        identity: identityOf(secret),
        network: NETWORK,
        contractAddress: CHAIN_CONTRACT ?? '',
        txId: receipt.txId,
        txHash: receipt.txHash,
        blockHeight: receipt.blockHeight,
        anchoredAt: receipt.blockTime,
      });
    });

  // Start on arrival: the button that brought them here already said "date stamp it".
  // A browser that won't keep the keys gets the backup first instead.
  const canStart = REAL_CHAIN && !notReady && (keeps || backupFirstDone);
  useEffect(() => {
    if (!canStart || anchored || started.current) return;
    started.current = true;
    ensureKeys(recordId);
    void anchor();
  }, [canStart]);

  if (!REAL_CHAIN || notReady) {
    return (
      <Stack spacing={2.5}>
        <DoneTitle title="Sealed" />
        <Typography variant="body1" color="text.secondary">
          Its public date stamp comes when its batch is dated on {DATED_ON}. Your plant&apos;s page shows when that has
          happened. Nothing for you to do.
        </Typography>
        <Button variant="contained" size="large" fullWidth onClick={onNext} sx={{ py: 1.6 }}>
          Next
        </Button>
      </Stack>
    );
  }

  if (!keeps && !backupFirstDone && !anchored) {
    return (
      <Stack spacing={2.5}>
        <Alert severity="warning" variant="outlined">
          This browser won&apos;t keep anything after you close it (a private window, or site data is blocked). Save
          your backup first, then we&apos;ll add the date stamp.
        </Alert>
        <BackupStep
          title="Save your backup first"
          finishLabel="Now add the date stamp"
          onDone={() => setBackupFirstDone(true)}
        />
      </Stack>
    );
  }

  if (anchored) {
    return (
      <Stack spacing={2.5}>
        <DoneTitle title="Date stamped" />
        <Typography variant="body1" color="text.secondary">
          On {DATED_ON}
          {anchored.anchoredAt ? `, ${new Date(anchored.anchoredAt).toLocaleString()}` : ''}. Only a fingerprint went
          out. Nobody can read your details from it.
        </Typography>
        <Button variant="contained" size="large" fullWidth onClick={onNext} sx={{ py: 1.6 }}>
          Next
        </Button>
      </Stack>
    );
  }

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h4" component="h1" sx={{ fontSize: { xs: '1.8rem', md: '2.2rem' } }}>
          Adding your date stamp
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Only a fingerprint of the record goes out. Free: VeilCore pays the network fee.
        </Typography>
      </Box>
      {call.busy && <LinearProgress sx={{ height: 10, borderRadius: 5 }} />}
      {call.progress && <Typography variant="body1">{call.progress}</Typography>}
      {call.error ? (
        <>
          <Alert severity="error" variant="outlined">
            That didn&apos;t go through: {call.error}. Nothing is lost. Try again.
          </Alert>
          <Button variant="contained" size="large" fullWidth onClick={() => void anchor()} sx={{ py: 1.6 }}>
            Try again
          </Button>
          {/* Never a dead end: the network or the fee service can be down for a while.
              The plant's page offers the date stamp again, and the backup still gets saved. */}
          <Button variant="text" color="inherit" onClick={onNext} sx={{ minHeight: 48 }}>
            Do the date stamp later
          </Button>
        </>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Keep this screen open, about a minute. If it closes, nothing is lost: your plant is saved, and its page will
          offer the date stamp again.
        </Typography>
      )}
      {keysFor(recordId) === undefined && <CircularProgress />}
    </Stack>
  );
};

const DoneTitle: React.FC<{ title: string }> = ({ title }) => (
  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
    <DoneIcon color="primary" sx={{ fontSize: 40 }} />
    <Typography variant="h4" component="h1" sx={{ fontSize: { xs: '1.8rem', md: '2.2rem' } }}>
      {title}
    </Typography>
  </Stack>
);
