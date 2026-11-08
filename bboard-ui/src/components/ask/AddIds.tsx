// "Add IDs" for a litter or a calf crop saved without them (users' review, problem 3). Driven by
// the records, not by a job, so the reminder lasts until the IDs exist: microchips go in at 6 to 8
// weeks, long after a job is deleted.
//
// One box per young, labelled with what the record already says (birth order, name, sex) and any
// ID it has, read-only. The person types or scans into each box; a scanner's Enter or Tab moves to
// the next empty box. A paste is only a shortcut: it fills its box and the boxes below, one line
// each, only when it is plainly one column, never past a young that has an ID (ask-job/ids.ts).
// Each young is shown with the ID it will get before Save, and a box that breaks a rule says why
// right under it. Each ID is saved as a correction (records.ts issueCorrection), permanent; a save
// that stops part way keeps what was saved, and Save again sends only the rest.
// SPDX-License-Identifier: Apache-2.0

import React, { useRef, useState } from 'react';
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
import { useT } from '../../i18n/app';
import type { AppKey } from '../../i18n/app/en';
import { correctionWaitsForBackup, issueCorrection, useRecords } from '../../veilcore/records';
import {
  checkBoxes,
  otherIds,
  pasteInto,
  savedIdOf,
  type BoxError,
  type Litter,
  type PasteRefusal,
  type Pasted,
} from '../../ask-job/ids';

export { littersWithoutIds, type Litter } from '../../ask-job/ids';

/** A key a scanner ends a scan with, pressed in an empty box this soon after a move: swallowed. */
const SCAN_GAP_MS = 300;

