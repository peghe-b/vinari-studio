// 12a-c the three reasons (v4, the owner: "more graphics, many more shots"): while the narrator names each button, the film
// cuts away from the phone to what that button means, her own car in a picture of its own, with the REAL button (cropped
// from 15-qr-web, never edited) landing over it as a card:
//   opt1 „მანქანა გზას მიკეტავს" (gasasvleli an chemi manqana): seen from above, her car parked across a gateway; a
//        neighbour's car waits behind the gate, its way out drawn and stopped at her door
//   opt2 „შუქები ანთია" (gareta an salonis): night; her car with its headlamps and its cabin light left on
//   opt3 „მანქანასთან რაღაც ხდება" (signalizacia, panjara, saburavi): her car's hazards blinking, the alarm's rings
// Each cuts in on the card's landing and out on the next line; the options shot (Options.tsx) runs on underneath.
import React from 'react';
import {Img, staticFile, useCurrentFrame} from 'remotion';
import {C} from '../tokens';
import {clamp, E, ev, fr, lerp, prog, shot} from './lib';
import {Car3, projectCar, type CarCam} from './kit/car3d';
import {Street as StreetWorld, viewOf} from './kit/street';
import {PAGE} from './Street';

type P3 = [number, number, number];
// the reasons on the capture (1080 x 2346): the dashed cards run x 49..1031
const ROWS = [
  [790, 1002],
  [1042, 1254],
  [1294, 1506],
];
/** the REAL button, cropped from the page, on a white card (frame px) */
const Button: React.FC<{i: number; x: number; y: number; w: number; k: number}> = ({i, x, y, w, k}) => {
  const [y0, y1] = ROWS[i];
  const s = w / (1031 - 49);
  const h = (y1 - y0) * s;
  const q = clamp(k);
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: 40 * s * 1.4,
        overflow: 'hidden',
        background: '#FFFFFF',
        boxShadow: `0 ${30 * q}px ${70 * q}px rgba(10,14,30,${0.22 * q}), 0 0 0 ${4 * q}px ${C.accA}`,
        opacity: clamp(q * 1.6),
        transform: `translateY(${(1 - E.outBack(q)) * -70}px) scale(${0.9 + 0.1 * E.out(q)})`,
      }}
    >
      <Img src={staticFile(`screens/${PAGE}.jpg`)} style={{position: 'absolute', left: -49 * s, top: -y0 * s, width: 1080 * s, height: 2346 * s}} />
    </div>
  );
};

const useLocal = (id: string) => {
  const t = useCurrentFrame();
  const len = fr(shot(id).to) - fr(shot(id).from);
  return {t, len};
};

