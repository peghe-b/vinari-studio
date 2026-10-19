// src/scenes/kit/reveal.tsx: the promos' product reveal (2026-10-19; from the diagnostics and QR promos' Reveal.tsx, the owner:
// "the phone mockup must rise SLOWLY and gently"), for the film's first look at the app. Two set-ups:
//   A  black. A faint rim of light finds a black iPhone low in the dark; it RISES slowly (1.2 s, eased, a soft settle) while
//      it turns toward us; its screen wakes on the real capture (`src`); the white opens out of its screen and the `big` lines
//      land calm above it.
//   B  (optional: `title` and its `cut`) a cut to the phone bigger, turned the other way, the screen readable; the small
//      `kicker` and the `title` lines landing one by one above it. The phone always whole, never cropped.
// Moments are the scene's (a subtitle chunk index or "1.2s"): rise, wake, white, kick (the big lines), cut, lines[i]. Layout in
// the 1080 x 1920 box: `top` the first text line's top, `foot` the phone's lowest point (in a film keep it above the
// subtitle: about 1300 on the stage; on a Story slide inside the safe zone: at most 1560). Text black or white, Mtavruli.
//
//   <PhoneReveal ctx={ctx} src="21-obd-hub" big={['საქართველოში', 'პირველად']} kick={1}
//                kicker="საქართველოში პირველად" title={['OBD სკანერი', 'ქართულად']} cut={2} lines={[2, 3]} />
import React from 'react';
import {mtav} from '../../lib/format';
import {textWidth} from '../../lib/measure';
import {TXT} from '../../lib/layer';
import type {SceneCtx} from '../../types';
import {C, F} from '../../tokens';
import {clamp, E, lerp, prog} from './lib';
import {atFoot, bodyBox, float, Phone3, projectBox} from './phone3d';
import {INK, rise, useShot} from './stage';

type At = number | string;
const fit = (lines: string[], size: number, max: number, weight = 700) => {
  const w = Math.max(1, ...lines.map((l) => textWidth(l, `${weight} ${size}px ${F.sans}`)));
  return w > max ? Math.floor((size * max) / w) : size;
};

