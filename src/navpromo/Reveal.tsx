// The reveal, the slam and the scoped claim: ONE continuous shot with the studio's real 3D iPhone (phones3d.tsx). Black:
// a true black beat after the cut (the owner's pause), then half a second in a faint rim of light catches the titanium of
// a black iPhone far off and turned almost side-on, and it rises slowly through the dark, swinging round to the viewer,
// while „აი, ზუსტად ამიტომ" is said; light leaks in through the four edges like through the joins of a closed box and
// blooms inward; the screen wakes dimly; on the ink line's first frame the bloom breaks into white, the whole frame at
// once (a clean cut, never a wipe under the white line), while the studio's light turns from the dark room to the paper
// one; the screen lights with a glint, the wordmark settles; then
// „საქართველოში | პირველად!" slams in while the phone steps back below the hairline, and the phone comes forward again,
// the turn banner lifting out of the real screen as a card (the cobalt band on „მარჯვნივ მოუხვიე" at „ქართულად"), then
// sinking back while the phone turns across the map. The whole phone and the whole screen are always in the frame, and
// its foot never enters the subtitle band (y 1440..1580).
import React from 'react';
import {Img, staticFile, useCurrentFrame} from 'remotion';
import {mtav} from '../lib/format';
import {textWidth} from '../lib/measure';
import {C, F} from '../tokens';
import {atFoot, bodyBox, cardRect, float, Lift, Phone3, zoomAbout, type Region} from './phones3d';
import {clamp, E, ev, fr, lerp, prog, shake, shot, sp} from './lib';

const W = 1080;
const H = 1920;
const SRC = '17-nav-drive';

/** the edge light's falloff: (1 - d)^2 */
const FALLOFF: [number, number][] = Array.from({length: 9}, (_, i) => [i / 8, (1 - i / 8) ** 2]);

/** the turn banner on the capture (measured: x 30..1049, y 162..463 of 1080 x 2346, its corners 85 px round) */
const BANNER: Region = {x0: 30 / 1080, y0: 162 / 2346, x1: 1050 / 1080, y1: 464 / 2346};

