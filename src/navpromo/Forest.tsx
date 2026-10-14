// ACT 1, the forest (the owner, 2026-10-12: "the first film's scenes were good: the forest, the zoom out, the curse; the same,
// only with refined graphics and more motion"): the same eight shots on the same events, now in the studio's illustration
// language (refined.tsx): a moonlit night of pines and fog, the Silhouette-light man in a flat cap, the studio's coupe stuck
// in the ditch, the foreign navigator in his hand. Smooth camera moves inside a shot, hard cuts with a short punch between.
// The close-ups of his face are the kit's own head (forestBust.tsx), never a drawn cartoon face; nothing important sits in
// the subtitle's band (y 1440..1580), and the phones, the car and the cow stay whole in every frame.
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {Burst, CarTop, Cow, Crow, crownField, Crowns, DefsSvg, H, jit, Man, ManTop, Moon, Night, NightDefs, Owl, PHONE_FOOT, PhoneBack, PhoneInHand, pine, Stars, StuckCar, W} from './refined';
import {BUST_EX, ManBust, OpenHand} from './forestBust';
import {C} from '../tokens';
import {clamp, E, ev, evs, fr, lerp, shot, sp} from './lib';

/** an event (s) as a frame of this shot */
const at = (id: string, name: string) => fr(ev(name)) - fr(shot(id).from);
const durOf = (id: string) => fr(shot(id).to) - fr(shot(id).from);
const useUid = () => useId().replace(/[^A-Za-z0-9]/g, '');

/** one shot's frame: the svg, its defs, a camera (push about cx, cy; pan dx, dy; a roll in degrees), a punch on the cut
 *  (6 % bigger, 8 frames) */
const Frame: React.FC<{uid: string; t: number; push?: number; cx?: number; cy?: number; dx?: number; dy?: number; roll?: number; children: React.ReactNode}> = ({
  uid,
  t,
  push = 1,
  cx = 540,
  cy = 1000,
  dx = 0,
  dy = 0,
  roll = 0,
  children,
}) => {
  const punch = 1 + 0.06 * (1 - E.out(clamp(t / 8)));
  const s = push * punch;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0, background: C.ilNight}}>
      <DefsSvg uid={uid} />
      <NightDefs uid={uid} />
      <g transform={`translate(${(cx + dx).toFixed(1)} ${(cy + dy).toFixed(1)}) rotate(${roll.toFixed(2)}) scale(${s.toFixed(4)}) translate(${-cx} ${-cy})`}>{children}</g>
    </svg>
  );
};

/** crows bursting off the pine tops: each from (x, y) at frame `from` + a stagger, flying (vx, vy) px a frame, growing as
 *  they come toward the camera */
const CrowBurst: React.FC<{t: number; from: number; birds: [number, number, number, number, number][]; s?: number}> = ({t, from, birds, s = 1}) => (
  <g>
    {birds.map(([x, y, vx, vy, delay], i) => {
      const k = t - from - delay;
      if (k < 0) return null;
      const g = 1 + k * 0.012;
      return <Crow key={i} x={x + vx * k} y={y + vy * k - 0.05 * k * k} s={s * g * (0.8 + jit(i, 9) * 0.4)} flap={k * 0.95 + i * 1.7} dir={vx < 0 ? -1 : 1} />;
    })}
  </g>
);

