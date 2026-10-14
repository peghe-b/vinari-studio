// src/scenes/PhoneDesk.tsx: the real 3D iPhone lying on a surface, seen from above, its lock screen lit by 1 to 3 real
// iOS banners (the QR promo's push shot, 2026-10-14, made a library scene on 2026-10-15: the owner, "give the studio more
// power so it creates graphics like the promos"). From film SCENES_UP_FROM on (src/lib/device.mjs).
//
// The phone is the Phone scene's own 3D body (./three/posed.tsx over ./three/phone3d.tsx), the lock screen and banners
// iOS's (./three/lock.tsx). Asleep (black glass) until the first banner wakes it; each banner arrives with one short buzz
// of the whole phone on the surface, the newest on top pushing the older ones down; the camera pushes in slowly the whole
// shot. The phone stays WHOLE in the frame and above the subtitle line.
// Stagings (the surface; `staging` or `surface`): walnut (default) | marble | seat.
// Props: time (night | day; unset: night), clock ("21:52"),
//   date, notes [{app (vinari | messages | phone | mail | any name), title, body, when, at}] (1 to 3), land (the phone is
//   put down on the surface first; default true for the film's first PhoneDesk, false when `"land": false`), roll
//   (degrees, the phone's angle on the surface; unset: the film's pick), word.
// Sounds: asmr-land when it lands, real-phone-buzz-desk + Haptic light per banner, asmr-screen when it wakes.
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {ease, lerp} from '../lib/anim';
import type {SceneCtx} from '../types';
import {entrance, Haptic, lead, PictureBand, Sfx} from './common';
import {Hud} from './illo/cam';
import {at, clamp01, filmPick, useFilmKey} from './illo/scene';
import {Punch, wordOf} from './illo/type';
import {bodyBox, PosedPhone, ScreenLayer, type Pose} from './three/posed';
import {Banner, BANNER_H, LockScreen, WALL} from './three/lock';

const SURFACES = ['walnut', 'marble', 'seat'] as const;
type Surface = (typeof SURFACES)[number];
type NoteP = {app?: string; title?: string; body?: string; when?: string; at?: number | string};
type P = {staging?: string; surface?: string; time?: string; clock?: string; date?: string; notes?: NoteP[]; land?: boolean; roll?: number; word?: unknown; seed?: number};

const STACK_Y = 820; // capture px: the first banner's top, under the clock
const STEP = BANNER_H + 22;

// ---- the surfaces (stage px, drawn past every edge of the frame) --------------------------------------------------------
const X0 = -80;
const Y0 = -120;
const SW = 1240;
const SH_ = 2160;

const Walnut: React.FC<{uid: string; day: boolean}> = ({uid, day}) => (
  <>
    <defs>
      <linearGradient id={`${uid}w`} x1="0" y1="0" x2="1" y2="0.3">
        <stop offset="0" stopColor={day ? '#6E4A32' : '#4A3020'} />
        <stop offset="0.5" stopColor={day ? '#8A5E40' : '#62402A'} />
        <stop offset="1" stopColor={day ? '#946A4A' : '#6A4630'} />
      </linearGradient>
    </defs>
    <rect x={X0} y={Y0} width={SW} height={SH_} fill={`url(#${uid}w)`} />
    {[0, 1, 2, 3, 4].map((i) => (
      <rect key={i} x={-40 + i * 290} y={Y0} width={3} height={SH_} fill="#2E1D12" opacity={0.45} transform="rotate(-4 540 960)" />
    ))}
    {Array.from({length: 36}, (_, i) => {
      const x = -80 + i * 36 + (i % 3) * 7;
      const w = 6 + (i % 5) * 4;
      return <path key={i} d={`M${x} ${Y0}C${x + w} 500 ${x - w} 1100 ${x + w * 0.6} ${Y0 + SH_}`} fill="none" stroke={i % 2 ? '#3E281A' : '#8B6244'} strokeWidth={i % 4 === 0 ? 2.2 : 1.2} opacity={0.22} transform="rotate(-4 540 960)" />;
    })}
    {/* a small brass dish and a pen, lying on the wood */}
    <g transform="translate(930 250)">
      <ellipse cx={10} cy={16} rx={94} ry={90} fill="#000" opacity={0.25} />
      <circle r={88} fill="#B08A52" />
      <circle r={70} fill="#8E6A3A" />
      <circle r={66} fill="#A47C46" />
      <circle cx={-14} cy={6} r={20} fill="none" stroke="#F1D8A4" strokeWidth={7} />
    </g>
    <g transform="translate(150 1560) rotate(-28)">
      <rect x={-130} y={-12} width={260} height={30} rx={15} fill="#000" opacity={0.28} />
      <rect x={-130} y={-18} width={260} height={28} rx={14} fill="#15151A" />
      <rect x={-130} y={-18} width={260} height={7} rx={3.5} fill="#3A3A44" />
      <rect x={60} y={-18} width={34} height={28} fill="#C9A86A" />
    </g>
  </>
);

