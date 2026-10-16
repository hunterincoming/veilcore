// French (vous). DRAFT: machine-assisted, to be checked by a fluent speaker before publishing
// (docs/translations/README.md). Terms as in ../../fr.ts.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const lab = {
  'app.signer.lead.receipt': 'Accusé de réception signé par {who}',
  'app.signer.lead.signed': 'Signé par {who}',
  'app.signer.lead.signedLower': 'signé par {who}',
  'app.signer.lead.by': 'de {who}',
  'app.signer.certificateNo': ' (certificat {no})',
  'app.signer.licenseNo': ' (licence {no})',
  'app.signer.matchBefore': 'L’opérateur de VeilCore a rapproché ce nom de ',
  'app.signer.matchAfter': '{number} le {date}.',
  'app.signer.disclaimer': 'VeilCore ne se porte pas garant du travail du laboratoire.',
  'app.signer.rest': ' {before}{host}{after} {disclaimer}',
  'app.signer.text': '{lead}.{rest}',
  'app.signer.keyNamed': 'une clé nommée « {name} » (nom non vérifié)',
  'app.signer.keyUnnamed': 'une clé que personne n’a nommée',
  'app.lab.saved.lab': 'enregistré · correspond au rapport signé du laboratoire',
  'app.lab.saved.self': 'enregistré · aucune signature de laboratoire ne correspond',
  'app.lab.saved.replacedNewer': 'remplacé par le laboratoire — enregistrez le rapport corrigé',
  'app.lab.saved.replacedNone': 'remplacé par le laboratoire · aucun rapport en vigueur de {lab}',
  'app.lab.saved.withdrawn': 'retiré par le laboratoire',
  'app.lab.theLab': 'le laboratoire',
  'app.lab.onDay': ' le {date}',
  'app.lab.replacedTail': 'Le détenteur n’a pas encore enregistré le rapport corrigé.',
  'app.lab.withdrawnTail': 'C’est toujours le fichier enregistré ici ; le laboratoire ne le soutient plus.',
  'app.lab.sentence.none': 'Aucun rapport ADN n’est enregistré sur cette plante.',
  'app.lab.sentence.lab':
    'Le rapport ADN enregistré correspond à un rapport de laboratoire {lead}, par son SHA-256 (signature vérifiée dans ce navigateur).{rest}',
  'app.lab.sentence.self':
    'Un fichier de rapport ADN est enregistré sur cette plante. Aucune signature de laboratoire ne correspond : c’est la propre déclaration du détenteur.',
  'app.lab.sentence.replaced':
    'Le rapport ADN enregistré sur cette plante a été remplacé par le laboratoire{on} par un rapport corrigé. {tail}',
  'app.lab.sentence.withdrawn':
    'Le rapport ADN enregistré sur cette plante a été retiré par le laboratoire{on}. {tail}',
  'app.lab.custody.sealIntact': 'scellé intact',
  'app.lab.custody.sealNotIntact': 'scellé non intact',
  'app.lab.custody.noSeal': 'sans scellé',
  'app.lab.custody.sample': 'Échantillon {v}',
  'app.lab.custody.seal': 'scellé {v}',
  'app.lab.custody.takenFromOn': 'prélevé sur {from} le {on}',
  'app.lab.custody.takenFrom': 'prélevé sur {from}',
  'app.lab.custody.takenOn': 'prélevé le {on}',
  'app.lab.custody.witness': 'témoin {v} (VeilCore ne le vérifie pas)',
  'app.lab.custody.comma': ', ',
  'app.lab.custody.arrived': 'arrivé le {v}',
  'app.lab.custody.condition': 'état : {v}',
  'app.lab.custody.labNo': 'n° de laboratoire {v}',
  'app.lab.custody.idDiffers': 'L’identifiant d’échantillon diffère : envoyé {sent}, reçu {got}',
  'app.lab.custody.sealDiffers': 'Le numéro de scellé diffère : envoyé {sent}, reçu {got}',
  'app.lab.custody.idNotConfirmed': 'Identifiant d’échantillon non confirmé à l’arrivée (envoyé {sent})',
  'app.lab.custody.sealNotConfirmed': 'Numéro de scellé non confirmé à l’arrivée (envoyé {sent})',
  'app.lab.custody.noSealOnArrival': 'Pas de scellé à l’arrivée (envoyé avec le scellé {sent})',
  'app.lab.custody.sealNotIntactOnArrival': 'Scellé non intact à l’arrivée',
  'app.lab.custody.line': '{v}.',
  'app.lab.custody.sent': 'Envoyé : {v}',
  'app.lab.custody.received': 'Reçu : {v}',
  'app.lab.custody.notCovered': 'L’accusé de réception du laboratoire ne couvre pas les détails de l’échantillon.',
  'app.lab.custody.changed':
    'Le laboratoire a modifié ses informations d’arrivée après avoir signé : son accusé de réception ne les couvre donc pas.',
  'app.lab.custody.bothMatch':
    'L’identifiant d’échantillon et le numéro de scellé correspondent à ce qui a été envoyé.',
  'app.lab.custody.idMatches': 'L’identifiant d’échantillon correspond à ce qui a été envoyé.',
  'app.lab.custody.sealMatches': 'Le numéro de scellé correspond à ce qui a été envoyé.',
  'app.lab.custody.noDifference':
    'Aucune différence entre les détails de l’échantillon envoyés et ceux que le laboratoire a notés à l’arrivée.',
  'app.lab.custody.joinSentences': ' ',
  'app.signer.sep': ' ',
  'app.lab.strength.unsigned': 'Non signé',
  'app.lab.strength.unsignedWhy':
    'Enregistré mais non signé. C’est une affirmation au sujet d’une seconde partie, pas une déclaration de sa part.',
  'app.lab.strength.invalid': 'La signature ne se vérifie pas',
  'app.lab.strength.invalidWhy':
    'Rien ne montre que cette attestation vient de la clé qu’elle nomme. Traitez-la comme non attestée.',
  'app.lab.strength.retracted': 'Rétractée',
  'app.lab.strength.retractedWhy':
    'L’attestant l’a retirée le {date}, par une rétractation signée avec sa clé. Elle reste dans l’enregistrement — rétracter n’est pas supprimer.',
  'app.lab.strength.unverifiedRetraction':
    ' Le registre signale aussi une rétractation qui n’est pas signée par l’attestant ; elle est donc ignorée ici.',
  'app.lab.strength.matched': 'Signé · nom rapproché d’une liste publique',
  'app.lab.strength.matchedWhy': '{text} La signature a été vérifiée dans ce navigateur.{acc}{unverified}',
  'app.lab.strength.accreditation':
    ' Ils indiquent une accréditation {scheme} délivrée par {by} ; confirmez-la auprès de {by}.',
  'app.lab.strength.expired': ' Une vérification antérieure de ce nom a expiré.',
  'app.lab.strength.notChecked': 'Signé · nom non vérifié',
  'app.lab.strength.anyName':
    '{text}. N’importe qui peut enregistrer une clé sous n’importe quel nom : cela ne montre donc pas qui a signé.{expired}',
  'app.lab.strength.unregistered':
    'Signé par une clé que personne n’a enregistrée. La signature est valide ; on ne sait pas qui détient la clé.',
  'app.lab.field.sampleId': 'Identifiant d’échantillon',
  'app.lab.field.sealNumber': 'Numéro de scellé',
  'app.lab.field.takenFrom': 'Prélevé sur',
  'app.lab.field.takenOn': 'Prélevé le',
  'app.lab.field.witness': 'Témoin',
  'app.lab.field.arrivedOn': 'Arrivé le',
  'app.lab.field.condition': 'État',
  'app.lab.field.labRef': 'N° d’enregistrement',
  'app.lab.field.sealIntact': 'Scellé intact',
  'app.lab.field.noHiddenCondition':
    '{label} ne peut pas contenir de tabulations ni de caractères cachés (comme des marques de direction).',
  'app.lab.field.noHidden':
    '{label} ne peut pas contenir de sauts de ligne, de tabulations ni de caractères cachés (comme des marques de direction).',
  'app.lab.field.realDate': '{label} doit être une vraie date.',
  'app.lab.field.tooLong': '{label} peut compter au plus {limit} caractères.',
  'app.lab.err.noSuch': 'Aucune livraison n’a ce code laboratoire. Vérifiez que vous avez copié tout le code.',
  'app.lab.err.used': 'Ce code laboratoire a déjà été utilisé.',
  'app.lab.err.noMatch': 'Ce code laboratoire ne correspond pas. Demandez à l’obtenteur le code qu’on lui a donné.',
  'app.lab.err.tooOld': 'Ce code laboratoire est trop ancien. Demandez à l’obtenteur d’en créer un nouveau.',
  'app.lab.err.gone':
    'L’enregistrement de l’obtenteur pour ce code laboratoire n’existe plus. Demandez-lui un nouveau code.',
  'app.lab.err.changed':
    'L’obtenteur a modifié l’enregistrement de cette plante après avoir créé le code laboratoire. Demandez-lui un nouveau code.',
  'app.lab.err.notReceived': 'Personne n’a encore utilisé ce code laboratoire.',
  'app.lab.err.onlyLab': 'Seul le laboratoire qui a utilisé ce code laboratoire peut faire cela.',
  'app.lab.err.tooMany':
    'Vous avez trop de codes laboratoire que personne n’a encore utilisés. Attendez que certains soient utilisés, ou que les plus anciens expirent.',
  'app.lab.send.ready': 'Prêt à envoyer',
  'app.lab.send.title': 'Envoyer {name}',
  'app.lab.send.give':
    'Donnez ce code laboratoire à {handle}. Une fois saisi, il pourra signer que l’échantillon est arrivé.',
  'app.lab.send.giveWithResults':
    'Donnez ce code laboratoire à {handle}. Une fois saisi, il pourra signer que l’échantillon est arrivé, et renvoyer un rapport de laboratoire que vous seul pourrez ouvrir.',
  'app.lab.send.copied': 'Copié',
  'app.lab.send.copy': 'Copier le code',
  'app.lab.send.dontWrite':
    '<b>Envoyez-le par message ou par e-mail. Ne l’écrivez pas sur le colis :</b> quiconque a ce code laboratoire peut confirmer la livraison.',
  'app.lab.send.labWillCheck': '<b>Le laboratoire vérifiera :</b> {line}.',
  'app.lab.send.nothingYet':
    'Rien n’a encore changé. La page de votre plante affiche « en attente » jusqu’à ce que le code soit saisi, et peut réafficher ce code. Il se colle dans le champ de l’accueil de VeilCore.',
  'app.lab.send.intro':
    'Le destinataire obtient son propre enregistrement de ce qu’il a reçu, lié au vôtre. Quand il signe que c’est arrivé, c’est signé avec sa clé, pas la vôtre : une seconde partie sur votre enregistrement.',
  'app.lab.send.who': 'À qui l’envoyez-vous ?',
  'app.lab.send.whoHelp': 'Un nom ou un pseudonyme, pour que vous sachiez tous deux de quelle livraison il s’agit.',
  'app.lab.send.quantity': 'Quantité (facultatif)',
  'app.lab.send.quantityPlaceholder': 'p. ex. 10 boutures',
  'app.lab.send.note': 'Note pour le laboratoire (facultatif)',
  'app.lab.send.noteHelp': 'Seul le laboratoire la voit, une fois le code saisi.',
  'app.lab.send.sample': 'L’échantillon (facultatif)',
  'app.lab.send.sampleHelp':
    'Le laboratoire vérifie ces informations à l’arrivée et confirme ou corrige chacune. Son accusé de réception signé couvre ce que vous avez écrit et ce qu’il a constaté.',
  'app.lab.send.sampleId': 'Identifiant d’échantillon / étiquette du tube ou du sachet',
  'app.lab.send.sealNumber': 'Numéro de scellé ou de sachet',
  'app.lab.send.takenFromHelp': 'La plante mère ou l’étiquette de son emplacement.',
  'app.lab.send.witness': 'Témoin (facultatif)',
  'app.lab.send.witnessHelp': 'Qui l’a vu prélever et sceller. VeilCore ne le vérifie pas.',
  'app.lab.send.addSample': 'Ajouter l’étiquette et le scellé de l’échantillon (facultatif)',
  'app.lab.send.make': 'Créer un code pour le laboratoire',
  'app.lab.send.shareTitle': 'Code laboratoire pour {name}',
  'app.lab.send.share': 'Partager',
  'app.lab.send.hide': 'Masquer',
  'app.lab.send.showAgain': 'Réafficher le code',
  'app.lab.send.waiting': '<b>Envoyé à {handle}, en attente</b> depuis le {date}.',
  'app.lab.send.waitingSample': ' {line}.',
  'app.lab.send.otherBrowser':
    ' Ce code a été créé dans un autre navigateur et n’est pas dans celui-ci ; créez-en un nouveau s’il est perdu.',
  'app.lab.recv.statement': 'Un échantillon étiqueté « {label} »{qty} est arrivé{code}.',
  'app.lab.recv.unlabelled': 'sans étiquette',
  'app.lab.recv.statementQty': ' ({qty}, tel que l’obtenteur l’a écrit)',
  'app.lab.recv.statementCode': ' sous le code laboratoire {code}',
  'app.lab.recv.quoted': '« {v} »',
  'app.lab.recv.breederWrote': '<b>L’obtenteur a écrit :</b> {line}',
  'app.lab.recv.onArrival': '<b>À l’arrivée :</b> {line}',
  'app.lab.recv.aboutRecord': 'Au sujet de l’enregistrement {id} de l’obtenteur, empreinte',
  'app.lab.recv.pointing': 'Pointe vers votre enregistrement reçu',
  'app.lab.recv.signedByKey': 'Signé avec votre clé ({name})',
  'app.lab.recv.unnamed': 'sans nom',
  'app.lab.recv.howArrived': 'Comment il est arrivé',
  'app.lab.recv.checkTube':
    'Vérifiez le tube ou le sachet. Modifiez tout ce qui ne correspond pas à ce que l’obtenteur a écrit. Tout est facultatif.',
  'app.lab.recv.sampleIdOnArrival': 'Identifiant d’échantillon à l’arrivée',
  'app.lab.recv.sealOnArrival': 'Numéro de scellé à l’arrivée',
  'app.lab.recv.sealIntactQ': 'Scellé intact ?',
  'app.lab.recv.yes': 'Oui',
  'app.lab.recv.no': 'Non',
  'app.lab.recv.noSeal': 'Sans scellé',
  'app.lab.recv.arrivedHelp': 'Le jour où il vous est parvenu.',
  'app.lab.recv.conditionPlaceholder': 'p. ex. froid, sachet sec, racines intactes',
  'app.lab.recv.accession': 'Votre n° d’enregistrement',
  'app.lab.recv.accessionHelp': 'Figure sur votre accusé de réception, l’obtenteur le voit donc.',
  'app.lab.recv.differs':
    'Différent de ce que l’obtenteur a écrit. L’obtenteur voit ceci sur votre accusé de réception :',
  'app.lab.recv.exactly':
    'Votre clé peut signer un accusé de réception pour cette livraison. Voici exactement ce que dit l’accusé :',
  'app.lab.recv.fingerprintFrom':
    'L’empreinte vient du registre et correspond à ce qu’indique sa page publique pour {id}. Si l’obtenteur vous a donné une empreinte, comparez-la avant de signer.',
  'app.lab.recv.physically': 'J’ai physiquement reçu ce matériel.',
  'app.lab.recv.dontSign': 'Ne pas signer',
  'app.lab.recv.signWithKey': 'Signer avec ma clé',
  'app.lab.recv.turnAway':
    'Le refuser ? Rien n’est signé et VeilCore ne prévient pas l’obtenteur : informez-le vous-même.',
  'app.lab.recv.damaged': 'Il est arrivé endommagé',
  'app.lab.recv.wrongSample': 'Ce n’est pas le bon échantillon',
  'app.lab.recv.rejected': 'Reçu mais refusé (endommagé ou mauvais échantillon)',
  'app.lab.recv.nothingSigned': '{problems} Rien n’a été signé',
  'app.lab.recv.notSaved': 'vos informations d’arrivée n’ont pas été enregistrées ({error}), donc rien n’a été signé',
  'app.lab.recv.savedDifferent':
    'le registre a enregistré des détails d’échantillon différents de ceux de cet écran, donc rien n’a été signé. Rechargez la page et vérifiez-les de nouveau',
  'app.lab.recv.unlinked':
    'Votre accusé de réception est signé, mais n’a pas pu être lié à cette livraison ({error}) : l’obtenteur ne peut donc pas encore le voir. Réessayez, ou liez-le plus tard depuis la page de la plante.',
  'app.lab.recv.linkIntro':
    'Votre accusé de réception est signé. Liez-le à cette livraison pour que l’obtenteur le voie : jusque-là, sa page ne le compte pas, car n’importe qui peut signer une déclaration sur une plante, mais seule la personne qui a utilisé le code laboratoire peut en lier une à la livraison.',
  'app.lab.recv.linking': 'Liaison…',
  'app.lab.recv.setUpFirst':
    'Configurez d’abord la signature de votre laboratoire ; vous pourrez ensuite signer que cet échantillon est arrivé.',
  'app.lab.recv.checking': 'Vérification de l’enregistrement de l’obtenteur…',
  'app.lab.recv.notRecorded': 'Votre accusé de réception n’a pas été inscrit : {error}.',
  'app.lab.recv.noCodeHere': 'cette plante n’a pas de code laboratoire sur cet appareil',
  'app.lab.recv.receivedNotRecorded':
    'Livraison reçue, mais votre accusé de réception signé n’a pas été inscrit : {error}. Vous pourrez le signer plus tard depuis la page de la plante.',
  'app.lab.recv.title': 'Recevoir du matériel',
  'app.lab.recv.signTitle': 'Signer ce que vous avez reçu ?',
  'app.lab.recv.intro':
    'Saisissez le code laboratoire que l’obtenteur vous a donné. Vous obtenez votre propre enregistrement de ce que vous avez reçu, lié au sien, et le registre note qu’une personne détenant ce code a pris livraison. Si vous avez une clé de signature, vous voyez exactement ce que vous signeriez avant que quoi que ce soit ne soit signé.',
  'app.lab.recv.codeLabel': 'Code laboratoire',
  'app.lab.recv.missingLock':
    'Il manque la dernière partie de ce code ; vous pouvez recevoir l’échantillon, mais pas renvoyer de rapport tant que vous n’avez pas le code complet.',
  'app.lab.recv.refused': 'La livraison est reçue et votre enregistrement créé. {reason}',
  'app.lab.recv.onlyConfirm':
    'Ne confirmez que ce que vous avez réellement reçu. C’est une déclaration sur laquelle d’autres s’appuieront.',
  'app.lab.recv.receiveIt': 'Le recevoir',
  'app.lab.recv.goToRecord': 'Aller à l’enregistrement',
  'app.lab.key.role.laboratory': 'Laboratoire',
  'app.lab.key.role.inspector': 'Inspecteur',
  'app.lab.key.role.registry': 'Registre',
  'app.lab.key.role.breeder': 'Obtenteur',
  'app.lab.key.role.other': 'Autre',
  'app.lab.key.couldNotCreate': 'Impossible de créer une clé.',
  'app.lab.key.notPublished':
    'Votre clé est enregistrée dans ce navigateur mais n’a pas été publiée : {error}. Réessayez.',
  'app.lab.key.yours': 'Votre clé de signature',
  'app.lab.key.setUp': 'Configurez votre clé de signature',
  'app.lab.key.notPublishedYet':
    ' · pas encore publiée : d’ici là, personne ne peut rattacher vos signatures à ce nom.',
  'app.lab.key.publishAgain': 'Publier de nouveau',
  'app.lab.key.publicKey': 'Clé publique',
  'app.lab.key.privateWarning':
    'Votre clé privée est stockée dans l’espace de stockage de ce navigateur, non chiffrée, et nulle part ailleurs. C’est suffisant pour essayer. Tout ce qui peut s’exécuter sur ce site, ou une extension de navigateur qui y a accès, pourrait la lire. Si vous la perdez, vous ne pourrez plus rien signer de nouveau ; ce que vous avez signé reste valide, alors sauvegardez-la en lieu sûr. Un laboratoire qui l’utiliserait réellement signerait dans ses propres systèmes : voir le <link>guide d’intégration</link>.',
  'app.lab.key.downloadBackup': 'Télécharger la copie de secours de la clé',
  'app.lab.key.intro':
    'Quand vous confirmez avoir reçu du matériel, ou signez un rapport, c’est signé avec une clé que vous seul détenez. Cela devient votre déclaration, pas quelque chose que nous avons inscrit en votre nom. La clé est créée dans ce navigateur ; seuls sa moitié publique, votre nom et l’accréditation que vous indiquez sont publiés.',
  'app.lab.key.name': 'Nom',
  'app.lab.key.nameHelp': 'Comment vous apparaissez à quiconque vérifie un enregistrement que vous avez signé.',
  'app.lab.key.role': 'Rôle',
  'app.lab.key.accreditation': 'Accréditation (facultatif)',
  'app.lab.key.accreditationHelp':
    'Nous l’inscrivons sans jamais la vérifier. Quiconque vérifie votre signature peut la confirmer directement auprès de l’organisme accréditeur ; c’est pourquoi vous le nommez.',
  'app.lab.key.scheme': 'Référentiel',
  'app.lab.key.stateLicense': 'Licence d’État',
  'app.lab.key.accNumber': 'Numéro d’accréditation',
  'app.lab.key.accreditor': 'Organisme accréditeur',
  'app.lab.key.accreditorPlaceholder': 'p. ex. A2LA, PJLA, agence d’État',
  'app.lab.key.create': 'Créer ma clé',
  'app.lab.results.replacedNewer':
    '<b>Le rapport ADN enregistré sur cette plante a été remplacé par le laboratoire.</b> Enregistrez le rapport corrigé : ouvrez-le, puis touchez « L’enregistrer sur cette plante ».',
  'app.lab.results.replacedNone':
    '<b>Le rapport ADN enregistré sur cette plante a été remplacé par le laboratoire.</b> Aucun rapport en vigueur de {lab} : l’original a été remplacé et la correction retirée.',
  'app.lab.results.withdrawn':
    '<b>Le rapport de laboratoire enregistré sur cette plante a été retiré par le laboratoire.</b> Il reste enregistré jusqu’à ce que vous en enregistriez un autre, et votre certificat et vos liens indiquent qu’il a été retiré.',
  'app.lab.results.withdrawnNewer':
    '<b>Le rapport de laboratoire enregistré sur cette plante a été retiré par le laboratoire.</b> Il reste enregistré jusqu’à ce que vous en enregistriez un autre, et votre certificat et vos liens indiquent qu’il a été retiré. Un rapport plus récent est arrivé : ouvrez-le, puis enregistrez-le sur cette plante.',
  'app.lab.results.unsigned':
    'Aucune signature de laboratoire ne correspond exactement à ce fichier. Il s’est ouvert avec votre clé, mais ne le traitez pas comme le rapport du laboratoire tant qu’il ne l’a pas signé.',
  'app.lab.results.noReceipt':
    '<b>Signé par {who}, mais le laboratoire n’a pas signé d’accusé de réception pour cette livraison.</b> Le fichier correspond à la signature de cette clé, mais rien ne montre que cette clé ait jamais eu votre échantillon. Interrogez le laboratoire avant de vous y fier.',
  'app.lab.results.otherKey':
    '<b>Signé par {who}, mais pas par la clé qui a signé l’accusé de réception de cette livraison.</b> Le fichier correspond à la signature de cette clé, mais rien ne montre que cette clé ait jamais eu votre échantillon. Interrogez le laboratoire avant de vous y fier.',
  'app.lab.results.signed':
    '<b>{lead}</b> (clé {key}), signature vérifiée dans ce navigateur. La même clé a signé l’accusé de réception de cette livraison.',
  'app.lab.results.anyName':
    ' N’importe qui peut enregistrer une clé sous n’importe quel nom : le nom ne montre donc pas qui a signé.',
  'app.lab.results.locked':
    'Verrouillés pour que vous seul puissiez les ouvrir, avec la clé de cette plante tirée de votre copie de secours. VeilCore ne peut pas les lire.',
  'app.lab.results.noKey':
    'La clé de cette plante n’est pas sur cet appareil : ses rapports de laboratoire ne peuvent donc pas être ouverts ici. <link>Récupérez d’abord vos plantes depuis votre copie de secours</link>.',
  'app.lab.results.gotIt': 'Compris',
  'app.lab.results.whatOthersSee':
    '<b>Ce que les autres peuvent voir.</b> La signature du laboratoire est publique ; le rapport ne l’est pas. Quiconque a un lien vers la page de vérification de cette plante voit qu’un rapport de laboratoire la concernant a été signé, le SHA-256 du fichier du rapport et le nom sous lequel la clé du laboratoire est enregistrée : marqué « nom non vérifié » sauf si l’opérateur de VeilCore l’a rapproché d’une liste publique de licences ou d’accréditations. Si vous enregistrez le rapport sur cette plante et partagez « Si un rapport ADN est enregistré » dans Montrer à quelqu’un, on voit aussi que le fichier enregistré y correspond.',
  'app.lab.results.noCurrent':
    'Aucun rapport en vigueur de {lab} : l’original a été remplacé et la correction retirée.',
  'app.lab.results.looking': 'Recherche des rapports de laboratoire…',
  'app.lab.results.nothingYet':
    'Rien pour l’instant. Quand un laboratoire auquel vous avez envoyé cette plante enverra un rapport de laboratoire, il apparaîtra ici.',
  'app.lab.results.from': 'De {lab} · {id}',
  'app.lab.results.sent': 'Envoyé {when}',
  'app.lab.results.corrects': ' · corrige {id}',
  'app.lab.results.savedHere': ' · enregistré sur cette plante',
  'app.lab.results.withdrawnOn': 'Retiré par le laboratoire le {date}',
  'app.lab.results.stillSaved': '. Il est toujours enregistré sur cette plante.',
  'app.lab.results.replacedByNewer': 'Remplacé par un rapport de laboratoire plus récent',
  'app.lab.results.opening': 'Ouverture…',
  'app.lab.results.fileLine': '{type} · SHA-256 du fichier {sha} · se télécharge sous le nom « {name} »',
  'app.lab.results.download': 'Télécharger le fichier',
  'app.lab.results.replacesSaved':
    'Un rapport de laboratoire est déjà enregistré sur cette plante. Enregistrer celui-ci le remplace ; vous confirmez à l’écran suivant.',
  'app.lab.facts.title': 'Ce qui l’accompagnait',
  'app.lab.facts.labelled': 'Étiqueté « {name} », obtenu par {by}',
  'app.lab.facts.unknown': 'inconnu',
  'app.lab.facts.code': ' · code laboratoire {code}',
  'app.lab.facts.arrived': ' · arrivé le {date}',
  'app.lab.facts.quantity': '<b>Quantité, telle que l’obtenteur l’a écrite :</b> {qty}',
  'app.lab.facts.notGiven': 'non indiquée',
  'app.lab.facts.note': '<b>Note de l’obtenteur :</b> {note}',
  'app.lab.facts.none': 'aucune',
  'app.lab.facts.onArrival': '<b>À l’arrivée (votre accusé de réception) :</b> {line}',
  'app.lab.facts.ref': 'Votre référence / n° d’enregistrement',
  'app.lab.facts.refHelp': 'Vous seul le voyez. La recherche de l’accueil le retrouve.',
  'app.lab.facts.save': 'Enregistrer',
  'app.lab.out.couldntLoad': 'Impossible de charger ce que vous avez envoyé : {error}.',
  'app.lab.out.offHere':
    'Les rapports de laboratoire ne peuvent pas encore être renvoyés via VeilCore sur ce réseau. Envoyez-le à l’obtenteur comme d’habitude.',
  'app.lab.out.noDelivery':
    'Cette plante n’est pas arrivée par une livraison : il n’y a personne à qui renvoyer un rapport de laboratoire.',
  'app.lab.out.otherDelivery': 'Ce code laboratoire correspond à une autre livraison.',
  'app.lab.out.noLock':
    'Ce code laboratoire ne contient pas de verrou. Demandez à l’obtenteur de le renvoyer depuis l’application.',
  'app.lab.out.tooBig': 'Ce fichier dépasse 14 Mo.',
  'app.lab.out.withdrawFailed': 'Rien n’a été retiré : votre signature n’a pas pu être retirée ({error}).',
  'app.lab.out.fileStillThere':
    'Votre signature est retirée, mais le fichier est toujours chez le registre ({error}). Touchez de nouveau Retirer.',
  'app.lab.out.withdrawnNote': 'Retiré. L’obtenteur voit que vous l’avez retiré, et ne peut plus l’ouvrir.{extra}',
  'app.lab.out.spaced': ' {v}',
  'app.lab.out.correctionWarning':
    'L’original reste remplacé. L’obtenteur n’aura aucun rapport valide de votre part tant que vous n’en enverrez pas un.',
  'app.lab.out.couldntCheck': 'Rien n’a été signé : impossible de vérifier ce que vous avez déjà envoyé ({error}).',
  'app.lab.out.notConfirmed':
    'L’enregistrement de l’obtenteur n’a pas pu être confirmé dans le registre public : rien n’a donc été signé.',
  'app.lab.out.notRecorded': 'Rien n’a été envoyé : votre signature n’a pas été inscrite ({error}).',
  'app.lab.out.noAnswer': 'pas de réponse',
  'app.lab.out.didntSendUndoFailed':
    'Le fichier n’a pas été envoyé ({error}), et le retrait de votre signature a aussi échoué ({undo}). Réessayez l’envoi ; si l’échec persiste, retirez-la depuis la page de votre clé de signature.',
  'app.lab.out.didntSend':
    'Le fichier n’a pas été envoyé ({error}). Votre signature a été retirée : rien ne pointe donc vers un fichier que l’obtenteur n’a jamais reçu. Réessayez.',
  'app.lab.out.oldSigLeft': 'votre signature n’a pas pu être retirée ({error})',
  'app.lab.out.oldFileLeft': 'son fichier est toujours chez le registre ({error})',
  'app.lab.out.oldLeft':
    'Le fichier corrigé a été envoyé, mais l’ancien n’est pas entièrement retiré : {left}. Retirez l’ancien depuis cette page.',
  'app.lab.out.andJoin': ', et ',
  'app.lab.out.sent': 'Envoyé',
  'app.lab.out.sentText':
    'Seul l’obtenteur peut l’ouvrir. Votre signature est publique, le rapport ne l’est pas : quiconque a un lien vers la page de vérification de cette plante voit qu’un rapport de laboratoire la concernant a été signé, et son SHA-256 ({sha}).',
  'app.lab.out.sentName':
    'On voit aussi le nom sous lequel votre clé est enregistrée. Tant que l’opérateur de VeilCore ne l’a pas rapproché d’une liste publique de licences ou d’accréditations, il apparaît comme « une clé nommée « {name} » (nom non vérifié) ».',
  'app.lab.out.yourLab': 'votre laboratoire',
  'app.lab.out.youSent': 'Rapports de laboratoire que vous avez envoyés',
  'app.lab.out.rowHead': '{id} · envoyé {when}',
  'app.lab.out.withdrawing': 'Retrait…',
  'app.lab.out.yesWithdraw': 'Oui, le retirer',
  'app.lab.out.keepIt': 'Le garder',
  'app.lab.out.withdraw': 'Retirer',
  'app.lab.out.sendCorrected': 'Envoyer un fichier corrigé',
  'app.lab.out.confirmText':
    'Votre signature est retirée (elle reste inscrite comme retirée) et le fichier est supprimé. L’obtenteur voit « Retiré par le laboratoire ».',
  'app.lab.out.replacesIntro':
    'Il remplace {id}, le rapport de laboratoire que vous avez envoyé {when}. L’ancien est retiré : son fichier est supprimé et votre signature est marquée comme remplacée.',
  'app.lab.out.intro':
    'Votre navigateur signe l’empreinte du rapport avec la clé de votre laboratoire et verrouille le fichier pour que seul l’obtenteur puisse l’ouvrir. Le fichier verrouillé attend sur le serveur de VeilCore que l’obtenteur l’ouvre ; VeilCore ne peut pas le lire.',
  'app.lab.out.cancelCorrection': 'Annuler la correction',
  'app.lab.out.turnedAway': 'Vous avez refusé cet échantillon : il n’y a donc pas de rapport de laboratoire à envoyer.',
  'app.lab.out.setUpFirst':
    'Configurez d’abord la signature de votre laboratoire, pour que l’obtenteur sache que le rapport vient de vous.',
  'app.lab.out.noLockHere':
    'Ce navigateur n’a pas le verrou de l’obtenteur pour cette livraison. Collez le code laboratoire qu’il vous a envoyé.',
  'app.lab.out.useCode': 'Utiliser ce code laboratoire',
  'app.lab.out.notSignedReceipt':
    'Vous n’avez pas signé que cet échantillon est arrivé. Tant que vous ne l’avez pas fait, l’obtenteur voit votre rapport comme signé par une clé qui n’a pas confirmé avoir reçu l’échantillon.',
  'app.lab.out.notLinked':
    'Votre accusé de réception est signé mais pas encore lié à cette livraison : l’obtenteur ne peut donc pas le voir.',
  'app.lab.out.fileFp': '{size} · empreinte {fp}',
  'app.lab.out.differentFile': 'Choisir un autre fichier',
  'app.lab.out.chooseCorrected': 'Choisir le fichier corrigé',
  'app.lab.out.chooseReport': 'Choisir le rapport',
  'app.lab.out.signing': 'Signature et verrouillage…',
  'app.lab.out.signLockSend': 'Signer, verrouiller et envoyer',
  'app.lab.out.alreadyGone': 'Le rapport de laboratoire que vous corrigez a déjà été retiré ou remplacé.',
  'app.lab.out.sameFile': 'Vous avez déjà envoyé exactement ce fichier pour cette livraison. Rien n’a été signé.',
  'app.lab.out.cap':
    'Cette livraison a déjà {cap} rapports de laboratoire, le maximum possible. Retirez-en un d’abord. Rien n’a été signé.',
  'app.lab.out.rowsCap':
    'Cette livraison a reçu autant de rapports de laboratoire qu’elle peut en accepter, rapports retirés compris. Demandez un nouveau code laboratoire à l’obtenteur. Rien n’a été signé.',
  'app.lab.out.rowReplaced': 'Remplacé par votre fichier corrigé.',
  'app.lab.out.rowWithdrawn': 'Retiré le {date}.',
  'app.lab.out.rowSigned': 'Signé avec votre clé · empreinte {fp}',
  'app.lab.out.rowRetracted':
    'Votre signature est retirée, mais le fichier est toujours chez le registre. Retirez-le pour terminer.',
  'app.lab.out.rowNotSigned': 'Non signé avec la clé de ce navigateur.',
  'app.lab.card.unknownBreeder': 'Obtenteur inconnu',
  'app.lab.card.received': 'reçu le {date}',
  'app.lab.card.turnedAway': 'refusé',
  'app.lab.card.signed': 'accusé de réception signé ✓',
  'app.lab.card.notSigned': 'accusé de réception pas encore signé',
  'app.lab.card.ref': 'réf. {ref}',
  'app.lab.send.theLab': 'le laboratoire',
} satisfies Partial<AppTranslation>;
