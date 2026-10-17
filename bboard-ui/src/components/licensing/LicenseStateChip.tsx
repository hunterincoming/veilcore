// LicenseStateChip — the current lifecycle state, shown everywhere a license appears.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Chip } from '@mui/material';
import { effectiveState, royaltyProtectionPending, STATE_LABEL, type License } from '../../veilcore/licenses';

const COLOR: Record<string, 'default' | 'warning' | 'success' | 'error'> = {
  draft: 'default',
  sent: 'warning',
  active: 'success',
  expired: 'default',
  revoked: 'error',
};

export const LicenseStateChip: React.FC<{ license: License; size?: 'small' | 'medium' }> = ({ license, size }) => {
  const s = effectiveState(license);
  const chip = (
    <Chip
      size={size ?? 'small'}
      variant={s === 'active' ? 'filled' : 'outlined'}
      color={COLOR[s]}
      label={STATE_LABEL[s]}
    />
  );
  // The royalty on offspring isn't registered with VeilCore yet (round 4, F4): said beside
  // the state wherever the agreement appears, until the registry confirms it.
  if (!royaltyProtectionPending(license)) return chip;
  return (
    <>
      {chip}{' '}
      <Chip
        size={size ?? 'small'}
        variant="outlined"
        color="warning"
        label={ROYALTY_PENDING_LABEL}
        data-royalty-pending=""
      />
    </>
  );
};

export const ROYALTY_PENDING_LABEL = 'Royalty protection pending';
/** Said on the agreement's pages while its royalty obligation waits for the registry (round 4, F4). */
export const ROYALTY_PENDING_TEXT =
  'Royalty protection pending. VeilCore hasn’t confirmed the royalty on offspring yet, so the public lineage check doesn’t show it. This browser sends it again each time it syncs. Keep VeilCore open, or come back soon.';
