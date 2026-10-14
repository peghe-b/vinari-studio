// v106-supra-toast: a Georgian supra at night. The tamada stands with his glass, the guests raise theirs and laugh, one
// friend takes out his phone and slips out to the car, and at the end the glasses meet in a close-up clink. One file,
// several shots (the spec's "shot"): toast | table | laugh | phone | car | raise | clink. LOOK "illustrated": full bleed.
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, Sfx} from '../common';
import {C, rgba} from '../../tokens';
import {ease, prog, spr} from '../../lib/anim';
import {CameraLayer} from '../../lib/camera';
import type {SceneCtx} from '../../types';
import {Figure, Hand, type Cast} from '../illo/figure';
import {Car} from '../illo/car';
import {Backdrop} from '../illo/backdrop';
import {Halo, Sparks} from '../illo/fx';
import {acc} from '../illo/palette';
import {FOOT, IlloBand, osc, Svg, TOP, timeOf} from '../illo/scene';
import {Glint, Shadow} from '../illo/solid';

type Shot = 'toast' | 'table' | 'laugh' | 'phone' | 'car' | 'raise' | 'clink';
type P = {
  look?: 'illustrated' | 'diagram';
  shot?: Shot;
  hitAt?: number | string;
  time?: 'day' | 'night' | 'dusk';
  tamada?: Cast;
  levani?: Cast;
  guests?: Cast[];
};

const TABLE = 1190; // the tabletop's front edge (stage y)
// a raised glass sits in the hand of the "thumbsUp" pose: forward 0.14, up 0.726 of the standing height
const WX = 0.14;
const WY = 0.726;

