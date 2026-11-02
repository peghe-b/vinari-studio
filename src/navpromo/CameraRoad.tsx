// CAMERA AND LIMIT, a joke that proves a feature: a road in one-point perspective in ink line art; a speed camera on a pole
// ahead right; the app's REAL speed sign (the red-ring '50' cropped from 17-nav-drive, never edited) pops big at the upper
// right; the hero car rolls on calmly; a green check on „ლიმიტში თუ ხარ"; on „ის უბრალოდ ყუთია" the camera turns into a plain
// cardboard box with a taped flap, and a deadpan hold. The drawn camera is the camera, the crop is the limit.
import React, {useId} from 'react';
import {Img, staticFile, useCurrentFrame} from 'remotion';
import {Car} from './kit/car';
import {IlloDefs} from './kit/solid';
import {clamp, E, ev, fr, GREEN, INK, INK3, lerp, prog, shot, sp} from './lib';
import {SRC_H, SRC_W} from './Iphone';

const W = 1080;
const H = 1920;
const HY = 760; // the horizon
const VX = 540;

/** a point on the ground: lateral offset u (road units, 0 the centre), depth z (1 near .. large far) */
const gp = (u: number, z: number): [number, number] => [VX + (u * 520) / z, HY + 1160 / z];

export const CameraRoad: React.FC = () => {
  const t = useCurrentFrame();
  const uid = useId();
  const base = fr(shot('camera').from);
  const end = fr(shot('camera').to) - base;
  const L = (n: string) => fr(ev(n)) - base;
  const sign = L('sign');
  const check = L('check');
  const box = L('box');
  const morph = E.inOut(prog(t, box, 6));
  // the car: from near to farther, calmly; it stays above the subtitle line (its wheels at y 1350 and up)
  const z = lerp(1.95, 3.1, E.sine(clamp(t / end)));
  const [cx, cy] = gp(0.36, z);
  const len = 900 / z;
  // the road
  const edgeL = [gp(-1.3, 1), gp(-1.3, 60)];
  const edgeR = [gp(1.3, 0.7), gp(1.3, 60)];
  const dashes = Array.from({length: 14}, (_, i) => {
    const z0 = 0.8 + i * 0.9 + ((t * 0.06) % 0.9);
    return [gp(0, z0), gp(0, z0 + 0.38)];
  });
  const posts = Array.from({length: 8}, (_, i) => 0.9 + i * 1.35 + ((t * 0.06) % 1.35));
  // the pole and its camera: ahead right
  const [px, py] = gp(1.65, 2.6);
  const signK = sp(t, sign, 220, 14);
  const checkK = sp(t, check, 260, 14);
  // the speed sign: a round crop of the capture, exactly the sign (measured: its red ring centred on capture px (986, 547),
  // radius 63), so none of the map or the street label behind it comes along
  const SIGN = {cx: 986, cy: 547, r: 64.5};
  const sw = 200; // the crop's diameter on screen
  const k = sw / (2 * SIGN.r);
  const iw = SRC_W * k;
  const ih = SRC_H * k;
  const sh = sw;
  return (
    <div style={{position: 'absolute', inset: 0, background: '#FFFFFF'}}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
        <IlloDefs uid={uid} />
        <rect width={W} height={H} fill="#FFFFFF" />
        <g transform={`translate(540 900) scale(${1 + 0.035 * clamp(t / end) + (t >= box ? 0.015 * Math.exp(-(t - box) / 6) : 0)}) translate(-540 -900)`}>
          {/* far hills and the horizon */}
          <path d={`M-40 ${HY} Q180 ${HY - 90} 360 ${HY - 30} T720 ${HY - 60} T1120 ${HY - 20}`} fill="none" stroke={INK3} strokeWidth={2} />
          <line x1={-40} y1={HY} x2={1120} y2={HY} stroke={INK} strokeWidth={2} />
          <line x1={edgeL[0][0]} y1={edgeL[0][1]} x2={edgeL[1][0]} y2={edgeL[1][1]} stroke={INK} strokeWidth={2.6} />
          <line x1={edgeR[0][0]} y1={edgeR[0][1]} x2={edgeR[1][0]} y2={edgeR[1][1]} stroke={INK} strokeWidth={2.6} />
          {dashes.map(([a, b2], i) => (
            <line key={i} x1={a[0]} y1={a[1]} x2={b2[0]} y2={b2[1]} stroke={INK3} strokeWidth={Math.max(1.5, 10 / (0.8 + i * 0.9))} strokeLinecap="round" />
          ))}
          {posts.map((zz, i) => {
            const [x1, y1] = gp(-1.75, zz);
            const h = 120 / zz;
            return <line key={i} x1={x1} y1={y1} x2={x1} y2={y1 - h} stroke={INK} strokeWidth={Math.max(1.5, 6 / zz)} />;
          })}
          {/* the pole */}
          <line x1={px} y1={py} x2={px} y2={py - 330} stroke={INK} strokeWidth={4} />
          <line x1={px} y1={py - 300} x2={px - 40} y2={py - 300} stroke={INK} strokeWidth={4} />
          {/* the camera, then the box */}
          <g opacity={1 - morph}>
            <rect x={px - 112} y={py - 350} width={84} height={58} rx={8} fill="#FFFFFF" stroke={INK} strokeWidth={3} />
            <rect x={px - 132} y={py - 340} width={22} height={38} rx={5} fill="#FFFFFF" stroke={INK} strokeWidth={3} />
            <circle cx={px - 121} cy={py - 321} r={9} fill={INK} />
            <path d={`M${px - 116} ${py - 356} L${px - 22} ${py - 356}`} stroke={INK} strokeWidth={3} />
          </g>
          <g opacity={morph} transform={`translate(${px - 70} ${py - 320}) scale(${lerp(0.7, 1, morph)}) translate(${-(px - 70)} ${-(py - 320)})`}>
            <path d={`M${px - 120} ${py - 300} L${px - 20} ${py - 300} L${px - 20} ${py - 368} L${px - 120} ${py - 368} Z`} fill="#D8B27A" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
            <path d={`M${px - 120} ${py - 368} L${px - 94} ${py - 392} L${px + 6} ${py - 392} L${px - 20} ${py - 368}`} fill="#C69B5E" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
            <path d={`M${px - 20} ${py - 300} L${px + 6} ${py - 324} L${px + 6} ${py - 392}`} fill="#B98C52" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
            <rect x={px - 78} y={py - 368} width={16} height={68} fill="#EFE3C8" stroke={INK} strokeWidth={1.5} />
            <path d={`M${px - 120} ${py - 368} L${px - 150} ${py - 352} L${px - 124} ${py - 338}`} fill="#C69B5E" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
          </g>
          <Car uid={uid} x={cx} y={cy} len={len} view="rear" body="ev" paint="a" frame={t} speed={0.3} lights={{tail: 0.5}} />
        </g>
      </svg>
      {/* the app's own speed sign, a crop of the real capture */}
      {t >= sign ? (
        <div style={{position: 'absolute', left: 870 - sw / 2, top: 465 - sh / 2, width: sw, height: sh, overflow: 'hidden', borderRadius: '50%', transform: `scale(${signK})`, background: '#FFFFFF', boxShadow: '0 10px 30px rgba(0,0,0,0.14)'}}>
          <Img src={staticFile('screens/17-nav-drive.jpg')} style={{position: 'absolute', left: -(SIGN.cx - SIGN.r) * k, top: -(SIGN.cy - SIGN.r) * k, width: iw, height: ih}} />
        </div>
      ) : null}
      {t >= check ? (
        <svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
          <g transform={`translate(726 470) scale(${checkK})`}>
            <circle r={36} fill={GREEN} />
            <path d="M-16 0 L-4 13 L18 -12" fill="none" stroke="#FFFFFF" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </svg>
      ) : null}
    </div>
  );
};
