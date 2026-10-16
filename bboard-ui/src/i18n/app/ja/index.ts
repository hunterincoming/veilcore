// The record app in Japanese: every key of ../en, screen by screen. DRAFT: machine-assisted, to
// be checked by a fluent speaker before publishing (docs/translations/README.md).
//
// Terms are the site's (../../ja.ts: 育成者, ブラウザ, 受領書, 検査報告書, ラボコード, 日付スタンプ,
// アンカー, 保有者 and 保有 (never 所有), 記録, フィンガープリント, テストネットワーク), plus the app's:
// backup バックアップ, seal (a record) 封印, seal (on a sample bag) 封緘, batch バッチ, key 鍵,
// pairing (a report saved to a plant) 紐付け, delivery 送付, registry レジストリ, lab ラボ,
// attestation 証明, withdraw 撤回, correct 訂正, agreement 契約, evidence bundle 証拠バンドル.
// Japanese has no "one" plural, so no `.one` keys; sentences join with no space between them.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';
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
};
