// The record app in Spanish: document records (../en/document.ts). DRAFT: machine-assisted,
// to be checked by a fluent speaker before publishing (docs/translations/README.md).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const document = {
  'app.doc.orDocument':
    '¿Quiere sellar un documento? Un permiso, un certificado de análisis, un contrato, un documento de transporte.',
  'app.doc.orDocumentAction': 'Sellar un documento',
  'app.doc.new.title': 'Sellar un documento',
  'app.doc.new.intro':
    'Elija el archivo. Se queda en este dispositivo: solo se sellan su SHA-256 (un código calculado a partir de sus bytes), su nombre y su tamaño, con una fecha que nadie puede antedatar.',
  'app.doc.new.proves':
    'Lo que esto mostrará: un archivo con exactamente estos bytes estaba en sus manos en la fecha en que se sella. No que el documento sea auténtico, que el emisor lo haya emitido ni que lo que dice sea cierto.',
  'app.doc.f.files': 'Archivos',
  'app.doc.f.filesHelp': 'Hasta {max}: un contrato y sus anexos, un certificado de análisis y sus cromatogramas.',
  'app.doc.f.add': 'Añadir un archivo',
  'app.doc.f.addMore': 'Añadir otro archivo',
  'app.doc.f.reading': 'Leyendo {name}…',
  'app.doc.f.tooLarge': '{name} pesa más de {mb} MB, así que no se puede leer aquí.',
  'app.doc.f.duplicate': '{name} es el mismo archivo que uno ya añadido.',
  'app.doc.f.full': 'Son {max} archivos, el máximo que puede tener un documento.',
  'app.doc.f.remove': 'Quitar {name}',
  'app.doc.f.title': 'Título',
  'app.doc.f.titleHelp': 'Cómo lo llamaría: «Carta de porte 0042», «Certificado de análisis lote 7».',
  'app.doc.f.type': 'Tipo',
  'app.doc.f.issuer': 'Emitido por (opcional)',
  'app.doc.f.issuerHelp': 'Tal como figura en él. Es su declaración; no muestra que lo hayan emitido.',
  'app.doc.f.reference': 'Número de referencia (opcional)',
  'app.doc.f.referenceHelp': 'Un número de permiso, de factura, un lote.',
  'app.doc.f.issued': 'Fecha del documento (opcional)',
  'app.doc.f.about': 'Sobre qué es (opcional)',
  'app.doc.f.aboutHelp': 'Registros suyos a los que se refiere: un certificado de análisis con la planta analizada.',
  'app.doc.f.aboutNone': 'Ninguno',
  'app.doc.f.holder': 'En poder de',
  'app.doc.f.holderHelp': 'Usted, o su organización.',
  'app.doc.f.notes': 'Notas (opcional)',
  'app.doc.need.file': 'Añada primero el archivo.',
  'app.doc.need.title': 'Póngale un título.',
  'app.doc.need.holder': 'Indique quién lo tiene.',
  'app.doc.need.heading': 'Falta esto antes de poder sellarlo:',
  'app.doc.seal': 'Sellarlo',
  'app.doc.sealing': 'Sellando…',
  'app.doc.type.permit': 'Permiso o licencia',
  'app.doc.type.certificate-of-analysis': 'Certificado de análisis (COA)',
  'app.doc.type.lab-report': 'Informe de laboratorio',
  'app.doc.type.contract': 'Contrato o acuerdo',
  'app.doc.type.protocol': 'Protocolo o procedimiento',
  'app.doc.type.transport': 'Documento de transporte o envío',
  'app.doc.type.invoice': 'Factura o recibo',
  'app.doc.type.other': 'Otra cosa',
  'app.doc.kind': 'Documento',
  'app.doc.homeLine': 'Documento · {type}',
  'app.doc.k.type': 'Tipo',
  'app.doc.k.issuer': 'Emitido por (su declaración)',
  'app.doc.k.issuerHolder': 'Emitido por (declaración del titular)',
  'app.doc.k.reference': 'Referencia',
  'app.doc.k.issued': 'Fecha del documento',
  'app.doc.k.files': 'Archivos',
  'app.doc.k.about': 'Sobre',
  'app.doc.k.holder': 'En poder de',
  'app.doc.k.notes': 'Notas',
  'app.doc.k.sealed': 'Sellado (reloj de este dispositivo)',
  'app.doc.k.dated': 'Fecha en Midnight',
  'app.doc.k.proofCode': 'Código de prueba',
  'app.doc.fileSize': '{size} bytes',
  'app.doc.share.title': 'Demostrar que tenía este archivo',
  'app.doc.share.text':
    'Envíele el archivo y este enlace. Su navegador comprueba que el archivo es, byte a byte, uno de los sellados aquí, y cuándo se fechó: no se sube nada, y la respuesta no depende de la palabra de VeilCore.',
  'app.doc.share.warn':
    'El enlace muestra a quien lo tenga todo lo que hay en este registro de documento: título, tipo, emisor, referencia, fecha, el nombre y el SHA-256 de cada archivo, los nombres de los registros a los que se refiere y sus notas. Nunca el archivo en sí.',
  'app.doc.share.copy': 'Copiar enlace: demuestra que tenía este archivo',
  'app.doc.share.copied': 'Copiado.',
  'app.doc.compare.title': '¿Es el mismo archivo?',
  'app.doc.compare.text': 'Elija un archivo para compararlo con los sellados aquí. No se sube.',
  'app.doc.compare.pick': 'Elegir un archivo',
  'app.doc.compare.match': '<b>{name}</b> es, byte a byte, {sealed}, sellado aquí.',
  'app.doc.compare.noMatch': '<b>{name}</b> no es ninguno de los archivos sellados aquí. No puede diferir ni un byte.',
  'app.doc.compare.tooLarge': 'Ese archivo pesa más de {mb} MB, así que no se puede leer aquí.',
  'app.doc.check.title': 'Comprobar un documento',
  'app.doc.check.intro':
    'Alguien le envió un documento y este enlace. Elija el archivo que le enviaron: su navegador calcula su SHA-256 (no se sube nada) y lo comprueba con el registro sellado del enlace y su fecha en Midnight.',
  'app.doc.check.missing':
    'Este enlace no contiene un registro de documento. Pida el enlace completo a quien se lo envió.',
  'app.doc.check.unreadable': 'Este enlace está dañado. Pídalo de nuevo.',
  'app.doc.check.notDoc': 'Lo que hay en este enlace no es un registro de documento que se pueda comprobar aquí.',
  'app.doc.check.recomputed': 'Código de prueba, recalculado aquí a partir del enlace',
  'app.doc.check.notDated':
    'Todavía nada fecha este registro, o el enlace se modificó. No confíe en él hasta que muestre una fecha.',
  'app.doc.check.what':
    'Lo que esto muestra: un archivo con exactamente estos bytes estaba en manos del titular en esa fecha. Lo que no: que el documento sea auténtico, que el emisor lo haya emitido ni que lo que dice sea cierto. «Emitido por» es la declaración del titular.',
  'app.doc.check.inLink': 'En el enlace (las palabras del propio titular)',
  'app.doc.nums.title': 'Los números que figuran (opcional)',
  'app.doc.nums.help':
    'Escríbalos tal como están impresos. Se sellan con el documento para que más adelante pueda probar uno, como «THC total como máximo 0,3 %», sin mostrar los demás ni el certificado.',
  'app.doc.nums.which': 'Qué números',
  'app.doc.nums.none': 'Ninguno',
  'app.doc.nums.bad': 'Un número con como máximo {places} decimales, como 0,21.',
  'app.doc.need.numbers': 'Uno de los números no cabe en este formulario. Corríjalo o bórrelo.',
  'app.doc.need.aNumber': 'Escriba al menos un número, o elija «Ninguno».',
  'app.doc.schema.potency': 'Potencia de cannabinoides',
  'app.doc.schema.seed-quality': 'Calidad de semilla',
  'app.doc.slot.totalThc': 'THC total',
  'app.doc.slot.delta9Thc': 'THC delta-9',
  'app.doc.slot.thca': 'THCA',
  'app.doc.slot.totalCbd': 'CBD total',
  'app.doc.slot.cbda': 'CBDA',
  'app.doc.slot.cbg': 'CBG',
  'app.doc.slot.totalCannabinoids': 'Cannabinoides totales',
  'app.doc.slot.moisture': 'Humedad',
  'app.doc.slot.germination': 'Germinación',
  'app.doc.slot.pureSeed': 'Semilla pura',
  'app.doc.slot.otherCropSeed': 'Semilla de otros cultivos',
  'app.doc.slot.weedSeed': 'Semilla de malezas',
  'app.doc.slot.inertMatter': 'Materia inerte',
  'app.doc.nums.heldTitle': 'Sus números',
  'app.doc.nums.heldText':
    'Sellados con este documento como {schema}. Solo usted los ve: el registro guarda un código que los compromete, no los números.',
  'app.claim.title': 'Probar un número',
  'app.claim.text':
    'Pruebe ante cualquiera un hecho sobre un número, sin mostrarlo, ni los demás números ni el certificado. La prueba va a Midnight, donde cualquiera puede comprobarla.',
  'app.claim.example':
    'Por ejemplo: muestre a un comprador que el THC total es como máximo 0,3 %, o que un lote tiene como máximo 9 plantas en floración, sin darle la cifra ni el resto del registro. Usted elige el número y el límite. Él recibe un enlace que lo comprueba.',
  'app.claim.notReady': 'Las pruebas aún no están activadas en este sitio.',
  'app.claim.number': 'Qué número',
  'app.claim.how': 'Qué probar',
  'app.claim.atMost': 'Es como máximo…',
  'app.claim.atLeast': 'Es como mínimo…',
  'app.claim.exactly': 'Es exactamente este (muestra el número)',
  'app.claim.bound': 'Límite',
  'app.claim.boundBad': 'Un número con como máximo {places} decimales.',
  'app.claim.wontMeet': 'Su número sellado no cumple eso, así que no se puede probar. No se envió nada.',
  'app.claim.exactWarn': 'Esto publica {label}: {value} {unit}, a la vista de todos, para siempre.',
  'app.claim.already': 'Ya es público sobre {label}: {list}.',
  'app.claim.leak': 'Cada límite que prueba es público para siempre, y juntos acotan el número.',
  'app.claim.computer':
    'Probarlo lleva uno o dos minutos en un portátil y mucha memoria: use un ordenador. Los teléfonos aún no se han probado.',
  'app.claim.go': 'Probarlo en Midnight',
  'app.claim.going': 'Probando…',
  'app.claim.done': 'Probado en Midnight:',
  'app.claim.copy': 'Copiar el enlace que lo demuestra',
  'app.claim.copied': 'Copiado.',
  'app.claim.made': 'Lo que ha demostrado',
  'app.claim.line.atMost': '{label} es como máximo {bound} {unit}',
  'app.claim.line.atLeast': '{label} es como mínimo {bound} {unit}',
  'app.claim.line.value': '{label} es {value} {unit}',
  'app.claim.holderTyped': 'Los números son suyos tal como los escribió: ningún laboratorio los firmó.',
  'app.claim.check.title': 'Comprobar una prueba',
  'app.claim.check.intro':
    'Alguien le envió este enlace para mostrar un hecho sobre un número de un documento sellado, sin mostrar el número ni el documento. Esta página lee la prueba en Midnight y la comprueba.',
  'app.claim.check.bad': 'Este enlace no se puede leer. Pídalo de nuevo.',
  'app.claim.check.checking': 'Leyendo la prueba en Midnight…',
  'app.claim.check.okWhen': 'Probado en Midnight en el bloque {block}{date}.',
  'app.claim.check.failed': 'No confirmado: {reason} No confíe en ello.',
  'app.claim.check.record': 'El registro al que se refiere',
  'app.claim.check.what':
    'Lo que esto muestra: el número sellado en ese registro cumple el límite (o es ese valor). Lo que no: que un laboratorio lo midiera, ni que el documento sea auténtico; el titular escribió los números. Cada límite probado sobre un número es público, y juntos lo acotan.',
  'app.claim.check.schema': 'Según el formulario publicado «{schema}».',
  // EvidenceBundle.tsx: what differs for a document record.
  'app.doc.bundle.keyIs':
    '(La clave del registro es el identificador público de la clave creada para este documento al sellarlo. Su parte secreta queda en su copia de seguridad y nunca entra en el paquete.)',
  'app.doc.bundle.includeFiles':
    'Incluir una copia del documento. Sin ella, el paquete solo tiene el código de cada archivo, y quien lo compruebe necesitará el archivo aparte.',
  'app.doc.bundle.chooseFiles': 'Elegir el archivo o archivos del documento',
  'app.doc.bundle.checkedAgainst': 'Cada uno se compara con los archivos sellados en este registro antes de incluirlo.',
  'app.doc.bundle.filesAria': 'Archivos del documento',
  'app.doc.bundle.chooseOrUntick': 'Elija el archivo del documento o desmarque la casilla.',
  // ---- kept on this device only (docs/device-only-records.md; DocumentNew.tsx, DocumentDetail.tsx) ----
  'app.doc.local.choice': 'Guardar este registro solo en este dispositivo y en mi copia de seguridad',
  'app.doc.local.before': 'Antes de elegir:',
  'app.doc.local.p1':
    'Nada de lo que escriba aquí se envía a VeilCore, ni bloqueado ni sin bloquear. Lo que se envía, para que el registro reciba su fecha: su identificador, su código de prueba y su vínculo de clave (un código hecho con la clave propia del registro).',
  'app.doc.local.p2': 'El servidor de VeilCore no puede devolverle este registro: no lo tiene en ningún momento.',
  'app.doc.local.p3':
    'Las únicas copias son la de este navegador y la de un archivo de copia de seguridad guardado después de sellar. Una copia de seguridad guardada antes no contiene este registro, y una copia con llave de acceso no lo contiene en ningún caso. En cuanto se selle, se le pedirá guardar y comprobar una copia de seguridad.',
  'app.doc.local.p4': 'Cualquiera que tenga su enlace de comprobación y el archivo puede seguir comprobándolo.',
  'app.doc.local.p5': 'Se elige una sola vez, al sellar. Después no se puede cambiar.',
  'app.doc.local.title': 'Guardado solo en este dispositivo',
  'app.doc.local.text':
    'Nada de lo escrito en este registro se envió a VeilCore, ni bloqueado ni sin bloquear. Las únicas copias están en este navegador y en el archivo de copia de seguridad que usted comprobó. Si pierde las dos, el registro se pierde: VeilCore no puede devolvérselo. Una copia de seguridad guardada antes de sellar este registro no lo contiene, y una copia con llave de acceso no lo contiene en ningún caso.',
  'app.doc.local.notBacked':
    'Aún no está en ninguna copia de seguridad. La única copia de este registro está en este navegador: si sus datos se borran ahora, el registro se pierde, y VeilCore no puede devolvérselo. Guarde ahora su archivo de copia de seguridad y compruébelo.',
  'app.doc.local.sent':
    'Lo que ha salido de este dispositivo: el identificador del registro, su código de prueba y su vínculo de clave, enviados a VeilCore para fecharlo. Cada solicitud muestra a VeilCore su dirección de red y la hora. Si tiene una copia con llave de acceso, esta guarda el identificador y las claves de este registro, bloqueados, en el servidor de VeilCore; en ningún caso lo que usted escribió.',
  'app.doc.local.stamp':
    'Poner un sello de fecha a la clave de este registro es decisión suya, y solo lo inicia el botón de abajo. Si lo hace, un código hecho con la clave va a Midnight a través del servicio de tarifas de VeilCore. Nada de lo que usted escribió va con él.',
  'app.doc.local.conflict':
    'El servidor de VeilCore respondió con algo que no es únicamente el código de prueba de este registro. Lo que ve es la copia propia de este dispositivo. No se envía nada más, y la respuesta del servidor no cambia nada aquí.',
  'app.doc.local.homeNotBacked': 'Solo en este dispositivo · aún sin copia de seguridad',
  'app.doc.local.backup': 'Guardar una copia de seguridad',
  'app.doc.local.homeLine': 'Solo en este dispositivo',
  'app.doc.local.staysHere': 'Este registro se guarda solo en este dispositivo, así que esto no se ofrece para él.',
  'app.doc.local.delete': 'Eliminar de este dispositivo',
  'app.doc.local.deleteConfirm':
    '¿Eliminar este registro de este dispositivo? Aquí no se puede deshacer. Un archivo de copia de seguridad que lo contenga lo sigue conteniendo. VeilCore conserva lo que ya se le envió: el identificador, el código de prueba y el vínculo de clave del registro. Una copia con llave de acceso, si tiene una, sigue guardando su identificador y sus claves hasta que usted actualice esa copia. Si puso un sello de fecha a su clave, eso permanece en Midnight. Su fecha sigue valiendo para quien tenga el enlace de comprobación.',
  'app.doc.local.toRecord': 'Ir al registro',
  'app.doc.local.backupNow':
    'Sellado. Ahora guarde una copia de seguridad y compruébela: hasta entonces, la única copia de este registro está en este navegador.',
  'app.doc.local.backupMissing':
    'Esa copia de seguridad no contiene sus documentos guardados solo en este dispositivo. Guarde una nueva y compruébela.',
  'app.doc.local.backupFailed':
    'No se pudo crear la copia de seguridad: un documento guardado solo en este dispositivo no se pudo incluir. No se guardó nada.',
  'app.doc.local.noCorrect':
    'Un registro guardado solo en este dispositivo no se puede corregir. Selle el documento de nuevo como un registro nuevo.',
  'app.doc.local.unreadable.title': 'No se pudo leer un registro de este dispositivo',
  'app.doc.local.unreadable.text':
    'El registro {id} se guarda solo en este dispositivo, y su entrada en este navegador está dañada, así que no se puede mostrar. No se envía a ninguna parte. Una copia de seguridad guardada ahora lleva la entrada tal como está. Puede guardar la entrada en un archivo o eliminarla de este dispositivo.',
  'app.doc.local.unreadable.export': 'Guardar la entrada en un archivo',
  'app.doc.local.unreadable.delete': 'Eliminarla de este dispositivo',
  'app.doc.local.unreadable.deleteConfirm':
    '¿Eliminar esta entrada dañada de este dispositivo? Aquí no se puede deshacer. Un archivo de copia de seguridad que la lleve la sigue llevando.',
  'app.doc.local.unreadable.backupNote':
    'No se pudo leer un registro guardado solo en este dispositivo. Esta copia de seguridad lleva su entrada tal como está, así que con el archivo no se pierde nada. Todo lo demás está incluido como siempre.',
  // ---- a production chain, and proving a number from a device-only record (docs/document-chain.md) ----
  'app.doc.chain.kind.grow-batch': 'Lote de cultivo',
  'app.doc.chain.kind.harvest-lot': 'Lote de cosecha',
  'app.doc.schema.grow-batch': 'Lote de cultivo',
  'app.doc.schema.harvest-lot': 'Lote de cosecha',
  'app.doc.slot.plants': 'Plantas en este lote en la fecha del registro',
  'app.doc.slot.plantsInFlower': 'De ellas, plantas en fase de floración en la fecha del registro',
  'app.doc.slot.areaSquareMetres': 'Superficie de suelo en cultivo para este lote, en metros cuadrados',
  'app.doc.slot.plantsHarvested': 'Plantas cosechadas para este lote',
  'app.doc.slot.wetWeightGrams': 'Peso fresco en la cosecha, plantas enteras tal como se cortaron, en gramos',
  'app.doc.slot.dryWeightGrams': 'Peso seco del lote tal como se almacena, en gramos',
  'app.doc.chain.start.title': '¿Registrar una cadena de producción?',
  'app.doc.chain.start.text':
    'Selle cada paso como un registro aparte, cada uno sobre el anterior: la planta o cepa de origen, un lote de cultivo, un lote de cosecha, el informe de laboratorio. Cada uno recibe su fecha.',
  'app.doc.chain.start.plain': 'Otro documento',
  'app.doc.chain.f.titleHelp':
    'Opcional. Si se deja vacío, es el tipo y el identificador. No ponga recuentos ni pesos en él.',
  'app.doc.chain.f.reference.grow-batch': 'Identificador del lote',
  'app.doc.chain.f.reference.harvest-lot': 'Identificador del lote',
  'app.doc.chain.f.referenceHelp': 'Tal como lo escribe en sus propios registros.',
  'app.doc.chain.f.site': 'Etiqueta del sitio (opcional)',
  'app.doc.chain.f.siteHelp': 'Su propia etiqueta para una sala, un campo o una instalación. Va en las notas.',
  'app.doc.chain.f.variety': 'Variedad (opcional)',
  'app.doc.chain.f.varietyHelp': 'Va en las notas.',
  'app.doc.chain.f.numbers': 'Sus números',
  'app.doc.chain.f.numbersHelp':
    'Los recuentos y los pesos van aquí y en ningún otro sitio: no los repita en el título ni en las notas. Se sellan tal como usted los escribe, no como alguien los midió, para que después pueda probar uno, como «como máximo 100 plantas», sin mostrar los demás.',
  'app.doc.chain.note.site': 'Sitio',
  'app.doc.chain.note.variety': 'Variedad',
  'app.doc.chain.titleFor.grow-batch': 'Lote de cultivo {id}',
  'app.doc.chain.titleFor.harvest-lot': 'Lote de cosecha {id}',
  'app.doc.chain.need.reference': 'Indique el identificador del lote.',
  'app.doc.chain.need.aNumber': 'Escriba al menos un número.',
  'app.doc.chain.sheet.title': '¿No tiene un archivo?',
  'app.doc.chain.sheet.text':
    'Un registro necesita un archivo. Su propia hoja de lote es la mejor opción: fecha un documento de trabajo que usted ya lleva. Si no tiene ninguna, aquí se crea una hoja de texto sin formato con el identificador, la fecha, el sitio, la variedad, el titular y «Sobre» de arriba, sin recuentos ni pesos, y se guarda en este dispositivo. Rellene antes esos campos.',
  'app.doc.chain.sheet.make': 'Crear una hoja con lo que escribí',
  'app.doc.chain.sheet.made':
    'Creada y guardada como {name}. Conserve ese archivo: hace falta para comprobar el registro y debe seguir igual byte por byte. Si cambia lo que escribió arriba, la hoja no cambia con ello.',
  'app.doc.chain.aboutHelp':
    'Registros suyos a los que se refiere: un certificado de análisis con la planta analizada, un lote de cosecha con su lote de cultivo. Es su declaración. Nada la coteja con el registro que elija.',
  'app.doc.chain.aboutNote':
    '«Sobre» es la declaración del propio titular, sellada con este registro. Ni VeilCore ni Midnight la cotejan con el registro que nombra. Una cadena de registros solo es tan fuerte como la fecha y el código de prueba de cada registro.',
  'app.doc.chain.carried':
    'Los registros enlazados aquí venían en este enlace, de quien lo envió. El registro sellado nombra cada uno solo por su identificador, así que nada aquí muestra que un registro enlazado sea el nombrado.',
  'app.doc.chain.idOnly':
    'Cuando este enlace solo lleva el identificador de un registro, su página muestra lo que el registro de VeilCore informa sobre ese identificador, sin ninguna marca de comprobación. Para una fecha comprobada, pida al titular el enlace de comprobación de ese registro.',
  'app.doc.chain.namedAs':
    'Abrió esto desde otro registro, que lo nombra como registro {id}. Nada en el enlace une ese identificador al código de prueba de este registro.',
  'app.doc.chain.askRegistry': 'Ver lo que el registro de VeilCore informa sobre el registro {id}',
  'app.doc.chain.askRegistrySends':
    'Esa página envía el identificador del registro al registro de VeilCore y, en su dirección, este código de prueba al servidor del sitio web. Nada más de este enlace.',
  'app.doc.chain.next.title': 'El siguiente paso de su cadena',
  'app.doc.chain.next.text': 'Selle el siguiente paso como un registro propio, sobre este. Recibe su propia fecha.',
  'app.doc.chain.next.grow-batch': 'Registrar un lote de cultivo a partir de este',
  'app.doc.chain.next.harvest-lot': 'Registrar su lote de cosecha',
  'app.doc.chain.next.report': 'Sellar su informe de laboratorio',
  'app.doc.chain.title': 'Su cadena, en este dispositivo',
  'app.doc.chain.text':
    'Calculada aquí a partir de los registros que tiene este navegador, incluidos los guardados solo en este dispositivo. No se pregunta nada a VeilCore para ello, y un registro guardado en otro lugar no aparece.',
  'app.doc.chain.up': 'A qué se refiere',
  'app.doc.chain.down': 'Registros sobre este',
  'app.doc.chain.none': 'Ninguno en este dispositivo.',
  'app.doc.chain.notHeld': '{name} (no está en este dispositivo)',
  'app.doc.chain.share.title': 'Enviarlo con su cadena',
  'app.doc.chain.share.text':
    'Este enlace lleva también los registros a los que se refiere este, y aquellos a los que se refieren esos, para que quien lo compruebe pueda abrir cada uno y ver su fecha.',
  'app.doc.chain.share.warn':
    'Quien tenga este enlace ve también todo lo que hay en cada uno de esos registros de documento, igual que el enlace de arriba muestra este: {list}. De un registro que no es un documento, solo lleva el identificador y el código de prueba.',
  'app.doc.chain.share.copy': 'Copiar enlace con su cadena',
  'app.doc.chain.share.copied': 'Copiado.',
  'app.doc.local.p6':
    'Si tiene números, más adelante puede elegir probar uno. Eso publica un hecho sobre el número en Midnight, a través del servicio de tarifas de VeilCore, y solo si usted lo activa para ese registro.',
  'app.doc.local.prove.off': 'Probar un número no está activado para un registro guardado solo en este dispositivo.',
  'app.doc.local.prove.title': 'Probar un número: usted decide',
  'app.doc.local.prove.text':
    'Desactivado salvo que usted lo active aquí. Probar publica para siempre un hecho sobre un número en Midnight, a través del servicio de tarifas de VeilCore. No se envía nada al registro de VeilCore. Antes de probar nada, se le muestra exactamente lo que se publicaría.',
  'app.doc.local.prove.choice': 'Mostrar «Probar un número» para este registro',
  'app.doc.local.prove.publish.title': 'Qué se publicará si continúa',
  'app.doc.local.prove.publish.range':
    'En Midnight, público y permanente: el formulario «{schema}», el campo «{label}», el límite {bound} y el sentido ({direction}), con un código que representa este registro. El número en sí no se publica. Cada límite que pruebe lo acota más.',
  'app.doc.local.prove.publish.exact':
    'En Midnight, público y permanente: el formulario «{schema}», el campo «{label}» y el número en sí, {value}, con un código que representa este registro.',
  'app.doc.local.prove.publish.noBound': 'Escriba un límite para ver exactamente lo que se publicaría.',
  'app.doc.local.prove.publish.route':
    'Va de este navegador a Midnight a través del servicio de tarifas de VeilCore, que ve lo que se publica y su dirección de red. No se envía nada al registro de VeilCore. El número es el que usted escribió, no el que midió un laboratorio.',
  'app.doc.local.prove.direction.atMost': 'como máximo',
  'app.doc.local.prove.direction.atLeast': 'como mínimo',
  'app.doc.local.prove.confirmExact': 'Sí, publicar el número en sí: {value}, en Midnight, para siempre.',
  'app.doc.local.textProved':
    'Nada de lo escrito en este registro se envió al registro de VeilCore, ni bloqueado ni sin bloquear. Lo que usted eligió probar sobre sus números es público en Midnight. Las únicas copias del registro están en este navegador y en el archivo de copia de seguridad que usted comprobó. Si pierde las dos, el registro se pierde: VeilCore no puede devolvérselo. Una copia de seguridad guardada antes de sellar este registro no lo contiene, y una copia con llave de acceso no lo contiene en ningún caso.',
  'app.doc.local.proved':
    'Usted eligió probar hechos sobre los números de este registro. Fueron a Midnight a través del servicio de tarifas de VeilCore y son públicos para siempre; aparecen abajo. Nada de lo escrito en este registro se envió al registro de VeilCore.',
  'app.claim.tie':
    'Lo que usted prueba queda público en Midnight de un modo que VeilCore, y cualquiera que tenga el enlace de comprobación de este registro, puede vincular con este registro. VeilCore también puede vincularlo con la clave de titular que fechó el registro.',
  'app.doc.local.aboutStaysHere':
    'Este registro nombra un registro guardado solo en este dispositivo, así que también debe guardarse solo en este dispositivo. De lo contrario, el nombre y el identificador de aquel registro irían a VeilCore dentro de la copia bloqueada de este. No se guardó ni se envió nada.',
  'app.doc.chain.aboutLocalOnly':
    'Un registro guardado solo en este dispositivo solo puede elegirse si este registro también se guarda solo en este dispositivo (la casilla de abajo). Aquello a lo que se refiere un registro se sella en su copia bloqueada, así que un registro corriente enviaría a VeilCore el nombre y el identificador de aquel registro.',
  'app.doc.check.tooLarge':
    'Este enlace lleva más de lo que puede llevar un enlace de comprobación. Pida al remitente el enlace propio de cada registro.',
  'app.doc.chain.share.warnLocal':
    'Nada de lo escrito en un registro guardado solo en este dispositivo se envió nunca al registro de VeilCore. Al copiar este enlace, entrega lo escrito en cada uno de los que lleva (marcados arriba, y este registro si lo es) a quien lo reciba.',
  'app.doc.chain.aboutHolderNote':
    'Al abrir uno de estos enlaces, se pregunta al registro de VeilCore por el identificador de ese registro desde su dirección de red. Para un registro guardado solo en este dispositivo, es una cosa más que el registro de VeilCore llega a saber: que este navegador lo consultó.',
} satisfies Partial<AppTranslation>;
