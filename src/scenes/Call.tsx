// src/scenes/Call.tsx: an incoming call (illustrated, the "Graphite" kit). The owner's own example: mom calling is a phone
// RINGING with "დედა" on it, never a text card.
//
// Stagings:
//   hand     (default) a hand holds the phone, centred: it rises into place, buzzes in bursts, rings ripple out from it
//   desk     the phone face up on a table at a slant, buzzing and walking across it (a mug and keys beside it)
//   mount    in a dashboard mount, the driver's view: the road streams by beyond the windshield
//   pocket   a jeans pocket close-up: the phone sticks out of it, its glow through the fabric, the buzz shakes the denim
//   missed   the lock screen fills with missed-call rows (avatar, name, time) and a count badge lands
// Props: name* (<= 3 words: the caller, an identity label), label (<= 2, mono, default "მობილური"), avatar (a Figure
//   preset, "initial" or "none"; default from the name: დედა -> mom, მამა / ბაბუა -> grandpa, ხელოსანი -> mechanic,
//   else the initial), outcome {is: answer | decline | ignore, at}, count (missed: a real count only), where (the place
//   behind: station | road | room | garage | street | city | none), time, word, camera, seed.
// Frame 0: ringing (a burst starts at frame 2). Tail: it keeps ringing, or the call timer runs.
// Sounds: real-phone-buzz per burst (desk: real-phone-buzz-desk), asmr-screen on wake, asmr-tap + Haptic success /
//   error on the outcome, asmr-pop + Haptic light per missed row, <Land> for the badge.
import React, {useId} from 'react';
import {interpolate, spring, useCurrentFrame} from 'remotion';
import {mtav} from '../lib/format';
import {TXT} from '../lib/layer';
import {textWidth} from '../lib/measure';
import {C, F, SPRING, toneBig, type Tone} from '../tokens';
import type {SceneCtx} from '../types';
import {entrance, Haptic, Land, lead, Sfx, vary} from './common';
import {Backdrop, type BackdropKind} from './illo/backdrop';
import {Camera, Hud, Plane, type CamSpec} from './illo/cam';
import {Figure, useCastLook, type Preset} from './illo/figure';
import {CallScreen, Handset, HandGrip, buzz, type CallState, type Ring} from './illo/handset';
import {dark, mix, tone, type Time} from './illo/palette';
import {Cabin, Road, view} from './illo/road';
import {Solid, circ, gid, paint, rr} from './illo/solid';
import {at, clamp01, env, FOOT, IlloBand, n1, osc, stagingOf, Svg, timeOf, TOP} from './illo/scene';
import {Punch, wordOf} from './illo/type';

const STAGINGS = ['hand', 'desk', 'mount', 'pocket', 'missed'] as const;
type Staging = (typeof STAGINGS)[number];
type P = {
  staging?: Staging;
  name?: string;
  label?: string;
  avatar?: Preset | 'initial' | 'none';
  outcome?: {is?: 'answer' | 'decline' | 'ignore'; at?: number | string};
  count?: number;
  where?: string;
  time?: Time;
  word?: unknown;
  tone?: Tone;
  camera?: CamSpec;
  seed?: number;
};

const WHERE: Record<string, BackdropKind | null> = {station: 'station', road: 'highway', highway: 'highway', room: 'room', garage: 'garage', street: 'city', city: 'city', mountains: 'mountains', none: null};

/** The caller's face from the name (Georgian kin words), else null (the initial). */
export const avatarOf = (name: string, a: P['avatar']): Preset | null => {
  if (a === 'none' || a === 'initial') return null;
  if (a) return a;
  const n = name.trim();
  if (/^დედ/.test(n) || /^ბებ/.test(n)) return 'mom';
  if (/^მამ/.test(n) || /^ბაბ/.test(n)) return 'grandpa';
  if (/ხელოსან|მექანიკ/.test(n)) return 'mechanic';
  if (/ბოს|უფროს/.test(n)) return 'boss';
  if (/გოგო|ცოლ|შეყვარებ/.test(n)) return 'girl';
  if (/ძმაკაც|მეგობ|ბიჭ/.test(n)) return 'friend';
  if (/პოლიც|პატრულ/.test(n)) return 'officer';
  return null;
};

