import React from 'react';
import {useCurrentFrame} from 'remotion';
import {ease, lerp, prog, spr} from '../lib/anim';
import {capsLatin, mtav} from '../lib/format';
import {TXT} from '../lib/layer';
import {C, F, isLight, L, rgba, THEME} from '../tokens';
import type {SceneCtx} from '../types';
import {BrandMark, cueFrame, entrance, Haptic, lead, Sfx} from './common';

type P = {
  title: string; // bold first line, e.g. "შუქი დაგრჩა"
  body: string; // up to three lines, e.g. "გამვლელმა შენიშნა, რომ შუქები ანთია."
  time?: string; // top-right of the banner, e.g. "09:00"; default "ახლა"
  at?: number; // chunk where the banner drops in
  lock?: boolean; // draw a line-art lock screen with a big clock around the banner
  clock?: string; // lock screen clock, default "9:41"
  staging?: string; // "lock" / "float" (default: the `lock` prop), "desk" (the phone lying on a table), "stack" (a pile of banners)
  app?: string; // app name above the title, default "Vinari"
  chime?: boolean; // sound: true = the banner also plays its notification sound (two soft wooden notes). Off by default: the
  // phone's double buzz alone (a haptic) never claims a sound the real notification may not make (the app's 3-day and
  // 7-day reminders are silent: Vinari/Core/VNCalendar.swift tone())
};

// Lock screen phone (px, 1080 x 1920): 640 wide, visible down to L.graphicsBottom (stage 1380, frame
// 1440), where a clean horizontal line cuts it (the owner, 2026-09-27: no soft fade)
const PW = 640;
const PX = (1080 - PW) / 2;
const PTOP = 386;
const BEZ = 14;
const PR = 100;
const VIS = L.graphicsBottom - PTOP; // visible height, down to the clean cut over the subtitle band
const OVER = 80; // the device draws this far past the cut, so the tilt never lifts its foot above it

/** The banner itself: glass (dark on the black film, white on paper), hairline outline, the app mark,
 *  mono app name and time. It is a card of text: all of it is drawn in the text layer (lib/layer.ts),
 *  clean, and it covers the lock screen's clock as it drops past it. */
