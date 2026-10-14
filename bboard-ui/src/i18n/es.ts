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
  'm.hero.title1': 'Demuestre que lo tuvo primero.',
  'm.hero.title2': 'Sin mostrarle a nadie su genética.',
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
    'Lo que usted escribe y lo que su navegador calcula a partir de ello: nombres de cultivares y de obtentores, la especie si la indica, fechas, notas, números de referencia, progenitores, huellas de registros, fotos e informes de laboratorio, nombres de archivo de los informes de laboratorio, términos y contrapartes de los acuerdos, el material que envía a un laboratorio (a quién va dirigido y la cantidad) y, en el caso de los laboratorios, la clave pública de firma y las atestaciones que publican. También su clave de titular, que su navegador envía cada vez que guarda para que el servidor encuentre sus registros. El servidor es el registro de pruebas de VeilCore, alojado en Railway.',
  'm.privacy.local.title': 'Nunca sale de su navegador',
  'm.privacy.local.text':
    'Los datos genéticos, los archivos de informes de laboratorio y de ADN, y las fotos. Su navegador los lee para calcular sus huellas. Los archivos en sí nunca se suben.',
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
    'VeilCore aún no está constituida como empresa; sus fundadores gestionan este sitio y el registro. No hay un plazo de conservación fijado: lo que guarda el registro se queda allí hasta que nos pida que lo eliminemos. Contacto: hunter@veilcore.org.',
  'm.notfound.title': 'Página no encontrada.',
  'm.notfound.text':
    'No hay ninguna página en esta dirección. Si alguien le dio un enlace a un registro, compruebe que esté completo.',
  'm.notfound.home': 'Inicio de VeilCore →',
  'm.privacy.contact': 'Preguntas: hunter@veilcore.org',
  // Round 2 truth pass (14 Oct 2026): keys added or newly translated.
  'm.hero.lede':
    'Para obtentores, empresas de semillas y laboratorios que trabajan con genética vegetal y animal. Los datos genéticos y los archivos de laboratorio nunca salen de su computadora. Solo una huella va a Midnight, que la fecha. El nombre de la planta y el obtentor que usted escribe se guardan en el servidor de VeilCore, y cualquiera que tenga el enlace de un registro ve su nombre. Verificar es gratis. Sin registro, sin billetera.',
  'm.for.3p':
    'Envíe material con un código de laboratorio. Cuando el laboratorio lo ingresa, firma un acuse de recibo con su propia clave, así el registro muestra a una segunda parte, lo que protege al laboratorio tanto como al cliente. El acuse es una firma real, guardada por el servidor de registros de VeilCore, no en la cadena. Condiciones como el uso previsto, la prohibición de propagar y la devolución o destrucción posterior son solo de práctica en la demo web.',
  'm.get.1b': 'para un registro de lo que usted tiene, sin mostrar su genética.',
  'm.get.3b':
    'Un vínculo de parentesco cuenta solo cuando ambos titulares lo confirman. En este sitio lo anota el servidor de registros de VeilCore, no la cadena.',
  'm.open.2t': 'Verificar un registro no depende de nosotros.',
  'm.open.2p':
    'Guarde dos archivos desde la página de su planta: el registro exportado y su prueba de inclusión (un archivo pequeño que muestra que el registro está en un lote fechado). Con ambos, cualquiera puede verificarlo con SHA-256, la especificación abierta y una consulta en un explorador de Midnight, aunque VeilCore ya no exista. Su archivo de respaldo contiene sus claves, no estos archivos.',
  'm.faq.1a':
    'Una vez anclados los registros, cualquiera puede comprobar cuál se ancló primero. Vincule su informe de laboratorio, para que una prueba posterior pueda compararse con él. Cuando envíe material, el receptor lo confirma con su propia clave. Un registro es una prueba, no una inscripción: muestra que usted tenía este registro en esa fecha, no que tenía la planta, y por sí solo no resuelve una disputa.',
  'm.faq.5a':
    'Las fechas permanecen: nadie, ni siquiera nosotros, puede borrar la huella de un lote anclada en la red principal de Midnight o sellada en Bitcoin. Para verificar un registro sin nosotros, necesita dos archivos que solo tiene nuestro servidor mientras usted no los guarde: el registro («Export record») y su prueba de inclusión («Download inclusion proof»), ambos en la página de su planta, en «Technical details». Su archivo de respaldo contiene sus claves, no estos archivos. La especificación es abierta y el código en TypeScript, Python y Rust está publicado. Pronto habrá un paquete de evidencia en un clic.',
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
  'm.live.stamp.test': 'Sí. Su navegador sella cada registro, y los lotes se fechan automáticamente.',
  'm.live.share.t': 'Elegir qué ven los demás',
  'm.live.share.main': 'Sí. El nombre de la planta siempre se muestra.',
  'm.live.share.test': 'Sí. El nombre de la planta siempre se muestra.',
  'm.live.lab.t': 'Código de laboratorio y acuse firmado',
  'm.live.lab.main':
    'Sí. El laboratorio firma con su propia clave. El servidor de registros de VeilCore guarda el acuse, no la cadena.',
  'm.live.lab.test': 'Sí, de la misma forma.',
  'm.live.results.t': 'Informes de laboratorio que solo usted abre',
  'm.live.results.test': 'Sí. Nuevo, todavía en pruebas.',
  'm.live.results.not': 'En veilcore.org.',
  'm.live.dna.t': 'Una fecha para la vinculación de su informe de ADN',
  'm.live.dna.main': 'Se guarda con su registro, sin fecha.',
  'm.live.dna.test': 'Sí, enviada desde su navegador.',
  'm.live.prove.t': 'Probarlo con un enlace',
  'm.live.prove.test': 'Sí. La página de la otra persona comprueba en la red que usted tiene el registro.',
  'm.live.prove.not': 'En veilcore.org: requiere que su navegador envíe una transacción.',
  'm.live.claims.t': 'Probar un solo hecho',
  'm.live.claims.main':
    'El contrato está en la red principal, sin clave de mantenimiento. El sitio web todavía no puede usarlo.',
  'm.live.claims.not': 'Usarlo desde el sitio web.',
  'm.live.lic.t': 'Licencias y regalías',
  'm.live.lic.main': 'Solo de práctica.',
  'm.live.lic.test': 'Solo de práctica.',
  'm.live.lic.not': 'Licencias reales desde el sitio web. Están integradas en el contrato.',
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
    'Sin registro, sin billetera. Este es el sitio de prueba, así que use datos inventados. Su navegador sella cada registro en la red de pruebas de Midnight (VeilCore paga la tarifa), y los lotes se anclan automáticamente. También puede fechar la vinculación de un informe de ADN. El acuse de un laboratorio es una firma real con la propia clave del laboratorio, guardada fuera de la cadena. Las licencias y los acuerdos de laboratorio son solo de práctica.',
  'm.privacy.test.text':
    'Este sitio usa la red de pruebas preprod de Midnight, no la principal. Su navegador envía cada sello de fecha a esa red a través del servicio de tarifas de VeilCore; lo que usted escribió y sus archivos nunca se envían allí. Una red de pruebas puede reiniciarse, y los datos de prueba pueden borrarse.',
  'm.privacy.hosts.text':
    'Este sitio web está alojado en Vercel, que registra direcciones IP y solicitudes. Nuestro servidor de registros, y el servicio que paga las tarifas de la red de pruebas y transmite las lecturas de la red de esta página, funcionan en Railway, que registra solicitudes. Ese servicio lee la red a través de Blockfrost.',
};
