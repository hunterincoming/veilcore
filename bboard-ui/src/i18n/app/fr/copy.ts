// French (vous). DRAFT: machine-assisted, to be checked by a fluent speaker before publishing
// (docs/translations/README.md). Terms as in ../../fr.ts.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';
import { CLAIMS_ON_MAINNET, IS_MAINNET } from '../../../config/network';
import { AGREEMENTS_LIVE, CLAIMS_ON_THIS_SITE, LICENSE_PROOF_RUN_ON_MAINNET } from '../../../config/copy';
import { claimsWhere } from '../claims-where';

export const copy = {
  'app.copy.thisSite': IS_MAINNET ? 'cette application web' : 'cette démo web',
  'app.copy.simulatedTag': IS_MAINNET ? '(simulé)' : '(démo)',
  'app.copy.agreementRecorded': IS_MAINNET ? 'Enregistré ici, simulé' : 'Enregistré dans cette démo',
  'app.copy.ourServer': IS_MAINNET ? 'le serveur de VeilCore' : 'le serveur de test de VeilCore',
  'app.copy.datedOn': IS_MAINNET ? 'le réseau principal de Midnight' : 'un réseau de test de Midnight',
  'app.copy.claimsWhere': claimsWhere('fr', { onSite: CLAIMS_ON_THIS_SITE, live: CLAIMS_ON_MAINNET || !IS_MAINNET }),
  'app.copy.licenseProofNote': `Une licence émise sur ${
    IS_MAINNET ? 'le réseau principal de Midnight' : 'Midnight'
  } peut être prouvée en vigueur sans montrer ses conditions : la personne qui veut vérifier crée un lien sur la page de vérification de l’enregistrement, et le titulaire de la licence y répond depuis l’appareil qui détient la licence.${
    LICENSE_PROOF_RUN_ON_MAINNET ? '' : ' Cela n’a pas encore été essayé sur le réseau principal de Midnight.'
  }`,
  'app.copy.agreementsSimulated': `Simulé dans ${IS_MAINNET ? 'cette application web' : 'cette démo web'} : l’autre partie ne signe rien ici, et rien n’est envoyé à Midnight.`,
  'app.copy.practiceLabel': AGREEMENTS_LIVE ? '' : 'Pour s’exercer',
} satisfies Partial<AppTranslation>;
