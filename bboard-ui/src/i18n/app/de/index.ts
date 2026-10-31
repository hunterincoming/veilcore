// The record app in German (Sie): every key of ../en, screen by screen. DRAFT: machine-assisted,
// to be checked by a fluent speaker before publishing (docs/translations/README.md). Terms are
// the site's (../../de.ts), plus the app's: Züchter (breeder), Inhaber and halten (holder, hold;
// never Besitz or Eigentum), Datensatz (record), Register (registry), Prüfcode (proof code; DNA-Fingerabdruck only for genetic data),
// Datumsstempel, Laborcode, Empfangsbestätigung, Sicherungskopie, Laborbericht, Stapel (batch),
// verankern (anchor), Kopplung (pairing), Lieferung (delivery), Vereinbarung (agreement).
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
import { start } from './start';

export const appDe: AppTranslation = {
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
  ...start,
};
