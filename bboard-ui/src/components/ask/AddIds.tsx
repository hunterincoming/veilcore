// "Add IDs" for a litter or a calf crop saved without them (users' review, problem 3). Driven by
// the records, not by a job, so the reminder lasts until the IDs exist: microchips go in at 6 to 8
// weeks, long after a job is deleted.
//
// One box per young (IdBoxes.tsx), read from the records as they are now on every render, never
// as they were when the box opened: a young another tab or device has given an ID shows it,
// read-only (verification X2). Each ID is saved as a correction (records.ts issueCorrection),
// permanent, and a record is corrected once: one corrected elsewhere meanwhile is refused with
// a clear message. Records are read afresh before Save. The boxes are locked while it saves; a
// save that stops part way keeps what was saved, and Save again sends only the rest. Cancel with
// IDs typed and not saved asks first.
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useT } from '../../i18n/app';
import {
  ALREADY_CORRECTED,
  CorrectionRefused,
  allRecords,
  correctionWaitsForBackup,
  issueCorrection,
  refresh,
  useRecords,
} from '../../veilcore/records';
import { saveIds } from '../../ask-job/save-ids';
import { checkBoxes, otherIds, rowsOfLitter, type Litter } from '../../ask-job/ids';
import { IdBoxes } from './IdBoxes';

export { littersWithoutIds, type Litter } from '../../ask-job/ids';

