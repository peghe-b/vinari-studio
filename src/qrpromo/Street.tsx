// 10 street + 11 ots (v4, the owner: "draw the passer-by scene properly and beautifully: a refined man, a real street around
// the car, his walk, the raise of the phone, over the shoulder").
//
// STREET: her car parked at the kerb of a real Tbilisi street (kit/street.tsx: the far houses with their balconies and shop
// fronts, lamps, plane trees, the pavement's slabs), seen from the pavement by the car's own camera so street, car and man
// share one perspective. A young man in a dark overcoat (kit/man.tsx) walks in along the pavement from the right, slows,
// stops at her car's front corner and raises his phone at the windscreen; the camera pushes in on him (its lens narrows).
// OTS: cut behind his shoulder: his head and collar dark in the right foreground, his hand holding the 3D phone; its camera
// shows her windscreen and the card; the yellow frame locks on the code, „vinari.ge"; on „აპიც არ სჭირდება." a tap opens
// the REAL page (15-qr-web) in the browser, no app. The phone is whole, its foot above the subtitle band.
import React from 'react';
import {Img, staticFile, useCurrentFrame} from 'remotion';
import {F} from '../tokens';
import {clamp, E, ev, fr, lerp, prog, shot} from './lib';
import {Car3, projectCar, type CarCam} from './kit/car3d';
import {atFoot, bodyBox, Phone3, project, ScreenLayer, type Pose} from './kit/phone3d';
import {CH as SCH, CW as SCW, LinkChip, QrFrame} from './kit/ios';
import {GripBack, GripFront} from './kit/grip';
import {CARD_C} from './CardShot';
import {Man} from './kit/man';
import {Street as StreetWorld, viewOf} from './kit/street';
import {silPal} from './kit/sil/sil';
import type {Pt} from '../scenes/illo/rig';

export const FOOT = 1392;
export const PW = 334;
export const PX = 520;
export const PAGE = '15-qr-web';
/** his skin in the white world's daylight: a soft neutral light, a touch warm */
export const MAN_PAL = silPal({light: true, hue: '#B89A84', b: '#6A6A6A', time: 'day', level: 1});

// ---- the street shot's camera: from the pavement, the car's front three-quarter, the street receding ------------------
// v4 fix (the art director: "the front bumper is off the left edge for the whole shot"): the camera further along the
// pavement, aimed at the car's middle; its push stops while the car is still whole (the owner's rule: cars are never cut)
const S_CAM0: CarCam = {pos: [7.5, 1.6, 13.5], target: [0.2, 0.95, 0.8], fov: 32};
const S_CAM1: CarCam = {pos: [7.45, 1.6, 13.4], target: [0.24, 0.96, 0.82], fov: 30};
const mixCam = (a: CarCam, b: CarCam, k: number): CarCam => ({
  pos: [lerp(a.pos[0], b.pos[0], k), lerp(a.pos[1], b.pos[1], k), lerp(a.pos[2], b.pos[2], k)],
  target: [lerp(a.target[0], b.target[0], k), lerp(a.target[1], b.target[1], k), lerp(a.target[2], b.target[2], k)],
  fov: lerp(a.fov, b.fov, k),
});
// his walk on the pavement (metres): in from behind the car's tail, to its front corner
const MAN_FROM: Pt = [2.45, -3.4];
const MAN_AT: Pt = [2.0, 1.75];
const MAN_H = 1.8;
/** one gait cycle (two steps) covers this much ground (m): the feet never slide */
const CYCLE = 1.32;

export const Street: React.FC = () => {
  const t = useCurrentFrame();
  const base = fr(shot('street').from);
  const len = fr(shot('street').to) - base;
  const stopAt = fr(ev('stop')) - base;
  const raiseAt = fr(ev('raise')) - base;
  // the walk: a steady pace that slows into the stop
  const wk = clamp(t / Math.max(1, stopAt));
  const along = 0.82 * wk + 0.18 * E.out2(wk);
  const pos: Pt = [lerp(MAN_FROM[0], MAN_AT[0], along), lerp(MAN_FROM[1], MAN_AT[1], along)];
  const dist = Math.hypot(MAN_AT[0] - MAN_FROM[0], MAN_AT[1] - MAN_FROM[1]) * along;
  const phase = 0.1 + dist / CYCLE;
  const settle = E.inOut(prog(t, stopAt - 4, 9));
  const raise = E.inOut(prog(t, raiseAt, 11));
  const k = E.inOut(prog(t, 0, len));
  const camK = mixCam(S_CAM0, S_CAM1, k);
  const V = viewOf(camK);
  const foot = V.pt([pos[0], 0.14, pos[1]]);
  const head = V.pt([pos[0], 0.14 + MAN_H, pos[1]]);
  const size = foot && head ? foot[1] - head[1] : 0;
  return (
    <div style={{position: 'absolute', inset: 0, background: '#F4F4F4', overflow: 'hidden'}}>
      <StreetWorld cam={camK} uid="sw" />
      <Car3 cam={camK} night={0} card cardK={1} glassA={0.62} shadow={1} />
      {foot && head ? (
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <Man uid="smn" x={foot[0]} y={foot[1]} size={size} pal={MAN_PAL} flip pose={{walk: phase, stride: 330, raise, nod: 2, settle}} />
        </svg>
      ) : null}
    </div>
  );
};

