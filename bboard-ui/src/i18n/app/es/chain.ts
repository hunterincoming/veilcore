// Spanish (neutral Latin American, usted). DRAFT: machine-assisted, to be checked by a fluent
// speaker before publishing (docs/translations/README.md). Terms as in ../../es.ts.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const chain = {
  'app.chain.inAboutMinutes.one': 'en aproximadamente {count} minuto',
  'app.chain.inAboutMinutes.other': 'en aproximadamente {count} minutos',
  'app.chain.inAFewMinutes': 'en unos minutos',
  'app.chain.txParen': ' (transacción {tx})',
  'app.chain.mayHaveGoneOut':
    'Puede que ya se haya enviado{tx}. No lo intente de nuevo hasta que esa transacción se haya comprobado en la red.',
  'app.chain.nothingSent': ' No se envió nada.',
  'app.chain.unreachable': 'No se pudo conectar con la red.{nothingSent} Inténtelo de nuevo {when}.',
  'app.chain.didntGoThrough': 'No se completó.{nothingSent} Inténtelo de nuevo {when}.',
  'app.chain.didntGoThroughBecause': 'No se completó: {reason}.{nothingSent}',
  'app.chain.details': 'Detalles',
  'app.chain.stampMayHaveGoneOut':
    'Puede que su sello de fecha ya se haya enviado{tx}. Su planta está guardada. No lo intente de nuevo hasta que esa transacción se haya comprobado en la red.',
  'app.chain.stampUnreachable':
    'No se pudo conectar con la red. Su planta está guardada. Inténtelo de nuevo {when} o haga el sello de fecha más tarde.',
  'app.chain.stampDidntGoThrough':
    'El sello de fecha no se completó. Su planta está guardada. Inténtelo de nuevo {when} o haga el sello de fecha más tarde.',
  'app.chain.progress.reading': 'Leyendo el contrato desde la red…',
  'app.chain.progress.checkingFiles': 'Comprobando los archivos de prueba de este sitio con el contrato…',
  'app.chain.progress.preparing': 'Preparando la transacción en su dispositivo…',
  'app.chain.progress.provingPhone': 'Generando la prueba en su dispositivo. En un teléfono puede tardar un minuto…',
  'app.chain.progress.waiting': 'Esperando a que la red la incluya (normalmente menos de un minuto)…',
  'app.chain.progress.proving': 'Generando la prueba en su dispositivo…',
  'app.chain.progress.work': 'Haciendo un pequeño trabajo para mostrar que es una persona y no un script…',
  'app.chain.progress.sending': 'Enviándola a VeilCore, que paga la tarifa de la red…',
  'app.chain.progress.keys': 'Descargando las claves de prueba (solo la primera vez)…',
  'app.chain.progress.params': 'Descargando los parámetros públicos (solo la primera vez)…',
  'app.chain.progress.answer': 'Enviando la respuesta…',
  'app.chain.progress.readingAnswer': 'Leyendo la respuesta desde la red…',
  'app.chain.working': 'Trabajando…',
  'app.chain.txLine': '{label}: transacción {tx} · bloque {block}',
} satisfies Partial<AppTranslation>;
