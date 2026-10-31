// The problem, chewed (the narrator's first piece, over the dark): one lamp for a dozen of the engine's parts (the wires
// converge on it, and it lights), the guess (three reels of parts that never agree), and the money that goes with it (lari
// notes slipping one by one through a street drain's grate at night). The amber of the lamp is the only warm colour in them.
import React from 'react';
import {clamp, E, lerp, prog, sp} from './lib';
import {AMBER, EngineIcon, Svg, useShot, WHITE} from './kit/stage';
import {PartIcon, type PartName} from './kit/parts';

// ---- 14 wires: on the dark, a dozen of the engine's parts on an arc; from each a fine wire runs down to ONE lamp; pulses run
// along them into it (whatever fails, the same lamp) ---------------------------------------------------------------------------
const RING: {n: PartName; a: number}[] = [
  {n: 'plug', a: -150},
  {n: 'coil', a: -128},
  {n: 'o2', a: -106},
  {n: 'cat', a: -84},
  {n: 'injector', a: -62},
  {n: 'maf', a: -40},
  {n: 'hose', a: -168},
  {n: 'thermo', a: -12},
  {n: 'cap', a: -196},
  {n: 'egr', a: -224},
  {n: 'battery', a: 16},
  {n: 'belt', a: 44},
];
const LAMP = {x: 540, y: 1130};
const partAt = (a: number, r = 470): [number, number] => [540 + r * Math.cos((a * Math.PI) / 180) * 0.86, 820 + r * Math.sin((a * Math.PI) / 180) * 0.82];
const wireD = (p: [number, number]) => {
  const mx = (p[0] + LAMP.x) / 2;
  return `M${p[0].toFixed(1)} ${(p[1] + 46).toFixed(1)}C${p[0].toFixed(1)} ${(p[1] + 230).toFixed(1)} ${mx.toFixed(1)} ${(LAMP.y - 160).toFixed(1)} ${LAMP.x} ${LAMP.y - 54}`;
};
export const WiresShot: React.FC = () => {
  const {t, len, L} = useShot('wires');
  const w0 = L('wires');
  const k = E.inOut(prog(t, 0, len));
  const order = [3, 0, 7, 10, 5, 1, 8, 4, 2, 11, 6, 9];
  return (
    <div style={{position: 'absolute', inset: 0, background: '#0A0A0C', overflow: 'hidden'}}>
      <Svg style={{transform: `scale(${lerp(1.04, 1, k)})`, transformOrigin: '540px 1000px'}}>
        <defs>
          <radialGradient id="wiBg" cx="0.5" cy="0.62" r="0.6">
            <stop offset="0" stopColor="#1A1A1F" />
            <stop offset="1" stopColor="#0A0A0C" />
          </radialGradient>
        </defs>
        <rect width={1080} height={1920} fill="url(#wiBg)" />
        {RING.map((r, i) => {
          const p = partAt(r.a);
          const at = Math.max(2, w0 - 12) + order.indexOf(i) * 2.2;
          const a = E.out(prog(t, at - 6, 10));
          const d = wireD(p);
          // a pulse runs along the wire, at a steady, staggered pace
          const ph = ((t - at) / 26 + i * 0.13) % 1;
          return (
            <g key={r.n} opacity={a}>
              <path d={d} fill="none" stroke={WHITE} strokeWidth={2} opacity={0.16} />
              {t > at ? <path d={d} fill="none" stroke={WHITE} strokeWidth={3.2} strokeLinecap="round" pathLength={1} strokeDasharray="0.06 1" strokeDashoffset={-ph} opacity={0.7} /> : null}
              <circle cx={p[0]} cy={p[1]} r={66} fill="#16171B" />
              <PartIcon name={r.n} x={p[0]} y={p[1]} size={78} color={WHITE} width={3.2} opacity={0.92} />
            </g>
          );
        })}
        {/* the one lamp they all run into: dark, waiting */}
        <circle cx={LAMP.x} cy={LAMP.y} r={92} fill="#121216" />
        <EngineIcon uid="wi" x={LAMP.x} y={LAMP.y} size={120} k={0} off="#5A5F69" />
      </Svg>
    </div>
  );
};

