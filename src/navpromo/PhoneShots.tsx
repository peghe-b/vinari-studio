// The two phone beats in the film's middle, on the studio's real 3D iPhone (phones3d.tsx), whole on the white field with
// the WHOLE screen in it: STREET NAMES (19-nav-streets-offer: the sample card is tapped and slides out of the real screen to
// the side, its sentence (the subtitle already says it) turning into the speaker and a cobalt waveform of the voice itself,
// filling as Nelson reads it) and MANY SETTINGS (20-nav-streets-settings: a cobalt band walks the rows the voice names, each
// row lifts out as a card in turn and its switch is flipped: unpaved roads on, humour off, then „only the main" on; the
// crickets of the boring navigator chirp in cobalt beside its card).
// A real camera: a slow push to 1.12 over the shot, a slow vertical drift (the cards drift a little more: they are nearer),
// and between the cards the phone swings on the studio's spring, turning toward the side its card flies out to (+12 deg,
// -12 deg, then 0 for the last, which rises above the phone as the camera pulls back), so a card never covers the middle
// of the screen. One card in flight at a time; only one cobalt thing shows at a time; the phone's foot stays above the
// subtitle band (y 1440..1580); cards and phone stay whole inside the Reels crop and safe area (x 70..1025, y >= 250).
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {C, rgba} from '../tokens';
import {atFoot, cardRect, float, Lift, Phone3, Switch, TapRing, type Band, type Pose, type Rect, type Region} from './phones3d';
import {clamp, E, ev, fr, lerp, prog, shot, sp} from './lib';

const TAU = Math.PI * 2;
/** the studio's spring turn (critically damped: it never overshoots, so nothing swings out of the frame) */
const swing = (t: number, at: number) => sp(t, at, 110, 21);

/** the camera on the phone: x and yaw from the beat, the push over the shot, the drift; `read` 0..1 while a card is up;
 *  `shrink` a pull-back (1 none), anchored at the foot, to make room above the phone */
type Cam = {x: number; yaw: number; read: number; drift: number; shrink?: number};
const FOOT = 1398; // the foot's rest; with the drift (+-27) and the float's bob it stays above 1430
const camPose = (t: number, end: number, c: Cam): Pose => {
  const enter = swing(t, -10);
  const p = clamp(t / end);
  const push = 1 + 0.12 * (0.5 * p + 0.5 * E.sine(p));
  const fl = float(t);
  const w = 470 * lerp(0.92, 1, enter) * push * (1 - 0.03 * c.read) * (c.shrink ?? 1);
  const yaw = c.yaw + 12 * (1 - enter);
  const pitch = lerp(8, 3, enter) * (1 - 0.4 * c.read) + fl.pitch;
  const pose = atFoot({x: c.x, w, yaw, pitch, roll: fl.roll}, FOOT + c.drift);
  return {...pose, y: pose.y + fl.bob};
};
const entered = (t: number) => clamp(swing(t, -10) * 2);
/** the slow vertical drift (frame px); `phase` picks where it starts */
const driftOf = (t: number, phase: number) => 27 * Math.sin((TAU * t) / 200 + phase);
/** a card's place, drifting with the camera a little more than the phone (it floats nearer the lens) */
const drifted = (r: Rect, drift: number): Rect => ({...r, y: r.y + 1.35 * drift});

// ---- STREET NAMES ------------------------------------------------------------------------------------------------------------
const S19 = '19-nav-streets-offer';
const CARD19: Region = {x0: 0.05, y0: 0.4267, x1: 0.95, y1: 0.5166};
const SPEAKER = {x: 0.127, y: 0.4715};
/** the sample's quote and „შეეხე და მოისმინე" under it: covered by the waveform as the card lifts */
const TEXT: Region = {x0: 0.185, y0: 0.437, x1: 0.932, y1: 0.512};
const WAVE = {x0: 0.205, x1: 0.915, v: 0.4715, hMax: 0.05, hMin: 0.006};
/** the voice's loudness per film frame (RMS of public/vo/navpromo/clips/nelson-300m.wav and nelson-street.wav at 30 fps,
 *  jointly normalised): the waveform is the sample's own */
