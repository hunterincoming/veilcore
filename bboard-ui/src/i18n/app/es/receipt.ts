// La app de registros en español: el recibo de divulgación antes de cada paso en Midnight
// (../en/receipt.ts). BORRADOR: traducción asistida por máquina, a revisar por un hablante
// nativo antes de publicar (docs/translations/README.md).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const receipt = {
  'app.receipt.title': 'Lo que esto pone en Midnight',
  'app.receipt.public': 'Se hace público en Midnight:',
  'app.receipt.private': 'Queda privado:',
  'app.receipt.when': 'La fecha y la hora en que llega a Midnight',
  'app.receipt.fact.yourRecord': 'Un código hecho con la clave de su registro (no el registro)',
  'app.receipt.fact.recovery': 'Un código hecho con el secreto de recuperación del registro',
  'app.receipt.fact.newKey': 'Un código hecho con la nueva clave del registro',
  'app.receipt.fact.otherRecord': 'Un código hecho con la clave del otro registro',
  'app.receipt.fact.issuerRecord': 'Un código hecho con la clave del registro licenciado',
  'app.receipt.fact.challenge': 'El código de desafío de un solo uso de quien comprueba',
  'app.receipt.fact.dnaReport': 'Un código hecho con el informe de ADN (no el informe)',
  'app.receipt.fact.license': 'Un código hecho con la licencia (no sus condiciones)',
  'app.receipt.fact.newLicense': 'Un código hecho con la licencia del nuevo titular',
  'app.receipt.fact.licenseEntry': 'El código de entrada de la licencia en la lista pública de licencias',
  'app.receipt.fact.slot': 'El número de puesto de la licencia en esa lista',
  'app.receipt.fact.presentation': 'Un código de un solo uso que solo quien comprueba puede cotejar',
  'app.receipt.fact.listVersion': 'Qué versión de la lista de licencias coincidió',
  'app.receipt.fact.checkPassed': 'Que la comprobación salió bien',
  'app.receipt.fact.obligation': 'Un código hecho con la obligación (no sus condiciones)',
  'app.receipt.fact.certificate': 'El código de prueba del certificado sellado',
  'app.receipt.fact.otherCertificate': 'El código de prueba del segundo certificado',
  'app.receipt.fact.certKind': 'Qué tipo de certificado es',
  'app.receipt.fact.line': 'Qué línea del certificado',
  'app.receipt.fact.value': 'El valor de esa línea, completo',
  'app.receipt.fact.limit': 'El límite que eligió (nunca el número en sí)',
  'app.receipt.fact.comparison': 'Si es al menos o como máximo ese límite',
  'app.receipt.fact.mask': 'Qué líneas podían cambiar',
  'app.receipt.fact.labKey': 'La clave pública de firma del laboratorio',
  'app.receipt.fact.signatureCheck': 'Números de la comprobación de la firma del laboratorio',
  'app.receipt.fact.batch': 'Un código para todo un lote de registros',
  'app.receipt.fact.timeLimit': 'Un límite de tiempo para la lista de licencias',
  'app.receipt.stay.genetics': 'La genética y los archivos de ADN nunca salen de este dispositivo.',
  'app.receipt.stay.locked': 'El nombre y las notas van al registro cerrados con su clave. No puede leerlos.',
  'app.receipt.stay.kind': 'El registro ve el tipo de registro (planta, animal, documento) y su código de prueba.',
} satisfies Partial<AppTranslation>;
