// Spanish (neutral Latin American, usted). DRAFT: machine-assisted, to be checked by a fluent
// speaker before publishing (docs/translations/README.md). Terms as in ../../es.ts; "locked"
// is bloqueado, as for lab reports.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const sealed = {
  'app.sealed.refuse.noKey':
    'este navegador no tiene la clave de sus registros, así que no se guardó nada. Restaure primero su archivo de copia de seguridad.',
  'app.sealed.refuse.mismatch': 'no coincide con su huella, así que no se guardó',
  'app.sealed.mismatch':
    'Este registro no coincide con su huella: puede haberse cambiado después de sellarlo. No se volverá a guardar, enviar ni compartir.',
  'app.sealed.locked.title.one': '{count} registro bloqueado',
  'app.sealed.locked.title.other': '{count} registros bloqueados',
  'app.sealed.locked.pageTitle': 'Este registro está bloqueado',
  'app.sealed.locked.text':
    'Este navegador no tiene la clave de estos registros. Restaure el archivo de copia de seguridad guardado después del {date}. VeilCore no puede abrirlos por usted.',
  'app.sealed.locked.textNoDate':
    'Este navegador no tiene la clave de estos registros. Restaure su archivo de copia de seguridad más reciente. VeilCore no puede abrirlos por usted.',
  'app.sealed.locked.cantChange': 'Un registro bloqueado no se puede cambiar ni enviar. Puede borrarlo.',
  'app.sealed.locked.restore': 'Restaurar mi copia de seguridad',
  'app.sealed.locked.unnamed': 'Registro sin nombre',
  'app.sealed.locked.delete': 'Borrar',
  'app.sealed.locked.deleteConfirm':
    '¿Borrar {name} de VeilCore? No se puede abrir en este navegador y, una vez borrado, nadie podrá recuperarlo.',
  'app.sealed.locked.deleted': 'Borrado.',
  'app.sealed.locked.deleteFailed': 'No se borró: {error}',
  'app.sealed.lockedAgreements.title.one': '{count} acuerdo bloqueado',
  'app.sealed.lockedAgreements.title.other': '{count} acuerdos bloqueados',
  'app.sealed.lockedAgreements.text':
    'Este navegador no tiene la clave de estos acuerdos (licencias, envíos a laboratorio o material compartido con criadores). Restaure su archivo de copia de seguridad más reciente. VeilCore no puede abrirlos por usted.',
  'app.sealed.lockedAgreements.cantChange': 'Un acuerdo bloqueado no se puede cambiar ni enviar. Puede borrarlo.',
  'app.sealed.lockedAgreements.name': 'Acuerdo bloqueado',
  'app.sealed.lockedAgreements.deleteConfirm':
    '¿Borrar el acuerdo {id} de VeilCore? No se puede abrir en este navegador y, una vez borrado, nadie puede recuperarlo.',
  'app.sealed.truncated':
    'VeilCore envió solo una parte de sus registros, así que puede que falten algunos aquí. Vuelva a cargar la página para intentarlo de nuevo.',
  'app.sealed.unreadable.one':
    '{count} registro llegó en un formato que esta versión no puede leer, así que no se muestra.',
  'app.sealed.unreadable.other':
    '{count} registros llegaron en un formato que esta versión no puede leer, así que no se muestran.',
  'app.sealed.backupNeeded':
    '<b>Guarde una copia de seguridad nueva.</b> Sus registros ahora están bloqueados con una clave que solo tiene este navegador hasta que guarde una copia de seguridad. Sin el archivo de copia de seguridad no podrá abrirlos en ningún otro lugar.',
  'app.sealed.err.newCode':
    'Este código se hizo antes de que los envíos se bloquearan, y ya no funciona. Pida al remitente un código nuevo.',
  'app.sealed.recv.missingKey':
    'A este código le falta la última parte. Puede recibirlo igualmente, pero los datos del remitente (quién lo obtuvo y cuándo) no vendrán con él. Pida primero el código completo.',
  'app.sealed.recv.notOpened':
    'Los datos del remitente no se pudieron abrir con este código, así que solo vino el nombre.',
  'app.sealed.backup.noVaultKey':
    'Esa copia de seguridad no tiene la clave que abre sus registros. Guarde una nueva y compruébela.',
  'app.sealed.backup.differentVault': 'Este navegador ya abre sus registros con otra clave. No se cambió nada.',
  'app.sealed.backup.olderFile':
    'Este archivo es de antes de que los registros se bloquearan, así que no tiene su clave. Los registros bloqueados desde entonces seguirán bloqueados hasta que abra un archivo de copia de seguridad más reciente.',
  'app.sealed.refuse.backupFirst':
    'se guardó antes de que los registros se bloquearan. Guarde una copia de seguridad y compruébela primero; después se podrán guardar los cambios',
  'app.sealed.refuse.tooLarge': 'es demasiado grande para guardarlo. Acorte sus notas e inténtelo de nuevo',
  'app.sealed.refuse.unknown':
    'No se pudo contactar con VeilCore para comprobar sus registros, así que no se guardó nada. Inténtelo de nuevo en un momento.',
  'app.sealed.refuse.cantStore':
    'este navegador no puede conservar la clave que bloquea sus registros (una ventana privada o datos del sitio bloqueados), así que no se guardó nada',
  'app.sealed.tooLarge':
    'Este registro es demasiado grande para guardarlo. Acorte sus notas e inténtelo de nuevo. No se perdió nada de lo que escribió.',
  'app.sealed.size.near': '{used} KB de {max} KB usados.',
  'app.sealed.size.over': 'Demasiado grande para guardarlo. Acorte las notas.',
  'app.sealed.older.pageTitle': 'Una copia anterior de este registro',
  'app.sealed.older':
    'El servidor envió una copia de este registro anterior a la que este navegador guardó por última vez. Si es la copia que quiere, úsela; si no, bórrela.',
  'app.sealed.olderKept.one':
    'El servidor envió una copia anterior de {count} registro. Este navegador conservó la copia más reciente y la vuelve a guardar.',
  'app.sealed.olderKept.other':
    'El servidor envió copias anteriores de {count} registros. Este navegador conservó las copias más recientes y las vuelve a guardar.',
  'app.sealed.revMismatch.one':
    'El número de versión del servidor para {count} registro no coincidía con el que lleva cerrado dentro. Este navegador se guía por el cerrado y vuelve a guardar el registro.',
  'app.sealed.revMismatch.other':
    'Los números de versión del servidor para {count} registros no coincidían con los que llevan cerrados dentro. Este navegador se guía por los cerrados y vuelve a guardar los registros.',
  'app.sealed.importLocked.one': ' Se omitió {count} registro bloqueado: este navegador no tiene su clave.',
  'app.sealed.importLocked.other': ' Se omitieron {count} registros bloqueados: este navegador no tiene su clave.',
  'app.sealed.backupBeforeLocking':
    '<b>Guarde una copia de seguridad.</b> Sus registros anteriores se bloquearán cuando un archivo de copia de seguridad tenga la clave que los abre. Hasta entonces seguirán en el servidor de VeilCore tal como se guardaron, legibles para VeilCore, y no se podrán guardar cambios en ellos.',
  'app.sealed.cantStore':
    'Este navegador no puede conservar la clave que bloquea sus registros (una ventana privada o datos del sitio bloqueados). Por eso sus registros anteriores no se bloquearon y aquí no se puede guardar nada nuevo. Abra VeilCore en una ventana normal.',
  'app.sealed.lockedParents.one':
    '{count} registro de un progenitor está bloqueado en este navegador, así que se deja fuera.',
  'app.sealed.lockedParents.other':
    '{count} registros de progenitores están bloqueados en este navegador, así que se dejan fuera.',
  'app.sealed.backup.cantCheck':
    'No se pudo contactar con VeilCore para comprobar qué clave usan sus registros, así que no se cambió nada. Inténtelo de nuevo cuando tenga conexión.',
  'app.sealed.err.handleTag':
    'Esta página y el servidor de VeilCore no coinciden. Vuelva a cargar la página e inténtelo de nuevo.',
  'app.sealed.recv.restoreFirst':
    'Este navegador no tiene la clave de sus registros, así que no puede guardar lo que reciba. Restaure primero su archivo de copia de seguridad y luego use el código.',
  'app.sealed.recv.cantCheck':
    'No se pudo contactar con VeilCore para comprobar sus registros, así que no se recibió nada. Inténtelo de nuevo en un momento.',
  'app.sealed.recv.cantStore':
    'Este navegador no puede conservar la clave que bloquea sus registros (una ventana privada o datos del sitio bloqueados), así que no se recibió nada. Abra VeilCore en una ventana normal.',
  'app.sealed.recv.notFinished':
    'Se recibió, pero su registro no se guardó, así que no se firmó nada: {error}. Use «Terminar de recibir» en el registro para volver a intentarlo.',
  'app.sealed.recv.failed': 'Algo salió mal al recibir: {error}',
  'app.sealed.recv.notAccepted':
    'Este registro aún no está guardado en VeilCore, así que no hay nada que firmar. Termine primero de recibirlo.',
  'app.sealed.recv.finishTitle': 'Esta entrega no está terminada',
  'app.sealed.recv.finishText':
    'Se recibió, pero su registro aún no está guardado. Compruebe el código de laboratorio de abajo (péguelo de nuevo si está vacío) y luego termine.',
  'app.sealed.recv.finish': 'Terminar de recibir',
  'app.sealed.recv.finishing': 'Terminando…',
  'app.sealed.recv.noRecord': 'Ese registro no está en este navegador.',
  'app.sealed.recv.otherCode': 'Ese código es de otra entrega.',
  'app.sealed.recv.offerMissing':
    'VeilCore no envió los datos bloqueados del remitente para este código, así que el registro no se terminó. Pruebe «Terminar de recibir» en el registro más tarde, o pregunte al remitente.',
  // Round 3: held saves, the lost-key path, older copies, grants listed before locking
  'app.sealed.agreementsBackupFirst':
    'Guarde una copia de seguridad y compruébela primero. Hasta entonces no se pueden crear ni cambiar acuerdos aquí.',
  'app.sealed.backup.storageRefused':
    'Este navegador no guarda nada ahora mismo (su almacenamiento está lleno o bloqueado en una ventana privada), así que no se cambió nada. Libere espacio o use una ventana normal e inténtelo de nuevo.',
  'app.sealed.backupFirstAction': 'Guarde una copia de seguridad y compruébela primero. Después podrá hacerlo.',
  'app.sealed.correctBackupFirst':
    'Guarde una copia de seguridad y compruébela primero. Después podrá corregir este registro.',
  'app.sealed.correctionLeft':
    'No se pudo quitar de VeilCore la corrección {id}. Recargue la página y revise sus registros.',
  'app.sealed.grantAsk.text':
    'Antes de que se bloquearan sus registros, este registro compartía: {keys}. No se vuelve a compartir hasta que usted lo diga.',
  'app.sealed.grantAsk.yes': 'Volver a compartir',
  'app.sealed.grantAsk.no': 'No compartir',
  'app.sealed.grantAsk.failed': 'No se guardó: {error}',
  'app.sealed.grantDiffers.text':
    'El servidor de VeilCore muestra para este registro una opción de compartir distinta de la que se guarda con él. No se cambió nada. Elija cuál ven los desconocidos.',
  'app.sealed.grantDiffers.open': 'Elegir',
  'app.sealed.importNotImported.one':
    ' {count} registro en VeilCore está bloqueado o vaciado y el archivo no pudo recuperarlo, así que no se importó.',
  'app.sealed.importNotImported.other':
    ' {count} registros en VeilCore están bloqueados o vaciados y el archivo no pudo recuperarlos, así que no se importaron.',
  'app.sealed.lost.button': 'No tengo esa copia de seguridad',
  'app.sealed.lost.confirm':
    'Sin ese archivo de copia de seguridad nadie puede abrir estos registros y acuerdos bloqueados, ni siquiera VeilCore. Mientras estén en VeilCore no se puede guardar nada nuevo para usted. ¿Borrarlos de VeilCore y empezar una clave nueva? No se puede deshacer.',
  'app.sealed.lost.done':
    'Borrados. Hay una clave nueva: guarde una copia de seguridad y compruébela, y sus registros nuevos se guardarán.',
  'app.sealed.lost.failed': 'No se borró nada: {error}',
  'app.sealed.lost.nothing': 'aquí no hay nada bloqueado con una clave perdida',
  'app.sealed.older.use': 'Usar esta copia',
  'app.sealed.older.deleteConfirm':
    '¿Borrar {name} de VeilCore? Esta copia anterior es la única copia en el servidor de VeilCore. Una vez borrada, nadie podrá recuperarla.',
  'app.sealed.recv.backupFirst':
    'Este registro se guardó antes de que los registros se bloquearan. Guarde una copia de seguridad y compruébela primero; después podrá firmar.',
  'app.sealed.recv.backupFirstClaim':
    'Guarde una copia de seguridad y compruébela primero; luego use el código. Todavía no se recibió nada.',
  'app.sealed.recv.noAnswer':
    'VeilCore no respondió ({error}). El código se guarda en este navegador. Si se recibió, aparece en sus registros con «Terminar de recibir»; si no, inténtelo de nuevo.',
  'app.sealed.refuse.backupFirstNew': 'todavía no se guardó nada. Guarde una copia de seguridad y compruébela primero',
  'app.sealed.refuse.olderCopy':
    'VeilCore ya tiene una copia más reciente, guardada desde otra pestaña u otro dispositivo, así que este cambio no se guardó. Ahora se muestra la copia más reciente; vuelva a hacer el cambio si todavía lo quiere',
  'app.sealed.unsaved.backup':
    'Aún no se guardó. Guarde su copia de seguridad y compruébela; hasta entonces solo está en este navegador.',
  'app.sealed.unsaved.key':
    'Aún no se guardó. Este navegador no tiene la clave de sus registros en VeilCore. Restaure su copia de seguridad o, si no la tiene, use «No tengo esa copia de seguridad» en la página de sus registros.',
  'app.sealed.unsaved.retry':
    'Aún no se guardó en VeilCore. Se conserva en este navegador y se vuelve a enviar en el próximo guardado.',
  'app.sealed.unsaved.short': 'Aún no se guardó: guarde su copia de seguridad',
  'app.sealed.unsaved.shortRetry': 'Aún no se guardó',
  'app.sealed.unsaved.discardConfirm':
    '¿Descartar lo que este navegador conserva para este registro? No está en VeilCore, así que no se puede recuperar.',
  'app.sealed.unsaved.discardNew': 'Borrarlo',
  'app.sealed.unsaved.discardChange': 'Deshacer el cambio',
  'app.sealed.sendNotSaved':
    'Este registro aún no está guardado en VeilCore, así que no se puede enviar. Guarde una copia de seguridad y compruébela primero.',
} satisfies Partial<AppTranslation>;
