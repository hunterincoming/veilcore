// La app de registros en español: la primera pantalla de un registro nuevo (../en/start.ts).
// BORRADOR: traducción asistida por máquina, a revisar por un hablante nativo antes de publicar
// (docs/translations/README.md).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const start = {
  'app.start.title': '¿Qué quiere demostrar?',
  'app.start.intro': 'Elija uno. Puede sellar los demás después.',
  'app.start.plant': 'Plantas',
  'app.start.plantText': 'Una madre, una selección, un esqueje o una línea que usted crió a partir de semillas.',
  'app.start.animal': 'Animales',
  'app.start.animalText': 'Un padre, una madre u otro animal reproductor.',
  'app.start.strain': 'Microorganismos y líneas celulares',
  'app.start.strainText':
    'Levaduras, bacterias, hongos, líneas celulares y líneas de insectos. Para laboratorios y colecciones de cultivos.',
  'app.start.document': 'Un documento',
  'app.start.documentText':
    'Un resultado de laboratorio, un permiso, un contrato. El archivo nunca sale de su dispositivo.',
  'app.start.change': 'Cambiar lo que va a sellar',
} satisfies Partial<AppTranslation>;
