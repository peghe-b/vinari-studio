// The QR promo's pinned Reels cover (the owner, 2026-10-14: "make the QR promo's cover like the navigator's: the headline
// names the feature, under it the feature's own big graphic, not a mockup"). The navigator cover A's layout (the lockup top
// left, the tag top right, a hairline, a big two-line headline in condensed Mtavruli at weight 600), and under it, raised
// into the grid's 3:4 crop (y 240..1680), the QR card itself big: a white card lying on a light field at a tilt (one flat
// CSS perspective, like the navigator's map), its code standing up off the card in black blocks (an offset grey copy reads
// as their sides), the VINARI mark in its centre, and the camera's four corner brackets hovering over it with their shadow
// on the card. Black and white only. The code is a drawn QR (finders, timing, alignment, random data): it scans to nothing.
import React, {useLayoutEffect, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, Img, staticFile} from 'remotion';
import {fontsLoaded} from '../fonts';
import {capsLatin, mtav} from '../lib/format';
import {textWidth} from '../lib/measure';
import {F} from '../tokens';
import {INK, INK2} from './lib';

const PAD = 72;
const TOP = 300;
const ROW_H = 48;
const RULE_Y = TOP + ROW_H + 30;
const HEAD_TOP = RULE_Y + 56;
const HEAD_MAX = 156;
const HEAD_LH = 1.12;
const MAX_W = 1080 - 2 * PAD;

// ---- the code: a version-3 layout (29 x 29) ----------------------------------------------------------------------------------
const N = 29;
const QZ = 3; // the quiet zone (modules)
const hashBit = (r: number, c: number) => {
  let h = Math.imul(r + 31, 374761393) ^ Math.imul(c + 17, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) % 100 < 47;
};
const FINDERS: [number, number][] = [
  [0, 0],
  [0, N - 7],
  [N - 7, 0],
];
const inFinder = (r: number, c: number) => FINDERS.some(([fr_, fc]) => r >= fr_ - 1 && r <= fr_ + 7 && c >= fc - 1 && c <= fc + 7);
const inAlign = (r: number, c: number) => r >= 20 && r <= 24 && c >= 20 && c <= 24;
const LOGO0 = 10;
const LOGO1 = 18; // the centre left free for the mark (rows/cols 10..18)
const inLogo = (r: number, c: number) => r >= LOGO0 && r <= LOGO1 && c >= LOGO0 && c <= LOGO1;
const MODULES: [number, number][] = [];
for (let r = 0; r < N; r++) {
  for (let c = 0; c < N; c++) {
    if (inFinder(r, c) || inAlign(r, c) || inLogo(r, c)) continue;
    const timing = (r === 6 && c >= 8 && c <= N - 9) || (c === 6 && r >= 8 && r <= N - 9);
    const on = timing ? (r === 6 ? c : r) % 2 === 0 : hashBit(r, c);
    if (on) MODULES.push([r, c]);
  }
}

export type QrLook = {cy?: number; tilt?: number; rotZ?: number; card?: number; persp?: number; lift?: number; fade?: number};

