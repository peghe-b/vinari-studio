// The creator story's shared pieces: the paper, glass cards, the wordmark (the official SVG as a mask, never typed),
// the phone's iOS chrome (status bar, Safari's address pill), the tap ring, the camera's recording UI, the stock frames.
import React from 'react';
import {Img, staticFile, useCurrentFrame} from 'remotion';
import {mtav} from '../lib/format';
import {F} from '../tokens';
import {clamp, E, INK, INK2, INK3, REC, SHADOW} from './lib';

/** the paper: a soft white with a gentle light from above, never flat */
export const Bg: React.FC<{glow?: number}> = ({glow = 0}) => {
  const f = useCurrentFrame();
  // a slow, soft light drifting over the paper: the background is never a still
  const lx = 50 + 18 * Math.sin(f / 70);
  const ly = 30 + 10 * Math.cos(f / 90);
  return (
    <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(120% 80% at 50% 28%, #FFFFFF 0%, #F5F5F7 46%, #E9E9EE 100%)'}}>
      <div style={{position: 'absolute', inset: 0, background: `radial-gradient(55% 32% at ${lx.toFixed(1)}% ${ly.toFixed(1)}%, rgba(255,255,255,0.85), rgba(255,255,255,0))`}} />
      {glow > 0 ? <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(60% 40% at 50% 40%, rgba(255,255,255,0.9), rgba(255,255,255,0))', opacity: glow}} /> : null}
    </div>
  );
};

/** a white glass card */
export const Glass: React.FC<{x: number; y: number; w: number; h: number; r?: number; style?: React.CSSProperties; children?: React.ReactNode; dashed?: boolean}> = ({x, y, w, h, r = 36, style, children, dashed}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: r, background: 'rgba(255,255,255,0.92)', boxShadow: SHADOW, border: '1px solid rgba(255,255,255,0.9)', ...style}}>
    {dashed ? <div style={{position: 'absolute', inset: 14, borderRadius: r - 10, border: '3px dashed rgba(11,11,11,0.16)'}} /> : null}
    {children}
  </div>
);

/** the official VINARI wordmark (public/brand/wordmark.svg, 267 x 68) in any colour */
export const Wordmark: React.FC<{w: number; color?: string; style?: React.CSSProperties}> = ({w, color = INK, style}) => (
  <div
    style={{
      width: w,
      height: (w * 68) / 267,
      background: color,
      WebkitMaskImage: `url(${staticFile('brand/wordmark.svg')})`,
      WebkitMaskSize: '100% 100%',
      maskImage: `url(${staticFile('brand/wordmark.svg')})`,
      maskSize: '100% 100%',
      ...style,
    }}
  />
);
/** the V mark (public/brand/mark.svg, 768 x 671) */
export const Mark: React.FC<{w: number; color?: string; style?: React.CSSProperties}> = ({w, color = INK, style}) => (
  <div style={{width: w, height: (w * 671) / 768, background: color, WebkitMaskImage: `url(${staticFile('brand/mark.svg')})`, WebkitMaskSize: '100% 100%', maskImage: `url(${staticFile('brand/mark.svg')})`, maskSize: '100% 100%', ...style}} />
);

/** Mtavruli text in the film's face */
export const Mt: React.FC<{children: string; size: number; weight?: number; color?: string; style?: React.CSSProperties; spacing?: number}> = ({children, size, weight = 600, color = INK, style, spacing = 0}) => (
  <span style={{fontFamily: F.sans, fontWeight: weight, fontSize: size, color, lineHeight: 1.15, letterSpacing: `${spacing}em`, whiteSpace: 'nowrap', ...style}}>{mtav(children)}</span>
);

