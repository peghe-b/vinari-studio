// src/scenes/kit/ui.tsx: small, clean interface moments for film scenes and the Story slides (2026-10-19; our own code after
// remocn's toast, sheet, stepper and chat-flow patterns, MIT). They illustrate a moment (a message arriving, a sheet rising,
// the steps of a how-to); the APP itself is always its real screen (public/screens on Phone3 / Phone), never redrawn here.
// Text black or white, Georgian through mtav(), every text in the text layer, soft shadows, no outlines near text.
//
//   <Toast at={f} title="ვინარი" body="ზეთის შეცვლა ხვალაა" sym="notifications" y={420}/>   drops in from the top, settles
//   <Sheet at={f} rows={['ზეთი', 'ფილტრი']} title="რა შევცვალე" y={980}/>                  a bottom sheet rising with its rows
//   <Stepper n={3} k={1.4} x={540} y={300}/>                      three step dots; k = how far along (1.4: the second, half)
//   <Bubbles at={[f0, f1, f2]} items={[{text: 'სად ხარ', me: false}, ...]} x={160} y={600} w={760}/>   a chat landing line by line
// The frame guards (src/lib/guard.mjs, a film from v110 on): each part is a thing kept WHOLE (lib/layer.ts OBJ: check's probe
// finds it) and places itself inside the frame and over the subtitle band (keepBox: slid, never scaled; a sheet is never
// wider than the frame's whole box).
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {mtav} from '../../lib/format';
import {OBJ, TXT} from '../../lib/layer';
import {guarded, keepBox} from '../../lib/guardrt';
import {C, F, rgba} from '../../tokens';
import {Sym} from './icons';
import {clamp, E, lerp, sp} from './lib';

const shadow = (a = 1) => `0 ${24 * a}px ${60 * a}px ${rgba(C.shade, 0.16 * a)}, 0 ${4 * a}px ${12 * a}px ${rgba(C.shade, 0.08 * a)}`;

