// French (vous). DRAFT: machine-assisted, to be checked by a fluent speaker before publishing
// (docs/translations/README.md). Terms as in ../../fr.ts.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';
import { CLAIMS_ON_MAINNET, IS_MAINNET } from '../../../config/network';
import { AGREEMENTS_LIVE } from '../../../config/copy';
import { CLAIMS_READY } from '../../../veilcore/chain/config';
import { claimsWhere } from '../claims-where';

export const copy = {
  'app.copy.thisSite': IS_MAINNET ? 'cette application web' : 'cette démo web',
  'app.copy.simulatedTag': IS_MAINNET ? '(simulé)' : '(démo)',
  'app.copy.agreementRecorded': IS_MAINNET ? 'Enregistré ici, simulé' : 'Enregistré dans cette démo',
  'app.copy.ourServer': IS_MAINNET ? 'le serveur de VeilCore' : 'le serveur de test de VeilCore',
  'app.copy.datedOn': IS_MAINNET ? 'le réseau principal de Midnight' : 'un réseau de test de Midnight',
  'app.copy.claimsWhere': claimsWhere('fr', { onSite: CLAIMS_READY, live: CLAIMS_ON_MAINNET || !IS_MAINNET }),
  'app.copy.licenseProofNote': `Prouver qu’une licence est en vigueur, sans montrer ses conditions, se fait avec le contrat de VeilCore sur ${
    IS_MAINNET ? 'le réseau principal de Midnight' : 'Midnight'
  }. Il faut pour cela un portefeuille, que ce site web n’utilise pas ; il ne le propose donc pas.`,
  'app.copy.agreementsSimulated': `Simulé dans ${IS_MAINNET ? 'cette application web' : 'cette démo web'} : l’autre partie ne signe rien ici, et rien n’est envoyé à Midnight.`,
  'app.copy.practiceLabel': AGREEMENTS_LIVE ? '' : 'Pour s’exercer',
} satisfies Partial<AppTranslation>;