const Marble: React.FC<{uid: string; day: boolean}> = ({uid, day}) => (
  <>
    <defs>
      <linearGradient id={`${uid}m`} x1="0" y1="0" x2="0.7" y2="1">
        <stop offset="0" stopColor={day ? '#F4F3F1' : '#B9BAC0'} />
        <stop offset="1" stopColor={day ? '#E3E2E0' : '#8E9097'} />
      </linearGradient>
      <filter id={`${uid}soft`}>
        <feGaussianBlur stdDeviation="2.2" />
      </filter>
    </defs>
    <rect x={X0} y={Y0} width={SW} height={SH_} fill={`url(#${uid}m)`} />
    <g filter={`url(#${uid}soft)`} fill="none" strokeLinecap="round">
      {[
        ['M-80 260C180 340 300 520 520 560S900 760 1160 700', 3.2, 0.35],
        ['M-80 900C140 860 260 1040 420 1120S760 1220 1160 1380', 2.4, 0.3],
        ['M300 -120C340 200 260 420 380 640S520 980 470 1300', 1.6, 0.22],
        ['M760 2040C700 1780 820 1600 760 1420S900 1100 1160 1020', 2.8, 0.3],
        ['M-80 1620C200 1560 360 1700 620 1660', 1.4, 0.24],
      ].map(([d, w, a], i) => (
        <path key={i} d={d as string} stroke={day ? '#8B8D94' : '#4E5058'} strokeWidth={w as number} opacity={a as number} />
      ))}
    </g>
    {/* a small espresso cup on its saucer */}
    <g transform="translate(905 1560)">
      <ellipse cx={12} cy={18} rx={118} ry={112} fill="#000" opacity={0.16} />
      <circle r={112} fill="#FBFBFA" />
      <circle r={96} fill="#EFEFEE" />
      <circle r={66} fill="#FFFFFF" />
      <circle r={54} fill="#2A1A12" />
      <circle cx={-10} cy={-10} r={30} fill="#5A3A26" opacity={0.6} />
      <rect x={58} y={-12} width={52} height={24} rx={12} fill="#FFFFFF" />
    </g>
  </>
);

