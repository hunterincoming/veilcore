// French (vous): the pack for the authority. DRAFT: machine-assisted, to be checked by a fluent
// speaker before publishing (docs/translations/README.md). Terms as in ../../fr.ts.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const pack = {
  'app.pack.home': 'Dossier pour REPROCANN / SEDRONAR',
  'app.pack.homeText':
    'Pour une association en Argentine : les chiffres semestriels et le registre de production, à partir de vos enregistrements.',
  'app.pack.title': 'Dossier pour REPROCANN / SEDRONAR',
  'app.pack.intro':
    'Pour une association de cannabis médical en Argentine. Il rassemble ce que vos enregistrements montrent sur une période, pour la déclaration semestrielle et le registre de production, indique ce qui manque et donne le lien de vérification de chaque enregistrement. Vous le relisez, le signez et l’envoyez vous-même.',
  'app.pack.form.period': 'Période',
  'app.pack.form.periodSix': 'Six derniers mois',
  'app.pack.form.periodPermit': 'Année du permis',
  'app.pack.form.periodOther': 'Autres dates',
  'app.pack.form.permitStart': 'Date de début du permis',
  'app.pack.form.from': 'Du',
  'app.pack.form.to': 'Au',
  'app.pack.form.badPeriod': 'Choisissez une date de début antérieure ou égale à la date de fin.',
  'app.pack.form.association': 'Nom de l’association (imprimé sur le dossier)',
  'app.pack.form.preparedBy': 'Préparé par (imprimé sur le dossier)',
  'app.pack.form.countsTitle': 'Plantes',
  'app.pack.form.countsFromBatches':
    'Vos lots de culture datés sur cette période totalisent {plants} plantes, dont {inFlower} en floraison ({batches}). Laissez les cases vides pour utiliser ces chiffres, ou saisissez les chiffres à déclarer.',
  'app.pack.form.countsNone':
    'Aucun lot de culture avec un comptage de plantes n’est daté sur cette période. Saisissez les chiffres à déclarer, ou laissez-les vides et le dossier indiquera qu’ils manquent.',
  'app.pack.form.batches.one': 'un lot',
  'app.pack.form.batches.other': '{count} lots',
  'app.pack.form.plants': 'Nombre total de plantes',
  'app.pack.form.inFlower': 'Plantes en floraison',
  'app.pack.form.patients': 'Nombre de patients rattachés',
  'app.pack.form.patientsHelp':
    'Un nombre seulement, jamais de noms. Il sert à établir ce dossier et à rien d’autre : il n’est pas enregistré et n’est envoyé ni à VeilCore ni à personne.',
  'app.pack.form.badNumber': 'Saisissez un nombre entier, ou laissez vide.',
  'app.pack.form.lang': 'Langue du dossier',
  'app.pack.form.make': 'Établir le dossier',
  'app.pack.form.making': 'Recherche de la date de chaque enregistrement…',
  'app.pack.form.print': 'Imprimer ou enregistrer en PDF',
  'app.pack.form.printHelp': 'Dans la fenêtre d’impression, choisissez « Enregistrer au format PDF » et le papier A4.',
  'app.pack.form.linksWarn':
    'Chaque lien de vérification du dossier porte, après le #, les données scellées de cet enregistrement : quiconque l’ouvre les voit : {list}.',
  'app.pack.form.linksLocal':
    'Certains sont conservés sur cet appareil uniquement. En envoyant le dossier, leurs données en sortent.',
  'app.pack.form.none': 'Aucun lot de culture ni lot de récolte n’est daté sur cette période dans ce navigateur.',
  'app.pack.form.failed': 'Le dossier n’a pas pu être établi : {reason}',
  'app.pack.doc.title': 'Rapport semestriel et registre de production',
  'app.pack.doc.sub': 'Pièces justificatives tirées des enregistrements de l’association dans VeilCore',
  'app.pack.doc.rules':
    'Pour la déclaration semestrielle sous serment et le rapport chromatographique par lot (Rés. MS 1780/2025, art. 4 ter, al. f), et pour le registre de production du plan de culture (al. h).',
  'app.pack.doc.association': 'Association : {name}',
  'app.pack.doc.preparedBy': 'Préparé par : {name}',
  'app.pack.doc.period': 'Période : du {from} au {to}',
  'app.pack.doc.made': 'Établi le {at} à partir de {records} dans ce navigateur.',
  'app.pack.doc.records.one': 'un enregistrement',
  'app.pack.doc.records.other': '{count} enregistrements',
  'app.pack.doc.gapsTitle': 'Avant l’envoi : ce qui manque',
  'app.pack.doc.gapsNone': 'Rien ne manque, d’après ces enregistrements.',
  'app.pack.doc.variety': '1. Variété génétique inscrite utilisée',
  'app.pack.doc.varietyHelp':
    'Les plantes ou souches que nomment les lots de culture. Le numéro d’inscription est celui que le titulaire a scellé dans l’enregistrement.',
  'app.pack.doc.col.variety': 'Variété',
  'app.pack.doc.col.registration': 'Numéro d’inscription',
  'app.pack.doc.col.record': 'Enregistrement',
  'app.pack.doc.regNone': 'Absent de l’enregistrement',
  'app.pack.doc.varietyNone': 'Les lots de culture de ces enregistrements ne nomment aucun enregistrement d’origine.',
  'app.pack.doc.sourceMissing': '{name} (enregistrement {id}) : nommé par un lot de culture, absent de ce navigateur.',
  'app.pack.doc.plants': '2. Plantes',
  'app.pack.doc.plantsTotal': 'Nombre total de plantes',
  'app.pack.doc.plantsFlower': 'Plantes en floraison',
  'app.pack.doc.notGiven': 'Non indiqué',
  'app.pack.doc.fromBatches.one':
    'La somme du seul lot de culture daté sur la période, compté à sa date et scellé avec lui.',
  'app.pack.doc.fromBatches.other':
    'La somme des {count} lots de culture datés sur la période, chacun compté à sa date et scellé avec lui.',
  'app.pack.doc.typed': 'Saisi par le responsable en établissant ce dossier. Pas tiré d’un enregistrement scellé.',
  'app.pack.doc.countsNone':
    'Aucun comptage de plantes n’est scellé dans les lots de culture de cette période, et aucun n’a été saisi.',
  'app.pack.doc.patients': '3. Patients rattachés',
  'app.pack.doc.patientsNote':
    'Un nombre seulement, saisi par le responsable en établissant ce dossier. Il ne figure dans aucun enregistrement et n’a pas été envoyé à VeilCore.',
  'app.pack.doc.production': '4. Registre de production',
  'app.pack.doc.productionHelp':
    'Chaque étape est un enregistrement scellé par l’association, qui nomme le précédent. Ce lien est la déclaration du titulaire lui-même : personne ne le compare à l’enregistrement qu’il nomme.',
  'app.pack.doc.col.step': 'Étape',
  'app.pack.doc.col.name': 'Nom et ID',
  'app.pack.doc.col.date': 'Date',
  'app.pack.doc.col.figures': 'Chiffres (tels que scellés)',
  'app.pack.doc.col.about': 'Concerne',
  'app.pack.doc.outside': 'Daté avant cette période : un lot de récolte de la période le concerne.',
  'app.pack.doc.batchFigures': '{plants} plantes, {inFlower} en floraison',
  'app.pack.doc.batchNoFigures': 'Aucun comptage scellé',
  'app.pack.doc.lotFigures': '{plants} plantes récoltées',
  'app.pack.doc.chromatography': '5. Rapport chromatographique par lot de récolte',
  'app.pack.doc.chromatographyHelp':
    'Un rapport de laboratoire ou un certificat d’analyse scellé comme enregistrement concernant le lot. Ses chiffres ne sont montrés que si la signature d’un laboratoire sur eux est vérifiée et que le laboratoire est identifié.',
  'app.pack.doc.lot': 'Lot {lot}',
  'app.pack.doc.labSigned': 'Résultat signé par un laboratoire. {signer}',
  'app.pack.doc.document':
    'Document scellé : « {title} ». Le rapport est le fichier du laboratoire ; ce qu’il dit est dans ce fichier, pas dans ce dossier.',
  'app.pack.doc.labUnnamed':
    'Une signature de laboratoire l’accompagne, mais aucun laboratoire n’est identifié derrière elle ici : ses chiffres ne sont donc pas montrés.',
  'app.pack.doc.missing': 'Manquant : aucun rapport chromatographique concernant ce lot dans ces enregistrements.',
  'app.pack.doc.proofs': '6. Codes de preuve, liens de vérification et dates',
  'app.pack.doc.proofsHelp':
    'Chacun peut ouvrir chaque lien de vérification gratuitement et sans compte. Un enregistrement montre la détention antérieure de son fichier et de ses données à sa date. Il ne montre pas que ce qu’il dit est vrai.',
  'app.pack.doc.recordId': 'Enregistrement {id}',
  'app.pack.doc.proofCode': 'Code de preuve',
  'app.pack.doc.checkLink': 'Lien de vérification',
  'app.pack.doc.noLink': 'Pas de lien de vérification : cet enregistrement n’est pas encore scellé.',
  'app.pack.doc.local': 'Conservé sur l’appareil de l’association uniquement.',
  'app.pack.doc.dateRests': 'Sur quoi repose la date',
  'app.pack.role.source': 'Origine',
  'app.pack.role.grow-batch': 'Lot de culture',
  'app.pack.role.harvest-lot': 'Lot de récolte',
  'app.pack.role.report': 'Rapport de laboratoire',
  'app.pack.doc.notForm':
    'Ceci n’est pas un formulaire officiel : aucun n’a été publié pour cette déclaration. VeilCore ne dépose rien pour l’association. L’association relit ce dossier, le signe et l’envoie elle-même.',
  'app.pack.doc.handover':
    'Établi uniquement à partir des enregistrements de ce navigateur. Les enregistrements scellés sur l’appareil d’un autre responsable n’y figurent qu’une fois restaurés ici depuis la sauvegarde de cette personne.',
  'app.pack.doc.sign': 'Signature du responsable technique',
  'app.pack.doc.signName': 'Nom',
  'app.pack.doc.signDate': 'Date',
  'app.pack.date.unsealed': 'Non scellé : rien ne le date.',
  'app.pack.date.none': 'Pas encore daté sur aucun réseau.',
  'app.pack.date.pending': 'Dans un lot du registre, pas encore daté sur aucun réseau.',
  'app.pack.date.test': ' Un réseau de test : données d’exercice, pas une vraie date.',
  'app.pack.date.checked':
    'Sur {where} : vérifié par ce navigateur à l’établissement du dossier. La racine du lot figure dans la transaction {tx}, bloc {block}, {at}.{test}',
  'app.pack.date.failed': 'Sur {where} : non confirmé : {reason}. Ne vous fiez pas à la date que donne le registre.',
  'app.pack.date.reported':
    'Sur {where} : {date}, selon le registre de VeilCore. Non vérifié par ce navigateur ; le lien de vérification le recherche.{test}',
  'app.pack.date.noTime': 'heure non indiquée',
  'app.pack.date.bitcoin':
    'Bitcoin : le registre de VeilCore indique la racine du lot dans le bloc Bitcoin {block} ({at}). Vérifiez-le avec le fichier OpenTimestamps du lot.',
  'app.pack.date.bitcoinPending': 'Bitcoin : horodatage en attente, pas encore dans un bloc Bitcoin.',
  'app.pack.date.tsa':
    'RFC 3161 : la racine du lot porte un horodatage de {tsa}, à {at} selon le jeton. Le jeton a été vérifié contre la racine du lot dans ce navigateur ; la preuve d’inclusion de cet enregistrement le relie à cette racine.',
  'app.pack.date.tsaUnnamed': 'une autorité d’horodatage',
  'app.pack.date.tsaQualified':
    'Le registre de VeilCore indique que cette autorité est qualifiée selon {scheme}. Vérifiez vous-même la liste de confiance avant de vous y fier.',
  'app.pack.gap.chromatography': 'Lot {lot} : aucun rapport chromatographique.',
  'app.pack.gap.registration': '{name} : aucun numéro d’inscription de la variété dans l’enregistrement.',
  'app.pack.gap.source': '{name} : nommé par un lot de culture, mais absent de ce navigateur.',
  'app.pack.gap.noBatches': 'Aucun lot de culture n’est daté sur cette période.',
  'app.pack.gap.noLots': 'Aucun lot de récolte n’est daté sur cette période.',
  'app.pack.gap.counts': 'Nombre total de plantes ou plantes en floraison : non indiqué.',
  'app.pack.gap.countsPartial.one':
    'Un lot de culture de la période n’a aucun comptage de plantes scellé : les totaux l’omettent.',
  'app.pack.gap.countsPartial.other':
    '{count} lots de culture de la période n’ont aucun comptage de plantes scellé : les totaux les omettent.',
  'app.pack.gap.patients': 'Nombre de patients rattachés : non indiqué.',
  'app.pack.gap.undated.one': 'Un enregistrement n’est encore daté sur aucun réseau.',
  'app.pack.gap.undated.other': '{count} enregistrements ne sont encore datés sur aucun réseau.',
  'app.pack.gap.unchecked.one':
    'Une date est celle que donne le registre de VeilCore, non vérifiée sur le réseau principal de Midnight par ce navigateur.',
  'app.pack.gap.unchecked.other':
    '{count} dates sont celles que donne le registre de VeilCore, non vérifiées sur le réseau principal de Midnight par ce navigateur.',
  'app.pack.gap.locked.one':
    'Un enregistrement de ce navigateur est verrouillé (scellé avec une clé qu’il n’a pas) et est laissé de côté.',
  'app.pack.gap.locked.other':
    '{count} enregistrements de ce navigateur sont verrouillés (scellés avec une clé qu’il n’a pas) et sont laissés de côté.',
} satisfies Partial<AppTranslation>;
