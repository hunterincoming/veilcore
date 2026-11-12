// 記録アプリの日本語：ロイヤリティの支払いを見えるようにすること、CardanoのUSドル建てステーブルコインでの
// 支払い（../en/royalty-pay.ts）。DRAFT: machine-assisted, to be checked by a fluent speaker before
// publishing (docs/translations/README.md).
// SPDX-License-Identifier: Apache-2.0

export const royaltyPay = {
  'app.rpay.st.overdue': '期限超過',
  'app.rpay.l.soon': 'リマインダー：報告{n}の支払期限は{date}です。',
  'app.rpay.l.overdue': '報告{n}の支払いは{date}から期限を過ぎています。',
  'app.rpay.l.consequence': '支払わないと公開確認ページに表示され、ライセンスが取り消されることがあります。',
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
    'Midnight上でライセンスを終了します。元に戻すことはできません。{licensee}には先に署名付きの通知が届きます。その後、記録の公開確認ページに、この記録からのライセンスが不払いにより取り消されたことと、その日付が表示されます。',
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
    '相手は自分のウォレットから、あなたのCardanoアドレスに直接{code}で支払います。保存すると、1 {code}を1USドルとして数えることに同意したことになります。Cardanoの支払いは公開されます。金額、両方のアドレス、日付は誰でも見られますが、あなたが誰かは見えません。この契約専用の新しいアドレスを使うと、ほかの取引と切り離せます。VeilCoreがお金を預かったり動かしたりすることはありません。',
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
};