// ---- 15 lamp: close on that one lamp, the wires coming in from above; it lights amber („რომ რაღაც ცუდადაა.") ----------------
export const LampShot: React.FC = () => {
  const {t, len, L} = useShot('lamp');
  const on = L('lampOn');
  const k = E.inOut(prog(t, 0, len));
  const fl = t - on;
  const lit = fl < 0 ? 0 : fl < 2 ? 1 : fl < 4 ? 0.3 : 1;
  const bloom = fl < 0 ? 0 : Math.exp(-fl / 9) * clamp(fl / 2);
  const s = lerp(1.0, 1.06, k);
  const cx = 540;
  const cy = 860;
  return (
    <div style={{position: 'absolute', inset: 0, background: '#0A0A0C', overflow: 'hidden'}}>
      <Svg style={{transform: `scale(${s})`, transformOrigin: `${cx}px ${cy}px`}}>
        <defs>
          <radialGradient id="laBloom" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor={AMBER} stopOpacity={0.5} />
            <stop offset="0.4" stopColor={AMBER} stopOpacity={0.12} />
            <stop offset="1" stopColor={AMBER} stopOpacity={0} />
          </radialGradient>
        </defs>
        {Array.from({length: 9}, (_, i) => {
          const x0 = 540 + (i - 4) * 150;
          const d = `M${x0} -40C${x0} 300 ${lerp(x0, cx, 0.8)} ${cy - 360} ${cx + (i - 4) * 6} ${cy - 120}`;
          const ph = ((t / 22 + i * 0.17) % 1 + 1) % 1;
          return (
            <g key={i}>
              <path d={d} fill="none" stroke={WHITE} strokeWidth={2.4} opacity={0.14} />
              <path d={d} fill="none" stroke={lit > 0.5 ? AMBER : WHITE} strokeWidth={3.6} strokeLinecap="round" pathLength={1} strokeDasharray="0.05 1" strokeDashoffset={-ph} opacity={0.75} />
            </g>
          );
        })}
        <circle cx={cx} cy={cy} r={600 * (0.6 + 0.4 * bloom)} fill="url(#laBloom)" opacity={lit * (0.55 + 0.45 * bloom)} />
        <circle cx={cx} cy={cy} r={170} fill="#131317" />
        <EngineIcon uid="la" x={cx} y={cy} size={250} k={lit} off="#4E535C" stroke={1.5} />
      </Svg>
    </div>
  );
};

