// MapPin's other grounds (the default "city", the tilted city turning around the car, lives in MapPin.tsx). The pin,
// its label, the caption and the sounds stay MapPin's own; a staging only draws what the pin lands on.
//   walk    the same city flat from straight above, north up, zoomed out: once the pin lands, a green dotted way
//           draws from the viewer's pulsing dot, along the streets, to the car
//   floors  a car park in section: slabs, columns and ramps, numbered floors at the left, the car on its floor
//           (`level`, default "-2"); the pin falls through the floors above onto its roof and the car's slab lights
import React from 'react';
import {ease, lerp, prog} from '../../lib/anim';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import {C, F, halo, isLight, L} from '../../tokens';
import type {SceneCtx} from '../../types';
import {Sfx} from '../common';
import {buildCity, CitySvg, PX, PY} from '../MapPin';

// ---- walk ------------------------------------------------------------------------------------------------------
const WALK_K = 0.62; // the plan's scale: a few blocks around the car
export const Walk: React.FC<{city: ReturnType<typeof buildCity>; frame: number; ctx: SceneCtx; rings: number[]; landed: boolean; since: number; landAt: number}> = ({city, frame, ctx, rings, landed, since, landAt}) => {
  const life = Math.min(1, Math.max(0, frame / Math.max(1, ctx.dur)));
  const k = WALK_K * (1.1 - 0.1 * prog(frame, 0, 24, ease.enter) - 0.05 * ease.camera(life));
  // the car's street is the wide one at x 70; the viewer stands two streets left and one street below the car
  const iv = city.vx.findIndex((l) => l.c === 70);
  const below = city.hy.filter((l) => l.c > 0);
  const you = {x: city.vx[Math.max(0, iv - 2)].c, y: (below[1] ?? below[0]).c};
  const lane = 118; // the car street's near lane
  const route = [
    [you.x, you.y],
    [lane, you.y],
    [lane, 0],
    [30, 0],
  ];
  const len = route.slice(1).reduce((s, [x, y], i) => s + Math.hypot(x - route[i][0], y - route[i][1]), 0);
  const draw = prog(frame, landAt + 8, 30, ease.drawOn);
  const pulse = (frame % 36) / 36;
  // the way as dots every 24 screen px, drawn on in order
  const dots: {x: number; y: number; s: number}[] = [];
  const gap = 24 / WALK_K;
  for (let i = 1, acc = 0; i < route.length; i++) {
    const [ax, ay] = route[i - 1];
    const [bx, by] = route[i];
    const seg = Math.hypot(bx - ax, by - ay);
    for (let u = (gap - (acc % gap)) % gap; u <= seg; u += gap) dots.push({x: ax + ((bx - ax) * u) / seg, y: ay + ((by - ay) * u) / seg, s: acc + u});
    acc += seg;
  }
  return (
    <>
      {/* map px around the car (CitySvg is its own svg, centred on the car), scaled by k about the car */}
      <div style={{position: 'absolute', inset: 0, transformOrigin: `${PX}px ${PY}px`, transform: `scale(${k})`}}>
          <CitySvg city={city} frame={frame} rings={rings} landed={landed} since={since} landAt={landAt}>
            {dots.filter((q) => q.s <= len * draw).map((q, i) => (
              <circle key={i} cx={q.x} cy={q.y} r={6 / WALK_K} fill={C.upLine} style={i % 4 ? undefined : {filter: `drop-shadow(0 0 5px ${halo(C.upLine, 0.6)})`}} />
            ))}
            <g transform={`translate(${you.x} ${you.y})`} opacity={prog(frame, 4, 10)}>
              <circle r={(22 + 40 * pulse) / WALK_K} fill="none" stroke={C.ink} strokeWidth={2 / WALK_K} opacity={0.6 * (1 - pulse)} />
              <circle r={16 / WALK_K} fill={C.ink} />
              <circle r={7 / WALK_K} fill={isLight() ? C.bg : C.shade} />
            </g>
          </CitySvg>
        
      </div>
      <Sfx name="asmr-pencil-long" at={landAt + 8} volume={0.2} len={30} /* event: the way back draws on (30 frames) */ />
    </>
  );
};

// ---- floors ----------------------------------------------------------------------------------------------------
export const FLOOR_PIN = -62; // the pin lands on the roof of the car standing on the slab at PY
const SLAB = 180; // floor to floor
const X0 = 170;
const X1 = 940;
const CAR_SIDE =
  'M -95 -14 Q -95 -26 -84 -28 L -52 -32 Q -30 -56 -6 -58 L 30 -58 Q 52 -56 70 -36 L 88 -32 Q 96 -30 96 -20 L 96 -10 Q 96 -4 90 -4 L -90 -4 Q -95 -4 -95 -14 Z';
