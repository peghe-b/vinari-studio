// src/scenes/Drive.tsx: a car on the road (illustrated, the "Graphite" kit): a trip, speed, winter, rain, night, braking.
//
// Stagings:
//   side   (default) the car in profile, fixed at x 540 with its wheels spinning; the world streams past in parallax: the
//          backdrop (far), the road and its lane dashes (1.0), posts and bushes in the foreground (1.3)
//   rear   from behind, centred: the road converging to a vanishing point, lane dashes streaming toward the camera, the
//          light bar glowing (red on a brake), spray and reflections in the rain, the headlight pool at night
//   top    from above: the road scrolls down, the car centred, other cars passing in the next lanes
// Props: body (sedan | suv | hatch | coupe), paint (ramp 1..5), speed (0 parked .. 1 highway), backdrop (city |
//   mountains | highway | station), weather (clear | rain | snow), traffic (0..3 other cars), events [{is: brake |
//   stop | go | indicate-left | indicate-right | lights, at}], cast (a driver's head in the side window), time, word,
//   camera, seed.
// Frame 0: moving at speed. Tail: it keeps driving (a seamless loop).
// Sounds: real-pass-by on the cut when fast, real-indicator-loop while indicating, real-rain-roof in rain, asmr-whoomp on a
//   brake + Haptic medium on a stop.
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {useBleed} from '../lib/bleed';
import {C, type Tone} from '../tokens';
import type {SceneCtx} from '../types';
import {entrance, Haptic, lead, Sfx} from './common';
import {Backdrop, type BackdropKind} from './illo/backdrop';
import {Camera, Hud, Plane, type CamSpec} from './illo/cam';
import {Car, type CarBody} from './illo/car';
import {Figure, type Cast} from './illo/figure';
import {Rain, Snow, SpeedLines} from './illo/fx';
import {dark, mix, type Time} from './illo/palette';
import {CarAhead, Road, pt, roadTones, scaleAt, view} from './illo/road';
import {circ, paint, rr, Shadow, Solid} from './illo/solid';
import {at, clamp01, FOOT, IlloBand, n1, osc, seedOf, stagingOf, Svg, timeOf, TOP} from './illo/scene';
import {Punch, wordOf} from './illo/type';
import {rand} from '../lib/anim';

const STAGINGS = ['side', 'rear', 'top'] as const;
type Ev = {is: 'brake' | 'stop' | 'go' | 'indicate-left' | 'indicate-right' | 'lights'; at?: number | string};
type P = {
  staging?: (typeof STAGINGS)[number];
  body?: CarBody;
  paint?: number;
  speed?: number;
  backdrop?: string;
  weather?: 'clear' | 'rain' | 'snow' | 'fog';
  traffic?: number;
  events?: Ev[];
  cast?: Cast;
  time?: Time;
  word?: unknown;
  tone?: Tone;
  camera?: CamSpec;
  seed?: number;
};

const KINDS: Record<string, BackdropKind> = {city: 'city', mountains: 'mountains', highway: 'highway', village: 'highway', station: 'station', tunnel: 'highway', street: 'city'};

/** The motion over time: speed (0..1 of the cruise) at a frame, and the distance travelled (units of cruise-frames). */
const motion = (events: {is: string; at: number}[], v0: number) => {
  const changes = events.filter((e) => e.is === 'brake' || e.is === 'stop' || e.is === 'go').sort((a, b) => a.at - b.at);
  const vAt = (f: number) => {
    let v = v0;
    let from = v0;
    let to = v0;
    let t0 = -Infinity;
    let dur = 1;
    for (const c of changes) {
      if (c.at > f) break;
      from = v;
      to = c.is === 'brake' ? v0 * 0.3 : c.is === 'stop' ? 0 : Math.max(v0, 0.5);
      t0 = c.at;
      dur = c.is === 'go' ? 26 : 20;
      v = to;
    }
    if (t0 === -Infinity) return v0;
    const t = clamp01((f - t0) / dur);
    const e = c3(t);
    return from + (to - from) * e;
  };
  const dist = (f: number) => {
    // sum frame by frame from a fixed origin (deterministic: every frame recomputes the same sum)
    let d = 0;
    const a = -60;
    for (let i = a; i < f; i++) d += vAt(i);
    return d;
  };
  return {vAt, dist};
};
const c3 = (t: number) => 1 - (1 - t) ** 3;

