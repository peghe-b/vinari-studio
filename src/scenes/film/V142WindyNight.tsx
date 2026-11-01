// src/scenes/film/V142WindyNight.tsx: the film's own picture (v142-windy-night, QR ბარათი): a Tbilisi courtyard on a
// windy night. Your coupe-SUV sleeps under an old plane tree; the wind cracks a heavy limb right over its roof; later, the
// car moved a few metres away, the limb comes down on the empty spot. One courtyard, one car, four shots (the spec's "shot"):
//   storm  the wide shot: the tree, the car whole under its limb, the crown thrashing, leaves flying past the lamp
//   crack  closer on the joint over the roof: on hitAt the limb splits and drops a few degrees, splinters, the punch lands
//   hang   low by the car: the broken limb hangs over the roof, swinging and creaking in the gusts
//   fall   the car parked aside, you beside it; on hitAt the limb crashes onto the empty spot, dust rises
// Props: shot, hitAt (chunk or "1.2s"), line ("*word*" punch, from the spec), me (your cast), time.
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, Sfx} from '../common';
import {L} from '../../tokens';
import {prog} from '../../lib/anim';
import {CameraLayer, Hud} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import type {SceneCtx} from '../../types';
import {Backdrop} from '../illo/backdrop';
import {Car} from '../illo/car';
import {Figure, type Cast} from '../illo/figure';
import {Petals, Smoke} from '../illo/fx';
import {lit, mix, tone} from '../illo/palette';
import {IlloBand, Svg, timeOf, FOOT} from '../illo/scene';
import {Glow} from '../kit/glow';
import {E} from '../kit/lib';
import {WHITE} from '../kit/stage';

type P = {
  shot?: 'storm' | 'crack' | 'hang' | 'fall';
  hitAt?: number | string;
  line?: string;
  me?: Cast;
  time?: 'day' | 'night' | 'dusk';
};

const GROUND = 1250; // the courtyard's paving line (stage y): wheels and feet stand here, over the subtitle band
const n1 = (v: number) => +v.toFixed(1);

/** The wind: two gusts layered, in degrees. */
const gust = (f: number, k = 1) => k * (1.6 * Math.sin(f / 9) + 0.7 * Math.sin(f / 4.3 + 1.2) + 0.5 * Math.sin(f / 2.1));

/** A clump of leaves: three overlapping ellipses, the lit rim toward the lamp (upper left). */
const Clump: React.FC<{x: number; y: number; r: number; f: number; i: number}> = ({x, y, r, f, i}) => {
  const w = 4 * Math.sin(f / (6 + (i % 3)) + i);
  return (
    <g transform={`translate(${n1(x + w)} ${n1(y)})`}>
      <ellipse cx={-r * 0.1} cy={-r * 0.12} rx={r} ry={r * 0.72} fill={tone(4)} />
      <ellipse cx={0} cy={0} rx={r * 0.98} ry={r * 0.7} fill={tone(6)} />
      <ellipse cx={r * 0.45} cy={r * 0.12} rx={r * 0.6} ry={r * 0.46} fill={tone(7)} />
    </g>
  );
};

/** The limb, drawn from its joint (0, 0) out to the left: a tapered bough, two twigs, five clumps. */
const Limb: React.FC<{f: number; len?: number}> = ({f, len = 560}) => {
  const k = len / 560;
  return (
    <g>
      <path d={`M0 -24L${-len} 46L${-len} 58L0 24Z`} fill={tone(7)} />
      <path d={`M0 -24L${-len} 46`} stroke={tone(3)} strokeWidth={7} fill="none" strokeLinecap="round" />
      <path d={`M${-200 * k} -6L${-300 * k} -90M${-380 * k} 20L${-470 * k} -40`} stroke={tone(7)} strokeWidth={12} strokeLinecap="round" fill="none" />
      {[
        [-170, -40, 92],
        [-300, -90, 104],
        [-400, -10, 110],
        [-480, -50, 96],
        [-560, 40, 88],
      ].map(([x, y, r], i) => (
        <Clump key={i} x={x * k} y={y} r={r * k} f={f} i={i} />
      ))}
    </g>
  );
};

