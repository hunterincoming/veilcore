// Japanese: animal records. DRAFT: machine-assisted, to be checked by a fluent speaker before
// publishing (docs/translations/README.md). Terms as in ./index.ts (the animal terms are listed
// there): 動物, 個体識別番号, 番号の体系, 父, 母, 動物種, 品種, 性別, 雌, 雄, 生年月日, 生産者または保有者,
// 牧場・農場, 耳標. app.animal.v.<key> is <key> said of an animal (植物 → 動物).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const animal = {
  'app.animal.choice.label': '何を記録しますか？',
  'app.animal.choice.plant': '植物',
  'app.animal.choice.animal': '動物',
  'app.animal.title': '動物を記録する',
  'app.animal.name': '動物の名前（名号）',
  'app.animal.namePlaceholder': '例：練習用の牛',
  'app.animal.nameField': '動物の名前（名号）',
  'app.animal.individualId': '個体識別番号',
  'app.animal.individualIdHelp': '耳標や登録に書かれている番号を、そのとおりに入力してください。',
  'app.animal.idScheme': '番号の体系',
  'app.animal.idSchemeHelp': 'その番号がどの番号付けのものか。選ぶか、自分で入力してください。',
  'app.animal.scheme.jp': '牛の個体識別番号（10桁）',
  'app.animal.scheme.earTag': '耳標',
  'app.animal.scheme.microchip': 'マイクロチップ',
  'app.animal.scheme.herdBook': '登録番号（血統登録）',
  'app.animal.scheme.usda840': 'USDA 840 / AIN耳標',
  'app.animal.scheme.breedReg': '品種協会の登録番号',
  'app.animal.species': '動物種',
  'app.animal.speciesPlaceholder': '例：牛（Bos taurus）',
  'app.animal.breed': '品種',
  'app.animal.breedPlaceholder': '例：黒毛和種',
  'app.animal.sex': '性別',
  'app.animal.sex.female': '雌',
  'app.animal.sex.male': '雄',
  'app.animal.sex.unknown': '未記入',
  'app.animal.dob': '生年月日（あなた自身のメモ）',
  'app.animal.dobHelp': 'わからなければ空欄のままにしてください。公開の日付スタンプはネットワークから付きます。',
  'app.animal.breeder': '生産者または保有者',
  'app.animal.breederPlaceholder': 'あなたの名前または農場名',
  'app.animal.more': '+ 父、母、牧場、写真、メモを追加',
  'app.animal.sire': '父',
  'app.animal.dam': '母',
  'app.animal.sireId': '父の個体識別番号',
  'app.animal.damId': '母の個体識別番号',
  'app.animal.parentHelp': '記録済みの動物を選ぶか、名前を入力してください。',
  'app.animal.parentHelpNone': '名前を入力してください。ここで記録した動物は、後で選べるようになります。',
  'app.animal.linkedId': '選んだ記録から入力されています。',
  'app.animal.herd': '牧場・農場（任意）',
  'app.animal.idShort': '番号',
  'app.animal.need.nameOrId': '必要なのは、名前または個体識別番号、動物種、生産者または保有者だけです。',
  'app.animal.need.scheme': '個体識別番号がどの番号の体系のものかを入力してください。',
  'app.animal.need.species': '動物種を入力してください。',
  'app.animal.need.breeder': '生産者または保有者を入力してください。',
  'app.animal.unsaved': '保存していない動物があります：{name}。',
  'app.animal.k.animal': '動物',
  'app.animal.k.speciesBreed': '動物種と品種',
  'app.animal.k.born': '生年月日（あなたのメモ）',
  'app.animal.notStated': '未記入',
  'app.animal.idIn': '{id}（{scheme}）',
  'app.animal.x.sire': '父：{v}',
  'app.animal.x.dam': '母：{v}',
  'app.animal.x.herd': '牧場：{v}',
  'app.animal.f.statedBirth': '生年月日（保有者の申告）',
  'app.animal.noLicensing': '動物の記録では、契約とロイヤリティはまだ使えません。',
  'app.animal.tree.sire': '父',
  'app.animal.tree.dam': '母',
  'app.animal.home.yourRecords': 'あなたの記録',
  'app.animal.verify.sireLine': '父（保有者の申告）：{v}',
  'app.animal.verify.damLine': '母（保有者の申告）：{v}',
  'app.animal.verify.idLine': '個体識別番号（保有者の申告）：{id}（{scheme}）',
  'app.animal.verify.noId': '個体識別番号は記録されていません。',
  'app.animal.v.app.verify.noParents': '父と母は記録されていません。',
  'app.animal.v.app.plant.fix.name': '動物の名前',
  'app.animal.v.app.plant.fix.bredBy': '生産者または保有者',
  'app.animal.v.app.verify.nameTyped': '動物の名前（保有者の入力どおり）：',
  'app.animal.import.dob': '生年月日',
  'app.animal.import.scheme': '番号の体系（ファイル内のすべての個体識別番号）',
  'app.animal.import.schemeHelp': '例：牛の個体識別番号（10桁）、または耳標。',
  'app.animal.import.species': '動物種（行に書かれていない場合）',
  'app.animal.import.breeder': '生産者または保有者（行に書かれていない場合）',
  'app.animal.import.pickHint': '各動物の名前か個体識別番号がある列を選び、番号の体系を入力してください。',

  'app.animal.v.app.log.reportIntro':
    '<b>任意です。</b>この動物のDNA報告書がすでにありますか？これが記録を実際の動物に結び付けます。今追加すると記録と一緒に保管されます。まだ報告書がなければスキップしてください。入手方法は動物のページに表示されます。',
  'app.animal.v.app.log.sealingPlant': '動物を封印しています…',
  'app.animal.v.app.log.sealStampsKey':
    '封印すると、動物の鍵にも日付スタンプが押されるので、後でその記録を保有していることを証明できます。送信されるのは鍵のコードだけです。',
  'app.animal.v.app.log.publicStampLater':
    '公開の日付スタンプは、バッチに{datedOn}上で日付が付いたときに付きます。それがいつかは動物のページに表示されます。あなたがすることはありません。',
  'app.animal.v.app.log.publicDateLater':
    '公開の日付は、バッチに{datedOn}上で日付が付いたときに付きます。そのとき動物のページに表示されます。',
  'app.animal.v.app.log.keyStampedAt':
    '鍵に日付スタンプを押しました：{when}。動物の鍵にも日付が付いたので、後でその記録を保有していることを証明できます。{bound}動物については何も送信されていません。',
  'app.animal.v.app.log.keyStamped':
    '鍵に日付スタンプを押しました。動物の鍵にも日付が付いたので、後でその記録を保有していることを証明できます。{bound}動物については何も送信されていません。',
  'app.animal.v.app.log.stampingTitle': '封印しました。動物の鍵に日付スタンプを押しています…',
  'app.animal.v.app.log.onlyFingerprint':
    '送信されるのは動物の鍵のコードだけで、動物については何も送信されません。無料です。ネットワーク手数料はVeilCoreが支払います。',
  'app.animal.v.app.log.stampingAria': '動物の鍵に日付スタンプを押しています',
  'app.animal.v.app.log.keepOpen':
    'この画面を開いたままにしてください（約1分）。閉じても失われるものはありません。動物は保存されており、ページでもう一度日付スタンプを押せます。',
  'app.animal.v.app.chain.stampMayHaveGoneOut':
    '日付スタンプはすでに送信されている可能性があります{tx}。動物は保存されています。そのトランザクションをネットワーク上で確認するまで、もう一度試さないでください。',
  'app.animal.v.app.chain.stampUnreachable':
    'ネットワークに接続できませんでした。動物は保存されています。{when}もう一度試すか、日付スタンプを後で行ってください。',
  'app.animal.v.app.chain.stampDidntGoThrough':
    '日付スタンプがうまくいきませんでした。動物は保存されています。{when}もう一度試すか、日付スタンプを後で行ってください。',
  'app.animal.v.app.pair.noPlant': '保存先の動物が見つかりませんでした。',
  'app.animal.v.app.pair.savedTitle': 'この動物にDNA報告書を保存しました',
  'app.animal.v.app.pair.noLabMatch':
    'この動物のラボ署名でこのファイルと一致するものはないので、あなた自身の陳述のままです。',
  'app.animal.v.app.pair.saved':
    '保存しました。DNA報告書のコードは、この報告書がこの動物のものであるというあなたの陳述として、動物の記録と一緒に保存されました。遺伝情報を確認したものではありません。{dated}',
  'app.animal.v.app.pair.title': 'この動物にDNA報告書を保存する',
  'app.animal.v.app.pair.intro':
    'DNA報告書が戻ってきましたか？この動物に保存してください。これが記録を実際の動物に結び付けます。後で新しい検査をこれと照合できます。',
  'app.animal.v.app.pair.savingTo': '保存先：<b>{name}</b> · 生産者または保有者 {by}',
  'app.animal.v.app.pair.replaces':
    '<b>この動物にはすでにDNA報告書が保存されています：「{name}」{saved}。</b>これを保存すると置き換わります。動物のページ、その証明書、あなたが共有するリンクには、古いものではなく新しいものが表示されます。お使いの端末からは何も削除されません。',
  'app.animal.v.app.pair.replacesChain':
    '<b>この動物にはすでにDNA報告書が保存されています：「{name}」{saved}。</b>これを保存すると置き換わります。動物のページ、その証明書、あなたが共有するリンクには、古いものではなく新しいものが表示されます。お使いの端末からは何も削除されません。以前の紐付けにネットワーク上で日付を付けていた場合、その日付は残ります。',
  'app.animal.v.app.pair.chain.stampFirst':
    'この検査報告書にもネットワーク上で日付を付けたい場合は、先に（動物のページから）動物の日付スタンプを押してください。',
  'app.animal.v.app.plant.notHereText':
    '別のブラウザで封印した場合は、そちらでバックアップを保存し、ここで開いてください（記録を取り戻す）。他の人の記録なら、その人から受け取った確認用リンクを開いてください。',
  'app.animal.v.app.plant.bredByName': '生産者または保有者：{name}',
  'app.animal.v.app.plant.action.saveReport': 'この動物にDNA報告書を保存する',
  'app.animal.v.app.plant.f.reportSaved': 'この動物に保存済み（{file}）· 紐付けのコード {fp}{sha}',
  'app.animal.v.app.plant.backToPlant': '動物に戻る',
  'app.animal.v.app.plant.tie.tied': '動物に結び付いています',
  'app.animal.v.app.plant.tie.notYet': 'まだ動物に結び付いていません',
  'app.animal.v.app.plant.tie.notNow': '今は動物に結び付いていません',
  'app.animal.v.app.plant.tie.openedNotSaved': '検査報告書を開きましたが、この動物には未保存です',
  'app.animal.v.app.plant.tie.sentence': '動物に結び付いています：{what}、{date}。',
  'app.animal.v.app.plant.tie.sentenceNoDate': '動物に結び付いています：{what}。',
  'app.animal.v.app.plant.tie.sentenceNone': 'まだ動物に結び付いていません：{what}。',
  'app.animal.v.app.plant.tie.sentenceNot': '今は動物に結び付いていません：{what}。',
  'app.animal.v.app.plant.tie.means':
    'DNA報告書があれば、ラボは動物の新しい検査をそれと比較できます。それだけで動物が一致することを示すものではありません。',
  'app.animal.v.app.plant.tie.sub': '報告書：{date}。ラボは動物の新しい検査をこれと比較できます。',
  'app.animal.v.app.plant.tie.why': 'ラボのDNA報告書こそが、記録を動物そのものに結び付けます。',
  'app.animal.v.app.plant.savedToPlant': 'この動物に保存済み',
  'app.animal.v.app.plant.openedNotSaved': '開きました。この動物には未保存',
  'app.animal.v.app.plant.keyStampLine':
    '鍵に日付スタンプを押しました：{when}。動物の鍵にも日付が付いたので、後でその記録を保有していることを証明できます。',
  'app.animal.v.app.plant.next.backup.why':
    'この動物の鍵は、今はこの端末にしかありません。端末が壊れたりブラウザが消去されたりすると、あなたがその記録を保有していることを誰も証明できなくなります。保存は1分で済みます。',
  'app.animal.v.app.plant.next.corrected.why':
    'ラボが、この動物に保存されたDNA報告書を差し替えました。訂正版を保存するまで、動物のページ、証明書、リンクには、保存済みのものが差し替えられたと表示されます。',
  'app.animal.v.app.plant.next.labWithdrew.whyNewer':
    'この動物には保存されたままで、証明書とリンクには撤回されたと表示されます。新しい検査報告書が届いています。開いて、代わりにそれを保存してください。',
  'app.animal.v.app.plant.next.labWithdrew.why':
    'この動物には保存されたままで、証明書とリンクには撤回されたと表示されます。新しいものをラボに依頼してください。',
  'app.animal.v.app.plant.next.open.why':
    'この動物の鍵で、あなただけが開けるようにロックされています。開くと、ここでラボの署名を確認します。',
  'app.animal.v.app.plant.next.sample.whySaved':
    'この動物にDNA報告書を保存しました。これはあなた自身の陳述です。ラボがサンプルを受け取ったことに署名すると第三者が加わり、あなたの陳述だけよりも強い証拠になります。',
  'app.animal.v.app.plant.next.sample.why':
    '今のところ、この記録はあなた自身による動物の説明です。ラボがサンプルを受け取ったことに署名し、検査報告書を送り返すと、あなたの説明だけよりも強い証拠になります。',
  'app.animal.v.app.plant.next.dna.title': 'この動物のDNA報告書を取得する',
  'app.animal.v.app.plant.next.dna.why':
    '日付の付いた記録は、説明が存在したことを示します。記録を実際の動物に結び付けるのは、DNA報告書（ラボが作る動物の遺伝的なプロファイル）です。入手する方法は2つあります：',
  'app.animal.v.app.plant.next.dna.haveText':
    'この動物に保存してください。お使いの端末で読み込み、ファイルはアップロードされません。',
  'app.animal.v.app.plant.next.date.why':
    'この動物に保存されていますが、まだ日付がありません。日付を付けると、その日付までに報告書が存在したことを、マーカーを誰にも見せずに示せます。',
  'app.animal.v.app.plant.next.save.title': 'DNA報告書をこの動物に保存する',
  'app.animal.v.app.plant.next.save.why':
    'ラボがサンプルを受け取ったことに署名しました。DNA報告書が戻ってきたらこの動物に保存してください。それが記録を動物に結び付け、後の検査と比較できるようにします。',
  'app.animal.v.app.plant.next.save.action': 'この動物に保存する',
  'app.animal.v.app.plant.next.ready.why':
    'ラボがサンプルを受け取ったことに署名し、DNA報告書がこの動物に保存されています。動物の記録では、契約とロイヤリティはまだ使えません。',
  'app.animal.v.app.plant.tree.none': 'まだ父と母が記録されていません。',
  'app.animal.v.app.plant.anchor.keysNotHere':
    'この動物の鍵はこのブラウザにありません。バックアップファイルから取り戻してください。新しい鍵は、封印された記録と一致しません。',
  'app.animal.v.app.plant.bundle.keyIs':
    '（記録の鍵とは、封印したときにこの動物のために作った鍵の公開IDです。秘密の部分はバックアップに残り、バンドルには決して入りません。）',
  'app.animal.v.app.plant.bundle.checkedAgainst': '入れる前に、この動物に保存されたものと照合します。',
  'app.animal.v.app.plant.cert.intro':
    '保管用や弁護士向けに：封印された記録、変更されていないことの最新の確認、アンカーされているか、DNA報告書で動物に結び付いているか、ラボの受領書をまとめます。記録の詳細は入りますが、遺伝データやラボのファイルは入りません。QRコードで記録の公開確認ページが開きます。',
  'app.animal.v.app.plant.att.noReceipt':
    'この動物の受領書に署名したラボはまだありません。あなただけが裏付ける記録は、ラボが署名した記録より弱い証拠です。サンプルをラボに送ってください。受領書はあなたではなくラボの鍵で署名されます。',
  'app.animal.v.app.verify.field.parent-names': '父と母（名前と番号）',
  'app.animal.v.app.verify.alwaysShown':
    '常に表示されるもの：記録ID、その証明コード（{fp}）、レジストリが最初に保存した日時、そしてバッチと署名付きの証明（ラボの受領書、検査報告書）についてこのページが確認できたこと。動物の名前は、リンクに含まれている場合（外さない限り、あなたのリンクには含まれます）か、表示を選んだ場合だけ表示されます。',
  'app.animal.v.app.verify.ownReceiptTail':
    'これが見えるのは、動物がこのブラウザにあるからです。リンクを送った相手には、上の署名の行だけが見えます。',
  'app.animal.v.app.prove.openCheckPage': '動物の確認ページを開く',
  'app.animal.v.app.prove.doneText':
    '相手のページに答えが表示されます。動物については何も送信されていません。送ったのは、あなたがその記録を保有していることの証明だけです。',
  'app.animal.v.app.prove.thePlant': 'その動物',
  'app.animal.v.app.prove.thisPlant': 'この動物',
  'app.animal.v.app.prove.whatSends':
    '<b>送信される内容：</b>この動物の記録を保有していることの証明だけで、テストネットワークに載せます。名前も、遺伝情報も、ほかの記録についても送りません。',
  'app.animal.v.app.prove.answering':
    '答えると、このリンクを送った人に、あなたがこの動物の記録を保有していることが伝わります。',
  'app.animal.v.app.prove.watch.notWho': '相手が誰か、誰がこの動物を生産したかは示しません。',
  'app.animal.v.app.prove.watch.holderStatement':
    'この鍵がこの動物の記録のものだというのは、今のところ保有者の陳述です。相手が誰か、誰がこの動物を生産したかは示しません。',
  'app.animal.v.app.prove.watch.stampedYour':
    'あなたの動物の鍵には{when}に日付スタンプが押されました。日付が付くのは鍵で、記録ではありません。',
  'app.animal.v.app.prove.watch.stampedThisEarlier':
    'この動物の鍵には、以前ネットワーク上で日付スタンプが押されました。日付が付くのは鍵で、記録ではありません。',
  'app.animal.v.app.prove.own.title': 'この動物の鍵を保有していることを証明する（テストネットワーク）',
  'app.animal.v.app.prove.own.stampFirst':
    '先に保有の証明を準備してください。動物のページで「保有の証明を準備する」を押します。証明の対象は動物の記録のチェーン上のIDで、それはこの手順で作られます。',
  // The lab report panels, a delivery and the saved report's sentence, for an animal.
  'app.animal.v.app.lab.sentence.none': 'この動物にはDNA報告書が保存されていません。',
  'app.animal.v.app.lab.sentence.self':
    'この動物にはDNA報告書のファイルが保存されています。一致するラボの署名はないため、保有者自身の陳述です。',
  'app.animal.v.app.lab.sentence.replaced':
    'この動物に保存されたDNA報告書は、ラボにより訂正版に差し替えられました{on}。{tail}',
  'app.animal.v.app.lab.sentence.withdrawn': 'この動物に保存されたDNA報告書は、ラボにより撤回されました{on}。{tail}',
  'app.animal.v.app.lab.results.replacedNewer':
    '<b>この動物に保存されたDNA報告書は、ラボにより差し替えられました。</b>訂正版を保存してください。開いて「この動物に保存する」をタップします。',
  'app.animal.v.app.lab.results.replacedNone':
    '<b>この動物に保存されたDNA報告書は、ラボにより差し替えられました。</b>{lab}からの現在の報告書はありません。元の報告書は差し替えられ、訂正版は撤回されました。',
  'app.animal.v.app.lab.results.withdrawn':
    '<b>この動物に保存された検査報告書は、ラボにより撤回されました。</b>別のものを保存するまで保存されたままで、証明書とリンクには撤回されたと表示されます。',
  'app.animal.v.app.lab.results.withdrawnNewer':
    '<b>この動物に保存された検査報告書は、ラボにより撤回されました。</b>別のものを保存するまで保存されたままで、証明書とリンクには撤回されたと表示されます。新しい検査報告書が届いています。開いて、この動物に保存してください。',
  'app.animal.v.app.lab.results.locked':
    'バックアップにあるこの動物の鍵で、あなただけが開けるようにロックされています。VeilCoreはロックしたまま保存し、鍵を持っていません。',
  'app.animal.v.app.lab.results.noKey':
    'この動物の鍵はこの端末にないため、ここでは検査報告書を開けません。先に<link>バックアップから記録を取り戻してください</link>。',
  'app.animal.v.app.lab.results.whatOthersSee':
    '<b>他の人に見えるもの。</b>ラボの署名は公開されますが、報告書は公開されません。この動物の確認ページへのリンクを持つ人には、この動物についての検査報告書が署名されたこと、報告書ファイルのSHA-256、ラボの鍵が登録されている名前が見えます。名前には、VeilCoreの運営者が公開のライセンスや認定のリストと照合していない限り「名前は未確認」と表示されます。報告書をこの動物に保存し、「誰かに見せる」で「DNA報告書が保存されているか」を共有すると、保存したファイルが一致することも見えます。',
  'app.animal.v.app.lab.results.nothingYet':
    'まだありません。この動物のサンプルを送ったラボが検査報告書を送ると、ここに表示されます。',
  'app.animal.v.app.lab.results.savedHere': ' · この動物に保存済み',
  'app.animal.v.app.lab.results.stillSaved': '。この動物には保存されたままです。',
  'app.animal.v.app.lab.results.replacesSaved':
    'この動物にはすでに検査報告書が保存されています。これを保存すると置き換わります。次の画面で確認します。',
  'app.animal.v.app.lab.send.nothingYet':
    'まだ何も変わっていません。相手がコードを入力するまで、動物のページには「待機中」と表示され、このコードをもう一度表示できます。相手はVeilCoreのホームの入力欄に貼り付けます。',
  'app.animal.v.app.lab.send.takenFromHelp': '動物の個体識別番号、またはサンプルを採取した場所。',
} satisfies Partial<AppTranslation>;
