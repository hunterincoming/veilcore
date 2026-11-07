// Die Datensatz-App auf Deutsch: der Offenlegungsbeleg vor jedem Schritt auf Midnight
// (../en/receipt.ts). ENTWURF: maschinell unterstützt, vor der Veröffentlichung von einer
// Muttersprachlerin oder einem Muttersprachler zu prüfen (docs/translations/README.md).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const receipt = {
  'app.receipt.title': 'Was dies auf Midnight stellt',
  'app.receipt.public': 'Wird auf Midnight öffentlich, dauerhaft (niemand, auch VeilCore nicht, kann es entfernen):',
  'app.receipt.private': 'Bleibt privat:',
  'app.receipt.when': 'Datum und Uhrzeit, zu der es auf Midnight eingeht. Alles oben bleibt dort dauerhaft.',
  'app.receipt.fact.yourRecord': 'Ein Code aus dem Schlüssel Ihres Datensatzes (nicht der Datensatz)',
  'app.receipt.fact.recovery': 'Ein Code aus Ihrem Sicherungsgeheimnis (nicht das Geheimnis)',
  'app.receipt.fact.newKey': 'Ein Code aus dem neuen Schlüssel des Datensatzes',
  'app.receipt.fact.otherRecord': 'Ein Code aus dem Schlüssel des anderen Datensatzes',
  'app.receipt.fact.issuerRecord': 'Ein Code aus dem Schlüssel des lizenzierten Datensatzes',
  'app.receipt.fact.challenge': 'Der einmalige Prüfauftrag der prüfenden Person',
  'app.receipt.fact.dnaReport': 'Ein Code aus dem DNA-Bericht (nicht der Bericht)',
  'app.receipt.fact.license': 'Ein Code aus der Lizenz (nicht ihre Bedingungen)',
  'app.receipt.fact.newLicense': 'Ein Code aus der Lizenz des neuen Inhabers',
  'app.receipt.fact.licenseEntry': 'Der Eintragscode der Lizenz in der öffentlichen Lizenzliste',
  'app.receipt.fact.slot': 'Die Platznummer der Lizenz in dieser Liste',
  'app.receipt.fact.presentation': 'Ein Einmalcode, den nur die prüfende Person zuordnen kann',
  'app.receipt.fact.listVersion': 'Welche Fassung der Lizenzliste gepasst hat',
  'app.receipt.fact.checkPassed': 'Dass die Prüfung bestanden wurde',
  'app.receipt.fact.obligation': 'Ein Code aus der Verpflichtung (nicht ihre Bedingungen)',
  'app.receipt.fact.certificate': 'Der Prüfcode des versiegelten Zertifikats',
  'app.receipt.fact.otherCertificate': 'Der Prüfcode des zweiten Zertifikats',
  'app.receipt.fact.certKind': 'Welche Art von Zertifikat es ist',
  'app.receipt.fact.line': 'Welche Zeile des Zertifikats',
  'app.receipt.fact.value':
    'Der Wert in dieser Zeile, vollständig. Er ist öffentlich und dauerhaft: Er lässt sich nicht zurücknehmen. Ein so veröffentlichtes genetisches Ergebnis (eine Übereinstimmung, ein Marker, eine Herdbuchnummer) kann für immer mit Ihnen in Verbindung gebracht werden.',
  'app.receipt.fact.limit': 'Die gewählte Grenze (nicht Ihre tatsächliche Zahl)',
  'app.receipt.fact.comparison': 'Ob es mindestens oder höchstens diese Grenze ist',
  'app.receipt.fact.mask': 'Welche Zeilen sich ändern durften',
  'app.receipt.fact.labKey':
    'Der öffentliche Schlüssel des Labors: welches Labor signiert hat. Labore führen diesen Schlüssel auf ihrer eigenen Website, also nennt er das Labor öffentlich.',
  'app.receipt.fact.signatureCheck': 'Zahlen, die zeigen, dass das Labor es wirklich ausgestellt hat',
  'app.receipt.fact.batch': 'Ein Code für einen ganzen Stapel von Datensätzen',
  'app.receipt.fact.timeLimit': 'Eine Zeitgrenze für die Lizenzliste',
  'app.receipt.fact.step': 'Welcher Schritt das war, und dass er die Codes oben miteinander verbindet',
  'app.receipt.fact.keyLink':
    'Dass der Schlüssel dieses Datensatzes, sein neuer Schlüssel und sein Sicherungsgeheimnis zusammengehören',
  'app.receipt.fact.moveCount': 'Wie oft der Schlüssel dieses Datensatzes gewechselt oder wiederhergestellt wurde',
  'app.receipt.fact.licenseLink': 'Dass diese Lizenz mit dem lizenzierten Datensatz verbunden ist, und ob sie gilt',
  'app.receipt.fact.licenseList': 'Dass sich die öffentliche Lizenzliste geändert hat',
  'app.receipt.fact.licenseCount': 'Wie viele Lizenzen dieser Datensatz hat',
  'app.receipt.fact.parentLink':
    'Dass diese beiden Datensätze als Elternteil und Nachkomme verbunden sind, dauerhaft: Eine Verknüpfung lässt sich nicht zurücknehmen, und die eigenen Eltern des Elternteils stehen dann fest.',
  'app.receipt.fact.obligationLink': 'Dass diese Verpflichtung mit jenem Datensatz verbunden ist',
  'app.receipt.fact.obligationCount': 'Wie viele Verpflichtungen dieser Datensatz hat',
  'app.receipt.stay.genetics': 'Genetik und DNA-Dateien verlassen dieses Gerät nie unverschlossen.',
  'app.receipt.stay.locked':
    'Name und Notizen gehen mit Ihrem Schlüssel verschlossen an das Register. Es kann sie nicht lesen.',
  'app.receipt.stay.kind':
    'Das Register sieht die Art des Datensatzes, seinen Prüfcode und die damit verbundenen Codes, und Verbindungen zwischen Datensätzen (woher einer kam, was ihn ersetzt hat). Wird ein Datensatz berichtigt, sieht es auch, welche Felder sich geändert haben und ab wann.',
} satisfies Partial<AppTranslation>;
