// French (vous). DRAFT: machine-assisted, to be checked by a fluent speaker before publishing
// (docs/translations/README.md). Terms as in ../../fr.ts.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const plant = {
  'app.plant.notHere': 'Cet enregistrement n’est pas dans ce navigateur',
  'app.plant.notHereText':
    'Si vous l’avez scellé dans un autre navigateur, enregistrez-y une copie de secours et ouvrez-la ici (Récupérer vos plantes). Si c’est l’enregistrement de quelqu’un d’autre, ouvrez plutôt le lien de vérification qu’il vous a donné.',
  'app.plant.yourRecords': 'Vos enregistrements',
  'app.plant.checkARecord': 'Vérifier un enregistrement',
  'app.plant.home': 'Accueil',
  'app.plant.bredByName': 'Obtenue par {name}',
  'app.plant.corrected':
    'Cet enregistrement a été corrigé. Une correction ne le modifie ni ne le supprime jamais : il reste conservé tel quel, et un enregistrement ultérieur le remplace. <link>Voir la correction</link>',
  'app.plant.corrects':
    'Ceci corrige un enregistrement antérieur. Modifié : {fields}. Motif indiqué : {reason}. <link>Voir ce qu’il a remplacé</link>',
  'app.plant.evidenceLine':
    '<link>Télécharger le dossier de preuve</link> <muted>pour vérifier la date de cet enregistrement sans VeilCore</muted>',
  'app.plant.open': 'Ouvrir',
  'app.plant.reportsCameBack.one':
    'Un rapport de laboratoire est revenu, verrouillé pour que vous seul puissiez l’ouvrir.',
  'app.plant.reportsCameBack.other':
    '{count} rapports de laboratoire sont revenus, verrouillés pour que vous seul puissiez les ouvrir.',
  'app.plant.moreYouCanDo': 'Ce que vous pouvez aussi faire',
  'app.plant.action.show': 'Montrer à quelqu’un',
  'app.plant.action.showHint': 'Choisissez ce qu’il voit',
  'app.plant.action.askedToProve': 'On m’a demandé de prouver que je la détiens',
  'app.plant.action.certificate': 'Certificat',
  'app.plant.action.sendResults': 'Renvoyer les résultats à l’obtenteur',
  'app.plant.action.sendResultsHint': 'Signés par vous, verrouillés pour lui',
  'app.plant.action.signReceipt': 'Signer l’accusé de réception',
  'app.plant.action.signReceiptHint': 'Signez que cet échantillon est arrivé, ou refusez-le',
  'app.plant.action.linkReceipt': 'Lier votre accusé de réception',
  'app.plant.action.linkReceiptHint':
    'Votre accusé de réception est signé ; liez-le à la livraison pour que l’obtenteur le voie',
  'app.plant.action.labReports': 'Rapports de laboratoire',
  'app.plant.action.sendToLab': 'L’envoyer à un laboratoire ou à un obtenteur',
  'app.plant.action.licenseIt': 'Accorder une licence',
  'app.plant.action.saveReport': 'Enregistrer un rapport ADN sur cette plante',
  'app.plant.action.checkReport': 'Vérifier qu’un rapport correspond',
  'app.plant.action.familyTree': 'Arbre généalogique',
  'app.plant.action.freshBackup': 'Enregistrer une nouvelle copie de secours',
  'app.plant.action.fix': 'Corriger une erreur',
  'app.plant.agreements': 'Contrats',
  'app.plant.openAgreement': 'Ouvrir le contrat {id}',
  'app.plant.unnamedCounterparty': 'cocontractant sans nom',
  'app.plant.technicalDetails': 'Détails techniques',
  'app.plant.f.method': 'Méthode de sélection',
  'app.plant.f.statedDate': 'Date de création déclarée (selon l’obtenteur)',
  'app.plant.f.sealedClock': 'Scellé (horloge de cet appareil)',
  'app.plant.f.ref': 'Référence / numéro de lot',
  'app.plant.f.photos': 'Photos',
  'app.plant.f.photosSealed': '{n} scellées (codes seulement ; les images n’ont jamais été envoyées)',
  'app.plant.f.reportSaved': 'enregistré sur cette plante ({file}) · code de l’association {fp}{sha}',
  'app.plant.f.file': 'fichier',
  'app.plant.f.fileSha': ' · SHA-256 du fichier {sha}',
  'app.plant.f.notSavedYet': 'pas encore enregistré',
  'app.plant.f.recordFingerprint': 'Code de preuve de l’enregistrement',
  'app.plant.evidenceBundle': 'Dossier de preuve',
  'app.plant.evidenceBundleText':
    'L’enregistrement tel que scellé, sa preuve d’inclusion, la racine du lot, l’endroit où le lot a été inscrit, le fichier d’horodatage Bitcoin s’il existe et les signatures de laboratoire le concernant, dans un seul .zip. Son verify.html le vérifie sans internet et sans rien de VeilCore, et indique quoi consulter pour le dater.',
  'app.plant.exportFailed': 'L’enregistrement n’a pas pu être exporté.',
  'app.plant.exportRecord': 'Exporter l’enregistrement',
  'app.plant.backToPlant': 'Retour à la plante',
  'app.plant.backToRecord': 'Retour à l’enregistrement',
  'app.plant.mark.done': 'fait',
  'app.plant.mark.failed': 'non confirmé',
  'app.plant.mark.reported': 'signalé par le registre, non vérifié',
  'app.plant.mark.wait': 'pas encore',
  'app.plant.recordDated': 'Enregistrement daté',
  'app.plant.stamp.dated': 'Daté',
  'app.plant.stamp.practice': 'Essai',
  'app.plant.stamp.waiting': 'Pas encore daté',
  'app.plant.labReport': 'Rapport de laboratoire',
  'app.plant.dnaReport': 'Rapport ADN',
  'app.plant.tie.tied': 'Lié à la plante',
  'app.plant.tie.notYet': 'Pas encore lié à la plante',
  'app.plant.tie.notNow': 'Plus lié à la plante',
  'app.plant.tie.lab': 'Rapport ADN {lead}',
  'app.plant.tie.self': 'Rapport ADN que vous avez enregistré (aucune signature de laboratoire n’y correspond)',
  'app.plant.tie.selfPublic':
    'Rapport ADN enregistré par le détenteur (aucune signature de laboratoire n’y correspond)',
  'app.plant.tie.savedHolder': 'Rapport ADN que vous avez enregistré',
  'app.plant.tie.savedPublic': 'Rapport ADN enregistré par le détenteur',
  'app.plant.tie.replaced': 'le laboratoire a remplacé le rapport ADN enregistré ici',
  'app.plant.tie.withdrawn': 'le laboratoire a retiré le rapport ADN enregistré ici',
  'app.plant.tie.add': 'ajoutez un rapport ADN',
  'app.plant.tie.noneSaved': 'aucun rapport ADN n’est enregistré sur cet enregistrement',
  'app.plant.tie.cameBack': 'un rapport de laboratoire est arrivé : ouvrez-le ici',
  'app.plant.tie.openedNotSaved': 'un rapport de laboratoire est ouvert, pas enregistré sur cette plante',
  'app.plant.tie.notDated': 'pas encore daté',
  'app.plant.tie.dating': 'en cours de datation ({status})',
  'app.plant.tie.datingPlain': 'en cours de datation',
  'app.plant.tie.dated': 'daté : {date}',
  'app.plant.tie.unconfirmed': 'non daté : {status}',
  'app.plant.tie.sentence': 'Lié à la plante : {what}, {date}.',
  'app.plant.tie.sentenceNoDate': 'Lié à la plante : {what}.',
  'app.plant.tie.sentenceNone': 'Pas encore lié à la plante : {what}.',
  'app.plant.tie.sentenceNot': 'Plus lié à la plante : {what}.',
  'app.plant.tie.means':
    'Un rapport ADN permet à un laboratoire de comparer avec lui un nouveau test d’une plante. À lui seul, il ne montre pas qu’une plante correspond.',
  'app.plant.tie.sub': 'Rapport {date}. Un laboratoire peut comparer avec lui un nouveau test de la plante.',
  'app.plant.tie.why': 'Un rapport ADN de votre laboratoire est ce qui lie un enregistrement à la plante elle-même.',
  'app.plant.backupChecked': 'Copie de secours vérifiée',
  'app.plant.checking': 'vérification…',
  'app.plant.savedToPlant': 'enregistré sur cette plante',
  'app.plant.arrivedNotOpened': 'arrivé, pas ouvert',
  'app.plant.openedNotSaved': 'ouvert, pas enregistré sur cette plante',
  'app.plant.noneYet': 'aucun pour l’instant',
  'app.plant.labReceipt': 'Accusé de réception du laboratoire',
  'app.plant.receiptSigned': 'Accusé de réception signé',
  'app.plant.labCodeUsed': 'Code laboratoire utilisé',
  'app.plant.noReceiptSigned': 'aucun accusé de réception signé',
  'app.plant.notSignedYet': 'pas encore signé',
  'app.plant.receipt': 'Accusé de réception',
  'app.plant.notLinkedYet': '{date}, pas encore lié à la livraison',
  'app.plant.turnedAway': 'Vous l’avez refusé',
  'app.plant.rejected.damaged': 'arrivé endommagé',
  'app.plant.rejected.wrongSample': 'mauvais échantillon',
  'app.plant.receiptNotSigned': 'Accusé de réception pas encore signé',
  'app.plant.keyStampLine':
    'Clé horodatée : {when}. La clé de votre plante est datée elle aussi : vous pourrez prouver plus tard que vous la détenez.',
  'app.plant.done': 'fait',
  'app.plant.notYet': 'pas encore',
  'app.plant.labReportSent': 'Rapport de laboratoire envoyé',
  'app.plant.nSent': '{n} envoyé(s)',
  'app.plant.withdrawnSendNew': 'retiré (vous pouvez en envoyer un nouveau)',
  'app.plant.waitingBatch': 'en attente d’un lot',
  'app.plant.inBatchWaiting': 'dans un lot, en attente de son horodatage',
  'app.plant.onTestNetwork': ' Sur un réseau de test : données d’entraînement, pas une vraie date.',
  'app.plant.checkedOnMidnight': '{date} — vérifié sur Midnight',
  'app.plant.notConfirmed': 'horodatage non confirmé sur Midnight',
  'app.plant.dontRely': '{reason}. Ne vous fiez pas à la date signalée par le registre.',
  'app.plant.lookingUp': 'Consultation de Midnight…',
  'app.plant.couldntReach': 'Impossible de joindre Midnight pour vérifier.',
  'app.plant.notChecked': 'Non vérifié sur Midnight depuis cette page.',
  'app.plant.registryReport': '{date} (selon le registre de VeilCore)',
  'app.plant.dateNotGiven': 'date non indiquée',
  'app.plant.labReportSha': 'SHA-256 du rapport de laboratoire : {sha}',
  'app.plant.labReportCode': 'Code du rapport de laboratoire : {code}',
  'app.plant.labAsSigned': 'Laboratoire, tel que signé : {lab}',
  'app.plant.noLabMatched': 'aucune signature de laboratoire ne correspond au fichier enregistré',
  'app.plant.next.backup.title': 'Enregistrez votre copie de secours',
  'app.plant.next.backup.why':
    'Les clés de cette plante ne sont pour l’instant que sur cet appareil. S’il casse ou si le navigateur est effacé, personne ne pourra prouver que vous la détenez. L’enregistrement prend une minute.',
  'app.plant.next.backup.action': 'Enregistrer ma copie de secours',
  'app.plant.next.dates.title': 'Cet enregistrement date un rapport ADN',
  'app.plant.next.dates.why':
    'Il ne contient que le SHA-256 du rapport, son code de rapport de laboratoire et le nom du laboratoire tel que signé, jamais le rapport. Quand son lot est daté, il montre que le rapport existait à ce moment-là, sans montrer les marqueurs à personne.',
  'app.plant.next.stamp.why':
    'Il est scellé. Sa clé n’est pas encore horodatée, et il le faut pour prouver que vous le détenez. Cela ne date pas votre enregistrement : il est daté quand son lot est ancré. Cela prend environ une minute et c’est gratuit.',
  'app.plant.next.rejected.title': 'Vous avez refusé cet échantillon',
  'app.plant.next.rejected.why':
    'Rien n’a été signé. VeilCore ne prévient pas l’obtenteur : informez-le vous-même, pour qu’il puisse en envoyer un autre.',
  'app.plant.next.setup.title': 'Configurez la signature de votre laboratoire',
  'app.plant.next.setup.why':
    'Vous pourrez alors signer que cet échantillon est arrivé, et renvoyer le rapport de laboratoire signé par votre laboratoire.',
  'app.plant.next.setup.action': 'La configurer',
  'app.plant.next.sign.title': 'Signez qu’il est arrivé',
  'app.plant.next.sign.why':
    'Votre accusé de réception signé est ce qui permet à l’obtenteur de se fier à un rapport de laboratoire venant de vous : il montre que votre clé a eu l’échantillon.',
  'app.plant.next.sign.action': 'Signer l’accusé de réception',
  'app.plant.next.link.title': 'Liez votre accusé de réception à la livraison',
  'app.plant.next.link.why':
    'Votre accusé de réception est signé, mais la page de l’obtenteur ne compte qu’un accusé lié à sa livraison. Seule la personne qui a utilisé le code laboratoire peut le lier.',
  'app.plant.next.link.action': 'Le lier',
  'app.plant.next.signed.title': 'Accusé de réception signé',
  'app.plant.next.signed.why':
    'L’obtenteur voit votre accusé de réception signé. Les rapports de laboratoire ne peuvent pas encore être renvoyés via VeilCore sur ce réseau : envoyez le vôtre comme d’habitude.',
  'app.plant.next.sent.title': 'Rapport de laboratoire envoyé',
  'app.plant.next.withdrawn.title': 'Rapport de laboratoire retiré',
  'app.plant.next.send.title': 'Renvoyer les résultats à l’obtenteur',
  'app.plant.next.sent.why': 'Seul l’obtenteur peut l’ouvrir. Vous pouvez le retirer, ou envoyer un fichier corrigé.',
  'app.plant.next.withdrawn.why':
    'Vous avez retiré ce que vous aviez envoyé : l’obtenteur n’a donc aucun rapport de laboratoire en vigueur de votre part. Vous pouvez en envoyer un nouveau.',
  'app.plant.next.send.why':
    'Signé avec la clé de votre laboratoire et verrouillé pour que seul l’obtenteur puisse l’ouvrir. VeilCore n’a pas sa clé.',
  'app.plant.next.sent.action': 'Voir ce que vous avez envoyé',
  'app.plant.next.send.action': 'Renvoyer les résultats',
  'app.plant.next.corrected.title': 'Enregistrez le rapport ADN corrigé',
  'app.plant.next.corrected.why':
    'Le laboratoire a remplacé le rapport ADN enregistré sur cette plante. Tant que vous n’enregistrez pas le rapport corrigé, la page de votre plante, son certificat et vos liens indiquent que celui enregistré a été remplacé.',
  'app.plant.next.corrected.action': 'Ouvrir le rapport corrigé',
  'app.plant.next.noCurrent.why':
    'L’original a été remplacé et la correction retirée. Demandez au laboratoire d’en renvoyer un. D’ici là, votre certificat et vos liens indiquent que celui enregistré a été remplacé.',
  'app.plant.next.labWithdrew.title': 'Le laboratoire a retiré le rapport ADN enregistré ici',
  'app.plant.next.labWithdrew.whyNewer':
    'Il reste enregistré sur cette plante, et votre certificat et vos liens indiquent qu’il a été retiré. Un rapport plus récent est arrivé : ouvrez-le et enregistrez-le à la place.',
  'app.plant.next.labWithdrew.why':
    'Il reste enregistré sur cette plante, et votre certificat et vos liens indiquent qu’il a été retiré. Demandez-en un nouveau au laboratoire.',
  'app.plant.next.labWithdrew.action': 'Ouvrir le plus récent',
  'app.plant.next.open.why':
    'Il est verrouillé avec la clé de cette plante, pour que vous seul puissiez l’ouvrir. L’ouvrir vérifie ici la signature du laboratoire.',
  'app.plant.next.sample.title': 'Envoyer un échantillon à un laboratoire',
  'app.plant.next.sample.whySaved':
    'Vous avez enregistré un rapport ADN sur cette plante : c’est votre propre déclaration. Un laboratoire qui signe avoir reçu un échantillon ajoute une seconde partie, ce qui constitue une preuve plus solide que votre seule déclaration.',
  'app.plant.next.sample.why':
    'Pour l’instant, cet enregistrement est votre propre description de la plante. Un laboratoire qui signe avoir reçu un échantillon et renvoie un rapport en fait une preuve plus solide que votre seule description.',
  'app.plant.next.sample.action': 'Envoyer à un laboratoire',
  'app.plant.next.dna.title': 'Obtenez un rapport ADN de cette plante',
  'app.plant.next.dna.why':
    'Un enregistrement daté montre qu’une description existait. Un rapport ADN (l’empreinte génétique de la plante faite par un laboratoire) est ce qui lie votre enregistrement à la plante réelle. Deux façons d’en obtenir un :',
  'app.plant.next.dna.labTitle': 'Envoyer un échantillon à un laboratoire',
  'app.plant.next.dna.labText':
    'Créez un code laboratoire et envoyez un échantillon avec. Le rapport ADN du laboratoire revient ici, verrouillé pour que vous seul puissiez l’ouvrir.',
  'app.plant.next.dna.labSoon':
    'Recevoir ici le rapport ADN du laboratoire, verrouillé pour que vous seul puissiez l’ouvrir, arrive bientôt sur ce site. Pour l’instant, demandez le rapport à votre laboratoire et enregistrez-le ici.',
  'app.plant.next.dna.haveTitle': 'Vous avez déjà un rapport ADN ?',
  'app.plant.next.dna.haveText':
    'Enregistrez-le sur cette plante. Il est lu sur votre appareil ; le fichier n’est jamais envoyé.',
  'app.plant.next.dna.haveAction': 'Enregistrer un rapport ADN',
  'app.plant.next.date.title': 'Datez ce rapport ADN',
  'app.plant.next.date.why':
    'Il est enregistré sur cette plante, mais rien ne le date encore. Le dater montre que le rapport existait à cette date, sans montrer les marqueurs à personne.',
  'app.plant.next.save.title': 'Enregistrez le rapport ADN sur cette plante',
  'app.plant.next.save.why':
    'Un laboratoire a signé avoir reçu un échantillon. Quand son rapport ADN reviendra, enregistrez-le sur cette plante : c’est ce qui lie votre enregistrement à la plante, pour pouvoir le comparer à un test ultérieur.',
  'app.plant.next.save.action': 'L’enregistrer sur cette plante',
  'app.plant.next.ready.title': 'Cet enregistrement est prêt à servir',
  'app.plant.next.ready.why':
    'Un laboratoire a signé avoir reçu un échantillon, et un rapport ADN est enregistré sur cette plante. Vous pouvez transmettre du matériel ou accorder une licence, avec des conditions qui s’appliquent à la descendance déclarée à partir de cet enregistrement.',
  'app.plant.next.ready.action': 'Commencer un contrat',
  'app.plant.next.backTo': 'Retour à {name}',
  'app.plant.next.noCurrent.title': 'Aucun rapport ADN en vigueur de {lab}',
  'app.plant.next.open.title': 'Ouvrir le rapport de laboratoire de {lab}',
  'app.plant.next.label': 'Étape suivante',
  'app.plant.next.stamp.title': 'Préparer la preuve que vous le détenez',
  'app.plant.next.stamp.action': 'Préparer la preuve que vous le détenez',
  'app.plant.next.open.action': 'Ouvrir',
  'app.plant.chain.sealed': 'Scellé',
  'app.plant.chain.reportSaved': 'Rapport ADN enregistré',
  'app.plant.chain.receipt': 'Réception confirmée',
  'app.plant.chain.licensed': 'Sous licence',
  'app.plant.chain.licensedN': 'Sous licence ({n})',
  'app.plant.date.chipNotAnchored': 'Dans un lot, pas encore ancré',
  'app.plant.date.chipChecked': 'Dans un lot · date vérifiée sur {network}',
  'app.plant.date.chipFailed': 'Dans un lot · horodatage non confirmé',
  'app.plant.date.chipReported': 'Dans un lot · ancrage signalé sur {network}',
  'app.plant.date.testNote': ' Un réseau de test peut être réinitialisé, et ses dates n’ont aucune valeur de preuve.',
  'app.plant.date.head':
    'Vérifié dans ce navigateur : le code de preuve de votre enregistrement est dans le lot {batch}, et le chemin qui en part mène à la racine du lot.',
  'app.plant.date.looked': '{head} Le registre indique que cette racine a été inscrite sur {network}.{test}',
  'app.plant.date.notLooked':
    '{head} Le registre indique que cette racine a été inscrite sur {network} ; cette page n’a pas consulté la transaction, elle n’est donc pas affichée comme ancrée. Consultez-la sur le réseau avant de vous fier à la date.{test}',
  'app.plant.date.title': 'Date sur Midnight',
  'app.plant.date.notInBatch':
    'Scellé sur votre appareil et conservé sur {server}. Il n’est pas encore dans un lot, il n’est donc pas ancré. Nous ancrons les enregistrements ensemble, par lots (à la main pour l’instant, cela peut donc prendre du temps), pour qu’une seule transaction en couvre beaucoup et que vous n’ayez jamais besoin de portefeuille. D’ici là, sa date repose sur les données de ce registre.',
  'app.plant.date.inBatchNotAnchored':
    'Vérifié dans ce navigateur : le code de preuve de votre enregistrement est dans le lot {batch}, qui n’a pas encore été ancré. Quand il le sera, la preuve gagnera une référence à la transaction. Rien ne change dans votre enregistrement.',
  'app.plant.date.batchLine': 'lot {batch}',
  'app.plant.date.rootLine': 'racine {root}…',
  'app.plant.date.txChecked': 'tx (vérifiée sur Midnight) {tx}',
  'app.plant.date.txReported': 'tx (signalée par le registre) {tx}',
  'app.plant.date.downloadProof': 'Télécharger la preuve d’inclusion',
  'app.plant.date.downloadStamp': 'Télécharger le fichier d’horodatage Bitcoin',
  'app.plant.date.openExplorer': 'Ouvrir l’explorateur de {network}',
  'app.plant.date.fileConfirmed':
    'Le fichier montre que votre enregistrement est dans ce lot. Cette page a trouvé la racine du lot dans la transaction indiquée sur Midnight. Chacun peut le refaire : le dossier de preuve contient tout le nécessaire et explique comment, et la page de vérification fait la même consultation dans son propre navigateur.',
  'app.plant.date.fileNotConfirmed':
    'Le fichier montre que votre enregistrement est dans ce lot. Il ne date l’enregistrement qu’une fois la racine du lot trouvée dans la transaction indiquée. Le dossier de preuve contient tout le nécessaire pour la consulter et explique comment, et la page de vérification fait la consultation dans le navigateur quand elle peut joindre Midnight.',
  'app.plant.date.stampPending':
    'Le fichier d’horodatage Bitcoin date la racine de ce lot sur Bitcoin avec l’outil gratuit OpenTimestamps : <code>ots verify root.bin.ots</code>, à côté du <link>fichier de la racine du lot (root.bin)</link>. Il est encore en attente : une promesse des serveurs d’horodatage, pas encore dans un bloc Bitcoin. Lancez `ots upgrade` dessus une fois que Bitcoin a confirmé.',
  'app.plant.date.stampInBlock':
    'Le fichier d’horodatage Bitcoin date la racine de ce lot sur Bitcoin avec l’outil gratuit OpenTimestamps : <code>ots verify root.bin.ots</code>, à côté du <link>fichier de la racine du lot (root.bin)</link>. Il est dans un bloc Bitcoin : il se vérifie donc avec Bitcoin seul.',
  'app.plant.history.title': 'Historique',
  'app.plant.history.correctionOf': 'Émis comme correction de {id}. Motif indiqué : {reason}.',
  'app.plant.history.sealed':
    'Le détenteur s’est engagé sur une description de ce matériel, datée par l’horloge de l’appareil qui l’a scellée.',
  'app.plant.history.received': 'Reçu',
  'app.plant.history.arrived': 'Arrivé par un transfert de {from}.',
  'app.plant.history.arrivedQty': 'Arrivé par un transfert de {from}, {qty}.',
  'app.plant.history.retracted': 'Attestation rétractée',
  'app.plant.history.retractedDetail':
    'L’attestant l’a retirée par une rétractation signée avec sa clé. Motif : {reason}. L’attestation reste dans l’enregistrement — rétracter n’est pas supprimer.',
  'app.plant.history.corrected': 'Corrigé',
  'app.plant.history.correctedDetail':
    'Un enregistrement ultérieur remplace celui-ci. Cet enregistrement est inchangé et reste conservé.',
  'app.plant.tree.none':
    'Aucune lignée enregistrée pour l’instant. Ajoutez les cultivars parents lors de l’enregistrement pour construire l’arbre généalogique.',
  'app.plant.tree.offspring': 'Descendance',
  'app.plant.tree.datedReports': 'Rapports ADN datés (pas une descendance)',
  'app.plant.action.nextStage': 'Ajouter la génération ou la sélection suivante',
  'app.plant.action.nextStageHint':
    'Un nouvel enregistrement avec cette plante comme parent. Scellez chaque étape au moment où elle a lieu.',
  'app.plant.dated.refused': 'Le registre ne l’a pas enregistré ({reason}). Rien n’a été daté. Réessayez.',
  'app.plant.dated.line': 'Rapport ADN daté : dans <link></link> ({status})',
  'app.plant.dated.dated': 'daté {value}',
  'app.plant.dated.action': 'Dater ce rapport ADN',
  'app.plant.dated.why':
    'Pour pouvoir montrer que ce rapport existait à cette date sans montrer les marqueurs à personne.',
  'app.plant.dated.seals':
    'Scelle un petit enregistrement contenant seulement le SHA-256 du rapport, son code de rapport de laboratoire et le nom du laboratoire tel que signé. Le rapport reste chez vous. Sa date vient quand son lot est daté.',
  'app.plant.dated.nameLabel': 'Nom du nouvel enregistrement',
  'app.plant.dated.nameHelp':
    'Verrouillé comme le reste. Un lien de vérification ne le porte que si vous l’activez. Modifiez-le si vous le souhaitez.',
  'app.plant.dated.elsewhere':
    'Ce rapport ADN est en train d’être daté dans un autre onglet ou une autre fenêtre. Attendez une minute, puis regardez de nouveau : il apparaîtra ici.',
  'app.plant.datingPage.title': 'Cet enregistrement date un rapport ADN pour <plant></plant>',
  'app.plant.datingPage.holds':
    'Il ne contient que le SHA-256 du rapport, son code de rapport de laboratoire et le nom du laboratoire tel que signé, jamais le rapport. Quand son lot est daté, il montre que le rapport existait à ce moment-là, sans montrer les marqueurs à personne.',
  'app.plant.datingPage.recordDated': 'Enregistrement daté : {value}',
  'app.plant.datingPage.backup':
    '<b>Enregistrez votre copie de secours.</b> La clé de cet enregistrement n’est que sur cet appareil.',
  'app.plant.datingPage.sealedBy': 'Scellé par',
  'app.plant.datingPage.notesAsSealed': 'Notes, telles que scellées',
  'app.plant.datingPage.bundleText':
    'L’enregistrement tel que scellé, sa preuve d’inclusion, la racine du lot et l’endroit où le lot a été inscrit, dans un seul .zip. Son verify.html le vérifie sans internet et sans rien de VeilCore.',
  'app.plant.anchor.title': 'Ancrer cet enregistrement sur {network}',
  'app.plant.anchor.anchored':
    'Ancré. Son identité sur la chaîne est {id}…, inscrite au bloc {block}{when}. L’identité est gardée dans ce navigateur et dans votre copie de secours, pas sur le serveur de VeilCore : vous la partagez en envoyant à quelqu’un un lien de vérification. C’est un réseau de test : il peut être réinitialisé, et ses dates n’ont aucune valeur de preuve.',
  'app.plant.anchor.chainClock': ' ({when}, selon l’horloge de la chaîne)',
  'app.plant.anchor.label': 'Ancrage',
  'app.plant.anchor.notAvailable': 'Indisponible dans cette version : {why}',
  'app.plant.anchor.intro':
    'Cela donne à l’enregistrement une identité sur le réseau au nom de laquelle seul ce navigateur peut agir. Votre navigateur construit et prouve lui-même la transaction ; VeilCore paie les frais du réseau et ne voit que ce que le réseau publie. Vous n’avez besoin ni de portefeuille ni de cryptomonnaie. Plus tard, vous pourrez montrer à qui vous le demande que votre clé existait à ce bloc et que vous la contrôlez toujours.',
  'app.plant.anchor.notKeeping':
    'Ce navigateur ne conserve pas ce qu’il enregistre (fenêtre privée, ou données du site bloquées). Les clés de l’enregistrement seraient perdues à la fermeture de cet onglet, sauf si vous téléchargez la copie de secours.',
  'app.plant.anchor.understand': 'Je comprends, et je téléchargerai la copie de secours',
  'app.plant.anchor.keysNotHere':
    'La clé de cette plante n’est pas dans ce navigateur. Récupérez-la depuis votre fichier de copie de secours : une nouvelle clé ne correspondrait pas à l’enregistrement scellé.',
  'app.plant.anchor.onlyNew':
    'Uniquement pour un enregistrement qui n’a jamais eu de clés : si vous l’avez déjà ancré, ou créé ses clés dans un autre navigateur, restaurez-les plutôt depuis votre copie de secours ci-dessus. De nouvelles clés seraient une autre identité.',
  'app.plant.anchor.makeKeys': '1. Créer les clés de cet enregistrement (dans ce navigateur)',
  'app.plant.anchor.anchorTest': '2. Ancrer sur le réseau de test',
  'app.plant.anchor.backupFirst': 'Télécharger d’abord la copie de secours',
  'app.plant.keys.restoredFor': 'Clés restaurées pour {id}.',
  'app.plant.keys.notNamed':
    'Restaurées, mais ce ne sont pas les clés que nomme cet enregistrement. Vérifiez que vous avez choisi le bon fichier.',
  'app.plant.keys.notIdentity':
    'Restaurées, mais ces clés ne sont pas l’identité sur la chaîne de cet enregistrement. Vérifiez que vous avez choisi le bon fichier.',
  'app.plant.keys.restored': 'Clés restaurées dans ce navigateur.',
  'app.plant.keys.removeBacked':
    'Retirer les clés de cet enregistrement de ce navigateur ? Vous pourrez les restaurer depuis votre fichier de copie de secours.',
  'app.plant.keys.removeUnbacked':
    'Vous n’avez PAS téléchargé de sauvegarde de ces clés. Si vous les retirez, ce navigateur ne les reprendra pas, et seul votre fichier de secours, restauré dans un nouveau navigateur, peut les ramener. Les retirer quand même ?',
  'app.plant.keys.title': 'Clés de l’enregistrement',
  'app.plant.keys.holds':
    'Ce navigateur contient les deux secrets qui prouvent que vous détenez cet enregistrement sur la chaîne. Une copie part aussi dans la boîte verrouillée de l’enregistrement sur VeilCore, que seule la clé qui verrouille vos enregistrements ouvre. Effacer ce navigateur les supprime ici ; restaurer votre sauvegarde les ramène.',
  'app.plant.keys.noBackup': 'Pas encore de sauvegarde. Téléchargez-la et gardez-la hors ligne.',
  'app.plant.keys.downloadAgain': 'Télécharger de nouveau la copie de secours',
  'app.plant.keys.download': 'Télécharger la copie de secours (secrète)',
  'app.plant.keys.remove': 'Retirer de ce navigateur',
  'app.plant.keys.notHeld':
    'Ce navigateur n’a pas les clés de cet enregistrement. Si vous les avez créées ailleurs, restaurez-les depuis votre fichier de copie de secours.',
  'app.plant.keys.restore': 'Restaurer les clés depuis une copie de secours',
  'app.plant.bundle.download': 'Télécharger le dossier de preuve',
  'app.plant.bundle.chooseOrUntick': 'Choisissez le fichier du rapport ADN, ou décochez la case.',
  'app.plant.bundle.tooBig': '{name} dépasse 200 Mo : il n’a donc pas été lu.',
  'app.plant.bundle.intro':
    'Un seul fichier avec tout ce qu’il faut pour vérifier la date de cet enregistrement sans VeilCore : l’enregistrement tel que scellé, la preuve qu’il est dans un lot daté, l’endroit où ce lot a été inscrit, et une page qui fait les vérifications hors ligne. Il contient aussi un résumé d’une page à imprimer pour un avocat ou un examinateur, et un exemple de texte pour une déclaration écrite (pas un conseil juridique). Un README à l’intérieur dit ce qu’il montre et ce qu’il ne montre pas.',
  'app.plant.bundle.notSealed':
    'Cet enregistrement a été scellé avant que ses détails soient conservés sous une forme vérifiable par tous : aucun dossier ne peut donc être créé pour lui.',
  'app.plant.bundle.includeKey': 'Inclure la clé de l’enregistrement.',
  'app.plant.bundle.keyIs':
    '(La clé de l’enregistrement est l’identifiant public de la clé créée pour cette plante quand vous l’avez scellée. Sa partie secrète reste dans votre copie de secours et ne va jamais dans le dossier.)',
  'app.plant.bundle.keyWith':
    'Avec elle, quiconque a le dossier peut relier cet enregistrement à sa clé, et à tout ce que fait cette clé sur le réseau. Ne l’incluez pas sauf si on en a besoin.',
  'app.plant.bundle.keyNotHere':
    'La clé n’est pas dans ce navigateur. Ouvrez ici votre copie de secours pour l’inclure.',
  'app.plant.bundle.includeLab':
    'Inclure le fichier du rapport ADN. Sans lui, le dossier ne contient que le code du rapport, pas ce qu’il dit.',
  'app.plant.bundle.chooseLab': 'Choisir le fichier du rapport ADN',
  'app.plant.bundle.checkedAgainst': 'Il est comparé à celui enregistré sur cette plante avant d’être ajouté.',
  'app.plant.bundle.labFileAria': 'Fichier du rapport ADN',
  'app.plant.bundle.downloaded':
    '{name} téléchargé. Ouvrez le verify.html qu’il contient pour le vérifier, ou EXAMINER-SUMMARY.html pour imprimer un résumé.',
  'app.plant.bundle.making': 'Création…',
  'app.plant.bundle.downloadButton': 'Télécharger',
  'app.plant.cert.intro':
    'Pour vos dossiers et votre avocat : l’enregistrement scellé, une vérification récente qu’il n’a pas changé, s’il est ancré, si un rapport ADN le lie à la plante, tout accusé de réception de laboratoire et les licences en vigueur. Il contient les détails de l’enregistrement, mais ni données génétiques ni fichiers de laboratoire. Le QR code ouvre la page de vérification publique de l’enregistrement.',
  'app.plant.cert.jsonDone': 'Résumé (JSON) téléchargé.',
  'app.plant.cert.pngDone': 'Certificat téléchargé.',
  'app.plant.cert.pngFailed': 'Impossible de créer l’image du certificat.',
  'app.plant.cert.linkCopied': 'Lien de vérification copié.',
  'app.plant.cert.copyLink': 'Copier le lien de vérification',
  'app.plant.cert.downloadPng': 'Télécharger (PNG)',
  'app.plant.cert.downloadJson': 'Télécharger le résumé (JSON)',
  'app.plant.cert.continue': 'Continuer : choisir ce que voient les autres',
  'app.plant.check.title': 'Vérifier qu’un rapport correspond à cet enregistrement',
  'app.plant.check.intro':
    'Choisissez un fichier de rapport de laboratoire pour voir si c’est celui associé à un enregistrement que vous détenez.',
  'app.plant.check.forYou':
    'Cette vérification se fait uniquement dans votre navigateur et n’envoie rien : elle est donc pour vous. Elle montre que vous avez un fichier correspondant au rapport associé à un enregistrement. Elle ne montre pas qui détient la plante, et personne d’autre ne peut la vérifier d’ici. Les autres vérifient un enregistrement sur sa page de vérification, et sa date une fois l’enregistrement ancré.',
  'app.plant.check.tap': 'Touchez pour choisir le rapport de laboratoire',
  'app.plant.check.drag': 'Glissez le rapport de laboratoire ici, ou cliquez pour le choisir',
  'app.plant.check.hint': 'Lu et code calculé sur place, jamais envoyé.',
  'app.plant.check.none':
    'Aucun de vos enregistrements n’a ce rapport de laboratoire. Enregistrez-le d’abord sur la bonne plante, puis vérifiez de nouveau.',
  'app.plant.check.found': 'Correspondance trouvée.',
  'app.plant.check.foundSub': 'Le code de ce fichier a été calculé dans votre navigateur ; il n’a pas été envoyé.',
  'app.plant.check.matches': 'Ce fichier correspond au rapport associé à {name}.',
  'app.plant.check.meaning':
    'Enregistrement {id}. Une correspondance signifie que le fichier est, octet pour octet, celui que vous avez associé ; cela ne dit rien de la génétique ni de qui détient la plante.',
  'app.plant.check.checking': 'Vérification sur votre appareil…',
  'app.plant.check.checkIt': 'Vérifier',
  'app.plant.fix.field.cultivarName': 'nom du cultivar',
  'app.plant.fix.field.breederName': 'obtenu par',
  'app.plant.fix.field.breedingMethod': 'méthode de sélection',
  'app.plant.fix.field.claimedCreationDate': 'date de création déclarée',
  'app.plant.fix.field.notes': 'notes',
  'app.plant.fix.field.internalReference': 'référence interne',
  'app.plant.fix.field.parents': 'parents',
  'app.plant.fix.field.attestations': 'attestations',
  'app.plant.fix.field.sealedAt': 'date de scellement',
  'app.plant.fix.field.holder': 'détenteur',
  'app.plant.fix.c.cosmetic.cosmetic':
    'Rien en aval n’est affecté. La descendance garde ses vérifications d’ascendance, et les contrats restent valables.',
  'app.plant.fix.c.cosmetic.material':
    'La descendance n’est pas affectée : le matériel n’a pas changé. Mais toute personne ayant un contrat sur cet enregistrement doit le savoir, car les conditions peuvent porter sur ce que vous avez modifié.',
  'app.plant.fix.c.material.cosmetic':
    'Quiconque s’appuie sur la descendance de cet enregistrement doit vérifier de nouveau. Les contrats existants ne sont pas affectés.',
  'app.plant.fix.c.material.material':
    'La descendance et les contrats existants sont tous deux affectés. L’ascendance de la descendance devra être vérifiée de nouveau, et les autres parties à vos contrats devront être prévenues.',
  'app.plant.fix.open': 'Corriger cet enregistrement',
  'app.plant.fix.title': 'Corriger {id}',
  'app.plant.fix.intro':
    'Cet enregistrement reste exactement tel quel. Une correction crée un nouvel enregistrement qui le remplace, et les deux restent conservés. Une correction n’écrase rien et ne supprime rien : c’est ce qui garde l’original utilisable comme preuve.',
  'app.plant.fix.name': 'Nom du cultivar',
  'app.plant.fix.bredBy': 'Obtenu par',
  'app.plant.fix.notes': 'Notes',
  'app.plant.fix.does': 'Ce que fait cette correction',
  'app.plant.fix.workedOut':
    'C’est déterminé à partir des champs que vous avez modifiés. Ni vous ni nous ne pouvons le choisir ; sinon, toute correction semblerait anodine.',
  'app.plant.fix.why': 'Pourquoi corrigez-vous ceci ?',
  'app.plant.fix.whyHelp':
    'Conservé avec la correction dans vos enregistrements. La vue publique montre quels champs ont changé, pas ce motif.',
  'app.plant.fix.check': 'Voir ce que cela affecte',
  'app.plant.fix.notSaved': 'La correction n’a pas pu être enregistrée.',
  'app.plant.fix.issue': 'Émettre la correction',
  'app.plant.att.linked': '{date} · lié à votre livraison {id}',
  'app.plant.att.verified': 'La signature a été vérifiée dans ce navigateur.',
  'app.plant.att.unverifiedRetraction':
    ' Le registre signale aussi une rétractation qui n’est pas signée par le laboratoire ; elle est donc ignorée ici.',
  'app.plant.att.codeUsed':
    'Quelqu’un a utilisé votre code laboratoire, mais aucun laboratoire n’a signé d’accusé de réception pour lui. Un code utilisé ne montre pas qui a pris l’échantillon.',
  'app.plant.att.noReceipt':
    'Aucun laboratoire n’a encore signé d’accusé de réception pour cette plante. Un enregistrement que vous seul soutenez est une preuve plus faible qu’un enregistrement signé par un laboratoire. Envoyez un échantillon à un laboratoire : son accusé de réception est signé avec sa clé, pas la vôtre.',
  'app.plant.att.others':
    'D’autres signatures nomment cet enregistrement : {n}, non liées à vos livraisons. N’importe qui peut signer une déclaration sur un code de preuve public : elles ne comptent donc pas comme accusé de réception.',
  'app.plant.att.title': 'Signatures concernant cet enregistrement',
  'app.plant.att.nobody':
    'Personne d’autre n’a encore confirmé cet enregistrement. Un enregistrement que vous seul soutenez est une preuve plus faible qu’un enregistrement confirmé par une seconde partie. Envoyez le matériel à un laboratoire : sa confirmation est inscrite sous sa clé, pas la vôtre.',
  'app.plant.att.legacy':
    'Livraison prise le {date} par une personne détenant le code émis par l’expéditeur{addressed}. Inscrit avant l’existence des signatures : cela établit qu’une seconde partie a pris livraison, sans prouver qui elle est.',
  'app.plant.att.addressed': ', adressée à {who}',
} satisfies Partial<AppTranslation>;
