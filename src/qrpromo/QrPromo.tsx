// The QR card promo (1080x1920, 30 fps): its shots in order, each a block of the timeline (src/qrpromo/timeline.json, made
// by build/plan.py from the two measured voices), the studio's subtitle line on top (raised into the brief's safe zone), and
// the film's whole sound as one mastered track (public/vo/qrpromo/mix.wav). No meta bar, no category, no number.
import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {fr, shot, TL, XFADE} from './lib';
import {Subs} from './Subs';
import {Call, Flood, Mirror} from './Act1';
import {Paper} from './Paper';
import {Reveal} from './Reveal';
import {CardShot} from './CardShot';
import {Reason, Scan} from './Scan';
import {Push} from './Push';
import {Calm} from './Calm';
import {End} from './End';

/** a block of the timeline: `post` frames it keeps playing under the next one (its own exit), `xin` frames the next
 *  block's cross-dissolve in over it (both on the white: never a white flash, never a grey frame). */
type Block = {id: string; C: React.FC; post?: number; xin?: number};
const BLOCKS: Block[] = [
  {id: 'mirror', C: Mirror},
  {id: 'call', C: Call},
  {id: 'flood', C: Flood},
  {id: 'paper', C: Paper},
  {id: 'reveal', C: Reveal},
  {id: 'card', C: CardShot},
  {id: 'scan', C: Scan},
  {id: 'reason', C: Reason, post: XFADE},
  {id: 'push', C: Push, xin: XFADE},
  {id: 'calm', C: Calm},
  {id: 'end', C: End},
];

/** the frames where the picture cuts (each block's first frame): a subtitle line ends on its own scene's cut */
const CUTS = BLOCKS.map((b) => fr(shot(b.id).from));

const Fade: React.FC<{n: number; children: React.ReactNode}> = ({n, children}) => {
  const t = useCurrentFrame();
  return <AbsoluteFill style={{opacity: n > 0 ? Math.min(1, (t + 1) / (n + 1)) : 1}}>{children}</AbsoluteFill>;
};

export const QrPromo: React.FC<{audio?: boolean}> = ({audio = true}) => (
  <AbsoluteFill style={{background: '#000'}}>
    {BLOCKS.map((b) => {
      const from = fr(shot(b.id).from);
      const to = fr(shot(b.id).to);
      const Comp = b.C;
      return (
        <Sequence key={b.id} from={from} durationInFrames={to - from + (b.post ?? 0)} layout="none">
          <Fade n={b.xin ?? 0}>
            <Comp />
          </Fade>
        </Sequence>
      );
    })}
    <Subs cuts={CUTS} />
    {audio ? <Audio src={staticFile('vo/qrpromo/mix.wav')} /> : null}
  </AbsoluteFill>
);

export const TOTAL_S = TL.total;
