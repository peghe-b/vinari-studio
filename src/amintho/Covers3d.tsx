// The 3D OBD film „ყველაზე ძვირი ნათურა"'s Reels covers, drawn instead of the Blender stills (the owner, 31 Oct: „ბლენდერის
// ფოტო რათ მინდა, გრაფიკულად შემიქმენი, შავ-თეთრი ყოველთვის", three different ones to choose from). The same frame as
// „კიდევ ამინთო"'s covers: the VINARI top row, a big condensed Mtavruli headline, one drawn picture of the film's moment under it.
//   A  „ყველაზე ძვირი ნათურა"      the check lamp alone, big and lit on the night dash (the film's first beat)
//   B  „ჯერ კოდი, მერე ხელოსანი"   the adapter seated in the OBD port, its LED on (the film's click)
//   C  „რა სჭირს მანქანას?"        a drawn iPhone with the real result screen the film shows (Mercedes-Benz GLE, P0420, P0171)
import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {mtav} from '../lib/format';
import {F} from '../tokens';
import {DefsSvg} from '../scenes/illo/solid';
import {Frame, GREY, HEAD_LH, MAX_W, PAD, PAPER, ROW_H, TOP, useFit} from './Covers';
import {AdapterBody, PortFace} from './kit/bits';
import {Iphone} from './kit/iphone';
import {AMBER, EngineIcon, INK} from './kit/stage';

type V = 'A' | 'B' | 'C';
const HEADS: Record<V, string[]> = {
  A: ['ყველაზე ძვირი', 'ნათურა'],
  B: ['ჯერ კოდი,', 'მერე ხელოსანი'],
  C: ['რა სჭირს', 'მანქანას?'],
};
const KICK: Record<V, string> = {A: 'ჩეკის ნათურა', B: 'OBD სკანერი', C: 'OBD სკანერი'};
const BOTTOM = 1690;

const PictureA: React.FC<{top: number}> = ({top}) => {
  const h = BOTTOM - top;
  const lx = MAX_W / 2;
  const ly = h * 0.44;
  return (
    <Frame top={top} h={h}>
      <svg width={MAX_W} height={h} style={{position: 'absolute', inset: 0}}>
        <defs>
          <radialGradient id="c3a" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor={AMBER} stopOpacity={0.5} />
            <stop offset="0.4" stopColor={AMBER} stopOpacity={0.16} />
            <stop offset="1" stopColor={AMBER} stopOpacity={0} />
          </radialGradient>
        </defs>
        <rect width={MAX_W} height={h} fill="#0A0B0E" />
        <path d={`M-40 ${h * 0.8}C220 ${h * 0.72} ${MAX_W - 220} ${h * 0.72} ${MAX_W + 40} ${h * 0.8}V${h + 40}H-40Z`} fill="#16181D" />
        <circle cx={lx} cy={ly} r={400} fill="url(#c3a)" />
        <EngineIcon x={lx} y={ly} size={430} k={1} uid="c3a" stroke={1.5} />
      </svg>
    </Frame>
  );
};

const PictureB: React.FC<{top: number}> = ({top}) => {
  const h = BOTTOM - top;
  // the plug shot's own drawing (1080 wide, the port at 540,690), framed around the seated adapter
  const vy = 300;
  const vh = 1000;
  return (
    <Frame top={top} h={h}>
      <DefsSvg uid="c3b" />
      <svg width={MAX_W} height={h} viewBox={`70 ${vy} 940 ${vh}`} preserveAspectRatio="xMidYMid meet" style={{position: 'absolute', inset: 0, background: '#2A2A2A'}}>
        <path d="M-100 420C200 470 880 470 1180 420V560C880 610 200 610 -100 560Z" fill="#1C1E23" />
        <path d="M-100 560C200 610 880 610 1180 560V580C880 630 200 630 -100 580Z" fill="#2B2E35" />
        <PortFace cx={540} cy={690} s={1.15} uid="c3b" glow={1} />
        <AdapterBody cx={540} top={690 - 52} s={1.05} led={1} uid="c3bA" />
      </svg>
    </Frame>
  );
};

const PictureC: React.FC<{top: number}> = ({top}) => {
  const h = BOTTOM - top;
  const w = Math.min(420, (h - 40) / 2.15);
  return (
    <div style={{position: 'absolute', left: 0, top, width: 1080, height: h, filter: 'grayscale(1)'}}>
      <Iphone cx={540} cy={h / 2} w={w} src="obd-result-ready" view={{x: 0.5, y: 0.3, zoom: 1.0}} shadow={0.7} />
    </div>
  );
};

export const Obd3dCover: React.FC<{variant?: V}> = ({variant = 'A'}) => {
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
