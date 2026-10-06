// src/scenes/Impact.tsx: BOOM, the twist, the surprise (illustrated, the "Graphite" kit). Short by design; impacts land on
// the cut.
//
// Stagings:
//   burst  (default) a comic star burst slams in, turns a little; two shockwaves and debris shards fly out; the punch
//          word sits inside it (dark on a light burst, or on a red burst when it costs); the place behind dims
//   bump   two cars at walking pace: one rolls into the other, small stars at the contact, the bumper dents, both rock; the
//          driver outside facepalms (never an injury, never a person inside a bumped car)
//   crack  a phone's screen (or a windshield) cracks: lines grow from the hit point in 6 frames, shards glint
// Props: word (<= 2 words: "ბუმ", "ჰოპ", "სტოპ"), at (default: the cut), tone (neutral by default; down when it costs),
//   glass (phone | windshield), body, where (the place behind the burst: station | city | room | garage | highway),
//   time, camera, seed.
// Frame 0: mid-burst. Sounds: synth-bass_hit + <Land>, Haptic rigid; asmr-paper-tear for the crack; real-clunk for a bump.
import React, {useId} from 'react';
import {spring, useCurrentFrame} from 'remotion';
import {mtav} from '../lib/format';
import {TXT} from '../lib/layer';
import {C, F, toneBig, type Tone} from '../tokens';
import type {SceneCtx} from '../types';
import {entrance, Haptic, Land, lead, Sfx} from './common';
import {Backdrop, type BackdropKind} from './illo/backdrop';
import {Camera, Plane, type CamSpec} from './illo/cam';
import {Car, type CarBody} from './illo/car';
import {Figure} from './illo/figure';
import {Burst, Shockwave, Sparks} from './illo/fx';
import {Handset} from './illo/handset';
import {dark, mix, type Time} from './illo/palette';
import {Cabin, Road, view} from './illo/road';
import {Glint, poly, Shadow, star} from './illo/solid';
import {at, clamp01, IlloBand, n1, osc, seedOf, stagingOf, Svg, timeOf} from './illo/scene';
import {fitSize, wordOf} from './illo/type';

const STAGINGS = ['burst', 'bump', 'crack'] as const;
type P = {staging?: (typeof STAGINGS)[number]; word?: unknown; at?: number | string; tone?: Tone; glass?: 'phone' | 'windshield'; body?: CarBody; where?: string; time?: Time; camera?: CamSpec; seed?: number};
const KINDS: Record<string, BackdropKind> = {station: 'station', city: 'city', street: 'city', room: 'room', garage: 'garage', highway: 'highway', road: 'highway', mountains: 'mountains'};

/** Crack lines from a hit point: a few long branches and short splinters, grown by k 0..1. */
const cracks = (x: number, y: number, R: number, k: number, seed: number) => {
  let d = '';
  const n = 11;
  for (let i = 0; i < n; i++) {
    const r = (j: number) => Math.sin(seed * 9.1 + i * 12.7 + j * 4.3) * 0.5 + 0.5;
    let a = (i / n) * Math.PI * 2 + r(1) * 0.5;
    let px = x;
    let py = y;
    const len = R * (0.45 + 0.55 * r(2)) * k;
    const steps = 5;
    d += `M${n1(px)} ${n1(py)}`;
    for (let s = 1; s <= steps; s++) {
      a += (r(s + 3) - 0.5) * 0.6;
      px += (Math.cos(a) * len) / steps;
      py += (Math.sin(a) * len) / steps;
      d += `L${n1(px)} ${n1(py)}`;
    }
  }
  // a ring of short links between the branches near the hit
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2;
    const a1 = ((i + 1) / n) * Math.PI * 2;
    const rr0 = R * 0.16 * k;
    d += `M${n1(x + Math.cos(a0) * rr0)} ${n1(y + Math.sin(a0) * rr0)}L${n1(x + Math.cos(a1) * rr0 * 1.1)} ${n1(y + Math.sin(a1) * rr0 * 1.1)}`;
  }
  return d;
};

