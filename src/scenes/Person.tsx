// src/scenes/Person.tsx: characters acting (illustrated, the "Graphite" kit): a reaction, a feeling, a dialogue, "me".
// A face that reads at phone size, a body that acts; never a stick figure.
//
// Stagings:
//   solo    (default) one character, bust crop, the face is the point (size 1500, head at 540, 640)
//   pair    two characters in three-quarter view facing each other; speech bubbles alternate over their heads
//   think   one character and a thought cloud with an icon (car, money, wrench, heart, clock, question, phone, ...)
//   full    the whole figure on its ground (size 760, feet at 1250): walk in, jump, point; a place behind, an optional
//           parked car beside (`car`) and a held item
// Props: cast* (a preset or {is, seed, face, pose, hold, turn}; two for pair), acts [{at, who: 0 | 1, face, pose, say,
//   fx, turn, hold}] (say <= 3 words: a speech bubble, never the voice's words), think (an icon), backdrop (room | city |
//   station | garage | mountains | highway | none), hold (an item), car ({body, paint, x}: full only), enter (walk |
//   slide | none), charge {at, until} (static: small sparks crackle around the figure, the accent), time, word,
//   camera, seed.
// Frame 0: the face already reacting. Sounds: asmr-pop per bubble, Haptic light per face change, asmr-whoomp on shock,
//   asmr-shimmer on a sparkle or the shades, asmr-paper soft on a shrug.
import React, {useId} from 'react';
import {spring, useCurrentFrame} from 'remotion';
import {mtav} from '../lib/format';
import {TXT} from '../lib/layer';
import {textWidth} from '../lib/measure';
import {C, F, SPRING, toneBig, type Tone} from '../tokens';
import type {SceneCtx} from '../types';
import {entrance, Haptic, lead, Sfx} from './common';
import {actsAt, type Act, type ActSpec} from './illo/acting';
import {Backdrop, type BackdropKind} from './illo/backdrop';
import {Camera, Hud, Plane, type CamSpec} from './illo/cam';
import {Car, type CarBody} from './illo/car';
import {Figure, headAt, type Cast} from './illo/figure';
import {Icon} from './illo/icons';
import {dark, type Time} from './illo/palette';
import {isItem, type Item} from './illo/props';
import {circ, paint, rr, Shadow, Solid} from './illo/solid';
import {at as atF, clamp01, IlloBand, n1, osc, stagingOf, Svg, timeOf} from './illo/scene';
import {Punch, wordOf} from './illo/type';

const STAGINGS = ['solo', 'pair', 'think', 'full'] as const;
type P = {
  staging?: (typeof STAGINGS)[number];
  cast?: Cast | Cast[];
  acts?: ActSpec[];
  think?: string;
  backdrop?: string;
  hold?: string;
  car?: {body?: CarBody; paint?: number; x?: number; dir?: 1 | -1};
  charge?: {at?: number | string; until?: number | string};
  enter?: 'walk' | 'slide' | 'none';
  time?: Time;
  word?: unknown;
  tone?: Tone;
  camera?: CamSpec;
  seed?: number;
};

const KINDS: Record<string, BackdropKind | null> = {room: 'room', city: 'city', street: 'city', station: 'station', garage: 'garage', mountains: 'mountains', highway: 'highway', road: 'highway', none: null};

