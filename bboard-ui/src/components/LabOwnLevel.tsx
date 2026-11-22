// On a lab's signing key screen: how check pages show its key today, and the one step to the
// next level (docs/lab-identity-levels.md). The level is the one a reader of the lab's
// signatures sees (veilcore/lab-own-level.ts), drawn by the same badge.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import type { LabIdentity } from '../veilcore/attesters';
import { labIdentityNext } from '../veilcore/lab-identity-words';
import { loadOwnIdentity } from '../veilcore/lab-own-level';
import { LabIdentityBadge } from './LabIdentityBadge';
import { useT } from '../i18n/app';

export const LabOwnLevel: React.FC<{
  publicKey: string;
  /** Opens the steps for listing the key on the lab's website. */
  onWebsite: () => void;
}> = ({ publicKey, onWebsite }) => {
  const { t } = useT();
  const [id, setId] = useState<LabIdentity | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    setId(undefined);
    void loadOwnIdentity(publicKey).then((v) => {
      if (live) setId(v);
    });
    return () => {
      live = false;
    };
  }, [publicKey]);
  if (id === undefined)
    return (
      <Typography variant="body2" color="text.secondary" data-lab-own-level="looking">
        {t('app.labid.own.looking')}
      </Typography>
    );
  if (id === null)
    return (
      <Typography variant="body2" color="text.secondary" data-lab-own-level="unknown">
        {t('app.labid.own.couldNot')}
      </Typography>
    );
  const next = labIdentityNext(id);
  const mail = `mailto:hunter@veilcore.org?subject=${encodeURIComponent(t('app.labid.own.mailSubject'))}&body=${encodeURIComponent(publicKey)}`;
  return (
    <Stack spacing={1} data-lab-own-level={id.level}>
      <Typography variant="subtitle2" component="h3">
        {t('app.labid.own.title')}
      </Typography>
      <Box>
        <LabIdentityBadge identity={id} />
      </Box>
      <Typography variant="body2" data-lab-own-next={next.action ?? 'none'}>
        {t(next.text.key, next.text.vars)}
      </Typography>
      {next.action === 'website' && (
        <Button variant="outlined" onClick={onWebsite} sx={{ alignSelf: 'flex-start', minHeight: 44 }}>
          {t('app.labid.own.do.website')}
        </Button>
      )}
      {next.action === 'listing' && (
        <Button variant="outlined" href={mail} sx={{ alignSelf: 'flex-start', minHeight: 44 }}>
          {t('app.labid.own.do.listing')}
        </Button>
      )}
    </Stack>
  );
};
