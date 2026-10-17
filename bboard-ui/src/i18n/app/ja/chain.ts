// Japanese. DRAFT: machine-assisted, to be checked by a fluent speaker before publishing
// (docs/translations/README.md). Terms as in ../../ja.ts, plus the app's: see ./index.ts.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const chain = {
  'app.chain.inAboutMinutes.other': '約{count}分後に',
  'app.chain.inAFewMinutes': '数分後に',
  'app.chain.txParen': '（トランザクション {tx}）',
  'app.chain.mayHaveGoneOut':
    'すでに送信されている可能性があります{tx}。そのトランザクションをネットワーク上で確認するまで、もう一度試さないでください。',
  'app.chain.nothingSent': '何も送信されていません。',
  'app.chain.unreachable': 'ネットワークに接続できませんでした。{nothingSent}{when}もう一度お試しください。',
  'app.chain.didntGoThrough': 'うまくいきませんでした。{nothingSent}{when}もう一度お試しください。',
  'app.chain.didntGoThroughBecause': 'うまくいきませんでした：{reason}。{nothingSent}',
  'app.chain.details': '詳細',
  'app.chain.stampMayHaveGoneOut':
    '日付スタンプはすでに送信されている可能性があります{tx}。植物は保存されています。そのトランザクションをネットワーク上で確認するまで、もう一度試さないでください。',
  'app.chain.stampUnreachable':
    'ネットワークに接続できませんでした。植物は保存されています。{when}もう一度試すか、日付スタンプを後で行ってください。',
  'app.chain.stampDidntGoThrough':
    '日付スタンプがうまくいきませんでした。植物は保存されています。{when}もう一度試すか、日付スタンプを後で行ってください。',
  'app.chain.progress.reading': 'ネットワークからコントラクトを読み込んでいます…',
  'app.chain.progress.checkingFiles': 'このサイトの証明用ファイルをコントラクトと照合しています…',
  'app.chain.progress.preparing': 'お使いの端末でトランザクションを準備しています…',
  'app.chain.progress.provingPhone':
    'お使いの端末で証明を作成しています。スマートフォンでは1分ほどかかることがあります…',
  'app.chain.progress.waiting': 'ネットワークに取り込まれるのを待っています（通常1分以内）…',
  'app.chain.progress.proving': 'お使いの端末で証明を作成しています…',
  'app.chain.progress.work': 'スクリプトではなく人であることを示すため、少し計算をしています…',
  'app.chain.progress.sending': 'ネットワーク手数料を支払うVeilCoreに送信しています…',
  'app.chain.progress.keys': '証明用の鍵をダウンロードしています（初回のみ）…',
  'app.chain.progress.params': '公開パラメーターをダウンロードしています（初回のみ）…',
  'app.chain.progress.answer': '回答を送り返しています…',
  'app.chain.progress.readingAnswer': 'ネットワークから回答を読み込んでいます…',
  'app.chain.working': '処理中…',
  'app.chain.txLine': '{label}：トランザクション {tx} · ブロック {block}',
} satisfies Partial<AppTranslation>;