/** A Figure's head and shoulders in a circle of radius r at the origin (an avatar). */
export const AvatarHead: React.FC<{uid: string; preset: Preset; r: number; frame: number; face?: 'smile' | 'neutral' | 'worried'; bg?: number}> = ({uid, preset, r, frame, face = 'smile', bg = 5}) => {
  const id = gid(useId(), 'av');
  return (
    <g>
      <defs>
        <clipPath id={id}>
          <circle r={r} />
        </clipPath>
      </defs>
      <circle r={r} fill={tone(bg)} />
      <g clipPath={`url(#${id})`}>
        <Figure uid={uid} cast={preset} x={0} y={-r * 0.02} size={r * 6.3} crop="head" face={face} frame={frame} />
      </g>
    </g>
  );
};

export const Call: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const f = useCurrentFrame();
  const uid = useId();
  const sleeveT = useCastLook('me').tone; // the hand is the film's "me": its cuff in me's own top
  const staging = stagingOf(p, STAGINGS);
  const time = timeOf(p);
  const e = entrance(ctx);
  const base = lead(ctx);
  const name = (p.name ?? 'დედა').trim();
  const preset = avatarOf(name, p.avatar);
  const outIs = p.outcome?.is ?? 'ignore';
  const fOut = outIs !== 'ignore' && p.outcome?.at !== undefined ? Math.max(base + 12, at(ctx, p.outcome.at, Infinity)) : Infinity;
  const state: CallState = outIs === 'answer' ? 'answer' : outIs === 'decline' ? 'decline' : 'ringing';
  // ringing: a burst starts on frame 2 of the scene (frame 0 of the film when it opens it), every 30 frames
  const ring: Ring = {from: 2 - 30 * Math.ceil(Math.max(0, 2 - e) / 30), until: fOut};
  const word = wordOf(p.word, ctx, 1);
  const kicks = [fOut, word?.at ?? NaN];
  const where = WHERE[p.where ?? (staging === 'mount' ? 'road' : 'room')] ?? null;

  // the buzz sounds: one per burst inside the scene, from lead(ctx) on
  const bursts: number[] = [];
  if (staging !== 'missed') for (let b = ring.from; b < Math.min(ctx.dur, fOut); b += 30) if (b >= Math.max(0, base)) bursts.push(b);

  const avatarNode = (r: number) =>
    preset ? (
      <g transform={`scale(${(1 / r).toFixed(5)})`}>
        <AvatarHead uid={uid} preset={preset} r={r} frame={f} />
      </g>
    ) : undefined;
  const callScreen = (w: number, h: number) => <CallScreen w={w} h={h} frame={f} name={name} label={p.label ?? 'მობილური'} avatar={avatarNode(w * 0.17)} state={state} at={fOut} uid={uid} />;

  let picture: React.ReactNode = null;
  let camSpec: CamSpec = {move: 'push', amount: 0.035};
  if (staging === 'hand') {
    const k = spring({frame: f - e, fps: 30, config: SPRING.enterXL});
    const W = 480;
    const x = 540;
    const y = 900 + 130 * (1 - k);
    const tilt = interpolate(k, [0, 1], [-11, -4]);
    const lit = env(f, e + 2, 8);
    const thumb = fOut < Infinity && state === 'answer' ? clamp01((f - (fOut - 8)) / 8) * (1 - clamp01((f - fOut - 6) / 10)) : 0;
    const place = {x, y, w: W, tilt, frame: f, ring};
    camSpec = {move: 'push', amount: 0.04, origin: {x, y: 860}};
    picture = (
      <>
        {where ? (
          <Plane depth={0.6}>
            <Svg>
              <Backdrop kind={where} uid={uid} frame={f} time={time} opacity={0.8} />
            </Svg>
          </Plane>
        ) : null}
        <Plane depth={1}>
          <Svg>
            {/* the screen's light on the dark: a soft halo behind the phone */}
            <ellipse cx={x} cy={y - 40} rx={W * 0.95} ry={W * 1.25} fill={paint(uid, 'glow-ink')} opacity={(dark(time) ? 0.13 : 0.05) * lit} />
            <HandGrip uid={uid} part="back" {...place} time={time} sleeve={sleeveT} />
            <Handset uid={uid} {...place} lit={lit} time={time} screen={callScreen} />
          </Svg>
        </Plane>
        <Plane depth={1.04}>
          <Svg>
            <HandGrip uid={uid} part="front" {...place} time={time} sleeve={sleeveT} thumb={thumb} />
          </Svg>
        </Plane>
      </>
    );
  } else if (staging === 'desk') {
    picture = <Desk uid={uid} f={f} e={e} ring={ring} time={time} screen={callScreen} />;
    camSpec = {move: 'rise', travel: 28};
  } else if (staging === 'mount') {
    picture = <Mount uid={uid} f={f} e={e} ring={ring} time={time} screen={callScreen} where={where} />;
    camSpec = {move: 'push', amount: 0.03, origin: {x: 760, y: 900}, shake: 0.25};
  } else if (staging === 'pocket') {
    picture = <Pocket uid={uid} f={f} e={e} ring={ring} time={time} name={name} preset={preset} state={state} fOut={fOut} />;
    camSpec = {move: 'push', amount: 0.03, origin: {x: 560, y: 700}};
  } else {
    picture = <Missed uid={uid} f={f} e={e} base={base} time={time} name={name} preset={preset} count={p.count} dur={ctx.dur} />;
    camSpec = {move: 'push', amount: 0.035, origin: {x: 540, y: 820}};
  }

  return (
    <IlloBand uid={uid} time={time}>
      <Camera ctx={ctx} spec={camSpec} over={p.camera} kicks={kicks}>
        {picture}
        <Hud>
          <Punch word={word} slot={staging === 'hand' || staging === 'missed' ? 'top' : 'low'} plate />
        </Hud>
      </Camera>
      {bursts.map((b, i) => (
        <Sfx key={`bz${i}`} name={staging === 'desk' ? 'real-phone-buzz-desk' : 'real-phone-buzz'} at={b} volume={(staging === 'desk' ? 0.4 : staging === 'pocket' ? 0.36 : 0.45) * vary(i, 0.12)} />
      ))}
      {staging !== 'missed' && e + 2 >= base ? <Sfx name="asmr-screen" at={Math.max(0, e + 2)} volume={0.35} /> : null}
      {fOut < Infinity ? (
        <>
          <Sfx name="asmr-tap" at={fOut} volume={0.45} />
          <Haptic kind={state === 'answer' ? 'success' : 'error'} at={fOut} />
        </>
      ) : null}
    </IlloBand>
  );
};

