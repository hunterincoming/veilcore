// Spanish (usted). Trabajar sin señal, y el sello de tiempo inmediato (docs/offline.md).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const offline = {
  'app.offline.sealedHere':
    'Sellado en este dispositivo a las {time} (según el reloj de este dispositivo, sin comprobar). Se fecha cuando se envía.',
  'app.offline.short': 'Sellado {time}, se fecha al enviarse',
  'app.offline.goesBySelf': 'Su código de prueba se envía solo cuando vuelva a tener conexión.',
  'app.offline.bar':
    'Sin señal. Puede seguir creando y sellando registros; cada uno recibe su fecha una vez enviado. Comprobar, compartir, las entregas a laboratorios y los sellos de fecha de claves esperan a que haya señal.',
  'app.offline.updated':
    'Hay una versión más nueva de VeilCore lista. Vuelva a cargar entre un registro y otro; no se pierde nada sellado.',
  'app.offline.reload': 'Volver a cargar',
  'app.offline.stampWaits': 'El sello de fecha de su clave espera y empieza solo cuando vuelva a tener conexión.',

  'app.install.title': 'Usar VeilCore sin señal',
  'app.install.text':
    'Agregue VeilCore a su pantalla de inicio. Así se abre sin señal: puede crear y sellar registros, y cada uno recibe su fecha una vez enviado.',
  'app.install.button': 'Agregar a la pantalla de inicio',
  'app.install.iosSteps': 'En iPhone o iPad: en Safari, toque Compartir y luego “Agregar a inicio”.',
  'app.install.iosEmpty':
    'Primero, con señal, deje que se envíe lo que espera en Safari. El ícono de la pantalla de inicio guarda sus datos aparte, así que se abre vacío; sus registros siguen a salvo en Safari. Abra el ícono con señal y recupérelos allí con el bloqueo de este dispositivo o su archivo de copia de seguridad. Desde entonces, use el ícono: los registros creados en Safari no aparecen allí.',
  'app.install.iosKeep':
    'Safari puede borrar un sitio que no abrió en 7 días. El ícono de la pantalla de inicio se conserva. Conserve igual su copia de seguridad.',
  'app.install.ready':
    'Este navegador guarda la app de VeilCore, así que aquí se abre sin señal. Sus registros siguen necesitando su copia de seguridad.',
  'app.install.dismiss': 'Ahora no',
  'app.install.showHow': 'Mostrarme cómo',
  'app.install.gotIt': 'Entendido',

  'app.instant.pending':
    'Sello de tiempo {time} de {tsa} — la fecha en Midnight, la blockchain, llega con el próximo lote.',
  'app.instant.also': 'También tiene sello de tiempo {time} de {tsa}.',
  'app.instant.asking': 'Pidiendo un sello de tiempo a una autoridad de sellado de tiempo…',
  'app.instant.fact':
    'Sello de tiempo de {tsa}: {time}. Esta página comprobó su firma sobre el código de prueba, hecha con la clave que este sitio indica para {tsa}. Muestra que el código de prueba ya existía a esa hora; no dice nada sobre antes.',
  'app.verify.who.tsa': 'Un sello de tiempo ({tsa})',
  'app.verify.who.tsa.checked':
    '{time}. Esta página comprobó su firma, hecha con la clave que este sitio indica para esa autoridad.',
  'app.verify.who.tsa.unbound':
    '{time}. Esta página comprobó su firma, hecha con la clave que este sitio indica para esa autoridad, pero el enlace no lleva un código de prueba para compararlo. Pida a quien se lo envió el enlace de comprobación completo.',
  'app.offline.goesOnOpen': 'Su código de prueba se envía la próxima vez que abra VeilCore con señal.',
  'app.instant.disagree':
    'Los sellos de tiempo de más de una autoridad difieren en más de cinco minutos. La página de comprobación del registro muestra cada uno.',
  'app.verify.who.tsa.disagree': 'Estos sellos de tiempo difieren en más de cinco minutos.',
} satisfies Partial<AppTranslation>;
