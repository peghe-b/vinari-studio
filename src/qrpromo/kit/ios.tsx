// The phone's own UI for the QR promo, drawn in capture px (1080 x 2346, the real screens' size) and laid on the 3D phone
// by ScreenLayer: the lock screen (clock, date, status bar), notification banners, the incoming call, the camera's
// viewfinder with the yellow QR frame and its link chip, the VINARI push. iOS's own look, refined; the phone's words stay
// Mkhedruli (they are the phone's, not the film's).
import React from 'react';
import {Img, staticFile} from 'remotion';
import {F} from '../../tokens';
import {clamp, E, lerp} from '../lib';

export const CW = 1080;
export const CH = 2346;

// ---- glyphs ------------------------------------------------------------------------------------------------------------
export const PhoneGlyph: React.FC<{size: number; color: string; down?: boolean}> = ({size, color, down}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{display: 'block', transform: down ? 'rotate(135deg)' : undefined}}>
    <path
      d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z"
      fill={color}
    />
  </svg>
);
export const BubbleGlyph: React.FC<{size: number; color: string}> = ({size, color}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{display: 'block'}}>
    <path d="M12 3.5c5 0 9 3.3 9 7.4s-4 7.4-9 7.4c-.9 0-1.8-.1-2.6-.3L5 20l1.1-3.6C4.2 15 3 13.1 3 10.9 3 6.8 7 3.5 12 3.5z" fill={color} />
  </svg>
);

/** an app icon: a rounded square with a glyph (Messages / Phone green, VINARI white with the mark) */
export const AppIcon: React.FC<{kind: 'msg' | 'phone' | 'vinari'; size: number}> = ({kind, size}) => {
  const r = size * 0.23;
  if (kind === 'vinari')
    return (
      <div style={{width: size, height: size, borderRadius: r, background: '#FFFFFF', boxShadow: 'inset 0 0 0 1.5px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <Img src={staticFile('brand/mark.svg')} style={{width: size * 0.56, height: size * 0.56, filter: 'brightness(0)'}} />
      </div>
    );
  return (
    <div style={{width: size, height: size, borderRadius: r, background: 'linear-gradient(180deg, #67E27A 0%, #2DBE4A 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      {kind === 'msg' ? <BubbleGlyph size={size * 0.68} color="#FFFFFF" /> : <PhoneGlyph size={size * 0.56} color="#FFFFFF" />}
    </div>
  );
};

// ---- the status bar ----------------------------------------------------------------------------------------------------
export const StatusBar: React.FC<{dark?: boolean; time?: string | null}> = ({dark = true, time = null}) => {
  const c = dark ? '#FFFFFF' : '#0B0B0B';
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: CW, height: 160}}>
      {time ? <div style={{position: 'absolute', left: 120, top: 52, width: 160, textAlign: 'center', fontFamily: F.sans, fontWeight: 600, fontSize: 50, color: c}}>{time}</div> : null}
      {/* signal, wi-fi, battery */}
      <svg width={220} height={60} viewBox="0 0 220 60" style={{position: 'absolute', left: 790, top: 52}}>
        {[14, 21, 28, 35].map((h, i) => (
          <rect key={i} x={i * 14} y={40 - h} width={10} height={h} rx={3} fill={c} />
        ))}
        <path d="M88 18a26 26 0 0 1 36 0l-4 4a20 20 0 0 0-28 0zM95 25a16 16 0 0 1 22 0l-4 4a10 10 0 0 0-14 0zM102 32a6 6 0 0 1 8 0l-4 5z" fill={c} />
        <rect x={140.5} y={10.5} width={60} height={29} rx={9} fill="none" stroke={c} strokeOpacity={0.45} strokeWidth={3} />
        <rect x={146} y={16} width={44} height={18} rx={5} fill={c} />
        <rect x={204} y={20} width={5} height={10} rx={2.5} fill={c} fillOpacity={0.45} />
      </svg>
    </div>
  );
};

// ---- the lock screen -----------------------------------------------------------------------------------------------------
export const LockScreen: React.FC<{wall: string; time: string; date: string; dark?: boolean; dim?: number; clock?: number; quick?: number; children?: React.ReactNode}> = ({wall, time, date, dark = true, dim = 0, clock = 1, quick = 1, children}) => {
  const c = dark ? '#FFFFFF' : '#0B0B0B';
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: CW, height: CH, overflow: 'hidden'}}>
      <Img src={staticFile(wall)} style={{position: 'absolute', left: 0, top: 0, width: CW, height: CH}} />
      <StatusBar dark={dark} />
      <div style={{position: 'absolute', left: 0, top: 300, width: CW, textAlign: 'center', fontFamily: F.sans, fontWeight: 500, fontSize: 46, color: c, opacity: 0.92 * clock}}>{date}</div>
      <div style={{position: 'absolute', left: 0, top: 340, width: CW, textAlign: 'center', fontFamily: F.sans, fontWeight: 600, fontSize: 300, lineHeight: 1.1, color: c, letterSpacing: -6, fontFeatureSettings: '"tnum" 1', opacity: clock}}>{time}</div>
      {/* the flashlight and the camera buttons */}
      {[160, 920].map((x) => (
        <div key={x} style={{position: 'absolute', left: x - 74, top: 2090, width: 148, height: 148, borderRadius: 74, background: dark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.08)', opacity: quick}} />
      ))}
      <div style={{position: 'absolute', left: 540 - 200, top: 2300, width: 400, height: 14, borderRadius: 7, background: c, opacity: 0.9}} />
      {dim > 0 ? <div style={{position: 'absolute', inset: 0, background: '#000', opacity: dim}} /> : null}
      {children}
    </div>
  );
};

