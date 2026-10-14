// Mountains, no signal (Alice offline), then WHY it works offline: one continuous camera move through a refined day scene
// (the owner, 2026-10-12: "these graphics are terrible": the line-art mountains, the flat grey road and the green line are
// gone). A real perspective world in metres seen from a LOW chase camera (the horizon just over the coupe's roof, so the
// kit's rear elevation is the true view and the near road is a band under the car): a snowy far range seen through the
// saddle of a near massif (opaque light and shade facets on its spurs, snow on the shoulders), a serpentine climbing its
// face to the pass, pines framing the valley with real parallax, the hero coupe (the forest's cobalt car) in its lane, the
// route a cobalt ribbon coming out from behind its roof and running up the middle of the switchbacks. A lattice tower on
// the right shoulder (against plain sky) loses its three waves and is struck through in ink; Alice says she will take you
// anyway, the route keeps flowing. Then
// three refined tiles (the map, search, the voice) spring up on their words in a row under the tower's foot (the slash
// fades as the first lands); on „ტელეფონშივეა" the phone rises out of the car (clear of its roof) as a mid-size
// hero with the REAL navigator on its screen and the tiles dive into it as it comes up (shrinking to chips that vanish
// into its map, never resting on the instruction card); on „აბა, მოუსმინე" the camera pushes in, the
// phone comes up to full size and the world dissolves to white (the voices shot opens there).
import React, {useId} from 'react';
import {Img, staticFile, useCurrentFrame} from 'remotion';
import {C, rgba} from '../tokens';
import {Car} from '../scenes/illo/car';
import {IlloDefs, paint} from '../scenes/illo/solid';
import {mix} from '../scenes/illo/palette';
import {SRC_H, SRC_W} from './Iphone';
import {pine} from './refined';
import {clamp, E, ev, evs, fr, hash, lerp, prog, shot, smoothPath, sp} from './lib';

const W = 1080;
const H = 1920;
const f1 = (v: number) => v.toFixed(1);
type P2 = [number, number];
const poly = (a: P2[]) => `M${a.map((p) => `${f1(p[0])} ${f1(p[1])}`).join('L')}`;

// ---- the world (metres): X right, Y up, Z ahead --------------------------------------------------------------------------
const FP = 1100; // focal length, px
const HC = 1.5; // the camera's height: just over the coupe's roof (1.28 m)
const HY = 1105; // the horizon on screen
const ROAD_W = 7.0; // two 3.5 m lanes
const LANE = 1.75; // the car's lane centre, right of the centre line
const CAR_L = 4.6; // the coupe: 4.6 m long, so the kit's rear view is 1.91 m wide (2.1 m with the mirrors)
const Z_FOOT = 125; // the massif's foot
const Z_PASS = 330; // the ridge and the pass
const FAR_Z = 2600; // the far range
const V = 0.2; // m a frame (about 22 km/h: climbing)
const s01 = (x: number) => {
  const t = clamp(x);
  return t * t * (3 - 2 * t);
};
/** the road's centre line: a gentle S on the valley floor, then wide switchbacks up the massif's face to the pass at X 0 */
const roadX = (Z: number) => {
  const near = 2.4 * Math.sin(Z / 17 + 0.4) + 1.3 * Math.sin(Z / 41 + 1);
  const amp = 3 + 34 * s01((Z - 100) / 110);
  const far = amp * Math.sin((Z - Z_PASS) / 19);
  return lerp(near, far, s01((Z - 85) / 70));
};
const XPASS = roadX(Z_PASS);
/** the ridge's height along X: a saddle at the pass, higher shoulders either side */
const ridgeY = (X: number) => {
  const d = Math.abs(X - XPASS);
  return 138 + 72 * Math.pow(clamp(d / 170), 1.5) + clamp((d - 15) / 50) * (7 * Math.sin(X / 23 + 0.5) + 3.5 * Math.sin(X / 9.5));
};
/** the face's profile from the foot (u 0) to the ridge (u 1): concave, steeper toward the top */
const fz = (u: number) => Math.pow(clamp(u), 1.2);
const zOfU = (u: number) => Z_FOOT + u * (Z_PASS - Z_FOOT);
const groundY = (X: number, Z: number) => (Z <= Z_FOOT ? 0 : ridgeY(X) * fz((Z - Z_FOOT) / (Z_PASS - Z_FOOT)));

type Smp = {Z: number; X: number; Y: number; nx: number; nz: number; s: number};
const mk = (Z: number, s = 0): Smp => {
  const X = roadX(Z);
  const dx = roadX(Z + 0.5) - roadX(Z - 0.5);
  const l = Math.hypot(1, dx);
  return {Z, X, Y: groundY(X, Z), nx: 1 / l, nz: -dx / l, s};
};
const SAMPLES: Smp[] = (() => {
  const out: Smp[] = [];
  let Z = 0;
  let s = 0;
  while (Z <= Z_PASS + 1e-6) {
    const q = mk(Z);
    const p = out[out.length - 1];
    if (p) s += Math.hypot(q.X - p.X, q.Y - p.Y, q.Z - p.Z);
    q.s = s;
    out.push(q);
    Z += Z < 60 ? 0.5 : Z < 150 ? 1 : 1.5;
  }
  return out;
})();
/** arc length at Z, and Z at an arc length (interpolated) */
const sAt = (Z: number) => {
  for (let i = 1; i < SAMPLES.length; i++) {
    if (SAMPLES[i].Z >= Z) {
      const a = SAMPLES[i - 1];
      const b = SAMPLES[i];
      return lerp(a.s, b.s, clamp((Z - a.Z) / Math.max(1e-6, b.Z - a.Z)));
    }
  }
  return SAMPLES[SAMPLES.length - 1].s;
};
const zAtS = (s: number) => {
  for (let i = 1; i < SAMPLES.length; i++) {
    if (SAMPLES[i].s >= s) {
      const a = SAMPLES[i - 1];
      const b = SAMPLES[i];
      return lerp(a.Z, b.Z, clamp((s - a.s) / Math.max(1e-6, b.s - a.s)));
    }
  }
  return Z_PASS;
};
/** the road in pieces (sample index ranges), short near the camera, longer far away: drawn far to near, mixed with the trees */
const PIECES: P2[] = (() => {
  const out: P2[] = [];
  let i0 = 0;
  for (let i = 1; i < SAMPLES.length; i++) {
    const want = SAMPLES[i0].Z < 60 ? 2 : SAMPLES[i0].Z < 150 ? 4 : 6;
    if (SAMPLES[i].Z - SAMPLES[i0].Z >= want || i === SAMPLES.length - 1) {
      out.push([i0, i]);
      i0 = i;
    }
  }
  return out;
})();
/** the centre line's dashes (3.5 m on, 4.5 m off) on the valley floor: [Z of the near end, Z of the far end] */
const DASHES: P2[] = (() => {
  const out: P2[] = [];
  for (let s = 1; s < sAt(Z_FOOT - 4); s += 8) out.push([zAtS(s), zAtS(s + 3.5)]);
  return out;
})();

