// Spanish (neutral Latin American, usted). DRAFT: machine-assisted, to be checked by a fluent
// speaker before publishing (docs/translations/README.md). Terms as in ../../es.ts.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const home = {
  'app.home.firstPlant': 'Registremos su primera planta',
  'app.home.continueDraftNamed': 'Continúe su borrador: {name}',
  'app.home.continueDraft': 'Continúe su borrador',
  'app.home.draftKept': 'Lo que escribió se guarda en este navegador. Siga donde lo dejó.',
  'app.home.aboutThreeMinutes':
    'Unos 3 minutos. Al terminar tendrá un sello de fecha público, y usted tiene la única clave.',
  'app.home.continue': 'Continuar',
  'app.home.start': 'Empezar',
  'app.home.spreadsheet': '¿Tiene una hoja de cálculo? Feche toda su colección',
  'app.home.newPhone': '¿Teléfono nuevo? Recupere sus registros',
  'app.home.newPhoneLab': '¿Teléfono nuevo? Recupere la clave y las muestras de su laboratorio',
  'app.home.labWhatShows': '¿Qué muestra mi firma?',
  'app.home.labShows':
    'Muestra que su clave firmó: que llegó una muestra, o qué informe envió. No muestra quién tiene la clave: cualquiera puede registrar una clave con cualquier nombre.',
  'app.home.breederToo': 'También soy obtentor',
  'app.home.imALab': 'Soy un laboratorio',
  'app.home.whatStops': '¿Qué impide que alguien registre mi planta primero?',
  'app.home.samplesReceived': 'Muestras recibidas',
  'app.home.yourPlants': 'Sus plantas',
  'app.home.logNew': 'Registrar nueva',
  'app.home.saveIt': 'Guardarla',
  'app.home.finishBackupLine': '<b>Para terminar: guarde su copia de seguridad.</b> {line}',
  'app.home.keysOnlyHerePlants.one': 'Una planta tiene claves solo en este dispositivo.',
  'app.home.keysOnlyHerePlants.other': '{count} plantas tienen claves solo en este dispositivo.',
  'app.home.keysOnlyHereRecords.one': 'Un registro tiene claves solo en este dispositivo.',
  'app.home.keysOnlyHereRecords.other': '{count} registros tienen claves solo en este dispositivo.',
  'app.home.resetWarningPlants.one':
    'Una planta tiene claves sin una copia de seguridad comprobada. Guarde primero su copia de seguridad: si borra el navegador más tarde, se perderían para siempre.',
  'app.home.resetWarningPlants.other':
    '{count} plantas tienen claves sin una copia de seguridad comprobada. Guarde primero su copia de seguridad: si borra el navegador más tarde, se perderían para siempre.',
  'app.home.resetWarningRecords.one':
    'Un registro tiene claves sin una copia de seguridad comprobada. Guarde primero su copia de seguridad: si borra el navegador más tarde, se perderían para siempre.',
  'app.home.resetWarningRecords.other':
    '{count} registros tienen claves sin una copia de seguridad comprobada. Guarde primero su copia de seguridad: si borra el navegador más tarde, se perderían para siempre.',
  'app.home.resetConfirm':
    '¿Empezar de nuevo en este navegador con un conjunto nuevo y vacío?\n\nNo se borra nada. Sus registros actuales siguen bloqueados en el servidor de registros de VeilCore. Solo puede recuperarlos con sus claves actuales, que se descargarán ahora en un archivo. Consérvelo.',
  'app.home.startedOver':
    'Empezó de nuevo. Restaure sus registros anteriores cuando quiera desde el archivo de la clave de titular.',
  'app.home.imported.one': 'Se importó {count} registro.',
  'app.home.imported.other': 'Se importaron {count} registros.',
  'app.home.alreadyHere.one': ' {count} que ya estaba aquí se dejó como estaba.',
  'app.home.alreadyHere.other': ' {count} que ya estaban aquí se dejaron como estaban.',
  'app.home.importFailed': 'La importación falló.',
  'app.home.labJobs': 'Las tareas de su laboratorio',
  'app.home.labJobsText':
    'Confirme lo que llega y luego envíe los resultados desde la página de la planta. Ambas cosas se firman con la propia clave de su laboratorio, no con la nuestra, y los resultados se bloquean para que solo el obtentor pueda abrirlos.',
  'app.home.confirmDelivery': 'Confirmar una entrega',
  'app.home.labSignature': 'La firma de su laboratorio',
  'app.home.setUpLabSignature': 'Configurar la firma de su laboratorio',
  'app.home.openPlant': 'Abrir {name}',
  'app.home.quoted': '“{v}”',
  'app.home.labReportWaiting': 'Informe de laboratorio esperando',
  'app.home.openAgreements': 'Abrir mis acuerdos',
  'app.home.myAgreements': 'Mis acuerdos ({n})',
  'app.home.more': 'Más',
  'app.home.saveABackup': 'Guardar una copia de seguridad',
  'app.home.exportAll': 'Exportar todos los registros',
  'app.home.importRecords': 'Importar registros',
  'app.home.trust.title': '“¿Qué me impide registrar <em>su</em> cultivar?”',
  'app.home.trust.lede': 'Tres cosas hacen que un registro de VeilCore sea difícil de falsificar:',
  'app.home.trust.1t': 'Un registro anterior se ve como anterior',
  'app.home.trust.1b':
    'Una vez anclados los registros, cualquiera puede comprobar cuál se ancló primero. Antes de eso, la hora de un registro es el reloj de su dispositivo. Un registro es una prueba, no una inscripción: muestra qué tenía usted y cuándo, pero no resuelve una disputa por sí solo.',
  'app.home.trust.2t': 'Un informe vinculado se puede comparar después',
  'app.home.trust.2b':
    'Al vincular, el código de su informe de ADN se guarda con el registro, como declaración suya, para que más adelante se pueda comparar con él una prueba nueva del material. Cuando vincula a través del contrato de VeilCore en Midnight, el vínculo también queda fechado: muestra que el registro estaba vinculado a ese informe para entonces, no quién tuvo el informe primero. En {thisSite}, los vínculos todavía no se fechan.',
  'app.home.trust.3t': 'Una segunda parte recibe la entrega',
  'app.home.trust.3b':
    'Cuando se transfiere material, quien lo recibe confirma la recepción con su propia clave. Eso pone a una segunda parte en el registro, no solo a usted. Muestra que alguien recibió la entrega, no quién es.',
  'app.home.role.title': '¿Qué le describe mejor?',
  'app.home.role.intro':
    'Esto solo cambia lo que le mostramos primero. No limita lo que puede hacer, y puede cambiarlo al pie de cualquier página.',
  'app.home.role.breeder.label': 'Obtengo variedades o tengo genética',
  'app.home.role.breeder.blurb':
    'Selle registros de lo que tiene, envíe muestras a laboratorios y otorgue licencias de lo que ha obtenido.',
  'app.home.role.lab.label': 'Tengo un laboratorio o recibo material',
  'app.home.role.lab.blurb':
    'Reciba material de clientes, confirme lo que llegó y firme sus informes con su propia clave.',
  'app.home.role.both.label': 'Ambos',
  'app.home.role.both.blurb': 'Usted obtiene variedades y también recibe material de otros.',
  'app.home.roleView.breeder': 'Vista de obtentor',
  'app.home.roleView.lab': 'Vista de laboratorio',
  'app.home.roleView.both': 'Vista de obtentor y laboratorio',
  'app.home.roleChange': '{view} · cambiar',
  'app.home.chooseView': '¿Obtentor o laboratorio? Elija su vista',
  'app.home.saveProblem.records': 'registros',
  'app.home.saveProblem.agreements': 'acuerdos',
  'app.home.saveProblem.text':
    'El servidor de registros no guardó algunos de sus {what}, así que se devolvieron a lo que tiene guardado: {list}',
  'app.home.sort.recent': 'Más recientes primero',
  'app.home.sort.oldest': 'Más antiguos primero',
  'app.home.sort.name': 'Nombre del cultivar',
  'app.home.sort.breeder': 'Obtentor',
  'app.home.search.lab': 'Nombre de la planta, obtentor, código TR, nota o su n.º de registro interno',
  'app.home.search.breeder': 'Planta, obtentor o su propia referencia',
  'app.home.search.aria': 'Buscar',
  'app.home.search.nothing':
    'Nada coincide con "{q}". La búsqueda incluye el nombre de la planta, quién la obtuvo, el identificador del registro, su propia referencia y, para una muestra recibida, su código de laboratorio y la nota del obtentor.',
  'app.home.search.nOfTotal': '{matched} de {total}',
  'app.home.paste.ownCode': 'Ese es su propio código. Envíelo al laboratorio; no lo reciba aquí.',
  'app.home.paste.cutOff': 'Ese código parece incompleto. Copie el código de laboratorio completo que le enviaron.',
  'app.home.paste.noneStamped':
    'Es una solicitud para demostrar que tiene una planta, pero ninguna de las plantas de este dispositivo tiene todavía sello de fecha. ¿Está en un dispositivo nuevo? Recupere primero sus plantas desde su copia de seguridad.',
  'app.home.paste.unknown':
    'No parece un código ni un enlace de VeilCore. Copie todo lo que le enviaron e inténtelo de nuevo.',
  'app.home.paste.label': '¿Alguien le envió un código o un enlace?',
  'app.home.paste.placeholder': 'Péguelo aquí',
  'app.home.paste.go': 'Ir',
  'app.home.paste.hint':
    'Un código de laboratorio, un enlace a un registro, una solicitud para demostrar una planta o un acuerdo para firmar. Nosotros averiguamos cuál es.',
  'app.home.paste.whichPlant': 'Es una solicitud para demostrar que tiene una planta. ¿Por cuál le preguntaron?',
  'app.home.notFinished': 'Sin terminar · siguiente: guarde su copia de seguridad',
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
  'app.home.datingUnfinished': '{dated} · sin terminar · siguiente: guarde su copia de seguridad',
  'app.home.datingSealed': '{dated} · sellado el {date}',
  'app.home.export.label': 'Descargar sus registros y acuerdos de VeilCore',
  'app.home.export.done':
    'Descargado: sus registros, acuerdos, opciones de uso compartido y todas las pruebas de inclusión. Los envíos, sus datos de muestra y los informes de laboratorio no están incluidos: ábralos desde el envío o desde la página de la planta. Sus claves están en su archivo de copia de seguridad, no en este.',
} satisfies Partial<AppTranslation>;
