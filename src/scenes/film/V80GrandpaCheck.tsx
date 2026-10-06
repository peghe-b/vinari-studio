// V80GrandpaCheck: the inspection rhythm of a Georgian car's age, as a road of years. A small car rolls along a ruler
// of its own age (0..10); the first stamp waits at 4, then the hops are two years long (4, 6, 8), and from 8 they
// shrink to one year (8, 9, 10): big arcs, then small quick ones. On hitAt the rhythm doubles and the punch lands.
// Props: look ("diagram"), at0 (the car reaches 4), at1 (it reaches 6), hitAt (8: the yearly part starts), at3 (9),
//   line (the punch, "*word*"), label (the mono readout), tone (the stamps' colour, default up), source.
import React, {useId} from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, MonoLabel, Sfx, SourceLine} from '../common';
import {C, F, L, rgba, toneBig, toneLine, type Tone} from '../../tokens';
import {ease, prog, spr} from '../../lib/anim';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import {CameraLayer, Hud, useKick} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import type {SceneCtx} from '../../types';
import {Car} from '../illo/car';
import {IlloBand, Svg} from '../illo/scene';
import {Shadow} from '../illo/solid';

type P = {
  look?: 'diagram' | 'illustrated';
  at0?: number | string;
  at1?: number | string;
  hitAt?: number | string;
  at3?: number | string;
  line?: string;
  label?: string;
  tone?: Tone;
  source?: string;
};

const X0 = 180; // year 0
const STEP = 68; // px per year
const ROAD = 860; // the road line (stage y)
const ARC_Y = ROAD - 210; // the hop arcs' top band
const STAMP_Y = 985;
const STAMPS = [4, 6, 8, 9, 10];
const HOPS = [
  [4, 6],
  [6, 8],
  [8, 9],
  [9, 10],
];

const xAt = (year: number) => X0 + year * STEP;