// the pines: two loose lines framing the valley (they stream past), a low forest at the massif's foot (a gap where the
// road enters), small pines scattered up the lower face
type Tree = {X: number; Z: number; h: number; w: number};
const u01 = (a: number, b: number) => 0.5 + 0.5 * hash(a, b);
const nearRoad = (X: number, Z: number, r: number) => {
  for (let dz = -8; dz <= 8; dz += 1) if (Math.hypot(X - roadX(Z + dz), dz) < r) return true;
  return false;
};
const TREES: Tree[] = (() => {
  const out: Tree[] = [];
  for (let i = 0; i < 80; i++) {
    const Z = 30 + 92 * u01(i, 1);
    const side = hash(i, 2) > 0 ? 1 : -1;
    const X = roadX(Z) + side * (11 + 46 * u01(i, 3) ** 1.5);
    const h = 10 + 7 * u01(i, 4);
    out.push({X, Z, h, w: h * (0.4 + 0.08 * u01(i, 5))});
  }
  for (let i = 0; i < 150; i++) {
    const Z = Z_FOOT - 7 + 18 * u01(i, 6);
    const X = -340 + 680 * (i / 149) + 2.5 * hash(i, 7);
    if (nearRoad(X, Z, 12)) continue;
    const h = 7 + 4 * u01(i, 8);
    out.push({X, Z, h, w: h * 0.46});
  }
  for (let i = 0; i < 70; i++) {
    const u = 0.08 + 0.5 * u01(i, 9) ** 1.3;
    const Z = zOfU(u);
    const X = XPASS - 170 + 340 * u01(i, 10);
    if (nearRoad(X, Z, 11)) continue;
    const h = 10 + 5 * u01(i, 11);
    out.push({X, Z, h, w: h * 0.42});
  }
  return out;
})();
// reflector posts on both verges of the valley road
const POSTS: P2[] = [];
for (let Z = 12; Z < Z_FOOT - 6; Z += 16) for (const side of [-1, 1]) POSTS.push([side, Z]);

// the tower on the right shoulder (the far range is low behind it: plain sky)
const TOWER_X = XPASS + 58;
const TOWER_Z = Z_PASS - 2;
// the massif's spurs: crest lines from the ridge down to the foot (lit on their left, shade on their right) and the gullies
// between them; they tile the face, so every facet is opaque and none overlaps another
const CRESTS = [-146, -92, -46, 42, 88, 140];
const crestX = (k: number, u: number) => lerp(CRESTS[k] * 1.12, CRESTS[k], u) + 3 * Math.sin(2.4 * u + k * 1.9);
const gullyX = (k: number, u: number) => 0.5 * (crestX(k, u) + crestX(k + 1, u)) + 3 * Math.sin(4 * u + k * 1.7);
// the far range: peaks drawn lowest first (a taller one stands in front), low behind the tower, tall in the saddle
type Peak = {X: number; h: number; wl: number; wr: number; i: number};
const PEAKS: Peak[] = (
  [
    {X: -3000, h: 1900, wl: 2600, wr: 2700},
    {X: -1900, h: 2150, wl: 2900, wr: 2800},
    {X: -1100, h: 1750, wl: 2400, wr: 2300},
    {X: -560, h: 2050, wl: 2700, wr: 2500},
    {X: -170, h: 1700, wl: 2300, wr: 2200},
    {X: 170, h: 1550, wl: 2200, wr: 2400},
    {X: 900, h: 1350, wl: 2200, wr: 2200},
    {X: 1700, h: 1800, wl: 2600, wr: 2600},
    {X: 2600, h: 2000, wl: 2800, wr: 2800},
  ] as Omit<Peak, 'i'>[]
)
  .map((p, i) => ({...p, i}))
  .sort((a, b) => a.h - b.h);

// ---- the camera ---------------------------------------------------------------------------------------------------------
type Cam = {x: number; y: number; z: number; hy: number};
const P = (c: Cam, X: number, Y: number, Z: number): P2 => {
  const z = Math.max(0.6, Z - c.z);
  return [540 + ((X - c.x) * FP) / z, c.hy - ((Y - c.y) * FP) / z];
};
// the 2D push of the whole world (the slash, the tiles' pops, the final push-in) is about this point
const AX = 540;
const AY = 1040;

// ---- parts --------------------------------------------------------------------------------------------------------------
// the tiles' row: under the tower's foot (it stands about y 280..500 with its waves), over the switchbacks
const TILE_Y = 700;
const CLOUD = 'M-150 20C-152 -4 -128 -18 -102 -13C-94 -45 -56 -58 -26 -43C-10 -76 42 -80 62 -45C88 -60 128 -44 124 -13C152 -16 170 4 162 20Z';
// the coupe's rear silhouette (the kit's end-view numbers, car units): the phone rises from behind it
const CAR_OUT: P2[] = [
  [0, -280],
  [63, -279],
  [92, -271],
  [127, -234],
  [146, -196],
  [180, -186],
  [198, -168],
  [210, -132],
  [209, -102],
  [201, -72],
  [200, 4],
];

/** a gliding bird: two wings that beat (il5, never an ink speck) */
const Bird: React.FC<{x: number; y: number; s: number; flap: number}> = ({x, y, s, flap}) => {
  const k = Math.sin(flap);
  const tip = -2 + 9 * k;
  const elb = -6 - 3 * k;
  return (
    <path
      d={`M-22 ${f1(tip)}Q-11 ${f1(elb - 4)} 0 2Q11 ${f1(elb - 4)} 22 ${f1(tip)}Q11 ${f1(elb + 1)} 0 6Q-11 ${f1(elb + 1)} -22 ${f1(tip)}Z`}
      transform={`translate(${f1(x)} ${f1(y)}) scale(${s.toFixed(3)})`}
      fill={C.il5}
    />
  );
};

/** the lattice tower: legs, braces, a platform, three antenna panels, the mast; its waves fade one by one, then the slash
 *  (ink on a white casing: the film keeps red for the arrival's strike-out alone), which fades once the tiles arrive */
