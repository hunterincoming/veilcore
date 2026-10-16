// German (Sie): animal records. DRAFT: machine-assisted, to be checked by a fluent speaker
// before publishing (docs/translations/README.md). Terms as in ./index.ts, plus: Tier, Vater
// (sire), Mutter (dam), Einzeltierkennung (individual ID), Kennzeichnungssystem (ID scheme),
// Rasse, Geschlecht, Herde. app.animal.v.<key> is <key> said of an animal (das Tier, es).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const animal = {
  'app.animal.choice.label': 'Was erfassen Sie?',
  'app.animal.choice.plant': 'Eine Pflanze',
  'app.animal.choice.animal': 'Ein Tier',
  'app.animal.title': 'Ihr Tier erfassen',
  'app.animal.name': 'Name des Tieres',
  'app.animal.namePlaceholder': 'z. B. Übungskuh',
  'app.animal.individualId': 'Einzeltierkennung',
  'app.animal.individualIdHelp': 'Die Nummer auf der Ohrmarke oder in der Registrierung, genau wie geschrieben.',
  'app.animal.idScheme': 'Kennzeichnungssystem',
  'app.animal.idSchemeHelp':
    'Zu welcher Nummerierung die Kennung gehört. Wählen Sie eine aus oder geben Sie Ihre eigene ein.',
  'app.animal.scheme.jp': 'Japanische Rinderkennung (10 Ziffern)',
  'app.animal.scheme.earTag': 'Ohrmarke',
  'app.animal.scheme.microchip': 'Mikrochip',
  'app.animal.scheme.herdBook': 'Herdbuchnummer',
  'app.animal.species': 'Art',
  'app.animal.speciesPlaceholder': 'z. B. Rind (Bos taurus)',
  'app.animal.breed': 'Rasse',
  'app.animal.breedPlaceholder': 'z. B. Japanisches Schwarzrind',
  'app.animal.sex': 'Geschlecht',
  'app.animal.sex.female': 'Weiblich',
  'app.animal.sex.male': 'Männlich',
  'app.animal.sex.unknown': 'Nicht angegeben',
  'app.animal.dob': 'Geburtsdatum (Ihre eigene Angabe)',
  'app.animal.dobHelp':
    'Lassen Sie es leer, wenn Sie es nicht wissen. Der öffentliche Datumsstempel kommt aus dem Netzwerk.',
  'app.animal.breeder': 'Züchter oder Inhaber',
  'app.animal.breederPlaceholder': 'Ihr Name oder Ihr Betrieb',
  'app.animal.more': '+ Vater, Mutter, Herde, Fotos oder Notizen hinzufügen',
  'app.animal.sire': 'Vater',
  'app.animal.dam': 'Mutter',
  'app.animal.sireId': 'Einzeltierkennung des Vaters',
  'app.animal.damId': 'Einzeltierkennung der Mutter',
  'app.animal.parentHelp': 'Wählen Sie ein Tier, das Sie erfasst haben, oder geben Sie seinen Namen ein.',
  'app.animal.parentHelpNone': 'Geben Sie seinen Namen ein. Tiere, die Sie hier erfassen, können Sie später auswählen.',
  'app.animal.linkedId': 'Aus dem gewählten Datensatz.',
  'app.animal.herd': 'Herde oder Betrieb (optional)',
  'app.animal.idShort': 'Kennung',
  'app.animal.need.nameOrId': 'Ein Name oder eine Einzeltierkennung, die Art und der Züchter oder Inhaber genügen.',
  'app.animal.need.scheme': 'Geben Sie an, zu welchem Kennzeichnungssystem die Einzeltierkennung gehört.',
  'app.animal.need.species': 'Geben Sie die Art an.',
  'app.animal.need.breeder': 'Geben Sie den Züchter oder Inhaber an.',
  'app.animal.unsaved': 'Sie haben ein nicht gespeichertes Tier: {name}.',
  'app.animal.k.animal': 'Tier',
  'app.animal.k.speciesBreed': 'Art und Rasse',
  'app.animal.k.born': 'Geboren (Ihre Angabe)',
  'app.animal.notStated': 'Nicht angegeben',
  'app.animal.idIn': '{id} ({scheme})',
  'app.animal.x.sire': 'Vater: {v}',
  'app.animal.x.dam': 'Mutter: {v}',
  'app.animal.x.herd': 'Herde: {v}',
  'app.animal.f.statedBirth': 'Geburtsdatum (Angabe des Inhabers)',
  'app.animal.noLicensing': 'Vereinbarungen und Lizenzgebühren gibt es für Tierdatensätze noch nicht.',
  'app.animal.tree.sire': 'Vater',
  'app.animal.tree.dam': 'Mutter',
  'app.animal.home.yourRecords': 'Ihre Datensätze',
  'app.animal.verify.sireLine': 'Vater, wie vom Inhaber angegeben: {v}',
  'app.animal.verify.damLine': 'Mutter, wie vom Inhaber angegeben: {v}',
  'app.animal.verify.idLine': 'Einzeltierkennung, wie vom Inhaber angegeben: {id} ({scheme})',
  'app.animal.verify.noId': 'Keine Einzeltierkennung erfasst.',
  'app.animal.v.app.verify.noParents': 'Kein Vater und keine Mutter erfasst.',
  'app.animal.v.app.plant.fix.name': 'Name des Tieres',
  'app.animal.v.app.plant.fix.bredBy': 'Züchter oder Inhaber',
  'app.animal.v.app.verify.nameTyped': 'Name des Tieres, wie vom Inhaber eingegeben: ',
  'app.animal.import.dob': 'Geburtsdatum',
  'app.animal.import.scheme': 'Kennzeichnungssystem für jede Einzeltierkennung in der Datei',
  'app.animal.import.schemeHelp': 'Zum Beispiel: Japanische Rinderkennung (10 Ziffern) oder Ohrmarke.',
  'app.animal.import.species': 'Art, für Zeilen ohne Angabe',
  'app.animal.import.breeder': 'Züchter oder Inhaber, für Zeilen ohne Angabe',
  'app.animal.import.pickHint':
    'Wählen Sie die Spalte mit dem Namen oder der Einzeltierkennung jedes Tieres und geben Sie an, zu welchem Kennzeichnungssystem die Kennungen gehören.',

  'app.animal.v.app.log.reportIntro':
    '<b>Optional.</b> Haben Sie schon einen DNA-Bericht zu diesem Tier? Er verknüpft Ihren Datensatz mit dem tatsächlichen Tier. Fügen Sie ihn jetzt hinzu, dann wird er beim Datensatz aufbewahrt. Noch kein Bericht? Überspringen Sie den Schritt: Die Seite des Tieres zeigt, wie Sie einen bekommen.',
  'app.animal.v.app.log.sealingPlant': 'Ihr Tier wird versiegelt…',
  'app.animal.v.app.log.sealStampsKey':
    'Beim Versiegeln bekommt auch der Schlüssel Ihres Tieres einen Datumsstempel, damit Sie später nachweisen können, dass Sie seinen Datensatz halten. Nur ein Fingerabdruck des Schlüssels wird gesendet.',
  'app.animal.v.app.log.publicStampLater':
    'Den öffentlichen Datumsstempel bekommt es, wenn sein Stapel auf {datedOn} datiert wird. Die Seite Ihres Tieres zeigt, wann das geschehen ist. Sie müssen nichts tun.',
  'app.animal.v.app.log.publicDateLater':
    'Das öffentliche Datum kommt, wenn sein Stapel auf {datedOn} datiert wird. Die Seite Ihres Tieres zeigt es dann.',
  'app.animal.v.app.log.keyStampedAt':
    'Schlüssel mit Datumsstempel: {when}. Auch der Schlüssel Ihres Tieres ist datiert, damit Sie später nachweisen können, dass Sie seinen Datensatz halten.{bound} Über das Tier wurde nichts gesendet.',
  'app.animal.v.app.log.keyStamped':
    'Schlüssel mit Datumsstempel versehen. Auch der Schlüssel Ihres Tieres ist datiert, damit Sie später nachweisen können, dass Sie seinen Datensatz halten.{bound} Über das Tier wurde nichts gesendet.',
  'app.animal.v.app.log.stampingTitle': 'Versiegelt. Der Schlüssel Ihres Tieres bekommt den Datumsstempel…',
  'app.animal.v.app.log.onlyFingerprint':
    'Gesendet wird nur ein Fingerabdruck des Schlüssels Ihres Tieres, nichts über das Tier. Kostenlos: VeilCore zahlt die Netzwerkgebühr.',
  'app.animal.v.app.log.stampingAria': 'Der Schlüssel Ihres Tieres bekommt den Datumsstempel',
  'app.animal.v.app.log.keepOpen':
    'Lassen Sie diese Seite etwa eine Minute offen. Wenn sie sich schließt, geht nichts verloren: Ihr Tier ist gespeichert, und seine Seite bietet den Datumsstempel erneut an.',
  'app.animal.v.app.chain.stampMayHaveGoneOut':
    'Ihr Datumsstempel wurde möglicherweise schon gesendet{tx}. Ihr Tier ist gespeichert. Versuchen Sie es erst wieder, wenn diese Transaktion im Netzwerk geprüft wurde.',
  'app.animal.v.app.chain.stampUnreachable':
    'Das Netzwerk war nicht erreichbar. Ihr Tier ist gespeichert. Versuchen Sie es {when} erneut oder setzen Sie den Datumsstempel später.',
  'app.animal.v.app.chain.stampDidntGoThrough':
    'Der Datumsstempel hat nicht geklappt. Ihr Tier ist gespeichert. Versuchen Sie es {when} erneut oder setzen Sie den Datumsstempel später.',
  'app.animal.v.app.pair.noPlant': 'Das Tier, bei dem gespeichert werden soll, wurde nicht gefunden.',
  'app.animal.v.app.pair.savedTitle': 'DNA-Bericht bei diesem Tier gespeichert',
  'app.animal.v.app.pair.noLabMatch':
    'Keine Laborsignatur bei diesem Tier passt zu dieser Datei, daher bleibt sie Ihre eigene Angabe.',
  'app.animal.v.app.pair.saved':
    'Gespeichert. Der Fingerabdruck Ihres DNA-Berichts ist mit dem Datensatz dieses Tieres gespeichert, als Ihre Angabe, dass dieser Bericht zu ihm gehört. Das ist keine Prüfung der Genetik. {dated}',
  'app.animal.v.app.pair.title': 'Ihren DNA-Bericht bei diesem Tier speichern',
  'app.animal.v.app.pair.intro':
    'Haben Sie Ihren DNA-Bericht zurück? Speichern Sie ihn bei diesem Tier. Er verknüpft Ihren Datensatz mit dem tatsächlichen Tier: Ein neuer Test kann später damit verglichen werden.',
  'app.animal.v.app.pair.savingTo': 'Speichern bei: <b>{name}</b> · Züchter oder Inhaber {by}',
  'app.animal.v.app.pair.replaces':
    '<b>Bei diesem Tier ist schon ein DNA-Bericht gespeichert: „{name}“{saved}.</b> Wenn Sie diesen speichern, ersetzt er ihn. Die Seite Ihres Tieres, sein Zertifikat und Links, die Sie teilen, zeigen den neuen, nicht den alten. Auf Ihrem Gerät wird nichts gelöscht.',
  'app.animal.v.app.pair.replacesChain':
    '<b>Bei diesem Tier ist schon ein DNA-Bericht gespeichert: „{name}“{saved}.</b> Wenn Sie diesen speichern, ersetzt er ihn. Die Seite Ihres Tieres, sein Zertifikat und Links, die Sie teilen, zeigen den neuen, nicht den alten. Auf Ihrem Gerät wird nichts gelöscht. Wenn Sie die alte Kopplung im Netzwerk datiert haben, bleibt dieses Datum dort.',
  'app.animal.v.app.pair.chain.stampFirst':
    'Setzen Sie zuerst den Datumsstempel Ihres Tieres (auf seiner Seite), wenn Sie diesen Laborbericht auch im Netzwerk datieren möchten.',
  'app.animal.v.app.plant.notHereText':
    'Wenn Sie ihn in einem anderen Browser versiegelt haben, speichern Sie dort eine Sicherungskopie und öffnen Sie sie hier (Datensätze zurückholen). Wenn es der Datensatz einer anderen Person ist, öffnen Sie stattdessen den Prüflink, den sie Ihnen gegeben hat.',
  'app.animal.v.app.plant.bredByName': 'Züchter oder Inhaber: {name}',
  'app.animal.v.app.plant.action.saveReport': 'Einen DNA-Bericht bei diesem Tier speichern',
  'app.animal.v.app.plant.f.reportSaved': 'bei diesem Tier gespeichert ({file}) · Fingerabdruck der Kopplung {fp}{sha}',
  'app.animal.v.app.plant.backToPlant': 'Zurück zum Tier',
  'app.animal.v.app.plant.tie.tied': 'Mit dem Tier verknüpft',
  'app.animal.v.app.plant.tie.notYet': 'Noch nicht mit dem Tier verknüpft',
  'app.animal.v.app.plant.tie.notNow': 'Nicht mehr mit dem Tier verknüpft',
  'app.animal.v.app.plant.tie.openedNotSaved': 'ein Laborbericht ist geöffnet, aber nicht bei diesem Tier gespeichert',
  'app.animal.v.app.plant.tie.sentence': 'Mit dem Tier verknüpft: {what}, {date}.',
  'app.animal.v.app.plant.tie.sentenceNoDate': 'Mit dem Tier verknüpft: {what}.',
  'app.animal.v.app.plant.tie.sentenceNone': 'Noch nicht mit dem Tier verknüpft: {what}.',
  'app.animal.v.app.plant.tie.sentenceNot': 'Nicht mehr mit dem Tier verknüpft: {what}.',
  'app.animal.v.app.plant.tie.means':
    'Mit einem DNA-Bericht kann ein Labor einen neuen Test eines Tieres damit vergleichen. Allein zeigt er nicht, dass ein Tier übereinstimmt.',
  'app.animal.v.app.plant.tie.sub': 'Bericht {date}. Ein Labor kann einen neuen Test des Tieres damit vergleichen.',
  'app.animal.v.app.plant.tie.why':
    'Ein DNA-Bericht Ihres Labors ist das, was einen Datensatz mit dem Tier selbst verknüpft.',
  'app.animal.v.app.plant.savedToPlant': 'bei diesem Tier gespeichert',
  'app.animal.v.app.plant.openedNotSaved': 'geöffnet, nicht bei diesem Tier gespeichert',
  'app.animal.v.app.plant.keyStampLine':
    'Schlüssel mit Datumsstempel: {when}. Der Schlüssel Ihres Tieres ist auch datiert, sodass Sie später beweisen können, dass Sie seinen Datensatz halten.',
  'app.animal.v.app.plant.next.backup.why':
    'Die Schlüssel dieses Tieres sind gerade nur auf diesem Gerät. Wenn es kaputtgeht oder der Browser geleert wird, kann niemand beweisen, dass Sie seinen Datensatz halten. Das Speichern dauert eine Minute.',
  'app.animal.v.app.plant.next.corrected.why':
    'Das Labor hat den bei diesem Tier gespeicherten DNA-Bericht ersetzt. Bis Sie den korrigierten speichern, sagen die Seite Ihres Tieres, Ihr Zertifikat und Ihre Links, dass der gespeicherte ersetzt wurde.',
  'app.animal.v.app.plant.next.labWithdrew.whyNewer':
    'Er bleibt bei diesem Tier gespeichert, und Ihr Zertifikat und Ihre Links sagen, dass er zurückgezogen wurde. Ein neuerer Laborbericht ist da: Öffnen Sie ihn und speichern Sie stattdessen diesen.',
  'app.animal.v.app.plant.next.labWithdrew.why':
    'Er bleibt bei diesem Tier gespeichert, und Ihr Zertifikat und Ihre Links sagen, dass er zurückgezogen wurde. Bitten Sie das Labor um einen neuen.',
  'app.animal.v.app.plant.next.open.why':
    'Er ist mit dem Schlüssel dieses Tieres so verschlossen, dass nur Sie ihn öffnen können. Beim Öffnen wird hier die Signatur des Labors geprüft.',
  'app.animal.v.app.plant.next.sample.whySaved':
    'Sie haben einen DNA-Bericht bei diesem Tier gespeichert; das ist Ihre eigene Angabe. Wenn ein Labor signiert, dass es eine Probe erhalten hat, kommt eine zweite Partei hinzu, und das ist ein stärkerer Nachweis als Ihre Angabe allein.',
  'app.animal.v.app.plant.next.sample.why':
    'Im Moment ist dieser Datensatz Ihre eigene Darstellung des Tieres. Wenn ein Labor signiert, dass es eine Probe erhalten hat, und einen Laborbericht zurücksendet, wird daraus ein stärkerer Nachweis als Ihre eigene Darstellung.',
  'app.animal.v.app.plant.next.dna.title': 'Einen DNA-Bericht für dieses Tier bekommen',
  'app.animal.v.app.plant.next.dna.why':
    'Ein datierter Datensatz zeigt, dass eine Beschreibung existierte. Ein DNA-Bericht (das genetische Profil des Tieres von einem Labor) verknüpft Ihren Datensatz mit dem tatsächlichen Tier. Zwei Wege, einen zu bekommen:',
  'app.animal.v.app.plant.next.dna.haveText':
    'Speichern Sie ihn bei diesem Tier. Er wird auf Ihrem Gerät gelesen; die Datei wird nie hochgeladen.',
  'app.animal.v.app.plant.next.date.why':
    'Er ist bei diesem Tier gespeichert, aber noch datiert ihn nichts. Ihn zu datieren zeigt, dass der Bericht zu diesem Datum existierte, ohne jemandem die Marker zu zeigen.',
  'app.animal.v.app.plant.next.save.title': 'Den DNA-Bericht bei diesem Tier speichern',
  'app.animal.v.app.plant.next.save.why':
    'Ein Labor hat signiert, dass es eine Probe erhalten hat. Wenn sein DNA-Bericht zurückkommt, speichern Sie ihn bei diesem Tier: Das verknüpft Ihren Datensatz mit dem Tier, damit ein späterer Test damit verglichen werden kann.',
  'app.animal.v.app.plant.next.save.action': 'Bei diesem Tier speichern',
  'app.animal.v.app.plant.next.ready.why':
    'Ein Labor hat signiert, dass es eine Probe erhalten hat, und ein DNA-Bericht ist bei diesem Tier gespeichert. Vereinbarungen und Lizenzgebühren gibt es für Tierdatensätze noch nicht.',
  'app.animal.v.app.plant.tree.none': 'Noch kein Vater und keine Mutter erfasst.',
  'app.animal.v.app.plant.anchor.keysNotHere':
    'Der Schlüssel dieses Tieres ist nicht in diesem Browser. Holen Sie ihn aus Ihrer Sicherungsdatei zurück: Ein neuer Schlüssel würde nicht zum versiegelten Datensatz passen.',
  'app.animal.v.app.plant.bundle.keyIs':
    '(Der Schlüssel des Datensatzes ist die öffentliche ID des Schlüssels, der beim Versiegeln für dieses Tier erstellt wurde. Sein geheimer Teil bleibt in Ihrer Sicherungskopie und kommt nie in das Paket.)',
  'app.animal.v.app.plant.bundle.checkedAgainst':
    'Sie wird vor dem Beifügen mit der bei diesem Tier gespeicherten abgeglichen.',
  'app.animal.v.app.plant.cert.intro':
    'Für Ihre Unterlagen und Ihre Anwältin oder Ihren Anwalt: der versiegelte Datensatz, eine frische Prüfung, dass er sich nicht geändert hat, ob er verankert ist, ob ein DNA-Bericht ihn mit dem Tier verknüpft, und eine Empfangsbestätigung eines Labors. Es enthält die Details des Datensatzes, aber keine genetischen Daten oder Labordateien. Der QR-Code öffnet die öffentliche Prüfseite des Datensatzes.',
  'app.animal.v.app.plant.att.noReceipt':
    'Noch hat kein Labor eine Empfangsbestätigung für dieses Tier signiert. Ein Datensatz, für den nur Sie einstehen, ist ein schwächerer Nachweis als einer, den ein Labor signiert. Senden Sie eine Probe an ein Labor: Seine Empfangsbestätigung wird mit seinem Schlüssel signiert, nicht mit Ihrem.',
  'app.animal.v.app.verify.field.parent-names': 'Vater und Mutter (Namen und Kennungen)',
  'app.animal.v.app.verify.alwaysShown':
    'Immer angezeigt: der Name des Tieres, die Datensatz-ID, sein Fingerabdruck ({fp}), wann das Register ihn zuerst gespeichert hat, und was diese Seite über seinen Stapel und signierte Bestätigungen (eine Empfangsbestätigung eines Labors, einen Laborbericht) prüfen konnte.',
  'app.animal.v.app.verify.ownReceiptTail':
    ' Sie sehen das, weil das Tier in diesem Browser ist; wer Ihren Link erhält, sieht nur die Signaturzeile oben.',
  'app.animal.v.app.prove.openCheckPage': 'Die Prüfseite des Tieres öffnen',
  'app.animal.v.app.prove.doneText':
    'Die Antwort erscheint auf der Seite des Anfragenden. Über das Tier wurde nichts gesendet: nur der Beweis, dass Sie seinen Datensatz halten.',
  'app.animal.v.app.prove.thePlant': 'das Tier',
  'app.animal.v.app.prove.thisPlant': 'dieses Tier',
  'app.animal.v.app.prove.whatSends':
    '<b>Was gesendet wird:</b> nur der Beweis, dass Sie den Datensatz dieses Tieres halten, im Testnetzwerk. Kein Name, keine Genetik, nichts über Ihre anderen Datensätze.',
  'app.animal.v.app.prove.answering':
    'Wenn Sie antworten, erfährt die Person, die Ihnen diesen Link gesendet hat, dass Sie den Datensatz dieses Tieres halten.',
  'app.animal.v.app.prove.watch.notWho': 'Es zeigt nicht, wer die Person ist oder wer das Tier gezüchtet hat.',
  'app.animal.v.app.prove.watch.holderStatement':
    'Dass dieser Schlüssel zum Datensatz dieses Tieres gehört, ist vorerst die Angabe des Inhabers. Es zeigt nicht, wer die Person ist oder wer das Tier gezüchtet hat.',
  'app.animal.v.app.prove.watch.stampedYour':
    'Der Schlüssel Ihres Tieres erhielt am {when} einen Datumsstempel. Das datiert den Schlüssel, nicht den Datensatz.',
  'app.animal.v.app.prove.watch.stampedThisEarlier':
    'Der Schlüssel dieses Tieres erhielt schon früher einen Datumsstempel im Netzwerk. Das datiert den Schlüssel, nicht den Datensatz.',
  'app.animal.v.app.prove.own.title': 'Beweisen Sie, dass Sie den Schlüssel dieses Tieres halten (Testnetzwerk)',
  'app.animal.v.app.prove.own.stampFirst':
    'Setzen Sie zuerst den Datumsstempel: Tippen Sie auf der Seite des Tieres auf „Den Datumsstempel setzen“. Der Beweis betrifft die On-Chain-Identität des Tierdatensatzes, die der Datumsstempel erzeugt.',
  // The lab report panels, a delivery and the saved report's sentence, for an animal.
  'app.animal.v.app.lab.sentence.none': 'Bei diesem Tier ist kein DNA-Bericht gespeichert.',
  'app.animal.v.app.lab.sentence.self':
    'Bei diesem Tier ist eine Datei eines DNA-Berichts gespeichert. Keine Laborsignatur passt dazu, daher ist sie die eigene Angabe des Inhabers.',
  'app.animal.v.app.lab.sentence.replaced':
    'Der bei diesem Tier gespeicherte DNA-Bericht wurde vom Labor{on} durch einen korrigierten ersetzt. {tail}',
  'app.animal.v.app.lab.sentence.withdrawn':
    'Der bei diesem Tier gespeicherte DNA-Bericht wurde vom Labor{on} zurückgezogen. {tail}',
  'app.animal.v.app.lab.results.replacedNewer':
    '<b>Der bei diesem Tier gespeicherte Laborbericht wurde vom Labor ersetzt.</b> Speichern Sie den korrigierten: Öffnen Sie ihn und tippen Sie dann auf „Bei diesem Tier speichern“.',
  'app.animal.v.app.lab.results.replacedNone':
    '<b>Der bei diesem Tier gespeicherte Laborbericht wurde vom Labor ersetzt.</b> Kein aktueller Bericht von {lab}: Das Original wurde ersetzt und die Korrektur zurückgezogen.',
  'app.animal.v.app.lab.results.withdrawn':
    '<b>Der bei diesem Tier gespeicherte Laborbericht wurde vom Labor zurückgezogen.</b> Er bleibt gespeichert, bis Sie einen anderen speichern, und Ihr Zertifikat und Ihre Links sagen, dass er zurückgezogen wurde.',
  'app.animal.v.app.lab.results.withdrawnNewer':
    '<b>Der bei diesem Tier gespeicherte Laborbericht wurde vom Labor zurückgezogen.</b> Er bleibt gespeichert, bis Sie einen anderen speichern, und Ihr Zertifikat und Ihre Links sagen, dass er zurückgezogen wurde. Ein neuerer Laborbericht ist da: Öffnen Sie ihn und speichern Sie ihn dann bei diesem Tier.',
  'app.animal.v.app.lab.results.locked':
    'So verschlossen, dass nur Sie sie öffnen können, mit dem Schlüssel dieses Tieres aus Ihrer Sicherungskopie. VeilCore kann sie nicht lesen.',
  'app.animal.v.app.lab.results.noKey':
    'Der Schlüssel dieses Tieres ist nicht auf diesem Gerät, daher können seine Laborberichte hier nicht geöffnet werden. <link>Holen Sie Ihre Datensätze zuerst aus Ihrer Sicherungskopie zurück</link>.',
  'app.animal.v.app.lab.results.whatOthersSee':
    '<b>Was andere sehen können.</b> Die Signatur des Labors ist öffentlich, der Bericht nicht. Wer einen Link zur Prüfseite dieses Tieres hat, sieht, dass ein Laborbericht über es signiert wurde, den SHA-256 der Berichtsdatei und den Namen, unter dem der Schlüssel des Labors registriert ist: markiert mit „Name nicht geprüft“, sofern der Betreiber von VeilCore ihn nicht mit einem öffentlichen Lizenz- oder Akkreditierungsverzeichnis abgeglichen hat. Wenn Sie den Bericht bei diesem Tier speichern und unter „Jemandem zeigen“ „Ob ein DNA-Bericht gespeichert ist“ teilen, sieht man auch, dass die gespeicherte Datei dazu passt.',
  'app.animal.v.app.lab.results.nothingYet':
    'Noch nichts. Wenn ein Labor, an das Sie eine Probe dieses Tieres gesendet haben, einen Laborbericht sendet, erscheint er hier.',
  'app.animal.v.app.lab.results.savedHere': ' · bei diesem Tier gespeichert',
  'app.animal.v.app.lab.results.stillSaved': '. Er ist weiterhin bei diesem Tier gespeichert.',
  'app.animal.v.app.lab.results.replacesSaved':
    'Bei diesem Tier ist schon ein Laborbericht gespeichert. Wenn Sie diesen speichern, ersetzt er ihn; Sie bestätigen auf dem nächsten Bildschirm.',
  'app.animal.v.app.lab.send.nothingYet':
    'Noch hat sich nichts geändert. Die Seite Ihres Tieres zeigt „wartet“, bis der Code eingegeben wird, und kann diesen Code erneut anzeigen. Er wird in das Feld auf der Startseite von VeilCore eingefügt.',
  'app.animal.v.app.lab.send.takenFromHelp': 'Die Einzeltierkennung des Tieres oder wo die Probe genommen wurde.',
} satisfies Partial<AppTranslation>;
