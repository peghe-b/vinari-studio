// The VINARI OBD promo (2026-10-30, the used-car story „ქალს ჰყავდა"; 1080x1920, 30 fps): its shots in order, each a block of
// the timeline (src/obdpromo/timeline.json, made by build/plan.py from the measured voices), the word-by-word subtitle line on
// top, and the film's whole sound as one mastered track (public/vo/obdpromo/mix.wav). Every beat its own picture.
import React from 'react';
import {AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {mtav} from '../lib/format';
import {F} from '../tokens';
import {fr, TL} from './lib';
import {ShotShift} from './kit/stage';
import {Subs} from './Subs';
import * as S from './Street';
import * as X from './Explain';
import * as P from './Phones';
import * as Z from './End';

/** a shot not built yet: its name on the grey (development only) */
const Todo: React.FC<{id: string}> = ({id}) => (
  <AbsoluteFill style={{background: '#7A7A7A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.sans, fontSize: 80, color: '#FFF'}}>{mtav(id)}</AbsoluteFill>
);

const SCENES: Record<string, React.FC> = {...S.SHOTS, ...X.SHOTS, ...P.SHOTS, ...Z.SHOTS};

const CUTS = TL.shots.map((s) => fr(s.from));
/** the street two-shot after the paper card came out torn, then blank, on its first visible frame in the video render (never
 *  in a still: its WebGL canvas waking in a fresh sequence): it starts 3 frames early under the card (WARM, its clock shifted
 *  back so its own timing is unchanged), the card on top (COVER) until the cut */
// v2 (31 Oct: a street shot's first visible frame came out torn again, two frames of one repeated tile): EVERY shot after the
// first starts 3 frames early under the one before (its clock shifted back), and an earlier shot always lies on top (z), so no
// shot's first live frame is ever its first composited one
const WARM_FRAMES = 3;
// v3 (31 Oct, the reviewers: the six-car grid hard-cut to an empty grey frame before the end card): the end card starts 12 frames
// early under the grid, and the grid fades out over them, so the grid dissolves straight into the white card
const END_XFADE = 12;

const FadeOut: React.FC<{len: number; fade: number; children: React.ReactNode}> = ({len, fade, children}) => {
  const f = useCurrentFrame();
  const o = fade > 0 ? interpolate(f, [len - fade, len], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 1;
  return <AbsoluteFill style={{opacity: o}}>{children}</AbsoluteFill>;
};

export const ObdPromo: React.FC<{audio?: boolean}> = ({audio = true}) => (
  <AbsoluteFill style={{background: '#000'}}>
    {TL.shots.map((s, i) => {
      const early = i === 0 ? 0 : s.id === 'end' ? END_XFADE : WARM_FRAMES;
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
    {audio ? <Audio src={staticFile('vo/obdpromo/mix.wav')} /> : null}
  </AbsoluteFill>
);
