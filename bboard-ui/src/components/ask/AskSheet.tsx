// Ask VeilCore: a sheet over the record app (bottom on a phone, side on a computer). Chips first,
// a text box second. It drafts; only the person saves, signs or sends, on the screen it opens.
//
// "Typing here sends nothing. Only Save does." Nothing here makes a request: Shortcuts (ask/shortcuts.ts)
// reads the text in this page (or the optional language model, in a worker on this device, in
// builds with it: ModelBridge.tsx, docs/ask-veilcore.md v2.1), What's due, Explain and Search read what this browser already
// holds. The conversation is kept in memory only, for as long as the page is open: never
// stored, never in a backup (docs/ask-veilcore.md). e2e/ask.spec.ts checks the network stays
// silent while a draft is made.
// SPDX-License-Identifier: Apache-2.0

import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  Divider,
  Drawer,
  IconButton,
  FormControlLabel,
  Link,
  Stack,
  Switch,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useT } from '../../i18n/app';
import type { AppKey } from '../../i18n/app/en';
import { useRecords, type StrainRecord } from '../../veilcore/records';
import { useLicenses } from '../../veilcore/licenses';
import { ANIMAL_RECORDS_ENABLED, STRAIN_RECORDS_ENABLED } from '../../config/network';
import {
  ASK_MAX_CHARS,
  GO,
  TOPICS,
  type AskAction,
  type AskContext,
  type AskResult,
  type Topic,
} from '../../ask/engine';
import { chipResult, shortcutsEngine } from '../../ask/shortcuts';
import { HANDOFF_STATE_KEY, type AskDraft, type DraftKind } from '../../ask/handoff';
import { dealStateHere, dueCalendar, dueItems, type DueItem } from '../../ask/due';
import { useDealsReadHere } from '../../veilcore/deal-client';
import { searchRecords } from '../../ask/search';
import { today } from '../flow/log-flow-state';
import type { EngineState } from './useAskEngine';
import { planJob, type PlanResult } from '../../ask/plan';
// Part of the sheet's own file, so a job can be got ready with no signal (the barn).
import { prepareJob, type Refusal } from '../../ask-job/prepare';
import { JOB_STATE_KEY, jobWords, readySentence } from '../../ask-job/words';
import { holderRequestsPaused } from '../../veilcore/holder-guard';

// The optional on-device model: its files only in a build with VITE_ASK_MODEL (vite.config.ts
// makes it a constant, so without it these imports, the workers and WebLLM are left out).
const ModelBridge = import.meta.env.VITE_ASK_MODEL ? lazy(() => import('./ModelBridge')) : undefined;
const ModelPanel = import.meta.env.VITE_ASK_MODEL ? lazy(() => import('./ModelPanel')) : undefined;
const SHORTCUTS: EngineState = { status: 'shortcuts', engine: shortcutsEngine };

type Turn = {
  readonly id: number;
  readonly text?: string;
  readonly result: AskResult;
  /** "Do it for me": the plan read from the text, or why not. */
  readonly job?: PlanResult;
};

// The conversation, for as long as this page is open. Never written anywhere.
let kept: Turn[] = [];
let nextId = 1;

const CHIPS: readonly AskAction[] = ['record', 'clones', 'offspring', 'cross', 'due', 'explain', 'search'];

/** What Ask can do, as a list (the first item without offspring where animals are off). */
const CAN: readonly AppKey[] = [
  ANIMAL_RECORDS_ENABLED ? 'app.ask.can.1' : 'app.ask.can.1plants',
  'app.ask.can.2',
  'app.ask.can.3',
  'app.ask.can.4',
  'app.ask.can.5',
  'app.job.can',
];

const KINDS: readonly DraftKind[] = [
  'plant',
  ...(ANIMAL_RECORDS_ENABLED ? (['animal'] as const) : []),
  ...(STRAIN_RECORDS_ENABLED ? (['strain'] as const) : []),
];

