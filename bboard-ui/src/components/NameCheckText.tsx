// What follows a signer's name on screen: how far its key is verified, in words
// (LabIdentityBadge; docs/lab-identity-levels.md), with the public listing and the lab's
// website as links so a reader can look the lab up themselves.
//
// The level comes from attesters.ts signerLabel, the one helper every screen uses, so the
// words before it ("Signed by a key calling itself “Acme Labs” (not verified)") and the level
// can't disagree.
//
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import type { SignerLabel } from '../veilcore/attesters';
import { LabIdentityBadge } from './LabIdentityBadge';

/**
 * `english`: inside a part that stays in English whatever the page's language (the certificate
 * card).
 */
export const NameCheckText: React.FC<{ label: SignerLabel; english?: boolean }> = ({ label, english }) => (
  <LabIdentityBadge identity={label.identity} english={english} />
);
