// src/scenes/kit/coverline.tsx: the LINE COVER KIT, the cover look since 2026-11-13. The owner, on the sprint's covers
// drawn this way: „კაია, მომწონს ეგ სტილები, ლამაზია, ესთეტიურია ... ეგეთი ქავერების ძალა მიეცი სტუდიოს“. A cover
// drawing (cover.art, src/scenes/film/<FilmName>Cover.tsx) is a calm TECHNICAL LINE DRAWING of the film's own object
// or scene, together with the APP'S OWN UI drawn as clean cards that carry the film's real Georgian words and numbers:
// thin even lines (2-3 px), white panels with a hairline edge, small mono labels, a lot of air. No solid black blobs,
// no icons in circles, no shadow, no 3D, no photo, no screenshot. Mostly white; Cover.tsx turns about one film in six
// dark (the same drawing on black: every part below takes its colours from lp()).
//
//   <LineArt p h>          the svg: you draw in a 1080 x h design box (h 900 by default); it is fitted into the art
//                          box under the headline and centred (never cropped)
//   lp()                   the palette {ink, ink2, mid, faint, hair, panel, panel2, on}: light or dark with the cover
//   <Tx x y size ...>      Georgian or Latin text (FiraGO); <Mono> a small spaced mono label (grey by default)
//   <LCard> <LPill>        a white panel with a hairline edge; a rounded tag with a dot
//   <LCheck> <LDash> <LDots>  a tick; a dashed leader; a dotted path (a route, steam, motion)
//   <VMark> <LQr> <LCorners>  the V mark; a QR code with the V in its middle; scan corners
//   <LPhone x y w a>       a phone in line: children draw its screen in (0..sw, 0..sh) (sw = 0.9 w, sh = 1.95 w)
//   <LCar x y s a>         a 2020s saloon side-on, facing right, (x, y) its rear foot, ~940 x 220 at s 1
//   <LCarTop cx cy L beams>  the car from above, nose up (beams: its headlights on)
//   <LMap> <LRoute>        a map's street grid; the navigator's route and arrow (both in a box x y w h)
//   <LBanner x y w title sub>  the app's push / navigator banner: the V tile, a bold line, a grey line
//   <LWarn> <LTyre> <LSnow> <LMountains> <LGauge> <LCam> <LTLight> <LHouse> <LElm>  road sign, tyre, snowflake,
//                          mountains, a dial, a speed camera, a traffic light, a house, the ELM327 adapter
//   <LReceipt> <LPage> <LMonth> <LList>  a receipt with rows; a tear-off calendar page; a month grid with marked days;
//                          a card of rows (title left, value right)
//   <LCodeCard> <LEntry>   the app's trouble-code result; a calendar entry
//   <LBubble> <LWave> <LToggle> <LHome>  a speech bubble; a sound wave; a switch; a home screen with the widget
//
// The film's words: every Georgian word on a card is the film's own (its say/show, the real screen's labels), never an
// invented number or claim. Black and white only (every colour comes from lp()).
import React from 'react';
import {isLight} from '../../tokens';

const LIGHT = {ink: '#1C1C1E', ink2: '#3A3A3E', mid: '#8E8E93', faint: '#C7C7CC', hair: '#E2E2E7', panel: '#FFFFFF', panel2: '#F2F2F4', on: '#FFFFFF'};
const DARK = {ink: '#F2F2F4', ink2: '#D0D0D4', mid: '#8E8E93', faint: '#4A4A50', hair: '#2E2E33', panel: '#141416', panel2: '#1E1E21', on: '#0B0B0C'};
export type LinePalette = typeof LIGHT;
/** the line palette of the cover being drawn (light, or dark on a dark cover) */
export const lp = (): LinePalette => (isLight() ? LIGHT : DARK);

const GEO = "FiraGO, 'Noto Sans Georgian', sans-serif";
const MONO = 'VinariMono, Menlo, FiraGO, monospace';
const MARK_D = 'M266.746 670.796C290.902 671.143 315.897 670.774 340.123 670.789L501.357 670.799C512.111 650.56 524.504 629.529 535.813 609.414L592.554 507.909L767.999 193.17C741.852 157.142 716.017 120.886 690.493 84.4176L630.88 0.000854492C588.913 18.1988 536.739 31.4819 491.938 39.4312C389.736 56.8855 284.852 49.753 185.942 18.6224C167.612 12.7758 154.456 7.24097 136.957 0.296021C91.6747 64.8779 46.0217 129.195 0 193.251L266.746 670.796ZM380.62 603.786C371.344 589.019 361.636 571.11 352.921 555.794L121.053 146.974C124.887 141.884 128.762 136.619 132.678 131.61C193.771 155.522 257.831 170.989 323.092 177.583C337.531 178.998 352.008 179.993 366.504 180.579C373.401 180.84 381.282 180.597 387.956 181.024C453.377 182.028 524.674 168.553 586.818 148.803C597.884 145.273 608.86 141.47 619.738 137.401C624.637 135.602 630.398 133.217 635.182 131.623C639.048 136.751 642.945 141.863 646.871 146.944L421.289 544.83C410.279 564.264 398.561 584.125 388.042 603.782L384.331 610.004L380.62 603.786Z';

