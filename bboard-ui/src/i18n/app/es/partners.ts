// Spanish (neutral Latin American, usted). DRAFT: machine-assisted, to be checked by a fluent
// speaker before publishing (docs/translations/README.md). Terms: see ./index.ts.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const partners = {
  'app.partners.label': 'Para socios',
  'app.partners.title': 'Exija un registro de VeilCore.',
  'app.partners.titleEm': 'Verificarlo es gratis. Sin cuenta.',
  'app.partners.lede':
    'Si su membresía, biblioteca, registro o mercado pide a los solicitantes un registro de VeilCore, puede verificar cada uno en segundos, en su propio formulario, sin hablar con nosotros.',
  'app.partners.gives.title': 'Lo que le da exigir un registro',
  'app.partners.gives.1.t': 'Una descripción fija',
  'app.partners.gives.1.d':
    'El registro se selló antes de la solicitud. Si más tarde le muestran la descripción, puede saber si es la que sellaron.',
  'app.partners.gives.2.t': 'Una fecha',
  'app.partners.gives.2.d':
    'Cuando el registro está en un lote fechado, cualquiera puede consultar desde cuándo existía su código de prueba. La fecha viene de Midnight, no de VeilCore ni del solicitante.',
  'app.partners.gives.3.t': 'Firmas de laboratorio, verificadas',
  'app.partners.gives.3.d':
    'Acuses de recibo de muestras e informes de laboratorio, con cada firma verificada, y si el operador de VeilCore cotejó el nombre del laboratorio con un listado público. Un acuse cuenta solo cuando el servidor de registros lo vincula a un envío del registro, y usted ve si lo que llegó coincide con lo que se envió.',
  'app.partners.gives.4.t': 'La misma verificación para todos',
  'app.partners.gives.4.d': 'El enlace de cada solicitante se verifica de la misma manera, en su página.',
  'app.partners.not.title': 'Lo que no muestra',
  'app.partners.not.lede':
    'VeilCore nunca avala nada. La verificación dice qué se verificó y de quién es la palabra en lo demás. Usted decide.',
  'app.partners.not.1': 'Qué es el material. VeilCore nunca ve la genética.',
  'app.partners.not.2': 'Que la descripción sea cierta; solo que no ha cambiado.',
  'app.partners.not.3': 'Quién tiene hoy el material o el registro.',
  'app.partners.not.4':
    'Que el trabajo de un laboratorio sea correcto. Un nombre verificado significa que coincidió con un listado público, nada más.',
  'app.partners.not.5': 'Parentesco, derechos, licencias ni situación legal.',
  'app.partners.demo.title': 'Pruébelo',
  'app.partners.demo.lede':
    'Pegue el enlace de verificación de un registro. Se verifica en este navegador, contra el servidor de registros que usa este sitio. No se envía nada a ningún otro lugar y no se guarda nada.',
  'app.partners.demo.label': 'Enlace de verificación del registro de VeilCore',
  'app.partners.demo.loading': 'Cargando el campo…',
  'app.partners.steps.title': 'Quién hace qué',
  'app.partners.steps.applicant': 'El solicitante',
  'app.partners.steps.applicant.1': 'Crea un registro para cada accesión, en veilcore.org o en su propio software.',
  'app.partners.steps.applicant.2': 'Abre el registro, elige “Mostrar a alguien” y pulsa “Copiar el enlace”.',
  'app.partners.steps.applicant.3':
    'Pega el enlace en su formulario. Si sus reglas lo piden, envía también el paquete de evidencia del registro.',
  'app.partners.steps.you': 'Usted',
  'app.partners.steps.you.1':
    'Agrega el campo a su formulario (abajo), o pega los enlaces que recibe en el campo de esta página.',
  'app.partners.steps.you.2':
    'Decide qué acepta: que el enlace coincida; o además que tenga fecha en la red principal de Midnight; o además un acuse de recibo de un laboratorio cuyo nombre se verificó.',
  'app.partners.steps.you.3': 'Guarda el resultado de la verificación con la solicitud.',
  'app.partners.form.title': 'Agréguelo a su formulario',
  'app.partners.form.lede':
    'Un archivo, de unos 40 KB, servido desde su sitio. Con “required”, el formulario no se envía hasta que el enlace lleve a un registro que coincida y nada lo contradiga. Si el solicitante cambia el enlace, hay que verificarlo de nuevo.',
  'app.partners.form.example': 'Ejemplo en HTML',
  'app.partners.form.allowTest':
    'Acepta también registros fechados en una red de prueba. Sirve para probar: las fechas de prueba no tienen valor, así que por defecto se rechazan.',
  'app.partners.form.unreachable':
    'Si no se puede llegar al servidor de registros de VeilCore, deja pasar el formulario con el enlace marcado como no verificado (el formulario envía también <name>-unchecked). Sin esto, un campo obligatorio bloquea todo el formulario mientras el servidor de registros no responde.',
  'app.partners.form.csp':
    'Su Content Security Policy necesita script-src para el lugar desde donde sirve el archivo y connect-src para el servidor de registros. Sin excepciones de estilo, imagen ni marco; funciona con Trusted Types. Sin cookies, sin almacenamiento, sin rastreo.',
  'app.partners.form.status':
    'Todavía no está en npm: compílelo desde partner-kit/record-check en el repositorio de VeilCore y sirva el archivo desde su sitio.',
  'app.partners.facts.title': 'Antes de confiar en esto',
  'app.partners.facts.cost': 'Costo',
  'app.partners.facts.cost.d':
    'Verificar es gratis, para usted y para todos los demás. Sin cuenta, sin clave, sin contrato.',
  'app.partners.facts.support': 'Soporte',
  'app.partners.facts.support.d': 'Correo: <link></link>. No hay acuerdo de soporte ni tiempo de respuesta.',
  'app.partners.facts.data': 'Datos',
  'app.partners.facts.data.d':
    'Una verificación envía al servidor de registros el identificador y el código de prueba del registro, nada sobre el solicitante ni su formulario. Como cualquier sitio web, el servidor de registros recibe la dirección de red del visitante con cada solicitud, para limitar el uso. Lo que VeilCore guarda está en la <link>página de privacidad</link>. Unas condiciones de datos más completas son un borrador en revisión; hasta que se publiquen, rige la página de privacidad.',
  'app.partners.facts.down': 'Si el servidor de registros no responde',
  'app.partners.facts.down.d':
    'No se puede verificar nada. Por defecto, un campo obligatorio bloquea entonces el formulario hasta que el servidor de registros vuelva a responder. Con when-unreachable="allow", el formulario se envía con el enlace marcado como no verificado, y usted lo verifica después en esta página.',
  'app.partners.facts.gone': 'Si VeilCore deja de funcionar',
  'app.partners.facts.gone.d':
    'El campo y las páginas de verificación de veilcore.org dejan de funcionar. Los registros se pueden seguir verificando con sus paquetes de evidencia, que se verifican sin conexión contra un formato abierto. Pida paquetes de evidencia si su programa no debe depender de VeilCore.',
  'app.partners.facts.npm': 'Todavía no está en npm',
  'app.partners.facts.npm.d':
    'Compile el kit desde el repositorio de VeilCore y sirva el archivo del campo desde su sitio.',
  'app.partners.policy.title': 'Texto de ejemplo para sus reglas',
  'app.partners.policy.note': 'Texto de ejemplo, no es asesoría legal. Adáptelo a sus propias reglas.',
  'app.partners.policy.1':
    'Los solicitantes deben entregar un enlace de verificación de un registro de VeilCore por cada accesión que depositen. El registro debe existir y el enlace debe coincidir con él. [Programa] verifica cada enlace al recibir la solicitud y guarda el resultado con la solicitud.',
  'app.partners.policy.2':
    'Un registro de VeilCore es la declaración del solicitante sobre su material, con código de prueba y fecha. Aceptar un registro no significa que [Programa] o VeilCore confirmen qué es el material, quién lo tiene ni ningún derecho sobre él.',
  'app.partners.dev.title': 'Para desarrolladores',
  'app.partners.dev.1': 'Una sola llamada',
  'app.partners.dev.1.d':
    'checkRecord(link), en Node o en un navegador, devuelve JSON simple: recordExists, fingerprintMatches, dated (network, batch, transaction, block time, checkedOnChain), keyBound, labReceipts con la verificación de cada nombre, y whatThisDoesNotShow.',
  'app.partners.dev.2': 'En Midnight',
  'app.partners.dev.2.d':
    'En Node, con @veilcore/contracts instalado, el sello de fecha se consulta en la cadena: el contrato fijado de VeilCore, la compilación fijada, exactamente la raíz de este lote.',
  'app.partners.dev.3': 'Línea de comandos',
  'app.partners.dev.3.d':
    'partner-kit check <link> muestra la misma respuesta. Salida 0: el registro existe, el enlace coincide y nada lo contradice. Salida 1: algo no se cumple, incluida una fecha en una red de prueba (salvo con --allow-test-network) o una prueba de inclusión que no se verifica. Salida 2: no se pudo verificar nada.',
  'app.partners.dev.4': 'Sin VeilCore',
  'app.partners.dev.4.d':
    'El paquete de evidencia de un registro se verifica sin conexión, y el formato es abierto. Si VeilCore desaparece, los registros cuyos paquetes de evidencia usted tiene se siguen verificando.',
  'app.partners.dev.guide': 'Leer la guía completa',
  'app.partners.dev.kit': 'El código fuente del kit',
} satisfies Partial<AppTranslation>;
