// La aplicación en español: los registros guardados con VeilCore (../en/account.ts).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const account = {
  'app.account.use.faceId': 'Usar Face ID',
  'app.account.use.touchId': 'Usar Touch ID',
  'app.account.use.screenLock': 'Usar el bloqueo de pantalla',
  'app.account.use.windowsHello': 'Usar Windows Hello',
  'app.account.use.passkey': 'Usar una llave de acceso',

  'app.account.sheet.title': 'Mantenga sus registros a salvo',
  'app.account.sheet.lead': 'Para que pueda recuperarlos, aunque pierda este dispositivo.',
  'app.account.sheet.how':
    'Sus registros se guardan con VeilCore, cifrados para que solo usted pueda abrirlos: VeilCore no tiene la clave. Sus otros teléfonos y computadoras con la misma cuenta de Apple o Google también los abren. Los documentos que guarda solo en este dispositivo no se incluyen.',
  'app.account.sheet.usePhone':
    'Esta computadora no puede desbloquear una llave de acceso por sí sola. Su navegador ofrecerá «Usar un teléfono»: escanee el código con su teléfono.',
  'app.account.sheet.twice':
    'Su dispositivo pregunta dos veces: una para crear la llave de acceso y otra para comprobar que abre sus registros.',
  'app.account.sheet.otherWays': 'Otras formas',
  'app.account.sheet.file': 'Guardar un archivo yo mismo',
  'app.account.sheet.fileHint':
    'Un archivo que guarda usted, en una memoria USB o en un gestor de contraseñas. También en Ajustes.',
  'app.account.sheet.notNow': 'Ahora no',
  'app.account.sheet.failed': 'No funcionó: {why}',
  'app.account.saved.title': 'Guardado.',
  'app.account.saved.text': 'Sus registros están guardados con VeilCore. Los nuevos se guardan solos.',
  'app.account.saved.bound':
    'Solo este dispositivo puede abrir sus registros guardados: si se pierde, se reemplaza o se restablece, necesitará su hoja de recuperación.',
  'app.account.saved.download': 'Descargar una copia',
  'app.account.saved.done': 'Listo',

  'app.account.line.none': '<b>Aún no está guardado en su cuenta.</b>',
  'app.account.line.fix': 'Arreglarlo',
  'app.account.line.older': '<b>Desbloquee sus registros guardados una vez para seguir guardando.</b>',
  'app.account.line.locked':
    '<b>El guardado está en pausa en este dispositivo.</b> Abra sus registros una vez para continuar.',
  'app.account.line.continue': 'Continuar',
  'app.account.line.missing': '<b>El servidor de VeilCore ya no tiene sus registros guardados.</b> Guárdelos de nuevo.',
  'app.account.line.saveAgain': 'Guardar de nuevo',
  'app.account.line.slotMissing':
    '<b>Una forma de abrir sus registros guardados falta o cambió en el servidor de VeilCore.</b> Configúrelo de nuevo.',
  'app.account.line.serverOlder':
    '<b>Algo no está bien en el servidor de VeilCore.</b> Sus registros en este dispositivo están bien y no se cambió nada. Descargue una copia por seguridad.',
  'app.account.line.failing': '<b>No se pudo guardar en su cuenta.</b> {why} Se vuelve a intentar solo.',
  'app.account.line.tryNow': 'Intentar ahora',
  'app.account.line.bound':
    '<b>Solo este dispositivo puede abrir sus registros guardados.</b> Cree una hoja de recuperación para recuperarlos si lo pierde.',
  'app.account.line.download': 'Descargar una copia',
  'app.account.line.deviceOnly.one':
    '<b>{count} documento está solo en este dispositivo.</b> Descargue una copia para mantenerlo a salvo.',
  'app.account.line.deviceOnly.other':
    '<b>{count} documentos están solo en este dispositivo.</b> Descargue una copia para mantenerlos a salvo.',
  'app.account.line.stale': 'Su {device} no guarda desde el {date}. Si aún lo usa, abra VeilCore en él.',
  'app.account.line.gone': 'Quitar este dispositivo',
  'app.account.line.unknownSlot': '<b>Algo que usted no agregó puede abrir sus registros guardados.</b>',
  'app.account.line.seeSettings': 'Ver Ajustes',

  'app.account.device.iphone': 'iPhone',
  'app.account.device.ipad': 'iPad',
  'app.account.device.android': 'teléfono Android',
  'app.account.device.mac': 'Mac',
  'app.account.device.windows': 'computadora Windows',
  'app.account.device.linux': 'computadora',
  'app.account.device.other': 'otro dispositivo',

  'app.account.restore.lead': 'Abra sus registros en este dispositivo.',
  'app.account.restore.sameAccount':
    '¿La misma cuenta de Apple o Google que en su otro teléfono? Entonces funciona sin más.',
  'app.account.restore.usePhone':
    '¿En una computadora sin Face ID? Elija «Usar un teléfono» en la ventana que se abre y escanee el código con su teléfono.',
  'app.account.restore.oldName': '¿Creó su llave de acceso antes en {host}? Pruébela aquí',
  'app.account.restore.otherWays': 'Otras formas',
  'app.account.restore.found':
    'Encontramos sus registros guardados con VeilCore el {date}. ¿Traerlos a este dispositivo?',
  'app.account.restore.bring': 'Traerlos aquí',
  'app.account.restore.notThis': 'Esta no',
  'app.account.restore.welcome.one': 'Bienvenido de nuevo. Aquí está {count} registro.',
  'app.account.restore.welcome.other': 'Bienvenido de nuevo. Aquí están {count} registros.',
  'app.account.restore.elsewhere.one':
    '{count} documento se guarda solo en su {device}, por eso no aparece aquí. Ábralo allí.',
  'app.account.restore.elsewhere.other':
    '{count} documentos se guardan solo en su {device}, por eso no aparecen aquí. Ábralos allí.',
  'app.account.restore.savedOn': 'De sus registros guardados con VeilCore el {date}.',

  'app.settings.title': 'Ajustes',
  'app.settings.link': 'Ajustes',
  'app.settings.account.title': 'Guardado con VeilCore',
  'app.settings.account.on': 'Guardado el {date}. Los registros nuevos se guardan solos.',
  'app.settings.account.bound': 'Guardado el {date}, pero solo este dispositivo puede abrirlo.',
  'app.settings.account.off':
    'Sin configurar. Guarde sus registros con VeilCore para recuperarlos en un teléfono nuevo.',
  'app.settings.account.why':
    'Sus registros se guardan cifrados en el servidor de VeilCore, y solo usted puede abrirlos. Vuelven de allí, así que esto funciona mientras VeilCore esté en marcha. Una copia descargada funciona sin VeilCore.',
  'app.settings.ways.title': 'Formas de abrirlos',
  'app.settings.ways.synced':
    'Llave de acceso en sus dispositivos con la misma cuenta de Apple o Google · agregada el {date}',
  'app.settings.ways.bound': 'Llave de acceso en un solo dispositivo · agregada el {date}',
  'app.settings.ways.unknown.one':
    '{count} forma que usted no agregó puede abrir sus registros guardados. Si no la agregó usted, deje de guardar con VeilCore y configúrelo de nuevo.',
  'app.settings.ways.unknown.other':
    '{count} formas que usted no agregó pueden abrir sus registros guardados. Si no las agregó usted, deje de guardar con VeilCore y configúrelo de nuevo.',
  'app.settings.devices.title': 'Sus dispositivos',
  'app.settings.devices.line': '{device} · guardado por última vez el {date}',
  'app.settings.devices.here': '{device} (este) · guardado por última vez el {date}',
  'app.settings.stop': 'Dejar de guardar con VeilCore',
  'app.settings.stopConfirm':
    '¿Borrar sus registros guardados con VeilCore? Este dispositivo los conserva. Sus otros dispositivos dejan de guardar, y el primero que vuelva a guardar crea una copia nueva. Sus hojas de recuperación dejan de funcionar. La llave de acceso sigue en los ajustes de su teléfono.',
  'app.settings.stopped': 'Borrado. Sus registros siguen en este dispositivo.',
  'app.settings.file.title': 'Descargar una copia',
  'app.settings.file.text':
    'Un archivo que guarda usted. Funciona sin VeilCore y es el único otro lugar donde se guardan los documentos que tiene solo en este dispositivo.',
  'app.settings.file.button': 'Descargar una copia',
  'app.settings.devices.removeConfirm': '¿Quitar su {device} de esta lista? Si vuelve a guardar, vuelve a aparecer.',
  'app.account.line.healed':
    'Algo no estaba bien en el servidor de VeilCore. Su copia más reciente se guardó de nuevo y no se perdió nada.',
  'app.account.line.ok': 'Entendido',
  'app.account.line.deletedHere.one':
    '<b>{count} registro de aquí se borró en su otro dispositivo.</b> ¿Conservarlo aquí?',
  'app.account.line.deletedHere.other':
    '<b>{count} registros de aquí se borraron en su otro dispositivo.</b> ¿Conservarlos aquí?',
  'app.account.line.keepThem': 'Conservar',
  'app.account.restore.deleted.one': '{count} registro se borró en sus otros dispositivos y no se traerá aquí.',
  'app.account.restore.deleted.other': '{count} registros se borraron en sus otros dispositivos y no se traerán aquí.',
  'app.account.restore.bringAnyway': 'Traerlos de todos modos',
  'app.account.restore.adoptFailed':
    'Sus registros están aquí, pero este dispositivo no pudo empezar a guardar con VeilCore: {why}',
  'app.account.restore.tryAgain': 'Intentar de nuevo',
  'app.account.restore.tryWww': '¿Usó primero www.veilcore.org? Abra esta página allí.',
  'app.settings.ways.tag': 'Con el nombre «VeilCore: unlocks your records · {tag}» en sus contraseñas',
} satisfies Partial<AppTranslation>;
