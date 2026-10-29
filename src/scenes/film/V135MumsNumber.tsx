// V135MumsNumber: the paper note with mum's number taped inside the windshield, seen from the driver's seat on a real
// greyscale photo ("note"), then torn off the glass ("tear"). The note's words sit on the clean text layer over the paper,
// moved with the paper's own transform.
import React from 'react';
import {Img, staticFile, useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, lead, PictureBand, Sfx} from '../common';
import {C, F} from '../../tokens';
import {ease, prog, spr} from '../../lib/anim';
import {CameraLayer} from '../../lib/camera';
import {OBJ, TXT} from '../../lib/layer';
import {mtav} from '../../lib/format';
import type {SceneCtx} from '../../types';
import {Ink} from '../kit/ink';

type P = {
  shot?: 'note' | 'tear';
  hitAt?: number | string;
  head?: string; // the note's first line (the spec's words)
  look?: string;
};

// the photo (1067 x 1600): the bright windshield over the wheel, blown up so the glass fills the frame's top and the wheel's
// rim crosses its lower half
const PW = 1067;
const PH = 1600;

/** the windshield from the driver's seat, full bleed, greyscale; z: its scale, cx: the photo's x fraction at the frame's centre */
const Glass: React.FC<{z: number; cx?: number; topY?: number}> = ({z, cx = 0.55, topY = -40}) => (
  <div style={{position: 'absolute', left: -80, top: -80, width: 1240, height: 2080, overflow: 'hidden', backgroundColor: '#0B0B0B'}}>
    <Img src={staticFile('photos/interior-wheel-portrait.jpg')} style={{position: 'absolute', left: 620 - cx * PW * z, top: topY + 80, width: PW * z, height: PH * z, maxWidth: 'none', filter: 'grayscale(1) contrast(1.1) brightness(0.96)'}} />
  </div>
);

// the note on the glass (stage px)
const NX = 250;
const NY = 430;
const NW = 580;
const NH = 340;

/** the paper and its two lines; clip: a torn half */
const Note: React.FC<{head: string; style?: React.CSSProperties; tape?: number}> = ({head, style, tape = 1}) => (
  <div style={{position: 'absolute', left: NX, top: NY, width: NW, height: NH, transformOrigin: `${NW / 2}px ${NH / 2}px`, ...style}}>
    <div className={OBJ} style={{position: 'absolute', inset: 0, backgroundColor: '#F7F7F7', borderRadius: 4, boxShadow: '0 18px 40px rgba(0,0,0,0.35)'}} />
    <div className={TXT} style={{position: 'absolute', left: 48, top: 44, fontFamily: F.sans, fontWeight: 700, fontSize: 84, lineHeight: '100px', color: '#0B0B0B', whiteSpace: 'nowrap'}}>{mtav(head)}</div>
    <div className={TXT} style={{position: 'absolute', left: 48, top: 186, fontFamily: F.sans, fontWeight: 700, fontSize: 76, lineHeight: '90px', letterSpacing: '0.04em', color: '#0B0B0B', whiteSpace: 'nowrap'}}>5XX XX XX XX</div>
    {[-1, 1].map((s) => (
      <div key={s} style={{position: 'absolute', top: -22, left: s < 0 ? -30 : NW - 120, width: 150, height: 52, backgroundColor: 'rgba(225,225,225,0.78)', transform: `rotate(${s * 9}deg)`, opacity: tape}} />
    ))}
  </div>
);

const NoteShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const hit = Math.max(lead(ctx) + 10, cueFrame(ctx, p.hitAt ?? 1));
  // the note slaps onto the glass on the cut, then settles; the camera's drift does the rest
  const slap = spr(frame, e, 'land');
  const s = 1.08 - 0.08 * slap;
  const z = 2.2 + 0.08 * prog(frame, e, 90, ease.drift);
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={0.6}>
        <Glass z={z} />
      </CameraLayer>
      <CameraLayer depth={1}>
        <Note head={p.head ?? ''} style={{transform: `scale(${s.toFixed(4)}) rotate(-2deg)`}} tape={prog(frame, e + 6, 8)} />
        <Ink marks={[{kind: 'circle', box: {x: NX + 20, y: NY + 160, w: 540, h: 140}, at: hit}]} room={{x: NX - 30, y: NY - 30, w: NW + 60, h: NH + 60}} end={ctx.dur} />
      </CameraLayer>
      <Sfx name="asmr-paper" at={Math.max(lead(ctx), e)} volume={0.32} />
      <Haptic kind="light" at={hit} />
    </PictureBand>
  );
};

// torn across, between the head and the number: the top stays taped to the glass, the number goes
const TOP = 'polygon(0 0, 100% 0, 100% 41%, 78% 45%, 55% 40%, 30% 46%, 0 42%)';
const BOTTOM = 'polygon(0 42%, 30% 46%, 55% 40%, 78% 45%, 100% 41%, 100% 100%, 0 100%)';

const TearShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const strikeAt = Math.max(lead(ctx) + 6, cueFrame(ctx, 0) + 8);
  const hit = Math.max(strikeAt + 14, cueFrame(ctx, p.hitAt ?? 1));
  const back = Math.max(hit + 16, cueFrame(ctx, 2));
  // chunk 0: close on the note; chunk 1: the bottom half ripped off and out of the frame (a fast exit); chunk 2: the camera
  // pulls back to the bare glass and the scrap of tape
  const push = prog(frame, e, 40, ease.camera);
  const pull = prog(frame, back, 24, ease.camera);
  const z = 2.2 + 0.35 * push - 0.5 * pull;
  const k = 1 + 0.18 * push - 0.3 * pull;
  const rip = prog(frame, hit, 16, ease.whipIn);
  const upper = {clipPath: TOP, transform: `scale(${k.toFixed(4)}) rotate(${(-2 + 3 * prog(frame, hit, 10)).toFixed(3)}deg)`};
  const bottom = {clipPath: BOTTOM, transform: `scale(${k.toFixed(4)}) translate(${(-160 * rip).toFixed(1)}px, ${(1500 * rip).toFixed(1)}px) rotate(${(-2 - 24 * rip).toFixed(3)}deg)`};
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={0.6}>
        <Glass z={z} />
      </CameraLayer>
      <CameraLayer depth={1}>
        <Note head={p.head ?? ''} style={upper} />
        {rip < 1 ? <Note head={p.head ?? ''} style={bottom} tape={0} /> : null}
        {frame < hit ? <Ink marks={[{kind: 'strike', box: {x: NX + 10, y: NY + 190, w: 560, h: 80}, at: strikeAt}]} end={hit} /> : null}
      </CameraLayer>
      <Sfx name="asmr-strike" at={strikeAt} volume={0.3} />
      <Sfx name="asmr-paper-tear" at={hit} volume={0.45} />
      <Haptic kind="rigid" at={hit + 2} />
      <Sfx name="asmr-air" at={back} volume={0.25} />
      <Haptic kind="light" at={back + 4} />
    </PictureBand>
  );
};

export const V135MumsNumber: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => (p.shot === 'tear' ? <TearShot p={p} ctx={ctx} /> : <NoteShot p={p} ctx={ctx} />);
