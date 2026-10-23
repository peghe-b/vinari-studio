// V124AirportWeek: a week away, then the airport's car park at dusk. One place (the open lot by the terminal), one
// traveller ("me" in an overcoat, his suitcase), one hero car (the coupe-SUV in the film's accent). Each `shot` is a new
// picture of the same place: the arrival under a landing plane, the lot seen from above the lamps (rows that never end),
// the key fob pressed and nothing answering, the call, the walk into the night, and the next trip, when the car blinks
// back at once. `step` is the app's step (the real screen in a whole phone).
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, Sfx} from '../common';
import {L} from '../../tokens';
import {prog} from '../../lib/anim';
import {CameraLayer, Hud} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import type {SceneCtx} from '../../types';
import {IlloBand, Svg, TOP, FOOT, osc} from '../illo/scene';
import {Car} from '../illo/car';
import {Figure} from '../illo/figure';
import {Hand, handAnchor} from '../illo/hand';
import {Rings} from '../illo/fx';
import {Solid, rr, capsule, poly} from '../illo/solid';
import {acc, accRamp, far, ground, lamp, lit, mix, tone, glowK, type Time} from '../illo/palette';
import {WHITE} from '../kit/stage';

type P = {
  look?: 'illustrated' | 'diagram';
  shot?: 'arrive' | 'rows' | 'fob' | 'call' | 'walk' | 'lamps' | 'found';
  hitAt?: number | string;
  line?: string;
  time?: Time;
};

const ME = {is: 'me', outfit: 'overcoat', hair: 'textured', extras: ['watch']} as const;
const HORIZON = 760;

/** the sky's last light and the terminal on the horizon, a control tower at the right */
const Terminal: React.FC<{time: Time; frame: number; y?: number; s?: number}> = ({time, frame, y = HORIZON, s = 1}) => {
  const body = far(0.55, time);
  const win = lamp(time);
  const topY = y - 120 * s;
  return (
    <g>
      <rect x={-200} y={TOP} width={1480} height={y - TOP} fill={ground(time)} />
      <rect x={-200} y={y - 260} width={1480} height={260} fill={mix(ground(time), far(0.9, time), 0.35)} />
      <path d={`M-200 ${y} L-200 ${topY + 30} L320 ${topY + 30} L380 ${topY} L1280 ${topY} L1280 ${y} Z`} fill={body} />
      {Array.from({length: 22}, (_, i) => (
        <rect key={i} x={-120 + i * 62} y={topY + 46 * s} width={40} height={30 * s} fill={win} opacity={0.35 + 0.25 * ((i * 7) % 3) / 2 + 0.05 * osc(frame + i * 9, 70)} />
      ))}
      <rect x={830} y={y - 330 * s} width={36} height={220 * s} fill={body} />
      <path d={rr(800, y - 372 * s, 96, 48 * s, 12)} fill={body} />
      <rect x={812} y={y - 360 * s} width={72} height={18 * s} fill={win} opacity={0.7} />
    </g>
  );
};

