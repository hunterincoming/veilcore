// Spanish (Latin American neutral). DRAFT: machine-assisted, to be checked by a fluent speaker before publishing.
// SPDX-License-Identifier: Apache-2.0
import type { Strings } from './en';

export const es: Strings = {
  // Header and footer
  'nav.language': 'Idioma',
  'footer.documents': 'Documentos',
  'footer.spec': 'Especificación',
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
    'Traducción preliminar, aún no revisada por un hablante nativo. La página en inglés es la versión de referencia.',
  'draft.showEnglish': 'Ver en inglés',
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
  'm.hero.demoLabel': 'Demo de huella en vivo',
  'm.hero.fpUpdated': 'Huella actualizada',
  'm.hero.typed': 'Lo que usted escribe',
  'm.hero.goes': 'Lo que va a Midnight',
  'm.foot.demo': 'Demo',
  'm.step1.n': '01 · Registro',
  'm.step2.n': '02 · Huella',
  'm.step3.n': '03 · Anclaje',
  'm.step4.n': '04 · Verificación',
  'm.step4.title': 'Muéstrelo después',
  'm.demo.label': 'Demo',
  'm.demo.title1': 'Elija cómo',
  'm.demo.title2': 'quiere verlo.',
  'm.demo.create.title': 'Registrar una planta',
  'm.demo.create.text': 'Registre una planta inventada, guarde su copia de seguridad y vea la página de su planta.',
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
  'm.status.title1': 'Con franqueza sobre',
  'm.status.title2': 'dónde estamos.',
  'm.status.lede': 'Lo que está hecho y lo que aún no.',
  'm.stat3.b': 'Sin auditoría',
  'm.status.keyTitle': 'Quién puede cambiar el contrato.',
  'm.status.keyText':
    'Una clave de mantenimiento puede cambiar cómo funciona el contrato de VeilCore en Midnight. Quien la tenga puede añadir o reemplazar operaciones del contrato, lo que podría permitirle tomar el control de la identidad de cualquier registro, añadir licencias en nombre de cualquier emisor, añadir o quitar obligaciones y vínculos de parentesco, o desactivar operaciones. No puede antedatar los tiempos de bloque de la red, y cada cambio queda a la vista en la cadena. Hoy la clave está en papel, una copia en manos de cada fundador, y cualquiera de las dos copias basta por sí sola para usarla. Pasarla a un grupo de claves que deban estar de acuerdo está previsto, pero aún no está hecho. Cada uso se anuncia públicamente, según una política de mantenimiento escrita.',
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
  'm.privacy.stored.title': 'Se guarda en nuestro servidor de pruebas',
  'm.privacy.stored.text':
    'Lo que usted escribe y lo que su navegador calcula a partir de ello: nombres de cultivares y de obtentores, la especie si la indica, fechas, notas, números de referencia, progenitores, huellas de registros, huellas de las fotos e informes de laboratorio que usted añade (solo las huellas, nunca los archivos), nombres de archivo de los informes de laboratorio, términos y contrapartes de los acuerdos, el material que envía a un laboratorio (a quién va dirigido y la cantidad) y, en el caso de los laboratorios, la clave pública de firma y las atestaciones que publican. También su clave de titular, que su navegador envía cada vez que guarda para que el servidor encuentre sus registros. Informes de laboratorio cerrados que un laboratorio le envía: se guardan sin que podamos leerlos y se borran a los 180 días. El servidor es el registro de pruebas de VeilCore, alojado en Railway.',
  'm.privacy.local.title': 'Nunca sale de su navegador',
  'm.privacy.local.text':
    'Los datos genéticos, y los informes de laboratorio, informes de ADN y fotos que usted añade. Su navegador los lee para calcular sus huellas; los archivos en sí nunca se suben. Un informe de laboratorio llega a nuestro servidor solo cuando un laboratorio se lo devuelve, cerrado para que solo usted pueda abrirlo.',
  'm.privacy.test.title': 'Una red de pruebas',
  'm.privacy.test.text':
    'La demo usa la red de pruebas de Midnight, no la red en producción. Los datos de la demo pueden borrarse cuando se reinicie la red de pruebas.',
  'm.privacy.madeup.title': 'Use datos inventados',
  'm.privacy.madeup.text':
    'Por favor, no ingrese nombres reales, variedades reales ni nada confidencial. La demo sirve para probar el formato.',
  'm.privacy.export.title': 'Exportar',
  'm.privacy.export.text':
    'Su página de registros tiene un botón «Export» que descarga los registros que tiene este navegador. Una descarga única de todo lo que nuestro servidor guarda de usted está en camino; todavía no está disponible.',
  'm.privacy.delete.title': 'Eliminación',
  'm.privacy.delete.text':
    'Para que eliminemos sus datos de la demo de nuestro servidor, escriba a hunter@veilcore.org con los identificadores de sus registros.',
  'm.privacy.browser.title': 'Se guarda en su navegador',
  'm.privacy.browser.text':
    'Su navegador guarda, en este dispositivo: su clave de titular (también se envía una copia a nuestro servidor, como se indica arriba), la clave de firma de un laboratorio si configuró una (su parte privada nunca sale de este dispositivo), el rol que eligió y su idioma. Para borrarlos, elimine los datos de este sitio en la configuración de su navegador. Guarde antes su clave de titular: sin ella, este navegador ya no podrá encontrar sus registros.',
  'm.privacy.hosts.title': 'Alojamiento',
  'm.privacy.hosts.text':
    'Este sitio web está alojado en Vercel, que registra direcciones IP y solicitudes. Nuestro servidor de registro funciona en Railway, que registra solicitudes.',
  'm.privacy.who.title': 'Quién lo guarda y durante cuánto tiempo',
  'm.privacy.who.text':
    'VeilCore aún no está constituida como empresa; sus fundadores gestionan este sitio y el registro. Los informes de laboratorio cerrados se borran 180 días después de llegar. Nada más tiene un plazo de conservación fijado: se queda hasta que nos pida que lo eliminemos. Contacto: hunter@veilcore.org.',
  'm.notfound.title': 'Página no encontrada.',
  'm.notfound.text':
    'No hay ninguna página en esta dirección. Si alguien le dio un enlace a un registro, compruebe que esté completo.',
  'm.notfound.home': 'Inicio de VeilCore →',
  'm.privacy.contact': 'Preguntas: hunter@veilcore.org',
  // Round 2 truth pass (14 Oct 2026): keys added or newly translated.
  'm.hero.lede':
    'Para obtentores, empresas de semillas y laboratorios que trabajan con genética vegetal y animal. Los datos genéticos nunca salen de su computadora. Solo una huella va a Midnight, que la fecha. El nombre de la planta y el obtentor que usted escribe se guardan en el servidor de VeilCore, y cualquiera que tenga el enlace de un registro ve su nombre. Un informe de laboratorio llega a nuestro servidor solo cuando un laboratorio se lo devuelve, cerrado para que solo usted pueda abrirlo. Verificar es gratis. Sin registro, sin billetera.',
  'm.for.3p':
    'Envíe material con un código de laboratorio. Cuando el laboratorio lo ingresa, firma un acuse de recibo con su propia clave, así el registro muestra a una segunda parte, lo que protege al laboratorio tanto como al cliente. El acuse es una firma real, guardada por el servidor de registros de VeilCore, no en la cadena. Condiciones como el uso previsto, la prohibición de propagar y la devolución o destrucción posterior son solo de práctica en la demo web.',
  'm.get.1b': 'para un registro de lo que usted tiene, sin mostrar su genética.',
  'm.get.3b':
    'Un vínculo de parentesco cuenta solo cuando ambos titulares lo confirman. En este sitio lo anota el servidor de registros de VeilCore, no la cadena.',
  'm.open.2t': 'Verificar un registro no depende de nosotros.',
  'm.open.2p':
    'Guarde dos archivos desde la página de su planta: el registro exportado y su prueba de inclusión (un archivo pequeño que muestra que el registro está en un lote fechado). Con ambos, cualquiera puede verificarlo con SHA-256, la especificación abierta y una consulta en un explorador de Midnight, aunque VeilCore ya no exista. Su archivo de respaldo contiene sus claves, no estos archivos. La fecha en Bitcoin necesita un tercer archivo, el archivo de sello de Bitcoin del lote, que hoy solo está en nuestro servidor.',
  'm.faq.1a':
    'Una vez anclados los registros, cualquiera puede comprobar cuál se ancló primero. Vincule su informe de laboratorio, para que una prueba posterior pueda compararse con él. Cuando envíe material, el receptor firma un acuse de recibo con su propia clave. Un registro es una prueba, no una inscripción: muestra que usted tenía este registro en esa fecha, no que tenía la planta, y por sí solo no resuelve una disputa.',
  'm.faq.5a':
    'Las fechas permanecen: nadie, ni siquiera nosotros, puede borrar la huella de un lote anclada en la red principal de Midnight o sellada en Bitcoin. Para verificar un registro sin nosotros, necesita dos archivos que solo tiene nuestro servidor mientras usted no los guarde: el registro («Export record») y su prueba de inclusión («Download inclusion proof»), ambos en la página de su planta, en «Technical details». Su archivo de respaldo contiene sus claves, no estos archivos. Para comprobar la fecha en Bitcoin sin nosotros, también necesita el archivo de sello de Bitcoin del lote, que hoy solo está en nuestro servidor; la página de la planta no lo ofrece. La especificación es abierta y el código en TypeScript, Python y Rust está publicado. Pronto habrá un paquete de evidencia en un clic con todo esto.',
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
    'Los primeros lotes del servidor de registros se anclaron a mano en la red principal de Midnight. Uno de ellos, con cinco de nuestros propios registros de prueba, también tiene su raíz sellada en Bitcoin, en el bloque 971004. Aún falta comprobarlo con la herramienta oficial de OpenTimestamps.',
  'm.founders.lede':
    'VeilCore es un formato de registro probatorio para genética vegetal y animal. Prueba que usted tenía un registro de su material en una fecha determinada, sin entregar sus datos genéticos.',
  'm.live.label': 'Qué funciona dónde',
  'm.live.title1': 'Qué funciona,',
  'm.live.title2': 'y dónde.',
  'm.live.lede':
    'veilcore.org funciona en la red principal de Midnight, y los registros hechos allí son reales. El sitio de prueba es para practicar: allí funciona más, y sus registros no tienen valor probatorio.',
  'm.live.colMain': 'veilcore.org (red principal)',
  'm.live.colTest': 'Sitio de prueba',
  'm.live.colNot': 'Todavía no',
  'm.live.stamp.t': 'Un sello de fecha para su registro',
  'm.live.stamp.main':
    'Sí. VeilCore fecha los registros por lotes, a mano por ahora. Su navegador no envía nada a la cadena.',
  'm.live.stamp.test':
    'Sí. Los lotes se fechan automáticamente, y eso fecha su registro. Su navegador también pone un sello de fecha a la clave propia de su planta; ese sello fecha solo la clave.',
  'm.live.share.t': 'Elegir qué ven los demás',
  'm.live.share.main': 'Sí. El nombre de la planta siempre se muestra.',
  'm.live.share.test': 'Sí. El nombre de la planta siempre se muestra.',
  'm.live.lab.t': 'Código de laboratorio y acuse firmado',
  'm.live.lab.main':
    'Sí. El laboratorio firma con su propia clave. El servidor de registros de VeilCore guarda el acuse, no la cadena.',
  'm.live.lab.test': 'Sí, de la misma forma.',
  'm.live.results.t': 'Informes de laboratorio que solo usted abre',
  'm.live.results.test': 'Sí. Nuevo, todavía en pruebas.',
  'm.live.results.not': 'En veilcore.org: desactivado por ahora, primero en el sitio de prueba.',
  'm.live.dna.t': 'Una fecha para la vinculación de su informe de ADN',
  'm.live.dna.main': 'Se guarda con su registro, sin fecha.',
  'm.live.dna.test': 'Sí, enviada desde su navegador.',
  'm.live.prove.t': 'Probarlo con un enlace',
  'm.live.prove.test':
    'Sí. La página de la otra persona comprueba en la red que usted controla la clave propia del registro. El registro nombró esa clave al sellarse, así que no se puede cambiar por otra.',
  'm.live.prove.not': 'En veilcore.org: requiere que su navegador envíe una transacción.',
  'm.live.claims.t': 'Probar un solo hecho',
  'm.live.claims.main':
    'El contrato está en la red principal, sin clave de mantenimiento. El sitio web todavía no puede usarlo.',
  'm.live.claims.not': 'Usarlo desde el sitio web.',
  'm.live.lic.t': 'Licencias y regalías',
  'm.live.lic.main': 'Solo de práctica.',
  'm.live.lic.test': 'Solo de práctica.',
  'm.live.lic.not': 'Licencias reales desde el sitio web. Están integradas en el contrato.',
  // Round 3 (14 Oct 2026): the rest of the landing page, so no English shows through.
  'nav.newCultivar': 'Nuevo registro',
  'nav.licenses': 'Acuerdos',
  'footer.about':
    'Un formato de registro abierto para genética vegetal y animal. Recalcular la huella de un registro solo requiere SHA-256 y la especificación abierta; comprobar su fecha requiere además una consulta en un explorador de Midnight. Buscar un registro por su identificador en este sitio usa nuestro servidor.',
  'm.hero.status':
    'Lanzamiento en la red principal de Midnight. Hoy los registros se fechan en una red de pruebas de Midnight, lo que todavía no prueba nada.',
  'm.claims.status':
    'Un segundo contrato de Midnight, probado de extremo a extremo en la red de pruebas preprod de Midnight el 4 de octubre de 2026 con datos de marcadores inventados. Todavía no está en esta demo web ni en la red principal.',
  'm.faq.3a':
    'Está hecho para servir como prueba, y nuestra nota para abogados dice qué prueba y qué no. Hoy los registros se fechan en una red de pruebas de Midnight, y una fecha en una red de pruebas no tiene valor probatorio. El lanzamiento en la red principal está cerca.',
  'm.stat2.b': 'Red de pruebas',
  'm.stat2.s':
    'Ambos contratos se probaron de extremo a extremo en la red de pruebas preprod de Midnight. Todavía no están en la red principal.',
  'm.foot.about':
    'Un formato de registro abierto para genética vegetal y animal. Diseñado para anclarse en Midnight; en pruebas en una red de pruebas de Midnight.',
  'm.for.2p':
    'Los obtentores quieren usar sus marcadores para mostrar que una variedad es distinta, y tratan esos marcadores como secretos comerciales. Una prueba de VeilCore demuestra un hecho sobre ellos sin mostrar el resto. Ninguna oficina de examen ni entidad certificadora la acepta todavía; hemos escrito a algunas para preguntarles qué necesitarían.',
  'm.hero.note':
    'Escriba en cualquiera de los dos campos; no se envía nada. La línea verde es la huella, la parte que va a Midnight. Nadie puede deducir a partir de ella lo que usted escribió.',
  'm.hero.noteShort': 'Solo la línea verde va a Midnight.',
  'm.for.label': 'Para qué sirve',
  'm.for.title1': 'Muchas disputas sobre genética se reducen a una pregunta:',
  'm.for.title2': '¿qué tenía usted, y cuándo?',
  'm.for.lede':
    'Los cuadernos y archivos los fecha quien los lleva, así que es fácil ponerlos en duda. Registrar el material en sí significa entregar lo que usted quiere proteger. VeilCore da a su registro una fecha que nadie puede antedatar, y la genética se queda con usted.',
  'm.for.1t': 'Un esqueje sale por la puerta.',
  'm.for.1p':
    'Selle un registro y vincule su informe de ADN. Si la planta aparece con otro nombre, un laboratorio puede comparar una prueba nueva con su informe. Cuando vincula a través del contrato de VeilCore en Midnight, la vinculación también queda fechada: muestra que quien controlaba su registro en esa fecha tenía ese informe, o su SHA-256, para entonces. Lo que va a la cadena está atado a su registro y oculta el informe, así que nadie puede copiar su vinculación a su propio registro. En esta demo web la vinculación se guarda con su registro, pero todavía no se fecha. VeilCore no hace pruebas de ADN.',
  'm.for.2t': 'Protección de variedades y certificación.',
  'm.for.2link': 'Cómo funciona una prueba →',
  'm.for.3t': 'Material en manos de un laboratorio.',
  'm.for.4t': 'Resultados de laboratorio, de vuelta a usted.',
  'm.for.4p':
    'El laboratorio firma sus resultados y los cierra para que solo usted pueda abrirlos. Ningún PDF queda en la bandeja de entrada de nadie: VeilCore solo guarda el archivo cerrado. La firma cubre exactamente ese archivo y el registro al que se refiere. VeilCore anota quién firmó; no responde por el resultado. Nuevo, y todavía en pruebas.',
  'm.for.6t': 'Alguien le pide una prueba.',
  'm.for.6p':
    'Le envían un enlace. Usted toca una vez, y la página de la otra persona comprueba en la red que usted controla la clave propia de su planta. Su registro nombró esa clave al sellarse, así que no se puede cambiar por otra. No dice nada sobre quién es usted ni sobre quién obtuvo la planta. Por ahora esto funciona en una red de pruebas de Midnight.',
  'm.for.5t': 'Líneas animales.',
  'm.for.5p':
    'Los libros genealógicos guardan el pedigrí. Un registro puede dar a cada entrada una fecha que nadie puede antedatar, sin publicar el genotipo. El formato cubre animales; esta demo está preparada para plantas, y los campos de los registros animales aún no están publicados.',
  'm.for.5ask': 'Si usted cría animales, díganos qué necesitan sus registros.',
  'm.how.label': 'Cómo funciona',
  'm.how.title1': 'Cuatro pasos.',
  'm.how.title2': 'La genética se queda con usted.',
  'm.step1.title': 'Anótelo',
  'm.step1.text': 'Qué es y de dónde viene. Añada informes de laboratorio como archivos.',
  'm.step2.title': 'Saque su huella',
  'm.step2.text': 'En su computadora. Los datos genéticos nunca salen de ella.',
  'm.step3.title': 'Obtenga una fecha',
  'm.step3.text':
    'Solo la huella va a Midnight, en un lote con otras. La fecha es el bloque en el que entra el lote: muestra que el registro existía para entonces.',
  'm.step4.text': 'Entrégueselo a un comprador, un examinador o un tribunal. Pueden comprobarlo gratis y sin cuenta.',
  'm.claims.label': 'Probar un hecho',
  'm.claims.title1': 'Muestre la respuesta.',
  'm.claims.title2': 'Guarde los datos.',
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
  'm.claims.statusTitle': 'Estado.',
  'm.claims.link': 'Cómo funcionan las pruebas, en la especificación →',
  'm.get.label': 'Qué hace',
  'm.get.title1': 'Lo que obtiene,',
  'm.get.title2': 'y dónde se detiene.',
  'm.get.title': 'Lo que obtiene',
  'm.get.1a': 'Una fecha que nadie puede antedatar,',
  'm.get.2a': 'Condiciones que viajan con el registro.',
  'm.get.2b':
    'Las licencias y los acuerdos de laboratorio se adjuntan al registro. Un licenciatario puede probar que tiene una licencia vigente sin mostrar cuál. Una obligación sobre un progenitor, como una regalía, aparece en cada descendiente que ambos titulares confirmaron; VeilCore la anota y no la cobra. Probado en una red de pruebas de Midnight; simulado en la demo web.',
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
  'm.open.title1': 'Hecho para',
  'm.open.title2': 'sobrevivirnos.',
  'm.open.1t': 'Una especificación abierta, tres implementaciones.',
  'm.open.1p':
    'Libre de implementar, para siempre. TypeScript, Python y Rust coinciden en los 100 vectores de prueba del formato de registro (Rust aún no ejecuta el más reciente, de vinculación de informes), y cualquiera puede ejecutarlos. Escribimos las tres; una escrita por otra persona es la prueba que más deseamos.',
  'm.open.1link': 'Las tres implementaciones →',
  'm.open.3t': 'No respondemos por los resultados.',
  'm.open.3p':
    'Un registro muestra qué clave lo firmó, el nombre y el organismo de acreditación registrados con esa clave, y si el operador de VeilCore ha cotejado ese nombre con un listado público de licencias o acreditaciones, y en qué fecha. VeilCore no responde por ningún laboratorio: quien comprueba un registro decide cuánto vale una firma.',
  'm.open.4t': 'Cualquiera puede gestionar un servidor de registros.',
  'm.open.4p':
    'El formato permite que un laboratorio, una entidad certificadora o un organismo de derechos gestione el suyo, con su propio dominio web y sus propias definiciones de campos, y ancle sin pedirnos permiso. El código de nuestro propio servidor de registros no está publicado.',
  'm.open.5t': 'Comprobar es gratis, siempre.',
  'm.open.5p': 'Sin cuenta ni pago, para nadie.',
  'm.faq.label': 'Preguntas',
  'm.faq.title1': 'Preguntas',
  'm.faq.title2': 'que nos hacen.',
  'm.faq.1q': '¿Qué impide que alguien registre mi cultivar?',
  'm.faq.2q': '¿Necesito criptomonedas o una billetera?',
  'm.faq.2a':
    'No. Crear un registro en la demo y comprobar cualquier registro no requieren billetera, ni darse de alta, ni comprar nada. Su navegador guarda una clave aleatoria que encuentra sus registros de demo en nuestro servidor. La huella va a Midnight, una blockchain hecha para la privacidad. Usted nunca trata con ella directamente.',
  'm.faq.3q': '¿Se sostendrá en una disputa?',
  'm.faq.3link': 'Los registros como prueba →',
  'm.faq.4q': '¿Qué ven ustedes de mis datos?',
  'm.faq.4a':
    'De sus datos genéticos: nada. Su huella se calcula en su computadora, igual que la de los archivos que usted añade, y no se suben. Un informe de laboratorio llega a nuestro servidor solo cuando un laboratorio se lo devuelve: va cerrado para que solo usted pueda abrirlo, y se borra a los 180 días. Este sitio guarda lo que usted escribe (nombres, fechas, notas, términos de acuerdos) y los nombres de sus archivos de laboratorio, para que pueda volver a ellos, y la página pública de comprobación de un registro muestra su nombre de cultivar. Los laboratorios y desarrolladores pueden sellar registros dentro de sus propios sistemas, de modo que solo sale la huella.',
  'm.faq.4link1': 'Lo que guarda la demo →',
  'm.faq.4link2': 'Guía de integración →',
  'm.faq.5q': '¿Y si VeilCore desaparece?',
  'm.faq.6q': '¿Cuánto cuesta?',
  'm.faq.6a': 'Crear un registro en este sitio no cuesta nada hoy. Comprobar un registro es gratis, siempre.',
  'm.demo.lede':
    'Sin registro, sin billetera. Es una versión de prueba, así que use datos inventados. Los registros se anclan por lotes, a mano por ahora; las licencias y los acuerdos de laboratorio son simulados, y las vinculaciones de informes de ADN todavía no se fechan.',
  'm.demo.privacy': 'Lo que guarda la demo →',
  'm.updates.more': 'Todas las novedades',
  'm.stat1.b': '100 / 100',
  'm.stat1.s':
    'vectores de prueba del formato de registro superados en TypeScript, Python y Rust en GitHub (un solo autor escribió las tres; TypeScript está en npm como 0.15.0). Un 101.º, de vinculación de informes, aún no está en Rust',
  'm.stat3.s': 'Todavía no hay una auditoría de seguridad independiente. Nuestras propias revisiones son públicas.',
  'm.stat4.b': 'Buscamos primeros usuarios',
  'm.stat4.s': 'Nadie lo usa todavía para registros reales. Buscamos a los primeros obtentores y laboratorios.',
  'm.addr.title': 'Los contratos, para quien quiera comprobarlos.',
  'm.addr.main': 'Contrato principal',
  'm.addr.claims': 'Contrato de pruebas de un hecho',
  'm.addr.claimsPending': 'Todavía no está en la red principal.',
  'm.addr.explorer': 'Consúltelos en midnightexplorer.com (gestionado por TexLabs) →',
  'm.live.btc.t': 'También un sello de fecha en Bitcoin',
  'm.live.btc.main':
    'Sí. Nuestro servidor de registros estampa en Bitcoin la huella de cada lote sellado, con OpenTimestamps. El primero entró en el bloque 971004 de Bitcoin el 11 de octubre; aún falta comprobarlo con la herramienta oficial de OpenTimestamps.',
  'm.live.btc.not': 'Obtener el archivo de sello desde el sitio web. Hoy solo está en nuestro servidor.',
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
    'Un registro de VeilCore describe material genético sin incluir la genética. Solo se publica su huella, y recibe una fecha una vez anclada en Midnight. Comprobar uno es gratis y no requiere cuenta.',
  'm.verify.home': '¿Qué es VeilCore? →',
  'm.verify.example': '¿No sabe qué verá? Mire primero un ejemplo →',
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
    'Este sitio funciona en la red de pruebas preprod de Midnight, para practicar. Ambos contratos están en la red principal de Midnight desde el 8 de octubre de 2026.',
  'm.foot.about':
    'Un formato de registro abierto para genética vegetal y animal. Este es el sitio de prueba, en una red de pruebas de Midnight; veilcore.org funciona en la red principal de Midnight.',
  'm.for.1p':
    'Selle un registro y vincule su informe de ADN. Si la planta aparece con otro nombre, un laboratorio puede comparar una prueba nueva con su informe. Cuando vincula a través del contrato de VeilCore en Midnight, la vinculación también queda fechada: muestra que quien controlaba su registro en esa fecha tenía ese informe, o su SHA-256, para entonces. Lo que va a la cadena está atado a su registro y oculta el informe, así que nadie puede copiar su vinculación a su propio registro. En este sitio de prueba puede fechar la vinculación desde su navegador. VeilCore no hace pruebas de ADN.',
  'm.demo.lede':
    'Sin registro, sin billetera. Este es el sitio de prueba, así que use datos inventados. Los lotes se anclan automáticamente en la red de pruebas de Midnight, y eso fecha sus registros. Su navegador también pone un sello de fecha a la clave propia de cada planta, que fecha solo la clave (VeilCore paga la tarifa). También puede fechar la vinculación de un informe de ADN. El acuse de un laboratorio es una firma real con la propia clave del laboratorio, guardada fuera de la cadena. Las licencias y los acuerdos de laboratorio son solo de práctica.',
  'm.privacy.test.text':
    'Este sitio usa la red de pruebas preprod de Midnight, no la principal. Su navegador envía cada sello de fecha a esa red a través del servicio de tarifas de VeilCore; lo que usted escribió y sus archivos nunca se envían allí. Una red de pruebas puede reiniciarse, y los datos de prueba pueden borrarse.',
  'm.privacy.hosts.text':
    'Este sitio web está alojado en Vercel, que registra direcciones IP y solicitudes. Nuestro servidor de registros, y el servicio que paga las tarifas de la red de pruebas y transmite las lecturas de la red de esta página, funcionan en Railway, que registra solicitudes. Ese servicio lee la red a través de Blockfrost.',
};
