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

  'app.attest.title': 'Signature du laboratoire',
  'app.attest.text':
    'Faites signer ces chiffres par le laboratoire qui les a mesurés. Ce que vous prouvez porte alors sur des chiffres signés par ce laboratoire, et non sur des chiffres que vous avez saisis.',
  'app.attest.request': 'Télécharger la demande pour le laboratoire',
  'app.attest.requestWarn':
    'La demande contient ces chiffres et ce qu’il faut pour les vérifier. Envoyez-la uniquement au laboratoire.',
  'app.attest.how':
    'Le laboratoire l’ouvre sur {site}/lab, vérifie les chiffres d’après son rapport et vous renvoie un fichier de signature.',
  'app.attest.add': 'Ajouter la signature du laboratoire',
  'app.attest.addOther': 'Ajouter une autre signature',
  'app.attest.signedBy': 'Signé avec la clé de laboratoire {key}.',
  'app.attest.fileSays':
    'Le fichier de signature l’appelle « {name} ». Ce n’est qu’une étiquette : c’est la clé qui compte.',
  'app.attest.publishText': 'Publiez la signature sur Midnight pour que les liens que vous copiez puissent la montrer.',
  'app.attest.publish': 'La publier sur Midnight',
  'app.attest.publishing': 'Publication…',
  'app.attest.published':
    'Publiée sur Midnight dans le bloc {block}. Les liens que vous copiez sous « Ce que vous avez prouvé » l’incluent désormais.',
  'app.attest.stale': 'La signature gardée avec cet enregistrement ne correspond plus. Ajoutez-la à nouveau.',
  'app.attest.added': 'Signature vérifiée et ajoutée.',

  'app.claim.labSigned': 'La clé de laboratoire {key} a signé ces chiffres, et les liens incluent cette signature.',

  'app.claim.check.labOk':
    'Les chiffres de cet enregistrement ont été signés par la clé de laboratoire {key}, publiée sur Midnight dans le bloc {block}{date}.',
  'app.claim.check.labKey': 'Clé du laboratoire',
  'app.claim.check.labWhose':
    'Ce site ne peut pas vous dire à qui appartient cette clé. Comparez-la avec la clé que publie le laboratoire.',
  'app.claim.check.labFailed':
    'La signature du laboratoire n’est pas confirmée : {reason} Considérez les chiffres comme ceux du titulaire.',
  'app.claim.check.whatLab':
    'Ce que cela montre : le chiffre scellé dans cet enregistrement respecte la limite (ou est cette valeur), et la clé ci-dessus a signé les chiffres de cet enregistrement. Ce que cela ne montre pas : à qui est cette clé, ni que le certificat est authentique. Chaque limite prouvée sur un chiffre est publique, et ensemble elles le resserrent.',

  'app.labsign.title': 'Signer des chiffres en tant que laboratoire',
  'app.labsign.intro':
    'Quelqu’un vous a envoyé un fichier de demande. Vérifiez les chiffres qu’il contient d’après votre propre rapport, puis signez. Votre signature permet de prouver un fait sur un chiffre, comme « la similarité avec la variété la plus proche est d’au plus 95 % », comme un chiffre signé par votre laboratoire, sans montrer les autres.',
  'app.labsign.private': 'Tout se passe dans ce navigateur. Votre clé et la demande ne quittent jamais cet ordinateur.',
  'app.labsign.key.title': 'La clé de votre laboratoire',
  'app.labsign.key.none':
    'Créez une clé une fois, puis signez tout avec cette même clé, pour que la clé que vous publiez ne change pas.',
  'app.labsign.key.name': 'Nom du laboratoire (une étiquette pour vos propres fichiers)',
  'app.labsign.key.make': 'Créer une nouvelle clé',
  'app.labsign.key.open': 'Ouvrir votre fichier de clé',
  'app.labsign.key.made':
    'Votre fichier de clé a été enregistré. Gardez-le privé et sauvegardé : quiconque l’a peut signer au nom de votre laboratoire. Si vous le perdez, créez une nouvelle clé et publiez la nouvelle.',
  'app.labsign.key.using': 'Signature avec la clé de « {name} ».',
  'app.labsign.key.public': 'Votre clé publique',
  'app.labsign.key.publish':
    'Publiez-la sur votre site web et dans vos rapports. Qui vérifie une preuve compare la clé affichée avec celle-ci : c’est ainsi qu’on sait que c’était vous.',
  'app.labsign.key.copy': 'Copier la clé publique',
  'app.labsign.key.copied': 'Copiée.',
  'app.labsign.req.title': 'La demande',
  'app.labsign.req.needKey': 'Créez ou ouvrez d’abord votre clé.',
  'app.labsign.req.open': 'Ouvrir le fichier de demande',
  'app.labsign.req.what':
    'Vérifiez chaque ligne d’après votre rapport. Vous signez tout : les chiffres et les détails du document.',
  'app.labsign.req.k.title': 'Document',
  'app.labsign.req.k.type': 'Type',
  'app.labsign.req.k.about': 'Concerne',
  'app.labsign.req.k.issuer': 'Émis par',
  'app.labsign.req.k.reference': 'Référence',
  'app.labsign.req.k.holder': 'Titulaire',
  'app.labsign.req.k.issued': 'Date indiquée',
  'app.labsign.req.k.form': 'Formulaire',
  'app.labsign.req.k.notes': 'Notes',
  'app.labsign.req.k.files': 'Fichiers (leurs codes seulement)',
  'app.labsign.req.confirm': 'J’ai vérifié chaque chiffre d’après notre rapport, et ce sont les nôtres.',
  'app.labsign.req.sign': 'Signer et enregistrer le fichier de signature',
  'app.labsign.req.done':
    'Signé. Renvoyez le fichier de signature à la personne qui vous a envoyé la demande. Il ne contient aucun chiffre, seulement la signature.',
  'app.labsign.req.keep': 'La demande contient les chiffres. Ne la transmettez pas.',
} satisfies Partial<AppTranslation>;
