// src/scenes/film/V134RainyDerbyReveal.tsx: v134-rainy-derby's reveal. Right after the floodlights went out (black, only the
// rain), the phone rises slowly out of the dark on the real home screen, the app's first look in the film.
//   {"type": "Film", "name": "V134RainyDerbyReveal", "look": "illustrated", "src": "23-home-104"}
import React from 'react';
import {Sequence} from 'remotion';
import {lead, PictureBand, Sfx} from '../common';
import type {SceneCtx} from '../../types';
import {PhoneReveal} from '../kit/reveal';

type P = {look?: 'illustrated' | 'diagram'; src?: string};

export const V134RainyDerbyReveal: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => (
  <PictureBand camera={false}>
    {/* the rise is already under way on the cut frame (16 frames in), so the dark is never a bare frame */}
    <Sequence from={-16} layout="none">
      <PhoneReveal ctx={ctx} src={p.src ?? '23-home-104'} foot={1300} />
    </Sequence>
    <Sfx name="asmr-swell" at={lead(ctx)} volume={0.22} />
  </PictureBand>
);
