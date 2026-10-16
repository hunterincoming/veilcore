// Spanish (neutral Latin American, usted). DRAFT: machine-assisted, to be checked by a fluent
// speaker before publishing (docs/translations/README.md). Terms as in ../../es.ts.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const prove = {
  'app.prove.share.checkingNow': 'Comprobando lo que se comparte ahora…',
  'app.prove.share.saveNote':
    ' “Obtener el enlace” guarda los interruptores de arriba, y la página de comprobación muestra entonces exactamente eso.',
  'app.prove.share.couldntRead': 'No se pudo leer del servidor de registros lo que se comparte ahora.{save}',
  'app.prove.share.onlyBasicsUnsaved':
    'Se comparte ahora: solo lo básico. Los interruptores de arriba son una sugerencia y todavía no están guardados.{save}',
  'app.prove.share.semicolon': '; ',
  'app.prove.share.onlyBasics': 'solo lo básico',
  'app.prove.share.sharedNow': 'Se comparte ahora: {now}.{differs}',
  'app.prove.share.differs': ' Los interruptores de arriba difieren de eso.{save}',
  'app.prove.yourRequest': 'Su solicitud',
  'app.prove.youAskedNamed':
    'Usted pidió al titular de <b>{name}</b> que demuestre que la tiene. Envíele este enlace si todavía no lo hizo.',
  'app.prove.youAsked':
    'Usted pidió al titular de esta planta que demuestre que la tiene. Envíele este enlace si todavía no lo hizo.',
  'app.prove.openCheckPage': 'Abrir la página de comprobación de la planta',
  'app.prove.opening': 'Abriendo la solicitud…',
  'app.prove.ended': 'Esta solicitud terminó',
  'app.prove.cantOpen': 'No se puede abrir en este momento',
  'app.prove.expired':
    'Venció (las solicitudes duran una semana), o el enlace no está completo. Pídale que le envíe uno nuevo.',
  'app.prove.missingPart': 'A este enlace le falta la última parte',
  'app.prove.missingPartText':
    'La respuesta solo puede volver con el enlace completo. Abra el enlace exactamente como se lo enviaron, o pida que se lo envíen de nuevo.',
  'app.prove.someoneWants': 'Alguien quiere que demuestre que tiene una planta',
  'app.prove.noPlantsHere':
    'Sus plantas no están en este teléfono o computadora. Abra este enlace donde las guarda, o recupérelas aquí desde su archivo de copia de seguridad, y luego vuelva a abrir el enlace.',
  'app.prove.notThisPlant':
    'Ninguna de las plantas de aquí es la que le preguntaron. Si la guarda en otro teléfono o computadora, abra allí este enlace. Si solo la tiene en un archivo de copia de seguridad, restáurela aquí y vuelva a abrir el enlace.',
  'app.prove.getBack': 'Recuperar mis plantas desde una copia de seguridad',
  'app.prove.done': 'Listo',
  'app.prove.doneText':
    'Verán la respuesta en su página. No se envió nada sobre la planta: solo la prueba de que usted tiene su registro.',
  'app.prove.thePlant': 'la planta',
  'app.prove.didntSend': 'Demostrado, pero la respuesta no se envió',
  'app.prove.sendInstead': '({why}.) Envíeles esto en su lugar; pueden pegarlo en “Hacerlo a mano”:',
  'app.prove.copy': 'Copiar',
  'app.prove.title': 'Demuestre que tiene {name}',
  'app.prove.thisPlant': 'esta planta',
  'app.prove.askedBy': 'Lo pide alguien que dice ser <b>“{asker}”</b>. <muted>VeilCore no lo ha comprobado.</muted>',
  'app.prove.askedAnon': 'Alguien le pidió que lo demuestre. No dio un nombre.',
  'app.prove.whatSends':
    '<b>Qué se envía:</b> solo la prueba de que usted tiene el registro de esta planta, puesta en la red de pruebas. Ni nombre, ni genética, ni nada sobre sus otras plantas.',
  'app.prove.testOnly': 'Por ahora, demostrar solo funciona en la versión de pruebas.',
  'app.prove.answering': 'Responder le dice a quien le envió este enlace que usted tiene el registro de esta planta.',
  'app.prove.proving': 'Demostrando…',
  'app.prove.proveIt': 'Demostrarlo',
  'app.prove.fewMinutes': 'Puede tardar unos minutos. Red de pruebas: solo práctica.',
  'app.prove.ask.cantAsk': 'No se puede pedir una prueba desde este enlace',
  'app.prove.ask.refused': '{reason}. Una prueba hecha con él no diría nada de este registro.',
  'app.prove.ask.noLink': 'No se hizo ningún enlace: {error}.',
  'app.prove.ask.title': 'Pídale que demuestre que la tiene',
  'app.prove.ask.intro':
    'Le envía un enlace. Lo abre y toca Demostrarlo. La respuesta aparece aquí. Esta página comprueba la respuesta en la propia red, a través de un indexador de Midnight (en el sitio de pruebas, por medio del relé de VeilCore). Para una decisión importante, compruebe la transacción en un segundo indexador. Solo red de pruebas.',
  'app.prove.ask.bound':
    'Este registro nombró su propia clave al sellarse. Esta página comprobó que la clave de su enlace es esa.',
  'app.prove.ask.older':
    'Registro antiguo: clave no vinculada a este registro. Una prueba muestra el control de la clave que nombra el enlace, que eligió el titular.',
  'app.prove.ask.newRequest': 'Hacer una solicitud nueva',
  'app.prove.ask.name': 'Su nombre o empresa (opcional)',
  'app.prove.ask.nameHelp': 'Lo verán, marcado como no comprobado por VeilCore.',
  'app.prove.ask.making': 'Haciendo el enlace…',
  'app.prove.ask.make': 'Hacer un enlace para enviarle',
  'app.prove.ask.byHand': 'Hacerlo a mano',
  'app.prove.hand.intro':
    'El enlace que le enviaron nombra una identidad en la cadena para este registro ({id}…). Cree un desafío, envíeselo y pegue aquí el ID de transacción que le den. La respuesta debe venir de esa identidad y responder a su desafío, y la identidad debe estar anclada y vigente. {bound}',
  'app.prove.hand.bound': 'El registro nombró esta clave al sellarse, y esta página lo comprobó con su huella.',
  'app.prove.hand.older':
    'Registro antiguo: clave no vinculada a este registro. Que esta identidad le corresponda es la declaración del titular.',
  'app.prove.hand.make': 'Crear un desafío',
  'app.prove.hand.yourChallenge': 'Su desafío (envíelo al titular; funciona una vez, en esta pestaña):',
  'app.prove.hand.txId': 'El ID de transacción del titular',
  'app.prove.hand.check': 'Comprobar la respuesta',
  'app.prove.hand.acceptedKey':
    'Aceptado: quien envió esa transacción controla la propia clave de este registro y respondió a su desafío.',
  'app.prove.hand.acceptedSecret':
    'Aceptado: quien envió esa transacción tiene el secreto de esta identidad y respondió a su desafío.',
  'app.prove.hand.notAccepted': 'No aceptado: {reason}.',
  'app.prove.hand.anchorYes': ' La transacción de anclaje que dio el titular sí crea esta identidad.',
  'app.prove.hand.anchorNo': ' No se pudo confirmar la transacción de anclaje que dio el titular.',
  'app.prove.key.leavesOut':
    'Este registro nombra su propia clave, pero este enlace omite lo necesario para comprobarla. Pida al titular un enlace nuevo',
  'app.prove.key.noFp':
    'La huella de este enlace no coincide con el registro, así que no se puede comprobar su clave con él',
  'app.prove.key.notThis': 'La clave de este enlace no es la que nombra este registro',
  'app.prove.watch.shareAsker':
    '{asker} le pide que demuestre en VeilCore que tiene esta planta. Abra este enlace: {link}',
  'app.prove.watch.share': 'Le pido que demuestre en VeilCore que tiene esta planta. Abra este enlace: {link}',
  'app.prove.watch.sendIt': 'Enviarlo',
  'app.prove.watch.copyLink': 'Copiar el enlace',
  'app.prove.watch.key': 'Clave: ',
  'app.prove.watch.confirmed': 'Confirmado',
  'app.prove.watch.controlsOwn':
    'Quien respondió controla ahora mismo la propia clave de este registro. El registro nombró esa clave al sellarse, así que no se puede cambiar.',
  'app.prove.watch.controlsLink': 'Quien respondió controla ahora mismo la clave que nombra este enlace.',
  'app.prove.watch.stampNotConfirmed': 'No se pudo confirmar el sello de fecha de la clave que nombra el enlace.',
  'app.prove.watch.notWho': 'No muestra quién es esa persona ni quién obtuvo la planta.',
  'app.prove.watch.olderRecord': 'Registro antiguo: clave no vinculada a este registro.',
  'app.prove.watch.holderStatement':
    'Que esta clave corresponda al registro de esta planta es, por ahora, la declaración del titular. No muestra quién es esa persona ni quién obtuvo la planta.',
  'app.prove.watch.checkedAt':
    'Comprobado {when} en la red de pruebas, que puede reiniciarse: solo práctica, sin valor como evidencia.',
  'app.prove.watch.expired': 'Esta solicitud venció sin respuesta. Haga una nueva.',
  'app.prove.watch.checking': 'Llegó una respuesta. Comprobándola en la red…',
  'app.prove.watch.pending': 'Llegó una respuesta. La red todavía no la muestra, así que se sigue comprobando.',
  'app.prove.watch.unreachable': 'No se puede conectar con VeilCore en este momento. Se sigue intentando.',
  'app.prove.watch.waiting':
    'Esperando a que lo demuestre. Puede cerrar esta página: para ver la respuesta, abra en este navegador el enlace que envió.',
  'app.prove.watch.refused.one': 'Llegó una respuesta que no pasó la comprobación: {reason}',
  'app.prove.watch.refused.other': '{count} respuestas no pasaron la comprobación: {reason}',
  'app.prove.watch.stampedYour':
    'La clave de su planta recibió el sello de fecha el {when}. Eso fecha la clave, no el registro.',
  'app.prove.watch.stampedThat': 'Esa clave recibió el sello de fecha el {when}. Eso fecha la clave, no el registro.',
  'app.prove.watch.stampedThisEarlier':
    'La clave de esta planta recibió antes un sello de fecha en la red. Eso fecha la clave, no el registro.',
  'app.prove.watch.stampedThatEarlier':
    'Esa clave recibió antes un sello de fecha en la red. Eso fecha la clave, no el registro.',
  'app.prove.own.title': 'Demuestre que tiene la clave de esta planta (red de pruebas)',
  'app.prove.own.stampFirst':
    'Ponga primero el sello de fecha: toque “Poner el sello de fecha” en la página de la planta. La prueba trata de la identidad de la planta en la cadena, que crea el sello de fecha.',
  'app.prove.own.intro':
    'Quien comprueba crea un desafío en la página de verificación del registro y se lo envía. Usted lo responde aquí; su navegador demuestra que usted tiene el secreto del registro sin revelarlo, y usted le envía el ID de transacción. Junto con el sello de fecha, eso muestra que la clave existía en el bloque {block} y que usted la controla ahora.',
  'app.prove.own.copyChecker': 'Copiar el enlace para quien comprueba (nombra la identidad del registro en la cadena)',
  'app.prove.own.tryIt': 'Pruébelo usted: ábralo como quien comprueba',
  'app.prove.own.challenge': 'El desafío de quien comprueba (64 caracteres)',
  'app.prove.own.answer': 'Responder al desafío',
  'app.prove.own.done': 'Listo. Envíe a quien comprueba este ID de transacción:',
  'app.prove.share.notFound': 'No se encontró el registro.',
  'app.prove.share.notSaved': 'Su elección no se guardó, así que no se hizo ningún enlace: {error}.',
  'app.prove.share.title': 'Elija lo que ve un desconocido',
  'app.prove.share.intro':
    'Cualquiera que tenga el ID de este registro (por un enlace que usted envíe, el código QR de su certificado o un mensaje que alguien reenvíe) puede abrir su página de verificación. Elija qué datos muestra esa página. La elección se guarda con el registro en el servidor de registros de VeilCore y se aplica a todos los que tengan el ID; puede cambiarla aquí cuando quiera, y los enlaces ya enviados muestran entonces la nueva elección.',
  'app.prove.share.shownOn': 'Se muestra en la página de verificación',
  'app.prove.share.strangerSees': 'Lo que verá un desconocido con el ID',
  'app.prove.share.reportOn':
    'Con “Si hay un informe de laboratorio guardado” activado, la página de comprobación lo dice.',
  'app.prove.share.reportOff':
    'Con “Si hay un informe de laboratorio guardado” desactivado, la página de comprobación no dice nada al respecto.',
  'app.prove.share.yourLink': 'Su enlace',
  'app.prove.share.savedOn': 'Guardado en el servidor de registros',
  'app.prove.share.savedText':
    'Quien abra este enlace, o tenga el ID de este registro por otra vía, ve los datos de la vista previa y nada más; el servidor de registros no envía el resto, y editar el enlace no puede agregar nada. La genética nunca se divulga. Esta elección controla lo que muestra la página de verificación. Demostrar un valor oculto (un marcador, un rango, o que dos variedades son distintas) sin mostrar el resto lo hace el contrato de reclamaciones de VeilCore.',
  'app.prove.share.letThemAsk': 'Permitir que comprueben el sello de fecha y me pidan demostrar que la tengo',
  'app.prove.share.theLink': 'El enlace',
  'app.prove.share.openTheirs': 'Abrir lo que verán',
  'app.prove.share.saving': 'Guardando…',
  'app.prove.share.getLink': 'Obtener el enlace',
} satisfies Partial<AppTranslation>;