// ---- a notification banner -----------------------------------------------------------------------------------------------
export type Note = {icon: 'msg' | 'phone' | 'vinari'; app: string; title: string; body: string; when: string};
export const Banner: React.FC<{n: Note; y: number; k?: number; dark?: boolean; scale?: number}> = ({n, y, k = 1, dark = true, scale = 1}) => {
  const fg = dark ? '#FFFFFF' : '#0B0B0B';
  const sub = dark ? 'rgba(255,255,255,0.62)' : 'rgba(11,11,11,0.52)';
  const q = clamp(k);
  return (
    <div
      style={{
        position: 'absolute',
        left: 40,
        top: y,
        width: 1000,
        borderRadius: 56,
        padding: '34px 40px 36px 40px',
        boxSizing: 'border-box',
        background: dark ? 'rgba(52,46,52,0.62)' : 'rgba(255,255,255,0.86)',
        boxShadow: dark ? 'inset 0 0 0 1.5px rgba(255,255,255,0.10), 0 20px 50px rgba(0,0,0,0.25)' : 'inset 0 0 0 1.5px rgba(255,255,255,0.7), 0 24px 60px rgba(20,30,60,0.16)',
        display: 'flex',
        gap: 32,
        alignItems: 'flex-start',
        opacity: q,
        transform: `translateY(${(1 - E.out(q)) * -60}px) scale(${(0.94 + 0.06 * E.out(q)) * scale})`,
        transformOrigin: '50% 0%',
      }}
    >
      <div style={{flex: 'none', marginTop: 4}}>
        <AppIcon kind={n.icon} size={104} />
      </div>
      <div style={{flex: 1, minWidth: 0, fontFamily: F.sans}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
          <div style={{fontWeight: 600, fontSize: 43, color: fg}}>{n.title}</div>
          <div style={{fontWeight: 400, fontSize: 34, color: sub, flex: 'none', marginLeft: 20}}>{n.when}</div>
        </div>
        <div style={{fontWeight: 400, fontSize: 42, lineHeight: 1.28, color: fg, marginTop: 6}}>{n.body}</div>
      </div>
    </div>
  );
};

// ---- the incoming call ------------------------------------------------------------------------------------------------------
export const IncomingCall: React.FC<{name: string; sub: string; press?: number}> = ({name, sub, press = 0}) => (
  <div style={{position: 'absolute', left: 0, top: 0, width: CW, height: CH}}>
    <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(20,16,24,0.55) 0%, rgba(20,16,24,0.25) 45%, rgba(10,8,12,0.6) 100%)'}} />
    <div style={{position: 'absolute', left: 0, top: 330, width: CW, textAlign: 'center', fontFamily: F.sans, fontWeight: 400, fontSize: 44, color: 'rgba(255,255,255,0.7)'}}>{sub}</div>
    <div style={{position: 'absolute', left: 0, top: 400, width: CW, textAlign: 'center', fontFamily: F.sans, fontWeight: 500, fontSize: 96, color: '#FFFFFF'}}>{name}</div>
    {/* remind me, message */}
    {[
      {x: 270, l: 'შემახსენე'},
      {x: 810, l: 'შეტყობინება'},
    ].map((b) => (
      <div key={b.x} style={{position: 'absolute', left: b.x - 150, top: 1660, width: 300, textAlign: 'center', fontFamily: F.sans, fontSize: 36, color: 'rgba(255,255,255,0.8)'}}>
        <div style={{width: 96, height: 96, borderRadius: 48, margin: '0 auto 18px', background: 'rgba(255,255,255,0.14)'}} />
        {b.l}
      </div>
    ))}
    {[
      {x: 270, bg: '#EB4D3D', l: 'უარყოფა', down: true, p: press},
      {x: 810, bg: '#34C759', l: 'პასუხი', down: false, p: 0},
    ].map((b) => (
      <div key={b.x} style={{position: 'absolute', left: b.x - 150, top: 1930, width: 300, textAlign: 'center', fontFamily: F.sans, fontSize: 38, color: '#FFFFFF'}}>
        <div
          style={{
            width: 190,
            height: 190,
            borderRadius: 95,
            margin: '0 auto 22px',
            background: b.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: `scale(${1 - 0.08 * b.p})`,
            filter: b.p > 0 ? `brightness(${1 - 0.18 * b.p})` : undefined,
          }}
        >
          <PhoneGlyph size={96} color="#FFFFFF" down={b.down} />
        </div>
        {b.l}
      </div>
    ))}
  </div>
);

