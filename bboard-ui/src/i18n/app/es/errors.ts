// Spanish (usted): what a failure says (../en/errors.ts). Terms as in docs/i18n-glossary.md:
// servidor de registros for the registry, afirmación for a claim about a number, anotación
// for a lender's claim, prueba de trabajo, código de prueba.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const errors = {
  'app.err.unknown': 'Algo salió mal. Inténtelo de nuevo.',
  'app.err.technical': 'Algo salió mal. Detalles técnicos (en inglés): {detail}',
  'app.err.technicalReason': 'un problema técnico (detalles en inglés: {detail})',

  'app.err.registry.unexpected': 'Respuesta inesperada del servidor de registros.',
  'app.err.registry.notAsExpected': 'El servidor de registros no respondió como se esperaba.',
  'app.err.registry.answered': 'el servidor de registros respondió {status}',
  'app.err.registry.unexpectedLower': 'respuesta inesperada del servidor de registros',
  'app.err.registry.refusedCorrection':
    'El servidor de registros rechazó esta corrección, así que no se cambió nada. {refusals}',

  'app.err.chain.unreachable':
    'No se pudo conectar con la red Midnight ni con el servicio de comisiones. No se envió nada. Inténtelo de nuevo en unos minutos.',
  'app.err.chain.contractNotFound': 'No se encontró el contrato de VeilCore en la red. No se envió nada.',
  'app.err.chain.demoNotFound': 'No se encontró el contrato de demostración en la red.',
  'app.err.chain.claimsNotFound': 'No se encontró el contrato de afirmaciones en la red.',
  'app.err.chain.otherContract': 'El contrato de la red no es el que este sitio espera. No se envió nada.',
  'app.err.chain.otherClaimsContract':
    'El contrato de afirmaciones de la red no es el que este sitio espera. No se envió nada.',
  'app.err.chain.filesMismatch':
    'Los archivos de prueba de este sitio no son los que usa el contrato de la red. No se envió nada.',
  'app.err.chain.claimsFilesMismatch':
    'Los archivos de prueba de este sitio no son los que usa el contrato de afirmaciones. No se envió nada.',
  'app.err.chain.circuitFilesMismatch':
    'Los archivos de prueba de este sitio para {circuit} no son los que usa el contrato.',
  'app.err.chain.filesMissing': 'Los archivos de prueba para {circuit} todavía no están en este sitio.',
  'app.err.chain.paramsMissing': 'Los parámetros públicos (k={k}) todavía no están en este sitio.',
  'app.err.chain.callFailed': 'La red incluyó la llamada, pero no se completó ({status}).',
  'app.err.chain.claimFailed': 'La red incluyó la afirmación, pero no se completó ({status}).',
  'app.err.chain.noSlot': 'No se encontró un lugar libre para la licencia. No se envió nada.',
  'app.err.chain.notSendersRecord':
    'Este enlace nombra un registro que no es del remitente. No se envió nada: pídale un enlace nuevo.',
  'app.err.chain.pow': 'No se pudo terminar la prueba de trabajo.',
  'app.err.chain.notToSponsor': 'No se envió nada al servicio de comisiones.',
  'app.err.chain.proverStart': 'El generador de pruebas no pudo iniciarse en este navegador: {reason}',
  'app.err.chain.proverSlow':
    'El generador de pruebas no se inició a tiempo. Inténtelo de nuevo, o en una computadora portátil.',
  'app.err.chain.noRecordKeys': 'Este navegador no tiene las claves del registro.',
  'app.err.chain.pairingNotSaved':
    'Este navegador no pudo guardar el número aleatorio del emparejamiento, así que no se envió nada.',
  'app.err.chain.noIdentity': 'Este registro todavía no tiene una identidad en la cadena.',
  'app.err.chain.notTx': 'Eso no es un id de transacción.',
  'app.err.chain.badRandom': 'El generador aleatorio devolvió un valor inservible.',
  'app.err.chain.noIdentityToCheck': 'Este registro no tiene una identidad en la cadena para comprobar.',
  'app.err.chain.notOurChallenge': 'Esta página no creó ese desafío. Cree uno nuevo y envíelo.',
  'app.err.chain.challengeUsed': 'Ese desafío ya se respondió una vez. Cree uno nuevo.',
  'app.err.chain.notOurRequest': 'Esta página no creó ese desafío. Haga una solicitud nueva.',
  'app.err.chain.requestUsed': 'Ese desafío ya se respondió una vez. Haga una solicitud nueva.',
  'app.err.chain.noRecordKey': 'No hay una clave de registro con la cual comprobarlo.',
  'app.err.chain.indexerUnreachable':
    'no se pudo conectar con el indexador de la red Midnight; inténtelo de nuevo en unos minutos',
  'app.err.chain.stateUnreadable': 'no se pudo leer el estado actual del contrato; inténtelo de nuevo en unos minutos',

  'app.err.claims.noNumbers': 'Este documento no tiene números sellados.',
  'app.err.claims.noSchema': 'No hay un esquema publicado {schema}.',
  'app.err.claims.otherSchema': 'El esquema de este sitio no es con el que se sellaron los números.',
  'app.err.claims.notOnCertificate': 'Ese número no estaba en el certificado cuando se selló.',
  'app.err.claims.boundNotMet': 'El número sellado no cumple ese límite, así que no se puede probar.',
  'app.err.claims.sigOtherRecord': 'Esa firma es de otro registro.',
  'app.err.claims.sigNoCheck': 'Esa firma no se puede confirmar: no se hizo para este registro con esa clave.',
  'app.err.claims.tooMany': 'Demasiadas afirmaciones para un solo enlace.',
  'app.err.claims.onePerNumber': 'Una afirmación por número en cada enlace.',
  'app.err.claims.sameRecord': 'Las afirmaciones de un enlace deben ser del mismo registro, formulario y contrato.',
  'app.err.claims.provingOff':
    'Las pruebas están desactivadas para este registro hasta que las active en su página. No se envió nada.',
  'app.err.claims.confirmPublish':
    'Para publicar el número en sí, primero necesitamos su confirmación. No se envió nada.',
  'app.err.claims.notOffered': 'Esa afirmación no se ofrece para este tipo de resultado. No se envió nada.',
  'app.err.claims.slotNotNumber': 'La posición {slot} no es un número en {schema}.',
  'app.err.claims.noLabSignature': 'El enlace no nombra ninguna firma de laboratorio.',
  'app.err.claims.txNotLabSignature': 'Esa transacción no es una firma de laboratorio.',
  'app.err.claims.labSigOtherRecord': 'Esa firma de laboratorio es de otro registro.',
  'app.err.claims.otherKey': 'Ese registro se firmó con otra clave.',
  'app.err.claims.unknownSchema': 'El enlace nombra un esquema que este sitio no publica.',
  'app.err.claims.otherKind': 'Esa transacción hizo otro tipo de afirmación.',
  'app.err.claims.otherRecord': 'Esa afirmación es sobre otro registro.',
  'app.err.claims.otherSchemaClaim': 'Esa afirmación se hizo con otro esquema.',
  'app.err.claims.otherNumber': 'Esa afirmación es sobre otro número.',
  'app.err.claims.otherBound': 'Esa afirmación probó otro límite.',
  'app.err.claims.notANumber': 'Esa afirmación publicó algo que no es un número.',
  'app.err.claims.otherValue': 'Esa afirmación publicó otro valor.',
  'app.err.claims.noContract': 'Este sitio no puede leer afirmaciones: no hay un contrato de afirmaciones configurado.',
  'app.err.claims.notOurContract': 'El enlace nombra un contrato de afirmaciones que no es el de VeilCore en esta red.',

  'app.err.lab.notRequest': 'Ese archivo no es una solicitud de firma de laboratorio.',
  'app.err.lab.noForm': 'La solicitud usa números para los que este sitio no publica un formulario.',
  'app.err.lab.notInForm':
    'Los números de la solicitud no están en el formulario que nombra. No la firme; pídala de nuevo.',
  'app.err.lab.cantCheck': 'No se puede comprobar la solicitud: {reason}',
  'app.err.lab.notDocument': 'no es un registro de documento.',
  'app.err.lab.rootMismatch': 'sus números no dan la raíz que se selló.',
  'app.err.lab.notRecord': 'Los números de la solicitud no dan el registro que nombra. No la firme; pídala de nuevo.',
  'app.err.lab.notKey': 'Esa no es una clave de firma de laboratorio.',
  'app.err.lab.notSignature': 'Ese archivo no es una firma de laboratorio.',
  'app.err.lab.sigKeyNotLab': 'La clave de esa firma no es una clave de firma de laboratorio.',
  'app.err.lab.numbersUnreadable': 'No se pueden leer los números de este informe.',
  'app.err.lab.numbersTooLarge': 'Los números son demasiado grandes para enviarlos.',
  'app.err.lab.noLock': 'El código de laboratorio no tiene un cifrado para informes de laboratorio.',
  'app.err.lab.notLockedHere': 'Este informe de laboratorio no se cifró para esta planta, o el archivo está dañado.',
  'app.err.lab.signatureDamaged': 'La firma de laboratorio de ese archivo está dañada. No se cambió nada.',
  'app.err.lab.keyExists':
    'Ya hay una clave de laboratorio en este navegador. Vuelva a publicarla o descargue su copia de seguridad; no se creó una nueva.',

  'app.err.lic.licensorSigns': 'Solo el licenciante firma estas credenciales.',
  'app.err.lic.otherStatement': 'Esa confirmación es de otro estado de cuenta.',
  'app.err.lic.alreadyIssued': 'Ya se emitió en la cadena: cancélela en su lugar.',
  'app.err.lic.notOnChain': 'Esta licencia no está en la cadena.',
  'app.err.lic.noDealMessages': 'Esta licencia todavía no tiene mensajes del acuerdo.',
  'app.err.lic.badKey': 'La clave de la otra parte no se puede usar.',
  'app.err.lic.handOnNotReady': 'La cesión todavía no se puede completar.',
  'app.err.lic.evidenceTooLarge': 'Ese archivo pesa más de 50 MB. Adjunte un informe solo de este período.',
  'app.err.lic.fileEmpty': 'Ese archivo está vacío.',
  'app.err.lic.notIssuedByTx': 'Esa transacción no emitió esta licencia.',
  'app.err.lic.notLiveByTx': 'Esa transacción no puso en vigor esta licencia.',
  'app.err.lend.needWords': 'Una anotación necesita un texto sobre el préstamo.',
  'app.err.lend.needName': 'Indique el nombre que verán los titulares.',
  'app.err.lend.noIdentity': 'No hay una identidad de prestamista en este navegador.',
  'app.err.lend.notRecordKey': 'Esa no es la clave en la cadena de un registro.',
  'app.err.lend.notOwnIdentity': 'Una anotación no puede ser sobre su propia identidad.',
  'app.err.lend.wordsTooLong': 'El texto sobre el préstamo debe tener menos de 200 caracteres.',

  'app.err.rec.importTooLarge': 'Ese archivo pesa más de 20 MB. No se importó nada.',
  'app.err.rec.notExport': 'Ese archivo no es una exportación de registros de VeilCore. No se importó nada.',
  'app.err.rec.notExportShort': 'Ese archivo no es una exportación de registros de VeilCore.',
  'app.err.rec.unreadableEntries':
    'Ese archivo tiene {count} entradas que esta versión no puede leer. No se importó nada.',
  'app.err.rec.deviceOnlyImport':
    '{id}: solo un documento puede guardarse únicamente en este dispositivo. No se importó nada.',
  'app.err.rec.codeMismatch': '{id}: su código de prueba no coincide con sus campos. No se importó nada.',
  'app.err.rec.noNonce':
    '{id}: tiene un código de prueba pero no un nonce, así que no se puede comprobar. No se importó nada.',
  'app.err.rec.exportMismatch':
    '{id}: su código de prueba no coincide con sus campos guardados, así que no se pudo vincular una exportación con lo que guarda el servidor de registros. No se exportó nada.',
  'app.err.rec.fileTooLarge': '{file} pesa más de 200 MB, así que no se leyó. No se envió ni se guardó nada.',
  'app.err.rec.strainCantSeal': 'Este registro de variedad no se puede sellar: {problems}.',
  'app.err.rec.animalCantSeal': 'Este registro de animal no se puede sellar: {problems}.',
  'app.err.rec.docCantSeal': 'Este registro de documento no se puede sellar: {problems}.',
  'app.err.rec.docCantShare': 'Este registro de documento no se puede compartir: {problems}.',
  'app.err.rec.chainTooLarge':
    'Esta cadena es demasiado grande para un solo enlace. Envíe el enlace de cada registro por separado.',
  'app.err.rec.aboutItself': 'Un registro no puede tratar sobre sí mismo.',
  'app.err.keys.notKeysFile': 'Ese no es un archivo de claves de registros de VeilCore.',
  'app.err.keys.damaged': 'Ese archivo está dañado: no se pueden leer las claves que contiene.',
  'app.err.keys.differentKeys': 'Este navegador ya tiene otras claves para ese registro. No se cambió nada.',
  'app.err.keys.noVault': 'Este navegador no tiene una clave de bóveda.',
  'app.err.keys.holderKey': 'Una clave de titular tiene 64 caracteres hexadecimales.',
  'app.err.keys.proofCode': 'Un código de prueba tiene 64 caracteres hexadecimales.',
  'app.err.sheet.noSheet': 'Esa planilla no tiene ninguna hoja.',
  'app.err.sheet.wrongKind':
    'Ese tipo de planilla no se lee aquí. Guárdela como Excel (.xlsx) o CSV y elija ese archivo.',
  'app.err.sheet.notXlsx':
    'Ese archivo no se pudo abrir como archivo de Excel (.xlsx). Guárdelo como .xlsx o CSV e inténtelo de nuevo.',
  'app.err.sheet.tooLarge':
    'Esa planilla es demasiado grande para leerla aquí. Guárdela con menos filas e inténtelo de nuevo.',
  'app.err.sheet.fileTooLarge': 'Ese archivo pesa más de {mb} MB. Importe hasta {rows} filas a la vez.',
} satisfies Partial<AppTranslation>;
