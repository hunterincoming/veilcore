// French (vous). DRAFT: machine-assisted, to be checked by a fluent speaker before publishing
// (docs/translations/README.md). Terms as in ../../fr.ts.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const home = {
  'app.home.firstRecord': 'Créons votre premier enregistrement',
  'app.home.oldLinks':
    'Les liens de vérification et codes QR faits avant le 17 octobre 2026 ne montrent plus le nom de vos enregistrements : VeilCore garde désormais les noms verrouillés, donc le registre n’en a aucun à montrer. Pour partager un nom, ouvrez l’enregistrement, choisissez Montrer à quelqu’un, activez le nom et envoyez le nouveau lien. Un nouveau certificat a un nouveau code QR.',
  'app.home.continueDraftNamed': 'Reprendre votre brouillon : {name}',
  'app.home.continueDraft': 'Reprendre votre brouillon',
  'app.home.draftKept':
    'Ce que vous avez saisi est conservé dans ce navigateur. Reprenez là où vous vous étiez arrêté.',
  'app.home.aboutThreeMinutes':
    'Environ 3 minutes. À la fin, il a un horodatage public, et vous êtes seul à détenir la clé.',
  'app.home.aboutThreeMinutesByHand':
    'Environ 3 minutes. À la fin, il est scellé ; sa date publique vient quand nous ancrons son lot (à la main pour l’instant). Vous êtes seul à détenir la clé.',
  'app.home.continue': 'Reprendre',
  'app.home.start': 'Créer un enregistrement',
  'app.home.spreadsheet': 'Vous avez un tableur ? Datez toute votre collection',
  'app.home.newPhone': 'Nouveau téléphone ? Récupérez vos enregistrements',
  'app.home.newPhoneLab': 'Nouveau téléphone ? Récupérez la clé et les échantillons de votre laboratoire',
  'app.home.labWhatShows': 'Que montre ma signature ?',
  'app.home.labShows':
    'Elle montre que votre clé a signé : qu’un échantillon est arrivé, ou quel rapport vous avez envoyé. Elle ne montre pas qui détient la clé : n’importe qui peut enregistrer une clé sous n’importe quel nom.',
  'app.home.breederToo': 'Je suis aussi obtenteur',
  'app.home.imALab': 'Je suis un laboratoire',
  'app.home.whatStops': 'Qu’est-ce qui empêche quelqu’un d’enregistrer mon matériel génétique en premier ?',
  'app.home.samplesReceived': 'Échantillons reçus',
  'app.home.yourRecords': 'Vos enregistrements',
  'app.home.logNew': 'Créer un enregistrement',
  'app.home.saveIt': 'L’enregistrer',
  'app.home.finishBackupLine': '<b>Pour finir : enregistrez votre sauvegarde.</b> {line}',
  'app.home.keysOnlyHereRecords.one': '{count} enregistrement a des clés uniquement sur cet appareil.',
  'app.home.keysOnlyHereRecords.other': '{count} enregistrements ont des clés uniquement sur cet appareil.',
  'app.home.resetWarningRecords.one':
    '{count} enregistrement a des clés sans sauvegarde vérifiée. Enregistrez d’abord votre sauvegarde : si vous videz le navigateur plus tard, elles seraient perdues pour de bon.',
  'app.home.resetWarningRecords.other':
    '{count} enregistrements ont des clés sans sauvegarde vérifiée. Enregistrez d’abord votre sauvegarde : si vous videz le navigateur plus tard, elles seraient perdues pour de bon.',
  'app.home.resetReceiving.one':
    'Vous êtes encore en train de recevoir {count} envoi, et aucune sauvegarde vérifiée ne contient son code. Recommencer supprime ce code de ce navigateur, et sans lui l’envoi ne peut pas être terminé. Enregistrez d’abord votre sauvegarde.',
  'app.home.resetReceiving.other':
    'Vous êtes encore en train de recevoir {count} envois, et aucune sauvegarde vérifiée ne contient leurs codes. Recommencer supprime ces codes de ce navigateur, et sans eux ces envois ne peuvent pas être terminés. Enregistrez d’abord votre sauvegarde.',
  'app.home.resetUnsure.one':
    'Une modification de {count} enregistrement n’est pas encore sauvegardée : sa correction n’a pas reçu de réponse claire. Ce navigateur la garde 30 jours au cas où vous restaureriez cet ensemble depuis sa sauvegarde, puis la retire la prochaine fois que VeilCore est ouvert après ce délai.',
  'app.home.resetUnsure.other':
    'Les modifications de {count} enregistrements ne sont pas encore sauvegardées : leurs corrections n’ont pas reçu de réponse claire. Ce navigateur les garde 30 jours au cas où vous restaureriez cet ensemble depuis sa sauvegarde, puis les retire la prochaine fois que VeilCore est ouvert après ce délai.',
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
    'Confirmez ce qui arrive, puis renvoyez les résultats depuis la page de l’enregistrement. Les deux sont signés avec la propre clé de votre laboratoire, pas par nous, et les résultats sont verrouillés pour que seul l’obtenteur puisse les ouvrir.',
  'app.home.confirmDelivery': 'Confirmer une livraison',
  'app.home.labSignature': 'La clé de signature de votre laboratoire',
  'app.home.setUpLabSignature': 'Configurer la clé de signature de votre laboratoire',
  'app.home.openPlant': 'Ouvrir {name}',
  'app.home.quoted': '« {v} »',
  'app.home.labReportWaiting': 'Rapport de laboratoire en attente',
  'app.home.openAgreements': 'Ouvrir mes accords',
  'app.home.myAgreements': 'Mes accords ({n})',
  'app.home.more': 'Plus',
  'app.home.saveABackup': 'Enregistrer une sauvegarde',
  'app.home.exportAll': 'Exporter tous les enregistrements',
  'app.home.importRecords': 'Importer des enregistrements',
  'app.home.trust.title': '« Qu’est-ce qui m’empêche d’enregistrer <em>votre</em> matériel génétique ? »',
  'app.home.trust.lede': 'Trois choses fondent un enregistrement VeilCore :',
  'app.home.trust.1t': 'Un enregistrement antérieur apparaît comme antérieur',
  'app.home.trust.1b':
    'Une fois les enregistrements ancrés, chacun peut vérifier lequel a été ancré en premier. Avant cela, l’heure d’un enregistrement est l’horloge de son appareil. Un enregistrement est une preuve, pas une inscription : il montre ce que vous aviez et quand, mais ne tranche pas un litige à lui seul.',
  'app.home.trust.2t': 'Un rapport associé peut être comparé plus tard',
  'app.home.trust.2b':
    'L’association conserve le code de votre rapport ADN avec l’enregistrement, comme votre déclaration, pour qu’un nouveau test du matériel puisse ensuite y être comparé. Quand vous associez via le smart contract de VeilCore sur Midnight, l’association est aussi datée : elle montre que l’enregistrement était associé à ce rapport au plus tard à cette date, pas qui a eu le rapport en premier. Dans {thisSite}, les associations ne sont pas encore datées.',
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
  // lab/LabDoor.tsx: /for-labs, asked once of a breeder with records of their own
  'app.home.labDoor.title': 'Ajouter les outils de laboratoire ?',
  'app.home.labDoor.what':
    'Vous verrez une vue laboratoire avec votre clé de signature et les échantillons que vous recevez.',
  'app.home.labDoor.text': 'Vos enregistrements restent tels quels.',
  'app.home.labDoor.add': 'Ajouter les outils de laboratoire',
  'app.home.labDoor.notNow': 'Pas maintenant',
  'app.labpage.title': 'VeilCore pour les laboratoires',
  'app.labpage.lede':
    'Signez les résultats que vous produisez déjà. L’obtenteur peut les montrer, et qui les voit peut vérifier quelle clé les a signés, et quand. Votre propre système continue de fonctionner comme avant.',
  'app.labpage.setUp': 'Configurer votre laboratoire',
  'app.labpage.gets.title': 'Ce que votre laboratoire obtient',
  'app.labpage.gets.key.t': 'Une clé de signature.',
  'app.labpage.gets.key.p':
    'Créée dans votre navigateur. Les accusés de réception et les résultats que vous signez la portent, et toute personne à qui on les montre peut vérifier la signature.',
  'app.labpage.gets.arrived.t': 'Un accusé de réception signé pour chaque échantillon.',
  'app.labpage.gets.arrived.p':
    'Un obtenteur envoie un échantillon avec un code laboratoire VeilCore. Vous confirmez qu’il est arrivé, ou le refusez, et vous le signez.',
  'app.labpage.gets.results.t': 'Des résultats verrouillés pour l’obtenteur.',
  'app.labpage.gets.results.p':
    'Seuls l’obtenteur, votre laboratoire et l’expéditeur de l’échantillon les voient, et seul l’obtenteur peut les montrer à d’autres.',
  'app.labpage.work.title': 'Ce qui change dans votre travail',
  'app.labpage.work.p1':
    'Rien dans votre propre système. Quand un échantillon arrive avec un code laboratoire, vous collez ou scannez le code, confirmez la livraison, puis signez votre résultat.',
  'app.labpage.work.p2':
    'Les données de vos échantillons et les noms de vos clients restent chez vous. VeilCore garde les accusés que vous signez, et vos résultats verrouillés pour que seul l’obtenteur puisse les ouvrir.',
  'app.labpage.cost.title': 'Ce que ça coûte',
  'app.labpage.cost.p': 'Gratuit pour essayer. Les offres pour laboratoires sont prêtes, mais pas activées.',
  'app.labpage.own.title': 'Utilisez-le à votre façon',
  'app.labpage.own.lede':
    'Vous n’êtes jamais obligé d’utiliser veilcore.org. Tout le code de VeilCore est ouvert, sous licence Apache-2.0.',
  'app.labpage.own.site.t': 'Utiliser veilcore.org.',
  'app.labpage.own.site.p': 'Rien à configurer. Nous faisons tourner le serveur et payons les frais de réseau.',
  'app.labpage.own.plug.t': 'L’intégrer à votre propre logiciel.',
  'app.labpage.own.plug.p':
    'Votre système garde vos données et ajoute un code de preuve à chaque enregistrement, avec le paquet de contrats intelligents @veilcore/contracts.',
  'app.labpage.own.plug.link': 'Comment l’intégrer →',
  'app.labpage.own.run.t': 'Faire tourner votre propre copie.',
  'app.labpage.own.run.p':
    'Le site, le serveur qui garde les enregistrements et le service de frais sont du code ouvert. Vous les hébergeriez et paieriez vos propres frais de réseau. Le guide pour l’héberger soi-même liste chaque partie et chaque réglage.',
  'app.labpage.own.run.link': 'Le guide pour l’héberger soi-même →',
  'app.labpage.own.plainly':
    'Pour être clair : faire tourner votre propre copie est possible à partir du code ouvert, mais personne en dehors de VeilCore ne l’a encore fait, donc le faire sans notre aide n’est pas testé. Une copie utilise votre propre adresse et votre nom une fois construite avec eux, comme le guide l’explique. Le contrat intelligent principal des enregistrements a une clé de maintenance, que nous détenons. Le contrat intelligent des preuves de faits n’en a pas.',
  'app.labpage.own.policyLink': 'Qui détient la clé de maintenance, et quand elle peut servir →',
  'app.labpage.own.codeLink': 'Le code sur GitHub →',
  'app.labpage.gone.title': 'Si VeilCore disparaît',
  'app.labpage.gone.p':
    'Ce qui est déjà daté le reste : les dates sont sur Midnight, et le fichier de sauvegarde d’un obtenteur contient ses enregistrements et les preuves pour les vérifier avec des outils libres et ouverts. Ce qui s’arrête, c’est créer de nouveaux enregistrements et transmettre des codes laboratoire, jusqu’à ce que quelqu’un fasse tourner un serveur à partir du code ouvert.',
  'app.labpage.gone.link': 'Tout ce qui continue sans nous →',
  'app.home.saveProblem.records': 'enregistrements',
  'app.home.saveProblem.agreements': 'accords',
  'app.home.saveProblem.unreachable':
    'VeilCore n’a pas pu être joint : vos derniers {what} n’y sont pas encore enregistrés. Ils sont gardés dans ce navigateur et renvoyés au prochain enregistrement.',
  'app.home.saveProblem.text':
    'Le registre n’a pas conservé certains de vos {what} ; ils ont donc été remis à ce qu’il détient : {list}',
  'app.home.sort.recent': 'Plus récents d’abord',
  'app.home.sort.oldest': 'Plus anciens d’abord',
  'app.home.sort.name': 'Nom',
  'app.home.sort.breeder': 'Obtenteur',
  'app.home.search.lab': 'Nom, obtenteur, code TR, note ou votre n° d’accession',
  'app.home.search.breeder': 'Nom, obtenteur ou votre propre référence',
  'app.home.search.aria': 'Rechercher',
  'app.home.search.nothing':
    'Rien ne correspond à « {q} ». La recherche porte sur le nom, l’obtenteur, l’identifiant de l’enregistrement, votre propre référence et, pour un échantillon reçu, son code laboratoire et la note de l’obtenteur.',
  'app.home.search.nOfTotal': '{matched} sur {total}',
  'app.home.paste.ownCode': 'C’est votre propre code. Envoyez-le au laboratoire ; ne le recevez pas ici.',
  'app.home.paste.cutOff': 'Ce code semble coupé. Copiez le code laboratoire complet qu’on vous a envoyé.',
  'app.home.paste.noneStamped':
    'C’est une demande de prouver que vous détenez un enregistrement, mais aucun enregistrement de cet appareil n’a encore d’horodatage. Sur un nouvel appareil ? Récupérez d’abord vos enregistrements depuis votre sauvegarde.',
  'app.home.paste.unknown':
    'Cela ne ressemble pas à un code ou un lien VeilCore. Copiez tout ce qu’on vous a envoyé et réessayez.',
  'app.home.paste.label': 'Quelqu’un vous a envoyé un code ou un lien ?',
  'app.home.paste.placeholder': 'Collez-le ici',
  'app.home.paste.go': 'Ouvrir',
  'app.home.paste.orMake': 'Rien à coller ? Créez un enregistrement',
  'app.home.paste.hint':
    'Un code laboratoire, un lien vers un enregistrement ou un accord à signer. Nous reconnaissons lequel.',
  'app.home.paste.whichRecord':
    'C’est une demande de prouver que vous détenez un enregistrement. Lequel vous a-t-on demandé ?',
  'app.home.receivedFrom': 'Reçue de {name}',
  'app.home.receivedFromNamed': 'De {name} · leur enregistrement {id}',
  'app.home.receivedFromName': 'De {name}',
  'app.home.sealedOn': 'Scellé le {date}',
  'app.home.labReportSaved': 'rapport de laboratoire enregistré',
  'app.home.keyStampQueued': 'horodatage de la clé en file d’attente',
  'app.home.keyNotStamped': 'clé pas encore horodatée',
  'app.home.reportsSent.one': '{count} rapport de laboratoire envoyé',
  'app.home.reportsSent.other': '{count} rapports de laboratoire envoyés',
  'app.home.reportWithdrawn': 'rapport de laboratoire retiré',
  'app.home.labReportDated': 'Rapport ADN daté',
  'app.home.datesReportFor': 'Date un rapport ADN pour {name}',
  'app.home.aPlant': 'une plante',
  'app.home.datingSealed': '{dated} · scellé le {date}',
  'app.home.backupLine':
    '<b>Pas encore dans votre sauvegarde.</b> Tant que vous ne l’avez pas enregistrée, ce que vous avez consigné n’est conservé que dans ce navigateur.',
  'app.home.export.label': 'Télécharger vos enregistrements et accords depuis VeilCore',
  'app.home.export.done':
    'Téléchargé : vos enregistrements, accords, choix de partage et chaque preuve d’inclusion. Les envois, leurs informations d’échantillon et les rapports de laboratoire n’y sont pas : ouvrez-les depuis l’envoi ou la page de la plante. Vos clés sont dans votre fichier de sauvegarde, pas dans celui-ci.',
  // PlanBox.tsx, billing.ts, records.ts: paid plans (off unless VITE_PAID_PLANS=on)
  'app.plan.full':
    'Vos enregistrements gratuits sont épuisés : aucun nouvel enregistrement n’a été créé. Tout ce que vous avez déjà reste vérifiable. Choisissez une formule sur votre page d’enregistrements pour en ajouter.',
  'app.plan.unknown':
    'VeilCore n’a pas pu vérifier votre formule pour l’instant : aucun nouvel enregistrement n’a été créé. Vérifiez votre connexion et réessayez.',
  'app.plan.box.free': 'Formule gratuite : {held} sur {cap} enregistrements datés',
  'app.plan.box.left': 'Enregistrements gratuits encore à dater : {n}',
  'app.plan.box.countsDeleted': 'Les enregistrements datés comptent même si vous les supprimez ensuite.',
  'app.plan.changeFull':
    'Cette modification daterait une nouvelle version, et vos enregistrements datés gratuits sont épuisés : rien n’a été modifié. Tout ce que vous avez déjà reste vérifiable. Choisissez une formule sur votre page d’enregistrements pour en dater davantage.',
  'app.plan.receiveFull':
    'Il ne reste aucun enregistrement daté gratuit pour recevoir cette livraison. Votre code est gardé dans ce navigateur : choisissez une formule sur votre page d’enregistrements, puis saisissez-le à nouveau.',
  'app.plan.box.rules':
    'La première correction d’un enregistrement est gratuite. Recevoir une livraison demande un enregistrement daté libre.',
  'app.plan.box.paid': 'Votre formule : {plan}',
  'app.plan.name.breeder': 'Obtenteur',
  'app.plan.name.lab': 'Laboratoire',
  'app.plan.name.free': 'Gratuite',
  'app.plan.choose': 'Choisir une formule',
  'app.plan.buy.breeder': 'Formule Obtenteur',
  'app.plan.buy.lab': 'Formule Laboratoire',
  'app.plan.opens':
    'Ouvre la page de Paddle dans un nouvel onglet. Paddle vend les formules pour VeilCore et encaisse le paiement ; VeilCore ne voit jamais votre carte ni votre e-mail.',
  'app.plan.keep': 'Quel que soit votre choix, chaque enregistrement que vous avez déjà reste vérifiable.',
  'app.plan.recheck': 'Payé ? Vérifier à nouveau',
  'app.plan.err.off': 'Les formules ne peuvent pas encore être achetées depuis ce navigateur.',
  'app.plan.err.unreachable': 'La page de Paddle n’a pas pu s’ouvrir. Réessayez dans un instant.',
  'app.plan.err.busy': 'Trop d’essais en une heure. Réessayez plus tard.',
  'app.plan.err.noRecord': 'Créez d’abord un enregistrement : une formule concerne les enregistrements que vous datez.',
  'app.plan.err.blocked':
    'Votre navigateur a bloqué la page de Paddle. Autorisez les fenêtres pop-up pour ce site, puis réessayez.',
  'app.plan.buy.other': 'Formule {plan}',
  'app.plan.importFull':
    'Ce fichier contient {n} enregistrements nouveaux pour VeilCore, et votre formule gratuite peut encore en dater {left}. Rien n’a été importé. Choisissez une formule sur votre page d’enregistrements pour en dater davantage.',
  'app.plan.box.full':
    'Vos enregistrements gratuits sont épuisés. Tout ce que vous avez déjà reste vérifiable. Choisissez une formule pour en ajouter.',
  'app.home.labSheet': 'Sceller le tableau du jour',
  'app.labpage.work.sheet':
    'Vous exportez chaque jour un tableau de vos cultures ou échantillons ? Scellez tout le tableau d’un coup. Après la première fois, cet appareil retient ses colonnes : le lendemain, c’est un seul bouton.',
  'app.labpage.work.sheetLink': 'Sceller le tableau du jour',
} satisfies Partial<AppTranslation>;
