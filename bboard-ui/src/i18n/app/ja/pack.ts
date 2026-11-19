// 記録アプリ（日本語）：当局向け提出資料（../en/pack.ts）。
// DRAFT: machine-assisted, to be checked by a fluent speaker before publishing (docs/translations/README.md).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const pack = {
  'app.pack.home': 'REPROCANN / SEDRONAR 向け提出資料',
  'app.pack.homeText': 'アルゼンチンの団体向け：半年ごとの数値と生産記録を、あなたの記録から作成します。',
  'app.pack.title': 'REPROCANN / SEDRONAR 向け提出資料',
  'app.pack.intro':
    'アルゼンチンの医療用大麻団体向けです。半年ごとの申告と生産記録のために、ある期間の記録が示す内容をまとめ、足りないものを示し、各記録の確認リンクを付けます。確認・署名・送付はご自身で行ってください。',
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
  'app.pack.form.countsFromBatches':
    'この期間の日付の栽培バッチを合計すると {plants} 株、うち開花中 {inFlower} 株です（{batches}）。この数値を使う場合は空欄のままに、申告する数値がある場合は入力してください。',
  'app.pack.form.countsNone':
    'この期間の日付で株数のある栽培バッチはありません。申告する数値を入力するか、空欄のままにしてください。空欄の場合、資料には不足と表示されます。',
  'app.pack.form.batches.other': '{count} バッチ',
  'app.pack.form.plants': '総株数',
  'app.pack.form.inFlower': '開花中の株数',
  'app.pack.form.patients': '紐づく患者数',
  'app.pack.form.patientsHelp':
    '数値のみで、氏名は入力しません。この資料の作成にだけ使われ、保存されず、VeilCoreにもほかの誰にも送られません。',
  'app.pack.form.badNumber': '整数を入力するか、空欄のままにしてください。',
  'app.pack.form.lang': '資料の言語',
  'app.pack.form.make': '資料を作成',
  'app.pack.form.making': '各記録の日付を確認しています…',
  'app.pack.form.print': '印刷またはPDFとして保存',
  'app.pack.form.printHelp': '印刷画面で「PDFに保存」とA4用紙を選んでください。',
  'app.pack.form.linksWarn':
    '資料の各確認リンクには、#の後にその記録の封印済みの内容が含まれるため、開いた人はそれを見ることができます：{list}。',
  'app.pack.form.linksLocal': '一部はこの端末だけに保管されています。資料を送ると、その内容が端末の外に出ます。',
  'app.pack.form.none': 'このブラウザには、この期間の日付の栽培バッチも収穫ロットもありません。',
  'app.pack.form.failed': '資料を作成できませんでした：{reason}',
  'app.pack.doc.title': '半年ごとの報告と生産記録',
  'app.pack.doc.sub': 'VeilCoreにある団体自身の記録から作成した補足資料',
  'app.pack.doc.rules':
    '半年ごとの宣誓申告とバッチごとのクロマトグラフィー報告（保健省決議 1780/2025、第4条の3 f号）、および栽培計画の生産記録（同 h号）のため。',
  'app.pack.doc.association': '団体：{name}',
  'app.pack.doc.preparedBy': '作成者：{name}',
  'app.pack.doc.period': '期間：{from}〜{to}',
  'app.pack.doc.made': '{at}に、このブラウザの{records}から作成。',
  'app.pack.doc.records.other': '{count} 件の記録',
  'app.pack.doc.gapsTitle': '送付前に：不足しているもの',
  'app.pack.doc.gapsNone': 'これらの記録から見て、不足はありません。',
  'app.pack.doc.variety': '1. 使用した登録品種',
  'app.pack.doc.varietyHelp': '栽培バッチが指す植物または系統です。登録番号は、保有者が記録に封印したものです。',
  'app.pack.doc.col.variety': '品種',
  'app.pack.doc.col.registration': '登録番号',
  'app.pack.doc.col.record': '記録',
  'app.pack.doc.regNone': '記録にありません',
  'app.pack.doc.varietyNone': 'これらの記録の栽培バッチは、元になる記録を指していません。',
  'app.pack.doc.sourceMissing': '{name}（記録 {id}）：栽培バッチが指していますが、このブラウザにはありません。',
  'app.pack.doc.plants': '2. 株数',
  'app.pack.doc.plantsTotal': '総株数',
  'app.pack.doc.plantsFlower': '開花中の株数',
  'app.pack.doc.notGiven': '未記入',
  'app.pack.doc.fromBatches.other':
    'この期間の日付の栽培バッチ {count} 件の合計です。各バッチの日付に数え、その記録とともに封印されたものです。',
  'app.pack.doc.typed': '資料の作成時に担当者が入力したものです。封印済みの記録からではありません。',
  'app.pack.doc.countsNone': 'この期間の栽培バッチには株数が封印されておらず、入力もされていません。',
  'app.pack.doc.patients': '3. 紐づく患者',
  'app.pack.doc.patientsNote':
    '数値のみで、資料の作成時に担当者が入力したものです。どの記録にも含まれず、VeilCoreには送られていません。',
  'app.pack.doc.production': '4. 生産記録',
  'app.pack.doc.productionHelp':
    '各段階は団体が封印した記録で、一つ前の記録を指しています。このつながりは保有者自身の申告で、指している記録と照合する人はいません。',
  'app.pack.doc.col.step': '段階',
  'app.pack.doc.col.name': '名前とID',
  'app.pack.doc.col.date': '日付',
  'app.pack.doc.col.figures': '数値（封印どおり）',
  'app.pack.doc.col.about': '対象',
  'app.pack.doc.outside': 'この期間より前の日付です。期間内の収穫ロットがこれを対象にしています。',
  'app.pack.doc.batchFigures': '{plants} 株、うち開花中 {inFlower} 株',
  'app.pack.doc.batchNoFigures': '株数の封印なし',
  'app.pack.doc.lotFigures': '収穫 {plants} 株',
  'app.pack.doc.chromatography': '5. 収穫ロットごとのクロマトグラフィー報告',
  'app.pack.doc.chromatographyHelp':
    'ロットを対象とする記録として封印された検査報告書または分析証明書です。数値は、検査機関の署名が確認でき、その検査機関が特定できる場合にだけ表示します。',
  'app.pack.doc.lot': 'ロット {lot}',
  'app.pack.doc.labSigned': '検査機関が署名した結果です。{signer}',
  'app.pack.doc.document':
    '封印済みの文書：「{title}」。報告書は検査機関のファイルで、その内容はこの資料ではなく、そのファイルにあります。',
  'app.pack.doc.labUnnamed':
    '検査機関の署名が付いていますが、ここではその背後の検査機関を特定できないため、数値は表示しません。',
  'app.pack.doc.missing': '不足：これらの記録には、このロットを対象とするクロマトグラフィー報告がありません。',
  'app.pack.doc.proofs': '6. 証明コード、確認リンク、日付',
  'app.pack.doc.proofsHelp':
    '各確認リンクは、誰でも無料で、アカウントなしで開けます。記録は、その日付の時点でファイルと内容を以前から保有していたことを示します。記録の内容が正しいことは示しません。',
  'app.pack.doc.recordId': '記録 {id}',
  'app.pack.doc.proofCode': '証明コード',
  'app.pack.doc.checkLink': '確認リンク',
  'app.pack.doc.noLink': '確認リンクなし：この記録はまだ封印されていません。',
  'app.pack.doc.local': '団体の端末だけに保管。',
  'app.pack.doc.dateRests': '日付の根拠',
  'app.pack.role.source': '元の記録',
  'app.pack.role.grow-batch': '栽培バッチ',
  'app.pack.role.harvest-lot': '収穫ロット',
  'app.pack.role.report': '検査報告書',
  'app.pack.doc.notForm':
    'これは公式の様式ではありません。この申告の様式は公表されていません。VeilCoreは団体に代わって何も提出しません。団体がこの資料を確認し、署名し、自ら送付します。',
  'app.pack.doc.handover':
    'このブラウザにある記録だけから作成しました。別の担当者の端末で封印された記録は、その人のバックアップからここに復元した場合にだけ含まれます。',
  'app.pack.doc.sign': '技術責任者の署名',
  'app.pack.doc.signName': '氏名',
  'app.pack.doc.signDate': '日付',
  'app.pack.date.unsealed': '封印されていないため、日付はありません。',
  'app.pack.date.none': 'まだどのネットワークでも日付が付いていません。',
  'app.pack.date.pending': 'バッチに入っていますが、まだどのネットワークでも日付が付いていません。',
  'app.pack.date.test': 'テストネットワークです。練習用のデータで、本当の日付ではありません。',
  'app.pack.date.checked':
    '{where}：資料の作成時にこのブラウザが確認しました。バッチのルートはトランザクション {tx}、ブロック {block}、{at} にあります。{test}',
  'app.pack.date.failed': '{where}：確認できませんでした：{reason}。登録サーバーが示す日付に頼らないでください。',
  'app.pack.date.reported':
    '{where}：VeilCoreの登録サーバーによれば {date}。このブラウザでは確認していません。確認リンクで照会されます。{test}',
  'app.pack.date.noTime': '時刻の記載なし',
  'app.pack.date.bitcoin':
    'Bitcoin：VeilCoreの登録サーバーによれば、バッチのルートはBitcoinのブロック {block}（{at}）にあります。バッチのOpenTimestampsファイルで確認してください。',
  'app.pack.date.bitcoinPending': 'Bitcoin：スタンプは保留中で、まだBitcoinのブロックに入っていません。',
  'app.pack.date.tsa':
    'RFC 3161：バッチのルートには {tsa} のタイムスタンプがあり、トークンの記載では {at} です。トークンはこのブラウザでバッチのルートと照合済みで、この記録の包含証明がそのルートにつないでいます。',
  'app.pack.date.tsaUnnamed': 'タイムスタンプ局',
  'app.pack.date.tsaQualified':
    'VeilCoreの登録サーバーは、その局が {scheme} の適格事業者だとしています。それに頼る前に、トラストリストをご自身で確認してください。',
  'app.pack.gap.chromatography': 'ロット {lot}：クロマトグラフィー報告がありません。',
  'app.pack.gap.registration': '{name}：記録に品種の登録番号がありません。',
  'app.pack.gap.source': '{name}：栽培バッチが指していますが、このブラウザにはありません。',
  'app.pack.gap.noBatches': 'この期間の日付の栽培バッチはありません。',
  'app.pack.gap.noLots': 'この期間の日付の収穫ロットはありません。',
  'app.pack.gap.counts': '総株数または開花中の株数：未記入です。',
  'app.pack.gap.countsPartial.other':
    '期間内の栽培バッチ {count} 件に株数が封印されていません。合計には含まれていません。',
  'app.pack.gap.patients': '紐づく患者数：未記入です。',
  'app.pack.gap.undated.other': '{count} 件の記録は、まだどのネットワークでも日付が付いていません。',
  'app.pack.gap.unchecked.other':
    '{count} 件の日付はVeilCoreの登録サーバーによるもので、このブラウザはMidnightのメインネットワークで確認していません。',
  'app.pack.gap.locked.other':
    'このブラウザの {count} 件の記録はロックされており（このブラウザにない鍵で封印）、除外されています。',
} satisfies Partial<AppTranslation>;
