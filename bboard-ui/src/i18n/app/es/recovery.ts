// La app de registros en español: la hoja de recuperación (../en/recovery.ts).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const recovery = {
  'app.recovery.err.length': 'Un código de recuperación tiene 28 caracteres. Revise que lo escribió completo.',
  'app.recovery.err.typo': 'Ese código tiene un error. Compare cada carácter con su hoja.',
  'app.recovery.err.wrong': 'Ese código no abre ningún registro guardado. Compárelo con su hoja.',
  'app.recovery.err.notThisSheet':
    'Ese es el código de una hoja anterior. Escriba el código de la hoja que acaba de imprimir.',
  'app.recovery.err.needsSheet':
    'Su llave de acceso no puede abrir aquí sus registros guardados. Escriba el código de su hoja de recuperación para configurarla de nuevo.',

  'app.recovery.prompt.title': 'Una cosa más: su hoja de recuperación',
  'app.recovery.prompt.recommended': 'Recomendado',
  'app.recovery.prompt.text':
    'Si alguna vez pierde su cuenta de Apple o de Google, esta hoja es la única forma de volver. VeilCore no puede recuperarla por usted.',
  'app.recovery.prompt.bound': 'Créela ahora: es la única forma de volver. VeilCore no puede recuperarla por usted.',
  'app.recovery.prompt.make': 'Imprimir o guardar mi hoja de recuperación',
  'app.recovery.prompt.later': 'Más tarde',

  'app.recovery.title': 'Su hoja de recuperación',
  'app.recovery.intro':
    'Tiene un código que abre sus registros guardados en un dispositivo nuevo. El código se crea en este dispositivo, y VeilCore nunca lo ve.',
  'app.recovery.asking': 'Su dispositivo le pide confirmar una vez, para abrir sus registros y crear la hoja.',
  'app.recovery.haveOne': 'Ya tengo mi hoja: comprobarla',
  'app.recovery.onlyNow':
    'Este código se muestra solo mientras esta ventana esté abierta. Imprima la hoja, o anote el código, antes de cerrarla.',
  'app.recovery.print': 'Imprimir o guardar como PDF',
  'app.recovery.next': 'Siguiente: comprobarla',
  'app.recovery.confirm.lead': 'Para asegurarse de que su hoja está bien, escriba el código completo que tiene.',
  'app.recovery.confirm.label': 'Código de recuperación',
  'app.recovery.confirm.check': 'Comprobar',
  'app.recovery.confirm.skip': 'Omitir por ahora',
  'app.recovery.confirm.back': 'Mostrar el código otra vez',
  'app.recovery.done.title': 'Su hoja de recuperación funciona.',
  'app.recovery.done.text': 'Guárdela con sus papeles importantes. Una hoja anterior ya no funciona.',
  'app.recovery.done.ok': 'Listo',
  'app.recovery.close': 'Cerrar',
  'app.recovery.failed': 'No funcionó: {why}',

  'app.recovery.sheet.title': 'Hoja de recuperación de VeilCore',
  'app.recovery.sheet.keep':
    'Guárdela con sus papeles importantes (el libro genealógico, los papeles de la asociación). No le saque fotos ni la envíe por correo electrónico.',
  'app.recovery.sheet.codeLabel': 'Código de recuperación',
  'app.recovery.sheet.made': 'Creada el {date}.',
  'app.recovery.sheet.passkey':
    'La llave de acceso que abre los mismos registros se llama «VeilCore: unlocks your records · {tag}» en sus contraseñas.',
  'app.recovery.sheet.how':
    'Para recuperar sus registros: entre en {site}, toque «Recuperar mis registros», elija «Usar mi hoja de recuperación» y escriba el código.',
  'app.recovery.sheet.phishing':
    'VeilCore pide este código solo en {site}: para comprobar esta hoja o para recuperar sus registros. Nunca lo escriba en otro lugar. Nunca lo dicte por teléfono, WhatsApp ni correo, ni siquiera a VeilCore.',
  'app.recovery.sheet.anyone':
    'Quien tenga este código puede abrir sus registros. VeilCore no lo guarda y no puede decírselo otra vez.',
  'app.recovery.sheet.newer': 'Cuando compruebe una hoja más nueva, esta deja de funcionar.',

  'app.recovery.restore.use': 'Usar mi hoja de recuperación',
  'app.recovery.restore.lead': 'Escriba el código de su hoja de recuperación. Los guiones y los espacios no importan.',
  'app.recovery.restore.open': 'Abrir mis registros',
  'app.recovery.restore.addTitle': 'Ábralos sin la hoja la próxima vez',
  'app.recovery.restore.addText':
    'Configure una llave de acceso en este dispositivo: así sigue guardando y abre sus registros sin la hoja.',
  'app.recovery.restore.added': 'Listo. Este dispositivo ahora abre sus registros guardados por sí solo.',

  'app.settings.ways.sheet': 'Hoja de recuperación · creada el {date}',
  'app.settings.ways.sheetChecked': 'Comprobada el {date}.',
  'app.settings.ways.sheetUnchecked': 'Todavía no comprobada: escriba su código para comprobarla.',
  'app.settings.sheet.why':
    'Una hoja de recuperación abre sus registros guardados en un dispositivo nuevo si pierde el teléfono o la computadora donde está su llave de acceso, o la cuenta donde se guarda.',
  'app.settings.sheet.make': 'Crear una hoja de recuperación',
  'app.settings.sheet.makeNew': 'Crear una hoja de recuperación nueva',
  'app.settings.sheet.check': 'Comprobar mi hoja de recuperación',
  'app.settings.faceId.here': 'Este dispositivo abrió sus registros con la hoja de recuperación.',

  'app.account.line.makeSheet': 'Crear una hoja de recuperación',
  'app.account.line.later': 'Más tarde',
  'app.account.line.reminder':
    '<b>Cree una hoja de recuperación:</b> su forma de volver si alguna vez pierde su llave de acceso.',
  'app.account.line.reverify': 'Pasó un tiempo. Compruebe que su llave de acceso todavía abre sus registros guardados.',
  'app.account.line.check': 'Comprobar',

  'app.account.sheet.setUpAgain': 'Configurarla de nuevo',
  'app.recovery.noPrinter':
    '¿No tiene impresora? Escriba el código a mano en un papel. Si guarda un PDF, guárdelo en una memoria USB, no en el correo, un chat, iCloud, Google Drive ni OneDrive.',
  'app.recovery.prompt.laterBound': 'Lo haré más tarde',
  'app.recovery.err.noMatch': 'Eso no coincide con su hoja. Revise cada carácter y vuelva a intentarlo.',
  'app.recovery.done.first': 'Guárdela con sus papeles importantes, no en su teléfono.',
  'app.recovery.sheet.lost': '¿Perdió esta hoja, o alguien la vio? Cree una nueva en Ajustes ahora.',
  'app.recovery.sheet.letters': 'No contiene las letras O, I ni L: léalas como 0 y 1.',
  'app.account.sheet.noSheet': 'No tengo mi hoja: empezar de nuevo',
  'app.account.sheet.noSheetConfirm':
    '¿Empezar de nuevo sin la hoja? Sus registros guardados se reemplazan por una copia nueva de este dispositivo, y todas las hojas de recuperación dejan de funcionar. Los registros que solo están en sus otros dispositivos vuelven cuando esos dispositivos guarden de nuevo.',
} satisfies Partial<AppTranslation>;
