// src/scenes/Pump.tsx: the fuel station (illustrated, the "Graphite" kit; wave B's scene, built early for the v76 re-staged
// acceptance film). No brand anywhere: a generic modern pump under a generic canopy.
//
// Stagings:
//   nozzle   (default) a modern pump at the left, the car's filler flap open, the nozzle in, the hose curving down and up;
//            a highlight pulse runs down the hose; a figure stands by (cast, e.g. with the phone in hand)
//   display  macro on the pump's display: two rows of digit drums roll fast (they land only on bank values at `at`);
//            `sign` puts a no-phone sticker beside it and the camera pushes onto it
//   station  wide: the canopy, the car at the pump, a figure standing by with whatever it holds and does (acts)
// Props: fuel (petrol | diesel | lpg), value {litres, money} (facts only), at (click-off), cast, acts, hold, sign {is:
//   no-phone, at}, spark {at} (a static spark jumps at the nozzle: the accent), close (nozzle: a macro on the filler and
//   the nozzle, the same place seen 2.3x closer), reach {at} (a hand reaches in and takes the nozzle), body, paint, time,
//   word, camera, seed.
// Frame 0: the digits are rolling. Sounds: asmr-air-long low while pouring (asmr-pour when made), asmr-count-roll-long
//   (display), cc0-latch + Haptic rigid on the click-off.
import React, {useId} from 'react';
import {spring, useCurrentFrame} from 'remotion';
import {TXT} from '../lib/layer';
import {C, F, SPRING, toneBig, type Tone} from '../tokens';
import type {SceneCtx} from '../types';
import {entrance, Haptic, lead, Sfx} from './common';
import {actsAt, type ActSpec} from './illo/acting';
import {Backdrop} from './illo/backdrop';
import {Camera, Hud, Plane, type CamSpec} from './illo/cam';
import {Car, type CarBody} from './illo/car';
import {Figure, Hand, useCastLook, type Cast} from './illo/figure';
import {Sparks} from './illo/fx';
import {Icon} from './illo/icons';
import {dark, mix, tone, type Time} from './illo/palette';
import {isItem} from './illo/props';
import {gid, paint, rr, Shadow, Solid} from './illo/solid';
import {at, clamp01, FOOT, IlloBand, n1, osc, stagingOf, Svg, timeOf} from './illo/scene';
import {Punch, wordOf} from './illo/type';

const STAGINGS = ['nozzle', 'display', 'station'] as const;
type P = {
  staging?: (typeof STAGINGS)[number];
  fuel?: 'petrol' | 'diesel' | 'lpg';
  value?: {litres?: number; money?: number};
  at?: number | string;
  cast?: Cast;
  acts?: ActSpec[];
  hold?: string;
  sign?: {is?: string; at?: number | string};
  spark?: {at?: number | string};
  close?: boolean;
  reach?: {at?: number | string};
  body?: CarBody;
  paint?: number;
  time?: Time;
  word?: unknown;
  tone?: Tone;
  camera?: CamSpec;
  seed?: number;
};

/** A modern fuel pump: a tall rounded column, a dark display, a nozzle holster (empty when the nozzle is in a car). */
const PumpBody: React.FC<{uid: string; x: number; ground: number; h: number; time: Time; f: number; rolling: boolean; holster?: boolean}> = ({uid, x, ground, h, time, f, rolling, holster = false}) => {
  const w = h * 0.34;
  const top = ground - h;
  const dk = dark(time);
  return (
    <g>
      <Shadow uid={uid} cx={x} cy={ground} rx={w * 0.8} />
      <Solid uid={uid} d={rr(x - w / 2 - 14, ground - 26, w + 28, 30, 10)} tone={dk ? 6 : 4} time={time} />
      <Solid uid={uid} d={rr(x - w / 2, top, w, h - 20, w * 0.16)} tone={dk ? 5 : 2} time={time} rim outline />
      <path d={rr(x - w / 2, top, w, h * 0.14, w * 0.16)} fill={dk ? C.il4 : C.il1} />
      {/* the display window and a lit strip of digits */}
      <path d={rr(x - w * 0.36, top + h * 0.2, w * 0.72, h * 0.2, 14)} fill="#050505" />
      {[0, 1].map((r) => (
        <path key={r} d={rr(x - w * 0.3, top + h * (0.235 + r * 0.08), w * 0.6 * (rolling ? 0.6 + 0.4 * Math.abs(Math.sin(f / 3 + r)) : 1), h * 0.04, 4)} fill={C.il0} opacity={0.75} />
      ))}
      {/* buttons, the holster */}
      <path d={rr(x - w * 0.3, top + h * 0.46, w * 0.6, h * 0.06, 8)} fill={tone(dk ? 6 : 4)} />
      <Solid uid={uid} d={rr(x + w / 2 - 6, top + h * 0.5, 34, h * 0.16, 10)} tone={6} time={time} rim />
      {holster ? <Solid uid={uid} d={rr(x + w / 2 + 2, top + h * 0.46, 24, h * 0.12, 8)} tone={7} time={time} /> : null}
    </g>
  );
};