// ---- the over-the-shoulder shot ----------------------------------------------------------------------------------------
/** the OTS camera: behind his left shoulder, looking at her windscreen's card */
const O_CAM: CarCam = {pos: [2.55, 1.78, 3.05], target: [CARD_C[0] + 0.1, CARD_C[1] - 0.05, CARD_C[2]], fov: 40};

export const phonePose = (t: number): Pose => atFoot({x: PX, w: PW, yaw: -7 + 3 * Math.sin(t / 40), pitch: 4, roll: 3 + 1.2 * Math.sin(t / 33)}, FOOT);

// the camera's picture: capture y 250..1900 under the chrome; drawn by a car canvas of VW x VH laid over the phone's screen
// in frame space (a WebGL canvas inside the screen's 3D layer drops out of the render while that layer fades)
const CHIP_Y = 1560;
const V0 = 250;
const V1 = 1900;
const VW = 360;
const VH = Math.round((VW * (V1 - V0)) / SCW);
const toCap = (p: {x: number; y: number}) => ({x: (p.x / VW) * SCW, y: V0 + (p.y / VH) * (V1 - V0)});
const QR_CORNERS: [number, number, number][] = (() => {
  const xs = [-0.44 + 0.36 * 0.049, -0.44 + 0.36 * 0.454];
  const us = [-0.072, 0.0724];
  const out: [number, number, number][] = [];
  for (const x of xs) for (const u of us) out.push([x, CARD_C[1] + 0.49 * u, CARD_C[2] - 0.87 * u]);
  return out;
})();
const vfCam = (t: number, lock: number): CarCam => {
  const d = lerp(1.9, 1.25, E.inOut(lock));
  const n = [0.32, 0.36, 0.88];
  const m = Math.hypot(n[0], n[1], n[2]);
  const drift = (1 - lock) * 0.035;
  const tx = CARD_C[0] + drift * Math.sin(t / 9);
  const ty = CARD_C[1] + drift * 0.6 * Math.cos(t / 11);
  return {pos: [CARD_C[0] + (n[0] / m) * d, CARD_C[1] + (n[1] / m) * d, CARD_C[2] + (n[2] / m) * d], target: [tx, ty, CARD_C[2]], fov: 30};
};

/** the camera's picture of her car, in frame space over the phone's screen (its centre, size and roll follow the screen) */
const VfView: React.FC<{pose: Pose; t: number; lock: number}> = ({pose, t, lock}) => {
  const cam = vfCam(t, clamp(lock));
  const tl = project(pose, 0, V0 / SCH);
  const tr = project(pose, 1, V0 / SCH);
  const bl = project(pose, 0, V1 / SCH);
  const br = project(pose, 1, V1 / SCH);
  const w = (Math.hypot(tr.x - tl.x, tr.y - tl.y) + Math.hypot(br.x - bl.x, br.y - bl.y)) / 2;
  const h = (Math.hypot(bl.x - tl.x, bl.y - tl.y) + Math.hypot(br.x - tr.x, br.y - tr.y)) / 2;
  const cx = (tl.x + tr.x + bl.x + br.x) / 4;
  const cy = (tl.y + tr.y + bl.y + br.y) / 4;
  const ang = (Math.atan2(tr.y - tl.y, tr.x - tl.x) * 180) / Math.PI;
  return (
    <div style={{position: 'absolute', left: cx - w / 2, top: cy - h / 2, width: w, height: h, transform: `rotate(${ang.toFixed(3)}deg)`, overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: VW, height: VH, transform: `scale(${w / VW}, ${h / VH})`, transformOrigin: '0 0'}}>
        <StreetWorld cam={cam} uid="vfs" w={VW} h={VH} nearTree={false} />
        <Car3 w={VW} h={VH} cam={cam} night={0} card cardK={1} glassA={0.42} shadow={0} />
      </div>
    </div>
  );
};

