// AppHeader: the receive and signing-key dialogs, mounted without buttons, so Home and the
// paste box can open them from anywhere.
//
// It used to draw the app's own header too (the wordmark to Home, the language, the network
// badge). Since the fresh-eyes review (12 Nov) every page has the one header, SiteHeader.tsx,
// drawn by the app's frame (App.tsx AppLayout), so this keeps only the dialogs.
// SPDX-License-Identifier: Apache-2.0

import React from 'react';
import { ClaimTransfer } from './ClaimTransfer';
import { AttesterSetup } from './AttesterSetup';

export const AppHeader: React.FC = () => (
  <>
    <ClaimTransfer hideButton />
    <AttesterSetup hideButton />
  </>
);