// ---- the forest from above: the crowns, the clearing round the car, the track he drove in on --------------------------------
const TRACK: [number, number][] = [
  [520, 1030],
  [420, 1150],
  [330, 1330],
  [210, 1560],
  [60, 1820],
  [-120, 2120],
  [-320, 2460],
];
const nearTrack = (x: number, y: number) => {
  let best = 1e9;
  for (let i = 0; i < TRACK.length - 1; i++) {
    const [ax, ay] = TRACK[i];
    const [bx, by] = TRACK[i + 1];
    const vx = bx - ax;
    const vy = by - ay;
    const u = clamp(((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy));
    best = Math.min(best, Math.hypot(x - ax - vx * u, y - ay - vy * u));
  }
  return best;
};
const CROWNS = crownField(-760, -420, 1900, 2460, 82, 50, (x, y, r) => {
  const dx = x - 528;
  const dy = y - 1012;
  const edge = 205 + Math.sin(Math.atan2(dy, dx) * 5) * 18;
  if (Math.hypot(dx * 0.86, dy) < edge + r * 0.3) return true; // the clearing round the car and the man
  if (nearTrack(x, y) < 34 + r * 0.35) return true; // the track
  if (x > 850 && x < 1020 && y > 980 && y < 1140) return true; // the cow's dark gap
  return false;
});
const trackD = `M${TRACK.map((p) => p.join(' ')).join('L')}`;
const clearingD = (() => {
  let d = '';
  for (let k = 0; k <= 40; k++) {
    const a = (k / 40) * Math.PI * 2;
    const r = 200 + Math.sin(a * 5) * 18 + Math.sin(a * 3 + 1) * 10;
    d += `${k ? 'L' : 'M'}${(528 + (Math.cos(a) * r) / 0.86).toFixed(1)} ${(1012 + Math.sin(a) * r).toFixed(1)}`;
  }
  return d + 'Z';
})();
const ForestFloor: React.FC<{uid: string; frame: number; view?: [number, number, number, number]; man?: boolean}> = ({uid, frame, view, man = true}) => {
  const hz = Math.floor(frame / 12) % 2 === 0 ? 1 : 0.15;
  return (
    <g>
      <rect x={-1400} y={-1600} width={3900} height={5200} fill={C.ilNight} />
      {/* the clearing's grass in the moon, the track's two ruts */}
      <path d={clearingD} fill={C.il7} />
      <path d={trackD} stroke={C.il7} strokeWidth={96} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d={trackD} stroke={C.il6} strokeWidth={60} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.55} />
      <path d={trackD} stroke={C.il7} strokeWidth={20} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.8} />
      <circle cx={575} cy={1000} r={170} fill={`url(#${uid}glow)`} opacity={0.18} />
      <Crowns list={CROWNS} view={view} />
      <CarTop uid={uid} frame={frame} x={575} y={1000} len={150} rot={20} />
      <circle cx={548} cy={1052} r={7} fill={C.il0} opacity={hz} />
      <circle cx={590} cy={1066} r={7} fill={C.il0} opacity={hz} />
      {man ? <ManTop uid={uid} x={466} y={1022} s={0.95} rot={-28} glow={0.9 + 0.1 * Math.sin(frame / 5)} /> : null}
    </g>
  );
};

// ---- S0: the hook. He is SEEN shouting: a low close-up, the cap, the open mouth, the phone's light on his face, crows
// bursting off the pines and a camera kick on „სად ვარ?!“; on „სად ვარ აქანა?!“ the cut to the sky and the dive over the
// endless crowns down to the clearing where his coupe sits ---------------------------------------------------------------
const S0Shout: React.FC<{t: number}> = ({t}) => {
  const uid = useUid();
  const k1 = at('s0', 'shout1');
  const since = t - k1;
  const kick = since >= 0 ? E.out(clamp(since / 4)) * (1 - E.inOut(clamp((since - 4) / 18))) : 0;
  const shake = since >= 0 && since < 12 ? Math.sin(since * 2.9) * 16 * (1 - since / 12) : 0;
  const push = 1.03 + 0.05 * E.inOut(clamp(t / 37)) + 0.07 * kick;
  const jaw = 15 + (since >= 0 ? 2.2 * Math.sin(since * 0.85) : 0);
  const birds: [number, number, number, number, number][] = [
    [130, 560, -9, -15, 0],
    [220, 470, -4, -18, 2],
    [300, 620, -12, -11, 4],
    [880, 520, 10, -16, 1],
    [960, 600, 14, -10, 3],
    [800, 440, 5, -19, 5],
    [1000, 420, 8, -14, 6],
  ];
  return (
    <Frame uid={uid} t={20} push={push} cx={500} cy={720} dx={shake} dy={-shake * 0.4} roll={-1.5 * kick}>
      <rect x={-300} y={-300} width={1680} height={2600} fill={`url(#${uid}sky)`} />
      <Stars frame={t} n={60} area={[-120, -120, 1200, 1200]} />
      <Moon uid={uid} x={170} y={300} r={60} />
      {/* the pines from below: they rise from under the frame and lean in over him */}
      <path d={pine(250, 2500, 1900, 520)} fill={C.il6} opacity={0.75} transform="rotate(5 250 2500)" />
      <path d={pine(860, 2500, 1960, 540)} fill={C.il6} opacity={0.75} transform="rotate(-5 860 2500)" />
      <path d={pine(-10, 2500, 2200, 760)} fill={C.il7} transform="rotate(8 -10 2500)" />
      <path d={pine(1100, 2500, 2260, 780)} fill={C.il7} transform="rotate(-8 1100 2500)" />
      <CrowBurst t={t} from={k1} birds={birds} s={1.05} />
      <ManBust x={455} y={640} s={6.1} ex={BUST_EX.shout} jaw={jaw} nod={-10} glow={{x: 40, y: 24, r: 70, k: 0.75}} />
    </Frame>
  );
};