export const V80GrandpaCheck: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const uid = useId();
  const e = entrance(ctx);
  const base = lead(ctx);
  const kick = useKick();
  const tone = p.tone ?? 'up';
  const appear = spr(frame, e, 'enterXL');

  // the frames the car reaches each stamp, kept strictly increasing
  const f0 = e;
  const f4 = Math.max(f0 + 14, cueFrame(ctx, p.at0 ?? 0) + 10);
  const f6 = Math.max(f4 + 16, cueFrame(ctx, p.at1 ?? 1) + 8);
  const f8 = Math.max(f6 + 16, base + 12, cueFrame(ctx, p.hitAt ?? 2));
  const f9 = Math.max(f8 + 12, cueFrame(ctx, p.at3 ?? 3));
  const f10 = f9 + 12;
  const reach = (y: number) => (y <= 4 ? f4 : y <= 6 ? f6 : y <= 8 ? f8 : y <= 9 ? f9 : f10);
  const keyF = [f0, f4, f6, f8, f9, f10];
  const years = [2.2, 4, 6, 8, 9, 10];
  const yr = interpolate(frame, keyF, years, {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const moving = frame > f0 && frame < f10 ? 1 : 0;
  const carX = xAt(yr);
  const hit = f8;

  return (
    <IlloBand uid={uid}>
      {/* background plane: the quiet year grid */}
      <CameraLayer depth={0.6}>
        <Svg style={{opacity: 0.55 * appear}}>
          {Array.from({length: 11}, (_, i) => (
            <line key={i} x1={xAt(i)} y1={ARC_Y - 60} x2={xAt(i)} y2={STAMP_Y + 60} stroke={C.rule} strokeWidth={1} strokeDasharray="2 10" />
          ))}
        </Svg>
      </CameraLayer>

      {/* the subject: the road of years, the hops, the car, the stamps */}
      <CameraLayer depth={1}>
        <Svg style={{opacity: appear}}>
          <line x1={xAt(0) - 20} y1={ROAD} x2={xAt(10) + 20} y2={ROAD} stroke={C.ink} strokeWidth={2.5} strokeLinecap="round" />
          {Array.from({length: 11}, (_, i) => {
            const passed = yr >= i - 0.02;
            return <line key={i} x1={xAt(i)} y1={ROAD} x2={xAt(i)} y2={ROAD + (i % 2 === 0 ? 22 : 14)} stroke={passed ? C.ink : C.ink3} strokeWidth={2} strokeLinecap="round" />;
          })}
          {/* the hops: two-year arcs, then one-year arcs, each drawn as the car makes it */}
          {HOPS.map(([a, b], i) => {
            const fa = reach(a);
            const fb = reach(b);
            const k = prog(frame, fa, Math.max(6, fb - fa), ease.drawOn);
            if (k <= 0) return null;
            const xa = xAt(a);
            const xb = xAt(b);
            const h = (b - a) * 70;
            const d = `M ${xa} ${ROAD - 40} Q ${(xa + xb) / 2} ${ROAD - 40 - h * 2} ${xb} ${ROAD - 40}`;
            const yearly = b - a === 1;
            const len = (xb - xa) * 1.6 + h;
            return (
              <path
                key={i}
                d={d}
                fill="none"
                stroke={yearly ? toneLine(tone) : C.ink2}
                strokeWidth={yearly ? 3 + 2 * kick : 2.5}
                strokeLinecap="round"
                strokeDasharray={len}
                strokeDashoffset={len * (1 - k)}
              />
            );
          })}
          <Shadow uid={uid} cx={carX} cy={ROAD - 40} rx={86} ry={8} />
          <Car uid={uid} x={carX} y={ROAD - 40} len={170} body="suv" paint={2} frame={frame} speed={moving ? 0.35 : 0} />
          {/* the stamps: a seal with a check lands under its year */}
          {STAMPS.map((y) => {
            const f = reach(y);
            const s = spr(frame, f, 'land');
            if (frame < f) {
              return <circle key={y} cx={xAt(y)} cy={STAMP_Y} r={26} fill="none" stroke={C.rule} strokeWidth={2} strokeDasharray="4 6" />;
            }
            const sc = 1.7 - 0.7 * s;
            const col = toneBig(tone);
            return (
              <g key={y} transform={`translate(${xAt(y)} ${STAMP_Y}) scale(${sc.toFixed(4)}) rotate(${(-12 + 12 * s).toFixed(2)})`} opacity={Math.min(1, s * 1.4)}>
                <circle r={30} fill={rgba(col, 0.12)} stroke={col} strokeWidth={3} />
                <path d="M -12 1 L -3 10 L 13 -9" fill="none" stroke={col} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
              </g>
            );
          })}
          {STAMPS.slice(1).map((y) => (
            <line key={`c${y}`} x1={xAt(y)} y1={ROAD + 30} x2={xAt(y)} y2={STAMP_Y - 34} stroke={frame >= reach(y) ? rgba(toneLine(tone), 0.6) : 'none'} strokeWidth={1.5} strokeDasharray="3 5" />
          ))}
        </Svg>
        {/* the year numbers under the road */}
        {Array.from({length: 11}, (_, i) => {
          const passed = yr >= i - 0.02;
          const stamped = STAMPS.indexOf(i) >= 0 && frame >= reach(i);
          return (
            <div
              key={i}
              className={TXT}
              style={{
                position: 'absolute',
                left: xAt(i) - 40,
                top: ROAD + 36,
                width: 80,
                textAlign: 'center',
                fontFamily: F.sans,
                fontWeight: stamped ? 700 : 500,
                fontSize: stamped ? 44 : 36,
                color: stamped ? toneBig(tone) : passed ? C.ink : C.ink3,
                opacity: appear,
              }}
            >
              {i}
            </div>
          );
        })}
      </CameraLayer>

      <Hud>
        <MonoLabel text={p.label ?? 'მანქანის ასაკი'} at={Math.max(base, e + 4)} style={{position: 'absolute', left: L.camSafe.left, top: L.camSafe.top + 20}} />
        <div style={{position: 'absolute', left: L.camSafe.left, top: 1080, whiteSpace: 'nowrap'}}>
          <Words text={p.line ?? '*ორჯერ* ხშირად'} at={hit} fx="slam" size={80} punchTone={tone} />
        </div>
        {p.source ? <SourceLine text={p.source} at={Math.max(base, e + 8)} /> : null}
      </Hud>

      {STAMPS.map((y) => (y === 8 ? null : <Sfx key={y} name="asmr-check" at={Math.max(base, reach(y))} volume={0.3} />))}
      <Sfx name="asmr-swell" at={Math.max(base, hit - 10)} volume={0.24} />
      <Land at={hit} />
      <Haptic kind="rigid" at={hit + 2} volume={0.3} />
      <Haptic kind="light" at={Math.max(base, f4)} />
      <Haptic kind="light" at={Math.max(base, f6)} />
    </IlloBand>
  );
};
