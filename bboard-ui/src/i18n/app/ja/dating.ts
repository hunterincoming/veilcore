// Japanese (です・ます). DRAFT: machine-assisted, to be checked by a fluent speaker before
// publishing (docs/translations/README.md). 先に日付を付ける、日付スタンプの自動再試行、
// 「前回の続きから」と「サポート用の情報をコピー」（CONTRACT.md #38）。
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const dating = {
  'app.chain.progress.starting': 'お使いの端末で証明の準備を始めています…',

  'app.log.recordDatedNext.other': '記録の日付：次のバッチに入ります（テストネットワークでは約{count}分ごと）',
  'app.log.recordDatedNextPlain': '記録の日付：次のバッチに入ります',
  'app.log.inSeconds': '{n}秒後に',
  'app.log.retryingIn': '{when}自動でもう一度試します（{n}回目）。',
  'app.log.retriesUsed': '何度か試しました。いつでももう一度試せます。記録自体の日付はこれを待ちません。',
  'app.log.tryNow': '今すぐもう一度試す',
  'app.log.keepsTrying': 'VeilCoreを開いている間は自動で試し続け、完了するまでホームに表示します。',

  'app.plant.nextBatch': '次のバッチに入ります',
  'app.plant.nextBatchEvery.other': 'テストネットワークでは約{count}分ごと',
  'app.plant.notSentYet': 'まだVeilCoreに送られていません。自動でもう一度試します',
  'app.plant.keyStampRetrying': '鍵の日付スタンプ：まだです。うまくいかなかったため、自動でもう一度試します。',
  'app.plant.keyStampMaySent':
    '鍵の日付スタンプ：まだです。すでに送られた可能性があるため、自動では送り直しません。もう一度試す前に下で確認してください。',
  'app.plant.keyStampCannot': '鍵の日付スタンプ：まだです。このサイトでは今は行えません。理由は下にあります。',

  'app.home.restoreFirstTitle': 'ほかの端末でVeilCoreを使っていましたか？',
  'app.home.restoreFirstText':
    'まずバックアップファイルから元に戻してください。記録とその鍵、記録を開く鍵がこのブラウザに戻ります。',
  'app.home.restoreFirstButton': 'バックアップから元に戻す',

  'app.pickup.title': '前回の続きから',
  'app.pickup.open': '開く',
  'app.pickup.tryNow': '今すぐ試す',
  'app.pickup.saveBackup': 'バックアップを保存',
  'app.pickup.freshBackupButton': '新しいバックアップを保存',
  'app.pickup.openAgreements': '契約を開く',
  'app.pickup.dating.notSent': '{name}：封印済みです。VeilCoreにつながり次第、証明コードを送ります。',
  'app.pickup.dating.next': '{name}：次に日付が付くバッチに入ります。',
  'app.pickup.dating.nextEvery.other': '{name}：次に日付が付くバッチに入ります（約{count}分ごと）。',
  'app.pickup.dating.batched': '{name}：バッチに入り、日付スタンプを待っています。',
  'app.pickup.dating.progress': '日付まで{total}段階中{n}段階目',
  'app.pickup.more.other': 'ほかに{count}件が日付を待っています',
  'app.pickup.stamp.retrying':
    '{name}の鍵の日付スタンプはまだ完了していません。自動でもう一度試します。次は{when}です。',
  'app.pickup.stamp.now': '{name}の鍵の日付スタンプ：今試しています…',
  'app.pickup.stamp.paused': '{name}の鍵の日付スタンプは、何度か試しても完了しませんでした。',
  'app.pickup.stamp.sent':
    '{name}の鍵の日付スタンプはすでに送られた可能性があります。もう一度試す前に、そのページで確認してください。',
  'app.pickup.stamp.cannot': '{name}の鍵の日付スタンプは、今はこのサイトから行えません。理由はそのページにあります。',
  'app.pickup.lockedCopies.other':
    'ロックしたコピー{count}件がまだアップロードされていません。バックアップを保存して確認してください。記録の日付はこれを待ちません。',
  'app.pickup.freshBackup.other':
    '前回のバックアップには、新しい記録{count}件の鍵が入っていません。新しいバックアップを保存してください。',
  'app.pickup.deliveriesSent.other': 'ラボへの送付{count}件が、まだ受け取られていません。',
  'app.pickup.deliveriesUnsigned.other': 'ラボが受け取った送付{count}件の受領書に、まだ署名がありません。',
  'app.pickup.labUnsigned.other': '受け取ったサンプル{count}件の受領書に、まだ署名していません。',
  'app.pickup.results.other': '検査報告書{count}件が開かれるのを待っています。',
  'app.pickup.agreements.other': '契約{count}件が相手の副署を待っています。',

  'app.support.copy': 'サポート用の情報をコピー',
  'app.support.copied': 'コピーしました。VeilCore宛てのメールに貼り付けてください。',
  'app.support.email': '{email}にメールで送る',
  'app.support.selectIt': 'このブラウザではコピーできませんでした。下の文字を選んでコピーしてください：',
} satisfies Partial<AppTranslation>;
