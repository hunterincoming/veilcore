// Ask VeilCore: a sheet over the record app (bottom on a phone, side on a computer). Chips first,
// a text box second. It drafts; only the person saves, signs or sends, on the screen it opens.
//
// "Typing here sends nothing. Only Save does." Nothing here makes a request: Shortcuts (ask/shortcuts.ts)
// reads the text in this page, What's due, Explain and Search read what this browser already
// holds. The conversation is kept in memory only, for as long as the page is open: never
// stored, never in a backup (docs/ask-veilcore.md). e2e/ask.spec.ts checks the network stays
// silent while a draft is made.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  IconButton,
  Link,
  Stack,
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
import { dueCalendar, dueItems, type DueItem } from '../../ask/due';
import { searchRecords } from '../../ask/search';
import { today } from '../flow/log-flow-state';

type Turn = { readonly id: number; readonly text?: string; readonly result: AskResult };

// The conversation, for as long as this page is open. Never written anywhere.
let kept: Turn[] = [];
let nextId = 1;

const CHIPS: readonly AskAction[] = ['record', 'clones', 'offspring', 'cross', 'due', 'explain', 'search'];

const KINDS: readonly DraftKind[] = [
  'plant',
  ...(ANIMAL_RECORDS_ENABLED ? (['animal'] as const) : []),
  ...(STRAIN_RECORDS_ENABLED ? (['strain'] as const) : []),
];

export default function AskSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down('sm'));
  const tr = useT();
  const { t } = tr;
  const records = useRecords();
  const ctx: AskContext = useMemo(() => ({ records, kinds: KINDS }), [records]);
  const [turns, setTurns] = useState<Turn[]>(kept);
  const [text, setText] = useState('');
  const end = useRef<HTMLDivElement>(null);

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
    add({ text: typed, result: await shortcutsEngine.interpret(typed, ctx) });
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
        <Typography variant="body1">{t('app.ask.intro')}</Typography>
        <Typography variant="body2" color="text.secondary" data-ask-privacy="">
          {t('app.ask.privacy')}
          {t('app.common.sentenceSep')}
          {t('app.ask.engine')}
        </Typography>
        {chips(CHIPS)}
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
                <Answer result={turn.result} records={records} onClose={onClose} chips={chips} />
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
        <div ref={end} />
      </Stack>
    </Drawer>
  );
}

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
  const day = today();
  const items = dueItems(licenses, records, day);
  const [copied, setCopied] = useState(false);
  const what = (i: DueItem): string =>
    i.kind === 'ends'
      ? t('app.ask.due.ends', { name: i.name })
      : t(i.kind === 'report' ? 'app.ask.due.report' : 'app.ask.due.payment', {
          name: i.name,
          from: tr.date(`${i.from}T12:00:00`),
          to: tr.date(`${i.to}T12:00:00`),
        });
  const calendar = () => {
    const body = dueCalendar(items, (i) => t('app.ask.due.calName', { what: what(i) }));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([body], { type: 'text/calendar' }));
    a.download = 'veilcore-due.ics';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
  };
  const share = async () => {
    // Only how many: no names, dates or amounts, so it can go to LINE or WhatsApp.
    const text = tr.tp('app.ask.due.shareText', items.length);
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
                <Link component={RouterLink} to={`/license/${i.licenseId}`}>
                  {t('app.ask.due.line', { date: tr.date(`${i.date}T12:00:00`), what: what(i) })}
                </Link>
                {i.overdue && ` · ${t('app.ask.due.overdue')}`}
              </Typography>
            ))}
          </Box>
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
            <Button size="small" variant="outlined" onClick={calendar}>
              {t('app.ask.due.ics')}
            </Button>
            <Button size="small" variant="outlined" onClick={() => void share()}>
              {t('app.ask.due.share')}
            </Button>
          </Stack>
          <Typography variant="caption" color="text.secondary">
            {copied ? t('app.ask.due.copied') : t('app.ask.due.shareNote')}
          </Typography>
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
