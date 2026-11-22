// Spanish (neutral Latin American, usted). DRAFT: machine-assisted, to be checked by a fluent
// speaker before publishing (docs/translations/README.md). Terms as in ../../es.ts.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const home = {
  'app.home.firstRecord': 'Creemos su primer registro',
  'app.home.oldLinks':
    'Los enlaces de comprobación y códigos QR hechos antes del 17 de octubre de 2026 ya no muestran el nombre de sus registros: VeilCore ahora guarda los nombres cifrados, así que el servidor de registros no tiene ninguno que mostrar. Para compartir un nombre, abra el registro, elija Mostrar a alguien, active el nombre y envíe el enlace nuevo. Un certificado nuevo tiene un código QR nuevo.',
  'app.home.continueDraftNamed': 'Continúe su borrador: {name}',
  'app.home.continueDraft': 'Continúe su borrador',
  'app.home.draftKept': 'Lo que escribió se guarda en este navegador. Siga donde lo dejó.',
  'app.home.aboutThreeMinutes':
    'Unos 3 minutos. Al terminar, su registro tendrá un sello de fecha público y usted tendrá la única clave.',
  'app.home.aboutThreeMinutesByHand':
    'Unos 3 minutos. Al terminar queda sellado; su fecha pública llega cuando anclamos su lote (a mano por ahora). Usted tiene la única clave.',
  'app.home.continue': 'Continuar',
  'app.home.start': 'Crear un registro',
  'app.home.spreadsheet': '¿Tiene una hoja de cálculo? Feche toda su colección',
  'app.home.newPhone': '¿Teléfono nuevo? Recupere sus registros',
  'app.home.newPhoneLab': '¿Teléfono nuevo? Recupere la clave y las muestras de su laboratorio',
  'app.home.labWhatShows': '¿Qué muestra mi firma?',
  'app.home.labShows':
    'Muestra que su clave firmó: que llegó una muestra, o qué informe envió. No muestra quién tiene la clave: cualquiera puede registrar una clave con cualquier nombre.',
  'app.home.breederToo': 'También soy obtentor',
  'app.home.imALab': 'Soy un laboratorio',
  'app.home.whatStops': '¿Qué impide que alguien registre mi material primero?',
  'app.home.samplesReceived': 'Muestras recibidas',
  'app.home.yourRecords': 'Sus registros',
  'app.home.logNew': 'Crear un registro',
  'app.home.saveIt': 'Guardarla',
  'app.home.finishBackupLine': '<b>Para terminar: guarde su copia de seguridad.</b> {line}',
  'app.home.keysOnlyHereRecords.one': 'Un registro tiene claves solo en este dispositivo.',
  'app.home.keysOnlyHereRecords.other': '{count} registros tienen claves solo en este dispositivo.',
  'app.home.resetWarningRecords.one':
    'Un registro tiene claves sin una copia de seguridad comprobada. Guarde primero su copia de seguridad: si borra el navegador más tarde, se perderían para siempre.',
  'app.home.resetWarningRecords.other':
    '{count} registros tienen claves sin una copia de seguridad comprobada. Guarde primero su copia de seguridad: si borra el navegador más tarde, se perderían para siempre.',
  'app.home.resetConfirm':
    '¿Empezar de nuevo en este navegador con un conjunto nuevo y vacío?\n\nNo se borra nada. Sus registros actuales siguen cifrados en el servidor de registros de VeilCore. Solo puede recuperarlos con sus claves actuales, que se descargarán ahora en un archivo. Consérvelo.',
  'app.home.startedOver':
    'Empezó de nuevo. Restaure sus registros anteriores cuando quiera desde el archivo de la clave de titular.',
  'app.home.imported.one': 'Se importó {count} registro.',
  'app.home.imported.other': 'Se importaron {count} registros.',
  'app.home.alreadyHere.one': ' {count} que ya estaba aquí se dejó como estaba.',
  'app.home.alreadyHere.other': ' {count} que ya estaban aquí se dejaron como estaban.',
  'app.home.importFailed': 'La importación falló.',
  'app.home.labJobs': 'Las tareas de su laboratorio',
  'app.home.labJobsText':
    'Confirme lo que llega y luego envíe los resultados desde la página del registro. Ambas cosas se firman con la propia clave de su laboratorio, no con la nuestra, y los resultados se cifran para que solo el obtentor pueda abrirlos.',
  'app.home.confirmDelivery': 'Confirmar una entrega',
  'app.home.labSignature': 'La clave de firma de su laboratorio',
  'app.home.setUpLabSignature': 'Configurar la clave de firma de su laboratorio',
  'app.home.openPlant': 'Abrir {name}',
  'app.home.quoted': '“{v}”',
  'app.home.labReportWaiting': 'Informe de laboratorio esperando',
  'app.home.openAgreements': 'Abrir mis acuerdos',
  'app.home.myAgreements': 'Mis acuerdos ({n})',
  'app.home.more': 'Más',
  'app.home.saveABackup': 'Guardar una copia de seguridad',
  'app.home.exportAll': 'Exportar todos los registros',
  'app.home.importRecords': 'Importar registros',
  'app.home.trust.title': '“¿Qué me impide registrar <em>su</em> material?”',
  'app.home.trust.lede': 'Tres cosas respaldan un registro de VeilCore:',
  'app.home.trust.1t': 'Un registro anterior se ve como anterior',
  'app.home.trust.1b':
    'Una vez anclados los registros, cualquiera puede comprobar cuál se ancló primero. Antes de eso, la hora de un registro es el reloj de su dispositivo. Un registro es una prueba, no una inscripción: muestra qué tenía usted y cuándo, pero no resuelve una disputa por sí solo.',
  'app.home.trust.2t': 'Un informe vinculado se puede comparar después',
  'app.home.trust.2b':
    'Al vincular, el código de su informe de ADN se guarda con el registro, como declaración suya, para que más adelante se pueda comparar con él un análisis nuevo del material. Cuando vincula a través del contrato de VeilCore en Midnight, el vínculo también queda fechado: muestra que el registro estaba vinculado a ese informe para entonces, no quién tuvo el informe primero. En {thisSite}, los vínculos todavía no se fechan.',
  'app.home.trust.3t': 'Una segunda parte recibe la entrega',
  'app.home.trust.3b':
    'Cuando se transfiere material, quien lo recibe confirma la recepción con su propia clave. Eso pone a una segunda parte en el registro, no solo a usted. Muestra que alguien recibió la entrega, no quién es.',
  'app.home.role.title': '¿Qué opción lo describe mejor?',
  'app.home.role.intro':
    'Esto solo cambia lo que le mostramos primero. No limita lo que puede hacer, y puede cambiarlo al pie de cualquier página.',
  'app.home.role.breeder.label': 'Soy obtentor o tengo material genético',
  'app.home.role.breeder.blurb':
    'Selle registros de lo que tiene, envíe muestras a laboratorios y otorgue licencias de lo que ha obtenido.',
  'app.home.role.lab.label': 'Tengo un laboratorio o recibo material',
  'app.home.role.lab.blurb':
    'Reciba material de clientes, confirme lo que llegó y firme sus informes con su propia clave.',
  'app.home.role.both.label': 'Ambos',
  'app.home.role.both.blurb': 'Usted hace mejoramiento genético y también recibe material de otros.',
  'app.home.roleView.breeder': 'Vista de obtentor',
  'app.home.roleView.lab': 'Vista de laboratorio',
  'app.home.roleView.both': 'Vista de obtentor y laboratorio',
  'app.home.roleChange': '{view} · cambiar',
  'app.home.chooseView': '¿Obtentor o laboratorio? Elija su vista',
  // lab/LabDoor.tsx: /for-labs, asked once of a breeder with records of their own
  'app.home.labDoor.title': '¿Agregar las herramientas de laboratorio?',
  'app.home.labDoor.what': 'Verá una vista de laboratorio con su clave de firma y las muestras que reciba.',
  'app.home.labDoor.text': 'Sus registros quedan como están.',
  'app.home.labDoor.add': 'Agregar herramientas de laboratorio',
  'app.home.labDoor.notNow': 'Ahora no',
  'app.labpage.title': 'VeilCore para laboratorios',
  'app.labpage.lede':
    'Firme los resultados que ya produce. El obtentor puede mostrarlos, y quien los vea puede comprobar qué clave los firmó y cuándo. Su propio sistema sigue funcionando como hasta ahora.',
  'app.labpage.setUp': 'Configurar su laboratorio',
  'app.labpage.gets.title': 'Lo que obtiene su laboratorio',
  'app.labpage.gets.key.t': 'Una clave de firma.',
  'app.labpage.gets.key.p':
    'Se crea en su navegador. Los acuses de recibo y los resultados que firma lo llevan, y cualquiera a quien se le muestren puede comprobar la firma.',
  'app.labpage.gets.arrived.t': 'Un acuse de recibo firmado por cada muestra.',
  'app.labpage.gets.arrived.p':
    'Un obtentor envía una muestra con un código de laboratorio de VeilCore. Usted confirma que llegó, o la rechaza, y lo firma.',
  'app.labpage.gets.results.t': 'Resultados cerrados para el obtentor.',
  'app.labpage.gets.results.p':
    'Solo los ven el obtentor, su laboratorio y quien envió la muestra, y solo el obtentor puede mostrárselos a otros.',
  'app.labpage.work.title': 'Qué cambia en su trabajo',
  'app.labpage.work.p1':
    'Nada en su propio sistema. Cuando una muestra llega con un código de laboratorio, pega o escanea el código, confirma la entrega y, más tarde, firma su resultado.',
  'app.labpage.work.p2':
    'Los datos de sus muestras y los nombres de sus clientes se quedan con usted. VeilCore guarda los acuses que firma, y sus resultados cerrados para que solo el obtentor pueda abrirlos.',
  'app.labpage.cost.title': 'Cuánto cuesta',
  'app.labpage.cost.p': 'Gratis para probar. Los planes para laboratorios están hechos, pero no activados.',
  'app.labpage.own.title': 'Úselo a su manera',
  'app.labpage.own.lede':
    'Nunca está obligado a usar veilcore.org. Todo el código de VeilCore es abierto, con licencia Apache-2.0.',
  'app.labpage.own.site.t': 'Usar veilcore.org.',
  'app.labpage.own.site.p': 'Nada que configurar. Nosotros operamos el servidor y pagamos las comisiones de la red.',
  'app.labpage.own.plug.t': 'Integrarlo en su propio software.',
  'app.labpage.own.plug.p':
    'Su sistema conserva sus datos y agrega un código de prueba a cada registro, con el paquete de contratos @veilcore/contracts.',
  'app.labpage.own.plug.link': 'Cómo integrarlo →',
  'app.labpage.own.run.t': 'Operar su propia copia.',
  'app.labpage.own.run.p':
    'El sitio web, el servidor que guarda los registros y el servicio de comisiones son código abierto. Usted los alojaría y pagaría sus propias comisiones de red.',
  'app.labpage.own.run.link': 'Qué funciona sin nosotros →',
  'app.labpage.own.plainly':
    'Dicho claramente: nadie fuera de VeilCore ha operado aún su propio servidor o servicio de comisiones, así que hacerlo sin nuestra ayuda no está probado. El contrato principal de registros tiene una clave de mantenimiento, que tenemos nosotros. El contrato de pruebas de hechos no tiene ninguna.',
  'app.labpage.own.policyLink': 'Quién tiene la clave de mantenimiento y cuándo puede usarse →',
  'app.labpage.own.codeLink': 'El código en GitHub →',
  'app.labpage.gone.title': 'Si VeilCore desaparece',
  'app.labpage.gone.p':
    'Lo que ya tiene fecha la conserva: las fechas están en Midnight, y el archivo de respaldo de un obtentor guarda sus registros y las pruebas para comprobarlos con herramientas libres y abiertas. Lo que se detiene es crear registros nuevos y pasar códigos de laboratorio, hasta que alguien opere un servidor con el código abierto.',
  'app.labpage.gone.link': 'Todo lo que sigue funcionando sin nosotros →',
  'app.home.saveProblem.records': 'registros',
  'app.home.saveProblem.agreements': 'acuerdos',
  'app.home.saveProblem.unreachable':
    'No se pudo contactar con VeilCore, así que sus últimos {what} aún no están guardados allí. Se conservan en este navegador y se vuelven a enviar con el siguiente guardado.',
  'app.home.saveProblem.text':
    'El servidor de registros no guardó algunos de sus {what}, así que se devolvieron a lo que tiene guardado: {list}',
  'app.home.sort.recent': 'Más recientes primero',
  'app.home.sort.oldest': 'Más antiguos primero',
  'app.home.sort.name': 'Nombre',
  'app.home.sort.breeder': 'Obtentor',
  'app.home.search.lab': 'Nombre, obtentor, código TR, nota o su n.º de accesión',
  'app.home.search.breeder': 'Nombre, obtentor o su propia referencia',
  'app.home.search.aria': 'Buscar',
  'app.home.search.nothing':
    'Nada coincide con "{q}". La búsqueda incluye el nombre, quién lo obtuvo, el identificador del registro, su propia referencia y, para una muestra recibida, su código de laboratorio y la nota del obtentor.',
  'app.home.search.nOfTotal': '{matched} de {total}',
  'app.home.paste.ownCode': 'Ese es su propio código. Envíelo al laboratorio; no lo reciba aquí.',
  'app.home.paste.cutOff': 'Ese código parece incompleto. Copie el código de laboratorio completo que le enviaron.',
  'app.home.paste.noneStamped':
    'Es una solicitud para demostrar que tiene un registro, pero ninguno de los registros de este dispositivo tiene todavía sello de fecha. ¿Está en un dispositivo nuevo? Recupere primero sus registros desde su copia de seguridad.',
  'app.home.paste.unknown':
    'No parece un código ni un enlace de VeilCore. Copie todo lo que le enviaron e inténtelo de nuevo.',
  'app.home.paste.label': '¿Alguien le envió un código o un enlace?',
  'app.home.paste.placeholder': 'Péguelo aquí',
  'app.home.paste.go': 'Ir',
  'app.home.paste.orMake': '¿Nada que pegar? Cree un registro',
  'app.home.paste.hint':
    'Un código de laboratorio, un enlace a un registro o un acuerdo para firmar. Nosotros averiguamos cuál es.',
  'app.home.paste.whichRecord': 'Es una solicitud para demostrar que tiene un registro. ¿Por cuál le preguntaron?',
  'app.home.receivedFrom': 'Recibida de {name}',
  'app.home.receivedFromNamed': 'De {name} · su registro {id}',
  'app.home.receivedFromName': 'De {name}',
  'app.home.sealedOn': 'Sellada el {date}',
  'app.home.labReportSaved': 'informe de laboratorio guardado',
  'app.home.keyStampQueued': 'sello de fecha de la clave en cola',
  'app.home.keyNotStamped': 'clave aún sin sello de fecha',
  'app.home.reportsSent.one': '{count} informe de laboratorio enviado',
  'app.home.reportsSent.other': '{count} informes de laboratorio enviados',
  'app.home.reportWithdrawn': 'informe de laboratorio retirado',
  'app.home.labReportDated': 'Informe de ADN fechado',
  'app.home.datesReportFor': 'Fecha un informe de ADN de {name}',
  'app.home.aPlant': 'una planta',
  'app.home.datingSealed': '{dated} · sellado el {date}',
  'app.home.backupLine':
    '<b>Todavía no está en su copia de seguridad.</b> Hasta que la guarde, lo que ha registrado se conserva solo en este navegador.',
  'app.home.export.label': 'Descargar sus registros y acuerdos de VeilCore',
  'app.home.export.done':
    'Descargado: sus registros, acuerdos, opciones de uso compartido y todas las pruebas de inclusión. Los envíos, sus datos de muestra y los informes de laboratorio no están incluidos: ábralos desde el envío o desde la página de la planta. Sus claves están en su archivo de copia de seguridad, no en este.',
  // PlanBox.tsx, billing.ts, records.ts: paid plans (off unless VITE_PAID_PLANS=on)
  'app.plan.full':
    'Ya usó sus registros gratuitos, así que no se creó ningún registro nuevo. Todo lo que ya tiene se sigue pudiendo comprobar. Elija un plan en su página de registros para agregar más.',
  'app.plan.unknown':
    'VeilCore no pudo comprobar su plan en este momento, así que no se creó ningún registro nuevo. Revise su conexión e inténtelo de nuevo.',
  'app.plan.box.free': 'Plan gratuito: {held} de {cap} registros fechados',
  'app.plan.box.left': 'Registros gratuitos por fechar: {n}',
  'app.plan.box.countsDeleted': 'Los registros fechados cuentan aunque luego los borre.',
  'app.plan.changeFull':
    'Este cambio fecharía una nueva versión y ya usó sus registros fechados gratuitos, así que no se cambió nada. Todo lo que ya tiene se puede seguir comprobando. Elija un plan en su página de registros para fechar más.',
  'app.plan.receiveFull':
    'No le queda ningún registro fechado gratuito para recibir esta entrega. Su código se guarda en este navegador: elija un plan en su página de registros y vuelva a ingresarlo.',
  'app.plan.box.rules':
    'La primera corrección de un registro es gratuita. Recibir una entrega necesita un registro fechado gratuito.',
  'app.plan.box.paid': 'Su plan: {plan}',
  'app.plan.name.breeder': 'Obtentor',
  'app.plan.name.lab': 'Laboratorio',
  'app.plan.name.free': 'Gratuito',
  'app.plan.choose': 'Elegir un plan',
  'app.plan.buy.breeder': 'Plan Obtentor',
  'app.plan.buy.lab': 'Plan Laboratorio',
  'app.plan.opens':
    'Abre la página de Paddle en una pestaña nueva. Paddle vende los planes por cuenta de VeilCore y cobra el pago; VeilCore nunca ve su tarjeta ni su correo.',
  'app.plan.keep': 'Elija lo que elija, cada registro que ya tiene se sigue pudiendo comprobar.',
  'app.plan.recheck': '¿Ya pagó? Comprobar de nuevo',
  'app.plan.err.off': 'Todavía no se pueden comprar planes desde este navegador.',
  'app.plan.err.unreachable': 'No se pudo abrir la página de Paddle ahora. Inténtelo de nuevo en un momento.',
  'app.plan.err.busy': 'Demasiados intentos en una hora. Inténtelo más tarde.',
  'app.plan.err.noRecord': 'Primero guarde un registro: un plan es para los registros que fecha.',
  'app.plan.err.blocked':
    'Su navegador bloqueó la página de Paddle. Permita las ventanas emergentes para este sitio y vuelva a intentarlo.',
  'app.plan.buy.other': 'Plan {plan}',
  'app.plan.importFull':
    'Este archivo tiene {n} registros nuevos para VeilCore y su plan gratuito puede fechar {left} más. No se importó nada. Elija un plan en su página de registros para fechar más.',
  'app.plan.box.full':
    'Ya usó sus registros gratuitos. Todo lo que ya tiene se sigue pudiendo comprobar. Elija un plan para agregar más.',
} satisfies Partial<AppTranslation>;
