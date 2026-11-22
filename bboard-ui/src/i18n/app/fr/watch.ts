// Français (vous). La vérification à l’ouverture de l’app (veilcore/record-watch.ts).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const watch = {
  'app.watch.this': 'Quelque chose a changé sur le réseau pour cet enregistrement, et ce n’est pas ce navigateur.',
  'app.watch.home.one': 'Quelque chose a changé sur le réseau pour « {name} », et ce n’est pas ce navigateur.',
  'app.watch.home.other':
    'Quelque chose a changé sur le réseau pour {count} de vos enregistrements, et ce n’est pas ce navigateur.',
  'app.watch.change.recovered': 'Son secret de secours a servi à le passer sur une nouvelle clé.',
  'app.watch.change.moved': 'Il a été passé sur une nouvelle clé.',
  'app.watch.change.recovery-replaced': 'Le secret qui peut le passer sur une nouvelle clé a été remplacé.',
  'app.watch.what': 'Que faire',
  'app.watch.hide': 'Masquer les étapes',
  'app.watch.step.you':
    'Si vous l’avez fait vous-même, sur un autre appareil ou avec l’outil en ligne de commande de VeilCore, tout va bien.',
  'app.watch.step.copy':
    'Sinon, quelqu’un a peut-être une copie des clés de ce navigateur ou d’un fichier de sauvegarde. N’utilisez plus cet ordinateur pour VeilCore tant qu’il n’a pas été vérifié, et n’y tapez pas votre fiche de secours.',
  'app.watch.step.files': 'Gardez vos fichiers de sauvegarde hors ligne, et donnez un mot de passe à chacun.',
  'app.watch.step.date':
    'La date à laquelle votre enregistrement a été horodaté la première fois reste sur le réseau. Personne ne peut la changer.',
  'app.watch.step.help':
    'Ce site ne peut pas encore reprendre un enregistrement. <mail>Écrivez à VeilCore</mail> en indiquant lequel. N’envoyez jamais ses clés, un fichier de sauvegarde ni votre fiche de secours.',
  'app.watch.open': 'Ouvrir « {name} »',
  'app.watch.seen': 'C’était moi',
} satisfies Partial<AppTranslation>;