export const Drive: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const f = useCurrentFrame();
  const uid = useId();
  const staging = stagingOf(p, STAGINGS);
  const time = timeOf(p);
  const e = entrance(ctx);
  const base = lead(ctx);
  const seed = seedOf(p as Record<string, unknown>);
  const speed = clamp01(p.speed ?? 0.6);
  const events = (p.events ?? []).map((ev) => ({is: ev.is, at: at(ctx, ev.at, 0)}));
  const {vAt, dist} = motion(events, speed);
  const v = vAt(f);
  const d = dist(f);
  const brakeEv = events.filter((ev) => ev.is === 'brake' || ev.is === 'stop');
  const lastBrake = brakeEv.filter((ev) => ev.at <= f).pop();
  const goAfter = lastBrake ? events.find((ev) => ev.is === 'go' && ev.at > lastBrake.at && ev.at <= f) : undefined;
  const brake = lastBrake && !goAfter ? clamp01((f - lastBrake.at) / 2) : 0;
  const dive = lastBrake ? 1.6 * Math.sin(Math.min(1, (f - lastBrake.at) / 9) * Math.PI) * Math.exp(-(f - lastBrake.at) / 22) : 0;
  const ind = events.filter((ev) => ev.is === 'indicate-left' || ev.is === 'indicate-right').filter((ev) => ev.at <= f).pop();
  const lightsOn = time !== 'day' || events.some((ev) => ev.is === 'lights' && ev.at <= f);
  const lights = {head: lightsOn ? 1 : 0.35, tail: lightsOn ? 1 : 0, brake, left: ind?.is === 'indicate-left' ? 1 : 0, right: ind?.is === 'indicate-right' ? 1 : 0, beam: time === 'night' ? 1 : 0};
  const word = wordOf(p.word, ctx, 1);
  const kicks = brakeEv.map((ev) => ev.at);
  const weather = p.weather ?? 'clear';
  const kind = KINDS[p.backdrop ?? ''] ?? (staging === 'rear' ? 'highway' : 'city');
  const body = p.body ?? 'sedan';
  const paintN = p.paint ?? 3;
  const traffic = Math.max(0, Math.min(3, Math.round(p.traffic ?? (staging === 'top' ? 2 : 0))));

  let pic: React.ReactNode;
  let cam: CamSpec;
  if (staging === 'side') {
    cam = {move: 'drift-r', travel: 26, shake: v > 0.6 ? 0.15 : 0};
    pic = <Side uid={uid} f={f} d={d} v={v} time={time} kind={kind} body={body} paint={paintN} lights={lights} dive={dive} weather={weather} cast={p.cast} traffic={traffic} seed={seed} />;
  } else if (staging === 'rear') {
    cam = {move: 'push', amount: 0.03, origin: {x: 540, y: 1000}, shake: v > 0.6 ? 0.2 : 0.05};
    pic = <Rear uid={uid} f={f} d={d} v={v} time={time} kind={kind} body={body} paint={paintN} lights={lights} dive={dive} weather={weather} traffic={traffic} seed={seed} />;
  } else {
    cam = {move: 'still'};
    pic = <Top uid={uid} f={f} d={d} v={v} time={time} body={body} paint={paintN} lights={lights} weather={weather} traffic={traffic} seed={seed} />;
  }
  const indOn = events.find((ev) => (ev.is === 'indicate-left' || ev.is === 'indicate-right') && ev.at >= Math.max(0, base));
  return (
    <IlloBand uid={uid} time={time}>
      <Camera ctx={ctx} spec={cam} over={p.camera} kicks={kicks}>
        {pic}
        <Hud>
          <Punch word={word} slot={staging === 'top' ? 'top' : 'top'} />
        </Hud>
      </Camera>
      {speed > 0.5 && Math.max(0, base) === 0 && e <= 0 ? <Sfx name="real-pass-by" at={0} volume={0.35} /> : null}
      {indOn ? <Sfx name="real-indicator-loop" at={indOn.at} volume={0.3} len={Math.max(1, ctx.dur - indOn.at)} fade={8} /> : null}
      {weather === 'rain' ? <Sfx name="real-rain-roof" at={Math.max(0, base)} volume={0.2} len={ctx.dur} fade={10} /> : null}
      {brakeEv.filter((ev) => ev.at >= Math.max(0, base) && ev.at < ctx.dur).map((ev, i) => (
        <React.Fragment key={i}>
          <Sfx name="asmr-whoomp" at={ev.at} volume={0.3} />
          {ev.is === 'stop' ? <Haptic kind="medium" at={ev.at + 18} /> : null}
        </React.Fragment>
      ))}
    </IlloBand>
  );
};

