// v135-hauler-gate: two real greyscale photo cards, a slow push towards each, then a hand mark lands and one quiet word
// says what it is. "cab": the empty cab (the wheel, nobody at it), "no driver anywhere". "glass": the payoff, the printed
// QR card (the real 08-qr-card capture, cropped to its card) standing behind a modern car's windshield, the glass's sheen
// over it, the marker round it.
import React from 'react';
import {Img, staticFile, useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, lead, PictureBand, Sfx} from '../common';
import {C} from '../../tokens';
import {ease, prog} from '../../lib/anim';
import {TXT, OBJ} from '../../lib/layer';
import {mtav} from '../../lib/format';
import type {SceneCtx} from '../../types';
import {Ink} from '../kit/ink';
import {FitText, shadow} from '../kit/p2';

type P = {shot?: 'cab' | 'glass'; label?: string; hitAt?: number | string};

const BOX = {x: 150, y: 420, w: 780, h: 900};
const BAND = 150;
const WHITE = '#F5F5F5';
/** the QR card on the 08-qr-card capture (1080 x 2346 px) */
const CARD = {x: 137, y: 354, w: 807, h: 453};
/** the sheet on the glass, box px (between the wipers, under the glass's top edge) */
const SHEET = {x: 190, y: 120, w: 420};

export const V135HaulerGate: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const hit = Math.max(lead(ctx) + 10, cueFrame(ctx, p.hitAt ?? 1));
  const push = 1.04 + 0.08 * ease.camera(prog(frame, e, ctx.dur));
  const glass = p.shot === 'glass';
  const sh = (SHEET.w * CARD.h) / CARD.w;
  const k = SHEET.w / CARD.w;
  // the marker: round the sheet behind the glass, or round the wheel's empty hub
  const mark = glass
    ? {kind: 'circle' as const, box: {x: BOX.x + SHEET.x - 36, y: BOX.y + SHEET.y - 30, w: SHEET.w + 72, h: sh + 60}, at: hit}
    : {kind: 'circle' as const, box: {x: BOX.x + 200, y: BOX.y + 390, w: 300, h: 300}, at: hit};
  return (
    <PictureBand camera={false}>
      <div className={OBJ} style={{position: 'absolute', left: BOX.x, top: BOX.y, width: BOX.w, height: BOX.h, borderRadius: 28, overflow: 'hidden', backgroundColor: C.surface, boxShadow: shadow(1), filter: 'grayscale(1)'}}>
        <div style={{position: 'absolute', inset: 0, transform: `scale(${push.toFixed(4)})`, transformOrigin: glass ? '50% 25%' : '45% 60%'}}>
          {glass ? (
            <>
              {/* the windshield and the hood of a modern car in the rain, cropped to its glass */}
              <Img src={staticFile('photos/rain-car-portrait.jpg')} style={{position: 'absolute', left: -430 * 1.35, top: 0, width: 1067 * 1.35, height: 1600 * 1.35, filter: 'grayscale(1) contrast(1.08) brightness(1.15)'}} />
              {/* the printed card behind the glass: the real capture, cropped to the card */}
              <div style={{position: 'absolute', left: SHEET.x, top: SHEET.y, width: SHEET.w, height: sh, overflow: 'hidden', borderRadius: 6, transform: 'rotate(-2deg)', boxShadow: '0 6px 18px rgba(0,0,0,0.45)'}}>
                <Img src={staticFile('screens/08-qr-card.jpg')} style={{position: 'absolute', left: -CARD.x * k, top: -CARD.y * k, width: 1080 * k, height: 2346 * k, filter: 'grayscale(1)'}} />
                <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(115deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 38%, rgba(255,255,255,0) 70%, rgba(255,255,255,0.12) 100%)'}} />
              </div>
            </>
          ) : (
            // the empty cab: the wheel, nobody at it
            <Img src={staticFile('photos/interior-wheel-portrait.jpg')} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 70%', filter: 'grayscale(1) contrast(1.08) brightness(1.2)'}} />
          )}
        </div>
      </div>
      <div className={TXT} style={{position: 'absolute', left: BOX.x, top: BOX.y + BOX.h - BAND, width: BOX.w, height: BAND, backgroundColor: C.surface, borderRadius: '0 0 28px 28px'}} />
      <Ink marks={[mark]} end={ctx.dur} room={BOX} color={WHITE} />
      <FitText text={mtav(p.label ?? '')} x={BOX.x + 40} y={BOX.y + BOX.h - 128} w={BOX.w - 80} size={96} maxLines={1} at={hit} anim="slam" />
      <Sfx name="asmr-tap" at={hit} volume={0.3} />
      <Haptic kind="light" at={hit} />
    </PictureBand>
  );
};
