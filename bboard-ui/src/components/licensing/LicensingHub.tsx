// LicensingHub (/licenses) — every agreement this browser holds (licenses, lab transfers,
// breeder shares), across all records. Where they are practice only, it says so.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Box, Link, Paper, Stack, Typography } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import EastIcon from '@mui/icons-material/East';
import { motion } from 'framer-motion';
import { useLicenses, allLicenses, agreementType, useLockedLicenses } from '../../veilcore/licenses';
import { getRecord } from '../../veilcore/records';
import { AppHeader } from '../AppHeader';
import { useT } from '../../i18n/app';
import { LicenseStateChip } from './LicenseStateChip';
import { AgreementTypeChip } from './AgreementTypeChip';
import { linkCard } from '../a11y';
import { LockedAgreements } from '../LockedRecords';
import { AGREEMENTS_REAL } from '../../veilcore/agreements-real';

const MPaper = motion(Paper);

export const LicensingHub: React.FC = () => {
  useLicenses();
  const navigate = useNavigate();
  const licenses = allLicenses();
  const locked = useLockedLicenses();
  const tr = useT();

  return (
    <Box>
      <AppHeader />
      <Typography variant="h4" component="h1" sx={{ mb: 0.5 }}>
        {tr.t('app.lic.hub.title')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {tr.t('app.lic.hub.intro')}
        {!AGREEMENTS_REAL && ` ${tr.t('app.copy.agreementsSimulated')}`}
      </Typography>

      <Box sx={{ mb: 2 }}>
        <LockedAgreements />
      </Box>
      {licenses.length === 0 && locked.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderStyle: 'dashed' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {tr.t('app.lic.hub.empty')}
          </Typography>
          <Link component={RouterLink} to="/records">
            {tr.t('app.lic.hub.toRecords')}
          </Link>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {licenses.map((l) => {
            const record = getRecord(l.recordId);
            return (
              <MPaper
                key={l.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                {...linkCard(() => navigate(`/license/${l.id}`), tr.t('app.lic.hub.open', { id: l.id }))}
                sx={{
                  p: 2.5,
                  cursor: 'pointer',
                  '&:hover': { borderColor: 'secondary.main' },
                  '&:focus-visible': { borderColor: 'secondary.main' },
                }}
              >
                <Stack
                  direction="row"
                  sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap' }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="h6" component="h2" noWrap>
                      {record?.strainName ?? l.recordId} → {l.terms?.licensee || tr.t('app.lic.hub.unnamed')}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
                      {l.id} · {l.terms?.startDate} → {l.terms?.endDate}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                    <AgreementTypeChip type={agreementType(l)} />
                    <LicenseStateChip license={l} />
                    <EastIcon sx={{ color: 'text.secondary' }} />
                  </Stack>
                </Stack>
              </MPaper>
            );
          })}
        </Stack>
      )}
    </Box>
  );
};
