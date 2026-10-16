// Japanese. DRAFT: machine-assisted, to be checked by a fluent speaker before publishing
// (docs/translations/README.md). Terms as in ../../ja.ts, plus the app's: see ./index.ts.
// SPDX-License-Identifier: Apache-2.0
import type { AppTranslation } from '../../translate';

export const verify = {
  'app.verify.report.notSaved': '保有者はこの記録にDNA報告書を保存していません。',
  'app.verify.report.pending':
    '保存されているDNAレポートは現在表示されていません。保有者が共有を選んだ後に記録が変更され、保有者のアプリがまだ更新を送っていません。',
  'app.verify.report.asOf': '（このリンクが作られた時点）',
  'app.verify.report.staleNote':
    'このリンクは別のファイルが保存されていたときに作られました。この行は、今保存されているファイルについてのものです。',
  'app.verify.report.matches':
    '保有者はこの記録にDNA報告書を保存しました{asOf}。そのファイル（SHA-256 {sha}）は{lead}検査報告書と一致します。署名はこのブラウザで確認しました。{rest}{staleNote}',
  'app.verify.report.which': 'この記録に保存されたDNA報告書{asOf}（SHA-256 {sha}）',
  'app.verify.report.replaced': '{which}は、{on}にラボにより訂正版に差し替えられました。{tail}{staleNote}',
  'app.verify.report.withdrawn': '{which}は、{on}にラボにより撤回されました。{tail}{staleNote}',
  'app.verify.report.ownSha':
    '保有者はこの記録にDNA報告書のファイルを保存しました{asOf}（SHA-256 {sha}）。この記録のラボの署名で一致するものはないため、保有者自身の陳述です。{staleNote}',
  'app.verify.report.own':
    '保有者はこの記録にDNA報告書のファイルを保存しました。この記録のラボの署名で一致するものはないため、保有者自身の陳述です。{staleNote}',
  'app.verify.report.unnamedSigned':
    '保有者はこの記録にDNA報告書を保存しました。このリンクはファイルを示していないため、上に挙げた署名付きの検査報告書かどうかはこのページではわかりません。',
  'app.verify.report.unnamedWithdrawn':
    '保有者はこの記録にDNA報告書を保存しました。このリンクはファイルを示しておらず、この記録について署名された検査報告書はすべてラボにより撤回されたため、保有者自身の陳述です。',
  'app.verify.report.unnamedNone':
    '保有者はこの記録にDNA報告書を保存しました。この記録についての検査報告書に署名したラボはないため、保有者自身の陳述です。',
  'app.verify.kind.receipts.other': 'ラボの受領書{count}件',
  'app.verify.kind.reports.other': '検査報告書{count}件',
  'app.verify.kind.statements.other': '署名付きの陳述{count}件',
  'app.verify.kind.and': 'と',
  'app.verify.withdrawnSignatures.other': '{count}件の署名が署名者により撤回されたため、数えていません：{what}。',
  'app.verify.anchor.registryDate': '{date}（VeilCoreのレジストリの報告による）',
  'app.verify.anchor.noDate': '記載なし（VeilCoreのレジストリはそのトランザクションの日付を示していません）',
  'app.verify.anchor.lookingUp': '{network}でそのトランザクションを調べています…',
  'app.verify.anchor.twoIndexers': '別々の2つのMidnightインデクサーが同じ答えを返しました。',
  'app.verify.anchor.checked':
    'Midnightで確認しました：このバッチのルートは、ブロック {block} のトランザクション {tx} により、{at}に書き込まれました。{two}{test}',
  'app.verify.anchor.failed':
    'Midnightで確認できませんでした：{reason}。レジストリが報告する日付に頼らないでください。',
  'app.verify.anchor.dateNotChecked': '日付は{date}です。ここでは確認していません。',
  'app.verify.anchor.oneIndexer':
    '2つのMidnightインデクサーのうち1つしか応答しませんでした。両方の応答が必要です。{date}',
  'app.verify.anchor.noIndexer': 'Midnightのインデクサーに接続できませんでした。{date}',
  'app.verify.anchor.headingTest': 'テストネットワークで日付スタンプを確認：練習用のデータで、本当の日付ではありません',
  'app.verify.anchor.headingChecked': 'Midnightで日付スタンプを確認済み',
  'app.verify.anchor.headingFailed': 'Midnightで日付スタンプを確認できません',
  'app.verify.anchor.eventTestTitle': 'テストネットワークで日付スタンプを確認',
  'app.verify.anchor.eventChecked':
    'バッチ {batch}：このページは、{where}のブロック {block}、トランザクション {tx} の中にバッチのルートを見つけました。{test}',
  'app.verify.anchor.eventFailed': 'バッチ {batch}：{reason}。レジストリが報告する日付に頼らないでください。',
  'app.verify.anchor.whyChecking': 'このページがMidnightで調べています。',
  'app.verify.anchor.whyUnreachable': 'このページはMidnightに接続できず、確認できませんでした。',
  'app.verify.anchor.whyNotLooked': 'このページはMidnightで調べていません。',
  'app.verify.anchor.eventReportedTitle': 'レジストリが報告した日付スタンプ',
  'app.verify.anchor.inTx': '（トランザクション {tx}）',
  'app.verify.anchor.eventReported':
    'バッチ {batch}：レジストリの報告では、バッチのルートは{where}に記録されました{tx}。日付は{date}です。{why}確認されるまで、日付に頼らないでください。{test}',
  'app.verify.anchor.summaryAdd': '{summary}Midnightで確認済み：バッチのルートの日付スタンプ。',
  'app.verify.field.existence': 'それ以前からの保有（アンカー後にのみ表示）',
  'app.verify.field.attestation-status': 'DNA報告書が保存されているか',
  'app.verify.field.descent-clean': '系統の状態（レジストリの報告による）',
  'app.verify.field.sealed-at': '封印した日時（保有者の端末の時計）',
  'app.verify.field.parent-names': '親の品種名',
  'app.verify.field.breeding-method': '育種方法',
  'app.verify.field.individual-id': '個体識別番号とその番号の体系',
  'app.verify.field.genetics': '遺伝情報そのもの（設計上、決して開示されません）',
  'app.verify.sum.reports.other': '検査報告書 × {count}',
  'app.verify.sum.receipts.other': 'ラボの受領書 × {count}',
  'app.verify.sum.statements.other': '署名付きの陳述 × {count}',
  'app.verify.sum.what': '（{list}）',
  'app.verify.sum.comma': '、',
  'app.verify.sum.bound': 'リンクのフィンガープリントがレジストリの報告と一致すること',
  'app.verify.sum.inBatch': '記録がそのバッチに入っていること',
  'app.verify.sum.signatures.other': 'それについての署名{count}件{what}',
  'app.verify.sum.nothing':
    'このページの内容は、このブラウザでは何も確認できませんでした。すべてVeilCoreのレジストリの報告です。',
  'app.verify.sum.list': '{rest}、{last}',
  'app.verify.sum.checked': 'このブラウザで確認：{list}。それ以外はすべてVeilCoreのレジストリの報告です。{unbound}',
  'app.verify.sum.unbound':
    'このリンクはフィンガープリントを示していないため、これらの確認にはレジストリ自身のものを使い、チェックは付けていません。',
  'app.verify.heading.nothingSealed': '記録はありますが、何も封印されていません',
  'app.verify.heading.unbound': 'レジストリの報告：このリンクには照合するフィンガープリントがありません',
  'app.verify.heading.checking': '確認しています…',
  'app.verify.heading.reported': 'レジストリが報告した日付スタンプ。ここでは未確認',
  'app.verify.heading.pending': 'バッチに入っています。日付スタンプはまだです',
  'app.verify.heading.none': '日付スタンプはまだありません',
  'app.verify.thisId': 'このID',
  'app.verify.kindReceipt': 'サンプルについてのラボの受領書',
  'app.verify.kindReport': '検査報告書（ファイルのSHA-256 {sha}）',
  'app.verify.kindStatement': '署名付きの陳述',
  'app.verify.forWhom': 'レジストリが報告するフィンガープリントについて：',
  'app.verify.homeAria': 'VeilCoreホーム',
  'app.verify.intro':
    'このページはVeilCoreの記録を確認します。記録とは、遺伝素材の説明のフィンガープリントで、アンカーされると日付が付き、遺伝情報なしで公開されます。確認は無料で、アカウントも不要です。<link>VeilCoreとは？</link>',
  'app.verify.checkingRecord': '記録を確認しています',
  'app.verify.notFound': '{id} の記録は見つかりません',
  'app.verify.notFoundText':
    'この確認用リンクは、レジストリのどの記録とも一致しません。リンクが欠けたり変更されたりしていないか確認してください。',
  'app.verify.goHome': 'veilcore.org へ',
  'app.verify.mismatch.title': 'このリンクのフィンガープリントは記録と一致しません：何も確認していません',
  'app.verify.mismatch.dontRely': 'このページに頼らないでください。',
  'app.verify.mismatch.text':
    '{start}しかしレジストリは {id} について{reported}を報告しています。その答えはリンクが示す記録についてのものではないため、このページは何も確認せず、何も表示していません。記録そのものについては、リンクをくれた人に尋ねてください。',
  'app.verify.mismatch.linked': 'このリンクは、フィンガープリント {fp} の記録のために作られました。',
  'app.verify.mismatch.invalid':
    'このリンクのフィンガープリントは有効ではありません（16進数64文字のはずです）。途中で切れたか、変更された可能性があります。',
  'app.verify.mismatch.reportedFp': 'フィンガープリント {fp}',
  'app.verify.mismatch.noFp': 'フィンガープリントなし',
  'app.verify.mismatch.inLink': 'リンク内のフィンガープリント：{fp}',
  'app.verify.mismatch.chip': 'レジストリの答えはこのリンクと一致しません。このページでは何も確認していません',
  'app.verify.nameTyped': '名前（保有者の入力どおり）：',
  'app.verify.recordId': '記録ID：{id}',
  'app.verify.noCommitment':
    'この記録には確定した内容がないため、何も確認できません。レジストリに存在する、ということだけです。',
  'app.verify.boundFact':
    'このリンクはフィンガープリント {fp} のために作られ、レジストリもこの記録について同じフィンガープリントを報告しています{firstSeen}。対象となる項目は共有されていないため、このページでは再計算できません。',
  'app.verify.firstStored': '（最初の保存は{date}）',
  'app.verify.unboundFact':
    'レジストリは、フィンガープリント {fp} の記録を報告しています{firstSeen}。対象となる項目は共有されていないため、このページでは再計算できません。',
  'app.verify.noFpInLink':
    'このリンクは記録のフィンガープリントを示していないため、レジストリがこの記録のフィンガープリントで答えたのか、別のもので答えたのか、このページではわかりません。下の項目にはチェックが付きません。今この記録から作るリンクは ?fp=… で終わります。保有者に依頼してください。',
  'app.verify.noStampYet':
    'このページでわかる限り、日付スタンプはまだありません。記録が日付スタンプ付きのバッチに入っている証明がここにないため、確認するものがありません。',
  'app.verify.batchBound':
    'このブラウザで確認しました：このフィンガープリントはバッチ {batch} に入っており、その経路はバッチのルート {root}… にたどり着きます。',
  'app.verify.batchUnbound':
    '{forWhom}バッチ {batch} に入っており、その経路はバッチのルート {root}… にたどり着きます。ここで確認しましたが、照合したのはレジストリ自身のフィンガープリントです。',
  'app.verify.rootReported':
    'レジストリの報告では、そのルートは{network}に記録されました{tx}。日付：{date}。{notLooked}{test}',
  'app.verify.notLooked': 'このページは調べていません。日付に頼る前に調べてください。',
  'app.verify.batchNoStamp': 'このバッチには、まだMidnight上の日付スタンプがありません。',
  'app.verify.sigLine': '{forWhom}{kind}。署名はこのブラウザで確認しました。{lead}。',
  'app.verify.sampleDetails': 'サンプルの詳細（レジストリの報告による）：',
  'app.verify.moreSigs': '{forWhom}ほかに署名が{n}件あり、それぞれこのブラウザで確認しました。',
  'app.verify.noneVerified':
    'レジストリは署名付きの証明を報告していますが、このブラウザではどれも確認できませんでした。',
  'app.verify.noneSigned': 'この記録について、ラボの受領書も検査報告書も署名されていません。',
  'app.verify.badSigs.other':
    'レジストリが報告する署名のうち{count}件は、このブラウザで確認できないため、数えていません。',
  'app.verify.ownReceipt': '{lead}。あなたの送付 {tx} に紐付けられています。',
  'app.verify.ownReceiptTail':
    'これが見えるのは、植物がこのブラウザにあるからです。リンクを送った相手には、上の署名の行だけが見えます。',
  'app.verify.sharedTitle': '保有者が共有 · レジストリの報告',
  'app.verify.notGranted': 'このリンクは{list}を求めていますが、保有者は共有していません。',
  'app.verify.unavailable':
    'このリンクは、この記録ではなく保有者についての事実（{list}）を求めています。レジストリはそれには決して答えません。',
  'app.verify.footer': 'フィンガープリント {fp} · 送信されたのは上の事実だけです · 遺伝情報は開示されていません',
  'app.verify.mark.checked': 'このブラウザで確認済み',
  'app.verify.mark.reported': 'ここでは未確認',
  'app.verify.mark.failed': '失敗または撤回',
  'app.verify.mark.key': '記号の意味',
  'app.verify.own.preview':
    'それ以前からの保有：レジストリがこの記録のバッチのアンカーを報告して初めて、レジストリの報告として表示されます。',
  'app.verify.own.anchored':
    'それ以前からの保有：レジストリの報告では、この記録のバッチは{network}にアンカーされました。{found}{test}',
  'app.verify.own.found':
    'このページは、その日付スタンプをMidnight上で直接見つけました（上記）。日付が付くのは記録であり、誰が保有していたかではありません。',
  'app.verify.own.notConfirmed': 'このページはチェーン上で確認していません。',
  'app.verify.own.notAnchored':
    'それ以前からの保有：まだアンカーされていないため、日付はこのレジストリの記録に基づきます。',
  'app.verify.dna.saved': '保有者はこの記録にDNA報告書を保存しました。',
  'app.verify.lineage.intact':
    'レジストリの報告では、系統は途切れていません。封印された記録まで、途切れずにさかのぼれます。このページでは確認していません。',
  'app.verify.lineage.notChecked':
    '系統：このページでは未確認です。共有されたリンクについては、レジストリは系統をたどりません。',
  'app.verify.sealedAt': '封印（保有者の端末の時計による）：{date}。これは保有者自身の陳述です。{first}',
  'app.verify.firstStoredBy': 'このレジストリへの最初の保存：{date}。',
  'app.verify.parents': '親（保有者の申告による）：{list}',
  'app.verify.noParents': '親は記録されていません。',
  'app.verify.method': '育種方法（保有者の申告による）：{method}',
  'app.verify.noMethod': '育種方法は記録されていません。',
  'app.verify.sharedNothing': '保有者は、上の基本情報以外は何も共有していません。',
  'app.verify.notShared': '保有者が共有していないもの：{list}。',
  'app.verify.alwaysShown':
    '常に表示されるもの：品種名、記録ID、そのフィンガープリント（{fp}）、レジストリが最初に保存した日時、そしてバッチと署名付きの証明（ラボの受領書、検査報告書）についてこのページが確認できたこと。',
  'app.verify.ex.title': '例：架空の記録です。',
  'app.verify.ex.intro':
    '記録の確認ページがどのように見えるかを、各行の下に説明を付けて示します。ここでは何も照会も確認もしていません。',
  'app.verify.ex.status': '例 · 封印済みのバッチ内 · アンカーの報告あり',
  'app.verify.ex.name': 'Harbour Mist（例）',
  'app.verify.ex.fact1':
    'このリンクはフィンガープリント 3f9a0c41e2b7… のために作られ、レジストリもこの記録について同じフィンガープリントを報告しています。',
  'app.verify.ex.note1':
    'フィンガープリントはリンク自体に入っているので、ページがだまされて別の記録の確認結果を表示することはありません。',
  'app.verify.ex.fact2':
    'このブラウザで確認しました：このフィンガープリントはバッチ 41 に入っており、その経路はバッチのルートにたどり着きます。',
  'app.verify.ex.note2':
    '実際の記録ではこの行にチェックが付きます。記録がバッチに入っていることを、あなた自身のブラウザが確認します。',
  'app.verify.ex.fact3':
    'Midnightで確認しました：このバッチのルートは、ブロック 2973563 のトランザクション 9c41e0…b27d により、2026-10-11 14:03 UTCに書き込まれました。{test}',
  'app.verify.ex.note3':
    '記録に日付を付けるのは、{network}上のこのトランザクションです。実際の記録では、ブラウザがMidnightのインデクサーに問い合わせ、それがこのバッチのルートをVeilCoreのコントラクトに書き込んだかを確認します。どのインデクサーも応答しなければ、行にそう表示され、日付はレジストリの報告にすぎません。頼る前に、midnightexplorer.com などのMidnightエクスプローラーでトランザクションを調べてください。',
  'app.verify.ex.fact4':
    '検査報告書（ファイルのSHA-256 7c1e04d2…9b3a51）。署名はこのブラウザで確認しました。署名者：「Example Lab」という名前の鍵（名前は未確認）。',
  'app.verify.ex.note4':
    'ラボは、サンプルの受領書と検査報告書に、自分の鍵で署名できます。各行にどちらかが書かれています。ページは署名を確認します。その鍵が信頼できるラボかどうかは、あなたが判断します。',
  'app.verify.ex.fact5':
    '保有者はこの記録にDNA報告書を保存しました。そのファイル（SHA-256 7c1e04d2…9b3a51）は、「Example Lab」という名前の鍵（名前は未確認）が署名した検査報告書と一致します。署名はこのブラウザで確認しました。',
  'app.verify.ex.note5':
    'ここに表示する事実は保有者が選びます。共有されていないものは、共有されていないと表示されます。',
  'app.verify.ex.marks':
    '✓ このページが、あなたのブラウザでその行自体を確認しました。○ VeilCoreのレジストリまたは保有者の報告で、このページは確認していません。⊗ 確認に失敗したか、ラボが署名を撤回しました。',
  'app.verify.ex.checkReal': '実際の記録を確認する',
  'app.verify.ex.what': 'VeilCoreとは？',
} satisfies Partial<AppTranslation>;
