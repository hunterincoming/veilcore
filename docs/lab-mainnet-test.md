# Lab signing on veilcore.org: the first run on mainnet

Lab signing is switched on for veilcore.org but the site does not call it live. The home page
says "Built, not yet tried on the main network." This run is what changes that. Only the
maintainer does it.

Do it after the site deploy that carries the switch. Use a computer and Chrome. Everything here
is real on mainnet, so put "TEST" in every name.

You need two windows:

- your normal window, where you play both the lab and the breeder;
- a private (incognito) window, which is a stranger with no keys.

Stop at the first step that fails (see "If a step fails" at the end).

## Steps

1. **Make a test record.** Open https://veilcore.org/new. Under "What do you want to prove?"
   pick **Plants**. Name it `TEST lab signing 1`, use made-up details, and finish.
   **Pass if:** the record is listed under **Your records** at https://veilcore.org/records.

2. **Copy its proof code.** Open the record and copy its **Proof code** (64 letters and
   numbers). Keep it in a note.
   **Pass if:** the note holds 64 characters.

3. **Make the lab's key.** On https://veilcore.org/records press **Set up your lab's
   signature**. (If you don't see that button, press **I'm a lab**, then **I run a lab** first.)
   Name: `TEST Lab (Hunter)`. Role: **Laboratory**. Leave the accreditation fields
   empty. Press **Create my key**, then save the new backup it asks for.
   **Pass if:** the box shows your key and closes with **Continue** or **Done**, with no error.

4. **Open the lab's tools.** Open https://veilcore.org/lab/results (or press **Sign lab
   results** on the records page).
   **Pass if:** the page is titled **Sign lab results** and shows the tabs **One result** and a
   spreadsheet tab. It must not say "Lab results are on the test network only."

5. **Check what is not offered.** Open the list **What kind of result**.
   **Pass if:** "Viability test before or after a kill step" is NOT in the list. (That kind
   stays on the test network.)

6. **Sign one result.** Tab **One result**. What kind of result: **Pathogen or viroid test**.
   **Proof code the sender gave for this sample**: paste the code from step 2. Sample ID
   `TEST-1`. Your accession number `TEST-1`. Method or SOP `TEST`. Method version `1`. Tested
   for `HLVd`. Result **Not detected**. Date tested: today. Press **Sign this result**.
   **Pass if:** it says **Signed and kept** and **Your lab's name is on it.**

7. **Keep the file.** Press **Download the result file**.
   **Pass if:** a file is saved to your computer.

8. **Check the file as a stranger.** In the private window open
   https://veilcore.org/check-lab-result, press **Choose the result file** and pick the file.
   **Pass if:** the result is shown with "Not detected" and HLVd, and there is no "This result
   can't be used".

9. **Look up the lab's name.** Still in the private window, press **Find the lab's name**.
   **Pass if:** it shows `TEST Lab (Hunter)`, marked "name not checked".

10. **Confirm it is private.** In your normal window open the test record, press **Show
    someone**, then **Get the link**. Open that link in the private window.
    **Pass if:** the page shows no lab name, no result and no "HLVd". If it has a lab line at
    all, it is only "The holder hasn't shown any lab signatures here."

11. **Add the result to the breeder's records.** In your normal window open
    https://veilcore.org/check-lab-result, choose the same file, press **Find the record this
    sample was sent under**, then **Add it as a record you hold**, then **Open the record**.
    **Pass if:** the record opens and shows the lab's signature.

12. **Publish the signature.** On that record press **Publish it on Midnight**. This is a real
    mainnet transaction; VeilCore's fee service pays. It can take a few minutes.
    **Pass if:** it says "Published on Midnight in block …". Write the block number down.

13. **Show the result to a stranger on purpose.** On the same record, under **Prove one
    number**, prove the result ("not detected"), press **Copy the link that proves this**, and
    open the link in the private window.
    **Pass if:** the page names `TEST Lab (Hunter)` and shows "not detected".

## If a step fails

Stop. Take a screenshot of the page and note the step number. Do not retry more than once: each
try is real. Lab signing can be switched off again for mainnet by listing `'mainnet'` in
`LAB_SIGNING_OFF` (`bboard-ui/src/config/network.ts`) and deploying the site.

## After all 13 steps pass

One reviewed change, then a normal site deploy:

1. `bboard-ui/src/config/copy.ts`: set `LAB_SIGNING_RUN_ON_MAINNET = true`, with the date and
   the block from step 12 in its comment.
2. `bboard-ui/src/i18n/copy-truth.test.ts`: change `expect(signedRun).toBe('false')` to `'true'`.
3. `docs/lab-signing.md` and `README.md`: say it has worked on veilcore.org, with the date.
4. The SDK's `EVIDENCE.md` ("What is running, and where"): move lab-signed numbers to the live
   list there, then copy the file into this repo as usual.

After that deploy the home page's "What works, and where" row says "Yes" for veilcore.org, in
all five languages.