type Look = {uid: string; f: number; d: number; v: number; time: Time; body: CarBody; paint: number; lights: Record<string, number>; weather: string; traffic: number; seed: number};

// ---- side: profile, parallax ------------------------------------------------------------------------------------------------
const Side: React.FC<Look & {kind: BackdropKind; dive: number; cast?: Cast}> = ({uid, f, d, v, time, kind, body, paint: pn, lights, dive, weather, cast, traffic, seed}) => {
  const dk = dark(time);
  const bleed = useBleed();
  const PX = 34; // stage px a frame at cruise
  const travel = d * PX;
  const ground = 1090;
  const roadTop = 1010;
  const rt = roadTones(time);
  const dashOff = travel % 240;
  let dashes = '';
  for (let x = -dashOff - 240; x < 1320; x += 240) dashes += rr(x, 1232, 120, 14, 7);
  // near plane: bushes and reflector posts racing past at 1.6
  const nearOff = (travel * 1.6) % 1500;
  const nearT = mix(dk ? C.il7 : C.il1, dk ? '#000000' : C.il2, 0.3);
  let bush = '';
  let posts = '';
  for (let i = -1; i < 3; i++) {
    const x0 = i * 1500 - nearOff;
    bush += `M${x0 + 80} 1400C${x0 + 90} 1330 ${x0 + 170} 1300 ${x0 + 240} 1320C${x0 + 280} 1270 ${x0 + 380} 1270 ${x0 + 420} 1320C${x0 + 470} 1300 ${x0 + 540} 1320 ${x0 + 560} 1400Z`;
    posts += rr(x0 + 900, 1250, 22, 160, 6) + rr(x0 + 1240, 1250, 22, 160, 6);
  }
  const len = 820;
  const reflect = weather === 'rain';
  const car = (
    <Car
      uid={uid}
      x={540}
      y={ground}
      len={len}
      body={body}
      paint={pn}
      frame={f}
      roll={travel}
      speed={v}
      lights={lights}
      pitch={dive}
      time={time}
      seed={seed}
      cabin={
        cast
          ? (b) => (
              <Figure uid={uid} cast={cast} x={b.x + b.w * 0.42} y={b.y + b.h * 0.6} size={b.h * 5.2} crop="head" turn={0.85} face="neutral" frame={f} time={time} />
            )
          : undefined
      }
    />
  );
  // other cars on the far lane, overtaking slowly or falling back
  const others = Array.from({length: traffic}, (_, i) => {
    const rel = (i % 2 ? -1 : 1) * (6 + 4 * rand(seed + i)); // px a frame relative to us
    const x = ((((f * rel + i * 760 + 300) % 2400) + 2400) % 2400) - 600;
    return <Car key={i} uid={uid} x={x} y={roadTop + 30} len={560} body={i === 1 ? 'suv' : 'hatch'} paint={2 + i} frame={f} roll={travel * 0.9} speed={v} lights={{head: lights.head, tail: lights.tail}} time={time} seed={seed + i} opacity={0.9} />;
  });
  return (
    <>
      <Plane depth={0.6}>
        <Svg>
          <Backdrop kind={kind} uid={uid} frame={f} time={time} scroll={travel * 0.9} base={roadTop} drift={0} />
        </Svg>
      </Plane>
      <Plane depth={1}>
        <Svg>
          {/* the road: the far kerb, the asphalt, a lane line streaming by, the near kerb */}
          <rect x={-200} y={roadTop - 6} width={1480} height={10} fill={rt.post} opacity={0.6} />
          <rect x={-200} y={roadTop} width={1480} height={420} fill={rt.asphalt} />
          <path d={dashes} fill={rt.line} />
          <rect x={-200} y={1340} width={1480} height={10} fill={rt.line} opacity={0.6} />
          {others}
          {reflect ? (
            <g opacity={0.2} transform={`translate(0 ${2 * ground}) scale(1 -1)`}>
              {car}
            </g>
          ) : null}
          <Shadow uid={uid} cx={540} cy={ground + 4} rx={len * 0.48} ry={18} k={1} />
          {dk ? <ellipse cx={540} cy={ground + 6} rx={len * 0.46} ry={14} fill="#000000" opacity={0.9} /> : null}
          {car}
          {v > 0.6 ? <SpeedLines frame={f} seed={seed} n={10} box={{x: 0, y: 700, w: 1080, h: 420}} speed={v * 1.4} time={time} opacity={0.45 * clamp01((v - 0.6) / 0.3)} /> : null}
          {weather === 'rain' ? <Rain frame={f} seed={seed} n={110} slant={-18 - v * 14} speed={1.1} ground={bleed ? undefined : 1380} time={time} opacity={0.75} /> : null}
          {weather === 'snow' ? <Snow frame={f} seed={seed} n={70} wind={-1.2 * v - 0.3} time={time} /> : null}
        </Svg>
      </Plane>
      <Plane depth={1.3}>
        <Svg>
          {/* the near verge under the bushes, down past the frame's foot (full bleed: the road no longer ends on a line) */}
          <rect x={-200} y={1396} width={1480} height={FOOT - 1396} fill={dk ? mix(C.il7, '#000000', 0.55) : C.il3} />
          <path d={bush} fill={nearT} />
          <path d={posts} fill={nearT} />
        </Svg>
      </Plane>
    </>
  );
};

