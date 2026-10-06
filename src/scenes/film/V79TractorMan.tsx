// src/scenes/film/V79TractorMan.tsx: v79-tractor-man's own visual (a diagram).
// The clutch that kept failing: a friction disc in front view spins, its lining heats and wears thin, cracks run across
// it; on the key moment the worn disc is thrown out to the left and a fresh one slides in from the right, again and
// again, one quiet tally mark per swap in the HUD (no count is said: the fact is "repeated rebuilds").
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, MonoLabel, PictureBand, Sfx} from '../common';
import {C, L, rgba, toneBig, toneLine, type Tone} from '../../tokens';
import {ease, prog, spr} from '../../lib/anim';
import {CameraLayer, Hud, useKick} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import type {SceneCtx} from '../../types';

type P = {
  look?: 'illustrated' | 'diagram';
  hitAt?: number | string; // the first swap: the camera kicks, the punch lands
  line?: string; // the punch, "*word*"
  label?: string; // the HUD readout
  tone?: Tone;
  swaps?: number; // how many discs go through after the hit (a picture of "again and again", never a figure said)
};

const CX = 540;
const CY = 800;
const R = 250; // the lining's outer edge
const RI = 168; // the lining's inner edge
const SPRINGS = 6;
const RIVETS = 18;
const SPLINES = 14;
const SWAP = 22; // frames a swap takes
const GAP = 30; // frames between swaps

/** One friction disc in front view: the lining ring (wear thins it, heat warms it), rivets, damper springs, the hub. */
const Disc: React.FC<{rot: number; wear: number; heat: number; tone: Tone; cracks: number; seed: number}> = ({rot, wear, heat, tone, cracks, seed}) => {
  const lw = R - RI;
  const inner = RI + lw * 0.45 * wear; // the lining wears from the inside out: the ring gets thinner
  const ringR = (R + inner) / 2;
  const ringW = R - inner;
  const hot = toneLine(tone);
  return (
    <g transform={`rotate(${rot.toFixed(2)} ${CX} ${CY})`}>
      {/* the steel carrier under the lining */}
      <circle cx={CX} cy={CY} r={R - 6} fill={C.surface} stroke={C.ink2} strokeWidth={1.5} />
      {/* the lining */}
      <circle cx={CX} cy={CY} r={ringR} fill="none" stroke={C.ink2} strokeOpacity={0.55} strokeWidth={ringW} />
      <circle cx={CX} cy={CY} r={ringR} fill="none" stroke={hot} strokeOpacity={0.75 * heat} strokeWidth={ringW} />
      <circle cx={CX} cy={CY} r={R} fill="none" stroke={C.ink} strokeWidth={2.5} />
      <circle cx={CX} cy={CY} r={inner} fill="none" stroke={C.ink} strokeWidth={1.8} />
      {/* the lining's grooves */}
      {Array.from({length: 8}, (_, i) => {
        const t = (i / 8) * Math.PI * 2 + 0.2;
        return <line key={i} x1={CX + Math.cos(t) * inner} y1={CY + Math.sin(t) * inner} x2={CX + Math.cos(t) * R} y2={CY + Math.sin(t) * R} stroke={C.ink} strokeOpacity={0.35} strokeWidth={1.5} />;
      })}
      {/* rivets */}
      {Array.from({length: RIVETS}, (_, i) => {
        const t = (i / RIVETS) * Math.PI * 2;
        const rr = inner + (R - inner) * 0.5;
        return <circle key={i} cx={CX + Math.cos(t) * rr} cy={CY + Math.sin(t) * rr} r={4.5} fill={C.bg} stroke={C.ink} strokeWidth={1.5} />;
      })}
      {/* cracks across the lining, growing with the wear */}
      {Array.from({length: 5}, (_, i) => {
        const k = Math.max(0, Math.min(1, cracks * 5 - i));
        if (k <= 0) return null;
        const t = ((i * 2.3 + seed) % 6.283);
        const a = inner + 4;
        const b = a + (R - a) * k;
        const bend = 0.06 * (i % 2 ? 1 : -1);
        return (
          <polyline
            key={i}
            points={`${CX + Math.cos(t) * a},${CY + Math.sin(t) * a} ${CX + Math.cos(t + bend) * (a + b) / 2},${CY + Math.sin(t + bend) * (a + b) / 2} ${CX + Math.cos(t) * b},${CY + Math.sin(t) * b}`}
            fill="none"
            stroke={hot}
            strokeWidth={2.2}
            strokeLinecap="round"
          />
        );
      })}
      {/* the damper springs */}
      {Array.from({length: SPRINGS}, (_, i) => {
        const deg = (i / SPRINGS) * 360;
        return (
          <g key={i} transform={`rotate(${deg} ${CX} ${CY})`}>
            <rect x={CX - 20} y={CY - 140} width={40} height={64} rx={10} fill={C.bg} stroke={C.ink} strokeWidth={1.8} />
            {[0, 1, 2, 3].map((j) => (
              <line key={j} x1={CX - 14} y1={CY - 128 + j * 13} x2={CX + 14} y2={CY - 122 + j * 13} stroke={C.ink2} strokeWidth={1.5} />
            ))}
          </g>
        );
      })}
      {/* the hub and its splines */}
      <circle cx={CX} cy={CY} r={62} fill={C.bg} stroke={C.ink} strokeWidth={2.2} />
      {Array.from({length: SPLINES}, (_, i) => {
        const t = (i / SPLINES) * Math.PI * 2;
        return <line key={i} x1={CX + Math.cos(t) * 26} y1={CY + Math.sin(t) * 26} x2={CX + Math.cos(t) * 38} y2={CY + Math.sin(t) * 38} stroke={C.ink} strokeWidth={3} strokeLinecap="round" />;
      })}
      <circle cx={CX} cy={CY} r={24} fill="none" stroke={C.ink} strokeWidth={1.5} />
    </g>
  );
};

