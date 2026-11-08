// La app de registros en español: «Hazlo por mí» en Preguntar a VeilCore (../en/job.ts).
// «tarea» para cada trabajo; «dar en licencia» en vez de «licenciar» (users' review, 8 Nov 2026).
// DRAFT: machine-assisted, to be checked by a fluent speaker before publishing (docs/translations/README.md).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const job = {
  'app.job.mode': 'Hazlo por mí',
  'app.job.modeHelp':
    'Lo preparo todo en este dispositivo y le muestro un resultado. No se envía nada hasta que usted lo apruebe.',
  'app.job.can': 'Hazlo por mí: preparo una tarea completa y usted la aprueba una vez.',
  'app.job.working': 'Preparándolo. No se envía nada hasta que usted lo apruebe.',
  'app.job.privacy':
    'La tarea se guarda solo en este dispositivo, nunca en una copia de seguridad, y se borra 7 días después de terminar.',

  'app.job.understood': 'Entendí «{text}».',
  'app.job.use': 'Usar «{text}»',
  'app.job.newRecord': 'Nuevo registro',
  'app.job.suggest.ready': 'prepara {name} para licenciar',
  'app.job.no.hint': 'Cambie primero el ejemplo o escriba el suyo: una tarea solo empieza con lo que usted escribe.',
  'app.job.no.negation':
    'No puedo leer «no» ni «sin» en una tarea. Diga solo qué hacer: por ejemplo «Daisy parió hoy, crotal después».',
  'app.job.no.leftover': 'No pude usar «{words}».',
  'app.job.no.tooMany': 'Es más de lo que puedo hacer a la vez. Pida una sola cosa.',
  'app.job.no.oneJob': 'Hago una tarea cada vez. Pida la primera.',
  'app.job.no.partB': 'Aún no puedo hacer la licencia. Puedo hacer ahora la primera parte.',
  'app.job.no.money': 'No envío ni prometo dinero. Los informes de regalías están en «Qué vence».',
  'app.job.no.notJob':
    'Las pruebas, transferencias, correcciones y eliminaciones se hacen en la página del propio registro.',
  'app.job.no.stampAll':
    'Solo sello un registro que va a dar en licencia. Diga «prepara», su nombre y «para licenciar».',
  'app.job.no.received': 'Ese registro vino de otra persona, así que no lo uso aquí.',
  'app.job.no.noRecord': 'Nombre uno de sus registros: la planta de la que corta, o la madre o el padre.',
  'app.job.no.notFound': 'No encuentro «{words}» en sus registros. Añádalo primero y vuelva a pedirlo.',
  'app.job.no.twoRecords':
    'Dos de sus registros se llaman «{words}». Cambie el nombre de uno, o empiece desde la página del registro.',
  'app.job.no.wrongKind':
    'Ese registro no es del tipo adecuado: los esquejes vienen de una planta, las crías de animales.',
  'app.job.no.count':
    'Diga cuántos, una vez: por ejemplo «12 esquejes». Una identificación es de un animal: para varios, pegue sus identificaciones en la pantalla siguiente.',
  'app.job.no.sexCount': 'Los números no cuadran. Diga cuántos en total y cuántos de cada uno.',
  'app.job.no.unknown': 'No puedo hacer «{words}» como parte de una tarea. Lo más cercano:',
  'app.job.no.vault': 'Abra VeilCore una vez con conexión primero.',
  'app.job.no.paused': 'En esta página no se preparan tareas. Vaya primero a sus registros.',
  'app.job.no.records': 'Un registro que esta tarea necesita ya no está aquí o no se pudo sellar.',
  'app.job.no.already': 'Estos son registros que ya tiene.',
  'app.job.no.nothingDue': 'Ahora mismo no vence ningún informe de sus acuerdos.',
  'app.job.no.tooManyReports':
    'Vencen {n} informes: más de los que envío a la vez (5). Abra cada acuerdo para informar.',
  'app.job.no.offline':
    'Los últimos mensajes de sus acuerdos no se pueden leer sin conexión. Vuelva a intentarlo cuando esté en línea.',
  'app.job.no.noChain': 'Este sitio no puede poner sellos de fecha ahora mismo.',
  'app.job.no.noKey': 'La clave de este registro no está en este navegador. Restaure primero su copia de seguridad.',
  'app.job.no.readyNow': 'Ese registro ya está listo para dar en licencia.',
  'app.job.no.file': 'No se pudo usar ese archivo.',
  'app.job.no.changed': 'Esta tarea cambió en otra pestaña. Revísela de nuevo.',
  'app.job.no.whichDay': '«{words}» es ayer en francés y «aquí» en alemán. ¿Qué día quiere decir?',
  'app.job.no.notReady': 'Esta tarea ya no espera su aprobación.',
  'app.job.no.expired': 'Esta tarea tiene más de 72 horas. Vuelva a pedirla para crear una nueva.',
  'app.job.no.gone': 'Esta tarea ya no está en este navegador.',
  'app.job.no.unanswered': 'Aún falta responder algo antes de aprobar.',
  'app.job.open': 'Revisarla',

  'app.job.title': 'Revise esto: {what}',
  'app.job.what.clones.one': '{count} esqueje de {name}',
  'app.job.what.clones.other': '{count} esquejes de {name}',
  'app.job.what.offspring.one': '{count} cría de {name}',
  'app.job.what.offspring.other': '{count} crías de {name}',
  'app.job.what.import': 'su colección desde un archivo',
  'app.job.what.due.one': '{count} informe para enviar',
  'app.job.what.due.other': '{count} informes para enviar',
  'app.job.what.ready': 'dejar {name} listo para dar en licencia',
  'app.job.young.dog': 'cachorro de {name}',
  'app.job.young.cattle': 'ternero de {name}',
  'app.job.young.horse': 'potro de {name}',
  'app.job.young.sheepGoat': 'cordero de {name}',
  'app.job.young.pig': 'lechón de {name}',

  'app.job.answer.title': 'Solo usted puede responder',
  'app.job.answer.bredBy': '¿Quién los crió?',
  'app.job.answer.taxon': '¿De qué especie son?',
  'app.job.answer.scheme': '¿Qué tipo de identificación son?',
  'app.job.answer.idsLater': '¿Aún sin identificaciones? Déjelo vacío: la página de inicio se lo recordará.',
  'app.job.answer.file': 'Elija el archivo con su colección (CSV o Excel).',
  'app.job.answer.filePick': 'Elegir un archivo',
  'app.job.answer.use': 'Usar esto',
  'app.job.answer.backup': 'Guarde su copia de seguridad y compruébela: tiene las claves de lo que crea esta tarea.',

  'app.job.made.title': 'Lo que preparé',
  'app.job.made.records.one': '{count} registro, listo aquí y aún no enviado: {first}',
  'app.job.made.records.other': '{count} registros, listos aquí y aún no enviados: de {first} a {last}',
  'app.job.made.cutFrom': 'Cortados de {name}, con fecha {date}',
  'app.job.made.born': 'Nacidos el {date}',
  'app.job.made.dam': 'Madre: {name}',
  'app.job.made.sire': 'Padre: {name}',
  'app.job.made.sireTyped': 'Padre fuera de VeilCore: {code}',
  'app.job.made.noSire': 'Padre: sin indicar (añádalo después)',
  'app.job.made.semen': 'Código de semen: {code}',
  'app.job.made.sexes': 'Machos: {m} · Hembras: {f}',
  'app.job.made.unstated': 'Sexo sin indicar: {u}',
  'app.job.made.each': 'Uno por uno',
  'app.job.made.noId': 'aún sin identificación',
  'app.job.made.tags': 'Etiquetas de planta de {first} a {last}',
  'app.job.made.lot': 'Lote: {lot}',
  'app.job.made.noIds.one': 'Aún sin identificación para {count}: la página de inicio se la pedirá.',
  'app.job.made.noIds.other': 'Aún sin identificaciones para {count}: la página de inicio se las pedirá.',
  'app.job.made.importReady.one': '{count} listo',
  'app.job.made.importReady.other': '{count} listos',
  'app.job.made.importFix.one':
    '{count} necesita una corrección (fila {rows}): corríjala en el archivo y vuelva a importarlo.',
  'app.job.made.importFix.other':
    '{count} necesitan una corrección (filas {rows}): corríjalas en el archivo y vuelva a importarlo.',
  'app.job.made.expect': 'Dijo {n}; el archivo tiene {m} listos.',
  'app.job.made.file': 'De {file}',
  'app.job.made.report': 'Informe del {from} al {to}',
  'app.job.made.namedBy': '«{label}», nombrado por la otra parte',
  'app.job.made.stamp': 'Un sello de fecha en Midnight para {name}, necesario para darlo en licencia',
  'app.job.made.stamped': '{name} ya tiene su sello de fecha.',

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
    '{name} recibe hoy un sello de fecha en Midnight. Hace falta para darlo en licencia. Hasta 3 al día son gratis.',
  'app.job.approve.stampTomorrow':
    'El sello de {name} se pondrá mañana: parece que los sellos gratuitos de hoy ya se agotaron.',
  'app.job.approve.public': 'Qué se hace público',
  'app.job.approve.publicStamp':
    'Público: un código que demuestra que este registro existía, y la fecha. Nunca el nombre, la genética ni los archivos.',
  'app.job.approve.publicRecords':
    'El código de prueba de cada registro va al servidor de VeilCore y se fecha en Midnight en un lote. Los nombres y detalles van cifrados con su clave: el servidor no puede leerlos.',
  'app.job.approve.publicReports':
    'Nada público: cada informe va al licenciante, cifrado, por el canal propio de su acuerdo.',
  'app.job.approve.offline': '¿Sin señal? No pasa nada. Saldrá cuando vuelva a estar en línea, con VeilCore abierto.',
  'app.job.approve.offlineRecords':
    '¿Sin señal? No pasa nada. Saldrá cuando vuelva a estar en línea, con VeilCore abierto. Si no ha salido antes del {when}, le preguntaré antes de enviarlo.',
  'app.job.approve.offlineLater':
    '¿Sin señal? No pasa nada. Saldrá cuando vuelva a estar en línea, con VeilCore abierto. Si no ha salido antes del {when}, no se envía nada: pídamelo de nuevo.',

  'app.job.backup.records.one':
    'Guarde primero su copia de seguridad. Sin ella, perder este teléfono es perder este registro.',
  'app.job.backup.records.other':
    'Guarde primero su copia de seguridad. Sin ella, perder este teléfono es perder estos {count} registros.',
  'app.job.backup.ready':
    'Guarde primero su copia de seguridad. Un acuerdo no se puede guardar hasta que una copia comprobada tenga su clave.',
  'app.job.backup.done': 'Copia de seguridad comprobada.',
  'app.job.backup.finish': 'Volver a la tarea',

  'app.job.btn.records.one': 'Aprobar: guardar {count} registro',
  'app.job.btn.records.other': 'Aprobar: guardar {count} registros',
  'app.job.btn.reports.one': 'Aprobar: enviar {count} informe, total a pagar {total}',
  'app.job.btn.reports.other': 'Aprobar: enviar {count} informes, total a pagar {total}',
  'app.job.btn.stamp': 'Aprobar: sellar {name}',
  'app.job.btn.ready': 'Aprobar',
  'app.job.btn.backup': 'Guardar copia de seguridad',
  'app.job.btn.change': 'Cambiar algo',
  'app.job.btn.discard': 'Descartar',
  'app.job.changeConfirm':
    'Esto abre el formulario completo con todo lo de aquí. Esta tarea se descarta: no se envió nada.',
  'app.job.left.questions.one': 'Responda {count} pregunta para aprobar',
  'app.job.left.questions.other': 'Responda {count} preguntas para aprobar',
  'app.job.left.backup': 'Guarde su copia de seguridad para aprobar',
  'app.job.left.scroll': 'Lea «No se puede deshacer» para aprobar',
  'app.job.left.saving': 'Guardando lo que escribió…',
  'app.job.left.ready': 'Listo para aprobar',
  'app.job.readOnly': 'Ábrala desde la página de inicio para aprobarla.',
  'app.job.discarded': 'Descartada. No se envió nada.',

  'app.job.report.sales': 'Ventas del {from} al {to} ({currency})',
  'app.job.report.units': 'Unidades del {from} al {to}',
  'app.job.report.offspring': 'Descendencia, mismo periodo',
  'app.job.report.nothing': 'Nada que informar',
  'app.job.report.owed': 'A pagar: {amount}',
  'app.job.report.rate': '{rate} % de {currency} {base}',
  'app.job.report.topUp': 'Incluye {amount} para llegar al mínimo anual',
  'app.job.report.due': 'Vence el {date}',
  'app.job.report.overdue': 'Venció el {date} · atrasado',

  'app.job.progress.running': 'En curso',
  'app.job.progress.waiting': 'Esperando para enviar',
  'app.job.progress.approved': 'Aprobada',
  'app.job.progress.done': 'Hecho',
  'app.job.progress.stopped': 'Detenida',
  'app.job.progress.expired': 'Caducada: no se envía nada más',
  'app.job.progress.discarded': 'Descartada: no se envió nada',
  'app.job.step.records.one': 'Guardar {count} registro',
  'app.job.step.records.other': 'Guardar {count} registros',
  'app.job.step.report': 'Enviar el informe del {from} al {to}',
  'app.job.step.stamp': 'Sellar con fecha {name}',
  'app.job.state.todo': 'En espera',
  'app.job.state.running': 'Enviando…',
  'app.job.state.done': 'Hecho',
  'app.job.state.failed': 'No enviado',
  'app.job.state.needsYou': 'Necesita su atención',
  'app.job.state.waiting': 'Nuevo intento {when}',
  'app.job.when.soon': 'en {n} min ({time})',
  'app.job.when.at': 'a las {time}',
  'app.job.when.on': 'el {date}',
  'app.job.wait.records.one':
    'No se pierde nada: su registro queda guardado aquí y sale en cuanto vuelva a estar en línea.',
  'app.job.wait.records.other':
    'No se pierde nada: sus {count} registros quedan guardados aquí y salen en cuanto vuelva a estar en línea.',
  'app.job.wait.cantCheck':
    'No se pierde nada: sus registros se guardan aquí. No se pudo preguntar al servidor de VeilCore cuáles tiene ya, así que no se volvió a enviar nada. Volveré a preguntar pronto.',
  'app.job.wait.notNoted':
    'No se pierde nada: sus registros se guardan aquí. Este navegador no pudo anotar cuáles tiene ya el servidor de VeilCore, así que no se volvió a enviar nada. Lo volveré a intentar pronto.',
  'app.job.done.records.one': '{count} registro guardado.',
  'app.job.done.records.other': '{count} registros guardados.',
  'app.job.done.ids.one': 'La página de inicio le recordará añadir {count} identificación.',
  'app.job.done.ids.other': 'La página de inicio le recordará añadir {count} identificaciones.',
  'app.job.done.reports': 'Informes enviados. El licenciante responde en la página de cada acuerdo.',
  'app.job.done.ready': '{name}: listo para dar en licencia.',
  'app.job.done.already': 'Ya estaba: no se envió nada nuevo.',
  'app.job.needs.report':
    'Puede que este informe ya haya salido. Abra el acuerdo para comprobarlo. Reintentar no envía nada dos veces: primero lo comprueba.',
  'app.job.needs.stamp':
    'Puede que este sello ya haya salido. Abra el registro: su página consulta Midnight y desde allí puede reintentarlo.',
  'app.job.needs.lapsed':
    'Lo aprobó hace más de 3 días y aún no ha salido. Envíelo ahora o descártelo: no se ha enviado nada.',
  'app.job.needs.stuck':
    'Esto se detuvo 30 días después de que lo aprobara. Abra sus registros o el acuerdo para ver qué llegó.',
  'app.job.needs.stuckNone': 'Esto se detuvo 30 días después de que lo aprobara. No se envió nada.',
  'app.job.needs.stuckRecords':
    'El servidor de VeilCore no ha confirmado estos registros en 30 días. Siguen guardados aquí. Puede que algunos ya estén allí: «Enviar ahora» lo comprueba primero y no envía ninguno dos veces.',
  'app.job.failed.amount':
    'No enviado: el importe cambió desde que lo aprobó (llegó otro informe o pago). Ahora es {amount}. Vuelva a pedirlo para enviarlo.',
  'app.job.sendNow': 'Enviar ahora',
  'app.job.why': 'Lo que dijo: {why}',
  'app.job.tryAgain': 'Reintentar',
  'app.job.openRecord': 'Abrir el registro',
  'app.job.openNew': 'Abrir los registros nuevos',
  'app.job.openAgreement': 'Abrir el acuerdo',
  'app.job.toRecords': 'Ir a sus registros',

  'app.job.home.title': 'Hazlo por mí',
  'app.job.home.check': 'Revisar: {what}',
  'app.job.home.needs': 'Necesita su atención: {what}',
  'app.job.home.running': 'En curso: {what}',
  'app.job.home.ready': '{name}: listo para dar en licencia',
  'app.job.home.tomorrow': '{name}: listo mañana',
  'app.job.home.ids.one': 'Cría de {dam} ({count}): añadir su identificación',
  'app.job.home.ids.other': 'Camada de {dam} ({count}): añadir identificaciones',
  'app.job.home.open': 'Abrir',

  'app.job.ids.title.one': 'Añadir identificación: cría de {dam}',
  'app.job.ids.title.other': 'Añadir identificaciones: {count} crías de {dam}',
  'app.job.ids.permanent':
    'Cada identificación se guarda como corrección: un registro nuevo que sustituye al anterior, que queda archivado. No se puede deshacer.',
  'app.job.ids.save.one': 'Guardar {count} identificación',
  'app.job.ids.save.other': 'Guardar {count} identificaciones',
  'app.job.ids.reason': 'Identificación añadida',
  'app.job.ids.already': 'ya {id}',
  'app.job.ids.no.twice': '{id} está en dos casillas.',
  'app.job.ids.no.taken': '{id} ya es la identificación de {name}.',
  'app.job.ids.no.elsewhere': '{id} ya es la identificación de {name}, otro de sus animales.',
  'app.job.ids.changed':
    'Algo cambió en otro dispositivo o en otra pestaña desde que se mostró esto, así que no se guardó nada más. Revise las casillas y guarde de nuevo.',
  'app.job.ids.paste.spaces':
    'Parecen varias identificaciones de formas distintas separadas por espacios, así que no se puede saber cuál es cuál. No se rellenó nada. Péguelas como columna o escriba cada una en su casilla.',
  'app.job.ids.paste.doubleScan':
    'Un escaneo entró en una casilla que ya tiene identificación, así que no se usó. Para volver a escanear esta cría, vacíe antes su casilla.',
  'app.job.ids.gone': 'El registro de {name} ya no está aquí. Cierre esto y vuelva a abrirlo.',
  'app.job.ids.keep': 'Seguir editando',
  'app.job.ids.discard': 'Descartar',
  'app.job.ids.discardAsk': '¿Descartar las identificaciones que escribió? No están guardadas.',
  'app.job.ids.use': 'Usar estas identificaciones',
  'app.job.ids.paste.over':
    'Son {n} líneas para {count} casillas desde aquí hacia abajo, así que no encaja. No se rellenó nada. Copie solo las identificaciones de estas crías o pegue en una casilla más arriba.',
  'app.job.ids.paste.startsAt':
    '«{id}» ya es la identificación de {name}, así que esta columna empieza más arriba. No se rellenó nada. Copie solo las identificaciones de las crías que aún no tienen.',
  'app.job.ids.paste.comma':
    'La línea {line} tiene una coma o un punto y coma: una identificación por línea. No se rellenó nada.',
  'app.job.ids.no.comma': 'Una identificación por casilla: esta tiene una coma o un punto y coma.',
  'app.job.wait.refused':
    'No se pierde nada: sus registros se guardan aquí. El servidor de VeilCore rechazó este guardado, así que aún no se guardó nada. Lo volveré a intentar.',
  'app.job.ids.help':
    'Escriba o escanee la identificación de cada cría en su propia casilla. El Intro o el Tab de un escáner pasa a la siguiente casilla vacía. También puede pegar una columna en una casilla: rellena esa casilla y las de debajo.',
  'app.job.ids.schemeNeeded': 'Indique a qué numeración pertenecen estas identificaciones.',
  'app.job.ids.preview': 'Lo que se guardará',
  'app.job.ids.previewNone': 'Nada todavía: escriba, escanee o pegue una identificación en una casilla.',
  'app.job.ids.pair': '{name} recibe {id}',
  'app.job.ids.fix.one': 'Corrija primero la casilla marcada en rojo.',
  'app.job.ids.fix.other': 'Corrija primero las {count} casillas marcadas en rojo.',
  'app.job.ids.paste.columns':
    'Eso es más de una columna. Copie solo la columna de identificaciones y péguela de nuevo. No se rellenó nada.',
  'app.job.ids.paste.header':
    '«{id}» parece un encabezado de columna, no una identificación. Copie las identificaciones sin el encabezado y péguelas de nuevo. No se rellenó nada.',
  'app.job.ids.paste.invisible':
    'La línea {line} tiene caracteres invisibles. Copie de nuevo las identificaciones o escríbalas. No se rellenó nada.',
  'app.job.ids.paste.stopped.one': 'Se detuvo en {name}: ya tiene identificación, así que 1 línea no se usó.',
  'app.job.ids.paste.stopped.other':
    'Se detuvo en {name}: ya tiene identificación, así que {count} líneas no se usaron.',
  'app.job.ids.no.invisible': 'Contiene caracteres invisibles. Vacíela y escriba o escanee la identificación de nuevo.',
  'app.job.wait.noKey':
    'Sus registros se guardan aquí, pero este navegador no tiene la clave con la que el servidor de VeilCore los conoce, así que no se volvió a enviar nada. Restaure su copia de seguridad para continuar.',
  'app.job.wait.full':
    'No se pierde nada: sus registros se guardan aquí. El almacenamiento de este dispositivo está lleno, así que no se envió nada. Libere algo de espacio; lo volveré a intentar.',
  'app.job.wait.local':
    'No se pierde nada: sus registros se guardan aquí. No se pudieron guardar desde esta página ahora mismo, así que no se envió nada. Lo volveré a intentar pronto.',
} satisfies Partial<AppTranslation>;
