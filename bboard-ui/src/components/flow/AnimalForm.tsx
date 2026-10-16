// Logging an animal: the choice on the logging flow's first screen ("A plant" / "An animal"),
// the animal's form, and its "Is this right?" screen. The steps after it (seal and date stamp,
// the DNA report, the backup) are the plant's, in an animal's words (i18n forKind).
//
// What is asked is the animal profile (veilcore/animal-profile.ts, docs/animal-profile.md):
// a name or an individual ID (and which ID scheme it belongs to), species, breeder or holder;
// then breed, sex, date of birth, sire and dam, herd, photos and notes if they have them.
// SPDX-License-Identifier: Apache-2.0

import React, { useId, useRef, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import LockIcon from '@mui/icons-material/LockOutlined';
import { fingerprintFile } from '../../veilcore/commitment';
import { ANIMAL_SEXES, parentLine, type AnimalSex } from '../../veilcore/animal-profile';
import { ScreenHeading, focusScreenHeading, softDisabled } from './FlowFrame';
import { useT, rich, type Translator } from '../../i18n/app';
import { animalMissing, animalSealInputOf, type AnimalDraft, type LogKind, type ParentDraft } from './animal-draft';
import { draftSizeShare, sizeWords } from '../../veilcore/records';

/** "What are you logging?": a plant or an animal. Radio semantics, one press. */
export const KindChoice: React.FC<{ kind: LogKind; onKind: (k: LogKind) => void }> = ({ kind, onKind }) => {
  const { t } = useT();
  const labelId = useId();
  return (
    <Box data-log-kind={kind}>
      <Typography id={labelId} variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>
        {t('app.animal.choice.label')}
      </Typography>
      <ToggleButtonGroup
        exclusive
        fullWidth
        value={kind}
        aria-labelledby={labelId}
        onChange={(_, v: LogKind | null) => v && onKind(v)}
      >
        <ToggleButton value="plant" sx={{ minHeight: 48, textTransform: 'none', fontWeight: 700 }}>
          {t('app.animal.choice.plant')}
        </ToggleButton>
        <ToggleButton value="animal" sx={{ minHeight: 48, textTransform: 'none', fontWeight: 700 }}>
          {t('app.animal.choice.animal')}
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
};

/** The sex, in words: "Female", "Male", "Not stated". */
export const sexWords = (sex: AnimalSex | undefined, tr: Translator): string =>
  sex === 'female'
    ? tr.t('app.animal.sex.female')
    : sex === 'male'
      ? tr.t('app.animal.sex.male')
      : tr.t('app.animal.sex.unknown');

/** A sire or dam in one line, in the visitor's language: "Name (ID 123)". */
export const parentWords = (p: { name: string; individualId?: string } | undefined, tr: Translator): string =>
  parentLine(p, tr.t('app.animal.idShort'));

type ParentOption = { recordId: string; name: string; individualId: string };

/** A sire or dam: pick an animal you've logged, or type its name; and its individual ID. */
const ParentFields: React.FC<{
  role: 'sire' | 'dam';
  value: ParentDraft;
  options: ParentOption[];
  onChange: (p: ParentDraft) => void;
}> = ({ role, value, options, onChange }) => {
  const tr = useT();
  const { t } = tr;
  const linked = value.recordId ? options.find((o) => o.recordId === value.recordId) : undefined;
  return (
    <Stack spacing={1.5} data-parent-role={role}>
      <Autocomplete<ParentOption | string, false, false, true>
        freeSolo
        options={options}
        getOptionLabel={(o) => (typeof o === 'string' ? o : parentWords(o, tr) || o.recordId)}
        inputValue={value.name}
        value={linked ?? null}
        onInputChange={(_, v, reason) => {
          if (reason === 'input') onChange({ name: v, individualId: value.recordId ? '' : value.individualId });
          if (reason === 'clear') onChange({ name: '', individualId: '' });
        }}
        onChange={(_, v) => {
          if (v && typeof v !== 'string')
            onChange({ name: v.name, individualId: v.individualId, recordId: v.recordId });
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={t(role === 'sire' ? 'app.animal.sire' : 'app.animal.dam')}
            helperText={options.length ? t('app.animal.parentHelp') : t('app.animal.parentHelpNone')}
          />
        )}
      />
      <TextField
        label={t(role === 'sire' ? 'app.animal.sireId' : 'app.animal.damId')}
        value={value.individualId}
        disabled={!!value.recordId}
        helperText={value.recordId ? t('app.animal.linkedId') : undefined}
        onChange={(e) => onChange({ ...value, individualId: e.target.value })}
        fullWidth
      />
    </Stack>
  );
};

const SCHEMES = [
  'app.animal.scheme.jp',
  'app.animal.scheme.earTag',
  'app.animal.scheme.microchip',
  'app.animal.scheme.herdBook',
] as const;

export const AnimalForm: React.FC<{
  step: string;
  choice?: React.ReactNode;
  draft: AnimalDraft;
  setDraft: (d: AnimalDraft) => void;
  restored: boolean;
  onStartOver: () => void;
  sireOptions: ParentOption[];
  damOptions: ParentOption[];
  onNext: () => void;
}> = ({ step, choice, draft, setDraft, restored, onStartOver, sireOptions, damOptions, onNext }) => {
  const tr = useT();
  const { t, tp } = tr;
  // How full the record would be (CONTRACT.md #21): said only near the limit.
  const share = draftSizeShare({ ...animalSealInputOf(draft) });
  const set = <K extends keyof AnimalDraft>(k: K, v: AnimalDraft[K]) => setDraft({ ...draft, [k]: v });
  const hasMore = Boolean(
    draft.sire.name ||
    draft.sire.individualId ||
    draft.dam.name ||
    draft.dam.individualId ||
    draft.herd ||
    draft.notes ||
    draft.photos.length,
  );
  const [more, setMore] = useState(hasMore);
  const [reading, setReading] = useState(false);
  const photoRef = useRef<HTMLInputElement>(null);
  const missing = animalMissing(draft);
  const ready = !missing && !reading;
  const moreId = useId();
  const hintId = useId();

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
    <Stack spacing={2.5} data-animal-form="">
      <Box>
        <ScreenHeading step={step}>{t('app.animal.title')}</ScreenHeading>
        <Typography variant="body1" color="text.secondary">
          {t('app.log.fillIn')}
        </Typography>
      </Box>
      {choice}
      {restored && (
        <Stack direction="row" sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {t('app.log.keptLastTime')}
          </Typography>
          <Button
            variant="text"
            size="small"
            onClick={() => {
              onStartOver();
              focusScreenHeading();
            }}
            sx={{ minHeight: 44 }}
          >
            {t('app.log.startOver')}
          </Button>
        </Stack>
      )}
      <TextField
        label={t('app.animal.nameField')}
        placeholder={t('app.animal.namePlaceholder')}
        helperText={t('app.log.nameHelp')}
        value={draft.name}
        onChange={(e) => set('name', e.target.value)}
        fullWidth
      />
      <TextField
        label={t('app.animal.individualId')}
        value={draft.individualId}
        onChange={(e) => set('individualId', e.target.value)}
        helperText={t('app.animal.individualIdHelp')}
        fullWidth
      />
      <Autocomplete<string, false, false, true>
        freeSolo
        options={SCHEMES.map((k) => t(k))}
        inputValue={draft.idScheme}
        onInputChange={(_, v) => set('idScheme', v)}
        renderInput={(params) => (
          <TextField
            {...params}
            label={t('app.animal.idScheme')}
            required={!!draft.individualId.trim()}
            helperText={t('app.animal.idSchemeHelp')}
          />
        )}
      />
      <TextField
        label={t('app.animal.species')}
        required
        placeholder={t('app.animal.speciesPlaceholder')}
        value={draft.species}
        onChange={(e) => set('species', e.target.value)}
        fullWidth
      />
      <TextField
        label={t('app.animal.breed')}
        placeholder={t('app.animal.breedPlaceholder')}
        value={draft.breed}
        onChange={(e) => set('breed', e.target.value)}
        fullWidth
      />
      <TextField
        select
        label={t('app.animal.sex')}
        value={draft.sex}
        onChange={(e) => set('sex', e.target.value as AnimalSex)}
        fullWidth
      >
        {ANIMAL_SEXES.map((s) => (
          <MenuItem key={s} value={s}>
            {t(
              s === 'female'
                ? 'app.animal.sex.female'
                : s === 'male'
                  ? 'app.animal.sex.male'
                  : 'app.animal.sex.unknown',
            )}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        label={t('app.animal.dob')}
        type="date"
        value={draft.dateOfBirth}
        onChange={(e) => set('dateOfBirth', e.target.value)}
        helperText={t('app.animal.dobHelp')}
        slotProps={{ inputLabel: { shrink: true } }}
        fullWidth
      />
      <TextField
        label={t('app.animal.breeder')}
        required
        placeholder={t('app.animal.breederPlaceholder')}
        value={draft.breeder}
        onChange={(e) => set('breeder', e.target.value)}
        fullWidth
      />

      <Box>
        <Button
          variant="text"
          onClick={() => setMore(!more)}
          aria-expanded={more}
          aria-controls={moreId}
          sx={{ px: 0, minHeight: 44 }}
        >
          {more ? t('app.log.fewer') : t('app.animal.more')}
        </Button>
        <Collapse in={more} id={moreId}>
          <Stack spacing={2.5} sx={{ pt: 1.5 }}>
            <ParentFields role="sire" value={draft.sire} options={sireOptions} onChange={(p) => set('sire', p)} />
            <ParentFields role="dam" value={draft.dam} options={damOptions} onChange={(p) => set('dam', p)} />
            <TextField
              label={t('app.animal.herd')}
              value={draft.herd}
              onChange={(e) => set('herd', e.target.value)}
              fullWidth
            />
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
          {reading
            ? t('app.log.readingYourPhotos')
            : missing === 'scheme'
              ? t('app.animal.need.scheme')
              : missing === 'species'
                ? t('app.animal.need.species')
                : missing === 'breeder'
                  ? t('app.animal.need.breeder')
                  : t('app.animal.need.nameOrId')}
        </Typography>
      )}
    </Stack>
  );
};

/** A line of the "Is this right?" screen. */
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

/** "Is this right?" for an animal: what will be sealed, line by line. */
export const AnimalReviewLines: React.FC<{ draft: AnimalDraft; onChange: () => void }> = ({ draft, onChange }) => {
  const tr = useT();
  const { t, tp } = tr;
  const change = t('app.common.change');
  const notStated = t('app.animal.notStated');
  const id = draft.individualId.trim();
  const extras = [
    draft.sire.name.trim() || draft.sire.individualId.trim() || draft.sire.recordId
      ? t('app.animal.x.sire', { v: parentWords(draft.sire, tr) })
      : '',
    draft.dam.name.trim() || draft.dam.individualId.trim() || draft.dam.recordId
      ? t('app.animal.x.dam', { v: parentWords(draft.dam, tr) })
      : '',
    draft.herd.trim() ? t('app.animal.x.herd', { v: draft.herd.trim() }) : '',
    draft.photos.length ? tp('app.log.photos', draft.photos.length) : '',
    draft.notes.trim() ? t('app.log.x.notes') : '',
  ].filter(Boolean);
  return (
    <Box data-animal-review="">
      <Line
        k={t('app.animal.k.animal')}
        v={draft.name.trim() || notStated}
        empty={!draft.name.trim()}
        onChange={onChange}
        action={change}
      />
      <Line
        k={t('app.animal.individualId')}
        v={id ? t('app.animal.idIn', { id, scheme: draft.idScheme.trim() }) : notStated}
        empty={!id}
        onChange={onChange}
        action={change}
      />
      <Line
        k={t('app.animal.k.speciesBreed')}
        v={[draft.species.trim(), draft.breed.trim()].filter(Boolean).join(' · ')}
        onChange={onChange}
        action={change}
      />
      <Line
        k={t('app.animal.sex')}
        v={sexWords(draft.sex, tr)}
        empty={draft.sex === 'unknown'}
        onChange={onChange}
        action={change}
      />
      <Line
        k={t('app.animal.k.born')}
        v={draft.dateOfBirth || notStated}
        empty={!draft.dateOfBirth}
        onChange={onChange}
        action={change}
      />
      <Line k={t('app.animal.breeder')} v={draft.breeder.trim()} onChange={onChange} action={change} />
      <Line
        k={t('app.log.k.more')}
        v={extras.length ? extras.join(' · ') : t('app.log.noneAdded')}
        empty={!extras.length}
        onChange={onChange}
        action={extras.length ? change : t('app.common.add')}
      />
    </Box>
  );
};

/** What the animal form says before sealing, the plant's warning in the same words. */
export const SealedWarning: React.FC = () => {
  const { t } = useT();
  return (
    <Alert icon={<LockIcon />} severity="info" variant="outlined">
      {rich(t('app.log.sealedWarn'), { b: (c) => <b>{c}</b> })}
    </Alert>
  );
};
