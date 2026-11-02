// The two phone beats in the film's middle: STREET NAMES (19-nav-streets-offer: the sample card, tapped, plays the app's own
// pair) and MANY SETTINGS (20-nav-streets-settings: unpaved roads, humour, how much it talks). The phone stays whole on the
// white field (the owner: never a phone cut at the frame's edge); the row the voice talks about LIFTS out of the real screen
// as a floating card, bigger, in front (a crop of the capture, never edited), with the studio's green band on it.
import React from 'react';
import {Img, staticFile, useCurrentFrame} from 'remotion';
import {Iphone, phoneBox, placeCapture, SRC_H, SRC_W, type View} from './Iphone';
import {clamp, E, ev, fr, GREEN, INK, lerp, prog, shot, sp} from './lib';

const PW = 570;
const PCY = 830;

export type Rect = {x: number; y: number; w: number; h: number};
export type Region = {x0: number; y0: number; x1: number; y1: number}; // capture fractions

/** where a capture region sits on screen inside the phone for a view */
export const onScreen = (r: Region, v: View): Rect => {
  const b = phoneBox(PW);
  const c = placeCapture(b.sw, b.sh, v);
  const left = 540 - PW / 2 + b.bez + c.left;
  const top = PCY - b.h / 2 + b.bez + c.top;
  return {x: left + r.x0 * c.iw, y: top + r.y0 * c.ih, w: (r.x1 - r.x0) * c.iw, h: (r.y1 - r.y0) * c.ih};
};

/** a region of the real capture lifted out of the screen into a floating card (k 0 on the screen .. 1 lifted) */
export const Lift: React.FC<{src: string; r: Region; from: Rect; to: Rect; k: number; radius?: number; band?: {y0: number; y1: number; x0?: number; x1?: number; a: number} | null; ring?: {x: number; y: number; k: number} | null; pulse?: {x: number; y: number; on: boolean; t: number}}> = ({
  src,
  r,
  from,
  to,
  k,
  radius = 26,
  band = null,
  ring = null,
  pulse,
}) => {
  if (k <= 0.001) return null;
  const x = lerp(from.x, to.x, k);
  const y = lerp(from.y, to.y, k);
  const w = lerp(from.w, to.w, k);
  const h = lerp(from.h, to.h, k);
  const iw = w / (r.x1 - r.x0);
  const ih = iw * (SRC_H / SRC_W);
  const fx = (u: number) => ((u - r.x0) / (r.x1 - r.x0)) * w;
  const fy = (v: number) => ((v - r.y0) / (r.y1 - r.y0)) * h;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: radius * (w / to.w),
        overflow: 'hidden',
        boxShadow: `0 ${24 * k}px ${60 * k}px rgba(0,0,0,${0.18 * k}), 0 ${4 * k}px ${12 * k}px rgba(0,0,0,${0.08 * k})`,
      }}
    >
      <Img src={staticFile(`screens/${src}.jpg`)} style={{position: 'absolute', left: -r.x0 * iw, top: -r.y0 * ih, width: iw, height: ih}} />
      {band && band.a > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: fx(band.x0 ?? r.x0 + 0.01) - 6,
            top: fy(band.y0) - 4,
            width: fx(band.x1 ?? r.x1 - 0.01) - fx(band.x0 ?? r.x0 + 0.01) + 12,
            height: fy(band.y1) - fy(band.y0) + 8,
            border: `3px solid ${GREEN}`,
            borderRadius: 12,
            opacity: band.a,
          }}
        />
      ) : null}
      {pulse && pulse.on
        ? [0, 1, 2].map((i) => {
            const q = ((pulse.t + i * 8) % 24) / 24;
            const R = (34 + q * 50) * (w / to.w);
            return <div key={i} style={{position: 'absolute', left: fx(pulse.x) - R, top: fy(pulse.y) - R, width: 2 * R, height: 2 * R, borderRadius: R, border: `2px solid ${INK}`, opacity: (1 - q) * 0.45}} />;
          })
        : null}
      {ring && ring.k > 0 && ring.k < 1 ? (
        <div
          style={{
            position: 'absolute',
            left: fx(ring.x) - 50,
            top: fy(ring.y) - 50,
            width: 100,
            height: 100,
            borderRadius: 50,
            border: '4px solid rgba(11,11,11,0.9)',
            boxShadow: '0 0 0 3px rgba(255,255,255,0.75)',
            opacity: 1 - ring.k,
            transform: `scale(${0.55 + 0.6 * ring.k})`,
          }}
        />
      ) : null}
    </div>
  );
};

