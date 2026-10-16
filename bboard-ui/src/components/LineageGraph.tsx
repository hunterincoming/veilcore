// LineageGraph — a simple family tree for a cultivar: its parents above, children below.
// Linked (logged) relatives are clickable. This is what makes renaming detectable.
// A record that dates a lab report has the plant as its parent but is not offspring: it is
// listed apart, as a dated lab report (components/stage/self-chain.ts).
// An animal's tree names its sire and dam by role, with their individual IDs, and its offspring
// are the animals logged with it as sire or dam (veilcore/animal-profile.ts).
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Box, Chip, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { INK_COLOR, LINE_COLOR } from '../config/theme';
import { allRecords, type StrainRecord, type ParentRef } from '../veilcore/records';
import { offspringOf } from './stage/self-chain';
import { datedReportsOf } from './stage/lab-report-notes';
import { useRecordT } from '../i18n/app';
import { isAnimal, recordTitle } from '../veilcore/animal-profile';
import { parentWords } from './flow/AnimalForm';

const Connector: React.FC = () => <Box sx={{ width: 2, height: 20, mx: 'auto', background: LINE_COLOR }} />;

const RelChip: React.FC<{ label: string; to?: string }> = ({ label, to }) =>
  to ? (
    <Chip component={RouterLink} to={to} clickable label={label} variant="outlined" color="primary" size="small" />
  ) : (
    <Chip label={label} variant="outlined" size="small" />
  );

export const LineageGraph: React.FC<{ record: StrainRecord }> = ({ record }) => {
  const parents: ParentRef[] = record.parents ?? [];
  const kids = offspringOf(record.id, allRecords());
  const reports = datedReportsOf(record.id, allRecords());
  const tr = useRecordT(record);
  const { t } = tr;
  const animal = isAnimal(record);

  if (parents.length === 0 && kids.length === 0 && reports.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        {t('app.plant.tree.none')}
      </Typography>
    );
  }

  return (
    <Box sx={{ textAlign: 'center' }}>
      {animal && parents.length > 0 && (
        <>
          <Stack direction="row" spacing={3} sx={{ justifyContent: 'center', flexWrap: 'wrap' }} data-pedigree="">
            {(['sire', 'dam'] as const).map((role) => {
              const p = parents.find((x) => x.role === role);
              return p ? (
                <Box key={role} data-parent-role={role}>
                  <Typography variant="overline" sx={{ display: 'block' }}>
                    {t(role === 'sire' ? 'app.animal.tree.sire' : 'app.animal.tree.dam')}
                  </Typography>
                  <RelChip
                    label={parentWords(p, tr) || p.recordId || ''}
                    to={p.recordId ? `/record/${p.recordId}` : undefined}
                  />
                </Box>
              ) : null;
            })}
          </Stack>
          <Connector />
        </>
      )}
      {!animal && parents.length > 0 && (
        <>
          <Typography variant="overline">{t('app.log.parents')}</Typography>
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'center', flexWrap: 'wrap', mt: 0.5 }}>
            {parents.map((p, i) => (
              <RelChip key={`${p.name}-${i}`} label={p.name} to={p.recordId ? `/record/${p.recordId}` : undefined} />
            ))}
          </Stack>
          <Connector />
        </>
      )}

      <Chip label={recordTitle(record)} sx={{ background: INK_COLOR, color: '#FFFFFF', fontWeight: 700, px: 1 }} />

      {kids.length > 0 && (
        <>
          <Connector />
          <Typography variant="overline">{t('app.plant.tree.offspring')}</Typography>
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'center', flexWrap: 'wrap', mt: 0.5 }}>
            {kids.map((k) => (
              <RelChip key={k.id} label={recordTitle(k)} to={`/record/${k.id}`} />
            ))}
          </Stack>
        </>
      )}

      {reports.length > 0 && (
        <Box sx={{ mt: 2 }} data-dated-reports="">
          <Typography variant="overline">{t('app.plant.tree.datedReports')}</Typography>
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'center', flexWrap: 'wrap', mt: 0.5 }}>
            {reports.map((r) => (
              <RelChip key={r.id} label={r.strainName} to={`/record/${r.id}`} />
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
};
