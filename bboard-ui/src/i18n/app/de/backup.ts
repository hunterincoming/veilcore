// German (Sie). DRAFT: machine-assisted, to be checked by a fluent speaker before publishing
// (docs/translations/README.md). Terms as in ../../de.ts.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const backup = {
  'app.backup.title': 'Sicherungskopie speichern',
  'app.backup.done': 'Fertig',
  'app.backup.shareTitle': 'VeilCore-Sicherungskopie',
  'app.backup.onlyWay':
    '<b>Diese Datei ist der einzige Weg zu beweisen, dass Sie Ihre Datensätze halten</b>, und sie auf einem neuen Handy oder Computer zurückzubekommen. VeilCore kann sie weder wiederherstellen noch neu erstellen.',
  'app.backup.saveIt': 'Speichern',
  'app.backup.saved': 'Gespeichert',
  'app.backup.savedSub': '{file} · eine Datei für alles',
  'app.backup.saveFile': 'Sicherungsdatei speichern',
  'app.backup.copyTitle': 'Eine Kopie woanders ablegen (empfohlen)',
  'app.backup.wayBack': 'Wenn dieses Handy oder dieser Computer kaputtgeht, ist diese Kopie Ihr Weg zurück.',
  'app.backup.actAsYou':
    'Mit dieser Datei kann jeder Ihre Datensätze öffnen und als Sie auftreten. Am besten: ein USB-Stick oder ein Passwort-Manager. Wenn Sie sie per E-Mail senden, nutzen Sie ein Konto mit Anmeldung in zwei Schritten.',
  'app.backup.sentCopy': 'Kopie gesendet ✓',
  'app.backup.sendCopy': 'Eine Kopie senden (E-Mail, Drive, Dateien…)',
  'app.backup.shareFailed': 'Dieser Browser konnte sein Teilen-Menü nicht öffnen.',
  'app.backup.byHand':
    'Legen Sie sie auf einen USB-Stick oder in einen Passwort-Manager. Es ist die Datei, die Sie gerade gespeichert haben, in Ihrem Download-Ordner.',
  'app.backup.saveAgain': 'Noch eine Kopie speichern',
  'app.backup.savedAgain': 'Weitere Kopie gespeichert ✓',
  'app.backup.checkTitle': 'Prüfen, ob sie funktioniert',
  'app.backup.itWorks': 'Sie funktioniert.',
  'app.backup.openIntro':
    'Öffnen Sie die Kopie, die Sie gerade gespeichert haben. Wir prüfen, dass sie sich öffnen lässt und alles enthält. Es wird nichts hochgeladen.',
  'app.backup.openCopy': 'Meine gespeicherte Kopie öffnen',
  'app.backup.saveFirst': 'Speichern Sie zuerst die Sicherungsdatei.',
  'app.backup.turnsOn': 'Das wird aktiv, sobald die Prüfung bestanden ist.',
  'app.backup.pw.add': 'Ein Passwort hinzufügen (empfohlen)',
  'app.backup.pw.why':
    'Dann öffnet die Datei allein nichts: Wer sie hat, braucht auch das Passwort. Wenn Sie es vergessen, kann niemand die Datei öffnen, auch wir nicht.',
  'app.backup.pw.label': 'Passwort für die Sicherungsdatei',
  'app.backup.pw.again': 'Noch einmal eingeben',
  'app.backup.pw.short': 'Mindestens {n} Zeichen.',
  'app.backup.pw.mismatch': 'Die beiden stimmen nicht überein.',
  'app.backup.pw.keep': 'Bewahren Sie es in einem Passwort-Manager oder aufgeschrieben auf, getrennt von der Datei.',
  'app.backup.pw.locking': 'Datei wird verschlossen…',
  'app.backup.pw.savedSub': '{file} · eine Datei für alles, mit Ihrem Passwort verschlossen',
  'app.backup.pw.needed': 'Diese Sicherung hat ein Passwort. Geben Sie es ein, um die Datei zu öffnen.',
  'app.backup.pw.wrong': 'Dieses Passwort öffnet diese Sicherung nicht. Es wurde nichts geändert.',
  'app.backup.pw.checkLabel': 'Das Passwort der Sicherung',
  'app.backup.pw.open': 'Öffnen',
  'app.backup.restoreTitle': 'Datensätze wiederherstellen',
  'app.backup.restoreIntro':
    'Neues Handy oder neuer Computer, oder Browserdaten gelöscht? Öffnen Sie die Sicherungsdatei, die Sie gespeichert haben.',
  'app.backup.plantsBack': 'Ihre Datensätze sind wieder da.',
  'app.backup.restored': 'Wiederhergestellt.',
  'app.backup.nothingNew': 'In dieser Datei ist nichts Neues.',
  'app.backup.sentence': '{s} ',
  'app.backup.labSigBack': 'Auch die Signatur Ihres Labors ist wieder da. ',
  'app.backup.workRestored': 'Wiederhergestellt: {work}. ',
  'app.backup.worksLikeBefore': 'Alles funktioniert wie vorher.',
  'app.backup.nDeliveries.one': '{count} Lieferung an ein Labor',
  'app.backup.nDeliveries.other': '{count} Lieferungen an Labore',
  'app.backup.nCodes.one': '{count} Laborcode',
  'app.backup.nCodes.other': '{count} Laborcodes',
  'app.backup.and': '{a} und {b}',
  'app.backup.seeMyPlants': 'Meine Datensätze ansehen',
  'app.backup.lookIn':
    'Sehen Sie auf Ihrem USB-Stick, in Ihrem Passwort-Manager oder in Ihren E-Mails, in Drive oder iCloud nach. Jeder Dateiname ist in Ordnung. Es wird nichts hochgeladen.',
  'app.backup.openFile': 'Meine Sicherungsdatei öffnen',
  'app.backup.onlyKey': 'Haben Sie nur Ihren Inhaberschlüssel (64 Zeichen)?',
  'app.backup.keyLabel': 'Ihr Inhaberschlüssel (64 Zeichen)',
  'app.backup.useIt': 'Verwenden',
  'app.backup.olderVersion':
    'Nur wenn Sie ihn aus einer älteren Version dieser Website kopiert haben: Er wird heute nirgends mehr angezeigt. Damit werden Ihre Datensätze gefunden, aber sie bleiben verschlossen, bis Sie Ihre Sicherungsdatei öffnen. Auch die Datumsstempel-Schlüssel eines Datensatzes sind nur in dieser Datei.',
  'app.backup.cantFind':
    '<b>Sie finden die Datei nicht?</b> Dann kann niemand die Datensätze zurückholen, auch wir nicht: Wir hatten Ihren Schlüssel nie. Genau das ermöglicht Ihnen den Nachweis, dass Sie sie halten. Wenn Ihr altes Gerät noch funktioniert, öffnen Sie dort VeilCore und speichern Sie eine neue Sicherungskopie.',
  'app.backup.holds.none': 'Ihre Datensätze sind darin.',
  'app.backup.holds.records.one': 'Ihr Datensatz ist darin.',
  'app.backup.holds.records.other': 'Alle {count} Ihrer Datensätze sind darin.',
  'app.backup.holds.plants.one': 'Ihre Pflanze ist darin.',
  'app.backup.holds.plants.other': 'Alle {count} Ihrer Pflanzen sind darin.',
  'app.backup.restoredPlants.one': 'Schlüssel für {count} Pflanze wiederhergestellt.',
  'app.backup.restoredPlants.other': 'Schlüssel für {count} Pflanzen wiederhergestellt.',
  'app.backup.restoredRecords.one': 'Schlüssel für {count} Datensatz wiederhergestellt ({plants}, {datings}).',
  'app.backup.restoredRecords.other': 'Schlüssel für {count} Datensätze wiederhergestellt ({plants}, {datings}).',
  'app.backup.nPlants.one': '{count} Pflanze',
  'app.backup.nPlants.other': '{count} Pflanzen',
  'app.backup.nDatedReports.one': '{count} datierter Laborbericht',
  'app.backup.nDatedReports.other': '{count} datierte Laborberichte',
  'app.backup.err.notBackup':
    'Diese Datei ist keine VeilCore-Sicherungskopie. Wählen Sie die Datei, die Sie aus VeilCore gespeichert haben.',
  'app.backup.err.olderFile':
    'Das ist eine ältere oder andere Datei. Wählen Sie die Sicherungskopie, die Sie gerade gespeichert haben.',
  'app.backup.err.otherSet':
    'Diese Sicherungskopie gehört zu anderen Datensätzen. Wählen Sie die, die Sie gerade gespeichert haben.',
  'app.backup.err.notNow':
    'Diese Sicherungskopie enthält Ihre Datensätze nicht im aktuellen Stand. Speichern Sie eine neue und prüfen Sie diese.',
  'app.backup.err.noLabSignature':
    'Diese Sicherungskopie enthält die Signatur Ihres Labors nicht. Speichern Sie eine neue und prüfen Sie diese.',
  'app.backup.err.noDeliveries':
    'Diese Sicherungskopie enthält Ihre neuesten Lieferungen nicht. Speichern Sie eine neue und prüfen Sie diese.',
  'app.backup.err.differentKeys':
    'Dieser Browser hat für einen dieser Datensätze bereits andere Schlüssel. Es wurde nichts geändert.',
  'app.backup.err.differentSet': 'Dieser Browser nutzt bereits andere Datensätze. Es wurde nichts geändert.',
  'app.backup.err.differentLab': 'Dieser Browser hat bereits eine andere Laborsignatur. Es wurde nichts geändert.',
  'app.backup.err.missingLatest.one':
    'Dieser Sicherungskopie fehlt der neueste Stand von {count} Ihrer Datensätze. Speichern Sie eine neue und prüfen Sie diese.',
  'app.backup.err.missingLatest.other':
    'Dieser Sicherungskopie fehlt der neueste Stand von {count} Ihrer Datensätze. Speichern Sie eine neue und prüfen Sie diese.',
} satisfies Partial<AppTranslation>;
