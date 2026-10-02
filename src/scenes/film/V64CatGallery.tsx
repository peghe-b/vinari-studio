// V64CatGallery: a line-art phone's photo gallery flicks past cats, the sea and a khachapuri; the tech passport
// finally scrolls into view, lifts out of the grid and drops into its own slot on the car's card, on the same phone.
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, PictureBand, Sfx, vary} from '../common';
import {C, F, rgba, toneBig, type Tone} from '../../tokens';
import {ease, lerp, prog, spr} from '../../lib/anim';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import {textWidth} from '../../lib/measure';
import type {SceneCtx} from '../../types';

type P = {
  flicks?: number[]; // chunks where the thumb flicks the gallery on
  liftAt?: number; // chunk: the last flick finds the document, it lifts out
  storeAt?: number; // chunk: it lands on the car's card
  docLabel?: string;
  carLabel?: string;
  tone?: Tone;
};

// the phone (stage units)
const PX = 320;
const PY = 400;
const PW = 440;
const PH = 860;
// the screen inside it
const SX = 350;
const SY = 470;
const SW = 380;
const SH = 760;
const TILE = 116;
const GAP = 16;
const ROW = TILE + GAP;
const DOC_ROW = 26;
const DOC_COL = 1;
const ROWS = 34;
// what each tile shows: 0 cat, 1 sea, 2 khachapuri, 3 mountain
const KINDS = [0, 0, 1, 0, 2, 0, 3, 0, 0, 1, 0, 0, 2, 0, 3, 0, 1, 0, 0, 2, 0];

const Icon: React.FC<{kind: number; ink: string}> = ({kind, ink}) => {
  return (
    <g fill="none" stroke={ink} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" opacity={0.82}>
      {kind === 0 ? (
        <>
          <path d="M 30 82 Q 26 50 34 40 L 36 22 L 50 36 Q 58 33 66 36 L 80 22 L 82 40 Q 90 50 86 82 Q 58 96 30 82 Z" />
          <circle cx={46} cy={58} r={3.2} fill={ink} stroke="none" />
          <circle cx={70} cy={58} r={3.2} fill={ink} stroke="none" />
          <path d="M 54 68 L 58 72 L 62 68" />
          <path d="M 22 64 L 40 68 M 22 74 L 40 72 M 94 64 L 76 68 M 94 74 L 76 72" strokeWidth={1.5} />
        </>
      ) : kind === 1 ? (
        <>
          <path d="M 40 60 A 18 18 0 0 1 76 60" />
          <path d="M 18 60 L 98 60" />
          <path d="M 22 74 Q 32 68 42 74 T 62 74 T 82 74 T 96 74" strokeWidth={1.6} />
          <path d="M 30 86 Q 40 80 50 86 T 70 86 T 90 86" strokeWidth={1.6} />
        </>
      ) : kind === 2 ? (
        <>
          <ellipse cx={58} cy={80} rx={46} ry={12} strokeWidth={1.5} />
          <path d="M 8 52 Q 20 60 30 64 Q 58 80 86 64 Q 96 60 108 52 Q 96 54 86 46 Q 58 30 30 46 Q 20 54 8 52 Z" />
          <path d="M 40 56 Q 46 48 58 50 Q 72 48 76 56 Q 72 64 58 63 Q 44 64 40 56 Z" strokeWidth={1.4} />
          <circle cx={60} cy={56} r={5} fill={ink} stroke="none" />
        </>
      ) : (
        <>
          <path d="M 14 88 L 44 44 L 60 64 L 74 46 L 102 88 Z" />
          <circle cx={84} cy={30} r={7} />
        </>
      )}
    </g>
  );
};

const Doc: React.FC<{ink: string}> = ({ink}) => (
  <g fill="none" stroke={ink} strokeLinecap="round" strokeWidth={2.2}>
    <rect x={24} y={20} width={68} height={78} rx={6} />
    <rect x={32} y={30} width={22} height={18} rx={3} strokeWidth={1.6} />
    <path d="M 60 33 L 84 33 M 60 43 L 80 43 M 32 60 L 84 60 M 32 70 L 84 70 M 32 80 L 70 80" strokeWidth={1.6} />
  </g>
);