const Viewfinder: React.FC<{t: number; lock: number; chip: number; press: number}> = ({t, lock, chip, press}) => {
  const k = clamp(lock);
  const cam = vfCam(t, k);
  const pts = QR_CORNERS.map((p) => toCap(projectCar(cam, p, VW, VH)));
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const qx = Math.min(...xs);
  const qy = Math.min(...ys);
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: SCW, height: SCH, overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: 0, top: 0, width: SCW, height: 250, background: '#000'}} />
      <div style={{position: 'absolute', left: 0, top: 1900, width: SCW, height: 446, background: '#000'}} />
      <div style={{position: 'absolute', left: 0, top: 1960, width: SCW, display: 'flex', justifyContent: 'center', gap: 56, fontFamily: F.sans, fontSize: 36, fontWeight: 600}}>
        {['ვიდეო', 'ფოტო', 'პორტრეტი'].map((m) => (
          <span key={m} style={{color: m === 'ფოტო' ? '#FFD60A' : 'rgba(255,255,255,0.75)'}}>{m}</span>
        ))}
      </div>
      <div style={{position: 'absolute', left: 540 - 86, top: 2060, width: 172, height: 172, borderRadius: 86, border: '8px solid #FFFFFF', boxSizing: 'border-box', padding: 10}}>
        <div style={{width: '100%', height: '100%', borderRadius: '50%', background: '#FFFFFF'}} />
      </div>
      <div style={{position: 'absolute', left: 540 - 130, top: 1800, display: 'flex', gap: 22}}>
        {['.5', '1×', '3'].map((z) => (
          <div key={z} style={{width: 76, height: 76, borderRadius: 38, background: 'rgba(0,0,0,0.45)', color: z === '1×' ? '#FFD60A' : '#FFFFFF', fontFamily: F.sans, fontSize: 28, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            {z}
          </div>
        ))}
      </div>
      <div style={{position: 'absolute', left: -200, top: 250, width: 520, height: 1650, background: 'linear-gradient(100deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.09) 45%, rgba(255,255,255,0) 100%)', transform: `translateX(${260 + 40 * Math.sin(t / 30)}px) skewX(-18deg)`}} />
      <QrFrame x={qx} y={qy} w={Math.max(...xs) - qx} h={Math.max(...ys) - qy} k={k} a={clamp(lock * 4)} />
      <LinkChip x={540} y={CHIP_Y} k={chip} press={press} />
    </div>
  );
};

/** a big tap in frame px (the studio's ring: ink, a white halo), so the thumb's press reads at the film's size */
export const BigTap: React.FC<{x: number; y: number; k: number}> = ({x, y, k}) =>
  k > 0 && k < 1 ? (
    <div
      style={{
        position: 'absolute',
        left: x - 44,
        top: y - 44,
        width: 88,
        height: 88,
        borderRadius: 44,
        border: '6px solid rgba(11,11,11,0.9)',
        boxShadow: '0 0 0 5px rgba(255,255,255,0.85)',
        opacity: 1 - k,
        transform: `scale(${0.45 + 0.75 * E.out(k)})`,
      }}
    />
  ) : null;

/** his head and collar seen from behind his left shoulder (frame px), dark against the street, a rim of daylight on the
 *  ear's edge and the collar; it drifts a little with his breath */