// ---- STREET NAMES ------------------------------------------------------------------------------------------------------------
const CARD19: Region = {x0: 0.05, y0: 0.426, x1: 0.95, y1: 0.517};
export const Streets: React.FC = () => {
  const t = useCurrentFrame();
  const base = fr(shot('streets').from);
  const L = (n: string) => fr(ev(n)) - base;
  const tap = L('tap19');
  const c2 = L('cstreet');
  const end = fr(shot('streets').to) - base;
  const view: View = {x: 0.5, y: 0.4, zoom: 1.15};
  const k = E.out(sp(t, tap + 3, 140, 20));
  const from = onScreen(CARD19, view);
  const tw = 930;
  const to: Rect = {x: 540 - tw / 2, y: 820, w: tw, h: (tw * (CARD19.y1 - CARD19.y0) * SRC_H) / ((CARD19.x1 - CARD19.x0) * SRC_W)};
  const enter = sp(t, -6, 170, 24);
  const bandA = clamp((t - tap - 8) / 6);
  const band = t < c2 ? {y0: 0.443, y1: 0.462, x0: 0.19, x1: 0.82, a: bandA} : {y0: 0.462, y1: 0.482, x0: 0.19, x1: 0.82, a: 1};
  const bandMove = E.inOut(prog(t, c2, 8));
  const bandNow = {...band, y0: lerp(0.443, 0.462, t < c2 ? 0 : bandMove), y1: lerp(0.462, 0.482, t < c2 ? 0 : bandMove)};
  return (
    <div style={{position: 'absolute', inset: 0, background: '#FFFFFF', transform: `scale(${1 + 0.02 * clamp(t / end)})`, transformOrigin: '540px 900px'}}>
      <div style={{position: 'absolute', inset: 0, transform: `translateY(${(1 - enter) * 60}px)`}}>
        <Iphone cx={540} cy={PCY} w={PW} src="19-nav-streets-offer" view={view} />
      </div>
      <Lift src="19-nav-streets-offer" r={CARD19} from={from} to={to} k={k} radius={28} band={bandNow} ring={{x: 0.127, y: 0.471, k: prog(t, tap, 14)}} pulse={{x: 0.127, y: 0.471, on: t > tap + 4 && t < end - 4, t}} />
    </div>
  );
};

