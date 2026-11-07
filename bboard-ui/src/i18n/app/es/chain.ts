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
  // components/chain/FamilyOnChain.tsx: a record's parents and offspring on Midnight.
  'app.family.title': 'Familia en Midnight',
  'app.family.intro':
    'Parentesco que ambos titulares aceptaron, en la cadena. Es lo que permite a cualquiera comprobar la línea de una planta, y lo que lleva la regalía por descendencia de un progenitor a sus descendientes. Un enlace confirmado es público y permanente: no se puede deshacer, y las regalías que el titular del progenitor asuma después también aparecen en la línea de este registro.',
  'app.family.reading': 'Leyendo la cadena…',
  'app.family.parents': 'Progenitores:',
  'app.family.noneConfirmed': 'ninguno confirmado',
  'app.family.offspring': 'Descendencia:',
  'app.family.waitingParent':
    'Esperando a que {name} confirme que es progenitor. Su titular lo ve en la página de su registro.',
  'app.family.theRecord': 'el registro {key}',
  'app.family.takeBack': 'Retirar',
  'app.family.putOnChain': 'Poner «{name}» en Midnight como progenitor',
  'app.family.pasteLabel': 'Un progenitor en manos de otra persona: su enlace de comprobación o su clave en cadena',
  'app.family.nameIt': 'Nombrarlo',
  'app.family.namesParent':
    '{who} nombra este registro como progenitor. Confirme solo si de verdad procede de esta planta. Confirmar es público y permanente, y todo lo que se deba sobre esta planta, ahora o después, aparecerá en su línea.',
  'app.family.confirm': 'Confirmar',
  'app.family.confirmQ':
    '¿Confirmar que esta planta es progenitora de {who}? Confirme solo un registro que sepa que procede de ella. Esto es público y permanente: su línea, y todo lo que se deba sobre esta planta ahora o después, aparecerán en él.{fixes}',
  'app.family.confirmFixes':
    ' Una vez que un registro tiene descendencia confirmada, sus propios progenitores ya no pueden cambiar.',
  'app.family.notConfirmed': 'No confirmado.',
  'app.family.noParentHere': 'Este navegador no tiene el registro de ese progenitor.',
  'app.family.step1': 'Nombrando al progenitor en Midnight (1 de 2)…',
  'app.family.step2': 'Confirmándolo desde el progenitor (2 de 2)…',
  'app.family.readError': 'No se pudo leer la cadena: {error}',
  'app.family.named': '«{name}» (clave {key})',
  'app.family.namedKey': 'el registro con clave {key}',
} satisfies Partial<AppTranslation>;
