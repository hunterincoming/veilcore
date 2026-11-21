// The record app in Spanish: scanning a code into a box, and printing QR labels (../en/scan.ts).
// Terms: escanear, código QR, código de barras, etiqueta, página de comprobación, enlace de
// comprobación, código de prueba, caravana (ear tag), usted.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const scan = {
  'app.scan.buttonLabel': 'Escanear un código QR o de barras en este campo',
  'app.scan.nfcLabel': 'Leer una etiqueta NFC en este campo',
  'app.scan.title': 'Escanear un código',
  'app.scan.starting': 'Abriendo la cámara…',
  'app.scan.point':
    'Apunte la cámara al código QR o de barras. Se lee en este dispositivo; no se envía nada para leerlo.',
  'app.scan.video': 'Imagen de la cámara',
  'app.scan.denied':
    'No se permitió la cámara. Puede permitirla en la configuración de este navegador para este sitio, o escribir el código.',
  'app.scan.noCamera': 'No se encontró ninguna cámara en este dispositivo. Escriba el código.',
  'app.scan.unsupported': 'Este navegador no puede abrir la cámara aquí. Escriba el código.',
  'app.scan.failed': 'No se pudo iniciar la cámara o el lector de códigos. Escriba el código.',
  'app.scan.typeInstead': 'Prefiero escribirlo',
  'app.scan.done': 'Escaneado en «{field}». Revíselo antes de continuar.',
  'app.scan.notLabel':
    'Ese código no es una etiqueta de VeilCore. Apunte la cámara al código QR de la etiqueta, o escriba el ID del registro.',
  'app.scan.nfcTitle': 'Leer una etiqueta NFC',
  'app.scan.nfcHold': 'Acerque la etiqueta a la parte de atrás del teléfono.',
  'app.scan.nfcEmpty': 'Esa etiqueta no tiene texto ni enlace. Escriba el número.',
  'app.scan.nfcOff':
    'El NFC está apagado o no se permitió. Actívelo en la configuración del teléfono, o escriba el número.',
  'app.scan.readerHelp':
    'Muchos lectores de bastón Bluetooth para caravanas se pueden vincular con este dispositivo como teclado. Si el suyo puede: toque este campo y lea la caravana; el número se escribe solo.',
  'app.labels.open': 'Imprimir una etiqueta QR',
  'app.labels.openBatch': 'Imprimir etiquetas QR de estos registros',
  'app.labels.title': 'Imprimir etiquetas QR',
  'app.labels.intro':
    'Cada etiqueta tiene un código QR que abre la página de comprobación del registro, la misma que su enlace de comprobación. Péguela en el tubo, la bolsa, la maceta o el recipiente de pajuelas; cualquiera con la cámara del teléfono puede escanearla.',
  'app.labels.made': 'Las etiquetas se hacen en este dispositivo. No se envía nada para hacerlas ni imprimirlas.',
  'app.labels.which': 'Qué registros',
  'app.labels.all': 'Seleccionar todos',
  'app.labels.none': 'Quitar la selección',
  'app.labels.noneHere':
    'Ninguno de sus registros tiene página de comprobación todavía. Un registro la tiene cuando VeilCore lo recibe.',
  'app.labels.notReady.one': '{count} de ellos aún no tiene página de comprobación, así que no puede tener etiqueta.',
  'app.labels.notReady.other':
    '{count} de ellos aún no tienen página de comprobación, así que no pueden tener etiqueta.',
  'app.labels.what': 'Qué muestra la etiqueta',
  'app.labels.showId': 'El ID corto del registro y «Escanee para comprobar»',
  'app.labels.showName': 'También el nombre del registro',
  'app.labels.idNote':
    'El código QR lleva solo el ID del registro y su código de prueba, que la página de comprobación muestra a cualquiera. Nada sellado va nunca en una etiqueta.',
  'app.labels.nameNote':
    'El nombre va en la etiqueta y en su código QR: quien la escanee ve el nombre, y la página de comprobación dice si coincide con el registro. Nada más del registro sellado va en una etiqueta.',
  'app.labels.size': 'Tamaño de la etiqueta',
  'app.labels.size.thermal': '2 × 1 pulgadas, una etiqueta por página (impresoras de etiquetas)',
  'app.labels.size.letter': 'Hoja carta de 30 (tamaño Avery 5160, 2⅝ × 1 pulgadas)',
  'app.labels.size.a4': 'Hoja A4 de 21 (tamaño Avery L7160, 63,5 × 38,1 mm)',
  'app.labels.skip': 'Etiquetas ya usadas en la primera hoja',
  'app.labels.skipHelp':
    'Se cuentan por filas desde arriba a la izquierda. Se empieza a imprimir después de ellas, para no desperdiciar una hoja empezada.',
  'app.labels.copies': 'Etiquetas por registro',
  'app.labels.count.one': '{count} etiqueta',
  'app.labels.count.other': '{count} etiquetas',
  'app.labels.print': 'Imprimir',
  'app.labels.printHelp':
    'Se abre la ventana de impresión del navegador. Elija 100 % o «Tamaño real» y sin márgenes para que las etiquetas coincidan. Imprima primero una hoja de prueba en papel común.',
  'app.labels.download': 'Descargar PDF',
  'app.labels.downloadHelp':
    'Guarda las etiquetas en un PDF del tamaño real de la hoja, hecho en este dispositivo. Imprímalo al 100 % o en «Tamaño real».',
  'app.labels.downloadOpen': '¿No se guardó nada? Abrir el PDF',
  'app.labels.downloadFailed': 'No se pudo hacer el PDF en este dispositivo. Use «Imprimir».',
  'app.labels.preview': 'Cómo se imprimirán las etiquetas',
  'app.labels.pageOf': 'Página {n} de {of}',
  'app.labels.scanToCheck': 'Escanee para comprobar',
  'app.labels.back': 'Volver',
} satisfies Partial<AppTranslation>;
