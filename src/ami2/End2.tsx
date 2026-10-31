// The OBD promo's white end card (the owner, 26 and 30 Oct; the 3D OBD film's finish.py end_card is the reference): the mark and
// the wordmark; the App Store and Google Play badges popping on their words; the free-week line built word by word in big bold
// Mtavruli ink („შეგიძლია ერთი კვირა უფასოდაც სცადო.": the owner's 21 Oct wording, never the imperative); under the badges the
// comment ask built word by word, with an amber hand stroke drawn under „ვინარი". The card is the line: no subtitle. Everything
// above the bottom 420 px.
import React from 'react';
import {Img, staticFile} from 'remotion';
import {mtav} from '../lib/format';
import {textWidth} from '../lib/measure';
import {F} from '../tokens';
import {clamp, E, lerp, prog, sp} from './lib';
import {INK, useShot} from './kit/stage';

const MARK_W = 140;
const MARK_H = (MARK_W * 671) / 768;
const FREE = ['შეგიძლია', 'ერთი', 'კვირა', 'უფასოდაც', 'სცადო.'];
const ASK = ['დაწერე', 'კომენტარებში', '„ვინარი“', 'და', 'გადმოსაწერ', 'ლინკს', 'გამოგიგზავნით.'];
const UNDER = '#FFB22E';

/** words laid out in centred rows, each popping in (3 frames, a 14 px rise) one frame before its time */
const Built: React.FC<{words: string[]; rows: number[][]; at: number[]; top: number; size: number; weight: number; t: number; lh?: number; onWord?: (i: number, box: {x: number; y: number; w: number; h: number}) => React.ReactNode}> = ({words, rows, at, top, size, weight, t, lh = 1.12, onWord}) => {
  const gap = size * 0.28;
  const out: React.ReactNode[] = [];
  rows.forEach((idx, li) => {
    const ws = idx.map((i) => textWidth(mtav(words[i]), `${weight} ${size}px ${F.sans}`));
    const lineW = ws.reduce((a, w, n) => a + w + (n ? gap : 0), 0);
    let x = 540 - lineW / 2;
    idx.forEach((i, n) => {
      if (n) x += gap;
      const left = x;
      x += ws[n];
      const k = E.out(prog(t, at[i] - 2, 3));
      const y = top + li * size * lh;
      out.push(
        <div key={i} style={{position: 'absolute', left, top: y, whiteSpace: 'nowrap', fontFamily: F.sans, fontWeight: weight, fontSize: size, lineHeight: 1.1, color: INK, opacity: k, transform: `translateY(${((1 - k) * 14).toFixed(2)}px)`}}>
          {mtav(words[i])}
        </div>,
      );
      if (onWord) out.push(<React.Fragment key={`w${i}`}>{onWord(i, {x: left, y, w: ws[n], h: size * 1.1})}</React.Fragment>);
    });
  });
  return <>{out}</>;
};

const fitSize = (words: string[], rows: number[][], base: number, weight: number, maxW: number) => {
  const widest = Math.max(...rows.map((r) => textWidth(mtav(r.map((i) => words[i]).join(' ')), `${weight} ${base}px ${F.sans}`)));
  return widest > maxW ? Math.floor((base * maxW) / widest) : base;
};

export const End: React.FC = () => {
  const {t, len, L, Ls} = useShot('end');
  const markAt = L('mark');
  const free = Ls('free');
  const ask = Ls('ask');
  const vin = L('vinari');
  const b1 = sp(t, L('badge1') - 2, 170, 15);
  const b2 = sp(t, L('badge2') - 2, 170, 15);
  const markK = sp(t, markAt - 3, 130, 15);
  const wmK = sp(t, markAt + 2, 130, 18);
  const lift = 1 - E.inOut(prog(t, 0, 10));
  const s = 1 + 0.025 * E.out2(clamp(t / Math.max(1, len)));
  const FREE_ROWS = [[0, 1, 2], [3, 4]];
  const fs = fitSize(FREE, FREE_ROWS, 100, 700, 900);
  const ASK_ROWS = [[0, 1, 2], [3, 4, 5], [6]];
  const as = fitSize(ASK, ASK_ROWS, 54, 600, 900);
  const TOP_MARK = 250;
  const TOP_FREE = 520;
  const TOP_BADGE = TOP_FREE + 2 * fs * 1.12 + 56;
  const BH = 112;
  const TOP_ASK = TOP_BADGE + BH + 70;
  return (
    <div style={{position: 'absolute', inset: 0, background: '#FFFFFF', overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${s})`, transformOrigin: '540px 860px'}}>
        <div style={{position: 'absolute', left: 540 - MARK_W / 2, top: TOP_MARK + (1 - markK) * 30, width: MARK_W, height: MARK_H, opacity: clamp(markK * 1.6), transform: `scale(${lerp(0.86, 1, markK).toFixed(4)})`}}>
          <Img src={staticFile('brand/mark.svg')} style={{width: MARK_W, height: MARK_H, filter: 'brightness(0) invert(0.045)'}} />
        </div>
        <Img src={staticFile('brand/wordmark.svg')} style={{position: 'absolute', left: 540 - 110, top: TOP_MARK + MARK_H + 30 + (1 - wmK) * 22, width: 220, height: (220 * 68) / 267, filter: 'brightness(0) invert(0.045)', opacity: clamp(wmK * 1.4)}} />
        <Built words={FREE} rows={FREE_ROWS} at={free} top={TOP_FREE} size={fs} weight={700} t={t} />
        <div style={{position: 'absolute', left: 0, right: 0, top: TOP_BADGE, display: 'flex', justifyContent: 'center', gap: 26}}>
          <Img src={staticFile('amintho/badge-appstore.png')} style={{height: BH, opacity: clamp(b1 * 2), transform: `translateY(${((1 - clamp(b1)) * 30).toFixed(2)}px) scale(${lerp(0.8, 1, b1).toFixed(4)})`}} />
          <Img src={staticFile('amintho/badge-play.png')} style={{height: BH, opacity: clamp(b2 * 2), transform: `translateY(${((1 - clamp(b2)) * 30).toFixed(2)}px) scale(${lerp(0.8, 1, b2).toFixed(4)})`}} />
        </div>
        <Built
          words={ASK}
          rows={ASK_ROWS}
          at={ask}
          top={TOP_ASK}
          size={as}
          weight={600}
          t={t}
          lh={1.3}
          onWord={(i, b) => {
            if (i !== 2) return null;
            const q = E.inOut(prog(t, vin + 4, 9));
            if (q <= 0) return null;
            const x0 = b.x + b.w * 0.12;
            const x1 = b.x + b.w * 0.9;
            const y = b.y + b.h + 4;
            const d = `M${x0} ${y + 3}C${x0 + (x1 - x0) * 0.3} ${y - 4} ${x0 + (x1 - x0) * 0.62} ${y + 7} ${x1} ${y - 1}`;
            return (
              <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
                <path d={d} fill="none" stroke={UNDER} strokeWidth={8} strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - q} />
              </svg>
            );
          }}
        />
      </div>
      {/* v3: no grey veil (the fleet grid dissolves into the card in ObdPromo) */}
      {lift > 2 ? null : null}
    </div>
  );
};

export const SHOTS: Record<string, React.FC> = {end: End};