/** a tap ring (ink with a white halo, the studio's), capture px */
export const Tap: React.FC<{x: number; y: number; k: number; light?: boolean}> = ({x, y, k, light}) =>
  k > 0 && k < 1 ? (
    <div
      style={{
        position: 'absolute',
        left: x - 70,
        top: y - 70,
        width: 140,
        height: 140,
        borderRadius: 70,
        border: `9px solid ${light ? 'rgba(255,255,255,0.95)' : 'rgba(11,11,11,0.9)'}`,
        boxShadow: light ? '0 0 0 5px rgba(0,0,0,0.25)' : '0 0 0 6px rgba(255,255,255,0.8)',
        opacity: 1 - k,
        transform: `scale(${0.55 + 0.6 * k})`,
      }}
    />
  ) : null;

/** the iOS camera's yellow QR frame: four corner brackets closing in on a rect (capture px), k 0 wide .. 1 locked */
export const QrFrame: React.FC<{x: number; y: number; w: number; h: number; k: number; a?: number}> = ({x, y, w, h, k, a = 1}) => {
  const g = lerp(70, 0, E.out(clamp(k)));
  const L = Math.min(w, h) * 0.26;
  const col = '#FFD60A';
  const st = 9;
  const corner = (cx: number, cy: number, sx: number, sy: number) => (
    <path d={`M${cx} ${cy + sy * L}V${cy}H${cx + sx * L}`} fill="none" stroke={col} strokeWidth={st} strokeLinecap="round" strokeLinejoin="round" />
  );
  return (
    <svg width={CW} height={CH} style={{position: 'absolute', left: 0, top: 0, opacity: a}}>
      {corner(x - g, y - g, 1, 1)}
      {corner(x + w + g, y - g, -1, 1)}
      {corner(x - g, y + h + g, 1, -1)}
      {corner(x + w + g, y + h + g, -1, -1)}
    </svg>
  );
};

