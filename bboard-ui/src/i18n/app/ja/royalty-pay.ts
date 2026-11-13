// 記録アプリの日本語：ロイヤリティの支払いを見えるようにすること、CardanoのUSドル建てステーブルコインでの
// 支払い（../en/royalty-pay.ts）。DRAFT: machine-assisted, to be checked by a fluent speaker before
// publishing (docs/translations/README.md).
// SPDX-License-Identifier: Apache-2.0

export const royaltyPay = {
  'app.rpay.st.overdue': '期限超過',
  'app.rpay.l.soon': 'リマインダー：報告{n}の支払期限は{date}です。',
  'app.rpay.l.overdue': '報告{n}の支払いは{date}から期限を過ぎています。',
  'app.rpay.i.soon': '{licensee}からの報告{n}の支払期限は{date}です。',
  'app.rpay.i.overdue': '{licensee}からの報告{n}の支払いは{date}から期限を過ぎています。',
  'app.rpay.i.publicFailed':
    'いまは記録の公開確認ページに表示できませんでした。次にこのページを開いたときにもう一度試します。',
  'app.rpay.i.publicUnsupported':
    'VeilCoreのレジストリはまだ公開の通知を受け付けていないため、記録の公開確認ページには表示されません。',
  'app.rpay.revoke.open': '不払いを理由に取り消す',
  'app.rpay.revoke.yes': 'ライセンスを取り消す',
  'app.rpay.revoke.note': '報告{n}の不払いによりライセンスを取り消しました。',
  'app.rpay.revoke.reason': '不払い',
  'app.rpay.pub.title': 'この記録からのライセンスのロイヤリティ',
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
  'app.rpay.i.answered': '{licensee}が異議を唱えています（{date}）：「{note}」',
  'app.rpay.l.iPaid': '支払いました',
  'app.rpay.l.dispute': '異議を伝える',
  'app.rpay.l.disputeAgain': 'もう一度回答する',
  'app.rpay.l.disputeNote': '理由（短く。相手に表示されます）',
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
  'app.rpay.l.consequence':
    '支払われない場合、{licensor}の記録の公開確認ページに、ロイヤリティ報告の支払いが期限を過ぎていると表示されることがあります。契約違反の通知を受けた後、不払いを理由にライセンスが取り消されうるまでに、{days}日間の支払い期間があります。',
  'app.rpay.i.public':
    'あなたの記録の公開確認ページには「この記録の保有者によると、ロイヤリティ明細書の支払いが{date}から期限を過ぎています。」と表示されます。金額、条件、名前は表示されません。支払いが記録された後、このページが次に確認したときに消えます。',
  'app.rpay.i.publicBreach':
    'あなたの記録の公開確認ページには、あなたの申告として、ロイヤリティ明細書の支払いが{date}から期限を過ぎていること、そしてあなたが、契約違反の通知を送ったことを{breach}にVeilCoreのレジストリに伝えたことが表示されます。支払いの猶予期間はその日から数えます。金額、条件、名前は表示されません。',
  'app.rpay.i.publicAnswers': 'その横に、ライセンシー自身の名前で：{answers}',
  'app.rpay.i.publicNoRecord':
    'この記録は、このブラウザの保有者キーではVeilCoreのレジストリに保存されていないため、ここからは公開確認ページに何も表示できません。記録を保存した端末でライセンスを開くか、ここでバックアップを復元してください。',
  'app.rpay.revoke.what':
    'Midnight上でライセンスを終了します。元に戻すことはできません。契約違反の通知は送信済みで、VeilCoreのレジストリの時計で支払いの猶予期間が支払い済みの記録がないまま終わっています。その後、{licensee}に不払いにより取り消したという署名付きの通知が届きます。レジストリが、支払いの記録がないまま猶予期間が終わったことを確認した場合に限り、記録の公開確認ページにその旨と日付が表示されます。そうでなければ、支払いについては何も表示されません。',
  'app.rpay.revoke.done': '{date}に不払いにより取り消しました。',
  'app.rpay.revoke.public': 'あなたの記録の公開確認ページにもそう表示されます。',
  'app.rpay.revoke.notPublic':
    'VeilCoreのレジストリは不払いについての公開表示を受け付けませんでした（レジストリの時計で猶予期間が終わっていないか、支払いの記録があります）。そのため、公開確認ページには支払いについて何も表示されません。',
  'app.rpay.pub.overdue': 'この記録の保有者によると、ロイヤリティ明細書の支払いが{date}から期限を過ぎています。',
  'app.rpay.pub.breach': 'この記録の保有者は、契約違反の通知を送ったことを{date}にVeilCoreのレジストリに伝えました。',
  'app.rpay.pub.revoked': 'この記録の保有者によると、この記録からのライセンスが{date}に不払いにより取り消されました。',
  'app.rpay.pub.revokedChecked':
    'この記録の保有者は、契約違反の通知を送ったことを{date}にVeilCoreのレジストリに伝え、その後{days}日間、レジストリに支払いの記録がないまま過ぎてから、この表示が受け付けられました。レジストリが確認したのはこれらの日付で、ライセンシーが誰かは確認していません。',
  'app.rpay.pub.answerPaid': 'ライセンシーは支払い済みだとしています（{date}）。',
  'app.rpay.pub.who':
    '支払いが必要だったかどうかは、この記録の保有者の申告です。VeilCoreはそれを確認していません。契約違反の通知の横の日付は、保有者がそれをVeilCoreのレジストリに伝えた日で、レジストリ自身の時計によるものです。ライセンシーの回答はライセンシーが署名したもので、記録の保有者は削除できません。誰の名前も、金額や条件も表示しません。',
  'app.rpay.l.answered':
    '{date}に異議を申し立てました：「{note}」。{licensor}にも見えます。あなたの回答は、あなた自身の鍵でVeilCoreのレジストリに登録されています（{filed}）。{licensor}の記録の公開確認ページにこの支払いについての表示があれば、どれにもあなたが異議を申し立てていることがその日付とともに表示されます。{licensor}は削除できません。',
  // Before a full read of the registry: nothing said about filing either way.
  'app.rpay.l.answerSeen': '{date}に異議を申し立てました：「{note}」。{licensor}にも見えます。',
  'app.rpay.l.answerPending':
    '{date}に異議を申し立てました：「{note}」。{licensor}にも見えます。{licensor}の記録の公開確認ページに表示されるVeilCoreのレジストリへの回答の登録は、まだできていません。このページを開くたびにもう一度試します。',
  'app.rpay.l.disputeShows':
    '{licensor}には、あなたの署名付きで見えます。VeilCoreのレジストリにもあなたの名前で登録されます。公開確認ページには異議があることと日付だけが表示され、書いた内容は表示されません。',
  'app.rpay.pay.otherWay':
    '{licensor}はCardanoでの{code}による支払いを求めていますが、このページではその方法で支払えません。{licensor}に別の支払い先を問い合わせ、その方法で支払ってから、下の「支払いました」で記録してください。',
  'app.rpay.l.revoked': '{licensor}は、報告{n}の不払いを理由に、{date}付けの署名付き通知でライセンスを取り消しました。',
  'app.rpay.l.revokedPublic':
    '{licensor}の記録の公開確認ページには、{date}に不払いにより取り消されたと表示されています。VeilCoreのレジストリは、その時計で支払いの猶予期間が支払いの記録なく終わった後にのみ、これを受け付けました。',
  'app.rpay.l.revokedNotPublic':
    '{licensor}の記録の公開確認ページには、不払いについて何も表示されていません。VeilCoreのレジストリが受け付けていないためです。',
  'app.rpay.l.revokedDisputed':
    '{date}に異議を申し立てました。あなたの回答はあなた自身の名前でVeilCoreのレジストリに登録されていて、{licensor}は削除できません。{licensor}の記録の公開確認ページにこの支払いについての表示があれば、どれにもあなたが異議を申し立てていることが表示されます。',
  'app.rpay.notice.early': 'この通知は支払いが期限を過ぎる前に送られたため、支払いの猶予期間は始まりません。',
  'app.rpay.notice.notThisOne': '支払いの猶予期間は、支払いが期限を過ぎた後の最初の契約違反の通知から数えます。',
  'app.rpay.predates':
    'このライセンスは、公開の通知に必要な鍵をVeilCoreのレジストリが保管するようになる前に作られたため、その支払いについては公開確認ページに何も表示できず、そこで回答することもできません。リマインダー、契約違反の通知、支払いの猶予期間、回答は、署名付きで当事者どうしの間では引き続き使えます。',
  'app.rpay.i.breachNotRegistered':
    '公開確認ページには、この支払いが期限を過ぎていることは表示されますが、あなたが契約違反の通知を送ったことはまだ表示されません。{licensee}のページがこの報告をまだVeilCoreのレジストリに登録していないためです。通常は、相手が次にライセンスを開いたときに自動で登録されます。それまでは、レジストリで支払いの猶予期間を始めることはできません。署名付きの通知は、いずれにしても取引に残っています。',
  'app.rpay.i.breachNotDue':
    '{licensee}はこの報告を、支払期限{due}としてVeilCoreのレジストリに登録しています。レジストリが契約違反の通知を受け付けるのはその翌日からなので、あなたの記録の公開確認ページにはまだ、あなたが通知を送ったことは表示されません。{due}より後にこのページを開くと、もう一度問い合わせます。署名付きの通知は、いずれにしても取引に残っています。',
  'app.rpay.l.answerPredates':
    '{date}に異議を申し立てました：「{note}」。{licensor}には、あなたの署名付きで見えます。このライセンスは、回答に必要な鍵をVeilCoreのレジストリが保管するようになる前に作られたため、そこには登録できません。',
  'app.rpay.l.pubOverdue':
    '{licensor}の記録の公開確認ページには、保有者の申告として、ロイヤリティ明細書の支払いが{date}から期限を過ぎていると表示されています（報告{n}）。',
  'app.rpay.l.pubOverdueOther':
    '{licensor}の記録の公開確認ページには、保有者の申告として、ロイヤリティ明細書の支払いが{date}から期限を過ぎていると表示されています。これはこの取引の、あなたの報告ではないメッセージについてのものです。',
  'app.rpay.l.pubOverdueUnreadable':
    '{licensor}の記録の公開確認ページには、保有者の申告として、ロイヤリティ明細書の支払いが{date}から期限を過ぎていると表示されています。これは、このページでは開けないこの取引のメッセージ、またはすでにあるメッセージの2つ目のコピーについてのもので、あなたの報告のどれにも当たりません。',
  'app.rpay.l.pubRevoked':
    '{licensor}の記録の公開確認ページには、保有者の申告として、その記録からのライセンスが{date}に不払いにより取り消されたと表示されています。',
  'app.rpay.l.pubBreach':
    '{licensor}は、契約違反の通知を送ったことを{date}にVeilCoreのレジストリに伝えました。支払いの猶予期間は{cureBy}までです。',
  'app.rpay.l.pubAnswers': 'その横に、あなた自身の名前で：{answers}',
  'app.rpay.l.pubDisputeFailed': 'いまは回答を登録できませんでした。少ししてからもう一度試してください。',
  'app.rpay.i.dueDiffers':
    '{licensee}のページはこの報告を、支払期限{registered}としてVeilCoreのレジストリに登録しています。これは、署名済みの条件にある{due}より後の日付です。レジストリは登録された日付に従います。契約違反の通知を受け付けるのはその翌日からで、その日付が過ぎた後は、あなたの記録の公開確認ページで支払いが期限を過ぎていると表示できるのも、その翌日からになります。取引にある署名済みの条件では、引き続き{due}です。',
  'app.rpay.l.pubLookupFailed':
    'いまはこの取引のすべてのメッセージをVeilCoreのレジストリで確認できませんでした。そのため、{licensor}の記録の公開確認ページにあるそれらについての表示が、ここに出ていない可能性があります。少ししてからもう一度確認してください。',
  'app.rpay.l.pubLookupAgain': 'もう一度確認',
};
