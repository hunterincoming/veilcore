// The record app in English: royalty payments made visible (overdue, reminders, revoke for
// non-payment, the public check page's notices) and paying in a US dollar stablecoin on
// Cardano (veilcore/royalty-ledger.ts paymentAlerts, veilcore/license-notices.ts,
// veilcore/cardano-pay.ts, components/licensing/RoyaltyPay.tsx). Source text; see log.ts.
// SPDX-License-Identifier: Apache-2.0

export const royaltyPay = {
  // ---- due soon, overdue: both sides ----
  'app.rpay.st.overdue': 'Overdue',
  'app.rpay.l.soon': 'Reminder: payment for report {n} is due on {date}.',
  'app.rpay.l.overdue': 'Payment for report {n} is overdue since {date}.',
  'app.rpay.l.consequence':
    'If it isn’t paid, the public check page of {licensor}’s record can say a royalty statement is overdue. After a notice of breach you have {days} days to pay before the license can be revoked for non-payment.',
  'app.rpay.i.soon': 'Payment for report {n} from {licensee} is due on {date}.',
  'app.rpay.i.overdue': 'Payment for report {n} from {licensee} is overdue since {date}.',
  'app.rpay.i.publicFailed':
    'Couldn’t put this on your record’s public check page just now. The page tries again the next time it opens.',
  'app.rpay.i.publicUnsupported':
    'VeilCore’s registry doesn’t take public notices yet, so this isn’t on your record’s public check page.',
  // ---- revoke for non-payment ----
  'app.rpay.revoke.open': 'Revoke for non-payment',
  'app.rpay.revoke.yes': 'Revoke the license',
  'app.rpay.revoke.note': 'License revoked for non-payment of report {n}.',
  'app.rpay.revoke.reason': 'Non-payment',
  // ---- the public check page ----
  'app.rpay.pub.title': 'Royalties on licenses from this record',
  // ---- paying in a stablecoin on Cardano: the licensor's payout ----
  'app.rpay.payout.option': 'US dollar stablecoin on Cardano',
  'app.rpay.payout.info':
    'They pay from their own wallet straight to your Cardano address, in {code}. By saving this you agree that 1 {code} counts as 1 US dollar. Cardano payments are public: anyone can see the amount, both addresses and the date. The payment doesn’t name you, but an address can often be traced to a person, for example through an exchange. A new address just for this deal keeps it apart from your others. VeilCore never holds or moves the money.',
  'app.rpay.payout.token': 'Stablecoin',
  'app.rpay.payout.address': 'Your Cardano address ({prefix}…)',
  'app.rpay.payout.useMine': 'Use my {name} address',
  'app.rpay.payout.sanctioned': 'This address is on the US sanctions list, so it can’t be used.',
  'app.rpay.method': 'on Cardano, in {code} (1 {code} = 1 USD)',
  'app.rpay.addr.not': 'That isn’t a Cardano address (check it was copied whole).',
  'app.rpay.addr.notPayment': 'That isn’t a Cardano payment address (it should start with addr).',
  'app.rpay.addr.otherNetwork': 'That address is for another Cardano network, not {network}.',
  // ---- the licensee's pay screen ----
  'app.rpay.pay.title': 'Pay from your Cardano wallet',
  'app.rpay.pay.button': 'Pay {amount} {code} with {name}',
  'app.rpay.pay.waiting': 'Waiting for your wallet…',
  'app.rpay.pay.wallet': 'Wallet',
  'app.rpay.pay.noWallet':
    'This browser has no Cardano wallet. Open this page where you have one (Lace, Eternl or another CIP-30 wallet).',
  'app.rpay.pay.shows':
    'Your wallet shows it before you sign: {amount} {code} to {to}, a little ada that Cardano requires with a token, the network fee, and the reference {ref}.',
  'app.rpay.pay.screened':
    'Both addresses are checked against the US sanctions list (OFAC, Cardano addresses, list of {date}) before anything is built.',
  'app.rpay.pay.howTitle': 'How this works',
  'app.rpay.pay.how':
    'Your wallet pays {licensor} directly. VeilCore never holds, pauses or moves the money and takes no fee from it. The reference on the payment lets both pages find it on Cardano: once it is 10 blocks deep and pays at least {amount}, the report counts as paid and settled, with no other step. The sanctions check is a list check only: it can’t see where money came from, and the list is only as new as its date.',
  'app.rpay.pay.sent': 'Your wallet signed transaction {tx}, but it isn’t recorded for {licensor} yet.',
  'app.rpay.pay.forget': 'Not in my wallet’s history: pay again',
  'app.rpay.pay.off':
    '{licensor} asked to be paid in {code} on Cardano. Paying that way from this page isn’t switched on here yet: ask them for other payment details.',
  'app.rpay.pay.notUsd': 'This report is in {currency}. Paying in a stablecoin is only for reports in US dollars.',
  'app.rpay.pay.notPar':
    '{licensor}’s Cardano details don’t say that 1 {code} counts as 1 US dollar, so this page can’t offer it.',
  'app.rpay.w.otherNetwork': 'Your wallet is on another Cardano network. Switch it to {network} and try again.',
  'app.rpay.w.sanctioned':
    'Stopped: an address in this payment is on the US sanctions list, or couldn’t be read. Nothing was built or sent.',
  'app.rpay.w.noCoins': 'Your wallet has no coins to pay with.',
  'app.rpay.w.cantBuild': 'Couldn’t build the payment ({why}). Nothing was sent.',
  // ---- the check on Cardano, both sides ----
  'app.rpay.c.checking': 'Checking the payment on Cardano…',
  'app.rpay.c.ok': 'Paid and settled: {amount} in {code}, checked on Cardano (transaction {tx}, {n} blocks deep).',
  'app.rpay.c.unconfirmed': 'The payment is on Cardano but not 10 blocks deep yet. The page checks again.',
  'app.rpay.c.failed': 'That transaction failed on Cardano. It paid nothing.',
  'app.rpay.c.no-ref': 'That transaction carries no VeilCore payment reference.',
  'app.rpay.c.many-refs': 'That transaction carries more than one payment reference, so it counts for none.',
  'app.rpay.c.wrong-ref': 'That transaction’s reference is for another statement.',
  'app.rpay.c.none': 'That transaction paid no {code} to the payout address.',
  'app.rpay.c.short': 'That transaction paid {paid} {code}, less than {amount}. The rest is still owed.',
  'app.rpay.c.not-found': 'Cardano has no such transaction yet (it can take a minute).',
  'app.rpay.c.unreachable': 'Couldn’t reach Cardano. The page tries again.',
  'app.rpay.c.no-relay': 'This site can’t check Cardano yet, so {licensor} confirms the payment by hand.',
  'app.rpay.c.not-tx': 'The payment reference isn’t a Cardano transaction.',
  'app.rpay.l.breach':
    '{licensor} sent a notice of breach on {date}. Pay by {cureBy}: after that day, if nothing is marked paid, they can revoke the license for non-payment.',
  'app.rpay.l.cureOver':
    '{licensor} sent a notice of breach on {date}, and the time to pay ended on {cureBy}. They can now revoke the license for non-payment. If you have paid, record it with “I paid”.',
  'app.rpay.i.breach':
    'You sent a notice of breach on {date}. {licensee} has until {cureBy} to pay. “Revoke for non-payment” is offered from the day after, if nothing is marked paid.',
  'app.rpay.i.cureOver':
    'You sent a notice of breach on {date}. The time to pay ended on {cureBy} with nothing marked paid, so you may revoke for non-payment.',
  'app.rpay.i.noNotice':
    'To revoke for non-payment, first send a notice of breach on the report below. {licensee} then has {days} days to pay.',
  'app.rpay.i.answered': '{licensee} disputes this ({date}): “{note}”',
  'app.rpay.l.iPaid': 'I paid',
  'app.rpay.l.dispute': 'Dispute it',
  'app.rpay.l.disputeAgain': 'Answer again',
  'app.rpay.l.disputeNote': 'Why (short; they’ll see it)',
  'app.rpay.l.disputeSend': 'Send my answer',
  'app.rpay.breach.open': 'Send a notice of breach',
  'app.rpay.breach.what':
    'A signed, dated notice to {licensee} that this payment is overdue. They then have {days} days to pay. Only after that, if nothing is marked paid, can you revoke the license for non-payment.',
  'app.rpay.breach.send': 'Send the notice',
  'app.rpay.breach.extra': 'Anything to add (optional; they’ll see it)',
  'app.rpay.breach.note':
    'Payment for report {n}, due on {due}, has not been made. You have {days} days from this notice to pay. After that, if it is still unpaid, the license may be revoked for non-payment.',
  'app.rpay.revoke.notYet':
    'Not yet: revoking for non-payment is only possible once the time to pay after your notice of breach has run out with nothing marked paid.',
  'app.rpay.notice.answer': '{who} disputed the payment for {period} on {date}: “{note}”',
  'app.rpay.notice.revoked': '{who} revoked the license for non-payment ({period}) on {date}.',
  'app.rpay.notice.cureBy': 'Time to pay: until {cureBy}.',
  'app.rpay.pub.disputed': 'The licensee disputes this (since {date}).',
  'app.rpay.i.public':
    'Your record’s public check page says: “The record holder says a royalty statement is overdue since {date}.” No amounts, terms or names. It comes off the next time this page checks, once the payment is recorded.',
  'app.rpay.i.publicBreach':
    'Your record’s public check page says, as your word, that a royalty statement is overdue since {date}, and that you told VeilCore’s registry on {breach} that you had sent a notice of breach. The time to pay counts from that day. No amounts, terms or names.',
  'app.rpay.i.publicAnswers': 'Beside it, in the licensee’s own name: {answers}',
  'app.rpay.i.publicNoRecord':
    'This record isn’t saved on VeilCore’s registry under this browser’s holder key, so nothing can go on its public check page from here. Open the license on the device that saved the record, or restore your backup here.',
  'app.rpay.revoke.what':
    'This ends the license on Midnight and can’t be undone. Your notice of breach was sent and the time to pay has run out by VeilCore’s registry’s clock, with nothing marked paid. {licensee} then gets a signed notice that it was revoked for non-payment. Your record’s public check page says so, with the date, if the registry agrees the time to pay ran out with no payment on file; otherwise it says nothing about payment.',
  'app.rpay.revoke.done': 'Revoked for non-payment on {date}.',
  'app.rpay.revoke.public': 'Your record’s public check page says so.',
  'app.rpay.revoke.notPublic':
    'VeilCore’s registry didn’t accept a public line about non-payment (the time to pay hadn’t run out by its clock, or a payment is on file), so the public check page says nothing about payment.',
  'app.rpay.pub.overdue': 'The record holder says a royalty statement is overdue since {date}.',
  'app.rpay.pub.breach': 'The record holder told VeilCore’s registry on {date} that they had sent a notice of breach.',
  'app.rpay.pub.revoked': 'The record holder says a license from this record was revoked on {date} for non-payment.',
  'app.rpay.pub.revokedChecked':
    'The record holder told VeilCore’s registry on {date} that they had sent a notice of breach, and {days} days passed after that with no payment on file there before this line was accepted.',
  'app.rpay.pub.answerPaid': 'The licensee says it was paid ({date}).',
  'app.rpay.pub.who':
    'Whether a payment was due is the record holder’s word; VeilCore doesn’t check it. The date beside a notice of breach is the day the record holder told VeilCore’s registry about it, by the registry’s own clock. The licensee’s answers are signed by the licensee, and the record holder can’t remove them. No one is named, and no amounts or terms are shown.',
  'app.rpay.l.answered':
    'You disputed this on {date}: “{note}”. {licensor} sees it. Your answer is filed with VeilCore’s registry under your own key (on {filed}). Any line about this payment on {licensor}’s record’s public check page shows that you dispute it, with that date, and {licensor} can’t remove it.',
  'app.rpay.l.answerPending':
    'You disputed this on {date}: “{note}”. {licensor} sees it. Filing your answer with VeilCore’s registry, where {licensor}’s record’s public check page shows it, hasn’t worked yet. This page tries again whenever it opens.',
  'app.rpay.l.disputeShows':
    '{licensor} sees this, signed by you. It is also filed with VeilCore’s registry in your name: the public check page shows only that you dispute it and the date, never what you wrote.',
  'app.rpay.pay.otherWay':
    '{licensor} asked to be paid in {code} on Cardano, which this page can’t pay. Contact {licensor} for other payment details, pay them that way, then record it below with “I paid”.',
  'app.rpay.l.revoked':
    '{licensor} revoked the license for non-payment of report {n}, in a signed notice dated {date}.',
  'app.rpay.l.revokedPublic':
    '{licensor}’s record’s public check page says it was revoked on {date} for non-payment. VeilCore’s registry accepted that only after the time to pay ran out by its clock with no payment on file.',
  'app.rpay.l.revokedNotPublic':
    '{licensor}’s record’s public check page says nothing about non-payment: VeilCore’s registry hasn’t accepted it.',
  'app.rpay.l.revokedDisputed':
    'You disputed this on {date}. Your answer is filed with VeilCore’s registry in your own name, and {licensor} can’t remove it: any line about this payment on {licensor}’s record’s public check page shows that you dispute it.',
  'app.rpay.notice.early': 'It was sent before the payment was late, so it starts no time to pay.',
  'app.rpay.notice.notThisOne': 'The time to pay counts from the first notice of breach after the payment was late.',
  'app.rpay.predates':
    'This license was made before VeilCore’s registry kept the keys that public notices need, so nothing about its payments can go on the public check page or be answered there. Reminders, notices of breach, the time to pay and answers still work between the two of you, signed.',
  'app.rpay.i.breachNotRegistered':
    'The public check page says this payment is overdue, but not yet that you sent a notice of breach: {licensee}’s page hasn’t registered this report with VeilCore’s registry. It does that by itself the next time they open the license. Until then the time to pay can’t start there. Your signed notice is in the deal either way.',
  'app.rpay.i.breachNotDue':
    '{licensee} registered this report with VeilCore’s registry as due on {due}, so the public check page can say you sent a notice of breach only from the day after. Until then it says the payment is overdue. Your signed notice is in the deal either way.',
  'app.rpay.l.answerPredates':
    'You disputed this on {date}: “{note}”. {licensor} sees it, signed by you. This license was made before VeilCore’s registry kept the keys that answers need, so it can’t be filed there.',
  'app.rpay.l.pubOverdue':
    '{licensor}’s record’s public check page says, as their word, that a royalty statement is overdue since {date} (report {n}).',
  'app.rpay.l.pubOverdueOther':
    '{licensor}’s record’s public check page says, as their word, that a royalty statement is overdue since {date}, about a message in this deal that isn’t one of your reports.',
  'app.rpay.l.pubRevoked':
    '{licensor}’s record’s public check page says, as their word, that a license from the record was revoked on {date} for non-payment.',
  'app.rpay.l.pubBreach':
    '{licensor} told VeilCore’s registry on {date} that they had sent a notice of breach. The time to pay runs until {cureBy}.',
  'app.rpay.l.pubAnswers': 'Beside it, in your own name: {answers}',
  'app.rpay.l.pubDisputeFailed': 'Your answer couldn’t be filed just now. Try again in a moment.',
};
