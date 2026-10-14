// The phone's own lock screen for PhoneDesk (the QR promo's kit/ios.tsx, 2026-10-14, brought into the studio 2026-10-15),
// drawn in capture px (1080 x 2346, the real screens' size) and laid on the 3D phone by ScreenLayer (./posed.tsx): the
// status bar, the date and the big clock, the flashlight and camera buttons, the home bar, and iOS notification banners.
// The wallpaper is drawn here (no photo file): a calm night or day gradient. The phone's words stay Mkhedruli (they are
// the phone's, not the film's).
import React from 'react';
import {Img, staticFile} from 'remotion';
import {F} from '../../tokens';
import {ease} from '../../lib/anim';

export const CW = 1080;
export const CH = 2346;
const clamp = (v: number) => Math.min(1, Math.max(0, v));

// ---- the wallpapers ------------------------------------------------------------------------------------------------------
/** the display's two colours under the HTML (PosedPhone's `wall`), matching the wallpaper's top and foot */
export const WALL: Record<'night' | 'day', [string, string]> = {night: ['#141B33', '#05070D'], day: ['#C9D6EA', '#F2E9DE']};
const Wallpaper: React.FC<{day: boolean}> = ({day}) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      background: day
        ? 'radial-gradient(120% 70% at 20% 8%, #AFC4E6 0%, rgba(175,196,230,0) 60%), radial-gradient(110% 60% at 85% 95%, #F4D9BE 0%, rgba(244,217,190,0) 65%), linear-gradient(180deg, #C9D6EA 0%, #E6E4E6 55%, #F2E9DE 100%)'
        : 'radial-gradient(90% 55% at 78% 18%, rgba(58,92,200,0.55) 0%, rgba(58,92,200,0) 70%), radial-gradient(100% 60% at 10% 88%, rgba(120,70,150,0.35) 0%, rgba(120,70,150,0) 70%), linear-gradient(180deg, #141B33 0%, #0A0E1C 55%, #05070D 100%)',
    }}
  />
);

// ---- glyphs and icons ----------------------------------------------------------------------------------------------------
const PhoneGlyph: React.FC<{size: number; color: string}> = ({size, color}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{display: 'block'}}>
    <path
      d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z"
      fill={color}
    />
  </svg>
);
const BubbleGlyph: React.FC<{size: number; color: string}> = ({size, color}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{display: 'block'}}>
    <path d="M12 3.5c5 0 9 3.3 9 7.4s-4 7.4-9 7.4c-.9 0-1.8-.1-2.6-.3L5 20l1.1-3.6C4.2 15 3 13.1 3 10.9 3 6.8 7 3.5 12 3.5z" fill={color} />
  </svg>
);
const MailGlyph: React.FC<{size: number; color: string}> = ({size, color}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{display: 'block'}}>
    <rect x={3} y={5.5} width={18} height={13} rx={2.2} fill={color} />
    <path d="M3.8 7l8.2 6 8.2-6" fill="none" stroke="#2F7BF6" strokeWidth={1.6} strokeLinejoin="round" />
  </svg>
);

export type AppKind = 'vinari' | 'messages' | 'phone' | 'mail';
export const appKind = (app: unknown): AppKind | null => {
  const s = String(app ?? '').trim().toLowerCase();
  if (!s || s === 'vinari' || s === 'ვინარი') return 'vinari';
  if (s === 'messages' || s === 'sms' || s === 'მესიჯი' || s === 'შეტყობინებები') return 'messages';
  if (s === 'phone' || s === 'call' || s === 'ტელეფონი' || s === 'ზარი') return 'phone';
  if (s === 'mail' || s === 'email' || s === 'ფოსტა') return 'mail';
  return null;
};

/** an app icon: VINARI white with its mark, Messages and Phone green, Mail blue; another app a calm grey with its initial */
export const AppIcon: React.FC<{app: string; size: number}> = ({app, size}) => {
  const r = size * 0.23;
  const kind = appKind(app);
  const box: React.CSSProperties = {width: size, height: size, borderRadius: r, display: 'flex', alignItems: 'center', justifyContent: 'center'};
  if (kind === 'vinari')
    return (
      <div style={{...box, background: '#FFFFFF', boxShadow: 'inset 0 0 0 1.5px rgba(0,0,0,0.08)'}}>
        <Img src={staticFile('brand/mark.svg')} style={{width: size * 0.56, height: size * 0.56, filter: 'brightness(0)'}} />
      </div>
    );
  if (kind === 'mail') return <div style={{...box, background: 'linear-gradient(180deg, #4FA3FF 0%, #1C6EF2 100%)'}}><MailGlyph size={size * 0.7} color="#FFFFFF" /></div>;
  if (kind === 'messages' || kind === 'phone')
    return (
      <div style={{...box, background: 'linear-gradient(180deg, #67E27A 0%, #2DBE4A 100%)'}}>
        {kind === 'messages' ? <BubbleGlyph size={size * 0.68} color="#FFFFFF" /> : <PhoneGlyph size={size * 0.56} color="#FFFFFF" />}
      </div>
    );
  return (
    <div style={{...box, background: 'linear-gradient(180deg, #8E939C 0%, #5D626B 100%)', fontFamily: F.sans, fontWeight: 600, fontSize: size * 0.48, color: '#FFFFFF'}}>
      {Array.from(String(app).trim())[0] ?? ''}
    </div>
  );
};

