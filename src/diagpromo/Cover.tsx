// The diagnostics promo's Reels cover: white; the small kicker „საქართველოში პირველად", the big two-line headline „OBD
// სკანერი / ქართულად" (condensed Mtavruli, the second line in the film's cobalt; no rule, no line under any text), and under
// it the studio's whole 3D iPhone on the REAL result screen (22-obd-result) with its verdict lifted out big: „იარე, მაგრამ
// მალე ხელოსანთან". Everything inside the grid's 3:4 crop (y 240..1680).
import React, {useLayoutEffect, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender} from 'remotion';
import {fontsLoaded} from '../fonts';
import {mtav} from '../lib/format';
import {textWidth} from '../lib/measure';
import {C, F} from '../tokens';
import {atFoot, bodyBox, Lift, Phone3, type Rect} from './kit/phone3d';
import {R} from './Explain';

/** v2: `tall` the 9:16 Reels cover (1080 x 1920, the content in the grid's 3:4 crop); false the 4:5 feed cover (1080 x 1350),
 *  the same pieces laid tighter */
export const DiagCover: React.FC<{tall?: boolean}> = ({tall = true}) => {
  const [h] = useState(() => delayRender('diag cover fonts'));
  const [ready, setReady] = useState(false);
  useLayoutEffect(() => {
    fontsLoaded.then(() => {
      setReady(true);
      continueRender(h);
    });
  }, [h]);
  const l1 = 'OBD ' + mtav('სკანერი');
  const l2 = mtav('ქართულად');
  let size = 168;
  if (ready) {
    const w = Math.max(textWidth(l1, `700 ${size}px ${F.sans}`), textWidth(l2, `700 ${size}px ${F.sans}`));
    if (w > 920) size = Math.floor((size * 920) / w);
  }
  const L = tall ? {kick: 268, head: 336, foot: 1660, w: 410, vy: 700, vw: 900} : {kick: 64, head: 126, foot: 1300, w: 360, vy: 560, vw: 880};
  if (!tall) size = Math.round(size * 0.9);
  const pose = atFoot({x: 540, w: L.w, yaw: -10, pitch: 6, roll: 1.5}, L.foot);
  const vh = (L.vw * (R.resVerdict.y1 - R.resVerdict.y0) * 2346) / ((R.resVerdict.x1 - R.resVerdict.x0) * 1080);
  // the verdict card over the screen's content: the phone's top edge (the island) stays in sight above it
  const to: Rect = {x: 540 - L.vw / 2, y: bodyBox(pose).y + (tall ? 190 : 150), w: L.vw, h: vh};
  return (
    <AbsoluteFill style={{background: C.surface}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: L.kick, textAlign: 'center', fontFamily: F.sans, fontWeight: 600, fontSize: 44, letterSpacing: '0.04em', color: C.ink2}}>{mtav('საქართველოში პირველად')}</div>
      <div style={{position: 'absolute', left: 0, right: 0, top: L.head, textAlign: 'center', fontFamily: F.sans, fontWeight: 700, fontSize: size, lineHeight: 1.06, color: C.ink, whiteSpace: 'nowrap'}}>
        {l1}
        <br />
        <span style={{color: C.accA}}>{l2}</span>
      </div>
      <Phone3 src="22-obd-result" pose={pose} veil={0.3} />
      <Lift src="22-obd-result" r={R.resVerdict} pose={pose} to={to} k={1} radius={36} />
    </AbsoluteFill>
  );
};
