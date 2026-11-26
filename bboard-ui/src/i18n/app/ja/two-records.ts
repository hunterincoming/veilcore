// 記録アプリの日本語：同じ保有者の二つの記録についての証明（../en/two-records.ts）。
// 下書き：機械支援。公開前にネイティブ話者の確認が必要（docs/translations/README.md）。
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const twoRecords = {
  'app.tworec.more.title': 'ほかの証明のしかた',
  'app.tworec.more.text': 'この記録に封印した数値を、数値を見せずに、あなたの別の記録と比べます。',
  'app.tworec.more.distinct': 'この二つの記録が異なることを示す',
  'app.tworec.more.unchanged': '訂正が、記載した項目だけを変えたことを示す',

  'app.tworec.status.notYet': '作成済みですが、Midnightのメインネットワークではまだ実行していません。',
  'app.tworec.status.ran': 'これはMidnightのメインネットワークで実行済みです。',
  'app.tworec.unpaid':
    'このサイトからはまだ送信できません。VeilCoreの手数料サービスが、この二つの証明の手数料をまだ支払っていないためです。何が証明されるかは確認できます。何も送信しません。',
  'app.tworec.what': '証明すること',
  'app.tworec.this': 'この記録',
  'app.tworec.other': 'もう一方の記録',
  'app.tworec.original': 'この記録が訂正する、以前の記録',
  'app.tworec.none': 'フォーム「{schema}」の数値を持つ記録は、ほかにありません。先にもう一つ封印してください。',
  'app.tworec.distinct.text':
    '二つの記録が、そのフォームで比べる数値のうち少なくとも{k}個で異なることを証明します。どの数値が、どれだけ、いくつ異なるかは示しません。この個数はフォームが決めており、選ぶことはできません。',
  'app.tworec.unchanged.text':
    '訂正で変えてよかった数値にチェックを入れてください。それ以外の数値がすべて二つの記録で同じであることを証明します。チェックしたリストは公開され、数値は公開されません。',
  'app.tworec.unchanged.list': '変えてよい数値',
  'app.tworec.unchanged.changed': '{label}（変更あり）',
  'app.tworec.preview.distinct':
    'これで証明されること：この二つの記録は、そのフォームで比べる数値のうち少なくとも{k}個で異なる。',
  'app.tworec.preview.unchanged': 'これで証明されること：{list}を除き、この記録の数値はすべて以前の記録と同じ。',
  'app.tworec.preview.unchangedNone': 'これで証明されること：この記録の数値はすべて以前の記録と同じ。',
  'app.tworec.refuse.noNumbers': 'これらの記録のどちらかに、封印した数値がありません。',
  'app.tworec.refuse.notOffered':
    'この種類の記録は、この方法では比べられません。使えるのは、次のフォームであなた自身が入力した数値です：{forms}。',
  'app.tworec.refuse.sameRecord': '同じ記録です。別の記録を選んでください。',
  'app.tworec.refuse.otherForm': '二つの記録は別のフォームを使っているため、数値を比べられません。',
  'app.tworec.refuse.tooFew':
    'この二つの記録で異なる比較対象の数値は{n}個で、少なくとも{k}個必要なため、証明できません。何も送信していません。',
  'app.tworec.refuse.undeclared':
    '{list}が変わっていますが、チェックが入っていません。チェックを入れないと証明できません。何も送信していません。',
  'app.tworec.refuse.saysNothing':
    'すべての数値にチェックを入れると、何も示しません。少なくとも一つはチェックを外してください。',
  'app.tworec.err.unpaid': 'VeilCoreの手数料サービスはこの証明の手数料をまだ支払っていないため、何も送信していません。',
  'app.tworec.err.deviceOnly': 'この端末だけに保管した記録は、この方法では比べられません。何も送信していません。',
  'app.tworec.err.tooFew':
    'この二つの記録は、比較対象の数値で十分に異なっていないため、証明できません。何も送信していません。',
  'app.tworec.err.undeclared': 'リストにない数値が変わっているため、証明できません。何も送信していません。',
  'app.tworec.err.otherRecords': 'そのクレームは別の記録についてのものです。',
  'app.tworec.err.otherList': 'そのクレームでは、別の数値を変えてよいことになっていました。',
  'app.tworec.err.listSaysNothing': 'そのクレームはすべての数値の変更を認めているため、何も示しません。',
  'app.tworec.err.notTwo':
    'その取引は、VeilCoreのクレーム用スマートコントラクト上の、二つの記録についての単一のクレームではありません。',
  'app.tworec.tie':
    '二つの記録のコードはMidnightに置かれ、VeilCoreと、どちらかの記録の確認リンクを持つ人は、この証明をそれらと結び付けることができます。VeilCoreは、それらに日付を付けた保有者キーとも結び付けることができます。',
  'app.tworec.made': '二つの記録について証明したこと',
  'app.tworec.line.distinct': '{a}と{b}は、そのフォームで比べる数値のうち少なくとも{k}個で異なる',
  'app.tworec.line.unchanged': '{b}の数値は、{list}を除き{a}と同じ',
  'app.tworec.line.unchangedNone': '{b}の数値は{a}と同じ',

  'app.tworec.not.title': 'これで示されないこと',
  'app.tworec.not.examine':
    'これは数であって、判断ではありません。二つの品種やロットが区別できるかどうかは、審査機関など、それを審査する人が判断します。これはその審査に代わるものではありません。',
  'app.tworec.not.which': 'どの数値が、どれだけ、いくつ異なるかは示しません。',
  'app.tworec.not.typed': '数値は保有者が入力したものです。どのラボも署名していません。',
  'app.tworec.not.reference':
    'もう一方の記録は保有者が選びました。公正に比べるには、保有者以外の人が比べる記録を指定するべきです。',
  'app.tworec.not.oneParty':
    '保有者は両方の記録を保有しています。どちらも相手に見せない数値を、二人で比べることはできません。',
  'app.tworec.not.correction': 'どちらの記録が訂正なのか、また一方が他方に置き換わったことは示しません。',
  'app.tworec.not.ticked': 'リストにある数値は、変わっている場合も変わっていない場合もあります。',
  'app.tworec.not.onlyNumbers': '対象は封印した数値だけで、記録のほかの内容やファイルは含みません。',
  'app.tworec.not.sealed': '二つの記録を封印した時点のものについてであり、どちらかが現在も有効かどうかは示しません。',

  'app.tworec.check.title': '二つの記録についての証明を確認する',
  'app.tworec.check.intro':
    '封印された二つの記録の数値について、数値を見せずに事実を示すため、このリンクが送られてきました。このページはMidnight上の証明を読み取り、確認します。',
  'app.tworec.check.distinct':
    'この二つの記録は、封印した時点で、そのフォームで比べる数値のうち少なくとも{k}個で異なります。',
  'app.tworec.check.unchanged': '{list}を除き、二つ目の記録の数値は一つ目と同じです。',
  'app.tworec.check.unchangedNone': '二つ目の記録の数値は一つ目と同じです。',
  'app.tworec.check.first': '一つ目の記録',
  'app.tworec.check.second': '二つ目の記録',
  'app.tworec.check.earlier': '以前の記録（保有者の申告による）',
  'app.tworec.check.correction': '訂正（保有者の申告による）',
} satisfies Partial<AppTranslation>;
