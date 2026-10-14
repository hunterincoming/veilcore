// Japanese. DRAFT: machine-assisted, to be checked by a fluent speaker before publishing.
// SPDX-License-Identifier: Apache-2.0
import type { Strings } from './en';
export const ja: Strings = {
  // Header and footer
  'nav.language': '言語',
  'footer.documents': '文書',
  'footer.spec': '仕様書',
  'footer.evidence': '証拠としての記録',
  'footer.integrate': '統合ガイド',
  'footer.source': 'ソースコード',
  'footer.allImplementations': '3つの実装すべて',
  'footer.referenceImplementation': 'リファレンス実装',
  'footer.rustImplementation': 'Rust実装',
  'footer.thisSite': 'このサイト',
  'footer.whatThisIs': 'このサイトについて',
  'footer.yourRecords': 'あなたの記録',
  'footer.agreements': '契約',
  'footer.privacy': 'デモのプライバシー',
  'draft.banner': 'この翻訳は草稿であり、まだ母語話者による確認を受けていません。英語版のページが正式な版です。',
  'draft.showEnglish': '英語で表示',
  // Public pages (Mako's 25 September layout)
  'm.nav.about': '概要',
  'm.nav.team': 'チーム',
  'm.nav.updates': 'お知らせ',
  'm.nav.spec': '仕様',
  'm.nav.demo': 'デモを試す',
  'm.nav.menu': 'メニュー',
  'm.hero.label': '保有していることの証明',
  'm.hero.title1': '先に持っていたことを証明する。',
  'm.hero.title2': 'あなたの遺伝情報は誰にも見せずに。',
  'm.hero.how': '仕組み',
  'm.hero.cultivar': '品種',
  'm.hero.bredBy': '育成者',
  'm.hero.bredByDefault': 'お名前',
  'm.hero.demoLabel': 'フィンガープリントのライブデモ',
  'm.hero.fpUpdated': 'フィンガープリントを更新しました',
  'm.hero.typed': '入力する内容',
  'm.hero.goes': 'Midnightに載るもの',
  'm.foot.demo': 'デモ',
  'm.step1.n': '01 · 記録',
  'm.step2.n': '02 · フィンガープリント',
  'm.step3.n': '03 · アンカー',
  'm.step4.n': '04 · 検証',
  'm.step4.title': '後から提示する',
  'm.demo.label': 'デモ',
  'm.demo.title1': '見たい方法を',
  'm.demo.title2': 'お選びください。',
  'm.demo.create.title': '植物を登録する',
  'm.demo.create.text': '架空の植物を登録し、バックアップを保存して、その植物のページを表示します。',
  'm.demo.verify.title': '記録を検証する',
  'm.demo.verify.text': '記録の識別子を入力すると、保有者が開示した内容と、アンカー済みかどうかを確認できます。',
  'm.demo.video.title': '仕組みを動画で見る',
  'm.demo.video.text':
    '考え方を60秒のアニメーションで紹介します。手元に残るもの、Midnightに載るもの、そして相手がそれをどう確認するか。',
  'm.chip.video': '動画',
  'm.chip.60s': '60秒',
  'm.chip.75s': '75秒',
  'm.chip.interactive': 'インタラクティブ',
  'm.chip.3min': '約3分',
  'm.chip.1min': '約1分',
  'm.team.label': 'チーム',
  'm.team.title1': '2人の創業者。',
  'm.team.title2': '東京とニュージャージー。',
  'm.team.more': '詳しいプロフィール →',
  'm.mako.role': '共同創業者兼CEO · 東京',
  'm.mako.short': '事業責任者：日本とEUの標準化団体・育成者権関係機関を担当。',
  'm.hunter.role': '共同創業者兼COO · ニュージャージー',
  'm.hunter.short': 'コントラクト、ウェブサイト、APIを開発。米国でのアウトリーチを主導。',
  'm.updates.label': 'お知らせ',
  'm.updates.title1': '開発の',
  'm.updates.title2': '最新情報。',
  'm.updates.read': '読む →',
  'm.updates.all': '記録フォーマットの変更はGitHubで →',
  'm.updates.follow': 'フォロー',
  'm.post1.date': '2026年10月3日',
  'm.post1.tag': 'フォーマット',
  'm.post1.title': '3つの実装、1つの答え',
  'm.post1.text':
    '差分テストにより、TypeScript、Python、Rustの各実装が一部の数値で一致しないことが判明しました。修正済みです。現在は81,000件の入力すべてで一致し、共通のテストベクターでそれを確認しています。',
  'm.post2.date': '2026年10月2日',
  'm.post2.tag': 'コントラクト',
  'm.post2.title': 'Midnightのテストネットでの全工程の実行',
  'm.post2.text':
    'コントラクトをMidnightのテストネットにデプロイし、26項目のエンドツーエンドチェックをすべて通過しました。24の操作のうち16を実際の証明で使用しています。',
  'm.status.label': '現在の状況',
  'm.status.title1': '現状を',
  'm.status.title2': '率直にお伝えします。',
  'm.status.lede': '完了していることと、まだのこと。',
  'm.stat3.b': '監査なし',
  'm.status.keyTitle': 'コントラクトを変更できるのは誰か。',
  'm.status.keyText':
    '1本のメンテナンス鍵で、Midnight上のVeilCoreコントラクトの動作を変更できます。鍵の保有者はコントラクトの操作を追加・置換でき、それによって、あらゆる記録のアイデンティティの乗っ取り、任意の発行者名義でのライセンスの追加、義務や親子リンクの追加・削除、操作の停止が可能になりえます。ネットワークのブロック時刻をさかのぼって変えることはできず、すべての変更はチェーン上で確認できます。現在、鍵は紙で保管され、創業者がそれぞれ1部ずつ持ち、どちらか1部だけで使用できます。合意が必要な複数の鍵への移行は計画中で、まだ実施していません。使用はすべて、書面のメンテナンスポリシーに基づき公表します。',
  'm.status.keyLink': 'メンテナンスポリシーを読む →',
  'm.contact.label': 'お問い合わせ',
  'm.contact.title1': 'どこで失敗するか',
  'm.contact.title2': '教えてください。',
  'm.contact.email': '創業者にメールする',
  'm.contact.spec': '仕様を読む',
  'm.foot.explore': '見る',
  'm.foot.build': '開発',
  'm.foot.contact': 'お問い合わせ',
  'm.foot.verify': '記録を検証する',
  'm.foot.fine': 'ある日付までに記録を保有していたことの証拠。植物の権利証ではありません。',
  'm.foot.privacy': 'デモのプライバシー',
  'm.verify.label': '検証',
  'm.verify.title': '記録を確認する',
  'm.verify.lede':
    '証明書に印字された、または共有された記録識別子を入力してください。保有者が共有を選んだ内容と、このページ自体が確認できたこと（記録が封印済みのバッチに含まれているか、ラボの署名があればそれが有効か）が表示されます。',
  'm.verify.field': '記録識別子',
  'm.verify.go': '確認する',
  'm.founders.label': '創業者',
  'm.founders.leads': '担当',
  'm.founders.also': 'その他',
  'm.founders.languages': '言語',
  'm.mako.bio1':
    'Makoto（Mako）SteinerはVeilCoreの共同創業者兼CEOです。事業戦略、資金調達、そして世界各地の機関や投資家へのアウトリーチを統括しています。',
  'm.mako.bio2': 'デニソン大学で環境学を専攻し、東京を拠点としています。',
  'm.mako.leads': '日本|EU|標準化団体|事業開発',
  'm.mako.also': 'Midnight Nightforce Leader（日本） · Build Club 第1期',
  'm.mako.languages': '英語 · 日本語',
  'm.hunter.bio1':
    'Hunter RobertsはVeilCoreの共同創業者兼COOです。記録フォーマットからMidnight上のコントラクトまで、プロダクトとVeilCoreプロトコルを統括しています。種子認証、標準化、植物品種関係の機関を含む、米国の機関へのVeilCoreのアウトリーチを主導しています。',
  'm.hunter.bio2':
    "育種や組織培養を含む植物の実務経験を持ち、ニュージャージー州で栽培施設Chunk's Treesを立ち上げています。",
  'm.hunter.leads': '米国|プロトコルと仕様|エンジニアリング',
  'm.hunter.also': 'Midnight Nightforce Leader（米国） · Build Club 第1期',
  'm.founders.band1': 'お話しください。',
  'm.founders.band2': 'うまくいくと言われるより、',
  'm.founders.band3': 'どこで失敗するかを聞きたいのです。',
  'm.founders.bandText':
    '育種プログラム、ラボ、種子認証機関、育成者権関係機関を運営されている方は、ぜひお話しさせてください。このフォーマットは実装も検証も無料です。',
  'm.founders.emailBoth': '創業者2人にメールする',
  'm.portraitOf': '{name}の肖像',
  'm.privacy.label': 'デモのプライバシー',
  'm.privacy.title': 'デモが保存するもの。',
  'm.privacy.lede':
    'このページは、本サイトのデモについての説明です。デモはMidnightのテストネットワーク上での試験です。架空のデータをお使いください。',
  'm.privacy.stored.title': 'テストサーバーに保存されるもの',
  'm.privacy.stored.text':
    '入力した内容と、そこからブラウザが計算したもの：品種名と育成者名、入力した場合は種名、日付、メモ、参照番号、親、記録・写真・検査報告書のフィンガープリント、検査報告書のファイル名、契約の条件と相手方、ラボに送る素材（宛先と数量）、そしてラボの場合は公開する署名用の公開鍵と証明。さらに、サーバーが記録を見つけられるよう、保存のたびにブラウザが送信する保有者キー。サーバーはRailway上でホストされているVeilCoreのテスト用レジストリです。',
  'm.privacy.local.title': 'ブラウザから出ないもの',
  'm.privacy.local.text':
    '遺伝データ、検査報告書やDNA報告書のファイル、写真。ブラウザがフィンガープリントを計算するためにこれらを読み込みます。ファイル自体がアップロードされることはありません。',
  'm.privacy.test.title': 'テストネットワーク',
  'm.privacy.test.text':
    'デモは本番ネットワークではなく、Midnightのテストネットワークを使用しています。テストネットワークがリセットされた際に、デモのデータが削除されることがあります。',
  'm.privacy.madeup.title': '架空のデータをお使いください',
  'm.privacy.madeup.text':
    '実在の名前、実在の品種、機密情報は入力しないでください。デモは記録フォーマットを試すためのものです。',
  'm.privacy.export.title': 'エクスポート',
  'm.privacy.export.text':
    '記録ページの「Export」ボタンで、このブラウザが保持している記録をダウンロードできます。私たちのサーバーが保存しているすべてのデータを一括でダウンロードする機能は準備中で、まだ利用できません。',
  'm.privacy.delete.title': '削除',
  'm.privacy.delete.text':
    'サーバーからデモのデータを削除してほしい場合は、記録の識別子を添えて hunter@veilcore.org までメールでご連絡ください。',
  'm.privacy.browser.title': 'ブラウザに保存されるもの',
  'm.privacy.browser.text':
    'このデバイスのブラウザには、次のものが保存されます：保有者キー（上記のとおり、写しはサーバーにも送られます）、設定した場合はラボの署名鍵（秘密鍵の部分はこのデバイスから出ません）、選んだ役割、言語。削除するには、ブラウザの設定でこのサイトのデータを消去してください。先に保有者キーを保存しておいてください。保有者キーがないと、このブラウザでは記録を見つけられなくなります。',
  'm.privacy.hosts.title': 'ホスティング',
  'm.privacy.hosts.text':
    'このウェブサイトはVercelでホストされており、VercelはIPアドレスとリクエストを記録します。レジストリサーバーはRailwayで稼働しており、Railwayはリクエストを記録します。',
  'm.privacy.who.title': '誰が、どのくらいの期間保管するか',
  'm.privacy.who.text':
    'VeilCoreはまだ法人化していないため、このサイトとレジストリはVeilCoreの創業者が運営しています。保管期間は定めていません。レジストリが保持するデータは、削除のご依頼があるまで保管されます。連絡先：hunter@veilcore.org',
  'm.notfound.title': 'ページが見つかりません。',
  'm.notfound.text':
    'このアドレスにページはありません。記録へのリンクを受け取った場合は、リンクが途中で切れていないか確認してください。',
  'm.notfound.home': 'VeilCoreのホーム →',
  'm.privacy.contact': 'お問い合わせ：hunter@veilcore.org',
  // Round 2 truth pass (14 Oct 2026): keys added or newly translated.
  'm.hero.lede':
    '植物・動物の遺伝資源を扱う育種家、種苗会社、ラボのために。遺伝データとラボのファイルがあなたのコンピューターから出ることはありません。Midnightに載るのはフィンガープリントだけで、Midnightがその日付を確定します。入力した品種名と育成者名はVeilCoreのサーバーに保存され、記録のリンクを持つ人は誰でもその品種名を見ることができます。確認は無料。登録もウォレットも不要です。',
  'm.for.3p':
    'ラボコードを付けて素材を送ります。ラボがコードを入力すると、ラボは自らの鍵で受領確認に署名します。記録にもう一方の当事者が加わるので、依頼者だけでなくラボも守られます。受領確認は本物の署名で、チェーン上ではなくVeilCoreのレジストリに保管されます。用途、増殖の禁止、使用後の返却や廃棄といった条件は、ウェブデモでは練習用です。',
  'm.get.1b': '保有しているものの記録に、遺伝情報を見せずに。',
  'm.get.3b':
    '親子リンクは、双方の保有者が確認した場合にのみ有効です。このウェブサイトでは、チェーンではなくVeilCoreのレジストリが記録します。',
  'm.open.2t': '記録の確認に、私たちは必要ありません。',
  'm.open.2p':
    '植物のページから2つのファイルを保存してください。エクスポートした記録と、その包含証明（記録が日付の確定したバッチに含まれていることを示す小さなファイル）です。この2つがあれば、VeilCoreがなくなっても、誰でもSHA-256、公開仕様、Midnightエクスプローラーでの照会によって確認できます。バックアップファイルに入っているのは鍵で、これらのファイルではありません。',
  'm.faq.1a':
    '記録がアンカーされれば、どれが先にアンカーされたかを誰でも確認できます。検査報告書を紐付けておけば、後の検査と比較できます。素材を送るときは、受け取った側が自らの鍵で受領を確認します。記録は証拠であって登録ではありません。示すのは、その日付までにあなたがこの記録を持っていたことであり、植物そのものを持っていたことではありません。それだけで紛争が決着するわけでもありません。',
  'm.faq.5a':
    '日付は残ります。Midnightのメインネットワークにアンカーされた、またはBitcoinにスタンプされたバッチのフィンガープリントは、私たちを含め誰にも消せません。私たちなしで記録を確認するには、保存しない限り私たちのサーバーにしかない2つのファイルが必要です。記録（「Export record」）と包含証明（「Download inclusion proof」）で、どちらも植物のページの「Technical details」にあります。バックアップファイルに入っているのは鍵で、これらのファイルではありません。仕様は公開されており、TypeScript、Python、Rustのコードも公開しています。ワンクリックで証拠一式を取得できる機能を準備中です。',
  'm.post0.date': '2026年10月4日',
  'm.post0.tag': 'コントラクト',
  'm.post0.title': '1つの事実を証明し、残りは守る',
  'm.post0.text':
    '2つのコントラクトが、Midnightのpreprodテストネットワークで37項目のエンドツーエンドチェックをすべて通過しました。新しいクレーム（値、範囲、差異、修正で他の値が変わっていないこと、テスト用ラボ鍵による署名）も含みます。マーカーデータは架空のものです。',
  'm.postA.date': '2026年10月8日',
  'm.postA.tag': 'ローンチ',
  'm.postA.title': 'Midnightのメインネットワークで稼働',
  'm.postA.text':
    '2つのコントラクトをMidnightのメインネットワークにデプロイしました。クレーム用コントラクトにはメンテナンス鍵がなく、私たちを含め誰も変更できません。',
  'm.postB.date': '2026年10月11日',
  'm.postB.tag': 'レジストリ',
  'm.postB.title': 'Bitcoinでも日付が確定した最初のバッチ',
  'm.postB.text':
    'レジストリの最初のバッチを、手作業でMidnightのメインネットワークにアンカーしました。そのうちの1つ（私たち自身のテスト記録5件）は、ルートがBitcoinのブロック971004にもスタンプされています。OpenTimestampsの公式ツールによる確認はまだです。',
  'm.founders.lede':
    'VeilCoreは、植物・動物の遺伝資源のための証拠用記録フォーマットです。遺伝データを渡すことなく、ある日付までにあなたが自分の素材の記録を保有していたことを示します。',
  'm.live.label': 'どこで何が使えるか',
  'm.live.title1': '何が動いていて、',
  'm.live.title2': 'どこで使えるか。',
  'm.live.lede':
    'veilcore.orgはMidnightのメインネットワークで稼働しており、そこで作った記録は本物です。テストサイトは練習用です。使える機能はより多いものの、記録に証拠としての重みはありません。',
  'm.live.colMain': 'veilcore.org（メインネットワーク）',
  'm.live.colTest': 'テストサイト',
  'm.live.colNot': '未対応',
  'm.live.stamp.t': '記録への日付スタンプ',
  'm.live.stamp.main':
    'あり。VeilCoreが記録をバッチ単位で日付確定します（現在は手作業）。ブラウザからチェーンには何も送りません。',
  'm.live.stamp.test': 'あり。ブラウザが記録ごとにスタンプを押し、バッチは自動で日付確定されます。',
  'm.live.share.t': '他の人に見せる内容を選ぶ',
  'm.live.share.main': 'あり。品種名は常に表示されます。',
  'm.live.share.test': 'あり。品種名は常に表示されます。',
  'm.live.lab.t': 'ラボコードと署名付き受領確認',
  'm.live.lab.main': 'あり。ラボが自らの鍵で署名します。受領確認はチェーンではなくVeilCoreのレジストリが保管します。',
  'm.live.lab.test': 'あり。同じ仕組みです。',
  'm.live.results.t': 'あなただけが開けるラボ報告書',
  'm.live.results.test': 'あり。新機能で、まだテスト中です。',
  'm.live.results.not': 'veilcore.orgでの提供。',
  'm.live.dna.t': 'DNA報告書の紐付けへの日付',
  'm.live.dna.main': '記録と一緒に保存されますが、日付は確定しません。',
  'm.live.dna.test': 'あり。ブラウザから送信します。',
  'm.live.prove.t': 'リンクで証明する',
  'm.live.prove.test': 'あり。相手のページが、あなたが記録を保有していることをネットワーク上で確認します。',
  'm.live.prove.not': 'veilcore.orgでの提供。ブラウザからトランザクションを送る必要があるためです。',
  'm.live.claims.t': '1つの事実を証明する（クレーム）',
  'm.live.claims.main':
    'コントラクトはメインネットワーク上にあり、メンテナンス鍵はありません。ウェブサイトからはまだ使えません。',
  'm.live.claims.not': 'ウェブサイトからの利用。',
  'm.live.lic.t': 'ライセンスとロイヤルティ',
  'm.live.lic.main': '練習用のみ。',
  'm.live.lic.test': '練習用のみ。',
  'm.live.lic.not': 'ウェブサイトからの本物のライセンス。コントラクトには組み込まれています。',
};

