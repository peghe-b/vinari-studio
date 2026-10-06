// src/scenes/Dashboard.tsx: the instrument cluster (illustrated, the "Graphite" kit): a warning light, the fuel, the
// temperature. Everyone knows the moment: the key turns, every lamp flashes for a beat (the bulb check), then one stays on.
//
// Stagings:
//   cluster  (default) a modern digital cluster behind the wheel: two ring gauges, a centre display with the car from above,
//            the tell-tale row; on boot the needles sweep and every lamp flashes; at `at` the chosen light blinks three
//            times and stays on with a breathing halo
//   light    one warning light, huge, alone in the dark: it blinks, then stays lit with its halo
//   fuel     the fuel arc: its segments switch off one by one, the needle sinks to empty, the low-fuel light comes on
// Props: light (engine | battery | oil | temp | tyre | brake | abs | airbag | fuel | seatbelt), at (the light comes on),
//   blink (default true), tone (default down), needle {from, to, at} (0..1, schematic: no numbers), boot (default true
//   when the scene opens its beat), speed (the speedometer's reading, digits only), time, word, camera, seed.
// Frame 0: the cluster mid-sweep. Sounds: real-key-in on boot, asmr-ui-tick-roll under the sweep, asmr-ui-tick per blink,
//   Haptic warning when the light stays on.
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {TXT} from '../lib/layer';
import {C, F, toneBig, type Tone} from '../tokens';
import type {SceneCtx} from '../types';
import {entrance, Haptic, lead, Sfx} from './common';
import {Camera, Hud, Plane, type CamSpec} from './illo/cam';
import {Car} from './illo/car';
import {Icon, WARNING_LIGHTS} from './illo/icons';
import {dark, mix, type Time} from './illo/palette';
import {paint, rr, Solid} from './illo/solid';
import {at, clamp01, FOOT, IlloBand, n1, osc, stagingOf, Svg, timeOf} from './illo/scene';
import {Punch, wordOf} from './illo/type';
import {ease} from '../lib/anim';

const STAGINGS = ['cluster', 'light', 'fuel'] as const;
type P = {
  staging?: (typeof STAGINGS)[number];
  light?: string;
  at?: number | string;
  blink?: boolean;
  tone?: Tone;
  needle?: {from?: number; to?: number; at?: number | string};
  boot?: boolean;
  speed?: number;
  time?: Time;
  word?: unknown;
  camera?: CamSpec;
  seed?: number;
};

/** The light's state at a frame: 0 off .. 1 on; three blinks (4 on, 4 off, 2-frame ramps), then steady. */
const lampAt = (f: number, on: number, blink: boolean) => {
  if (f < on) return 0;
  const t = f - on;
  if (!blink || t >= 24) return clamp01(t / 2);
  const q = t % 8;
  return q < 2 ? q / 2 : q < 4 ? 1 : q < 6 ? 1 - (q - 4) / 2 : 0;
};

/** An arc path (a ring segment) around (cx, cy) between angles a0..a1 (degrees, 0 = up, clockwise), radii r0..r1. */
const arc = (cx: number, cy: number, r0: number, r1: number, a0: number, a1: number) => {
  const P = (r: number, a: number) => {
    const t = ((a - 90) * Math.PI) / 180;
    return `${n1(cx + r * Math.cos(t))} ${n1(cy + r * Math.sin(t))}`;
  };
  const big = Math.abs(a1 - a0) > 180 ? 1 : 0;
  return `M${P(r1, a0)}A${r1} ${r1} 0 ${big} 1 ${P(r1, a1)}L${P(r0, a1)}A${r0} ${r0} 0 ${big} 0 ${P(r0, a0)}Z`;
};

