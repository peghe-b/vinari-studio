// V135RedDevil: the red devil's story on its own old photos, each a white plate on the paper, greyscale and cropped to the
// car, the hand marking the one detail the voice is about. "year": the twist, the year rolls back from 2026 and lands on
// 1899 on the record's own card (the year, the speed, the place), whose figure it is under it. "wheel": the
// Lohner-Porsche (its Semper Vivus build), a ring closes round the front hub, where the motor sat. "today": the car as she stands today,
// her age rolling in. Built from the P2 kit only: a real photo, a Card, FitText, RollDigits, Ink.
import React from 'react';
import {Img, staticFile, useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, PictureBand, Sfx} from '../common';
import {prog, spr} from '../../lib/anim';
import {TXT} from '../../lib/layer';
import {C, F} from '../../tokens';
import type {SceneCtx} from '../../types';
import {Ink} from '../kit/ink';
import {Card, FitText, RollDigits, tone} from '../kit/p2';

type P = {
  shot?: 'year' | 'wheel' | 'today'; // which plate
  label?: string; // a quiet line under the plate (Latin: the car's own name)
  hitAt?: number | string; // the chunk the ring (or the year) lands on
  age?: string; // today: the age that rolls in over the plate
  ageFrom?: string;
  year?: string; // year: the year it lands on, and where it rolls from
  yearFrom?: string;
  source?: string; // year: whose figure it is
  speed?: string; // year: the record under the year
};

// the plate: the photo at its own shape, centred with air on both sides, its foot well over the subtitle band
const PX = 130;
const PW = 820;
// each plate takes its photo's own shape, so the cover crop never cuts the car (1600x1067, 1600x1200); the year's card
const PHS = {year: 560, wheel: 547, today: 615};
const PYS = {year: 600, wheel: 640, today: 580};

// what the mark lands on, in stage px on the plate (measured on the photos)
const RING = {
  wheel: {x: 135, y: 932, w: 200, h: 200}, // the front hub
};
// photos 3 and 5 are CC BY-SA: the credit stays on screen while it shows, level under the plate (as tools/check.mjs prints it)
const CREDIT = {today: 'ფოტო: Ton1~commonswiki · CC BY-SA 3.0', wheel: 'ფოტო: Yannick Leclercq · CC BY-SA 4.0'};

export const V135RedDevil: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const shot = p.shot === 'wheel' || p.shot === 'today' ? p.shot : 'year';
  const wheel = shot === 'wheel';
  const today = shot === 'today';
  const year = shot === 'year';
  const PH = wheel ? PHS.wheel : today ? PHS.today : PHS.year;
  const PY = wheel ? PYS.wheel : today ? PYS.today : PYS.year;
  const hit = Math.max(base + 14, cueFrame(ctx, p.hitAt ?? 0) + 10);
  const plate = spr(frame, e, 'enter');
  // the plate keeps moving: a slow push into the marked detail, so the shot never holds still
  // the wheel shot dives into the hub (its origin), so the hub stays under its ring while the wheel fills the plate
  const k = prog(frame, e, Math.max(30, ctx.dur - e));
  const push = wheel ? 1.1 + 0.35 * k : 1 + 0.06 * k;
  const origin = wheel ? '13% 72%' : '50% 55%';
  const look: React.CSSProperties = {position: 'absolute', left: 0, top: 0, width: PW, height: PH, objectFit: 'cover', objectPosition: '50% 50%', filter: 'grayscale(1) contrast(1.1)', transform: `scale(${push.toFixed(4)})`, transformOrigin: origin};
  // the year: it rolls back from the card's entrance and lands on its cue
  const rollAt = Math.max(0, e);
  const label = p.label ?? (wheel ? 'Lohner-Porsche · Semper Vivus' : year ? 'La Jamais Contente · Achères' : 'La Jamais Contente');
  const rise = (1 - plate) * 50;
  return (
    <PictureBand camera={false}>
      <Card x={PX} y={PY + rise} w={PW} h={PH} r={18} style={{opacity: Math.min(1, plate * 1.3)}}>
        {wheel ? <Img src={staticFile('photos/story-ev-is-old-5.jpg')} style={look} /> : today ? <Img src={staticFile('photos/story-ev-is-old-3.jpg')} style={look} /> : null}
      </Card>
      {year ? (
        <>
          {/* the record's card: the year rolls back and lands, the speed under it, a stroke closing under the year */}
          <div style={{position: 'absolute', left: PX, top: PY + 50 + rise, width: PW, display: 'flex', justifyContent: 'center'}}>
            <RollDigits text={p.year ?? '1899'} from={p.yearFrom ?? '2026'} at={rollAt} dur={Math.max(18, hit - rollAt)} size={240} t="accent" />
          </div>
          <FitText text={p.speed ?? '105,88 კმ/სთ'} x={540} y={PY + 400 + rise} w={700} size={96} min={60} maxLines={1} weight={700} align="center" at={e + 6} />
          <Ink end={ctx.dur} room={{x: PX, y: PY, w: PW, h: PH}} marks={[{kind: 'underline', box: {x: 290, y: PY + 320, w: 500, h: 30}, at: hit}]} color={tone('accent')} />
        </>
      ) : null}
      <FitText text={label} x={540} y={PY + PH + 36} w={700} size={48} min={36} maxLines={1} weight={600} align="center" t="quiet" latin at={e + 8} />
      {today && p.age ? (
        <div style={{position: 'absolute', left: 0, top: 404, width: 1080, display: 'flex', justifyContent: 'center'}}>
          <RollDigits text={p.age} from={p.ageFrom ?? '100'} at={hit} dur={24} size={140} t="accent" />
        </div>
      ) : null}
      {today || wheel || (year && p.source) ? (
        <div className={TXT} style={{position: 'absolute', left: PX, top: PY + PH + 104, width: PW, textAlign: 'center', fontFamily: F.sans, fontSize: year ? 38 : 34, lineHeight: '46px', color: C.ink2, whiteSpace: 'nowrap', opacity: Math.min(1, plate)}}>
          {today ? CREDIT.today : wheel ? CREDIT.wheel : `წყარო: ${p.source}`}
        </div>
      ) : null}
      {/* today lands on its rolling age alone: the bracket read as a stray arrow at the plate's lower left (the r0 judge) */}
      {wheel ? <Ink end={ctx.dur} room={{x: PX, y: PY, w: PW, h: PH}} marks={[{kind: 'circle', box: RING.wheel, at: hit}]} /> : null}
      <Sfx name="asmr-swell" at={Math.max(base, hit - 8)} volume={0.2} />
      <Land at={hit} />
      <Haptic kind="light" at={hit + 1} volume={0.3} />
    </PictureBand>
  );
};
