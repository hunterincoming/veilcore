// What the backup check and restore say when a file is refused (veilcore/backup.ts), in the
// visitor's language. backup.ts words its reasons in English; each one it can give is
// matched here and said in the chosen language. Anything else (an error from the browser
// itself) is shown as it came.
// SPDX-License-Identifier: Apache-2.0

import { enT, type Translator } from '../../i18n/translate';
import type { AppKey } from '../../i18n/app/en';

/** backup.ts's reasons, word for word, and their keys (the English of each key is the same sentence). */
const KNOWN: [string, AppKey][] = [
  ["That file isn't a VeilCore backup. Pick the file you saved from VeilCore.", 'app.backup.err.notBackup'],
  ["That's an older or different file. Pick the backup you just saved.", 'app.backup.err.olderFile'],
  ['That backup belongs to a different set of records. Pick the one you just saved.', 'app.backup.err.otherSet'],
  ["That backup doesn't hold your records as they are now. Save a new one and check that.", 'app.backup.err.notNow'],
  ["That backup doesn't hold your lab's signature. Save a new one and check that.", 'app.backup.err.noLabSignature'],
  ["That backup doesn't hold your latest deliveries. Save a new one and check that.", 'app.backup.err.noDeliveries'],
  [
    'This browser already holds different keys for one of those plants. Nothing was changed.',
    'app.backup.err.differentKeys',
  ],
  ['This browser is already using a different set of records. Nothing was changed.', 'app.backup.err.differentSet'],
  ['This browser already has a different lab signature. Nothing was changed.', 'app.backup.err.differentLab'],
  // The vault key (sealed records): backup.ts words these from the keys themselves.
  [enT.t('app.sealed.backup.noVaultKey'), 'app.sealed.backup.noVaultKey'],
  [enT.t('app.sealed.backup.differentVault'), 'app.sealed.backup.differentVault'],
  [enT.t('app.sealed.backup.cantCheck'), 'app.sealed.backup.cantCheck'],
  [enT.t('app.sealed.backup.storageRefused'), 'app.sealed.backup.storageRefused'],
  // A password on the file (version 4).
  [enT.t('app.backup.pw.needed'), 'app.backup.pw.needed'],
  [enT.t('app.backup.pw.wrong'), 'app.backup.pw.wrong'],
  // The passkey copy (veilcore/passkey-backup.ts).
  [enT.t('app.backup.passkey.err.unsupported'), 'app.backup.passkey.err.unsupported'],
  [enT.t('app.backup.passkey.err.cancelled'), 'app.backup.passkey.err.cancelled'],
  [enT.t('app.backup.passkey.err.noCopy'), 'app.backup.passkey.err.noCopy'],
  [enT.t('app.backup.passkey.err.unreachable'), 'app.backup.passkey.err.unreachable'],
  [enT.t('app.backup.passkey.err.damaged'), 'app.backup.passkey.err.damaged'],
  [enT.t('app.backup.passkey.err.older'), 'app.backup.passkey.err.older'],
];

const MISSING = /^That backup is missing the latest for (\d+) of your records\. Save a new one and check that\.$/;

export const backupMessageWords = (message: string, tr: Translator = enT): string => {
  const known = KNOWN.find(([m]) => m === message);
  if (known) return tr.t(known[1]);
  const missing = MISSING.exec(message);
  if (missing) return tr.tp('app.backup.err.missingLatest', Number(missing[1]));
  return message;
};
