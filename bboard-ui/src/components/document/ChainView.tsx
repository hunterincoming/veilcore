// The chain view on a record's page (docs/document-chain.md): what this record says it is
// about, and the records that say they are about it, worked out from the records this browser
// holds (veilcore/document-chain.ts). No request is made for it. It includes records kept on
// this device only, and says it is this device's view: a record held elsewhere isn't in it.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Link, Paper, Typography } from '@mui/material';
import { isKeptOnDeviceOnly, useRecords, type StrainRecord } from '../../veilcore/records';
import { downstreamOf, upstreamOf, type ChainStep } from '../../veilcore/document-chain';
import { isDocument } from '../../veilcore/document-profile';
import { isAnimal } from '../../veilcore/animal-profile';
import { chainNextHref, chainNextOf } from '../../veilcore/document-kind';
import { isLabReportRecord } from '../stage/record-kinds';
import { DOCUMENT_CHAIN_ENABLED } from '../../config/network';
import { useT } from '../../i18n/app';
import { kindOrTypeWords, seen } from './DocumentParts';

const Steps: React.FC<{ title: string; steps: readonly ChainStep<StrainRecord>[]; mark: string }> = ({
  title,
  steps,
  mark,
}) => {
  const tr = useT();
  const { t } = tr;
  return (
    <Box sx={{ mb: 1.5 }} {...{ [`data-chain-${mark}`]: String(steps.length) }}>
      <Typography variant="overline" sx={{ display: 'block' }}>
        {title}
      </Typography>
      {steps.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          {t('app.doc.chain.none')}
        </Typography>
      )}
      {steps.map((s) => (
        <Typography
          key={s.id}
          variant="body2"
          sx={{ py: 0.5, pl: (s.depth - 1) * 2 }}
          data-chain-step={s.id}
          data-chain-depth={s.depth}
        >
          {s.record ? (
            <>
              <Link component={RouterLink} to={`/record/${s.id}`}>
                {seen(s.name)}
              </Link>
              {isDocument(s.record) ? ` · ${kindOrTypeWords(s.record, tr)}` : ''}
              {isKeptOnDeviceOnly(s.record) ? ` · ${t('app.doc.local.homeLine')}` : ''}
            </>
          ) : (
            t('app.doc.chain.notHeld', { name: seen(s.name) })
          )}
        </Typography>
      ))}
    </Box>
  );
};

/** A record's chain on this device. A record with nothing either way shows nothing. */
export const ChainView: React.FC<{ record: StrainRecord }> = ({ record }) => {
  const { t } = useT();
  const records = useRecords();
  if (!DOCUMENT_CHAIN_ENABLED) return null;
  const up = upstreamOf(record, records);
  const down = downstreamOf(record, records);
  // The next step is offered from the record itself, so nobody has to find it under "Seal a
  // document": a grow batch from a plant or strain, a harvest lot from a batch, a lab report
  // from a lot. A corrected (superseded) record offers none: its correction does.
  const source = !isDocument(record) && !isAnimal(record) && !isLabReportRecord(record);
  const next = record.supersededBy ? undefined : chainNextOf(record, source);
  const hasChain = up.length > 0 || down.length > 0;
  if (!hasChain && !next) return null;
  return (
    <Paper sx={{ p: { xs: 2.5, md: 3 } }} data-chain-view="">
      {hasChain && (
        <>
          <Typography variant="h6" component="h2" sx={{ mb: 0.5 }}>
            {t('app.doc.chain.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {t('app.doc.chain.text')}
          </Typography>
          {isDocument(record) && <Steps title={t('app.doc.chain.up')} steps={up} mark="up" />}
          <Steps title={t('app.doc.chain.down')} steps={down} mark="down" />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            {t('app.doc.chain.aboutNote')}
          </Typography>
        </>
      )}
      {next && (
        <Box sx={{ mt: hasChain ? 2.5 : 0 }} data-chain-next={next}>
          <Typography variant="h6" component="h2" sx={{ mb: 0.5 }}>
            {t('app.doc.chain.next.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {t('app.doc.chain.next.text')}
          </Typography>
          <Button component={RouterLink} to={chainNextHref(next, record.id)} variant="outlined">
            {t(`app.doc.chain.next.${next}`)}
          </Button>
        </Box>
      )}
    </Paper>
  );
};
