// ACT 2-3 v2, how it works, chewed (the owner, 2026-10-15: "explain it so anyone gets it", "show HOW to connect very clearly,
// step by step"): the car speaks its own language (a bubble of raw OBD bytes), and nobody ever translated it (an empty
// translator); the car's computer keeps its faults as codes (an x-ray of the crossover: the sensors' pulses into its computer,
// the codes landing in its memory); the port under the wheel (a lens lifts it up big) and almost every car of today has it;
// then the three steps: 1 a cheap ELM327 adapter into the port (the ignition on, its LED lights), 2 VINARI's OBD scanner and
// its „სკანირება" (the phone rising slowly in his hand), 3 VINARI finds the adapter by itself (BLE), or you join its Wi-Fi in
// the iPhone's Settings, and the scan runs, with the honest note „iPhone: Wi-Fi ან BLE ადაპტერი · Android: ნებისმიერი";
// then what it tells you: P0300 means nothing (the generic English line), it turns into Georgian (a cylinder skips), how
// serious (the three answers the app gives) and whether you can drive (the real result, its verdict lifted, the phone
// leaning on the dash). Every real screen at most once. Text only black or white (a little grey for the quiet).
import React from 'react';
import {Img, staticFile} from 'remotion';
import {mtav} from '../lib/format';
import {textWidth} from '../lib/measure';
import {C, F} from '../tokens';
import {clamp, E, lerp, prog, sp} from './lib';
import {Car3, projectCar, type CarCam} from './kit/car3d';
import {atFoot, bodyBox, float, Lift, Phone3, ScreenLayer, type Band, type Pose, type Rect, type Region} from './kit/phone3d';
import {GripBack, GripFront} from './kit/grip';
import {silPal} from './kit/sil/sil';
import {Car as IlloCar, type CarBody} from '../scenes/illo/car';
import {AMBER, Card, cssCam, EngineIcon, INK, Label, riseFoot, riseIn, StepLabel, Svg, useShot, WHITE} from './kit/stage';

export const DAY_SKIN = silPal({light: true, hue: '#B89A84', b: '#6A6A6A', time: 'day', level: 1}).lit;

// ---- the real screens' regions (capture fractions, measured on public/screens 1080 x 2346) --------------------------------
export const R = {
  hubScan: {x0: 0.1, y0: 0.3785, x1: 0.9, y1: 0.4348},
  hubBuy: {x0: 0.1, y0: 0.4473, x1: 0.9, y1: 0.4988},
  resVerdict: {x0: 84 / 1080, y0: 396 / 2346, x1: 1000 / 1080, y1: 648 / 2346},
  resCause: {x0: 86 / 1080, y0: 642 / 2346, x1: 990 / 1080, y1: 834 / 2346},
  potholes: {x0: 0.049, y0: 0.2634, x1: 0.485, y1: 0.3824},
  urgency: {x0: 0.048, y0: 0.228, x1: 0.954, y1: 0.304},
  causes: {x0: 36 / 1080, y0: 786 / 2346, x1: 1044 / 1080, y1: 1560 / 2346},
  quote: {x0: 0.069, y0: 0.9258, x1: 0.946, y1: 0.9804},
} satisfies Record<string, Region>;
export const bandOf = (r: Region, a: number): Band => ({x: r.x0, y: r.y0, w: r.x1 - r.x0, h: r.y1 - r.y0, a});
export const pad = (r: Region, px: number): Region => ({x0: r.x0 - px / 1080, y0: r.y0 - px / 2346, x1: r.x1 + px / 1080, y1: r.y1 + px / 2346});
export const mid = (r: Region) => ({x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2});
/** a region lifted in place, toward the lens, `grow` times its size about its own centre */
export const inPlace = (pose: Pose, r: Region, grow: number, dy = 0): Rect => {
  const x = pose.x + (r.x0 - 0.5) * pose.w;
  const h = (r.y1 - r.y0) * (2346 / 1080) * pose.w;
  const y = pose.y + (r.y0 - 0.5) * (2346 / 1080) * pose.w;
  const w = (r.x1 - r.x0) * pose.w;
  return {x: x - (w * (grow - 1)) / 2, y: y - (h * (grow - 1)) / 2 + dy, w: w * grow, h: h * grow};
};

/** a hand holding the phone from the LEFT (the grip mirrored about the phone): the arm leaves by the frame's left side */
export const HeldLeft: React.FC<{pose: Pose; uid: string; children: React.ReactNode}> = ({pose, uid, children}) => {
  const m = {...pose, x: 1080 - pose.x, yaw: -pose.yaw, roll: -(pose.roll ?? 0)};
  const b = bodyBox(m);
  const flip: React.CSSProperties = {position: 'absolute', inset: 0, transform: 'scaleX(-1)', transformOrigin: '540px 0'};
  return (
    <>
      <div style={flip}>
        <GripBack b={b} id={`${uid}b`} skin={DAY_SKIN} />
      </div>
      {children}
      <div style={flip}>
        <GripFront b={b} id={`${uid}f`} skin={DAY_SKIN} />
      </div>
    </>
  );
};

const White: React.FC<{children: React.ReactNode; bg?: string}> = ({children, bg}) => <div style={{position: 'absolute', inset: 0, background: bg ?? C.surface, overflow: 'hidden'}}>{children}</div>;
const mono = (size: number, color = INK): React.CSSProperties => ({fontFamily: F.mono, fontWeight: 600, fontSize: size, color, letterSpacing: '0.04em', whiteSpace: 'nowrap'});

