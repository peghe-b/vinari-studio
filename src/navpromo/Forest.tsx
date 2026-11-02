// ACT 1, the forest: a dark, deliberately cheap MS-Paint night (the storyboard's reading of „გეფაიკებად"). Animation on
// twos with a three-tracing line boil, cheap stepped pushes, hard cuts. Eight shots, each its own component.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {boilOf, Boom, C1, CowHead, Crow, CrudeCar, CrudeCarTop, CrudeFace, CrudeMan, CrudePhone, Line, Moon, Owl, Pine, PineTop, Shape, Stars} from './crude';
import {clamp, ev, evs, fr, hash, lerp, shot, sp, type Pt} from './lib';

const W = 1080;
const H = 1920;
/** an event (s) as a frame of this shot */
const at = (id: string, name: string) => fr(ev(name)) - fr(shot(id).from);

const Night: React.FC<{children: React.ReactNode; push?: number; cx?: number; cy?: number; dx?: number; dy?: number}> = ({children, push = 1, cx = 540, cy = 1000, dx = 0, dy = 0}) => (
  <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
    <rect x={0} y={0} width={W} height={H} fill={C1.night} />
    <g transform={`translate(${cx + dx} ${cy + dy}) scale(${push}) translate(${-cx} ${-cy})`}>{children}</g>
  </svg>
);

const groundPts = (y: number, seed = 1): Pt[] => {
  const pts: Pt[] = [[-60, 2100]];
  for (let i = 0; i <= 12; i++) pts.push([-60 + i * 100, y + hash(i, seed) * 18]);
  pts.push([1140, 2100]);
  return pts;
};

/** the stamped forest: the SAME pine seven times, slightly misaligned */
const STAMPS: [number, number, number][] = [
  [560, 1090, 0.7],
  [430, 1110, 0.8],
  [700, 1120, 0.85],
  [250, 1140, 0.95],
  [880, 1160, 1.1],
  [90, 1185, 1.25],
  [1010, 1195, 1.3],
];
const Forest7: React.FC<{boil: number; dx?: number}> = ({boil, dx = 0}) => (
  <g>
    {STAMPS.map(([x, y, s], i) => (
      <Pine key={i} x={x + dx * s + hash(i, 9) * 6} y={y + hash(i, 10) * 5} s={s} boil={boil} />
    ))}
  </g>
);

// ---- S1: the wide: the stuck car, the man with his phone up ----------------------------------------------------------------
export const S1Wide: React.FC = () => {
  const t = useCurrentFrame();
  const b = boilOf(t);
  const dur = fr(shot('s1').to) - fr(shot('s1').from);
  const step = Math.floor(t / 2) * 2;
  const push = 1 + 0.08 * clamp(step / dur);
  const hazard = Math.floor(t / 8) % 2 === 0;
  return (
    <Night push={push} cx={420} cy={1180}>
      <Stars boil={b} />
      <Moon cx={245} cy={415} r={85} boil={b} />
      <Forest7 boil={b} />
      <Shape pts={groundPts(1235)} fill={C1.ground} boil={b} seed={201} sw={5} />
      {/* the mud ditch the car sits in, nose down */}
      <Shape pts={[[560, 1300], [700, 1268], [900, 1290], [960, 1360], [890, 1430], [640, 1440], [540, 1390]]} fill={C1.mud2} boil={b} seed={202} sw={5} />
      <CrudeCar x={712} y={1376} s={0.66} rot={0.17} boil={b} hazard={hazard} />
      <Shape pts={[[700, 1330], [860, 1318], [990, 1352], [940, 1420], [760, 1430], [680, 1392]]} fill={C1.mud} boil={b} seed={203} sw={5} />
      {/* splashes */}
      <Shape pts={[[650, 1300], [672, 1262], [690, 1306]]} fill={C1.mud} boil={b} seed={204} sw={3} />
      <Shape pts={[[960, 1330], [990, 1296], [1000, 1340]]} fill={C1.mud} boil={b} seed={205} sw={3} />
      <CrudeMan x={300} y={1445} h={480} facing={1} arms="phoneUp" boil={b} />
    </Night>
  );
};

// ---- S2: his face, squinting at the phone; a red MS-Paint '?' -------------------------------------------------------------
export const S2Face: React.FC = () => {
  const t = useCurrentFrame();
  const b = boilOf(t);
  const q = at('s2', 'qmark');
  const pop = sp(t, q, 260, 12);
  return (
    <Night>
      <Stars boil={b} n={10} area={[40, 120, 1040, 500]} />
      {/* the phone he holds up, glowing at the top right */}
      <circle cx={880} cy={300} r={170} fill="#CFE6FF" opacity={0.16} />
      <g transform="rotate(14 880 300)">
        <Shape pts={[[820, 190], [940, 190], [940, 420], [820, 420]]} fill="#DDEBFF" boil={b} seed={211} sw={7} />
      </g>
      <Shape pts={[[900, 420], [1000, 400], [1100, 760], [960, 820]]} fill={C1.jacket} boil={b} seed={212} sw={7} />
      <CrudeFace cx={490} cy={900} s={1.55} boil={b} mode="squint" look={1} />
      {t >= q ? (
        <text x={860} y={820} fontFamily="FiraGO, sans-serif" fontWeight={800} fontSize={300} fill={C1.red} stroke={C1.black} strokeWidth={6} transform={`rotate(-12 860 720) translate(860 720) scale(${pop}) translate(-860 -720)`} textAnchor="middle">
          ?
        </text>
      ) : null}
    </Night>
  );
};

