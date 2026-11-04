// The record app in Spanish: a laboratory's signature on a document's numbers (../en/attest.ts).
// DRAFT: machine-assisted, to be checked by a fluent speaker before publishing
// (docs/translations/README.md).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const attest = {
  'app.doc.schema.soybean-snp-similarity': 'Similitud genética de soja (SNP, BARCSoySNP6K)',
  'app.doc.schema.maize-snp-similarity': 'Similitud genética de maíz (SNP)',
  'app.doc.schema.genetic-similarity': 'Similitud genética (cualquier cultivo o cepa)',
  'app.doc.slot.similarity': 'Similitud con la variedad más cercana',
  'app.doc.slot.markersCompared': 'Marcadores comparados',
  'app.doc.slot.markersDiffering': 'Marcadores que difieren',
  'app.doc.slot.varietiesCompared': 'Variedades comparadas',
  'app.doc.nums.badWhole': 'Un número entero, como 5103.',
  'app.claim.boundBadWhole': 'Un número entero.',

  'app.labnums.title': 'Números de este informe, firmados por usted (opcional)',
  'app.labnums.text':
    'Elija el formulario y escriba los números exactamente como en su informe. Se sellan en un registro que usted firma y se envían bloqueados con el informe. El obtentor podrá demostrar un número sin mostrar los demás, como un número que su laboratorio firmó.',
  'app.labnums.resultTitle': 'Nombre de este resultado (la referencia de su informe)',
  'app.labnums.inReport': 'Números que el laboratorio firmó con este informe ({form}):',
  'app.labnums.addText':
    'Añádalos como un registro suyo. Después podrá publicar la firma del laboratorio en Midnight y demostrar un número cada vez.',
  'app.labnums.add': 'Añadir los números firmados como registro',
  'app.labnums.openRecord': 'Abrir el registro con estos números',
  'app.labnums.cantUse': 'Este informe trae números que no se pueden usar: {reason}',
  'app.labnums.otherPlant': 'se refieren a otra planta.',
  'app.labnums.otherReport': 'nombran otro archivo de informe.',
  'app.attest.title': 'Firma del laboratorio',
  'app.attest.signedBy': 'Firmado con la clave de laboratorio {key}.',
  'app.attest.publishText': 'Publique la firma en Midnight para que los enlaces que copie puedan mostrarla.',
  'app.attest.publish': 'Publicarla en Midnight',
  'app.attest.publishing': 'Publicando…',
  'app.attest.published':
    'Publicada en Midnight en el bloque {block}. Los enlaces que copie en «Lo que ha demostrado» ya la incluyen.',
  'app.attest.stale': 'La firma guardada con este registro ya no coincide con él. Añádala de nuevo.',

  'app.claim.labSigned': 'La clave de laboratorio {key} firmó estos números, y los enlaces incluyen esa firma.',

  'app.claim.check.labOk':
    'Los números de ese registro se firmaron con la clave {key}, publicada en Midnight en el bloque {block}{date}.',
  'app.claim.check.labWithdrawn': 'El laboratorio ha retirado esta firma. Tome los números como del propio titular.',
  'app.claim.check.labConflict':
    'Más de un laboratorio reclama esta clave, así que no se muestra ningún nombre. Tome los números como del propio titular.',
  'app.claim.check.labUnidentified':
    'Ningún laboratorio ha dicho que esta clave sea suya para este registro. Tome los números como del propio titular.',
  'app.claim.check.labAbout': 'Los resultados se refieren al registro con el código de prueba',
  'app.claim.check.labFieldSecret':
    'El laboratorio también conoce estos números y podría demostrar cosas sobre ellos por su cuenta.',
  'app.claim.check.labKey': 'Clave del laboratorio',
  'app.claim.check.labFailed':
    'La firma del laboratorio no está confirmada: {reason} Tome los números como del propio titular.',
  'app.claim.check.whatLab':
    'Lo que muestra: el número sellado en ese registro cumple el límite (o es ese valor), y la clave de arriba firmó los números de ese registro. Lo que no: de quién es esa clave, ni que el certificado sea auténtico. Cada límite demostrado sobre un número es público, y juntos lo acotan.',
} satisfies Partial<AppTranslation>;