export const Dashboard: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const f = useCurrentFrame();
  const uid = useId();
  const staging = stagingOf(p, STAGINGS);
  const time = timeOf(p);
  const e = entrance(ctx);
  const base = lead(ctx);
  const lightName = (WARNING_LIGHTS as readonly string[]).includes(String(p.light)) ? String(p.light) : staging === 'fuel' ? 'fuel' : 'engine';
  const tn: Tone = p.tone ?? 'down';
  const boot = p.boot ?? true;
  const bootAt = boot ? e : -1e4;
  const onAt = Math.max(e + (boot ? 30 : 8), at(ctx, p.at, e + (boot ? 34 : 10)));
  const blink = p.blink !== false;
  const lamp = lampAt(f, onAt, blink);
  const steadyAt = onAt + (blink ? 24 : 0);
  const breathe = f >= steadyAt ? 0.85 + 0.15 * (0.5 + 0.5 * osc(f, 40)) : 1;
  const word = wordOf(p.word, ctx, 1);
  const kicks = [steadyAt];
  const acc = toneBig(tn);

  let pic: React.ReactNode;
  let cam: CamSpec;
  if (staging === 'light') {
    cam = {move: 'push', amount: 0.05, origin: {x: 540, y: 820}};
    pic = <Alone uid={uid} f={f} name={lightName} lamp={lamp * breathe} acc={acc} tn={tn} time={time} />;
  } else {
    const needle = p.needle ?? (staging === 'fuel' ? {from: 0.35, to: 0} : undefined);
    const nAt = needle ? at(ctx, needle.at, e + 10) : 0;
    cam = staging === 'fuel' ? {move: 'push', amount: 0.045, origin: {x: 540, y: 960}} : {move: 'push', amount: 0.04, origin: {x: 540, y: 1040}};
    pic = <Cluster uid={uid} f={f} e={e} bootAt={bootAt} name={lightName} lamp={lamp * breathe} acc={acc} tn={tn} time={time} fuel={staging === 'fuel'} needle={needle} nAt={nAt} speed={p.speed} />;
  }
  const blinks = blink ? [0, 8, 16].map((k) => onAt + k) : [onAt];
  return (
    <IlloBand uid={uid} time={time}>
      <Camera ctx={ctx} spec={cam} over={p.camera} kicks={kicks}>
        {pic}
        <Hud>
          <Punch word={word} slot={staging === 'light' ? 'low' : 'top'} />
        </Hud>
      </Camera>
      {boot && staging !== 'light' && bootAt >= base && Math.max(0, bootAt) < ctx.dur ? (
        <>
          <Sfx name="real-key-in" at={Math.max(0, bootAt)} volume={0.4} />
          <Sfx name="asmr-ui-tick-roll" at={Math.max(0, bootAt + 2)} volume={0.25} />
        </>
      ) : null}
      {blinks.filter((b) => b >= Math.max(0, base) && b < ctx.dur).map((b, i) => (
        <Sfx key={i} name="asmr-ui-tick" at={b} volume={0.3} />
      ))}
      {steadyAt >= 0 && steadyAt < ctx.dur ? <Haptic kind="warning" at={steadyAt} /> : null}
    </IlloBand>
  );
};

// ---- one light, alone -------------------------------------------------------------------------------------------------------
const Alone: React.FC<{uid: string; f: number; name: string; lamp: number; acc: string; tn: Tone; time: Time}> = ({uid, f, name, lamp, acc, tn, time}) => {
  const dk = dark(time);
  const off = dk ? C.il7 : C.il2;
  const halo = tn === 'up' ? 'glow-up' : 'glow-down';
  return (
    <>
      <Plane depth={0.6}>
        <Svg>
          {/* the cluster's glass around it, barely there: two ring arcs and a few dark lamps */}
          <path d={arc(540, 830, 420, 432, -135, 135)} fill={dk ? C.il7 : C.il2} />
          <path d={arc(540, 830, 380, 384, -120, 120)} fill={dk ? C.il7 : C.il2} />
          {['oil', 'abs', 'seatbelt', 'tyre'].map((n, i) => (
            <Icon key={n} name={n} x={300 + i * 160} y={1210} size={64} color={off} accent={off} />
          ))}
        </Svg>
      </Plane>
      <Plane depth={1}>
        <Svg>
          <circle cx={540} cy={830} r={360} fill={paint(uid, halo)} opacity={lamp * (dk ? 0.9 : 0.6)} />
          <Icon name={name} x={540} y={830} size={300} color={mix(off, acc, lamp)} accent={mix(off, acc, lamp)} />
          {lamp > 0.5 ? <Icon name={name} x={540} y={830} size={300} color={C.il0} accent={C.il0} opacity={0.12 * lamp} /> : null}
        </Svg>
      </Plane>
    </>
  );
};

