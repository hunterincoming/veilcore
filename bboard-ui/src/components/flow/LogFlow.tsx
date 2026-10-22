// Logging a plant, one thing per screen: the plant → check it → seal and date stamp →
// (lab report) → save the backup and check it → the plant's page.
//
// The counter says "Step n of 4" for the four screens everyone sees; the lab report is
// marked Optional and not counted. Each new screen starts at the top with focus on its
// heading, and the heading carries the step for screen readers (FlowFrame.ScreenHeading).
// What is typed on the first screen is kept as it is typed (log-flow-state.ts), so going
// Home loses nothing; once sealed, the plant itself is saved and the draft goes.
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

import React, { useEffect, useId, useRef, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  LinearProgress,
  Link,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import LockIcon from '@mui/icons-material/LockOutlined';
import DoneIcon from '@mui/icons-material/CheckCircleOutlined';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { fingerprintFile } from '../../veilcore/commitment';
import {
  createRecord,
  draftSizeShare,
  getRecord,
  sizeWords,
  tooLargeToSave,
  useRecords,
  type ParentRef,
} from '../../veilcore/records';
import { sealAnimalRecord, sealRecord } from '../../veilcore/seal-record';
import { localStamp } from '../../veilcore/time';
import { forgetKeys, keysFor, storageKeeps, useRecordKeys } from '../../veilcore/record-keys';
import { REAL_CHAIN, chainNotReady } from '../../veilcore/chain/config';
import { useKeyStamp } from '../chain/useKeyStamp';
import { SupportDetails } from '../SupportDetails';
import { nextBatchWords, useAnchorCadence } from './dating-words';
import { Step2PairDna } from '../wizard/Step2PairDna';
import { AppHeader } from '../AppHeader';
import { BackupStep } from './BackupStep';
import { IntakeBanner } from './IntakePage';
import { allowRecord, loadIntake } from '../../veilcore/intake';
import { FlowFrame, ScreenHeading, focusScreenHeading, softDisabled, visuallyHidden } from './FlowFrame';
import { useT, useRecordT, rich, type Translator } from '../../i18n/app';
import { forKind } from '../../i18n/translate';
import { ANIMAL_RECORDS_ENABLED } from '../../config/network';
import { AnimalForm, AnimalReviewLines, KindChoice } from './AnimalForm';
import { animalSealInputOf, emptyAnimalDraft, loadLogKind, saveLogKind, type LogKind } from './animal-draft';
import { BREEDING_METHODS, breedingMethodWords } from './breeding-methods';
import { progressWords } from '../chain/progress-words';
import {
  type Draft,
  clearDraft,
  draftHasContent,
  emptyDraft,
  loadDraft,
  nextStageDraft,
  nextStageNamePlaceholder,
  nextStageStart,
  saveDraft,
  sealInputOf,
  stampProblem,
  unsavedPlantLine,
} from './log-flow-state';
import { animalParentOptionsOf, parentOptionsOf } from '../stage/record-kinds';
// SEAL_EACH_STAGE, STAGE_PROMPT and SELECTED_PROMPT (stage-notes.ts) are shown here in the
// visitor's language: app.log.sealEachStage, app.log.stagePrompt, app.log.selectedPrompt.

type Screen = 'plant' | 'review' | 'stamp' | 'report' | 'backup';

/** The counter. The lab report is optional, so it is not counted. */
export const STEP: Record<Screen, number | 'optional'> = {
  plant: 1,
  review: 2,
  stamp: 3,
  report: 'optional',
  backup: 4,
};

/** "Step 1 of 4", or "Optional", in the visitor's language. */
const stepWords = (screen: Screen, tr: Translator): string => {
  const n = STEP[screen];
  return n === 'optional' ? tr.t('app.log.optional') : tr.t('app.log.stepOf', { n, total: 4 });
};

export const LogFlow: React.FC = () => {
  // "Add the next generation or selection" on a plant's page opens /new?next=<its id>. Each
  // address is its own flow, with its own draft (log-flow-state.ts draftKeyFor): a new key,
  // so moving between them starts the screen afresh.
  const [params] = useSearchParams();
  const nextOf = params.get('next') ?? undefined;
  return <LogFlowFor key={nextOf ?? ''} nextOf={nextOf} />;
};

/** How the first screen starts: undecided while a next stage's parent is still loading. */
type Start =
  | { readonly kind: 'ready'; readonly draft: Draft; readonly resumed: boolean }
  | { readonly kind: 'ask'; readonly draft: Draft; readonly other: Draft }
  | { readonly kind: 'waiting' };

const LogFlowFor: React.FC<{ nextOf?: string }> = ({ nextOf }) => {
  const [screen, setScreen] = useState<Screen>('plant');
  const records = useRecords(); // the plant may arrive after this page does (a reload)
  const nextParent = nextOf ? records.find((r) => r.id === nextOf) : undefined;
  const startFor = (): Start => {
    if (!nextOf) {
      const plain = loadDraft();
      return { kind: 'ready', draft: plain ?? emptyDraft(), resumed: !!plain };
    }
    const own = loadDraft(nextOf);
    if (!nextParent) return own ? { kind: 'ready', draft: own, resumed: true } : { kind: 'waiting' };
    const s = nextStageStart(nextParent, loadDraft(), own);
    if (s.adopt) {
      saveDraft(s.draft, nextOf);
      clearDraft();
    }
    if (s.conflict) return { kind: 'ask', draft: s.draft, other: s.conflict };
    if (!s.resumed) saveDraft(s.draft, nextOf);
    return { kind: 'ready', draft: s.draft, resumed: s.resumed };
  };
  const [start, setStart] = useState<Start>(startFor);
  useEffect(() => {
    if (start.kind === 'waiting' && nextParent) setStart(startFor());
  }, [nextParent, start.kind]);

  const [draft, setDraftState] = useState<Draft>(() => (start.kind === 'waiting' ? emptyDraft() : start.draft));
  useEffect(() => {
    if (start.kind !== 'waiting') setDraftState(start.draft);
  }, [start]);
  const [recordId, setRecordId] = useState<string>();
  const navigate = useNavigate();
  const firstScreen = useRef(true);
  const tr = useT();

  const setDraft = (d: Draft) => {
    setDraftState(d);
    saveDraft(d, nextOf);
  };

  // "A plant" or "An animal" (animal-draft.ts): the draft's own choice, else the last one made
  // in this browser. A next stage of a plant is a plant; on a build without animal records
  // (mainnet, config/network.ts) there is no choice.
  const offerKinds = ANIMAL_RECORDS_ENABLED && !nextOf;
  const [lastKind] = useState<LogKind>(loadLogKind);
  const kind: LogKind = offerKinds ? (draft.kind ?? lastKind) : 'plant';
  const setKind = (k: LogKind) => {
    saveLogKind(k);
    setDraft({ ...draft, kind: k, ...(k === 'animal' && !draft.animal ? { animal: emptyAnimalDraft() } : {}) });
  };
  const choice = offerKinds ? <KindChoice kind={kind} onKind={setKind} /> : undefined;

  // A new screen starts at the top, focus on its heading. The first one is the page's own
  // (App.tsx does that on arrival).
  useEffect(() => {
    if (firstScreen.current) {
      firstScreen.current = false;
      return;
    }
    return focusScreenHeading();
  }, [screen]);

  const step = stepWords(screen, tr);

  const body = (() => {
    switch (screen) {
      case 'plant':
        if (start.kind === 'waiting') return <OpeningParent nextOf={nextOf ?? ''} />;
        if (start.kind === 'ask')
          return (
            <UnsavedPlantChoice
              step={step}
              other={start.other}
              onKeep={() => {
                saveDraft(start.draft, nextOf);
                setStart({ kind: 'ready', draft: start.draft, resumed: false });
              }}
              onContinue={() => void navigate('/new')}
            />
          );
        if (kind === 'animal')
          return (
            <AnimalForm
              step={step}
              choice={choice}
              draft={draft.animal ?? emptyAnimalDraft()}
              setDraft={(a) => setDraft({ ...draft, kind: 'animal', animal: a })}
              restored={start.resumed && draftHasContent(draft)}
              onStartOver={() => setDraft({ ...emptyDraft(), kind: 'animal', animal: emptyAnimalDraft() })}
              sireOptions={animalParentOptionsOf(records, 'sire')}
              damOptions={animalParentOptionsOf(records, 'dam')}
              onNext={() => setScreen('review')}
            />
          );
        return (
          <PlantForm
            step={step}
            choice={choice}
            draft={draft}
            setDraft={setDraft}
            restored={start.resumed && draftHasContent(draft)}
            startOver={nextParent ? () => nextStageDraft(nextParent) : emptyDraft}
            namePlaceholder={nextParent ? nextStageNamePlaceholder(nextParent, tr) : undefined}
            parentOptions={parentOptionsOf(records)}
            onNext={() => setScreen('review')}
          />
        );
      case 'review':
        return (
          <Review
            step={step}
            draft={{ ...draft, kind }}
            onChange={() => setScreen('plant')}
            onSealed={(id) => {
              clearDraft(nextOf);
              setRecordId(id);
              setScreen('stamp');
            }}
          />
        );
      case 'stamp':
        return recordId ? <Stamp step={step} recordId={recordId} onNext={() => setScreen('report')} /> : null;
      case 'report':
        // No Back here: behind this screen is the date stamp, which has already happened
        // (or been put off). Skip is the way on.
        return recordId ? (
          <Step2PairDna
            recordId={recordId}
            headingComponent="h1"
            stepLabel={step}
            onDone={() => setScreen('backup')}
            onSkip={() => setScreen('backup')}
            doneLabel={tr.t('app.log.nextSaveBackup')}
            intro={
              <Alert severity="info" variant="outlined">
                {rich(forKind(tr, kind).t('app.log.reportIntro'), { b: (c) => <b>{c}</b> })}
              </Alert>
            }
          />
        ) : null;
      case 'backup':
        return (
          <BackupStep
            title={tr.t('app.backup.title')}
            stepLabel={step}
            finishLabel={tr.t('app.log.finish')}
            onDone={() =>
              // A partner's intake is waiting (/intake): the breeder decides what goes back.
              recordId && loadIntake()
                ? (allowRecord(recordId), navigate(`/intake/send?record=${encodeURIComponent(recordId)}`))
                : recordId
                  ? navigate(`/record/${recordId}`)
                  : navigate('/records')
            }
          />
        );
    }
  })();

  return (
    <Box>
      <AppHeader />
      <FlowFrame section="log" step={step}>
        <IntakeBanner />
        {body}
      </FlowFrame>
    </Box>
  );
};

// ---------------------------------------------------------------------------------------

/** A next stage's parent not in this browser yet (a reload, before the records arrive). */
const OpeningParent: React.FC<{ nextOf: string }> = ({ nextOf }) => {
  const { t } = useT();
  return (
    <Stack spacing={2}>
      <ScreenHeading>{t('app.log.nextStageTitle')}</ScreenHeading>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }} role="status">
        <CircularProgress size={18} />
        <Typography variant="body1" sx={{ overflowWrap: 'anywhere' }}>
          {t('app.log.opening', { id: nextOf })}
        </Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary">
        {rich(t('app.log.notInBrowser'), {
          link: (c) => (
            <Link component={RouterLink} to="/new">
              {c}
            </Link>
          ),
        })}
      </Typography>
    </Stack>
  );
};

