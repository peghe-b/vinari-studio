// V131WiperNotes: v131-wiper-notes' own pictures. One car (the electric crossover in the film's accent paint), one place
// (the parking strip outside his block, day). The signature: the windshield seen close from outside, the number on paper
// behind the glass; dealers' notes slide under the wiper one by one; his hand rips the whole pile off; then the same car
// and the same man, calm, one push on his phone.
//   shot "glass"  close on the windshield: his number on a paper on the dash, a light sweep across the glass
//   shot "notes"  lower, the wiper big: three dealer notes slide under it, one on each beat
//   shot "rip"    the pile under the wiper, his hand comes in and yanks it all off; the papers fly
//   shot "calm"   wide: the car parked on the strip, him beside it reading one push on his phone
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, PictureBand, Sfx} from '../common';
import {accentsOn, C, F, rgba} from '../../tokens';
import {prog, spr} from '../../lib/anim';
import {mtav} from '../../lib/format';
import {OBJ, TXT} from '../../lib/layer';
import {CameraLayer, Hud, useKick} from '../../lib/camera';
import {footAbove} from '../../lib/guard.mjs';
import type {SceneCtx} from '../../types';
import {Backdrop} from '../illo/backdrop';
import {Car} from '../illo/car';
import {Figure} from '../illo/figure';
import {Hand} from '../illo/hand';
import {IlloBand} from '../illo/scene';
import {accRamp, tone} from '../illo/palette';
import {Banner} from '../kit/ios';
import {INK, WHITE} from '../kit/stage';

type P = {
  look?: 'illustrated';
  shot?: 'glass' | 'notes' | 'rip' | 'calm';
  hitAt?: number | string;
  note?: string; // the word on the dealers' notes
  digits?: string; // the masked number on the paper behind the glass
  push?: {title: string; body: string; when: string};
};

const paintOf = (n: number) => (accentsOn() ? accRamp(C.accA, n) : tone(n));

// the windshield close-up: the glass a trapezoid, the roof edge over it, the bonnet under it to the frame's foot
const GLASS = {top: 600, bottom: 1110, tl: 250, tr: 830, bl: 120, br: 960};
const NOTES = [
  {x: 330, y: 1032, r: -9},
  {x: 520, y: 1018, r: 5},
  {x: 430, y: 1000, r: -2},
];

const Windshield: React.FC<{t: number; hit: number; lift?: number}> = ({t, hit, lift = 0}) => {
  const g = GLASS;
  const sweep = prog(t, hit - 6, 26);
  const sx = -300 + 1600 * sweep;
  const body = paintOf(3);
  const bodyHi = paintOf(2);
  const bodyLo = paintOf(4);
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible', transform: `translateY(${lift}px)`}}>
      <defs>
        <clipPath id="v131glass">
          <polygon points={`${g.tl},${g.top} ${g.tr},${g.top} ${g.br},${g.bottom} ${g.bl},${g.bottom}`} />
        </clipPath>
      </defs>
      {/* the roof and the pillars */}
      <path d={`M ${g.tl - 70} ${g.top - 90} L ${g.tr + 70} ${g.top - 90} L ${g.br + 150} ${g.bottom + 10} L ${g.bl - 150} ${g.bottom + 10} Z`} fill={bodyLo} />
      <rect x={g.tl - 40} y={g.top - 110} width={g.tr - g.tl + 80} height={40} rx={20} fill={bodyHi} />
      {/* the bonnet, down to the frame's foot */}
      <path d={`M ${g.bl - 200} ${g.bottom} L ${g.br + 200} ${g.bottom} L 1240 1990 L -160 1990 Z`} fill={body} />
      <path d={`M ${g.bl - 120} ${g.bottom + 26} L ${g.br + 120} ${g.bottom + 26}`} stroke={bodyHi} strokeWidth={10} strokeLinecap="round" />
      <path d={`M 540 ${g.bottom + 60} L 540 1990`} stroke={bodyLo} strokeWidth={6} opacity={0.5} />
      {/* the glass, the cabin behind it */}
      <polygon points={`${g.tl},${g.top} ${g.tr},${g.top} ${g.br},${g.bottom} ${g.bl},${g.bottom}`} fill={rgba(INK, 0.86)} />
      <g clipPath="url(#v131glass)">
        <rect x={0} y={g.bottom - 120} width={1080} height={140} fill={rgba(INK, 1)} />
        <circle cx={330} cy={g.bottom - 150} r={120} fill="none" stroke={rgba(WHITE, 0.16)} strokeWidth={22} />
        <rect x={200} y={g.top + 40} width={130} height={260} rx={50} fill={rgba(WHITE, 0.07)} />
        <rect x={750} y={g.top + 40} width={130} height={260} rx={50} fill={rgba(WHITE, 0.07)} />
        <polygon points={`${sx},${g.top} ${sx + 120},${g.top} ${sx - 140},${g.bottom} ${sx - 260},${g.bottom}`} fill={rgba(WHITE, 0.22)} />
        <polygon points={`${sx + 180},${g.top} ${sx + 220},${g.top} ${sx - 40},${g.bottom} ${sx - 80},${g.bottom}`} fill={rgba(WHITE, 0.14)} />
      </g>
    </svg>
  );
};

