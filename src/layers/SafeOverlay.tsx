import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, H, L, SAFE, STAGE, T, W} from '../tokens';

// Debug only: the Instagram Reels safe zone over the frame (input prop {"safe": true}, or the env
// REMOTION_SAFE_OVERLAY=1 in a CLI render). Red = platform UI, dashed = the scenes' content box
// (stage 120..960 x 380..1280 after the stage transform, its lower right cut where the like column
// starts), thin ink rules = the subtitle box and its centre line. The red boxes are Instagram's own UI
// as measured on the owner's screenshot of the posted v11 (out/ig-reference-v11.webp, frame =
// screenshot / 0.939 after +45 px in x): the icon column (heart 1111..1166, its count, comment 1288,
// repost 1403, send 1535, menu 1658, the audio tile 1752), the username row (1668) and the caption (1795).
const RED = '#FF2D46';
export const IG_UI = [
  {x: 922, y: 1111, w: 64, h: 56, name: 'like'},
  {x: 940, y: 1204, w: 28, h: 22, name: 'count'},
  {x: 922, y: 1288, w: 64, h: 58, name: 'comment'},
  {x: 922, y: 1403, w: 64, h: 71, name: 'repost'},
  {x: 922, y: 1535, w: 64, h: 54, name: 'send'},
  {x: 922, y: 1658, w: 64, h: 26, name: 'menu'},
  {x: 918, y: 1752, w: 72, h: 74, name: 'audio'},
  {x: 88, y: 1668, w: 470, h: 141, name: 'user · follow'},
  {x: 88, y: 1795, w: 760, h: 36, name: 'caption'},
] as const;

export const SafeOverlay: React.FC = () => {
  const {top, bottom, left, right, split, rightLow} = SAFE;
  const zone = `M${left} ${top} H${right} V${split} H${rightLow} V${bottom} H${left} Z`;
  const f = (x: number, y: number) => ({x: STAGE.x + STAGE.s * x, y: STAGE.y + STAGE.s * y});
  const a = f(L.side, L.contentTop);
  const b = f(L.safeRight, L.lowY);
  const c = f(L.lowRight, L.contentBottom);
  const box = `M${a.x} ${a.y} H${b.x} V${b.y} H${c.x} V${c.y} H${a.x} Z`;
  const subH = T.subtitle * 1.2;
  const label: React.CSSProperties = {position: 'absolute', fontFamily: 'VinariMono, monospace', fontSize: 20, color: RED, whiteSpace: 'nowrap', opacity: 0.9};
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
        <path d={`M0 0 H${W} V${H} H0 Z ${zone}`} fill={RED} fillOpacity={0.16} fillRule="evenodd" />
        <path d={zone} fill="none" stroke={RED} strokeWidth={2} />
        {IG_UI.map((u) => (
          <rect key={u.name} x={u.x} y={u.y} width={u.w} height={u.h} rx={8} fill={RED} fillOpacity={0.35} stroke={RED} strokeWidth={1.5} />
        ))}
        <path d={box} fill="none" stroke={C.ink} strokeOpacity={0.45} strokeWidth={1.5} strokeDasharray="10 8" />
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