/** A speech bubble pointing at (tx, ty), its text in the film's capitals. */
const Bubble: React.FC<{text: string; x: number; y: number; tx: number; ty: number; k: number; size?: number; time: Time}> = ({text, x, y, tx, ty, k, size = 64, time}) => {
  const shown = mtav(text);
  const font = `700 ${size}px ${F.sans}`;
  const w = Math.max(size * 1.6, textWidth(shown, font) + size * 1.1);
  const h = size * 1.6;
  const dk = dark(time);
  const fill = dk ? C.il0 : C.il0;
  const ink = dk ? C.il7 : C.ilFeature;
  const bx = x - w / 2;
  const by = y - h / 2;
  // the tail: from the bubble's bottom toward the mouth
  const ax = Math.max(bx + h * 0.4, Math.min(bx + w - h * 0.4, tx));
  const tail = `M${n1(ax - h * 0.2)} ${n1(by + h - 4)}L${n1(tx + (ax - tx) * 0.35)} ${n1(ty)}L${n1(ax + h * 0.18)} ${n1(by + h - 4)}Z`;
  const s = 0.3 + 0.7 * k;
  return (
    <g transform={`translate(${n1(tx)} ${n1(ty)}) scale(${s.toFixed(3)}) translate(${n1(-tx)} ${n1(-ty)})`} opacity={clamp01(k * 3)}>
      <path d={rr(bx, by, w, h, h / 2) + tail} fill={fill} stroke={dk ? 'none' : C.ilEdge} strokeWidth={2.5} strokeLinejoin="round" />
      <text className={TXT} x={x} y={y + size * 0.36} textAnchor="middle" fontFamily={F.sans} fontWeight={700} fontSize={size} fill={ink}>
        {shown}
      </text>
    </g>
  );
};

