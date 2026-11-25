// The one fixed line on every check page: an early date is not authorship. Whoever dates a
// community's landrace first holds the earliest record of it, and the community, who may never
// make one, holds none; a stranger reading a check page must not take the date for origination
// (ethics panel and blueprint section 4, item 3). Shown whatever the record says, found or not.
// About a plant, an animal or a strain (anything but a document's numbers) it also says the
// living thing may be much older than the date (global summit, 5b item 8).
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Typography } from '@mui/material';
import { useT } from '../../i18n/app';

export const DatedNotOrigin: React.FC<{ center?: boolean; living?: boolean }> = ({ center, living = true }) => {
  const { t } = useT();
  return (
    <Typography
      variant="body2"
      color="text.secondary"
      data-dated-not-origin=""
      sx={{ mb: 3, fontWeight: 600, ...(center ? { textAlign: 'center', maxWidth: 460, mx: 'auto' } : {}) }}
    >
      {t(living ? 'app.origin.datedNotOriginLiving' : 'app.origin.datedNotOrigin')}
    </Typography>
  );
};
