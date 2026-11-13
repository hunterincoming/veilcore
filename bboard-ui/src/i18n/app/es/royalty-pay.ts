// La app de registros en español: los pagos de regalías a la vista y el pago en un stablecoin
// en dólares estadounidenses en Cardano (../en/royalty-pay.ts). BORRADOR: asistido por máquina,
// a revisar por un hablante nativo antes de publicar (docs/translations/README.md).
// SPDX-License-Identifier: Apache-2.0

export const royaltyPay = {
  'app.rpay.st.overdue': 'Vencido',
  'app.rpay.l.soon': 'Recordatorio: el pago del informe {n} vence el {date}.',
  'app.rpay.l.overdue': 'El pago del informe {n} está vencido desde el {date}.',
  'app.rpay.l.consequence':
    'Si no se paga, la página de comprobación pública del registro de {licensor} puede decir que un informe de regalías está vencido. Tras un aviso de incumplimiento tiene {days} días para pagar antes de que la licencia se pueda revocar por falta de pago.',
  'app.rpay.i.soon': 'El pago de {licensee} del informe {n} vence el {date}.',
  'app.rpay.i.overdue': 'El pago de {licensee} del informe {n} está vencido desde el {date}.',
  'app.rpay.i.publicFailed':
    'No se pudo poner esto en la página de comprobación pública de su registro ahora. La página lo vuelve a intentar la próxima vez que se abra.',
  'app.rpay.i.publicUnsupported':
    'El registro de VeilCore todavía no acepta avisos públicos, así que esto no está en la página de comprobación pública de su registro.',
  'app.rpay.revoke.open': 'Revocar por falta de pago',
  'app.rpay.revoke.yes': 'Revocar la licencia',
  'app.rpay.revoke.note': 'Licencia revocada por falta de pago del informe {n}.',
  'app.rpay.revoke.reason': 'Falta de pago',
  'app.rpay.pub.title': 'Regalías de licencias de este registro',
  'app.rpay.payout.option': 'Stablecoin en dólares en Cardano',
  'app.rpay.payout.info':
    'Le pagan desde su propia billetera directamente a su dirección de Cardano, en {code}. Al guardar esto acepta que 1 {code} cuenta como 1 dólar estadounidense. Los pagos en Cardano son públicos: cualquiera ve el monto, las dos direcciones y la fecha. El pago no lo nombra, pero una dirección a menudo se puede vincular a una persona, por ejemplo a través de un exchange. Una dirección nueva solo para este acuerdo lo separa de los demás. VeilCore nunca guarda ni mueve el dinero.',
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
  'app.rpay.l.breach':
    '{licensor} envió un aviso de incumplimiento el {date}. Pague a más tardar el {cureBy}: después de ese día, si no hay nada marcado como pagado, puede revocar la licencia por falta de pago.',
  'app.rpay.l.cureOver':
    '{licensor} envió un aviso de incumplimiento el {date}, y el plazo para pagar terminó el {cureBy}. Ahora puede revocar la licencia por falta de pago. Si ya pagó, regístrelo con «Pagué».',
  'app.rpay.i.breach':
    'Envió un aviso de incumplimiento el {date}. {licensee} tiene hasta el {cureBy} para pagar. «Revocar por falta de pago» se ofrece desde el día siguiente, si no hay nada marcado como pagado.',
  'app.rpay.i.cureOver':
    'Envió un aviso de incumplimiento el {date}. El plazo para pagar terminó el {cureBy} sin nada marcado como pagado, así que puede revocar por falta de pago.',
  'app.rpay.i.noNotice':
    'Para revocar por falta de pago, primero envíe un aviso de incumplimiento en el informe de abajo. {licensee} tendrá entonces {days} días para pagar.',
  'app.rpay.i.answered': '{licensee} lo disputa ({date}): «{note}»',
  'app.rpay.l.iPaid': 'Pagué',
  'app.rpay.l.dispute': 'Disputarlo',
  'app.rpay.l.disputeAgain': 'Responder de nuevo',
  'app.rpay.l.disputeNote': 'Por qué (breve; la otra parte lo verá)',
  'app.rpay.l.disputeSend': 'Enviar mi respuesta',
  'app.rpay.breach.open': 'Enviar un aviso de incumplimiento',
  'app.rpay.breach.what':
    'Un aviso firmado y fechado a {licensee} de que este pago está vencido. Luego tiene {days} días para pagar. Solo después, si no hay nada marcado como pagado, puede revocar la licencia por falta de pago.',
  'app.rpay.breach.send': 'Enviar el aviso',
  'app.rpay.breach.extra': 'Algo que añadir (opcional; la otra parte lo verá)',
  'app.rpay.breach.note':
    'El pago del informe {n}, que vencía el {due}, no se ha hecho. Tiene {days} días desde este aviso para pagar. Después, si sigue sin pagarse, la licencia se puede revocar por falta de pago.',
  'app.rpay.revoke.registryDown':
    'No se pudo contactar con el registro de VeilCore en este momento, así que no se revocó nada. Vuelva a intentarlo en un momento.',
  'app.rpay.revoke.notYet':
    'Todavía no: revocar por falta de pago solo es posible cuando el plazo para pagar tras su aviso de incumplimiento ha terminado sin nada marcado como pagado.',
  'app.rpay.notice.answer': '{who} disputó el pago de {period} el {date}: «{note}»',
  'app.rpay.notice.revoked': '{who} revocó la licencia por falta de pago ({period}) el {date}.',
  'app.rpay.notice.cureBy': 'Plazo para pagar: hasta el {cureBy}.',
  'app.rpay.pub.disputed': 'El licenciatario lo disputa (desde el {date}).',
  'app.rpay.i.public':
    'La página de comprobación pública de su registro dice: “Quien tiene este registro dice que un estado de regalías está vencido desde el {date}.” Sin montos, condiciones ni nombres. Se quita la próxima vez que esta página compruebe, una vez anotado el pago.',
  'app.rpay.i.publicBreach':
    'La página de comprobación pública de su registro dice, como palabra suya, que un estado de regalías está vencido desde el {date}, y que usted comunicó al registro de VeilCore el {breach} que había enviado un aviso de incumplimiento. El plazo para pagar cuenta desde ese día. Sin montos, condiciones ni nombres.',
  'app.rpay.i.publicAnswers': 'Al lado, en nombre propio del licenciatario: {answers}',
  'app.rpay.i.publicNoRecord':
    'Este registro no está guardado en el registro de VeilCore con la clave de titular de este navegador, así que desde aquí no se puede poner nada en su página de comprobación pública. Abra la licencia en el dispositivo que guardó el registro, o restaure aquí su copia de seguridad.',
  'app.rpay.revoke.what':
    'Esto termina la licencia en Midnight y no se puede deshacer. Su aviso de incumplimiento se envió y el plazo para pagar terminó según el reloj del registro de VeilCore, sin nada marcado como pagado. Luego {licensee} recibe un aviso firmado de que se revocó por falta de pago. La página de comprobación pública de su registro lo dice, con la fecha, si el registro confirma que el plazo terminó sin ningún pago anotado; si no, no dice nada sobre el pago.',
  'app.rpay.revoke.done': 'Revocada por falta de pago el {date}.',
  'app.rpay.revoke.public': 'La página de comprobación pública de su registro lo dice.',
  'app.rpay.revoke.notPublic':
    'El registro de VeilCore no aceptó una línea pública sobre falta de pago (el plazo no había terminado según su reloj, o hay un pago anotado), así que la página de comprobación pública no dice nada sobre el pago.',
  'app.rpay.pub.overdue': 'Quien tiene este registro dice que un estado de regalías está vencido desde el {date}.',
  'app.rpay.pub.breach':
    'Quien tiene este registro comunicó al registro de VeilCore el {date} que había enviado un aviso de incumplimiento.',
  'app.rpay.pub.revoked':
    'Quien tiene este registro dice que una licencia de este registro se revocó el {date} por falta de pago.',
  'app.rpay.pub.revokedChecked':
    'Quien tiene este registro comunicó al registro de VeilCore el {date} que había enviado un aviso de incumplimiento, y pasaron {days} días sin ningún pago anotado allí antes de que se aceptara esta línea. El registro comprobó esas fechas, no quién es el licenciatario.',
  'app.rpay.pub.answerPaid': 'El licenciatario dice que se pagó ({date}).',
  'app.rpay.pub.who':
    'Si un pago se debía es la palabra de quien tiene el registro; VeilCore no lo comprueba. La fecha junto a un aviso de incumplimiento es el día en que quien tiene el registro lo comunicó al registro de VeilCore, según el reloj del propio registro. Las respuestas del licenciatario están firmadas por él, y quien tiene el registro no puede quitarlas. No se nombra a nadie ni se muestran montos o condiciones.',
  'app.rpay.l.answered':
    'Lo disputó el {date}: «{note}». {licensor} lo ve. Su respuesta está archivada en el registro de VeilCore con su propia clave (el {filed}). Toda línea sobre este pago en la página de comprobación pública del registro de {licensor} muestra que usted lo disputa, con esa fecha, y {licensor} no puede quitarla.',
  // Before a full read of the registry: nothing said about filing either way.
  'app.rpay.l.answerSeen': 'Lo disputó el {date}: «{note}». {licensor} lo ve.',
  'app.rpay.l.answerPending':
    'Lo disputó el {date}: «{note}». {licensor} lo ve. Aún no se pudo archivar su respuesta en el registro de VeilCore, donde la muestra la página de comprobación pública del registro de {licensor}. Esta página lo vuelve a intentar cada vez que se abre.',
  'app.rpay.l.disputeShows':
    '{licensor} lo ve, firmado por usted. También se archiva en su nombre en el registro de VeilCore: la página de comprobación pública solo muestra que lo disputa y la fecha, nunca lo que escribió.',
  'app.rpay.pay.otherWay':
    '{licensor} pidió cobrar en {code} en Cardano, y esta página no puede pagar así. Pida a {licensor} otros datos de pago, pague de esa forma y luego regístrelo abajo con «Pagué».',
  'app.rpay.l.revoked':
    '{licensor} revocó la licencia por falta de pago del informe {n}, en un aviso firmado con fecha {date}.',
  'app.rpay.l.revokedPublic':
    'La página de comprobación pública del registro de {licensor} dice que se revocó el {date} por falta de pago. El registro de VeilCore solo lo aceptó después de que terminara el plazo para pagar según su reloj, sin ningún pago anotado.',
  'app.rpay.l.revokedNotPublic':
    'La página de comprobación pública del registro de {licensor} no dice nada sobre falta de pago: el registro de VeilCore no lo ha aceptado.',
  'app.rpay.l.revokedDisputed':
    'Lo disputó el {date}. Su respuesta está archivada en su propio nombre en el registro de VeilCore, y {licensor} no puede quitarla: toda línea sobre este pago en la página de comprobación pública del registro de {licensor} muestra que usted lo disputa.',
  'app.rpay.notice.early': 'Se envió antes de que el pago estuviera vencido, así que no abre ningún plazo para pagar.',
  'app.rpay.notice.notThisOne':
    'El plazo para pagar cuenta desde el primer aviso de incumplimiento después de que el pago venciera.',
  'app.rpay.predates':
    'Esta licencia se hizo antes de que el registro de VeilCore guardara las claves que necesitan los avisos públicos, así que nada sobre sus pagos puede ir a la página de comprobación pública ni responderse allí. Los recordatorios, los avisos de incumplimiento, el plazo para pagar y las respuestas siguen funcionando entre ustedes dos, firmados.',
  'app.rpay.i.breachNotRegistered':
    'La página de comprobación pública dice que este pago está vencido, pero todavía no que usted envió un aviso de incumplimiento: la página de {licensee} aún no ha registrado este informe en el registro de VeilCore. Normalmente lo hace sola la próxima vez que abran la licencia. Hasta entonces el plazo para pagar no puede empezar allí. Su aviso firmado está en el acuerdo de todos modos.',
  'app.rpay.i.breachNotDue':
    '{licensee} registró este informe en el registro de VeilCore con vencimiento el {due}. El registro solo archiva un aviso de incumplimiento a partir del día siguiente a esa fecha, así que la página de comprobación pública de su registro todavía no dice que usted envió uno. Esta página vuelve a preguntar cuando se abra después del {due}. Su aviso firmado está en el acuerdo de todos modos.',
  'app.rpay.l.answerPredates':
    'Lo disputó el {date}: «{note}». {licensor} lo ve, firmado por usted. Esta licencia se hizo antes de que el registro de VeilCore guardara las claves que necesitan las respuestas, así que no se puede archivar allí.',
  'app.rpay.l.pubOverdue':
    'La página de comprobación pública del registro de {licensor} dice, como palabra suya, que un estado de regalías está vencido desde el {date} (informe {n}).',
  'app.rpay.l.pubOverdueOther':
    'La página de comprobación pública del registro de {licensor} dice, como palabra suya, que un estado de regalías está vencido desde el {date}, sobre un mensaje de este acuerdo que no es uno de sus informes.',
  'app.rpay.l.pubOverdueUnreadable':
    'La página de comprobación pública del registro de {licensor} dice, como palabra suya, que un estado de regalías está vencido desde el {date}, sobre un mensaje de este acuerdo que esta página no puede abrir, o una segunda copia de un mensaje que ya está aquí, así que no corresponde a ninguno de sus informes.',
  'app.rpay.l.pubRevoked':
    'La página de comprobación pública del registro de {licensor} dice, como palabra suya, que una licencia de ese registro se revocó el {date} por falta de pago.',
  'app.rpay.l.pubBreach':
    '{licensor} comunicó al registro de VeilCore el {date} que había enviado un aviso de incumplimiento. El plazo para pagar corre hasta el {cureBy}.',
  'app.rpay.l.pubAnswers': 'Al lado, en su propio nombre: {answers}',
  'app.rpay.l.pubDisputeFailed': 'No se pudo archivar su respuesta ahora. Vuelva a intentarlo en un momento.',
  'app.rpay.i.dueDiffers':
    'La página de {licensee} registró este informe en el registro de VeilCore con vencimiento el {registered}, más tarde que el {due} que indican sus términos firmados. El registro se rige por la fecha registrada: solo archiva un aviso de incumplimiento a partir del día siguiente a esa fecha y, una vez pasada, la página de comprobación pública de su registro solo puede decir que el pago está vencido a partir de ese día siguiente. Los términos firmados del acuerdo siguen indicando el {due}.',
  'app.rpay.l.pubLookupFailed':
    'Ahora no se pudo comprobar cada mensaje de este acuerdo en el registro de VeilCore, así que aquí podría faltar una línea que la página de comprobación pública del registro de {licensor} muestra sobre alguno de ellos. Vuelva a comprobarlo en un momento.',
  'app.rpay.l.pubLookupAgain': 'Comprobar de nuevo',
};
