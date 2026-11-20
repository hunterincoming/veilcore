// 記録アプリ（日本語）：復旧シート（../en/recovery.ts）。
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const recovery = {
  'app.recovery.err.length': '復旧コードは28文字です。すべて入力したか確認してください。',
  'app.recovery.err.typo': 'このコードには誤りがあります。シートと1文字ずつ見比べてください。',
  'app.recovery.err.wrong': 'このコードで開ける保存済みの記録はありません。シートと見比べてください。',
  'app.recovery.err.notThisSheet': '古いシートのコードです。今印刷したシートのコードを入力してください。',
  'app.recovery.err.needsSheet':
    'この端末ではパスキーで保存済みの記録を開けません。設定し直すには、復旧シートのコードを入力してください。',

  'app.recovery.prompt.title': 'もう一つ：復旧シート',
  'app.recovery.prompt.recommended': 'おすすめ',
  'app.recovery.prompt.text':
    'AppleまたはGoogleのアカウントを失ったとき、戻る方法はこのシートだけです。VeilCoreが代わりに復旧することはできません。',
  'app.recovery.prompt.bound':
    '保存済みの記録を開けるのはこの端末だけです。この端末を失ったとき、戻る方法はこのシートだけです。VeilCoreが代わりに復旧することはできません。',
  'app.recovery.prompt.make': '復旧シートを印刷または保存する',
  'app.recovery.prompt.later': 'あとで',

  'app.recovery.title': '復旧シート',
  'app.recovery.intro':
    '新しい端末で保存済みの記録を開くためのコードが書かれています。コードはこの端末で作られ、VeilCoreが見ることはありません。',
  'app.recovery.asking': '記録を開いてシートを作るため、端末が一度確認を求めます。',
  'app.recovery.haveOne': 'シートを持っています：確認する',
  'app.recovery.onlyNow':
    'このコードが表示されるのは今だけです。先に進む前に、シートを印刷するかPDFで保存してください。',
  'app.recovery.print': '印刷またはPDFで保存',
  'app.recovery.next': '次へ：確認する',
  'app.recovery.confirm.lead': 'シートが正しいことを確かめるため、シートのコードをすべて入力してください。',
  'app.recovery.confirm.label': '復旧コード',
  'app.recovery.confirm.check': '確認する',
  'app.recovery.confirm.skip': '今はスキップ',
  'app.recovery.confirm.back': 'コードをもう一度表示',
  'app.recovery.done.title': '復旧シートを確認できました。',
  'app.recovery.done.text': '大切な書類と一緒に保管してください。古いシートは使えなくなりました。',
  'app.recovery.done.ok': '完了',
  'app.recovery.close': '閉じる',
  'app.recovery.failed': 'うまくいきませんでした：{why}',

  'app.recovery.sheet.title': 'VeilCore 復旧シート',
  'app.recovery.sheet.keep':
    '血統書などの大切な書類と一緒に保管してください。写真に撮ったり、メールで送ったりしないでください。',
  'app.recovery.sheet.codeLabel': '復旧コード',
  'app.recovery.sheet.made': '{date}に作成。',
  'app.recovery.sheet.passkey':
    '同じ記録を開くパスキーは、パスワード一覧で「VeilCore: unlocks your records · {tag}」という名前です。',
  'app.recovery.sheet.how':
    '記録を取り戻すには：{site}を開き、「記録を取り戻す」をタップし、「復旧シートを使う」を選んで、コードを入力します。',
  'app.recovery.sheet.phishing':
    'VeilCoreがこのコードを尋ねるのは、新しい端末で{site}から復元するときだけです。ほかの場所では入力せず、VeilCoreを含めて誰にも教えないでください。',
  'app.recovery.sheet.anyone':
    'このコードを持つ人は誰でもあなたの記録を開けます。VeilCoreはコードを保管しておらず、もう一度お知らせすることもできません。',
  'app.recovery.sheet.newer': '新しいシートを作ると、このシートは使えなくなります。',

  'app.recovery.restore.use': '復旧シートを使う',
  'app.recovery.restore.lead': '復旧シートのコードを入力してください。ハイフンやスペースはあってもなくても構いません。',
  'app.recovery.restore.open': '記録を開く',
  'app.recovery.restore.addTitle': '次からはシートなしで開く',
  'app.recovery.restore.addText':
    'この端末にパスキーを設定すると、保存が続き、シートなしで記録を開けるようになります。',
  'app.recovery.restore.added': '完了しました。この端末は保存済みの記録を自動で開けるようになりました。',

  'app.settings.ways.sheet': '復旧シート・{date}に作成',
  'app.settings.ways.sheetChecked': '{date}に確認済み。',
  'app.settings.ways.sheetUnchecked': 'まだ確認していません：コードを入力して確認してください。',
  'app.settings.sheet.why':
    'AppleまたはGoogleのアカウントや、パスキーがある唯一の端末を失ったとき、復旧シートで新しい端末から保存済みの記録を開けます。',
  'app.settings.sheet.make': '復旧シートを作る',
  'app.settings.sheet.makeNew': '新しい復旧シートを作る',
  'app.settings.sheet.check': '復旧シートを確認する',
  'app.settings.faceId.here': 'この端末は復旧シートで記録を開きました。',

  'app.account.line.makeSheet': '復旧シートを作る',
  'app.account.line.later': 'あとで',
  'app.account.line.reminder':
    '<b>復旧シートを作りましょう：</b>AppleまたはGoogleのアカウントを失ったときに戻るための方法です。',
  'app.account.line.reverify': 'しばらく経ちました。パスキーで保存済みの記録をまだ開けるか確認してください。',
  'app.account.line.check': '確認する',

  'app.account.sheet.setUpAgain': '設定し直す',
} satisfies Partial<AppTranslation>;
