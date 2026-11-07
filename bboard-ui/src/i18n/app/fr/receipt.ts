// L’application en français : le reçu de divulgation avant chaque étape sur Midnight
// (../en/receipt.ts). BROUILLON : traduction assistée par machine, à faire relire par un
// locuteur natif avant publication (docs/translations/README.md).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const receipt = {
  'app.receipt.title': 'Ce que cela met sur Midnight',
  'app.receipt.public': 'Devient public sur Midnight :',
  'app.receipt.private': 'Reste privé :',
  'app.receipt.when': 'La date et l’heure de son arrivée sur Midnight',
  'app.receipt.fact.yourRecord': 'Un code tiré de la clé de votre enregistrement (pas l’enregistrement)',
  'app.receipt.fact.recovery': 'Un code tiré du secret de récupération de l’enregistrement',
  'app.receipt.fact.newKey': 'Un code tiré de la nouvelle clé de l’enregistrement',
  'app.receipt.fact.otherRecord': 'Un code tiré de la clé de l’autre enregistrement',
  'app.receipt.fact.issuerRecord': 'Un code tiré de la clé de l’enregistrement sous licence',
  'app.receipt.fact.challenge': 'Le code de défi à usage unique du vérificateur',
  'app.receipt.fact.dnaReport': 'Un code tiré du rapport ADN (pas le rapport)',
  'app.receipt.fact.license': 'Un code tiré de la licence (pas ses conditions)',
  'app.receipt.fact.newLicense': 'Un code tiré de la licence du nouveau titulaire',
  'app.receipt.fact.licenseEntry': 'Le code d’entrée de la licence dans la liste publique des licences',
  'app.receipt.fact.slot': 'Le numéro de place de la licence dans cette liste',
  'app.receipt.fact.presentation': 'Un code à usage unique que seule la personne qui vérifie peut rapprocher',
  'app.receipt.fact.listVersion': 'Quelle version de la liste des licences correspondait',
  'app.receipt.fact.checkPassed': 'Que la vérification a réussi',
  'app.receipt.fact.obligation': 'Un code tiré de l’obligation (pas ses conditions)',
  'app.receipt.fact.certificate': 'Le code de preuve du certificat scellé',
  'app.receipt.fact.otherCertificate': 'Le code de preuve du second certificat',
  'app.receipt.fact.certKind': 'Le type de certificat',
  'app.receipt.fact.line': 'Quelle ligne du certificat',
  'app.receipt.fact.value': 'La valeur de cette ligne, en entier',
  'app.receipt.fact.limit': 'La limite choisie (jamais le nombre lui-même)',
  'app.receipt.fact.comparison': 'S’il s’agit d’au moins ou d’au plus cette limite',
  'app.receipt.fact.mask': 'Quelles lignes pouvaient changer',
  'app.receipt.fact.labKey': 'La clé de signature publique du laboratoire',
  'app.receipt.fact.signatureCheck': 'Des nombres issus de la vérification de la signature du laboratoire',
  'app.receipt.fact.batch': 'Un code pour tout un lot d’enregistrements',
  'app.receipt.fact.timeLimit': 'Une limite de temps pour la liste des licences',
  'app.receipt.stay.genetics': 'La génétique et les fichiers ADN ne quittent jamais cet appareil.',
  'app.receipt.stay.locked':
    'Le nom et les notes vont au registre verrouillés avec votre clé. Il ne peut pas les lire.',
  'app.receipt.stay.kind':
    'Le registre voit le type d’enregistrement (plante, animal, document) et son code de preuve.',
} satisfies Partial<AppTranslation>;
