// 記録アプリの日本語：VeilCoreに保存した記録（../en/account.ts）。DRAFT: fluent check pending
// (docs/translations/README.md)。「保有」を使い、「所有」は使わない。
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const account = {
  'app.account.use.faceId': 'Face IDを使う',
  'app.account.use.touchId': 'Touch IDを使う',
  'app.account.use.screenLock': '画面ロックを使う',
  'app.account.use.windowsHello': 'Windows Helloを使う',
  'app.account.use.passkey': 'パスキーを使う',

  'app.account.sheet.title': '記録を安全に保管する',
  'app.account.sheet.lead': 'この端末をなくしても、記録を取り戻せるように。',
  'app.account.sheet.how':
    '記録はVeilCoreに保存され、あなただけが開けるように鍵がかかります。VeilCoreはその鍵を持っていません。同じAppleまたはGoogleアカウントのほかのスマートフォンやパソコンでも開けます。この端末だけに保管している書類は含まれません。',
  'app.account.sheet.usePhone':
    'このパソコンは、パスキーを自分では開けません。ブラウザに「スマートフォンを使う」が表示されたら、スマートフォンでコードを読み取ってください。',
  'app.account.sheet.twice':
    '端末から2回確認されます。1回目はパスキーを作るため、2回目はそれで記録が開けることを確かめるためです。',
  'app.account.sheet.otherWays': 'ほかの方法',
  'app.account.sheet.file': '自分でファイルを保管する',
  'app.account.sheet.fileHint': 'USBメモリやパスワード管理アプリに、自分で保管するファイルです。設定からもできます。',
  'app.account.sheet.notNow': 'あとで',
  'app.account.sheet.failed': 'うまくいきませんでした：{why}',
  'app.account.saved.title': '保存しました。',
  'app.account.saved.text': '記録はVeilCoreに保存されました。新しい記録も自動で保存されます。',
  'app.account.saved.bound':
    'VeilCoreに保存しましたが、このパスキーはこの端末にしかありません。端末をなくすとパスキーも失われます。念のため、自分で保管するコピーをダウンロードしてください。',
  'app.account.saved.download': 'コピーをダウンロード',
  'app.account.saved.done': '完了',

  'app.account.line.none': '<b>まだアカウントに保存されていません。</b>',
  'app.account.line.fix': '直す',
  'app.account.line.older': '<b>保存を続けるには、保存した記録を一度開いてください。</b>',
  'app.account.line.locked': '<b>この端末では保存が止まっています。</b>続けるには、記録を一度開いてください。',
  'app.account.line.continue': '続ける',
  'app.account.line.missing': '<b>VeilCoreに保存した記録がサーバーにありません。</b>もう一度保存してください。',
  'app.account.line.saveAgain': 'もう一度保存',
  'app.account.line.slotMissing':
    '<b>保存した記録を開く方法の一つが、VeilCoreのサーバーから消えています。</b>もう一度設定してください。',
  'app.account.line.serverOlder':
    '<b>VeilCoreのサーバーに問題があるようです。</b>この端末の記録は無事で、何も変更していません。念のためコピーをダウンロードしてください。',
  'app.account.line.failing': '<b>アカウントに保存できませんでした。</b>{why}自動でもう一度試します。',
  'app.account.line.tryNow': '今すぐ試す',
  'app.account.line.bound':
    '<b>VeilCoreに保存しましたが、開けるのはこの端末だけです。</b>自分で保管するコピーをダウンロードしてください。',
  'app.account.line.download': 'コピーをダウンロード',
  'app.account.line.deviceOnly.other':
    '<b>書類{count}件がこの端末にしかありません。</b>安全のためコピーをダウンロードしてください。',
  'app.account.line.stale':
    'お使いの{device}は{date}から保存していません。まだ使っている場合は、そちらでVeilCoreを開いてください。',
  'app.account.line.gone': 'この端末を外す',
  'app.account.line.unknownSlot': '<b>あなたが追加していないものが、保存した記録を開ける状態です。</b>',
  'app.account.line.seeSettings': '設定を見る',

  'app.account.device.iphone': 'iPhone端末',
  'app.account.device.ipad': 'iPad端末',
  'app.account.device.android': 'Androidスマートフォン',
  'app.account.device.mac': 'Macパソコン',
  'app.account.device.windows': 'Windowsパソコン',
  'app.account.device.linux': 'パソコン',
  'app.account.device.other': 'ほかの端末',

  'app.account.restore.lead': 'この端末で記録を開きます。',
  'app.account.restore.sameAccount':
    'もう一台のスマートフォンと同じAppleまたはGoogleアカウントなら、そのまま開けます。',
  'app.account.restore.usePhone':
    'Face IDのないパソコンでは、開いた画面で「スマートフォンを使う」を選び、スマートフォンでコードを読み取ってください。',
  'app.account.restore.oldName': '以前{host}でパスキーを作りましたか？ここで試す',
  'app.account.restore.otherWays': 'ほかの方法',
  'app.account.restore.found': '{date}にVeilCoreに保存した記録が見つかりました。この端末に移しますか？',
  'app.account.restore.bring': 'ここに移す',
  'app.account.restore.notThis': 'これではない',
  'app.account.restore.welcome.other': 'おかえりなさい。記録が{count}件あります。',
  'app.account.restore.elsewhere.other':
    '書類{count}件はお使いの{device}だけに保管されているため、ここには表示されません。そちらで開いてください。',
  'app.account.restore.savedOn': '{date}にVeilCoreに保存した記録からです。',

  'app.settings.title': '設定',
  'app.settings.link': '設定',
  'app.settings.account.title': 'VeilCoreに保存',
  'app.settings.account.on': '{date}に保存しました。新しい記録は自動で保存されます。',
  'app.settings.account.bound': '{date}に保存しましたが、開けるのはこの端末だけです。',
  'app.settings.account.off': '未設定です。新しいスマートフォンでも記録を取り戻せるよう、VeilCoreに保存してください。',
  'app.settings.account.why':
    '記録は鍵をかけたままVeilCoreのサーバーに保管され、開けるのはあなただけです。記録はそこから戻るため、これはVeilCoreが動いている間だけ使えます。ダウンロードしたコピーはVeilCoreなしでも使えます。',
  'app.settings.ways.title': '開く方法',
  'app.settings.ways.synced': '同じAppleまたはGoogleアカウントの端末にあるパスキー・{date}に追加',
  'app.settings.ways.bound': '一台の端末だけにあるパスキー・{date}に追加',
  'app.settings.ways.unknown.other':
    'あなたが追加していない方法{count}件で、保存した記録が開ける状態です。心当たりがなければ、VeilCoreへの保存をやめて、もう一度設定してください。',
  'app.settings.devices.title': 'お使いの端末',
  'app.settings.devices.line': '{device}・最後の保存：{date}',
  'app.settings.devices.here': '{device}（この端末）・最後の保存：{date}',
  'app.settings.stop': 'VeilCoreへの保存をやめる',
  'app.settings.stopConfirm':
    'VeilCoreに保存した記録を削除しますか？この端末には記録が残ります。ほかの端末は保存しなくなります。パスキーはスマートフォンの設定に残ります。',
  'app.settings.stopped': '削除しました。記録はこの端末に残っています。',
  'app.settings.file.title': 'コピーをダウンロード',
  'app.settings.file.text':
    '自分で保管するファイルです。VeilCoreなしでも使え、この端末だけに保管している書類が保存される唯一のほかの場所です。',
  'app.settings.file.button': 'コピーをダウンロード',
  'app.settings.devices.removeConfirm':
    'お使いの{device}をこの一覧から外しますか？もう一度保存すると、また表示されます。',
} satisfies Partial<AppTranslation>;
