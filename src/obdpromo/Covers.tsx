// The OBD promo's Reels covers (the owner, 30 Oct: the old style: the VINARI top row, a big condensed Mtavruli headline from the
// film, and the film's own biggest line-art graphic whole under it; black, white and grey only on the studio paper #F3F3F3;
// never a text card or a bare code), three different ones:
//   A  „ქალს ჰყავდა?"            the car's eight checks round the line-art crossover (most waiting: an hourglass)
//   B  „ყველა გამყიდველი იცნობს"   v2 (31 Oct, the reviewers: the shaded 3D adapter on a gradient broke the cover rules): the film's
//                                   three sellers, three line-art cars, one line: flat, black and white on #F3F3F3
//   C  „ჩეკით 240 კმ. სამსახურში?"  the real result in the 3D iPhone, its lamp card lifted (grayscale)
import React, {useLayoutEffect, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, Img, staticFile} from 'remotion';
import {fontsLoaded} from '../fonts';
import {mtav} from '../lib/format';
import {textWidth} from '../lib/measure';
import {F} from '../tokens';
import {CheckDot} from './kit/marks';
import {Car as IlloCar} from '../scenes/illo/car';
import {Lift, Phone3, type Region} from './kit/phone3d';
import {INK} from './kit/stage';
import {Seller, SellerB, SellerC} from './kit/people';

const PAD = 72;
const TOP = 300;
const ROW_H = 48;
const HEAD_LH = 1.1;
const MAX_W = 1080 - 2 * PAD;
const PAPER = '#F3F3F3';
const GREY = '#8A8A8A';

const HEADS: Record<'A' | 'B' | 'C', string[]> = {
  A: ['ქალს', 'ჰყავდა?'],
  B: ['ამ ქალს ყველა', 'გამყიდველი იცნობს'],
  C: ['ჩეკით 240 კმ.', 'სამსახურში?'],
};
const KICK: Record<'A' | 'B' | 'C', string> = {A: 'მეორადი მანქანა', B: 'ყიდვამდე შემოწმება', C: 'OBD სკანერი'};

const useFit = (lines: string[], max: number) => {
  const [size, setSize] = useState<number | null>(null);
  const [handle] = useState(() => delayRender('fit the cover headline'));
  useLayoutEffect(() => {
    let live = true;
    fontsLoaded
      .then(() => document.fonts.ready)
      .then(() => {
        if (!live) return;
        const widest = Math.max(...lines.map((l) => textWidth(mtav(l), `600 ${max}px ${F.sans}`)));
        setSize(Math.min(max, Math.floor((max * MAX_W) / widest)));
        continueRender(handle);
      });
    return () => {
      live = false;
    };
  }, [handle]);
  return size;
};

const LAMP: Region = {x0: 55 / 1080, y0: 1466 / 2346, x1: 1025 / 1080, y1: 1659 / 2346};

const PictureA: React.FC<{top: number}> = ({top}) => {
  const cy = top + 520;
  const nodes = Array.from({length: 8}, (_, i) => {
    const a = -Math.PI / 2 + (i / 8) * Math.PI * 2;
    return {x: 540 + 380 * Math.cos(a), y: cy - 40 + 300 * Math.sin(a), done: i === 0 || i === 3};
  });
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
      {nodes.map((n, i) => (
        <path key={`l${i}`} d={`M540 ${cy + 10}L${n.x} ${n.y}`} stroke={INK} strokeWidth={2} opacity={0.14} strokeDasharray="6 8" />
      ))}
      <IlloCar uid="cva" x={540} y={cy + 90} len={600} body="suv" paint={3} frame={0} />
      {nodes.map((n, i) => (
        <CheckDot key={i} x={n.x} y={n.y} r={46} done={n.done ? 1 : 0} bg={PAPER} />
      ))}
    </svg>
  );
};

