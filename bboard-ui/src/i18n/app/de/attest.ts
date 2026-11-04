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

  'app.labnums.title': 'Zahlen aus diesem Bericht, von Ihnen signiert (optional)',
  'app.labnums.text':
    'Wählen Sie das Formular und geben Sie die Zahlen genau wie in Ihrem Bericht ein. Sie werden in einen Datensatz versiegelt, den Sie signieren, und verschlossen mit dem Bericht gesendet. Der Züchter kann dann eine Zahl belegen, ohne die anderen zu zeigen, als Zahl, die Ihr Labor signiert hat.',
  'app.labnums.resultTitle': 'Name dieses Ergebnisses (Ihre Berichtsreferenz)',
  'app.labnums.inReport': 'Zahlen, die das Labor mit diesem Bericht signiert hat ({form}):',
  'app.labnums.addText':
    'Fügen Sie sie als Datensatz hinzu, den Sie halten. Dann können Sie die Signatur des Labors auf Midnight veröffentlichen und jeweils eine Zahl belegen.',
  'app.labnums.add': 'Signierte Zahlen als Datensatz hinzufügen',
  'app.labnums.openRecord': 'Datensatz mit diesen Zahlen öffnen',
  'app.labnums.cantUse': 'Dieser Bericht enthält Zahlen, die nicht verwendet werden können: {reason}',
  'app.labnums.otherPlant': 'sie betreffen eine andere Pflanze.',
  'app.labnums.otherReport': 'sie nennen eine andere Berichtsdatei.',
  'app.attest.title': 'Signatur des Labors',
  'app.attest.signedBy': 'Signiert mit dem Laborschlüssel {key}.',
  'app.attest.publishText': 'Veröffentlichen Sie die Signatur auf Midnight, damit Ihre Links sie zeigen können.',
  'app.attest.publish': 'Auf Midnight veröffentlichen',
  'app.attest.publishing': 'Wird veröffentlicht…',
  'app.attest.published':
    'Auf Midnight in Block {block} veröffentlicht. Die Links unter „Was Sie belegt haben“ enthalten sie jetzt.',
  'app.attest.stale': 'Die gespeicherte Signatur passt nicht mehr zu diesem Datensatz. Fügen Sie sie erneut hinzu.',

  'app.claim.labSigned': 'Der Laborschlüssel {key} hat diese Zahlen signiert, und die Links enthalten diese Signatur.',

  'app.claim.check.labOk':
    'Die Zahlen in diesem Datensatz wurden mit dem Schlüssel {key} signiert, auf Midnight veröffentlicht in Block {block}{date}.',
  'app.claim.check.labWithdrawn':
    'Das Labor hat diese Signatur zurückgezogen. Lesen Sie die Zahlen als Eingaben des Inhabers.',
  'app.claim.check.labConflict':
    'Mehr als ein Labor beansprucht diesen Schlüssel, daher wird kein Name angezeigt. Lesen Sie die Zahlen als Eingaben des Inhabers.',
  'app.claim.check.labUnidentified':
    'Kein Labor hat erklärt, dass dieser Schlüssel für diesen Datensatz seiner ist. Lesen Sie die Zahlen als Eingaben des Inhabers.',
  'app.claim.check.labAbout': 'Die Ergebnisse betreffen den Datensatz mit dem Nachweiscode',
  'app.claim.check.labFieldSecret':
    'Das Labor kennt diese Zahlen ebenfalls und könnte selbst Aussagen darüber belegen.',
  'app.claim.check.labKey': 'Laborschlüssel',
  'app.claim.check.labFailed':
    'Die Signatur des Labors ist nicht bestätigt: {reason} Lesen Sie die Zahlen als Eingaben des Inhabers.',
  'app.claim.check.whatLab':
    'Was das zeigt: Die im Datensatz versiegelte Zahl erfüllt die Grenze (oder ist dieser Wert), und der Schlüssel oben hat die Zahlen dieses Datensatzes signiert. Was nicht: wem der Schlüssel gehört oder dass das Zertifikat echt ist. Jede belegte Grenze ist öffentlich, und zusammen grenzen sie die Zahl ein.',
} satisfies Partial<AppTranslation>;
