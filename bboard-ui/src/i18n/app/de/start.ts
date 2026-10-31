// Die Datensatz-App auf Deutsch: der erste Bildschirm eines neuen Datensatzes (../en/start.ts).
// ENTWURF: maschinell unterstützt, vor der Veröffentlichung von einer Muttersprachlerin oder
// einem Muttersprachler zu prüfen (docs/translations/README.md).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const start = {
  'app.start.title': 'Was möchten Sie belegen?',
  'app.start.intro': 'Wählen Sie eines. Die anderen können Sie danach versiegeln.',
  'app.start.plant': 'Pflanzen',
  'app.start.plantText':
    'Eine Mutterpflanze, eine Auslese, ein Steckling oder eine Linie, die Sie aus Samen gezüchtet haben.',
  'app.start.animal': 'Tiere',
  'app.start.animalText': 'Ein Vatertier, ein Muttertier oder ein anderes Zuchttier.',
  'app.start.strain': 'Mikroorganismen und Zelllinien',
  'app.start.strainText': 'Hefen, Bakterien, Pilze, Zelllinien und Insektenlinien. Für Labore und Stammsammlungen.',
  'app.start.document': 'Ein Dokument',
  'app.start.documentText': 'Ein Laborergebnis, eine Genehmigung, ein Vertrag. Die Datei verlässt Ihr Gerät nie.',
  'app.start.change': 'Ändern, was Sie versiegeln',
} satisfies Partial<AppTranslation>;
