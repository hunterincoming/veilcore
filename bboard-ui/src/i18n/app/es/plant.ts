// Spanish (neutral Latin American, usted). DRAFT: machine-assisted, to be checked by a fluent
// speaker before publishing (docs/translations/README.md). Terms as in ../../es.ts.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const plant = {
  'app.plant.notHere': 'Este registro no está en este navegador',
  'app.plant.notHereText':
    'Si lo selló en otro navegador, guarde allí una copia de seguridad y ábrala aquí (Recuperar sus plantas). Si es el registro de otra persona, abra el enlace de verificación que le dio.',
  'app.plant.yourRecords': 'Sus registros',
  'app.plant.checkARecord': 'Comprobar un registro',
  'app.plant.home': 'Inicio',
  'app.plant.bredByName': 'Obtenida por {name}',
  'app.plant.corrected':
    'Este registro fue corregido. Una corrección nunca lo edita ni lo borra: sigue archivado sin cambios, y un registro posterior lo sustituye. <link>Ver la corrección</link>',
  'app.plant.corrects':
    'Esto corrige un registro anterior. Cambió: {fields}. Motivo indicado: {reason}. <link>Ver lo que reemplazó</link>',
  'app.plant.evidenceLine':
    '<link>Descargar el paquete de evidencia</link> <muted>para comprobar la fecha de este registro sin VeilCore</muted>',
  'app.plant.open': 'Abrir',
  'app.plant.reportsCameBack.one': 'Llegó un informe de laboratorio, bloqueado para que solo usted pueda abrirlo.',
  'app.plant.reportsCameBack.other':
    'Llegaron {count} informes de laboratorio, bloqueados para que solo usted pueda abrirlos.',
  'app.plant.moreYouCanDo': 'Más cosas que puede hacer',
  'app.plant.action.show': 'Mostrar a alguien',
  'app.plant.action.showHint': 'Elija lo que ve',
  'app.plant.action.askedToProve': 'Alguien me pidió demostrar que la tengo',
  'app.plant.action.certificate': 'Certificado',
  'app.plant.action.sendResults': 'Enviar los resultados al obtentor',
  'app.plant.action.sendResultsHint': 'Firmados por usted, bloqueados para él',
  'app.plant.action.signReceipt': 'Firmar el acuse de recibo',
  'app.plant.action.signReceiptHint': 'Firme que esta muestra llegó, o recházela',
  'app.plant.action.linkReceipt': 'Vincular su acuse de recibo',
  'app.plant.action.linkReceiptHint': 'Su acuse de recibo está firmado; vincúlelo al envío para que el obtentor lo vea',
  'app.plant.action.labReports': 'Informes de laboratorio',
  'app.plant.action.sendToLab': 'Enviarla a un laboratorio u obtentor',
  'app.plant.action.licenseIt': 'Licenciarla',
  'app.plant.action.saveReport': 'Guardar un informe de ADN en esta planta',
  'app.plant.action.checkReport': 'Comprobar que un informe coincide',
  'app.plant.action.familyTree': 'Árbol genealógico',
  'app.plant.action.freshBackup': 'Guardar una copia de seguridad nueva',
  'app.plant.action.fix': 'Corregir un error',
  'app.plant.agreements': 'Acuerdos',
  'app.plant.openAgreement': 'Abrir el acuerdo {id}',
  'app.plant.unnamedCounterparty': 'contraparte sin nombre',
  'app.plant.technicalDetails': 'Detalles técnicos',
  'app.plant.f.method': 'Método de mejoramiento',
  'app.plant.f.statedDate': 'Fecha de creación declarada (según el obtentor)',
  'app.plant.f.sealedClock': 'Sellado (reloj de este dispositivo)',
  'app.plant.f.ref': 'Referencia / ID de lote',
  'app.plant.f.photos': 'Fotos',
  'app.plant.f.photosSealed': '{n} selladas (solo los códigos; las imágenes nunca se subieron)',
  'app.plant.f.reportSaved': 'guardado en esta planta ({file}) · código del vínculo {fp}{sha}',
  'app.plant.f.file': 'archivo',
  'app.plant.f.fileSha': ' · SHA-256 del archivo {sha}',
  'app.plant.f.notSavedYet': 'todavía no guardado',
  'app.plant.f.recordFingerprint': 'Código de prueba del registro',
  'app.plant.evidenceBundle': 'Paquete de evidencia',
  'app.plant.evidenceBundleText':
    'El registro tal como se selló, su prueba de inclusión, la raíz del lote, dónde se registró el lote, el archivo de sello de Bitcoin si lo hay y las firmas de laboratorio sobre él, en un solo .zip. Su verify.html lo comprueba sin internet y sin nada de VeilCore, y dice qué consultar para fecharlo.',
  'app.plant.exportFailed': 'No se pudo exportar el registro.',
  'app.plant.exportRecord': 'Exportar el registro',
  'app.plant.backToPlant': 'Volver a la planta',
  'app.plant.backToRecord': 'Volver al registro',
  'app.plant.mark.done': 'hecho',
  'app.plant.mark.failed': 'no confirmado',
  'app.plant.mark.reported': 'informado por el servidor de registros, no comprobado',
  'app.plant.mark.wait': 'todavía no',
  'app.plant.recordDated': 'Registro fechado',
  'app.plant.labReport': 'Informe de laboratorio',
  'app.plant.dnaReport': 'Informe de ADN',
  'app.plant.tie.tied': 'Vinculado a la planta',
  'app.plant.tie.notYet': 'Aún no vinculado a la planta',
  'app.plant.tie.notNow': 'Ya no vinculado a la planta',
  'app.plant.tie.lab': 'Informe de ADN {lead}',
  'app.plant.tie.self': 'Informe de ADN que usted guardó (ninguna firma de laboratorio coincide con él)',
  'app.plant.tie.selfPublic': 'Informe de ADN que guardó el titular (ninguna firma de laboratorio coincide con él)',
  'app.plant.tie.savedHolder': 'Informe de ADN que usted guardó',
  'app.plant.tie.savedPublic': 'Informe de ADN que guardó el titular',
  'app.plant.tie.replaced': 'el laboratorio reemplazó el informe de ADN guardado aquí',
  'app.plant.tie.withdrawn': 'el laboratorio retiró el informe de ADN guardado aquí',
  'app.plant.tie.add': 'añada un informe de ADN',
  'app.plant.tie.noneSaved': 'no hay ningún informe de ADN guardado en este registro',
  'app.plant.tie.cameBack': 'llegó un informe de laboratorio: ábralo y guárdelo aquí',
  'app.plant.tie.openedNotSaved': 'hay un informe de laboratorio abierto, sin guardar en esta planta',
  'app.plant.tie.notDated': 'aún sin fecha',
  'app.plant.tie.dating': 'fechándose ({status})',
  'app.plant.tie.datingPlain': 'fechándose',
  'app.plant.tie.dated': 'fechado el {date}',
  'app.plant.tie.unconfirmed': 'sin fecha: {status}',
  'app.plant.tie.sentence': 'Vinculado a la planta: {what}, {date}.',
  'app.plant.tie.sentenceNoDate': 'Vinculado a la planta: {what}.',
  'app.plant.tie.sentenceNone': 'Aún no vinculado a la planta: {what}.',
  'app.plant.tie.sentenceNot': 'Ya no vinculado a la planta: {what}.',
  'app.plant.tie.means':
    'Un informe de ADN permite que un laboratorio compare con él una prueba nueva de una planta. Por sí solo no demuestra que una planta coincida.',
  'app.plant.tie.sub': 'Informe {date}. Un laboratorio puede comparar con él una prueba nueva de la planta.',
  'app.plant.tie.why': 'Un informe de ADN de su laboratorio es lo que vincula un registro con la planta misma.',
  'app.plant.backupChecked': 'Copia de seguridad comprobada',
  'app.plant.checking': 'comprobando…',
  'app.plant.savedToPlant': 'guardado en esta planta',
  'app.plant.arrivedNotOpened': 'llegó, sin abrir',
  'app.plant.openedNotSaved': 'abierto, sin guardar en esta planta',
  'app.plant.noneYet': 'ninguno todavía',
  'app.plant.labReceipt': 'Acuse de recibo del laboratorio',
  'app.plant.receiptSigned': 'Acuse de recibo firmado',
  'app.plant.labCodeUsed': 'Código de laboratorio usado',
  'app.plant.noReceiptSigned': 'ningún acuse de recibo firmado',
  'app.plant.notSignedYet': 'todavía sin firmar',
  'app.plant.receipt': 'Acuse de recibo',
  'app.plant.notLinkedYet': '{date}, todavía sin vincular al envío',
  'app.plant.turnedAway': 'Usted la rechazó',
  'app.plant.rejected.damaged': 'llegó dañada',
  'app.plant.rejected.wrongSample': 'muestra equivocada',
  'app.plant.receiptNotSigned': 'Acuse de recibo todavía sin firmar',
  'app.plant.keyStampLine':
    'Sello de fecha de la clave: {when}. La clave de su planta también está fechada, así que más adelante puede demostrar que la tiene.',
  'app.plant.done': 'hecho',
  'app.plant.notYet': 'todavía no',
  'app.plant.labReportSent': 'Informe de laboratorio enviado',
  'app.plant.nSent': '{n} enviados',
  'app.plant.withdrawnSendNew': 'retirado (puede enviar uno nuevo)',
  'app.plant.waitingBatch': 'esperando un lote',
  'app.plant.inBatchWaiting': 'en un lote, esperando su sello de fecha',
  'app.plant.onTestNetwork': ' En una red de pruebas: datos de práctica, no una fecha real.',
  'app.plant.checkedOnMidnight': '{date}: comprobado en Midnight',
  'app.plant.notConfirmed': 'sello de fecha no confirmado en Midnight',
  'app.plant.dontRely': '{reason}. No confíe en la fecha que informa el servidor de registros.',
  'app.plant.lookingUp': 'Consultando en Midnight…',
  'app.plant.couldntReach': 'No se pudo conectar con Midnight para comprobarlo.',
  'app.plant.notChecked': 'No comprobado en Midnight desde esta página.',
  'app.plant.registryReport': '{date} (según el servidor de registros de VeilCore)',
  'app.plant.dateNotGiven': 'fecha no indicada',
  'app.plant.labReportSha': 'SHA-256 del informe de laboratorio: {sha}',
  'app.plant.labReportCode': 'Código del informe de laboratorio: {code}',
  'app.plant.labAsSigned': 'Laboratorio, según su firma: {lab}',
  'app.plant.noLabMatched': 'ninguna firma de laboratorio coincidió con el archivo guardado',
  'app.plant.next.backup.title': 'Guarde su copia de seguridad',
  'app.plant.next.backup.why':
    'Por ahora, las claves de esta planta están solo en este dispositivo. Si se rompe o se borra el navegador, nadie podrá demostrar que usted la tiene. Guardarla toma un minuto.',
  'app.plant.next.backup.action': 'Guardar mi copia de seguridad',
  'app.plant.next.dates.title': 'Este registro fecha un informe de ADN',
  'app.plant.next.dates.why':
    'Solo contiene el SHA-256 del informe, su código de informe de laboratorio y el nombre del laboratorio según su firma, nunca el informe. Cuando su lote se fecha, muestra que el informe existía para entonces, sin mostrarle a nadie los marcadores.',
  'app.plant.next.stamp.why':
    'Está sellado. Su clave todavía no tiene sello de fecha, y lo necesita para demostrar que la tiene. Toma alrededor de un minuto y es gratis.',
  'app.plant.next.rejected.title': 'Usted rechazó esta muestra',
  'app.plant.next.rejected.why':
    'No se firmó nada. VeilCore no avisa al obtentor: avísele usted, para que pueda enviar otra.',
  'app.plant.next.setup.title': 'Configure la firma de su laboratorio',
  'app.plant.next.setup.why':
    'Así podrá firmar que esta muestra llegó y devolver el informe de laboratorio firmado por su laboratorio.',
  'app.plant.next.setup.action': 'Configurarla',
  'app.plant.next.sign.title': 'Firme que llegó',
  'app.plant.next.sign.why':
    'Su acuse de recibo firmado es lo que permite al obtentor confiar en un informe de laboratorio suyo: muestra que su clave tuvo la muestra.',
  'app.plant.next.sign.action': 'Firmar el acuse de recibo',
  'app.plant.next.link.title': 'Vincule su acuse de recibo al envío',
  'app.plant.next.link.why':
    'Su acuse de recibo está firmado, pero la página del obtentor solo cuenta un acuse vinculado a su envío. Solo quien usó el código de laboratorio puede vincularlo.',
  'app.plant.next.link.action': 'Vincularlo',
  'app.plant.next.signed.title': 'Acuse de recibo firmado',
  'app.plant.next.signed.why':
    'El obtentor ve su acuse de recibo firmado. En esta red todavía no se pueden devolver informes de laboratorio a través de VeilCore: envíe el suyo como lo hace normalmente.',
  'app.plant.next.sent.title': 'Informe de laboratorio enviado',
  'app.plant.next.withdrawn.title': 'Informe de laboratorio retirado',
  'app.plant.next.send.title': 'Enviar los resultados al obtentor',
  'app.plant.next.sent.why': 'Solo el obtentor puede abrirlo. Puede retirarlo o enviar un archivo corregido.',
  'app.plant.next.withdrawn.why':
    'Retiró lo que envió, así que el obtentor no tiene un informe de laboratorio vigente de usted. Puede enviar uno nuevo.',
  'app.plant.next.send.why':
    'Firmado con la clave de su laboratorio y bloqueado para que solo el obtentor pueda abrirlo. VeilCore no tiene su clave.',
  'app.plant.next.sent.action': 'Ver lo que envió',
  'app.plant.next.send.action': 'Enviar los resultados',
  'app.plant.next.corrected.title': 'Guarde el informe de ADN corregido',
  'app.plant.next.corrected.why':
    'El laboratorio reemplazó el informe de ADN guardado en esta planta. Hasta que guarde el corregido, la página de su planta, el certificado y los enlaces dicen que el guardado fue reemplazado.',
  'app.plant.next.corrected.action': 'Abrir el corregido',
  'app.plant.next.noCurrent.why':
    'El original fue reemplazado y la corrección retirada. Pida al laboratorio que envíe uno de nuevo. Hasta entonces, su certificado y sus enlaces dicen que el guardado fue reemplazado.',
  'app.plant.next.labWithdrew.title': 'El laboratorio retiró el informe de ADN guardado aquí',
  'app.plant.next.labWithdrew.whyNewer':
    'Sigue guardado en esta planta, y su certificado y sus enlaces dicen que fue retirado. Hay un informe de laboratorio más reciente: ábralo y guárdelo en su lugar.',
  'app.plant.next.labWithdrew.why':
    'Sigue guardado en esta planta, y su certificado y sus enlaces dicen que fue retirado. Pida uno nuevo al laboratorio.',
  'app.plant.next.labWithdrew.action': 'Abrir el más reciente',
  'app.plant.next.open.why':
    'Está bloqueado para que solo usted pueda abrirlo, con la clave de esta planta. Al abrirlo se comprueba aquí la firma del laboratorio.',
  'app.plant.next.sample.title': 'Envíe una muestra a un laboratorio',
  'app.plant.next.sample.whySaved':
    'Guardó un informe de ADN en esta planta, y eso es su propia declaración. Que un laboratorio firme que recibió una muestra suma una segunda parte, lo que es una evidencia más sólida que su declaración sola.',
  'app.plant.next.sample.why':
    'Por ahora, este registro es su propio relato de la planta. Que un laboratorio firme que recibió una muestra y devuelva un informe lo convierte en una evidencia más sólida que su relato.',
  'app.plant.next.sample.action': 'Enviar a un laboratorio',
  'app.plant.next.dna.title': 'Obtenga una huella de ADN de esta planta',
  'app.plant.next.dna.why':
    'Un registro fechado muestra que existía una descripción. Un informe de ADN (la huella de ADN de la planta que hace un laboratorio) es lo que vincula su registro con la planta real. Hay dos formas de conseguirlo:',
  'app.plant.next.dna.labTitle': 'Enviar una muestra a un laboratorio',
  'app.plant.next.dna.labText':
    'Cree un código de laboratorio y envíe una muestra con él. El informe de ADN del laboratorio vuelve aquí, cerrado para que solo usted pueda abrirlo.',
  'app.plant.next.dna.labSoon':
    'Recibir aquí el informe de ADN del laboratorio, cerrado para que solo usted pueda abrirlo, llegará pronto a este sitio. Por ahora, pida el informe a su laboratorio y guárdelo aquí.',
  'app.plant.next.dna.haveTitle': '¿Ya tiene un informe de ADN?',
  'app.plant.next.dna.haveText': 'Guárdelo en esta planta. Se lee en su dispositivo; el archivo nunca se sube.',
  'app.plant.next.dna.haveAction': 'Guardar un informe de ADN',
  'app.plant.next.date.title': 'Feche este informe de ADN',
  'app.plant.next.date.why':
    'Está guardado en esta planta, pero todavía nada lo fecha. Fecharlo muestra que el informe existía en esa fecha, sin mostrarle a nadie los marcadores.',
  'app.plant.next.save.title': 'Guarde el informe de ADN en esta planta',
  'app.plant.next.save.why':
    'Un laboratorio firmó que recibió una muestra. Cuando llegue su informe de ADN, guárdelo en esta planta: eso es lo que vincula su registro con la planta, para poder compararlo con una prueba posterior.',
  'app.plant.next.save.action': 'Guardarlo en esta planta',
  'app.plant.next.ready.title': 'Este registro está listo para usarse',
  'app.plant.next.ready.why':
    'Un laboratorio firmó que recibió una muestra, y hay un informe de ADN guardado en esta planta. Puede enviar material o licenciarlo, con condiciones que se aplican a la descendencia declarada a partir de este registro.',
  'app.plant.next.ready.action': 'Iniciar un acuerdo',
  'app.plant.next.backTo': 'Volver a {name}',
  'app.plant.next.noCurrent.title': 'No hay un informe de ADN vigente de {lab}',
  'app.plant.next.open.title': 'Abrir el informe de laboratorio de {lab}',
  'app.plant.next.label': 'Siguiente paso',
  'app.plant.next.stamp.title': 'Poner el sello de fecha',
  'app.plant.next.stamp.action': 'Poner el sello de fecha',
  'app.plant.next.open.action': 'Abrir',
  'app.plant.chain.sealed': 'Sellado',
  'app.plant.chain.reportSaved': 'Informe de ADN guardado',
  'app.plant.chain.receipt': 'Recepción confirmada',
  'app.plant.chain.licensed': 'Licenciado',
  'app.plant.chain.licensedN': 'Licenciado ({n})',
  'app.plant.date.chipNotAnchored': 'En un lote, todavía sin anclar',
  'app.plant.date.chipChecked': 'En un lote · fecha comprobada en {network}',
  'app.plant.date.chipFailed': 'En un lote · sello de fecha no confirmado',
  'app.plant.date.chipReported': 'En un lote · anclaje informado en {network}',
  'app.plant.date.testNote': ' Una red de pruebas puede reiniciarse y sus fechas no tienen valor como evidencia.',
  'app.plant.date.head':
    'Comprobado en este navegador: el código de prueba de su registro está en el lote {batch}, y el camino desde él llega a la raíz del lote.',
  'app.plant.date.looked': '{head} El servidor de registros informa que esa raíz se registró en {network}.{test}',
  'app.plant.date.notLooked':
    '{head} El servidor de registros informa que esa raíz se registró en {network}; esta página no consultó la transacción, así que no se muestra como anclada. Consúltela en la red antes de confiar en la fecha.{test}',
  'app.plant.date.title': 'Fecha en Midnight',
  'app.plant.date.notInBatch':
    'Sellado en su dispositivo y guardado en {server}. Todavía no está en un lote, así que no está anclado. Anclamos los registros juntos, en lotes (por ahora a mano, así que puede tardar), para que una transacción cubra muchos y usted nunca necesite una billetera. Hasta entonces, su fecha se basa en los registros de este servidor.',
  'app.plant.date.inBatchNotAnchored':
    'Comprobado en este navegador: el código de prueba de su registro está en el lote {batch}, que todavía no se ha anclado. Cuando se ancle, la prueba sumará una referencia a la transacción. Nada de su registro cambia.',
  'app.plant.date.batchLine': 'lote {batch}',
  'app.plant.date.rootLine': 'raíz {root}…',
  'app.plant.date.txChecked': 'tx (comprobada en Midnight) {tx}',
  'app.plant.date.txReported': 'tx (informada por el servidor de registros) {tx}',
  'app.plant.date.downloadProof': 'Descargar la prueba de inclusión',
  'app.plant.date.downloadStamp': 'Descargar el archivo de sello de Bitcoin',
  'app.plant.date.openExplorer': 'Abrir el explorador de {network}',
  'app.plant.date.fileConfirmed':
    'El archivo muestra que su registro está en este lote. Esta página encontró la raíz del lote en la transacción indicada en Midnight. Cualquiera puede repetirlo: el paquete de evidencia tiene todo lo necesario y explica cómo, y la página de comprobación hace la misma consulta en su propio navegador.',
  'app.plant.date.fileNotConfirmed':
    'El archivo muestra que su registro está en este lote. Solo fecha el registro cuando la raíz del lote se encuentra en la transacción indicada. El paquete de evidencia tiene todo lo necesario para consultarlo y explica cómo, y la página de comprobación hace la consulta en el navegador cuando puede conectar con Midnight.',
  'app.plant.date.stampPending':
    'El archivo de sello de Bitcoin fecha la raíz de este lote en Bitcoin con la herramienta gratuita OpenTimestamps: <code>ots verify root.bin.ots</code>, junto a <link>el archivo de la raíz del lote (root.bin)</link>. Todavía está pendiente: una promesa de los servidores de sellado, aún no en un bloque de Bitcoin. Ejecute `ots upgrade` sobre él cuando Bitcoin lo confirme.',
  'app.plant.date.stampInBlock':
    'El archivo de sello de Bitcoin fecha la raíz de este lote en Bitcoin con la herramienta gratuita OpenTimestamps: <code>ots verify root.bin.ots</code>, junto a <link>el archivo de la raíz del lote (root.bin)</link>. Está en un bloque de Bitcoin, así que se comprueba solo con Bitcoin.',
  'app.plant.history.title': 'Historial',
  'app.plant.history.correctionOf': 'Emitido como corrección de {id}. Motivo indicado: {reason}.',
  'app.plant.history.sealed':
    'El titular se comprometió con una descripción de este material, fechada por el reloj del dispositivo que la selló.',
  'app.plant.history.received': 'Recibido',
  'app.plant.history.arrived': 'Llegó por una transferencia de {from}.',
  'app.plant.history.arrivedQty': 'Llegó por una transferencia de {from}, {qty}.',
  'app.plant.history.retracted': 'Atestación retractada',
  'app.plant.history.retractedDetail':
    'Quien la atestiguó la retiró con una retractación firmada con su clave. Motivo: {reason}. La atestación sigue en el registro: retractar no es borrar.',
  'app.plant.history.corrected': 'Corregido',
  'app.plant.history.correctedDetail':
    'Un registro posterior sustituye a este. Este registro no cambia y sigue archivado.',
  'app.plant.tree.none':
    'Todavía no hay linaje registrado. Agregue los cultivares padres al registrar para construir el árbol genealógico.',
  'app.plant.tree.offspring': 'Descendencia',
  'app.plant.tree.datedReports': 'Informes de ADN fechados (no son descendencia)',
  'app.plant.action.nextStage': 'Agregar la siguiente generación o selección',
  'app.plant.action.nextStageHint': 'Un registro nuevo con esta planta como madre. Selle cada etapa cuando ocurra.',
  'app.plant.dated.refused': 'El servidor de registros no lo guardó ({reason}). No se fechó nada. Inténtelo de nuevo.',
  'app.plant.dated.line': 'Informe de ADN fechado: en <link></link> ({status})',
  'app.plant.dated.dated': 'fechado {value}',
  'app.plant.dated.action': 'Fechar este informe de ADN',
  'app.plant.dated.why':
    'Para que pueda mostrar que este informe existía en esa fecha sin mostrarle a nadie los marcadores.',
  'app.plant.dated.seals':
    'Sella un pequeño registro con solo el SHA-256 del informe, su código de informe de laboratorio y el nombre del laboratorio según su firma. El informe se queda con usted. Su fecha llega cuando se fecha su lote.',
  'app.plant.dated.nameLabel': 'Nombre del nuevo registro',
  'app.plant.dated.nameHelp':
    'Bloqueado como el resto. Sus enlaces de comprobación lo llevan, así que lo ve quien reciba uno. Cámbielo si quiere.',
  'app.plant.dated.elsewhere':
    'Este informe de ADN se está fechando en otra pestaña o ventana. Espere un minuto y vuelva a mirar: aparecerá aquí.',
  'app.plant.datingPage.title': 'Este registro fecha un informe de ADN de <plant></plant>',
  'app.plant.datingPage.holds':
    'Solo contiene el SHA-256 del informe, su código de informe de laboratorio y el nombre del laboratorio según su firma, nunca el informe. Cuando su lote se fecha, muestra que el informe existía para entonces, sin mostrarle a nadie los marcadores.',
  'app.plant.datingPage.recordDated': 'Registro fechado: {value}',
  'app.plant.datingPage.backup':
    '<b>Guarde su copia de seguridad.</b> La clave de este registro está solo en este dispositivo.',
  'app.plant.datingPage.sealedBy': 'Sellado por',
  'app.plant.datingPage.notesAsSealed': 'Notas, tal como se sellaron',
  'app.plant.datingPage.bundleText':
    'El registro tal como se selló, su prueba de inclusión, la raíz del lote y dónde se registró el lote, en un solo .zip. Su verify.html lo comprueba sin internet y sin nada de VeilCore.',
  'app.plant.anchor.title': 'Anclar este registro en {network}',
  'app.plant.anchor.anchored':
    'Anclado. Su identidad en la cadena es {id}…, registrada en el bloque {block}{when}. La identidad se guarda en este navegador y en su copia de seguridad, no en el servidor de VeilCore: se comparte enviando a alguien un enlace de verificación. Esta es una red de pruebas: puede reiniciarse y sus fechas no tienen valor como evidencia.',
  'app.plant.anchor.chainClock': ' ({when}, según el reloj de la cadena)',
  'app.plant.anchor.label': 'Anclaje',
  'app.plant.anchor.notAvailable': 'No disponible en esta versión: {why}',
  'app.plant.anchor.intro':
    'Esto da al registro una identidad en la red con la que solo este navegador puede actuar. Su navegador arma y demuestra la transacción por sí mismo; VeilCore paga la tarifa de la red y solo ve lo que la red publica. No necesita billetera ni criptomonedas. Más adelante puede mostrar a quien se lo pida que su clave existía en este bloque y que todavía la controla.',
  'app.plant.anchor.notKeeping':
    'Este navegador no conserva lo que guarda (una ventana privada, o datos del sitio bloqueados). Las claves del registro se perderían al cerrar esta pestaña, salvo que descargue la copia de seguridad.',
  'app.plant.anchor.understand': 'Entiendo, y descargaré la copia de seguridad',
  'app.plant.anchor.keysNotHere':
    'La clave de esta planta no está en este navegador. Recupérela desde su archivo de copia de seguridad: una clave nueva no coincidiría con el registro sellado.',
  'app.plant.anchor.onlyNew':
    'Solo para un registro que nunca tuvo claves: si ya lo ancló, o creó sus claves en otro navegador, restáurelas desde su copia de seguridad arriba. Unas claves nuevas serían otra identidad.',
  'app.plant.anchor.makeKeys': '1. Crear las claves de este registro (en este navegador)',
  'app.plant.anchor.anchorTest': '2. Anclar en la red de pruebas',
  'app.plant.anchor.backupFirst': 'Descargue primero la copia de seguridad',
  'app.plant.keys.restoredFor': 'Claves restauradas para {id}.',
  'app.plant.keys.notNamed':
    'Restauradas, pero no son las claves que nombra este registro. Compruebe que eligió el archivo correcto.',
  'app.plant.keys.notIdentity':
    'Restauradas, pero estas claves no son la identidad en la cadena de este registro. Compruebe que eligió el archivo correcto.',
  'app.plant.keys.restored': 'Claves restauradas en este navegador.',
  'app.plant.keys.removeBacked':
    '¿Quitar las claves de este registro de este navegador? Puede restaurarlas desde su archivo de copia de seguridad.',
  'app.plant.keys.removeUnbacked':
    'NO ha descargado una copia de seguridad de estas claves. Si las quita, este navegador no las recuperará, y solo su archivo de copia de seguridad, restaurado en un navegador nuevo, puede recuperarlas. ¿Quitarlas de todos modos?',
  'app.plant.keys.title': 'Claves del registro',
  'app.plant.keys.holds':
    'Este navegador guarda los dos secretos que demuestran que usted tiene este registro en la cadena. Una copia va también dentro de la caja bloqueada del registro en VeilCore, que solo abre la clave que bloquea sus registros. Borrar este navegador los elimina aquí; restaurar su copia de seguridad los recupera.',
  'app.plant.keys.noBackup': 'Todavía no hay copia de seguridad. Descárguela y guárdela sin conexión.',
  'app.plant.keys.downloadAgain': 'Descargar de nuevo la copia de seguridad',
  'app.plant.keys.download': 'Descargar la copia de seguridad (secreta)',
  'app.plant.keys.remove': 'Quitar de este navegador',
  'app.plant.keys.notHeld':
    'Este navegador no tiene las claves de este registro. Si las creó en otro lugar, restáurelas desde su archivo de copia de seguridad.',
  'app.plant.keys.restore': 'Restaurar las claves desde una copia de seguridad',
  'app.plant.bundle.download': 'Descargar el paquete de evidencia',
  'app.plant.bundle.chooseOrUntick': 'Elija el archivo del informe de ADN, o desmarque la opción.',
  'app.plant.bundle.tooBig': '{name} pesa más de 200 MB, así que no se leyó.',
  'app.plant.bundle.intro':
    'Un solo archivo con todo lo que alguien necesita para comprobar la fecha de este registro sin VeilCore: el registro tal como se selló, la prueba de que está en un lote fechado, dónde se registró ese lote y una página que hace las comprobaciones sin conexión. También incluye un resumen de una página para imprimir para un abogado o examinador, y un texto de ejemplo para una declaración escrita (no es asesoría legal). Un README adentro dice qué muestra y qué no.',
  'app.plant.bundle.notSealed':
    'Este registro se selló antes de que sus detalles se guardaran de forma que cualquiera pueda comprobarlos, así que no se puede hacer un paquete para él.',
  'app.plant.bundle.includeKey': 'Incluir la clave del registro.',
  'app.plant.bundle.keyIs':
    '(La clave del registro es el ID público de la clave creada para esta planta cuando la selló. Su parte secreta se queda en su copia de seguridad y nunca va en el paquete.)',
  'app.plant.bundle.keyWith':
    'Con ella, cualquiera que tenga el paquete puede relacionar este registro con su clave, y con todo lo que esa clave hace en la red. No la incluya salvo que la necesiten.',
  'app.plant.bundle.keyNotHere': 'La clave no está en este navegador. Abra aquí su copia de seguridad para incluirla.',
  'app.plant.bundle.includeLab':
    'Incluir el archivo del informe de ADN. Sin él, el paquete tiene solo el código del informe, no lo que dice.',
  'app.plant.bundle.chooseLab': 'Elegir el archivo del informe de ADN',
  'app.plant.bundle.checkedAgainst': 'Se compara con el guardado en esta planta antes de incluirlo.',
  'app.plant.bundle.labFileAria': 'Archivo del informe de ADN',
  'app.plant.bundle.downloaded':
    'Se descargó {name}. Abra el verify.html que contiene para comprobarlo, o EXAMINER-SUMMARY.html para imprimir un resumen.',
  'app.plant.bundle.making': 'Preparándolo…',
  'app.plant.bundle.downloadButton': 'Descargar',
  'app.plant.cert.intro':
    'Para sus archivos y su abogado: el registro sellado, una comprobación nueva de que no ha cambiado, si está anclado, si un informe de ADN lo vincula con la planta, cualquier acuse de recibo de laboratorio y las licencias vigentes. Lleva los detalles del registro, pero no datos genéticos ni archivos de laboratorio. El código QR abre la página pública de comprobación del registro.',
  'app.plant.cert.jsonDone': 'Resumen (JSON) descargado.',
  'app.plant.cert.pngDone': 'Certificado descargado.',
  'app.plant.cert.pngFailed': 'No se pudo generar la imagen del certificado.',
  'app.plant.cert.linkCopied': 'Enlace de verificación copiado.',
  'app.plant.cert.copyLink': 'Copiar el enlace de verificación',
  'app.plant.cert.downloadPng': 'Descargar (PNG)',
  'app.plant.cert.downloadJson': 'Descargar el resumen (JSON)',
  'app.plant.cert.continue': 'Continuar: elegir lo que ven otros',
  'app.plant.check.title': 'Comprobar que un informe coincide con este registro',
  'app.plant.check.intro':
    'Elija un archivo de informe de laboratorio para ver si es el vinculado a un registro que usted tiene.',
  'app.plant.check.forYou':
    'Esta comprobación se hace solo en su navegador y no envía nada, así que es para usted. Muestra que tiene un archivo que coincide con el informe vinculado a un registro. No muestra quién tiene la planta, y nadie más puede verificarlo desde aquí. Los demás comprueban un registro en su página de verificación, y su fecha una vez anclado.',
  'app.plant.check.tap': 'Toque para elegir el informe de laboratorio',
  'app.plant.check.drag': 'Arrastre aquí el informe de laboratorio, o haga clic para elegirlo',
  'app.plant.check.hint': 'Se lee y se le saca el código en su equipo; nunca se sube.',
  'app.plant.check.none':
    'Ninguno de sus registros tiene guardado este informe de laboratorio. Guárdelo primero en la planta correcta y vuelva a comprobar.',
  'app.plant.check.found': 'Coincidencia encontrada.',
  'app.plant.check.foundSub': 'A este archivo se le sacó el código en su navegador y no se subió.',
  'app.plant.check.matches': 'Este archivo coincide con el informe vinculado a {name}.',
  'app.plant.check.meaning':
    'Registro {id}. Una coincidencia significa que el archivo es, byte por byte, el que usted vinculó; no dice nada de la genética ni de quién tiene la planta.',
  'app.plant.check.checking': 'Comprobando en su dispositivo…',
  'app.plant.check.checkIt': 'Comprobarlo',
  'app.plant.fix.field.cultivarName': 'nombre del cultivar',
  'app.plant.fix.field.breederName': 'obtenida por',
  'app.plant.fix.field.breedingMethod': 'método de mejoramiento',
  'app.plant.fix.field.claimedCreationDate': 'fecha de creación declarada',
  'app.plant.fix.field.notes': 'notas',
  'app.plant.fix.field.internalReference': 'referencia interna',
  'app.plant.fix.field.parents': 'padres',
  'app.plant.fix.field.attestations': 'atestaciones',
  'app.plant.fix.field.sealedAt': 'fecha de sellado',
  'app.plant.fix.field.holder': 'titular',
  'app.plant.fix.c.cosmetic.cosmetic':
    'No se afecta nada más adelante. La descendencia conserva sus comprobaciones de ascendencia, y los acuerdos siguen vigentes.',
  'app.plant.fix.c.cosmetic.material':
    'La descendencia no se ve afectada: el material no cambió. Pero quien tenga un acuerdo sobre este registro debe saberlo, porque las condiciones pueden referirse a lo que usted cambió.',
  'app.plant.fix.c.material.cosmetic':
    'Quien dependa de la descendencia de este registro debe volver a comprobarla. Los acuerdos existentes no se ven afectados.',
  'app.plant.fix.c.material.material':
    'Se afectan tanto la descendencia como los acuerdos existentes. Habrá que volver a comprobar la ascendencia de la descendencia, y avisar a las otras partes de sus acuerdos.',
  'app.plant.fix.open': 'Corregir este registro',
  'app.plant.fix.title': 'Corregir {id}',
  'app.plant.fix.intro':
    'Este registro queda exactamente como está. Una corrección crea un registro nuevo que lo sustituye, y ambos quedan archivados. Una corrección no sobrescribe ni borra nada: eso es lo que mantiene el original útil como evidencia.',
  'app.plant.fix.name': 'Nombre del cultivar',
  'app.plant.fix.bredBy': 'Obtenida por',
  'app.plant.fix.notes': 'Notas',
  'app.plant.fix.does': 'Qué hace esta corrección',
  'app.plant.fix.workedOut':
    'Esto se calcula a partir de los campos que cambió. Ni usted ni nosotros podemos fijarlo; si no, toda corrección parecería inofensiva.',
  'app.plant.fix.why': '¿Por qué corrige esto?',
  'app.plant.fix.whyHelp':
    'Se guarda con la corrección en sus registros. La vista pública muestra qué campos cambiaron, no este motivo.',
  'app.plant.fix.check': 'Ver a qué afecta',
  'app.plant.fix.notSaved': 'No se pudo guardar la corrección.',
  'app.plant.fix.issue': 'Emitir la corrección',
  'app.plant.att.linked': '{date} · vinculado a su envío {id}',
  'app.plant.att.verified': 'La firma se verificó en este navegador.',
  'app.plant.att.unverifiedRetraction':
    ' El servidor de registros también informa una retractación que no firmó el laboratorio, así que aquí se ignora.',
  'app.plant.att.codeUsed':
    'Alguien usó su código de laboratorio, pero ningún laboratorio ha firmado un acuse de recibo para él. Un código usado no muestra quién recibió la muestra.',
  'app.plant.att.noReceipt':
    'Ningún laboratorio ha firmado todavía un acuse de recibo para esta planta. Un registro que solo usted respalda es una evidencia más débil que uno que firma un laboratorio. Envíe una muestra a un laboratorio: su acuse de recibo se firma con su clave, no con la suya.',
  'app.plant.att.others':
    'Otras firmas nombran este registro: {n}, no vinculadas a sus envíos. Cualquiera puede firmar una declaración sobre un código de prueba público, así que no se cuentan como acuse de recibo.',
  'app.plant.att.title': 'Firmas sobre este registro',
  'app.plant.att.nobody':
    'Nadie más ha confirmado todavía este registro. Un registro que solo usted respalda es una evidencia más débil que uno que confirma una segunda parte. Envíe el material a un laboratorio: su confirmación se registra con su clave, no con la suya.',
  'app.plant.att.legacy':
    'Entrega recibida el {date} por alguien con el código que emitió el remitente{addressed}. Se registró antes de que existieran las firmas, así que establece que una segunda parte recibió la entrega sin demostrar quién es.',
  'app.plant.att.addressed': ', dirigido a {who}',
} satisfies Partial<AppTranslation>;
