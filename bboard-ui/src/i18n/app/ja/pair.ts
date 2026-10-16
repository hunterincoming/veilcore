// Japanese. DRAFT: machine-assisted, to be checked by a fluent speaker before publishing
// (docs/translations/README.md). Terms as in ../../ja.ts, plus the app's: see ./index.ts.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const pair = {
  'app.pair.aFile': 'あるファイル',
  'app.pair.noPlant': '保存先の植物が見つかりませんでした。',
  'app.pair.savedTitle': 'この植物に検査報告書を保存しました',
  'app.pair.fpLabel': '紐付けのフィンガープリント',
  'app.pair.openedHere': 'お使いの端末で開いて保存しました。',
  'app.pair.stayed': '報告書ファイルはお使いの端末に残っています。',
  'app.pair.openedHereSub':
    'ラボはあなただけが開けるようにロックして送りました。記録と一緒に保存したのは、そのフィンガープリントとファイル名だけです。',
  'app.pair.stayedSub':
    'このブラウザで読み込み、フィンガープリントを作りました。記録と一緒に保存したのは、そのフィンガープリントとファイル名だけです。',
  'app.pair.fileSha':
    'ファイルのSHA-256：<b>{sha}</b>。これはラボが署名するフィンガープリントです。ラボのものと照合してください。上の紐付けのフィンガープリントはこれから作られるので、紐付けにネットワーク上で日付を付けられます。',
  'app.pair.labMatch': 'このファイルは、SHA-256により、{lead}検査報告書と一致します（署名はこのブラウザで確認済み）。',
  'app.pair.noLabMatch': 'この植物のラボ署名でこのファイルと一致するものはないので、あなた自身の陳述のままです。',
  'app.pair.recordChip': '記録 · {fp}',
  'app.pair.pairingChip': '紐付け · {fp}',
  'app.pair.conflicts.other': 'ご注意：この検査報告書は、あなたが保有する他の記録{count}件にも保存されています{tail}',
  'app.pair.earliest': '。各記録を封印した端末の時計によれば、この記録が最も早く封印されました。',
  'app.pair.earlier': '。{name} のほうが先に封印されました（{date}、その端末の時計による）。',
  'app.pair.saved':
    '保存しました。検査報告書のフィンガープリントは、この報告書がこの植物のものであるというあなたの陳述として、植物の記録と一緒に保存されました。遺伝情報を確認したものではありません。{dated}',
  'app.pair.dateBelow': 'まだ日付は付いていません。紐付けをネットワークに載せたい場合は、下で日付を付けてください。',
  'app.pair.notDated': 'まだ日付は付いていません。',
  'app.pair.notDatedHere': '{thisSite}では、紐付けにはまだ日付が付きません。',
  'app.pair.seeCertificate': '次へ：証明書を見る',
  'app.pair.title': 'この植物に検査報告書を保存する',
  'app.pair.intro': '検査報告書が戻ってきましたか？この植物に保存すれば、後で新しい検査と照合できます。',
  'app.pair.savingTo': '保存先：<b>{name}</b> · 育成者 {by}',
  'app.pair.replaces':
    '<b>この植物にはすでに検査報告書が保存されています：「{name}」{saved}。</b>これを保存すると置き換わります。植物のページ、その証明書、あなたが共有するリンクには、古いものではなく新しいものが表示されます。お使いの端末からは何も削除されません。',
  'app.pair.replacesChain':
    '<b>この植物にはすでに検査報告書が保存されています：「{name}」{saved}。</b>これを保存すると置き換わります。植物のページ、その証明書、あなたが共有するリンクには、古いものではなく新しいものが表示されます。お使いの端末からは何も削除されません。以前の紐付けにネットワーク上で日付を付けていた場合、その日付は残ります。',
  'app.pair.savedOn': '（{date}に保存）',
  'app.pair.noDna':
    'VeilCoreはDNA検査を行いません。検査ラボから受け取った検査報告書を保存します。ファイルはお使いの端末で読み込んでフィンガープリントを作り、アップロードはされません。記録と一緒に保存されるのは、フィンガープリントとファイル名です。{after}',
  'app.pair.afterChain': 'その後、紐付けにネットワーク上で日付を付けることもできます。',
  'app.pair.afterDemo': '{thisSite}では紐付けにまだ日付が付きませんが、VeilCoreのコントラクトでは付きます。',
  'app.pair.tap': 'タップして検査報告書を選ぶ',
  'app.pair.drag': '検査報告書をここにドラッグするか、クリックして選ぶ',
  'app.pair.dropHint': '検査ラボから返ってきた報告書ファイルです。端末内で読み込み、アップロードはしません。',
  'app.pair.fromLab':
    'これは、ラボがVeilCoreを通じて送った検査報告書です。保存すると、このページがラボの署名と照合します。',
  'app.pair.labCanSign':
    'ラボは自分の鍵で検査報告書に署名することもでき、署名されたものは自分で保存したものより重みがあります。ここでは、お手元の検査報告書ファイルを保存してください。',
  'app.pair.fingerprinting': 'お使いの端末でフィンガープリントを作っています…',
  'app.pair.replace': '保存済みの検査報告書を置き換える',
  'app.pair.skip': 'まだ報告書がない：スキップ',
  'app.pair.chooseFirst': '先に検査報告書ファイルを選んでください。',
  'app.pair.fingerprinted': 'ブラウザでフィンガープリントを作りました。',
  'app.pair.sealedFp': '封印したフィンガープリント',
  'app.pair.chosen': '{title}。選択済み：{name}',
  'app.pair.ready': '{kb} KB · この端末でフィンガープリントを作る準備ができました · 選び直すと置き換わります',
  'app.pair.chain.noKeys':
    'このブラウザには記録の鍵がないため、紐付けに日付を付けられません。バックアップから復元してください。',
  'app.pair.chain.stampFirst':
    'この検査報告書にもネットワーク上で日付を付けたい場合は、先に（植物のページから）植物の日付スタンプを押してください。',
  'app.pair.chain.other':
    'この記録には、別の報告書との日付付きの紐付けがすでにあります。2件目に日付を付けることはまだできないため、この報告書には日付が付いていません。1件目の証拠ファイルとバックアップを保管してください。',
  'app.pair.chain.dated': 'この紐付けには、この記録に対してテストネットワーク上で日付が付いています。',
  'app.pair.chain.label': '紐付け',
  'app.pair.chain.toShow':
    '示すには、報告書とこの証拠ファイルを相手に渡してください。報告書と一緒にコピーを保管してください。ソルトがないと、紐付けを示すことはできません。',
  'app.pair.chain.backupAgain':
    '記録の鍵のバックアップをもう一度ダウンロードしてください。お手元のものにはこの紐付けが入っていません。',
  'app.pair.chain.download': '証拠ファイルをダウンロード',
  'app.pair.chain.title': 'この紐付けにもテストネットワーク上で日付を付ける（任意）',
  'app.pair.chain.intro':
    'これは、この記録のIDの隣に、コードを永久にチェーン上に置きます。コードは報告書のフィンガープリントと、このブラウザに保管された乱数から作られるので、報告書については何も示さず、誰も自分の記録にコピーできません。その後、証拠ファイルをダウンロードします。それと報告書があれば、この記録の保有者がその日付までに報告書を持っていたことを誰でも確認できます。',
  'app.pair.chain.earlier':
    '以前の試みは送信されましたが、確認されていません。届いている可能性があります。もう一度送っても同じコードを使うので、別の2件目が紐付けられることはありません。',
  'app.pair.chain.sendAgain': 'もう一度送る',
  'app.pair.chain.date': '紐付けに日付を付ける',
  'app.pair.chain.testOnly':
    'テストネットワークのみです。これは、この記録のIDを管理していた人が、届いた日付までに報告書またはそのフィンガープリントを持っていたことを示します。遺伝情報を確認したものではありません。',
} satisfies Partial<AppTranslation>;
