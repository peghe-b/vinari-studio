// V141SkyHorse: the black horse's road from the sky to the track (v141, the stories category: Ferrari's horse).
// One picture world, five moments (the spec's "shot"):
//   sky    a 1910s biplane crossing a pale sky between drifting cloud banks, a small black horse on its flank; on
//          hitAt it banks and the punch word lands
//   tally  the same plane smaller, 34 marks closing a ring round it one by one, the last one landing on hitAt
//   dusk   the sky after: no plane, only a long trail thinning out over the hills, the light going (a calm line)
//   flag   a country road at a finish: a chequered banner over the road, dust settling, the banner dropping on hitAt
//   leap   the plane above, a modern racer on the road below; on hitAt the small horse leaves the plane, arcs down and
//          lands on the car's flank (the horse stays small: the plane and the car are the subjects, never the badge)
// Full bleed ("look": "illustrated"): the sky runs to the frame's top, the hills and the grass to its foot; the subtitle
// band (stage 1380 down) holds only grass. Plane and car stay whole inside WHOLE_STAGE.
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, PictureBand, Sfx} from '../common';
import {accentsOn, C, L} from '../../tokens';
import {ease, prog, spr} from '../../lib/anim';
import {CameraLayer, Hud, useKick} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import {OBJ} from '../../lib/layer';
import type {SceneCtx} from '../../types';
import {Car} from '../illo/car';
import {acc, accRamp, tone} from '../illo/palette';
import {Svg, TOP, FOOT} from '../illo/scene';

type P = {
  look?: 'illustrated' | 'diagram';
  shot?: 'sky' | 'close' | 'climb' | 'bank' | 'tally' | 'dusk' | 'flag' | 'road' | 'leap' | 'land';
  hitAt?: number | string;
  line?: string;
};

const HORIZON = 1180;

/** a small prancing horse, drawn in a 100 box centred on 0,0 */
const Horse: React.FC<{x: number; y: number; s: number; rot?: number; color: string; opacity?: number}> = ({x, y, s, rot = 0, color, opacity = 1}) => (
  <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(2)}) scale(${(s / 100).toFixed(4)})`} opacity={opacity}>
    <ellipse cx={-2} cy={8} rx={26} ry={13} transform="rotate(-32 -2 8)" fill={color} />
    <path d="M10 -6 L22 -34 L30 -40 L40 -36 L38 -30 L30 -28 L22 -4 Z" fill={color} />
    <path d="M24 -36 L28 -46 L32 -38 Z" fill={color} />
    <g stroke={color} strokeWidth={6} strokeLinecap="round" fill="none">
      <path d="M14 -2 L30 -10 L36 -22" />
      <path d="M10 2 L24 4 L34 -6" />
      <path d="M-16 22 L-22 40 L-14 46" />
      <path d="M-24 16 L-34 34 L-30 46" />
      <path d="M-24 6 Q-40 2 -44 18 Q-46 30 -38 36" />
    </g>
  </g>
);

/** a 1910s biplane in side view facing right, about 520 long at s = 1, centred on its fuselage */
const Plane: React.FC<{x: number; y: number; s: number; rot?: number; frame: number; horse?: number}> = ({x, y, s, rot = 0, frame, horse = 1}) => {
  const on = accentsOn();
  const body = on ? accRamp(acc('a'), 3.4) : tone(5);
  const bodyLit = on ? accRamp(acc('a'), 2.2) : tone(4);
  const wing = tone(3.2);
  const wingDark = tone(4.6);
  const ink = tone(6.6);
  const prop = 0.5 + 0.5 * Math.sin(frame * 1.7);
  return (
    <g className={OBJ} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(2)}) scale(${s.toFixed(4)})`}>
      <rect x={-262} y={-8} width={92} height={12} rx={6} fill={wingDark} />
      <path d="M-226 -16 L-246 -78 Q-240 -86 -226 -84 L-196 -78 L-186 -20 Z" fill={body} />
      <path d="M232 -24 Q258 0 232 24 L40 28 L-236 8 L-250 -6 L-236 -18 L40 -30 Z" fill={body} />
      <path d="M232 -24 Q246 -12 240 -2 L40 -10 L-236 -10 L-236 -18 L40 -30 Z" fill={bodyLit} opacity={0.8} />
      <rect x={196} y={-28} width={46} height={56} rx={14} fill={ink} />
      <path d="M70 -30 Q90 -50 116 -30 Z" fill={ink} />
      <rect x={-52} y={22} width={214} height={16} rx={8} fill={wingDark} />
      <g stroke={ink} strokeWidth={7} strokeLinecap="round">
        <line x1={4} y1={-108} x2={-6} y2={24} />
        <line x1={140} y1={-108} x2={128} y2={24} />
        <line x1={70} y1={30} x2={46} y2={92} />
        <line x1={120} y1={30} x2={66} y2={92} />
      </g>
      <rect x={-64} y={-124} width={250} height={18} rx={9} fill={wing} />
      <rect x={-64} y={-112} width={250} height={6} rx={3} fill={wingDark} opacity={0.6} />
      <circle cx={56} cy={96} r={26} fill={ink} />
      <circle cx={56} cy={96} r={10} fill={tone(2)} />
      <ellipse cx={256} cy={0} rx={9} ry={74} fill={ink} opacity={0.18 + 0.12 * prop} />
      <circle cx={252} cy={0} r={9} fill={ink} />
      <rect x={-104} y={-22} width={58} height={44} rx={10} fill={tone(0.4)} opacity={horse} />
      <Horse x={-75} y={0} s={46} color={tone(7)} opacity={horse} />
    </g>
  );
};

