// French (vous). Travailler sans réseau, et l’horodatage immédiat (docs/offline.md).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const offline = {
  'app.offline.sealedHere.phone':
    'Scellé sur ce téléphone à {time} (selon l’horloge de votre téléphone, non vérifiée). Daté quand il est envoyé.',
  'app.offline.sealedHere.computer':
    'Scellé sur cet ordinateur à {time} (selon l’horloge de votre ordinateur, non vérifiée). Daté quand il est envoyé.',
  'app.offline.short': 'Scellé {time}, daté à l’envoi',
  'app.offline.goesBySelf': 'Son code de preuve part tout seul quand vous êtes de nouveau en ligne.',
  'app.offline.bar':
    'Pas de réseau. Vous pouvez toujours créer et sceller des enregistrements ; chacun reçoit sa date une fois envoyé. Les vérifications, le partage, les remises aux laboratoires et les horodatages de clé attendent le réseau.',
  'app.offline.updated':
    'Une version plus récente de VeilCore est prête. Rechargez entre deux enregistrements ; rien de scellé n’est perdu.',
  'app.offline.reload': 'Recharger',
  'app.offline.stampWaits':
    'L’horodatage de votre clé attend, et démarre tout seul quand vous êtes de nouveau en ligne.',

  'app.install.title': 'Utiliser VeilCore sans réseau',
  'app.install.text':
    'Ajoutez VeilCore à votre écran d’accueil. Il s’ouvre alors sans réseau : vous pouvez créer et sceller des enregistrements, et chacun reçoit sa date une fois envoyé.',
  'app.install.button': 'Ajouter à l’écran d’accueil',
  'app.install.iosSteps': 'Sur iPhone ou iPad : dans Safari, touchez Partager, puis « Sur l’écran d’accueil ».',
  'app.install.iosEmpty':
    'D’abord, avec du réseau, laissez partir ce qui attend dans Safari. L’icône de l’écran d’accueil a ses propres données : elle s’ouvre donc vide ; vos enregistrements restent en sécurité dans Safari. Ouvrez l’icône avec du réseau et récupérez-les avec Face ID ou votre fichier de sauvegarde. Ensuite, utilisez l’icône : les enregistrements créés dans Safari n’y apparaissent pas.',
  'app.install.iosKeep':
    'Safari peut effacer un site que vous n’avez pas ouvert depuis 7 jours. L’icône de l’écran d’accueil est conservée. Gardez quand même votre sauvegarde.',
  'app.install.ready':
    'Ce navigateur garde l’app VeilCore : elle s’ouvre ici sans réseau. Vos enregistrements ont toujours besoin de votre sauvegarde.',
  'app.install.dismiss': 'Pas maintenant',

  'app.instant.pending':
    'Horodaté à {time} par le service {tsa} — la date sur Midnight, la blockchain, suit avec le prochain lot.',
  'app.instant.also': 'Horodaté aussi à {time} par le service {tsa}.',
  'app.instant.asking': 'Demande d’un jeton d’horodatage à un service d’horodatage…',
  'app.instant.fact':
    'Jeton d’horodatage de {tsa} : {time}. Cette page a vérifié sa signature sur le code de preuve, faite avec la clé que ce site indique pour {tsa}. Il montre que le code de preuve existait à cette heure ; il ne dit rien de plus ancien.',
  'app.verify.who.tsa': 'Un jeton d’horodatage ({tsa})',
  'app.verify.who.tsa.checked':
    '{time}. Cette page a vérifié sa signature, faite avec la clé que ce site indique pour ce service.',
  'app.verify.who.tsa.unbound':
    '{time}. Cette page a vérifié sa signature, faite avec la clé que ce site indique pour ce service, mais le lien ne contient pas de code de preuve pour le rapprocher. Demandez à l’expéditeur le lien de vérification complet.',
  'app.offline.goesOnOpen': 'Son code de preuve part la prochaine fois que vous ouvrez VeilCore avec du réseau.',
  'app.instant.disagree':
    'Les jetons d’horodatage de plusieurs services diffèrent de plus de cinq minutes. La page de vérification de l’enregistrement les liste tous.',
  'app.verify.who.tsa.disagree': 'Ces jetons d’horodatage diffèrent de plus de cinq minutes.',
} satisfies Partial<AppTranslation>;
