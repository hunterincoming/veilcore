// The record app in Spanish: claims on a laboratory's parentage result (../en/parentage.ts).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const parentage = {
  'app.parentage.offer.sireConflicts':
    'Conflictos con el padre: como máximo {n} (dentro de la franja «aceptado» de ICAR)',
  'app.parentage.offer.damConflicts':
    'Conflictos con la madre: como máximo {n} (dentro de la franja «aceptado» de ICAR)',
  'app.parentage.offer.trioConflicts':
    'Conflictos en el trío: como máximo {n} (dentro de la franja «aceptado» de ICAR)',
  'app.parentage.offer.sireCompared': 'SNP comparados con el padre: al menos {n} (mínimo de ICAR)',
  'app.parentage.offer.damCompared': 'SNP comparados con la madre: al menos {n} (mínimo de ICAR)',
  'app.parentage.line.sireConflicts': 'Conflictos con el padre: como máximo {n}',
  'app.parentage.line.damConflicts': 'Conflictos con la madre: como máximo {n}',
  'app.parentage.line.trioConflicts': 'Conflictos en el trío: como máximo {n}',
  'app.parentage.line.sireCompared': 'SNP comparados con el padre: al menos {n}',
  'app.parentage.line.damCompared': 'SNP comparados con la madre: al menos {n}',
  'app.parentage.fixed':
    'Es el límite del propio ICAR, no un número redondeado a partir del recuento del laboratorio, así que solo muestra que el resultado está en la franja «aceptado».',
  'app.parentage.bands.title': 'Franjas de ICAR 2023 para la verificación de filiación por SNP',
  'app.parentage.bands.single':
    'Con un progenitor: de 0 a 2 conflictos es aceptado, de 3 a 5 es dudoso y más de 5 es excluido.',
  'app.parentage.bands.trio':
    'En el trío (la cría, el padre y la madre): de 0 a 3 conflictos es aceptado, de 4 a 7 es dudoso y más de 7 es excluido.',
  'app.parentage.bands.compared':
    'Cada animal necesita al menos 185 SNP leídos. La cría y cada progenitor necesitan al menos 175 leídos en ambos, y el trío al menos 165 leídos en los tres (cría, padre y madre).',
  'app.parentage.bands.only':
    'Aquí solo se ofrecen los límites de la franja «aceptado», nunca uno redondeado: «como máximo 5» sería el tope de la franja «dudoso».',
  'app.parentage.unmet.sireConflicts':
    'El recuento de conflictos con el padre que dio el laboratorio no está en la franja «aceptado», así que no se ofrece ninguna afirmación sobre el padre.',
  'app.parentage.unmet.damConflicts':
    'El recuento de conflictos con la madre que dio el laboratorio no está en la franja «aceptado», así que no se ofrece ninguna afirmación sobre la madre.',
  'app.parentage.unmet.trioConflicts':
    'El recuento de conflictos en el trío que dio el laboratorio no está en la franja «aceptado», así que no se ofrece ninguna afirmación sobre el trío.',
  'app.parentage.unmet.sireCompared':
    'Se compararon con el padre menos SNP que el mínimo de ICAR, así que ese mínimo no se puede afirmar.',
  'app.parentage.unmet.damCompared':
    'Se compararon con la madre menos SNP que el mínimo de ICAR, así que ese mínimo no se puede afirmar.',
  'app.parentage.all':
    'Para mostrar los criterios de ICAR 2023 que se pueden probar aquí, pruebe las cinco afirmaciones y luego copie un solo enlace con todas. Si cada afirmación se comprueba y un laboratorio respalda los números, la página de comprobación dirá que el resultado cumple cinco de los criterios de filiación de ICAR 2023.',
  'app.parentage.none':
    'Nada de este resultado cumple los límites de aceptación de ICAR, así que no se ofrece ninguna afirmación.',
  'app.parentage.cert.title': 'Cumple cinco de los criterios de filiación de ICAR 2023',
  'app.parentage.cert.text':
    'Resultado de filiación firmado por un laboratorio, fechado en Midnight. Quien tiene el resultado probó, sin mostrar los genotipos ni los recuentos, que cumple los límites de conflictos de ICAR 2023 y su mínimo de SNP comparados con cada progenitor. El laboratorio vio los genotipos. Ser compatible con la filiación declarada no prueba la filiación. VeilCore no analizó nada.',
  'app.parentage.cert.bounds':
    'Probado: como máximo 2 conflictos con el padre y como máximo 2 con la madre, como máximo 3 en el trío, y al menos 175 SNP comparados entre la cría y cada progenitor. No probado: los mínimos de ICAR de 185 SNP leídos en cada animal y 165 leídos en los tres (cría, padre y madre). El formulario no tiene un número para ellos; los aplica el laboratorio.',
  'app.parentage.source.lab':
    'Los recuentos del laboratorio, del resultado que firmó. Son recuentos, no una decisión de una asociación de criadores.',
  'app.parentage.limits.labSaw':
    'El laboratorio vio los tres genotipos y los recuentos, como ocurre hoy. Las afirmaciones los ocultan a todos los demás, no al laboratorio.',
  'app.parentage.limits.descent':
    'Ser compatible con la filiación declarada no prueba la filiación. Un animal muy emparentado con el progenitor verdadero, como un hermano entero del padre, puede pasar la prueba.',
  'app.parentage.limits.which':
    'Qué animales se analizaron (por sus códigos de prueba), el panel y el método están en el archivo de resultado del laboratorio, no en la afirmación. La afirmación trata del resultado, no del registro propio del animal.',
  'app.parentage.limits.sample':
    'Un resultado dice lo que mostraron las muestras enviadas con esos registros. No muestra que el animal que tiene delante sea el que se muestreó.',
  'app.parentage.limits.trioMin':
    'El formulario no tiene un número para los SNP leídos en cada animal (el mínimo de ICAR es 185) ni para los leídos en los tres, cría, padre y madre (el mínimo de ICAR para el trío es 165). Aplicar esos mínimos le corresponde al laboratorio, y ninguna afirmación los muestra.',
  'app.parentage.limits.society':
    'No es un certificado de una asociación de criadores. VeilCore no analizó nada y no responde por ningún laboratorio.',
  'app.parentage.unmet.trioParents':
    'ICAR califica el trío solo cuando ambos progenitores están aceptados, así que no se ofrece ninguna afirmación sobre el trío.',
  'app.parentage.unmet.grade.sireConflicts':
    'El laboratorio no calificó al padre como aceptado, así que no se ofrece ninguna afirmación sobre el padre.',
  'app.parentage.unmet.grade.damConflicts':
    'El laboratorio no calificó a la madre como aceptada, así que no se ofrece ninguna afirmación sobre la madre.',
  'app.parentage.unmet.grade.trioConflicts':
    'El laboratorio no calificó el trío como aceptado, así que no se ofrece ninguna afirmación sobre el trío.',
} satisfies Partial<AppTranslation>;