const S0Air: React.FC<{t: number; tt: number}> = ({t, tt}) => {
  const uid = useUid();
  const d = durOf('s0') - at('s0', 'shout2');
  const k = clamp(t / d);
  const zoom = 0.86 * (2.55 / 0.86) ** E.inOut(k);
  const roll = lerp(-9, 0, E.out(k));
  const birds: [number, number, number, number, number][] = Array.from({length: 9}, (_, i) => {
    const a = (i / 9) * Math.PI * 2 + 0.3;
    const r0 = 150 + jit(i, 31) * 120;
    return [560 + Math.cos(a) * r0, 1010 + Math.sin(a) * r0, Math.cos(a) * 7, Math.sin(a) * 7, (i % 4) * 2] as [number, number, number, number, number];
  });
  return (
    <Frame uid={uid} t={t} push={zoom} cx={560} cy={1010} roll={roll}>
      <ForestFloor uid={uid} frame={tt} />
      <CrowBurst t={t} from={0} birds={birds} s={0.5} />
    </Frame>
  );
};

export const S0Dive: React.FC = () => {
  const t = useCurrentFrame();
  const k2 = at('s0', 'shout2');
  return t < k2 ? <S0Shout t={t} /> : <S0Air t={t - k2} tt={t} />;
};

// ---- S1: the wide: the stuck coupe in the ditch, the man holding his phone up for a signal --------------------------------
export const S1Wide: React.FC = () => {
  const t = useCurrentFrame();
  const uid = useUid();
  const dur = durOf('s1');
  const push = 1 + 0.1 * E.inOut(clamp(t / dur));
  return (
    <Frame uid={uid} t={t + 20} push={push} cx={470} cy={1250}>
      <Night uid={uid} frame={t} moon={[800, 420, 48]} ground={1120} gap={[300, 760]} />
      {/* the dirt road into the trees, and the ditch the car slid into */}
      <path d="M-120 1920C120 1560 380 1270 520 1120L600 1120C720 1270 980 1560 1200 1920Z" fill={C.il7} />
      <path d="M560 1228C640 1208 860 1224 960 1268C990 1318 900 1358 760 1358C640 1358 560 1318 560 1228Z" fill={C.ilNight} />
      <StuckCar uid={uid} frame={t} x={760} y={1290} len={470} tilt={8} />
      <Man uid={uid} frame={t} x={320} y={1400} size={640} pose="wave" phone face="worried" turn={0.25} />
      <path d={pine(-60, 1920, 1500, 520)} fill={C.ilNight} />
    </Frame>
  );
};

const FOREARM = 'M846 630L970 604C1004 740 1040 900 1062 1060L1080 1320L924 1320C920 1100 890 880 846 630Z';

