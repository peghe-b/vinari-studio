// „კიდევ ამინთო" (2026-10-31; 1080x1920, 30 fps): its shots in order, each a block of the timeline (src/amintho/timeline.json,
// made by build/plan.py from the measured voices), the word-by-word subtitle line on top, and the film's whole sound as one
// mastered track (public/vo/amintho/mix.wav). No WebGL anywhere (the flat phone, the drawn kit): no torn first frames.
import React from 'react';
import {AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {mtav} from '../lib/format';
import {F} from '../tokens';
import {fr, TL} from './lib';
import {ShotShift} from './kit/stage';
import {Subs} from './Subs';
import * as A1 from './Act1';
import * as A2 from './Act2';
import * as Z from './End';

/** a shot not built yet: its name on the grey (development only) */
const Todo: React.FC<{id: string}> = ({id}) => (
  <AbsoluteFill style={{background: '#7A7A7A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.sans, fontSize: 80, color: '#FFF'}}>{mtav(id)}</AbsoluteFill>
);

const SCENES: Record<string, React.FC> = {...A1.SHOTS, ...A2.SHOTS, ...Z.SHOTS};
const CUTS = TL.shots.map((s) => fr(s.from));
/** the end card starts 12 frames early under the last shot, which fades out over them */
const END_XFADE = 12;

const FadeOut: React.FC<{len: number; fade: number; children: React.ReactNode}> = ({len, fade, children}) => {
  const f = useCurrentFrame();
  const o = fade > 0 ? interpolate(f, [len - fade, len], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 1;
  return <AbsoluteFill style={{opacity: o}}>{children}</AbsoluteFill>;
};

export const AminthoPromo: React.FC<{audio?: boolean}> = ({audio = true}) => (
  <AbsoluteFill style={{background: '#000'}}>
    {TL.shots.map((s, i) => {
      const early = s.id === 'end' ? END_XFADE : 0;
      const fade = TL.shots[i + 1]?.id === 'end' ? END_XFADE : 0;
      const from = fr(s.from) - early;
      const to = fr(s.to);
      const Comp = SCENES[s.id];
      return (
        <Sequence key={s.id} from={from} durationInFrames={to - from} premountFor={6}>
          <ShotShift.Provider value={early}>
            <AbsoluteFill style={{zIndex: 100 - i}}>
              <FadeOut len={to - from} fade={fade}>{Comp ? <Comp /> : <Todo id={s.id} />}</FadeOut>
            </AbsoluteFill>
          </ShotShift.Provider>
        </Sequence>
      );
    })}
    <AbsoluteFill style={{zIndex: 1000}}>
      <Subs cuts={CUTS} />
    </AbsoluteFill>
    {audio ? <Audio src={staticFile('vo/amintho/mix.wav')} /> : null}
  </AbsoluteFill>
);