// ---- the cluster --------------------------------------------------------------------------------------------------------------
const Cluster: React.FC<{
  uid: string;
  f: number;
  e: number;
  bootAt: number;
  name: string;
  lamp: number;
  acc: string;
  tn: Tone;
  time: Time;
  fuel: boolean;
  needle?: {from?: number; to?: number; at?: number | string};
  nAt: number;
  speed?: number;
}> = ({uid, f, e, bootAt, name, lamp, acc, tn, time, fuel, needle, nAt, speed}) => {
  const dk = dark(time);
  const glass = dk ? '#050505' : C.ilGlass;
  const lit = C.il0;
  const dim = dk ? C.il6 : mix(C.ilGlass, C.il0, 0.18);
  // the boot sweep: 0 -> max -> rest over 24 frames, then a small idle jitter
  const sweepT = clamp01((f - bootAt) / 24);
  const sweep = f < bootAt ? 0 : sweepT < 0.5 ? ease.camera(sweepT * 2) : 1 - ease.camera((sweepT - 0.5) * 2);
  const bulb = f >= bootAt + 4 && f < bootAt + 10 ? clamp01(Math.min(f - bootAt - 4, bootAt + 10 - f) / 2) : 0;
  const settle = (rest: number) => (sweepT < 1 ? Math.max(sweep, sweepT >= 0.5 ? rest * ease.camera((sweepT - 0.5) * 2) : 0) : rest) + 0.004 * osc(f, 18) + 0.003 * osc(f, 31, 1);
  const spdRest = clamp01((speed ?? 60) / 220);
  const spd = settle(spdRest);
  const rpm = settle(0.28 + 0.02 * osc(f, 50));
  // the fuel / temp needle: from -> to over 30 frames from nAt
  const nv = needle ? (needle.from ?? 0.4) + ((needle.to ?? 0) - (needle.from ?? 0.4)) * ease.camera(clamp01((f - nAt) / 30)) : 0.6;
  const fuelV = sweepT < 1 ? Math.max(sweep, sweepT >= 0.5 ? nv : 0) : nv;
  const halo = tn === 'up' ? 'glow-up' : 'glow-down';
  const ring = (cx: number, cy: number, r: number, v: number, label: 'speed' | 'rpm') => {
    const a0 = -135;
    const a1 = 135;
    const av = a0 + (a1 - a0) * clamp01(v);
    const ticks: string[] = [];
    for (let i = 0; i <= 24; i++) {
      const a = a0 + ((a1 - a0) * i) / 24;
      ticks.push(arc(cx, cy, r - (i % 4 === 0 ? 34 : 20), r - 8, a - 0.6, a + 0.6));
    }
    const t = ((av - 90) * Math.PI) / 180;
    const nx = cx + (r - 14) * Math.cos(t);
    const ny = cy + (r - 14) * Math.sin(t);
    const bx = cx - 30 * Math.cos(t);
    const by = cy - 30 * Math.sin(t);
    const px = -Math.sin(t) * 6;
    const py = Math.cos(t) * 6;
    return (
      <g>
        <path d={arc(cx, cy, r, r + 10, a0, a1)} fill={dim} />
        <path d={arc(cx, cy, r, r + 10, a0, av)} fill={lit} opacity={0.9} />
        <path d={arc(cx, cy, r - 60, r - 6, a0, av)} fill={paint(uid, 'glow-ink')} opacity={dk ? 0.12 : 0.06} />
        <path d={ticks.join('')} fill={lit} opacity={0.55} />
        <path d={`M${n1(bx + px)} ${n1(by + py)}L${n1(nx)} ${n1(ny)}L${n1(bx - px)} ${n1(by - py)}Z`} fill={label === 'rpm' && v > 0.8 ? acc : lit} />
        <circle cx={nx} cy={ny} r={12} fill={paint(uid, 'glow-ink')} opacity={0.8} />
        <circle cx={cx} cy={cy} r={34} fill={mix(glass, C.il0, 0.08)} />
        {label === 'speed' ? (
          <text className={TXT} x={cx} y={cy + 110} textAnchor="middle" fontFamily={F.sans} fontWeight={600} fontSize={78} fill={lit}>
            {String(Math.round(spd * 220))}
          </text>
        ) : (
          <path d={arc(cx, cy, 96, 112, -60, -60 + 120 * clamp01(rpm * 1.4))} fill={lit} opacity={0.5} />
        )}
      </g>
    );
  };
  // the tell-tale row
  const row = ['battery', 'oil', 'temp', 'tyre', 'abs', 'airbag', 'seatbelt', 'brake'].filter((n) => n !== name);
  row.splice(3, 0, name);
  const rowY = 1185;
  return (
    <>
      <Plane depth={0.8}>
        <Svg>
          {/* the dash around the cluster: the hood over it, the glass, its rim */}
          <Solid uid={uid} d={`M-60 470C200 430 880 430 1140 470V${FOOT}H-60Z`} tone={7} fill={dk ? C.il7 : C.il2} time={time} rim />
          <Solid uid={uid} d={rr(70, 560, 940, 700, 120)} tone={6} fill={dk ? C.il6 : C.il4} time={time} rim outline />
          <path d={rr(92, 582, 896, 656, 104)} fill={glass} />
          <path d={`M110 640C300 600 500 590 640 600L120 980Z`} fill={C.il0} opacity={dk ? 0.03 : 0.06} />
          {fuel ? (
            <FuelArc uid={uid} f={f} v={fuelV} lit={lit} dim={dim} acc={acc} lamp={lamp} glass={glass} halo={halo} dk={dk} />
          ) : (
            <>
              {ring(300, 860, 200, spd, 'speed')}
              {ring(780, 860, 200, rpm, 'rpm')}
              {/* the centre display: the car from above in its lane, a soft glow */}
              <ellipse cx={540} cy={880} rx={90} ry={150} fill={paint(uid, 'glow-ink')} opacity={dk ? 0.18 : 0.1} />
              <path d={rr(476, 740, 6, 280, 3) + rr(598, 740, 6, 280, 3)} fill={lit} opacity={0.25} />
              <Car uid={uid} x={540} y={880} len={200} view="top" frame={f} paint={1} time="night" />
            </>
          )}
          {/* the tell-tales: dark until the bulb check; the chosen one blinks, then stays on */}
          {row.map((n, i) => {
            const x = 214 + i * 82;
            const on = n === name ? lamp : 0;
            const b = Math.max(on, bulb);
            const col = on > 0 ? mix(dim, acc, on) : mix(dim, ['battery', 'oil', 'brake', 'airbag', 'seatbelt', 'temp'].includes(n) ? toneBig('down') : C.il1, bulb);
            return (
              <g key={n}>
                {n === name && on > 0 ? <circle cx={x} cy={rowY} r={90} fill={paint(uid, halo)} opacity={on * (dk ? 0.9 : 0.6)} /> : null}
                <Icon name={n} x={x} y={rowY} size={n === name ? 64 + 14 * on : 54} color={b > 0 ? col : dim} accent={b > 0 ? col : dim} />
              </g>
            );
          })}
        </Svg>
      </Plane>
      <Plane depth={1.3}>
        <Svg>
          {/* the wheel's rim across the bottom, its sides running on past the frame's foot (full bleed) */}
          <Solid uid={uid} d={`M-40 ${FOOT}L-40 1500C0 1330 270 1272 540 1272C810 1272 1080 1330 1120 1500L1120 ${FOOT}H1040L1040 1500C1000 1380 790 1330 540 1330C290 1330 80 1380 40 1500L40 ${FOOT}Z`} tone={dk ? 6 : 5} time={time} rim outline />
        </Svg>
      </Plane>
    </>
  );
};