const ENV_300 = [0, 0.01, 0.09, 0.65, 0.84, 0.33, 0.65, 0.69, 0.6, 0.69, 0.79, 0.6, 0.42, 0.73, 0.45, 0.17, 0.73, 0.77, 0.34, 0.04, 0.36, 0.2, 0.26, 0.28, 0.37, 0.4, 0.74, 0.67, 0.75, 0.92, 0.77, 0.67, 0.68, 0.34, 0.11, 0.41, 0.69, 0.67, 0.97, 0.85, 0.78, 0.53, 0.47, 0.62, 0.81, 0.56, 0.34, 0.31, 0.17, 0.05, 0.36, 0.22, 0.09, 0.3, 0.28, 0.29, 0.13, 0.14, 0.06, 0.01, 0, 0, 0, 0];
const ENV_STREET = [0, 0.03, 0.32, 0.84, 0.92, 0.56, 0.49, 1, 0.45, 0.03, 0.19, 0.72, 0.87, 0.77, 0.43, 0.63, 0.7, 0.58, 0.62, 0.15, 0.34, 0.76, 0.63, 0.41, 0.47, 0.57, 0.34, 0.35, 0.48, 0.4, 0.63, 0.2, 0.34, 0.56, 0.4, 0.3, 0.28, 0.3, 0.42, 0.19, 0.13, 0.27, 0.31, 0.42, 0.37, 0.14, 0.09, 0.03, 0.01, 0, 0, 0, 0];
// the spoken frames of both clips, three to a bar
const SPOKEN = [...ENV_300.slice(2, 60), ...ENV_STREET.slice(2, 49)];
const PER = 3;
/** the bars start growing this many frames after the tap (the sentence is cleared by then) */
const BARS_AT = 8;
const BARS = Array.from({length: Math.ceil(SPOKEN.length / PER)}, (_, i) => Math.max(...SPOKEN.slice(i * PER, i * PER + PER)));
const envAt = (env: number[], i: number) => {
  if (i < 0 || i >= env.length - 1) return 0;
  const a = Math.floor(i);
  return lerp(env[a], env[a + 1], i - a);
};

