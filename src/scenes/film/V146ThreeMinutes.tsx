// V146ThreeMinutes: the last minutes of a 24-hour race seen straight from above. A wide grey track runs up the frame,
// kerbs and mown grass streaming down its sides; the leader (the film's accent) holds the middle while a white race clock
// card under the meta bar counts down the final minutes. Shots of ONE moment:
//   lead   the leader alone at speed, the clock ticking
//   clock  the camera closer on the clock card, the leader under it
//   pack   the leader with a grey chaser behind, both at speed
//   stop   the track slows to a halt, the chequered line slides into view ahead, the leader drifts aside and stops
//          short of it, smoke from its tail, hazards on; the clock keeps running
//   pass   the leader parked by the kerb, the grey car rolls up past it and over the chequered line (hitAt)
// The track is road all the way down through the subtitle band: no markings, no car there (the cars stay over stage 1380).
import React, {useId} from 'react';
import {Haptic, Land, lead, Sfx} from '../common';
import {F, L} from '../../tokens';
import {prog} from '../../lib/anim';
import {CameraLayer, Hud, useKick} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import {TXT} from '../../lib/layer';
import type {SceneCtx} from '../../types';
import {Car} from '../illo/car';
import {Smoke, SpeedLines} from '../illo/fx';
import {tone} from '../illo/palette';
import {IlloBand, TOP, FOOT} from '../illo/scene';
import {Card, useShot, INK} from '../kit/stage';
import {E} from '../kit/lib';

type P = {
  shot?: 'lead' | 'clock' | 'pack' | 'stop' | 'pass';
  hitAt?: number | string;
  line?: string;
  from?: number; // the clock's first reading, in seconds left
};

const TL = 124; // the track's edges (stage x): the kerbs sit outside the subtitle's 170..855
const TR = 956;
const KW = 30;
const STRIPE = 160; // a mown grass stripe
const KERB = 48;
const LEN = 440; // the cars' length (top view)

const mmss = (s: number) => {
  const v = Math.max(0, Math.floor(s));
  const m = Math.floor(v / 60);
  const r = v % 60;
  return `${m}:${r < 10 ? '0' : ''}${r}`;
};

/** The ground: grass in mown stripes, the kerbs and the asphalt, scrolled by `off` stage px (the cars' speed). */
const Track: React.FC<{off: number; finish?: number}> = ({off, finish}) => {
  const grassA = tone(1.6);
  const grassB = tone(2.3);
  const asphalt = tone(5.4);
  const out: React.ReactNode[] = [];
  const o = ((off % (STRIPE * 2)) + STRIPE * 2) % (STRIPE * 2);
  for (let i = -2; i < 16; i++) {
    const y = TOP + i * STRIPE + o - STRIPE * 2;
    out.push(<rect key={`g${i}`} x={-80} y={y} width={1240} height={STRIPE} fill={i % 2 === 0 ? grassA : grassB} />);
  }
  const ko = ((off % (KERB * 2)) + KERB * 2) % (KERB * 2);
  const kerbs: React.ReactNode[] = [];
  for (let i = -2; i < 50; i++) {
    const y = TOP + i * KERB + ko - KERB * 2;
    const c = i % 2 === 0 ? tone(0) : tone(6.2);
    kerbs.push(<rect key={`l${i}`} x={TL - KW} y={y} width={KW} height={KERB} fill={c} />);
    kerbs.push(<rect key={`r${i}`} x={TR} y={y} width={KW} height={KERB} fill={c} />);
  }
  const sq = 46;
  const cheq: React.ReactNode[] = [];
  if (finish !== undefined) {
    const n = Math.ceil((TR - TL) / sq);
    for (let r = 0; r < 2; r++) {
      for (let i = 0; i < n; i++) {
        const w = Math.min(sq, TR - TL - i * sq);
        cheq.push(<rect key={`c${r}-${i}`} x={TL + i * sq} y={finish + r * sq} width={w} height={sq} fill={(i + r) % 2 === 0 ? tone(0) : tone(7)} />);
      }
    }
  }
  return (
    <g>
      {out}
      <rect x={TL} y={TOP} width={TR - TL} height={FOOT - TOP} fill={asphalt} />
      {/* a soft racing line worn darker down the middle */}
      <rect x={360} y={TOP} width={360} height={FOOT - TOP} fill={tone(5.9)} opacity={0.5} />
      {kerbs}
      {cheq}
    </g>
  );
};

/** The race clock: a white card under the meta bar, mono digits counting down. */
const Clock: React.FC<{secs: number; k: number; big?: boolean; dim?: number}> = ({secs, k, big = false, dim = 1}) => {
  const w = big ? 520 : 380;
  const h = big ? 210 : 150;
  const size = big ? 150 : 104;
  return (
    <Card x={540 - w / 2} y={big ? 420 : 400} w={w} h={h} k={k} r={big ? 48 : 36}>
      <div className={TXT} style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', font: `600 ${size}px ${F.mono}`, color: INK, opacity: dim, letterSpacing: -2}}>
        {mmss(secs)}
      </div>
    </Card>
  );
};

