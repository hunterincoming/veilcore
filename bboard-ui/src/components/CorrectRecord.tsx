// Correcting a sealed record.
//
// The original is never edited and never deleted. A correction issues a new record that
// supersedes it, and both remain on file - because a record that can be quietly changed
// is not evidence.
//
// The severity is computed from which field changed, not chosen. The holder is shown the
// consequence before committing, because "material for terms" means nothing to a breeder
// and "anyone holding an agreement against this needs to know" does.
//
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  MenuItem,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/EditOutlined';
import { useNavigate } from 'react-router-dom';
import { previewCorrection, type CorrectionPreview } from '../veilcore/corrections';
import {
  allRecords,
  correctionWaitsForBackup,
  integrityOf,
  issueCorrection,
  type StrainRecord,
} from '../veilcore/records';
import { INK_COLOR } from '../config/theme';
import { useRecordT } from '../i18n/app';
import { ANIMAL_SEXES, isAnimal, type AnimalSex } from '../veilcore/animal-profile';
import type { AppKey } from '../i18n/app/en';
import { SCHEMES, idShapeHint, sexWords } from './flow/AnimalForm';
import { line } from '../ask/batch';

const FIELD_LABEL: Record<string, AppKey> = {
  'profileData.cultivarName': 'app.plant.fix.field.cultivarName',
  'profileData.breederName': 'app.plant.fix.field.breederName',
  'profileData.breedingMethod': 'app.plant.fix.field.breedingMethod',
  'profileData.claimedCreationDate': 'app.plant.fix.field.claimedCreationDate',
  'profileData.notes': 'app.plant.fix.field.notes',
  'profileData.internalReference': 'app.plant.fix.field.internalReference',
  parents: 'app.plant.fix.field.parents',
  attestations: 'app.plant.fix.field.attestations',
  sealedAt: 'app.plant.fix.field.sealedAt',
  holder: 'app.plant.fix.field.holder',
  'profileData.sex': 'app.plant.fix.field.sex',
  'profileData.individualId': 'app.plant.fix.field.individualId',
  'profileData.idScheme': 'app.plant.fix.field.idScheme',
};

/** corrections.ts's consequence for these severities, in the page's language (the same English). */
const consequenceKey = (p: CorrectionPreview): AppKey => `app.plant.fix.c.${p.descentSeverity}.${p.termsSeverity}`;

/**
 * Whether anything this browser knows of depends on the record: a record naming it as a parent,
 * or an agreement on it. Without either, a material correction affects nothing else yet, and the
 * screen says so plainly instead of warning about offspring and agreements a newborn hasn't got.
 */
const hasDependants = (record: StrainRecord): boolean =>
  (record.licenseIds?.length ?? 0) > 0 || allRecords().some((r) => r.parents?.some((p) => p.recordId === record.id));

