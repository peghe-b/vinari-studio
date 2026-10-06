// src/scenes/illo/backdrop.tsx: the far plane of an illustrated scene (depth 0.6 in the camera rig): 2 to 3 silhouette
// layers per kind, each a 2160 px tile that repeats seamlessly, so a scene can scroll it for parallax (Drive) or let it
// breathe (a slow idle drift). Far planes fade toward the ground (palette far()), no detail under 12 px, no gradient.
//
//   <Backdrop kind uid frame time scroll drift base seed/>
//     kind    city | mountains | highway | station | garage | room   (village, street, parking, track, tunnel and
//             inspection come with the scenes that need them)
//     time    day | night | dusk: at night windows light up (lamp tone at 0.6), lamps glow (uid's glow-ink), the
//             silhouettes step darker. On paper a night or dusk picture stands on <Plate time/> (draw it first, outside
//             any camera layer: its edges are the picture band's hard edges).
//     scroll  stage px travelled at parallax 1 (a scene passes speed x frames); each layer moves by its own k
//     drift   px a frame added to scroll (default 0.25: a backdrop never stands still)
//     base    the ground line (stage y): where the road, the floor and every object stands (default 1060 outdoors,
//             1200 indoors)
//
// The station has no brand, the garage no logo, the room no screen: generic places. Everything from C via palette.ts.
import React from 'react';
import {C, L} from '../../tokens';
import {rand} from '../../lib/anim';
import {dark, deepFreeze, far, ground, lamp, mix, type Time} from './palette';
import {circ, ell, gid, paint, poly, rr, smooth} from './solid';
import {ICONS} from './icons';

export type BackdropKind = 'city' | 'mountains' | 'highway' | 'station' | 'garage' | 'room';
export const BACKDROPS: BackdropKind[] = ['city', 'mountains', 'highway', 'station', 'garage', 'room'];
export const INDOOR: BackdropKind[] = ['garage', 'room'];
deepFreeze(BACKDROPS);
deepFreeze(INDOOR);

const TILE = 2160;
const mod = (a: number, n: number) => ((a % n) + n) % n;
const R = (seed: number, i: number, k = 0) => rand(seed * 1000 + i * 7.31 + k * 0.37);
const n1 = (v: number) => +v.toFixed(1);
const rect = (x: number, y: number, w: number, h: number) => `M${n1(x)} ${n1(y)}h${n1(w)}v${n1(h)}h${n1(-w)}Z`;
/** A tone lifted toward the light (a cushion, a lit pane) or sunk toward the ground (a recess, a window by night). */
const lift = (c: string, time: Time, t: number) => mix(c, dark(time) ? C.il4 : C.il0, t);
const sink = (c: string, time: Time, t: number) => mix(c, ground(time), t);
/** Daylight through a window: a lighter pane on a dark ground, white on paper. */
const daylight = (time: Time) => (dark(time) ? mix(C.il6, C.il5, 0.7) : C.il0);

/** Periodic noise over the tile: integer harmonics only, so x = 0 and x = 2160 meet. */
const wave = (x: number, terms: [number, number, number][]) => terms.reduce((s, [amp, m, ph]) => s + amp * Math.sin((2 * Math.PI * m * x) / TILE + ph), 0);
/** A closed silhouette from a height function sampled across the tile (and a margin), down to `base`. */
const profile = (h: (x: number) => number, base: number, from = -120, to = TILE + 120, stepX = 24) => {
  const pts: [number, number][] = [];
  for (let x = from; x <= to; x += stepX) pts.push([x, base - h(x)]);
  return smooth(pts) + `L${to} ${base + 2}L${from} ${base + 2}Z`;
};
/** A periodic distance on the tile. */
const pd = (a: number, b: number) => {
  const d = mod(a - b, TILE);
  return Math.min(d, TILE - d);
};