/** The public test site (en-testchain.ts), in this language. Draft, like the rest of this file. */
export const jaTestchain: Strings = {
  'm.hero.status':
    'ここはテストサイトです。日付スタンプ、ラボコード、証明リンクは、Midnightのテストネットワーク上で実際に動きます。ここでの記録は練習用で、証拠にはなりません。',
  'm.claims.status':
    '2つ目のMidnightコントラクトです。2026年10月4日にMidnightのpreprodテストネットワークで、架空のマーカーデータを使ってすべてのエンドツーエンドチェックを通過し、2026年10月8日からMidnightのメインネットワーク上にあります。このウェブサイトにはまだ組み込まれていません。',
  'm.faq.3a':
    '証拠として使えるように作られており、法律家向けの解説で、何を証明し何を証明しないかを説明しています。このテストサイトはMidnightのテストネットワークで記録の日付を確定しますが、テストネットワーク上の日付に証拠としての重みはありません。本物の記録は、Midnightのメインネットワークで稼働するveilcore.orgで作成してください。',
  'm.stat2.b': 'テストサイト',
  'm.stat2.s':
    'このサイトは練習用に、Midnightのpreprodテストネットワークで稼働しています。2つのコントラクトは2026年10月8日からMidnightのメインネットワーク上にあります。',
  'm.foot.about':
    '植物・動物の遺伝資源のためのオープンな記録フォーマット。ここはMidnightのテストネットワーク上のテストサイトです。veilcore.orgはMidnightのメインネットワークで稼働しています。',
  'm.for.1p':
    '記録を封印し、DNA報告書を紐付けます。植物が別の名前で出回っても、ラボは新しい検査結果をあなたの報告書と比較できます。Midnight上のVeilCoreコントラクトを通じて紐付けると、紐付けにも日付が付きます。その日付の時点であなたの記録を管理していた人が、その報告書またはそのSHA-256をすでに持っていたことを示せます。チェーンに載るものはあなたの記録に結び付けられ、報告書の中身は隠されるので、誰もあなたの紐付けを自分の記録にコピーできません。このテストサイトでは、ブラウザから紐付けの日付を確定できます。VeilCoreはDNA検査を行いません。',
  'm.demo.lede':
    '登録もウォレットも不要です。ここはテストサイトなので、架空の情報をお使いください。ブラウザが各記録にMidnightのテストネットワーク上で日付スタンプを押し（手数料はVeilCoreが支払います）、バッチは自動でアンカーされます。DNA報告書の紐付けにも日付を付けられます。ラボの受領確認はラボ自身の鍵による本物の署名で、チェーンの外に保管されます。ライセンスとラボ契約は練習用です。',
  'm.privacy.test.text':
    'このサイトは、メインネットワークではなくMidnightのpreprodテストネットワークを使用しています。ブラウザは各日付スタンプを、VeilCoreの手数料サービスを通じてそのネットワークに送ります。入力した内容やファイルがそこへ送られることはありません。テストネットワークはリセットされることがあり、テストデータが削除される場合があります。',
  'm.privacy.hosts.text':
    'このウェブサイトはVercelでホストされており、VercelはIPアドレスとリクエストを記録します。レジストリサーバーと、テストネットワークの手数料を支払いこのページからのネットワーク読み取りを中継するサービスはRailwayで稼働しており、Railwayはリクエストを記録します。このサービスはBlockfrost経由でネットワークを読み取ります。',
};