/** The paper with his number, lying on the dash behind the glass (a thing the guards keep whole). */
const NumberPaper: React.FC<{digits: string; k: number; peel?: number}> = ({digits, k, peel = 0}) => (
  <div className={OBJ} style={{position: 'absolute', left: 600, top: 930, width: 300, height: 140, transform: `rotate(${-4 + 30 * peel}deg) translate(${600 * peel}px, ${-500 * peel}px)`, opacity: k * (1 - peel * 0.6), backgroundColor: '#F4F4F4', borderRadius: 10, boxShadow: '0 6px 0 rgba(0,0,0,0.25)'}}>
    <div className={TXT} style={{position: 'absolute', left: 0, right: 0, top: 36, textAlign: 'center', fontFamily: F.mono, fontWeight: 700, fontSize: 52, color: INK, letterSpacing: 2}}>
      {digits}
    </div>
  </div>
);

/** A dealer's note held under the wiper. */
const DealerNote: React.FC<{x: number; y: number; r: number; k: number; word: string; fly?: number; i: number}> = ({x, y, r, k, word, fly = 0, i}) => {
  const inY = (1 - k) * -520;
  const inX = (1 - k) * (i % 2 ? 260 : -260);
  const fx = fly * (700 + 120 * i);
  const fy = fly * (-900 - 140 * i);
  return (
    <div className={OBJ} style={{position: 'absolute', left: x - 120, top: y - 170, width: 240, height: 170, opacity: k > 0 ? 1 : 0, transform: `translate(${inX + fx}px, ${inY + fy}px) rotate(${r + (1 - k) * 18 + fly * (60 + 30 * i)}deg)`, backgroundColor: '#FAFAFA', borderRadius: 8, boxShadow: '0 10px 20px rgba(0,0,0,0.22)'}}>
      <div className={TXT} style={{position: 'absolute', left: 0, right: 0, top: 50, textAlign: 'center', fontFamily: F.sans, fontWeight: 800, fontSize: 60, color: INK}}>
        {mtav(word)}
      </div>
    </div>
  );
};

const Wiper: React.FC<{lift?: number}> = ({lift = 0}) => (
  <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible', transform: `translateY(${lift}px)`}}>
    <line x1={170} y1={1092} x2={780} y2={1046} stroke={INK} strokeWidth={16} strokeLinecap="round" />
    <line x1={190} y1={1100} x2={500} y2={1080} stroke={INK} strokeWidth={9} strokeLinecap="round" />
    <circle cx={170} cy={1094} r={18} fill={INK} />
  </svg>
);

const Sky: React.FC<{uid: string; t: number}> = ({uid, t}) => (
  <CameraLayer depth={0.6}>
    <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
      <Backdrop kind="city" uid={uid} frame={t} time="day" base={640} />
    </svg>
  </CameraLayer>
);

const GlassShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const t = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 10, cueFrame(ctx, p.hitAt ?? '0.5s'));
  const k = spr(t, e, 'enter');
  const kick = useKick();
  return (
    <IlloBand uid={uid} time="day">
      <Sky uid={uid} t={t} />
      <CameraLayer depth={1}>
        <div style={{position: 'absolute', inset: 0, transform: `scale(${1 + 0.05 * prog(t, e, 70)})`, transformOrigin: '740px 1000px'}}>
          <Windshield t={t} hit={hit} />
          <NumberPaper digits={p.digits ?? '5•• ••• •••'} k={k} />
          <Wiper />
        </div>
      </CameraLayer>
      <Hud>
        <div style={{position: 'absolute', left: 560, top: 880, width: 380, height: 240, borderRadius: 24, border: `6px solid ${WHITE}`, opacity: prog(t, hit, 8) * (0.9 + 0.1 * kick)}} />
      </Hud>
      <Sfx name="asmr-swell" at={Math.max(base, hit - 8)} volume={0.2} />
      <Haptic kind="light" at={hit} />
    </IlloBand>
  );
};

const NotesShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const t = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 8, cueFrame(ctx, p.hitAt ?? '0.3s'));
  const gap = 12;
  const word = p.note ?? '';
  return (
    <IlloBand uid={uid} time="day">
      <Sky uid={uid} t={t} />
      <CameraLayer depth={1}>
        <div style={{position: 'absolute', inset: 0, transform: `scale(${1.04 + 0.04 * prog(t, e, 60)})`, transformOrigin: '440px 1050px'}}>
          <Windshield t={t} hit={hit + 30} lift={-60} />
          <div style={{position: 'absolute', inset: 0, transform: 'translateY(-60px)'}}>
            <NumberPaper digits={p.digits ?? '5•• ••• •••'} k={1} />
            {NOTES.map((n, i) => (
              <DealerNote key={i} i={i} x={n.x} y={n.y} r={n.r} word={word} k={spr(t, hit + i * gap, 'land')} />
            ))}
          </div>
          <Wiper lift={-60} />
        </div>
      </CameraLayer>
      {NOTES.map((_, i) => (
        <Sfx key={i} name="asmr-paper" at={Math.max(base, hit + i * gap)} volume={0.3} />
      ))}
      <Land at={hit + 2 * gap} />
    </IlloBand>
  );
};

const RipShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const t = useCurrentFrame();
  const base = lead(ctx);
  const hit = Math.max(base + 14, cueFrame(ctx, p.hitAt ?? '0.6s'));
  const reach = spr(t, hit - 14, 'enter');
  const fly = prog(t, hit, 16);
  const word = p.note ?? '';
  // the hand: in from the right, grabs at the pile, then yanks up and out with it
  const hx = 1180 - 640 * reach + 700 * fly;
  const hy = 1240 - 160 * reach - 900 * fly;
  return (
    <IlloBand uid={uid} time="day">
      <Sky uid={uid} t={t} />
      <CameraLayer depth={1}>
        <div style={{position: 'absolute', inset: 0, transform: 'scale(1.12)', transformOrigin: '460px 1000px'}}>
          <Windshield t={t} hit={hit + 60} lift={-60} />
          <div style={{position: 'absolute', inset: 0, transform: 'translateY(-60px)'}}>
            <NumberPaper digits={p.digits ?? '5•• ••• •••'} k={1} peel={prog(t, hit + 4, 10)} />
            {NOTES.map((n, i) => (
              <DealerNote key={i} i={i} x={n.x} y={n.y} r={n.r} word={word} k={1} fly={prog(t, hit + i * 2, 16)} />
            ))}
          </div>
          <Wiper lift={-60} />
        </div>
      </CameraLayer>
      <CameraLayer depth={1.3}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
          <Hand x={hx} y={Math.min(hy, footAbove(1360))} size={420} angle={-60} pose={fly > 0 || t > hit - 3 ? 'fist' : 'palm'} side="right" sleeve={6} time="day" />
        </svg>
      </CameraLayer>
      <Sfx name="asmr-paper-tear" at={Math.max(base, hit)} volume={0.45} />
      <Haptic kind="rigid" at={hit + 1} volume={0.3} />
    </IlloBand>
  );
};

const CalmShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const t = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 10, cueFrame(ctx, p.hitAt ?? '0.6s'));
  const push = p.push ?? {title: '', body: '', when: ''};
  const ground = 1250;
  return (
    <IlloBand uid={uid} time="day">
      <CameraLayer depth={0.6}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
          <Backdrop kind="city" uid={uid} frame={t} time="day" base={ground - 60} />
        </svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
          <Car uid={uid} x={650} y={ground} len={620} view="side" body="ev" paint="a" dir={-1} frame={t} speed={0} />
          <Figure uid={uid} cast={{is: 'me', outfit: 'suit', hair: 'crop', beard: 'short'}} x={250} y={footAbove(ground + 40)} size={540} pose="phoneLook" turn={0.4} frame={t} time="day" acts={[{at: hit + 20, pose: 'point', turn: 0.6}]} />
        </svg>
      </CameraLayer>
      <Hud>
        <Banner n={{icon: 'vinari', app: 'VINARI', title: push.title, body: push.body, when: push.when}} y={430} k={spr(t, Math.max(e, hit - 4), 'enter')} dark={false} scale={0.9} />
      </Hud>
      <Sfx name="real-phone-buzz" at={Math.max(base, hit - 2)} volume={0.3} />
      <Haptic kind="light" at={hit} />
    </IlloBand>
  );
};

export const V131WiperNotes: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) =>
  p.shot === 'notes' ? <NotesShot p={p} ctx={ctx} /> : p.shot === 'rip' ? <RipShot p={p} ctx={ctx} /> : p.shot === 'calm' ? <CalmShot p={p} ctx={ctx} /> : <GlassShot p={p} ctx={ctx} />;
