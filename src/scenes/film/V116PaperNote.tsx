// src/scenes/film/V116PaperNote.tsx: v116-paper-note's own visual. A paper note stuck on the car's dashboard holds the
// car's two dates; a week later it peels off and is gone. Then the same note flies off the dash into the phone held over
// it and turns into Vinari's small white widget on the home screen, which counts the days by itself; a finger taps it
// (the app opens there); last the widget is lifted big and the gas cylinder's line comes up, free.
// One place all film: the inside of her car by day, the street through the windshield.
//   shot   note | fall | widget | lift | tap | free
//   hitAt  the key moment (a chunk or "1.2s"): the note pressed on, the note falls, the note lands as the widget, the
//          days land, the finger taps, the punch lands
//   note   the two handwritten words on the paper ([line1, line2]); label, days, unit: the widget's words; label2 the
//          free shot's second line; line: the punch ("*word*")
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, PictureBand, Sfx} from '../common';
import {C, F} from '../../tokens';
import {ease, prog, spr} from '../../lib/anim';
import {CameraLayer, Hud} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import {mtav} from '../../lib/format';
import {OBJ, TXT} from '../../lib/layer';
import {textWidth} from '../../lib/measure';
import type {SceneCtx} from '../../types';
import {Backdrop} from '../illo/backdrop';
import {acc, accRamp, mix} from '../illo/palette';
import {IlloBand, Svg, TOP, FOOT} from '../illo/scene';
import {INK, GREY, WHITE} from '../kit/stage';

type P = {
  shot?: 'note' | 'fall' | 'widget' | 'lift' | 'tap' | 'free';
  hitAt?: number | string;
  note?: string[];
  label?: string;
  days?: string;
  unit?: string;
  label2?: string;
  line?: string;
};

// the dashboard's top edge and the note's place on its face
const DASH = 930;
const NX = 560;
const NY = 1110;
const NS = 270;
// the phone held over the dash: whole, between the meta bar and the subtitle band
const PX = 340;
const PY = 430;
const PW = 400;
const PH = 860;
// the small widget's slot on the home screen (2 x 2 icons), and the icons' grid
const SX = PX + 34;
const SY = PY + 128;
const SS = 160;
const ICON = 66;
const GAPX = (PW - 68 - 4 * ICON) / 3;

const n1 = (v: number) => +v.toFixed(1);

/** The car's inside by day: the street through the glass, the A-pillars, the dashboard running to the frame's foot. */
const Cabin: React.FC<{uid: string; frame: number; soft?: boolean}> = ({uid, frame, soft}) => {
  const dash = C.il6;
  const lid = mix(C.il5, C.il6, 0.4);
  return (
    <>
      <CameraLayer depth={0.6}>
        <Svg style={soft ? {filter: 'blur(6px)'} : undefined}>
          <rect x={-200} y={TOP} width={1480} height={DASH + 40 - TOP} fill={C.bg} />
          <Backdrop kind="city" uid={`${uid}b`} frame={frame} base={DASH + 30} drift={0.15} seed={116} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg style={soft ? {filter: 'blur(5px)'} : undefined}>
          {/* the glass: two soft reflections */}
          <path d={`M180 ${TOP} L330 ${TOP} L120 ${DASH} L-30 ${DASH} Z`} fill={WHITE} opacity={0.16} />
          <path d={`M720 ${TOP} L770 ${TOP} L600 ${DASH} L550 ${DASH} Z`} fill={WHITE} opacity={0.12} />
          {/* the A-pillars */}
          <path d={`M-200 ${TOP} L90 ${TOP} L-20 ${DASH + 20} L-200 ${DASH + 20} Z`} fill={dash} />
          <path d={`M1280 ${TOP} L990 ${TOP} L1100 ${DASH + 20} L1280 ${DASH + 20} Z`} fill={dash} />
          {/* the dashboard: its top lit, its face running to the foot */}
          <path d={`M-200 ${DASH + 30} Q540 ${DASH - 40} 1280 ${DASH + 30} L1280 ${FOOT} L-200 ${FOOT} Z`} fill={dash} />
          <path d={`M-200 ${DASH + 30} Q540 ${DASH - 40} 1280 ${DASH + 30} L1280 ${DASH + 70} Q540 ${DASH + 2} -200 ${DASH + 70} Z`} fill={lid} />
          <path d={`M-200 ${DASH + 150} Q540 ${DASH + 90} 1280 ${DASH + 150}`} stroke={mix(dash, C.il7, 0.5)} strokeWidth={4} fill="none" />
          {/* two air vents on the face, either side */}
          <rect x={90} y={DASH + 200} width={150} height={56} rx={22} fill={mix(dash, C.il7, 0.55)} />
          <rect x={840} y={DASH + 200} width={150} height={56} rx={22} fill={mix(dash, C.il7, 0.55)} />
        </Svg>
      </CameraLayer>
    </>
  );
};

