// Spanish (usted). DRAFT: machine-assisted, to be checked by a fluent speaker before publishing
// (docs/translations/README.md). Fechar primero, el sello de fecha reintentado solo, "Retome
// donde lo dejó" y "Copiar detalles para soporte" (CONTRACT.md #38).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const dating = {
  'app.chain.progress.starting': 'Iniciando el generador de pruebas en su dispositivo…',

  'app.log.recordDatedNext.one':
    'Registro fechado: en el próximo lote (aproximadamente cada {count} minuto en la red de pruebas)',
  'app.log.recordDatedNext.other':
    'Registro fechado: en el próximo lote (aproximadamente cada {count} minutos en la red de pruebas)',
  'app.log.recordDatedNextPlain': 'Registro fechado: en el próximo lote',
  'app.log.inSeconds': 'en {n} s',
  'app.log.retryingIn': 'Se volverá a intentar solo {when} (intento {n}).',
  'app.log.retriesUsed':
    'Se intentó varias veces. Vuelva a intentarlo cuando quiera: la fecha de su registro no espera por esto.',
  'app.log.tryNow': 'Intentar de nuevo ahora',
  'app.log.keepsTrying':
    'Se sigue intentando solo mientras VeilCore esté abierto, y la página de inicio lo muestra hasta que se complete.',

  'app.plant.nextBatch': 'en el próximo lote',
  'app.plant.nextBatchEvery.one': 'aproximadamente cada {count} minuto en la red de pruebas',
  'app.plant.nextBatchEvery.other': 'aproximadamente cada {count} minutos en la red de pruebas',
  'app.plant.notSentYet': 'aún no se envió a VeilCore; se vuelve a intentar solo',
  'app.plant.keyStampRetrying': 'Sello de fecha de la clave: todavía no. No se completó y se vuelve a intentar solo.',
  'app.plant.keyStampMaySent':
    'Sello de fecha de la clave: todavía no. Puede que uno ya se haya enviado, así que no se reenvía solo: compruébelo abajo antes de intentarlo de nuevo.',
  'app.plant.keyStampCannot':
    'Sello de fecha de la clave: todavía no. Este sitio no puede hacerlo ahora; el motivo está abajo.',

  'app.home.restoreFirstTitle': '¿Usó VeilCore en otro dispositivo?',
  'app.home.restoreFirstText':
    'Primero recupere su copia de seguridad. Sus registros, sus claves y la clave que los abre vuelven a este navegador.',
  'app.home.restoreFirstButton': 'Recuperar su copia de seguridad',

  'app.pickup.title': 'Retome donde lo dejó',
  'app.pickup.open': 'Abrir',
  'app.pickup.tryNow': 'Intentar ahora',
  'app.pickup.saveBackup': 'Guardar mi copia de seguridad',
  'app.pickup.freshBackupButton': 'Guardar una copia de seguridad nueva',
  'app.pickup.openAgreements': 'Abrir acuerdos',
  'app.pickup.dating.notSent': '{name}: sellado. Su código de prueba se envía a VeilCore en cuanto VeilCore responda.',
  'app.pickup.dating.next': '{name}: en el próximo lote que se fecha.',
  'app.pickup.dating.nextEvery.one': '{name}: en el próximo lote que se fecha (aproximadamente cada {count} minuto).',
  'app.pickup.dating.nextEvery.other':
    '{name}: en el próximo lote que se fecha (aproximadamente cada {count} minutos).',
  'app.pickup.dating.batched': '{name}: en un lote, esperando su sello de fecha.',
  'app.pickup.dating.progress': 'Paso {n} de {total} hacia su fecha',
  'app.pickup.more.one': 'y {count} más en camino a su fecha',
  'app.pickup.more.other': 'y {count} más en camino a su fecha',
  'app.pickup.stamp.retrying':
    'El sello de fecha de la clave de {name} aún no se completó. Se vuelve a intentar solo; próximo intento {when}.',
  'app.pickup.stamp.now': 'Sello de fecha de la clave de {name}: intentándolo ahora…',
  'app.pickup.stamp.paused': 'El sello de fecha de la clave de {name} no se completó tras varios intentos.',
  'app.pickup.stamp.sent':
    'Puede que el sello de fecha de la clave de {name} ya se haya enviado. Compruébelo en su página antes de intentarlo de nuevo.',
  'app.pickup.stamp.cannot':
    'El sello de fecha de la clave de {name} no se puede hacer desde este sitio ahora. Su página explica por qué.',
  'app.pickup.lockedCopies.one':
    '{count} copia bloqueada aún sin subir: guarde y compruebe su copia de seguridad. La fecha de su registro no espera por esto.',
  'app.pickup.lockedCopies.other':
    '{count} copias bloqueadas aún sin subir: guarde y compruebe su copia de seguridad. Las fechas de sus registros no esperan por esto.',
  'app.pickup.freshBackup.one':
    'Su última copia de seguridad no tiene las claves de {count} registro más reciente. Guarde una copia de seguridad nueva.',
  'app.pickup.freshBackup.other':
    'Su última copia de seguridad no tiene las claves de {count} registros más recientes. Guarde una copia de seguridad nueva.',
  'app.pickup.deliveriesSent.one': '{count} entrega enviada al laboratorio, aún no recibida.',
  'app.pickup.deliveriesSent.other': '{count} entregas enviadas al laboratorio, aún no recibidas.',
  'app.pickup.deliveriesUnsigned.one': '{count} entrega recibida por el laboratorio, acuse de recibo aún sin firmar.',
  'app.pickup.deliveriesUnsigned.other':
    '{count} entregas recibidas por el laboratorio, acuses de recibo aún sin firmar.',
  'app.pickup.labUnsigned.one': '{count} muestra recibida, acuse de recibo aún sin firmar.',
  'app.pickup.labUnsigned.other': '{count} muestras recibidas, acuses de recibo aún sin firmar.',
  'app.pickup.results.one': '{count} informe de laboratorio esperando a que lo abra.',
  'app.pickup.results.other': '{count} informes de laboratorio esperando a que los abra.',
  'app.pickup.agreements.one': '{count} acuerdo esperando la contrafirma de la otra parte.',
  'app.pickup.agreements.other': '{count} acuerdos esperando la contrafirma de la otra parte.',

  'app.support.copy': 'Copiar detalles para soporte',
  'app.support.copied': 'Copiado. Péguelo en un correo a VeilCore.',
  'app.support.email': 'Enviarlo por correo a {email}',
  'app.support.selectIt': 'Este navegador no lo copió. Seleccione el texto de abajo y cópielo:',
} satisfies Partial<AppTranslation>;
