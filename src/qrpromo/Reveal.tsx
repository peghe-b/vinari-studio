// 4 the reveal (the navigator promo's, re-cut for the card): black after the dim; a faint rim of light catches the titanium
// of a black iPhone far off and turned almost side-on, and it rises through the dark, swinging round to the viewer; its
// screen wakes dimly on the REAL QR card screen (08-qr-card). On „საქართველოში" the white opens OUT OF THE PHONE (its
// screen's light grows past the frame) and the headline slams in word by word while the phone steps back under it;
// a hairline draws. On „ვინარის ქიუარ ბარათი." the headline lifts away, the wordmark settles, the phone comes forward and
// the card itself lifts out of the real screen, flat and big. The whole phone is always in the frame, its foot above the
// subtitle band.
import React from 'react';
import {Img, staticFile, useCurrentFrame} from 'remotion';
import {mtav} from '../lib/format';
import {textWidth} from '../lib/measure';
import {C, F} from '../tokens';
import {atFoot, bodyBox, cardRect, float, Lift, Phone3, project, projectBox, zoomAbout, type Region} from './kit/phone3d';
import {clamp, E, ev, fr, lerp, prog, shake, shot, sp} from './lib';

const SRC = '08-qr-card';
/** the card on the capture (measured: x 136..946, y 353..809 of 1080 x 2346) */
export const CARD_R: Region = {x0: 136 / 1080, y0: 353 / 2346, x1: 946 / 1080, y1: 809 / 2346};
export const CARD_TO = cardRect(CARD_R, 940, 70, 300);
const FOOT = 1392;

