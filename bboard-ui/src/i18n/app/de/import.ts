// German (Sie). DRAFT: machine-assisted, to be checked by a fluent speaker before publishing
// (docs/translations/README.md). Terms as in ../../de.ts.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const importing = {
  'app.import.noRows':
    'Diese Datei hat keine Zeilen unter ihren Spaltennamen. Eine Zeile sollte die Spalten benennen, darunter eine Zeile pro Pflanze.',
  'app.import.title': 'Ihre ganze Sammlung datieren',
  'app.import.intro':
    'Führen Sie schon eine Tabelle Ihrer Pflanzen oder Akzessionen? Versiegeln Sie jede Zeile in einem Durchgang als eigenen Datensatz, jeden mit Datumsstempel, als hätten Sie sie einzeln erfasst.',
  'app.import.fileKind':
    'Eine CSV- oder Excel-Datei (.xlsx), nur das erste Blatt, mit einer Zeile, die die Spalten benennt (ein Titel darüber ist in Ordnung). Bis zu {max} Zeilen auf einmal.',
  'app.import.notKept':
    'Dieser Browser behält nach dem Schließen nichts (ein privates Fenster oder blockierte Websitedaten). Der Schlüssel jedes Datensatzes liegt in diesem Browser, bis Sie Ihre Sicherungskopie speichern, also öffnen Sie diese Seite in einem normalen Fenster.',
  'app.import.reading': 'Ihre Datei wird gelesen…',
  'app.import.choose': 'Eine Datei wählen',
  'app.import.normalWindow': 'Öffnen Sie diese Seite in einem normalen Browserfenster, um sie zu nutzen.',
  'app.import.readHere':
    'Ihre Datei wird hier in diesem Browser gelesen und nicht hochgeladen. Für jede Zeile werden nur die Angaben gespeichert, die Sie auf dem nächsten Bildschirm wählen, dieselben Angaben wie beim Erfassen einer Pflanze. Auf {server} werden sie verschlossen gespeichert, und wir haben den Schlüssel nicht; der Pflanzenname ist nicht verschlossen. Nur ein Fingerabdruck wird auf {dated} datiert.',
  'app.import.testSite': 'Dies ist eine Testseite: Hier erstellte Datensätze sind Testdaten.',
  'app.import.earlierStamps': 'Datumsstempel für Schlüssel aus früheren Importen',
  'app.import.rowLine': 'Zeile {line}: {text}',
  'app.import.row': 'Zeile {line}',
  'app.import.end': '.',
  'app.import.notGiven': 'Nicht angegeben',
  'app.import.field.strainName': 'Name der Pflanze oder Linie',
  'app.import.field.refId': 'Ihre ID (Akzessions- oder Chargennummer)',
  'app.import.field.taxon': 'Art',
  'app.import.field.parents': 'Eltern',
  'app.import.field.parents2': 'Zweiter Elternteil',
  'app.import.field.bredBy': 'Gezüchtet von',
  'app.import.field.dateCreated': 'Datum (Ihre eigene Notiz)',
  'app.import.field.notes': 'Notizen',
  'app.import.header.title': 'Welche Zeile enthält die Spaltennamen?',
  'app.import.header.intro':
    'Wir haben die Zeile gewählt, die nach Spaltennamen aussieht. Zeilen darüber, etwa ein Titel, werden ausgelassen.',
  'app.import.header.label': 'Die Spaltennamen stehen in',
  'app.import.header.names': 'Spaltennamen (Zeile {line})',
  'app.import.header.firstAt': 'Erste Pflanze (Zeile {line})',
  'app.import.header.first': 'Erste Pflanze',
  'app.import.header.noRows': 'Keine Zeilen unter dieser.',
  'app.import.header.under.one': '{count} Zeile unter den Spaltennamen',
  'app.import.header.under.other': '{count} Zeilen unter den Spaltennamen',
  'app.import.header.above.one': '; {count} Zeile darüber wird ausgelassen',
  'app.import.header.above.other': '; {count} Zeilen darüber werden ausgelassen',
  'app.import.header.next': 'Weiter: welche Spalte was ist',
  'app.import.header.pickHint': 'Wählen Sie eine Zeile mit Pflanzen darunter.',
  'app.import.header.back': 'Eine andere Datei wählen',
  'app.import.cols.title': 'Welche Spalte ist was?',
  'app.import.cols.intro':
    'Wir haben anhand der Spaltennamen geraten. Prüfen Sie jede. Nur der Pflanzenname ist nötig; Spalten, die Sie weglassen, werden nie gesendet. Der Pflanzenname ist öffentlich: Wer den Prüflink eines Datensatzes hat, sieht ihn. Wenn die Namen geheim sind, wählen Sie eine Spalte mit Decknamen.',
  'app.import.cols.example': 'Zum Beispiel: {v}',
  'app.import.cols.twoParents': 'Zwei Eltern in einer Zelle sind in Ordnung, etwa „Mutter x Vater“.',
  'app.import.cols.pick': 'Eine Spalte wählen',
  'app.import.cols.notInFile': 'Nicht in meiner Datei',
  'app.import.cols.bredBy': 'Gezüchtet von, wo eine Zeile es nicht sagt',
  'app.import.cols.bredByHelp':
    'Ihr Name oder Unternehmen, wenn Sie sie gezüchtet haben. Leer lassen, wenn Sie es nicht wissen.',
  'app.import.cols.dates': 'Wie sind Daten geschrieben?',
  'app.import.cols.datesHelp':
    'Manche Daten wie 03/04/2021 können beides bedeuten. Wählen Sie, wie Ihre Datei sie schreibt, sonst bleiben sie, wie sie sind.',
  'app.import.cols.auto': 'Unklare Daten so lassen, wie sie sind',
  'app.import.cols.mdy': 'Monat zuerst (03/14/2021)',
  'app.import.cols.dmy': 'Tag zuerst (14/03/2021)',
  'app.import.cols.next': 'Weiter: die Zeilen prüfen',
  'app.import.cols.pickHint': 'Wählen Sie die Spalte mit dem Namen der Pflanze oder Linie.',
  'app.import.cols.back': 'Die Zeile mit den Spaltennamen ändern',
  'app.import.card.name': 'Pflanze oder Linie',
  'app.import.card.id': 'Ihre ID',
  'app.import.card.date': 'Datum (Ihre Notiz)',
  'app.import.check.title': 'Stimmt das so?',
  'app.import.check.ready.one': '{count} Zeile bereit zum Versiegeln',
  'app.import.check.ready.other': '{count} Zeilen bereit zum Versiegeln',
  'app.import.check.already': ' · {n} früher versiegelt, bleiben, wie sie sind',
  'app.import.check.problems': ' · {n} können nicht versiegelt werden',
  'app.import.check.pickRow': 'Die Zeile wählen',
  'app.import.check.headerRows.one':
    'Zeile {rows} sieht nach Spaltennamen aus, nicht nach einer Pflanze, und wird daher ausgelassen. Wenn Ihre Spaltennamen in dieser Zeile stehen, wählen Sie sie als Zeile mit den Spaltennamen.',
  'app.import.check.headerRows.other':
    'Die Zeilen {rows} sehen nach Spaltennamen aus, nicht nach Pflanzen, und werden daher ausgelassen. Wenn Ihre Spaltennamen in einer davon stehen, wählen Sie sie als Zeile mit den Spaltennamen.',
  'app.import.check.firstRows.one': 'Die erste Zeile, genau so, wie sie versiegelt wird',
  'app.import.check.firstRows.other': 'Die ersten {count} Zeilen, genau so, wie sie versiegelt werden',
  'app.import.check.ambiguous.one':
    '{count} Datum kann Tag zuerst oder Monat zuerst sein und bleibt daher, wie es ist. Um das zu ändern, gehen Sie zurück und wählen Sie, wie Ihre Datei Daten schreibt.',
  'app.import.check.ambiguous.other':
    '{count} Daten können Tag zuerst oder Monat zuerst sein und bleiben daher, wie sie sind. Um das zu ändern, gehen Sie zurück und wählen Sie, wie Ihre Datei Daten schreibt.',
  'app.import.check.cantSeal.one': '{count} Zeile kann nicht versiegelt werden',
  'app.import.check.cantSeal.other': '{count} Zeilen können nicht versiegelt werden',
  'app.import.check.fixThem.one':
    'Sie wird ausgelassen. Korrigieren Sie sie in Ihrer Datei und importieren Sie diese später erneut: Bereits versiegelte Zeilen werden übersprungen.',
  'app.import.check.fixThem.other':
    'Sie werden ausgelassen. Korrigieren Sie sie in Ihrer Datei und importieren Sie diese später erneut: Bereits versiegelte Zeilen werden übersprungen.',
  'app.import.check.more': 'Und {n} weitere. Die Ergebnisdatei führt jede auf.',
  'app.import.check.onceSealed':
    '<b>Einmal versiegelt, lassen sie sich nicht mehr ändern.</b> Sie können später Berichte und Korrekturen hinzufügen; eine Korrektur ist ein neuer Datensatz, der auf den alten verweist.',
  'app.import.check.savedOn':
    'Die Angaben oben werden verschlossen auf {server} gespeichert, ein Datensatz pro Zeile, und wir haben den Schlüssel nicht. Die Pflanzennamen sind nicht verschlossen: Wer einen Prüflink hat, sieht sie. Nur ein Fingerabdruck von jedem wird auf {dated} datiert. Ein Datumsstempel zeigt, dass die Angaben zu diesem Datum existierten; er bestätigt nicht, dass sie stimmen.',
  'app.import.check.sealN.one': '{count} Datensatz versiegeln',
  'app.import.check.sealN.other': '{count} Datensätze versiegeln',
  'app.import.check.nothing': 'Nichts zu versiegeln',
  'app.import.check.everyRow': 'Jede Zeile ist schon versiegelt oder kann nicht versiegelt werden.',
  'app.import.check.back': 'Die Spalten ändern',
  'app.import.seal.sealing': 'Ihre Datensätze werden versiegelt…',
  'app.import.seal.paused': 'Versiegeln pausiert',
  'app.import.seal.pickUp': 'Dort weitermachen, wo Sie aufgehört haben',
  'app.import.seal.toSeal.one': '{file}: {count} Zeile zu versiegeln.',
  'app.import.seal.toSeal.other': '{file}: {count} Zeilen zu versiegeln.',
  'app.import.seal.aria': 'Ihre Datensätze werden versiegelt',
  'app.import.seal.of': '{done} von {total} versiegelt',
  'app.import.seal.keepOpen': 'Lassen Sie diese Seite geöffnet.',
  'app.import.seal.kept':
    'Wenn sie sich schließt, kommen Sie auf diese Seite zurück: Sie macht dort weiter, wo sie aufgehört hat, und versiegelt nie eine Zeile zweimal.',
  'app.import.seal.notKept':
    'Dieser Browser konnte den Fortschritt nicht behalten: Wenn sich die Seite schließt, wählen Sie dieselbe Datei erneut. Bereits versiegelte Zeilen werden übersprungen.',
  'app.import.seal.carryOn': 'Weiter versiegeln',
  'app.import.seal.stop': 'Hier aufhören und mit dem Versiegelten abschließen',
  'app.import.sum.sealed.one': '{count} Datensatz versiegelt',
  'app.import.sum.sealed.other': '{count} Datensätze versiegelt',
  'app.import.sum.nothingNew': 'Nichts Neues versiegelt',
  'app.import.sum.before.one': '{count} Zeile früher versiegelt, bleibt, wie sie ist.',
  'app.import.sum.before.other': '{count} Zeilen früher versiegelt, bleiben, wie sie sind.',
  'app.import.sum.notSealed.one': '{count} Zeile nicht versiegelt:',
  'app.import.sum.notSealed.other': '{count} Zeilen nicht versiegelt:',
  'app.import.sum.waiting.one':
    '{count} Zeile noch nicht versiegelt. Importieren Sie die Datei erneut, um sie zu versiegeln.',
  'app.import.sum.waiting.other':
    '{count} Zeilen noch nicht versiegelt. Importieren Sie die Datei erneut, um sie zu versiegeln.',
  'app.import.sum.stampsHere':
    'Ihre Datensätze sind schon versiegelt und werden durch ihren Stapel auf {dated} datiert; das hängt nicht von den Datumsstempeln ihrer Schlüssel ab. Der Schlüssel jeder Pflanze erhält außerdem einen eigenen Datumsstempel aus diesem Browser, etwa {perDay} pro Tag, daher dauern {n} wartende etwa {days}. Sie beginnen nach Ihrer Sicherungskopie.',
  'app.import.sum.byBatch':
    'Ihr öffentlicher Datumsstempel kommt, wenn ihr Stapel auf {dated} datiert wird. Sie müssen nichts tun.',
  'app.import.sum.untilSaved':
    'Bis sie gespeichert und geprüft ist, sind die Schlüssel der neuen Datensätze nur in diesem Browser.',
  'app.import.sum.noDna.one':
    '{count} dieser Pflanzen hat noch keinen DNA-Bericht und ist daher nicht mit der Pflanze selbst verknüpft. Um einen hinzuzufügen, öffnen Sie die Seite der Pflanze und folgen Sie „Einen DNA-Fingerabdruck für diese Pflanze bekommen“: Senden Sie eine Probe mit einem Laborcode an ein Labor, oder speichern Sie einen Bericht, den Sie schon haben.',
  'app.import.sum.noDna.other':
    '{count} dieser Pflanzen haben noch keinen DNA-Bericht und sind daher nicht mit den Pflanzen selbst verknüpft. Um einen hinzuzufügen, öffnen Sie die Seite einer Pflanze und folgen Sie „Einen DNA-Fingerabdruck für diese Pflanze bekommen“: Senden Sie eine Probe mit einem Laborcode an ein Labor, oder speichern Sie einen Bericht, den Sie schon haben.',
  'app.import.days.one': '{count} Tag',
  'app.import.days.other': '{count} Tage',
  'app.import.stamps.heading': 'Datumsstempel für Schlüssel',
  'app.import.stamps.of': '{heading}: {stamped} von {total}',
  'app.import.stamps.already':
    'Ihre Datensätze sind schon versiegelt und werden durch ihren Stapel auf {dated} datiert. Das hängt nicht von diesen Datumsstempeln für Schlüssel ab.',
  'app.import.stamps.each':
    'Der Schlüssel jeder Pflanze erhält außerdem einen Datumsstempel aus diesem Browser, damit Sie später beweisen können, dass Sie sie halten. Der kostenlose Gebührendienst schafft etwa {perDay} pro Tag aus jedem Browser{queued}. Sie gehen hinaus, solange diese Seite geöffnet ist. Die Seite jeder Pflanze kann ihren Stempel auch selbst setzen.',
  'app.import.stamps.queued': ', daher dauern {n} wartende etwa {days}',
  'app.import.stamps.stamping': '{name} erhält einen Datumsstempel…',
  'app.import.stamps.allDone': 'Alles erledigt.',
  'app.import.stamps.goOn': 'Weiter',
  'app.import.stamps.saveIt': 'Speichern',
  'app.import.stamps.newSince.one':
    '{count} Datumsstempel für einen Schlüssel kam nach Ihrer Sicherungskopie. Speichern Sie eine neue, um ihn zu behalten.',
  'app.import.stamps.newSince.other':
    '{count} Datumsstempel für Schlüssel kamen nach Ihrer Sicherungskopie. Speichern Sie eine neue, um sie zu behalten.',
  'app.import.done.title': 'Ihre Sammlung ist versiegelt',
  'app.import.done.new.one': '{count} neuer Datensatz',
  'app.import.done.new.other': '{count} neue Datensätze',
  'app.import.done.before': ', {n} früher versiegelt',
  'app.import.done.notSealed': ', {n} nicht versiegelt',
  'app.import.done.download': 'Ergebnisse herunterladen (CSV)',
  'app.import.done.downloadText':
    'Ihre Zeilen, wie sie waren, jede mit ihrer Datensatz-ID, ihrem Fingerabdruck und einem Link, den jeder zum Prüfen öffnen kann. Hier erstellt; nichts wird hochgeladen.',
  'app.import.done.csvDna': ' Die Spalte „DNA report“ zeigt, welche Datensätze noch keinen haben.',
  'app.import.done.byBatch':
    'Ihr öffentlicher Datumsstempel kommt, wenn ihr Stapel auf {dated} datiert wird. Die Seite jeder Pflanze zeigt, wann das geschehen ist. Sie müssen nichts tun.',
  'app.import.done.dateStamp':
    'Ein Datumsstempel zeigt, dass die Angaben zu diesem Datum existierten. Er bestätigt nicht, dass sie stimmen.',
  'app.import.done.toPlants': 'Zu Ihren Pflanzen',
  'app.import.done.another': 'Eine weitere Datei importieren',
} satisfies Partial<AppTranslation>;