// ---- desk: the phone face up on a table, buzzing its way across --------------------------------------------------------
const Desk: React.FC<{uid: string; f: number; e: number; ring: Ring; time: Time; screen: (w: number, h: number) => React.ReactNode}> = ({uid, f, e, ring, time, screen}) => {
  const dk = dark(time);
  // how far the buzz has walked it: 9 px and 1.8 degrees per burst, eased inside each burst
  const t = Math.max(0, f - ring.from);
  const n = Math.floor(t / 30);
  const q = clamp01((t % 30) / 10);
  const walked = Math.min(n + q, Math.max(0, (Math.min(f, ring.until ?? Infinity) - ring.from) / 30));
  const b = buzz(f, ring, 420);
  const k = spring({frame: f - e, fps: 30, config: SPRING.enter});
  const px = 500 + walked * 9;
  const tilt = -12 + walked * 1.8;
  const table = dk ? 6 : 2;
  const W = 400;
  return (
    <>
      <Plane depth={0.6}>
        <Svg>
          {/* the room behind the table: a wall, a window's light on it */}
          <rect x={-100} y={TOP} width={1280} height={800 - TOP} fill={dk ? mix(C.il7, C.bg, 0.4) : C.il1} />
          <path d={rr(620, 330, 300, 260, 12)} fill={dk ? C.il7 : C.il0} opacity={dk ? 1 : 0.9} />
          <path d={rr(632, 342, 134, 236, 6) + rr(774, 342, 134, 236, 6)} fill={dk ? mix(C.il6, C.il7, 0.4) : C.il0} />
        </Svg>
      </Plane>
      <Plane depth={0.9}>
        <div style={{position: 'absolute', inset: 0, perspective: '1500px', perspectiveOrigin: '540px 300px'}}>
          <div style={{position: 'absolute', inset: 0, transform: `rotateX(54deg) translateY(${n1(-40 + 40 * (1 - k))}px)`, transformOrigin: '540px 1200px'}}>
            <Svg>
              {/* the table top: its far edge with a lit lip, a sheen across it */}
              <Solid uid={uid} d={rr(-260, 260, 1600, 1900, 30)} tone={table} time={time} rim />
              <path d={rr(-260, 260, 1600, 14, 7)} fill={dk ? C.il4 : C.il0} opacity={0.8} />
              <path d={`M-260 ${820}L1340 ${640}L1340 ${760}L-260 ${940}Z`} fill={C.il0} opacity={dk ? 0.035 : 0.3} />
              {/* a mug seen from above */}
              <g transform="translate(150 820)">
                <circle r={124} fill={paint(uid, 'shade')} opacity={dk ? 0 : 0.6} transform="translate(18 26)" />
                <Solid uid={uid} d={circ(0, 0, 118)} tone={dk ? 2 : 0} shade="ball" time={time} rim outline />
                <path d={circ(0, 0, 84)} fill={dk ? '#000000' : C.il6} />
                <ellipse cx={-6} cy={-8} rx={64} ry={60} fill={dk ? C.il6 : C.il5} />
                <ellipse cx={-26} cy={-30} rx={24} ry={12} fill={C.il0} opacity={0.12} />
                <path d={rr(104, -30, 84, 60, 30) + rr(124, -12, 44, 24, 12)} fill={dk ? C.il3 : C.il1} fillRule="evenodd" />
              </g>
              {/* a car key fob */}
              <g transform="translate(900 1260) rotate(28)">
                <Solid uid={uid} d={rr(-50, -86, 100, 160, 42)} tone={6} time={time} rim outline />
                <circle cx={0} cy={-36} r={17} fill={tone(4)} />
                <circle cx={0} cy={16} r={17} fill={tone(4)} />
                <path d={`M-16 -114A28 28 0 1 1 16 -114L9 -88H-9Z`} fill="none" stroke={tone(3)} strokeWidth={10} />
              </g>
              <ellipse cx={px + 14} cy={1060 + 36} rx={W * 0.6} ry={W * 1.1} fill={paint(uid, 'shade')} opacity={dk ? 0 : 0.8} />
              <Handset uid={uid} x={px} y={1060} w={W} tilt={tilt} frame={f} ring={ring} lit={env(f, e + 2, 8)} time={time} screen={screen} />
              {b.env > 0 ? <ellipse cx={px} cy={1060} rx={W * 0.78} ry={W * 1.34} fill="none" stroke={dk ? C.il0 : C.il5} strokeWidth={3} opacity={0.14 * b.env} /> : null}
            </Svg>
          </div>
        </div>
      </Plane>
    </>
  );
};

