// src/scenes/film/V129KubicaReturn.tsx: v129's own picture, the 24 hours of Le Mans lived from the trackside. A racer
// (the kit's racer body, the film's accent paint, number 83) runs flat out along a kerbed straight while the world streams
// past behind it; above it a ring of 24 hour segments fills as the race goes on. Three shots of the same car and place:
// "night" (the dark plate, the headlamps on, the ring in its middle hours), "dawn" (dusk, the ring nearly full) and
// "finish" (day: the last segment closes on the key moment, the camera kicks and the punch word lands in the ring).
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, PictureBand, Sfx} from '../common';
import {C, F} from '../../tokens';
import {prog, spr} from '../../lib/anim';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import {textWidth} from '../../lib/measure';
import {CameraLayer, Hud, useKick} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import type {SceneCtx} from '../../types';
import {Car} from '../illo/car';
import {Backdrop, Plate} from '../illo/backdrop';
import {SpeedLines} from '../illo/fx';
import {DefsSvg} from '../illo/solid';
import {dark, far, lit, tone, type Time} from '../illo/palette';
import {FOOT, TOP} from '../illo/scene';
import {E} from '../kit/lib';

type P = {
  look?: 'illustrated';
  shot?: 'night' | 'midnight' | 'dawn' | 'finish';
  from?: number; // the ring's hours at the shot's start
  to?: number; // and at its end (or on hitAt)
  hitAt?: number | string;
  line?: string; // the punch on the finish, "*word*"
};

const BASE = 1060; // the track's edge: the car's ground line
const RX = 540;
const RY = 610;
const RR = 190;
const SEG = 24;

const arc = (r: number, a0: number, a1: number) => {
  const p0 = [RX + r * Math.sin(a0), RY - r * Math.cos(a0)];
  const p1 = [RX + r * Math.sin(a1), RY - r * Math.cos(a1)];
  const big = a1 - a0 > Math.PI ? 1 : 0;
  return `M${p0[0].toFixed(1)} ${p0[1].toFixed(1)} A${r} ${r} 0 ${big} 1 ${p1[0].toFixed(1)} ${p1[1].toFixed(1)}`;
};