// ---- S3: the crude foreign phone: the fat arrow flips right, up, left -------------------------------------------------------
export const S3Phone: React.FC = () => {
  const t = useCurrentFrame();
  const b = boilOf(t);
  const a1 = at('s3', 'arrow1');
  const a2 = at('s3', 'arrow2');
  const arrow = t < a1 ? 0 : t < a2 ? 1 : 2;
  return (
    <Night>
      <Stars boil={b} n={8} area={[40, 120, 1040, 380]} />
      <CrudePhone x={540} y={870} w={430} boil={b} arrow={arrow} />
    </Night>
  );
};

// ---- S4: the paper-doll spin; the stamped forest slides the wrong way --------------------------------------------------------
const SPIN = [0, 1, 2, 3, 4, 5, 0, 1, 2, 3];
export const S4Spin: React.FC = () => {
  const t = useCurrentFrame();
  const b = boilOf(t);
  const k = Math.floor(Math.max(0, t - 2) / 2);
  const facing = SPIN[Math.min(SPIN.length - 1, k)];
  const slide = Math.floor(t / 2) * 7; // broken parallax: the trees run with him
  const wob = Math.floor(t / 2) * 0.9;
  return (
    <Night>
      <Stars boil={b} />
      <g transform={`translate(${Math.sin(wob) * 10} ${Math.cos(wob * 1.3) * 8})`}>
        <Moon cx={250} cy={420} r={85} boil={b} wob={wob} />
      </g>
      <Forest7 boil={b} dx={-90 + slide} />
      <Shape pts={groundPts(1235, 3)} fill={C1.ground} boil={b} seed={221} sw={5} />
      <Shape pts={[[740, 1330], [900, 1300], [1060, 1330], [1080, 1420], [780, 1430]]} fill={C1.mud2} boil={b} seed={222} sw={5} />
      <CrudeCar x={910} y={1400} s={0.5} rot={0.17} boil={b} hazard={Math.floor(t / 8) % 2 === 0} />
      <Shape pts={[[820, 1370], [1000, 1360], [1090, 1400], [880, 1430]]} fill={C1.mud} boil={b} seed={223} sw={5} />
      <CrudeMan x={460} y={1450} h={540} facing={facing} arms="phoneUp" boil={b} />
    </Night>
  );
};

// ---- S5: the phone again, shaking: the bars drop, the map blinks out, a loader --------------------------------------------
export const S5Bars: React.FC = () => {
  const t = useCurrentFrame();
  const b = boilOf(t);
  const bars = evs('bars').map((s) => fr(s) - fr(shot('s5').from));
  const dropped = bars.filter((x) => t >= x).length;
  const out = bars[bars.length - 1];
  const tiles = t < out ? 1 : t < out + 6 ? (Math.floor((t - out) / 2) % 2 === 0 ? 0 : 1) : 0;
  const loader = t >= out + 6 ? Math.floor((t - out - 6) / 7) : -1;
  return (
    <Night>
      <Stars boil={b} n={8} area={[40, 120, 1040, 380]} />
      <CrudePhone x={540} y={870} w={430} boil={b} arrow={2} bars={4 - dropped} tiles={tiles} loader={loader} shakeX={hash(Math.floor(t / 2), 5) * 12} />
    </Night>
  );
};

