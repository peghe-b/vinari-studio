// v131-lilo-bag, the step: the real parking screen in a whole phone rising in a hand, the window on the save row, the tap.
import React from 'react';
import {lead, PictureBand, Sfx} from '../common';
import type {SceneCtx} from '../../types';
import {StepShot} from '../kit/explain';

type P = {
  look?: 'illustrated' | 'diagram';
  shot?: 'save' | 'map' | 'arrive'; // which step (the row, the verb and the step number come with it)
  hitAt?: number | string;
  step?: number;
  verb?: string;
  row?: {x?: number; y: number; w?: number; h: number};
};

export const V131LiloBagStep: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => (
  <PictureBand camera={false}>
    <StepShot ctx={ctx} src="07-parking" n={p.step ?? 1} text={p.verb ?? ''} row={p.row ?? {y: 0.847, h: 0.046}} tapAt={p.hitAt ?? '0.6s'} liftAt={p.hitAt ?? '0.6s'} hold w={380} foot={1360} />
    <Sfx name="asmr-tap" at={Math.max(lead(ctx), 18)} volume={0.3} />
  </PictureBand>
);
