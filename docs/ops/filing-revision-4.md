# Filing deployment record revision 4 (about 15 minutes)

**Done 7 October 2026** (midnight-improvement-proposals pull request #373). Kept as the
record of how it was filed.

Only after both founders have confirmed the three maintenance decisions and their
confirmations and sign-off dates are in the record. Done in the browser, so the commit
is in the filer's name and signed by GitHub.

1. On the Mac, get the final file and give it the upstream name:
   ```
   cd ~/Desktop/veilcore
   git pull
   cp docs/deployment-record-revision-4.md ~/Desktop/veilcore.md
   ```
2. Open github.com/midnightntwrk/midnight-improvement-proposals and click **Fork** (or, if
   you already have a fork, open it and click **Sync fork**, then **Update branch**).
3. In your fork, open the `deployments` folder. Click **Add file**, then **Upload files**.
   Drag `veilcore.md` from your Desktop in. It replaces the existing `veilcore.md` (same
   name, same folder).
4. Under **Commit changes**:
   - Message: `deployments/veilcore.md: revision 4, filed before the mainnet deploy`
   - Choose **Create a new branch for this commit and start a pull request**. Name it
     `veilcore-revision-4`.
   - Click **Propose changes**.
5. On the pull request page, check it targets `midnightntwrk/midnight-improvement-proposals`
   `main`. Title: `VeilCore: deployment record revision 4 (before mainnet)`. Paste the
   description prepared for it. Click **Create pull request**.
6. Send the maintainer (hunter@veilcore.org) the pull request link, to fill in *Filed upstream*
   in our copy.

Then the deploy can go ahead: `export VEILCORE_DEPLOYMENT_RECORD_REVISION=4` is true from
here on.