// ---- mount: the driver's view, the phone in a dashboard mount ----------------------------------------------------------
const Mount: React.FC<{uid: string; f: number; e: number; ring: Ring; time: Time; screen: (w: number, h: number) => React.ReactNode; where: BackdropKind | null}> = ({uid, f, e, ring, time, screen, where}) => {
  const v = view({hy: 820, vx: 470, h: 1.3, fp: 1100});
  const d = f * 0.9; // 27 m/s: a highway
  const k = spring({frame: f - e, fps: 30, config: SPRING.enter});
  const W = 330;
  const x = 790;
  const y = 920 + 60 * (1 - k);
  const dk = dark(time);
  return (
    <>
      <Plane depth={0.6}>
        <Svg>
          {where ? <Backdrop kind={where === 'room' ? 'highway' : where} uid={uid} frame={f} time={time} base={v.hy} scroll={f * 1.2} /> : null}
          <Road v={v} d={d} time={time} uid={uid} beam={time === 'night' ? 1 : 0} />
        </Svg>
      </Plane>
      <Plane depth={1.3}>
        <Svg>
          <Cabin uid={uid} time={time} frame={f} turn={2 * osc(f, 70)} glow={dk ? 0.6 : 0} />
          {/* the mount: an arm from the dash and a cradle that grips the phone's sides */}
          <path d={`M${x - 20} 1180L${x - 8} ${n1(y + W)}H${x + 8}L${x + 20} 1180Z`} fill={tone(6)} />
          <Solid uid={uid} d={rr(x - 46, y + W * 0.86, 92, 56, 20)} tone={6} time={time} rim />
          <ellipse cx={x} cy={y} rx={W * 0.9} ry={W * 1.2} fill={paint(uid, 'glow-ink')} opacity={dk ? 0.12 : 0.04} />
          <Handset uid={uid} x={x} y={y} w={W} tilt={3} frame={f} ring={ring} lit={env(f, e + 2, 8)} time={time} screen={screen} />
          <Solid uid={uid} d={rr(x - W / 2 - 22, y - 30, 26, 120, 10) + rr(x + W / 2 - 4, y - 30, 26, 120, 10)} tone={5} time={time} rim outline />
        </Svg>
      </Plane>
    </>
  );
};

