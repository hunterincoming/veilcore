// The record app in French (vous): every key of ../en, screen by screen. DRAFT: machine-assisted,
// to be checked by a fluent speaker before publishing (docs/translations/README.md). Terms are
// the site's (../../fr.ts), plus the app's: obtenteur (breeder), détenteur and détenir (holder,
// hold; never propriétaire or posséder), enregistrement (record), registre (registry),
// code de preuve (proof code; empreinte ADN only for genetic data), horodatage (date stamp), code laboratoire, accusé de réception, copie de secours,
// rapport de laboratoire, lot (batch), ancrer, association (pairing), livraison (delivery),
// scellé (seal on a sample bag), contrat (agreement).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';
import { animal } from './animal';
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

export const appFr: AppTranslation = {
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
  ...sealed,
  ...dating,
};
