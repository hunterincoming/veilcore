// LicenseStateChip — the current lifecycle state, shown everywhere a license appears.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Chip } from '@mui/material';
import { effectiveState, royaltyProtectionPending, stateLabel, type License } from '../../veilcore/licenses';
import { enT } from '../../i18n/translate';
import { useT } from '../../i18n/app';
import { isPracticeAgreement } from '../../veilcore/agreements-real';

const COLOR: Record<string, 'default' | 'warning' | 'success' | 'error'> = {
  draft: 'default',
  sent: 'warning',
  active: 'success',
  expired: 'default',
  revoked: 'error',
};

export const LicenseStateChip: React.FC<{ license: License; size?: 'small' | 'medium' }> = ({ license, size }) => {
  const tr = useT();
  const s = effectiveState(license);
  const chip = (
    <Chip
      size={size ?? 'small'}
      variant={s === 'active' ? 'filled' : 'outlined'}
      color={COLOR[s]}
      label={stateLabel(s, tr)}
    />
  );
  // A practice agreement where agreements are now real (agreements-real.ts): said beside the
  // state wherever it appears, so it is never taken for one on Midnight.
  const practice = isPracticeAgreement(license) && (
    <Chip size={size ?? 'small'} variant="outlined" label={tr.t('app.lic.practice.chip')} data-practice-agreement="" />
  );
  // The royalty on offspring isn't registered with VeilCore yet (round 4, F4): said beside
  // the state wherever the agreement appears, until the registry confirms it.
  const pending = royaltyProtectionPending(license) && (
    <Chip
      size={size ?? 'small'}
      variant="outlined"
      color="warning"
      label={tr.t('app.lic.royaltyPending.label')}
      data-royalty-pending=""
    />
  );
  if (!practice && !pending) return chip;
  return (
    <>
      {chip}
      {practice && <> {practice}</>}
      {pending && <> {pending}</>}
    </>
  );
};

export const ROYALTY_PENDING_LABEL = enT.t('app.lic.royaltyPending.label');
/** Said on the agreement's pages while its royalty obligation waits for the registry (round 4, F4). */
export const ROYALTY_PENDING_TEXT = enT.t('app.lic.royaltyPending.text');