export const Person: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const f = useCurrentFrame();
  const uid = useId();
  const staging = stagingOf(p, STAGINGS);
  const time = timeOf(p);
  const e = entrance(ctx);
  const base = lead(ctx);
  const casts: Cast[] = Array.isArray(p.cast) ? p.cast : [p.cast ?? 'me'];
  if (staging === 'pair' && casts.length < 2) casts.push('friend');
  const specs = p.acts ?? [];
  const actsOf = (who: number): Act[] => actsAt(ctx, specs, who);
  const hold: Item | undefined = isItem(p.hold) ? p.hold : undefined;
  const kind = KINDS[p.backdrop ?? (staging === 'full' ? 'city' : 'room')] ?? null;
  const word = wordOf(p.word, ctx, 1);
  const dk = dark(time);
  // the bubbles: every act with `say`, until that character's next `say` (at most 70 frames)
  const says = specs
    .map((a) => ({who: a.who ?? 0, text: a.say ?? '', at: atF(ctx, a.at, 0)}))
    .filter((s) => s.text.trim())
    .sort((a, b) => a.at - b.at);
  const sayNow = (who: number) => {
    const mine = says.filter((s) => s.who === who && s.at <= f);
    const s = mine[mine.length - 1];
    if (!s) return null;
    const next = says.find((n) => n.at > s.at && n.who === who);
    if (f > s.at + 70 || (next && f >= next.at)) return null;
    return {...s, k: spring({frame: f - s.at, fps: 30, config: SPRING.land})};
  };
  const all = specs.map((a) => ({...a, at: atF(ctx, a.at, 0)}));
  const kicks = all.filter((a) => a.face === 'shock' || a.face === 'laugh' || a.pose === 'jump' || a.pose === 'handsHead' || a.pose === 'armsUp').map((a) => a.at);

  let pic: React.ReactNode;
  let cam: CamSpec;
  const back = kind ? (
    <Plane depth={0.6}>
      <Svg>
        <Backdrop kind={kind} uid={uid} frame={f} time={time} opacity={staging === 'full' ? 1 : 0.7} base={staging === 'full' ? 1290 : undefined} />
      </Svg>
    </Plane>
  ) : null;
  if (staging === 'solo') {
    const k = p.enter === 'none' ? 1 : spring({frame: f - e, fps: 30, config: SPRING.enter});
    const x = 540 + 60 * (1 - k);
    const y = 660;
    const s = sayNow(0);
    cam = {move: 'push', amount: 0.045, origin: {x: 540, y: 640}};
    pic = (
      <>
        {back}
        <Plane depth={1}>
          <Svg>
            <Figure uid={uid} cast={casts[0]} x={x} y={y} size={1500} crop="bust" frame={f} acts={actsOf(0)} hold={hold} time={time} turn={0.25 * (1 - k)} />
            {s ? <Bubble text={s.text} x={800} y={430} tx={640} ty={600} k={s.k} time={time} /> : null}
          </Svg>
        </Plane>
      </>
    );
  } else if (staging === 'pair') {
    const k = spring({frame: f - e, fps: 30, config: SPRING.enter});
    const size = 900;
    const feet = 1420;
    const xs = [320 - 40 * (1 - k), 760 + 40 * (1 - k)];
    cam = {move: 'push', amount: 0.03, origin: {x: 540, y: 800}};
    pic = (
      <>
        {back}
        <Plane depth={1}>
          <Svg>
            {[0, 1].map((who) => (
              <g key={who}>
                <Shadow uid={uid} cx={xs[who]} cy={feet} rx={150} />
                <Figure uid={uid} cast={casts[who]} x={xs[who]} y={feet} size={size} turn={who === 0 ? 0.45 : -0.45} frame={f} acts={actsOf(who)} time={time} />
              </g>
            ))}
            {[0, 1].map((who) => {
              const s = sayNow(who);
              if (!s) return null;
              const [hx, hy] = headAt(xs[who], feet, size);
              return <Bubble key={who} text={s.text} x={who === 0 ? 300 : 780} y={hy - 150} tx={hx + (who === 0 ? 30 : -30)} ty={hy - 60} k={s.k} size={60} time={time} />;
            })}
          </Svg>
        </Plane>
      </>
    );
  } else if (staging === 'think') {
    const k = spring({frame: f - e, fps: 30, config: SPRING.enter});
    const icon = p.think ?? 'question';
    const ck = spring({frame: f - (e + 8), fps: 30, config: SPRING.enterXL});
    const fl = 8 * osc(f, 60);
    cam = {move: 'push', amount: 0.04, origin: {x: 520, y: 700}};
    const cloud = [circ(660, 560 + fl, 150), circ(810, 540 + fl, 120), circ(750, 440 + fl, 130), circ(580, 470 + fl, 110), circ(880, 630 + fl, 76), circ(560, 640 + fl, 100), circ(730, 660 + fl, 110)].join('');
    pic = (
      <>
        {back}
        <Plane depth={1}>
          <Svg>
            <Figure uid={uid} cast={casts[0]} x={380 + 40 * (1 - k)} y={900} size={1300} crop="bust" turn={0.3} frame={f} acts={actsOf(0)} hold={hold} time={time} gaze={[0.5, -0.4]} />
          </Svg>
        </Plane>
        <Plane depth={1.1}>
          <Svg>
            <g transform={`translate(760 560) scale(${ck.toFixed(3)}) translate(-760 -560)`} opacity={clamp01(ck * 2)}>
              <Solid uid={uid} d={circ(500, 770, 22) + circ(548, 712, 34)} tone={0} fill={dk ? C.il1 : C.il0} time={time} outline />
              {/* one contour around the union of the puffs: the stroke under, the fill over it */}
              {dk ? null : <path d={cloud} fill="none" stroke={C.ilEdge} strokeWidth={5} strokeLinejoin="round" />}
              <path d={cloud} fill={dk ? C.il1 : C.il0} />
              <Icon name={icon} x={720} y={548 + fl} size={210} color={dk ? C.il6 : C.ilFeature} accent={C.il7} />
            </g>
          </Svg>
        </Plane>
      </>
    );
  } else {
    // full: the whole figure; it walks in from the left unless enter is none
    const ground = 1290;
    const enterWalk = p.enter === 'walk' || (p.enter === undefined && !p.car);
    const walkEnd = e + 22;
    const tw = clamp01((f - e) / 22);
    const fx0 = p.car ? 380 : 540;
    const x = enterWalk ? fx0 - 420 * (1 - (1 - (1 - tw) ** 2)) : fx0;
    const walking = enterWalk && f < walkEnd;
    const acts: Act[] = walking ? [{at: -1e4, pose: 'walk'}, {at: walkEnd, pose: 'stand'}, ...actsOf(0)] : actsOf(0);
    const s = sayNow(0);
    const car = p.car;
    const [hx, hy] = headAt(x, ground, 680);
    const chargeAt = p.charge ? atF(ctx, p.charge.at, e + 10) : Infinity;
    const chargeEnd = p.charge?.until !== undefined ? atF(ctx, p.charge.until, Infinity) : Infinity;
    cam = {move: 'drift-r', travel: 20};
    pic = (
      <>
        {back}
        <Plane depth={1}>
          <Svg>
            <rect x={-100} y={ground} width={1280} height={300} fill={dk ? C.il7 : C.il2} />
            {car ? (
              <>
                <Shadow uid={uid} cx={car.x ?? 760} cy={ground + 2} rx={420} ry={20} />
                <Car uid={uid} x={car.x ?? 760} y={ground} len={980} body={car.body ?? 'sedan'} paint={car.paint ?? 3} dir={car.dir ?? -1} frame={f} time={time} />
              </>
            ) : null}
            <Shadow uid={uid} cx={x} cy={ground + 2} rx={120} />
            <Figure uid={uid} cast={casts[0]} x={x} y={ground} size={680} frame={f} acts={acts} hold={hold} time={time} />
            {f >= chargeAt && f < chargeEnd ? <Charge uid={uid} x={x} ground={ground} size={680} f={f} at={chargeAt} time={time} /> : null}
            {s ? <Bubble text={s.text} x={hx + 220} y={hy - 140} tx={hx + 50} ty={hy - 40} k={s.k} time={time} /> : null}
          </Svg>
        </Plane>
      </>
    );
  }

  // sounds: a pop per bubble, a light haptic per face change, a whoomp on shock, a shimmer on a sparkle, paper on a shrug
  const cues: React.ReactNode[] = [];
  all.forEach((a, i) => {
    if (a.at < Math.max(0, base) || a.at >= ctx.dur) return;
    if (a.say) cues.push(<Sfx key={`b${i}`} name="asmr-pop" at={a.at} volume={0.32} />);
    if (a.face) cues.push(<Haptic key={`h${i}`} kind="light" at={a.at} />);
    if (a.face === 'shock') cues.push(<Sfx key={`w${i}`} name="asmr-whoomp" at={a.at} volume={0.25} />);
    if (a.face === 'cool' || a.fx === 'sparkle') cues.push(<Sfx key={`s${i}`} name="asmr-shimmer" at={a.at} volume={0.3} />);
    if (a.pose === 'shrug') cues.push(<Sfx key={`p${i}`} name="asmr-paper" at={a.at} volume={0.18} />);
  });
  return (
    <IlloBand uid={uid} time={time}>
      <Camera ctx={ctx} spec={cam} over={p.camera} kicks={kicks}>
        {pic}
        <Hud>
          <Punch word={word} slot={staging === 'solo' || staging === 'think' ? 'low' : 'top'} plate={staging === 'solo' || staging === 'think'} />
        </Hud>
      </Camera>
      {cues}
    </IlloBand>
  );
};



