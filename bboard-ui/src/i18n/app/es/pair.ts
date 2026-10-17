// Spanish (neutral Latin American, usted). DRAFT: machine-assisted, to be checked by a fluent
// speaker before publishing (docs/translations/README.md). Terms as in ../../es.ts.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const pair = {
  'app.pair.aFile': 'un archivo',
  'app.pair.noPlant': 'No se encontró la planta donde guardarlo.',
  'app.pair.savedTitle': 'Informe de ADN guardado en esta planta',
  'app.pair.fpLabel': 'CÓDIGO DEL VÍNCULO',
  'app.pair.openedHere': 'Abierto y guardado aquí, en su dispositivo.',
  'app.pair.stayed': 'El archivo del informe se quedó en su dispositivo.',
  'app.pair.openedHereSub':
    'El laboratorio lo envió bloqueado para que solo usted pudiera abrirlo. Solo su código y su nombre de archivo se guardaron con su registro.',
  'app.pair.stayedSub':
    'Se leyó y se le sacó el código aquí, en su navegador. Su código y su nombre de archivo se guardaron con su registro.',
  'app.pair.fileSha':
    'SHA-256 del archivo: <b>{sha}</b>. Este es el código que firma un laboratorio: compárelo con el del laboratorio. El código del vínculo de arriba se hace a partir de él, para que el vínculo pueda fecharse en la red.',
  'app.pair.labMatch':
    'Este archivo coincide con el informe de laboratorio {lead}, por su SHA-256 (firma comprobada en este navegador).',
  'app.pair.noLabMatch':
    'Ninguna firma de laboratorio de esta planta coincide con este archivo, así que sigue siendo su propia declaración.',
  'app.pair.recordChip': 'Registro · {fp}',
  'app.pair.pairingChip': 'Vínculo · {fp}',
  'app.pair.conflicts.one':
    'Atención: este informe de ADN también está guardado en {count} otro registro que usted tiene{tail}',
  'app.pair.conflicts.other':
    'Atención: este informe de ADN también está guardado en otros {count} registros que usted tiene{tail}',
  'app.pair.earliest': '. Este registro se selló primero, según los relojes de los dispositivos que los sellaron.',
  'app.pair.earlier': '. {name} se selló antes ({date}, según el reloj de su dispositivo).',
  'app.pair.saved':
    'Guardado. El código de su informe de ADN se guarda con el registro de esta planta, como su declaración de que este informe le corresponde. No es una comprobación de la genética. {dated}',
  'app.pair.dateBelow': 'Todavía no está fechado: féchelo abajo si quiere el vínculo en la red.',
  'app.pair.notDated': 'Todavía no está fechado.',
  'app.pair.notDatedHere': 'En {thisSite} el vínculo todavía no se fecha.',
  'app.pair.seeCertificate': 'Continuar: ver el certificado',
  'app.pair.title': 'Guarde su informe de ADN en esta planta',
  'app.pair.intro':
    '¿Ya le devolvieron su informe de ADN? Guárdelo en esta planta. Es lo que vincula su registro con la planta real: más adelante se puede comparar con él una prueba nueva.',
  'app.pair.savingTo': 'Guardando en: <b>{name}</b> · obtenida por {by}',
  'app.pair.replaces':
    '<b>Esta planta ya tiene un informe de ADN guardado: “{name}”{saved}.</b> Guardar este lo reemplaza. La página de su planta, su certificado y los enlaces que comparta mostrarán el nuevo, no el anterior. No se borra nada de su dispositivo.',
  'app.pair.replacesChain':
    '<b>Esta planta ya tiene un informe de ADN guardado: “{name}”{saved}.</b> Guardar este lo reemplaza. La página de su planta, su certificado y los enlaces que comparta mostrarán el nuevo, no el anterior. No se borra nada de su dispositivo. Si fechó el vínculo anterior en la red, esa fecha se queda allí.',
  'app.pair.savedOn': ', guardado el {date}',
  'app.pair.noDna':
    'VeilCore no hace pruebas de ADN: usted guarda el informe de ADN que le dio su laboratorio. Se lee y se le saca el código en su dispositivo; el archivo nunca se sube. Su código y su nombre de archivo se guardan con su registro. {after}',
  'app.pair.afterChain': 'Después también puede fechar el vínculo en la red.',
  'app.pair.afterDemo': 'En {thisSite} el vínculo todavía no se fecha; con el contrato de VeilCore, sí.',
  'app.pair.tap': 'Toque para elegir su informe de ADN',
  'app.pair.drag': 'Arrastre aquí su informe de ADN, o haga clic para elegirlo',
  'app.pair.dropHint': 'El archivo de informe que le devolvió su laboratorio: se lee en su equipo y nunca se sube.',
  'app.pair.fromLab':
    'Este es el informe de laboratorio que su laboratorio envió a través de VeilCore. Cuando lo guarde, esta página lo comprobará con la firma del laboratorio.',
  'app.pair.labCanSign':
    'Un laboratorio también puede firmar su informe con su propia clave; uno firmado tiene más peso que uno que guarda usted. Aquí, guarde el archivo del informe de ADN que tiene.',
  'app.pair.fingerprinting': 'Sacando el código en su dispositivo…',
  'app.pair.replace': 'Reemplazar el informe de ADN guardado',
  'app.pair.skip': 'Aún no tengo informe: omitir',
  'app.pair.chooseFirst': 'Elija primero el archivo del informe de ADN.',
  'app.pair.fingerprinted': 'Código hecho en su navegador.',
  'app.pair.sealedFp': 'CÓDIGO DE PRUEBA',
  'app.pair.chosen': '{title}. Elegido: {name}',
  'app.pair.ready': '{kb} KB · listo para sacar el código en este dispositivo · elija otro para reemplazarlo',
  'app.pair.chain.noKeys':
    'Este navegador no tiene las claves del registro, así que no puede fechar el vínculo. Restáurelas desde su copia de seguridad.',
  'app.pair.chain.stampFirst':
    'Ponga primero el sello de fecha de su planta (desde su página) si también quiere fechar este informe en la red.',
  'app.pair.chain.other':
    'Este registro ya tiene un vínculo fechado con otro informe. Todavía no se puede fechar un segundo, así que este informe no está fechado. Conserve el archivo de evidencia y la copia de seguridad del primero.',
  'app.pair.chain.dated': 'Este vínculo está fechado en la red de pruebas para este registro.',
  'app.pair.chain.label': 'Vínculo',
  'app.pair.chain.toShow':
    'Para mostrarlo, entregue el informe y este archivo de evidencia. Guarde una copia con el informe: sin su sal, el vínculo nunca se podrá mostrar.',
  'app.pair.chain.backupAgain':
    'Descargue de nuevo la copia de seguridad de las claves del registro: la que tiene no incluye este vínculo.',
  'app.pair.chain.download': 'Descargar el archivo de evidencia',
  'app.pair.chain.title': 'Fechar también este vínculo en la red de pruebas (opcional)',
  'app.pair.chain.intro':
    'Esto pone un código en la cadena, de forma permanente, junto a la identidad de este registro. El código se hace con el SHA-256 del informe y un número aleatorio guardado en este navegador, así que no dice nada del informe y nadie puede copiarlo a su propio registro. Después descarga un archivo de evidencia: con él y el informe, cualquiera puede comprobar que el titular de este registro tenía el informe en esa fecha.',
  'app.pair.chain.earlier':
    'Un intento anterior se envió pero no se confirmó. Puede que haya llegado. Volver a enviar usa el mismo código, así que no puede vincular un segundo distinto.',
  'app.pair.chain.sendAgain': 'Enviar de nuevo',
  'app.pair.chain.date': 'Fechar el vínculo',
  'app.pair.chain.testOnly':
    'Solo red de pruebas. Esto muestra que quien controlaba la identidad de este registro tenía el informe, o su SHA-256, en la fecha en que llegue. No es una comprobación de la genética.',
} satisfies Partial<AppTranslation>;
