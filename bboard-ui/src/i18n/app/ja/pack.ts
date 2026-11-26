// 記録アプリ（日本語）：当局向け提出資料（../en/pack.ts）。
// こちらの記録は常に「VeilCoreの記録」「VeilCore ID」と書き、「登録」は国の品種登録だけに使う。
// DRAFT: machine-assisted, to be checked by a fluent speaker before publishing (docs/translations/README.md).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const pack = {
  'app.pack.home': 'REPROCANN / SEDRONAR 向け提出資料',
  'app.pack.more': '当局向けの提出資料',
  'app.pack.title': 'REPROCANN / SEDRONAR 向け提出資料',
  'app.pack.intro':
    'アルゼンチンの医療用大麻団体向けです。半年ごとの申告と生産記録の補足資料として、ある期間のVeilCoreの記録が示す内容をまとめ、足りないものを示し、各VeilCoreの記録の確認リンクを付けます。確認・署名・送付はご自身で行ってください。',
  'app.pack.form.period': '期間',
  'app.pack.form.periodSix': '直近6か月',
  'app.pack.form.periodPermit': '許可の1年間',
  'app.pack.form.periodOther': 'その他の日付',
  'app.pack.form.permitStart': '許可の開始日',
  'app.pack.form.from': '開始',
  'app.pack.form.to': '終了',
  'app.pack.form.badPeriod': '開始日は終了日と同じか、それより前の日にしてください。',
  'app.pack.form.association': '団体名（資料に印刷されます）',
  'app.pack.form.preparedBy': '作成者（資料に印刷されます）',
  'app.pack.form.countsTitle': '株数',
  'app.pack.form.countsHelp':
    '申告する数値を入力してください。下の合計は目安にすぎません。封印済みの栽培バッチの合計は在庫数ではありません。',
  'app.pack.form.sumsPlants':
    'この期間の日付の栽培バッチを合計すると {plants} 株です（この数のあるバッチ：{batches} 件中 {counted} 件）。',
  'app.pack.form.sumsFlower': '開花中は合計 {inFlower} 株です（この数のあるバッチ：{batches} 件中 {counted} 件）。',
  'app.pack.form.sumsNone': 'この期間の日付の栽培バッチには、封印された株数がありません。',
  'app.pack.form.plants': '総株数',
  'app.pack.form.inFlower': '開花中の株数',
  'app.pack.form.patients': '紐づく患者数',
  'app.pack.form.patientsHelp':
    '数値のみで、氏名は入力しません。この資料の作成にだけ使われ、保存されず、VeilCoreにもほかの誰にも送られません。',
  'app.pack.form.badNumber': '整数を入力するか、空欄のままにしてください。',
  'app.pack.form.lang': '資料の言語',
  'app.pack.form.make': '資料を作成',
  'app.pack.form.making': '各VeilCoreの記録の日付を確認しています…',
  'app.pack.form.print': '印刷またはPDFとして保存',
  'app.pack.form.printHelp': '印刷画面で「PDFに保存」とA4用紙を選んでください。',
  'app.pack.form.linksWarn':
    '資料の各確認リンクには、#の後にそのVeilCoreの記録の封印済みの内容が含まれるため、開いた人はそれを見ることができます：{list}。',
  'app.pack.form.linksLocal': '一部はこの端末だけに保管されています。資料を送ると、その内容が端末の外に出ます。',
  'app.pack.form.none': 'このブラウザには、この期間の日付の栽培バッチも収穫ロットもありません。',
  'app.pack.form.failed': '資料を作成できませんでした：{reason}',
  'app.pack.doc.title': '半年ごとの報告と生産記録のための補足資料',
  'app.pack.doc.sub': '団体自身のVeilCoreの記録から作成。',
  'app.pack.doc.notFormShort': '公式の様式ではありません。',
  'app.pack.doc.rules':
    '半年ごとの宣誓申告とバッチごとのクロマトグラフィー報告（保健省決議 800/2021 第4条の3 f号。保健省決議 1780/2025 により追加）、および栽培計画の生産記録（同条 h号）のため。',
  'app.pack.doc.association': '団体：{name}',
  'app.pack.doc.preparedBy': '作成者：{name}',
  'app.pack.doc.period': '期間：{from}〜{to}',
  'app.pack.doc.made': '{at}に、このブラウザの{records}から作成。',
  'app.pack.doc.records.other': 'VeilCoreの記録 {count} 件',
  'app.pack.doc.pageOf': '{page} / {pages} ページ',
  'app.pack.doc.gapsTitle': '送付前に：不足しているもの',
  'app.pack.doc.gapsNone': 'これらのVeilCoreの記録から見て、不足はありません。',
  'app.pack.doc.variety': '1. 使用した登録品種',
  'app.pack.doc.varietyHelp':
    '栽培バッチが指す植物または系統です。登録番号は、保有者がVeilCoreの記録に入力して封印したもので、公式の登録簿とは照合されていません。',
  'app.pack.doc.col.variety': '品種',
  'app.pack.doc.col.registration': '品種の登録番号',
  'app.pack.doc.col.record': 'VeilCore ID',
  'app.pack.doc.regNone': 'VeilCoreに番号の記載なし',
  'app.pack.doc.varietyNone': 'これらのVeilCoreの記録の栽培バッチは、元になるVeilCoreの記録を指していません。',
  'app.pack.doc.sourceMissing': '{name}（VeilCore ID {id}）：栽培バッチが指していますが、このブラウザにはありません。',
  'app.pack.doc.plants': '2. 株数',
  'app.pack.doc.plantsTotal': '総株数',
  'app.pack.doc.plantsFlower': '開花中の株数',
  'app.pack.doc.notGiven': '未記入',
  'app.pack.doc.typed': '資料の作成時に担当者が申告した数値です。封印済みのVeilCoreの記録からではありません。',
  'app.pack.doc.sums':
    '参考：期間内に封印された栽培バッチの合計は {plants} 株、うち開花中 {inFlower} 株です。封印済みバッチの合計は在庫数ではありません。',
  'app.pack.doc.patients': '3. 紐づく患者',
  'app.pack.doc.patientsNote':
    '数値のみで、資料の作成時に担当者が入力したものです。どのVeilCoreの記録にも含まれず、VeilCoreには送られていません。',
  'app.pack.doc.production': '4. 生産記録',
  'app.pack.doc.productionHelp':
    '各段階は団体が封印したVeilCoreの記録で、一つ前の記録を指しています。このつながりは保有者自身の申告で、指しているVeilCoreの記録と照合する人はいません。',
  'app.pack.doc.col.step': '段階',
  'app.pack.doc.col.name': '名前とVeilCore ID',
  'app.pack.doc.col.date': '日付',
  'app.pack.doc.col.figures': '数値（封印どおり）',
  'app.pack.doc.col.about': '対象',
  'app.pack.doc.outside': 'この期間より前の日付です。期間内の収穫ロットがこれを対象にしています。',
  'app.pack.doc.batchFigures': '{plants} 株、うち開花中 {inFlower} 株',
  'app.pack.doc.batchNoFigures': '株数の封印なし',
  'app.pack.doc.lotFigures': '収穫 {plants} 株',
  'app.pack.doc.chromatography': '5. 収穫ロットごとのクロマトグラフィー報告',
  'app.pack.doc.chromatographyHelp':
    'ロットを対象とするVeilCoreの記録として封印された検査報告書または分析証明書です。数値は、ラボの署名が確認でき、そのラボが特定できる場合にだけ表示します。',
  'app.pack.doc.lot': 'ロット {lot}',
  'app.pack.doc.labSigned': 'ラボが署名した結果です。{signer}',
  'app.pack.doc.document':
    '封印済みの文書：「{title}」。報告書はラボのファイルで、その内容はこの資料ではなく、そのファイルにあります。',
  'app.pack.doc.labUnnamed':
    'ラボの署名が付いていますが、ここではその背後のラボを特定できないため、数値は表示しません。',
  'app.pack.doc.missing':
    '不足：これらのVeilCoreの記録には、このロットを対象とするクロマトグラフィー報告がありません。',
  'app.pack.doc.proofs': '6. 証明コード、確認リンク、日付',
  'app.pack.doc.proofsHelp':
    '各確認リンクは、誰でも無料で、アカウントなしで開けます。VeilCoreの記録は、遅くともその日付までにファイルと内容を保有していたことを示します。記録の内容が正しいことは示しません。',
  'app.pack.doc.recordId': 'VeilCore ID {id}',
  'app.pack.doc.proofCode': '証明コード',
  'app.pack.doc.checkLink': '確認リンク',
  'app.pack.doc.onPaper':
    '紙で確認する場合：{site}/verify を開き、VeilCore ID {id} と上記の証明コードを入力してください。',
  'app.pack.doc.noLink': '確認リンクなし：このVeilCoreの記録はまだ封印されていません。',
  'app.pack.doc.local': '団体の端末だけに保管。',
  'app.pack.doc.dateRests': '日付の根拠',
  'app.pack.role.source': '元の記録',
  'app.pack.role.grow-batch': '栽培バッチ',
  'app.pack.role.harvest-lot': '収穫ロット',
  'app.pack.role.report': '検査報告書',
  'app.pack.doc.notForm':
    'この申告について公表された公式の様式は把握していません。VeilCoreは団体に代わって何も提出しません。団体がこの資料を確認し、署名し、自ら送付します。',
  'app.pack.doc.handover':
    'このブラウザにあるVeilCoreの記録だけから作成しました。別の担当者の端末で封印されたVeilCoreの記録は、その人のバックアップからここに復元した場合にだけ含まれます。',
  'app.pack.doc.signSign': '署名',
  'app.pack.doc.signName': '氏名（楷書）',
  'app.pack.doc.signRole': '資格（法定代表者／技術責任者）',
  'app.pack.doc.signDate': '日付',
  'app.pack.date.unsealed': '封印されていないため、日付はありません。',
  'app.pack.date.none': 'まだどのネットワークでも日付が付いていません。',
  'app.pack.date.pending': 'バッチに入っていますが、まだどのネットワークでも日付が付いていません。',
  'app.pack.date.test': 'テストネットワークです。練習用のデータで、本当の日付ではありません。',
  'app.pack.date.checked':
    '{where}：資料の作成時にこのブラウザが確認しました。バッチのルートはトランザクション {tx}、ブロック {block}、{at} にあります。{test}',
  'app.pack.date.failed':
    '{where}：確認できませんでした。このブラウザがトランザクションを照会したところ、VeilCoreの登録サーバーの報告と一致しませんでした。その日付に頼らないでください。理由は確認リンクで分かります。',
  'app.pack.date.reported':
    '{where}：VeilCoreの登録サーバーによれば {date}。このブラウザでは確認していません。確認リンクで照会されます。{test}',
  'app.pack.date.noTime': '時刻の記載なし',
  'app.pack.date.bitcoin':
    'Bitcoin：VeilCoreの登録サーバーによれば、バッチのルートはBitcoinのブロック {block}（{at}）にあります。バッチのOpenTimestampsファイルで確認してください。',
  'app.pack.date.bitcoinPending': 'Bitcoin：スタンプは保留中で、まだBitcoinのブロックに入っていません。',
  'app.pack.date.tsa':
    'RFC 3161：バッチのルートには {tsa} のタイムスタンプがあり、トークンの記載では {at} です。トークンはこのブラウザでバッチのルートと照合済みで、このVeilCoreの記録の包含証明がそのルートにつないでいます。',
  'app.pack.date.tsaUnnamed': 'タイムスタンプ局',
  'app.pack.date.tsaQualified':
    'VeilCoreの登録サーバーは、その局が {scheme} の適格事業者だとしています。それに頼る前に、トラストリストをご自身で確認してください。',
  'app.pack.gap.chromatography': 'ロット {lot}：クロマトグラフィー報告がありません。',
  'app.pack.gap.registration': '{name}：品種の登録番号が入力されていません。',
  'app.pack.gap.source': '{name}：栽培バッチが指していますが、このブラウザにはありません。',
  'app.pack.gap.noBatches': 'この期間の日付の栽培バッチはありません。',
  'app.pack.gap.noLots': 'この期間の日付の収穫ロットはありません。',
  'app.pack.gap.plants': '総株数：未記入です。',
  'app.pack.gap.inFlower': '開花中の株数：未記入です。',
  'app.pack.gap.plantsPartial.other': '期間内の栽培バッチ {count} 件に、封印された株数がありません。',
  'app.pack.gap.inFlowerPartial.other': '期間内の栽培バッチ {count} 件に、封印された開花中の株数がありません。',
  'app.pack.gap.patients': '紐づく患者数：未記入です。',
  'app.pack.gap.undated.other': 'VeilCoreの記録 {count} 件は、まだどのネットワークでも日付が付いていません。',
  'app.pack.gap.unchecked.other':
    '{count} 件の日付はVeilCoreの登録サーバーによるもので、このブラウザはMidnightのメインネットワークで確認していません。',
  'app.pack.gap.testing.other':
    'VeilCoreの記録 {count} 件は、VeilCoreコントラクトのバージョン2で日付が付けられています。このバージョンはVeilCoreのテスト専用で記録用ではないため、その日付は信頼できません。',
  'app.pack.gap.locked.other':
    'このブラウザのVeilCoreの記録 {count} 件は鍵がかかっており（このブラウザにない鍵で封印）、除外されています。',
} satisfies Partial<AppTranslation>;
