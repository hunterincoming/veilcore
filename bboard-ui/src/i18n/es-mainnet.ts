// The mainnet overlay in Español (Spanish): the same flags and the same facts as en-mainnet.ts,
// built by mainnet-overlay.ts. Draft, like the rest of this language; shown under the draft
// banner. The dated posts keep the network they ran on.
// SPDX-License-Identifier: Apache-2.0

import type { Strings } from './en';
import { buildMainnet } from './mainnet-overlay';

const sendsCommon: Strings = {
  'm.hero.status':
    'El contrato de VeilCore está en la red principal de Midnight. Los registros sellados en este sitio son registros reales: van a lotes que se anclan allí automáticamente. Probar un registro con un enlace y fechar un informe de ADN también funcionan aquí, y VeilCore paga la tarifa de la red. Las licencias y los acuerdos con laboratorios aquí siguen siendo simulados.',
  'm.faq.3a':
    'Está hecho para servir como prueba, y nuestra nota para abogados dice qué prueba un registro y qué no. Los registros sellados aquí van a lotes que se anclan automáticamente en la red principal de Midnight. Cuando el lote de un registro está anclado, la fecha muestra que el registro existía en ese momento; lo que eso valga en una disputa lo decide el tribunal.',
  'm.demo.lede':
    'Sin registro de usuario, sin billetera. Los registros que sella aquí son registros reales: cada uno va a un lote que se ancla automáticamente en la red principal de Midnight; su página de comprobación muestra cuándo se ancla su lote. Comprobar es gratis, y VeilCore paga la tarifa de la red por lo que envía su navegador. Las licencias y los acuerdos con laboratorios son simulados. El nombre de un registro se bloquea como lo demás; un enlace de comprobación solo lo lleva si usted lo activa.',
  'm.privacy.lede':
    'Esta nota trata de este sitio web. Los registros que sella aquí son registros reales: van a lotes que se anclan automáticamente en la red principal de Midnight.',
  'm.privacy.test.text':
    'El código de prueba de su registro va a un lote, y el lote se ancla automáticamente en la red principal de Midnight. Cuando usted fecha la clave propia de su registro, prueba un registro con un enlace o fecha el vínculo de un informe de ADN, su navegador envía esa transacción por sí mismo, a través del servicio de tarifas de VeilCore, que paga la tarifa. Lo que usted escribió y sus archivos nunca se envían a la red. Una vez en la red, es permanente: nadie, ni siquiera nosotros, puede borrarlo.',
  'm.privacy.hosts.text':
    'Este sitio web está alojado en Vercel, que registra direcciones IP y solicitudes. Nuestro servidor de registro y el servicio que paga la tarifa de la red y transmite las consultas a la red de esta página funcionan en Railway, que registra las solicitudes. Ese servicio lee la red a través de Blockfrost.',
  'm.for.1p':
    'Selle un registro y vincule su informe de ADN. Si la planta aparece con otro nombre, un laboratorio puede comparar una prueba nueva con su informe. En este sitio web puede fechar el vínculo desde su navegador, y nadie puede copiarlo a su propio registro. VeilCore no hace pruebas de ADN.',
  'm.for.6p':
    'Le envían un enlace. Usted toca una vez, y la página de la otra persona comprueba en la red que usted controla la clave propia de su planta. Su registro nombró esa clave al sellarse, así que no se puede cambiar por otra. No dice nada sobre quién es usted ni sobre quién obtuvo la planta.',
  'm.live.stamp.main':
    'Sí. Los lotes se fechan automáticamente, y eso fecha su registro. Su navegador además pone un sello de fecha a la clave propia de su registro, que solo fecha la clave.',
  'm.live.dna.main': 'Sí, enviado desde su navegador. VeilCore paga la tarifa.',
};

