// German (Sie). DRAFT: machine-assisted, to be checked by a fluent speaker before publishing
// (docs/translations/README.md). Terms as in ../../de.ts.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';
import { CLAIMS_ON_MAINNET, IS_MAINNET } from '../../../config/network';
import { AGREEMENTS_LIVE } from '../../../config/copy';

export const copy = {
  'app.copy.thisSite': IS_MAINNET ? 'dieser Web-App' : 'dieser Web-Demo',
  'app.copy.simulatedTag': IS_MAINNET ? '(simuliert)' : '(Demo)',
  'app.copy.agreementRecorded': IS_MAINNET ? 'Hier gespeichert, simuliert' : 'In dieser Demo erfasst',
  'app.copy.ourServer': IS_MAINNET ? 'dem Server von VeilCore' : 'dem Testserver von VeilCore',
  'app.copy.datedOn': IS_MAINNET ? 'dem Hauptnetz von Midnight' : 'einem Testnetz von Midnight',
  'app.copy.claimsWhere':
    CLAIMS_ON_MAINNET || !IS_MAINNET
      ? 'Er ist seit dem 8. Oktober 2026 im Hauptnetz von Midnight, kann aber von dieser Website aus noch nicht genutzt werden.'
      : 'Er ist noch nicht im Hauptnetz von Midnight und kann von dieser Website aus nicht genutzt werden.',
  'app.copy.licenseProofNote': `Den Nachweis, dass eine Lizenz gültig ist, ohne ihre Bedingungen zu zeigen, erbringt der Vertrag von VeilCore auf ${
    IS_MAINNET ? 'dem Hauptnetz von Midnight' : 'Midnight'
  }. Dafür braucht es eine Wallet, die diese Website nicht nutzt, daher bietet sie ihn nicht an.`,
  'app.copy.agreementsSimulated': `In ${IS_MAINNET ? 'dieser Web-App' : 'dieser Web-Demo'} simuliert: Die andere Partei unterschreibt hier nichts, und nichts wird an Midnight gesendet.`,
  'app.copy.practiceLabel': AGREEMENTS_LIVE ? '' : 'Nur zur Übung',
} satisfies Partial<AppTranslation>;
