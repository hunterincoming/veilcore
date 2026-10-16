// French (vous). DRAFT: machine-assisted, to be checked by a fluent speaker before publishing
// (docs/translations/README.md). Terms as in ../../fr.ts.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const chain = {
  'app.chain.inAboutMinutes.one': 'dans environ {count} minute',
  'app.chain.inAboutMinutes.other': 'dans environ {count} minutes',
  'app.chain.inAFewMinutes': 'dans quelques minutes',
  'app.chain.txParen': ' (transaction {tx})',
  'app.chain.mayHaveGoneOut':
    'Elle est peut-être déjà partie{tx}. Ne réessayez pas tant que cette transaction n’a pas été vérifiée sur le réseau.',
  'app.chain.nothingSent': ' Rien n’a été envoyé.',
  'app.chain.unreachable': 'Impossible de joindre le réseau.{nothingSent} Réessayez {when}.',
  'app.chain.didntGoThrough': 'Cela n’a pas abouti.{nothingSent} Réessayez {when}.',
  'app.chain.didntGoThroughBecause': 'Cela n’a pas abouti : {reason}.{nothingSent}',
  'app.chain.stampMayHaveGoneOut':
    'Votre horodatage est peut-être déjà parti{tx}. Votre plante est enregistrée. Ne réessayez pas tant que cette transaction n’a pas été vérifiée sur le réseau.',
  'app.chain.stampUnreachable':
    'Impossible de joindre le réseau. Votre plante est enregistrée. Réessayez {when}, ou faites l’horodatage plus tard.',
  'app.chain.stampDidntGoThrough':
    'L’horodatage n’a pas abouti. Votre plante est enregistrée. Réessayez {when}, ou faites l’horodatage plus tard.',
  'app.chain.progress.reading': 'Lecture du contrat sur le réseau…',
  'app.chain.progress.checkingFiles': 'Vérification des fichiers de preuve de ce site par rapport au contrat…',
  'app.chain.progress.preparing': 'Préparation de la transaction sur votre appareil…',
  'app.chain.progress.provingPhone':
    'Calcul de la preuve sur votre appareil. Sur un téléphone, cela peut prendre une minute…',
  'app.chain.progress.waiting': 'En attente de son inclusion par le réseau (en général moins d’une minute)…',
  'app.chain.progress.proving': 'Calcul de la preuve sur votre appareil…',
  'app.chain.progress.work': 'Un petit calcul pour montrer qu’il s’agit d’une personne et non d’un script…',
  'app.chain.progress.sending': 'Envoi à VeilCore, qui paie les frais du réseau…',
  'app.chain.progress.keys': 'Téléchargement des clés de preuve (la première fois seulement)…',
  'app.chain.progress.params': 'Téléchargement des paramètres publics (la première fois seulement)…',
  'app.chain.progress.answer': 'Envoi de la réponse…',
  'app.chain.progress.readingAnswer': 'Lecture de la réponse sur le réseau…',
  'app.chain.working': 'En cours…',
  'app.chain.txLine': '{label} : transaction {tx} · bloc {block}',
} satisfies Partial<AppTranslation>;
