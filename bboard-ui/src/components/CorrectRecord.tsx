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
  Box,
  Button,
  Chip,
  Dialog,
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
import { issueCorrection, type StrainRecord } from '../veilcore/records';
import { INK_COLOR } from '../config/theme';
import { useRecordT } from '../i18n/app';
import { isAnimal } from '../veilcore/animal-profile';
import type { AppKey } from '../i18n/app/en';

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
};

/** corrections.ts's consequence for these severities, in the page's language (the same English). */
const consequenceKey = (p: CorrectionPreview): AppKey => `app.plant.fix.c.${p.descentSeverity}.${p.termsSeverity}`;

export const CorrectRecord: React.FC<{
  record: StrainRecord;
  /** Draw the opener yourself (the plant page's action list); default is a button. */
  trigger?: (open: () => void) => React.ReactNode;
}> = ({ record, trigger }) => {
  // An animal's correction: its name, breeder or holder, and notes (animal-profile.ts).
  const { t } = useRecordT(record);
  const animal = isAnimal(record);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const [name, setName] = useState(record.strainName);
  const [bredBy, setBredBy] = useState(record.bredBy);
  const [method, setMethod] = useState(record.breedingMethod ?? '');
  const [notes, setNotes] = useState(record.notes ?? '');
  const [reason, setReason] = useState('');
  const [preview, setPreview] = useState<CorrectionPreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const edited: StrainRecord = {
    ...record,
    strainName: name,
    bredBy,
    breedingMethod: method,
    notes,
  };

  const dirty =
    name !== record.strainName ||
    bredBy !== record.bredBy ||
    method !== (record.breedingMethod ?? '') ||
    notes !== (record.notes ?? '');

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

      <Dialog open={open} onClose={reset} maxWidth="sm" fullWidth>
        <DialogTitle>{t('app.plant.fix.title', { id: record.id })}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {t('app.plant.fix.intro')}
            </Typography>

            <TextField
              label={t('app.plant.fix.name')}
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
                <Typography variant="body2" color="text.secondary">
                  {preview.consequence ? t(consequenceKey(preview)) : ''}
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
            <Button variant="contained" onClick={check} disabled={!dirty}>
              {t('app.plant.fix.check')}
            </Button>
          ) : (
            <Button
              variant="contained"
              disabled={busy || !reason.trim()}
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  const corrected = await issueCorrection(
                    record.id,
                    { strainName: name, bredBy, breedingMethod: method, notes },
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
