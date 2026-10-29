// A strain or line record's sentences: each is this language's plant sentence for the same key,
// the plant noun replaced by one of the same gender (de Linie, es cepa, fr souche, ja 系統).
// DRAFT: to be checked by a fluent speaker before publishing (docs/translations/README.md).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const strain = {
  'app.strain.v.app.verify.noParents': '親は記録されていません。',
  'app.strain.v.app.plant.fix.name': '系統名',
  'app.strain.v.app.plant.fix.bredBy': '作出・分離した人',
  'app.strain.v.app.verify.namePublished': '保有者が表示している名前：',
  'app.strain.v.app.verify.nameMatches': '名前は記録と一致します：',
  'app.strain.v.app.verify.nameUnchecked': 'このリンクにある名前（確認していません）：',
  'app.strain.v.app.log.reportIntro':
    '<b>任意です。</b>この系統のDNA報告書がすでにありますか？これが記録を実際の系統に結び付けます。今追加すると記録と一緒に保管されます。まだ報告書がなければスキップしてください。入手方法は系統のページに表示されます。',
  'app.strain.v.app.log.sealingPlant': '系統を封印しています…',
  'app.strain.v.app.log.sealStampsKey':
    '封印すると、系統の鍵にも日付スタンプが押されるので、後で保有していることを証明できます。送信されるのは鍵のコードだけです。',
  'app.strain.v.app.log.publicStampLater':
    '公開の日付スタンプは、バッチに{datedOn}上で日付が付いたときに付きます。それがいつかは系統のページに表示されます。あなたがすることはありません。',
  'app.strain.v.app.log.publicDateLater':
    '公開の日付は、バッチに{datedOn}上で日付が付いたときに付きます。そのとき系統のページに表示されます。',
  'app.strain.v.app.log.keyStampedAt':
    '鍵に日付スタンプを押しました：{when}。系統の鍵にも日付が付いたので、後で保有していることを証明できます。{bound}系統については何も送信されていません。',
  'app.strain.v.app.log.keyStamped':
    '鍵に日付スタンプを押しました。系統の鍵にも日付が付いたので、後で保有していることを証明できます。{bound}系統については何も送信されていません。',
  'app.strain.v.app.log.stampingTitle': '封印しました。系統の鍵に日付スタンプを押しています…',
  'app.strain.v.app.log.onlyFingerprint':
    '送信されるのは系統の鍵のコードだけで、系統については何も送信されません。無料です。ネットワーク手数料はVeilCoreが支払います。',
  'app.strain.v.app.log.stampingAria': '系統の鍵に日付スタンプを押しています',
  'app.strain.v.app.log.keepOpen':
    'この画面を開いたままにしてください（約1分）。閉じても失われるものはありません。系統は保存されており、ページでもう一度日付スタンプを押せます。',
  'app.strain.v.app.chain.stampMayHaveGoneOut':
    '日付スタンプはすでに送信されている可能性があります{tx}。系統は保存されています。そのトランザクションをネットワーク上で確認するまで、もう一度試さないでください。',
  'app.strain.v.app.chain.stampUnreachable':
    'ネットワークに接続できませんでした。系統は保存されています。{when}もう一度試すか、日付スタンプを後で行ってください。',
  'app.strain.v.app.chain.stampDidntGoThrough':
    '日付スタンプがうまくいきませんでした。系統は保存されています。{when}もう一度試すか、日付スタンプを後で行ってください。',
  'app.strain.v.app.pair.noPlant': '保存先の系統が見つかりませんでした。',
  'app.strain.v.app.pair.savedTitle': 'この系統にDNA報告書を保存しました',
  'app.strain.v.app.pair.noLabMatch':
    'この系統のラボ署名でこのファイルと一致するものはないので、あなた自身の陳述のままです。',
  'app.strain.v.app.pair.saved':
    '保存しました。DNA報告書のコードは、この報告書がこの系統のものであるというあなたの陳述として、系統の記録と一緒に保存されました。遺伝情報を確認したものではありません。{dated}',
  'app.strain.v.app.pair.title': 'この系統にDNA報告書を保存する',
  'app.strain.v.app.pair.intro':
    'DNA報告書が戻ってきましたか？この系統に保存してください。これが記録を実際の系統に結び付けます。後で新しい検査をこれと照合できます。',
  'app.strain.v.app.pair.savingTo': '保存先：<b>{name}</b> · 作出者・分離者 {by}',
  'app.strain.v.app.pair.replaces':
    '<b>この系統にはすでにDNA報告書が保存されています：「{name}」{saved}。</b>これを保存すると置き換わります。系統のページ、その証明書、あなたが共有するリンクには、古いものではなく新しいものが表示されます。お使いの端末からは何も削除されません。',
  'app.strain.v.app.pair.replacesChain':
    '<b>この系統にはすでにDNA報告書が保存されています：「{name}」{saved}。</b>これを保存すると置き換わります。系統のページ、その証明書、あなたが共有するリンクには、古いものではなく新しいものが表示されます。お使いの端末からは何も削除されません。以前の紐付けにネットワーク上で日付を付けていた場合、その日付は残ります。',
  'app.strain.v.app.pair.chain.stampFirst':
    'この検査報告書にもネットワーク上で日付を付けたい場合は、先に（系統のページから）系統の日付スタンプを押してください。',
  'app.strain.v.app.plant.notHereText':
    '別のブラウザで封印した場合は、そちらでバックアップを保存し、ここで開いてください（系統を取り戻す）。他の人の記録なら、その人から受け取った確認用リンクを開いてください。',
  'app.strain.v.app.plant.bredByName': '作出・分離：{name}',
  'app.strain.v.app.plant.action.saveReport': 'この系統にDNA報告書を保存する',
  'app.strain.v.app.plant.f.reportSaved': 'この系統に保存済み（{file}）· 紐付けのコード {fp}{sha}',
  'app.strain.v.app.plant.backToPlant': '系統に戻る',
  'app.strain.v.app.plant.tie.tied': '系統に結び付いています',
  'app.strain.v.app.plant.tie.notYet': 'まだ系統に結び付いていません',
  'app.strain.v.app.plant.tie.notNow': '今は系統に結び付いていません',
  'app.strain.v.app.plant.tie.openedNotSaved': '検査報告書を開きましたが、この系統には未保存です',
  'app.strain.v.app.plant.tie.sentence': '系統に結び付いています：{what}、{date}。',
  'app.strain.v.app.plant.tie.sentenceNoDate': '系統に結び付いています：{what}。',
  'app.strain.v.app.plant.tie.sentenceNone': 'まだ系統に結び付いていません：{what}。',
  'app.strain.v.app.plant.tie.sentenceNot': '今は系統に結び付いていません：{what}。',
  'app.strain.v.app.plant.tie.means':
    'DNA報告書があれば、ラボは系統の新しい検査をそれと比較できます。それだけで系統が一致することを示すものではありません。',
  'app.strain.v.app.plant.tie.sub': '報告書：{date}。ラボは系統の新しい検査をこれと比較できます。',
  'app.strain.v.app.plant.tie.why': 'ラボのDNA報告書こそが、記録を系統そのものに結び付けます。',
  'app.strain.v.app.plant.savedToPlant': 'この系統に保存済み',
  'app.strain.v.app.plant.openedNotSaved': '開きました。この系統には未保存',
  'app.strain.v.app.plant.keyStampLine':
    '鍵に日付スタンプを押しました：{when}。系統の鍵にも日付が付いたので、後で保有していることを証明できます。',
  'app.strain.v.app.plant.next.backup.why':
    'この系統の鍵は、今はこの端末にしかありません。端末が壊れたりブラウザが消去されたりすると、あなたが保有していることを誰も証明できなくなります。保存は1分で済みます。',
  'app.strain.v.app.plant.next.corrected.why':
    'ラボが、この系統に保存されたDNA報告書を差し替えました。訂正版を保存するまで、系統のページ、証明書、リンクには、保存済みのものが差し替えられたと表示されます。',
  'app.strain.v.app.plant.next.labWithdrew.whyNewer':
    'この系統には保存されたままで、証明書とリンクには撤回されたと表示されます。新しい検査報告書が届いています。開いて、代わりにそれを保存してください。',
  'app.strain.v.app.plant.next.labWithdrew.why':
    'この系統には保存されたままで、証明書とリンクには撤回されたと表示されます。新しいものをラボに依頼してください。',
  'app.strain.v.app.plant.next.open.why':
    'この系統の鍵で、あなただけが開けるようにロックされています。開くと、ここでラボの署名を確認します。',
  'app.strain.v.app.plant.next.sample.whySaved':
    'この系統にDNA報告書を保存しました。これはあなた自身の陳述です。ラボがサンプルを受け取ったことに署名すると第三者が加わり、あなたの陳述だけよりも強い証拠になります。',
  'app.strain.v.app.plant.next.sample.why':
    '今のところ、この記録はあなた自身による系統の説明です。ラボがサンプルを受け取ったことに署名し、検査報告書を送り返すと、あなたの説明だけよりも強い証拠になります。',
  'app.strain.v.app.plant.next.dna.title': 'この系統のDNA報告書を取得する',
  'app.strain.v.app.plant.next.dna.why':
    '日付の付いた記録は、説明が存在したことを示します。記録を実際の系統に結び付けるのは、DNA報告書（ラボが作る系統のDNAフィンガープリント）です。入手する方法は2つあります：',
  'app.strain.v.app.plant.next.dna.haveText':
    'この系統に保存してください。お使いの端末で読み込み、ファイルはアップロードされません。',
  'app.strain.v.app.plant.next.date.why':
    'この系統に保存されていますが、まだ日付がありません。日付を付けると、その日付までに報告書が存在したことを、マーカーを誰にも見せずに示せます。',
  'app.strain.v.app.plant.next.save.title': 'DNA報告書をこの系統に保存する',
  'app.strain.v.app.plant.next.save.why':
    'ラボがサンプルを受け取ったことに署名しました。DNA報告書が戻ってきたらこの系統に保存してください。それが記録を系統に結び付け、後の検査と比較できるようにします。',
  'app.strain.v.app.plant.next.save.action': 'この系統に保存する',
  'app.strain.v.app.plant.next.ready.why':
    'ラボがサンプルを受け取ったことに署名し、DNA報告書がこの株に保存されています。素材を送ることも、ライセンスを出すこともできます。条件はこの記録から派生したと申告された株に適用されます。',
  'app.strain.v.app.plant.tree.none': 'まだ系統が記録されていません。記録するときに親株を加えると、系統図ができます。',
  'app.strain.v.app.plant.anchor.keysNotHere':
    'この系統の鍵はこのブラウザにありません。バックアップファイルから取り戻してください。新しい鍵は、封印された記録と一致しません。',
  'app.strain.v.app.plant.bundle.keyIs':
    '（記録の鍵とは、封印したときにこの系統のために作った鍵の公開IDです。秘密の部分はバックアップに残り、バンドルには決して入りません。）',
  'app.strain.v.app.plant.bundle.checkedAgainst': '入れる前に、この系統に保存されたものと照合します。',
  'app.strain.v.app.plant.cert.intro':
    '保管用や弁護士向けに：封印された記録、変更されていないことの最新の確認、アンカーされているか、DNA報告書で系統に結び付いているか、ラボの受領書、有効なライセンスをまとめます。記録の詳細は入りますが、遺伝データやラボのファイルは入りません。QRコードで記録の公開確認ページが開きます。',
  'app.strain.v.app.plant.att.noReceipt':
    'この系統の受領書に署名したラボはまだありません。あなただけが裏付ける記録は、ラボが署名した記録より弱い証拠です。サンプルをラボに送ってください。受領書はあなたではなくラボの鍵で署名されます。',
  'app.strain.v.app.verify.field.parent-names': '親系統（名前と寄託番号）',
  'app.strain.v.app.verify.alwaysShown':
    '常に表示されるもの：記録ID、その証明コード（{fp}）、レジストリが最初に保存した日時、そしてバッチと署名付きの証明（ラボの受領書、検査報告書）についてこのページが確認できたこと。名前は、リンクに含まれている場合（あなたのリンクに含まれるのは、そう選んだときだけです）か、表示を選んだ場合だけ表示されます。',
  'app.strain.v.app.verify.ownReceiptTail':
    'これが見えるのは、系統がこのブラウザにあるからです。リンクを送った相手には、上の署名の行だけが見えます。',
  'app.strain.v.app.prove.openCheckPage': '系統の確認ページを開く',
  'app.strain.v.app.prove.doneText':
    '相手のページに答えが表示されます。系統については何も送信されていません。送ったのは、あなたがその記録を保有していることの証明だけです。',
  'app.strain.v.app.prove.thePlant': 'その系統',
  'app.strain.v.app.prove.thisPlant': 'この系統',
  'app.strain.v.app.prove.whatSends':
    '<b>送信される内容：</b>この系統の記録を保有していることの証明だけで、テストネットワークに載せます。名前も、遺伝情報も、ほかの系統についても送りません。',
  'app.strain.v.app.prove.answering':
    '答えると、このリンクを送った人に、あなたがこの系統の記録を保有していることが伝わります。',
  'app.strain.v.app.prove.watch.notWho': '相手が誰か、誰がこの系統を作出・分離したかは示しません。',
  'app.strain.v.app.prove.watch.holderStatement':
    'この鍵がこの系統の記録のものだというのは、今のところ保有者の陳述です。相手が誰か、誰がこの系統を作出・分離したかは示しません。',
  'app.strain.v.app.prove.watch.stampedYour':
    'あなたの系統の鍵には{when}に日付スタンプが押されました。日付が付くのは鍵で、記録ではありません。',
  'app.strain.v.app.prove.watch.stampedThisEarlier':
    'この系統の鍵には、以前ネットワーク上で日付スタンプが押されました。日付が付くのは鍵で、記録ではありません。',
  'app.strain.v.app.prove.own.title': 'この系統の鍵を保有していることを証明する（テストネットワーク）',
  'app.strain.v.app.prove.own.stampFirst':
    '先に保有の証明を準備してください。系統のページで「保有の証明を準備する」を押します。証明の対象は系統のチェーン上のIDで、それはこの手順で作られます。',
  'app.strain.v.app.lab.sentence.none': 'この系統にはDNA報告書が保存されていません。',
  'app.strain.v.app.lab.sentence.self':
    'この系統にはDNA報告書のファイルが保存されています。一致するラボの署名はないため、保有者自身の陳述です。',
  'app.strain.v.app.lab.sentence.replaced':
    'この系統に保存されたDNA報告書は、ラボにより訂正版に差し替えられました{on}。{tail}',
  'app.strain.v.app.lab.sentence.withdrawn': 'この系統に保存されたDNA報告書は、ラボにより撤回されました{on}。{tail}',
  'app.strain.v.app.lab.results.replacedNewer':
    '<b>この系統に保存されたDNA報告書は、ラボにより差し替えられました。</b>訂正版を保存してください。開いて「この系統に保存する」をタップします。',
  'app.strain.v.app.lab.results.replacedNone':
    '<b>この系統に保存されたDNA報告書は、ラボにより差し替えられました。</b>{lab}からの現在の報告書はありません。元の報告書は差し替えられ、訂正版は撤回されました。',
  'app.strain.v.app.lab.results.withdrawn':
    '<b>この系統に保存された検査報告書は、ラボにより撤回されました。</b>別のものを保存するまで保存されたままで、証明書とリンクには撤回されたと表示されます。',
  'app.strain.v.app.lab.results.withdrawnNewer':
    '<b>この系統に保存された検査報告書は、ラボにより撤回されました。</b>別のものを保存するまで保存されたままで、証明書とリンクには撤回されたと表示されます。新しい検査報告書が届いています。開いて、この系統に保存してください。',
  'app.strain.v.app.lab.results.locked':
    'バックアップにあるこの系統の鍵で、あなただけが開けるようにロックされています。VeilCoreはロックしたまま保存し、鍵を持っていません。',
  'app.strain.v.app.lab.results.noKey':
    'この系統の鍵はこの端末にないため、ここでは検査報告書を開けません。先に<link>バックアップから系統を取り戻してください</link>。',
  'app.strain.v.app.lab.results.whatOthersSee':
    '<b>他の人に見えるもの。</b>ラボの署名は公開されますが、報告書は公開されません。この系統の確認ページへのリンクを持つ人には、この系統についての検査報告書が署名されたこと、報告書ファイルのSHA-256、ラボの鍵が登録されている名前が見えます。名前には、VeilCoreの運営者が公開のライセンスや認定のリストと照合していない限り「名前は未確認」と表示されます。報告書をこの系統に保存し、「誰かに見せる」で「DNA報告書が保存されているか」を共有すると、保存したファイルが一致することも見えます。',
  'app.strain.v.app.lab.results.nothingYet':
    'まだありません。この系統を送ったラボが検査報告書を送ると、ここに表示されます。',
  'app.strain.v.app.lab.results.savedHere': ' · この系統に保存済み',
  'app.strain.v.app.lab.results.stillSaved': '。この系統には保存されたままです。',
  'app.strain.v.app.lab.results.replacesSaved':
    'この系統にはすでに検査報告書が保存されています。これを保存すると置き換わります。次の画面で確認します。',
  'app.strain.v.app.lab.send.nothingYet':
    'まだ何も変わっていません。相手がコードを入力するまで、系統のページには「待機中」と表示され、このコードをもう一度表示できます。相手はVeilCoreのホームの入力欄に貼り付けます。',
  'app.strain.v.app.lab.send.takenFromHelp': '母株、またはその場所のタグ。',
  // What a strain is made by, not bred by (strain-words.test).
  'app.strain.v.app.plant.f.method': '作出方法',
  'app.strain.v.app.plant.f.statedDate': '作出日・分離日（保有者の申告）',
  'app.strain.v.app.plant.fix.field.cultivarName': '菌株名',
  'app.strain.v.app.plant.fix.field.breederName': '作出者・分離者',
  'app.strain.v.app.plant.fix.field.breedingMethod': '作出方法',
  'app.strain.v.app.verify.field.breeding-method': '作出方法',
  'app.strain.v.app.verify.field.bred-by': '作出者・分離者',
  'app.strain.v.app.verify.method': '作出方法（保有者の記載）：{method}',
  'app.strain.v.app.verify.noMethod': '作出方法の記録はありません。',
  'app.strain.v.app.verify.bredByShared': '作出者・分離者（保有者の記載）：{name}',
  'app.strain.v.app.verify.noBredBy': '作出者・分離者の記録はありません。',
  'app.strain.v.app.lic.row.offspring': '派生株へのロイヤリティ',
  'app.strain.v.app.lic.row.offspringValue': '{pct}%（この株から派生したと申告された株に対して）',
  'app.strain.v.app.lic.f.offspring': '派生株へのロイヤリティ（%）',
  'app.strain.v.app.lic.f.offspringHelp':
    'この記録から派生したと申告された株（この記録を親として記録され、双方の保有者が確認したもの）に適用されます。申告されない派生は検出されません。なければ空欄にしてください。',
  'app.strain.v.app.lic.f.extraHelpDeal':
    '取引に含まれるその他のことを、あなた自身の言葉で。例: 第三者への提供禁止、論文で出所を明記、終了時に残りの株を廃棄。',
  'app.strain.v.app.lic.detail.thisCultivar': 'この株',
  'app.strain.v.app.lic.detail.lineage':
    'のちに{name}を親として株が記録され、双方の保有者が確認すると、その記録にこの契約へのつながりが表示されます。誰も記録しない派生株は検出されません。',
  'app.strain.v.app.lic.detail.derivatives.other': '記録済みの{count}株がこの株から派生しています。',
  'app.strain.v.app.lic.off.title': '派生株へのロイヤリティ: {pct}%',
  'app.strain.v.app.lic.off.intro':
    'Midnight上では、この株についてのライセンシー自身の記録に付きます。そのため、双方の保有者が確認した派生株はすべて、誰かが系譜を確認するときにこれを表示します。ライセンシーが受け入れ、解除できるのはライセンサーだけです。',
  'app.strain.v.app.lic.off.dateFirst':
    'まずこの株についてのあなた自身の記録を日付記録し、それからここで指定してください。',
  'app.strain.v.app.lic.off.datePlant': '記録を日付記録する',
  'app.strain.v.app.lic.off.yourRecord': 'この株についてのあなたの記録',
  'app.strain.v.app.lic.off.waitName': '相手がこの株の記録を指定するのを待っています。',
} satisfies Partial<AppTranslation>;