// ---- rear: from behind, a real perspective -------------------------------------------------------------------------------------
const Rear: React.FC<Look & {kind: BackdropKind; dive: number}> = ({uid, f, d, v, time, kind, body, paint: pn, lights, dive, weather, traffic, seed}) => {
  const dk = dark(time);
  const vw = view({hy: 720, vx: 540, h: 1.9, fp: 1050, bend: 60 * osc(f, 260)});
  const metres = d * 1.0; // 30 m/s at cruise
  const Zc = 4.6;
  const [cx, cy] = pt(vw, 0, Zc);
  const len = 4.7 * scaleAt(vw, Zc);
  const bounce = 2.4 * v * Math.sin(f / 4.3 + seed) + dive * 6;
  // traffic ahead: cars in the next lanes, drifting in Z (some faster, some slower than us)
  const ahead = Array.from({length: traffic}, (_, i) => {
    const lane = i % 2 ? -3.6 : 3.6;
    const rel = (i % 2 ? 0.12 : -0.08) * (1 + i); // m a frame
    const span = 90;
    const z = 14 + ((((f * rel + i * 37 + seed) % span) + span) % span);
    return {lane, z, i};
  });
  const tailK = Math.max(lights.tail, 0.35);
  return (
    <>
      <Plane depth={0.6}>
        <Svg>
          <Backdrop kind={kind} uid={uid} frame={f} time={time} base={vw.hy + 2} drift={0.15} />
        </Svg>
      </Plane>
      <Plane depth={1}>
        <Svg>
          <Road v={vw} d={metres} time={time} uid={uid} lanes={[-1.8, 1.8]} edges={[-5.4, 5.4]} posts={[-7, 7]} beam={time === 'night' ? 1 : 0} />
          {ahead
            .sort((a, b) => b.z - a.z)
            .map((c) => (
              <CarAhead key={c.i} v={vw} X={c.lane} Z={c.z} uid={uid} frame={f} body={c.i === 1 ? 'suv' : 'sedan'} paint={2 + (c.i % 3)} lights={{tail: lightsOnK(time), brake: 0}} time={time} seed={seed + c.i} />
            ))}
          {/* wet road: the lights smear down the asphalt under the car */}
          {weather === 'rain' ? (
            <g opacity={0.5}>
              <path d={rr(cx - len * 0.17, cy, len * 0.07, 220, 20) + rr(cx + len * 0.1, cy, len * 0.07, 220, 20)} fill={lights.brake > 0.5 ? paint(uid, 'glow-down') : paint(uid, 'glow-ink')} opacity={0.6 * Math.max(tailK, lights.brake)} />
            </g>
          ) : null}
          <Shadow uid={uid} cx={cx} cy={cy + 4} rx={len * 0.22} ry={16} />
          {dk ? <ellipse cx={cx} cy={cy + 4} rx={len * 0.21} ry={14} fill="#000000" opacity={0.85} /> : null}
          <g transform={`translate(0 ${n1(bounce * 0.4)})`}>
            <Car uid={uid} x={cx} y={cy} len={len} view="rear" body={body} paint={pn} frame={f} lights={{...lights, tail: tailK}} lean={1.2 * osc(f, 140)} time={time} seed={seed} />
          </g>
          {/* tyre spray in the rain */}
          {weather === 'rain'
            ? [-1, 1].map((sd) => (
                <g key={sd}>
                  {Array.from({length: 7}, (_, i) => {
                    const t = ((f * 1.7 + i * 9) % 30) / 30;
                    const x = cx + sd * (len * 0.15 + t * 70);
                    const y = cy - 10 - t * 40 + t * t * 60;
                    return <circle key={i} cx={x} cy={y} r={10 + 26 * t} fill={dk ? C.il3 : C.il0} opacity={0.18 * (1 - t)} />;
                  })}
                </g>
              ))
            : null}
          {weather === 'rain' ? <Rain frame={f} seed={seed} n={120} slant={6} speed={1.2} time={time} opacity={0.7} /> : null}
          {weather === 'snow' ? <Snow frame={f} seed={seed} n={80} wind={0.3} speed={1.4} time={time} /> : null}
        </Svg>
      </Plane>
    </>
  );
};
const lightsOnK = (time: Time) => (time === 'day' ? 0.4 : 1);