/** a plane gliding down to the runway, its landing light blinking in the accent's companion colour */
const Plane: React.FC<{uid: string; x: number; y: number; s: number; time: Time; frame: number}> = ({uid, x, y, s, time, frame}) => {
  const ink = far(0.15, time);
  const on = (frame % 24) < 4 ? 1 : 0.2;
  return (
    <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s}) rotate(7)`}>
      <Solid uid={uid} d={capsule(-150, 0, 17, 150, 0, 12)} fill={ink} shade="flat" />
      <Solid uid={uid} d={poly([[-30, 0], [40, 0], [-50, 90], [-80, 90]])} fill={ink} shade="flat" />
      <Solid uid={uid} d={poly([[-30, -4], [30, -4], [-40, -60], [-64, -60]])} fill={ink} shade="flat" />
      <Solid uid={uid} d={poly([[105, -6], [150, -6], [165, -64], [140, -64]])} fill={ink} shade="flat" />
      <circle cx={-150} cy={4} r={9} fill={acc('b')} opacity={on} />
      <circle cx={-150} cy={4} r={34} fill={acc('b')} opacity={0.18 * on * glowK(time)} />
    </g>
  );
};

/** the asphalt from the horizon to past the frame's foot, bay lines only above the subtitle band */
const Lot: React.FC<{time: Time; y?: number; lines?: number[]}> = ({time, y = HORIZON, lines = []}) => (
  <g>
    <rect x={-200} y={y} width={1480} height={FOOT - y} fill={mix(far(0.1, time), ground(time), 0.25)} />
    {lines.map((ly, i) => (
      <rect key={i} x={-200} y={ly} width={1480} height={4 + i} fill={lit(time)} opacity={0.22} />
    ))}
  </g>
);

/** a lamp post, its head glowing over the lot */
const Post: React.FC<{x: number; y: number; h: number; time: Time; sign?: string}> = ({x, y, h, time, sign}) => (
  <g>
    <rect x={x - 5} y={y - h} width={10} height={h} fill={far(0.05, time)} />
    <path d={rr(x - 44, y - h - 10, 88, 16, 8)} fill={far(0.05, time)} />
    <ellipse cx={x} cy={y - h + 10} rx={70} ry={26} fill={lamp(time)} opacity={0.35 * glowK(time) + 0.1} />
    {sign ? (
      <g>
        <path d={rr(x - 34, y - h + 40, 68, 68, 10)} fill={lamp(time)} />
        <text x={x} y={y - h + 92} textAnchor="middle" fontSize={50} fontWeight={700} fill={far(0, time)} style={{fontFamily: 'FiraGO, sans-serif'}}>
          {sign}
        </text>
      </g>
    ) : null}
  </g>
);

/** a row of parked cars (scenery: grey, unlit), side by side, seen from the side */
const Row: React.FC<{uid: string; y: number; len: number; x0: number; n: number; gap: number; time: Time; frame: number; dir?: 1 | -1; seed?: number; dim?: number}> = ({uid, y, len, x0, n, gap, time, frame, dir = 1, seed = 0, dim = 1}) => {
  const bodies = ['sedan', 'suv', 'hatch', 'ev', 'sedan', 'coupe'] as const;
  return (
    <g opacity={dim}>
      {Array.from({length: n}, (_, i) => (
        <Car key={i} uid={uid} x={x0 + i * gap} y={y} len={len} body={bodies[(i + seed) % 6]} paint={1 + ((i * 3 + seed) % 5)} dir={dir} frame={frame} time={time} scenery />
      ))}
    </g>
  );
};

/** the suitcase on its wheels, the handle up */
const Suitcase: React.FC<{uid: string; x: number; y: number; s?: number; time: Time}> = ({uid, x, y, s = 1, time}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x={-6} y={-250} width={8} height={90} fill={tone(5)} />
    <rect x={30} y={-250} width={8} height={90} fill={tone(5)} />
    <rect x={-10} y={-258} width={52} height={14} rx={6} fill={tone(6)} />
    <Solid uid={uid} d={rr(-40, -170, 120, 160, 16)} tone={time === 'day' ? 5 : 4} time={time} />
    <rect x={-14} y={-160} width={6} height={140} fill={tone(6)} opacity={0.5} />
    <rect x={44} y={-160} width={6} height={140} fill={tone(6)} opacity={0.5} />
    <circle cx={-22} cy={-4} r={9} fill={tone(7)} />
    <circle cx={62} cy={-4} r={9} fill={tone(7)} />
  </g>
);

const Punch: React.FC<{text?: string; at: number; y0?: number}> = ({text, at, y0 = 420}) =>
  text ? (
    <Hud>
      <div style={{position: 'absolute', left: L.camSafe.left, top: y0, whiteSpace: 'nowrap'}}>
        <Words text={text} at={at} fx="slam" size={92} color={WHITE} />
      </div>
    </Hud>
  ) : null;

/** 1. the arrival: the plane comes down behind the terminal, he walks out with his suitcase into the lot */
const Arrive: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const f = useCurrentFrame();
  const time: Time = p.time ?? 'dusk';
  const hit = Math.max(lead(ctx) + 12, cueFrame(ctx, p.hitAt ?? 1));
  const k = prog(f, -20, Math.max(60, ctx.dur + 20));
  return (
    <IlloBand uid={uid} time={time}>
      <CameraLayer depth={0.6}>
        <Svg>
          <Terminal time={time} frame={f} />
          <Plane uid={uid} x={980 - 420 * k} y={470 + 90 * k} s={1.05} time={time} frame={f} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          <Lot time={time} lines={[980, 1180]} />
          <Row uid={uid} y={960} len={300} x0={-40} n={5} gap={290} time={time} frame={f} seed={1} />
          <Post x={820} y={1000} h={330} time={time} />
          <Suitcase uid={uid} x={500 + 40 * k} y={1350} s={1} time={time} />
          <Figure uid={uid} cast={ME} x={360 + 40 * k} y={1355} size={600} pose="walk" face="neutral" turn={0.5} frame={f} time={time} acts={[{at: hit, face: 'worried', pose: 'stand', turn: 0.3}]} />
        </Svg>
      </CameraLayer>
      <Punch text={p.line} at={hit} />
      <Sfx name="asmr-air-long" at={lead(ctx)} volume={0.2} />
      <Haptic kind="light" at={hit} volume={0.25} />
    </IlloBand>
  );
};

/** 2. the lot from above the lamps: rows after rows, lettered posts, and him small in the middle, turning */
const Rows: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const f = useCurrentFrame();
  const time: Time = p.time ?? 'dusk';
  const hit = Math.max(lead(ctx) + 10, cueFrame(ctx, p.hitAt ?? 0));
  const rows = [
    {y: 640, len: 150, gap: 150, n: 9, x0: -20, dim: 0.75},
    {y: 760, len: 200, gap: 200, n: 7, x0: -60, dim: 0.85},
    {y: 920, len: 260, gap: 262, n: 6, x0: -100, dim: 1},
    {y: 1130, len: 340, gap: 345, n: 5, x0: -150, dim: 1},
  ];
  return (
    <IlloBand uid={uid} time={time}>
      <CameraLayer depth={0.6}>
        <Svg>
          <Terminal time={time} frame={f} y={520} s={0.6} />
          <Lot time={time} y={520} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          {rows.map((r, i) => (
            <g key={i}>
              <rect x={-200} y={r.y + 6} width={1480} height={3 + i} fill={lit(time)} opacity={0.18} />
              <Row uid={uid} y={r.y} len={r.len} x0={r.x0 + ((i % 2) * r.gap) / 2} n={r.n} gap={r.gap} time={time} frame={f} seed={i * 2} dim={r.dim} />
            </g>
          ))}
          <Post x={250} y={1000} h={300} time={time} sign="C" />
          <Post x={800} y={1000} h={300} time={time} sign="D" />
          <Figure uid={uid} cast={ME} x={540} y={1340} size={360} pose="stand" face="worried" turn={-0.6} frame={f} time={time} acts={[{at: hit, turn: 0.6, pose: 'shrug'}]} />
        </Svg>
      </CameraLayer>
    </IlloBand>
  );
};

/** 3. the key fob: his hand comes in from the left, the thumb presses, the button lights, and the lot stays dark */
const Fob: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const f = useCurrentFrame();
  const time: Time = p.time ?? 'dusk';
  const e = entrance(ctx);
  const press1 = Math.max(lead(ctx) + 8, cueFrame(ctx, 0) + 8);
  const press2 = Math.max(press1 + 24, cueFrame(ctx, p.hitAt ?? 1));
  const pr = (at: number) => prog(f, at, 4) * (1 - prog(f, at + 8, 8));
  const press = Math.max(pr(press1), pr(press2));
  const rise = 1 - prog(f, e, 16);
  const hand = {x: 120, y: 1220 + 90 * rise, size: 560, angle: 38, pose: 'pinch' as const};
  const [fx, fy] = handAnchor(hand);
  const lit1 = Math.max(prog(f, press1, 3) * (1 - prog(f, press1 + 10, 8)), prog(f, press2, 3) * (1 - prog(f, press2 + 10, 8)));
  return (
    <IlloBand uid={uid} time={time}>
      <CameraLayer depth={0.6}>
        <Svg style={{filter: 'blur(7px)'}}>
          <Terminal time={time} frame={f} y={620} s={0.8} />
          <Lot time={time} y={620} />
          <Row uid={uid} y={820} len={330} x0={-60} n={5} gap={330} time={time} frame={f} seed={3} />
          <Row uid={uid} y={1060} len={440} x0={-180} n={4} gap={440} time={time} frame={f} seed={4} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1.3}>
        <Svg>
          <Hand uid={uid} {...hand} sleeve={6} press={press} time={time} />
          <g transform={`translate(${(fx + 18).toFixed(1)} ${(fy - 40).toFixed(1)}) rotate(38)`}>
            <circle cx={0} cy={-110} r={26} fill="none" stroke={tone(4)} strokeWidth={7} />
            <Solid uid={uid} d={rr(-62, -92, 124, 196, 46)} tone={7} time={time} />
            <circle cx={0} cy={-32} r={24} fill={tone(5)} />
            <circle cx={0} cy={36} r={24} fill={mix(tone(5), acc('a'), lit1)} />
            <circle cx={0} cy={36} r={60} fill={acc('a')} opacity={0.45 * lit1} />
          </g>
          <Rings frame={f} x={fx + 40} y={fy - 40} r={90} at={press2 + 2} count={3} dur={30} color={lit(time)} width={4} />
        </Svg>
      </CameraLayer>
      <Sfx name="asmr-tap" at={press1} volume={0.3} />
      <Sfx name="asmr-tap" at={press2} volume={0.34} />
      <Haptic kind="light" at={press2} volume={0.25} />
    </IlloBand>
  );
};

/** 4. on the phone to a friend among the parked rows; the friend's answer lands as a facepalm */
const Call: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const f = useCurrentFrame();
  const time: Time = p.time ?? 'dusk';
  const hit = Math.max(lead(ctx) + 12, cueFrame(ctx, p.hitAt ?? 1));
  return (
    <IlloBand uid={uid} time={time}>
      <CameraLayer depth={0.6}>
        <Svg>
          <Terminal time={time} frame={f} y={700} s={0.9} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          <Lot time={time} y={700} lines={[1000]} />
          <Row uid={uid} y={900} len={360} x0={-120} n={4} gap={370} time={time} frame={f} seed={5} />
          <Post x={190} y={1040} h={360} time={time} />
          <Suitcase uid={uid} x={700} y={1350} s={1.1} time={time} />
          <Figure uid={uid} cast={ME} x={520} y={1355} size={640} pose="phoneEar" face="worried" turn={0.55} frame={f} time={time} acts={[{at: hit, pose: 'facepalm', face: 'meh', turn: 0.4}]} />
        </Svg>
      </CameraLayer>
      <Punch text={p.line} at={hit} />
      <Land at={hit} />
    </IlloBand>
  );
};

/** 5. the walk into the night: lamps slide past in the foreground, the suitcase in tow */
const Walk: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const f = useCurrentFrame();
  const time: Time = p.time ?? 'night';
  const k = f / Math.max(60, ctx.dur);
  return (
    <IlloBand uid={uid} time={time}>
      <CameraLayer depth={0.6}>
        <Svg>
          <Terminal time={time} frame={f} y={720} s={0.7} />
          <Lot time={time} y={720} lines={[1010]} />
          <Row uid={uid} y={930} len={300} x0={-200 + 140 * k} n={6} gap={300} time={time} frame={f} seed={2} dim={0.9} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          <Figure uid={uid} cast={ME} x={600} y={1355} size={600} pose="walk" face="sad" turn={-0.5} flip frame={f} time={time} />
          <Suitcase uid={uid} x={760} y={1352} s={1} time={time} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1.3}>
        <Svg>
          {[0, 1, 2].map((i) => {
            const x = ((i * 520 + 360 * k * 3 + 100) % 1560) - 240;
            return <Post key={i} x={x} y={1370} h={760} time={time} />;
          })}
        </Svg>
      </CameraLayer>
      <Sfx name="asmr-air" at={lead(ctx)} volume={0.16} />
    </IlloBand>
  );
};

/** 6. the next trip: he walks straight to the car, it blinks back at once (the hero coupe-SUV in the accent) */
const Found: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const f = useCurrentFrame();
  const time: Time = p.time ?? 'day';
  const hit = Math.max(lead(ctx) + 10, cueFrame(ctx, p.hitAt ?? 1));
  const on = prog(f, hit, 3);
  const walk = prog(f, 0, Math.max(40, hit));
  return (
    <IlloBand uid={uid} time={time}>
      <CameraLayer depth={0.6}>
        <Svg>
          <Terminal time={time} frame={f} y={700} s={0.8} />
          <Lot time={time} y={700} lines={[1250]} />
          <Row uid={uid} y={900} len={300} x0={-80} n={5} gap={300} time={time} frame={f} seed={6} dim={0.85} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          <Car uid={uid} x={420} y={1180} len={300} body="sedan" paint={4} frame={f} time={time} scenery />
          <Car uid={uid} x={650} y={1180} len={560} body="suv" paint="a" caliper="b" frame={f} time={time} lights={{hazard: on, head: on * 0.8}} />
          <Figure uid={uid} cast={ME} x={150 + 110 * walk} y={1350} size={560} pose={on > 0 ? 'thumbsUp' : 'phoneLook'} hold={on > 0 ? null : 'phone'} face={on > 0 ? 'smile' : 'neutral'} turn={0.6} frame={f} time={time} />
        </Svg>
      </CameraLayer>
      <Punch text={p.line} at={hit} />
      <Sfx name="asmr-pop" at={hit} volume={0.3} />
      <Haptic kind="rigid" at={hit + 1} volume={0.3} />
    </IlloBand>
  );
};

/** 7. night has fallen: the lot from high up, every lamp on, the rows gone dark, and him under one lamp with the suitcase */
const Lamps: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const f = useCurrentFrame();
  const time: Time = p.time ?? 'night';
  const k = f / Math.max(60, ctx.dur);
  const lamps = [
    [160, 700, 150], [430, 700, 150], [700, 700, 150], [950, 700, 150],
    [80, 930, 230], [420, 930, 230], [760, 930, 230], [1040, 930, 230],
  ];
  return (
    <IlloBand uid={uid} time={time}>
      <CameraLayer depth={0.6}>
        <Svg>
          <Terminal time={time} frame={f} y={480} s={0.5} />
          <Lot time={time} y={480} />
          <Row uid={uid} y={600} len={140} x0={-40} n={9} gap={140} time={time} frame={f} seed={7} dim={0.7} />
          <Row uid={uid} y={820} len={210} x0={-80} n={7} gap={210} time={time} frame={f} seed={8} dim={0.85} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          {lamps.map(([x, y, h], i) => (
            <Post key={i} x={x} y={y} h={h} time={time} />
          ))}
          <Row uid={uid} y={1110} len={320} x0={-140} n={5} gap={330} time={time} frame={f} seed={9} />
          <ellipse cx={560} cy={1330} rx={230} ry={46} fill={lamp(time)} opacity={0.16} />
          <Post x={430} y={1330} h={560} time={time} />
          <Figure uid={uid} cast={ME} x={590 - 30 * k} y={1340} size={330} pose="slumped" face="sad" turn={-0.6} frame={f} time={time} />
          <Suitcase uid={uid} x={690 - 30 * k} y={1338} s={0.55} time={time} />
        </Svg>
      </CameraLayer>
    </IlloBand>
  );
};

export const V124AirportWeek: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  switch (p.shot) {
    case 'rows':
      return <Rows p={p} ctx={ctx} />;
    case 'fob':
      return <Fob p={p} ctx={ctx} />;
    case 'call':
      return <Call p={p} ctx={ctx} />;
    case 'walk':
      return <Walk p={p} ctx={ctx} />;
    case 'found':
      return <Found p={p} ctx={ctx} />;
    case 'lamps':
      return <Lamps p={p} ctx={ctx} />;
    default:
      return <Arrive p={p} ctx={ctx} />;
  }
};
