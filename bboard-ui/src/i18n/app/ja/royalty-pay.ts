// 記録アプリの日本語：ロイヤリティの支払いを見えるようにすること、CardanoのUSドル建てステーブルコインでの
// 支払い（../en/royalty-pay.ts）。DRAFT: machine-assisted, to be checked by a fluent speaker before
// publishing (docs/translations/README.md).
// SPDX-License-Identifier: Apache-2.0

export const royaltyPay = {
  'app.rpay.st.overdue': '期限超過',
  'app.rpay.l.soon': 'リマインダー：報告{n}の支払期限は{date}です。',
  'app.rpay.l.overdue': '報告{n}の支払いは{date}から期限を過ぎています。',
  'app.rpay.l.consequence':
    '支払われない場合、{licensor}の記録の公開確認ページに、ロイヤリティ報告の支払いが期限を過ぎていると表示されることがあります。契約違反の通知を受けてから{days}日以内に支払えば、不払いによるライセンスの取り消しはできません。',
  'app.rpay.i.soon': '{licensee}からの報告{n}の支払期限は{date}です。',
  'app.rpay.i.overdue': '{licensee}からの報告{n}の支払いは{date}から期限を過ぎています。',
  'app.rpay.i.public':
    'あなたの記録の公開確認ページには「ロイヤリティ明細書の支払いが{date}から期限を過ぎています。」と表示されます。金額、条件、名前は表示されません。支払いが届くと消えます。',
  'app.rpay.i.publicFailed':
    'いまは記録の公開確認ページに表示できませんでした。次にこのページを開いたときにもう一度試します。',
  'app.rpay.i.publicUnsupported':
    'VeilCoreのレジストリはまだ公開の通知を受け付けていないため、記録の公開確認ページには表示されません。',
  'app.rpay.revoke.open': '不払いを理由に取り消す',
  'app.rpay.revoke.what':
    'Midnight上でライセンスを終了します。元に戻すことはできません。契約違反の通知は送信済みで、支払いの猶予期間は支払い済みの記録がないまま終わっています。その後、{licensee}に不払いにより取り消したという署名付きの通知が届き、記録の公開確認ページにもその旨と日付が表示されます。',
  'app.rpay.revoke.yes': 'ライセンスを取り消す',
  'app.rpay.revoke.note': '報告{n}の不払いによりライセンスを取り消しました。',
  'app.rpay.revoke.reason': '不払い',
  'app.rpay.revoke.done': '{date}に不払いにより取り消しました。公開確認ページにもそう表示されます。',
  'app.rpay.pub.title': 'この記録からのライセンスのロイヤリティ',
  'app.rpay.pub.overdue': 'ロイヤリティ明細書の支払いが{date}から期限を過ぎています。',
  'app.rpay.pub.revoked': 'この記録からのライセンスが{date}に不払いにより取り消されました。',
  'app.rpay.pub.who':
    'この記録を保有し、ライセンスを出した人による記載です。VeilCoreは確認していません。誰の名前も、金額や条件も表示しません。',
  'app.rpay.payout.option': 'CardanoのUSドル建てステーブルコイン',
  'app.rpay.payout.info':
    '相手は自分のウォレットから、あなたのCardanoアドレスに直接{code}で支払います。保存すると、1 {code}を1USドルとして数えることに同意したことになります。Cardanoの支払いは公開されます。金額、両方のアドレス、日付は誰でも見られます。支払いにあなたの名前は含まれませんが、アドレスは取引所などを通じて個人と結び付けられることがよくあります。この契約専用の新しいアドレスを使うと、ほかの取引と切り離せます。VeilCoreがお金を預かったり動かしたりすることはありません。',
  'app.rpay.payout.token': 'ステーブルコイン',
  'app.rpay.payout.address': 'あなたのCardanoアドレス（{prefix}…）',
  'app.rpay.payout.useMine': '{name}のアドレスを使う',
  'app.rpay.payout.sanctioned': 'このアドレスは米国の制裁リストに載っているため、使えません。',
  'app.rpay.method': 'Cardano上で{code}（1 {code} = 1 USD）',
  'app.rpay.addr.not': 'Cardanoのアドレスではありません（全体がコピーされているか確認してください）。',
  'app.rpay.addr.notPayment': 'Cardanoの支払い用アドレスではありません（addrで始まるはずです）。',
  'app.rpay.addr.otherNetwork': 'このアドレスは{network}ではなく、別のCardanoネットワークのものです。',
  'app.rpay.pay.title': 'Cardanoウォレットから支払う',
  'app.rpay.pay.button': '{name}で{amount} {code}を支払う',
  'app.rpay.pay.waiting': 'ウォレットを待っています…',
  'app.rpay.pay.wallet': 'ウォレット',
  'app.rpay.pay.noWallet':
    'このブラウザにはCardanoウォレットがありません。ウォレットがある環境（Lace、Eternl、その他のCIP-30ウォレット）でこのページを開いてください。',
  'app.rpay.pay.shows':
    '署名する前にウォレットが内容を表示します：{to}への{amount} {code}、トークンと一緒にCardanoが必要とする少額のada、ネットワーク手数料、参照{ref}。',
  'app.rpay.pay.screened':
    '何かを作る前に、両方のアドレスを米国の制裁リスト（OFAC、Cardanoアドレス、{date}のリスト）と照合します。',
  'app.rpay.pay.howTitle': '仕組み',
  'app.rpay.pay.how':
    'あなたのウォレットが{licensor}に直接支払います。VeilCoreがお金を預かったり、止めたり、動かしたりすることはなく、手数料も取りません。支払いに付いた参照で、両方のページがCardano上でそれを見つけます。10ブロック以上の深さになり、{amount}以上を支払っていれば、報告はほかの手続きなしで支払い済み・決済済みになります。制裁の照合はリストとの照合だけです。お金の出どころは分からず、リストはその日付の時点のものです。',
  'app.rpay.pay.sent': 'ウォレットはトランザクション{tx}に署名しましたが、まだ{licensor}向けに記録されていません。',
  'app.rpay.pay.forget': 'ウォレットの履歴にない：もう一度支払う',
  'app.rpay.pay.off':
    '{licensor}はCardano上の{code}での支払いを希望しています。このページからのその支払い方法は、ここではまだ有効になっていません。ほかの支払い先を尋ねてください。',
  'app.rpay.pay.notUsd': 'この報告は{currency}建てです。ステーブルコインでの支払いはUSドル建ての報告だけです。',
  'app.rpay.pay.notPar':
    '{licensor}のCardanoの支払い先には1 {code}を1USドルとして数えると書かれていないため、このページでは提供できません。',
  'app.rpay.w.otherNetwork':
    'ウォレットが別のCardanoネットワークにあります。{network}に切り替えてもう一度試してください。',
  'app.rpay.w.sanctioned':
    '中止しました：この支払いのアドレスが米国の制裁リストに載っているか、読み取れませんでした。何も作成・送信していません。',
  'app.rpay.w.noCoins': 'ウォレットに支払いに使えるコインがありません。',
  'app.rpay.w.cantBuild': '支払いを作れませんでした（{why}）。何も送信していません。',
  'app.rpay.c.checking': 'Cardano上で支払いを確認しています…',
  'app.rpay.c.ok':
    '支払い済み・決済済み：{code}で{amount}、Cardano上で確認しました（トランザクション{tx}、{n}ブロックの深さ）。',
  'app.rpay.c.unconfirmed': '支払いはCardano上にありますが、まだ10ブロックの深さになっていません。もう一度確認します。',
  'app.rpay.c.failed': 'このトランザクションはCardano上で失敗しました。何も支払われていません。',
  'app.rpay.c.no-ref': 'このトランザクションにはVeilCoreの支払い参照がありません。',
  'app.rpay.c.many-refs': 'このトランザクションには支払い参照が複数あるため、どれにも数えられません。',
  'app.rpay.c.wrong-ref': 'このトランザクションの参照は別の明細書のものです。',
  'app.rpay.c.none': 'このトランザクションは支払い先アドレスに{code}を支払っていません。',
  'app.rpay.c.short': 'このトランザクションの支払いは{paid} {code}で、{amount}より少額です。残りはまだ未払いです。',
  'app.rpay.c.not-found': 'Cardanoにはまだそのトランザクションがありません（1分ほどかかることがあります）。',
  'app.rpay.c.unreachable': 'Cardanoに接続できませんでした。もう一度試します。',
  'app.rpay.c.no-relay': 'このサイトはまだCardanoを確認できないため、{licensor}が手動で支払いを確認します。',
  'app.rpay.c.not-tx': '支払い参照はCardanoのトランザクションではありません。',
  'app.rpay.l.breach':
    '{licensor}が{date}に契約違反の通知を送りました。{cureBy}までに支払ってください。その翌日以降、支払い済みの記録がなければ、不払いによりライセンスを取り消されることがあります。',
  'app.rpay.l.cureOver':
    '{licensor}が{date}に契約違反の通知を送り、支払いの猶予期間は{cureBy}に終わりました。不払いによりライセンスを取り消されることがあります。支払い済みなら「支払いました」で記録してください。',
  'app.rpay.i.breach':
    '{date}に契約違反の通知を送りました。{licensee}は{cureBy}まで支払えます。支払い済みの記録がなければ、その翌日から「不払いを理由に取り消す」が使えます。',
  'app.rpay.i.cureOver':
    '{date}に契約違反の通知を送りました。支払いの猶予期間は支払い済みの記録がないまま{cureBy}に終わったので、不払いにより取り消すことができます。',
  'app.rpay.i.noNotice':
    '不払いにより取り消すには、まず下の報告から契約違反の通知を送ってください。{licensee}にはそこから{days}日の支払い猶予があります。',
  'app.rpay.l.answered':
    '{date}に異議を伝えました：「{note}」。ライセンサーはこれを見られます。相手の記録の公開確認ページには、あなたが異議を唱えていることが表示されるか、この支払いについて何も表示されません。',
  'app.rpay.i.answered': '{licensee}が異議を唱えています（{date}）：「{note}」',
  'app.rpay.i.publicDisputed':
    '記録の公開確認ページの表示：「ロイヤリティ報告の支払いが{date}から期限を過ぎています。ライセンシーは異議を唱えています（{answered}から）。」金額、条件、名前は表示されません。',
  'app.rpay.i.publicWithheld':
    '{licensee}が異議を唱えていますが、VeilCoreのレジストリはまだその回答を並べて表示できません。そのため、記録の公開確認ページにはこの件について何も表示されません。',
  'app.rpay.l.iPaid': '支払いました',
  'app.rpay.l.dispute': '異議を伝える',
  'app.rpay.l.disputeAgain': 'もう一度回答する',
  'app.rpay.l.disputeNote': '理由（短く。相手に表示されます）',
  'app.rpay.l.disputeShows':
    '{licensor}には、あなたの署名付きでこれが表示されます。公開確認ページには異議があることだけが表示され、書いた内容は表示されません。',
  'app.rpay.l.disputeSend': '回答を送る',
  'app.rpay.breach.open': '契約違反の通知を送る',
  'app.rpay.breach.what':
    'この支払いが期限を過ぎていることを伝える、署名と日付付きの通知を{licensee}に送ります。相手にはそこから{days}日の支払い猶予があります。その後も支払い済みの記録がない場合に限り、不払いによりライセンスを取り消せます。',
  'app.rpay.breach.send': '通知を送る',
  'app.rpay.breach.extra': '補足（任意。相手に表示されます）',
  'app.rpay.breach.note':
    '{due}が期限の報告{n}の支払いがまだありません。この通知から{days}日以内に支払ってください。その後も未払いの場合、不払いによりライセンスを取り消すことがあります。',
  'app.rpay.revoke.notYet':
    'まだできません。不払いによる取り消しは、契約違反の通知後の支払い猶予期間が支払い済みの記録がないまま終わってからです。',
  'app.rpay.notice.answer': '{who}が{date}に{period}の支払いについて異議を伝えました：「{note}」',
  'app.rpay.notice.revoked': '{who}が{date}に不払いによりライセンスを取り消しました（{period}）。',
  'app.rpay.notice.cureBy': '支払い猶予：{cureBy}まで。',
  'app.rpay.pub.disputed': 'ライセンシーは異議を唱えています（{date}から）。',
  'app.rpay.pay.otherWay':
    '{licensor}はCardano上の{code}での支払いを求めていますが、このページではその方法で支払えません。相手が受け付ける別の方法で支払い、下の「支払いました」で記録してください。',
};
