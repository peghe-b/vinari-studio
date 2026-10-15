// 9 the reveal (the QR promo's, re-cut for diagnostics; the owner, 2026-10-15: "open it like the QR promo, with 'first in
// Georgia'"): black after the bin; a faint rim of light catches the titanium of a black iPhone far off and turned almost
// side-on, and it rises slowly through the dark, swinging round to the viewer; its screen wakes dimly on the app's home.
// On „საქართველოში" the white opens OUT OF THE PHONE (its screen's light grows past the frame) and „საქართველოში /
// პირველად" slams in big, word by word, while the phone steps back under it. On „მანქანის დიაგნოსტიკა და OBD სკანერი,
// ქართულად." the big line rises and settles as the small kicker at the top, and the title slams in under it, word by word:
// „დიაგნოსტიკა" / „OBD სკანერი" / „ქართულად". Meanwhile the screen goes home -> the menu -> „დიაგნოსტიკა" is tapped and
// the OBD scanner's sheet slides up. NO line under the title (the owner: no hairline, no pen). The whole phone is always in
// the frame, its foot above the subtitle band.
import React from 'react';
import {Img, staticFile} from 'remotion';
import {mtav} from '../lib/format';
import {textWidth} from '../lib/measure';
import {C, F} from '../tokens';
import {atFoot, bodyBox, float, Phone3, project, projectBox, ScreenLayer, zoomAbout} from './kit/phone3d';
import {clamp, E, lerp, prog, shake, sp} from './lib';
import {useShot} from './Act1';

const HOME = '23-home-104';
const MENU = '25-menu-104';
const HUB = '21-obd-hub';
const FOOT = 1392;

