// French (vous): the pack for the authority. DRAFT: machine-assisted, to be checked by a fluent
// speaker before publishing (docs/translations/README.md). Terms as in ../../fr.ts.
// One of ours is always an "enregistrement VeilCore" or has an "ID VeilCore"; "registre" and
// "inscription" are only the national variety register's.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const pack = {
  'app.pack.home': 'Dossier pour REPROCANN / SEDRONAR',
  'app.pack.more': 'Dossier pour une autorité',
  'app.pack.title': 'Dossier pour REPROCANN / SEDRONAR',
  'app.pack.intro':
    'Pour une association de cannabis médical en Argentine. Il rassemble ce que vos enregistrements VeilCore montrent sur une période, comme pièces justificatives pour la déclaration semestrielle et le registre de production, indique ce qui manque et donne le lien de vérification de chaque enregistrement VeilCore. Vous le relisez, le signez et l’envoyez vous-même.',
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
  'app.pack.form.countsHelp':
    'Saisissez les chiffres que vous déclarez. Les sommes ci-dessous ne sont qu’un repère : une somme de lots de culture scellés n’est pas un inventaire.',
  'app.pack.form.sumsPlants':
    'Vos lots de culture datés sur cette période totalisent {plants} plantes (lots avec ce comptage : {counted} sur {batches}).',
  'app.pack.form.sumsFlower':
    'Ils totalisent {inFlower} plantes en floraison (lots avec ce comptage : {counted} sur {batches}).',
  'app.pack.form.sumsNone': 'Aucun lot de culture daté sur cette période n’a de comptage de plantes scellé.',
  'app.pack.form.plants': 'Nombre total de plantes',
  'app.pack.form.inFlower': 'Plantes en floraison',
  'app.pack.form.patients': 'Nombre de patients rattachés',
  'app.pack.form.patientsHelp':
    'Un nombre seulement, jamais de noms. Il sert à établir ce dossier et à rien d’autre : il n’est pas enregistré et n’est envoyé ni à VeilCore ni à personne.',
  'app.pack.form.badNumber': 'Saisissez un nombre entier, ou laissez vide.',
  'app.pack.form.lang': 'Langue du dossier',
  'app.pack.form.make': 'Établir le dossier',
  'app.pack.form.making': 'Recherche de la date de chaque enregistrement VeilCore…',
  'app.pack.form.print': 'Imprimer ou enregistrer en PDF',
  'app.pack.form.printHelp': 'Dans la fenêtre d’impression, choisissez « Enregistrer au format PDF » et le papier A4.',
  'app.pack.form.linksWarn':
    'Chaque lien de vérification du dossier porte, après le #, les données scellées de cet enregistrement VeilCore : quiconque l’ouvre les voit : {list}.',
  'app.pack.form.linksLocal':
    'Certains sont conservés sur cet appareil uniquement. En envoyant le dossier, leurs données en sortent.',
  'app.pack.form.none': 'Aucun lot de culture ni lot de récolte n’est daté sur cette période dans ce navigateur.',
  'app.pack.form.failed': 'Le dossier n’a pas pu être établi : {reason}',
  'app.pack.doc.title': 'Pièces justificatives pour le rapport semestriel et le registre de production',
  'app.pack.doc.sub': 'Établies à partir des enregistrements VeilCore de l’association.',
  'app.pack.doc.notFormShort': 'Ce n’est pas un formulaire officiel.',
  'app.pack.doc.rules':
    'Pour la déclaration semestrielle sous serment et le rapport chromatographique par lot (art. 4 ter, al. f, de la Rés. MS 800/2021, introduit par la Rés. MS 1780/2025), et pour le registre de production du plan de culture (même article, al. h).',
  'app.pack.doc.association': 'Association : {name}',
  'app.pack.doc.preparedBy': 'Préparé par : {name}',
  'app.pack.doc.period': 'Période : du {from} au {to}',
  'app.pack.doc.made': 'Établi le {at} à partir de {records} de ce navigateur.',
  'app.pack.doc.records.one': 'un enregistrement VeilCore',
  'app.pack.doc.records.other': '{count} enregistrements VeilCore',
  'app.pack.doc.pageOf': 'page {page} sur {pages}',
  'app.pack.doc.gapsTitle': 'Avant l’envoi : ce qui manque',
  'app.pack.doc.gapsNone': 'Rien ne manque, d’après ces enregistrements VeilCore.',
  'app.pack.doc.variety': '1. Variété génétique inscrite utilisée',
  'app.pack.doc.varietyHelp':
    'Les plantes ou souches que nomment les lots de culture. Le numéro d’inscription est celui que le détenteur a saisi et scellé dans l’enregistrement VeilCore ; personne ne l’a comparé au registre officiel.',
  'app.pack.doc.col.variety': 'Variété',
  'app.pack.doc.col.registration': 'Numéro d’inscription de la variété',
  'app.pack.doc.col.record': 'ID VeilCore',
  'app.pack.doc.regNone': 'Aucun numéro indiqué dans VeilCore',
  'app.pack.doc.varietyNone':
    'Les lots de culture de ces enregistrements VeilCore ne nomment aucun enregistrement VeilCore d’origine.',
  'app.pack.doc.sourceMissing': '{name} (ID VeilCore {id}) : nommé par un lot de culture, absent de ce navigateur.',
  'app.pack.doc.plants': '2. Plantes',
  'app.pack.doc.plantsTotal': 'Nombre total de plantes',
  'app.pack.doc.plantsFlower': 'Plantes en floraison',
  'app.pack.doc.notGiven': 'Non indiqué',
  'app.pack.doc.typed':
    'Tel que déclaré par le responsable en établissant ce dossier. Pas tiré d’un enregistrement VeilCore scellé.',
  'app.pack.doc.sums':
    'À titre indicatif seulement : les lots de culture scellés sur la période totalisent {plants} plantes et {inFlower} en floraison. Une somme de lots scellés n’est pas un inventaire.',
  'app.pack.doc.patients': '3. Patients rattachés',
  'app.pack.doc.patientsNote':
    'Un nombre seulement, saisi par le responsable en établissant ce dossier. Il ne figure dans aucun enregistrement VeilCore et n’a pas été envoyé à VeilCore.',
  'app.pack.doc.production': '4. Registre de production',
  'app.pack.doc.productionHelp':
    'Chaque étape est un enregistrement VeilCore scellé par l’association, qui nomme le précédent. Ce lien est la déclaration du détenteur lui-même : personne ne le compare à l’enregistrement VeilCore qu’il nomme.',
  'app.pack.doc.col.step': 'Étape',
  'app.pack.doc.col.name': 'Nom et ID VeilCore',
  'app.pack.doc.col.date': 'Date',
  'app.pack.doc.col.figures': 'Chiffres (tels que scellés)',
  'app.pack.doc.col.about': 'Concerne',
  'app.pack.doc.outside': 'Daté avant cette période : un lot de récolte de la période le concerne.',
  'app.pack.doc.batchFigures': '{plants} plantes, {inFlower} en floraison',
  'app.pack.doc.batchNoFigures': 'Aucun comptage scellé',
  'app.pack.doc.lotFigures': '{plants} plantes récoltées',
  'app.pack.doc.chromatography': '5. Rapport chromatographique par lot de récolte',
  'app.pack.doc.chromatographyHelp':
    'Un rapport de laboratoire ou un certificat d’analyse scellé comme enregistrement VeilCore concernant le lot. Ses chiffres ne sont montrés que si la signature d’un laboratoire sur eux est vérifiée et que le laboratoire est identifié.',
  'app.pack.doc.lot': 'Lot {lot}',
  'app.pack.doc.labSigned': 'Résultat signé par un laboratoire. {signer}',
  'app.pack.doc.document':
    'Document scellé : « {title} ». Le rapport est le fichier du laboratoire ; ce qu’il dit est dans ce fichier, pas dans ce dossier.',
  'app.pack.doc.labUnnamed':
    'Une signature de laboratoire l’accompagne, mais aucun laboratoire n’est identifié derrière elle ici : ses chiffres ne sont donc pas montrés.',
  'app.pack.doc.missing':
    'Manquant : aucun rapport chromatographique concernant ce lot dans ces enregistrements VeilCore.',
  'app.pack.doc.proofs': '6. Codes de preuve, liens de vérification et dates',
  'app.pack.doc.proofsHelp':
    'Chacun peut ouvrir chaque lien de vérification gratuitement et sans compte. Un enregistrement VeilCore montre que celui qui l’a scellé détenait déjà son fichier et ses données à sa date. Il ne montre pas que ce qu’il dit est vrai.',
  'app.pack.doc.recordId': 'ID VeilCore {id}',
  'app.pack.doc.proofCode': 'Code de preuve',
  'app.pack.doc.checkLink': 'Lien de vérification',
  'app.pack.doc.onPaper':
    'Sur papier : ouvrez {site}/verify et saisissez l’ID VeilCore {id} et le code de preuve ci-dessus.',
  'app.pack.doc.noLink': 'Pas de lien de vérification : cet enregistrement VeilCore n’est pas encore scellé.',
  'app.pack.doc.local': 'Conservé sur l’appareil de l’association uniquement.',
  'app.pack.doc.dateRests': 'Sur quoi repose la date',
  'app.pack.role.source': 'Origine',
  'app.pack.role.grow-batch': 'Lot de culture',
  'app.pack.role.harvest-lot': 'Lot de récolte',
  'app.pack.role.report': 'Rapport de laboratoire',
  'app.pack.doc.notForm':
    'Nous ne connaissons aucun formulaire officiel publié pour cette déclaration. VeilCore ne dépose rien pour l’association. L’association relit ce dossier, le signe et l’envoie elle-même.',
  'app.pack.doc.handover':
    'Établi uniquement à partir des enregistrements VeilCore de ce navigateur. Les enregistrements VeilCore scellés sur l’appareil d’un autre responsable n’y figurent qu’une fois restaurés ici depuis la sauvegarde de cette personne.',
  'app.pack.doc.signSign': 'Signature',
  'app.pack.doc.signName': 'Nom en capitales',
  'app.pack.doc.signRole': 'Qualité (représentant légal / responsable technique)',
  'app.pack.doc.signDate': 'Date',
  'app.pack.date.unsealed': 'Non scellé : rien ne le date.',
  'app.pack.date.none': 'Pas encore daté sur aucun réseau.',
  'app.pack.date.pending': 'Dans un lot du registre, pas encore daté sur aucun réseau.',
  'app.pack.date.test': ' Un réseau de test : données d’exercice, pas une vraie date.',
  'app.pack.date.checked':
    'Sur {where} : vérifié par ce navigateur à l’établissement du dossier. La racine du lot figure dans la transaction {tx}, bloc {block}, {at}.{test}',
  'app.pack.date.failed':
    'Sur {where} : non confirmé. Ce navigateur a recherché la transaction et elle ne correspond pas à ce qu’indique le registre de VeilCore. Ne vous fiez pas à cette date ; le lien de vérification montre pourquoi.',
  'app.pack.date.reported':
    'Sur {where} : {date}, selon le registre de VeilCore. Non vérifié par ce navigateur ; le lien de vérification le recherche.{test}',
  'app.pack.date.noTime': 'heure non indiquée',
  'app.pack.date.bitcoin':
    'Bitcoin : le registre de VeilCore indique la racine du lot dans le bloc Bitcoin {block} ({at}). Vérifiez-le avec le fichier OpenTimestamps du lot.',
  'app.pack.date.bitcoinPending': 'Bitcoin : horodatage en attente, pas encore dans un bloc Bitcoin.',
  'app.pack.date.tsa':
    'RFC 3161 : la racine du lot porte un horodatage de {tsa}, à {at} selon le jeton. Le jeton a été vérifié contre la racine du lot dans ce navigateur ; la preuve d’inclusion de cet enregistrement VeilCore le relie à cette racine.',
  'app.pack.date.tsaUnnamed': 'une autorité d’horodatage',
  'app.pack.date.tsaQualified':
    'Le registre de VeilCore indique que cette autorité est qualifiée selon {scheme}. Vérifiez vous-même la liste de confiance avant de vous y fier.',
  'app.pack.gap.chromatography': 'Lot {lot} : aucun rapport chromatographique.',
  'app.pack.gap.registration': '{name} : aucun numéro d’inscription de la variété n’a été indiqué.',
  'app.pack.gap.source': '{name} : nommé par un lot de culture, mais absent de ce navigateur.',
  'app.pack.gap.noBatches': 'Aucun lot de culture n’est daté sur cette période.',
  'app.pack.gap.noLots': 'Aucun lot de récolte n’est daté sur cette période.',
  'app.pack.gap.plants': 'Nombre total de plantes : non indiqué.',
  'app.pack.gap.inFlower': 'Plantes en floraison : non indiqué.',
  'app.pack.gap.plantsPartial.one': 'Un lot de culture de la période n’a aucun comptage de plantes scellé.',
  'app.pack.gap.plantsPartial.other': '{count} lots de culture de la période n’ont aucun comptage de plantes scellé.',
  'app.pack.gap.inFlowerPartial.one':
    'Un lot de culture de la période n’a aucun comptage scellé des plantes en floraison.',
  'app.pack.gap.inFlowerPartial.other':
    '{count} lots de culture de la période n’ont aucun comptage scellé des plantes en floraison.',
  'app.pack.gap.patients': 'Nombre de patients rattachés : non indiqué.',
  'app.pack.gap.undated.one': 'Un enregistrement VeilCore n’est encore daté sur aucun réseau.',
  'app.pack.gap.undated.other': '{count} enregistrements VeilCore ne sont encore datés sur aucun réseau.',
  'app.pack.gap.unchecked.one':
    'Une date est celle que donne le registre de VeilCore, non vérifiée sur le réseau principal de Midnight par ce navigateur.',
  'app.pack.gap.unchecked.other':
    '{count} dates sont celles que donne le registre de VeilCore, non vérifiées sur le réseau principal de Midnight par ce navigateur.',
  'app.pack.gap.testing.one':
    'Un enregistrement VeilCore a été daté avec le smart contract de VeilCore, version 2, réservé aux tests de VeilCore et non destiné aux enregistrements : on ne peut pas se fier à cette date.',
  'app.pack.gap.testing.other':
    '{count} enregistrements VeilCore ont été datés avec le smart contract de VeilCore, version 2, réservé aux tests de VeilCore et non destiné aux enregistrements : on ne peut pas se fier à ces dates.',
  'app.pack.gap.locked.one':
    'Un enregistrement VeilCore de ce navigateur est verrouillé (scellé avec une clé qu’il n’a pas) et est laissé de côté.',
  'app.pack.gap.locked.other':
    '{count} enregistrements VeilCore de ce navigateur sont verrouillés (scellés avec une clé qu’il n’a pas) et sont laissés de côté.',
} satisfies Partial<AppTranslation>;
