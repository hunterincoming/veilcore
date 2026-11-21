// The record app in French: scanning a code into a box, and printing QR labels (../en/scan.ts).
// Terms: scanner, code QR, code-barres, étiquette, page de vérification, lien de vérification,
// code de preuve, boucle auriculaire, enregistrement, vous.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const scan = {
  'app.scan.buttonLabel': 'Scanner un code QR ou un code-barres dans ce champ',
  'app.scan.nfcLabel': 'Lire une puce NFC dans ce champ',
  'app.scan.title': 'Scanner un code',
  'app.scan.starting': 'Ouverture de la caméra…',
  'app.scan.point':
    'Dirigez la caméra vers le code QR ou le code-barres. Il est lu sur cet appareil ; rien n’est envoyé pour le lire.',
  'app.scan.video': 'Image de la caméra',
  'app.scan.denied':
    'La caméra n’a pas été autorisée. Vous pouvez l’autoriser dans les réglages de ce navigateur pour ce site, ou saisir le code.',
  'app.scan.noCamera': 'Aucune caméra n’a été trouvée sur cet appareil. Saisissez le code.',
  'app.scan.unsupported': 'Ce navigateur ne peut pas ouvrir la caméra ici. Saisissez le code.',
  'app.scan.failed': 'La caméra ou le lecteur de codes n’a pas pu démarrer. Saisissez le code.',
  'app.scan.typeInstead': 'Saisir plutôt',
  'app.scan.done': 'Scanné dans « {field} ». Vérifiez-le avant de continuer.',
  'app.scan.notLabel':
    'Ce code n’est pas une étiquette VeilCore. Dirigez la caméra vers le code QR de l’étiquette, ou saisissez l’identifiant de l’enregistrement.',
  'app.scan.nfcTitle': 'Lire une puce NFC',
  'app.scan.nfcHold': 'Tenez la puce contre le dos du téléphone.',
  'app.scan.nfcEmpty': 'Cette puce ne contient ni texte ni lien. Saisissez le numéro.',
  'app.scan.nfcOff':
    'Le NFC est désactivé ou n’a pas été autorisé. Activez-le dans les réglages du téléphone, ou saisissez le numéro.',
  'app.scan.readerHelp':
    'Beaucoup de bâtons lecteurs Bluetooth pour boucles auriculaires peuvent s’associer à cet appareil comme clavier. Si le vôtre le peut : touchez ce champ, puis lisez la boucle, et le numéro s’inscrit.',
  'app.labels.open': 'Imprimer une étiquette QR',
  'app.labels.openBatch': 'Imprimer les étiquettes QR de ces enregistrements',
  'app.labels.title': 'Imprimer des étiquettes QR',
  'app.labels.intro':
    'Chaque étiquette porte un code QR qui ouvre la page de vérification de l’enregistrement, la même que son lien de vérification. Collez-la sur le tube, le sachet, le pot ou le visotube ; toute personne avec l’appareil photo d’un téléphone peut la scanner.',
  'app.labels.made': 'Les étiquettes sont faites sur cet appareil. Rien n’est envoyé pour les faire ou les imprimer.',
  'app.labels.which': 'Quels enregistrements',
  'app.labels.all': 'Tout sélectionner',
  'app.labels.none': 'Tout désélectionner',
  'app.labels.noneHere':
    'Aucun de vos enregistrements n’a encore de page de vérification. Un enregistrement en a une dès que VeilCore l’a reçu.',
  'app.labels.notReady.one':
    '{count} d’entre eux n’a pas encore de page de vérification, il ne peut donc pas avoir d’étiquette.',
  'app.labels.notReady.other':
    '{count} d’entre eux n’ont pas encore de page de vérification, ils ne peuvent donc pas avoir d’étiquette.',
  'app.labels.what': 'Ce que montre l’étiquette',
  'app.labels.showId': 'L’identifiant court de l’enregistrement et « Scanner pour vérifier »',
  'app.labels.showName': 'Aussi le nom de l’enregistrement',
  'app.labels.idNote':
    'Le code QR ne porte que l’identifiant de l’enregistrement et son code de preuve, que la page de vérification montre à tous. Rien de scellé ne figure jamais sur une étiquette.',
  'app.labels.nameNote':
    'Le nom figure sur l’étiquette et dans son code QR : toute personne qui la scanne voit le nom, et la page de vérification indique s’il correspond à l’enregistrement. Rien d’autre de l’enregistrement scellé ne figure sur une étiquette.',
  'app.labels.size': 'Taille de l’étiquette',
  'app.labels.size.thermal': '2 × 1 pouce, une étiquette par page (imprimantes d’étiquettes)',
  'app.labels.size.letter': 'Planche US Letter de 30 (format Avery 5160, 2⅝ × 1 pouce)',
  'app.labels.size.a4': 'Planche A4 de 21 (format Avery L7160, 63,5 × 38,1 mm)',
  'app.labels.skip': 'Étiquettes déjà utilisées sur la première planche',
  'app.labels.skipHelp':
    'Comptées ligne par ligne depuis le coin supérieur gauche. L’impression commence après elles, pour ne pas gâcher une planche entamée.',
  'app.labels.copies': 'Étiquettes par enregistrement',
  'app.labels.count.one': '{count} étiquette',
  'app.labels.count.other': '{count} étiquettes',
  'app.labels.print': 'Imprimer',
  'app.labels.printHelp':
    'La fenêtre d’impression du navigateur s’ouvre. Choisissez 100 % ou « Taille réelle » et aucune marge pour que les étiquettes tombent juste. Imprimez d’abord une planche d’essai sur papier ordinaire.',
  'app.labels.download': 'Télécharger le PDF',
  'app.labels.downloadHelp':
    'Enregistre les étiquettes dans un PDF à la taille réelle de la planche, fait sur cet appareil. Imprimez-le à 100 % ou en « Taille réelle ».',
  'app.labels.downloadOpen': 'Rien n’a été enregistré ? Ouvrir le PDF',
  'app.labels.downloadFailed': 'Le PDF n’a pas pu être fait sur cet appareil. Utilisez « Imprimer ».',
  'app.labels.preview': 'Aperçu de l’impression',
  'app.labels.pageOf': 'Page {n} sur {of}',
  'app.labels.scanToCheck': 'Scanner pour vérifier',
  'app.labels.back': 'Retour',
} satisfies Partial<AppTranslation>;
