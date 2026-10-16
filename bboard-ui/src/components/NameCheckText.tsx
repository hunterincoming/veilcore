// The words after a checked signer's name, with the public listing as a link (round 4).
//
// The text comes from attesters.ts signerLabel, the one helper every screen uses; this
// only turns the listing's host into a link to the page the operator checked, so a reader
// can look the lab up themselves. signerLabel only gives a match for an https address.
//
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { Link } from '@mui/material';
import type { SignerLabel } from '../veilcore/attesters';
import { useT } from '../i18n/app';

/**
 * signerLabel's `rest` (nothing when the name isn't checked), with a leading space. `english`:
 * inside a part that stays in English whatever the page's language (the certificate card).
 */
export const NameCheckText: React.FC<{ label: SignerLabel; english?: boolean }> = ({ label, english }) => {
  // The space between sentences: ' ' in English, none in Japanese (app.signer.sep).
  const page = useT().t('app.signer.sep');
  const sep = english ? ' ' : page;
  return label.match ? (
    <>
      {sep}
      {label.match.before}
      <Link href={label.match.href} target="_blank" rel="noopener noreferrer" data-name-check-source="">
        {label.match.host}
      </Link>
      {label.match.after}
      {sep}
      {label.disclaimer}
    </>
  ) : null;
};
