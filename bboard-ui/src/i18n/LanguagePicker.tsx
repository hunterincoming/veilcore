// The language picker in the header, and the banner over a draft translation. LanguageBar
// is both, for a page of the app with no header of its own (the check page, a prove link,
// an agreement to sign, the documents).
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Box, Button, MenuItem, TextField, Typography } from '@mui/material';
import TranslateIcon from '@mui/icons-material/Translate';
import { LANGUAGE_NAMES, useI18n, type Lang } from './index';
import { en } from './en';

export const LanguagePicker: React.FC = () => {
  const { lang, setLang, choices, t } = useI18n();
  if (choices.length < 2) return null;
  return (
    <TextField
      select
      size="small"
      value={lang}
      onChange={(e) => setLang(e.target.value as Lang)}
      aria-label={t('nav.language')}
      data-language-picker=""
      slotProps={{
        select: {
          renderValue: (v) => (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <TranslateIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              {LANGUAGE_NAMES[v as Lang].short}
            </Box>
          ),
        },
      }}
      sx={{ minWidth: 92, '& .MuiSelect-select': { py: 0.75, fontSize: 14 } }}
    >
      {choices.map((l) => (
        <MenuItem key={l} value={l} lang={l}>
          {LANGUAGE_NAMES[l].label}
        </MenuItem>
      ))}
    </TextField>
  );
};

export const DraftBanner: React.FC = () => {
  const { isDraft, setLang, t, lang } = useI18n();
  if (!isDraft) return null;
  return (
    <Box
      role="note"
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 1.5,
        px: 2,
        py: 1.25,
        mb: 3,
        border: '1px solid rgba(255,200,80,0.35)',
        borderRadius: 1,
        background: 'rgba(255,200,80,0.06)',
      }}
    >
      <Box sx={{ flex: 1, minWidth: 220 }}>
        <Typography variant="body2">{t('draft.banner')}</Typography>
        {lang !== 'en' && (
          <Typography variant="caption" color="text.secondary" lang="en">
            {en['draft.banner']}
          </Typography>
        )}
      </Box>
      <Button size="small" variant="outlined" onClick={() => setLang('en')}>
        {t('draft.showEnglish')}
      </Button>
    </Box>
  );
};

/** The picker on the right and the draft banner under it, for a page with no header. */
export const LanguageBar: React.FC = () => {
  const { choices, isDraft } = useI18n();
  if (choices.length < 2 && !isDraft) return null;
  return (
    <Box data-language-bar="">
      {choices.length >= 2 && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5 }}>
          <LanguagePicker />
        </Box>
      )}
      <DraftBanner />
    </Box>
  );
};