// ---- 16 roulette: the guess: three reels of parts spin, then stop one by one on three different parts (none agree) --------
const REEL: PartName[] = ['plug', 'cat', 'o2', 'coil', 'battery', 'injector', 'maf', 'hose', 'thermo', 'egr'];
const STOPS = [0, 1, 4];
export const RouletteShot: React.FC = () => {
  const {t, len, L, Ls} = useShot('roulette');
  const spin = L('spin');
  const stops = Ls('stops');
  const k = E.inOut(prog(t, 0, len));
  const CELL = 230;
  return (
    <div style={{position: 'absolute', inset: 0, background: '#0B0B0D', overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${lerp(1, 1.05, k)})`, transformOrigin: '540px 860px'}}>
        <Svg>
          <defs>
            <linearGradient id="roFade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0B0B0D" stopOpacity={1} />
              <stop offset="0.3" stopColor="#0B0B0D" stopOpacity={0} />
              <stop offset="0.7" stopColor="#0B0B0D" stopOpacity={0} />
              <stop offset="1" stopColor="#0B0B0D" stopOpacity={1} />
            </linearGradient>
            {[0, 1, 2].map((i) => (
              <clipPath key={i} id={`roWin${i}`}>
                <rect x={150 + i * 270} y={600} width={240} height={520} rx={40} />
              </clipPath>
            ))}
          </defs>
          {/* the machine's face */}
          <rect x={110} y={540} width={860} height={640} rx={70} fill="#16171B" />
          {[0, 1, 2].map((i) => {
            const stopAt = stops[i];
            // the reel's position (in cells): fast while spinning, easing into its stop
            const v = 0.55;
            const run = Math.max(0, t - spin);
            const target = STOPS[i] + REEL.length * (3 + i);
            const free = run * v;
            const ease = clamp((t - (stopAt - 12)) / 12);
            const pos = t < stopAt - 12 ? free : lerp((stopAt - 12 - spin) * v, target, E.out(ease));
            const p = t >= stopAt ? target : pos;
            const base = Math.floor(p);
            const frac = p - base;
            const blur = t < stopAt - 2 && t > spin ? 1 : 0;
            const settle = t >= stopAt ? Math.sin((t - stopAt) * 1.9) * Math.exp(-(t - stopAt) / 4) * 10 : 0;
            return (
              <g key={i}>
                <rect x={150 + i * 270} y={600} width={240} height={520} rx={40} fill="#0E0E11" />
                <g clipPath={`url(#roWin${i})`}>
                  {[-2, -1, 0, 1, 2].map((j) => {
                    const idx = (((base + j) % REEL.length) + REEL.length) % REEL.length;
                    const y = 860 + (j - frac) * CELL + settle;
                    return <PartIcon key={j} name={REEL[idx]} x={270 + i * 270} y={y} size={130} color={WHITE} width={blur ? 2 : 4} opacity={blur ? 0.45 : 0.95} />;
                  })}
                  <rect x={150 + i * 270} y={600} width={240} height={520} fill="url(#roFade)" />
                </g>
              </g>
            );
          })}
          {/* the pull lever at the side */}
          <rect x={985} y={700} width={24} height={300} rx={12} fill="#2A2B30" />
          <circle cx={997} cy={lerp(690, 760, Math.sin(Math.PI * clamp((t - spin + 4) / 10)))} r={34} fill={AMBER} />
        </Svg>
      </div>
    </div>
  );
};

