// The record app's English: claims on a laboratory's parentage result under animal-parentage/v1
// (veilcore/parentage.ts, docs/parentage.md). Its own file: these say "the holder proved", which
// the lab result words (labresult.ts, lab-viability.test.ts) never do.
// SPDX-License-Identifier: Apache-2.0

export const parentage = {
  'app.parentage.offer.sireConflicts': 'Conflicts with the sire: at most {n} (within ICAR’s accepted band)',
  'app.parentage.offer.damConflicts': 'Conflicts with the dam: at most {n} (within ICAR’s accepted band)',
  'app.parentage.offer.trioConflicts': 'Conflicts across the trio: at most {n} (within ICAR’s accepted band)',
  'app.parentage.offer.sireCompared': 'SNPs compared with the sire: at least {n} (ICAR minimum)',
  'app.parentage.offer.damCompared': 'SNPs compared with the dam: at least {n} (ICAR minimum)',
  'app.parentage.line.sireConflicts': 'Conflicts with the sire: at most {n}',
  'app.parentage.line.damConflicts': 'Conflicts with the dam: at most {n}',
  'app.parentage.line.trioConflicts': 'Conflicts across the trio: at most {n}',
  'app.parentage.line.sireCompared': 'SNPs compared with the sire: at least {n}',
  'app.parentage.line.damCompared': 'SNPs compared with the dam: at least {n}',
  'app.parentage.fixed':
    'This bound is ICAR’s, not a number rounded from the lab’s count, so it shows only that the result is in the accepted band.',
  'app.parentage.bands.title': 'ICAR 2023 bands for SNP parentage verification',
  'app.parentage.bands.single':
    'With one parent: 0 to 2 conflicts is accepted, 3 to 5 is doubtful, more than 5 is excluded.',
  'app.parentage.bands.trio':
    'Across the trio (the offspring, sire and dam): 0 to 3 conflicts is accepted, 4 to 7 is doubtful, more than 7 is excluded.',
  'app.parentage.bands.compared':
    'Each animal needs at least 185 SNPs read. The offspring and each parent need at least 175 read in both, and for the trio at least 165 read in all three (offspring, sire and dam).',
  'app.parentage.bands.only':
    'Only the accepted bounds are offered here, never a rounded one: “at most 5” would be the top of the doubtful band.',
  'app.parentage.unmet.sireConflicts':
    'The lab’s count of conflicts with the sire is not in the accepted band, so no claim about the sire is offered.',
  'app.parentage.unmet.damConflicts':
    'The lab’s count of conflicts with the dam is not in the accepted band, so no claim about the dam is offered.',
  'app.parentage.unmet.trioConflicts':
    'The lab’s count of conflicts across the trio is not in the accepted band, so no claim about the trio is offered.',
  'app.parentage.unmet.sireCompared':
    'Fewer SNPs were compared with the sire than ICAR’s minimum, so that minimum can’t be claimed.',
  'app.parentage.unmet.damCompared':
    'Fewer SNPs were compared with the dam than ICAR’s minimum, so that minimum can’t be claimed.',
  'app.parentage.all':
    'To show the ICAR 2023 checks that can be proved here, prove all five, then copy one link with all of them. Where every claim checks and a laboratory stands behind the numbers, the check page then says the result meets five of ICAR 2023’s parentage checks.',
  'app.parentage.none': 'Nothing on this result meets ICAR’s acceptance bounds, so no claim is offered.',
  'app.parentage.cert.title': 'Meets five of ICAR 2023’s parentage checks',
  'app.parentage.cert.text':
    'A laboratory’s signed parentage result, dated on Midnight. The holder proved, without showing the genotypes or the counts, that it meets ICAR 2023’s conflict limits and its minimum of SNPs compared with each parent. The laboratory saw the genotypes. Consistent with descent is not proof of descent. VeilCore tested nothing.',
  'app.parentage.cert.bounds':
    'Proved: at most 2 conflicts with the sire and at most 2 with the dam, at most 3 across the trio, and at least 175 SNPs compared between the offspring and each parent. Not proved: ICAR’s minimums of 185 SNPs read for each animal and 165 read in all three (offspring, sire and dam). The form has no number for them; the laboratory applies them.',
  'app.parentage.source.lab':
    'The laboratory’s counts, from the result it signed. They are counts, not a breed society’s decision.',
  'app.parentage.limits.labSaw':
    'The laboratory saw the three genotypes and the counts, as it does today. The claims keep them from everyone else, not from the laboratory.',
  'app.parentage.limits.descent':
    'Consistent with descent is not proof of descent. An animal closely related to the true parent, such as a full brother of the sire, can pass.',
  'app.parentage.limits.which':
    'Which animals were tested (by their proof codes), the panel and the method are in the laboratory’s result file, not in the claim. The claim is about the result, not about the animal’s own record.',
  'app.parentage.limits.sample':
    'A result says what the samples sent under those records showed. It doesn’t show that the animal in front of you is the one sampled.',
  'app.parentage.limits.trioMin':
    'The form has no number for the SNPs read for each animal (ICAR’s minimum is 185) or read in all three of the offspring, sire and dam (ICAR’s minimum for the trio is 165). Applying those minimums is the laboratory’s part, and no claim shows them.',
  'app.parentage.limits.society':
    'It is not a breed society’s certificate. VeilCore tested nothing and vouches for no laboratory.',
  'app.parentage.unmet.trioParents':
    'ICAR grades the trio only once both parents are accepted, so no claim about the trio is offered.',
  'app.parentage.unmet.grade.sireConflicts':
    'The laboratory did not grade the sire as accepted, so no claim about the sire is offered.',
  'app.parentage.unmet.grade.damConflicts':
    'The laboratory did not grade the dam as accepted, so no claim about the dam is offered.',
  'app.parentage.unmet.grade.trioConflicts':
    'The laboratory did not grade the trio as accepted, so no claim about the trio is offered.',
};