/** One parallax layer: the content once in <defs>, then three <use> copies around the visible window. */
const Tiled: React.FC<{uid: string; id: string; offset: number; children: React.ReactNode; opacity?: number}> = ({uid, id, offset, children, opacity}) => {
  const ref = gid(uid, `bd-${id}`);
  const off = -mod(offset, TILE);
  return (
    <g opacity={opacity}>
      <defs>
        <g id={ref}>{children}</g>
      </defs>
      {[-1, 0, 1].map((j) => (
        <use key={j} href={`#${ref}`} x={n1(off + j * TILE)} />
      ))}
    </g>
  );
};

/** The night (or dusk) plate on paper: the picture band filled with the night ink, hard edges. Nothing on the black
 *  film or by day. Draw it first, outside the camera layers. */
export const Plate: React.FC<{time?: Time; top?: number; bottom?: number}> = ({time = 'day', top = L.graphicsTop, bottom = L.graphicsBottom}) =>
  time !== 'day' && ground(time) !== ground('day') ? <rect x={0} y={top} width={1080} height={bottom - top} fill={ground(time)} /> : null;

type P = {kind: BackdropKind; uid: string; frame: number; time?: Time; scroll?: number; drift?: number; base?: number; seed?: number; opacity?: number};

export const Backdrop: React.FC<P> = ({kind, uid, frame, time = 'day', scroll = 0, drift = 0.25, base, seed = 1, opacity}) => {
  const travel = scroll + frame * drift;
  const b = base ?? (INDOOR.includes(kind) ? 1200 : 1060);
  const a: Args = {uid, frame, time, base: b, seed};
  const layers = KINDS[kind](a);
  return (
    <g opacity={opacity}>
      {layers.map((l, i) => (
        <Tiled key={i} uid={uid} id={`${kind}${i}`} offset={travel * l.k}>
          {l.node}
        </Tiled>
      ))}
    </g>
  );
};

type Args = {uid: string; frame: number; time: Time; base: number; seed: number};
type Layer = {k: number; node: React.ReactNode};

// ---- shared pieces ----------------------------------------------------------------------------------------------------
type Block = {x: number; w: number; h: number; top: number; style: number};
/** The glass of a row of blocks, by facade style (0 punched windows, 1 ribbon bands, 2 a glass tower's vertical
 *  mullions): one path for the dark panes, one for the lit ones (at night a few switch every few seconds). */
const facades = (a: Args, blocks: Block[], idSeed: number, fill: string) => {
  let unlit = '';
  let litD = '';
  const night = a.time !== 'day';
  const share = a.time === 'night' ? 0.3 : 0.16;
  const pane = (idx: number, x: number, y: number, w: number, h: number) => {
    const phase = R(idSeed, idx, 3) * 300;
    const on = night && R(idSeed, idx + Math.floor((a.frame + phase) / 300) * 1013, 1) < share;
    if (on) litD += rect(x, y, w, h);
    else unlit += rect(x, y, w, h);
  };
  blocks.forEach((bk, bi) => {
    const top = a.base - bk.h + (bk.top === 1 || bk.top === 3 ? 60 : 34);
    const usable = a.base - 40 - top;
    if (bk.style === 1) {
      // ribbon windows: a band of glass a floor, split into bays
      const floors = Math.max(1, Math.floor(usable / 42));
      const bays = Math.max(1, Math.floor((bk.w - 24) / 58));
      const bw = (bk.w - 24) / bays;
      for (let r = 0; r < floors; r++) for (let c = 0; c < bays; c++) pane(bi * 97 + r * 13 + c, bk.x + 12 + c * bw + (c ? 2 : 0), top + r * 42, bw - (c ? 2 : 0), 18);
    } else if (bk.style === 2) {
      // a glass tower: tall mullion strips, split into floors
      const strips = Math.max(2, Math.floor((bk.w - 20) / 26));
      const sw = (bk.w - 20) / strips;
      const floors = Math.max(1, Math.floor(usable / 54));
      for (let c = 0; c < strips; c++) for (let r = 0; r < floors; r++) pane(bi * 97 + c * 13 + r, bk.x + 10 + c * sw + 3, top + r * 54, sw - 6, 50);
    } else {
      const cols = Math.max(1, Math.floor((bk.w - 28 + 14) / 30));
      const rows = Math.max(1, Math.floor(usable / 44));
      const x0 = bk.x + (bk.w - (cols * 30 - 14)) / 2;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) pane(bi * 97 + r * 13 + c, x0 + c * 30, top + r * 44, 16, 24);
    }
  });
  return (
    <>
      <path d={unlit} fill={fill} />
      {litD ? <path d={litD} fill={lamp(a.time)} opacity={a.time === 'night' ? 0.6 : 0.38} /> : null}
    </>
  );
};

