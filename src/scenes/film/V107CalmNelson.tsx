// src/scenes/film/V107CalmNelson.tsx: the missed exit, seen by a chase camera behind the coupe at dusk.
// mode "drive": the overhead sign comes up, its right arrow lit in the accent (the turn ahead).
// mode "miss":  the exit ramp peels off to the right and slides past; the coupe goes straight on (the hit: a punch word).
// mode "reroute": the road ahead fills with calm chevrons, one after another, in the accent: the new way, no fuss.
// mode "arrive": the coupe and the camera ease to a stop beside an accent marker post, the brake lights on.
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, Sfx} from '../common';
import {C, L, rgba, type Tone} from '../../tokens';
import {ease, prog} from '../../lib/anim';
import {CameraLayer, Hud} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import type {SceneCtx} from '../../types';
import {Car, type CarBody} from '../illo/car';
import {Backdrop} from '../illo/backdrop';
import {Road, pt, scaleAt, view} from '../illo/road';
import {acc, accRamp} from '../illo/palette';
import {IlloBand, Svg, timeOf} from '../illo/scene';
import {poly} from '../illo/solid';

type P = {
  look?: 'illustrated' | 'diagram';
  mode?: 'drive' | 'miss' | 'reroute' | 'arrive';
  hitAt?: number | string;
  line?: string;
  tone?: Tone;
  body?: CarBody;
  time?: 'day' | 'night' | 'dusk';
};

const HY = 820;
const CAR_Z = 8.5;
const EDGE_R = 1.9;

