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

/** signerLabel's `rest` (nothing when the name isn't checked), with a leading space. */
export const NameCheckText: React.FC<{ label: SignerLabel }> = ({ label }) =>
  label.match ? (
    <>
      {' '}
      {label.match.before}
      <Link href={label.match.href} target="_blank" rel="noopener noreferrer" data-name-check-source="">
        {label.match.host}
      </Link>
      {label.match.after} {label.disclaimer}
    </>
  ) : null;
