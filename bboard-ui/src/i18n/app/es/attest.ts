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

  'app.attest.title': 'Firma del laboratorio',
  'app.attest.text':
    'Pida al laboratorio que midió estos números que los firme. Así, lo que demuestre será sobre números que ese laboratorio firmó, no sobre números que usted escribió.',
  'app.attest.request': 'Descargar la solicitud para el laboratorio',
  'app.attest.requestWarn':
    'La solicitud contiene estos números y lo necesario para comprobarlos. Envíela solo al laboratorio.',
  'app.attest.how':
    'El laboratorio la abre en {site}/lab, comprueba los números con su informe y le devuelve un archivo de firma.',
  'app.attest.add': 'Añadir la firma del laboratorio',
  'app.attest.addOther': 'Añadir otra firma',
  'app.attest.signedBy': 'Firmado con la clave de laboratorio {key}.',
  'app.attest.fileSays': 'El archivo de firma la llama «{name}». Es solo una etiqueta: lo que cuenta es la clave.',
  'app.attest.publishText': 'Publique la firma en Midnight para que los enlaces que copie puedan mostrarla.',
  'app.attest.publish': 'Publicarla en Midnight',
  'app.attest.publishing': 'Publicando…',
  'app.attest.published':
    'Publicada en Midnight en el bloque {block}. Los enlaces que copie en «Lo que ha demostrado» ya la incluyen.',
  'app.attest.stale': 'La firma guardada con este registro ya no coincide con él. Añádala de nuevo.',
  'app.attest.added': 'Firma comprobada y añadida.',

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

  'app.labsign.title': 'Firmar números como laboratorio',
  'app.labsign.intro':
    'Alguien le envió un archivo de solicitud. Compruebe los números con su propio informe y luego firme. Su firma permite demostrar un hecho sobre un número, como «la similitud con la variedad más cercana es como máximo 95 %», como un número que su laboratorio firmó, sin mostrar los demás.',
  'app.labsign.private': 'Todo ocurre en este navegador. Su clave y la solicitud nunca salen de este ordenador.',
  'app.labsign.key.title': 'La clave de su laboratorio',
  'app.labsign.key.none':
    'Cree una clave una vez y firme todo con esa misma clave, para que la clave que publica no cambie.',
  'app.labsign.key.name': 'Nombre del laboratorio (una etiqueta para sus propios archivos)',
  'app.labsign.key.make': 'Crear una clave nueva',
  'app.labsign.key.open': 'Abrir su archivo de clave',
  'app.labsign.key.made':
    'Se guardó su archivo de clave. Manténgalo privado y con copia de seguridad: quien lo tenga puede firmar como su laboratorio. Si lo pierde, cree una clave nueva y publique la nueva.',
  'app.labsign.key.using': 'Firmando con la clave de «{name}».',
  'app.labsign.key.public': 'Su clave pública',
  'app.labsign.key.publish':
    'Publíquela en su sitio web y en sus informes. Quien compruebe una afirmación compara la clave que aparece con esta: así sabe que fue usted.',
  'app.labsign.key.copy': 'Copiar la clave pública',
  'app.labsign.key.copied': 'Copiada.',
  'app.labsign.req.title': 'La solicitud',
  'app.labsign.req.needKey': 'Primero cree o abra su clave.',
  'app.labsign.req.open': 'Abrir el archivo de solicitud',
  'app.labsign.req.what':
    'Compruebe cada línea con su informe. Usted firma todo: los números y los datos del documento.',
  'app.labsign.req.k.title': 'Documento',
  'app.labsign.req.k.type': 'Tipo',
  'app.labsign.req.k.about': 'Sobre',
  'app.labsign.req.k.issuer': 'Emitido por',
  'app.labsign.req.k.reference': 'Referencia',
  'app.labsign.req.k.holder': 'Titular',
  'app.labsign.req.k.issued': 'Fecha que figura',
  'app.labsign.req.k.form': 'Formulario',
  'app.labsign.req.k.notes': 'Notas',
  'app.labsign.req.k.files': 'Archivos (solo sus códigos)',
  'app.labsign.req.confirm': 'Comprobé cada número con nuestro informe y son nuestros.',
  'app.labsign.req.sign': 'Firmar y guardar el archivo de firma',
  'app.labsign.req.done':
    'Firmado. Devuelva el archivo de firma a quien le envió la solicitud. No contiene números, solo la firma.',
  'app.labsign.req.keep': 'La solicitud contiene los números. No la reenvíe.',
} satisfies Partial<AppTranslation>;