const QrPicture: React.FC<{top: number; height: number; look?: QrLook}> = ({top, height, look = {}}) => {
  const cy = look.cy ?? 0.4;
  const tilt = look.tilt ?? 46;
  const rotZ = look.rotZ ?? -12;
  const S = look.card ?? 800; // the card's side (plane px)
  const persp = look.persp ?? 1700;
  const m = S / (N + 2 * QZ);
  const h = m * (look.lift ?? 0.42); // the blocks' height, drawn as their sides' offset toward the viewer
  const x0 = 1200 - S / 2;
  const y0 = 1200 - S / 2;
  const mx = (c: number) => x0 + (QZ + c) * m;
  const my = (r: number) => y0 + (QZ + r) * m;
  const r_ = m * 0.2;
  const finder = (fr_: number, fc: number, dy: number, fill: string) => (
    <g key={`${fr_}${fc}${dy}`}>
      <path
        d={`M ${mx(fc) + 1.6 * m} ${my(fr_) + dy} h ${3.8 * m} a ${1.6 * m} ${1.6 * m} 0 0 1 ${1.6 * m} ${1.6 * m} v ${3.8 * m} a ${1.6 * m} ${1.6 * m} 0 0 1 ${-1.6 * m} ${1.6 * m} h ${-3.8 * m} a ${1.6 * m} ${1.6 * m} 0 0 1 ${-1.6 * m} ${-1.6 * m} v ${-3.8 * m} a ${1.6 * m} ${1.6 * m} 0 0 1 ${1.6 * m} ${-1.6 * m} Z
           M ${mx(fc) + 1.9 * m} ${my(fr_) + m + dy} h ${3.2 * m} a ${0.9 * m} ${0.9 * m} 0 0 1 ${0.9 * m} ${0.9 * m} v ${3.2 * m} a ${0.9 * m} ${0.9 * m} 0 0 1 ${-0.9 * m} ${0.9 * m} h ${-3.2 * m} a ${0.9 * m} ${0.9 * m} 0 0 1 ${-0.9 * m} ${-0.9 * m} v ${-3.2 * m} a ${0.9 * m} ${0.9 * m} 0 0 1 ${0.9 * m} ${-0.9 * m} Z`}
        fill={fill}
        fillRule="evenodd"
      />
      <rect x={mx(fc) + 2 * m} y={my(fr_) + 2 * m + dy} width={3 * m} height={3 * m} rx={0.8 * m} fill={fill} />
    </g>
  );
  const align = (dy: number, fill: string) => (
    <g>
      <rect x={mx(20) + 0.5 * m} y={my(20) + 0.5 * m + dy} width={4 * m} height={4 * m} rx={1.1 * m} fill="none" stroke={fill} strokeWidth={m} />
      <rect x={mx(22)} y={my(22) + dy} width={m} height={m} rx={r_} fill={fill} />
    </g>
  );
  const blocks = (dy: number, fill: string) => (
    <g>
      {MODULES.map(([r, c]) => (
        <rect key={`${r}-${c}`} x={mx(c) + 0.04 * m} y={my(r) + 0.04 * m + dy} width={0.92 * m} height={0.92 * m} rx={r_} fill={fill} />
      ))}
      {FINDERS.map(([a, b]) => finder(a, b, dy, fill))}
      {align(dy, fill)}
    </g>
  );
  // the brackets: the camera's frame, hovering a little over the card (their shadow falls on it)
  const B = S * 0.57;
  const L = S * 0.17;
  const brackets = (dx: number, dy: number, stroke: string, w: number) => (
    <g>
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([sx, sy], i) => {
        const cx = 1200 + sx * B + dx;
        const cy_ = 1200 + sy * B + dy;
        return <path key={i} d={`M ${cx} ${cy_ - sy * L} L ${cx} ${cy_ + sy * 0} Q ${cx} ${cy_} ${cx - sx * 0} ${cy_} L ${cx - sx * L} ${cy_}`} stroke={stroke} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" />;
      })}
    </g>
  );
  const LOGO = (LOGO1 - LOGO0 + 1) * m;
  const lx = mx(LOGO0);
  const ly = my(LOGO0);
  const markH = LOGO * 0.5;
  const markW = (markH * 768) / 671;
  return (
    <div style={{position: 'absolute', left: 0, top, width: 1080, height, overflow: 'hidden'}}>
      <div
        style={{
          position: 'absolute',
          left: 540 - 1200,
          top: height * cy - 1200,
          width: 2400,
          height: 2400,
          transformOrigin: '50% 50%',
          transform: `perspective(${persp}px) rotateX(${tilt}deg) rotateZ(${rotZ}deg)`,
        }}
      >
        <svg width={2400} height={2400} viewBox="0 0 2400 2400">
          <defs>
            <radialGradient id="qcShadow">
              <stop offset="0" stopColor="#000" stopOpacity={0.22} />
              <stop offset="0.6" stopColor="#000" stopOpacity={0.08} />
              <stop offset="1" stopColor="#000" stopOpacity={0} />
            </radialGradient>
            <linearGradient id="qcTop" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#2A2A2A" />
              <stop offset="1" stopColor="#050505" />
            </linearGradient>
            <filter id="qcBlur" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="14" />
            </filter>
          </defs>
          <rect x={-300} y={-300} width={3000} height={3000} fill="#EFEFEF" />
          {/* faint guide lines on the field, like the map's roads, so the tilt reads */}
          {[-2, -1, 0, 1, 2].map((k) => (
            <g key={k}>
              <line x1={1200 + k * 520} y1={-300} x2={1200 + k * 520} y2={2700} stroke="#E2E2E2" strokeWidth={6} />
              <line x1={-300} y1={1200 + k * 520} x2={2700} y2={1200 + k * 520} stroke="#E2E2E2" strokeWidth={6} />
            </g>
          ))}
          {/* the card: its shadow, its edge (thickness), its face */}
          <ellipse cx={1200} cy={1200 + S * 0.12} rx={S * 0.78} ry={S * 0.74} fill="url(#qcShadow)" />
          <rect x={x0} y={y0 + 30} width={S} height={S} rx={S * 0.075} fill="#C9C9C9" />
          <rect x={x0} y={y0} width={S} height={S} rx={S * 0.075} fill="#FFFFFF" />
          <rect x={x0 + 1.5} y={y0 + 1.5} width={S - 3} height={S - 3} rx={S * 0.075} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={3} />
          {/* the code standing off the card: the sides (an offset grey copy), then the tops */}
          {blocks(h, '#7A7A7A')}
          {blocks(0, 'url(#qcTop)')}
          {/* the mark in the centre, on its own small raised white tile */}
          <rect x={lx + m * 0.4} y={ly + m * 0.4 + h} width={LOGO - m * 0.8} height={LOGO - m * 0.8} rx={m * 1.6} fill="#D2D2D2" />
          <rect x={lx + m * 0.4} y={ly + m * 0.4} width={LOGO - m * 0.8} height={LOGO - m * 0.8} rx={m * 1.6} fill="#FFFFFF" stroke="rgba(0,0,0,0.08)" strokeWidth={2} />
          <image href={staticFile('brand/mark.svg')} x={1200 - markW / 2} y={ly + LOGO / 2 - markH / 2} width={markW} height={markH} style={{filter: 'brightness(0) invert(0.045)'}} />
          {/* the camera's brackets hovering over the card: their soft shadow on it, a white halo, the ink */}
          <g filter="url(#qcBlur)" opacity={0.28}>
            {brackets(0, 70, '#000', 34)}
          </g>
          {brackets(0, 0, '#FFFFFF', 54)}
          {brackets(0, 0, '#111111', 32)}
        </svg>
      </div>
      {/* the far edge melts into the paper under the headline */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: look.fade ?? 260, background: 'linear-gradient(#FFFFFF, rgba(255,255,255,0))'}} />
    </div>
  );
};

