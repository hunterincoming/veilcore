// Where the recovery sheet is offered, right after Face ID set up saving with VeilCore
// (KeepSafe.tsx): easy mode step 3 builds the sheet itself (a printable code, made on the device,
// that opens the same records if the Apple or Google account is lost) and fills this in. Until
// then it draws nothing. It is the strong prompt the founder asked for: shown here, at once,
// before "Done"; and the account line on Home asks for it while only a passkey that stays on one
// device can open the records (veilcore/account-copy.ts countsAsBackup).
// SPDX-License-Identifier: Apache-2.0

import React from 'react';

export const RecoverySheetPrompt: React.FC = () => null;
