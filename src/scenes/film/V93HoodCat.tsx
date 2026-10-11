// src/scenes/film/V93HoodCat.tsx: v93-hood-cat's own picture. A winter night in a mountain village: a parked SUV in
// the falling snow, warm haze still rising off its bonnet. A grey cat pads along the snow, stops, and on the key moment
// leaps up into the front wheel arch and is gone; the car gives a tiny bounce, and two eyes light up in the dark gap
// above the tyre while the punch word lands. Everything from the kit (Backdrop, Car, Snow, Shadow) and one drawn cat.
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, lead, Sfx} from '../common';
import {C, L, type Tone} from '../../tokens';
import {ease, prog} from '../../lib/anim';
import {CameraLayer, Hud} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import type {SceneCtx} from '../../types';
import {Car} from '../illo/car';
import {Backdrop} from '../illo/backdrop';
import {Snow} from '../illo/fx';
import {dark, tone} from '../illo/palette';
import {FOOT, IlloBand, Svg, timeOf} from '../illo/scene';
import {Shadow, Solid, ell, circ, poly} from '../illo/solid';

type P = {
  look?: 'illustrated' | 'diagram';
  hitAt?: number | string; // the cat vanishes into the arch: the camera kicks, the word lands
  line?: string; // the punch, "*word*"
  tone?: Tone;
  time?: 'day' | 'night' | 'dusk';
};

const GROUND = 1270;
const CAR_X = 500;
const LEN = 960;
// the front wheel of a 780 px SUV facing right (car units: wheel at 800 of 1000, tyre radius 94, arch 110)
const K = LEN / 1000;
const WX = CAR_X + (800 - 500) * K;
const WY = GROUND - 94 * K;
const ARCH = 110 * K;

/** One grey cat facing left, its feet at (0, 0), in its own units (about 120 long): a walk cycle by `step`. */
const Cat: React.FC<{uid: string; step: number; time: 'day' | 'night' | 'dusk'; tuck: number}> = ({uid, step, time, tuck}) => {
  const sw = Math.sin(step) * 9 * (1 - tuck);
  const sw2 = Math.sin(step + Math.PI) * 9 * (1 - tuck);
  const leg = (x: number, s: number) => `M${x} -30 L${(x + s).toFixed(1)} ${(-2 - 10 * tuck).toFixed(1)}`;
  const fur = tone(dark(time) ? 2.2 : 3);
  const furD = tone(dark(time) ? 3.4 : 4.2);
  return (
    <g>
      <path d={`M40 -40 C62 -46 70 -70 ${(58 + 6 * Math.sin(step / 2)).toFixed(1)} -92`} fill="none" stroke={furD} strokeWidth={8} strokeLinecap="round" />
      <g stroke={furD} strokeWidth={9} strokeLinecap="round">
        <path d={leg(26, sw2)} />
        <path d={leg(-22, sw)} />
      </g>
      <Solid uid={uid} d={ell(2, -40, 46, 20)} tone={dark(time) ? 2 : 3} rim time={time} />
      <g stroke={fur} strokeWidth={10} strokeLinecap="round">
        <path d={leg(32, sw)} />
        <path d={leg(-28, sw2)} />
      </g>
      <Solid uid={uid} d={circ(-44, -58, 18)} tone={dark(time) ? 2 : 3} rim time={time} />
      <path d={poly([[-58, -66], [-56, -86], [-46, -72]])} fill={fur} />
      <path d={poly([[-40, -73], [-32, -88], [-29, -68]])} fill={fur} />
      <circle cx={-52} cy={-60} r={2.6} fill={tone(6.5)} />
    </g>
  );
};

