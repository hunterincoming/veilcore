// One box per young, for their IDs (ask-job/ids.ts): Add IDs (AddIds.tsx) and a litter's result
// screen before Approve (JobPage.tsx) both use it, so the rules are the same in both.
//
// Each box is labelled with what is known of its young (birth order, name, sex); a young that has
// an ID shows it, read-only. The person types or scans. A scanner is told from a hand by timing
// (verification X3, X7): a Tab or Enter within SCANNER_MS of the last character typed into the
// box is a scanner's. A scanner's key never leaves the boxes or presses a button: a filled box
// moves on to the next empty box, the last one stays put, and the second key of its Tab+Enter
// (or Enter+Tab), landing in the empty box just moved to, is swallowed. A scan into a box that
// already has an ID (a double beep, a 7th scan) is taken back, with a note. A person's Tab moves
// focus as anywhere else, on to the buttons; a person's Enter in a filled box moves to the next
// empty one. A paste fills its box and the boxes below, one line each, only when it plainly lines
// up, and so does text put in all at once without a paste (a phone's clipboard chip: "M1 M2 M3");
// otherwise nothing is filled and the reason sits right under that box. Under the boxes, each
// young with the ID it will get.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useRef, useState } from 'react';
import { Alert, Box, Stack, TextField, Typography } from '@mui/material';
import { useT } from '../../i18n/app';
import type { AppKey } from '../../i18n/app/en';
import { pasteInto, splitInsert, type BoxError, type IdRow, type PasteRefusal, type Pasted } from '../../ask-job/ids';

/** A key a scanner ends a scan with, pressed in an empty box this soon after a move: swallowed. */
const SCAN_GAP_MS = 300;
/** A Tab or Enter this soon after the last character typed into the box: a scanner's, not a hand's. */
const SCANNER_MS = 60;

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
  // A note is brought into view when it is said: on a phone it may sit below the fold.
  const noteRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    noteRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [note]);

  const valueOf = (key: string) => (inputs.current.get(key)?.value ?? values[key] ?? '').trim();
  // Per box: when its last character came (the event's own time, so a busy page doesn't blur it),
  // and the ID a scanner finished in it, if one did.
  const lastChar = useRef(new Map<string, number>());
  const scanned = useRef(new Map<string, string>());
  const focus = (key: string | undefined) => {
    if (!key) return;
    inputs.current.get(key)?.focus();
    movedAt.current = performance.now();
  };
  const onKey = (key: string) => (e: React.KeyboardEvent) => {
    const at = e.timeStamp || performance.now();
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      lastChar.current.set(key, at);
      return;
    }
    if ((e.key !== 'Enter' && e.key !== 'Tab') || e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) return;
    const scanner = at - (lastChar.current.get(key) ?? -Infinity) <= SCANNER_MS;
    const after = open.slice(open.findIndex((r) => r.key === key) + 1);
    const value = valueOf(key);
    if (!value) {
      // The second key of a scanner's pair, in the empty box it was just moved to: swallowed.
      if (at - movedAt.current < SCAN_GAP_MS) e.preventDefault();
      // A hand's Tab moves on as anywhere; Enter in an empty box does nothing.
      else if (e.key === 'Enter') e.preventDefault();
      return;
    }
    // The second key of a scanner's pair, in the box the first one stayed in (the last box): swallowed.
    if (!scanner && at - movedAt.current < SCAN_GAP_MS) {
      e.preventDefault();
      return;
    }
    if (scanner) {
      // A scanner's key never leaves the boxes nor presses a button.
      e.preventDefault();
      lastChar.current.delete(key);
      movedAt.current = at;
      const before = scanned.current.get(key);
      if (before && value !== before) {
        // A scan into a box a scan had filled already (a double beep, one scan too many): taken back.
        onValues({ ...values, [key]: before });
        setNote({ at: key, note: { why: 'doubleScan' } });
        return;
      }
      scanned.current.set(key, value);
      focus(after.find((r) => !valueOf(r.key))?.key);
      return;
    }
    // A hand: Enter moves to the next empty box; Tab moves focus as anywhere.
    scanned.current.delete(key);
    if (e.key === 'Enter') {
      e.preventDefault();
      focus(after.find((r) => !valueOf(r.key))?.key);
    }
  };
  const onPaste = (key: string) => (e: React.ClipboardEvent) => {
    e.preventDefault();
    paste(key, e.clipboardData.getData('text'));
  };
  const paste = (key: string, text: string) => {
    const r = pasteInto(rows, key, text, values, scheme);
    setNote({ at: key, note: r });
    if ('values' in r) onValues(r.values);
  };
  const onChange = (key: string, next: string) => {
    const before = values[key] ?? '';
    // Several IDs put in an empty box at once, with no paste event (a phone's clipboard chip, an
    // input method): read as a pasted column, or refused if it can't be told (S1).
    if (!before.trim() && next.length - before.length > 1) {
      const split = splitInsert(next);
      if (split === 'unclear') {
        onValues({ ...values, [key]: '' });
        setNote({ at: key, note: { why: 'spaces' } });
        return;
      }
      if (split) {
        paste(key, split.join('\n'));
        return;
      }
    }
    // Changed other than by adding to it (cleared, edited by hand): no longer the scanned ID.
    const was = scanned.current.get(key);
    if (was !== undefined && !next.startsWith(was)) scanned.current.delete(key);
    onValues({ ...values, [key]: next.slice(0, 200) });
    setNote(undefined);
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
                  onChange={(e) => onChange(r.key, e.target.value)}
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
                  ref={noteRef}
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
