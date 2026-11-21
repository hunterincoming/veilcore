// The record app in French: claims on a laboratory's parentage result (../en/parentage.ts).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const parentage = {
  'app.parentage.offer.sireConflicts': 'Conflits avec le père : au plus {n} (dans la classe « accepté » de l’ICAR)',
  'app.parentage.offer.damConflicts': 'Conflits avec la mère : au plus {n} (dans la classe « accepté » de l’ICAR)',
  'app.parentage.offer.trioConflicts': 'Conflits dans le trio : au plus {n} (dans la classe « accepté » de l’ICAR)',
  'app.parentage.offer.sireCompared': 'SNP comparés avec le père : au moins {n} (minimum de l’ICAR)',
  'app.parentage.offer.damCompared': 'SNP comparés avec la mère : au moins {n} (minimum de l’ICAR)',
  'app.parentage.line.sireConflicts': 'Conflits avec le père : au plus {n}',
  'app.parentage.line.damConflicts': 'Conflits avec la mère : au plus {n}',
  'app.parentage.line.trioConflicts': 'Conflits dans le trio : au plus {n}',
  'app.parentage.line.sireCompared': 'SNP comparés avec le père : au moins {n}',
  'app.parentage.line.damCompared': 'SNP comparés avec la mère : au moins {n}',
  'app.parentage.fixed':
    'C’est la limite de l’ICAR elle-même, pas un nombre arrondi à partir du comptage du laboratoire : elle montre seulement que le résultat est dans la classe « accepté ».',
  'app.parentage.bands.title': 'Classes de l’ICAR 2023 pour le contrôle de filiation par SNP',
  'app.parentage.bands.single': 'Avec un parent : de 0 à 2 conflits, accepté ; de 3 à 5, douteux ; plus de 5, exclu.',
  'app.parentage.bands.trio':
    'Dans le trio (le descendant, le père et la mère) : de 0 à 3 conflits, accepté ; de 4 à 7, douteux ; plus de 7, exclu.',
  'app.parentage.bands.compared':
    'Chaque animal doit avoir au moins 185 SNP lus. Le descendant et chaque parent doivent en avoir au moins 175 lus chez les deux, et le trio au moins 165 lus chez les trois (descendant, père et mère).',
  'app.parentage.bands.only':
    'Seules les limites de la classe « accepté » sont proposées ici, jamais une limite arrondie : « au plus 5 » serait le haut de la classe « douteux ».',
  'app.parentage.unmet.sireConflicts':
    'Le comptage des conflits avec le père fait par le laboratoire n’est pas dans la classe « accepté » : aucune preuve sur le père n’est donc proposée.',
  'app.parentage.unmet.damConflicts':
    'Le comptage des conflits avec la mère fait par le laboratoire n’est pas dans la classe « accepté » : aucune preuve sur la mère n’est donc proposée.',
  'app.parentage.unmet.trioConflicts':
    'Le comptage des conflits dans le trio fait par le laboratoire n’est pas dans la classe « accepté » : aucune preuve sur le trio n’est donc proposée.',
  'app.parentage.unmet.sireCompared':
    'Moins de SNP ont été comparés avec le père que le minimum de l’ICAR : ce minimum ne peut donc pas faire l’objet d’une preuve.',
  'app.parentage.unmet.damCompared':
    'Moins de SNP ont été comparés avec la mère que le minimum de l’ICAR : ce minimum ne peut donc pas faire l’objet d’une preuve.',
  'app.parentage.all':
    'Pour montrer les critères de l’ICAR 2023 qui peuvent être prouvés ici, établissez les cinq preuves, puis copiez un seul lien qui les contient toutes. Si chaque preuve est vérifiée et qu’un laboratoire se tient derrière les nombres, la page de vérification indique alors que le résultat satisfait à cinq des critères de filiation de l’ICAR 2023.',
  'app.parentage.none':
    'Rien dans ce résultat ne respecte les limites d’acceptation de l’ICAR : aucune preuve n’est donc proposée.',
  'app.parentage.cert.title': 'Satisfait à cinq des critères de filiation de l’ICAR 2023',
  'app.parentage.cert.text':
    'Un résultat de filiation signé par un laboratoire, daté sur Midnight. Le détenteur a prouvé, sans montrer les génotypes ni les comptages, que ce résultat respecte les limites de conflits de l’ICAR 2023 et son minimum de SNP comparés avec chaque parent. Le laboratoire a vu les génotypes. Être compatible avec la filiation n’est pas une preuve de filiation. VeilCore n’a rien analysé.',
  'app.parentage.cert.bounds':
    'Prouvé : au plus 2 conflits avec le père et au plus 2 avec la mère, au plus 3 dans le trio, et au moins 175 SNP comparés entre le descendant et chaque parent. Non prouvé : les minimums de l’ICAR de 185 SNP lus pour chaque animal et de 165 lus chez les trois (descendant, père et mère). Le formulaire n’a pas de nombre pour eux ; le laboratoire les applique.',
  'app.parentage.source.lab':
    'Les comptages du laboratoire, issus du résultat qu’il a signé. Ce sont des comptages, pas une décision d’un organisme de sélection.',
  'app.parentage.limits.labSaw':
    'Le laboratoire a vu les trois génotypes et les comptages, comme aujourd’hui. Les preuves les cachent à tous les autres, pas au laboratoire.',
  'app.parentage.limits.descent':
    'Être compatible avec la filiation n’est pas une preuve de filiation. Un animal proche parent du vrai parent, comme un plein frère du père, peut passer le contrôle.',
  'app.parentage.limits.which':
    'Les animaux analysés (par leurs codes de preuve), le panel et la méthode figurent dans le fichier de résultat du laboratoire, pas dans la preuve. La preuve porte sur le résultat, pas sur l’enregistrement propre de l’animal.',
  'app.parentage.limits.sample':
    'Un résultat dit ce qu’ont montré les échantillons envoyés sous ces enregistrements. Il ne montre pas que l’animal devant vous est celui qui a été prélevé.',
  'app.parentage.limits.trioMin':
    'Le formulaire n’a pas de nombre pour les SNP lus pour chaque animal (le minimum de l’ICAR est 185) ni pour ceux lus chez les trois, descendant, père et mère (le minimum de l’ICAR pour le trio est 165). Appliquer ces minimums revient au laboratoire, et aucune preuve ne les montre.',
  'app.parentage.limits.society':
    'Ce n’est pas un certificat d’un organisme de sélection. VeilCore n’a rien analysé et ne se porte garant d’aucun laboratoire.',
  'app.parentage.unmet.trioParents':
    'L’ICAR ne classe le trio qu’une fois les deux parents acceptés : aucune preuve sur le trio n’est donc proposée.',
  'app.parentage.unmet.grade.sireConflicts':
    'Le laboratoire n’a pas classé le père comme accepté : aucune preuve sur le père n’est donc proposée.',
  'app.parentage.unmet.grade.damConflicts':
    'Le laboratoire n’a pas classé la mère comme acceptée : aucune preuve sur la mère n’est donc proposée.',
  'app.parentage.unmet.grade.trioConflicts':
    'Le laboratoire n’a pas classé le trio comme accepté : aucune preuve sur le trio n’est donc proposée.',
} satisfies Partial<AppTranslation>;
