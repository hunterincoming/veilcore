// Spanish (neutral Latin American, usted). DRAFT: machine-assisted, to be checked by a fluent
// speaker before publishing (docs/translations/README.md). Terms as in ../../es.ts.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const history = {
  'app.history.label': 'Historial de mejoramiento (borrador)',
  'app.history.intro':
    'Esta planta y los padres vinculados a ella que usted tiene aquí, una fila por registro, con el sello de fecha y el paquete de evidencia de cada uno. Un borrador del que copiar para una solicitud de variedad. No es asesoría legal.',
  'app.history.notEarlier':
    'Un registro no fecha nada anterior al día en que se selló. Cada paso sellado cuando ocurrió lleva su propia fecha; un historial redactado la semana en que presenta la solicitud vale lo que vale cualquier historial redactado.',
  'app.history.oneFile':
    'Un solo archivo con un historial de mejoramiento para imprimir (la línea familiar y luego una fila por registro: la fecha que usted dio, su sello de fecha, la etapa y para qué seleccionó, cómo se obtuvo), ordenado bajo encabezados sencillos para una solicitud PVP de EE. UU., un cuestionario de estilo UPOV y una solicitud japonesa. Las casillas de lo que VeilCore no tiene (uniformidad, estabilidad, variantes) quedan en blanco para usted. Una nota de portada de una página dice qué muestra y qué no, y el paquete de evidencia de cada registro va adentro.',
  'app.history.held.one': '{count} registro que usted tiene aquí',
  'app.history.held.other': '{count} registros que usted tiene aquí',
  'app.history.theirs.one': ', {count} padre vinculado que tiene otra persona (indicado como suyo)',
  'app.history.theirs.other': ', {count} padres vinculados que tiene otra persona (indicados como suyos)',
  'app.history.named.one': ', {count} padre nombrado sin registro',
  'app.history.named.other': ', {count} padres nombrados sin registro',
  'app.history.leftOut.one': ', {count} registro omitido (toma los {max} más cercanos)',
  'app.history.leftOut.other': ', {count} registros omitidos (toma los {max} más cercanos)',
  'app.history.end': '.',
  'app.history.notPut':
    'Las claves de sus registros y los archivos de informes de laboratorio no se incluyen. Cuando hay un informe de laboratorio guardado en una planta, su paquete de evidencia sí contiene el SHA-256 del informe y la huella que lo vincula a la planta, para que cualquiera a quien luego se le muestre el archivo pueda compararlo. VeilCore no avala nada de lo que dice un registro. Borrador. No es asesoría legal.',
  'app.history.downloaded':
    'Se descargó {name}. Abra primero el COVER-NOTE.html que contiene, y luego breeding-history.html para imprimir.',
  'app.history.locked.one': ', {count} registro bloqueado omitido (este navegador no tiene su clave)',
  'app.history.locked.other': ', {count} registros bloqueados omitidos (este navegador no tiene su clave)',
} satisfies Partial<AppTranslation>;
