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
    '<b>Guarde una copia de seguridad nueva.</b> Sus registros ahora están bloqueados con una clave que solo tiene este navegador. Sin el archivo de copia de seguridad no podrá abrirlos en ningún otro lugar.',
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
  'app.sealed.older': 'El servidor envió una copia anterior de este registro.',
  'app.sealed.olderKept.one':
    'El servidor envió una copia anterior de {count} registro. Este navegador conservó la copia más reciente y la vuelve a guardar.',
  'app.sealed.olderKept.other':
    'El servidor envió copias anteriores de {count} registros. Este navegador conservó las copias más recientes y las vuelve a guardar.',
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
} satisfies Partial<AppTranslation>;
