// Japanese. DRAFT: machine-assisted, to be checked by a fluent speaker before publishing
// (docs/translations/README.md). Terms as in ../../ja.ts, plus the app's: see ./index.ts.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const backup = {
  'app.backup.title': 'バックアップを保存する',
  'app.backup.done': '完了',
  'app.backup.shareTitle': 'VeilCoreのバックアップ',
  'app.backup.onlyWay':
    '<b>このファイルは、記録を保有していることを証明する唯一の手段です</b>。新しいスマートフォンやコンピューターで記録を取り戻すのにも使います。VeilCoreはこのファイルを復元することも、作り直すこともできません。',
  'app.backup.saveIt': '保存する',
  'app.backup.saved': '保存しました',
  'app.backup.savedSub': '{file} · すべてが入った1つのファイル',
  'app.backup.saveFile': 'バックアップファイルを保存',
  'app.backup.copyTitle': 'コピーを別の場所にも置く（おすすめ）',
  'app.backup.wayBack': 'このスマートフォンやコンピューターが壊れたとき、そのコピーが取り戻す手段になります。',
  'app.backup.actAsYou':
    'このファイルを持っている人は誰でも、あなたの記録を開き、あなたとして行動できます。おすすめはUSBメモリかパスワードマネージャーです。メールで送る場合は、2段階認証を設定したアカウントを使ってください。',
  'app.backup.sentCopy': 'コピーを送りました ✓',
  'app.backup.sendCopy': 'コピーを送る（メール、ドライブ、ファイル…）',
  'app.backup.shareFailed': 'このブラウザでは共有メニューを開けませんでした。',
  'app.backup.byHand':
    'USBメモリかパスワードマネージャーに保存してください。先ほど保存したファイルで、ダウンロードフォルダにあります。',
  'app.backup.saveAgain': 'もう1つコピーを保存',
  'app.backup.savedAgain': 'もう1つ保存しました ✓',
  'app.backup.checkTitle': '開けるか確認する',
  'app.backup.itWorks': '問題ありません。',
  'app.backup.openIntro':
    '保存したコピーを開いてください。開けること、すべてが入っていることを確認します。何もアップロードされません。',
  'app.backup.openCopy': '保存したコピーを開く',
  'app.backup.saveFirst': '先にバックアップファイルを保存してください。',
  'app.backup.turnsOn': '確認が済むと押せるようになります。',
  'app.backup.pw.add': 'パスワードを付ける（おすすめ）',
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
  'app.backup.lookIn':
    'USBメモリ、パスワードマネージャー、またはメール、ドライブ、iCloudの中を探してください。ファイル名は何でもかまいません。何もアップロードされません。',
  'app.backup.openFile': 'バックアップファイルを開く',
  'app.backup.onlyKey': '保有者キー（64文字）しかありませんか？',
  'app.backup.keyLabel': '保有者キー（64文字）',
  'app.backup.useIt': '使う',
  'app.backup.olderVersion':
    '以前のバージョンのこのサイトでコピーした場合のみです。現在はどこにも表示されません。これで記録は見つかりますが、バックアップファイルを開くまでロックされたままです。記録の日付スタンプ用の鍵も、そのファイルにしかありません。',
  'app.backup.cantFind':
    '<b>ファイルが見つかりませんか？</b>その場合、記録は誰にも取り戻せません。私たちにもできません。あなたの鍵を持ったことがないからです。だからこそ、あなたが保有していることを証明できるのです。以前の端末がまだ動くなら、そこでVeilCoreを開いて新しいバックアップを保存してください。',
  'app.backup.holds.none': 'あなたの記録が入っています。',
  'app.backup.holds.records.other': 'あなたの記録{count}件がすべて入っています。',
  'app.backup.holds.plants.other': 'あなたの植物{count}件がすべて入っています。',
  'app.backup.restoredPlants.other': '植物{count}件の鍵を復元しました。',
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
  'app.backup.err.noDeliveries':
    'そのバックアップには最新の送付が入っていません。新しく保存して、それを確認してください。',
  'app.backup.err.differentKeys':
    'このブラウザには、それらの記録のいずれかについて別の鍵がすでにあります。何も変更していません。',
  'app.backup.err.differentSet': 'このブラウザはすでに別の記録一式を使っています。何も変更していません。',
  'app.backup.err.differentLab': 'このブラウザにはすでに別のラボの署名があります。何も変更していません。',
  'app.backup.err.missingLatest.other':
    'そのバックアップには、記録{count}件の最新の状態が入っていません。新しく保存して、それを確認してください。',
  // The passkey copy (veilcore/passkey-backup.ts, flow/PasskeyCopy.tsx).
  'app.backup.passkey.title': 'パスキーで開けるコピーも置いておく',
  'app.backup.passkey.why':
    'この電話をなくしても、パスキーですべて取り戻せます。パスキーはAppleまたはGoogleのアカウントを通じて新しい電話に同期されます。コピーは、あなたのパスキーだけが作れる鍵でロックされています。VeilCoreには開けません。',
  'app.backup.passkey.keepFile':
    'ファイルも残しておいてください。パスキーを削除すると、このコピーの唯一の鍵も消えます。',
  'app.backup.passkey.make': 'パスキーのコピーを作る',
  'app.backup.passkey.current': 'パスキーのコピーは最新です（{date}に保存）',
  'app.backup.passkey.behind': 'パスキーのコピーは{date}のもので、その後の変更が入っていません。',
  'app.backup.passkey.update': 'パスキーのコピーを更新する',
  'app.backup.passkey.remove': 'パスキーのコピーを削除する',
  'app.backup.passkey.removed':
    'パスキーのコピーを削除しました。パスキー自体は、電話のパスワード設定から削除してください。',
  'app.backup.passkey.restore': 'パスキーを使う',
  'app.backup.passkey.restoreHint': '前にパスキーのコピーを作りましたか？ファイルの代わりにパスキーを使えます。',
  'app.backup.passkey.found': '{date}に保存したパスキーのコピーが見つかりました。ここに復元しますか？',
  'app.backup.passkey.restoreIt': '復元する',
  'app.backup.passkey.notThis': 'これではない',
  'app.backup.passkey.from': '{date}に保存したパスキーのコピーからです。',
  'app.backup.passkey.err.unsupported':
    'この電話またはブラウザでは、バックアップを開けるパスキーを作れません。バックアップファイルを使うか、iPhone（iOS 18.4以降）のSafariかChromeでお試しください。',
  'app.backup.passkey.err.cancelled': 'キャンセルしました。何も変更していません。',
  'app.backup.passkey.err.noCopy':
    'そのパスキーのコピーは見つかりませんでした。代わりにバックアップファイルを開いてください。',
  'app.backup.passkey.err.unreachable':
    'VeilCoreのレジストリに接続できませんでした。接続を確認して、もう一度お試しください。',
  'app.backup.passkey.err.older':
    'レジストリが、この端末がすでに見たものより古いコピーを返しました。何も変更していません。後でもう一度お試しください。バックアップファイルは残しておいてください。',
  'app.backup.passkey.err.damaged':
    'そのコピーは開けませんでした。変更された可能性があります。代わりにバックアップファイルを開いてください。',
} satisfies Partial<AppTranslation>;