/** A wine glass: bowl centre at (x, y), s = the bowl's width in px; the wine in the film's accent. */
const Glass: React.FC<{x: number; y: number; s: number; tilt?: number; wine?: number; opacity?: number}> = ({x, y, s, tilt = 0, wine = 1, opacity = 1}) => {
  const lvl = -0.1 + (1 - wine) * 0.45;
  return (
    <g opacity={opacity} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${tilt.toFixed(2)}) scale(${s.toFixed(2)})`}>
      <path d={`M-0.47 ${lvl.toFixed(3)} C-0.45 0.25 -0.28 0.47 0 0.47 C0.28 0.47 0.45 0.25 0.47 ${lvl.toFixed(3)} Z`} fill={acc('a')} opacity={0.92} />
      <path d="M-0.5 -0.62 C-0.5 0.2 -0.3 0.5 0 0.5 C0.3 0.5 0.5 0.2 0.5 -0.62 Z" fill={rgba(C.il0, 0.1)} stroke={C.il0} strokeOpacity={0.75} strokeWidth={0.025} />
      <path d="M-0.3 -0.45 C-0.32 -0.1 -0.25 0.15 -0.15 0.3" fill="none" stroke={C.il0} strokeOpacity={0.5} strokeWidth={0.03} strokeLinecap="round" />
      <rect x={-0.025} y={0.5} width={0.05} height={0.75} fill={C.il0} opacity={0.75} />
      <ellipse cx={0} cy={1.27} rx={0.33} ry={0.06} fill={C.il0} opacity={0.75} />
    </g>
  );
};

/** A dark bottle with a small gold label. */
const Bottle: React.FC<{x: number; y: number; h: number}> = ({x, y, h}) => {
  const w = h * 0.26;
  return (
    <g>
      <path d={`M${x - w / 2} ${y} V${y - h * 0.62} C${x - w / 2} ${y - h * 0.75} ${x - w * 0.16} ${y - h * 0.78} ${x - w * 0.16} ${y - h * 0.86} V${y - h} H${x + w * 0.16} V${y - h * 0.86} C${x + w * 0.16} ${y - h * 0.78} ${x + w / 2} ${y - h * 0.75} ${x + w / 2} ${y - h * 0.62} V${y} Z`} fill={C.il6} />
      <rect x={x - w / 2} y={y - h * 0.45} width={w} height={h * 0.2} fill={acc('b')} opacity={0.85} />
      <rect x={x - w * 0.32} y={y - h * 0.6} width={w * 0.1} height={h * 0.5} fill={C.il3} opacity={0.35} />
    </g>
  );
};

/** The table: a white cloth, plates, bread, bottles, a few glasses; drawn in front of the guests. */
const Table: React.FC<{uid: string; frame: number; shift?: number}> = ({uid, frame, shift = 0}) => (
  <g transform={`translate(${shift} 0)`}>
    <rect x={-300} y={TABLE - 46} width={1680} height={50} fill={C.il2} />
    <rect x={-300} y={TABLE + 2} width={1680} height={FOOT - TABLE} fill={C.il5} />
    <rect x={-300} y={TABLE + 2} width={1680} height={10} fill={C.il4} />
    {[-120, 140, 400, 660, 920, 1180].map((x, i) => (
      <path key={i} d={`M${x} ${TABLE + 12} C${x + 10} ${TABLE + 200} ${x - 14} ${TABLE + 420} ${x + 6} ${FOOT}`} fill="none" stroke={C.il6} strokeWidth={10} opacity={0.5} />
    ))}
    {[-80, 150, 380, 620, 860, 1100].map((x, i) => (
      <g key={i}>
        <ellipse cx={x} cy={TABLE - 22} rx={86} ry={16} fill={C.il1} />
        <ellipse cx={x} cy={TABLE - 24} rx={56} ry={9} fill={C.il3} opacity={0.6} />
      </g>
    ))}
    {[40, 500, 980].map((x, i) => (
      <path key={i} d={`M${x - 90} ${TABLE - 34} C${x - 50} ${TABLE - 64} ${x + 50} ${TABLE - 64} ${x + 90} ${TABLE - 34} C${x + 40} ${TABLE - 26} ${x - 40} ${TABLE - 26} ${x - 90} ${TABLE - 34} Z`} fill={C.il4} />
    ))}
    <Bottle x={265} y={TABLE - 30} h={190} />
    <Bottle x={745} y={TABLE - 30} h={210} />
    <Glass x={60} y={TABLE - 98} s={50} wine={0.7} />
    <Glass x={430} y={TABLE - 98} s={50} wine={0.5} />
    <Glass x={1010} y={TABLE - 98} s={50} wine={0.8} />
    <Shadow uid={uid} cx={540} cy={TABLE - 20} rx={700} ry={10} k={0.4} />
  </g>
);

/** The room behind and a pendant lamp over the table. */
const Room: React.FC<{uid: string; frame: number}> = ({uid, frame}) => (
  <CameraLayer depth={0.6}>
    <Svg>
      <rect x={-200} y={TOP} width={1480} height={FOOT - TOP} fill={C.il7} />
      <Backdrop kind="room" uid={uid} frame={frame} time="night" base={1180} drift={0} />
      <line x1={540} y1={TOP} x2={540} y2={470} stroke={C.il4} strokeWidth={3} />
      <Halo uid={uid} x={540} y={520} r={420} opacity={0.55} />
      <path d="M470 500 L610 500 L585 470 L495 470 Z" fill={C.il3} />
      <ellipse cx={540} cy={503} rx={52} ry={9} fill={C.il0} />
    </Svg>
  </CameraLayer>
);

const GUEST_X = [170, 360, 720, 905];

export const V106SupraToast: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const uid = useId();
  const e = entrance(ctx);
  const base = lead(ctx);
  const shot: Shot = p.shot ?? 'toast';
  const hit = Math.max(base + 8, cueFrame(ctx, p.hitAt ?? '0.4s'));
  const time = timeOf({time: p.time ?? 'night'});
  const tamada: Cast = p.tamada ?? {is: 'man', outfit: 'suit', hair: 'receding', beard: 'full', age: 'adult'};
  const levani: Cast = p.levani ?? {is: 'friend', outfit: 'turtleneck', hair: 'fade', beard: 'stubble'};
  const guests: Cast[] = p.guests ?? [{is: 'woman', outfit: 'dress', hair: 'bun'}, levani, {is: 'neighbour', outfit: 'shirt', hair: 'crop'}, {is: 'friend', look: 2, outfit: 'blazer', hair: 'side'}];
  const sounds = (
    <>
      <Sfx name="asmr-shimmer" at={hit} volume={0.3} />
      <Land at={hit} />
      <Haptic kind="light" at={hit + 1} volume={0.25} />
    </>
  );

  // a seated guest: the feet hidden under the cloth, the waist just above the tabletop
  const guest = (c: Cast, i: number, o: {face?: 'laugh' | 'smile' | 'neutral'; up?: boolean; bob?: number; raiseAt?: number}) => {
    const x = GUEST_X[+i];
    const left = x > 540;
    const size = 700;
    const y = TABLE + 330 + (o.bob ?? 0) * osc(frame, 11 + i, i * 1.7) * 8;
    const f = left ? -1 : 1;
    return (
      <g key={i}>
        <Figure uid={uid} cast={c} x={x} y={y} size={size} frame={frame} time={time} pose={o.up && o.raiseAt === undefined ? 'thumbsUp' : 'stand'} acts={o.up && o.raiseAt !== undefined ? [{at: o.raiseAt, pose: 'thumbsUp'}] : undefined} face={o.face ?? 'smile'} turn={0.8 * f} />
        {o.up ? <Glass x={x + f * WX * size} y={y - WY * size - 88} s={52} tilt={-6 * f} opacity={o.raiseAt === undefined ? 1 : prog(frame, o.raiseAt + 6, 8)} /> : null}
      </g>
    );
  };

  if (shot === 'car') {
    const G = 1320;
    const blink = Math.floor(frame / 9) % 2 === 0 ? 1 : 0.25;
    return (
      <IlloBand uid={uid} time={time}>
        <CameraLayer depth={0.6}>
          <Svg>
            <Backdrop kind="city" uid={uid} frame={frame} time={time} base={G} drift={0.1} />
          </Svg>
        </CameraLayer>
        <CameraLayer depth={1}>
          <Svg>
            <rect x={-200} y={G} width={1480} height={FOOT - G} fill={C.il6} />
            <Shadow uid={uid} cx={620} cy={G + 2} rx={420} ry={20} />
            <Car uid={uid} x={640} y={G} len={860} body="suv" paint="a" dir={-1} frame={frame} time={time} lights={{head: 0.4}} />
            <Shadow uid={uid} cx={250} cy={G + 2} rx={110} />
            <Figure uid={uid} cast={levani} x={250} y={G} size={640} frame={frame} time={time} pose="crouch" turn={0.8} />
            <Halo uid={uid} x={395} y={G - 150} r={60 + 30 * blink} opacity={0.6 * blink} />
            <circle cx={395} cy={G - 150} r={6} fill={acc('b')} opacity={blink} />
          </Svg>
        </CameraLayer>
        <Sfx name="asmr-knock" at={Math.max(base, hit)} volume={0.3} />
        <Haptic kind="light" at={Math.max(base, hit) + 1} volume={0.25} />
      </IlloBand>
    );
  }

  if (shot === 'clink') {
    const cx = 540;
    const cy = 800;
    const meet = spr(frame, Math.max(e, hit - 10), 'land');
    const bump = prog(frame, hit, 8, ease.out) * (1 - prog(frame, hit + 8, 14, ease.out));
    const hands = [
      {a: 180, ox: 0, oy: 1},
      {a: 148, ox: -1, oy: 0},
      {a: 212, ox: 1, oy: 0},
    ];
    return (
      <IlloBand uid={uid} time={time}>
        <CameraLayer depth={0.6}>
          <Svg>
            <rect x={-200} y={TOP} width={1480} height={FOOT - TOP} fill={C.il7} />
            <Halo uid={uid} x={cx} y={cy - 120} r={640} opacity={0.5} />
          </Svg>
        </CameraLayer>
        <CameraLayer depth={1}>
          <Svg>
            {hands.map((h, i) => {
              const far = 260 - 170 * meet + 18 * bump;
              const s = 170;
              const gx = cx + h.ox * (88 + far);
              const gy = cy + h.oy * 70;
              const fx = Math.sin((h.a * Math.PI) / 180);
              const fy = Math.cos((h.a * Math.PI) / 180);
              const sc = 15;
              const tilt = h.ox * (10 - 6 * meet);
              // the hand grips the stem, the glass stays nearly upright
              const grip: [number, number] = [gx - Math.sin((tilt * Math.PI) / 180) * 0.88 * s, gy + 0.88 * s];
              const wx = grip[0] - fx * 3.6 * sc;
              const wy = grip[1] - fy * 3.6 * sc;
              return (
                <g key={i}>
                  <Glass x={gx} y={gy} s={s} tilt={tilt} wine={0.75} />
                  <Hand uid={uid} kind="grip" x={wx} y={wy} angle={h.a} scale={sc} side={h.ox > 0 ? 'l' : 'r'} arm={40} sleeve={i === 1 ? 1 : 6} frame={frame} time={time} />
                </g>
              );
            })}
            <Sparks frame={frame} x={cx} y={cy - 60} at={hit} n={16} dir={-90} spread={80} power={0.8} tone="a" time={time} uid={uid} />
            <Glint x={cx} y={cy - 70} size={150} at={hit} frame={frame} />
          </Svg>
        </CameraLayer>
        {sounds}
      </IlloBand>
    );
  }

  if (shot === 'phone' || shot === 'raise') {
    const who = shot === 'phone' ? levani : tamada;
    const size = 1300;
    const hx = shot === 'phone' ? 500 : 380;
    const hy = 720;
    const fy = hy + 0.9 * size;
    const lift = spr(frame, e, 'enter');
    return (
      <IlloBand uid={uid} time={time}>
        <Room uid={uid} frame={frame} />
        <CameraLayer depth={1}>
          <Svg>
            {shot === 'phone' ? <Halo uid={uid} x={hx + 40} y={hy + 300} r={260} opacity={0.6} /> : null}
            <Figure uid={uid} cast={who} x={hx} y={fy} size={size} frame={frame} time={time} pose={shot === 'phone' ? 'phoneLook' : 'thumbsUp'} face="smile" turn={0.8} />
            {shot === 'raise' ? <Glass x={hx + WX * size} y={fy - WY * size - 170 - 40 * (1 - lift)} s={110} tilt={-5} /> : null}
            {shot === 'raise' ? <Glint x={hx + WX * size} y={fy - WY * size - 220} size={120} at={hit} frame={frame} /> : null}
          </Svg>
        </CameraLayer>
        {sounds}
      </IlloBand>
    );
  }

  // toast | table | laugh: the table, wide
  const standing = shot === 'toast';
  const tSize = 1000;
  const tX = 300;
  const tY = TABLE + 470;
  return (
    <IlloBand uid={uid} time={time}>
      <Room uid={uid} frame={frame} />
      <CameraLayer depth={1}>
        <Svg>
          {guests.map((c, i) =>
            standing && i < 2 ? null : guest(c, i, {face: shot === 'laugh' ? 'laugh' : 'smile', up: shot !== 'laugh', raiseAt: standing ? hit + 14 : undefined, bob: shot === 'laugh' ? 1 : 0}),
          )}
          {standing ? (
            <g>
              <Figure uid={uid} cast={tamada} x={tX} y={tY} size={tSize} frame={frame} time={time} pose="thumbsUp" face="smile" turn={0.8} />
              <Glass x={tX + WX * tSize} y={tY - WY * tSize - 120} s={74} tilt={-4} />
              <Glint x={tX + WX * tSize} y={tY - WY * tSize - 160} size={90} at={hit} frame={frame} />
            </g>
          ) : null}
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1.15}>
        <Svg>
          <Table uid={uid} frame={frame} />
        </Svg>
      </CameraLayer>
      {sounds}
    </IlloBand>
  );
};
