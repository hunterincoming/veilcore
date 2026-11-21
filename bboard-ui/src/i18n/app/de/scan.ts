// The record app in German: scanning a code into a box, and printing QR labels (../en/scan.ts).
// Terms: scannen, QR-Code, Barcode, Etikett, Prüfseite, Prüflink, Prüfcode, Ohrmarke, Datensatz, Sie.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const scan = {
  'app.scan.buttonLabel': 'Einen QR-Code oder Barcode in dieses Feld scannen',
  'app.scan.nfcLabel': 'Ein NFC-Tag in dieses Feld einlesen',
  'app.scan.title': 'Einen Code scannen',
  'app.scan.starting': 'Die Kamera wird geöffnet…',
  'app.scan.point':
    'Richten Sie die Kamera auf den QR-Code oder Barcode. Er wird auf diesem Gerät gelesen; zum Lesen wird nichts gesendet.',
  'app.scan.video': 'Kamerabild',
  'app.scan.denied':
    'Die Kamera wurde nicht erlaubt. Sie können sie in den Einstellungen dieses Browsers für diese Website erlauben oder den Code eintippen.',
  'app.scan.noCamera': 'Auf diesem Gerät wurde keine Kamera gefunden. Tippen Sie den Code ein.',
  'app.scan.unsupported': 'Dieser Browser kann die Kamera hier nicht öffnen. Tippen Sie den Code ein.',
  'app.scan.failed': 'Die Kamera oder der Code-Leser konnte nicht starten. Tippen Sie den Code ein.',
  'app.scan.typeInstead': 'Lieber eintippen',
  'app.scan.done': 'In „{field}“ gescannt. Prüfen Sie es, bevor Sie weitermachen.',
  'app.scan.notLabel':
    'Dieser Code ist kein VeilCore-Etikett. Richten Sie die Kamera auf den QR-Code des Etiketts, oder tippen Sie die Datensatz-ID ein.',
  'app.scan.nfcTitle': 'Ein NFC-Tag einlesen',
  'app.scan.nfcHold': 'Halten Sie das Tag an die Rückseite des Handys.',
  'app.scan.nfcEmpty': 'Dieses Tag enthält keinen Text und keinen Link. Tippen Sie die Nummer ein.',
  'app.scan.nfcOff':
    'NFC ist aus oder wurde nicht erlaubt. Schalten Sie es in den Einstellungen des Handys ein, oder tippen Sie die Nummer ein.',
  'app.scan.readerHelp':
    'Viele Bluetooth-Stablesegeräte für Ohrmarken lassen sich als Tastatur mit diesem Gerät koppeln. Wenn Ihres das kann: Tippen Sie auf dieses Feld und lesen Sie die Ohrmarke, dann wird die Nummer eingetragen.',
  'app.labels.open': 'Ein QR-Etikett drucken',
  'app.labels.openBatch': 'QR-Etiketten für diese Datensätze drucken',
  'app.labels.title': 'QR-Etiketten drucken',
  'app.labels.intro':
    'Jedes Etikett hat einen QR-Code, der die Prüfseite des Datensatzes öffnet, dieselbe Seite wie sein Prüflink. Kleben Sie es auf Röhrchen, Beutel, Topf oder Paillettenbehälter; jeder mit einer Handykamera kann es scannen.',
  'app.labels.made': 'Die Etiketten entstehen auf diesem Gerät. Zum Erstellen oder Drucken wird nichts gesendet.',
  'app.labels.which': 'Welche Datensätze',
  'app.labels.all': 'Alle auswählen',
  'app.labels.none': 'Auswahl aufheben',
  'app.labels.noneHere':
    'Noch keiner Ihrer Datensätze hat eine Prüfseite. Ein Datensatz bekommt sie, sobald VeilCore ihn hat.',
  'app.labels.notReady.one': '{count} davon hat noch keine Prüfseite und kann deshalb kein Etikett haben.',
  'app.labels.notReady.other': '{count} davon haben noch keine Prüfseite und können deshalb keine Etiketten haben.',
  'app.labels.what': 'Was auf dem Etikett steht',
  'app.labels.showId': 'Die kurze Datensatz-ID und „Zum Prüfen scannen“',
  'app.labels.showName': 'Auch der Name des Datensatzes',
  'app.labels.idNote':
    'Der QR-Code enthält nur die Datensatz-ID und ihren Prüfcode, die die Prüfseite jedem zeigt. Nichts Versiegeltes steht je auf einem Etikett.',
  'app.labels.nameNote':
    'Der Name kommt auf das Etikett und in seinen QR-Code: Wer es scannt, sieht den Namen, und die Prüfseite sagt, ob er zum Datensatz passt. Sonst kommt nichts aus dem versiegelten Datensatz auf ein Etikett.',
  'app.labels.size': 'Etikettengröße',
  'app.labels.size.thermal': '2 × 1 Zoll, ein Etikett pro Seite (Etikettendrucker)',
  'app.labels.size.letter': 'US-Letter-Bogen mit 30 (Größe Avery 5160, 2⅝ × 1 Zoll)',
  'app.labels.size.a4': 'A4-Bogen mit 21 (Größe Avery L7160, 63,5 × 38,1 mm)',
  'app.labels.skip': 'Schon benutzte Etiketten auf dem ersten Bogen',
  'app.labels.skipHelp':
    'Gezählt Zeile für Zeile von oben links. Der Druck beginnt danach, so wird ein angebrochener Bogen nicht verschwendet.',
  'app.labels.copies': 'Etiketten pro Datensatz',
  'app.labels.count.one': '{count} Etikett',
  'app.labels.count.other': '{count} Etiketten',
  'app.labels.print': 'Drucken',
  'app.labels.printHelp':
    'Das Druckfenster Ihres Browsers öffnet sich. Wählen Sie 100 % oder „Tatsächliche Größe“ und keine Ränder, damit die Etiketten passen. Drucken Sie zuerst einen Probebogen auf Normalpapier.',
  'app.labels.download': 'PDF herunterladen',
  'app.labels.downloadHelp':
    'Speichert die Etiketten als PDF in der tatsächlichen Größe des Bogens, erstellt auf diesem Gerät. Drucken Sie es mit 100 % oder „Tatsächliche Größe“.',
  'app.labels.downloadOpen': 'Nichts gespeichert? PDF öffnen',
  'app.labels.downloadFailed':
    'Das PDF konnte auf diesem Gerät nicht erstellt werden. Nutzen Sie stattdessen „Drucken“.',
  'app.labels.preview': 'So werden die Etiketten gedruckt',
  'app.labels.pageOf': 'Seite {n} von {of}',
  'app.labels.scanToCheck': 'Zum Prüfen scannen',
  'app.labels.back': 'Zurück',
} satisfies Partial<AppTranslation>;
