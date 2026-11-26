// L’app des enregistrements en français (vous) : preuves sur deux enregistrements du même détenteur
// (../en/two-records.ts). BROUILLON : assisté par machine, à relire par un locuteur natif avant
// publication (docs/translations/README.md).
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const twoRecords = {
  'app.tworec.more.title': 'Autres façons de prouver',
  'app.tworec.more.text':
    'Comparez les chiffres scellés dans cet enregistrement avec un autre de vos enregistrements, sans montrer les chiffres.',
  'app.tworec.more.distinct': 'Montrer que ces deux enregistrements sont différents',
  'app.tworec.more.unchanged': 'Montrer qu’une correction n’a changé que ce qu’elle indique',

  'app.tworec.status.notYet': 'Construit, pas encore utilisé sur le réseau principal de Midnight.',
  'app.tworec.status.ran': 'Cela a été utilisé sur le réseau principal de Midnight.',
  'app.tworec.unpaid':
    'Cela ne peut pas encore être envoyé depuis ce site : le service de frais de VeilCore ne paie pas encore ces deux preuves. Vous pouvez voir ce qui serait prouvé. Rien n’est envoyé.',
  'app.tworec.what': 'Ce qu’il faut prouver',
  'app.tworec.this': 'Cet enregistrement',
  'app.tworec.other': 'L’autre enregistrement',
  'app.tworec.original': 'L’enregistrement antérieur que celui-ci corrige',
  'app.tworec.none':
    'Vous n’avez pas d’autre enregistrement avec des chiffres selon le formulaire « {schema} ». Scellez-en d’abord un autre.',
  'app.tworec.distinct.text':
    'Cela prouve que les deux enregistrements diffèrent sur au moins {k} des chiffres que leur formulaire compare. Cela ne montre jamais quels chiffres diffèrent, de combien, ni combien. Ce nombre est fixé par le formulaire ; vous ne pouvez pas le choisir.',
  'app.tworec.unchanged.text':
    'Cochez les chiffres que la correction pouvait changer. Cela prouve que tous les autres chiffres sont identiques dans les deux enregistrements. La liste cochée est publique, pas les chiffres.',
  'app.tworec.unchanged.list': 'Pouvait changer',
  'app.tworec.unchanged.carries':
    'Déjà public sur l’enregistrement antérieur : {list}. Prouver ceci rend chacun de ces faits vrai pour cet enregistrement aussi, car ces chiffres ne sont pas cochés.',
  'app.tworec.unchanged.changed': '{label} (changé)',
  'app.tworec.preview.distinct':
    'Cela prouve : ces deux enregistrements diffèrent sur au moins {k} des chiffres que leur formulaire compare.',
  'app.tworec.preview.unchanged':
    'Cela prouve : hormis {list}, chaque chiffre de cet enregistrement est le même que dans l’enregistrement antérieur.',
  'app.tworec.preview.unchangedNone':
    'Cela prouve : chaque chiffre de cet enregistrement est le même que dans l’enregistrement antérieur.',
  'app.tworec.refuse.noNumbers': 'L’un de ces enregistrements n’a pas de chiffres scellés.',
  'app.tworec.refuse.notOffered':
    'Ce type d’enregistrement ne peut pas être comparé ainsi. Cela fonctionne pour les chiffres que vous avez saisis vous-même, selon ces formulaires : {forms}.',
  'app.tworec.refuse.sameRecord': 'C’est le même enregistrement. Choisissez-en un autre.',
  'app.tworec.refuse.otherForm':
    'Les deux enregistrements utilisent des formulaires différents : leurs chiffres ne peuvent pas être comparés.',
  'app.tworec.refuse.tooFew':
    'Ces deux enregistrements diffèrent sur {n} des chiffres comparés et il en faut au moins {k} : cela ne peut pas être prouvé. Rien n’a été envoyé.',
  'app.tworec.refuse.undeclared':
    '{list} a changé mais n’est pas coché. Cochez-le, sinon cela ne peut pas être prouvé. Rien n’a été envoyé.',
  'app.tworec.refuse.saysNothing': 'Avec tous les chiffres cochés, cela ne dit rien. Laissez-en au moins un non coché.',
  'app.tworec.err.unpaid': 'Le service de frais de VeilCore ne paie pas encore cette preuve : rien n’a été envoyé.',
  'app.tworec.err.deviceOnly':
    'Un enregistrement conservé seulement sur cet appareil ne peut pas être comparé ainsi. Rien n’a été envoyé.',
  'app.tworec.err.tooFew':
    'Ces deux enregistrements ne diffèrent pas sur assez de chiffres comparés : cela ne peut pas être prouvé. Rien n’a été envoyé.',
  'app.tworec.err.undeclared':
    'Un chiffre absent de votre liste a changé : cela ne peut pas être prouvé. Rien n’a été envoyé.',
  'app.tworec.err.otherRecords': 'Cette preuve porte sur d’autres enregistrements.',
  'app.tworec.err.otherList': 'Cette preuve permettait à d’autres chiffres de changer.',
  'app.tworec.err.listSaysNothing': 'Cette preuve permet à tous les chiffres de changer : elle ne dit rien.',
  'app.tworec.err.notTwo':
    'Cette transaction n’est pas une seule preuve sur deux enregistrements sur le contrat des preuves de VeilCore.',
  'app.tworec.tie':
    'Les codes des deux enregistrements vont sur Midnight, où VeilCore, et toute personne ayant le lien de vérification de l’un d’eux, peut rattacher cette preuve à eux. VeilCore peut aussi la rattacher aux clés de détenteur qui les ont datés.',
  'app.tworec.made': 'Ce que vous avez prouvé sur deux enregistrements',
  'app.tworec.line.distinct': '{a} et {b} diffèrent sur au moins {k} des chiffres que leur formulaire compare',
  'app.tworec.line.unchanged': '{b} a les mêmes chiffres que {a}, hormis {list}',
  'app.tworec.line.unchangedNone': '{b} a les mêmes chiffres que {a}',

  'app.tworec.not.title': 'Ce que cela ne montre pas',
  'app.tworec.not.examine':
    'C’est un comptage, pas une décision. C’est à qui les examine, par exemple un office d’examen, de décider si deux variétés ou lots sont distincts. Ceci ne remplace pas cet examen.',
  'app.tworec.not.which': 'Cela ne montre pas quels chiffres diffèrent, de combien, ni combien.',
  'app.tworec.not.typed': 'Cela ne montre pas qu’un laboratoire a mesuré ou signé les chiffres.',
  'app.tworec.not.reference':
    'Le détenteur a choisi l’autre enregistrement. Pour une comparaison loyale, quelqu’un d’autre que le détenteur devrait indiquer avec quel enregistrement comparer.',
  'app.tworec.not.oneParty':
    'Le détenteur détient les deux enregistrements. Cela ne permet pas à deux personnes de comparer des chiffres qu’aucune ne veut montrer à l’autre.',
  'app.tworec.not.correction':
    'Cela ne montre pas quel enregistrement est la correction, ni que l’un a remplacé l’autre.',
  'app.tworec.not.ticked': 'Un chiffre de la liste a pu changer ou non.',
  'app.tworec.not.onlyNumbers':
    'Cela porte seulement sur les chiffres scellés, pas sur les autres informations ou fichiers des enregistrements.',
  'app.tworec.not.sealed':
    'Cela porte sur les deux enregistrements tels qu’ils ont été scellés, pas sur le fait que l’un d’eux soit toujours à jour.',

  'app.tworec.check.title': 'Vérifier une preuve sur deux enregistrements',
  'app.tworec.check.intro':
    'Quelqu’un vous a envoyé ce lien pour montrer un fait sur les chiffres de deux de ses enregistrements scellés, sans montrer les chiffres. Cette page lit la preuve sur Midnight et la vérifie.',
  'app.tworec.check.distinct':
    'Ces deux enregistrements, tels que scellés, diffèrent sur au moins {k} des chiffres que leur formulaire compare.',
  'app.tworec.check.unchanged': 'Hormis {list}, le second enregistrement a les mêmes chiffres que le premier.',
  'app.tworec.check.unchangedNone': 'Le second enregistrement a les mêmes chiffres que le premier.',
  'app.tworec.check.first': 'Le premier enregistrement',
  'app.tworec.check.second': 'Le second enregistrement',
  'app.tworec.check.earlier': 'L’enregistrement antérieur (selon le détenteur)',
  'app.tworec.check.correction': 'La correction (selon le détenteur)',
} satisfies Partial<AppTranslation>;
