// v145-flat-tyre's own visual: one courtyard, one coupe-SUV, one morning. A nail sits in the rear tyre and the rubber
// sinks onto the paving while you sleep (a macro of the wheel, the air hissing out by the nail's head); the neighbour,
// an old man on his way for bread, walks up and stops at the flat wheel; at the end you crouch there with the wrench and
// the wheel stands round again. Shots: "nail" (the macro), "spot" (wide: the whole car, he comes in and points), "go"
// (you at the wheel, the spare on).
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, Sfx} from '../common';
import {C, L} from '../../tokens';
import {prog} from '../../lib/anim';
import {CameraLayer, Hud} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import type {SceneCtx} from '../../types';
import {Backdrop} from '../illo/backdrop';
import {Car} from '../illo/car';
import {Figure, type Cast} from '../illo/figure';
import {Smoke} from '../illo/fx';
import {acc, accRamp, mix, tone} from '../illo/palette';
import {IlloBand, Svg, timeOf, FOOT} from '../illo/scene';
import {E} from '../kit/lib';

type P = {
  shot?: 'nail' | 'dawn' | 'spot' | 'go';
  hitAt?: number | string;
  line?: string;
  time?: 'day' | 'night' | 'dusk';
  who?: Cast;
};

const GROUND = 1240; // the courtyard's paving line (stage y): wheels and feet stand on or near it, over the subtitle band
const n1 = (v: number) => +v.toFixed(1);
const LEN = 620; // the hero car in the wide shots
const CX = 430;

/** A tyre on the ground at (cx, ground): flat 0 = round, 1 = sat down on the paving (the rubber bulges sideways). */
const Tyre: React.FC<{cx: number; ground: number; r: number; flat: number; rot: number; nail?: number}> = ({cx, ground, r, flat, rot, nail = 0}) => {
  const drop = 0.26 * flat * r;
  const cy = ground - r + drop; // the hub sinks as the air goes
  const low = ground - cy; // the lower half's height
  const rx = r * (1 + 0.13 * flat);
  const tyreD = `M${n1(cx - r)} ${n1(cy)} A${n1(r)} ${n1(r)} 0 0 1 ${n1(cx + r)} ${n1(cy)} C${n1(cx + rx)} ${n1(cy + low * 0.7)} ${n1(cx + rx * 0.7)} ${n1(ground)} ${n1(cx)} ${n1(ground)} C${n1(cx - rx * 0.7)} ${n1(ground)} ${n1(cx - rx)} ${n1(cy + low * 0.7)} ${n1(cx - r)} ${n1(cy)} Z`;
  const rimR = r * 0.62;
  const rim = acc('a');
  const spokes = Array.from({length: 5}, (_, i) => rot + i * 72);
  // the nail's head sits low on the tread, toward the front
  const na = (128 * Math.PI) / 180;
  const nx = cx + Math.cos(na) * (r - 10) * (1 + 0.1 * flat);
  const ny = Math.min(ground - 12, cy + Math.sin(na) * (r - 10));
  return (
    <g>
      <ellipse cx={cx} cy={ground + 6} rx={rx * 1.05} ry={r * 0.08} fill={tone(7)} opacity={0.45} />
      <path d={tyreD} fill={tone(7)} />
      <path d={tyreD} fill="none" stroke={tone(6)} strokeWidth={Math.max(4, r * 0.03)} />
      {/* the sidewall's soft shine, upper left */}
      <path d={`M${n1(cx - r * 0.86)} ${n1(cy - r * 0.2)} A${n1(r * 0.88)} ${n1(r * 0.88)} 0 0 1 ${n1(cx - r * 0.1)} ${n1(cy - r * 0.87)}`} fill="none" stroke={tone(5)} strokeWidth={Math.max(4, r * 0.05)} strokeLinecap="round" opacity={0.7} />
      <circle cx={cx} cy={cy} r={rimR} fill={accRamp(rim, 4)} />
      <circle cx={cx} cy={cy} r={rimR * 0.9} fill={accRamp(rim, 2.6)} />
      {spokes.map((a, i) => {
        const t = (a * Math.PI) / 180;
        return <path key={i} d={`M${n1(cx + Math.cos(t - 0.16) * rimR * 0.22)} ${n1(cy + Math.sin(t - 0.16) * rimR * 0.22)} L${n1(cx + Math.cos(t - 0.1) * rimR * 0.86)} ${n1(cy + Math.sin(t - 0.1) * rimR * 0.86)} L${n1(cx + Math.cos(t + 0.1) * rimR * 0.86)} ${n1(cy + Math.sin(t + 0.1) * rimR * 0.86)} L${n1(cx + Math.cos(t + 0.16) * rimR * 0.22)} ${n1(cy + Math.sin(t + 0.16) * rimR * 0.22)} Z`} fill={accRamp(rim, 1.4)} />;
      })}
      <circle cx={cx} cy={cy} r={rimR * 0.2} fill={accRamp(rim, 4.4)} />
      <circle cx={cx - rimR * 0.05} cy={cy - rimR * 0.05} r={rimR * 0.09} fill={tone(2)} />
      {nail > 0 ? (
        <g opacity={nail}>
          <circle cx={nx} cy={ny} r={Math.max(6, r * 0.05)} fill={tone(3)} />
          <circle cx={nx - r * 0.012} cy={ny - r * 0.012} r={Math.max(3, r * 0.02)} fill={tone(1)} />
        </g>
      ) : null}
    </g>
  );
};

