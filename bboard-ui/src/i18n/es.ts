// Spanish (Latin American neutral). DRAFT: machine-assisted, to be checked by a fluent speaker before publishing.
// SPDX-License-Identifier: Apache-2.0
import type { Strings } from './en';

export const es: Strings = {
  // Header and footer
  'nav.language': 'Idioma',
  'nav.main': 'Principal',
  'footer.documents': 'Documentos',
  'footer.spec': 'Especificación',
  'footer.partners': 'Exigir un registro',
  'footer.evidence': 'Registros como prueba',
  'footer.integrate': 'Guía de integración',
  'footer.source': 'Código fuente',
  'footer.allImplementations': 'Las tres implementaciones',
  'footer.referenceImplementation': 'Implementación de referencia',
  'footer.rustImplementation': 'Implementación en Rust',
  'footer.thisSite': 'Este sitio',
  'footer.whatThisIs': 'Qué es esto',
  'footer.yourRecords': 'Sus registros',
  'footer.agreements': 'Acuerdos',
  'footer.privacy': 'Privacidad de la demo',
  'draft.banner':
    'Traducción preliminar hecha por máquina, en revisión. La página en inglés es la versión de referencia.',
  'draft.showEnglish': 'Ver en inglés',
  // The record app's frame and the browser tab's titles.
  'app.frame.section.log': 'Registrar',
  'app.frame.section.send': 'Enviar y recibir',
  'app.frame.section.license': 'Licencias y regalías',
  'app.frame.section.prove': 'Demostrar y comprobar',
  'app.frame.home': 'Inicio. Su avance está guardado.',
  'title.founders': 'Fundadores',
  'title.privacy': 'Privacidad de la demo',
  'title.privacyMainnet': 'Privacidad del sitio',
  'title.example': 'Registro de ejemplo',
  'title.verify': 'Comprobar un registro',
  'title.import': 'Feche su colección',
  'title.records': 'Sus registros',
  'title.restore': 'Recupere sus registros',
  'title.backup': 'Guarde su copia de seguridad',
  'title.spec': 'El formato de registro',
  'title.evidence': 'Registros como prueba',
  'title.integrate': 'Integrar VeilCore',
  'title.implementations': 'Implementaciones',
  'title.new': 'Registrar una planta o un animal',
  'title.record': 'Registro',
  'title.agreements': 'Acuerdos',
  // PageErrorBoundary.tsx: a page that failed to draw (round 3)
  'error.page.title': 'No se pudo mostrar esta página',
  'error.page.text': 'Algo salió mal al mostrarla. No se cambió nada. Recargue la página o vaya a sus registros.',
  'error.page.reload': 'Recargar',
  'error.page.home': 'Sus registros',
  // Public pages (Mako's 25 September layout)
  'm.nav.about': 'Acerca de',
  'm.nav.team': 'Equipo',
  'm.nav.updates': 'Novedades',
  'm.nav.spec': 'Especificación',
  'm.nav.demo': 'Pruebe la demo',
  'm.nav.menu': 'Menú',
  'm.hero.label': 'Prueba de lo que usted tiene',
  'm.hero.title1': 'Feche su registro.',
  'm.hero.title2': 'Conserve su genética.',
  'm.hero.how': 'Cómo funciona',
  'm.hero.cultivar': 'Cultivar',
  'm.hero.bredBy': 'Obtenido por',
  'm.hero.bredByDefault': 'Su nombre aquí',
  'm.hero.demoLabel': 'Demo de código de prueba en vivo',
  'm.hero.fpUpdated': 'Código de prueba actualizado',
  'm.hero.typed': 'Lo que usted escribe',
  'm.hero.goes': 'Lo que va a Midnight',
  'm.foot.demo': 'Demo',
  'm.step1.n': '01 · Registro',
  'm.step2.n': '02 · Código de prueba',
  'm.step3.n': '03 · Anclaje',
  'm.step4.n': '04 · Verificación',
  'm.step4.title': 'Muéstrelo después',
  'm.demo.label': 'Demo',
  'm.demo.title1': 'Pruebe',
  'm.demo.title2': 'la demo.',
  'm.demo.create.title': 'Registrar una planta o un animal',
  'm.demo.create.text': 'Registre una planta o un animal inventados, guarde su copia de seguridad y vea su página.',
  'm.demo.verify.title': 'Verificar un registro',
  'm.demo.verify.text': 'Ingrese el identificador de un registro y vea lo que su titular divulgó y si está anclado.',
  'm.demo.video.title': 'Ver cómo funciona',
  'm.demo.video.text':
    'Una animación de 60 segundos sobre la idea: qué se queda con usted, qué va a Midnight y cómo alguien lo comprueba.',
  'm.chip.video': 'Video',
  'm.chip.60s': '60 s',
  'm.chip.75s': '75 s',
  'm.chip.interactive': 'Interactiva',
  'm.chip.3min': '~3 min',
  'm.chip.1min': '~1 min',
  'm.team.label': 'Equipo',
  'm.team.title1': 'Dos fundadores.',
  'm.team.title2': 'Tokio y Nueva Jersey.',
  'm.team.more': 'Perfiles completos →',
  'm.mako.role': 'Cofundador y CEO · Tokio',
  'm.mako.short': 'Líder comercial: organismos de normalización y de derechos de obtentor en Japón y la UE.',
  'm.hunter.role': 'Cofundador y COO · Nueva Jersey',
  'm.hunter.short': 'Construye el contrato, el sitio web y la API. Dirige el acercamiento en EE. UU.',
  'm.updates.label': 'Novedades',
  'm.updates.title1': 'Lo último',
  'm.updates.title2': 'del desarrollo.',
  'm.updates.read': 'Leer →',
  'm.updates.all': 'Cambios del formato de registro en GitHub →',
  'm.updates.follow': 'Seguir',
  'm.post1.date': '3 oct 2026',
  'm.post1.tag': 'Formato',
  'm.post1.title': 'Tres implementaciones, una respuesta',
  'm.post1.text':
    'Una prueba diferencial encontró que nuestras implementaciones en TypeScript, Python y Rust no coincidían en algunos números. Corregido: ahora coinciden en cada una de 81 000 entradas, y los vectores de prueba compartidos lo comprueban.',
  'm.post2.date': '2 oct 2026',
  'm.post2.tag': 'Contrato',
  'm.post2.title': 'Una ejecución completa en la red de pruebas de Midnight',
  'm.post2.text':
    'El contrato se desplegó en la red de pruebas de Midnight y pasó las 26 comprobaciones de extremo a extremo, usando 16 de sus 24 operaciones con pruebas reales.',
  'm.status.label': 'Dónde estamos',
  'm.status.title1': 'Cómo están',
  'm.status.title2': 'las cosas.',
  'm.status.lede': 'Lo que está hecho y lo que aún no.',
  'm.stat3.b': 'Sin auditoría',
  'm.status.keyTitle': 'Quién puede cambiar el contrato.',
  'm.status.keyText':
    'Una clave de mantenimiento puede cambiar cómo funciona el contrato de VeilCore en Midnight. Quien la tenga puede añadir o reemplazar operaciones del contrato, lo que podría permitirle tomar el control de la identidad de cualquier registro, añadir licencias en nombre de cualquier emisor, añadir o quitar obligaciones y vínculos de parentesco, o desactivar operaciones. No puede antedatar los tiempos de bloque de la red, y cada cambio queda a la vista en la cadena. No puede cambiar ni quitar un lote ya anclado, ni la fecha que da a un registro: eso está en la transacción que lo ancló, que nadie puede alterar. Hoy la clave está en papel, una copia en manos de cada fundador, y cualquiera de las dos copias basta por sí sola para usarla. Pasarla a un grupo de claves que deban estar de acuerdo está previsto, pero aún no está hecho. Cada uso se anuncia públicamente, según una política de mantenimiento escrita.',
  'm.status.keyLink': 'Leer la política de mantenimiento →',
  'm.contact.label': 'Contacto',
  'm.contact.title1': 'Díganos',
  'm.contact.title2': 'dónde falla.',
  'm.contact.email': 'Escriba a los fundadores',
  'm.contact.spec': 'Lea la especificación',
  'm.foot.explore': 'Explorar',
  'm.foot.build': 'Desarrollo',
  'm.foot.contact': 'Contacto',
  'm.foot.verify': 'Verificar un registro',
  'm.foot.fine': 'Prueba de que usted tenía un registro en una fecha. No es un título sobre la planta.',
  'm.foot.privacy': 'Privacidad de la demo',
  'm.verify.label': 'Verificar',
  'm.verify.title': 'Compruebe un registro',
  'm.verify.lede':
    'Ingrese el identificador de registro impreso en un certificado o que le hayan compartido. Verá lo que su titular decidió compartir y lo que esta página pudo comprobar por sí misma: si el registro está en un lote sellado y si las firmas de laboratorio, si las hay, son válidas.',
  'm.verify.field': 'Identificador de registro',
  'm.verify.go': 'Comprobar',
  'm.verify.fpField': 'Código de prueba (en el certificado, opcional)',
  'm.verify.fpHelp':
    'Con él, esta página comprueba el registro con el código que usted tiene, no solo con la respuesta del servidor de registros.',
  'm.verify.fpBad':
    'Un código de prueba tiene 64 caracteres, 0–9 y a–f. Déjelo vacío para comprobar solo por el identificador.',
  'm.founders.label': 'Fundadores',
  'm.founders.leads': 'Dirige',
  'm.founders.also': 'Además',
  'm.founders.languages': 'Idiomas',
  'm.mako.bio1':
    'Makoto (Mako) Steiner es cofundador y CEO de VeilCore; dirige la estrategia comercial, la recaudación de fondos y el acercamiento a instituciones e inversionistas en todo el mundo.',
  'm.mako.bio2': 'Estudió Estudios Ambientales en Denison University y vive en Tokio.',
  'm.mako.leads': 'Japón|UE|Organismos de normalización|Desarrollo de negocios',
  'm.mako.also': 'Midnight Nightforce Leader (Japón) · Build Club, Cohorte 1',
  'm.mako.languages': 'Inglés · Japonés',
  'm.hunter.bio1':
    'Hunter Roberts es cofundador y COO de VeilCore; dirige el producto y el protocolo VeilCore, desde el formato de registro hasta el contrato en Midnight. Dirige el acercamiento de VeilCore a instituciones de EE. UU., incluidos organismos de certificación de semillas, de normalización y de variedades vegetales.',
  'm.hunter.bio2':
    "Viene del trabajo práctico con plantas, incluidos el mejoramiento y el cultivo de tejidos, y está construyendo Chunk's Trees, una instalación de cultivo en Nueva Jersey.",
  'm.hunter.leads': 'Estados Unidos|Protocolo y especificación|Ingeniería',
  'm.hunter.also': 'Midnight Nightforce Leader (EE. UU.) · Build Club, Cohorte 1',
  'm.founders.band1': 'Hable con nosotros.',
  'm.founders.band2': 'Preferimos saber dónde falla',
  'm.founders.band3': 'a que nos digan que funciona.',
  'm.founders.bandText':
    'Si dirige un programa de mejoramiento, un laboratorio, una agencia de certificación de semillas o un organismo de derechos de obtentor, nos gustaría conversar. El formato es gratuito de implementar y gratuito de verificar.',
  'm.founders.emailBoth': 'Escriba a ambos fundadores',
  'm.portraitOf': 'Retrato de {name}',
  'm.privacy.label': 'Privacidad de la demo',
  'm.privacy.title': 'Qué guarda la demo.',
  'm.privacy.lede':
    'Esta nota se refiere a la demo de este sitio. Es una prueba, en la red de pruebas de Midnight. Por favor, use datos inventados.',
  'm.privacy.sum.local.t': 'Nunca sale de su dispositivo sin cerrar',
  'm.privacy.sum.local.p':
    'Sus archivos de ADN y sus fotos nunca salen de su dispositivo. Los informes de laboratorio viajan cerrados.',
  'm.privacy.sum.locked.t': 'Guardado bloqueado, no podemos leerlo',
  'm.privacy.sum.locked.p': 'Todo lo que escribe en un registro, y los informes que un laboratorio le envía.',
  'm.privacy.sum.read.t': 'Podemos leer',
  'm.privacy.sum.read.p':
    'El ID del registro, el código de prueba, las fechas y lo que usted decida mostrar. La lista completa está abajo.',
  'm.privacy.full': 'La lista completa',
  'm.privacy.stored.title': 'Se guarda en nuestro servidor de pruebas',
  'm.privacy.stored.text':
    'Sus registros y acuerdos, bloqueados por su navegador antes de enviarse: el nombre de cada registro, obtentor, especie, fechas, notas, números de referencia, progenitores, los códigos de prueba y los nombres de archivo de las fotos e informes de laboratorio que añade, términos y contrapartes de los acuerdos, la cantidad y la nota que envía a un laboratorio, los datos de muestra que usted y el laboratorio escriben (ID de muestra, número de precinto, dónde y cuándo se tomó, un testigo, cómo llegó), los nombres que da a los destinatarios y las claves secretas de cada registro. Nuestro servidor los guarda bloqueados, y nosotros no tenemos la clave: está en su navegador y en su archivo de copia de seguridad. La clave de los datos de muestra también va en el código de laboratorio, para que el laboratorio pueda abrirlos. Si usted lo elige, el nombre de un registro también va en un enlace de comprobación que crea, después del #. Un navegador no envía esa parte al abrir el enlace, pero el enlace va completo a cualquiera a quien se lo envíe y a cualquier sitio donde lo pegue, incluido el formulario de un socio. Nuestro servidor puede leer: el ID de cada registro; su código de prueba, su vínculo de clave y su tipo de perfil; un código hecho a partir de su nombre, que no dice nada del nombre sin la clave de su enlace de comprobación; sus vínculos de corrección (qué registro sustituye una corrección, qué campos cambió y cuándo); cuándo lo vio el servidor por primera vez; cuántas veces se guardó y cuándo fue la última; más o menos qué tamaño tiene (su franja de tamaño); lo que usted decida mostrar en su página de comprobación (su nombre, si decide mostrarlo, y si hay un informe de ADN guardado, como un código que no dice nada del archivo sin la clave de su enlace de comprobación); los vínculos con progenitores que registre; y su lote con su sello de fecha. Si un acuerdo tiene regalías sobre la descendencia, nuestro servidor puede leer a qué registro se aplica y desde cuándo rige, y cualquiera puede preguntar si ese registro tiene una: la comprobación de linaje lo necesita. De un envío: de qué registro procede, qué cuenta de titular lo recibió, cuándo se recibió y una etiqueta en lugar del nombre del destinatario. En un envío anterior a las etiquetas, el nombre está tal como se escribió, hasta que la limpieza del registro lo sustituya. De los laboratorios: la clave pública de firma y las firmas que publican. La firma de un laboratorio sobre un informe nombra el informe ligado a su registro con una clave que solo usted y el laboratorio tienen; una hecha antes del 17 de octubre de 2026 nombra el SHA-256 del archivo del informe, que nuestro servidor muestra solo a usted y al laboratorio. Las solicitudes de demostrar la clave de un registro, con el nombre que escribió quien la pide, durante 7 días: nuestro servidor sabe qué clave en la cadena nombra cada solicitud. Las páginas de demostración y de comprobación nunca envían su clave de titular. Su clave de titular, que su navegador envía cada vez que guarda para que el servidor encuentre sus registros; el servidor solo conserva un hash de un solo sentido de ella. Los registros guardados antes del bloqueo siguen siendo legibles para nosotros hasta que su navegador los bloquee, y el nombre de un registro guardado antes de que se bloquearan los nombres sigue siendo legible para nosotros hasta que su navegador vuelva a guardar el registro. Los datos de muestra escritos antes del bloqueo siguen siendo legibles para nosotros hasta que el registro los elimine. Nuestras copias de seguridad externas de antes conservan una copia legible de todo esto hasta que destruyamos la clave que las abre. Informes de laboratorio cerrados que un laboratorio le envía: se guardan cerrados, sin la clave, y se borran a los 180 días. El servidor es el registro de pruebas de VeilCore, alojado en Railway.',
  'm.privacy.local.title': 'Nunca sale de su navegador sin cerrar',
  'm.privacy.local.text':
    'Sus archivos de ADN nunca salen de su dispositivo. Los informes de laboratorio viajan cerrados. Su navegador lee los informes de ADN, informes de laboratorio y fotos que usted añade para hacer un código de cada uno; los archivos en sí nunca se suben. Un informe de laboratorio llega a nuestro servidor solo cuando un laboratorio se lo devuelve, cerrado para que solo usted pueda abrirlo.',
  'm.privacy.test.title': 'Una red de pruebas',
  'm.privacy.test.text':
    'La demo usa la red de pruebas de Midnight, no la red en producción. Los datos de la demo pueden borrarse cuando se reinicie la red de pruebas.',
  'm.privacy.madeup.title': 'Use datos inventados',
  'm.privacy.madeup.text':
    'Por favor, no ingrese nombres reales, variedades reales ni nada confidencial. La demo sirve para probar el formato.',
  'm.privacy.export.title': 'Exportar',
  'm.privacy.export.text':
    'En su página de registros, en «Más»: «Exportar todos los registros» descarga los registros que guarda este navegador. «Descargar sus registros y acuerdos de VeilCore» descarga lo que nuestro servidor guarda de ellos, abierto en su navegador: sus registros, acuerdos, opciones de uso compartido y, de cada registro, su prueba y su lote. Deja fuera sus envíos con sus datos de muestra, los informes de laboratorio bloqueados, las regalías sobre la descendencia y las solicitudes de demostrar la clave de un registro. Los envíos, sus datos de muestra y los informes de laboratorio se abren desde el envío en la aplicación. La comprobación de linaje responde sobre las regalías, un registro cada vez. Las solicitudes de demostración se borran a los 7 días. Ninguno de los dos archivos tiene sus claves ni las claves secretas de sus registros: están en su archivo de copia de seguridad.',
  'm.privacy.delete.title': 'Eliminación',
  'm.privacy.delete.text':
    'Para que eliminemos sus datos de la demo de nuestro servidor, escriba a hunter@veilcore.org con los identificadores de sus registros.',
  'm.privacy.browser.title': 'Se guarda en su navegador',
  'm.privacy.browser.text':
    'Su navegador guarda, en este dispositivo: su clave de titular (también se envía una copia a nuestro servidor, como se indica arriba); la clave que bloquea sus registros, que nunca se nos envía; su propia copia de sus registros; las claves secretas de cada registro, que bloquean sus informes de laboratorio (una copia bloqueada también va con el registro); los códigos de laboratorio que crea o usa, con un código de recogida y la clave de los datos de un envío; la clave de firma de un laboratorio si configuró una (su parte privada nunca se nos envía); el rol que eligió; y su idioma. Su archivo de copia de seguridad contiene una copia de cada clave y de los códigos de laboratorio que creó. Para borrarlos, elimine los datos de este sitio en la configuración de su navegador. Guarde antes su copia de seguridad: sin ella, no podrá encontrar ni abrir sus registros de nuevo.',
  'm.privacy.hosts.title': 'Alojamiento',
  'm.privacy.hosts.text':
    'Este sitio web está alojado en Vercel, que registra direcciones IP y solicitudes. Nuestro servidor de registro funciona en Railway, que registra solicitudes.',
  'm.privacy.who.title': 'Quién lo guarda y durante cuánto tiempo',
  'm.privacy.who.text':
    'VeilCore aún no está constituida como empresa; sus fundadores gestionan este sitio y el registro. Los informes de laboratorio cerrados se borran 180 días después de llegar. Las solicitudes de demostrar la clave de un registro se borran a los 7 días. Nada más tiene un plazo de conservación fijado: se queda hasta que nos pida que lo eliminemos. Contacto: hunter@veilcore.org.',
  'm.notfound.title': 'Página no encontrada.',
  'm.notfound.text':
    'No hay ninguna página en esta dirección. Si alguien le dio un enlace a un registro, compruebe que esté completo.',
  'm.notfound.home': 'Inicio de VeilCore →',
  'm.privacy.contact': 'Preguntas: hunter@veilcore.org',
  // Round 2 truth pass (14 Oct 2026): keys added or newly translated.
  'm.hero.lede':
    'Para obtentores, empresas de semillas y laboratorios que trabajan con genética vegetal y animal: dé a sus registros una fecha que nadie puede antedatar. Sus datos genéticos se quedan en su computadora. Solo un código de prueba va a Midnight, que lo fecha.',
  'm.for.3p':
    'Envíe material con un código de laboratorio. El laboratorio firma un acuse de recibo con su propia clave, así el registro muestra a una segunda parte. El acuse es una firma real, guardada por el registro de VeilCore, no en la cadena. Condiciones como no propagar son solo de práctica en la demo web.',
  'm.get.1b': 'para un registro de lo que usted tiene, sin mostrar su genética.',
  'm.get.3b':
    'Un vínculo de parentesco cuenta solo cuando ambos titulares lo confirman. En este sitio lo anota el servidor de registros de VeilCore, no la cadena.',
  'm.open.2t': 'Guarde un solo archivo.',
  'm.open.2p':
    'En la página de su planta: «Descargar el paquete de evidencia». Un solo .zip con el registro tal como se selló, su prueba de inclusión, el código de prueba del lote, dónde se registró el lote, el archivo de sello de Bitcoin si lo hay, y una página que lo comprueba todo sin conexión. Su archivo de respaldo contiene sus claves, no estos archivos. Los archivos sueltos siguen en «Detalles técnicos»: «Exportar el registro», «Descargar la prueba de inclusión», «Descargar el archivo de sello de Bitcoin».',
  'm.faq.1a':
    'Una vez anclados los registros, cualquiera puede comprobar cuál se ancló primero. Vincule su informe de laboratorio, para que una prueba posterior pueda compararse con él. Cuando envíe material, el receptor firma un acuse de recibo con su propia clave. Un registro es una prueba, no una inscripción: muestra que usted tenía este registro en esa fecha, no que tenía la planta, y por sí solo no resuelve una disputa.',
  'm.post0.date': '4 oct 2026',
  'm.post0.tag': 'Contrato',
  'm.post0.title': 'Probar un hecho, guardar el resto',
  'm.post0.text':
    'Ambos contratos pasaron las 37 comprobaciones de extremo a extremo en la red de pruebas preprod de Midnight, incluidas las nuevas pruebas de un hecho: un valor, un rango, una diferencia, una corrección que deja el resto intacto y una firma de una clave de laboratorio de prueba. Datos de marcadores inventados.',
  'm.postA.date': '8 oct 2026',
  'm.postA.tag': 'Lanzamiento',
  'm.postA.title': 'En la red principal de Midnight',
  'm.postA.text':
    'Ambos contratos están desplegados en la red principal de Midnight. El contrato de pruebas de un hecho no tiene clave de mantenimiento: nadie, ni siquiera nosotros, puede cambiarlo.',
  'm.postB.date': '11 oct 2026',
  'm.postB.tag': 'Registro',
  'm.postB.title': 'Primer lote fechado también en Bitcoin',
  'm.postB.text':
    'Los primeros lotes del servidor de registros se anclaron a mano en la red principal de Midnight. Uno de ellos, con cinco de nuestros propios registros de prueba, también tiene su raíz sellada en Bitcoin, en el bloque 971004. Comprobado el 15 de octubre con dos exploradores de bloques: el sello lleva a los bloques 971004 y 971005 de Bitcoin. Aún falta comprobarlo con la herramienta oficial de OpenTimestamps y un nodo completo de Bitcoin.',
  'm.founders.lede':
    'VeilCore es un formato de registro probatorio para genética vegetal y animal. Prueba que usted tenía un registro de su material en una fecha determinada, sin entregar sus datos genéticos.',
  'm.live.label': 'Qué funciona dónde',
  'm.live.title1': 'Qué funciona,',
  'm.live.title2': 'y dónde.',
  'm.live.lede':
    'veilcore.org funciona en la red principal de Midnight, y los registros hechos allí son reales. El sitio de prueba es para practicar: allí funciona más, y sus registros no tienen valor probatorio.',
  'm.live.colMain': 'veilcore.org (red principal)',
  'm.live.colTest': 'test.veilcore.org',
  'm.live.colNot': 'Todavía no',
  'm.live.stamp.t': 'Un sello de fecha para su registro',
  'm.live.stamp.main': 'Sí, por lotes, a mano por ahora. Su navegador no envía nada a la cadena.',
  'm.live.stamp.test':
    'Sí. Los lotes se fechan automáticamente, y eso fecha su registro. Su navegador también pone un sello de fecha a la clave propia de su planta; ese sello fecha solo la clave.',
  'm.live.share.t': 'Elegir qué ven los demás',
  'm.live.share.main':
    'Sí. Usted elige cada dato. El nombre solo aparece en los enlaces que envía, o si decide mostrarlo.',
  'm.live.share.test':
    'Sí. Usted elige cada dato. El nombre solo aparece en los enlaces que envía, o si decide mostrarlo.',
  'm.live.lab.t': 'Código de laboratorio y acuse firmado',
  'm.live.lab.main':
    'Sí. El laboratorio firma con su propia clave. El servidor de registros de VeilCore guarda el acuse, no la cadena.',
  'm.live.lab.test': 'Sí, de la misma forma.',
  'm.live.results.t': 'Informes de laboratorio que solo usted abre',
  'm.live.results.main': 'Sí. Nuevo, todavía en pruebas.',
  'm.live.results.test': 'Sí. Nuevo, todavía en pruebas.',
  'm.live.dna.t': 'Una fecha para la vinculación de su informe de ADN',
  'm.live.dna.main': 'Se guarda con su registro, sin fecha.',
  'm.live.dna.test': 'Sí, enviada desde su navegador.',
  'm.live.prove.t': 'Probarlo con un enlace',
  'm.live.prove.test':
    'Sí. La página de la otra persona comprueba en la red que usted controla la clave propia del registro. El registro nombró esa clave al sellarse, así que no se puede cambiar por otra.',
  'm.live.prove.not': 'En veilcore.org: requiere que su navegador envíe una transacción.',
  'm.live.claims.t': 'Probar un solo hecho',
  'm.live.claims.main': 'En la red principal, sin clave de mantenimiento. El sitio aún no puede usarlo.',
  'm.live.claims.not': 'Usarlo desde el sitio web.',
  'm.live.lic.t': 'Licencias y regalías',
  'm.live.lic.main': 'Solo de práctica.',
  'm.live.lic.test': 'Solo de práctica.',
  'm.live.lic.not': 'Licencias reales desde el sitio. Están integradas en el contrato.',
  'm.live.chain.t': 'La página de comprobación lee Midnight por sí misma',
  'm.live.chain.main': 'Todavía no: necesita nuestro relé de solo lectura.',
  'm.live.chain.test': 'Sí.',
  // Round 3 (14 Oct 2026): the rest of the landing page, so no English shows through.
  'nav.newCultivar': 'Nuevo registro',
  'nav.licenses': 'Acuerdos',
  'footer.about': 'Un formato de registro abierto para genética vegetal y animal.',
  'footer.howCheck': 'Cómo funciona la comprobación →',
  'm.hero.status':
    'Lanzamiento en la red principal de Midnight. Hoy los registros se fechan en una red de pruebas de Midnight, lo que todavía no prueba nada.',
  'm.claims.status':
    'Un segundo contrato de Midnight, probado de extremo a extremo en la red de pruebas preprod de Midnight el 4 de octubre de 2026 con datos de marcadores inventados. Todavía no está en esta demo web ni en la red principal.',
  'm.faq.3a':
    'Está hecho para servir como prueba, y nuestra nota para abogados dice qué prueba y qué no. Hoy los registros se fechan en una red de pruebas de Midnight, y una fecha en una red de pruebas no tiene valor probatorio. El lanzamiento en la red principal está cerca.',
  'm.stat2.b': 'Red de pruebas',
  'm.stat2.s':
    'Ambos contratos probados de principio a fin en una red de pruebas de Midnight. Aún no están en la red principal.',
  'm.foot.about':
    'Un formato de registro abierto para genética vegetal y animal. Diseñado para anclarse en Midnight; en pruebas en una red de pruebas de Midnight.',
  'm.for.2p':
    'Los obtentores quieren usar sus marcadores para mostrar que una variedad es distinta, y los guardan como secretos comerciales. Una afirmación de VeilCore prueba un hecho sobre ellos sin mostrar el resto. Ninguna oficina de examen ni certificadora la acepta todavía.',
  'm.hero.note':
    'Escriba en cualquiera de los dos campos; no se envía nada. La línea azul de abajo es el código de prueba, la parte que va a Midnight. Nadie puede deducir a partir de ella lo que usted escribió.',
  'm.hero.noteShort': 'Solo la línea azul va a Midnight.',
  'm.for.label': 'Para qué sirve',
  'm.for.title1': 'Muchas disputas sobre genética se reducen a una pregunta:',
  'm.for.title2': '¿qué tenía usted, y cuándo?',
  'm.for.lede':
    'Los cuadernos y archivos los fecha quien los lleva, así que es fácil ponerlos en duda. Registrar el material en sí significa entregar justo lo que quiere proteger.',
  'm.for.1t': 'Un esqueje sale por la puerta.',
  'm.for.1p':
    'Selle un registro y vincule su informe de ADN. Si la planta aparece con otro nombre, un laboratorio puede comparar una prueba nueva con su informe. En la demo web, el vínculo se guarda con su registro, pero aún no se fecha. VeilCore no hace pruebas de ADN.',
  'm.for.2t': 'Protección de variedades y certificación.',
  'm.for.2link': 'Cómo funciona una prueba →',
  'm.for.3t': 'Material en manos de un laboratorio.',
  'm.for.4t': 'Resultados de laboratorio, de vuelta a usted.',
  'm.for.4p':
    'El laboratorio firma su informe y lo cierra para que solo usted pueda abrirlo. Ningún PDF queda en la bandeja de entrada de nadie. El archivo cerrado espera en el servidor de VeilCore a que usted lo abra, y nosotros no tenemos su clave. VeilCore anota quién firmó; no responde por el resultado. Nuevo, y todavía en pruebas.',
  'm.for.6t': 'Alguien le pide una prueba.',
  'm.for.6p':
    'Le envían un enlace. Usted toca una vez, y la página de la otra persona comprueba en la red que usted controla la clave propia de su planta. Su registro nombró esa clave al sellarse, así que no se puede cambiar por otra. No dice nada sobre quién es usted ni sobre quién obtuvo la planta. Por ahora esto funciona en una red de pruebas de Midnight.',
  'm.for.5t': 'Líneas animales.',
  'm.for.5p':
    'Los libros genealógicos llevan el pedigrí. Un registro puede dar a cada entrada una fecha que nadie puede antedatar, sin publicar el genotipo. En este sitio puede registrar un animal: su identificación individual, padre y madre, y un informe de ADN.',
  'm.for.5ask': 'Si usted cría animales, díganos qué necesitan sus registros.',
  'm.how.label': 'Cómo funciona',
  'm.how.title1': 'Cuatro pasos.',
  'm.how.title2': 'La genética se queda con usted.',
  'm.step1.title': 'Anótelo',
  'm.step1.text':
    'Qué es y de dónde viene. El servidor de VeilCore guarda los detalles bloqueados, el nombre incluido, y nosotros no tenemos la clave. Un enlace de comprobación lleva el nombre solo si usted lo activa, para las personas a las que se lo envía.',
  'm.step2.title': 'Saque su código de prueba',
  'm.step2.text': 'En su computadora. Los datos genéticos nunca salen de ella.',
  'm.step3.title': 'Obtenga una fecha',
  'm.step3.text':
    'Solo el código de prueba va a Midnight, en un lote con otros. La fecha es el bloque en el que entra el lote: muestra que el registro existía para entonces.',
  'm.step4.text': 'Entrégueselo a un comprador, un examinador o un tribunal. Pueden comprobarlo gratis y sin cuenta.',
  'm.claims.label': 'Probar un hecho',
  'm.claims.title1': 'Comparta la prueba,',
  'm.claims.title2': 'no los datos.',
  'm.claims.lede':
    'Un registro puede sellar hasta dieciséis valores, como resultados de marcadores o una tasa de germinación. Después usted prueba un hecho sobre ellos. No se muestra nada más.',
  'm.claims.1t': 'Un valor es lo que usted dice.',
  'm.claims.1p': 'Se muestra ese único valor. Los demás siguen sellados.',
  'm.claims.2t': 'Un número alcanza un umbral.',
  'm.claims.2p': 'Por ejemplo, una germinación de al menos el 95 %. El número en sí sigue oculto.',
  'm.claims.3t': 'Dos variedades difieren.',
  'm.claims.3p':
    'En al menos un número fijado de valores de marcadores. Cuáles difieren sigue siendo privado. Si eso hace distinta a una variedad lo decide el examinador, no nosotros.',
  'm.claims.4t': 'Una corrección dejó el resto intacto.',
  'm.claims.4p': 'Después de corregir un registro, pruebe que los valores que no tocó no cambiaron.',
  'm.claims.5t': 'Un laboratorio firmó los valores.',
  'm.claims.5p':
    'La prueba nombra la clave que firmó el registro, así que trata de valores que esa clave firmó, no solo de números que usted escribió. Si la clave es de un laboratorio en el que confía, lo decide usted.',
  'm.claims.limitsTitle': 'Límites.',
  'm.claims.limits':
    'Dieciséis valores por registro. Comparar dos variedades requiere una parte que tenga ambos conjuntos, como el obtentor o un laboratorio que haya analizado las dos. Cualquiera a quien usted dé un valor sellado también puede hacer pruebas sobre él. No sirve para comparaciones entre miles de valores. Sin la firma de un laboratorio, los valores son solo la palabra del titular.',
  'm.claims.statusTitle': 'El contrato de afirmaciones',
  'm.claims.link': 'Cómo funcionan las pruebas, en la especificación →',
  'm.get.label': 'Qué hace',
  'm.get.title1': 'Lo que obtiene,',
  'm.get.title2': 'y dónde se detiene.',
  'm.get.title': 'Lo que obtiene',
  'm.get.1a': 'Una fecha que nadie puede antedatar,',
  'm.get.2a': 'Licencias y acuerdos de laboratorio.',
  'm.get.2b':
    'Se adjuntan al registro. Un licenciatario puede probar que tiene una licencia vigente sin mostrar cuál. Una regalía u otra obligación sobre un progenitor aparece en cada descendiente que ambos titulares confirmaron; VeilCore la anota y no la cobra. Probado en una red de pruebas de Midnight; simulado en la demo web.',
  'm.get.3a': 'Linaje que ambas partes aceptaron.',
  'm.stops.title': 'Dónde se detiene, y qué cubre el resto',
  'm.stops.1a': 'Es una prueba, no un título.',
  'm.stops.1b': 'No crea ningún derecho nuevo. Respalda los derechos y contratos que usted ya tiene.',
  'm.stops.2a': 'Fija cuándo, no si.',
  'm.stops.2b':
    'Un registro prueba qué se escribió y cuándo. Un informe de laboratorio vinculado o la firma de un laboratorio dan peso al contenido.',
  'm.stops.3a': 'Funciona con las pruebas de ADN, no en lugar de ellas.',
  'm.stops.3b':
    'Fecha un informe de ADN que usted ya tiene, para que una prueba posterior pueda compararse con él. Un vínculo de parentesco significa que ambos titulares estuvieron de acuerdo; lo que prueba la ascendencia es el ADN.',
  'm.stops.4a': 'No puede ver lo que nadie declara.',
  'm.stops.4b':
    'La propagación a escondidas no se detecta. Pero una vez que usted revoca una licencia, un comprador o laboratorio que compruebe bien no la aceptará como vigente.',
  'm.open.label': 'Formato abierto',
  'm.open.title1': 'Si VeilCore',
  'm.open.title2': 'desaparece.',
  'm.open.1t': 'Las fechas se quedan.',
  'm.open.1p':
    'Nadie puede eliminar el código de un lote anclado en la red principal de Midnight o sellado en Bitcoin, ni siquiera nosotros.',
  'm.open.1link': 'Las tres implementaciones →',
  'm.open.3t': 'No respondemos por los resultados.',
  'm.open.3p':
    'Un registro muestra qué clave lo firmó, el nombre con que se registró esa clave, cualquier acreditación que declaró su titular (no la comprobamos) y si el operador de VeilCore ha cotejado ese nombre con un listado público de licencias o acreditaciones, y en qué fecha. VeilCore no responde por ningún laboratorio: quien comprueba un registro decide cuánto vale una firma.',
  'm.open.4t': 'Cualquiera puede gestionar un servidor de registros.',
  'm.open.4p':
    'El formato permite que un laboratorio, una certificadora o un organismo de derechos lleve su propio registro, en su propio dominio web, y ancle sin pedirnos permiso. El código de nuestro propio registro no está publicado.',
  'm.faq.label': 'Preguntas',
  'm.faq.title1': 'Preguntas',
  'm.faq.title2': 'que nos hacen.',
  'm.faq.1q': '¿Qué impide que alguien registre mi cultivar?',
  'm.faq.2q': '¿Necesito criptomonedas o una billetera?',
  'm.faq.2a':
    'No. Crear un registro en la demo y comprobar cualquier registro no requieren billetera, ni darse de alta, ni comprar nada. Su navegador guarda una clave aleatoria que encuentra sus registros de demo en nuestro servidor. El código de prueba va a Midnight, una red hecha para la privacidad. Usted nunca trata con ella directamente.',
  'm.faq.3q': '¿Se sostendrá en una disputa?',
  'm.faq.3link': 'Los registros como prueba →',
  'm.faq.4q': '¿Qué ven ustedes de mis datos?',
  'm.faq.4a':
    'De sus datos genéticos: nada. Su computadora lee los archivos que usted añade para hacer un código de cada uno, y no se suben. Un informe de laboratorio llega a nuestro servidor solo cuando un laboratorio se lo devuelve: va cerrado para que solo usted pueda abrirlo, y se borra a los 180 días. Los detalles que escribe (el nombre del registro, obtentor, fechas, notas, términos de acuerdos) y los nombres de sus archivos se guardan bloqueados en nuestro servidor, y nosotros no tenemos la clave. Podemos leer el código de prueba de cada registro y todo lo que usted decida mostrar. Los datos de muestra que usted y un laboratorio escriben para un envío también se guardan bloqueados, con una clave que va en el código de laboratorio y que nosotros no tenemos. Los laboratorios y desarrolladores pueden sellar registros dentro de sus propios sistemas, de modo que solo sale el código de prueba.',
  'm.faq.4link1': 'Lo que guarda la demo →',
  'm.faq.4link2': 'Guía de integración →',
  'm.faq.6q': '¿Cuánto cuesta?',
  'm.faq.6a': 'Crear un registro en este sitio no cuesta nada hoy. Comprobar un registro es gratis, siempre.',
  'm.demo.lede':
    'Sin registro, sin billetera. Es una versión de prueba, así que use datos inventados. Los registros se anclan por lotes, a mano por ahora; las licencias y los acuerdos de laboratorio son simulados, y las vinculaciones de informes de ADN todavía no se fechan.',
  'm.demo.privacy': 'Lo que guarda la demo →',
  'm.updates.more': 'Todas las novedades',
  'm.stat3.s':
    'Aún no hay una auditoría de seguridad independiente. Nuestras propias revisiones de los contratos son públicas.',
  'm.stat3.link': 'Leerlas en GitHub →',
  'm.stat4.b': 'Buscamos primeros usuarios',
  'm.stat4.s': 'Nadie lo usa todavía para registros reales. Buscamos a los primeros obtentores y laboratorios.',
  'm.addr.title': 'Los contratos, para quien quiera comprobarlos.',
  'm.addr.main': 'Contrato principal',
  'm.addr.claims': 'Contrato de pruebas de un hecho',
  'm.addr.claimsPending': 'Todavía no está en la red principal.',
  'm.addr.explorer': 'Consúltelos en midnightexplorer.com (gestionado por TexLabs) →',
  'm.live.btc.t': 'También un sello de fecha en Bitcoin',
  'm.live.btc.main':
    'Sí, cada lote sellado. El primero entró en el bloque 971004 el 11 de octubre y se comprobó con dos exploradores de bloques el 15 de octubre. Aún falta comprobarlo con la herramienta oficial y un nodo completo.',
  'm.contact.1t': 'Obtentores y laboratorios',
  'm.contact.1p': 'Pruébelo con registros inventados y luego díganos qué necesitaría para sus registros reales.',
  'm.contact.2t': 'Certificadores de semillas, examinadores y organismos de derechos',
  'm.contact.2p': 'Díganos qué evidencia necesitaría ver, y en qué forma.',
  'm.contact.3t': 'Desarrolladores',
  'm.contact.3p': 'Añádalo al software que ya usa. Sin cuenta ni clave de API con nosotros.',
  'm.contact.4t': 'Inversores',
  'm.contact.4p': 'Escriba a Mako, nuestro CEO.',
  'm.contact.integrate': 'Guía de integración',
  'm.verify.what':
    'Un registro de VeilCore describe material genético sin incluir la genética. Su página de comprobación muestra lo que su titular decidió compartir, y su nombre cuando el enlace del titular lo lleva. Solo su código de prueba va a Midnight, y recibe una fecha una vez anclado allí. Comprobar uno es gratis y no requiere cuenta.',
  'm.verify.home': '¿Qué es VeilCore? →',
  'm.verify.example': '¿No sabe qué verá? Mire primero un ejemplo →',
  // Round 5 (15 Oct 2026): landing page rework, keys added.
  'm.open.6t': 'Comprobar sin nosotros.',
  'm.open.6p':
    'Con ese paquete de evidencia, cualquiera puede comprobar un registro sin conexión: abrir su verify.html y luego buscar en un explorador de Midnight la única transacción que nombra. Los registros sellados desde el 14 de octubre también necesitan la sección 3.6.1 de la especificación, publicada en la especificación de este sitio; el SDK y sus tres implementaciones la incorporarán en su próxima versión.',
  'm.open.6link': 'Leer la especificación →',
  'm.updates.older': 'Novedades anteriores',
  'm.live.colTestHere': 'Este sitio de prueba (test.veilcore.org)',
  'm.live.feature': 'Función',
  'm.live.show': 'Ver la lista',
  'm.tech.title': 'Para lectores técnicos',
  'm.tech.lede': 'Cómo se comprueba a mano, el código, el sello de Bitcoin y quién puede cambiar los contratos.',
  'm.tech.show': 'Ver el detalle',
  'm.tech.check.t': 'Comprobar un registro a mano',
  'm.tech.check.p':
    'Recalcular el código de prueba de un registro solo requiere SHA-256 y la especificación abierta. Su prueba de inclusión une ese código de prueba con el código de prueba de un lote anclado en Midnight, y la transacción que lo ancló da la fecha del lote. El verify.html del paquete de evidencia rehace ese cálculo sin conexión y nombra la transacción y el código de prueba del lote que hay que buscar. La página de comprobación consulta esa transacción en Midnight por sí misma cuando puede llegar a Midnight; si no, dice que la fecha es la que informa nuestro registro, y usted puede buscarla en un explorador de Midnight. Los registros sellados desde el 14 de octubre nombran su propia clave, así que comprobarlos también requiere la sección 3.6.1, publicada en la especificación de este sitio; el SDK y sus tres implementaciones la incorporarán en su próxima versión. Buscar un registro por su identificador en este sitio usa nuestro servidor.',
  'm.tech.impl.t': 'Una especificación, tres implementaciones',
  'm.tech.impl.p':
    'Libre de implementar, para siempre. TypeScript, Python y Rust coinciden en los 100 vectores de prueba del formato de registro en GitHub, y cualquiera puede ejecutarlos; un 101.º, para la vinculación de informes, aún no está en Rust. Un mismo autor escribió las tres, y la de TypeScript está en npm como 0.15.0. Una escrita por otra persona es la prueba que más deseamos.',
  'm.tech.btc.t': 'El sello de Bitcoin',
  'm.tech.btc.p':
    'Nuestro registro sella en Bitcoin el código de cada lote sellado, con OpenTimestamps. El primero entró en el bloque 971004 de Bitcoin el 11 de octubre. Comprobado el 15 de octubre con dos exploradores de bloques: el sello lleva a los bloques 971004 y 971005 de Bitcoin. Aún falta comprobarlo con la herramienta oficial de OpenTimestamps y un nodo completo de Bitcoin. El archivo de sello es el archivo .ots del lote: «Descargar el archivo de sello de Bitcoin», en la página de la planta. El registro del sitio de prueba no sella en Bitcoin.',
  'm.tech.dna.t': 'Vinculación de informes y firmas de laboratorio',
  'm.tech.dna.p':
    'Cuando la vinculación de un informe de ADN pasa por el contrato de VeilCore en Midnight, queda fechada: muestra que quien controlaba el registro en esa fecha tenía ese informe, o su SHA-256, para entonces. Lo que va a la cadena está atado al registro y oculta el informe, así que nadie puede copiar la vinculación a su propio registro. La firma de un laboratorio en un informe cerrado cubre exactamente ese archivo y el registro al que se refiere.',
  'title.checkSite': 'Comprobar este sitio',
  'm.privacy.code.title': 'El código de la app',
  'm.privacy.code.text':
    'VeilCore sirve el código de la app. Cada versión publica la lista de sus archivos. Usted puede comprobar que los archivos que recibió su navegador coinciden con esa lista, y cualquiera puede reconstruir la versión a partir del código publicado y comparar. Esto muestra lo que publicamos. No puede probar que un servidor haya enviado a todos los mismos archivos.',
  'm.checksite.title': 'Comprobar este sitio',
  'm.checksite.lede':
    'VeilCore sirve el código de la app. Cada versión publica la lista de sus archivos. Usted puede comprobar que los archivos que recibió su navegador coinciden con esa lista, y cualquiera puede reconstruir la versión a partir del código publicado y comparar. Esto muestra lo que publicamos. No puede probar que un servidor haya enviado a todos los mismos archivos.',
  'm.checksite.reading': 'Leyendo qué versión es…',
  'm.checksite.noRelease':
    'Esta copia del sitio no se publicó con un despliegue de versión, así que no hay lista con la que comprobarla.',
  'm.checksite.release': 'Esta copia del sitio dice ser la versión {commit} en {network}, hecha el {date}.',
  'm.checksite.how':
    'La comprobación descarga de este sitio cada archivo que lista la versión, y cada dirección de página de la app (con ID de registro al azar) y una dirección al azar, como un navegador abre una página. Calcula el SHA-256 de cada una en su navegador y lo compara, junto con los encabezados de seguridad, con la lista. También comprueba que esta página no tenga ningún script que la página listada no tenga.',
  'm.checksite.trust':
    'Esta página se ejecuta en el sitio que comprueba, así que un sitio que mienta podría mentir también aquí. Para comprobarlo sin confiar en VeilCore, descargue la lista del código público y úsela abajo, o ejecute {command} desde una copia del código.',
  'm.checksite.rebuild':
    'Para comparar la lista misma con el código, reconstruya la versión desde una copia del código: {command}.',
  'm.checksite.pagesMatch':
    'Las {total} direcciones de página son la página listada, con los encabezados de seguridad listados.',
  'm.checksite.pagesDiffer': '{matched} de {total} direcciones de página son la página listada. Estas no:',
  'm.checksite.pageDiffers': 'Página distinta: {path}',
  'm.checksite.headerDiffers': 'Encabezado de seguridad distinto: {name}',
  'm.checksite.noHeaders':
    'La lista de esta versión no tiene encabezados de seguridad (se hizo antes de que se listaran), así que no se compararon.',
  'm.checksite.extraScript': 'Esta página tiene un script que la página listada no tiene: {script}',
  'm.checksite.limit':
    'Esto muestra lo que recibió su navegador. No puede probar que el servidor haya enviado a todos los mismos archivos.',
  'm.checksite.listLink': 'La lista de esta versión en el código público',
  'm.checksite.useSite': 'Comprobar con la lista que sirve este sitio',
  'm.checksite.useFile': 'O comprobar con una lista que descargó:',
  'm.checksite.checking': 'Comprobando {done} de {total} archivos…',
  'm.checksite.allMatch': 'Los {total} archivos coinciden con la lista de la versión.',
  'm.checksite.someDiffer': '{matched} de {total} archivos coinciden con la lista de la versión. Estos no:',
  'm.checksite.differs': 'Distinto: {path}',
  'm.checksite.missing': 'Falta: {path}',
  'm.checksite.noList': 'Eso no es una lista de versión.',
  'm.checksite.otherList': 'Esa lista es de otra versión, no de la que dice ser este sitio.',
  'm.checksite.uncommitted':
    'Esta versión se hizo con código con cambios aún sin confirmar, así que sus archivos no son exactamente el código publicado en ese commit.',
};

