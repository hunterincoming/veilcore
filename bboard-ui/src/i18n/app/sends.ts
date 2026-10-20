// The record app's send screens (prove a record by link, date a DNA pairing, stamp a
// record's key) were written for the test site, where they say "test network, practice
// only". On veilcore.org with the mainnet sponsor live (index.tsx MAINNET_SENDS) the same
// screens send on Midnight's main network and VeilCore pays the fee, so these sentences
// replace those (app.tsx useT). Every language sets every key (site-mainnet.test.ts).
// SPDX-License-Identifier: Apache-2.0
import type { Lang } from '../../config/languages';

export const SEND_SCREEN_KEYS = [
  'app.prove.whatSends',
  'app.animal.v.app.prove.whatSends',
  'app.prove.fewMinutes',
  'app.prove.ask.intro',
  'app.prove.watch.checkedAt',
  'app.prove.own.title',
  'app.animal.v.app.prove.own.title',
  'app.pair.chain.dated',
  'app.pair.chain.title',
  'app.pair.chain.testOnly',
  'app.plant.anchor.anchorTest',
] as const;

type SendWords = Record<(typeof SEND_SCREEN_KEYS)[number], string>;

export const APP_SENDS: Record<Lang, SendWords> = {
  en: {
    'app.prove.whatSends':
      "<b>What this sends:</b> only proof that you hold this plant's record, put on Midnight's main network. No name, no genetics, nothing about your other plants. VeilCore pays the fee.",
    'app.animal.v.app.prove.whatSends':
      "<b>What this sends:</b> only proof that you hold this animal's record, put on Midnight's main network. No name, no genetics, nothing about your other records. VeilCore pays the fee.",
    'app.prove.fewMinutes': 'It can take a few minutes.',
    'app.prove.ask.intro':
      "You send them a link. They open it and tap Prove it. The answer shows up here. This page checks the answer on Midnight's main network itself, through a Midnight indexer reached through VeilCore's relay. For a decision that matters, check the transaction on a second indexer.",
    'app.prove.watch.checkedAt': "Checked {when} on Midnight's main network.",
    'app.prove.own.title': 'Prove you hold this plant’s key',
    'app.animal.v.app.prove.own.title': 'Prove you hold this animal’s key',
    'app.pair.chain.dated': "This pairing is dated on Midnight's main network against this record.",
    'app.pair.chain.title': 'Also date this pairing on Midnight (optional)',
    'app.pair.chain.testOnly':
      'This shows whoever controlled this record’s identity had the report, or its SHA-256, by the date it lands. It is not a check of the genetics. VeilCore pays the fee.',
    'app.plant.anchor.anchorTest': "2. Anchor on Midnight's main network",
  },
  de: {
    'app.prove.whatSends':
      '<b>Was gesendet wird:</b> nur der Beweis, dass Sie den Datensatz dieser Pflanze halten, im Hauptnetz von Midnight. Kein Name, keine Genetik, nichts über Ihre anderen Pflanzen. VeilCore zahlt die Gebühr.',
    'app.animal.v.app.prove.whatSends':
      '<b>Was gesendet wird:</b> nur der Beweis, dass Sie den Datensatz dieses Tieres halten, im Hauptnetz von Midnight. Kein Name, keine Genetik, nichts über Ihre anderen Datensätze. VeilCore zahlt die Gebühr.',
    'app.prove.fewMinutes': 'Das kann einige Minuten dauern.',
    'app.prove.ask.intro':
      'Sie senden einen Link. Die Person öffnet ihn und tippt auf „Beweisen“. Die Antwort erscheint hier. Diese Seite prüft die Antwort selbst im Hauptnetz von Midnight, über einen Midnight-Indexer, den sie über das Relais von VeilCore erreicht. Prüfen Sie die Transaktion für eine wichtige Entscheidung bei einem zweiten Indexer.',
    'app.prove.watch.checkedAt': 'Geprüft {when} im Hauptnetz von Midnight.',
    'app.prove.own.title': 'Beweisen Sie, dass Sie den Schlüssel dieser Pflanze halten',
    'app.animal.v.app.prove.own.title': 'Beweisen Sie, dass Sie den Schlüssel dieses Tieres halten',
    'app.pair.chain.dated': 'Diese Kopplung ist im Hauptnetz von Midnight für diesen Datensatz datiert.',
    'app.pair.chain.title': 'Diese Kopplung auch auf Midnight datieren (optional)',
    'app.pair.chain.testOnly':
      'Das zeigt, dass, wer die Identität dieses Datensatzes kontrollierte, den Bericht oder seinen SHA-256 zu dem Datum hatte, an dem er ankommt. Das ist keine Prüfung der Genetik. VeilCore zahlt die Gebühr.',
    'app.plant.anchor.anchorTest': '2. Im Hauptnetz von Midnight verankern',
  },
  es: {
    'app.prove.whatSends':
      '<b>Qué se envía:</b> solo la prueba de que usted tiene el registro de esta planta, puesta en la red principal de Midnight. Ni nombre, ni genética, ni nada sobre sus otras plantas. VeilCore paga la tarifa.',
    'app.animal.v.app.prove.whatSends':
      '<b>Qué se envía:</b> solo la prueba de que usted tiene el registro de este animal, puesta en la red principal de Midnight. Ni nombre, ni genética, ni nada sobre sus otros registros. VeilCore paga la tarifa.',
    'app.prove.fewMinutes': 'Puede tardar unos minutos.',
    'app.prove.ask.intro':
      'Le envía un enlace. Lo abre y toca Demostrarlo. La respuesta aparece aquí. Esta página comprueba la respuesta en la propia red principal de Midnight, a través de un indexador de Midnight al que llega por medio del relé de VeilCore. Para una decisión importante, compruebe la transacción en un segundo indexador.',
    'app.prove.watch.checkedAt': 'Comprobado {when} en la red principal de Midnight.',
    'app.prove.own.title': 'Demuestre que tiene la clave de esta planta',
    'app.animal.v.app.prove.own.title': 'Demuestre que tiene la clave de este animal',
    'app.pair.chain.dated': 'Este vínculo está fechado en la red principal de Midnight para este registro.',
    'app.pair.chain.title': 'Fechar también este vínculo en Midnight (opcional)',
    'app.pair.chain.testOnly':
      'Esto muestra que quien controlaba la identidad de este registro tenía el informe, o su SHA-256, en la fecha en que llegue. No es una comprobación de la genética. VeilCore paga la tarifa.',
    'app.plant.anchor.anchorTest': '2. Anclar en la red principal de Midnight',
  },
  fr: {
    'app.prove.whatSends':
      '<b>Ce qui est envoyé :</b> seulement la preuve que vous détenez l’enregistrement de cette plante, placée sur le réseau principal de Midnight. Pas de nom, pas de génétique, rien sur vos autres plantes. VeilCore paie les frais.',
    'app.animal.v.app.prove.whatSends':
      '<b>Ce qui est envoyé :</b> seulement la preuve que vous détenez l’enregistrement de cet animal, placée sur le réseau principal de Midnight. Pas de nom, pas de génétique, rien sur vos autres enregistrements. VeilCore paie les frais.',
    'app.prove.fewMinutes': 'Cela peut prendre quelques minutes.',
    'app.prove.ask.intro':
      'Vous envoyez un lien. La personne l’ouvre et touche « Le prouver ». La réponse s’affiche ici. Cette page vérifie la réponse sur le réseau principal de Midnight lui-même, via un indexeur Midnight joint par le relais de VeilCore. Pour une décision importante, vérifiez la transaction sur un second indexeur.',
    'app.prove.watch.checkedAt': 'Vérifié {when} sur le réseau principal de Midnight.',
    'app.prove.own.title': 'Prouvez que vous détenez la clé de cette plante',
    'app.animal.v.app.prove.own.title': 'Prouvez que vous détenez la clé de cet animal',
    'app.pair.chain.dated': 'Cette association est datée sur le réseau principal de Midnight, pour cet enregistrement.',
    'app.pair.chain.title': 'Dater aussi cette association sur Midnight (facultatif)',
    'app.pair.chain.testOnly':
      'Cela montre que la personne qui contrôlait l’identité de cet enregistrement avait le rapport, ou son SHA-256, à la date où il arrive. Ce n’est pas une vérification de la génétique. VeilCore paie les frais.',
    'app.plant.anchor.anchorTest': '2. Ancrer sur le réseau principal de Midnight',
  },
  ja: {
    'app.prove.whatSends':
      '<b>送信される内容：</b>この植物の記録を保有していることの証明だけで、Midnightのメインネットワークに載せます。名前も、遺伝情報も、ほかの植物についても送りません。手数料はVeilCoreが支払います。',
    'app.animal.v.app.prove.whatSends':
      '<b>送信される内容：</b>この動物の記録を保有していることの証明だけで、Midnightのメインネットワークに載せます。名前も、遺伝情報も、ほかの記録についても送りません。手数料はVeilCoreが支払います。',
    'app.prove.fewMinutes': '数分かかることがあります。',
    'app.prove.ask.intro':
      '相手にリンクを送ります。相手がそれを開いて「証明する」をタップすると、ここに答えが表示されます。このページは、VeilCoreの中継を通じてMidnightのインデクサーに問い合わせ、Midnightのメインネットワーク上で直接答えを確認します。重要な判断には、別のインデクサーでもトランザクションを確認してください。',
    'app.prove.watch.checkedAt': '{when}にMidnightのメインネットワークで確認しました。',
    'app.prove.own.title': 'この植物の鍵を保有していることを証明する',
    'app.animal.v.app.prove.own.title': 'この動物の鍵を保有していることを証明する',
    'app.pair.chain.dated': 'この紐付けには、この記録に対してMidnightのメインネットワーク上で日付が付いています。',
    'app.pair.chain.title': 'この紐付けにもMidnight上で日付を付ける（任意）',
    'app.pair.chain.testOnly':
      'これは、この記録のIDを管理していた人が、届いた日付までに報告書またはそのSHA-256を持っていたことを示します。遺伝情報を確認したものではありません。手数料はVeilCoreが支払います。',
    'app.plant.anchor.anchorTest': '2. Midnightのメインネットワークにアンカーする',
  },
};

/** A language's app text for this build: the send screens' mainnet sentences when the sponsor is live. */
export const withSends = <D extends Partial<Record<string, string>>>(dict: D, lang: Lang, sends: boolean): D =>
  sends ? { ...dict, ...APP_SENDS[lang] } : dict;
