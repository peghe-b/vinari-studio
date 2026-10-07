// src/scenes/film/V86ChattyLawyer.tsx: the chatty lawyer behind the wheel (v86-chatty-lawyer, carinfo, the cruise
// control's family story). A close profile of a 2020s car on a dusk mountain road: the man at the wheel talks, a speech
// bubble slams out of his window, and as he talks the car sinks back (the nose dips, the brake light glows, the lane
// dashes slow down, the HUD gauge's needle falls); he falls silent to listen and the car surges again. The rocking IS
// the story: the thing that annoyed the passenger enough to invent a speed holder.
// Props: look ("illustrated"), hitAt (the first bubble, the camera kicks), slowAt / fastAt (the second talk and the
// listening, chunks or "1.2s"), bubble (the bubble's words, "*word*" punches), label (the gauge's mono label), cast, time.
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, MonoLabel, Sfx} from '../common';
import {C, L, rgba, toneLine} from '../../tokens';
import {spr} from '../../lib/anim';
import {CameraLayer, Hud, useKick} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import {TXT} from '../../lib/layer';
import type {SceneCtx} from '../../types';
import {Figure, type Cast} from '../illo/figure';
import {Car} from '../illo/car';
import {Backdrop} from '../illo/backdrop';
import {SpeedLines} from '../illo/fx';
import {dark, mix} from '../illo/palette';
import {roadTones} from '../illo/road';
import {FOOT, IlloBand, Svg, timeOf} from '../illo/scene';
import {rr, Shadow} from '../illo/solid';

type P = {
  look?: 'illustrated' | 'diagram';
  hitAt?: number | string;
  slowAt?: number | string;
  fastAt?: number | string;
  bubble?: string;
  label?: string;
  cast?: Cast;
  time?: 'day' | 'night' | 'dusk';
};

const GROUND = 1150; // the car's ground point (stage y)
const ROAD_TOP = 1050;
const CAR_X = 560;
const LEN = 1240; // a close profile: the car nearly fills the frame
const PX = 30; // stage px a frame at full speed
const CRUISE = 0.85;
const CRAWL = 0.32;

/** The speed at every frame up to `f` (a smooth chase of the target: talking slows, listening speeds up), with the
 *  distance rolled and how hard it is slowing right now. Deterministic: a plain loop over the frames. */
const motion = (f: number, talk: (n: number) => boolean) => {
  let v = CRUISE;
  let d = 0;
  let decel = 0;
  for (let n = 0; n <= f; n++) {
    const target = talk(n) ? CRAWL : CRUISE;
    const k = target < v ? 0.07 : 0.05;
    const nv = v + (target - v) * k;
    decel = Math.max(0, v - nv);
    v = nv;
    d += v * PX;
  }
  return {v, d, decel};
};

