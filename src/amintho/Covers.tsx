// „კიდევ ამინთო"'s Reels covers (the owner, 30 Oct: the old style: the VINARI top row, a big condensed Mtavruli headline and the
// film's own picture big under it; black, white and grey only on the studio paper #F3F3F3; never a text card or a bare code):
//   A  „კიდევ ამინთო?!"          the driver yelling, the film's own close-up (in grey)
//   B  „1 100 ₾ თავსახურზე?"     the fuel cap in its open door, the film's macro (in grey)
//   C  „ჯერ მანქანას ჰკითხე"     the real result: the lamp card and the one code, lifted (in grey)
import React, {useLayoutEffect, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, Img, staticFile} from 'remotion';
import {fontsLoaded} from '../fonts';
import {mtav} from '../lib/format';
import {textWidth} from '../lib/measure';
import {F} from '../tokens';
import {Figure} from '../scenes/illo/figure';
import {DefsSvg} from '../scenes/illo/solid';
import {DRIVER} from './Act1';
import {CapDoor, CropCard} from './Act2';
import {INK} from './kit/stage';

export const PAD = 72;
export const TOP = 300;
export const ROW_H = 48;
export const HEAD_LH = 1.1;
export const MAX_W = 1080 - 2 * PAD;
export const PAPER = '#F3F3F3';
export const GREY = '#8A8A8A';

const HEADS: Record<'A' | 'B' | 'C', string[]> = {
  A: ['კიდევ', 'ამინთო?!'],
  B: ['1 100 ₾', 'თავსახურზე?'],
  C: ['ჯერ მანქანას', 'ჰკითხე'],
};
const KICK: Record<'A' | 'B' | 'C', string> = {A: 'ჩეკის ნათურა', B: 'OBD სკანერი', C: 'OBD სკანერი'};

export const useFit = (lines: string[], max: number) => {
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

/** the film's picture in a rounded frame, in grey */
export const Frame: React.FC<{top: number; h: number; dark?: boolean; children: React.ReactNode}> = ({top, h, dark = true, children}) => (
  <div style={{position: 'absolute', left: PAD, top, width: MAX_W, height: h, borderRadius: 44, overflow: 'hidden', background: dark ? '#141414' : PAPER, filter: 'grayscale(1)'}}>{children}</div>
);

const PictureA: React.FC<{top: number}> = ({top}) => {
  const h = 1690 - top;
  return (
    <Frame top={top} h={h}>
      <DefsSvg uid="cva" />
      <svg width={MAX_W} height={h} style={{position: 'absolute', inset: 0}}>
        <Figure uid="cva" cast={DRIVER} x={MAX_W / 2 + 40} y={h * 0.46} size={h * 4.6} crop="head" frame={40} time="night" face="shock" pose="stand" turn={-0.15} />
      </svg>
    </Frame>
  );
};
const PictureB: React.FC<{top: number}> = ({top}) => {
  const h = 1690 - top;
  return (
    <Frame top={top} h={h}>
      <svg width={MAX_W} height={h} style={{position: 'absolute', inset: 0}}>
        <rect x={0} y={0} width={MAX_W} height={h} fill="#2A2A2A" />
        <CapDoor x={MAX_W / 2 + 120} y={h / 2} r={Math.min(250, h * 0.3)} turn={-26} loose={1} uid="cvb" />
      </svg>
    </Frame>
  );
};
const PictureC: React.FC<{top: number}> = ({top}) => {
  const h = 1690 - top;
  return (
    <div style={{position: 'absolute', left: 0, top, width: 1080, height: h, filter: 'grayscale(1)'}}>
      <CropCard src="obd-p0457-result" r={[24, 1450, 1056, 1712]} cx={540} cy={h * 0.3} w={936} k={1} />
      <CropCard src="obd-p0457-result" r={[24, 1890, 1056, 2150]} cx={540} cy={h * 0.68} w={936} k={1} mark={1} />
    </div>
  );
};

export const AminthoCover: React.FC<{variant?: 'A' | 'B' | 'C'}> = ({variant = 'A'}) => {
  const lines = HEADS[variant];
  const size = useFit(lines, 168);
  const fs = size ?? 168;
  const headTop = TOP + ROW_H + 70;
  const headBottom = headTop + lines.length * fs * HEAD_LH + 40;
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
