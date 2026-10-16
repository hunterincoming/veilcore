// Spanish (neutral Latin American, usted). DRAFT: machine-assisted, to be checked by a fluent
// speaker before publishing (docs/translations/README.md). Terms as in ../../es.ts.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const importing = {
  'app.import.noRows':
    'Ese archivo no tiene filas debajo de los nombres de columna. Una fila debe nombrar las columnas, con una fila por planta debajo.',
  'app.import.title': 'Feche toda su colección',
  'app.import.intro':
    '¿Ya lleva una hoja de cálculo de sus plantas o accesiones? Selle cada fila como su propio registro de una sola vez, cada uno con un sello de fecha, como si los hubiera registrado uno por uno.',
  'app.import.fileKind':
    'Un archivo CSV o Excel (.xlsx), solo la primera hoja, con una fila que nombre las columnas (puede haber un título encima). Hasta {max} filas a la vez.',
  'app.import.notKept':
    'Este navegador no conservará nada al cerrarlo (una ventana privada, o datos del sitio bloqueados). La clave de cada registro vive en este navegador hasta que guarde su copia de seguridad, así que abra esta página en una ventana normal.',
  'app.import.reading': 'Leyendo su archivo…',
  'app.import.choose': 'Elegir un archivo',
  'app.import.normalWindow': 'Abra esta página en una ventana normal del navegador para usarla.',
  'app.import.readHere':
    'Su archivo se lee aquí, en este navegador, y no se sube. De cada fila, solo se guardan los datos que elija en la siguiente pantalla, los mismos datos que al registrar una planta. Se guardan bloqueados en {server}, y nosotros no tenemos la clave; el nombre de la planta no está bloqueado. Solo una huella se fecha en {dated}.',
  'app.import.testSite': 'Este es un sitio de pruebas: los registros que se hacen aquí son datos de prueba.',
  'app.import.earlierStamps': 'Sellos de fecha de claves de importaciones anteriores',
  'app.import.rowLine': 'Fila {line}: {text}',
  'app.import.row': 'Fila {line}',
  'app.import.end': '.',
  'app.import.notGiven': 'No indicado',
  'app.import.field.strainName': 'Nombre de la planta o línea',
  'app.import.field.refId': 'Su ID (número de accesión o de lote)',
  'app.import.field.taxon': 'Especie',
  'app.import.field.parents': 'Padres',
  'app.import.field.parents2': 'Segundo padre',
  'app.import.field.bredBy': 'Obtenida por',
  'app.import.field.dateCreated': 'Fecha (su propia nota)',
  'app.import.field.notes': 'Notas',
  'app.import.header.title': '¿Qué fila tiene los nombres de columna?',
  'app.import.header.intro':
    'Elegimos la fila que parece tener los nombres de columna. Las filas de encima, como un título, quedan fuera.',
  'app.import.header.label': 'Los nombres de columna están en',
  'app.import.header.names': 'Nombres de columna (fila {line})',
  'app.import.header.firstAt': 'Primera planta (fila {line})',
  'app.import.header.first': 'Primera planta',
  'app.import.header.noRows': 'No hay filas debajo de esta.',
  'app.import.header.under.one': '{count} fila debajo de los nombres de columna',
  'app.import.header.under.other': '{count} filas debajo de los nombres de columna',
  'app.import.header.above.one': '; {count} fila de encima queda fuera',
  'app.import.header.above.other': '; {count} filas de encima quedan fuera',
  'app.import.header.next': 'Siguiente: qué columna es cuál',
  'app.import.header.pickHint': 'Elija una fila con plantas debajo.',
  'app.import.header.back': 'Elegir otro archivo',
  'app.import.cols.title': '¿Qué columna es cuál?',
  'app.import.cols.intro':
    'Lo adivinamos a partir de los nombres de columna. Revise cada una. Solo hace falta el nombre de la planta; las columnas que deje fuera nunca se envían. El nombre de la planta es público: cualquiera con el enlace de comprobación de un registro lo ve. Si los nombres son secretos, elija una columna de nombres en clave.',
  'app.import.cols.example': 'Por ejemplo: {v}',
  'app.import.cols.twoParents': 'Dos padres en una celda está bien, como “Madre x Padre”.',
  'app.import.cols.pick': 'Elegir una columna',
  'app.import.cols.notInFile': 'No está en mi archivo',
  'app.import.cols.bredBy': 'Obtenida por, cuando una fila no lo dice',
  'app.import.cols.bredByHelp': 'Su nombre o empresa, si usted las obtuvo. Déjelo vacío si no lo sabe.',
  'app.import.cols.dates': '¿Cómo se escriben las fechas?',
  'app.import.cols.datesHelp':
    'Algunas fechas, como 03/04/2021, pueden leerse de las dos formas. Elija cómo las escribe su archivo, o se conservan tal como están.',
  'app.import.cols.auto': 'Conservar tal como están las fechas dudosas',
  'app.import.cols.mdy': 'Primero el mes (03/14/2021)',
  'app.import.cols.dmy': 'Primero el día (14/03/2021)',
  'app.import.cols.next': 'Siguiente: revisar las filas',
  'app.import.cols.pickHint': 'Elija la columna con el nombre de la planta o línea.',
  'app.import.cols.back': 'Cambiar la fila de nombres de columna',
  'app.import.card.name': 'Planta o línea',
  'app.import.card.id': 'Su ID',
  'app.import.card.date': 'Fecha (su nota)',
  'app.import.check.title': '¿Está bien así?',
  'app.import.check.ready.one': '{count} fila lista para sellar',
  'app.import.check.ready.other': '{count} filas listas para sellar',
  'app.import.check.already': ' · {n} selladas antes, se dejan como están',
  'app.import.check.problems': ' · {n} no se pueden sellar',
  'app.import.check.pickRow': 'Elegir la fila',
  'app.import.check.headerRows.one':
    'La fila {rows} parece de nombres de columna, no una planta, así que queda fuera. Si sus nombres de columna están en esa fila, elíjala como fila de nombres de columna.',
  'app.import.check.headerRows.other':
    'Las filas {rows} parecen de nombres de columna, no plantas, así que quedan fuera. Si sus nombres de columna están en una de ellas, elíjala como fila de nombres de columna.',
  'app.import.check.firstRows.one': 'La primera fila, exactamente como se sellará',
  'app.import.check.firstRows.other': 'Las primeras {count} filas, exactamente como se sellarán',
  'app.import.check.ambiguous.one':
    '{count} fecha puede ser día primero o mes primero, así que se conserva tal como está. Para cambiarlo, vuelva atrás y elija cómo escribe las fechas su archivo.',
  'app.import.check.ambiguous.other':
    '{count} fechas pueden ser día primero o mes primero, así que se conservan tal como están. Para cambiarlo, vuelva atrás y elija cómo escribe las fechas su archivo.',
  'app.import.check.cantSeal.one': '{count} fila no se puede sellar',
  'app.import.check.cantSeal.other': '{count} filas no se pueden sellar',
  'app.import.check.fixThem.one':
    'Queda fuera. Corríjala en su archivo e impórtelo de nuevo más adelante: las filas ya selladas se omiten.',
  'app.import.check.fixThem.other':
    'Quedan fuera. Corríjalas en su archivo e impórtelo de nuevo más adelante: las filas ya selladas se omiten.',
  'app.import.check.more': 'Y {n} más. El archivo de resultados las incluye todas.',
  'app.import.check.onceSealed':
    '<b>Una vez sellados, no se pueden cambiar.</b> Puede agregar informes y correcciones después; una corrección es un registro nuevo que apunta al anterior.',
  'app.import.check.savedOn':
    'Los datos de arriba se guardan bloqueados en {server}, un registro por fila, y nosotros no tenemos la clave. Los nombres de las plantas no están bloqueados: cualquiera con un enlace de comprobación los ve. Solo una huella de cada uno se fecha en {dated}. Un sello de fecha muestra que los datos existían en esa fecha; no confirma que sean correctos.',
  'app.import.check.sealN.one': 'Sellar {count} registro',
  'app.import.check.sealN.other': 'Sellar {count} registros',
  'app.import.check.nothing': 'Nada que sellar',
  'app.import.check.everyRow': 'Cada fila ya está sellada o no se puede sellar.',
  'app.import.check.back': 'Cambiar las columnas',
  'app.import.seal.sealing': 'Sellando sus registros…',
  'app.import.seal.paused': 'Sellado en pausa',
  'app.import.seal.pickUp': 'Seguir donde se detuvo',
  'app.import.seal.toSeal.one': '{file}: {count} fila por sellar.',
  'app.import.seal.toSeal.other': '{file}: {count} filas por sellar.',
  'app.import.seal.aria': 'Sellando sus registros',
  'app.import.seal.of': 'Sellados {done} de {total}',
  'app.import.seal.keepOpen': 'Mantenga esta página abierta.',
  'app.import.seal.kept': 'Si se cierra, vuelva a esta página: sigue donde se detuvo y nunca sella una fila dos veces.',
  'app.import.seal.notKept':
    'Este navegador no pudo conservar el progreso: si la página se cierra, elija de nuevo el mismo archivo. Las filas ya selladas se omiten.',
  'app.import.seal.carryOn': 'Seguir sellando',
  'app.import.seal.stop': 'Detenerse aquí y terminar con lo sellado',
  'app.import.sum.sealed.one': '{count} registro sellado',
  'app.import.sum.sealed.other': '{count} registros sellados',
  'app.import.sum.nothingNew': 'No se selló nada nuevo',
  'app.import.sum.before.one': '{count} fila sellada antes, se deja como está.',
  'app.import.sum.before.other': '{count} filas selladas antes, se dejan como están.',
  'app.import.sum.notSealed.one': '{count} fila sin sellar:',
  'app.import.sum.notSealed.other': '{count} filas sin sellar:',
  'app.import.sum.waiting.one': '{count} fila todavía sin sellar. Importe el archivo de nuevo para sellarla.',
  'app.import.sum.waiting.other': '{count} filas todavía sin sellar. Importe el archivo de nuevo para sellarlas.',
  'app.import.sum.stampsHere':
    'Sus registros ya están sellados y se fecharán con su lote en {dated}; eso no depende de los sellos de fecha de sus claves. La clave de cada planta también recibe su propio sello de fecha desde este navegador, unos {perDay} por día, así que los {n} en cola tardan unos {days}. Empiezan después de su copia de seguridad.',
  'app.import.sum.byBatch':
    'Su sello de fecha público llega cuando su lote se fecha en {dated}. No tiene que hacer nada.',
  'app.import.sum.untilSaved':
    'Hasta que la guarde y la compruebe, las claves de los registros nuevos están solo en este navegador.',
  'app.import.sum.noDna.one':
    '{count} de estas plantas aún no tiene informe de ADN, así que no está vinculada con la planta misma. Para añadir uno, abra la página de la planta y siga “Obtenga una huella de ADN de esta planta”: envíe una muestra a un laboratorio con un código de laboratorio, o guarde un informe que ya tenga.',
  'app.import.sum.noDna.other':
    '{count} de estas plantas aún no tienen informe de ADN, así que no están vinculadas con las plantas mismas. Para añadir uno, abra la página de una planta y siga “Obtenga una huella de ADN de esta planta”: envíe una muestra a un laboratorio con un código de laboratorio, o guarde un informe que ya tenga.',
  'app.import.days.one': '{count} día',
  'app.import.days.other': '{count} días',
  'app.import.stamps.heading': 'Sellos de fecha de las claves',
  'app.import.stamps.of': '{heading}: {stamped} de {total}',
  'app.import.stamps.already':
    'Sus registros ya están sellados y se fecharán con su lote en {dated}. Eso no depende de estos sellos de fecha de claves.',
  'app.import.stamps.each':
    'La clave de cada planta también recibe un sello de fecha desde este navegador, para que más adelante pueda demostrar que la tiene. El servicio gratuito de tarifas hace unos {perDay} por día desde cada navegador{queued}. Se envían mientras esta página está abierta. La página de cada planta también puede poner su sello.',
  'app.import.stamps.queued': ', así que los {n} en cola tardan unos {days}',
  'app.import.stamps.stamping': 'Poniendo el sello de fecha a {name}…',
  'app.import.stamps.allDone': 'Todo listo.',
  'app.import.stamps.goOn': 'Continuar',
  'app.import.stamps.saveIt': 'Guardarla',
  'app.import.stamps.newSince.one':
    '{count} sello de fecha de clave llegó después de su copia de seguridad. Guarde una copia nueva para conservarlo.',
  'app.import.stamps.newSince.other':
    '{count} sellos de fecha de claves llegaron después de su copia de seguridad. Guarde una copia nueva para conservarlos.',
  'app.import.done.title': 'Su colección está sellada',
  'app.import.done.new.one': '{count} registro nuevo',
  'app.import.done.new.other': '{count} registros nuevos',
  'app.import.done.before': ', {n} sellados antes',
  'app.import.done.notSealed': ', {n} sin sellar',
  'app.import.done.download': 'Descargar los resultados (CSV)',
  'app.import.done.downloadText':
    'Sus filas tal como estaban, cada una con su ID de registro, su huella y un enlace que cualquiera puede abrir para comprobarlo. Hecho aquí; no se sube nada.',
  'app.import.done.csvDna': ' Su columna “DNA report” indica qué registros aún no tienen uno.',
  'app.import.done.byBatch':
    'Su sello de fecha público llega cuando su lote se fecha en {dated}. La página de cada planta muestra cuándo ocurrió. No tiene que hacer nada.',
  'app.import.done.dateStamp':
    'Un sello de fecha muestra que los datos existían en esa fecha. No confirma que sean correctos.',
  'app.import.done.toPlants': 'Ir a sus plantas',
  'app.import.done.another': 'Importar otro archivo',
} satisfies Partial<AppTranslation>;
