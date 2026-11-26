// Japanese (です/ます). 電波がないときの使い方と、すぐに付くタイムスタンプ (docs/offline.md)。
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const offline = {
  'app.offline.sealedHere':
    'この端末で{time}に封印しました（この端末の時計による時刻、未確認）。日付は送信されたときに付きます。',
  'app.offline.short': '{time}に封印、送信時に日付',
  'app.offline.goesBySelf': 'オンラインに戻ると、証明コードが自動で送信されます。',
  'app.offline.bar':
    '電波がありません。記録の作成と封印はできます。日付は送信されたときに付きます。確認、共有、ラボへの送付、鍵の日付スタンプは電波が戻るまで待ちます。',
  'app.offline.updated':
    'VeilCoreの新しいバージョンの準備ができました。記録の作業の合間に再読み込みしてください。封印済みのものは失われません。',
  'app.offline.reload': '再読み込み',
  'app.offline.stampWaits': '鍵の日付スタンプは待機し、オンラインに戻ると自動で始まります。',

  'app.install.title': '電波がなくてもVeilCoreを使う',
  'app.install.text':
    'VeilCoreをホーム画面に追加してください。電波がなくても開き、記録を作成して封印できます。日付は送信されたときに付きます。',
  'app.install.button': 'ホーム画面に追加',
  'app.install.iosSteps': 'iPhoneまたはiPadの場合：Safariで共有をタップし、「ホーム画面に追加」を選びます。',
  'app.install.iosEmpty':
    'まず電波のある場所で、Safariで待っている送信を済ませてください。ホーム画面のアイコンはデータを別に保存するため、最初は空の状態で開きます。記録はSafariに安全に残っています。電波のある場所でアイコンを開き、この端末の解除方法またはバックアップファイルで記録を戻してください。それ以降はアイコンを使ってください。Safariで作った記録はそこには表示されません。',
  'app.install.iosKeep':
    'Safariは7日間開かれていないサイトのデータを消すことがあります。ホーム画面のアイコンは残ります。それでもバックアップは保管してください。',
  'app.install.ready':
    'このブラウザにはVeilCoreのアプリがあるため、ここでは電波がなくても開きます。記録のためのバックアップは引き続き必要です。',
  'app.install.dismiss': '今はしない',
  'app.install.showHow': 'やり方を見る',
  'app.install.gotIt': 'わかりました',
  'app.install.offer': 'VeilCoreのコピーをこの端末に保存すると、電波がなくても開けます。',
  'app.install.offerSize':
    '最初に一度だけ約{size}をダウンロードします。その後の更新では、変わった部分だけを取得します。',
  'app.install.get': 'VeilCoreをオフラインで使えるようにする',
  'app.install.getting': '電波がなくても使えるようにVeilCoreをダウンロードしています。このまま作業を続けられます。',

  'app.instant.pending':
    '{tsa}によるタイムスタンプ：{time} — Midnight（ブロックチェーン）での日付は次のバッチで付きます。',
  'app.instant.also': '{tsa}によるタイムスタンプもあります：{time}。',
  'app.instant.asking': 'タイムスタンプ局にタイムスタンプを依頼しています…',
  'app.instant.fact':
    '{tsa}のタイムスタンプ：{time}。このページで、証明コードに対する署名が、このサイトが{tsa}の鍵として掲げる鍵によるものであることを確認しました。証明コードがその時刻までに存在していたことを示し、それより前のことは何も示しません。',
  'app.verify.who.tsa': 'タイムスタンプ（{tsa}）',
  'app.verify.who.tsa.checked': '{time}。このページで、このサイトがその局の鍵として掲げる鍵による署名を確認しました。',
  'app.verify.who.tsa.unbound':
    '{time}。このページで、このサイトがその局の鍵として掲げる鍵による署名を確認しましたが、受け取ったリンクには照合する証明コードが含まれていません。送信者に完全な確認リンクを求めてください。',
  'app.offline.goesOnOpen': '電波のある状態で次にVeilCoreを開いたときに、証明コードが送信されます。',
  'app.instant.disagree':
    '複数のタイムスタンプ局の時刻が5分を超えて食い違っています。記録の確認ページにそれぞれ表示されます。',
  'app.verify.who.tsa.disagree': 'これらのタイムスタンプは5分を超えて食い違っています。',
} satisfies Partial<AppTranslation>;
