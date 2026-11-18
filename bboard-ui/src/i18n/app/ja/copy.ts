// Japanese. DRAFT: machine-assisted, to be checked by a fluent speaker before publishing
// (docs/translations/README.md). Terms as in ../../ja.ts, plus the app's: see ./index.ts.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';
import { CLAIMS_ON_MAINNET, IS_MAINNET } from '../../../config/network';
import { AGREEMENTS_LIVE, CLAIMS_ON_THIS_SITE } from '../../../config/copy';
import { claimsWhere } from '../claims-where';

export const copy = {
  'app.copy.thisSite': IS_MAINNET ? 'このウェブアプリ' : 'このウェブデモ',
  'app.copy.simulatedTag': IS_MAINNET ? '（シミュレーション）' : '（デモ）',
  'app.copy.agreementRecorded': IS_MAINNET ? 'ここに保存（シミュレーション）' : 'このデモで記録済み',
  'app.copy.ourServer': IS_MAINNET ? 'VeilCoreのサーバー' : 'VeilCoreのテスト用サーバー',
  'app.copy.datedOn': IS_MAINNET ? 'Midnightのメインネットワーク' : 'Midnightのテストネットワーク',
  'app.copy.claimsWhere': claimsWhere('ja', { onSite: CLAIMS_ON_THIS_SITE, live: CLAIMS_ON_MAINNET || !IS_MAINNET }),
  'app.copy.licenseProofNote': `ライセンスが有効であることを、条件を見せずに証明するのは、${
    IS_MAINNET ? 'Midnightのメインネットワーク' : 'Midnight'
  }上のVeilCoreのコントラクトです。それにはウォレットが必要ですが、このウェブサイトはウォレットを使わないため、この機能はありません。`,
  'app.copy.agreementsSimulated': `${IS_MAINNET ? 'このウェブアプリ' : 'このウェブデモ'}でのシミュレーションです。相手方はここで何にも署名せず、Midnightには何も送信されません。`,
  'app.copy.practiceLabel': AGREEMENTS_LIVE ? '' : '練習用',
} satisfies Partial<AppTranslation>;
