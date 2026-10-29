// v138-miles-trap, the reveal: after the silent beat in the rain, the phone rises slowly out of the dark on today's home
// screen (the promos' PhoneReveal, once a film), the screen wakes, the white opens out of it.
import React from 'react';
import {lead, PictureBand, Sfx} from '../common';
import type {SceneCtx} from '../../types';
import {PhoneReveal} from '../kit/reveal';

type P = {src?: string};

export const V138MilesTrapReveal: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => (
  <PictureBand camera={false}>
    <PhoneReveal ctx={ctx} src={p.src ?? '23-home-104'} rise={0} foot={1340} />
    <Sfx name="asmr-swell" at={lead(ctx)} volume={0.22} />
  </PictureBand>
);