export default function AskSheet({
  open,
  onClose,
  firstOpen = false,
  prefill,
}: {
  open: boolean;
  onClose: () => void;
  /** Ask was never opened in this browser: what it can do is shown, then folded away. */
  firstOpen?: boolean;
  /** Text to put in the box (the hint's example), and a number that changes each time it is asked for. */
  prefill?: { readonly text: string; readonly n: number };
}) {
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down('sm'));
  const tr = useT();
  const { t } = tr;
  const records = useRecords();
  const ctx: AskContext = useMemo(() => ({ records, kinds: KINDS }), [records]);
  const [turns, setTurns] = useState<Turn[]>(kept);
  const [text, setText] = useState('');
  const end = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [canShown, setCanShown] = useState(firstOpen);
  const [engineAgain, setEngineAgain] = useState(0);
  const [engine, setEngine] = useState<EngineState>(SHORTCUTS);
  const modelOn = engine.status === 'model';
  // "Do it for me" (ask/plan.ts): one request, one finished result to approve.
  const [doIt, setDoIt] = useState(false);
  // The hint's example as it was put in the box: until it is edited, it never starts a job.
  const [hintText, setHintText] = useState<string>();
  // The hint's example, typed into the box for the person to send or change.
  useEffect(() => {
    if (!prefill || !open) return;
    setText(prefill.text.slice(0, ASK_MAX_CHARS));
    setHintText(prefill.text.slice(0, ASK_MAX_CHARS));
    const id = setTimeout(() => input.current?.focus(), 150);
    return () => clearTimeout(id);
  }, [prefill, open]);
  // Shown once: folded away when the sheet closes, and under "What can Ask do?" after that.
  useEffect(() => {
    if (!open) setCanShown(false);
  }, [open]);

  const add = (turn: Omit<Turn, 'id'>) => {
    const next = [...turns, { id: nextId++, ...turn }].slice(-20);
    kept = next;
    setTurns(next);
  };
  useEffect(() => {
    // A block, not an expression: scrollIntoView may return a promise, and an effect may return only a cleanup.
    end.current?.scrollIntoView({ block: 'nearest' });
  }, [turns.length]);

  const ask = async () => {
    const typed = text.trim().slice(0, ASK_MAX_CHARS);
    if (!typed) return;
    setText('');
    if (doIt) {
      // Shortcuts plans: deterministic, from this text and the records in this browser.
      const fromHint = hintText !== undefined && typed === hintText.trim();
      setHintText(undefined);
      add({
        text: typed,
        result: { type: 'miss', closest: [] },
        job: planJob(typed, { records, animals: ANIMAL_RECORDS_ENABLED }, { fromHint }),
      });
      return;
    }
    add({ text: typed, result: await engine.engine.interpret(typed, ctx) });
  };

  const chips = (actions: readonly AskAction[]) => (
    <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
      {actions
        .filter((a) => a !== 'offspring' || ANIMAL_RECORDS_ENABLED)
        .map((a) => (
          <Chip
            key={a}
            label={t(`app.ask.chip.${a}` as AppKey)}
            onClick={() => add({ result: chipResult(a, ctx) })}
            variant="outlined"
            data-ask-chip={a}
          />
        ))}
    </Stack>
  );

  return (
    <Drawer
      anchor={phone ? 'bottom' : 'right'}
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: phone ? { maxHeight: '88vh', borderTopLeftRadius: 12, borderTopRightRadius: 12 } : { width: 420 },
          role: 'dialog',
          'aria-label': t('app.ask.title'),
          'data-ask-sheet': '',
        } as object,
      }}
    >
      <Stack spacing={1.5} sx={{ p: 2, overflowY: 'auto' }}>
        <Stack direction="row" sx={{ alignItems: 'center' }}>
          <Typography variant="h6" component="h2" sx={{ flex: 1 }}>
            {t('app.ask.title')}
          </Typography>
          <IconButton onClick={onClose} aria-label={t('app.ask.close')}>
            <CloseIcon />
          </IconButton>
        </Stack>
        {/* flexShrink 0: in the sheet's scrolling column a Collapse (min-height 0) would otherwise be
          squeezed under the text below it once the sheet is taller than the screen. */}
        <Collapse in={canShown} unmountOnExit sx={{ flexShrink: 0 }}>
          <Box data-ask-can="" sx={{ bgcolor: 'action.hover', borderRadius: 2, borderTopLeftRadius: 4, p: 1.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {t('app.ask.can.title')}
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
              {CAN.map((k) => (
                <Typography component="li" variant="body2" key={k}>
                  {t(k)}
                </Typography>
              ))}
            </Box>
            <Typography variant="body2" sx={{ mt: 1 }}>
              {t('app.ask.can.never')}
            </Typography>
          </Box>
        </Collapse>
        {!canShown && (
          <Link
            component="button"
            type="button"
            variant="body2"
            onClick={() => setCanShown(true)}
            sx={{ alignSelf: 'flex-start', minHeight: 44 }}
            data-ask-can-toggle=""
          >
            {t('app.ask.can.toggle')}
          </Link>
        )}
        <Typography variant="body1">{t('app.ask.intro')}</Typography>
        <Typography variant="body2" color="text.secondary" data-ask-privacy={modelOn ? 'model' : ''}>
          {modelOn ? t('app.ask.privacyModel') : t('app.ask.privacy')}
          {t('app.common.sentenceSep')}
          {t('app.ask.engine')}
        </Typography>
        {engine.status !== 'shortcuts' && (
          <Typography
            variant="caption"
            color="text.secondary"
            data-ask-engine={engine.status === 'failed' ? `failed:${engine.why}` : engine.status}
            data-ask-engine-detail={engine.status === 'failed' ? engine.detail : undefined}
          >
            {engine.status === 'model'
              ? t('app.ask.engine.model', { model: engine.model })
              : engine.status === 'starting'
                ? t('app.ask.engine.starting')
                : t('app.ask.engine.failed', { why: t(`app.ask.model.why.${engine.why}` as AppKey) })}
          </Typography>
        )}
        {chips(CHIPS)}
        {/* Never on a check or prove page: a job isn't got ready there (holder-guard.ts). */}
        {!holderRequestsPaused() && (
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={doIt}
                  onChange={(e) => {
                    setDoIt(e.target.checked);
                    // The job's page, fetched now while there may be a signal: it opens offline too.
                    if (e.target.checked) void import('./JobPage').catch(() => undefined);
                  }}
                  data-ask-doit=""
                />
              }
              label={t('app.job.mode')}
            />
            {doIt && (
              <Typography variant="body2" color="text.secondary">
                {t('app.job.modeHelp')}
              </Typography>
            )}
          </Box>
        )}
        <Box
          component="form"
          onSubmit={(e) => {
            e.preventDefault();
            void ask();
          }}
          sx={{ display: 'flex', gap: 1 }}
        >
          <TextField
            size="small"
            fullWidth
            inputRef={input}
            placeholder={t('app.ask.inputPlaceholder')}
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, ASK_MAX_CHARS))}
            slotProps={{
              htmlInput: { maxLength: ASK_MAX_CHARS, 'data-ask-input': '', 'aria-label': t('app.ask.inputLabel') },
            }}
          />
          <Button type="submit" variant="contained" disabled={!text.trim()}>
            {t('app.ask.go')}
          </Button>
        </Box>
        {turns.length > 0 && (
          <>
            <Divider />
            {turns.map((turn) => (
              <Box key={turn.id} data-ask-turn={turn.result.type}>
                {turn.text && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5, overflowWrap: 'anywhere' }}>
                    {t('app.ask.you', { text: turn.text })}
                  </Typography>
                )}
                {turn.job ? (
                  <JobTurn
                    id={turn.id}
                    plan={turn.job}
                    onClose={onClose}
                    chips={chips}
                    onUse={(text) => {
                      // Made only from what the person typed and their own record names: a
                      // sentence they send themselves, not the hint's.
                      setText(text.slice(0, ASK_MAX_CHARS));
                      setTimeout(() => input.current?.focus(), 0);
                    }}
                  />
                ) : (
                  <Answer result={turn.result} records={records} onClose={onClose} chips={chips} />
                )}
              </Box>
            ))}
            <Button
              size="small"
              color="inherit"
              onClick={() => {
                kept = [];
                setTurns([]);
              }}
              sx={{ alignSelf: 'flex-start' }}
            >
              {t('app.ask.clear')}
            </Button>
          </>
        )}
        {ModelBridge && ModelPanel && (
          <Suspense fallback={null}>
            <ModelBridge again={engineAgain} onState={setEngine} />
            <ModelPanel onChange={() => setEngineAgain((n) => n + 1)} folded={!firstOpen} />
          </Suspense>
        )}
        <div ref={end} />
      </Stack>
    </Drawer>
  );
}

