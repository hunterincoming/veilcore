// The record app in English: where a plant came from (veilcore/origin-notes.ts), the batches'
// per-child details (components/flow/BatchFlow.tsx), and correcting an animal's sex and ID.
// Source text; see log.ts.
// SPDX-License-Identifier: Apache-2.0

export const origin = {
  // flow/LogFlow.tsx, the plant's first screen: who it is from.
  'app.origin.source.label': 'Where is it from?',
  'app.origin.source.bred': 'I bred or selected it',
  'app.origin.source.received': 'I received it from a breeder, a seed bank or a collection',
  'app.origin.source.landrace': 'A landrace or heirloom kept by a community',
  'app.origin.breederIfKnown': 'Breeder, if known',
  'app.origin.breederHelp': 'Leave it empty unless you know who bred it. Not you, unless you bred it.',
  'app.origin.needName': 'Add a name. Who bred it is optional here.',
  'app.origin.needNameAndBreeder': 'Add a name and who bred it.',
  'app.origin.notStated': 'Not stated',
  'app.origin.breederNotStated': 'Breeder not stated',
  // flow/OriginStep.tsx: the "Where it came from" step.
  'app.origin.title': 'Where it came from',
  'app.origin.intro':
    'All optional. Write what you know in your own words. It is sealed in the record’s notes, locked like the rest.',
  'app.origin.from': 'Where it came from',
  'app.origin.fromHelp': 'A community, a place, a seed bank or the person you got it from.',
  'app.origin.collection': 'Collection or community name',
  'app.origin.country': 'Country of origin',
  'app.origin.countryHelp': 'A name, or a three-letter code such as MEX.',
  'app.origin.received': 'Date you received it',
  'app.origin.permit': 'Permit number',
  'app.origin.permitHelp': 'A collecting or export permit, if there was one.',
  'app.origin.smta': 'SMTA number',
  'app.origin.smtaHelp': 'The Standard Material Transfer Agreement a genebank sent with it.',
  'app.origin.ircc': 'IRCC number',
  'app.origin.irccHelp': 'An internationally recognized certificate of compliance (Nagoya Protocol).',
  'app.origin.doi': 'GLIS DOI or other permanent ID',
  'app.origin.doiPlaceholder': 'e.g. 10.18730/…',
  'app.origin.back': 'Back',
  // The "Is this right?" screen.
  'app.origin.x.from': 'From: {v}',
  'app.origin.x.collection': 'Collection or community: {v}',
  'app.origin.x.country': 'Country of origin: {v}',
  'app.origin.x.received': 'Received: {v}',
  'app.origin.x.permit': 'Permit: {v}',
  'app.origin.x.smta': 'SMTA: {v}',
  'app.origin.x.ircc': 'IRCC: {v}',
  'app.origin.x.doi': 'DOI: {v}',
  'app.origin.x.sampStat': 'Biological status (MCPD): {v}',
  'app.origin.x.collSrc': 'Collecting source (MCPD): {v}',

  // Every check page (VerifyPage.tsx, VerifyExample.tsx, ClaimCheck.tsx).
  'app.origin.datedNotOrigin': 'A date shows who held this record first, not who bred it or where it came from.',

  // lab-import/BulkImportPage.tsx: a genebank passport sheet's columns (MCPD).
  'app.origin.import.show': '+ Where it came from (passport columns)',
  'app.origin.import.hide': '− Hide passport columns',
  'app.origin.import.title': 'Where it came from (passport columns)',
  'app.origin.import.help':
    'For a genebank passport sheet (MCPD). Each value is sealed in the record’s notes, under its own label.',
  'app.import.field.genus': 'Genus (GENUS)',
  'app.import.field.sampStat': 'Biological status (SAMPSTAT)',
  'app.import.field.collSrc': 'Collecting source (COLLSRC)',
  'app.import.field.origCty': 'Country of origin (ORIGCTY)',
  'app.import.field.acqDate': 'Date received (ACQDATE)',
  'app.import.field.puid': 'Permanent ID or DOI (PUID)',

  // flow/BatchFlow.tsx: young animals, one by one, before Save.
  'app.batch.sireTyped': 'Not on VeilCore: type the sire',
  'app.batch.sireName': 'Sire’s name',
  'app.batch.sireId': 'Sire’s ID or registration number',
  'app.batch.semenCode': 'Semen code (optional)',
  'app.batch.semenCodeHelp':
    'For artificial insemination: the bull’s stud code, such as a NAAB code (7HO12345). Sealed in each young animal’s notes.',
  'app.batch.needSire': 'Type the sire’s name or ID.',
  'app.batch.each.title': 'Each young animal',
  'app.batch.each.help':
    'Sex, ID and date of birth for each one, before you save. Sex and ID can be corrected later: a correction is a new record that points back to this one.',
  'app.batch.each.id': 'ID: ear tag, microchip or registration',
  'app.batch.each.idHelp': 'Exactly as written, country letters included.',
  'app.batch.each.born': 'Born',
  'app.batch.schemeHelp': 'Which numbering the IDs belong to. Pick one or type your own.',
  'app.batch.dupId': 'Two young animals have the same ID: {id}.',
  'app.batch.tooManyToEdit':
    'More than {max} at once: each one’s details can be added afterwards by correcting its record, or import a spreadsheet instead.',
  'app.batch.x.sex': 'Sex: {v}',
  // Clones: a lot, and a plant tag for each.
  'app.batch.lot.title': 'Lot',
  'app.batch.lot.name': 'Lot name',
  'app.batch.lot.nameHelp': 'Sealed in each clone’s notes with the lot size.',
  'app.batch.lot.count.one': '{count} clone in this lot',
  'app.batch.lot.count.other': '{count} clones in this lot',
  'app.batch.tags.title': 'Plant tags (optional)',
  'app.batch.tags.first': 'First plant tag',
  'app.batch.tags.help': 'The next ones are numbered on from it. Change any of them below.',
  'app.batch.tag': 'Tag for {name}',
  'app.batch.dupTag': 'Two clones have the same tag: {tag}.',

  // CorrectRecord.tsx: an animal's sex and ID.
  'app.plant.fix.field.sex': 'Sex',
  'app.plant.fix.field.individualId': 'Individual ID',
  'app.plant.fix.field.idScheme': 'ID scheme',
};