/** A nozzle (the handle and the spout), placed by its spout's tip at (x, y), pointing at `angle` degrees (0 = right). */
const Nozzle: React.FC<{uid: string; x: number; y: number; angle?: number; s?: number; time: Time; jolt?: number}> = ({uid, x, y, angle = 200, s = 1, time, jolt = 0}) => {
  const dk = dark(time);
  return (
    <g transform={`translate(${n1(x)} ${n1(y)}) rotate(${angle}) scale(${s}) translate(${n1(-jolt)} 0)`}>
      <path d={rr(0, -9, 70, 18, 9)} fill={tone(dk ? 2 : 4)} />
      <Solid uid={uid} d={`M60 -26C90 -40 150 -40 170 -20C182 -8 182 24 168 40L120 40L110 18H70C60 18 56 -10 60 -26Z`} tone={dk ? 4 : 6} time={time} rim outline />
      <path d={`M96 18C100 44 126 52 150 46`} fill="none" stroke={tone(dk ? 3 : 5)} strokeWidth={10} strokeLinecap="round" />
      <path d={rr(118, -30, 40, 12, 6)} fill={tone(dk ? 2 : 3)} />
    </g>
  );
};

export const Pump: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const f = useCurrentFrame();
  const uid = useId();
  const sleeveT = useCastLook('me').tone; // the hand is the film's "me": its cuff in me's own top
  const staging = stagingOf(p, STAGINGS);
  const time = timeOf(p);
  const e = entrance(ctx);
  const base = lead(ctx);
  const offAt = p.at === undefined ? Infinity : Math.max(e + 10, at(ctx, p.at, Infinity));
  const word = wordOf(p.word, ctx, 1);
  const dk = dark(time);
  const hold = isItem(p.hold) ? p.hold : undefined;
  const acts = actsAt(ctx, p.acts ?? []);
  const signAt = p.sign ? at(ctx, p.sign.at, e + 10) : Infinity;
  const sparkAt = p.spark ? at(ctx, p.spark.at, e + 20) : Infinity;
  const reachAt = p.reach ? at(ctx, p.reach.at, e + 10) : Infinity;
  const cues: React.ReactNode[] = [];
  let pic: React.ReactNode;
  let cam: CamSpec = {move: 'drift-l', travel: 24};
  const kicks: number[] = [offAt, signAt, sparkAt];

  if (staging === 'display') {
    pic = <Display uid={uid} f={f} e={e} time={time} offAt={offAt} value={p.value} sign={p.sign ? signAt : undefined} fuel={p.fuel} />;
    cam = p.sign ? {move: 'push', amount: 0.05, origin: {x: 790, y: 1090}} : {move: 'push', amount: 0.035, origin: {x: 540, y: 760}};
    if (Math.max(0, base) < Math.min(ctx.dur, offAt)) cues.push(<Sfx key="roll" name="asmr-count-roll-long" at={Math.max(0, base)} volume={0.22} len={Math.min(ctx.dur, offAt) - Math.max(0, base)} fade={6} />);
    if (p.sign && signAt >= 0 && signAt < ctx.dur) cues.push(<Sfx key="s" name="asmr-pop" at={signAt} volume={0.35} />, <Haptic key="sh" kind="light" at={signAt} />);
  } else {
    const ground = staging === 'station' ? 1200 : 1250;
    const wide = staging === 'station';
    const close = !wide && p.close === true;
    const pumpX = wide ? 330 : 120;
    const pumpH = wide ? 520 : 760;
    const carLen = wide ? 760 : 1080;
    const carX = wide ? 700 : 720;
    // the filler flap on the rear quarter (the car faces right: its rear is toward the pump)
    const flapX = carX - carLen * 0.36;
    const flapY = ground - carLen * 0.245;
    const jolt = f >= offAt ? 6 * Math.exp(-(f - offAt) / 4) * Math.sin(Math.min(1, (f - offAt) / 4) * Math.PI) : 0;
    const pumping = f < offAt;
    // the hose: out of the pump's side, sagging to the floor, up to the nozzle in the filler
    const hx0 = pumpX + pumpH * 0.17;
    const hy0 = ground - pumpH * 0.62;
    const nozX = flapX - 8;
    const nozY = flapY + 10;
    // the handle's back end (the hose's end): the nozzle points 162 degrees from its spout, 180 px long
    const hx1 = nozX + 20 + 175 * Math.cos((162 * Math.PI) / 180) * 1.4;
    const hy1 = nozY + 175 * Math.sin((162 * Math.PI) / 180) * 1.4 + 24;
    const hose = `M${n1(hx0)} ${n1(hy0)}C${n1(hx0 + 40)} ${n1(ground - 20)} ${n1(hx1 - 40)} ${n1(ground + 10)} ${n1(hx1)} ${n1(hy1)}`;
    const pulse = pumping ? ((f - e) % 20) / 20 : -1;
    const hid = gid(useId(), 'hose');
    const k = spring({frame: f - e, fps: 30, config: SPRING.enter});
    const figX = wide ? 640 : 820;
    const figY = wide ? 1300 : 1370;
    const figS = wide ? 640 : 760;
    pic = (
      <>
        <Plane depth={0.6}>
          <Svg>
            <g transform={close ? `translate(540 900) scale(1.5) translate(${n1(-(nozX - 60))} ${n1(-(nozY + 10))})` : undefined}>
              <Backdrop kind="station" uid={uid} frame={f} time={time} base={ground - 40} opacity={wide ? 1 : 0.7} />
            </g>
          </Svg>
        </Plane>
        <Plane depth={1}>
          <Svg>
            <g transform={close ? `translate(540 900) scale(2.3) translate(${n1(-(nozX - 60))} ${n1(-(nozY + 10))})` : undefined}>
            <rect x={-100} y={ground - 40} width={1280} height={FOOT - ground + 40} fill={dk ? C.il7 : C.il2} />
            <path d={rr(-100, ground - 44, 1280, 6, 3)} fill={dk ? C.il6 : C.il1} />
            <PumpBody uid={uid} x={pumpX} ground={ground} h={pumpH} time={time} f={f} rolling={pumping} />
            <Shadow uid={uid} cx={carX} cy={ground + 2} rx={carLen * 0.46} ry={18} />
            {dk ? <ellipse cx={carX} cy={ground + 4} rx={carLen * 0.44} ry={14} fill="#000000" opacity={0.8} /> : null}
            <Car uid={uid} x={carX} y={ground} len={carLen} body={p.body ?? 'sedan'} paint={p.paint ?? 3} dir={1} frame={f} time={time} />
            {/* the open flap and the filler neck */}
            <path d={rr(flapX - 30, flapY - 30, 60, 60, 16)} fill="#000000" opacity={0.85} />
            <Solid uid={uid} d={rr(flapX - 96, flapY - 30, 60, 60, 16)} tone={(p.paint ?? 3) + 0.4} time={time} rim outline />
            <defs>
              <linearGradient id={hid} x1="0" y1="0" x2="1" y2="0">
                <stop offset={Math.max(0, pulse - 0.08)} stopColor={tone(dk ? 5 : 5)} />
                <stop offset={Math.max(0, pulse)} stopColor={pulse >= 0 ? (dk ? C.il2 : C.il1) : tone(5)} />
                <stop offset={Math.min(1, pulse + 0.08)} stopColor={tone(5)} />
              </linearGradient>
            </defs>
            <path d={hose} fill="none" stroke={tone(dk ? 6 : 6)} strokeWidth={30} strokeLinecap="round" />
            <path d={hose} fill="none" stroke={`url(#${hid})`} strokeWidth={22} strokeLinecap="round" />
            <path d={hose} fill="none" stroke={C.il0} strokeWidth={3} strokeLinecap="round" opacity={dk ? 0.12 : 0.4} transform="translate(-4 -6)" />
            <Nozzle uid={uid} x={nozX + 20} y={nozY} angle={162} s={1.4} time={time} jolt={jolt} />
            {f >= reachAt - 2 ? (() => {
              // the hand slides in from the lower left onto the nozzle's handle (14 frames)
              const hx = nozX + 20 + 1.4 * 120 * Math.cos((162 * Math.PI) / 180);
              const hy = nozY + 1.4 * 120 * Math.sin((162 * Math.PI) / 180);
              const t = spring({frame: f - reachAt, fps: 30, config: SPRING.enter});
              return <Hand uid={uid} kind="grip" x={hx - 26 - 260 * (1 - t)} y={hy + 40 + 240 * (1 - t)} angle={128} scale={close ? 7.5 : 11} side="r" arm={12} sleeve={sleeveT} frame={f} time={time} />;
            })() : null}
            {f >= sparkAt ? (
              <g>
                <circle cx={nozX - 40} cy={nozY - 30} r={110} fill={paint(uid, 'glow-down')} opacity={(0.4 + 0.6 * clamp01(1 - (f - sparkAt) / 30)) * (dk ? 0.9 : 0.6)} />
                <Sparks frame={f} x={nozX - 40} y={nozY - 30} at={[sparkAt, sparkAt + 9]} n={18} power={close ? 0.5 : 0.8} spread={170} tone="down" time={time} uid={uid} />
                <path d={`M${nozX - 120} ${nozY - 70}l26 18l-14 6l30 22`} fill="none" stroke={toneBig('down')} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" opacity={clamp01(1 - (f - sparkAt) / 10)} />
              </g>
            ) : null}
            <Shadow uid={uid} cx={figX + 40 * (1 - k)} cy={figY} rx={130} />
            {close ? null : <Figure uid={uid} cast={p.cast ?? 'me'} x={figX + 40 * (1 - k)} y={figY} size={figS} turn={-0.35} frame={f} hold={hold ?? (p.cast ? undefined : 'phone')} acts={acts.length ? acts : [{at: -100, pose: 'phoneLook', face: 'neutral'}]} time={time} />}
            </g>
          </Svg>
        </Plane>
      </>
    );
    cam = wide ? {move: 'push', amount: 0.03, origin: {x: 560, y: 900}} : close ? {move: 'push', amount: 0.05, origin: {x: 540, y: 880}} : {move: 'drift-l', travel: 22};
    if (pumping && Math.max(0, base) < ctx.dur) cues.push(<Sfx key="pour" name="asmr-air-long" at={Math.max(0, base)} volume={0.18} len={Math.max(1, Math.min(ctx.dur, offAt) - Math.max(0, base))} fade={8} />);
  }
  if (sparkAt >= Math.max(0, base) && sparkAt < ctx.dur) cues.push(<Sfx key="spk" name="asmr-strike" at={sparkAt} volume={0.4} />, <Haptic key="spkh" kind="error" at={sparkAt} />);
  if (offAt >= Math.max(0, base) && offAt < ctx.dur) cues.push(<Sfx key="off" name="cc0-latch" at={offAt} volume={0.45} />, <Haptic key="offh" kind="rigid" at={offAt} />);
  return (
    <IlloBand uid={uid} time={time}>
      <Camera ctx={ctx} spec={cam} over={p.camera} kicks={kicks}>
        {pic}
        <Hud>
          <Punch word={word} slot="top" />
        </Hud>
      </Camera>
      {cues}
    </IlloBand>
  );
};