// ---- pocket: the phone sticking out of a jeans pocket -------------------------------------------------------------------
const Pocket: React.FC<{uid: string; f: number; e: number; ring: Ring; time: Time; name: string; preset: Preset | null; state: CallState; fOut: number}> = ({uid, f, e, ring, time, name, preset, state, fOut}) => {
  const dk = dark(time);
  const b = buzz(f, ring, 620);
  const shake = b.env;
  const W = 470;
  const px = 660 + b.dx * 1.4;
  const py = 1000 + b.dy; // the phone's centre: only its top end sticks out of the pocket
  const tilt = -22 + b.rot * 1.6;
  const lit = env(f, e + 2, 8) * (state === 'decline' && f >= fOut ? 1 - clamp01((f - fOut - 6) / 10) : 1);
  const jeans = dk ? 5 : 4;
  const stitch = dk ? 2.4 : 1.2;
  const id = gid(useId(), 'pk');
  // the pocket's mouth: from the waistband down to the side seam; under it the front panel covers the phone
  const j = shake * 3;
  const mouth = `M250 ${n1(500 + j)}C330 ${n1(760 + j)} 640 ${n1(880 + j)} 1000 ${n1(880 + j)}`;
  const panel = `${mouth}L1200 880L1200 ${FOOT}L-120 ${FOOT}L-120 500Z`;
  const avatar = (r: number) =>
    preset ? <AvatarHead uid={uid} preset={preset} r={r} frame={f} /> : (
      <g>
        <circle r={r} fill={tone(5)} />
        <text className={TXT} y={r * 0.36} textAnchor="middle" fontFamily={F.sans} fontWeight={600} fontSize={r} fill={C.il0}>
          {mtav(Array.from(name)[0] ?? '')}
        </text>
      </g>
    );
  const pocketScreen = (w: number, h: number) => {
    const s0 = w * 0.16;
    const size = Math.min(s0, (s0 * w * 0.56) / Math.max(1, textWidth(mtav(name), `600 ${s0}px ${F.sans}`)));
    return (
      <g>
        <rect width={w} height={h} fill={C.screen} />
        <ellipse cx={w / 2} cy={h * 0.14} rx={w * 0.8} ry={h * 0.16} fill={paint(uid, 'glow-ink')} opacity={dk ? 0.12 : 0.06} />
        <g transform={`translate(${n1(w * 0.2)} ${n1(h * 0.15)}) scale(${(1 + 0.04 * Math.max(0, osc(f, 30))).toFixed(3)})`}>{avatar(w * 0.13)}</g>
        <text className={TXT} x={w * 0.38} y={h * 0.15} fontFamily={F.sans} fontWeight={600} fontSize={size} fill={C.ink}>
          {mtav(name)}
        </text>
        <text className={TXT} x={w * 0.38} y={h * 0.15 + w * 0.09} fontFamily={F.mono} fontSize={w * 0.055} letterSpacing={w * 0.004} fill={C.ink2}>
          {state === 'answer' && f >= fOut ? `00:0${Math.max(0, Math.floor((f - fOut) / 30))}` : mtav('მობილური')}
        </text>
      </g>
    );
  };
  const stitchLine = (d: string, dy: number, k = 0) => <path key={`${dy}${k}`} d={d} fill="none" stroke={tone(stitch)} strokeWidth={3.2} strokeDasharray="13 9" strokeLinecap="round" transform={`translate(0 ${dy})`} opacity={0.75} />;
  return (
    <>
      <Plane depth={0.85}>
        <Svg>
          {/* the thigh in denim: the waistband with a belt through its loops, the fly's J stitch, the side seam */}
          {/* above the waistband: the shirt's hem, up to the frame's top (full bleed) */}
          <Solid uid={uid} d={`M-120 ${TOP}H1200V330H-120Z`} tone={dk ? 6.5 : 2.5} time={time} />
          <Solid uid={uid} d={`M-120 300H1200V${FOOT}H-120Z`} tone={jeans} time={time} />
          <path d={`M-120 300H1200V500C800 520 300 520 -120 500Z`} fill={tone(jeans + 0.5)} />
          {stitchLine(`M-120 492C300 512 800 512 1200 492`, 0)}
          <Solid uid={uid} d={`M-120 352H1200V432C800 446 300 446 -120 432Z`} tone={dk ? 7 : 6} time={time} rim />
          <path d={`M-120 370H1200`} stroke={tone(dk ? 6 : 5)} strokeWidth={2} />
          <Solid uid={uid} d={rr(560, 330, 56, 150, 10)} tone={jeans + 0.3} time={time} rim />
          {stitchLine(`M572 344V466`, 0, 1)}
          {stitchLine(`M604 344V466`, 0, 2)}
          <Solid uid={uid} d={circ(110, 470, 26)} tone={dk ? 2 : 1} shade="ball" time={time} rim outline />
          {stitchLine(`M60 520V1060C60 1200 160 1260 230 1180`, 0, 3)}
          <path d={`M1020 500C1040 800 1060 1100 1080 1500L1090 ${FOOT}`} fill="none" stroke={tone(jeans + 1.2)} strokeWidth={8} />
          {stitchLine(`M1000 500C1020 800 1040 1100 1060 1500L1070 ${FOOT}`, 0, 4)}
          {/* inside the pocket: the dark lining behind the phone */}
          <path d={`${mouth}L1000 780C700 740 420 640 250 500Z`} fill={tone(jeans + 2)} />
          <defs>
            <clipPath id={id}>
              <path d={`${mouth}L1000 -200L-200 -200L-200 ${n1(500 + j)}Z`} />
            </clipPath>
          </defs>
          <g clipPath={`url(#${id})`}>
            {[0, 1].map((i) => {
              const tt = f - ring.from - Math.floor((f - ring.from) / 30) * 30 - i * 6;
              if (tt < 0 || tt > 24 || f < ring.from || f >= (ring.until ?? Infinity)) return null;
              const s = 1 + 0.35 * (tt / 24);
              return <path key={i} d={rr(-W / 2, -W, W, W * 2.05, W * 0.14)} transform={`translate(${n1(px)} ${n1(py)}) rotate(${n1(tilt)}) scale(${s.toFixed(3)})`} fill="none" stroke={dk ? C.il0 : C.il6} strokeWidth={3} opacity={0.5 * (1 - tt / 24)} />;
            })}
            <Handset uid={uid} x={px} y={py} w={W} tilt={tilt} frame={f} lit={lit} time={time} screen={pocketScreen} ghost={false} />
          </g>
        </Svg>
      </Plane>
      <Plane depth={0.85}>
        <Svg>
          {/* the front panel over the phone: it shakes with the buzz; the phone's glow comes through it */}
          <g transform={`translate(${n1(b.dx * 0.4)} ${n1(shake * 1.5)})`}>
            <Solid uid={uid} d={panel} tone={jeans} time={time} rim />
            <path d={rr(px - W * 0.75, 830, W * 1.2, 560, 120)} transform={`rotate(${n1(tilt)} ${px} 1000)`} fill={tone(jeans - 0.6)} opacity={0.45} />
            <ellipse cx={px - 60} cy={1060} rx={W * 0.7} ry={260} fill={paint(uid, 'glow-ink')} opacity={(dk ? 0.16 : 0.08) * lit} />
            <path d={mouth} fill="none" stroke={tone(jeans + 1.6)} strokeWidth={7} />
            {stitchLine(mouth, 20, 5)}
            {stitchLine(mouth, 34, 6)}
            <Solid uid={uid} d={circ(262, 524, 15)} tone={dk ? 2 : 1} shade="ball" time={time} rim outline />
          </g>
        </Svg>
      </Plane>
    </>
  );
};

