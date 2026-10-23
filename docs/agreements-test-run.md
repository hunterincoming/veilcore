# Agreements: the test run before mainnet

One full run on the test network (test.veilcore.org, preprod) of everything in
`docs/agreements-live.md`, by Hunter, with two devices: the Mac as the breeder and a phone
as the grower. About an hour. Nothing here touches mainnet.

## 1. Put the new code up (Mac, 15 minutes)

**Registry.** Railway → `veilcore-api-preprod` → Settings → Source → Branch: change
`feat/lab-results` to `license-invites`. It redeploys by itself. Wait until the deployment
is Active, then check it lists the new parts:

```
curl -s https://veilcore-api-preprod-production.up.railway.app/health
```

The `features` list must include `license-invites-v1`, `deals-v1`, `payment-receipts-v1` and `passkey-vault-v1`.

**Sponsor** (the test one, `veilcore-sponsor`; never `veilcore-sponsor-mainnet`):

```
cd ~/Desktop/veilcore
git fetch origin
git checkout feat/real-licences
git pull
npm ci
npm run stage -w sponsor
```

Then run the `railway up …` line it prints, linked to `veilcore-sponsor`. In Railway, check
`veilcore-sponsor` has no `SPONSOR_CIRCUITS` variable: without it, a test sponsor pays for the
agreement calls too.

**Site:**

```
VEILCORE_TEST_REGISTRY=https://veilcore-api-preprod-production.up.railway.app VEILCORE_TEST_SPONSOR=https://veilcore-sponsor-production.up.railway.app npm run deploy:test
```

It refuses, and says why, if the registry or sponsor isn't ready.

## 2. The run

Write down anything that looks wrong or reads badly, with a screenshot. Each side's license page shows its steps with the current one marked, and once it is live, a **Your turn** or **Their turn** line says what happens next: if that line is ever wrong, note it.

| # | Who | Do | You should see |
|---|---|---|---|
| 1 | Mac | test.veilcore.org: date a plant, save and check the backup, set up proof you hold it on its page | Its date, then "proof set up" |
| 2 | Mac | On the plant's page: License. Royalty 5% of sales, royalty on offspring 2%. Open the license, **Make a link for them**, send it to the phone | A link |
| 3 | Phone | Open the link, **Accept**, then **Save backup** (save and check it; it comes back to the license) | Step 3 of 4 with a 6-digit code |
| 4 | Both | Read the codes to each other | The same 6 digits on both screens |
| 5 | Mac | Tick "They read me this same code", **Issue it** | "Issued on Midnight" in a few minutes |
| 6 | Phone | Read the terms, tick "I agree", **Agree and activate** | "Your license is live", the terms, Royalties |
| 7 | Mac | Refresh the license | Live, "They signed their agreement…" |
| 8 | Mac | Royalties: **Set it** (how you get paid) | "Paid to: …" on both |
| 9 | Phone | **File a statement** for last month, sales 10000, and attach any small CSV as the sales report | Owed 500.00, "Backed by their sales report" |
| 10 | Mac | **Check the file they sent** with the same CSV (AirDrop or email it), then with another file; then **Accept it** | "It's the exact file…", then "That's not the file…"; "Accepted, to be paid" on both |
| 11 | Phone | **Payment request for a partner** (a file downloads), then **I paid it** | "Paid, waiting for confirmation" |
| 12 | Mac | **Confirm I received 500.00 USD**, then open **Records and credentials**: **Send them a license credential** and **Send a payment credential** | "Paid and confirmed" on both; on the phone, **Records and credentials** lists both to download |
| 13 | Phone | Date the phone's own plant of these genetics and set up proof you hold it, then on the license: name it | "Their record: …" on the Mac |
| 14 | Mac | **Put it on their record** | "proposed" |
| 15 | Phone | **Accept it, as agreed** | "in force on Midnight" on both |
| 16 | Mac (new private window) | Open the plant's check link, **Make a link for them** under "Check someone holds a license", send it to the phone | A link |
| 17 | Phone | Open it, **Prove it** | "Done" |
| 18 | Mac (private window) | Wait | "Checked on Midnight: a live license from this record" |
| 19 | Mac | Plant page → Family on Midnight: put a second plant of yours on chain as its parent | The parent listed |
| 20 | Mac | License: **Revoke on chain**, give a reason, **Yes, revoke it** | "No longer on Midnight" on both within a minute or two |
| 21 | Both | Repeat 16 and 17 | The phone says its license is no longer live, and nothing is sent |
| 22 | Phone | Backup page: **Make a passkey copy** (Face ID) | "Passkey copy up to date" |
| 23 | Phone | Private tab on the same phone: Restore → **Use my passkey** | Everything back, "From your passkey copy saved …" |

Optional, on a computer: paste a downloaded credential into a W3C verifier that supports
`eddsa-jcs-2022` (for example the Digital Bazaar or Spruce playgrounds) to see it check out
without VeilCore.

## 3. After

Send Claude the notes and screenshots. When the run is clean and Mako has said yes, the
mainnet switch is two reviewed lines (`AGREEMENTS_LIVE` in `bboard-ui/src/config/copy.ts`,
`MAINNET_AGREEMENTS` in `sponsor/src/policy.ts`) and merging `license-invites` into the
registry's main.
