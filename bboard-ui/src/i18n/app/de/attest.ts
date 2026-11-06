// The record app in German: a laboratory's signature on a document's numbers (../en/attest.ts).
// DRAFT: machine-assisted, to be checked by a fluent speaker before publishing
// (docs/translations/README.md).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const attest = {
  'app.doc.schema.variety-similarity': 'Genetische Ähnlichkeit zu einer benannten Sorte',
  'app.doc.schema.variety-identity': 'Sortenidentität (Übereinstimmung mit dem Referenzprofil)',
  'app.doc.schema.animal-parentage': 'Abstammung von Tieren (SNP, ICAR)',
  'app.doc.slot.similarity': 'Ähnlichkeit zur benannten Sorte',
  'app.doc.slot.markersCompared': 'Verglichene Marker',
  'app.doc.slot.markersDiffering': 'Abweichende Marker',
  'app.doc.slot.missingCalls': 'Fehlende Werte',
  'app.doc.slot.comparedVariety': 'Registernr. der verglichenen Sorte',
  'app.doc.slot.panel': 'Markerpanel (Code)',
  'app.doc.slot.match': 'Übereinstimmung mit dem Referenzprofil',
  'app.doc.slot.unitsTested': 'Geprüfte Samen oder Pflanzen',
  'app.doc.slot.offTypes': 'Gefundene Abweicher',
  'app.doc.slot.variety': 'Registernr. der Sorte',
  'app.doc.slot.species': 'Tierart (Code)',
  'app.doc.slot.panelSnps': 'SNPs im Panel',
  'app.doc.slot.sireCompared': 'Mit dem Vater verglichene SNPs',
  'app.doc.slot.sireConflicts': 'Konflikte mit dem Vater',
  'app.doc.slot.sireOutcome': 'Ergebnis Vater (0 bestätigt, 1 fraglich, 2 ausgeschlossen)',
  'app.doc.slot.damCompared': 'Mit der Mutter verglichene SNPs',
  'app.doc.slot.damConflicts': 'Konflikte mit der Mutter',
  'app.doc.slot.damOutcome': 'Ergebnis Mutter (0 bestätigt, 1 fraglich, 2 ausgeschlossen)',
  'app.doc.slot.trioConflicts': 'Konflikte im Trio',
  'app.doc.slot.trioOutcome': 'Ergebnis Trio (0 bestätigt, 1 fraglich, 2 ausgeschlossen)',
  'app.doc.slot.sire': 'Registernr. des Vaters',
  'app.doc.slot.dam': 'Registernr. der Mutter',
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
  'app.labnums.oldCode':
    'Zahlen können nur mit einem Bericht über einen neueren Laborcode gesendet werden. Bitten Sie den Züchter um einen neuen Code.',
  'app.attest.title': 'Signatur des Labors',
  'app.attest.signedBy': 'Signaturschlüssel {key}.',
  'app.attest.publishText': 'Veröffentlichen Sie die Signatur auf Midnight, damit Ihre Links sie zeigen können.',
  'app.attest.publish': 'Auf Midnight veröffentlichen',
  'app.attest.publishing': 'Wird veröffentlicht…',
  'app.attest.published':
    'Auf Midnight in Block {block} veröffentlicht. Die Links unter „Was Sie belegt haben“ enthalten sie jetzt.',
  'app.attest.stale': 'Die gespeicherte Signatur passt nicht mehr zu diesem Datensatz. Fügen Sie sie erneut hinzu.',

  'app.claim.labSigned':
    'Der Signaturschlüssel {key} hat diese Zahlen signiert, und die Links enthalten diese Signatur.',

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
  'app.claim.check.labKey': 'Signaturschlüssel',
  'app.claim.check.labFailed':
    'Die Signatur des Labors ist nicht bestätigt: {reason} Lesen Sie die Zahlen als Eingaben des Inhabers.',
  'app.claim.check.whatLab':
    'Was das zeigt: Die im Datensatz versiegelte Zahl erfüllt die Grenze (oder ist dieser Wert), und der Schlüssel oben hat die Zahlen dieses Datensatzes signiert. Was nicht: wem der Schlüssel gehört oder dass das Zertifikat echt ist. Jede belegte Grenze ist öffentlich, und zusammen grenzen sie die Zahl ein.',
} satisfies Partial<AppTranslation>;