// ---- S2: „რაით?“: his face close, lit from the phone he holds up; a cobalt '?' -------------------------------------------
export const S2Face: React.FC = () => {
  const t = useCurrentFrame();
  const uid = useUid();
  const q = at('s2', 'qmark');
  const pop = sp(t, q, 260, 12);
  const jaw = 4 + 3 * Math.max(0, Math.sin(t * 0.7));
  return (
    <Frame uid={uid} t={t} push={1.02 + 0.05 * E.out(clamp(t / 19))} cx={500} cy={760} dx={-14 * E.inOut(clamp(t / 19))}>
      <rect x={-300} y={-300} width={1680} height={2600} fill={`url(#${uid}sky)`} />
      <Stars frame={t + 160} n={40} area={[-100, -100, 1180, 900]} />
      <path d={pine(1010, 1700, 1500, 460)} fill={C.il7} opacity={0.9} />
      <path d={pine(60, 1800, 1550, 480)} fill={C.il7} opacity={0.75} />
      {/* the phone held up at the top right, its light on his face; his raised arm leaves the frame on the right */}
      <circle cx={850} cy={330} r={560} fill={`url(#${uid}screen)`} />
      {/* the raised forearm: the sleeve runs on from the cuff, down to the far shoulder (under the jacket) */}
      <path d={FOREARM} fill={C.il4} opacity={0.6} transform="translate(-4 -3)" />
      <path d={FOREARM} fill={C.il7} />
      <path d="M915 700C944 860 968 1000 986 1240" stroke={C.il6} strokeWidth={3} fill="none" opacity={0.8} />
      <g transform="translate(846 330) rotate(-12) scale(0.27)">
        <PhoneBack uid={uid} />
      </g>
      <ManBust x={405} y={690} s={5.8} ex={BUST_EX.worried} jaw={jaw} nod={-11} glow={{x: 58, y: -36, r: 92, k: 0.9}} />
      {t >= q ? (
        <text x={760} y={1010} fontFamily="FiraGO, sans-serif" fontWeight={800} fontSize={290} fill={C.accA} transform={`rotate(-10 760 920) translate(760 920) scale(${pop.toFixed(3)}) translate(-760 -920)`} textAnchor="middle">
          ?
        </text>
      ) : null}
    </Frame>
  );
};

// ---- S3: the foreign phone in his hand: the arrow flips right, up, left -----------------------------------------------------
export const S3Phone: React.FC = () => {
  const t = useCurrentFrame();
  const uid = useUid();
  const a1 = at('s3', 'arrow1');
  const a2 = at('s3', 'arrow2');
  const arrow = t < a1 ? 0 : t < a2 ? 1 : 2;
  const since = t < a1 ? t + 20 : t < a2 ? t - a1 : t - a2;
  const flipK = E.outBack(clamp(since / 6));
  return (
    <Frame uid={uid} t={t} push={1.02 + 0.05 * clamp(t / 30)} cy={PHONE_FOOT}>
      <rect x={-300} y={-300} width={1680} height={2600} fill={`url(#${uid}sky)`} />
      <PhoneInHand uid={uid} frame={t} arrow={arrow} flipK={flipK} label={arrow === 2 ? 'TURN LEFT' : arrow === 1 ? 'GO STRAIGHT' : 'TURN RIGHT'} />
    </Frame>
  );
};

// ---- S4: he turns round and round; the trees slide past him ------------------------------------------------------------------
export const S4Spin: React.FC = () => {
  const t = useCurrentFrame();
  const uid = useUid();
  const spin = Math.max(0, t - 2) / 9; // one look every 9 frames
  const turn = Math.sin(spin * Math.PI);
  const flip = Math.floor(spin) % 2 === 1;
  const slide = -120 + t * 6;
  const orbit = Math.sin(t / 14) * 40;
  return (
    <Frame uid={uid} t={t} push={1.05} cx={480} cy={1300} dx={orbit}>
      <Night uid={uid} frame={t} moon={[260 + orbit * 0.3, 430, 48]} ground={1140} slide={slide} gap={[9999, 9999]} />
      <path d="M-200 1920L-200 1140H1300V1920Z" fill={C.ilNight} />
      <StuckCar uid={uid} frame={t} x={800} y={1310} len={360} tilt={8} />
      <Man uid={uid} frame={t} x={470} y={1400} size={540} pose="phoneLook" phone face="worried" turn={turn * 0.9} flip={flip} />
      {/* a near pine sweeps past in the foreground, clear of the car */}
      <path d={pine(1330 - slide * 0.5, 1920, 1300, 460)} fill={C.ilNight} />
    </Frame>
  );
};