export const AddIds: React.FC<{ litter: Litter; onClose: () => void }> = ({ litter, onClose }) => {
  const tr = useT();
  const { t, tp } = tr;
  const records = useRecords();
  const [scheme, setScheme] = useState(litter.young.find((r) => r.animal?.idScheme)?.animal?.idScheme ?? '');
  const [values, setValues] = useState<Record<string, string>>({});
  // Saved from this box (a save that stopped part way): shown as saved, never sent again.
  const [savedHere, setSavedHere] = useState<ReadonlyMap<string, string>>(new Map());
  // What the last paste said, under the box it landed in.
  const [pasteNote, setPasteNote] = useState<{ at: string; note: Pasted | PasteRefusal }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const inputs = useRef(new Map<string, HTMLInputElement>());
  const movedAt = useRef(0);

  const { pairs, errors } = checkBoxes(litter, values, savedHere, otherIds(records, litter));
  const blocked = Object.keys(errors).length > 0;
  const waits = litter.young.some((r) => correctionWaitsForBackup(r.id));
  const open = litter.young.filter((r) => !savedIdOf(r, savedHere));

  const errorText = (e: BoxError): string =>
    t(`app.job.ids.no.${e.why}` as AppKey, {
      ...('id' in e ? { id: e.id } : {}),
      ...('name' in e ? { name: e.name } : {}),
    });
  const pasteText = (n: Pasted | PasteRefusal): string | undefined =>
    'why' in n
      ? t(`app.job.ids.paste.${n.why}` as AppKey, {
          ...('id' in n ? { id: n.id } : {}),
          ...('line' in n ? { line: String(n.line) } : {}),
        })
      : n.stopped
        ? tp('app.job.ids.paste.stopped', n.stopped.left, { name: n.stopped.name })
        : n.over
          ? tp('app.job.ids.paste.over', n.over)
          : undefined;

  /** The next young after `id` whose box is empty, if any. */
  const nextEmpty = (id: string): string | undefined => {
    const at = open.findIndex((r) => r.id === id);
    return open.slice(at + 1).find((r) => !(values[r.id] ?? '').trim())?.id;
  };
  const focus = (id: string | undefined) => {
    if (!id) return false;
    inputs.current.get(id)?.focus();
    movedAt.current = Date.now();
    return true;
  };
  // A scanner ends each scan with Enter, Tab, or both: a filled box moves on to the next empty one;
  // the second key of a pair, landing in that empty box at once, is swallowed.
  const onKey = (id: string) => (e: React.KeyboardEvent) => {
    if ((e.key !== 'Enter' && e.key !== 'Tab') || e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) return;
    // Read from the box itself: a scanner's keys come faster than a render.
    const filled = !!(inputs.current.get(id)?.value ?? values[id] ?? '').trim();
    if (!filled) {
      if (e.key === 'Enter' || Date.now() - movedAt.current < SCAN_GAP_MS) e.preventDefault();
      return;
    }
    if (focus(nextEmpty(id))) e.preventDefault();
    else if (e.key === 'Enter') e.preventDefault();
  };
  const onPaste = (id: string) => (e: React.ClipboardEvent) => {
    e.preventDefault();
    const r = pasteInto(litter, id, e.clipboardData.getData('text'), values, savedHere, scheme);
    setPasteNote({ at: id, note: r });
    if ('values' in r) setValues(r.values);
  };

  const save = async () => {
    setBusy(true);
    setError(undefined);
    const done = new Map(savedHere);
    try {
      for (const [r, id] of pairs) {
        await issueCorrection(
          r.id,
          {
            refId: id,
            animal: {
              breed: r.animal?.breed ?? '',
              herd: r.animal?.herd ?? '',
              sex: r.animal?.sex ?? 'unknown',
              idScheme: scheme.trim(),
            },
          },
          t('app.job.ids.reason'),
        );
        done.set(r.id, id);
        setSavedHere(new Map(done));
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const sexOf = (r: (typeof litter.young)[number]) =>
    r.animal?.sex === 'male' || r.animal?.sex === 'female' ? t(`app.animal.sex.${r.animal.sex}`) : '';

  return (
    <Dialog open onClose={busy ? undefined : onClose} fullWidth data-add-ids="">
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
            error={!!pairs.length && !scheme.trim()}
            helperText={pairs.length && !scheme.trim() ? t('app.job.ids.schemeNeeded') : undefined}
            slotProps={{ htmlInput: { 'data-add-ids-scheme': '' } }}
          />
          <Stack spacing={1.25} component="ol" sx={{ m: 0, p: 0, listStyle: 'none' }}>
            {litter.young.map((r, i) => {
              const saved = savedIdOf(r, savedHere);
              const label = [`${i + 1}. ${r.strainName}`, sexOf(r)].filter(Boolean).join(' · ');
              const err = errors[r.id];
              const note = pasteNote?.at === r.id ? pasteText(pasteNote.note) : undefined;
              return (
                <Box component="li" key={r.id} data-add-ids-young={i + 1}>
                  {saved ? (
                    <Typography variant="body2" sx={{ py: 1 }} data-add-ids-saved="">
                      {label}: <strong>{t('app.job.ids.already', { id: saved })}</strong>
                    </Typography>
                  ) : (
                    <TextField
                      label={label}
                      value={values[r.id] ?? ''}
                      onChange={(e) => {
                        setValues({ ...values, [r.id]: e.target.value.slice(0, 200) });
                        setPasteNote(undefined);
                      }}
                      onKeyDown={onKey(r.id)}
                      onPaste={onPaste(r.id)}
                      error={!!err}
                      helperText={err ? errorText(err) : undefined}
                      fullWidth
                      size="small"
                      inputRef={(el: HTMLInputElement | null) => {
                        if (el) inputs.current.set(r.id, el);
                        else inputs.current.delete(r.id);
                      }}
                      slotProps={{
                        htmlInput: { 'data-add-ids-box': r.id, autoComplete: 'off', spellCheck: false },
                        formHelperText: { role: err ? 'alert' : undefined },
                      }}
                    />
                  )}
                  {note && (
                    <Alert
                      severity={'why' in pasteNote!.note ? 'warning' : 'info'}
                      variant="outlined"
                      role="alert"
                      sx={{ mt: 0.75 }}
                      data-add-ids-paste-note={'why' in pasteNote!.note ? pasteNote!.note.why : 'stopped'}
                    >
                      {note}
                    </Alert>
                  )}
                </Box>
              );
            })}
          </Stack>
          {/* What Save will do: each young next to the ID it will get. */}
          <Box data-add-ids-preview="">
            <Typography variant="subtitle2" component="h3">
              {t('app.job.ids.preview')}
            </Typography>
            {pairs.length ? (
              <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                {pairs.map(([r, id]) => (
                  <Typography component="li" variant="body2" key={r.id} data-add-ids-pair="">
                    {t('app.job.ids.pair', { name: r.strainName, id })}
                  </Typography>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                {t('app.job.ids.previewNone')}
              </Typography>
            )}
            {blocked && (
              <Typography variant="body2" color="error" sx={{ mt: 0.5 }} data-add-ids-blocked="">
                {tp('app.job.ids.fix', Object.keys(errors).length)}
              </Typography>
            )}
          </Box>
          <Alert severity="info" variant="outlined">
            {t('app.job.ids.permanent')}
          </Alert>
          {waits && (
            <Alert severity="warning" variant="outlined">
              {t('app.sealed.correctBackupFirst')}
            </Alert>
          )}
          {error && (
            <Alert severity="error" variant="outlined" role="alert">
              {error}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy} sx={{ minHeight: 44 }}>
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
    </Dialog>
  );
};