/** A different plant is half-logged: keep it, and ask before starting the next stage. */
const UnsavedPlantChoice: React.FC<{
  step: string;
  other: Draft;
  onKeep: () => void;
  onContinue: () => void;
}> = ({ step, other, onKeep, onContinue }) => {
  const tr = useT();
  const { t } = tr;
  return (
    <Stack spacing={2} data-unsaved-plant="">
      <ScreenHeading step={step}>{t('app.log.nextStageTitle')}</ScreenHeading>
      <Typography variant="body1" sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>
        {unsavedPlantLine(other, tr)}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {t('app.log.keptEitherWay')}
      </Typography>
      <Button variant="contained" size="large" fullWidth onClick={onKeep} sx={{ py: 1.4 }}>
        {t('app.log.keepAndStart')}
      </Button>
      <Button variant="outlined" size="large" fullWidth onClick={onContinue} sx={{ py: 1.4 }}>
        {t('app.log.continueThat')}
      </Button>
    </Stack>
  );
};

const PlantForm: React.FC<{
  step: string;
  /** "A plant" / "An animal", when this build offers both. */
  choice?: React.ReactNode;
  draft: Draft;
  setDraft: (d: Draft) => void;
  restored: boolean;
  /** What "Start over" goes back to: an empty plant, or a fresh next stage of the same parent. */
  startOver: () => Draft;
  /** A suggested name for a next stage, shown only as a placeholder. */
  namePlaceholder?: string;
  /** Plants this one can name as a parent: never a record that dates a lab report. */
  parentOptions: ParentRef[];
  onNext: () => void;
}> = ({ step, choice, draft, setDraft, restored, startOver, namePlaceholder, parentOptions, onNext }) => {
  const tr = useT();
  const { t, tp } = tr;
  // How full the record would be (CONTRACT.md #21): said only near the limit.
  const share = draftSizeShare({ ...sealInputOf(draft) });
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft({ ...draft, [k]: v });
  const hasMore = Boolean(
    draft.parents.length || draft.taxon || draft.breedingMethod || draft.refId || draft.notes || draft.photos.length,
  );
  const [more, setMore] = useState(hasMore);
  const [reading, setReading] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);
  const ready = Boolean(draft.strainName.trim() && draft.bredBy.trim()) && !reading;
  const moreId = useId();
  const hintId = useId();
  // A next stage (components/stage): the plant it follows, linked as its parent.
  const stageOf = draft.stageOf;
  const stageParent = stageOf ? draft.parents.find((p) => p.recordId === stageOf)?.name : undefined;

  // Photos are fingerprinted as they are added: only the fingerprints are ever sealed, and
  // a fingerprint can be kept with the draft where a photo can't.
  const addPhotos = async (files: File[]) => {
    if (!files.length) return;
    setReading(true);
    try {
      const added = await Promise.all(
        files.map(async (f) => ({ name: f.name, fingerprint: await fingerprintFile(f) })),
      );
      set('photos', [...draft.photos, ...added]);
    } finally {
      setReading(false);
    }
  };

  return (
    <Stack spacing={2.5}>
      <Box>
        <ScreenHeading step={step}>{stageOf ? t('app.log.nextStageTitle') : t('app.log.title')}</ScreenHeading>
        <Typography variant="body1" color="text.secondary">
          {t('app.log.fillIn')}
        </Typography>
      </Box>
      {choice}
      {stageOf && (
        <Alert severity="info" variant="outlined" data-seal-each-stage="">
          <b>{t('app.log.sealEachStage')}</b>
          {stageParent ? t('app.log.parentLinked', { name: stageParent }) : ''}
        </Alert>
      )}
      {restored && (
        <Stack direction="row" sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {t('app.log.keptLastTime')}
          </Typography>
          <Button
            variant="text"
            size="small"
            onClick={() => {
              setDraft({ ...startOver(), ...(draft.animal ? { animal: draft.animal } : {}) });
              // The button goes away with the kept draft: focus the screen's heading (round 6).
              focusScreenHeading();
            }}
            sx={{ minHeight: 44 }}
          >
            {t('app.log.startOver')}
          </Button>
        </Stack>
      )}
      <TextField
        label={t('app.log.nameLabel')}
        required
        placeholder={namePlaceholder ?? t('app.log.namePlaceholder')}
        helperText={t('app.log.nameHelp')}
        value={draft.strainName}
        onChange={(e) => set('strainName', e.target.value)}
        fullWidth
      />
      <TextField
        label={t('app.log.bredBy')}
        required
        placeholder={t('app.log.bredByPlaceholder')}
        value={draft.bredBy}
        onChange={(e) => set('bredBy', e.target.value)}
        fullWidth
      />
      <TextField
        label={t('app.log.whenMade')}
        type="date"
        value={draft.dateCreated}
        onChange={(e) => set('dateCreated', e.target.value)}
        helperText={t('app.log.whenMadeHelp')}
        slotProps={{ inputLabel: { shrink: true } }}
        fullWidth
      />
      {stageOf && (
        <>
          <TextField
            label={t('app.log.stagePrompt')}
            value={draft.stage ?? ''}
            onChange={(e) => set('stage', e.target.value)}
            helperText={t('app.log.stageHelp')}
            fullWidth
          />
          <TextField
            label={t('app.log.selectedPrompt')}
            value={draft.selectedFor ?? ''}
            onChange={(e) => set('selectedFor', e.target.value)}
            helperText={t('app.log.selectedHelp')}
            multiline
            minRows={2}
            fullWidth
          />
        </>
      )}

      <Box>
        <Button
          variant="text"
          onClick={() => setMore(!more)}
          aria-expanded={more}
          aria-controls={moreId}
          sx={{ px: 0, minHeight: 44 }}
        >
          {more ? t('app.log.fewer') : t('app.log.more')}
        </Button>
        <Collapse in={more} id={moreId}>
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
                <TextField {...params} label={t('app.log.parents')} helperText={t('app.log.parentsHelp')} />
              )}
            />
            <TextField
              label={t('app.log.species')}
              placeholder={t('app.log.speciesPlaceholder')}
              value={draft.taxon}
              onChange={(e) => set('taxon', e.target.value)}
              fullWidth
            />
            <TextField
              select
              label={t('app.log.howMade')}
              value={draft.breedingMethod}
              onChange={(e) => set('breedingMethod', e.target.value)}
              helperText={stageOf && !draft.breedingMethod ? t('app.log.howMadeStageHelp') : undefined}
              fullWidth
            >
              <MenuItem value="">{t('app.log.notSaying')}</MenuItem>
              {BREEDING_METHODS.map(([m, key]) => (
                <MenuItem key={m} value={m}>
                  {t(key)}
                </MenuItem>
              ))}
            </TextField>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                onClick={() => photoRef.current?.click()}
                disabled={reading}
                startIcon={reading ? <CircularProgress size={16} color="inherit" /> : undefined}
              >
                {reading ? t('app.log.readingPhotos') : t('app.log.addPhotos')}
              </Button>
              {draft.photos.length > 0 && <Chip label={tp('app.log.photos', draft.photos.length)} variant="outlined" />}
              <input
                ref={photoRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  e.target.value = '';
                  void addPhotos(files);
                }}
              />
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {t('app.log.photosStay')}
            </Typography>
            <TextField
              label={t('app.log.refId')}
              value={draft.refId}
              onChange={(e) => set('refId', e.target.value)}
              fullWidth
            />
            <TextField
              label={t('app.log.notes')}
              value={draft.notes}
              onChange={(e) => set('notes', e.target.value)}
              multiline
              minRows={2}
              fullWidth
              helperText={sizeWords(share, tr)}
              error={share > 1}
            />
          </Stack>
        </Collapse>
      </Box>

      {/* Not disabled: a disabled button can't be reached by Tab, so a keyboard or screen
          reader user would never hear why. It says it's unavailable and points at the hint. */}
      <Button
        variant="contained"
        size="large"
        fullWidth
        {...softDisabled(!ready, hintId)}
        onClick={() => ready && onNext()}
        sx={{ py: 1.6 }}
      >
        {t('app.log.nextCheck')}
      </Button>
      {!ready && (
        <Typography id={hintId} variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
          {reading ? t('app.log.readingYourPhotos') : t('app.log.nameAndBreeder')}
        </Typography>
      )}
    </Stack>
  );
};

