// German (Sie). DRAFT: machine-assisted, to be checked by a fluent speaker before publishing
// (docs/translations/README.md). Terms as in ../../de.ts.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const pair = {
  'app.pair.aFile': 'eine Datei',
  'app.pair.noPlant': 'Die Pflanze, bei der gespeichert werden soll, wurde nicht gefunden.',
  'app.pair.savedTitle': 'DNA-Bericht bei dieser Pflanze gespeichert',
  'app.pair.fpLabel': 'FINGERABDRUCK DER KOPPLUNG',
  'app.pair.openedHere': 'Hier auf Ihrem Gerät geöffnet und gespeichert.',
  'app.pair.stayed': 'Die Berichtsdatei ist auf Ihrem Gerät geblieben.',
  'app.pair.openedHereSub':
    'Das Labor hat sie verschlossen gesendet, sodass nur Sie sie öffnen konnten. Nur ihr Fingerabdruck und ihr Dateiname wurden mit Ihrem Datensatz gespeichert.',
  'app.pair.stayedSub':
    'Sie wurde hier in Ihrem Browser gelesen und mit einem Fingerabdruck versehen. Ihr Fingerabdruck und ihr Dateiname wurden mit Ihrem Datensatz gespeichert.',
  'app.pair.fileSha':
    'SHA-256 der Datei: <b>{sha}</b>. Das ist der Fingerabdruck, den ein Labor signiert: Vergleichen Sie ihn mit dem des Labors. Der Fingerabdruck der Kopplung oben wird daraus gebildet, damit die Kopplung im Netzwerk datiert werden kann.',
  'app.pair.labMatch':
    'Diese Datei passt zum Laborbericht {lead}, anhand ihres SHA-256 (Signatur in diesem Browser geprüft).',
  'app.pair.noLabMatch':
    'Keine Laborsignatur bei dieser Pflanze passt zu dieser Datei, daher bleibt sie Ihre eigene Angabe.',
  'app.pair.recordChip': 'Datensatz · {fp}',
  'app.pair.pairingChip': 'Kopplung · {fp}',
  'app.pair.conflicts.one':
    'Hinweis: Dieser DNA-Bericht ist auch bei {count} weiteren Datensatz gespeichert, den Sie halten{tail}',
  'app.pair.conflicts.other':
    'Hinweis: Dieser DNA-Bericht ist auch bei {count} weiteren Datensätzen gespeichert, die Sie halten{tail}',
  'app.pair.earliest':
    '. Dieser Datensatz wurde zuerst versiegelt, nach den Uhren der Geräte, die sie versiegelt haben.',
  'app.pair.earlier': '. {name} wurde früher versiegelt ({date}, nach der Uhr seines Geräts).',
  'app.pair.saved':
    'Gespeichert. Der Fingerabdruck Ihres DNA-Berichts ist mit dem Datensatz dieser Pflanze gespeichert, als Ihre Angabe, dass dieser Bericht zu ihr gehört. Das ist keine Prüfung der Genetik. {dated}',
  'app.pair.dateBelow':
    'Er ist noch nicht datiert: Datieren Sie ihn unten, wenn Sie die Kopplung im Netzwerk haben möchten.',
  'app.pair.notDated': 'Er ist noch nicht datiert.',
  'app.pair.notDatedHere': 'In {thisSite} wird die Kopplung noch nicht datiert.',
  'app.pair.seeCertificate': 'Weiter: Zertifikat ansehen',
  'app.pair.title': 'Ihren DNA-Bericht bei dieser Pflanze speichern',
  'app.pair.intro':
    'Haben Sie Ihren DNA-Bericht zurück? Speichern Sie ihn bei dieser Pflanze. Er verknüpft Ihren Datensatz mit der tatsächlichen Pflanze: Ein neuer Test kann später damit verglichen werden.',
  'app.pair.savingTo': 'Speichern bei: <b>{name}</b> · gezüchtet von {by}',
  'app.pair.replaces':
    '<b>Bei dieser Pflanze ist schon ein DNA-Bericht gespeichert: „{name}“{saved}.</b> Wenn Sie diesen speichern, ersetzt er ihn. Ihre Pflanzenseite, ihr Zertifikat und Links, die Sie teilen, zeigen den neuen, nicht den alten. Auf Ihrem Gerät wird nichts gelöscht.',
  'app.pair.replacesChain':
    '<b>Bei dieser Pflanze ist schon ein DNA-Bericht gespeichert: „{name}“{saved}.</b> Wenn Sie diesen speichern, ersetzt er ihn. Ihre Pflanzenseite, ihr Zertifikat und Links, die Sie teilen, zeigen den neuen, nicht den alten. Auf Ihrem Gerät wird nichts gelöscht. Wenn Sie die alte Kopplung im Netzwerk datiert haben, bleibt dieses Datum dort.',
  'app.pair.savedOn': ', gespeichert am {date}',
  'app.pair.noDna':
    'VeilCore testet keine DNA: Sie speichern den DNA-Bericht, den Ihr Testlabor Ihnen gegeben hat. Er wird auf Ihrem Gerät gelesen und mit einem Fingerabdruck versehen; die Datei wird nie hochgeladen. Ihr Fingerabdruck und ihr Dateiname werden mit Ihrem Datensatz gespeichert. {after}',
  'app.pair.afterChain': 'Danach können Sie die Kopplung auch im Netzwerk datieren.',
  'app.pair.afterDemo': 'In {thisSite} wird die Kopplung noch nicht datiert; mit dem VeilCore-Vertrag schon.',
  'app.pair.tap': 'Tippen, um Ihren DNA-Bericht zu wählen',
  'app.pair.drag': 'Ziehen Sie Ihren DNA-Bericht hierher oder klicken Sie, um ihn zu wählen',
  'app.pair.dropHint': 'Die Berichtsdatei, die Ihr Testlabor geschickt hat: lokal gelesen, nie hochgeladen.',
  'app.pair.fromLab':
    'Das ist der Laborbericht, den Ihr Labor über VeilCore gesendet hat. Sobald er gespeichert ist, prüft diese Seite ihn gegen die Signatur des Labors.',
  'app.pair.labCanSign':
    'Ein Labor kann seinen Bericht auch mit seinem eigenen Schlüssel signieren; ein signierter zählt mehr als einer, den Sie selbst speichern. Speichern Sie hier die Datei des DNA-Berichts, die Sie haben.',
  'app.pair.fingerprinting': 'Fingerabdruck wird auf Ihrem Gerät erstellt…',
  'app.pair.replace': 'Gespeicherten DNA-Bericht ersetzen',
  'app.pair.skip': 'Noch kein Bericht: überspringen',
  'app.pair.chooseFirst': 'Wählen Sie zuerst die Datei des DNA-Berichts.',
  'app.pair.fingerprinted': 'Fingerabdruck in Ihrem Browser erstellt.',
  'app.pair.sealedFp': 'VERSIEGELTER FINGERABDRUCK',
  'app.pair.chosen': '{title}. Gewählt: {name}',
  'app.pair.ready': '{kb} KB · bereit für den Fingerabdruck auf diesem Gerät · erneut wählen, um sie zu ersetzen',
  'app.pair.chain.noKeys':
    'Dieser Browser hat die Schlüssel des Datensatzes nicht, daher kann er die Kopplung nicht datieren. Stellen Sie sie aus Ihrer Sicherungskopie wieder her.',
  'app.pair.chain.stampFirst':
    'Setzen Sie zuerst den Datumsstempel Ihrer Pflanze (auf ihrer Seite), wenn Sie diesen Laborbericht auch im Netzwerk datieren möchten.',
  'app.pair.chain.other':
    'Dieser Datensatz hat schon eine datierte Kopplung mit einem anderen Bericht. Einen zweiten zu datieren ist noch nicht möglich, daher ist dieser Bericht nicht datiert. Bewahren Sie die Nachweisdatei und die Sicherungskopie des ersten auf.',
  'app.pair.chain.dated': 'Diese Kopplung ist im Testnetzwerk für diesen Datensatz datiert.',
  'app.pair.chain.label': 'Kopplung',
  'app.pair.chain.toShow':
    'Um sie zu zeigen, geben Sie jemandem den Bericht und diese Nachweisdatei. Bewahren Sie eine Kopie beim Bericht auf: Ohne ihr Salt kann die Kopplung nie gezeigt werden.',
  'app.pair.chain.backupAgain':
    'Laden Sie die Sicherungskopie der Datensatzschlüssel erneut herunter: Die, die Sie haben, enthält diese Kopplung nicht.',
  'app.pair.chain.download': 'Nachweisdatei herunterladen',
  'app.pair.chain.title': 'Diese Kopplung auch im Testnetzwerk datieren (optional)',
  'app.pair.chain.intro':
    'Damit kommt ein Code dauerhaft auf die Chain, neben die Identität dieses Datensatzes. Der Code wird aus dem Fingerabdruck des Berichts und einer Zufallszahl gebildet, die in diesem Browser bleibt. Er verrät also nichts über den Bericht, und niemand kann ihn in seinen eigenen Datensatz kopieren. Danach laden Sie eine Nachweisdatei herunter: Mit ihr und dem Bericht kann jeder prüfen, dass der Inhaber dieses Datensatzes den Bericht zu diesem Datum hatte.',
  'app.pair.chain.earlier':
    'Ein früherer Versuch wurde gesendet, aber nicht bestätigt. Er ist vielleicht angekommen. Erneutes Senden verwendet denselben Code, daher kann keine zweite, andere Kopplung entstehen.',
  'app.pair.chain.sendAgain': 'Erneut senden',
  'app.pair.chain.date': 'Kopplung datieren',
  'app.pair.chain.testOnly':
    'Nur Testnetzwerk. Das zeigt, dass, wer die Identität dieses Datensatzes kontrollierte, den Bericht oder seinen Fingerabdruck zu dem Datum hatte, an dem er ankommt. Das ist keine Prüfung der Genetik.',
} satisfies Partial<AppTranslation>;