/** One row of digit drums: `value` (a float: the last digit scrolls between whole numbers), `digits` wide. */
const Drums: React.FC<{x: number; y: number; h: number; value: number; digits: number; decimals: number; ink: string; dim: string; id: string; landed: boolean; tone?: string}> = ({x, y, h, value, digits, decimals, ink, dim, id, landed, tone: tc}) => {
  const cw = h * 0.62;
  const cells: React.ReactNode[] = [];
  const scaled = value * 10 ** decimals;
  for (let i = 0; i < digits; i++) {
    const place = digits - 1 - i;
    const v = scaled / 10 ** place;
    const whole = Math.floor(v);
    // the lowest drum scrolls continuously; higher ones turn only while the one below passes 9 -> 0
    const raw = landed || place > 0 ? 0 : v - whole;
    const frac = clamp01((raw - 0.7) / 0.3) ** 2 * (3 - 2 * clamp01((raw - 0.7) / 0.3));
    const d0 = ((whole % 10) + 10) % 10;
    const cx = x + i * cw + (decimals && i >= digits - decimals ? cw * 0.4 : 0);
    const blank = place > decimals && whole === 0;
    if (blank) continue;
    cells.push(
      <g key={i} clipPath={`url(#${id})`}>
        {[0, 1].map((j) => (
          <text key={j} className={TXT} x={cx + cw / 2} y={y + h * 0.8 - frac * h + j * h} textAnchor="middle" fontFamily={F.mono} fontSize={h * 0.9} fill={blank ? dim : landed && tc ? tc : ink}>
            {blank ? '0' : String((d0 + j) % 10)}
          </text>
        ))}
      </g>,
    );
  }
  const W = digits * cw + (decimals ? cw * 0.4 : 0);
  return (
    <g>
      <defs>
        <clipPath id={id}>
          <rect x={x} y={y} width={W} height={h} />
        </clipPath>
      </defs>
      <path d={rr(x - 12, y - 6, W + 24, h + 12, 12)} fill="#000000" />
      {cells}
      {decimals ? <circle cx={x + (digits - decimals) * cw + cw * 0.2} cy={y + h * 0.84} r={h * 0.05} fill={ink} /> : null}
      <path d={rr(x - 12, y - 6, W + 24, h * 0.3, 12)} fill={C.il0} opacity={0.05} />
    </g>
  );
};