export const RevealSeq: React.FC = () => {
  const t = useCurrentFrame();
  const base = fr(shot('reveal').from);
  const L = (name: string) => fr(ev(name)) - base;
  const seams = L('seams');
  const rimAt = L('rim');
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
  const bloom = E.inOut(prog(t, seams + 6, white - seams - 6));
  const glowW = lerp(0, 560, bloom);
  const look = prog(t, white, 6); // the dark studio crossfades into the paper one over 6 frames, done before the screen lights
  // the bloom carries the white line to its last frame (it is near full by then); the white takes the whole frame at once
  // on the ink line's first frame (2 frames before the hit), so the white line is never on white and no edge wipes down
  const inkAt = white - 2;
  const flood = t >= inkAt ? 1 : 0;
  const isWhite = t >= white + 3;

  // ---- the phone's pose ----
  // a true black beat right after the cut (the owner's pause), then the phone's titanium edge catches a faint rim of light
  // and it rises slowly through the dark while „აი, ზუსტად ამიტომ" is said, so the black still feels like a pause
  const BLACK = 15;
  const rise = E.sine(prog(t, BLACK, 80));
  const settle = E.inOut(prog(t, on, 50));
  let w = lerp(250, 462, rise) * (1 + 0.04 * settle);
  let yaw = lerp(66, 13, rise) - 3 * settle;
  let pitch = lerp(14, 5, rise);
  let roll = lerp(-5, -1.2, rise);
  let foot = 1416;
  // the slam: the phone steps back, whole, between the hairline and the subtitle band
  const stepBack = sp(t, s1 - 4, 170, 22);
  w = lerp(w, 325, stepBack);
  yaw = lerp(yaw, 15, stepBack);
  pitch = lerp(pitch, 6, stepBack);
  roll = lerp(roll, -1, stepBack);
  foot = lerp(foot, 1424, stepBack);
  // the claim: forward to the film's resting size
  const fwd = sp(t, back + 1, 150, 22);
  w = lerp(w, 500, fwd);
  yaw = lerp(yaw, 5, fwd);
  pitch = lerp(pitch, 3, fwd);
  roll = lerp(roll, 0, fwd);
  foot = lerp(foot, 1426, fwd);
  // the banner lifts out (the phone recedes a little and turns to face the viewer), then sinks back for the glide
  const liftK = sp(t, back + 14, 150, 20) * (1 - sp(t, glide - 8, 200, 24));
  const read = clamp(liftK);
  w *= 1 - 0.04 * read;
  yaw *= 1 - 0.6 * read;
  pitch *= 1 - 0.6 * read;
  const across = E.inOut(prog(t, glide, 34));
  yaw -= 10 * across;
  w *= 1 + 0.03 * across;
  const fl = float(t);
  let pose = atFoot({x: 540, w, yaw, pitch: pitch + fl.pitch * rise, roll: roll + fl.roll * rise}, foot);
  pose = {...pose, y: pose.y + fl.bob * rise};
  // the slams kick the camera (the phone through the lens, the text by CSS: one move about the same point)
  const kickK = Math.max(clamp((t - s1) / 3) * Math.exp(-Math.max(0, t - s1) / 4), clamp((t - s2) / 3) * Math.exp(-Math.max(0, t - s2) / 4));
  const cam = 1 + 0.03 * kickK;
  pose = zoomAbout(pose, cam, 540, 1000);

  // ---- the light on the frame, the screen ----
  const faint = 0.32 * E.out2(prog(t, BLACK, 24)); // the first rim: a sliver of light along the titanium
  const rimDark = lerp(faint, 1.25, E.out(prog(t, seams - 4, 26))) + 0.45 * bloom;
  const rim = lerp(rimDark, 1, look);
  const lum = t < on ? 0.28 * E.out(prog(t, rimAt, 10)) : lerp(0.28, 1, E.out(prog(t, on, 8)));
  const gk = (t - on) / 24;
  const sheen: [number, number, number] | null = gk >= 0 && gk <= 1 ? [lerp(-0.4, 2.3, E.inOut(gk)), 0.2, 0.22 * Math.sin(Math.PI * gk)] : null;
  const body = bodyBox(pose);
  const backlight = Math.max(0.08 * E.sine(prog(t, BLACK + 6, 30)), 0.42 * E.out(prog(t, seams - 2, 34))) * (1 - prog(t, white - 4, 6));
  const bandA = clamp(prog(t, kart, 8));

  // ---- the wordmark ----
  const wmIn = sp(t, wm, 120, 20);
  const wmOut = E.out(prog(t, s1 - 4, 5)); // gone before the kicker comes up in its place
  const wmY = 236 + (1 - wmIn) * 18 - wmOut * 70;

  // ---- the headline ----
  const l1 = mtav('საქართველოში');
  const l2 = mtav('პირველად!');
  const kick = mtav('ქართული ხმით · ინტერნეტის გარეშე');
  const font = (size: number) => `700 ${size}px ${F.sans}`;
  let size = 150;
  const wide = Math.max(textWidth(l1, font(size)), textWidth(l2, font(size)));
  if (wide > 900) size = Math.floor((size * 900) / wide);
  const TOP = 318;
  const slamOf = (at: number) => {
    if (t < at) return {s: 1.36, o: 0, dx: 0};
    const q = clamp((t - at) / 6);
    return {s: lerp(1.36, 1, E.outExpo(q)), o: clamp((t - at) / 2), dx: shake(t, at + 4, 9, 9, at)};
  };
  const a1 = slamOf(s1);
  const a2 = slamOf(s2);
  // the headline leaves upward like a camera tilting down onto the phone, clear of it before the phone grows into its place
  const lift = E.inOut(prog(t, back - 3, 14));
  const headY = -lift * 560;
  const headO = 1 - E.out(prog(t, back - 2, 7));
  const hairK = E.out(prog(t, hair, 12));

  return (
    <div style={{position: 'absolute', inset: 0, background: isWhite ? C.surface : '#000', overflow: 'hidden'}}>
      {!isWhite ? (
        <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
          <defs>
            <linearGradient id="np-gl" x1="0" x2="1" y1="0" y2="0">
              {FALLOFF.map(([o, a]) => (
                <stop key={o} offset={o} stopColor={C.surface} stopOpacity={a} />
              ))}
            </linearGradient>
            <linearGradient id="np-gt" x1="0" x2="0" y1="0" y2="1">
              {FALLOFF.map(([o, a]) => (
                <stop key={o} offset={o} stopColor={C.surface} stopOpacity={a} />
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
          {seamK > 0 ? (
            <g fill={C.surface}>
              <rect x={W / 2 - (W / 2) * seamK} y={0} width={W * seamK} height={2} />
              <rect x={W / 2 - (W / 2) * seamK} y={H - 2} width={W * seamK} height={2} />
              <rect x={0} y={H / 2 - (H / 2) * seamK} width={2} height={H * seamK} />
              <rect x={W - 2} y={H / 2 - (H / 2) * seamK} width={2} height={H * seamK} />
            </g>
          ) : null}
          {flood > 0 ? <rect width={W} height={H} fill={C.surface} opacity={flood} /> : null}
        </svg>
      ) : null}
      {/* the headline, its scoping kicker and the hairline (the camera's kick: a CSS scale about the phone's pivot) */}
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
          <div style={{position: 'absolute', left: 140, top: TOP + size * 2.32, width: 800 * hairK, height: 2, background: C.ink}} />
        </div>
      ) : null}
      {/* the wordmark settles in the pause after „ვინარი" */}
      {t >= wm && wmOut < 1 ? (
        <Img
          src={staticFile('brand/wordmark.svg')}
          style={{position: 'absolute', left: 540 - 130, top: wmY, width: 260, height: (260 * 68) / 267, filter: 'brightness(0) invert(0.045)', opacity: wmIn * (1 - wmOut)}}
        />
      ) : null}
      {/* the light behind the black phone: a soft halo round its outline while it rises out of the dark */}
      {backlight > 0.002 ? (
        <div
          style={{
            position: 'absolute',
            left: body.x + body.w * 0.06,
            top: body.y + body.h * 0.04,
            width: body.w * 0.88,
            height: body.h * 0.92,
            borderRadius: body.w * 0.16,
            background: C.surface,
            filter: 'blur(46px)',
            opacity: backlight,
          }}
        />
      ) : null}
      <Phone3 src={SRC} pose={pose} on={lum} look={look} rim={rim} sheen={sheen} veil={0.3 * read} shadow={1} />
      {t >= back + 10 ? (
        <Lift
          src={SRC}
          r={BANNER}
          pose={pose}
          to={cardRect(BANNER, 940, 70, 290)}
          k={liftK}
          show={t < glide ? 1 : clamp(liftK * 8)}
          radius={(85 * 940) / 1020}
          band={{x0: 0.21, y0: 0.132, x1: 0.74, y1: 0.187, a: bandA}}
          fog={0.3 * read * (1 - read)}
        />
      ) : null}
    </div>
  );
};
