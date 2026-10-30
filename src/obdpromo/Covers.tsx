// The OBD promo's Reels covers (the owner, 30 Oct: the old style: the VINARI top row, a big condensed Mtavruli headline from the
// film, and the film's own biggest line-art graphic whole under it; black, white and grey only on the studio paper #F3F3F3;
// never a text card or a bare code), three different ones:
//   A  „ქალს ჰყავდა?"            the car's eight checks round the line-art crossover (most waiting: an hourglass)
//   B  „კოდები ახლახან წაშლილი"    the 3D ELM327 in the port (the diagnostics cover's model, in grey)
//   C  „ჩეკით 240 კმ. სამსახურში?"  the real result in the 3D iPhone, its lamp card lifted (grayscale)
import React, {useLayoutEffect, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, Img, staticFile} from 'remotion';
import {fontsLoaded} from '../fonts';
import {mtav} from '../lib/format';
import {textWidth} from '../lib/measure';
import {F} from '../tokens';
import {ObdPicture, type ObdLook} from './CoverObd';
import {CheckDot} from './kit/marks';
import {Car as IlloCar} from '../scenes/illo/car';
import {Lift, Phone3, type Region} from './kit/phone3d';
import {INK} from './kit/stage';

const PAD = 72;
const TOP = 300;
const ROW_H = 48;
const HEAD_LH = 1.1;
const MAX_W = 1080 - 2 * PAD;
const PAPER = '#F3F3F3';
const GREY = '#8A8A8A';

const HEADS: Record<'A' | 'B' | 'C', string[]> = {
  A: ['ქალს', 'ჰყავდა?'],
  B: ['კოდები ახლახან', 'წაშლილი ჩანს'],
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

const GreyLook: ObdLook = {yaw: -30, pitch: -18, scale: 1.0, cy: 1360, checkX: 760, checkY: 1000, checkSize: 160, rings: [470, 610]};
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
      {variant === 'B' ? (
        <div style={{position: 'absolute', inset: 0, filter: 'grayscale(1) contrast(1.05)'}}>
          <ObdPicture top={headBottom + 10} look={GreyLook} uid="cvb" />
          <div style={{position: 'absolute', inset: 0, background: PAPER, mixBlendMode: 'multiply'}} />
        </div>
      ) : null}
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
