// The promo's Reels cover, black and white only (the studio's cover layout, src/Cover.tsx: the lockup top left, the tag top
// right, a hairline, a big two-line headline in condensed Mtavruli at weight 600; no number: a standalone promo). Under it
// the crisp real iPhone in grey on the navigator (its „მარჯვნივ მოუხვიე" banner readable) rises to the cover's foot, and at its
// lower left the crude MS-Paint lost man, in grey, holds his useless phone up and stares at it, a crude '?' over his head.
// Crude next to crisp. Everything that matters sits in the 3:4 centre (y 240..1680).
import React, {useLayoutEffect, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, Img, staticFile} from 'remotion';
import {fontsLoaded} from '../fonts';
import {capsLatin, mtav} from '../lib/format';
import {textWidth} from '../lib/measure';
import {F} from '../tokens';
import {boilOf, C1, CrudeMan, Shape} from './crude';
import {Iphone} from './Iphone';
import {INK, INK2} from './lib';

const PAD = 72;
const TOP = 300;
const ROW_H = 48;
const RULE_Y = TOP + ROW_H + 30;
const HEAD_TOP = RULE_Y + 56;
const HEAD_MAX = 156;
const HEAD_LH = 1.12;
const MAX_W = 1080 - 2 * PAD;

export const NavCover: React.FC = () => {
  const lines = ['რაით? ლეფთ?', 'აწი ქართულად.'].map(mtav);
  const [size, setSize] = useState<number | null>(null);
  const [handle] = useState(() => delayRender('fit the cover headline'));
  useLayoutEffect(() => {
    let live = true;
    fontsLoaded
      .then(() => document.fonts.ready)
      .then(() => {
        if (!live) return;
        const widest = Math.max(...lines.map((l) => textWidth(l, `600 ${HEAD_MAX}px ${F.sans}`)));
        setSize(Math.min(HEAD_MAX, Math.floor((HEAD_MAX * MAX_W) / widest)));
        continueRender(handle);
      });
    return () => {
      live = false;
    };
  }, [handle]);
  const fs = size ?? HEAD_MAX;
  const headBottom = HEAD_TOP + lines.length * fs * HEAD_LH;
  const pw = 560;
  const ptop = headBottom + 70;
  const pcy = ptop + (pw * 2.15) / 2;
  const b = boilOf(0);
  return (
    <AbsoluteFill style={{backgroundColor: '#FFFFFF'}}>
      {/* the picture, in grey */}
      <AbsoluteFill style={{filter: 'grayscale(1)', clipPath: `inset(${headBottom + 30}px 0 0 0)`}}>
        <Iphone cx={600} cy={pcy} w={pw} src="17-nav-drive" view={{x: 0.5, y: 0.2, zoom: 1.15}} glint={-1} />
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <CrudeMan x={190} y={1650} h={420} facing={1} arms="phoneUp" boil={b} />
          <text x={150} y={1150} fontFamily="FiraGO, sans-serif" fontWeight={800} fontSize={170} fill="#9A9A9A" stroke={C1.black} strokeWidth={5} transform="rotate(-10 150 1100)">
            ?
          </text>
          {/* the mud under his boots: a light grey blob (a near-black slab read as a plank) */}
          <Shape pts={[[70, 1655], [330, 1642], [360, 1690], [55, 1700]]} fill="#B8B8B8" boil={b} seed={501} sw={4} />
        </svg>
      </AbsoluteFill>
      {/* the top row: the lockup left, the tag right (no number: a standalone promo) */}
      <div style={{position: 'absolute', top: TOP, left: PAD, height: ROW_H, display: 'flex', alignItems: 'center', gap: 14}}>
        <Img src={staticFile('brand/mark.svg')} style={{height: 40, width: (40 * 768) / 671, filter: 'brightness(0) invert(0.045)'}} />
        <Img src={staticFile('brand/wordmark.svg')} style={{height: 23, width: (23 * 267) / 68, filter: 'brightness(0) invert(0.045)'}} />
      </div>
      <div style={{position: 'absolute', top: TOP, right: PAD, height: ROW_H, display: 'flex', alignItems: 'center'}}>
        <div style={{height: ROW_H - 2, display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px 0 18px', borderRadius: ROW_H, border: '1.5px solid rgba(160,160,160,0.9)', fontFamily: F.mono, fontSize: 22, letterSpacing: '0.06em', color: INK2, whiteSpace: 'nowrap'}}>
          <div style={{width: 9, height: 9, borderRadius: 9, background: INK}} />
          {mtav(capsLatin('ნავიგატორი'))}
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