/** The trunk and the crown (the tree stands at tx, its limb's joint at jy). */
const Tree: React.FC<{tx: number; jy: number; f: number; scar?: number}> = ({tx, jy, f, scar = 0}) => {
  const s = gust(f, 0.8);
  return (
    <g>
      <path d={`M${tx - 54} ${FOOT}L${tx - 30} ${jy + 60}L${tx - 26} ${-200}L${tx + 40} ${-200}L${tx + 44} ${jy + 60}L${tx + 66} ${FOOT}Z`} fill={tone(7)} />
      <path d={`M${tx - 30} ${jy + 60}L${tx - 26} -200`} stroke={tone(5)} strokeWidth={6} />
      {scar > 0 ? <path d={`M${tx - 32} ${jy - 18}l-14 12l10 8l-12 14l16 6`} stroke={lit('night')} strokeWidth={5} fill="none" opacity={scar} strokeLinejoin="round" /> : null}
      <g transform={`rotate(${n1(s)} ${tx} ${jy + 200})`}>
        {[
          [tx - 120, jy - 260, 150],
          [tx + 60, jy - 330, 170],
          [tx + 180, jy - 180, 130],
          [tx - 40, jy - 120, 120],
          [tx + 120, jy - 40, 110],
        ].map(([x, y, r], i) => (
          <Clump key={i} x={x} y={y} r={r} f={f} i={i + 5} />
        ))}
      </g>
    </g>
  );
};

/** Leaves blown across the whole picture. */
const Leaves: React.FC<{f: number; seed?: number}> = ({f, seed = 4}) => (
  <g transform={`skewX(-28)`}>
    <Petals frame={f * 1.8} seed={seed} n={12} box={{x: 200, y: 200, w: 1100, h: 1100}} color={tone(4)} />
  </g>
);