const Tower: React.FC<{x: number; y: number; u: number; waves: number[]; slash: number; slashO: number; t: number}> = ({x, y, u, waves, slash, slashO, t}) => {
  const legH = 46 * u;
  const h0 = 6.2 * u;
  const h1 = 1.5 * u;
  const top = y - 62 * u;
  let br = '';
  const levels = 6;
  for (let i = 0; i < levels; i++) {
    const ya = y - (legH * i) / levels;
    const yb = y - (legH * (i + 1)) / levels;
    const ha = lerp(h0, h1, i / levels);
    const hb = lerp(h0, h1, (i + 1) / levels);
    br += `M${f1(x - ha)} ${f1(ya)}L${f1(x + hb)} ${f1(yb)}M${f1(x + ha)} ${f1(ya)}L${f1(x - hb)} ${f1(yb)}M${f1(x - hb)} ${f1(yb)}H${f1(x + hb)}`;
  }
  const lw = Math.max(1.6, 0.55 * u);
  const wc: P2 = [x, y - 52 * u];
  return (
    <g>
      <ellipse cx={x} cy={y + 0.6 * u} rx={9 * u} ry={1.4 * u} fill={C.il4} opacity={0.35} />
      <path d={br} stroke={C.il5} strokeWidth={lw * 0.7} fill="none" opacity={0.9} />
      <path d={`M${f1(x - h0)} ${f1(y)}L${f1(x - h1)} ${f1(y - legH)}M${f1(x + h0)} ${f1(y)}L${f1(x + h1)} ${f1(y - legH)}`} stroke={C.il6} strokeWidth={lw * 1.4} strokeLinecap="round" fill="none" />
      <rect x={x - 3.2 * u} y={y - legH - 1.4 * u} width={6.4 * u} height={1.6 * u} rx={0.4 * u} fill={C.il6} />
      <path d={`M${f1(x)} ${f1(y - legH)}V${f1(top)}`} stroke={C.il6} strokeWidth={lw * 1.2} strokeLinecap="round" />
      {[-2.6, 0, 2.6].map((dx, i) => (
        <rect key={i} x={x + dx * u - 0.85 * u} y={y - legH - 11 * u} width={1.7 * u} height={8 * u} rx={0.5 * u} fill={C.il0} stroke={C.il5} strokeWidth={Math.max(1, 0.25 * u)} />
      ))}
      <circle cx={x} cy={top} r={1.3 * u} fill={C.il6} />
      {/* the waves either side of the antennas: alive (a soft outward pulse), then out one by one */}
      {[0, 1, 2].map((i) => {
        const r = (12 + 9 * i) * u;
        const pulse = 0.75 + 0.25 * Math.sin(t * 0.5 - i * 1.3);
        const o = waves[i] * pulse;
        if (o <= 0.01) return null;
        const a = 0.62;
        const arc = (side: number) =>
          `M${f1(wc[0] + side * r * Math.cos(a))} ${f1(wc[1] - r * Math.sin(a))}A${f1(r)} ${f1(r)} 0 0 ${side > 0 ? 1 : 0} ${f1(wc[0] + side * r * Math.cos(a))} ${f1(wc[1] + r * Math.sin(a))}`;
        return <path key={i} d={arc(1) + arc(-1)} fill="none" stroke={C.il6} strokeWidth={Math.max(3, 2.1 * u)} strokeLinecap="round" opacity={o} />;
      })}
      {slash > 0 && slashO > 0.01 ? (
        <g opacity={slashO}>
          <line x1={wc[0] - 28 * u} y1={wc[1] - 22 * u} x2={wc[0] - 28 * u + 56 * u * slash} y2={wc[1] - 22 * u + 44 * u * slash} stroke={C.il0} strokeWidth={Math.max(10, 5.6 * u)} strokeLinecap="round" />
          <line x1={wc[0] - 28 * u} y1={wc[1] - 22 * u} x2={wc[0] - 28 * u + 56 * u * slash} y2={wc[1] - 22 * u + 44 * u * slash} stroke={C.ink} strokeWidth={Math.max(5.5, 3.1 * u)} strokeLinecap="round" />
        </g>
      ) : null}
    </g>
  );
};

/** a feature tile: a white rounded square, a soft shadow, an ink glyph with one cobalt part that moves */
const Tile: React.FC<{kind: 'map' | 'search' | 'voice'; x: number; y: number; s: number; rot: number; o: number; t: number; uid: string}> = ({kind, x, y, s, rot, o, t, uid}) => {
  const ink = C.ink;
  const acc = C.accA;
  const draw = clamp(t / 16);
  return (
    <g transform={`translate(${f1(x)} ${f1(y)}) rotate(${rot.toFixed(2)}) scale(${s.toFixed(4)})`} opacity={o}>
      <ellipse cx={0} cy={100} rx={92} ry={16} fill={paint(uid, 'shade')} opacity={0.9} />
      <rect x={-86} y={-78} width={172} height={172} rx={46} fill={C.ink} opacity={0.07} />
      <rect x={-86} y={-86} width={172} height={172} rx={46} fill={C.il0} stroke={C.il2} strokeWidth={1.5} />
      <g fill="none" stroke={ink} strokeLinecap="round" strokeLinejoin="round">
        {kind === 'map' ? (
          <>
            <path d="M-40 -26L-14 -36L14 -26L40 -36V30L14 40L-14 30L-40 40Z" strokeWidth={7} />
            <path d="M-14 -36V30M14 -26V40" strokeWidth={4} opacity={0.45} />
            <path d="M-28 22C-18 6 -6 16 2 2S18 -14 26 -18" stroke={acc} strokeWidth={7} pathLength={1} strokeDasharray={`${draw} 1`} />
            <circle cx={26} cy={-18} r={7} fill={acc} stroke="none" opacity={clamp((t - 12) / 4)} />
          </>
        ) : null}
        {kind === 'search' ? (
          <>
            <circle cx={-8} cy={-8} r={27} strokeWidth={8} />
            <path d="M12 12L34 34" strokeWidth={11} />
            <circle cx={-8} cy={-8} r={8 + 2 * Math.sin(t / 4)} fill={acc} stroke="none" />
          </>
        ) : null}
        {kind === 'voice' ? (
          <>
            <path d="M-38 -12H-24L-6 -28V28L-24 12H-38Z" fill={ink} strokeWidth={6} />
            {[0, 1].map((i) => (
              <path key={i} d={i === 0 ? 'M8 -14Q18 0 8 14' : 'M18 -26Q36 0 18 26'} stroke={acc} strokeWidth={7} opacity={0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t / 3.2 - i * 1.4))} />
            ))}
          </>
        ) : null}
      </g>
    </g>
  );
};

/** the phone, drawn at its size (no CSS scale): the studio's black iPhone proportions, the REAL navigator capture filling
 *  the window by its height (nothing of the app cut off), the status bar (Wi-Fi beside "no internet" would lie) under a
 *  clean white strip, the Dynamic Island, its own soft shadow, a glint, a flash when a tile lands */
const Handset: React.FC<{cx: number; cy: number; w: number; rot: number; glint: number; flash?: number; lift?: number}> = ({cx, cy, w, rot, glint, flash = 0, lift = 1}) => {
  const h = w * 2.15;
  const r = w * 0.168;
  const bez = Math.max(1, w * 0.026);
  const sw = w - 2 * bez;
  const sh = h - 2 * bez;
  const iw = (sh * SRC_W) / SRC_H;
  const bw = Math.max(1, w * 0.009);
  return (
    <div style={{position: 'absolute', left: cx - w / 2, top: cy - h / 2, width: w, height: h, transform: rot ? `rotate(${rot.toFixed(2)}deg)` : undefined}}>
      {/* its own shadow: soft and lower the higher it floats */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: r,
          boxShadow: `0 ${f1(w * (0.05 + 0.05 * lift))}px ${f1(w * (0.1 + 0.12 * lift))}px ${rgba(C.ink, 0.2 + 0.08 * lift)}, 0 ${f1(w * 0.01)}px ${f1(w * 0.03)}px ${rgba(C.ink, 0.18)}`,
        }}
      />
      {[
        [-1, 0.19, 0.045],
        [-1, 0.255, 0.075],
        [-1, 0.345, 0.075],
        [1, 0.29, 0.11],
      ].map(([side, y0, hh], i) => (
        <div key={i} style={{position: 'absolute', left: side < 0 ? -bw * 0.8 : undefined, right: side > 0 ? -bw * 0.8 : undefined, top: h * y0, width: bw, height: h * hh, borderRadius: bw, background: C.il6}} />
      ))}
      <div style={{position: 'absolute', inset: 0, borderRadius: r, background: `linear-gradient(135deg, ${C.il6} 0%, ${C.il7} 22%, ${C.il6} 50%, ${C.ilNight} 78%, ${C.il6} 100%)`}} />
      <div style={{position: 'absolute', inset: Math.max(0.6, w * 0.004), borderRadius: r, background: C.ilNight}} />
      <div style={{position: 'absolute', left: bez, top: bez, width: sw, height: sh, borderRadius: r - bez, overflow: 'hidden', background: C.il0}}>
        <Img src={staticFile('screens/17-nav-drive.jpg')} style={{position: 'absolute', left: (sw - iw) / 2, top: 0, width: iw, height: sh}} />
        <div style={{position: 'absolute', left: 0, top: 0, width: sw, height: sh * 0.056, background: `linear-gradient(180deg, ${C.il0} 78%, ${rgba(C.il0, 0)} 100%)`}} />
        {flash > 0.01 ? <div style={{position: 'absolute', inset: 0, background: C.il0, opacity: flash}} /> : null}
        {glint >= 0 && glint <= 1 ? (
          <div
            style={{
              position: 'absolute',
              left: lerp(-sw * 0.9, sw * 1.1, glint),
              top: -sh * 0.1,
              width: sw * 0.35,
              height: sh * 1.2,
              transform: 'rotate(18deg)',
              background: `linear-gradient(90deg, ${rgba(C.il0, 0)} 0%, ${rgba(C.il0, 0.35)} 50%, ${rgba(C.il0, 0)} 100%)`,
            }}
          />
        ) : null}
        <div style={{position: 'absolute', left: (sw - w * 0.3) / 2, top: sw * 0.034, width: w * 0.3, height: w * 0.088, borderRadius: w * 0.044, background: C.ilNight}} />
      </div>
    </div>
  );
};