/** A lamp's light at night: a halo at the head and a faint cone to the ground (no cone: `cone` false). */
const lampLight = (a: Args, x: number, y: number, r = 70, cone = true) =>
  a.time === 'day' ? null : (
    <>
      {cone ? <path d={poly([[x - 14, y + 8], [x + 14, y + 8], [x + 120, a.base], [x - 120, a.base]])} fill={lamp(a.time)} opacity={a.time === 'night' ? 0.06 : 0.035} /> : null}
      <circle cx={x} cy={y + 6} r={r} fill={paint(a.uid, 'glow-ink')} opacity={a.time === 'night' ? 0.5 : 0.3} />
    </>
  );

/** A skirting band along the floor of a room (it grounds what stands on it). */
const skirting = (a: Args, tone: string) => <path d={rect(-60, a.base - 12, TILE + 120, 12)} fill={tone} />;

// ---- city ---------------------------------------------------------------------------------------------------------------
const city = (a: Args): Layer[] => {
  const {base, time, seed} = a;
  const hills = profile((x) => 300 + wave(x, [[40, 2, 1.3 * seed], [26, 5, 0.4], [12, 11, 2.1]]), base);
  const skyline = (s: number, minW: number, maxW: number, minH: number, maxH: number): Block[] => {
    const blocks: Block[] = [];
    let x = 0;
    let i = 0;
    while (x < TILE) {
      const w = minW + (maxW - minW) * R(s, i, 1);
      const h = minH + (maxH - minH) * R(s, i, 2) ** 1.3;
      const style = Math.floor(R(s, i, 6) * 3);
      blocks.push({x, w, h: style === 2 ? h * 1.15 : h, top: Math.floor(R(s, i, 3) * 6), style});
      x += w + (R(s, i, 4) < 0.3 ? 14 + 30 * R(s, i, 5) : 0);
      i++;
    }
    return blocks;
  };
  const shape = (bk: Block) => {
    const y = base - bk.h;
    if (bk.style === 2) return rr(bk.x, y, bk.w, bk.h + 2, [bk.w * 0.18, 4, 0, 0]) + rect(bk.x + bk.w * 0.3, y - 40, 6, 42); // a glass tower: one rounded shoulder and a mast
    if (bk.top === 0) return rr(bk.x, y, bk.w, bk.h + 2, [10, 10, 0, 0]) + rect(bk.x + bk.w * 0.55, y - 22, bk.w * 0.28, 24); // a roof box
    if (bk.top === 1) return rect(bk.x, y + 30, bk.w, bk.h - 28) + rect(bk.x + bk.w * 0.2, y, bk.w * 0.6, 32); // a stepped top
    if (bk.top === 2) return rect(bk.x, y, bk.w, bk.h + 2) + rect(bk.x + bk.w * 0.62, y - 46, 6, 48) + rect(bk.x + bk.w * 0.15, y - 18, 28, 20); // a mast, a vent
    if (bk.top === 3) return poly([[bk.x, y + 34], [bk.x + bk.w, y], [bk.x + bk.w, base + 2], [bk.x, base + 2]]); // a slanted roof
    return rect(bk.x, y, bk.w, bk.h + 2);
  };
  const far2 = skyline(seed + 11, 60, 130, 140, 300);
  const near2 = skyline(seed + 23, 110, 210, 220, 500);
  const nearFill = far(0.12, time);
  return [
    {k: 0.05, node: <path d={hills} fill={far(1, time)} />},
    {k: 0.14, node: <path d={far2.map(shape).join('')} fill={far(0.55, time)} />},
    {
      k: 0.3,
      node: (
        <>
          <path d={near2.map(shape).join('')} fill={nearFill} />
          {facades(a, near2, seed + 23, mix(nearFill, ground(time), dark(time) ? 0.45 : 0.55))}
        </>
      ),
    },
  ];
};

