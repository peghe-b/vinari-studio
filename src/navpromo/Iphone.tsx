// A true-proportioned iPhone, black, drawn at its final size (no CSS scale, so every edge is crisp): a titanium rim, the
// black glass, the Dynamic Island, the side buttons, and a REAL app capture inside (public/screens, never edited: only
// cropped and zoomed inside the window). The window frames the capture by a focus point and a zoom; a band highlights a
// row (the studio's green band, the rest under a light paper fog); a tap leaves a ring.
import React from 'react';
import {Img, staticFile} from 'remotion';
import {clamp, GREEN, lerp} from './lib';

export const SRC_W = 1080;
export const SRC_H = 2346;
export const PHONE_ASPECT = 2.15; // body height / width (the capture's 2.172 plus the bezel)

export type View = {x: number; y: number; zoom: number}; // the capture point (fractions) held at the window centre
export type Band = {y: number; h: number; x?: number; w?: number; a: number}; // capture fractions; a = opacity 0..1
export type Tap = {x: number; y: number; k: number}; // k: 0..1 the ring's life

export const phoneBox = (w: number) => {
  const h = Math.round(w * PHONE_ASPECT);
  const bez = Math.round(w * 0.026);
  return {w, h, bez, sw: w - 2 * bez, sh: h - 2 * bez, r: Math.round(w * 0.168), sr: Math.round(w * 0.168) - bez};
};

/** where a capture point lands inside the window for a view (window px from its top left) */
// the captures' status bar (the clock, Wi-Fi, the battery: y 0..0.055) never shows: Wi-Fi next to "no internet" would lie.
// Every view crops it (the window's top is at least 5.5 % into the capture; zooms of 1.1 and up still fill the window).
export const STATUS_BAR = 0.055;
export const placeCapture = (sw: number, sh: number, v: View) => {
  const iw = sw * v.zoom;
  const ih = iw * (SRC_H / SRC_W);
  const left = clamp(sw / 2 - v.x * iw, sw - iw, 0);
  const top = clamp(sh / 2 - v.y * ih, sh - ih, -STATUS_BAR * ih);
  return {iw, ih, left, top};
};

