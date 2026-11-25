// "Where it came from": the optional step for a landrace, an heirloom, a selection from plants
// the holder got, or received material (LogFlow.tsx), between the plant's first screen and "Is this right?". Every field is optional;
// what is typed is sealed in the record's notes as labelled lines (veilcore/origin-notes.ts), so
// no record's fingerprint is computed any differently.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material';
import { ScreenHeading } from './FlowFrame';
import { useT } from '../../i18n/app';
import type { AppKey } from '../../i18n/app/en';
import {
  ORIGIN_LABELS,
  ORIGIN_MAX,
  originHasContent,
  type Origin,
  type OriginField,
  type OriginSource,
} from '../../veilcore/origin-notes';

/**
 * The step's fields, in screen order, with their words. MCPD codes come only from an import; the
 * variety registration number is on the plant's first screen, since it applies to a plant the
 * holder bred too.
 */
const FIELDS: readonly {
  readonly k: Exclude<
    OriginField,
    'sampStat' | 'collSrc' | 'donor' | 'instCode' | 'collSite' | 'mlsStat' | 'ancest' | 'registration'
  >;
  readonly label: AppKey;
  readonly help?: AppKey;
  readonly placeholder?: AppKey;
}[] = [
  { k: 'from', label: 'app.origin.from', help: 'app.origin.fromHelp' },
  { k: 'collection', label: 'app.origin.collection' },
  { k: 'country', label: 'app.origin.country', help: 'app.origin.countryHelp' },
  { k: 'received', label: 'app.origin.received' },
  { k: 'permit', label: 'app.origin.permit', help: 'app.origin.permitHelp' },
  { k: 'smta', label: 'app.origin.smta', help: 'app.origin.smtaHelp' },
  { k: 'ircc', label: 'app.origin.ircc', help: 'app.origin.irccHelp' },
  { k: 'doi', label: 'app.origin.doi', placeholder: 'app.origin.doiPlaceholder' },
];

/** How each sealed line reads on screen, in the visitor's language. */
const LINE_WORDS: Record<OriginField, AppKey> = {
  from: 'app.origin.x.from',
  collection: 'app.origin.x.collection',
  country: 'app.origin.x.country',
  received: 'app.origin.x.received',
  permit: 'app.origin.x.permit',
  smta: 'app.origin.x.smta',
  ircc: 'app.origin.x.ircc',
  doi: 'app.origin.x.doi',
  sampStat: 'app.origin.x.sampStat',
  collSrc: 'app.origin.x.collSrc',
  donor: 'app.origin.x.donor',
  instCode: 'app.origin.x.instCode',
  collSite: 'app.origin.x.collSite',
  mlsStat: 'app.origin.x.mlsStat',
  ancest: 'app.origin.x.ancest',
  registration: 'app.origin.x.registration',
};

export const OriginStep: React.FC<{
  step: string;
  /** A selection asks "Selected from what?" in the first box (sealed under the same label). */
  source?: OriginSource;
  /** The parent record whose lines this next stage carried over, if it did. */
  fromParent?: string;
  origin: Origin;
  setOrigin: (o: Origin) => void;
  onBack: () => void;
  onNext: () => void;
}> = ({ step, source, fromParent, origin, setOrigin, onBack, onNext }) => {
  const { t } = useT();
  const selected = source === 'selected';
  return (
    <Stack spacing={2.5} data-origin-step="" data-origin-for={source}>
      <Box>
        <ScreenHeading step={step}>{t('app.origin.title')}</ScreenHeading>
        <Typography variant="body1" color="text.secondary">
          {t('app.origin.intro')}
        </Typography>
      </Box>
      {fromParent && (
        <Alert severity="info" variant="outlined" data-origin-inherited="">
          {t('app.origin.inherited', { name: fromParent })}
        </Alert>
      )}
      {FIELDS.map(({ k, label, help, placeholder }) => (
        <TextField
          key={k}
          label={t(selected && k === 'from' ? 'app.origin.selectedFrom' : label)}
          value={origin[k]}
          onChange={(e) => setOrigin({ ...origin, [k]: e.target.value.slice(0, ORIGIN_MAX) })}
          helperText={selected && k === 'from' ? t('app.origin.selectedFromHelp') : help ? t(help) : undefined}
          placeholder={placeholder ? t(placeholder) : undefined}
          fullWidth
          {...(k === 'received' ? { type: 'date', slotProps: { inputLabel: { shrink: true } } } : {})}
          {...(k === 'from' ? { multiline: true, maxRows: 4 } : {})}
        />
      ))}
      <Button variant="contained" size="large" fullWidth onClick={onNext} sx={{ py: 1.6 }}>
        {t('app.log.nextCheck')}
      </Button>
      <Button variant="text" color="inherit" onClick={onBack} sx={{ minHeight: 48 }}>
        ← {t('app.origin.back')}
      </Button>
    </Stack>
  );
};

/** The "Where it came from" line on "Is this right?": what will be sealed, or "None added". */
export const OriginReviewLine: React.FC<{ origin: Partial<Origin> | undefined; onChange: () => void }> = ({
  origin,
  onChange,
}) => {
  const { t } = useT();
  const has = originHasContent(origin);
  const parts = ORIGIN_LABELS.flatMap(([k]) => {
    const v = (origin?.[k] ?? '').replace(/\s+/g, ' ').trim();
    return v ? [t(LINE_WORDS[k], { v })] : [];
  });
  return (
    <Stack
      direction="row"
      spacing={2}
      sx={{ alignItems: 'center', py: 1.2, borderBottom: '1px solid', borderColor: 'divider' }}
      data-origin-review=""
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary">
          {t('app.origin.title')}
        </Typography>
        {has ? (
          // One line per value: a run of them joined by dots is hard to read on a phone.
          parts.map((p) => (
            <Typography key={p} variant="body1" sx={{ fontWeight: 700, wordBreak: 'break-word' }}>
              {p}
            </Typography>
          ))
        ) : (
          <Typography variant="body1" sx={{ fontWeight: 700, color: 'text.secondary' }}>
            {t('app.log.noneAdded')}
          </Typography>
        )}
      </Box>
      <Button variant="text" onClick={onChange}>
        {has ? t('app.common.change') : t('app.common.add')}
      </Button>
    </Stack>
  );
};
