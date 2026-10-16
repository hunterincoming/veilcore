// Japanese. DRAFT: machine-assisted, to be checked by a fluent speaker before publishing
// (docs/translations/README.md). Terms as in ../../ja.ts, plus the app's: see ./index.ts.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const prove = {
  'app.prove.share.checkingNow': '今共有している内容を確認しています…',
  'app.prove.share.saveNote':
    '「リンクを取得」を押すと上のスイッチが保存され、確認ページにはそのとおりに表示されます。',
  'app.prove.share.couldntRead': '今共有している内容をレジストリから読み取れませんでした。{save}',
  'app.prove.share.onlyBasicsUnsaved':
    '今共有しているのは基本情報だけです。上のスイッチは提案で、まだ保存されていません。{save}',
  'app.prove.share.semicolon': '、',
  'app.prove.share.onlyBasics': '基本情報のみ',
  'app.prove.share.sharedNow': '今共有している内容：{now}。{differs}',
  'app.prove.share.differs': '上のスイッチはこれと違います。{save}',
  'app.prove.yourRequest': 'あなたのリクエスト',
  'app.prove.youAskedNamed':
    '<b>{name}</b>の保有者に、保有していることの証明を求めました。まだなら、このリンクを送ってください。',
  'app.prove.youAsked':
    'この植物の保有者に、保有していることの証明を求めました。まだなら、このリンクを送ってください。',
  'app.prove.openCheckPage': '植物の確認ページを開く',
  'app.prove.opening': 'リクエストを開いています…',
  'app.prove.ended': 'このリクエストは終了しました',
  'app.prove.cantOpen': '今は開けません',
  'app.prove.expired':
    '期限切れ（リクエストの有効期間は1週間）か、リンクが欠けています。新しいものを送るよう依頼してください。',
  'app.prove.missingPart': 'このリンクは最後の部分が欠けています',
  'app.prove.missingPartText':
    '答えはリンク全体がないと返せません。送られたとおりにリンクを開くか、もう一度送るよう依頼してください。',
  'app.prove.someoneWants': '植物を保有していることの証明を求められています',
  'app.prove.noPlantsHere':
    'あなたの植物はこのスマートフォンやコンピューターにありません。植物を保管している端末でこのリンクを開くか、バックアップファイルからここに取り戻してから、もう一度リンクを開いてください。',
  'app.prove.notThisPlant':
    'ここにある植物の中に、尋ねられた植物はありません。別のスマートフォンやコンピューターに保管しているなら、そこでこのリンクを開いてください。バックアップファイルにしかないなら、ここに復元してから、もう一度リンクを開いてください。',
  'app.prove.getBack': 'バックアップから植物を取り戻す',
  'app.prove.done': '完了',
  'app.prove.doneText':
    '相手のページに答えが表示されます。植物については何も送信されていません。送ったのは、あなたがその記録を保有していることの証明だけです。',
  'app.prove.thePlant': 'その植物',
  'app.prove.didntSend': '証明はできましたが、答えを送れませんでした',
  'app.prove.sendInstead': '（{why}。）代わりにこれを送ってください。相手は「手作業で行う」の下に貼り付けられます：',
  'app.prove.copy': 'コピー',
  'app.prove.title': '{name}を保有していることを証明する',
  'app.prove.thisPlant': 'この植物',
  'app.prove.askedBy': '依頼者は<b>「{asker}」</b>と名乗っています。<muted>VeilCoreは確認していません。</muted>',
  'app.prove.askedAnon': '誰かが証明を求めています。名前は示されていません。',
  'app.prove.whatSends':
    '<b>送信される内容：</b>この植物の記録を保有していることの証明だけで、テストネットワークに載せます。名前も、遺伝情報も、ほかの植物についても送りません。',
  'app.prove.testOnly': '今のところ、証明はテスト版でのみ使えます。',
  'app.prove.answering': '答えると、このリンクを送った人に、あなたがこの植物の記録を保有していることが伝わります。',
  'app.prove.proving': '証明しています…',
  'app.prove.proveIt': '証明する',
  'app.prove.fewMinutes': '数分かかることがあります。テストネットワーク：練習用です。',
  'app.prove.ask.cantAsk': 'このリンクからは証明を求められません',
  'app.prove.ask.refused': '{reason}。これで作った証明は、この記録について何も示しません。',
  'app.prove.ask.noLink': 'リンクは作られませんでした：{error}。',
  'app.prove.ask.title': '保有していることの証明を求める',
  'app.prove.ask.intro':
    '相手にリンクを送ります。相手がそれを開いて「証明する」をタップすると、ここに答えが表示されます。このページは、Midnightのインデクサーを通じて（テストサイトではVeilCoreの中継を通じて）ネットワーク上で直接答えを確認します。重要な判断には、別のインデクサーでもトランザクションを確認してください。テストネットワークのみです。',
  'app.prove.ask.bound':
    'この記録は、封印したときに自分の鍵を指定しました。このページは、リンク内の鍵がその鍵であることを確認しました。',
  'app.prove.ask.older':
    '古い記録：鍵はこの記録に結び付いていません。証明が示すのは、リンクが示す鍵（保有者が選んだもの）を管理していることです。',
  'app.prove.ask.newRequest': '新しいリクエストを作る',
  'app.prove.ask.name': 'あなたの名前または事業者名（任意）',
  'app.prove.ask.nameHelp': '相手に表示されます。VeilCoreが確認していないことも示されます。',
  'app.prove.ask.making': 'リンクを作っています…',
  'app.prove.ask.make': '送るリンクを作る',
  'app.prove.ask.byHand': '代わりに手作業で行う',
  'app.prove.hand.intro':
    '送られたリンクは、この記録のチェーン上のID（{id}…）を示しています。チャレンジを作って相手に送り、相手から受け取ったトランザクションIDを貼り付けてください。答えはそのIDから来て、あなたのチャレンジに答えている必要があり、IDはアンカー済みで最新である必要があります。{bound}',
  'app.prove.hand.bound':
    'この記録は封印したときにこの鍵を指定しており、このページはそれをフィンガープリントと照合しました。',
  'app.prove.hand.older':
    '古い記録：鍵はこの記録に結び付いていません。このIDがこの記録のものだというのは、保有者の陳述です。',
  'app.prove.hand.make': 'チャレンジを作る',
  'app.prove.hand.yourChallenge': 'あなたのチャレンジ（保有者に送ってください。このタブで1回だけ使えます）：',
  'app.prove.hand.txId': '保有者のトランザクションID',
  'app.prove.hand.check': '答えを確認する',
  'app.prove.hand.acceptedKey':
    '受理：そのトランザクションを送った人は、この記録自身の鍵を管理しており、あなたのチャレンジに答えました。',
  'app.prove.hand.acceptedSecret':
    '受理：そのトランザクションを送った人は、このIDの秘密を持っており、あなたのチャレンジに答えました。',
  'app.prove.hand.notAccepted': '受理されませんでした：{reason}。',
  'app.prove.hand.anchorYes': '保有者が示したアンカーのトランザクションは、確かにこのIDを作成しています。',
  'app.prove.hand.anchorNo': '保有者が示したアンカーのトランザクションは確認できませんでした。',
  'app.prove.key.leavesOut':
    'この記録は自分の鍵を指定していますが、このリンクには確認に必要なものが入っていません。新しいリンクを保有者に依頼してください',
  'app.prove.key.noFp': 'このリンクのフィンガープリントが記録と一致しないため、鍵を照合できません',
  'app.prove.key.notThis': 'このリンクの鍵は、この記録が指定する鍵ではありません',
  'app.prove.watch.shareAsker':
    '{asker}が、VeilCoreでこの植物を保有していることの証明を求めています。このリンクを開いてください：{link}',
  'app.prove.watch.share': 'VeilCoreでこの植物を保有していることを証明してください。このリンクを開いてください：{link}',
  'app.prove.watch.sendIt': '送る',
  'app.prove.watch.copyLink': 'リンクをコピー',
  'app.prove.watch.key': '鍵：',
  'app.prove.watch.confirmed': '確認済み',
  'app.prove.watch.controlsOwn':
    '答えた人は、今この記録自身の鍵を管理しています。記録は封印したときにその鍵を指定したので、入れ替えることはできません。',
  'app.prove.watch.controlsLink': '答えた人は、今このリンクが示す鍵を管理しています。',
  'app.prove.watch.stampNotConfirmed': 'リンクが示す鍵の日付スタンプは確認できませんでした。',
  'app.prove.watch.notWho': '相手が誰か、誰がこの植物を育成したかは示しません。',
  'app.prove.watch.olderRecord': '古い記録：鍵はこの記録に結び付いていません。',
  'app.prove.watch.holderStatement':
    'この鍵がこの植物の記録のものだというのは、今のところ保有者の陳述です。相手が誰か、誰がこの植物を育成したかは示しません。',
  'app.prove.watch.checkedAt':
    '{when}にテストネットワークで確認しました。テストネットワークはリセットされることがあります。練習用で、証拠としての重みはありません。',
  'app.prove.watch.expired': 'このリクエストは答えがないまま期限切れになりました。新しく作ってください。',
  'app.prove.watch.checking': '答えが届きました。ネットワークで確認しています…',
  'app.prove.watch.pending': '答えが届きました。ネットワークにまだ表示されていないため、確認を続けます。',
  'app.prove.watch.unreachable': '今はVeilCoreに接続できません。試し続けています。',
  'app.prove.watch.waiting':
    '相手の証明を待っています。このページは閉じてかまいません。答えを見るには、送ったリンクをこのブラウザで開いてください。',
  'app.prove.watch.refused.other': '{count}件の答えが確認に通りませんでした：{reason}',
  'app.prove.watch.stampedYour':
    'あなたの植物の鍵には{when}に日付スタンプが押されました。日付が付くのは鍵で、記録ではありません。',
  'app.prove.watch.stampedThat':
    'その鍵には{when}に日付スタンプが押されました。日付が付くのは鍵で、記録ではありません。',
  'app.prove.watch.stampedThisEarlier':
    'この植物の鍵には、以前ネットワーク上で日付スタンプが押されました。日付が付くのは鍵で、記録ではありません。',
  'app.prove.watch.stampedThatEarlier':
    'その鍵には、以前ネットワーク上で日付スタンプが押されました。日付が付くのは鍵で、記録ではありません。',
  'app.prove.own.title': 'この植物の鍵を保有していることを証明する（テストネットワーク）',
  'app.prove.own.stampFirst':
    '先に日付スタンプを押してください。植物のページで「日付スタンプを押す」を押します。証明の対象は植物のチェーン上のIDで、それは日付スタンプによって作られます。',
  'app.prove.own.intro':
    '確認する人が記録の確認ページでチャレンジを作り、あなたに送ります。あなたはここで答えます。ブラウザは、記録の秘密を明かさずに、あなたがそれを持っていることを証明し、あなたはトランザクションIDを相手に送ります。日付スタンプと合わせて、ブロック {block} の時点で鍵が存在し、今あなたが管理していることを示します。',
  'app.prove.own.copyChecker': '確認する人用のリンクをコピー（記録のチェーン上のIDを示します）',
  'app.prove.own.tryIt': '自分で試す：確認する人として開く',
  'app.prove.own.challenge': '確認する人のチャレンジ（64文字）',
  'app.prove.own.answer': 'チャレンジに答える',
  'app.prove.own.done': '完了です。このトランザクションIDを確認する人に送ってください：',
  'app.prove.share.notFound': '記録が見つかりません。',
  'app.prove.share.notSaved': '選んだ内容は保存されなかったため、リンクは作られていません：{error}。',
  'app.prove.share.title': '知らない人に見せる内容を選ぶ',
  'app.prove.share.intro':
    'この記録のIDを持つ人は誰でも（あなたが送ったリンク、証明書のQRコード、誰かが転送したメッセージなどから）その確認ページを開けます。そのページに表示する事実を選んでください。選んだ内容は記録と一緒にVeilCoreのレジストリに保存され、IDを持つ全員に適用されます。ここでいつでも変更でき、送信済みのリンクにも新しい内容が表示されます。',
  'app.prove.share.shownOn': '確認ページに表示',
  'app.prove.share.strangerSees': 'IDを持つ知らない人に見えるもの',
  'app.prove.share.reportOn': '「DNA報告書が保存されているか」がオンなので、確認ページにはそのことが表示されます。',
  'app.prove.share.reportOff':
    '「DNA報告書が保存されているか」がオフなので、確認ページにはそれについて何も表示されません。',
  'app.prove.share.yourLink': 'あなたのリンク',
  'app.prove.share.savedOn': 'レジストリに保存しました',
  'app.prove.share.savedText':
    'このリンクを開く人や、ほかの方法でこの記録のIDを持つ人に見えるのは、プレビューの事実だけです。レジストリはそれ以外を送らず、リンクを編集しても増やせません。遺伝情報は決して開示されません。この選択で決まるのは確認ページに表示される内容です。隠れた値（マーカー、範囲、2つの品種が異なること）を1つだけ、ほかを見せずに証明するのは、VeilCoreのクレーム用コントラクトの役割です。',
  'app.prove.share.letThemAsk': '日付スタンプの確認と、保有していることの証明の依頼を許可する',
  'app.prove.share.theLink': 'リンク',
  'app.prove.share.openTheirs': '相手に見えるものを開く',
  'app.prove.share.saving': '保存しています…',
  'app.prove.share.getLink': 'リンクを取得',
} satisfies Partial<AppTranslation>;
