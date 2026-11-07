// Die Datensatz-App auf Deutsch: VeilCore fragen und Stapel neuer Datensätze (../en/ask.ts).
// ENTWURF: maschinell unterstützt, vor der Veröffentlichung von einer Muttersprachlerin oder
// einem Muttersprachler zu prüfen (docs/translations/README.md).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const ask = {
  'app.ask.button': 'Fragen',
  'app.ask.title': 'VeilCore fragen',
  'app.ask.intro': 'Wählen Sie etwas aus, oder schreiben Sie, was Sie tun möchten.',
  'app.ask.privacy': 'Was Sie hier tippen, wird nicht gesendet. Nur Speichern sendet.',
  'app.ask.engine': 'Funktioniert offline.',
  'app.ask.inputLabel': 'Was möchten Sie tun?',
  'app.ask.inputPlaceholder': 'z. B. 12 Stecklinge von Blue Dream schneiden',
  'app.ask.go': 'Los',
  'app.ask.close': 'Schließen',
  'app.ask.clear': 'Leeren',
  'app.ask.you': 'Sie: {text}',
  'app.ask.miss': 'Nicht sicher, was Sie meinen. Am nächsten kommt:',
  'app.ask.chip.record': 'Neuer Datensatz',
  'app.ask.chip.clones': 'Stecklinge schneiden',
  'app.ask.chip.offspring': 'Nachwuchs erfassen',
  'app.ask.chip.cross': 'Eine Kreuzung erfassen',
  'app.ask.chip.due': 'Was ist fällig',
  'app.ask.chip.explain': 'Ein Wort erklären',
  'app.ask.chip.search': 'Meine Datensätze durchsuchen',
  'app.ask.chip.backup': 'Sicherungskopie speichern',
  'app.ask.chip.agreements': 'Vereinbarungen',
  'app.ask.chip.import': 'Ihre Sammlung datieren',
  'app.ask.kind.plant': 'Pflanze',
  'app.ask.kind.animal': 'Tier',
  'app.ask.kind.strain': 'Stamm oder Linie',
  // ---- was Sie hier tun können (beim ersten Öffnen, dann unter einem Link) ----
  'app.ask.can.title': 'Ich kann:',
  'app.ask.can.1': 'Stecklinge oder Nachwuchs erfassen, viele auf einmal',
  'app.ask.can.1plants': 'Stecklinge erfassen, viele auf einmal',
  'app.ask.can.2': 'Zeigen, was fällig ist',
  'app.ask.can.3': 'Wörter wie „Prüfcode“ erklären',
  'app.ask.can.4': 'Ihre Datensätze finden',
  'app.ask.can.5': 'Einen neuen Datensatz für Sie ausfüllen, zum Prüfen und Speichern',
  'app.ask.can.never': 'Ich unterschreibe und sende nie etwas. Das tun Sie.',
  'app.ask.can.toggle': 'Was ist hier möglich?',
  // ---- der Hinweis am Knopf, sobald es einen Datensatz gibt (das Beispiel nennt ihn) ----
  'app.ask.hint.try': 'Probieren Sie: {example}',
  'app.ask.hint.dismiss': 'Ausblenden',
  'app.ask.example.clones': '6 Stecklinge von {name} schneiden',
  'app.ask.example.calves': '2 Kälber von {name} erfassen',
  // ---- das Sprachmodell auf diesem Gerät (optional) ----
  'app.ask.privacyModel':
    'Was Sie hier tippen, wird nicht gesendet. Das Sprachmodell läuft auf diesem Gerät. Nur Speichern sendet.',
  'app.ask.engine.model': 'Antworten kommen vom Sprachmodell auf diesem Gerät ({model}) und werden wie immer geprüft.',
  'app.ask.engine.starting': 'Das Sprachmodell auf diesem Gerät startet. Bis dahin funktioniert alles wie gewohnt.',
  'app.ask.engine.failed':
    'Das Sprachmodell auf diesem Gerät ist nicht gestartet. {why} Ohne Modell funktioniert alles wie gewohnt.',
  'app.ask.model.title': 'Sprachmodell auf diesem Gerät (optional)',
  'app.ask.model.what':
    '„VeilCore fragen“ funktioniert schon ohne das, auch offline. Sie können ein kleines Sprachmodell (Qwen3) hinzufügen, das nur in diesem Browser läuft. Es versteht vielleicht mehr Arten, etwas zu sagen. Es kann nichts, was „VeilCore fragen“ nicht schon kann, und seine Antworten werden genauso geprüft.',
  'app.ask.model.pick': 'Welches Modell',
  'app.ask.model.option': '{name}: etwa {size}',
  'app.ask.model.size': 'Download: {size}, in diesem Browser gespeichert, bis Sie es löschen.',
  'app.ask.model.hf':
    'Die Modelldateien kommen von Hugging Face. Hugging Face sieht Ihre IP-Adresse, die Uhrzeit, welches Modell und dass die Anfrage von veilcore.org kommt. Nichts, was Sie tippen, wird gesendet, weder dann noch später.',
  'app.ask.model.check':
    'Vor der Nutzung wird jede Datei geprüft: Sie muss genau die Datei sein, die diese Website erwartet.',
  'app.ask.model.needsConnection':
    'Bei jedem Start lädt dieser Browser das Programm des Modells von veilcore.org; dafür braucht es eine Verbindung. Nichts, was Sie tippen, wird gesendet.',
  'app.ask.model.folded': 'Optional: ein Sprachmodell auf diesem Computer',
  'app.ask.model.download': 'Herunterladen ({size})',
  'app.ask.model.resume': 'Download fortsetzen',
  'app.ask.model.cancel': 'Abbrechen',
  'app.ask.model.progress': '{done} von {total}',
  'app.ask.model.cancelled': 'Angehalten. Was heruntergeladen ist, bleibt; setzen Sie fort, wann Sie möchten.',
  'app.ask.model.delete': 'Modell aus diesem Browser löschen',
  'app.ask.model.deleted': 'Gelöscht. Alles funktioniert wie gewohnt.',
  'app.ask.model.stored': 'Heruntergeladen: {name}. Es wird einmal auf diesem Gerät getestet und dann genutzt.',
  'app.ask.model.noRoom':
    'Dieser Browser hat etwa {free} frei, das Modell braucht {size}. Ohne Modell funktioniert alles wie gewohnt.',
  'app.ask.model.failed.network':
    'Der Download ist abgebrochen (Verbindung). Sie können ihn fortsetzen. Ohne Modell funktioniert alles wie gewohnt.',
  'app.ask.model.failed.mismatch':
    'Eine Datei war nicht genau die, die diese Website erwartet, und wurde nicht behalten. Ohne Modell funktioniert alles wie gewohnt.',
  'app.ask.model.failed.storage':
    'Dieser Browser hat die Dateien nicht gespeichert. Ohne Modell funktioniert alles wie gewohnt.',
  'app.ask.model.failed.policy':
    'Dieser Browser kann das Sprachmodell nicht ausführen. Ein aktueller Chrome oder Edge kann es meist. Ohne Modell funktioniert alles wie gewohnt.',
  'app.ask.model.why.policy': 'Dieser Browser kann es nicht ausführen. Ein aktueller Chrome oder Edge kann es meist.',
  'app.ask.model.why.mismatch':
    'Eine gespeicherte Datei ist nicht die, die diese Website erwartet. Löschen Sie das Modell und laden Sie es neu herunter.',
  'app.ask.model.why.notStored': 'Ein Teil des Modells fehlt; setzen Sie den Download fort.',
  'app.ask.model.why.noGpu': 'Dieser Browser kann es nicht ausführen. Ein aktueller Chrome oder Edge kann es meist.',
  'app.ask.model.why.noF16': 'Die Grafik dieses Computers kann dieses Modell nicht ausführen.',
  'app.ask.model.why.selfTest': 'Es hat den Test auf diesem Gerät nicht bestanden.',
  'app.ask.model.why.failed': 'Es ist beim Laden stehen geblieben.',
  'app.ask.model.notHere.narrow': 'Machen Sie dieses Fenster breiter, um das optionale Sprachmodell zu sehen.',
  'app.ask.model.notHere.noWebgpu':
    'Dieser Browser kann das Sprachmodell nicht ausführen. Ein aktueller Chrome oder Edge kann es meist. Ohne Modell funktioniert alles wie gewohnt.',
  'app.ask.model.notHere.noF16':
    'Die Grafik dieses Computers kann das Sprachmodell nicht ausführen. Ohne Modell funktioniert alles wie gewohnt.',
  'app.ask.model.notHere.memory':
    'Dieser Computer hat zu wenig Arbeitsspeicher für das Sprachmodell. Ohne Modell funktioniert alles wie gewohnt.',
  'app.ask.draft.opens': 'Öffnet: {screen}',
  'app.ask.screen.record': 'Einen Datensatz anlegen ({kind})',
  'app.ask.screen.cross': 'Einen Datensatz anlegen: eine Kreuzung ({kind})',
  'app.ask.screen.clones': 'Stecklinge schneiden',
  'app.ask.screen.offspring': 'Nachwuchs erfassen',
  'app.ask.draft.name': 'Name: {v}',
  'app.ask.draft.parents': 'Eltern: {v}',
  'app.ask.draft.cutFrom': 'Geschnitten von: {v}',
  'app.ask.draft.count': 'Wie viele: {n}',
  'app.ask.draft.notFound': 'Keiner Ihrer Datensätze heißt „{name}“. Wählen Sie ihn auf dem Bildschirm aus.',
  'app.ask.draft.nothingSaved': 'Nichts wird gespeichert, bevor Sie dort auf Speichern tippen.',
  'app.ask.draft.open': 'Öffnen',
  'app.ask.banner.ask': 'Von „Fragen“ ausgefüllt. Prüfen Sie jedes markierte Feld.',
  'app.ask.banner.link':
    'Über einen Link geöffnet. Er hat nur die Art des Datensatzes und die Anzahl festgelegt. Prüfen Sie jedes markierte Feld.',
  'app.ask.replace.title': 'Sie haben einen Datensatz halb ausgefüllt',
  'app.ask.replace.note': 'Der neue Entwurf ersetzt, was Sie dort geschrieben haben.',
  'app.ask.replace.use': 'Den neuen Entwurf verwenden',
  'app.ask.due.title': 'Was ist fällig',
  'app.ask.due.from':
    'Aus Ihren Vereinbarungen in diesem Browser: ihren Bedingungen und den Berichten und Zahlungen, die diese Seite gelesen hat.',
  'app.ask.due.none': 'Unter den Vereinbarungen in diesem Browser ist nichts fällig.',
  'app.ask.due.report': 'Lizenzgebühren-Bericht: {name}, {from} bis {to}',
  'app.ask.due.payment': 'Lizenzgebühren-Zahlung: {name}, {from} bis {to}',
  'app.ask.due.check': '{name}: Öffnen Sie die Vereinbarung, um zu sehen, was fällig ist',
  'app.ask.due.ends': 'Vereinbarung endet: {name}',
  'app.ask.due.line': '{date}: {what}',
  'app.ask.due.overdue': 'Überfällig',
  'app.ask.due.ics': 'In meinen Kalender (.ics)',
  'app.ask.due.share': 'Erinnerung teilen',
  'app.ask.due.copied': 'Erinnerung kopiert.',
  'app.ask.due.shareText.one': '{count} Sache fällig bei VeilCore',
  'app.ask.due.shareText.other': '{count} Sachen fällig bei VeilCore',
  'app.ask.due.shareNote': 'Die Erinnerung nennt nur die Anzahl: keine Namen, Daten oder Beträge.',
  'app.ask.due.calName': 'VeilCore: {what}',
  'app.ask.explain.title': 'Erklären',
  'app.ask.explain.pick': 'Wählen Sie ein Wort:',
  'app.ask.term.priorPossession': 'Früheres Halten',
  'app.ask.def.priorPossession':
    'Ein Datensatz zeigt, dass Sie etwas zu einem Datum gehalten haben: Er wurde damals versiegelt, und sein Prüfcode wurde auf Midnight datiert. Mehr behauptet er nicht.',
  'app.ask.term.proofCode': 'Prüfcode',
  'app.ask.def.proofCode':
    'Ein kurzer Code, der aus einem versiegelten Datensatz entsteht. Jeder kann einen Datensatz damit prüfen, und er zeigt nichts von seinem Inhalt.',
  'app.ask.term.proof': 'Nachweis',
  'app.ask.def.proof':
    'Ein Schritt auf Midnight, der eine Sache über einen Datensatz zeigt, etwa dass Sie ihn heute halten, ohne den Datensatz zu zeigen.',
  'app.ask.term.dating': 'Datieren',
  'app.ask.def.dating':
    'Der Prüfcode Ihres Datensatzes geht mit anderen in einem Stapel auf Midnight. Das Datum des Stapels ist das Datum, zu dem Ihr Datensatz bestand.',
  'app.ask.term.license': 'Lizenz',
  'app.ask.def.license':
    'Eine Vereinbarung, mit der jemand Ihre Genetik zu Bedingungen nutzen darf, auf die Sie sich beide geeinigt haben. Midnight hält fest, dass sie besteht und gilt; die Bedingungen bleiben zwischen Ihnen.',
  'app.ask.term.royaltyReport': 'Lizenzgebühren-Bericht',
  'app.ask.def.royaltyReport':
    'Was ein Lizenznehmer nach den Bedingungen jede Periode schickt: wie viel er verkauft oder angebaut hat und was das ausmacht.',
  'app.ask.search.title': 'Ihre Datensätze',
  'app.ask.search.label': 'Ihre Datensätze durchsuchen',
  'app.ask.search.hint': 'In diesem Browser gesucht. Versuchen Sie einen Namen, ein Jahr, „Pflanze“ oder „Tier“.',
  'app.ask.search.none': 'Keiner Ihrer Datensätze in diesem Browser passt zu „{q}“.',
  'app.ask.search.found.one': '{count} Treffer',
  'app.ask.search.found.other': '{count} Treffer',
  'app.ask.search.more': 'und {n} weitere',
  'app.ask.batch.clonesTitle': 'Stecklinge schneiden',
  'app.ask.batch.offspringTitle': 'Nachwuchs erfassen',
  'app.ask.batch.clonesIntro':
    'Ein neuer Datensatz pro Steckling, jeder mit der Pflanze verknüpft, von der er geschnitten wurde.',
  'app.ask.batch.offspringIntro': 'Ein neuer Datensatz pro Jungtier, jeder mit Vater und Mutter verknüpft.',
  'app.ask.batch.cutFrom': 'Geschnitten von',
  'app.ask.batch.noPlants':
    'Erfassen Sie zuerst die Pflanze: Stecklinge werden von einem Ihrer Datensätze geschnitten.',
  'app.ask.batch.noAnimals':
    'Erfassen Sie zuerst Vater oder Mutter: Nachwuchs wird mit Ihren eigenen Datensätzen verknüpft.',
  'app.ask.batch.notListed': 'Keines',
  'app.ask.batch.howManyClones': 'Wie viele Stecklinge',
  'app.ask.batch.howManyYoung': 'Wie viele Jungtiere',
  'app.ask.batch.upTo': 'Bis zu {max}.',
  'app.ask.batch.unlikely':
    'Mehr als {n} Jungtiere auf einmal sind ungewöhnlich. Prüfen Sie die Zahl; speichern können Sie trotzdem.',
  'app.ask.batch.baseName': 'Name',
  'app.ask.batch.namedLike': 'Nummeriert: „{example}“ und so weiter.',
  'app.ask.batch.cloneName': '{name} Steckling',
  'app.ask.batch.youngName': '{name} Nachwuchs',
  'app.ask.batch.cutOn': 'Geschnitten am',
  'app.ask.batch.bornOn': 'Geboren am',
  'app.ask.batch.willMake.one': '{count} neuer Datensatz',
  'app.ask.batch.willMake.other': '{count} neue Datensätze',
  'app.ask.batch.private':
    'Jeder Datensatz hält den Namen seiner Eltern verschlossen in sich. Niemand sonst sieht die Verbindung.',
  'app.ask.batch.offline': 'Sie sind offline. Sie können hier alles prüfen; zum Speichern braucht es eine Verbindung.',
  'app.ask.batch.needsConnection': 'Zum Speichern braucht es eine Verbindung. Zuerst kommt Ihre Sicherungskopie.',
  'app.ask.batch.needParent': 'Wählen Sie die Pflanze, von der geschnitten wurde.',
  'app.ask.batch.needParents': 'Wählen Sie Vater, Mutter oder beide.',
  'app.ask.batch.needAll': 'Füllen Sie jedes Feld oben aus.',
  'app.ask.batch.sealing': 'Wird versiegelt…',
  'app.ask.batch.backupTitle': 'Zuerst die Sicherungskopie speichern',
  'app.ask.batch.saveThem.one': '{count} Datensatz speichern',
  'app.ask.batch.saveThem.other': '{count} Datensätze speichern',
  'app.ask.batch.savingTitle': 'Wird gespeichert',
  'app.ask.batch.saved.one': '{count} Datensatz gespeichert',
  'app.ask.batch.saved.other': '{count} Datensätze gespeichert',
  'app.ask.batch.chainTitle': 'Freiwillig: Abstammung auf Midnight prüfbar machen',
  'app.ask.batch.chainText':
    'Dieser Teil ist öffentlich. Jeder Datensatz braucht zwei Schritte: Sie nennen die Eltern auf Midnight, dann bestätigt der Inhaber der Eltern. Das geht auf der Seite jedes Datensatzes unter „Family on Midnight“.',
  'app.ask.batch.chainOpen': 'Den ersten öffnen',
  'app.ask.batch.toRecords': 'Zu Ihren Datensätzen',
  'app.ask.batch.cutClones': 'Stecklinge davon schneiden',
  'app.ask.batch.cutClonesHint': 'Ein neuer Datensatz pro Steckling, jeder mit dieser Pflanze verknüpft.',
  'app.ask.batch.recordOffspring': 'Nachwuchs erfassen',
  'app.ask.batch.recordOffspringHint': 'Ein neuer Datensatz pro Jungtier, jeder mit diesem Tier verknüpft.',
  'app.ask.batch.already':
    'Einige davon sind Datensätze, die Sie schon haben. Ändern Sie Namen oder Datum und versuchen Sie es noch einmal.',
  'app.ask.batch.receivedNote':
    'Hier wird nichts aus einem Datensatz ausgefüllt, den Ihnen jemand geschickt hat: Geben Sie es selbst ein.',
} satisfies Partial<AppTranslation>;
