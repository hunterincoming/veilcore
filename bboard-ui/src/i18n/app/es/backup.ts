// Spanish (neutral Latin American, usted). DRAFT: machine-assisted, to be checked by a fluent
// speaker before publishing (docs/translations/README.md). Terms as in ../../es.ts.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const backup = {
  'app.backup.title': 'Guarde su copia de seguridad',
  'app.backup.done': 'Listo',
  'app.backup.shareTitle': 'Copia de seguridad de VeilCore',
  'app.backup.onlyWay':
    '<b>Este archivo es la única forma de demostrar que tiene sus plantas</b> y de recuperarlas en un teléfono o una computadora nuevos. VeilCore no puede recuperarlo ni hacer otro.',
  'app.backup.saveIt': 'Guárdelo',
  'app.backup.saved': 'Guardado',
  'app.backup.savedSub': '{file} · un solo archivo para todo',
  'app.backup.saveFile': 'Guardar el archivo de copia de seguridad',
  'app.backup.copyTitle': 'Ponga una copia en otro lugar',
  'app.backup.wayBack': 'Si este teléfono o esta computadora se rompen, esa copia es su forma de recuperarlo todo.',
  'app.backup.actAsYou':
    'Este archivo permite que cualquiera que lo tenga actúe como usted. Guárdelo en un lugar que solo usted pueda abrir.',
  'app.backup.sentCopy': 'Copia enviada ✓',
  'app.backup.sendCopy': 'Enviar una copia (correo, Drive, Archivos…)',
  'app.backup.shareFailed': 'Este navegador no pudo abrir su menú para compartir.',
  'app.backup.byHand':
    'Envíeselo a usted mismo por correo, o guárdelo en Google Drive, iCloud o una memoria USB. Es el archivo que acaba de guardar, en su carpeta de Descargas.',
  'app.backup.checkTitle': 'Compruebe que funciona',
  'app.backup.itWorks': 'Funciona.',
  'app.backup.openIntro':
    'Abra la copia que acaba de guardar. Comprobaremos que se abre y que lo tiene todo. No se sube nada.',
  'app.backup.openCopy': 'Abrir mi copia guardada',
  'app.backup.saveFirst': 'Guarde primero el archivo de copia de seguridad.',
  'app.backup.turnsOn': 'Se activa cuando la comprobación sale bien.',
  'app.backup.restoreTitle': 'Recupere sus plantas',
  'app.backup.restoreIntro':
    '¿Teléfono o computadora nuevos, o borró los datos de su navegador? Abra el archivo de copia de seguridad que guardó.',
  'app.backup.plantsBack': 'Sus plantas están de vuelta.',
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
  'app.backup.seeMyPlants': 'Ver mis plantas',
  'app.backup.lookIn':
    'Busque en su correo, en Drive o iCloud, o en su memoria USB. Cualquier nombre de archivo sirve. No se sube nada.',
  'app.backup.openFile': 'Abrir mi archivo de copia de seguridad',
  'app.backup.onlyKey': '¿Solo tiene su clave de titular (64 caracteres)?',
  'app.backup.keyLabel': 'Su clave de titular (64 caracteres)',
  'app.backup.useIt': 'Usarla',
  'app.backup.olderVersion':
    'Solo si la copió de una versión anterior de este sitio: ahora no se muestra en ninguna parte. Eso recupera sus registros. Las claves de sello de fecha de cada planta solo están en el archivo de copia de seguridad.',
  'app.backup.cantFind':
    '<b>¿No encuentra el archivo?</b> Entonces nadie puede recuperar las plantas, ni siquiera nosotros: nunca tuvimos su clave. Eso es lo que le permite demostrar que las tiene. Si su dispositivo anterior todavía funciona, abra VeilCore allí y guarde una copia de seguridad nueva.',
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
    'Este navegador ya tiene claves distintas para una de esas plantas. No se cambió nada.',
  'app.backup.err.differentSet': 'Este navegador ya usa otro conjunto de registros. No se cambió nada.',
  'app.backup.err.differentLab': 'Este navegador ya tiene otra firma de laboratorio. No se cambió nada.',
  'app.backup.err.missingLatest.one':
    'A esa copia de seguridad le falta lo último de {count} de sus registros. Guarde una nueva y compruébela.',
  'app.backup.err.missingLatest.other':
    'A esa copia de seguridad le falta lo último de {count} de sus registros. Guarde una nueva y compruébela.',
} satisfies Partial<AppTranslation>;
