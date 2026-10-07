// src/illo-kit/demos.tsx: the illustration kit's parts on their own, for tools/illo-gallery.mjs --kit (stills in both
// looks and contact sheets). Not part of the studio bundle: its own entry point (src/illo-kit/index.ts), so a film or
// the cloud never sees it. Each demo draws in stage units (1080 x 1920) inside the Stage, like a scene.
// Later phases add their parts here (figures, cars, the handset) before their scenes exist.
import React from 'react';
import {C, toneBig} from '../tokens';
import {Backdrop, BACKDROPS, Plate, type BackdropKind} from '../scenes/illo/backdrop';
import {Burst, Confetti, Drops, Dust, FaceFx, Notes, Petals, Rain, Rings, Shockwave, Smoke, Snow, Sparks, SpeedLines, type FaceFxKind} from '../scenes/illo/fx';
import {Icon, REACTIONS, SIGNS, THOUGHTS, WARNING_LIGHTS} from '../scenes/illo/icons';
import {far, ground, tone, type Time} from '../scenes/illo/palette';
import {capsule, circ, Glint, rr, Shadow, smooth, Solid, star} from '../scenes/illo/solid';
import {FIGURE_DEMOS} from './demos-figure';
import {CAR_DEMOS} from './demos-car';
import {CAST_DEMOS} from './demos-cast';

export type Demo = {
  id: string;
  group: string; // one contact sheet per group: its demos are the rows
  row: string;
  frames: number[]; // the frames the gallery stills
  band?: boolean; // clip to the picture band (L.graphicsTop .. L.graphicsBottom), like a scene's PictureBand
  render: (f: number, uid: string) => React.ReactNode;
};

const svg = (children: React.ReactNode) => (
  <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
    {children}
  </svg>
);
/** A small gallery-only caption (never in a film). */
const cap = (x: number, y: number, s: string, anchor: 'start' | 'middle' = 'middle') => (
  <text x={x} y={y} textAnchor={anchor} fontFamily="VinariMono, monospace" fontSize={20} fill={C.ink2}>
    {s}
  </text>
);

const TIMES: Time[] = ['day', 'night', 'dusk'];

const backdropDemos: Demo[] = BACKDROPS.flatMap((kind: BackdropKind) =>
  TIMES.map((time) => ({
    id: `backdrop-${kind}-${time}`,
    group: `backdrop-${kind}`,
    row: time,
    frames: [0, 120],
    band: true,
    render: (f: number, uid: string) =>
      svg(
        <>
          <Plate time={time} />
          <Backdrop kind={kind} uid={uid} frame={f} time={time} scroll={f * 9} />
        </>,
      ),
  })),
);

const primitives: Demo = {
  id: 'primitives',
  group: 'primitives',
  row: 'solid',
  frames: [0, 16, 46],
  render: (f, uid) =>
    svg(
      <>
        {cap(120, 440, 'soft 0..7  (rim on dark, outline on paper)', 'start')}
        {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => (
          <Solid key={n} uid={uid} d={rr(120 + n * 106, 470, 90, 120, 18)} tone={n} rim outline />
        ))}
        {cap(120, 650, 'ball 0..7', 'start')}
        {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => (
          <Solid key={n} uid={uid} d={circ(165 + n * 106, 730, 46)} tone={n} shade="ball" rim outline />
        ))}
        {cap(120, 830, 'skin soft, skin ball, feature, glass, accent', 'start')}
        <Solid uid={uid} d={rr(120, 860, 120, 120, 24)} tone="skin" rim outline />
        <Solid uid={uid} d={circ(330, 920, 60)} tone="skin" shade="ball" rim outline />
        <Solid uid={uid} d={rr(420, 860, 120, 120, 24)} tone="feature" shade="flat" rim outline />
        <Solid uid={uid} d={rr(570, 860, 120, 120, 24)} tone="glass" shade="flat" rim outline />
        <Solid uid={uid} d={rr(720, 860, 100, 120, 24)} fill={toneBig('down')} outline />
        <Solid uid={uid} d={rr(840, 860, 100, 120, 24)} fill={toneBig('up')} outline />
        {cap(120, 1040, 'cut: parts over parts, limbs (capsule), contact shadow, glint', 'start')}
        <Shadow uid={uid} cx={250} cy={1290} rx={150} />
        <Solid uid={uid} d={rr(130, 1080, 240, 200, 40)} tone={4} rim outline />
        <Solid uid={uid} d={rr(200, 1130, 210, 120, 30)} tone={2} rim outline cut />
        <Solid uid={uid} d={capsule(520, 1090, 26, 600, 1260, 18)} tone={5} rim outline />
        <Solid uid={uid} d={capsule(600, 1100, 22, 690, 1200, 16)} tone={3} rim outline cut />
        <Shadow uid={uid} cx={850} cy={1290} rx={90} />
        <Solid uid={uid} d={circ(850, 1200, 80)} tone={3} shade="ball" rim outline />
        <Glint x={815} y={1160} at={6} frame={f} size={44} />
        <Glint x={880} y={1230} at={28} frame={f} size={30} />
        <path d={`M120 1290H960`} stroke={C.rule} strokeWidth={1.5} />
        {cap(120, 1350, 'blob (smooth), star', 'start')}
        <Solid uid={uid} d={smooth([[420, 1330], [500, 1310], [560, 1350], [520, 1380], [440, 1375]], true)} tone={4} rim outline />
        <Solid uid={uid} d={star(700, 1350, 40, 28, 14, 0, 0.28, 3)} tone={1} rim outline />
      </>,
    ),
};

