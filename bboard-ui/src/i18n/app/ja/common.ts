// Japanese. DRAFT: machine-assisted, to be checked by a fluent speaker before publishing
// (docs/translations/README.md). Terms as in ../../ja.ts, plus the app's: see ./index.ts.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const common = {
  'app.common.next': '次へ',
  'app.common.change': '変更',
  'app.common.add': '追加',
  'app.common.tryAgain': 'もう一度試す',
  'app.common.fileInEnglish': 'このファイルは英語です。',
  'app.common.headerHome': 'VeilCore：あなたの植物',
  'app.common.network.mainnet': 'Midnightのメインネットワーク',
  'app.common.network.preprod': 'Midnight preprod（テストネットワーク）',
  'app.common.network.preview': 'Midnight Preview（テストネットワーク）',
  'app.common.network.local': 'ローカルの開発用ネットワーク',
  'app.common.cancel': 'キャンセル',
  'app.common.back': '戻る',
  'app.common.close': '閉じる',
  'app.common.sentenceSep': '',
  'app.common.period': '。',
  'app.common.pageInEnglish': 'このページは英語です。',
  'app.common.sectionInEnglish': 'この欄は、元になる契約と同じく英語です。',
  'app.common.noDoc': 'そのような文書はありません',
  'app.common.badge.webApp': 'ウェブアプリ',
  'app.common.badge.demo': 'デモ',
  'app.common.badge.main': 'メインネットワーク',
  'app.common.badge.local': 'ローカル',
  'app.common.badge.test': 'テストネットワーク',
  'app.common.doc.published': '公開文書',
  'app.common.doc.jump': 'セクションへ移動',
} satisfies Partial<AppTranslation>;