export const V93HoodCat: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const uid = useId();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 14, cueFrame(ctx, p.hitAt ?? 1));
  const time = timeOf({time: p.time ?? 'night'});
  const night = dark(time);
  // the walk: from the right edge to just in front of the wheel, then a leap into the arch that ends on the hit
  const leapFrom = hit - 10;
  const walk = prog(frame, Math.min(e, 0), Math.max(8, leapFrom - Math.min(e, 0)), ease.drift);
  const leap = prog(frame, leapFrom, 10, ease.enter);
  const sx = 1000 - (1000 - (WX + 60)) * walk;
  const tx = sx + (WX + 18 - sx) * leap;
  const ty = GROUND + 34 - (ARCH + 64) * Math.sin(leap * Math.PI * 0.62) - 40 * leap;
  const catK = 1 - 0.45 * leap;
  const catA = 1 - prog(frame, hit - 3, 4);
  // the car's small answer, and the eyes in the arch after it
  const since = frame - hit;
  const bob = since > 0 ? 4 * Math.exp(-since / 7) * Math.sin(since / 1.8) : 0;
  const eyes = prog(frame, hit + 8, 6) * (Math.floor((frame - hit) / 50) % 3 === 2 && (frame - hit) % 50 < 4 ? 0.1 : 1);
  const ex = WX + Math.sin(0.62) * (ARCH - 6);
  const ey = WY - Math.cos(0.62) * (ARCH - 6);
  const snow = night ? tone(4.6) : tone(1);
  const snowTop = night ? tone(3.8) : tone(0.4);
  const ink = night ? C.il0 : C.ink;
  return (
    <IlloBand uid={uid} time={time}>
      <CameraLayer depth={0.6}>
        <Svg>
          <Backdrop kind="mountains" uid={uid} frame={frame} time={time} base={GROUND - 30} drift={0} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          <rect x={-200} y={GROUND - 18} width={1480} height={FOOT - GROUND + 18} fill={snow} />
          <rect x={-200} y={GROUND - 18} width={1480} height={6} fill={snowTop} />
          <Shadow uid={uid} cx={CAR_X} cy={GROUND + 2} rx={380} ry={18} />
          {/* warm haze off the bonnet: three thin wavering lines, the one warm spot in the snow */}
          <g fill="none" stroke={night ? tone(2.6) : tone(3)} strokeWidth={2.2} strokeLinecap="round" opacity={0.55}>
            {[0, 1, 2].map((i) => {
              const x0 = WX - 30 + i * 34;
              const ph = frame / 9 + i * 2.1;
              const y0 = GROUND - 250 * K - 18;
              return <path key={i} d={`M${x0} ${y0} C${(x0 + 10 * Math.sin(ph)).toFixed(1)} ${y0 - 30} ${(x0 - 10 * Math.sin(ph + 1)).toFixed(1)} ${y0 - 60} ${(x0 + 6 * Math.sin(ph + 2)).toFixed(1)} ${y0 - 92}`} />;
            })}
          </g>
          <Car uid={uid} x={CAR_X} y={GROUND} len={LEN} body="suv" paint={2} frame={frame} time={time} bob={bob} />
          {/* the eyes in the arch's dark gap, after the cat has gone in */}
          {eyes > 0 ? (
            <g opacity={eyes}>
              <circle cx={ex - 11} cy={ey} r={22} fill={tone(0)} opacity={0.16} />
              <circle cx={ex + 11} cy={ey + 4} r={22} fill={tone(0)} opacity={0.16} />
              <ellipse cx={ex - 11} cy={ey} rx={7.5} ry={5.2} fill={tone(0)} />
              <ellipse cx={ex + 11} cy={ey + 4} rx={7.5} ry={5.2} fill={tone(0)} />
            </g>
          ) : null}
          {catA > 0 ? (
            <g opacity={catA} transform={`translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${(1.9 * catK).toFixed(3)}) rotate(${(-28 * leap).toFixed(1)})`}>
              <Cat uid={uid} step={frame / 3.2} time={time} tuck={leap} />
            </g>
          ) : null}
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1.3}>
        <Svg>
          <Snow frame={frame} time={time} n={60} speed={0.8} wind={0.3} />
        </Svg>
      </CameraLayer>
      <Hud>
        <div style={{position: 'absolute', left: L.camSafe.left, top: 500, whiteSpace: 'nowrap'}}>
          <Words text={p.line ?? '*?*'} at={hit} fx="slam" size={104} color={ink} punchTone={p.tone ?? 'down'} />
        </div>
      </Hud>
      <Sfx name="asmr-pop" at={Math.max(base, hit - 1)} volume={0.32} />
      <Haptic kind="light" at={Math.max(base, hit)} volume={0.26} />
    </IlloBand>
  );
};
