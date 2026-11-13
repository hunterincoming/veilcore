// The language picker in the one header (components/SiteHeader.tsx), and the notice over a
// draft translation, which every page has under that header.
// SPDX-License-Identifier: Apache-2.0

import React, { useState } from 'react';
import { Box, Button, IconButton, MenuItem, TextField, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
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

/** Where a closed draft notice is remembered: the languages it was closed for. */
export const DRAFT_CLOSED_STORAGE = 'veilcore.draft-notice-closed.v1';

const closedFor = (): string[] => {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(DRAFT_CLOSED_STORAGE) ?? '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
};

/**
 * A slim bar over a draft translation, which the visitor can close (fresh-eyes review, 12 Nov:
 * in Japanese and German it took the top ~220px of every page). Closed once, it stays closed
 * for that language in this browser; a browser that can't remember shows it again next time.
 */
export const DraftBanner: React.FC = () => {
  const { isDraft, setLang, t, lang } = useI18n();
  const [closed, setClosed] = useState<string[]>(closedFor);
  if (!isDraft || closed.includes(lang)) return null;
  const close = () => {
    const next = [...closed, lang];
    setClosed(next);
    try {
      localStorage.setItem(DRAFT_CLOSED_STORAGE, JSON.stringify(next));
    } catch {
      /* shown again next time */
    }
  };
  return (
    <Box
      role="note"
      data-draft-notice=""
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 0.5,
        pl: 1.5,
        pr: 0.5,
        py: 0.25,
        mb: 2,
        border: '1px solid rgba(255,200,80,0.45)',
        borderRadius: 1,
        background: 'rgba(255,200,80,0.08)',
      }}
    >
      {/* The words get the bar's whole width (a phone squeezed them into a narrow column beside
          the buttons); "Show English" follows them, and the close button keeps the right edge. */}
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexWrap: 'wrap', alignItems: 'center', columnGap: 1 }}>
        <Typography variant="caption" component="p" sx={{ lineHeight: 1.4, py: 0.5, m: 0, flexBasis: '100%' }}>
          {t('draft.banner')}
          {/* The same sentence in English, for whoever can't read the draft (review of ux-polish,
              13 Nov: it was a tooltip, which a phone never shows). */}
          {lang !== 'en' && (
            <Box component="span" lang="en" sx={{ display: 'block', color: 'text.secondary' }} data-draft-english="">
              {en['draft.banner']}
            </Box>
          )}
        </Typography>
        <Button
          size="small"
          onClick={() => setLang('en')}
          sx={{ minHeight: 32, py: 0, px: 0.75, ml: -0.75, fontSize: 13, textDecoration: 'underline' }}
        >
          {t('draft.showEnglish')}
        </Button>
      </Box>
      <IconButton size="small" onClick={close} aria-label={t('draft.close')} sx={{ width: 44, height: 44 }}>
        <CloseIcon fontSize="small" />
      </IconButton>
    </Box>
  );
};