export const V129KubicaReturn: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const shot = p.shot ?? 'night';
  const rear = shot === 'midnight'; // the same car from behind, its tail lamps running away into the dark
  const time: Time = shot === 'night' || rear ? 'night' : shot === 'dawn' ? 'dusk' : 'day';
  // the centre dashes rushing toward the camera on the rear shot
  const lanes: React.ReactNode[] = [];
  for (let i = 0; i < 7; i++) {
    const z = (frame * 0.035 + i / 7) % 1;
    const y = BASE + (FOOT - BASE) * z * z;
    const w = 6 + 34 * z * z;
    lanes.push(<rect key={i} x={540 - w / 2} y={y} width={w} height={8 + 90 * z * z} fill={tone(2)} opacity={0.8} />);
  }
  const onDark = dark(time);
  const ink = onDark ? C.il0 : C.ink;
  const hasHit = p.hitAt !== undefined;
  const hit = hasHit ? Math.max(base + 12, cueFrame(ctx, p.hitAt)) : ctx.dur - 8;
  const kick = useKick();
  const from = p.from ?? 8;
  const to = p.to ?? 14;
  const run = E.inOut(prog(frame, e + 4, Math.max(12, (hasHit ? hit : ctx.dur - 8) - e - 4)));
  const h = from + (to - from) * run;
  const shown = Math.min(SEG, Math.floor(h + 1e-6));
  const appear = spr(frame, e, 'enterXL');
  const scroll = frame * 34;
  // the kerb and the lane dashes stream past under the car
  const kerbs: React.ReactNode[] = [];
  const kw = 90;
  const off = scroll % (kw * 2);
  for (let i = -1; i < 16; i++) {
    const x = i * kw * 2 - off;
    kerbs.push(<rect key={i} x={x} y={BASE + 4} width={kw} height={22} fill={onDark ? tone(1) : tone(5)} />);
  }
  const dashes: React.ReactNode[] = [];
  const dw = 160;
  const doff = (scroll * 1.25) % (dw * 2);
  for (let i = -1; i < 9; i++) {
    dashes.push(<rect key={i} x={i * dw * 2 - doff} y={1236} width={dw} height={10} rx={5} fill={onDark ? tone(3) : tone(1)} />);
  }
  const segs: React.ReactNode[] = [];
  const gap = 0.05;
  for (let i = 0; i < SEG; i++) {
    const a0 = (i / SEG) * Math.PI * 2 + gap;
    const a1 = ((i + 1) / SEG) * Math.PI * 2 - gap;
    const on = i < shown;
    const last = i === SEG - 1 && on && hasHit;
    segs.push(<path key={i} d={arc(RR, a0, a1)} fill="none" stroke={on ? (last ? C.accA : ink) : onDark ? tone(5) : C.rule} strokeWidth={on ? 22 + (last ? 8 * kick : 0) : 14} strokeLinecap="butt" />);
  }
  // one soft tick a new hour (a handful a shot), the land on the key moment
  const ticks: React.ReactNode[] = [];
  for (let i = Math.floor(from) + 1; i <= Math.min(SEG, Math.floor(to)); i++) {
    const k = (i - from) / Math.max(0.001, to - from);
    const f = Math.round(e + 4 + k * ((hasHit ? hit : ctx.dur - 8) - e - 4));
    if (f >= base && ticks.length < 8) ticks.push(<Sfx key={i} name="asmr-tick-fine" at={f} volume={0.22} />);
  }
  const num = String(shown);
  const line = p.line ?? '*1*';
  const plain = mtav(line.replace(/\*/g, ''));
  const size = Math.min(110, Math.floor((110 * 300) / Math.max(1, textWidth(plain, `700 110px ${F.sans}`))));
  const swap = hasHit ? prog(frame, hit - 2, 6) : 0;
  return (
    <PictureBand camera={false}>
      <DefsSvg uid={uid} />
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        <Plate time={time} top={TOP} bottom={FOOT} />
      </svg>
      <CameraLayer depth={0.6}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
          <Backdrop kind="highway" uid={uid} frame={frame} time={time} scroll={scroll * 0.25} base={BASE} seed={3} />
        </svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
          <rect x={-200} y={BASE} width={1480} height={FOOT - BASE} fill={onDark ? tone(6) : far(0.4, time)} />
          {rear ? (
            <>
              <polygon points={`470,${BASE} 610,${BASE} 1380,${FOOT} -300,${FOOT}`} fill={tone(5)} />
              {lanes}
              <Car uid={`${uid}c`} x={540} y={1250} len={1100} body="racer" view="rear" paint="a" frame={frame} speed={1} time={time} lights={{tail: 1, brake: 0}} />
            </>
          ) : (
            <>
              {kerbs}
              {dashes}
              <SpeedLines frame={frame} n={12} box={{x: 0, y: 860, w: 1080, h: 180}} speed={1} dir={-1} time={time} opacity={0.6} />
              <Car uid={`${uid}c`} x={540} y={BASE} len={620} body="racer" view="side" paint="a" number="83" frame={frame} speed={1} time={time} lights={{head: onDark ? 1 : 0, beam: shot === 'night' ? 1 : 0, tail: onDark ? 0.8 : 0}} />
            </>
          )}
        </svg>
      </CameraLayer>
      <Hud>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear}}>
          {segs}
        </svg>
        <div className={TXT} style={{position: 'absolute', left: RX - 150, top: RY - 70, width: 300, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: appear * (1 - swap), fontFamily: F.sans, fontWeight: 700, fontSize: 112, color: ink, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap'}}>
          {num}
        </div>
        {hasHit ? (
          <div style={{position: 'absolute', left: RX - 150, top: RY - 70, width: 300, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap'}}>
            <Words text={line} at={hit} fx="slam" size={size} color={ink} />
          </div>
        ) : null}
      </Hud>
      <Sfx name="asmr-air-long" at={Math.max(base, e + 2)} volume={0.2} />
      {ticks}
      {hasHit ? <Land at={hit} /> : null}
      {hasHit ? <Haptic kind="rigid" at={hit + 2} volume={0.3} /> : null}
    </PictureBand>
  );
};
