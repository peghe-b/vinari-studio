// The VINARI navigator + CarPlay promo (1080x1920, 30 fps): its shots in order, each a block of the timeline
// (src/navpromo3/timeline.json, made by build/plan.py from the measured voices), the studio's subtitle line on top (raised
// into the brief's safe zone), and the film's whole sound as one mastered track (public/vo/navpromo3/mix.wav). No meta bar,
// no category, no number. Every beat its own picture.
import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile} from 'remotion';
import {mtav} from '../lib/format';
import {F} from '../tokens';
import {fr, TL} from './lib';
import {Subs} from './Subs';
import * as A1 from './Act1';
import * as RV from './Reveal';
import * as A3 from './Features';
import * as CP from './CarPlay';
import * as A5 from './Payoff';
import * as EN from './End';

/** a shot not built yet: its name on the grey (development only) */
const Todo: React.FC<{id: string}> = ({id}) => (
  <AbsoluteFill style={{background: '#7A7A7A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.sans, fontSize: 80, color: '#FFF'}}>{mtav(id)}</AbsoluteFill>
);

const SCENES: Record<string, React.FC> = {
  ...A1.SHOTS,
  ...RV.SHOTS,
  ...A3.SHOTS,
  ...CP.SHOTS,
  ...A5.SHOTS,
  ...EN.SHOTS,
};

/** the frames where the picture cuts */
const CUTS = TL.shots.map((s) => fr(s.from));

export const NavCarPlay: React.FC<{audio?: boolean}> = ({audio = true}) => (
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
    {audio ? <Audio src={staticFile('vo/navpromo3/mix.wav')} /> : null}
  </AbsoluteFill>
);
