// Die Datensatz-App auf Deutsch: „Für mich erledigen“ in VeilCore fragen (../en/job.ts).
// DRAFT: machine-assisted, to be checked by a fluent speaker before publishing (docs/translations/README.md).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const job = {
  'app.job.mode': 'Für mich erledigen',
  'app.job.modeHelp':
    'Ich bereite alles auf diesem Gerät vor und zeige Ihnen ein Ergebnis. Gesendet wird erst, wenn Sie zustimmen.',
  'app.job.working': 'Wird vorbereitet. Gesendet wird erst, wenn Sie zustimmen.',
  'app.job.privacy':
    'Der Auftrag bleibt nur auf diesem Gerät, kommt in keine Sicherung und wird 7 Tage nach seinem Ende gelöscht.',

  'app.job.no.hint':
    'Ändern Sie zuerst das Beispiel oder schreiben Sie selbst: Ein Auftrag beginnt nur mit dem, was Sie schreiben.',
  'app.job.no.negation':
    'Auf eine Bitte, die sagt, was nicht getan werden soll, handle ich nicht. Sagen Sie nur, was zu tun ist.',
  'app.job.no.leftover': 'Ich konnte nicht jedes Wort verwenden: „{words}“. Sagen Sie es einfacher.',
  'app.job.no.tooMany': 'Das ist mehr, als ich auf einmal kann. Bitten Sie um eine Sache.',
  'app.job.no.oneJob': 'Ich erledige einen Auftrag nach dem anderen. Bitten Sie um den ersten.',
  'app.job.no.partB':
    'Lizenzieren gehört noch nicht zu „Für mich erledigen“. Öffnen Sie die Seite des Datensatzes, um ihn zu lizenzieren.',
  'app.job.no.money': 'Ich sende und verspreche kein Geld. Lizenzberichte finden Sie unter „Was fällig ist“.',
  'app.job.no.notJob':
    'Nachweise, Übertragungen, Korrekturen und Entfernen geschehen auf der eigenen Seite des Datensatzes.',
  'app.job.no.stampAll':
    'Ich stemple nur einen Datensatz, den Sie gleich lizenzieren. Sagen Sie seinen Namen und „lizenzbereit“.',
  'app.job.no.received': 'Dieser Datensatz kam von jemand anderem, darum verwende ich ihn hier nicht.',
  'app.job.no.noRecord':
    'Ich habe diesen Datensatz in diesem Browser nicht gefunden. Verwenden Sie den Namen wie auf seiner Seite.',
  'app.job.no.wrongKind': 'Dieser Datensatz passt nicht: Stecklinge kommen von einer Pflanze, Jungtiere von Tieren.',
  'app.job.no.count': 'Sagen Sie einmal, wie viele: zum Beispiel „12 Stecklinge“.',
  'app.job.no.sexCount': 'Die Zahlen gehen nicht auf. Sagen Sie, wie viele insgesamt und wie viele von jedem.',
  'app.job.no.unknown': 'Das kann ich nicht als Auftrag erledigen. Am nächsten:',
  'app.job.no.vault': 'Öffnen Sie VeilCore zuerst einmal mit einer Verbindung.',
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
  'app.job.no.notReady': 'Dieser Auftrag wartet nicht mehr auf Ihre Zustimmung.',
  'app.job.no.expired': 'Dieser Auftrag ist älter als 72 Stunden. Fragen Sie noch einmal, um einen neuen zu erstellen.',
  'app.job.no.gone': 'Dieser Auftrag ist nicht mehr in diesem Browser.',
  'app.job.open': 'Prüfen',

  'app.job.title.clones.one': 'Bitte prüfen: {count} Steckling von {name}',
  'app.job.title.clones.other': 'Bitte prüfen: {count} Stecklinge von {name}',
  'app.job.title.offspring.one': 'Bitte prüfen: {count} Jungtier von {name}',
  'app.job.title.offspring.other': 'Bitte prüfen: {count} Jungtiere von {name}',
  'app.job.title.import': 'Bitte prüfen: Ihre Sammlung aus einer Datei',
  'app.job.title.due.one': 'Bitte prüfen: {count} Bericht zu senden',
  'app.job.title.due.other': 'Bitte prüfen: {count} Berichte zu senden',
  'app.job.title.ready': 'Bitte prüfen: {name} lizenzbereit machen',

  'app.job.answer.title': 'Nur Sie können das beantworten',
  'app.job.answer.bredBy': 'Wer hat sie gezüchtet?',
  'app.job.answer.taxon': 'Welche Art sind sie?',
  'app.job.answer.scheme': 'Welche Art von Kennung ist das?',
  'app.job.answer.ids': 'Kennungen (freiwillig): eine Spalte einfügen, eine pro Zeile, in Reihenfolge',
  'app.job.answer.idsLater': 'Noch keine Kennungen? Lassen Sie es leer: Die Startseite erinnert Sie.',
  'app.job.answer.idsCount': '{n} von {count} eingefügt.',
  'app.job.answer.file': 'Wählen Sie die Datei mit Ihrer Sammlung (CSV oder Excel).',
  'app.job.answer.filePick': 'Datei wählen',
  'app.job.answer.use': 'Übernehmen',
  'app.job.answer.backup': 'Speichern und prüfen Sie Ihre Sicherung (unten).',

  'app.job.made.title': 'Was ich vorbereitet habe',
  'app.job.made.records.one': '{count} Datensatz, hier versiegelt und nicht gesendet: {first}',
  'app.job.made.records.other': '{count} Datensätze, hier versiegelt und nicht gesendet: {first} bis {last}',
  'app.job.made.cutFrom': 'Geschnitten von {name}, mit Datum von heute ({date})',
  'app.job.made.born': 'Heute geboren ({date})',
  'app.job.made.dam': 'Mutter: {name}',
  'app.job.made.sire': 'Vater: {name}',
  'app.job.made.sireTyped': 'Vater nicht auf VeilCore: {code}',
  'app.job.made.sexes': '{m} männlich, {f} weiblich, {u} nicht angegeben',
  'app.job.made.tags': 'Pflanzenetiketten {first} bis {last}',
  'app.job.made.ids': 'Kennungen: {first} bis {last}',
  'app.job.made.noIds.one': 'Noch keine Kennung für {count}: Die Startseite fragt danach.',
  'app.job.made.noIds.other': 'Noch keine Kennungen für {count}: Die Startseite fragt danach.',
  'app.job.made.importReady.one': '{count} bereit',
  'app.job.made.importReady.other': '{count} bereit',
  'app.job.made.importFix.one':
    '{count} muss korrigiert werden (Zeile {rows}): Korrigieren Sie sie in der Datei und laden Sie sie erneut.',
  'app.job.made.importFix.other':
    '{count} müssen korrigiert werden (Zeilen {rows}): Korrigieren Sie sie in der Datei und laden Sie sie erneut.',
  'app.job.made.expect': 'Sie sagten {n}; die Datei hat {m} bereit.',
  'app.job.made.file': 'Aus {file}',
  'app.job.made.report': 'Bericht für {from} bis {to}',
  'app.job.made.namedBy': '„{label}“, von der Gegenseite benannt',
  'app.job.made.stamp': 'Ein Datumsstempel auf Midnight für den Schlüssel von {name}',
  'app.job.made.stamped': 'Der Schlüssel von {name} ist schon gestempelt.',

  'app.job.approve.title': 'Wenn Sie zustimmen',
  'app.job.approve.before': 'Bis Sie zustimmen, verwirft „Verwerfen“ alles: Es wurde nichts gesendet.',
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
    'Der Stempel für {name} geht morgen hinaus: Die kostenlosen Stempel von heute scheinen von hier aus verbraucht.',
  'app.job.approve.public': 'Was öffentlich wird',
  'app.job.approve.publicRecords':
    'Der Prüfcode jedes Datensatzes geht an den Server von VeilCore und wird in einer Sammlung auf Midnight datiert. Namen und Angaben gehen mit Ihrem Schlüssel verschlossen: Der Server kann sie nicht lesen.',
  'app.job.approve.publicReports':
    'Nichts Öffentliches: Jeder Bericht geht verschlossen an den Lizenzgeber, über den eigenen Kanal Ihrer Vereinbarung.',
  'app.job.approve.offline':
    'Kein Netz? Kein Problem. Ich sende es, wenn Sie wieder online sind und VeilCore offen ist.',

  'app.job.backup.records.one':
    'Speichern Sie zuerst Ihre Sicherung. Ohne sie verlieren Sie mit diesem Telefon auch diesen Datensatz.',
  'app.job.backup.records.other':
    'Speichern Sie zuerst Ihre Sicherung. Ohne sie verlieren Sie mit diesem Telefon auch diese {count} Datensätze.',
  'app.job.backup.ready':
    'Speichern Sie zuerst Ihre Sicherung. Eine Vereinbarung kann erst gespeichert werden, wenn eine geprüfte Sicherung ihren Schlüssel enthält.',
  'app.job.backup.done': 'Sicherung geprüft.',
  'app.job.backup.finish': 'Zurück zum Auftrag',

  'app.job.btn.records.one': 'Zustimmen: {count} Datensatz speichern',
  'app.job.btn.records.other': 'Zustimmen: {count} Datensätze speichern',
  'app.job.btn.reports.one': 'Zustimmen: {count} Bericht senden, insgesamt {total} geschuldet',
  'app.job.btn.reports.other': 'Zustimmen: {count} Berichte senden, insgesamt {total} geschuldet',
  'app.job.btn.stamp': 'Zustimmen: {name} stempeln',
  'app.job.btn.ready': 'Zustimmen',
  'app.job.btn.change': 'Etwas ändern',
  'app.job.btn.discard': 'Verwerfen',
  'app.job.left.questions.one': 'Beantworten Sie {count} Frage, um zuzustimmen',
  'app.job.left.questions.other': 'Beantworten Sie {count} Fragen, um zuzustimmen',
  'app.job.left.scroll': 'Lesen Sie „Nicht rückgängig zu machen“, um zuzustimmen',
  'app.job.left.ready': 'Bereit zur Zustimmung',
  'app.job.readOnly': 'Öffnen Sie es von der Startseite aus, um zuzustimmen.',
  'app.job.discarded': 'Verworfen. Es wurde nichts gesendet.',

  'app.job.report.sales': 'Umsatz von {from} bis {to} ({currency})',
  'app.job.report.units': 'Einheiten von {from} bis {to}',
  'app.job.report.offspring': 'Nachkommen, gleicher Zeitraum',
  'app.job.report.nothing': 'Nichts zu berichten',
  'app.job.report.owed': '{amount} geschuldet',
  'app.job.report.topUp': 'Beim Senden kann eine Aufstockung auf das Jahresminimum hinzukommen.',

  'app.job.progress.running': 'Wird erledigt',
  'app.job.progress.approved': 'Zugestimmt',
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
  'app.job.state.failed': 'Abgelehnt',
  'app.job.state.needsYou': 'Braucht Sie',
  'app.job.state.waiting': 'Neuer Versuch {when}',
  'app.job.done.records.one': '{count} Datensatz gespeichert.',
  'app.job.done.records.other': '{count} Datensätze gespeichert.',
  'app.job.done.reports': 'Berichte gesendet. Der Lizenzgeber antwortet auf der Seite jeder Vereinbarung.',
  'app.job.done.ready': '{name}: lizenzbereit.',
  'app.job.done.already': 'Schon vorhanden: Es wurde nichts Neues gesendet.',
  'app.job.needs.report':
    'Dieser Bericht ist vielleicht schon hinausgegangen. Öffnen Sie die Vereinbarung, um nachzusehen. Ein neuer Versuch sendet nichts doppelt: Er sieht zuerst nach.',
  'app.job.needs.stamp':
    'Dieser Stempel ist vielleicht schon hinausgegangen. Öffnen Sie den Datensatz und sehen Sie nach, bevor Sie es erneut versuchen.',
  'app.job.why': 'Die Meldung: {why}',
  'app.job.tryAgain': 'Erneut versuchen',
  'app.job.openRecord': 'Datensatz öffnen',
  'app.job.openAgreement': 'Vereinbarung öffnen',
  'app.job.toRecords': 'Zu Ihren Datensätzen',

  'app.job.home.title': 'Aufträge von „VeilCore fragen“',
  'app.job.home.check': 'Ein Auftrag ist bereit zur Prüfung.',
  'app.job.home.needs': 'Ein Auftrag braucht Sie.',
  'app.job.home.running': 'Ein Auftrag wird erledigt.',
  'app.job.home.ready': '{name}: lizenzbereit',
  'app.job.home.tomorrow': '{name}: morgen bereit',
  'app.job.home.ids.one': '{count} Kennung hinzufügen',
  'app.job.home.ids.other': '{count} Kennungen hinzufügen',
  'app.job.home.open': 'Öffnen',
} satisfies Partial<AppTranslation>;
