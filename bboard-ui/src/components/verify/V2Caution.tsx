// The line every date from VeilCore contract version 2 on mainnet carries until its public
// switch (docs/contract-v2.md 7, condition 5), in the evidence bundle's own words. A caution,
// never a tick: the date is real, but the contract is for VeilCore's own testing.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Alert } from '@mui/material';
import type { Translator } from '../../i18n/translate';
import { v2CautionWords, type AnchorState } from './anchor-words';

export const V2Caution: React.FC<{
  readonly check: AnchorState | undefined;
  /** Where the registry says the root was anchored. */
  readonly network: string;
  readonly tr: Translator;
  readonly sx?: React.ComponentProps<typeof Alert>['sx'];
}> = ({ check, network, tr, sx }) => {
  const words = v2CautionWords(check, network, tr);
  if (words === undefined) return null;
  return (
    <Alert severity="warning" variant="outlined" data-v2-caution="" sx={sx}>
      {words}
    </Alert>
  );
};