/** a seeded 0..1 generator (drawing code: no Math.random) */
const rng = (seed: number) => {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const rotT = (a: number | undefined, cx: number, cy: number) => (a ? `rotate(${a} ${cx} ${cy})` : undefined);

export type LineP = {w?: number; h?: number; artH?: number};

/** the svg a line cover draws in: a 1080 x h design box fitted into the art box (p.artH) and centred */
export const LineArt: React.FC<{p: LineP; h?: number; children: React.ReactNode}> = ({p, h = 900, children}) => {
  const W = p.w ?? 1080;
  const H = p.h ?? 1200;
  const avail = (p.artH ?? 900) - 40;
  const k = Math.min(1, avail / h);
  const ox = (1080 - 1080 * k) / 2;
  const oy = Math.max(0, (avail - h * k) / 2);
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
      <g transform={`translate(${ox} ${oy}) scale(${k})`}>{children}</g>
    </svg>
  );
};

type TxP = {x: number; y: number; size?: number; color?: string; anchor?: 'start' | 'middle' | 'end'; weight?: number; ls?: number; mono?: boolean; children: React.ReactNode};
/** text: Georgian through FiraGO, or (mono) a spaced label */
export const Tx: React.FC<TxP> = ({x, y, size = 28, color, anchor = 'start', weight = 500, ls = 0, mono = false, children}) => (
  <text x={x} y={y} fontFamily={mono ? MONO : GEO} fontSize={size} fontWeight={weight} fill={color ?? lp().ink} textAnchor={anchor} letterSpacing={ls}>
    {children}
  </text>
);
/** a small spaced mono label, grey unless coloured */
export const Mono: React.FC<TxP> = ({size = 20, color, ls = 2, ...r}) => <Tx {...r} size={size} color={color ?? lp().mid} ls={ls} mono />;

/** a line path in the palette (round caps and joins) */
const Ln: React.FC<{d: string; c?: string; w?: number; fill?: string; dash?: string}> = ({d, c, w = 2.5, fill = 'none', dash}) => (
  <path d={d} fill={fill} stroke={c ?? lp().ink} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dash} />
);
export const LDash: React.FC<{d: string; c?: string; w?: number; da?: string}> = ({d, c, w = 2, da = '8 8'}) => <Ln d={d} c={c ?? lp().faint} w={w} dash={da} />;
export const LDots: React.FC<{d: string; gap?: number; size?: number; c?: string}> = ({d, gap = 18, size = 6, c}) => <Ln d={d} c={c ?? lp().mid} w={size} dash={`0 ${gap}`} />;
export const LCheck: React.FC<{x: number; y: number; s: number; c?: string; w?: number}> = ({x, y, s, c, w}) => (
  <Ln d={`M${x - s * 0.5} ${y} l${s * 0.36} ${s * 0.36} l${s * 0.64} ${-s * 0.7}`} c={c} w={w ?? Math.max(2.5, s * 0.12)} />
);

/** a white panel with a hairline edge */
export const LCard: React.FC<{x: number; y: number; w: number; h: number; r?: number; fill?: string; line?: string}> = ({x, y, w, h, r = 26, fill, line}) => (
  <rect x={x} y={y} width={w} height={h} rx={r} fill={fill ?? lp().panel} stroke={line ?? lp().hair} strokeWidth={2} />
);

/** a rounded tag with a dot */
export const LPill: React.FC<{x: number; y: number; text: string; size?: number; dot?: boolean}> = ({x, y, text, size = 24, dot = true}) => {
  const t = lp();
  const w = text.length * size * 0.62 + (dot ? 54 : 34);
  return (
    <g>
      <rect x={x} y={y} width={w} height={size * 1.9} rx={size * 0.95} fill={t.panel} stroke={t.hair} strokeWidth={2} />
      {dot ? <circle cx={x + 24} cy={y + size * 0.95} r={5} fill={t.ink} /> : null}
      <Tx x={x + (dot ? 42 : 17)} y={y + size * 1.3} size={size} color={t.ink2}>
        {text}
      </Tx>
    </g>
  );
};

/** the V mark, s wide, centred on (cx, cy) */
export const VMark: React.FC<{cx: number; cy: number; s: number; c?: string}> = ({cx, cy, s, c}) => {
  const k = s / 768;
  return <path d={MARK_D} fill={c ?? lp().ink} fillRule="evenodd" transform={`translate(${cx - s / 2} ${cy - (671 * k) / 2}) scale(${k})`} />;
};

/** a QR code s wide: outlined finder eyes, rounded modules, the V in a clear middle */
export const LQr: React.FC<{x: number; y: number; s: number; seed?: number; logo?: boolean; c?: string}> = ({x, y, s, seed = 7, logo = true, c}) => {
  const col = c ?? lp().ink;
  const N = 25;
  const m = s / N;
  const r = rng(seed);
  const mods: React.ReactNode[] = [];
  for (let i = 0; i < N; i++)
    for (let j = 0; j < N; j++) {
      if ((i < 8 && j < 8) || (i < 8 && j > N - 9) || (i > N - 9 && j < 8)) continue;
      if (logo && i >= 9 && i <= 15 && j >= 9 && j <= 15) continue;
      if (r() < 0.48) mods.push(<rect key={`${i}.${j}`} x={x + j * m + m * 0.12} y={y + i * m + m * 0.12} width={m * 0.76} height={m * 0.76} rx={m * 0.22} fill={col} />);
    }
  const eye = (ex: number, ey: number) => (
    <g key={`e${ex}${ey}`}>
      <rect x={ex + m * 0.5} y={ey + m * 0.5} width={6 * m} height={6 * m} rx={m * 1.4} fill="none" stroke={col} strokeWidth={m * 0.95} />
      <rect x={ex + 2 * m} y={ey + 2 * m} width={3 * m} height={3 * m} rx={m * 0.6} fill={col} />
    </g>
  );
  return (
    <g>
      {mods}
      {eye(x, y)}
      {eye(x + (N - 7) * m, y)}
      {eye(x, y + (N - 7) * m)}
      {logo ? <VMark cx={x + s / 2} cy={y + s / 2} s={m * 3.8} c={col} /> : null}
    </g>
  );
};

