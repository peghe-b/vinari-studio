// 18 the reveal v2.1 (the owner, 2026-10-15: "the phone mockup must rise SLOWLY and gently"; the AD on v2: it held one small
// phone on the home screen's car value for 7 s, and the kicker was grey): two set-ups, cut on the headline.
//   A  black after the drain; a faint rim of light finds a black iPhone low in the dark and it RISES slowly (1.2 s, eased, a
//      soft settle) while it turns toward us; its screen wakes on VINARI's OBD scanner; the white opens out of its screen and
//      „საქართველოში / პირველად" lands big and calm above it.
//   B  (a cut on „მანქანის დიაგნოსტიკა") the phone bigger, turned the other way, the scanner's card big and readable; above it
//      the small black kicker and the black headline landing line by line. No blue, no grey, no line under any text, no
//      subtitle (the headline is the line). The phone always whole.
import React from 'react';
import {mtav} from '../lib/format';
import {textWidth} from '../lib/measure';
import {C, F} from '../tokens';
import {atFoot, bodyBox, float, Phone3, projectBox} from './kit/phone3d';
import {clamp, E, lerp, prog} from './lib';
import {INK, rise, useShot} from './kit/stage';

const HUB = '21-obd-hub';

export const Reveal: React.FC = () => {
  const {t, L, Ls} = useShot('reveal');
  const riseAt = L('rise');
  const wake = L('wake');
  const white = L('whiteout');
  const kick = L('kick');
  const title = Ls('title');
  const cutB = title[0] - 3;

  const font = (sz: number) => `700 ${sz}px ${F.sans}`;
  const fl = float(t);

  if (t >= cutB) {
    // ---- B: the headline over the phone, the scanner big ----
    const q = t - cutB;
    const lines = [mtav('მანქანის დიაგნოსტიკა'), `${mtav('და')} OBD ${mtav('სკანერი,')}`, mtav('ქართულად')];
    let ts = 96;
    const tw = Math.max(...lines.map((l) => textWidth(l, font(ts))));
    if (tw > 900) ts = Math.floor((ts * 900) / tw);
    const KICK_TOP = 268;
    const TITLE_TOP = 330;
    const titleBottom = TITLE_TOP + ts * 1.06 * 3;
    const FOOT = 1500;
    const ratio = bodyBox({x: 540, y: 960, w: 100, yaw: -12, pitch: 4, roll: 0}).h / 100;
    const w0 = (FOOT - titleBottom - 34) / ratio;
    const push = E.inOut(clamp(q / 110));
    const pose = atFoot({x: 540, w: w0 * lerp(1, 1.025, push), yaw: lerp(-14, -9, push) + fl.roll, pitch: 4 + fl.pitch, roll: 1}, FOOT);
    const lineK = (i: number) => (i === 0 ? 1 : E.out(prog(t, title[i] - 2, 11)));
    return (
      <div style={{position: 'absolute', inset: 0, background: C.surface, overflow: 'hidden'}}>
        <div style={{position: 'absolute', left: 0, right: 0, top: KICK_TOP, textAlign: 'center', fontFamily: F.sans, fontWeight: 500, fontSize: 40, letterSpacing: '0.05em', color: INK, whiteSpace: 'nowrap'}}>
          {mtav('საქართველოში პირველად')}
        </div>
        {lines.map((l, i) => {
          const k = lineK(i);
          if (k <= 0) return null;
          return (
            <div key={i} style={{position: 'absolute', left: 0, right: 0, top: TITLE_TOP + i * ts * 1.06, textAlign: 'center', fontFamily: F.sans, fontWeight: 700, fontSize: ts, lineHeight: 1, color: INK, whiteSpace: 'nowrap', opacity: k, transform: `translateY(${(1 - k) * 26}px)`}}>
              {l}
            </div>
          );
        })}
        <Phone3 src={HUB} pose={pose} shadow={1} />
      </div>
    );
  }

  // ---- A: the rise in the dark, the white out of the screen, the big kicker ----
  const big = [mtav('საქართველოში'), mtav('პირველად')];
  let bs = 118;
  const bw = Math.max(...big.map((l) => textWidth(l, font(bs))));
  if (bw > 880) bs = Math.floor((bs * 880) / bw);
  const r = rise(t, riseAt, 36);
  const FOOT = 1500;
  const w = lerp(320, 392, clamp(r));
  let pose = atFoot({x: 540, w, yaw: lerp(56, 10, r) + fl.roll * r, pitch: lerp(16, 4, r) + fl.pitch * r, roll: lerp(-6, -1, r)}, lerp(2600, FOOT, clamp(r)));
  pose = {...pose, y: pose.y + fl.bob * r};
  const faint = 0.55 * E.out2(prog(t, riseAt, 24));
  const rimDark = lerp(faint, 1.15, E.out(prog(t, wake - 6, 30)));
  const look = E.out(prog(t, white, 8));
  const rim = lerp(rimDark, 1, look);
  const lum = t < white ? 0.85 * E.out(prog(t, wake, 12)) : lerp(0.85, 1, E.out(prog(t, white, 8)));
  const scr = projectBox(pose, {x0: 0, y0: 0, x1: 1, y1: 1});
  const BLOOM = 22;
  const burst = E.sine(prog(t, white, BLOOM));
  const isWhite = t >= white + BLOOM;
  const body = bodyBox(pose);
  const backlight = 0.5 * E.sine(prog(t, wake - 6, 24)) * (1 - E.sine(prog(t, white + 8, 16)));
  const bigK = E.out(prog(t, kick - 2, 12));
  return (
    <div style={{position: 'absolute', inset: 0, background: isWhite ? C.surface : '#000', overflow: 'hidden'}}>
      {/* the white opening out of the screen. v2.2 (the owner saw a torn frame here: the white's last frame before the cut came
          out in shifted tiles and the phone vanished): it was a box growing to ~6 000 x 8 000 px (far past the frame), which
          Chrome's compositor rasterises in tiles beyond its GPU budget. The same ellipse is now drawn on a frame-sized layer
          (its radii and centre in px: the farthest-corner ellipse of that old box), so the layer never outgrows 1080 x 1920 */}
      {!isWhite && burst > 0 ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(ellipse ${(((scr.w + 5800 * burst) / 2) * Math.SQRT2).toFixed(1)}px ${(((scr.h + 5800 * burst) / 2) * Math.SQRT2).toFixed(1)}px at ${(scr.x + scr.w / 2).toFixed(1)}px ${(scr.y + scr.h / 2).toFixed(1)}px, ${C.surface} 0%, ${C.surface} ${lerp(8, 62, burst)}%, rgba(255,255,255,0) ${lerp(40, 71, burst)}%)`,
            opacity: clamp(burst * 3),
          }}
        />
      ) : null}
      {bigK > 0 ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: 286, textAlign: 'center', fontFamily: F.sans, fontWeight: 700, fontSize: bs, lineHeight: 1.04, color: INK, opacity: bigK, transform: `translateY(${(1 - bigK) * 20}px)`, whiteSpace: 'nowrap'}}>
          {big[0]}
          <br />
          {big[1]}
        </div>
      ) : null}
      {backlight > 0.002 ? <div style={{position: 'absolute', left: body.x + body.w * 0.06, top: body.y + body.h * 0.04, width: body.w * 0.88, height: body.h * 0.92, borderRadius: body.w * 0.16, background: C.surface, filter: 'blur(46px)', opacity: backlight}} /> : null}
      {r > 0.001 ? <Phone3 src={HUB} pose={pose} on={lum} look={look} rim={rim} shadow={1} /> : null}
    </div>
  );
};
