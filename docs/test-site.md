# The public test site (test.veilcore.org)

The whole app on the preprod test network, for anyone to try: log a plant with a date
stamp, back it up, send it to a lab, get locked results back, prove it by link. Free: the
sponsor pays test fees.

Until 14 Oct 2026 the full test version only ran on Hunter's Mac, because reading the
preprod chain needs a Blockfrost key and a key in a web page is a key for everyone. Now the
browser reads the chain through the sponsor (`sponsor/src/indexer-relay.ts`), which holds
the key, relays reads only (mutations refused), only for the site's own origins, with a
per-address allowance and a cap on open sockets. The page carries no key, so it can be
hosted.

## Deploying it (Hunter's Mac)

1. Railway, `veilcore-sponsor` → Variables: `ALLOWED_ORIGINS` gets `https://test.veilcore.org`
   added (comma-separated, keep `http://localhost:4173`).
2. Redeploy the sponsor with the relay: `npm run stage -w sponsor`, then the `railway up …`
   command it prints (linked to `veilcore-sponsor`).
3. `VEILCORE_TEST_REGISTRY=https://<preprod registry> VEILCORE_TEST_SPONSOR=https://<sponsor> npm run deploy:test`

Deploy the registry before the site: the site's sample custody fields (the sample details a lab sees, and what it notes on arrival) use the registry's `/transfers/:id/custody` route.

`deploy:test` refuses (`NOT DEPLOYED. …`) unless the registry and the sponsor both say
preprod, the registry's `/health` lists `sealed-records-v1`, `lab-results-v1` and
`animal-profile-v1` (if not: deploy the registry first), the sponsor uses the practice contract, the relay answers for test.veilcore.org, and the proving files
are on this computer. It makes a preview deployment (never `--prod`) and aliases it to
test.veilcore.org only. The domain is deliberately not added to the Vercel project: a
project domain would follow every production deploy of veilcore.org.

## What it is and isn't

- Test network: records can be reset and carry no evidential weight. The site says so.
- Rate limits are the sponsor's (3 transactions an hour per address on the normal settings,
  a daily fee budget). The test settings from the 12 Oct run (10 an hour) should go back to
  normal before the link is shared widely.
- veilcore.org (mainnet) is unchanged by this.
