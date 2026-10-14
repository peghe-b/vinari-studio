// src/scenes/CarNight.tsx: a real solid 3D car parked on a night street in Tbilisi, under a street lamp, the houses across
// the road with warm lit windows (the QR promo's night shots, 2026-10-14, made a library scene on 2026-10-15: the owner,
// "give the studio more power so it creates graphics like the promos"). From film SCENES_UP_FROM on (src/lib/device.mjs).
//
// The car is the studio's own procedural premium saloon (./three/car.ts, the one Wire3D draws as lines) rendered SOLID
// (./three/solidcar.tsx: clear-coated metallic paint, tinted glass, LED lamps, machined rims, a contact shadow); the street
// is ./three/street.tsx in the car's own perspective. Always a FRONT THREE-QUARTER view (never a side view) and the car
// always WHOLE in the frame, its roof under the upper third, the road calm under the subtitle line. The camera dollies in
// slowly over the shot.
// Props: color (cobalt | graphite | pearl | silver | red | black | green, or a #hex; unset: cobalt), and the staging, the camera's angle
//   (`staging` or `angle`: right (default), from the pavement side | left, from the road | low, a low hero view), card (true or
//   {at}: the printed VINARI QR card standing behind the windscreen; with `at` it comes down onto the dash then), loupe
//   (true or {at}: a round loupe over the card, only the code; needs the card), hazard (true or {at}: the hazard lights
//   blink from then), lights (true: the headlamps on, their beams on the road), word.
// Sounds: real-indicator-loop while the hazards blink, asmr-land when the card lands, asmr-pop when the loupe opens.
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {ease, lerp} from '../lib/anim';
import type {SceneCtx} from '../types';
import {entrance, lead, PictureBand, Sfx} from './common';
import {Hud} from './illo/cam';
import {at, clamp01} from './illo/scene';
import {Punch, wordOf} from './illo/type';
import {Car3, projectCar, type CarCam} from './three/solidcar';
import {Street} from './three/street';

type P3 = [number, number, number];
type When = boolean | {at?: number | string};
type P = {staging?: string; color?: string; angle?: string; card?: When; loupe?: When; hazard?: When; lights?: boolean; word?: unknown; seed?: number};

const PAINTS: Record<string, string> = {cobalt: '#1F47B6', graphite: '#3A3D42', pearl: '#E6E4DF', silver: '#A7ABB1', red: '#8E1A20', black: '#111214', green: '#1E4537'};
const ANGLES = ['right', 'left', 'low'] as const;
type Angle = (typeof ANGLES)[number];
// the dolly's two ends per angle (the car's centre on the ground at the origin, its nose to +z, the kerb on its right):
// measured so the car's whole box stays inside stage x 89..945, y 726..1107 at the end of the push
const CAMS: Record<Angle, [CarCam, CarCam]> = {
  right: [
    {pos: [9.2, 2.2, 16.6], target: [0, 0.4, 0.2], fov: 30},
    {pos: [8.74, 2.11, 15.78], target: [0, 0.4, 0.2], fov: 30},
  ],
  left: [
    {pos: [-6.4, 1.75, 16.8], target: [0.15, 0.4, 0.3], fov: 30},
    {pos: [-6.07, 1.68, 15.97], target: [0.15, 0.4, 0.3], fov: 30},
  ],
  low: [
    {pos: [8.0, 0.85, 16.3], target: [0, 0.5, 0.2], fov: 30},
    {pos: [7.6, 0.83, 15.5], target: [0, 0.5, 0.2], fov: 30},
  ],
};
const mixCam = (a: CarCam, b: CarCam, k: number): CarCam => ({pos: a.pos.map((v, i) => lerp(v, b.pos[i], k)) as P3, target: a.target.map((v, i) => lerp(v, b.target[i], k)) as P3, fov: lerp(a.fov, b.fov, k)});

const CARD_C: P3 = [-0.26, 1.07, 0.61]; // the card behind the windscreen (./three/solidcar.tsx cardAt)
const HAZARD: P3[] = [
  [0.86, 0.7, 2.06],
  [-0.86, 0.7, 2.06],
  [1.0, 1.0, 0.62],
  [-1.0, 1.0, 0.62],
];
const LAMPS: P3[] = [
  [0.68, 0.68, 2.12],
  [-0.68, 0.68, 2.12],
];
const LOUPE = {x: 540, y: 420, r: 220};
const BLINK = 22; // frames a hazard cycle (on half of it): about 82 a minute

