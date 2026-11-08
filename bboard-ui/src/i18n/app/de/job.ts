// Die Datensatz-App auf Deutsch: „Für mich erledigen“ in VeilCore fragen (../en/job.ts).
// „Freigeben“ für das Bestätigen einer Aktion (nicht „zustimmen“, das gilt Vertragsbedingungen);
// „Kennnummer“ für Ohrmarke und Chipnummer (users' review, 8 Nov 2026).
// DRAFT: machine-assisted, to be checked by a fluent speaker before publishing (docs/translations/README.md).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const job = {
  'app.job.mode': 'Für mich erledigen',
  'app.job.modeHelp':
    'Ich bereite alles auf diesem Gerät vor und zeige Ihnen ein Ergebnis. Gesendet wird erst, wenn Sie freigeben.',
  'app.job.can': 'Für mich erledigen: Ich bereite einen ganzen Auftrag vor, Sie geben ihn einmal frei.',
  'app.job.working': 'Wird vorbereitet. Gesendet wird erst, wenn Sie freigeben.',
  'app.job.privacy':
    'Der Auftrag bleibt nur auf diesem Gerät, kommt in keine Sicherung und wird 7 Tage nach seinem Ende gelöscht.',

  'app.job.understood': 'Verstanden: „{text}“.',
  'app.job.use': '„{text}“ verwenden',
  'app.job.newRecord': 'Neuer Datensatz',
  'app.job.suggest.ready': 'mach {name} lizenzbereit',
  'app.job.no.hint':
    'Ändern Sie zuerst das Beispiel oder schreiben Sie selbst: Ein Auftrag beginnt nur mit dem, was Sie schreiben.',
  'app.job.no.negation':
    'Bitten mit „nicht“ oder „kein“ führe ich nicht aus. Sagen Sie nur, was ich tun soll: zum Beispiel „Daisy hat heute gekalbt, Ohrmarke folgt“.',
  'app.job.no.leftover': 'Das konnte ich nicht verwenden: „{words}“.',
  'app.job.no.tooMany': 'Das ist mehr, als ich auf einmal kann. Bitten Sie um eine Sache.',
  'app.job.no.oneJob': 'Ich erledige einen Auftrag nach dem anderen. Bitten Sie um den ersten.',
  'app.job.no.partB': 'Die Lizenz kann ich noch nicht erstellen. Den ersten Teil kann ich jetzt erledigen.',
  'app.job.no.money': 'Ich sende und verspreche kein Geld. Lizenzberichte finden Sie unter „Was fällig ist“.',
  'app.job.no.notJob':
    'Nachweise, Übertragungen, Korrekturen und Entfernen geschehen auf der eigenen Seite des Datensatzes.',
  'app.job.no.stampAll':
    'Ich stemple nur einen Datensatz, den Sie gleich lizenzieren. Sagen Sie seinen Namen und „lizenzbereit“.',
  'app.job.no.received': 'Dieser Datensatz kam von jemand anderem, darum verwende ich ihn hier nicht.',
  'app.job.no.noRecord':
    'Nennen Sie einen Ihrer Datensätze: die Pflanze, von der geschnitten wird, oder Mutter oder Vater.',
  'app.job.no.notFound':
    '„{words}“ finde ich nicht in Ihren Datensätzen. Legen Sie ihn zuerst an und fragen Sie dann erneut.',
  'app.job.no.twoRecords':
    'Zwei Ihrer Datensätze heißen „{words}“. Benennen Sie einen um, oder beginnen Sie auf der Seite des Datensatzes.',
  'app.job.no.wrongKind': 'Dieser Datensatz passt nicht: Stecklinge kommen von einer Pflanze, Jungtiere von Tieren.',
  'app.job.no.count':
    'Sagen Sie einmal, wie viele: zum Beispiel „12 Stecklinge“. Eine Kennnummer passt zu einem Tier: Für mehrere fügen Sie die Kennnummern auf dem nächsten Bildschirm ein.',
  'app.job.no.sexCount': 'Die Zahlen gehen nicht auf. Sagen Sie, wie viele insgesamt und wie viele von jedem.',
  'app.job.no.unknown': '„{words}“ kann ich nicht als Teil eines Auftrags erledigen. Am nächsten:',
  'app.job.no.vault': 'Öffnen Sie VeilCore zuerst einmal mit einer Verbindung.',
  'app.job.no.paused': 'Auf dieser Seite werden keine Aufträge vorbereitet. Gehen Sie zuerst zu Ihren Datensätzen.',
  'app.job.no.records':
    'Ein Datensatz, den dieser Auftrag braucht, ist nicht mehr hier oder konnte nicht versiegelt werden.',
  'app.job.no.already': 'Diese Datensätze haben Sie schon.',
  'app.job.no.nothingDue': 'Für Ihre Vereinbarungen ist gerade kein Bericht fällig.',
  'app.job.no.tooManyReports':
    '{n} Berichte sind fällig: mehr, als ich auf einmal sende (5). Öffnen Sie jede Vereinbarung, um zu berichten.',
  'app.job.no.offline':
    'Die neuesten Nachrichten Ihrer Vereinbarungen lassen sich ohne Verbindung nicht lesen. Versuchen Sie es wieder, wenn Sie online sind.',
  'app.job.no.noChain': 'Diese Website kann gerade keine Datumsstempel setzen.',
  'app.job.no.noKey':
    'Der Schlüssel dieses Datensatzes ist nicht in diesem Browser. Stellen Sie zuerst Ihre Sicherung wieder her.',
  'app.job.no.readyNow': 'Dieser Datensatz ist schon lizenzbereit.',
  'app.job.no.file': 'Diese Datei ließ sich nicht verwenden.',
  'app.job.no.changed': 'Dieser Auftrag wurde in einem anderen Tab geändert. Prüfen Sie ihn noch einmal.',
  'app.job.no.whichDay': '„{words}“ heißt auf Französisch gestern und auf Deutsch hier. Welchen Tag meinen Sie?',
  'app.job.no.notReady': 'Dieser Auftrag wartet nicht mehr auf Freigabe.',
  'app.job.no.expired': 'Dieser Auftrag ist älter als 72 Stunden. Fragen Sie noch einmal, um einen neuen zu erstellen.',
  'app.job.no.gone': 'Dieser Auftrag ist nicht mehr in diesem Browser.',
  'app.job.no.unanswered': 'Vor der Freigabe ist noch etwas zu beantworten.',
  'app.job.open': 'Prüfen',

  'app.job.title': 'Bitte prüfen: {what}',
  'app.job.what.clones.one': '{count} Steckling von {name}',
  'app.job.what.clones.other': '{count} Stecklinge von {name}',
  'app.job.what.offspring.one': '{count} Jungtier von {name}',
  'app.job.what.offspring.other': '{count} Jungtiere von {name}',
  'app.job.what.import': 'Ihre Sammlung aus einer Datei',
  'app.job.what.due.one': '{count} Bericht zu senden',
  'app.job.what.due.other': '{count} Berichte zu senden',
  'app.job.what.ready': '{name} lizenzbereit machen',
  'app.job.young.dog': '{name} Welpe',
  'app.job.young.cattle': '{name} Kalb',
  'app.job.young.horse': '{name} Fohlen',
  'app.job.young.sheepGoat': '{name} Lamm',
  'app.job.young.pig': '{name} Ferkel',

  'app.job.answer.title': 'Nur Sie können das beantworten',
  'app.job.answer.bredBy': 'Wer hat sie gezüchtet?',
  'app.job.answer.taxon': 'Welche Art sind sie?',
  'app.job.answer.scheme': 'Welche Art von Kennnummer ist das?',
  'app.job.answer.idsLater': 'Noch keine Kennnummern? Lassen Sie es leer: Die Startseite erinnert Sie.',
  'app.job.answer.file': 'Wählen Sie die Datei mit Ihrer Sammlung (CSV oder Excel).',
  'app.job.answer.filePick': 'Datei wählen',
  'app.job.answer.use': 'Übernehmen',
  'app.job.answer.backup':
    'Speichern und prüfen Sie Ihre Sicherung: Sie enthält die Schlüssel zu dem, was dieser Auftrag anlegt.',

  'app.job.made.title': 'Was ich vorbereitet habe',
  'app.job.made.records.one': '{count} Datensatz, hier bereit und noch nicht gesendet: {first}',
  'app.job.made.records.other': '{count} Datensätze, hier bereit und noch nicht gesendet: {first} bis {last}',
  'app.job.made.cutFrom': 'Von {name} geschnitten, datiert auf {date}',
  'app.job.made.born': 'Geboren am {date}',
  'app.job.made.dam': 'Mutter: {name}',
  'app.job.made.sire': 'Vater: {name}',
  'app.job.made.sireTyped': 'Vater nicht auf VeilCore: {code}',
  'app.job.made.noSire': 'Vater: nicht angegeben (später ergänzen)',
  'app.job.made.semen': 'Spermacode: {code}',
  'app.job.made.sexes': 'Männlich: {m} · Weiblich: {f}',
  'app.job.made.unstated': 'Geschlecht nicht angegeben: {u}',
  'app.job.made.each': 'Jedes einzeln',
  'app.job.made.noId': 'noch keine Kennnummer',
  'app.job.made.tags': 'Pflanzenetiketten {first} bis {last}',
  'app.job.made.lot': 'Charge: {lot}',
  'app.job.made.noIds.one': 'Noch keine Kennnummer für {count}: Die Startseite fragt danach.',
  'app.job.made.noIds.other': 'Noch keine Kennnummern für {count}: Die Startseite fragt danach.',
  'app.job.made.importReady.one': '{count} bereit',
  'app.job.made.importReady.other': '{count} bereit',
  'app.job.made.importFix.one':
    '{count} muss korrigiert werden (Zeile {rows}): Korrigieren Sie sie in der Datei und importieren Sie sie erneut.',
  'app.job.made.importFix.other':
    '{count} müssen korrigiert werden (Zeilen {rows}): Korrigieren Sie sie in der Datei und importieren Sie sie erneut.',
  'app.job.made.expect': 'Sie sagten {n}; die Datei hat {m} bereit.',
  'app.job.made.file': 'Aus {file}',
  'app.job.made.report': 'Bericht für {from} bis {to}',
  'app.job.made.namedBy': '„{label}“, von der Gegenseite benannt',
  'app.job.made.stamp': 'Ein Datumsstempel auf Midnight für {name}, nötig zum Lizenzieren',
  'app.job.made.stamped': '{name} hat seinen Datumsstempel schon.',

  'app.job.approve.title': 'Wenn Sie freigeben',
  'app.job.approve.before':
    'Solange Sie nicht freigegeben haben, löscht „Verwerfen“ alles. Gesendet wurde noch nichts.',
  'app.job.approve.permanent': 'Nicht rückgängig zu machen',
  'app.job.approve.records.one':
    '{count} Datensatz gespeichert und datiert. Das ist dauerhaft: Einen Fehler können Sie später korrigieren, einen Datensatz aber nicht löschen.',
  'app.job.approve.records.other':
    '{count} Datensätze gespeichert und datiert. Das ist dauerhaft: Einen Fehler können Sie später korrigieren, einen Datensatz aber nicht löschen.',
  'app.job.approve.reports':
    'Gesendete Berichte lassen sich nicht zurücknehmen. Ist einer falsch, bitten Sie den Lizenzgeber, ihn mit „Korrektur erbitten“ zu markieren, und senden Sie dann einen korrigierten.',
  'app.job.approve.stampToday':
    '{name} bekommt heute einen Datumsstempel auf Midnight. Er ist nötig, um zu lizenzieren. Bis zu 3 am Tag sind kostenlos.',
  'app.job.approve.stampTomorrow':
    'Der Stempel für {name} wird morgen gesetzt: Die kostenlosen Stempel für heute sind offenbar aufgebraucht.',
  'app.job.approve.public': 'Was öffentlich wird',
  'app.job.approve.publicStamp':
    'Öffentlich: ein Code, der zeigt, dass dieser Datensatz existierte, und das Datum. Nie der Name, die Genetik oder Dateien.',
  'app.job.approve.publicRecords':
    'Der Prüfcode jedes Datensatzes geht an den Server von VeilCore und wird in einer Sammlung auf Midnight datiert. Namen und Angaben gehen mit Ihrem Schlüssel verschlossen: Der Server kann sie nicht lesen.',
  'app.job.approve.publicReports':
    'Nichts Öffentliches: Jeder Bericht geht verschlossen an den Lizenzgeber, über den eigenen Kanal Ihrer Vereinbarung.',
  'app.job.approve.offline':
    'Kein Netz? Kein Problem. Es geht hinaus, sobald Sie wieder online sind und VeilCore offen ist.',
  'app.job.approve.offlineRecords':
    'Kein Netz? Kein Problem. Es geht hinaus, sobald Sie wieder online sind und VeilCore offen ist. Ist es bis {when} nicht hinausgegangen, frage ich Sie, bevor ich es sende.',
  'app.job.approve.offlineLater':
    'Kein Netz? Kein Problem. Es geht hinaus, sobald Sie wieder online sind und VeilCore offen ist. Ist es bis {when} nicht hinausgegangen, wird nichts gesendet: Fragen Sie mich dann erneut.',

  'app.job.backup.records.one':
    'Speichern Sie zuerst Ihre Sicherung. Ohne sie ist dieser Datensatz weg, wenn Sie dieses Telefon verlieren.',
  'app.job.backup.records.other':
    'Speichern Sie zuerst Ihre Sicherung. Ohne sie sind diese {count} Datensätze weg, wenn Sie dieses Telefon verlieren.',
  'app.job.backup.ready':
    'Speichern Sie zuerst Ihre Sicherung. Eine Vereinbarung kann erst gespeichert werden, wenn eine geprüfte Sicherung ihren Schlüssel enthält.',
  'app.job.backup.done': 'Sicherung geprüft.',
  'app.job.backup.finish': 'Zurück zum Auftrag',

  'app.job.btn.records.one': 'Freigeben: {count} Datensatz speichern',
  'app.job.btn.records.other': 'Freigeben: {count} Datensätze speichern',
  'app.job.btn.reports.one': 'Freigeben: {count} Bericht senden, insgesamt {total} fällig',
  'app.job.btn.reports.other': 'Freigeben: {count} Berichte senden, insgesamt {total} fällig',
  'app.job.btn.stamp': 'Freigeben: {name} stempeln',
  'app.job.btn.ready': 'Freigeben',
  'app.job.btn.backup': 'Sicherung speichern',
  'app.job.btn.change': 'Etwas ändern',
  'app.job.btn.discard': 'Verwerfen',
  'app.job.changeConfirm':
    'Das öffnet das vollständige Formular mit allem, was hier steht. Dieser Auftrag wird verworfen: Gesendet wurde nichts.',
  'app.job.left.questions.one': 'Beantworten Sie {count} Frage, um freizugeben',
  'app.job.left.questions.other': 'Beantworten Sie {count} Fragen, um freizugeben',
  'app.job.left.backup': 'Speichern Sie Ihre Sicherung, um freizugeben',
  'app.job.left.idsUnused':
    'Sie haben Kennnummern eingegeben, aber noch nicht verwendet. Verwenden Sie diese Kennnummern oder leeren Sie die Felder.',
  'app.job.left.idsBlocked':
    'Eine Kennnummer hier gehört bereits einem anderen Tier. Korrigieren Sie zuerst das rot markierte Feld.',
  'app.job.left.idsMoved':
    'Die Kennnummern dieses Auftrags wurden in einem anderen Tab geändert. Ihre eingegebenen Kennnummern sind noch hier: Verwenden Sie sie, um jene zu ersetzen, oder leeren Sie sie, um die neuen zu sehen.',
  'app.job.left.scroll': 'Lesen Sie „Nicht rückgängig zu machen“, um freizugeben',
  'app.job.left.saving': 'Ihre Eingabe wird gespeichert…',
  'app.job.left.ready': 'Bereit zur Freigabe',
  'app.job.readOnly': 'Öffnen Sie es von der Startseite aus, um freizugeben.',
  'app.job.discarded': 'Verworfen. Es wurde nichts gesendet.',

  'app.job.report.sales': 'Umsatz von {from} bis {to} ({currency})',
  'app.job.report.units': 'Einheiten von {from} bis {to}',
  'app.job.report.offspring': 'Nachkommen, gleicher Zeitraum',
  'app.job.report.nothing': 'Nichts zu berichten',
  'app.job.report.owed': '{amount} fällig',
  'app.job.report.rate': '{rate} % von {currency} {base}',
  'app.job.report.topUp': 'Darin {amount}, um das Jahresminimum zu erreichen',
  'app.job.report.due': 'Fällig am {date}',
  'app.job.report.overdue': 'Fällig am {date} · überfällig',

  'app.job.progress.running': 'Wird erledigt',
  'app.job.progress.waiting': 'Wartet auf das Senden',
  'app.job.progress.approved': 'Freigegeben',
  'app.job.progress.done': 'Erledigt',
  'app.job.progress.stopped': 'Angehalten',
  'app.job.progress.expired': 'Abgelaufen: Es wird nichts mehr gesendet',
  'app.job.progress.discarded': 'Verworfen: Es wurde nichts gesendet',
  'app.job.step.records.one': '{count} Datensatz speichern',
  'app.job.step.records.other': '{count} Datensätze speichern',
  'app.job.step.report': 'Den Bericht für {from} bis {to} senden',
  'app.job.step.stamp': '{name} mit Datum stempeln',
  'app.job.state.todo': 'Wartet',
  'app.job.state.running': 'Wird gesendet…',
  'app.job.state.done': 'Erledigt',
  'app.job.state.failed': 'Nicht gesendet',
  'app.job.state.needsYou': 'Wartet auf Sie',
  'app.job.state.waiting': 'Neuer Versuch {when}',
  'app.job.when.soon': 'in {n} Min. ({time})',
  'app.job.when.at': 'um {time}',
  'app.job.when.on': 'am {date}',
  'app.job.wait.records.one':
    'Nichts geht verloren: Ihr Datensatz bleibt hier und geht hinaus, sobald Sie wieder online sind.',
  'app.job.wait.records.other':
    'Nichts geht verloren: Ihre {count} Datensätze bleiben hier und gehen hinaus, sobald Sie wieder online sind.',
  'app.job.wait.cantCheck':
    'Nichts geht verloren: Ihre Datensätze sind hier gespeichert. Der Server von VeilCore konnte nicht gefragt werden, welche er schon hat, also wurde nichts erneut gesendet. Ich frage bald wieder.',
  'app.job.wait.notNoted':
    'Nichts geht verloren: Ihre Datensätze sind hier gespeichert. Dieser Browser konnte nicht festhalten, welche der Server von VeilCore schon hat, also wurde nichts erneut gesendet. Ich versuche es bald wieder.',
  'app.job.done.records.one': '{count} Datensatz gespeichert.',
  'app.job.done.records.other': '{count} Datensätze gespeichert.',
  'app.job.done.ids.one': 'Die Startseite erinnert Sie, {count} Kennnummer zu ergänzen.',
  'app.job.done.ids.other': 'Die Startseite erinnert Sie, {count} Kennnummern zu ergänzen.',
  'app.job.done.reports': 'Berichte gesendet. Der Lizenzgeber antwortet auf der Seite jeder Vereinbarung.',
  'app.job.done.ready': '{name}: lizenzbereit.',
  'app.job.done.already': 'Schon vorhanden: Es wurde nichts Neues gesendet.',
  'app.job.needs.report':
    'Dieser Bericht ist vielleicht schon hinausgegangen. Öffnen Sie die Vereinbarung, um nachzusehen. Ein neuer Versuch sendet nichts doppelt: Er sieht zuerst nach.',
  'app.job.needs.stamp':
    'Dieser Stempel ist vielleicht schon hinausgegangen. Öffnen Sie den Datensatz: Seine Seite prüft Midnight, und dort können Sie es erneut versuchen.',
  'app.job.needs.lapsed':
    'Sie haben das vor mehr als 3 Tagen freigegeben, und es ist noch nicht hinausgegangen. Jetzt senden oder verwerfen: Gesendet wurde nichts.',
  'app.job.needs.stuck':
    'Das wurde 30 Tage nach Ihrer Freigabe angehalten. Öffnen Sie Ihre Datensätze oder die Vereinbarung, um zu sehen, was angekommen ist.',
  'app.job.needs.stuckNone': 'Das wurde 30 Tage nach Ihrer Freigabe angehalten. Es wurde nichts gesendet.',
  'app.job.needs.stuckRecords':
    'Der Server von VeilCore hat diese Datensätze seit 30 Tagen nicht bestätigt. Sie sind weiter hier gespeichert. Einige sind vielleicht schon dort: „Jetzt senden“ prüft zuerst und sendet keinen doppelt.',
  'app.job.failed.amount':
    'Nicht gesendet: Der Betrag hat sich seit Ihrer Freigabe geändert (ein anderer Bericht oder eine Zahlung kam hinzu). Er beträgt jetzt {amount}. Fragen Sie erneut, um ihn zu senden.',
  'app.job.sendNow': 'Jetzt senden',
  'app.job.why': 'Die Meldung: {why}',
  'app.job.tryAgain': 'Erneut versuchen',
  'app.job.openRecord': 'Datensatz öffnen',
  'app.job.openNew': 'Neue Datensätze öffnen',
  'app.job.openAgreement': 'Vereinbarung öffnen',
  'app.job.toRecords': 'Zu Ihren Datensätzen',

  'app.job.home.title': 'Für mich erledigen',
  'app.job.home.check': 'Prüfen: {what}',
  'app.job.home.needs': 'Wartet auf Sie: {what}',
  'app.job.home.running': 'Wird erledigt: {what}',
  'app.job.home.ready': '{name}: lizenzbereit',
  'app.job.home.tomorrow': '{name}: morgen bereit',
  'app.job.home.ids.one': 'Jungtier von {dam} ({count}): Kennnummer ergänzen',
  'app.job.home.ids.other': 'Wurf von {dam} ({count}): Kennnummern ergänzen',
  'app.job.home.open': 'Öffnen',

  'app.job.ids.title.one': 'Kennnummer ergänzen: Jungtier von {dam}',
  'app.job.ids.title.other': 'Kennnummern ergänzen: {count} Jungtiere von {dam}',
  'app.job.ids.permanent':
    'Jede Kennnummer wird als Korrektur gespeichert: ein neuer Datensatz, der den alten ersetzt; der alte bleibt erhalten. Das lässt sich nicht rückgängig machen.',
  'app.job.ids.save.one': '{count} Kennnummer speichern',
  'app.job.ids.save.other': '{count} Kennnummern speichern',
  'app.job.ids.reason': 'Kennnummer ergänzt',
  'app.job.ids.already': 'bereits {id}',
  'app.job.ids.no.twice': '{id} steht in zwei Feldern.',
  'app.job.ids.no.taken': '{id} ist bereits die Kennnummer von {name}.',
  'app.job.ids.no.elsewhere': '{id} ist bereits die Kennnummer von {name}, einem anderen Ihrer Tiere.',
  'app.job.ids.offline':
    'Ihre anderen Geräte konnten nicht geprüft werden, daher wurde nichts gespeichert. Versuchen Sie es erneut, wenn Sie online sind.',
  'app.job.ids.clash':
    'Gespeichert, aber {id} steht jetzt bei {names}: Ein anderes Gerät hat es im selben Moment gespeichert. Korrigieren Sie eines davon noch heute.',
  'app.job.ids.changed':
    'Seit dies angezeigt wurde, hat sich auf einem anderen Gerät oder in einem anderen Tab etwas geändert, daher wurde nichts weiter gespeichert. Prüfen Sie die Felder und speichern Sie erneut.',
  'app.job.ids.paste.spaces':
    'Das sieht nach mehreren Kennnummern unterschiedlicher Form mit Leerzeichen dazwischen aus, daher ist nicht zu erkennen, welche welche ist. Nichts wurde ausgefüllt. Fügen Sie sie als Spalte ein oder geben Sie jede in ihr eigenes Feld ein.',
  'app.job.ids.paste.doubleScan':
    'Ein Scan kam in ein Feld, das schon eine Kennnummer hat, daher wurde er nicht verwendet. Um dieses Jungtier erneut zu scannen, leeren Sie zuerst sein Feld.',
  'app.job.ids.gone': 'Der Datensatz von {name} ist nicht mehr da. Schließen Sie dies und öffnen Sie es erneut.',
  'app.job.ids.keep': 'Weiter bearbeiten',
  'app.job.ids.discard': 'Verwerfen',
  'app.job.ids.discardAsk': 'Die eingegebenen Kennnummern verwerfen? Sie sind nicht gespeichert.',
  'app.job.ids.use': 'Diese Kennnummern verwenden',
  'app.job.ids.clear': 'Leeren',
  'app.job.ids.paste.over':
    'Das sind {n} Zeilen für {count} Felder von hier abwärts, es passt also nicht. Nichts wurde ausgefüllt. Kopieren Sie nur die Kennnummern dieser Jungtiere oder fügen Sie in ein Feld weiter oben ein.',
  'app.job.ids.paste.startsAt':
    '„{id}“ ist bereits die Kennnummer von {name}, diese Spalte beginnt also weiter oben. Nichts wurde ausgefüllt. Kopieren Sie nur die Kennnummern der Jungtiere, die noch keine haben.',
  'app.job.ids.paste.comma':
    'Zeile {line} enthält ein Komma oder Semikolon: eine Kennnummer pro Zeile. Nichts wurde ausgefüllt.',
  'app.job.ids.no.comma': 'Eine Kennnummer pro Feld: Hier steht ein Komma oder Semikolon.',
  'app.job.wait.refused':
    'Nichts geht verloren: Ihre Datensätze sind hier gespeichert. Der Server von VeilCore hat diese Speicherung abgelehnt, also ist noch nichts gespeichert. Ich versuche es erneut.',
  'app.job.ids.help':
    'Geben oder scannen Sie die Kennnummer jedes Jungtiers in sein eigenes Feld. Enter oder Tab eines Scanners springt zum nächsten leeren Feld. Sie können auch eine Spalte in ein Feld einfügen: Sie füllt dieses Feld und die darunter.',
  'app.job.ids.schemeNeeded': 'Geben Sie an, zu welcher Nummerierung diese Kennnummern gehören.',
  'app.job.ids.preview': 'Was gespeichert wird',
  'app.job.ids.previewNone': 'Noch nichts: Geben, scannen oder fügen Sie eine Kennnummer in ein Feld ein.',
  'app.job.ids.pair': '{name} bekommt {id}',
  'app.job.ids.fix.one': 'Korrigieren Sie zuerst das rot markierte Feld.',
  'app.job.ids.fix.other': 'Korrigieren Sie zuerst die {count} rot markierten Felder.',
  'app.job.ids.paste.columns':
    'Das ist mehr als eine Spalte. Kopieren Sie nur die Spalte mit den Kennnummern und fügen Sie sie erneut ein. Nichts wurde ausgefüllt.',
  'app.job.ids.paste.header':
    '„{id}“ sieht nach einer Spaltenüberschrift aus, nicht nach einer Kennnummer. Kopieren Sie die Kennnummern ohne Überschrift und fügen Sie sie erneut ein. Nichts wurde ausgefüllt.',
  'app.job.ids.paste.invisible':
    'Zeile {line} enthält unsichtbare Zeichen. Kopieren Sie die Kennnummern erneut oder geben Sie sie ein. Nichts wurde ausgefüllt.',
  'app.job.ids.paste.stopped.one':
    'Bei {name} angehalten: Es hat schon eine Kennnummer, also wurde 1 Zeile nicht verwendet.',
  'app.job.ids.paste.stopped.other':
    'Bei {name} angehalten: Es hat schon eine Kennnummer, also wurden {count} Zeilen nicht verwendet.',
  'app.job.ids.no.invisible':
    'Hier stehen unsichtbare Zeichen. Leeren Sie das Feld und geben oder scannen Sie die Kennnummer erneut.',
  'app.job.wait.noKey':
    'Ihre Datensätze sind hier gespeichert, aber diesem Browser fehlt der Schlüssel, unter dem der Server von VeilCore sie kennt, also wurde nichts erneut gesendet. Stellen Sie Ihre Sicherung wieder her, um fortzufahren.',
  'app.job.wait.full':
    'Nichts geht verloren: Ihre Datensätze sind hier gespeichert. Der Speicher dieses Geräts ist voll, also wurde nichts gesendet. Schaffen Sie etwas Platz; ich versuche es erneut.',
  'app.job.wait.local':
    'Nichts geht verloren: Ihre Datensätze sind hier gespeichert. Sie konnten gerade nicht von dieser Seite aus gespeichert werden, also wurde nichts gesendet. Ich versuche es bald erneut.',
} satisfies Partial<AppTranslation>;
