// German (Sie). DRAFT: machine-assisted, to be checked by a fluent speaker before publishing
// (docs/translations/README.md). Terms as in ../../de.ts.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const lab = {
  'app.signer.lead.receipt': 'Empfangsbestätigung signiert von {who}',
  'app.signer.lead.signed': 'Signiert von {who}',
  'app.signer.lead.signedLower': 'signiert von {who}',
  'app.signer.lead.by': 'von {who}',
  'app.signer.certificateNo': ' (Zertifikat {no})',
  'app.signer.licenseNo': ' (Lizenz {no})',
  'app.signer.matchBefore': 'Der Betreiber von VeilCore hat diesen Namen abgeglichen mit ',
  'app.signer.matchAfter': '{number} am {date}.',
  'app.signer.disclaimer': 'VeilCore bürgt nicht für die Arbeit des Labors.',
  'app.signer.rest': ' {before}{host}{after} {disclaimer}',
  'app.signer.text': '{lead}.{rest}',
  'app.signer.keyNamed': 'einem Schlüssel namens „{name}“ (Name nicht geprüft)',
  'app.signer.keyUnnamed': 'einem Schlüssel, den niemand benannt hat',
  'app.lab.saved.lab': 'gespeichert · passt zum signierten Bericht des Labors',
  'app.lab.saved.self': 'gespeichert · keine Laborsignatur passt dazu',
  'app.lab.saved.replacedNewer': 'vom Labor ersetzt – speichern Sie den korrigierten',
  'app.lab.saved.replacedNone': 'vom Labor ersetzt · kein aktueller Bericht von {lab}',
  'app.lab.saved.withdrawn': 'vom Labor zurückgezogen',
  'app.lab.theLab': 'das Labor',
  'app.lab.onDay': ' am {date}',
  'app.lab.replacedTail': 'Der Inhaber hat den korrigierten noch nicht gespeichert.',
  'app.lab.withdrawnTail': 'Es ist weiterhin die hier gespeicherte Datei; das Labor steht nicht mehr dahinter.',
  'app.lab.sentence.none': 'Bei dieser Pflanze ist kein DNA-Bericht gespeichert.',
  'app.lab.sentence.lab':
    'Der gespeicherte DNA-Bericht passt zu einem Laborbericht, {lead}, anhand seines SHA-256 (Signatur in diesem Browser geprüft).{rest}',
  'app.lab.sentence.self':
    'Bei dieser Pflanze ist eine Datei eines DNA-Berichts gespeichert. Keine Laborsignatur passt dazu, daher ist sie die eigene Angabe des Inhabers.',
  'app.lab.sentence.replaced':
    'Der bei dieser Pflanze gespeicherte DNA-Bericht wurde vom Labor{on} durch einen korrigierten ersetzt. {tail}',
  'app.lab.sentence.withdrawn':
    'Der bei dieser Pflanze gespeicherte DNA-Bericht wurde vom Labor{on} zurückgezogen. {tail}',
  'app.lab.custody.sealIntact': 'Siegel unversehrt',
  'app.lab.custody.sealNotIntact': 'Siegel nicht unversehrt',
  'app.lab.custody.noSeal': 'kein Siegel',
  'app.lab.custody.sample': 'Probe {v}',
  'app.lab.custody.seal': 'Siegel {v}',
  'app.lab.custody.takenFromOn': 'entnommen von {from} am {on}',
  'app.lab.custody.takenFrom': 'entnommen von {from}',
  'app.lab.custody.takenOn': 'entnommen am {on}',
  'app.lab.custody.witness': 'Zeuge {v} (VeilCore prüft das nicht)',
  'app.lab.custody.comma': ', ',
  'app.lab.custody.arrived': 'angekommen {v}',
  'app.lab.custody.condition': 'Zustand: {v}',
  'app.lab.custody.labNo': 'Labor-Nr. {v}',
  'app.lab.custody.idDiffers': 'Proben-ID weicht ab: gesendet {sent}, erhalten {got}',
  'app.lab.custody.sealDiffers': 'Siegelnummer weicht ab: gesendet {sent}, erhalten {got}',
  'app.lab.custody.idNotConfirmed': 'Proben-ID bei Ankunft nicht bestätigt (gesendet {sent})',
  'app.lab.custody.sealNotConfirmed': 'Siegelnummer bei Ankunft nicht bestätigt (gesendet {sent})',
  'app.lab.custody.noSealOnArrival': 'Kein Siegel bei Ankunft (gesendet mit Siegel {sent})',
  'app.lab.custody.sealNotIntactOnArrival': 'Siegel bei Ankunft nicht unversehrt',
  'app.lab.custody.line': '{v}.',
  'app.lab.custody.sent': 'Gesendet: {v}',
  'app.lab.custody.received': 'Erhalten: {v}',
  'app.lab.custody.notCovered': 'Die Empfangsbestätigung des Labors deckt die Probendetails nicht ab.',
  'app.lab.custody.changed':
    'Das Labor hat seine Ankunftsdetails nach dem Signieren geändert, daher deckt seine Empfangsbestätigung sie nicht ab.',
  'app.lab.custody.bothMatch': 'Proben-ID und Siegelnummer stimmen mit dem Gesendeten überein.',
  'app.lab.custody.idMatches': 'Die Proben-ID stimmt mit dem Gesendeten überein.',
  'app.lab.custody.sealMatches': 'Die Siegelnummer stimmt mit dem Gesendeten überein.',
  'app.lab.custody.noDifference':
    'Kein Unterschied zwischen den gesendeten Probendetails und denen, die das Labor bei Ankunft notiert hat.',
  'app.lab.custody.joinSentences': ' ',
  'app.lab.custody.locked':
    'Die Probenangaben sind verschlossen, und dieser Browser hat ihren Schlüssel nicht. Stellen Sie hier Ihre Sicherungsdatei wieder her, um sie zu sehen.',
  'app.lab.custody.sealedSigned':
    'Die Empfangsbestätigung des Labors nennt Probenangaben. Sie sind verschlossen gespeichert, und VeilCore hat den Schlüssel nicht, daher kann diese Seite sie nicht prüfen; die App des Inhabers kann es.',
  'app.lab.custody.holderMatch':
    'Die App des Absenders hat sie verglichen: Was ankam, entspricht dem, was gesendet wurde. Das ist die Angabe des Absenders.',
  'app.lab.custody.holderDiffers':
    'Die App des Absenders hat sie verglichen und Abweichungen gefunden bei: {fields}. Das ist die Angabe des Absenders.',
  'app.lab.custody.holderChanged':
    'Die App des Absenders hat sie verglichen: Das Labor hat seine Ankunftsangaben nach dem Signieren geändert, daher deckt seine Empfangsbestätigung sie nicht ab. Das ist die Angabe des Absenders.',
  'app.lab.custody.removed':
    'Die Probenangaben dieser Lieferung wurden vor dem Verschließen geschrieben und inzwischen entfernt, daher kann diese Empfangsbestätigung nicht mit ihnen verglichen werden.',
  'app.lab.send.secretNotSaved':
    'Der Schlüssel dieser Pflanze ist noch nicht bei VeilCore gespeichert, daher wurde kein Labor-Code erstellt: {error}. Laborberichte werden mit diesem Schlüssel verschlossen, und er muss zuerst mit der Pflanze gespeichert werden. Versuchen Sie es erneut.',
  'app.lab.send.sampleNotSaved': 'Der Laborcode funktioniert, aber die Probenangaben wurden nicht gespeichert: {error}',
  'app.signer.sep': ' ',
  'app.lab.strength.unsigned': 'Nicht signiert',
  'app.lab.strength.unsignedWhy':
    'Erfasst, aber nicht signiert. Das ist eine Behauptung über eine zweite Partei, keine Erklärung von ihr.',
  'app.lab.strength.invalid': 'Signatur lässt sich nicht prüfen',
  'app.lab.strength.invalidWhy':
    'Es lässt sich nicht zeigen, dass diese Bestätigung von dem genannten Schlüssel stammt. Behandeln Sie sie als unbestätigt.',
  'app.lab.strength.retracted': 'Zurückgenommen',
  'app.lab.strength.retractedWhy':
    'Der Bestätigende hat dies am {date} zurückgezogen, mit einer von seinem Schlüssel signierten Rücknahme. Es bleibt im Datensatz – Rücknahme ist keine Löschung.',
  'app.lab.strength.unverifiedRetraction':
    ' Das Register meldet auch eine Rücknahme, die nicht vom Bestätigenden signiert ist; sie wird hier ignoriert.',
  'app.lab.strength.matched': 'Signiert · Name mit einem öffentlichen Verzeichnis abgeglichen',
  'app.lab.strength.matchedWhy': '{text} Die Signatur wurde in diesem Browser geprüft.{acc}{unverified}',
  'app.lab.strength.accreditation':
    ' Angegeben ist eine {scheme}-Akkreditierung durch {by}; bestätigen Sie das bei {by}.',
  'app.lab.strength.expired': ' Ein früherer Abgleich dieses Namens ist abgelaufen.',
  'app.lab.strength.notChecked': 'Signiert · Name nicht geprüft',
  'app.lab.strength.anyName':
    '{text}. Jeder kann einen Schlüssel unter jedem Namen registrieren, daher zeigt das nicht, wer signiert hat.{expired}',
  'app.lab.strength.unregistered':
    'Signiert von einem Schlüssel, den niemand registriert hat. Die Signatur ist gültig; wer den Schlüssel hält, ist nicht bekannt.',
  'app.lab.field.sampleId': 'Proben-ID',
  'app.lab.field.sealNumber': 'Siegelnummer',
  'app.lab.field.takenFrom': 'Entnommen von',
  'app.lab.field.takenOn': 'Entnommen am',
  'app.lab.field.witness': 'Zeuge',
  'app.lab.field.arrivedOn': 'Angekommen am',
  'app.lab.field.condition': 'Zustand',
  'app.lab.field.labRef': 'Eingangsnummer',
  'app.lab.field.sealIntact': 'Siegel unversehrt',
  'app.lab.field.noHiddenCondition':
    '{label} darf keine Tabulatoren oder versteckten Zeichen (z. B. Richtungsmarken) enthalten.',
  'app.lab.field.noHidden':
    '{label} darf keine Zeilenumbrüche, Tabulatoren oder versteckten Zeichen (z. B. Richtungsmarken) enthalten.',
  'app.lab.field.realDate': '{label} muss ein echtes Datum sein.',
  'app.lab.field.tooLong': '{label} darf höchstens {limit} Zeichen lang sein.',
  'app.lab.err.noSuch': 'Keine Lieferung hat diesen Laborcode. Prüfen Sie, ob Sie den ganzen Code kopiert haben.',
  'app.lab.err.used': 'Dieser Laborcode wurde schon verwendet.',
  'app.lab.err.noMatch': 'Dieser Laborcode passt nicht. Fragen Sie den Züchter nach dem Code, den er erhalten hat.',
  'app.lab.err.tooOld': 'Dieser Laborcode ist zu alt. Bitten Sie den Züchter, einen neuen zu erstellen.',
  'app.lab.err.gone':
    'Der Datensatz des Züchters zu diesem Laborcode existiert nicht mehr. Bitten Sie ihn um einen neuen Code.',
  'app.lab.err.changed':
    'Der Züchter hat den Datensatz dieser Pflanze geändert, nachdem er den Laborcode erstellt hat. Bitten Sie ihn um einen neuen Code.',
  'app.lab.err.notReceived': 'Diesen Laborcode hat noch niemand verwendet.',
  'app.lab.err.onlyLab': 'Das kann nur das Labor, das diesen Laborcode verwendet hat.',
  'app.lab.err.tooMany':
    'Sie haben zu viele Laborcodes, die noch niemand verwendet hat. Warten Sie, bis einige verwendet werden oder ältere ablaufen.',
  'app.lab.send.ready': 'Bereit zum Senden',
  'app.lab.send.title': '{name} senden',
  'app.lab.send.give':
    'Geben Sie diesen Laborcode an {handle}. Wenn der Empfänger ihn eingibt, kann er signieren, dass die Probe angekommen ist.',
  'app.lab.send.giveWithResults':
    'Geben Sie diesen Laborcode an {handle}. Wenn der Empfänger ihn eingibt, kann er signieren, dass die Probe angekommen ist, und einen Laborbericht zurücksenden, den nur Sie öffnen können.',
  'app.lab.send.copied': 'Kopiert',
  'app.lab.send.copy': 'Code kopieren',
  'app.lab.send.dontWrite':
    '<b>Senden Sie ihn per Nachricht oder E-Mail. Schreiben Sie ihn nicht auf das Paket:</b> Wer diesen Laborcode hat, kann die Lieferung bestätigen.',
  'app.lab.send.labWillCheck': '<b>Das Labor prüft:</b> {line}.',
  'app.lab.send.nothingYet':
    'Noch hat sich nichts geändert. Die Seite Ihrer Pflanze zeigt „wartet“, bis der Code eingegeben wird, und kann diesen Code erneut anzeigen. Er wird in das Feld auf der Startseite von VeilCore eingefügt.',
  'app.lab.send.intro':
    'Der Empfänger erhält einen eigenen Datensatz über das, was er erhalten hat, verknüpft mit Ihrem. Wenn er signiert, dass es angekommen ist, wird mit seinem Schlüssel signiert, nicht mit Ihrem: eine zweite Partei in Ihrem Datensatz.',
  'app.lab.send.who': 'An wen senden Sie es?',
  'app.lab.send.whoHelp': 'Ein Name oder Kürzel, damit Sie beide wissen, um welche Lieferung es geht.',
  'app.lab.send.quantity': 'Menge (optional)',
  'app.lab.send.quantityPlaceholder': 'z. B. 10 Stecklinge',
  'app.lab.send.note': 'Notiz für das Labor (optional)',
  'app.lab.send.noteHelp': 'Nur das Labor sieht sie, sobald es den Code eingibt.',
  'app.lab.send.count': '{n} von {max} Zeichen.',
  'app.lab.send.sample': 'Die Probe (optional)',
  'app.lab.send.sampleHelp':
    'Das Labor prüft diese Angaben bei Ankunft und bestätigt oder korrigiert jede. Seine signierte Empfangsbestätigung deckt ab, was Sie geschrieben haben und was es vorgefunden hat.',
  'app.lab.send.sampleId': 'Proben-ID / Etikett auf Röhrchen oder Beutel',
  'app.lab.send.sealNumber': 'Siegel- oder Beutelnummer',
  'app.lab.send.takenFromHelp': 'Die Mutterpflanze oder ihr Standortschild.',
  'app.lab.send.witness': 'Zeuge (optional)',
  'app.lab.send.witnessHelp': 'Wer gesehen hat, wie sie entnommen und versiegelt wurde. VeilCore prüft das nicht.',
  'app.lab.send.addSample': 'Etikett und Siegel der Probe hinzufügen (optional)',
  'app.lab.send.make': 'Einen Code für das Labor erstellen',
  'app.lab.send.shareTitle': 'Laborcode für {name}',
  'app.lab.send.share': 'Teilen',
  'app.lab.send.hide': 'Ausblenden',
  'app.lab.send.showAgain': 'Code erneut anzeigen',
  'app.lab.send.waiting': '<b>An {handle} gesendet, wartet</b> seit {date}.',
  'app.lab.send.waitingSample': ' {line}.',
  'app.lab.send.otherBrowser':
    ' Dieser Code wurde in einem anderen Browser erstellt und ist nicht in diesem; erstellen Sie einen neuen, falls er verloren ist.',
  'app.lab.recv.statement': 'Eine Probe mit dem Etikett „{label}“{qty} ist angekommen{code}.',
  'app.lab.recv.unlabelled': 'ohne Etikett',
  'app.lab.recv.statementQty': ' ({qty}, wie vom Züchter angegeben)',
  'app.lab.recv.statementCode': ' unter dem Laborcode {code}',
  'app.lab.recv.quoted': '„{v}“',
  'app.lab.recv.breederWrote': '<b>Der Züchter schrieb:</b> {line}',
  'app.lab.recv.onArrival': '<b>Bei Ankunft:</b> {line}',
  'app.lab.recv.aboutRecord': 'Zum Datensatz {id} des Züchters, Prüfcode',
  'app.lab.recv.pointing': 'Verweist auf Ihren erhaltenen Datensatz',
  'app.lab.recv.signedByKey': 'Signiert mit Ihrem Schlüssel ({name})',
  'app.lab.recv.unnamed': 'unbenannt',
  'app.lab.recv.howArrived': 'Wie sie ankam',
  'app.lab.recv.checkTube':
    'Prüfen Sie Röhrchen oder Beutel. Ändern Sie alles, was nicht dem entspricht, was der Züchter geschrieben hat. Alles optional.',
  'app.lab.recv.sampleIdOnArrival': 'Proben-ID bei Ankunft',
  'app.lab.recv.sealOnArrival': 'Siegelnummer bei Ankunft',
  'app.lab.recv.sealIntactQ': 'Siegel unversehrt?',
  'app.lab.recv.yes': 'Ja',
  'app.lab.recv.no': 'Nein',
  'app.lab.recv.noSeal': 'Kein Siegel',
  'app.lab.recv.arrivedHelp': 'Der Tag, an dem sie bei Ihnen ankam.',
  'app.lab.recv.conditionPlaceholder': 'z. B. kühl, Beutel trocken, Wurzeln unversehrt',
  'app.lab.recv.accession': 'Ihre Eingangsnummer',
  'app.lab.recv.accessionHelp': 'Steht auf Ihrer Empfangsbestätigung, sodass der Züchter sie sieht.',
  'app.lab.recv.differs':
    'Abweichend von dem, was der Züchter geschrieben hat. Der Züchter sieht das auf Ihrer Empfangsbestätigung:',
  'app.lab.recv.exactly':
    'Ihr Schlüssel kann eine Empfangsbestätigung für diese Lieferung signieren. Genau das steht in der Empfangsbestätigung:',
  'app.lab.recv.fingerprintFrom':
    'Der Prüfcode kommt vom Register und passt zu dem, was dessen öffentliche Seite für {id} meldet. Wenn der Züchter Ihnen einen Prüfcode gegeben hat, vergleichen Sie ihn vor dem Signieren.',
  'app.lab.recv.physically': 'Ich habe dieses Material tatsächlich erhalten.',
  'app.lab.recv.dontSign': 'Nicht signieren',
  'app.lab.recv.signWithKey': 'Mit meinem Schlüssel signieren',
  'app.lab.recv.turnAway':
    'Ablehnen? Es wird nichts signiert, und VeilCore benachrichtigt den Züchter nicht: Sagen Sie es ihm selbst.',
  'app.lab.recv.damaged': 'Sie kam beschädigt an',
  'app.lab.recv.wrongSample': 'Es ist die falsche Probe',
  'app.lab.recv.rejected': 'Erhalten, aber abgelehnt (beschädigt oder falsche Probe)',
  'app.lab.recv.nothingSigned': '{problems} Es wurde nichts signiert',
  'app.lab.recv.askNewCode':
    'Ihre Angaben zur Ankunft können für diese Lieferung nicht verschlossen werden: Dem Code fehlt sein letzter Teil, oder die Probenangaben des Absenders sind nie bei VeilCore angekommen. Nichts wurde gesendet und nichts unterschrieben. Bitten Sie den Absender um einen neuen Code.',
  'app.lab.recv.notSaved': 'Ihre Ankunftsdetails wurden nicht gespeichert ({error}), daher wurde nichts signiert',
  'app.lab.recv.savedDifferent':
    'die Probendetails kamen vom Register anders zurück als die auf diesem Bildschirm, daher wurde nichts signiert. Laden Sie die Seite neu und prüfen Sie sie erneut',
  'app.lab.recv.unlinked':
    'Ihre Empfangsbestätigung ist signiert, konnte aber nicht mit dieser Lieferung verknüpft werden ({error}), daher kann der Züchter sie noch nicht sehen. Versuchen Sie es erneut oder verknüpfen Sie sie später auf der Seite der Pflanze.',
  'app.lab.recv.linkIntro':
    'Ihre Empfangsbestätigung ist signiert. Verknüpfen Sie sie mit dieser Lieferung, damit der Züchter sie sieht: Bis dahin zählt seine Seite sie nicht, denn jeder kann eine Erklärung über eine Pflanze signieren, aber nur wer den Laborcode verwendet hat, kann eine mit der Lieferung verknüpfen.',
  'app.lab.recv.linking': 'Wird verknüpft…',
  'app.lab.recv.setUpFirst':
    'Richten Sie zuerst die Signatur Ihres Labors ein; dann können Sie signieren, dass diese Probe angekommen ist.',
  'app.lab.recv.checking': 'Datensatz des Züchters wird geprüft…',
  'app.lab.recv.notRecorded': 'Ihre Empfangsbestätigung wurde nicht erfasst: {error}.',
  'app.lab.recv.noCodeHere': 'diese Pflanze hat auf diesem Gerät keinen Laborcode',
  'app.lab.recv.receivedNotRecorded':
    'Lieferung erhalten, aber Ihre signierte Empfangsbestätigung wurde nicht erfasst: {error}. Sie können sie später auf der Seite der Pflanze signieren.',
  'app.lab.recv.title': 'Material empfangen',
  'app.lab.recv.signTitle': 'Signieren, was Sie erhalten haben?',
  'app.lab.recv.intro':
    'Geben Sie den Laborcode ein, den der Züchter Ihnen gegeben hat. Sie erhalten einen eigenen Datensatz über das Erhaltene, verknüpft mit seinem, und das Register hält fest, dass jemand mit diesem Code die Lieferung angenommen hat. Wenn Sie einen Signaturschlüssel haben, sehen Sie genau, was Sie signieren würden, bevor irgendetwas signiert wird.',
  'app.lab.recv.codeLabel': 'Laborcode',
  'app.lab.recv.missingLock':
    'Diesem Code fehlt der letzte Teil; Sie können die Probe empfangen, aber keinen Bericht zurücksenden, bis Sie den vollständigen Code haben.',
  'app.lab.recv.refused': 'Die Lieferung ist empfangen und Ihr Datensatz erstellt. {reason}',
  'app.lab.recv.onlyConfirm':
    'Bestätigen Sie nur, was Sie tatsächlich erhalten haben. Das ist eine Erklärung, auf die sich andere verlassen.',
  'app.lab.recv.receiveIt': 'Empfangen',
  'app.lab.recv.goToRecord': 'Zum Datensatz',
  'app.lab.key.role.laboratory': 'Labor',
  'app.lab.key.role.inspector': 'Prüfer',
  'app.lab.key.role.registry': 'Register',
  'app.lab.key.role.breeder': 'Züchter',
  'app.lab.key.role.other': 'Andere',
  'app.lab.key.couldNotCreate': 'Es konnte kein Schlüssel erstellt werden.',
  'app.lab.key.notPublished':
    'Ihr Schlüssel ist in diesem Browser gespeichert, wurde aber nicht veröffentlicht: {error}. Versuchen Sie es erneut.',
  'app.lab.key.yours': 'Ihr Signaturschlüssel',
  'app.lab.key.setUp': 'Richten Sie Ihren Signaturschlüssel ein',
  'app.lab.key.notPublishedYet':
    ' · noch nicht veröffentlicht: Bis dahin kann niemand Ihre Signaturen diesem Namen zuordnen.',
  'app.lab.key.publishAgain': 'Erneut veröffentlichen',
  'app.lab.key.publicKey': 'Öffentlicher Schlüssel',
  'app.lab.key.privateWarning':
    'Ihr privater Schlüssel liegt unverschlüsselt im Speicher dieses Browsers und nirgendwo sonst. Zum Ausprobieren ist das in Ordnung. Alles, was auf dieser Website laufen kann, oder eine Browsererweiterung mit Zugriff darauf, könnte ihn lesen. Wenn Sie ihn verlieren, können Sie nichts Neues signieren; was Sie zuvor signiert haben, bleibt gültig, also sichern Sie ihn an einem sicheren Ort. Ein Labor, das ihn wirklich nutzt, würde in seinen eigenen Systemen signieren: siehe den <link>Integrationsleitfaden</link>.',
  'app.lab.key.downloadBackup': 'Schlüsselsicherung herunterladen',
  'app.lab.key.intro':
    'Wenn Sie bestätigen, dass Sie Material erhalten haben, oder einen Bericht signieren, wird mit einem Schlüssel signiert, den nur Sie halten. Es wird Ihre Erklärung, nicht etwas, das wir in Ihrem Namen erfasst haben. Der Schlüssel wird in diesem Browser erstellt; veröffentlicht werden nur seine öffentliche Hälfte, Ihr Name und eine angegebene Akkreditierung.',
  'app.lab.key.name': 'Name',
  'app.lab.key.nameHelp': 'Wie Sie für alle erscheinen, die einen von Ihnen signierten Datensatz prüfen.',
  'app.lab.key.role': 'Rolle',
  'app.lab.key.accreditation': 'Akkreditierung (optional)',
  'app.lab.key.accreditationHelp':
    'Wir erfassen sie und prüfen sie nie. Wer Ihre Signatur prüft, kann sie direkt bei der Akkreditierungsstelle bestätigen; deshalb nennen Sie sie.',
  'app.lab.key.scheme': 'Verfahren',
  'app.lab.key.stateLicense': 'Staatliche Lizenz',
  'app.lab.key.accNumber': 'Akkreditierungsnummer',
  'app.lab.key.accreditor': 'Akkreditierungsstelle',
  'app.lab.key.accreditorPlaceholder': 'z. B. A2LA, PJLA, Landesbehörde',
  'app.lab.key.create': 'Meinen Schlüssel erstellen',
  'app.lab.results.replacedNewer':
    '<b>Der bei dieser Pflanze gespeicherte DNA-Bericht wurde vom Labor ersetzt.</b> Speichern Sie den korrigierten: Öffnen Sie ihn und tippen Sie dann auf „Bei dieser Pflanze speichern“.',
  'app.lab.results.replacedNone':
    '<b>Der bei dieser Pflanze gespeicherte DNA-Bericht wurde vom Labor ersetzt.</b> Kein aktueller Bericht von {lab}: Das Original wurde ersetzt und die Korrektur zurückgezogen.',
  'app.lab.results.withdrawn':
    '<b>Der bei dieser Pflanze gespeicherte Laborbericht wurde vom Labor zurückgezogen.</b> Er bleibt gespeichert, bis Sie einen anderen speichern, und Ihr Zertifikat und Ihre Links sagen, dass er zurückgezogen wurde.',
  'app.lab.results.withdrawnNewer':
    '<b>Der bei dieser Pflanze gespeicherte Laborbericht wurde vom Labor zurückgezogen.</b> Er bleibt gespeichert, bis Sie einen anderen speichern, und Ihr Zertifikat und Ihre Links sagen, dass er zurückgezogen wurde. Ein neuerer Laborbericht ist da: Öffnen Sie ihn und speichern Sie ihn dann bei dieser Pflanze.',
  'app.lab.results.unsigned':
    'Keine Laborsignatur passt genau zu dieser Datei. Sie ließ sich mit Ihrem Schlüssel öffnen, aber behandeln Sie sie nicht als Laborbericht des Labors, bis es sie signiert.',
  'app.lab.results.noReceipt':
    '<b>Signiert von {who}, aber das Labor hat keine Empfangsbestätigung für diese Lieferung signiert.</b> Die Datei passt zur Signatur dieses Schlüssels, aber nichts zeigt, dass der Schlüssel je Ihre Probe hatte. Fragen Sie das Labor, bevor Sie sich darauf verlassen.',
  'app.lab.results.otherKey':
    '<b>Signiert von {who}, aber nicht von dem Schlüssel, der die Empfangsbestätigung für diese Lieferung signiert hat.</b> Die Datei passt zur Signatur dieses Schlüssels, aber nichts zeigt, dass der Schlüssel je Ihre Probe hatte. Fragen Sie das Labor, bevor Sie sich darauf verlassen.',
  'app.lab.results.signed':
    '<b>{lead}</b> (Schlüssel {key}), Signatur in diesem Browser geprüft. Derselbe Schlüssel hat die Empfangsbestätigung für diese Lieferung signiert.',
  'app.lab.results.anyName':
    ' Jeder kann einen Schlüssel unter jedem Namen registrieren, daher zeigt der Name nicht, wer signiert hat.',
  'app.lab.results.locked':
    'So verschlossen, dass nur Sie sie öffnen können, mit dem Schlüssel dieser Pflanze aus Ihrer Sicherungskopie. VeilCore speichert sie verschlossen und hat den Schlüssel nicht.',
  'app.lab.results.noKey':
    'Der Schlüssel dieser Pflanze ist nicht auf diesem Gerät, daher können ihre Laborberichte hier nicht geöffnet werden. <link>Holen Sie Ihre Pflanzen zuerst aus Ihrer Sicherungskopie zurück</link>.',
  'app.lab.results.gotIt': 'Verstanden',
  'app.lab.results.whatOthersSee':
    '<b>Was andere sehen können.</b> Die Signatur des Labors ist öffentlich, der Bericht nicht. Wer einen Link zur Prüfseite dieser Pflanze hat, sieht, dass ein Laborbericht über sie signiert wurde, den SHA-256 der Berichtsdatei und den Namen, unter dem der Schlüssel des Labors registriert ist: markiert mit „Name nicht geprüft“, sofern der Betreiber von VeilCore ihn nicht mit einem öffentlichen Lizenz- oder Akkreditierungsverzeichnis abgeglichen hat. Wenn Sie den Bericht bei dieser Pflanze speichern und unter „Jemandem zeigen“ „Ob ein DNA-Bericht gespeichert ist“ teilen, sieht man auch, dass die gespeicherte Datei dazu passt.',
  'app.lab.results.noCurrent':
    'Kein aktueller Bericht von {lab}: Das Original wurde ersetzt und die Korrektur zurückgezogen.',
  'app.lab.results.looking': 'Laborberichte werden gesucht…',
  'app.lab.results.nothingYet':
    'Noch nichts. Wenn ein Labor, an das Sie diese Pflanze gesendet haben, einen Laborbericht sendet, erscheint er hier.',
  'app.lab.results.from': 'Von {lab} · {id}',
  'app.lab.results.sent': 'Gesendet {when}',
  'app.lab.results.corrects': ' · korrigiert {id}',
  'app.lab.results.savedHere': ' · bei dieser Pflanze gespeichert',
  'app.lab.results.withdrawnOn': 'Vom Labor am {date} zurückgezogen',
  'app.lab.results.stillSaved': '. Er ist weiterhin bei dieser Pflanze gespeichert.',
  'app.lab.results.replacedByNewer': 'Durch einen neueren Laborbericht ersetzt',
  'app.lab.results.opening': 'Wird geöffnet…',
  'app.lab.results.fileLine': '{type} · SHA-256 der Datei {sha} · wird als „{name}“ heruntergeladen',
  'app.lab.results.download': 'Datei herunterladen',
  'app.lab.results.replacesSaved':
    'Bei dieser Pflanze ist schon ein Laborbericht gespeichert. Wenn Sie diesen speichern, ersetzt er ihn; Sie bestätigen auf dem nächsten Bildschirm.',
  'app.lab.facts.title': 'Was mitkam',
  'app.lab.facts.labelled': 'Etikettiert „{name}“, gezüchtet von {by}',
  'app.lab.facts.unknown': 'unbekannt',
  'app.lab.facts.code': ' · Laborcode {code}',
  'app.lab.facts.arrived': ' · angekommen {date}',
  'app.lab.facts.quantity': '<b>Menge, wie vom Züchter angegeben:</b> {qty}',
  'app.lab.facts.notGiven': 'nicht angegeben',
  'app.lab.facts.note': '<b>Notiz des Züchters:</b> {note}',
  'app.lab.facts.none': 'keine',
  'app.lab.facts.onArrival': '<b>Bei Ankunft (Ihre Empfangsbestätigung):</b> {line}',
  'app.lab.facts.ref': 'Ihre Referenz / Eingangsnummer',
  'app.lab.facts.refHelp': 'Nur Sie sehen das. Die Suche auf der Startseite findet es.',
  'app.lab.facts.save': 'Speichern',
  'app.lab.out.couldntLoad': 'Was Sie gesendet haben, konnte nicht geladen werden: {error}.',
  'app.lab.out.offHere':
    'Laborberichte können in diesem Netzwerk noch nicht über VeilCore zurückgesendet werden. Senden Sie ihn auf dem üblichen Weg an den Züchter.',
  'app.lab.out.noDelivery':
    'Diese Pflanze kam nicht mit einer Lieferung, daher gibt es niemanden, an den ein Laborbericht zurückgehen könnte.',
  'app.lab.out.otherDelivery': 'Dieser Laborcode gehört zu einer anderen Lieferung.',
  'app.lab.out.noLock':
    'Dieser Laborcode enthält kein Schloss. Bitten Sie den Züchter, ihn erneut aus der App zu senden.',
  'app.lab.out.tooBig': 'Diese Datei ist größer als 14 MB.',
  'app.lab.out.withdrawFailed':
    'Es wurde nichts zurückgezogen: Ihre Signatur konnte nicht zurückgezogen werden ({error}).',
  'app.lab.out.fileStillThere':
    'Ihre Signatur ist zurückgezogen, aber die Datei liegt noch beim Register ({error}). Tippen Sie erneut auf „Zurückziehen“.',
  'app.lab.out.withdrawnNote':
    'Zurückgezogen. Der Züchter sieht, dass Sie ihn zurückgezogen haben, und kann ihn nicht mehr öffnen.{extra}',
  'app.lab.out.spaced': ' {v}',
  'app.lab.out.correctionWarning':
    'Das Original bleibt ersetzt. Der Züchter hat keinen gültigen Bericht von Ihnen, bis Sie einen senden.',
  'app.lab.out.couldntCheck':
    'Es wurde nichts signiert: Was Sie bereits gesendet haben, konnte nicht geprüft werden ({error}).',
  'app.lab.out.notConfirmed':
    'Der Datensatz des Züchters konnte im öffentlichen Register nicht bestätigt werden, daher wurde nichts signiert.',
  'app.lab.out.notRecorded': 'Es wurde nichts gesendet: Ihre Signatur wurde nicht erfasst ({error}).',
  'app.lab.out.noAnswer': 'keine Antwort',
  'app.lab.out.didntSendUndoFailed':
    'Die Datei wurde nicht gesendet ({error}), und auch das Zurückziehen Ihrer Signatur ist fehlgeschlagen ({undo}). Versuchen Sie es erneut; wenn es weiter fehlschlägt, ziehen Sie sie auf der Seite Ihres Signaturschlüssels zurück.',
  'app.lab.out.didntSend':
    'Die Datei wurde nicht gesendet ({error}). Ihre Signatur darauf wurde zurückgezogen, daher verweist nichts auf eine Datei, die der Züchter nie erhalten hat. Versuchen Sie es erneut.',
  'app.lab.out.oldSigLeft': 'Ihre Signatur darauf konnte nicht zurückgezogen werden ({error})',
  'app.lab.out.oldFileLeft': 'ihre Datei liegt noch beim Register ({error})',
  'app.lab.out.oldLeft':
    'Die korrigierte Datei wurde gesendet, aber die alte ist nicht vollständig zurückgezogen: {left}. Ziehen Sie die alte auf dieser Seite zurück.',
  'app.lab.out.andJoin': ', und ',
  'app.lab.out.sent': 'Gesendet',
  'app.lab.out.sentText':
    'Nur der Züchter kann ihn öffnen. Ihre Signatur ist öffentlich, der Bericht nicht: Wer einen Link zur Prüfseite dieser Pflanze hat, sieht, dass ein Laborbericht über sie signiert wurde, und seinen SHA-256 ({sha}).',
  'app.lab.out.sentName':
    'Man sieht auch den Namen, unter dem Ihr Schlüssel registriert ist. Bis der Betreiber von VeilCore ihn mit einem öffentlichen Lizenz- oder Akkreditierungsverzeichnis abgleicht, erscheint er als „einem Schlüssel namens „{name}“ (Name nicht geprüft)“.',
  'app.lab.out.yourLab': 'Ihr Labor',
  'app.lab.out.youSent': 'Von Ihnen gesendete Laborberichte',
  'app.lab.out.rowHead': '{id} · gesendet {when}',
  'app.lab.out.withdrawing': 'Wird zurückgezogen…',
  'app.lab.out.yesWithdraw': 'Ja, zurückziehen',
  'app.lab.out.keepIt': 'Behalten',
  'app.lab.out.withdraw': 'Zurückziehen',
  'app.lab.out.sendCorrected': 'Eine korrigierte Datei senden',
  'app.lab.out.confirmText':
    'Ihre Signatur darauf wird zurückgezogen (sie bleibt als zurückgezogen erfasst), und die Datei wird gelöscht. Der Züchter sieht „Vom Labor zurückgezogen“.',
  'app.lab.out.replacesIntro':
    'Er ersetzt {id}, den Laborbericht, den Sie {when} gesendet haben. Der alte wird zurückgezogen: Seine Datei wird entfernt und Ihre Signatur darauf als ersetzt markiert.',
  'app.lab.out.intro':
    'Ihr Browser signiert den Code des Laborberichts mit dem Schlüssel Ihres Labors und verschließt die Datei so, dass nur der Züchter sie öffnen kann. Die verschlossene Datei wartet auf dem Server von VeilCore, bis der Züchter sie öffnet, und VeilCore hat ihren Schlüssel nicht.',
  'app.lab.out.cancelCorrection': 'Korrektur abbrechen',
  'app.lab.out.turnedAway': 'Sie haben diese Probe abgelehnt, daher gibt es keinen Laborbericht zu senden.',
  'app.lab.out.setUpFirst':
    'Richten Sie zuerst die Signatur Ihres Labors ein, damit der Züchter erkennt, dass der Laborbericht von Ihnen ist.',
  'app.lab.out.noLockHere':
    'Dieser Browser hat das Schloss des Züchters für diese Lieferung nicht. Fügen Sie den Laborcode ein, den er Ihnen gesendet hat.',
  'app.lab.out.useCode': 'Diesen Laborcode verwenden',
  'app.lab.out.notSignedReceipt':
    'Sie haben nicht signiert, dass diese Probe angekommen ist. Bis Sie das tun, sieht der Züchter Ihren Laborbericht als signiert von einem Schlüssel, der den Empfang der Probe nicht bestätigt hat.',
  'app.lab.out.notLinked':
    'Ihre Empfangsbestätigung ist signiert, aber noch nicht mit dieser Lieferung verknüpft, daher kann der Züchter sie nicht sehen.',
  'app.lab.out.fileFp': '{size} · Code {fp}',
  'app.lab.out.differentFile': 'Eine andere Datei wählen',
  'app.lab.out.chooseCorrected': 'Die korrigierte Datei wählen',
  'app.lab.out.chooseReport': 'Den Bericht wählen',
  'app.lab.out.signing': 'Wird signiert und verschlossen…',
  'app.lab.out.signLockSend': 'Signieren, verschließen und senden',
  'app.lab.out.alreadyGone': 'Der Laborbericht, den Sie korrigieren, wurde bereits zurückgezogen oder ersetzt.',
  'app.lab.out.sameFile': 'Sie haben genau diese Datei bei dieser Lieferung schon gesendet. Es wurde nichts signiert.',
  'app.lab.out.cap':
    'Diese Lieferung hat bereits {cap} Laborberichte, mehr geht nicht. Ziehen Sie zuerst einen zurück. Es wurde nichts signiert.',
  'app.lab.out.rowsCap':
    'Diese Lieferung hatte so viele Laborberichte, wie sie aufnehmen kann, zurückgezogene eingeschlossen. Bitten Sie den Züchter um einen neuen Laborcode. Es wurde nichts signiert.',
  'app.lab.out.rowReplaced': 'Durch Ihre korrigierte Datei ersetzt.',
  'app.lab.out.rowWithdrawn': 'Am {date} zurückgezogen.',
  'app.lab.out.rowSigned': 'Mit Ihrem Schlüssel signiert · Code {fp}',
  'app.lab.out.rowRetracted':
    'Ihre Signatur darauf ist zurückgezogen, aber die Datei liegt noch beim Register. Ziehen Sie sie zurück, um abzuschließen.',
  'app.lab.out.rowNotSigned': 'Nicht mit dem Schlüssel in diesem Browser signiert.',
  'app.lab.card.unknownBreeder': 'Unbekannter Züchter',
  'app.lab.card.received': 'erhalten {date}',
  'app.lab.card.turnedAway': 'abgelehnt',
  'app.lab.card.signed': 'Empfangsbestätigung signiert ✓',
  'app.lab.card.notSigned': 'Empfangsbestätigung noch nicht signiert',
  'app.lab.card.ref': 'Ref. {ref}',
  'app.lab.send.theLab': 'das Labor',
  // LabResults.tsx: a lock this browser can’t vouch for (round 3, P1)
  'app.lab.out.pasteAgain':
    'Das Schloss für Laborberichte bei diesem Datensatz lässt sich nicht mit dem Laborcode abgleichen, daher wird damit nichts gesendet. Fügen Sie den Laborcode erneut ein.',
} satisfies Partial<AppTranslation>;
