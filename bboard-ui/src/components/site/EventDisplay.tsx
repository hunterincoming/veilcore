// The hero's event display (Mako's design, 18 November 2026): rings, and a burst of tracks drawn
// from the 32 bytes of the proof code in the box below it, like a detector's picture of one
// event. Type something else and the old picture fades as the new one draws.
//
// Ported from his canvas script with the costs taken out: it draws for about a second after the
// code changes and then stops (no loop while nothing changes); never while off screen or in a
// hidden tab; at no more than 1.5 device pixels per CSS pixel; and with reduced motion it draws
// the finished picture at once. Decoration: hidden from screen readers (the proof code itself is
// in the box below, as text).
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useRef } from 'react';

const COLOURS = { ring: '#5A7BA6', rule: '#1A2331', yellow: '#C99A3A', cyan: '#5FD3DF', ink: '#C9D2DE' };
const DURATION = 1100;
const MAX_DPR = 1.5;

export const hexBytes = (hex: string): Uint8Array => Uint8Array.from(hex.match(/../g) ?? [], (b) => parseInt(b, 16));

const ease = (x: number) => 1 - (1 - x) ** 3;
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const nibbles = (b: Uint8Array) => {
  const out: number[] = [];
  for (const x of b) out.push(x >> 4, x & 15);
  return out;
};
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

type Display = { set: (bytes: Uint8Array) => void; stop: () => void };

const makeDisplay = (canvas: HTMLCanvasElement): Display => {
  const ctx = canvas.getContext('2d');
  const fig = canvas.parentElement;
  if (!ctx || !fig) return { set: () => undefined, stop: () => undefined };
  let w = 0;
  let h = 0;
  let cx = 0;
  let cy = 0;
  let radius = 0;
  let cur: Uint8Array | null = null;
  let prev: Uint8Array | null = null;
  let t0 = 0;
  let onScreen = true;
  let raf = 0;
  const duration = reducedMotion() ? 0 : DURATION;

  const rings = (r: number) => {
    ctx.lineWidth = 1;
    [0.12, 0.24, 0.38, 0.52].forEach((f, i) => {
      ctx.beginPath();
      ctx.arc(0, 0, r * f, 0, Math.PI * 2);
      ctx.strokeStyle = COLOURS.ring;
      ctx.globalAlpha = 0.12 + i * 0.04;
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
    ctx.strokeStyle = COLOURS.rule;
    [0.64, 0.8, 0.92].forEach((f) => {
      ctx.beginPath();
      ctx.arc(0, 0, r * f, 0, Math.PI * 2);
      ctx.stroke();
    });
  };

  const tracks = (bytes: Uint8Array, progress: number, alpha: number, r: number) => {
    const nib = nibbles(bytes);
    const outer = ease(clamp((progress - 0.45) / 0.55));
    if (outer > 0) {
      ctx.lineCap = 'butt';
      for (let i = 0; i < 72; i++) {
        const v = bytes[i % 32] ^ bytes[(i * 7) % 32];
        const len = (r * 0.015 + (v / 255) * r * 0.12) * outer;
        const a = (i / 72) * Math.PI * 2;
        const from = r * 0.66;
        ctx.lineWidth = 2;
        ctx.strokeStyle = v > 200 ? COLOURS.yellow : COLOURS.ring;
        ctx.globalAlpha = alpha * (v > 200 ? 0.9 : 0.25 + (v / 255) * 0.45);
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * from, Math.sin(a) * from);
        ctx.lineTo(Math.cos(a) * (from + len), Math.sin(a) * (from + len));
        ctx.stroke();
      }
    }
    ctx.lineCap = 'round';
    for (let i = 0; i < 64; i++) {
      const n = nib[i];
      const straight = n >= 14;
      const dir = i % 2 ? 1 : -1;
      const curl = straight ? dir * 0.06 : dir * (0.3 + ((15 - n) / 15) * 1.7);
      const reach = straight ? r * (1.2 + (nib[(i + 5) % 64] / 15) * 0.6) : r * (0.32 + (n / 15) * 0.32);
      const angle = (i / 64) * Math.PI * 2 + (nib[(i + 17) % 64] / 15) * 0.12;
      const grown = ease(clamp(progress * 1.3 - (i / 64) * 0.3));
      if (grown <= 0) continue;
      const gold = n % 4 === 0;
      ctx.strokeStyle = straight ? COLOURS.cyan : gold ? COLOURS.yellow : COLOURS.ink;
      ctx.globalAlpha = alpha * (straight ? 0.85 : gold ? 0.9 : 0.42);
      ctx.lineWidth = straight ? 1.6 : gold ? 1.3 : 0.9;
      ctx.beginPath();
      for (let s = 0; s <= 28; s++) {
        const f = (s / 28) * grown;
        const d = reach * f;
        const a = angle + curl * f;
        if (s) ctx.lineTo(Math.cos(a) * d, Math.sin(a) * d);
        else ctx.moveTo(Math.cos(a) * d, Math.sin(a) * d);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };

  const frame = (now: number) => {
    if (!w) return;
    ctx.clearRect(0, 0, w, h);
    const r = radius * 0.97;
    ctx.save();
    ctx.translate(cx, cy);
    rings(r);
    const p = duration ? clamp((now - t0) / duration) : 1;
    if (prev && p < 1) tracks(prev, 1, 1 - ease(p), r);
    if (cur) tracks(cur, p, 1, r);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = COLOURS.yellow;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  };

  const loop = (now: number) => {
    raf = 0;
    frame(now);
    if (duration && now - t0 < duration && onScreen && !document.hidden) raf = requestAnimationFrame(loop);
  };
  const kick = () => {
    if (!raf) raf = requestAnimationFrame(loop);
  };

  const resize = () => {
    const box = canvas.getBoundingClientRect();
    const f = fig.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    w = box.width;
    h = box.height;
    cx = f.left - box.left + f.width / 2;
    cy = f.top - box.top + f.height / 2;
    radius = Math.min(f.width, f.height) / 2;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Drawn at the end state: a resize mid-animation never restarts the burst.
    frame(t0 + duration);
  };
  const sized = new ResizeObserver(resize);
  sized.observe(canvas);
  const seen = new IntersectionObserver(([e]) => {
    onScreen = e.isIntersecting;
    if (onScreen) kick();
  });
  seen.observe(canvas);
  const shown = () => {
    if (!document.hidden) kick();
  };
  document.addEventListener('visibilitychange', shown);

  return {
    set(bytes) {
      prev = cur;
      cur = bytes;
      t0 = performance.now();
      if (duration) kick();
      else frame(t0);
    },
    stop() {
      sized.disconnect();
      seen.disconnect();
      document.removeEventListener('visibilitychange', shown);
      cancelAnimationFrame(raf);
    },
  };
};

/** The figure: square, beside the hero's headline; the canvas runs past it on every side. */
export const EventDisplay: React.FC<{ hex: string }> = ({ hex }) => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const display = useRef<Display | null>(null);
  useEffect(() => {
    const c = canvas.current;
    if (!c || typeof ResizeObserver === 'undefined' || typeof IntersectionObserver === 'undefined') return;
    const d = makeDisplay(c);
    display.current = d;
    return () => {
      d.stop();
      display.current = null;
    };
  }, []);
  useEffect(() => {
    if (hex.length === 64) display.current?.set(hexBytes(hex));
  }, [hex]);
  return (
    <figure className="k-event" aria-hidden="true">
      <canvas ref={canvas} />
    </figure>
  );
};
