// V131WiperNotesReveal: v131-wiper-notes' reveal. After the black beat the phone rises slowly out of the dark on the app's
// real home screen (23-home-104), quick for a 20 s film: it rises at once, wakes and opens to white within a second.
import React from 'react';
import {Sequence} from 'remotion';
import {lead, Sfx} from '../common';
import {PictureBand} from '../common';
import type {SceneCtx} from '../../types';
import {PhoneReveal} from '../kit/reveal';

type P = {look?: 'illustrated'; src?: string};

export const V131WiperNotesReveal: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => (
  <PictureBand camera={false}>
    {/* the rise has crossed the subtitle band before the cut: the shot opens on its last, slow part */}
    <Sequence from={-30} layout="none">
      <PhoneReveal ctx={ctx} src={p.src ?? '23-home-104'} rise="0s" wake="1.2s" white="1.6s" foot={1330} />
    </Sequence>
    <Sfx name="asmr-swell" at={lead(ctx)} volume={0.26} />
  </PictureBand>
);
