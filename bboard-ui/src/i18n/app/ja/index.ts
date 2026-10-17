// The record app in Japanese: every key of ../en, screen by screen. DRAFT: machine-assisted, to
// be checked by a fluent speaker before publishing (docs/translations/README.md).
//
// Terms are the site's (../../ja.ts: 育成者, ブラウザ, 受領書, 検査報告書, ラボコード, 日付スタンプ,
// アンカー, 保有者 and 保有 (never 所有), 記録, 証明コード, テストネットワーク), plus the app's:
// backup バックアップ, seal (a record) 封印, seal (on a sample bag) 封緘, batch バッチ, key 鍵,
// pairing (a report saved to a plant) 紐付け, delivery 送付, registry レジストリ, lab ラボ,
// attestation 証明, withdraw 撤回, correct 訂正, agreement 契約, evidence bundle 証拠バンドル.
// Animal records (./animal.ts): animal 動物, individual ID 個体識別番号 (the term on Japan's cattle
// traceability system and its ear tags), ID scheme 番号の体系, sire 父 and dam 母 (the pedigree terms
// on a 登録証; 種雄牛 and 繁殖雌牛 name an animal's role in a herd, not its parents, so they are not
// used for sire and dam), species 動物種, breed 品種, sex 性別 (雌, 雄, 未記入), date of birth 生年月日,
// breeder or holder 生産者または保有者 (育成者 stays the plant breeder), herd 牧場・農場, ear tag 耳標.
// Japanese has no "one" plural, so no `.one` keys; sentences join with no space between them.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';
import { animal } from './animal';
import { backup } from './backup';
import { chain } from './chain';
import { common } from './common';
import { copy } from './copy';
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

export const appJa: AppTranslation = {
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
};
