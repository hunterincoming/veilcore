// Spanish (neutral Latin American, usted). DRAFT: machine-assisted, to be checked by a fluent
// speaker before publishing (docs/translations/README.md). Terms as in ../../es.ts.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const lab = {
  'app.signer.lead.receipt': 'Acuse de recibo firmado por {who}',
  'app.signer.lead.signed': 'Firmado por {who}',
  'app.signer.lead.signedLower': 'firmado por {who}',
  'app.signer.lead.by': 'de {who}',
  'app.signer.certificateNo': ' (certificado {no})',
  'app.signer.licenseNo': ' (licencia {no})',
  'app.signer.matchBefore': 'El operador de VeilCore cotejó este nombre con ',
  'app.signer.matchAfter': '{number} el {date}.',
  'app.signer.disclaimer': 'VeilCore no avala el trabajo del laboratorio.',
  'app.signer.rest': ' {before}{host}{after} {disclaimer}',
  'app.signer.text': '{lead}.{rest}',
  'app.signer.keyNamed': 'una clave llamada “{name}” (nombre no comprobado)',
  'app.signer.keyUnnamed': 'una clave a la que nadie ha puesto nombre',
  'app.lab.saved.lab': 'guardado · coincide con el informe firmado por el laboratorio',
  'app.lab.saved.self': 'guardado · ninguna firma de laboratorio coincide',
  'app.lab.saved.replacedNewer': 'reemplazado por el laboratorio: guarde el corregido',
  'app.lab.saved.replacedNone': 'reemplazado por el laboratorio · no hay informe vigente de {lab}',
  'app.lab.saved.withdrawn': 'retirado por el laboratorio',
  'app.lab.theLab': 'el laboratorio',
  'app.lab.onDay': ' el {date}',
  'app.lab.replacedTail': 'El titular todavía no ha guardado el corregido.',
  'app.lab.withdrawnTail': 'Sigue siendo el archivo guardado aquí; el laboratorio ya no lo respalda.',
  'app.lab.sentence.none': 'No hay ningún informe de ADN guardado en esta planta.',
  'app.lab.sentence.lab':
    'El informe de ADN guardado coincide con un informe de laboratorio {lead}, por su SHA-256 (firma comprobada en este navegador).{rest}',
  'app.lab.sentence.self':
    'Hay un archivo de informe de ADN guardado en esta planta. Ninguna firma de laboratorio coincide con él, así que es la propia declaración del titular.',
  'app.lab.sentence.replaced':
    'El laboratorio reemplazó{on} el informe de ADN guardado en esta planta por uno corregido. {tail}',
  'app.lab.sentence.withdrawn': 'El laboratorio retiró{on} el informe de ADN guardado en esta planta. {tail}',
  'app.lab.custody.sealIntact': 'precinto intacto',
  'app.lab.custody.sealNotIntact': 'precinto no intacto',
  'app.lab.custody.noSeal': 'sin precinto',
  'app.lab.custody.sample': 'Muestra {v}',
  'app.lab.custody.seal': 'precinto {v}',
  'app.lab.custody.takenFromOn': 'tomada de {from} el {on}',
  'app.lab.custody.takenFrom': 'tomada de {from}',
  'app.lab.custody.takenOn': 'tomada el {on}',
  'app.lab.custody.witness': 'testigo {v} (VeilCore no lo comprueba)',
  'app.lab.custody.comma': ', ',
  'app.lab.custody.arrived': 'llegó el {v}',
  'app.lab.custody.condition': 'estado: {v}',
  'app.lab.custody.labNo': 'n.º de laboratorio {v}',
  'app.lab.custody.idDiffers': 'El ID de muestra no coincide: enviado {sent}, recibido {got}',
  'app.lab.custody.sealDiffers': 'El número de precinto no coincide: enviado {sent}, recibido {got}',
  'app.lab.custody.idNotConfirmed': 'ID de muestra no confirmado al llegar (enviado {sent})',
  'app.lab.custody.sealNotConfirmed': 'Número de precinto no confirmado al llegar (enviado {sent})',
  'app.lab.custody.noSealOnArrival': 'Sin precinto al llegar (enviada con el precinto {sent})',
  'app.lab.custody.sealNotIntactOnArrival': 'Precinto no intacto al llegar',
  'app.lab.custody.line': '{v}.',
  'app.lab.custody.sent': 'Enviado: {v}',
  'app.lab.custody.received': 'Recibido: {v}',
  'app.lab.custody.notCovered': 'El acuse de recibo del laboratorio no cubre los detalles de la muestra.',
  'app.lab.custody.changed':
    'El laboratorio cambió los detalles de llegada después de firmar, así que su acuse de recibo no los cubre.',
  'app.lab.custody.bothMatch': 'El ID de muestra y el número de precinto coinciden con lo enviado.',
  'app.lab.custody.idMatches': 'El ID de muestra coincide con lo enviado.',
  'app.lab.custody.sealMatches': 'El número de precinto coincide con lo enviado.',
  'app.lab.custody.noDifference':
    'No hay diferencias entre los detalles de la muestra enviados y los que escribió el laboratorio al recibirla.',
  'app.lab.custody.joinSentences': ' ',
  'app.lab.custody.locked':
    'Los detalles de la muestra están bloqueados y este navegador no tiene su clave. Restaure aquí su archivo de copia de seguridad para verlos.',
  'app.lab.custody.sealedSigned':
    'El acuse de recibo del laboratorio menciona detalles de la muestra. Se guardan bloqueados y VeilCore no tiene la clave, así que esta página no puede comprobarlos; la aplicación del titular sí puede.',
  'app.lab.custody.holderMatch':
    'La aplicación del remitente los comparó: lo que llegó coincide con lo que se envió. Es la palabra del remitente.',
  'app.lab.custody.holderDiffers':
    'La aplicación del remitente los comparó y encontró diferencias en: {fields}. Es la palabra del remitente.',
  'app.lab.custody.holderChanged':
    'La aplicación del remitente los comparó: el laboratorio cambió sus detalles de llegada después de firmar, así que su acuse no los cubre. Es la palabra del remitente.',
  'app.lab.custody.removed':
    'Los detalles de la muestra de este envío se escribieron antes del bloqueo y ya se eliminaron, así que este acuse no se puede comparar con ellos.',
  'app.lab.send.secretNotSaved':
    'La clave de esta planta aún no está guardada en VeilCore, así que no se creó ningún código de laboratorio: {error}. Los informes de laboratorio se bloquean con esa clave, y primero hay que guardarla con la planta. Inténtelo de nuevo.',
  'app.lab.send.sampleNotSaved':
    'El código de laboratorio funciona, pero los detalles de la muestra no se guardaron: {error}',
  'app.signer.sep': ' ',
  'app.lab.strength.unsigned': 'Sin firmar',
  'app.lab.strength.unsignedWhy':
    'Registrado pero sin firmar. Es una afirmación sobre una segunda parte, no una declaración de ella.',
  'app.lab.strength.invalid': 'La firma no se verifica',
  'app.lab.strength.invalidWhy':
    'No se puede demostrar que esta atestación provenga de la clave que indica. Trátela como no atestiguada.',
  'app.lab.strength.retracted': 'Retractada',
  'app.lab.strength.retractedWhy':
    'Quien la atestiguó la retiró el {date}, con una retractación firmada con su clave. Sigue en el registro: retractar no es borrar.',
  'app.lab.strength.unverifiedRetraction':
    ' El servidor de registros también informa una retractación que no firmó quien atestiguó, así que aquí se ignora.',
  'app.lab.strength.matched': 'Firmado · nombre cotejado con un listado público',
  'app.lab.strength.matchedWhy': '{text} La firma se verificó en este navegador.{acc}{unverified}',
  'app.lab.strength.accreditation': ' Indican una acreditación {scheme} de {by}; confírmela con {by}.',
  'app.lab.strength.expired': ' Una comprobación anterior de este nombre ha vencido.',
  'app.lab.strength.notChecked': 'Firmado · nombre no comprobado',
  'app.lab.strength.anyName':
    '{text}. Cualquiera puede registrar una clave con cualquier nombre, así que esto no muestra quién firmó.{expired}',
  'app.lab.strength.unregistered':
    'Firmado por una clave que nadie ha registrado. La firma es válida; no se sabe quién tiene la clave.',
  'app.lab.field.sampleId': 'ID de muestra',
  'app.lab.field.sealNumber': 'Número de precinto',
  'app.lab.field.takenFrom': 'Tomada de',
  'app.lab.field.takenOn': 'Tomada el',
  'app.lab.field.witness': 'Testigo',
  'app.lab.field.arrivedOn': 'Llegó el',
  'app.lab.field.condition': 'Estado',
  'app.lab.field.labRef': 'N.º de ingreso',
  'app.lab.field.sealIntact': 'Precinto intacto',
  'app.lab.field.noHiddenCondition':
    '{label} no puede contener tabulaciones ni caracteres ocultos (como marcas de dirección).',
  'app.lab.field.noHidden':
    '{label} no puede contener saltos de línea, tabulaciones ni caracteres ocultos (como marcas de dirección).',
  'app.lab.field.realDate': '{label} debe ser una fecha real.',
  'app.lab.field.tooLong': '{label} puede tener como máximo {limit} caracteres.',
  'app.lab.err.noSuch': 'Ningún envío tiene ese código de laboratorio. Compruebe que copió el código completo.',
  'app.lab.err.used': 'Este código de laboratorio ya se usó.',
  'app.lab.err.noMatch': 'Ese código de laboratorio no coincide. Pida al obtentor el código que le dieron.',
  'app.lab.err.tooOld':
    'Este código de laboratorio es demasiado antiguo para usarse. Pida al obtentor que haga uno nuevo.',
  'app.lab.err.gone':
    'El registro del obtentor para este código de laboratorio ya no existe. Pídale que haga un código nuevo.',
  'app.lab.err.changed':
    'El obtentor cambió el registro de esta planta después de hacer el código de laboratorio. Pídale un código nuevo.',
  'app.lab.err.notReceived': 'Nadie ha usado todavía este código de laboratorio.',
  'app.lab.err.onlyLab': 'Solo el laboratorio que usó este código de laboratorio puede hacer eso.',
  'app.lab.err.tooMany':
    'Tiene demasiados códigos de laboratorio que nadie ha usado todavía. Espere a que se usen algunos, o a que los más antiguos venzan.',
  'app.lab.send.ready': 'Listo para enviar',
  'app.lab.send.title': 'Enviar {name}',
  'app.lab.send.give':
    'Dé este código de laboratorio a {handle}. Cuando lo ingrese, podrá firmar que la muestra llegó.',
  'app.lab.send.giveWithResults':
    'Dé este código de laboratorio a {handle}. Cuando lo ingrese, podrá firmar que la muestra llegó y devolver un informe de laboratorio que solo usted puede abrir.',
  'app.lab.send.copied': 'Copiado',
  'app.lab.send.copy': 'Copiar el código',
  'app.lab.send.dontWrite':
    '<b>Envíeselo por mensaje o correo. No lo escriba en el paquete:</b> quien tenga este código de laboratorio puede confirmar el envío.',
  'app.lab.send.labWillCheck': '<b>El laboratorio comprobará:</b> {line}.',
  'app.lab.send.nothingYet':
    'Todavía no cambió nada. La página de su planta muestra “esperando” hasta que ingresen el código, y puede volver a mostrar este código. Lo pegan en el cuadro del Inicio de VeilCore.',
  'app.lab.send.intro':
    'Reciben su propio registro de lo que recibieron, vinculado al suyo. Cuando firman que llegó, se firma con su clave, no con la suya: una segunda parte en su registro.',
  'app.lab.send.who': '¿A quién se lo envía?',
  'app.lab.send.whoHelp': 'Un nombre o alias, para que ambos sepan de qué envío se trata.',
  'app.lab.send.quantity': 'Cantidad (opcional)',
  'app.lab.send.quantityPlaceholder': 'p. ej., 10 esquejes',
  'app.lab.send.note': 'Nota para el laboratorio (opcional)',
  'app.lab.send.noteHelp': 'Solo la ve el laboratorio, una vez que ingresa el código.',
  'app.lab.send.count': '{n} de {max} caracteres.',
  'app.lab.send.sample': 'La muestra (opcional)',
  'app.lab.send.sampleHelp':
    'El laboratorio los comprueba cuando llega y confirma o corrige cada uno. Su acuse de recibo firmado cubre lo que usted escribió y lo que encontró.',
  'app.lab.send.sampleId': 'ID de muestra / etiqueta del tubo o la bolsa',
  'app.lab.send.sealNumber': 'Número de precinto o de bolsa',
  'app.lab.send.takenFromHelp': 'La planta madre o la etiqueta de su ubicación.',
  'app.lab.send.witness': 'Testigo (opcional)',
  'app.lab.send.witnessHelp': 'Quién vio cómo se tomó y se precintó. VeilCore no lo comprueba.',
  'app.lab.send.addSample': 'Agregar la etiqueta y el precinto de la muestra (opcional)',
  'app.lab.send.make': 'Hacer un código para el laboratorio',
  'app.lab.send.shareTitle': 'Código de laboratorio para {name}',
  'app.lab.send.share': 'Compartir',
  'app.lab.send.hide': 'Ocultar',
  'app.lab.send.showAgain': 'Mostrar el código de nuevo',
  'app.lab.send.waiting': '<b>Enviado a {handle}, esperando</b> desde el {date}.',
  'app.lab.send.waitingSample': ' {line}.',
  'app.lab.send.otherBrowser': ' Este código se hizo en otro navegador y no está en este; haga uno nuevo si lo perdió.',
  'app.lab.recv.statement': 'Llegó una muestra etiquetada “{label}”{qty}{code}.',
  'app.lab.recv.unlabelled': 'sin etiqueta',
  'app.lab.recv.statementQty': ' ({qty}, según lo escribió el obtentor)',
  'app.lab.recv.statementCode': ' con el código de laboratorio {code}',
  'app.lab.recv.quoted': '“{v}”',
  'app.lab.recv.breederWrote': '<b>El obtentor escribió:</b> {line}',
  'app.lab.recv.onArrival': '<b>Al llegar:</b> {line}',
  'app.lab.recv.aboutRecord': 'Sobre el registro del obtentor {id}, huella',
  'app.lab.recv.pointing': 'Apunta a su registro recibido',
  'app.lab.recv.signedByKey': 'Firmado con su clave ({name})',
  'app.lab.recv.unnamed': 'sin nombre',
  'app.lab.recv.howArrived': 'Cómo llegó',
  'app.lab.recv.checkTube':
    'Revise el tubo o la bolsa. Cambie lo que no coincida con lo que escribió el obtentor. Todo es opcional.',
  'app.lab.recv.sampleIdOnArrival': 'ID de muestra al llegar',
  'app.lab.recv.sealOnArrival': 'Número de precinto al llegar',
  'app.lab.recv.sealIntactQ': '¿Precinto intacto?',
  'app.lab.recv.yes': 'Sí',
  'app.lab.recv.no': 'No',
  'app.lab.recv.noSeal': 'Sin precinto',
  'app.lab.recv.arrivedHelp': 'El día en que le llegó.',
  'app.lab.recv.conditionPlaceholder': 'p. ej., frío, bolsa seca, raíces intactas',
  'app.lab.recv.accession': 'Su n.º de ingreso',
  'app.lab.recv.accessionHelp': 'Va en su acuse de recibo, así que el obtentor lo ve.',
  'app.lab.recv.differs': 'Distinto de lo que escribió el obtentor. El obtentor ve esto en su acuse de recibo:',
  'app.lab.recv.exactly':
    'Su clave puede firmar un acuse de recibo para este envío. Esto es exactamente lo que dice el acuse:',
  'app.lab.recv.fingerprintFrom':
    'La huella vino del servidor de registros y coincide con lo que informa su página pública para {id}. Si el obtentor le dio una huella, compárela antes de firmar.',
  'app.lab.recv.physically': 'Recibí físicamente este material.',
  'app.lab.recv.dontSign': 'No firmar',
  'app.lab.recv.signWithKey': 'Firmar con mi clave',
  'app.lab.recv.turnAway': '¿Rechazarla? No se firma nada y VeilCore no avisa al obtentor: avísele usted.',
  'app.lab.recv.damaged': 'Llegó dañada',
  'app.lab.recv.wrongSample': 'Es la muestra equivocada',
  'app.lab.recv.rejected': 'Recibida pero rechazada (dañada o muestra equivocada)',
  'app.lab.recv.nothingSigned': '{problems} No se firmó nada',
  'app.lab.recv.askNewCode':
    'Sus datos de llegada no se pueden bloquear para esta entrega: al código le falta su última parte, o los datos de la muestra del remitente nunca llegaron a VeilCore. No se envió ni se firmó nada. Pida al remitente un código nuevo.',
  'app.lab.recv.notSaved': 'sus detalles de llegada no se guardaron ({error}), así que no se firmó nada',
  'app.lab.recv.savedDifferent':
    'los detalles de la muestra volvieron del servidor de registros distintos de los de esta pantalla, así que no se firmó nada. Recargue la página y vuelva a revisarlos',
  'app.lab.recv.unlinked':
    'Su acuse de recibo está firmado, pero no se pudo vincular a este envío ({error}), así que el obtentor todavía no puede verlo. Inténtelo de nuevo, o vincúlelo más tarde desde la página de la planta.',
  'app.lab.recv.linkIntro':
    'Su acuse de recibo está firmado. Vincúlelo a este envío para que el obtentor lo vea: hasta entonces su página no lo cuenta, porque cualquiera puede firmar una declaración sobre una planta, pero solo quien usó el código de laboratorio puede vincular una al envío.',
  'app.lab.recv.linking': 'Vinculando…',
  'app.lab.recv.setUpFirst':
    'Configure primero la firma de su laboratorio; después podrá firmar que esta muestra llegó.',
  'app.lab.recv.checking': 'Comprobando el registro del obtentor…',
  'app.lab.recv.notRecorded': 'Su acuse de recibo no se registró: {error}.',
  'app.lab.recv.noCodeHere': 'esta planta no tiene código de laboratorio en este dispositivo',
  'app.lab.recv.receivedNotRecorded':
    'Envío recibido, pero su acuse de recibo firmado no se registró: {error}. Puede firmarlo más tarde desde la página de la planta.',
  'app.lab.recv.title': 'Recibir material',
  'app.lab.recv.signTitle': '¿Firmar lo que recibió?',
  'app.lab.recv.intro':
    'Ingrese el código de laboratorio que le dio el obtentor. Obtiene su propio registro de lo que recibió, vinculado al suyo, y el servidor de registros anota que alguien con este código recibió el envío. Si tiene una clave de firma, ve exactamente lo que firmaría antes de firmar nada.',
  'app.lab.recv.codeLabel': 'Código de laboratorio',
  'app.lab.recv.missingLock':
    'A este código le falta la última parte; puede recibir la muestra, pero no podrá devolver un informe hasta tener el código completo.',
  'app.lab.recv.refused': 'El envío está recibido y su registro creado. {reason}',
  'app.lab.recv.onlyConfirm':
    'Confirme solo lo que realmente recibió. Es una declaración en la que otras personas confiarán.',
  'app.lab.recv.receiveIt': 'Recibirlo',
  'app.lab.recv.goToRecord': 'Ir al registro',
  'app.lab.key.role.laboratory': 'Laboratorio',
  'app.lab.key.role.inspector': 'Inspector',
  'app.lab.key.role.registry': 'Registro',
  'app.lab.key.role.breeder': 'Obtentor',
  'app.lab.key.role.other': 'Otro',
  'app.lab.key.couldNotCreate': 'No se pudo crear una clave.',
  'app.lab.key.notPublished':
    'Su clave está guardada en este navegador pero no se publicó: {error}. Inténtelo de nuevo.',
  'app.lab.key.yours': 'Su clave de firma',
  'app.lab.key.setUp': 'Configure su clave de firma',
  'app.lab.key.notPublishedYet':
    ' · todavía no publicada: hasta que lo esté, nadie puede relacionar sus firmas con este nombre.',
  'app.lab.key.publishAgain': 'Publicar de nuevo',
  'app.lab.key.publicKey': 'Clave pública',
  'app.lab.key.privateWarning':
    'Su clave privada se guarda en el almacenamiento de este navegador, sin cifrar, y en ningún otro lugar. Para probar está bien. Cualquier cosa que pueda ejecutarse en este sitio, o una extensión del navegador con acceso a él, podría leerla. Si la pierde, no podrá firmar nada nuevo; lo que firmó antes sigue siendo válido, así que guarde una copia en un lugar seguro. Un laboratorio que la use de verdad firmaría dentro de sus propios sistemas: consulte la <link>guía de integración</link>.',
  'app.lab.key.downloadBackup': 'Descargar la copia de seguridad de la clave',
  'app.lab.key.intro':
    'Cuando confirma que recibió material, o firma un informe, se firma con una clave que solo usted tiene. Se convierte en su declaración, no en algo que registramos en su nombre. La clave se crea en este navegador; solo se publican su mitad pública, su nombre y la acreditación que indique.',
  'app.lab.key.name': 'Nombre',
  'app.lab.key.nameHelp': 'Cómo lo ve cualquiera que compruebe un registro que usted firmó.',
  'app.lab.key.role': 'Función',
  'app.lab.key.accreditation': 'Acreditación (opcional)',
  'app.lab.key.accreditationHelp':
    'La registramos y nunca la verificamos. Quien compruebe su firma puede confirmarla directamente con el organismo acreditador; por eso lo nombra.',
  'app.lab.key.scheme': 'Esquema',
  'app.lab.key.stateLicense': 'Licencia estatal',
  'app.lab.key.accNumber': 'Número de acreditación',
  'app.lab.key.accreditor': 'Organismo acreditador',
  'app.lab.key.accreditorPlaceholder': 'p. ej., A2LA, PJLA, organismo estatal',
  'app.lab.key.create': 'Crear mi clave',
  'app.lab.results.replacedNewer':
    '<b>El laboratorio reemplazó el informe de ADN guardado en esta planta.</b> Guarde el corregido: ábralo y toque “Guardarlo en esta planta”.',
  'app.lab.results.replacedNone':
    '<b>El laboratorio reemplazó el informe de ADN guardado en esta planta.</b> No hay informe vigente de {lab}: el original fue reemplazado y la corrección retirada.',
  'app.lab.results.withdrawn':
    '<b>El laboratorio retiró el informe guardado en esta planta.</b> Sigue guardado hasta que guarde otro, y su certificado y sus enlaces dicen que fue retirado.',
  'app.lab.results.withdrawnNewer':
    '<b>El laboratorio retiró el informe guardado en esta planta.</b> Sigue guardado hasta que guarde otro, y su certificado y sus enlaces dicen que fue retirado. Hay un informe de laboratorio más reciente: ábralo y guárdelo en esta planta.',
  'app.lab.results.unsigned':
    'Ninguna firma de laboratorio coincide exactamente con este archivo. Se abrió con su clave, pero no lo trate como el informe del laboratorio hasta que lo firme.',
  'app.lab.results.noReceipt':
    '<b>Firmado por {who}, pero el laboratorio no ha firmado un acuse de recibo para este envío.</b> El archivo coincide con la firma de esa clave, pero nada muestra que esa clave haya tenido su muestra. Consulte al laboratorio antes de confiar en él.',
  'app.lab.results.otherKey':
    '<b>Firmado por {who}, pero no por la clave que firmó el acuse de recibo de este envío.</b> El archivo coincide con la firma de esa clave, pero nada muestra que esa clave haya tenido su muestra. Consulte al laboratorio antes de confiar en él.',
  'app.lab.results.signed':
    '<b>{lead}</b> (clave {key}), firma comprobada en este navegador. La misma clave firmó el acuse de recibo de este envío.',
  'app.lab.results.anyName':
    ' Cualquiera puede registrar una clave con cualquier nombre, así que el nombre no muestra quién firmó.',
  'app.lab.results.locked':
    'Bloqueados para que solo usted pueda abrirlos, con la clave de esta planta de su copia de seguridad. VeilCore los guarda bloqueados y no tiene la clave.',
  'app.lab.results.noKey':
    'La clave de esta planta no está en este dispositivo, así que aquí no se pueden abrir sus informes de laboratorio. Primero <link>recupere sus plantas desde su copia de seguridad</link>.',
  'app.lab.results.gotIt': 'Entendido',
  'app.lab.results.whatOthersSee':
    '<b>Lo que otros pueden ver.</b> La firma del laboratorio es pública; el informe no. Cualquiera con un enlace a la página de comprobación de esta planta ve que se firmó un informe de laboratorio sobre ella, el SHA-256 del archivo del informe y el nombre con el que está registrada la clave del laboratorio: marcado “nombre no comprobado” salvo que el operador de VeilCore lo haya cotejado con un listado público de licencias o acreditaciones. Si guarda el informe en esta planta y comparte “Si hay un informe de ADN guardado” en Mostrar a alguien, también ven que el archivo guardado coincide.',
  'app.lab.results.noCurrent': 'No hay informe vigente de {lab}: el original fue reemplazado y la corrección retirada.',
  'app.lab.results.looking': 'Buscando informes de laboratorio…',
  'app.lab.results.nothingYet':
    'Nada todavía. Cuando un laboratorio al que envió esta planta mande un informe de laboratorio, aparecerá aquí.',
  'app.lab.results.from': 'De {lab} · {id}',
  'app.lab.results.sent': 'Enviado {when}',
  'app.lab.results.corrects': ' · corrige {id}',
  'app.lab.results.savedHere': ' · guardado en esta planta',
  'app.lab.results.withdrawnOn': 'Retirado por el laboratorio el {date}',
  'app.lab.results.stillSaved': '. Sigue guardado en esta planta.',
  'app.lab.results.replacedByNewer': 'Reemplazado por un informe de laboratorio más reciente',
  'app.lab.results.opening': 'Abriendo…',
  'app.lab.results.fileLine': '{type} · SHA-256 del archivo {sha} · se descarga como “{name}”',
  'app.lab.results.download': 'Descargar el archivo',
  'app.lab.results.replacesSaved':
    'Ya hay un informe de laboratorio guardado en esta planta. Guardar este lo reemplaza; lo confirma en la pantalla siguiente.',
  'app.lab.facts.title': 'Qué llegó con ella',
  'app.lab.facts.labelled': 'Etiquetada “{name}”, obtenida por {by}',
  'app.lab.facts.unknown': 'desconocido',
  'app.lab.facts.code': ' · código de laboratorio {code}',
  'app.lab.facts.arrived': ' · llegó el {date}',
  'app.lab.facts.quantity': '<b>Cantidad, según la escribió el obtentor:</b> {qty}',
  'app.lab.facts.notGiven': 'no indicada',
  'app.lab.facts.note': '<b>Nota del obtentor:</b> {note}',
  'app.lab.facts.none': 'ninguna',
  'app.lab.facts.onArrival': '<b>Al llegar (su acuse de recibo):</b> {line}',
  'app.lab.facts.ref': 'Su referencia / n.º de ingreso',
  'app.lab.facts.refHelp': 'Solo usted lo ve. La búsqueda en Inicio lo encuentra.',
  'app.lab.facts.save': 'Guardar',
  'app.lab.out.couldntLoad': 'No se pudo cargar lo que envió: {error}.',
  'app.lab.out.offHere':
    'En esta red todavía no se pueden devolver informes de laboratorio a través de VeilCore. Envíelo al obtentor como lo hace normalmente.',
  'app.lab.out.noDelivery':
    'Esta planta no llegó en un envío, así que no hay a quién devolver un informe de laboratorio.',
  'app.lab.out.otherDelivery': 'Ese código de laboratorio es de otro envío.',
  'app.lab.out.noLock':
    'Ese código de laboratorio no tiene candado. Pida al obtentor que lo envíe de nuevo desde la aplicación.',
  'app.lab.out.tooBig': 'Ese archivo supera los 14 MB.',
  'app.lab.out.withdrawFailed': 'No se retiró nada: no se pudo retirar su firma ({error}).',
  'app.lab.out.fileStillThere':
    'Su firma está retirada, pero el archivo sigue en el servidor de registros ({error}). Toque Retirar de nuevo.',
  'app.lab.out.withdrawnNote': 'Retirado. El obtentor ve que usted lo retiró y ya no puede abrirlo.{extra}',
  'app.lab.out.spaced': ' {v}',
  'app.lab.out.correctionWarning':
    'El original sigue reemplazado. El obtentor no tendrá un informe vigente de usted hasta que envíe uno.',
  'app.lab.out.couldntCheck': 'No se firmó nada: no se pudo comprobar lo que ya envió ({error}).',
  'app.lab.out.notConfirmed':
    'No se pudo confirmar el registro del obtentor en el servidor de registros público, así que no se firmó nada.',
  'app.lab.out.notRecorded': 'No se envió nada: su firma no se registró ({error}).',
  'app.lab.out.noAnswer': 'sin respuesta',
  'app.lab.out.didntSendUndoFailed':
    'El archivo no se envió ({error}), y retirar su firma también falló ({undo}). Intente enviarlo de nuevo; si sigue fallando, retírela desde la página de su clave de firma.',
  'app.lab.out.didntSend':
    'El archivo no se envió ({error}). Su firma se retiró, así que nada apunta a un archivo que el obtentor nunca recibió. Inténtelo de nuevo.',
  'app.lab.out.oldSigLeft': 'su firma no se pudo retirar ({error})',
  'app.lab.out.oldFileLeft': 'su archivo sigue en el servidor de registros ({error})',
  'app.lab.out.oldLeft':
    'El archivo corregido se envió, pero el anterior no está retirado por completo: {left}. Retire el anterior desde esta página.',
  'app.lab.out.andJoin': ', y ',
  'app.lab.out.sent': 'Enviado',
  'app.lab.out.sentText':
    'Solo el obtentor puede abrirlo. Su firma es pública, el informe no: cualquiera con un enlace a la página de comprobación de esta planta ve que se firmó un informe de laboratorio sobre ella, y su SHA-256 ({sha}).',
  'app.lab.out.sentName':
    'También ven el nombre con el que está registrada su clave. Hasta que el operador de VeilCore lo coteje con un listado público de licencias o acreditaciones, aparece como “una clave llamada “{name}” (nombre no comprobado)”.',
  'app.lab.out.yourLab': 'su laboratorio',
  'app.lab.out.youSent': 'Informes de laboratorio que envió',
  'app.lab.out.rowHead': '{id} · enviado {when}',
  'app.lab.out.withdrawing': 'Retirando…',
  'app.lab.out.yesWithdraw': 'Sí, retirarlo',
  'app.lab.out.keepIt': 'Conservarlo',
  'app.lab.out.withdraw': 'Retirar',
  'app.lab.out.sendCorrected': 'Enviar un archivo corregido',
  'app.lab.out.confirmText':
    'Su firma se retira (queda en el registro como retirada) y el archivo se borra. El obtentor ve “Retirado por el laboratorio”.',
  'app.lab.out.replacesIntro':
    'Reemplaza a {id}, el informe de laboratorio que envió {when}. El anterior se retira: su archivo se elimina y su firma queda marcada como reemplazada.',
  'app.lab.out.intro':
    'Su navegador firma la huella del informe con la clave de su laboratorio y bloquea el archivo para que solo el obtentor pueda abrirlo. El archivo bloqueado espera en el servidor de VeilCore a que el obtentor lo abra, y VeilCore no tiene su clave.',
  'app.lab.out.cancelCorrection': 'Cancelar la corrección',
  'app.lab.out.turnedAway': 'Usted rechazó esta muestra, así que no hay informe de laboratorio que enviar.',
  'app.lab.out.setUpFirst':
    'Configure primero la firma de su laboratorio, para que el obtentor sepa que el informe es suyo.',
  'app.lab.out.noLockHere':
    'Este navegador no tiene el candado del obtentor para este envío. Pegue el código de laboratorio que le enviaron.',
  'app.lab.out.useCode': 'Usar este código de laboratorio',
  'app.lab.out.notSignedReceipt':
    'No ha firmado que esta muestra llegó. Hasta que lo haga, el obtentor ve su informe como firmado por una clave que no confirmó haber recibido la muestra.',
  'app.lab.out.notLinked':
    'Su acuse de recibo está firmado pero todavía no vinculado a este envío, así que el obtentor no puede verlo.',
  'app.lab.out.fileFp': '{size} · huella {fp}',
  'app.lab.out.differentFile': 'Elegir otro archivo',
  'app.lab.out.chooseCorrected': 'Elegir el archivo corregido',
  'app.lab.out.chooseReport': 'Elegir el informe',
  'app.lab.out.signing': 'Firmando y bloqueando…',
  'app.lab.out.signLockSend': 'Firmar, bloquear y enviar',
  'app.lab.out.alreadyGone': 'El informe de laboratorio que está corrigiendo ya fue retirado o reemplazado.',
  'app.lab.out.sameFile': 'Ya envió exactamente este archivo en este envío. No se firmó nada.',
  'app.lab.out.cap':
    'Este envío ya tiene {cap} informes de laboratorio, el máximo que admite. Retire uno primero. No se firmó nada.',
  'app.lab.out.rowsCap':
    'Este envío ya tuvo todos los informes de laboratorio que admite, incluidos los retirados. Pida al obtentor un código de laboratorio nuevo. No se firmó nada.',
  'app.lab.out.rowReplaced': 'Reemplazado por su archivo corregido.',
  'app.lab.out.rowWithdrawn': 'Retirado el {date}.',
  'app.lab.out.rowSigned': 'Firmado con su clave · huella {fp}',
  'app.lab.out.rowRetracted':
    'Su firma está retirada, pero el archivo sigue en el servidor de registros. Retírelo para terminar.',
  'app.lab.out.rowNotSigned': 'No firmado con la clave de este navegador.',
  'app.lab.card.unknownBreeder': 'Obtentor desconocido',
  'app.lab.card.received': 'recibida el {date}',
  'app.lab.card.turnedAway': 'rechazada',
  'app.lab.card.signed': 'acuse de recibo firmado ✓',
  'app.lab.card.notSigned': 'acuse de recibo todavía sin firmar',
  'app.lab.card.ref': 'ref. {ref}',
  'app.lab.send.theLab': 'el laboratorio',
  // LabResults.tsx: a lock this browser can’t vouch for (round 3, P1)
  'app.lab.out.pasteAgain':
    'El candado para informes de laboratorio de este registro no se puede comprobar con el código de laboratorio, así que no se envía nada con él. Pegue de nuevo el código de laboratorio.',
} satisfies Partial<AppTranslation>;