/** a check in a circle */
export const Check: React.FC<{s: number; k?: number; bg?: string; fg?: string}> = ({s, k = 1, bg = INK, fg = '#fff'}) => (
  <svg width={s} height={s} viewBox="0 0 40 40" style={{display: 'block', transform: `scale(${(0.6 + 0.4 * E.outBack(clamp(k))).toFixed(3)})`, opacity: clamp(k * 2)}}>
    <circle cx="20" cy="20" r="20" fill={bg} />
    <path d="M12 20.5l5.2 5.2L28.5 14" fill="none" stroke={fg} strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="30" strokeDashoffset={(30 * (1 - E.out(clamp(k * 1.4 - 0.2)))).toFixed(1)} />
  </svg>
);

/** iOS status bar in capture px (1080 wide), drawn on the phone's screen layer */
export const StatusBar: React.FC<{dark?: boolean; bg?: string}> = ({dark = false, bg}) => {
  const c = dark ? '#fff' : '#000';
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 150, background: bg}}>
      <div style={{position: 'absolute', left: 120, top: 58, width: 170, textAlign: 'center', fontFamily: F.sans, fontWeight: 600, fontSize: 50, color: c}}>9:41</div>
      <svg style={{position: 'absolute', left: 790, top: 66}} width="64" height="40" viewBox="0 0 64 40">
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={i * 16} y={30 - i * 9} width="11" height={10 + i * 9} rx="3" fill={c} />
        ))}
      </svg>
      <svg style={{position: 'absolute', left: 872, top: 62}} width="94" height="46" viewBox="0 0 94 46">
        <rect x="2" y="4" width="78" height="38" rx="12" fill="none" stroke={c} strokeOpacity="0.4" strokeWidth="3.5" />
        <rect x="9" y="11" width="64" height="24" rx="6" fill={c} />
        <rect x="84" y="16" width="6" height="14" rx="3" fill={c} fillOpacity="0.4" />
      </svg>
    </div>
  );
};

/** Safari's floating address pill at the bottom of the screen (capture px) */
export const UrlPill: React.FC<{url: string; k?: number}> = ({url, k = 1}) => (
  <div
    style={{
      position: 'absolute',
      left: 70,
      top: 2346 - 236,
      width: 940,
      height: 132,
      borderRadius: 66,
      background: 'rgba(255,255,255,0.93)',
      boxShadow: '0 10px 40px rgba(0,0,0,0.16), 0 0 0 1.5px rgba(0,0,0,0.05)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 18,
      opacity: k,
    }}
  >
    <svg width="34" height="42" viewBox="0 0 17 21">
      <rect x="1.5" y="8.5" width="14" height="11" rx="2.5" fill="#3A3A3C" />
      <path d="M4.5 9V6a4 4 0 0 1 8 0v3" fill="none" stroke="#3A3A3C" strokeWidth="2" />
    </svg>
    <span style={{fontFamily: F.sans, fontWeight: 500, fontSize: 50, color: '#1C1C1E'}}>{url}</span>
  </div>
);

/** the studio's tap ring (ink with a white halo), growing as it fades; capture px */
export const Tap: React.FC<{x: number; y: number; k: number; s?: number}> = ({x, y, k, s = 1}) =>
  k > 0 && k < 1 ? (
    <div
      style={{
        position: 'absolute',
        left: x - 70 * s,
        top: y - 70 * s,
        width: 140 * s,
        height: 140 * s,
        borderRadius: 70 * s,
        border: `${8 * s}px solid rgba(11,11,11,0.85)`,
        boxShadow: `0 0 0 ${5 * s}px rgba(255,255,255,0.8)`,
        background: `rgba(11,11,11,${(0.12 * (1 - k)).toFixed(3)})`,
        opacity: 1 - k,
        transform: `scale(${(0.5 + 0.65 * E.out(k)).toFixed(3)})`,
      }}
    />
  ) : null;