const FuelArc: React.FC<{uid: string; f: number; v: number; lit: string; dim: string; acc: string; lamp: number; glass: string; halo: string; dk: boolean}> = ({uid, f, v, lit, dim, acc, lamp, glass, halo, dk}) => {
  const cx = 540;
  const cy = 1000;
  const r = 330;
  const a0 = -110;
  const a1 = 110;
  const N = 10;
  const segs: React.ReactNode[] = [];
  for (let i = 0; i < N; i++) {
    const s0 = a0 + ((a1 - a0) * i) / N + 1.6;
    const s1 = a0 + ((a1 - a0) * (i + 1)) / N - 1.6;
    const on = clamp01((v * N - i) * 1.5);
    const low = i < 2;
    segs.push(<path key={i} d={arc(cx, cy, r - 48, r, s0, s1)} fill={on > 0 ? mix(dim, low ? acc : lit, on) : dim} />);
  }
  const av = a0 + (a1 - a0) * clamp01(v);
  const t = ((av - 90) * Math.PI) / 180;
  const nx = cx + (r - 70) * Math.cos(t);
  const ny = cy + (r - 70) * Math.sin(t);
  return (
    <g>
      <path d={arc(cx, cy, r - 70, r - 4, a0, av)} fill={paint(uid, 'glow-ink')} opacity={dk ? 0.12 : 0.06} />
      {segs}
      <path d={`M${n1(cx - Math.sin(t) * 9)} ${n1(cy + Math.cos(t) * 9)}L${n1(nx)} ${n1(ny)}L${n1(cx + Math.sin(t) * 9)} ${n1(cy - Math.cos(t) * 9)}Z`} fill={v < 0.12 ? acc : lit} />
      <circle cx={cx} cy={cy} r={42} fill={mix(glass, C.il0, 0.1)} />
      {/* E and F ends as small marks, the pump at the centre (it lights when the fuel is low) */}
      <path d={arc(cx, cy, r + 12, r + 30, a0 - 0.8, a0 + 0.8) + arc(cx, cy, r + 12, r + 30, a1 - 0.8, a1 + 0.8)} fill={lit} opacity={0.7} />
      <circle cx={cx} cy={cy - 170} r={130} fill={paint(uid, halo)} opacity={lamp * (dk ? 0.9 : 0.6)} />
      <Icon name="fuel" x={cx} y={cy - 170} size={130} color={lamp > 0 ? mix(dim, acc, lamp) : dim} accent={lamp > 0 ? mix(dim, acc, lamp) : dim} />
    </g>
  );
};
