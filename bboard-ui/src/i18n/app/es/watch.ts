// Español (usted). La comprobación al abrir la app (veilcore/record-watch.ts).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const watch = {
  'app.watch.this': 'Algo de este registro cambió en la red y no lo hizo este navegador.',
  'app.watch.home.one': 'Algo de «{name}» cambió en la red y no lo hizo este navegador.',
  'app.watch.home.other': 'Algo de {count} de sus registros cambió en la red y no lo hizo este navegador.',
  'app.watch.change.recovered': 'Se usó su secreto de recuperación para pasarlo a una clave nueva.',
  'app.watch.change.moved': 'Se pasó a una clave nueva.',
  'app.watch.change.recovery-replaced': 'Se reemplazó el secreto que puede pasarlo a una clave nueva.',
  'app.watch.what': 'Qué hacer',
  'app.watch.hide': 'Ocultar qué hacer',
  'app.watch.step.you':
    'Si lo hizo usted, en otro dispositivo o con la herramienta de línea de comandos de VeilCore, no pasa nada.',
  'app.watch.step.copy':
    'Si no fue usted, puede que alguien tenga una copia de las claves de este navegador o de un archivo de copia de seguridad. Deje de usar este ordenador para VeilCore hasta que lo hayan revisado, y no escriba en él su hoja de recuperación.',
  'app.watch.step.files': 'Guarde sus archivos de copia de seguridad sin conexión y póngale una contraseña a cada uno.',
  'app.watch.step.date': 'La fecha en que se selló por primera vez su registro sigue en la red. Nadie puede cambiarla.',
  'app.watch.step.help':
    'Este sitio todavía no puede recuperar un registro. <mail>Escriba a VeilCore</mail> e indique qué registro. Nunca envíe sus claves, un archivo de copia de seguridad ni su hoja de recuperación.',
  'app.watch.open': 'Abrir «{name}»',
  'app.watch.seen': 'Lo hice yo',
} satisfies Partial<AppTranslation>;
