// Callout: a labelled pointer onto one element (phase 2). The anchor dot pops in (SPRING.punch, about 6 frames), the leader
// line draws along its elbow (8 to 10 frames, BEZ.pen), the label (52 px Mtavruli, fitted to its room) rises in 3 frames
// later. An optional outline round the element is CONCENTRIC with it (src/lib/outline.mjs: its radius is the element's
// radius plus the gap, never a fixed round rect on a square thing).
//
//   <Callout anchor={{x, y}} text="ერთი ღილაკი" at={20} side="right" outline={{box: {x, y, w, h}, r: 24}} />
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {ease, prog, spr} from '../../lib/anim';
import {OUTLINE_GAP, OUTLINE_STROKE} from '../../lib/outline.mjs';
import {Sfx} from '../common';
import {FitText, S, tone} from './p2';
import type {P2Tone} from './p2';

export type CalloutProps = {
  anchor: {x: number; y: number};
  text: string;
  at: number;
  side?: 'left' | 'right';
  /** the label's y (stage); default level with the anchor */
  labelY?: number;
  outline?: {box: {x: number; y: number; w: number; h: number}; r?: number};
  t?: P2Tone;
  sound?: boolean;
};

export const Callout: React.FC<CalloutProps> = ({anchor, text, at, side, labelY, outline, t, sound = true}) => {
  const frame = useCurrentFrame();
  const right = side ? side === 'right' : anchor.x < (S.left + S.right) / 2;
  const ly = Math.min(S.bottom - 70, Math.max(S.top + 10, labelY ?? anchor.y - 34));
  // the elbow: out sideways 70 px, then level to the label's row, then along to the label
  const elbowX = anchor.x + (right ? 70 : -70);
  const endX = right ? Math.min(S.right - 260, elbowX + 40) : Math.max(S.left + 260, elbowX - 40);
  const pts: [number, number][] = [
    [anchor.x, anchor.y],
    [elbowX, ly + 30],
    [endX, ly + 30],
  ];
  const len = pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
  const dot = spr(frame, at, 'punch');
  const lineDur = Math.min(10, Math.max(8, Math.round(len / 40)));
  const u = prog(frame, at + 4, lineDur, ease.pen);
  const labelAt = at + 4 + lineDur + 3;
  const ink = tone(t);
  const labelW = right ? S.right - endX - 16 : endX - S.left - 16;
  const ob = outline?.box;
  const r = (outline?.r ?? 24) + OUTLINE_GAP;
  const oLen = ob ? 2 * (ob.w + ob.h + 4 * OUTLINE_GAP) : 0;
  const ou = ob ? prog(frame, at, 12, ease.pen) : 0;
  return (
    <>
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none'}}>
        {ob ? (
          <rect
            x={ob.x - OUTLINE_GAP}
            y={ob.y - OUTLINE_GAP}
            width={ob.w + 2 * OUTLINE_GAP}
            height={ob.h + 2 * OUTLINE_GAP}
            rx={r}
            fill="none"
            stroke={ink}
            strokeWidth={OUTLINE_STROKE}
            strokeDasharray={oLen}
            strokeDashoffset={oLen * (1 - ou)}
          />
        ) : null}
        <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={ink} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={len} strokeDashoffset={len * (1 - u)} />
        <circle cx={anchor.x} cy={anchor.y} r={11 * Math.max(0, dot)} fill={ink} />
        <circle cx={anchor.x} cy={anchor.y} r={22 * Math.max(0, dot)} fill="none" stroke={ink} strokeWidth={3} opacity={0.35} />
      </svg>
      <FitText text={text} x={right ? endX + 16 : S.left} y={ly} w={Math.max(160, labelW)} size={52} min={36} maxLines={1} weight={700} align={right ? 'left' : 'right'} t={t} at={labelAt} anim="rise" />
      {sound ? <Sfx name="asmr-pop" at={at} volume={0.26} /* event: the anchor dot pops in */ /> : null}
    </>
  );
};