/** Jobs being made from a turn, once each (React may draw a turn twice). */
const preparing = new Map<number, Promise<{ id: string } | { refused: Refusal; words?: string }>>();

/**
 * "Do it for me": the plan read from the text, got ready on this device, then opened to check.
 * A refusal says why, with the three closest things Ask can do.
 */
const JobTurn: React.FC<{
  id: number;
  plan: PlanResult;
  onClose: () => void;
  chips: (a: readonly AskAction[]) => React.ReactNode;
  /** Put a sentence in the box, for the person to send. */
  onUse: (text: string) => void;
}> = ({ id, plan, onClose, chips, onUse }) => {
  const tr = useT();
  const { t } = tr;
  const navigate = useNavigate();
  const [out, setOut] = useState<{ id: string } | { refused: Refusal; words?: string }>();
  useEffect(() => {
    if (plan.type !== 'plan') return;
    let live = true;
    let p = preparing.get(id);
    if (!p) {
      p = prepareJob(plan.plan, jobWords(tr), Date.now(), today()).then((r) => ('job' in r ? { id: r.job.id } : r));
      preparing.set(id, p);
    }
    void p.then(
      (r) => {
        if (!live) return;
        setOut(r);
        if ('id' in r) {
          onClose();
          void navigate(`/ask/job/${r.id}`, { state: { [JOB_STATE_KEY]: r.id } });
        }
      },
      (e: unknown) => live && setOut({ refused: 'records', words: e instanceof Error ? e.message : String(e) }),
    );
    return () => {
      live = false;
    };
  }, [id]);
  if (plan.type === 'refuse') {
    // What it understood, what it couldn't use, and a sentence that works, for the person to send.
    const sentences = (plan.suggest ?? []).map((s) => ('text' in s ? s.text : readySentence(tr, s.ready)));
    return (
      <Card data="job-refused">
        {plan.understood && (
          <Typography variant="body2" data-job-understood="">
            {t('app.job.understood', { text: plan.understood })}
          </Typography>
        )}
        <Typography variant="body2" data-job-refused={plan.why}>
          {t(`app.job.no.${plan.why}` as AppKey, { words: (plan.words ?? []).join(' ') })}
        </Typography>
        {sentences.length > 0 && (
          <Stack spacing={1}>
            {sentences.map((text) => (
              <Button
                key={text}
                variant="outlined"
                onClick={() => onUse(text)}
                sx={{ alignSelf: 'flex-start', textTransform: 'none', textAlign: 'left' }}
                data-job-use=""
              >
                {t('app.job.use', { text })}
              </Button>
            ))}
          </Stack>
        )}
        {plan.why === 'notFound' && (
          <Button
            variant="outlined"
            onClick={() => {
              onClose();
              void navigate('/new');
            }}
            sx={{ alignSelf: 'flex-start' }}
          >
            {t('app.job.newRecord')}
          </Button>
        )}
        {!sentences.length && plan.why !== 'notFound' && chips(plan.closest)}
      </Card>
    );
  }
  if (!out || 'id' in out)
    return (
      <Card data="job-working">
        <Typography variant="body2" data-job-working="">
          {t('app.job.working')}
        </Typography>
        {out && (
          <Button
            variant="contained"
            onClick={() => {
              onClose();
              void navigate(`/ask/job/${out.id}`, { state: { [JOB_STATE_KEY]: out.id } });
            }}
            sx={{ alignSelf: 'flex-start' }}
          >
            {t('app.job.open')}
          </Button>
        )}
      </Card>
    );
  return (
    <Card data="job-refused">
      <Typography variant="body2" data-job-refused={out.refused}>
        {t(`app.job.no.${out.refused}` as AppKey, { n: out.words ?? '' })}
      </Typography>
      {out.words && out.refused !== 'tooManyReports' && (
        <Typography variant="caption" color="text.secondary">
          {out.words}
        </Typography>
      )}
    </Card>
  );
};

