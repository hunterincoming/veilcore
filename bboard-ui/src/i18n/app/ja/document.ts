// The record app in Japanese: document records (../en/document.ts). DRAFT: machine-assisted,
// to be checked by a fluent speaker before publishing (docs/translations/README.md).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const document = {
  'app.doc.orDocument': '書類を封印しますか？許可証、分析証明書、契約書、輸送書類など。',
  'app.doc.orDocumentAction': '書類を封印する',
  'app.doc.new.title': '書類を封印する',
  'app.doc.new.intro':
    'ファイルを選んでください。ファイルはこの端末から出ません。封印されるのは、内容から計算したコード、名前、サイズだけで、誰にも過去にずらせない日付が付きます。ファイルが1文字でも変わると、コードは一致しなくなります。',
  'app.doc.new.proves':
    'これで示せること：まったく同じバイトのファイルが、封印された日付までにあなたの手元にあったこと。書類が本物であること、発行者が発行したこと、内容が正しいことは示しません。',
  'app.doc.f.files': 'ファイル',
  'app.doc.f.filesHelp': '{max}件まで：契約書とその付属書、分析証明書とそのクロマトグラムなど。',
  'app.doc.f.add': 'ファイルを追加',
  'app.doc.f.addMore': '別のファイルを追加',
  'app.doc.f.reading': '{name}を読み込み中…',
  'app.doc.f.tooLarge': '{name}は{mb}MBを超えるため、ここでは読み込めません。',
  'app.doc.f.duplicate': '{name}は、すでに追加したファイルと同じです。',
  'app.doc.f.full': '{max}件です。1つの書類に付けられる上限です。',
  'app.doc.f.remove': '{name}を外す',
  'app.doc.f.title': 'タイトル',
  'app.doc.f.titleHelp': 'あなたが呼ぶ名前：「輸送書類0042」「分析証明書ロット7」など。',
  'app.doc.f.type': '種類',
  'app.doc.f.issuer': '発行者（任意）',
  'app.doc.f.issuerHelp': '書類に書かれているとおりに。これはあなたの申告で、相手が発行したことは示しません。',
  'app.doc.f.reference': '参照番号（任意）',
  'app.doc.f.referenceHelp': '許可番号、請求書番号、ロットなど。',
  'app.doc.f.issued': '書類の日付（任意）',
  'app.doc.f.about': '対象（任意）',
  'app.doc.f.aboutHelp': '関係するあなたの記録：分析証明書なら検査した植物など。',
  'app.doc.f.aboutNone': 'なし',
  'app.doc.f.holder': '保有者',
  'app.doc.f.holderHelp': 'あなた、またはあなたの組織。',
  'app.doc.f.notes': 'メモ（任意）',
  'app.doc.need.file': 'まずファイルを追加してください。',
  'app.doc.need.title': 'タイトルを付けてください。',
  'app.doc.need.holder': '保有者を入力してください。',
  'app.doc.need.heading': '封印する前に、まだ必要なもの：',
  'app.doc.seal': '封印する',
  'app.doc.sealing': '封印中…',
  'app.doc.type.permit': '許可証・免許',
  'app.doc.type.certificate-of-analysis': '分析証明書（COA）',
  'app.doc.type.lab-report': '検査報告書',
  'app.doc.type.contract': '契約書・合意書',
  'app.doc.type.protocol': '手順書・SOP',
  'app.doc.type.transport': '輸送・出荷書類',
  'app.doc.type.invoice': '請求書・領収書',
  'app.doc.type.other': '議事録・決議書・その他',
  'app.doc.kind': '書類',
  'app.doc.homeLine': '書類 · {type}',
  'app.doc.k.type': '種類',
  'app.doc.k.issuer': '発行者（あなたの申告）',
  'app.doc.k.issuerHolder': '発行者（保有者の申告）',
  'app.doc.k.reference': '参照番号',
  'app.doc.k.issued': '書類の日付',
  'app.doc.k.files': 'ファイル',
  'app.doc.k.about': '対象',
  'app.doc.k.holder': '保有者',
  'app.doc.k.notes': 'メモ',
  'app.doc.k.sealed': '封印日時（この端末の時計）',
  'app.doc.k.dated': 'Midnight上の日付',
  'app.doc.k.proofCode': '証明コード',
  'app.doc.fileSize': '{size}バイト',
  'app.doc.share.title': 'このファイルを保有していたことを証明する',
  'app.doc.share.text':
    '相手にファイルとこのリンクを送ってください。相手のブラウザが、そのファイルがここで封印したものとバイト単位で同じか、いつ日付が付いたかを確認します。何もアップロードされず、答えはVeilCoreの言い分に頼りません。',
  'app.doc.share.warn':
    'リンクを持つ人には、この書類の記録の内容がすべて見えます：タイトル、種類、発行者、参照番号、日付、各ファイルの名前とSHA-256、対象の記録の名前、メモ。ファイルそのものは含まれません。',
  'app.doc.share.copy': 'リンクをコピー：このファイルを保有していたことの証明',
  'app.doc.share.notDatedYet':
    'まだ日付がありません。今このリンクを開いた人には、まだ頼らないよう注意が表示されます。このページに日付が表示されてから送ってください。',
  'app.doc.share.copied': 'コピーしました。',
  'app.doc.compare.title': '同じファイルですか？',
  'app.doc.compare.text': 'ここで封印したファイルと比べるファイルを選んでください。アップロードはされません。',
  'app.doc.compare.pick': 'ファイルを選ぶ',
  'app.doc.compare.match': '<b>{name}</b>は、ここで封印した{sealed}とバイト単位で同じです。',
  'app.doc.compare.matchSame': '<b>{name}</b>は、ここで封印したファイルとバイト単位で同じです。',
  'app.doc.compare.noMatch':
    '<b>一致しません。</b>{name}は封印されたファイルではありません。保存し直す、PDFとして印刷する、一部のアプリで送ると、ファイルは変わります。元のファイルを送ってもらってください。',
  'app.doc.new.introTech': '技術的には、このコードはファイルのSHA-256です。',
  'app.doc.backupFirst':
    '封印しました。続けてバックアップを保存し、確認してください。それまでは、この記録の鍵はこのブラウザにしかなく、VeilCoreもまだこの記録の写しを預かっていません。このブラウザの鍵を含むバックアップを確認するまで、毎回表示されます。',
  'app.doc.notBacked':
    'まだ確認済みのバックアップに入っていません。それまでは、この記録の鍵はこのブラウザにしかありません。',
  'app.doc.tech.title': '技術的な詳細',
  'app.doc.tech.text':
    'この書類の日付には必要ありません。この記録の鍵にMidnightで日付スタンプを付けておくと、求められたときに、この記録を今も保有していることを後から示せます。',
  'app.doc.home.sealedOn': '{date} に封印',
  'app.doc.home.dated': '{date}付',
  'app.doc.home.waiting': '日付待ち',
  'app.doc.home.datedReported': '{date}付（VeilCoreの報告）',
  'app.doc.home.checkingDate': '日付の報告あり・確認中',
  'app.doc.home.notConfirmed': 'Midnightで日付を確認できません',
  'app.doc.compare.tooLarge': 'そのファイルは{mb}MBを超えるため、ここでは読み込めません。',
  'app.doc.check.title': '書類を確認する',
  'app.doc.check.intro':
    '誰かから書類とこのリンクが届きました。届いたファイルを選んでください。あなたのブラウザが1バイト単位で同じファイルかを確かめ（何もアップロードされません）、公開ブロックチェーンであるMidnight上の日付を表示し、可能な場合はその場で確認します。',
  'app.doc.check.missing': 'このリンクには書類の記録が入っていません。送った人にリンク全体を頼んでください。',
  'app.doc.check.unreadable': 'このリンクは壊れています。もう一度送ってもらってください。',
  'app.doc.check.notDoc': 'このリンクの中身は、ここで確認できる書類の記録ではありません。',
  'app.doc.check.recomputed': '証明コード（リンクからここで計算し直したもの）',
  'app.doc.check.registryOnly':
    'VeilCoreの登録簿はこの日付を示しています。このページではMidnight上で確認できないため、現時点ではVeilCoreの報告のみに基づいています。',
  'app.doc.check.notConfirmed':
    'VeilCoreの登録簿はこの日付を示していますが、このページでは現時点でMidnight上で確認できませんでした。数分後にもう一度確認してから頼るようにしてください。',
  'app.doc.check.notDated':
    'この記録にはまだ日付がないか、リンクが変えられています。日付が表示されるまでは頼らないでください。',
  'app.doc.check.what':
    'これで示せること：まったく同じバイトのファイルが、その日付までに保有者の手元にあったこと。示せないこと：書類が本物であること、発行者が発行したこと、内容が正しいこと。「発行者」は保有者の申告です。',
  'app.doc.check.whatUndated':
    '日付が付いた後に示せること：まったく同じバイトのファイルが、その日付までに保有者の手元にあったこと。示せないこと：書類が本物であること、発行者が発行したこと、内容が正しいこと。「発行者」は保有者の申告です。',
  'app.doc.check.inLink': 'リンク内（保有者自身の言葉）',
  'app.doc.nums.title': '記載されている数値（任意）',
  'app.doc.nums.help':
    '印刷されているとおりに入力してください。書類と一緒に封印されるので、あとで「発芽率は85 %以上」のように1つだけを、ほかの数値や証明書を見せずに証明できます。',
  'app.doc.nums.which': 'どの数値',
  'app.doc.nums.none': 'なし',
  'app.doc.nums.bad': '小数点以下{places}桁までの数値（例：0.21）。',
  'app.doc.need.numbers': 'この欄に入れられない数値があります。直すか、消してください。',
  'app.doc.need.aNumber': '少なくとも1つ数値を入力するか、「なし」を選んでください。',
  'app.doc.schema.potency': 'カンナビノイド含有量',
  'app.doc.schema.seed-quality': '種子品質',
  'app.doc.slot.totalThc': '総THC',
  'app.doc.slot.delta9Thc': 'デルタ9-THC',
  'app.doc.slot.thca': 'THCA（酸型THC）',
  'app.doc.slot.totalCbd': '総CBD',
  'app.doc.slot.cbda': 'CBDA（酸型CBD）',
  'app.doc.slot.cbg': 'CBG（カンナビゲロール）',
  'app.doc.slot.totalCannabinoids': '総カンナビノイド',
  'app.doc.slot.moisture': '水分',
  'app.doc.slot.germination': '発芽率',
  'app.doc.slot.pureSeed': '純種子',
  'app.doc.slot.otherCropSeed': '他作物種子',
  'app.doc.slot.weedSeed': '雑草種子',
  'app.doc.slot.inertMatter': '夾雑物',
  'app.doc.nums.heldTitle': 'その数値',
  'app.doc.nums.heldText':
    'この書類と一緒に{schema}として封印されています。見えるのはあなただけです。記録に入っているのは数値を拘束するコードで、数値そのものではありません。',
  'app.claim.title': '事実を証明する',
  'app.claim.text':
    'その数値、ほかの数値、証明書を見せずに、事実を誰にでも証明できます。たとえば、封印した数値が上限の範囲内であることや、結果が「不検出」であることです。証明はMidnight上に置かれ、誰でも確認できます。',
  'app.claim.example':
    '例：種子ロットの発芽率が85%以上であること、または病原体検査が「不検出」だったことを、数値そのものや記録の残りを渡さずに買い手に示せます。数値と上限・下限はあなたが選びます。相手は、それを確認できるリンクを受け取ります。',
  'app.claim.notReady': 'このサイトでは、証明はまだ有効になっていません。',
  'app.claim.number': 'どの数値',
  'app.claim.how': '何を証明するか',
  'app.claim.atMost': '以下である…',
  'app.claim.atLeast': '以上である…',
  'app.claim.exactly': 'この値そのもの（数値が公開されます）',
  'app.claim.bound': '境界値',
  'app.claim.boundBad': '小数点以下{places}桁までの数値。',
  'app.claim.wontMeet': '封印した数値はその条件を満たしていないため、証明できません。何も送信していません。',
  'app.claim.exactWarn': '{label}：{value} {unit}が誰にでも見える形で、永久に公開されます。',
  'app.claim.already': '{label}についてすでに公開されていること：{list}。',
  'app.claim.leak': '証明した境界値はすべて永久に公開され、合わせると数値の範囲が狭まります。',
  'app.claim.computer':
    'ノートパソコンで1〜2分かかり、多くのメモリが必要です。コンピューターを使ってください。電話はまだ試験していません。',
  'app.claim.go': 'Midnight上で証明する',
  'app.claim.going': '証明中…',
  'app.claim.done': 'Midnight上で証明しました：',
  'app.claim.copy': 'これを証明するリンクをコピー',
  'app.claim.copied': 'コピーしました。',
  'app.claim.made': '証明した内容',
  'app.claim.line.atMost': '{label}は{bound} {unit}以下',
  'app.claim.line.atLeast': '{label}は{bound} {unit}以上',
  'app.claim.line.value': '{label}は{value} {unit}',
  'app.claim.holderTyped': '数値はあなたが入力したものです。どのラボも署名していません。',
  'app.claim.check.title': 'クレームを確認する',
  'app.claim.verdict.bad': 'このリンクは読み取れないため、何も確認していません。',
  'app.claim.verdict.checking': 'このクレームをこのブラウザで確認しています…',
  'app.claim.verdict.failed': 'このクレームは確認で通りませんでした。当てにしないでください。',
  'app.claim.verdict.unreadable':
    '今はMidnightからこのクレームを読み取れませんでした。間違っているという意味ではありません。数分後にもう一度お試しください。',
  'app.claim.verdict.labFailed':
    'このクレームは確認できましたが、ラボの署名は確認で通りませんでした。下を見てください。',
  'app.claim.verdict.someFailed':
    'このクレームは確認できましたが、このリンクにある別のクレームは通りませんでした。下を見てください。',
  'app.claim.verdict.okWhen': '{date}に証明されています。このブラウザで確認しました。',
  'app.claim.verdict.ok': 'このクレームはこのブラウザで確認できました。',
  'app.claim.verdict.labConflict':
    'このクレームは確認できましたが、署名した鍵を複数のラボが自分の鍵だとしているため、数値は保有者自身の申告として読んでください。下を見てください。',
  'app.claim.verdict.labWithdrawn':
    'このクレームは確認できましたが、ラボが署名を取り下げているため、数値は保有者自身の申告として読んでください。下を見てください。',
  'app.doc.verdict.noDate':
    'VeilCoreには、この書類そのものの日付はまだありません。封印したばかりなら次のバッチで日付が付きます。リンクが変更されていると一致しません。',
  'app.doc.verdict.bad': 'このリンクは読み取れないため、何も確認していません。',
  'app.doc.verdict.dated': '{date}に日付が付いています。このブラウザで確認しました。',
  'app.doc.verdict.datedChooseFile':
    '{date}に日付が付いています。このブラウザで確認しました。同じファイルかどうかは、下でファイルを選んで確かめられます。',
  'app.doc.verdict.datedSameFile':
    '{date}に日付が付いており、選んだファイルは封印されたものと同じです。このブラウザで確認しました。',
  'app.doc.verdict.datedOtherFile': '{date}に日付が付いていますが、選んだファイルは封印されたものではありません。',
  'app.claim.check.intro':
    '封印された文書についての事実を1つ、数値や文書を見せずに示すため、このリンクが送られてきました。このページはMidnight上のクレームを読み取り、確認します。',
  'app.claim.check.bad': 'このリンクは読み取れません。もう一度送ってもらってください。',
  'app.claim.check.checking': 'Midnight上のクレームを読み取っています…',
  'app.claim.check.okWhen': 'Midnight上のブロック{block}{date}で証明されました。',
  'app.claim.check.failed': '確認できません：{reason}頼らないでください。',
  'app.claim.check.record': '対象の記録',
  'app.claim.check.what':
    'これで示せること：その記録に封印された数値が境界値を満たしている（またはその値である）こと。示せないこと：ラボが測定したこと、文書が本物であること。数値は保有者が入力したものです。数値について証明された境界値はすべて公開され、合わせると範囲が狭まります。',
  'app.claim.check.schema': '公開されたフォーム「{schema}」に基づく。',
  // EvidenceBundle.tsx: what differs for a document record.
  'app.doc.bundle.keyIs':
    '（記録の鍵とは、封印したときにこの書類用に作られた鍵の公開IDです。秘密の部分はバックアップに残り、パッケージには入りません。）',
  'app.doc.bundle.includeFiles':
    '書類のコピーを含める。含めない場合、パッケージには各ファイルのコードしか入らないため、確認する人は別途ファイルを受け取る必要があります。',
  'app.doc.bundle.chooseFiles': '書類のファイルを選ぶ',
  'app.doc.bundle.checkedAgainst': '含める前に、それぞれこの記録に封印されたファイルと照合されます。',
  'app.doc.bundle.filesAria': '書類のファイル',
  'app.doc.bundle.chooseOrUntick': '書類のファイルを選ぶか、チェックを外してください。',
  // ---- kept on this device only (docs/device-only-records.md; DocumentNew.tsx, DocumentDetail.tsx) ----
  'app.doc.local.choice': 'この記録をこの端末と自分のバックアップだけに保管する',
  'app.doc.local.before': '選ぶ前にご確認ください：',
  'app.doc.local.p1':
    'ここに入力した内容は、鍵をかけた形でもそうでない形でも、VeilCoreには送信されません。記録に日付を付けるために送信されるのは、記録のID、証明コード、鍵の紐付け（記録自身の鍵から作ったコード）です。',
  'app.doc.local.p2':
    'VeilCoreのサーバーはこの記録をお返しできません。サーバーがこの記録を持つことは一度もないからです。',
  'app.doc.local.p3':
    '写しがあるのは、このブラウザと、封印のあとに保存したバックアップファイルだけです。それより前に保存したバックアップにはこの記録は入っておらず、パスキーのコピーには入ることがありません。封印するとすぐに、バックアップを保存して確認するよう求められます。',
  'app.doc.local.p4': '確認リンクとファイルを持っている人は、これまでどおり誰でも確認できます。',
  'app.doc.local.p5': 'これは封印するときに一度だけ選びます。あとから変更することはできません。',
  'app.doc.local.title': 'この端末だけに保管',
  'app.doc.local.text':
    'この記録に入力した内容は、鍵をかけた形でもそうでない形でも、VeilCoreに送信されていません。写しがあるのは、このブラウザと、あなたが確認したバックアップファイルだけです。両方を失うと記録は失われ、VeilCoreからお返しすることはできません。この記録を封印する前に保存したバックアップには入っておらず、パスキーのコピーには入ることがありません。',
  'app.doc.local.notBacked':
    'まだどのバックアップにも入っていません。この記録の写しはこのブラウザにしかありません。いまブラウザのデータが消去されると記録は失われ、VeilCoreからお返しすることはできません。いますぐバックアップファイルを保存して確認してください。',
  'app.doc.local.sent':
    'この端末から送信されたもの：記録のID、証明コード、鍵の紐付け。日付を付けるためにVeilCoreへ送信されました。どのリクエストでも、VeilCoreにはあなたのネットワークアドレスと時刻が伝わります。パスキーのコピーを使っている場合、そこにはこの記録のIDと鍵が、鍵をかけた状態でVeilCoreのサーバーに保管されます。入力した内容が入ることはありません。',
  'app.doc.local.stamp':
    'この記録の鍵に日付スタンプを付けるかどうかは、あなたが決めます。始まるのは下のボタンを押したときだけです。付ける場合、鍵から作ったコードがVeilCoreの手数料サービスを通ってMidnightに送られます。入力した内容は一緒に送られません。',
  'app.doc.stamp.title': 'この記録の鍵に{network}で日付スタンプを付ける',
  'app.doc.stamp.button': 'この記録の鍵に日付スタンプを付ける',
  'app.doc.local.conflict':
    'VeilCoreのサーバーが、この記録の証明コードだけではない内容を返しました。表示されているのは、この端末にある写しです。これ以上は何も送信されず、サーバーの返答によってここの内容が変わることはありません。',
  'app.doc.local.homeNotBacked': 'この端末だけに保管 · まだバックアップなし',
  'app.doc.local.backup': 'バックアップを保存する',
  'app.doc.local.homeLine': 'この端末だけに保管',
  'app.doc.local.staysHere': 'この記録はこの端末だけに保管されているため、この操作は利用できません。',
  'app.doc.local.delete': 'この端末から削除する',
  'app.doc.local.deleteConfirm':
    'この記録をこの端末から削除しますか？ここでは元に戻せません。この記録が入っているバックアップファイルには、引き続き入っています。VeilCoreには、すでに送信されたもの（記録のID、証明コード、鍵の紐付け）が残ります。パスキーのコピーを使っている場合、そのコピーを更新するまで、この記録のIDと鍵がそこに残ります。鍵に日付スタンプを付けていた場合、それはMidnightに残ります。確認リンクを持っている人にとって、日付は引き続き有効です。',
  'app.doc.local.toRecord': '記録へ進む',
  'app.doc.local.backupNow':
    '封印しました。続けてバックアップを保存し、確認してください。それまでは、この記録の写しはこのブラウザにしかありません。',
  'app.doc.local.backupMissing':
    'そのバックアップには、この端末だけに保管している書類が入っていません。新しく保存して、それを確認してください。',
  'app.doc.local.backupFailed':
    'バックアップを作成できませんでした。この端末だけに保管している書類を入れられなかったためです。何も保存されていません。',
  'app.doc.local.noCorrect':
    'この端末だけに保管する記録は訂正できません。書類を新しい記録としてもう一度封印してください。',
  'app.doc.local.unreadable.title': 'この端末の記録を1件読み取れませんでした',
  'app.doc.local.unreadable.text':
    '記録 {id} はこの端末だけに保管されていますが、このブラウザ内の保存内容が壊れているため表示できません。どこにも送信されることはありません。いまバックアップを保存すると、保存内容がそのままの形で入ります。保存内容をファイルに書き出すか、この端末から削除できます。',
  'app.doc.local.unreadable.export': '保存内容をファイルに書き出す',
  'app.doc.local.unreadable.delete': 'この端末から削除する',
  'app.doc.local.unreadable.deleteConfirm':
    'この壊れた保存内容をこの端末から削除しますか？ここでは元に戻せません。これが入っているバックアップファイルには、引き続き入っています。',
  'app.doc.local.unreadable.backupNote':
    'この端末だけに保管している記録を1件読み取れませんでした。このバックアップにはその保存内容がそのままの形で入っているため、ファイルがあれば何も失われません。ほかのものは通常どおり入っています。',
  // ---- a production chain, and proving a number from a device-only record (docs/document-chain.md) ----
  'app.doc.chain.kind.grow-batch': '栽培バッチ',
  'app.doc.chain.kind.harvest-lot': '収穫ロット',
  'app.doc.schema.grow-batch': '栽培バッチ',
  'app.doc.schema.harvest-lot': '収穫ロット',
  'app.doc.slot.plants': '記録の日付時点でこのバッチにある株数',
  'app.doc.slot.plantsInFlower': 'そのうち、記録の日付時点で開花期にある株数',
  'app.doc.slot.areaSquareMetres': 'このバッチの栽培に使っている床面積（平方メートル）',
  'app.doc.slot.plantsHarvested': 'このロットに収穫した株数',
  'app.doc.slot.wetWeightGrams': '収穫時の生重量（刈り取ったままの株全体、グラム）',
  'app.doc.slot.dryWeightGrams': '保管時のロットの乾燥重量（グラム）',
  'app.doc.chain.start.title': '生産の流れを記録しますか？',
  'app.doc.chain.start.text':
    '各段階をそれぞれ別の記録として封印し、1つ前の記録を対象にします：元の植物や株、栽培バッチ、収穫ロット、検査報告書。それぞれに日付が付きます。',
  'app.doc.chain.start.plain': 'そのほかの書類',
  'app.doc.chain.f.titleHelp': '任意。空欄なら種類とIDになります。株数や重量は書かないでください。',
  'app.doc.chain.f.reference.grow-batch': 'バッチID',
  'app.doc.chain.f.reference.harvest-lot': 'ロットID',
  'app.doc.chain.f.referenceHelp': 'ご自身の記録に書いているとおりに。',
  'app.doc.chain.f.site': '場所の名前（任意）',
  'app.doc.chain.f.siteHelp': '部屋、畑、施設などの、ご自身の呼び名。メモに入ります。',
  'app.doc.chain.f.variety': '品種（任意）',
  'app.doc.chain.f.varietyHelp': 'メモに入ります。',
  'app.doc.chain.f.numbers': 'その数値',
  'app.doc.chain.f.numbersHelp':
    '株数と重量はここだけに入力し、タイトルやメモには書かないでください。入力したとおりに封印されます。誰かが測定した値ではありません。あとで「100株以下」のように1つだけを、ほかを見せずに証明できます。',
  'app.doc.chain.note.site': '場所',
  'app.doc.chain.note.variety': '品種',
  'app.doc.chain.titleFor.grow-batch': '栽培バッチ {id}',
  'app.doc.chain.titleFor.harvest-lot': '収穫ロット {id}',
  'app.doc.chain.need.reference': 'バッチIDまたはロットIDを入力してください。',
  'app.doc.chain.need.aNumber': '数値を1つ以上入力してください。',
  'app.doc.chain.sheet.title': 'ファイルがない場合',
  'app.doc.chain.sheet.text':
    '記録にはファイルが必要です。ご自身のバッチ記録票を使うのが望ましく、すでに付けている作業書類に日付が付きます。ない場合は、上で入力したID、日付、場所、品種、保有者、「対象」から、株数や重量を含まないテキストの記録票を作り、この端末に保存します。先にそれらを入力してください。',
  'app.doc.chain.sheet.make': '入力した内容から記録票を作る',
  'app.doc.chain.sheet.made':
    '作成し、{name}として保存しました。このファイルは保管してください。記録の確認に必要で、1バイトも変えてはいけません。上の入力を変えても、記録票は変わりません。',
  'app.doc.chain.aboutHelp':
    '関係するあなたの記録：分析証明書なら検査した植物、収穫ロットならその栽培バッチ。これはあなたの申告です。選んだ記録と照合されることはありません。',
  'app.doc.chain.aboutNote':
    '「対象」は保有者自身の申告で、この記録と一緒に封印されています。VeilCoreもMidnightも、名指しされた記録との照合は行いません。記録の連なりの強さは、それぞれの記録の日付と証明コードで決まります。',
  'app.doc.chain.carried':
    'ここにリンクされている記録は、このリンクの送り主がリンクに入れたものです。封印された記録は相手をIDだけで名指ししているため、リンク先がその記録であることは、ここでは示されません。',
  'app.doc.chain.idOnly':
    'このリンクに記録のIDしか入っていない場合、その記録のページには、VeilCoreのレジストリがそのIDについて報告する内容が、確認済みの印なしで表示されます。確認済みの日付が必要なら、その記録の確認リンクを保有者に求めてください。',
  'app.doc.chain.namedAs':
    'これは別の記録から開いたもので、その記録はこれを記録{id}として名指ししています。そのIDとこの記録の証明コードを結び付けるものは、リンクの中にはありません。',
  'app.doc.chain.askRegistry': 'VeilCoreのレジストリが記録{id}について報告する内容を見る',
  'app.doc.chain.askRegistrySends':
    'そのページは、記録のIDをVeilCoreのレジストリに、この証明コードをページのアドレスの一部としてウェブサイトのホストに送信します。このリンクのほかの内容は送信されません。',
  'app.doc.chain.next.title': 'この流れの次の段階',
  'app.doc.chain.next.text':
    '次の段階を、この記録を対象とする別の記録として封印します。その記録には独自の日付が付きます。',
  'app.doc.chain.next.grow-batch': 'この記録から栽培バッチを記録する',
  'app.doc.chain.next.harvest-lot': 'その収穫ロットを記録する',
  'app.doc.chain.next.report': 'その検査報告書を封印する',
  'app.doc.chain.title': 'この端末で見た記録の連なり',
  'app.doc.chain.text':
    'このブラウザにある記録から、この端末だけに保管している記録も含めて、ここで組み立てています。そのためにVeilCoreへ問い合わせることはなく、ほかの場所にある記録は表示されません。',
  'app.doc.chain.up': 'この記録の対象',
  'app.doc.chain.down': 'この記録を対象とする記録',
  'app.doc.chain.none': 'この端末にはありません。',
  'app.doc.chain.notHeld': '{name}（この端末にはありません）',
  'app.doc.chain.share.title': '記録の連なりと一緒に送る',
  'app.doc.chain.share.text':
    'このリンクには、この記録の対象の記録と、さらにその対象の記録も入ります。確認する人はそれぞれを開いて日付を見ることができます。',
  'app.doc.chain.share.warn':
    'このリンクを持つ人には、上のリンクでこの記録が見えるのと同じように、次の書類の記録の内容もすべて見えます：{list}。書類ではない記録については、IDと証明コードだけが入ります。',
  'app.doc.chain.share.copy': '記録の連なり付きのリンクをコピー',
  'app.doc.chain.share.copied': 'コピーしました。',
  'app.doc.local.p6':
    '数値がある場合、あとでそこから事実を証明することを選べます。その場合、その事実がVeilCoreの手数料サービスを通ってMidnightで公開されます。その記録でオンにしたときだけです。',
  'app.doc.local.prove.off': 'この端末だけに保管する記録では、事実の証明は有効になっていません。',
  'app.doc.local.prove.title': '事実を証明する：あなたの選択',
  'app.doc.local.prove.text':
    'ここでオンにしない限りオフです。証明すると、この記録についての事実が1つ、VeilCoreの手数料サービスを通ってMidnightで永久に公開されます。VeilCoreのレジストリには何も送信されません。証明する前に、何が公開されるかが正確に表示されます。',
  'app.doc.local.prove.choice': 'この記録で「事実を証明する」を表示する',
  'app.doc.local.prove.publish.title': '続行した場合に公開される内容',
  'app.doc.local.prove.publish.range':
    'Midnightで永久に公開されるもの：フォーム「{schema}」、項目「{label}」、境界値{bound}とその向き（{direction}）、この記録を表すコード。数値そのものは公開されません。境界値を証明するたびに、数値の範囲は狭まります。',
  'app.doc.local.prove.publish.exact':
    'Midnightで永久に公開されるもの：フォーム「{schema}」、項目「{label}」、数値そのもの（{value}）、この記録を表すコード。',
  'app.doc.local.prove.publish.noBound': '境界値を入力すると、公開される内容が正確に表示されます。',
  'app.doc.local.prove.publish.route':
    'このブラウザからVeilCoreの手数料サービスを通ってMidnightに送られます。手数料サービスには、公開される内容とあなたのネットワークアドレスが伝わります。VeilCoreのレジストリには何も送信されません。数値はあなたが入力したもので、ラボが測定したものではありません。',
  'app.doc.local.prove.direction.atMost': '以下',
  'app.doc.local.prove.direction.atLeast': '以上',
  'app.doc.local.prove.confirmExact': 'はい、数値そのもの（{value}）をMidnightで永久に公開します。',
  'app.doc.local.textProved':
    'この記録に入力した内容は、鍵をかけた形でもそうでない形でも、VeilCoreのレジストリに送信されていません。数値についてあなたが証明することを選んだ内容は、Midnightで公開されています。記録の写しがあるのは、このブラウザと、あなたが確認したバックアップファイルだけです。両方を失うと記録は失われ、VeilCoreからお返しすることはできません。この記録を封印する前に保存したバックアップには入っておらず、パスキーのコピーには入ることがありません。',
  'app.doc.local.proved':
    'あなたはこの記録の数値についての事実を証明することを選びました。それらはVeilCoreの手数料サービスを通ってMidnightに送られ、永久に公開されています。下に一覧があります。この記録に入力した内容は、VeilCoreのレジストリには送信されていません。',
  'app.claim.tie':
    '証明した内容はMidnightで公開され、VeilCoreと、この記録の確認リンクを持つ人は、それをこの記録と結び付けることができます。VeilCoreは、この記録に日付を付けた保有者キーとも結び付けることができます。',
  'app.doc.local.aboutStaysHere':
    'この記録は、この端末だけに保管している記録を名指ししているため、この記録もこの端末だけに保管する必要があります。そうしないと、相手の記録の名前とIDが、この記録の鍵をかけたコピーに入ってVeilCoreに送信されます。何も保存も送信もされていません。',
  'app.doc.chain.aboutLocalOnly':
    'この端末だけに保管している記録は、この記録もこの端末だけに保管する場合（下のチェックボックス）にだけ選べます。記録の対象は鍵をかけたコピーに封印されるため、通常の記録では、相手の記録の名前とIDがVeilCoreに送信されてしまいます。',
  'app.doc.check.tooLarge':
    'このリンクには、確認リンクに入れられる量を超える内容が入っています。送り主に、記録ごとのリンクを求めてください。',
  'app.doc.chain.share.warnLocal':
    'この端末だけに保管している記録に入力した内容は、VeilCoreのレジストリに送信されたことがありません。このリンクをコピーすると、リンクに入るそうした記録（上で印が付いたもの。この記録が該当する場合はこの記録も）に入力した内容が、リンクを受け取った人に渡ります。',
  'app.doc.chain.aboutHolderNote':
    'これらのリンクを開くと、あなたのネットワークアドレスから、その記録のIDについてVeilCoreのレジストリに問い合わせが行われます。この端末だけに保管している記録の場合、レジストリが知ることが1つ増えます。このブラウザがその記録を調べたということです。',
  'app.doc.copy.title': 'ラボの結果のあなたのコピー',
  'app.doc.copy.text':
    '{lab}が保管している結果のコピーです。日付はラボのもので、あなたのものではありません。VeilCoreはこのコピーを保管しますが、あなたのために日付を記録することはできません。',
  'app.doc.copy.aLab': 'ラボ',
  'app.doc.copy.homeLine': '{lab}が保管している結果のコピー：日付はラボのものです',
  'app.doc.copy.noExport': 'これはラボが保管している結果のコピーのため、あなたの記録として書き出すことはできません。',
  'app.doc.copy.delete':
    'これはラボが保管している結果のあなたのコピーです。削除しても消えるのはあなたのコピーだけです。ラボの記録とその日付は残ります。',
  'app.doc.copy.made':
    '「{name}」は{lab}の結果のコピーとして保管されます。あなたのために日付を記録することはできません。',
} satisfies Partial<AppTranslation>;
