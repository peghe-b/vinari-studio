// src/scenes/Windshield.tsx: the driver's view (illustrated, the "Graphite" kit): the road ahead through the glass, the
// cabin around it (roof liner, A-pillars, the mirror, the dash, the wheel with two hands at 10 and 2).
//
// Stagings:
//   road     (default) the open road streaming out of the vanishing point; a turn slides the vanishing point and the hands
//            turn the wheel; rain beads on the glass and the wipers clear it; at night oncoming lights and passing lamps
//   traffic  a queue of cars from behind; on a brake their brake lights ripple red one after another, front to back
//   parking  a car park: rows of parked cars slide by; a free bay lights up green when found
// Props: weather (clear | rain | snow), time, events [{is: brake | turn-left | turn-right | found, at}], backdrop
//   (mountains | city | highway), word, camera, seed.
// Frame 0: moving. Sounds: real-interior-drive under it, real-rain-roof in rain, asmr-slide per wiper sweep,
//   real-indicator-loop on a turn, asmr-whoomp on a brake, asmr-check + Haptic success when a bay is found.
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {C, toneBig, type Tone} from '../tokens';
import type {SceneCtx} from '../types';
import {entrance, Haptic, lead, Sfx} from './common';
import {Backdrop, type BackdropKind} from './illo/backdrop';
import {Camera, Hud, Plane, type CamSpec} from './illo/cam';
import {Drops, Rain, Snow} from './illo/fx';
import {dark, glowK, mix, type Time} from './illo/palette';
import {Cabin, CarAhead, Road, Wipers, pt, scaleAt, view, wiperAge, wiperSweep, type View} from './illo/road';
import {paint, poly} from './illo/solid';
import {at, clamp01, IlloBand, osc, seedOf, stagingOf, Svg, timeOf} from './illo/scene';
import {Punch, wordOf} from './illo/type';
import {ease} from '../lib/anim';

const STAGINGS = ['road', 'traffic', 'parking'] as const;
type Ev = {is: 'brake' | 'turn-left' | 'turn-right' | 'found'; at?: number | string};
type P = {staging?: (typeof STAGINGS)[number]; weather?: 'clear' | 'rain' | 'snow'; time?: Time; events?: Ev[]; backdrop?: string; word?: unknown; tone?: Tone; camera?: CamSpec; seed?: number};

const KINDS: Record<string, BackdropKind> = {mountains: 'mountains', city: 'city', highway: 'highway', street: 'city'};
const WIPE = 40;

