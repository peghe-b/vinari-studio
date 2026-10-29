// V136CarplayScreen: the car's own wide screen as a refined plate on the paper, the real CarPlay captures on it.
// "plug": the screen shows only the radio; an ink cable rises from below into the port under it, clicks, and the radio
// wipes away into the CarPlay home with VINARI on it (chunk 0), then the route preview (chunk 1).
// "drive": the first turn in Georgian with its arrow (a hand ring round the instruction), then the arrival (chunk 1).
import React from 'react';
import {Img, staticFile, useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, PictureBand, Sfx} from '../common';
import {C, F} from '../../tokens';
import {ease, prog, spr} from '../../lib/anim';
import {CameraLayer} from '../../lib/camera';
import {mtav} from '../../lib/format';
import {OBJ, TXT} from '../../lib/layer';
import type {SceneCtx} from '../../types';
import {Ink} from '../kit/ink';

type P = {
  look?: string;
  shot?: 'plug' | 'drive';
  station?: string;
  hitAt?: number | string;
};

// the plate: an 800 x 480 capture at 0.95x inside a dark bezel (air on both sides of the frame)
const K = 0.95;
const W = 800 * K;
const H = 480 * K;
const X = (1080 - W) / 2;
const Y = 600;
const B = 22; // the bezel

// the captures in the order they are tapped: the home, the route preview, the first turn, the arrival
const Cap: React.FC<{i: number; o?: number; clip?: number}> = ({i, o = 1, clip = 1}) => {
  const st: React.CSSProperties = {position: 'absolute', left: X, top: Y, width: W, height: H, borderRadius: 14, opacity: o, clipPath: `inset(0 ${((1 - clip) * 100).toFixed(2)}% 0 0)`};
  if (i === 0) return <Img src={staticFile('screens/carplay/f18-03-home-car.png')} style={st} />;
  if (i === 1) return <Img src={staticFile('screens/carplay/f18-07-preview-car.png')} style={st} />;
  if (i === 2) return <Img src={staticFile('screens/carplay/f18-10-guid1-car.png')} style={st} />;
  return <Img src={staticFile('screens/carplay/f18-14-arrived-car.png')} style={st} />;
};

const Plate: React.FC<{children: React.ReactNode; lift: number}> = ({children, lift}) => (
  <div style={{position: 'absolute', inset: 0, transform: `translateY(${(40 * (1 - lift)).toFixed(1)}px)`}}>
    <div className={OBJ} style={{position: 'absolute', left: X - B, top: Y - B, width: W + 2 * B, height: H + 2 * B, borderRadius: 34, backgroundColor: '#111111', boxShadow: '0 30px 60px rgba(0,0,0,0.28)'}} />
    {children}
  </div>
);

const PlugShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const click = Math.max(base + 16, cueFrame(ctx, p.hitAt ?? 0) + 10);
  const tap = Math.max(click + 30, cueFrame(ctx, 1));
  const lift = spr(frame, e, 'enter');
  // the cable rises from the frame's foot into the port, then the wipe runs left to right
  const rise = prog(frame, e + 2, Math.max(6, click - e - 2), ease.camera);
  const wipe = prog(frame, click + 2, 14, ease.enter);
  const portY = Y + H + B + 14;
  const tipY = 1340 - (1340 - portY - 40) * rise;
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={1}>
        <Plate lift={lift}>
          <div style={{position: 'absolute', left: X, top: Y, width: W, height: H, borderRadius: 14, backgroundColor: '#1C1C1C'}} />
          <div className={TXT} style={{position: 'absolute', left: X, top: Y + H / 2 - 50, width: W, textAlign: 'center', fontFamily: F.sans, fontWeight: 700, fontSize: 84, lineHeight: '100px', color: '#FFFFFF', opacity: 1 - wipe}}>{mtav(p.station ?? '')}</div>
          <Cap i={0} clip={wipe} o={frame < tap ? 1 : 1 - prog(frame, tap, 8)} />
          {frame >= tap ? <Cap i={1} o={prog(frame, tap, 8)} /> : null}
        </Plate>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <path d={`M540 1380V${tipY.toFixed(1)}`} stroke={C.ink} strokeWidth={10} strokeLinecap="round" />
          <rect className={OBJ} x={516} y={tipY - 44} width={48} height={64} rx={10} fill={C.ink} />
        </svg>
        <Ink marks={[{kind: 'circle', box: {x: X + 120 * K, y: Y + 220 * K, w: 150 * K, h: 180 * K}, at: click + 18}]} room={{x: X, y: Y, w: W, h: H}} end={tap} />
      </CameraLayer>
      <Sfx name="cc0-click" at={click} volume={0.5} />
      <Haptic kind="rigid" at={click} />
      <Sfx name="asmr-screen" at={click + 4} volume={0.3} />
      <Sfx name="cc0-click-soft" at={tap} volume={0.35} />
      <Haptic kind="light" at={tap} />
    </PictureBand>
  );
};

const DriveShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const ring = Math.max(base + 8, cueFrame(ctx, 0) + 10);
  const arrive = Math.max(ring + 30, cueFrame(ctx, p.hitAt ?? 1));
  const lift = spr(frame, e, 'enter');
  const swap = prog(frame, arrive, 10, ease.enter);
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={1}>
        <Plate lift={lift}>
          <Cap i={2} o={1 - swap} />
          {frame >= arrive ? <Cap i={3} o={swap} /> : null}
        </Plate>
        <Ink marks={[{kind: 'circle', box: {x: X + 120 * K, y: Y + 22 * K, w: 262 * K, h: 280 * K}, at: ring}]} room={{x: X, y: Y, w: W, h: H}} end={arrive} />
      </CameraLayer>
      <Sfx name="asmr-tap" at={ring} volume={0.25} />
      <Land at={arrive} />
      <Haptic kind="light" at={arrive} />
    </PictureBand>
  );
};

export const V136CarplayScreen: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => (p.shot === 'drive' ? <DriveShot p={p} ctx={ctx} /> : <PlugShot p={p} ctx={ctx} />);