// ---- missed: the lock screen fills with missed calls ---------------------------------------------------------------------
const Missed: React.FC<{uid: string; f: number; e: number; base: number; time: Time; name: string; preset: Preset | null; count?: number; dur: number}> = ({uid, f, e, base, time, name, preset, count, dur}) => {
  const dk = dark(time);
  const n = Math.max(1, Math.min(4, Math.round(count ?? 3)));
  const total = Math.max(n, Math.round(count ?? n));
  const k = spring({frame: f - e, fps: 30, config: SPRING.enterXL});
  const W = 690;
  const x = 540;
  const y = 1090 + 80 * (1 - k);
  const row0 = Math.max(e + 12, base + 8);
  const rowAt = (i: number) => row0 + i * 8;
  const badgeAt = rowAt(n - 1) + 10;
  const red = toneBig('down');
  const screen = (w: number, h: number) => {
    const rowH = w * 0.215;
    return (
      <g>
        <rect width={w} height={h} fill={C.screen} />
        <ellipse cx={w / 2} cy={h * 0.22} rx={w * 0.9} ry={h * 0.25} fill={paint(uid, 'glow-ink')} opacity={dk ? 0.08 : 0.04} />
        <text className={TXT} x={w / 2} y={h * 0.215} textAnchor="middle" fontFamily={F.sans} fontWeight={600} fontSize={w * 0.25} letterSpacing={-w * 0.004} fill={C.ink}>
          9:41
        </text>
        {Array.from({length: n}, (_, i) => {
          const t = spring({frame: f - rowAt(i), fps: 30, config: SPRING.land});
          if (f < rowAt(i)) return null;
          const ry = h * 0.27 + i * (rowH + w * 0.025);
          return (
            <g key={i} transform={`translate(0 ${n1((1 - t) * -40)})`} opacity={clamp01((f - rowAt(i)) / 3)}>
              <path d={rr(w * 0.05, ry, w * 0.9, rowH, w * 0.06)} fill={mix(C.screen, C.ink, dk ? 0.1 : 0.06)} />
              <g transform={`translate(${n1(w * 0.05 + rowH * 0.5)} ${n1(ry + rowH / 2)})`}>
                {preset ? <AvatarHead uid={uid} preset={preset} r={rowH * 0.32} frame={f} face="worried" /> : <circle r={rowH * 0.32} fill={tone(5)} />}
              </g>
              <text className={TXT} x={w * 0.05 + rowH * 0.95} y={ry + rowH * 0.47} fontFamily={F.sans} fontWeight={600} fontSize={w * 0.075} fill={C.ink}>
                {mtav(name)}
              </text>
              {/* a missed-call glyph: an arrow bouncing off a line, in the accent */}
              <path d={`M${w * 0.05 + rowH * 0.95} ${ry + rowH * 0.64}l${w * 0.03} ${w * 0.036}l${w * 0.024} ${-w * 0.03}l${w * 0.024} ${w * 0.03}`} fill="none" stroke={red} strokeWidth={w * 0.011} strokeLinecap="round" strokeLinejoin="round" />
              <text className={TXT} x={w * 0.9} y={ry + rowH * 0.47} textAnchor="end" fontFamily={F.mono} fontSize={w * 0.05} fill={C.ink2}>
                {`9:${String(12 + i * 7).padStart(2, '0')}`}
              </text>
            </g>
          );
        })}
      </g>
    );
  };
  const kb = spring({frame: f - badgeAt, fps: 30, config: {mass: 1, stiffness: 520, damping: 22}});
  return (
    <>
      <Plane depth={1}>
        <Svg>
          <ellipse cx={x} cy={y} rx={W * 0.95} ry={W * 1.4} fill={paint(uid, 'glow-ink')} opacity={dk ? 0.1 : 0.04} />
          <Handset uid={uid} x={x} y={y} w={W} tilt={-2 + osc(f, 90) * 0.6} frame={f} lit={env(f, e, 8)} time={time} screen={screen} />
          {f >= badgeAt ? (
            <g transform={`translate(${x + W * 0.36} ${y - W * 0.7}) scale(${kb.toFixed(3)})`}>
              <circle r={64} fill={red} />
              <text className={TXT} y={25} textAnchor="middle" fontFamily={F.sans} fontWeight={700} fontSize={72} fill={C.onInk}>
                {String(total)}
              </text>
            </g>
          ) : null}
        </Svg>
      </Plane>
      {Array.from({length: n}, (_, i) =>
        rowAt(i) >= Math.max(0, base) && rowAt(i) < dur ? (
          <React.Fragment key={i}>
            <Sfx name="asmr-pop" at={rowAt(i)} volume={0.32 * vary(i, 0.2)} />
            <Haptic kind="light" at={rowAt(i)} />
          </React.Fragment>
        ) : null,
      )}
      {badgeAt >= 0 && badgeAt < dur ? <Land at={badgeAt} volume={0.45} /> : null}
    </>
  );
};
