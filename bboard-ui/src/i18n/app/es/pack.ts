// Spanish (usted): the pack for the authority, the language most packs are made in. DRAFT:
// machine-assisted, to be checked by a fluent speaker before publishing (docs/translations/README.md).
// Terms as in ../../es.ts; the resolution's own words where it has them (informe semestral,
// declaración jurada, informe cromatográfico, plan de cultivo, registro de producción,
// Responsable Técnico, pacientes vinculados, variedad genética registrada).
// "Registro" never alone for one of ours: "registro VeilCore" or "ID VeilCore". A bare "no figura
// en el registro" reads to an authority as "la variedad no está registrada".
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const pack = {
  'app.pack.home': 'Paquete para REPROCANN / SEDRONAR',
  'app.pack.title': 'Paquete para REPROCANN / SEDRONAR',
  'app.pack.intro':
    'Para una asociación de cannabis medicinal en Argentina. Reúne lo que muestran sus registros VeilCore en un período, como material de respaldo para el informe semestral y el registro de producción, indica lo que falta y da el enlace de comprobación de cada registro VeilCore. Usted lo revisa, lo firma y lo envía.',
  'app.pack.form.period': 'Período',
  'app.pack.form.periodSix': 'Últimos seis meses',
  'app.pack.form.periodPermit': 'Año del permiso',
  'app.pack.form.periodOther': 'Otras fechas',
  'app.pack.form.permitStart': 'Fecha de inicio del permiso',
  'app.pack.form.from': 'Desde',
  'app.pack.form.to': 'Hasta',
  'app.pack.form.badPeriod': 'Elija una fecha de inicio igual o anterior a la fecha de fin.',
  'app.pack.form.association': 'Nombre de la asociación (se imprime en el paquete)',
  'app.pack.form.preparedBy': 'Preparado por (se imprime en el paquete)',
  'app.pack.form.countsTitle': 'Plantas',
  'app.pack.form.countsHelp':
    'Escriba las cifras que declara. Las sumas de abajo son solo una referencia: la suma de lotes de cultivo sellados no es un inventario.',
  'app.pack.form.sumsPlants':
    'Sus lotes de cultivo fechados en este período suman {plants} plantas (lotes con este recuento: {counted} de {batches}).',
  'app.pack.form.sumsFlower':
    'Suman {inFlower} plantas en floración (lotes con este recuento: {counted} de {batches}).',
  'app.pack.form.sumsNone': 'Ningún lote de cultivo fechado en este período tiene recuentos de plantas sellados.',
  'app.pack.form.plants': 'Cantidad total de plantas',
  'app.pack.form.inFlower': 'Plantas en floración',
  'app.pack.form.patients': 'Cantidad de pacientes vinculados',
  'app.pack.form.patientsHelp':
    'Solo un número, nunca nombres. Se usa para armar este paquete y para nada más: no se guarda ni se envía a VeilCore ni a nadie.',
  'app.pack.form.badNumber': 'Escriba un número entero, o déjelo vacío.',
  'app.pack.form.lang': 'Idioma del paquete',
  'app.pack.form.make': 'Armar el paquete',
  'app.pack.form.making': 'Consultando la fecha de cada registro VeilCore…',
  'app.pack.form.print': 'Imprimir o guardar como PDF',
  'app.pack.form.printHelp': 'En la ventana de impresión, elija «Guardar como PDF» y papel A4.',
  'app.pack.form.linksWarn':
    'Cada enlace de comprobación del paquete lleva, después del #, los datos sellados de ese registro VeilCore, así que quien lo abra los verá: {list}.',
  'app.pack.form.linksLocal':
    'Algunos se guardan solo en este dispositivo. Al enviar el paquete, sus datos salen de él.',
  'app.pack.form.none': 'En este navegador no hay ningún lote de cultivo ni lote de cosecha fechado en este período.',
  'app.pack.form.failed': 'No se pudo armar el paquete: {reason}',
  'app.pack.doc.title': 'Material de respaldo para el informe semestral y el registro de producción',
  'app.pack.doc.sub': 'Elaborado a partir de los registros VeilCore de la propia asociación.',
  'app.pack.doc.notFormShort': 'No es un formulario oficial.',
  'app.pack.doc.rules':
    'Para el informe semestral en carácter de declaración jurada y el informe cromatográfico por lote (art. 4 ter, inc. f, de la Res. MS 800/2021, incorporado por la Res. MS 1780/2025), y para el registro de producción del plan de cultivo (mismo artículo, inc. h).',
  'app.pack.doc.association': 'Asociación: {name}',
  'app.pack.doc.preparedBy': 'Preparado por: {name}',
  'app.pack.doc.period': 'Período: del {from} al {to}',
  'app.pack.doc.made': 'Elaborado el {at} a partir de {records} de este navegador.',
  'app.pack.doc.records.one': 'un registro VeilCore',
  'app.pack.doc.records.other': '{count} registros VeilCore',
  'app.pack.doc.pageOf': 'página {page} de {pages}',
  'app.pack.doc.gapsTitle': 'Antes de enviar: lo que falta',
  'app.pack.doc.gapsNone': 'No falta nada que estos registros VeilCore muestren.',
  'app.pack.doc.variety': '1. Variedad genética registrada utilizada',
  'app.pack.doc.varietyHelp':
    'Las plantas o cepas que nombran los lotes de cultivo. El número de registro es el que el titular escribió y selló en su registro VeilCore; nadie lo comparó con el registro oficial.',
  'app.pack.doc.col.variety': 'Variedad',
  'app.pack.doc.col.registration': 'Número de registro de la variedad',
  'app.pack.doc.col.record': 'ID VeilCore',
  'app.pack.doc.regNone': 'Sin número indicado en VeilCore',
  'app.pack.doc.varietyNone':
    'Los lotes de cultivo de estos registros VeilCore no nombran ningún registro VeilCore de origen.',
  'app.pack.doc.sourceMissing':
    '{name} (ID VeilCore {id}): lo nombra un lote de cultivo, pero no está en este navegador.',
  'app.pack.doc.plants': '2. Plantas',
  'app.pack.doc.plantsTotal': 'Cantidad total de plantas',
  'app.pack.doc.plantsFlower': 'Plantas en floración',
  'app.pack.doc.notGiven': 'No indicado',
  'app.pack.doc.typed':
    'Según lo declara el responsable al armar este paquete. No proviene de un registro VeilCore sellado.',
  'app.pack.doc.sums':
    'Solo como referencia: los lotes de cultivo sellados en el período suman {plants} plantas y {inFlower} en floración. La suma de lotes sellados no es un inventario.',
  'app.pack.doc.patients': '3. Pacientes vinculados',
  'app.pack.doc.patientsNote':
    'Solo un número, escrito por el responsable al armar este paquete. No figura en ningún registro VeilCore y no se envió a VeilCore.',
  'app.pack.doc.production': '4. Registro de producción',
  'app.pack.doc.productionHelp':
    'Cada paso es un registro VeilCore sellado por la asociación que nombra al anterior. Ese vínculo es la declaración del propio titular: nadie lo compara con el registro VeilCore que nombra.',
  'app.pack.doc.col.step': 'Paso',
  'app.pack.doc.col.name': 'Nombre e ID VeilCore',
  'app.pack.doc.col.date': 'Fecha',
  'app.pack.doc.col.figures': 'Cifras (tal como se sellaron)',
  'app.pack.doc.col.about': 'Sobre',
  'app.pack.doc.outside': 'Fechado antes de este período: un lote de cosecha del período trata sobre él.',
  'app.pack.doc.batchFigures': '{plants} plantas, {inFlower} en floración',
  'app.pack.doc.batchNoFigures': 'Sin recuentos sellados',
  'app.pack.doc.lotFigures': '{plants} plantas cosechadas',
  'app.pack.doc.chromatography': '5. Informe cromatográfico por lote de cosecha',
  'app.pack.doc.chromatographyHelp':
    'Un informe de laboratorio o certificado de análisis sellado como registro VeilCore sobre el lote. Sus cifras se muestran solo cuando la firma de un laboratorio sobre ellas se comprueba y el laboratorio está identificado.',
  'app.pack.doc.lot': 'Lote {lot}',
  'app.pack.doc.labSigned': 'Resultado firmado por un laboratorio. {signer}',
  'app.pack.doc.document':
    'Documento sellado: «{title}». El informe es el archivo del laboratorio; lo que dice está en ese archivo, no en este paquete.',
  'app.pack.doc.labUnnamed':
    'Se guarda con una firma de laboratorio, pero aquí no se identifica a ningún laboratorio detrás de ella, así que no se muestran sus cifras.',
  'app.pack.doc.missing': 'Falta: en estos registros VeilCore no hay ningún informe cromatográfico sobre este lote.',
  'app.pack.doc.proofs': '6. Códigos de prueba, enlaces de comprobación y fechas',
  'app.pack.doc.proofsHelp':
    'Cualquiera puede abrir cada enlace de comprobación de forma gratuita y sin cuenta. Un registro VeilCore muestra la tenencia previa de su archivo y sus datos en su fecha. No muestra que lo que dice sea cierto.',
  'app.pack.doc.recordId': 'ID VeilCore {id}',
  'app.pack.doc.proofCode': 'Código de prueba',
  'app.pack.doc.checkLink': 'Enlace de comprobación',
  'app.pack.doc.onPaper': 'En papel: abra {site}/verify e introduzca el ID VeilCore {id} y el código de prueba de arriba.',
  'app.pack.doc.noLink': 'Sin enlace de comprobación: este registro VeilCore aún no está sellado.',
  'app.pack.doc.local': 'Se guarda solo en el dispositivo de la asociación.',
  'app.pack.doc.dateRests': 'En qué se apoya la fecha',
  'app.pack.role.source': 'Origen',
  'app.pack.role.grow-batch': 'Lote de cultivo',
  'app.pack.role.harvest-lot': 'Lote de cosecha',
  'app.pack.role.report': 'Informe de laboratorio',
  'app.pack.doc.notForm':
    'No conocemos un formulario oficial publicado para esta declaración. VeilCore no presenta nada en nombre de la asociación. La asociación revisa este paquete, lo firma y lo envía por su cuenta.',
  'app.pack.doc.handover':
    'Elaborado solo con los registros VeilCore de este navegador. Los registros VeilCore sellados en el dispositivo de otro responsable se incluyen solo una vez restaurados aquí desde la copia de seguridad de esa persona.',
  'app.pack.doc.signSign': 'Firma',
  'app.pack.doc.signName': 'Aclaración',
  'app.pack.doc.signRole': 'Carácter (representante legal / Responsable Técnico)',
  'app.pack.doc.signDate': 'Fecha',
  'app.pack.date.unsealed': 'No está sellado, así que nada lo fecha.',
  'app.pack.date.none': 'Aún no está fechado en ninguna red.',
  'app.pack.date.pending': 'En un lote del servidor de registros, aún no fechado en ninguna red.',
  'app.pack.date.test': ' Una red de pruebas: datos de práctica, no una fecha real.',
  'app.pack.date.checked':
    'En {where}: comprobado por este navegador al armar el paquete. La raíz del lote está en la transacción {tx}, bloque {block}, {at}.{test}',
  'app.pack.date.failed':
    'En {where}: no confirmado. Este navegador consultó la transacción y no coincide con lo que informa el servidor de registros de VeilCore. No confíe en esa fecha; el enlace de comprobación muestra por qué.',
  'app.pack.date.reported':
    'En {where}: {date}, según informa el servidor de registros de VeilCore. No comprobado por este navegador; el enlace de comprobación lo consulta.{test}',
  'app.pack.date.noTime': 'sin hora indicada',
  'app.pack.date.bitcoin':
    'Bitcoin: el servidor de registros de VeilCore informa la raíz del lote en el bloque de Bitcoin {block} ({at}). Compruébelo con el archivo OpenTimestamps del lote.',
  'app.pack.date.bitcoinPending': 'Bitcoin: sello pendiente, aún no está en un bloque de Bitcoin.',
  'app.pack.date.tsa':
    'RFC 3161: la raíz del lote lleva un sello de tiempo de {tsa}, a las {at} según indica el token. El token se comprobó contra la raíz del lote en este navegador; la prueba de inclusión de este registro VeilCore lo vincula con esa raíz.',
  'app.pack.date.tsaUnnamed': 'una autoridad de sellado de tiempo',
  'app.pack.date.tsaQualified':
    'El servidor de registros de VeilCore indica que esa autoridad es cualificada según {scheme}. Compruebe usted la lista de confianza antes de apoyarse en eso.',
  'app.pack.gap.chromatography': 'Lote {lot}: falta el informe cromatográfico.',
  'app.pack.gap.registration': '{name}: no se indicó número de registro de la variedad.',
  'app.pack.gap.source': '{name}: lo nombra un lote de cultivo, pero no está en este navegador.',
  'app.pack.gap.noBatches': 'Ningún lote de cultivo está fechado en este período.',
  'app.pack.gap.noLots': 'Ningún lote de cosecha está fechado en este período.',
  'app.pack.gap.plants': 'Cantidad total de plantas: no indicada.',
  'app.pack.gap.inFlower': 'Plantas en floración: no indicadas.',
  'app.pack.gap.plantsPartial.one': 'Un lote de cultivo del período no tiene recuento de plantas sellado.',
  'app.pack.gap.plantsPartial.other': '{count} lotes de cultivo del período no tienen recuento de plantas sellado.',
  'app.pack.gap.inFlowerPartial.one':
    'Un lote de cultivo del período no tiene sellado el recuento de plantas en floración.',
  'app.pack.gap.inFlowerPartial.other':
    '{count} lotes de cultivo del período no tienen sellado el recuento de plantas en floración.',
  'app.pack.gap.patients': 'Cantidad de pacientes vinculados: no indicada.',
  'app.pack.gap.undated.one': 'Un registro VeilCore aún no está fechado en ninguna red.',
  'app.pack.gap.undated.other': '{count} registros VeilCore aún no están fechados en ninguna red.',
  'app.pack.gap.unchecked.one':
    'Una fecha es lo que informa el servidor de registros de VeilCore, no comprobada en la red principal de Midnight por este navegador.',
  'app.pack.gap.unchecked.other':
    '{count} fechas son lo que informa el servidor de registros de VeilCore, no comprobadas en la red principal de Midnight por este navegador.',
  'app.pack.gap.locked.one':
    'Un registro VeilCore de este navegador está bloqueado (sellado con una clave que este navegador no tiene) y queda fuera.',
  'app.pack.gap.locked.other':
    '{count} registros VeilCore de este navegador están bloqueados (sellados con una clave que este navegador no tiene) y quedan fuera.',
} satisfies Partial<AppTranslation>;