// ---- 19 speaks: the crossover in the white studio at three quarters; a speech bubble rises from its nose, and the car's own
// language fills it byte by byte (the real shape of an OBD answer), its lights pulsing as it "talks" --------------------------
const SP_CAM0: CarCam = {pos: [10.4, 2.0, 15.6], target: [0.1, 0.75, 0.2], fov: 30};
const SP_CAM1: CarCam = {pos: [10.0, 1.95, 15.1], target: [0.1, 0.75, 0.2], fov: 30};
const BYTES = ['43 01 03 00', '41 0C 1A F8', '41 05 7B', 'P0300'];
export const SpeaksShot: React.FC = () => {
  const {t, len, L, Ls} = useShot('speaks');
  const bub = L('bubble');
  const bytes = Ls('bytes');
  const k = E.inOut(prog(t, 0, len));
  const cam: CarCam = {pos: [lerp(SP_CAM0.pos[0], SP_CAM1.pos[0], k), lerp(SP_CAM0.pos[1], SP_CAM1.pos[1], k), lerp(SP_CAM0.pos[2], SP_CAM1.pos[2], k)], target: SP_CAM0.target, fov: 30};
  const DY = 170;
  const nose = projectCar(cam, [0.1, 0.95, 2.35]);
  const bk = sp(t, bub, 130, 16);
  const talk = Math.max(0, ...bytes.map((b) => (t >= b ? Math.exp(-(t - b) / 4) : 0)));
  const BX = 150;
  const BY = 300;
  const BW = 780;
  const BH = 440;
  return (
    <White>
      <div style={{position: 'absolute', inset: 0, transform: `translateY(${DY}px)`}}>
        <Car3 cam={cam} night={0} shadow={1} lamp={0.25 + 0.75 * talk} />
      </div>
      {bk > 0.01 ? (
        <>
          <Svg>
            {/* the bubble's tail toward the nose */}
            <path d={`M${BX + BW * 0.18} ${BY + BH - 4}L${nose.x + 10} ${nose.y + DY - 70}L${BX + BW * 0.36} ${BY + BH - 4}Z`} fill={WHITE} opacity={clamp(bk * 1.5)} style={{filter: 'drop-shadow(0 18px 24px rgba(0,0,0,0.10))'}} />
          </Svg>
          <Card x={BX} y={BY} w={BW} h={BH} k={bk} r={56}>
            <div style={{position: 'absolute', left: 60, top: 54}}>
              {BYTES.map((b, i) => {
                const a = E.out(prog(t, bytes[i] ?? 999, 5));
                const last = i === BYTES.length - 1;
                return (
                  <div key={b} style={{...mono(last ? 74 : 54, INK), fontWeight: last ? 700 : 400, marginTop: i ? 14 : 0, opacity: a, transform: `translateX(${(1 - a) * 16}px)`}}>
                    {b}
                    {!last && a > 0 && a < 1 ? <span style={{opacity: 0.6}}>▍</span> : null}
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      ) : null}
    </White>
  );
};

// ---- 20 noone: the translator nobody ever made: the car's line on top, an arrow, and under it, „ქართულად", only a blinking
// cursor in an empty field --------------------------------------------------------------------------------------------------
export const NooneShot: React.FC = () => {
  const {t, len, L} = useShot('noone');
  const blank = L('blank');
  const k = E.inOut(prog(t, 0, len));
  const inK = sp(t, -2, 120, 18);
  const blinkOn = Math.floor((t - blank) / 9) % 2 === 0;
  const shake = t > blank + 20 ? 0 : 0;
  return (
    <White bg="#F3F3F3">
      <div style={{position: 'absolute', inset: 0, transform: `scale(${lerp(1, 1.04, k)})`, transformOrigin: '540px 860px'}}>
        <Card x={110} y={330} w={860} h={360} k={inK} r={48}>
          <div style={{position: 'absolute', left: 56, top: 44, fontFamily: F.sans, fontWeight: 500, fontSize: 32, color: INK}}>{mtav('მანქანის ენა')}</div>
          <div style={{position: 'absolute', left: 56, top: 112, ...mono(58)}}>43 01 03 00</div>
          <div style={{position: 'absolute', left: 56, top: 196, ...mono(84)}}>P0300</div>
        </Card>
        <Svg>
          {/* a soft round button with an arrow between the two halves (the translate key) */}
          <circle cx={540} cy={740} r={58} fill={INK} opacity={clamp(inK * 1.5)} />
          <path d="M540 712V768M516 746L540 770L564 746" stroke={WHITE} strokeWidth={8} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={clamp(inK * 1.5)} />
        </Svg>
        <Card x={110} y={800} w={860} h={360} k={sp(t, 4, 120, 18)} r={48}>
          <div style={{position: 'absolute', left: 56, top: 44, fontFamily: F.sans, fontWeight: 500, fontSize: 32, color: INK}}>{mtav('ქართულად')}</div>
          <div style={{position: 'absolute', left: 56, top: 132, width: 8, height: 110, borderRadius: 4, background: INK, opacity: t > blank - 6 && blinkOn ? 1 : 0.12, transform: `translateX(${shake}px)`}} />
        </Card>
      </div>
    </White>
  );
};

// ---- 21 ecu: the crossover in profile as an x-ray (the body a pale ghost): its sensors (the coil, the air meter, the oxygen
// sensor, the catalyst) send pulses to its computer behind the dash; then (a cut) close on the computer: its memory, and the
// codes landing in it as tags ----------------------------------------------------------------------------------------------------
const EC_CAM: CarCam = {pos: [19.5, 1.7, 0.2], target: [0, 0.85, 0.0], fov: 33};
const EC_DY = 40;
const SENSORS: {p: [number, number, number]; part: 'coil' | 'maf' | 'o2' | 'cat'}[] = [
  {p: [0, 1.05, 1.35], part: 'coil'},
  {p: [-0.4, 1.0, 1.9], part: 'maf'},
  {p: [0.3, 0.3, -0.6], part: 'o2'},
  {p: [0.2, 0.3, 0.45], part: 'cat'},
];
const ECU_P: [number, number, number] = [0.4, 0.98, 0.75];
const TAGS = ['P0300', 'P0420', 'P0171'];
export const EcuShot: React.FC = () => {
  const {t, len, L, Ls} = useShot('ecu');
  const cut = L('ecuIn');
  const pulses = Ls('pulses');
  const tags = Ls('tags');
  if (t < cut) {
    const k = E.inOut(prog(t, 0, cut));
    const e = projectCar(EC_CAM, ECU_P);
    const ex = e.x;
    const ey = e.y + EC_DY;
    return (
      <White bg="#F4F4F4">
        <div style={{position: 'absolute', inset: 0, transform: `translateY(${EC_DY}px) scale(${lerp(1, 1.03, k)})`, transformOrigin: `540px ${960 - EC_DY}px`, opacity: 0.32}}>
          <Car3 cam={EC_CAM} night={0} shadow={0.6} glassA={0.5} />
        </div>
        <Svg>
          {SENSORS.map((s, i) => {
            const p = projectCar(EC_CAM, s.p);
            const px = p.x;
            const py = p.y + EC_DY;
            const d = `M${px} ${py}C${px} ${py - 120} ${ex} ${ey + 140} ${ex} ${ey}`;
            const at = pulses[i % pulses.length] + i * 3;
            const ph = clamp((t - at) / 14);
            return (
              <g key={i}>
                <path d={d} fill="none" stroke={INK} strokeWidth={2.2} opacity={0.22} />
                {t > at && ph < 1 ? <path d={d} fill="none" stroke={AMBER} strokeWidth={6} strokeLinecap="round" pathLength={1} strokeDasharray="0.14 1" strokeDashoffset={-ph} /> : null}
                <circle cx={px} cy={py} r={26} fill={AMBER} opacity={0.25 * Math.sin(Math.PI * clamp((t - at + 4) / 12))} />
                <circle cx={px} cy={py} r={12} fill={INK} />
                <circle cx={px} cy={py} r={5} fill={WHITE} />
              </g>
            );
          })}
          {/* the computer: a small black module behind the dash, its connector's pins */}
          <rect x={ex - 46} y={ey - 30} width={92} height={60} rx={12} fill={INK} />
          {Array.from({length: 5}, (_, i) => (
            <rect key={i} x={ex - 34 + i * 16} y={ey + 30} width={6} height={12} fill={INK} />
          ))}
          <circle cx={ex + 28} cy={ey - 12} r={6} fill={AMBER} opacity={0.4 + 0.6 * Math.max(0, ...pulses.map((p) => (t >= p + 14 ? Math.exp(-(t - p - 14) / 5) : 0)))} />
        </Svg>
      </White>
    );
  }
  // the close-up: the computer's memory, three slots, the codes landing in them
  const q = t - cut;
  const inK = sp(q, 0, 140, 18);
  return (
    <White bg="#F4F4F4">
      <div style={{position: 'absolute', inset: 0, transform: `scale(${lerp(1.0, 1.03, E.inOut(prog(q, 0, len - cut)))})`, transformOrigin: '540px 840px'}}>
        <Card x={150} y={320} w={780} h={920} k={inK} r={60} dark>
          <div style={{position: 'absolute', left: 0, right: 0, top: 56, textAlign: 'center', fontFamily: F.sans, fontWeight: 500, fontSize: 36, color: WHITE}}>{mtav('მეხსიერება')}</div>
          {TAGS.map((c, i) => {
            const a = sp(t, tags[i], 170, 15);
            return (
              <div key={c} style={{position: 'absolute', left: 70, right: 70, top: 170 + i * 230, height: 190, borderRadius: 34, background: 'rgba(255,255,255,0.06)'}}>
                {a > 0.01 ? (
                  <div style={{position: 'absolute', inset: 12, borderRadius: 26, background: WHITE, display: 'flex', alignItems: 'center', gap: 34, paddingLeft: 44, opacity: clamp(a * 1.6), transform: `translateY(${(1 - clamp(a)) * -60}px) scale(${lerp(0.9, 1, clamp(a))})`}}>
                    <svg width={92} height={92} viewBox="0 0 92 92">
                      <EngineIcon uid={`tg${i}`} x={46} y={46} size={78} k={1} glow={0} stroke={2} />
                    </svg>
                    <span style={mono(84)}>{c}</span>
                  </div>
                ) : null}
              </div>
            );
          })}
        </Card>
      </div>
    </White>
  );
};

// ---- 22 port: the driver's footwell in the day, from the open door at knee height: the wheel's lower rim, the column, the
// soft knee panel; the port's recess left of the column glows; then a round lens lifts it up big: the 16 pins, „OBD" --------------
const PORT_AT = {x: 300, y: 1020};
/** the 16-pin J1962 port seen face-on (a trapezoid recess, two rows of eight), centred at (cx, cy), `s` its scale */
export const PortFace: React.FC<{cx: number; cy: number; s: number; uid: string; glow?: number}> = ({cx, cy, s, uid, glow = 0}) => {
  const w = 440 * s;
  const h = 210 * s;
  const x0 = cx - w / 2;
  const y0 = cy - h / 2;
  const tz = `M${x0} ${y0 + h * 0.06}Q${x0} ${y0} ${x0 + w * 0.05} ${y0}L${x0 + w * 0.95} ${y0}Q${x0 + w} ${y0} ${x0 + w} ${y0 + h * 0.06}L${x0 + w * 0.9} ${y0 + h * 0.92}Q${x0 + w * 0.89} ${y0 + h} ${x0 + w * 0.84} ${y0 + h}L${x0 + w * 0.16} ${y0 + h}Q${x0 + w * 0.11} ${y0 + h} ${x0 + w * 0.1} ${y0 + h * 0.92}Z`;
  const pins: React.ReactNode[] = [];
  for (let row = 0; row < 2; row++)
    for (let i = 0; i < 8; i++) {
      const px = cx + (i - 3.5) * w * (row === 0 ? 0.1 : 0.088);
      const py = y0 + h * (row === 0 ? 0.36 : 0.68);
      pins.push(<rect key={`${row}${i}`} x={px - w * 0.017} y={py - h * 0.075} width={w * 0.034} height={h * 0.15} rx={w * 0.008} fill={`url(#${uid}pin)`} />);
    }
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}pin`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F1E2B8" />
          <stop offset="1" stopColor="#9A8656" />
        </linearGradient>
        <linearGradient id={`${uid}bez`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3A3D44" />
          <stop offset="1" stopColor="#1C1E22" />
        </linearGradient>
        <radialGradient id={`${uid}glow`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={WHITE} stopOpacity={0.7} />
          <stop offset="1" stopColor={WHITE} stopOpacity={0} />
        </radialGradient>
      </defs>
      {glow > 0 ? <ellipse cx={cx} cy={cy} rx={w * 1.2} ry={h * 1.6} fill={`url(#${uid}glow)`} opacity={glow} /> : null}
      <path d={tz} fill={`url(#${uid}bez)`} transform={`translate(${cx} ${cy}) scale(1.14 1.22) translate(${-cx} ${-cy})`} />
      <path d={tz} fill="#08090B" />
      {pins}
    </g>
  );
};
const FootwellDay: React.FC = () => {
  const W = {x: 640, y: 330, rx: 330, ry: 300};
  return (
    <Svg>
      <defs>
        <linearGradient id="fdBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4C5058" />
          <stop offset="1" stopColor="#2A2C31" />
        </linearGradient>
        <linearGradient id="fdPanel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5A5E66" />
          <stop offset="1" stopColor="#3C3F46" />
        </linearGradient>
        <linearGradient id="fdRim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3A3D44" />
          <stop offset="0.5" stopColor="#1E2025" />
          <stop offset="1" stopColor="#141519" />
        </linearGradient>
        <linearGradient id="fdCol" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#25272C" />
          <stop offset="0.5" stopColor="#3C3F46" />
          <stop offset="1" stopColor="#202226" />
        </linearGradient>
        <radialGradient id="fdSun" cx="0.0" cy="0.45" r="0.9">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity={0.3} />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect width={1080} height={1920} fill="url(#fdBg)" />
      {/* the dash's face above, the knee panel's broad soft surface under it */}
      <path d="M-60 250Q540 200 1140 250L1140 760Q540 720 -60 760Z" fill="#33363C" />
      <path d="M-60 760Q540 720 1140 760L1140 1230Q540 1290 -60 1230Z" fill="url(#fdPanel)" />
      <path d="M-60 760Q540 720 1140 760" stroke="#7C818B" strokeWidth={5} fill="none" opacity={0.55} />
      <path d="M-60 1230Q540 1290 1140 1230" stroke="#24262A" strokeWidth={12} fill="none" />
      {/* the steering column's shroud going up into the wheel's hub */}
      <path d={`M${W.x - 80} ${W.y + 120}L${W.x + 80} ${W.y + 120}L${W.x + 110} ${W.y + 470}Q${W.x} ${W.y + 500} ${W.x - 110} ${W.y + 470}Z`} fill="url(#fdCol)" />
      {/* the wheel: a thick leather ring (its lower half in the frame), the lower spoke, the hub */}
      <ellipse cx={W.x} cy={W.y} rx={W.rx} ry={W.ry} fill="none" stroke="#0E0F12" strokeWidth={78} />
      <ellipse cx={W.x} cy={W.y} rx={W.rx} ry={W.ry} fill="none" stroke="url(#fdRim)" strokeWidth={66} />
      <path d={`M${W.x - 36} ${W.y + 80}L${W.x + 36} ${W.y + 80}L${W.x + 50} ${W.y + W.ry - 30}L${W.x - 50} ${W.y + W.ry - 30}Z`} fill="#24262B" />
      <rect x={W.x - 130} y={W.y - 60} width={260} height={150} rx={70} fill="#2B2D33" />
      {/* the pedals, the floor */}
      <path d="M-60 1230L1140 1230L1140 1920L-60 1920Z" fill="#1C1E22" />
      <rect x={560} y={1580} width={120} height={190} rx={22} fill="#26282D" />
      <rect x={760} y={1600} width={170} height={130} rx={22} fill="#26282D" />
      {/* the open door's daylight from the left */}
      <rect width={1080} height={1920} fill="url(#fdSun)" />
    </Svg>
  );
};
export const PortShot: React.FC = () => {
  const {t, len, L} = useShot('port');
  const glowAt = L('portGlow');
  const lensAt = L('lens');
  const k = E.inOut(prog(t, 0, len));
  const glow = E.out(prog(t, glowAt - 3, 10)) * (0.8 + 0.2 * Math.sin((t - glowAt) / 5));
  const lens = sp(t, lensAt, 120, 17);
  const LX = 640;
  const LY = 1010;
  const LR = 230;
  return (
    <div style={{position: 'absolute', inset: 0, background: '#2A2C31', overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${lerp(1, 1.05, k)})`, transformOrigin: `${PORT_AT.x}px ${PORT_AT.y}px`}}>
        <FootwellDay />
        <Svg>
          <PortFace cx={PORT_AT.x} cy={PORT_AT.y} s={0.46} uid="pf" glow={glow} />
        </Svg>
      </div>
      {lens > 0.01 ? (
        <>
          <Svg>
            {/* the lens: a white disc with the port big in it, a short soft stem back to the port */}
            <path d={`M${PORT_AT.x + 110} ${PORT_AT.y}L${LX - LR} ${LY}`} stroke={WHITE} strokeWidth={10} strokeLinecap="round" opacity={0.55 * clamp(lens)} />
            <circle cx={LX} cy={LY} r={LR * clamp(lens)} fill={WHITE} style={{filter: 'drop-shadow(0 24px 40px rgba(0,0,0,0.35))'}} />
            {lens > 0.4 ? (
              <g opacity={clamp((lens - 0.4) * 2)}>
                <PortFace cx={LX} cy={LY - 10} s={0.82} uid="pl" />
              </g>
            ) : null}
          </Svg>
          <div style={{position: 'absolute', left: LX - 110, top: LY + LR + 30, width: 220, display: 'flex', justifyContent: 'center', opacity: clamp((lens - 0.5) * 2)}}>
            <div style={{padding: '14px 40px 16px', borderRadius: 999, background: WHITE, color: INK, ...mono(52), letterSpacing: '0.14em'}}>OBD</div>
          </div>
        </>
      ) : null}
    </div>
  );
};

// ---- 23 cars: a row of today's cars (a saloon, a hatch, a crossover, an electric one, a coupe), each one's port badge pops
// over it in turn: almost every one has it ---------------------------------------------------------------------------------------
const ROW: {body: CarBody; paint: number}[] = [
  {body: 'sedan', paint: 2},
  {body: 'hatch', paint: 4},
  {body: 'suv', paint: 3},
  {body: 'ev', paint: 1},
  {body: 'coupe', paint: 5},
];
const PortBadge: React.FC<{x: number; y: number; k: number}> = ({x, y, k}) => (
  <g transform={`translate(${x} ${y}) scale(${lerp(0.4, 1, E.outBack(clamp(k)))})`} opacity={clamp(k * 2)}>
    <rect x={-58} y={-42} width={116} height={84} rx={24} fill={INK} />
    <path d="M-34 -16H34L26 18H-26Z" fill="none" stroke={WHITE} strokeWidth={5} strokeLinejoin="round" />
    {[-18, -6, 6, 18].map((dx) => (
      <circle key={dx} cx={dx} cy={-3} r={3.5} fill={WHITE} />
    ))}
    <circle cx={46} cy={-36} r={20} fill={WHITE} />
    <path d="M37 -36L44 -29L56 -43" stroke={INK} strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </g>
);
export const CarsShot: React.FC = () => {
  const {t, len, Ls} = useShot('cars');
  const badges = Ls('badges');
  const k = E.inOut(prog(t, 0, len));
  const drift = lerp(30, -30, k);
  const ys = [430, 640, 850, 1060, 1270];
  return (
    <White bg="#F4F4F4">
      <Svg>
        {ROW.map((c, i) => {
          const y = ys[i];
          const x = 420 + drift * (i % 2 ? -1 : 1);
          const a = E.out(prog(t, i * 3 - 4, 12));
          return (
            <g key={c.body} opacity={a} transform={`translate(${(1 - a) * (i % 2 ? 60 : -60)} 0)`}>
              <IlloCar uid={`rc${i}`} x={x} y={y} len={520} body={c.body} paint={c.paint} frame={t} lights={{head: 0.4}} />
              <PortBadge x={x + 340} y={y - 70} k={sp(t, badges[i], 170, 14)} />
            </g>
          );
        })}
      </Svg>
    </White>
  );
};

// ---- 24 adapter: STEP 1: the cheap ELM327 adapter itself, a small black block with its 16-pin plug on top, turning slowly in
// the white studio; then (25 plug) close in the footwell it slides into the port, the ignition goes ON, its LED wakes ----------
export const AdapterBody: React.FC<{cx: number; top: number; s: number; led: number; uid: string; tilt?: number}> = ({cx, top, s, led, uid, tilt = 0}) => {
  const pw = 380 * s;
  const ph = 120 * s;
  const bw = 400 * s;
  const bh = 330 * s;
  const by = top + ph;
  return (
    <g transform={`rotate(${tilt} ${cx} ${top + ph + bh / 2})`}>
      <defs>
        <linearGradient id={`${uid}b`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3A3D45" />
          <stop offset="0.4" stopColor="#1C1E23" />
          <stop offset="1" stopColor="#0C0D10" />
        </linearGradient>
        <radialGradient id={`${uid}led`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity={1} />
          <stop offset="0.3" stopColor="#DDEBFF" stopOpacity={0.5} />
          <stop offset="1" stopColor="#DDEBFF" stopOpacity={0} />
        </radialGradient>
      </defs>
      <path d={`M${cx - pw / 2} ${top}L${cx + pw / 2} ${top}L${cx + pw * 0.42} ${top + ph}L${cx - pw * 0.42} ${top + ph}Z`} fill="#16181C" />
      <path d={`M${cx - pw / 2} ${top}L${cx + pw / 2} ${top}`} stroke="#4A4E58" strokeWidth={3 * s} />
      <rect x={cx - bw / 2} y={by} width={bw} height={bh} rx={52 * s} fill={`url(#${uid}b)`} />
      <rect x={cx - bw / 2 + 8 * s} y={by + 8 * s} width={bw - 16 * s} height={bh * 0.28} rx={44 * s} fill="#FFFFFF" opacity={0.05} />
      {/* the printed label */}
      <text x={cx - bw * 0.36} y={by + bh * 0.5} fontFamily="FiraGO" fontWeight={700} fontSize={50 * s} fill="#E9E9E9" letterSpacing={2 * s}>
        ELM327
      </text>
      <text x={cx - bw * 0.36} y={by + bh * 0.68} fontFamily="FiraGO" fontWeight={500} fontSize={30 * s} fill="#8C9099" letterSpacing={3 * s}>
        OBD-II
      </text>
      <circle cx={cx + bw * 0.3} cy={by + bh * 0.62} r={120 * s} fill={`url(#${uid}led)`} opacity={led} />
      <circle cx={cx + bw * 0.3} cy={by + bh * 0.62} r={15 * s} fill={led > 0.3 ? '#FFFFFF' : '#2A2D35'} />
    </g>
  );
};
// ---- 24 plug: STEP 1 (v2.1, the owner: "how to connect must be clearly visible"; the AD: it was an abstract grey close-up with a
// ghost crossfade): in the SAME footwell as the port (the wheel's rim above, the port under it), framed closer and lower. His
// hand brings the cheap ELM327 up from below and pushes it home (a click and a small jolt), lets go and drops away; the
// ignition goes ON, the adapter's LED wakes. The plain label „1 · ჩადე საჭის ქვეშ ბუდეში" held the whole shot.
export const PlugShot: React.FC = () => {
  const {t, len, L} = useShot('plug');
  const inAt = L('adapterIn');
  const click = L('click');
  const ledAt = L('led');
  const k = E.inOut(prog(t, 0, len));
  const S = lerp(1.5, 1.4, k);
  const PS = 0.46;
  const mouth = PORT_AT.y - (210 * PS) / 2;
  const as = (PS * 440) / 380;
  // the adapter in his hand: in from the right at the port's height (the whole move above the subtitle), under the port, then
  // pushed up home on the click (a small jolt); his hand lets go and leaves by the right
  const across = E.out(prog(t, inAt - 2, Math.max(8, click - inAt - 6)));
  const up = E.in2(prog(t, click - 8, 8));
  const snap = t >= click ? 1 : 0;
  const bounce = 5 * Math.sin(Math.max(0, t - click) * 2.4) * Math.exp(-Math.max(0, t - click) / 3) * snap;
  const ax = PORT_AT.x + lerp(560, 0, across);
  const top = lerp(mouth + 58, mouth + 6, up) - 4 * snap + bounce;
  const body: Rect = {x: ax - 200 * as, y: top + 120 * as, w: 400 * as, h: 330 * as};
  const away = E.inOut(prog(t, click + 6, 14));
  // the grip's box a little larger than the adapter's body and lower: the fingers along its lower left edge, the palm cradling
  // it from below, the thumb up its right side, the sleeve leaving by the right
  const hand: Rect = {x: body.x + 0.02 * body.w + 520 * away, y: body.y - 0.1 * body.h + 40 * away, w: body.w * 0.98, h: body.h * 1.45};
  const ledK = t < ledAt ? 0 : 0.75 + 0.25 * Math.sin((t - ledAt) / 2.2);
  const on = sp(t, ledAt - 2, 160, 15);
  const shake = t >= click && t < click + 6 ? 2.5 * Math.sin((t - click) * 3) : 0;
  return (
    <div style={{position: 'absolute', inset: 0, background: '#2A2C31', overflow: 'hidden'}}>
      <div style={cssCam(S, PORT_AT.x, PORT_AT.y, 190, -90 + shake)}>
        <FootwellDay />
        <Svg>
          <PortFace cx={PORT_AT.x} cy={PORT_AT.y} s={PS} uid="pp2" glow={0.35 * (1 - snap)} />
        </Svg>
        <GripBack b={hand} id="plgb" skin={DAY_SKIN} />
        <Svg>
          <AdapterBody cx={ax} top={top} s={as} led={ledK} uid="ad2" />
        </Svg>
        <GripFront b={hand} id="plgf" skin={DAY_SKIN} />
      </div>
      <StepLabel n={1} text="ჩადე საჭის ქვეშ ბუდეში" y={282} k={E.out(prog(t, 3, 10))} />
      {on > 0.01 ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: 1220, display: 'flex', justifyContent: 'center', opacity: clamp(on * 1.6), transform: `translateY(${(1 - clamp(on)) * 16}px)`}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 18, padding: '16px 40px 18px 26px', borderRadius: 999, background: WHITE, fontFamily: F.sans, fontWeight: 700, fontSize: 46, color: INK}}>
            <svg width={52} height={52} viewBox="0 0 24 24">
              <circle cx={8} cy={12} r={5} fill="none" stroke={INK} strokeWidth={2.2} />
              <path d="M13 12H22M18 12V16M21 12V15" stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
            </svg>
            {mtav('ანთება')} · ON
          </div>
        </div>
      ) : null}
    </div>
  );
};

// ---- 26 app: STEP 2: his hand brings the phone up from BELOW the frame (0.95 s, eased, a soft settle) as one opaque unit, on
// VINARI's OBD scanner; the light veil, the window on „სკანირება", the tap. The phone's foot and the sleeve stay above the line --
export const AppShot: React.FC = () => {
  const {t, L} = useShot('app');
  const tapAt = L('scanTap');
  const r = riseIn(t, 0);
  const fl = float(t);
  const W = 400;
  const H = W * 2.25;
  const pose = atFoot({x: 590, w: W, yaw: lerp(14, 8, clamp(r)) + fl.roll, pitch: lerp(10, 5, clamp(r)) + fl.pitch, roll: -3}, riseFoot(r, 1290, H));
  const bandA = prog(t, tapAt - 12, 6);
  const tap = mid(R.hubScan);
  const lk = sp(t, tapAt - 10, 150, 18) * (1 - E.inOut(prog(t, tapAt + 2, 6)));
  return (
    <White bg="#F4F4F4">
      <StepLabel n={2} text="დააჭირე სკანირებას" y={282} k={E.out(prog(t, 2, 10))} />
      <HeldLeft pose={pose} uid="ap">
        <Phone3 src="21-obd-hub" pose={pose} band={bandOf(pad(R.hubScan, 14), bandA)} veil={0.24 * bandA} taps={[{x: tap.x, y: tap.y, k: (t - tapAt) / 16}]} />
        {lk > 0.002 ? <Lift src="21-obd-hub" r={R.hubScan} pose={pose} to={inPlace(pose, R.hubScan, 1.08)} k={lk} radius={30} /> : null}
      </HeldLeft>
    </White>
  );
};

// ---- 27 found: STEP 3: the phone finds the adapter by itself (BLE: its radar, the link, a check), or, with a Wi-Fi adapter, you
// join its network in the iPhone's Settings (OBD, V-LINK, WiFi_OBDII); then the scan runs. The honest small note under it ------
const PhoneGlyphBig: React.FC<{x: number; y: number; s: number}> = ({x, y, s}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x={-60} y={-120} width={120} height={240} rx={26} fill={INK} />
    <rect x={-50} y={-108} width={100} height={216} rx={18} fill={WHITE} />
    <rect x={-20} y={-102} width={40} height={10} rx={5} fill={INK} />
  </g>
);
export const FoundShot: React.FC = () => {
  const {t, L} = useShot('found');
  const radar = L('radar');
  const found = L('found');
  const wifi = L('wifi');
  const scan = L('scanRun');
  const note = L('note');
  const A = {x: 300, y: 560};
  const P = {x: 770, y: 560};
  const link = E.inOut(prog(t, found - 8, 8));
  const ok = sp(t, found, 170, 14);
  const wk = sp(t, wifi, 130, 18);
  const sk = clamp((t - scan) / 26);
  const nk = sp(t, note, 130, 18);
  return (
    <White bg="#F4F4F4">
      <StepLabel n={3} text="თვითონ დაუკავშირდება" y={282} k={E.out(prog(t, 2, 10))} />
      <Svg>
        {/* the adapter (small, plugged, its LED on) and the phone; the radar's soft rings stay round the phone (never over a word) */}
        <AdapterBody cx={A.x} top={A.y - 120} s={0.6} led={0.8 + 0.2 * Math.sin(t / 2.2)} uid="fa" />
        <PhoneGlyphBig x={P.x} y={P.y} s={1} />
        <g transform={`translate(${P.x} ${P.y + 10})`}>
          <rect x={-34} y={-34} width={68} height={68} rx={18} fill={INK} />
          <path d="M-10 -14L10 4L0 14V-14L10 -4L-10 14" stroke={WHITE} strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        {t >= radar && link < 1
          ? [0, 1, 2].map((n) => {
              const ph = ((((t - radar) / 22 + n / 3) % 1) + 1) % 1;
              return <circle key={n} cx={P.x} cy={P.y} r={130 + 60 * ph} fill="none" stroke={INK} strokeWidth={5} opacity={0.2 * (1 - ph)} />;
            })
          : null}
        {/* the link: a soft arc of dots from the adapter's LED to the phone */}
        {Array.from({length: 9}, (_, i) => {
          const u = i / 8;
          const x = lerp(A.x + 80, P.x - 70, u);
          const y = lerp(A.y + 40, P.y, u) - 110 * Math.sin(Math.PI * u);
          return <circle key={i} cx={x} cy={y} r={9} fill={INK} opacity={clamp(link * 9 - i) * 0.9} />;
        })}
        {ok > 0.01 ? (
          <g transform={`translate(${(A.x + P.x) / 2} ${A.y - 130}) scale(${lerp(0.5, 1, E.outBack(clamp(ok)))})`} opacity={clamp(ok * 2)}>
            <circle r={44} fill={INK} />
            <path d="M-18 0L-5 13L20 -14" stroke={WHITE} strokeWidth={9} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        ) : null}
        {/* the scan's progress ring round the phone */}
        {sk > 0 ? <circle cx={P.x} cy={P.y} r={160} fill="none" stroke={INK} strokeWidth={10} strokeLinecap="round" pathLength={1} strokeDasharray={`${sk} 1`} transform={`rotate(-90 ${P.x} ${P.y})`} /> : null}
      </Svg>
      <Label text="Bluetooth (BLE)" latin x={540} y={770} k={E.out(prog(t, radar, 10))} size={42} weight={600} />
      {/* or Wi-Fi: the iPhone's Settings list, its network ticked (inside the safe zone: right edge at x 850) */}
      <Card x={150} y={860} w={700} h={350} k={wk} r={40}>
        <div style={{position: 'absolute', left: 40, top: 28, fontFamily: F.sans, fontWeight: 500, fontSize: 32, color: INK}}>
          {mtav('ან')} Wi-Fi: {mtav('პარამეტრები')}
        </div>
        {['OBD', 'V-LINK', 'WiFi_OBDII'].map((n, i) => {
          const sel = i === 2 && t > wifi + 16;
          return (
            <div key={n} style={{position: 'absolute', left: 26, right: 26, top: 88 + i * 84, height: 72, borderRadius: 20, background: sel ? INK : 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', paddingLeft: 26, gap: 20, ...mono(38, sel ? WHITE : INK)}}>
              <svg width={36} height={36} viewBox="0 0 24 24">
                <path d="M2 9C8 3.5 16 3.5 22 9M5.5 12.5C9.5 9 14.5 9 18.5 12.5M9 16C10.8 14.6 13.2 14.6 15 16" stroke={sel ? WHITE : INK} strokeWidth={2.2} fill="none" strokeLinecap="round" />
                <circle cx={12} cy={19.5} r={1.8} fill={sel ? WHITE : INK} />
              </svg>
              {n}
              {sel ? <span style={{marginLeft: 'auto', marginRight: 30, fontFamily: F.sans, fontSize: 40}}>✓</span> : null}
            </div>
          );
        })}
      </Card>
      {/* the honest note, two short lines, its right edge inside the safe zone (x 850) and 70 px above the subtitle */}
      {nk > 0.01 ? (
        <div style={{position: 'absolute', left: 150, top: 1236, width: 700, opacity: clamp(nk * 1.6), transform: `translateY(${(1 - clamp(nk)) * 14}px)`}}>
          <div style={{display: 'inline-block', padding: '16px 30px 18px', borderRadius: 30, background: INK, color: WHITE, fontFamily: F.sans, fontWeight: 600, fontSize: 31, lineHeight: 1.32, whiteSpace: 'nowrap'}}>
            iPhone: Wi-Fi {mtav('ან')} BLE {mtav('ადაპტერი')}
            <br />
            Android: {mtav('ნებისმიერი')}
          </div>
        </div>
      ) : null}
    </White>
  );
};

// ---- 28 code: P0300, big, as a generic reader shows it (its English line under it): it means nothing to you. A faint drift of
// other ENGINE codes (P-codes only: OBD here reads the engine and emissions) in two bands above and below, never over the code
// or its line (v2.1, the AD: the cloud crossed the hero text) ---------------------------------------------------------------------
const RAIN = ['P0420', 'P0171', 'P0442', 'P0128', 'P0455', 'P0101', 'P0133', 'P0507', 'P0340', 'P0011', 'P0302', 'P0174'];
export const CodeShot: React.FC = () => {
  const {t, len, L} = useShot('code');
  const at = L('codeIn');
  const k = E.inOut(prog(t, 0, len));
  const inK = sp(t, at - 2, 150, 16);
  return (
    <White bg="#F4F4F4">
      {RAIN.map((c, i) => {
        const top = i < 6;
        const j = top ? i : i - 6;
        const x = 150 + ((j * 157 + (top ? 0 : 80)) % 780);
        const band = top ? [290, 560] : [1060, 1330];
        const span = band[1] - band[0];
        const y = band[0] + ((((j * 97) % span) - t * (0.7 + (j % 3) * 0.25)) % span + span) % span;
        const edge = Math.min(y - band[0], band[1] - y) / 40;
        return (
          <div key={c} style={{position: 'absolute', left: x - 120, top: y - 22, width: 240, textAlign: 'center', ...mono(42, '#C2C2C2'), fontWeight: 500, opacity: 0.75 * clamp(edge)}}>
            {c}
          </div>
        );
      })}
      <div style={{position: 'absolute', left: 0, right: 0, top: 640, textAlign: 'center', ...mono(210), opacity: clamp(inK * 1.5), transform: `scale(${lerp(1.2, 1, clamp(inK)) * lerp(1, 1.04, k)})`}}>P0300</div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 930, textAlign: 'center', fontFamily: F.sans, fontWeight: 400, fontSize: 38, color: INK, opacity: E.out(prog(t, at + 14, 10)), whiteSpace: 'nowrap'}}>
        Random/Multiple Cylinder Misfire Detected
      </div>
    </White>
  );
};

// ---- 29 morph: the English line scrambles and resolves into the Georgian (the app's own words), and under it a cylinder skips:
// four cylinders fire in turn, the third stays dark ---------------------------------------------------------------------------------
const KA = 'ცილინდრის გამოტოვება';
const GLYPHS = 'აბგდევზთიკლმნოპჟრსტუფქღყშჩცძწჭხჯჰ';
export const MorphShot: React.FC = () => {
  const {t, len, L} = useShot('morph');
  const scr = L('scramble');
  const word = L('word');
  const k = E.inOut(prog(t, 0, len));
  const q = clamp((t - scr) / Math.max(1, word - scr + 8));
  const text = mtav(KA)
    .split('')
    .map((ch, i) => {
      if (ch === ' ') return ' ';
      const settle = (i / KA.length) * 0.7 + 0.3;
      return q >= settle ? ch : mtav(GLYPHS[(i * 7 + Math.floor(t / 2)) % GLYPHS.length]);
    })
    .join('');
  const shown = t >= scr;
  const kaSize = Math.min(118, Math.floor((118 * 900) / Math.max(1, textWidth(mtav('გამოტოვება'), `700 118px ${F.sans}`))));
  const fire = (i: number) => {
    const ph = ((t / 6 + i * 1.5) % 6 + 6) % 6;
    return i === 2 ? 0 : ph < 1 ? 1 - ph : 0;
  };
  return (
    <White bg="#F4F4F4">
      <div style={{position: 'absolute', left: 0, right: 0, top: 380, textAlign: 'center', ...mono(84), transform: `scale(${lerp(1, 0.72, E.inOut(prog(t, word - 4, 8)))})`, transformOrigin: '540px 0'}}>P0300</div>
      {!shown ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: 560, textAlign: 'center', fontFamily: F.sans, fontWeight: 400, fontSize: 38, color: INK, whiteSpace: 'nowrap'}}>Random/Multiple Cylinder Misfire Detected</div>
      ) : (
        <div style={{position: 'absolute', left: 0, right: 0, top: 520, textAlign: 'center', fontFamily: F.sans, fontWeight: 700, fontSize: kaSize, lineHeight: 1.08, color: INK, whiteSpace: 'nowrap', transform: `scale(${lerp(0.96, 1, E.out(clamp(q * 1.4)))})`}}>
          {text.split(' ')[0]}
          <br />
          {text.split(' ').slice(1).join(' ')}
        </div>
      )}
      {/* the four cylinders: pistons in their bores, a spark over each; the third one never fires */}
      <Svg style={{transform: `translateY(120px) scale(${lerp(1, 1.03, k)})`, transformOrigin: '540px 1000px'}}>
        {[0, 1, 2, 3].map((i) => {
          const x = 300 + i * 160;
          const f = fire(i);
          const stroke = i === 2 ? 0 : Math.sin(((t / 6 + i * 1.5) % 6) / 6 * Math.PI * 2) * 40;
          const appear = E.out(prog(t, word + i * 2, 10));
          return (
            <g key={i} opacity={appear}>
              <rect x={x - 62} y={790} width={124} height={420} rx={30} fill="#E4E4E4" />
              <rect x={x - 50} y={900 + stroke} width={100} height={150} rx={14} fill={i === 2 ? '#B8B8B8' : INK} />
              <rect x={x - 8} y={1050 + stroke} width={16} height={150} rx={8} fill={i === 2 ? '#C8C8C8' : '#444'} />
              <circle cx={x} cy={830} r={30 + 26 * f} fill={AMBER} opacity={0.85 * f} />
              <circle cx={x} cy={830} r={10} fill={i === 2 ? '#C8C8C8' : f > 0.2 ? '#FFF2D6' : '#8A8A8A'} />
              {i === 2 ? <path d="M-18 -18L18 18M18 -18L-18 18" transform={`translate(${x} 760)`} stroke={INK} strokeWidth={8} strokeLinecap="round" opacity={E.out(prog(t, L('misfire'), 6))} /> : null}
            </g>
          );
        })}
      </Svg>
    </White>
  );
};

