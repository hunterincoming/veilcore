// The record app in Japanese: claims on a laboratory's parentage result (../en/parentage.ts).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const parentage = {
  'app.parentage.offer.sireConflicts': '父との不一致数：{n}以下（ICARの適合）',
  'app.parentage.offer.damConflicts': '母との不一致数：{n}以下（ICARの適合）',
  'app.parentage.offer.trioConflicts': 'トリオでの不一致数：{n}以下（ICARの適合）',
  'app.parentage.offer.sireCompared': '父と比較したSNP数：{n}以上（ICARの最低数）',
  'app.parentage.offer.damCompared': '母と比較したSNP数：{n}以上（ICARの最低数）',
  'app.parentage.line.sireConflicts': '父との不一致数：{n}以下',
  'app.parentage.line.damConflicts': '母との不一致数：{n}以下',
  'app.parentage.line.trioConflicts': 'トリオでの不一致数：{n}以下',
  'app.parentage.line.sireCompared': '父と比較したSNP数：{n}以上',
  'app.parentage.line.damCompared': '母と比較したSNP数：{n}以上',
  'app.parentage.fixed':
    'これはICAR自身の基準値で、ラボの数から丸めた数ではありません。そのため、結果が「適合」の区分にあることだけを示します。',
  'app.parentage.bands.title': 'SNPによる親子判定のICAR 2023の区分',
  'app.parentage.bands.single': '片親との比較：不一致数0〜2は適合、3〜5は疑義、5を超えると否定です。',
  'app.parentage.bands.trio': 'トリオ（子、父、母）：不一致数0〜3は適合、4〜7は疑義、7を超えると否定です。',
  'app.parentage.bands.compared':
    '各個体で読み取れたSNPが185以上必要です。子と各親の両方で読み取れたSNPが175以上、トリオについては子・父・母の三頭すべてで読み取れたSNPが165以上必要です。',
  'app.parentage.bands.only':
    'ここで提示するのは「適合」の基準値だけで、丸めた値は提示しません。「5以下」は「疑義」の区分の上限にあたります。',
  'app.parentage.unmet.sireConflicts':
    'ラボによる父との不一致数が「適合」の区分にないため、父についてのクレームは提示しません。',
  'app.parentage.unmet.damConflicts':
    'ラボによる母との不一致数が「適合」の区分にないため、母についてのクレームは提示しません。',
  'app.parentage.unmet.trioConflicts':
    'ラボによるトリオでの不一致数が「適合」の区分にないため、トリオについてのクレームは提示しません。',
  'app.parentage.unmet.sireCompared':
    '父と比較したSNPがICARの最低数より少ないため、その最低数をクレームとして示すことはできません。',
  'app.parentage.unmet.damCompared':
    '母と比較したSNPがICARの最低数より少ないため、その最低数をクレームとして示すことはできません。',
  'app.parentage.all':
    'ここで証明できるICAR 2023の基準を示すには、五つすべてを証明し、すべてを含むリンクを一つコピーしてください。すべてのクレームが確認でき、ラボが数値を裏付けていれば、確認ページには、この結果がICAR 2023の親子判定基準のうち五つを満たすと表示されます。',
  'app.parentage.none': 'この結果には、ICARの適合基準を満たすものがないため、クレームは提示しません。',
  'app.parentage.cert.title': 'ICAR 2023の親子判定基準のうち五つを満たす',
  'app.parentage.cert.text':
    'ラボが署名した親子判定の結果で、Midnight上で日付を付けたものです。保有者は、遺伝子型も不一致数などの数値も見せずに、この結果がICAR 2023の不一致数の基準と、各親と比較したSNP数の最低数を満たすことを証明しました。遺伝子型を見たのはラボです。親子関係と矛盾しないことは、親子関係の証明ではありません。VeilCoreは何も検査していません。',
  'app.parentage.cert.bounds':
    '証明された内容：父との不一致数2以下、母との不一致数2以下、トリオでの不一致数3以下、子と各親の間で比較したSNP数175以上。証明されていない内容：ICARの最低数である、各個体で読み取れたSNP数185以上と、子・父・母の三頭すべてで読み取れたSNP数165以上。この様式にはそれらの欄がなく、適用するのはラボです。',
  'app.parentage.source.lab':
    'ラボが署名した結果による、ラボの数値です。数値であって、家畜登録団体の判断ではありません。',
  'app.parentage.limits.labSaw':
    'ラボは、現在と同じく、三頭の遺伝子型と不一致数などの数値を見ています。クレームはそれらをほかのすべての人から隠しますが、ラボからは隠しません。',
  'app.parentage.limits.descent':
    '親子関係と矛盾しないことは、親子関係の証明ではありません。本当の親と近い血縁の動物（たとえば父の全兄弟）でも通ることがあります。',
  'app.parentage.limits.which':
    'どの動物を検査したか（証明コード）、パネル、方法はラボの結果ファイルにあり、クレームには含まれません。クレームは結果についてのもので、動物自身の記録についてのものではありません。',
  'app.parentage.limits.sample':
    '結果が示すのは、それらの記録で送られた試料が示した内容です。目の前の動物が、試料を採った動物であることは示しません。',
  'app.parentage.limits.trioMin':
    'この様式には、各個体で読み取れたSNPの数（ICARの最低数185）や、子・父・母の三頭すべてで読み取れたSNPの数（トリオについてのICARの最低数165）の欄がありません。これらを適用するのはラボであり、どのクレームもそれを示しません。',
  'app.parentage.limits.society':
    '家畜登録団体の証明書ではありません。VeilCoreは何も検査しておらず、どのラボについても保証しません。',
  'app.parentage.unmet.trioParents':
    'ICARはトリオを両親がともに適合とされた後にのみ判定するため、トリオについてのクレームは提示しません。',
  'app.parentage.unmet.grade.sireConflicts': 'ラボは父を適合と判定していないため、父についてのクレームは提示しません。',
  'app.parentage.unmet.grade.damConflicts': 'ラボは母を適合と判定していないため、母についてのクレームは提示しません。',
  'app.parentage.unmet.grade.trioConflicts':
    'ラボはトリオを適合と判定していないため、トリオについてのクレームは提示しません。',
} satisfies Partial<AppTranslation>;
