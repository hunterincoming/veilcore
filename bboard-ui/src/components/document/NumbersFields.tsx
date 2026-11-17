// "The numbers on it": typed from a certificate into a published schema's slots, sealed as a
// field set with the document (veilcore/field-set.ts; docs/claims-screen.md), so one can be
// proved later without showing the rest. Only the schema's id and the set's root are sealed in
// the record; the numbers stay in the holder's copy.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Box, InputAdornment, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { OFFERED_SCHEMAS, SCHEMAS, slotKey, type TypedNumbers } from '../../veilcore/field-set';
import { useT } from '../../i18n/app';
import type { Translator } from '../../i18n/translate';
import type { AppKey } from '../../i18n/app/en';

/** A schema's name in words. */
export const schemaWords = (id: string, tr: Translator): string =>
  tr.t(`app.doc.schema.${id.split('/').slice(-2, -1)[0]}` as AppKey);

/** A slot's label in words, from its path ("seed.germination" → "Germination"). */
export const slotWords = (path: string, tr: Translator): string => tr.t(`app.doc.slot.${slotKey(path)}` as AppKey);

/**
 * Whether a label is too long to sit inside its box. A box's floating label is one line and is
 * cut off with "…" (and ran under the unit, "bm²", on a phone): "Floor area under cultivation
 * for this batch, in square metres" was unreadable at 390 px. Such a label goes above the box,
 * whole. Wide characters (Japanese) count twice.
 */
export const labelAbove = (label: string): boolean =>
  [...label].reduce((n, c) => n + ((c.codePointAt(0) ?? 0) >= 0x2e80 ? 2 : 1), 0) > 28;

export const NumbersFields: React.FC<{
  schema: string;
  onSchema: (id: string) => void;
  typed: TypedNumbers;
  onTyped: (t: TypedNumbers) => void;
  bad: readonly number[];
  /** The forms to offer: a holder's by default, a laboratory's when it sends a report. */
  forms?: readonly string[];
  /** Leave out the heading and help (a caller that says it its own way). */
  bare?: boolean;
  /** The form is already chosen and can't be changed here (a grow batch, a harvest lot): no list. */
  fixed?: boolean;
}> = ({ schema, onSchema, typed, onTyped, bad, forms = OFFERED_SCHEMAS, bare = false, fixed = false }) => {
  const tr = useT();
  const { t } = tr;
  const s = SCHEMAS[schema];
  const ids = React.useId();
  // One long label puts every label of the form above its box, so the boxes line up alike.
  const above = !!s && s.slots.some((slot) => slot.type === 'uint' && labelAbove(slotWords(slot.path, tr)));
  return (
    <Box data-document-numbers="">
      {!bare && (
        <>
          <Typography variant="overline" sx={{ display: 'block' }}>
            {t('app.doc.nums.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {t('app.doc.nums.help')}
          </Typography>
        </>
      )}
      {!fixed && (
        <TextField
          select
          label={t('app.doc.nums.which')}
          value={schema}
          onChange={(e) => onSchema(e.target.value)}
          fullWidth
          sx={{ mb: s ? 2 : 0 }}
        >
          <MenuItem value="">{t('app.doc.nums.none')}</MenuItem>
          {forms.map((id) => (
            <MenuItem key={id} value={id}>
              {schemaWords(id, tr)}
            </MenuItem>
          ))}
        </TextField>
      )}
      {s && (
        <Stack spacing={1.5}>
          {s.slots
            .filter((slot) => slot.type === 'uint')
            .map((slot) => {
              const places = Math.round(Math.log10(slot.scale ?? 1));
              const wrong = bad.includes(slot.slot);
              const label = slotWords(slot.path, tr);
              const id = `${ids}-slot-${String(slot.slot)}`;
              return (
                <Box key={slot.slot}>
                  {above && (
                    <Typography
                      component="label"
                      htmlFor={id}
                      variant="body2"
                      sx={{ display: 'block', mb: 0.75, fontWeight: 600 }}
                      data-slot-label=""
                    >
                      {label}
                    </Typography>
                  )}
                  <TextField
                    id={id}
                    label={above ? undefined : label}
                    value={typed[slot.slot] ?? ''}
                    onChange={(e) => onTyped({ ...typed, [slot.slot]: e.target.value })}
                    error={wrong}
                    helperText={
                      wrong
                        ? places === 0
                          ? t('app.doc.nums.badWhole')
                          : t('app.doc.nums.bad', { places: String(places) })
                        : undefined
                    }
                    slotProps={{
                      htmlInput: { inputMode: places === 0 ? 'numeric' : 'decimal', 'data-slot': slot.slot },
                      input: slot.unit
                        ? { endAdornment: <InputAdornment position="end">{slot.unit}</InputAdornment> }
                        : {},
                    }}
                    fullWidth
                  />
                </Box>
              );
            })}
        </Stack>
      )}
    </Box>
  );
};
