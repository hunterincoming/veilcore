// Japanese. DRAFT: machine-assisted, to be checked by a fluent speaker before publishing
// (docs/translations/README.md). Terms as in ../../ja.ts, plus the app's: see ./index.ts.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const importing = {
  'app.import.noRows':
    'そのファイルには、列名の下に行がありません。1行で列に名前を付け、その下に植物ごとの行を置いてください。',
  'app.import.title': 'コレクション全体に日付を付ける',
  'app.import.intro':
    '植物や受け入れ品をスプレッドシートで管理していますか？すべての行を、1つずつ記録したのと同じように、それぞれ日付スタンプ付きの記録として一度に封印できます。',
  'app.import.fileKind':
    'CSVまたはExcel（.xlsx）ファイルで、最初のシートのみ、列名の行があるもの（その上にタイトルがあっても構いません）。一度に{max}行までです。',
  'app.import.notKept':
    'このブラウザは閉じると何も保持しません（プライベートウィンドウ、またはサイトデータがブロックされています）。各記録の鍵はバックアップを保存するまでこのブラウザにしかないので、通常のウィンドウでこのページを開いてください。',
  'app.import.reading': 'ファイルを読み込んでいます…',
  'app.import.choose': 'ファイルを選ぶ',
  'app.import.normalWindow': '使うには、通常のブラウザウィンドウでこのページを開いてください。',
  'app.import.readHere':
    'ファイルはこのブラウザの中で読み込まれ、アップロードされません。各行について、次の画面で選んだ項目だけが保存されます。植物を1つ記録するときと同じ項目です。{server}は植物名も含めてそれをロックした状態で保存し、私たちはその鍵を持っていません。{dated}で日付が付くのは証明コードだけです。',
  'app.import.testSite': 'これはテストサイトです。ここで作った記録はテストデータです。',
  'app.import.earlierStamps': '以前の取り込みの鍵の日付スタンプ',
  'app.import.rowLine': '{line}行目：{text}',
  'app.import.row': '{line}行目',
  'app.import.end': '。',
  'app.import.notGiven': '記載なし',
  'app.import.field.strainName': '植物名または系統名',
  'app.import.field.refId': 'あなたのID（受け入れ番号またはロット番号）',
  'app.import.field.taxon': '種',
  'app.import.field.parents': '親',
  'app.import.field.parents2': '2つ目の親',
  'app.import.field.bredBy': '育成者',
  'app.import.field.dateCreated': '日付（あなた自身のメモ）',
  'app.import.field.notes': 'メモ',
  'app.import.header.title': '列名はどの行にありますか？',
  'app.import.header.intro': '列名らしい行を選びました。その上の行（タイトルなど）は含めません。',
  'app.import.header.label': '列名がある行',
  'app.import.header.names': '列名（{line}行目）',
  'app.import.header.firstAt': '最初の植物（{line}行目）',
  'app.import.header.first': '最初の植物',
  'app.import.header.noRows': 'この下に行はありません。',
  'app.import.header.under.other': '列名の下に{count}行',
  'app.import.header.above.other': '。その上の{count}行は含めません',
  'app.import.header.next': '次へ：どの列が何か',
  'app.import.header.pickHint': '下に植物の行がある行を選んでください。',
  'app.import.header.back': '別のファイルを選ぶ',
  'app.import.cols.title': 'どの列が何ですか？',
  'app.import.cols.intro':
    '列名から推測しました。それぞれ確認してください。必要なのは植物名だけです。選ばなかった列は決して送信されません。植物名もほかと同じくロックされます。結果ファイルの確認リンクには名前が入るので、リンクを送った相手には見えます。名前を秘密にしたい場合は、コードネームの列を選んでください。',
  'app.import.cols.example': '例：{v}',
  'app.import.cols.twoParents': '「母 x 父」のように、1つのセルに2つの親を書いても構いません。',
  'app.import.cols.pick': '列を選ぶ',
  'app.import.cols.notInFile': 'ファイルにない',
  'app.import.cols.bredBy': '行に記載がない場合の育成者',
  'app.import.cols.bredByHelp': '自分で育成したなら、あなたの名前か事業者名。わからなければ空欄のままにしてください。',
  'app.import.cols.dates': '日付の書き方は？',
  'app.import.cols.datesHelp':
    '03/04/2021のように、どちらとも読める日付があります。ファイルでの書き方を選ばなければ、書かれたままにします。',
  'app.import.cols.auto': 'はっきりしない日付は書かれたままにする',
  'app.import.cols.mdy': '月が先（03/14/2021）',
  'app.import.cols.dmy': '日が先（14/03/2021）',
  'app.import.cols.next': '次へ：行を確認する',
  'app.import.cols.pickHint': '植物名または系統名の列を選んでください。',
  'app.import.cols.back': '列名の行を変える',
  'app.import.card.name': '植物または系統',
  'app.import.card.id': 'あなたのID',
  'app.import.card.date': '日付（あなたのメモ）',
  'app.import.check.title': 'これで合っていますか？',
  'app.import.check.ready.other': '封印できる行：{count}行',
  'app.import.check.already': ' · 以前に封印済み：{n}行（そのまま）',
  'app.import.check.problems': ' · 封印できない行：{n}行',
  'app.import.check.pickRow': '行を選ぶ',
  'app.import.check.headerRows.other':
    '{rows}行目は植物ではなく列名のように見えるため、含めません。列名がそこにある場合は、それを列名の行として選んでください。',
  'app.import.check.firstRows.other': '最初の{count}行（封印されるとおりに表示）',
  'app.import.check.ambiguous.other':
    '{count}件の日付は日が先とも月が先とも読めるため、書かれたままにします。変えるには、戻ってファイルでの日付の書き方を選んでください。',
  'app.import.check.cantSeal.other': '封印できない行：{count}行',
  'app.import.check.fixThem.other':
    'これらは含めません。ファイルで直して、後でもう一度取り込んでください。封印済みの行は飛ばされます。',
  'app.import.check.more': 'ほかに{n}行あります。結果ファイルにすべて記載されています。',
  'app.import.check.onceSealed':
    '<b>封印すると、変更できません。</b>報告書や訂正は後から追加できます。訂正は、元の記録を指し示す新しい記録になります。',
  'app.import.check.savedOn':
    '上の項目は、1行につき1つの記録として、植物名も含めてロックした状態で{server}に保存され、私たちはその鍵を持っていません。結果ファイルの確認リンクにはそれぞれの名前が入り、リンクを送った相手に見えます。{dated}で日付が付くのは、それぞれの証明コードだけです。日付スタンプは、その日付までに内容が存在したことを示しますが、内容が正しいことは確認しません。',
  'app.import.check.sealN.other': '{count}件の記録を封印する',
  'app.import.check.nothing': '封印するものはありません',
  'app.import.check.everyRow': 'どの行も、封印済みか封印できないかのどちらかです。',
  'app.import.check.back': '列を変える',
  'app.import.seal.sealing': '記録を封印しています…',
  'app.import.seal.paused': '封印を一時停止しました',
  'app.import.seal.pickUp': '止まったところから続ける',
  'app.import.seal.toSeal.other': '{file}：封印する行は{count}行です。',
  'app.import.seal.aria': '記録を封印しています',
  'app.import.seal.of': '{total}件中{done}件を封印',
  'app.import.seal.keepOpen': 'このページは開いたままにしてください。',
  'app.import.seal.kept':
    '閉じてしまったら、このページに戻ってください。止まったところから続け、同じ行を二度封印することはありません。',
  'app.import.seal.notKept':
    'このブラウザは進行状況を保持できませんでした。ページが閉じたら、同じファイルをもう一度選んでください。封印済みの行は飛ばされます。',
  'app.import.seal.carryOn': '封印を続ける',
  'app.import.seal.stop': 'ここでやめて、封印済みのもので終える',
  'app.import.sum.sealed.other': '{count}件の記録を封印しました',
  'app.import.sum.nothingNew': '新しく封印したものはありません',
  'app.import.sum.before.other': '{count}行は以前に封印済みのため、そのままです。',
  'app.import.sum.notSealed.other': '封印されなかった行：{count}行',
  'app.import.sum.waiting.other':
    '{count}行はまだ封印されていません。封印するには、ファイルをもう一度取り込んでください。',
  'app.import.sum.stampsHere':
    '記録はすでに封印されており、{dated}でバッチによって日付が付きます。これは鍵の日付スタンプには左右されません。各植物の鍵にも、このブラウザから1日約{perDay}件ずつ日付スタンプが押されるので、待機中の{n}件には約{days}かかります。バックアップの後に始まります。',
  'app.import.sum.byBatch':
    '公開の日付スタンプは、バッチに{dated}で日付が付いたときに押されます。あなたがすることはありません。',
  'app.import.sum.untilSaved': '保存して確認するまで、新しい記録の鍵はこのブラウザにしかありません。',
  'app.import.sum.noDna.other':
    'このうち{count}件の植物にはまだDNA報告書がないため、植物そのものに結び付いていません。追加するには、植物のページを開いて「この植物のDNAフィンガープリントを取得する」に従ってください。ラボコードを付けてサンプルをラボに送るか、お手元の報告書を保存します。',
  'app.import.days.other': '{count}日',
  'app.import.stamps.heading': '鍵の日付スタンプ',
  'app.import.stamps.of': '{heading}：{total}件中{stamped}件',
  'app.import.stamps.already':
    '記録はすでに封印されており、{dated}でバッチによって日付が付きます。これはこれらの鍵の日付スタンプには左右されません。',
  'app.import.stamps.each':
    '各植物の鍵にも、このブラウザから日付スタンプが押されるので、後で保有していることを証明できます。無料の手数料サービスは、各ブラウザから1日約{perDay}件までです{queued}。このページを開いている間に送られます。各植物のページからもスタンプを押せます。',
  'app.import.stamps.queued': '。待機中の{n}件には約{days}かかります',
  'app.import.stamps.stamping': '{name}に日付スタンプを押しています…',
  'app.import.stamps.allDone': 'すべて完了しました。',
  'app.import.stamps.goOn': '続ける',
  'app.import.stamps.saveIt': '保存する',
  'app.import.stamps.newSince.other':
    'バックアップの後に、鍵の日付スタンプが{count}件押されました。残すには、新しいバックアップを保存してください。',
  'app.import.done.title': 'コレクションを封印しました',
  'app.import.done.new.other': '新しい記録{count}件',
  'app.import.done.before': '、以前に封印済み{n}件',
  'app.import.done.notSealed': '、未封印{n}件',
  'app.import.done.download': '結果をダウンロード（CSV）',
  'app.import.done.downloadText':
    '元のままの行に、それぞれの記録ID、証明コード、誰でも開いて確認できるリンクを加えたものです。ここで作られ、何もアップロードされません。',
  'app.import.done.csvDna': '「DNA報告書」の列で、まだ報告書のない記録がわかります。',
  'app.import.done.byBatch':
    '公開の日付スタンプは、バッチに{dated}で日付が付いたときに押されます。いつ押されたかは各植物のページに表示されます。あなたがすることはありません。',
  'app.import.done.dateStamp':
    '日付スタンプは、その日付までに内容が存在したことを示します。内容が正しいことは確認しません。',
  'app.import.done.toPlants': 'あなたの植物へ',
  'app.import.done.another': '別のファイルを取り込む',
} satisfies Partial<AppTranslation>;