// ---- S6: crash out to the top: a sea of the same pine, a tiny man, the selection box, the cow's eyes, the owl ----------------
const TOPS: [number, number][] = [];
for (let r = 0; r < 25; r++) {
  for (let c = 0; c < 14; c++) {
    const x = c * 80 + (r % 2) * 40 + hash(r, c) * 6;
    const y = r * 78 + hash(c, r) * 6;
    // the clearing around the car and the man, the cow's dark gap
    const dx = x - 520;
    const dy = y - 1000;
    if (dx * dx * 0.7 + dy * dy < 150 * 150) continue;
    if (x > 860 && x < 1010 && y > 990 && y < 1130) continue;
    TOPS.push([x, y]);
  }
}
export const S6Top: React.FC = () => {
  const t = useCurrentFrame();
  const b = boilOf(t);
  const zoom = t < 2 ? 2.3 : t < 4 ? 1.6 : 1;
  const sel = at('s6', 'select');
  const owlT = clamp((t - 8) / 14);
  const blink = t > 26 && t < 30;
  return (
    <Night push={zoom} cx={500} cy={1000}>
      <rect x={-200} y={-200} width={1480} height={2400} fill="#0F1A10" />
      {TOPS.map(([x, y], i) => (
        <PineTop key={i} x={x} y={y} r={33} boil={b} />
      ))}
      <Shape pts={[[430, 950], [560, 920], [650, 960], [640, 1060], [520, 1090], [420, 1050]]} fill={C1.mud} boil={b} seed={231} sw={4} />
      <CrudeCarTop x={565} y={995} s={0.55} rot={0.35} boil={b} />
      {/* the man: a tiny dot with a cap */}
      <Shape pts={[[452, 1010], [474, 1004], [478, 1024], [456, 1030]]} fill={C1.cap} boil={b} seed={232} sw={3} amp={1} />
      <circle cx={465} cy={1017} r={5} fill={C1.skin} />
      {t === sel || t === sel + 1 ? (
        <rect x={430} y={978} width={78} height={76} fill="none" stroke={C1.white} strokeWidth={3} strokeDasharray="8 6" />
      ) : null}
      {/* the cow, waiting in the dark: two eyes at the right edge */}
      <rect x={870} y={1000} width={130} height={120} fill="#050605" />
      <circle cx={918} cy={1060} r={9} fill="#F4F0C8" />
      <circle cx={962} cy={1060} r={9} fill="#F4F0C8" />
      <circle cx={918} cy={1060} r={4} fill="#000" />
      <circle cx={962} cy={1060} r={4} fill="#000" />
      <Owl x={180} y={360} s={1.1} boil={b} head={Math.floor(owlT * 6) / 6} blink={blink} />
    </Night>
  );
};

// ---- S7: the curse: three jerky punch-ins, the horn's star over his mouth, crows ---------------------------------------------
export const S7Curse: React.FC = () => {
  const t = useCurrentFrame();
  const b = boilOf(t);
  const punches = evs('punch').map((s) => fr(s) - fr(shot('s7').from));
  const honkS = ev('honk');
  const honk = honkS === null ? 999 : fr(honkS) - fr(shot('s7').from);
  const scale = t >= punches[2] ? 1.3 : t >= punches[1] ? 1.15 : 1;
  const mouth: 0 | 1 = t < honk && Math.floor(t / 2) % 2 === 0 ? 1 : 0;
  const sh = t >= honk && t < honk + 2 ? (t - honk === 0 ? 16 : -12) : 0;
  const crowT = at('s7', 'crows');
  return (
    // the punch-ins grow up from y 1450, so the chin and the horn's star stay above the subtitle line (from 980 the 1.3 push
    // put the white line on his skin and on the yellow star)
    <Night push={scale} cx={540} cy={1450} dx={sh} dy={-sh * 0.5}>
      <Stars boil={b} n={12} area={[40, 80, 1040, 600]} />
      <Pine x={90} y={760} s={1.6} boil={b} />
      <Pine x={1000} y={700} s={1.5} boil={b} />
      {[0, 1, 2].map((i) => {
        const k = t - crowT - i * 2;
        if (k < 0) return null;
        const x = [120, 980, 930][i] + [-1, 1, 0.6][i] * k * 14;
        const y = [380, 340, 420][i] - k * 16;
        return <Crow key={i} x={x} y={y} s={0.9} boil={b} flap={Math.floor(k / 2)} />;
      })}
      <CrudeFace cx={540} cy={820} s={1.85} boil={b} mode="shout" mouth={mouth} />
      {t >= honk ? <Boom x={540} y={1155} r={190} boil={b} /> : null}
    </Night>
  );
};

// ---- S8: low angle, arms up to the sky; the cow slides in, deadpan; hard cut to black ----------------------------------------
export const S8Arms: React.FC = () => {
  const t = useCurrentFrame();
  const b = boilOf(t);
  const ena = at('s8', 'ena');
  const sh = t === ena || t === ena + 1 ? (t === ena ? 14 : -10) : 0;
  const cowIn = at('s8', 'cowIn');
  const cowX = t < cowIn ? 1400 : lerp(1400, 900, clamp(Math.floor((t - cowIn) / 2) / 3));
  const mouth: 0 | 1 = Math.floor(t / 2) % 2 === 0 ? 1 : 0;
  return (
    <Night dx={sh} dy={sh * 0.4}>
      <Stars boil={b} />
      {/* the moon behind his head: its lower left hides behind the cap (a halo round the whole head read as burning hair) */}
      <Moon cx={660} cy={520} r={175} boil={b} />
      <Pine x={70} y={1500} s={2.1} boil={b} />
      <Pine x={1030} y={1520} s={2.2} boil={b} />
      <Shape pts={groundPts(1700, 5)} fill={C1.ground} boil={b} seed={241} sw={5} />
      <CrudeMan x={540} y={1840} h={1180} facing={0} arms="armsUp" boil={b} mouth={mouth} />
      <CowHead x={cowX} y={1240} s={1.15} boil={b} chew={Math.floor(t / 2) * 1.3} />
    </Night>
  );
};

/** the black between the forest and the reveal is drawn by the reveal itself (its first frames) */
export const Blank: React.FC = () => <svg width={W} height={H}><rect width={W} height={H} fill="#000" /></svg>;
export {Line};