/** Static charge: small zigzag sparks crackling around a standing figure (they jump every 4 frames, 2-frame ramps). */
const Charge: React.FC<{uid: string; x: number; ground: number; size: number; f: number; at: number; time: Time}> = ({uid, x, ground, size, f, at, time}) => {
  const red = toneBig('down');
  const slot = Math.floor((f - at) / 4);
  const q = (f - at) % 4;
  const op = q < 1 ? 0.5 : q < 3 ? 1 : 0.4;
  const bolts: string[] = [];
  for (let i = 0; i < 7; i++) {
    const r = (j: number) => Math.sin(slot * 17.3 + i * 9.1 + j * 3.7) * 0.5 + 0.5;
    const side = i % 2 ? 1 : -1;
    const by = ground - size * (0.15 + 0.78 * r(1));
    const bx = x + side * size * (0.13 + 0.08 * r(2)) * (by < ground - size * 0.75 ? 0.8 : 1);
    let d = `M${n1(bx)} ${n1(by)}`;
    let px = bx;
    let py = by;
    for (let s = 0; s < 4; s++) {
      px += side * (8 + 10 * r(s + 3));
      py += (s % 2 ? 1 : -1) * (10 + 8 * r(s + 7));
      d += `L${n1(px)} ${n1(py)}`;
    }
    bolts.push(d);
  }
  const k = clamp01((f - at) / 6);
  return (
    <g>
      <ellipse cx={x} cy={ground - size * 0.5} rx={size * 0.32} ry={size * 0.56} fill={paint(uid, 'glow-down')} opacity={0.35 * k * (dark(time) ? 1 : 0.6)} />
      <path d={bolts.join('')} fill="none" stroke={red} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" opacity={op * k} />
    </g>
  );
};