/** scan corners round a box (thin) */
export const LCorners: React.FC<{x: number; y: number; w: number; h: number; L?: number; w2?: number; c?: string}> = ({x, y, w, h, L = 50, w2 = 6, c}) => (
  <g>
    {[`M${x} ${y + L} V${y} H${x + L}`, `M${x + w - L} ${y} H${x + w} V${y + L}`, `M${x + w} ${y + h - L} V${y + h} H${x + w - L}`, `M${x + L} ${y + h} H${x} V${y + h - L}`].map((d) => (
      <Ln key={d} d={d} c={c} w={w2} />
    ))}
  </g>
);

/** a phone in line, w wide (2.05 w tall); children draw its screen in (0..sw, 0..sh) */
export const LPhone: React.FC<{x: number; y: number; w: number; a?: number; children?: React.ReactNode}> = ({x, y, w, a, children}) => {
  const t = lp();
  const h = w * 2.05;
  const b = w * 0.05;
  const sw = w - 2 * b;
  const sh = h - 2 * b;
  const id = `lph${Math.round(x)}_${Math.round(y)}_${Math.round(w)}`;
  return (
    <g transform={rotT(a, x + w / 2, y + h / 2)}>
      <rect x={x} y={y} width={w} height={h} rx={w * 0.17} fill={t.panel} stroke={t.ink} strokeWidth={3} />
      <rect x={x + b} y={y + b} width={sw} height={sh} rx={w * 0.13} fill={t.panel2} stroke={t.hair} strokeWidth={1.5} />
      <clipPath id={id}>
        <rect x={x + b} y={y + b} width={sw} height={sh} rx={w * 0.13} />
      </clipPath>
      <g clipPath={`url(#${id})`}>
        <g transform={`translate(${x + b} ${y + b})`}>{children}</g>
      </g>
      <rect x={x + w * 0.38} y={y + w * 0.07} width={w * 0.24} height={w * 0.06} rx={w * 0.03} fill={t.ink} />
    </g>
  );
};

/** a 2020s saloon in side elevation, thin line, facing right; (x, y) = its rear foot; ~940 x 220 at s 1 */
export const LCar: React.FC<{x: number; y: number; s?: number; a?: number; detail?: boolean}> = ({x, y, s = 1, a, detail = true}) => {
  const t = lp();
  const k = (v: number) => v * s;
  const body =
    `M${x + k(40)} ${y} L${x + k(36)} ${y - k(52)} Q${x + k(40)} ${y - k(86)} ${x + k(84)} ${y - k(96)} L${x + k(250)} ${y - k(110)} ` +
    `Q${x + k(300)} ${y - k(116)} ${x + k(338)} ${y - k(146)} L${x + k(420)} ${y - k(198)} Q${x + k(456)} ${y - k(216)} ${x + k(520)} ${y - k(217)} ` +
    `L${x + k(598)} ${y - k(215)} Q${x + k(646)} ${y - k(211)} ${x + k(700)} ${y - k(176)} L${x + k(764)} ${y - k(132)} ` +
    `Q${x + k(810)} ${y - k(120)} ${x + k(880)} ${y - k(108)} Q${x + k(926)} ${y - k(98)} ${x + k(934)} ${y - k(70)} L${x + k(938)} ${y - k(28)} ` +
    `Q${x + k(938)} ${y} ${x + k(910)} ${y} L${x + k(838)} ${y} A${k(80)} ${k(80)} 0 0 0 ${x + k(678)} ${y} L${x + k(306)} ${y} A${k(80)} ${k(80)} 0 0 0 ${x + k(146)} ${y} Z`;
  const glass = `M${x + k(352)} ${y - k(146)} L${x + k(428)} ${y - k(190)} Q${x + k(458)} ${y - k(204)} ${x + k(520)} ${y - k(204)} L${x + k(596)} ${y - k(202)} Q${x + k(640)} ${y - k(198)} ${x + k(686)} ${y - k(166)} L${x + k(722)} ${y - k(140)} Z`;
  return (
    <g transform={rotT(a, x + k(480), y - k(100))}>
      <Ln d={body} fill={t.panel} w={3} />
      <Ln d={glass} fill={t.panel2} w={2.5} />
      <Ln d={`M${x + k(540)} ${y - k(205)} L${x + k(540)} ${y - k(30)}`} c={t.mid} w={2} />
      <Ln d={`M${x + k(330)} ${y - k(132)} L${x + k(740)} ${y - k(128)}`} c={t.faint} w={2} />
      {detail ? (
        <>
          <Ln d={`M${x + k(460)} ${y - k(108)} h${k(40)} M${x + k(612)} ${y - k(108)} h${k(40)}`} c={t.mid} w={4} />
          <Ln d={`M${x + k(880)} ${y - k(96)} L${x + k(924)} ${y - k(84)}`} w={5} />
          <Ln d={`M${x + k(46)} ${y - k(80)} L${x + k(92)} ${y - k(90)}`} w={5} />
        </>
      ) : null}
      {[226, 758].map((wx) => {
        const cx = x + k(wx);
        return (
          <g key={wx}>
            <circle cx={cx} cy={y} r={k(66)} fill={t.panel} stroke={t.ink} strokeWidth={3} />
            <circle cx={cx} cy={y} r={k(44)} fill="none" stroke={t.mid} strokeWidth={2} />
            <circle cx={cx} cy={y} r={k(10)} fill={t.ink} />
            {[0, 1, 2, 3, 4].map((q) => {
              const aa = ((q * 72 - 90) * Math.PI) / 180;
              return <Ln key={q} d={`M${cx + k(12) * Math.cos(aa)} ${y + k(12) * Math.sin(aa)} L${cx + k(42) * Math.cos(aa)} ${y + k(42) * Math.sin(aa)}`} c={t.mid} w={2} />;
            })}
          </g>
        );
      })}
    </g>
  );
};

