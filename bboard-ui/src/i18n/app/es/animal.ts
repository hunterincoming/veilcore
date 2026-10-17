// Spanish (usted): animal records. DRAFT: machine-assisted, to be checked by a fluent speaker
// before publishing (docs/translations/README.md). Terms as in ./index.ts, plus: animal, padre
// (sire), madre (dam), identificación individual (individual ID), sistema de identificación
// (ID scheme), raza, sexo, rebaño. app.animal.v.<key> is <key> said of an animal (el animal).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const animal = {
  'app.animal.choice.label': '¿Qué va a registrar?',
  'app.animal.choice.plant': 'Una planta',
  'app.animal.choice.animal': 'Un animal',
  'app.animal.title': 'Registre su animal',
  'app.animal.name': 'Nombre del animal',
  'app.animal.namePlaceholder': 'p. ej. Vaca de práctica',
  'app.animal.nameField': 'Nombre del animal',
  'app.animal.individualId': 'Identificación individual',
  'app.animal.individualIdHelp': 'El número de su crotal o de su registro, tal como está escrito.',
  'app.animal.idScheme': 'Sistema de identificación',
  'app.animal.idSchemeHelp': 'A qué numeración pertenece la identificación. Elija una o escriba la suya.',
  'app.animal.scheme.jp': 'Identificación de bovinos de Japón (10 dígitos)',
  'app.animal.scheme.earTag': 'Crotal (arete)',
  'app.animal.scheme.microchip': 'Microchip',
  'app.animal.scheme.herdBook': 'Número del libro genealógico',
  'app.animal.scheme.usda840': 'Crotal USDA 840 / AIN',
  'app.animal.scheme.breedReg': 'N.º de registro de la asociación de raza',
  'app.animal.species': 'Especie',
  'app.animal.speciesPlaceholder': 'p. ej. Bovino (Bos taurus)',
  'app.animal.breed': 'Raza',
  'app.animal.breedPlaceholder': 'p. ej. Negro japonés',
  'app.animal.sex': 'Sexo',
  'app.animal.sex.female': 'Hembra',
  'app.animal.sex.male': 'Macho',
  'app.animal.sex.unknown': 'Sin indicar',
  'app.animal.dob': 'Fecha de nacimiento (su propia nota)',
  'app.animal.dobHelp': 'Déjela vacía si no la sabe. El sello de fecha público viene de la red.',
  'app.animal.breeder': 'Criador o titular',
  'app.animal.breederPlaceholder': 'Su nombre o su granja',
  'app.animal.more': '+ Agregar padre, madre, rebaño, fotos o notas',
  'app.animal.sire': 'Padre',
  'app.animal.dam': 'Madre',
  'app.animal.sireId': 'Identificación individual del padre',
  'app.animal.damId': 'Identificación individual de la madre',
  'app.animal.parentHelp': 'Elija un animal que haya registrado o escriba su nombre.',
  'app.animal.parentHelpNone': 'Escriba su nombre. Los animales que registre aquí se podrán elegir más adelante.',
  'app.animal.linkedId': 'Del registro que eligió.',
  'app.animal.herd': 'Rebaño o granja (opcional)',
  'app.animal.idShort': 'ID',
  'app.animal.need.nameOrId':
    'Solo necesita un nombre o una identificación individual, la especie y el criador o titular.',
  'app.animal.need.scheme': 'Indique a qué sistema de identificación pertenece la identificación individual.',
  'app.animal.need.species': 'Agregue la especie.',
  'app.animal.need.breeder': 'Agregue el criador o titular.',
  'app.animal.unsaved': 'Tiene un animal sin guardar: {name}.',
  'app.animal.k.animal': 'Animal',
  'app.animal.k.speciesBreed': 'Especie y raza',
  'app.animal.k.born': 'Nacimiento (su nota)',
  'app.animal.notStated': 'Sin indicar',
  'app.animal.idIn': '{id} ({scheme})',
  'app.animal.x.sire': 'Padre: {v}',
  'app.animal.x.dam': 'Madre: {v}',
  'app.animal.x.herd': 'Rebaño: {v}',
  'app.animal.f.statedBirth': 'Fecha de nacimiento (declaración del titular)',
  'app.animal.noLicensing': 'Los acuerdos y las regalías aún no están disponibles para registros de animales.',
  'app.animal.tree.sire': 'Padre',
  'app.animal.tree.dam': 'Madre',
  'app.animal.home.yourRecords': 'Sus registros',
  'app.animal.verify.sireLine': 'Padre, según el titular: {v}',
  'app.animal.verify.damLine': 'Madre, según el titular: {v}',
  'app.animal.verify.idLine': 'Identificación individual, según el titular: {id} ({scheme})',
  'app.animal.verify.noId': 'No hay identificación individual registrada.',
  'app.animal.v.app.verify.noParents': 'No hay padre ni madre registrados.',
  'app.animal.v.app.plant.fix.name': 'Nombre del animal',
  'app.animal.v.app.plant.fix.bredBy': 'Criador o titular',
  'app.animal.v.app.verify.namePublished': 'Nombre del animal que el titular muestra: ',
  'app.animal.v.app.verify.nameMatches': 'El nombre del animal coincide con el registro: ',
  'app.animal.v.app.verify.nameUnchecked': 'Nombre del animal dado en este enlace (sin comprobar): ',
  'app.animal.import.dob': 'Fecha de nacimiento',
  'app.animal.import.scheme': 'Sistema de identificación, para cada identificación individual del archivo',
  'app.animal.import.schemeHelp': 'Por ejemplo: identificación de bovinos de Japón (10 dígitos), o crotal.',
  'app.animal.import.species': 'Especie, para las filas que no la indican',
  'app.animal.import.breeder': 'Criador o titular, para las filas que no lo indican',
  'app.animal.import.pickHint':
    'Elija la columna con el nombre o la identificación individual de cada animal, e indique a qué sistema de identificación pertenecen.',

  'app.animal.v.app.log.reportIntro':
    '<b>Opcional.</b> ¿Ya tiene un informe de ADN de este animal? Es lo que vincula su registro con el animal real. Agréguelo ahora y se guardará con el registro. ¿Aún no tiene informe? Omita este paso: la página del animal muestra cómo conseguir uno.',
  'app.animal.v.app.log.sealingPlant': 'Sellando su animal…',
  'app.animal.v.app.log.sealStampsKey':
    'Al sellar también se pone un sello de fecha a la clave de su animal, para que más adelante pueda demostrar que tiene su registro. Solo sale un código de la clave.',
  'app.animal.v.app.log.publicStampLater':
    'Su sello de fecha público llega cuando su lote se fecha en {datedOn}. La página de su animal muestra cuándo ocurrió. No tiene que hacer nada.',
  'app.animal.v.app.log.publicDateLater':
    'Su fecha pública llega cuando su lote se fecha en {datedOn}. La página de su animal la mostrará entonces.',
  'app.animal.v.app.log.keyStampedAt':
    'Clave con sello de fecha: {when}. La clave de su animal también queda fechada, para que más adelante pueda demostrar que tiene su registro.{bound} No salió nada sobre el animal.',
  'app.animal.v.app.log.keyStamped':
    'Clave con sello de fecha. La clave de su animal también queda fechada, para que más adelante pueda demostrar que tiene su registro.{bound} No salió nada sobre el animal.',
  'app.animal.v.app.log.stampingTitle': 'Sellado. Poniendo el sello de fecha a la clave de su animal…',
  'app.animal.v.app.log.onlyFingerprint':
    'Solo sale un código de la clave de su animal, nada sobre el animal. Gratis: VeilCore paga la tarifa de la red.',
  'app.animal.v.app.log.stampingAria': 'Poniendo el sello de fecha a la clave de su animal',
  'app.animal.v.app.log.keepOpen':
    'Mantenga esta pantalla abierta, alrededor de un minuto. Si se cierra, no se pierde nada: su animal está guardado y su página le ofrecerá el sello de fecha de nuevo.',
  'app.animal.v.app.chain.stampMayHaveGoneOut':
    'Puede que su sello de fecha ya se haya enviado{tx}. Su animal está guardado. No lo intente de nuevo hasta que esa transacción se haya comprobado en la red.',
  'app.animal.v.app.chain.stampUnreachable':
    'No se pudo conectar con la red. Su animal está guardado. Inténtelo de nuevo {when} o haga el sello de fecha más tarde.',
  'app.animal.v.app.chain.stampDidntGoThrough':
    'El sello de fecha no se completó. Su animal está guardado. Inténtelo de nuevo {when} o haga el sello de fecha más tarde.',
  'app.animal.v.app.pair.noPlant': 'No se encontró el animal donde guardarlo.',
  'app.animal.v.app.pair.savedTitle': 'Informe de ADN guardado en este animal',
  'app.animal.v.app.pair.noLabMatch':
    'Ninguna firma de laboratorio de este animal coincide con este archivo, así que sigue siendo su propia declaración.',
  'app.animal.v.app.pair.saved':
    'Guardado. El código de su informe de ADN se guarda con el registro de este animal, como su declaración de que este informe le corresponde. No es una comprobación de la genética. {dated}',
  'app.animal.v.app.pair.title': 'Guarde su informe de ADN en este animal',
  'app.animal.v.app.pair.intro':
    '¿Ya le devolvieron su informe de ADN? Guárdelo en este animal. Es lo que vincula su registro con el animal real: más adelante se puede comparar con él una prueba nueva.',
  'app.animal.v.app.pair.savingTo': 'Guardando en: <b>{name}</b> · criador o titular {by}',
  'app.animal.v.app.pair.replaces':
    '<b>Este animal ya tiene un informe de ADN guardado: “{name}”{saved}.</b> Guardar este lo reemplaza. La página de su animal, su certificado y los enlaces que comparta mostrarán el nuevo, no el anterior. No se borra nada de su dispositivo.',
  'app.animal.v.app.pair.replacesChain':
    '<b>Este animal ya tiene un informe de ADN guardado: “{name}”{saved}.</b> Guardar este lo reemplaza. La página de su animal, su certificado y los enlaces que comparta mostrarán el nuevo, no el anterior. No se borra nada de su dispositivo. Si fechó el vínculo anterior en la red, esa fecha se queda allí.',
  'app.animal.v.app.pair.chain.stampFirst':
    'Ponga primero el sello de fecha de su animal (desde su página) si también quiere fechar este informe en la red.',
  'app.animal.v.app.plant.notHereText':
    'Si lo selló en otro navegador, guarde allí una copia de seguridad y ábrala aquí (Recuperar sus registros). Si es el registro de otra persona, abra el enlace de verificación que le dio.',
  'app.animal.v.app.plant.bredByName': 'Criador o titular: {name}',
  'app.animal.v.app.plant.action.saveReport': 'Guardar un informe de ADN en este animal',
  'app.animal.v.app.plant.f.reportSaved': 'guardado en este animal ({file}) · código del vínculo {fp}{sha}',
  'app.animal.v.app.plant.backToPlant': 'Volver al animal',
  'app.animal.v.app.plant.tie.tied': 'Vinculado al animal',
  'app.animal.v.app.plant.tie.notYet': 'Aún no vinculado al animal',
  'app.animal.v.app.plant.tie.notNow': 'Ya no vinculado al animal',
  'app.animal.v.app.plant.tie.openedNotSaved': 'hay un informe de laboratorio abierto, sin guardar en este animal',
  'app.animal.v.app.plant.tie.sentence': 'Vinculado al animal: {what}, {date}.',
  'app.animal.v.app.plant.tie.sentenceNoDate': 'Vinculado al animal: {what}.',
  'app.animal.v.app.plant.tie.sentenceNone': 'Aún no vinculado al animal: {what}.',
  'app.animal.v.app.plant.tie.sentenceNot': 'Ya no vinculado al animal: {what}.',
  'app.animal.v.app.plant.tie.means':
    'Un informe de ADN permite que un laboratorio compare con él una prueba nueva de un animal. Por sí solo no demuestra que un animal coincida.',
  'app.animal.v.app.plant.tie.sub': 'Informe {date}. Un laboratorio puede comparar con él una prueba nueva del animal.',
  'app.animal.v.app.plant.tie.why':
    'Un informe de ADN de su laboratorio es lo que vincula un registro con el animal mismo.',
  'app.animal.v.app.plant.savedToPlant': 'guardado en este animal',
  'app.animal.v.app.plant.openedNotSaved': 'abierto, sin guardar en este animal',
  'app.animal.v.app.plant.keyStampLine':
    'Sello de fecha de la clave: {when}. La clave de su animal también está fechada, así que más adelante puede demostrar que tiene su registro.',
  'app.animal.v.app.plant.next.backup.why':
    'Por ahora, las claves de este animal están solo en este dispositivo. Si se rompe o se borra el navegador, nadie podrá demostrar que usted tiene su registro. Guardarlas toma un minuto.',
  'app.animal.v.app.plant.next.corrected.why':
    'El laboratorio reemplazó el informe de ADN guardado en este animal. Hasta que guarde el corregido, la página de su animal, el certificado y los enlaces dicen que el guardado fue reemplazado.',
  'app.animal.v.app.plant.next.labWithdrew.whyNewer':
    'Sigue guardado en este animal, y su certificado y sus enlaces dicen que fue retirado. Hay un informe de laboratorio más reciente: ábralo y guárdelo en su lugar.',
  'app.animal.v.app.plant.next.labWithdrew.why':
    'Sigue guardado en este animal, y su certificado y sus enlaces dicen que fue retirado. Pida uno nuevo al laboratorio.',
  'app.animal.v.app.plant.next.open.why':
    'Está bloqueado para que solo usted pueda abrirlo, con la clave de este animal. Al abrirlo se comprueba aquí la firma del laboratorio.',
  'app.animal.v.app.plant.next.sample.whySaved':
    'Guardó un informe de ADN en este animal, y eso es su propia declaración. Que un laboratorio firme que recibió una muestra suma una segunda parte, lo que es una evidencia más sólida que su declaración sola.',
  'app.animal.v.app.plant.next.sample.why':
    'Por ahora, este registro es su propio relato del animal. Que un laboratorio firme que recibió una muestra y devuelva un informe lo convierte en una evidencia más sólida que su relato.',
  'app.animal.v.app.plant.next.dna.title': 'Obtenga un informe de ADN de este animal',
  'app.animal.v.app.plant.next.dna.why':
    'Un registro fechado muestra que existía una descripción. Un informe de ADN (el perfil genético del animal que hace un laboratorio) es lo que vincula su registro con el animal real. Hay dos formas de conseguirlo:',
  'app.animal.v.app.plant.next.dna.haveText':
    'Guárdelo en este animal. Se lee en su dispositivo; el archivo nunca se sube.',
  'app.animal.v.app.plant.next.date.why':
    'Está guardado en este animal, pero todavía nada lo fecha. Fecharlo muestra que el informe existía en esa fecha, sin mostrarle a nadie los marcadores.',
  'app.animal.v.app.plant.next.save.title': 'Guarde el informe de ADN en este animal',
  'app.animal.v.app.plant.next.save.why':
    'Un laboratorio firmó que recibió una muestra. Cuando llegue su informe de ADN, guárdelo en este animal: eso es lo que vincula su registro con el animal, para poder compararlo con una prueba posterior.',
  'app.animal.v.app.plant.next.save.action': 'Guardarlo en este animal',
  'app.animal.v.app.plant.next.ready.why':
    'Un laboratorio firmó que recibió una muestra, y hay un informe de ADN guardado en este animal. Los acuerdos y las regalías aún no están disponibles para registros de animales.',
  'app.animal.v.app.plant.tree.none': 'Todavía no hay padre ni madre registrados.',
  'app.animal.v.app.plant.anchor.keysNotHere':
    'La clave de este animal no está en este navegador. Recupérela desde su archivo de copia de seguridad: una clave nueva no coincidiría con el registro sellado.',
  'app.animal.v.app.plant.bundle.keyIs':
    '(La clave del registro es el ID público de la clave creada para este animal cuando lo selló. Su parte secreta se queda en su copia de seguridad y nunca va en el paquete.)',
  'app.animal.v.app.plant.bundle.checkedAgainst': 'Se compara con el guardado en este animal antes de incluirlo.',
  'app.animal.v.app.plant.cert.intro':
    'Para sus archivos y su abogado: el registro sellado, una comprobación nueva de que no ha cambiado, si está anclado, si un informe de ADN lo vincula con el animal, y cualquier acuse de recibo de laboratorio. Lleva los detalles del registro, pero no datos genéticos ni archivos de laboratorio. El código QR abre la página pública de comprobación del registro.',
  'app.animal.v.app.plant.att.noReceipt':
    'Ningún laboratorio ha firmado todavía un acuse de recibo para este animal. Un registro que solo usted respalda es una evidencia más débil que uno que firma un laboratorio. Envíe una muestra a un laboratorio: su acuse de recibo se firma con su clave, no con la suya.',
  'app.animal.v.app.verify.field.parent-names': 'Padre y madre (nombres e identificaciones)',
  'app.animal.v.app.verify.alwaysShown':
    'Siempre se muestra: el ID del registro, su código de prueba ({fp}), cuándo lo guardó por primera vez el servidor de registros y lo que esta página pudo comprobar sobre su lote y las atestaciones firmadas (un acuse de recibo de laboratorio, un informe de laboratorio). El nombre del animal, solo cuando el enlace lo lleva (los suyos lo llevan solo si usted lo activa) o usted decide mostrarlo.',
  'app.animal.v.app.verify.ownReceiptTail':
    ' Usted lo ve porque el animal está en este navegador; quien reciba el enlace solo ve la línea de firma de arriba.',
  'app.animal.v.app.prove.openCheckPage': 'Abrir la página de comprobación del animal',
  'app.animal.v.app.prove.doneText':
    'Verán la respuesta en su página. No se envió nada sobre el animal: solo la prueba de que usted tiene su registro.',
  'app.animal.v.app.prove.thePlant': 'el animal',
  'app.animal.v.app.prove.thisPlant': 'este animal',
  'app.animal.v.app.prove.whatSends':
    '<b>Qué se envía:</b> solo la prueba de que usted tiene el registro de este animal, puesta en la red de pruebas. Ni nombre, ni genética, ni nada sobre sus otros registros.',
  'app.animal.v.app.prove.answering':
    'Responder le dice a quien le envió este enlace que usted tiene el registro de este animal.',
  'app.animal.v.app.prove.watch.notWho': 'No muestra quién es esa persona ni quién crió el animal.',
  'app.animal.v.app.prove.watch.holderStatement':
    'Que esta clave corresponda al registro de este animal es, por ahora, la declaración del titular. No muestra quién es esa persona ni quién crió el animal.',
  'app.animal.v.app.prove.watch.stampedYour':
    'La clave de su animal recibió el sello de fecha el {when}. Eso fecha la clave, no el registro.',
  'app.animal.v.app.prove.watch.stampedThisEarlier':
    'La clave de este animal recibió antes un sello de fecha en la red. Eso fecha la clave, no el registro.',
  'app.animal.v.app.prove.own.title': 'Demuestre que tiene la clave de este animal (red de pruebas)',
  'app.animal.v.app.prove.own.stampFirst':
    'Prepare primero la prueba: toque “Preparar la prueba de que lo tiene” en la página del animal. La prueba trata de la identidad del registro del animal en la cadena, que crea ese paso.',
  // The lab report panels, a delivery and the saved report's sentence, for an animal.
  'app.animal.v.app.lab.sentence.none': 'No hay ningún informe de ADN guardado en este animal.',
  'app.animal.v.app.lab.sentence.self':
    'Hay un archivo de informe de ADN guardado en este animal. Ninguna firma de laboratorio coincide con él, así que es la propia declaración del titular.',
  'app.animal.v.app.lab.sentence.replaced':
    'El laboratorio reemplazó{on} el informe de ADN guardado en este animal por uno corregido. {tail}',
  'app.animal.v.app.lab.sentence.withdrawn':
    'El laboratorio retiró{on} el informe de ADN guardado en este animal. {tail}',
  'app.animal.v.app.lab.results.replacedNewer':
    '<b>El laboratorio reemplazó el informe de ADN guardado en este animal.</b> Guarde el corregido: ábralo y toque “Guardarlo en este animal”.',
  'app.animal.v.app.lab.results.replacedNone':
    '<b>El laboratorio reemplazó el informe de ADN guardado en este animal.</b> No hay informe vigente de {lab}: el original fue reemplazado y la corrección retirada.',
  'app.animal.v.app.lab.results.withdrawn':
    '<b>El laboratorio retiró el informe guardado en este animal.</b> Sigue guardado hasta que guarde otro, y su certificado y sus enlaces dicen que fue retirado.',
  'app.animal.v.app.lab.results.withdrawnNewer':
    '<b>El laboratorio retiró el informe guardado en este animal.</b> Sigue guardado hasta que guarde otro, y su certificado y sus enlaces dicen que fue retirado. Hay un informe de laboratorio más reciente: ábralo y guárdelo en este animal.',
  'app.animal.v.app.lab.results.locked':
    'Bloqueados para que solo usted pueda abrirlos, con la clave de este animal de su copia de seguridad. VeilCore los guarda bloqueados y no tiene la clave.',
  'app.animal.v.app.lab.results.noKey':
    'La clave de este animal no está en este dispositivo, así que aquí no se pueden abrir sus informes de laboratorio. Primero <link>recupere sus registros desde su copia de seguridad</link>.',
  'app.animal.v.app.lab.results.whatOthersSee':
    '<b>Lo que otros pueden ver.</b> La firma del laboratorio es pública; el informe no. Cualquiera con un enlace a la página de comprobación de este animal ve que se firmó un informe de laboratorio sobre él, el SHA-256 del archivo del informe y el nombre con el que está registrada la clave del laboratorio: marcado “nombre no comprobado” salvo que el operador de VeilCore lo haya cotejado con un listado público de licencias o acreditaciones. Si guarda el informe en este animal y comparte “Si hay un informe de ADN guardado” en Mostrar a alguien, también ven que el archivo guardado coincide.',
  'app.animal.v.app.lab.results.nothingYet':
    'Nada todavía. Cuando un laboratorio al que envió una muestra de este animal mande un informe de laboratorio, aparecerá aquí.',
  'app.animal.v.app.lab.results.savedHere': ' · guardado en este animal',
  'app.animal.v.app.lab.results.stillSaved': '. Sigue guardado en este animal.',
  'app.animal.v.app.lab.results.replacesSaved':
    'Ya hay un informe de laboratorio guardado en este animal. Guardar este lo reemplaza; lo confirma en la pantalla siguiente.',
  'app.animal.v.app.lab.send.nothingYet':
    'Todavía no cambió nada. La página de su animal muestra “esperando” hasta que ingresen el código, y puede volver a mostrar este código. Lo pegan en el cuadro del Inicio de VeilCore.',
  'app.animal.v.app.lab.send.takenFromHelp': 'La identificación individual del animal, o dónde se tomó la muestra.',
} satisfies Partial<AppTranslation>;
