// French (vous). DRAFT: machine-assisted, to be checked by a fluent speaker before publishing
// (docs/translations/README.md). Terms as in ../../fr.ts, plus the app's: see ./index.ts.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const pair = {
  'app.pair.aFile': 'un fichier',
  'app.pair.noPlant': 'Impossible de trouver la plante sur laquelle l’enregistrer.',
  'app.pair.savedTitle': 'Rapport ADN enregistré sur cette plante',
  'app.pair.fpLabel': 'EMPREINTE DE L’ASSOCIATION',
  'app.pair.openedHere': 'Ouvert et enregistré ici, sur votre appareil.',
  'app.pair.stayed': 'Le fichier du rapport est resté sur votre appareil.',
  'app.pair.openedHereSub':
    'Le laboratoire l’a envoyé verrouillé pour que vous seul puissiez l’ouvrir. Seuls son empreinte et son nom de fichier ont été enregistrés avec votre enregistrement.',
  'app.pair.stayedSub':
    'Il a été lu et son empreinte calculée ici, dans votre navigateur. Son empreinte et son nom de fichier ont été enregistrés avec votre enregistrement.',
  'app.pair.fileSha':
    'SHA-256 du fichier : <b>{sha}</b>. C’est l’empreinte qu’un laboratoire signe : comparez-la avec celle du laboratoire. L’empreinte de l’association ci-dessus en est tirée, pour que l’association puisse être datée sur le réseau.',
  'app.pair.labMatch':
    'Ce fichier correspond au rapport de laboratoire {lead}, par son SHA-256 (signature vérifiée dans ce navigateur).',
  'app.pair.noLabMatch':
    'Aucune signature de laboratoire sur cette plante ne correspond à ce fichier : il reste votre propre déclaration.',
  'app.pair.recordChip': 'Enregistrement · {fp}',
  'app.pair.pairingChip': 'Association · {fp}',
  'app.pair.conflicts.one':
    'Attention : ce rapport ADN est aussi enregistré sur {count} autre enregistrement que vous détenez{tail}',
  'app.pair.conflicts.other':
    'Attention : ce rapport ADN est aussi enregistré sur {count} autres enregistrements que vous détenez{tail}',
  'app.pair.earliest':
    '. Cet enregistrement a été scellé le premier, selon les horloges des appareils qui les ont scellés.',
  'app.pair.earlier': '. {name} a été scellé plus tôt ({date}, selon l’horloge de son appareil).',
  'app.pair.saved':
    'Enregistré. L’empreinte de votre rapport ADN est enregistrée avec l’enregistrement de cette plante, comme votre déclaration que ce rapport lui correspond. Ce n’est pas une vérification de la génétique. {dated}',
  'app.pair.dateBelow':
    'Il n’est pas encore daté : datez-le ci-dessous si vous voulez que l’association figure sur le réseau.',
  'app.pair.notDated': 'Il n’est pas encore daté.',
  'app.pair.notDatedHere': 'Dans {thisSite}, l’association n’est pas encore datée.',
  'app.pair.seeCertificate': 'Continuer : voir le certificat',
  'app.pair.title': 'Enregistrez votre rapport ADN sur cette plante',
  'app.pair.intro':
    'Vous avez reçu votre rapport ADN ? Enregistrez-le sur cette plante. C’est ce qui lie votre enregistrement à la plante réelle : un nouveau test pourra ensuite y être comparé.',
  'app.pair.savingTo': 'Enregistrement sur : <b>{name}</b> · obtenue par {by}',
  'app.pair.replaces':
    '<b>Cette plante a déjà un rapport ADN enregistré : « {name} »{saved}.</b> Enregistrer celui-ci le remplace. La page de votre plante, son certificat et les liens que vous partagez montreront le nouveau, pas l’ancien. Rien n’est supprimé de votre appareil.',
  'app.pair.replacesChain':
    '<b>Cette plante a déjà un rapport ADN enregistré : « {name} »{saved}.</b> Enregistrer celui-ci le remplace. La page de votre plante, son certificat et les liens que vous partagez montreront le nouveau, pas l’ancien. Rien n’est supprimé de votre appareil. Si vous avez daté l’ancienne association sur le réseau, cette date y reste.',
  'app.pair.savedOn': ', enregistré le {date}',
  'app.pair.noDna':
    'VeilCore ne fait pas de tests ADN : vous enregistrez le rapport ADN que votre laboratoire vous a remis. Il est lu et son empreinte calculée sur votre appareil ; le fichier n’est jamais envoyé. Son empreinte et son nom de fichier sont enregistrés avec votre enregistrement. {after}',
  'app.pair.afterChain': 'Ensuite, vous pouvez aussi dater l’association sur le réseau.',
  'app.pair.afterDemo':
    'Dans {thisSite}, l’association n’est pas encore datée ; avec le contrat de VeilCore, elle l’est.',
  'app.pair.tap': 'Touchez pour choisir votre rapport ADN',
  'app.pair.drag': 'Glissez votre rapport ADN ici, ou cliquez pour le choisir',
  'app.pair.dropHint': 'Le fichier du rapport que votre laboratoire vous a renvoyé — lu localement, jamais envoyé.',
  'app.pair.fromLab':
    'C’est le rapport de laboratoire que votre laboratoire a envoyé via VeilCore. Une fois enregistré, cette page le vérifie avec la signature du laboratoire.',
  'app.pair.labCanSign':
    'Un laboratoire peut aussi signer son rapport avec sa propre clé ; un rapport signé pèse plus qu’un rapport que vous enregistrez vous-même. Ici, enregistrez le fichier du rapport ADN que vous avez.',
  'app.pair.fingerprinting': 'Calcul de l’empreinte sur votre appareil…',
  'app.pair.replace': 'Remplacer le rapport ADN enregistré',
  'app.pair.skip': 'Pas encore de rapport : passer',
  'app.pair.chooseFirst': 'Choisissez d’abord le fichier du rapport ADN.',
  'app.pair.fingerprinted': 'Empreinte calculée dans votre navigateur.',
  'app.pair.sealedFp': 'EMPREINTE SCELLÉE',
  'app.pair.chosen': '{title}. Choisi : {name}',
  'app.pair.ready':
    '{kb} Ko · prêt pour le calcul de l’empreinte sur cet appareil · choisissez de nouveau pour le remplacer',
  'app.pair.chain.noKeys':
    'Ce navigateur ne détient pas les clés de l’enregistrement : il ne peut donc pas dater l’association. Restaurez-les depuis votre copie de secours.',
  'app.pair.chain.stampFirst':
    'Ajoutez d’abord l’horodatage de votre plante (depuis sa page) si vous voulez aussi dater ce rapport de laboratoire sur le réseau.',
  'app.pair.chain.other':
    'Cet enregistrement a déjà une association datée d’un autre rapport. Dater une seconde association n’est pas encore possible : ce rapport n’est donc pas daté. Conservez le fichier de preuve et la copie de secours de la première.',
  'app.pair.chain.dated': 'Cette association est datée sur le réseau de test, pour cet enregistrement.',
  'app.pair.chain.label': 'Association',
  'app.pair.chain.toShow':
    'Pour la montrer, donnez à quelqu’un le rapport et ce fichier de preuve. Gardez-en une copie avec le rapport : sans son sel, l’association ne pourra jamais être montrée.',
  'app.pair.chain.backupAgain':
    'Téléchargez de nouveau la copie de secours des clés de l’enregistrement : celle que vous avez ne contient pas cette association.',
  'app.pair.chain.download': 'Télécharger le fichier de preuve',
  'app.pair.chain.title': 'Dater aussi cette association sur le réseau de test (facultatif)',
  'app.pair.chain.intro':
    'Cela inscrit un code sur la chaîne, de façon permanente, à côté de l’identité de cet enregistrement. Le code est tiré de l’empreinte du rapport et d’un nombre aléatoire gardé dans ce navigateur : il ne dit rien du rapport, et personne ne peut le copier sur son propre enregistrement. Ensuite, vous téléchargez un fichier de preuve : avec lui et le rapport, chacun peut vérifier que le détenteur de cet enregistrement avait le rapport à cette date.',
  'app.pair.chain.earlier':
    'Une tentative précédente a été envoyée mais pas confirmée. Elle a peut-être abouti. Renvoyer utilise le même code : cela ne peut pas associer un second rapport différent.',
  'app.pair.chain.sendAgain': 'Renvoyer',
  'app.pair.chain.date': 'Dater l’association',
  'app.pair.chain.testOnly':
    'Réseau de test uniquement. Cela montre que la personne qui contrôlait l’identité de cet enregistrement avait le rapport, ou son empreinte, à la date où il arrive. Ce n’est pas une vérification de la génétique.',
} satisfies Partial<AppTranslation>;
