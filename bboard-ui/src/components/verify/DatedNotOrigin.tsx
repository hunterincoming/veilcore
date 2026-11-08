// The one fixed line on every check page: an early date is not authorship. Whoever dates a
// community's landrace first holds the earliest record of it, and the community, who may never
// make one, holds none; a stranger reading a check page must not take the date for origination
// (ethics panel and blueprint section 4, item 3). Shown whatever the record says, found or not.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Typography } from '@mui/material';
import { useT } from '../../i18n/app';

export const DatedNotOrigin: React.FC<{ center?: boolean }> = ({ center }) => {
  const { t } = useT();
  return (
    <Typography
      variant="body2"
      color="text.secondary"
      data-dated-not-origin=""
      sx={{ mb: 3, fontWeight: 600, ...(center ? { textAlign: 'center', maxWidth: 460, mx: 'auto' } : {}) }}
    >
      {t('app.origin.datedNotOrigin')}
    </Typography>
  );
};
