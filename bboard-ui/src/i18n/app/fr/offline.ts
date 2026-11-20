// French (vous). Travailler sans réseau, et l’horodatage immédiat (docs/offline.md).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const offline = {
  'app.offline.sealedHere.phone':
    'Scellé sur ce téléphone à {time} (selon l’horloge de votre téléphone). Daté quand il est envoyé.',
  'app.offline.sealedHere.computer':
    'Scellé sur cet ordinateur à {time} (selon l’horloge de votre ordinateur). Daté quand il est envoyé.',
  'app.offline.short': 'Scellé {time}, daté à l’envoi',
  'app.offline.goesBySelf':
    'Pas de réseau pour l’instant. Il part tout seul quand vous êtes de nouveau en ligne, et il est daté à ce moment-là.',
  'app.offline.bar':
    'Pas de réseau. Vous pouvez toujours créer et sceller des enregistrements ici ; chacun est daté quand il est envoyé. Les vérifications, le partage et les horodatages attendent votre retour en ligne.',
  'app.offline.updated': 'Une version plus récente de VeilCore est prête.',
  'app.offline.reload': 'Recharger',
  'app.offline.stampWaits':
    'Pas de réseau. L’horodatage de la clé attend, et démarre tout seul quand vous êtes de nouveau en ligne.',

  'app.install.title': 'Utiliser VeilCore sans réseau',
  'app.install.text':
    'Ajoutez VeilCore à votre écran d’accueil. Il s’ouvre alors sans réseau : vous pouvez créer et sceller des enregistrements, et chacun est daté quand vous êtes de nouveau en ligne.',
  'app.install.button': 'Ajouter à l’écran d’accueil',
  'app.install.iosSteps': 'Sur iPhone ou iPad : dans Safari, touchez Partager, puis « Sur l’écran d’accueil ».',
  'app.install.iosEmpty':
    'L’app de l’écran d’accueil garde ses propres données, à part de Safari : elle s’ouvre donc vide. Ouvrez-la une fois avec du réseau et récupérez-y vos enregistrements (Face ID ou votre fichier de sauvegarde). Laissez d’abord partir ce qui attend encore dans Safari.',
  'app.install.iosKeep':
    'Sur l’écran d’accueil, VeilCore n’est pas effacé comme Safari efface les sites que vous n’avez pas ouverts depuis 7 jours. Gardez quand même votre sauvegarde.',
  'app.install.ready': 'Ce navigateur garde une copie de VeilCore : il s’ouvre ici sans réseau.',
  'app.install.dismiss': 'Pas maintenant',

  'app.instant.pending': 'Horodaté à {time} par {tsa} — la date sur Midnight suit avec le prochain lot.',
  'app.instant.also': 'Horodaté aussi à {time} par {tsa}.',
  'app.instant.asking': 'Demande d’un horodatage à une autorité d’horodatage…',
  'app.instant.fact':
    'Horodatage de {tsa} : {time}. Cette page a vérifié sa signature sur le code de preuve. Il montre que le code de preuve existait à cette heure, rien d’antérieur.',
  'app.verify.who.tsa': 'Un horodatage ({tsa})',
  'app.verify.who.tsa.checked': '{time}, signé par l’autorité d’horodatage. Cette page a vérifié la signature.',
  'app.verify.who.tsa.unbound':
    '{time}, signé par l’autorité d’horodatage. Cette page a vérifié la signature, mais le lien ne contient pas de code de preuve pour le rapprocher.',
} satisfies Partial<AppTranslation>;