// ---------------------------------------------------------------------------------------

const Line: React.FC<{ k: string; v: string; empty?: boolean; onChange: () => void; action: string }> = ({
  k,
  v,
  empty,
  onChange,
  action,
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

const Review: React.FC<{ step: string; draft: Draft; onChange: () => void; onSealed: (id: string) => void }> = ({
  step,
  draft,
  onChange,
  onSealed,
}) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const animal = draft.kind === 'animal' && draft.animal ? draft.animal : undefined;
  const tr = forKind(useT(), animal ? 'animal' : 'plant');
  const { t, tp } = tr;

  const seal = async () => {
    if (busy) return;
    setBusy(true);
    setError(undefined);
    let id: string | undefined;
    let created = false;
    try {
      // One sealing for every new record (seal-record.ts): the record names its key and the
      // fingerprint covers that, and the nonce is stored so anyone can recompute it.
      const sealed = animal ? await sealAnimalRecord(animalSealInputOf(animal)) : await sealRecord(sealInputOf(draft));
      id = sealed.id;
      // Too large to save (CONTRACT.md #21): said here, with everything typed still in the form.
      if (tooLargeToSave(sealed)) {
        forgetKeys(id);
        setError(t('app.sealed.tooLarge'));
        setBusy(false);
        return;
      }
      const record = createRecord(sealed);
      created = true;
      onSealed(record.id);
    } catch (e) {
      // Forget the keys only if no record was made with them; once it exists, its key is the
      // only way to prove holding it.
      if (id && !created) forgetKeys(id);
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  const extras = [
    draft.stage?.trim() ? t('app.log.x.stage', { v: draft.stage.trim() }) : '',
    draft.selectedFor?.trim() ? t('app.log.x.selectedFor', { v: draft.selectedFor.trim() }) : '',
    draft.parents.length ? t('app.log.x.parents', { v: draft.parents.map((p) => p.name).join(' × ') }) : '',
    draft.taxon ? t('app.log.x.species', { v: draft.taxon }) : '',
    draft.breedingMethod ? t('app.log.x.madeBy', { v: breedingMethodWords(draft.breedingMethod, tr) }) : '',
    draft.photos.length ? tp('app.log.photos', draft.photos.length) : '',
    draft.refId ? t('app.log.x.ref', { v: draft.refId }) : '',
    draft.notes ? t('app.log.x.notes') : '',
  ].filter(Boolean);
  const change = t('app.common.change');

  return (
    <Stack spacing={2.5}>
      <Box>
        <ScreenHeading step={step}>{t('app.log.reviewTitle')}</ScreenHeading>
        <Typography variant="body1" color="text.secondary">
          {t('app.log.fixNow')}
        </Typography>
      </Box>
      {animal ? (
        <AnimalReviewLines draft={animal} onChange={onChange} />
      ) : (
        <Box>
          <Line k={t('app.log.k.plant')} v={draft.strainName} onChange={onChange} action={change} />
          <Line k={t('app.log.bredBy')} v={draft.bredBy} onChange={onChange} action={change} />
          <Line k={t('app.log.k.made')} v={draft.dateCreated} onChange={onChange} action={change} />
          <Line
            k={t('app.log.k.more')}
            v={extras.length ? extras.join(' · ') : t('app.log.noneAdded')}
            empty={!extras.length}
            onChange={onChange}
            action={extras.length ? change : t('app.common.add')}
          />
        </Box>
      )}
      <Alert icon={<LockIcon />} severity="info" variant="outlined">
        {rich(t('app.log.sealedWarn'), { b: (c) => <b>{c}</b> })}
      </Alert>
      <Typography variant="body2" color="text.secondary">
        {t('app.log.savedOn', { server: t('app.copy.ourServer'), datedOn: t('app.copy.datedOn') })}
      </Typography>
      {error && (
        <Alert severity="error" variant="outlined">
          {error}
        </Alert>
      )}
      {/* Round 6: not `disabled` while sealing, which dropped focus to the page: it says it is
          busy (aria-disabled) and keeps focus until the next screen's heading takes it. */}
      <Button
        variant="contained"
        size="large"
        fullWidth
        {...(busy ? { 'aria-disabled': true as const, className: 'Mui-disabled' } : {})}
        onClick={() => void seal()}
        startIcon={busy ? <CircularProgress size={18} color="inherit" /> : undefined}
        sx={{ py: 1.6 }}
        {...(REAL_CHAIN ? { 'data-stamps-key': '', 'aria-describedby': 'seal-stamps-key' } : {})}
      >
        {busy ? t('app.log.sealing') : t('app.log.seal')}
      </Button>
      <span role="status" style={visuallyHidden}>
        {busy ? t('app.log.sealingPlant') : ''}
      </span>
      {/* Round 5: one button, one name. Dating the key is part of sealing, said here, not
          a second "date stamp it" that reads like a second date for the record. */}
      {REAL_CHAIN && (
        <Typography id="seal-stamps-key" variant="body2" color="text.secondary">
          {t('app.log.sealStampsKey')}
        </Typography>
      )}
    </Stack>
  );
};

// ---------------------------------------------------------------------------------------

const Stamp: React.FC<{ step: string; recordId: string; onNext: () => void }> = ({ step, recordId, onNext }) => {
  const keys = useRecordKeys()[recordId];
  const anchored = keys?.anchor;
  const started = useRef(false);
  const notReady = REAL_CHAIN ? chainNotReady() : undefined;
  const keeps = storageKeeps();
  const [backupFirstDone, setBackupFirstDone] = useState(false);
  const tr = useRecordT(getRecord(recordId));
  const { t } = tr;
  const datedOn = t('app.copy.datedOn');
  // The stamp, tried again by itself when it doesn't go through (veilcore/chain/key-stamp.ts).
  const stamp = useKeyStamp(recordId, { auto: true });
  // How often a batch is dated, when the fee service says (dating-words.ts).
  const cadence = useAnchorCadence();
  // Round 6: when the date stamp lands, this screen is redrawn as "Sealed" and the heading
  // that had focus is gone: give focus to the new one.
  const wasAnchored = useRef(!!anchored);
  useEffect(() => {
    if (!anchored || wasAnchored.current) return;
    wasAnchored.current = true;
    return focusScreenHeading();
  }, [anchored]);

  // Start on arrival: the seal button already said sealing date stamps the key.
  // A browser that won't keep the keys gets the backup first instead.
  const canStart = REAL_CHAIN && !notReady && (keeps || backupFirstDone);
  useEffect(() => {
    if (!canStart || anchored || started.current) return;
    started.current = true;
    void stamp.run();
  }, [canStart]);

  if (!REAL_CHAIN || notReady) {
    return (
      <Stack spacing={2.5}>
        <DoneTitle step={step} title={t('app.log.sealed')} />
        <Typography variant="body1" color="text.secondary">
          {t('app.log.publicStampLater', { datedOn })}
        </Typography>
        <Button variant="contained" size="large" fullWidth onClick={onNext} sx={{ py: 1.6 }}>
          {t('app.common.next')}
        </Button>
      </Stack>
    );
  }

  if (!keeps && !backupFirstDone && !anchored) {
    return (
      <Stack spacing={2.5}>
        <Alert severity="warning" variant="outlined">
          {t('app.log.privateWindow')}
        </Alert>
        <BackupStep
          title={t('app.log.backupFirstTitle')}
          stepLabel={step}
          finishLabel={t('app.log.nowStamp')}
          onDone={() => {
            setBackupFirstDone(true);
            focusScreenHeading();
          }}
        />
      </Stack>
    );
  }

  if (anchored) {
    return (
      <Stack spacing={2.5}>
        <DoneTitle step={step} title={t('app.log.sealed')} />
        {/* Round 5: the record's date is the main one. What the stamp dates is the plant's
            key (anchor), not its details: a key can be named by a record sealed later. The
            sealed record names this key, so it can't be swapped (docs/identity-in-record.md).
            Dating first (CONTRACT.md #38): the record's proof code is already on its way into
            the next batch, backup or not. */}
        <Box>
          <Typography variant="body1" sx={{ fontWeight: 700 }} data-record-dated-next="">
            {nextBatchWords(tr, cadence)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('app.log.publicDateLater', { datedOn })}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" data-key-stamped="">
          {t(anchored.anchoredAt ? 'app.log.keyStampedAt' : 'app.log.keyStamped', {
            when: anchored.anchoredAt ? localStamp(anchored.anchoredAt, tr.locale) : '',
            bound: getRecord(recordId)?.keyBinding ? t('app.log.keyBound') : '',
          })}
        </Typography>
        <Button variant="contained" size="large" fullWidth onClick={onNext} sx={{ py: 1.6 }}>
          {t('app.common.next')}
        </Button>
      </Stack>
    );
  }

  const failed = !stamp.busy && stamp.error ? stamp.error : undefined;
  const problem = failed ? stampProblem(failed, tr) : undefined;
  const stopped = stamp.entry?.stopped;
  return (
    <Stack spacing={2.5}>
      <Box>
        <ScreenHeading step={step}>
          {problem ? t('app.log.stampFailedTitle') : t('app.log.stampingTitle')}
        </ScreenHeading>
        <Typography variant="body1" color="text.secondary">
          {t('app.log.onlyFingerprint')}
        </Typography>
      </Box>
      {/* The record's own date doesn't wait for this (dating first, CONTRACT.md #38). */}
      <Typography variant="body2" color="text.secondary" data-record-dated-next="">
        {nextBatchWords(tr, cadence)}
      </Typography>
      {stamp.busy && <LinearProgress aria-label={t('app.log.stampingAria')} sx={{ height: 10, borderRadius: 5 }} />}
      <Typography variant="body1" role="status" sx={{ minHeight: stamp.busy ? '1.5em' : 0 }}>
        {progressWords(stamp.progress, tr) ?? ''}
      </Typography>
      {problem && failed ? (
        <>
          {/* The raw error stays on the element for test scripts and support, not on screen. */}
          <Alert severity="error" variant="outlined" data-error={failed}>
            {problem.text}
            {/* What went wrong, in the error's own first sentence (long hex taken out), so
                it can be reported. Folded away: the sentence above is the answer. */}
            {problem.detail && (
              <Box component="details" sx={{ mt: 1 }} data-stamp-detail="">
                <Box component="summary" sx={{ cursor: 'pointer', minHeight: 32 }}>
                  {t('app.chain.details')}
                </Box>
                <Typography variant="body2" sx={{ mt: 0.5, overflowWrap: 'anywhere' }}>
                  {problem.detail}
                </Typography>
              </Box>
            )}
            <SupportDetails step="key date stamp" error={failed} />
          </Alert>
          {/* Tried again by itself, a few times, sooner then later; never one that may have
              gone out (stampProblem's retry is false then) or one this site can't make. */}
          {problem.retry && !stopped && stamp.nextInSeconds !== undefined && (
            <Typography variant="body2" color="text.secondary" role="status" data-stamp-retry-in="">
              {t('app.log.retryingIn', {
                when: waitWords(stamp.nextInSeconds, tr),
                n: String(Math.min(stamp.entry?.tries ?? 1, 99) + 1),
              })}
            </Typography>
          )}
          {problem.retry && !stopped && stamp.entry?.nextAt === undefined && (
            <Typography variant="body2" color="text.secondary">
              {t('app.log.retriesUsed')}
            </Typography>
          )}
          {problem.retry && stopped !== 'sent' && (
            <Button variant="contained" size="large" fullWidth onClick={() => void stamp.tryNow()} sx={{ py: 1.6 }}>
              {t('app.log.tryNow')}
            </Button>
          )}
          {/* Never a dead end: the network or the fee service can be down for a while.
              It keeps trying while VeilCore is open, Home lists it, and the backup still gets saved. */}
          <Button variant="text" color="inherit" onClick={onNext} sx={{ minHeight: 48 }}>
            {t('app.log.stampLater')}
          </Button>
          {problem.retry && !stopped && (
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
              {t('app.log.keepsTrying')}
            </Typography>
          )}
        </>
      ) : (
        <Typography variant="body2" color="text.secondary">
          {t('app.log.keepOpen')}
        </Typography>
      )}
      {keysFor(recordId) === undefined && <CircularProgress />}
    </Stack>
  );
};

/** "about 25 s" / "about 4 min", for the countdown to the next automatic try. */
const waitWords = (seconds: number, tr: Translator): string =>
  seconds < 90
    ? tr.t('app.log.inSeconds', { n: String(seconds) })
    : tr.tp('app.chain.inAboutMinutes', Math.round(seconds / 60));

const DoneTitle: React.FC<{ step: string; title: string }> = ({ step, title }) => (
  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
    <DoneIcon color="success" sx={{ fontSize: 40 }} aria-hidden="true" />
    <ScreenHeading step={step}>{title}</ScreenHeading>
  </Stack>
);
