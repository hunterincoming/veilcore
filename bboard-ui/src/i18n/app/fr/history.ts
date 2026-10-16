// French (vous). DRAFT: machine-assisted, to be checked by a fluent speaker before publishing
// (docs/translations/README.md). Terms as in ../../fr.ts.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const history = {
  'app.history.label': 'Historique de sélection (brouillon)',
  'app.history.intro':
    'Cette plante et les parents qui lui sont liés et que vous détenez ici, une ligne par enregistrement, avec l’horodatage et le dossier de preuve de chacun. Un brouillon à recopier pour une demande de variété. Pas un conseil juridique.',
  'app.history.notEarlier':
    'Un enregistrement ne date rien d’antérieur au jour où il a été scellé. Chaque étape scellée au moment où elle a eu lieu porte sa propre date ; un historique rédigé la semaine de la demande vaut ce que vaut tout historique rédigé.',
  'app.history.oneFile':
    'Un seul fichier avec un historique de sélection imprimable (la lignée, puis une ligne par enregistrement : la date que vous avez indiquée, son horodatage, l’étape et ce que vous avez sélectionné, comment il a été obtenu), présenté sous des titres simples pour une demande PVP aux États-Unis, un questionnaire de type UPOV et une demande japonaise. Les cases pour ce que VeilCore n’a pas (homogénéité, stabilité, variants) sont laissées vides pour vous. Une note de couverture d’une page dit ce qu’il montre et ce qu’il ne montre pas, et le dossier de preuve de chaque enregistrement est inclus.',
  'app.history.held.one': '{count} enregistrement que vous détenez ici',
  'app.history.held.other': '{count} enregistrements que vous détenez ici',
  'app.history.theirs.one': ', {count} parent lié détenu par quelqu’un d’autre (indiqué comme le sien)',
  'app.history.theirs.other': ', {count} parents liés détenus par quelqu’un d’autre (indiqués comme les siens)',
  'app.history.named.one': ', {count} parent nommé sans enregistrement',
  'app.history.named.other': ', {count} parents nommés sans enregistrement',
  'app.history.leftOut.one': ', {count} enregistrement laissé de côté (seuls les {max} plus proches sont pris)',
  'app.history.leftOut.other': ', {count} enregistrements laissés de côté (seuls les {max} plus proches sont pris)',
  'app.history.end': '.',
  'app.history.notPut':
    'Les clés de vos enregistrements et les fichiers de rapports de laboratoire n’y sont pas mis. Quand un rapport de laboratoire est enregistré sur une plante, son dossier de preuve contient bien le SHA-256 du rapport et l’empreinte qui l’associe à la plante, pour que quiconque à qui l’on montre plus tard le fichier puisse le comparer. VeilCore ne se porte garant de rien de ce que dit un enregistrement. Brouillon. Pas un conseil juridique.',
  'app.history.downloaded':
    '{name} téléchargé. Ouvrez d’abord le COVER-NOTE.html qu’il contient, puis breeding-history.html pour imprimer.',
  'app.history.locked.one': ', {count} enregistrement verrouillé laissé de côté (ce navigateur n’a pas sa clé)',
  'app.history.locked.other': ', {count} enregistrements verrouillés laissés de côté (ce navigateur n’a pas leur clé)',
} satisfies Partial<AppTranslation>;