/** a frame of a graded stock clip (public/vo/crpromo/stockX/fNNN.jpg, 30 fps) */
export const stockSrc = (clip: 'A' | 'B', sec: number) => {
  const n = clip === 'A' ? 96 : 186;
  const i = Math.max(1, Math.min(n, 1 + Math.floor(sec * 30)));
  return staticFile(`vo/crpromo/stock${clip}/f${String(i).padStart(3, '0')}.jpg`);
};
export const Stock: React.FC<{clip: 'A' | 'B'; sec: number; zoom?: number; ox?: number; oy?: number; style?: React.CSSProperties}> = ({clip, sec, zoom = 1, ox = 50, oy = 50, style}) => (
  <Img
    src={stockSrc(clip, sec)}
    style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${ox}% ${oy}%`, transform: `scale(${zoom})`, transformOrigin: `${ox}% ${oy}%`, ...style}}
  />
);

/** the camera app's recording UI over a viewfinder: the red timer, corner brackets, the record button; px of its box */
export const CamUI: React.FC<{w: number; h: number; t: number; scale?: number; brackets?: boolean; focus?: {x: number; y: number; k: number} | null; bottom?: boolean}> = ({w, h, t, scale = 1, brackets = true, focus = null, bottom = true}) => {
  const s = scale;
  const secs = Math.floor(t);
  const blink = Math.floor(t * 2) % 2 === 0 ? 1 : 0.35;
  const L = 46 * s;
  const inset = 44 * s;
  const br = (x: number, y: number, rx: number, ry: number) => (
    <path d={`M${x} ${y + ry * L} V${y} H${x + rx * L}`} stroke="rgba(255,255,255,0.92)" strokeWidth={4 * s} fill="none" strokeLinecap="round" />
  );
  return (
    <div style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
      {brackets ? (
        <svg width={w} height={h} style={{position: 'absolute', inset: 0}}>
          {br(inset, inset + 60 * s, 1, 1)}
          {br(w - inset, inset + 60 * s, -1, 1)}
          {br(inset, h - inset - (bottom ? 190 : 0) * s, 1, -1)}
          {br(w - inset, h - inset - (bottom ? 190 : 0) * s, -1, -1)}
        </svg>
      ) : null}
      <div
        style={{
          position: 'absolute',
          left: w / 2 - 105 * s,
          top: 34 * s,
          width: 210 * s,
          height: 58 * s,
          borderRadius: 14 * s,
          background: REC,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: F.sans,
          fontWeight: 500,
          fontSize: 34 * s,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '0.02em',
        }}
      >
        <span style={{width: 12 * s, height: 12 * s, borderRadius: 6 * s, background: '#fff', marginRight: 10 * s, opacity: blink}} />
        00:00:{String(secs).padStart(2, '0')}
      </div>
      {focus && focus.k > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: focus.x - 90 * s,
            top: focus.y - 90 * s,
            width: 180 * s,
            height: 180 * s,
            border: `${3.5 * s}px solid #FFD60A`,
            borderRadius: 6 * s,
            opacity: clamp(focus.k * 3) * (focus.k > 0.85 ? 1 - (focus.k - 0.85) / 0.15 * 0.6 : 1),
            transform: `scale(${(1.35 - 0.35 * E.out(clamp(focus.k * 2.2))).toFixed(3)})`,
          }}
        />
      ) : null}
      {bottom ? (
        <>
          <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 210 * s, background: 'linear-gradient(rgba(0,0,0,0), rgba(0,0,0,0.42))'}} />
          <div style={{position: 'absolute', left: w / 2 - 54 * s, bottom: 50 * s, width: 108 * s, height: 108 * s, borderRadius: 54 * s, border: `${7 * s}px solid #fff`, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <div style={{width: 40 * s, height: 40 * s, borderRadius: 9 * s, background: REC}} />
          </div>
        </>
      ) : null}
    </div>
  );
};

/** a skeleton text line */
export const Bar: React.FC<{w: number; h?: number; o?: number; style?: React.CSSProperties}> = ({w, h = 16, o = 0.1, style}) => (
  <div style={{width: w, height: h, borderRadius: h / 2, background: `rgba(11,11,11,${o})`, ...style}} />
);
export {INK, INK2, INK3};
