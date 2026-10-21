// VerifyPage (/verify/:id) — the public page a stranger reaches from a link or a
// certificate's QR code. It works for a visitor who has never loaded the app.
//
// What it says is split by who stands behind it (attack round D):
//   - checked in this browser: the record's inclusion proof (bound to its fingerprint,
//     path folding to the batch root) and any signed attestations (bound to the
//     fingerprint, signatures verified here). Only these get a tick, and only when the
//     fingerprint came from the link (`?fp=`), not from the registry's answer. Checked
//     against the registry's own value, a lying registry could answer one record's id
//     with another record's fingerprint and borrow its proof and lab signature (round D
//     verification). A link whose fingerprint the registry does not report gets no
//     checks and a warning; an old link without `fp` gets the checks worded as the
//     registry's report, with no ticks;
//   - looked up on Midnight by this browser (round 2 of the 15 Oct review): the
//     transaction the registry says dated the batch root. It must be VeilCore's date stamp
//     call at the pinned contract and have written exactly that root; its block is the
//     date (veilcore/chain/anchor-check.ts). Only then is the record stamped. If no
//     indexer answers, the date is worded as the registry's report;
//   - reported by the registry: everything else — that a record with this fingerprint
//     exists, when the registry first stored it, whether a key is vetted, and the facts the
//     holder chose to share. Worded as reports, never as checks.
// The footer says exactly which of those checks ran (round 3: it used to say "nothing on
// this page could be checked" under a line saying a signature was verified here).
// A visitor can't be told which signature is a receipt, so signatures are only described.
// The holder sees the lab's receipt linked to one of their deliveries on their record's page:
// since round 6 (CONTRACT.md #36) this page makes no request with the holder key.
// The registry sends only the facts the holder granted (README "Disclosure"); a ?show=
// in the link can narrow that and never widen it. Genetics are never sent.
//
// Round 5 (CONTRACT.md #28, #29): the record's name is sealed, so the registry has none to
// send unless the holder published it on purpose. The holder's link carries it after the #
// (`n`), which a browser doesn't send when it opens the link; a link without it says so. The
// saved DNA report is published only bound with the record's pairing salt and its proof code;
// the salt is in the link too (`ds`): with the file the holder sent, this page checks the
// match in this browser.
//
// Round 6 (CONTRACT.md #33, #36, #37): the name in a link is checked against the record's
// published name code with the link's salt (`ns`): "Name matches the record", "This name does
// not match the record", or, for a link or record from before round 6, "Name given in this link
// (not checked)". A name the holder published wins; a different one in the link is flagged.
// A link without a name says "This link doesn't carry the name." No request on this page
// carries the holder key (holder.ts guardHolderRequests): the holder's own lab receipt line is
// on their record's page, not here.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Container,
  Divider,
  Link,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { Link as RouterLink, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import VerifiedIcon from '@mui/icons-material/VerifiedOutlined';
import { loadFingerprintCircuit, MAX_FINGERPRINT_BYTES, shortFingerprint } from '../veilcore/commitment';
import { DISCLOSURE_FIELDS, LEGACY_NAME, toDisclosureKey, labelOf } from '../veilcore/disclosure';
import { proofFor, type ProofState } from '../veilcore/proofs';
import {
  attestationsFor,
  countsAsSigned,
  failedSignature,
  signerLabel,
  withheldLabReports,
  type ResolvedAttestation,
} from '../veilcore/attesters';
import { isBoundLabDocument, labSaltFromLink } from '../veilcore/lab-doc';
import { INK_COLOR, LINK_SX, POLLEN } from '../config/theme';
import { DatedStamp } from '../components/DatedStamp';
import { Wordmark } from '../components/Wordmark';
import { NETWORK, explorerFor, isTestNetwork } from '../config/network';
import { Fact, FactKey, SharedFacts } from '../components/verify/DisclosedFacts';
import { pairingPending, pendingReportLine, publicReportLine, withdrawnSignaturesLine } from '../veilcore/saved-report';
import {
  bindingOf,
  checkedSummary,
  linkFingerprint,
  linkParam,
  movedToFragment,
  nameCheckOf,
  nameFromLink,
  nameSaltFromLink,
  verifyHeading,
} from '../veilcore/verify-link';
import { DNA_SALT_PARAM, dnaLinkValues } from '../veilcore/dna-link';
import { displayName } from '../veilcore/display-name';
import { utcStamp as fmt } from '../veilcore/time';
import { REAL_CHAIN } from '../veilcore/chain/config';
import {
  anchorConfirmed,
  anchorHeading,
  anchorLine,
  anchorSummary,
  registryDateWords,
} from '../components/verify/anchor-words';
import { useAnchorCheck } from '../components/verify/useAnchorCheck';
import { VerifierChallengePanel } from '../components/chain/VerifierChallengePanel';
import { LicenseProofPanel } from '../components/licensing/LicenseProof';
import { publicCustodyLines, publicCustodyOf } from '../veilcore/custody';
import { NameCheckText } from '../components/NameCheckText';
import { rich, useT } from '../i18n/app';
import { enT, forKind, type Translator } from '../i18n/translate';
import { networkWords } from '../i18n/network-words';
import { LanguageBar } from '../i18n/LanguagePicker';

const API = import.meta.env.VITE_API_BASE ?? '';
/** The mark for a date checked on a test network: amber, never mainnet's pollen-gold stamp. */
const TEST_MARK = '#8A5A00';

/**
 * A record id as the site makes them: VEIL- and 128 random bits in hex (records.ts). Only
 * an id of that shape is echoed back on the page; anything else in the address bar is
 * "this ID", so a crafted link cannot put its own words on VeilCore's page.
 */
const RECORD_ID = /^VEIL-[0-9A-F]{32}$/i;
const idText = (v: string | undefined, tr: Translator = enT): string =>
  v && RECORD_ID.test(v) ? v : tr.t('app.verify.thisId');

/**
 * The one line at the top (persona review, 17 Oct): the date in plain words, and whose word it
 * is. The heading used to say "Date stamp reported by the registry, not checked here" with
 * the date mid-paragraph. "Check it yourself" opens the steps to look the transaction up.
 */
const DateSummary: React.FC<{
  at: string | number;
  checked: boolean;
  network: string;
  anchor: { txHash?: string; contractAddress?: string };
  root: string;
}> = ({ at, checked, network, anchor, root }) => {
  const tr = useT();
  const { t } = tr;
  const [open, setOpen] = useState(false);
  const explorer = explorerFor(network);
  const test = isTestNetwork(network) ? t('app.plant.date.testNote') : '';
  return (
    <Box sx={{ mb: 2 }} data-date-summary={checked ? 'checked' : 'reported'}>
      <Typography variant="body1" sx={{ fontWeight: 700 }}>
        {checked
          ? t('app.verify.summary.checked', { date: fmt(at), test })
          : t('app.verify.summary.reported', { date: fmt(at), test })}{' '}
        <Link
          component="button"
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          sx={{ verticalAlign: 'baseline', fontWeight: 700 }}
        >
          {t('app.verify.summary.yourself')}
        </Link>
      </Typography>
      <Collapse in={open}>
        <Box component="ol" sx={{ pl: 2.5, my: 1, '& li': { mb: 0.5 } }} data-check-yourself="">
          <Typography component="li" variant="body2">
            {explorer
              ? t('app.verify.self.explorer', { network: networkWords(network, tr), url: explorer })
              : t('app.verify.self.anyExplorer', { network: networkWords(network, tr) })}
          </Typography>
          {anchor.txHash && (
            <Typography component="li" variant="body2" sx={{ overflowWrap: 'anywhere' }}>
              {t('app.verify.self.tx', { tx: anchor.txHash })}
            </Typography>
          )}
          <Typography component="li" variant="body2" sx={{ overflowWrap: 'anywhere' }}>
            {t('app.verify.self.contract', { contract: anchor.contractAddress ?? t('app.verify.self.noContract') })}
          </Typography>
          <Typography component="li" variant="body2" sx={{ overflowWrap: 'anywhere' }}>
            {t('app.verify.self.root', { root })}
          </Typography>
        </Box>
      </Collapse>
    </Box>
  );
};

type VerifyResult = {
  found: boolean;
  id?: string;
  cultivar?: string;
  /** The name's salted code (round 6, CONTRACT.md #33): checks the name in a link with its salt. */
  nameCode?: string;
  /** Who bred it, as the holder wrote it, when the holder shared it (`bred-by`, persona review). */
  bredBy?: string;
  recordFingerprint?: string;
  /** The holder saved a lab report fingerprint themselves. Not a lab's confirmation. */
  dnaPairedByHolder?: boolean;
  /**
   * Granted keys whose holder-written values the registry won't answer yet: the record
   * changed since they were sent. `dna` here (and in `disclosed`) means the lab status is
   * shared but which report is saved is not known now.
   */
  staleGrant?: unknown[];
  /**
   * Older field. From a current registry it means attestedByVettedLab; from an older one
   * it meant any valid signature, so it is never read as "a lab" on its own.
   */
  attested?: boolean;
  /** A valid, unretracted signed attestation exists. Says nothing about who signed. */
  signedAttestation?: boolean;
  /** One of them is from a key the registry operator has checked. */
  attestedByVettedLab?: boolean;
  /** The record's fingerprint is in a batch whose root is anchored on a ledger. */
  anchored?: boolean;
  /** Where the batch root was anchored, when it was. The network says whether it is a test one. */
  anchor?: { network?: string; txHash?: string } | null;
  /** The holder's own statement of when it was logged. The app stores it as epoch ms. */
  loggedAtClaimedByHolder?: string | number | null;
  /** When the registry first received the record. The registry's word, not a ledger's. */
  registryFirstSeen?: string | null;
  /** The facts the holder granted, in the registry's older names. Always sent by a current registry. */
  disclosed?: string[];
  /** Keys the link asked for that the holder has not granted (older names). */
  notGranted?: string[];
  priorPossession?: boolean;
  sealedAt?: number | string;
  /** null when the endpoint did not check descent — not the same as false. */
  lineageIntact?: boolean | null;
  lineageNote?: string;
  /** Keys the caller asked for that the server declines to answer. */
  unavailable?: string[];
  unavailableReason?: string;
  parents?: string[];
  breedingMethod?: string | null;
  /** The registry's report that the record names its own key (key-binding.ts). */
  keyBound?: boolean;
  /**
   * The saved lab report's pairing fingerprint (commitment.ts pairingFingerprintOfSha), when
   * the holder shares whether one is saved and the registry sends it. Not the file's SHA-256.
   */
  dnaPairingFingerprint?: string | null;
  /** The saved lab report file's SHA-256, from a registry before round 5 (never sent since). */
  dnaFileSha256?: string | null;
  /**
   * The saved DNA report, bound (round 5, CONTRACT.md #29): H(dnapair, the file's SHA-256, the
   * record's identity, its pairing salt). Checkable only with the salt from the holder's link.
   */
  dnaPairBinding?: string | null;
  /**
   * Per lab receipt linked to the holder's deliveries, under the same grant: whether it covers
   * the sample details and where they differ (custody.ts publicCustodyOf). Never the details.
   */
  custody?: unknown;
  /** `animal` for a record sealed under the animal profile (absent: a plant). */
  subjectKind?: string;
  /** An animal's sire and dam, under the parent-names grant. */
  sire?: { name: string; individualId: string };
  dam?: { name: string; individualId: string };
  /** An animal's individual ID and its scheme, under the individual-id grant. */
  individualId?: string;
  idScheme?: string;
};

/** A sire or dam as the registry sends it: a name and an individual ID, both text. */
const isParentLine = (x: unknown): boolean =>
  x === undefined ||
  (typeof x === 'object' &&
    x !== null &&
    !Array.isArray(x) &&
    typeof (x as Record<string, unknown>).name === 'string' &&
    typeof (x as Record<string, unknown>).individualId === 'string');

/**
 * The fields this page reads. Anything absent renders as not disclosed, which is
 * the same as the holder choosing not to show it, so only `found` has to be there.
 */
const isVerifyResult = (v: unknown): v is VerifyResult => {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  const r = v as Record<string, unknown>;
  if (typeof r.found !== 'boolean') return false;
  const str = (x: unknown) => x === undefined || x === null || typeof x === 'string';
  const num = (x: unknown) => x === undefined || typeof x === 'number';
  const bool = (x: unknown) => x === undefined || typeof x === 'boolean';
  return (
    str(r.id) &&
    str(r.cultivar) &&
    str(r.nameCode) &&
    str(r.recordFingerprint) &&
    str(r.breedingMethod) &&
    bool(r.dnaPairedByHolder) &&
    bool(r.attested) &&
    bool(r.signedAttestation) &&
    bool(r.attestedByVettedLab) &&
    bool(r.anchored) &&
    bool(r.priorPossession) &&
    // The app writes loggedAt as a number, so the registry echoes a number. Accepting
    // only a string made this guard reject every record the app had made, and the page
    // said "No record found" for a record that exists.
    (str(r.loggedAtClaimedByHolder) || num(r.loggedAtClaimedByHolder)) &&
    str(r.registryFirstSeen) &&
    // null is a valid answer here and means "not checked". Requiring a boolean made
    // the guard reject a well-formed response, and the page then reported no record
    // for a record that exists.
    (r.lineageIntact === null || bool(r.lineageIntact)) &&
    (r.sealedAt === undefined || typeof r.sealedAt === 'number' || typeof r.sealedAt === 'string') &&
    (r.disclosed === undefined || Array.isArray(r.disclosed)) &&
    (r.parents === undefined || Array.isArray(r.parents)) &&
    (r.unavailable === undefined || Array.isArray(r.unavailable)) &&
    (r.notGranted === undefined || Array.isArray(r.notGranted)) &&
    (r.staleGrant === undefined || Array.isArray(r.staleGrant)) &&
    (r.anchor === undefined || r.anchor === null || (typeof r.anchor === 'object' && !Array.isArray(r.anchor))) &&
    str(r.lineageNote) &&
    str(r.unavailableReason) &&
    bool(r.keyBound) &&
    str(r.dnaPairingFingerprint) &&
    str(r.dnaFileSha256) &&
    str(r.dnaPairBinding) &&
    str(r.subjectKind) &&
    str(r.individualId) &&
    str(r.idScheme) &&
    isParentLine(r.sire) &&
    isParentLine(r.dam)
  );
};

/**
 * The facts the holder shared, in the registry's older names. A current registry always
 * sends `disclosed`. An older one, which answered everything when the link had no
 * ?show=, did not; for it the shared set is read from which granted fields are present,
 * so a missing field is still "not shared" and never "no".
 */
const sharedOf = (r: VerifyResult): string[] => {
  const names = new Set((r.disclosed ?? []).filter((k): k is string => typeof k === 'string'));
  if (r.disclosed === undefined) {
    if (r.priorPossession !== undefined) names.add('own');
    if (r.dnaPairedByHolder !== undefined) names.add('dna');
    if (r.lineageIntact !== undefined || r.lineageNote !== undefined) names.add('lineage');
    if (r.sealedAt !== undefined) names.add('sealed');
    if (r.parents !== undefined) names.add('parents');
    if (r.breedingMethod !== undefined) names.add('method');
  }
  return DISCLOSURE_FIELDS.map((f) => LEGACY_NAME[f.key]).filter((k) => names.has(k));
};

/** Most signatures given a line each; the rest are counted. */
const SIGNATURE_LINES = 5;

/**
 * What a signature is, in plain words (its type is the signer's own statement). The footer's
 * count (verify-link.ts checkedSummary) reads the English; the lines show the visitor's language.
 */
export const signatureKind = (a: ResolvedAttestation, tr: Translator = enT): string =>
  a.type === 'chain-of-custody'
    ? tr.t('app.verify.kindReceipt')
    : a.type === 'laboratory-report'
      ? // Since round 6 a lab signs a code bound to the record (lab-doc.ts), not the file's
        // SHA-256: nothing about the file is printed for it.
        isBoundLabDocument(a)
        ? tr.t('app.verify.kindReportBound')
        : tr.t('app.verify.kindReport', { sha: `${a.documentHash.slice(0, 8)}…${a.documentHash.slice(-6)}` })
      : tr.t('app.verify.kindStatement');

const labelsOf = (keys: readonly unknown[], tr: Translator): string =>
  keys
    .map((k) => (typeof k === 'string' ? toDisclosureKey(k) : undefined))
    .map((k, i) => (k ? labelOf(k, tr) : String(keys[i])))
    .join(tr.t('app.prove.share.semicolon'));

export const VerifyPage: React.FC = () => {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  // What joins the record to its on-chain activity is read from the fragment, which never
  // reaches a server; an old link's query string too (round 4, F7).
  const linked = (name: string): string | null => linkParam(name, location.search, location.hash);
  // An old link carrying them in the query string: they move into the fragment at once, so a
  // reload or a copy of this address no longer sends them to VeilCore's web host.
  useEffect(() => {
    const next = movedToFragment(location.search, location.hash);
    if (next) void navigate({ pathname: location.pathname, ...next }, { replace: true });
  }, [location.pathname, location.search, location.hash, navigate]);
  const show = params.get('show');
  // The fingerprint the link was made for. It is not sent to the registry: it is what
  // the registry's answer is checked against.
  const fp = params.get('fp');

  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [proof, setProof] = useState<ProofState | 'checking'>('checking');
  const [atts, setAtts] = useState<ResolvedAttestation[] | null>(null);
  // A DNA report file the visitor chose to check against the record (round 5): read here only.
  const [chosenFile, setChosenFile] = useState<{ name: string; sha: string } | 'reading' | 'too-big' | null>(null);
  // An animal record's page says "animal" where a plant's says "plant" (translate.ts forKind).
  const tr = forKind(useT(), result?.subjectKind === 'animal' ? 'animal' : 'plant');
  const { t, tp } = tr;

  useEffect(() => {
    let cancelled = false;
    // ?show= is passed on so a link made to show less still shows less. It cannot add
    // anything: the registry answers only what the holder granted.
    const url = `${API}/verify/${encodeURIComponent(id)}${show !== null ? `?show=${encodeURIComponent(show)}` : ''}`;
    fetch(url)
      .then((r): Promise<unknown> => r.json())
      .then(async (data) => {
        // A saved lab report is matched through its binding, and a pairing saved before the
        // file's SHA-256 was kept through its pairing fingerprint, which the `commit` circuit
        // computes (publicReportLine): loaded only for such a record.
        if (isVerifyResult(data) && (data.dnaPairingFingerprint || data.dnaPairBinding)) await loadFingerprintCircuit();
        if (!cancelled) {
          // A shareable link is opened by someone who has no other way to check what
          // they are being shown. A body that is not a verdict is treated as no
          // record rather than rendered with blank fields, because a page that looks
          // like a verification and is not one is worse than an error.
          setResult(isVerifyResult(data) ? data : null);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResult({ found: false });
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id, show]);

  // The two things this page can check for itself. With a fingerprint in the link they
  // are checked against it (and the registry must report the same one); an old link is
  // checked against the registry's value and shown as its report; on a mismatch nothing
  // is checked.
  const binding = bindingOf(linkFingerprint(fp), result?.found ? result.recordFingerprint : undefined);
  const bound = binding.kind === 'bound';
  const fingerprint = binding.kind === 'mismatch' ? undefined : binding.fingerprint;
  useEffect(() => {
    let live = true;
    setProof('checking');
    setAtts(null);
    if (!fingerprint) {
      setProof({ status: 'none' });
      setAtts([]);
      return;
    }
    void proofFor(fingerprint).then((p) => live && setProof(p));
    void attestationsFor(fingerprint).then((a) => live && setAtts(a));
    return () => {
      live = false;
    };
  }, [fingerprint]);

  // Once the inclusion proof leads to a batch root and the registry names the transaction
  // that wrote it, this browser looks that transaction up on Midnight itself: it must be
  // VeilCore's date stamp call, at the contract this build pins, and have written exactly
  // this root. Its block gives the date. Until then, or if no indexer answers, the date is
  // the registry's report and is worded that way. The same look-up the plant page uses
  // (chain/anchor-lookup.ts), so the two never disagree. Undefined until the inclusion
  // proof names a transaction to look up.
  const anchor = useAnchorCheck(proof);

  // A tick (and the stamp) only for a check against the link's own fingerprint.
  const checked = bound && proof !== 'checking' && proof.status !== 'none';
  // Before the link's fingerprint is known to match, say whose fingerprint was used.
  const forWhom = bound ? '' : t('app.verify.forWhom');
  const reportedNetwork =
    proof !== 'checking' && proof.status === 'anchor-reported'
      ? proof.proof.anchor?.network
      : typeof result?.anchor?.network === 'string'
        ? result.anchor.network
        : undefined;
  const signed = (atts ?? []).filter(countsAsSigned);
  // Round 2 of the 15 Oct review: the check page used to drop a seal mismatch the breeder's
  // own page showed. The registry's report of each receipt's sample details, by receipt.
  const publicCustody = publicCustodyOf(result?.custody);
  // Round 5: what each signature is, said on its own line and counted the same way in the
  // footer: a lab's receipt, a lab report, or some other signed statement.
  const withdrawnLine = withdrawnSignaturesLine(atts ?? [], tr);
  const badSigs = (atts ?? []).filter(failedSignature).length;
  // Lab report signatures made before round 6, which the registry shows only to the breeder and
  // the lab (CONTRACT.md #34): said, with their dates, as the registry's report.
  const withheld = withheldLabReports(atts ?? []);
  // Round 6: which file is saved comes from the registry as it is now; the link's `rs` is
  // only a hint from when the link was made (saved-report.ts publicReportLine).
  // The lab status is shared but the holder's pairing values are stale (the registry left
  // them out): say it is not known yet, never "no report saved".
  // The DNA report's pairing salt from the link (round 5), with the link's own proof code, the
  // identity the binding names (only once the registry reports the same one), and a file the
  // visitor chose.
  const linkDna = dnaLinkValues(linked(DNA_SALT_PARAM), bound ? binding.fingerprint : null);
  const labReport = pairingPending(result)
    ? pendingReportLine(tr)
    : publicReportLine(
        {
          paired: result?.dnaPairedByHolder,
          linkSha: linked('rs'),
          binding: result?.dnaPairBinding,
          linkDna,
          chosenSha: chosenFile && typeof chosenFile === 'object' ? chosenFile.sha : null,
          labSalt: labSaltFromLink(location.hash),
          atts: atts ?? [],
          bound,
        },
        tr,
      );
  const chosenResult = 'chosen' in labReport ? labReport.chosen : undefined;
  const chooseFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_FINGERPRINT_BYTES) return setChosenFile('too-big');
    setChosenFile('reading');
    const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
    const sha = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
    setChosenFile({ name: file.name, sha });
  };
  // A verified signature against the link's own fingerprint is a check this browser made;
  // whether its name was matched is said in words on its line (round 5).
  const ticked = checked || (bound && signed.length > 0);
  // The seal: only when this page checked the record into its batch against the link's own
  // fingerprint AND found that batch root's anchor on Midnight itself. The inclusion proof
  // alone is not enough: its root could be anything until its anchor is looked up.
  const anchorCheckedOnChain = anchorConfirmed(anchor);
  // The line under the registry's report: checking, ✓, ⊗, or ○ when no indexer answered.
  // Nothing extra when this build reads no indexer for that network: the report says so.
  const reportedAt =
    proof !== 'checking' && proof.status === 'anchor-reported' ? proof.proof.anchor?.anchoredAt : undefined;
  const anchorText =
    anchor === undefined
      ? undefined
      : anchorLine(anchor, { network: reportedNetwork ?? NETWORK, bound, reportedAt }, tr);
  const anchorLooked = anchorText !== undefined;
  const seal = checked && anchorCheckedOnChain;
  // A date checked on a test network is practice data: its own amber mark and a PRACTICE
  // stamp, never mainnet's gold DATED stamp.
  const testSeal = seal && isTestNetwork(reportedNetwork ?? NETWORK);
  const sealColor = testSeal ? TEST_MARK : INK_COLOR;
  const sealedAt =
    seal && anchor !== undefined && anchor !== 'checking' && anchor.status === 'checked' ? anchor.blockTime : undefined;
  // The name (round 6): the one the holder published wins (or a record saved before names
  // were sealed); else the link's, checked against the record's name code with the link's salt.
  const nameCheck = nameCheckOf({
    linkName: nameFromLink(location.hash),
    linkSalt: nameSaltFromLink(location.hash),
    nameCode: result?.nameCode,
    proofCode: result?.recordFingerprint,
    published: result?.cultivar,
  });
  const name = nameCheck.state === 'none' ? undefined : displayName(nameCheck.name);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* IDs, fingerprints and hashes are long unbroken strings: they wrap, the page never scrolls sideways. */}
      <Container component="main" maxWidth="sm" sx={{ py: { xs: 5, md: 8 }, overflowWrap: 'anywhere' }}>
        <LanguageBar />
        <Stack
          component={RouterLink}
          to="/"
          aria-label={t('app.verify.homeAria')}
          direction="row"
          spacing={1.25}
          sx={{
            alignItems: 'center',
            justifyContent: 'center',
            mb: 2,
            mx: 'auto',
            width: 'fit-content',
            minHeight: 44,
            textDecoration: 'none',
            color: 'text.primary',
          }}
        >
          <Wordmark />
        </Stack>
        {/* One line for a stranger who arrived from a QR code or a shared link. */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ textAlign: 'center', mb: 4, maxWidth: 460, mx: 'auto' }}
        >
          {rich(t('app.verify.intro'), {
            link: (c) => (
              <Box component={RouterLink} to="/" sx={{ ...LINK_SX, whiteSpace: 'nowrap' }}>
                {c}
              </Box>
            ),
          })}
        </Typography>

        {loading ? (
          <Paper sx={{ p: 6, textAlign: 'center' }}>
            <CircularProgress size={28} sx={{ color: INK_COLOR }} aria-label={t('app.verify.checkingRecord')} />
          </Paper>
        ) : !result?.found ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" component="h1" sx={{ mb: 1, overflowWrap: 'anywhere' }}>
              {t('app.verify.notFound', { id: idText(id, tr) })}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('app.verify.notFoundText')}
            </Typography>
            <Box component={RouterLink} to="/" sx={{ ...LINK_SX, display: 'inline-block', mt: 2, py: 1 }}>
              {t('app.verify.goHome')}
            </Box>
          </Paper>
        ) : binding.kind === 'mismatch' ? (
          // The link names a record the registry does not answer for. Its answer is about
          // some other record (or none), so nothing on it is checked or shown as this one.
          <Paper sx={{ p: { xs: 3, md: 4 } }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2 }}>
              <VerifiedIcon data-checked="no" aria-hidden="true" sx={{ color: 'text.disabled', fontSize: 30 }} />
              <Typography variant="h6" component="h1" sx={{ color: 'error.main', lineHeight: 1.4 }}>
                {t('app.verify.mismatch.title')}
              </Typography>
            </Stack>
            <Alert severity="error" variant="outlined" data-mismatch="yes">
              <Typography variant="subtitle2" component="p" sx={{ mb: 0.5 }}>
                {t('app.verify.mismatch.dontRely')}
              </Typography>
              <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
                {t('app.verify.mismatch.text', {
                  start: binding.linked
                    ? t('app.verify.mismatch.linked', { fp: shortFingerprint(binding.linked) })
                    : t('app.verify.mismatch.invalid'),
                  reported: binding.reported
                    ? t('app.verify.mismatch.reportedFp', { fp: shortFingerprint(binding.reported) })
                    : t('app.verify.mismatch.noFp'),
                  id: idText(id, tr),
                })}
              </Typography>
            </Alert>
            <Divider sx={{ my: 2 }} />
            {/* Only a well-formed fingerprint (64 hex characters) is shown; anything else
                in the link is never echoed. */}
            {binding.linked && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', overflowWrap: 'anywhere' }}>
                {t('app.verify.mismatch.inLink', { fp: binding.linked })}
              </Typography>
            )}
            <Box sx={{ mt: 2, textAlign: 'right' }}>
              <Chip
                size="small"
                variant="outlined"
                label={t('app.verify.mismatch.chip')}
                sx={{ height: 'auto', '& .MuiChip-label': { whiteSpace: 'normal', py: 0.5 } }}
              />
            </Box>
          </Paper>
        ) : (
          <Paper sx={{ p: { xs: 3, md: 4 }, position: 'relative' }} data-specimen-sheet="">
            {/* Stamped only when this page found the batch root's anchor on Midnight itself
                (anchorCheckedOnChain): gold DATED on the main network, a dashed PRACTICE
                stamp on a test network. */}
            {seal && sealedAt !== undefined && (
              <DatedStamp
                state={testSeal ? 'practice' : 'dated'}
                word={testSeal ? t('app.plant.stamp.practice') : t('app.plant.stamp.dated')}
                date={tr.date(sealedAt, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}
                pressKey={`check:${result.id ?? ''}`}
                size={{ xs: 72, sm: 88 }}
                sx={{ position: 'absolute', top: { xs: -24, sm: -30 }, right: { xs: 12, sm: 20 } }}
              />
            )}
            <Stack
              direction="row"
              spacing={1.5}
              sx={{ alignItems: 'center', mb: 2, pr: seal && sealedAt !== undefined ? { xs: 7, sm: 9 } : 0 }}
            >
              {/* The mark: an ink tick on gold once dated on the main network, amber on a test
                  network, grey until then; the lines below still tick what this browser did check. */}
              <VerifiedIcon
                aria-hidden="true"
                data-checked={seal ? 'yes' : 'no'}
                data-test-network={testSeal ? 'yes' : 'no'}
                sx={{
                  color: seal ? sealColor : 'text.disabled',
                  fontSize: 30,
                  ...(seal && !testSeal ? { bgcolor: POLLEN, borderRadius: '50%', p: 0.375, fontSize: 34 } : {}),
                }}
              />
              <Box>
                <Typography
                  variant="h6"
                  component="h1"
                  sx={{ color: seal ? sealColor : 'text.primary', lineHeight: 1.4, display: 'block' }}
                >
                  {anchorHeading(
                    verifyHeading(
                      {
                        sealed: !!result.recordFingerprint,
                        bound,
                        proof: proof === 'checking' ? 'checking' : proof.status,
                      },
                      tr,
                    ),
                    anchor,
                    bound,
                    reportedNetwork ?? NETWORK,
                    tr,
                  )}
                </Typography>
              </Box>
            </Stack>

            {/* The date first, in one line, and whose word it is (persona review, 17 Oct). */}
            {result.recordFingerprint &&
              proof !== 'checking' &&
              proof.status === 'anchor-reported' &&
              anchor !== 'checking' &&
              anchor?.status !== 'failed' &&
              (anchorCheckedOnChain && anchor?.status === 'checked' ? anchor.blockTime : reportedAt) !== undefined && (
                <DateSummary
                  at={(anchorCheckedOnChain && anchor?.status === 'checked' ? anchor.blockTime : reportedAt) ?? ''}
                  checked={anchorCheckedOnChain && anchor?.status === 'checked'}
                  network={reportedNetwork ?? NETWORK}
                  anchor={proof.proof.anchor ?? {}}
                  root={proof.proof.root}
                />
              )}

            {/* The holder's own words, labelled as such: never a heading next to the mark,
                cleaned of symbols and control characters, and capped (display-name.ts). */}
            {name && nameCheck.state === 'differs' ? (
              // Not the record's name: said first, and never shown as the holder's.
              <Alert
                severity="error"
                variant="outlined"
                sx={{ mb: RECORD_ID.test(result.id ?? '') ? 0.5 : 2, overflowWrap: 'anywhere' }}
                data-name-check="differs"
              >
                {t('app.verify.nameDiffers', { name })}
              </Alert>
            ) : name && nameCheck.state !== 'none' ? (
              <Box sx={{ mb: RECORD_ID.test(result.id ?? '') ? 0.5 : 2 }}>
                <Typography
                  variant="body1"
                  sx={{ overflowWrap: 'anywhere' }}
                  data-holder-name=""
                  data-name-check={nameCheck.state}
                  data-name-from={nameCheck.state === 'published' ? 'registry' : 'link'}
                >
                  <Box component="span" sx={{ color: 'text.secondary' }}>
                    {nameCheck.state === 'published'
                      ? t('app.verify.namePublished')
                      : nameCheck.state === 'matches'
                        ? t('app.verify.nameMatches')
                        : t('app.verify.nameUnchecked')}
                  </Box>
                  {name}
                </Typography>
                {nameCheck.state === 'published' && nameCheck.conflict && (
                  <Alert severity="warning" variant="outlined" sx={{ mt: 1 }} data-name-conflict="">
                    {t('app.verify.nameConflict', { name: displayName(nameCheck.conflict) ?? '' })}
                  </Alert>
                )}
              </Box>
            ) : (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: RECORD_ID.test(result.id ?? '') ? 0.5 : 2 }}
                data-no-name=""
              >
                {t('app.verify.noNameInLink')}
              </Typography>
            )}
            {RECORD_ID.test(result.id ?? '') && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, overflowWrap: 'anywhere' }}>
                {t('app.verify.recordId', { id: result.id ?? '' })}
              </Typography>
            )}

            <Divider sx={{ mb: 2 }} />

            <Stack spacing={1.25}>
              {/* Signers' names: said once, in the key (persona review, 17 Oct). */}
              <FactKey anyName={signed.some((a) => !signerLabel(a, 'Signed by', undefined, tr).checked)} />
              {!result.recordFingerprint ? (
                <Fact ok={false}>{t('app.verify.noCommitment')}</Fact>
              ) : bound ? (
                <Fact ok={false}>
                  {t('app.verify.boundFact', {
                    fp: shortFingerprint(result.recordFingerprint),
                    firstSeen: result.registryFirstSeen
                      ? t('app.verify.firstStored', { date: fmt(result.registryFirstSeen) })
                      : '',
                  })}
                </Fact>
              ) : (
                <>
                  <Fact ok={false}>
                    {t('app.verify.unboundFact', {
                      fp: shortFingerprint(result.recordFingerprint),
                      firstSeen: result.registryFirstSeen
                        ? t('app.verify.firstStored', { date: fmt(result.registryFirstSeen) })
                        : '',
                    })}
                  </Fact>
                  <Fact ok={false}>{t('app.verify.noFpInLink')}</Fact>
                </>
              )}

              {result.recordFingerprint &&
                (proof === 'checking' ? null : proof.status === 'none' ? (
                  <Fact ok={false}>{t('app.verify.noStampYet')}</Fact>
                ) : (
                  <>
                    {bound ? (
                      <Fact>
                        {t('app.verify.batchBound', {
                          batch: proof.proof.batchId,
                          root: proof.proof.root.slice(0, 16),
                        })}
                      </Fact>
                    ) : (
                      <Fact ok={false}>
                        {t('app.verify.batchUnbound', {
                          forWhom,
                          batch: proof.proof.batchId,
                          root: proof.proof.root.slice(0, 16),
                        })}
                      </Fact>
                    )}
                    {proof.status === 'anchor-reported' ? (
                      <>
                        {/* What the registry claims, until this browser has confirmed it. */}
                        {!anchorCheckedOnChain && (
                          <Fact ok={false}>
                            {t('app.verify.rootReported', {
                              network: networkWords(reportedNetwork ?? NETWORK, tr),
                              tx: proof.proof.anchor?.txHash
                                ? t('app.verify.anchor.inTx', { tx: proof.proof.anchor.txHash })
                                : '',
                              date: registryDateWords(reportedAt, tr),
                              notLooked: anchorLooked ? '' : t('app.verify.notLooked'),
                              test: isTestNetwork(reportedNetwork ?? NETWORK) ? t('app.plant.date.testNote') : '',
                            })}
                          </Fact>
                        )}
                        {anchorText && (
                          <Box data-anchor-check={anchor === 'checking' ? 'checking' : anchor?.status}>
                            <Fact status={anchorText.status}>
                              {anchor === 'checking' ? '' : forWhom}
                              {anchorText.text}
                            </Fact>
                          </Box>
                        )}
                      </>
                    ) : (
                      <Fact ok={false}>{t('app.verify.batchNoStamp')}</Fact>
                    )}
                  </>
                ))}

              {/* Base data: shown whatever the holder shared. Signatures are checked here;
                  who holds a key is the registry operator's word. Ticked only against the
                  link's own fingerprint. One line per signature, saying what it is. */}
              {result.recordFingerprint && atts !== null && (
                <>
                  {signed.slice(0, SIGNATURE_LINES).map((a) => {
                    const label = signerLabel(a, 'Signed by', undefined, tr);
                    return (
                      <Fact key={a.attestationId} status={bound ? 'checked' : 'reported'}>
                        {t('app.verify.sigLine', { forWhom, kind: signatureKind(a, tr), lead: label.lead })}
                        <NameCheckText label={label} />
                        {a.type === 'chain-of-custody' && publicCustody.has(a.attestationId) && (
                          <Box component="span" sx={{ display: 'block', mt: 0.5 }} data-public-custody="">
                            <Box component="span" sx={{ display: 'block', color: 'text.secondary' }}>
                              {t('app.verify.sampleDetails')}
                            </Box>
                            {publicCustodyLines(publicCustody.get(a.attestationId), tr).map((l) => (
                              <Box component="span" key={l} sx={{ display: 'block' }} data-custody-line="">
                                {l}
                              </Box>
                            ))}
                          </Box>
                        )}
                      </Fact>
                    );
                  })}
                  {signed.length > SIGNATURE_LINES && (
                    <Fact status={bound ? 'checked' : 'reported'}>
                      {t('app.verify.moreSigs', { forWhom, n: signed.length - SIGNATURE_LINES })}
                    </Fact>
                  )}
                  {withheld.length > 0 && (
                    <Fact ok={false}>
                      <Box component="span" data-withheld-reports={String(withheld.length)}>
                        {tp('app.verify.withheldReports', withheld.length, {
                          dates: withheld
                            .map((a) => `${a.issuedAt.slice(0, 10)} (UTC)`)
                            .join(t('app.verify.sum.comma')),
                        })}
                      </Box>
                    </Fact>
                  )}
                  {signed.length === 0 &&
                    withheld.length === 0 &&
                    (result.signedAttestation === true ||
                    result.attestedByVettedLab === true ||
                    result.attested === true ? (
                      <Fact status="failed">{t('app.verify.noneVerified')}</Fact>
                    ) : (
                      <Fact ok={false}>{t('app.verify.noneSigned')}</Fact>
                    ))}
                  {withdrawnLine && <Fact ok={false}>{withdrawnLine}</Fact>}
                  {badSigs > 0 && <Fact status="failed">{tp('app.verify.badSigs', badSigs)}</Fact>}
                </>
              )}

              <Divider sx={{ my: 0.5 }} />
              <Typography variant="overline" color="text.secondary" sx={{ display: 'block' }}>
                {t('app.verify.sharedTitle')}
              </Typography>
              <SharedFacts
                data={{
                  disclosed: sharedOf(result),
                  anchored: result.anchored,
                  priorPossession: result.priorPossession,
                  anchorNetwork: reportedNetwork,
                  anchorCheckedOnChain,
                  dnaPairedByHolder: result.dnaPairedByHolder,
                  lineageIntact: result.lineageIntact,
                  sealedAt: result.sealedAt ?? result.loggedAtClaimedByHolder ?? undefined,
                  registryFirstSeen: result.registryFirstSeen,
                  parents: result.parents,
                  breedingMethod: result.breedingMethod,
                  name: result.cultivar ?? undefined,
                  nameInLink: nameCheck.state !== 'none' && nameCheck.state !== 'published',
                  bredBy: result.bredBy,
                  ...(result.subjectKind === 'animal'
                    ? {
                        subjectKind: 'animal',
                        ...(result.sire ? { sire: result.sire } : {}),
                        ...(result.dam ? { dam: result.dam } : {}),
                        ...(result.individualId !== undefined ? { individualId: result.individualId } : {}),
                        ...(result.idScheme !== undefined ? { idScheme: result.idScheme } : {}),
                      }
                    : {}),
                  labReport,
                }}
              />

              {/* Round 5: the saved DNA report is checked here with the file the holder sent,
                  using the pairing salt in their link; nothing leaves this browser. */}
              {sharedOf(result).includes('dna') && result.dnaPairBinding && (
                <Box data-dna-check={linkDna ? 'ready' : 'no-salt'} sx={{ pl: 3.25 }}>
                  {linkDna ? (
                    <>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        {t('app.verify.dnaCheck.help')}
                      </Typography>
                      <Button variant="outlined" component="label" size="small" sx={{ minHeight: 44 }}>
                        {t('app.verify.dnaCheck.button')}
                        <input
                          hidden
                          type="file"
                          data-dna-file=""
                          onChange={(e) => void chooseFile(e.target.files?.[0])}
                        />
                      </Button>
                      {chosenFile === 'reading' && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                          {t('app.verify.dnaCheck.reading')}
                        </Typography>
                      )}
                      {chosenFile === 'too-big' && (
                        <Typography variant="caption" color="error.main" sx={{ display: 'block', mt: 0.5 }}>
                          {t('app.verify.dnaCheck.tooBig')}
                        </Typography>
                      )}
                      {chosenFile && typeof chosenFile === 'object' && (
                        <Typography
                          variant="caption"
                          sx={{
                            display: 'block',
                            mt: 0.5,
                            color: chosenResult === 'matches' ? 'text.primary' : 'error.main',
                          }}
                          data-dna-file-result={chosenResult ?? ''}
                        >
                          {chosenResult === 'matches'
                            ? t('app.verify.dnaCheck.matches', { file: displayName(chosenFile.name) })
                            : t('app.verify.dnaCheck.differs', { file: displayName(chosenFile.name) })}
                        </Typography>
                      )}
                    </>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      {t('app.verify.dnaCheck.noSalt')}
                    </Typography>
                  )}
                </Box>
              )}
              {result.notGranted && result.notGranted.length > 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  {t('app.verify.notGranted', { list: labelsOf(result.notGranted, tr) })}
                </Typography>
              )}
              {result.unavailable && result.unavailable.length > 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  {t('app.verify.unavailable', { list: result.unavailable.join(', ') })}
                </Typography>
              )}
            </Stack>

            <Divider sx={{ my: 2 }} />
            <Typography variant="caption" color="text.secondary">
              {t('app.verify.footer', { fp: shortFingerprint(result.recordFingerprint ?? '') })}
            </Typography>

            <Box sx={{ mt: 2, textAlign: 'right' }}>
              <Chip
                size="small"
                variant="outlined"
                data-ticked={ticked ? 'yes' : 'no'}
                data-anchor-checked={anchorCheckedOnChain ? 'yes' : 'no'}
                label={anchorSummary(
                  checkedSummary(
                    {
                      bound,
                      proofChecked: proof !== 'checking' && proof.status !== 'none',
                      signaturesChecked: signed.length,
                      signatureKinds: signed.map((a) => signatureKind(a)),
                    },
                    tr,
                  ),
                  anchor,
                  tr,
                )}
                sx={{ height: 'auto', '& .MuiChip-label': { whiteSpace: 'normal', py: 0.5 } }}
              />
            </Box>
          </Paper>
        )}
        {/* Real-chain builds: the holder's link may name the record's on-chain identity
            (#chain=…&anchorTx=…, in the fragment since round 4), and for a record that names
            its key, what ties the two (&ks=…&cd=…). The panel matches the key to the link's fingerprint (only when the
            registry reports the same one), then checks the proof on chain. */}
        {REAL_CHAIN && result?.found && linked('chain') && (
          <VerifierChallengePanel
            claim={{
              identity: linked('chain') ?? '',
              txId: linked('anchorTx') ?? undefined,
              keySalt: linked('ks'),
              contentHash: linked('cd'),
              fingerprint: bound ? binding.fingerprint : undefined,
              keyBound: result.keyBound === true,
            }}
            recordId={id}
          />
        )}
        {/* Someone says they're licensed from this record: ask them to prove it (rule 5). */}
        {REAL_CHAIN && result?.found && linked('chain') && (
          <LicenseProofPanel identity={linked('chain') ?? ''} recordId={id} />
        )}
      </Container>
    </Box>
  );
};