const iconRows: [string, readonly string[]][] = [
  ['warning lights', WARNING_LIGHTS],
  ['reactions', REACTIONS],
  ['thoughts', THOUGHTS],
  ['signs', SIGNS],
];
const icons: Demo = {
  id: 'icons',
  group: 'icons',
  row: 'all',
  frames: [0],
  render: () => {
    const cells: React.ReactNode[] = [];
    let y = 430;
    iconRows.forEach(([name, list]) => {
      cells.push(<React.Fragment key={name}>{cap(120, y, name, 'start')}</React.Fragment>);
      y += 30;
      list.forEach((ic, i) => {
        const col = i % 6;
        if (i && col === 0) y += 150;
        const x = 175 + col * 146;
        cells.push(<Icon key={`${name}${ic}`} name={ic} x={x} y={y + 60} size={104} color={name === 'warning lights' ? toneBig('down') : C.ink} />);
        cells.push(<React.Fragment key={`${name}${ic}c`}>{cap(x, y + 140, ic)}</React.Fragment>);
      });
      y += 190;
    });
    return svg(<>{cells}</>);
  },
};

const fxWeather: Demo = {
  id: 'fx-weather',
  group: 'fx',
  row: 'weather',
  frames: [8, 30, 60],
  band: true,
  render: (f, uid) => {
    const wipe = 40;
    const ang = (q: number) => -70 + 80 * Math.min(1, Math.max(0, (q % wipe) / 14)); // the wiper's arm angle
    const age = (x: number, y: number) => {
      // frames since the arm last swept over (x, y): the arm pivots at (540, 1400), sweeps every 40 frames
      const a = (Math.atan2(x - 540, 1400 - y) * 180) / Math.PI;
      for (let back = 0; back < 120; back++) {
        const q = f - back;
        if (q < 0) return Infinity;
        const prev = ang(q - 1);
        const now = ang(q);
        if ((a >= Math.min(prev, now) && a <= Math.max(prev, now)) || Math.abs(a - now) < 3) return back;
      }
      return Infinity;
    };
    const armA = ang(f);
    return svg(
      <>
        <Plate time="night" />
        {cap(140, 410, 'rain (night, ground splashes)', 'start')}
        <Rain frame={f} time="night" box={{x: 0, y: 370, w: 1080, h: 330}} ground={700} />
        <path d="M0 700H1080" stroke={far(0, 'night')} strokeWidth={3} />
        {cap(140, 740, 'snow', 'start')}
        <Snow frame={f} time="night" box={{x: 0, y: 710, w: 1080, h: 320}} />
        <path d={rr(60, 1040, 960, 340, 0)} fill={C.ilGlass} />
        {cap(140, 1075, 'drops on glass, a wiper clears them', 'start')}
        <Drops frame={f} box={{x: 60, y: 1050, w: 960, h: 320}} age={age} n={50} />
        <g transform={`rotate(${armA.toFixed(1)} 540 1400)`}>
          <path d={rr(536, 1060, 8, 340, 4)} fill={tone(6)} />
          <path d={rr(530, 1070, 20, 300, 6)} fill={tone(7)} />
        </g>
        <circle cx={540} cy={1400} r={2} fill={uid ? C.il3 : C.il3} />
      </>,
    );
  },
};

