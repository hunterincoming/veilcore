// Japanese (です/ます). 電波がないときの使い方と、すぐに付くタイムスタンプ (docs/offline.md)。
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const offline = {
  'app.offline.sealedHere.phone':
    'このスマートフォンで{time}に封印しました（スマートフォンの時計による時刻）。日付は送信されたときに付きます。',
  'app.offline.sealedHere.computer':
    'このパソコンで{time}に封印しました（パソコンの時計による時刻）。日付は送信されたときに付きます。',
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
    'まず電波のある場所で、Safariで待っている送信を済ませてください。ホーム画面のアイコンはデータを別に保存するため、最初は空の状態で開きます。記録はSafariに安全に残っています。電波のある場所でアイコンを開き、Face IDまたはバックアップファイルで記録を戻してください。それ以降はアイコンを使ってください。Safariで作った記録はそこには表示されません。',
  'app.install.iosKeep':
    'Safariは7日間開かれていないサイトのデータを消すことがあります。ホーム画面のアイコンは残ります。それでもバックアップは保管してください。',
  'app.install.ready':
    'このブラウザにはVeilCoreのアプリがあるため、ここでは電波がなくても開きます。記録のためのバックアップは引き続き必要です。',
  'app.install.dismiss': '今はしない',

  'app.instant.pending':
    '{tsa}（鍵に記された名前）によるタイムスタンプ：{time} — Midnight（ブロックチェーン）での日付は次のバッチで付きます。',
  'app.instant.also': '{tsa}（鍵に記された名前）によるタイムスタンプもあります：{time}。',
  'app.instant.asking': 'タイムスタンプ局にタイムスタンプを依頼しています…',
  'app.instant.fact':
    '{tsa}という名前の鍵によるタイムスタンプ（名前は未確認）：{time}。このページで証明コードに対する署名を確認しました。証明コードがその時刻までに存在していたことを示し、それより前のことは何も示しません。',
  'app.verify.who.tsa': 'タイムスタンプ（{tsa}）',
  'app.verify.who.tsa.checked':
    '{time}。このページで署名を確認しました。名前は鍵自身が記したもので、鍵の発行元はここでは確認していません。',
  'app.verify.who.tsa.unbound':
    '{time}。このページで署名を確認しましたが、受け取ったリンクには照合する証明コードが含まれていません。送信者に完全な確認リンクを求めてください。',
  'app.offline.goesOnOpen': '電波のある状態で次にVeilCoreを開いたときに、証明コードが送信されます。',
} satisfies Partial<AppTranslation>;
