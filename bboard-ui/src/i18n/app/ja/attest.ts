// The record app in Japanese: a laboratory's signature on a document's numbers (../en/attest.ts).
// DRAFT: machine-assisted, to be checked by a fluent speaker before publishing
// (docs/translations/README.md).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const attest = {
  'app.doc.schema.variety-similarity': '指定品種との遺伝的類似度',
  'app.doc.schema.variety-identity': '品種同一性（参照プロファイルとの一致）',
  'app.doc.schema.animal-parentage': '動物の親子判定（SNP、ICAR）',
  'app.doc.slot.similarity': '指定品種との類似度',
  'app.doc.slot.markersCompared': '比較したマーカー数',
  'app.doc.slot.markersDiffering': '異なるマーカー数',
  'app.doc.slot.missingCalls': '欠測数',
  'app.doc.slot.comparedVariety': '比較品種の登録番号',
  'app.doc.slot.panel': 'マーカーパネル（コード）',
  'app.doc.slot.match': '参照プロファイルとの一致率',
  'app.doc.slot.unitsTested': '検査した種子・植物の数',
  'app.doc.slot.offTypes': '異型個体数',
  'app.doc.slot.variety': '品種の登録番号',
  'app.doc.slot.species': '動物種（コード）',
  'app.doc.slot.panelSnps': 'パネルのSNP数',
  'app.doc.slot.sireCompared': '父と比較したSNP数',
  'app.doc.slot.sireConflicts': '父との不一致数',
  'app.doc.slot.sireOutcome': '父の判定（0 適合、1 疑義、2 否定）',
  'app.doc.slot.damCompared': '母と比較したSNP数',
  'app.doc.slot.damConflicts': '母との不一致数',
  'app.doc.slot.damOutcome': '母の判定（0 適合、1 疑義、2 否定）',
  'app.doc.slot.trioConflicts': 'トリオでの不一致数',
  'app.doc.slot.trioOutcome': 'トリオの判定（0 適合、1 疑義、2 否定）',
  'app.doc.slot.sire': '父の登録番号',
  'app.doc.slot.dam': '母の登録番号',
  'app.doc.nums.badWhole': '整数で入力してください（例：5103）。',
  'app.claim.boundBadWhole': '整数で入力してください。',

  'app.labnums.title': 'この報告書の数値（あなたが署名、任意）',
  'app.labnums.text':
    '様式を選び、報告書のとおりに数値を入力してください。数値はあなたが署名する記録に封印され、報告書と一緒に鍵をかけて送られます。育成者は、他の数値を見せずに一つの数値を、あなたの検査機関が署名した数値として証明できます。',
  'app.labnums.resultTitle': 'この結果の名前（報告書の参照番号）',
  'app.labnums.inReport': '検査機関がこの報告書とともに署名した数値（{form}）：',
  'app.labnums.addText':
    'あなたが保有する記録として追加してください。その後、検査機関の署名をMidnight上に公開し、数値を一つずつ証明できます。',
  'app.labnums.add': '署名された数値を記録として追加',
  'app.labnums.openRecord': 'この数値の記録を開く',
  'app.labnums.cantUse': 'この報告書の数値は使用できません：{reason}',
  'app.labnums.otherPlant': '別の植物についての数値です。',
  'app.labnums.otherReport': '別の報告書ファイルを指しています。',
  'app.labnums.oldCode':
    '数値を送れるのは、新しい検査機関コードで送る報告書だけです。育成者に新しいコードを依頼してください。',
  'app.attest.title': '検査機関の署名',
  'app.attest.signedBy': '署名鍵 {key}。',
  'app.attest.publishText': 'コピーするリンクで署名を示せるよう、署名をMidnight上に公開してください。',
  'app.attest.publish': 'Midnight上に公開する',
  'app.attest.publishing': '公開中…',
  'app.attest.published':
    'ブロック {block} でMidnight上に公開しました。「証明した内容」からコピーするリンクに、署名が含まれるようになりました。',
  'app.attest.stale': 'この記録に保存された署名が、記録と一致しなくなっています。もう一度追加してください。',

  'app.claim.labSigned': '署名鍵 {key} がこれらの数値に署名しており、リンクにはその署名が含まれます。',

  'app.claim.check.labOk':
    'その記録の数値は鍵 {key} で署名され、ブロック {block}{date} でMidnight上に公開されています。',
  'app.claim.check.labWithdrawn':
    '検査機関はこの署名を取り消しました。数値は保有者自身が入力したものとして扱ってください。',
  'app.claim.check.labConflict':
    '複数の検査機関がこの鍵を自らのものと主張しているため、名前は表示しません。数値は保有者自身が入力したものとして扱ってください。',
  'app.claim.check.labUnidentified':
    'この記録について、この鍵を自らのものと表明した検査機関はありません。数値は保有者自身が入力したものとして扱ってください。',
  'app.claim.check.labAbout': '結果の対象となる記録の証明コード',
  'app.claim.check.labFieldSecret': '検査機関もこれらの数値を知っており、自ら数値について証明することもできます。',
  'app.claim.check.labKey': '署名鍵',
  'app.claim.check.labFailed':
    '検査機関の署名は確認できませんでした：{reason} 数値は保有者自身が入力したものとして扱ってください。',
  'app.claim.check.whatLab':
    'これが示すこと：その記録に封印された数値が上限・下限を満たしている（またはその値である）こと、そして上の鍵がその記録の数値に署名したこと。示さないこと：その鍵が誰のものか、証明書が本物かどうか。数値について証明した上限・下限はすべて公開され、合わせると数値の範囲が絞られます。',
} satisfies Partial<AppTranslation>;