/** a 2020s car from above, nose up, thin line; L = its length (beams: the headlights on, dashed light cones) */
export const LCarTop: React.FC<{cx: number; cy: number; L: number; beams?: boolean}> = ({cx, cy, L, beams = false}) => {
  const t = lp();
  const W = L * 0.45;
  const y0 = cy - L / 2;
  return (
    <g>
      {beams
        ? [-1, 1].map((sx) => {
            const hx = cx + sx * W * 0.3;
            return (
              <path key={sx} d={`M${hx} ${y0 + 6} L${hx + sx * W * 0.55 - W * 0.2} ${y0 - L * 0.55} L${hx + sx * W * 0.55 + W * 0.25} ${y0 - L * 0.5} Z`} fill={t.panel2} stroke={t.faint} strokeWidth={2} strokeDasharray="8 8" strokeLinejoin="round" />
            );
          })
        : null}
      <Ln
        d={`M${cx} ${y0} C${cx + W * 0.42} ${y0} ${cx + W / 2} ${y0 + L * 0.06} ${cx + W / 2} ${y0 + L * 0.2} L${cx + W / 2} ${y0 + L * 0.86} C${cx + W / 2} ${y0 + L} ${cx + W * 0.3} ${y0 + L} ${cx} ${y0 + L} C${cx - W * 0.3} ${y0 + L} ${cx - W / 2} ${y0 + L} ${cx - W / 2} ${y0 + L * 0.86} L${cx - W / 2} ${y0 + L * 0.2} C${cx - W / 2} ${y0 + L * 0.06} ${cx - W * 0.42} ${y0} ${cx} ${y0} Z`}
        fill={t.panel}
        w={3}
      />
      <Ln d={`M${cx - W * 0.38} ${y0 + L * 0.3} Q${cx} ${y0 + L * 0.24} ${cx + W * 0.38} ${y0 + L * 0.3} L${cx + W * 0.33} ${y0 + L * 0.42} Q${cx} ${y0 + L * 0.39} ${cx - W * 0.33} ${y0 + L * 0.42} Z`} fill={t.panel2} />
      <rect x={cx - W * 0.33} y={y0 + L * 0.44} width={W * 0.66} height={L * 0.28} rx={18} fill="none" stroke={t.mid} strokeWidth={2} />
      <Ln d={`M${cx - W * 0.33} ${y0 + L * 0.74} Q${cx} ${y0 + L * 0.77} ${cx + W * 0.33} ${y0 + L * 0.74} L${cx + W * 0.37} ${y0 + L * 0.84} Q${cx} ${y0 + L * 0.87} ${cx - W * 0.37} ${y0 + L * 0.84} Z`} fill={t.panel2} />
      {[-1, 1].map((sx) => (
        <g key={sx}>
          <Ln d={`M${cx + sx * W * 0.5} ${y0 + L * 0.32} l${sx * 22} -6 l0 22 Z`} fill={t.panel} />
          <Ln d={`M${cx + sx * W * 0.18} ${y0 + 10} L${cx + sx * W * 0.38} ${y0 + 24}`} w={5} />
        </g>
      ))}
    </g>
  );
};

/** a map's street grid in a box */
export const LMap: React.FC<{x: number; y: number; w: number; h: number; seed?: number}> = ({x, y, w, h, seed = 3}) => {
  const t = lp();
  const r = rng(seed);
  const u = (a: number, b: number) => a + (b - a) * r();
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={t.panel2} />
      {Array.from({length: 8}, (_, i) => <Ln key={`h${i}`} d={`M${x - 20} ${y + (h * i) / 7 + u(-25, 25)} L${x + w + 20} ${y + (h * i) / 7 + u(-50, 50)}`} c={t.hair} w={7} />)}
      {Array.from({length: 5}, (_, i) => <Ln key={`v${i}`} d={`M${x + (w * i) / 4 + u(-20, 20)} ${y - 20} L${x + (w * i) / 4 + u(-40, 40)} ${y + h + 20}`} c={t.hair} w={7} />)}
    </g>
  );
};

/** the navigator's route and its arrow, in a box (a map or a phone's screen) */
export const LRoute: React.FC<{x: number; y: number; w: number; h: number}> = ({x, y, w, h}) => {
  const t = lp();
  const ax = x + w * 0.32;
  const ay = y + h * 0.8;
  return (
    <g>
      <Ln d={`M${x + w * 0.32} ${y + h * 0.98} L${x + w * 0.34} ${y + h * 0.64} Q${x + w * 0.36} ${y + h * 0.52} ${x + w * 0.56} ${y + h * 0.47} L${x + w * 0.68} ${y + h * 0.24}`} w={w * 0.045} />
      <Ln d={`M${ax} ${ay - w * 0.09} L${ax + w * 0.075} ${ay + w * 0.06} L${ax} ${ay + w * 0.025} L${ax - w * 0.075} ${ay + w * 0.06} Z`} fill={t.panel} w={3} />
    </g>
  );
};