/** the yellow link chip under a found QR code */
export const LinkChip: React.FC<{x: number; y: number; k: number; press?: number}> = ({x, y, k, press = 0}) => {
  const q = clamp(k);
  if (q <= 0) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: x - 210,
        top: y,
        width: 420,
        height: 100,
        borderRadius: 50,
        background: '#FFD60A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 18,
        fontFamily: F.sans,
        fontWeight: 600,
        fontSize: 44,
        color: '#0B0B0B',
        opacity: q,
        transform: `scale(${(0.7 + 0.3 * E.outBack(q)) * (1 - 0.06 * press)})`,
      }}
    >
      <svg width={44} height={44} viewBox="0 0 24 24">
        <circle cx={12} cy={12} r={9.5} fill="none" stroke="#0B0B0B" strokeWidth={2} />
        <path d="M2.5 12h19M12 2.5c3 3.2 3 15.8 0 19M12 2.5c-3 3.2-3 15.8 0 19" fill="none" stroke="#0B0B0B" strokeWidth={1.6} />
      </svg>
      vinari.ge
    </div>
  );
};

// ---- v4: a call on the loudspeaker (the stranger shouting from her phone) ----------------------------------------------
const CallIcon: React.FC<{kind: string; c: string}> = ({kind, c}) => {
  const s = {fill: 'none', stroke: c, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const};
  return (
    <svg width={86} height={86} viewBox="0 0 24 24">
      {kind === 'mute' ? (
        <g {...s}>
          <rect x={9} y={3} width={6} height={11} rx={3} />
          <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M4 4l16 16" />
        </g>
      ) : kind === 'keys' ? (
        <g fill={c}>
          {[6, 12, 18].map((x) => [5, 10, 15].map((y) => <circle key={`${x}${y}`} cx={x} cy={y} r={1.7} />))}
          <circle cx={12} cy={20} r={1.7} />
        </g>
      ) : kind === 'spk' ? (
        <g {...s}>
          <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill={c} />
          <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
        </g>
      ) : kind === 'add' ? (
        <g {...s}>
          <path d="M12 5v14M5 12h14" />
        </g>
      ) : kind === 'cam' ? (
        <g {...s}>
          <rect x={3} y={7} width={12} height={10} rx={2} />
          <path d="M15 11l5-3v8l-5-3z" />
        </g>
      ) : (
        <g {...s}>
          <circle cx={12} cy={9} r={4} />
          <path d="M4.5 20c1.2-3.6 4-5.4 7.5-5.4s6.3 1.8 7.5 5.4" />
        </g>
      )}
    </svg>
  );
};

