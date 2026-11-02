// The reveal, the slam and the scoped claim: ONE continuous shot. Black; light leaks in through the four edges like through
// the joins of a closed box, blooms inward; a black iPhone rises as a silhouette whose outline catches the light; the field
// floods pure white, the phone wakes on the real navigator, the wordmark settles; then „საქართველოში | პირველად!" slams in
// while the phone steps back, and the phone comes forward again on the turn banner and the clean map.
import React from 'react';
import {Img, staticFile, useCurrentFrame} from 'remotion';
import {mtav} from '../lib/format';
import {textWidth} from '../lib/measure';
import {F} from '../tokens';
import {Iphone, SRC_H, SRC_W, type View} from './Iphone';
import {Lift, onScreen, type Rect, type Region} from './PhoneShots';
import {clamp, E, ev, fr, INK, INK2, INK3, lerp, PAPER, prog, shake, shot, sp} from './lib';

const W = 1080;
const H = 1920;
const PW = 570; // the phone's width at rest
const PCY = 830; // its centre at rest (bottom edge 1442: clear of the subtitle at 1477)

/** the edge light's falloff: (1 - d)^2, light rather than a linear ramp; it also keeps the band of the subtitle line (y 1500,
 * x 300..780) dark enough for the white line until the whiteout (a linear ramp put it on mid grey) */
const FALLOFF: [number, number][] = Array.from({length: 9}, (_, i) => [i / 8, (1 - i / 8) ** 2]);

const mixView = (a: View, b: View, t: number): View => ({x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), zoom: lerp(a.zoom, b.zoom, t)});