export const Reveal: React.FC = () => {
  const {t, len, L, Ls} = useShot('reveal');
  const rimAt = L('rim');
  const wake = L('wake');
  const white = L('whiteout');
  const s1 = L('slam1');
  const s2 = L('slam2');
  const n1 = L('n1');
  const title = Ls('title');
  const menuAt = L('menuTap');
  const diagAt = L('diagTap');
  const sheetAt = L('sheet');

  // ---- the two headlines' sizes ----
  const big1 = mtav('საქართველოში');
  const big2 = mtav('პირველად');
  const font = (sz: number) => `700 ${sz}px ${F.sans}`;
  let size = 150;
  const wide = Math.max(textWidth(big1, font(size)), textWidth(big2, font(size)));
  if (wide > 900) size = Math.floor((size * 900) / wide);
  const T1 = mtav('დიაგნოსტიკა');
  const T2a = 'OBD';
  const T2b = mtav('სკანერი');
  const T3 = mtav('ქართულად');
  let ts = 128;
  const tw = Math.max(textWidth(T1, font(ts)), textWidth(`${T2a} ${T2b}`, font(ts)), textWidth(T3, font(ts)));
  if (tw > 900) ts = Math.floor((ts * 900) / tw);
  const TOP = 318;
  const TITLE_TOP = 330;
  const titleBottom = TITLE_TOP + ts * 1.06 * 3;
  const ratio = bodyBox({x: 540, y: 960, w: 100, yaw: 14, pitch: 6, roll: -1}).h / 100;
  const stepW = Math.min(420, (FOOT - TOP - size * 2.25 - 40) / ratio);
  const titleW = Math.min(stepW, (FOOT - titleBottom - 40) / ratio);

  // ---- the phone's pose ----
  const rise = E.sine(prog(t, rimAt - 2, white - rimAt + 2));
  let w = lerp(240, 430, rise);
  let yaw = lerp(66, 12, rise);
  let pitch = lerp(14, 5, rise);
  let roll = lerp(-5, -1.2, rise);
  let foot = lerp(1340, FOOT, rise);
  const stepBack = sp(t, s1 - 3, 170, 22);
  w = lerp(w, stepW, stepBack);
  yaw = lerp(yaw, 14, stepBack);
  pitch = lerp(pitch, 6, stepBack);
  roll = lerp(roll, -1, stepBack);
  foot = lerp(foot, FOOT, stepBack);
  // the title: the phone steps back a little more, and turns to face the viewer as the scanner opens
  const toTitle = sp(t, n1 - 4, 150, 22);
  w = lerp(w, titleW, toTitle);
  const face = E.inOut(prog(t, sheetAt, 14));
  yaw = lerp(yaw, 4, face);
  pitch = lerp(pitch, 2, face);
  roll = lerp(roll, 0, face);
  const fl = float(t);
  let pose = atFoot({x: 540, w, yaw, pitch: pitch + fl.pitch * rise, roll: roll + fl.roll * rise}, foot);
  pose = {...pose, y: pose.y + fl.bob * rise};
  const kickK = Math.max(...[s1, s2, ...title].map((s) => clamp((t - s) / 3) * Math.exp(-Math.max(0, t - s) / 4)));
  const cam = 1 + 0.025 * kickK;
  pose = zoomAbout(pose, cam, 540, 1000);

  // ---- light ----
  const faint = 0.6 * E.out2(prog(t, rimAt, 24));
  const rimDark = lerp(faint, 1.2, E.out(prog(t, wake - 6, 30)));
  const look = E.out(prog(t, white, 6));
  const rim = lerp(rimDark, 1, look);
  const lum = t < white ? 0.85 * E.out(prog(t, wake, 12)) : lerp(0.85, 1, E.out(prog(t, white, 8)));
  const gk = (t - white - 4) / 24;
  const sheen: [number, number, number] | null = gk >= 0 && gk <= 1 ? [lerp(-0.4, 2.3, E.inOut(gk)), 0.2, 0.22 * Math.sin(Math.PI * gk)] : null;
  const body = bodyBox(pose);
  const backlight = 0.55 * E.sine(prog(t, wake - 6, 24)) * (1 - E.sine(prog(t, white + 10, 16)));
  const scr = projectBox(pose, {x0: 0, y0: 0, x1: 1, y1: 1});
  const BLOOM = 26;
  const burst = E.sine(prog(t, white, BLOOM));
  const isWhite = t >= white + BLOOM;

  // ---- the screens: home, the menu (on the tap), the scanner's sheet sliding up ----
  const MENU_FADE = 7;
  const SHEET = 12;
  const menuK = E.out(prog(t, menuAt + 2, MENU_FADE));
  const sheetK = E.inOut(prog(t, sheetAt, SHEET));
  const screen = t < menuAt + 2 + MENU_FADE ? HOME : t < sheetAt + SHEET ? MENU : HUB;
  const menuP = project(pose, 948 / 1080, 2132 / 2346);
  const diagP = project(pose, 197 / 1080, 1650 / 2346);
  const ring = (p: {x: number; y: number}, at: number) => {
    const k = (t - at) / 16;
    return k > 0 && k < 1 ? (
      <div style={{position: 'absolute', left: p.x - 34, top: p.y - 34, width: 68, height: 68, borderRadius: 34, border: '5px solid rgba(255,255,255,0.95)', boxShadow: '0 0 0 3px rgba(11,11,11,0.55)', opacity: 1 - k, transform: `scale(${0.5 + 0.7 * E.out(k)})`}} />
    ) : null;
  };

  // ---- the headlines ----
  const slamOf = (at: number) => {
    if (t < at) return {s: 1.36, o: 0, dx: 0};
    const q = clamp((t - at) / 6);
    return {s: lerp(1.36, 1, E.outExpo(q)), o: clamp((t - at) / 2), dx: shake(t, at + 4, 9, 9, at)};
  };
  const a1 = slamOf(s1);
  const a2 = slamOf(s2);
  // the big line leaves up and shrinks as the kicker settles in its place
  const up = E.in2(prog(t, n1 - 9, 8));
  const kickIn = E.out(prog(t, n1 + 1, 9));
  const tA = slamOf(title[0]);
  const tB1 = slamOf(title[1]);
  const tB2 = slamOf(title[2]);
  const tC = slamOf(title[3]);
  const word = (text: string, a: {s: number; o: number; dx: number}, left: number, top: number, sz: number, color: string, key: string) => (
    <div key={key} style={{position: 'absolute', left, top, whiteSpace: 'nowrap', fontFamily: F.sans, fontWeight: 700, fontSize: sz, lineHeight: 1, color, opacity: a.o, transform: `translateX(${a.dx}px) scale(${a.s})`, transformOrigin: '50% 60%'}}>
      {text}
    </div>
  );
  const centred = (text: string, sz: number) => 540 - textWidth(text, font(sz)) / 2;
  const lineB = `${T2a} ${T2b}`;
  const bx = centred(lineB, ts);
  const bwA = textWidth(`${T2a} `, font(ts));

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
      {/* phase 1: „საქართველოში / პირველად", big */}
      {t >= s1 - 1 && up < 1 ? (
        <div style={{position: 'absolute', inset: 0, transform: `translateY(${-up * 70}px) scale(${lerp(1, 0.86, up)})`, transformOrigin: '540px 300px', opacity: 1 - up}}>
          {[
            {text: big1, a: a1, top: TOP},
            {text: big2, a: a2, top: TOP + size * 1.1},
          ].map((l) => (
            <div
              key={l.top}
              style={{position: 'absolute', left: 0, right: 0, top: l.top, textAlign: 'center', fontFamily: F.sans, fontWeight: 700, fontSize: size, lineHeight: 1, color: C.ink, whiteSpace: 'nowrap', opacity: l.a.o, transform: `translateX(${l.a.dx}px) scale(${l.a.s})`, transformOrigin: '540px 70px'}}
            >
              {l.text}
            </div>
          ))}
        </div>
      ) : null}
      {/* phase 2: the kicker and the title, word by word */}
      {kickIn > 0 ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: 254 + (1 - kickIn) * 14, textAlign: 'center', fontFamily: F.sans, fontWeight: 600, fontSize: 40, letterSpacing: '0.04em', color: C.ink2, opacity: kickIn}}>
          {mtav('საქართველოში პირველად')}
        </div>
      ) : null}
      {t >= title[0] - 1 ? (
        <div style={{position: 'absolute', inset: 0, transform: `scale(${cam})`, transformOrigin: '540px 1000px'}}>
          {word(T1, tA, centred(T1, ts), TITLE_TOP, ts, C.ink, 't1')}
          {word(T2a, tB1, bx, TITLE_TOP + ts * 1.06, ts, C.ink, 't2a')}
          {word(T2b, tB2, bx + bwA, TITLE_TOP + ts * 1.06, ts, C.ink, 't2b')}
          {word(T3, tC, centred(T3, ts), TITLE_TOP + ts * 2.12, ts, C.accA, 't3')}
        </div>
      ) : null}
      {backlight > 0.002 ? (
        <div style={{position: 'absolute', left: body.x + body.w * 0.06, top: body.y + body.h * 0.04, width: body.w * 0.88, height: body.h * 0.92, borderRadius: body.w * 0.16, background: C.surface, filter: 'blur(46px)', opacity: backlight}} />
      ) : null}
      <Phone3 key={screen} src={screen} pose={pose} on={lum} look={look} rim={rim} sheen={sheen} shadow={1} />
      {menuK > 0 && menuK < 1 ? (
        <ScreenLayer pose={pose}>
          <Img src={staticFile(`screens/${MENU}.jpg`)} style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 2346, opacity: menuK}} />
        </ScreenLayer>
      ) : null}
      {sheetK > 0 && sheetK < 1 ? (
        <ScreenLayer pose={pose}>
          <Img src={staticFile(`screens/${MENU}.jpg`)} style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 2346}} />
          <div style={{position: 'absolute', inset: 0, background: '#000', opacity: 0.2 * sheetK}} />
          <Img src={staticFile(`screens/${HUB}.jpg`)} style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 2346, transform: `translateY(${(1 - sheetK) * 2346}px)`, boxShadow: '0 -24px 60px rgba(0,0,0,0.18)'}} />
        </ScreenLayer>
      ) : null}
      {ring(menuP, menuAt)}
      {ring(diagP, diagAt)}
    </div>
  );
};
