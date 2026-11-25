// Japanese. DRAFT: machine-assisted, to be checked by a fluent speaker before publishing
// (docs/translations/README.md). Terms as in ../../ja.ts, plus the app's: see ./index.ts.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const home = {
  'app.home.firstRecord': '最初の記録を作りましょう',
  'app.home.oldLinks':
    '2026年10月17日より前に作った確認リンクとQRコードには、記録の名前が表示されなくなりました。VeilCoreは名前に鍵をかけて保存するようになったため、レジストリには表示する名前がありません。名前を共有するには、記録を開いて「誰かに見せる」を選び、名前をオンにして、新しいリンクを送ってください。新しい証明書には新しいQRコードが付きます。',
  'app.home.continueDraftNamed': '下書きの続き：{name}',
  'app.home.continueDraft': '下書きの続き',
  'app.home.draftKept': '入力した内容はこのブラウザに保存されています。続きから始められます。',
  'app.home.aboutThreeMinutes': '約3分です。終わると公開の日付スタンプが付き、鍵を持つのはあなただけです。',
  'app.home.aboutThreeMinutesByHand':
    '約3分です。終わると封印されます。公開の日付は、私たちがそのバッチをアンカーしたときに付きます（当面は手作業）。鍵を持つのはあなただけです。',
  'app.home.continue': '続ける',
  'app.home.start': '記録を作る',
  'app.home.spreadsheet': 'スプレッドシートがありますか？コレクション全体に日付を付ける',
  'app.home.newPhone': '機種変更しましたか？記録を取り戻す',
  'app.home.newPhoneLab': '機種変更しましたか？ラボの鍵とサンプルを取り戻す',
  'app.home.labWhatShows': '署名で何がわかるのか',
  'app.home.labShows':
    'あなたの鍵が署名したこと、つまりサンプルが届いたことや、どの報告書を送ったかがわかります。誰がその鍵を持っているかはわかりません。誰でも、どんな名前でも鍵を登録できるからです。',
  'app.home.breederToo': '育成者でもあります',
  'app.home.imALab': 'ラボです',
  'app.home.whatStops': '他の人が先に私の素材を記録してしまったら、どうなりますか？',
  'app.home.samplesReceived': '受け取ったサンプル',
  'app.home.yourRecords': 'あなたの記録',
  'app.home.logNew': '記録を作る',
  'app.home.saveIt': '保存する',
  'app.home.finishBackupLine': '<b>仕上げ：バックアップを保存してください。</b>{line}',
  'app.home.keysOnlyHereRecords.other': '記録{count}件の鍵がこの端末にしかありません。',
  'app.home.resetWarningRecords.other':
    '記録{count}件に、確認済みのバックアップがない鍵があります。先にバックアップを保存してください。後でブラウザのデータを消去すると、それらは永久に失われます。',
  'app.home.resetConfirm':
    'このブラウザで、新しい空の一式からやり直しますか？\n\n何も削除されません。現在の記録は、鍵がかかったままVeilCoreのレジストリに残ります。取り戻せるのは現在の鍵があるときだけです。鍵は今、1つのファイルでダウンロードされます。ファイルを保管してください。',
  'app.home.startedOver': 'やり直しました。以前の記録は、保有者キーのファイルからいつでも復元できます。',
  'app.home.imported.other': '記録を{count}件インポートしました。',
  'app.home.alreadyHere.other': 'すでにあった{count}件はそのままにしました。',
  'app.home.importFailed': 'インポートに失敗しました。',
  'app.home.labJobs': 'ラボの作業',
  'app.home.labJobsText':
    '届いたものを確認し、記録のページから結果を送り返します。どちらも私たちではなくラボ自身の鍵で署名され、結果は育成者だけが開けるように鍵がかけられます。',
  'app.home.confirmDelivery': '届いたものを確認する',
  'app.home.labSignature': 'ラボの署名用の鍵',
  'app.home.setUpLabSignature': 'ラボの署名用の鍵を設定する',
  'app.home.openPlant': '{name} を開く',
  'app.home.quoted': '「{v}」',
  'app.home.labReportWaiting': '検査報告書が届いています',
  'app.home.openAgreements': '契約を開く',
  'app.home.myAgreements': '私の契約（{n}）',
  'app.home.more': 'その他',
  'app.home.saveABackup': 'バックアップを保存',
  'app.home.exportAll': 'すべての記録をエクスポート',
  'app.home.importRecords': '記録をインポート',
  'app.home.trust.title': '「私が<em>あなたの</em>素材を先に記録してしまったら？」',
  'app.home.trust.lede': 'VeilCoreの記録を支えているのは、次の3つです。',
  'app.home.trust.1t': '先に作った記録は、先のものとして示されます',
  'app.home.trust.1b':
    '記録がアンカーされると、どちらが先にアンカーされたかを誰でも確認できます。それまでは、記録の時刻は端末の時計です。記録は証拠であって登録ではありません。何をいつ持っていたかは示しますが、それだけで争いを決着させるものではありません。',
  'app.home.trust.2t': '紐付けた報告書は後で照合できる',
  'app.home.trust.2b':
    '紐付けでは、DNA報告書のコードを、あなたの陳述として記録と一緒に保存します。後で素材を新たに検査したとき、それと照合できます。MidnightのVeilCoreコントラクトを通じて紐付けると、紐付けにも日付が付きます。それはその時点までに記録がその報告書と紐付けられていたことを示し、誰が先に報告書を持っていたかは示しません。{thisSite}では、紐付けにはまだ日付が付きません。',
  'app.home.trust.3t': '受け取った相手方も記録に残る',
  'app.home.trust.3b':
    '素材を引き渡すと、受け取った人が自分の鍵で受領を確認します。これで記録にはあなただけでなく、もう一方の当事者が残ります。誰かが受け取ったことは示しますが、それが誰かは示しません。',
  'app.home.role.title': 'どれに当てはまりますか？',
  'app.home.role.intro':
    '最初に表示する内容が変わるだけです。できることは制限されません。どのページの下からでも変更できます。',
  'app.home.role.breeder.label': '育種をしている、または遺伝資源を保有している',
  'app.home.role.breeder.blurb':
    '保有するものの記録を封印し、サンプルをラボに送り、育成したもののライセンスを出します。',
  'app.home.role.lab.label': 'ラボを運営している、または素材を受け取る',
  'app.home.role.lab.blurb': '依頼者から素材を受け取り、届いたものを確認し、自分の鍵で報告書に署名します。',
  'app.home.role.both.label': '両方',
  'app.home.role.both.blurb': '育種をしていて、他の人から素材を受け取ることもあります。',
  'app.home.roleView.breeder': '育成者向けの表示',
  'app.home.roleView.lab': 'ラボ向けの表示',
  'app.home.roleView.both': '育成者とラボ向けの表示',
  'app.home.roleChange': '{view} · 変更',
  'app.home.chooseView': '育成者ですか、ラボですか？表示を選ぶ',
  // lab/LabDoor.tsx: /for-labs, asked once of a breeder with records of their own
  'app.home.labDoor.title': 'ラボ用の機能を追加しますか？',
  'app.home.labDoor.what': 'ラボ向けの表示で、署名用の鍵と受け取ったサンプルを確認できます。',
  'app.home.labDoor.text': 'あなたの記録はそのまま残ります。',
  'app.home.labDoor.add': 'ラボ用の機能を追加する',
  'app.home.labDoor.notNow': '今はしない',
  'app.labpage.title': 'ラボ向けの VeilCore',
  'app.labpage.lede':
    'すでに出している結果に署名します。育成者はそれを見せることができ、見た人はどの鍵がいつ署名したかを確認できます。ラボの今のシステムはそのまま使えます。',
  'app.labpage.setUp': 'ラボを設定する',
  'app.labpage.gets.title': 'ラボが得るもの',
  'app.labpage.gets.key.t': '署名用の鍵。',
  'app.labpage.gets.key.p':
    'ブラウザーの中で作られます。署名した受領と結果にはこの鍵が付き、それを見せられた人は誰でも署名を確認できます。',
  'app.labpage.gets.arrived.t': 'サンプルごとの署名付き受領。',
  'app.labpage.gets.arrived.p':
    '育成者が VeilCore のラボコード付きでサンプルを送ります。ラボは到着を確認するか受け取りを断り、そのことに署名します。',
  'app.labpage.gets.results.t': '育成者だけが開ける結果。',
  'app.labpage.gets.results.p':
    '見られるのは育成者、ラボ、サンプルを送った人だけで、ほかの人に見せられるのは育成者だけです。',
  'app.labpage.work.title': '仕事で変わること',
  'app.labpage.work.p1':
    'ラボのシステムは何も変わりません。ラボコード付きのサンプルが届いたら、コードを貼り付けるかスキャンして受け取りを確認し、あとで結果に署名します。',
  'app.labpage.work.p2':
    'サンプルのデータと依頼者の名前はラボの手元に残ります。VeilCore が保管するのは署名した受領と、育成者だけが開けるように鍵をかけた結果です。',
  'app.labpage.cost.title': '費用',
  'app.labpage.cost.p': '無料で試せます。ラボ向けの有料プランは作ってありますが、まだ有効にしていません。',
  'app.labpage.own.title': '使い方は自由に',
  'app.labpage.own.lede':
    'veilcore.org を使う必要はありません。VeilCore のコードはすべて Apache-2.0 ライセンスで公開しています。',
  'app.labpage.own.site.t': 'veilcore.org を使う。',
  'app.labpage.own.site.p': '設定は不要です。サーバーは私たちが動かし、ネットワーク手数料も私たちが払います。',
  'app.labpage.own.plug.t': '自分のソフトウェアに組み込む。',
  'app.labpage.own.plug.p':
    'データはラボのシステムに置いたまま、スマートコントラクトのパッケージ @veilcore/contracts で記録ごとに証明コードを加えます。',
  'app.labpage.own.plug.link': '組み込み方 →',
  'app.labpage.own.run.t': '自分で動かす。',
  'app.labpage.own.run.p':
    'ウェブサイト、記録を保管するサーバー、手数料サービスはすべて公開コードです。自分でホストし、ネットワーク手数料も自分で払うことになります。自分で運用するためのガイドに、すべての部分と設定を載せています。',
  'app.labpage.own.run.link': '自分で運用するためのガイド →',
  'app.labpage.own.plainly':
    'はっきり言うと、公開コードから自分で動かすことはできますが、VeilCore 以外でそれを行った人はまだいないので、私たちの手助けなしでは未検証です。ガイドのとおり自分のアドレスと名前で作れば、コピーはそれを使います。記録のメインのスマートコントラクトにはメンテナンス鍵があり、私たちが持っています。事実を証明するスマートコントラクトには鍵がありません。',
  'app.labpage.own.policyLink': 'メンテナンス鍵を誰が持ち、いつ使えるか →',
  'app.labpage.own.codeLink': 'GitHub のコード →',
  'app.labpage.gone.title': 'VeilCore がなくなったら',
  'app.labpage.gone.p':
    '日付が付いたものはそのまま残ります。日付は Midnight 上にあり、育成者のバックアップファイルには記録と、無料の公開ツールで確認するための証明が入っています。止まるのは新しい記録の作成とラボコードの受け渡しで、誰かが公開コードからサーバーを動かすまでです。',
  'app.labpage.gone.link': '私たちなしでも動き続けるもの →',
  'app.home.saveProblem.records': '記録',
  'app.home.saveProblem.agreements': '契約',
  'app.home.saveProblem.unreachable':
    'VeilCoreに接続できなかったため、最新の{what}はまだそこに保存されていません。このブラウザに保管され、次の保存時にもう一度送信されます。',
  'app.home.saveProblem.text': 'レジストリが{what}の一部を保存しなかったため、レジストリにある内容に戻しました：{list}',
  'app.home.sort.recent': '新しい順',
  'app.home.sort.oldest': '古い順',
  'app.home.sort.name': '名前',
  'app.home.sort.breeder': '育成者',
  'app.home.search.lab': '名前、育成者、TRコード、メモ、または受付番号',
  'app.home.search.breeder': '名前、育成者、または管理番号',
  'app.home.search.aria': '検索',
  'app.home.search.nothing':
    '「{q}」に一致するものはありません。検索の対象は、名前、育成者、記録識別子、あなたの管理番号、受け取ったサンプルの場合はラボコードと育成者のメモです。',
  'app.home.search.nOfTotal': '{total}件中{matched}件',
  'app.home.paste.ownCode': 'それはあなた自身のコードです。ラボに送ってください。ここで受け取らないでください。',
  'app.home.paste.cutOff': 'そのコードは途中で切れているようです。送られてきたラボコードを全部コピーしてください。',
  'app.home.paste.noneStamped':
    '保有の証明を求めるリクエストですが、この端末の記録にはまだ日付スタンプが押されたものがありません。新しい端末ですか？先にバックアップから記録を取り戻してください。',
  'app.home.paste.unknown':
    'VeilCoreのコードやリンクではないようです。送られてきたものを全部コピーして、もう一度お試しください。',
  'app.home.paste.label': 'コードやリンクが送られてきましたか？',
  'app.home.paste.placeholder': 'ここに貼り付け',
  'app.home.paste.go': '開く',
  'app.home.paste.orMake': '貼り付けるものがない場合は、記録を作る',
  'app.home.paste.hint': 'ラボコード、記録のリンク、署名する契約。どれかはこちらで判断します。',
  'app.home.paste.whichRecord': '保有の証明を求めるリクエストです。どの記録について聞かれましたか？',
  'app.home.receivedFrom': '{name} から受け取り',
  'app.home.receivedFromNamed': '{name}から · 相手の記録 {id}',
  'app.home.receivedFromName': '{name}から',
  'app.home.sealedOn': '{date} に封印',
  'app.home.labReportSaved': '検査報告書を保存済み',
  'app.home.keyStampQueued': '鍵の日付スタンプは順番待ち',
  'app.home.keyNotStamped': '鍵の日付スタンプはまだ',
  'app.home.reportsSent.other': '検査報告書を{count}件送信済み',
  'app.home.reportWithdrawn': '検査報告書は取り下げ済み',
  'app.home.labReportDated': 'DNA報告書に日付を付けました',
  'app.home.datesReportFor': '{name} のDNA報告書に日付を付ける記録',
  'app.home.aPlant': 'ある植物',
  'app.home.datingSealed': '{dated} · {date} に封印',
  'app.home.backupLine':
    '<b>まだバックアップされていません。</b>保存するまで、記録した内容はこのブラウザの中にしかありません。',
  'app.home.export.label': 'VeilCoreから記録と契約をダウンロード',
  'app.home.export.done':
    'ダウンロードしました：記録、契約、共有の選択、すべての包含証明。送付、そのサンプル情報、検査報告書は入っていません。送付または植物のページから開いてください。鍵はこのファイルではなく、バックアップファイルにあります。',
  // PlanBox.tsx, billing.ts, records.ts: paid plans (off unless VITE_PAID_PLANS=on)
  'app.plan.full':
    '無料の記録数を使い切ったため、新しい記録は作成されませんでした。すでにある記録はすべて引き続き確認できます。さらに追加するには、記録のページでプランを選んでください。',
  'app.plan.unknown':
    '現在VeilCoreがプランを確認できなかったため、新しい記録は作成されませんでした。接続を確認して、もう一度お試しください。',
  'app.plan.box.free': '無料プラン：日付を付けた記録 {cap}件中{held}件',
  'app.plan.box.left': '無料で日付を付けられる残り：{n}件',
  'app.plan.box.countsDeleted': '日付を付けた記録は、後で削除しても数に含まれます。',
  'app.plan.changeFull':
    'この変更は新しい版に日付を付けることになりますが、無料の日付付き記録を使い切っているため、何も変更されていません。お持ちの記録はすべて引き続き確認できます。さらに日付を付けるには、記録ページでプランを選んでください。',
  'app.plan.receiveFull':
    'この送付を受け取るための無料の日付付き記録が残っていません。コードはこのブラウザに保存されています。記録ページでプランを選んでから、もう一度入力してください。',
  'app.plan.box.rules': '記録の最初の訂正は無料です。送付を受け取るには、無料で日付を付けられる枠が1件必要です。',
  'app.plan.box.paid': 'ご利用のプラン：{plan}',
  'app.plan.name.breeder': '育成者',
  'app.plan.name.lab': 'ラボ',
  'app.plan.name.free': '無料',
  'app.plan.choose': 'プランを選ぶ',
  'app.plan.buy.breeder': '育成者プラン',
  'app.plan.buy.lab': 'ラボプラン',
  'app.plan.opens':
    'Paddleのページを新しいタブで開きます。PaddleがVeilCoreに代わってプランを販売し、支払いを受け取ります。VeilCoreがカード情報やメールアドレスを見ることはありません。',
  'app.plan.keep': 'どれを選んでも、すでにある記録はすべて引き続き確認できます。',
  'app.plan.recheck': '支払い済みですか？もう一度確認',
  'app.plan.err.off': 'このブラウザからはまだプランを購入できません。',
  'app.plan.err.unreachable': 'Paddleのページを開けませんでした。少ししてからもう一度お試しください。',
  'app.plan.err.busy': '1時間以内の試行回数が多すぎます。後でもう一度お試しください。',
  'app.plan.err.noRecord': '先に記録を1件保存してください。プランは日付を付ける記録のためのものです。',
  'app.plan.err.blocked':
    'ブラウザがPaddleのページをブロックしました。このサイトのポップアップを許可して、もう一度お試しください。',
  'app.plan.buy.other': '{plan}プラン',
  'app.plan.importFull':
    'このファイルにはVeilCoreにとって新しい記録が{n}件ありますが、無料プランで日付を付けられるのはあと{left}件です。何も取り込まれませんでした。さらに日付を付けるには、記録のページでプランを選んでください。',
  'app.plan.box.full':
    '無料の記録数を使い切りました。すでにある記録はすべて引き続き確認できます。さらに追加するにはプランを選んでください。',
  'app.home.labSheet': '今日の表を封印する',
  'app.labpage.work.sheet':
    '培養物や試料の表を毎日書き出していますか？表全体をまとめて封印できます。初回のあと、この端末が列の設定を覚えるので、翌日からはボタン一つです。',
  'app.labpage.work.sheetLink': '今日の表を封印する',
} satisfies Partial<AppTranslation>;