const Seat: React.FC<{uid: string; day: boolean}> = ({uid, day}) => {
  // a quilted leather seat cushion: diamond quilting, perforation dots, a double stitched bolster each side
  const base = day ? '#3A3634' : '#232022';
  const dots: React.ReactNode[] = [];
  for (let y = Y0 + 40; y < Y0 + SH_; y += 130)
    for (let x = 200 + ((((y - Y0) / 130) % 2) * 65); x < 900; x += 130) dots.push(<circle key={`${x}-${y}`} cx={x} cy={y} r={4.5} fill="#000" opacity={0.45} />);
  return (
    <>
      <defs>
        <linearGradient id={`${uid}s`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#0E0D0E" />
          <stop offset="0.16" stopColor={base} />
          <stop offset="0.84" stopColor={base} />
          <stop offset="1" stopColor="#0E0D0E" />
        </linearGradient>
        <pattern id={`${uid}q`} width={130} height={130} patternUnits="userSpaceOnUse" patternTransform="translate(135 0)">
          <path d="M0 65L65 0L130 65L65 130Z" fill="none" stroke="#000" strokeOpacity={0.5} strokeWidth={3} />
          <path d="M0 67L65 2L130 67L65 132Z" fill="none" stroke="#FFFFFF" strokeOpacity={0.06} strokeWidth={2} />
        </pattern>
      </defs>
      <rect x={X0} y={Y0} width={SW} height={SH_} fill={`url(#${uid}s)`} />
      <rect x={140} y={Y0} width={800} height={SH_} fill={`url(#${uid}q)`} />
      {dots}
      {[140, 940].map((x) => (
        <g key={x}>
          <rect x={x - 6} y={Y0} width={12} height={SH_} fill="#000" opacity={0.55} />
          <line x1={x + (x < 540 ? -26 : 26)} y1={Y0} x2={x + (x < 540 ? -26 : 26)} y2={Y0 + SH_} stroke="#B9A88E" strokeWidth={2.4} strokeDasharray="14 10" opacity={0.55} />
          <line x1={x + (x < 540 ? -38 : 38)} y1={Y0} x2={x + (x < 540 ? -38 : 38)} y2={Y0 + SH_} stroke="#B9A88E" strokeWidth={2.4} strokeDasharray="14 10" opacity={0.4} />
        </g>
      ))}
    </>
  );
};

/** the light over the surface: night a warm lamp pool from the upper right and a deep vignette, day a cool window light */
const Light: React.FC<{uid: string; day: boolean}> = ({uid, day}) => (
  <>
    <defs>
      <radialGradient id={`${uid}pool`} cx={day ? '0.15' : '0.85'} cy="0.1" r="0.95">
        <stop offset="0" stopColor={day ? '#FFFFFF' : '#FFC98A'} stopOpacity={day ? 0.35 : 0.42} />
        <stop offset="0.45" stopColor={day ? '#E8F0FF' : '#F0A060'} stopOpacity={day ? 0.1 : 0.14} />
        <stop offset="1" stopColor={day ? '#E8F0FF' : '#F0A060'} stopOpacity={0} />
      </radialGradient>
      <radialGradient id={`${uid}vig`} cx="0.5" cy="0.42" r="0.78">
        <stop offset="0.5" stopColor="#000" stopOpacity={0} />
        <stop offset="1" stopColor="#000" stopOpacity={day ? 0.22 : 0.62} />
      </radialGradient>
    </defs>
    <rect x={X0} y={Y0} width={SW} height={SH_} fill={`url(#${uid}pool)`} />
    {day ? <path d={`M${X0} 380L760 ${Y0}L1000 ${Y0}L${X0} 820Z`} fill="#FFFFFF" opacity={0.07} /> : null}
    <rect x={X0} y={Y0} width={SW} height={SH_} fill={`url(#${uid}vig)`} />
  </>
);

/** the phone's soft contact shadow on the surface */
const PhoneShadow: React.FC<{pose: Pose; lift: number; day: boolean}> = ({pose, lift, day}) => {
  const b = bodyBox(pose);
  return (
    <div
      style={{
        position: 'absolute',
        left: b.x + 18 + 40 * lift,
        top: b.y + 30 + 60 * lift,
        width: b.w,
        height: b.h,
        borderRadius: b.w * 0.17,
        background: '#000',
        opacity: (day ? 0.32 : 0.55) * (1 - 0.5 * lift),
        filter: `blur(${24 + 30 * lift}px)`,
        transform: `rotate(${-(pose.roll ?? 0)}deg)`,
      }}
    />
  );
};

export const PhoneDesk: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const f = useCurrentFrame();
  const uid = useId().replace(/:/g, '');
  const key = useFilmKey();
  const e = entrance(ctx);
  const base = lead(ctx);
  // the staging is the surface (`staging` or `surface`; unset: walnut, the registry's default, so the repeat rules see it)
  const pick = String(p.staging ?? p.surface);
  const surface: Surface = (SURFACES as readonly string[]).includes(pick) ? (pick as Surface) : 'walnut';
  const day = p.time === 'day';
  const roll = typeof p.roll === 'number' && Number.isFinite(p.roll) ? Math.max(-12, Math.min(12, p.roll)) : filmPick(key, 'pd-roll', [-5, 4, -3, 6]);
  const notes = (Array.isArray(p.notes) ? p.notes : []).filter((n) => n && (n.title || n.body)).slice(0, 3);
  const first = Math.max(e + 14, base + 10);
  const arrivals = notes.map((n, i) => Math.max(first + i * 20, at(ctx, n.at, first + i * 26)));
  for (let i = 1; i < arrivals.length; i++) arrivals[i] = Math.max(arrivals[i], arrivals[i - 1] + 12);
  const land = p.land !== false;

  // the land: the phone comes down onto the surface (a little bigger and higher, its shadow wide), a tiny settle
  const landK = land ? ease.enter(clamp01((f - e) / 14)) : 1;
  const lift = 1 - landK;
  // the camera: a slow push over the whole shot about the phone's centre
  const push = lerp(1, 1.09, ease.camera(clamp01((f - e) / Math.max(30, ctx.dur - e))));
  // the buzz: a short shake of the whole phone per arrival (a smooth decaying sine)
  let bz = 0;
  for (const a of arrivals) if (f >= a && f < a + 10) bz += 2.4 * Math.sin((f - a) * 2.1) * (1 - (f - a) / 10);
  const W0 = 470; // the display's width at rest (stage px): whole, its foot above the subtitle even at the end of the push
  const pose: Pose = {x: 540 + bz, y: 770 - 30 * lift, w: W0 * push * (1 + 0.1 * lift), yaw: 0, pitch: 0, roll: roll + 2 * lift + bz * 0.15};
  const wake = arrivals.length ? clamp01((f - arrivals[0] + 3) / 5) : 1;
  const time = typeof p.clock === 'string' && /^\d{1,2}:\d{2}$/.test(p.clock.trim()) ? p.clock.trim() : day ? '09:41' : '21:52';
  const date = typeof p.date === 'string' && p.date.trim() ? p.date.trim() : 'ოთხშაბათი, 14 ოქტომბერი';
  const word = wordOf(p.word, ctx, 1);
  const scale = `translate(540px, 770px) scale(${push.toFixed(4)}) translate(-540px, -770px)`;

  return (
    <PictureBand camera={false}>
      <div style={{position: 'absolute', inset: 0, background: '#000', overflow: 'hidden'}}>
        <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0, overflow: 'visible', transform: scale}}>
          {surface === 'marble' ? <Marble uid={uid} day={day} /> : surface === 'seat' ? <Seat uid={uid} day={day} /> : <Walnut uid={uid} day={day} />}
          <Light uid={uid} day={day} />
        </svg>
        <PhoneShadow pose={pose} lift={lift} day={day} />
        <PosedPhone pose={pose} light={day} wall={WALL[day ? 'day' : 'night']} />
        <ScreenLayer pose={pose}>
          <LockScreen time={time} date={date} day={day} wake={wake}>
            {notes.map((n, i) => {
              const a = arrivals[i];
              if (f < a) return null;
              // newest on top: a banner moves down a step for every later one that has arrived
              let slot = 0;
              for (let j = i + 1; j < notes.length; j++) slot += ease.enter(clamp01((f - arrivals[j]) / 8));
              return <Banner key={i} n={{app: n.app ?? 'vinari', title: n.title ?? '', body: n.body ?? '', when: n.when ?? 'ახლა'}} y={STACK_Y + slot * STEP} k={clamp01((f - a) / 8)} day={day} />;
            })}
          </LockScreen>
        </ScreenLayer>
        <Hud>
          <Punch word={word} slot="top" plate />
        </Hud>
      </div>
      {land && e + 12 >= base ? <Sfx name="asmr-land" at={Math.max(0, e + 12)} volume={0.32} /> : null}
      {arrivals.length && arrivals[0] >= 0 ? <Sfx name="asmr-screen" at={arrivals[0]} volume={0.3} /> : null}
      {arrivals.map((a, i) =>
        a >= 0 && a < ctx.dur ? (
          <React.Fragment key={i}>
            <Sfx name="real-phone-buzz-desk" at={a} volume={0.4} />
            <Haptic kind="light" at={a} />
          </React.Fragment>
        ) : null,
      )}
    </PictureBand>
  );
};
