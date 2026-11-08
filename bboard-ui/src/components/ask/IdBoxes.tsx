// One box per young, for their IDs (ask-job/ids.ts): Add IDs (AddIds.tsx) and a litter's result
// screen before Approve (JobPage.tsx) both use it, so the rules are the same in both.
//
// Each box is labelled with what is known of its young (birth order, name, sex); a young that has
// an ID shows it, read-only. The person types or scans. Inside a box, Tab and Enter never leave
// the boxes or press a button (verification X3): a filled box moves on to the next empty box, and
// the last one stays put; the second key of a scanner's Tab+Enter (or Enter+Tab), landing in the
// empty box just moved to, is swallowed. A paste fills its box and the boxes below, one line
// each, only when it plainly lines up; otherwise nothing is filled and the reason sits right
// under that box. Under the boxes, each young with the ID it will get.
// SPDX-License-Identifier: Apache-2.0

import React, { useRef, useState } from 'react';
import { Alert, Box, Stack, TextField, Typography } from '@mui/material';
import { useT } from '../../i18n/app';
import type { AppKey } from '../../i18n/app/en';
import { pasteInto, type BoxError, type IdRow, type PasteRefusal, type Pasted } from '../../ask-job/ids';

/** A key a scanner ends a scan with, pressed in an empty box this soon after a move: swallowed. */
const SCAN_GAP_MS = 300;

export const IdBoxes: React.FC<{
  rows: readonly IdRow[];
  values: Readonly<Record<string, string>>;
  onValues: (v: Record<string, string>) => void;
  errors: Readonly<Record<string, BoxError>>;
  pairs: readonly (readonly [IdRow, string])[];
  disabled?: boolean;
  /** The numbering's name, so a heading that is just it is seen as one. */
  scheme?: string;
}> = ({ rows, values, onValues, errors, pairs, disabled, scheme = '' }) => {
  const tr = useT();
  const { t, tp } = tr;
  const inputs = useRef(new Map<string, HTMLInputElement>());
  const movedAt = useRef(0);
  const [note, setNote] = useState<{ at: string; note: Pasted | PasteRefusal }>();
  const open = rows.filter((r) => !r.saved);

  const valueOf = (key: string) => (inputs.current.get(key)?.value ?? values[key] ?? '').trim();
  const focus = (key: string | undefined) => {
    if (!key) return;
    inputs.current.get(key)?.focus();
    movedAt.current = Date.now();
  };
  const onKey = (key: string) => (e: React.KeyboardEvent) => {
    if ((e.key !== 'Enter' && e.key !== 'Tab') || e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) return;
    // Never out of the boxes, never onto a button: a scanner's next key would press it.
    e.preventDefault();
    const after = open.slice(open.findIndex((r) => r.key === key) + 1);
    if (!valueOf(key)) {
      // An empty box: the second key of a scanner's pair is swallowed; a Tab of a hand moves on.
      if (e.key === 'Tab' && Date.now() - movedAt.current >= SCAN_GAP_MS) focus(after[0]?.key);
      return;
    }
    focus(after.find((r) => !valueOf(r.key))?.key);
  };
  const onPaste = (key: string) => (e: React.ClipboardEvent) => {
    e.preventDefault();
    const r = pasteInto(rows, key, e.clipboardData.getData('text'), values, scheme);
    setNote({ at: key, note: r });
    if ('values' in r) onValues(r.values);
  };
  const noteText = (n: Pasted | PasteRefusal): string | undefined =>
    'why' in n
      ? t(`app.job.ids.paste.${n.why}` as AppKey, {
          ...('id' in n ? { id: n.id } : {}),
          ...('name' in n ? { name: n.name } : {}),
          ...('line' in n ? { line: String(n.line) } : {}),
          ...('n' in n ? { n: String(n.n), count: String(n.count) } : {}),
        })
      : n.stopped
        ? tp('app.job.ids.paste.stopped', n.stopped.left, { name: n.stopped.name })
        : undefined;
  const errorText = (e: BoxError): string =>
    t(`app.job.ids.no.${e.why}` as AppKey, {
      ...('id' in e ? { id: e.id } : {}),
      ...('name' in e ? { name: e.name } : {}),
    });
  const sexOf = (r: IdRow) => (r.sex === 'male' || r.sex === 'female' ? t(`app.animal.sex.${r.sex}`) : '');
  const blocked = Object.keys(errors).length;

  return (
    <Stack spacing={2} data-id-boxes="">
      <Stack spacing={1.25} component="ol" sx={{ m: 0, p: 0, listStyle: 'none' }}>
        {rows.map((r, i) => {
          const label = [`${i + 1}. ${r.name}`, sexOf(r)].filter(Boolean).join(' · ');
          const err = errors[r.key];
          const said = note?.at === r.key ? noteText(note.note) : undefined;
          return (
            <Box component="li" key={r.key} data-id-young={i + 1}>
              {r.saved ? (
                <Typography variant="body2" sx={{ py: 1 }} data-id-saved="">
                  {label}: <strong>{t('app.job.ids.already', { id: r.saved })}</strong>
                </Typography>
              ) : (
                <TextField
                  label={label}
                  value={values[r.key] ?? ''}
                  onChange={(e) => {
                    onValues({ ...values, [r.key]: e.target.value.slice(0, 200) });
                    setNote(undefined);
                  }}
                  onKeyDown={onKey(r.key)}
                  onPaste={onPaste(r.key)}
                  disabled={disabled}
                  error={!!err}
                  helperText={err ? errorText(err) : undefined}
                  fullWidth
                  size="small"
                  inputRef={(el: HTMLInputElement | null) => {
                    if (el) inputs.current.set(r.key, el);
                    else inputs.current.delete(r.key);
                  }}
                  slotProps={{
                    htmlInput: { 'data-id-box': r.key, autoComplete: 'off', spellCheck: false },
                    formHelperText: { role: err ? 'alert' : undefined },
                  }}
                />
              )}
              {said && note && (
                <Alert
                  severity={'why' in note.note ? 'warning' : 'info'}
                  variant="outlined"
                  role="alert"
                  sx={{ mt: 0.75 }}
                  data-id-paste-note={'why' in note.note ? note.note.why : 'stopped'}
                >
                  {said}
                </Alert>
              )}
            </Box>
          );
        })}
      </Stack>
      {/* What will be saved: each young next to the ID it will get. */}
      <Box data-id-preview="">
        <Typography variant="subtitle2" component="h3">
          {t('app.job.ids.preview')}
        </Typography>
        {pairs.length ? (
          <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
            {pairs.map(([r, id]) => (
              <Typography component="li" variant="body2" key={r.key} data-id-pair="">
                {t('app.job.ids.pair', { name: r.name, id })}
              </Typography>
            ))}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            {t('app.job.ids.previewNone')}
          </Typography>
        )}
        {blocked > 0 && (
          <Typography variant="body2" color="error" sx={{ mt: 0.5 }} data-id-blocked="">
            {tp('app.job.ids.fix', blocked)}
          </Typography>
        )}
      </Box>
    </Stack>
  );
};
