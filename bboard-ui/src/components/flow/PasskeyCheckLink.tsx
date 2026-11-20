// A link to the passkey check page (public/tools/passkey-check.html; docs/passkey-support.md):
// in Settings, and under a passkey step that failed. It opens in a new tab, in the app's language.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Typography } from '@mui/material';
import { rich, useT } from '../../i18n/app';

export const PASSKEY_CHECK_PATH = '/tools/passkey-check.html';

export const PasskeyCheckLink: React.FC<{ words: 'settings' | 'failed' }> = ({ words }) => {
  const tr = useT();
  const href = `${PASSKEY_CHECK_PATH}?lang=${encodeURIComponent(tr.lang)}`;
  return (
    <Typography variant="body2" color="text.secondary" data-passkey-check-link={words}>
      {rich(tr.t(words === 'settings' ? 'app.settings.passkeyCheck' : 'app.account.sheet.passkeyCheck'), {
        link: (c) => (
          <a href={href} target="_blank" rel="noopener noreferrer">
            {c}
          </a>
        ),
      })}
    </Typography>
  );
};
