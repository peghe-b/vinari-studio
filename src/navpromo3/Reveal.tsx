// ACT 2, the reveal (the owner, 2026-10-21: "the screen goes black and the phone does NOT rise from below: it comes in from
// the SIDE, big"): after the black beat, a big whole iPhone with VINARI's navigator slides in from the RIGHT, turning toward us
// as it comes, and settles with a soft overshoot and a slow camera push; a rim of light finds its titanium edge in the dark.
// On „ნავიგატორი" the white world opens out of its screen (a frame-sized radial layer, never a giant box: the diagnostics
// promo's torn-frame lesson) and the phone stays, big and whole, above the subtitle band. No text but the subtitle.
import React from 'react';
import {mtav} from '../lib/format';
import {textWidth} from '../lib/measure';
import {C, F} from '../tokens';
import {bodyBox, float, Phone3, projectBox, type Pose} from './kit/phone3d';
import {clamp, E, lerp, prog, sp} from './lib';
import {INK, useShot} from './kit/stage';

const NAV = '17-nav-drive';

/** the slide from the side: 0..1 over `dur` frames (v1.2, the art director: about 0.45 s and skewed in 3D while it moved: now
 *  0.9 s, flat to the lens, a long deceleration and a 1.5 % overshoot that eases back) */
const slideIn = (t: number, at: number, dur = 27) => {
  if (t < at) return 0;
  const q = clamp((t - at) / dur);
  const base = 1 - (1 - q) ** 3;
  return base + 0.015 * Math.sin(Math.PI * clamp((t - at - dur * 0.75) / (dur * 0.7)));
};

export const Reveal: React.FC = () => {
  const {t, len, L} = useShot('reveal');
  const at = L('slide');
  const bloom = L('bloom');
  const kw = L('kword');
  const r = slideIn(t, at + 1);
  const fl = float(t);
  const BLOOM = 22;
  // after the white opens the phone settles a step smaller and lower, and the big word „ქართულად" lands above it on the
  // narrator's „ქართულად"; a slow push-in from the slide to the end (never frozen)
  const settle = E.inOut(prog(t, bloom + BLOOM - 4, 22));
  const push = E.inOut(clamp((t - at - 12) / Math.max(1, len - at - 12)));
  const W0 = 592;
  const w = lerp(W0, 448, settle) * (1 + 0.035 * push);
  const x = lerp(1080 + 820, 540, r);
  let pose: Pose = {x, y: 0, w, yaw: lerp(-7, -4, Math.min(1, r)) + fl.roll * clamp(r), pitch: 2 + fl.pitch * clamp(r), roll: 0.4};
  const FOOT = lerp(1368, 1372, settle);
  const box = bodyBox({...pose, y: 0});
  pose = {...pose, y: FOOT - (box.y + box.h) + fl.bob * clamp(r)};
  const burst = E.sine(prog(t, bloom, BLOOM));
  const isWhite = t >= bloom + BLOOM;
  const look = E.out(prog(t, bloom, 10));
  const scr = projectBox(pose, {x0: 0, y0: 0, x1: 1, y1: 1});
  const rim = lerp(lerp(0.55, 1.2, E.out(prog(t, at + 8, 20))), 1, look);
  const wk = sp(t, kw - 3, 150, 15);
  const word = mtav('ქართულად');
  let fs = 140;
  const ww = textWidth(word, `700 ${fs}px ${F.sans}`);
  if (ww > 900) fs = Math.floor((fs * 900) / ww);
  const wordTop = 112 + 14 * push;
  return (
    <div style={{position: 'absolute', inset: 0, background: isWhite ? C.surface : '#000', overflow: 'hidden'}}>
      {!isWhite && burst > 0 ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(ellipse ${(((scr.w + 5200 * burst) / 2) * Math.SQRT2).toFixed(1)}px ${(((scr.h + 5200 * burst) / 2) * Math.SQRT2).toFixed(1)}px at ${(scr.x + scr.w / 2).toFixed(1)}px ${(scr.y + scr.h / 2).toFixed(1)}px, ${C.surface} 0%, ${C.surface} ${lerp(8, 62, burst)}%, rgba(255,255,255,0) ${lerp(40, 71, burst)}%)`,
            opacity: clamp(burst * 3),
          }}
        />
      ) : null}
      {r > 0.001 ? <Phone3 src={NAV} pose={pose} on={1} look={look} rim={rim} shadow={look} bar="patch" /> : null}
      {wk > 0.001 ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: wordTop, textAlign: 'center', fontFamily: F.sans, fontWeight: 700, fontSize: fs, lineHeight: 1, color: INK, whiteSpace: 'nowrap', opacity: clamp(wk * 1.6), transform: `translateY(${((1 - clamp(wk)) * 40).toFixed(1)}px) scale(${lerp(1.18, 1, clamp(wk)).toFixed(4)})`}}>
          {word}
        </div>
      ) : null}
    </div>
  );
};

export const SHOTS: Record<string, React.FC> = {reveal: Reveal};
