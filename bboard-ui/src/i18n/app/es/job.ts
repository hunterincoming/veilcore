// La app de registros en español: «Hazlo por mí» en Preguntar a VeilCore (../en/job.ts).
// DRAFT: machine-assisted, to be checked by a fluent speaker before publishing (docs/translations/README.md).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const job = {
  'app.job.mode': 'Hazlo por mí',
  'app.job.modeHelp':
    'Lo preparo todo en este dispositivo y le muestro un resultado. No se envía nada hasta que usted lo apruebe.',
  'app.job.working': 'Preparándolo. No se envía nada hasta que usted lo apruebe.',
  'app.job.privacy':
    'El trabajo se guarda solo en este dispositivo, nunca en una copia de seguridad, y se borra 7 días después de terminar.',

  'app.job.no.hint': 'Cambie primero el ejemplo o escriba el suyo: un trabajo solo empieza con lo que usted escribe.',
  'app.job.no.negation': 'No actúo sobre una petición que dice qué no hacer. Diga solo qué hacer.',
  'app.job.no.leftover': 'No pude usar todas las palabras: «{words}». Dígalo de forma más sencilla.',
  'app.job.no.tooMany': 'Es más de lo que puedo hacer a la vez. Pida una sola cosa.',
  'app.job.no.oneJob': 'Hago un trabajo cada vez. Pida el primero.',
  'app.job.no.partB': 'Licenciar aún no forma parte de «Hazlo por mí». Abra la página del registro para licenciarlo.',
  'app.job.no.money': 'No envío ni prometo dinero. Los informes de regalías están en «Qué vence».',
  'app.job.no.notJob':
    'Las pruebas, transferencias, correcciones y eliminaciones se hacen en la página del propio registro.',
  'app.job.no.stampAll': 'Solo sello un registro que va a licenciar. Diga «prepara», su nombre y «para licenciar».',
  'app.job.no.received': 'Ese registro vino de otra persona, así que no lo uso aquí.',
  'app.job.no.noRecord': 'No encontré ese registro en este navegador. Use su nombre tal como aparece en su página.',
  'app.job.no.wrongKind':
    'Ese registro no es del tipo adecuado: los esquejes vienen de una planta, las crías de animales.',
  'app.job.no.count': 'Diga cuántos, una vez: por ejemplo «12 esquejes».',
  'app.job.no.sexCount': 'Los números no cuadran. Diga cuántos en total y cuántos de cada uno.',
  'app.job.no.unknown': 'No puedo hacer eso como trabajo. Lo más cercano:',
  'app.job.no.vault': 'Abra VeilCore una vez con conexión primero.',
  'app.job.no.records': 'Un registro que este trabajo necesita ya no está aquí o no se pudo sellar.',
  'app.job.no.already': 'Estos son registros que ya tiene.',
  'app.job.no.nothingDue': 'Ahora mismo no vence ningún informe de sus acuerdos.',
  'app.job.no.tooManyReports':
    'Vencen {n} informes: más de los que envío a la vez (5). Abra cada acuerdo para informar.',
  'app.job.no.offline':
    'Los últimos mensajes de sus acuerdos no se pueden leer sin conexión. Vuelva a intentarlo cuando esté en línea.',
  'app.job.no.noChain': 'Este sitio no puede poner sellos de fecha ahora mismo.',
  'app.job.no.noKey': 'La clave de este registro no está en este navegador. Restaure primero su copia de seguridad.',
  'app.job.no.readyNow': 'Ese registro ya está listo para licenciar.',
  'app.job.no.file': 'No se pudo usar ese archivo.',
  'app.job.no.changed': 'Este trabajo cambió en otra pestaña. Revíselo de nuevo.',
  'app.job.no.notReady': 'Este trabajo ya no espera su aprobación.',
  'app.job.no.expired': 'Este trabajo tiene más de 72 horas. Pídalo de nuevo para hacer uno nuevo.',
  'app.job.no.gone': 'Este trabajo ya no está en este navegador.',
  'app.job.open': 'Revisarlo',

  'app.job.title.clones.one': 'Revise esto: {count} esqueje de {name}',
  'app.job.title.clones.other': 'Revise esto: {count} esquejes de {name}',
  'app.job.title.offspring.one': 'Revise esto: {count} cría de {name}',
  'app.job.title.offspring.other': 'Revise esto: {count} crías de {name}',
  'app.job.title.import': 'Revise esto: su colección desde un archivo',
  'app.job.title.due.one': 'Revise esto: {count} informe para enviar',
  'app.job.title.due.other': 'Revise esto: {count} informes para enviar',
  'app.job.title.ready': 'Revise esto: dejar {name} listo para licenciar',

  'app.job.answer.title': 'Solo usted puede responder',
  'app.job.answer.bredBy': '¿Quién los crió?',
  'app.job.answer.taxon': '¿De qué especie son?',
  'app.job.answer.scheme': '¿Qué tipo de identificación son?',
  'app.job.answer.ids': 'Identificaciones (opcional): pegue una columna, una por línea, en orden',
  'app.job.answer.idsLater': '¿Aún sin identificaciones? Déjelo vacío: el inicio se lo recordará.',
  'app.job.answer.idsCount': '{n} de {count} pegadas.',
  'app.job.answer.file': 'Elija el archivo con su colección (CSV o Excel).',
  'app.job.answer.filePick': 'Elegir un archivo',
  'app.job.answer.use': 'Usar esto',
  'app.job.answer.backup': 'Guarde su copia de seguridad y compruébela (abajo).',

  'app.job.made.title': 'Lo que preparé',
  'app.job.made.records.one': '{count} registro, sellado aquí y no enviado: {first}',
  'app.job.made.records.other': '{count} registros, sellados aquí y no enviados: de {first} a {last}',
  'app.job.made.cutFrom': 'Cortados de {name}, con fecha de hoy ({date})',
  'app.job.made.born': 'Nacidos hoy ({date})',
  'app.job.made.dam': 'Madre: {name}',
  'app.job.made.sire': 'Padre: {name}',
  'app.job.made.sireTyped': 'Padre fuera de VeilCore: {code}',
  'app.job.made.sexes': '{m} machos, {f} hembras, {u} sin indicar',
  'app.job.made.tags': 'Etiquetas de planta de {first} a {last}',
  'app.job.made.ids': 'Identificaciones: de {first} a {last}',
  'app.job.made.noIds.one': 'Aún sin identificación para {count}: el inicio se la pedirá.',
  'app.job.made.noIds.other': 'Aún sin identificaciones para {count}: el inicio se las pedirá.',
  'app.job.made.importReady.one': '{count} listo',
  'app.job.made.importReady.other': '{count} listos',
  'app.job.made.importFix.one':
    '{count} necesita una corrección (fila {rows}): corríjala en el archivo y vuelva a traerlo.',
  'app.job.made.importFix.other':
    '{count} necesitan una corrección (filas {rows}): corríjalas en el archivo y vuelva a traerlo.',
  'app.job.made.expect': 'Dijo {n}; el archivo tiene {m} listos.',
  'app.job.made.file': 'De {file}',
  'app.job.made.report': 'Informe del {from} al {to}',
  'app.job.made.namedBy': '«{label}», nombrado por la otra parte',
  'app.job.made.stamp': 'Un sello de fecha en Midnight para la clave de {name}',
  'app.job.made.stamped': 'La clave de {name} ya está sellada.',

  'app.job.approve.title': 'Cuando lo apruebe',
  'app.job.approve.before': 'Hasta que lo apruebe, «Descartar» lo quita todo: no se ha enviado nada.',
  'app.job.approve.permanent': 'No se puede deshacer',
  'app.job.approve.records.one':
    '{count} registro guardado y fechado. Es permanente: puede corregir un error más tarde, pero no borrar un registro.',
  'app.job.approve.records.other':
    '{count} registros guardados y fechados. Es permanente: puede corregir un error más tarde, pero no borrar un registro.',
  'app.job.approve.reports':
    'Los informes enviados no se pueden retirar. Si uno está mal, pida al licenciante que lo marque como «Pedir corrección» y luego envíe uno corregido.',
  'app.job.approve.stampToday':
    '{name} recibe hoy un sello de fecha en Midnight. Hace falta para licenciarlo. Hasta 3 al día son gratis.',
  'app.job.approve.stampTomorrow':
    'El sello de {name} sale mañana: los sellos gratuitos de hoy parecen agotados desde aquí.',
  'app.job.approve.public': 'Qué se hace público',
  'app.job.approve.publicRecords':
    'El código de prueba de cada registro va al servidor de VeilCore y se fecha en Midnight en un lote. Los nombres y detalles van cerrados con su clave: el servidor no puede leerlos.',
  'app.job.approve.publicReports':
    'Nada público: cada informe va al licenciante, cerrado, por el canal propio de su acuerdo.',
  'app.job.approve.offline':
    '¿Sin señal? No pasa nada. Lo enviaré cuando vuelva a estar en línea, con VeilCore abierto.',

  'app.job.backup.records.one':
    'Guarde primero su copia de seguridad. Sin ella, perder este teléfono es perder este registro.',
  'app.job.backup.records.other':
    'Guarde primero su copia de seguridad. Sin ella, perder este teléfono es perder estos {count} registros.',
  'app.job.backup.ready':
    'Guarde primero su copia de seguridad. Un acuerdo no se puede guardar hasta que una copia comprobada tenga su clave.',
  'app.job.backup.done': 'Copia de seguridad comprobada.',
  'app.job.backup.finish': 'Volver al trabajo',

  'app.job.btn.records.one': 'Aprobar: guardar {count} registro',
  'app.job.btn.records.other': 'Aprobar: guardar {count} registros',
  'app.job.btn.reports.one': 'Aprobar: enviar {count} informe, {total} adeudado en total',
  'app.job.btn.reports.other': 'Aprobar: enviar {count} informes, {total} adeudado en total',
  'app.job.btn.stamp': 'Aprobar: sellar {name}',
  'app.job.btn.ready': 'Aprobar',
  'app.job.btn.change': 'Cambiar algo',
  'app.job.btn.discard': 'Descartar',
  'app.job.left.questions.one': 'Responda {count} pregunta para aprobar',
  'app.job.left.questions.other': 'Responda {count} preguntas para aprobar',
  'app.job.left.scroll': 'Lea «No se puede deshacer» para aprobar',
  'app.job.left.ready': 'Listo para aprobar',
  'app.job.readOnly': 'Ábralo desde el inicio para aprobarlo.',
  'app.job.discarded': 'Descartado. No se envió nada.',

  'app.job.report.sales': 'Ventas del {from} al {to} ({currency})',
  'app.job.report.units': 'Unidades del {from} al {to}',
  'app.job.report.offspring': 'Descendencia, mismo periodo',
  'app.job.report.nothing': 'Nada que informar',
  'app.job.report.owed': '{amount} adeudado',
  'app.job.report.topUp': 'Al enviarlo puede añadirse un complemento hasta el mínimo anual.',

  'app.job.progress.running': 'Haciéndolo',
  'app.job.progress.approved': 'Aprobado',
  'app.job.progress.done': 'Hecho',
  'app.job.progress.stopped': 'Detenido',
  'app.job.progress.expired': 'Caducado: no se envía nada más',
  'app.job.progress.discarded': 'Descartado: no se envió nada',
  'app.job.step.records.one': 'Guardar {count} registro',
  'app.job.step.records.other': 'Guardar {count} registros',
  'app.job.step.report': 'Enviar el informe del {from} al {to}',
  'app.job.step.stamp': 'Sellar con fecha {name}',
  'app.job.state.todo': 'En espera',
  'app.job.state.running': 'Enviando…',
  'app.job.state.done': 'Hecho',
  'app.job.state.failed': 'Rechazado',
  'app.job.state.needsYou': 'Le necesita',
  'app.job.state.waiting': 'Nuevo intento {when}',
  'app.job.done.records.one': '{count} registro guardado.',
  'app.job.done.records.other': '{count} registros guardados.',
  'app.job.done.reports': 'Informes enviados. El licenciante responde en la página de cada acuerdo.',
  'app.job.done.ready': '{name}: listo para licenciar.',
  'app.job.done.already': 'Ya estaba: no se envió nada nuevo.',
  'app.job.needs.report':
    'Puede que este informe ya haya salido. Abra el acuerdo para comprobarlo. Reintentar no envía nada dos veces: primero lo comprueba.',
  'app.job.needs.stamp': 'Puede que este sello ya haya salido. Abra el registro para comprobarlo antes de reintentar.',
  'app.job.why': 'Lo que dijo: {why}',
  'app.job.tryAgain': 'Reintentar',
  'app.job.openRecord': 'Abrir el registro',
  'app.job.openAgreement': 'Abrir el acuerdo',
  'app.job.toRecords': 'Ir a sus registros',

  'app.job.home.title': 'Trabajos de Preguntar a VeilCore',
  'app.job.home.check': 'Un trabajo está listo para que lo revise.',
  'app.job.home.needs': 'Un trabajo le necesita.',
  'app.job.home.running': 'Se está haciendo un trabajo.',
  'app.job.home.ready': '{name}: listo para licenciar',
  'app.job.home.tomorrow': '{name}: listo mañana',
  'app.job.home.ids.one': 'Añadir {count} identificación',
  'app.job.home.ids.other': 'Añadir {count} identificaciones',
  'app.job.home.open': 'Abrir',
} satisfies Partial<AppTranslation>;