// ---- S5: the phone again, shaking: the bars drop, the map goes, a loader -------------------------------------------------
export const S5Bars: React.FC = () => {
  const t = useCurrentFrame();
  const uid = useUid();
  const bars = evs('bars').map((s) => fr(s) - fr(shot('s5').from));
  const dropped = bars.filter((x) => t >= x).length;
  const out = bars[bars.length - 1];
  const tiles = t < out ? 1 : t < out + 6 ? (Math.floor((t - out) / 2) % 2 === 0 ? 0.2 : 1) : 0;
  const loader = t >= out + 6 ? t - out - 6 : -1;
  const shake = Math.sin(t * 2.3) * 7 * (t < out + 10 ? 1 : 0.3);
  return (
    <Frame uid={uid} t={t} push={1.08 - 0.05 * clamp(t / 36)} cy={PHONE_FOOT}>
      <rect x={-300} y={-300} width={1680} height={2600} fill={`url(#${uid}sky)`} />
      <PhoneInHand uid={uid} frame={t} arrow={2} bars={4 - dropped} tiles={tiles} loader={loader} shake={shake} label={loader >= 0 ? 'RECALCULATING' : 'TURN LEFT'} />
    </Frame>
  );
};

// ---- S6: crash out to the sky: the forest from above, a tiny man and his car, the owl, two eyes in the dark ---------------
export const S6Top: React.FC = () => {
  const t = useCurrentFrame();
  const uid = useUid();
  // the crash out: from close to wide in a fast ease, then a slow drift
  const zoom = lerp(2.4, 1, E.outExpo(clamp(t / 10))) * (1 - 0.03 * clamp(t / 36));
  const sel = at('s6', 'select');
  const owlT = clamp((t - 8) / 14);
  const blink = t > 26 && t < 30;
  const view: [number, number, number, number] = [500 - 560 / zoom, 1000 - 1000 / zoom, 500 + 600 / zoom, 1000 + 960 / zoom];
  return (
    <Frame uid={uid} t={20} push={zoom} cx={500} cy={1000}>
      <ForestFloor uid={uid} frame={t + 90} view={view} />
      {t === sel || t === sel + 1 || t === sel + 3 ? <rect x={420} y={974} width={84} height={86} fill="none" stroke={C.accA} strokeWidth={4} strokeDasharray="10 7" /> : null}
      {/* the cow, waiting in the dark */}
      <circle cx={918} cy={1060} r={7} fill={C.il1} />
      <circle cx={962} cy={1060} r={7} fill={C.il1} />
      <Owl x={190} y={400} s={1.05} head={Math.round(owlT * 8) / 8} blink={blink} />
    </Frame>
  );
};