export const Windshield: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const f = useCurrentFrame();
  const uid = useId();
  const staging = stagingOf(p, STAGINGS);
  const time = timeOf(p);
  const e = entrance(ctx);
  const base = lead(ctx);
  const seed = seedOf(p as Record<string, unknown>);
  const dk = dark(time);
  const weather = p.weather ?? 'clear';
  const events = (p.events ?? []).map((ev) => ({is: ev.is, at: at(ctx, ev.at, 0)}));
  const brakeAt = events.find((ev) => ev.is === 'brake')?.at ?? Infinity;
  const foundAt = events.find((ev) => ev.is === 'found')?.at ?? Infinity;
  const turnEv = events.filter((ev) => ev.is === 'turn-left' || ev.is === 'turn-right').filter((ev) => ev.at <= f).pop();
  const turnDir = turnEv ? (turnEv.is === 'turn-left' ? -1 : 1) : 0;
  const turnK = turnEv ? ease.camera(clamp01((f - turnEv.at) / 24)) : 0;
  // speed in m a frame: the road cruises, traffic creeps, the car park rolls slowly; a brake or a found bay slows it
  const cruise = staging === 'road' ? 0.75 : staging === 'traffic' ? 0.12 : 0.16;
  const vAt = (fr: number) => {
    let v = cruise;
    if (fr >= brakeAt) v *= 1 - 0.85 * ease.camera(clamp01((fr - brakeAt) / 20));
    if (fr >= foundAt) v *= 1 - ease.camera(clamp01((fr - foundAt) / 26));
    return v;
  };
  let d = 0;
  for (let i = -60; i < f; i++) d += vAt(i);
  const dip = Number.isFinite(brakeAt) && f >= brakeAt ? 10 * Math.sin(Math.min(1, (f - brakeAt) / 10) * Math.PI) * Math.exp(-(f - brakeAt) / 24) : 0;
  const vw: View = view({hy: 770 + dip, vx: 540 + turnDir * 120 * turnK, h: 1.25, fp: 1000, bend: turnDir * 160 * turnK});
  const kind = KINDS[p.backdrop ?? ''] ?? (staging === 'road' ? 'mountains' : 'city');
  const word = wordOf(p.word, ctx, 1);
  const kicks = [brakeAt, foundAt];
  const wipeStart = weather === 'rain' ? e + 4 : Infinity;
  const sweep = weather === 'rain' ? wiperSweep(f, wipeStart, WIPE) : 0;
  const wipes: number[] = [];
  if (weather === 'rain') for (let w = wipeStart; w < ctx.dur; w += WIPE) if (w >= Math.max(0, base)) wipes.push(w);

  let world: React.ReactNode = null;
  if (staging === 'road') {
    // oncoming lights at night: pairs of discs in the other lane rushing past
    const oncoming =
      time !== 'day'
        ? Array.from({length: 3}, (_, i) => {
            const span = 140;
            const z = span - ((((d * 1.0 + f * 0.9 + i * 47) % span) + span) % span) + 4;
            const [x, y] = pt(vw, -3.6, z);
            const s = scaleAt(vw, z);
            const r = Math.max(4, 0.32 * s);
            return (
              <g key={i} opacity={clamp01((span - z) / 30)}>
                <circle cx={x - 0.75 * s} cy={y - 0.6 * s} r={r * 2.4} fill={paint(uid, 'glow-ink')} opacity={0.6} />
                <circle cx={x + 0.75 * s} cy={y - 0.6 * s} r={r * 2.4} fill={paint(uid, 'glow-ink')} opacity={0.6} />
                <circle cx={x - 0.75 * s} cy={y - 0.6 * s} r={r * 0.6} fill={C.il0} />
                <circle cx={x + 0.75 * s} cy={y - 0.6 * s} r={r * 0.6} fill={C.il0} />
              </g>
            );
          })
        : null;
    const ahead = <CarAhead v={vw} X={0} Z={34 - 6 * osc(f, 200)} uid={uid} frame={f} body="suv" paint={2} lights={{tail: time === 'day' ? 0.3 : 1, brake: f >= brakeAt ? 1 : 0}} time={time} seed={seed} />;
    world = (
      <>
        <Road v={vw} d={d} time={time} uid={uid} lanes={[-1.8]} edges={[-5.4, 1.9]} posts={[-7.4, 3.4]} beam={time === 'night' ? 1 : 0} />
        {ahead}
        {oncoming}
      </>
    );
  } else if (staging === 'traffic') {
    const n = 5;
    const cars = Array.from({length: n}, (_, i) => {
      const z = 8 + i * 8.5 + 1.2 * osc(f, 90 + i * 13, i);
      const order = n - 1 - i; // the front of the queue brakes first
      const on = f >= brakeAt + order * 4 ? clamp01((f - brakeAt - order * 4) / 2) : 0;
      return {z, i, on, X: 0};
    });
    const side = Array.from({length: 4}, (_, i) => ({z: 12 + i * 11 + 2 * osc(f, 120, i), i: i + 10, on: f >= brakeAt + (3 - i) * 4 ? 1 : 0, X: -3.6}));
    world = (
      <>
        <Road v={vw} d={d} time={time} uid={uid} lanes={[-1.8]} edges={[-5.4, 1.9]} posts={[-7.4, 3.4]} />
        {[...cars, ...side]
          .sort((a, b) => b.z - a.z)
          .map((c) => (
            <CarAhead key={c.i} v={vw} X={c.X} Z={c.z} uid={uid} frame={f} body={c.i % 3 === 1 ? 'suv' : c.i % 3 === 2 ? 'hatch' : 'sedan'} paint={1 + ((c.i * 3) % 5)} lights={{tail: time === 'day' ? 0.25 : 1, brake: c.on}} time={time} seed={seed + c.i} />
          ))}
      </>
    );
  } else {
    world = <Lot uid={uid} v={vw} d={d} f={f} time={time} foundAt={foundAt} seed={seed} dFound={(() => {
      let s = 0;
      for (let i = -60; i < foundAt && i < 2000; i++) s += vAt(i);
      return s;
    })()} />;
  }

  // drops on the glass: the wipers clear them in their arc
  const age = (x: number, y: number) => wiperAge(x, y, f, wipeStart, WIPE);
  return (
    <IlloBand uid={uid} time={time}>
      <Camera ctx={ctx} spec={{move: 'push', amount: 0.025, origin: {x: 540, y: 820}, shake: staging === 'road' ? 0.35 : 0.12}} over={p.camera} kicks={kicks}>
        <Plane depth={0.6}>
          <Svg>
            <Backdrop kind={kind} uid={uid} frame={f} time={time} base={vw.hy + 2} scroll={turnDir * 300 * turnK} drift={0.1} />
          </Svg>
        </Plane>
        <Plane depth={1}>
          <Svg>{world}</Svg>
        </Plane>
        <Plane depth={1.3}>
          <Svg>
            {weather === 'rain' ? <Drops frame={f} seed={seed} n={60} box={{x: 60, y: 470, w: 960, h: 680}} age={age} /> : null}
            {weather === 'rain' ? <Rain frame={f} seed={seed} n={60} slant={4} speed={1.4} box={{x: 60, y: 470, w: 960, h: 700}} time={time} opacity={0.35} /> : null}
            {weather === 'snow' ? <Snow frame={f} seed={seed} n={70} speed={1.6} wind={0.2} box={{x: 0, y: 400, w: 1080, h: 800}} time={time} /> : null}
            {weather === 'rain' ? <Wipers uid={uid} sweep={sweep} time={time} /> : null}
            {time === 'night' ? <path d={`M-40 460C300 420 780 420 1120 460V470C780 430 300 430 -40 470Z`} fill={C.il0} opacity={0.12 * Math.max(0, osc(f, 36))} /> : null}
            <Cabin uid={uid} time={time} frame={f} turn={turnDir * 26 * turnK + 1.5 * osc(f, 80)} glow={dk ? 0.6 : 0} />
          </Svg>
        </Plane>
        <Hud>
          <Punch word={word} slot="top" plate />
        </Hud>
      </Camera>
      <Sfx name="real-interior-drive" at={Math.max(0, base)} volume={0.25} len={ctx.dur} fade={10} />
      {weather === 'rain' ? <Sfx name="real-rain-roof" at={Math.max(0, base)} volume={0.25} len={ctx.dur} fade={10} /> : null}
      {wipes.map((w, i) => (
        <Sfx key={`w${i}`} name="asmr-slide" at={w} volume={0.2} />
      ))}
      {turnEv && turnEv.at >= 0 ? <Sfx name="real-indicator-loop" at={turnEv.at} volume={0.3} len={Math.max(1, ctx.dur - turnEv.at)} fade={8} /> : null}
      {Number.isFinite(brakeAt) && brakeAt >= 0 && brakeAt < ctx.dur ? <Sfx name="asmr-whoomp" at={brakeAt} volume={0.28} /> : null}
      {Number.isFinite(foundAt) && foundAt >= 0 && foundAt < ctx.dur ? (
        <>
          <Sfx name="asmr-check" at={foundAt} volume={0.45} />
          <Haptic kind="success" at={foundAt} />
        </>
      ) : null}
    </IlloBand>
  );
};