/** the app's push / navigator banner: a white card, the V tile, a bold line and a grey line (128 tall) */
export const LBanner: React.FC<{x: number; y: number; w: number; title: string; sub: string}> = ({x, y, w, title, sub}) => {
  const t = lp();
  return (
    <g>
      <LCard x={x} y={y} w={w} h={128} r={30} />
      <rect x={x + 24} y={y + 26} width={76} height={76} rx={20} fill={t.ink} />
      <VMark cx={x + 62} cy={y + 64} s={44} c={t.on} />
      <Tx x={x + 124} y={y + 58} size={30} weight={700}>
        {title}
      </Tx>
      <Tx x={x + 124} y={y + 98} size={24} color={t.mid}>
        {sub}
      </Tx>
    </g>
  );
};

/** a road warning sign (glyph: a bump, or nothing) */
export const LWarn: React.FC<{cx: number; cy: number; s: number; glyph?: 'bump' | 'none'}> = ({cx, cy, s, glyph = 'bump'}) => {
  const hh = s * 0.87;
  return (
    <g>
      <Ln d={`M${cx} ${cy - hh * 0.62} L${cx + s / 2} ${cy + hh * 0.38} L${cx - s / 2} ${cy + hh * 0.38} Z`} fill={lp().panel} w={s * 0.055} />
      {glyph === 'bump' ? (
        <Ln d={`M${cx - s * 0.26} ${cy + hh * 0.2} Q${cx - s * 0.12} ${cy + hh * 0.2} ${cx - s * 0.07} ${cy + hh * 0.06} Q${cx} ${cy - hh * 0.1} ${cx + s * 0.07} ${cy + hh * 0.06} Q${cx + s * 0.12} ${cy + hh * 0.2} ${cx + s * 0.26} ${cy + hh * 0.2}`} w={s * 0.04} />
      ) : null}
    </g>
  );
};

/** a tyre and rim, face-on */
export const LTyre: React.FC<{cx: number; cy: number; r: number}> = ({cx, cy, r}) => {
  const t = lp();
  const ray = (a: number, r0: number, r1: number) => `M${cx + r0 * Math.cos(a)} ${cy + r0 * Math.sin(a)} L${cx + r1 * Math.cos(a)} ${cy + r1 * Math.sin(a)}`;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={t.panel} stroke={t.ink} strokeWidth={3} />
      <circle cx={cx} cy={cy} r={r * 0.8} fill="none" stroke={t.ink} strokeWidth={2.5} />
      <circle cx={cx} cy={cy} r={r * 0.58} fill="none" stroke={t.mid} strokeWidth={2} />
      <circle cx={cx} cy={cy} r={r * 0.12} fill="none" stroke={t.ink} strokeWidth={2.5} />
      {Array.from({length: 36}, (_, i) => <Ln key={`t${i}`} d={ray((i * 10 * Math.PI) / 180, r * 0.82, r * 0.97)} c={t.mid} w={2} />)}
      {Array.from({length: 5}, (_, i) => <Ln key={`s${i}`} d={ray(((i * 72 - 90) * Math.PI) / 180, r * 0.14, r * 0.56)} w={2.5} />)}
    </g>
  );
};

/** a snowflake */
export const LSnow: React.FC<{cx: number; cy: number; s: number}> = ({cx, cy, s}) => (
  <g>
    {Array.from({length: 6}, (_, i) => {
      const a = (i * Math.PI) / 3;
      const bx = cx + s * 0.6 * Math.cos(a);
      const by = cy + s * 0.6 * Math.sin(a);
      return (
        <g key={i}>
          <Ln d={`M${cx} ${cy} L${cx + s * Math.cos(a)} ${cy + s * Math.sin(a)}`} />
          {[-1, 1].map((b) => (
            <Ln key={b} d={`M${bx} ${by} L${bx + s * 0.28 * Math.cos(a + b * 0.7)} ${by + s * 0.28 * Math.sin(a + b * 0.7)}`} />
          ))}
        </g>
      );
    })}
  </g>
);

/** mountains in a box */
export const LMountains: React.FC<{x: number; y: number; w: number; h: number}> = ({x, y, w, h}) => {
  const t = lp();
  return (
    <g>
      <Ln d={`M${x} ${y + h} L${x + w * 0.3} ${y + h * 0.15} L${x + w * 0.46} ${y + h * 0.5} L${x + w * 0.66} ${y} L${x + w} ${y + h}`} fill={t.panel} w={3} />
      <Ln d={`M${x + w * 0.6} ${y + h * 0.1} L${x + w * 0.64} ${y + h * 0.16} L${x + w * 0.68} ${y + h * 0.09} L${x + w * 0.72} ${y + h * 0.14}`} c={t.mid} w={2} />
      <Ln d={`M${x + w * 0.26} ${y + h * 0.23} L${x + w * 0.3} ${y + h * 0.29} L${x + w * 0.34} ${y + h * 0.23}`} c={t.mid} w={2} />
    </g>
  );
};

/** a half dial with ticks and a needle at val (0..1), its end labels */
export const LGauge: React.FC<{cx: number; cy: number; r: number; val?: number; labels?: [string, string]}> = ({cx, cy, r, val = 0.8, labels = ['E', 'F']}) => {
  const t = lp();
  const a = Math.PI * (1 - val);
  return (
    <g>
      <Ln d={`M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy}`} w={3} />
      {Array.from({length: 17}, (_, k) => {
        const aa = Math.PI * (1 - k / 16);
        const L = k % 4 === 0 ? 26 : 14;
        return <Ln key={k} d={`M${cx + (r - 8) * Math.cos(aa)} ${cy - (r - 8) * Math.sin(aa)} L${cx + (r - 8 - L) * Math.cos(aa)} ${cy - (r - 8 - L) * Math.sin(aa)}`} c={k % 4 === 0 ? t.ink : t.mid} />;
      })}
      <Ln d={`M${cx} ${cy} L${cx + (r - 40) * Math.cos(a)} ${cy - (r - 40) * Math.sin(a)}`} w={4} />
      <circle cx={cx} cy={cy} r={12} fill={t.panel} stroke={t.ink} strokeWidth={3} />
      <Mono x={cx - r + 10} y={cy + 40} size={24}>
        {labels[0]}
      </Mono>
      <Mono x={cx + r - 30} y={cy + 40} size={24}>
        {labels[1]}
      </Mono>
    </g>
  );
};

