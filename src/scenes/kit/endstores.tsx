// EndStores (phase 2; the owner, 2026-10-26: studio films end with the free week + the App Store and Google Play): the
// end card of a P2 film, drawn by EndCard when the film is a phase-2 film (src/lib/p2.mjs). White #FFF whatever the look
// (never a black end card), the VINARI mark and wordmark, the line (the free-week line the voice says over it, or a story's
// closing line), and the two store badges. On screen 2.5 to 3 s under the voice; it holds still at most 0.8 s after the
// voice ends (tools/ci/ending.mjs END_HOLD). The OFFICIAL badges are used when public/brand/badge-appstore.svg and
// badge-googleplay.svg exist (their artwork is Apple's and Google's: LICENSES.md); until then a plain typeset black badge
// stands in, never a drawn copy of either logo.
import React from 'react';
import {getStaticFiles, Img, staticFile, useCurrentFrame} from 'remotion';
import {ease, prog, spr} from '../../lib/anim';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import {fitLines} from '../../lib/textfit.mjs';
import {F} from '../../tokens';
import {brandFile} from '../common';
import {S} from './p2';

const INK = '#0B0B0B';
const BADGE_H = 104;
const OFFICIAL = {apple: 'brand/badge-appstore.svg', google: 'brand/badge-googleplay.svg'} as const;
const has = (p: string) => {
  try {
    return getStaticFiles().some((f) => f.name === p);
  } catch {
    return false;
  }
};

/** a store badge: the official artwork when it is in public/brand, else a typeset black badge */
const Badge: React.FC<{store: 'apple' | 'google'; x: number; y: number; on: number}> = ({store, x, y, on}) => {
  const official = has(OFFICIAL[store]);
  const w = store === 'apple' ? 312 : 350;
  const style: React.CSSProperties = {position: 'absolute', left: x, top: y + (1 - on) * 30, width: w, height: BADGE_H, opacity: on};
  if (official) return <Img src={staticFile(OFFICIAL[store])} style={{...style, objectFit: 'contain'}} />;
  return (
    <div className={TXT} style={{...style, borderRadius: 20, background: INK, color: '#FFFFFF', display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: 34, boxSizing: 'border-box', fontFamily: F.sans}}>
      <div style={{fontSize: 24, fontWeight: 500, lineHeight: '28px', letterSpacing: '0.02em'}}>{store === 'apple' ? 'Download on the' : 'GET IT ON'}</div>
      <div style={{fontSize: 46, fontWeight: 600, lineHeight: '52px', letterSpacing: '-0.01em'}}>{store === 'apple' ? 'App Store' : 'Google Play'}</div>
    </div>
  );
};

export const EndStores: React.FC<{tagline?: string; base: number; dur: number}> = ({tagline, base, dur}) => {
  const frame = useCurrentFrame();
  const mark = spr(frame, base, 'enterXL');
  const word = prog(frame, base + 6, 12, ease.enter);
  const line = (tagline ?? '').replace(/\s*\|\s*/g, ' ').trim();
  const fit = line ? fitLines(line, S.right - S.left, 2, 64, {weight: 700, mtav: true, min: 40}) : null;
  const MW = 170;
  const MH = (MW * 671) / 768;
  const WW = 300;
  const WH = (WW * 68) / 267;
  const lineH = fit ? fit.lines.length * fit.size * 1.15 : 0;
  const total = MH + 40 + WH + (fit ? 70 + lineH : 0) + 90 + BADGE_H;
  const top = S.cy - total / 2 - 20;
  const lineTop = top + MH + 40 + WH + 70;
  const badgeTop = top + total - BADGE_H;
  // a slow push the whole time (the card never freezes dead), lighter than a shot's drift
  const push = 1 + 0.02 * ease.drift(Math.min(1, Math.max(0, frame / Math.max(1, dur))));
  return (
    <>
      <div style={{position: 'absolute', left: -80, top: -80, width: 1240, height: 2080, background: '#FFFFFF'}} />
      <div style={{position: 'absolute', inset: 0, transform: `scale(${push.toFixed(5)})`, transformOrigin: `${S.cx}px ${S.cy}px`}}>
        <Img src={brandFile('mark')} style={{position: 'absolute', left: S.cx - MW / 2, top: top + (1 - mark) * 40, width: MW, height: MH, opacity: Math.min(1, mark * 1.4), filter: 'brightness(0) invert(0.045)'}} />
        <Img src={brandFile('wordmark')} style={{position: 'absolute', left: S.cx - WW / 2, top: top + MH + 40, width: WW, height: WH, opacity: word, filter: 'brightness(0) invert(0.045)'}} />
        {fit
          ? fit.lines.map((l, i) => (
              <div key={i} className={TXT} style={{position: 'absolute', left: S.left, width: S.right - S.left, top: lineTop + i * fit.size * 1.15, textAlign: 'center', fontFamily: F.sans, fontWeight: 700, fontSize: fit.size, lineHeight: `${Math.round(fit.size * 1.15)}px`, color: INK, whiteSpace: 'nowrap', opacity: prog(frame, base + 10 + i * 3, 9)}}>
                {mtav(l)}
              </div>
            ))
          : null}
        <Badge store="apple" x={S.cx - 312 - 14} y={badgeTop} on={prog(frame, base + 16, 10, ease.data)} />
        <Badge store="google" x={S.cx + 14} y={badgeTop} on={prog(frame, base + 20, 10, ease.data)} />
      </div>
    </>
  );
};
