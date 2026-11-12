// La app de registros en español: los pagos de regalías a la vista y el pago en un stablecoin
// en dólares estadounidenses en Cardano (../en/royalty-pay.ts). BORRADOR: asistido por máquina,
// a revisar por un hablante nativo antes de publicar (docs/translations/README.md).
// SPDX-License-Identifier: Apache-2.0

export const royaltyPay = {
  'app.rpay.st.overdue': 'Vencido',
  'app.rpay.l.soon': 'Recordatorio: el pago del informe {n} vence el {date}.',
  'app.rpay.l.overdue': 'El pago del informe {n} está vencido desde el {date}.',
  'app.rpay.l.consequence':
    'Si no se paga, se ve en la página de comprobación pública, y la licencia se puede revocar.',
  'app.rpay.i.soon': 'El pago de {licensee} del informe {n} vence el {date}.',
  'app.rpay.i.overdue': 'El pago de {licensee} del informe {n} está vencido desde el {date}.',
  'app.rpay.i.public':
    'La página de comprobación pública de su registro dice: “Un estado de regalías está vencido desde el {date}.” Sin montos, condiciones ni nombres. Se quita cuando llega el pago.',
  'app.rpay.i.publicFailed':
    'No se pudo poner esto en la página de comprobación pública de su registro ahora. La página lo vuelve a intentar la próxima vez que se abra.',
  'app.rpay.i.publicUnsupported':
    'El registro de VeilCore todavía no acepta avisos públicos, así que esto no está en la página de comprobación pública de su registro.',
  'app.rpay.revoke.open': 'Revocar por falta de pago',
  'app.rpay.revoke.what':
    'Esto termina la licencia en Midnight y no se puede deshacer. {licensee} recibe antes un aviso firmado. Luego la página de comprobación pública de su registro dice que una licencia de él se revocó por falta de pago, y cuándo.',
  'app.rpay.revoke.yes': 'Revocar la licencia',
  'app.rpay.revoke.note': 'Licencia revocada por falta de pago del informe {n}.',
  'app.rpay.revoke.reason': 'Falta de pago',
  'app.rpay.revoke.done': 'Revocada por falta de pago el {date}. La página de comprobación pública lo dice.',
  'app.rpay.pub.title': 'Regalías de licencias de este registro',
  'app.rpay.pub.overdue': 'Un estado de regalías está vencido desde el {date}.',
  'app.rpay.pub.revoked': 'Una licencia de este registro se revocó el {date} por falta de pago.',
  'app.rpay.pub.who':
    'Lo dice quien tiene este registro y lo licenció. VeilCore no lo comprueba. No nombra a nadie ni muestra montos o condiciones.',
  'app.rpay.payout.option': 'Stablecoin en dólares en Cardano',
  'app.rpay.payout.info':
    'Le pagan desde su propia billetera directamente a su dirección de Cardano, en {code}. Al guardar esto acepta que 1 {code} cuenta como 1 dólar estadounidense. Los pagos en Cardano son públicos: cualquiera ve el monto, las dos direcciones y la fecha, pero no quién es usted. Una dirección nueva solo para este acuerdo lo separa de los demás. VeilCore nunca guarda ni mueve el dinero.',
  'app.rpay.payout.token': 'Stablecoin',
  'app.rpay.payout.address': 'Su dirección de Cardano ({prefix}…)',
  'app.rpay.payout.useMine': 'Usar mi dirección de {name}',
  'app.rpay.payout.sanctioned': 'Esta dirección está en la lista de sanciones de EE. UU., así que no se puede usar.',
  'app.rpay.method': 'en Cardano, en {code} (1 {code} = 1 USD)',
  'app.rpay.addr.not': 'Eso no es una dirección de Cardano (compruebe que se copió completa).',
  'app.rpay.addr.notPayment': 'Eso no es una dirección de pago de Cardano (debería empezar por addr).',
  'app.rpay.addr.otherNetwork': 'Esa dirección es de otra red de Cardano, no de {network}.',
  'app.rpay.pay.title': 'Pagar desde su billetera de Cardano',
  'app.rpay.pay.button': 'Pagar {amount} {code} con {name}',
  'app.rpay.pay.waiting': 'Esperando a su billetera…',
  'app.rpay.pay.wallet': 'Billetera',
  'app.rpay.pay.noWallet':
    'Este navegador no tiene una billetera de Cardano. Abra esta página donde tenga una (Lace, Eternl u otra billetera CIP-30).',
  'app.rpay.pay.shows':
    'Su billetera lo muestra antes de que firme: {amount} {code} a {to}, un poco de ada que Cardano exige junto con un token, la comisión de la red y la referencia {ref}.',
  'app.rpay.pay.screened':
    'Las dos direcciones se cotejan con la lista de sanciones de EE. UU. (OFAC, direcciones de Cardano, lista del {date}) antes de crear nada.',
  'app.rpay.pay.howTitle': 'Cómo funciona',
  'app.rpay.pay.how':
    'Su billetera le paga a {licensor} directamente. VeilCore nunca guarda, detiene ni mueve el dinero y no se queda con ninguna comisión. La referencia del pago permite que las dos páginas lo encuentren en Cardano: cuando tiene 10 bloques encima y paga al menos {amount}, el informe cuenta como pagado y liquidado, sin otro paso. El cotejo de sanciones es solo con una lista: no ve de dónde vino el dinero, y la lista es tan reciente como su fecha.',
  'app.rpay.pay.sent': 'Su billetera firmó la transacción {tx}, pero aún no está registrada para {licensor}.',
  'app.rpay.pay.forget': 'No está en el historial de mi billetera: pagar de nuevo',
  'app.rpay.pay.off':
    '{licensor} pidió que le paguen en {code} en Cardano. Pagar así desde esta página todavía no está activado aquí: pídale otros datos de pago.',
  'app.rpay.pay.notUsd':
    'Este informe está en {currency}. Pagar en un stablecoin es solo para informes en dólares estadounidenses.',
  'app.rpay.pay.notPar':
    'Los datos de Cardano de {licensor} no dicen que 1 {code} cuenta como 1 dólar estadounidense, así que esta página no puede ofrecerlo.',
  'app.rpay.w.otherNetwork': 'Su billetera está en otra red de Cardano. Cámbiela a {network} y vuelva a intentarlo.',
  'app.rpay.w.sanctioned':
    'Detenido: una dirección de este pago está en la lista de sanciones de EE. UU., o no se pudo leer. No se creó ni se envió nada.',
  'app.rpay.w.noCoins': 'Su billetera no tiene monedas con las que pagar.',
  'app.rpay.w.cantBuild': 'No se pudo crear el pago ({why}). No se envió nada.',
  'app.rpay.c.checking': 'Comprobando el pago en Cardano…',
  'app.rpay.c.ok':
    'Pagado y liquidado: {amount} en {code}, comprobado en Cardano (transacción {tx}, {n} bloques encima).',
  'app.rpay.c.unconfirmed':
    'El pago está en Cardano, pero todavía no tiene 10 bloques encima. La página vuelve a comprobarlo.',
  'app.rpay.c.failed': 'Esa transacción falló en Cardano. No pagó nada.',
  'app.rpay.c.no-ref': 'Esa transacción no lleva ninguna referencia de pago de VeilCore.',
  'app.rpay.c.many-refs': 'Esa transacción lleva más de una referencia de pago, así que no cuenta para ninguna.',
  'app.rpay.c.wrong-ref': 'La referencia de esa transacción es de otro estado de cuenta.',
  'app.rpay.c.none': 'Esa transacción no pagó {code} a la dirección de pago.',
  'app.rpay.c.short': 'Esa transacción pagó {paid} {code}, menos de {amount}. El resto se sigue debiendo.',
  'app.rpay.c.not-found': 'Cardano todavía no tiene esa transacción (puede tardar un minuto).',
  'app.rpay.c.unreachable': 'No se pudo llegar a Cardano. La página lo vuelve a intentar.',
  'app.rpay.c.no-relay': 'Este sitio todavía no puede comprobar Cardano, así que {licensor} confirma el pago a mano.',
  'app.rpay.c.not-tx': 'La referencia de pago no es una transacción de Cardano.',
};