export const Streets: React.FC = () => {
  const t = useCurrentFrame();
  const from = shot('streets').from;
  const base = fr(from);
  const L = (n: string) => fr(ev(n)) - base;
  const tap = L('tap19');
  const c2 = L('cstreet');
  const end = fr(shot('streets').to) - base;
  // each clip's first sample sits 0.06 s before its first word (build/plan.py aclip): its frame 0 in the shot's frames
  const clipA = (ev('c300') - 0.06 - from) * 30;
  const clipB = (ev('cstreet') - 0.06 - from) * 30;

  // the card: tapped, it slides out of its row to the right while the phone steps left and turns toward it
  const k = sp(t, tap + 2, 150, 20);
  const read = clamp(k);
  const out = swing(t, tap); // the phone steps aside
  const second = swing(t, c2 - 3); // on the street's name the phone swings back toward the viewer
  const drift = driftOf(t, -1.2);
  const pose = camPose(t, end, {x: 540 - 190 * out + 26 * second, yaw: 5 + 7 * out - 9 * second, read, drift});
  // the card stays inside the Reels crop and its safe sides (x 70..1025), ends and shadow whole
  const to = drifted(cardRect(CARD19, 600, 410, 752), drift);

  // the waveform: the bars filled cobalt as far as the voice has read, the bar being read breathing with it
  const sA = t - clipA - 2;
  const sB = t - clipB - 2;
  const spoken = sB >= 0 ? 58 + Math.min(47, sB) : clamp(sA, 0, 58);
  const played = spoken / PER;
  const live = Math.max(envAt(ENV_300, t - clipA), envAt(ENV_STREET, t - clipB));
  // first the paper clears the sentence as the card leaves its row, then the bars grow on clean paper (never both at once:
  // no double image)
  const clear = E.inOut(prog(t, tap + 3, 5));
  const barsA = prog(t, tap + BARS_AT, 4);
  const barsGrow = prog(t, tap + BARS_AT, 16);
  const beat = Math.exp(-Math.max(0, t - c2) / 6) * clamp((t - c2 + 2) / 2); // a small bump on the second line
  return (
    <div style={{position: 'absolute', inset: 0, background: C.surface}}>
      <Phone3 src={S19} pose={pose} veil={0.22 * read} opacity={entered(t)} />
      <Lift src={S19} r={CARD19} pose={pose} to={to} k={k} show={t >= tap ? 1 : 0} radius={34} fog={0.22 * read * (1 - read)}>
        {({fx, fy, s}) => {
          const x0 = fx(WAVE.x0);
          const pitch = (fx(WAVE.x1) - x0) / BARS.length;
          const bw = pitch * 0.5;
          const cy = fy(WAVE.v);
          const hMax = fy(WAVE.v + WAVE.hMax) - cy;
          const hMin = fy(WAVE.v + WAVE.hMin) - cy;
          return (
            <>
              {/* the sentence leaves the card: the subtitle reads it, the card shows the voice */}
              <div style={{position: 'absolute', left: fx(TEXT.x0), top: fy(TEXT.y0), width: fx(TEXT.x1) - fx(TEXT.x0), height: fy(TEXT.y1) - fy(TEXT.y0), background: C.surface, opacity: clear}} />
              <svg width={fx(CARD19.x1)} height={fy(CARD19.y1)} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
                {BARS.map((b, i) => {
                  const grow = E.out(clamp(barsGrow * 1.8 - (i / BARS.length) * 0.8));
                  const fill = clamp(played - i);
                  const reading = fill > 0 && fill < 1 ? 0.8 + 0.45 * live : 1;
                  const h = Math.max(hMin, lerp(hMin, hMax, 0.12 + 0.88 * b ** 0.85) * grow * reading * (1 + 0.04 * beat));
                  const x = x0 + i * pitch + (pitch - bw) / 2;
                  return (
                    <g key={i} opacity={barsA}>
                      <rect x={x} y={cy - h / 2} width={bw} height={h} rx={bw / 2} fill={rgba(C.ink, 0.14)} />
                      {fill > 0 ? <rect x={x} y={cy - h / 2} width={bw} height={h} rx={bw / 2} fill={C.accA} opacity={fill} /> : null}
                    </g>
                  );
                })}
              </svg>
              <TapRing x={fx(SPEAKER.x)} y={fy(SPEAKER.y)} k={prog(t, tap, 16)} s={s} />
            </>
          );
        }}
      </Lift>
    </div>
  );
};

// ---- MANY SETTINGS -------------------------------------------------------------------------------------------------------------
const S20 = '20-nav-streets-settings';
// the rows, measured on the capture (1080 x 2346): the group cards run x 54..1026
const MAIN: Region = {x0: 0.05, y0: 584 / 2346, x1: 0.95, y1: 816 / 2346};
const HUMOUR: Region = {x0: 0.05, y0: 1110 / 2346, x1: 0.95, y1: 1343 / 2346};
const UNPAVED: Region = {x0: 0.05, y0: 1964 / 2346, x1: 0.95, y1: 2112 / 2346};
// the switches (centre, track 138 x 86 capture px)
const SW_X = 925 / 1080;
const SW_MAIN = 699.5 / 2346;
const SW_HUMOUR = 1227 / 2346;
const SW_UNPAVED = 2038 / 2346;
const SW_H = 86 / 2346;
const bandOf = (r: Region): Band => ({x: r.x0 + 0.008, y: r.y0 + 0.003, w: r.x1 - r.x0 - 0.016, h: r.y1 - r.y0 - 0.006, a: 1});
const mixBand = (a: Band, b: Band, k: number): Band => ({x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), w: lerp(a.w, b.w, k), h: lerp(a.h, b.h, k), a: 1});
// the cards' widths: the two side cards, and the last one rising above the phone (which pulls back to make room)
const CW_SIDE = 620;
const CW_TOP = 740;
/** a switch's height on a card of width `cw` (card px at full size) */
const swH = (cw: number) => SW_H * 2346 * (cw / ((UNPAVED.x1 - UNPAVED.x0) * 1080));
/** the phone's step aside for a side card (frame px) */
const STEP = 190;