const SELLERS = [Seller, SellerB, SellerC];
const PictureB: React.FC<{top: number}> = ({top}) => {
  const rows: {y: number; body: 'suv' | 'sedan' | 'ev'; paint: number; dx: number}[] = [
    {y: top + 360, body: 'suv', paint: 3, dx: -30},
    {y: top + 660, body: 'sedan', paint: 1, dx: 30},
    {y: top + 960, body: 'ev', paint: 4, dx: -30},
  ];
  return (
    <div style={{position: 'absolute', inset: 0, filter: 'grayscale(1)'}}>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        {rows.map((r, i) => {
          const S = SELLERS[i];
          const cx = 330 + r.dx;
          return (
            <g key={i}>
              <IlloCar uid={`cvb${i}`} x={cx} y={r.y} len={440} body={r.body} paint={r.paint} frame={0} />
              <S uid={`cvbs${i}`} x={cx + 290} y={r.y + 12} size={230} frame={0} pose="offer" face="grin" turn={-0.62} light="day" />
            </g>
          );
        })}
      </svg>
      {rows.map((r, i) => {
        const text = mtav('ქალს ჰყავდა');
        const w = textWidth(text, `700 30px ${F.sans}`) + 40;
        return (
          <div key={i} style={{position: 'absolute', left: 330 + r.dx + 350, top: r.y - 250, width: w, height: 58, borderRadius: 29, background: '#FFFFFF', border: '2px solid #D0D0D0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.sans, fontWeight: 700, fontSize: 30, color: INK, whiteSpace: 'nowrap'}}>
            {text}
          </div>
        );
      })}
    </div>
  );
};

const PictureC: React.FC<{top: number}> = ({top}) => {
  const pose = {x: 560, y: top + 500, w: 360, yaw: -14, pitch: 8, roll: 3};
  return (
    <div style={{position: 'absolute', inset: 0, filter: 'grayscale(1)'}}>
      <Phone3 src="obd-result" pose={pose} veil={0.3} shadow={0.8} />
      <Lift src="obd-result" r={LAMP} pose={pose} to={{x: 80, y: top + 40, w: 920, h: (920 * (1659 - 1466)) / 970}} k={1} radius={40} />
    </div>
  );
};

export const ObdPromoCover: React.FC<{variant?: 'A' | 'B' | 'C'}> = ({variant = 'A'}) => {
  const lines = HEADS[variant];
  const size = useFit(lines, 168);
  const fs = size ?? 168;
  const headTop = TOP + ROW_H + 70;
  const headBottom = headTop + lines.length * fs * HEAD_LH;
  return (
    <AbsoluteFill style={{backgroundColor: PAPER}}>
      {variant === 'A' ? <PictureA top={headBottom} /> : null}
      {variant === 'B' ? <PictureB top={headBottom} /> : null}
      {variant === 'C' ? <PictureC top={headBottom} /> : null}
      <div style={{position: 'absolute', top: TOP, left: PAD, height: ROW_H, display: 'flex', alignItems: 'center', gap: 14}}>
        <Img src={staticFile('brand/mark.svg')} style={{height: 40, width: (40 * 768) / 671, filter: 'brightness(0) invert(0.045)'}} />
        <Img src={staticFile('brand/wordmark.svg')} style={{height: 23, width: (23 * 267) / 68, filter: 'brightness(0) invert(0.045)'}} />
      </div>
      <div style={{position: 'absolute', top: TOP, right: PAD, height: ROW_H, display: 'flex', alignItems: 'center'}}>
        <div style={{height: ROW_H - 2, display: 'flex', alignItems: 'center', gap: 12, padding: '0 22px 0 18px', borderRadius: ROW_H, background: '#E6E6E6', fontFamily: F.mono, fontSize: 22, letterSpacing: '0.06em', color: INK, whiteSpace: 'nowrap'}}>
          <div style={{width: 10, height: 10, borderRadius: 10, background: GREY}} />
          {mtav(KICK[variant])}
        </div>
      </div>
      <div style={{position: 'absolute', top: headTop, left: PAD - 4, width: MAX_W + 8, fontFamily: F.sans, fontWeight: 600, fontSize: fs, lineHeight: HEAD_LH, letterSpacing: '-0.01em', color: INK, opacity: size ? 1 : 0}}>
        {lines.map((line, i) => (
          <div key={i} style={{whiteSpace: 'nowrap'}}>
            {mtav(line)}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
