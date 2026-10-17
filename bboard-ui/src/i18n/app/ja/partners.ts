// Japanese. DRAFT: machine-assisted, to be checked by a fluent speaker before publishing
// (docs/translations/README.md). Terms as in ../../ja.ts, plus the app's: see ./index.ts.
// Code (checkRecord, <name>-unchecked, partner-kit check <link>) stays as it is.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const partners = {
  'app.partners.label': 'パートナー向け',
  'app.partners.title': 'VeilCoreの記録の提出を求める。',
  'app.partners.titleEm': '確認は無料です。アカウントは不要です。',
  'app.partners.lede':
    '会員制度、ライブラリ、登録簿、マーケットプレイスなどで申請者にVeilCoreの記録を求める場合、どの記録も数秒で、ご自身のフォーム上で確認できます。私たちへの連絡は必要ありません。',
  'app.partners.gives.title': '記録の提出を求めると得られるもの',
  'app.partners.gives.1.t': '変わらない説明',
  'app.partners.gives.1.d':
    '記録は申請より前に封印されています。後で説明を見せられたとき、それが封印されたものと同じかどうかを確かめられます。',
  'app.partners.gives.2.t': '日付',
  'app.partners.gives.2.d':
    '記録が日付の付いたバッチに入れば、その証明コードがいつまでに存在していたかを誰でも調べられます。日付はMidnightから得るもので、VeilCoreや申請者によるものではありません。',
  'app.partners.gives.3.t': '確認済みのラボの署名',
  'app.partners.gives.3.d':
    'サンプルと検査報告書の受領書について、それぞれの署名を確認し、VeilCoreの運営者がラボの名前を公開のリストと照合したかどうかを示します。受領書は、レジストリがそれを記録の送付と結び付けた場合にのみ数えられ、届いたものが送ったものと一致するかどうかも確認できます。',
  'app.partners.gives.4.t': '全員に同じ確認',
  'app.partners.gives.4.d': 'どの申請者のリンクも、あなたのページで同じ方法で確認されます。',
  'app.partners.not.title': '示さないこと',
  'app.partners.not.lede':
    'VeilCoreが何かを保証することはありません。確認の結果は、何を確認したか、それ以外は誰の申告かを示します。判断するのはあなたです。',
  'app.partners.not.1': '素材が何であるか。VeilCoreが遺伝情報を見ることはありません。',
  'app.partners.not.2': '説明が真実であること。示すのは、説明が変わっていないことだけです。',
  'app.partners.not.3': '現在、誰が素材や記録を保有しているか。',
  'app.partners.not.4':
    'ラボの作業が正しいこと。名前が確認済みというのは、公開のリストと照合できたという意味で、それ以上ではありません。',
  'app.partners.not.5': '親子関係、権利、ライセンス、法的な地位。',
  'app.partners.demo.title': '試してみる',
  'app.partners.demo.lede':
    '記録の確認用リンクを貼り付けてください。このサイトが使うレジストリに対して、このブラウザの中で確認します。ほかの場所には何も送られず、何も保存されません。',
  'app.partners.demo.label': 'VeilCoreの記録の確認用リンク',
  'app.partners.demo.loading': '入力欄を読み込んでいます…',
  'app.partners.steps.title': '誰が何をするか',
  'app.partners.steps.applicant': '申請者',
  'app.partners.steps.applicant.1':
    '受け入れ番号ごとに記録を作ります。veilcore.orgでも、自分のソフトウェアでも作れます。',
  'app.partners.steps.applicant.2': '記録を開き、「誰かに見せる」を選んで「リンクをコピー」を押します。',
  'app.partners.steps.applicant.3':
    'リンクをあなたのフォームに貼り付けます。規則で求められていれば、記録の証拠バンドルも送ります。',
  'app.partners.steps.you': 'あなた',
  'app.partners.steps.you.1':
    'フォームに入力欄を追加します（下記）。または、受け取ったリンクをこのページの入力欄に貼り付けます。',
  'app.partners.steps.you.2':
    '何を受け入れるかを決めます。リンクが一致すること、さらにMidnightのメインネットワークで日付が付いていること、さらに名前が確認済みのラボの受領書があること、のいずれかです。',
  'app.partners.steps.you.3': '確認の結果を申請書と一緒に保管します。',
  'app.partners.form.title': 'フォームに追加する',
  'app.partners.form.lede':
    'ファイルは1つ、約40 KBで、あなたのサイトから配信します。「required」を付けると、リンクが一致する記録につながり、矛盾するものが何もないときまでフォームは送信されません。申請者がリンクを変えた場合は、もう一度確認が必要です。',
  'app.partners.form.example': 'HTMLの例',
  'app.partners.form.allowTest':
    'テストネットワークで日付が付いた記録も受け入れます。試すためのものです。テストの日付には効力がないため、既定では受け入れません。',
  'app.partners.form.unreachable':
    'VeilCoreのレジストリに接続できない場合、リンクを「未確認」として印を付けたうえでフォームを送信できるようにします（フォームは<name>-uncheckedも送ります）。これがないと、レジストリが止まっている間、必須の入力欄がフォーム全体の送信を止めます。',
  'app.partners.form.csp':
    'コンテンツセキュリティポリシーには、ファイルを配信する場所へのscript-srcと、レジストリへのconnect-srcが必要です。スタイル、画像、フレームの例外は不要で、Trusted Typesでも動きます。Cookie、ストレージ、トラッキングは使いません。',
  'app.partners.form.status':
    'まだnpmにはありません。VeilCoreのリポジトリのpartner-kit/record-checkからビルドし、あなたのサイトからファイルを配信してください。',
  'app.partners.facts.title': '頼る前に',
  'app.partners.facts.cost': '費用',
  'app.partners.facts.cost.d':
    '確認は無料です。あなたにとっても、ほかの誰にとってもです。アカウント、キー、契約は不要です。',
  'app.partners.facts.support': 'サポート',
  'app.partners.facts.support.d': 'メール：<link></link>。サポート契約や回答期限はありません。',
  'app.partners.facts.data': 'データ',
  'app.partners.facts.data.d':
    '確認でレジストリに送られるのは、記録のIDと証明コードだけで、申請者やあなたのフォームについては何も送りません。ほかのウェブサイトと同じく、レジストリはリクエストごとに訪問者のネットワークアドレスを受け取り、回数制限に使います。VeilCoreが保存するものは<link>プライバシーのページ</link>に書いてあります。より詳しいデータの条件は検討中の草案で、公開されるまではプライバシーのページの内容が適用されます。',
  'app.partners.facts.down': 'レジストリが止まっている場合',
  'app.partners.facts.down.d':
    '何も確認できません。既定では、レジストリがまた応答するまで、必須の入力欄がフォームの送信を止めます。when-unreachable="allow"を付けると、リンクを「未確認」として印を付けたうえでフォームが送信され、後でこのページで確認できます。',
  'app.partners.facts.gone': 'VeilCoreが終了した場合',
  'app.partners.facts.gone.d':
    '入力欄とveilcore.orgの確認ページは動かなくなります。記録は証拠バンドルから引き続き確認でき、証拠バンドルは公開の形式に照らしてオフラインで確認できます。プログラムがVeilCoreに依存してはならない場合は、証拠バンドルの提出を求めてください。',
  'app.partners.facts.npm': 'まだnpmにはありません',
  'app.partners.facts.npm.d':
    'VeilCoreのリポジトリからキットをビルドし、入力欄のファイルをあなたのサイトから配信してください。',
  'app.partners.policy.title': '規定の文例',
  'app.partners.policy.note': '文例であり、法的助言ではありません。ご自身の規則に合わせて変えてください。',
  'app.partners.policy.1':
    '申請者は、寄託する受け入れ番号ごとにVeilCoreの記録の確認用リンクを提出しなければなりません。記録が存在し、リンクがその記録と一致する必要があります。[プログラム名]は申請を受け取った時点で各リンクを確認し、その結果を申請書と一緒に保管します。',
  'app.partners.policy.2':
    'VeilCoreの記録は、申請者が自らの素材について述べたものを、証明コードを取って日付を付けたものです。記録を受け入れることは、[プログラム名]またはVeilCoreが、素材が何であるか、誰が保有しているか、素材に関するいかなる権利をも確認したことを意味しません。',
  'app.partners.dev.title': '開発者向け',
  'app.partners.dev.1': '1回の呼び出し',
  'app.partners.dev.1.d':
    'Nodeでもブラウザでも、checkRecord(link)はプレーンなJSONを返します：recordExists、fingerprintMatches、dated（network、batch、transaction、block time、checkedOnChain）、keyBound、名前の確認を含むlabReceipts、whatThisDoesNotShow。',
  'app.partners.dev.2': 'Midnight上で',
  'app.partners.dev.2.d':
    'Nodeで@veilcore/contractsをインストールしていれば、日付スタンプをチェーン上で調べます。対象はVeilCoreの固定されたコントラクト、固定されたビルド、そしてまさにこのバッチのルートです。',
  'app.partners.dev.3': 'コマンドライン',
  'app.partners.dev.3.d':
    'partner-kit check <link>で同じ答えを表示します。終了コード0：記録が存在し、リンクが一致し、矛盾するものがありません。終了コード1：何かが成り立ちません。テストネットワークでの日付（--allow-test-networkがない場合）や、確認できない包含証明も含みます。終了コード2：何も確認できませんでした。',
  'app.partners.dev.4': 'VeilCoreなしで',
  'app.partners.dev.4.d':
    '記録の証拠バンドルはオフラインで確認でき、形式は公開されています。VeilCoreがなくなっても、証拠バンドルを手元に持っている記録は引き続き確認できます。',
  'app.partners.dev.guide': 'ガイド全文を読む',
  'app.partners.dev.kit': 'キットのソースコード',
} satisfies Partial<AppTranslation>;
