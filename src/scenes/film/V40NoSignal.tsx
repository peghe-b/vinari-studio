// V40NoSignal: a mountain road in line art, the car climbing its bends. The check lamp is already lit, the signal
// bars empty one by one on `barsAt`, the road forks (home, or a stop) on `forkAt` and a quiet "?" lands on `askAt`.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, lead, PictureBand, Sfx} from '../common';
import {C, F, L, rgba, halo, toneBig, toneLine} from '../../tokens';
import {ease, lerp, prog, spr} from '../../lib/anim';
import {capsLatin} from '../../lib/format';
import {TXT} from '../../lib/layer';
import type {SceneCtx} from '../../types';

type P = {
  lamp?: string; // the lamp's Latin word
  barsAt?: number | string; // chunk where the signal goes
  forkAt?: number | string; // chunk where the road forks
  askAt?: number | string; // chunk where the "?" lands
};

// the road: three bends climbing from the foot of the box to the fork
const ROAD = 'M 300 1300 C 700 1260 780 1180 520 1120 C 260 1060 300 980 600 950 C 860 925 820 850 560 820';
const SEGS = [
  [300, 1300, 700, 1260, 780, 1180, 520, 1120],
  [520, 1120, 260, 1060, 300, 980, 600, 950],
  [600, 950, 860, 925, 820, 850, 560, 820],
];
const RIDGE = 'M 120 690 L 270 560 L 390 630 L 570 480 L 730 610 L 850 530 L 960 600';
const RIDGE2 = 'M 120 760 L 330 650 L 470 720 L 650 600 L 800 690 L 960 640';
const HOME = 'M 560 820 C 450 810 320 790 230 760';
const STOP = 'M 560 820 C 680 812 780 796 850 770';
const BARS = [16, 28, 40, 52];

