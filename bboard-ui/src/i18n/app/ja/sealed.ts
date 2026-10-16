// Japanese. DRAFT: machine-assisted, to be checked by a fluent speaker before publishing
// (docs/translations/README.md). Terms as in ../../ja.ts, plus the app's: see ./index.ts.
// "Locked" is ロック, as for lab reports.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const sealed = {
  'app.sealed.refuse.noKey':
    'このブラウザには記録を開く鍵がないため、何も保存していません。先にバックアップファイルを復元してください。',
  'app.sealed.refuse.mismatch': 'フィンガープリントと一致しないため、保存していません',
  'app.sealed.mismatch':
    'この記録はフィンガープリントと一致しません。封印後に変更された可能性があります。今後、保存・送付・共有はされません。',
  'app.sealed.locked.title.other': 'ロックされた記録 {count}件',
  'app.sealed.locked.pageTitle': 'この記録はロックされています',
  'app.sealed.locked.text':
    'このブラウザにはこれらの記録を開く鍵がありません。{date}より後に保存したバックアップファイルを復元してください。VeilCoreが代わりに開くことはできません。',
  'app.sealed.locked.textNoDate':
    'このブラウザにはこれらの記録を開く鍵がありません。最新のバックアップファイルを復元してください。VeilCoreが代わりに開くことはできません。',
  'app.sealed.locked.cantChange': 'ロックされた記録は変更も送付もできません。削除はできます。',
  'app.sealed.locked.restore': 'バックアップを復元する',
  'app.sealed.locked.unnamed': '名前のない記録',
  'app.sealed.locked.delete': '削除',
  'app.sealed.locked.deleteConfirm':
    '{name}をVeilCoreから削除しますか？このブラウザでは開けず、削除すると誰も元に戻せません。',
  'app.sealed.locked.deleted': '削除しました。',
  'app.sealed.locked.deleteFailed': '削除できませんでした：{error}',
  'app.sealed.truncated':
    'VeilCoreから届いたのは記録の一部だけなので、ここに表示されていないものがあるかもしれません。ページを再読み込みして、もう一度試してください。',
  'app.sealed.unreadable.other': '{count}件の記録はこのバージョンで読めない形式で届いたため、表示していません。',
  'app.sealed.backupNeeded':
    '<b>新しいバックアップを保存してください。</b>記録は今、このブラウザだけが持つ鍵でロックされています。バックアップファイルがなければ、ほかの場所では開けません。',
  'app.sealed.err.newCode':
    'このコードは送付がロックされる前に作られたもので、もう使えません。送り主に新しいコードを依頼してください。',
  'app.sealed.recv.missingKey':
    'このコードは最後の部分が欠けています。受け取ることはできますが、送り主の情報（誰がいつ育成したか）は届きません。先に完全なコードを依頼してください。',
  'app.sealed.recv.notOpened': 'このコードでは送り主の情報を開けなかったため、名前だけが届きました。',
  'app.sealed.backup.noVaultKey':
    'そのバックアップには記録を開く鍵が入っていません。新しく保存して、それを確認してください。',
  'app.sealed.backup.differentVault': 'このブラウザはすでに別の鍵で記録を開いています。何も変更していません。',
  'app.sealed.backup.olderFile':
    'このファイルは記録がロックされる前のものなので、その鍵が入っていません。それ以降にロックされた記録は、新しいバックアップファイルを開くまでロックされたままです。',
} satisfies Partial<AppTranslation>;
