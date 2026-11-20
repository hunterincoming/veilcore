// Japanese (です/ます). 電波がないときの使い方と、すぐに付くタイムスタンプ (docs/offline.md)。
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const offline = {
  'app.offline.sealedHere.phone':
    'このスマートフォンで{time}に封印しました（スマートフォンの時計による時刻）。日付は送信されたときに付きます。',
  'app.offline.sealedHere.computer':
    'このパソコンで{time}に封印しました（パソコンの時計による時刻）。日付は送信されたときに付きます。',
  'app.offline.short': '{time}に封印、送信時に日付',
  'app.offline.goesBySelf': '今は電波がありません。オンラインに戻ると自動で送信され、そのときに日付が付きます。',
  'app.offline.bar':
    '電波がありません。ここで記録を作成して封印することはできます。日付は送信されたときに付きます。確認、共有、日付スタンプはオンラインに戻るまで待ちます。',
  'app.offline.updated': 'VeilCoreの新しいバージョンの準備ができました。',
  'app.offline.reload': '再読み込み',
  'app.offline.stampWaits': '電波がありません。鍵の日付スタンプは待機し、オンラインに戻ると自動で始まります。',

  'app.install.title': '電波がなくてもVeilCoreを使う',
  'app.install.text':
    'VeilCoreをホーム画面に追加してください。電波がなくても開き、記録を作成して封印できます。日付はオンラインに戻ったときに付きます。',
  'app.install.button': 'ホーム画面に追加',
  'app.install.iosSteps': 'iPhoneまたはiPadの場合：Safariで共有をタップし、「ホーム画面に追加」を選びます。',
  'app.install.iosEmpty':
    'ホーム画面のアプリはSafariとは別にデータを保存するため、最初は空の状態で開きます。電波のある場所で一度開き、そこで記録を戻してください（Face IDまたはバックアップファイル）。先に、Safariでまだ待っている送信を済ませてください。',
  'app.install.iosKeep':
    'ホーム画面のVeilCoreは、Safariが7日間開かれていないサイトのデータを消すようには消されません。それでもバックアップは保管してください。',
  'app.install.ready': 'このブラウザにはVeilCoreのコピーがあるため、ここでは電波がなくても開きます。',
  'app.install.dismiss': '今はしない',

  'app.instant.pending': '{tsa}によるタイムスタンプ：{time} — Midnightでの日付は次のバッチで付きます。',
  'app.instant.also': '{tsa}によるタイムスタンプもあります：{time}。',
  'app.instant.asking': 'タイムスタンプ局にタイムスタンプを依頼しています…',
  'app.instant.fact':
    '{tsa}のタイムスタンプ：{time}。このページで証明コードに対する署名を確認しました。証明コードがその時刻までに存在していたことを示し、それより前のことは示しません。',
  'app.verify.who.tsa': 'タイムスタンプ（{tsa}）',
  'app.verify.who.tsa.checked': '{time}、タイムスタンプ局の署名。このページで署名を確認しました。',
  'app.verify.who.tsa.unbound':
    '{time}、タイムスタンプ局の署名。このページで署名を確認しましたが、受け取ったリンクには照合する証明コードが含まれていません。',
} satisfies Partial<AppTranslation>;
