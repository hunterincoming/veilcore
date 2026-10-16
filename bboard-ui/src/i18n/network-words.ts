// A network's plain name (config/network.ts networkLabel) in the visitor's language. Kept
// out of config/network.ts: the app's word files import config, not the other way round.
// SPDX-License-Identifier: Apache-2.0

import { NETWORK } from '../config/network';
import { enT, type Translator } from './translate';

export const networkWords = (n: string = NETWORK, tr: Translator = enT): string => {
  switch (n) {
    case 'mainnet':
      return tr.t('app.common.network.mainnet');
    case 'preprod':
      return tr.t('app.common.network.preprod');
    case 'preview':
      return tr.t('app.common.network.preview');
    default:
      return tr.t('app.common.network.local');
  }
};