const Display: React.FC<{uid: string; f: number; e: number; time: Time; offAt: number; value?: {litres?: number; money?: number}; sign?: number; fuel?: string}> = ({uid, f, e, time, offAt, value, sign, fuel}) => {
  const dk = dark(time);
  const t = Math.min(f, offAt) - (e - 40);
  const landed = f >= offAt && value !== undefined;
  // rolling: about 0.9 litres a second; land on the bank values at the click-off
  const litresRoll = 12.3 + t * 0.034;
  const moneyRoll = litresRoll * 2.89;
  const lit = landed && value?.litres !== undefined ? value.litres : litresRoll;
  const mon = landed && value?.money !== undefined ? value.money : moneyRoll;
  const ink = C.il0;
  const dim = mix('#000000', C.il0, 0.12);
  const id = gid(useId(), 'dr');
  const sk = sign !== undefined ? spring({frame: f - sign, fps: 30, config: SPRING.land}) : 0;
  return (
    <>
      <Plane depth={0.7}>
        <Svg>
          {/* the pump's face runs on past the frame's foot (full bleed): only its top corners are round */}
          <Solid uid={uid} d={rr(60, 340, 960, FOOT - 340, [70, 70, 0, 0])} tone={dk ? 5 : 2} time={time} rim outline />
          <path d={rr(60, 340, 960, 130, 70)} fill={dk ? C.il4 : C.il1} />
        </Svg>
      </Plane>
      <Plane depth={1}>
        <Svg>
          {/* the display: a dark glass panel with two drum rows; the price per litre small under them */}
          <Solid uid={uid} d={rr(130, 500, 820, 470, 40)} tone={7} fill="#0A0A0A" time={time} rim />
          <ellipse cx={540} cy={700} rx={420} ry={220} fill={paint(uid, 'glow-ink')} opacity={dk ? 0.08 : 0.05} />
          <Icon name="money" x={210} y={630} size={70} color={dim} />
          <Drums x={300} y={560} h={150} value={mon} digits={5} decimals={2} ink={ink} dim={dim} id={`${id}a`} landed={landed} tone={toneBig('down')} />
          <Icon name="fuel" x={210} y={850} size={66} color={dim} accent={dim} />
          <Drums x={360} y={800} h={110} value={lit} digits={4} decimals={2} ink={mix(ink, '#000000', 0.15)} dim={dim} id={`${id}b`} landed={landed} />
          {/* the grade buttons */}
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <Solid uid={uid} d={rr(170 + i * 260, 1030, 220, 120, 30)} tone={dk ? 6 : 3} time={time} rim outline />
              <circle cx={280 + i * 260} cy={1090} r={18} fill={(fuel === 'diesel' ? 1 : fuel === 'lpg' ? 2 : 0) === i ? C.il0 : tone(dk ? 4 : 5)} />
            </g>
          ))}
          {sign !== undefined ? (
            <g transform={`translate(790 1260) scale(${(0.6 + 0.4 * sk).toFixed(3)}) rotate(${n1(-6 + 2 * osc(f, 80))})`} opacity={clamp01(sk * 3)}>
              <Solid uid={uid} d={rr(-110, -110, 220, 220, 30)} tone={0} time={time} rim outline />
              <Icon name="no-phone" x={0} y={0} size={180} color={C.ilFeature} />
            </g>
          ) : null}
        </Svg>
      </Plane>
    </>
  );
};
