// The disclosure receipt: shown just before a step that writes to Midnight, it lists what that
// step makes public, from the contract's own disclose() calls (veilcore/onchain-receipt.ts), and
// what stays private, in the app's fixed words. Nothing here is generated.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Box, Typography } from '@mui/material';
import { useT } from '../../i18n/app';
import type { AppKey } from '../../i18n/app/en';
import { STAYS, receiptFacts, type ReceiptCircuit } from '../../veilcore/onchain-receipt';

export const DisclosureReceipt: React.FC<{
  circuits: readonly ReceiptCircuit[];
  dense?: boolean;
  /** One sentence under the heading: what the button below does on Midnight. */
  lead?: string;
  /** An id for the lead sentence, for a button's aria-describedby (only the sentence, not the whole receipt). */
  leadId?: string;
}> = ({ circuits, dense, lead, leadId }) => {
  const { t } = useT();
  const facts = receiptFacts(circuits);
  const list = { m: 0, pl: 2.5, '& li': { mb: 0.25 } } as const;
  return (
    <Box
      component="section"
      aria-label={t('app.receipt.title')}
      data-receipt={circuits.join(' ')}
      sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: dense ? 1.5 : 2, bgcolor: 'action.hover' }}
    >
      <Typography variant="h6" component="h2" sx={{ fontSize: '1.1rem', fontWeight: 700, mb: 0.5 }}>
        {t('app.receipt.title')}
      </Typography>
      {lead && (
        <Typography variant="body2" sx={{ mb: 1 }} {...(leadId ? { id: leadId } : {})}>
          {lead}
        </Typography>
      )}
      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        {t('app.receipt.public')}
      </Typography>
      <Box component="ul" sx={list} data-receipt-public="">
        {facts.map((f) => (
          // A value proved exactly is published in full: said as a warning, not one line among many.
          <Typography
            component="li"
            variant="body2"
            key={f}
            data-fact={f}
            sx={f === 'value' ? { color: 'warning.dark', fontWeight: 700 } : undefined}
          >
            {t(`app.receipt.fact.${f}` as AppKey)}
          </Typography>
        ))}
        <Typography component="li" variant="body2" data-fact="when">
          {t('app.receipt.when')}
        </Typography>
      </Box>
      <Typography variant="body2" sx={{ fontWeight: 700, mt: 1 }}>
        {t('app.receipt.private')}
      </Typography>
      <Box component="ul" sx={list} data-receipt-private="">
        {STAYS.map((s) => (
          <Typography component="li" variant="body2" key={s} color="text.secondary">
            {t(`app.receipt.stay.${s}` as AppKey)}
          </Typography>
        ))}
      </Box>
    </Box>
  );
};