// ---- 30 scale: how serious: the three answers the app gives, a ladder; the marker settles on the middle one --------------------
const LEVELS = ['კი, შეგიძლია იარო', 'იარე, მაგრამ მალე ხელოსანთან', 'გაჩერდი, როცა უსაფრთხოდ შეძლებ'];
export const ScaleShot: React.FC = () => {
  const {t, L} = useShot('scale');
  const ladder = L('ladder');
  const marker = L('marker');
  const m = sp(t, marker, 150, 16);
  const ROW_H = 190;
  const TOP = 470;
  return (
    <White bg="#F4F4F4">
      <div style={{position: 'absolute', left: 90, right: 90, top: TOP + ROW_H * lerp(0, 1, clamp(m)) - 12, height: ROW_H - 16, borderRadius: 40, background: INK, opacity: clamp(m * 2), boxShadow: '0 24px 50px rgba(0,0,0,0.18)'}} />
      {LEVELS.map((l, i) => {
        const a = E.out(prog(t, ladder + i * 2 - 4, 8));
        const sel = i === 1 && m > 0.5;
        return (
          <div key={l} style={{position: 'absolute', left: 124, right: 100, top: TOP + i * ROW_H + 52, display: 'flex', alignItems: 'center', gap: 34, opacity: a, transform: `translateX(${(1 - a) * 30}px)`}}>
            <svg width={64} height={64} viewBox="0 0 24 24" style={{flex: 'none'}}>
              {i === 0 ? <circle cx={12} cy={12} r={10} fill="none" stroke={sel ? WHITE : INK} strokeWidth={2.4} /> : null}
              {i === 1 ? <circle cx={12} cy={12} r={10} fill={sel ? AMBER : 'none'} stroke={sel ? AMBER : INK} strokeWidth={2.4} /> : null}
              {i === 2 ? <circle cx={12} cy={12} r={10} fill={INK} /> : null}
            </svg>
            <span style={{fontFamily: F.sans, fontWeight: 700, fontSize: 38, color: sel ? WHITE : INK, whiteSpace: 'nowrap'}}>{mtav(l)}</span>
          </div>
        );
      })}
    </White>
  );
};

