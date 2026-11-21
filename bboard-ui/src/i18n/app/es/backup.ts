// Spanish (neutral Latin American, usted). DRAFT: machine-assisted, to be checked by a fluent
// speaker before publishing (docs/translations/README.md). Terms as in ../../es.ts.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const backup = {
  'app.backup.title': 'Guarde su copia de seguridad',
  'app.backup.done': 'Listo',
  'app.backup.shareTitle': 'Copia de seguridad de VeilCore',
  'app.backup.oneWay':
    '<b>Un archivo que usted guarda.</b> Una de las formas de recuperar sus registros, y funciona incluso sin VeilCore.',
  'app.backup.lock.text':
    'Guarda sus registros con VeilCore, cifrados para que solo usted pueda abrirlos: VeilCore no tiene la clave.',
  'app.backup.lock.orFile': 'O guarde usted mismo un archivo',
  'app.backup.lock.savedTitle': 'Guardado con VeilCore.',
  'app.backup.lock.savedText':
    'Estos registros vuelven en un dispositivo nuevo con su llave de acceso. Los nuevos se guardan solos. Si también quiere un archivo propio, está en Configuración.',
  'app.backup.lock.saving': 'Guardando con VeilCore…',
  'app.backup.saveIt': 'Guárdelo',
  'app.backup.saved': 'Guardado',
  'app.backup.savedSub': '{file} · un solo archivo para todo',
  'app.backup.labKeyNotMade':
    'No se pudo crear ahora la clave de recepción de su laboratorio, así que esta copia de seguridad aún no la contiene. Para todo lo demás, la copia sirve. Guarde una nueva cuando llegue su primer registro.',
  'app.backup.saveFile': 'Guardar el archivo de copia de seguridad',
  'app.backup.copyTitle': 'Ponga una copia en otro lugar (recomendado)',
  'app.backup.wayBack': 'Si este teléfono o esta computadora se rompen, esa copia es su forma de recuperarlo todo.',
  'app.backup.safari':
    'Este navegador puede borrar los datos de un sitio tras 7 días sin visitarlo. Su archivo de copia de seguridad es lo que recupera sus registros: consérvelo.',
  'app.backup.actAsYou':
    'Cualquiera que tenga este archivo puede abrir sus registros y actuar como usted. Lo mejor: una memoria USB o un gestor de contraseñas. Si lo envía por correo, use una cuenta con verificación en dos pasos.',
  'app.backup.sentCopy': 'Copia enviada ✓',
  'app.backup.sendCopy': 'Enviar una copia (correo, Drive, Archivos…)',
  'app.backup.shareFailed': 'Este navegador no pudo abrir su menú para compartir.',
  'app.backup.byHand': 'Es el archivo que acaba de guardar, en su carpeta de Descargas.',
  'app.backup.saveAgain': 'Guardar otra copia',
  'app.backup.savedAgain': 'Otra copia guardada ✓',
  'app.backup.checkTitle': 'Compruebe que funciona',
  'app.backup.itWorks': 'Funciona.',
  'app.backup.openIntro':
    'Abra la copia que acaba de guardar. Comprobaremos que se abre y que lo tiene todo. No se sube nada.',
  'app.backup.openCopy': 'Abrir mi copia guardada',
  'app.backup.saveFirst': 'Guarde primero el archivo de copia de seguridad.',
  'app.backup.turnsOn': 'Se activa cuando la comprobación sale bien.',
  'app.backup.pw.add': 'Agregar una contraseña (recomendado)',
  'app.backup.pw.why':
    'Así, el archivo por sí solo no abre nada: quien lo tenga también necesita la contraseña. Si la olvida, nadie puede abrir el archivo, ni siquiera nosotros.',
  'app.backup.pw.label': 'Contraseña del archivo de copia de seguridad',
  'app.backup.pw.again': 'Escríbala otra vez',
  'app.backup.pw.short': 'Al menos {n} caracteres.',
  'app.backup.pw.mismatch': 'Las contraseñas no coinciden.',
  'app.backup.pw.keep': 'Guárdela en un gestor de contraseñas, o anotada, aparte del archivo.',
  'app.backup.pw.locking': 'Bloqueando el archivo…',
  'app.backup.pw.savedSub': '{file} · un archivo para todo, cifrado con su contraseña',
  'app.backup.pw.needed': 'Esta copia de seguridad tiene contraseña. Escríbala para abrir el archivo.',
  'app.backup.pw.wrong': 'Esa contraseña no abre esta copia de seguridad. No se cambió nada.',
  'app.backup.pw.checkLabel': 'La contraseña de la copia de seguridad',
  'app.backup.pw.open': 'Abrirla',
  'app.backup.restoreTitle': 'Recupere sus registros',
  'app.backup.restoreIntro':
    '¿Teléfono o computadora nuevos, o borró los datos de su navegador? Abra el archivo de copia de seguridad que guardó.',
  'app.backup.plantsBack': 'Sus registros están de vuelta.',
  'app.backup.restored': 'Restaurado.',
  'app.backup.nothingNew': 'No hay nada nuevo en ese archivo.',
  'app.backup.sentence': '{s} ',
  'app.backup.labSigBack': 'La firma de su laboratorio también está de vuelta. ',
  'app.backup.workRestored': 'También se restauró: {work}. ',
  'app.backup.worksLikeBefore': 'Todo funciona como antes.',
  'app.backup.nDeliveries.one': '{count} envío de laboratorio',
  'app.backup.nDeliveries.other': '{count} envíos de laboratorio',
  'app.backup.nCodes.one': '{count} código de laboratorio',
  'app.backup.nCodes.other': '{count} códigos de laboratorio',
  'app.backup.and': '{a} y {b}',
  'app.backup.seeMyPlants': 'Ver mis registros',
  'app.backup.lookIn':
    'Busque en su memoria USB, en su gestor de contraseñas, o en su correo, Drive o iCloud. Cualquier nombre de archivo sirve. No se sube nada.',
  'app.backup.openFile': 'Abrir mi archivo de copia de seguridad',
  'app.backup.onlyKey': '¿Solo tiene su clave de titular (64 caracteres)?',
  'app.backup.keyLabel': 'Su clave de titular (64 caracteres)',
  'app.backup.useIt': 'Usarla',
  'app.backup.olderVersion':
    'Solo si la copió de una versión anterior de este sitio: ahora no se muestra en ninguna parte. Con ella se encuentran sus registros, pero siguen cifrados hasta que abra su archivo de copia de seguridad. Las claves de sello de fecha de cada registro también están solo en ese archivo.',
  'app.backup.cantFind':
    '<b>¿No encuentra el archivo?</b> Entonces nadie puede recuperar los registros, ni siquiera nosotros: nunca tuvimos su clave. Eso es lo que le permite demostrar que los tiene. Si su dispositivo anterior todavía funciona, abra VeilCore allí y guarde una copia de seguridad nueva.',
  'app.backup.holds.none': 'Sus registros están en él.',
  'app.backup.holds.records.one': 'Su registro está en él.',
  'app.backup.holds.records.other': 'Sus {count} registros están en él.',
  'app.backup.restoredPlants.one': 'Se restauraron las claves de {count} registro.',
  'app.backup.restoredPlants.other': 'Se restauraron las claves de {count} registros.',
  'app.backup.restoredRecords.one': 'Se restauraron las claves de {count} registro ({plants}, {datings}).',
  'app.backup.restoredRecords.other': 'Se restauraron las claves de {count} registros ({plants}, {datings}).',
  'app.backup.nPlants.one': '{count} planta',
  'app.backup.nPlants.other': '{count} plantas',
  'app.backup.nDatedReports.one': '{count} informe de laboratorio fechado',
  'app.backup.nDatedReports.other': '{count} informes de laboratorio fechados',
  'app.backup.err.notBackup':
    'Ese archivo no es una copia de seguridad de VeilCore. Elija el archivo que guardó desde VeilCore.',
  'app.backup.err.olderFile': 'Es un archivo antiguo o distinto. Elija la copia de seguridad que acaba de guardar.',
  'app.backup.err.otherSet':
    'Esa copia de seguridad pertenece a otro conjunto de registros. Elija la que acaba de guardar.',
  'app.backup.err.notNow':
    'Esa copia de seguridad no tiene sus registros tal como están ahora. Guarde una nueva y compruébela.',
  'app.backup.err.noLabSignature':
    'Esa copia de seguridad no tiene la firma de su laboratorio. Guarde una nueva y compruébela.',
  'app.backup.err.noLicenses': 'Esa copia de seguridad no tiene sus últimas licencias. Guarde una nueva y compruébela.',
  'app.backup.err.noLender':
    'Esa copia de seguridad no tiene su clave de prestamista ni sus últimas anotaciones. Guarde una nueva y compruébela.',
  'app.backup.err.noDeliveries': 'Esa copia de seguridad no tiene sus últimos envíos. Guarde una nueva y compruébela.',
  'app.backup.err.differentKeys':
    'Este navegador ya tiene claves distintas para uno de esos registros. No se cambió nada.',
  'app.backup.err.differentSet': 'Este navegador ya usa otro conjunto de registros. No se cambió nada.',
  'app.backup.err.differentLab': 'Este navegador ya tiene otra firma de laboratorio. No se cambió nada.',
  'app.backup.err.missingLatest.one':
    'A esa copia de seguridad le falta lo último de {count} de sus registros. Guarde una nueva y compruébela.',
  'app.backup.err.missingLatest.other':
    'A esa copia de seguridad le falta lo último de {count} de sus registros. Guarde una nueva y compruébela.',
  // A passkey, and records saved with VeilCore (veilcore/passkey-backup.ts, account-copy.ts).
  'app.backup.passkey.err.unsupported':
    'Este teléfono o navegador no puede crear una llave de acceso que abra una copia de seguridad. Use el archivo de copia de seguridad, o pruebe Safari en un iPhone (iOS 18.4 o posterior) o Chrome.',
  'app.backup.passkey.err.cancelled': 'Cancelado. No se cambió nada.',
  'app.backup.passkey.err.noCopy':
    'No se encontraron registros guardados con VeilCore para esa llave de acceso. Abra su archivo de copia de seguridad en su lugar.',
  'app.backup.passkey.err.unreachable':
    'No se pudo conectar con el servidor de registros de VeilCore. Revise su conexión e inténtelo de nuevo.',
  'app.backup.passkey.err.older':
    'El servidor de registros ofreció una copia más antigua que la que este dispositivo ya conoce. No se cambió nada. Inténtelo más tarde y conserve su archivo de copia de seguridad.',
  'app.backup.passkey.err.damaged':
    'Esa copia no se abrió. Puede que la hayan cambiado. Abra su archivo de copia de seguridad.',
  // A partner's intake (flow/IntakePage.tsx, veilcore/intake.ts).
  'app.intake.stay': 'Ahora no, quedarme en VeilCore',
  'app.intake.pickAgain': 'Elegir un registro para ellos',
  'app.intake.oddHost':
    'Revise bien esta dirección: {host} es un número, un nombre codificado o tiene un puerto, así que puede no ser quien usted espera.',
  'app.intake.err.notPicked': 'Ese registro no se eligió para esta solicitud. Elija el registro que quiere enviar.',
  'app.intake.title': 'Registre una muestra para {host}',
  'app.intake.intro':
    '<b>{host}</b> le pidió registrar esta muestra con VeilCore. Usted crea el registro aquí, en VeilCore, y queda en sus manos. Al final decide si les envía el ID del registro, su código de prueba y su enlace de comprobación. No les llega nada más.',
  'app.intake.ref': 'Su referencia, tal como la escribieron:',
  'app.intake.new': 'Registrar uno nuevo',
  'app.intake.pick': 'O enviar uno que ya registró',
  'app.intake.back': 'Volver a {host} sin enviar',
  'app.intake.banner': 'Registrando para {host}. Al final decide qué enviarles.',
  'app.intake.send.title': '¿Enviar este registro a {host}?',
  'app.intake.send.what':
    'Reciben el ID del registro {id} ({name}), su código de prueba y su enlace de comprobación, para que puedan comprobarlo en VeilCore.',
  'app.intake.send.not': 'No reciben sus datos, fotos, informe de ADN, claves ni copia de seguridad.',
  'app.intake.send.button': 'Enviar a {host}',
  'app.intake.send.opening': 'Abriendo {id}…',
  'app.intake.send.kept': 'El registro se queda en su VeilCore en cualquier caso.',
  'app.intake.err.title': 'Este enlace no se puede usar',
  'app.intake.err.help': 'Pida uno nuevo a quien se lo envió. No se registró ni se envió nada.',
  'app.intake.err.paste': 'Pegar un código o enlace',
  'app.intake.err.records': 'Ir a sus registros',
  'app.intake.err.lab': 'Soy un laboratorio: resultados de laboratorio',
  'app.intake.err.gone':
    'La solicitud del otro sitio ya no está (esta pestaña se cerró o se volvió a abrir). Abra su enlace otra vez.',
  'app.intake.err.noReturn': 'No indica a qué dirección volver.',
  'app.intake.err.tooLong': 'Su dirección de regreso es demasiado larga.',
  'app.intake.err.notUrl': 'Su dirección de regreso no es una dirección web.',
  'app.intake.err.notHttps': 'Su dirección de regreso no es segura (https).',
  'app.intake.err.credentials': 'Su dirección de regreso lleva un nombre de usuario o una contraseña.',
  'app.intake.err.hasHash': 'Su dirección de regreso ya tiene una parte #.',
  'app.intake.err.badState': 'Su valor de seguridad (state) falta o no es válido.',
  'app.backup.fromFileAdded': 'Registros recuperados del propio archivo: {n}.',
  'app.backup.fromFileProblem':
    'No se pudieron recuperar los registros del archivo: {why} Sus claves están restauradas.',
  'app.backup.passkey.err.busy': 'Su otro dispositivo guardó en el mismo momento. Se vuelve a intentar solo.',
} satisfies Partial<AppTranslation>;
