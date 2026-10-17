// The record app's English, every screen: the source text the translations follow key by
// key (app/<lang>/index.ts). Keys are namespaced by screen: app.log.*, app.backup.*,
// app.home.*, app.plant.*, app.lab.*, app.verify.*, app.prove.*, app.import.*,
// app.history.*, app.partners.*, app.animal.* (animal records, and the plant's sentences
// for an animal: app.animal.v.<key>), and app.common.* for words several screens share.
// Plural keys come as `.one` and `.other` (translate.ts tp).
// SPDX-License-Identifier: Apache-2.0
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

export const appEn = {
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

export type AppKey = keyof typeof appEn;
