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
  // components/chain/FamilyOnChain.tsx: a record's parents and offspring on Midnight.
  'app.family.title': 'Midnight上の家系',
  'app.family.intro':
    '両方の保有者が同意した親子関係を、チェーン上に記録します。これにより誰でも植物の系統を確認でき、親の子孫ロイヤリティがその子孫に引き継がれます。確認済みのつながりは公開かつ永久で、取り消せません。親の保有者が後から引き受けるロイヤリティも、この記録の系統に表示されます。',
  'app.family.reading': 'チェーンを読み込んでいます…',
  'app.family.parents': '親：',
  'app.family.noneConfirmed': '確認済みの親はありません',
  'app.family.offspring': '子孫：',
  'app.family.waitingParent':
    '{name}が親であることを確認するのを待っています。保有者には自分の記録のページに表示されます。',
  'app.family.theRecord': '記録{key}',
  'app.family.takeBack': '取り下げる',
  'app.family.putOnChain': '「{name}」を親としてMidnightに登録',
  'app.family.pasteLabel': '他の人が持つ親：その確認リンクまたはチェーン上の鍵',
  'app.family.nameIt': '指定する',
  'app.family.namesParent':
    '{who}がこの記録を親として指定しています。本当にこの植物から来たものである場合だけ確認してください。確認は公開かつ永久で、この植物に今後も含めて課されるものはその系統に表示されます。',
  'app.family.confirm': '確認する',
  'app.family.confirmQ':
    'この植物が{who}の親であることを確認しますか？この植物から来たと分かっている記録だけを確認してください。これは公開かつ永久です。その系統と、この植物に今後も含めて課されるものが、その記録に表示されます。{fixes}',
  'app.family.confirmFixes': '確認済みの子孫がある記録は、自身の親を変更できなくなります。',
  'app.family.notConfirmed': '確認されませんでした。',
  'app.family.noParentHere': 'このブラウザにはその親の記録がありません。',
  'app.family.step1': 'Midnight上で親を指定しています（1/2）…',
  'app.family.step2': '親から確認しています（2/2）…',
  'app.family.readError': 'チェーンを読めませんでした：{error}',
  'app.family.named': '「{name}」（鍵{key}）',
  'app.family.namedKey': '鍵{key}の記録',
} satisfies Partial<AppTranslation>;
