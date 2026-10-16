// Japanese. DRAFT: machine-assisted, to be checked by a fluent speaker before publishing
// (docs/translations/README.md). Terms as in ../../ja.ts, plus the app's: see ./index.ts.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const backup = {
  'app.backup.title': 'バックアップを保存する',
  'app.backup.done': '完了',
  'app.backup.shareTitle': 'VeilCoreのバックアップ',
  'app.backup.onlyWay':
    '<b>このファイルは、植物を保有していることを証明する唯一の手段です</b>。新しいスマートフォンやコンピューターで植物を取り戻すのにも使います。VeilCoreはこのファイルを復元することも、作り直すこともできません。',
  'app.backup.saveIt': '保存する',
  'app.backup.saved': '保存しました',
  'app.backup.savedSub': '{file} · すべてが入った1つのファイル',
  'app.backup.saveFile': 'バックアップファイルを保存',
  'app.backup.copyTitle': 'コピーを別の場所にも置く',
  'app.backup.wayBack': 'このスマートフォンやコンピューターが壊れたとき、そのコピーが取り戻す手段になります。',
  'app.backup.actAsYou':
    'このファイルを持っている人は誰でも、あなたとして行動できます。あなただけが開ける場所に保管してください。',
  'app.backup.sentCopy': 'コピーを送りました ✓',
  'app.backup.sendCopy': 'コピーを送る（メール、ドライブ、ファイル…）',
  'app.backup.shareFailed': 'このブラウザでは共有メニューを開けませんでした。',
  'app.backup.byHand':
    '自分宛てにメールで送るか、Google ドライブ、iCloud、USBメモリに保存してください。先ほど保存したファイルで、ダウンロードフォルダにあります。',
  'app.backup.checkTitle': '開けるか確認する',
  'app.backup.itWorks': '問題ありません。',
  'app.backup.openIntro':
    '保存したコピーを開いてください。開けること、すべてが入っていることを確認します。何もアップロードされません。',
  'app.backup.openCopy': '保存したコピーを開く',
  'app.backup.saveFirst': '先にバックアップファイルを保存してください。',
  'app.backup.turnsOn': '確認が済むと押せるようになります。',
  'app.backup.restoreTitle': '植物を取り戻す',
  'app.backup.restoreIntro':
    '新しいスマートフォンやコンピューター、またはブラウザのデータを消去しましたか？保存したバックアップファイルを開いてください。',
  'app.backup.plantsBack': '植物が戻りました。',
  'app.backup.restored': '復元しました。',
  'app.backup.nothingNew': 'そのファイルに新しいものはありません。',
  'app.backup.sentence': '{s}',
  'app.backup.labSigBack': 'ラボの署名も戻りました。',
  'app.backup.workRestored': '{work}を復元しました。',
  'app.backup.worksLikeBefore': 'すべて以前と同じように使えます。',
  'app.backup.nDeliveries.other': 'ラボへの送付 {count}件',
  'app.backup.nCodes.other': 'ラボコード {count}件',
  'app.backup.and': '{a}と{b}',
  'app.backup.seeMyPlants': '植物を見る',
  'app.backup.lookIn':
    'メール、ドライブ、iCloud、USBメモリの中を探してください。ファイル名は何でもかまいません。何もアップロードされません。',
  'app.backup.openFile': 'バックアップファイルを開く',
  'app.backup.onlyKey': '保有者キー（64文字）しかありませんか？',
  'app.backup.keyLabel': '保有者キー（64文字）',
  'app.backup.useIt': '使う',
  'app.backup.olderVersion':
    '以前のバージョンのこのサイトでコピーした場合のみです。現在はどこにも表示されません。これで記録は戻りますが、植物の日付スタンプ用の鍵はバックアップファイルにしかありません。',
  'app.backup.cantFind':
    '<b>ファイルが見つかりませんか？</b>その場合、植物は誰にも取り戻せません。私たちにもできません。あなたの鍵を持ったことがないからです。だからこそ、あなたが保有していることを証明できるのです。以前の端末がまだ動くなら、そこでVeilCoreを開いて新しいバックアップを保存してください。',
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
    'このブラウザには、それらの植物のいずれかについて別の鍵がすでにあります。何も変更していません。',
  'app.backup.err.differentSet': 'このブラウザはすでに別の記録一式を使っています。何も変更していません。',
  'app.backup.err.differentLab': 'このブラウザにはすでに別のラボの署名があります。何も変更していません。',
  'app.backup.err.missingLatest.other':
    'そのバックアップには、記録{count}件の最新の状態が入っていません。新しく保存して、それを確認してください。',
} satisfies Partial<AppTranslation>;