export const V64CatGallery: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const clip = useId().replace(/:/g, '');
  const e = entrance(ctx);
  const base = lead(ctx);
  const tone = p.tone ?? 'up';
  const flicks = (p.flicks ?? [1, 2, 3, 4, 5]).map((c) => Math.max(base + 4, cueFrame(ctx, c)));
  const liftF = Math.max(base + 20, cueFrame(ctx, p.liftAt ?? 6));
  const storeF = Math.max(liftF + 24, cueFrame(ctx, p.storeAt ?? 7));

  // the scroll: every flick moves three rows on, the last one lands the document in the middle of the screen
  const docTarget = DOC_ROW * ROW - (SH / 2 - TILE / 2);
  let off = 0;
  for (let i = 0; i < flicks.length; i++) {
    off += 3 * ROW * prog(frame, flicks[+i], 22, ease.camera);
  }
  const before = flicks.length * 3 * ROW;
  off += (docTarget - before) * prog(frame, liftF, 26, ease.camera);
  // a gentle drift so the first frame is never still
  off += lerp(0, 18, prog(frame, e, 60, ease.camera)) * (1 - prog(frame, liftF, 20, ease.camera));

  const found = liftF + 26;
  const lift = spr(frame, found, 'enter');
  const store = prog(frame, storeF, 22, ease.camera);
  const land = spr(frame, storeF + 22, 'land');
  const dim = lerp(1, 0.18, prog(frame, found, 14, ease.camera));
  const card = spr(frame, found + 6, 'enter');
  const push = lerp(1, 1.05, prog(frame, e, ctx.dur, ease.camera));

  // the document's flight: from its tile to above the grid, then into the card's slot
  const tileX = SX + DOC_COL * ROW;
  const tileY = SY + DOC_ROW * ROW - docTarget;
  const cardY = lerp(SY + SH + 40, 900, card);
  const slotX = SX + 28;
  const slotY = cardY + 92;
  const upX = 540 - TILE / 2;
  const upY = 560;
  const dx = lerp(lerp(tileX, upX, lift), slotX, store);
  const dy = lerp(lerp(tileY, upY, lift), slotY, store);
  const ds = lerp(lerp(1, 1.55, lift), 1, store);

  const docLabel = mtav(p.docLabel ?? 'ტექპასპორტი');
  const docSize = Math.min(40, Math.floor((40 * 340) / Math.max(1, textWidth(docLabel, `600 40px ${F.sans}`))));
  const carLabel = mtav(p.carLabel ?? 'შენი მანქანა');
  const carSize = Math.min(30, Math.floor((30 * 220) / Math.max(1, textWidth(carLabel, `600 30px ${F.sans}`))));
  const firstRow = Math.max(0, Math.floor(off / ROW) - 1);

  const tiles: React.ReactNode[] = [];
  for (let r = firstRow; r < Math.min(ROWS, firstRow + 8); r++) {
    for (let c = 0; c < 3; c++) {
      const isDoc = r === DOC_ROW && c === DOC_COL;
      if (isDoc && frame >= found) continue;
      const ki = (r * 3 + c) % 21;
      const k = KINDS[+ki];
      tiles.push(
        <g key={r * 3 + c} transform={`translate(${SX + c * ROW} ${SY + r * ROW - off})`} opacity={isDoc ? 1 : dim}>
          <rect x={0} y={0} width={TILE} height={TILE} rx={14} fill={rgba(C.ink, 0.05)} stroke={rgba(C.ink, 0.28)} strokeWidth={1.5} />
          {isDoc ? <Doc ink={C.ink} /> : <Icon kind={k} ink={C.ink} />}
        </g>,
      );
    }
  }

  return (
    <PictureBand>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${push})`, transformOrigin: '540px 830px'}}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <defs>
            <clipPath id={`scr${clip}`}>
              <rect x={SX} y={SY} width={SW} height={SH} rx={18} />
            </clipPath>
          </defs>
          <rect x={PX} y={PY} width={PW} height={PH} rx={58} fill={C.screen} stroke={C.ink} strokeWidth={2.4} />
          <rect x={490} y={422} width={100} height={28} rx={14} fill={C.island} stroke={rgba(C.ink, 0.35)} strokeWidth={1.2} />
          <g clipPath={`url(#scr${clip})`}>
            {tiles}
            {/* the car's card rising from the bottom of the screen */}
            <g transform={`translate(0 ${cardY - 900})`} opacity={card}>
              <rect x={SX + 6} y={900} width={SW - 12} height={300} rx={22} fill={C.surface} stroke={C.ink} strokeWidth={2} />
              <path d="M 380 960 L 396 940 Q 404 932 416 932 L 452 932 Q 464 932 472 940 L 486 958 L 500 962 Q 506 964 506 972 L 506 980 L 380 980 Z" fill="none" stroke={C.ink} strokeWidth={2} strokeLinejoin="round" />
              <circle cx={404} cy={982} r={8} fill={C.surface} stroke={C.ink} strokeWidth={2} />
              <circle cx={482} cy={982} r={8} fill={C.surface} stroke={C.ink} strokeWidth={2} />
              <rect x={slotX - 4} y={992 - 4} width={TILE + 8} height={TILE + 8} rx={16} fill="none" stroke={rgba(C.ink, 0.45)} strokeWidth={1.6} strokeDasharray="6 6" />
            </g>
          </g>
          <rect x={SX} y={SY} width={SW} height={SH} rx={18} fill="none" stroke={rgba(C.ink, 0.18)} strokeWidth={1} />
          {/* the scroll bar */}
          <rect x={SX + SW - 8} y={SY + 20 + (SH - 140) * Math.min(1, off / (docTarget + 1))} width={4} height={100} rx={2} fill={rgba(C.ink, 0.4)} opacity={1 - card} />
          {/* the document, once found, above everything */}
          {frame >= found ? (
            <g transform={`translate(${dx} ${dy}) scale(${ds})`}>
              <rect x={0} y={0} width={TILE} height={TILE} rx={14} fill={C.surface} stroke={toneBig(tone)} strokeWidth={2.4 / ds} />
              <Doc ink={C.ink} />
            </g>
          ) : null}
          {frame >= storeF + 22 ? (
            <g transform={`translate(${slotX + TILE + 34} ${slotY + 58})`} opacity={land}>
              <circle cx={0} cy={0} r={26} fill="none" stroke={toneBig(tone)} strokeWidth={2.4} />
              <path d={`M -11 1 L -3 9 L 12 -8`} fill="none" stroke={toneBig(tone)} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={40} strokeDashoffset={40 * (1 - land)} />
            </g>
          ) : null}
        </svg>
        <div className={TXT} style={{position: 'absolute', left: 200, width: 680, top: upY + TILE * 1.55 + 22, textAlign: 'center', fontFamily: F.sans, fontWeight: 600, fontSize: docSize, color: C.ink, opacity: lift * (1 - store)}}>
          {docLabel}
        </div>
        <div className={TXT} style={{position: 'absolute', left: 520, width: 200, top: cardY + 22, fontFamily: F.sans, fontWeight: 600, fontSize: carSize, color: C.ink, opacity: card}}>
          {carLabel}
        </div>
      </div>
      {flicks.map((f, i) => (
        <React.Fragment key={i}>
          <Sfx name="asmr-air" at={f} volume={0.28 * vary(i + 1)} />
          <Sfx name="asmr-tick-fine" at={f + 6} volume={0.3} />
        </React.Fragment>
      ))}
      <Sfx name="asmr-air-long" at={liftF} volume={0.3} />
      <Sfx name="asmr-paper" at={found} volume={0.45} />
      <Haptic kind="light" at={found} />
      <Sfx name="asmr-check" at={storeF + 22} volume={0.45} />
      <Land at={storeF + 22} />
    </PictureBand>
  );
};
