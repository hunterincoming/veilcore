// Spanish (Latin American neutral). Published: machine-assisted, reviewed against native official sources (docs/i18n-glossary.md).
// SPDX-License-Identifier: Apache-2.0
import type { Strings } from './en';

export const es: Strings = {
  // Header and footer
  'nav.language': 'Idioma',
  'nav.main': 'Principal',
  'nav.home': 'Inicio de VeilCore',
  'footer.documents': 'Documentos',
  'footer.spec': 'Especificación',
  'footer.partners': 'Exigir un registro',
  'footer.evidence': 'Registros como prueba',
  'footer.integrate': 'Guía de integración',
  'footer.source': 'Código fuente',
  'footer.allImplementations': 'Las tres implementaciones',
  'footer.referenceImplementation': 'Implementación de referencia',
  'footer.rustImplementation': 'Implementación en Rust',
  'footer.siteCode': 'Código de este sitio',
  'footer.thisSite': 'Este sitio',
  'footer.yourRecords': 'Sus registros',
  'footer.agreements': 'Acuerdos',
  'footer.privacy': 'Privacidad de la demo',
  'title.help': 'Ayuda',
  'title.status': 'Estado del servicio',
  'footer.help': 'Ayuda',
  'm.help.title': 'Ayuda',
  'm.help.lede':
    'Respuestas breves para crear, guardar, mostrar y comprobar un registro. Cada una dice lo que este sitio hace hoy.',
  'm.help.start.t': 'Para empezar',
  'm.help.start.1q': '¿Qué es un registro de VeilCore?',
  'm.help.start.1a':
    'Una descripción fechada de algo que usted tiene: una planta, un animal, una cepa o línea celular, o un documento. Su navegador la convierte en un código de prueba corto, y ese código se fecha en Midnight en un lote junto con otros. Muestra que quien lo selló ya tenía el registro a esa fecha. No muestra quién tiene derechos sobre nada, ni muestra que lo que dice el registro sea cierto.',
  'm.help.start.2q': '¿Qué necesito?',
  'm.help.start.2a':
    'Un teléfono o una computadora con un navegador actual. Sin billetera, sin darse de alta y sin comprar nada. Para demostrar un solo número de un registro hace falta una computadora: en teléfonos aún no se ha probado.',
  'm.help.start.3q': '¿Cuánto cuesta?',
  'm.help.start.3a': 'Crear un registro en este sitio y comprobar cualquier registro son gratis.',
  'm.help.make.t': 'Crear un registro',
  'm.help.make.1q': '¿Qué tipo de registro elijo?',
  'm.help.make.1a':
    'Elija lo que es. Una planta: un cultivar o una línea. Un animal: un animal o una línea. Una cepa o línea: microbios, hongos, líneas celulares, líneas de insectos. Un documento: un permiso, un certificado, un contrato o un informe, sellado como archivo. Un lote de cultivo o un lote de cosecha: un paso de una cadena de producción, vinculado al registro anterior.',
  'm.help.make.2q': '¿Qué debo dejar fuera?',
  'm.help.make.2a':
    'Los datos personales de otras personas. Lo que usted escribe se guarda cifrado en nuestro servidor, y no tenemos la clave. Pero la persona con quien comparta un registro ve lo que usted decidió compartir, y el enlace de comprobación de un documento muestra todo lo que se escribió en él (título, titular, emisor, referencia, notas), el nombre del archivo y su SHA-256. Ponga nombres sencillos a los archivos, como «Permiso 2026.pdf». O guarde un documento solo en este dispositivo: entonces no se envía nada de lo que escribe.',
  'm.help.make.3q': '¿Cómo sé que mi registro está fechado?',
  'm.help.make.3a':
    'La página del registro muestra «Registro fechado» con la fecha cuando su lote está en Midnight. Antes de eso dice «en el próximo lote». En ambos casos el registro está guardado. Hasta que el lote esté en Midnight, su fecha depende solo de su palabra.',
  'm.help.backup.t': 'Su copia de seguridad',
  'm.help.backup.1q': '¿Por qué el sitio insiste en que guarde una copia de seguridad?',
  'm.help.backup.1a':
    'El archivo de copia de seguridad es la única forma de demostrar que usted tiene sus registros, y la única forma de recuperarlos en un teléfono o una computadora nuevos. VeilCore no puede recuperarlo ni crear otro.',
  'm.help.backup.2q': '¿Dónde debo guardarlo?',
  'm.help.backup.2a':
    'En una memoria USB o en un gestor de contraseñas, y además en un segundo lugar. Quien tenga el archivo puede abrir sus registros y actuar en su nombre. Agregue una contraseña al guardarlo: así el archivo por sí solo no abre nada. Si olvida la contraseña, nadie puede abrir el archivo, tampoco nosotros.',
  'm.help.backup.3q': 'Perdí mi copia de seguridad. ¿Y ahora?',
  'm.help.backup.3a':
    'Si este navegador todavía tiene sus registros, guarde ahora una copia de seguridad nueva. Si no, nadie puede abrir las copias cifradas en nuestro servidor, tampoco VeilCore. El sitio le ofrecerá borrarlas y empezar con una clave nueva. Los registros ya fechados siguen fechados, pero usted ya no puede demostrar que son suyos.',
  'm.help.backup.4q': '¿Cómo paso a un teléfono o una computadora nuevos?',
  'm.help.backup.4a': 'Abra «Recupere sus registros» en el dispositivo nuevo y elija su archivo de copia de seguridad.',
  'm.help.backup.4link': 'Recupere sus registros →',
  'm.help.backup.5q': 'Mis registros desaparecieron del navegador.',
  'm.help.backup.5a':
    'Los navegadores pueden borrar los datos guardados de un sitio. Safari puede hacerlo tras 7 días sin visitas. Su archivo de copia de seguridad lo recupera todo.',
  'm.help.show.t': 'Mostrar un registro a alguien',
  'm.help.show.1q': '¿Cómo muestro mi registro a alguien?',
  'm.help.show.1a':
    'Abra el certificado del registro y copie su enlace para enviarlo. Quien lo abra puede comprobar la fecha por su cuenta, gratis y sin cuenta. El enlace muestra el nombre del registro solo si usted lo activa.',
  'm.help.show.2q': '¿Cómo muestro un documento?',
  'm.help.show.2a':
    'Envíe el enlace de comprobación junto con el archivo. El navegador de la otra persona compara el archivo con el registro sellado, byte por byte, y muestra desde cuándo lo tenía usted. Su copia del archivo no se sube.',
  'm.help.show.3q': '¿Puedo demostrar un número sin mostrar el resto?',
  'm.help.show.3a':
    'Sí, si selló el registro con sus números. Puede demostrar que un número es como máximo o como mínimo un límite, o exactamente un valor. Use una computadora.',
  'm.help.check.t': 'Comprobar un registro que le enviaron',
  'm.help.check.1q': 'Me enviaron un registro. ¿Cómo lo compruebo?',
  'm.help.check.1a':
    'Abra el enlace que le enviaron, o escriba el identificador del registro en la página de comprobación. Es gratis y no requiere cuenta.',
  'm.help.check.1link': 'Comprobar un registro →',
  'm.help.check.2q': '¿Qué significa «fechado»?',
  'm.help.check.2a':
    'El código de prueba del registro está en un lote, y el código de ese lote está en Midnight. La fecha es el momento en que el lote llegó a Midnight. Puede comprobarlo sin confiar en VeilCore.',
  'm.help.check.3q': '¿Qué muestra un registro y qué no?',
  'm.help.check.3a':
    'Muestra que alguien ya tenía exactamente este registro a esa fecha, y que no ha cambiado desde entonces. No muestra quién tiene derechos sobre el material, que la descripción sea cierta ni que algún objeto físico coincida con ella. La firma de un laboratorio en un resultado es una comprobación aparte.',
  'm.help.check.4q': '¿Se sostendrá en una disputa?',
  'm.help.check.4link': 'Registros como prueba →',
  'm.help.labs.t': 'Laboratorios y acuerdos',
  'm.help.labs.1q': '¿Qué funciona para laboratorios y acuerdos de licencia?',
  'm.help.labs.1a':
    'La página de inicio enumera lo que está en funcionamiento en este sitio y lo que está construido pero aún no se ha ejecutado aquí. Esa lista se mantiene al día con cada versión.',
  'm.help.labs.1link': 'Lo que funciona hoy →',
  'm.help.wrong.t': 'Cuando algo sale mal',
  'm.help.wrong.1q': 'Mi registro lleva mucho tiempo diciendo «en el próximo lote».',
  'm.help.wrong.1a':
    'Su registro está guardado y espera su lote. La página de estado muestra si el servicio de fechado está en marcha.',
  'm.help.wrong.1link': 'Estado del servicio →',
  'm.help.wrong.2q': 'La página de comprobación dice que mi archivo no coincide.',
  'm.help.wrong.2a':
    'El archivo no es, byte por byte, el que se selló. Abrir un archivo y guardarlo de nuevo, exportarlo o enviarlo por una aplicación que lo recomprime puede cambiarlo. Pida el archivo original.',
  'm.help.wrong.3q': '¿Y si este sitio web desaparece?',
  'm.help.wrong.3a':
    'Sus registros se pueden seguir comprobando. Una herramienta gratuita y abierta abre su archivo de copia de seguridad, comprueba el código de prueba de cada registro y le dice qué transacción de Midnight lo fecha, sin este sitio.',
  'm.help.wrong.3link': 'La herramienta gratuita →',
  'm.help.contact.t': 'Contacto',
  'm.help.contact.p':
    'Escriba a hunter@veilcore.org. Diga qué estaba haciendo, qué vio y el identificador del registro si lo hay. Nunca envíe su archivo de copia de seguridad ni su contraseña.',
  'm.status.page.title': 'Estado del servicio',
  'm.status.page.lede': 'Leído en tiempo real del servicio que fecha registros en Midnight para este sitio.',
  'm.status.page.loading': 'Comprobando…',
  'm.status.page.none': 'Esta compilación no tiene un servicio de fechado que consultar.',
  'm.status.page.unreachable':
    'El servicio de fechado no respondió. Los registros que cree quedan guardados y se fecharán cuando vuelva.',
  'm.status.page.service': 'Servicio de fechado',
  'm.status.page.running': 'En marcha',
  'm.status.page.behind': 'En marcha, poniéndose al día con Midnight',
  'm.status.page.failing': 'En marcha, pero los últimos lotes fallaron',
  'm.status.page.lastRun': 'Última ejecución',
  'm.status.page.checked': 'Comprobado ahora mismo, desde su navegador.',
  'm.status.page.help': 'Ayuda →',
  'footer.terms': 'Términos de uso',
  'draft.banner':
    'Traducción preliminar hecha por máquina, en revisión. La página en inglés es la versión de referencia.',
  'draft.showEnglish': 'Ver en inglés',
  'draft.close': 'Cerrar este aviso',
  'notice.datingPaused':
    'El fechado en Midnight está en pausa por la actualización de la red de Midnight. Sus registros están guardados y se fecharán cuando vuelva a funcionar.',
  // The record app's frame and the browser tab's titles.
  'app.frame.section.log': 'Registrar',
  'app.frame.section.send': 'Enviar y recibir',
  'app.frame.section.license': 'Licencias y regalías',
  'app.frame.section.prove': 'Demostrar y comprobar',
  'app.frame.home': 'Sus registros. Su avance está guardado.',
  'title.founders': 'Fundadores',
  // Mako's site draft of 21 November 2026 (components/site/HowItWorks.tsx, Founders.tsx and the
  // home page): the strings it needed that the site had no words for.
  'title.how': 'Cómo funciona',
  'm.foot.cta': 'Feche su primer registro.',
  'm.status.liveNow':
    'Las licencias, los informes de regalías y los resultados firmados por un laboratorio ya funcionan en veilcore.org.',
  'm.status.whereLink': 'Qué funciona y dónde →',
  'm.home.f3t': 'Licencias y regalías.',
  'm.home.f3p':
    'Acuerde una licencia en veilcore.org, entre las dos partes, con transacciones reales. Cada informe de regalías recibe una respuesta: «Ya pagué» y «Recepción confirmada». VeilCore lo registra y no lo cobra.',
  'm.home.f4t': 'Resultados firmados por un laboratorio.',
  'm.home.f4p':
    'Un laboratorio firma valores y resultados con su propia clave. Solo usted, el laboratorio y quien envió la muestra los ven, y solo usted puede mostrarlos. En funcionamiento en veilcore.org, en la red principal de Midnight, desde el 18 de noviembre de 2026.',
  'm.home.f5t': 'Comprobarlo es gratis.',
  'm.home.f5p': 'Un comprador, un examinador o un tribunal comprueba un registro gratis, sin cuenta y sin billetera.',
  'm.hiw.title1': 'Cómo funciona',
  'm.hiw.title2': 'VeilCore.',
  'm.hiw.lede':
    'Un formato de registro abierto para genética vegetal, animal y microbiana. Su computadora calcula un código de prueba a partir de su registro, y ese código se fecha en Midnight. Lo que usted escribió nunca va allí. Más adelante usted muestra el registro, o prueba un solo hecho sobre él.',
  'm.hiw.lab1': 'Una segunda parte,',
  'm.hiw.lab2': 'en el registro.',
  'm.hiw.labP':
    'Los laboratorios firman acuses de recibo e informes con sus propias claves. VeilCore registra quién firmó; no responde por el resultado.',
  'm.hiw.split1': 'Qué se queda con usted,',
  'm.hiw.split2': 'y qué va a Midnight.',
  'm.hiw.youLbl': 'Con usted',
  'm.hiw.youT': 'Su genética y sus claves',
  'm.hiw.you1t': 'Sus archivos de ADN',
  'm.hiw.you1p': 'Nunca salen de su dispositivo: su computadora lee cada uno para calcular su código.',
  'm.hiw.you2t': 'Los datos del registro',
  'm.hiw.you2p':
    'Se guardan cifrados en el servidor de VeilCore, el nombre incluido, salvo que usted elija mostrarlo. No tenemos la clave.',
  'm.hiw.you3t': 'Su archivo de copia de seguridad',
  'm.hiw.you3p': 'Contiene sus claves. Guárdelo en un lugar seguro.',
  'm.hiw.chainLbl': 'En Midnight',
  'm.hiw.chainT': 'Códigos, nunca su genética',
  'm.hiw.chain1t': 'El código de prueba',
  'm.hiw.chain1p': 'Nadie puede deducir a partir de él lo que usted escribió.',
  'm.hiw.chain2t': 'Un lote',
  'm.hiw.chain2p':
    'Los códigos de prueba van en lotes, y cada lote se ancla en Midnight. En veilcore.org, los lotes también se sellan en Bitcoin.',
  'm.hiw.chain3t': 'La fecha',
  'm.hiw.chain3p': 'El bloque en el que entra un lote muestra que el registro ya existía para entonces.',
  'm.hiw.chainMore': 'Todo lo que puede ir a Midnight →',
  'm.hiw.more1': 'Linaje, licencias',
  'm.hiw.more2': 'y laboratorios.',
  'm.about.grow1': 'Para quienes',
  'm.about.grow2': 'crían y cultivan.',
  'm.about.growP':
    'Obtentores y criadores, empresas de semillas, laboratorios de cultivo de tejidos y libros genealógicos, y los certificadores y examinadores que revisan su trabajo.',
  'm.about.whereLabel': 'Dónde trabajamos',
  'm.about.where': 'Tokio|Nueva Jersey|Japón|Unión Europea|Estados Unidos',
  'title.terms': 'Términos de uso',
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
  'title.partners': 'Exigir un registro',
  'title.new': 'Crear un registro',
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
  'm.nav.yours': 'Sus registros',
  'm.nav.menu': 'Menú',
  'm.hero.label': 'Prueba de lo que usted tiene',
  'm.hero.title1': 'Feche su registro.',
  'm.hero.title2': 'Mantenga su genética en privado.',
  'm.hero.how': 'Cómo funciona',
  'm.hero.pasteQ': '¿Alguien le envió un código de laboratorio o un enlace?',
  'm.hero.pasteGo': 'Péguelo aquí →',
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
  'm.demo.create.title': 'Crear un registro',
  'm.demo.create.text':
    'Una planta, un animal o un documento inventados: séllelo, guarde su copia de seguridad y vea su página.',
  'm.demo.verify.title': 'Verificar un registro',
  'm.demo.verify.text': 'Ingrese el identificador de un registro y vea lo que su titular divulgó y si está anclado.',
  'm.demo.paste.title': '¿Recibió un código o un enlace?',
  'm.demo.paste.text':
    'Un laboratorio con el código de laboratorio de un obtentor, o cualquiera que recibió un enlace a un registro o un acuerdo para firmar: péguelo y se abre la pantalla correcta.',
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
    'Una prueba diferencial encontró que nuestras implementaciones en TypeScript, Python y Rust no coincidían en algunos números. Corregido: ahora coinciden en cada una de 81.000 entradas, y los vectores de prueba compartidos lo comprueban.',
  'm.post2.date': '2 oct 2026',
  'm.post2.tag': 'Contrato',
  'm.post2.title': 'Una ejecución completa en la red de pruebas de Midnight',
  'm.post2.text':
    'El contrato se desplegó en la red de pruebas de Midnight y pasó las 26 comprobaciones de extremo a extremo, usando 16 de sus 24 operaciones con pruebas reales.',
  'm.status.label': 'Dónde estamos',
  'm.status.title1': 'Cómo están',
  'm.status.title2': 'las cosas.',
  'm.status.lede': 'Lo que funciona hoy y hasta dónde se ha comprobado.',
  'm.stat3.b': 'Sin auditoría',
  'm.status.keyTitle': 'Quién puede cambiar el contrato.',
  'm.status.keyText':
    'Una clave de mantenimiento puede cambiar cómo funciona el contrato de VeilCore en Midnight. Quien la tenga puede agregar o reemplazar operaciones del contrato, lo que podría permitirle tomar el control de la identidad de cualquier registro, agregar licencias en nombre de cualquier emisor, agregar o quitar obligaciones y vínculos de parentesco, o desactivar operaciones. No puede antedatar los tiempos de bloque de la red, y cada cambio queda a la vista en la cadena. No puede cambiar ni quitar un lote ya anclado, ni la fecha que da a un registro: eso está en la transacción que lo ancló, que nadie puede alterar. Hoy la clave está en papel, una copia en manos de cada fundador, y cualquiera de las dos copias basta por sí sola para usarla. Pasarla a tres claves, de las que dos deban estar de acuerdo, estaba previsto antes de la actualización de Midnight a Ledger 9 del 6 de noviembre de 2026 y no se ha hecho. La red sigue aceptando la clave, así que debe considerarse activa. Cualquiera puede comprobar el contador de cambios del contrato en un explorador de Midnight, y cualquier cambio lo aumenta. Cada uso se anuncia públicamente, según una política de mantenimiento escrita.',
  'm.status.keyLink': 'Leer la política de mantenimiento →',
  'm.contact.label': 'Contacto',
  'm.contact.title1': 'Hable con',
  'm.contact.title2': 'los fundadores.',
  'm.contact.email': 'Escriba a los fundadores',
  'm.contact.spec': 'Lea la especificación',
  'm.foot.explore': 'Explorar',
  'm.foot.contact': 'Contacto',
  'm.foot.verify': 'Verificar un registro',
  'm.foot.fine': 'Prueba de que usted ya tenía un registro a una fecha dada. No es un título sobre lo que describe.',
  'm.foot.terms': 'Términos de uso',
  'm.terms.inEnglish': 'Estos términos están en inglés y rige el texto en inglés.',
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
    'Makoto (Mako) Steiner es cofundador y CEO de VeilCore; dirige la estrategia comercial, la recaudación de fondos y el acercamiento a instituciones e inversores en todo el mundo.',
  'm.mako.bio2': 'Se graduó en Estudios Ambientales en Denison University y vive en Tokio.',
  'm.mako.leads': 'Japón|UE|Organismos de normalización|Desarrollo de negocios',
  'm.mako.also': 'Midnight Nightforce Leader (Japón) · Midnight Build Club, Cohorte 1',
  'm.mako.languages': 'Inglés · Japonés',
  'm.hunter.bio1':
    'Hunter Roberts es cofundador y COO de VeilCore; dirige el producto y el protocolo VeilCore, desde el formato de registro hasta el contrato en Midnight. Dirige el acercamiento de VeilCore a instituciones de EE. UU., incluidos organismos de certificación de semillas, de normalización y de variedades vegetales.',
  'm.hunter.bio2':
    "Viene del trabajo práctico con plantas, incluidos el mejoramiento y el cultivo de tejidos, y está construyendo Chunk's Trees, una instalación de cultivo en Nueva Jersey.",
  'm.hunter.leads': 'Estados Unidos|Protocolo y especificación|Ingeniería',
  'm.hunter.also': 'Midnight Nightforce Leader (EE. UU.) · Midnight Build Club, Cohorte 1',
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
  'm.privacy.sum.local.t': 'Nunca sale de su dispositivo sin cifrar',
  'm.privacy.sum.local.p':
    'Sus archivos de ADN y sus fotos nunca salen de su dispositivo. Los informes de laboratorio viajan cifrados.',
  'm.privacy.sum.locked.t': 'Guardado cifrado, no podemos leerlo',
  'm.privacy.sum.locked.p': 'Todo lo que escribe en un registro, y los informes que un laboratorio le envía.',
  'm.privacy.sum.read.t': 'Podemos leer',
  'm.privacy.sum.read.p':
    'El ID del registro, el código de prueba, las fechas y lo que usted decida mostrar. La lista completa está abajo.',
  'm.privacy.full': 'La lista completa',
  'm.privacy.stored.title': 'Se guarda en nuestro servidor de pruebas',
  'm.privacy.stored.text':
    'Sus registros y acuerdos, cifrados por su navegador antes de enviarse: el nombre de cada registro, obtentor, especie, fechas, notas, números de referencia, progenitores, los códigos de prueba y los nombres de archivo de las fotos e informes de laboratorio que agrega, términos y contrapartes de los acuerdos, la cantidad y la nota que envía a un laboratorio, los datos de muestra que usted y el laboratorio escriben (ID de muestra, número de precinto, dónde y cuándo se tomó, un testigo, cómo llegó), los nombres que da a los destinatarios y las claves secretas de cada registro. Nuestro servidor los guarda cifrados, y nosotros no tenemos la clave: está en su navegador y en su archivo de copia de seguridad. La clave de los datos de muestra también va en el código de laboratorio, para que el laboratorio pueda abrirlos. Si usted lo elige, el nombre de un registro también va en un enlace de comprobación que crea, después del #. Un navegador no envía esa parte al abrir el enlace, pero el enlace va completo a cualquiera a quien se lo envíe y a cualquier sitio donde lo pegue, incluido el formulario de una organización asociada. Nuestro servidor puede leer: el ID de cada registro; su código de prueba, su vínculo de clave y su tipo de perfil; un código hecho a partir de su nombre, que no dice nada del nombre sin la clave de su enlace de comprobación; sus vínculos de corrección (qué registro sustituye una corrección, qué campos cambió y cuándo); cuándo lo vio el servidor por primera vez; cuántas veces se guardó y cuándo fue la última; más o menos qué tamaño tiene (su franja de tamaño); lo que usted decida mostrar en su página de comprobación (su nombre, si decide mostrarlo, y si hay un informe de ADN guardado, como un código que no dice nada del archivo sin la clave de su enlace de comprobación); los vínculos con progenitores que registre; y su lote con su sello de fecha. Si un acuerdo tiene regalías sobre la descendencia, nuestro servidor puede leer a qué registro se aplica y desde cuándo rige, y cualquiera puede preguntar si ese registro tiene una: la comprobación de linaje lo necesita. De un envío: de qué registro procede, qué cuenta de titular lo recibió, cuándo se recibió y una etiqueta en lugar del nombre del destinatario. En un envío anterior a las etiquetas, el nombre está tal como se escribió, hasta que la limpieza del servidor de registros lo sustituya. De los laboratorios: la clave pública de firma y las firmas que hacen. Los acuses de recibo y los informes de un laboratorio sobre su registro son privados: nuestro servidor los muestra solo a usted, al laboratorio y a quien le envió la muestra, salvo que usted decida mostrarlos en su enlace de comprobación. Si muestra si hay un informe de ADN guardado, su página de comprobación también dice, para cada acuse de recibo, que un laboratorio recibió una muestra y si lo que llegó coincide con lo enviado, sin el nombre del laboratorio. La firma de un laboratorio sobre un informe nombra el informe ligado a su registro con una clave que solo usted y el laboratorio tienen; una hecha antes del 17 de octubre de 2026 nombra el SHA-256 del archivo del informe, que nuestro servidor muestra solo a usted, al laboratorio y a quien le envió la muestra. Las solicitudes de demostrar la clave de un registro, con el nombre que escribió quien la pide, durante 7 días: nuestro servidor sabe qué clave en la cadena nombra cada solicitud. Las páginas de demostración y de comprobación nunca envían su clave de titular. Su clave de titular, que su navegador envía cada vez que guarda para que el servidor encuentre sus registros; el servidor solo conserva un hash de un solo sentido de ella. Los registros guardados antes del cifrado siguen siendo legibles para nosotros hasta que su navegador los cifre, y el nombre de un registro guardado antes de que se cifraran los nombres sigue siendo legible para nosotros hasta que su navegador vuelva a guardar el registro. Los datos de muestra escritos antes del cifrado siguen siendo legibles para nosotros hasta que el servidor de registros los elimine. Nuestras copias de seguridad externas de antes conservan una copia legible de todo esto hasta que destruyamos la clave que las abre. Informes de laboratorio cifrados que un laboratorio le envía: se guardan cifrados, sin la clave, y se borran a los 180 días. El servidor es el servidor de registros de pruebas de VeilCore, alojado en Railway.',
  'm.privacy.local.title': 'Nunca sale de su navegador sin cifrar',
  'm.privacy.local.text':
    'Sus archivos de ADN nunca salen de su dispositivo. Los informes de laboratorio viajan cifrados. Su navegador lee los informes de ADN, informes de laboratorio y fotos que usted agrega para hacer un código de cada uno; los archivos en sí nunca se suben. Un informe de laboratorio llega a nuestro servidor solo cuando un laboratorio se lo devuelve, cifrado para que solo usted pueda abrirlo.',
  'm.privacy.test.title': 'Una red de pruebas',
  'm.privacy.test.text':
    'La demo usa la red de pruebas de Midnight, no la red en producción. Los datos de la demo pueden borrarse cuando se reinicie la red de pruebas.',
  'm.privacy.madeup.title': 'Use datos inventados',
  'm.privacy.madeup.text':
    'Por favor, no ingrese nombres reales, variedades reales ni nada confidencial. La demo sirve para probar el formato.',
  'm.privacy.export.title': 'Exportar',
  'm.privacy.export.text':
    'En su página de registros, en «Más»: «Exportar todos los registros» descarga los registros que guarda este navegador. «Descargar sus registros y acuerdos de VeilCore» descarga lo que nuestro servidor guarda de ellos, abierto en su navegador: sus registros, acuerdos, opciones de uso compartido y, de cada registro, su prueba y su lote. Deja fuera sus envíos con sus datos de muestra, los informes de laboratorio cifrados, las regalías sobre la descendencia y las solicitudes de demostrar la clave de un registro. Los envíos, sus datos de muestra y los informes de laboratorio se abren desde el envío en la aplicación. La comprobación de linaje responde sobre las regalías, un registro cada vez. Las solicitudes de demostración se borran a los 7 días. Ninguno de los dos archivos tiene sus claves ni las claves secretas de sus registros: están en su archivo de copia de seguridad.',
  'm.privacy.delete.title': 'Eliminación',
  'm.privacy.delete.text':
    'Para que eliminemos sus datos de la demo de nuestro servidor, escriba a hunter@veilcore.org con los identificadores de sus registros.',
  'm.privacy.browser.title': 'Se guarda en su navegador',
  'm.privacy.browser.text':
    'Su navegador guarda, en este dispositivo: su clave de titular (también se envía una copia a nuestro servidor, como se indica arriba); la clave que cifra sus registros, que nunca se nos envía; su propia copia de sus registros; las claves secretas de cada registro, que cifran sus informes de laboratorio (una copia cifrada también va con el registro); los códigos de laboratorio que crea o usa, con un código de retiro y la clave de los datos de un envío; la clave de firma de un laboratorio si configuró una (su parte privada nunca se nos envía); el rol que eligió; y su idioma. Su archivo de copia de seguridad contiene una copia de cada clave y de los códigos de laboratorio que creó. Para borrarlos, elimine los datos de este sitio en la configuración de su navegador. Guarde antes su copia de seguridad: sin ella, no podrá encontrar ni abrir sus registros de nuevo.',
  'm.privacy.deviceonly.title': 'Un documento guardado solo en este dispositivo',
  'm.privacy.deviceonly.text':
    'Al sellar un documento, puede elegir guardar su registro solo en este dispositivo y en su archivo de copia de seguridad. Entonces nada de lo que escriba en él se envía a nuestro servidor, ni cifrado ni sin cifrar. Lo que sí recibimos: el identificador del registro, su código de prueba y su vínculo de clave, para poder fecharlo; su dirección de red y la hora, como en cualquier solicitud; y, si tiene una copia con llave de acceso, el identificador y las claves del registro dentro de esa copia cifrada. Si decide poner un sello de fecha a la clave del registro, un código hecho con la clave va a Midnight a través de nuestro servicio de tarifas. Una excepción, y solo si usted la elige: si prueba uno de sus números, un hecho sobre ese número va a Midnight a través de nuestro servicio de tarifas y es público para siempre. Es el límite que usted fija y su sentido o, si prueba el número exacto, el número en sí. Nada de ello va a nuestro servidor de registros. Pero lo que usted prueba es público, y nosotros, y cualquiera que tenga el enlace de comprobación del registro, podemos vincularlo con el registro; también podemos vincularlo con la clave de titular que lo fechó. No podemos devolverle un registro así: las únicas copias están en su navegador y en un archivo de copia de seguridad guardado después de sellarlo, y la aplicación le pide guardar y comprobar uno enseguida. Cualquiera a quien envíe su enlace de comprobación y el archivo puede seguir comprobándolo. La elección se hace al sellar y después no se puede cambiar.',
  'm.privacy.deals.title': 'Acuerdos y regalías',
  'm.privacy.deals.text':
    'Los mensajes de un acuerdo de licencia (las condiciones, cada informe de regalías, su respuesta, «pagué», «recibido», recordatorios y avisos, y los datos de cobro y de empresa del licenciante) van cifrados con una clave que solo comparten las dos partes, creada cuando se leen el código de 6 cifras. Nuestro servidor los guarda cifrados y los transmite: no puede leerlos, cambiarlos ni falsificarlos. Sí ve a qué licencia pertenece un acuerdo, cuántos mensajes tiene y cuándo llegó cada uno. Los datos de cobro (una cuenta bancaria, un enlace de pago o una dirección de Midnight) y los datos de empresa (nombre legal, dirección y número fiscal) viajan dentro de esos mensajes cifrados: la otra parte puede leerlos, nosotros no. Toda copia que descargue o guarde en una copia de seguridad (el registro firmado de un acuerdo, su archivo de copia de seguridad) los contiene en claro, así que trate esos archivos como un extracto bancario. El recibo de un proveedor de pagos puede leerlo quien tenga el código de prueba de la liquidación; solo lo tienen las dos partes y ese proveedor. Guardamos los mensajes de un acuerdo hasta que una parte nos pida borrarlos; la otra parte conserva su propia copia. La licencia en sí está en Midnight: véase «Qué va a Midnight».',
  'm.privacy.chain.title': 'Qué va a Midnight, para siempre',
  'm.privacy.chain.text':
    'Midnight es una red pública: lo que va allí no puede cambiarlo ni borrarlo nadie, nosotros incluidos, y cualquiera puede leerlo. Su genética, sus condiciones, su nombre y sus archivos nunca van allí. Lo que sí va: el código de prueba de cada lote de registros; la clave propia de un registro y su sello de fecha; un código hecho a partir de un informe de ADN, cuando fecha su vínculo; qué registros están enlazados como progenitor y descendiente, una vez que ambos titulares lo confirman (un enlace no se puede deshacer); que un registro tiene una licencia, una obligación o una anotación de prestamista registrada, y cuándo cambió; la clave pública de un laboratorio cuando firma allí un certificado; un valor que usted elige probar con exactitud, completo; y, donde este sitio permite pagar una regalía en NIGHT, el importe y las dos direcciones. Antes de cada uno de estos pasos, la aplicación muestra un recibo que enumera exactamente qué hace público ese paso. Un código o una clave por sí solos no dicen nada de usted, pero cualquiera a quien dé un enlace de comprobación puede seguir desde entonces lo que le ocurre a ese registro en la red.',
  'm.privacy.helper.title': 'El asistente y su modelo opcional',
  'm.privacy.helper.text':
    '«Preguntar», el asistente de la aplicación, donde este sitio lo ofrece, funciona en su dispositivo. Nada de lo que escriba en él se envía a ninguna parte; solo el botón Guardar de la aplicación envía algo, y eso va cifrado a nuestro servidor, como se explica arriba. Donde este sitio ofrece el modelo de lenguaje opcional, se descarga una vez desde Hugging Face, una empresa aparte: Hugging Face ve su dirección IP, la hora, qué archivos del modelo y que la petición viene de este sitio; nosotros vemos que empezó una descarga. El modelo se ejecuta en su dispositivo, en una parte de la página que no puede acceder a la red, así que nada de lo que escriba llega a Hugging Face ni a nosotros, ni entonces ni después. Puede borrar el modelo desde el panel del asistente. Su «Hágalo por mí» guarda un registro de cada trabajo solo en su dispositivo, nunca en una copia de seguridad: los pasos y hasta dónde llegaron, referencias a los registros y acuerdos implicados, y las cifras que escribe para un informe hasta que se envía; nunca lo que escribió para pedirlo. Se borra 7 días después de que termine el trabajo. Mientras un trabajo espera su aprobación, sus registros nuevos se guardan cifrados en su navegador, con sus claves; una copia de seguridad hecha mientras tanto también tiene esas claves. Preparar los informes lee los mensajes de cada uno de sus acuerdos desde nuestro servidor, uno tras otro, así que nuestro servidor puede ver que esos acuerdos se leyeron juntos; no se envía nada hasta que usted lo apruebe.',
  'm.privacy.hosts.title': 'Alojamiento',
  'm.privacy.hosts.text':
    'Este sitio web está alojado en Vercel, que registra direcciones IP y solicitudes. Nuestro servidor de registro funciona en Railway, que registra solicitudes.',
  'm.privacy.who.title': 'Quién lo guarda y durante cuánto tiempo',
  'm.privacy.who.text':
    'VeilCore aún no está constituida como empresa; sus fundadores gestionan este sitio y el servidor de registros. Los informes de laboratorio cifrados se borran 180 días después de llegar. Las solicitudes de demostrar la clave de un registro se borran a los 7 días. Nada más tiene un plazo de conservación fijado: se queda hasta que nos pida que lo eliminemos. Contacto: hunter@veilcore.org.',
  'm.notfound.title': 'Página no encontrada.',
  'm.notfound.text':
    'No hay ninguna página en esta dirección. Si alguien le dio un enlace a un registro, compruebe que esté completo.',
  'm.notfound.home': 'Inicio de VeilCore →',
  'm.homescreen.title': 'Abra sus registros',
  'm.homescreen.text':
    'Esto es VeilCore en su pantalla de inicio. Guarda sus datos en un espacio propio, separado de Safari.',
  'm.homescreen.lost': 'No se ha perdido nada. Traiga aquí sus registros con su archivo de copia de seguridad.',
  'm.homescreen.restore': 'Traer mis registros',
  'm.homescreen.fresh': '¿Es nuevo en VeilCore? Empiece aquí',
  'm.homescreen.safari':
    '¿No tiene a mano su archivo de copia de seguridad? Si usó VeilCore en Safari en este dispositivo, sus registros siguen ahí.',
  'm.privacy.contact': 'Preguntas: hunter@veilcore.org',
  // Round 2 truth pass (14 Oct 2026): keys added or newly translated.
  'm.hero.lede':
    'Para obtentores, empresas de semillas y laboratorios que trabajan con genética vegetal, animal y microbiana: dé a sus registros una fecha que nadie pueda antedatar. Sus datos genéticos se quedan cifrados: los archivos de ADN nunca salen de su computadora, y lo que escribe llega cifrado a nuestro servidor. Solo los códigos de prueba van a Midnight, que los fecha.',
  'm.for.3p':
    'Envíe material con un código de laboratorio. El laboratorio firma un acuse de recibo con su propia clave, así el registro muestra a una segunda parte. El acuse es una firma real, guardada por el servidor de registros de VeilCore, no en la cadena. Condiciones como no propagar son solo de práctica en la demo web.',
  'm.get.1b': 'para un registro de lo que usted tiene, sin mostrar su genética.',
  'm.get.3b':
    'Un vínculo de parentesco cuenta solo cuando ambos titulares lo confirman. En este sitio lo anota el servidor de registros de VeilCore, no la cadena.',
  'm.open.2t': 'Guarde un solo archivo.',
  'm.open.2p':
    'En la página de su registro: «Descargar el paquete de evidencia». Un solo .zip con el registro tal como se selló, su prueba de inclusión, la raíz del lote, dónde se registró el lote, el archivo de sello de Bitcoin si lo hay, y una página que lo comprueba todo sin conexión. Su archivo de copia de seguridad contiene sus claves, no estos archivos. Los archivos sueltos siguen en «Detalles técnicos»: «Exportar el registro», «Descargar la prueba de inclusión», «Descargar el archivo de sello de Bitcoin».',
  'm.faq.1a':
    'Una vez anclados los registros, cualquiera puede comprobar cuál se ancló primero. Vincule su informe de laboratorio, para que un análisis posterior pueda compararse con él. Cuando envíe material, el receptor firma un acuse de recibo con su propia clave. Un registro es una prueba, no una inscripción: muestra que usted ya tenía este registro a esa fecha, no que tenía el material, y por sí solo no resuelve una disputa.',
  'm.post0.date': '4 oct 2026',
  'm.post0.tag': 'Contrato',
  'm.post0.title': 'Probar un hecho, guardar el resto',
  'm.post0.text':
    'Ambos contratos pasaron las 37 comprobaciones de extremo a extremo en la red de pruebas preprod de Midnight, incluidas las nuevas afirmaciones: un valor, un rango, una diferencia, una corrección que deja el resto intacto y una firma de una clave de laboratorio de prueba. Datos de marcadores inventados.',
  'm.postA.date': '8 oct 2026',
  'm.postA.tag': 'Lanzamiento',
  'm.postA.title': 'En la red principal de Midnight',
  'm.postA.text':
    'Ambos contratos están desplegados en la red principal de Midnight. El contrato de afirmaciones no tiene clave de mantenimiento: nadie, ni siquiera nosotros, puede cambiarlo.',
  'm.postG.date': '16 nov 2026',
  'm.postG.tag': 'Registros',
  'm.postG.title': 'Una cadena de producción, paso a paso',
  'm.postG.text':
    'Un lote de cultivo y un lote de cosecha son ahora registros propios, y cada uno nombra al anterior: la planta, el lote de cultivo, el lote de cosecha, el informe de laboratorio. Cada uno tiene su propia fecha. Un enlace puede llevar la cadena, para que quien lo compruebe pueda abrir cada paso. Los vínculos son la declaración de quien lo selló; la fecha de cada registro se comprueba en Midnight. Probado por primera vez en veilcore.org el 16 de noviembre de 2026.',
  'm.postF.date': '16 nov 2026',
  'm.postF.tag': 'Privacidad',
  'm.postF.title': 'Guardar un documento solo en su dispositivo',
  'm.postF.text':
    'Al sellar un documento ahora puede guardarlo solo en este dispositivo y en su archivo de copia de seguridad. No se envía nada de lo que escribe, ni cifrado ni sin cifrar: el servidor de registros de VeilCore recibe el ID del registro, su código de prueba y su vínculo de clave, para poder fecharlo. Sellado, fechado y comprobado por primera vez en veilcore.org el 16 de noviembre de 2026.',
  'm.postE.date': '2 nov 2026',
  'm.postE.tag': 'Prueba',
  'm.postE.title': 'Un archivo de evidencia para cualquier documento',
  'm.postE.text':
    'La página de un documento ahora descarga un archivo que un abogado o un examinador puede comprobar sin nuestro sitio: el registro tal como se selló, su prueba, dónde se fechó, una página que hace las comprobaciones sin conexión, un resumen para imprimir y un texto de ejemplo para una declaración. Puede incluir una copia del documento; antes se compara con el registro.',
  'm.postD.date': '31 oct 2026',
  'm.postD.tag': 'Sitio web',
  'm.postD.title': 'Sellar un documento',
  'm.postD.text':
    'Permisos, certificados, contratos: su computadora calcula el código del archivo y solo el código de prueba del registro se fecha en Midnight. El archivo nunca sale de su dispositivo. Envíe un enlace de comprobación con el archivo, y quien lo reciba verá que es el mismo archivo, byte por byte, y cuándo lo tenía usted.',
  'm.postC.date': '19 oct 2026',
  'm.postC.tag': 'Sitio web',
  'm.postC.title': 'Su navegador envía sus propias transacciones',
  'm.postC.text':
    'En veilcore.org su navegador ahora fecha por sí mismo el emparejamiento de un informe de ADN, demuestra un registro por enlace y pone un sello de fecha a la clave propia de un registro, y VeilCore paga la tarifa de la red. Los registros se agrupan en lotes y se fechan en la red principal de Midnight. No hace falta billetera.',
  'm.postB.date': '11 oct 2026',
  'm.postB.tag': 'Servidor de registros',
  'm.postB.title': 'Primer lote fechado también en Bitcoin',
  'm.postB.text':
    'Los primeros lotes del servidor de registros se anclaron a mano en la red principal de Midnight. Uno de ellos, con cinco de nuestros propios registros de prueba, también tiene su raíz sellada en Bitcoin, en el bloque 971004. Comprobado el 15 de octubre con dos exploradores de bloques: el sello lleva a los bloques 971004 y 971005 de Bitcoin. Aún falta comprobarlo con la herramienta oficial de OpenTimestamps y un nodo completo de Bitcoin.',
  'm.founders.lede':
    'VeilCore es un formato de registro probatorio para genética vegetal, animal y microbiana. Aporta pruebas de que usted ya tenía un registro de su material a una fecha determinada, sin entregar sus datos genéticos.',
  'm.live.label': 'Qué funciona dónde',
  'm.live.title1': 'Qué funciona,',
  'm.live.title2': 'y dónde.',
  'm.live.lede':
    'veilcore.org funciona en la red principal de Midnight, y los registros hechos allí son reales. El sitio de prueba es para practicar, y sus registros no tienen valor probatorio. Algunas funciones se prueban allí primero.',
  'm.live.colMain': 'veilcore.org (red principal)',
  'm.live.colTest': 'test.veilcore.org',
  'm.live.colNot': 'Todavía no',
  'm.live.stamp.t': 'Un sello de fecha para su registro',
  'm.live.stamp.main': 'Sí, por lotes fechados en Midnight. Su navegador no envía nada a la cadena.',
  'm.live.stamp.test':
    'Sí. Los lotes se fechan automáticamente, y eso fecha su registro. Su navegador también pone un sello de fecha a la clave propia de su registro; ese sello fecha solo la clave.',
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
  // Numbers and results a lab signs (config/network.ts LAB_SIGNING_ENABLED). The veilcore.org cell
  // says 'main' until it has worked there (config/copy.ts LAB_SIGNING_RUN_ON_MAINNET), then 'live'.
  'm.live.signed.t': 'Números y resultados que firma un laboratorio',
  'm.live.signed.main': 'Construido, pero aún no se ha probado en la red principal.',
  'm.live.signed.test':
    'Sí. El laboratorio firma con su propia clave. Solo el titular del registro, el laboratorio y quien le envió la muestra lo ven, y solo el titular puede mostrarlo a otros.',
  'm.live.signed.live':
    'Sí. El laboratorio firma con su propia clave. Solo el titular del registro, el laboratorio y quien le envió la muestra lo ven, y solo el titular puede mostrarlo a otros. Agregar el archivo de resultado de un laboratorio a los registros de otro obtentor está construido, pero aún no se ha probado en la red principal.',
  'm.live.local.t': 'Un documento guardado solo en su dispositivo',
  'm.live.local.main': 'Construido, pero aún no se ha probado en la red principal.',
  'm.live.local.test':
    'Sí, para registros de documentos. Nada de lo que usted escribe se envía a VeilCore: solo el identificador del registro, su código de prueba y su vínculo de clave. La única excepción es un número que usted elija probar (fila siguiente).',
  'm.live.local.live':
    'Sí, para registros de documentos. Nada de lo que usted escribe se envía a VeilCore: solo el identificador del registro, su código de prueba y su vínculo de clave. La única excepción es un número que usted elija probar (fila siguiente).',
  'm.live.docchain.t': 'Una cadena de producción como registros enlazados',
  'm.live.docchain.main': 'Construido, pero aún no se ha probado en la red principal.',
  'm.live.docchain.test':
    'Construido, pero aún no se ha probado. Un registro de origen, un lote de cultivo, un lote de cosecha y un informe de laboratorio nombran cada uno al anterior, y cada uno tiene su fecha. Los enlaces son la declaración de quien lo selló.',
  'm.live.docchain.live':
    'Sí. Un registro de origen, un lote de cultivo, un lote de cosecha y un informe de laboratorio nombran cada uno al anterior, y cada uno tiene su fecha. Los enlaces son la declaración de quien lo selló; ni VeilCore ni Midnight los comprueban.',
  'm.live.localclaims.t': 'Probar un número de un documento guardado en su dispositivo',
  'm.live.localclaims.main': 'Construido, pero aún no se ha probado en la red principal.',
  'm.live.localclaims.test':
    'Construido, pero aún no se ha probado. Usted decide; está desactivado hasta que lo active. Lo que pruebe es público en Midnight; nada va al servidor de registros de VeilCore, pero VeilCore puede vincular lo que pruebe con el registro.',
  'm.live.localclaims.live':
    'Sí. Usted decide; está desactivado hasta que lo active. Lo que pruebe es público en Midnight; nada va al servidor de registros de VeilCore, pero VeilCore puede vincular lo que pruebe con el registro.',
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
  'm.live.claims.live':
    'Sí, desde una computadora: probar un número de un certificado o un resultado de laboratorio sellado sin mostrar el resto. En teléfonos todavía no se ha probado.',
  'm.live.lic.t': 'Licencias y regalías',
  'm.live.lic.main': 'Desactivado hasta una última prueba completa.',
  'm.live.lic.test': 'Sí, con transacciones reales: regalías, pagos, traspaso de una licencia.',
  'm.live.lic.not': 'En veilcore.org, tras una última prueba completa.',
  // The veilcore.org cell until royalties v2 has worked on mainnet (config/copy.ts ROYALTIES_RUN_ON_MAINNET).
  'm.live.lic.mainNext':
    'Las licencias se activan con el despliegue que las enciende, cuando una licencia real haya funcionado de principio a fin en la red principal. Informes de regalías y pagos: construidos, aún no activos.',
  // The test-site cell until royalties v2 has run there (config/copy.ts ROYALTIES_RUN_ON_TEST).
  'm.live.lic.testNext':
    'Sí para las licencias, con transacciones reales. Informes de regalías (en veilcore.org ya han funcionado) y pagar regalías en Midnight mismo: construidos y ofrecidos aquí; en esta red aún no han funcionado de principio a fin.',
  // Licenses on in code, on a build that isn't veilcore.org's (the test site, the demo): the main-network cell.
  'm.live.lic.next':
    'Construido. Se activa con el próximo despliegue de veilcore.org, cuando una licencia real haya funcionado de principio a fin en la red principal.',
  // Licenses on, on veilcore.org's own build (AGREEMENTS_LIVE, mainnet sponsor live): the main-network cell (components/site/Home.tsx).
  'm.live.lic.live':
    'Sí: licencias, con transacciones reales, e informes de regalías con su respuesta, «Ya pagué» y «Recepción confirmada». El traspaso de una licencia está construido, pero aún no se ha probado en la red principal. Pagar regalías en Midnight mismo solo se ofrece en el sitio de pruebas, y allí aún no ha funcionado de principio a fin.',
  'm.live.chain.t': 'La página de comprobación lee Midnight por sí misma',
  'm.live.chain.main': 'Todavía no: necesita nuestro servicio intermedio de solo lectura.',
  'm.live.chain.test': 'Sí.',
  // Round 3 (14 Oct 2026): the rest of the landing page, so no English shows through.
  'nav.newCultivar': 'Nuevo registro',
  'nav.licenses': 'Acuerdos',
  'footer.about': 'Un formato de registro abierto para genética vegetal, animal y microbiana.',
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
    'Un formato de registro abierto para genética vegetal, animal y microbiana. Diseñado para anclarse en Midnight; en pruebas en una red de pruebas de Midnight.',
  'm.for.2p':
    'Los obtentores quieren usar sus marcadores para mostrar que una variedad es distinta, y los guardan como secretos comerciales. Una afirmación de VeilCore prueba un hecho sobre ellos sin mostrar el resto. Ninguna oficina de examen ni certificadora la acepta todavía.',
  'm.hero.note':
    'Escriba en cualquiera de los dos campos; no se envía nada. La franja dorada de abajo es el código de prueba, la parte que va a Midnight. Nadie puede deducir a partir de ella lo que usted escribió.',
  'm.hero.noteShort': 'Solo la franja dorada va a Midnight.',
  'm.hero.stampWord': 'Fechado',
  'm.hero.stampLine': 'en Midnight',
  'm.home.try': 'Pruébelo. No se envía nada.',
  'm.home.tryNote':
    'La figura de arriba se dibuja a partir de este código de prueba. Nadie puede deducir a partir de él lo que usted escribió.',
  'm.home.audLabel': 'Para quién es',
  'm.home.audience':
    'Obtentores|Empresas de semillas|Laboratorios de cultivo de tejidos|Certificadores|Examinadores|Libros genealógicos|Oficinas de variedades vegetales',
  'm.home.keep.t': 'Su genética se queda con usted.',
  'm.home.keep.p':
    'Solo van a Midnight códigos de prueba, nunca lo que usted escribió ni sus archivos. El código de un registro son 64 caracteres que su computadora calcula a partir de él, y nadie puede deducir a partir de él la planta, los marcadores ni el nombre.',
  'm.home.tlDated': 'Registro fechado',
  'm.home.tlAsks': 'Alguien pregunta',
  'm.home.matters': 'Dónde importa.',
  'm.home.prev': 'Anterior',
  'm.home.next': 'Siguiente',
  'm.home.custody.t': 'No podemos leer sus registros: nos llegan cifrados.',
  'm.home.custody.p1':
    'Inscribir el material en sí en un registro oficial significa entregarlo. Con VeilCore, sus archivos de ADN nunca salen de su computadora.',
  'm.home.custody.p2':
    'Los datos del registro llegan cifrados a nuestro servidor, el nombre incluido, y no tenemos la clave.',
  'm.home.ex.label': 'Un registro de ejemplo, no uno real.',
  'm.home.ex.dna': 'Informe de ADN',
  'm.home.l2': 'Su código de prueba: 64 caracteres, calculados en su computadora.',
  'm.home.l3': 'Su código se une a un lote con otros. El bloque en el que queda es la fecha.',
  'm.home.l3b': 'Un lote, muchos registros',
  'm.home.l4v': 'El registro ya existía en esa fecha.',
  'm.home.l4': 'Cualquiera puede comprobarlo, gratis y sin cuenta.',
  'm.home.more': 'Más que una fecha.',
  'm.home.f1t': 'Plantas, animales y cepas.',
  'm.home.f1p': 'Cultivares y líneas, animales individuales y linajes, microbios, hongos y líneas celulares.',
  'm.home.f2t': 'Documentos.',
  'm.home.f2p':
    'Selle un permiso, un certificado, un contrato o un informe de laboratorio. El archivo en sí se queda en su dispositivo.',
  'm.home.ask.t': '«Preguntar», en palabras sencillas.',
  'm.home.ask.p':
    'En las páginas de registros, «Preguntar» completa un registro, o un lote de esquejes o crías, para que usted lo revise. Nunca firma ni envía nada. Eso lo hace usted.',
  'm.home.trustLabel': 'Lo que le aporta',
  'm.home.trust':
    'Prueba de que usted ya tenía un registro a una fecha dada|Una fecha que nadie puede antedatar|Comprobar es gratis|Un formato abierto|Sin billetera, sin crear una cuenta',
  'm.home.pause': 'Pausar los nombres en movimiento',
  'm.home.play': 'Reanudar los nombres en movimiento',
  'm.home.fails': 'Díganos dónde falla.',
  'm.home.closeLede':
    'Obtentores, laboratorios, certificadores y desarrolladores: cree un registro y díganos qué le falta para su trabajo.',
  'm.home.photos': 'Fotos en Unsplash:',
  'm.home.alt.jar': 'Una semilla que brota sobre un frasco de vidrio con agua, con las raíces en el agua',
  'm.home.alt.cutting': 'Un esqueje que echa raíces en un frasco de vidrio con agua, a la luz del sol',
  'm.home.alt.greenhouse': 'Hileras de plantas jóvenes en un invernadero largo',
  'm.home.alt.lab': 'Una mesa de laboratorio con pipetas y tubos de muestra',
  'm.home.alt.hand': 'Una mano que sostiene una plántula sobre bandejas de plantines',
  'm.home.alt.cattle': 'Vacas comiendo heno juntas',
  'm.for.label': 'Para qué sirve',
  'm.for.title1': 'Muchas disputas sobre genética se reducen a una pregunta:',
  'm.for.title2': '¿qué tenía usted, y cuándo?',
  'm.for.lede':
    'Los cuadernos y archivos los fecha quien los lleva, así que es fácil ponerlos en duda. Inscribir el material en sí significa entregar justo lo que quiere proteger.',
  'm.for.1t': 'Un esqueje sale por la puerta.',
  'm.for.1p':
    'Selle un registro y vincule su informe de ADN. Si la planta aparece con otro nombre, un laboratorio puede comparar un análisis nuevo con su informe. En la demo web, el vínculo se guarda con su registro, pero aún no se fecha. VeilCore no hace análisis de ADN.',
  'm.for.2t': 'Protección de variedades y certificación.',
  'm.for.2link': 'Cómo funciona una afirmación →',
  'm.for.3t': 'Material en manos de un laboratorio.',
  'm.for.4t': 'Resultados de laboratorio, de vuelta a usted.',
  'm.for.4p':
    'El laboratorio firma su informe y lo cierra para que solo usted pueda abrirlo. Ningún PDF queda en la bandeja de entrada de nadie. El archivo cifrado espera en el servidor de VeilCore a que usted lo abra, y nosotros no tenemos su clave. VeilCore anota quién firmó; no responde por el resultado. Nuevo, y todavía en pruebas.',
  'm.for.6t': 'Alguien le pide una prueba.',
  'm.for.6p':
    'Le envían un enlace. Usted toca una vez, y la página de la otra persona comprueba en la red que usted controla la clave propia de su registro. Su registro nombró esa clave al sellarse, así que no se puede cambiar por otra. No dice nada sobre quién es usted ni sobre quién obtuvo la planta. Por ahora esto funciona en una red de pruebas de Midnight.',
  'm.for.5t': 'Líneas animales.',
  'm.for.5p':
    'Los libros genealógicos llevan el pedigrí. Un registro puede dar a cada entrada una fecha que nadie puede antedatar, sin publicar el genotipo. En este sitio puede registrar un animal: su identificación individual, padre y madre, y un informe de ADN.',
  'm.for.5ask': 'Si usted cría animales, díganos qué necesitan sus registros.',
  'm.how.label': 'Cómo funciona',
  'm.how.title1': 'Cuatro pasos.',
  'm.how.title2': 'La genética se queda con usted.',
  'm.step1.title': 'Anótelo',
  'm.step1.text':
    'Qué es y de dónde viene. El servidor de VeilCore guarda los detalles cifrados, el nombre incluido, y nosotros no tenemos la clave. Un enlace de comprobación lleva el nombre solo si usted lo activa, para las personas a las que se lo envía.',
  'm.step2.title': 'Genere su código de prueba',
  'm.step2.text': 'En su computadora. Los datos genéticos nunca salen de ella sin cifrar.',
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
    'La afirmación nombra la clave que firmó el registro, así que trata de valores que esa clave firmó, no solo de números que usted escribió. Si la clave es de un laboratorio en el que confía, lo decide usted.',
  'm.claims.limitsTitle': 'Límites.',
  'm.claims.limits':
    'Dieciséis valores por registro. Comparar dos variedades requiere una parte que tenga ambos conjuntos, como el obtentor o un laboratorio que haya analizado las dos. Cualquiera a quien usted dé un valor sellado también puede hacer afirmaciones sobre él. No sirve para comparaciones entre miles de valores. Sin la firma de un laboratorio, los valores son solo la palabra de quien lo selló.',
  'm.claims.statusTitle': 'El contrato de afirmaciones',
  'm.claims.link': 'Cómo funcionan las afirmaciones, en la especificación →',
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
  'm.stops.2a': 'Fija cuándo, no si es cierto.',
  'm.stops.2b':
    'Un registro prueba qué se escribió y cuándo. Un informe de laboratorio vinculado o la firma de un laboratorio dan peso al contenido.',
  'm.stops.3a': 'Funciona con los análisis de ADN, no en lugar de ellos.',
  'm.stops.3b':
    'Fecha un informe de ADN que usted ya tiene, para que un análisis posterior pueda compararse con él. Un vínculo de parentesco significa que ambos titulares estuvieron de acuerdo; lo que prueba la ascendencia es el ADN.',
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
    'Las firmas de un laboratorio sobre un registro son privadas salvo que el titular del registro las muestre. Cada una que se muestra dice qué clave la firmó, el nombre con que se registró esa clave, cualquier acreditación que declaró su titular (no la comprobamos) y si el operador de VeilCore ha cotejado ese nombre con un listado público de licencias o acreditaciones, y en qué fecha. VeilCore no responde por ningún laboratorio: quien comprueba un registro decide cuánto vale una firma.',
  'm.open.4t': 'Cualquiera puede gestionar un servidor de registros.',
  'm.open.4p':
    'El formato permite que un laboratorio, una certificadora o un organismo de derechos lleve su propio servidor de registros, en su propio dominio web, y ancle sin pedirnos permiso. El código de nuestro propio servidor de registros es público, con licencia Apache-2.0, en github.com/hunterincoming/veilcore-api.',
  'm.faq.label': 'Preguntas',
  'm.faq.title1': 'Preguntas',
  'm.faq.title2': 'que nos hacen.',
  'm.faq.1q': '¿Qué impide que alguien registre mi material?',
  'm.faq.2q': '¿Necesito criptomonedas o una billetera?',
  'm.faq.2a':
    'No. Crear un registro en la demo y comprobar cualquier registro no requieren billetera, ni darse de alta, ni comprar nada. Su navegador guarda una clave aleatoria que encuentra sus registros de demo en nuestro servidor. El código de prueba va a Midnight, una red hecha para la privacidad. Usted nunca trata con ella directamente.',
  'm.faq.3q': '¿Se sostendrá en una disputa?',
  'm.faq.3link': 'Los registros como prueba →',
  'm.faq.4q': '¿Qué ven ustedes de mis datos?',
  'm.faq.4a':
    'De sus datos genéticos sin cifrar: nada. Su computadora lee los archivos que usted agrega para hacer un código de cada uno, y no se suben. Un informe de laboratorio llega a nuestro servidor solo cuando un laboratorio se lo devuelve: va cifrado para que solo usted pueda abrirlo, y se borra a los 180 días. Los detalles que escribe (el nombre del registro, obtentor, fechas, notas, términos de acuerdos) y los nombres de sus archivos se guardan cifrados en nuestro servidor, y nosotros no tenemos la clave. Podemos leer el código de prueba de cada registro y todo lo que usted decida mostrar. Los datos de muestra que usted y un laboratorio escriben para un envío también se guardan cifrados, con una clave que va en el código de laboratorio y que nosotros no tenemos. Los laboratorios y desarrolladores pueden sellar registros dentro de sus propios sistemas, de modo que solo sale el código de prueba.',
  'm.faq.4link1': 'Lo que guarda la demo →',
  'm.faq.4link2': 'Guía de integración →',
  'm.faq.6q': '¿Cuánto cuesta?',
  'm.faq.6a': 'Gratis. Crear un registro en este sitio y comprobar cualquier registro son gratis.',
  'm.demo.lede':
    'Sin crear una cuenta, sin billetera. Es una versión de prueba, así que use datos inventados. Los registros se fechan por lotes en Midnight; las licencias y los acuerdos de laboratorio son simulados, y las vinculaciones de informes de ADN todavía no se fechan.',
  'm.demo.privacy': 'Lo que guarda la demo →',
  'm.updates.more': 'Todas las novedades',
  'm.stat3.s':
    'Aún no hay una auditoría de seguridad independiente. Nuestras propias revisiones de los contratos son públicas.',
  'm.stat3.link': 'Leerlas en GitHub →',
  'm.stat4.b': 'Sin cuenta, sin billetera',
  'm.stat4.s': 'Cree un registro ahora. Comprobar uno es gratis y no requiere cuenta.',
  'm.addr.title': 'Los contratos, para quien quiera comprobarlos.',
  'm.addr.main': 'Contrato principal',
  'm.addr.claims': 'Contrato de afirmaciones',
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
  'm.contact.3p': 'Agréguelo al software que ya usa. Sin cuenta ni clave de API con nosotros.',
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
    'Con ese paquete de evidencia, cualquiera puede comprobar un registro sin conexión: abrir su verify.html y luego buscar en un explorador de Midnight la única transacción que nombra. Los registros sellados desde el 14 de octubre también necesitan la sección 3.6.1 de la especificación, en la especificación de este sitio y en el SDK 0.16.0 y posteriores.',
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
    'Recalcular el código de prueba de un registro solo requiere SHA-256 y la especificación abierta. Su prueba de inclusión une ese código de prueba con la raíz de un lote anclado en Midnight, y la transacción que lo ancló da la fecha del lote. El verify.html del paquete de evidencia rehace ese cálculo sin conexión y nombra la transacción y la raíz del lote que hay que buscar. La página de comprobación consulta esa transacción en Midnight por sí misma cuando puede llegar a Midnight; si no, dice que la fecha es la que informa nuestro servidor de registros, y usted puede buscarla en un explorador de Midnight. Los registros sellados desde el 14 de octubre nombran su propia clave, así que comprobarlos también requiere la sección 3.6.1, en la especificación de este sitio y en el SDK 0.16.0 y posteriores. Buscar un registro por su identificador en este sitio usa nuestro servidor.',
  'm.tech.impl.t': 'Una especificación, tres implementaciones',
  'm.tech.impl.p':
    'Libre de implementar, para siempre. TypeScript, Python y Rust coinciden en los 121 vectores de prueba del formato de registro en GitHub, y cualquiera puede ejecutarlos. Un mismo autor escribió las tres, y la de TypeScript está en npm como 0.18.1. Una escrita por otra persona es la prueba que más deseamos.',
  'm.tech.btc.t': 'El sello de Bitcoin',
  'm.tech.btc.p':
    'Nuestro servidor de registros sella en Bitcoin el código de cada lote sellado, con OpenTimestamps. El primero entró en el bloque 971004 de Bitcoin el 11 de octubre. Comprobado el 15 de octubre con dos exploradores de bloques: el sello lleva a los bloques 971004 y 971005 de Bitcoin. Aún falta comprobarlo con la herramienta oficial de OpenTimestamps y un nodo completo de Bitcoin. El archivo de sello es el archivo .ots del lote: «Descargar el archivo de sello de Bitcoin», en la página de la planta. El servidor de registros del sitio de prueba no sella en Bitcoin.',
  'm.tech.dna.t': 'Vinculación de informes y firmas de laboratorio',
  'm.tech.dna.p':
    'Cuando la vinculación de un informe de ADN pasa por el contrato de VeilCore en Midnight, queda fechada: muestra que quien controlaba el registro en esa fecha tenía ese informe, o su SHA-256, para entonces. Lo que va a la cadena está atado al registro y oculta el informe, así que nadie puede copiar la vinculación a su propio registro. La firma de un laboratorio en un informe cifrado cubre exactamente ese archivo y el registro al que se refiere.',
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
    'Un formato de registro abierto para genética vegetal, animal y microbiana. Este es el sitio de prueba, en una red de pruebas de Midnight; veilcore.org funciona en la red principal de Midnight.',
  'm.for.1p':
    'Selle un registro y vincule su informe de ADN. Si la planta aparece con otro nombre, un laboratorio puede comparar un análisis nuevo con su informe. En este sitio de prueba puede fechar el vínculo desde su navegador, y nadie puede copiarlo a su propio registro. VeilCore no hace análisis de ADN.',
  'm.demo.lede':
    'Sin crear una cuenta, sin billetera. Este es el sitio de prueba, así que use datos inventados. Los lotes se anclan automáticamente en la red de pruebas de Midnight, y eso fecha sus registros. El acuse de recibo de un laboratorio es una firma real con la propia clave del laboratorio, guardada fuera de la cadena. Las licencias y los acuerdos de laboratorio también se hacen aquí con transacciones reales, en la red de pruebas.',
  'm.privacy.test.text':
    'Este sitio usa la red de pruebas preprod de Midnight, no la principal. Su navegador envía cada sello de fecha a esa red a través del servicio de tarifas de VeilCore; lo que usted escribió y sus archivos nunca se envían allí. Una red de pruebas puede reiniciarse, y los datos de prueba pueden borrarse.',
  'm.privacy.hosts.text':
    'Este sitio web está alojado en Vercel, que registra direcciones IP y solicitudes. Nuestro servidor de registros, y el servicio que paga las tarifas de la red de pruebas y transmite las lecturas de la red de esta página, funcionan en Railway, que registra solicitudes. Ese servicio lee la red a través de Blockfrost.',
  'm.tech.check.p':
    'Recalcular el código de prueba de un registro solo requiere SHA-256 y la especificación abierta. Su prueba de inclusión une ese código de prueba con la raíz de un lote anclado en Midnight, y la transacción que lo ancló da la fecha del lote. El verify.html del paquete de evidencia rehace ese cálculo sin conexión y nombra la transacción y la raíz del lote que hay que buscar. La página de comprobación consulta esa transacción en Midnight por sí misma cuando puede llegar a Midnight. Los registros sellados desde el 14 de octubre nombran su propia clave, así que comprobarlos también requiere la sección 3.6.1, en la especificación de este sitio y en el SDK 0.16.0 y posteriores. Buscar un registro por su identificador en este sitio usa nuestro servidor.',
  // Agreements are real on the test site: every type, on Midnight's test network.
  'm.get.2b':
    'Se adjuntan al registro. Un licenciatario puede probar que tiene una licencia vigente sin mostrar cuál. Una regalía u otra obligación sobre un progenitor aparece en cada descendiente que ambos titulares confirmaron; VeilCore la anota y no la cobra. Se usa desde este sitio de prueba, con transacciones reales en la red de pruebas de Midnight.',
  // Agreements are real on the test site: every type, on Midnight's test network.
  'm.for.3p':
    'Envíe material con un código de laboratorio. El laboratorio firma un acuse de recibo con su propia clave, así el registro muestra a una segunda parte. El acuse es una firma real, guardada por el servidor de registros de VeilCore, no en la cadena. Condiciones como no propagar van en un acuerdo con el laboratorio, que usted y el laboratorio hacen aquí en la red de pruebas de Midnight.',
};