// ---- mountains (a Caucasus-like ridge) ----------------------------------------------------------------------------------
const mountains = (a: Args): Layer[] => {
  const {base, time, seed} = a;
  type Pk = {x: number; h: number; w: number};
  const peaks: Pk[] = Array.from({length: 9}, (_, i) => ({x: (i + 0.15 + 0.7 * R(seed, i, 1)) * (TILE / 9), h: 360 + 220 * R(seed, i, 2), w: 230 + 160 * R(seed, i, 3)}));
  const ridgeH = (x: number) => {
    let h = 150 + wave(x, [[20, 3, seed], [10, 13, 0.7]]);
    for (const p of peaks) {
      const d = pd(x, p.x) / p.w;
      if (d < 1) h = Math.max(h, p.h * (1 - d) ** 1.15 + wave(x, [[9, 37, 0.3], [6, 61, 1.1]]) * (1 - d));
    }
    return h;
  };
  const sharp = (h: (x: number) => number) => {
    const pts: string[] = [];
    for (let x = -120; x <= TILE + 120; x += 18) pts.push(`${pts.length ? 'L' : 'M'}${x} ${n1(base - h(x))}`);
    return pts.join('') + `L${TILE + 120} ${base + 2}L-120 ${base + 2}Z`;
  };
  // the snow: above a snow line the ridge is white, its lower edge running down the gullies in tongues
  const snowLine = 395;
  let snow = '';
  for (const off of [-TILE, 0, TILE]) {
    let run: [number, number, number][] = []; // [x on screen, the snow's lower edge, x on the tile]
    const flush = () => {
      if (run.length > 1) {
        // the ends meet the ridge, so a cap never stands on a vertical cut
        run[0][1] = base - ridgeH(run[0][2]);
        run[run.length - 1][1] = base - ridgeH(run[run.length - 1][2]);
        const top = run.map(([xx, , x]) => [xx, base - ridgeH(x)] as [number, number]);
        snow += poly([...top, ...run.slice().reverse().map(([xx, y]) => [xx, y] as [number, number])]);
      }
      run = [];
    };
    for (let x = -60; x <= TILE + 60; x += 12) {
      const xx = x + off;
      if (xx < -200 || xx > TILE + 200) continue;
      const h = ridgeH(x);
      // the snow's lower edge: a slow wander plus tongues reaching down the gullies
      const tongue = 70 * Math.max(0, Math.sin(x / 19 + seed) * Math.sin(x / 47 + 2 * seed)) ** 2 + 10 * R(seed + 9, Math.round(x / 12), 1);
      const lineH = snowLine + wave(x, [[34, 31, seed], [20, 67, 1.3]]) - tongue;
      if (h > lineH + 6) run.push([xx, base - lineH, x]);
      else flush();
    }
    flush();
  }
  const snowTone = mix(dark(time) ? C.il1 : C.il0, ground(time), time === 'day' ? (dark(time) ? 0.55 : 0) : 0.74);
  const mid = profile((x) => 200 + wave(x, [[60, 3, seed + 0.5], [30, 7, 1.7], [14, 17, 0.2]]), base);
  // foothills with a fringe of conifers along their crest
  const hillH = (x: number) => 110 + wave(x, [[36, 4, seed + 2], [18, 9, 0.9]]);
  let trees = '';
  for (let x = 0; x < TILE; x += 22) {
    const h = hillH(x);
    const t = 28 + 30 * R(seed + 5, x, 1);
    trees += poly([[x - 11, base - h + 6], [x, base - h - t], [x + 11, base - h + 6]]);
  }
  return [
    {
      k: 0.04,
      node: (
        <>
          <path d={sharp(ridgeH)} fill={far(1, time)} />
          <path d={snow} fill={snowTone} />
        </>
      ),
    },
    {k: 0.12, node: <path d={mid} fill={far(0.55, time)} />},
    {k: 0.26, node: <path d={profile(hillH, base) + trees} fill={far(0.1, time)} />},
  ];
};