/** The car's own rear tyre squashed onto the paving: drawn over the kit car's wheel in the wide shots. */
const FlatOver: React.FC<{flat: number}> = ({flat}) => {
  const s = LEN / 1000;
  const wx = CX + (500 - 192) * s; // the rear wheel (the car faces left)
  const R = 94 * s;
  if (flat <= 0.01) return null;
  return (
    <g opacity={flat}>
      <ellipse cx={wx} cy={GROUND - R * 0.16} rx={R * 1.16} ry={R * 0.2} fill={tone(7)} />
    </g>
  );
};

export const V145FlatTyre: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const f = useCurrentFrame();
  const time = timeOf(p);
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 6, cueFrame(ctx, p.hitAt ?? 1));
  const shot = p.shot ?? 'nail';
  const dur = Math.max(30, ctx.dur);

  let body: React.ReactNode = null;
  let front: React.ReactNode = null;
  let sound: React.ReactNode = null;
  if (shot === 'nail') {
    // the macro: the wheel big under its arch, sinking all through the shot; the air puffs out by the nail on the hit
    const flat = 0.12 + 0.88 * E.inOut(prog(f, e, dur - e));
    const r = 300;
    const cx = 540;
    const archY = GROUND - 2 * r + 0.26 * flat * r - 40;
    const paint = acc('a');
    body = (
      <>
        <path d={`M-200 -400 L1280 -400 L1280 ${n1(archY + r * 0.9)} L${n1(cx + r + 70)} ${n1(archY + r * 0.9)} A${r + 70} ${r + 70} 0 0 0 ${n1(cx - r - 70)} ${n1(archY + r * 0.9)} L-200 ${n1(archY + r * 0.9)} Z`} fill={accRamp(paint, 3.4)} />
        <path d={`M-200 ${n1(archY + r * 0.9 - 30)} L${n1(cx - r - 64)} ${n1(archY + r * 0.9 - 30)}`} stroke={accRamp(paint, 1.6)} strokeWidth={8} />
        <path d={`M${n1(cx + r + 64)} ${n1(archY + r * 0.9 - 30)} L1280 ${n1(archY + r * 0.9 - 30)}`} stroke={accRamp(paint, 1.6)} strokeWidth={8} />
        <Tyre cx={cx} ground={GROUND} r={r} flat={flat} rot={-8} nail={1} />
      </>
    );
    front = f >= hit ? <Smoke frame={f - hit} x={cx + Math.cos((128 * Math.PI) / 180) * r} y={GROUND - 40} kind="steam" n={6} size={1.2} spread={1.6} rise={0.4} at={0} time={time} /> : null;
    sound = (
      <>
        <Sfx name="asmr-air-long" at={hit} volume={0.4} />
        <Land at={hit} />
        <Haptic kind="light" at={hit + 1} volume={0.3} />
      </>
    );
  } else if (shot === 'dawn') {
    // wide, before sunrise: the whole car alone in the courtyard, its rear corner sinking as the tyre goes flat
    const flat = E.inOut(prog(f, e, Math.max(12, hit - e + 10)));
    body = (
      <>
        <Car uid={`${uid}c`} x={CX + 40} y={GROUND} len={LEN} body="suv" paint="a" dir={-1} frame={f} time={time} />
        <g transform="translate(40 0)">
          <FlatOver flat={flat} />
        </g>
      </>
    );
    sound = <Sfx name="asmr-swell" at={Math.max(base, hit - 6)} volume={0.24} />;
  } else if (shot === 'spot') {
    // wide: the whole car, its rear tyre flat; the neighbour walks in from the right and stops by it, pointing
    const walk = E.out(prog(f, e, Math.max(12, hit - e)));
    const gx = 1010 - 150 * walk;
    const who: Cast = p.who ?? {is: 'grandpa', outfit: 'cardigan', hat: 'flatCap', glasses: 'round'};
    body = (
      <>
        <Car uid={`${uid}c`} x={CX} y={GROUND} len={LEN} body="suv" paint="a" dir={-1} frame={f} time={time} />
        <FlatOver flat={1} />
      </>
    );
    front = (
      <Figure uid={`${uid}g`} cast={who} x={gx} y={GROUND + 70} size={420} turn={-0.8} frame={f} time={time} acts={[{at: e, pose: 'walk', face: 'neutral'}, {at: hit, pose: 'point', face: 'worried'}]} />
    );
    sound = (
      <>
        <Sfx name="asmr-knock" at={hit} volume={0.3} />
        <Haptic kind="light" at={hit + 1} volume={0.26} />
      </>
    );
  } else {
    // you at the wheel before work: crouched with the wrench, the spare goes on and the car stands level again
    const who: Cast = p.who ?? {is: 'me', outfit: 'shirt', hair: 'side', beard: 'short', extras: ['watch']};
    const on = prog(f, hit, 6);
    body = (
      <>
        <Car uid={`${uid}c`} x={CX - 40} y={GROUND} len={LEN} body="suv" paint="a" dir={-1} frame={f} time={time} />
        <g transform="translate(-40 0)">
          <FlatOver flat={1 - on} />
        </g>
      </>
    );
    front = (
      <Figure uid={`${uid}m`} cast={who} x={830} y={GROUND + 60} size={420} turn={-0.7} frame={f} time={time} acts={[{at: e, pose: 'crouch', hold: 'wrench', face: 'neutral'}, {at: hit, pose: 'thumbsUp', face: 'smile'}]} />
    );
    sound = (
      <>
        <Land at={hit} />
        <Haptic kind="rigid" at={hit + 1} volume={0.3} />
      </>
    );
  }

  return (
    <IlloBand uid={uid} time={time}>
      <CameraLayer depth={0.6}>
        <Svg>
          <Backdrop kind="city" uid={uid} frame={f} time={time} base={GROUND - 40} seed={shot === 'go' ? 6 : 3} drift={0} />
          <rect x={-200} y={GROUND - 40} width={1480} height={FOOT - GROUND + 40} fill={mix(tone(2), tone(3), 0.5)} />
          <rect x={-200} y={GROUND - 40} width={1480} height={6} fill={tone(4)} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>{body}</Svg>
      </CameraLayer>
      <CameraLayer depth={1.3}>
        <Svg>{front}</Svg>
      </CameraLayer>
      <Hud>
        {p.line ? (
          <div style={{position: 'absolute', left: L.camSafe.left, top: 420, whiteSpace: 'nowrap'}}>
            <Words text={p.line} at={hit} fx="slam" size={110} color={C.ink} />
          </div>
        ) : null}
      </Hud>
      {sound}
    </IlloBand>
  );
};