export type ReceiptRow = [string, string, ('big' | 'strike' | '')?];
/** a receipt with a torn foot: a grey head line, rows of label left and value right (big: the total; strike: struck) */
export const LReceipt: React.FC<{x: number; y: number; w: number; h: number; rows: ReceiptRow[]; head?: string; a?: number}> = ({x, y, w, h, rows, head, a}) => {
  const t = lp();
  const zig = Array.from({length: Math.floor(w / 28)}, () => 'l-14 16 l-14 -16 ').join('');
  let yy = y + 60 + (head ? 30 : 0);
  return (
    <g transform={rotT(a, x + w / 2, y + h / 2)}>
      <Ln d={`M${x} ${y} H${x + w} V${y + h} ${zig}L${x} ${y + h} Z`} fill={t.panel} />
      {head ? (
        <Tx x={x + w / 2} y={y + 60} size={26} color={t.mid} anchor="middle">
          {head}
        </Tx>
      ) : null}
      {rows.map(([k, v, st]) => {
        yy += 64;
        const ry = yy;
        return (
          <g key={k}>
            <Tx x={x + 34} y={ry} size={26} color={t.mid}>
              {k}
            </Tx>
            <Tx x={x + w - 34} y={ry} size={st === 'big' ? 34 : 28} anchor="end" weight={st === 'big' ? 700 : 500}>
              {v}
            </Tx>
            {st === 'strike' ? <Ln d={`M${x + w - 34 - v.length * 16} ${ry - 10} H${x + w - 30}`} /> : null}
            <LDash d={`M${x + 30} ${ry + 24} H${x + w - 30}`} w={1.5} da="5 6" />
          </g>
        );
      })}
    </g>
  );
};

/** a tear-off calendar page: the month on its band (dark: an ink band), the day big */
export const LPage: React.FC<{x: number; y: number; w: number; mon: string; day: string; a?: number; dark?: boolean}> = ({x, y, w, mon, day, a, dark = false}) => {
  const t = lp();
  const h = w * 1.15;
  return (
    <g transform={rotT(a, x + w / 2, y + h / 2)}>
      <LCard x={x} y={y} w={w} h={h} r={24} />
      <rect x={x} y={y} width={w} height={w * 0.3} rx={24} fill={dark ? t.ink : t.panel2} stroke={t.hair} strokeWidth={2} />
      <Tx x={x + w / 2} y={y + w * 0.2} size={w * 0.12} color={dark ? t.on : t.ink} anchor="middle" weight={700}>
        {mon}
      </Tx>
      <Tx x={x + w / 2} y={y + h * 0.78} size={w * 0.42} anchor="middle" weight={700}>
        {day}
      </Tx>
      {[x + w * 0.25, x + w * 0.75].map((rx) => (
        <rect key={rx} x={rx - 8} y={y - 22} width={16} height={44} rx={8} fill={t.panel} stroke={t.ink} strokeWidth={2.5} />
      ))}
    </g>
  );
};

/** a month card: its name and year, the weekday row, the days (first: the weekday column 0..6 of the 1st), marked days
 *  dotted, one day circled in ink */
export const LMonth: React.FC<{x: number; y: number; name: string; year?: string; days?: number; first?: number; marks?: number[]; circled?: number; weekdays?: string}> = ({
  x, y, name, year, days = 30, first = 6, marks = [], circled, weekdays = 'ორ სა ოთ ხუ პა შა კვ',
}) => {
  const t = lp();
  const rows = Math.ceil((first + days) / 7);
  return (
    <g>
      <LCard x={x} y={y} w={640} h={180 + rows * 80} r={36} />
      <Tx x={x + 46} y={y + 80} size={40} weight={700}>
        {name}
      </Tx>
      {year ? (
        <Mono x={x + 510} y={y + 76} size={24}>
          {year}
        </Mono>
      ) : null}
      {weekdays.split(' ').map((d, i) => (
        <Tx key={d} x={x + 72 + i * 84} y={y + 144} size={22} color={t.mid} anchor="middle">
          {d}
        </Tx>
      ))}
      {Array.from({length: days}, (_, k) => {
        const d = k + 1;
        const i = first + k;
        const cx = x + 72 + (i % 7) * 84;
        const cy = y + 202 + Math.floor(i / 7) * 80;
        const on = marks.includes(d);
        if (d === circled)
          return (
            <g key={d}>
              <circle cx={cx} cy={cy - 9} r={32} fill={t.ink} />
              <Tx x={cx} y={cy} size={28} color={t.on} anchor="middle" weight={700}>
                {d}
              </Tx>
            </g>
          );
        return (
          <g key={d}>
            <Tx x={cx} y={cy} size={28} color={on ? t.ink : t.mid} anchor="middle" weight={on ? 600 : 400}>
              {d}
            </Tx>
            {on ? <circle cx={cx} cy={cy + 18} r={5} fill={t.ink} /> : null}
          </g>
        );
      })}
    </g>
  );
};