export const V146ThreeMinutes: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, len, at} = useShot(ctx);
  const base = lead(ctx);
  const shot = p.shot ?? 'lead';
  const kick = useKick();
  const hit = Math.max(base + 10, at(p.hitAt, Math.round(len * 0.5)));
  const start = p.from ?? 180;
  const secs = start - t / 30;
  const cardK = shot === 'lead' ? 1 : E.out(prog(t, 0, 10));

  // the speed of the world under the cars (stage px a frame); `stop` decays it to zero by the hit
  const v0 = 34;
  let off = v0 * t;
  let stopK = 0;
  if (shot === 'stop') {
    const d = Math.max(12, hit);
    // integrate a linear fall of speed from v0 to 0 over [0, d]
    const tt = Math.min(t, d);
    off = v0 * (tt - (tt * tt) / (2 * d));
    stopK = prog(t, 0, d, E.inOut);
  }
  if (shot === 'pass') off = 0;
  const moving = shot === 'lead' || shot === 'clock' || shot === 'pack';
  const wob = (s: number) => 6 * Math.sin(t / 11 + s);

  // the chequered line: far ahead in `stop`, sliding down as the track slows; fixed in `pass`
  const finish = shot === 'stop' ? -260 + 840 * stopK : shot === 'pass' ? 470 : undefined;

  // the leader
  let hx = 540 + wob(0);
  let hy = 990;
  let hd = 0;
  if (shot === 'pack') hy = 800;
  if (shot === 'clock') hy = 1010;
  if (shot === 'stop') {
    hx = 540 - 150 * stopK;
    hy = 980;
    hd = -8 * Math.sin(Math.PI * stopK);
  }
  if (shot === 'pass') {
    hx = 390;
    hy = 980;
  }
  const smokeOn = shot === 'stop' ? Math.max(base, hit - 30) : shot === 'pass' ? -1e4 : 1e9;

  // the chaser (grey): behind in `pack`, rolling past in `pass`
  const passK = prog(t, 0, Math.max(hit + 26, 30), E.out);
  const passY = 1130 - (1130 - 360) * passK;
  const showChaser = shot === 'pack' || shot === 'pass';
  const cx = shot === 'pack' ? 700 + wob(2) : 700;
  const cy = shot === 'pack' ? 1150 + 14 * Math.sin(t / 17) : passY;

  return (
    <IlloBand uid={uid} time="day">
        <CameraLayer depth={1}>
          <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
            <Track off={off} finish={finish} />
            {showChaser ? <Car uid={`${uid}c`} view="top" body="racer" x={cx} y={cy} len={LEN} heading={shot === 'pass' ? -3 * (1 - passK) : 0} frame={t} paint={2} speed={shot === 'pass' ? 0.8 * (1 - passK) : 1} /> : null}
            <Car uid={`${uid}h`} view="top" body="racer" x={hx} y={hy} len={LEN} heading={hd} frame={t} paint="a" number={5} speed={moving ? 1 : shot === 'stop' ? 1 - stopK : 0} lights={{brake: shot === 'stop' ? stopK : 0, hazard: shot === 'stop' ? prog(t, hit, 6) : shot === 'pass' ? 1 : 0}} />
            <Smoke frame={t} x={hx} y={hy + LEN / 2 - 30} kind="smoke" n={7} size={0.9} rise={-0.55} spread={1.2} at={smokeOn} uid={`${uid}s`} />
          </svg>
        </CameraLayer>
        {moving ? (
          <CameraLayer depth={1.3}>
            <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
              <SpeedLines frame={t} box={{x: 180, y: 420, w: 720, h: 860}} speed={1.2} dir={1} opacity={0.5} />
            </svg>
          </CameraLayer>
        ) : null}
        <Hud>
          {shot !== 'pass' ? <Clock secs={secs} k={cardK} big={shot === 'clock'} dim={shot === 'stop' ? 1 - 0.35 * prog(t, hit, 12) : 1} /> : null}
          {p.line ? (
            <div style={{position: 'absolute', left: L.camSafe.left, top: shot === 'pass' ? 640 : 600, whiteSpace: 'nowrap', transform: `scale(${(1 + 0.04 * kick).toFixed(4)})`}}>
              <Words text={p.line} at={hit} fx="slam" size={96} color={INK} />
            </div>
          ) : null}
        </Hud>
        {moving ? <Sfx name="asmr-air-long" at={base} volume={0.22} /> : null}
        {shot !== 'pass'
          ? [1, 2, 3, 4].map((i) => <Sfx key={i} name="asmr-tick-fine" at={Math.max(base, Math.round(30 * (start % 1) + 30 * (i - 1)))} volume={0.18} />)
          : null}
        {shot === 'stop' || shot === 'pass' ? <Land at={hit} /> : null}
        {shot === 'pass' ? <Sfx name="asmr-air-long" at={Math.max(base, hit - 14)} volume={0.26} /> : null}
        {shot === 'stop' || shot === 'pass' ? <Haptic kind="rigid" at={hit + 2} volume={0.3} /> : null}
    </IlloBand>
  );
};