const Card: React.FC<React.PropsWithChildren<{ data?: string }>> = ({ children, data }) => (
  <Box
    sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.5 }}
    {...(data ? { 'data-ask-card': data } : {})}
  >
    <Stack spacing={1}>{children}</Stack>
  </Box>
);

const Answer: React.FC<{
  result: AskResult;
  records: readonly StrainRecord[];
  onClose: () => void;
  chips: (a: readonly AskAction[]) => React.ReactNode;
}> = ({ result, records, onClose, chips }) => {
  const { t } = useT();
  const navigate = useNavigate();
  switch (result.type) {
    case 'draft':
      return <DraftCard draft={result.draft} unmatched={result.unmatched} records={records} onClose={onClose} />;
    case 'due':
      return <DueCard records={records} />;
    case 'explain':
      return <ExplainCard topic={result.topic} />;
    case 'search':
      return <SearchCard query={result.query} records={records} onClose={onClose} />;
    case 'go':
      return (
        <Card data="go">
          <Button
            variant="outlined"
            onClick={() => {
              onClose();
              void navigate(GO[result.action]);
            }}
            sx={{ alignSelf: 'flex-start' }}
          >
            {t(`app.ask.chip.${result.action}` as AppKey)}
          </Button>
        </Card>
      );
    case 'miss':
      return (
        <Card data="miss">
          <Typography variant="body2">{t('app.ask.miss')}</Typography>
          {chips(result.closest)}
        </Card>
      );
  }
};

