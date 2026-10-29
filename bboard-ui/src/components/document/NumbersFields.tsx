// "The numbers on it": typed from a certificate into a published schema's slots, sealed as a
// field set with the document (veilcore/field-set.ts; docs/claims-screen.md), so one can be
// proved later without showing the rest. Only the schema's id and the set's root are sealed in
// the record; the numbers stay in the holder's copy.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Box, InputAdornment, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { SCHEMAS, slotKey, type TypedNumbers } from '../../veilcore/field-set';
import { useT } from '../../i18n/app';
import type { Translator } from '../../i18n/translate';
import type { AppKey } from '../../i18n/app/en';

/** A schema's name in words. */
export const schemaWords = (id: string, tr: Translator): string =>
  tr.t(`app.doc.schema.${id.split('/').slice(-2, -1)[0]}` as AppKey);

/** A slot's label in words, from its path ("seed.germination" → "Germination"). */
export const slotWords = (path: string, tr: Translator): string => tr.t(`app.doc.slot.${slotKey(path)}` as AppKey);

export const NumbersFields: React.FC<{
  schema: string;
  onSchema: (id: string) => void;
  typed: TypedNumbers;
  onTyped: (t: TypedNumbers) => void;
  bad: readonly number[];
}> = ({ schema, onSchema, typed, onTyped, bad }) => {
  const tr = useT();
  const { t } = tr;
  const s = SCHEMAS[schema];
  return (
    <Box data-document-numbers="">
      <Typography variant="overline" sx={{ display: 'block' }}>
        {t('app.doc.nums.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        {t('app.doc.nums.help')}
      </Typography>
      <TextField
        select
        label={t('app.doc.nums.which')}
        value={schema}
        onChange={(e) => onSchema(e.target.value)}
        fullWidth
        sx={{ mb: s ? 2 : 0 }}
      >
        <MenuItem value="">{t('app.doc.nums.none')}</MenuItem>
        {Object.keys(SCHEMAS).map((id) => (
          <MenuItem key={id} value={id}>
            {schemaWords(id, tr)}
          </MenuItem>
        ))}
      </TextField>
      {s && (
        <Stack spacing={1.5}>
          {s.slots
            .filter((slot) => slot.type === 'uint')
            .map((slot) => {
              const places = Math.round(Math.log10(slot.scale ?? 1));
              const wrong = bad.includes(slot.slot);
              return (
                <TextField
                  key={slot.slot}
                  label={slotWords(slot.path, tr)}
                  value={typed[slot.slot] ?? ''}
                  onChange={(e) => onTyped({ ...typed, [slot.slot]: e.target.value })}
                  error={wrong}
                  helperText={wrong ? t('app.doc.nums.bad', { places: String(places) }) : undefined}
                  slotProps={{
                    htmlInput: { inputMode: 'decimal', 'data-slot': slot.slot },
                    input: slot.unit
                      ? { endAdornment: <InputAdornment position="end">{slot.unit}</InputAdornment> }
                      : {},
                  }}
                  fullWidth
                />
              );
            })}
        </Stack>
      )}
    </Box>
  );
};