/** an ongoing call with the loudspeaker on: the caller, the running timer, the six buttons (the speaker lit), the red end */
export const ActiveCall: React.FC<{name: string; time: string; speaker?: number}> = ({name, time, speaker = 1}) => (
  <div style={{position: 'absolute', left: 0, top: 0, width: CW, height: CH}}>
    <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(24,20,28,0.72) 0%, rgba(18,14,20,0.55) 45%, rgba(10,8,12,0.78) 100%)'}} />
    <StatusBar time="21:44" />
    <div style={{position: 'absolute', left: 0, top: 330, width: CW, textAlign: 'center', fontFamily: F.sans, fontWeight: 500, fontSize: 98, color: '#FFFFFF'}}>{name}</div>
    <div style={{position: 'absolute', left: 0, top: 470, width: CW, textAlign: 'center', fontFamily: F.sans, fontWeight: 400, fontSize: 50, color: 'rgba(255,255,255,0.68)', fontFeatureSettings: '"tnum" 1'}}>{time}</div>
    {[
      {k: 'mute', l: 'დადუმება'},
      {k: 'keys', l: 'კლავიატურა'},
      {k: 'spk', l: 'დინამიკი'},
      {k: 'add', l: 'დამატება'},
      {k: 'cam', l: 'FaceTime'},
      {k: 'user', l: 'კონტაქტები'},
    ].map((b, i) => {
      const on = b.k === 'spk' ? speaker : 0;
      const x = 225 + (i % 3) * 315;
      const y = 1150 + Math.floor(i / 3) * 330;
      return (
        <div key={b.k} style={{position: 'absolute', left: x - 150, top: y, width: 300, textAlign: 'center', fontFamily: F.sans, fontSize: 36, color: 'rgba(255,255,255,0.86)'}}>
          <div style={{width: 196, height: 196, borderRadius: 98, margin: '0 auto 20px', background: on > 0.5 ? '#FFFFFF' : 'rgba(255,255,255,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <CallIcon kind={b.k} c={on > 0.5 ? '#0B0B0B' : '#FFFFFF'} />
          </div>
          {b.l}
        </div>
      );
    })}
    <div style={{position: 'absolute', left: 540 - 98, top: 1930, width: 196, height: 196, borderRadius: 98, background: '#EB4D3D', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <PhoneGlyph size={100} color="#FFFFFF" down />
    </div>
  </div>
);

/** a voice message from a stranger, floating (frame px): the sender, a play glyph, the waveform filling as it plays */
export const VoiceNote: React.FC<{x: number; y: number; w: number; k: number; play: number; who: string; seed?: number}> = ({x, y, w, k, play, who, seed = 3}) => {
  const q = clamp(k);
  if (q <= 0.001) return null;
  const n = 30;
  const bars = Array.from({length: n}, (_, i) => 0.28 + 0.72 * Math.abs(Math.sin(i * 1.7 + seed) * Math.cos(i * 0.61 + seed * 0.3)));
  const h = w * 0.3;
  return (
    <div
      style={{
        position: 'absolute',
        left: x - w / 2,
        top: y,
        width: w,
        height: h,
        borderRadius: h * 0.32,
        background: 'rgba(38,34,40,0.78)',
        boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,0.12), 0 18px 44px rgba(0,0,0,0.4)',
        opacity: q,
        transform: `translateY(${(1 - E.out(q)) * 24}px) scale(${0.92 + 0.08 * E.out(q)})`,
        transformOrigin: '50% 100%',
        display: 'flex',
        alignItems: 'center',
        gap: w * 0.04,
        padding: `0 ${w * 0.06}px`,
        boxSizing: 'border-box',
        fontFamily: F.sans,
      }}
    >
      <div style={{flex: 'none', width: h * 0.56, height: h * 0.56, borderRadius: '50%', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <svg width={h * 0.26} height={h * 0.26} viewBox="0 0 24 24">
          {play > 0 && play < 1 ? <path d="M6 4h4v16H6zM14 4h4v16h-4z" fill="#0B0B0B" /> : <path d="M7 4l13 8-13 8z" fill="#0B0B0B" />}
        </svg>
      </div>
      <div style={{flex: 1, minWidth: 0}}>
        <div style={{fontSize: h * 0.2, fontWeight: 600, color: '#FFFFFF', marginBottom: h * 0.06}}>{who}</div>
        <div style={{display: 'flex', alignItems: 'center', gap: w * 0.008, height: h * 0.3}}>
          {bars.map((b, i) => (
            <div key={i} style={{flex: 1, height: `${b * 100}%`, borderRadius: 4, background: i / n < play ? '#FFFFFF' : 'rgba(255,255,255,0.32)'}} />
          ))}
        </div>
      </div>
    </div>
  );
};