export const V40NoSignal: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const draw = prog(frame, e, 30, ease.drawOn);
  const barsAt = Math.max(base + 10, cueFrame(ctx, p.barsAt ?? 1));
  const forkAt = Math.max(barsAt + 20, cueFrame(ctx, p.forkAt ?? 2));
  const askAt = Math.max(forkAt + 14, cueFrame(ctx, p.askAt ?? 3));
  const red = toneLine('down');

  // the car climbs from the foot to the fork, arriving as the fork draws
  const u = prog(frame, e + 10, Math.max(30, forkAt - e - 10), ease.camera);
  const k = Math.min(2, Math.floor(u * 3));
  const s = SEGS[+k];
  const t = u * 3 - k;
  const bez = (a: number, b: number, c: number, d: number, v: number) => (1 - v) ** 3 * a + 3 * (1 - v) ** 2 * v * b + 3 * (1 - v) * v * v * c + v ** 3 * d;
  const cx = bez(s[0], s[2], s[4], s[6], t);
  const cy = bez(s[1], s[3], s[5], s[7], t);

  const fork = prog(frame, forkAt, 22, ease.drawOn);
  const icons = prog(frame, forkAt + 10, 12, ease.camera);
  const ask = spr(frame, askAt, 'land');
  const pulse = 0.5 + 0.5 * Math.cos((frame - e) / 9);
  const push = lerp(1, 1.07, prog(frame, e, ctx.dur, ease.camera));
  const lamp = capsLatin(p.lamp ?? 'check');

  return (
    <PictureBand>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${push})`, transformOrigin: `540px ${L.contentMid}px`}}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <path d={RIDGE2} fill="none" stroke={rgba(C.ink, 0.28)} strokeWidth={1.5} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} strokeLinejoin="round" />
          <path d={RIDGE} fill="none" stroke={rgba(C.ink, 0.55)} strokeWidth={1.8} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} strokeLinejoin="round" />
          <path d={ROAD} fill="none" stroke={rgba(C.ink, 0.14)} strokeWidth={34} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - draw} />
          <path d={ROAD} fill="none" stroke={C.ink} strokeWidth={2.2} pathLength={1} strokeDasharray="0.012 0.012" opacity={draw * 0.7} />
          <path d={HOME} fill="none" stroke={rgba(C.ink, 0.14)} strokeWidth={34} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - fork} />
          <path d={STOP} fill="none" stroke={rgba(C.ink, 0.14)} strokeWidth={34} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - fork} />
          <path d={HOME} fill="none" stroke={C.ink} strokeWidth={2.2} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - fork} />
          <path d={STOP} fill="none" stroke={C.ink} strokeWidth={2.2} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - fork} />
          {/* home: a small house at the end of the left branch */}
          <g opacity={icons} transform="translate(150 690) scale(1.3)">
            <path d="M 0 30 L 34 4 L 68 30 M 10 22 L 10 62 L 58 62 L 58 22 M 28 62 L 28 42 L 40 42 L 40 62" fill="none" stroke={C.ink} strokeWidth={2.2} strokeLinejoin="round" />
          </g>
          {/* a stop: an octagon at the end of the right branch */}
          <g opacity={icons} transform="translate(886 760) scale(1.3)">
            <path d="M -12 -30 L 12 -30 L 30 -12 L 30 12 L 12 30 L -12 30 L -30 12 L -30 -12 Z" fill="none" stroke={C.ink} strokeWidth={2.2} strokeLinejoin="round" />
            <path d="M -12 0 L 12 0" stroke={C.ink} strokeWidth={2.2} strokeLinecap="round" />
          </g>
          {/* the question: a paper disc over the ridges */}
          <circle cx={560} cy={690} r={64 * ask} fill={C.bg} stroke={C.ink} strokeWidth={2} opacity={ask} />
          {/* the car */}
          <circle cx={cx} cy={cy} r={30 + 10 * pulse} fill={halo(red, 0.22)} />
          <circle cx={cx} cy={cy} r={20 + 8 * pulse} fill="none" stroke={red} strokeWidth={1.5} opacity={0.35 + 0.3 * pulse} />
          <circle cx={cx} cy={cy} r={11} fill={C.ink} />
          {/* signal bars, top right: each empties on the cue */}
          {BARS.map((h, i) => {
            const off = prog(frame, barsAt + (3 - i) * 5, 6, ease.camera);
            return <rect key={i} x={836 + i * 26} y={470 - h} width={16} height={h} rx={3} fill={rgba(C.ink, 1 - off * 0.92)} stroke={C.ink} strokeWidth={1.5} />;
          })}
          <path d="M 826 476 L 948 404" stroke={red} strokeWidth={2.4} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - prog(frame, barsAt + 22, 10, ease.drawOn)} />
        </svg>
        {/* the check lamp, top left, already lit */}
        <div className={TXT} style={{position: 'absolute', left: 124, top: 414, height: 56, padding: '0 22px 0 18px', borderRadius: 28, border: `2px solid ${red}`, display: 'flex', alignItems: 'center', gap: 14, fontFamily: F.mono, fontSize: 30, letterSpacing: 3, color: toneBig('down'), boxShadow: `0 0 ${18 + 10 * pulse}px ${halo(red, 0.35)}`, opacity: draw}}>
          <div style={{width: 16, height: 16, borderRadius: 8, backgroundColor: red}} />
          {lamp}
        </div>
        <div className={TXT} style={{position: 'absolute', left: 500, top: 635, width: 120, textAlign: 'center', fontFamily: F.sans, fontWeight: 600, fontSize: 84, lineHeight: '110px', color: C.ink, opacity: ask, transform: `translateY(${(1 - ask) * 22}px) scale(${0.8 + 0.2 * ask})`}}>
          ?
        </div>
      </div>
      <Sfx name="asmr-pencil" at={base + 2} volume={0.35} />
      <Sfx name="asmr-tick-fine" at={barsAt + 15} volume={0.4} />
      <Sfx name="asmr-tick-fine" at={barsAt + 10} volume={0.4} />
      <Sfx name="asmr-tick-fine" at={barsAt + 5} volume={0.4} />
      <Sfx name="asmr-tick-fine" at={barsAt} volume={0.4} />
      <Sfx name="asmr-pencil-short" at={forkAt} volume={0.4} />
      <Sfx name="asmr-pop" at={askAt} volume={0.45} />
      <Haptic kind="light" at={barsAt + 22} />
      <Haptic kind="light" at={askAt} />
    </PictureBand>
  );
};