/** a card of rows: a ring (the first filled), a title left, a value right, hairlines between */
export const LList: React.FC<{x: number; y: number; w: number; rows: [string, string][]; size?: number}> = ({x, y, w, rows, size = 28}) => {
  const t = lp();
  return (
    <g>
      <LCard x={x} y={y} w={w} h={80 * rows.length + 36} r={30} />
      {rows.map(([a, b], i) => {
        const yy = y + 62 + i * 80;
        return (
          <g key={a}>
            <circle cx={x + 40} cy={yy - 9} r={9} fill={i === 0 ? t.ink : 'none'} stroke={t.ink} strokeWidth={2.5} />
            <Tx x={x + 66} y={yy} size={size} weight={600}>
              {a}
            </Tx>
            <Tx x={x + w - 30} y={yy} size={size - 2} color={t.mid} anchor="end">
              {b}
            </Tx>
            {i < rows.length - 1 ? <Ln d={`M${x + 30} ${yy + 32} H${x + w - 30}`} c={t.hair} w={2} /> : null}
          </g>
        );
      })}
    </g>
  );
};

/** the app's trouble-code lookup: the search pill with the code, then the result card (title lines, bullet lines) */
export const LCodeCard: React.FC<{x: number; y: number; w: number; code: string; title: string[]; lines: string[]; sub?: string}> = ({x, y, w, code, title, lines, sub}) => {
  const t = lp();
  const h = 200 + 54 * lines.length + (title.length > 1 ? 60 : 0);
  const y2 = y + 236 + 50 * (title.length - 1) + 40;
  return (
    <g>
      <LCard x={x} y={y} w={w} h={92} r={46} />
      <circle cx={x + 50} cy={y + 44} r={13} fill="none" stroke={t.mid} strokeWidth={3} />
      <Ln d={`M${x + 60} ${y + 54} l13 13`} c={t.mid} w={3} />
      <Mono x={x + 90} y={y + 58} size={32} color={t.ink} ls={4}>
        {code}
      </Mono>
      <LCard x={x} y={y + 120} w={w} h={h} r={32} />
      <Mono x={x + 36} y={y + 176}>
        {sub ?? `${code} · კოდი`}
      </Mono>
      {title.map((tl, i) => (
        <Tx key={tl} x={x + 36} y={y + 236 + i * 50} size={38} weight={700}>
          {tl}
        </Tx>
      ))}
      <Ln d={`M${x + 36} ${y2} H${x + w - 36}`} c={t.hair} w={2} />
      {lines.map((s, i) => (
        <g key={s}>
          <circle cx={x + 48} cy={y2 + 46 + i * 54} r={6} fill={t.ink} />
          <Tx x={x + 70} y={y2 + 55 + i * 54} size={27} color={t.ink2}>
            {s}
          </Tx>
        </g>
      ))}
    </g>
  );
};

/** a calendar entry: a ring (filled when done), the title, when (right), an optional grey line */
export const LEntry: React.FC<{x: number; y: number; w: number; title: string; when: string; sub?: string; done?: boolean}> = ({x, y, w, title, when, sub, done = false}) => {
  const t = lp();
  return (
    <g>
      <LCard x={x} y={y} w={w} h={sub ? 112 : 92} r={26} />
      <circle cx={x + 42} cy={y + 46} r={11} fill={done ? t.ink : 'none'} stroke={t.ink} strokeWidth={2.5} />
      <Tx x={x + 72} y={y + 56} size={title.length <= 11 ? 30 : 25} weight={600}>
        {title}
      </Tx>
      <Tx x={x + w - 30} y={y + 56} size={26} color={t.mid} anchor="end">
        {when}
      </Tx>
      {sub ? (
        <Tx x={x + 72} y={y + 92} size={22} color={t.mid}>
          {sub}
        </Tx>
      ) : null}
    </g>
  );
};

/** the ELM327 OBD adapter, w wide, turned a */
export const LElm: React.FC<{x: number; y: number; w: number; a?: number}> = ({x, y, w, a = -6}) => {
  const t = lp();
  const h = w * 0.6;
  return (
    <g transform={rotT(a, x + w / 2, y + h / 2)}>
      <Ln d={`M${x} ${y} H${x + w} L${x + w * 0.9} ${y + h} H${x + w * 0.1} Z`} fill={t.panel} w={3} />
      <rect x={x + w * 0.12} y={y - w * 0.13} width={w * 0.76} height={w * 0.14} rx={10} fill={t.panel2} stroke={t.ink} strokeWidth={2.5} />
      {Array.from({length: 8}, (_, i) => (
        <rect key={i} x={x + w * 0.18 + i * w * 0.08} y={y - w * 0.11} width={w * 0.035} height={w * 0.08} rx={3} fill="none" stroke={t.mid} strokeWidth={1.5} />
      ))}
      <Mono x={x + w * 0.5} y={y + h * 0.5} size={w * 0.1} color={t.ink} anchor="middle" weight={600}>
        ELM327
      </Mono>
      <Mono x={x + w * 0.5} y={y + h * 0.72} size={w * 0.055} anchor="middle">
        OBD-II
      </Mono>
      <circle cx={x + w * 0.82} cy={y + h * 0.22} r={6} fill={t.ink} />
    </g>
  );
};

/** a speed camera on its pole (~220 x 470 at s 1) */
export const LCam: React.FC<{x: number; y: number; s?: number}> = ({x, y, s = 1}) => {
  const t = lp();
  const k = (v: number) => v * s;
  return (
    <g>
      <Ln d={`M${x + k(70)} ${y + k(110)} V${y + k(470)}`} w={3} />
      <rect x={x} y={y} width={k(220)} height={k(110)} rx={k(16)} fill={t.panel} stroke={t.ink} strokeWidth={3} />
      <circle cx={x + k(168)} cy={y + k(55)} r={k(30)} fill="none" stroke={t.ink} strokeWidth={3} />
      <circle cx={x + k(168)} cy={y + k(55)} r={k(12)} fill={t.ink} />
      <rect x={x + k(22)} y={y + k(28)} width={k(70)} height={k(12)} rx={k(6)} fill={t.mid} />
    </g>
  );
};

