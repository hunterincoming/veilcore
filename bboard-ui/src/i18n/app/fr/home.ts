// French (vous). DRAFT: machine-assisted, to be checked by a fluent speaker before publishing
// (docs/translations/README.md). Terms as in ../../fr.ts.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const home = {
  'app.home.firstPlant': 'Enregistrons votre première plante',
  'app.home.continueDraftNamed': 'Reprendre votre brouillon : {name}',
  'app.home.continueDraft': 'Reprendre votre brouillon',
  'app.home.draftKept':
    'Ce que vous avez saisi est conservé dans ce navigateur. Reprenez là où vous vous étiez arrêté.',
  'app.home.aboutThreeMinutes':
    'Environ 3 minutes. À la fin, elle a un horodatage public, et vous êtes seul à détenir la clé.',
  'app.home.continue': 'Reprendre',
  'app.home.start': 'Commencer',
  'app.home.spreadsheet': 'Vous avez un tableur ? Datez toute votre collection',
  'app.home.newPhone': 'Nouveau téléphone ? Récupérez vos plantes',
  'app.home.breederToo': 'Je suis aussi obtenteur',
  'app.home.imALab': 'Je suis un laboratoire',
  'app.home.whatStops': 'Qu’est-ce qui empêche quelqu’un d’enregistrer ma plante en premier ?',
  'app.home.samplesReceived': 'Échantillons reçus',
  'app.home.yourPlants': 'Vos plantes',
  'app.home.logNew': 'Enregistrer',
  'app.home.saveIt': 'L’enregistrer',
  'app.home.finishBackupLine': '<b>Pour finir : enregistrez votre copie de secours.</b> {line}',
  'app.home.keysOnlyHerePlants.one': '{count} plante a des clés uniquement sur cet appareil.',
  'app.home.keysOnlyHerePlants.other': '{count} plantes ont des clés uniquement sur cet appareil.',
  'app.home.keysOnlyHereRecords.one': '{count} enregistrement a des clés uniquement sur cet appareil.',
  'app.home.keysOnlyHereRecords.other': '{count} enregistrements ont des clés uniquement sur cet appareil.',
  'app.home.resetWarningPlants.one':
    '{count} plante a des clés sans copie de secours vérifiée. Enregistrez d’abord votre copie de secours : si vous videz le navigateur plus tard, elles seraient perdues pour de bon.',
  'app.home.resetWarningPlants.other':
    '{count} plantes ont des clés sans copie de secours vérifiée. Enregistrez d’abord votre copie de secours : si vous videz le navigateur plus tard, elles seraient perdues pour de bon.',
  'app.home.resetWarningRecords.one':
    '{count} enregistrement a des clés sans copie de secours vérifiée. Enregistrez d’abord votre copie de secours : si vous videz le navigateur plus tard, elles seraient perdues pour de bon.',
  'app.home.resetWarningRecords.other':
    '{count} enregistrements ont des clés sans copie de secours vérifiée. Enregistrez d’abord votre copie de secours : si vous videz le navigateur plus tard, elles seraient perdues pour de bon.',
  'app.home.resetConfirm':
    'Recommencer dans ce navigateur avec un nouvel ensemble vide ?\n\nRien n’est supprimé. Vos enregistrements actuels restent verrouillés dans le registre de VeilCore. Vous ne pouvez les récupérer qu’avec vos clés actuelles, qui vont être téléchargées maintenant dans un seul fichier. Gardez-le.',
  'app.home.startedOver':
    'Vous avez recommencé. Restaurez vos anciens enregistrements à tout moment depuis le fichier de la clé de détenteur.',
  'app.home.imported.one': '{count} enregistrement importé.',
  'app.home.imported.other': '{count} enregistrements importés.',
  'app.home.alreadyHere.one': ' {count} déjà présent a été laissé tel quel.',
  'app.home.alreadyHere.other': ' {count} déjà présents ont été laissés tels quels.',
  'app.home.importFailed': 'L’importation a échoué.',
  'app.home.labJobs': 'Les tâches de votre laboratoire',
  'app.home.labJobsText':
    'Confirmez ce qui arrive, puis renvoyez les résultats depuis la page de la plante. Les deux sont signés avec la propre clé de votre laboratoire, pas par nous, et les résultats sont verrouillés pour que seul l’obtenteur puisse les ouvrir.',
  'app.home.confirmDelivery': 'Confirmer une livraison',
  'app.home.labSignature': 'La signature de votre laboratoire',
  'app.home.setUpLabSignature': 'Configurer la signature de votre laboratoire',
  'app.home.openPlant': 'Ouvrir {name}',
  'app.home.quoted': '« {v} »',
  'app.home.labReportWaiting': 'Rapport de laboratoire en attente',
  'app.home.openAgreements': 'Ouvrir mes contrats',
  'app.home.myAgreements': 'Mes contrats ({n})',
  'app.home.more': 'Plus',
  'app.home.saveABackup': 'Enregistrer une copie de secours',
  'app.home.exportAll': 'Exporter tous les enregistrements',
  'app.home.importRecords': 'Importer des enregistrements',
  'app.home.trust.title': '« Qu’est-ce qui m’empêche d’enregistrer <em>votre</em> variété ? »',
  'app.home.trust.lede': 'Trois choses rendent un enregistrement VeilCore difficile à falsifier :',
  'app.home.trust.1t': 'Un enregistrement antérieur apparaît comme antérieur',
  'app.home.trust.1b':
    'Une fois les enregistrements ancrés, chacun peut vérifier lequel a été ancré en premier. Avant cela, l’heure d’un enregistrement est l’horloge de son appareil. Un enregistrement est une preuve, pas un enregistrement officiel : il montre ce que vous aviez et quand, mais ne tranche pas un litige à lui seul.',
  'app.home.trust.2t': 'Un rapport associé peut être comparé plus tard',
  'app.home.trust.2b':
    'L’association conserve l’empreinte de votre rapport ADN avec l’enregistrement, comme votre déclaration, pour qu’un nouveau test du matériel puisse ensuite y être comparé. Quand vous associez via le contrat de VeilCore sur Midnight, l’association est aussi datée : elle montre que l’enregistrement était associé à ce rapport à cette date, pas qui a eu le rapport en premier. Dans {thisSite}, les associations ne sont pas encore datées.',
  'app.home.trust.3t': 'Une seconde partie prend livraison',
  'app.home.trust.3b':
    'Quand du matériel est transféré, la personne qui le reçoit confirme la réception avec sa propre clé. Cela place une seconde partie dans l’enregistrement, pas seulement vous. Cela montre que quelqu’un a pris livraison, pas qui il est.',
  'app.home.role.title': 'Qu’est-ce qui vous décrit le mieux ?',
  'app.home.role.intro':
    'Cela ne change que ce que nous vous montrons en premier. Cela ne limite pas ce que vous pouvez faire, et vous pouvez le changer en bas de chaque page.',
  'app.home.role.breeder.label': 'Je sélectionne ou je détiens de la génétique',
  'app.home.role.breeder.blurb':
    'Scellez des enregistrements de ce que vous détenez, envoyez des échantillons à des laboratoires et accordez des licences sur ce que vous avez obtenu.',
  'app.home.role.lab.label': 'Je dirige un laboratoire ou je reçois du matériel',
  'app.home.role.lab.blurb':
    'Recevez du matériel de vos clients, confirmez ce qui est arrivé et signez vos rapports avec votre propre clé.',
  'app.home.role.both.label': 'Les deux',
  'app.home.role.both.blurb': 'Vous sélectionnez, et vous recevez aussi du matériel d’autres personnes.',
  'app.home.roleView.breeder': 'Vue obtenteur',
  'app.home.roleView.lab': 'Vue laboratoire',
  'app.home.roleView.both': 'Vue obtenteur et laboratoire',
  'app.home.roleChange': '{view} · changer',
  'app.home.chooseView': 'Obtenteur ou laboratoire ? Choisissez votre vue',
  'app.home.saveProblem.records': 'enregistrements',
  'app.home.saveProblem.agreements': 'contrats',
  'app.home.saveProblem.text':
    'Le registre n’a pas conservé certains de vos {what} ; ils ont donc été remis à ce qu’il détient : {list}',
  'app.home.sort.recent': 'Plus récents d’abord',
  'app.home.sort.oldest': 'Plus anciens d’abord',
  'app.home.sort.name': 'Nom de la variété',
  'app.home.sort.breeder': 'Obtenteur',
  'app.home.search.lab': 'Nom de la plante, obtenteur, code TR, note ou votre n° d’enregistrement',
  'app.home.search.breeder': 'Plante, obtenteur ou votre propre référence',
  'app.home.search.aria': 'Rechercher',
  'app.home.search.nothing':
    'Rien ne correspond à « {q} ». La recherche porte sur le nom de la plante, son obtenteur, l’identifiant de l’enregistrement, votre propre référence et, pour un échantillon reçu, son code laboratoire et la note de l’obtenteur.',
  'app.home.search.nOfTotal': '{matched} sur {total}',
  'app.home.paste.ownCode': 'C’est votre propre code. Envoyez-le au laboratoire ; ne le recevez pas ici.',
  'app.home.paste.cutOff': 'Ce code semble coupé. Copiez le code laboratoire complet qu’on vous a envoyé.',
  'app.home.paste.noneStamped':
    'C’est une demande de prouver que vous détenez une plante, mais aucune plante de cet appareil n’a encore d’horodatage. Sur un nouvel appareil ? Récupérez d’abord vos plantes depuis votre copie de secours.',
  'app.home.paste.unknown':
    'Cela ne ressemble pas à un code ou un lien VeilCore. Copiez tout ce qu’on vous a envoyé et réessayez.',
  'app.home.paste.label': 'Quelqu’un vous a envoyé un code ou un lien ?',
  'app.home.paste.placeholder': 'Collez-le ici',
  'app.home.paste.go': 'Ouvrir',
  'app.home.paste.hint':
    'Un code laboratoire, un lien vers un enregistrement, une demande de prouver une plante ou un contrat à signer. Nous reconnaissons lequel.',
  'app.home.paste.whichPlant':
    'C’est une demande de prouver que vous détenez une plante. Laquelle vous a-t-on demandée ?',
  'app.home.notFinished': 'Pas terminé · ensuite : enregistrez votre copie de secours',
  'app.home.receivedFrom': 'Reçue de {name}',
  'app.home.sealedOn': 'Scellée le {date}',
  'app.home.labReportSaved': 'rapport de laboratoire enregistré',
  'app.home.keyStampQueued': 'horodatage de la clé en file d’attente',
  'app.home.keyNotStamped': 'clé pas encore horodatée',
  'app.home.reportsSent.one': '{count} rapport de laboratoire envoyé',
  'app.home.reportsSent.other': '{count} rapports de laboratoire envoyés',
  'app.home.reportWithdrawn': 'rapport de laboratoire retiré',
  'app.home.labReportDated': 'Rapport ADN daté',
  'app.home.datesReportFor': 'Date un rapport ADN pour {name}',
  'app.home.aPlant': 'une plante',
  'app.home.datingUnfinished': '{dated} · pas terminé · ensuite : enregistrez votre copie de secours',
  'app.home.datingSealed': '{dated} · scellé le {date}',
  'app.home.export.label': 'Télécharger tout ce que VeilCore conserve pour vous',
  'app.home.export.done':
    'Téléchargé : vos enregistrements, contrats, choix de partage et chaque preuve d’inclusion. Les rapports de laboratoire n’y sont pas : ouvrez-les depuis la page de la plante.',
} satisfies Partial<AppTranslation>;
