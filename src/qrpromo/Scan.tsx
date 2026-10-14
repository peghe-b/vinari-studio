// 6 the scan and 7 the reason: the card shot's car glides up and back (a match cut on the car: it opens exactly where the
// card shot left it) while a passer-by's hand (one ink silhouette, kit/grip.tsx) brings a phone up in front of it, whole,
// growing into place (never in from off the frame). Its camera shows HER car: the windscreen close up, the card behind it
// (the same 3D car, kit/car3d.tsx); the yellow QR frame locks on the code, „vinari.ge"; a tap opens the REAL page
// (15-qr-web) in the browser, no app. The car leaves, a big tap on „მანქანა გზას მიკეტავს", the row lifts into its place,
// a large „გაიგზავნა". The phone's foot sits above the subtitle band; the sleeve leaves to the right above it.
import React from 'react';
import {Img, staticFile, useCurrentFrame} from 'remotion';
import {C, F} from '../tokens';
import {clamp, E, ev, fr, lerp, prog, shot, sp, XFADE} from './lib';
import {Car3, projectCar, type CarCam} from './kit/car3d';
import {atFoot, bodyBox, cardRect, Lift, Phone3, project, ScreenLayer, zoomAbout, type Pose, type Region} from './kit/phone3d';
import {CH as SCH, CW as SCW, LinkChip, QrFrame} from './kit/ios';
import {GripBack, GripFront} from './kit/grip';
import {CAR_DY, CARD_C, camAt} from './CardShot';

const FOOT = 1392;
const PW = 318;
const PX = 520;

// the car over the passer-by's shoulder: from the card shot's last view (camAt(1), CAR_DY) up and back to here
const CAR_UP = {r: 17.5, y: 3.5, dy: -505};
const carCam = (k: number): {cam: CarCam; dy: number} => {
  const a = 0.6;
  const r = lerp(15, CAR_UP.r, k);
  return {cam: {pos: [Math.sin(a) * r, lerp(3.6, CAR_UP.y, k), Math.cos(a) * r], target: [0, 0.6, 0.2], fov: 30}, dy: lerp(CAR_DY, CAR_UP.dy, k)};
};

const phonePose = (t: number): Pose => atFoot({x: PX, w: PW, yaw: -7 + 3 * Math.sin(t / 40), pitch: 4, roll: 3 + 1.2 * Math.sin(t / 33)}, FOOT);

// ---- the viewfinder: her windscreen close up, the card behind the glass (capture px) ----
const CHIP_Y = 1560; // the link chip's top (capture px)
// the camera's picture: capture y 250..1900 under the chrome; drawn by a car canvas of VW x VH laid over the phone's screen
// in frame space (a WebGL canvas inside the screen's 3D layer drops out of the render while that layer fades)
const V0 = 250;
const V1 = 1900;
const VW = 360;
const VH = Math.round((VW * (V1 - V0)) / SCW);
const toCap = (p: {x: number; y: number}) => ({x: (p.x / VW) * SCW, y: V0 + (p.y / VH) * (V1 - V0)});
/** the QR on the card (world metres): the card spans x -0.44..-0.08 on the glass, the code its left 0.049..0.454, up the
 *  glass (0, 0.49, -0.87) from -0.072 to +0.072 about the card's centre */
const QR_CORNERS: [number, number, number][] = (() => {
  const xs = [-0.44 + 0.36 * 0.049, -0.44 + 0.36 * 0.454];
  const us = [-0.072, 0.0724];
  const out: [number, number, number][] = [];
  for (const x of xs) for (const u of us) out.push([x, CARD_C[1] + 0.49 * u, CARD_C[2] - 0.87 * u]);
  return out;
})();
const vfCam = (t: number, lock: number, wide: number): CarCam => {
  // from the street in front of the car at a passer-by's eye height: wide on her car's front first, in on the card as it locks
  const d = lerp(lerp(5.6, 1.6, wide), 1.25, E.inOut(lock));
  const n = [0.1, 0.36, 0.93];
  const m = Math.hypot(n[0], n[1], n[2]);
  const drift = (1 - lock) * 0.035;
  const tx = CARD_C[0] + drift * Math.sin(t / 9);
  const ty = CARD_C[1] + drift * 0.6 * Math.cos(t / 11);
  return {pos: [CARD_C[0] + (n[0] / m) * d, CARD_C[1] + (n[1] / m) * d, CARD_C[2] + (n[2] / m) * d], target: [tx, ty, CARD_C[2]], fov: 30};
};

