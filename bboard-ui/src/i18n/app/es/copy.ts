// Spanish (neutral Latin American, usted). DRAFT: machine-assisted, to be checked by a fluent
// speaker before publishing (docs/translations/README.md). Terms as in ../../es.ts.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';
import { CLAIMS_ON_MAINNET, IS_MAINNET } from '../../../config/network';
import { AGREEMENTS_LIVE, CLAIMS_ON_THIS_SITE, LICENSE_PROOF_RUN_ON_MAINNET } from '../../../config/copy';
import { claimsWhere } from '../claims-where';

export const copy = {
  'app.copy.thisSite': IS_MAINNET ? 'esta aplicación web' : 'esta demo web',
  'app.copy.simulatedTag': IS_MAINNET ? '(simulado)' : '(demo)',
  'app.copy.agreementRecorded': IS_MAINNET ? 'Guardado aquí, simulado' : 'Registrado en esta demo',
  'app.copy.ourServer': IS_MAINNET ? 'el servidor de VeilCore' : 'el servidor de pruebas de VeilCore',
  'app.copy.datedOn': IS_MAINNET ? 'la red principal de Midnight' : 'una red de pruebas de Midnight',
  'app.copy.claimsWhere': claimsWhere('es', { onSite: CLAIMS_ON_THIS_SITE, live: CLAIMS_ON_MAINNET || !IS_MAINNET }),
  'app.copy.licenseProofNote': `Una licencia emitida en ${
    IS_MAINNET ? 'la red principal de Midnight' : 'Midnight'
  } se puede demostrar vigente sin mostrar sus condiciones: quien quiera comprobarlo crea un enlace en la página de comprobación del registro, y el titular de la licencia lo responde desde el dispositivo que tiene la licencia.${
    LICENSE_PROOF_RUN_ON_MAINNET ? '' : ' Aún no se ha probado en la red principal de Midnight.'
  }`,
  'app.copy.agreementsSimulated': `Simulado en ${IS_MAINNET ? 'esta aplicación web' : 'esta demo web'}: la otra parte no firma nada aquí y no se envía nada a Midnight.`,
  'app.copy.practiceLabel': AGREEMENTS_LIVE ? '' : 'Solo práctica',
} satisfies Partial<AppTranslation>;
