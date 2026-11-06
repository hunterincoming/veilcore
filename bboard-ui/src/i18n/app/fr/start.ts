// L’application en français : le premier écran d’un nouvel enregistrement (../en/start.ts).
// BROUILLON : traduction assistée par machine, à faire relire par un locuteur natif avant
// publication (docs/translations/README.md).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const start = {
  'app.start.title': 'Que voulez-vous prouver ?',
  'app.start.intro': 'Choisissez-en un. Vous pourrez sceller les autres ensuite.',
  'app.start.plant': 'Des plantes',
  'app.start.plantText':
    'Une plante mère, une sélection, un clone, ou une lignée que vous avez créée à partir de graines.',
  'app.start.animal': 'Des animaux',
  'app.start.animalText': 'Un père, une mère ou un autre reproducteur.',
  'app.start.strain': 'Micro-organismes et lignées cellulaires',
  'app.start.strainText':
    'Levures, bactéries, champignons, lignées cellulaires et lignées d’insectes. Pour les laboratoires et les collections de cultures.',
  'app.start.document': 'Un document',
  'app.start.documentText':
    'Un résultat de laboratoire, un permis, un contrat. Le fichier ne quitte jamais votre appareil.',
  'app.start.change': 'Changer ce que vous scellez',
} satisfies Partial<AppTranslation>;