// ---- the status bar ----------------------------------------------------------------------------------------------------
const StatusBar: React.FC<{dark: boolean}> = ({dark}) => {
  const c = dark ? '#FFFFFF' : '#0B0B0B';
  return (
    <svg width={220} height={60} viewBox="0 0 220 60" style={{position: 'absolute', left: 790, top: 52}}>
      {[14, 21, 28, 35].map((h, i) => (
        <rect key={i} x={i * 14} y={40 - h} width={10} height={h} rx={3} fill={c} />
      ))}
      <path d="M88 18a26 26 0 0 1 36 0l-4 4a20 20 0 0 0-28 0zM95 25a16 16 0 0 1 22 0l-4 4a10 10 0 0 0-14 0zM102 32a6 6 0 0 1 8 0l-4 5z" fill={c} />
      <rect x={140.5} y={10.5} width={60} height={29} rx={9} fill="none" stroke={c} strokeOpacity={0.45} strokeWidth={3} />
      <rect x={146} y={16} width={44} height={18} rx={5} fill={c} />
      <rect x={204} y={20} width={5} height={10} rx={2.5} fill={c} fillOpacity={0.45} />
    </svg>
  );
};

// ---- the lock screen -----------------------------------------------------------------------------------------------------
/** the lock screen; `wake` 0 the dark glass (asleep) .. 1 lit; `day` the light wallpaper with ink type */
export const LockScreen: React.FC<{time: string; date: string; day?: boolean; wake?: number; children?: React.ReactNode}> = ({time, date, day = false, wake = 1, children}) => {
  const c = day ? '#0B0B0B' : '#FFFFFF';
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: CW, height: CH, overflow: 'hidden', background: '#000'}}>
      <div style={{position: 'absolute', inset: 0, opacity: clamp(wake)}}>
        <Wallpaper day={day} />
        <StatusBar dark={!day} />
        <div style={{position: 'absolute', left: 0, top: 300, width: CW, textAlign: 'center', fontFamily: F.sans, fontWeight: 500, fontSize: 46, color: c, opacity: 0.92}}>{date}</div>
        <div style={{position: 'absolute', left: 0, top: 340, width: CW, textAlign: 'center', fontFamily: F.sans, fontWeight: 600, fontSize: 300, lineHeight: 1.1, color: c, letterSpacing: -6, fontFeatureSettings: '"tnum" 1'}}>{time}</div>
        {[160, 920].map((x) => (
          <div key={x} style={{position: 'absolute', left: x - 74, top: 2090, width: 148, height: 148, borderRadius: 74, background: day ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.16)'}} />
        ))}
        <div style={{position: 'absolute', left: 540 - 200, top: 2300, width: 400, height: 14, borderRadius: 7, background: c, opacity: 0.9}} />
        {children}
      </div>
    </div>
  );
};

// ---- a notification banner -----------------------------------------------------------------------------------------------
export type Note = {app: string; title: string; body: string; when: string};
export const BANNER_H = 250; // a banner with a two-line body, capture px (the stack's step)
/** an iOS banner at capture y `y`; `k` 0..1 its arrival (drops in from above, settles) */
export const Banner: React.FC<{n: Note; y: number; k?: number; day?: boolean}> = ({n, y, k = 1, day = false}) => {
  const fg = day ? '#0B0B0B' : '#FFFFFF';
  const sub = day ? 'rgba(11,11,11,0.52)' : 'rgba(255,255,255,0.62)';
  const q = clamp(k);
  const e = ease.enter(q);
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
        background: day ? 'rgba(255,255,255,0.86)' : 'rgba(52,50,60,0.72)',
        boxShadow: day ? 'inset 0 0 0 1.5px rgba(255,255,255,0.7), 0 24px 60px rgba(20,30,60,0.16)' : 'inset 0 0 0 1.5px rgba(255,255,255,0.10), 0 20px 50px rgba(0,0,0,0.25)',
        display: 'flex',
        gap: 32,
        alignItems: 'flex-start',
        opacity: clamp(q * 1.6),
        transform: `translateY(${(1 - e) * -60}px) scale(${0.94 + 0.06 * e})`,
        transformOrigin: '50% 0%',
      }}
    >
      <div style={{flex: 'none', marginTop: 4}}>
        <AppIcon app={n.app} size={104} />
      </div>
      <div style={{flex: 1, minWidth: 0, fontFamily: F.sans}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
          <div style={{fontWeight: 600, fontSize: 44, color: fg, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{n.title}</div>
          <div style={{fontWeight: 400, fontSize: 34, color: sub, flex: 'none', marginLeft: 20}}>{n.when}</div>
        </div>
        <div style={{fontWeight: 400, fontSize: 43, lineHeight: 1.28, color: fg, marginTop: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'}}>{n.body}</div>
      </div>
    </div>
  );
};
