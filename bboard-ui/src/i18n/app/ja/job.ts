// 記録アプリ（日本語）：「VeilCoreに聞く」の「まとめて準備」（../en/job.ts）。
// 「AI」という語は使わない（人工授精と紛れるため）。子犬の数は「匹」、子の記録は「件」で数える。
// DRAFT: machine-assisted, to be checked by a fluent speaker before publishing (docs/translations/README.md).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const job = {
  'app.job.mode': 'まとめて準備',
  'app.job.modeHelp': 'この端末ですべて準備し、結果をひとつお見せします。承認するまで何も送信しません。',
  'app.job.can': 'まとめて準備：作業をまるごと準備し、あなたが一度だけ承認します。',
  'app.job.working': '準備しています。承認するまで何も送信しません。',
  'app.job.privacy': 'この作業はこの端末にだけ保存され、バックアップには入らず、終わってから7日後に削除されます。',

  'app.job.understood': '「{text}」と理解しました。',
  'app.job.use': '「{text}」を使う',
  'app.job.newRecord': '新しい記録',
  'app.job.suggest.ready': '{name}をライセンスできるように準備して',
  'app.job.no.hint': '先に例を変えるか、ご自身で入力してください。作業は入力した内容からだけ始まります。',
  'app.job.no.negation':
    '「しない」「なし」を含む依頼は読めません。することだけを書いてください。例：「Daisyが今日出産、耳標は後で」。',
  'app.job.no.leftover': 'わからない言葉がありました：「{words}」。',
  'app.job.no.tooMany': '一度にできる量を超えています。ひとつだけ依頼してください。',
  'app.job.no.oneJob': '作業はひとつずつです。最初のものを依頼してください。',
  'app.job.no.partB': 'ライセンスはまだ作れません。最初の部分はいまできます。',
  'app.job.no.money': 'お金を送ったり約束したりはしません。ロイヤリティの報告は「期限のあるもの」にあります。',
  'app.job.no.notJob': '証明、譲渡、訂正、削除は、その記録のページで行います。',
  'app.job.no.stampAll':
    '日付スタンプは、これからライセンスする記録だけに押します。名前と「ライセンスできるように準備して」と書いてください。',
  'app.job.no.received': 'その記録はほかの人から届いたものなので、ここでは使いません。',
  'app.job.no.noRecord': 'ご自身の記録の名前を書いてください。親株、または母か父です。',
  'app.job.no.notFound': '記録に「{words}」が見つかりません。先に追加してから、もう一度依頼してください。',
  'app.job.no.twoRecords':
    '「{words}」という名前の記録が2つあります。どちらかの名前を変えるか、記録のページから始めてください。',
  'app.job.no.wrongKind': '記録の種類が合いません。クローンは植物から、子は動物からです。',
  'app.job.no.count':
    '数を一度だけ書いてください。例：「クローンを12本」。番号は1頭に1つです。複数なら次の画面で番号を貼り付けてください。',
  'app.job.no.sexCount': '数が合いません。全部でいくつか、それぞれいくつかを書いてください。',
  'app.job.no.unknown': '「{words}」は作業の一部としてできません。近いもの：',
  'app.job.no.vault': '先に一度、接続した状態でVeilCoreを開いてください。',
  'app.job.no.paused': 'このページでは作業を準備しません。先に記録一覧へ移動してください。',
  'app.job.no.records': 'この作業に必要な記録がもうないか、封印できませんでした。',
  'app.job.no.already': 'これらはすでにある記録です。',
  'app.job.no.nothingDue': 'いま期限の来ている報告はありません。',
  'app.job.no.tooManyReports':
    '報告が{n}件あります。一度に送れる数（5件）を超えています。契約ごとに開いて報告してください。',
  'app.job.no.offline': '接続がないと、契約の最新メッセージを読めません。オンラインのときにもう一度試してください。',
  'app.job.no.noChain': 'このサイトはいま日付スタンプを押せません。',
  'app.job.no.noKey': 'この記録の鍵がこのブラウザにありません。先にバックアップから復元してください。',
  'app.job.no.readyNow': 'その記録はすでにライセンスできる状態です。',
  'app.job.no.file': 'そのファイルは使えませんでした。',
  'app.job.no.changed': 'この作業は別のタブで変更されました。もう一度確認してください。',
  'app.job.no.whichDay':
    '「{words}」はフランス語では「昨日」、ドイツ語では「ここ」という意味です。どちらの日のことですか？',
  'app.job.no.notReady': 'この作業はもう承認を待っていません。',
  'app.job.no.expired': 'この作業は72時間を過ぎています。もう一度依頼して作り直してください。',
  'app.job.no.gone': 'この作業はもうこのブラウザにありません。',
  'app.job.no.unanswered': '承認する前に、まだ答えることがあります。',
  'app.job.open': '確認する',

  'app.job.title': '確認してください：{what}',
  'app.job.what.clones.other': '{name}のクローン{count}本',
  'app.job.what.offspring.other': '{name}から生まれた{count}件の記録',
  'app.job.what.import': 'ファイルからのコレクション',
  'app.job.what.due.other': '送る報告{count}件',
  'app.job.what.ready': '{name}をライセンスできるように準備',
  'app.job.young.dog': '{name}の子犬',
  'app.job.young.cattle': '{name}の子牛',
  'app.job.young.horse': '{name}の子馬',
  'app.job.young.sheepGoat': '{name}の子羊',
  'app.job.young.pig': '{name}の子豚',

  'app.job.answer.title': 'あなたにしか答えられないこと',
  'app.job.answer.bredBy': '繁殖者は誰ですか？',
  'app.job.answer.taxon': '動物種は何ですか？',
  'app.job.answer.scheme': 'どの番号の体系ですか？',
  'app.job.answer.idsLater': 'まだ番号がない場合は空のままで。ホームでお知らせします。',
  'app.job.answer.file': 'コレクションのファイル（CSVまたはExcel）を選んでください。',
  'app.job.answer.filePick': 'ファイルを選ぶ',
  'app.job.answer.use': 'これを使う',
  'app.job.answer.backup': 'バックアップを保存して確認してください。この作業で作るものの鍵が入ります。',

  'app.job.made.title': '準備したもの',
  'app.job.made.records.other': '記録{count}件（この端末で準備済み・未送信）：{first}〜{last}',
  'app.job.made.cutFrom': '親株：{name}、日付：{date}',
  'app.job.made.born': '生まれた日：{date}',
  'app.job.made.dam': '母：{name}',
  'app.job.made.sire': '父：{name}',
  'app.job.made.sireTyped': 'VeilCoreにない父：{code}',
  'app.job.made.noSire': '父：未記入（あとで追加）',
  'app.job.made.semen': '精液コード：{code}',
  'app.job.made.sexes': 'オス{m}・メス{f}',
  'app.job.made.unstated': '性別未記入{u}',
  'app.job.made.each': '1件ずつ',
  'app.job.made.noId': '番号なし',
  'app.job.made.tags': '植物タグ{first}〜{last}',
  'app.job.made.lot': 'ロット：{lot}',
  'app.job.made.noIds.other': '{count}件はまだ番号がありません。ホームでお知らせします。',
  'app.job.made.importReady.other': '準備できたもの{count}件',
  'app.job.made.importFix.other':
    '直しが必要なもの{count}件（{rows}行目）：ファイルで直して、もう一度取り込んでください。',
  'app.job.made.expect': '{n}件と書かれましたが、ファイルで準備できたのは{m}件です。',
  'app.job.made.file': '{file}から',
  'app.job.made.report': '{from}〜{to}の報告',
  'app.job.made.namedBy': '「{label}」（相手側の名前）',
  'app.job.made.stamp': '{name}にMidnightで日付スタンプ（ライセンスに必要）',
  'app.job.made.stamped': '{name}にはすでに日付スタンプがあります。',

  'app.job.approve.title': '承認すると',
  'app.job.approve.before': '承認するまでは「破棄」ですべて取り消せます。まだ何も送信していません。',
  'app.job.approve.permanent': '元に戻せないこと',
  'app.job.approve.records.other':
    '記録{count}件を保存し、日付を付けます。これは取り消せません。あとで誤りを訂正できますが、記録は削除できません。',
  'app.job.approve.reports':
    '送った報告は取り消せません。誤りがあれば、ライセンス元に「修正を依頼」と付けてもらい、訂正版を送ってください。',
  'app.job.approve.stampToday':
    '{name}に今日、Midnightで日付スタンプを押します。ライセンスに必要です。1日3回まで無料です。',
  'app.job.approve.stampTomorrow': '{name}のスタンプは明日押します。今日の無料分は使い切ったようです。',
  'app.job.approve.public': '公開されること',
  'app.job.approve.publicStamp':
    '公開：この記録があったことを示すコードと日付。名前、遺伝情報、ファイルは公開しません。',
  'app.job.approve.publicRecords':
    '各記録の証明コードはVeilCoreのサーバーに送られ、まとめてMidnightで日付が付きます。名前や内容はあなたの鍵で封印して送られ、サーバーには読めません。',
  'app.job.approve.publicReports':
    '公開されるものはありません。各報告は封印されて、契約専用の経路でライセンス元に届きます。',
  'app.job.approve.offline': '電波がなくても大丈夫です。オンラインに戻ってVeilCoreを開いたときに送信します。',
  'app.job.approve.offlineRecords':
    '電波がなくても大丈夫です。オンラインに戻ってVeilCoreを開いたときに送信します。{when}までに送信できなかった場合は、送信する前にあなたに確認します。',
  'app.job.approve.offlineLater':
    '電波がなくても大丈夫です。オンラインに戻ってVeilCoreを開いたときに送信します。{when}までに送信できなかった場合は何も送信しません。もう一度依頼してください。',

  'app.job.backup.records.other':
    '先にバックアップを保存してください。ないと、この電話をなくしたときにこの{count}件の記録も失われます。',
  'app.job.backup.ready':
    '先にバックアップを保存してください。確認済みのバックアップに鍵が入るまで、契約は保存できません。',
  'app.job.backup.done': 'バックアップを確認しました。',
  'app.job.backup.finish': '作業に戻る',

  'app.job.btn.records.other': '承認：記録{count}件を保存',
  'app.job.btn.reports.other': '承認：報告{count}件を送信（支払額合計{total}）',
  'app.job.btn.stamp': '承認：{name}にスタンプ',
  'app.job.btn.ready': '承認',
  'app.job.btn.backup': 'バックアップを保存',
  'app.job.btn.change': '変更する',
  'app.job.btn.discard': '破棄',
  'app.job.changeConfirm':
    'ここにある内容のまま、詳しい入力画面を開きます。この作業は破棄します。何も送信していません。',
  'app.job.left.questions.other': '承認するには質問{count}件に答えてください',
  'app.job.left.backup': '承認するにはバックアップを保存してください',
  'app.job.left.scroll': '承認するには「元に戻せないこと」を読んでください',
  'app.job.left.saving': '入力を保存しています…',
  'app.job.left.ready': '承認できます',
  'app.job.readOnly': '承認するにはホームから開いてください。',
  'app.job.discarded': '破棄しました。何も送信していません。',

  'app.job.report.sales': '{from}〜{to}の売上（{currency}）',
  'app.job.report.units': '{from}〜{to}の数量',
  'app.job.report.offspring': '子の分（同じ期間）',
  'app.job.report.nothing': '該当なし（売上ゼロ）',
  'app.job.report.owed': '支払額：{amount}',
  'app.job.report.rate': '{currency} {base}の{rate}%',
  'app.job.report.topUp': '年間最低額に届かせる{amount}を含みます',
  'app.job.report.due': '期限：{date}',
  'app.job.report.overdue': '期限：{date}・期限切れ',

  'app.job.progress.running': '実行中',
  'app.job.progress.waiting': '送信待ち',
  'app.job.progress.approved': '承認済み',
  'app.job.progress.done': '完了',
  'app.job.progress.stopped': '停止',
  'app.job.progress.expired': '期限切れ：これ以上は送信しません',
  'app.job.progress.discarded': '破棄：何も送信していません',
  'app.job.step.records.other': '記録{count}件を保存',
  'app.job.step.report': '{from}〜{to}の報告を送信',
  'app.job.step.stamp': '{name}に日付スタンプ',
  'app.job.state.todo': '待機中',
  'app.job.state.running': '送信中…',
  'app.job.state.done': '完了',
  'app.job.state.failed': '送信していません',
  'app.job.state.needsYou': '確認が必要',
  'app.job.state.waiting': '再試行：{when}',
  'app.job.when.soon': '{n}分後（{time}）',
  'app.job.when.at': '{time}',
  'app.job.when.on': '{date}',
  'app.job.wait.records.other':
    '何も失われていません。記録{count}件はここに保存されていて、オンラインに戻りしだい送信します。',
  'app.job.wait.cantCheck':
    '記録はこの端末に保存されたままです。VeilCoreのサーバーにどれが届いているか確認できなかったため、何も再送信していません。まもなくもう一度確認します。',
  'app.job.wait.notNoted':
    '記録はこの端末に保存されたままです。VeilCoreのサーバーにどれが届いているかをこのブラウザに記録できなかったため、何も再送信していません。まもなくもう一度試します。',
  'app.job.done.records.other': '記録{count}件を保存しました。',
  'app.job.done.ids.other': '番号{count}件の追加をホームでお知らせします。',
  'app.job.done.reports': '報告を送りました。ライセンス元は各契約のページで返答します。',
  'app.job.done.ready': '{name}：ライセンスできます。',
  'app.job.done.already': 'すでにありました。新しく送ったものはありません。',
  'app.job.needs.report':
    'この報告はすでに送られたかもしれません。契約を開いて確認してください。再試行しても二重には送りません。先に確認します。',
  'app.job.needs.stamp':
    'このスタンプはすでに送られたかもしれません。記録を開いてください。記録のページでMidnightを確認でき、そこから再試行できます。',
  'app.job.needs.lapsed':
    '3日以上前に承認しましたが、まだ送信されていません。いま送信するか、破棄してください。何も送信していません。',
  'app.job.needs.stuck': '承認から30日たったため停止しました。記録一覧か契約を開いて、届いたものを確認してください。',
  'app.job.needs.stuckNone': '承認から30日たったため停止しました。何も送信していません。',
  'app.job.needs.stuckRecords':
    'VeilCoreのサーバーで、これらの記録が30日間確認できていません。記録はこの端末に保存されたままです。すでに届いているものがあるかもしれません。「いま送信」はまず確認し、同じものを二度送りません。',
  'app.job.failed.amount':
    '送信していません。承認したあとに金額が変わりました（別の報告か支払いが入りました）。現在の金額は{amount}です。送るには、もう一度依頼してください。',
  'app.job.sendNow': 'いま送信',
  'app.job.why': '内容：{why}',
  'app.job.tryAgain': '再試行',
  'app.job.openRecord': '記録を開く',
  'app.job.openNew': '新しい記録を開く',
  'app.job.openAgreement': '契約を開く',
  'app.job.toRecords': '記録一覧へ',

  'app.job.home.title': 'まとめて準備',
  'app.job.home.check': '確認：{what}',
  'app.job.home.needs': '確認が必要：{what}',
  'app.job.home.running': '実行中：{what}',
  'app.job.home.ready': '{name}：ライセンスできます',
  'app.job.home.tomorrow': '{name}：明日ライセンスできます',
  'app.job.home.ids.other': '{dam}の子（{count}件）：番号を追加',
  'app.job.home.open': '開く',

  'app.job.ids.title.other': '番号を追加：{dam}の子{count}件',
  'app.job.ids.permanent':
    '番号はそれぞれ訂正として保存されます。新しい記録が古い記録に代わり、古い記録も残ります。取り消せません。',
  'app.job.ids.save.other': '番号{count}件を保存',
  'app.job.ids.reason': '番号を追加',
  'app.job.ids.already': '登録済み {id}',
  'app.job.ids.no.twice': '{id}が2つの欄にあります。',
  'app.job.ids.no.taken': '{id}はすでに{name}の番号です。',
  'app.job.ids.no.elsewhere': '{id}は、あなたの別の動物「{name}」の番号です。',
  'app.job.ids.changed':
    '表示してから別の端末か別のタブで変更があったため、これ以上は保存していません。欄を確認して、もう一度保存してください。',
  'app.job.ids.paste.spaces':
    '形の違う複数の番号がスペースで区切られているようで、どれがどれか判断できません。何も入力していません。列として貼り付けるか、それぞれの欄に入力してください。',
  'app.job.ids.paste.doubleScan':
    'すでに番号のある欄にスキャンが入ったため、使っていません。この子をもう一度スキャンするには、先に欄を空にしてください。',
  'app.job.ids.gone': '{name}の記録が見つかりません。いったん閉じて開き直してください。',
  'app.job.ids.keep': '編集を続ける',
  'app.job.ids.discard': '破棄',
  'app.job.ids.discardAsk': '入力した番号を破棄しますか？まだ保存していません。',
  'app.job.ids.use': 'この番号を使う',
  'app.job.ids.paste.over':
    'ここから下の欄は{count}件ですが、{n}行あるため合いません。何も入力していません。この子たちの番号だけをコピーするか、もっと上の欄に貼り付けてください。',
  'app.job.ids.paste.startsAt':
    '「{id}」はすでに{name}の番号です。この列はもっと上から始まっています。何も入力していません。番号のまだない子の番号だけをコピーしてください。',
  'app.job.ids.paste.comma':
    '{line}行目にカンマかセミコロンがあります。1行に1つの番号にしてください。何も入力していません。',
  'app.job.ids.no.comma': '1つの欄に1つの番号です。カンマかセミコロンが含まれています。',
  'app.job.wait.refused':
    '記録はこの端末に保存されたままです。VeilCoreのサーバーがこの保存を受け付けなかったため、まだ何も保存されていません。もう一度試します。',
  'app.job.ids.help':
    '子ごとに、それぞれの欄へ番号を入力するかスキャンしてください。スキャナーのEnterやTabで次の空欄に移ります。1列を欄に貼り付けることもできます。その欄から下の欄へ順に入ります。',
  'app.job.ids.schemeNeeded': 'これらの番号がどの番号体系のものかを入力してください。',
  'app.job.ids.preview': '保存される内容',
  'app.job.ids.previewNone': 'まだありません。欄に番号を入力、スキャン、または貼り付けてください。',
  'app.job.ids.pair': '{name}：{id}',
  'app.job.ids.fix.other': '先に赤く表示された{count}件の欄を直してください。',
  'app.job.ids.paste.columns':
    '2列以上あります。番号の列だけをコピーして、もう一度貼り付けてください。何も入力していません。',
  'app.job.ids.paste.header':
    '「{id}」は番号ではなく列の見出しのようです。見出しを除いて番号をコピーし、もう一度貼り付けてください。何も入力していません。',
  'app.job.ids.paste.invisible':
    '{line}行目に見えない文字が含まれています。番号をもう一度コピーするか、入力してください。何も入力していません。',
  'app.job.ids.paste.stopped.other': '{name}で止めました。すでに番号があるため、{count}行は使っていません。',
  'app.job.ids.no.invisible':
    '見えない文字が含まれています。欄を空にして、番号をもう一度入力するかスキャンしてください。',
  'app.job.wait.noKey':
    '記録はこの端末に保存されたままですが、このブラウザには、VeilCoreのサーバーがこれらの記録を識別するための鍵がないため、何も再送信していません。続けるにはバックアップを復元してください。',
  'app.job.wait.full':
    '記録はこの端末に保存されたままです。この端末の保存領域がいっぱいのため、何も送信していません。空き容量を増やしてください。もう一度試します。',
  'app.job.wait.local':
    '記録はこの端末に保存されたままです。いまはこのページから保存できなかったため、何も送信していません。まもなくもう一度試します。',
} satisfies Partial<AppTranslation>;
