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
import {atFoot, Lift, Phone3, type Rect} from './kit/phone3d';
import {R} from './Explain';

export const DiagCover: React.FC = () => {
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
  const pose = atFoot({x: 540, w: 420, yaw: -10, pitch: 6, roll: 1.5}, 1660);
  const vh = (900 * (R.resVerdict.y1 - R.resVerdict.y0) * 2346) / ((R.resVerdict.x1 - R.resVerdict.x0) * 1080);
  const to: Rect = {x: 90, y: 700, w: 900, h: vh};
  return (
    <AbsoluteFill style={{background: C.surface}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: 268, textAlign: 'center', fontFamily: F.sans, fontWeight: 600, fontSize: 44, letterSpacing: '0.04em', color: C.ink2}}>{mtav('საქართველოში პირველად')}</div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 336, textAlign: 'center', fontFamily: F.sans, fontWeight: 700, fontSize: size, lineHeight: 1.06, color: C.ink, whiteSpace: 'nowrap'}}>
        {l1}
        <br />
        <span style={{color: C.accA}}>{l2}</span>
      </div>
      <Phone3 src="22-obd-result" pose={pose} veil={0.3} />
      <Lift src="22-obd-result" r={R.resVerdict} pose={pose} to={to} k={1} radius={36} />
    </AbsoluteFill>
  );
};