/** the camera's picture of her car, in frame space over the phone's screen (its centre, size and roll follow the screen) */
const VfView: React.FC<{pose: Pose; t: number; lock: number; wide: number; opacity: number}> = ({pose, t, lock, wide, opacity}) => {
  const cam = vfCam(t, clamp(lock), wide);
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
    <div style={{position: 'absolute', left: cx - w / 2, top: cy - h / 2, width: w, height: h, transform: `rotate(${ang.toFixed(3)}deg)`, overflow: 'hidden', opacity}}>
      <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #F3F4F6 0%, #DCDFE4 60%, #C9CDD3 100%)'}} />
      <div style={{position: 'absolute', left: 0, top: 0, width: VW, height: VH, transform: `scale(${w / VW}, ${h / VH})`, transformOrigin: '0 0'}}>
        <Car3 w={VW} h={VH} cam={cam} night={0} card cardK={1} glassA={0.42} shadow={0} />
      </div>
    </div>
  );
};

const Viewfinder: React.FC<{t: number; lock: number; chip: number; press: number; wide: number}> = ({t, lock, chip, press, wide}) => {
  const k = clamp(lock);
  const cam = vfCam(t, k, wide);
  const pts = QR_CORNERS.map((p) => toCap(projectCar(cam, p, VW, VH)));
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const qx = Math.min(...xs);
  const qy = Math.min(...ys);
  const qw = Math.max(...xs) - qx;
  const qh = Math.max(...ys) - qy;
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: SCW, height: SCH, overflow: 'hidden'}}>
      {/* the camera's own chrome: the top bar, the zoom pills, the shutter, the modes */}
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
      {/* the glass's reflection: a soft band of the sky drifting across */}
      <div style={{position: 'absolute', left: -200, top: 250, width: 520, height: 1650, background: 'linear-gradient(100deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.09) 45%, rgba(255,255,255,0) 100%)', transform: `translateX(${260 + 40 * Math.sin(t / 30)}px) skewX(-18deg)`}} />
      <QrFrame x={qx} y={qy} w={qw} h={qh} k={k} a={clamp(lock * 4)} />
      <LinkChip x={540} y={CHIP_Y} k={chip} press={press} />
    </div>
  );
};

/** a big tap in frame px (the studio's ring: ink, a white halo), so the thumb's press reads at the film's size */
const BigTap: React.FC<{x: number; y: number; k: number}> = ({x, y, k}) =>
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

const PAGE = '15-qr-web';
/** the reason row on the capture: „მანქანა გზას მიკეტავს" (x 49..1030, y 791..1000 of 1080 x 2346) */
const ROW: Region = {x0: 49 / 1080, y0: 791 / 2346, x1: 1031 / 1080, y1: 1001 / 2346};
const ROW_TO = cardRect(ROW, 940, 70, 300);

const CarStage: React.FC<{k: number; a?: number}> = ({k, a = 1}) => {
  const c = carCam(k);
  return (
    <div style={{position: 'absolute', left: 0, top: c.dy, width: 1080, height: 1920, opacity: a}}>
      <Car3 cam={c.cam} night={0} card cardK={1} glassA={0.7} />
    </div>
  );
};

export const Scan: React.FC = () => {
  const t = useCurrentFrame();
  const base = fr(shot('scan').from);
  const L = (n: string) => fr(ev(n)) - base;
  const lockAt = L('lock');
  const chipAt = L('chip');
  const tapAt = L('tapChip');
  const pageAt = L('page');
  // the car glides up and back; the phone grows into place in front, whole (opacity + a little scale, never a slide)
  const up = E.inOut(prog(t, 0, 20));
  const inK = E.out(prog(t, 11, 13)); // after most of the car's glide: the phone never sits over the moving car
  let pose = phonePose(t);
  pose = zoomAbout(pose, lerp(0.9, 1, inK), PX, FOOT);
  const b = bodyBox(pose);
  const lock = E.out(prog(t, lockAt - 4, 10));
  const chip = prog(t, chipAt, 8);
  const press = clamp((t - tapAt + 1) / 3) * (1 - clamp((t - tapAt - 4) / 4));
  const pageK = E.inOut(prog(t, pageAt, 12));
  const chipP = project(pose, 0.5, (CHIP_Y + 50) / SCH);
  const wide = E.inOut(prog(t, 10, lockAt - 18));
  return (
    <div style={{position: 'absolute', inset: 0, background: C.surface, overflow: 'hidden'}}>
      <CarStage k={up} />
      <div style={{position: 'absolute', inset: 0, opacity: inK}}>
        <GripBack b={b} id="sgb" />
      </div>
      <Phone3 src="qrpromo/black.jpg" pose={pose} look={1} rim={1} shadow={0.6} opacity={inK} />
      {pageK < 1 ? <VfView pose={pose} t={t} lock={lock} wide={wide} opacity={inK} /> : null}
      <div style={{position: 'absolute', inset: 0, opacity: inK}}>
        <ScreenLayer pose={pose}>
          <Viewfinder t={t} lock={lock} chip={chip} press={press} wide={wide} />
          {pageK > 0 ? (
            <div style={{position: 'absolute', left: 0, top: SCH * (1 - pageK), width: SCW, height: SCH, borderRadius: 60 * (1 - pageK), overflow: 'hidden', boxShadow: '0 -20px 60px rgba(0,0,0,0.3)'}}>
              <Img src={staticFile(`screens/${PAGE}.jpg`)} style={{position: 'absolute', left: 0, top: 0, width: SCW, height: SCH}} />
            </div>
          ) : null}
        </ScreenLayer>
        <GripFront b={b} id="sgf" />
        <BigTap x={chipP.x} y={chipP.y} k={(t - tapAt) / 14} />
      </div>
    </div>
  );
};