// ---- top: from above ---------------------------------------------------------------------------------------------------------
const Top: React.FC<Omit<Look, 'kind'>> = ({uid, f, d, v, time, body, paint: pn, lights, weather, traffic, seed}) => {
  const dk = dark(time);
  const PX = 40;
  const travel = d * PX;
  const rt = roadTones(time);
  const left = 230;
  const right = 850;
  const lanes = [left + (right - left) / 3, left + (2 * (right - left)) / 3];
  const off = travel % 220;
  let dashes = '';
  for (const x of lanes) for (let y = TOP - 220 + off; y < FOOT; y += 220) dashes += rr(x - 6, y, 12, 110, 6);
  // trees along both verges, from above: round crowns with a ball light, scrolling with the road
  const treeOff = travel % 300;
  const trees: React.ReactNode[] = [];
  for (let i = -2; i < 7; i++) {
    for (const side of [-1, 1]) {
      const y = 300 + i * 300 + treeOff + (side > 0 ? 150 : 0);
      const x = side < 0 ? 110 + 40 * rand(seed + i * 3 + 1) : 970 - 40 * rand(seed + i * 5 + 2);
      const r = 70 + 26 * rand(seed + i * 7 + side);
      trees.push(<Solid key={`${i}${side}`} uid={uid} d={circ(x, y, r)} tone={dk ? 6 : 3} shade="ball" time={time} rim />);
    }
  }
  const cars = Array.from({length: traffic}, (_, i) => {
    const laneX = i % 2 ? (left + lanes[0]) / 2 : (lanes[1] + right) / 2;
    const rel = (i % 2 ? 9 : -5) * (0.6 + 0.5 * rand(seed + i)); // px a frame against us (+: falls back, -: overtakes)
    const span = 2200;
    const y = ((((f * rel + i * 900 + 200) % span) + span) % span) - 500;
    return <Car key={i} uid={uid} x={laneX} y={y} len={420} view="top" body={i === 1 ? 'suv' : 'hatch'} paint={1 + ((i * 2) % 5)} frame={f} lights={{head: lights.head, tail: lights.tail}} time={time} seed={seed + i} />;
  });
  const sway = 6 * osc(f, 110);
  return (
    <Plane depth={1}>
      <Svg>
        {/* the road from the frame's top to its foot (full bleed) */}
        <rect x={-100} y={TOP} width={1280} height={FOOT - TOP} fill={rt.verge} />
        <rect x={left} y={TOP} width={right - left} height={FOOT - TOP} fill={rt.asphalt} />
        <rect x={left - 4} y={TOP} width={10} height={FOOT - TOP} fill={rt.line} opacity={0.8} />
        <rect x={right - 6} y={TOP} width={10} height={FOOT - TOP} fill={rt.line} opacity={0.8} />
        <path d={dashes} fill={rt.line} />
        {cars}
        <Shadow uid={uid} cx={lanes[0] + (lanes[1] - lanes[0]) / 2 + sway} cy={900} rx={150} ry={300} k={0.8} />
        <Car uid={uid} x={(lanes[0] + lanes[1]) / 2 + sway} y={900} len={520} view="top" heading={sway * 0.15} body={body} paint={pn} frame={f} lights={lights} time={time} seed={seed} />
        {trees}
        {weather === 'rain' ? <Rain frame={f} seed={seed} n={90} slant={0} speed={1.3} time={time} opacity={0.5} /> : null}
      </Svg>
    </Plane>
  );
};
