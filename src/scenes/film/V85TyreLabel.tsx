// src/scenes/film/V85TyreLabel.tsx: v85-tyre-label's own visual. A diagram of a tyre seen from the side rolls into
// place; a loupe drops onto the tiny print on its sidewall (the maximum pressure), the print is stamped in red on the
// key moment, then the tyre steps back and the tyre information label swings in and gets the green check.
// Props: look "diagram", loupeAt, hitAt, labelAt (chunks or "1.2s"), line (the punch on the hit), good (the punch on
// the label), print (the sidewall print, Latin), source.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, PictureBand, Sfx, SourceLine} from '../common';
import {C, F, L, rgba, toneBig} from '../../tokens';
import {ease, prog, spr} from '../../lib/anim';
import {capsLatin} from '../../lib/format';
import {TXT} from '../../lib/layer';
import {CameraLayer, Hud, useKick} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import type {SceneCtx} from '../../types';

type P = {
  look?: string;
  loupeAt?: number | string;
  hitAt?: number | string;
  labelAt?: number | string;
  line?: string;
  good?: string;
  print?: string;
  source?: string;
};

// the tyre, in stage units
const CX = 540;
const CY = 830;
const RO = 330; // the tread's outer edge
const RT = 300; // the tread's inner edge
const RI = 196; // the rim's lip
const RM = 252; // the sidewall's print line
const PRINT_A = 40; // where the maximum-pressure print sits (degrees, 0 = up, clockwise)
const TREAD = 56;
const LOUPE_R = 150;
const LOUPE_X = 742;
const LOUPE_Y = 560;

const rad = (d: number) => (d * Math.PI) / 180;
const px = (r: number, d: number) => CX + Math.sin(rad(d)) * r;
const py = (r: number, d: number) => CY - Math.cos(rad(d)) * r;