/** A car park: two rows of parked cars, bay lines, lamp posts; one bay is free and lights up green when found. */
const Lot: React.FC<{uid: string; v: View; d: number; f: number; time: Time; foundAt: number; dFound: number; seed: number}> = ({uid, v, d, f, time, foundAt, dFound, seed}) => {
  const dk = dark(time);
  const BAY = 3.0;
  const gapW = Math.round((dFound + 10.5) / BAY); // the free bay's index in the right row: about 10 m ahead when found
  const lineTone = dk ? C.il3 : C.il0;
  const lines: string[] = [];
  const cars: {X: number; Z: number; i: number; side: number}[] = [];
  const k0 = Math.floor(d / BAY);
  for (let k = k0 - 1; k < k0 + 28; k++) {
    const Z = k * BAY - d;
    if (Z < 1.2) continue;
    for (const side of [-1, 1]) {
      // the bay's dividing line: across the bay, 2.6 .. 7.6 m from the aisle's centre
      const a = pt(v, side * 2.6, Z);
      const b = pt(v, side * 7.6, Z);
      const a2 = pt(v, side * 2.6, Z + 0.12);
      const b2 = pt(v, side * 7.6, Z + 0.12);
      lines.push(poly([a, b, b2, a2]));
      const free = side > 0 && k === gapW;
      const r = Math.sin(seed * 7 + k * 3.1 + side) * 0.5 + 0.5;
      if (!free && r > 0.12) cars.push({X: side * 5.1, Z: Z + BAY / 2, i: k * 2 + (side > 0 ? 1 : 0), side});
    }
  }
  const glowOn = f >= foundAt ? clamp01((f - foundAt) / 6) : 0;
  const Zg = gapW * BAY - d;
  const bay = Zg > 1 ? poly([pt(v, 2.7, Zg + 0.1), pt(v, 7.5, Zg + 0.1), pt(v, 7.5, Zg + BAY - 0.1), pt(v, 2.7, Zg + BAY - 0.1)]) : '';
  const [gx, gy] = pt(v, 5.1, Zg + BAY / 2);
  const gs = scaleAt(v, Math.max(1, Zg + BAY / 2));
  const green = toneBig('up');
  return (
    <g>
      <Road v={v} d={d} time={time} uid={uid} lanes={[]} edges={[-2.6, 2.6]} posts={[]} />
      <path d={poly([pt(v, -40, 1.2), pt(v, -2.6, 1.2), pt(v, -2.6, 220), pt(v, -40, 220)]) + poly([pt(v, 2.6, 1.2), pt(v, 40, 1.2), pt(v, 40, 220), pt(v, 2.6, 220)])} fill={dk ? mix(C.il7, '#000000', 0.2) : C.il3} />
      <path d={lines.join('')} fill={lineTone} opacity={0.85} />
      {bay && glowOn > 0 ? (
        <g opacity={glowOn}>
          <ellipse cx={gx} cy={gy} rx={gs * 3.4} ry={gs * 0.9} fill={paint(uid, 'glow-up')} opacity={0.9 * glowK(time) + 0.2} />
          <path d={bay} fill="none" stroke={green} strokeWidth={Math.max(3, gs * 0.1)} strokeLinejoin="round" />
          <g transform={`translate(${gx} ${gy - gs * 1.4 - 10 * osc(f, 30)})`}>
            <circle r={gs * 0.62} fill={green} />
            <path d={`M${-gs * 0.26} 0L${-gs * 0.06} ${gs * 0.2}L${gs * 0.3} ${-gs * 0.2}`} fill="none" stroke={C.onInk} strokeWidth={gs * 0.12} strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </g>
      ) : null}
      {cars
        .sort((a, b) => b.Z - a.Z)
        .map((c) => (
          <CarAhead key={c.i} v={v} X={c.X} Z={c.Z} uid={uid} frame={f} body={c.i % 4 === 1 ? 'suv' : c.i % 4 === 2 ? 'hatch' : 'sedan'} paint={1 + ((c.i * 7) % 5)} time={time} front={c.side < 0 && c.i % 3 === 0} lights={{tail: 0}} seed={seed + c.i} />
        ))}
    </g>
  );
};