export const V107CalmNelson: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const uid = useId();
  const e = entrance(ctx);
  const base = lead(ctx);
  const mode = p.mode ?? 'drive';
  const time = timeOf(p.time ? p : {time: 'dusk'});
  const hit = Math.max(base + 10, cueFrame(ctx, p.hitAt ?? 1));
  const v = view({hy: HY, vx: 540, h: 2.6, fp: 900});
  const t = frame - e;

  // metres travelled: steady, or easing to a stop on the hit (arrive)
  let d = 0.42 * t;
  if (mode === 'arrive') {
    const stopLen = Math.max(20, hit - e);
    const k = Math.min(1, Math.max(0, t / stopLen));
    d = 0.42 * stopLen * (k - (k * k) / 2);
  }
  const moving = mode !== 'arrive' || frame < hit;

  // the exit: far ahead (drive), passing the car on the hit (miss)
  const exit0 = mode === 'miss' ? CAR_Z + 0.42 * Math.max(12, hit - e) + 4 : 44;
  const zr = exit0 - d;
  const showExit = mode === 'drive' || mode === 'miss';
  const zs = zr - 12; // the sign gantry, before the exit
  const signLit = mode === 'drive' ? prog(frame, e + 8, 10, ease.enter) : mode === 'miss' ? 1 - prog(frame, hit - 4, 8, ease.enter) : 0;
  const A = acc('a');

  // the exit ramp (asphalt and its edge line)
  const P2 = (X: number, Z: number) => pt(v, X, Math.max(1.2, Z));
  const ramp =
    showExit && zr + 30 > 1.5
      ? poly([P2(EDGE_R, zr), P2(EDGE_R + 1.2, zr + 4), P2(14, zr + 34), P2(22, zr + 30), P2(EDGE_R + 4, zr + 1)])
      : '';

  // the sign: two posts, a beam, two panels
  const sign = () => {
    if (!showExit || zs < 2.4) return null;
    const s = scaleAt(v, zs);
    const [lx, ly] = pt(v, -5.8, zs);
    const [rx, ry] = pt(v, EDGE_R + 1.4, zs);
    const topY =ly - 6.4 * s;
    const panel = (X0: number, X1: number, right: boolean) => {
      const [x0] = pt(v, X0, zs);
      const [x1] = pt(v, X1, zs);
      const w = x1 - x0;
      const h = 1.9 * s;
      const cx = x0 + w / 2;
      const cy = topY + 0.25 * s + h / 2;
      const lit = right ? signLit : 0;
      const ar = 0.55 * s;
      const arrow = right
        ? `M${cx - ar * 0.4} ${cy + ar}L${cx - ar * 0.4} ${cy - ar * 0.1}Q${cx - ar * 0.4} ${cy - ar * 0.5} ${cx} ${cy - ar * 0.5}L${cx + ar * 0.3} ${cy - ar * 0.5}`
        : `M${cx} ${cy + ar}L${cx} ${cy - ar * 0.6}`;
      const head = right
        ? `M${cx + ar * 0.1} ${cy - ar * 0.85}L${cx + ar * 0.55} ${cy - ar * 0.5}L${cx + ar * 0.1} ${cy - ar * 0.15}`
        : `M${cx - ar * 0.35} ${cy - ar * 0.25}L${cx} ${cy - ar * 0.7}L${cx + ar * 0.35} ${cy - ar * 0.25}`;
      return (
        <g key={right ? 'r' : 'l'}>
          <rect x={x0} y={topY + 0.25 * s} width={w} height={h} rx={0.12 * s} fill={C.il6} />
          <rect x={x0} y={topY + 0.25 * s} width={w} height={h} rx={0.12 * s} fill={accRamp(A, 3)} opacity={0.9 * lit} />
          <path d={arrow + head} fill="none" stroke={C.il0} strokeWidth={Math.max(2, 0.14 * s)} strokeLinecap="round" strokeLinejoin="round" />
        </g>
      );
    };
    return (
      <g>
        <rect x={lx - 0.1 * s} y={topY} width={0.2 * s} height={ly - topY} fill={C.il5} />
        <rect x={rx - 0.1 * s} y={topY} width={0.2 * s} height={ry - topY} fill={C.il5} />
        <rect x={lx} y={topY + 0.1 * s} width={rx - lx} height={0.16 * s} fill={C.il5} />
        {panel(-4.6, -0.6, false)}
        {panel(0.2, EDGE_R + 1.1, true)}
      </g>
    );
  };

  // reroute: chevrons on the road ahead, lighting one after another from the hit
  const chevrons = () => {
    if (mode !== 'reroute') return null;
    const out: React.ReactNode[] = [];
    for (let i = 0; i < 5; i++) {
      const z = 13 + i * 7 - ((d * 0.15) % 7);
      const on = prog(frame, hit + i * 4, 8, ease.enter);
      if (on <= 0 || z < 10) continue;
      const a1 = pt(v, -1.4, z + 1.6);
      const tip = pt(v, 0, z + 3.2);
      const b1 = pt(v, 1.4, z + 1.6);
      const a2 = pt(v, -1.4, z);
      const t2 = pt(v, 0, z + 1.6);
      const b2 = pt(v, 1.4, z);
      out.push(<path key={i} d={poly([a2, t2, b2, b1, tip, a1])} fill={accRamp(A, 2 + (i % 2))} opacity={0.85 * on * (1 - i * 0.1)} />);
    }
    return <g>{out}</g>;
  };

  // arrive: the marker post beside the stop
  const marker = () => {
    if (mode !== 'arrive') return null;
    const total = d;
    const z = CAR_Z + 2 + (Math.max(20, hit - e) * 0.21 + 1) - total;
    if (z < 2) return null;
    const s = scaleAt(v, z);
    const [x, y] = pt(v, EDGE_R + 1.3, z);
    const lit = prog(frame, hit, 10, ease.enter);
    return (
      <g>
        <rect x={x - 0.09 * s} y={y - 2.4 * s} width={0.18 * s} height={2.4 * s} fill={C.il5} />
        <circle cx={x} cy={y - 2.6 * s} r={0.42 * s} fill={accRamp(A, 3 - lit)} />
        <circle cx={x} cy={y - 2.6 * s} r={0.42 * s * (1 + 0.6 * lit)} fill="none" stroke={rgba(A, 0.5 * lit)} strokeWidth={2} />
      </g>
    );
  };

  const [cx, cy] = pt(v, 0, CAR_Z);
  const len = 4.7 * scaleAt(v, CAR_Z);
  const sway = moving ? Math.sin(frame / 23) * 6 : 0;
  const brake = mode === 'arrive' ? prog(frame, e + Math.max(6, (hit - e) * 0.4), 8, ease.enter) : 0;

  return (
    <IlloBand uid={uid} time={time}>
      <CameraLayer depth={0.6}>
        <Svg>
          <Backdrop kind="city" uid={uid} frame={frame} time={time} base={HY} scroll={d * 2} drift={0} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          <Road v={v} d={d} time={time} uid={uid} lanes={[-1.8]} edges={[-5.4, EDGE_R]} posts={[-7.2]} />
          {ramp ? <path d={ramp} fill={C.il4} opacity={0.95} /> : null}
          {chevrons()}
          {sign()}
          {marker()}
          <Car
            uid={uid}
            x={cx + sway}
            y={cy}
            len={len}
            view="rear"
            body={p.body ?? 'coupe'}
            paint="a"
            caliper="b"
            frame={frame}
            time={time}
            speed={moving ? 0.6 : 0}
            lights={{tail: 1, brake, right: 0}}
          />
        </Svg>
      </CameraLayer>
      <Hud>
        {p.line ? (
          <div style={{position: 'absolute', left: L.camSafe.left, top: 470, whiteSpace: 'nowrap'}}>
            <Words text={p.line} at={hit} fx="slam" size={96} punchTone={p.tone ?? 'neutral'} />
          </div>
        ) : null}
      </Hud>
      <Sfx name="asmr-air-long" at={Math.max(base, hit - 12)} volume={0.22} />
      <Land at={hit} />
      <Haptic kind="rigid" at={hit + 2} volume={0.3} />
    </IlloBand>
  );
};