// ---- opt1: from above, her car across the gateway ------------------------------------------------------------------------
// v4 fix (the art director: "the other car is a primitive 2D blob, and the subtitle sits on it"): the neighbour's car is the
// SAME 3D saloon in neutral grey, nose to the gate in its yard; the street, the pavement and the yard are drawn tighter and
// the camera higher, so both cars are whole between the button card and the subtitle.
const T1: CarCam = {pos: [7.5, 31.0, 0.3], target: [3.5, 0, 0.0], fov: 36};
const WALL = 2.7; // the yard's wall (x, metres): the pavement runs from the kerb (1.22) to it
const GREY_AT: [number, number] = [5.72, 0]; // the neighbour's car, nose (-x) to the gate
export const Opt1: React.FC = () => {
  const {t, len} = useLocal('opt1');
  const k = E.inOut(prog(t, 0, len));
  const cam: CarCam = {...T1, pos: [T1.pos[0], T1.pos[1] - 1.4 * k, T1.pos[2]]};
  const V = viewOf(cam);
  const poly = (pts: P3[]) => V.poly(pts);
  const pt = (p: P3) => V.pt(p) ?? [0, 0];
  // the way out of the gate: a dashed line from the waiting car's nose toward the street, stopped at her car
  const go = clamp((t - 6) / 14);
  const a0 = pt([3.2, 0.02, 0]);
  const a1 = pt([lerp(3.2, 1.3, go), 0.02, 0]);
  const stopK = E.outBack(prog(t, 18, 8));
  const stopP = pt([1.95, 0.02, 0]);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#F4F4F4', overflow: 'hidden'}}>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        {/* the road, the kerb, the pavement, the lowered kerb of the gateway, the wall with its gate, the yard */}
        <path d={poly([[-12, 0, -40], [-12, 0, 40], [1.22, 0, 40], [1.22, 0, -40]])} fill="#E4E4E4" />
        {[-30, -24, -18, -12, -6, 0, 6, 12, 18, 24].map((z) => (
          <path key={z} d={poly([[-2.55, 0.01, z], [-2.55, 0.01, z + 3], [-2.4, 0.01, z + 3], [-2.4, 0.01, z]])} fill="#FFFFFF" />
        ))}
        <path d={poly([[1.22, 0, -40], [1.22, 0, 40], [1.4, 0, 40], [1.4, 0, -40]])} fill="#F7F7F7" />
        <path d={poly([[1.4, 0, -40], [1.4, 0, 40], [WALL, 0, 40], [WALL, 0, -40]])} fill="#EDEDED" />
        {[-14, -12.5, -11, -9.5, -8, -6.5, -5, -3.5, 3.5, 5, 6.5, 8, 9.5, 11, 12.5, 14].map((z) => (
          <path key={`s${z}`} d={poly([[1.4, 0.005, z], [WALL, 0.005, z], [WALL, 0.005, z + 0.03], [1.4, 0.005, z + 0.03]])} fill="#DCDCDC" />
        ))}
        <path d={poly([[1.22, 0, -1.9], [1.22, 0, 1.9], [WALL, 0, 1.9], [WALL, 0, -1.9]])} fill="#E2E2E2" />
        {[-1.9, 1.9].map((z) => (
          <path key={z} d={poly([[1.22, 0, z - 0.04], [1.22, 0, z + 0.04], [WALL, 0, z + 0.04], [WALL, 0, z - 0.04]])} fill="#CFCFCF" />
        ))}
        <path d={poly([[WALL, 0, -40], [WALL, 0, 40], [16, 0, 40], [16, 0, -40]])} fill="#E9E9E9" />
        {/* the yard's paving */}
        {[4.2, 5.7, 7.2, 8.7, 10.2].map((x) => (
          <path key={`y${x}`} d={poly([[x, 0.004, -40], [x, 0.004, 40], [x + 0.03, 0.004, 40], [x + 0.03, 0.004, -40]])} fill="#DEDEDE" />
        ))}
        {/* the wall's top, broken by the gate; the gate's rail across the opening */}
        <path d={poly([[WALL, 0.01, -40], [WALL, 0.01, -1.9], [WALL + 0.32, 0.01, -1.9], [WALL + 0.32, 0.01, -40]])} fill="#BDBDBD" />
        <path d={poly([[WALL, 0.01, 1.9], [WALL, 0.01, 40], [WALL + 0.32, 0.01, 40], [WALL + 0.32, 0.01, 1.9]])} fill="#BDBDBD" />
        <path d={poly([[WALL + 0.14, 0.02, -1.9], [WALL + 0.14, 0.02, 1.9], [WALL + 0.2, 0.02, 1.9], [WALL + 0.2, 0.02, -1.9]])} fill="#9E9E9E" opacity={0.6} />
        {/* its way out: dashed, drawing on toward the street, stopped at her car */}
        <line x1={a0[0]} y1={a0[1]} x2={a1[0]} y2={a1[1]} stroke="#6A6A6A" strokeWidth={9} strokeDasharray="22 18" strokeLinecap="round" />
        {stopK > 0 ? (
          <g transform={`translate(${stopP[0]} ${stopP[1]}) scale(${clamp(stopK, 0, 1.2)})`}>
            <circle r={44} fill="#FFFFFF" stroke={C.accA} strokeWidth={8} />
            <path d="M-20 0H20" stroke={C.accA} strokeWidth={10} strokeLinecap="round" />
          </g>
        ) : null}
      </svg>
      {/* the neighbour's car: the same 3D saloon, neutral grey, waiting in its yard */}
      <Car3 cam={cam} night={0} glassA={0.8} shadow={1} paint="#8A8D92" yaw={-90} at={GREY_AT} />
      <Car3 cam={cam} night={0} card cardK={1} glassA={0.62} shadow={1} />
      <Button i={0} x={90} y={280} w={900} k={prog(t, 0, 9)} />
    </div>
  );
};