const CarSide: React.FC<{x: number; y: number; op: number; flip?: boolean}> = ({x, y, op, flip}) => (
  <g transform={`translate(${x} ${y}) scale(${flip ? -1 : 1} 1)`} fill="none" stroke={C.ink} strokeWidth={2.4} strokeLinejoin="round" opacity={op}>
    <path d={CAR_SIDE} fill={C.bg} />
    <path d="M -40 -34 Q -22 -51 -4 -52 L 26 -52 Q 44 -50 58 -36 Z" strokeWidth={1.6} />
    <line x1={10} x2={10} y1={-52} y2={-34} strokeWidth={1.4} />
    <circle cx={-58} cy={-6} r={15} fill={C.bg} />
    <circle cx={58} cy={-6} r={15} fill={C.bg} />
    <circle cx={-58} cy={-6} r={5} strokeWidth={1.4} />
    <circle cx={58} cy={-6} r={5} strokeWidth={1.4} />
  </g>
);
const floorPush = (frame: number, ctx: SceneCtx) => 1 + 0.07 * ease.camera(Math.min(1, Math.max(0, frame / Math.max(1, ctx.dur))));
// The pin's label in a car park: on the car's own floor, level with its roof, in the clear bay between the car and
// the ramp (the bay's column stands at COL3, left of the label; the ramp runs past the label's right end). MapPin
// draws the label here (stage px, top left of the text, following the camera's push) instead of beside the pin head.
const COL3 = 660;
export const floorsLabel = (frame: number, ctx: SceneCtx) => {
  const push = floorPush(frame, ctx);
  // PY comes from MapPin, which imports this file: read it at call time, never at module load
  const label = {x: 676, y: PY - 52};
  return {x: PX + (label.x - PX) * push, y: PY + FLOOR_PIN + (label.y - PY - FLOOR_PIN) * push};
};
export const Floors: React.FC<{frame: number; ctx: SceneCtx; landed: boolean; landAt: number; dropAt: number; level?: string; bottom: number}> = ({frame, ctx, landed, landAt, level, bottom}) => {
  const push = floorPush(frame, ctx);
  const own = Number.parseInt(String(level ?? '-2'), 10);
  const known = Number.isFinite(own);
  // slabs from two floors above the car's to two below; the car's slab is at PY
  const rows = [-2, -1, 0, 1, 2].map((k) => ({y: PY + k * SLAB, n: known ? own - k : null}));
  const lit = landed ? prog(frame, landAt, 10) : 0;
  const drawn = (i: number) => prog(frame, 2 + i * 3, 16, ease.drawOn);
  const others = [
    {x: 300, y: PY - SLAB, flip: true},
    {x: 300, y: PY + SLAB, flip: false},
    {x: 770, y: PY + SLAB, flip: true},
  ];
  return (
    <div style={{position: 'absolute', inset: 0, clipPath: `inset(${L.graphicsTop}px 0 ${1920 - bottom}px 0)`}}>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${push})`, transformOrigin: `${PX}px ${PY + FLOOR_PIN}px`}}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          {rows.map((r, i) => {
            const t = drawn(i);
            const isOwn = r.y === PY;
            const ground = known && r.n === 0;
            return (
              <g key={i}>
                {/* the slab: two lines and a faint body; the ground floor's runs out to the street */}
                <rect x={ground ? 0 : X0} y={r.y} width={((ground ? 1080 : X1 - X0) as number) * t} height={16} fill={C.ink} opacity={0.06} />
                <line x1={ground ? 0 : X0} x2={lerp(ground ? 0 : X0, ground ? 1080 : X1, t)} y1={r.y} y2={r.y} stroke={C.ink} strokeWidth={2.4} opacity={0.85} />
                <line x1={ground ? 0 : X0} x2={lerp(ground ? 0 : X0, ground ? 1080 : X1, t)} y1={r.y + 16} y2={r.y + 16} stroke={C.ink} strokeWidth={1.2} opacity={0.4} />
                {isOwn ? <line x1={PX - 150} x2={PX - 150 + 300 * lit} y1={r.y} y2={r.y} stroke={C.upLine} strokeWidth={4} style={{filter: `drop-shadow(0 0 8px ${halo(C.upLine, 0.7)})`}} /> : null}
                {/* columns down to the next slab, a ramp on the right */}
                {i < rows.length - 1
                  ? [X0 + 60, 410, COL3].map((x) => <line key={x} x1={x} x2={x} y1={r.y + 16} y2={r.y + 16 + (SLAB - 16) * t} stroke={C.ink} strokeWidth={1.4} opacity={0.35} />)
                  : null}
                {i < rows.length - 1 ? <path d={`M ${X1 - 190} ${r.y + 16 + (i % 2 ? 0 : SLAB - 16)} L ${X1 - 20} ${r.y + 16 + (i % 2 ? SLAB - 16 : 0)}`} stroke={C.ink} strokeWidth={1.6} opacity={0.42 * t} /> : null}
              </g>
            );
          })}
          {others.map((o, i) => (
            <CarSide key={i} x={o.x} y={o.y} op={0.3 * prog(frame, 10 + i * 4, 12)} flip={o.flip} />
          ))}
          <CarSide x={PX} y={PY} op={prog(frame, 6, 12)} />
        </svg>
        {/* the floor numbers, mono, at the left over each slab */}
        {rows.map((r, i) =>
          r.n === null ? null : (
            <div key={i} className={TXT} style={{position: 'absolute', left: X0 - 50, top: r.y - 50, fontFamily: F.mono, fontSize: 30, letterSpacing: '0.04em', color: r.y === PY ? C.ink : C.ink3, opacity: prog(frame, 6 + i * 3, 10)}}>
              {mtav(r.n > 0 ? `+${r.n}` : String(r.n))}
            </div>
          ),
        )}
      </div>
    </div>
  );
};
