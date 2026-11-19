// German (Sie): the pack for the authority. DRAFT: machine-assisted, to be checked by a fluent
// speaker before publishing (docs/translations/README.md). Terms as in ../../de.ts.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const pack = {
  'app.pack.home': 'Unterlagen für REPROCANN / SEDRONAR',
  'app.pack.homeText':
    'Für einen Verein in Argentinien: die Halbjahreszahlen und das Produktionsprotokoll, aus Ihren Einträgen.',
  'app.pack.title': 'Unterlagen für REPROCANN / SEDRONAR',
  'app.pack.intro':
    'Für einen Verein für medizinisches Cannabis in Argentinien. Die Unterlagen stellen zusammen, was Ihre Einträge für einen Zeitraum zeigen, für die Halbjahreserklärung und das Produktionsprotokoll, nennen, was fehlt, und geben zu jedem Eintrag den Prüflink. Sie prüfen sie, unterschreiben sie und senden sie selbst.',
  'app.pack.form.period': 'Zeitraum',
  'app.pack.form.periodSix': 'Letzte sechs Monate',
  'app.pack.form.periodPermit': 'Genehmigungsjahr',
  'app.pack.form.periodOther': 'Andere Daten',
  'app.pack.form.permitStart': 'Beginn der Genehmigung',
  'app.pack.form.from': 'Von',
  'app.pack.form.to': 'Bis',
  'app.pack.form.badPeriod': 'Wählen Sie einen Beginn am oder vor dem Ende.',
  'app.pack.form.association': 'Name des Vereins (wird gedruckt)',
  'app.pack.form.preparedBy': 'Erstellt von (wird gedruckt)',
  'app.pack.form.countsTitle': 'Pflanzen',
  'app.pack.form.countsFromBatches':
    'Ihre Anbauchargen in diesem Zeitraum ergeben zusammen {plants} Pflanzen, davon {inFlower} in Blüte ({batches}). Lassen Sie die Felder leer, um diese Zahlen zu verwenden, oder geben Sie die zu erklärenden Zahlen ein.',
  'app.pack.form.countsNone':
    'In diesem Zeitraum ist keine Anbaucharge mit Pflanzenzahlen datiert. Geben Sie die zu erklärenden Zahlen ein, oder lassen Sie sie leer; die Unterlagen nennen sie dann als fehlend.',
  'app.pack.form.batches.one': 'eine Charge',
  'app.pack.form.batches.other': '{count} Chargen',
  'app.pack.form.plants': 'Pflanzen insgesamt',
  'app.pack.form.inFlower': 'Pflanzen in Blüte',
  'app.pack.form.patients': 'Anzahl der zugeordneten Patientinnen und Patienten',
  'app.pack.form.patientsHelp':
    'Nur eine Zahl, nie Namen. Sie dient nur dazu, diese Unterlagen zu erstellen: Sie wird nicht gespeichert und weder an VeilCore noch an sonst jemanden gesendet.',
  'app.pack.form.badNumber': 'Geben Sie eine ganze Zahl ein oder lassen Sie das Feld leer.',
  'app.pack.form.lang': 'Sprache der Unterlagen',
  'app.pack.form.make': 'Unterlagen erstellen',
  'app.pack.form.making': 'Das Datum jedes Eintrags wird nachgeschlagen…',
  'app.pack.form.print': 'Drucken oder als PDF speichern',
  'app.pack.form.printHelp': 'Wählen Sie im Druckfenster „Als PDF speichern“ und A4-Papier.',
  'app.pack.form.linksWarn':
    'Jeder Prüflink in den Unterlagen trägt nach dem # die versiegelten Angaben dieses Eintrags, sodass sie jeder sieht, der ihn öffnet: {list}.',
  'app.pack.form.linksLocal':
    'Einige werden nur auf diesem Gerät aufbewahrt. Mit dem Versand der Unterlagen verlassen ihre Angaben es.',
  'app.pack.form.none': 'In diesem Browser ist in diesem Zeitraum keine Anbaucharge und kein Erntelos datiert.',
  'app.pack.form.failed': 'Die Unterlagen konnten nicht erstellt werden: {reason}',
  'app.pack.doc.title': 'Halbjahresbericht und Produktionsprotokoll',
  'app.pack.doc.sub': 'Begleitunterlagen aus den eigenen Einträgen des Vereins bei VeilCore',
  'app.pack.doc.rules':
    'Für die halbjährliche eidesstattliche Erklärung und den Chromatographiebericht je Charge (Res. MS 1780/2025, Art. 4 ter, Buchst. f) sowie für das Produktionsprotokoll des Anbauplans (Buchst. h).',
  'app.pack.doc.association': 'Verein: {name}',
  'app.pack.doc.preparedBy': 'Erstellt von: {name}',
  'app.pack.doc.period': 'Zeitraum: {from} bis {to}',
  'app.pack.doc.made': 'Erstellt am {at} aus {records} in diesem Browser.',
  'app.pack.doc.records.one': 'einem Eintrag',
  'app.pack.doc.records.other': '{count} Einträgen',
  'app.pack.doc.gapsTitle': 'Vor dem Versand: was fehlt',
  'app.pack.doc.gapsNone': 'Nichts fehlt, soweit diese Einträge es zeigen.',
  'app.pack.doc.variety': '1. Verwendete eingetragene Sorte',
  'app.pack.doc.varietyHelp':
    'Die Pflanzen oder Stämme, die die Anbauchargen nennen. Die Registernummer ist die, die der Inhaber im Eintrag versiegelt hat.',
  'app.pack.doc.col.variety': 'Sorte',
  'app.pack.doc.col.registration': 'Registernummer',
  'app.pack.doc.col.record': 'Eintrag',
  'app.pack.doc.regNone': 'Nicht im Eintrag',
  'app.pack.doc.varietyNone': 'Die Anbauchargen in diesen Einträgen nennen keinen Ausgangseintrag.',
  'app.pack.doc.sourceMissing': '{name} (Eintrag {id}): von einer Anbaucharge genannt, nicht in diesem Browser.',
  'app.pack.doc.plants': '2. Pflanzen',
  'app.pack.doc.plantsTotal': 'Pflanzen insgesamt',
  'app.pack.doc.plantsFlower': 'Pflanzen in Blüte',
  'app.pack.doc.notGiven': 'Nicht angegeben',
  'app.pack.doc.fromBatches.one':
    'Die Summe der einen Anbaucharge in diesem Zeitraum, gezählt an ihrem Datum und mit ihr versiegelt.',
  'app.pack.doc.fromBatches.other':
    'Die Summe der {count} Anbauchargen in diesem Zeitraum, jede gezählt an ihrem Datum und mit ihr versiegelt.',
  'app.pack.doc.typed': 'Beim Erstellen dieser Unterlagen eingegeben. Nicht aus einem versiegelten Eintrag.',
  'app.pack.doc.countsNone':
    'In den Anbauchargen dieses Zeitraums sind keine Pflanzenzahlen versiegelt, und es wurden keine eingegeben.',
  'app.pack.doc.patients': '3. Zugeordnete Patientinnen und Patienten',
  'app.pack.doc.patientsNote':
    'Nur eine Zahl, beim Erstellen dieser Unterlagen eingegeben. Sie steht in keinem Eintrag und wurde nicht an VeilCore gesendet.',
  'app.pack.doc.production': '4. Produktionsprotokoll',
  'app.pack.doc.productionHelp':
    'Jeder Schritt ist ein vom Verein versiegelter Eintrag, der den vorherigen nennt. Diese Verknüpfung ist die eigene Angabe des Inhabers: Niemand gleicht sie mit dem genannten Eintrag ab.',
  'app.pack.doc.col.step': 'Schritt',
  'app.pack.doc.col.name': 'Name und ID',
  'app.pack.doc.col.date': 'Datum',
  'app.pack.doc.col.figures': 'Zahlen (wie versiegelt)',
  'app.pack.doc.col.about': 'Bezieht sich auf',
  'app.pack.doc.outside': 'Vor diesem Zeitraum datiert: Ein Erntelos aus dem Zeitraum bezieht sich darauf.',
  'app.pack.doc.batchFigures': '{plants} Pflanzen, {inFlower} in Blüte',
  'app.pack.doc.batchNoFigures': 'Keine Zahlen versiegelt',
  'app.pack.doc.lotFigures': '{plants} Pflanzen geerntet',
  'app.pack.doc.chromatography': '5. Chromatographiebericht je Erntelos',
  'app.pack.doc.chromatographyHelp':
    'Ein Laborbericht oder Analysezertifikat, als Eintrag zum Los versiegelt. Seine Zahlen werden nur gezeigt, wenn die Signatur eines Labors darauf geprüft ist und das Labor benannt ist.',
  'app.pack.doc.lot': 'Los {lot}',
  'app.pack.doc.labSigned': 'Von einem Labor signiertes Ergebnis. {signer}',
  'app.pack.doc.document':
    'Versiegeltes Dokument: „{title}“. Der Bericht ist die Datei des Labors; was er sagt, steht in dieser Datei, nicht in diesen Unterlagen.',
  'app.pack.doc.labUnnamed':
    'Eine Laborsignatur ist dabei, aber hier ist kein Labor dahinter benannt, daher werden ihre Zahlen nicht gezeigt.',
  'app.pack.doc.missing': 'Fehlt: In diesen Einträgen gibt es keinen Chromatographiebericht zu diesem Los.',
  'app.pack.doc.proofs': '6. Prüfcodes, Prüflinks und Daten',
  'app.pack.doc.proofsHelp':
    'Jeder kann jeden Prüflink kostenlos und ohne Konto öffnen. Ein Eintrag zeigt die frühere Inhaberschaft seiner Datei und Angaben zu seinem Datum. Er zeigt nicht, dass stimmt, was er sagt.',
  'app.pack.doc.recordId': 'Eintrag {id}',
  'app.pack.doc.proofCode': 'Prüfcode',
  'app.pack.doc.checkLink': 'Prüflink',
  'app.pack.doc.noLink': 'Kein Prüflink: Dieser Eintrag ist noch nicht versiegelt.',
  'app.pack.doc.local': 'Nur auf dem Gerät des Vereins aufbewahrt.',
  'app.pack.doc.dateRests': 'Worauf das Datum beruht',
  'app.pack.role.source': 'Ausgang',
  'app.pack.role.grow-batch': 'Anbaucharge',
  'app.pack.role.harvest-lot': 'Erntelos',
  'app.pack.role.report': 'Laborbericht',
  'app.pack.doc.notForm':
    'Dies ist kein amtliches Formular: Für diese Erklärung wurde keines veröffentlicht. VeilCore reicht nichts für den Verein ein. Der Verein prüft diese Unterlagen, unterschreibt sie und sendet sie selbst.',
  'app.pack.doc.handover':
    'Nur aus den Einträgen in diesem Browser erstellt. Einträge, die auf dem Gerät einer anderen verantwortlichen Person versiegelt wurden, sind nur enthalten, wenn sie hier aus deren Sicherung wiederhergestellt wurden.',
  'app.pack.doc.sign': 'Unterschrift der technisch verantwortlichen Person',
  'app.pack.doc.signName': 'Name',
  'app.pack.doc.signDate': 'Datum',
  'app.pack.date.unsealed': 'Nicht versiegelt, daher datiert ihn nichts.',
  'app.pack.date.none': 'Noch in keinem Netzwerk datiert.',
  'app.pack.date.pending': 'In einem Stapel, noch in keinem Netzwerk datiert.',
  'app.pack.date.test': ' Ein Testnetz: Übungsdaten, kein echtes Datum.',
  'app.pack.date.checked':
    'Auf {where}: von diesem Browser beim Erstellen der Unterlagen geprüft. Die Stapelwurzel steht in Transaktion {tx}, Block {block}, {at}.{test}',
  'app.pack.date.failed':
    'Auf {where}: nicht bestätigt: {reason}. Verlassen Sie sich nicht auf das Datum, das das Register meldet.',
  'app.pack.date.reported':
    'Auf {where}: {date}, wie das Register von VeilCore es meldet. Nicht von diesem Browser geprüft; der Prüflink schlägt es nach.{test}',
  'app.pack.date.noTime': 'keine Zeit angegeben',
  'app.pack.date.bitcoin':
    'Bitcoin: Das Register von VeilCore meldet die Stapelwurzel in Bitcoin-Block {block} ({at}). Prüfen Sie es mit der OpenTimestamps-Datei des Stapels.',
  'app.pack.date.bitcoinPending': 'Bitcoin: Stempel ausstehend, noch in keinem Bitcoin-Block.',
  'app.pack.date.tsa':
    'RFC 3161: Die Stapelwurzel trägt einen Zeitstempel von {tsa}, um {at} laut Token. Der Token wurde in diesem Browser gegen die Stapelwurzel geprüft; der Inklusionsnachweis dieses Eintrags verbindet ihn mit dieser Wurzel.',
  'app.pack.date.tsaUnnamed': 'einem Zeitstempeldienst',
  'app.pack.date.tsaQualified':
    'Das Register von VeilCore gibt an, dass dieser Dienst nach {scheme} qualifiziert ist. Prüfen Sie die Vertrauensliste selbst, bevor Sie sich darauf stützen.',
  'app.pack.gap.chromatography': 'Los {lot}: kein Chromatographiebericht.',
  'app.pack.gap.registration': '{name}: keine Registernummer der Sorte im Eintrag.',
  'app.pack.gap.source': '{name}: von einer Anbaucharge genannt, aber nicht in diesem Browser.',
  'app.pack.gap.noBatches': 'In diesem Zeitraum ist keine Anbaucharge datiert.',
  'app.pack.gap.noLots': 'In diesem Zeitraum ist kein Erntelos datiert.',
  'app.pack.gap.counts': 'Pflanzen insgesamt oder Pflanzen in Blüte: nicht angegeben.',
  'app.pack.gap.countsPartial.one':
    'Eine Anbaucharge im Zeitraum hat keine versiegelten Pflanzenzahlen: Die Summen lassen sie aus.',
  'app.pack.gap.countsPartial.other':
    '{count} Anbauchargen im Zeitraum haben keine versiegelten Pflanzenzahlen: Die Summen lassen sie aus.',
  'app.pack.gap.patients': 'Anzahl der zugeordneten Patientinnen und Patienten: nicht angegeben.',
  'app.pack.gap.undated.one': 'Ein Eintrag ist noch in keinem Netzwerk datiert.',
  'app.pack.gap.undated.other': '{count} Einträge sind noch in keinem Netzwerk datiert.',
  'app.pack.gap.unchecked.one':
    'Ein Datum ist die Meldung des Registers von VeilCore, nicht von diesem Browser im Hauptnetz von Midnight geprüft.',
  'app.pack.gap.unchecked.other':
    '{count} Daten sind die Meldung des Registers von VeilCore, nicht von diesem Browser im Hauptnetz von Midnight geprüft.',
  'app.pack.gap.locked.one':
    'Ein Eintrag in diesem Browser ist gesperrt (mit einem Schlüssel versiegelt, den er nicht hat) und bleibt außen vor.',
  'app.pack.gap.locked.other':
    '{count} Einträge in diesem Browser sind gesperrt (mit einem Schlüssel versiegelt, den er nicht hat) und bleiben außen vor.',
} satisfies Partial<AppTranslation>;