export const PhoneReveal: React.FC<{
  ctx: SceneCtx;
  src: string;
  big?: string[];
  kicker?: string;
  title?: string[];
  rise?: At;
  wake?: At;
  white?: At;
  kick?: At;
  cut?: At;
  lines?: At[];
  top?: number;
  foot?: number;
  latin?: boolean;
}> = ({ctx, src, big = [], kicker, title, rise: riseP, wake: wakeP, white: whiteP, kick: kickP, cut: cutP, lines: linesP, top = 400, foot = 1300, latin = false}) => {
  const {t, at} = useShot(ctx);
  const tx = (s: string) => (latin ? s : mtav(s));
  const riseAt = at(riseP, 0);
  const wake = at(wakeP, riseAt + 22);
  const white = at(whiteP, wake + 18);
  const kick = at(kickP, white + 12);
  const cutB = title && title.length ? at(cutP, kick + 45) : Infinity;
  const fl = float(t);
  const font = (sz: number) => `700 ${sz}px ${F.sans}`;
  const field = (bg: string, children: React.ReactNode) => <div style={{position: 'absolute', left: -60, right: -60, top: -80, bottom: -80, background: bg, overflow: 'hidden'}}><div style={{position: 'absolute', left: 60, top: 80, width: 1080, height: 1920}}>{children}</div></div>;

  if (t >= cutB && title) {
    // ---- B: the headline over the phone, the screen big ----
    const q = t - cutB;
    const ls = title.map(tx);
    const ts = fit(ls, 96, 900);
    const kickTop = top - 62;
    const titleBottom = top + ts * 1.06 * ls.length;
    const ratio = bodyBox({x: 540, y: 960, w: 100, yaw: -12, pitch: 4, roll: 0}).h / 100;
    const w0 = Math.max(220, (foot - titleBottom - 34) / ratio);
    const push = E.inOut(clamp(q / 110));
    const pose = atFoot({x: 540, w: w0 * lerp(1, 1.025, push), yaw: lerp(-14, -9, push) + fl.roll, pitch: 4 + fl.pitch, roll: 1}, foot);
    const lineAt = (i: number) => (i === 0 ? cutB : at(linesP?.[i], cutB + 8 * i));
    return field(
      C.surface,
      <>
        {kicker ? (
          <div className={TXT} style={{position: 'absolute', left: 0, right: 0, top: kickTop, textAlign: 'center', fontFamily: F.sans, fontWeight: 500, fontSize: 40, letterSpacing: '0.05em', color: C.ink, whiteSpace: 'nowrap'}}>
            {tx(kicker)}
          </div>
        ) : null}
        {ls.map((l, i) => {
          const k = i === 0 ? 1 : E.out(prog(t, lineAt(i) - 2, 11));
          if (k <= 0) return null;
          return (
            <div key={i} className={TXT} style={{position: 'absolute', left: 0, right: 0, top: top + i * ts * 1.06, textAlign: 'center', fontFamily: F.sans, fontWeight: 700, fontSize: ts, lineHeight: 1, color: C.ink, whiteSpace: 'nowrap', opacity: k, transform: `translateY(${(1 - k) * 26}px)`}}>
              {l}
            </div>
          );
        })}
        <Phone3 src={src} pose={pose} shadow={1} />
      </>,
    );
  }

  // ---- A: the rise in the dark, the white out of the screen, the big lines ----
  const bl = big.map(tx);
  const bs = bl.length ? fit(bl, 118, 880) : 118;
  const r = rise(t, riseAt, 36);
  const w = lerp(320, 392, clamp(r));
  let pose = atFoot({x: 540, w, yaw: lerp(56, 10, r) + fl.roll * r, pitch: lerp(16, 4, r) + fl.pitch * r, roll: lerp(-6, -1, r)}, lerp(2600, foot, clamp(r)));
  pose = {...pose, y: pose.y + fl.bob * r};
  const faint = 0.55 * E.out2(prog(t, riseAt, 24));
  const rimDark = lerp(faint, 1.15, E.out(prog(t, wake - 6, 30)));
  const look = E.out(prog(t, white, 8));
  const rim = lerp(rimDark, 1, look);
  const lum = t < white ? 0.85 * E.out(prog(t, wake, 12)) : lerp(0.85, 1, E.out(prog(t, white, 8)));
  const scr = projectBox(pose, {x0: 0, y0: 0, x1: 1, y1: 1});
  const BLOOM = 22;
  const burst = E.sine(prog(t, white, BLOOM));
  const isWhite = t >= white + BLOOM;
  const body = bodyBox(pose);
  const backlight = 0.5 * E.sine(prog(t, wake - 6, 24)) * (1 - E.sine(prog(t, white + 8, 16)));
  const bigK = E.out(prog(t, kick - 2, 12));
  return field(
    isWhite ? C.surface : '#000000',
    <>
      {/* the white opening out of the screen: a frame-sized layer (never a box far past the frame: Chrome tiles that) */}
      {!isWhite && burst > 0 ? (
        <div
          style={{
            position: 'absolute',
            inset: -80,
            background: `radial-gradient(ellipse ${(((scr.w + 5800 * burst) / 2) * Math.SQRT2).toFixed(1)}px ${(((scr.h + 5800 * burst) / 2) * Math.SQRT2).toFixed(1)}px at ${(scr.x + scr.w / 2 + 80).toFixed(1)}px ${(scr.y + scr.h / 2 + 80).toFixed(1)}px, ${C.surface} 0%, ${C.surface} ${lerp(8, 62, burst)}%, rgba(255,255,255,0) ${lerp(40, 71, burst)}%)`,
            opacity: clamp(burst * 3),
          }}
        />
      ) : null}
      {bigK > 0 && bl.length ? (
        <div className={TXT} style={{position: 'absolute', left: 0, right: 0, top, textAlign: 'center', fontFamily: F.sans, fontWeight: 700, fontSize: bs, lineHeight: 1.04, color: isWhite || look > 0.5 ? C.ink : INK, opacity: bigK, transform: `translateY(${(1 - bigK) * 20}px)`, whiteSpace: 'nowrap'}}>
          {bl.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
      ) : null}
      {backlight > 0.002 ? <div style={{position: 'absolute', left: body.x + body.w * 0.06, top: body.y + body.h * 0.04, width: body.w * 0.88, height: body.h * 0.92, borderRadius: body.w * 0.16, background: C.surface, filter: 'blur(46px)', opacity: backlight}} /> : null}
      {r > 0.001 ? <Phone3 src={src} pose={pose} on={lum} look={look} rim={rim} shadow={1} /> : null}
    </>,
  );
};
