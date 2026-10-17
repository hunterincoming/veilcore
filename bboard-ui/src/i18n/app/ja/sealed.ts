// Japanese. DRAFT: machine-assisted, to be checked by a fluent speaker before publishing
// (docs/translations/README.md). Terms as in ../../ja.ts, plus the app's: see ./index.ts.
// "Locked" is ロック, as for lab reports.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const sealed = {
  'app.sealed.refuse.noKey':
    'このブラウザには記録を開く鍵がないため、何も保存していません。先にバックアップファイルを復元してください。',
  'app.sealed.refuse.mismatch': '証明コードと一致しないため、保存していません',
  'app.sealed.mismatch':
    'この記録は証明コードと一致しません。封印後に変更された可能性があります。今後、保存・送付・共有はされません。',
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
  'app.sealed.lockedAgreements.title.other': 'ロックされた契約 {count}件',
  'app.sealed.lockedAgreements.text':
    'このブラウザにはこれらの契約（ライセンス、ラボへの送付、ブリーダーとの共有）を開く鍵がありません。最新のバックアップファイルを復元してください。VeilCoreが代わりに開くことはできません。',
  'app.sealed.lockedAgreements.cantChange': 'ロックされた契約は変更も送付もできません。削除はできます。',
  'app.sealed.lockedAgreements.name': 'ロックされた契約',
  'app.sealed.lockedAgreements.deleteConfirm':
    '契約{id}をVeilCoreから削除しますか？このブラウザでは開けず、削除すると誰も元に戻せません。',
  'app.sealed.truncated':
    'VeilCoreから届いたのは記録の一部だけなので、ここに表示されていないものがあるかもしれません。ページを再読み込みして、もう一度試してください。',
  'app.sealed.unreadable.other': '{count}件の記録はこのバージョンで読めない形式で届いたため、表示していません。',
  'app.sealed.backupNeeded':
    '<b>新しいバックアップを保存してください。</b>記録は今、鍵でロックされています。バックアップを保存するまで、その鍵はこのブラウザにしかありません。バックアップファイルがなければ、ほかの場所では開けません。',
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
  'app.sealed.refuse.backupFirst':
    '記録がロックされる前に保存されたものです。先にバックアップを保存して確認してください。その後なら変更を保存できます',
  'app.sealed.refuse.tooLarge': '大きすぎて保存できません。メモを短くしてもう一度お試しください',
  'app.sealed.refuse.unknown':
    '記録を確認するためにVeilCoreに接続できなかったため、何も保存していません。少し後でもう一度お試しください。',
  'app.sealed.refuse.cantStore':
    'このブラウザは記録をロックする鍵を保管できない（プライベートウィンドウ、またはサイトデータがブロックされている）ため、何も保存していません',
  'app.sealed.tooLarge':
    'この記録は大きすぎて保存できません。メモを短くしてもう一度お試しください。入力した内容は失われていません。',
  'app.sealed.size.near': '{max} KB中{used} KBを使用しています。',
  'app.sealed.size.over': '大きすぎて保存できません。メモを短くしてください。',
  'app.sealed.older.pageTitle': 'この記録の古いコピー',
  'app.sealed.older':
    'サーバーが、このブラウザが最後に保存したものより古いこの記録のコピーを送ってきました。必要なコピーなら使い、そうでなければ削除してください。',
  'app.sealed.older.beforeLocking':
    'VeilCoreのサーバーが、ロックされる前のこの記録のコピーを送ってきました。このブラウザが最後に保存したものより古いコピーです。このブラウザはこれを使わず、再びロックもしません。削除はできます。',
  'app.sealed.older.agreement':
    'VeilCoreのサーバーが、このブラウザが最後に保存したものより古いこの契約のコピーを送ってきました。必要なコピーなら使い、そうでなければ削除してください。',
  'app.sealed.older.agreementBeforeLocking':
    'VeilCoreのサーバーが、ロックされる前のこの契約のコピーを送ってきました。このブラウザが最後に保存したものより古いコピーです。このブラウザはこれを使わず、再びロックもしません。削除はできます。',
  'app.sealed.olderKept.other':
    'サーバーが{count}件の記録の古いコピーを送ってきました。このブラウザは新しいコピーを残し、もう一度保存します。',
  'app.sealed.revMismatch.other':
    'サーバー上の{count}件の記録の版番号が、記録の中に鍵をかけて保存された番号と一致しませんでした。このブラウザは鍵のかかった番号に従い、記録をもう一度保存します。',
  'app.sealed.importLocked.other': 'ロックされた記録{count}件は、このブラウザに鍵がないため飛ばしました。',
  'app.sealed.backupBeforeLocking':
    '<b>バックアップを保存してください。</b>古い記録は、それを開く鍵がバックアップファイルに入った時点でロックされます。それまでは保存したときのままVeilCoreのサーバーにあり、VeilCoreが読める状態で、変更は保存できません。',
  'app.sealed.cantStore':
    'このブラウザは記録をロックする鍵を保管できません（プライベートウィンドウ、またはサイトデータがブロックされています）。そのため古い記録はロックされておらず、ここでは新しいものを保存できません。通常のウィンドウでVeilCoreを開いてください。',
  'app.sealed.lockedParents.other': '親の記録{count}件はこのブラウザでロックされているため、含めていません。',
  'app.sealed.backup.cantCheck':
    '記録がどの鍵を使っているか確認するためにVeilCoreに接続できなかったため、何も変更していません。オンラインのときにもう一度お試しください。',
  'app.sealed.err.handleTag':
    'このページとVeilCoreのサーバーが合っていません。ページを再読み込みしてもう一度お試しください。',
  'app.sealed.recv.restoreFirst':
    'このブラウザには記録を開く鍵がないため、受け取ったものを保存できません。先にバックアップファイルを復元してから、コードを使ってください。',
  'app.sealed.recv.cantCheck':
    '記録を確認するためにVeilCoreに接続できなかったため、何も受け取っていません。少し後でもう一度お試しください。',
  'app.sealed.recv.cantStore':
    'このブラウザは記録をロックする鍵を保管できない（プライベートウィンドウ、またはサイトデータがブロックされている）ため、何も受け取っていません。通常のウィンドウでVeilCoreを開いてください。',
  'app.sealed.recv.notFinished':
    '受け取りはしましたが、記録を保存できなかったため、何も署名していません：{error}。記録のページの「受け取りを完了」でもう一度お試しください。',
  'app.sealed.recv.failed': '受け取り中に問題が起きました：{error}',
  'app.sealed.recv.notAccepted':
    'この記録はまだVeilCoreに保存されていないため、署名するものがありません。先に受け取りを完了してください。',
  'app.sealed.recv.finishTitle': 'この配送はまだ完了していません',
  'app.sealed.recv.finishText':
    '受け取りはしましたが、記録はまだ保存されていません。下のラボコードを確認し（空ならもう一度貼り付けて）、完了してください。',
  'app.sealed.recv.finish': '受け取りを完了',
  'app.sealed.recv.finishing': '完了しています…',
  'app.sealed.recv.noRecord': 'その記録はこのブラウザにありません。',
  'app.sealed.recv.otherCode': 'そのコードは別の配送のものです。',
  'app.sealed.recv.offerMissing':
    'このコードについて、VeilCoreが送り主のロックされた情報を送ってこなかったため、記録は完了していません。後で記録のページの「受け取りを完了」をもう一度試すか、送り主に確認してください。',
  // Round 3: held saves, the lost-key path, older copies, grants listed before locking
  'app.sealed.agreementsBackupFirst':
    '先にバックアップを保存して確認してください。それまでは、ここで契約を作成・変更できません。',
  'app.sealed.backup.storageRefused':
    'このブラウザは今、何も保存できません（保存領域がいっぱいか、プライベートウィンドウで制限されています）。そのため何も変更していません。空き容量を作るか通常のウィンドウを使って、もう一度お試しください。',
  'app.sealed.backupFirstAction': '先にバックアップを保存して確認してください。その後なら実行できます。',
  'app.sealed.correctBackupFirst': '先にバックアップを保存して確認してください。その後なら、この記録を訂正できます。',
  'app.sealed.correctionLeft':
    '訂正{id}をVeilCoreから取り消せませんでした。ページを再読み込みして、記録を確認してください。',
  'app.sealed.grantAsk.text':
    '記録がロックされる前、この記録は次を共有していました：{keys}。あなたが許可するまで、再び共有されることはありません。',
  'app.sealed.grantAsk.yes': 'もう一度共有する',
  'app.sealed.grantAsk.no': '共有しない',
  'app.sealed.grantAsk.failed': '保存されませんでした：{error}',
  'app.sealed.grantDiffers.text':
    'VeilCoreのサーバーには、この記録と一緒に保管している共有設定とは別の設定が表示されています。何も変更していません。第三者に見せる方を選んでください。',
  'app.sealed.grantDiffers.open': '選ぶ',
  'app.sealed.importNotImported.other':
    'VeilCore上の{count}件の記録はロックされているか空になっており、ファイルから戻せなかったため、インポートしませんでした。',
  'app.sealed.lost.button': 'そのバックアップを持っていない',
  'app.sealed.lost.confirm':
    'そのバックアップファイルがなければ、これらのロックされた記録と契約は誰にも開けません。VeilCoreにも開けません。これらがVeilCoreにある間は、新しいものを何も保存できません。VeilCoreから削除して、新しい鍵を始めますか？元に戻せません。',
  'app.sealed.lost.done':
    '削除しました。新しい鍵の準備ができました。バックアップを保存して確認すると、新しい記録が保存されます。',
  'app.sealed.lost.failed': '何も削除していません：{error}',
  'app.sealed.lost.nothing': 'なくした鍵でロックされたものはここにありません',
  'app.sealed.older.use': 'このコピーを使う',
  'app.sealed.older.deleteConfirm':
    '{name}をVeilCoreから削除しますか？この古いコピーは、VeilCoreのサーバーにある唯一のコピーです。削除すると誰も元に戻せません。',
  'app.sealed.recv.backupFirst':
    'この記録は、記録がロックされる前に保存されたものです。先にバックアップを保存して確認してください。その後なら署名できます。',
  'app.sealed.recv.backupFirstClaim':
    '先にバックアップを保存して確認してから、コードを使ってください。まだ何も受け取っていません。',
  'app.sealed.recv.noAnswer':
    'VeilCoreから応答がありませんでした（{error}）。コードはこのブラウザに残しています。受け取れていれば、記録に「受け取りを完了」が表示されます。表示されなければ、もう一度お試しください。',
  'app.sealed.refuse.backupFirstNew': 'まだ何も保存していません。先にバックアップを保存して確認してください',
  'app.sealed.refuse.olderCopy':
    'VeilCoreには別のタブや端末で保存された新しいコピーがすでにあるため、この変更は保存されませんでした。新しいコピーを表示しています。必要なら、もう一度変更してください',
  'app.sealed.unsaved.backup':
    'まだ保存されていません。バックアップを保存して確認してください。それまでは、このブラウザにだけ残っています。',
  'app.sealed.unsaved.key':
    'まだ保存されていません。このブラウザには、VeilCore上のあなたの記録の鍵がありません。バックアップを復元するか、持っていなければ記録のページの「そのバックアップを持っていない」を使ってください。',
  'app.sealed.unsaved.retry':
    'まだVeilCoreに保存されていません。このブラウザに残し、次に保存するときにもう一度送ります。',
  'app.sealed.unsaved.short': 'まだ保存されていません。バックアップを保存してください',
  'app.sealed.unsaved.shortRetry': 'まだ保存されていません',
  'app.sealed.unsaved.discardConfirm':
    'この記録のためにこのブラウザが残しているものを破棄しますか？VeilCoreにはないため、元に戻せません。',
  'app.sealed.unsaved.discardNew': '削除する',
  'app.sealed.unsaved.discardChange': '変更を取り消す',
  'app.sealed.sendNotSaved':
    'この記録はまだVeilCoreに保存されていないため、送れません。先にバックアップを保存して確認してください。',
} satisfies Partial<AppTranslation>;