export const Settings: React.FC = () => {
  const t = useCurrentFrame();
  const base = fr(shot('settings').from);
  const L = (n: string) => fr(ev(n)) - base;
  const n6a = L('n6a');
  const scroll = L('scroll');
  const n6b = L('n6b');
  const gam = L('gamorte');
  const main = L('mainOnly');
  const cricket = L('cricket');
  const end = fr(shot('settings').to) - base;

  // the cards: each lifts out of its row, its switch is flipped, and it settles back onto the screen, where it stays
  // (lying exactly on the turned screen, under the same veil) so the phone now shows the new setting. One card in flight
  // at a time: each lands before the phone takes its next step, and the band reaches the next row before its card lifts
  const kU = sp(t, n6a + 4, 150, 20) * (1 - clamp(sp(t, scroll - 9, 260, 32)));
  const kH = sp(t, n6b + 1, 150, 20) * (1 - clamp(sp(t, gam + 7, 260, 32)));
  const kM = sp(t, main + 6, 150, 20);
  const read = clamp(Math.max(kU, kH, kM));

  // the camera: the phone steps left and turns right for the unpaved card (it flies out to the right), crosses to the right
  // turning left for the humour card (out to the left), and comes back to the middle, facing the viewer, for the last card,
  // which rises above it
  const s1 = swing(t, n6a + 1);
  // (each step starts once the card before it has landed back on the screen, and carries the next card out)
  const s2 = swing(t, scroll + 1);
  const s3 = swing(t, main + 3);
  const x = 540 - STEP * s1 + 2 * STEP * s2 - STEP * s3;
  const yaw = 4 + 8 * s1 - 24 * s2 + 12 * s3;
  const drift = driftOf(t, -3.49);
  // for the last card the camera pulls back (the foot stays put, so the phone's top drops) and the card rises into the room
  // made above it, below the Reels safe top (y 250), never under the platform's top bar
  const pose = camPose(t, end, {x, yaw, read, drift, shrink: 1 - 0.2 * clamp(kM)});
  // the side cards end inside the Reels crop and safe sides (x 70..1025): their round ends and shadows stay whole
  const toU = drifted(cardRect(UNPAVED, CW_SIDE, 1010 - CW_SIDE, 1012), drift);
  const toH = drifted(cardRect(HUMOUR, CW_SIDE, 70, 676), drift);
  const toM = drifted(cardRect(MAIN, CW_TOP, 540 - CW_TOP / 2, 258), drift);

  // the phone's cobalt band walks the rows the voice names; it is off while the switch ring on the humour card is on
  const bU = bandOf(UNPAVED);
  const bH = bandOf(HUMOUR);
  const bM = bandOf(MAIN);
  const pos = mixBand(mixBand(bU, bH, E.inOut(prog(t, scroll - 3, 9))), bM, E.inOut(prog(t, gam + 2, 12)));
  // (it comes back on the main row once the humour card has landed, and leads its card out)
  const bandA = t < main - 6 ? prog(t, n6a, 8) * (1 - prog(t, gam - 6, 6)) : prog(t, main + 2, 8) * (1 - prog(t, cricket - 10, 6));
  const band: Band = {...pos, a: bandA};
  const veil = 0.26 * clamp(Math.max(prog(t, n6a, 10), read));
  // a card lying on the screen takes the veil, unless it sits in the band's clear box
  const fogOf = (r: Region, k: number) => {
    const dy = Math.abs(pos.y + pos.h / 2 - (r.y0 + r.y1) / 2);
    return veil * (1 - clamp(k)) * clamp(dy / (r.y1 - r.y0));
  };

  // the switches: unpaved roads on, humour off („გამორთე."), only the main on
  const tapU = n6a + 14;
  const tapM = main + 15;
  // the cobalt ring round the humour switch (its only tap mark), gone before the card sinks back
  const ringA = prog(t, gam, 3) * (1 - prog(t, gam + 3, 4));
  // the crickets: two chirps of cobalt arcs off the „only the main" card's right end
  const chirp = (at: number) => (t >= at && t < at + 9 ? Math.sin((Math.PI * (t - at)) / 9) : 0);
  const ch = Math.max(chirp(cricket), chirp(cricket + 7));

  return (
    <div style={{position: 'absolute', inset: 0, background: C.surface}}>
      <Phone3 src={S20} pose={pose} veil={veil} band={band} opacity={entered(t)} />
      <Lift src={S20} r={UNPAVED} pose={pose} to={toU} k={kU} show={t >= n6a + 4 ? 1 : 0} radius={48} fog={fogOf(UNPAVED, kU)}>
        {({fx, fy, s}) => (
          <>
            {t >= tapU ? <Switch cx={fx(SW_X)} cy={fy(SW_UNPAVED)} h={swH(CW_SIDE) * s} on={E.inOut(prog(t, tapU + 1, 6))} /> : null}
            <TapRing x={fx(SW_X)} y={fy(SW_UNPAVED)} k={prog(t, tapU, 16)} s={s} />
          </>
        )}
      </Lift>
      <Lift src={S20} r={HUMOUR} pose={pose} to={toH} k={kH} show={t >= n6b + 1 ? 1 : 0} radius={48} fog={fogOf(HUMOUR, kH)}>
        {({fx, fy, s}) => {
          const h = swH(CW_SIDE) * s;
          const sw = h * (138 / 86);
          return (
            <>
              {t >= gam ? <Switch cx={fx(SW_X)} cy={fy(SW_HUMOUR)} h={h} on={1 - E.inOut(prog(t, gam + 1, 6))} /> : null}
              {ringA > 0 ? (
                <div
                  style={{
                    position: 'absolute',
                    left: fx(SW_X) - sw / 2 - 10 * s,
                    top: fy(SW_HUMOUR) - h / 2 - 10 * s,
                    width: sw + 20 * s,
                    height: h + 20 * s,
                    borderRadius: h / 2 + 10 * s,
                    border: `${4 * s}px solid ${C.accA}`,
                    opacity: ringA,
                    transform: `scale(${0.94 + 0.06 * ringA})`,
                  }}
                />
              ) : null}
            </>
          );
        }}
      </Lift>
      <Lift src={S20} r={MAIN} pose={pose} to={toM} k={kM} show={t >= main + 6 ? 1 : 0} radius={48} fog={fogOf(MAIN, kM)}>
        {({fx, fy, s}) => (
          <>
            {t >= tapM ? <Switch cx={fx(SW_X)} cy={fy(SW_MAIN)} h={swH(CW_TOP) * s} on={E.inOut(prog(t, tapM + 1, 6))} /> : null}
            <TapRing x={fx(SW_X)} y={fy(SW_MAIN)} k={prog(t, tapM, 16)} s={s} />
          </>
        )}
      </Lift>
      {ch > 0 ? (
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <g transform={`translate(${toM.x + toM.w + 22} ${toM.y + toM.h * 0.42})`} fill="none" stroke={C.accA} strokeWidth={5} strokeLinecap="round" opacity={ch}>
            {[16, 30, 44].map((r, i) => {
              const a = (40 * Math.PI) / 180;
              const rr = r * (0.85 + 0.15 * ch);
              return <path key={r} d={`M${rr * Math.cos(-a)} ${rr * Math.sin(-a)} A${rr} ${rr} 0 0 1 ${rr * Math.cos(a)} ${rr * Math.sin(a)}`} opacity={clamp(ch * 1.6 - i * 0.3)} />;
            })}
          </g>
        </svg>
      ) : null}
    </div>
  );
};