export const MountainSeq: React.FC = () => {
  const t = useCurrentFrame();
  const uid = useId().replace(/[^A-Za-z0-9]/g, '');
  const base = fr(shot('mountain').from);
  const L = (s: number) => fr(s) - base;
  const arcsT = evs('arcs').map(L);
  const slashT = L(ev('slash'));
  const alice = L(ev('alice1'));
  const iconsT = evs('icons').map(L);
  const glowT = L(ev('glow'));
  const aba = L(ev('aba'));
  const LIFT = glowT - 3; // the phone rises out of the car on „ტელეფონშივეა"
  const PUSH = aba - 9; // the push-in starts before „აბა, მოუსმინე"

  // ---- the camera: a low chase camera closing in on the car (a dolly: the near world streams, the far holds), with a
  // slow lateral sway; parallax between the planes comes from the 3D world itself
  const k = E.sine(clamp(t / 150));
  const d = lerp(9.5, 6.2, k);
  const carZ = 30 + V * t; // the car's rear face
  const camZ = carZ - d;
  const carX = roadX(carZ) + LANE;
  const camX = lerp(roadX(camZ) + LANE, carX, 0.8) + 0.35 * Math.sin(t / 41);
  const cam: Cam = {x: camX, y: HC, z: camZ, hy: HY};

  // ---- the car and the phone on its dash
  const [cx, cy] = P(cam, carX, 0, carZ);
  const len = (CAR_L * FP) / d;
  const s = len / 1000;
  const xpp = (roadX(carZ + 1.5) - 2 * roadX(carZ) + roadX(carZ - 1.5)) / 2.25;
  const lean = clamp(-xpp * 260, -3, 3);
  const bob = 1.1 * Math.sin(t / 5);
  const pivot: P2 = [cx, cy - 278 * 0.3 * s];
  const rotP = (x: number, y: number): P2 => {
    const a = (lean * Math.PI) / 180;
    const dx = x - pivot[0];
    const dy = y - pivot[1];
    return [pivot[0] + dx * Math.cos(a) - dy * Math.sin(a), pivot[1] + dx * Math.sin(a) + dy * Math.cos(a) + bob];
  };
  const [phx, phy] = rotP(cx, cy - 222 * s); // the phone on the dash, seen through the rear glass
  const glassPts: P2[] = (
    [
      [-108, -198],
      [-87, -247],
      [-73, -254],
      [73, -254],
      [87, -247],
      [108, -198],
    ] as P2[]
  ).map(([u, v]) => rotP(cx + u * s, cy + v * s));

  // ---- the beats
  const waves = [0, 1, 2].map((i) => {
    const at = arcsT[2 - i]; // the outer wave goes first
    return lerp(1, 0.16, E.out(prog(t, at, 4)));
  });
  const slash = E.out(prog(t, slashT, 5));
  const slashO = 1 - E.inOut(prog(t, iconsT[0], 14)); // the slash leaves as the first tile lands: no internet, still works
  const towerKick = t >= slashT && t < slashT + 8 ? Math.sin((t - slashT) * 2.4) * 4 * (1 - (t - slashT) / 8) : 0;
  // the signal dies, then the route strokes out of the car anyway (on Alice's line), slowing as it climbs to the pass
  // the route starts where the road ahead rises over the coupe's roof line on screen, so it comes out from behind the roof:
  // drawn nearer, it peeked out between the roof and the left mirror on every left bend (a cobalt fin on the hero's flank:
  // the critic, 2026-10-12)
  const roofY = cy - 280 * s - 3; // the roof's top, less a margin for the bob and the lean
  const routeZ0 = Math.max(carZ + 5.5, camZ + (HC * FP) / Math.max(1, roofY - HY));
  const routeZ1 = lerp(routeZ0, Z_PASS, E.out(prog(t, alice, 54)));
  const sCar = sAt(routeZ0);
  const sEnd = sAt(routeZ1);
  const pulseS = t >= alice + 14 ? sCar + ((t - alice - 14) * 3) % 260 : -1e9;
  const rings = t >= alice && t < alice + 58 ? [0, 1, 2].map((i) => ((t - alice + i * 8) % 24) / 24) : [];
  // the tiles dive into the rising phone: the search tile (right over the phone's path) first and fast, the moment the
  // phone comes up under it, then the map and the voice swoop in from the sides; each shrinks to a chip and vanishes into
  // the map under the instruction card (never resting on the card: the critic, 2026-10-12)
  const FLY = 11;
  const flyAt = [LIFT + 3, LIFT + 1, LIFT + 5];
  const flyOf = (i: number, f: number) => {
    const p = prog(f, flyAt[i], FLY);
    return i === 1 ? E.out(p) : E.inOut(p);
  };
  const land = [0, 1, 2].map((i) => {
    let f = flyAt[i];
    while (flyOf(i, f) < 0.65 && f < flyAt[i] + FLY) f++;
    return f;
  });
  const flash = land.reduce((a, l) => a + (t >= l ? 0.35 * Math.exp(-(t - l) / 3) : 0), 0);
  // small camera kicks: the slash, each tile's pop; then the push-in under the rise
  const kick = [slashT, ...iconsT].reduce((a, at, i) => a + (t >= at ? (i === 0 ? 0.022 : 0.014) * Math.exp(-(t - at) / 5) * Math.min(1, (t - at) / 2) : 0), 0);
  const pushIn = E.inOut(prog(t, PUSH, 26));
  const push = (1 + 0.15 * pushIn) * (1 + kick);
  const away = E.inOut(prog(t, aba, 15)); // the world dissolves to white over 15 frames
  const toS = (p: P2): P2 => [AX + (p[0] - AX) * push, AY + (p[1] - AY) * push];

  // ---- the far range (its own plane: it barely moves)
  const pf = (X: number, Y: number) => P(cam, X, Y, FAR_Z);
  const farNodes = PEAKS.map((pk) => {
    const n = 22;
    const qs = Array.from({length: n + 1}, (_, j) => (j / n) ** 0.55); // 0 base .. 1 summit, dense near the summit
    const jag = (side: number, j: number) => (j === 0 || j === n ? 0 : pk.h * 0.022 * hash(pk.i * 31 + side, j) * (1 - qs[j] * 0.5));
    const left: P2[] = [];
    const right: P2[] = [];
    for (let j = 0; j <= n; j++) {
      const q = qs[j];
      left.push(pf(pk.X - pk.wl * (1 - q), pk.h * q ** 1.6 + jag(1, j)));
      right.push(pf(pk.X + pk.wr * (1 - q), pk.h * q ** 1.6 + jag(2, j)));
    }
    const sum = left[n];
    const crest: P2[] = [sum, pf(pk.X + pk.wr * 0.02, pk.h * 0.8), pf(pk.X + pk.wr * 0.05, pk.h * 0.55), pf(pk.X + pk.wr * 0.12, 0)];
    const bodyD = `${poly([...left, ...right.slice(0, n).reverse()])}Z`;
    const shadeD = `${poly([...crest, ...right])}Z`;
    // the snow cap: down both slopes to the snow line, a lower edge of tongues
    const sl = 0.66;
    const js = qs.findIndex((q) => q ** 1.6 >= sl);
    const capL = left.slice(js);
    const capR = right.slice(js).reverse();
    const edge: P2[] = [];
    const m = 7;
    for (let j = 1; j < m; j++) {
      const q = j / m;
      const X = lerp(pk.X + pk.wr * (1 - qs[js]), pk.X - pk.wl * (1 - qs[js]), q);
      const dip = (j % 2 === 0 ? 0.1 : -0.02) + 0.04 * hash(pk.i, j + 40);
      edge.push(pf(X, pk.h * (sl - dip)));
    }
    const capD = `${poly([...capL, ...capR, ...edge])}Z`;
    const cid = `${uid}fc${pk.i}`;
    return (
      <g key={pk.i}>
        <defs>
          <clipPath id={cid}>
            <path d={shadeD} />
          </clipPath>
        </defs>
        <path d={bodyD} fill={`url(#${uid}farLit)`} />
        <path d={shadeD} fill={`url(#${uid}farShade)`} />
        <path d={capD} fill={C.il0} />
        <path d={capD} fill={mix(C.il1, C.il2, 0.35)} clipPath={`url(#${cid})`} />
      </g>
    );
  });

  // ---- the massif: the silhouette, opaque facets clipped to it, snow on the shoulders
  const fp = (X: number, u: number) => P(cam, X, ridgeY(X) * fz(u), zOfU(u));
  const ridge: P2[] = [];
  for (let X = camX - 700; X <= camX + 700; X += 5) ridge.push(P(cam, X, ridgeY(X), Z_PASS));
  const footY = P(cam, 0, 0, Z_FOOT)[1];
  const massifD = `${poly(ridge)}L${f1(ridge[ridge.length - 1][0])} ${f1(footY + 40)}L${f1(ridge[0][0])} ${f1(footY + 40)}Z`;
  const ridgeTop = Math.min(...ridge.map((p) => p[1]));
  const US = Array.from({length: 17}, (_, i) => 1 - i / 16); // 1 (ridge) .. 0 (foot)
  const line = (fx: (u: number) => number): P2[] => {
    const pts = US.map((u) => fp(fx(u), u));
    return [[pts[0][0], pts[0][1] - 700], ...pts, [pts[pts.length - 1][0], pts[pts.length - 1][1] + 80]];
  };
  const bounds: {pts: P2[]; lit: boolean}[] = []; // boundary lines left to right; each facet lies right of its boundary
  bounds.push({pts: line(() => CRESTS[0] * 1.12 - 900), lit: true});
  CRESTS.forEach((_, kk) => {
    bounds.push({pts: line((u) => crestX(kk, u)), lit: false});
    if (kk < CRESTS.length - 1) bounds.push({pts: line((u) => gullyX(kk, u)), lit: true});
  });
  bounds.push({pts: line(() => CRESTS[CRESTS.length - 1] * 1.12 + 900), lit: false});
  // each facet is shaded ACROSS (from its left boundary to its right one, at the upper face): a lit facet runs from the gully's
  // mid tone to the crest's light, a shade facet from the crest's dark to the gully's mid tone, so a crest is a crisp ridge
  // line and a gully a soft fold
  const GI = 5; // u 0.75 in a boundary line
  const facets = bounds.slice(0, -1).map((b, i) => ({
    d: `${poly([...b.pts, ...bounds[i + 1].pts.slice().reverse()])}Z`,
    lit: b.lit,
    i,
    a: b.pts[GI],
    b: bounds[i + 1].pts[GI],
  }));
  // snow: a cap along the high shoulders, soft streaks down the shoulders' gullies
  let snowD = '';
  {
    let top: P2[] = [];
    let low: P2[] = [];
    const flush = () => {
      if (top.length > 2) snowD += smoothPath([...top, ...low.reverse()], true);
      top = [];
      low = [];
    };
    for (let X = camX - 700; X <= camX + 700; X += 4) {
      const ry = ridgeY(X);
      if (ry > 174) {
        const depth = (ry - 174) * 0.9 + 2 * Math.sin(X / 6.5) + 1.5;
        top.push(P(cam, X, ry + 0.5, Z_PASS));
        low.push(fp(X, (Math.max(0, ry - depth) / ry) ** (1 / 1.2)));
      } else flush();
    }
    flush();
    for (let kk = 0; kk < CRESTS.length - 1; kk++) {
      const g0 = gullyX(kk, 1);
      if (ridgeY(g0) < 178) continue;
      const a: P2[] = [];
      const b: P2[] = [];
      for (let j = 0; j <= 10; j++) {
        const u = 1 - 0.3 * (j / 10);
        const hw = 4.5 * (1 - j / 10) ** 0.8 + 0.4;
        a.push(fp(gullyX(kk, u) - hw, u));
        b.push(fp(gullyX(kk, u) + hw, u));
      }
      snowD += smoothPath([...a, ...b.reverse()], true);
    }
  }

  // ---- the road, the posts, the trees, the tower and the car, sorted far to near
  type Item = {z: number; node: React.ReactNode};
  const items: Item[] = [];
  const zMin = camZ + 1.6;
  const edge = (q: Smp, o: number, dy = 0): P2 => P(cam, q.X + q.nx * o, q.Y + dy, q.Z + q.nz * o);
  const ribbon = (list: Smp[], a: number, b: number, ya = 0, yb = 0) => `${poly([...list.map((q) => edge(q, a, ya)), ...list.map((q) => edge(q, b, yb)).reverse()])}Z`;
  // the route's head tapers to a point as it draws on (no blunt end); across the valley it runs in the car's lane, then
  // settles on the road's centre line before the switchbacks begin, as the app draws a route (kept in the lane it hugged
  // each switchback's inner edge); the wide translucent underlay opens out behind its start (never a wedge at the roof)
  const tip = (q: Smp) => Math.min(clamp((routeZ1 - q.Z) / 6), clamp(0.2 + (q.Z - routeZ0) / 5));
  const routeOff = (q: Smp) => LANE * (1 - s01((q.Z - 95) / 40));
  const under = (q: Smp) => clamp((q.Z - routeZ0) / 14);
  const routeRibbon = (list: Smp[], hw: number, wide = false) => {
    const w = (q: Smp) => hw * tip(q) * (wide ? under(q) : 1);
    return `${poly([...list.map((q) => edge(q, routeOff(q) - w(q))), ...list.map((q) => edge(q, routeOff(q) + w(q))).reverse()])}Z`;
  };
  const tAsph = (z: number) => mix(C.il4, mix(C.il3, C.il2, 0.45), Math.pow(clamp(z / 320), 0.6));
  // a dash: ONE perspective quad between its two world ends (never split across the road's pieces)
  const dashD = (za: number, zb: number) => {
    const A = mk(za);
    const B = mk(zb);
    const w = 0.075;
    return `${poly([edge(A, -w), edge(B, -w), edge(B, w), edge(A, w)])}Z`;
  };
  PIECES.forEach(([i0, i1], pi) => {
    if (SAMPLES[i1].Z < zMin) return;
    const list = SAMPLES.slice(i0, i1 + 1).filter((q) => q.Z >= zMin);
    if (list[0].Z > zMin && SAMPLES[i0].Z < zMin) list.unshift(mk(zMin));
    if (list.length < 2) return;
    const z0 = SAMPLES[i0].Z;
    const z1 = SAMPLES[i1].Z;
    const zMid = (list[0].Z + list[list.length - 1].Z) / 2 - camZ;
    const kpx = FP / zMid;
    const fogK = clamp((zMid - 60) / 300);
    const valley = z1 < Z_FOOT - 2;
    // the dashes that start in this piece (drawn whole, after the asphalt of every piece they cross)
    let dashes = '';
    if (zMid < 100) {
      for (const [za, zb] of DASHES) {
        const a = Math.max(za, zMin);
        if (zb <= a + 0.3) continue;
        if (a >= Math.max(z0, zMin - 1e-6) && a < z1) dashes += dashD(a, zb);
      }
    }
    // the route over this piece
    let route: Smp[] = [];
    if (list[list.length - 1].Z > routeZ0 && list[0].Z < routeZ1) {
      route = list.filter((q) => q.Z >= routeZ0 && q.Z <= routeZ1);
      const last = list[list.length - 1];
      if (routeZ1 < last.Z && routeZ1 > list[0].Z) route.push(mk(routeZ1));
      if (routeZ0 > list[0].Z && routeZ0 < last.Z) route.unshift(mk(routeZ0));
    }
    const pulse = route.filter((q) => q.s <= pulseS && q.s >= pulseS - 9 && q.s <= sEnd && q.s > sCar + 6);
    const bank = mix(C.il4, C.il2, Math.pow(clamp(zMid / 110), 0.7));
    items.push({
      z: (list[0].Z + list[list.length - 1].Z) / 2,
      node: (
        <g key={`r${pi}`}>
          {valley ? (
            <>
              {/* low grassy berms beyond the gravel: darker near, they frame the lane */}
              <path d={ribbon(list, ROAD_W / 2 + 0.8, ROAD_W / 2 + 4.2, 0, 1.0)} fill={bank} />
              <path d={ribbon(list, -ROAD_W / 2 - 0.8, -ROAD_W / 2 - 4.2, 0, 0.7)} fill={bank} />
            </>
          ) : null}
          <path d={ribbon(list, -ROAD_W / 2 - 0.8, ROAD_W / 2 + 0.8)} fill={mix(C.il3, C.il2, 0.35 + 0.65 * fogK)} />
          <path d={ribbon(list, -ROAD_W / 2, ROAD_W / 2)} fill={tAsph(zMid)} />
          {zMid < 80 ? (
            <>
              <path d={ribbon(list, -1.2, 1.2)} fill={C.il0} opacity={0.06} />
              <path d={ribbon(list, LANE - 1.0, LANE - 0.6) + ribbon(list, LANE + 0.6, LANE + 1.0) + ribbon(list, -LANE - 1.0, -LANE - 0.6) + ribbon(list, -LANE + 0.6, -LANE + 1.0)} fill={C.il6} opacity={0.07} />
            </>
          ) : null}
          {0.15 * kpx > 0.35 ? <path d={ribbon(list, -ROAD_W / 2 + 0.2, -ROAD_W / 2 + 0.35) + ribbon(list, ROAD_W / 2 - 0.35, ROAD_W / 2 - 0.2)} fill={C.il0} /> : null}
          {dashes ? <path d={dashes} fill={C.il0} opacity={clamp((zMid - 2) / 4)} /> : null}
          {route.length > 1 ? (
            <>
              <path d={routeRibbon(route, 1.05, true)} fill={C.accA} opacity={0.2} />
              <path d={routeRibbon(route, 0.42)} fill={C.accA} />
            </>
          ) : null}
          {pulse.length > 1 ? <path d={`${poly([...pulse.map((q) => edge(q, routeOff(q) - 0.18)), ...pulse.map((q) => edge(q, routeOff(q) + 0.18)).reverse()])}Z`} fill={C.il0} opacity={0.9 * clamp((pulseS - sCar - 6) / 20)} /> : null}
        </g>
      ),
    });
  });
  POSTS.forEach(([side, Z], i) => {
    if (Z < camZ + 4) return;
    const q = mk(Z);
    const [x, y] = edge(q, side * (ROAD_W / 2 + 0.55));
    const kpx = FP / (Z - camZ);
    const pw = Math.max(1.2, 0.16 * kpx);
    const ph = 1.05 * kpx;
    // a post fades out before it reaches the frame's edge (never cut by the edge)
    const po = clamp((x - pw - 12) / 60) * clamp((W - x - pw - 12) / 60);
    if (po <= 0.01) return;
    items.push({
      z: Z,
      node: (
        <g key={`p${i}`} opacity={po}>
          <rect x={x - pw / 2} y={y - ph} width={pw} height={ph} rx={pw * 0.3} fill={C.il0} stroke={C.il4} strokeWidth={Math.max(0.6, pw * 0.12)} />
          <rect x={x - pw / 2} y={y - ph * 0.86} width={pw} height={ph * 0.14} fill={C.il6} />
        </g>
      ),
    });
  });
  TREES.forEach((tr, i) => {
    const z = tr.Z - camZ;
    if (z < 3) return;
    const kpx = FP / z;
    const hp = tr.h * kpx;
    if (hp < 4) return;
    const [x, y] = P(cam, tr.X, groundY(tr.X, tr.Z), tr.Z);
    const wp = tr.w * kpx;
    if (x + wp < -80 || x - wp > W + 80) return;
    const lv = Math.round(7 * Math.pow(clamp(z / 430), 0.55));
    items.push({z: tr.Z + 0.5, node: <path key={`t${i}`} d={pine(x, y, hp, wp)} fill={`url(#${uid}pn${lv})`} />});
  });
  {
    const zt = TOWER_Z - camZ;
    const [x, y] = P(cam, TOWER_X, groundY(TOWER_X, TOWER_Z), TOWER_Z);
    items.push({z: TOWER_Z, node: <Tower key="tower" x={x + towerKick} y={y} u={(0.9 * FP) / zt} waves={waves} slash={slash} slashO={slashO} t={t} />});
  }
  const lit = t < LIFT ? 0.5 + 0.12 * Math.sin(t / 6) : Math.max(0, 1 - (t - LIFT) / 10);
  items.push({
    z: carZ - 2.5,
    node: (
      <g key="car">
        <Car uid={uid} x={cx} y={cy} len={len} view="rear" body="coupe" paint="a" frame={t} speed={0.5} lights={{tail: 1}} lean={lean} bob={bob} />
        {/* the phone on the dash lights the cabin: a glow in the rear glass (it leaves the dash on „ტელეფონშივეა") */}
        <defs>
          <clipPath id={`${uid}gl`}>
            <path d={`${poly(glassPts)}Z`} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${uid}gl)`}>
          <ellipse cx={phx} cy={phy} rx={95 * s} ry={42 * s} fill={paint(uid, 'glow-ink')} opacity={lit} />
          {t < LIFT ? <rect x={phx - 11 * s} y={phy - 20 * s} width={22 * s} height={40 * s} rx={4 * s} fill={C.il0} opacity={0.9} /> : null}
        </g>
      </g>
    ),
  });
  // mist drifting along the mountain's foot (in front of the low forest, behind the valley's pines)
  items.push({
    z: Z_FOOT - 9,
    node: (
      <g key="mist">
        {[0, 1, 2, 3].map((i) => {
          const x = ((i * 420 + t * 0.8 - camX * 9) % 1680) - 300;
          return <ellipse key={i} cx={x} cy={footY - 10 + (i % 2) * 12} rx={340} ry={30 + (i % 2) * 10} fill={`url(#${uid}mist)`} />;
        })}
      </g>
    ),
  });
  items.sort((a, b) => b.z - a.z);

  // ---- the phone: on the dash; on „ტელეფონშივეა" it rises from behind the roof to a mid-size hero above the car (the tiles
  // fly into its screen); on „აბა, მოუსმინე" it comes up to its full size while the world pushes in and falls away
  const W0 = 262;
  const C0: P2 = [540, 752]; // its foot (and the landing rings) well clear of the coupe's roof (the critic, 2026-10-12)
  const W1 = 600 * (1 + 0.025 * E.sine(prog(t, aba + 10, 27)));
  const C1: P2 = [540, 762];
  const lift = t >= LIFT ? sp(t, LIFT, 170, 20) : 0;
  const grow = t >= aba ? sp(t, aba, 210, 25) : 0;
  const [scx, scy] = toS([cx, cy - 115 * s]);
  let pw = lerp(64, W0, E.out2(clamp(lift)));
  let pcx = lerp(scx, C0[0], clamp(lift));
  let pcy = lerp(scy, C0[1], lift);
  let prot = lean * (1 - clamp(lift)) - 3.5 * Math.sin(Math.PI * clamp(lift));
  if (grow > 0) {
    pw = W0 * Math.pow(W1 / W0, grow);
    const q = (pw - W0) / (W1 - W0);
    pcx = lerp(C0[0], C1[0], q);
    pcy = lerp(C0[1], C1[1], q);
    prot = 5 * Math.sin(Math.PI * clamp(grow * 1.15)) * (1 - clamp((t - aba) / 14));
  }
  // while it rises it is behind the car: the car's silhouette hides it (never a sticker on the roof)
  const behind = t >= LIFT && t < LIFT + 12;
  const carSil: P2[] = [...CAR_OUT, ...CAR_OUT.slice().reverse().map(([u, v]) => [-u, v] as P2)].map(([u, v]) => toS(rotP(cx + u * s, cy + v * s)));
  const clip = behind ? `path(evenodd, "M0 0H${W}V${H}H0Z ${poly(carSil)}Z")` : undefined;

  // as the phone comes forward the world behind it goes soft (a focus pull), then falls away to white
  const defocus = 6 * E.inOut(prog(t, aba, 10));

  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden', background: C.il0}}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0, filter: defocus > 0.05 ? `blur(${defocus.toFixed(2)}px)` : undefined}}>
        <IlloDefs uid={uid} />
        <defs>
          <linearGradient id={`${uid}sky`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={HY}>
            <stop offset="0" stopColor={mix(C.il1, C.il2, 0.3)} />
            <stop offset="0.55" stopColor={C.il0} />
            <stop offset="1" stopColor={C.il0} />
          </linearGradient>
          <radialGradient id={`${uid}sun`}>
            <stop offset="0" stopColor={C.il0} stopOpacity={1} />
            <stop offset="0.45" stopColor={C.il0} stopOpacity={0.6} />
            <stop offset="1" stopColor={C.il0} stopOpacity={0} />
          </radialGradient>
          <radialGradient id={`${uid}mist`}>
            <stop offset="0" stopColor={C.il0} stopOpacity={0.8} />
            <stop offset="0.6" stopColor={C.il0} stopOpacity={0.35} />
            <stop offset="1" stopColor={C.il0} stopOpacity={0} />
          </radialGradient>
          <linearGradient id={`${uid}farLit`} gradientUnits="userSpaceOnUse" x1="0" y1="200" x2="0" y2="760">
            <stop offset="0" stopColor={mix(C.il2, C.il3, 0.35)} />
            <stop offset="1" stopColor={mix(C.il1, C.il2, 0.4)} />
          </linearGradient>
          <linearGradient id={`${uid}farShade`} gradientUnits="userSpaceOnUse" x1="0" y1="200" x2="0" y2="760">
            <stop offset="0" stopColor={mix(C.il3, C.il4, 0.3)} />
            <stop offset="1" stopColor={mix(C.il2, C.il3, 0.2)} />
          </linearGradient>
          <linearGradient id={`${uid}farHaze`} gradientUnits="userSpaceOnUse" x1="0" y1="380" x2="0" y2="720">
            <stop offset="0" stopColor={C.il0} stopOpacity={0} />
            <stop offset="1" stopColor={C.il0} stopOpacity={0.55} />
          </linearGradient>
          {facets.map((f) => (
            <linearGradient key={f.i} id={`${uid}mf${f.i}`} gradientUnits="userSpaceOnUse" x1={f1(f.a[0])} y1={f1(f.a[1])} x2={f1(f.b[0])} y2={f1(f.b[1])}>
              <stop offset="0" stopColor={f.lit ? C.il2 : mix(C.il3, C.il4, 0.25)} />
              <stop offset="1" stopColor={f.lit ? mix(C.il0, C.il1, 0.55) : C.il2} />
            </linearGradient>
          ))}
          <linearGradient id={`${uid}mHaze`} gradientUnits="userSpaceOnUse" x1="0" y1={ridgeTop} x2="0" y2={footY}>
            <stop offset="0" stopColor={C.il0} stopOpacity={0} />
            <stop offset="0.45" stopColor={C.il0} stopOpacity={0} />
            <stop offset="1" stopColor={mix(C.il1, C.il2, 0.3)} stopOpacity={0.85} />
          </linearGradient>
          <linearGradient id={`${uid}vale`} gradientUnits="userSpaceOnUse" x1="0" y1={footY} x2="0" y2={H}>
            <stop offset="0" stopColor={mix(C.il1, C.il2, 0.4)} />
            <stop offset="0.25" stopColor={C.il2} />
            <stop offset="1" stopColor={mix(C.il2, C.il3, 0.4)} />
          </linearGradient>
          <linearGradient id={`${uid}foot`} gradientUnits="userSpaceOnUse" x1="0" y1="1385" x2="0" y2={H}>
            <stop offset="0" stopColor={C.bg} stopOpacity={0} />
            <stop offset="0.09" stopColor={C.bg} stopOpacity={0.72} />
            <stop offset="0.19" stopColor={C.bg} stopOpacity={0.96} />
            <stop offset="1" stopColor={C.bg} stopOpacity={1} />
          </linearGradient>
          {/* the pines: lit on their left, shaded on their right, eight tones from near (dark) to far (hazy) */}
          {Array.from({length: 8}, (_, i) => {
            const tone = mix(mix(C.il6, C.il5, 0.4), C.il2, i / 7);
            return (
              <linearGradient key={i} id={`${uid}pn${i}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor={mix(tone, C.il1, 0.2)} />
                <stop offset="0.5" stopColor={mix(tone, C.il1, 0.2)} />
                <stop offset="0.5" stopColor={tone} />
                <stop offset="1" stopColor={tone} />
              </linearGradient>
            );
          })}
          <clipPath id={`${uid}mas`}>
            <path d={massifD} />
          </clipPath>
          <clipPath id={`${uid}mLitC`}>
            {facets.filter((f) => f.lit).map((f) => (
              <path key={f.i} d={f.d} />
            ))}
          </clipPath>
          <clipPath id={`${uid}mShadeC`}>
            {facets.filter((f) => !f.lit).map((f) => (
              <path key={f.i} d={f.d} />
            ))}
          </clipPath>
        </defs>
        <g transform={`translate(${AX} ${AY}) scale(${push.toFixed(4)}) translate(${-AX} ${-AY})`}>
          <rect x={-300} y={-300} width={W + 600} height={HY + 400} fill={`url(#${uid}sky)`} />
          <circle cx={230} cy={250} r={540} fill={`url(#${uid}sun)`} />
          {[
            [190, 170, 1.05, 0.14],
            [770, 110, 0.82, 0.09],
            [990, 300, 0.6, 0.11],
          ].map(([x, y, sc, v], i) => (
            <g key={i} transform={`translate(${f1(x + t * v - camX * 0.4)} ${f1(y)}) scale(${sc})`}>
              <path d={CLOUD} transform="translate(0 7)" fill={C.il1} opacity={0.8} />
              <path d={CLOUD} fill={C.il0} />
            </g>
          ))}
          {farNodes}
          <rect x={-300} y={330} width={W + 600} height={500} fill={`url(#${uid}farHaze)`} />
          {/* the massif: a base tone (it hides any seam), then the facets, then the snow lit or shaded by its facet */}
          <path d={massifD} fill={C.il2} />
          <g clipPath={`url(#${uid}mas)`}>
            {facets.map((f) => (
              <path key={f.i} d={f.d} fill={`url(#${uid}mf${f.i})`} />
            ))}
            <rect x={-300} y={ridgeTop - 10} width={W + 600} height={footY - ridgeTop + 60} fill={`url(#${uid}mHaze)`} />
            <g clipPath={`url(#${uid}mLitC)`}>
              <path d={snowD} fill={C.il0} opacity={0.95} />
            </g>
            <g clipPath={`url(#${uid}mShadeC)`}>
              <path d={snowD} fill={mix(C.il1, C.il2, 0.3)} opacity={0.95} />
            </g>
          </g>
          <path d={poly(ridge)} fill="none" stroke={C.il0} strokeWidth={2} opacity={0.7} />
          {/* three gulls gliding over the valley, in front of the mountains: their wings beat */}
          {[0, 1, 2].map((i) => (
            <Bird key={i} x={110 + i * 78 + t * 1.2 - camX * 2} y={262 + i * 30 + 9 * Math.sin(t / 13 + i * 2)} s={1.45 - i * 0.2} flap={t * 0.62 + i * 1.9} />
          ))}
          <rect x={-300} y={footY - 1} width={W + 600} height={H - footY + 600} fill={`url(#${uid}vale)`} />
          {items.map((it) => it.node)}
          {/* Alice speaks from the car: soft rings out of the cabin */}
          {rings.map((q, i) => (
            <circle key={i} cx={cx} cy={cy - 170 * s} r={(240 + 260 * q) * s} fill="none" stroke={C.ink} strokeWidth={2.2} opacity={(1 - q) * 0.22} />
          ))}
        </g>
        {/* the foot of the frame fades toward the paper: the subtitle line reads on it */}
        <rect x={0} y={1385} width={W} height={H - 1385} fill={`url(#${uid}foot)`} />
        {away > 0 ? <rect x={0} y={0} width={W} height={H} fill={C.il0} opacity={away} /> : null}
      </svg>
      {t >= LIFT ? (
        <div style={{position: 'absolute', inset: 0, clipPath: clip}}>
          <Handset cx={pcx} cy={pcy} w={pw} rot={prot} glint={t >= aba ? prog(t, aba + 8, 16) : -1} flash={flash} lift={clamp(lift)} />
          {/* the rings share the phone's clip: while it is still behind the car, so are they */}
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
            {/* each landing tile rings out of the phone (where it is now: the first lands while it still rises): white and cobalt */}
            {land.map((l, i) => {
              if (t < l || t > l + 9 || grow > 0) return null;
              const q = (t - l) / 9;
              const g = 1 + 0.2 * E.out(q);
              const ww = pw * g;
              const hh = pw * 2.15 * g;
              return (
                <g key={i} opacity={(1 - q) * 0.85} transform={prot ? `rotate(${prot.toFixed(2)} ${f1(pcx)} ${f1(pcy)})` : undefined}>
                  <rect x={pcx - ww / 2} y={pcy - hh / 2} width={ww} height={hh} rx={ww * 0.17} fill="none" stroke={C.il0} strokeWidth={7} opacity={0.8} />
                  <rect x={pcx - ww / 2} y={pcy - hh / 2} width={ww} height={hh} rx={ww * 0.17} fill="none" stroke={C.accA} strokeWidth={3.5} />
                </g>
              );
            })}
          </svg>
        </div>
      ) : null}
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
        <IlloDefs uid={`${uid}o`} />
        {/* the three features spring up on their words, then dive into the rising phone's map (shrinking to chips) */}
        {(['map', 'search', 'voice'] as const).map((kind, i) => {
          const a = iconsT[i];
          if (t < a || prog(t, flyAt[i], FLY) >= 1) return null;
          const inn = sp(t, a, 210, 13);
          const bx = 540 + (i - 1) * 250;
          const by = TILE_Y + 6 * Math.sin((t - a) / 14 + i);
          const fly = flyOf(i, t);
          const o = clamp(inn * 3) * (1 - clamp((fly - 0.5) / 0.3));
          if (o <= 0.01) return null;
          // the target rides on the phone: the map under its instruction card (about the position arrow)
          const tx = pcx;
          const ty = pcy + 0.06 * pw * 2.15;
          // the side tiles swoop in on a low arc; the search tile drops straight in (the phone catches it)
          const mx = lerp(bx, tx, 0.5) + (i - 1) * 80;
          const my = i === 1 ? by + 40 : by - 70;
          const x = (1 - fly) ** 2 * bx + 2 * (1 - fly) * fly * mx + fly * fly * tx;
          const y0 = by + (1 - inn) * 70;
          const y = (1 - fly) ** 2 * y0 + 2 * (1 - fly) * fly * my + fly * fly * ty;
          const sc = 0.9 * inn * lerp(1, 0.22, E.out(fly));
          return <Tile key={kind} kind={kind} x={x} y={y} s={sc} rot={(1 - inn) * -14 + fly * (i - 1) * 16} o={o} t={t - a} uid={`${uid}o`} />;
        })}
      </svg>
    </div>
  );
};