// ---- opt2: night, the lights left on --------------------------------------------------------------------------------------
const T2: CarCam = {pos: [-3.6, 1.3, 12.0], target: [0.0, 0.62, 1.0], fov: 32};
export const Opt2: React.FC = () => {
  const {t, len} = useLocal('opt2');
  const k = E.inOut(prog(t, 0, len));
  const cam: CarCam = {...T2, pos: [T2.pos[0] + 0.3 * k, T2.pos[1], T2.pos[2] - 0.8 * k]};
  const on = E.out(prog(t, 8, 6));
  const lamps: P3[] = [
    [0.68, 0.68, 2.12],
    [-0.68, 0.68, 2.12],
  ];
  const lp = lamps.map((p) => projectCar(cam, p));
  const far = (p: P3) => projectCar(cam, [p[0], 0, p[2] + 5.5]);
  const side = (p: P3, dx: number) => projectCar(cam, [p[0] + dx, 0, p[2] + 5.5]);
  const cab = projectCar(cam, [0, 1.15, 0.1]);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#121014', overflow: 'hidden'}}>
      <StreetWorld cam={cam} uid="o2" look="night" lit={0.8} />
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <defs>
          <linearGradient id="o2beam" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFF4DC" stopOpacity={0.55} />
            <stop offset="1" stopColor="#FFF4DC" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="o2beamH" x1="0" y1="0" x2="1" y2="0.6">
            <stop offset="0" stopColor="#FFF4DC" stopOpacity={0.75} />
            <stop offset="1" stopColor="#FFF4DC" stopOpacity={0} />
          </linearGradient>
          <radialGradient id="o2pool" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#FFF0D0" stopOpacity={0.4} />
            <stop offset="1" stopColor="#FFF0D0" stopOpacity={0} />
          </radialGradient>
        </defs>
        {lp.map((p, i) => {
          const a = side(lamps[i], -1.3);
          const b = side(lamps[i], 1.3);
          return <path key={i} d={`M${p.x} ${p.y - 6}L${a.x} ${a.y}L${b.x} ${b.y}L${p.x} ${p.y + 6}Z`} fill="url(#o2beamH)" opacity={on} />;
        })}
        <ellipse cx={(far(lamps[0]).x + far(lamps[1]).x) / 2} cy={far(lamps[0]).y} rx={420} ry={90} fill="url(#o2pool)" opacity={on} />
      </svg>
      <Car3 cam={cam} night={1} card cardK={1} glassA={0.6} lamp={on} street={0.85} shadow={1.1} />
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <defs>
          <radialGradient id="o2glow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#FFF6E0" stopOpacity={0.95} />
            <stop offset="0.25" stopColor="#FFE2B0" stopOpacity={0.45} />
            <stop offset="1" stopColor="#FFE2B0" stopOpacity={0} />
          </radialGradient>
        </defs>
        {lp.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={70} fill="url(#o2glow)" opacity={on} />
        ))}
        {/* the cabin light, warm behind the glass */}
        <ellipse cx={cab.x} cy={cab.y} rx={170} ry={60} fill="url(#o2glow)" opacity={0.7 * on} />
      </svg>
      <Button i={1} x={90} y={300} w={900} k={prog(t, 0, 9)} />
    </div>
  );
};

// ---- opt3: something is happening at her car: the hazards, the alarm --------------------------------------------------------
const T3: CarCam = {pos: [8.4, 2.8, 12.0], target: [0.0, 0.7, 0.2], fov: 36}; // v4 fix: pulled back, the car whole
export const Opt3: React.FC = () => {
  const {t, len} = useLocal('opt3');
  const k = E.inOut(prog(t, 0, len));
  const cam: CarCam = {...T3, pos: [T3.pos[0] - 0.6 * k, T3.pos[1], T3.pos[2] - 0.4 * k]};
  // the hazards: on 7 frames, off 6 (the indicator's own tick)
  const ph = (t - 4) % 13;
  const blink = t >= 4 && ph < 7 ? 1 : 0;
  const corners: P3[] = [
    [0.82, 0.7, 2.0],
    [-0.82, 0.7, 2.0],
    [0.86, 0.82, -1.98],
    [-0.86, 0.82, -1.98],
    [0.98, 0.95, 0.9],
  ];
  const cp = corners.map((p) => projectCar(cam, p));
  const mid = projectCar(cam, [0, 0.8, 0]);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#F4F4F4', overflow: 'hidden'}}>
      <StreetWorld cam={cam} uid="o3" />
      {/* the alarm: rings leaving the car */}
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        {[0, 1, 2].map((n) => {
          const q = (((t - 4) / 20 + n / 3) % 1 + 1) % 1;
          if (t < 4) return null;
          return <ellipse key={n} cx={mid.x} cy={mid.y + 40} rx={260 + 420 * q} ry={(260 + 420 * q) * 0.42} fill="none" stroke={C.accB} strokeWidth={6} opacity={0.45 * (1 - q)} />;
        })}
      </svg>
      <Car3 cam={cam} night={0} card cardK={1} glassA={0.62} shadow={1} />
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <defs>
          <radialGradient id="o3amb" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#FFF2C8" stopOpacity={1} />
            <stop offset="0.22" stopColor="#FFB547" stopOpacity={0.75} />
            <stop offset="1" stopColor="#FF9A1F" stopOpacity={0} />
          </radialGradient>
        </defs>
        {blink
          ? cp.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={i === 4 ? 36 : 62} fill="url(#o3amb)" />)
          : null}
      </svg>
      <Button i={2} x={90} y={300} w={900} k={prog(t, 0, 9)} />
    </div>
  );
};

void ev;
