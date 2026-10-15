// Round 6 (final review): the smaller fixes, each pinned. The check page's lab report story
// is in veilcore/saved-report.test.ts; file types in veilcore/report-file-type.test.ts.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SRC = path.dirname(fileURLToPath(import.meta.url));
const source = (f: string) => fs.readFileSync(path.join(SRC, f), 'utf8');

describe('a lab whose lab report was withdrawn is told so, and can still see what it sent', () => {
  it('the plant page row: withdrawn, not "not yet"', async () => {
    const { labSentRow } = await import('./components/flow/plant-status-words');
    expect(labSentRow(undefined, undefined)).toEqual({ done: false, label: 'Lab report sent', value: 'checking…' });
    expect(labSentRow(0, 0)).toEqual({ done: false, label: 'Lab report sent', value: 'not yet' });
    expect(labSentRow(1, 2)).toEqual({ done: true, label: 'Lab report sent', value: '1 sent' });
    expect(labSentRow(0, 2)).toEqual({
      done: false,
      label: 'Lab report',
      value: 'withdrawn (you can send a new one)',
    });
  });

  it('Home’s card line says withdrawn too', async () => {
    const { labSentPhrase } = await import('./components/flow/plant-status-words');
    expect(labSentPhrase({ sent: 0, sentEver: 2 })).toBe('lab report withdrawn');
    expect(labSentPhrase({ sent: 1, sentEver: 2 })).toBe('1 lab report sent');
    expect(labSentPhrase({ sent: 2, sentEver: 2 })).toBe('2 lab reports sent');
    expect(labSentPhrase({ sent: 0, sentEver: 0 })).toBeUndefined();
    expect(source('components/flow/LabResults.tsx')).toContain('labSentPhrase(facts),');
  });

  it('the next step keeps "See what you sent" after a withdrawal', () => {
    const s = source('components/NextStep.tsx');
    expect(s).toContain("action: (labSentEver ?? 0) > 0 ? 'See what you sent' : 'Send results back'");
    expect(s).toContain("'Lab report withdrawn'");
  });
});

describe('the claims contract is described as the landing page does', () => {
  it('on Midnight’s main network since 8 October 2026; not usable from this website yet', async () => {
    const { CLAIMS_WHERE } = await import('./config/copy');
    expect(CLAIMS_WHERE).toBe(
      'It has been on Midnight’s main network since 8 October 2026, but it can’t be used from this website yet.',
    );
    expect(CLAIMS_WHERE).not.toMatch(/preprod|tested on|web demo/);
  });
});

describe('US spelling: "license" wherever a user reads it', () => {
  it('no "licence" in app text or the docs the app shows (identifiers and stored values aside)', () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.(tsx?|md)$/.test(e.name) && !/\.test\.ts$/.test(e.name)) files.push(p);
      }
    };
    walk(SRC);
    const mine = files.filter((f) => !/[/\\](i18n|components[/\\]site)[/\\]/.test(f));
    const found: string[] = [];
    for (const f of mine) {
      fs.readFileSync(f, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          const t = line.trim();
          if (
            !f.endsWith('.md') &&
            (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('{/*'))
          )
            return;
          const text = (f.endsWith('.md') ? line : line.replace(/\/\/.*$/, ''))
            .replace(/licenceNo/g, '')
            .replace(/licence-listing/g, '')
            .replace(/value="State licence"/g, '');
          if (/licence/i.test(text)) found.push(`${path.relative(SRC, f)}:${i + 1}: ${t}`);
        });
    }
    expect(found).toEqual([]);
  });
});

describe('the smaller wording fixes', () => {
  it('"date it below" only when the panel below can date it', () => {
    const s = source('components/wizard/Step2PairDna.tsx');
    expect(s).toMatch(/const datableBelow = REAL_CHAIN && !chainNotReady\(\) && !!keys\?\.anchor;/);
    expect(s).toMatch(/datableBelow\s*\?\s*'It is not dated yet: date it below/);
  });

  it('a lab report that came from the lab is worded as that, not as a file picked by hand', () => {
    const s = source('components/wizard/Step2PairDna.tsx');
    expect(s).toContain('const fromLab = !!from && !!initialFile;');
    expect(s).toContain('Opened and saved here, on your device.');
    expect(s).toContain('This is the lab report your lab sent through VeilCore.');
  });

  it('the key warning says "fine for trying it out" next to where it is kept, and ends on backing it up', () => {
    const s = source('components/AttesterSetup.tsx').replace(/\s+/g, ' ');
    expect(s).toContain(
      'unencrypted, and nowhere else. That&apos;s fine for trying it out. Anything that can run in this site',
    );
    expect(s).toContain('what you signed before stays valid, so back it up somewhere safe.');
  });

  it('the lab’s Sent screen says what checkers really see: the registered name, marked unchecked until matched', () => {
    const s = source('components/flow/LabResults.tsx').replace(/\s+/g, ' ');
    expect(s).not.toMatch(/name only if/);
    expect(s).toContain('They also see the name your key is registered under.');
  });

  it('"Got it" doesn’t wrap', () => {
    expect(source('components/flow/LabResults.tsx')).toMatch(
      /sx=\{\{ minHeight: 40, whiteSpace: 'nowrap', flexShrink: 0 \}\}\s*>\s*Got it/,
    );
  });
});

describe('focus goes somewhere when the pressed button goes away', () => {
  it('Start over (the kept draft) focuses the screen heading', () => {
    expect(source('components/flow/LogFlow.tsx')).toMatch(
      /setDraft\(startOver\(\)\);[^}]*focusScreenHeading\(\);[\s\S]{0,40}\}\}[\s\S]{0,80}Start over/,
    );
  });

  it('Seal it stays focusable while sealing, says so, and the stamp screen refocuses when it lands', () => {
    const s = source('components/flow/LogFlow.tsx');
    expect(s).not.toMatch(/disabled=\{busy\}\s*onClick=\{\(\) => void seal\(\)\}/);
    expect(s).toContain("{...(busy ? { 'aria-disabled': true as const, className: 'Mui-disabled' } : {})}");
    expect(s).toContain("{busy ? 'Sealing your plant…' : ''}");
    expect(s).toMatch(/if \(!anchored \|\| wasAnchored\.current\) return;[\s\S]{0,80}return focusScreenHeading\(\);/);
  });

  it('the backup: "Saved" after saving, "It works." after the check', () => {
    const s = source('components/flow/BackupStep.tsx');
    expect(s).toContain('if (saved) savedRef.current?.focus();');
    expect(s).toContain('if (checked !== undefined) worksRef.current?.focus();');
  });
});
