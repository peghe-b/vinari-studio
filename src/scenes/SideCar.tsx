import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import type {SceneCtx} from '../types';
import {S} from './kit/paper';
import {shoutEnd, ShoutWords} from './kit/shout';
import {Car} from './illo/car';
import {Figure, type Cast} from './illo/figure';
import {DefsSvg, Shadow} from './illo/solid';

type P = {sex: 'm' | 'f'; hinge?: string};

/** the car's length (stage px) and its ground line: the whole car at least 70 px inside the frame (840 stage px: frame x 78..1002) on both sides (the r3
 *  review: the old outline's rear ran to frame x 1045), the shout set under it */
const LEN = 840;
const GROUND = S.top + 360;
const CX = 540;

// SideCar (the humour kit, ported from phase 2 on 2026-10-31): the car beside you in the jam and the one who shouts from it. r3 review (2026-10-27):
// the hand-drawn outline read as a boxy 90s hatchback on two black discs with a blob in the window (modern-cars-only,
// promo-craft), so it is now the kit's own refined 2020s car (illo/car.tsx: raked glass, arches, multi-spoke rims, LED
// light lines; a mid grey, black and white) parked in profile, and in its side glass the driver from the Silhouette-light
// people (illo/sil.tsx through Figure: head, neck and shoulders, turned to us while she shouts, an angry face, then still
// on the pause). The shout's words are set under the car as a poster (kit/shout), the pause and the hinge as ShoutType's.
export const SideCar: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const uid = useId().replace(/:/g, '');
  const words = (ctx.words ?? []).flat();
  const spans = ctx.speech ?? [];
  const speechEnd = shoutEnd(words, spans);
  const frozen = frame > speechEnd + 2;
  const talking = !frozen && (spans.length ? spans.some(([a, z]) => frame >= a && frame <= z) : frame <= speechEnd);
  const f = frozen ? speechEnd + 2 : frame;
  const cast: Cast = {is: p.sex === 'f' ? 'woman' : 'man', gender: p.sex};
  // her face while she shouts: the mouth runs (angry and shock, 5 frames each); on the pause she holds the last one
  const face = talking ? (Math.floor(f / 5) % 2 ? 'angry' : 'shock') : 'angry';
  return (
    <>
      <DefsSvg uid={uid} />
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        <Shadow uid={uid} cx={CX} cy={GROUND + 4} rx={LEN * 0.47} ry={16} k={1} />
        <Car
          uid={uid}
          x={CX}
          y={GROUND}
          len={LEN}
          body="suv"
          paint={2}
          caliper="none"
          frame={f}
          cabin={(b) => <Figure uid={uid} cast={cast} x={b.x + b.w * 0.7} y={b.y + b.h * 0.58} size={b.h * 7.2} crop="head" turn={talking ? 0.45 : 0.8} face={face} frame={f} idle={!frozen} />}
        />
      </svg>
      <ShoutWords words={words} spans={spans} hinge={p.hinge} top={GROUND + 90} bottom={S.bottom} frame={frame} dur={ctx.dur} />
    </>
  );
};
