// v37-battery-night: the headlights stay up all night while the battery empties, cell by cell.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, lead, PictureBand, Sfx} from '../common';
import {C, F, L, rgba, toneBig} from '../../tokens';
import {ease, lerp, prog, spr} from '../../lib/anim';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import {textWidth} from '../../lib/measure';
import type {SceneCtx} from '../../types';

type P = {
  label?: string; // the word under the battery
  at?: number | string; // chunk where the drain hurries and the last cell turns red
};

const CELLS = 5;
// the battery in stage units
const BX = 250;
const BY = 880;
const BW = 560;
const BH = 230;
const PAD = 18;
const GAP = 14;
// the headlamp and its beams
const LX = 300;
const LY = 610;
const BEAMS = 7;

/** A headlamp keeps its beams on while the battery under it loses its cells one by one. */
export const V37BatteryNight: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const draw = prog(frame, e, 22, ease.drawOn);
  const hurry = Math.max(base + 30, cueFrame(ctx, p.at ?? 1));
  const start = base + 10;
  // cells 4..1 go out: two slowly before the chunk, two quickly after it
  const drops = [0, hurry + 18, hurry + 6, lerp(start, hurry, 0.55), start];
  const last = drops[1];
  const level = (i: number) => (i === 0 ? 1 : 1 - prog(frame, drops[+i], 8, ease.camera));
  let left = 0;
  for (let i = 0; i < CELLS; i++) left += level(i);
  const power = left / CELLS; // 1 full .. 0.2 one cell
  const redIn = prog(frame, last + 4, 10, ease.camera);
  const pulse = frame > last + 14 ? 0.72 + 0.28 * Math.cos((frame - last - 14) / 5) : 1;
  const land = spr(frame, last + 4, 'land');
  const push = lerp(1, 1.05, prog(frame, e, ctx.dur, ease.camera));
  const cellW = (BW - 2 * PAD - (CELLS - 1) * GAP) / CELLS;
  const beamLen = 520 * draw;
  const flick = 0.92 + 0.08 * Math.cos(frame / 3.1);
  const label = mtav(p.label ?? 'აკუმულატორი');
  const size = Math.min(52, Math.floor((52 * 600) / Math.max(1, textWidth(label, `600 52px ${F.sans}`))));
  const red = toneBig('down');

  const beams: React.ReactNode[] = [];
  for (let i = 0; i < BEAMS; i++) {
    const a = ((i - (BEAMS - 1) / 2) * 7 * Math.PI) / 180 + 0.05;
    const x2 = LX + 90 + Math.cos(a) * beamLen;
    const y2 = LY + Math.sin(a) * beamLen;
    beams.push(<line key={i} x1={LX + 90} y1={LY} x2={x2} y2={y2} stroke={C.ink} strokeWidth={1.8} strokeLinecap="round" opacity={(0.25 + 0.6 * power) * flick * (1 - Math.abs(i - 3) * 0.08)} />);
  }

  const cells: React.ReactNode[] = [];
  for (let i = 0; i < CELLS; i++) {
    const x = BX + PAD + i * (cellW + GAP);
    const on = level(i);
    const col = i === 0 ? red : C.ink;
    cells.push(
      <g key={i}>
        <rect x={x} y={BY + PAD} width={cellW} height={BH - 2 * PAD} rx={8} fill="none" stroke={C.rule} strokeWidth={1.5} opacity={draw} />
        <rect x={x} y={BY + PAD + (BH - 2 * PAD) * (1 - on)} width={cellW} height={(BH - 2 * PAD) * on} rx={8} fill={i === 0 ? rgba(C.ink, 0.9 * (1 - redIn)) : rgba(C.ink, 0.9)} opacity={draw} />
        {i === 0 ? <rect x={x} y={BY + PAD} width={cellW} height={BH - 2 * PAD} rx={8} fill={col} opacity={redIn * pulse * draw} /> : null}
      </g>,
    );
  }

  return (
    <PictureBand>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${push})`, transformOrigin: `540px ${L.contentMid}px`}}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          {/* the headlamp: a lens outline with a reflector line */}
          <path d={`M ${LX + 90} ${LY - 70} C ${LX - 40} ${LY - 70} ${LX - 40} ${LY + 70} ${LX + 90} ${LY + 70} Z`} fill="none" stroke={C.ink} strokeWidth={2.4} strokeLinejoin="round" opacity={draw} />
          <path d={`M ${LX + 60} ${LY - 40} C ${LX + 10} ${LY - 40} ${LX + 10} ${LY + 40} ${LX + 60} ${LY + 40}`} fill="none" stroke={C.ink2} strokeWidth={1.6} opacity={draw} />
          <circle cx={LX + 90} cy={LY} r={10} fill={C.ink} opacity={draw * (0.4 + 0.6 * power)} />
          {beams}
          {/* the battery */}
          <rect x={BX} y={BY} width={BW} height={BH} rx={26} fill="none" stroke={C.ink} strokeWidth={2.4} opacity={draw} />
          <rect x={BX + BW + 6} y={BY + BH / 2 - 44} width={22} height={88} rx={8} fill="none" stroke={C.ink} strokeWidth={2.4} opacity={draw} />
          {cells}
          <circle cx={BX + PAD + cellW / 2} cy={BY + BH / 2} r={60 + 50 * land} fill="none" stroke={red} strokeWidth={1.5} opacity={frame >= last + 4 ? (1 - land) * 0.8 : 0} />
        </svg>
        <div className={TXT} style={{position: 'absolute', left: 120, width: 840, top: BY + BH + 50, textAlign: 'center', fontFamily: F.sans, fontWeight: 600, fontSize: size, color: C.ink2, opacity: draw}}>
          {label}
        </div>
      </div>
      <Sfx name="asmr-pencil-short" at={base + 1} volume={0.35} />
      {[4, 3, 2, 1].map((i) => (
        <Sfx key={i} name="asmr-tick-fine" at={Math.round(drops[+i])} volume={0.45} />
      ))}
      <Sfx name="asmr-land" at={Math.round(last + 4)} volume={0.45} />
      <Haptic kind="light" at={Math.round(last + 4)} />
    </PictureBand>
  );
};
