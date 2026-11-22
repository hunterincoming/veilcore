// Japanese (です/ます). アプリを開いたときの確認 (veilcore/record-watch.ts)。
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const watch = {
  'app.watch.this': 'この記録について、このブラウザ以外からネットワーク上で変更がありました。',
  'app.watch.home.other': 'あなたの記録{count}件について、このブラウザ以外からネットワーク上で変更がありました。',
  'app.watch.change.recovered': '復旧用の秘密が使われ、新しい鍵に移されました。',
  'app.watch.change.moved': '新しい鍵に移されました。',
  'app.watch.change.recovery-replaced': '新しい鍵に移すための秘密が置き換えられました。',
  'app.watch.what': 'すべきこと',
  'app.watch.hide': 'すべきことを閉じる',
  'app.watch.step.you': 'ご自身が別の端末やVeilCoreのコマンドラインツールで行ったのであれば、問題はありません。',
  'app.watch.step.copy':
    'そうでなければ、このブラウザの鍵やバックアップファイルのコピーを誰かが持っているおそれがあります。このコンピュータが点検されるまでVeilCoreに使わないでください。また、ここで復旧シートを入力しないでください。',
  'app.watch.step.files': 'バックアップファイルはオフラインで保管し、それぞれにパスワードを付けてください。',
  'app.watch.step.date': '記録に最初にスタンプされた日付はネットワーク上に残ります。誰にも変えられません。',
  'app.watch.step.help':
    'このサイトではまだ記録を取り戻せません。<mail>VeilCoreに連絡</mail>し、どの記録かお知らせください。鍵、バックアップファイル、復旧シートは決して送らないでください。',
  'app.watch.open': '「{name}」を開く',
  'app.watch.seen': '自分で行いました',
} satisfies Partial<AppTranslation>;
