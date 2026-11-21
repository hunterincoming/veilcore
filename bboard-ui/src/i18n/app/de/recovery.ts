// Die Datensätze-App auf Deutsch: das Wiederherstellungsblatt (../en/recovery.ts).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const recovery = {
  'app.recovery.err.length': 'Ein Wiederherstellungscode hat 28 Zeichen. Prüfen Sie, ob Sie ihn ganz eingegeben haben.',
  'app.recovery.err.typo': 'In diesem Code ist ein Fehler. Vergleichen Sie jedes Zeichen mit Ihrem Blatt.',
  'app.recovery.err.wrong': 'Dieser Code öffnet keine gespeicherten Datensätze. Vergleichen Sie ihn mit Ihrem Blatt.',
  'app.recovery.err.notThisSheet':
    'Das ist der Code eines älteren Blatts. Geben Sie den Code des Blatts ein, das Sie gerade gedruckt haben.',
  'app.recovery.err.needsSheet':
    'Ihr Passkey kann Ihre gespeicherten Datensätze hier nicht öffnen. Geben Sie den Code von Ihrem Wiederherstellungsblatt ein, um ihn neu einzurichten.',

  'app.recovery.prompt.title': 'Noch etwas: Ihr Wiederherstellungsblatt',
  'app.recovery.prompt.recommended': 'Empfohlen',
  'app.recovery.prompt.text':
    'Falls Sie Ihr Apple- oder Google-Konto verlieren, ist dieses Blatt der einzige Weg zurück. VeilCore kann es nicht für Sie wiederherstellen.',
  'app.recovery.prompt.bound':
    'Erstellen Sie es jetzt: Es ist der einzige Weg zurück. VeilCore kann es nicht für Sie wiederherstellen.',
  'app.recovery.prompt.make': 'Mein Wiederherstellungsblatt drucken oder speichern',
  'app.recovery.prompt.later': 'Später',

  'app.recovery.title': 'Ihr Wiederherstellungsblatt',
  'app.recovery.intro':
    'Es enthält einen Code, der Ihre gespeicherten Datensätze auf einem neuen Gerät öffnet. Der Code entsteht auf diesem Gerät, und VeilCore sieht ihn nie.',
  'app.recovery.asking': 'Ihr Gerät fragt einmal, um Ihre Datensätze zu öffnen und das Blatt zu erstellen.',
  'app.recovery.haveOne': 'Ich habe mein Blatt: prüfen',
  'app.recovery.onlyNow':
    'Dieser Code wird nur angezeigt, solange dieses Fenster offen ist. Drucken Sie das Blatt oder schreiben Sie den Code ab, bevor Sie es schließen.',
  'app.recovery.print': 'Drucken oder als PDF speichern',
  'app.recovery.next': 'Weiter: prüfen',
  'app.recovery.confirm.lead': 'Damit Ihr Blatt sicher stimmt, geben Sie den ganzen Code davon ein.',
  'app.recovery.confirm.label': 'Wiederherstellungscode',
  'app.recovery.confirm.check': 'Prüfen',
  'app.recovery.confirm.skip': 'Vorerst überspringen',
  'app.recovery.confirm.back': 'Code noch einmal zeigen',
  'app.recovery.done.title': 'Ihr Wiederherstellungsblatt funktioniert.',
  'app.recovery.done.text':
    'Bewahren Sie es bei Ihren wichtigen Unterlagen auf. Ein älteres Blatt funktioniert nicht mehr.',
  'app.recovery.done.ok': 'Fertig',
  'app.recovery.close': 'Schließen',
  'app.recovery.failed': 'Das hat nicht geklappt: {why}',

  'app.recovery.sheet.title': 'VeilCore-Wiederherstellungsblatt',
  'app.recovery.sheet.keep':
    'Bewahren Sie es bei Ihrem Herdbuch oder anderen wichtigen Unterlagen auf. Nicht fotografieren und nicht per E-Mail senden.',
  'app.recovery.sheet.codeLabel': 'Wiederherstellungscode',
  'app.recovery.sheet.made': 'Erstellt am {date}.',
  'app.recovery.sheet.passkey':
    'Der Passkey, der dieselben Datensätze öffnet, heißt in Ihren Passwörtern „VeilCore: unlocks your records · {tag}“.',
  'app.recovery.sheet.how':
    'So holen Sie Ihre Datensätze zurück: Öffnen Sie {site}, tippen Sie auf „Meine Datensätze zurückholen“, dann auf „Andere Wege“, wählen Sie „Mein Wiederherstellungsblatt verwenden“ und geben Sie den Code ein.',
  'app.recovery.sheet.phishing':
    'VeilCore fragt nach diesem Code nur unter {site}: um dieses Blatt zu prüfen oder um Ihre Datensätze zurückzuholen. Geben Sie ihn nirgendwo sonst ein. Lesen Sie ihn nie am Telefon, per WhatsApp oder E-Mail vor, auch nicht VeilCore.',
  'app.recovery.sheet.anyone':
    'Wer diesen Code hat, kann Ihre Datensätze öffnen. VeilCore bewahrt ihn nicht auf und kann ihn Ihnen nicht noch einmal sagen.',
  'app.recovery.sheet.newer': 'Sobald Sie ein neueres Blatt prüfen, funktioniert dieses nicht mehr.',

  'app.recovery.restore.use': 'Mein Wiederherstellungsblatt verwenden',
  'app.recovery.restore.lead':
    'Geben Sie den Code von Ihrem Wiederherstellungsblatt ein. Bindestriche und Leerzeichen spielen keine Rolle.',
  'app.recovery.restore.what':
    'Ein Wiederherstellungsblatt ist eine ausgedruckte Seite mit einem Code aus 28 Zeichen. Sie können es in den Einstellungen anlegen, nachdem Sie einen Passkey eingerichtet haben; wenn Sie nie eines angelegt haben, nutzen Sie einen anderen Weg.',
  'app.recovery.restore.open': 'Meine Datensätze öffnen',
  'app.recovery.restore.addTitle': 'Beim nächsten Mal von selbst öffnen',
  'app.recovery.restore.addText':
    'Richten Sie auf diesem Gerät einen Passkey ein: Dann speichert es weiter und öffnet Ihre Datensätze ohne das Blatt.',
  'app.recovery.restore.added': 'Erledigt. Dieses Gerät öffnet Ihre gespeicherten Datensätze jetzt von selbst.',

  'app.settings.ways.sheet': 'Wiederherstellungsblatt · erstellt am {date}',
  'app.settings.ways.sheetChecked': 'Geprüft am {date}.',
  'app.settings.ways.sheetUnchecked': 'Noch nicht geprüft: Geben Sie seinen Code ein, um es zu prüfen.',
  'app.settings.sheet.why':
    'Ein Wiederherstellungsblatt öffnet Ihre gespeicherten Datensätze auf einem neuen Gerät, falls Sie das Handy oder den Computer mit Ihrem Passkey verlieren oder das Konto, in dem er gespeichert ist.',
  'app.settings.sheet.make': 'Wiederherstellungsblatt erstellen',
  'app.settings.sheet.makeNew': 'Neues Wiederherstellungsblatt erstellen',
  'app.settings.sheet.check': 'Mein Wiederherstellungsblatt prüfen',
  'app.settings.faceId.here': 'Dieses Gerät hat Ihre Datensätze mit dem Wiederherstellungsblatt geöffnet.',

  'app.account.line.makeSheet': 'Wiederherstellungsblatt erstellen',
  'app.account.line.later': 'Später',
  'app.account.line.reminder':
    '<b>Erstellen Sie ein Wiederherstellungsblatt:</b> Ihr Weg zurück, falls Sie Ihren Passkey einmal verlieren.',
  'app.account.line.reverify':
    'Es ist eine Weile her. Prüfen Sie, ob Ihr Passkey Ihre gespeicherten Datensätze noch öffnet.',
  'app.account.line.check': 'Prüfen',

  'app.account.sheet.setUpAgain': 'Neu einrichten',
  'app.recovery.noPrinter':
    'Kein Drucker? Schreiben Sie den Code von Hand auf Papier. Wenn Sie ein PDF speichern, bewahren Sie es auf einem USB-Stick auf, nicht in E-Mail, Chat, iCloud, Google Drive oder OneDrive.',
  'app.recovery.prompt.laterBound': 'Ich mache es später',
  'app.recovery.err.noMatch':
    'Das passt nicht zu Ihrem Blatt. Prüfen Sie jedes Zeichen und versuchen Sie es noch einmal.',
  'app.recovery.done.first': 'Bewahren Sie es bei Ihren wichtigen Unterlagen auf, nicht auf Ihrem Handy.',
  'app.recovery.sheet.lost':
    'Blatt verloren, oder hat es jemand gesehen? Erstellen Sie jetzt in den Einstellungen ein neues.',
  'app.recovery.sheet.letters': 'Die Buchstaben O, I und L kommen nicht vor: Lesen Sie sie als 0 und 1.',
  'app.account.sheet.noSheet': 'Ich habe mein Blatt nicht: neu beginnen',
  'app.account.sheet.noSheetConfirm':
    'Ohne das Blatt neu beginnen? Ihre gespeicherten Datensätze werden durch eine neue Kopie von diesem Gerät ersetzt, und alle Wiederherstellungsblätter funktionieren nicht mehr. Datensätze, die nur auf Ihren anderen Geräten sind, kommen zurück, sobald diese wieder speichern.',
} satisfies Partial<AppTranslation>;
