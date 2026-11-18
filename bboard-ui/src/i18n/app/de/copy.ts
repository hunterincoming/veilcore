// German (Sie). DRAFT: machine-assisted, to be checked by a fluent speaker before publishing
// (docs/translations/README.md). Terms as in ../../de.ts.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';
import { CLAIMS_ON_MAINNET, IS_MAINNET } from '../../../config/network';
import { AGREEMENTS_LIVE } from '../../../config/copy';
import { CLAIMS_READY } from '../../../veilcore/chain/config';
import { claimsWhere } from '../claims-where';

export const copy = {
  'app.copy.thisSite': IS_MAINNET ? 'dieser Web-App' : 'dieser Web-Demo',
  'app.copy.simulatedTag': IS_MAINNET ? '(simuliert)' : '(Demo)',
  'app.copy.agreementRecorded': IS_MAINNET ? 'Hier gespeichert, simuliert' : 'In dieser Demo erfasst',
  'app.copy.ourServer': IS_MAINNET ? 'dem Server von VeilCore' : 'dem Testserver von VeilCore',
  'app.copy.datedOn': IS_MAINNET ? 'dem Hauptnetz von Midnight' : 'einem Testnetz von Midnight',
  'app.copy.claimsWhere': claimsWhere('de', { onSite: CLAIMS_READY, live: CLAIMS_ON_MAINNET || !IS_MAINNET }),
  'app.copy.licenseProofNote': `Den Nachweis, dass eine Lizenz gültig ist, ohne ihre Bedingungen zu zeigen, erbringt der Vertrag von VeilCore auf ${
    IS_MAINNET ? 'dem Hauptnetz von Midnight' : 'Midnight'
  }. Dafür braucht es eine Wallet, die diese Website nicht nutzt, daher bietet sie ihn nicht an.`,
  'app.copy.agreementsSimulated': `In ${IS_MAINNET ? 'dieser Web-App' : 'dieser Web-Demo'} simuliert: Die andere Partei unterschreibt hier nichts, und nichts wird an Midnight gesendet.`,
  'app.copy.practiceLabel': AGREEMENTS_LIVE ? '' : 'Nur zur Übung',
} satisfies Partial<AppTranslation>;
