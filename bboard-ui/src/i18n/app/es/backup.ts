// Spanish (neutral Latin American, usted). DRAFT: machine-assisted, to be checked by a fluent
// speaker before publishing (docs/translations/README.md). Terms as in ../../es.ts.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const backup = {
  'app.backup.title': 'Guarde su copia de seguridad',
  'app.backup.done': 'Listo',
  'app.backup.shareTitle': 'Copia de seguridad de VeilCore',
  'app.backup.onlyWay':
    '<b>Este archivo es la única forma de demostrar que tiene sus registros</b> y de recuperarlos en un teléfono o una computadora nuevos. VeilCore no puede recuperarlo ni hacer otro.',
  'app.backup.saveIt': 'Guárdelo',
  'app.backup.saved': 'Guardado',
  'app.backup.savedSub': '{file} · un solo archivo para todo',
  'app.backup.saveFile': 'Guardar el archivo de copia de seguridad',
  'app.backup.copyTitle': 'Ponga una copia en otro lugar (recomendado)',
  'app.backup.wayBack': 'Si este teléfono o esta computadora se rompen, esa copia es su forma de recuperarlo todo.',
  'app.backup.actAsYou':
    'Cualquiera que tenga este archivo puede abrir sus registros y actuar como usted. Lo mejor: una memoria USB o un gestor de contraseñas. Si lo envía por correo, use una cuenta con verificación en dos pasos.',
  'app.backup.sentCopy': 'Copia enviada ✓',
  'app.backup.sendCopy': 'Enviar una copia (correo, Drive, Archivos…)',
  'app.backup.shareFailed': 'Este navegador no pudo abrir su menú para compartir.',
  'app.backup.byHand':
    'Guárdelo en una memoria USB o en un gestor de contraseñas. Es el archivo que acaba de guardar, en su carpeta de Descargas.',
  'app.backup.saveAgain': 'Guardar otra copia',
  'app.backup.savedAgain': 'Otra copia guardada ✓',
  'app.backup.checkTitle': 'Compruebe que funciona',
  'app.backup.itWorks': 'Funciona.',
  'app.backup.openIntro':
    'Abra la copia que acaba de guardar. Comprobaremos que se abre y que lo tiene todo. No se sube nada.',
  'app.backup.openCopy': 'Abrir mi copia guardada',
  'app.backup.saveFirst': 'Guarde primero el archivo de copia de seguridad.',
  'app.backup.turnsOn': 'Se activa cuando la comprobación sale bien.',
  'app.backup.pw.add': 'Añadir una contraseña (recomendado)',
  'app.backup.pw.why':
    'Así el archivo solo no abre nada: quien lo tenga también necesita la contraseña. Si la olvida, nadie puede abrir el archivo, ni siquiera nosotros.',
  'app.backup.pw.label': 'Contraseña del archivo de copia de seguridad',
  'app.backup.pw.again': 'Escríbala otra vez',
  'app.backup.pw.short': 'Al menos {n} caracteres.',
  'app.backup.pw.mismatch': 'Las dos no coinciden.',
  'app.backup.pw.keep': 'Guárdela en un gestor de contraseñas, o anotada, aparte del archivo.',
  'app.backup.pw.locking': 'Bloqueando el archivo…',
  'app.backup.pw.savedSub': '{file} · un archivo para todo, bloqueado con su contraseña',
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
    'Solo si la copió de una versión anterior de este sitio: ahora no se muestra en ninguna parte. Con ella se encuentran sus registros, pero siguen bloqueados hasta que abra su archivo de copia de seguridad. Las claves de sello de fecha de cada registro también están solo en ese archivo.',
  'app.backup.cantFind':
    '<b>¿No encuentra el archivo?</b> Entonces nadie puede recuperar los registros, ni siquiera nosotros: nunca tuvimos su clave. Eso es lo que le permite demostrar que los tiene. Si su dispositivo anterior todavía funciona, abra VeilCore allí y guarde una copia de seguridad nueva.',
  'app.backup.holds.none': 'Sus registros están en él.',
  'app.backup.holds.records.one': 'Su registro está en él.',
  'app.backup.holds.records.other': 'Sus {count} registros están en él.',
  'app.backup.holds.plants.one': 'Su planta está en él.',
  'app.backup.holds.plants.other': 'Sus {count} plantas están en él.',
  'app.backup.restoredPlants.one': 'Se restauraron las claves de {count} planta.',
  'app.backup.restoredPlants.other': 'Se restauraron las claves de {count} plantas.',
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
  'app.backup.err.noDeliveries': 'Esa copia de seguridad no tiene sus últimos envíos. Guarde una nueva y compruébela.',
  'app.backup.err.differentKeys':
    'Este navegador ya tiene claves distintas para uno de esos registros. No se cambió nada.',
  'app.backup.err.differentSet': 'Este navegador ya usa otro conjunto de registros. No se cambió nada.',
  'app.backup.err.differentLab': 'Este navegador ya tiene otra firma de laboratorio. No se cambió nada.',
  'app.backup.err.missingLatest.one':
    'A esa copia de seguridad le falta lo último de {count} de sus registros. Guarde una nueva y compruébela.',
  'app.backup.err.missingLatest.other':
    'A esa copia de seguridad le falta lo último de {count} de sus registros. Guarde una nueva y compruébela.',
  // The passkey copy (veilcore/passkey-backup.ts, flow/PasskeyCopy.tsx).
  'app.backup.passkey.title': 'Guarde también una copia que se abre con una llave de acceso',
  'app.backup.passkey.why':
    'Si pierde este teléfono, su llave de acceso lo recupera todo: se sincroniza con su teléfono nuevo a través de su cuenta de Apple o Google. La copia está cerrada con una clave que solo su llave de acceso puede crear. VeilCore no puede abrirla.',
  'app.backup.passkey.keepFile':
    'Guarde también el archivo. Si borra la llave de acceso, borra la única clave de esta copia.',
  'app.backup.passkey.make': 'Crear una copia con llave de acceso',
  'app.backup.passkey.current': 'Copia con llave de acceso al día, guardada el {date}',
  'app.backup.passkey.behind': 'Su copia con llave de acceso es del {date} y le faltan cambios más recientes.',
  'app.backup.passkey.update': 'Actualizar la copia con llave de acceso',
  'app.backup.passkey.remove': 'Borrar la copia con llave de acceso',
  'app.backup.passkey.removed':
    'Copia borrada. Para borrar la llave de acceso en sí, use los ajustes de contraseñas de su teléfono.',
  'app.backup.passkey.restore': 'Usar mi llave de acceso',
  'app.backup.passkey.restoreHint':
    '¿Ya creó una copia con llave de acceso? Use su llave de acceso en lugar de un archivo.',
  'app.backup.passkey.found': 'Encontramos su copia con llave de acceso, guardada el {date}. ¿Restaurarla aquí?',
  'app.backup.passkey.restoreIt': 'Restaurarla',
  'app.backup.passkey.notThis': 'Esta no',
  'app.backup.passkey.from': 'De su copia con llave de acceso guardada el {date}.',
  'app.backup.passkey.err.unsupported':
    'Este teléfono o navegador no puede crear una llave de acceso que abra una copia de seguridad. Use el archivo de copia de seguridad, o pruebe Safari en un iPhone (iOS 18.4 o posterior) o Chrome.',
  'app.backup.passkey.err.cancelled': 'Cancelado. No se cambió nada.',
  'app.backup.passkey.err.noCopy':
    'No se encontró ninguna copia para esa llave de acceso. Abra su archivo de copia de seguridad.',
  'app.backup.passkey.err.unreachable':
    'No se pudo conectar con el registro de VeilCore. Revise su conexión e inténtelo de nuevo.',
  'app.backup.passkey.err.damaged':
    'Esa copia no se abrió. Puede que la hayan cambiado. Abra su archivo de copia de seguridad.',
} satisfies Partial<AppTranslation>;
