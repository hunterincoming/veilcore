// Japanese. DRAFT: machine-assisted, to be checked by a fluent speaker before publishing
// (docs/translations/README.md). Terms as in ../../ja.ts, plus the app's: see ./index.ts.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const history = {
  'app.history.label': '育種の履歴（草稿）',
  'app.history.intro':
    'この植物と、ここで保有している紐付いた親を、記録ごとに1行で、各記録の日付スタンプと証拠バンドルとともにまとめます。品種登録の申請書に書き写すための草稿です。法的助言ではありません。',
  'app.history.notEarlier':
    '記録は、封印した日より前の日付を示しません。各段階をその時点で封印していれば、それぞれに日付が付きます。申請する週にまとめて書いた履歴は、書いただけの履歴と同じ価値しかありません。',
  'app.history.oneFile':
    '印刷できる育種の履歴（系統、続いて記録ごとに1行：あなたが示した日付、日付スタンプ、段階と選抜の目的、作出方法）を、米国のPVP申請、UPOV形式の質問票、日本の申請向けの見出しで1つのファイルにまとめます。VeilCoreが持っていない項目（均一性、安定性、変異体）の欄は空欄のままです。1ページのカバーノートに何を示し何を示さないかが書かれ、各記録の証拠バンドルも入っています。',
  'app.history.held.other': 'ここで保有している記録{count}件',
  'app.history.theirs.other': '、ほかの人が保有する紐付いた親{count}件（その人のものとして記載）',
  'app.history.named.other': '、記録のない親{count}件（名前のみ）',
  'app.history.leftOut.other': '、含めなかった記録{count}件（近いものから{max}件までです）',
  'app.history.end': '。',
  'app.history.notPut':
    '記録の鍵と検査報告書のファイルは入れません。植物に検査報告書が保存されている場合、その証拠バンドルには報告書のSHA-256と、それを植物に紐付けるコードが入るので、後でファイルを見せられた人は照合できます。VeilCoreは記録の内容を保証しません。草稿です。法的助言ではありません。',
  'app.history.downloaded':
    '{name}をダウンロードしました。まず中のCOVER-NOTE.htmlを開き、次にbreeding-history.htmlを印刷してください。',
  'app.history.locked.other': '、含めなかったロックされた記録{count}件（このブラウザに鍵がありません）',
} satisfies Partial<AppTranslation>;