export const Impact: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const f = useCurrentFrame();
  const uid = useId();
  const staging = stagingOf(p, STAGINGS);
  const time = timeOf(p);
  const e = entrance(ctx);
  const base = lead(ctx);
  const seed = seedOf(p as Record<string, unknown>);
  const tn: Tone = p.tone ?? 'neutral';
  // the hit: on the cut (frame 0 of the scene; an opening scene is already mid-burst at frame 0)
  const hit = p.at === undefined ? (ctx.index === 0 ? -6 : 0) : Math.max(e, at(ctx, p.at, 0));
  const w = wordOf(p.word, ctx, 0);
  const word = w ? {...w, at: hit} : null;
  const dk = dark(time);
  const cues: React.ReactNode[] = [];
  let pic: React.ReactNode;
  let cam: CamSpec = {move: 'still'};

  if (staging === 'burst') {
    const red = tn === 'down';
    const fill = red ? toneBig('down') : undefined;
    const kind = p.where ? KINDS[p.where] : undefined;
    const dim = clamp01((f - hit) / 3) * 0.7;
    const shards = Array.from({length: 16}, (_, i) => {
      const t = f - hit;
      if (t < 0) return null;
      const r = (j: number) => Math.sin(seed * 5.3 + i * 9.7 + j * 2.9) * 0.5 + 0.5;
      const a = (i / 16) * Math.PI * 2 + r(1) * 0.3;
      const v = 22 + 18 * r(2);
      const dist = v * t * Math.exp(-t / 22) * 1.4;
      const x = 540 + Math.cos(a) * (260 + dist);
      const y = 830 + Math.sin(a) * (260 + dist) + 0.25 * t * t * 0.2;
      const s = 14 + 18 * r(3);
      return <path key={i} d={poly([[x - s, y], [x, y - s * 0.6], [x + s * 0.8, y + s * 0.3]])} fill={red && i % 4 === 0 ? toneBig('down') : dk ? C.il1 : C.il5} opacity={clamp01(1 - t / 40)} transform={`rotate(${n1(t * (i % 2 ? 9 : -9))} ${n1(x)} ${n1(y)})`} />;
    });
    const text = word ? mtav(word.text) : '';
    const size = text ? fitSize(text, 210, 520) : 0;
    const k = spring({frame: f - hit, fps: 30, config: {mass: 1, stiffness: 520, damping: 26}});
    const wob = 1 + 0.015 * osc(f, 14);
    pic = (
      <>
        {kind ? (
          <Plane depth={0.6}>
            <Svg>
              <Backdrop kind={kind} uid={uid} frame={f} time={time} />
              <rect x={0} y={300} width={1080} height={1200} fill={dk ? '#000000' : C.bg} opacity={dim} />
            </Svg>
          </Plane>
        ) : null}
        <Plane depth={1}>
          <Svg>
            <Shockwave frame={f} x={540} y={830} r={520} at={hit + 1} dur={16} color={red ? toneBig('down') : dk ? C.il0 : C.il5} width={22} />
            <Shockwave frame={f} x={540} y={830} r={640} at={hit + 5} dur={18} color={dk ? C.il2 : C.il4} width={12} />
            {shards}
            <g transform={`translate(540 830) scale(${wob.toFixed(4)}) translate(-540 -830)`}>
              <Burst frame={f} x={540} y={830} r={400} inner={0.7} points={14} at={hit} seed={seed} uid={uid} tone={0} fill={fill} time={time} />
            </g>
            {text && f >= hit ? (
              <text className={TXT} x={540} y={830 + size * 0.36} textAnchor="middle" fontFamily={F.sans} fontWeight={700} fontSize={size} letterSpacing={-size * 0.01} fill={red ? C.onInk : '#0B0B0B'} transform={`translate(540 830) rotate(-4) scale(${(0.5 + 0.5 * k).toFixed(3)}) translate(-540 -830)`}>
                {text}
              </text>
            ) : null}
          </Svg>
        </Plane>
      </>
    );
    if (hit >= Math.max(0, base) || (ctx.index === 0 && hit < 0)) {
      const sf = Math.max(0, hit);
      cues.push(<Sfx key="b" name="synth-bass_hit" at={sf} volume={0.45} />, <Land key="l" at={sf} volume={0.5} />, <Haptic key="h" kind="rigid" at={sf} />);
    }
    cam = {move: 'still'};
  } else if (staging === 'bump') {
    // car A rolls in from the left at walking pace and touches car B; both rock; the driver facepalms
    const contact = Math.max(e + 18, hit === 0 && p.at === undefined ? e + 26 : hit);
    const xA0 = -60;
    const touch = 236; // car A's centre at the touch
    const tA = f - e;
    const xA = f < contact ? xA0 + (touch - xA0) * clamp01(tA / Math.max(1, contact - e)) : touch - 14 * Math.exp(-(f - contact) / 6) * Math.sin(Math.min(1, (f - contact) / 6) * Math.PI);
    const rockA = f >= contact ? -1.6 * Math.exp(-(f - contact) / 12) * Math.sin((f - contact) / 3) : 0;
    const rockB = f >= contact ? 1.2 * Math.exp(-(f - contact) / 14) * Math.sin((f - contact) / 3.2) : 0;
    const dent = f >= contact ? clamp01((f - contact) / 3) : 0;
    const ground = 1150;
    const len = 520;
    const cx = touch + len / 2 + 4;
    const stars = [0, 1, 2].map((i) => <Glint key={i} x={cx + (i - 1) * 30} y={ground - 120 - i * 40} size={40 + i * 10} at={contact + i * 2} frame={f} dur={16} />);
    pic = (
      <>
        <Plane depth={0.6}>
          <Svg>
            <Backdrop kind={KINDS[p.where ?? 'city'] ?? 'city'} uid={uid} frame={f} time={time} base={ground - 60} />
          </Svg>
        </Plane>
        <Plane depth={1}>
          <Svg>
            <rect x={-100} y={ground - 60} width={1280} height={500} fill={dk ? C.il7 : C.il3} />
            <Figure uid={uid} cast="me" x={600} y={ground - 70} size={470} frame={f} turn={0.3} acts={[{at: -100, face: 'neutral', pose: 'stand'}, {at: contact + 8, pose: 'facepalm', face: 'sad'}]} time={time} />
            <Shadow uid={uid} cx={xA} cy={ground + 2} rx={len * 0.46} ry={14} />
            <Shadow uid={uid} cx={touch + len + 10} cy={ground + 2} rx={len * 0.46} ry={14} />
            <Car uid={uid} x={touch + len + 10} y={ground} len={len} body="suv" paint={2} dir={1} frame={f} pitch={rockB} dent={dent} time={time} lights={{brake: f >= contact ? 1 : 0}} />
            <Car uid={uid} x={xA} y={ground} len={len} body={p.body ?? 'sedan'} paint={4} dir={1} frame={f} roll={xA} speed={0.05} pitch={rockA} time={time} lights={{head: 0.5}} />
            {stars}
            <Sparks frame={f} x={cx} y={ground - 120} at={contact} n={10} power={0.6} time={time} uid={uid} />
          </Svg>
        </Plane>
      </>
    );
    cam = {move: 'push', amount: 0.03, origin: {x: cx, y: ground - 120}};
    if (contact >= Math.max(0, base) && contact < ctx.dur) cues.push(<Sfx key="c" name="real-clunk" at={contact} volume={0.45} />, <Haptic key="h" kind="rigid" at={contact} />);
    return (
      <IlloBand uid={uid} time={time}>
        <Camera ctx={ctx} spec={cam} over={p.camera} kicks={[contact]}>
          {pic}
        </Camera>
        {cues}
      </IlloBand>
    );
  } else {
    // crack: a phone screen close-up, or the windshield from the driver's seat
    const hitAt = p.at === undefined ? Math.max(e + 12, 8) : hit;
    const k = clamp01((f - hitAt) / 6);
    const grow = 1 - (1 - k) ** 3;
    const crackCol = dk ? C.il0 : C.il0;
    if (p.glass === 'windshield') {
      const vw = view({hy: 770});
      pic = (
        <>
          <Plane depth={0.6}>
            <Svg>
              <Backdrop kind="mountains" uid={uid} frame={f} time={time} base={vw.hy + 2} />
            </Svg>
          </Plane>
          <Plane depth={1}>
            <Svg>
              <Road v={vw} d={f * 0.7} time={time} uid={uid} />
            </Svg>
          </Plane>
          <Plane depth={1.3}>
            <Svg>
              {f >= hitAt ? <path d={cracks(640, 640, 420, grow, seed)} fill="none" stroke={crackCol} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} /> : null}
              {f >= hitAt ? <circle cx={640} cy={640} r={22 * grow} fill={mix(C.il0, C.il3, 0.3)} opacity={0.6} /> : null}
              <Glint x={700} y={600} size={44} at={hitAt + 6} frame={f} dur={16} />
              <Glint x={560} y={720} size={30} at={hitAt + 10} frame={f} dur={14} />
              <Cabin uid={uid} time={time} frame={f} />
            </Svg>
          </Plane>
        </>
      );
    } else {
      const W = 560;
      const x = 540;
      const y = 900;
      const screen = (sw: number, sh: number) => (
        <g>
          <rect width={sw} height={sh} fill={C.screen} />
          <ellipse cx={sw / 2} cy={sh * 0.3} rx={sw} ry={sh * 0.4} fill={dk ? C.il6 : C.il1} opacity={0.5} />
          {f >= hitAt ? <path d={cracks(sw * 0.62, sh * 0.38, sw * 0.95, grow, seed)} fill="none" stroke={dk ? C.il0 : C.il5} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" /> : null}
          {f >= hitAt ? <path d={star(sw * 0.62, sh * 0.38, 40 * grow, 14 * grow, 7, 0, 0.4, seed)} fill={dk ? C.il1 : C.il3} opacity={0.7} /> : null}
        </g>
      );
      pic = (
        <Plane depth={1}>
          <Svg>
            <Handset uid={uid} x={x} y={y + 6 * Math.exp(-(f - hitAt) / 6) * (f >= hitAt ? Math.sin((f - hitAt) * 1.4) : 0)} w={W} tilt={-6} frame={f} lit={1} time={time} screen={screen} />
            <Glint x={x + 40} y={y - 300} size={50} at={hitAt + 5} frame={f} dur={16} />
            <Glint x={x - 120} y={y - 120} size={34} at={hitAt + 9} frame={f} dur={14} />
          </Svg>
        </Plane>
      );
    }
    cam = {move: 'push', amount: 0.04};
    if (hitAt >= Math.max(0, base) && hitAt < ctx.dur) cues.push(<Sfx key="c" name="asmr-paper-tear" at={hitAt} volume={0.4} />, <Haptic key="h" kind="rigid" at={hitAt} />);
    return (
      <IlloBand uid={uid} time={time}>
        <Camera ctx={ctx} spec={cam} over={p.camera} kicks={[hitAt]}>
          {pic}
        </Camera>
        {cues}
      </IlloBand>
    );
  }
  return (
    <IlloBand uid={uid} time={time}>
      <Camera ctx={ctx} spec={cam} over={p.camera} kicks={[Math.max(0, hit)]}>
        {pic}
      </Camera>
      {cues}
    </IlloBand>
  );
};