export const Reveal: React.FC = () => {
  const t = useCurrentFrame();
  const base = fr(shot('reveal').from);
  const L = (name: string) => fr(ev(name)) - base;
  const rimAt = L('rim');
  const wake = L('wake');
  const white = L('whiteout');
  const s1 = L('slam1');
  const s2 = L('slam2');
  const hair = L('hairline');
  const n1 = L('n1');
  const lift = L('lift');
  const tapAt = L('printTap');
  const len = fr(shot('reveal').to) - base;
  const back = n1 - 8; // the headline leaves, the phone comes forward

  // ---- the headline's size (the phone steps back under it, as big as the room under the hairline allows) ----
  const l1 = mtav('საქართველოში');
  const l2 = mtav('პირველად');
  const font = (sz: number) => `700 ${sz}px ${F.sans}`;
  let size = 150;
  const wide = Math.max(textWidth(l1, font(size)), textWidth(l2, font(size)));
  if (wide > 900) size = Math.floor((size * 900) / wide);
  const TOP = 320;
  const hairY = TOP + size * 2.32;
  const ratio = bodyBox({x: 540, y: 960, w: 100, yaw: 14, pitch: 6, roll: -1}).h / 100;
  const stepW = Math.min(420, (FOOT - hairY - 30) / ratio);

  // ---- the phone's pose ----
  const rise = E.sine(prog(t, rimAt - 2, white - rimAt + 2));
  let w = lerp(240, 430, rise);
  let yaw = lerp(66, 12, rise);
  let pitch = lerp(14, 5, rise);
  let roll = lerp(-5, -1.2, rise);
  let foot = lerp(1340, FOOT, rise);
  // the slam: the phone steps back, whole, between the hairline and the subtitle band
  const stepBack = sp(t, s1 - 3, 170, 22);
  w = lerp(w, stepW, stepBack);
  yaw = lerp(yaw, 14, stepBack);
  pitch = lerp(pitch, 6, stepBack);
  roll = lerp(roll, -1, stepBack);
  foot = lerp(foot, FOOT, stepBack);
  // „ვინარის ქიუარ ბარათი": forward to the resting size
  const fwd = sp(t, back + 1, 150, 22);
  w = lerp(w, 430, fwd);
  yaw = lerp(yaw, 6, fwd);
  pitch = lerp(pitch, 3, fwd);
  roll = lerp(roll, 0, fwd);
  // the card lifts: the phone recedes a little and faces the viewer
  const liftK = sp(t, lift, 140, 19);
  const read = clamp(liftK);
  w *= 1 - 0.06 * read;
  yaw *= 1 - 0.7 * read;
  pitch *= 1 - 0.7 * read;
  const fl = float(t);
  let pose = atFoot({x: 540, w, yaw, pitch: pitch + fl.pitch * rise, roll: roll + fl.roll * rise}, foot);
  pose = {...pose, y: pose.y + fl.bob * rise};
  const kickK = Math.max(clamp((t - s1) / 3) * Math.exp(-Math.max(0, t - s1) / 4), clamp((t - s2) / 3) * Math.exp(-Math.max(0, t - s2) / 4));
  const cam = 1 + 0.03 * kickK;
  pose = zoomAbout(pose, cam, 540, 1000);
  // the card is out: the phone sinks away and only the card stays (the next shot opens on it, the same card)
  const phoneOut = E.inOut(prog(t, len - 14, 12));
  pose = zoomAbout(pose, 1 - 0.06 * phoneOut, 540, 1392);
  // the tap on the real „ამობეჭდვა და გაზიარება" button (capture y 1524..1646): the card comes out of it
  const tapP = project(pose, 0.5, 1585 / 2346);
  const tapK = (t - tapAt) / 16;

  // ---- light: the rim in the dark, the screen waking dim, then lit on the white ----
  const faint = 0.6 * E.out2(prog(t, rimAt, 24));
  const rimDark = lerp(faint, 1.2, E.out(prog(t, wake - 6, 30)));
  const look = E.out(prog(t, white, 6));
  const rim = lerp(rimDark, 1, look);
  const lum = t < white ? 0.85 * E.out(prog(t, wake, 12)) : lerp(0.85, 1, E.out(prog(t, white, 8)));
  const gk = (t - white - 4) / 24;
  const sheen: [number, number, number] | null = gk >= 0 && gk <= 1 ? [lerp(-0.4, 2.3, E.inOut(gk)), 0.2, 0.22 * Math.sin(Math.PI * gk)] : null;
  const body = bodyBox(pose);
  const backlight = 0.55 * E.sine(prog(t, wake - 6, 24)) * (1 - E.sine(prog(t, white + 10, 16)));

  // ---- the white, opening out of the phone's screen ----
  const scr = projectBox(pose, {x0: 0, y0: 0, x1: 1, y1: 1});
  const BLOOM = 26;
  const burst = E.sine(prog(t, white, BLOOM));
  const isWhite = t >= white + BLOOM;

  // ---- the headline ----
  const kick = mtav('QR ბარათი · ნომრის გარეშე');
  const slamOf = (at: number) => {
    if (t < at) return {s: 1.36, o: 0, dx: 0};
    const q = clamp((t - at) / 6);
    return {s: lerp(1.36, 1, E.outExpo(q)), o: clamp((t - at) / 2), dx: shake(t, at + 4, 9, 9, at)};
  };
  const a1 = slamOf(s1);
  const a2 = slamOf(s2);
  const liftHead = E.inOut(prog(t, back - 3, 14));
  const headY = -liftHead * 560;
  const headO = 1 - E.out(prog(t, back - 2, 7));
  const hairK = E.out(prog(t, hair, 12));
  // the wordmark, on „ვინარის"
  const wmIn = sp(t, n1 + 2, 120, 20);
  const wmOut = E.out(prog(t, lift + 2, 8));

  return (
    <div style={{position: 'absolute', inset: 0, background: isWhite ? C.surface : '#000', overflow: 'hidden'}}>
      {!isWhite && burst > 0 ? (
        // a bloom of the screen's light, soft-edged, growing past the frame
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
      {/* the headline, its kicker and the hairline */}
      {t >= s1 - 1 && headO > 0 ? (
        <div style={{position: 'absolute', inset: 0, transform: `scale(${cam}) translateY(${headY}px)`, transformOrigin: '540px 1000px', opacity: headO}}>
          <div style={{position: 'absolute', left: 0, right: 0, top: 262, textAlign: 'center', fontFamily: F.mono, fontSize: 30, color: C.ink2, letterSpacing: '0.02em', opacity: clamp((t - s1 - 1) / 6)}}>{kick}</div>
          {[
            {text: l1, a: a1, top: TOP},
            {text: l2, a: a2, top: TOP + size * 1.1},
          ].map((l) => (
            <div
              key={l.top}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: l.top,
                textAlign: 'center',
                fontFamily: F.sans,
                fontWeight: 700,
                fontSize: size,
                lineHeight: 1,
                color: C.ink,
                whiteSpace: 'nowrap',
                opacity: l.a.o,
                transform: `translateX(${l.a.dx}px) scale(${l.a.s})`,
                transformOrigin: '540px 70px',
              }}
            >
              {l.text}
            </div>
          ))}
          <div style={{position: 'absolute', left: 140, top: hairY, width: 800 * hairK, height: 2, background: C.ink}} />
        </div>
      ) : null}
      {t >= n1 && wmOut < 1 ? (
        <Img
          src={staticFile('brand/wordmark.svg')}
          style={{position: 'absolute', left: 540 - 140, top: 270 + (1 - wmIn) * 18, width: 280, height: (280 * 68) / 267, filter: 'brightness(0) invert(0.045)', opacity: wmIn * (1 - wmOut)}}
        />
      ) : null}
      {backlight > 0.002 ? (
        <div style={{position: 'absolute', left: body.x + body.w * 0.06, top: body.y + body.h * 0.04, width: body.w * 0.88, height: body.h * 0.92, borderRadius: body.w * 0.16, background: C.surface, filter: 'blur(46px)', opacity: backlight}} />
      ) : null}
      <Phone3 src={SRC} pose={pose} on={lum} look={look} rim={rim} sheen={sheen} veil={0.3 * read} shadow={1} opacity={1 - phoneOut} />
      {tapK > 0 && tapK < 1 ? (
        <div
          style={{
            position: 'absolute',
            left: tapP.x - 46,
            top: tapP.y - 46,
            width: 92,
            height: 92,
            borderRadius: 46,
            border: '6px solid rgba(255,255,255,0.95)',
            boxShadow: '0 0 0 4px rgba(11,11,11,0.55)',
            opacity: 1 - tapK,
            transform: `scale(${0.5 + 0.7 * E.out(tapK)})`,
          }}
        />
      ) : null}
      {t >= lift - 1 ? (
        <Lift src={SRC} r={CARD_R} pose={pose} to={CARD_TO} k={liftK} show={1} radius={26} fog={0.3 * read * (1 - read)} />
      ) : null}
    </div>
  );
};