/** The paper note: the film's accent paper, softly shaded, two handwritten words and a scribbled line. */
const Note: React.FC<{words: string[]; curl?: number}> = ({words, curl = 0}) => {
  const paper = acc('a');
  const c = curl * 70;
  return (
    <div className={OBJ} style={{position: 'absolute', left: 0, top: 0, width: NS, height: NS}}>
      <svg width={NS} height={NS} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        <rect x={6} y={10} width={NS} height={NS} rx={6} fill={C.il7} opacity={0.18} />
        <path d={`M0 0 H${NS} V${NS - c} L${NS - c} ${NS} H0 Z`} fill={accRamp(paper, 1.4)} />
        <rect x={0} y={0} width={NS} height={40} fill={accRamp(paper, 2.2)} />
        {curl > 0 ? <path d={`M${NS} ${NS - c} L${NS - c} ${NS} L${NS - c * 0.9} ${NS - c * 0.9} Z`} fill={accRamp(paper, 3.4)} /> : null}
        <path d={`M40 ${NS - 64} q40 -18 80 0 t80 0 t40 -6`} stroke={INK} strokeWidth={5} fill="none" strokeLinecap="round" />
      </svg>
      {words.slice(0, 2).map((w, i) => (
        <div key={i} className={TXT} style={{position: 'absolute', left: 36, top: 62 + i * 70, font: `700 56px ${F.sans}`, color: INK, whiteSpace: 'nowrap', transform: `rotate(${i ? 2 : -3}deg)`}}>
          {mtav(w)}
        </div>
      ))}
    </div>
  );
};

/** Vinari's small widget, drawn at its big size (400 x 400) and scaled by its holder: white card, black ink. */
const Widget: React.FC<{label: string; days: string; unit: string; k?: number; count?: number}> = ({label, days, unit, k = 1, count = 1}) => {
  const ls = Math.min(42, (42 * 330) / Math.max(1, textWidth(mtav(label), `600 42px ${F.sans}`)));
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: 400, height: 400, borderRadius: 84, backgroundColor: WHITE, boxShadow: `0 18px 48px ${'rgba(0,0,0,0.18)'}`}}>
      <svg width={400} height={400} style={{position: 'absolute', inset: 0}}>
        <circle cx={78} cy={84} r={34} fill={INK} />
        <path d="M62 85 l11 11 l21 -23" stroke={WHITE} strokeWidth={7} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <rect x={44} y={330} width={312} height={12} rx={6} fill={'#E4E4E4'} />
        <rect x={44} y={330} width={n1(312 * 0.18 * count)} height={12} rx={6} fill={INK} />
      </svg>
      <div style={{opacity: k}}>
        <div className={TXT} style={{position: 'absolute', left: 44, top: 136, font: `600 ${n1(ls)}px ${F.sans}`, color: INK, whiteSpace: 'nowrap'}}>
          {mtav(label)}
        </div>
        <div className={TXT} style={{position: 'absolute', left: 40, top: 168, font: `700 128px ${F.sans}`, color: INK, whiteSpace: 'nowrap', letterSpacing: -2}}>
          {days}
          <span style={{font: `600 44px ${F.sans}`, color: GREY, marginLeft: 14}}>{mtav(unit)}</span>
        </div>
      </div>
    </div>
  );
};