export const V86ChattyLawyer: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const uid = useId();
  const e = entrance(ctx);
  const base = lead(ctx);
  const time = timeOf({time: p.time ?? 'dusk'});
  const dk = dark(time);
  const kick = useKick();
  const hit = Math.max(base + 10, cueFrame(ctx, p.hitAt ?? 1));
  const listen1 = Math.max(hit + 20, cueFrame(ctx, 2));
  const slow = Math.max(listen1 + 12, cueFrame(ctx, p.slowAt ?? 3));
  const fast = Math.max(slow + 16, cueFrame(ctx, p.fastAt ?? 4));
  const windows: [number, number][] = [
    [hit, listen1],
    [slow, fast],
  ];
  const talk = (n: number) => windows.some(([a, b]) => n >= a && n < b);
  const {v, d, decel} = motion(frame, talk);
  const talking = talk(frame);
  const brake = Math.min(1, decel * 60);
  const dive = Math.min(2.2, decel * 120);
  const rt = roadTones(time);

  // the lane dashes and the near verge, streaming with the distance rolled
  const dashOff = d % 260;
  let dashes = '';
  for (let x = -dashOff - 260; x < 1360; x += 260) dashes += rr(x, 1300, 130, 14, 7);
  const nearOff = (d * 1.5) % 900;
  let posts = '';
  for (let i = -1; i < 3; i++) posts += rr(i * 900 - nearOff + 620, 1310, 24, 80, 7);

  // the lawyer: his mouth runs while he talks, he turns to listen
  const face = talking ? (Math.floor(frame / 5) % 2 ? 'laugh' : 'grin') : frame < hit ? 'smile' : 'neutral';
  const cast: Cast = p.cast ?? {is: 'man', outfit: 'suit', hair: 'side', glasses: 'rect', beard: 'none', extras: ['tie']};

  // the HUD gauge: no numbers, the needle follows the speed
  const gx = L.camSafe.left + 120;
  const gy = 560;
  const gr = 110;
  const ang = (-110 + 220 * ((v - 0.2) / 0.75)) * (Math.PI / 180);
  const gaugeIn = spr(frame, e, 'enter');
  const needleTone = talking ? toneLine('down') : C.ink;

  return (
    <IlloBand uid={uid} time={time}>
      {/* far: the mountains at dusk, scrolling slower than the road */}
      <CameraLayer depth={0.6}>
        <Svg>
          <Backdrop kind="mountains" uid={uid} frame={frame} time={time} scroll={d * 0.5} base={ROAD_TOP} drift={0} />
        </Svg>
      </CameraLayer>
      {/* the subject: the road, the car, the man at the wheel */}
      <CameraLayer depth={1}>
        <Svg>
          <rect x={-200} y={ROAD_TOP - 6} width={1480} height={10} fill={rt.post} opacity={0.6} />
          <rect x={-200} y={ROAD_TOP} width={1480} height={FOOT - ROAD_TOP} fill={rt.asphalt} />
          <path d={dashes} fill={rt.line} />
          <Shadow uid={uid} cx={CAR_X} cy={GROUND + 4} rx={LEN * 0.48} ry={20} k={1} />
          <Car
            uid={uid}
            x={CAR_X}
            y={GROUND}
            len={LEN}
            body="sedan"
            paint={2}
            frame={frame}
            roll={d}
            speed={v}
            pitch={dive}
            time={time}
            lights={{head: 1, tail: dk ? 1 : 0.6, brake}}
            cabin={(b) => <Figure uid={uid} cast={cast} x={b.x + b.w * 0.6} y={b.y + b.h * 0.56} size={b.h * 6.4} crop="head" turn={talking ? 0.6 : 0.95} face={face} frame={frame} time={time} />}
          />
          {v > 0.6 ? <SpeedLines frame={frame} seed={86} n={9} box={{x: 0, y: 760, w: 1080, h: 360}} speed={v * 1.3} time={time} opacity={0.4 * Math.min(1, (v - 0.6) / 0.2)} /> : null}
        </Svg>
      </CameraLayer>
      {/* near: reflector posts racing past, the verge past the frame's foot */}
      <CameraLayer depth={1.3}>
        <Svg>
          <path d={posts} fill={mix(dk ? C.il7 : C.il2, dk ? '#000000' : C.il3, 0.4)} />
        </Svg>
      </CameraLayer>
      {/* the speech bubble out of his window: slams in each time he starts talking */}
      <CameraLayer depth={1}>
        {windows.map(([a, b], i) => {
          const s = spr(frame, a, 'land');
          const out = spr(frame, b, 'enter');
          const k = Math.max(0, s - out);
          if (frame < a || k <= 0.01) return null;
          return (
            <div key={i} style={{position: 'absolute', left: 300 + i * 70, top: 600 - i * 30, transform: `scale(${(0.6 + 0.4 * k + 0.05 * kick).toFixed(4)})`, transformOrigin: '30% 100%', opacity: Math.min(1, k * 1.4)}}>
              <div style={{position: 'relative', padding: '22px 40px 26px', borderRadius: 48, backgroundColor: C.surface, boxShadow: `0 10px 30px ${rgba(C.ink, 0.18)}`}}>
                <Words text={p.bubble ?? 'ბლა ბლა *ბლა*'} at={a} fx="slam" size={64} punchTone="down" sound={i === 0} />
                <div style={{position: 'absolute', left: 70, bottom: -26, width: 0, height: 0, borderLeft: '22px solid transparent', borderRight: '22px solid transparent', borderTop: `30px solid ${C.surface}`}} />
              </div>
            </div>
          );
        })}
      </CameraLayer>
      {/* the HUD: a speed gauge with no numbers, its needle falling while he talks */}
      <Hud>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: gaugeIn}}>
          <path d={`M${gx + gr * Math.sin((-110 * Math.PI) / 180)} ${gy - gr * Math.cos((-110 * Math.PI) / 180)} A${gr} ${gr} 0 1 1 ${gx + gr * Math.sin((110 * Math.PI) / 180)} ${gy - gr * Math.cos((110 * Math.PI) / 180)}`} fill="none" stroke={rgba(C.ink, 0.35)} strokeWidth={6} strokeLinecap="round" />
          <line x1={gx} y1={gy} x2={gx + Math.sin(ang) * (gr - 18)} y2={gy - Math.cos(ang) * (gr - 18)} stroke={needleTone} strokeWidth={6} strokeLinecap="round" />
          <circle cx={gx} cy={gy} r={11} fill={C.ink} />
        </svg>
        <div className={TXT} style={{position: 'absolute', left: gx - gr, top: gy + 40}}>
          <MonoLabel text={p.label ?? 'სიჩქარე'} at={Math.max(base, e + 4)} />
        </div>
      </Hud>
      <Sfx name="asmr-whoomp" at={Math.max(base, slow + 2)} volume={0.26} />
      <Land at={hit} />
      <Haptic kind="rigid" at={hit + 2} volume={0.3} />
    </IlloBand>
  );
};