export const V85TyreLabel: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const loupe = Math.max(base + 6, cueFrame(ctx, p.loupeAt ?? 1));
  const hit = Math.max(loupe + 10, cueFrame(ctx, p.hitAt ?? 2));
  const label = Math.max(hit + 14, cueFrame(ctx, p.labelAt ?? 4));
  const kick = useKick();

  // the tyre rolls in and stops with its print up right; on the label it steps back
  const settle = prog(frame, e, Math.max(12, loupe - e), ease.camera);
  const rot = -110 * (1 - settle);
  const roll = 140 * (1 - settle);
  const back = prog(frame, label, 16, ease.camera);
  const tyreX = roll - 215 * back;
  const tyreS = 1 - 0.3 * back;
  const tyreO = 1 - 0.6 * back;

  // the loupe lands on the print, then leaves for the label
  const lIn = spr(frame, loupe, 'enter');
  const lOut = prog(frame, label - 2, 10, ease.camera);
  const lK = lIn * (1 - lOut);
  const red = prog(frame, hit, 6, ease.whipOut) * (1 - lOut);
  const strike = prog(frame, hit + 2, 9, ease.drawOn);

  // the label card swings in and is checked
  const cIn = spr(frame, label, 'enterXL');
  const check = prog(frame, label + 12, 10, ease.drawOn);
  const bars = prog(frame, label + 6, 14, ease.camera);

  const down = toneBig('down');
  const up = toneBig('up');
  const ink = C.ink;
  const ink2 = C.ink2;
  const rubber = rgba(C.ink, 0.07);

  const tread = [];
  for (let i = 0; i < TREAD; i++) {
    const a = (360 / TREAD) * i + rot;
    tread.push(<line key={i} x1={px(RT + 6, a)} y1={py(RT + 6, a)} x2={px(RO - 2, a)} y2={py(RO - 2, a)} stroke={ink2} strokeWidth={2} strokeLinecap="round" />);
  }
  // the sidewall's moulded print: short dashes along the print line, the maximum-pressure run brighter
  const print = [];
  for (let i = 0; i < 64; i++) {
    const a0 = i * 5.6;
    const own = a0 >= PRINT_A - 14 && a0 <= PRINT_A + 14;
    if (!own && (a0 % 90 < 22 || a0 % 90 > 64)) continue;
    const a = a0 + rot;
    const h = own ? 14 : 9;
    print.push(
      <line
        key={i}
        x1={px(RM - h / 2, a)}
        y1={py(RM - h / 2, a)}
        x2={px(RM + h / 2, a)}
        y2={py(RM + h / 2, a)}
        stroke={own ? (red > 0.5 ? down : ink) : rgba(C.ink, 0.35)}
        strokeWidth={own ? 3 : 2}
        strokeLinecap="round"
      />,
    );
  }
  const spokes = [];
  for (let i = 0; i < 5; i++) {
    const a = i * 72 + rot;
    for (const off of [-7, 7]) {
      spokes.push(<line key={`${i}${off}`} x1={px(52, a + off * 1.4)} y1={py(52, a + off * 1.4)} x2={px(RI - 30, a + off * 0.5)} y2={py(RI - 30, a + off * 0.5)} stroke={ink2} strokeWidth={4} strokeLinecap="round" />);
    }
  }
  const nuts = [];
  for (let i = 0; i < 5; i++) {
    const a = i * 72 + 36 + rot;
    nuts.push(<circle key={i} cx={px(30, a)} cy={py(30, a)} r={5} fill={ink2} />);
  }

  const printText = capsLatin(p.print ?? 'max. press');
  return (
    <PictureBand camera={false}>
      {/* depth 0.6: the floor line the tyre stands on */}
      <CameraLayer depth={0.6}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <line x1={110} y1={CY + RO + 1} x2={970} y2={CY + RO + 1} stroke={C.rule} strokeWidth={1.5} />
          <ellipse cx={CX + tyreX} cy={CY + RO + 4} rx={240 * tyreS} ry={10} fill={rgba(C.ink, 0.06 * tyreO)} />
        </svg>
      </CameraLayer>
      {/* depth 1: the tyre */}
      <CameraLayer depth={1}>
        <svg
          width={1080}
          height={1920}
          style={{position: 'absolute', inset: 0, opacity: tyreO, transform: `translate(${tyreX.toFixed(1)}px, ${((1 - tyreS) * RO).toFixed(1)}px) scale(${tyreS.toFixed(4)})`, transformOrigin: `${CX}px ${CY}px`}}
        >
          <circle cx={CX} cy={CY} r={(RO + RI) / 2} fill="none" stroke={rubber} strokeWidth={RO - RI} />
          <circle cx={CX} cy={CY} r={RO} fill="none" stroke={ink} strokeWidth={2.5} />
          <circle cx={CX} cy={CY} r={RT} fill="none" stroke={ink2} strokeWidth={1.5} />
          {tread}
          {print}
          <circle cx={CX} cy={CY} r={RI} fill="none" stroke={ink} strokeWidth={2.5} />
          <circle cx={CX} cy={CY} r={RI - 16} fill="none" stroke={ink2} strokeWidth={1.5} />
          {spokes}
          <circle cx={CX} cy={CY} r={52} fill="none" stroke={ink2} strokeWidth={2} />
          {nuts}
          <circle cx={CX} cy={CY} r={12} fill={ink} />
          {/* the valve */}
          <line x1={px(RI - 4, 160 + rot)} y1={py(RI - 4, 160 + rot)} x2={px(RI + 22, 160 + rot)} y2={py(RI + 22, 160 + rot)} stroke={ink} strokeWidth={7} strokeLinecap="round" />
          {/* the print run under the loupe, ringed on the hit */}
          <circle cx={px(RM, PRINT_A + rot)} cy={py(RM, PRINT_A + rot)} r={42 + 6 * kick} fill="none" stroke={red > 0 ? down : ink} strokeWidth={2} opacity={lK} />
        </svg>
      </CameraLayer>
      {/* depth 1.3: the loupe over the print */}
      <CameraLayer depth={1.3}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: lK}}>
          <line x1={px(RM, PRINT_A) + 30} y1={py(RM, PRINT_A) - 30} x2={LOUPE_X - LOUPE_R * 0.7} y2={LOUPE_Y + LOUPE_R * 0.7} stroke={ink2} strokeWidth={1.5} strokeDasharray="4 6" />
          <line x1={LOUPE_X + LOUPE_R * 0.72} y1={LOUPE_Y + LOUPE_R * 0.72} x2={LOUPE_X + LOUPE_R * 1.02} y2={LOUPE_Y + LOUPE_R * 1.02} stroke={ink} strokeWidth={14} strokeLinecap="round" />
        </svg>
        <div
          style={{
            position: 'absolute',
            left: LOUPE_X - LOUPE_R,
            top: LOUPE_Y - LOUPE_R,
            width: LOUPE_R * 2,
            height: LOUPE_R * 2,
            borderRadius: LOUPE_R,
            overflow: 'hidden',
            backgroundColor: C.bg,
            border: `3px solid ${red > 0.5 ? down : ink}`,
            opacity: lK,
            transform: `scale(${(0.6 + 0.4 * lIn).toFixed(4)})`,
          }}
        >
          <div style={{position: 'absolute', inset: 0, backgroundColor: rubber}} />
          <div
            className={TXT}
            style={{position: 'absolute', left: 0, right: 0, top: 96, textAlign: 'center', fontFamily: F.mono, fontSize: 40, letterSpacing: '0.06em', color: red > 0.5 ? down : ink, whiteSpace: 'nowrap'}}
          >
            {printText}
          </div>
          <div style={{position: 'absolute', left: 78, top: 160, display: 'flex', gap: 12}}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{width: 34, height: 46, borderRadius: 6, backgroundColor: red > 0.5 ? down : ink2, opacity: 0.85}} />
            ))}
          </div>
          <div style={{position: 'absolute', left: 50, top: 132, height: 4, width: 200 * strike, backgroundColor: down, borderRadius: 2}} />
        </div>
      </CameraLayer>
      {/* depth 1: the tyre information label */}
      <CameraLayer depth={1}>
        <div
          style={{
            position: 'absolute',
            left: 530,
            top: 640,
            width: 380,
            height: 300,
            borderRadius: 20,
            backgroundColor: C.surface,
            border: `2px solid ${check > 0.5 ? up : ink2}`,
            opacity: cIn,
            transform: `translateX(${((1 - cIn) * 260).toFixed(1)}px) rotate(${((1 - cIn) * 9 - 2).toFixed(2)}deg)`,
            transformOrigin: '50% 100%',
          }}
        >
          <div style={{position: 'absolute', left: 24, right: 24, top: 22, height: 14, borderRadius: 7, backgroundColor: rgba(C.ink, 0.22)}} />
          <svg width={400} height={300} style={{position: 'absolute', inset: 0}}>
            {/* two rows, front and rear: a small tyre icon and its value, schematic */}
            {[110, 210].map((y, i) => (
              <g key={i}>
                <circle cx={78} cy={y + 10} r={30} fill="none" stroke={check > 0.5 ? up : ink} strokeWidth={6} />
                <circle cx={78} cy={y + 10} r={13} fill="none" stroke={ink2} strokeWidth={2} />
                <line x1={124} y1={y + 10} x2={150} y2={y + 10} stroke={ink2} strokeWidth={1.5} strokeDasharray="3 4" />
                <rect x={162} y={y - 8} width={190 * bars} height={36} rx={8} fill={check > 0.5 ? up : ink} opacity={0.9} />
              </g>
            ))}
          </svg>
        </div>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <circle cx={900} cy={640} r={34} fill={C.bg} stroke={up} strokeWidth={3} opacity={check} />
          <path d="M 884 641 L 896 653 L 918 629" fill="none" stroke={up} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={60} strokeDashoffset={60 * (1 - check)} />
        </svg>
      </CameraLayer>
      <Hud>
        <div style={{position: 'absolute', left: 0, right: 0, top: 1182, textAlign: 'center', whiteSpace: 'nowrap', opacity: 1 - back}}>
          <Words text={p.line ?? 'ზედა *ზღვარი*'} at={hit} fx="slam" size={88} punchTone="down" />
        </div>
        <div style={{position: 'absolute', left: 0, right: 0, top: 1182, textAlign: 'center', whiteSpace: 'nowrap'}}>
          {frame >= label ? <Words text={p.good ?? '*ეს* ჩაბერე'} at={label + 10} fx="slam" size={88} punchTone="up" /> : null}
        </div>
      </Hud>
      <SourceLine text={p.source} at={Math.max(base, e + 8)} y={400} />
      <Sfx name="asmr-air-long" at={base} volume={0.22} />
      <Sfx name="asmr-knock" at={loupe} volume={0.32} />
      <Haptic kind="light" at={loupe} volume={0.2} />
      <Land at={hit} />
      <Haptic kind="rigid" at={hit + 2} volume={0.3} />
      <Sfx name="asmr-paper" at={label} volume={0.3} />
      <Sfx name="asmr-check" at={label + 12} volume={0.32} />
      <Haptic kind="light" at={label + 12} volume={0.2} />
    </PictureBand>
  );
};