// ---- highway --------------------------------------------------------------------------------------------------------------
const highway = (a: Args): Layer[] => {
  const {base, time, seed} = a;
  const hills = profile((x) => 170 + wave(x, [[40, 2, seed], [20, 6, 0.8]]), base);
  // a tree line: overlapping round crowns along a soft crest
  let crowns = '';
  for (let i = 0, x = 0; x < TILE; i++) {
    const r = 28 + 34 * R(seed + 3, i, 1);
    const top = 90 + 60 * R(seed + 3, i, 2) + wave(x, [[30, 3, 0.5]]);
    crowns += circ(x, base - top, r) + rect(x - r, base - top, 2 * r, top + 2);
    x += r * (0.9 + 0.5 * R(seed + 3, i, 3));
  }
  const near0 = far(0, time);
  const posts = Array.from({length: 6}, (_, i) => i * 360 + 120);
  let rail = rect(-60, base - 64, TILE + 120, 18);
  for (let x = 0; x < TILE; x += 90) rail += rect(x, base - 64, 8, 64);
  let poles = '';
  posts.forEach((x) => {
    poles += rr(x - 5, base - 470, 10, 470, 3);
    poles += `M${x - 5} ${base - 462}C${x - 5} ${base - 500} ${x + 20} ${base - 506} ${x + 70} ${base - 500}L${x + 70} ${base - 490}C${x + 24} ${base - 496} ${x + 5} ${base - 492} ${x + 5} ${base - 462}Z`;
    poles += rr(x + 54, base - 504, 52, 12, 6);
  });
  return [
    {k: 0.05, node: <path d={hills} fill={far(1, time)} />},
    {k: 0.18, node: <path d={crowns} fill={far(0.5, time)} />},
    {
      k: 0.62,
      node: (
        <>
          {posts.map((x, i) => (
            <React.Fragment key={i}>{lampLight(a, x + 80, base - 494, 76)}</React.Fragment>
          ))}
          <path d={poles + rail} fill={near0} />
          {time === 'day' ? null : <path d={posts.map((x) => rr(x + 60, base - 494, 40, 5, 2.5)).join('')} fill={lamp(time)} />}
        </>
      ),
    },
  ];
};

// ---- station (a fuel station, no brand) ---------------------------------------------------------------------------------
const station = (a: Args): Layer[] => {
  const {base, time, seed} = a;
  const hills = profile((x) => 150 + wave(x, [[36, 2, seed + 1], [18, 5, 0.3]]), base);
  const shopFill = far(0.5, time);
  // the shop behind the canopy (its window glows between the pumps at night) and the price pylon at the right, its
  // panels blank: no prices, no brand
  const shop = rr(250, base - 250, 560, 252, [6, 6, 0, 0]) + rect(220, base - 268, 620, 22) + rect(1010, base - 600, 14, 600) + rr(950, base - 640, 134, 250, 10);
  const shopWin = rect(290, base - 200, 330, 130) + rect(660, base - 210, 100, 210);
  const panels = [0, 1, 2].map((i) => rr(966, base - 624 + i * 76, 102, 62, 6)).join('');
  // a second canopy far along the road, for a scene that scrolls
  const shop2 = rr(1500, base - 230, 420, 232, [6, 6, 0, 0]) + rect(1470, base - 248, 480, 22) + rect(1530, base - 180, 220, 110);
  // the canopy on its pillars, the pumps under it (rounded, slim, modern)
  const cy = base - 470;
  const canopy = rr(70, cy, 860, 60, 8) + [160, 500, 840].map((x) => rect(x - 14, cy + 58, 28, base - cy - 56)).join('');
  const pump = (x: number) => rr(x - 44, base - 210, 88, 212, [14, 14, 2, 2]) + rect(x - 60, base - 8, 120, 10);
  const pumps = pump(330) + pump(670);
  const screens = rr(330 - 28, base - 186, 56, 40, 6) + rr(670 - 28, base - 186, 56, 40, 6);
  const hoses = [330, 670].map((x) => `M${x + 44} ${base - 150}C${x + 92} ${base - 150} ${x + 96} ${base - 30} ${x + 70} ${base - 30}C${x + 54} ${base - 30} ${x + 52} ${base - 70} ${x + 52} ${base - 96}`).join('');
  const nearFill = far(0.08, time);
  const edge = time === 'day' ? sink(nearFill, time, 0.55) : lamp(time);
  return [
    {k: 0.04, node: <path d={hills} fill={far(1, time)} />},
    {
      k: 0.14,
      node: (
        <>
          <path d={shop + shop2} fill={shopFill} />
          <path d={panels} fill={time === 'day' ? sink(shopFill, time, 0.5) : lamp(time)} opacity={time === 'day' ? 1 : 0.32} />
          <path d={shopWin} fill={time === 'day' ? sink(shopFill, time, 0.5) : lamp(time)} opacity={time === 'day' ? 1 : 0.45} />
        </>
      ),
    },
    {
      k: 0.3,
      node: (
        <>
          {time === 'day'
            ? null
            : [250, 500, 750].map((x) => (
                <React.Fragment key={x}>
                  <ellipse cx={x} cy={cy + 64} rx={170} ry={48} fill={paint(a.uid, 'glow-ink')} opacity={0.42} />
                  <ellipse cx={x} cy={base} rx={190} ry={34} fill={paint(a.uid, 'glow-ink')} opacity={time === 'night' ? 0.22 : 0.12} />
                </React.Fragment>
              ))}
          <path d={canopy + pumps} fill={nearFill} />
          <path d={rect(82, cy + 22, 836, 10)} fill={edge} opacity={time === 'day' ? 1 : 0.85} />
          <path d={screens} fill={time === 'day' ? sink(nearFill, time, 0.5) : lamp(time)} opacity={time === 'day' ? 1 : 0.6} />
          <path d={hoses} fill="none" stroke={nearFill} strokeWidth={9} strokeLinecap="round" />
        </>
      ),
    },
  ];
};

