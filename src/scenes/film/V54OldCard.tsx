// V54OldCard: the old card left on a sold car's glass. A scanner frame finds it and its line sweeps the code; on the
// chunk `deadAt` the code dies: its modules grey out and sink, the frame turns red, a padlock snaps shut in the
// middle and the scan line comes back with nothing. Props: deadAt (chunk or "1.2s"), label (the word under the card).
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, PictureBand, Sfx} from '../common';
import {C, F, L, rgba, toneBig} from '../../tokens';
import {ease, lerp, prog, rand, spr} from '../../lib/anim';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import {textWidth} from '../../lib/measure';
import {MODULES, QN} from '../staging/qrParts';
import type {SceneCtx} from '../../types';

type P = {
  deadAt?: number | string;
  label?: string;
};

const CX = 540; // the card's centre
const CY = 790;
const CODE = 400; // the code's side
const CARD_W = 560;
const CARD_H = 640;

/** A scan finds the old card, and on the chunk the code goes dead under it: grey, sinking, locked. */
export const V54OldCard: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const dead = Math.max(base + 16, cueFrame(ctx, p.deadAt ?? 1));
  const glass = prog(frame, e, 24, ease.drawOn);
  const find = spr(frame, e + 4, 'enter');
  // the first sweep runs down the code before it dies; a second one after, finding nothing
  const sweep1 = prog(frame, base + 2, Math.max(12, dead - base - 4), ease.camera);
  const sweep2 = prog(frame, dead + 14, 26, ease.camera);
  const die = prog(frame, dead, 22, ease.camera);
  const lock = spr(frame, dead + 6, 'land');
  const shut = prog(frame, dead + 12, 8, ease.camera);
  const word = spr(frame, dead + 16, 'land');
  const push = lerp(1, 1.07, prog(frame, e, ctx.dur, ease.camera));
  const red = toneBig('down');
  const frameColor = frame >= dead ? red : C.ink;

  const cell = CODE / QN;
  const x0 = CX - CODE / 2;
  const y0 = CY - 60 - CODE / 2;
  const label = mtav(p.label ?? 'გაუქმებულია');
  const size = Math.min(56, Math.floor((56 * 600) / Math.max(1, textWidth(label, `600 56px ${F.sans}`))));
  const corner = 56;
  const pad = 34 + (1 - find) * 60;
  const fx0 = x0 - pad;
  const fy0 = y0 - pad;
  const fx1 = x0 + CODE + pad;
  const fy1 = y0 + CODE + pad;
  const sweepY = frame < dead ? lerp(y0, y0 + CODE, sweep1) : lerp(y0, y0 + CODE, sweep2);
  const sweepOn = frame < dead ? (sweep1 > 0 && sweep1 < 1 ? 1 : 0) : sweep2 > 0 && sweep2 < 1 ? 0.8 : 0;

  return (
    <PictureBand>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${push})`, transformOrigin: `540px ${L.contentMid}px`}}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          {/* the windshield: one glass outline the card sits behind */}
          <path
            d="M 150 1250 L 230 450 Q 240 400 300 400 L 780 400 Q 840 400 850 450 L 930 1250"
            fill="none"
            stroke={C.rule}
            strokeWidth={2}
            strokeDasharray={2200}
            strokeDashoffset={2200 * (1 - glass)}
            strokeLinecap="round"
          />
          {/* the card */}
          <rect x={CX - CARD_W / 2} y={CY - CARD_H / 2 - 40} width={CARD_W} height={CARD_H} rx={18} fill={C.surface} stroke={rgba(C.ink, 0.18)} strokeWidth={1.5} opacity={glass} />
          {/* the code: each module greys out and sinks a little when the code dies */}
          {MODULES.map(([r, c], i) => {
            const k = rand(i * 7 + 3);
            const t = prog(frame, dead + k * 10, 16, ease.camera);
            return (
              <rect
                key={i}
                x={x0 + c * cell + 0.5}
                y={y0 + r * cell + 0.5 + t * (6 + k * 22)}
                width={cell - 1}
                height={cell - 1}
                fill={C.ink}
                opacity={glass * (1 - t * 0.82)}
              />
            );
          })}
          {/* the scanner's frame: four corners closing on the code */}
          {[
            [fx0, fy0, 1, 1],
            [fx1, fy0, -1, 1],
            [fx0, fy1, 1, -1],
            [fx1, fy1, -1, -1],
          ].map(([x, y, sx, sy], i) => (
            <path key={i} d={`M ${x} ${y + sy * corner} L ${x} ${y} L ${x + sx * corner} ${y}`} fill="none" stroke={frameColor} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" opacity={find} />
          ))}
          {/* the scan line */}
          <line x1={x0 - 10} x2={x0 + CODE + 10} y1={sweepY} y2={sweepY} stroke={frame < dead ? C.ink : red} strokeWidth={2.5} opacity={sweepOn} />
          {/* the padlock snapping shut in the middle */}
          <g opacity={lock} transform={`translate(${CX} ${y0 + CODE / 2 + 10}) scale(${0.7 + lock * 0.3})`}>
            <circle cx={0} cy={0} r={92} fill={C.surface} stroke={rgba(C.ink, 0.15)} strokeWidth={1.5} />
            <path d="M -26 -8 L -26 -38 A 26 26 0 0 1 26 -38 L 26 -8" transform={`translate(0 ${lerp(-22, 0, shut)})`} fill="none" stroke={red} strokeWidth={7} strokeLinecap="round" />
            <rect x={-40} y={-10} width={80} height={62} rx={10} fill={red} />
            <circle cx={0} cy={16} r={7} fill={C.surface} />
            <rect x={-2.5} y={18} width={5} height={16} rx={2} fill={C.surface} />
          </g>
        </svg>
        <div
          className={TXT}
          style={{position: 'absolute', left: 120, width: 840, top: y0 + CODE + 42, textAlign: 'center', fontFamily: F.sans, fontWeight: 600, fontSize: size, color: red, opacity: word, transform: `translateY(${(1 - word) * 16}px)`}}
        >
          {label}
        </div>
      </div>
      <Sfx name="asmr-paper" at={base + 1} volume={0.35} />
      <Sfx name="asmr-camera" at={base + 8} volume={0.4} />
      <Sfx name="asmr-air-long" at={dead} volume={0.3} />
      <Land at={dead + 12} />
      <Sfx name="asmr-tick-fine" at={dead + 16} volume={0.3} />
      <Haptic kind="light" at={dead + 18} />
    </PictureBand>
  );
};