export const V79TractorMan: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 24, cueFrame(ctx, p.hitAt ?? 1));
  const kick = useKick();
  const tone = p.tone ?? 'down';
  const swaps = Math.max(1, Math.min(4, p.swaps ?? 3));
  const appear = spr(frame, e, 'enterXL');
  // which disc is on the shaft now, and how far its swap has run
  const since = frame - hit;
  const idx = since < 0 ? 0 : Math.min(swaps, Math.floor(since / (SWAP + GAP)) + 1);
  const local = since < 0 ? -1 : since - (idx - 1) * (SWAP + GAP);
  const sw = since < 0 || idx > swaps ? 0 : prog(local, 0, SWAP, ease.camera);
  // the current disc wears in the time it has: the first one from the entrance to the hit, the others between swaps
  const life0 = Math.max(12, hit - e);
  const wearOf = (age: number, life: number) => Math.max(0, Math.min(1, age / life));
  const curAge = since < 0 ? frame - e : local - SWAP;
  const wear = since < 0 ? wearOf(curAge, life0) : wearOf(Math.max(0, curAge), GAP + SWAP);
  const prevWear = 1;
  const spin = frame * 7.5; // the shaft keeps turning
  const outX = -760 * sw; // the worn disc leaves left
  const inX = 760 * (1 - sw); // a fresh one comes from the right
  const swapping = since >= 0 && local >= 0 && local < SWAP && idx <= swaps;
  const marks = since < 0 ? 0 : Math.min(swaps, idx - (local < SWAP * 0.5 ? 1 : 0));
  return (
    <PictureBand camera={false}>
      {/* background plane: the flywheel's face behind the disc, quiet rings */}
      <CameraLayer depth={0.6}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: 0.55 * appear}}>
          <circle cx={CX} cy={CY} r={330} fill="none" stroke={C.rule} strokeWidth={1.5} />
          <circle cx={CX} cy={CY} r={350} fill="none" stroke={C.rule} strokeWidth={1.5} strokeDasharray="3 9" />
          <line x1={CX - 420} y1={CY} x2={CX + 420} y2={CY} stroke={C.rule} strokeWidth={1.2} strokeDasharray="10 8" />
          <line x1={CX} y1={CY - 420} x2={CX} y2={CY + 420} stroke={C.rule} strokeWidth={1.2} strokeDasharray="10 8" />
        </svg>
      </CameraLayer>
      {/* the subject: the disc on the shaft, swapped on and after the hit */}
      <CameraLayer depth={1}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear, transform: `scale(${(0.93 + 0.07 * appear).toFixed(4)})`, transformOrigin: `${CX}px ${CY}px`}}>
          {swapping ? (
            <>
              <g transform={`translate(${outX.toFixed(1)} 0)`} opacity={1 - 0.6 * sw}>
                <Disc rot={spin} wear={prevWear} heat={1 - 0.5 * sw} tone={tone} cracks={1} seed={idx * 1.7} />
              </g>
              <g transform={`translate(${inX.toFixed(1)} 0)`}>
                <Disc rot={spin * 0.3} wear={0} heat={0} tone={tone} cracks={0} seed={idx * 2.9 + 1} />
              </g>
            </>
          ) : (
            <Disc rot={spin} wear={wear} heat={Math.min(1, wear * 1.15)} tone={tone} cracks={Math.max(0, (wear - 0.45) / 0.55)} seed={idx * 2.9 + 1} />
          )}
          <circle cx={CX} cy={CY} r={R + 24} fill="none" stroke={rgba(C.ink, 0.1 + 0.35 * kick)} strokeWidth={2} />
        </svg>
      </CameraLayer>
      <Hud>
        <MonoLabel text={p.label ?? 'დისკი'} at={Math.max(base, e + 4)} style={{position: 'absolute', left: L.camSafe.left, top: L.camSafe.top}} />
        {/* the tally: one stroke per new disc, top right */}
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          {Array.from({length: swaps}, (_, i) => {
            const k = i < marks ? spr(frame, hit + i * (SWAP + GAP) + Math.round(SWAP * 0.5), 'land') : 0;
            const x = L.camSafe.right - 30 - (swaps - 1 - i) * 26;
            return <line key={i} x1={x} y1={L.camSafe.top + 34 - 30 * k} x2={x} y2={L.camSafe.top + 34} stroke={toneBig(tone)} strokeWidth={4} strokeLinecap="round" opacity={k} />;
          })}
        </svg>
      </Hud>
      <div style={{position: 'absolute', left: L.camSafe.left, top: 1150, whiteSpace: 'nowrap'}}>
        <Words text={p.line ?? 'კიდევ *ერთი*'} at={hit} fx="slam" size={84} punchTone={tone} />
      </div>
      <Sfx name="asmr-swell" at={Math.max(base, e + 6)} volume={0.2} />
      {Array.from({length: swaps}, (_, i) => (
        <React.Fragment key={i}>
          <Sfx name="asmr-paper" at={hit + i * (SWAP + GAP)} volume={0.36} />
          <Sfx name="asmr-knock" at={hit + i * (SWAP + GAP) + SWAP - 2} volume={0.32} />
        </React.Fragment>
      ))}
      <Land at={hit} />
      <Haptic kind="rigid" at={hit + 2} volume={0.3} />
    </PictureBand>
  );
};
