// ACT 2, the reveal (the owner, 2026-10-21: "the screen goes black and the phone does NOT rise from below: it comes in from
// the SIDE, big"): after the black beat, a big whole iPhone with VINARI's navigator slides in from the RIGHT, turning toward us
// as it comes, and settles with a soft overshoot and a slow camera push; a rim of light finds its titanium edge in the dark.
// On „ნავიგატორი" the white world opens out of its screen (a frame-sized radial layer, never a giant box: the diagnostics
// promo's torn-frame lesson) and the phone stays, big and whole, above the subtitle band. No text but the subtitle.
import React from 'react';
import {C} from '../tokens';
import {bodyBox, float, Phone3, projectBox, type Pose} from './kit/phone3d';
import {clamp, E, lerp, prog} from './lib';
import {useShot} from './kit/stage';

const NAV = '17-nav-drive';

/** the slide from the side: 0..1 over `dur` frames, a fast entry that decelerates all the way, a 2 % overshoot that eases back */
const slideIn = (t: number, at: number, dur = 24) => {
  if (t < at) return 0;
  const q = clamp((t - at) / dur);
  const base = 1 - (1 - q) ** 3.2;
  return base + 0.02 * Math.sin(Math.PI * clamp((t - at - dur * 0.7) / (dur * 0.7)));
};

export const Reveal: React.FC = () => {
  const {t, len, L} = useShot('reveal');
  const at = L('slide');
  const bloom = L('bloom');
  const r = slideIn(t, at + 1);
  const fl = float(t);
  const push = E.inOut(clamp((t - at - 20) / Math.max(1, len - at - 20)));
  const W0 = 560;
  const w = W0 * (1 + 0.05 * push);
  const x = lerp(1080 + 760, 540, r);
  let pose: Pose = {x, y: 0, w, yaw: lerp(-46, -9, Math.min(1, r)) + fl.roll * clamp(r), pitch: 3 + fl.pitch * clamp(r), roll: lerp(9, 0.6, Math.min(1, r))};
  const box = bodyBox({...pose, y: 0});
  const FOOT = 1368;
  pose = {...pose, y: FOOT - (box.y + box.h) + fl.bob * clamp(r)};
  const BLOOM = 22;
  const burst = E.sine(prog(t, bloom, BLOOM));
  const isWhite = t >= bloom + BLOOM;
  const look = E.out(prog(t, bloom, 10));
  const scr = projectBox(pose, {x0: 0, y0: 0, x1: 1, y1: 1});
  // the rim light finding the edge as it lands in the dark
  const rim = lerp(lerp(0.55, 1.2, E.out(prog(t, at + 8, 20))), 1, look);
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
    </div>
  );
};

export const SHOTS: Record<string, React.FC> = {reveal: Reveal};
