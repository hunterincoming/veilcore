// The record app in Japanese: scanning a code into a box, and printing QR labels (../en/scan.ts).
// Terms: スキャン, QRコード, バーコード, ラベル, 確認ページ, 確認リンク, 証明コード, 記録ID, 耳標, 端末.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const scan = {
  'app.scan.buttonLabel': 'この入力欄にQRコードやバーコードをスキャンする',
  'app.scan.nfcLabel': 'この入力欄にNFCタグを読み取る',
  'app.scan.title': 'コードをスキャン',
  'app.scan.starting': 'カメラを起動しています…',
  'app.scan.point':
    'カメラをQRコードやバーコードに向けてください。読み取りはこの端末で行われ、読み取るために何も送信されません。',
  'app.scan.video': 'カメラの映像',
  'app.scan.denied':
    'カメラが許可されませんでした。このブラウザの設定でこのサイトにカメラを許可するか、コードを入力してください。',
  'app.scan.noCamera': 'この端末にカメラが見つかりません。コードを入力してください。',
  'app.scan.unsupported': 'このブラウザではここでカメラを使えません。コードを入力してください。',
  'app.scan.failed': 'カメラまたはコードの読み取りを開始できませんでした。コードを入力してください。',
  'app.scan.typeInstead': '手で入力する',
  'app.scan.done': '「{field}」にスキャンしました。先に進む前に確認してください。',
  'app.scan.notLabel':
    'このコードはVeilCoreのラベルではありません。ラベルのQRコードにカメラを向けるか、記録IDを手で入力してください。',
  'app.scan.nfcTitle': 'NFCタグを読み取る',
  'app.scan.nfcHold': 'タグを端末の背面にかざしてください。',
  'app.scan.nfcEmpty': 'このタグには文字もリンクもありません。番号を入力してください。',
  'app.scan.nfcOff': 'NFCがオフか、許可されていません。端末の設定でオンにするか、番号を入力してください。',
  'app.scan.readerHelp':
    '耳標用のBluetoothスティックリーダーの多くは、キーボードとしてこの端末とペアリングできます。お使いのリーダーができる場合は、この入力欄をタップしてから耳標を読み取ると、番号が入力されます。',
  'app.labels.open': 'QRラベルを印刷',
  'app.labels.openBatch': 'これらの記録のQRラベルを印刷',
  'app.labels.title': 'QRラベルを印刷',
  'app.labels.intro':
    '各ラベルのQRコードは、記録の確認ページ（確認リンクと同じページ）を開きます。チューブ、袋、鉢、ストローの容器に貼ってください。スマートフォンのカメラがあれば誰でも読み取れます。',
  'app.labels.made': 'ラベルはこの端末で作られます。作成や印刷のために何も送信されません。',
  'app.labels.which': 'どの記録か',
  'app.labels.all': 'すべて選択',
  'app.labels.none': '選択を解除',
  'app.labels.noneHere': '確認ページがある記録はまだありません。VeilCoreが記録を受け取ると確認ページができます。',
  'app.labels.notReady.other': 'このうち{count}件はまだ確認ページがないため、ラベルを作れません。',
  'app.labels.what': 'ラベルに載せる内容',
  'app.labels.showId': '短い記録IDと「スキャンして確認」',
  'app.labels.showName': '記録の名前も載せる',
  'app.labels.idNote':
    'QRコードに入るのは記録IDと証明コードだけで、どちらも確認ページで誰にでも表示されるものです。封印された内容がラベルに載ることはありません。',
  'app.labels.nameNote':
    '名前がラベルとQRコードに入るため、読み取った人には名前が見え、確認ページは名前が記録と一致するかを表示します。封印された記録のそれ以外の内容がラベルに載ることはありません。',
  'app.labels.size': 'ラベルの大きさ',
  'app.labels.size.thermal': '2×1インチ、1ページに1枚（ラベルプリンター）',
  'app.labels.size.letter': 'USレターの30面シート（Avery 5160の大きさ、2⅝×1インチ）',
  'app.labels.size.a4': 'A4の21面シート（Avery L7160の大きさ、63.5×38.1 mm）',
  'app.labels.skip': '最初のシートで使用済みのラベルの数',
  'app.labels.skipHelp': '左上から行ごとに数えます。その次から印刷するので、使いかけのシートを無駄にしません。',
  'app.labels.copies': '記録ごとのラベルの枚数',
  'app.labels.count.other': 'ラベル{count}枚',
  'app.labels.print': '印刷',
  'app.labels.printHelp':
    'ブラウザの印刷画面が開きます。ラベルの位置が合うよう、倍率は100%（実際のサイズ）、余白はなしを選んでください。最初に普通紙で1枚試し刷りしてください。',
  'app.labels.download': 'PDFをダウンロード',
  'app.labels.downloadHelp':
    'ラベルを用紙の実際のサイズのPDFとして保存します。PDFはこの端末で作られます。印刷するときは倍率100%（実際のサイズ）を選んでください。',
  'app.labels.downloadOpen': 'PDFを開く',
  'app.labels.downloadFailed': 'この端末ではPDFを作れませんでした。代わりに「印刷」を使ってください。',
  'app.labels.preview': '印刷されるラベル',
  'app.labels.pageOf': '{of}ページ中{n}ページ目',
  'app.labels.scanToCheck': 'スキャンして確認',
  'app.labels.back': '戻る',
} satisfies Partial<AppTranslation>;
