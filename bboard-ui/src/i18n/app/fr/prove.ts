// French (vous). DRAFT: machine-assisted, to be checked by a fluent speaker before publishing
// (docs/translations/README.md). Terms as in ../../fr.ts.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const prove = {
  'app.prove.share.checkingNow': 'Vérification de ce qui est partagé maintenant…',
  'app.prove.share.saveNote':
    ' « Obtenir le lien » enregistre les interrupteurs ci-dessus, et la page de vérification affiche alors exactement cela.',
  'app.prove.share.couldntRead': 'Impossible de lire auprès du registre ce qui est partagé maintenant.{save}',
  'app.prove.share.onlyBasicsUnsaved':
    'Partagé maintenant : seulement l’essentiel. Les interrupteurs ci-dessus sont une suggestion et ne sont pas encore enregistrés.{save}',
  'app.prove.share.semicolon': ' ; ',
  'app.prove.share.onlyBasics': 'seulement l’essentiel',
  'app.prove.share.sharedNow': 'Partagé maintenant : {now}.{differs}',
  'app.prove.share.differs': ' Les interrupteurs ci-dessus en diffèrent.{save}',
  'app.prove.yourRequest': 'Votre demande',
  'app.prove.youAskedNamed':
    'Vous avez demandé au détenteur de <b>{name}</b> de prouver qu’il la détient. Envoyez-lui ce lien si ce n’est pas déjà fait.',
  'app.prove.youAsked':
    'Vous avez demandé au détenteur de cette plante de prouver qu’il la détient. Envoyez-lui ce lien si ce n’est pas déjà fait.',
  'app.prove.openCheckPage': 'Ouvrir la page de vérification de la plante',
  'app.prove.opening': 'Ouverture de la demande…',
  'app.prove.ended': 'Cette demande est terminée',
  'app.prove.cantOpen': 'Impossible de l’ouvrir pour l’instant',
  'app.prove.expired':
    'Elle a expiré (les demandes durent une semaine), ou le lien est incomplet. Demandez-en un nouveau.',
  'app.prove.missingPart': 'Il manque la dernière partie de ce lien',
  'app.prove.missingPartText':
    'La réponse ne peut repartir qu’avec le lien complet. Ouvrez le lien exactement tel qu’il vous a été envoyé, ou demandez qu’on vous le renvoie.',
  'app.prove.someoneWants': 'Quelqu’un veut que vous prouviez que vous détenez une plante',
  'app.prove.noPlantsHere':
    'Vos plantes ne sont pas sur ce téléphone ou cet ordinateur. Ouvrez ce lien là où vous les gardez, ou récupérez-les ici depuis votre fichier de copie de secours, puis ouvrez de nouveau le lien.',
  'app.prove.notThisPlant':
    'Aucune des plantes présentes ici n’est celle demandée. Si vous la gardez sur un autre téléphone ou ordinateur, ouvrez-y ce lien. Si vous ne l’avez que dans un fichier de copie de secours, restaurez-la ici, puis ouvrez de nouveau le lien.',
  'app.prove.getBack': 'Récupérer mes plantes depuis une copie de secours',
  'app.prove.done': 'Terminé',
  'app.prove.doneText':
    'La réponse s’affichera sur sa page. Rien n’a été envoyé sur la plante : seulement la preuve que vous détenez son enregistrement.',
  'app.prove.thePlant': 'la plante',
  'app.prove.didntSend': 'Prouvé, mais la réponse n’est pas partie',
  'app.prove.sendInstead': '({why}.) Envoyez plutôt ceci ; on peut le coller sous « Le faire à la main » :',
  'app.prove.copy': 'Copier',
  'app.prove.title': 'Prouvez que vous détenez {name}',
  'app.prove.thisPlant': 'cette plante',
  'app.prove.askedBy':
    'Demandé par quelqu’un qui dit être <b>« {asker} »</b>. <muted>VeilCore ne l’a pas vérifié.</muted>',
  'app.prove.askedAnon': 'Quelqu’un vous a demandé de le prouver, sans donner de nom.',
  'app.prove.whatSends':
    '<b>Ce qui est envoyé :</b> seulement la preuve que vous détenez l’enregistrement de cette plante, placée sur le réseau de test. Pas de nom, pas de génétique, rien sur vos autres plantes.',
  'app.prove.testOnly': 'Pour l’instant, la preuve ne fonctionne que sur la version de test.',
  'app.prove.answering':
    'Répondre indique à la personne qui vous a envoyé ce lien que vous détenez l’enregistrement de cette plante.',
  'app.prove.proving': 'Preuve en cours…',
  'app.prove.proveIt': 'Le prouver',
  'app.prove.fewMinutes': 'Cela peut prendre quelques minutes. Réseau de test : pour s’entraîner uniquement.',
  'app.prove.ask.cantAsk': 'Impossible de demander une preuve depuis ce lien',
  'app.prove.ask.refused': '{reason}. Une preuve faite avec lui ne dirait rien sur cet enregistrement.',
  'app.prove.ask.noLink': 'Aucun lien n’a été créé : {error}.',
  'app.prove.ask.title': 'Demandez-lui de prouver qu’il la détient',
  'app.prove.ask.intro':
    'Vous envoyez un lien. La personne l’ouvre et touche « Le prouver ». La réponse s’affiche ici. Cette page vérifie la réponse sur le réseau lui-même, via un indexeur Midnight (sur le site de test, en passant par le relais de VeilCore). Pour une décision importante, vérifiez la transaction sur un second indexeur. Réseau de test uniquement.',
  'app.prove.ask.bound':
    'Cet enregistrement a nommé sa propre clé au moment d’être scellé. Cette page a vérifié que la clé de votre lien est bien celle-là.',
  'app.prove.ask.older':
    'Enregistrement ancien : clé non liée à cet enregistrement. Une preuve montre le contrôle de la clé que nomme le lien, choisie par le détenteur.',
  'app.prove.ask.newRequest': 'Faire une nouvelle demande',
  'app.prove.ask.name': 'Votre nom ou votre entreprise (facultatif)',
  'app.prove.ask.nameHelp': 'Il le verra, marqué comme non vérifié par VeilCore.',
  'app.prove.ask.making': 'Création du lien…',
  'app.prove.ask.make': 'Créer un lien à lui envoyer',
  'app.prove.ask.byHand': 'Le faire plutôt à la main',
  'app.prove.hand.intro':
    'Le lien que vous avez reçu nomme une identité sur la chaîne pour cet enregistrement ({id}…). Créez un défi, envoyez-le, puis collez l’identifiant de transaction qu’on vous renvoie. La réponse doit venir de cette identité et répondre à votre défi, et l’identité doit être ancrée et à jour. {bound}',
  'app.prove.hand.bound':
    'L’enregistrement a nommé cette clé au moment d’être scellé, et cette page l’a vérifié avec son empreinte.',
  'app.prove.hand.older':
    'Enregistrement ancien : clé non liée à cet enregistrement. Que cette identité lui corresponde est la déclaration du détenteur.',
  'app.prove.hand.make': 'Créer un défi',
  'app.prove.hand.yourChallenge': 'Votre défi (envoyez-le au détenteur ; il ne sert qu’une fois, dans cet onglet) :',
  'app.prove.hand.txId': 'L’identifiant de transaction du détenteur',
  'app.prove.hand.check': 'Vérifier la réponse',
  'app.prove.hand.acceptedKey':
    'Accepté : la personne qui a envoyé cette transaction contrôle la propre clé de cet enregistrement, et a répondu à votre défi.',
  'app.prove.hand.acceptedSecret':
    'Accepté : la personne qui a envoyé cette transaction détient le secret de cette identité, et a répondu à votre défi.',
  'app.prove.hand.notAccepted': 'Non accepté : {reason}.',
  'app.prove.hand.anchorYes': ' La transaction d’ancrage donnée par le détenteur crée bien cette identité.',
  'app.prove.hand.anchorNo': ' La transaction d’ancrage donnée par le détenteur n’a pas pu être confirmée.',
  'app.prove.key.leavesOut':
    'Cet enregistrement nomme sa propre clé, mais ce lien omet ce qu’il faut pour la vérifier. Demandez un nouveau lien au détenteur',
  'app.prove.key.noFp':
    'L’empreinte de ce lien ne correspond pas à l’enregistrement : sa clé ne peut donc pas être vérifiée avec',
  'app.prove.key.notThis': 'La clé de ce lien n’est pas celle que nomme cet enregistrement',
  'app.prove.watch.shareAsker':
    '{asker} vous demande de prouver sur VeilCore que vous détenez cette plante. Ouvrez ce lien : {link}',
  'app.prove.watch.share':
    'Je vous demande de prouver sur VeilCore que vous détenez cette plante. Ouvrez ce lien : {link}',
  'app.prove.watch.sendIt': 'L’envoyer',
  'app.prove.watch.copyLink': 'Copier le lien',
  'app.prove.watch.key': 'Clé : ',
  'app.prove.watch.confirmed': 'Confirmé',
  'app.prove.watch.controlsOwn':
    'La personne qui a répondu contrôle en ce moment la propre clé de cet enregistrement. L’enregistrement a nommé cette clé au moment d’être scellé : elle ne peut donc pas être échangée.',
  'app.prove.watch.controlsLink': 'La personne qui a répondu contrôle en ce moment la clé nommée dans ce lien.',
  'app.prove.watch.stampNotConfirmed': 'L’horodatage de la clé nommée dans le lien n’a pas pu être confirmé.',
  'app.prove.watch.notWho': 'Cela ne montre pas qui est cette personne ni qui a obtenu la plante.',
  'app.prove.watch.olderRecord': 'Enregistrement ancien : clé non liée à cet enregistrement.',
  'app.prove.watch.holderStatement':
    'Que cette clé corresponde à l’enregistrement de cette plante est pour l’instant la déclaration du détenteur. Cela ne montre pas qui est cette personne ni qui a obtenu la plante.',
  'app.prove.watch.checkedAt':
    'Vérifié {when} sur le réseau de test, qui peut être réinitialisé : pour s’entraîner uniquement, sans valeur de preuve.',
  'app.prove.watch.expired': 'Cette demande a expiré sans réponse. Faites-en une nouvelle.',
  'app.prove.watch.checking': 'Une réponse est arrivée. Vérification sur le réseau…',
  'app.prove.watch.pending': 'Une réponse est arrivée. Le réseau ne l’affiche pas encore : la vérification continue.',
  'app.prove.watch.unreachable': 'Impossible de joindre VeilCore pour l’instant. Nouvel essai en cours.',
  'app.prove.watch.waiting':
    'En attente de la preuve. Vous pouvez fermer cette page : pour voir la réponse, ouvrez dans ce navigateur le lien que vous avez envoyé.',
  'app.prove.watch.refused.one': 'Une réponse reçue n’a pas passé la vérification : {reason}',
  'app.prove.watch.refused.other': '{count} réponses n’ont pas passé la vérification : {reason}',
  'app.prove.watch.stampedYour':
    'La clé de votre plante a été horodatée le {when}. Cela date la clé, pas l’enregistrement.',
  'app.prove.watch.stampedThat': 'Cette clé a été horodatée le {when}. Cela date la clé, pas l’enregistrement.',
  'app.prove.watch.stampedThisEarlier':
    'La clé de cette plante a déjà été horodatée sur le réseau. Cela date la clé, pas l’enregistrement.',
  'app.prove.watch.stampedThatEarlier':
    'Cette clé a déjà été horodatée sur le réseau. Cela date la clé, pas l’enregistrement.',
  'app.prove.own.title': 'Prouvez que vous détenez la clé de cette plante (réseau de test)',
  'app.prove.own.stampFirst':
    'Ajoutez d’abord l’horodatage : touchez « Ajouter l’horodatage » sur la page de la plante. La preuve porte sur l’identité de la plante sur la chaîne, que crée l’horodatage.',
  'app.prove.own.intro':
    'La personne qui vérifie crée un défi sur la page de vérification de l’enregistrement et vous l’envoie. Vous y répondez ici ; votre navigateur prouve que vous détenez le secret de l’enregistrement sans le révéler, et vous lui envoyez l’identifiant de transaction. Avec l’horodatage, cela montre que la clé existait au bloc {block} et que vous la contrôlez maintenant.',
  'app.prove.own.copyChecker':
    'Copier le lien pour la personne qui vérifie (il nomme l’identité de l’enregistrement sur la chaîne)',
  'app.prove.own.tryIt': 'Essayez vous-même : ouvrez-le en tant que vérificateur',
  'app.prove.own.challenge': 'Le défi de la personne qui vérifie (64 caractères)',
  'app.prove.own.answer': 'Répondre au défi',
  'app.prove.own.done': 'Terminé. Envoyez cet identifiant de transaction à la personne qui vérifie :',
  'app.prove.share.notFound': 'Enregistrement introuvable.',
  'app.prove.share.notSaved': 'Votre choix n’a pas été enregistré, donc aucun lien n’a été créé : {error}.',
  'app.prove.share.title': 'Choisissez ce que voit un inconnu',
  'app.prove.share.intro':
    'Quiconque a l’identifiant de cet enregistrement — par un lien que vous envoyez, le QR code de son certificat ou un message transféré — peut ouvrir sa page de vérification. Choisissez les informations que cette page affiche. Le choix est enregistré avec l’enregistrement dans le registre de VeilCore et s’applique à tous ceux qui ont l’identifiant ; vous pouvez le changer ici à tout moment, et les liens déjà envoyés montrent alors le nouveau choix.',
  'app.prove.share.shownOn': 'Affiché sur la page de vérification',
  'app.prove.share.strangerSees': 'Ce que verra un inconnu qui a l’identifiant',
  'app.prove.share.reportOn': 'Avec « Si un rapport ADN est enregistré » activé, la page de vérification l’indique.',
  'app.prove.share.reportOff':
    'Avec « Si un rapport ADN est enregistré » désactivé, la page de vérification n’en dit rien.',
  'app.prove.share.yourLink': 'Votre lien',
  'app.prove.share.savedOn': 'Enregistré dans le registre',
  'app.prove.share.savedText':
    'Quiconque ouvre ce lien, ou a l’identifiant de cet enregistrement d’une autre façon, voit les informations de l’aperçu et rien d’autre ; le registre n’envoie pas le reste, et modifier le lien ne peut rien y ajouter. La génétique n’est jamais divulguée. Ce choix détermine ce qu’affiche la page de vérification. Prouver une valeur cachée (un marqueur, une plage, ou que deux variétés diffèrent) sans montrer le reste est le rôle du contrat de revendications de VeilCore.',
  'app.prove.share.letThemAsk':
    'Leur permettre de vérifier l’horodatage et de me demander de prouver que je la détiens',
  'app.prove.share.theLink': 'Le lien',
  'app.prove.share.openTheirs': 'Ouvrir ce qu’ils verront',
  'app.prove.share.saving': 'Enregistrement…',
  'app.prove.share.getLink': 'Obtenir le lien',
} satisfies Partial<AppTranslation>;
