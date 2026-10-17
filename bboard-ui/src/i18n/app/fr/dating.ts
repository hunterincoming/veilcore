// French (vous). DRAFT: machine-assisted, to be checked by a fluent speaker before publishing
// (docs/translations/README.md). Dater d'abord, l'horodatage réessayé tout seul, « Reprenez
// où vous en étiez » et « Copier les détails pour l'assistance » (CONTRACT.md #38).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const dating = {
  'app.chain.progress.starting': 'Démarrage du générateur de preuves sur votre appareil…',

  'app.log.recordDatedNext.one':
    'Enregistrement daté : dans le prochain lot (environ toutes les {count} minute sur le réseau de test)',
  'app.log.recordDatedNext.other':
    'Enregistrement daté : dans le prochain lot (environ toutes les {count} minutes sur le réseau de test)',
  'app.log.recordDatedNextPlain': 'Enregistrement daté : dans le prochain lot',
  'app.log.inSeconds': 'dans {n} s',
  'app.log.retryingIn': 'Nouvel essai automatique {when} (essai {n}).',
  'app.log.retriesUsed':
    'Plusieurs essais ont été faits. Réessayez quand vous voulez : la date de votre enregistrement n’attend pas cela.',
  'app.log.tryNow': 'Réessayer maintenant',
  'app.log.keepsTrying':
    'Les essais continuent tout seuls tant que VeilCore est ouvert, et l’accueil l’affiche jusqu’à ce que cela passe.',

  'app.plant.nextBatch': 'dans le prochain lot',
  'app.plant.nextBatchEvery.one': 'environ toutes les {count} minute sur le réseau de test',
  'app.plant.nextBatchEvery.other': 'environ toutes les {count} minutes sur le réseau de test',
  'app.plant.notSentYet': 'pas encore envoyé à VeilCore ; nouvel essai automatique',
  'app.plant.keyStampRetrying':
    'Clé horodatée : pas encore. Cela n’est pas passé, et un nouvel essai est fait tout seul.',
  'app.plant.keyStampMaySent':
    'Clé horodatée : pas encore. Un horodatage est peut-être déjà parti, il n’est donc pas renvoyé tout seul : vérifiez ci-dessous avant de réessayer.',
  'app.plant.keyStampCannot':
    'Clé horodatée : pas encore. Ce site ne peut pas le faire pour l’instant ; la raison est ci-dessous.',

  'app.home.restoreFirstTitle': 'Vous avez utilisé VeilCore sur un autre appareil ?',
  'app.home.restoreFirstText':
    'Restaurez d’abord votre copie de secours. Vos enregistrements, leurs clés et la clé qui les ouvre reviennent dans ce navigateur.',
  'app.home.restoreFirstButton': 'Restaurer votre copie de secours',

  'app.pickup.title': 'Reprenez où vous en étiez',
  'app.pickup.open': 'Ouvrir',
  'app.pickup.tryNow': 'Essayer maintenant',
  'app.pickup.saveBackup': 'Enregistrer ma copie de secours',
  'app.pickup.freshBackupButton': 'Enregistrer une nouvelle copie de secours',
  'app.pickup.openAgreements': 'Ouvrir les contrats',
  'app.pickup.dating.notSent': '{name} : scellé. Son code de preuve part chez VeilCore dès que VeilCore répond.',
  'app.pickup.dating.next': '{name} : dans le prochain lot à dater.',
  'app.pickup.dating.nextEvery.one': '{name} : dans le prochain lot à dater (environ toutes les {count} minute).',
  'app.pickup.dating.nextEvery.other': '{name} : dans le prochain lot à dater (environ toutes les {count} minutes).',
  'app.pickup.dating.batched': '{name} : dans un lot, en attente de son horodatage.',
  'app.pickup.dating.progress': 'Étape {n} sur {total} vers sa date',
  'app.pickup.more.one': 'et {count} autre en route vers sa date',
  'app.pickup.more.other': 'et {count} autres en route vers leur date',
  'app.pickup.stamp.retrying':
    'L’horodatage de la clé de {name} n’est pas encore passé. Il est réessayé tout seul ; prochain essai {when}.',
  'app.pickup.stamp.now': 'Horodatage de la clé de {name} : essai en cours…',
  'app.pickup.stamp.paused': 'L’horodatage de la clé de {name} n’est pas passé après plusieurs essais.',
  'app.pickup.stamp.sent':
    'L’horodatage de la clé de {name} est peut-être déjà parti. Vérifiez-le sur sa page avant de réessayer.',
  'app.pickup.stamp.cannot':
    'L’horodatage de la clé de {name} ne peut pas être fait depuis ce site pour l’instant. Sa page dit pourquoi.',
  'app.pickup.lockedCopies.one':
    '{count} copie verrouillée pas encore envoyée — enregistrez et vérifiez votre copie de secours. La date de votre enregistrement n’attend pas cela.',
  'app.pickup.lockedCopies.other':
    '{count} copies verrouillées pas encore envoyées — enregistrez et vérifiez votre copie de secours. Les dates de vos enregistrements n’attendent pas cela.',
  'app.pickup.freshBackup.one':
    'Votre dernière copie de secours n’a pas les clés de {count} enregistrement plus récent. Enregistrez une nouvelle copie de secours.',
  'app.pickup.freshBackup.other':
    'Votre dernière copie de secours n’a pas les clés de {count} enregistrements plus récents. Enregistrez une nouvelle copie de secours.',
  'app.pickup.deliveriesSent.one': '{count} envoi au laboratoire, pas encore reçu.',
  'app.pickup.deliveriesSent.other': '{count} envois au laboratoire, pas encore reçus.',
  'app.pickup.deliveriesUnsigned.one': '{count} envoi reçu par le laboratoire, accusé de réception pas encore signé.',
  'app.pickup.deliveriesUnsigned.other':
    '{count} envois reçus par le laboratoire, accusés de réception pas encore signés.',
  'app.pickup.labUnsigned.one': '{count} échantillon reçu, accusé de réception pas encore signé.',
  'app.pickup.labUnsigned.other': '{count} échantillons reçus, accusés de réception pas encore signés.',
  'app.pickup.results.one': '{count} rapport de laboratoire attend d’être ouvert.',
  'app.pickup.results.other': '{count} rapports de laboratoire attendent d’être ouverts.',
  'app.pickup.agreements.one': '{count} contrat attend la contresignature de l’autre partie.',
  'app.pickup.agreements.other': '{count} contrats attendent la contresignature de l’autre partie.',

  'app.support.copy': 'Copier les détails pour l’assistance',
  'app.support.copied': 'Copié. Collez-le dans un e-mail à VeilCore.',
  'app.support.email': 'L’envoyer par e-mail à {email}',
  'app.support.selectIt': 'Ce navigateur ne l’a pas copié. Sélectionnez le texte ci-dessous et copiez-le :',
} satisfies Partial<AppTranslation>;