const whenOf = (ctx: SceneCtx, w: When | undefined, fallback: number) => (w === undefined || w === false ? null : w === true ? fallback : at(ctx, w.at, fallback));

export const CarNight: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const f = useCurrentFrame();
  const uid = useId().replace(/:/g, '');
  const e = entrance(ctx);
  const base = lead(ctx);
  // the staging is the camera's angle (`staging` or `angle`; unset: right, the registry's default, so the repeat rules see it)
  const pick = String(p.staging ?? p.angle);
  const angle: Angle = (ANGLES as readonly string[]).includes(pick) ? (pick as Angle) : 'right';
  const paint = typeof p.color === 'string' && /^#[0-9a-f]{6}$/i.test(p.color) ? p.color : (PAINTS[String(p.color ?? 'cobalt').toLowerCase()] ?? PAINTS.cobalt);
  const k = ease.camera(clamp01((f - e) / Math.max(30, ctx.dur - e)));
  const cam = mixCam(CAMS[angle][0], CAMS[angle][1], k);

  const cardAt = whenOf(ctx, p.card, e);
  const cardK = cardAt === null ? 0 : cardAt <= e ? 1 : ease.enter(clamp01((f - cardAt) / 16));
  const loupeAt = cardAt === null ? null : whenOf(ctx, p.loupe, Math.max(e + 30, (cardAt ?? 0) + 24, Math.round(ctx.dur * 0.4)));
  const lk = loupeAt === null ? 0 : ease.enter(clamp01((f - loupeAt) / 12));
  const hazardAt = whenOf(ctx, p.hazard, Math.max(0, e + 6));
  const blinkOn = hazardAt !== null && f >= hazardAt && (f - hazardAt) % BLINK < BLINK / 2;
  const blinkA = blinkOn ? 1 - 0.25 * (((f - (hazardAt ?? 0)) % BLINK) / (BLINK / 2)) : 0;
  const lights = p.lights === true ? ease.enter(clamp01((f - e - 4) / 10)) : 0;
  const word = wordOf(p.word, ctx, 1);

  const card2 = projectCar(cam, CARD_C);
  // the loupe looks at the card nearly square on (the glass's normal, a little toward the camera), so the code reads flat
  const dir = (() => {
    const d = cam.pos.map((v, i) => v - CARD_C[i]);
    const n = Math.hypot(d[0], d[1], d[2]);
    return d.map((v) => v / n);
  })();
  const nrm = [0, 0.87, 0.49];
  const md = nrm.map((v, i) => 0.75 * v + 0.25 * dir[i]);
  const mn = Math.hypot(md[0], md[1], md[2]);
  const ld = 0.62 - 0.05 * k;
  const loupeCam: CarCam = {pos: CARD_C.map((v, i) => v + (md[i] / mn) * ld) as P3, target: CARD_C, fov: 34};
  const far = (q: P3) => projectCar(cam, [q[0], 0, q[2] + 5.5]);
  const side = (q: P3, dx: number) => projectCar(cam, [q[0] + dx, 0, q[2] + 5.5]);

  return (
    <PictureBand camera={false}>
      <div style={{position: 'absolute', inset: 0, background: '#121014', overflow: 'hidden'}}>
        <Street cam={cam} uid={`${uid}st`} look="night" lit={0.85} />
        {lights > 0 ? (
          <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
            <defs>
              <linearGradient id={`${uid}beam`} x1="0" y1="0" x2="1" y2="0.6">
                <stop offset="0" stopColor="#FFF4DC" stopOpacity={0.7} />
                <stop offset="1" stopColor="#FFF4DC" stopOpacity={0} />
              </linearGradient>
              <radialGradient id={`${uid}pool`} cx="0.5" cy="0.5" r="0.5">
                <stop offset="0" stopColor="#FFF0D0" stopOpacity={0.38} />
                <stop offset="1" stopColor="#FFF0D0" stopOpacity={0} />
              </radialGradient>
            </defs>
            {LAMPS.map((q, i) => {
              const o = projectCar(cam, q);
              const a = side(q, -1.3);
              const b = side(q, 1.3);
              return <path key={i} d={`M${o.x} ${o.y - 6}L${a.x} ${a.y}L${b.x} ${b.y}L${o.x} ${o.y + 6}Z`} fill={`url(#${uid}beam)`} opacity={lights} />;
            })}
            <ellipse cx={(far(LAMPS[0]).x + far(LAMPS[1]).x) / 2} cy={far(LAMPS[0]).y} rx={400} ry={84} fill={`url(#${uid}pool)`} opacity={lights} />
          </svg>
        ) : null}
        <Car3 cam={cam} night={1} card={cardAt !== null} cardK={cardK} glassA={cardAt !== null ? 0.6 : 0.86} lamp={0.5 + 0.5 * lights} street={0.85} shadow={1.1} paint={paint} />
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <defs>
            <radialGradient id={`${uid}amber`} cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#FFE2A0" stopOpacity={1} />
              <stop offset="0.22" stopColor="#FFA526" stopOpacity={0.7} />
              <stop offset="1" stopColor="#FF8A00" stopOpacity={0} />
            </radialGradient>
            <radialGradient id={`${uid}glow`} cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#FFF6E0" stopOpacity={0.95} />
              <stop offset="0.25" stopColor="#FFE2B0" stopOpacity={0.45} />
              <stop offset="1" stopColor="#FFE2B0" stopOpacity={0} />
            </radialGradient>
          </defs>
          {lights > 0
            ? LAMPS.map((q, i) => {
                const o = projectCar(cam, q);
                return <circle key={i} cx={o.x} cy={o.y} r={64} fill={`url(#${uid}glow)`} opacity={lights} />;
              })
            : null}
          {blinkA > 0
            ? HAZARD.map((q, i) => {
                const o = projectCar(cam, q);
                return <circle key={i} cx={o.x} cy={o.y} r={i < 2 ? 46 : 30} fill={`url(#${uid}amber)`} opacity={blinkA} />;
              })
            : null}
        </svg>
        {lk > 0.001 ? (
          <div style={{position: 'absolute', inset: 0, opacity: clamp01(lk * 1.5)}}>
            <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
              <line x1={card2.x} y1={card2.y} x2={lerp(card2.x, LOUPE.x, lk)} y2={lerp(card2.y, LOUPE.y + LOUPE.r * 0.97, lk)} stroke="#FFFFFF" strokeWidth={3} opacity={0.75} />
              <circle cx={card2.x} cy={card2.y} r={10} fill="none" stroke="#FFFFFF" strokeWidth={3} opacity={0.85} />
            </svg>
            <div
              style={{
                position: 'absolute',
                left: LOUPE.x - LOUPE.r,
                top: LOUPE.y - LOUPE.r,
                width: LOUPE.r * 2,
                height: LOUPE.r * 2,
                borderRadius: LOUPE.r,
                overflow: 'hidden',
                transform: `scale(${Math.max(0.01, lk)})`,
                transformOrigin: `${card2.x - (LOUPE.x - LOUPE.r)}px ${card2.y - (LOUPE.y - LOUPE.r)}px`,
                boxShadow: '0 0 0 6px #F4F1EA, 0 22px 60px rgba(0,0,0,0.45)',
                background: '#1A1820',
              }}
            >
              <Car3 w={LOUPE.r * 2} h={LOUPE.r * 2} cam={loupeCam} night={1} card cardK={1} glassA={0.42} street={0.85} shadow={0} paint={paint} />
            </div>
          </div>
        ) : null}
        <Hud>
          <Punch word={word} slot="top" plate />
        </Hud>
      </div>
      {hazardAt !== null && hazardAt < ctx.dur ? <Sfx name="real-indicator-loop" at={Math.max(base, hazardAt, 0)} volume={0.3} len={Math.max(1, ctx.dur - Math.max(0, hazardAt))} fade={8} /> : null}
      {cardAt !== null && cardAt > e && cardAt + 14 < ctx.dur ? <Sfx name="asmr-land" at={cardAt + 14} volume={0.3} /> : null}
      {loupeAt !== null && loupeAt >= 0 && loupeAt < ctx.dur ? <Sfx name="asmr-pop" at={loupeAt} volume={0.3} /> : null}
    </PictureBand>
  );
};
