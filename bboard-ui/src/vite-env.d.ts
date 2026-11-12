import 'vite/client';

// Without this every `import.meta.env.VITE_*` read is `any`, which then flows
// into whatever it touches. Declaring the variables the app actually uses means
// a typo in an env name is a compile error rather than `undefined` at runtime.
//
// `declare global` is required because the import above makes this file a
// module: without it these interfaces are local and augment nothing.
declare global {
  interface ImportMetaEnv {
    /** Base URL of the metadata API. Empty string means same-origin. */
    readonly VITE_API_BASE: string;
    /** Midnight network the UI talks to. */
    readonly VITE_NETWORK_ID: string;
    /** Mainnet builds only, from api/src/deploy-guard.ts (vite.config.ts). Display only. */
    readonly VITE_MAINNET_CONTRACT_ADDRESS: string;
    readonly VITE_MAINNET_CLAIMS_ADDRESS: string;
    /** Mainnet builds only: 'true' when docs/maintenance-policy.md says APPROVED (vite.config.ts). */
    readonly VITE_MAINTENANCE_POLICY_APPROVED: string;
    /** "1" turns on real transactions from the demo (veilcore/chain/config.ts). Off otherwise. */
    readonly VITE_REAL_CHAIN?: string;
    /** The demo contract on the test network, 64 hex characters. */
    readonly VITE_REAL_CHAIN_CONTRACT_ADDRESS?: string;
    /** The sponsor service that pays the network fee. */
    readonly VITE_SPONSOR_URL?: string;
    /** Optional indexer override; the network's public indexer otherwise. */
    readonly VITE_INDEXER_URL?: string;
    readonly VITE_INDEXER_WS_URL?: string;
    /**
     * The check page's indexer relay (sponsor relay-main, docs/check-on-chain.md): the only
     * indexer a mainnet build reads. No key in it (veilcore/chain/config.ts ignores one).
     */
    readonly VITE_INDEXER_RELAY_URL?: string;
    /** Optional second, independent indexer: both must give the same answer. */
    readonly VITE_INDEXER_SECOND_URL?: string;
    /** Test-network builds hosted at their own address (test.veilcore.org): the origin shared links use. */
    readonly VITE_CANONICAL_ORIGIN?: string;
    /** 'true' shows the notice that dating on Midnight is paused (config/network.ts). Off otherwise. */
    readonly VITE_DATING_PAUSED?: string;
    /** Ask's on-device model: unset (never offered), 'on', or 'test' / 'eval' for builds never deployed (ask-local/manifest.ts). */
    readonly VITE_ASK_MODEL?: string;
    /**
     * The Cardano relay (sponsor/src/cardano-relay.ts, `<relay>/cardano`): where a stablecoin
     * royalty payment is checked. No key in it. Unset: the page says it can't check Cardano.
     */
    readonly VITE_CARDANO_RELAY_URL?: string;
    /** A preprod test token standing in for USDCx (`CODE:policy:name:decimals`); ignored on mainnet. */
    readonly VITE_CARDANO_TEST_ASSET?: string;
    /** "on" offers stablecoin pay on a test network, with VITE_CARDANO_TEST_ASSET (config/copy.ts). Ignored on mainnet. */
    readonly VITE_STABLECOIN_PAY?: string;
    /** '1' only in the end-to-end build (package.json e2e:build): adds the /e2e fixture pages. */
    readonly VITE_E2E_FIXTURES?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}
