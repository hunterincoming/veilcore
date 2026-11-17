// The record app in German: document records (../en/document.ts). DRAFT: machine-assisted,
// to be checked by a fluent speaker before publishing (docs/translations/README.md).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const document = {
  'app.doc.orDocument':
    'Stattdessen ein Dokument versiegeln? Eine Genehmigung, ein Analysezertifikat, ein Vertrag, ein Transportdokument.',
  'app.doc.orDocumentAction': 'Ein Dokument versiegeln',
  'app.doc.new.title': 'Ein Dokument versiegeln',
  'app.doc.new.intro':
    'Wählen Sie die Datei. Sie bleibt auf diesem Gerät: versiegelt werden nur ihr SHA-256 (ein aus ihren Bytes berechneter Code), ihr Name und ihre Größe, mit einem Datum, das niemand zurückdatieren kann.',
  'app.doc.new.proves':
    'Was das zeigen wird: Eine Datei mit genau diesen Bytes war zu dem Datum, an dem sie versiegelt wird, in Ihren Händen. Nicht, dass das Dokument echt ist, dass der Aussteller es ausgestellt hat oder dass stimmt, was darin steht.',
  'app.doc.f.files': 'Dateien',
  'app.doc.f.filesHelp': 'Bis zu {max}: ein Vertrag und seine Anlagen, ein Analysezertifikat und seine Chromatogramme.',
  'app.doc.f.add': 'Eine Datei hinzufügen',
  'app.doc.f.addMore': 'Noch eine Datei hinzufügen',
  'app.doc.f.reading': '{name} wird gelesen…',
  'app.doc.f.tooLarge': '{name} ist größer als {mb} MB und kann hier nicht gelesen werden.',
  'app.doc.f.duplicate': '{name} ist dieselbe Datei wie eine bereits hinzugefügte.',
  'app.doc.f.full': 'Das sind {max} Dateien, mehr kann ein Dokument nicht haben.',
  'app.doc.f.remove': '{name} entfernen',
  'app.doc.f.title': 'Titel',
  'app.doc.f.titleHelp': 'Wie Sie es nennen würden: „Transportdokument 0042“, „Analysezertifikat Charge 7“.',
  'app.doc.f.type': 'Art',
  'app.doc.f.issuer': 'Ausgestellt von (optional)',
  'app.doc.f.issuerHelp':
    'So, wie es darauf steht. Das ist Ihre Angabe; sie zeigt nicht, dass die Stelle es ausgestellt hat.',
  'app.doc.f.reference': 'Referenznummer (optional)',
  'app.doc.f.referenceHelp': 'Eine Genehmigungsnummer, eine Rechnungsnummer, eine Charge.',
  'app.doc.f.issued': 'Datum auf dem Dokument (optional)',
  'app.doc.f.about': 'Worum es geht (optional)',
  'app.doc.f.aboutHelp': 'Ihre Datensätze, die es betrifft: ein Analysezertifikat mit der Pflanze, die getestet wurde.',
  'app.doc.f.aboutNone': 'Keine',
  'app.doc.f.holder': 'Gehalten von',
  'app.doc.f.holderHelp': 'Sie oder Ihre Organisation.',
  'app.doc.f.notes': 'Notizen (optional)',
  'app.doc.need.file': 'Fügen Sie zuerst die Datei hinzu.',
  'app.doc.need.title': 'Geben Sie ihm einen Titel.',
  'app.doc.need.holder': 'Geben Sie an, wer es hält.',
  'app.doc.need.heading': 'Das fehlt noch vor dem Versiegeln:',
  'app.doc.seal': 'Versiegeln',
  'app.doc.sealing': 'Wird versiegelt…',
  'app.doc.type.permit': 'Genehmigung oder Lizenz',
  'app.doc.type.certificate-of-analysis': 'Analysezertifikat (COA)',
  'app.doc.type.lab-report': 'Laborbericht',
  'app.doc.type.contract': 'Vertrag oder Vereinbarung',
  'app.doc.type.protocol': 'Protokoll oder SOP',
  'app.doc.type.transport': 'Transport- oder Versanddokument',
  'app.doc.type.invoice': 'Rechnung oder Beleg',
  'app.doc.type.other': 'Etwas anderes',
  'app.doc.kind': 'Dokument',
  'app.doc.homeLine': 'Dokument · {type}',
  'app.doc.k.type': 'Art',
  'app.doc.k.issuer': 'Ausgestellt von (Ihre Angabe)',
  'app.doc.k.issuerHolder': 'Ausgestellt von (Angabe des Inhabers)',
  'app.doc.k.reference': 'Referenz',
  'app.doc.k.issued': 'Datum auf dem Dokument',
  'app.doc.k.files': 'Dateien',
  'app.doc.k.about': 'Betrifft',
  'app.doc.k.holder': 'Gehalten von',
  'app.doc.k.notes': 'Notizen',
  'app.doc.k.sealed': 'Versiegelt (Uhr dieses Geräts)',
  'app.doc.k.dated': 'Datum auf Midnight',
  'app.doc.k.proofCode': 'Prüfcode',
  'app.doc.fileSize': '{size} Byte',
  'app.doc.share.title': 'Belegen, dass Sie diese Datei hatten',
  'app.doc.share.text':
    'Senden Sie die Datei und diesen Link. Der Browser der anderen Person prüft, ob die Datei Byte für Byte eine der hier versiegelten ist und wann sie datiert wurde: Nichts wird hochgeladen, und die Antwort beruht nicht auf dem Wort von VeilCore.',
  'app.doc.share.warn':
    'Der Link zeigt jedem, der ihn hat, alles in diesem Dokument-Datensatz: Titel, Art, Aussteller, Referenz, Datum, Name und SHA-256 jeder Datei, die Namen der Datensätze, die es betrifft, und Ihre Notizen. Nie die Datei selbst.',
  'app.doc.share.copy': 'Link kopieren: belegt, dass Sie diese Datei hatten',
  'app.doc.share.copied': 'Kopiert.',
  'app.doc.compare.title': 'Ist das dieselbe Datei?',
  'app.doc.compare.text':
    'Wählen Sie eine Datei, um sie mit den hier versiegelten zu vergleichen. Sie wird nicht hochgeladen.',
  'app.doc.compare.pick': 'Eine Datei wählen',
  'app.doc.compare.match': '<b>{name}</b> ist Byte für Byte {sealed}, hier versiegelt.',
  'app.doc.compare.noMatch': '<b>{name}</b> ist keine der hier versiegelten Dateien. Nicht ein Byte darf abweichen.',
  'app.doc.compare.tooLarge': 'Diese Datei ist größer als {mb} MB und kann hier nicht gelesen werden.',
  'app.doc.check.title': 'Ein Dokument prüfen',
  'app.doc.check.intro':
    'Jemand hat Ihnen ein Dokument und diesen Link geschickt. Wählen Sie die Datei, die Sie bekommen haben: Ihr Browser berechnet ihren SHA-256 (nichts wird hochgeladen) und prüft sie gegen den versiegelten Datensatz im Link und sein Datum auf Midnight.',
  'app.doc.check.missing': 'In diesem Link ist kein Dokument-Datensatz. Bitten Sie den Absender um den ganzen Link.',
  'app.doc.check.unreadable': 'Dieser Link ist beschädigt. Bitten Sie erneut darum.',
  'app.doc.check.notDoc': 'Was in diesem Link steht, ist kein Dokument-Datensatz, der hier geprüft werden kann.',
  'app.doc.check.recomputed': 'Prüfcode, hier aus dem Link neu berechnet',
  'app.doc.check.notDated':
    'Noch datiert nichts diesen Datensatz, oder der Link wurde verändert. Verlassen Sie sich nicht darauf, bevor ein Datum angezeigt wird.',
  'app.doc.check.what':
    'Was das zeigt: Eine Datei mit genau diesen Bytes war zu diesem Datum in den Händen des Inhabers. Was nicht: dass das Dokument echt ist, dass der Aussteller es ausgestellt hat oder dass stimmt, was darin steht. „Ausgestellt von“ ist die Angabe des Inhabers.',
  'app.doc.check.inLink': 'Im Link (die eigenen Worte des Inhabers)',
  'app.doc.nums.title': 'Die Zahlen darauf (optional)',
  'app.doc.nums.help':
    'Geben Sie sie so ein, wie sie gedruckt sind. Sie werden mit dem Dokument versiegelt, damit Sie später eine davon belegen können, etwa „Gesamt-THC höchstens 0,3 %“, ohne die anderen oder das Zertifikat zu zeigen.',
  'app.doc.nums.which': 'Welche Zahlen',
  'app.doc.nums.none': 'Keine',
  'app.doc.nums.bad': 'Eine Zahl mit höchstens {places} Nachkommastellen, etwa 0,21.',
  'app.doc.need.numbers': 'Eine der Zahlen kann dieses Formular nicht aufnehmen. Korrigieren oder löschen Sie sie.',
  'app.doc.need.aNumber': 'Geben Sie mindestens eine Zahl ein oder wählen Sie „Keine“.',
  'app.doc.schema.potency': 'Cannabinoidgehalt',
  'app.doc.schema.seed-quality': 'Saatgutqualität',
  'app.doc.slot.totalThc': 'Gesamt-THC',
  'app.doc.slot.delta9Thc': 'Delta-9-THC',
  'app.doc.slot.thca': 'THCA',
  'app.doc.slot.totalCbd': 'Gesamt-CBD',
  'app.doc.slot.cbda': 'CBDA',
  'app.doc.slot.cbg': 'CBG',
  'app.doc.slot.totalCannabinoids': 'Cannabinoide gesamt',
  'app.doc.slot.moisture': 'Feuchtigkeit',
  'app.doc.slot.germination': 'Keimfähigkeit',
  'app.doc.slot.pureSeed': 'Reinheit',
  'app.doc.slot.otherCropSeed': 'Fremdkultursamen',
  'app.doc.slot.weedSeed': 'Unkrautsamen',
  'app.doc.slot.inertMatter': 'Inerte Bestandteile',
  'app.doc.nums.heldTitle': 'Seine Zahlen',
  'app.doc.nums.heldText':
    'Mit diesem Dokument versiegelt als {schema}. Nur Sie sehen sie: Der Datensatz enthält einen Code, der sie bindet, nicht die Zahlen.',
  'app.claim.title': 'Eine Zahl belegen',
  'app.claim.text':
    'Belegen Sie jedem eine Tatsache über eine Zahl, ohne sie, die anderen Zahlen oder das Zertifikat zu zeigen. Der Beleg kommt auf Midnight, wo jeder ihn prüfen kann.',
  'app.claim.example':
    'Zum Beispiel: Zeigen Sie einem Käufer, dass der Gesamt-THC-Gehalt höchstens 0,3 % beträgt oder dass eine Charge höchstens 9 blühende Pflanzen hat, ohne ihm die Zahl oder den Rest des Datensatzes zu geben. Sie wählen die Zahl und die Grenze. Er bekommt einen Link, der es prüft.',
  'app.claim.notReady': 'Belege sind auf dieser Website noch nicht eingeschaltet.',
  'app.claim.number': 'Welche Zahl',
  'app.claim.how': 'Was belegt werden soll',
  'app.claim.atMost': 'Sie ist höchstens…',
  'app.claim.atLeast': 'Sie ist mindestens…',
  'app.claim.exactly': 'Sie ist genau diese (zeigt die Zahl)',
  'app.claim.bound': 'Grenze',
  'app.claim.boundBad': 'Eine Zahl mit höchstens {places} Nachkommastellen.',
  'app.claim.wontMeet':
    'Ihre versiegelte Zahl erfüllt das nicht, daher lässt es sich nicht belegen. Es wurde nichts gesendet.',
  'app.claim.exactWarn': 'Damit wird {label}: {value} {unit} für alle sichtbar, dauerhaft.',
  'app.claim.already': 'Über {label} bereits öffentlich: {list}.',
  'app.claim.leak': 'Jede belegte Grenze ist dauerhaft öffentlich, und zusammen grenzen sie die Zahl ein.',
  'app.claim.computer':
    'Der Beleg dauert auf einem Laptop ein bis zwei Minuten und braucht viel Speicher: Nutzen Sie einen Computer. Telefone wurden noch nicht getestet.',
  'app.claim.go': 'Auf Midnight belegen',
  'app.claim.going': 'Wird belegt…',
  'app.claim.done': 'Auf Midnight belegt:',
  'app.claim.copy': 'Den Link kopieren, der das belegt',
  'app.claim.copied': 'Kopiert.',
  'app.claim.made': 'Was Sie belegt haben',
  'app.claim.line.atMost': '{label} ist höchstens {bound} {unit}',
  'app.claim.line.atLeast': '{label} ist mindestens {bound} {unit}',
  'app.claim.line.value': '{label} ist {value} {unit}',
  'app.claim.holderTyped': 'Die Zahlen sind Ihre eigenen Eingaben: Kein Labor hat sie signiert.',
  'app.claim.check.title': 'Einen Beleg prüfen',
  'app.claim.check.intro':
    'Jemand hat Ihnen diesen Link geschickt, um eine Tatsache über eine Zahl in einem versiegelten Dokument zu zeigen, ohne die Zahl oder das Dokument zu zeigen. Diese Seite liest den Beleg auf Midnight und prüft ihn.',
  'app.claim.check.bad': 'Dieser Link ist nicht lesbar. Bitten Sie erneut darum.',
  'app.claim.check.checking': 'Der Beleg wird auf Midnight gelesen…',
  'app.claim.check.okWhen': 'Auf Midnight belegt in Block {block}{date}.',
  'app.claim.check.failed': 'Nicht bestätigt: {reason} Verlassen Sie sich nicht darauf.',
  'app.claim.check.record': 'Der Datensatz, um den es geht',
  'app.claim.check.what':
    'Was das zeigt: Die in diesem Datensatz versiegelte Zahl hält die Grenze ein (oder ist dieser Wert). Was nicht: dass ein Labor sie gemessen hat oder dass das Dokument echt ist; der Inhaber hat die Zahlen eingegeben. Jede belegte Grenze ist öffentlich, und zusammen grenzen sie die Zahl ein.',
  'app.claim.check.schema': 'Unter dem veröffentlichten Formular „{schema}“.',
  // EvidenceBundle.tsx: what differs for a document record.
  'app.doc.bundle.keyIs':
    '(Der Schlüssel des Datensatzes ist die öffentliche Kennung des Schlüssels, der beim Versiegeln für dieses Dokument erstellt wurde. Sein geheimer Teil bleibt in Ihrer Sicherung und kommt nie in das Paket.)',
  'app.doc.bundle.includeFiles':
    'Eine Kopie des Dokuments beilegen. Ohne sie enthält das Paket nur den Code jeder Datei, und wer es prüft, braucht die Datei gesondert von Ihnen.',
  'app.doc.bundle.chooseFiles': 'Datei(en) des Dokuments auswählen',
  'app.doc.bundle.checkedAgainst':
    'Jede wird vor dem Beilegen mit den in diesem Datensatz versiegelten Dateien abgeglichen.',
  'app.doc.bundle.filesAria': 'Dateien des Dokuments',
  'app.doc.bundle.chooseOrUntick': 'Wählen Sie die Datei des Dokuments aus oder entfernen Sie das Häkchen.',
  // ---- kept on this device only (docs/device-only-records.md; DocumentNew.tsx, DocumentDetail.tsx) ----
  'app.doc.local.choice': 'Diesen Datensatz nur auf diesem Gerät und in meiner Sicherung aufbewahren',
  'app.doc.local.before': 'Bevor Sie wählen:',
  'app.doc.local.p1':
    'Nichts, was Sie hier eingeben, wird an VeilCore gesendet, weder verschlossen noch offen. Gesendet wird, damit der Datensatz sein Datum erhält: seine Kennung, sein Prüfcode und seine Schlüsselbindung (ein Code aus dem eigenen Schlüssel des Datensatzes).',
  'app.doc.local.p2':
    'Der Server von VeilCore kann diesen Datensatz nicht zurückgeben: Er hat ihn zu keinem Zeitpunkt.',
  'app.doc.local.p3':
    'Die einzigen Kopien liegen in diesem Browser und in einer Sicherungsdatei, die nach dem Versiegeln gespeichert wurde. Eine früher gespeicherte Sicherung enthält diesen Datensatz nicht, eine Passkey-Kopie enthält ihn in keinem Fall. Gleich nach dem Versiegeln werden Sie gebeten, eine Sicherung zu speichern und zu prüfen.',
  'app.doc.local.p4': 'Wer den Prüflink und die Datei hat, kann ihn weiterhin prüfen.',
  'app.doc.local.p5': 'Das wird einmal gewählt, beim Versiegeln. Danach lässt es sich nicht ändern.',
  'app.doc.local.title': 'Nur auf diesem Gerät aufbewahrt',
  'app.doc.local.text':
    'Nichts, was in diesen Datensatz eingegeben wurde, ging an VeilCore, weder verschlossen noch offen. Die einzigen Kopien liegen in diesem Browser und in der Sicherungsdatei, die Sie geprüft haben. Gehen beide verloren, ist der Datensatz weg: VeilCore kann ihn nicht zurückgeben. Eine Sicherung von vor dem Versiegeln enthält ihn nicht, eine Passkey-Kopie enthält ihn in keinem Fall.',
  'app.doc.local.notBacked':
    'Noch in keiner Sicherung. Die einzige Kopie dieses Datensatzes liegt in diesem Browser: Werden dessen Daten jetzt gelöscht, ist der Datensatz weg, und VeilCore kann ihn nicht zurückgeben. Speichern Sie jetzt Ihre Sicherungsdatei und prüfen Sie sie.',
  'app.doc.local.sent':
    'Was dieses Gerät verlassen hat: die Kennung des Datensatzes, sein Prüfcode und seine Schlüsselbindung, an VeilCore gesendet, um ihn zu datieren. Bei jeder Anfrage erfährt VeilCore Ihre Netzwerkadresse und die Uhrzeit. Wenn Sie eine Passkey-Kopie haben, enthält sie die Kennung und die Schlüssel dieses Datensatzes, verschlossen, auf dem Server von VeilCore; in keinem Fall das, was Sie eingegeben haben.',
  'app.doc.local.stamp':
    'Ob Sie den Schlüssel dieses Datensatzes mit einem Datum stempeln, entscheiden Sie; gestartet wird das nur über die Schaltfläche unten. Tun Sie es, geht ein Code aus dem Schlüssel über den Gebührendienst von VeilCore an Midnight. Nichts von dem, was Sie eingegeben haben, geht mit.',
  'app.doc.local.conflict':
    'Der Server von VeilCore hat mit etwas anderem geantwortet als nur mit dem Prüfcode dieses Datensatzes. Was Sie sehen, ist die eigene Kopie dieses Geräts. Es wird nichts weiter gesendet, und die Antwort des Servers ändert hier nichts.',
  'app.doc.local.homeNotBacked': 'Nur auf diesem Gerät · noch in keiner Sicherung',
  'app.doc.local.backup': 'Sicherung speichern',
  'app.doc.local.homeLine': 'Nur auf diesem Gerät',
  'app.doc.local.staysHere':
    'Dieser Datensatz wird nur auf diesem Gerät aufbewahrt, deshalb gibt es das für ihn nicht.',
  'app.doc.local.delete': 'Von diesem Gerät löschen',
  'app.doc.local.deleteConfirm':
    'Diesen Datensatz von diesem Gerät löschen? Das lässt sich hier nicht rückgängig machen. Eine Sicherungsdatei, die ihn enthält, enthält ihn weiterhin. VeilCore behält, was bereits gesendet wurde: die Kennung, den Prüfcode und die Schlüsselbindung des Datensatzes. Eine Passkey-Kopie, falls Sie eine haben, enthält seine Kennung und seine Schlüssel weiter, bis Sie diese Kopie aktualisieren. Haben Sie seinen Schlüssel mit einem Datum gestempelt, bleibt das auf Midnight. Sein Datum gilt weiter für alle, die den Prüflink haben.',
  'app.doc.local.toRecord': 'Zum Datensatz',
  'app.doc.local.backupNow':
    'Versiegelt. Speichern Sie jetzt eine Sicherung und prüfen Sie sie: Bis dahin liegt die einzige Kopie dieses Datensatzes in diesem Browser.',
  'app.doc.local.backupMissing':
    'Diese Sicherung enthält Ihre Dokumente nicht, die nur auf diesem Gerät aufbewahrt werden. Speichern Sie eine neue und prüfen Sie diese.',
  'app.doc.local.backupFailed':
    'Die Sicherung konnte nicht erstellt werden: Ein Dokument, das nur auf diesem Gerät aufbewahrt wird, ließ sich nicht aufnehmen. Es wurde nichts gespeichert.',
  'app.doc.local.noCorrect':
    'Ein Datensatz, der nur auf diesem Gerät aufbewahrt wird, lässt sich nicht korrigieren. Versiegeln Sie das Dokument erneut als neuen Datensatz.',
  'app.doc.local.unreadable.title': 'Ein Datensatz auf diesem Gerät konnte nicht gelesen werden',
  'app.doc.local.unreadable.text':
    'Der Datensatz {id} wird nur auf diesem Gerät aufbewahrt, und sein Eintrag in diesem Browser ist beschädigt; er kann deshalb nicht angezeigt werden. Er wird nirgendwohin gesendet. Eine jetzt gespeicherte Sicherung enthält den Eintrag genau so, wie er ist. Sie können den Eintrag in einer Datei speichern oder ihn von diesem Gerät löschen.',
  'app.doc.local.unreadable.export': 'Eintrag in einer Datei speichern',
  'app.doc.local.unreadable.delete': 'Von diesem Gerät löschen',
  'app.doc.local.unreadable.deleteConfirm':
    'Diesen beschädigten Eintrag von diesem Gerät löschen? Das lässt sich hier nicht rückgängig machen. Eine Sicherungsdatei, die ihn enthält, enthält ihn weiterhin.',
  'app.doc.local.unreadable.backupNote':
    'Ein Datensatz, der nur auf diesem Gerät aufbewahrt wird, konnte nicht gelesen werden. Diese Sicherung enthält seinen Eintrag genau so, wie er ist; mit der Datei geht also nichts verloren. Alles andere ist wie gewohnt enthalten.',
  // ---- a production chain, and proving a number from a device-only record (docs/document-chain.md) ----
  'app.doc.chain.kind.grow-batch': 'Anbaucharge',
  'app.doc.chain.kind.harvest-lot': 'Erntelos',
  'app.doc.schema.grow-batch': 'Anbaucharge',
  'app.doc.schema.harvest-lot': 'Erntelos',
  'app.doc.slot.plants': 'Pflanzen in dieser Charge am Datum des Datensatzes',
  'app.doc.slot.plantsInFlower': 'Davon Pflanzen in der Blütephase am Datum des Datensatzes',
  'app.doc.slot.areaSquareMetres': 'Anbaufläche (Bodenfläche) dieser Charge, in Quadratmetern',
  'app.doc.slot.plantsHarvested': 'In dieses Los geerntete Pflanzen',
  'app.doc.slot.wetWeightGrams': 'Frischgewicht bei der Ernte, ganze Pflanzen wie geschnitten, in Gramm',
  'app.doc.slot.dryWeightGrams': 'Trockengewicht des Loses wie eingelagert, in Gramm',
  'app.doc.chain.start.title': 'Eine Produktionskette festhalten?',
  'app.doc.chain.start.text':
    'Versiegeln Sie jeden Schritt als eigenen Datensatz, der den vorherigen nennt: die Ausgangspflanze oder den Stamm, eine Anbaucharge, ein Erntelos, den Laborbericht. Jeder erhält sein eigenes Datum.',
  'app.doc.chain.start.plain': 'Ein anderes Dokument',
  'app.doc.chain.f.titleHelp':
    'Optional. Bleibt er leer, besteht er aus Art und Kennung. Keine Stückzahlen oder Gewichte hineinschreiben.',
  'app.doc.chain.f.reference.grow-batch': 'Chargenkennung',
  'app.doc.chain.f.reference.harvest-lot': 'Loskennung',
  'app.doc.chain.f.referenceHelp': 'So, wie Sie sie in Ihren eigenen Unterlagen schreiben.',
  'app.doc.chain.f.site': 'Standortbezeichnung (optional)',
  'app.doc.chain.f.siteHelp':
    'Ihre eigene Bezeichnung für einen Raum, ein Feld oder eine Anlage. Sie kommt in die Notizen.',
  'app.doc.chain.f.variety': 'Sorte (optional)',
  'app.doc.chain.f.varietyHelp': 'Sie kommt in die Notizen.',
  'app.doc.chain.f.numbers': 'Seine Zahlen',
  'app.doc.chain.f.numbersHelp':
    'Stückzahlen und Gewichte gehören hierher und nirgendwo sonst: Wiederholen Sie sie nicht im Titel oder in den Notizen. Sie werden so versiegelt, wie Sie sie eingeben, nicht wie jemand sie gemessen hat. So können Sie später eine davon belegen, etwa „höchstens 100 Pflanzen“, ohne die anderen zu zeigen.',
  'app.doc.chain.note.site': 'Standort',
  'app.doc.chain.note.variety': 'Sorte',
  'app.doc.chain.titleFor.grow-batch': 'Anbaucharge {id}',
  'app.doc.chain.titleFor.harvest-lot': 'Erntelos {id}',
  'app.doc.chain.need.reference': 'Geben Sie die Chargen- oder Loskennung an.',
  'app.doc.chain.need.aNumber': 'Geben Sie mindestens eine Zahl ein.',
  'app.doc.chain.sheet.title': 'Keine Datei dazu?',
  'app.doc.chain.sheet.text':
    'Ein Datensatz braucht eine Datei. Ihr eigenes Chargenblatt ist die bessere Wahl: Es datiert ein Arbeitsdokument, das Sie ohnehin führen. Wenn Sie keines haben, entsteht hier ein Blatt in reinem Text aus Kennung, Datum, Standort, Sorte, Inhaber und „Betrifft“ von oben, ohne Stückzahlen und Gewichte, und wird auf diesem Gerät gespeichert. Füllen Sie diese Felder zuerst aus.',
  'app.doc.chain.sheet.make': 'Blatt aus meinen Eingaben erstellen',
  'app.doc.chain.sheet.made':
    'Erstellt und gespeichert als {name}. Bewahren Sie diese Datei auf: Sie wird gebraucht, um den Datensatz zu prüfen, und muss Byte für Byte gleich bleiben. Wenn Sie Ihre Eingaben oben ändern, ändert sich das Blatt nicht mit.',
  'app.doc.chain.aboutHelp':
    'Ihre Datensätze, die es betrifft: ein Analysezertifikat mit der getesteten Pflanze, ein Erntelos mit seiner Anbaucharge. Das ist Ihre Angabe. Nichts gleicht sie mit dem gewählten Datensatz ab.',
  'app.doc.chain.aboutNote':
    '„Betrifft“ ist die eigene Angabe des Inhabers, mit diesem Datensatz versiegelt. Weder VeilCore noch Midnight gleicht sie mit dem genannten Datensatz ab. Eine Kette von Datensätzen ist nur so stark wie das eigene Datum und der eigene Prüfcode jedes Datensatzes.',
  'app.doc.chain.carried':
    'Die hier verlinkten Datensätze kamen mit diesem Link, von der Person, die ihn gesendet hat. Der versiegelte Datensatz nennt jeden nur mit seiner Kennung; nichts hier zeigt also, dass ein verlinkter Datensatz der genannte ist.',
  'app.doc.chain.idOnly':
    'Wo dieser Link nur die Kennung eines Datensatzes enthält, zeigt dessen Seite, was das Register von VeilCore zu dieser Kennung meldet, ohne Häkchen. Für ein geprüftes Datum bitten Sie den Inhaber um den eigenen Prüflink dieses Datensatzes.',
  'app.doc.chain.namedAs':
    'Sie haben dies von einem anderen Datensatz aus geöffnet, der es als Datensatz {id} nennt. Nichts im Link bindet diese Kennung an den Prüfcode dieses Datensatzes.',
  'app.doc.chain.askRegistry': 'Ansehen, was das Register von VeilCore zu Datensatz {id} meldet',
  'app.doc.chain.askRegistrySends':
    'Diese Seite sendet die Kennung des Datensatzes an das Register von VeilCore und, in ihrer Adresse, diesen Prüfcode an den Host der Website. Sonst nichts aus diesem Link.',
  'app.doc.chain.next.title': 'Der nächste Schritt der Kette',
  'app.doc.chain.next.text':
    'Versiegeln Sie den nächsten Schritt als eigenen Datensatz, der diesen betrifft. Er erhält sein eigenes Datum.',
  'app.doc.chain.next.grow-batch': 'Eine Anbaucharge hieraus festhalten',
  'app.doc.chain.next.harvest-lot': 'Das zugehörige Erntelos festhalten',
  'app.doc.chain.next.report': 'Den zugehörigen Laborbericht versiegeln',
  'app.doc.chain.title': 'Seine Kette, auf diesem Gerät',
  'app.doc.chain.text':
    'Hier aus den Datensätzen ermittelt, die dieser Browser hält, auch aus denen, die nur auf diesem Gerät aufbewahrt werden. VeilCore wird dafür nichts gefragt, und ein Datensatz, der anderswo liegt, erscheint nicht.',
  'app.doc.chain.up': 'Was dies betrifft',
  'app.doc.chain.down': 'Datensätze, die diesen betreffen',
  'app.doc.chain.none': 'Keine auf diesem Gerät.',
  'app.doc.chain.notHeld': '{name} (nicht auf diesem Gerät)',
  'app.doc.chain.share.title': 'Mit seiner Kette senden',
  'app.doc.chain.share.text':
    'Dieser Link enthält auch die Datensätze, die dieser betrifft, und die, die jene betreffen. Wer ihn prüft, kann so jeden öffnen und sein Datum sehen.',
  'app.doc.chain.share.warn':
    'Wer diesen Link hat, sieht auch alles in jedem dieser Dokument-Datensätze, so wie der Link oben diesen zeigt: {list}. Von einem Datensatz, der kein Dokument ist, enthält er nur die Kennung und den Prüfcode.',
  'app.doc.chain.share.copy': 'Link mit seiner Kette kopieren',
  'app.doc.chain.share.copied': 'Kopiert.',
  'app.doc.local.p6':
    'Wenn es Zahlen hat, können Sie später wählen, eine zu belegen. Das veröffentlicht eine Tatsache über die Zahl auf Midnight, über den Gebührendienst von VeilCore, und nur, wenn Sie es für diesen Datensatz einschalten.',
  'app.doc.local.prove.off':
    'Das Belegen einer Zahl ist für einen Datensatz, der nur auf diesem Gerät aufbewahrt wird, nicht eingeschaltet.',
  'app.doc.local.prove.title': 'Eine Zahl belegen: Ihre Wahl',
  'app.doc.local.prove.text':
    'Aus, solange Sie es hier nicht einschalten. Ein Beleg veröffentlicht dauerhaft eine Tatsache über eine Zahl auf Midnight, über den Gebührendienst von VeilCore. An das Register von VeilCore wird nichts gesendet. Bevor etwas belegt wird, sehen Sie genau, was veröffentlicht würde.',
  'app.doc.local.prove.choice': '„Eine Zahl belegen“ für diesen Datensatz anzeigen',
  'app.doc.local.prove.publish.title': 'Was veröffentlicht wird, wenn Sie fortfahren',
  'app.doc.local.prove.publish.range':
    'Auf Midnight, öffentlich und dauerhaft: das Formular „{schema}“, das Feld „{label}“, die Grenze {bound} und die Richtung ({direction}), mit einem Code, der für diesen Datensatz steht. Die Zahl selbst wird nicht veröffentlicht. Jede belegte Grenze grenzt sie weiter ein.',
  'app.doc.local.prove.publish.exact':
    'Auf Midnight, öffentlich und dauerhaft: das Formular „{schema}“, das Feld „{label}“ und die Zahl selbst, {value}, mit einem Code, der für diesen Datensatz steht.',
  'app.doc.local.prove.publish.noBound': 'Geben Sie eine Grenze ein, um genau zu sehen, was veröffentlicht würde.',
  'app.doc.local.prove.publish.route':
    'Es geht von diesem Browser über den Gebührendienst von VeilCore an Midnight; der Dienst sieht, was veröffentlicht wird, und Ihre Netzwerkadresse. An das Register von VeilCore wird nichts gesendet. Die Zahl ist Ihre Eingabe, nicht der Messwert eines Labors.',
  'app.doc.local.prove.direction.atMost': 'höchstens',
  'app.doc.local.prove.direction.atLeast': 'mindestens',
  'app.doc.local.prove.confirmExact': 'Ja, die Zahl selbst veröffentlichen: {value}, auf Midnight, dauerhaft.',
  'app.doc.local.textProved':
    'Nichts, was in diesen Datensatz eingegeben wurde, ging an das Register von VeilCore, weder verschlossen noch offen. Was Sie über seine Zahlen belegt haben, ist auf Midnight öffentlich. Die einzigen Kopien des Datensatzes liegen in diesem Browser und in der Sicherungsdatei, die Sie geprüft haben. Gehen beide verloren, ist der Datensatz weg: VeilCore kann ihn nicht zurückgeben. Eine Sicherung von vor dem Versiegeln enthält ihn nicht, eine Passkey-Kopie enthält ihn in keinem Fall.',
  'app.doc.local.proved':
    'Sie haben gewählt, Tatsachen über die Zahlen dieses Datensatzes zu belegen. Sie gingen über den Gebührendienst von VeilCore an Midnight und sind dauerhaft öffentlich; sie stehen unten. Nichts, was in diesen Datensatz eingegeben wurde, ging an das Register von VeilCore.',
  'app.claim.tie':
    'Was Sie belegen, ist auf Midnight so öffentlich, dass VeilCore und jeder, der den Prüflink dieses Datensatzes hat, es diesem Datensatz zuordnen kann. VeilCore kann es außerdem dem Inhaberschlüssel zuordnen, der den Datensatz datiert hat.',
  'app.doc.local.aboutStaysHere':
    'Dieser Datensatz nennt einen Datensatz, der nur auf diesem Gerät aufbewahrt wird, und muss deshalb selbst nur auf diesem Gerät aufbewahrt werden. Sonst gingen Name und Kennung jenes Datensatzes in der verschlossenen Kopie dieses Datensatzes an VeilCore. Nichts wurde gespeichert oder gesendet.',
  'app.doc.chain.aboutLocalOnly':
    'Ein Datensatz, der nur auf diesem Gerät aufbewahrt wird, lässt sich nur wählen, wenn auch dieser Datensatz nur auf diesem Gerät aufbewahrt wird (das Kästchen unten). Was ein Datensatz betrifft, wird in seiner verschlossenen Kopie versiegelt; ein gewöhnlicher Datensatz würde also Name und Kennung jenes Datensatzes an VeilCore senden.',
  'app.doc.check.tooLarge':
    'Dieser Link enthält mehr, als ein Prüflink enthalten kann. Bitten Sie den Absender um den eigenen Link jedes Datensatzes.',
  'app.doc.chain.share.warnLocal':
    'Nichts, was in einen nur auf diesem Gerät aufbewahrten Datensatz eingegeben wurde, ging je an das Register von VeilCore. Wenn Sie diesen Link kopieren, geben Sie die Eingaben jedes solchen Datensatzes, den er enthält (oben markiert, und dieser Datensatz, falls er einer ist), an jeden weiter, der den Link erhält.',
  'app.doc.chain.aboutHolderNote':
    'Wenn Sie einen dieser Links öffnen, wird das Register von VeilCore von Ihrer Netzwerkadresse aus nach der Kennung dieses Datensatzes gefragt. Bei einem Datensatz, der nur auf diesem Gerät aufbewahrt wird, erfährt das Register damit eines mehr: dass dieser Browser ihn nachgeschlagen hat.',
} satisfies Partial<AppTranslation>;
