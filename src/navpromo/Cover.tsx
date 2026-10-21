// The promo's Reels cover, black and white only (the studio's cover layout, src/Cover.tsx: the lockup top left, the tag top
// right, a hairline, a big two-line headline in condensed Mtavruli at weight 600; no number: a standalone promo). Under it
// the crisp real iPhone in grey on the navigator (its „მარჯვნივ მოუხვიე" banner readable) rises to the cover's foot, and at its
// lower left the crude MS-Paint lost man, in grey, holds his useless phone up and stares at it, a crude '?' over his head.
// The lost man (refined) next to the crisp phone. Everything that matters sits in the 3:4 centre (y 240..1680).
import React, {useLayoutEffect, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, Img, staticFile} from 'remotion';
import {fontsLoaded} from '../fonts';
import {capsLatin, mtav} from '../lib/format';
import {textWidth} from '../lib/measure';
import {F} from '../tokens';
import {DefsSvg, Man} from './refined';
import {Iphone} from './Iphone';
import {INK, INK2} from './lib';
import {NavMapPicture, type MapLook} from './CoverMap';

const PAD = 72;
const TOP = 300;
const ROW_H = 48;
const RULE_Y = TOP + ROW_H + 30;
const HEAD_TOP = RULE_Y + 56;
const HEAD_MAX = 156;
const HEAD_LH = 1.12;
const MAX_W = 1080 - 2 * PAD;

/**
 * The pinned cover (the owner, 2026-10-14: "the headline says navigator, under it the navigator graphic, not a man by a car,
 * so it is clear this is the navigator video"): `variant="phone"` writes „ქართული ნავიგატორი" and puts the real navigator
 * screen on a big whole iPhone in the middle, with nobody next to it. The default keeps the first cover as it was.
 */