const ManBack: React.FC<{t: number; dx: number}> = ({t, dx}) => {
  const b = 3 * Math.sin(t / 19);
  const ink = '#0E0E10';
  const [deep, shadow, half] = MAN_PAL.lit;
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
      <defs>
        <linearGradient id="mbneck" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={half} />
          <stop offset="0.5" stopColor={shadow} />
          <stop offset="1" stopColor={deep} />
        </linearGradient>
        <linearGradient id="mbhair" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3A3A40" />
          <stop offset="0.4" stopColor={ink} />
        </linearGradient>
      </defs>
      <g transform={`translate(${dx} ${b})`}>
        {/* the neck's sliver and the ear (lit from the street) */}
        <path d="M842 640C836 700 838 760 850 820L960 830C966 760 962 690 952 640Z" fill="url(#mbneck)" />
        <path d="M838 520C826 516 818 528 820 546C822 576 832 604 846 612C856 614 860 600 858 580Z" fill={shadow} />
        <path d="M836 536C832 552 836 576 846 592" stroke={deep} strokeWidth={3} fill="none" opacity={0.6} />
        {/* the back of his head: the short cut, its crown and the nape */}
        <path d="M830 470C832 380 900 330 980 336C1060 342 1110 400 1110 500C1110 580 1090 640 1060 664C1010 690 940 680 880 650C852 636 842 600 846 560C840 536 832 500 830 470Z" fill="url(#mbhair)" />
        <path d="M852 420C880 370 930 350 990 354" stroke="#5A5A62" strokeWidth={3} fill="none" opacity={0.6} />
        {/* the coat: the turned-up collar, the shoulder's mass out of the frame */}
        <path d="M800 1920L790 1060C792 930 820 840 860 800L846 700C880 720 920 734 970 734C1010 734 1050 724 1080 708L1100 1920Z" fill={ink} />
        <path d="M846 700C880 720 920 734 970 734L962 800C920 802 880 792 852 776Z" fill="#1A1A1E" />
        <path d="M846 700L852 776" stroke="#6A6A72" strokeWidth={2.4} opacity={0.7} />
        <path d="M790 1060C792 930 820 840 860 800" stroke="#5A5A62" strokeWidth={3} fill="none" opacity={0.55} />
      </g>
    </svg>
  );
};

export const Ots: React.FC = () => {
  const t = useCurrentFrame();
  const base = fr(shot('ots').from);
  const len = fr(shot('ots').to) - base;
  const L = (n: string) => fr(ev(n)) - base;
  const lockAt = L('lock');
  const chipAt = L('chip');
  const tapAt = L('tapChip');
  const pageAt = L('page');
  // the camera settles a little after the cut (it came from the push on him)
  const settle = E.out(prog(t, 0, 14));
  const k = E.inOut(prog(t, 0, len));
  const cam: CarCam = {...O_CAM, pos: [O_CAM.pos[0] + 0.12 * (1 - settle), O_CAM.pos[1], O_CAM.pos[2] + 0.18 * (1 - settle) - 0.08 * k], fov: O_CAM.fov - 2 * k};
  const pose = phonePose(t);
  const p0 = {...pose, y: pose.y + 40 * (1 - settle)};
  const b = bodyBox(p0);
  const lock = E.out(prog(t, lockAt - 4, 9));
  const chip = prog(t, chipAt, 7);
  const press = clamp((t - tapAt + 1) / 3) * (1 - clamp((t - tapAt - 4) / 4));
  const pageK = E.inOut(prog(t, pageAt, 11));
  const chipP = project(p0, 0.5, (CHIP_Y + 50) / SCH);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#F4F4F4', overflow: 'hidden'}}>
      <StreetWorld cam={cam} uid="os" nearTree={false} />
      <Car3 cam={cam} night={0} card cardK={1} glassA={0.62} shadow={1} />
      <ManBack t={t} dx={40 * (1 - settle)} />
      <GripBack b={b} id="ogb" skin={MAN_PAL.lit} />
      <Phone3 src="qrpromo/black.jpg" pose={p0} look={1} rim={1} shadow={0.6} />
      {pageK < 1 ? <VfView pose={p0} t={t} lock={lock} /> : null}
      <ScreenLayer pose={p0}>
        <Viewfinder t={t} lock={lock} chip={chip} press={press} />
        {pageK > 0 ? (
          <div style={{position: 'absolute', left: 0, top: SCH * (1 - pageK), width: SCW, height: SCH, borderRadius: 60 * (1 - pageK), overflow: 'hidden', boxShadow: '0 -20px 60px rgba(0,0,0,0.3)'}}>
            <Img src={staticFile(`screens/${PAGE}.jpg`)} style={{position: 'absolute', left: 0, top: 0, width: SCW, height: SCH}} />
          </div>
        ) : null}
      </ScreenLayer>
      <GripFront b={b} id="ogf" skin={MAN_PAL.lit} />
      <BigTap x={chipP.x} y={chipP.y} k={(t - tapAt) / 14} />
    </div>
  );
};

/** the OTS's background (the street and her car) as it is at the shot's end: the options shot lifts it away */
export const OtsBack: React.FC<{a?: number}> = ({a = 1}) => {
  const cam: CarCam = {...O_CAM, pos: [O_CAM.pos[0], O_CAM.pos[1], O_CAM.pos[2] - 0.08], fov: O_CAM.fov - 2};
  return (
    <div style={{position: 'absolute', inset: 0, opacity: a}}>
      <StreetWorld cam={cam} uid="ob" nearTree={false} />
      <Car3 cam={cam} night={0} card cardK={1} glassA={0.62} shadow={1} />
    </div>
  );
};
