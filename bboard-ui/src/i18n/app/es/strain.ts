// A strain or line record's sentences: each is this language's plant sentence for the same key,
// the plant noun replaced by one of the same gender (de Linie, es cepa, fr souche, ja 系統).
// DRAFT: to be checked by a fluent speaker before publishing (docs/translations/README.md).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const strain = {
  'app.strain.v.app.verify.noParents': 'No hay padres registrados.',
  'app.strain.v.app.plant.fix.name': 'Nombre de la cepa',
  'app.strain.v.app.plant.fix.bredBy': 'Obtenida o aislada por',
  'app.strain.v.app.verify.namePublished': 'Nombre que el titular muestra: ',
  'app.strain.v.app.verify.nameMatches': 'El nombre coincide con el registro: ',
  'app.strain.v.app.verify.nameUnchecked': 'Nombre dado en este enlace (sin comprobar): ',
  'app.strain.v.app.log.reportIntro':
    '<b>Opcional.</b> ¿Ya tiene un informe de ADN de esta cepa? Es lo que vincula su registro con la cepa real. Agréguelo ahora y se guardará con el registro. ¿Aún no tiene informe? Omita este paso: la página de la cepa muestra cómo conseguir uno.',
  'app.strain.v.app.log.sealingPlant': 'Sellando su cepa…',
  'app.strain.v.app.log.sealStampsKey':
    'Al sellar también se pone un sello de fecha a la clave de su cepa, para que más adelante pueda demostrar que la tiene. Solo sale un código de la clave.',
  'app.strain.v.app.log.publicStampLater':
    'Su sello de fecha público llega cuando su lote se fecha en {datedOn}. La página de su cepa muestra cuándo ocurrió. No tiene que hacer nada.',
  'app.strain.v.app.log.publicDateLater':
    'Su fecha pública llega cuando su lote se fecha en {datedOn}. La página de su cepa la mostrará entonces.',
  'app.strain.v.app.log.keyStampedAt':
    'Clave con sello de fecha: {when}. La clave de su cepa también queda fechada, para que más adelante pueda demostrar que la tiene.{bound} No salió nada sobre la cepa.',
  'app.strain.v.app.log.keyStamped':
    'Clave con sello de fecha. La clave de su cepa también queda fechada, para que más adelante pueda demostrar que la tiene.{bound} No salió nada sobre la cepa.',
  'app.strain.v.app.log.stampingTitle': 'Sellada. Poniendo el sello de fecha a la clave de su cepa…',
  'app.strain.v.app.log.onlyFingerprint':
    'Solo sale un código de la clave de su cepa, nada sobre la cepa. Gratis: VeilCore paga la tarifa de la red.',
  'app.strain.v.app.log.stampingAria': 'Poniendo el sello de fecha a la clave de su cepa',
  'app.strain.v.app.log.keepOpen':
    'Mantenga esta pantalla abierta, alrededor de un minuto. Si se cierra, no se pierde nada: su cepa está guardada y su página le ofrecerá el sello de fecha de nuevo.',
  'app.strain.v.app.chain.stampMayHaveGoneOut':
    'Puede que su sello de fecha ya se haya enviado{tx}. Su cepa está guardada. No lo intente de nuevo hasta que esa transacción se haya comprobado en la red.',
  'app.strain.v.app.chain.stampUnreachable':
    'No se pudo conectar con la red. Su cepa está guardada. Inténtelo de nuevo {when} o haga el sello de fecha más tarde.',
  'app.strain.v.app.chain.stampDidntGoThrough':
    'El sello de fecha no se completó. Su cepa está guardada. Inténtelo de nuevo {when} o haga el sello de fecha más tarde.',
  'app.strain.v.app.pair.noPlant': 'No se encontró la cepa donde guardarlo.',
  'app.strain.v.app.pair.savedTitle': 'Informe de ADN guardado en esta cepa',
  'app.strain.v.app.pair.noLabMatch':
    'Ninguna firma de laboratorio de esta cepa coincide con este archivo, así que sigue siendo su propia declaración.',
  'app.strain.v.app.pair.saved':
    'Guardado. El código de su informe de ADN se guarda con el registro de esta cepa, como su declaración de que este informe le corresponde. No es una comprobación de la genética. {dated}',
  'app.strain.v.app.pair.title': 'Guarde su informe de ADN en esta cepa',
  'app.strain.v.app.pair.intro':
    '¿Ya le devolvieron su informe de ADN? Guárdelo en esta cepa. Es lo que vincula su registro con la cepa real: más adelante se puede comparar con él una prueba nueva.',
  'app.strain.v.app.pair.savingTo': 'Guardando en: <b>{name}</b> · obtenida por {by}',
  'app.strain.v.app.pair.replaces':
    '<b>Esta cepa ya tiene un informe de ADN guardado: “{name}”{saved}.</b> Guardar este lo reemplaza. La página de su cepa, su certificado y los enlaces que comparta mostrarán el nuevo, no el anterior. No se borra nada de su dispositivo.',
  'app.strain.v.app.pair.replacesChain':
    '<b>Esta cepa ya tiene un informe de ADN guardado: “{name}”{saved}.</b> Guardar este lo reemplaza. La página de su cepa, su certificado y los enlaces que comparta mostrarán el nuevo, no el anterior. No se borra nada de su dispositivo. Si fechó el vínculo anterior en la red, esa fecha se queda allí.',
  'app.strain.v.app.pair.chain.stampFirst':
    'Ponga primero el sello de fecha de su cepa (desde su página) si también quiere fechar este informe en la red.',
  'app.strain.v.app.plant.notHereText':
    'Si lo selló en otro navegador, guarde allí una copia de seguridad y ábrala aquí (Recuperar sus cepas). Si es el registro de otra persona, abra el enlace de verificación que le dio.',
  'app.strain.v.app.plant.bredByName': 'Obtenida o aislada por {name}',
  'app.strain.v.app.plant.action.saveReport': 'Guardar un informe de ADN en esta cepa',
  'app.strain.v.app.plant.f.reportSaved': 'guardado en esta cepa ({file}) · código del vínculo {fp}{sha}',
  'app.strain.v.app.plant.backToPlant': 'Volver a la cepa',
  'app.strain.v.app.plant.tie.tied': 'Vinculado a la cepa',
  'app.strain.v.app.plant.tie.notYet': 'Aún no vinculado a la cepa',
  'app.strain.v.app.plant.tie.notNow': 'Ya no vinculado a la cepa',
  'app.strain.v.app.plant.tie.openedNotSaved': 'hay un informe de laboratorio abierto, sin guardar en esta cepa',
  'app.strain.v.app.plant.tie.sentence': 'Vinculado a la cepa: {what}, {date}.',
  'app.strain.v.app.plant.tie.sentenceNoDate': 'Vinculado a la cepa: {what}.',
  'app.strain.v.app.plant.tie.sentenceNone': 'Aún no vinculado a la cepa: {what}.',
  'app.strain.v.app.plant.tie.sentenceNot': 'Ya no vinculado a la cepa: {what}.',
  'app.strain.v.app.plant.tie.means':
    'Un informe de ADN permite que un laboratorio compare con él una prueba nueva de una cepa. Por sí solo no demuestra que una cepa coincida.',
  'app.strain.v.app.plant.tie.sub': 'Informe {date}. Un laboratorio puede comparar con él una prueba nueva de la cepa.',
  'app.strain.v.app.plant.tie.why':
    'Un informe de ADN de su laboratorio es lo que vincula un registro con la cepa misma.',
  'app.strain.v.app.plant.savedToPlant': 'guardado en esta cepa',
  'app.strain.v.app.plant.openedNotSaved': 'abierto, sin guardar en esta cepa',
  'app.strain.v.app.plant.keyStampLine':
    'Sello de fecha de la clave: {when}. La clave de su cepa también está fechada, así que más adelante puede demostrar que la tiene.',
  'app.strain.v.app.plant.next.backup.why':
    'Por ahora, las claves de esta cepa están solo en este dispositivo. Si se rompe o se borra el navegador, nadie podrá demostrar que usted la tiene. Guardarla toma un minuto.',
  'app.strain.v.app.plant.next.corrected.why':
    'El laboratorio reemplazó el informe de ADN guardado en esta cepa. Hasta que guarde el corregido, la página de su cepa, el certificado y los enlaces dicen que el guardado fue reemplazado.',
  'app.strain.v.app.plant.next.labWithdrew.whyNewer':
    'Sigue guardado en esta cepa, y su certificado y sus enlaces dicen que fue retirado. Hay un informe de laboratorio más reciente: ábralo y guárdelo en su lugar.',
  'app.strain.v.app.plant.next.labWithdrew.why':
    'Sigue guardado en esta cepa, y su certificado y sus enlaces dicen que fue retirado. Pida uno nuevo al laboratorio.',
  'app.strain.v.app.plant.next.open.why':
    'Está bloqueado para que solo usted pueda abrirlo, con la clave de esta cepa. Al abrirlo se comprueba aquí la firma del laboratorio.',
  'app.strain.v.app.plant.next.sample.whySaved':
    'Guardó un informe de ADN en esta cepa, y eso es su propia declaración. Que un laboratorio firme que recibió una muestra suma una segunda parte, lo que es una evidencia más sólida que su declaración sola.',
  'app.strain.v.app.plant.next.sample.why':
    'Por ahora, este registro es su propio relato de la cepa. Que un laboratorio firme que recibió una muestra y devuelva un informe lo convierte en una evidencia más sólida que su relato.',
  'app.strain.v.app.plant.next.dna.title': 'Obtenga un informe de ADN de esta cepa',
  'app.strain.v.app.plant.next.dna.why':
    'Un registro fechado muestra que existía una descripción. Un informe de ADN (la huella de ADN de la cepa que hace un laboratorio) es lo que vincula su registro con la cepa real. Hay dos formas de conseguirlo:',
  'app.strain.v.app.plant.next.dna.haveText':
    'Guárdelo en esta cepa. Se lee en su dispositivo; el archivo nunca se sube.',
  'app.strain.v.app.plant.next.date.why':
    'Está guardado en esta cepa, pero todavía nada lo fecha. Fecharlo muestra que el informe existía en esa fecha, sin mostrarle a nadie los marcadores.',
  'app.strain.v.app.plant.next.save.title': 'Guarde el informe de ADN en esta cepa',
  'app.strain.v.app.plant.next.save.why':
    'Un laboratorio firmó que recibió una muestra. Cuando llegue su informe de ADN, guárdelo en esta cepa: eso es lo que vincula su registro con la cepa, para poder compararlo con una prueba posterior.',
  'app.strain.v.app.plant.next.save.action': 'Guardarlo en esta cepa',
  'app.strain.v.app.plant.next.ready.why':
    'Un laboratorio firmó que recibió una muestra, y hay un informe de ADN guardado en esta cepa. Puede enviar material o licenciarlo, con condiciones que se aplican a la descendencia declarada a partir de este registro.',
  'app.strain.v.app.plant.tree.none':
    'Todavía no hay linaje registrado. Agregue las cepas progenitoras al registrar para construir el árbol genealógico.',
  'app.strain.v.app.plant.anchor.keysNotHere':
    'La clave de esta cepa no está en este navegador. Recupérela desde su archivo de copia de seguridad: una clave nueva no coincidiría con el registro sellado.',
  'app.strain.v.app.plant.bundle.keyIs':
    '(La clave del registro es el ID público de la clave creada para esta cepa cuando la selló. Su parte secreta se queda en su copia de seguridad y nunca va en el paquete.)',
  'app.strain.v.app.plant.bundle.checkedAgainst': 'Se compara con el guardado en esta cepa antes de incluirlo.',
  'app.strain.v.app.plant.cert.intro':
    'Para sus archivos y su abogado: el registro sellado, una comprobación nueva de que no ha cambiado, si está anclado, si un informe de ADN lo vincula con la cepa, cualquier acuse de recibo de laboratorio y las licencias vigentes. Lleva los detalles del registro, pero no datos genéticos ni archivos de laboratorio. El código QR abre la página pública de comprobación del registro.',
  'app.strain.v.app.plant.att.noReceipt':
    'Ningún laboratorio ha firmado todavía un acuse de recibo para esta cepa. Un registro que solo usted respalda es una evidencia más débil que uno que firma un laboratorio. Envíe una muestra a un laboratorio: su acuse de recibo se firma con su clave, no con la suya.',
  'app.strain.v.app.verify.field.parent-names': 'Cepas parentales (nombres y números de depósito)',
  'app.strain.v.app.verify.alwaysShown':
    'Siempre se muestra: el ID del registro, su código de prueba ({fp}), cuándo lo guardó por primera vez el servidor de registros y lo que esta página pudo comprobar sobre su lote y las atestaciones firmadas (un acuse de recibo de laboratorio, un informe de laboratorio). El nombre, solo cuando el enlace lo lleva (los suyos lo llevan solo si usted lo activa) o usted decide mostrarlo.',
  'app.strain.v.app.verify.ownReceiptTail':
    ' Usted lo ve porque la cepa está en este navegador; quien reciba el enlace solo ve la línea de firma de arriba.',
  'app.strain.v.app.prove.openCheckPage': 'Abrir la página de comprobación de la cepa',
  'app.strain.v.app.prove.doneText':
    'Verán la respuesta en su página. No se envió nada sobre la cepa: solo la prueba de que usted tiene su registro.',
  'app.strain.v.app.prove.thePlant': 'la cepa',
  'app.strain.v.app.prove.thisPlant': 'esta cepa',
  'app.strain.v.app.prove.whatSends':
    '<b>Qué se envía:</b> solo la prueba de que usted tiene el registro de esta cepa, puesta en la red de pruebas. Ni nombre, ni genética, ni nada sobre sus otras cepas.',
  'app.strain.v.app.prove.answering':
    'Responder le dice a quien le envió este enlace que usted tiene el registro de esta cepa.',
  'app.strain.v.app.prove.watch.notWho': 'No muestra quién es esa persona ni quién obtuvo la cepa.',
  'app.strain.v.app.prove.watch.holderStatement':
    'Que esta clave corresponda al registro de esta cepa es, por ahora, la declaración del titular. No muestra quién es esa persona ni quién obtuvo la cepa.',
  'app.strain.v.app.prove.watch.stampedYour':
    'La clave de su cepa recibió el sello de fecha el {when}. Eso fecha la clave, no el registro.',
  'app.strain.v.app.prove.watch.stampedThisEarlier':
    'La clave de esta cepa recibió antes un sello de fecha en la red. Eso fecha la clave, no el registro.',
  'app.strain.v.app.prove.own.title': 'Demuestre que tiene la clave de esta cepa (red de pruebas)',
  'app.strain.v.app.prove.own.stampFirst':
    'Prepare primero la prueba: toque “Preparar la prueba de que lo tiene” en la página de la cepa. La prueba trata de la identidad de la cepa en la cadena, que crea ese paso.',
  'app.strain.v.app.lab.sentence.none': 'No hay ningún informe de ADN guardado en esta cepa.',
  'app.strain.v.app.lab.sentence.self':
    'Hay un archivo de informe de ADN guardado en esta cepa. Ninguna firma de laboratorio coincide con él, así que es la propia declaración del titular.',
  'app.strain.v.app.lab.sentence.replaced':
    'El laboratorio reemplazó{on} el informe de ADN guardado en esta cepa por uno corregido. {tail}',
  'app.strain.v.app.lab.sentence.withdrawn':
    'El laboratorio retiró{on} el informe de ADN guardado en esta cepa. {tail}',
  'app.strain.v.app.lab.results.replacedNewer':
    '<b>El laboratorio reemplazó el informe de ADN guardado en esta cepa.</b> Guarde el corregido: ábralo y toque “Guardarlo en esta cepa”.',
  'app.strain.v.app.lab.results.replacedNone':
    '<b>El laboratorio reemplazó el informe de ADN guardado en esta cepa.</b> No hay informe vigente de {lab}: el original fue reemplazado y la corrección retirada.',
  'app.strain.v.app.lab.results.withdrawn':
    '<b>El laboratorio retiró el informe guardado en esta cepa.</b> Sigue guardado hasta que guarde otro, y su certificado y sus enlaces dicen que fue retirado.',
  'app.strain.v.app.lab.results.withdrawnNewer':
    '<b>El laboratorio retiró el informe guardado en esta cepa.</b> Sigue guardado hasta que guarde otro, y su certificado y sus enlaces dicen que fue retirado. Hay un informe de laboratorio más reciente: ábralo y guárdelo en esta cepa.',
  'app.strain.v.app.lab.results.locked':
    'Bloqueados para que solo usted pueda abrirlos, con la clave de esta cepa de su copia de seguridad. VeilCore los guarda bloqueados y no tiene la clave.',
  'app.strain.v.app.lab.results.noKey':
    'La clave de esta cepa no está en este dispositivo, así que aquí no se pueden abrir sus informes de laboratorio. Primero <link>recupere sus cepas desde su copia de seguridad</link>.',
  'app.strain.v.app.lab.results.whatOthersSee':
    '<b>Lo que otros pueden ver.</b> La firma del laboratorio es pública; el informe no. Cualquiera con un enlace a la página de comprobación de esta cepa ve que se firmó un informe de laboratorio sobre ella, el SHA-256 del archivo del informe y el nombre con el que está registrada la clave del laboratorio: marcado “nombre no comprobado” salvo que el operador de VeilCore lo haya cotejado con un listado público de licencias o acreditaciones. Si guarda el informe en esta cepa y comparte “Si hay un informe de ADN guardado” en Mostrar a alguien, también ven que el archivo guardado coincide.',
  'app.strain.v.app.lab.results.nothingYet':
    'Nada todavía. Cuando un laboratorio al que envió esta cepa mande un informe de laboratorio, aparecerá aquí.',
  'app.strain.v.app.lab.results.savedHere': ' · guardado en esta cepa',
  'app.strain.v.app.lab.results.stillSaved': '. Sigue guardado en esta cepa.',
  'app.strain.v.app.lab.results.replacesSaved':
    'Ya hay un informe de laboratorio guardado en esta cepa. Guardar este lo reemplaza; lo confirma en la pantalla siguiente.',
  'app.strain.v.app.lab.send.nothingYet':
    'Todavía no cambió nada. La página de su cepa muestra “esperando” hasta que ingresen el código, y puede volver a mostrar este código. Lo pegan en el cuadro del Inicio de VeilCore.',
  'app.strain.v.app.lab.send.takenFromHelp': 'La cepa madre o la etiqueta de su ubicación.',
  // What a strain is made by, not bred by (strain-words.test).
  'app.strain.v.app.plant.f.method': 'Cómo se obtuvo',
  'app.strain.v.app.plant.f.statedDate': 'Fecha declarada de obtención o aislamiento (declaración del titular)',
  'app.strain.v.app.plant.fix.field.cultivarName': 'nombre de la cepa',
  'app.strain.v.app.plant.fix.field.breederName': 'obtenida o aislada por',
  'app.strain.v.app.plant.fix.field.breedingMethod': 'cómo se obtuvo',
  'app.strain.v.app.verify.field.breeding-method': 'Cómo se obtuvo',
  'app.strain.v.app.verify.field.bred-by': 'Obtenida o aislada por',
  'app.strain.v.app.verify.method': 'Cómo se obtuvo, según el titular: {method}',
  'app.strain.v.app.verify.noMethod': 'No se registró cómo se obtuvo.',
  'app.strain.v.app.verify.bredByShared': 'Obtenida o aislada por, según lo escribió el titular: {name}',
  'app.strain.v.app.verify.noBredBy': 'No se registró quién la obtuvo o aisló.',
} satisfies Partial<AppTranslation>;