export const Reason: React.FC = () => {
  const t = useCurrentFrame();
  const base = fr(shot('reason').from);
  const len = fr(shot('reason').to) - base;
  const scanLen = base - fr(shot('scan').from);
  const L = (n: string) => fr(ev(n)) - base;
  const tapAt = L('tapRow');
  const liftAt = L('rowLift');
  const sentAt = L('sent');
  // the same phone as the scan's (its float continues), a little closer to the page
  let pose = phonePose(t + scanLen);
  const push = E.inOut(prog(t, 0, 20));
  pose = atFoot({...pose, w: pose.w * (1 + 0.05 * push)}, FOOT);
  // the exit: under the next shot's dissolve the phone and everything with it recede and fade (inside the frame)
  const out = E.inOut(prog(t, len - 2, XFADE + 2));
  pose = zoomAbout(pose, 1 - 0.06 * out, PX, FOOT);
  const b = bodyBox(pose);
  // the car leaves before the row lifts into its place
  const carA = 1 - E.inOut(prog(t, tapAt - 10, 10));
  const liftK = sp(t, liftAt, 150, 18) * (1 - E.inOut(prog(t, sentAt - 4, 10)));
  const band = clamp((t - tapAt) / 5);
  const sentK = E.outBack(prog(t, sentAt, 10));
  const rowP = project(pose, 0.36, (ROW.y0 + ROW.y1) / 2);
  const pillY = ROW_TO.y + 30;
  const pillOut = E.inOut(prog(t, len - 10, 9));
  return (
    <div style={{position: 'absolute', inset: 0, background: C.surface, overflow: 'hidden'}}>
      {carA > 0.001 ? <CarStage k={1} a={carA} /> : null}
      <div style={{position: 'absolute', inset: 0}}>
        <GripBack b={b} id="rgb" />
        <Phone3 src={PAGE} pose={pose} look={1} rim={1} shadow={0.6} veil={0.35 * clamp(liftK)} band={{x: ROW.x0, y: ROW.y0, w: ROW.x1 - ROW.x0, h: ROW.y1 - ROW.y0, a: band * (1 - clamp(liftK))}} />
        <GripFront b={b} id="rgf" />
        <BigTap x={rowP.x} y={rowP.y} k={(t - tapAt) / 14} />
        {t >= liftAt - 1 && liftK > 0.001 ? <Lift src={PAGE} r={ROW} pose={pose} to={ROW_TO} k={liftK} radius={40} band={{x0: ROW.x0 + 0.012, y0: ROW.y0 + 0.006, x1: ROW.x1 - 0.012, y1: ROW.y1 - 0.006, a: 1}} /> : null}
        {sentK > 0 ? (
          <div
            style={{
              position: 'absolute',
              left: 540 - 290,
              top: pillY,
              width: 580,
              height: 136,
              borderRadius: 68,
              background: C.ink,
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 26,
              fontFamily: F.sans,
              fontWeight: 600,
              fontSize: 58,
              opacity: clamp(sentK * 1.5) * (1 - pillOut),
              transform: `translateY(${(1 - clamp(sentK)) * 30}px) scale(${0.8 + 0.2 * sentK})`,
              boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
            }}
          >
            <svg width={76} height={76} viewBox="0 0 24 24">
              <circle cx={12} cy={12} r={11} fill="#34C759" />
              <path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={16} strokeDashoffset={16 * (1 - clamp((t - sentAt - 2) / 6))} />
            </svg>
            გაიგზავნა
          </div>
        ) : null}
      </div>
    </div>
  );
};
