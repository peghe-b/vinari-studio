import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, H, L, SAFE, STAGE, T, W} from '../tokens';

// Debug only: the Instagram Reels safe zone over the frame (input prop {"safe": true}, or the env
// REMOTION_SAFE_OVERLAY=1 in a CLI render). Red = platform UI, dashed = the scenes' content box
// (stage 120..960 x 380..1100 after the stage transform), thin ink rules = the subtitle box and its
// centre line.
const RED = '#FF2D46';

export const SafeOverlay: React.FC = () => {
  const {top, bottom, left, right, split, rightLow} = SAFE;
  const zone = `M${left} ${top} H${right} V${split} H${rightLow} V${bottom} H${left} Z`;
  const box = {x0: STAGE.x + STAGE.s * L.side, y0: STAGE.y + STAGE.s * L.contentTop, x1: STAGE.x + STAGE.s * L.safeRight, y1: STAGE.y + STAGE.s * L.contentBottom};
  const subH = T.subtitle * 1.2;
  const label: React.CSSProperties = {position: 'absolute', fontFamily: 'VinariMono, monospace', fontSize: 20, color: RED, whiteSpace: 'nowrap', opacity: 0.9};
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
        <path d={`M0 0 H${W} V${H} H0 Z ${zone}`} fill={RED} fillOpacity={0.16} fillRule="evenodd" />
        <path d={zone} fill="none" stroke={RED} strokeWidth={2} />
        <rect x={box.x0} y={box.y0} width={box.x1 - box.x0} height={box.y1 - box.y0} fill="none" stroke={C.ink} strokeOpacity={0.45} strokeWidth={1.5} strokeDasharray="10 8" />
        <rect x={L.subtitleX - L.subtitleMaxW / 2} y={L.subtitleY - subH / 2} width={L.subtitleMaxW} height={subH} fill="none" stroke={C.ink} strokeOpacity={0.35} strokeWidth={1} />
        <line x1={L.subtitleX} x2={L.subtitleX} y1={L.subtitleY - subH / 2 - 14} y2={L.subtitleY + subH / 2 + 14} stroke={C.ink} strokeOpacity={0.35} />
        <line x1={(left + right) / 2} x2={(left + right) / 2} y1={top} y2={top + 18} stroke={RED} strokeWidth={2} />
      </svg>
      <div style={{...label, left: left + 8, top: top - 26}}>SAFE {left} / {W - right} · y {top}</div>
      <div style={{...label, left: rightLow - 150, top: split + 6}}>y {split} · r {W - rightLow}</div>
      <div style={{...label, left: left + 8, top: bottom + 6}}>y {bottom}</div>
    </AbsoluteFill>
  );
};
