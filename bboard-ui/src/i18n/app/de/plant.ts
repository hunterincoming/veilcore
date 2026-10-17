// German (Sie). DRAFT: machine-assisted, to be checked by a fluent speaker before publishing
// (docs/translations/README.md). Terms as in ../../de.ts.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const plant = {
  'app.plant.notHere': 'Dieser Datensatz ist nicht in diesem Browser',
  'app.plant.notHereText':
    'Wenn Sie ihn in einem anderen Browser versiegelt haben, speichern Sie dort eine Sicherungskopie und öffnen Sie sie hier (Pflanzen zurückholen). Wenn es der Datensatz einer anderen Person ist, öffnen Sie stattdessen den Prüflink, den sie Ihnen gegeben hat.',
  'app.plant.yourRecords': 'Ihre Datensätze',
  'app.plant.checkARecord': 'Einen Datensatz prüfen',
  'app.plant.home': 'Start',
  'app.plant.bredByName': 'Gezüchtet von {name}',
  'app.plant.corrected':
    'Dieser Datensatz wurde korrigiert. Eine Korrektur bearbeitet oder löscht ihn nie: Er bleibt unverändert gespeichert, und ein späterer Datensatz ersetzt ihn. <link>Korrektur ansehen</link>',
  'app.plant.corrects':
    'Dies korrigiert einen früheren Datensatz. Geändert: {fields}. Angegebener Grund: {reason}. <link>Ansehen, was ersetzt wurde</link>',
  'app.plant.evidenceLine':
    '<link>Nachweispaket herunterladen</link> <muted>um das Datum dieses Datensatzes ohne VeilCore zu prüfen</muted>',
  'app.plant.open': 'Öffnen',
  'app.plant.reportsCameBack.one':
    'Ein Laborbericht ist zurückgekommen, verschlossen, sodass nur Sie ihn öffnen können.',
  'app.plant.reportsCameBack.other':
    '{count} Laborberichte sind zurückgekommen, verschlossen, sodass nur Sie sie öffnen können.',
  'app.plant.moreYouCanDo': 'Was Sie noch tun können',
  'app.plant.action.show': 'Jemandem zeigen',
  'app.plant.action.showHint': 'Wählen Sie, was die Person sieht',
  'app.plant.action.askedToProve': 'Jemand hat mich gebeten zu beweisen, dass ich sie halte',
  'app.plant.action.certificate': 'Zertifikat',
  'app.plant.action.sendResults': 'Ergebnisse an den Züchter zurücksenden',
  'app.plant.action.sendResultsHint': 'Von Ihnen signiert, für ihn verschlossen',
  'app.plant.action.signReceipt': 'Empfangsbestätigung signieren',
  'app.plant.action.signReceiptHint': 'Signieren, dass diese Probe angekommen ist, oder sie ablehnen',
  'app.plant.action.linkReceipt': 'Ihre Empfangsbestätigung verknüpfen',
  'app.plant.action.linkReceiptHint':
    'Ihre Empfangsbestätigung ist signiert; verknüpfen Sie sie mit der Lieferung, damit der Züchter sie sieht',
  'app.plant.action.labReports': 'Laborberichte',
  'app.plant.action.sendToLab': 'An ein Labor oder einen Züchter senden',
  'app.plant.action.licenseIt': 'Lizenzieren',
  'app.plant.action.saveReport': 'Einen DNA-Bericht bei dieser Pflanze speichern',
  'app.plant.action.checkReport': 'Prüfen, ob ein Bericht passt',
  'app.plant.action.familyTree': 'Stammbaum',
  'app.plant.action.freshBackup': 'Eine neue Sicherungskopie speichern',
  'app.plant.action.fix': 'Einen Fehler korrigieren',
  'app.plant.agreements': 'Vereinbarungen',
  'app.plant.openAgreement': 'Vereinbarung {id} öffnen',
  'app.plant.unnamedCounterparty': 'unbenannte Gegenpartei',
  'app.plant.technicalDetails': 'Technische Details',
  'app.plant.f.method': 'Zuchtmethode',
  'app.plant.f.statedDate': 'Angegebenes Entstehungsdatum (Angabe des Züchters)',
  'app.plant.f.sealedClock': 'Versiegelt (Uhr dieses Geräts)',
  'app.plant.f.ref': 'Referenz / Chargen-ID',
  'app.plant.f.photos': 'Fotos',
  'app.plant.f.photosSealed': '{n} versiegelt (nur Codes; die Bilder wurden nie hochgeladen)',
  'app.plant.f.reportSaved': 'bei dieser Pflanze gespeichert ({file}) · Code der Kopplung {fp}{sha}',
  'app.plant.f.file': 'Datei',
  'app.plant.f.fileSha': ' · SHA-256 der Datei {sha}',
  'app.plant.f.notSavedYet': 'noch nicht gespeichert',
  'app.plant.f.recordFingerprint': 'Prüfcode des Datensatzes',
  'app.plant.evidenceBundle': 'Nachweispaket',
  'app.plant.evidenceBundleText':
    'Der Datensatz wie versiegelt, sein Inklusionsnachweis, die Stapelwurzel, wo der Stapel festgehalten wurde, die Bitcoin-Stempeldatei, falls vorhanden, und Laborsignaturen dazu, in einer .zip-Datei. Ihre verify.html prüft ihn ohne Internet und ohne etwas von VeilCore und sagt, was man nachschlagen muss, um ihn zu datieren.',
  'app.plant.exportFailed': 'Der Datensatz konnte nicht exportiert werden.',
  'app.plant.exportRecord': 'Datensatz exportieren',
  'app.plant.backToPlant': 'Zurück zur Pflanze',
  'app.plant.backToRecord': 'Zurück zum Datensatz',
  'app.plant.mark.done': 'erledigt',
  'app.plant.mark.failed': 'nicht bestätigt',
  'app.plant.mark.reported': 'vom Register gemeldet, nicht geprüft',
  'app.plant.mark.wait': 'noch nicht',
  'app.plant.recordDated': 'Datensatz datiert',
  'app.plant.labReport': 'Laborbericht',
  'app.plant.dnaReport': 'DNA-Bericht',
  'app.plant.tie.tied': 'Mit der Pflanze verknüpft',
  'app.plant.tie.notYet': 'Noch nicht mit der Pflanze verknüpft',
  'app.plant.tie.notNow': 'Nicht mehr mit der Pflanze verknüpft',
  'app.plant.tie.lab': 'DNA-Bericht, {lead}',
  'app.plant.tie.self': 'DNA-Bericht, den Sie gespeichert haben (keine Laborsignatur passt dazu)',
  'app.plant.tie.selfPublic': 'DNA-Bericht, den der Inhaber gespeichert hat (keine Laborsignatur passt dazu)',
  'app.plant.tie.savedHolder': 'DNA-Bericht, den Sie gespeichert haben',
  'app.plant.tie.savedPublic': 'DNA-Bericht, den der Inhaber gespeichert hat',
  'app.plant.tie.replaced': 'das Labor hat den hier gespeicherten DNA-Bericht ersetzt',
  'app.plant.tie.withdrawn': 'das Labor hat den hier gespeicherten DNA-Bericht zurückgezogen',
  'app.plant.tie.add': 'fügen Sie einen DNA-Bericht hinzu',
  'app.plant.tie.noneSaved': 'zu diesem Datensatz ist kein DNA-Bericht gespeichert',
  'app.plant.tie.cameBack': 'ein Laborbericht ist da: Öffnen Sie ihn hier',
  'app.plant.tie.openedNotSaved': 'ein Laborbericht ist geöffnet, aber nicht bei dieser Pflanze gespeichert',
  'app.plant.tie.notDated': 'noch nicht datiert',
  'app.plant.tie.dating': 'wird datiert ({status})',
  'app.plant.tie.datingPlain': 'wird datiert',
  'app.plant.tie.dated': 'datiert: {date}',
  'app.plant.tie.unconfirmed': 'nicht datiert: {status}',
  'app.plant.tie.sentence': 'Mit der Pflanze verknüpft: {what}, {date}.',
  'app.plant.tie.sentenceNoDate': 'Mit der Pflanze verknüpft: {what}.',
  'app.plant.tie.sentenceNone': 'Noch nicht mit der Pflanze verknüpft: {what}.',
  'app.plant.tie.sentenceNot': 'Nicht mehr mit der Pflanze verknüpft: {what}.',
  'app.plant.tie.means':
    'Mit einem DNA-Bericht kann ein Labor einen neuen Test einer Pflanze damit vergleichen. Allein zeigt er nicht, dass eine Pflanze übereinstimmt.',
  'app.plant.tie.sub': 'Bericht {date}. Ein Labor kann einen neuen Test der Pflanze damit vergleichen.',
  'app.plant.tie.why': 'Ein DNA-Bericht Ihres Labors ist das, was einen Datensatz mit der Pflanze selbst verknüpft.',
  'app.plant.backupChecked': 'Sicherungskopie geprüft',
  'app.plant.checking': 'wird geprüft…',
  'app.plant.savedToPlant': 'bei dieser Pflanze gespeichert',
  'app.plant.arrivedNotOpened': 'angekommen, nicht geöffnet',
  'app.plant.openedNotSaved': 'geöffnet, nicht bei dieser Pflanze gespeichert',
  'app.plant.noneYet': 'noch keiner',
  'app.plant.labReceipt': 'Empfangsbestätigung des Labors',
  'app.plant.receiptSigned': 'Empfangsbestätigung signiert',
  'app.plant.labCodeUsed': 'Laborcode verwendet',
  'app.plant.noReceiptSigned': 'keine Empfangsbestätigung signiert',
  'app.plant.notSignedYet': 'noch nicht signiert',
  'app.plant.receipt': 'Empfangsbestätigung',
  'app.plant.notLinkedYet': '{date}, noch nicht mit der Lieferung verknüpft',
  'app.plant.turnedAway': 'Sie haben sie abgelehnt',
  'app.plant.rejected.damaged': 'beschädigt angekommen',
  'app.plant.rejected.wrongSample': 'falsche Probe',
  'app.plant.receiptNotSigned': 'Empfangsbestätigung noch nicht signiert',
  'app.plant.keyStampLine':
    'Schlüssel mit Datumsstempel: {when}. Der Schlüssel Ihrer Pflanze ist auch datiert, sodass Sie später beweisen können, dass Sie sie halten.',
  'app.plant.done': 'erledigt',
  'app.plant.notYet': 'noch nicht',
  'app.plant.labReportSent': 'Laborbericht gesendet',
  'app.plant.nSent': '{n} gesendet',
  'app.plant.withdrawnSendNew': 'zurückgezogen (Sie können einen neuen senden)',
  'app.plant.waitingBatch': 'wartet auf einen Stapel',
  'app.plant.inBatchWaiting': 'in einem Stapel, wartet auf seinen Datumsstempel',
  'app.plant.onTestNetwork': ' In einem Testnetzwerk: Übungsdaten, kein echtes Datum.',
  'app.plant.checkedOnMidnight': '{date} – auf Midnight geprüft',
  'app.plant.notConfirmed': 'Datumsstempel auf Midnight nicht bestätigt',
  'app.plant.dontRely': '{reason}. Verlassen Sie sich nicht auf das Datum, das das Register meldet.',
  'app.plant.lookingUp': 'Wird auf Midnight nachgeschlagen…',
  'app.plant.couldntReach': 'Midnight war zum Prüfen nicht erreichbar.',
  'app.plant.notChecked': 'Von dieser Seite aus nicht auf Midnight geprüft.',
  'app.plant.registryReport': '{date} (Meldung des VeilCore-Registers)',
  'app.plant.dateNotGiven': 'kein Datum angegeben',
  'app.plant.labReportSha': 'SHA-256 des Laborberichts: {sha}',
  'app.plant.labReportCode': 'Code des Laborberichts: {code}',
  'app.plant.labAsSigned': 'Labor, wie signiert: {lab}',
  'app.plant.noLabMatched': 'keine Laborsignatur passte zur gespeicherten Datei',
  'app.plant.next.backup.title': 'Speichern Sie Ihre Sicherungskopie',
  'app.plant.next.backup.why':
    'Die Schlüssel dieser Pflanze sind gerade nur auf diesem Gerät. Wenn es kaputtgeht oder der Browser geleert wird, kann niemand beweisen, dass Sie sie halten. Das Speichern dauert eine Minute.',
  'app.plant.next.backup.action': 'Meine Sicherungskopie speichern',
  'app.plant.next.dates.title': 'Dieser Datensatz datiert einen DNA-Bericht',
  'app.plant.next.dates.why':
    'Er enthält nur den SHA-256 des Berichts, seinen Laborberichtscode und den Namen des Labors wie signiert, nie den Bericht. Wenn sein Stapel datiert ist, zeigt er, dass der Bericht bis dahin existierte, ohne jemandem die Marker zu zeigen.',
  'app.plant.next.stamp.why':
    'Er ist versiegelt. Sein Schlüssel hat noch keinen Datumsstempel, und den brauchen Sie, um zu beweisen, dass Sie sie halten. Es dauert etwa eine Minute und ist kostenlos.',
  'app.plant.next.rejected.title': 'Sie haben diese Probe abgelehnt',
  'app.plant.next.rejected.why':
    'Es wurde nichts signiert. VeilCore benachrichtigt den Züchter nicht: Sagen Sie es ihm selbst, damit er eine andere senden kann.',
  'app.plant.next.setup.title': 'Richten Sie die Signatur Ihres Labors ein',
  'app.plant.next.setup.why':
    'Dann können Sie signieren, dass diese Probe angekommen ist, und den Laborbericht von Ihrem Labor signiert zurücksenden.',
  'app.plant.next.setup.action': 'Einrichten',
  'app.plant.next.sign.title': 'Signieren, dass sie angekommen ist',
  'app.plant.next.sign.why':
    'Ihre signierte Empfangsbestätigung ist der Grund, warum der Züchter einem Laborbericht von Ihnen vertrauen kann: Sie zeigt, dass Ihr Schlüssel die Probe hatte.',
  'app.plant.next.sign.action': 'Empfangsbestätigung signieren',
  'app.plant.next.link.title': 'Ihre Empfangsbestätigung mit der Lieferung verknüpfen',
  'app.plant.next.link.why':
    'Ihre Empfangsbestätigung ist signiert, aber die Seite des Züchters zählt nur eine Empfangsbestätigung, die mit seiner Lieferung verknüpft ist. Nur wer den Laborcode verwendet hat, kann sie verknüpfen.',
  'app.plant.next.link.action': 'Verknüpfen',
  'app.plant.next.signed.title': 'Empfangsbestätigung signiert',
  'app.plant.next.signed.why':
    'Der Züchter sieht Ihre signierte Empfangsbestätigung. Laborberichte können in diesem Netzwerk noch nicht über VeilCore zurückgesendet werden: Senden Sie Ihren auf dem üblichen Weg.',
  'app.plant.next.sent.title': 'Laborbericht gesendet',
  'app.plant.next.withdrawn.title': 'Laborbericht zurückgezogen',
  'app.plant.next.send.title': 'Ergebnisse an den Züchter zurücksenden',
  'app.plant.next.sent.why':
    'Nur der Züchter kann ihn öffnen. Sie können ihn zurückziehen oder eine korrigierte Datei senden.',
  'app.plant.next.withdrawn.why':
    'Sie haben zurückgezogen, was Sie gesendet haben, daher hat der Züchter keinen aktuellen Laborbericht von Ihnen. Sie können einen neuen senden.',
  'app.plant.next.send.why':
    'Mit dem Schlüssel Ihres Labors signiert und so verschlossen, dass nur der Züchter ihn öffnen kann. VeilCore hat seinen Schlüssel nicht.',
  'app.plant.next.sent.action': 'Ansehen, was Sie gesendet haben',
  'app.plant.next.send.action': 'Ergebnisse zurücksenden',
  'app.plant.next.corrected.title': 'Den korrigierten DNA-Bericht speichern',
  'app.plant.next.corrected.why':
    'Das Labor hat den bei dieser Pflanze gespeicherten DNA-Bericht ersetzt. Bis Sie den korrigierten speichern, sagen Ihre Pflanzenseite, Ihr Zertifikat und Ihre Links, dass der gespeicherte ersetzt wurde.',
  'app.plant.next.corrected.action': 'Den korrigierten öffnen',
  'app.plant.next.noCurrent.why':
    'Das Original wurde ersetzt und die Korrektur zurückgezogen. Bitten Sie das Labor, erneut einen zu senden. Bis dahin sagen Ihr Zertifikat und Ihre Links, dass der gespeicherte ersetzt wurde.',
  'app.plant.next.labWithdrew.title': 'Das Labor hat den hier gespeicherten DNA-Bericht zurückgezogen',
  'app.plant.next.labWithdrew.whyNewer':
    'Er bleibt bei dieser Pflanze gespeichert, und Ihr Zertifikat und Ihre Links sagen, dass er zurückgezogen wurde. Ein neuerer Laborbericht ist da: Öffnen Sie ihn und speichern Sie stattdessen diesen.',
  'app.plant.next.labWithdrew.why':
    'Er bleibt bei dieser Pflanze gespeichert, und Ihr Zertifikat und Ihre Links sagen, dass er zurückgezogen wurde. Bitten Sie das Labor um einen neuen.',
  'app.plant.next.labWithdrew.action': 'Den neueren öffnen',
  'app.plant.next.open.why':
    'Er ist mit dem Schlüssel dieser Pflanze so verschlossen, dass nur Sie ihn öffnen können. Beim Öffnen wird hier die Signatur des Labors geprüft.',
  'app.plant.next.sample.title': 'Eine Probe an ein Labor senden',
  'app.plant.next.sample.whySaved':
    'Sie haben einen DNA-Bericht bei dieser Pflanze gespeichert; das ist Ihre eigene Angabe. Wenn ein Labor signiert, dass es eine Probe erhalten hat, kommt eine zweite Partei hinzu, und das ist ein stärkerer Nachweis als Ihre Angabe allein.',
  'app.plant.next.sample.why':
    'Im Moment ist dieser Datensatz Ihre eigene Darstellung der Pflanze. Wenn ein Labor signiert, dass es eine Probe erhalten hat, und einen Laborbericht zurücksendet, wird daraus ein stärkerer Nachweis als Ihre eigene Darstellung.',
  'app.plant.next.sample.action': 'An ein Labor senden',
  'app.plant.next.dna.title': 'Einen DNA-Fingerabdruck für diese Pflanze bekommen',
  'app.plant.next.dna.why':
    'Ein datierter Datensatz zeigt, dass eine Beschreibung existierte. Ein DNA-Bericht (der DNA-Fingerabdruck der Pflanze von einem Labor) verknüpft Ihren Datensatz mit der tatsächlichen Pflanze. Zwei Wege, einen zu bekommen:',
  'app.plant.next.dna.labTitle': 'Eine Probe an ein Labor senden',
  'app.plant.next.dna.labText':
    'Erstellen Sie einen Laborcode und senden Sie eine Probe damit. Der DNA-Bericht des Labors kommt hierher zurück, verschlossen, sodass nur Sie ihn öffnen können.',
  'app.plant.next.dna.labSoon':
    'Den DNA-Bericht des Labors hier zu bekommen, verschlossen, sodass nur Sie ihn öffnen können, kommt bald auf diese Website. Bitten Sie bis dahin Ihr Labor um den Bericht und speichern Sie ihn hier.',
  'app.plant.next.dna.haveTitle': 'Haben Sie schon einen DNA-Bericht?',
  'app.plant.next.dna.haveText':
    'Speichern Sie ihn bei dieser Pflanze. Er wird auf Ihrem Gerät gelesen; die Datei wird nie hochgeladen.',
  'app.plant.next.dna.haveAction': 'Einen DNA-Bericht speichern',
  'app.plant.next.date.title': 'Diesen DNA-Bericht datieren',
  'app.plant.next.date.why':
    'Er ist bei dieser Pflanze gespeichert, aber noch datiert ihn nichts. Ihn zu datieren zeigt, dass der Bericht zu diesem Datum existierte, ohne jemandem die Marker zu zeigen.',
  'app.plant.next.save.title': 'Den DNA-Bericht bei dieser Pflanze speichern',
  'app.plant.next.save.why':
    'Ein Labor hat signiert, dass es eine Probe erhalten hat. Wenn sein DNA-Bericht zurückkommt, speichern Sie ihn bei dieser Pflanze: Das verknüpft Ihren Datensatz mit der Pflanze, damit ein späterer Test damit verglichen werden kann.',
  'app.plant.next.save.action': 'Bei dieser Pflanze speichern',
  'app.plant.next.ready.title': 'Dieser Datensatz ist einsatzbereit',
  'app.plant.next.ready.why':
    'Ein Labor hat signiert, dass es eine Probe erhalten hat, und ein DNA-Bericht ist bei dieser Pflanze gespeichert. Sie können Material weitergeben oder es lizenzieren, mit Bedingungen, die für aus diesem Datensatz angegebene Nachkommen gelten.',
  'app.plant.next.ready.action': 'Eine Vereinbarung beginnen',
  'app.plant.next.backTo': 'Zurück zu {name}',
  'app.plant.next.noCurrent.title': 'Kein aktueller DNA-Bericht von {lab}',
  'app.plant.next.open.title': 'Den Laborbericht von {lab} öffnen',
  'app.plant.next.label': 'Nächster Schritt',
  'app.plant.next.stamp.title': 'Den Datumsstempel setzen',
  'app.plant.next.stamp.action': 'Den Datumsstempel setzen',
  'app.plant.next.open.action': 'Öffnen',
  'app.plant.chain.sealed': 'Versiegelt',
  'app.plant.chain.reportSaved': 'DNA-Bericht gespeichert',
  'app.plant.chain.receipt': 'Empfang bestätigt',
  'app.plant.chain.licensed': 'Lizenziert',
  'app.plant.chain.licensedN': 'Lizenziert ({n})',
  'app.plant.date.chipNotAnchored': 'In einem Stapel, noch nicht verankert',
  'app.plant.date.chipChecked': 'In einem Stapel · Datum auf {network} geprüft',
  'app.plant.date.chipFailed': 'In einem Stapel · Datumsstempel nicht bestätigt',
  'app.plant.date.chipReported': 'In einem Stapel · Verankerung auf {network} gemeldet',
  'app.plant.date.testNote': ' Ein Testnetzwerk kann zurückgesetzt werden, und seine Daten haben keine Beweiskraft.',
  'app.plant.date.head':
    'In diesem Browser geprüft: Der Prüfcode Ihres Datensatzes ist in Stapel {batch}, und der Pfad von ihm führt zur Stapelwurzel.',
  'app.plant.date.looked': '{head} Das Register meldet, dass diese Wurzel auf {network} festgehalten wurde.{test}',
  'app.plant.date.notLooked':
    '{head} Das Register meldet, dass diese Wurzel auf {network} festgehalten wurde; diese Seite hat die Transaktion nicht nachgeschlagen, daher wird sie nicht als verankert angezeigt. Schlagen Sie sie im Netzwerk nach, bevor Sie sich auf das Datum verlassen.{test}',
  'app.plant.date.title': 'Datum auf Midnight',
  'app.plant.date.notInBatch':
    'Auf Ihrem Gerät versiegelt und auf {server} aufbewahrt. Er ist noch in keinem Stapel, daher ist er nicht verankert. Wir verankern Datensätze gemeinsam, in Stapeln (vorerst von Hand, daher kann es dauern), sodass eine Transaktion viele abdeckt und Sie nie eine Wallet brauchen. Bis dahin beruht sein Datum auf den Aufzeichnungen dieses Registers.',
  'app.plant.date.inBatchNotAnchored':
    'In diesem Browser geprüft: Der Prüfcode Ihres Datensatzes ist in Stapel {batch}, der noch nicht verankert wurde. Sobald er es ist, erhält der Nachweis einen Verweis auf die Transaktion. An Ihrem Datensatz ändert sich nichts.',
  'app.plant.date.batchLine': 'Stapel {batch}',
  'app.plant.date.rootLine': 'Wurzel {root}…',
  'app.plant.date.txChecked': 'Tx (auf Midnight geprüft) {tx}',
  'app.plant.date.txReported': 'Tx (vom Register gemeldet) {tx}',
  'app.plant.date.downloadProof': 'Inklusionsnachweis herunterladen',
  'app.plant.date.downloadStamp': 'Bitcoin-Stempeldatei herunterladen',
  'app.plant.date.openExplorer': 'Den Explorer für {network} öffnen',
  'app.plant.date.fileConfirmed':
    'Die Datei zeigt, dass Ihr Datensatz in diesem Stapel ist. Diese Seite hat die Stapelwurzel in der genannten Transaktion auf Midnight gefunden. Jeder kann das wiederholen: Das Nachweispaket enthält alles Nötige und erklärt, wie, und die Prüfseite macht dieselbe Abfrage im eigenen Browser.',
  'app.plant.date.fileNotConfirmed':
    'Die Datei zeigt, dass Ihr Datensatz in diesem Stapel ist. Sie datiert den Datensatz erst, wenn die Stapelwurzel in der genannten Transaktion gefunden wird. Das Nachweispaket enthält alles, um das nachzuschlagen, und erklärt, wie, und die Prüfseite macht die Abfrage im Browser, wenn sie Midnight erreicht.',
  'app.plant.date.stampPending':
    'Die Bitcoin-Stempeldatei datiert die Wurzel dieses Stapels auf Bitcoin mit dem kostenlosen Werkzeug OpenTimestamps: <code>ots verify root.bin.ots</code>, neben <link>der Datei der Stapelwurzel (root.bin)</link>. Sie ist noch ausstehend: ein Versprechen der Stempelserver, noch nicht in einem Bitcoin-Block. Führen Sie `ots upgrade` darauf aus, sobald Bitcoin bestätigt.',
  'app.plant.date.stampInBlock':
    'Die Bitcoin-Stempeldatei datiert die Wurzel dieses Stapels auf Bitcoin mit dem kostenlosen Werkzeug OpenTimestamps: <code>ots verify root.bin.ots</code>, neben <link>der Datei der Stapelwurzel (root.bin)</link>. Sie ist in einem Bitcoin-Block, daher lässt sie sich allein gegen Bitcoin prüfen.',
  'app.plant.history.title': 'Verlauf',
  'app.plant.history.correctionOf': 'Als Korrektur von {id} ausgestellt. Angegebener Grund: {reason}.',
  'app.plant.history.sealed':
    'Der Inhaber hat sich auf eine Beschreibung dieses Materials festgelegt, datiert nach der Uhr des versiegelnden Geräts.',
  'app.plant.history.received': 'Erhalten',
  'app.plant.history.arrived': 'Durch eine Übertragung von {from} angekommen.',
  'app.plant.history.arrivedQty': 'Durch eine Übertragung von {from} angekommen, {qty}.',
  'app.plant.history.retracted': 'Bestätigung zurückgenommen',
  'app.plant.history.retractedDetail':
    'Der Bestätigende hat sie mit einer von seinem Schlüssel signierten Rücknahme zurückgezogen. Grund: {reason}. Die Bestätigung bleibt im Datensatz – Rücknahme ist keine Löschung.',
  'app.plant.history.corrected': 'Korrigiert',
  'app.plant.history.correctedDetail':
    'Ein späterer Datensatz ersetzt diesen. Dieser Datensatz ist unverändert und bleibt gespeichert.',
  'app.plant.tree.none':
    'Noch keine Abstammung erfasst. Fügen Sie beim Erfassen Elternsorten hinzu, um den Stammbaum aufzubauen.',
  'app.plant.tree.offspring': 'Nachkommen',
  'app.plant.tree.datedReports': 'Datierte DNA-Berichte (keine Nachkommen)',
  'app.plant.action.nextStage': 'Die nächste Generation oder Selektion hinzufügen',
  'app.plant.action.nextStageHint':
    'Ein neuer Datensatz mit dieser Pflanze als Elternteil. Versiegeln Sie jede Stufe, wenn sie passiert.',
  'app.plant.dated.refused':
    'Das Register hat ihn nicht gespeichert ({reason}). Es wurde nichts datiert. Versuchen Sie es erneut.',
  'app.plant.dated.line': 'DNA-Bericht datiert: in <link></link> ({status})',
  'app.plant.dated.dated': 'datiert {value}',
  'app.plant.dated.action': 'Diesen DNA-Bericht datieren',
  'app.plant.dated.why':
    'Damit Sie zeigen können, dass dieser Bericht zu diesem Datum existierte, ohne jemandem die Marker zu zeigen.',
  'app.plant.dated.seals':
    'Versiegelt einen kleinen Datensatz mit nur dem SHA-256 des Berichts, seinem Laborberichtscode und dem Namen des Labors wie signiert. Der Bericht bleibt bei Ihnen. Sein Datum kommt, wenn sein Stapel datiert wird.',
  'app.plant.dated.nameLabel': 'Name des neuen Datensatzes',
  'app.plant.dated.nameHelp':
    'Verschlossen wie der Rest. Seine Prüflinks tragen ihn, sodass jeder, dem Sie einen schicken, ihn sieht. Ändern Sie ihn, wenn Sie möchten.',
  'app.plant.dated.elsewhere':
    'Dieser DNA-Bericht wird gerade in einem anderen Tab oder Fenster datiert. Warten Sie eine Minute und sehen Sie dann wieder nach: Er wird hier erscheinen.',
  'app.plant.datingPage.title': 'Dieser Datensatz datiert einen DNA-Bericht für <plant></plant>',
  'app.plant.datingPage.holds':
    'Er enthält nur den SHA-256 des Berichts, seinen Laborberichtscode und den Namen des Labors wie signiert, nie den Bericht. Wenn sein Stapel datiert ist, zeigt er, dass der Bericht bis dahin existierte, ohne jemandem die Marker zu zeigen.',
  'app.plant.datingPage.recordDated': 'Datensatz datiert: {value}',
  'app.plant.datingPage.backup':
    '<b>Speichern Sie Ihre Sicherungskopie.</b> Der Schlüssel dieses Datensatzes ist nur auf diesem Gerät.',
  'app.plant.datingPage.sealedBy': 'Versiegelt von',
  'app.plant.datingPage.notesAsSealed': 'Notizen, wie versiegelt',
  'app.plant.datingPage.bundleText':
    'Der Datensatz wie versiegelt, sein Inklusionsnachweis, die Stapelwurzel und wo der Stapel festgehalten wurde, in einer .zip-Datei. Ihre verify.html prüft ihn ohne Internet und ohne etwas von VeilCore.',
  'app.plant.anchor.title': 'Diesen Datensatz auf {network} verankern',
  'app.plant.anchor.anchored':
    'Verankert. Seine On-Chain-Identität ist {id}…, festgehalten in Block {block}{when}. Die Identität wird in diesem Browser und in Ihrer Sicherungskopie aufbewahrt, nicht auf dem Server von VeilCore: Sie teilen sie, indem Sie jemandem einen Prüflink senden. Das ist ein Testnetzwerk: Es kann zurückgesetzt werden, und seine Daten haben keine Beweiskraft.',
  'app.plant.anchor.chainClock': ' ({when}, nach der Uhr der Chain)',
  'app.plant.anchor.label': 'Verankerung',
  'app.plant.anchor.notAvailable': 'In diesem Build nicht verfügbar: {why}',
  'app.plant.anchor.intro':
    'Damit erhält der Datensatz eine Identität im Netzwerk, als die nur dieser Browser handeln kann. Ihr Browser erstellt und beweist die Transaktion selbst; VeilCore zahlt die Netzwerkgebühr und sieht nur, was das Netzwerk veröffentlicht. Sie brauchen keine Wallet und keine Kryptowährung. Später können Sie jemandem, der danach fragt, zeigen, dass Ihr Schlüssel bis zu diesem Block existierte und dass Sie ihn noch kontrollieren.',
  'app.plant.anchor.notKeeping':
    'Dieser Browser behält nicht, was er speichert (ein privates Fenster oder blockierte Websitedaten). Die Schlüssel des Datensatzes gingen beim Schließen dieses Tabs verloren, wenn Sie die Sicherungskopie nicht herunterladen.',
  'app.plant.anchor.understand': 'Verstanden, ich lade die Sicherungskopie herunter',
  'app.plant.anchor.keysNotHere':
    'Der Schlüssel dieser Pflanze ist nicht in diesem Browser. Holen Sie ihn aus Ihrer Sicherungsdatei zurück: Ein neuer Schlüssel würde nicht zum versiegelten Datensatz passen.',
  'app.plant.anchor.onlyNew':
    'Nur für einen Datensatz, der nie Schlüssel hatte: Wenn Sie ihn schon verankert oder seine Schlüssel in einem anderen Browser erstellt haben, stellen Sie sie stattdessen oben aus Ihrer Sicherungskopie wieder her. Neue Schlüssel wären eine andere Identität.',
  'app.plant.anchor.makeKeys': '1. Die Schlüssel dieses Datensatzes erstellen (in diesem Browser)',
  'app.plant.anchor.anchorTest': '2. Im Testnetzwerk verankern',
  'app.plant.anchor.backupFirst': 'Zuerst die Sicherungskopie herunterladen',
  'app.plant.keys.restoredFor': 'Schlüssel für {id} wiederhergestellt.',
  'app.plant.keys.notNamed':
    'Wiederhergestellt, aber das sind nicht die Schlüssel, die dieser Datensatz nennt. Prüfen Sie, ob Sie die richtige Datei gewählt haben.',
  'app.plant.keys.notIdentity':
    'Wiederhergestellt, aber diese Schlüssel sind nicht die On-Chain-Identität dieses Datensatzes. Prüfen Sie, ob Sie die richtige Datei gewählt haben.',
  'app.plant.keys.restored': 'Schlüssel in diesem Browser wiederhergestellt.',
  'app.plant.keys.removeBacked':
    'Die Schlüssel dieses Datensatzes aus diesem Browser entfernen? Sie können sie aus Ihrer Sicherungsdatei wiederherstellen.',
  'app.plant.keys.removeUnbacked':
    'Sie haben KEINE Sicherung dieser Schlüssel heruntergeladen. Wenn Sie sie entfernen, holt dieser Browser sie nicht zurück, und nur Ihre Sicherungsdatei, in einem neuen Browser wiederhergestellt, kann sie zurückbringen. Trotzdem entfernen?',
  'app.plant.keys.title': 'Datensatzschlüssel',
  'app.plant.keys.holds':
    'Dieser Browser enthält die zwei Geheimnisse, die beweisen, dass Sie diesen Datensatz auf der Chain halten. Eine Kopie steckt auch im verschlossenen Datensatz bei VeilCore, den nur der Schlüssel öffnet, der Ihre Datensätze verschließt. Das Leeren dieses Browsers löscht sie hier; das Wiederherstellen Ihrer Sicherung bringt sie zurück.',
  'app.plant.keys.noBackup': 'Noch keine Sicherung. Laden Sie sie herunter und bewahren Sie sie offline auf.',
  'app.plant.keys.downloadAgain': 'Sicherungskopie erneut herunterladen',
  'app.plant.keys.download': 'Sicherungskopie herunterladen (geheim)',
  'app.plant.keys.remove': 'Aus diesem Browser entfernen',
  'app.plant.keys.notHeld':
    'Dieser Browser hat die Schlüssel dieses Datensatzes nicht. Wenn Sie sie anderswo erstellt haben, stellen Sie sie aus Ihrer Sicherungsdatei wieder her.',
  'app.plant.keys.restore': 'Schlüssel aus einer Sicherungsdatei wiederherstellen',
  'app.plant.bundle.download': 'Nachweispaket herunterladen',
  'app.plant.bundle.chooseOrUntick': 'Wählen Sie die Datei des DNA-Berichts, oder entfernen Sie das Häkchen.',
  'app.plant.bundle.tooBig': '{name} ist größer als 200 MB und wurde daher nicht gelesen.',
  'app.plant.bundle.intro':
    'Eine Datei mit allem, was jemand braucht, um das Datum dieses Datensatzes ohne VeilCore zu prüfen: der Datensatz wie versiegelt, der Nachweis, dass er in einem datierten Stapel ist, wo dieser Stapel festgehalten wurde, und eine Seite, die die Prüfungen offline durchführt. Dazu kommen eine einseitige Zusammenfassung zum Ausdrucken für eine Anwältin, einen Anwalt oder einen Prüfer und ein Mustertext für eine schriftliche Erklärung (keine Rechtsberatung). Eine README darin sagt, was es zeigt und was nicht.',
  'app.plant.bundle.notSealed':
    'Dieser Datensatz wurde versiegelt, bevor seine Details in einer für alle prüfbaren Form gespeichert wurden, daher kann dafür kein Paket erstellt werden.',
  'app.plant.bundle.includeKey': 'Den Schlüssel des Datensatzes beifügen.',
  'app.plant.bundle.keyIs':
    '(Der Schlüssel des Datensatzes ist die öffentliche ID des Schlüssels, der beim Versiegeln für diese Pflanze erstellt wurde. Sein geheimer Teil bleibt in Ihrer Sicherungskopie und kommt nie in das Paket.)',
  'app.plant.bundle.keyWith':
    'Damit kann jeder mit dem Paket diesen Datensatz seinem Schlüssel zuordnen und allem, was dieser Schlüssel im Netzwerk tut. Lassen Sie ihn weg, wenn er nicht gebraucht wird.',
  'app.plant.bundle.keyNotHere':
    'Der Schlüssel ist nicht in diesem Browser. Öffnen Sie hier Ihre Sicherungskopie, um ihn beizufügen.',
  'app.plant.bundle.includeLab':
    'Die Datei des DNA-Berichts beifügen. Ohne sie enthält das Paket nur den Code des Berichts, nicht seinen Inhalt.',
  'app.plant.bundle.chooseLab': 'Datei des DNA-Berichts wählen',
  'app.plant.bundle.checkedAgainst': 'Sie wird vor dem Beifügen mit der bei dieser Pflanze gespeicherten abgeglichen.',
  'app.plant.bundle.labFileAria': 'Datei des DNA-Berichts',
  'app.plant.bundle.downloaded':
    '{name} heruntergeladen. Öffnen Sie darin verify.html zum Prüfen oder EXAMINER-SUMMARY.html, um eine Zusammenfassung zu drucken.',
  'app.plant.bundle.making': 'Wird erstellt…',
  'app.plant.bundle.downloadButton': 'Herunterladen',
  'app.plant.cert.intro':
    'Für Ihre Unterlagen und Ihre Anwältin oder Ihren Anwalt: der versiegelte Datensatz, eine frische Prüfung, dass er sich nicht geändert hat, ob er verankert ist, ob ein DNA-Bericht ihn mit der Pflanze verknüpft, eine Empfangsbestätigung eines Labors und aktive Lizenzen. Es enthält die Details des Datensatzes, aber keine genetischen Daten oder Labordateien. Der QR-Code öffnet die öffentliche Prüfseite des Datensatzes.',
  'app.plant.cert.jsonDone': 'Zusammenfassung (JSON) heruntergeladen.',
  'app.plant.cert.pngDone': 'Zertifikat heruntergeladen.',
  'app.plant.cert.pngFailed': 'Das Zertifikatsbild konnte nicht erstellt werden.',
  'app.plant.cert.linkCopied': 'Prüflink kopiert.',
  'app.plant.cert.copyLink': 'Prüflink kopieren',
  'app.plant.cert.downloadPng': 'Herunterladen (PNG)',
  'app.plant.cert.downloadJson': 'Zusammenfassung herunterladen (JSON)',
  'app.plant.cert.continue': 'Weiter: wählen, was andere sehen',
  'app.plant.check.title': 'Prüfen, ob ein Bericht zu diesem Datensatz passt',
  'app.plant.check.intro':
    'Wählen Sie eine Laborberichtsdatei, um zu sehen, ob es die ist, die mit einem Ihrer Datensätze gekoppelt ist.',
  'app.plant.check.forYou':
    'Diese Prüfung läuft nur in Ihrem Browser und sendet nichts, sie ist also für Sie. Sie zeigt, dass Sie eine Datei haben, die zum mit einem Datensatz gekoppelten Bericht passt. Sie zeigt nicht, wer die Pflanze hält, und niemand sonst kann es von hier aus prüfen. Andere prüfen einen Datensatz auf seiner Prüfseite, und sein Datum, sobald er verankert ist.',
  'app.plant.check.tap': 'Tippen, um den Laborbericht zu wählen',
  'app.plant.check.drag': 'Ziehen Sie den Laborbericht hierher oder klicken Sie, um ihn zu wählen',
  'app.plant.check.hint': 'Lokal gelesen und mit einem Code versehen, nie hochgeladen.',
  'app.plant.check.none':
    'Bei keinem Ihrer Datensätze ist dieser Laborbericht gespeichert. Speichern Sie ihn zuerst bei der richtigen Pflanze und prüfen Sie dann erneut.',
  'app.plant.check.found': 'Übereinstimmung gefunden.',
  'app.plant.check.foundSub': 'Der Code dieser Datei wurde in Ihrem Browser erstellt; sie wurde nicht hochgeladen.',
  'app.plant.check.matches': 'Diese Datei passt zum mit {name} gekoppelten Bericht.',
  'app.plant.check.meaning':
    'Datensatz {id}. Eine Übereinstimmung bedeutet, dass die Datei Byte für Byte die gekoppelte ist; sie sagt nichts über die Genetik und nichts darüber, wer die Pflanze hält.',
  'app.plant.check.checking': 'Wird auf Ihrem Gerät geprüft…',
  'app.plant.check.checkIt': 'Prüfen',
  'app.plant.fix.field.cultivarName': 'Sortenname',
  'app.plant.fix.field.breederName': 'gezüchtet von',
  'app.plant.fix.field.breedingMethod': 'Zuchtmethode',
  'app.plant.fix.field.claimedCreationDate': 'angegebenes Entstehungsdatum',
  'app.plant.fix.field.notes': 'Notizen',
  'app.plant.fix.field.internalReference': 'interne Referenz',
  'app.plant.fix.field.parents': 'Eltern',
  'app.plant.fix.field.attestations': 'Bestätigungen',
  'app.plant.fix.field.sealedAt': 'Versiegelungsdatum',
  'app.plant.fix.field.holder': 'Inhaber',
  'app.plant.fix.c.cosmetic.cosmetic':
    'Nichts Nachgelagertes ist betroffen. Nachkommen behalten ihre Abstammungsprüfungen, und Vereinbarungen bleiben bestehen.',
  'app.plant.fix.c.cosmetic.material':
    'Nachkommen sind nicht betroffen: Das Material hat sich nicht geändert. Aber wer eine Vereinbarung zu diesem Datensatz hat, muss es erfahren, denn die Bedingungen können sich auf das Geänderte beziehen.',
  'app.plant.fix.c.material.cosmetic':
    'Wer sich auf die Abstammung von diesem Datensatz stützt, muss erneut prüfen. Bestehende Vereinbarungen sind nicht betroffen.',
  'app.plant.fix.c.material.material':
    'Sowohl die Abstammung als auch bestehende Vereinbarungen sind betroffen. Die Abstammung der Nachkommen muss erneut geprüft werden, und die anderen Parteien Ihrer Vereinbarungen müssen informiert werden.',
  'app.plant.fix.open': 'Diesen Datensatz korrigieren',
  'app.plant.fix.title': '{id} korrigieren',
  'app.plant.fix.intro':
    'Dieser Datensatz bleibt genau, wie er ist. Eine Korrektur erzeugt einen neuen Datensatz, der ihn ersetzt, und beide bleiben gespeichert. Eine Korrektur überschreibt und löscht nichts: Deshalb bleibt das Original als Nachweis brauchbar.',
  'app.plant.fix.name': 'Sortenname',
  'app.plant.fix.bredBy': 'Gezüchtet von',
  'app.plant.fix.notes': 'Notizen',
  'app.plant.fix.does': 'Was diese Korrektur bewirkt',
  'app.plant.fix.workedOut':
    'Das ergibt sich daraus, welche Felder Sie geändert haben. Weder Sie noch wir können es festlegen; sonst sähe jede Korrektur harmlos aus.',
  'app.plant.fix.why': 'Warum korrigieren Sie das?',
  'app.plant.fix.whyHelp':
    'Wird mit der Korrektur in Ihren Datensätzen gespeichert. Die öffentliche Ansicht zeigt, welche Felder sich geändert haben, nicht diesen Grund.',
  'app.plant.fix.check': 'Prüfen, was das betrifft',
  'app.plant.fix.notSaved': 'Die Korrektur konnte nicht gespeichert werden.',
  'app.plant.fix.issue': 'Korrektur ausstellen',
  'app.plant.att.linked': '{date} · verknüpft mit Ihrer Lieferung {id}',
  'app.plant.att.verified': 'Die Signatur wurde in diesem Browser geprüft.',
  'app.plant.att.unverifiedRetraction':
    ' Das Register meldet auch eine Rücknahme, die nicht vom Labor signiert ist; sie wird hier ignoriert.',
  'app.plant.att.codeUsed':
    'Jemand hat Ihren Laborcode verwendet, aber kein Labor hat dafür eine Empfangsbestätigung signiert. Ein verwendeter Code zeigt nicht, wer die Probe genommen hat.',
  'app.plant.att.noReceipt':
    'Noch hat kein Labor eine Empfangsbestätigung für diese Pflanze signiert. Ein Datensatz, für den nur Sie einstehen, ist ein schwächerer Nachweis als einer, den ein Labor signiert. Senden Sie eine Probe an ein Labor: Seine Empfangsbestätigung wird mit seinem Schlüssel signiert, nicht mit Ihrem.',
  'app.plant.att.others':
    'Andere Signaturen nennen diesen Datensatz: {n}, nicht mit Ihren Lieferungen verknüpft. Jeder kann eine Erklärung zu einem öffentlichen Prüfcode signieren, daher zählen sie nicht als Empfangsbestätigung.',
  'app.plant.att.title': 'Signaturen zu diesem Datensatz',
  'app.plant.att.nobody':
    'Noch hat niemand sonst diesen Datensatz bestätigt. Ein Datensatz, für den nur Sie einstehen, ist ein schwächerer Nachweis als einer, den eine zweite Partei bestätigt. Senden Sie das Material an ein Labor: Seine Bestätigung wird unter seinem Schlüssel erfasst, nicht unter Ihrem.',
  'app.plant.att.legacy':
    'Lieferung am {date} angenommen von jemandem mit dem Code, den der Absender ausgestellt hat{addressed}. Erfasst, bevor es Signaturen gab, daher zeigt es, dass eine zweite Partei die Lieferung angenommen hat, ohne zu beweisen, wer sie ist.',
  'app.plant.att.addressed': ', adressiert an {who}',
} satisfies Partial<AppTranslation>;