// ---- 17 drain: low at the kerb at night, the wet gutter, a street drain's iron grate; lari notes slide down the gutter and slip
// one by one through its slots; a warm street lamp's reflection trembles on the wet asphalt ---------------------------------
export const DrainShot: React.FC = () => {
  const {t, len, Ls} = useShot('drain');
  const notes = Ls('notes');
  const k = E.inOut(prog(t, 0, len));
  const G = {x: 540, y: 1060, w: 620, h: 300};
  const NOTES: {v: string; tone: 'green' | 'ochre' | 'blue'; x0: number; r0: number}[] = [
    {v: '100', tone: 'green', x0: 220, r0: -18},
    {v: '50', tone: 'ochre', x0: 780, r0: 14},
    {v: '100', tone: 'green', x0: 330, r0: 8},
    {v: '20', tone: 'ochre', x0: 700, r0: -10},
    {v: '100', tone: 'green', x0: 480, r0: 20},
  ];
  return (
    <div style={{position: 'absolute', inset: 0, background: '#0B0A0B', overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${lerp(1, 1.05, k)})`, transformOrigin: '540px 1000px'}}>
        <Svg>
          <defs>
            <linearGradient id="drRoad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#141316" />
              <stop offset="1" stopColor="#201E20" />
            </linearGradient>
            <radialGradient id="drLamp" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#FFC27A" stopOpacity={0.5} />
              <stop offset="0.3" stopColor="#FFB060" stopOpacity={0.14} />
              <stop offset="1" stopColor="#FFB060" stopOpacity={0} />
            </radialGradient>
            <linearGradient id="drIron" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#3B3A3A" />
              <stop offset="1" stopColor="#1C1B1B" />
            </linearGradient>
            <clipPath id="drAbove">
              <rect x={-100} y={-100} width={1300} height={G.y + 2} />
            </clipPath>
          </defs>
          {/* the wet road, the kerb's edge along the top, the gutter's sheen */}
          <rect width={1080} height={1920} fill="url(#drRoad)" />
          <path d="M-40 520L1120 600L1120 700L-40 610Z" fill="#2B2928" />
          <path d="M-40 610L1120 700" stroke="#4A4643" strokeWidth={4} />
          {/* v2.1 (the AD: the glow sat behind the subtitle): the street lamp's trembling reflection between the kerb and the
              grate, well above the subtitle band */}
          <ellipse cx={330 + 14 * Math.sin(t / 9)} cy={800} rx={240} ry={70} fill="url(#drLamp)" />
          <ellipse cx={330 + 8 * Math.sin(t / 7)} cy={780} rx={46} ry={150} fill="url(#drLamp)" opacity={0.7} />
          {/* the grate: an iron frame and its slots (dark water under them) */}
          <rect x={G.x - G.w / 2 - 20} y={G.y - G.h / 2 - 20} width={G.w + 40} height={G.h + 40} rx={14} fill="url(#drIron)" />
          <rect x={G.x - G.w / 2} y={G.y - G.h / 2} width={G.w} height={G.h} rx={8} fill="#050505" />
          {Array.from({length: 11}, (_, i) => (
            <rect key={i} x={G.x - G.w / 2 + 14 + i * 55} y={G.y - G.h / 2} width={20} height={G.h} fill="url(#drIron)" />
          ))}
        </Svg>
        {/* the notes: sliding down the gutter toward the grate, tipping into a slot and gone */}
        {NOTES.map((n, i) => {
          const at = notes[i] ?? 0;
          const q = clamp((t - at) / 20);
          if (t < at - 30) return null;
          const glide = clamp((t - (at - 30)) / 30);
          const x = lerp(n.x0, 540 + (i - 2) * 110, E.inOut(glide));
          const y = lerp(560, G.y - 40, E.inOut(glide)) + E.in2(q) * 260;
          const rot = lerp(n.r0, 90 * (i % 2 ? 1 : -1) * 0, E.inOut(glide)) + n.r0 * 0.4 * Math.sin(t / 6 + i);
          const tip = E.in2(q);
          const w = 300;
          if (q >= 1) return null;
          return (
            <div key={i} style={{position: 'absolute', left: x - w / 2, top: y - w * 0.25, width: w, transform: `perspective(900px) rotateX(${tip * 70}deg) rotate(${rot}deg) scale(${1 - 0.35 * tip})`, opacity: 1 - tip * 0.7, filter: 'drop-shadow(0 8px 14px rgba(0,0,0,0.55))', clipPath: `inset(0 0 ${tip * 100}% 0)`}}>
              <Note w={w} v={n.v} tone={n.tone} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** a lari note, flat (the film's simple engraving): its tone, its value */
export const Note: React.FC<{w: number; v: string; tone: 'green' | 'ochre' | 'blue'}> = ({w, v, tone}) => {
  const h = w * 0.5;
  const base = tone === 'green' ? ['#7FA083', '#B9CDB4', '#4F6F55'] : tone === 'blue' ? ['#8C9AA8', '#C4CDD6', '#55626F'] : ['#C59B55', '#E4CB98', '#8A6630'];
  return (
    <svg width={w} height={h} viewBox="0 0 200 100" style={{display: 'block'}}>
      <rect x={0} y={0} width={200} height={100} rx={4} fill={base[0]} />
      <rect x={4} y={4} width={192} height={92} rx={3} fill="none" stroke={base[1]} strokeWidth={1.4} opacity={0.8} />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <ellipse key={i} cx={58} cy={50} rx={30 - i * 4.2} ry={34 - i * 4.6} fill="none" stroke={base[1]} strokeWidth={1} opacity={0.7} />
      ))}
      <rect x={110} y={14} width={78} height={72} rx={3} fill={base[1]} opacity={0.35} />
      <text x={182} y={40} textAnchor="end" fontFamily="FiraGO" fontWeight={700} fontSize={26} fill={base[2]}>
        {v}
      </text>
      <text x={182} y={78} textAnchor="end" fontFamily="FiraGO" fontWeight={600} fontSize={30} fill={base[2]}>
        ₾
      </text>
    </svg>
  );
};

void sp;
export const SHOTS: Record<string, React.FC> = {wires: WiresShot, lamp: LampShot, roulette: RouletteShot, drain: DrainShot};
