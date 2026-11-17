// The first screen of a new record: one question, "What do you want to prove?", and only the
// kinds this site offers, each in the words of the people who'd pick it (with examples), so
// nobody has to know VeilCore's record types to start. Nothing else is on the screen: the form
// comes after the choice (progressive disclosure), with a way back.
//
// "Plants" covers a single plant and a line bred from seed alike (the plant form's name is
// "Plant or line name"); "Microbes and cell lines" is the strain record (docs/strain-profile.md),
// named for what it holds so a grower never mistakes it for a cannabis strain.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { ButtonBase, Paper, Stack, Typography } from '@mui/material';
import type { LogKind } from './animal-draft';
import { useT } from '../../i18n/app';
import type { AppKey } from '../../i18n/app/en';
import { ScreenHeading } from './FlowFrame';
import { DOCUMENT_CHAIN_ENABLED } from '../../config/network';
import { PlanBox } from '../PlanBox';
import { useRecords, waitingHere } from '../../veilcore/records';

type Option = { key: LogKind | 'document' | 'chain'; title: AppKey; text: AppKey };

const Card: React.FC<{ option: Option; onPick?: () => void; to?: string }> = ({ option, onPick, to }) => {
  const { t } = useT();
  const inner = (
    <Paper
      variant="outlined"
      sx={{ p: 2.5, width: '100%', textAlign: 'left', '&:hover': { borderColor: 'primary.main' } }}
    >
      <Typography variant="h6" component="span" sx={{ display: 'block', mb: 0.5 }}>
        {t(option.title)}
      </Typography>
      <Typography variant="body2" color="text.secondary" component="span" sx={{ display: 'block' }}>
        {t(option.text)}
      </Typography>
    </Paper>
  );
  const sx = { display: 'block', width: '100%', borderRadius: 1 };
  return to ? (
    <ButtonBase component={RouterLink} to={to} sx={sx} data-start={option.key}>
      {inner}
    </ButtonBase>
  ) : (
    <ButtonBase onClick={onPick} sx={sx} data-start={option.key}>
      {inner}
    </ButtonBase>
  );
};

export const StartChoice: React.FC<{
  onPick: (k: LogKind) => void;
  animals: boolean;
  strains: boolean;
  documents: boolean;
}> = ({ onPick, animals, strains, documents }) => {
  const { t } = useT();
  const records = useRecords();
  const options: Option[] = [
    { key: 'plant', title: 'app.start.plant', text: 'app.start.plantText' },
    ...(animals ? [{ key: 'animal', title: 'app.start.animal', text: 'app.start.animalText' } as Option] : []),
    ...(strains ? [{ key: 'strain', title: 'app.start.strain', text: 'app.start.strainText' } as Option] : []),
    ...(documents ? [{ key: 'document', title: 'app.start.document', text: 'app.start.documentText' } as Option] : []),
    // A step in a production chain is a document record (docs/document-chain.md), offered here by
    // name so nobody has to find it under "A document".
    ...(documents && DOCUMENT_CHAIN_ENABLED
      ? [{ key: 'chain', title: 'app.start.chain', text: 'app.start.chainText' } as Option]
      : []),
  ];
  return (
    <Stack spacing={2} data-start-choice="">
      <ScreenHeading>{t('app.start.title')}</ScreenHeading>
      <Typography variant="body1" color="text.secondary">
        {t('app.start.intro')}
      </Typography>
      {/* The free number used up (paid plans): said here, before anything is filled in. */}
      <PlanBox waiting={waitingHere(records)} compact />
      <Stack spacing={1.5}>
        {options.map((o) =>
          o.key === 'document' ? (
            <Card key={o.key} option={o} to="/documents/new" />
          ) : o.key === 'chain' ? (
            <Card key={o.key} option={o} to="/documents/new?kind=grow-batch" />
          ) : (
            <Card key={o.key} option={o} onPick={() => onPick(o.key as LogKind)} />
          ),
        )}
      </Stack>
    </Stack>
  );
};
