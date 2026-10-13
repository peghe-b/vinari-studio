// v101-prank-scan: a friend scans your windshield card again and again for a laugh. The "count" phase: he stands in
// profile with his phone raised at the parked car, every scan a small glint on the glass and a tick, the HUD counter
// climbing to x20 and slamming on the hit. The "bored" phase: the counter stands still, he lowers the phone, shrugs and
// walks out of the frame, the punch word landing as he goes.
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, Sfx} from '../common';
import {C, L, rgba, type Tone} from '../../tokens';
import {ease, prog} from '../../lib/anim';
import {CameraLayer, Hud, useKick} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import type {SceneCtx} from '../../types';
import {Figure, type Cast} from '../illo/figure';
import {Car, type CarBody} from '../illo/car';
import {Backdrop, type BackdropKind} from '../illo/backdrop';
import {dark, acc} from '../illo/palette';
import {FOOT, IlloBand, Svg, timeOf} from '../illo/scene';
import {Glint, Shadow} from '../illo/solid';

type P = {
  look?: 'illustrated' | 'diagram';
  phase?: 'count' | 'bored';
  hitAt?: number | string;
  count?: number; // where the counter lands (the voice's number)
  line?: string; // the bored phase's punch ("*word*")
  tone?: Tone;
  cast?: Cast;
  body?: CarBody;
  where?: BackdropKind;
  time?: 'day' | 'night' | 'dusk';
};

const GROUND = 1300;
const CAR_X = 690;
const CAR_LEN = 600;
const ME_X = 215;
// the windshield of the parked car (stage units), where every scan glints
const GLASS_X = 590;
const GLASS_Y = 1110;

export const V101PrankScan: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const uid = useId();
  const e = entrance(ctx);
  const base = lead(ctx);
  const bored = p.phase === 'bored';
  const hit = Math.max(base + 12, cueFrame(ctx, p.hitAt ?? 1));
  const kick = useKick();
  const time = timeOf(p);
  const night = dark(time);
  const total = p.count ?? 20;
  // the scans: evenly from the entrance to the hit (count phase); none in the bored phase
  const first = Math.max(e, base, 0);
  const step = (hit - first) / Math.max(1, total - 1);
  const scans: number[] = [];
  if (!bored) for (let i = 0; i < total; i++) scans.push(Math.round(first + step * i));
  const done = scans.filter((s) => frame >= s);
  const n = bored ? total : Math.max(1, done.length);
  const last = done.reduce((m, s) => Math.max(m, s), first);
  // the bored walk: he turns away on the hit and walks left out of the frame
  const walk = bored ? prog(frame, hit + 6, 90, ease.inOut) : 0;
  const meX = ME_X - 380 * walk;
  const acts = bored
    ? [
        {at: e, face: 'meh' as const, pose: 'phoneLook' as const, turn: 0.8},
        {at: hit - 4, face: 'meh' as const, pose: 'shrug' as const, turn: 0.5},
        {at: hit + 6, face: 'neutral' as const, pose: 'walk' as const, turn: -0.85},
      ]
    : [
        {at: e, face: 'smirk' as const, pose: 'phoneLook' as const, turn: 0.8},
        {at: hit, face: 'grin' as const, pose: 'phoneLook' as const, turn: 0.8},
      ];
  const counterScale = 1 + 0.18 * kick;
  const fade = bored ? 1 - prog(frame, hit + 10, 30) * 0.55 : 1;
  const ring = acc('a');
  return (
    <IlloBand uid={uid} time={time}>
      <CameraLayer depth={0.6}>
        <Svg>
          <Backdrop kind={p.where ?? 'bridge'} uid={uid} frame={frame} time={time} base={GROUND} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          <rect x={-120} y={GROUND} width={1320} height={FOOT - GROUND} fill={night ? C.il7 : C.il2} />
          <Shadow uid={uid} cx={CAR_X} cy={GROUND + 2} rx={380} ry={20} />
          <Car uid={uid} x={CAR_X} y={GROUND} len={CAR_LEN} body={p.body ?? 'suv'} paint="a" caliper="b" dir={-1} frame={frame} time={time} />
          {scans.map((s, i) => (
            <Glint key={i} x={GLASS_X + ((i * 37) % 60) - 30} y={GLASS_Y + ((i * 23) % 40) - 20} size={34} at={s} frame={frame} dur={10} />
          ))}
          {!bored && frame >= first ? (
            <circle cx={GLASS_X} cy={GLASS_Y} r={26 + 10 * prog(frame, last, 8)} fill="none" stroke={ring} strokeWidth={3} opacity={(1 - prog(frame, last, 8)) * 0.9} />
          ) : null}
          <Shadow uid={uid} cx={meX} cy={GROUND + 2} rx={100} />
          <Figure uid={uid} cast={p.cast ?? 'friend'} x={meX} y={GROUND} size={620} frame={frame} time={time} acts={acts} />
        </Svg>
      </CameraLayer>
      <Hud>
        <div
          className={TXT}
          style={{
            position: 'absolute',
            left: L.camSafe.left,
            top: 470,
            fontFamily: 'FiraGO, NotoGeo, sans-serif',
            fontWeight: 600,
            fontSize: 150,
            lineHeight: 1,
            color: C.ink,
            opacity: fade,
            transform: `scale(${counterScale.toFixed(4)})`,
            transformOrigin: 'left center',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {`×${n}`}
        </div>
        {bored ? (
          <div style={{position: 'absolute', left: L.camSafe.left, top: 660, whiteSpace: 'nowrap'}}>
            <Words text={p.line ?? '*მორჩა*'} at={hit + 8} fx="slam" size={96} punchTone={p.tone ?? 'a'} />
          </div>
        ) : (
          <div className={TXT} style={{position: 'absolute', left: L.camSafe.left + 8, top: 640, fontFamily: 'FiraGO, NotoGeo, sans-serif', fontSize: 34, color: rgba(C.ink, 0.6), letterSpacing: 2}}>
            {mtav('სკანი')}
          </div>
        )}
      </Hud>
      {scans.map((s, i) => (i % 2 === 0 ? <Sfx key={i} name="asmr-tick-fine" at={s} volume={0.22} /> : null))}
      {bored ? <Sfx name="asmr-air-long" at={Math.max(base, hit)} volume={0.2} /> : <Land at={hit} />}
      <Haptic kind="rigid" at={hit + 2} volume={0.3} />
    </IlloBand>
  );
};