export const NavCover: React.FC<{variant?: 'phone' | 'map' | 'carplay'; look?: MapLook; headMax?: number; cp?: 'a' | 'b' | 'c'}> = ({variant, look, headMax, cp = 'a'}) => {
  // 'carplay' (the owner, 2026-10-21, the navigator + CarPlay promo): „ქართული ნავიგატორი / ახლა CarPlay-ზეც“ over the REAL
  // CarPlay guidance screen big in a car display, the iPhone with the navigator whole beside it, on the studio covers' #F3F3F3
  const carplay = variant === 'carplay';
  const mapOnly = variant === 'map';
  const phoneOnly = variant === 'phone' || mapOnly || carplay;
  const lines = (carplay ? ['ქართული ნავიგატორი', 'ახლა CarPlay-ზეც'] : phoneOnly ? ['ქართული', 'ნავიგატორი'] : ['რაით? ლეფთ?', 'აწი ქართულად.']).map(mtav);
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
  const ptop = headBottom + 70;
  // the phone WHOLE inside the grid's 3:4 crop (the owner, 2026-10-12: never cut a mockup)
  const pw = phoneOnly ? Math.min(660, (1660 - ptop) / 2.15) : Math.min(560, (1660 - ptop) / 2.15);
  const pcy = ptop + (pw * 2.15) / 2;
  return (
    <AbsoluteFill style={{backgroundColor: carplay ? '#F3F3F3' : '#FFFFFF'}}>
      {/* the picture, in grey */}
      {mapOnly ? <NavMapPicture top={headBottom + 20} height={1920 - headBottom - 20} look={look} /> : null}
      {carplay ? <CarPlayPicture top={headBottom + 80} cp={cp} /> : null}
      {mapOnly || carplay ? null : <AbsoluteFill style={{filter: 'grayscale(1)', clipPath: `inset(${headBottom + 30}px 0 0 0)`}}>
        <Iphone cx={phoneOnly ? 540 : 600} cy={pcy} w={pw} src="17-nav-drive" view={{x: 0.5, y: 0.2, zoom: 1.15}} glint={-1} />
        {phoneOnly ? null : <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <DefsSvg uid="cov" />
          <Man uid="cov" frame={0} x={190} y={1650} size={440} pose="wave" phone face="worried" turn={0.3} time="day" />
          <text x={150} y={1150} fontFamily="FiraGO, sans-serif" fontWeight={800} fontSize={170} fill="#1A1A1A" transform="rotate(-10 150 1100)">
            ?
          </text>
          {/* the mud under his boots: a light grey blob (a near-black slab read as a plank) */}
          <ellipse cx={200} cy={1660} rx={150} ry={14} fill="#B8B8B8" opacity={0.6} />
        </svg>}
      </AbsoluteFill>}
      {/* the top row: the lockup left, the tag right (no number: a standalone promo) */}
      <div style={{position: 'absolute', top: TOP, left: PAD, height: ROW_H, display: 'flex', alignItems: 'center', gap: 14}}>
        <Img src={staticFile('brand/mark.svg')} style={{height: 40, width: (40 * 768) / 671, filter: 'brightness(0) invert(0.045)'}} />
        <Img src={staticFile('brand/wordmark.svg')} style={{height: 23, width: (23 * 267) / 68, filter: 'brightness(0) invert(0.045)'}} />
      </div>
      <div style={{position: 'absolute', top: TOP, right: PAD, height: ROW_H, display: 'flex', alignItems: 'center'}}>
        <div style={{height: ROW_H - 2, display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px 0 18px', borderRadius: ROW_H, border: '1.5px solid rgba(160,160,160,0.9)', fontFamily: F.mono, fontSize: 22, letterSpacing: '0.06em', color: INK2, whiteSpace: 'nowrap'}}>
          <div style={{width: 9, height: 9, borderRadius: 9, background: INK}} />
          {mtav(capsLatin(phoneOnly ? 'VINARI+' : 'ნავიგატორი'))}
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


/** The CarPlay cover's picture, always black and white (the owner, 2026-10-21: covers are black and white, always): the REAL
 * CarPlay guidance capture (800×480, f18-10-guid1-car) in a dark car display, everything whole inside the grid's 3:4 crop
 * (y 240..1680). a: the display and the iPhone at its lower right; b: the display alone, big, tilted in 3D; c: the iPhone big
 * in the middle with the display behind it, higher and to the left. */
const CarPlayPicture: React.FC<{top: number; cp: 'a' | 'b' | 'c'}> = ({top, cp}) => {
  const bz = 22;
  const disp = (w: number, left: number, t: number, extra: React.CSSProperties = {}) => {
    const h = (w * 480) / 800;
    return (
      <div style={{position: 'absolute', top: t, left, width: w + 2 * bz, height: h + 2 * bz, borderRadius: 44, background: '#0E0E0F', boxShadow: '0 40px 90px rgba(0,0,0,0.28), 0 8px 22px rgba(0,0,0,0.18)', ...extra}}>
        <Img src={staticFile('screens/carplay/f18-10-guid1-car.png')} style={{position: 'absolute', top: bz, left: bz, width: w, height: h, borderRadius: 24}} />
      </div>
    );
  };
  return (
    <AbsoluteFill style={{filter: 'grayscale(1) contrast(1.05)'}}>
      {cp === 'a' ? (
        <>
          {disp(900, 44, top)}
          <Iphone cx={858} cy={1660 - (262 * 2.15) / 2} w={262} src="17-nav-drive" view={{x: 0.5, y: 0.2, zoom: 1.15}} glint={-1} />
        </>
      ) : cp === 'b' ? (
        <div style={{position: 'absolute', inset: 0, perspective: 2200}}>
          {disp(930, (1080 - 930 - 2 * bz) / 2, top + 90, {transform: 'rotateX(10deg) rotateY(-14deg) rotateZ(-2deg)', transformOrigin: '50% 50%'})}
        </div>
      ) : (
        <>
          {disp(760, 30, top + 10)}
          <Iphone cx={720} cy={1662 - (300 * 2.15) / 2} w={300} src="17-nav-drive" view={{x: 0.5, y: 0.2, zoom: 1.15}} glint={-1} />
        </>
      )}
    </AbsoluteFill>
  );
};
