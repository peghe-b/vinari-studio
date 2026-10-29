// V135MumsNumberReveal: the real card of 08-qr-card printed on an A4 sheet (it rises out of the printer's slot), cut on its
// dashed line, then set behind the glass from the inside, where mum's note was.
import React from 'react';
import {Img, staticFile, useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, lead, PictureBand, Sfx} from '../common';
import {rgba} from '../../tokens';
import {ease, prog, spr} from '../../lib/anim';
import {OBJ} from '../../lib/layer';
import type {SceneCtx} from '../../types';
import {Ink} from '../kit/ink';
import {shadow} from '../kit/p2';

type P = {hitAt?: number | string; look?: string};

// the card preview of 08-qr-card (capture px)
const PX = 137;
const PY = 355;
const PW = 807;
const PH = 452;
const K0 = 0.55; // on the sheet
const K1 = 0.74; // behind the glass
const ROOM = {x: 190, y: 400, w: 700, h: 960};
// the printer (stage px): its top, the slot the sheet comes out of
const PRN = {x: 150, y: 1060, w: 780, h: 250};
const SLOT = PRN.y + 40;
// the A4 sheet (1 : 1.414) and where it stops
const SW = 540;
const SH = Math.round(SW * 1.414);
const SX = 540 - SW / 2;
const STOP = 440;

export const V135MumsNumberReveal: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const cutAt = Math.max(lead(ctx) + 24, cueFrame(ctx, 1) + 4);
  const hit = Math.max(cutAt + 20, cueFrame(ctx, p.hitAt ?? 2));
  // chunk 0: the sheet feeds out of the slot; chunk 1: the dashed line is cut, the sheet and the printer fall away; chunk 2:
  // the card goes up behind the glass
  const feed = prog(frame, e + 2, Math.max(20, cutAt - e - 10), ease.camera);
  const cut = prog(frame, cutAt, 14);
  const away = prog(frame, cutAt + 8, 16, ease.whipIn);
  const up = spr(frame, hit, 'land');
  const sheetY = SLOT - (SLOT - STOP) * feed;
  const k = K0 + (K1 - K0) * up;
  const w = PW * k;
  const h = PH * k;
  const x0 = 540 - (PW * K0) / 2;
  const y0 = sheetY + 70;
  const x1 = 540 - (PW * K1) / 2;
  const y1 = 560;
  const x = x0 + (x1 - x0) * up;
  const y = y0 + (y1 - y0) * up;
  const photoIn = prog(frame, hit - 8, 12);
  const m = 22 * (1 - cut);
  return (
    <PictureBand camera={false}>
      <div className={OBJ} style={{position: 'absolute', left: ROOM.x, top: ROOM.y, width: ROOM.w, height: ROOM.h, borderRadius: 24, overflow: 'hidden', opacity: photoIn, boxShadow: shadow()}}>
        <Img src={staticFile('photos/keys-fob-dash.jpg')} style={{width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(1)'}} />
      </div>
      {away < 1 ? (
        <div style={{position: 'absolute', inset: 0, transform: `translateY(${(700 * away).toFixed(1)}px)`, opacity: 1 - away}}>
          {/* the sheet, seen only above the slot */}
          <div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: SLOT, overflow: 'hidden'}}>
            <div className={OBJ} style={{position: 'absolute', left: SX, top: sheetY, width: SW, height: SH, backgroundColor: '#FFFFFF', boxShadow: shadow(), opacity: 1 - cut}} />
          </div>
          {/* the printer: a graphite body, its paper slot */}
          <div className={OBJ} style={{position: 'absolute', left: PRN.x, top: PRN.y, width: PRN.w, height: PRN.h, borderRadius: 36, backgroundColor: '#1E1E1E', boxShadow: '0 24px 50px rgba(0,0,0,0.25)'}}>
            <div style={{position: 'absolute', left: 90, right: 90, top: 30, height: 18, borderRadius: 9, backgroundColor: '#050505'}} />
            <div style={{position: 'absolute', left: 0, right: 0, top: 70, height: 6, backgroundColor: '#2C2C2C'}} />
            <div style={{position: 'absolute', right: 60, bottom: 50, width: 26, height: 26, borderRadius: 13, backgroundColor: '#F5F5F5', opacity: 0.85}} />
          </div>
        </div>
      ) : null}
      {/* the card: on the sheet inside its dashed line, then cut out and set behind the glass */}
      <div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: up > 0 || cut > 0 ? 1920 : SLOT, overflow: 'hidden'}}>
        <div className={OBJ} style={{position: 'absolute', left: x - m, top: y - m, width: w + 2 * m, height: h + 2 * m, borderRadius: 12, background: '#FFFFFF', borderWidth: 4, borderStyle: 'dashed', borderColor: rgba('#787878', 1 - cut), boxShadow: cut > 0 ? shadow() : 'none', overflow: 'hidden'}}>
          <div style={{position: 'absolute', left: m, top: m, width: w, height: h, overflow: 'hidden', borderRadius: 10}}>
            <Img src={staticFile('screens/08-qr-card.jpg')} style={{position: 'absolute', width: 1080 * k, left: -PX * k, top: -PY * k, maxWidth: 'none'}} />
          </div>
        </div>
      </div>
      <Ink marks={[{kind: 'tick', box: {x: x1 + PW * K1 - 120, y: y1 + PH * K1 + 20, w: 90, h: 80}, at: hit + 20}]} room={ROOM} end={ctx.dur} />
      <Sfx name="cc0-card-slide" at={Math.max(lead(ctx), e + 2)} volume={0.3} />
      <Sfx name="asmr-paper" at={cutAt} volume={0.32} />
      <Haptic kind="light" at={cutAt + 2} />
      <Sfx name="cc0-card-place" at={hit + 6} volume={0.3} />
      <Haptic kind="light" at={hit + 6} />
    </PictureBand>
  );
};