/** soft cloud banks: rounded capsules, lighter than the sky's edge on paper, a step up on the black film */
const Clouds: React.FC<{frame: number; y: number; k: number; seed: number; n?: number; fill: string; drift: number}> = ({frame, y, k, seed, n = 4, fill, drift}) => (
  <g>
    {Array.from({length: n}, (_, i) => {
      const w = 260 + ((seed * 97 + i * 151) % 220) * k;
      const x = ((seed * 211 + i * 337 + frame * drift) % 1500) - 260;
      const yy = y + ((seed * 53 + i * 89) % 160) - 80;
      const h = 54 + (i % 3) * 16;
      return (
        <g key={i}>
          <rect x={x} y={yy} width={w} height={h} rx={h / 2} fill={fill} />
          <rect x={x + w * 0.22} y={yy - h * 0.55} width={w * 0.46} height={h} rx={h / 2} fill={fill} />
        </g>
      );
    })}
  </g>
);

const Hills: React.FC<{time: 'day' | 'dusk'}> = ({time}) => {
  const farC = time === 'dusk' ? tone(5.4) : tone(1.6);
  const nearC = time === 'dusk' ? tone(6.2) : tone(2.3);
  const grass = time === 'dusk' ? tone(6.8) : tone(1.1);
  return (
    <g>
      <path d={`M-200 ${HORIZON} Q160 ${HORIZON - 90} 420 ${HORIZON - 30} T900 ${HORIZON - 60} T1300 ${HORIZON - 20} L1300 ${FOOT} L-200 ${FOOT} Z`} fill={farC} />
      <path d={`M-200 ${HORIZON + 70} Q300 ${HORIZON + 10} 640 ${HORIZON + 60} T1300 ${HORIZON + 40} L1300 ${FOOT} L-200 ${FOOT} Z`} fill={nearC} />
      <rect x={-200} y={HORIZON + 150} width={1500} height={FOOT - HORIZON - 150} fill={grass} />
    </g>
  );
};

const Sky: React.FC<{time: 'day' | 'dusk'}> = ({time}) => (
  <rect x={-200} y={TOP} width={1500} height={FOOT - TOP} fill={time === 'dusk' ? tone(4.6) : C.bg} />
);