export const V142WindyNight: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const f = useCurrentFrame();
  const time = timeOf(p);
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 6, cueFrame(ctx, p.hitAt ?? 1));
  const shot = p.shot ?? 'storm';
  const me: Cast = p.me ?? {is: 'me', outfit: 'puffer', hair: 'textured', beard: 'stubble'};
  const after = f >= hit;
  const kickRot = after ? Math.sin((f - hit) * 1.4) * Math.exp(-(f - hit) / 7) * 3 : 0;

  // each shot: where the tree stands, how big the car is, how the limb hangs
  let body: React.ReactNode = null;
  let sound: React.ReactNode = null;
  if (shot === 'storm' || shot === 'crack') {
    const close = shot === 'crack';
    const tx = 860;
    const jy = 660;
    const droop = close ? 7 * E.out(prog(f, hit, 5)) + kickRot : 0;
    const rot = droop + gust(f, close ? 0.9 : 1.2);
    // the crack shot is the same courtyard pushed in on the joint over the roof (one transform, never a CSS zoom of text)
    const z = close ? 1.55 : 1;
    const ox = close ? 690 : 540;
    const oy = close ? 820 : 960;
    body = (
      <g transform={`translate(${ox} ${oy}) scale(${z}) translate(${-ox} ${-oy})`}>
        {close ? null : <Car uid={`${uid}c`} x={420} y={GROUND} len={560} body="suv" paint="a" dir={-1} frame={f} time={time} />}
        <Tree tx={tx} jy={jy} f={f} scar={close ? prog(f, hit, 4) : 0} />
        <g transform={`translate(${tx - 28} ${jy}) rotate(${n1(-rot)})`}>
          <Limb f={f} />
          {close && after ? (
            <path d="M-6 -30l-18 -26M2 -30l10 -34M-10 26l-20 22" stroke={lit('night')} strokeWidth={6} strokeLinecap="round" opacity={1 - prog(f, hit + 10, 16)} />
          ) : null}
        </g>
      </g>
    );
    sound = close ? (
      <>
        <Sfx name="asmr-paper-tear" at={hit - 2} volume={0.5} />
        <Land at={hit} />
        <Haptic kind="rigid" at={hit + 1} volume={0.34} />
      </>
    ) : (
      <Sfx name="asmr-air-long" at={Math.max(base, e + 2)} volume={0.32} />
    );
  } else if (shot === 'hang') {
    // low by the car: the car big and whole, the broken limb over its roof, swinging
    const tx = 900;
    const jy = 700;
    const swing = 22 + 3.5 * Math.sin((f - e) / 11) + gust(f, 0.6);
    body = (
      <>
        <Car uid={`${uid}c`} x={520} y={GROUND} len={680} body="suv" paint="a" dir={-1} frame={f} time={time} />
        <Tree tx={tx} jy={jy} f={f} scar={1} />
        <g transform={`translate(${tx - 28} ${jy}) rotate(${n1(-swing)})`}>
          <Limb f={f} len={640} />
        </g>
      </>
    );
    sound = <Sfx name="asmr-swell" at={Math.max(base, hit - 6)} volume={0.26} />;
  } else {
    // fall: the car moved aside (left), you beside it; the limb comes down on the spot where the car stood
    const tx = 930;
    const jy = 560;
    const drop = E.in(prog(f, hit - 9, 9));
    const rest = after ? kickRot : 0;
    const rot = (16 + gust(f, 0.6)) * (1 - drop) + (-2 + rest) * drop;
    const dy = drop * (GROUND - jy - 40);
    body = (
      <>
        <Car uid={`${uid}c`} x={280} y={GROUND} len={380} body="suv" paint="a" dir={-1} frame={f} time={time} />
        <Figure uid={`${uid}m`} cast={me} x={500} y={GROUND + 10} size={470} turn={0.7} frame={f} time={time} acts={[{at: e, pose: 'phoneLook', face: 'worried'}, {at: hit + 2, pose: 'handsHead', face: 'shock'}]} />
        <Tree tx={tx} jy={jy} f={f} scar={1} />
        <g transform={`translate(${tx - 28 - drop * 30} ${jy + dy}) rotate(${n1(-rot)})`}>
          <Limb f={f} len={360} />
        </g>
        {after ? <Smoke frame={f - hit} x={760} y={GROUND - 10} kind="smoke" n={6} size={1.4} spread={2} rise={0.5} at={0} time={time} /> : null}
      </>
    );
    sound = (
      <>
        <Sfx name="asmr-drop" at={hit} volume={0.36} />
        <Land at={hit} />
        <Haptic kind="rigid" at={hit + 1} volume={0.36} />
      </>
    );
  }

  return (
    <IlloBand uid={uid} time={time}>
      <CameraLayer depth={0.6}>
        <Svg>
          <Backdrop kind="city" uid={uid} frame={f} time={time} base={GROUND - 40} seed={shot === 'fall' ? 5 : 2} drift={0} />
          <rect x={-200} y={GROUND - 40} width={1480} height={FOOT - GROUND + 40} fill={mix(tone(6), tone(7), 0.5)} />
          <rect x={-200} y={GROUND - 40} width={1480} height={6} fill={tone(5)} />
        </Svg>
        <Glow x={shot === 'fall' ? 180 : 220} y={560} r={300} color="#FFE2B8" k={0.32} />
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>{body}</Svg>
      </CameraLayer>
      <CameraLayer depth={1.3}>
        <Svg>
          <Leaves f={f} seed={shot === 'hang' ? 7 : 4} />
        </Svg>
      </CameraLayer>
      <Hud>
        {p.line ? (
          <div style={{position: 'absolute', left: L.camSafe.left, top: 420, whiteSpace: 'nowrap'}}>
            <Words text={p.line} at={hit} fx="slam" size={110} color={WHITE} />
          </div>
        ) : null}
      </Hud>
      {sound}
    </IlloBand>
  );
};
