// Spanish (neutral Latin American, usted). DRAFT: machine-assisted, to be checked by a fluent
// speaker before publishing (docs/translations/README.md). Terms as in ../../es.ts.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';
import { CLAIMS_ON_MAINNET, IS_MAINNET } from '../../../config/network';
import { AGREEMENTS_LIVE } from '../../../config/copy';
import { CLAIMS_READY } from '../../../veilcore/chain/config';
import { claimsWhere } from '../claims-where';

export const copy = {
  'app.copy.thisSite': IS_MAINNET ? 'esta aplicación web' : 'esta demo web',
  'app.copy.simulatedTag': IS_MAINNET ? '(simulado)' : '(demo)',
  'app.copy.agreementRecorded': IS_MAINNET ? 'Guardado aquí, simulado' : 'Registrado en esta demo',
  'app.copy.ourServer': IS_MAINNET ? 'el servidor de VeilCore' : 'el servidor de pruebas de VeilCore',
  'app.copy.datedOn': IS_MAINNET ? 'la red principal de Midnight' : 'una red de pruebas de Midnight',
  'app.copy.claimsWhere': claimsWhere('es', { onSite: CLAIMS_READY, live: CLAIMS_ON_MAINNET || !IS_MAINNET }),
  'app.copy.licenseProofNote': `Demostrar que una licencia está vigente, sin mostrar sus condiciones, lo hace el contrato de VeilCore en ${
    IS_MAINNET ? 'la red principal de Midnight' : 'Midnight'
  }. Eso requiere una billetera, que este sitio web no usa, así que no lo ofrece.`,
  'app.copy.agreementsSimulated': `Simulado en ${IS_MAINNET ? 'esta aplicación web' : 'esta demo web'}: la otra parte no firma nada aquí y no se envía nada a Midnight.`,
  'app.copy.practiceLabel': AGREEMENTS_LIVE ? '' : 'Solo práctica',
} satisfies Partial<AppTranslation>;