/** What a draft will open with, in the app's words; the person opens it and saves there. */
const DraftCard: React.FC<{
  draft: AskDraft;
  unmatched: readonly string[];
  records: readonly StrainRecord[];
  onClose: () => void;
}> = ({ draft, unmatched, records, onClose }) => {
  const { t } = useT();
  const navigate = useNavigate();
  const kind = t(`app.ask.kind.${draft.kind}` as AppKey);
  const parents = (draft.parents ?? []).map((id) => records.find((r) => r.id === id)?.strainName ?? id);
  const screen = t(`app.ask.screen.${draft.preset}` as AppKey, { kind });
  return (
    <Card data="draft">
      <Typography variant="subtitle2" data-ask-draft={`${draft.kind}:${draft.preset}`}>
        {t('app.ask.draft.opens', { screen })}
      </Typography>
      <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
        {draft.name && (
          <Typography component="li" variant="body2">
            {t('app.ask.draft.name', { v: draft.name })}
          </Typography>
        )}
        {parents.length > 0 && (
          <Typography component="li" variant="body2">
            {draft.preset === 'clones'
              ? t('app.ask.draft.cutFrom', { v: parents[0] })
              : t('app.ask.draft.parents', { v: parents.join(' × ') })}
          </Typography>
        )}
        {draft.count !== undefined && (
          <Typography component="li" variant="body2">
            {t('app.ask.draft.count', { n: draft.count })}
          </Typography>
        )}
      </Box>
      {unmatched.map((name) => (
        <Typography key={name} variant="body2" color="text.secondary">
          {t('app.ask.draft.notFound', { name })}
        </Typography>
      ))}
      <Typography variant="caption" color="text.secondary">
        {t('app.ask.draft.nothingSaved')}
      </Typography>
      <Button
        variant="contained"
        onClick={() => {
          onClose();
          void navigate('/new', { state: { [HANDOFF_STATE_KEY]: draft } });
        }}
        sx={{ alignSelf: 'flex-start' }}
        data-ask-draft-open=""
      >
        {t('app.ask.draft.open')}
      </Button>
    </Card>
  );
};

