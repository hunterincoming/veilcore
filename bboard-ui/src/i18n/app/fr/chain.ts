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
  'app.chain.details': 'Détails',
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
  // components/chain/FamilyOnChain.tsx: a record's parents and offspring on Midnight.
  'app.family.title': 'Famille sur Midnight',
  'app.family.intro':
    'La filiation acceptée par les deux détenteurs, sur la chaîne. C’est ce qui permet à quiconque de vérifier la lignée d’une plante, et ce qui transmet la redevance sur la descendance d’un parent à ses descendants. Un lien confirmé est public et permanent : il ne peut pas être défait, et les redevances que le détenteur du parent accepte plus tard apparaissent aussi dans la lignée de cet enregistrement.',
  'app.family.reading': 'Lecture de la chaîne…',
  'app.family.parents': 'Parents :',
  'app.family.noneConfirmed': 'aucun confirmé',
  'app.family.offspring': 'Descendance :',
  'app.family.waitingParent':
    'En attente que {name} confirme être un parent. Son détenteur le voit sur la page de son enregistrement.',
  'app.family.theRecord': 'l’enregistrement {key}',
  'app.family.takeBack': 'Retirer',
  'app.family.putOnChain': 'Inscrire « {name} » sur Midnight comme parent',
  'app.family.pasteLabel': 'Un parent détenu par quelqu’un d’autre : son lien de vérification ou sa clé sur la chaîne',
  'app.family.nameIt': 'Le nommer',
  'app.family.namesParent':
    '{who} nomme cet enregistrement comme parent. Ne confirmez que s’il vient vraiment de cette plante. Confirmer est public et permanent, et tout ce qui est dû sur cette plante, maintenant ou plus tard, apparaîtra dans sa lignée.',
  'app.family.confirm': 'Confirmer',
  'app.family.confirmQ':
    'Confirmer que cette plante est un parent de {who} ? Ne confirmez qu’un enregistrement dont vous savez qu’il en vient. C’est public et permanent : sa lignée, et tout ce qui est dû sur cette plante maintenant ou plus tard, y apparaîtront.{fixes}',
  'app.family.confirmFixes':
    ' Une fois qu’un enregistrement a une descendance confirmée, ses propres parents ne peuvent plus changer.',
  'app.family.notConfirmed': 'Non confirmé.',
  'app.family.noParentHere': 'Ce navigateur ne détient pas l’enregistrement de ce parent.',
  'app.family.step1': 'Nomination du parent sur Midnight (1 sur 2)…',
  'app.family.step2': 'Confirmation depuis le parent (2 sur 2)…',
  'app.family.readError': 'Impossible de lire la chaîne : {error}',
  'app.family.named': '« {name} » (clé {key})',
  'app.family.namedKey': 'l’enregistrement de clé {key}',
} satisfies Partial<AppTranslation>;
