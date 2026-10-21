// The night drive's cabin seen from the passenger seat, across to the driver (she faces right, the car's nose to the right):
// behind her the driver's window, the night city sliding past it as soft bokeh (warm sodium lamps, white shop lights, the
// red of tail lights), a few raindrops on the glass from the rain that just stopped; under the window the door's leather
// with its thin ambient light strip; the seat's backrest and headrest behind her; in front of her the wheel's rim nearly
// edge on, the dash with the instrument display's glow, the A pillar and the windscreen with the road's lights beyond.
// Drawn in stage px (1080 x 1920 at scale 1), every part a refined 2020s interior (no knobs of the 90s): soft gradients,
// hairline highlights, nothing outlined. Frame-driven, deterministic.
import React from 'react';
import {rnd} from '../lib';

export type Light = {x: number; y: number; r: number; c: string; a: number; depth: number};

/** the street's lights in a long strip (stage px at the near plane), seeded: lamps high, windows mid, cars low */
export const cityLights = (seed: number, n = 70, len = 5200): Light[] => {
  const r = rnd(seed);
  const out: Light[] = [];
  for (let i = 0; i < n; i++) {
    const kind = r();
    const depth = 0.35 + 0.65 * r();
    const x = r() * len;
    if (kind < 0.32) out.push({x, y: 330 + 150 * r(), r: 34 + 46 * r() * depth, c: '#FFB66A', a: 0.55 + 0.35 * r(), depth});
    else if (kind < 0.7) out.push({x, y: 470 + 260 * r(), r: 22 + 40 * r() * depth, c: r() < 0.5 ? '#F6EEDC' : '#FFD9A0', a: 0.35 + 0.35 * r(), depth});
    else if (kind < 0.86) out.push({x, y: 760 + 120 * r(), r: 14 + 18 * r(), c: '#FF4636', a: 0.5 + 0.3 * r(), depth});
    else out.push({x, y: 520 + 300 * r(), r: 50 + 70 * r() * depth, c: '#9DB8E8', a: 0.18 + 0.15 * r(), depth});
  }
  return out;
};

/** the bokeh through a window: the lights slide by `travel` px (scaled by each light's depth: the far ones slower), wrapped
 *  in the strip; drawn as soft discs (radial gradients), the glass's own dark tint over them */
export const Bokeh: React.FC<{uid: string; lights: Light[]; travel: number; len?: number; x0?: number; w?: number; dim?: number}> = ({uid, lights, travel, len = 5200, x0 = -200, w = 1500, dim = 1}) => (
  <g>
    <defs>
      {['#FFB66A', '#F6EEDC', '#FFD9A0', '#FF4636', '#9DB8E8'].map((c, i) => (
        <radialGradient key={c} id={`${uid}b${i}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={c} stopOpacity={0.95} />
          <stop offset="0.55" stopColor={c} stopOpacity={0.55} />
          <stop offset="0.82" stopColor={c} stopOpacity={0.14} />
          <stop offset="1" stopColor={c} stopOpacity={0} />
        </radialGradient>
      ))}
    </defs>
    {lights.map((l, i) => {
      const ci = ['#FFB66A', '#F6EEDC', '#FFD9A0', '#FF4636', '#9DB8E8'].indexOf(l.c);
      const x = ((((l.x - travel * l.depth) % len) + len) % len) + x0 - (len - w) / 2;
      if (x < x0 - 200 || x > x0 + w + 200) return null;
      return <circle key={i} cx={x} cy={l.y} r={l.r} fill={`url(#${uid}b${ci})`} opacity={l.a * dim} />;
    })}
  </g>
);

/** raindrops on a pane: small lenses (a dark rim, a bright fleck), a few slow runs; inside the pane's clip */
export const Drops: React.FC<{seed: number; x: number; y: number; w: number; h: number; n?: number; t: number; a?: number}> = ({seed, x, y, w, h, n = 46, t, a = 1}) => {
  const r = rnd(seed);
  const drops = [];
  for (let i = 0; i < n; i++) {
    const dx = x + r() * w;
    const run = r() < 0.12;
    const dy = y + r() * h + (run ? ((t * (0.6 + r())) % 120) : 0);
    const s = 2.2 + r() * 5.5;
    drops.push(
      <g key={i} opacity={(0.45 + 0.5 * r()) * a}>
        <ellipse cx={dx} cy={dy} rx={s} ry={s * 1.12} fill="#0A0C10" opacity={0.35} />
        <ellipse cx={dx - s * 0.18} cy={dy - s * 0.25} rx={s * 0.72} ry={s * 0.8} fill="#C9D4E4" opacity={0.16} />
        <circle cx={dx + s * 0.3} cy={dy - s * 0.42} r={Math.max(0.8, s * 0.22)} fill="#FFFFFF" opacity={0.75} />
      </g>,
    );
  }
  return <g>{drops}</g>;
};