const DueCard: React.FC<{ records: readonly StrainRecord[] }> = ({ records }) => {
  const tr = useT();
  const { t } = tr;
  const licenses = useLicenses();
  // The deals' messages as this page has read them (a license page, the backup): Ask reads none itself.
  useDealsReadHere();
  const day = today();
  const items = dueItems(licenses, records, day, 20, dealStateHere);
  // What has a date: the calendar file and the reminder's count. An agreement this page
  // hasn't checked is a link to it, not an item due.
  const dated = items.filter((i) => i.kind !== 'check');
  const [copied, setCopied] = useState(false);
  const what = (i: DueItem): string =>
    i.kind === 'check'
      ? t('app.ask.due.check', { name: i.name })
      : i.kind === 'ends'
        ? t('app.ask.due.ends', { name: i.name })
        : t(i.kind === 'report' ? 'app.ask.due.report' : 'app.ask.due.payment', {
            name: i.name,
            from: tr.date(`${i.from}T12:00:00`),
            to: tr.date(`${i.to}T12:00:00`),
          });
  const calendar = () => {
    const body = dueCalendar(dated, (i) => t('app.ask.due.calName', { what: what(i) }));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([body], { type: 'text/calendar' }));
    a.download = 'veilcore-due.ics';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
  };
  const share = async () => {
    // Only how many: no names, dates or amounts, so it can go to LINE or WhatsApp.
    const text = tr.tp('app.ask.due.shareText', dated.length);
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
      }
    } catch {
      /* the person closed the share sheet */
    }
  };
  return (
    <Card data="due">
      <Typography variant="subtitle2">{t('app.ask.due.title')}</Typography>
      <Typography variant="caption" color="text.secondary">
        {t('app.ask.due.from')}
      </Typography>
      {items.length === 0 ? (
        <Typography variant="body2">{t('app.ask.due.none')}</Typography>
      ) : (
        <>
          <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
            {items.map((i) => (
              <Typography component="li" variant="body2" key={`${i.licenseId}-${i.kind}-${i.date}`}>
                <Link component={RouterLink} to={`/license/${i.licenseId}`} data-due-kind={i.kind}>
                  {i.kind === 'check'
                    ? what(i)
                    : t('app.ask.due.line', { date: tr.date(`${i.date}T12:00:00`), what: what(i) })}
                </Link>
                {i.overdue && ` · ${t('app.ask.due.overdue')}`}
                {i.practice && ` · ${t('app.lic.practice.chip')}`}
              </Typography>
            ))}
          </Box>
          {dated.length > 0 && (
            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
              <Button size="small" variant="outlined" onClick={calendar}>
                {t('app.ask.due.ics')}
              </Button>
              <Button size="small" variant="outlined" onClick={() => void share()}>
                {t('app.ask.due.share')}
              </Button>
            </Stack>
          )}
          {dated.length > 0 && (
            <Typography variant="caption" color="text.secondary">
              {copied ? t('app.ask.due.copied') : t('app.ask.due.shareNote')}
            </Typography>
          )}
        </>
      )}
    </Card>
  );
};

const ExplainCard: React.FC<{ topic?: Topic }> = ({ topic }) => {
  const { t } = useT();
  const [shown, setShown] = useState<Topic | undefined>(topic);
  return (
    <Card data="explain">
      {shown ? (
        <Box data-ask-topic={shown}>
          <Typography variant="subtitle2">{t(`app.ask.term.${shown}` as AppKey)}</Typography>
          <Typography variant="body2">{t(`app.ask.def.${shown}` as AppKey)}</Typography>
        </Box>
      ) : (
        <Typography variant="body2">{t('app.ask.explain.pick')}</Typography>
      )}
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
        {TOPICS.filter((k) => k !== shown).map((k) => (
          <Chip key={k} size="small" label={t(`app.ask.term.${k}` as AppKey)} onClick={() => setShown(k)} />
        ))}
      </Stack>
    </Card>
  );
};

const SearchCard: React.FC<{ query: string; records: readonly StrainRecord[]; onClose: () => void }> = ({
  query,
  records,
  onClose,
}) => {
  const tr = useT();
  const { t } = tr;
  const [q, setQ] = useState(query);
  const found = searchRecords(records, q);
  const SHOWN = 12;
  return (
    <Card data="search">
      <TextField size="small" label={t('app.ask.search.label')} value={q} onChange={(e) => setQ(e.target.value)} />
      <Typography variant="caption" color="text.secondary">
        {t('app.ask.search.hint')}
      </Typography>
      {q.trim() && found.length === 0 ? (
        <Alert severity="info" variant="outlined">
          {t('app.ask.search.none', { q: q.trim() })}
        </Alert>
      ) : (
        <>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {tr.tp('app.ask.search.found', found.length)}
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
            {found.slice(0, SHOWN).map((r) => (
              <Typography component="li" variant="body2" key={r.id}>
                <Link component={RouterLink} to={`/record/${r.id}`} onClick={onClose}>
                  {r.strainName || r.refId || r.id}
                </Link>
                {r.dateCreated ? ` · ${r.dateCreated}` : ''}
              </Typography>
            ))}
            {found.length > SHOWN && (
              <Typography component="li" variant="body2" color="text.secondary">
                {t('app.ask.search.more', { n: found.length - SHOWN })}
              </Typography>
            )}
          </Box>
        </>
      )}
    </Card>
  );
};
