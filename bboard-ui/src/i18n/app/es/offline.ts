// Spanish (usted). Trabajar sin señal, y el sello de tiempo inmediato (docs/offline.md).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const offline = {
  'app.offline.sealedHere.phone':
    'Sellado en este teléfono a las {time} (según el reloj de su teléfono). Se fecha cuando se envía.',
  'app.offline.sealedHere.computer':
    'Sellado en esta computadora a las {time} (según el reloj de su computadora). Se fecha cuando se envía.',
  'app.offline.short': 'Sellado {time}, se fecha al enviarse',
  'app.offline.goesBySelf':
    'Ahora no hay señal. Se envía solo cuando vuelva a tener conexión, y se fecha en ese momento.',
  'app.offline.bar':
    'Sin señal. Puede seguir creando y sellando registros aquí; cada uno se fecha cuando se envía. Comprobar, compartir y los sellos de fecha esperan hasta que vuelva a tener conexión.',
  'app.offline.updated': 'Hay una versión más nueva de VeilCore lista.',
  'app.offline.reload': 'Volver a cargar',
  'app.offline.stampWaits':
    'Sin señal. El sello de fecha de la clave espera y empieza solo cuando vuelva a tener conexión.',

  'app.install.title': 'Usar VeilCore sin señal',
  'app.install.text':
    'Agregue VeilCore a su pantalla de inicio. Así se abre sin señal: puede crear y sellar registros, y cada uno se fecha cuando vuelva a tener conexión.',
  'app.install.button': 'Agregar a la pantalla de inicio',
  'app.install.iosSteps': 'En iPhone o iPad: en Safari, toque Compartir y luego “Agregar a inicio”.',
  'app.install.iosEmpty':
    'La app de la pantalla de inicio guarda sus datos aparte de Safari, así que se abre vacía. Ábrala una vez con señal y recupere allí sus registros (Face ID o su archivo de copia de seguridad). Antes, deje que se envíe lo que todavía espera en Safari.',
  'app.install.iosKeep':
    'En la pantalla de inicio, VeilCore no se borra como Safari borra los sitios que no abrió en 7 días. Conserve igual su copia de seguridad.',
  'app.install.ready': 'Este navegador guarda una copia de VeilCore, así que aquí se abre sin señal.',
  'app.install.dismiss': 'Ahora no',

  'app.instant.pending': 'Sello de tiempo {time} de {tsa} — la fecha en Midnight llega con el próximo lote.',
  'app.instant.also': 'También tiene sello de tiempo {time} de {tsa}.',
  'app.instant.asking': 'Pidiendo un sello de tiempo a una autoridad de sellado de tiempo…',
  'app.instant.fact':
    'Sello de tiempo de {tsa}: {time}. Esta página comprobó su firma sobre el código de prueba. Muestra que el código de prueba ya existía a esa hora, no antes.',
  'app.verify.who.tsa': 'Un sello de tiempo ({tsa})',
  'app.verify.who.tsa.checked': '{time}, firmado por la autoridad de sellado de tiempo. Esta página comprobó la firma.',
  'app.verify.who.tsa.unbound':
    '{time}, firmado por la autoridad de sellado de tiempo. Esta página comprobó la firma, pero el enlace no lleva un código de prueba para compararlo.',
} satisfies Partial<AppTranslation>;