// ---- MANY SETTINGS -------------------------------------------------------------------------------------------------------------
const UNPAVED: Region = {x0: 0.05, y0: 0.84, x1: 0.95, y1: 0.903};
const HUMOUR: Region = {x0: 0.05, y0: 0.478, x1: 0.95, y1: 0.574};
const MAIN: Region = {x0: 0.05, y0: 0.252, x1: 0.95, y1: 0.348};
export const Settings: React.FC = () => {
  const t = useCurrentFrame();
  const base = fr(shot('settings').from);
  const L = (n: string) => fr(ev(n)) - base;
  const n6a = L('n6a');
  const scroll = L('scroll');
  const n6b = L('n6b');
  const gam = L('gamorte');
  const main = L('mainOnly');
  const cricket = L('cricket');
  const end = fr(shot('settings').to) - base;
  // the screen scrolls: the unpaved row (low), a fast flick up past quotes and stories to humour, then up to "only the main"
  const vLow: View = {x: 0.5, y: 0.78, zoom: 1.15};
  const vMid: View = {x: 0.5, y: 0.53, zoom: 1.15};
  const vTop: View = {x: 0.5, y: 0.32, zoom: 1.15};
  const f1 = E.inOut(prog(t, scroll, 14));
  const f2 = E.inOut(prog(t, main - 4, 12));
  const vy = lerp(lerp(vLow.y, vMid.y, f1), vTop.y, f2);
  const view: View = {x: 0.5, y: vy, zoom: 1.15};
  const tw = 930;
  const rect = (r: Region): Rect => ({x: 540 - tw / 2, y: 0, w: tw, h: (tw * (r.y1 - r.y0) * SRC_H) / ((r.x1 - r.x0) * SRC_W)});
  const place = (r: Region, y: number): Rect => ({...rect(r), y});
  const kU = sp(t, n6a - 2, 150, 20) * (1 - sp(t, scroll - 4, 200, 24));
  const kH = sp(t, n6b - 3, 150, 20) * (1 - sp(t, main - 6, 200, 24));
  const kM = sp(t, main + 6, 150, 20);
  // the quick bands on the rows the flick passes (quotes, Nelson's stories), drawn on the screen itself
  const flash = (a: number) => (t >= a && t < a + 4 ? 1 : 0);
  const fQ = flash(scroll + 5);
  const fS = flash(scroll + 9);
  const bandOnScreen = fQ ? {y: 0.668, h: 0.076, a: 1} : fS ? {y: 0.582, h: 0.064, a: 1} : null;
  const enter = sp(t, -6, 170, 24);
  // the cricket: hops in, chirps once
  const ck = t >= cricket - 6 ? clamp((t - cricket + 6) / 6) : 0;
  const hop = ck < 1 ? Math.sin(ck * Math.PI) * 60 : 0;
  return (
    <div style={{position: 'absolute', inset: 0, background: '#FFFFFF', transform: `scale(${1 + 0.02 * clamp(t / end)})`, transformOrigin: '540px 900px'}}>
      <div style={{position: 'absolute', inset: 0, transform: `translateY(${(1 - enter) * 60}px)`}}>
        <Iphone cx={540} cy={PCY} w={PW} src="20-nav-streets-settings" view={view} band={bandOnScreen ? {y: bandOnScreen.y, h: bandOnScreen.h, a: 1} : null} fog={0.25} />
      </div>
      <Lift src="20-nav-streets-settings" r={UNPAVED} from={onScreen(UNPAVED, view)} to={place(UNPAVED, 1060)} k={kU} band={{y0: 0.852, y1: 0.89, x0: 0.18, x1: 0.68, a: clamp((t - n6a) / 6)}} />
      <Lift src="20-nav-streets-settings" r={HUMOUR} from={onScreen(HUMOUR, view)} to={place(HUMOUR, 760)} k={kH} band={t >= gam ? {y0: 0.505, y1: 0.548, x0: 0.79, x1: 0.93, a: clamp((t - gam) / 4)} : {y0: 0.49, y1: 0.507, x0: 0.18, x1: 0.36, a: clamp((t - n6b) / 6)}} />
      <Lift src="20-nav-streets-settings" r={MAIN} from={onScreen(MAIN, view)} to={place(MAIN, 640)} k={kM} band={{y0: 0.26, y1: 0.335, x0: 0.18, x1: 0.72, a: clamp((t - main - 10) / 6)}} />
      {ck > 0 ? (
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <g transform={`translate(${lerp(-60, 150, ck)} ${1340 - hop})`} fill="none" stroke={INK} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
            {/* a small line-art cricket */}
            <ellipse cx={0} cy={0} rx={30} ry={12} fill="#FFFFFF" />
            <circle cx={34} cy={-4} r={9} fill="#FFFFFF" />
            <path d="M40 -10 Q70 -40 92 -30 M40 -8 Q66 -30 84 -18" />
            <path d="M-6 8 L-20 26 L-34 30 M10 8 L4 28 M-24 -6 L-50 -30 L-58 6" />
            {t >= cricket && t < cricket + 10 ? <path d="M-60 -50 l-10 -10 M-44 -58 l-4 -14 M-76 -36 l-14 -6" stroke={INK} /> : null}
          </g>
        </svg>
      ) : null}
    </div>
  );
};