/** The phone held over the dash: an ink body, the home screen (a calm wallpaper, rows of icons), whole in the frame. */
const Phone: React.FC<{children?: React.ReactNode; flash?: number; veil?: number}> = ({children, flash = 0, veil = 0}) => {
  const wall = accRamp(acc('b'), 1.2);
  const icons: React.ReactNode[] = [];
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 4; c++) {
      if (r < 2 && c < 2) continue; // the widget's slot
      const x = PX + 34 + c * (ICON + GAPX);
      const y = PY + 128 + r * (ICON + 52) + (r >= 2 ? 0 : 0);
      icons.push(<rect key={`${r}-${c}`} x={n1(x)} y={n1(y)} width={ICON} height={ICON} rx={17} fill={WHITE} opacity={0.82 - 0.06 * ((r + c) % 3)} />);
    }
  }
  return (
    <div className={OBJ} style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, pointerEvents: 'none'}}>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        <rect x={PX - 14} y={PY - 14} width={PW + 28} height={PH + 28} rx={70} fill={'#151515'} />
        <rect x={PX} y={PY} width={PW} height={PH} rx={58} fill={wall} />
        <rect x={PX + PW / 2 - 62} y={PY + 20} width={124} height={34} rx={17} fill={'#0A0A0A'} />
        {icons}
        <rect x={PX + 24} y={PY + PH - 130} width={PW - 48} height={104} rx={40} fill={WHITE} opacity={0.5} />
        <rect x={PX} y={PY} width={PW} height={PH} rx={58} fill={'#000000'} opacity={veil} />
        <rect x={PX} y={PY} width={PW} height={PH} rx={58} fill={WHITE} opacity={flash} />
      </svg>
      {children}
    </div>
  );
};