export const esMainnet = buildMainnet({
  common: {
    'm.hero.status':
      'El contrato de VeilCore está en la red principal de Midnight. Los registros sellados en este sitio son registros reales: van a lotes que, por ahora, anclamos allí a mano. Las licencias y los acuerdos con laboratorios aquí siguen siendo simulados.',
    'm.faq.3a':
      'Está hecho para servir como prueba, y nuestra nota para abogados dice qué prueba un registro y qué no. Los registros sellados aquí van a lotes que anclamos a mano en la red principal de Midnight. Cuando el lote de un registro está anclado, la fecha muestra que el registro existía en ese momento; lo que eso valga en una disputa lo decide el tribunal.',
    'm.stat2.b': 'Red principal',
    'm.foot.about':
      'Un formato abierto de registros para la genética vegetal y animal. Los registros se fechan anclándolos en la red principal de Midnight.',
    'm.get.2b':
      'Se adjuntan al registro. Un licenciatario puede probar que tiene una licencia vigente sin mostrar cuál. Una regalía u otra obligación sobre un progenitor aparece en cada descendiente que ambos titulares confirmaron; VeilCore la anota y no la cobra. Incorporado al contrato en la red principal de Midnight; simulado en este sitio web.',
    'm.demo.lede':
      'Sin registro de usuario, sin billetera. Los registros que sella aquí son registros reales: cada uno va a un lote que, por ahora, anclamos a mano en la red principal de Midnight, así que un registro nuevo puede esperar un rato; su página de comprobación muestra cuándo se ancla su lote. Comprobar es gratis. Las licencias y los acuerdos con laboratorios son simulados, y los vínculos de informes de ADN no se fechan. El nombre de un registro se bloquea como lo demás; un enlace de comprobación solo lo lleva si usted lo activa.',
    'm.post0.text':
      'Ambos contratos pasaron las 37 comprobaciones de extremo a extremo en la red de pruebas preprod de Midnight, incluidas las nuevas pruebas de un hecho: un valor, un rango, una diferencia, una corrección que deja el resto intacto y una firma de una clave de laboratorio de prueba. Datos de marcadores inventados.',
    'm.post2.title': 'Una ejecución completa en la red de pruebas de Midnight',
    'm.post2.text':
      'El contrato se desplegó en la red de pruebas de Midnight y pasó las 26 comprobaciones de extremo a extremo, usando 16 de sus 24 operaciones con pruebas reales.',
    'm.contact.1p': 'Cree un registro y luego díganos qué le falta para su trabajo.',
    'm.nav.demo': 'Crear un registro',
    'm.foot.demo': 'Crear un registro',
    'm.hero.demoLabel': 'Código de prueba en vivo',
    'm.demo.label': 'Úselo',
    'm.demo.title1': 'Cree un registro',
    'm.demo.title2': 'o compruebe uno.',
    'm.demo.create.text': 'Registre una planta o un animal, guarde su copia de seguridad y luego vea su página.',
    'm.demo.privacy': 'Qué guarda este sitio →',
    'm.faq.4link1': 'Qué guarda este sitio →',
    'm.faq.2a':
      'No. Crear un registro en este sitio y comprobar cualquier registro no requieren billetera, ni darse de alta, ni comprar nada. Su navegador guarda una clave aleatoria que encuentra sus registros en nuestro servidor. El código de prueba va a Midnight, una red hecha para la privacidad. Usted nunca trata con ella directamente.',
    'm.for.1p':
      'Selle un registro y vincule su informe de ADN. Si la planta aparece con otro nombre, un laboratorio puede comparar una prueba nueva con su informe. En este sitio web, el vínculo se guarda con su registro, pero aún no se fecha. VeilCore no hace pruebas de ADN.',
    'm.for.3p':
      'Envíe material con un código de laboratorio. El laboratorio firma un acuse de recibo con su propia clave, así el registro muestra a una segunda parte. El acuse es una firma real, guardada por el registro de VeilCore, no en la cadena. Condiciones como no propagar son solo de práctica en este sitio web.',
    'm.for.6p':
      'Le envían un enlace. Usted toca una vez, y la página de la otra persona comprueba en la red que usted controla la clave propia de su planta. Su registro nombró esa clave al sellarse, así que no se puede cambiar por otra. No dice nada sobre quién es usted ni sobre quién obtuvo la planta. Este sitio web todavía no puede hacerlo.',
    'footer.privacy': 'Privacidad del sitio',
    'title.privacy': 'Privacidad del sitio',
    'm.foot.privacy': 'Privacidad del sitio',
    'm.privacy.label': 'Privacidad del sitio',
    'm.privacy.title': 'Qué guarda este sitio.',
    'm.privacy.lede':
      'Esta nota trata de este sitio web. Los registros que sella aquí son registros reales: van a lotes que anclamos a mano en la red principal de Midnight.',
    'm.privacy.stored.title': 'Guardado en nuestro servidor',
    'm.privacy.stored.text':
      'Sus registros y acuerdos, bloqueados por su navegador antes de enviarse: el nombre de cada registro, obtentor, especie, fechas, notas, números de referencia, progenitores, los códigos de prueba y los nombres de archivo de las fotos e informes de laboratorio que añade, términos y contrapartes de los acuerdos, la cantidad y la nota que envía a un laboratorio, los datos de muestra que usted y el laboratorio escriben (ID de muestra, número de precinto, dónde y cuándo se tomó, un testigo, cómo llegó), los nombres que da a los destinatarios y las claves secretas de cada registro. Nuestro servidor los guarda bloqueados, y nosotros no tenemos la clave: está en su navegador y en su archivo de copia de seguridad. La clave de los datos de muestra también va en el código de laboratorio, para que el laboratorio pueda abrirlos. Si usted lo elige, el nombre de un registro también va en un enlace de comprobación que crea, después del #. Un navegador no envía esa parte al abrir el enlace, pero el enlace va completo a cualquiera a quien se lo envíe y a cualquier sitio donde lo pegue, incluido el formulario de un socio. Nuestro servidor puede leer: el ID de cada registro; su código de prueba, su vínculo de clave y su tipo de perfil; un código hecho a partir de su nombre, que no dice nada del nombre sin la clave de su enlace de comprobación; sus vínculos de corrección (qué registro sustituye una corrección, qué campos cambió y cuándo); cuándo lo vio el servidor por primera vez; cuántas veces se guardó y cuándo fue la última; más o menos qué tamaño tiene (su franja de tamaño); lo que usted decida mostrar en su página de comprobación (su nombre, si decide mostrarlo, y si hay un informe de ADN guardado, como un código que no dice nada del archivo sin la clave de su enlace de comprobación); los vínculos con progenitores que registre; y su lote con su sello de fecha. Si un acuerdo tiene regalías sobre la descendencia, nuestro servidor puede leer a qué registro se aplica y desde cuándo rige, y cualquiera puede preguntar si ese registro tiene una: la comprobación de linaje lo necesita. De un envío: de qué registro procede, qué cuenta de titular lo recibió, cuándo se recibió y una etiqueta en lugar del nombre del destinatario. De los laboratorios: la clave pública de firma y las firmas que publican. La firma de un laboratorio sobre un informe nombra el informe ligado a su registro con una clave que solo usted y el laboratorio tienen; una hecha antes del 17 de octubre de 2026 nombra el SHA-256 del archivo del informe, que nuestro servidor muestra solo a usted y al laboratorio. Las solicitudes de demostrar la clave de un registro, con el nombre que escribió quien la pide, durante 7 días: nuestro servidor sabe qué clave en la cadena nombra cada solicitud. Las páginas de demostración y de comprobación nunca envían su clave de titular. Su clave de titular, que su navegador envía cada vez que guarda para que el servidor encuentre sus registros; el servidor solo conserva un hash de un solo sentido de ella. El texto guardado antes del bloqueo se eliminó de nuestro servidor el 18 de octubre de 2026, y las copias de seguridad externas de antes ya no se pueden abrir: destruimos su clave ese mismo día. Informes de laboratorio cerrados que un laboratorio le envía: se guardan cerrados, sin la clave, y se borran a los 180 días. El servidor es el registro de VeilCore, alojado en Railway.',
    'm.privacy.test.title': 'Fechado en la red principal de Midnight',
    'm.privacy.test.text':
      'El código de prueba de su registro va a un lote, y anclamos el lote en la red principal de Midnight, por ahora a mano, así que puede tardar un rato. Solo el código del lote va a la red, nunca lo que usted escribió. Una vez anclado, es permanente: nadie, ni siquiera nosotros, puede borrarlo.',
    'm.privacy.madeup.title': 'Qué pueden ver los desconocidos',
    'm.privacy.madeup.text':
      'El nombre de un registro se guarda bloqueado, como todo lo demás que escribe en un registro, salvo que decida mostrarlo en su página de comprobación. Un enlace de comprobación que usted crea lleva el nombre después del # solo si lo activa; entonces lo ven las personas a las que envía el enlace, y también cualquiera a quien ellas se lo pasen. Los datos de muestra que usted y un laboratorio escriben también se guardan bloqueados. Sus archivos de ADN nunca salen de su dispositivo. Los informes de laboratorio viajan bloqueados.',
    'm.privacy.delete.text':
      'Podemos borrar lo que nuestro servidor guarda de sus registros: escriba a hunter@veilcore.org con los identificadores de los registros. El código de un lote ya anclado en Midnight se queda allí.',
  },
  claimsLive: {
    'm.claims.status':
      'Un segundo contrato de Midnight, en la red principal de Midnight. Antes del lanzamiento pasó todas las comprobaciones de extremo a extremo, con datos de marcadores inventados. Todavía no está en este sitio web.',
    'm.stat2.s':
      'Los dos contratos están en la red principal de Midnight. Los registros sellados en este sitio van a lotes que, por ahora, anclamos allí a mano.',
  },
  claimsPending: {
    'm.claims.status':
      'Un segundo contrato de Midnight. En las pruebas previas al lanzamiento pasó todas las comprobaciones de extremo a extremo, con datos de marcadores inventados. Todavía no está en la red principal de Midnight ni en este sitio web.',
    'm.stat2.s':
      'El contrato principal está en la red principal de Midnight. Los registros sellados en este sitio van a lotes que, por ahora, anclamos allí a mano. El contrato de afirmaciones vendrá después.',
  },
  keyHolders:
    'Una clave de mantenimiento puede cambiar cómo funciona el contrato principal de VeilCore en Midnight. Quien la tenga puede añadir o reemplazar operaciones del contrato, lo que podría permitirle tomar el control de la identidad de cualquier registro, añadir licencias en nombre de cualquier emisor, añadir o quitar obligaciones y vínculos de parentesco, o desactivar operaciones. No puede antedatar los tiempos de bloque de la red, y cada cambio queda a la vista en la cadena. No puede cambiar ni quitar un lote ya anclado, ni la fecha que da a un registro: eso está en la transacción que lo ancló, que nadie puede alterar. Hoy la clave está en papel, una copia en manos de cada fundador, y cualquiera de las dos copias basta por sí sola para usarla. Pasarla a un grupo de claves que deban estar de acuerdo está previsto, pero aún no está hecho.',
  policyApproved: ' Cada uso se anuncia públicamente, según una política de mantenimiento escrita.',
  policyProposed: ' Hay una política propuesta para usarla, todavía no decidida.',
  claimsNoKey:
    ' El contrato de afirmaciones no tiene clave de mantenimiento: nadie, ni siquiera nosotros, puede cambiarlo.',
  keyTitlePlural: 'Quién puede cambiar los contratos.',
  keyLinkApproved: 'Leer la política de mantenimiento →',
  keyLinkProposed: 'Leer la política propuesta →',
  reads: {
    'm.tech.check.p':
      'Recalcular el código de prueba de un registro solo requiere SHA-256 y la especificación abierta. Su prueba de inclusión une ese código de prueba con el código de prueba de un lote anclado en Midnight, y la transacción que lo ancló da la fecha del lote. El verify.html del paquete de evidencia rehace ese cálculo sin conexión y nombra la transacción y el código de prueba del lote que hay que buscar. La página de comprobación consulta esa transacción en Midnight por sí misma. Los registros sellados desde el 14 de octubre nombran su propia clave, así que comprobarlos también requiere la sección 3.6.1, en la especificación de este sitio y en el SDK 0.16.0 y posteriores. Buscar un registro por su identificador en este sitio usa nuestro servidor.',
    'm.live.chain.main': 'Sí.',
    'm.privacy.hosts.text':
      'Este sitio web está alojado en Vercel, que registra direcciones IP y solicitudes. Nuestro servidor de registro y el servicio de solo lectura que transmite las consultas a la red de esta página funcionan en Railway, que registra las solicitudes. Ese servicio lee la red a través de Blockfrost.',
  },
  notReads: {
    'm.tech.check.p':
      'Recalcular el código de prueba de un registro solo requiere SHA-256 y la especificación abierta. Su prueba de inclusión une ese código de prueba con el código de prueba de un lote anclado en Midnight, y la transacción que lo ancló da la fecha del lote. El verify.html del paquete de evidencia rehace ese cálculo sin conexión y nombra la transacción y el código de prueba del lote que hay que buscar. La página de comprobación leerá Midnight por sí misma cuando nuestro relé de solo lectura esté activo; hasta entonces dice que la fecha es la que informa nuestro registro, y usted puede buscar la transacción por su cuenta en un explorador de Midnight. Los registros sellados desde el 14 de octubre nombran su propia clave, así que comprobarlos también requiere la sección 3.6.1, en la especificación de este sitio y en el SDK 0.16.0 y posteriores. Buscar un registro por su identificador en este sitio usa nuestro servidor.',
  },
  sends: (claimsOnMainnet) => ({
    ...sendsCommon,
    'm.stat2.s': claimsOnMainnet
      ? 'Los dos contratos están en la red principal de Midnight. Los registros sellados en este sitio van a lotes que se anclan allí automáticamente.'
      : 'El contrato principal está en la red principal de Midnight. Los registros sellados en este sitio van a lotes que se anclan allí automáticamente. El contrato de afirmaciones vendrá después.',
  }),
});
