// The record app in Spanish (neutral Latin American, usted): every key of ../en, screen by
// screen. DRAFT: machine-assisted, to be checked by a fluent speaker before publishing
// (docs/translations/README.md). Terms are the site's (../../es.ts), plus the app's: obtentor
// (breeder), titular (holder; never dueño or propietario), registro (record), servidor de
// registros (the registry), código de prueba (proof code; huella de ADN only for genetic data), sello de fecha, código de laboratorio, acuse de
// recibo, copia de seguridad, informe de laboratorio, lote (batch), anclar, vínculo (pairing),
// envío (delivery), precinto (seal on a sample bag), acuerdo (agreement).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';
import { animal } from './animal';
import { strain } from './strain';
import { strainForm } from './strain-form';
import { backup } from './backup';
import { chain } from './chain';
import { common } from './common';
import { copy } from './copy';
import { dating } from './dating';
import { history } from './history';
import { home } from './home';
import { importing } from './import';
import { lab } from './lab';
import { log } from './log';
import { pair } from './pair';
import { partners } from './partners';
import { plant } from './plant';
import { prove } from './prove';
import { sealed } from './sealed';
import { verify } from './verify';
import { licensing } from './licensing';
import { document } from './document';

export const appEs: AppTranslation = {
  ...common,
  ...copy,
  ...chain,
  ...log,
  ...pair,
  ...backup,
  ...home,
  ...plant,
  ...lab,
  ...verify,
  ...prove,
  ...history,
  ...importing,
  ...partners,
  ...animal,
  ...strain,
  ...strainForm,
  ...sealed,
  ...dating,
  ...licensing,
  ...document,
};