// ---- 31 verdict: in the car in the day, his phone rises from below the frame (one opaque unit, eased, a soft settle) into its
// holder on the dash under the windscreen, the real result on it (the capture without its P0420 row: v2.1, the AD); only once it
// has settled does its verdict lift out big: „იარე, მაგრამ მალე ხელოსანთან". Through the glass a soft road, never grey boxes ------
export const RESULT = '22-obd-result-p0300';
export const VerdictShot: React.FC = () => {
  const {t, len, L} = useShot('verdict');
  const at = L('verdict');
  const r = riseIn(t, 0);
  const k = E.inOut(prog(t, 0, len));
  const fl = float(t);
  const W = lerp(410, 420, k);
  const pose = atFoot({x: 540, w: W, yaw: -5 + fl.roll * 0.5, pitch: 10 + fl.pitch * 0.5, roll: 1}, riseFoot(r, 1320, W * 2.25));
  const lk = sp(t, at, 140, 18);
  const top = bodyBox(pose).y;
  const to: Rect = {x: 70, y: Math.max(270, top + 110), w: 940, h: (940 * (R.resVerdict.y1 - R.resVerdict.y0) * 2346) / ((R.resVerdict.x1 - R.resVerdict.x0) * 1080)};
  return (
    <div style={{position: 'absolute', inset: 0, background: '#C9CDD4', overflow: 'hidden'}}>
      {/* through the windscreen: the morning road, soft (the lens is on the phone) */}
      <Svg style={{filter: 'blur(10px)'}}>
        <defs>
          <linearGradient id="veSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#F5F7FA" />
            <stop offset="1" stopColor="#E3E7ED" />
          </linearGradient>
          <linearGradient id="veRoad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#B9BCC1" />
            <stop offset="1" stopColor="#8E9196" />
          </linearGradient>
        </defs>
        <rect width={1080} height={1920} fill="url(#veSky)" />
        <path d="M-60 900Q540 870 1140 900L1140 1300L-60 1300Z" fill="url(#veRoad)" />
        <path d="M520 905L470 1300M560 905L610 1300" stroke="#F4F4F4" strokeWidth={10} opacity={0.6} />
        {[
          [80, 780, 150],
          [230, 820, 110],
          [880, 790, 160],
          [1010, 840, 120],
          [700, 860, 70],
        ].map(([x, y, rr], i) => (
          <circle key={i} cx={x} cy={y} r={rr} fill={i % 2 ? '#AEB5A8' : '#9FA79A'} />
        ))}
      </Svg>
      <Svg>
        <defs>
          <linearGradient id="veDash" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#4A4E57" />
            <stop offset="0.25" stopColor="#30333A" />
            <stop offset="1" stopColor="#1E2025" />
          </linearGradient>
          <linearGradient id="vePil" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#1A1C20" />
            <stop offset="1" stopColor="#2C2F35" />
          </linearGradient>
        </defs>
        {/* the A-pillars and the roof's edge framing the glass */}
        <path d="M-60 -40L120 -40L40 1240L-60 1240Z" fill="url(#vePil)" />
        <path d="M1140 -40L960 -40L1040 1240L1140 1240Z" fill="url(#vePil)" />
        <path d="M-60 -40H1140V120Q540 170 -60 120Z" fill="#202227" />
        {/* the dash: its soft top, a stitched seam along the edge, the two centre vents with their slats */}
        <path d="M-60 1190Q540 1110 1140 1190L1140 1920L-60 1920Z" fill="url(#veDash)" />
        <path d="M-60 1190Q540 1110 1140 1190" stroke="#7A808B" strokeWidth={4} fill="none" opacity={0.6} />
        <path d="M-60 1214Q540 1134 1140 1214" stroke="#555A63" strokeWidth={2.5} strokeDasharray="12 10" fill="none" opacity={0.8} />
        {[230, 850].map((x) => (
          <g key={x}>
            <rect x={x - 130} y={1290} width={260} height={96} rx={30} fill="#141518" />
            {Array.from({length: 4}, (_, i) => (
              <rect key={i} x={x - 116} y={1304 + i * 19} width={232} height={8} rx={4} fill="#3A3D44" />
            ))}
          </g>
        ))}
        {/* the phone holder's clip on the dash */}
        <rect x={500} y={1290} width={80} height={60} rx={14} fill="#121316" />
      </Svg>
      {r > 0.001 ? <Phone3 src={RESULT} pose={pose} veil={0.32 * clamp(lk)} shadow={0.7} /> : null}
      <Lift src={RESULT} r={R.resVerdict} pose={pose} to={to} k={lk} radius={36} show={t >= at - 1 ? 1 : 0} />
    </div>
  );
};

void Img;
void staticFile;
void ScreenLayer;
export const SHOTS: Record<string, React.FC> = {
  speaks: SpeaksShot,
  noone: NooneShot,
  ecu: EcuShot,
  port: PortShot,
  cars: CarsShot,
  plug: PlugShot,
  app: AppShot,
  found: FoundShot,
  code: CodeShot,
  morph: MorphShot,
  scale: ScaleShot,
  verdict: VerdictShot,
};
