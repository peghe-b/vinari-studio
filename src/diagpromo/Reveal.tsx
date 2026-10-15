// 18 the reveal v2 (the owner, 2026-10-15: "the phone mockup must rise SLOWLY and gently"; "remove the blue from texts"):
// black after the drain; a faint rim of light finds a black iPhone low in the dark and it RISES slowly (1.3 s, an eased rise
// with a soft settle) while it turns toward us; its screen wakes on VINARI's home. Just before „საქართველოში" the white opens
// out of its screen; „საქართველოში პირველად" lands big and calm, then on „მანქანის დიაგნოსტიკა და OBD სკანერი, ქართულად."
// it settles up into the small kicker and the black headline lands line by line. No blue, no line under any text, no
// subtitle (the headline is the line). The phone always whole, under the headline.
import React from 'react';
import {mtav} from '../lib/format';
import {textWidth} from '../lib/measure';
import {C, F} from '../tokens';
import {atFoot, bodyBox, float, Phone3, projectBox} from './kit/phone3d';
import {clamp, E, lerp, prog} from './lib';
import {INK, GREY, rise, useShot} from './kit/stage';

const HOME = '23-home-104';

export const Reveal: React.FC = () => {
  const {t, L, Ls} = useShot('reveal');
  const riseAt = L('rise');
  const wake = L('wake');
  const white = L('whiteout');
  const kick = L('kick');
  const title = Ls('title');

  const font = (sz: number) => `700 ${sz}px ${F.sans}`;
  // the headline: three lines, as big as fits 900 px
  const lines = [mtav('მანქანის დიაგნოსტიკა'), `${mtav('და')} OBD ${mtav('სკანერი,')}`, mtav('ქართულად')];
  let ts = 118;
  const tw = Math.max(...lines.map((l) => textWidth(l, font(ts))));
  if (tw > 920) ts = Math.floor((ts * 920) / tw);
  const TITLE_TOP = 350;
  const titleBottom = TITLE_TOP + ts * 1.08 * 3;
  // the big first line („საქართველოში / პირველად") before it settles into the kicker
  const big = [mtav('საქართველოში'), mtav('პირველად')];
  let bs = 132;
  const bw = Math.max(...big.map((l) => textWidth(l, font(bs))));
  if (bw > 900) bs = Math.floor((bs * 900) / bw);

  // ---- the phone: a slow rise out of the dark, turning toward us; then it settles under the headline ----
  const r = rise(t, riseAt, 40);
  const FOOT = 1480;
  const ratio = bodyBox({x: 540, y: 960, w: 100, yaw: 8, pitch: 4, roll: 0}).h / 100;
  const wEnd = Math.min(330, (FOOT - titleBottom - 40) / ratio);
  const fl = float(t);
  const settle = E.inOut(prog(t, title[0] - 14, 22));
  const w = lerp(lerp(270, 318, r), wEnd, settle);
  let pose = atFoot({x: 540, w, yaw: lerp(58, 9, r) + fl.roll * r, pitch: lerp(16, 4, r) + fl.pitch * r, roll: lerp(-6, -1, r)}, lerp(1780, 1450, clamp(r)) + (FOOT - 1450) * settle);
  pose = {...pose, y: pose.y + fl.bob * r};

  // ---- light ----
  const faint = 0.55 * E.out2(prog(t, riseAt, 24));
  const rimDark = lerp(faint, 1.15, E.out(prog(t, wake - 6, 30)));
  const look = E.out(prog(t, white, 8));
  const rim = lerp(rimDark, 1, look);
  const lum = t < white ? 0.85 * E.out(prog(t, wake, 12)) : lerp(0.85, 1, E.out(prog(t, white, 8)));
  const scr = projectBox(pose, {x0: 0, y0: 0, x1: 1, y1: 1});
  const BLOOM = 24;
  const burst = E.sine(prog(t, white, BLOOM));
  const isWhite = t >= white + BLOOM;
  const body = bodyBox(pose);
  const backlight = 0.5 * E.sine(prog(t, wake - 6, 24)) * (1 - E.sine(prog(t, white + 8, 16)));

  // ---- the words ----
  const bigK = E.out(prog(t, kick - 2, 12));
  const up = E.inOut(prog(t, title[0] - 8, 12));
  const lineK = (i: number) => E.out(prog(t, title[i] - 2, 11));

  return (
    <div style={{position: 'absolute', inset: 0, background: isWhite ? C.surface : '#000', overflow: 'hidden'}}>
      {!isWhite && burst > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: scr.x + scr.w / 2 - (scr.w / 2 + 2900 * burst),
            top: scr.y + scr.h / 2 - (scr.h / 2 + 2900 * burst),
            width: scr.w + 5800 * burst,
            height: scr.h + 5800 * burst,
            background: `radial-gradient(ellipse at center, ${C.surface} 0%, ${C.surface} ${lerp(8, 62, burst)}%, rgba(255,255,255,0) ${lerp(40, 71, burst)}%)`,
            opacity: clamp(burst * 3),
          }}
        />
      ) : null}
      {/* „საქართველოში პირველად": big and calm, then up into the kicker */}
      {bigK > 0 ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: lerp(380, 262, up), textAlign: 'center', fontFamily: F.sans, fontWeight: lerp(700, 600, up), fontSize: lerp(bs, 42, up), lineHeight: 1.06, letterSpacing: `${lerp(0, 0.04, up)}em`, color: up > 0.5 ? GREY : INK, opacity: bigK, transform: `translateY(${(1 - bigK) * 20}px)`, whiteSpace: 'nowrap'}}>
          {up < 0.5 ? (
            <>
              {big[0]}
              <br />
              {big[1]}
            </>
          ) : (
            mtav('საქართველოში პირველად')
          )}
        </div>
      ) : null}
      {lines.map((l, i) => {
        const k = lineK(i);
        if (k <= 0) return null;
        return (
          <div key={i} style={{position: 'absolute', left: 0, right: 0, top: TITLE_TOP + i * ts * 1.08, textAlign: 'center', fontFamily: F.sans, fontWeight: 700, fontSize: ts, lineHeight: 1, color: INK, whiteSpace: 'nowrap', opacity: k, transform: `translateY(${(1 - k) * 26}px)`}}>
            {l}
          </div>
        );
      })}
      {backlight > 0.002 ? <div style={{position: 'absolute', left: body.x + body.w * 0.06, top: body.y + body.h * 0.04, width: body.w * 0.88, height: body.h * 0.92, borderRadius: body.w * 0.16, background: C.surface, filter: 'blur(46px)', opacity: backlight}} /> : null}
      {r > 0.001 ? <Phone3 src={HOME} pose={pose} on={lum} look={look} rim={rim} shadow={1} opacity={clamp(r * 3)} /> : null}
    </div>
  );
};
