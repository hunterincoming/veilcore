// Japanese. DRAFT: machine-assisted, to be checked by a fluent speaker before publishing
// (docs/translations/README.md). Terms as in ../../ja.ts, plus the app's: see ./index.ts.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const backup = {
  'app.backup.title': 'バックアップを保存する',
  'app.backup.done': '完了',
  'app.backup.shareTitle': 'VeilCoreのバックアップ',
  'app.backup.oneWay': '<b>あなたが保管するファイルです。</b>記録を取り戻す方法の1つで、VeilCoreがなくても使えます。',
  'app.backup.lock.text':
    '記録をVeilCoreに保存し、あなただけが開けるように鍵をかけます。VeilCoreはその鍵を持っていません。',
  'app.backup.lock.orFile': 'または、ファイルを自分で保管する',
  'app.backup.lock.savedTitle': 'VeilCoreに保存しました。',
  'app.backup.lock.savedText':
    'これらの記録は、新しい端末でもパスキーで取り戻せます。新しい記録も自動で保存されます。自分で保管するファイルも欲しい場合は、設定にあります。',
  'app.backup.lock.saving': 'VeilCoreに保存しています…',
  'app.backup.saveIt': '保存する',
  'app.backup.saved': '保存しました',
  'app.backup.savedSub': '{file} · すべてが入った1つのファイル',
  'app.backup.labKeyNotMade':
    'ラボの受け取り用の鍵を今は作れなかったため、このバックアップにはまだ入っていません。ほかのものはこのバックアップで大丈夫です。最初の記録が届いたら、新しいバックアップを保存してください。',
  'app.backup.saveFile': 'バックアップファイルを保存',
  'app.backup.copyTitle': 'コピーを別の場所にも置く（おすすめ）',
  'app.backup.wayBack': 'このスマートフォンやコンピューターが壊れたとき、そのコピーが取り戻す手段になります。',
  'app.backup.safari':
    'このブラウザは、7日間アクセスのないサイトのデータを消すことがあります。記録を取り戻すのはバックアップファイルなので、大切に保管してください。',
  'app.backup.actAsYou':
    'パスワードがなければ、このファイルを持っている人は誰でもあなたの記録を開き、あなたとして行動できます。おすすめはUSBメモリかパスワードマネージャーです。パスワードはファイルとは別に保管してください。',
  'app.backup.sentCopy': 'コピーを送りました ✓',
  'app.backup.sendCopy': '別の場所にコピーを保存（ファイル、ドライブ…）',
  'app.backup.shareFailed': 'このブラウザでは共有メニューを開けませんでした。',
  'app.backup.byHand': '先ほど保存したファイルで、ダウンロードフォルダにあります。',
  'app.backup.saveAgain': 'もう1つコピーを保存',
  'app.backup.savedAgain': 'もう1つ保存しました ✓',
  'app.backup.checkTitle': '開けるか確認する',
  'app.backup.itWorks': '問題ありません。',
  'app.backup.openIntro':
    '保存したコピーを開いてください。開けること、すべてが入っていることを確認します。何もアップロードされません。',
  'app.backup.openCopy': '保存したコピーを開く',
  'app.backup.saveFirst': '先にバックアップファイルを保存してください。',
  'app.backup.turnsOn': '確認が済むと押せるようになります。',
  'app.backup.pw.add': 'パスワードで鍵をかける（おすすめ）',
  'app.backup.pw.why':
    'そうすれば、ファイルだけでは何も開けません。ファイルを持つ人にはパスワードも必要です。パスワードを忘れると、私たちを含め誰もファイルを開けません。',
  'app.backup.pw.label': 'バックアップファイルのパスワード',
  'app.backup.pw.again': 'もう一度入力',
  'app.backup.pw.short': '{n}文字以上。',
  'app.backup.pw.mismatch': '2つが一致しません。',
  'app.backup.pw.keep': 'パスワードマネージャーに保存するか書き留めて、ファイルとは別に保管してください。',
  'app.backup.pw.locking': 'ファイルに鍵をかけています…',
  'app.backup.pw.savedSub': '{file} · すべてが入った1つのファイル。パスワードで鍵をかけました',
  'app.backup.pw.needed': 'このバックアップにはパスワードがあります。ファイルを開くには入力してください。',
  'app.backup.pw.wrong': 'そのパスワードではこのバックアップを開けません。何も変更していません。',
  'app.backup.pw.checkLabel': 'バックアップのパスワード',
  'app.backup.pw.open': '開く',
  'app.backup.restoreTitle': '記録を取り戻す',
  'app.backup.restoreIntro':
    '新しいスマートフォンやコンピューター、またはブラウザのデータを消去しましたか？保存したバックアップファイルを開いてください。',
  'app.backup.ownOnly':
    '自分で保存したファイルやコードだけを開いてください。VeilCore がそれを求めたり送ったりすることはありません。',
  'app.backup.preview.other': 'このバックアップは{date}に作られ、記録が{count}件入っています。ここに戻しますか？',
  'app.backup.previewUndated.other': 'このバックアップには記録が{count}件入っています。ここに戻しますか？',
  'app.backup.plantsBack': '記録が戻りました。',
  'app.backup.restored': '復元しました。',
  'app.backup.nothingNew': 'そのファイルに新しいものはありません。',
  'app.backup.sentence': '{s}',
  'app.backup.labSigBack': 'ラボの署名も戻りました。',
  'app.backup.workRestored': '{work}を復元しました。',
  'app.backup.worksLikeBefore': 'すべて以前と同じように使えます。',
  'app.backup.nDeliveries.other': 'ラボへの送付 {count}件',
  'app.backup.nCodes.other': 'ラボコード {count}件',
  'app.backup.and': '{a}と{b}',
  'app.backup.seeMyPlants': '記録を見る',
  'app.backup.lookIn': 'USBメモリ、パスワードマネージャー、クラウドの中を探してください。何もアップロードされません。',
  'app.backup.openFile': 'バックアップファイルを開く',
  'app.backup.onlyKey': '保有者キー（64文字）しかありませんか？',
  'app.backup.keyLabel': '保有者キー（64文字）',
  'app.backup.useIt': '使う',
  'app.backup.olderVersion':
    '以前のバージョンのこのサイトでコピーした場合のみです。現在はどこにも表示されません。これで記録は見つかりますが、バックアップファイルを開くまで鍵がかかったままです。記録の日付スタンプ用の鍵も、そのファイルにしかありません。',
  'app.backup.cantFind':
    '<b>ファイルが見つかりませんか？</b>その場合、記録は誰にも取り戻せません。私たちにもできません。あなたの鍵を持ったことがないからです。だからこそ、あなたが保有していることを証明できるのです。以前の端末がまだ動くなら、そこでVeilCoreを開いて新しいバックアップを保存してください。',
  'app.backup.holds.none': 'あなたの記録が入っています。',
  'app.backup.holds.records.other': 'あなたの記録{count}件がすべて入っています。',
  'app.backup.restoredPlants.other': '記録{count}件の鍵を復元しました。',
  'app.backup.restoredRecords.other': '記録{count}件の鍵を復元しました（{plants}、{datings}）。',
  'app.backup.nPlants.other': '植物{count}件',
  'app.backup.nDatedReports.other': '日付を付けた検査報告書{count}件',
  'app.backup.err.notBackup':
    'そのファイルはVeilCoreのバックアップではありません。VeilCoreから保存したファイルを選んでください。',
  'app.backup.err.olderFile': '古いファイルか、別のファイルです。先ほど保存したバックアップを選んでください。',
  'app.backup.err.otherSet': 'そのバックアップは別の記録一式のものです。先ほど保存したものを選んでください。',
  'app.backup.err.notNow': 'そのバックアップには現在の記録が入っていません。新しく保存して、それを確認してください。',
  'app.backup.err.noLabSignature':
    'そのバックアップにはラボの署名が入っていません。新しく保存して、それを確認してください。',
  'app.backup.err.noLicenses':
    'そのバックアップには最新のライセンスが入っていません。新しく保存して、それを確認してください。',
  'app.backup.err.noLender':
    'そのバックアップには貸し手の鍵と最新の請求が入っていません。新しく保存して、それを確認してください。',
  'app.backup.err.noDeliveries':
    'そのバックアップには最新の送付が入っていません。新しく保存して、それを確認してください。',
  'app.backup.err.differentKeys':
    'このブラウザには、それらの記録のいずれかについて別の鍵がすでにあります。何も変更していません。',
  'app.backup.err.differentSet': 'このブラウザはすでに別の記録一式を使っています。何も変更していません。',
  'app.backup.err.differentLab': 'このブラウザにはすでに別のラボの署名があります。何も変更していません。',
  'app.backup.err.missingLatest.other':
    'そのバックアップには、記録{count}件の最新の状態が入っていません。新しく保存して、それを確認してください。',
  // A passkey, and records saved with VeilCore (veilcore/passkey-backup.ts, account-copy.ts).
  'app.backup.passkey.err.unsupported':
    'このスマートフォンまたはブラウザでは、バックアップを開けるパスキーを作れません。バックアップファイルを使うか、iPhone（iOS 18.4以降）のSafariかChromeでお試しください。',
  'app.backup.passkey.err.cancelled': 'キャンセルしました。何も変更していません。',
  'app.backup.passkey.err.noCopy':
    'そのパスキーでVeilCoreに保存した記録は見つかりませんでした。代わりにバックアップファイルを開いてください。',
  'app.backup.passkey.err.unreachable':
    'VeilCoreのレジストリに接続できませんでした。接続を確認して、もう一度お試しください。',
  'app.backup.passkey.err.older':
    'レジストリが、この端末がすでに見たものより古いコピーを返しました。何も変更していません。後でもう一度お試しください。バックアップファイルは残しておいてください。',
  'app.backup.passkey.err.damaged':
    'そのコピーは開けませんでした。変更された可能性があります。代わりにバックアップファイルを開いてください。',
  // A partner's intake (flow/IntakePage.tsx, veilcore/intake.ts).
  'app.intake.stay': '今はやめてVeilCore に残る',
  'app.intake.pickAgain': '相手に送る記録を選ぶ',
  'app.intake.oddHost':
    'このアドレスをよく確認してください。{host} は数字、符号化された名前、またはポート付きなので、想定した相手ではないかもしれません。',
  'app.intake.err.notPicked': 'その記録はこの依頼のために選ばれていません。送りたい記録を選んでください。',
  'app.intake.title': '{host} のためにサンプルを記録する',
  'app.intake.intro':
    '<b>{host}</b> から、このサンプルをVeilCore で記録するよう頼まれています。記録はここVeilCoreで作り、あなたの手元に残ります。最後に、記録ID・証明コード・確認リンクを相手に送るかどうかを選べます。それ以外は送られません。',
  'app.intake.ref': '相手の参照番号（相手が書いたまま）：',
  'app.intake.new': '新しく記録する',
  'app.intake.pick': 'または、記録済みのものを送る',
  'app.intake.back': '送らずに {host} に戻る',
  'app.intake.banner': '{host} のために記録中です。最後に何を送るかを選べます。',
  'app.intake.send.title': 'この記録を {host} に送りますか？',
  'app.intake.send.what':
    '相手が受け取るのは、記録ID {id}（{name}）、その証明コードと確認リンクです。これでVeilCore 上で確認できます。',
  'app.intake.send.not': 'あなたの詳細、写真、DNA報告書、鍵、バックアップは送られません。',
  'app.intake.send.button': '{host} に送る',
  'app.intake.send.opening': '{id} を開いています…',
  'app.intake.send.kept': 'どちらを選んでも、記録はあなたのVeilCore に残ります。',
  'app.intake.err.title': 'このリンクは使えません',
  'app.intake.err.help': '送ってきた相手に新しいリンクを頼んでください。何も記録・送信していません。',
  'app.intake.err.paste': 'コードやリンクを貼り付ける',
  'app.intake.err.records': '自分の記録へ',
  'app.intake.err.lab': 'ラボの方：検査結果へ',
  'app.intake.err.gone':
    '相手のサイトからの依頼はもうありません（このタブが閉じられたか、開き直されました）。相手のリンクをもう一度開いてください。',
  'app.intake.err.noReturn': '戻り先が書かれていません。',
  'app.intake.err.tooLong': '戻り先のアドレスが長すぎます。',
  'app.intake.err.notUrl': '戻り先がウェブアドレスではありません。',
  'app.intake.err.notHttps': '戻り先が安全ではありません（https ではありません）。',
  'app.intake.err.credentials': '戻り先にユーザー名かパスワードが含まれています。',
  'app.intake.err.hasHash': '戻り先にすでに # の部分があります。',
  'app.intake.err.badState': 'セキュリティ値（state）がないか、形式が正しくありません。',
  'app.backup.fromFileAdded': 'ファイル自体から戻した記録：{n}件。',
  'app.backup.fromFileProblem': 'ファイル内の記録は戻せませんでした：{why} 鍵は復元されています。',
  'app.backup.passkey.err.busy': 'もう一台の端末が同時に保存していました。自動でもう一度試します。',
} satisfies Partial<AppTranslation>;