/** a traffic light on its pole (lit: 0 top .. 2 bottom) */
export const LTLight: React.FC<{x: number; y: number; s?: number; lit?: number}> = ({x, y, s = 1, lit = 0}) => {
  const t = lp();
  const k = (v: number) => v * s;
  return (
    <g>
      <Ln d={`M${x + k(60)} ${y + k(300)} V${y + k(470)}`} w={3} />
      <rect x={x} y={y} width={k(120)} height={k(300)} rx={k(26)} fill={t.panel} stroke={t.ink} strokeWidth={3} />
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={x + k(60)} cy={y + k(58 + i * 92)} r={k(32)} fill={i === lit ? t.ink : 'none'} stroke={t.ink} strokeWidth={2.5} />
      ))}
    </g>
  );
};

/** a small house, w wide */
export const LHouse: React.FC<{x: number; y: number; w: number}> = ({x, y, w}) => {
  const t = lp();
  const h = w * 0.8;
  const box = (bx: number, by: number, bw: number, bh: number, r = 4) => <rect x={bx} y={by} width={bw} height={bh} rx={r} fill="none" stroke={t.ink} strokeWidth={2.5} />;
  return (
    <g>
      <rect x={x} y={y + h * 0.4} width={w} height={h * 0.6} rx={4} fill={t.panel} stroke={t.ink} strokeWidth={3} />
      <Ln d={`M${x - w * 0.08} ${y + h * 0.44} L${x + w / 2} ${y} L${x + w * 1.08} ${y + h * 0.44}`} w={3} />
      {box(x + w * 0.14, y + h * 0.55, w * 0.24, w * 0.2)}
      {box(x + w * 0.58, y + h * 0.64, w * 0.24, h * 0.36)}
      {box(x + w * 0.7, y + h * 0.06, w * 0.1, h * 0.2, 2)}
    </g>
  );
};

/** a speech bubble (its tail at `tail` of its width, pointing down-left) */
export const LBubble: React.FC<{x: number; y: number; w: number; h: number; tail?: number; children?: React.ReactNode}> = ({x, y, w, h, tail = 0.25, children}) => {
  const tx = x + w * tail;
  return (
    <g>
      <Ln
        d={`M${x + 36} ${y} H${x + w - 36} Q${x + w} ${y} ${x + w} ${y + 36} V${y + h - 36} Q${x + w} ${y + h} ${x + w - 36} ${y + h} H${tx + 26} L${tx - 10} ${y + h + 54} L${tx - 20} ${y + h} H${x + 36} Q${x} ${y + h} ${x} ${y + h - 36} V${y + 36} Q${x} ${y} ${x + 36} ${y} Z`}
        fill={lp().panel}
        w={3}
      />
      {children}
    </g>
  );
};

/** a sound wave: n bars centred on y, h tall at most (spikes: the bars drawn twice as tall) */
export const LWave: React.FC<{x: number; y: number; w: number; h: number; n?: number; seed?: number; spikes?: number[]; c?: string}> = ({x, y, w, h, n = 34, seed = 5, spikes = [], c}) => {
  const r = rng(seed);
  const st = w / n;
  return (
    <g>
      {Array.from({length: n}, (_, i) => {
        const v = Math.min(h, h * (0.15 + 0.45 * r()) * (spikes.includes(i) ? 2 : 1));
        return <Ln key={i} d={`M${x + i * st + st / 2} ${y - v / 2} V${y + v / 2}`} c={c} w={st * 0.42} />;
      })}
    </g>
  );
};

/** a switch, on or off (76 x 44) */
export const LToggle: React.FC<{x: number; y: number; on?: boolean}> = ({x, y, on = true}) => {
  const t = lp();
  return (
    <g>
      <rect x={x} y={y} width={76} height={44} rx={22} fill={on ? t.ink : t.panel2} stroke={on ? t.ink : t.faint} strokeWidth={2} />
      <circle cx={x + (on ? 54 : 22)} cy={y + 22} r={16} fill={on ? t.panel : t.faint} />
    </g>
  );
};

/** a home screen (for <LPhone>'s screen: 0..sw, 0..sh) with the app's widget on top: a big number, a word, a label */
export const LHome: React.FC<{sw: number; sh: number; big: string; unit?: string; label: string}> = ({sw, sh, big, unit = 'დღე', label}) => {
  const t = lp();
  return (
    <g>
      <rect x={0} y={0} width={sw} height={sh} fill={t.panel2} />
      <LCard x={sw * 0.07} y={sh * 0.1} w={sw * 0.86} h={sw * 0.5} r={26} />
      <Tx x={sw * 0.15} y={sh * 0.1 + sw * 0.23} size={sw * 0.17} weight={700}>
        {big}
      </Tx>
      <Tx x={sw * 0.15 + big.length * sw * 0.1} y={sh * 0.1 + sw * 0.23} size={sw * 0.07} color={t.mid}>
        {unit}
      </Tx>
      <Tx x={sw * 0.15} y={sh * 0.1 + sw * 0.38} size={sw * 0.065} color={t.ink2}>
        {label}
      </Tx>
      {Array.from({length: 12}, (_, i) => (
        <rect key={i} x={sw * (0.1 + (i % 4) * 0.21)} y={sh * (0.42 + Math.floor(i / 4) * 0.11)} width={sw * 0.15} height={sw * 0.15} rx={sw * 0.045} fill={t.panel} stroke={t.hair} strokeWidth={1.5} />
      ))}
    </g>
  );
};