export const RevealSeq: React.FC = () => {
  const t = useCurrentFrame();
  const base = fr(shot('reveal').from);
  const L = (name: string) => fr(ev(name)) - base;
  const seams = L('seams');
  const white = L('whiteout');
  const on = L('screenOn');
  const wm = L('wordmark');
  const s1 = L('slam1');
  const s2 = L('slam2');
  const hair = L('hairline');
  const back = fr(shot('slam').to) - base - 6; // the phone comes forward in the breath after the slam
  const kart = L('kartulad');
  const glide = L('mapGlide');

  // ---- the light from the edges ----
  const seamK = prog(t, seams, 6);
  const bloom = E.inOut(prog(t, seams + 6, white - seams - 6)); // 0..1 until the whiteout
  const flood = prog(t, white, 3); // the black centre collapses
  const glowW = lerp(0, 560, bloom);
  const isWhite = t >= white + 3;

  // ---- the phone ----
  // the reveal's phone is a little smaller and lower (the wordmark settles above it), the slam's steps back and down, the
  // claim's comes forward to the film's resting size
  const W0 = 520;
  const CY0 = 905;
  const rise = E.out(prog(t, seams - 3, 56));
  const stepBack = sp(t, s1 - 4, 170, 22);
  const forward = sp(t, back, 150, 22);
  const w = lerp(lerp(W0, 420, stepBack), PW, forward);
  const cy = lerp(lerp(lerp(1950, CY0, rise), 1300, stepBack), PCY, forward);
  const rim = t < white ? clamp(bloom * 1.6) * 0.9 : clamp(1 - (t - white) / 6) * 0.9;
  const lit = prog(t, on, 7);
  // the view: the capture's map at 1.25, then the turn banner, then down over the clean map
  const vMap: View = {x: 0.5, y: 0.47, zoom: 1.25};
  const vBanner: View = {x: 0.5, y: 0.14, zoom: 1.15};
  const vMap2: View = {x: 0.5, y: 0.42, zoom: 1.6};
  let view = mixView(vMap, vBanner, E.inOut(prog(t, back + 4, 16)));
  view = mixView(view, vMap2, E.inOut(prog(t, glide, 18)));
  // the turn banner lifts out of the real screen, bigger, and sinks back before the glide over the map
  const BANNER: Region = {x0: 0.025, y0: 0.068, x1: 0.975, y1: 0.2};
  const liftK = sp(t, back + 14, 150, 20) * (1 - sp(t, glide - 8, 200, 24));
  const bw = 960;
  const bannerTo: Rect = {x: 540 - bw / 2, y: 300, w: bw, h: (bw * (BANNER.y1 - BANNER.y0) * SRC_H) / ((BANNER.x1 - BANNER.x0) * SRC_W)};
  const bandA = clamp(prog(t, kart, 8));
  const glint = t >= on + 3 && t <= on + 24 ? (t - on - 3) / 21 : -1;

  // ---- the wordmark ----
  const wmIn = sp(t, wm, 120, 20);
  const wmOut = sp(t, s1 - 4, 170, 22);
  const wmY = 252 + (1 - wmIn) * 18 - wmOut * 360;

  // ---- the headline ----
  const l1 = mtav('საქართველოში');
  const l2 = mtav('პირველად!');
  const kick = mtav('ქართული ხმით · ინტერნეტის გარეშე');
  const font = (size: number) => `700 ${size}px ${F.sans}`;
  let size = 150;
  const wide = Math.max(textWidth(l1, font(size)), textWidth(l2, font(size)));
  if (wide > 900) size = Math.floor((size * 900) / wide);
  const slamOf = (at: number) => {
    if (t < at) return {s: 1.36, o: 0, dx: 0};
    const q = clamp((t - at) / 6);
    return {s: lerp(1.36, 1, E.outExpo(q)), o: clamp((t - at) / 2), dx: shake(t, at + 4, 9, 9, at)};
  };
  const a1 = slamOf(s1);
  const a2 = slamOf(s2);
  const lift = E.in2(prog(t, back, 9));
  const headY = -lift * 140;
  const headO = 1 - lift;
  const kickK = Math.max(clamp((t - s1) / 3) * Math.exp(-Math.max(0, t - s1) / 4), clamp((t - s2) / 3) * Math.exp(-Math.max(0, t - s2) / 4));
  const cam = 1 + 0.03 * kickK + 0.012 * prog(t, white, 120);
  const hairK = E.out(prog(t, hair, 12));

  return (
    <div style={{position: 'absolute', inset: 0, background: isWhite ? PAPER : '#000', overflow: 'hidden'}}>
      {!isWhite ? (
        <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
          <defs>
            <linearGradient id="np-gl" x1="0" x2="1" y1="0" y2="0">
              {FALLOFF.map(([o, a]) => (
                <stop key={o} offset={o} stopColor="#fff" stopOpacity={a} />
              ))}
            </linearGradient>
            <linearGradient id="np-gt" x1="0" x2="0" y1="0" y2="1">
              {FALLOFF.map(([o, a]) => (
                <stop key={o} offset={o} stopColor="#fff" stopOpacity={a} />
              ))}
            </linearGradient>
          </defs>
          <rect width={W} height={H} fill="#000" />
          {glowW > 0 ? (
            <g opacity={0.25 + 0.75 * bloom}>
              <rect x={0} y={0} width={glowW} height={H} fill="url(#np-gl)" />
              <rect x={W - glowW} y={0} width={glowW} height={H} fill="url(#np-gl)" transform={`rotate(180 ${W - glowW / 2} ${H / 2})`} />
              <rect x={0} y={0} width={W} height={glowW * 1.25} fill="url(#np-gt)" />
              <rect x={0} y={H - glowW} width={W} height={glowW} fill="url(#np-gt)" transform={`rotate(180 ${W / 2} ${H - glowW / 2})`} />
            </g>
          ) : null}
          {/* the seams: 2 px of light on the four edges, opening from the middle of each edge */}
          {seamK > 0 ? (
            <g fill="#fff">
              <rect x={W / 2 - (W / 2) * seamK} y={0} width={W * seamK} height={2} />
              <rect x={W / 2 - (W / 2) * seamK} y={H - 2} width={W * seamK} height={2} />
              <rect x={0} y={H / 2 - (H / 2) * seamK} width={2} height={H * seamK} />
              <rect x={W - 2} y={H / 2 - (H / 2) * seamK} width={2} height={H * seamK} />
            </g>
          ) : null}
          {flood > 0 ? <rect width={W} height={H} fill="#fff" opacity={flood} /> : null}
        </svg>
      ) : null}
      <div style={{position: 'absolute', inset: 0, transform: `scale(${cam})`, transformOrigin: '540px 900px'}}>
        {/* the headline, its scoping kicker and the hairline */}
        {t >= s1 - 1 && headO > 0 ? (
          <div style={{position: 'absolute', inset: 0, transform: `translateY(${headY}px)`, opacity: headO}}>
            <div style={{position: 'absolute', left: 0, right: 0, top: 344, textAlign: 'center', fontFamily: F.mono, fontSize: 30, color: INK2, letterSpacing: '0.02em', opacity: clamp((t - s1) / 6)}}>{kick}</div>
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 412,
                textAlign: 'center',
                fontFamily: F.sans,
                fontWeight: 700,
                fontSize: size,
                lineHeight: 1,
                color: INK,
                whiteSpace: 'nowrap',
                opacity: a1.o,
                transform: `translateX(${a1.dx}px) scale(${a1.s})`,
                transformOrigin: '540px 70px',
              }}
            >
              {l1}
            </div>
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 412 + size * 1.1,
                textAlign: 'center',
                fontFamily: F.sans,
                fontWeight: 700,
                fontSize: size,
                lineHeight: 1,
                color: INK,
                whiteSpace: 'nowrap',
                opacity: a2.o,
                transform: `translateX(${a2.dx}px) scale(${a2.s})`,
                transformOrigin: '540px 70px',
              }}
            >
              {l2}
            </div>
            <div style={{position: 'absolute', left: 140, top: 412 + size * 2.32, width: 800 * hairK, height: 2, background: INK}} />
          </div>
        ) : null}
        {/* the wordmark settles in the pause after „ვინარი" */}
        {t >= wm && wmY > -120 ? (
          <Img src={staticFile('brand/wordmark.svg')} style={{position: 'absolute', left: 540 - 130, top: wmY, width: 260, height: (260 * 68) / 267, filter: 'brightness(0) invert(0.045)', opacity: wmIn}} />
        ) : null}
        <Iphone cx={540} cy={cy} w={w} src="17-nav-drive" on={lit} view={view} glint={glint} rim={rim} shadow={isWhite ? 1 : 0} />
        {t >= back ? <Lift src="17-nav-drive" r={BANNER} from={onScreen(BANNER, view)} to={bannerTo} k={liftK} radius={40} band={{y0: 0.132, y1: 0.187, x0: 0.21, x1: 0.74, a: bandA}} /> : null}
        {/* the map's credit, along the phone's left side, while a crop hides the screen's own */}
        {t >= back + 6 ? (
          <div
            style={{
              position: 'absolute',
              left: 540 - PW / 2 - 30,
              top: PCY + 600,
              transform: 'rotate(-90deg)',
              transformOrigin: '0 0',
              fontFamily: F.mono,
              fontSize: 18,
              color: INK3,
              whiteSpace: 'nowrap',
              opacity: clamp((t - back - 6) / 8),
            }}
          >
            © OpenMapTiles © OpenStreetMap contributors
          </div>
        ) : null}
      </div>
    </div>
  );
};
