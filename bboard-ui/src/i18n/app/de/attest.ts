// The record app in German: a laboratory's signature on a document's numbers (../en/attest.ts).
// DRAFT: machine-assisted, to be checked by a fluent speaker before publishing
// (docs/translations/README.md).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const attest = {
  'app.doc.schema.soybean-snp-similarity': 'Genetische Ähnlichkeit Soja (SNP, BARCSoySNP6K)',
  'app.doc.schema.maize-snp-similarity': 'Genetische Ähnlichkeit Mais (SNP)',
  'app.doc.schema.genetic-similarity': 'Genetische Ähnlichkeit (jede Kultur oder jeder Stamm)',
  'app.doc.slot.similarity': 'Ähnlichkeit zur nächsten Sorte',
  'app.doc.slot.markersCompared': 'Verglichene Marker',
  'app.doc.slot.markersDiffering': 'Abweichende Marker',
  'app.doc.slot.varietiesCompared': 'Verglichene Sorten',
  'app.doc.nums.badWhole': 'Eine ganze Zahl, z. B. 5103.',
  'app.claim.boundBadWhole': 'Eine ganze Zahl.',

  'app.attest.title': 'Signatur des Labors',
  'app.attest.text':
    'Lassen Sie das Labor, das diese Zahlen gemessen hat, sie signieren. Dann belegen Sie etwas über Zahlen, die dieses Labor signiert hat, nicht über Zahlen, die Sie eingegeben haben.',
  'app.attest.request': 'Anfrage für das Labor herunterladen',
  'app.attest.requestWarn':
    'Die Anfrage enthält diese Zahlen und alles, was zu ihrer Prüfung nötig ist. Senden Sie sie nur an das Labor.',
  'app.attest.how':
    'Das Labor öffnet sie unter {site}/lab, prüft die Zahlen gegen seinen Bericht und schickt Ihnen eine Signaturdatei zurück.',
  'app.attest.add': 'Signatur des Labors hinzufügen',
  'app.attest.addOther': 'Eine andere Signatur hinzufügen',
  'app.attest.signedBy': 'Signiert mit dem Laborschlüssel {key}.',
  'app.attest.fileSays': 'Die Signaturdatei nennt ihn „{name}“. Das ist nur eine Bezeichnung: Es zählt der Schlüssel.',
  'app.attest.publishText': 'Veröffentlichen Sie die Signatur auf Midnight, damit Ihre Links sie zeigen können.',
  'app.attest.publish': 'Auf Midnight veröffentlichen',
  'app.attest.publishing': 'Wird veröffentlicht…',
  'app.attest.published':
    'Auf Midnight in Block {block} veröffentlicht. Die Links unter „Was Sie belegt haben“ enthalten sie jetzt.',
  'app.attest.stale': 'Die gespeicherte Signatur passt nicht mehr zu diesem Datensatz. Fügen Sie sie erneut hinzu.',
  'app.attest.added': 'Signatur geprüft und hinzugefügt.',

  'app.claim.labSigned': 'Der Laborschlüssel {key} hat diese Zahlen signiert, und die Links enthalten diese Signatur.',

  'app.claim.check.labOk':
    'Die Zahlen in diesem Datensatz wurden mit dem Laborschlüssel {key} signiert, auf Midnight veröffentlicht in Block {block}{date}.',
  'app.claim.check.labKey': 'Laborschlüssel',
  'app.claim.check.labWhose':
    'Diese Website kann nicht sagen, wem der Schlüssel gehört. Vergleichen Sie ihn mit dem Schlüssel, den das Labor veröffentlicht.',
  'app.claim.check.labFailed':
    'Die Signatur des Labors ist nicht bestätigt: {reason} Lesen Sie die Zahlen als Eingaben des Inhabers.',
  'app.claim.check.whatLab':
    'Was das zeigt: Die im Datensatz versiegelte Zahl erfüllt die Grenze (oder ist dieser Wert), und der Schlüssel oben hat die Zahlen dieses Datensatzes signiert. Was nicht: wem der Schlüssel gehört oder dass das Zertifikat echt ist. Jede belegte Grenze ist öffentlich, und zusammen grenzen sie die Zahl ein.',

  'app.labsign.title': 'Zahlen als Labor signieren',
  'app.labsign.intro':
    'Jemand hat Ihnen eine Anfragedatei geschickt. Prüfen Sie die Zahlen darin gegen Ihren eigenen Bericht und signieren Sie dann. Mit Ihrer Signatur kann man eine Aussage über eine Zahl belegen, etwa „Ähnlichkeit zur nächsten Sorte höchstens 95 %“, als Zahl, die Ihr Labor signiert hat, ohne die anderen zu zeigen.',
  'app.labsign.private':
    'Alles hier geschieht in diesem Browser. Ihr Schlüssel und die Anfrage verlassen diesen Computer nie.',
  'app.labsign.key.title': 'Ihr Laborschlüssel',
  'app.labsign.key.none':
    'Erstellen Sie einmal einen Schlüssel und signieren Sie alles damit, damit der veröffentlichte Schlüssel gleich bleibt.',
  'app.labsign.key.name': 'Name des Labors (eine Bezeichnung für Ihre eigenen Dateien)',
  'app.labsign.key.make': 'Neuen Schlüssel erstellen',
  'app.labsign.key.open': 'Schlüsseldatei öffnen',
  'app.labsign.key.made':
    'Ihre Schlüsseldatei wurde gespeichert. Halten Sie sie privat und sichern Sie sie: Wer sie hat, kann als Ihr Labor signieren. Wenn Sie sie verlieren, erstellen Sie einen neuen Schlüssel und veröffentlichen Sie diesen.',
  'app.labsign.key.using': 'Es wird mit dem Schlüssel in „{name}“ signiert.',
  'app.labsign.key.public': 'Ihr öffentlicher Schlüssel',
  'app.labsign.key.publish':
    'Veröffentlichen Sie ihn auf Ihrer Website und in Ihren Berichten. Wer einen Beleg prüft, vergleicht den angezeigten Schlüssel mit diesem: So weiß man, dass Sie es waren.',
  'app.labsign.key.copy': 'Öffentlichen Schlüssel kopieren',
  'app.labsign.key.copied': 'Kopiert.',
  'app.labsign.req.title': 'Die Anfrage',
  'app.labsign.req.needKey': 'Erstellen oder öffnen Sie zuerst Ihren Schlüssel.',
  'app.labsign.req.open': 'Anfragedatei öffnen',
  'app.labsign.req.what':
    'Prüfen Sie jede Zeile gegen Ihren Bericht. Sie signieren alles: die Zahlen und die Angaben zum Dokument.',
  'app.labsign.req.k.title': 'Dokument',
  'app.labsign.req.k.type': 'Art',
  'app.labsign.req.k.about': 'Betrifft',
  'app.labsign.req.k.issuer': 'Ausgestellt von',
  'app.labsign.req.k.reference': 'Referenz',
  'app.labsign.req.k.holder': 'Inhaber',
  'app.labsign.req.k.issued': 'Datum darauf',
  'app.labsign.req.k.form': 'Formular',
  'app.labsign.req.k.notes': 'Notizen',
  'app.labsign.req.k.files': 'Dateien (nur ihre Codes)',
  'app.labsign.req.confirm': 'Ich habe jede Zahl gegen unseren Bericht geprüft, und es sind unsere.',
  'app.labsign.req.sign': 'Signieren und Signaturdatei speichern',
  'app.labsign.req.done':
    'Signiert. Schicken Sie die Signaturdatei an die Person zurück, die Ihnen die Anfrage geschickt hat. Sie enthält keine Zahlen, nur die Signatur.',
  'app.labsign.req.keep': 'Die Anfrage enthält die Zahlen. Geben Sie sie nicht weiter.',
} satisfies Partial<AppTranslation>;
