// Japanese (です/ます): what a failure says (../en/errors.ts). Terms as in
// docs/i18n-glossary.md: 記録, 証明コード, クレーム (a claim about a number), 請求 (a lender's
// claim), 確認, 鍵 (never ロック), レジストリ for the registry.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const errors = {
  'app.err.unknown': '問題が発生しました。もう一度お試しください。',
  'app.err.technical': '問題が発生しました。技術的な詳細（英語）：{detail}',
  'app.err.technicalReason': '技術的な問題（詳細は英語：{detail}）',

  'app.err.registry.unexpected': 'レジストリから予期しない応答がありました。',
  'app.err.registry.notAsExpected': 'レジストリが想定どおりに応答しませんでした。',
  'app.err.registry.answered': 'レジストリの応答は{status}でした',
  'app.err.registry.unexpectedLower': 'レジストリからの予期しない応答',
  'app.err.registry.refusedCorrection':
    'レジストリがこの訂正を受け付けなかったため、何も変更していません。{refusals}',

  'app.err.chain.unreachable':
    'Midnightネットワークまたは手数料サービスに接続できませんでした。何も送信していません。数分後にもう一度お試しください。',
  'app.err.chain.contractNotFound': 'VeilCoreのコントラクトがネットワーク上に見つかりませんでした。何も送信していません。',
  'app.err.chain.demoNotFound': 'デモ用のコントラクトがネットワーク上に見つかりませんでした。',
  'app.err.chain.claimsNotFound': 'クレームのコントラクトがネットワーク上に見つかりませんでした。',
  'app.err.chain.otherContract':
    'ネットワーク上のコントラクトは、このサイトが想定しているものではありません。何も送信していません。',
  'app.err.chain.otherClaimsContract':
    'ネットワーク上のクレームのコントラクトは、このサイトが想定しているものではありません。何も送信していません。',
  'app.err.chain.filesMismatch':
    'このサイトの証明用ファイルは、ネットワーク上のコントラクトが使うものと一致しません。何も送信していません。',
  'app.err.chain.claimsFilesMismatch':
    'このサイトの証明用ファイルは、クレームのコントラクトが使うものと一致しません。何も送信していません。',
  'app.err.chain.circuitFilesMismatch':
    'このサイトの{circuit}用の証明用ファイルは、コントラクトが使うものと一致しません。',
  'app.err.chain.filesMissing': '{circuit}用の証明用ファイルは、まだこのサイトにありません。',
  'app.err.chain.paramsMissing': '公開パラメーター（k={k}）は、まだこのサイトにありません。',
  'app.err.chain.callFailed': 'ネットワークは呼び出しを取り込みましたが、成功しませんでした（{status}）。',
  'app.err.chain.claimFailed': 'ネットワークはクレームを取り込みましたが、成功しませんでした（{status}）。',
  'app.err.chain.noSlot': 'ライセンスの空き枠が見つかりませんでした。何も送信していません。',
  'app.err.chain.notSendersRecord':
    'このリンクは送信者のものではない記録を指しています。何も送信していません。新しいリンクを依頼してください。',
  'app.err.chain.pow': 'プルーフ・オブ・ワークを完了できませんでした。',
  'app.err.chain.notToSponsor': '手数料サービスには何も送信していません。',
  'app.err.chain.proverStart': 'このブラウザーでは証明の作成を開始できませんでした：{reason}',
  'app.err.chain.proverSlow':
    '証明の作成が時間内に始まりませんでした。もう一度、またはノートパソコンでお試しください。',
  'app.err.chain.noRecordKeys': 'このブラウザーはこの記録の鍵を保有していません。',
  'app.err.chain.pairingNotSaved':
    'このブラウザーは紐付けの乱数を保存できなかったため、何も送信していません。',
  'app.err.chain.noIdentity': 'この記録には、まだオンチェーンのIDがありません。',
  'app.err.chain.notTx': 'それはトランザクションIDではありません。',
  'app.err.chain.badRandom': '乱数生成器が使えない値を返しました。',
  'app.err.chain.noIdentityToCheck': 'この記録には、確認できるオンチェーンのIDがありません。',
  'app.err.chain.notOurChallenge':
    'このページはそのチャレンジを作っていません。新しく作って送ってください。',
  'app.err.chain.challengeUsed': 'そのチャレンジにはすでに一度答えがあります。新しく作ってください。',
  'app.err.chain.notOurRequest': 'このページはそのチャレンジを作っていません。新しく依頼してください。',
  'app.err.chain.requestUsed': 'そのチャレンジにはすでに一度答えがあります。新しく依頼してください。',
  'app.err.chain.noRecordKey': '照合する記録の鍵がありません。',
  'app.err.chain.indexerUnreachable':
    'Midnightネットワークのインデクサーに接続できませんでした。数分後にもう一度お試しください',
  'app.err.chain.stateUnreadable':
    'コントラクトの現在の状態を読み取れませんでした。数分後にもう一度お試しください',

  'app.err.claims.noNumbers': 'この文書には封印された数値がありません。',
  'app.err.claims.noSchema': '公開されたスキーマ{schema}がありません。',
  'app.err.claims.otherSchema': 'このサイトのスキーマは、数値が封印されたときのものではありません。',
  'app.err.claims.notOnCertificate': 'その数値は、封印したときの証明書にありませんでした。',
  'app.err.claims.boundNotMet': '封印された数値がその条件を満たさないため、示すことができません。',
  'app.err.claims.sigOtherRecord': 'その署名は別の記録のものです。',
  'app.err.claims.sigNoCheck':
    'その署名は確認できません。その鍵でこの記録のために作られたものではありません。',
  'app.err.claims.tooMany': '1つのリンクにはクレームが多すぎます。',
  'app.err.claims.onePerNumber': '1つのリンクでは、1つの数値につきクレームは1つです。',
  'app.err.claims.sameRecord':
    '1つのリンクのクレームは、同じ記録、同じフォーム、同じコントラクトのものである必要があります。',
  'app.err.claims.provingOff':
    'この記録では、記録のページでオンにするまで証明はオフです。何も送信していません。',
  'app.err.claims.confirmPublish':
    '数値そのものを公開するには、先に確認が必要です。何も送信していません。',
  'app.err.claims.notOffered':
    'その種類の結果では、そのクレームは利用できません。何も送信していません。',
  'app.err.claims.slotNotNumber': '{schema}では、枠{slot}は数値ではありません。',
  'app.err.claims.noLabSignature': 'このリンクはラボの署名を指していません。',
  'app.err.claims.txNotLabSignature': 'そのトランザクションはラボの署名ではありません。',
  'app.err.claims.labSigOtherRecord': 'そのラボの署名は別の記録のものです。',
  'app.err.claims.otherKey': 'その記録は別の鍵で署名されています。',
  'app.err.claims.unknownSchema': 'このリンクは、このサイトが公開していないスキーマを指しています。',
  'app.err.claims.otherKind': 'そのトランザクションは別の種類のクレームを作りました。',
  'app.err.claims.otherRecord': 'そのクレームは別の記録についてのものです。',
  'app.err.claims.otherSchemaClaim': 'そのクレームは別のスキーマで作られました。',
  'app.err.claims.otherNumber': 'そのクレームは別の数値についてのものです。',
  'app.err.claims.otherBound': 'そのクレームは別の条件を示しました。',
  'app.err.claims.notANumber': 'そのクレームは数値ではないものを公開しました。',
  'app.err.claims.otherValue': 'そのクレームは別の値を公開しました。',
  'app.err.claims.noContract':
    'このサイトはクレームを読めません。クレームのコントラクトが設定されていません。',
  'app.err.claims.notOurContract':
    'このリンクは、このネットワークのVeilCoreのものではないクレームのコントラクトを指しています。',

  'app.err.lab.notRequest': 'そのファイルはラボの署名の依頼ではありません。',
  'app.err.lab.noForm': 'この依頼は、このサイトがフォームを公開していない数値を使っています。',
  'app.err.lab.notInForm':
    '依頼の数値は、依頼が指すフォームにありません。署名せず、もう一度依頼してもらってください。',
  'app.err.lab.cantCheck': '依頼を確認できません：{reason}',
  'app.err.lab.notDocument': '文書の記録ではありません。',
  'app.err.lab.rootMismatch': 'その数値からは、封印されたルートになりません。',
  'app.err.lab.notRecord':
    '依頼の数値からは、依頼が指す記録になりません。署名せず、もう一度依頼してもらってください。',
  'app.err.lab.notKey': 'それはラボの署名用の鍵ではありません。',
  'app.err.lab.notSignature': 'そのファイルはラボの署名ではありません。',
  'app.err.lab.sigKeyNotLab': 'その署名の鍵は、ラボの署名用の鍵ではありません。',
  'app.err.lab.numbersUnreadable': 'この報告書の数値を読み取れません。',
  'app.err.lab.numbersTooLarge': '数値が大きすぎて送信できません。',
  'app.err.lab.noLock': 'このラボコードには、検査報告書用の鍵が含まれていません。',
  'app.err.lab.notLockedHere':
    'この検査報告書はこの植物のために鍵をかけたものではないか、ファイルが壊れています。',
  'app.err.lab.signatureDamaged': 'そのファイルのラボの署名は壊れています。何も変更していません。',
  'app.err.lab.keyExists':
    'このブラウザーにはすでにラボの鍵があります。もう一度公開するか、そのバックアップをダウンロードしてください。新しい鍵は作っていません。',

  'app.err.lic.licensorSigns': 'これらのクレデンシャルに署名するのはライセンスを許諾する側だけです。',
  'app.err.lic.otherStatement': 'その確認は別の明細書のものです。',
  'app.err.lic.alreadyIssued': 'すでにオンチェーンで発行されています。代わりに取り消してください。',
  'app.err.lic.notOnChain': 'このライセンスはオンチェーンにありません。',
  'app.err.lic.noDealMessages': 'このライセンスには、まだ契約のメッセージがありません。',
  'app.err.lic.badKey': '相手方の鍵は使えません。',
  'app.err.lic.handOnNotReady': '引き継ぎはまだ完了できません。',
  'app.err.lic.evidenceTooLarge':
    'そのファイルは50 MBを超えています。この期間だけの報告書を添付してください。',
  'app.err.lic.fileEmpty': 'そのファイルは空です。',
  'app.err.lic.notIssuedByTx': 'そのトランザクションはこのライセンスを発行していません。',
  'app.err.lic.notLiveByTx': 'そのトランザクションはこのライセンスを有効にしていません。',
  'app.err.lend.needWords': '請求には、貸付についての文言が必要です。',
  'app.err.lend.needName': '保有者に表示される名前を入力してください。',
  'app.err.lend.noIdentity': 'このブラウザーには貸し手のIDがありません。',
  'app.err.lend.notRecordKey': 'それは記録のオンチェーンの鍵ではありません。',
  'app.err.lend.notOwnIdentity': '自分自身のIDに対して請求はできません。',
  'app.err.lend.wordsTooLong': '貸付についての文言は200文字未満にしてください。',

  'app.err.rec.importTooLarge': 'そのファイルは20 MBを超えています。何も取り込んでいません。',
  'app.err.rec.notExport': 'そのファイルはVeilCoreの記録のエクスポートではありません。何も取り込んでいません。',
  'app.err.rec.notExportShort': 'そのファイルはVeilCoreの記録のエクスポートではありません。',
  'app.err.rec.unreadableEntries':
    'そのファイルには、このバージョンで読めない項目が{count}件あります。何も取り込んでいません。',
  'app.err.rec.deviceOnlyImport':
    '{id}：この端末だけに保管できるのは文書だけです。何も取り込んでいません。',
  'app.err.rec.codeMismatch': '{id}：証明コードが項目と一致しません。何も取り込んでいません。',
  'app.err.rec.noNonce':
    '{id}：証明コードはありますがノンスがないため、確認できません。何も取り込んでいません。',
  'app.err.rec.exportMismatch':
    '{id}：証明コードが保存された項目と一致しないため、エクスポートをレジストリの内容と結び付けられませんでした。何もエクスポートしていません。',
  'app.err.rec.fileTooLarge':
    '{file}は200 MBを超えているため、読み込んでいません。何も送信・保存していません。',
  'app.err.rec.strainCantSeal': 'この品種の記録は封印できません：{problems}。',
  'app.err.rec.animalCantSeal': 'この動物の記録は封印できません：{problems}。',
  'app.err.rec.docCantSeal': 'この文書の記録は封印できません：{problems}。',
  'app.err.rec.docCantShare': 'この文書の記録は共有できません：{problems}。',
  'app.err.rec.chainTooLarge':
    'このつながりは1つのリンクには大きすぎます。代わりに、記録ごとのリンクを送ってください。',
  'app.err.rec.aboutItself': '記録は自分自身についてのものにはできません。',
  'app.err.keys.notKeysFile': 'それはVeilCoreの記録の鍵のファイルではありません。',
  'app.err.keys.damaged': 'そのファイルは壊れています。中の鍵を読み取れません。',
  'app.err.keys.differentKeys':
    'このブラウザーは、その記録について別の鍵をすでに保有しています。何も変更していません。',
  'app.err.keys.noVault': 'このブラウザーには保管庫の鍵がありません。',
  'app.err.keys.holderKey': '保有者の鍵は16進数64文字です。',
  'app.err.keys.proofCode': '証明コードは16進数64文字です。',
  'app.err.sheet.noSheet': 'そのスプレッドシートにはシートがありません。',
  'app.err.sheet.wrongKind':
    'その種類のスプレッドシートはここでは読めません。Excel（.xlsx）またはCSVで保存して、そのファイルを選んでください。',
  'app.err.sheet.notXlsx':
    'そのファイルはExcel（.xlsx）ファイルとして開けませんでした。.xlsxまたはCSVで保存して、もう一度お試しください。',
  'app.err.sheet.tooLarge':
    'そのスプレッドシートは大きすぎて、ここでは読めません。行を減らして保存し、もう一度お試しください。',
  'app.err.sheet.fileTooLarge': 'そのファイルは{mb} MBを超えています。一度に取り込めるのは{rows}行までです。',
} satisfies Partial<AppTranslation>;