// ---- garage (a workshop inside) -------------------------------------------------------------------------------------------
const garage = (a: Args): Layer[] => {
  const {base, time} = a;
  const wall = far(0.75, time);
  // the back wall: a strip of high windows, a closed roller door further along (slats as bands)
  const doorX = 1180;
  let slats = '';
  for (let y = base - 560; y < base; y += 40) slats += rect(doorX, y, 640, 26);
  const door = rect(doorX - 24, base - 590, 688, 30) + rect(doorX - 24, base - 590, 24, 590) + rect(doorX + 640, base - 590, 24, 590);
  const winRow = [0, 1, 2, 3].map((i) => rr(160 + i * 260, base - 760, 200, 96, 8)).join('');
  // the tool wall: a pegboard with tools hanging (wrenches by size, a hammer, screwdrivers, a coiled air hose), a
  // workbench with a drawer cabinet under it
  const tool = far(0.15, time);
  const board = rr(340, base - 610, 660, 340, 10);
  const hang = (name: string, x: number, y: number, s: number) =>
    (ICONS[name] ?? []).map((p, i) => (
      <path
        key={`${name}${x}${i}`}
        d={p.d}
        transform={`translate(${x} ${y}) rotate(-45) scale(${s}) translate(-32 -32)`}
        fill={p.stroke ? 'none' : tool}
        stroke={p.stroke ? tool : undefined}
        strokeWidth={p.stroke}
        strokeLinecap={p.cap ?? 'round'}
        fillRule="evenodd"
      />
    ));
  const tools = [hang('wrench', 420, base - 470, 3), hang('wrench', 520, base - 474, 2.6), hang('wrench', 605, base - 478, 2.2)];
  const hammer = rr(704, base - 560, 16, 200, 6) + rr(670, base - 574, 84, 36, 10);
  const driver = (x: number, h: number) => rr(x - 10, base - 570, 20, 76, 9) + rr(x - 3, base - 496, 6, h, 3);
  const hoseRing = circ(900, base - 470, 70) + circ(900, base - 470, 46);
  const bench = rect(320, base - 262, 720, 26) + rect(340, base - 236, 22, 236) + rect(1000, base - 236, 22, 236) + rr(800, base - 236, 190, 200, 4);
  const drawers = [0, 1, 2].map((i) => rr(818, base - 220 + i * 62, 154, 50, 4)).join('');
  // near: the lift post with its folded arm, a stack of tyres further along, a hanging lamp
  const lift = rr(110, base - 680, 64, 680, 6) + rect(86, base - 14, 112, 16) + rr(150, base - 150, 300, 28, 10) + rr(420, base - 176, 70, 26, 8) + rr(122, base - 620, 40, 120, 8);
  const tyre = (y: number) => rr(1900, y, 180, 64, 26);
  const tyres = tyre(base - 64) + tyre(base - 132) + tyre(base - 200);
  const grooves = [0, 1, 2].map((i) => rect(1916, base - 36 - i * 68, 148, 8)).join('');
  const lampX = 680;
  const lampY = base - 840;
  const hangLamp = rect(lampX - 2, L.graphicsTop - 20, 4, lampY - L.graphicsTop + 20) + poly([[lampX - 18, lampY], [lampX + 18, lampY], [lampX + 70, lampY + 56], [lampX - 70, lampY + 56]]);
  const nearFill = far(0.05, time);
  const lampTime: Time = time === 'day' ? 'dusk' : time; // the workshop lamp is on, day and night
  return [
    {
      k: 0.04,
      node: (
        <>
          <path d={door} fill={wall} />
          <path d={slats} fill={wall} opacity={0.7} />
          <path d={winRow} fill={time === 'day' ? daylight(time) : sink(wall, time, 0.5)} />
          {skirting(a, wall)}
        </>
      ),
    },
    {
      k: 0.12,
      node: (
        <>
          <path d={board} fill={far(0.6, time)} />
          {tools}
          <path d={hammer + driver(780, 70) + driver(820, 54) + hoseRing} fill={tool} fillRule="evenodd" />
          <path d={bench} fill={far(0.3, time)} />
          <path d={drawers} fill={sink(far(0.3, time), time, 0.35)} />
        </>
      ),
    },
    {
      k: 0.24,
      node: (
        <>
          {lampLight({...a, time: lampTime}, lampX, lampY + 50, 90)}
          <path d={lift + tyres + hangLamp} fill={nearFill} />
          <path d={grooves} fill={sink(nearFill, time, 0.4)} />
          <path d={rr(lampX - 52, lampY + 52, 104, 8, 4)} fill={lamp(lampTime)} opacity={0.8} />
        </>
      ),
    },
  ];
};