export const QrCover: React.FC<{look?: QrLook; headMax?: number; lines?: string[]; tag?: string}> = ({look, headMax, lines: raw, tag}) => {
  const lines = (raw ?? ['QR ბარათი', 'ნომრის ნაცვლად']).map(mtav);
  const [size, setSize] = useState<number | null>(null);
  const [handle] = useState(() => delayRender('fit the cover headline'));
  useLayoutEffect(() => {
    let live = true;
    fontsLoaded
      .then(() => document.fonts.ready)
      .then(() => {
        if (!live) return;
        const cap = headMax ?? HEAD_MAX;
        const widest = Math.max(...lines.map((l) => textWidth(l, `600 ${cap}px ${F.sans}`)));
        setSize(Math.min(cap, Math.floor((cap * MAX_W) / widest)));
        continueRender(handle);
      });
    return () => {
      live = false;
    };
  }, [handle]);
  const fs = size ?? HEAD_MAX;
  const headBottom = HEAD_TOP + lines.length * fs * HEAD_LH;
  return (
    <AbsoluteFill style={{backgroundColor: '#FFFFFF'}}>
      <QrPicture top={headBottom + 20} height={1920 - headBottom - 20} look={look} />
      {/* the top row: the lockup left, the tag right (no number: a standalone promo) */}
      <div style={{position: 'absolute', top: TOP, left: PAD, height: ROW_H, display: 'flex', alignItems: 'center', gap: 14}}>
        <Img src={staticFile('brand/mark.svg')} style={{height: 40, width: (40 * 768) / 671, filter: 'brightness(0) invert(0.045)'}} />
        <Img src={staticFile('brand/wordmark.svg')} style={{height: 23, width: (23 * 267) / 68, filter: 'brightness(0) invert(0.045)'}} />
      </div>
      <div style={{position: 'absolute', top: TOP, right: PAD, height: ROW_H, display: 'flex', alignItems: 'center'}}>
        <div style={{height: ROW_H - 2, display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px 0 18px', borderRadius: ROW_H, border: '1.5px solid rgba(160,160,160,0.9)', fontFamily: F.mono, fontSize: 22, letterSpacing: '0.06em', color: INK2, whiteSpace: 'nowrap'}}>
          <div style={{width: 9, height: 9, borderRadius: 9, background: INK}} />
          {mtav(capsLatin(tag ?? 'საქართველოში პირველად'))}
        </div>
      </div>
      <div style={{position: 'absolute', top: RULE_Y, left: PAD, right: PAD, height: 1.5, background: 'rgba(160,160,160,0.55)'}} />
      <div style={{position: 'absolute', top: HEAD_TOP, left: PAD - 4, width: MAX_W + 8, fontFamily: F.sans, fontWeight: 600, fontSize: fs, lineHeight: HEAD_LH, letterSpacing: '-0.01em', color: INK, opacity: size ? 1 : 0}}>
        {lines.map((line, i) => (
          <div key={i} style={{whiteSpace: 'nowrap'}}>
            {line}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