export const V141SkyHorse: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 12, cueFrame(ctx, p.hitAt ?? 1));
  const kick = useKick();
  const shot = p.shot ?? 'sky';
  const time = shot === 'dusk' ? 'dusk' : 'day';
  const t = frame - e;
  const cloudFar = time === 'dusk' ? tone(5.2) : tone(0.9);
  const cloudNear = time === 'dusk' ? tone(5.8) : tone(1.3);
  const wordColor = time === 'dusk' ? tone(0) : C.ink;

  let subject: React.ReactNode = null;
  if (shot === 'sky') {
    const x = 400 + 2.2 * t;
    const bank = -9 * spr(frame, hit, 'land');
    subject = <Plane x={Math.min(700, x)} y={760 + 10 * Math.sin(t / 20)} s={1.05} rot={bank} frame={frame} />;
  } else if (shot === 'close') {
    // the plane close, nearly filling the width, the horse on its flank readable; a slow climb, a bump on hitAt
    const bump = spr(frame, hit, 'land');
    subject = <Plane x={Math.min(560, 520 + 0.4 * t)} y={800 - 0.5 * t - 14 * bump} s={1.58} rot={-2 - 3 * bump + 1.2 * Math.sin(t / 18)} frame={frame} />;
  } else if (shot === 'tally') {
    const n = 34;
    const done = Math.max(e + 6, hit);
    const shown = Math.min(n, Math.floor(n * prog(frame, e + 2, done - e - 2, ease.camera)) + (frame >= done ? n : 0));
    const cx = 540;
    const cy = 820;
    subject = (
      <g>
        <g className={OBJ}>
          {Array.from({length: n}, (_, i) => {
            const a = (i / n) * Math.PI * 2 - Math.PI / 2;
            const on = i < shown;
            const last = i === n - 1 && on ? 1 + 0.5 * kick : 1;
            return <circle key={i} cx={cx + Math.cos(a) * 360} cy={cy + Math.sin(a) * 360} r={(on ? 15 : 9) * last} fill={on ? (accentsOn() ? acc('a') : tone(6)) : tone(2)} />;
          })}
        </g>
        <Plane x={cx + 6 * Math.sin(t / 16)} y={cy + 8 * Math.sin(t / 22)} s={0.82} rot={-3 + 2 * Math.sin(t / 30)} frame={frame} />
      </g>
    );
  } else if (shot === 'dusk') {
    const draw = prog(frame, e, 70, ease.camera);
    const fade = 1 - 0.6 * prog(frame, hit, 50);
    subject = (
      <path
        d={`M-40 ${700} Q400 ${560} 760 ${640} T1180 ${520}`}
        fill="none"
        stroke={tone(1.2)}
        strokeWidth={8}
        strokeLinecap="round"
        strokeDasharray="1700"
        strokeDashoffset={(1700 * (1 - draw)).toFixed(1)}
        opacity={0.75 * fade}
      />
    );
  } else if (shot === 'flag') {
    const drop = spr(frame, hit, 'land');
    const sq = 46;
    const cols = 14;
    const by = 560;
    subject = (
      <g>
        <path d={`M500 ${HORIZON - 10} L580 ${HORIZON - 10} L840 1330 L240 1330 Z`} fill={tone(2.8)} />
        <rect x={180} y={1300} width={720} height={40} fill={tone(1.1)} />
        <g stroke={tone(6)} strokeWidth={10} strokeLinecap="round">
          <line x1={196} y1={by - 30} x2={196} y2={1150} />
          <line x1={884} y1={by - 30} x2={884} y2={1150} />
        </g>
        <g className={OBJ} transform={`translate(0 ${(drop * 120).toFixed(1)}) rotate(${(drop * 4).toFixed(2)} 540 ${by})`}>
          {Array.from({length: cols * 2}, (_, i) => {
            const c = i % cols;
            const r = Math.floor(i / cols);
            const wave = 10 * Math.sin(t / 7 + c * 0.7);
            return <rect key={i} x={218 + c * sq} y={by + r * sq + wave} width={sq + 1} height={sq + 1} fill={(c + r) % 2 === 0 ? tone(7) : tone(0)} />;
          })}
        </g>
        {Array.from({length: 7}, (_, i) => {
          const life = prog(frame, e + i * 6, 80);
          return <circle key={i} cx={420 + i * 40 + 30 * life} cy={1210 - 40 * life} r={30 + 40 * life} fill={tone(1.8)} opacity={0.5 * (1 - life)} />;
        })}
      </g>
    );
  } else if (shot === 'climb') {
    // seen from below and behind: the plane climbs away, nose up, into the light
    const up = prog(frame, e, 80, ease.camera);
    const turn = spr(frame, hit, 'land');
    subject = <Plane x={480 + 80 * up} y={960 - 260 * up} s={0.95 - 0.2 * up} rot={-17 - 6 * turn} frame={frame} />;
  } else if (shot === 'bank') {
    // a hard bank across the frame, the clouds tilting with it
    const roll = spr(frame, hit, 'land');
    subject = <Plane x={Math.min(600, 470 + 0.9 * t)} y={820 + 20 * roll} s={1.1} rot={6 - 24 * roll} frame={frame} />;
  } else {
    // road | leap | land: the racer on the road; leap: the horse leaves the plane and lands on the car's flank; land: it
    // is already there and the plane is small and far, leaving
    const carX = shot === 'road' ? Math.min(600, 430 + 1.6 * t) : 560;
    const carY = 1230;
    const px = shot === 'land' ? Math.min(860, 700 + 1.2 * t) : Math.min(640, 380 + 1.1 * t);
    const py = shot === 'land' ? 560 - 0.5 * t : 600;
    const ps = shot === 'land' ? 0.42 : 0.78;
    const u = shot === 'land' ? 1 : shot === 'road' ? 0 : prog(frame, hit - 22, 22, ease.camera);
    const sx = px - ps * 75;
    const sy = py;
    const tx = carX - 40;
    const ty = carY - 70;
    const hx = sx + (tx - sx) * u;
    const hy = sy + (ty - sy) * u - 260 * Math.sin(Math.PI * u);
    const landed = shot === 'land' || frame >= hit;
    subject = (
      <g>
        <rect x={-200} y={carY - 4} width={1500} height={34} fill={tone(2.8)} />
        {shot === 'road' ? null : <Plane x={px} y={py} s={ps} rot={-4} frame={frame} horse={u > 0 ? 0 : 1} />}
        <Car uid={`${uid}c`} x={carX} y={carY} len={620} view="side" body="racer" paint={accentsOn() ? 'a' : 3} frame={frame} speed={shot === 'road' ? 0.7 : 0.35} />
        {u > 0 ? <Horse x={hx} y={hy} s={46 + 18 * (landed ? 1 : u)} rot={(1 - u) * 20} color={tone(7)} /> : null}
      </g>
    );
  }

  return (
    <PictureBand camera={false}>
      <CameraLayer depth={0.6}>
        <Svg>
          <Sky time={time} />
          <Clouds frame={frame} y={520} k={1} seed={3} fill={cloudFar} drift={0.4} />
          <Hills time={time} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>{subject}</Svg>
      </CameraLayer>
      <CameraLayer depth={1.3}>
        <Svg>
          {shot === 'leap' || shot === 'flag' || shot === 'road' || shot === 'land' ? null : <Clouds frame={frame} y={1020} k={1.4} seed={7} n={3} fill={cloudNear} drift={1.1} />}
        </Svg>
      </CameraLayer>
      <Hud>
        {p.line ? (
          <div style={{position: 'absolute', left: L.camSafe.left, top: 410, whiteSpace: 'nowrap'}}>
            <Words text={p.line} at={hit} fx="slam" size={84} color={wordColor} />
          </div>
        ) : null}
      </Hud>
      <Sfx name={shot === 'tally' ? 'asmr-count-roll-long' : 'asmr-air-long'} at={Math.max(base, e + 2)} volume={0.26} />
      {shot === 'dusk' ? null : <Land at={hit} />}
      {shot === 'dusk' ? null : <Haptic kind="rigid" at={hit + 2} volume={0.3} />}
    </PictureBand>
  );
};