// ---- room (a living room inside) ------------------------------------------------------------------------------------------
const room = (a: Args): Layer[] => {
  const {base, time, frame} = a;
  const wall = far(0.7, time);
  // the window (left) between two slim curtains; a framed picture and a tall plant further along the wall
  const wx = 130;
  const wy = base - 700;
  const ww = 320;
  const wh = 420;
  const hw = ww / 2 - 5;
  const hh = wh / 2 - 5;
  const panes = rect(wx, wy, hw, hh) + rect(wx + ww / 2 + 5, wy, hw, hh) + rect(wx, wy + wh / 2 + 5, hw, hh) + rect(wx + ww / 2 + 5, wy + wh / 2 + 5, hw, hh);
  const frameD = rect(wx - 16, wy - 16, ww + 32, wh + 32) + panes;
  const sill = rr(wx - 34, wy + wh + 16, ww + 68, 16, 4);
  const pane = time === 'day' ? daylight(time) : ground(time);
  const curtain = (x: number, flip: number) => {
    const sway = 3 * Math.sin(frame / 70 + x);
    const pts: [number, number][] = [
      [x, wy - 50],
      [x + 54 * flip, wy - 50],
      [x + (50 + sway) * flip, wy + 220],
      [x + (64 + sway) * flip, base - 60],
      [x - 4 * flip, base - 60],
    ];
    return smooth(pts, true, 0.5);
  };
  const curtains = curtain(wx - 66, 1) + curtain(wx + ww + 66, -1);
  const folds = [wx - 40, wx + ww + 40].map((x) => rr(x - 4, wy - 30, 8, base - wy - 40, 4)).join('');
  const rod = rr(wx - 100, wy - 64, ww + 200, 10, 5);
  const art = rr(1240, base - 640, 260, 190, 6);
  const artIn = rr(1262, base - 618, 216, 146, 3);
  const artHill = `M1262 ${base - 472}L1330 ${base - 560}L1372 ${base - 520}L1420 ${base - 590}L1478 ${base - 512}V${base - 472}Z`;
  const plant =
    rr(1650, base - 150, 120, 150, [10, 10, 16, 16]) +
    [0, 1, 2, 3, 4, 5]
      .map((i) => {
        const ang = -80 + i * 32;
        const r = (ang * Math.PI) / 180;
        const len = 150 + 40 * Math.sin(i * 2.1);
        const sw = 3 * Math.sin(frame / 60 + i);
        const tipx = 1710 + Math.sin(r) * len * 0.9 + sw;
        const tipy = base - 150 - Math.cos(r) * len;
        return `M1710 ${base - 150}Q${n1(1710 + Math.sin(r) * len * 0.3 - 26)} ${n1(base - 150 - Math.cos(r) * len * 0.6)} ${n1(tipx)} ${n1(tipy)}Q${n1(1710 + Math.sin(r) * len * 0.3 + 26)} ${n1(base - 150 - Math.cos(r) * len * 0.55)} 1710 ${base - 150}Z`;
      })
      .join('');
  // a floor lamp beside the sofa (right of the window)
  const lx = 560;
  const floorLamp = rect(lx - 4, base - 540, 8, 540) + ell(lx, base - 4, 46, 9) + poly([[lx - 54, base - 540], [lx + 54, base - 540], [lx + 36, base - 624], [lx - 36, base - 624]]);
  const sx = 620;
  const sofa =
    rr(sx + 30, base - 300, 300, 180, [26, 26, 6, 6]) + // the back
    rr(sx + 10, base - 150, 340, 110, 18) + // the seat
    rr(sx - 16, base - 220, 66, 190, 26) + // the arms
    rr(sx + 310, base - 220, 66, 190, 26) +
    rect(sx + 20, base - 40, 14, 40) +
    rect(sx + 326, base - 40, 14, 40);
  const cushions = rr(sx + 58, base - 276, 118, 116, 22) + rr(sx + 186, base - 276, 118, 116, 22);
  const sofaFill = far(0.08, time);
  return [
    {
      k: 0.04,
      node: (
        <>
          <path d={frameD} fill={wall} fillRule="evenodd" />
          <path d={panes} fill={pane} />
          {time === 'day' ? null : (
            <>
              <circle cx={wx + ww * 0.72} cy={wy + 90} r={30} fill={lamp(time)} opacity={0.9} />
              <circle cx={wx + ww * 0.72 + 12} cy={wy + 83} r={26} fill={pane} />
              <path d={circ(wx + 50, wy + 60, 3) + circ(wx + 112, wy + 140, 2.5) + circ(wx + 220, wy + 300, 3)} fill={lamp(time)} opacity={0.7} />
            </>
          )}
          <path d={sill + rod} fill={wall} />
          <path d={curtains} fill={far(0.35, time)} />
          <path d={folds} fill={sink(far(0.35, time), time, 0.3)} />
          <path d={art} fill={wall} />
          <path d={artIn} fill={sink(wall, time, 0.5)} />
          <path d={artHill} fill={far(0.35, time)} />
          <path d={plant} fill={far(0.3, time)} />
          {skirting(a, wall)}
        </>
      ),
    },
    {
      k: 0.1,
      node: (
        <>
          {lampLight(a, lx, base - 580, 110, false)}
          <path d={sofa + floorLamp} fill={sofaFill} />
          <path d={cushions} fill={lift(sofaFill, time, 0.3)} />
          {time === 'day' ? null : <path d={poly([[lx - 52, base - 542], [lx + 52, base - 542], [lx + 35, base - 622], [lx - 35, base - 622]])} fill={lamp(time)} opacity={0.75} />}
        </>
      ),
    },
  ];
};

const KINDS: Record<BackdropKind, (a: Args) => Layer[]> = {city, mountains, highway, station, garage, room};