export const V116PaperNote: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const f = useCurrentFrame();
  const shot = p.shot ?? 'note';
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 10, cueFrame(ctx, p.hitAt ?? 1));
  const words = p.note ?? [];
  const label = p.label ?? '';
  const days = p.days ?? '';
  const unit = p.unit ?? '';

  if (shot === 'note' || shot === 'fall') {
    // the note: stuck on (a press on hitAt) or, on 'fall', the corner lifting, then peeling off and dropping out
    const press = shot === 'note' ? prog(f, hit, 5) * (1 - prog(f, hit + 5, 10)) : 0;
    const flap = shot === 'fall' ? 0.25 + 0.2 * Math.sin(f / 3) * (1 - prog(f, hit, 4)) : 0;
    const drop = shot === 'fall' ? prog(f, hit, 14, ease.whipIn) : 0;
    // the opening: frame 0 shows the note just above the dash, it slaps on by frame ~10 (an event inside 0.6 s)
    const settle = shot === 'note' ? spr(f, ctx.index === 0 ? 3 : e, 'land') : 1;
    const s = (1.3 - 0.3 * settle) * (1 - 0.05 * press);
    const rot = -6 - 12 * (1 - settle) + 38 * drop;
    const dy = 900 * drop;
    const dx = -60 * drop;
    return (
      <IlloBand uid={uid}>
        <Cabin uid={uid} frame={f} />
        <CameraLayer depth={1}>
          <div style={{position: 'absolute', left: NX - NS / 2 + dx, top: NY - NS / 2 + dy, width: NS, height: NS, transform: `rotate(${n1(rot)}deg) scale(${s.toFixed(4)})`, transformOrigin: '50% 0%', opacity: shot === 'fall' ? 1 - prog(f, hit + 8, 6) : 1}}>
            <Note words={words} curl={flap + drop} />
          </div>
          {shot === 'fall' ? (
            // the empty place it left: a faint square of dust
            <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: prog(f, hit + 4, 10)}}>
              <rect x={NX - NS / 2 + 8} y={NY - NS / 2 + 8} width={NS - 16} height={NS - 16} rx={6} fill="none" stroke={mix(C.il6, C.il4, 0.5)} strokeWidth={4} strokeDasharray="14 12" />
            </svg>
          ) : null}
        </CameraLayer>
        {shot === 'note' ? <Sfx name="asmr-paper" at={Math.max(base, e)} volume={0.32} /> : null}
        {shot === 'note' ? <Haptic kind="light" at={hit} /> : <Sfx name="asmr-paper-tear" at={hit} volume={0.34} />}
        {shot === 'fall' ? <Haptic kind="soft" at={hit + 10} /> : null}
      </IlloBand>
    );
  }

  // the phone shots: the cabin soft behind, the phone held over the dash
  const rise = spr(f, e, 'enter');
  const lift = shot === 'lift' || shot === 'free' ? spr(f, shot === 'lift' ? hit - 8 : e, 'land') : 0;
  // the widget: in its slot (scale SS / 400), lifted toward the middle and up to 1.0
  const ws = SS / 400 + (1 - SS / 400) * lift;
  const wx = SX + (540 - 200 - SX) * lift;
  const wy = SY + (560 - SY) * lift;
  let paper = 0; // the note flying in (widget shot only)
  let nx = 0;
  let ny = 0;
  let nr = 0;
  let ns = 1;
  if (shot === 'widget') {
    const fly = prog(f, e + 4, Math.max(8, hit - e - 4), ease.camera);
    nx = (NX - NS / 2) + (SX - (NX - NS / 2)) * fly;
    ny = 1180 + (SY - 1180) * fly;
    nr = -10 * (1 - fly) + 0;
    ns = 1 + (SS / NS - 1) * fly;
    paper = 1 - prog(f, hit - 3, 6);
  }
  const content = shot === 'widget' ? prog(f, hit, 8) : 1;
  const count = shot === 'lift' ? prog(f, hit, 14, ease.countUp) : 1;
  const shown = shot === 'lift' ? String(Math.round(Number(days) * count) || 0) : days;
  // the tap: a finger from the right reaches the widget and presses on hitAt; the screen goes white (the app opens)
  const tipX = SX + SS / 2;
  const tipY = SY + SS / 2;
  const reach = shot === 'tap' ? prog(f, e + 2, Math.max(8, hit - e - 2), ease.camera) : 0;
  const press = shot === 'tap' ? prog(f, hit - 2, 3) * (1 - prog(f, hit + 3, 6)) : 0;
  const flash = shot === 'tap' ? prog(f, hit + 2, 5) * 0.9 : 0;
  const ring = shot === 'tap' ? prog(f, hit, 14, ease.enter) : 0;
  const yOff = 60 * (1 - rise);
  const free = shot === 'free';
  return (
    <IlloBand uid={uid}>
      <Cabin uid={uid} frame={f} soft />
      <CameraLayer depth={1}>
        <div style={{position: 'absolute', inset: 0, transform: `translateY(${n1(yOff)}px)`}}>
          <Phone flash={flash} veil={free ? 0.62 * lift : shot === 'lift' ? 0.4 * lift : 0}>
            {shot !== 'widget' || paper < 1 ? (
              <div className={OBJ} style={{position: 'absolute', left: wx, top: wy, width: 400, height: 400, transform: `translate(${n1(SS * 0.03 * press)}px, ${n1(SS * 0.03 * press)}px) scale(${(ws * (1 - 0.06 * press) * (1 + 0.04 * reach * (1 - prog(f, hit, 4)))).toFixed(4)})`, transformOrigin: '0 0', opacity: shot === 'widget' ? 1 - paper : 1}}>
                <Widget label={free ? (p.label2 ?? '') : label} days={free ? '' : shown} unit={free ? '' : unit} k={content} count={free ? 0.5 : count} />
              </div>
            ) : null}
            {shot === 'widget' && paper > 0 ? (
              <div style={{position: 'absolute', left: nx, top: ny, width: NS, height: NS, transform: `rotate(${n1(nr)}deg) scale(${ns.toFixed(4)})`, transformOrigin: '0 0', opacity: paper}}>
                <Note words={words} />
              </div>
            ) : null}
            {shot === 'tap' ? (
              <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
                <circle cx={tipX} cy={tipY} r={n1(30 + 90 * ring)} fill="none" stroke={INK} strokeWidth={5} opacity={n1(0.7 * (1 - ring))} />
              </svg>
            ) : null}
          </Phone>
        </div>
      </CameraLayer>
      {free ? (
        <Hud>
          <div style={{position: 'absolute', left: 540, top: 1010, transform: 'translateX(-50%)', whiteSpace: 'nowrap'}}>
            <Words text={p.line ?? ''} at={hit} fx="slam" size={110} color={WHITE} />
          </div>
        </Hud>
      ) : null}
      {shot === 'widget' ? <Sfx name="asmr-air-long" at={Math.max(base, e + 2)} volume={0.24} /> : null}
      {shot === 'widget' ? <Land at={hit} /> : null}
      {shot === 'lift' ? <Sfx name="asmr-count-roll" at={Math.max(base, hit)} volume={0.3} /> : null}
      {shot === 'lift' ? <Land at={hit + 14} /> : null}
      {shot === 'tap' ? <Sfx name="asmr-tap" at={hit} volume={0.4} /> : null}
      {shot === 'tap' ? <Haptic kind="light" at={hit} /> : null}
      {free ? <Land at={hit} /> : null}
    </IlloBand>
  );
};
