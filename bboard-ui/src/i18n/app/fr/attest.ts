// The record app in French: a laboratory's signature on a document's numbers (../en/attest.ts).
// DRAFT: machine-assisted, to be checked by a fluent speaker before publishing
// (docs/translations/README.md).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const attest = {
  'app.doc.schema.soybean-snp-similarity': 'Similarité génétique du soja (SNP, BARCSoySNP6K)',
  'app.doc.schema.maize-snp-similarity': 'Similarité génétique du maïs (SNP)',
  'app.doc.schema.genetic-similarity': 'Similarité génétique (toute culture ou souche)',
  'app.doc.slot.similarity': 'Similarité avec la variété la plus proche',
  'app.doc.slot.markersCompared': 'Marqueurs comparés',
  'app.doc.slot.markersDiffering': 'Marqueurs qui diffèrent',
  'app.doc.slot.varietiesCompared': 'Variétés comparées',
  'app.doc.nums.badWhole': 'Un nombre entier, comme 5103.',
  'app.claim.boundBadWhole': 'Un nombre entier.',

  'app.labnums.title': 'Chiffres de ce rapport, signés par vous (facultatif)',
  'app.labnums.text':
    'Choisissez le formulaire et saisissez les chiffres exactement comme dans votre rapport. Ils sont scellés dans un enregistrement que vous signez et envoyés verrouillés avec le rapport. L’obtenteur pourra alors prouver un chiffre sans montrer les autres, comme un chiffre signé par votre laboratoire.',
  'app.labnums.resultTitle': 'Nom de ce résultat (la référence de votre rapport)',
  'app.labnums.inReport': 'Chiffres signés par le laboratoire avec ce rapport ({form}) :',
  'app.labnums.addText':
    'Ajoutez-les comme un enregistrement que vous détenez. Vous pourrez ensuite publier la signature du laboratoire sur Midnight et prouver un chiffre à la fois.',
  'app.labnums.add': 'Ajouter les chiffres signés comme enregistrement',
  'app.labnums.openRecord': 'Ouvrir l’enregistrement avec ces chiffres',
  'app.labnums.cantUse': 'Ce rapport contient des chiffres inutilisables : {reason}',
  'app.labnums.otherPlant': 'ils portent sur une autre plante.',
  'app.labnums.otherReport': 'ils désignent un autre fichier de rapport.',
  'app.attest.title': 'Signature du laboratoire',
  'app.attest.signedBy': 'Signé avec la clé de laboratoire {key}.',
  'app.attest.publishText': 'Publiez la signature sur Midnight pour que les liens que vous copiez puissent la montrer.',
  'app.attest.publish': 'La publier sur Midnight',
  'app.attest.publishing': 'Publication…',
  'app.attest.published':
    'Publiée sur Midnight dans le bloc {block}. Les liens que vous copiez sous « Ce que vous avez prouvé » l’incluent désormais.',
  'app.attest.stale': 'La signature gardée avec cet enregistrement ne correspond plus. Ajoutez-la à nouveau.',

  'app.claim.labSigned': 'La clé de laboratoire {key} a signé ces chiffres, et les liens incluent cette signature.',

  'app.claim.check.labOk':
    'Les chiffres de cet enregistrement ont été signés avec la clé {key}, publiée sur Midnight dans le bloc {block}{date}.',
  'app.claim.check.labWithdrawn':
    'Le laboratoire a retiré cette signature. Considérez les chiffres comme ceux du titulaire.',
  'app.claim.check.labConflict':
    'Plus d’un laboratoire revendique cette clé, aucun nom n’est donc affiché. Considérez les chiffres comme ceux du titulaire.',
  'app.claim.check.labUnidentified':
    'Aucun laboratoire n’a déclaré que cette clé était la sienne pour cet enregistrement. Considérez les chiffres comme ceux du titulaire.',
  'app.claim.check.labAbout': 'Les résultats portent sur l’enregistrement au code de preuve',
  'app.claim.check.labFieldSecret':
    'Le laboratoire connaît aussi ces chiffres et pourrait lui-même prouver des choses à leur sujet.',
  'app.claim.check.labKey': 'Clé du laboratoire',
  'app.claim.check.labFailed':
    'La signature du laboratoire n’est pas confirmée : {reason} Considérez les chiffres comme ceux du titulaire.',
  'app.claim.check.whatLab':
    'Ce que cela montre : le chiffre scellé dans cet enregistrement respecte la limite (ou est cette valeur), et la clé ci-dessus a signé les chiffres de cet enregistrement. Ce que cela ne montre pas : à qui est cette clé, ni que le certificat est authentique. Chaque limite prouvée sur un chiffre est publique, et ensemble elles le resserrent.',
} satisfies Partial<AppTranslation>;