export const Iphone: React.FC<{
  cx: number;
  cy: number;
  w: number;
  src?: string; // screens/<src>.jpg
  on?: number; // 0 off (black glass) .. 1 lit
  view?: View;
  band?: Band | null;
  tap?: Tap | null;
  glint?: number; // 0..1 a light sweeping across the glass (-1 none)
  rim?: number; // 0..1 a white rim light on the outline (the reveal on black)
  shadow?: number; // 0..1 the contact shadow on the white field
  rot?: number; // degrees, a tiny tilt
  children?: React.ReactNode; // drawn inside the window over the capture
  fog?: number; // the paper fog around the band (0..1)
}> = ({cx, cy, w, src, on = 1, view = {x: 0.5, y: 0.5, zoom: 1}, band = null, tap = null, glint = -1, rim = 0, shadow = 1, rot = 0, children, fog = 0.55}) => {
  const b = phoneBox(w);
  const L = cx - b.w / 2;
  const T = cy - b.h / 2;
  const cap = placeCapture(b.sw, b.sh, view);
  const isl = {w: b.w * 0.3, h: b.w * 0.088};
  const bandBox = band
    ? {
        left: cap.left + (band.x ?? 0.03) * cap.iw,
        top: cap.top + band.y * cap.ih,
        width: (band.w ?? 0.94) * cap.iw,
        height: band.h * cap.ih,
      }
    : null;
  return (
    <div style={{position: 'absolute', left: L, top: T, width: b.w, height: b.h, transform: rot ? `rotate(${rot}deg)` : undefined}}>
      {/* the contact shadow on the field */}
      {shadow > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: b.w * 0.08,
            right: b.w * 0.08,
            bottom: -b.w * 0.05,
            height: b.w * 0.11,
            borderRadius: '50%',
            background: 'radial-gradient(closest-side, rgba(0,0,0,0.28), rgba(0,0,0,0.12) 55%, rgba(0,0,0,0) 100%)',
            opacity: shadow,
          }}
        />
      ) : null}
      {/* the side buttons */}
      <div style={{position: 'absolute', left: -4, top: b.h * 0.19, width: 5, height: b.h * 0.045, borderRadius: 3, background: '#2A2A2A'}} />
      <div style={{position: 'absolute', left: -4, top: b.h * 0.255, width: 5, height: b.h * 0.075, borderRadius: 3, background: '#2A2A2A'}} />
      <div style={{position: 'absolute', left: -4, top: b.h * 0.345, width: 5, height: b.h * 0.075, borderRadius: 3, background: '#2A2A2A'}} />
      <div style={{position: 'absolute', right: -4, top: b.h * 0.29, width: 5, height: b.h * 0.11, borderRadius: 3, background: '#2A2A2A'}} />
      <div style={{position: 'absolute', right: -4, top: b.h * 0.5, width: 5, height: b.h * 0.06, borderRadius: 3, background: '#2A2A2A'}} />
      {/* the body: a titanium rim around black glass */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: b.r,
          background: 'linear-gradient(135deg, #3C3C3C 0%, #1C1C1C 22%, #2E2E2E 50%, #151515 78%, #383838 100%)',
        }}
      />
      <div style={{position: 'absolute', inset: 2.5, borderRadius: b.r - 2.5, background: '#050505'}} />
      {/* the window */}
      <div style={{position: 'absolute', left: b.bez, top: b.bez, width: b.sw, height: b.sh, borderRadius: b.sr, overflow: 'hidden', background: '#000'}}>
        {src ? (
          <Img
            src={staticFile(`screens/${src}.jpg`)}
            style={{position: 'absolute', left: cap.left, top: cap.top, width: cap.iw, height: cap.ih, opacity: clamp(on), filter: on < 1 ? `brightness(${lerp(0.4, 1, clamp(on))})` : undefined}}
          />
        ) : null}
        {bandBox && band ? (
          <>
            <div
              style={{
                position: 'absolute',
                ...bandBox,
                borderRadius: 14,
                boxShadow: `0 0 0 ${2 * b.h}px rgba(255,255,255,${(fog * band.a).toFixed(3)})`,
              }}
            />
            <div
              style={{
                position: 'absolute',
                ...bandBox,
                borderRadius: 14,
                border: `3px solid ${GREEN}`,
                opacity: band.a,
                transform: `scale(${0.96 + 0.04 * band.a})`,
              }}
            />
          </>
        ) : null}
        {tap && tap.k > 0 && tap.k < 1 ? (
          <div
            style={{
              position: 'absolute',
              left: cap.left + tap.x * cap.iw - 44,
              top: cap.top + tap.y * cap.ih - 44,
              width: 88,
              height: 88,
              borderRadius: 44,
              border: '4px solid rgba(11,11,11,0.9)',
              boxShadow: '0 0 0 3px rgba(255,255,255,0.7)',
              opacity: 1 - tap.k,
              transform: `scale(${0.55 + 0.6 * tap.k})`,
            }}
          />
        ) : null}
        {children}
        {/* the glass: a faint sheen, and a glint that crosses once */}
        <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(160deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 38%)'}} />
        {glint >= 0 && glint <= 1 ? (
          <div
            style={{
              position: 'absolute',
              left: lerp(-b.sw * 0.9, b.sw * 1.1, glint),
              top: -b.sh * 0.1,
              width: b.sw * 0.35,
              height: b.sh * 1.2,
              transform: 'rotate(18deg)',
              background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.28) 50%, rgba(255,255,255,0) 100%)',
            }}
          />
        ) : null}
        {/* the Dynamic Island (hardware: always there) */}
        <div style={{position: 'absolute', left: (b.sw - isl.w) / 2, top: b.sw * 0.034, width: isl.w, height: isl.h, borderRadius: isl.h / 2, background: '#000'}} />
      </div>
      {/* the rim light (the reveal: the edge light catches the outline) */}
      {rim > 0 ? (
        <>
          <div style={{position: 'absolute', inset: 0, borderRadius: b.r, boxShadow: `inset 0 0 0 2px rgba(255,255,255,${(0.95 * rim).toFixed(3)})`}} />
          <div style={{position: 'absolute', inset: -1, borderRadius: b.r + 1, boxShadow: `0 0 ${18 * rim}px ${2 * rim}px rgba(255,255,255,${(0.35 * rim).toFixed(3)})`}} />
        </>
      ) : null}
    </div>
  );
};