const TOAST_H = 148; // 28 + 92 + 28: the icon tile in its padding
export const Toast: React.FC<{at: number; title: string; body?: string; sym?: string; y?: number; x?: number; w?: number; out?: number}> = ({at, title, body, sym = 'notifications', y: y0 = 420, x: x0 = 100, w = 880, out}) => {
  const f = useCurrentFrame();
  // guarded: `w` is the toast's whole width (its padding inside it), so the box it is kept in is the box it fills
  const g = guarded();
  const {x, y} = keepBox({x: x0, y: y0, w, h: TOAST_H});
  const k = sp(f, at, 190, 19);
  const o = out === undefined ? 0 : E.in2(clamp((f - out) / 10));
  if (k <= 0.001 || o >= 0.999) return null;
  return (
    <div
      className={OBJ}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        boxSizing: g ? 'border-box' : undefined,
        display: 'flex',
        alignItems: 'center',
        gap: 26,
        padding: '28px 34px',
        borderRadius: 44,
        background: C.surface,
        boxShadow: shadow(k),
        opacity: clamp(k * 1.6) * (1 - o),
        transform: `translateY(${((1 - k) * -120 - o * 80).toFixed(2)}px) scale(${lerp(0.94, 1, clamp(k)).toFixed(4)})`,
      }}
    >
      <div style={{width: 92, height: 92, flex: 'none', borderRadius: 24, background: C.ink, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <Sym name={sym} size={58} color={C.onInk} />
      </div>
      <div className={TXT} style={{fontFamily: F.sans, color: C.ink, minWidth: 0}}>
        <div style={{fontWeight: 700, fontSize: 40, lineHeight: 1.15, whiteSpace: 'nowrap'}}>{mtav(title)}</div>
        {body ? <div style={{fontWeight: 400, fontSize: 36, lineHeight: 1.25, color: C.ink2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{mtav(body)}</div> : null}
      </div>
    </div>
  );
};

/** the sheet's height (stage px): its padding and handle, the title, the rows */
const sheetH = (rows: number, title: boolean) => 30 + 40 + (title ? 46 * 1.2 + 18 : 0) + rows * (44 * 1.2 + 44) + 44;
export const Sheet: React.FC<{at: number; title?: string; rows: string[]; y?: number; stagger?: number; mark?: number}> = ({at, title, rows, y: y0 = 980, stagger = 4, mark}) => {
  const f = useCurrentFrame();
  const k = sp(f, at, 160, 21);
  // guarded: the sheet inside the frame's whole box (x 100..980, its foot over the subtitle band)
  const g = guarded();
  const {x, y, w} = keepBox({x: g ? 100 : 60, y: y0, w: g ? 880 : 960, h: sheetH(rows.length, !!title)});
  if (k <= 0.001) return null;
  return (
    <div className={OBJ} style={{position: 'absolute', left: x, width: w, top: y, boxSizing: 'border-box', borderRadius: 56, background: C.surface, boxShadow: shadow(k), padding: '30px 44px 44px', transform: `translateY(${((1 - k) * 700).toFixed(2)}px)`}}>
      <div style={{width: 110, height: 10, borderRadius: 10, background: rgba(C.ink, 0.14), margin: '0 auto 30px'}} />
      {title ? (
        <div className={TXT} style={{fontFamily: F.sans, fontWeight: 700, fontSize: 46, color: C.ink, marginBottom: 18, whiteSpace: 'nowrap'}}>
          {mtav(title)}
        </div>
      ) : null}
      {rows.map((r, i) => {
        const q = E.out(clamp((f - at - 8 - i * stagger) / 10));
        const on = mark === i;
        return (
          <div key={i} style={{display: 'flex', alignItems: 'center', gap: 22, padding: '22px 0', opacity: q, transform: `translateY(${((1 - q) * 24).toFixed(2)}px)`}}>
            <div style={{width: 22, height: 22, borderRadius: 11, background: on ? C.ink : rgba(C.ink, 0.22)}} />
            <div className={TXT} style={{fontFamily: F.sans, fontWeight: on ? 700 : 500, fontSize: 44, color: C.ink, whiteSpace: 'nowrap'}}>
              {mtav(r)}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/** n step dots (numbered when `numbers`), the current one an ink pill; `k` 0..n how far along (fractions move the pill). */
export const Stepper: React.FC<{n: number; k: number; x: number; y: number; numbers?: boolean; size?: number; dark?: boolean}> = ({n, k, x, y, numbers = true, size = 64, dark = false}) => {
  const ink = dark ? C.onInk : C.ink;
  const gap = size * 0.5;
  const total = n * size + (n - 1) * gap + size * 0.9;
  const cur = clamp(k - 1, 0, n - 1);
  const box = keepBox({x: x - total / 2, y: y - size / 2, w: total, h: size});
  return (
    <div className={OBJ} style={{position: 'absolute', left: box.x, top: box.y, width: total, height: size}}>
      <div style={{position: 'absolute', top: 0, height: size, borderRadius: size, background: ink, left: cur * (size + gap), width: size * 1.9}} />
      {Array.from({length: n}, (_, i) => {
        const on = Math.round(cur) === i;
        const x0 = i * (size + gap) + (i > Math.round(cur) ? size * 0.9 : 0);
        return (
          <div
            key={i}
            className={TXT}
            style={{position: 'absolute', left: x0 + (on ? size * 0.45 : 0), top: 0, width: size, height: size, borderRadius: size, background: on ? 'transparent' : rgba(ink, 0.16), display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.sans, fontWeight: 700, fontSize: size * 0.5, color: on ? (dark ? C.ink : C.onInk) : ink}}
          >
            {numbers ? i + 1 : null}
          </div>
        );
      })}
    </div>
  );
};

export type Bubble = {text: string; me?: boolean};
/** A chat landing line by line: each bubble at its own frame (`at[i]`), mine on the right in ink, theirs on the left on the
 *  surface; the newest pushes the others up. */
export const Bubbles: React.FC<{items: Bubble[]; at: number[]; x?: number; y?: number; w?: number; size?: number}> = ({items, at, x: x0 = 140, y: y0 = 560, w = 800, size = 44}) => {
  const f = useCurrentFrame();
  const shown = items.map((_, i) => sp(f, at[i] ?? 1e9, 220, 20));
  const lineH = size * 2.4;
  const {x, y} = keepBox({x: x0, y: y0, w, h: Math.max(0, items.length - 1) * lineH + size * 2.1});
  return (
    <div className={OBJ} style={{position: 'absolute', left: x, top: y, width: w}}>
      {items.map((b, i) => {
        const k = shown[i];
        if (k <= 0.001) return null;
        const after = shown.slice(i + 1).reduce((s, q) => s + clamp(q), 0);
        return (
          <div key={i} style={{position: 'absolute', top: (i - after) * 0 + i * lineH, [b.me ? 'right' : 'left']: 0, maxWidth: w * 0.8, opacity: clamp(k * 1.6), transform: `translateY(${((1 - k) * 30).toFixed(2)}px) scale(${lerp(0.9, 1, clamp(k)).toFixed(4)})`, transformOrigin: b.me ? '100% 100%' : '0 100%'}}>
            <div className={TXT} style={{padding: `${size * 0.42}px ${size * 0.7}px`, borderRadius: size * 0.9, background: b.me ? C.ink : C.surface, color: b.me ? C.onInk : C.ink, fontFamily: F.sans, fontWeight: 500, fontSize: size, lineHeight: 1.25, boxShadow: b.me ? 'none' : shadow(0.6), whiteSpace: 'nowrap'}}>
              {mtav(b.text)}
            </div>
          </div>
        );
      })}
    </div>
  );
};
