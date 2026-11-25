// Spanish: the privacy policy (privacy-policy/en.ts is the source; docs/i18n-glossary.md for the terms).
// SPDX-License-Identifier: Apache-2.0
import type { PolicyStrings } from './index';

export const policyEs: PolicyStrings = {
  'm.pp.title': 'Política de privacidad',
  'm.pp.updated': 'Última actualización: {date}.',
  'm.pp.lede':
    'Esta política cubre veilcore.org: el sitio web, el servidor de VeilCore que guarda los registros (el servidor de registros) y el servicio que paga por usted las tarifas de la red de Midnight (el servicio de tarifas). Dice qué guardamos, qué es público, quién más ve qué y qué puede hacer usted.',

  'm.pp.short.t': 'En pocas palabras',
  'm.pp.short.1':
    'Sus archivos de ADN, sus archivos de informes de laboratorio y sus fotos nunca salen de su dispositivo. Su navegador hace un código con cada uno; el archivo en sí nunca se sube.',
  'm.pp.short.2':
    'Lo que escribe en un registro se cifra en su navegador antes de enviarse. Nuestro servidor lo guarda cifrado, y nosotros no tenemos la clave.',
  'm.pp.short.3':
    'Nuestro servidor puede leer lo que necesita para funcionar: el ID de un registro, su código de prueba, cuándo se guardó y lo que usted decida mostrar. La lista completa está abajo.',
  'm.pp.short.4':
    'Solo van a redes públicas códigos y lo que usted decida probar (a Midnight y, a través de OpenTimestamps, a Bitcoin). Lo que escribió va allí solo si prueba un número exacto de ello. Una vez allí, nadie puede borrarlo, ni siquiera nosotros.',
  'm.pp.short.5': 'No vendemos sus datos. Sin anuncios, sin analítica ni seguimiento, sin cookies.',
  'm.pp.short.6':
    'Puede descargar sus registros y eliminarlos. Para cualquier otra cosa, escriba a hunter@veilcore.org.',

  'm.pp.who.t': 'Quiénes somos',
  'm.pp.who.p':
    'Los fundadores de VeilCore gestionan este sitio web, el servidor de registros y el servicio de tarifas. Escríbanos a hunter@veilcore.org.',

  'm.pp.device.t': 'Lo que se queda en su dispositivo',
  'm.pp.col.what': 'Qué',
  'm.pp.device.col': 'Qué pasa con ello',
  'm.pp.device.files.t': 'Informes de ADN, archivos de informes de laboratorio y fotos que usted agrega',
  'm.pp.device.files.p': 'Su navegador lee cada uno para hacer su código (su SHA-256). El archivo nunca se sube.',
  'm.pp.device.vault.t': 'La clave que cifra sus registros',
  'm.pp.device.vault.p':
    'Se guarda en su navegador y en su archivo de copia de seguridad, y nunca se nos envía sin cifrar. Si activa «Guardado con VeilCore», va dentro de una copia cifrada que solo su llave de acceso o su hoja de recuperación abren.',
  'm.pp.device.recordkeys.t': 'Las claves secretas de cada registro',
  'm.pp.device.recordkeys.p':
    'Se guardan en su navegador y en su archivo de copia de seguridad. Una copia cifrada va con el registro a nuestro servidor, para que su copia de seguridad las recupere.',
  'm.pp.device.labkey.t': 'La clave privada de firma de un laboratorio',
  'm.pp.device.labkey.p':
    'Se guarda en el navegador del laboratorio y en su archivo de copia de seguridad. Solo se nos envía sin cifrar la clave pública. Con «Guardado con VeilCore» activado, la clave privada también va dentro de su copia cifrada.',
  'm.pp.device.deviceonly.t': 'Un documento que guarda solo en este dispositivo',
  'm.pp.device.deviceonly.p':
    'Nada de lo que escriba en él se nos envía, ni cifrado ni sin cifrar. Recibimos su ID, su código de prueba y su vínculo de clave, para poder fecharlo. Con «Guardado con VeilCore» activado, su ID y sus claves, no lo que escribió, también van dentro de su copia cifrada. No podemos devolvérselo: conserve el archivo de copia de seguridad que la aplicación le pide guardar.',
  'm.pp.device.scan.t': 'La cámara, cuando escanea un código',
  'm.pp.device.scan.p':
    'La imagen se lee en la página y se descarta. Solo el texto leído va al campo en el que escaneó, y de ahí solo adonde ese campo ya va.',
  'm.pp.device.labels.t': 'Las etiquetas QR que imprime',
  'm.pp.device.labels.p':
    'Se dibujan en su dispositivo y las imprime su navegador. Una etiqueta lleva el ID y el código de prueba del registro, y su nombre solo si usted lo marca.',
  'm.pp.device.sheet.t': 'El código de su hoja de recuperación',
  'm.pp.device.sheet.p':
    'Se crea en su dispositivo y se imprime desde él. Nunca se nos envía, y no se guarda en el dispositivo.',
  'm.pp.device.passkey.t': 'La página de prueba de llaves de acceso',
  'm.pp.device.passkey.p': 'Prueba su llave de acceso en su navegador. No se envía nada.',
  'm.pp.device.import.t': 'Una hoja de cálculo que importa',
  'm.pp.device.import.p':
    'Se lee en su navegador y nunca se sube. De cada fila solo se guardan los datos que usted elige, cifrados, como con cualquier registro. Su navegador conserva las filas de su última importación (cada columna, el nombre del archivo y el resultado de cada fila) hasta que elija su próximo archivo o pulse «Quitarla» o «Importar otro archivo». Si decide recordar las columnas de una hoja, conserva además sus nombres, qué columna es cuál, la fila en la que están y los valores por defecto que fijó allí (obtentor, especie, sistema de identificación y orden de las fechas), hasta que pulse «Olvidar», para hasta 20 hojas (la que lleva más tiempo sin usarse se quita primero). Ninguna de las dos cosas se nos envía.',
  'm.pp.device.ask.t': '«Preguntar», la ayuda de la aplicación',
  'm.pp.device.ask.p':
    'Funciona en su dispositivo. Lo que le escribe no se envía. Solo envía Guardar, o aprobar una tarea de «Hágalo por mí», que entonces guarda, envía informes o fecha exactamente lo que usted aprobó. Una tarea se guarda solo en su dispositivo y se borra 7 días después de terminar.',

  'm.pp.browser.t': 'Lo que guarda su navegador',
  'm.pp.browser.p1':
    'El sitio guarda esto en el almacenamiento de su navegador en este dispositivo. Algunas cosas son secretas, y otras son lo que usted escribió, guardado sin cifrar. Cualquiera que pueda leer el almacenamiento de este navegador podría leerlas o usarlas, y si lo borra, se pierden salvo que estén en su archivo de copia de seguridad.',
  'm.pp.browser.records.t': 'Sus registros y sus secretos',
  'm.pp.browser.records.p':
    'Un registro que aún no terminó (y uno por registro para su siguiente etapa), los registros que esperan guardarse o comprobarse, los documentos guardados solo en este dispositivo, las tareas de «Hágalo por mí», y las filas de su última importación de una hoja de cálculo y las columnas que decidió recordar. Se guardan tal cual, sin cifrar: cualquiera que pueda leer el almacenamiento de este navegador puede leerlos. Un registro cuya corrección no tuvo respuesta clara espera aquí hasta que se vuelva a llegar a nuestro servidor o, después de empezar de nuevo, durante 30 días, y se quita la próxima vez que se abra VeilCore después de ese plazo. Los secretos: su clave de titular (la clave que encuentra sus registros en nuestro servidor), la clave que cifra sus registros, las claves secretas de cada registro y la clave de firma de un laboratorio. Su archivo de copia de seguridad contiene estas claves y sus registros. Los registros que esperan guardarse van cifrados a nuestro servidor, con su clave de titular, como cualquier guardado. Donde el navegador puede enviar por sí solo (Chrome), también guarda los registros que esperan su fecha, con su clave de titular, hasta que vuelva la señal. Con «Guardado con VeilCore» activado, guarda además dos claves hechas a partir de su clave de cuenta, que la página puede usar pero no extraer.',
  'm.pp.browser.deals.t': 'Licencias y acuerdos',
  'm.pp.browser.deals.p':
    'Las licencias que tiene, con el secreto de cada una, las claves de los acuerdos de licencia que otorga, los mensajes de acuerdos firmados y aún no entregados (cifrados; pasados 30 días, se quitan la próxima vez que se abra VeilCore), los derechos de un prestamista con sus secretos y las claves de proveedores de pagos que usted nombró. Los secretos: los secretos de las licencias, las claves de los acuerdos y los secretos de un prestamista. Su archivo de copia de seguridad los contiene. Los derechos de un prestamista se guardan tal como se escribieron, sin cifrar. Los mensajes de los acuerdos van cifrados a nuestro servidor. Las claves de proveedores que usted nombra nunca se envían.',
  'm.pp.browser.moving.t': 'Lo que recibe o envía',
  'm.pp.browser.moving.p':
    'Los códigos de laboratorio que hizo o recibió, un código que está recibiendo, hasta que se guarde su registro, con lo que el remitente envió con él, los nombres que dio a los destinatarios y las claves de envío que esperan a que se guarde su registro, qué informes de laboratorio abrió, las solicitudes que hizo para demostrar la clave de un registro (durante 7 días), una solicitud que le envió el sitio de un socio (en esta pestaña, hasta una hora), y los sellos de fecha de claves o fechas de informes de laboratorio aún pendientes. Los secretos: los códigos y las claves de envío. Los nombres de destinatarios y las palabras del remitente que llegaron con un código se guardan sin cifrar. Su archivo de copia de seguridad contiene los códigos de laboratorio que hizo, los envíos de un laboratorio y un código que aún está recibiendo. Empezar de nuevo borra un código que aún está recibiendo, y antes pregunta si ninguna copia de seguridad comprobada lo contiene. Los nombres de destinatarios y las claves de envío van a nuestro servidor dentro de la copia cifrada del registro.',
  'm.pp.browser.settings.t': 'Ajustes y marcas de «ya visto»',
  'm.pp.browser.settings.p':
    'Su idioma y su rol, las opciones que eligió, los avisos que cerró, qué registros llegaron de una copia de seguridad o se quitaron de este navegador, lo que contiene una copia de seguridad comprobada, un boleto aleatorio para el servicio de tarifas, y marcas breves que evitan que dos pestañas hagan lo mismo. Ninguna contiene una clave ni lo que usted escribió. El boleto va al servicio de tarifas, y el ID de la copia guardada va a nuestro servidor cuando la copia se guarda o se comprueba.',
  'm.pp.browser.caches.t': 'Cachés de archivos públicos',
  'm.pp.browser.caches.p':
    'Una copia del código de este sitio, para que abra sin señal, y los archivos públicos que su navegador necesita para hacer una prueba para Midnight, descargados una vez de este sitio. Nada suyo.',
  'm.pp.browser.p2':
    'Sin cookies. Para quitarlo todo, borre los datos de este sitio en los ajustes de su navegador. Antes, guarde su copia de seguridad: sin ella, no podrá volver a encontrar ni abrir sus registros. Lo que no está en su copia, como un registro sin terminar, se pierde para siempre. El nombre de cada elemento guardado está en «Detalles técnicos», al final.',

  'm.pp.server.t': 'Lo que guarda nuestro servidor',
  'm.pp.server.p':
    'Nuestro servidor es el servidor de registros de VeilCore, alojado en Railway. «Cifrado» quiere decir que su navegador lo cifró antes de enviarlo, y nosotros no tenemos la clave.',
  'm.pp.col.read': '¿Podemos leerlo?',
  'm.pp.col.keep': 'Por cuánto tiempo',
  'm.pp.server.records.t':
    'Sus registros y acuerdos: el nombre, el obtentor o criador, la especie, las fechas, las notas, los números de referencia y los progenitores de cada registro, los códigos y nombres de archivo de las fotos e informes de laboratorio que agrega, los términos de los acuerdos y la otra parte, los nombres que da a los destinatarios y las claves secretas de cada registro',
  'm.pp.server.records.read': 'No. Cifrado.',
  'm.pp.server.records.keep': 'Hasta que usted lo elimine o nos pida eliminarlo',
  'm.pp.server.facts.t':
    'Sobre cada registro: su ID, su código de prueba, su vínculo de clave y su tipo; un código hecho con su nombre, que no dice nada del nombre sin la clave de su enlace de comprobación; sus vínculos de corrección; cuándo lo vio nuestro servidor por primera vez; cuántas veces se guardó y cuándo por última vez; su tamaño aproximado; los vínculos con progenitores que registra; su lote y sus sellos de tiempo',
  'm.pp.server.facts.read':
    'Sí. Cualquiera con el ID del registro ve su código de prueba, cuándo lo vio nuestro servidor por primera vez, sus vínculos de corrección, su lote y sus sellos de tiempo, y si tiene firmas de laboratorio.',
  'm.pp.server.facts.keep': 'Mientras exista el registro',
  'm.pp.server.shown.t':
    'Lo que decide mostrar en la página de comprobación de un registro, como su nombre, la firma de un laboratorio o si hay un informe de ADN guardado (como código)',
  'm.pp.server.shown.read': 'Sí. Cualquiera con el ID del registro lo ve.',
  'm.pp.server.shown.keep': 'Hasta que lo desactive o elimine el registro',
  'm.pp.server.holder.t': 'Su clave de titular, que su navegador envía cada vez que guarda',
  'm.pp.server.holder.read': 'Solo guardamos un resumen de un solo sentido de ella.',
  'm.pp.server.holder.keep':
    'Mientras existan sus registros, y después junto a cada registro eliminado y cada código de prueba que tuvo',
  'm.pp.server.copy.t':
    '«Guardado con VeilCore»: una copia cifrada de lo que contiene su archivo de copia de seguridad, salvo los registros en sí y un código que aún está recibiendo (sus claves, los códigos de laboratorio y las claves de licencias y acuerdos), y una clave cifrada para cada forma de entrar (una llave de acceso o una hoja de recuperación)',
  'm.pp.server.copy.read':
    'No. Cifrado. Vemos qué formas de entrar abren qué copia y de qué tipo es cada una, el tamaño aproximado de la copia y cuándo se guarda o se comprueba. No se nos dice de quién es la copia, pero la hora y la dirección de un guardado podrían permitirnos adivinar con qué registros va.',
  'm.pp.server.copy.keep': 'Hasta que elija «Dejar de guardar con VeilCore»',
  'm.pp.server.delivery.t':
    'Códigos de laboratorio (envíos): de qué registro salió un envío, qué cuenta lo recibió y cuándo, y una etiqueta en lugar del nombre del destinatario. La cantidad, la nota y los datos de muestra (ID de muestra, número de precinto, dónde y cuándo se tomó, un testigo, cómo llegó) van cifrados con una clave que viaja en el código de laboratorio.',
  'm.pp.server.delivery.read': 'En parte. Los datos van cifrados.',
  'm.pp.server.delivery.keep': 'Sin plazo fijado',
  'm.pp.server.labs.t':
    'Laboratorios: la clave pública de un laboratorio, el nombre, la función y el sitio web que indica, nuestras notas sobre la comprobación de su nombre y las firmas que hace. Los recibos e informes de un laboratorio sobre su registro solo los ven usted, el laboratorio y quien le envió la muestra, salvo que usted decida mostrarlos.',
  'm.pp.server.labs.read': 'Sí',
  'm.pp.server.labs.keep': 'Sin plazo fijado',
  'm.pp.server.results.t': 'Informes de laboratorio que un laboratorio le envía',
  'm.pp.server.results.read': 'No. Cifrados con la clave de su registro.',
  'm.pp.server.results.keep':
    'Se borran 180 días después de llegar. Las copias en nuestras copias de seguridad se quedan hasta que estas se quiten.',
  'm.pp.server.prove.t':
    'Solicitudes de demostrar la clave de un registro: el nombre que escribió quien pregunta, y las respuestas. Nuestro servidor sabe qué clave en la cadena nombra cada solicitud.',
  'm.pp.server.prove.read': 'Sí, y también cualquiera con el enlace de la solicitud',
  'm.pp.server.prove.keep': 'Se borran a los 7 días',
  'm.pp.server.invites.t':
    'Invitaciones de licencia: la etiqueta que usted da a la otra parte, a qué registro corresponde, y los códigos e ID de transacción que intercambian los dos navegadores',
  'm.pp.server.invites.read': 'Sí, y también cualquiera con el enlace de la invitación',
  'm.pp.server.invites.keep': 'Se borran a los 30 días',
  'm.pp.server.deals.t':
    'Los mensajes de un acuerdo de licencia: los términos, los informes de regalías y sus respuestas, «Pagué», «Recibido», y los datos de cobro y de la empresa',
  'm.pp.server.deals.read':
    'No. Cifrados con una clave que solo comparten las dos partes. Vemos a qué licencia pertenecen, cuántos hay y cuándo llegó cada uno.',
  'm.pp.server.deals.keep': 'Hasta que una parte nos pida eliminarlos. Un acuerdo sin mensajes se borra a los 7 días.',
  'm.pp.server.notices.t':
    'Líneas de licencia en la página de comprobación de un registro (un informe vencido, un aviso de incumplimiento, revocada) y la respuesta de la otra parte (su tipo y su fecha)',
  'm.pp.server.notices.read': 'Sí. Cualquiera con el ID del registro las ve.',
  'm.pp.server.notices.keep': 'Hasta que se quite la línea o se elimine el registro. Las respuestas se conservan.',
  'm.pp.server.obligations.t':
    'Una regalía sobre la descendencia: qué registro cubre y desde cuándo rige. Cualquiera puede preguntar si un registro tiene una.',
  'm.pp.server.obligations.read': 'Sí',
  'm.pp.server.obligations.keep': 'Mientras exista la licencia',
  'm.pp.server.receipts.t':
    'El recibo de un proveedor de pagos por un informe de regalías: el monto, la moneda, la cuenta a la que se pagó, su referencia y cuándo',
  'm.pp.server.receipts.read':
    'Sí, por cualquiera que tenga el código del informe, que solo tienen las dos partes y su proveedor.',
  'm.pp.server.receipts.keep': 'Sin plazo fijado',
  'm.pp.server.batches.t':
    'Lotes: el código de prueba de cada registro, la prueba de que está en su lote, el código del lote, dónde se ancló, su sello de Bitcoin y sus sellos de tiempo',
  'm.pp.server.batches.read': 'Sí',
  'm.pp.server.batches.keep': 'Se conservan: son lo que permite comprobar registros antiguos',
  'm.pp.server.logs':
    'Nuestro servidor de registros no guarda un historial de solicitudes ni anota quién miró una página de comprobación. Para limitar abusos, cuenta las solicitudes por dirección de red solo en memoria; los conteos desaparecen cuando se reinicia. Para limitar las solicitudes de sellos de tiempo, también guarda durante un día cuándo pidió uno cada clave de titular. El servicio de tarifas solo anota contadores y resultados, nunca lo que se envió. Nuestros proveedores de alojamiento guardan sus propios historiales de solicitudes (ver abajo).',
  'm.pp.server.purge':
    'El texto guardado antes de que los registros se cifraran se quitó de nuestro servidor el 18 de octubre de 2026, y las copias de seguridad hechas antes ya no se pueden abrir: destruimos su clave ese mismo día.',
  'm.pp.server.backup':
    'Copias de seguridad: una vez al día, los datos de nuestro servidor de registros y los archivos cifrados de informes de laboratorio se cifran con una clave que nuestro servidor nunca tiene y se guardan en Backblaze B2. El almacenamiento está configurado para proteger cada copia contra borrado durante 30 días, así que nadie puede borrarla antes; aún no está fijado cuánto tiempo se conservan después. Un registro que usted elimina sigue en las copias hechas antes, hasta que estas se quiten.',

  'm.pp.chain.t': 'Lo que es público, para siempre',
  'm.pp.chain.p1':
    'Midnight y Bitcoin son redes públicas. Lo que va allí no lo puede cambiar ni quitar nadie, ni siquiera nosotros, y cualquiera puede leerlo. Lo que usted escribió y sus archivos nunca van allí, salvo un número que decida probar exacto (abajo). Lo que sí va:',
  'm.pp.chain.1':
    'el código de cada lote de registros (un código que representa a todos los registros del lote), en Midnight y, a través de OpenTimestamps, en Bitcoin;',
  'm.pp.chain.2': 'la clave propia de un registro y su sello de fecha, cuando usted fecha el registro;',
  'm.pp.chain.3': 'un código hecho con un informe de ADN, cuando fecha su vinculación;',
  'm.pp.chain.4':
    'qué registros están vinculados como progenitor y descendiente, una vez que ambos titulares lo confirman;',
  'm.pp.chain.5':
    'que un registro tiene una licencia, una obligación o un derecho de un prestamista, y cuándo cambió eso;',
  'm.pp.chain.6': 'la clave pública de un laboratorio, cuando firma allí un certificado;',
  'm.pp.chain.7':
    'lo que usted decide probar sobre un número: el límite y su sentido o, si lo prueba exacto, el número en sí. Un resultado de filiación prueba solo que sus conflictos y SNP comparados están dentro de los límites de ICAR; no se publica ningún genotipo ni ningún conteo.',
  'm.pp.chain.p2':
    'Nuestro servicio de tarifas ancla cada lote. En los demás pasos, la aplicación muestra primero un comprobante que enumera exactamente lo que ese paso hace público, y su navegador lo envía a través de nuestro servicio de tarifas, que paga la tarifa. Un código o una clave por sí solos no dicen nada de usted, pero cualquiera a quien le dé un enlace de comprobación puede seguir lo que pasa con ese registro en la red desde entonces.',

  'm.pp.ts.t': 'Sellos de tiempo, y comprobar en Bitcoin',
  'm.pp.ts.p1':
    'Cuando nuestro servidor recibe el código de prueba de un registro, pide a una o más autoridades de sellado de tiempo (servicios independientes, algunos a cargo de una sola persona) un sello de tiempo sobre él, y sobre cada lote. Cada autoridad recibe un código hecho a partir del código de prueba y la hora en que se pidió, y puede llevar una lista de ellos. Como los códigos de prueba aparecen en las páginas de comprobación, una autoridad podría relacionar esa lista con un enlace de comprobación. Cualquiera con un enlace de comprobación puede leer, al segundo, cuándo nuestro servidor recibió el código de prueba de ese registro. Para un registro sellado sin señal, es cuando su dispositivo volvió a tener señal.',
  'm.pp.ts.p2':
    'La página de comprobación de un registro puede comprobar ella misma su sello de Bitcoin. Solo cuando presiona «Comprobar en Bitcoin» su navegador pide cabeceras de bloque a dos exploradores de bloques, mempool.space y blockstream.info. Ellos ven su dirección IP, que se está comprobando un lote de VeilCore y qué bloque; no el registro. Un paquete de pruebas hace lo mismo solo si marca «Incluir las cabeceras de bloque de Bitcoin».',

  'm.pp.others.t': 'Quién más maneja datos',
  'm.pp.others.p': 'Estos servicios trabajan para nosotros, o son las redes públicas que usamos.',
  'm.pp.col.service': 'Servicio',
  'm.pp.col.does': 'Qué hace',
  'm.pp.col.gets': 'Qué recibe',
  'm.pp.others.vercel.n': 'Vercel',
  'm.pp.others.vercel.does': 'Aloja este sitio web',
  'm.pp.others.vercel.gets':
    'Su dirección IP y las páginas y archivos que carga, incluida la dirección de una página de comprobación, que lleva el ID y el código de prueba del registro. Vercel guarda historiales de solicitudes.',
  'm.pp.others.railway.n': 'Railway',
  'm.pp.others.railway.does':
    'Hace funcionar nuestro servidor de registros, el servicio de tarifas y el relé a través del cual su navegador lee Midnight',
  'm.pp.others.railway.gets':
    'Su dirección IP y sus solicitudes a esos servicios (comprobar un registro nombra su ID), y los datos guardados del servidor de registros. Railway guarda historiales de solicitudes.',
  'm.pp.others.blockfrost.n': 'Blockfrost',
  'm.pp.others.blockfrost.does': 'Conecta nuestro servicio de tarifas y nuestro relé con Midnight',
  'm.pp.others.blockfrost.gets':
    'Las transacciones que envía el servicio de tarifas, y las preguntas del relé (lo que la aplicación y las páginas de comprobación consultan en Midnight). Llegan desde nuestro servicio, no desde su navegador.',
  'm.pp.others.midnight.n': 'La red Midnight',
  'm.pp.others.midnight.does': 'Fecha los lotes y deja constancia de lo que envía su navegador',
  'm.pp.others.midnight.gets': 'Transacciones públicas (ver arriba)',
  'm.pp.others.ots.n': 'Calendarios de OpenTimestamps',
  'm.pp.others.ots.does': 'Sellan los códigos de los lotes en Bitcoin',
  'm.pp.others.ots.gets': 'Los códigos de los lotes, desde nuestro servidor de registros',
  'm.pp.others.tsa.n': 'Autoridades de sellado de tiempo, como FreeTSA y DigiCert',
  'm.pp.others.tsa.does': 'Ponen un sello de tiempo a cada código de prueba y a cada lote',
  'm.pp.others.tsa.gets': 'Un código hecho con cada uno, y cuándo se pidió, desde nuestro servidor de registros',
  'm.pp.others.explorers.n': 'Exploradores de bloques de Bitcoin: mempool.space y blockstream.info',
  'm.pp.others.explorers.does':
    'Comprueban sellos de Bitcoin: nuestro servidor de registros les pregunta por cada lote; su navegador, solo cuando usted lo pide',
  'm.pp.others.explorers.gets':
    'Qué bloque. Desde su navegador, también su dirección IP y que se está comprobando un lote de VeilCore.',
  'm.pp.others.backblaze.n': 'Backblaze B2',
  'm.pp.others.backblaze.does': 'Guarda nuestras copias de seguridad',
  'm.pp.others.backblaze.gets': 'Archivos cifrados que no puede abrir',
  'm.pp.others.labsite.n': 'El sitio web de un laboratorio',
  'm.pp.others.labsite.does':
    'Si un laboratorio indica su sitio web, nuestro servidor de registros comprueba cada día que muestre la clave del laboratorio',
  'm.pp.others.labsite.gets': 'Una solicitud de nuestro servidor de registros. Nada sobre usted.',
  'm.pp.others.passkey.n':
    'Su proveedor de llaves de acceso, como el Llavero de iCloud o el Gestor de contraseñas de Google',
  'm.pp.others.passkey.does':
    'Guarda la llave de acceso que usa con «Guardado con VeilCore», con sus propias condiciones',
  'm.pp.others.passkey.gets': 'Que usted tiene una llave de acceso para veilcore.org. Nunca recibimos la llave.',
  'm.pp.others.links':
    'Las páginas de aquí enlazan a otros sitios, como exploradores de Midnight, GitHub y los documentos que citamos. Abrir uno es algo entre usted y ese sitio.',

  'm.pp.dont.t': 'Lo que no hacemos',
  'm.pp.dont.1': 'No vendemos ni alquilamos sus datos, ni los compartimos para publicidad.',
  'm.pp.dont.2':
    'Sin anuncios, sin analítica, sin píxeles de seguimiento, sin scripts ni fuentes de terceros, y sin cookies.',
  'm.pp.dont.3': 'VeilCore no responde por ningún registro, obtentor, criador ni laboratorio.',

  'm.pp.pay.t': 'Pagos',
  'm.pp.pay.p':
    'Este sitio no recibe pagos, y VeilCore nunca guarda ni mueve dinero. Las regalías se pagan entre las dos partes, o a través de un proveedor de pagos que ellas eligen (su recibo figura arriba). Antes de activar aquí cualquier función de pago, actualizaremos esta página.',

  'm.pp.rights.t': 'Lo que puede hacer',
  'm.pp.rights.see.t': 'Ver y descargar',
  'm.pp.rights.see.p':
    'En su página de registros, en «Más»: «Exportar todos los registros» descarga lo que tiene este navegador, y «Descargar sus registros y acuerdos de VeilCore» descarga sus registros, licencias y opciones de lo que comparte tal como los guarda nuestro servidor. Esa descarga no incluye los envíos con sus datos de muestra, los informes y firmas de laboratorio, las regalías sobre la descendencia, las invitaciones de licencia, los mensajes de acuerdos, las solicitudes de demostración ni los sellos de tiempo de cada registro; abra los envíos y los informes de laboratorio desde el envío en la aplicación. Sus claves están en su archivo de copia de seguridad (Ajustes, «Descargar una copia»). Para cualquier otra cosa, escríbanos.',
  'm.pp.rights.delete.t': 'Eliminar',
  'm.pp.rights.delete.p':
    '«Eliminar este registro», en la página de un registro, quita para siempre de nuestro servidor sus datos, su copia cifrada y todo lo que usted mostró. «Dejar de guardar con VeilCore», en Ajustes, elimina su copia guardada y todas las formas de entrar a ella. Para cualquier otra cosa, como mensajes de acuerdos, envíos o todo a la vez, escriba a hunter@veilcore.org con los ID.',
  'm.pp.rights.keep.t': 'Lo que no se puede eliminar',
  'm.pp.rights.keep.p':
    'Todo lo que está en Midnight o Bitcoin. Después de eliminar un registro, nuestro servidor conserva su ID, su código de prueba, cuándo se eliminó y un resumen de un solo sentido de su clave de titular, para que sus enlaces de comprobación puedan decir que su titular lo eliminó y nadie pueda reutilizarlo. También conserva para siempre cada código de prueba que tuvo una clave de titular, con ese resumen y desde cuándo lo tuvo. Los vínculos con progenitores y las obligaciones ya anotados se quedan, y también las firmas que un laboratorio ya hizo. Las copias de seguridad hechas antes de la eliminación conservan su copia hasta que se quiten. Las copias que otras personas ya tienen, como un enlace de comprobación que usted envió, se quedan con ellas.',
  'm.pp.rights.fix.t': 'Corregir',
  'm.pp.rights.fix.p':
    'Un registro sellado no puede cambiar. Para corregirlo, usted sella un registro nuevo que apunta al anterior.',
  'm.pp.rights.ask.t': 'Pregúntenos',
  'm.pp.rights.ask.p':
    'Escriba a hunter@veilcore.org para saber qué guardamos sobre usted, o para que lo eliminemos o corrijamos. Incluya los ID de los registros en cuestión: nuestro servidor encuentra los registros por su ID o por su clave de titular, no por su nombre.',

  'm.pp.changes.t': 'Cambios en esta política',
  'm.pp.changes.p': 'Publicaremos aquí cualquier cambio, con su fecha, antes de que se aplique.',

  'm.pp.tech.t': 'Detalles técnicos',
  'm.pp.tech.storage':
    'Almacenamiento del navegador, por grupos: cada nombre que usa el sitio en veilcore.org. Local Storage salvo que se indique otra cosa.',
  'm.pp.tech.storage.records':
    'Sus registros y sus secretos: veilcore.holder.v1 (clave de titular), veilcore.vault.v1 (la clave que cifra sus registros), veilcore.vault.made.v1 (cuándo se hizo esa clave), veilcore.record-keys.v1 (claves de los registros), veilcore.attester.v1 (la clave de firma de un laboratorio), veilcore.log-draft.v1 y veilcore.log-draft.v1.next.<record> (un registro sin terminar, y uno para la siguiente etapa de un registro), veilcore.device-only.v1 (documentos guardados solo en este dispositivo), veilcore.outbox.v1 (guardados que esperan enviarse), veilcore.unsure.v1 (un registro cuya corrección no tuvo respuesta clara, hasta comprobarlo; después de empezar de nuevo, 30 días, y luego se quita la próxima vez que se abra VeilCore), veilcore.bulk-import.job.v1 (las filas de su última importación), veilcore.import-layouts.v1 (columnas que decidió recordar), veilcore.bulk-import.v1 (qué fila importada se convirtió en qué registro). IndexedDB: veilcore-offline (registros que esperan su fecha, con la clave de titular), veilcore.account.v1 (las dos claves hechas a partir de su clave de cuenta), veilcore.ask.job.v1 (tareas de «Preguntar»). Una versión anterior del sitio puede haber dejado veilcore.records.v1 o veilcore.licenses.v1; ya nada los lee, y borrar los datos de este sitio los quita.',
  'm.pp.tech.storage.deals':
    'Licencias y acuerdos: veilcore.held-licenses.v1 (licencias que tiene, con sus secretos), veilcore.issuer-deals.v1 (claves de los acuerdos de licencia), veilcore.deal-outbox.v1.<deal> (mensajes de un acuerdo aún no entregados, cifrados; pasados 30 días, se quitan la próxima vez que se abra VeilCore), veilcore.lender.v1 (los derechos de un prestamista), veilcore.partnerKeys.v1 (claves de proveedores de pagos que nombró).',
  'm.pp.tech.storage.moving':
    'Recibir y enviar: veilcore.lab-deliveries.v1, veilcore.sent-codes.v1 y veilcore.opened-results.v1 (códigos de laboratorio e informes abiertos), veilcore.receiving.v1, veilcore.receiving-claims.v1 y veilcore.receiving-refused.v1 (un código que se está recibiendo), veilcore.outbox-names.v1 y veilcore.outbox-offer-keys.v1 (nombres de destinatarios y claves de envío que esperan su registro), veilcore.prove-asks.v1 y veilcore.verifier-challenges.lasting.v1 (solicitudes de demostración, 7 días), veilcore.key-stamp-retry.v1 (sellos de fecha de claves por reintentar), veilcore.lab-report-dating.v1 (un informe de laboratorio que se está fechando). Session Storage, solo esta pestaña: veilcore.verifier-challenges.v1 (el desafío de una solicitud de demostración, 24 horas), veilcore:intake (la solicitud del sitio de un socio, 1 hora).',
  'm.pp.tech.storage.settings':
    'Ajustes y marcas: veilcore.lang y veilcore.role.v1 (ajustes), veilcore.bulk-import.stamps-on.v1 y veilcore.bulk-import.stamps.v1 (sellos de fecha de claves para importaciones), veilcore.sponsor-ticket.v1 (un boleto aleatorio para el servicio de tarifas, no su clave de titular), veilcore.account-copy.v1 (el estado de la copia guardada), veilcore.account.device.v1 (el ID aleatorio de este dispositivo en esa copia), veilcore.account.last-passkey.v1 y veilcore:passkey-copy (el ID de la última llave de acceso usada, no la llave), veilcore.rev.v1 (la versión más reciente vista de cada registro), veilcore.records.arrived.v1, veilcore.record-keys.forgotten.v1, veilcore.record-keys.forgotten-at.v1 y veilcore.record-keys.restored.v1 (ID de registros que llegaron de una copia de seguridad, o que se quitaron o se recuperaron), veilcore.attester.backed-up.v1, veilcore.attester.backed-up.copy.v1, veilcore.issuer-deals-backed-up.v1, veilcore.issuer-deals-backed-up.copy.v1, veilcore.device-only-backup.v1 y veilcore.receiving-backed-up.v1 (lo que contiene una copia de seguridad comprobada), veilcore.invite-unsure.v1.<license> (una invitación sin respuesta clara), veilcore.record-watch.seen.v1, veilcore.ask.seen.v1, veilcore.draft-notice-closed.v1, veilcore.install-card.v1, veilcore.lab-visibility-seen.v2, veilcore.log-kind.v1, veilcore.note.old-links.v1, veilcore.stamp-pressed.v1, veilcore.account.keep-safe-shown.v1 y veilcore.account.sheet-reminder.v1 (avisos vistos o cerrados), veilcore.lock.<task> (una pestaña cada vez, 30 segundos). Session Storage: veilcore.record-watch.v1 (lo que encontró la última consulta a la red), veilcore.homescreen.fresh, veilcore.in-app-notice.closed (un aviso cerrado en esta pestaña), veilcore:backup-return (la página a la que volver tras una copia de seguridad).',
  'm.pp.tech.storage.caches':
    'Cache Storage: veilcore-shell-<release> y veilcore-offline-meta (el código de este sitio), veilcore-zk-<contract> y veilcore-zk-claims-<contract> (archivos públicos para pruebas, de este sitio).',
  'm.pp.tech.locking':
    'Cifrado. Su navegador cifra los registros con AES-GCM antes de enviarlos; los que guarda aquí (sin terminar, esperando guardarse o solo en este dispositivo) se almacenan sin cifrar. Su clave de titular se guarda como h1: y su SHA-256. La copia guardada es AES-256-GCM, rellenada hasta el siguiente tramo de tamaño, y nuestro servidor solo guarda el SHA-256 de los tokens que la leen o la cambian. Los informes de laboratorio se cifran con age para la clave de su registro.',
  'm.pp.tech.network':
    'Conexiones. La política de seguridad de este sitio deja que una página se conecte solo a veilcore.org, a nuestro servidor de registros, a nuestro servicio de tarifas y relé, a mempool.space y a blockstream.info. Solo este sitio puede pedir la cámara, y su navegador se lo pregunta antes; el micrófono y la ubicación están desactivados.',
  'm.pp.tech.logs':
    'Historiales. El servidor de registros no tiene un registrador de solicitudes, y su prueba test/no-request-logging.test.mjs falla si se agrega uno; su consola muestra mensajes de inicio y de error. Sus límites cuentan solicitudes por bloque de direcciones (una dirección IPv4, o un /64 o /48 de IPv6) en memoria. El servicio de tarifas cuenta por bloque de direcciones (/24 o /48) y por boleto en memoria, olvida una dirección cuando pasa su intervalo, y anota una línea por evento solo con contadores y resultados.',
  'm.pp.tech.backups':
    'Copias de seguridad. Cada día, la base de datos del servidor de registros se comprime, se cifra con age para la clave pública del operador y se sube a un bucket de Backblaze B2 con un nombre nuevo cada vez; los archivos cifrados de informes de laboratorio también van. El bucket protege cada copia contra borrado durante 30 días (Object Lock).',
};
