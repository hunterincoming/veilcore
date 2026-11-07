// What Ask (or a link) filled in on a screen: the banner at the top, and a mark on each field
// it filled, so the person checks every one before going on. Small and static: the logging
// screens import it; the Ask sheet itself loads only when opened.
// SPDX-License-Identifier: Apache-2.0

import React, { createContext, useContext } from 'react';
import { Alert, GlobalStyles } from '@mui/material';
import { useT } from '../../i18n/app';

/** The fields filled in on this screen (names the forms use: strainName, parents, name, sire, dam). */
export const AskFillContext = createContext<ReadonlySet<string>>(new Set());

/** Props for a filled field's TextField: a class the banner's styles mark, and a test hook. */
export const useAskMark = (): ((field: string) => Record<string, string>) => {
  const filled = useContext(AskFillContext);
  return (field): Record<string, string> =>
    filled.has(field) ? { className: 'vc-ask-filled', 'data-ask-filled': field } : {};
};

const marked = {
  '.vc-ask-filled .MuiOutlinedInput-root': { backgroundColor: 'rgba(255, 193, 7, 0.10)' },
  '.vc-ask-filled .MuiOutlinedInput-notchedOutline': { borderColor: '#b26a00', borderWidth: 2 },
} as const;

/** "Filled in by Ask. Check every highlighted field." Or, for a link, what the link chose. */
export const AskFilledBanner: React.FC<{ source: 'ask' | 'link' }> = ({ source }) => {
  const { t } = useT();
  return (
    <>
      <GlobalStyles styles={marked} />
      <Alert severity="warning" variant="outlined" data-ask-banner={source}>
        {source === 'ask' ? t('app.ask.banner.ask') : t('app.ask.banner.link')}
      </Alert>
    </>
  );
};
