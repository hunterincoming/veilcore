// The record app in Japanese: a laboratory's signature on a document's numbers (../en/attest.ts).
// DRAFT: machine-assisted, to be checked by a fluent speaker before publishing
// (docs/translations/README.md).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const attest = {
  'app.doc.schema.soybean-snp-similarity': 'ダイズの遺伝的類似度（SNP、BARCSoySNP6K）',
  'app.doc.schema.maize-snp-similarity': 'トウモロコシの遺伝的類似度（SNP）',
  'app.doc.schema.genetic-similarity': '遺伝的類似度（あらゆる作物・菌株）',
  'app.doc.slot.similarity': '最も近い品種との類似度',
  'app.doc.slot.markersCompared': '比較したマーカー数',
  'app.doc.slot.markersDiffering': '異なるマーカー数',
  'app.doc.slot.varietiesCompared': '比較した品種数',
  'app.doc.nums.badWhole': '整数で入力してください（例：5103）。',
  'app.claim.boundBadWhole': '整数で入力してください。',

  'app.attest.title': '検査機関の署名',
  'app.attest.text':
    'これらの数値を測定した検査機関に署名してもらいましょう。そうすれば、あなたが証明する内容は、あなたが入力した数値ではなく、その検査機関が署名した数値についてのものになります。',
  'app.attest.request': '検査機関への依頼ファイルをダウンロード',
  'app.attest.requestWarn':
    '依頼ファイルには、これらの数値と、それを確認するために必要な情報が含まれています。検査機関にだけ送ってください。',
  'app.attest.how': '検査機関は {site}/lab でそれを開き、自らの報告書と数値を照合して、署名ファイルを送り返します。',
  'app.attest.add': '検査機関の署名を追加',
  'app.attest.addOther': '別の署名を追加',
  'app.attest.signedBy': '検査機関の鍵 {key} で署名されています。',
  'app.attest.fileSays': '署名ファイルでは「{name}」と書かれていますが、これは単なる表示名です。大切なのは鍵です。',
  'app.attest.publishText': 'コピーするリンクで署名を示せるよう、署名をMidnight上に公開してください。',
  'app.attest.publish': 'Midnight上に公開する',
  'app.attest.publishing': '公開中…',
  'app.attest.published':
    'ブロック {block} でMidnight上に公開しました。「証明した内容」からコピーするリンクに、署名が含まれるようになりました。',
  'app.attest.stale': 'この記録に保存された署名が、記録と一致しなくなっています。もう一度追加してください。',
  'app.attest.added': '署名を確認し、追加しました。',

  'app.claim.labSigned': '検査機関の鍵 {key} がこれらの数値に署名しており、リンクにはその署名が含まれます。',

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
  'app.claim.check.labKey': '検査機関の鍵',
  'app.claim.check.labFailed':
    '検査機関の署名は確認できませんでした：{reason} 数値は保有者自身が入力したものとして扱ってください。',
  'app.claim.check.whatLab':
    'これが示すこと：その記録に封印された数値が上限・下限を満たしている（またはその値である）こと、そして上の鍵がその記録の数値に署名したこと。示さないこと：その鍵が誰のものか、証明書が本物かどうか。数値について証明した上限・下限はすべて公開され、合わせると数値の範囲が絞られます。',

  'app.labsign.title': '検査機関として数値に署名する',
  'app.labsign.intro':
    '依頼ファイルが届きました。中の数値を自らの報告書と照合してから署名してください。あなたの署名があれば、依頼者は「最も近い品種との類似度は95 %以下」のような、ひとつの数値についての事実を、他の数値を見せずに、あなたの検査機関が署名した数値として証明できます。',
  'app.labsign.private':
    'すべてこのブラウザ内で行われます。鍵と依頼ファイルがこのコンピューターから出ることはありません。',
  'app.labsign.key.title': '検査機関の鍵',
  'app.labsign.key.none':
    '鍵は一度だけ作成し、すべての署名に同じ鍵を使ってください。そうすれば公開する鍵が変わりません。',
  'app.labsign.key.name': '検査機関名（自分のファイル用の表示名）',
  'app.labsign.key.make': '新しい鍵を作成',
  'app.labsign.key.open': '鍵ファイルを開く',
  'app.labsign.key.made':
    '鍵ファイルを保存しました。外部に漏らさず、バックアップを取ってください。このファイルを持つ人は誰でも、あなたの検査機関として署名できます。紛失した場合は、新しい鍵を作成して公開し直してください。',
  'app.labsign.key.using': '「{name}」の鍵で署名します。',
  'app.labsign.key.public': '公開鍵',
  'app.labsign.key.publish':
    'これをウェブサイトや報告書に掲載してください。主張を確認する人は、表示された鍵とこの鍵を照合して、あなたの署名だと確かめます。',
  'app.labsign.key.copy': '公開鍵をコピー',
  'app.labsign.key.copied': 'コピーしました。',
  'app.labsign.req.title': '依頼内容',
  'app.labsign.req.needKey': '先に鍵を作成するか、開いてください。',
  'app.labsign.req.open': '依頼ファイルを開く',
  'app.labsign.req.what':
    'すべての行を報告書と照合してください。数値と書類の詳細、そのすべてに署名することになります。',
  'app.labsign.req.k.title': '書類',
  'app.labsign.req.k.type': '種類',
  'app.labsign.req.k.about': '対象',
  'app.labsign.req.k.issuer': '発行者',
  'app.labsign.req.k.reference': '参照番号',
  'app.labsign.req.k.holder': '保有者',
  'app.labsign.req.k.issued': '記載日',
  'app.labsign.req.k.form': '様式',
  'app.labsign.req.k.notes': 'メモ',
  'app.labsign.req.k.files': 'ファイル（コードのみ）',
  'app.labsign.req.confirm': 'すべての数値を当機関の報告書と照合し、当機関のものであることを確認しました。',
  'app.labsign.req.sign': '署名して署名ファイルを保存',
  'app.labsign.req.done':
    '署名しました。依頼ファイルを送ってきた相手に、署名ファイルを送り返してください。署名ファイルに数値は含まれず、署名だけが入っています。',
  'app.labsign.req.keep': '依頼ファイルには数値が含まれています。他の人に渡さないでください。',
} satisfies Partial<AppTranslation>;
