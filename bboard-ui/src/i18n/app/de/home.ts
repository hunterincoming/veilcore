// German (Sie). DRAFT: machine-assisted, to be checked by a fluent speaker before publishing
// (docs/translations/README.md). Terms as in ../../de.ts.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const home = {
  'app.home.firstPlant': 'Erfassen wir Ihre erste Pflanze',
  'app.home.continueDraftNamed': 'Entwurf fortsetzen: {name}',
  'app.home.continueDraft': 'Entwurf fortsetzen',
  'app.home.draftKept':
    'Was Sie eingegeben haben, ist in diesem Browser gespeichert. Machen Sie dort weiter, wo Sie aufgehört haben.',
  'app.home.aboutThreeMinutes':
    'Etwa 3 Minuten. Danach hat sie einen öffentlichen Datumsstempel, und nur Sie halten den Schlüssel.',
  'app.home.continue': 'Fortsetzen',
  'app.home.start': 'Los geht’s',
  'app.home.spreadsheet': 'Eine Tabelle? Ihre ganze Sammlung datieren',
  'app.home.newPhone': 'Neues Handy? Datensätze wiederherstellen',
  'app.home.newPhoneLab': 'Neues Handy? Schlüssel und Proben Ihres Labors wiederherstellen',
  'app.home.labWhatShows': 'Was zeigt meine Signatur?',
  'app.home.labShows':
    'Sie zeigt, dass Ihr Schlüssel signiert hat: dass eine Probe ankam oder welchen Bericht Sie geschickt haben. Sie zeigt nicht, wer den Schlüssel hält: Jeder kann einen Schlüssel unter jedem Namen registrieren.',
  'app.home.breederToo': 'Ich bin auch Züchter',
  'app.home.imALab': 'Ich bin ein Labor',
  'app.home.whatStops': 'Was hindert jemanden daran, meine Pflanze zuerst zu erfassen?',
  'app.home.samplesReceived': 'Erhaltene Proben',
  'app.home.yourPlants': 'Ihre Pflanzen',
  'app.home.logNew': 'Neu erfassen',
  'app.home.saveIt': 'Speichern',
  'app.home.finishBackupLine': '<b>Zum Abschluss: Sicherungskopie speichern.</b> {line}',
  'app.home.keysOnlyHerePlants.one': 'Eine Pflanze hat Schlüssel nur auf diesem Gerät.',
  'app.home.keysOnlyHerePlants.other': '{count} Pflanzen haben Schlüssel nur auf diesem Gerät.',
  'app.home.keysOnlyHereRecords.one': 'Ein Datensatz hat Schlüssel nur auf diesem Gerät.',
  'app.home.keysOnlyHereRecords.other': '{count} Datensätze haben Schlüssel nur auf diesem Gerät.',
  'app.home.resetWarningPlants.one':
    'Eine Pflanze hat Schlüssel ohne geprüfte Sicherungskopie. Speichern Sie zuerst Ihre Sicherungskopie: Wenn Sie den Browser später leeren, wären sie endgültig verloren.',
  'app.home.resetWarningPlants.other':
    '{count} Pflanzen haben Schlüssel ohne geprüfte Sicherungskopie. Speichern Sie zuerst Ihre Sicherungskopie: Wenn Sie den Browser später leeren, wären sie endgültig verloren.',
  'app.home.resetWarningRecords.one':
    'Ein Datensatz hat Schlüssel ohne geprüfte Sicherungskopie. Speichern Sie zuerst Ihre Sicherungskopie: Wenn Sie den Browser später leeren, wären sie endgültig verloren.',
  'app.home.resetWarningRecords.other':
    '{count} Datensätze haben Schlüssel ohne geprüfte Sicherungskopie. Speichern Sie zuerst Ihre Sicherungskopie: Wenn Sie den Browser später leeren, wären sie endgültig verloren.',
  'app.home.resetConfirm':
    'In diesem Browser mit neuen, leeren Datensätzen neu beginnen?\n\nEs wird nichts gelöscht. Ihre bisherigen Datensätze bleiben verschlossen im Register von VeilCore. Zurück bekommen Sie sie nur mit Ihren jetzigen Schlüsseln, die jetzt in einer Datei heruntergeladen werden. Bewahren Sie sie auf.',
  'app.home.startedOver':
    'Neu begonnen. Ihre alten Datensätze können Sie jederzeit aus der Datei mit dem Inhaberschlüssel wiederherstellen.',
  'app.home.imported.one': '{count} Datensatz importiert.',
  'app.home.imported.other': '{count} Datensätze importiert.',
  'app.home.alreadyHere.one': ' {count} schon vorhandener wurde unverändert gelassen.',
  'app.home.alreadyHere.other': ' {count} schon vorhandene wurden unverändert gelassen.',
  'app.home.importFailed': 'Import fehlgeschlagen.',
  'app.home.labJobs': 'Die Aufgaben Ihres Labors',
  'app.home.labJobsText':
    'Bestätigen Sie, was ankommt, und senden Sie dann Ergebnisse von der Seite der Pflanze zurück. Beides wird mit dem eigenen Schlüssel Ihres Labors signiert, nicht von uns, und Ergebnisse werden so verschlossen, dass nur der Züchter sie öffnen kann.',
  'app.home.confirmDelivery': 'Eine Lieferung bestätigen',
  'app.home.labSignature': 'Die Signatur Ihres Labors',
  'app.home.setUpLabSignature': 'Die Signatur Ihres Labors einrichten',
  'app.home.openPlant': '{name} öffnen',
  'app.home.quoted': '„{v}“',
  'app.home.labReportWaiting': 'Laborbericht wartet',
  'app.home.openAgreements': 'Meine Vereinbarungen öffnen',
  'app.home.myAgreements': 'Meine Vereinbarungen ({n})',
  'app.home.more': 'Mehr',
  'app.home.saveABackup': 'Sicherungskopie speichern',
  'app.home.exportAll': 'Alle Datensätze exportieren',
  'app.home.importRecords': 'Datensätze importieren',
  'app.home.trust.title': '„Was hindert mich daran, <em>Ihre</em> Sorte zu erfassen?“',
  'app.home.trust.lede': 'Drei Dinge machen einen VeilCore-Datensatz schwer zu fälschen:',
  'app.home.trust.1t': 'Ein früherer Datensatz zeigt sich als früher',
  'app.home.trust.1b':
    'Sobald Datensätze verankert sind, kann jeder prüfen, welcher zuerst verankert wurde. Davor ist die Zeit eines Datensatzes die Uhr seines Geräts. Ein Datensatz ist ein Beweismittel, keine Eintragung: Er zeigt, was Sie wann hatten, entscheidet aber für sich allein keinen Streit.',
  'app.home.trust.2t': 'Ein gekoppelter Bericht lässt sich später vergleichen',
  'app.home.trust.2b':
    'Beim Koppeln wird der Code Ihres DNA-Berichts als Ihre Erklärung mit dem Datensatz gespeichert, damit ein neuer Test des Materials später damit verglichen werden kann. Wenn Sie über den Vertrag von VeilCore auf Midnight koppeln, wird auch die Kopplung datiert: Sie zeigt, dass der Datensatz bis dahin mit diesem Bericht gekoppelt war, nicht, wer den Bericht zuerst hatte. In {thisSite} werden Kopplungen noch nicht datiert.',
  'app.home.trust.3t': 'Eine zweite Partei nimmt die Lieferung an',
  'app.home.trust.3b':
    'Wenn Material übergeben wird, bestätigt der Empfänger den Erhalt mit seinem eigenen Schlüssel. So steht eine zweite Partei im Datensatz, nicht nur Sie. Es zeigt, dass jemand die Lieferung angenommen hat, nicht, wer es ist.',
  'app.home.role.title': 'Was trifft auf Sie zu?',
  'app.home.role.intro':
    'Das ändert nur, was wir Ihnen zuerst zeigen. Es schränkt nicht ein, was Sie tun können, und Sie können es unten auf jeder Seite ändern.',
  'app.home.role.breeder.label': 'Ich züchte oder halte Genetik',
  'app.home.role.breeder.blurb':
    'Versiegeln Sie Datensätze dessen, was Sie halten, senden Sie Proben an Labore und lizenzieren Sie, was Sie gezüchtet haben.',
  'app.home.role.lab.label': 'Ich betreibe ein Labor oder erhalte Material',
  'app.home.role.lab.blurb':
    'Erhalten Sie Material von Kunden, bestätigen Sie, was angekommen ist, und signieren Sie Ihre Berichte mit Ihrem eigenen Schlüssel.',
  'app.home.role.both.label': 'Beides',
  'app.home.role.both.blurb': 'Sie züchten und erhalten auch Material von anderen.',
  'app.home.roleView.breeder': 'Ansicht für Züchter',
  'app.home.roleView.lab': 'Ansicht für Labore',
  'app.home.roleView.both': 'Ansicht für Züchter und Labore',
  'app.home.roleChange': '{view} · ändern',
  'app.home.chooseView': 'Züchter oder Labor? Ansicht wählen',
  'app.home.saveProblem.records': 'Datensätze',
  'app.home.saveProblem.agreements': 'Vereinbarungen',
  'app.home.saveProblem.text':
    'Das Register hat einige Ihrer {what} nicht gespeichert, daher wurden sie auf den dort gespeicherten Stand zurückgesetzt: {list}',
  'app.home.sort.recent': 'Neueste zuerst',
  'app.home.sort.oldest': 'Älteste zuerst',
  'app.home.sort.name': 'Sortenname',
  'app.home.sort.breeder': 'Gezüchtet von',
  'app.home.search.lab': 'Pflanzenname, Züchter, TR-Code, Notiz oder Ihre Eingangsnummer',
  'app.home.search.breeder': 'Pflanze, Züchter oder Ihre eigene Referenz',
  'app.home.search.aria': 'Suchen',
  'app.home.search.nothing':
    'Nichts passt zu "{q}". Die Suche umfasst den Pflanzennamen, wer sie gezüchtet hat, die Datensatzkennung, Ihre eigene Referenz und bei einer erhaltenen Probe ihren Laborcode und die Notiz des Züchters.',
  'app.home.search.nOfTotal': '{matched} von {total}',
  'app.home.paste.ownCode': 'Das ist Ihr eigener Code. Senden Sie ihn an das Labor; nehmen Sie ihn hier nicht an.',
  'app.home.paste.cutOff':
    'Dieser Code scheint abgeschnitten. Kopieren Sie den ganzen Laborcode, den man Ihnen geschickt hat.',
  'app.home.paste.noneStamped':
    'Das ist eine Anfrage, nachzuweisen, dass Sie eine Pflanze halten, aber keine Pflanze auf diesem Gerät hat bisher einen Datumsstempel. Neues Gerät? Stellen Sie zuerst Ihre Pflanzen aus der Sicherungskopie wieder her.',
  'app.home.paste.unknown':
    'Das sieht nicht nach einem Code oder Link von VeilCore aus. Kopieren Sie alles, was man Ihnen geschickt hat, und versuchen Sie es erneut.',
  'app.home.paste.label': 'Hat Ihnen jemand einen Code oder Link geschickt?',
  'app.home.paste.placeholder': 'Hier einfügen',
  'app.home.paste.go': 'Los',
  'app.home.paste.hint':
    'Ein Laborcode, ein Link zu einem Datensatz, eine Anfrage, eine Pflanze nachzuweisen, oder eine Vereinbarung zum Unterschreiben. Wir erkennen, was es ist.',
  'app.home.paste.whichPlant':
    'Das ist eine Anfrage, nachzuweisen, dass Sie eine Pflanze halten. Nach welcher wurde gefragt?',
  'app.home.notFinished': 'Nicht fertig · als Nächstes: Sicherungskopie speichern',
  'app.home.receivedFrom': 'Erhalten von {name}',
  'app.home.receivedFromNamed': 'Von {name} · deren Datensatz {id}',
  'app.home.receivedFromName': 'Von {name}',
  'app.home.sealedOn': 'Versiegelt am {date}',
  'app.home.labReportSaved': 'Laborbericht gespeichert',
  'app.home.keyStampQueued': 'Datumsstempel des Schlüssels in der Warteschlange',
  'app.home.keyNotStamped': 'Schlüssel noch ohne Datumsstempel',
  'app.home.reportsSent.one': '{count} Laborbericht gesendet',
  'app.home.reportsSent.other': '{count} Laborberichte gesendet',
  'app.home.reportWithdrawn': 'Laborbericht zurückgezogen',
  'app.home.labReportDated': 'DNA-Bericht datiert',
  'app.home.datesReportFor': 'Datiert einen DNA-Bericht für {name}',
  'app.home.aPlant': 'eine Pflanze',
  'app.home.datingUnfinished': '{dated} · nicht fertig · als Nächstes: Sicherungskopie speichern',
  'app.home.datingSealed': '{dated} · versiegelt am {date}',
  'app.home.export.label': 'Ihre Datensätze und Vereinbarungen von VeilCore herunterladen',
  'app.home.export.done':
    'Heruntergeladen: Ihre Datensätze, Vereinbarungen, Freigabe-Einstellungen und jeder Inklusionsnachweis. Lieferungen, ihre Probenangaben und Laborberichte sind nicht dabei: Öffnen Sie sie bei der Lieferung oder auf der Seite der Pflanze. Ihre Schlüssel stehen in Ihrer Sicherungsdatei, nicht in dieser.',
} satisfies Partial<AppTranslation>;
