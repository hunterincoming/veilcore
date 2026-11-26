// La app de registros en español (Argentina, usted): pruebas sobre dos registros del mismo titular
// (../en/two-records.ts). BORRADOR: asistido por máquina, a revisar por un hablante nativo antes de
// publicarse (docs/translations/README.md).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const twoRecords = {
  'app.tworec.more.title': 'Más formas de probar',
  'app.tworec.more.text':
    'Compare los números sellados en este registro con otro de sus registros, sin mostrar los números.',
  'app.tworec.more.distinct': 'Mostrar que estos dos registros son diferentes',
  'app.tworec.more.unchanged': 'Mostrar que una corrección solo cambió lo que dice',

  'app.tworec.status.notYet': 'Construido, aún no usado en la red principal de Midnight.',
  'app.tworec.status.ran': 'Esto ya se usó en la red principal de Midnight.',
  'app.tworec.unpaid':
    'Esto todavía no se puede enviar desde este sitio: el servicio de comisiones de VeilCore aún no paga estas dos pruebas. Puede ver lo que se probaría. No se envía nada.',
  'app.tworec.what': 'Qué probar',
  'app.tworec.this': 'Este registro',
  'app.tworec.other': 'El otro registro',
  'app.tworec.original': 'El registro anterior que este corrige',
  'app.tworec.none': 'No tiene otro registro con números según el formulario «{schema}». Selle otro primero.',
  'app.tworec.distinct.text':
    'Esto prueba que los dos registros se diferencian en al menos {k} de los números que compara su formulario. Nunca muestra qué números son diferentes, en cuánto ni cuántos. Ese número lo fija el formulario; usted no puede elegirlo.',
  'app.tworec.unchanged.text':
    'Marque los números que la corrección podía cambiar. Esto prueba que todos los demás números son iguales en los dos registros. La lista que marca es pública; los números no.',
  'app.tworec.unchanged.list': 'Podía cambiar',
  'app.tworec.unchanged.carries':
    'Ya es público sobre el registro anterior: {list}. Probar esto hace que cada uno de esos hechos valga también para este registro, porque esos números quedan sin marcar.',
  'app.tworec.unchanged.changed': '{label} (cambió)',
  'app.tworec.preview.distinct':
    'Esto prueba: estos dos registros se diferencian en al menos {k} de los números que compara su formulario.',
  'app.tworec.preview.unchanged':
    'Esto prueba: salvo {list}, cada número de este registro es igual al del registro anterior.',
  'app.tworec.preview.unchangedNone': 'Esto prueba: cada número de este registro es igual al del registro anterior.',
  'app.tworec.refuse.noNumbers': 'Uno de estos registros no tiene números sellados.',
  'app.tworec.refuse.notOffered':
    'Este tipo de registro no se puede comparar así. Funciona con números que usted mismo escribió, según estos formularios: {forms}.',
  'app.tworec.refuse.sameRecord': 'Es el mismo registro. Elija otro.',
  'app.tworec.refuse.otherForm':
    'Los dos registros usan formularios diferentes, así que sus números no se pueden comparar.',
  'app.tworec.refuse.tooFew':
    'Estos dos registros se diferencian en {n} de los números comparados y se necesitan al menos {k}, así que no se puede probar. No se envió nada.',
  'app.tworec.refuse.undeclared':
    '{list} cambió pero no está marcado. Márquelo, o no se puede probar. No se envió nada.',
  'app.tworec.refuse.saysNothing': 'Con todos los números marcados esto no dice nada. Deje al menos uno sin marcar.',
  'app.tworec.err.unpaid': 'El servicio de comisiones de VeilCore aún no paga esta prueba, así que no se envió nada.',
  'app.tworec.err.deviceOnly':
    'Un registro guardado solo en este dispositivo no se puede comparar así. No se envió nada.',
  'app.tworec.err.tooFew':
    'Estos dos registros no se diferencian en suficientes números comparados, así que no se puede probar. No se envió nada.',
  'app.tworec.err.undeclared':
    'Cambió un número que no está en su lista, así que no se puede probar. No se envió nada.',
  'app.tworec.err.otherRecords': 'Esa afirmación es sobre otros registros.',
  'app.tworec.err.otherList': 'Esa afirmación permitía cambiar otros números.',
  'app.tworec.err.listSaysNothing': 'Esa afirmación permite cambiar todos los números, así que no dice nada.',
  'app.tworec.err.notTwo':
    'Esa transacción no es una sola afirmación sobre dos registros en el contrato de pruebas de VeilCore.',
  'app.tworec.tie':
    'Los códigos de los dos registros van a Midnight, donde VeilCore, y cualquiera con el enlace de comprobación de uno de ellos, puede vincular esta prueba con ellos. VeilCore también puede vincularla con las claves de titular que los fecharon.',
  'app.tworec.made': 'Lo que ha probado sobre dos registros',
  'app.tworec.line.distinct': '{a} y {b} se diferencian en al menos {k} de los números que compara su formulario',
  'app.tworec.line.unchanged': '{b} tiene los mismos números que {a}, salvo {list}',
  'app.tworec.line.unchangedNone': '{b} tiene los mismos números que {a}',

  'app.tworec.not.title': 'Lo que esto no muestra',
  'app.tworec.not.examine':
    'Es un recuento, no una decisión. Si dos variedades o lotes son distintos lo decide quien los examina, por ejemplo una oficina examinadora. Esto no sustituye ese examen.',
  'app.tworec.not.which': 'No muestra qué números son diferentes, en cuánto ni cuántos.',
  'app.tworec.not.typed': 'Esto no muestra que un laboratorio haya medido o firmado los números.',
  'app.tworec.not.reference':
    'El titular eligió el otro registro. Para una comparación justa, alguien que no sea el titular debería decir con qué registro comparar.',
  'app.tworec.not.oneParty':
    'El titular tiene los dos registros. Esto no permite que dos personas comparen números que ninguna quiere mostrarle a la otra.',
  'app.tworec.not.correction': 'No muestra cuál registro es la corrección, ni que uno reemplazó al otro.',
  'app.tworec.not.ticked': 'Un número de la lista puede haber cambiado o no.',
  'app.tworec.not.onlyNumbers':
    'Trata solo de los números sellados, no de los demás datos ni archivos de los registros.',
  'app.tworec.not.sealed': 'Trata de los dos registros tal como se sellaron, no de si alguno sigue vigente.',

  'app.tworec.check.title': 'Comprobar una prueba sobre dos registros',
  'app.tworec.check.intro':
    'Alguien le envió este enlace para mostrar un hecho sobre los números de dos de sus registros sellados, sin mostrar los números. Esta página lee la prueba en Midnight y la comprueba.',
  'app.tworec.check.distinct':
    'Estos dos registros, tal como se sellaron, se diferencian en al menos {k} de los números que compara su formulario.',
  'app.tworec.check.unchanged': 'Salvo {list}, el segundo registro tiene los mismos números que el primero.',
  'app.tworec.check.unchangedNone': 'El segundo registro tiene los mismos números que el primero.',
  'app.tworec.check.first': 'El primer registro',
  'app.tworec.check.second': 'El segundo registro',
  'app.tworec.check.earlier': 'El registro anterior (según el titular)',
  'app.tworec.check.correction': 'La corrección (según el titular)',
} satisfies Partial<AppTranslation>;