export const AddIds: React.FC<{ litter: Litter; onClose: () => void }> = ({ litter, onClose }) => {
  const tr = useT();
  const { t, tp } = tr;
  const records = useRecords();
  const rows = rowsOfLitter(litter, records);
  const [scheme, setScheme] = useState(rows.find((r) => r.record?.animal?.idScheme)?.record?.animal?.idScheme ?? '');
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [askClose, setAskClose] = useState(false);

  const { pairs, errors } = checkBoxes(rows, values, otherIds(records, rows));
  const blocked = Object.keys(errors).length > 0;
  const waits = rows.some((r) => r.record && !r.saved && correctionWaitsForBackup(r.record.id));
  const open = rows.filter((r) => !r.saved);
  const unsaved = open.some((r) => (values[r.key] ?? '').trim());

  const close = () => {
    if (busy) return;
    if (unsaved && !askClose) setAskClose(true);
    else onClose();
  };

  /** A refusal in the page's language (CorrectionRefused carries its words' key). */
  const said = (e: unknown): string =>
    e instanceof CorrectionRefused
      ? t(e.key)
      : e instanceof Error && e.message === ALREADY_CORRECTED()
        ? t('app.sealed.alreadyCorrected')
        : e instanceof Error
          ? e.message
          : String(e);

  /**
   * After some were saved, why the rest weren't, said about the job (round 8): never a record's
   * own "nothing was changed" next to "2 saved".
   */
  const stoppedAt = (e: unknown, name: string): string => {
    const key = e instanceof CorrectionRefused ? e.key : undefined;
    if (key === 'app.sealed.correctNeedsConnection') return t('app.job.ids.offlineRest');
    if (key === 'app.sealed.correctionConnectionLost') return t('app.job.ids.lostRest', { name });
    if (key === 'app.sealed.alreadyCorrected' || (e instanceof Error && e.message === ALREADY_CORRECTED()))
      return t('app.job.ids.changed');
    return t('app.job.ids.failedRest', { name, why: said(e) });
  };

  const save = async () => {
    setBusy(true);
    setError(undefined);
    try {
      // Read afresh and checked again before each correction (save-ids.ts): another device may
      // have saved since this screen was drawn.
      const r = await saveIds(litter, values, pairs, scheme, t('app.job.ids.reason'), {
        refresh,
        allRecords,
        issueCorrection,
      });
      // Some saved before it stopped: said how many, and how many weren't.
      const some =
        'saved' in r &&
        r.saved > 0 &&
        !('clashes' in r) &&
        !('unchecked' in r) &&
        ('offline' in r || 'changed' in r || 'gone' in r || 'failed' in r)
          ? `${t('app.job.ids.savedSome', { saved: String(r.saved), left: String(pairs.length - r.saved) })} `
          : '';
      if ('offline' in r) setError(some + t(some ? 'app.job.ids.offlineRest' : 'app.job.ids.offline'));
      else if ('changed' in r) setError(some + t('app.job.ids.changed'));
      else if ('gone' in r) setError(some + t('app.job.ids.gone', { name: r.gone }));
      else if ('failed' in r) setError(some ? some + stoppedAt(r.failed, r.name) : said(r.failed));
      else if (r.unchecked)
        // Saved, but the check afterwards couldn't reach VeilCore: said, never closed quietly.
        setError(t('app.job.ids.unchecked', { saved: String(r.saved) }));
      else if (r.clashes?.length)
        // Saved, but another device saved one of these IDs on another animal the same moment: said loudly.
        setError(
          r.clashes
            .map((c) => t('app.job.ids.clash', { id: c.id, names: c.names.join(tr.lang === 'ja' ? '、' : ', ') }))
            .join(' '),
        );
      else onClose();
    } catch (e) {
      setError(said(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onClose={close} fullWidth data-add-ids="">
      <DialogTitle>{tp('app.job.ids.title', open.length, { dam: litter.dam })}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2">
            {tr.date(`${litter.born}T12:00:00`)} · {t('app.job.ids.help')}
          </Typography>
          <TextField
            label={t('app.animal.idScheme')}
            value={scheme}
            onChange={(e) => setScheme(e.target.value.slice(0, 200))}
            size="small"
            required
            disabled={busy}
            error={!!pairs.length && !scheme.trim()}
            helperText={pairs.length && !scheme.trim() ? t('app.job.ids.schemeNeeded') : undefined}
            slotProps={{ htmlInput: { 'data-add-ids-scheme': '' } }}
          />
          <IdBoxes
            rows={rows}
            values={values}
            onValues={(v) => {
              setValues(v);
              setAskClose(false);
            }}
            errors={errors}
            pairs={pairs}
            disabled={busy}
            scheme={scheme}
          />
          <Alert severity="info" variant="outlined">
            {t('app.job.ids.permanent')}
          </Alert>
          {waits && (
            <Alert severity="warning" variant="outlined">
              {t('app.sealed.correctBackupFirst')}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      {/* Where the buttons are, so it is in view on a phone. */}
      {askClose ? (
        <DialogActions sx={{ flexDirection: 'column', alignItems: 'stretch', gap: 1 }} data-add-ids-discard="">
          <Typography variant="body2" role="alert" sx={{ px: 1 }}>
            {t('app.job.ids.discardAsk')}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
            <Button onClick={() => setAskClose(false)} sx={{ minHeight: 44 }}>
              {t('app.job.ids.keep')}
            </Button>
            <Button
              variant="contained"
              color="warning"
              onClick={onClose}
              sx={{ minHeight: 44 }}
              data-add-ids-discard-yes=""
            >
              {t('app.job.ids.discard')}
            </Button>
          </Stack>
        </DialogActions>
      ) : (
        <DialogActions sx={{ flexWrap: 'wrap', gap: 1 }}>
          {/* Here, by the buttons, so it is in view on a phone. */}
          {error && (
            <Alert
              severity="error"
              variant="outlined"
              role="alert"
              sx={{ flexBasis: '100%', m: 0 }}
              data-add-ids-error=""
            >
              {error}
            </Alert>
          )}
          <Button onClick={close} disabled={busy} sx={{ minHeight: 44 }} data-add-ids-cancel="">
            {t('app.common.cancel')}
          </Button>
          <Button
            variant="contained"
            disabled={busy || waits || blocked || !pairs.length || !scheme.trim()}
            onClick={() => void save()}
            sx={{ minHeight: 44 }}
            data-add-ids-save=""
          >
            {tp('app.job.ids.save', pairs.length)}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};
