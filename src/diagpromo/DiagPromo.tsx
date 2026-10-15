// The VINARI diagnostics promo v2 (1080x1920, 30 fps): its shots in order, each a block of the timeline (src/diagpromo/
// timeline.json, made by build/plan.py from the measured voices), the studio's subtitle line on top (raised into the brief's
// safe zone), and the film's whole sound as one mastered track (public/vo/diagpromo/mix.wav). No meta bar, no category, no
// number. Every beat its own picture (the owner, 2026-10-15: no set, screen, framing or layout twice).
import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile} from 'remotion';
import {mtav} from '../lib/format';
import {F} from '../tokens';
import {fr, TL} from './lib';
import {Subs} from './Subs';
import {AgainShot, BayShot, BillShot, CoilsShot, DriveShot, FightShot, LoungeShot, MorningShot, PopShot, RetortShot, RewindShot, SeatShot} from './Act1';
import * as P from './Problem';
import {Reveal} from './Reveal';
import * as X from './Explain';
import * as B from './Lot';
import * as S from './Sound';
import * as C from './Callback';
import * as Z from './Finale';

/** a shot not built yet: its name on the grey (development only) */
const Todo: React.FC<{id: string}> = ({id}) => (
  <AbsoluteFill style={{background: '#7A7A7A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.sans, fontSize: 80, color: '#FFF'}}>{mtav(id)}</AbsoluteFill>
);

const SCENES: Record<string, React.FC> = {
  fight: FightShot,
  retort: RetortShot,
  rewind: RewindShot,
  drive: DriveShot,
  pop: PopShot,
  bay: BayShot,
  coils: CoilsShot,
  bill: BillShot,
  morning: MorningShot,
  again: AgainShot,
  seat: SeatShot,
  lounge: LoungeShot,
  ...P.SHOTS,
  reveal: Reveal,
  ...X.SHOTS,
  ...B.SHOTS,
  ...S.SHOTS,
  ...C.SHOTS,
  ...Z.SHOTS,
};

/** the frames where the picture cuts */
const CUTS = TL.shots.map((s) => fr(s.from));

export const DiagPromo: React.FC<{audio?: boolean}> = ({audio = true}) => (
  <AbsoluteFill style={{background: '#000'}}>
    {TL.shots.map((s) => {
      const from = fr(s.from);
      const to = fr(s.to);
      const Comp = SCENES[s.id];
      return (
        <Sequence key={s.id} from={from} durationInFrames={to - from} layout="none">
          <AbsoluteFill>{Comp ? <Comp /> : <Todo id={s.id} />}</AbsoluteFill>
        </Sequence>
      );
    })}
    <Subs cuts={CUTS} />
    {audio ? <Audio src={staticFile('vo/diagpromo/mix.wav')} /> : null}
  </AbsoluteFill>
);
