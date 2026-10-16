// Spanish (neutral Latin American, usted). DRAFT: machine-assisted, to be checked by a fluent
// speaker before publishing (docs/translations/README.md). Terms as in ../../es.ts.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const verify = {
  'app.verify.report.notSaved': 'El titular no ha guardado un informe de ADN en este registro.',
  'app.verify.report.asOf': ' (a la fecha en que se hizo este enlace)',
  'app.verify.report.staleNote':
    ' Este enlace se hizo cuando había otro archivo guardado; esta línea trata del que está guardado ahora.',
  'app.verify.report.matches':
    'El titular guardó un informe de ADN en este registro{asOf}. Su archivo (SHA-256 {sha}) coincide con el informe de laboratorio {lead}: firma comprobada en este navegador.{rest}{staleNote}',
  'app.verify.report.which': 'El informe de ADN guardado en este registro{asOf} (SHA-256 {sha})',
  'app.verify.report.replaced':
    '{which} fue reemplazado por su laboratorio el {on} por uno corregido. {tail}{staleNote}',
  'app.verify.report.withdrawn': '{which} fue retirado por su laboratorio el {on}. {tail}{staleNote}',
  'app.verify.report.ownSha':
    'El titular guardó un archivo de informe de ADN en este registro{asOf} (SHA-256 {sha}). Ninguna firma de laboratorio de este registro coincide con él, así que es la propia declaración del titular.{staleNote}',
  'app.verify.report.own':
    'El titular guardó un archivo de informe de ADN en este registro. Ninguna firma de laboratorio de este registro coincide con él, así que es la propia declaración del titular.{staleNote}',
  'app.verify.report.unnamedSigned':
    'El titular guardó un informe de ADN en este registro. Este enlace no nombra el archivo, así que esta página no puede saber si es el informe firmado que aparece arriba.',
  'app.verify.report.unnamedWithdrawn':
    'El titular guardó un informe de ADN en este registro. Este enlace no nombra el archivo, y todos los informes firmados sobre este registro fueron retirados por su laboratorio, así que es la propia declaración del titular.',
  'app.verify.report.unnamedNone':
    'El titular guardó un informe de ADN en este registro. Ningún laboratorio ha firmado un informe sobre este registro, así que es la propia declaración del titular.',
  'app.verify.kind.receipts.one': 'un acuse de recibo de laboratorio',
  'app.verify.kind.receipts.other': '{count} acuses de recibo de laboratorio',
  'app.verify.kind.reports.one': 'un informe de laboratorio',
  'app.verify.kind.reports.other': '{count} informes de laboratorio',
  'app.verify.kind.statements.one': 'una declaración firmada',
  'app.verify.kind.statements.other': '{count} declaraciones firmadas',
  'app.verify.kind.and': ' y ',
  'app.verify.withdrawnSignatures.one': 'Una firma fue retirada por quien la firmó, así que no se cuenta: {what}.',
  'app.verify.withdrawnSignatures.other':
    '{count} firmas fueron retiradas por quienes las firmaron, así que no se cuentan: {what}.',
  'app.verify.anchor.registryDate': '{date}, según lo informa el servidor de registros de VeilCore',
  'app.verify.anchor.noDate': 'no indicada (el servidor de registros de VeilCore no da fecha para esa transacción)',
  'app.verify.anchor.lookingUp': 'Consultando esa transacción en {network}…',
  'app.verify.anchor.twoIndexers': ' Dos indexadores de Midnight distintos dieron la misma respuesta.',
  'app.verify.anchor.checked':
    'Comprobado en Midnight: la raíz de este lote la escribió la transacción {tx} en el bloque {block} el {at}.{two}{test}',
  'app.verify.anchor.failed':
    'No confirmado en Midnight: {reason}. No confíe en la fecha que informa el servidor de registros.',
  'app.verify.anchor.dateNotChecked': 'La fecha es {date}; no se comprobó aquí.',
  'app.verify.anchor.oneIndexer':
    'Solo respondió uno de los dos indexadores de Midnight, y deben responder ambos. {date}',
  'app.verify.anchor.noIndexer': 'No se pudo conectar con un indexador de Midnight. {date}',
  'app.verify.anchor.headingTest':
    'Sello de fecha comprobado en una red de pruebas: datos de práctica, no una fecha real',
  'app.verify.anchor.headingChecked': 'Sello de fecha comprobado en Midnight',
  'app.verify.anchor.headingFailed': 'Sello de fecha no confirmado en Midnight',
  'app.verify.anchor.eventTestTitle': 'Sello de fecha comprobado en una red de pruebas',
  'app.verify.anchor.eventChecked':
    'Lote {batch}: esta página encontró la raíz del lote en la transacción {tx}, bloque {block}, en {where}.{test}',
  'app.verify.anchor.eventFailed':
    'Lote {batch}: {reason}. No confíe en la fecha que informa el servidor de registros.',
  'app.verify.anchor.whyChecking': 'Esta página lo está consultando en Midnight.',
  'app.verify.anchor.whyUnreachable': 'Esta página no pudo conectar con Midnight para comprobarlo.',
  'app.verify.anchor.whyNotLooked': 'Esta página no lo ha consultado en Midnight.',
  'app.verify.anchor.eventReportedTitle': 'Sello de fecha informado por el servidor de registros',
  'app.verify.anchor.inTx': ' en la transacción {tx}',
  'app.verify.anchor.eventReported':
    'Lote {batch}: el servidor de registros informa que la raíz del lote se registró en {where}{tx}. La fecha es {date}. {why} No confíe en la fecha hasta que se compruebe.{test}',
  'app.verify.anchor.summaryAdd': '{summary} Comprobado en Midnight: el sello de fecha de la raíz del lote.',
  'app.verify.field.existence': 'Tenencia previa (solo se muestra una vez anclado)',
  'app.verify.field.attestation-status': 'Si hay un informe de ADN guardado',
  'app.verify.field.descent-clean': 'Estado del linaje, según el servidor de registros',
  'app.verify.field.sealed-at': 'Cuándo se selló (reloj del dispositivo del titular)',
  'app.verify.field.parent-names': 'Nombres de los cultivares padres',
  'app.verify.field.breeding-method': 'Método de mejoramiento',
  'app.verify.field.individual-id': 'Identificación individual y su sistema',
  'app.verify.field.genetics': 'La genética en sí: nunca se divulga, por diseño',
  'app.verify.sum.reports.one': 'un informe de laboratorio',
  'app.verify.sum.reports.other': '{count} × informe de laboratorio',
  'app.verify.sum.receipts.one': 'un acuse de recibo de laboratorio',
  'app.verify.sum.receipts.other': '{count} × acuse de recibo de laboratorio',
  'app.verify.sum.statements.one': 'una declaración firmada',
  'app.verify.sum.statements.other': '{count} × declaración firmada',
  'app.verify.sum.what': ' ({list})',
  'app.verify.sum.comma': ', ',
  'app.verify.sum.bound': 'la huella del enlace coincide con la que informa el servidor de registros',
  'app.verify.sum.inBatch': 'el registro está en su lote',
  'app.verify.sum.signatures.one': 'una firma sobre él{what}',
  'app.verify.sum.signatures.other': '{count} firmas sobre él{what}',
  'app.verify.sum.nothing':
    'Nada de esta página se pudo comprobar en este navegador: todo es lo que informa el servidor de registros de VeilCore.',
  'app.verify.sum.list': '{rest} y {last}',
  'app.verify.sum.checked':
    'Comprobado en este navegador: {list}. Todo lo demás es lo que informa el servidor de registros de VeilCore.{unbound}',
  'app.verify.sum.unbound':
    ' Este enlace no nombra ninguna huella, así que esas comprobaciones usaron la del propio servidor de registros y no se marca nada.',
  'app.verify.heading.nothingSealed': 'Registro encontrado, nada sellado',
  'app.verify.heading.unbound':
    'Lo que informa el servidor de registros: este enlace no tiene huella con la que comprobarlo',
  'app.verify.heading.checking': 'Comprobando…',
  'app.verify.heading.reported': 'Sello de fecha informado por el servidor de registros, no comprobado aquí',
  'app.verify.heading.pending': 'En un lote, todavía sin sello de fecha',
  'app.verify.heading.none': 'Todavía sin sello de fecha',
  'app.verify.thisId': 'este ID',
  'app.verify.kindReceipt': 'Acuse de recibo de laboratorio de una muestra',
  'app.verify.kindReport': 'Informe de laboratorio (SHA-256 del archivo {sha})',
  'app.verify.kindStatement': 'Declaración firmada',
  'app.verify.forWhom': 'Para la huella que informa el servidor de registros: ',
  'app.verify.homeAria': 'Inicio de VeilCore',
  'app.verify.intro':
    'Esta página comprueba un registro de VeilCore: una huella de la descripción de un material genético, fechada una vez anclada y publicada sin la genética. Comprobar es gratis y no necesita cuenta. <link>¿Qué es VeilCore?</link>',
  'app.verify.checkingRecord': 'Comprobando el registro',
  'app.verify.notFound': 'No se encontró ningún registro para {id}',
  'app.verify.notFoundText':
    'Este enlace de verificación no coincide con ningún registro del servidor de registros. Compruebe que el enlace esté completo y sin cambios.',
  'app.verify.goHome': 'Ir a veilcore.org',
  'app.verify.mismatch.title': 'La huella de este enlace no coincide con el registro: no se comprobó nada',
  'app.verify.mismatch.dontRely': 'No confíe en esta página.',
  'app.verify.mismatch.text':
    '{start}pero el servidor de registros informa {reported} para {id}. Su respuesta no trata del registro que nombra el enlace, así que esta página no comprobó nada y no muestra nada de ella. Pida el registro a quien le dio el enlace.',
  'app.verify.mismatch.linked': 'Este enlace se hizo para el registro con la huella {fp}, ',
  'app.verify.mismatch.invalid':
    'Este enlace lleva una huella no válida (debería tener 64 caracteres hexadecimales); puede que se haya cortado o modificado, ',
  'app.verify.mismatch.reportedFp': 'la huella {fp}',
  'app.verify.mismatch.noFp': 'ninguna huella',
  'app.verify.mismatch.inLink': 'Huella en el enlace: {fp}',
  'app.verify.mismatch.chip':
    'La respuesta del servidor de registros no coincide con este enlace: no se comprobó nada de esta página',
  'app.verify.nameTyped': 'Nombre, tal como lo escribió el titular: ',
  'app.verify.recordId': 'ID del registro: {id}',
  'app.verify.noCommitment':
    'Este registro no lleva ningún compromiso, así que no se puede comprobar nada de él. Existe en el servidor de registros y nada más.',
  'app.verify.boundFact':
    'Este enlace se hizo para la huella {fp}, y el servidor de registros informa la misma huella para este registro{firstSeen}. Los campos que cubre no se comparten, así que esta página no puede recalcularla.',
  'app.verify.firstStored': ', guardado por primera vez el {date}',
  'app.verify.unboundFact':
    'El servidor de registros informa un registro con la huella {fp}{firstSeen}. Los campos que cubre no se comparten, así que esta página no puede recalcularla.',
  'app.verify.noFpInLink':
    'Este enlace no nombra la huella del registro, así que esta página no puede saber si el servidor de registros respondió con la huella de este registro o con la de otro. No se marca nada de lo que sigue. Un enlace hecho ahora desde el registro termina en ?fp=…; pídale uno al titular.',
  'app.verify.noStampYet':
    'Todavía sin sello de fecha, hasta donde esta página puede saber: aquí no hay prueba de que el registro esté en un lote con sello de fecha, así que no hay nada que comprobar.',
  'app.verify.batchBound':
    'Comprobado en este navegador: esta huella está en el lote {batch}, y su camino llega a la raíz del lote {root}….',
  'app.verify.batchUnbound':
    '{forWhom}está en el lote {batch}, y su camino llega a la raíz del lote {root}…. Comprobado aquí, pero con la huella del propio servidor de registros.',
  'app.verify.rootReported':
    'El servidor de registros informa que esa raíz se registró en {network}{tx}. Su fecha: {date}.{notLooked}{test}',
  'app.verify.notLooked': ' Esta página no la consultó; hágalo antes de confiar en la fecha.',
  'app.verify.batchNoStamp': 'El lote todavía no tiene sello de fecha en Midnight.',
  'app.verify.sigLine': '{forWhom}{kind}, firma verificada en este navegador. {lead}.',
  'app.verify.sampleDetails': 'Detalles de la muestra, según el servidor de registros:',
  'app.verify.moreSigs': '{forWhom}Y {n} firmas más, cada una verificada en este navegador.',
  'app.verify.noneVerified':
    'El servidor de registros informa una atestación firmada, pero no se pudo verificar ninguna en este navegador.',
  'app.verify.noneSigned': 'No se ha firmado ningún acuse de recibo ni informe de laboratorio sobre este registro.',
  'app.verify.badSigs.one':
    'Una firma que informa el servidor de registros no se verifica en este navegador, así que no se cuenta.',
  'app.verify.badSigs.other':
    '{count} firmas que informa el servidor de registros no se verifican en este navegador, así que no se cuentan.',
  'app.verify.ownReceipt': '{lead}, vinculado a su envío {tx}.',
  'app.verify.ownReceiptTail':
    ' Usted lo ve porque la planta está en este navegador; quien reciba el enlace solo ve la línea de firma de arriba.',
  'app.verify.sharedTitle': 'Compartido por el titular · informado por el servidor de registros',
  'app.verify.notGranted': 'Este enlace pidió {list}, que el titular no eligió compartir.',
  'app.verify.unavailable':
    'Este enlace pidió datos sobre el titular y no sobre este registro ({list}). El servidor de registros nunca responde a eso.',
  'app.verify.footer': 'Huella {fp} · solo se enviaron los datos de arriba · no se divulgó genética',
  'app.verify.mark.checked': 'Comprobado en este navegador',
  'app.verify.mark.reported': 'No comprobado aquí',
  'app.verify.mark.failed': 'Fallido o retirado',
  'app.verify.mark.key': 'Qué significan las marcas',
  'app.verify.own.preview':
    'Tenencia previa: solo se muestra cuando el servidor de registros informa que el lote de este registro está anclado, y entonces como lo que informa el servidor de registros.',
  'app.verify.own.anchored':
    'Tenencia previa: el servidor de registros informa que el lote de este registro se ancló en {network}.{found}{test}',
  'app.verify.own.found':
    ' Esta página encontró ese sello de fecha en Midnight por sí misma (arriba). Fecha el registro, no quién lo tenía.',
  'app.verify.own.notConfirmed': ' Esta página no lo ha confirmado en la cadena.',
  'app.verify.own.notAnchored':
    'Tenencia previa: todavía sin anclar, así que su fecha se basa en los registros de este servidor.',
  'app.verify.dna.saved': 'El titular guardó un informe de ADN en este registro.',
  'app.verify.lineage.intact':
    'El servidor de registros informa el linaje intacto: una cadena sin cortes hasta el registro sellado. Esta página no lo ha comprobado.',
  'app.verify.lineage.notChecked':
    'Linaje: no comprobado en esta página. El servidor de registros no recorre la descendencia para un enlace compartido.',
  'app.verify.sealedAt':
    'Sellado, según el reloj del dispositivo del titular: {date}. Es la propia declaración del titular.{first}',
  'app.verify.firstStoredBy': ' Guardado por primera vez en este servidor de registros: {date}.',
  'app.verify.parents': 'Padres, según el titular: {list}',
  'app.verify.noParents': 'No hay padres registrados.',
  'app.verify.method': 'Método de mejoramiento, según el titular: {method}',
  'app.verify.noMethod': 'No hay método de mejoramiento registrado.',
  'app.verify.sharedNothing': 'El titular no compartió nada más allá de lo básico de arriba.',
  'app.verify.notShared': 'No compartido por el titular: {list}.',
  'app.verify.alwaysShown':
    'Siempre se muestra: el nombre del cultivar, el ID del registro, su huella ({fp}), cuándo lo guardó por primera vez el servidor de registros y lo que esta página pudo comprobar sobre su lote y las atestaciones firmadas (un acuse de recibo de laboratorio, un informe de laboratorio).',
  'app.verify.ex.title': 'Ejemplo: un registro inventado.',
  'app.verify.ex.intro':
    'Esto muestra cómo es la página de comprobación de un registro, con una nota bajo cada línea. Aquí no se consultó ni comprobó nada.',
  'app.verify.ex.status': 'Ejemplo · en un lote sellado · anclaje informado',
  'app.verify.ex.name': 'Harbour Mist (ejemplo)',
  'app.verify.ex.fact1':
    'Este enlace se hizo para la huella 3f9a0c41e2b7…, y el servidor de registros informa la misma huella para este registro.',
  'app.verify.ex.note1':
    'La huella está en el propio enlace, así que no se puede engañar a la página para que muestre las comprobaciones de otro registro.',
  'app.verify.ex.fact2':
    'Comprobado en este navegador: esta huella está en el lote 41, y su camino llega a la raíz del lote.',
  'app.verify.ex.note2':
    'En un registro real esta línea lleva una marca: su propio navegador comprueba que el registro está en el lote.',
  'app.verify.ex.fact3':
    'Comprobado en Midnight: la raíz de este lote la escribió la transacción 9c41e0…b27d en el bloque 2973563 el 2026-10-11 14:03 UTC.{test}',
  'app.verify.ex.note3':
    'Esa transacción, en {network}, es lo que fecha el registro. En un registro real, su navegador la pide a un indexador de Midnight y comprueba que escribió esta raíz de lote en el contrato de VeilCore. Si ningún indexador responde, la línea lo dice y la fecha es solo lo que informa el servidor de registros: consulte la transacción en un explorador de Midnight, como midnightexplorer.com, antes de confiar en ella.',
  'app.verify.ex.fact4':
    'Informe de laboratorio (SHA-256 del archivo 7c1e04d2…9b3a51), firma verificada en este navegador. Firmado por una clave llamada “Example Lab” (nombre no comprobado).',
  'app.verify.ex.note4':
    'Un laboratorio puede firmar con su propia clave su acuse de recibo de una muestra y su informe de laboratorio. Cada línea dice cuál es. La página comprueba la firma; si la clave es de un laboratorio en el que confía, lo decide usted.',
  'app.verify.ex.fact5':
    'El titular guardó un informe de ADN en este registro. Su archivo (SHA-256 7c1e04d2…9b3a51) coincide con el informe de laboratorio firmado por una clave llamada “Example Lab” (nombre no comprobado): firma comprobada en este navegador.',
  'app.verify.ex.note5': 'El titular elige qué datos aparecen aquí. Lo que no se comparte aparece como no compartido.',
  'app.verify.ex.marks':
    '✓ esta página comprobó la línea por sí misma, en su navegador. ○ lo informa el servidor de registros de VeilCore o el titular; esta página no lo comprobó. ⊗ una comprobación falló, o un laboratorio retiró lo que firmó.',
  'app.verify.ex.checkReal': 'Comprobar un registro real',
  'app.verify.ex.what': '¿Qué es VeilCore?',
} satisfies Partial<AppTranslation>;