export const CorrectRecord: React.FC<{
  record: StrainRecord;
  /** Draw the opener yourself (the plant page's action list); default is a button. */
  trigger?: (open: () => void) => React.ReactNode;
}> = ({ record, trigger }) => {
  // An animal's correction: its name, breeder or holder, notes, and its sex and individual ID
  // (animal-profile.ts): a herd book corrects these after a DNA parentage result, and a batch of
  // young is often sealed before every ear tag is in. Never the sealed original: a new record.
  const tr = useRecordT(record);
  const { t } = tr;
  const animal = isAnimal(record);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const [name, setName] = useState(record.strainName);
  const [bredBy, setBredBy] = useState(record.bredBy);
  const [method, setMethod] = useState(record.breedingMethod ?? '');
  const [notes, setNotes] = useState(record.notes ?? '');
  const [sex, setSex] = useState<AnimalSex>(record.animal?.sex ?? 'unknown');
  const [individualId, setIndividualId] = useState(record.refId ?? '');
  const [idScheme, setIdScheme] = useState(record.animal?.idScheme ?? '');
  /** As the profile seals them: one line, trimmed; a scheme only beside an ID (batch.ts line). */
  const oneLine = line;
  const animalEdits: Partial<StrainRecord> = animal
    ? {
        refId: oneLine(individualId),
        animal: {
          breed: record.animal?.breed ?? '',
          herd: record.animal?.herd ?? '',
          sex,
          idScheme: oneLine(individualId) ? oneLine(idScheme) : '',
        },
      }
    : {};
  const needsScheme = animal && !!oneLine(individualId) && !oneLine(idScheme);
  const [reason, setReason] = useState('');
  const [preview, setPreview] = useState<CorrectionPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const waits = open && correctionWaitsForBackup(record.id);

  const edited: StrainRecord = {
    ...record,
    strainName: name,
    bredBy,
    breedingMethod: method,
    notes,
    ...animalEdits,
  };

  const dirty =
    name !== record.strainName ||
    bredBy !== record.bredBy ||
    method !== (record.breedingMethod ?? '') ||
    notes !== (record.notes ?? '') ||
    (animal &&
      (sex !== (record.animal?.sex ?? 'unknown') ||
        oneLine(individualId) !== (record.refId ?? '') ||
        (oneLine(individualId) ? oneLine(idScheme) : '') !== (record.animal?.idScheme ?? '')));

  const check = () => setPreview(previewCorrection(record, edited));

  const reset = () => {
    setOpen(false);
    setError(null);
    setPreview(null);
    setReason('');
    setName(record.strainName);
    setBredBy(record.bredBy);
    setMethod(record.breedingMethod ?? '');
    setNotes(record.notes ?? '');
    setSex(record.animal?.sex ?? 'unknown');
    setIndividualId(record.refId ?? '');
    setIdScheme(record.animal?.idScheme ?? '');
  };

  return (
    <>
      {trigger ? (
        trigger(() => setOpen(true))
      ) : (
        <Button variant="text" startIcon={<EditIcon />} onClick={() => setOpen(true)}>
          {t('app.plant.fix.open')}
        </Button>
      )}

      <Dialog open={open && waits} onClose={reset} maxWidth="sm" fullWidth>
        <DialogTitle>{t('app.plant.fix.title', { id: record.strainName || record.refId || record.id })}</DialogTitle>
        <DialogContent>
          {/* Said before anything is typed (round 3, L7): a correction can't be saved yet. */}
          <Alert severity="warning" variant="outlined" sx={{ mt: 1 }} data-correction-backup-first="">
            {t('app.sealed.correctBackupFirst')}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={reset} sx={{ minHeight: 44 }}>
            {t('app.common.cancel')}
          </Button>
          <Button variant="contained" onClick={() => void navigate('/backup')} sx={{ minHeight: 44 }}>
            {t('app.home.saveIt')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={open && !waits} onClose={reset} maxWidth="sm" fullWidth>
        <DialogTitle>{t('app.plant.fix.title', { id: record.strainName || record.refId || record.id })}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {t('app.plant.fix.intro')}
            </Typography>

            <TextField
              label={t('app.plant.fix.name')}
              helperText={t('app.log.nameHelp')}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setPreview(null);
              }}
              fullWidth
            />
            <TextField
              label={t('app.plant.fix.bredBy')}
              value={bredBy}
              onChange={(e) => {
                setBredBy(e.target.value);
                setPreview(null);
              }}
              fullWidth
            />
            {animal && (
              <>
                <TextField
                  select
                  label={t('app.animal.sex')}
                  value={sex}
                  onChange={(e) => {
                    setSex(e.target.value as AnimalSex);
                    setPreview(null);
                  }}
                  fullWidth
                  data-fix-sex=""
                >
                  {ANIMAL_SEXES.map((x) => (
                    <MenuItem key={x} value={x}>
                      {sexWords(x, tr)}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label={t('app.animal.individualId')}
                  value={individualId}
                  onChange={(e) => {
                    setIndividualId(e.target.value.slice(0, 200));
                    setPreview(null);
                  }}
                  helperText={t(idShapeHint(individualId, idScheme, (k) => t(k)) ?? 'app.batch.each.idHelp')}
                  fullWidth
                />
                <Autocomplete<string, false, false, true>
                  freeSolo
                  options={SCHEMES.map((k) => t(k))}
                  inputValue={idScheme}
                  onInputChange={(_, v) => {
                    setIdScheme(v.slice(0, 200));
                    setPreview(null);
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t('app.animal.idScheme')}
                      required={!!oneLine(individualId)}
                      error={needsScheme}
                      helperText={needsScheme ? t('app.animal.need.scheme') : undefined}
                    />
                  )}
                />
              </>
            )}
            {!animal && (
              <TextField
                label={t('app.plant.f.method')}
                value={method}
                onChange={(e) => {
                  setMethod(e.target.value);
                  setPreview(null);
                }}
                fullWidth
              />
            )}
            <TextField
              label={t('app.plant.fix.notes')}
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setPreview(null);
              }}
              fullWidth
              multiline
              minRows={2}
            />

            {preview && (
              <Box sx={{ p: 2, borderRadius: 1, border: `1px solid ${INK_COLOR}` }}>
                <Typography variant="overline" sx={{ display: 'block' }}>
                  {t('app.plant.fix.does')}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ my: 1, flexWrap: 'wrap', gap: 0.5 }}>
                  {preview.changedFields.map((f) => (
                    <Chip key={f} size="small" variant="outlined" label={FIELD_LABEL[f] ? t(FIELD_LABEL[f]) : f} />
                  ))}
                </Stack>
                <Typography variant="body2" color="text.secondary" data-fix-consequence="">
                  {!preview.consequence
                    ? ''
                    : (preview.descentSeverity === 'material' || preview.termsSeverity === 'material') &&
                        !hasDependants(record)
                      ? t('app.plant.fix.c.none')
                      : t(consequenceKey(preview))}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  {t('app.plant.fix.workedOut')}
                </Typography>
              </Box>
            )}

            {preview && (
              <TextField
                label={t('app.plant.fix.why')}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                fullWidth
                helperText={t('app.plant.fix.whyHelp')}
              />
            )}
            {error && (
              <Alert severity="error" variant="outlined">
                {error}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={reset}>{t('app.common.cancel')}</Button>
          {!preview ? (
            <Button variant="contained" onClick={check} disabled={!dirty || needsScheme}>
              {t('app.plant.fix.check')}
            </Button>
          ) : (
            <Button
              variant="contained"
              disabled={busy || !reason.trim()}
              onClick={async () => {
                // A correction is made from the record's fields: never from ones that don't match its fingerprint.
                if (integrityOf(record.id) === 'mismatch') {
                  setError(t('app.sealed.mismatch'));
                  return;
                }
                setBusy(true);
                setError(null);
                try {
                  const corrected = await issueCorrection(
                    record.id,
                    { strainName: name, bredBy, breedingMethod: method, notes, ...animalEdits },
                    reason.trim(),
                  );
                  setBusy(false);
                  reset();
                  if (corrected) navigate(`/record/${corrected.id}`);
                } catch (e) {
                  // The registry refused it and the app has put everything back. Say so
                  // here, where the holder is looking, instead of navigating to a
                  // correction that does not exist.
                  setBusy(false);
                  setError(e instanceof Error ? e.message : t('app.plant.fix.notSaved'));
                }
              }}
            >
              {t('app.plant.fix.issue')}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};
