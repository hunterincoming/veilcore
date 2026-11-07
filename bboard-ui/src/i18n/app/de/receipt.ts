// Die Datensatz-App auf Deutsch: der Offenlegungsbeleg vor jedem Schritt auf Midnight
// (../en/receipt.ts). ENTWURF: maschinell unterstützt, vor der Veröffentlichung von einer
// Muttersprachlerin oder einem Muttersprachler zu prüfen (docs/translations/README.md).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const receipt = {
  'app.receipt.title': 'Was dies auf Midnight stellt',
  'app.receipt.public': 'Wird auf Midnight öffentlich:',
  'app.receipt.private': 'Bleibt privat:',
  'app.receipt.when': 'Datum und Uhrzeit, zu der es auf Midnight eingeht',
  'app.receipt.fact.yourRecord': 'Ein Code aus dem Schlüssel Ihres Datensatzes (nicht der Datensatz)',
  'app.receipt.fact.recovery': 'Ein Code aus dem Wiederherstellungsgeheimnis des Datensatzes',
  'app.receipt.fact.newKey': 'Ein Code aus dem neuen Schlüssel des Datensatzes',
  'app.receipt.fact.otherRecord': 'Ein Code aus dem Schlüssel des anderen Datensatzes',
  'app.receipt.fact.issuerRecord': 'Ein Code aus dem Schlüssel des lizenzierten Datensatzes',
  'app.receipt.fact.challenge': 'Der einmalige Prüfauftrag der prüfenden Person',
  'app.receipt.fact.dnaReport': 'Ein Code aus dem DNA-Bericht (nicht der Bericht)',
  'app.receipt.fact.licence': 'Ein Code aus der Lizenz (nicht ihre Bedingungen)',
  'app.receipt.fact.newLicence': 'Ein Code aus der Lizenz des neuen Inhabers',
  'app.receipt.fact.licenceEntry': 'Der Eintragscode der Lizenz in der öffentlichen Lizenzliste',
  'app.receipt.fact.slot': 'Die Platznummer der Lizenz in dieser Liste',
  'app.receipt.fact.presentation': 'Ein Einmalcode, den nur die prüfende Person zuordnen kann',
  'app.receipt.fact.listVersion': 'Welche Fassung der Lizenzliste gepasst hat',
  'app.receipt.fact.checkPassed': 'Dass die Prüfung bestanden wurde',
  'app.receipt.fact.obligation': 'Ein Code aus der Verpflichtung (nicht ihre Bedingungen)',
  'app.receipt.fact.certificate': 'Der Prüfcode des versiegelten Zertifikats',
  'app.receipt.fact.otherCertificate': 'Der Prüfcode des zweiten Zertifikats',
  'app.receipt.fact.certKind': 'Welche Art von Zertifikat es ist',
  'app.receipt.fact.line': 'Welche Zeile des Zertifikats',
  'app.receipt.fact.value': 'Der Wert in dieser Zeile, vollständig',
  'app.receipt.fact.limit': 'Die gewählte Grenze (nie die Zahl selbst)',
  'app.receipt.fact.comparison': 'Ob es mindestens oder höchstens diese Grenze ist',
  'app.receipt.fact.mask': 'Welche Zeilen sich ändern durften',
  'app.receipt.fact.labKey': 'Der öffentliche Signaturschlüssel des Labors',
  'app.receipt.fact.signatureCheck': 'Zahlen aus der Prüfung der Laborsignatur',
  'app.receipt.fact.batch': 'Ein Code für einen ganzen Stapel von Datensätzen',
  'app.receipt.fact.timeLimit': 'Eine Zeitgrenze für die Lizenzliste',
  'app.receipt.stay.genetics': 'Genetik und DNA-Dateien verlassen dieses Gerät nie.',
  'app.receipt.stay.locked':
    'Name und Notizen gehen mit Ihrem Schlüssel verschlossen an das Register. Es kann sie nicht lesen.',
  'app.receipt.stay.kind': 'Das Register sieht die Art des Datensatzes (Pflanze, Tier, Dokument) und seinen Prüfcode.',
} satisfies Partial<AppTranslation>;