const Banner: React.FC<{p: P; k: number; sheen: number; breathe: number}> = ({p, k, sheen, breathe}) => (
  <div
    className={TXT}
    style={{
      position: 'relative',
      display: 'flex',
      gap: 20 * k,
      padding: `${22 * k}px ${26 * k}px ${24 * k}px ${22 * k}px`,
      borderRadius: 38 * k,
      background: `linear-gradient(180deg, ${C.glassTop}, ${C.glassBot})`,
      border: `1.5px solid ${rgba(C.ink, isLight() ? 0.08 : 0.16)}`,
      boxShadow: `0 ${26 * k}px ${70 * k}px ${rgba(C.shade, 0.6 * THEME.shadowK)}, inset 0 1px 0 ${rgba(isLight() ? C.sheen : C.ink, isLight() ? 0.9 : 0.1)}`,
      overflow: 'hidden',
    }}
  >
    <div
      style={{
        flex: 'none',
        width: 76 * k,
        height: 76 * k,
        borderRadius: 18 * k,
        // the app icon: black with the light mark on the dark film; on paper a white tile, ink mark
        background: C.iconTile,
        border: `1.5px solid ${rgba(C.ink, isLight() ? 0.12 : 0.22)}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <BrandMark kind="mark" width={42 * k} style={{opacity: 0.86 + 0.14 * breathe}} />
    </div>
    <div style={{flex: 1, minWidth: 0}}>
      <div style={{display: 'flex', justifyContent: 'space-between', fontFamily: F.mono, fontSize: 21 * k, letterSpacing: '0.06em', color: C.ink3, lineHeight: 1}}>
        <span>{mtav(capsLatin(p.app ?? 'Vinari'))}</span>
        <span>{mtav(p.time ?? 'ახლა')}</span>
      </div>
      <div style={{marginTop: 10 * k, fontFamily: F.sans, fontWeight: 600, fontSize: 32 * k, lineHeight: 1.18, color: C.ink}}>{mtav(p.title)}</div>
      <div
        style={{
          marginTop: 4 * k,
          fontFamily: F.sans,
          fontWeight: 400,
          fontSize: 29 * k,
          lineHeight: 1.3,
          color: rgba(C.ink, 0.78),
          display: '-webkit-box',
          WebkitLineClamp: 3, // three lines: two cut v3's body before its verb
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {mtav(p.body)}
      </div>
    </div>
    {/* one pass of light across the glass when it lands */}
    <div
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: '38%',
        left: `${lerp(-45, 115, sheen)}%`,
        background: `linear-gradient(100deg, transparent, ${rgba(C.ink, 0.07)} 45%, ${rgba(C.ink, 0.11)} 50%, ${rgba(C.ink, 0.07)} 55%, transparent)`,
        opacity: sheen > 0 && sheen < 1 ? 1 : 0,
      }}
    />
  </div>
);

// An iOS-style banner in our line-art language. With `lock` it lands on a hairline iPhone lock
// screen (dynamic island, padlock, big thin clock, slow contour rings rising behind); the
// phone gives one small haptic buzz when it lands. Without `lock` the banner floats larger in
// the centre of the frame and its outline ripples outward every 1.4 s.
export const Notification: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const base = lead(ctx);
  const at = Math.max(base + 12, p.at !== undefined ? cueFrame(ctx, p.at) : base + 20);
  const drop = spr(frame, at, 'enter');
  const landF = at + 9;
  const sheen = prog(frame, landF + 2, 26, ease.camera);
  const breathe = 0.5 + 0.5 * Math.sin(frame / 20);
  const buzzT = frame - landF;
  const buzz = buzzT >= 0 && buzzT < 10 ? 3.2 * Math.sin(buzzT * 2.7) * (1 - buzzT / 10) : 0;

  if (p.staging === 'desk') {
    // The phone lies face up on a table, seen from above at a slant. Its screen wakes as the banner lands, the
    // phone buzzes on the wood and rings of the buzz spread over the table's plane around it.
    const e = entrance(ctx);
    const outline = prog(frame, e, 20, ease.drawOn);
    const wake = prog(frame, at - 2, 8);
    const life = Math.min(1, Math.max(0, frame / Math.max(1, ctx.dur)));
    const rz = lerp(-16, -9, ease.camera(life));
    const W2 = 600;
    const H2 = 1240;
    const buzzRings = frame >= landF ? [0, 1, 2].map((k) => (frame - landF - k * 7) / 30).filter((q) => q >= 0 && q < 1) : [];
    return (
      <>
        <div style={{position: 'absolute', inset: 0, clipPath: `inset(${L.graphicsTop}px 0 ${1920 - L.graphicsBottom}px 0)`}}>
          <div style={{position: 'absolute', inset: 0, transform: `perspective(1900px) rotateX(30deg) rotateZ(${rz}deg) translateX(${buzz * 1.4}px)`, transformOrigin: '540px 860px'}}>
            <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
              {/* the table: a few long grain lines */}
              {[-420, -250, 300, 520, 700].map((y, i) => (
                <line key={i} x1={-400} x2={1480} y1={860 + y} y2={860 + y + 30} stroke={C.ink} strokeWidth={1} opacity={0.14 * outline} />
              ))}
              {buzzRings.map((q, i) => (
                <rect key={i} x={540 - W2 / 2 - 30 - 150 * q} y={860 - H2 / 2 - 30 - 150 * q} width={W2 + 60 + 300 * q} height={H2 + 60 + 300 * q} rx={110 + 150 * q} fill="none" stroke={C.ink} strokeWidth={2} opacity={0.4 * (1 - q)} />
              ))}
              <rect x={540 - W2 / 2} y={860 - H2 / 2} width={W2} height={H2} rx={96} fill={C.bg} stroke={C.ink} strokeOpacity={0.9} strokeWidth={2.2} strokeDasharray={2 * (W2 + H2)} strokeDashoffset={2 * (W2 + H2) * (1 - outline)} />
            </svg>
            <div
              style={{
                position: 'absolute',
                left: 540 - W2 / 2 + 14,
                top: 860 - H2 / 2 + 14,
                width: W2 - 28,
                height: H2 - 28,
                borderRadius: 84,
                overflow: 'hidden',
                background: `radial-gradient(ellipse 90% 70% at 50% 30%, ${C.screenGlow} 0%, ${C.screenEdge} 70%)`,
                opacity: 0.25 + 0.75 * wake,
              }}
            >
              <div style={{position: 'absolute', left: (W2 - 28) / 2 - 80, top: 18, width: 160, height: 46, borderRadius: 23, background: C.island}} />
              <div className={TXT} style={{position: 'absolute', top: 120, left: 0, right: 0, textAlign: 'center', fontFamily: F.sans, fontWeight: 350, fontSize: 150, lineHeight: 1, fontFeatureSettings: '"tnum" 1, "lnum" 1', color: C.ink, opacity: wake}}>
                {mtav(p.clock ?? '9:41')}
              </div>
              <div style={{position: 'absolute', left: 18, right: 18, top: 330 - (1 - drop) * 200, opacity: Math.min(1, drop * 1.6)}}>
                <Banner p={p} k={1.05} sheen={sheen} breathe={breathe} />
              </div>
            </div>
          </div>
        </div>
        <Sfx name="asmr-screen" at={at} volume={0.3} /* event: the screen wakes with the banner */ />
        {p.chime ? <Sfx name="asmr-notif" at={at} volume={0.5} /* event: the notification's own sound (opt-in) */ /> : null}
        <Haptic kind="success" at={landF} volume={0.54} /* event: the phone buzzes on the table */ />
      </>
    );
  }
  if (p.staging === 'stack') {
    // A pile of earlier banners (blank cards, no words) waits in the middle; the new one drops onto the top, the
    // pile gives way under it, and the stack fans out a little over the scene.
    const e = entrance(ctx);
    const k = 1.24;
    const w = 780;
    const top = 730; // the pile centres on the content box
    const give = spr(frame, landF - 2, 'land');
    const life = Math.min(1, Math.max(0, frame / Math.max(1, ctx.dur)));
    const fan = ease.camera(life);
    const ghosts = [1, 2, 3].map((i) => ({i, y: top + 40 + i * (34 + 14 * fan) + give * 26 * (i === 1 ? 1 : 0.6), s: 1 - i * 0.05, o: (0.9 - i * 0.22) * prog(frame, e + i * 3, 12)}));
    return (
      <>
        {ghosts.reverse().map((g) => (
          <div key={g.i} style={{position: 'absolute', left: (1080 - w) / 2, width: w, top: g.y, height: 230, transform: `scale(${g.s})`, transformOrigin: '50% 100%', opacity: g.o, borderRadius: 38 * k, background: `linear-gradient(180deg, ${C.glassTop}, ${C.glassBot})`, border: `1.5px solid ${rgba(C.ink, isLight() ? 0.1 : 0.16)}`, boxShadow: `0 20px 50px ${rgba(C.shade, 0.5 * THEME.shadowK)}`}}>
            <div style={{position: 'absolute', left: 40, top: 36, width: 86, height: 86, borderRadius: 22, border: `1.5px solid ${rgba(C.ink, 0.18)}`}} />
            <div style={{position: 'absolute', left: 156, top: 50, width: 300, height: 16, borderRadius: 8, background: rgba(C.ink, 0.16)}} />
            <div style={{position: 'absolute', left: 156, top: 90, width: 440, height: 14, borderRadius: 7, background: rgba(C.ink, 0.1)}} />
          </div>
        ))}
        <div style={{position: 'absolute', left: (1080 - w) / 2 + buzz, width: w, top: top - (1 - drop) * 260 + give * 6, opacity: Math.min(1, drop * 1.6), filter: drop < 0.9 ? `blur(${(1 - drop) * 6}px)` : undefined}}>
          <Banner p={p} k={k} sheen={sheen} breathe={breathe} />
        </div>
        <Sfx name="asmr-paper" at={Math.max(0, base + 2)} volume={0.2} /* event: the pile settles */ />
        <Sfx name="asmr-screen" at={at} volume={0.3} /* event: the banner arrives */ />
        {p.chime ? <Sfx name="asmr-notif" at={at} volume={0.5} /* event: the notification's own sound (opt-in) */ /> : null}
        <Haptic kind="success" at={landF} volume={0.54} /* event: the phone buzzes as it lands on the pile */ />
      </>
    );
  }
  // "lock" / "float" as a staging choose the look the lock prop chooses otherwise
  if (!(p.staging === 'lock' || (p.lock && p.staging !== 'float'))) {
    const k = 1.32;
    const w = 780;
    const top = 700; // the content box's centre band (stage 380..1280)
    // the banner's own outline breathes outward every 1.4 s: quiet, like a held notification
    const rip = frame > landF ? ((frame - landF) % 42) / 42 : -1;
    const e = rip * 46;
    return (
      <>
        <div
          style={{
            position: 'absolute',
            left: (1080 - w) / 2 + buzz,
            width: w,
            top: top - (1 - drop) * 180,
            opacity: Math.min(1, drop * 1.6),
            filter: drop < 0.9 ? `blur(${(1 - drop) * 6}px)` : undefined,
          }}
        >
          {rip >= 0 ? (
            <div style={{position: 'absolute', inset: -e, borderRadius: 38 * k + e, border: `1.5px solid ${rgba(C.ink, 0.26 * Math.pow(1 - rip, 1.5))}`}} />
          ) : null}
          <Banner p={p} k={k} sheen={sheen} breathe={breathe} />
        </div>
        <Sfx name="asmr-screen" at={at} volume={0.3} /* event: the banner arrives */ />
        {p.chime ? <Sfx name="asmr-notif" at={at} volume={0.5} /* event: the notification's own sound (opt-in) */ /> : null}
        <Haptic kind="success" at={landF} volume={0.54} /* event: the phone buzzes as it lands (the banner's shake) */ />
      </>
    );
  }

  // the lock screen enters before the cut, so the cut lands on it (sounds stay on base)
  const e = entrance(ctx);
  const outline = prog(frame, e, 20, ease.drawOn);
  const screenIn = prog(frame, e + 4, 14);
  const clockIn = spr(frame, e + 6);
  const tilt = lerp(-6, -2.5, ease.camera(Math.min(1, Math.max(0, frame / Math.max(1, ctx.dur)))));
  const per = 2 * PW + 2 * (VIS + 200);
  const sx = PX + BEZ;
  const sw = PW - 2 * BEZ;
  const bannerTop = 330; // inside the screen
  // contour rings rising behind the clock: continuous, seamless
  const ringGap = 74;
  const ringOff = (frame * 0.55) % ringGap;
  return (
    <>
      <div style={{position: 'absolute', inset: 0, clipPath: `inset(0 0 ${1920 - L.graphicsBottom}px 0)`}}>
      <div style={{position: 'absolute', inset: 0, transform: `perspective(2600px) rotateY(${tilt}deg) rotateX(3deg) translateX(${buzz}px)`, transformOrigin: '50% 40%'}}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <rect x={PX} y={PTOP} width={PW} height={VIS + 200} rx={PR} fill="none" stroke={C.ink} strokeOpacity={0.9} strokeWidth={2} strokeDasharray={per} strokeDashoffset={per * (1 - outline)} />
          <rect x={sx} y={PTOP + BEZ} width={sw} height={VIS + 200} rx={PR - BEZ} fill="none" stroke={C.ink} strokeOpacity={0.18 * screenIn} strokeWidth={1.2} />
          {/* side buttons */}
          <line x1={PX - 3} x2={PX - 3} y1={PTOP + 190} y2={PTOP + 250} stroke={C.ink} strokeOpacity={0.6 * outline} strokeWidth={3} strokeLinecap="round" />
          <line x1={PX - 3} x2={PX - 3} y1={PTOP + 280} y2={PTOP + 380} stroke={C.ink} strokeOpacity={0.6 * outline} strokeWidth={3} strokeLinecap="round" />
          <line x1={PX + PW + 3} x2={PX + PW + 3} y1={PTOP + 250} y2={PTOP + 380} stroke={C.ink} strokeOpacity={0.6 * outline} strokeWidth={3} strokeLinecap="round" />
        </svg>
        {/* the screen, clipped: wallpaper rings, island, padlock, clock, banner */}
        <div
          style={{
            position: 'absolute',
            left: sx,
            top: PTOP + BEZ,
            width: sw,
            height: VIS + OVER,
            borderTopLeftRadius: PR - BEZ,
            borderTopRightRadius: PR - BEZ,
            overflow: 'hidden',
            opacity: screenIn,
            background: `radial-gradient(ellipse 90% 70% at 50% 30%, ${C.screenGlow} 0%, ${C.screenEdge} 70%)`,
          }}
        >
          <svg width={sw} height={VIS + OVER} style={{position: 'absolute', inset: 0}}>
            {Array.from({length: 12}, (_, i) => {
              const r = 120 + i * ringGap + ringOff;
              const o = Math.max(0, 1 - r / 980);
              return <ellipse key={i} cx={sw / 2} cy={VIS + 60} rx={r * 1.08} ry={r * 0.92} fill="none" stroke={C.ink} strokeWidth={1.1} opacity={0.17 * o} />;
            })}
            <rect x={sw / 2 - 84} y={18} width={168} height={48} rx={24} fill={C.island} stroke={C.ink} strokeOpacity={0.22} strokeWidth={1.2} />
            <g transform={`translate(${sw / 2} 112)`} fill="none" stroke={C.ink2} strokeWidth={2.2} opacity={clockIn}>
              <rect x={-12} y={-2} width={24} height={19} rx={4} />
              <path d="M -7 -2 V -8 A 7 7 0 0 1 7 -8 V -2" />
            </g>
          </svg>
          <div
            className={TXT}
            style={{
              position: 'absolute',
              top: 138,
              left: 0,
              right: 0,
              textAlign: 'center',
              fontFamily: F.sans,
              fontWeight: 350,
              fontSize: 168,
              lineHeight: 1,
              letterSpacing: '-0.01em',
              fontFeatureSettings: '"tnum" 1, "lnum" 1',
              color: C.ink,
              opacity: clockIn,
              transform: `translateY(${(1 - clockIn) * 16}px)`,
            }}
          >
            {mtav(p.clock ?? '9:41')}
          </div>
          <div
            style={{
              position: 'absolute',
              left: 16,
              right: 16,
              top: bannerTop - (1 - drop) * 300,
              opacity: Math.min(1, drop * 1.6),
              filter: drop < 0.9 ? `blur(${(1 - drop) * 5}px)` : undefined,
            }}
          >
            <Banner p={p} k={1} sheen={sheen} breathe={breathe} />
          </div>
        </div>
      </div>
      </div>
      <Sfx name="asmr-screen" at={base + 4} volume={0.34} /* event: the lock screen wakes */ />
      {p.chime ? <Sfx name="asmr-notif" at={at} volume={0.5} /* event: the notification's own sound (opt-in) */ /> : null}
      <Haptic kind="success" at={landF} volume={0.54} /* event: the phone buzzes as the banner lands (the shake) */ />
    </>
  );
};