// ---- S7: the curse: three punch-ins on his face (the moon on it), the horn's burst bleeps it, crows burst out ------------
export const S7Curse: React.FC = () => {
  const t = useCurrentFrame();
  const uid = useUid();
  const punches = evs('punch').map((s) => fr(s) - fr(shot('s7').from));
  const honk = fr(ev('honk')) - fr(shot('s7').from);
  const k = (i: number) => E.out(clamp((t - punches[i]) / 4));
  const scale = 1 + 0.13 * k(1) + 0.13 * k(2);
  const sh = t >= honk && t < honk + 6 ? Math.sin((t - honk) * 2.6) * 14 * (1 - (t - honk) / 6) : 0;
  const crowT = at('s7', 'crows');
  const burst = t >= honk ? E.outBack(clamp((t - honk) / 6)) : 0;
  // the curse: the jaw works on the words, then the full shout under the horn
  const jaw = t >= honk ? 17 : 6 + 9 * (0.5 + 0.5 * Math.sin(t * 1.15));
  const nod = t >= honk ? -6 : -2 + 3 * Math.sin(t * 0.6);
  const birds: [number, number, number, number, number][] = [
    [160, 560, -12, -15, 0],
    [260, 470, -6, -18, 2],
    [930, 520, 12, -16, 1],
    [990, 640, 15, -10, 3],
    [820, 430, 6, -19, 4],
  ];
  return (
    <Frame uid={uid} t={t} push={scale} cx={590} cy={760} dx={sh} dy={-sh * 0.5}>
      <rect x={-300} y={-300} width={1680} height={2600} fill={`url(#${uid}sky)`} />
      <Stars frame={t + 330} n={40} area={[-100, -100, 1180, 900]} />
      <Moon uid={uid} x={210} y={300} r={64} />
      <path d={pine(120, 1500, 1200, 420)} fill={C.il6} opacity={0.8} />
      <path d={pine(980, 1440, 1150, 400)} fill={C.il7} />
      <CrowBurst t={t} from={crowT} birds={birds} s={1.1} />
      <ManBust x={622} y={650} s={5.8} flip ex={t >= honk ? BUST_EX.rage : BUST_EX.angry} jaw={jaw} nod={nod} />
      {burst > 0 ? <Burst x={312} y={884} r={158} k={burst} /> : null}
    </Frame>
  );
};

// ---- S8: low angle, arms up to the sky on the crest; the cow rises behind the crest, deadpan, chewing; then the black -------
export const S8Arms: React.FC = () => {
  const t = useCurrentFrame();
  const uid = useUid();
  const ena = at('s8', 'ena');
  const sh = t >= ena && t < ena + 5 ? Math.sin((t - ena) * 2.8) * 12 * (1 - (t - ena) / 5) : 0;
  const cowIn = at('s8', 'cowIn');
  const cowK = E.outBack(clamp((t - cowIn) / 9));
  const rise = 1 + 0.05 * E.inOut(clamp(t / durOf('s8')));
  const bob = 0;
  return (
    <Frame uid={uid} t={t} push={rise} cx={540} cy={1400} dx={sh} dy={sh * 0.4}>
      <rect x={-300} y={-300} width={1680} height={2600} fill={`url(#${uid}sky)`} />
      <Stars frame={t + 380} n={50} area={[-100, -100, 1180, 1000]} />
      <Moon uid={uid} x={560} y={560} r={150} />
      <path d={pine(40, 1560, 1300, 440)} fill={C.il6} opacity={0.85} transform="rotate(4 40 1560)" />
      <path d={pine(1060, 1560, 1340, 460)} fill={C.il6} opacity={0.85} transform="rotate(-4 1060 1560)" />
      {/* the cow behind the crest */}
      {t >= cowIn ? <Cow x={800} y={lerp(1640, 1200, cowK)} s={0.9} chew={t * 0.7} /> : null}
      {/* the crest: the ground he stands on, its grass catching the moon */}
      <path d="M-300 1400C80 1380 400 1372 700 1384C900 1392 1100 1400 1400 1396V2300H-300Z" fill={C.ilNight} />
      <path d="M-300 1400C80 1380 400 1372 700 1384C900 1392 1100 1400 1400 1396" stroke={C.il6} strokeWidth={4} fill="none" />
      {Array.from({length: 26}, (_, i) => {
        const x = -40 + i * 46 + jit(i, 3) * 20;
        const y = 1388 + Math.sin(i) * 4;
        return <path key={i} d={`M${x} ${y}l-8 -22M${x + 6} ${y}l2 -28M${x + 12} ${y}l10 -18`} stroke={C.ilNight} strokeWidth={4} strokeLinecap="round" />;
      })}
      <g transform={`translate(0 ${bob.toFixed(1)})`}>
        <Man uid={uid} frame={t} x={380} y={1394} size={1000} pose="armsUp" face={Math.floor(t / 3) % 2 === 0 ? 'shock' : 'angry'} idle={false} />
      </g>
    </Frame>
  );
};

/** the black between the forest and the reveal is drawn by the reveal itself (its first frames) */
export const Blank: React.FC = () => (
  <svg width={W} height={H}>
    <rect width={W} height={H} fill="#000" />
  </svg>
);

export {OpenHand};
