// German (Sie). DRAFT: machine-assisted, to be checked by a fluent speaker before publishing
// (docs/translations/README.md). Terms as in ../../de.ts.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const prove = {
  'app.prove.share.checkingNow': 'Wird geprüft, was jetzt geteilt ist…',
  'app.prove.share.saveNote': ' „Link holen“ speichert die Schalter oben, und die Prüfseite zeigt dann genau das.',
  'app.prove.share.couldntRead': 'Was jetzt geteilt ist, konnte nicht aus dem Register gelesen werden.{save}',
  'app.prove.share.onlyBasicsUnsaved':
    'Jetzt geteilt: nur die Grundangaben. Die Schalter oben sind ein Vorschlag und noch nicht gespeichert.{save}',
  'app.prove.share.semicolon': '; ',
  'app.prove.share.onlyBasics': 'nur die Grundangaben',
  'app.prove.share.sharedNow': 'Jetzt geteilt: {now}.{differs}',
  'app.prove.share.differs': ' Die Schalter oben weichen davon ab.{save}',
  'app.prove.yourRequest': 'Ihre Anfrage',
  'app.prove.youAskedNamed':
    'Sie haben den Inhaber von <b>{name}</b> gebeten zu beweisen, dass er sie hält. Senden Sie ihm diesen Link, falls noch nicht geschehen.',
  'app.prove.youAsked':
    'Sie haben den Inhaber dieser Pflanze gebeten zu beweisen, dass er sie hält. Senden Sie ihm diesen Link, falls noch nicht geschehen.',
  'app.prove.openCheckPage': 'Die Prüfseite der Pflanze öffnen',
  'app.prove.opening': 'Anfrage wird geöffnet…',
  'app.prove.ended': 'Diese Anfrage ist beendet',
  'app.prove.cantOpen': 'Kann gerade nicht geöffnet werden',
  'app.prove.expired':
    'Sie ist abgelaufen (Anfragen gelten eine Woche), oder der Link ist nicht vollständig. Bitten Sie um einen neuen.',
  'app.prove.missingPart': 'Diesem Link fehlt der letzte Teil',
  'app.prove.missingPartText':
    'Die Antwort kann nur mit dem ganzen Link zurückgehen. Öffnen Sie den Link genau so, wie er gesendet wurde, oder bitten Sie darum, ihn erneut zu senden.',
  'app.prove.someoneWants': 'Jemand möchte, dass Sie beweisen, dass Sie eine Pflanze halten',
  'app.prove.noPlantsHere':
    'Ihre Pflanzen sind nicht auf diesem Telefon oder Computer. Öffnen Sie diesen Link dort, wo Sie sie aufbewahren, oder holen Sie sie hier aus Ihrer Sicherungsdatei zurück und öffnen Sie den Link dann erneut.',
  'app.prove.notThisPlant':
    'Keine der Pflanzen hier ist die, nach der gefragt wurde. Wenn Sie sie auf einem anderen Telefon oder Computer aufbewahren, öffnen Sie diesen Link dort. Wenn Sie sie nur in einer Sicherungsdatei haben, stellen Sie sie hier wieder her und öffnen Sie den Link dann erneut.',
  'app.prove.getBack': 'Meine Pflanzen aus einer Sicherungskopie zurückholen',
  'app.prove.done': 'Fertig',
  'app.prove.doneText':
    'Die Antwort erscheint auf der Seite des Anfragenden. Über die Pflanze wurde nichts gesendet: nur der Beweis, dass Sie ihren Datensatz halten.',
  'app.prove.thePlant': 'die Pflanze',
  'app.prove.didntSend': 'Bewiesen, aber die Antwort wurde nicht gesendet',
  'app.prove.sendInstead': '({why}.) Senden Sie stattdessen dies; es kann unter „Von Hand“ eingefügt werden:',
  'app.prove.copy': 'Kopieren',
  'app.prove.title': 'Beweisen Sie, dass Sie {name} halten',
  'app.prove.thisPlant': 'diese Pflanze',
  'app.prove.askedBy':
    'Angefragt von jemandem, der angibt, <b>„{asker}“</b> zu sein. <muted>VeilCore hat das nicht geprüft.</muted>',
  'app.prove.askedAnon': 'Jemand hat Sie gebeten, es zu beweisen, ohne einen Namen zu nennen.',
  'app.prove.whatSends':
    '<b>Was gesendet wird:</b> nur der Beweis, dass Sie den Datensatz dieser Pflanze halten, im Testnetzwerk. Kein Name, keine Genetik, nichts über Ihre anderen Pflanzen.',
  'app.prove.testOnly': 'Beweisen funktioniert derzeit nur in der Testversion.',
  'app.prove.answering':
    'Wenn Sie antworten, erfährt die Person, die Ihnen diesen Link gesendet hat, dass Sie den Datensatz dieser Pflanze halten.',
  'app.prove.proving': 'Wird bewiesen…',
  'app.prove.proveIt': 'Beweisen',
  'app.prove.fewMinutes': 'Das kann einige Minuten dauern. Testnetzwerk: nur zum Üben.',
  'app.prove.ask.cantAsk': 'Mit diesem Link kann kein Beweis angefragt werden',
  'app.prove.ask.refused': '{reason}. Ein damit erstellter Beweis würde nichts über diesen Datensatz aussagen.',
  'app.prove.ask.noLink': 'Es wurde kein Link erstellt: {error}.',
  'app.prove.ask.title': 'Bitten Sie um den Beweis, dass sie gehalten wird',
  'app.prove.ask.intro':
    'Sie senden einen Link. Die Person öffnet ihn und tippt auf „Beweisen“. Die Antwort erscheint hier. Diese Seite prüft die Antwort selbst im Netzwerk, über einen Midnight-Indexer (auf der Testseite über das Relais von VeilCore). Prüfen Sie die Transaktion für eine wichtige Entscheidung bei einem zweiten Indexer. Nur Testnetzwerk.',
  'app.prove.ask.bound':
    'Dieser Datensatz hat beim Versiegeln seinen eigenen Schlüssel genannt. Diese Seite hat geprüft, dass der Schlüssel in Ihrem Link dieser ist.',
  'app.prove.ask.older':
    'Älterer Datensatz: Schlüssel nicht an diesen Datensatz gebunden. Ein Beweis zeigt die Kontrolle über den im Link genannten Schlüssel, den der Inhaber gewählt hat.',
  'app.prove.ask.newRequest': 'Eine neue Anfrage erstellen',
  'app.prove.ask.name': 'Ihr Name oder Unternehmen (optional)',
  'app.prove.ask.nameHelp': 'Wird angezeigt, markiert als nicht von VeilCore geprüft.',
  'app.prove.ask.making': 'Link wird erstellt…',
  'app.prove.ask.make': 'Einen Link zum Senden erstellen',
  'app.prove.ask.byHand': 'Stattdessen von Hand',
  'app.prove.hand.intro':
    'Der Link, den Sie erhalten haben, nennt eine On-Chain-Identität für diesen Datensatz ({id}…). Erstellen Sie eine Herausforderung, senden Sie sie und fügen Sie die Transaktions-ID ein, die Sie zurückerhalten. Die Antwort muss von dieser Identität kommen und Ihre Herausforderung beantworten, und die Identität muss verankert und aktuell sein. {bound}',
  'app.prove.hand.bound':
    'Der Datensatz hat diesen Schlüssel beim Versiegeln genannt, und diese Seite hat das mit seinem Prüfcode abgeglichen.',
  'app.prove.hand.older':
    'Älterer Datensatz: Schlüssel nicht an diesen Datensatz gebunden. Dass diese Identität zu ihm gehört, ist die Angabe des Inhabers.',
  'app.prove.hand.make': 'Eine Herausforderung erstellen',
  'app.prove.hand.yourChallenge': 'Ihre Herausforderung (an den Inhaber senden; gilt einmal, in diesem Tab):',
  'app.prove.hand.txId': 'Die Transaktions-ID des Inhabers',
  'app.prove.hand.check': 'Antwort prüfen',
  'app.prove.hand.acceptedKey':
    'Akzeptiert: Wer diese Transaktion gesendet hat, kontrolliert den eigenen Schlüssel dieses Datensatzes und hat Ihre Herausforderung beantwortet.',
  'app.prove.hand.acceptedSecret':
    'Akzeptiert: Wer diese Transaktion gesendet hat, hält das Geheimnis dieser Identität und hat Ihre Herausforderung beantwortet.',
  'app.prove.hand.notAccepted': 'Nicht akzeptiert: {reason}.',
  'app.prove.hand.anchorYes': ' Die vom Inhaber genannte Verankerungstransaktion erzeugt tatsächlich diese Identität.',
  'app.prove.hand.anchorNo': ' Die vom Inhaber genannte Verankerungstransaktion konnte nicht bestätigt werden.',
  'app.prove.key.leavesOut':
    'Dieser Datensatz nennt seinen eigenen Schlüssel, aber diesem Link fehlt, was zum Prüfen nötig ist. Bitten Sie den Inhaber um einen neuen Link',
  'app.prove.key.noFp':
    'Der Prüfcode dieses Links passt nicht zum Datensatz, daher lässt sich sein Schlüssel nicht damit prüfen',
  'app.prove.key.notThis': 'Der Schlüssel in diesem Link ist nicht der, den dieser Datensatz nennt',
  'app.prove.watch.shareAsker':
    '{asker} bittet Sie, auf VeilCore zu beweisen, dass Sie diese Pflanze halten. Öffnen Sie diesen Link: {link}',
  'app.prove.watch.share':
    'Ich bitte Sie, auf VeilCore zu beweisen, dass Sie diese Pflanze halten. Öffnen Sie diesen Link: {link}',
  'app.prove.watch.sendIt': 'Senden',
  'app.prove.watch.copyLink': 'Link kopieren',
  'app.prove.watch.key': 'Schlüssel: ',
  'app.prove.watch.confirmed': 'Bestätigt',
  'app.prove.watch.controlsOwn':
    'Wer geantwortet hat, kontrolliert gerade den eigenen Schlüssel dieses Datensatzes. Der Datensatz hat diesen Schlüssel beim Versiegeln genannt, daher kann er nicht ausgetauscht werden.',
  'app.prove.watch.controlsLink': 'Wer geantwortet hat, kontrolliert gerade den in diesem Link genannten Schlüssel.',
  'app.prove.watch.stampNotConfirmed':
    'Der Datumsstempel des im Link genannten Schlüssels konnte nicht bestätigt werden.',
  'app.prove.watch.notWho': 'Es zeigt nicht, wer die Person ist oder wer die Pflanze gezüchtet hat.',
  'app.prove.watch.olderRecord': 'Älterer Datensatz: Schlüssel nicht an diesen Datensatz gebunden.',
  'app.prove.watch.holderStatement':
    'Dass dieser Schlüssel zum Datensatz dieser Pflanze gehört, ist vorerst die Angabe des Inhabers. Es zeigt nicht, wer die Person ist oder wer die Pflanze gezüchtet hat.',
  'app.prove.watch.checkedAt':
    'Geprüft {when} im Testnetzwerk, das zurückgesetzt werden kann: nur zum Üben, keine Beweiskraft.',
  'app.prove.watch.expired': 'Diese Anfrage ist ohne Antwort abgelaufen. Erstellen Sie eine neue.',
  'app.prove.watch.checking': 'Eine Antwort ist eingegangen. Sie wird im Netzwerk geprüft…',
  'app.prove.watch.pending':
    'Eine Antwort ist eingegangen. Das Netzwerk zeigt sie noch nicht, daher wird weiter geprüft.',
  'app.prove.watch.unreachable': 'VeilCore ist gerade nicht erreichbar. Es wird weiter versucht.',
  'app.prove.watch.waiting':
    'Es wird auf den Beweis gewartet. Sie können diese Seite schließen: Um die Antwort zu sehen, öffnen Sie den gesendeten Link in diesem Browser.',
  'app.prove.watch.refused.one': 'Eine Antwort kam zurück, die der Prüfung nicht standhielt: {reason}',
  'app.prove.watch.refused.other': '{count} Antworten hielten der Prüfung nicht stand: {reason}',
  'app.prove.watch.stampedYour':
    'Der Schlüssel Ihrer Pflanze erhielt am {when} einen Datumsstempel. Das datiert den Schlüssel, nicht den Datensatz.',
  'app.prove.watch.stampedThat':
    'Dieser Schlüssel erhielt am {when} einen Datumsstempel. Das datiert den Schlüssel, nicht den Datensatz.',
  'app.prove.watch.stampedThisEarlier':
    'Der Schlüssel dieser Pflanze erhielt schon früher einen Datumsstempel im Netzwerk. Das datiert den Schlüssel, nicht den Datensatz.',
  'app.prove.watch.stampedThatEarlier':
    'Dieser Schlüssel erhielt schon früher einen Datumsstempel im Netzwerk. Das datiert den Schlüssel, nicht den Datensatz.',
  'app.prove.own.title': 'Beweisen Sie, dass Sie den Schlüssel dieser Pflanze halten (Testnetzwerk)',
  'app.prove.own.stampFirst':
    'Setzen Sie zuerst den Datumsstempel: Tippen Sie auf der Seite der Pflanze auf „Den Datumsstempel setzen“. Der Beweis betrifft die On-Chain-Identität der Pflanze, die der Datumsstempel erzeugt.',
  'app.prove.own.intro':
    'Die prüfende Person erstellt auf der Prüfseite des Datensatzes eine Herausforderung und sendet sie Ihnen. Sie beantworten sie hier; Ihr Browser beweist, dass Sie das Geheimnis des Datensatzes halten, ohne es preiszugeben, und Sie senden die Transaktions-ID zurück. Zusammen mit dem Datumsstempel zeigt das, dass der Schlüssel bis Block {block} existierte und dass Sie ihn jetzt kontrollieren.',
  'app.prove.own.copyChecker':
    'Link für die prüfende Person kopieren (er nennt die On-Chain-Identität des Datensatzes)',
  'app.prove.own.tryIt': 'Selbst ausprobieren: als prüfende Person öffnen',
  'app.prove.own.challenge': 'Die Herausforderung der prüfenden Person (64 Zeichen)',
  'app.prove.own.answer': 'Herausforderung beantworten',
  'app.prove.own.done': 'Fertig. Senden Sie der prüfenden Person diese Transaktions-ID:',
  'app.prove.share.notFound': 'Datensatz nicht gefunden.',
  'app.prove.share.notSaved': 'Ihre Auswahl wurde nicht gespeichert, daher wurde kein Link erstellt: {error}.',
  'app.prove.share.title': 'Wählen Sie, was Fremde sehen',
  'app.prove.share.intro':
    'Wer die ID dieses Datensatzes hat – über einen Link, den Sie senden, den QR-Code auf seinem Zertifikat oder eine weitergeleitete Nachricht –, kann seine Prüfseite öffnen. Wählen Sie, welche Angaben diese Seite zeigt. Was Sie wählen, wird unverschlossen an das Register von VeilCore gesendet, damit die Seite es zeigen kann. Die Auswahl wird mit dem Datensatz im Register von VeilCore gespeichert und gilt für alle mit der ID; Sie können sie hier jederzeit ändern, und bereits gesendete Links zeigen dann die neue Auswahl.',
  'app.prove.share.shownOn': 'Auf der Prüfseite angezeigt',
  'app.prove.share.strangerSees': 'Was Fremde mit der ID sehen',
  'app.prove.share.reportOn': 'Mit „Ob ein DNA-Bericht gespeichert ist“ eingeschaltet sagt die Prüfseite es.',
  'app.prove.share.reportOff': 'Mit „Ob ein DNA-Bericht gespeichert ist“ ausgeschaltet sagt die Prüfseite nichts dazu.',
  'app.prove.share.yourLink': 'Ihr Link',
  'app.prove.share.savedOn': 'Im Register gespeichert',
  'app.prove.share.savedText':
    'Wer diesen Link öffnet oder die ID dieses Datensatzes auf anderem Weg hat, sieht die Angaben in der Vorschau und nichts sonst; das Register sendet den Rest nicht, und durch Bearbeiten des Links kommt nichts hinzu. Die Genetik wird nie offengelegt. Diese Auswahl steuert, was die Prüfseite zeigt. Einen verborgenen Wert (einen Marker, einen Bereich oder dass sich zwei Sorten unterscheiden) zu beweisen, ohne den Rest zu zeigen, übernimmt der Claims-Vertrag von VeilCore.',
  'app.prove.share.letThemAsk':
    'Den Datumsstempel prüfen lassen und mich bitten lassen zu beweisen, dass ich sie halte',
  'app.prove.share.theLink': 'Der Link',
  'app.prove.share.openTheirs': 'Öffnen, was sie sehen',
  'app.prove.share.saving': 'Wird gespeichert…',
  'app.prove.share.getLink': 'Link holen',
  // Step5ProveDisclosure.tsx: the server shows another choice (round 3)
  'app.prove.share.differs.text':
    'Der Server von VeilCore zeigt: {server}. Ihre Wahl, beim Datensatz gespeichert: {mine}. Was sollen Fremde sehen?',
  'app.prove.share.differs.keepMine': 'Meine Wahl behalten',
  'app.prove.share.differs.useServers': 'Die Angabe des Servers übernehmen',
  'app.prove.share.differs.failed': 'VeilCore hat Ihre Wahl nicht gespeichert. Versuchen Sie es erneut.',
  'app.prove.share.nameInLink': 'Den Namen in den Link aufnehmen',
  'app.prove.share.nameInLinkHelp':
    'Nur Personen, denen Sie den Link schicken, sehen ihn. Er steht im Link hinter dem #, den ein Browser nie an VeilCore oder einen anderen Server sendet.',
  'app.prove.share.nameWarning': 'Alle mit der ID dieses Datensatzes sehen seinen Namen.',
} satisfies Partial<AppTranslation>;