const fxBurst: Demo = {
  id: 'fx-burst',
  group: 'fx',
  row: 'burst',
  frames: [8, 16, 30, 60],
  band: true,
  render: (f, uid) =>
    svg(
      <>
        {cap(140, 410, 'burst + shockwave (at 4)', 'start')}
        <Shockwave frame={f} x={540} y={620} r={420} at={4} />
        <Burst frame={f} x={540} y={620} r={190} at={4} uid={uid} tone={0} />
        {cap(140, 860, 'sparks (bursts at 6, 26, 46)', 'start')}
        <Sparks frame={f} x={300} y={1000} at={[6, 26, 46]} uid={uid} dir={-60} />
        {cap(620, 860, 'rings (period 30)', 'start')}
        <path d={rr(700, 900, 160, 300, 30)} fill={tone(6)} />
        <Rings frame={f} x={780} y={1050} w={160} h={300} r={30} at={2} period={30} />
        {cap(140, 1180, 'confetti (at 10, 20 % accent)', 'start')}
        <Confetti frame={f} x={150} y={1360} at={10} dir={-65} tone="up" />
        <Confetti frame={f} x={930} y={1360} at={10} dir={-115} tone="up" seed={9} />
      </>,
    ),
};

const fxFlow: Demo = {
  id: 'fx-flow',
  group: 'fx',
  row: 'flow',
  frames: [10, 40, 80],
  band: true,
  render: (f, uid) =>
    svg(
      <>
        {cap(140, 410, 'notes in (left), out of a wallet (right)', 'start')}
        <Notes frame={f} box={{x: 40, y: 380, w: 460, h: 420}} n={8} uid={uid} />
        <path d={rr(700, 720, 200, 110, 18)} fill={tone(5)} />
        <Notes frame={f} from={{x: 800, y: 740}} at={4} direction="out" n={6} size={100} uid={uid} />
        {cap(140, 870, 'steam, smoke', 'start')}
        <Smoke frame={f} x={260} y={1130} kind="steam" uid={uid} />
        <Smoke frame={f} x={520} y={1130} kind="smoke" uid={uid} />
        {cap(640, 870, 'petals from a point (at 4)', 'start')}
        <Petals frame={f} from={{x: 820, y: 920}} at={4} uid={uid} />
        {cap(140, 1170, 'speed lines, dust in a light cone', 'start')}
        <SpeedLines frame={f} box={{x: 0, y: 1190, w: 600, h: 180}} />
        <path d="M820 1180L760 1380H880Z" fill={C.il0} opacity={0.06} />
        <Dust frame={f} cone={{x: 820, top: 1180, bottom: 1380, w0: 30, w1: 260}} time="night" n={36} />
      </>,
    ),
};

const FACE_FX: FaceFxKind[] = ['sweat', 'shock', 'tear', 'sparkle', 'zap', 'hearts', 'question', 'idea', 'zzz'];
const fxFace: Demo = {
  id: 'fx-face',
  group: 'fx',
  row: 'face',
  frames: [6, 20, 40],
  render: (f, uid) =>
    svg(
      <>
        {FACE_FX.map((k, i) => {
          const x = 240 + (i % 3) * 300;
          const y = 620 + Math.floor(i / 3) * 300;
          return (
            <g key={k}>
              <Solid uid={uid} d={circ(x, y, 56)} tone="skin" shade="ball" rim outline />
              <FaceFx kind={k} frame={f} x={x} y={y - 10} size={120} at={2} uid={uid} tone={k === 'hearts' ? 'down' : k === 'zap' ? 'down' : undefined} />
              {cap(x, y + 110, k)}
            </g>
          );
        })}
        {cap(540, 470, 'character effects (anchored at a head; the grey ball is only an anchor)')}
      </>,
    ),
};

// a guide to the ground tones: the far plane's steps on each look and time (k = 0 .. 1), the plate
const groundDemo: Demo = {
  id: 'grounds',
  group: 'primitives',
  row: 'grounds',
  frames: [0],
  render: () =>
    svg(
      <>
        {TIMES.map((t, r) => (
          <g key={t}>
            <rect x={60} y={420 + r * 300} width={960} height={260} fill={ground(t)} />
            {[0, 0.25, 0.5, 0.75, 1].map((k, i) => (
              <rect key={i} x={100 + i * 180} y={470 + r * 300} width={150} height={160} rx={14} fill={far(k, t)} />
            ))}
            {cap(100, 455 + r * 300, `${t}: far(0 .. 1) on its ground`, 'start')}
          </g>
        ))}
      </>,
    ),
};

export const DEMOS: Demo[] = [primitives, groundDemo, icons, fxWeather, fxBurst, fxFlow, fxFace, ...backdropDemos, ...FIGURE_DEMOS, ...CAST_DEMOS, ...CAR_DEMOS];