/** The public test site (en-testchain.ts), in this language. Draft, like the rest of this file. */
export const esTestchain: Strings = {
  'm.hero.status':
    'Este es el sitio de prueba: los sellos de fecha, los códigos de laboratorio y los enlaces para probarlo funcionan de verdad, en la red de pruebas de Midnight. Los registros de aquí son de práctica, no evidencia.',
  'm.claims.status':
    'Un segundo contrato de Midnight. Pasó todas las comprobaciones de extremo a extremo en la red de pruebas preprod de Midnight el 4 de octubre de 2026, con datos de marcadores inventados, y está en la red principal de Midnight desde el 8 de octubre de 2026. Todavía no está en este sitio web.',
  'm.faq.3a':
    'Está hecho para servir como prueba, y nuestra nota para abogados dice qué prueba y qué no. Este sitio de prueba fecha los registros en la red de pruebas de Midnight, y una fecha en una red de pruebas no tiene valor probatorio. Los registros reales van en veilcore.org, que funciona en la red principal de Midnight.',
  'm.stat2.b': 'Sitio de prueba',
  'm.stat2.s':
    'Este sitio funciona en una red de pruebas de Midnight, para practicar. Ambos contratos están en la red principal de Midnight desde el 8 de octubre de 2026.',
  'm.foot.about':
    'Un formato de registro abierto para genética vegetal y animal. Este es el sitio de prueba, en una red de pruebas de Midnight; veilcore.org funciona en la red principal de Midnight.',
  'm.for.1p':
    'Selle un registro y vincule su informe de ADN. Si la planta aparece con otro nombre, un laboratorio puede comparar una prueba nueva con su informe. En este sitio de prueba puede fechar el vínculo desde su navegador, y nadie puede copiarlo a su propio registro. VeilCore no hace pruebas de ADN.',
  'm.demo.lede':
    'Sin registro, sin billetera. Este es el sitio de prueba, así que use datos inventados. Los lotes se anclan automáticamente en la red de pruebas de Midnight, y eso fecha sus registros. El acuse de recibo de un laboratorio es una firma real con la propia clave del laboratorio, guardada fuera de la cadena. Las licencias y los acuerdos de laboratorio son solo de práctica.',
  'm.privacy.test.text':
    'Este sitio usa la red de pruebas preprod de Midnight, no la principal. Su navegador envía cada sello de fecha a esa red a través del servicio de tarifas de VeilCore; lo que usted escribió y sus archivos nunca se envían allí. Una red de pruebas puede reiniciarse, y los datos de prueba pueden borrarse.',
  'm.privacy.hosts.text':
    'Este sitio web está alojado en Vercel, que registra direcciones IP y solicitudes. Nuestro servidor de registros, y el servicio que paga las tarifas de la red de pruebas y transmite las lecturas de la red de esta página, funcionan en Railway, que registra solicitudes. Ese servicio lee la red a través de Blockfrost.',
  'm.tech.check.p':
    'Recalcular el código de prueba de un registro solo requiere SHA-256 y la especificación abierta. Su prueba de inclusión une ese código de prueba con el código de prueba de un lote anclado en Midnight, y la transacción que lo ancló da la fecha del lote. El verify.html del paquete de evidencia rehace ese cálculo sin conexión y nombra la transacción y el código de prueba del lote que hay que buscar. La página de comprobación consulta esa transacción en Midnight por sí misma cuando puede llegar a Midnight. Los registros sellados desde el 14 de octubre nombran su propia clave, así que comprobarlos también requiere la sección 3.6.1, publicada en la especificación de este sitio; el SDK y sus tres implementaciones la incorporarán en su próxima versión. Buscar un registro por su identificador en este sitio usa nuestro servidor.',
};
