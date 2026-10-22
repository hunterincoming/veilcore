// A strain or line record's sentences: each is this language's plant sentence for the same key,
// the plant noun replaced by one of the same gender (de Linie, es cepa, fr souche, ja 系統).
// DRAFT: to be checked by a fluent speaker before publishing (docs/translations/README.md).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const strain = {
  'app.strain.v.app.verify.noParents': 'Keine Eltern erfasst.',
  'app.strain.v.app.plant.fix.name': 'Name der Linie',
  'app.strain.v.app.plant.fix.bredBy': 'Erzeugt oder isoliert von',
  'app.strain.v.app.verify.namePublished': 'Name, den der Inhaber zeigt: ',
  'app.strain.v.app.verify.nameMatches': 'Name stimmt mit dem Datensatz überein: ',
  'app.strain.v.app.verify.nameUnchecked': 'Name in diesem Link (nicht geprüft): ',
  'app.strain.v.app.log.reportIntro':
    '<b>Optional.</b> Haben Sie schon einen DNA-Bericht zu dieser Linie? Er verknüpft Ihren Datensatz mit der tatsächlichen Linie. Fügen Sie ihn jetzt hinzu, dann wird er beim Datensatz aufbewahrt. Noch kein Bericht? Überspringen Sie den Schritt: Die Seite der Linie zeigt, wie Sie einen bekommen.',
  'app.strain.v.app.log.sealingPlant': 'Ihre Linie wird versiegelt…',
  'app.strain.v.app.log.sealStampsKey':
    'Beim Versiegeln bekommt auch der Schlüssel Ihrer Linie einen Datumsstempel, damit Sie später nachweisen können, dass Sie ihn halten. Nur ein Code des Schlüssels wird gesendet.',
  'app.strain.v.app.log.publicStampLater':
    'Den öffentlichen Datumsstempel bekommt sie, wenn ihr Stapel auf {datedOn} datiert wird. Die Seite Ihrer Linie zeigt, wann das geschehen ist. Sie müssen nichts tun.',
  'app.strain.v.app.log.publicDateLater':
    'Das öffentliche Datum kommt, wenn ihr Stapel auf {datedOn} datiert wird. Die Seite Ihrer Linie zeigt es dann.',
  'app.strain.v.app.log.keyStampedAt':
    'Schlüssel mit Datumsstempel: {when}. Auch der Schlüssel Ihrer Linie ist datiert, damit Sie später nachweisen können, dass Sie ihn halten.{bound} Über die Linie wurde nichts gesendet.',
  'app.strain.v.app.log.keyStamped':
    'Schlüssel mit Datumsstempel versehen. Auch der Schlüssel Ihrer Linie ist datiert, damit Sie später nachweisen können, dass Sie ihn halten.{bound} Über die Linie wurde nichts gesendet.',
  'app.strain.v.app.log.stampingTitle': 'Versiegelt. Der Schlüssel Ihrer Linie bekommt den Datumsstempel…',
  'app.strain.v.app.log.onlyFingerprint':
    'Gesendet wird nur ein Code des Schlüssels Ihrer Linie, nichts über die Linie. Kostenlos: VeilCore zahlt die Netzwerkgebühr.',
  'app.strain.v.app.log.stampingAria': 'Der Schlüssel Ihrer Linie bekommt den Datumsstempel',
  'app.strain.v.app.log.keepOpen':
    'Lassen Sie diese Seite etwa eine Minute offen. Wenn sie sich schließt, geht nichts verloren: Ihre Linie ist gespeichert, und ihre Seite bietet den Datumsstempel erneut an.',
  'app.strain.v.app.chain.stampMayHaveGoneOut':
    'Ihr Datumsstempel wurde möglicherweise schon gesendet{tx}. Ihre Linie ist gespeichert. Versuchen Sie es erst wieder, wenn diese Transaktion im Netzwerk geprüft wurde.',
  'app.strain.v.app.chain.stampUnreachable':
    'Das Netzwerk war nicht erreichbar. Ihre Linie ist gespeichert. Versuchen Sie es {when} erneut oder setzen Sie den Datumsstempel später.',
  'app.strain.v.app.chain.stampDidntGoThrough':
    'Der Datumsstempel hat nicht geklappt. Ihre Linie ist gespeichert. Versuchen Sie es {when} erneut oder setzen Sie den Datumsstempel später.',
  'app.strain.v.app.pair.noPlant': 'Die Linie, bei der gespeichert werden soll, wurde nicht gefunden.',
  'app.strain.v.app.pair.savedTitle': 'DNA-Bericht bei dieser Linie gespeichert',
  'app.strain.v.app.pair.noLabMatch':
    'Keine Laborsignatur bei dieser Linie passt zu dieser Datei, daher bleibt sie Ihre eigene Angabe.',
  'app.strain.v.app.pair.saved':
    'Gespeichert. Der Code Ihres DNA-Berichts ist mit dem Datensatz dieser Linie gespeichert, als Ihre Angabe, dass dieser Bericht zu ihr gehört. Das ist keine Prüfung der Genetik. {dated}',
  'app.strain.v.app.pair.title': 'Ihren DNA-Bericht bei dieser Linie speichern',
  'app.strain.v.app.pair.intro':
    'Haben Sie Ihren DNA-Bericht zurück? Speichern Sie ihn bei dieser Linie. Er verknüpft Ihren Datensatz mit der tatsächlichen Linie: Ein neuer Test kann später damit verglichen werden.',
  'app.strain.v.app.pair.savingTo': 'Speichern bei: <b>{name}</b> · hergestellt oder isoliert von {by}',
  'app.strain.v.app.pair.replaces':
    '<b>Bei dieser Linie ist schon ein DNA-Bericht gespeichert: „{name}“{saved}.</b> Wenn Sie diesen speichern, ersetzt er ihn. Ihre Linienseite, ihr Zertifikat und Links, die Sie teilen, zeigen den neuen, nicht den alten. Auf Ihrem Gerät wird nichts gelöscht.',
  'app.strain.v.app.pair.replacesChain':
    '<b>Bei dieser Linie ist schon ein DNA-Bericht gespeichert: „{name}“{saved}.</b> Wenn Sie diesen speichern, ersetzt er ihn. Ihre Linienseite, ihr Zertifikat und Links, die Sie teilen, zeigen den neuen, nicht den alten. Auf Ihrem Gerät wird nichts gelöscht. Wenn Sie die alte Kopplung im Netzwerk datiert haben, bleibt dieses Datum dort.',
  'app.strain.v.app.pair.chain.stampFirst':
    'Setzen Sie zuerst den Datumsstempel Ihrer Linie (auf ihrer Seite), wenn Sie diesen Laborbericht auch im Netzwerk datieren möchten.',
  'app.strain.v.app.plant.notHereText':
    'Wenn Sie ihn in einem anderen Browser versiegelt haben, speichern Sie dort eine Sicherungskopie und öffnen Sie sie hier (Linien zurückholen). Wenn es der Datensatz einer anderen Person ist, öffnen Sie stattdessen den Prüflink, den sie Ihnen gegeben hat.',
  'app.strain.v.app.plant.bredByName': 'Erzeugt oder isoliert von {name}',
  'app.strain.v.app.plant.action.saveReport': 'Einen DNA-Bericht bei dieser Linie speichern',
  'app.strain.v.app.plant.f.reportSaved': 'bei dieser Linie gespeichert ({file}) · Code der Kopplung {fp}{sha}',
  'app.strain.v.app.plant.backToPlant': 'Zurück zur Linie',
  'app.strain.v.app.plant.tie.tied': 'Mit der Linie verknüpft',
  'app.strain.v.app.plant.tie.notYet': 'Noch nicht mit der Linie verknüpft',
  'app.strain.v.app.plant.tie.notNow': 'Nicht mehr mit der Linie verknüpft',
  'app.strain.v.app.plant.tie.openedNotSaved': 'ein Laborbericht ist geöffnet, aber nicht bei dieser Linie gespeichert',
  'app.strain.v.app.plant.tie.sentence': 'Mit der Linie verknüpft: {what}, {date}.',
  'app.strain.v.app.plant.tie.sentenceNoDate': 'Mit der Linie verknüpft: {what}.',
  'app.strain.v.app.plant.tie.sentenceNone': 'Noch nicht mit der Linie verknüpft: {what}.',
  'app.strain.v.app.plant.tie.sentenceNot': 'Nicht mehr mit der Linie verknüpft: {what}.',
  'app.strain.v.app.plant.tie.means':
    'Mit einem DNA-Bericht kann ein Labor einen neuen Test einer Linie damit vergleichen. Allein zeigt er nicht, dass eine Linie übereinstimmt.',
  'app.strain.v.app.plant.tie.sub': 'Bericht {date}. Ein Labor kann einen neuen Test der Linie damit vergleichen.',
  'app.strain.v.app.plant.tie.why':
    'Ein DNA-Bericht Ihres Labors ist das, was einen Datensatz mit der Linie selbst verknüpft.',
  'app.strain.v.app.plant.savedToPlant': 'bei dieser Linie gespeichert',
  'app.strain.v.app.plant.openedNotSaved': 'geöffnet, nicht bei dieser Linie gespeichert',
  'app.strain.v.app.plant.keyStampLine':
    'Schlüssel mit Datumsstempel: {when}. Der Schlüssel Ihrer Linie ist auch datiert, sodass Sie später beweisen können, dass Sie sie halten.',
  'app.strain.v.app.plant.next.backup.why':
    'Die Schlüssel dieser Linie sind gerade nur auf diesem Gerät. Wenn es kaputtgeht oder der Browser geleert wird, kann niemand beweisen, dass Sie sie halten. Das Speichern dauert eine Minute.',
  'app.strain.v.app.plant.next.corrected.why':
    'Das Labor hat den bei dieser Linie gespeicherten DNA-Bericht ersetzt. Bis Sie den korrigierten speichern, sagen Ihre Linienseite, Ihr Zertifikat und Ihre Links, dass der gespeicherte ersetzt wurde.',
  'app.strain.v.app.plant.next.labWithdrew.whyNewer':
    'Er bleibt bei dieser Linie gespeichert, und Ihr Zertifikat und Ihre Links sagen, dass er zurückgezogen wurde. Ein neuerer Laborbericht ist da: Öffnen Sie ihn und speichern Sie stattdessen diesen.',
  'app.strain.v.app.plant.next.labWithdrew.why':
    'Er bleibt bei dieser Linie gespeichert, und Ihr Zertifikat und Ihre Links sagen, dass er zurückgezogen wurde. Bitten Sie das Labor um einen neuen.',
  'app.strain.v.app.plant.next.open.why':
    'Er ist mit dem Schlüssel dieser Linie so verschlossen, dass nur Sie ihn öffnen können. Beim Öffnen wird hier die Signatur des Labors geprüft.',
  'app.strain.v.app.plant.next.sample.whySaved':
    'Sie haben einen DNA-Bericht bei dieser Linie gespeichert; das ist Ihre eigene Angabe. Wenn ein Labor signiert, dass es eine Probe erhalten hat, kommt eine zweite Partei hinzu, und das ist ein stärkerer Nachweis als Ihre Angabe allein.',
  'app.strain.v.app.plant.next.sample.why':
    'Im Moment ist dieser Datensatz Ihre eigene Darstellung der Linie. Wenn ein Labor signiert, dass es eine Probe erhalten hat, und einen Laborbericht zurücksendet, wird daraus ein stärkerer Nachweis als Ihre eigene Darstellung.',
  'app.strain.v.app.plant.next.dna.title': 'Einen DNA-Bericht für diese Linie bekommen',
  'app.strain.v.app.plant.next.dna.why':
    'Ein datierter Datensatz zeigt, dass eine Beschreibung existierte. Ein DNA-Bericht (der DNA-Fingerabdruck der Linie von einem Labor) verknüpft Ihren Datensatz mit der tatsächlichen Linie. Zwei Wege, einen zu bekommen:',
  'app.strain.v.app.plant.next.dna.haveText':
    'Speichern Sie ihn bei dieser Linie. Er wird auf Ihrem Gerät gelesen; die Datei wird nie hochgeladen.',
  'app.strain.v.app.plant.next.date.why':
    'Er ist bei dieser Linie gespeichert, aber noch datiert ihn nichts. Ihn zu datieren zeigt, dass der Bericht zu diesem Datum existierte, ohne jemandem die Marker zu zeigen.',
  'app.strain.v.app.plant.next.save.title': 'Den DNA-Bericht bei dieser Linie speichern',
  'app.strain.v.app.plant.next.save.why':
    'Ein Labor hat signiert, dass es eine Probe erhalten hat. Wenn sein DNA-Bericht zurückkommt, speichern Sie ihn bei dieser Linie: Das verknüpft Ihren Datensatz mit der Linie, damit ein späterer Test damit verglichen werden kann.',
  'app.strain.v.app.plant.next.save.action': 'Bei dieser Linie speichern',
  'app.strain.v.app.plant.next.ready.why':
    'Ein Labor hat signiert, dass es eine Probe erhalten hat, und ein DNA-Bericht ist bei dieser Linie gespeichert. Sie können Material weitergeben oder es lizenzieren, mit Bedingungen, die für aus diesem Datensatz angegebene Nachkommen gelten.',
  'app.strain.v.app.plant.tree.none':
    'Noch keine Abstammung erfasst. Fügen Sie beim Erfassen Elternstämme hinzu, um den Stammbaum aufzubauen.',
  'app.strain.v.app.plant.anchor.keysNotHere':
    'Der Schlüssel dieser Linie ist nicht in diesem Browser. Holen Sie ihn aus Ihrer Sicherungsdatei zurück: Ein neuer Schlüssel würde nicht zum versiegelten Datensatz passen.',
  'app.strain.v.app.plant.bundle.keyIs':
    '(Der Schlüssel des Datensatzes ist die öffentliche ID des Schlüssels, der beim Versiegeln für diese Linie erstellt wurde. Sein geheimer Teil bleibt in Ihrer Sicherungskopie und kommt nie in das Paket.)',
  'app.strain.v.app.plant.bundle.checkedAgainst':
    'Sie wird vor dem Beifügen mit der bei dieser Linie gespeicherten abgeglichen.',
  'app.strain.v.app.plant.cert.intro':
    'Für Ihre Unterlagen und Ihre Anwältin oder Ihren Anwalt: der versiegelte Datensatz, eine frische Prüfung, dass er sich nicht geändert hat, ob er verankert ist, ob ein DNA-Bericht ihn mit der Linie verknüpft, eine Empfangsbestätigung eines Labors und aktive Lizenzen. Es enthält die Details des Datensatzes, aber keine genetischen Daten oder Labordateien. Der QR-Code öffnet die öffentliche Prüfseite des Datensatzes.',
  'app.strain.v.app.plant.att.noReceipt':
    'Noch hat kein Labor eine Empfangsbestätigung für diese Linie signiert. Ein Datensatz, für den nur Sie einstehen, ist ein schwächerer Nachweis als einer, den ein Labor signiert. Senden Sie eine Probe an ein Labor: Seine Empfangsbestätigung wird mit seinem Schlüssel signiert, nicht mit Ihrem.',
  'app.strain.v.app.verify.field.parent-names': 'Elternlinien (Namen und Hinterlegungsnummern)',
  'app.strain.v.app.verify.alwaysShown':
    'Immer angezeigt: die Datensatz-ID, sein Prüfcode ({fp}), wann das Register ihn zuerst gespeichert hat, und was diese Seite über seinen Stapel und signierte Bestätigungen (eine Empfangsbestätigung eines Labors, einen Laborbericht) prüfen konnte. Der Name nur, wenn der Link ihn trägt (Ihre Links tun das nur, wenn Sie es einschalten) oder Sie ihn zeigen möchten.',
  'app.strain.v.app.verify.ownReceiptTail':
    ' Sie sehen das, weil die Linie in diesem Browser ist; wer Ihren Link erhält, sieht nur die Signaturzeile oben.',
  'app.strain.v.app.prove.openCheckPage': 'Die Prüfseite der Linie öffnen',
  'app.strain.v.app.prove.doneText':
    'Die Antwort erscheint auf der Seite des Anfragenden. Über die Linie wurde nichts gesendet: nur der Beweis, dass Sie ihren Datensatz halten.',
  'app.strain.v.app.prove.thePlant': 'die Linie',
  'app.strain.v.app.prove.thisPlant': 'diese Linie',
  'app.strain.v.app.prove.whatSends':
    '<b>Was gesendet wird:</b> nur der Beweis, dass Sie den Datensatz dieser Linie halten, im Testnetzwerk. Kein Name, keine Genetik, nichts über Ihre anderen Linien.',
  'app.strain.v.app.prove.answering':
    'Wenn Sie antworten, erfährt die Person, die Ihnen diesen Link gesendet hat, dass Sie den Datensatz dieser Linie halten.',
  'app.strain.v.app.prove.watch.notWho':
    'Es zeigt nicht, wer die Person ist oder wer die Linie hergestellt oder isoliert hat.',
  'app.strain.v.app.prove.watch.holderStatement':
    'Dass dieser Schlüssel zum Datensatz dieser Linie gehört, ist vorerst die Angabe des Inhabers. Es zeigt nicht, wer die Person ist oder wer die Linie hergestellt oder isoliert hat.',
  'app.strain.v.app.prove.watch.stampedYour':
    'Der Schlüssel Ihrer Linie erhielt am {when} einen Datumsstempel. Das datiert den Schlüssel, nicht den Datensatz.',
  'app.strain.v.app.prove.watch.stampedThisEarlier':
    'Der Schlüssel dieser Linie erhielt schon früher einen Datumsstempel im Netzwerk. Das datiert den Schlüssel, nicht den Datensatz.',
  'app.strain.v.app.prove.own.title': 'Beweisen Sie, dass Sie den Schlüssel dieser Linie halten (Testnetzwerk)',
  'app.strain.v.app.prove.own.stampFirst':
    'Richten Sie zuerst den Nachweis ein: Tippen Sie auf der Seite der Linie auf „Nachweis einrichten, dass Sie ihn halten“. Der Beweis betrifft die On-Chain-Identität der Linie, die dieser Schritt erzeugt.',
  'app.strain.v.app.lab.sentence.none': 'Bei dieser Linie ist kein DNA-Bericht gespeichert.',
  'app.strain.v.app.lab.sentence.self':
    'Bei dieser Linie ist eine Datei eines DNA-Berichts gespeichert. Keine Laborsignatur passt dazu, daher ist sie die eigene Angabe des Inhabers.',
  'app.strain.v.app.lab.sentence.replaced':
    'Der bei dieser Linie gespeicherte DNA-Bericht wurde vom Labor{on} durch einen korrigierten ersetzt. {tail}',
  'app.strain.v.app.lab.sentence.withdrawn':
    'Der bei dieser Linie gespeicherte DNA-Bericht wurde vom Labor{on} zurückgezogen. {tail}',
  'app.strain.v.app.lab.results.replacedNewer':
    '<b>Der bei dieser Linie gespeicherte DNA-Bericht wurde vom Labor ersetzt.</b> Speichern Sie den korrigierten: Öffnen Sie ihn und tippen Sie dann auf „Bei dieser Linie speichern“.',
  'app.strain.v.app.lab.results.replacedNone':
    '<b>Der bei dieser Linie gespeicherte DNA-Bericht wurde vom Labor ersetzt.</b> Kein aktueller Bericht von {lab}: Das Original wurde ersetzt und die Korrektur zurückgezogen.',
  'app.strain.v.app.lab.results.withdrawn':
    '<b>Der bei dieser Linie gespeicherte Laborbericht wurde vom Labor zurückgezogen.</b> Er bleibt gespeichert, bis Sie einen anderen speichern, und Ihr Zertifikat und Ihre Links sagen, dass er zurückgezogen wurde.',
  'app.strain.v.app.lab.results.withdrawnNewer':
    '<b>Der bei dieser Linie gespeicherte Laborbericht wurde vom Labor zurückgezogen.</b> Er bleibt gespeichert, bis Sie einen anderen speichern, und Ihr Zertifikat und Ihre Links sagen, dass er zurückgezogen wurde. Ein neuerer Laborbericht ist da: Öffnen Sie ihn und speichern Sie ihn dann bei dieser Linie.',
  'app.strain.v.app.lab.results.locked':
    'So verschlossen, dass nur Sie sie öffnen können, mit dem Schlüssel dieser Linie aus Ihrer Sicherungskopie. VeilCore speichert sie verschlossen und hat den Schlüssel nicht.',
  'app.strain.v.app.lab.results.noKey':
    'Der Schlüssel dieser Linie ist nicht auf diesem Gerät, daher können ihre Laborberichte hier nicht geöffnet werden. <link>Holen Sie Ihre Linien zuerst aus Ihrer Sicherungskopie zurück</link>.',
  'app.strain.v.app.lab.results.whatOthersSee':
    '<b>Was andere sehen können.</b> Die Signatur des Labors ist öffentlich, der Bericht nicht. Wer einen Link zur Prüfseite dieser Linie hat, sieht, dass ein Laborbericht über sie signiert wurde, den SHA-256 der Berichtsdatei und den Namen, unter dem der Schlüssel des Labors registriert ist: markiert mit „Name nicht geprüft“, sofern der Betreiber von VeilCore ihn nicht mit einem öffentlichen Lizenz- oder Akkreditierungsverzeichnis abgeglichen hat. Wenn Sie den Bericht bei dieser Linie speichern und unter „Jemandem zeigen“ „Ob ein DNA-Bericht gespeichert ist“ teilen, sieht man auch, dass die gespeicherte Datei dazu passt.',
  'app.strain.v.app.lab.results.nothingYet':
    'Noch nichts. Wenn ein Labor, an das Sie diese Linie gesendet haben, einen Laborbericht sendet, erscheint er hier.',
  'app.strain.v.app.lab.results.savedHere': ' · bei dieser Linie gespeichert',
  'app.strain.v.app.lab.results.stillSaved': '. Er ist weiterhin bei dieser Linie gespeichert.',
  'app.strain.v.app.lab.results.replacesSaved':
    'Bei dieser Linie ist schon ein Laborbericht gespeichert. Wenn Sie diesen speichern, ersetzt er ihn; Sie bestätigen auf dem nächsten Bildschirm.',
  'app.strain.v.app.lab.send.nothingYet':
    'Noch hat sich nichts geändert. Die Seite Ihrer Linie zeigt „wartet“, bis der Code eingegeben wird, und kann diesen Code erneut anzeigen. Er wird in das Feld auf der Startseite von VeilCore eingefügt.',
  'app.strain.v.app.lab.send.takenFromHelp': 'Die Mutterlinie oder ihr Standortschild.',
  // What a strain is made by, not bred by (strain-words.test).
  'app.strain.v.app.plant.f.method': 'Herstellungsweg',
  'app.strain.v.app.plant.f.statedDate': 'Angegebenes Herstellungs- oder Isolierungsdatum (Angabe des Inhabers)',
  'app.strain.v.app.plant.fix.field.cultivarName': 'Name des Stammes',
  'app.strain.v.app.plant.fix.field.breederName': 'hergestellt oder isoliert von',
  'app.strain.v.app.plant.fix.field.breedingMethod': 'Herstellungsweg',
  'app.strain.v.app.verify.field.breeding-method': 'Herstellungsweg',
  'app.strain.v.app.verify.field.bred-by': 'Hergestellt oder isoliert von',
  'app.strain.v.app.verify.method': 'Herstellungsweg laut Inhaber: {method}',
  'app.strain.v.app.verify.noMethod': 'Kein Herstellungsweg erfasst.',
  'app.strain.v.app.verify.bredByShared': 'Hergestellt oder isoliert von, wie vom Inhaber angegeben: {name}',
  'app.strain.v.app.verify.noBredBy': 'Nicht erfasst, wer ihn hergestellt oder isoliert hat.',
} satisfies Partial<AppTranslation>;
