// The QR card promo (1080x1920, 30 fps), v4: its shots in order, each a block of the timeline (src/qrpromo/timeline.json,
// made by build/plan.py from the measured voices), the studio's subtitle line on top (raised into the brief's safe zone),
// and the film's whole sound as one mastered track (public/vo/qrpromo/mix.wav). No meta bar, no category, no number.
// v4 (the owner, 2026-10-14: "more graphics, many more shots, like the navigator promo"): 19 blocks, a cut every 1.5 to
// 2.5 s; the three reasons are inserts (opt1..opt3) cut over the running options shot, which keeps its own clock.
import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {fr, TL} from './lib';
import {Subs} from './Subs';
import {Call, Flood, Groan, Mirror, MirrorClose, Speaker} from './Act1';
import {Facade, PaperClose} from './Paper';
import {Reveal} from './Reveal';
import {CardShot} from './CardShot';
import {Ots, Street} from './Street';
import {Options} from './Options';
import {Opt1, Opt2, Opt3} from './Inserts';
import {PushWood} from './Push';
import {Walk} from './Walk';
import {Calm} from './Calm';
import {End} from './End';
import {NightShot, PrintShot, SpamShot} from './Plus';

/** a block of the timeline: `xin` frames the block cross-dissolves in over the one before it */
type Block = {id: string; C: React.FC; xin?: number};
const BLOCKS: Block[] = [
  {id: 'speaker', C: Speaker},
  {id: 'mirror', C: Mirror},
  {id: 'mirror2', C: MirrorClose},
  {id: 'groan', C: Groan},
  {id: 'call', C: Call},
  {id: 'flood', C: Flood},
  {id: 'facade', C: Facade},
  {id: 'paper', C: PaperClose},
  {id: 'reveal', C: Reveal},
  {id: 'print', C: PrintShot},
  {id: 'card', C: CardShot},
  {id: 'street', C: Street},
  {id: 'ots', C: Ots},
  {id: 'options', C: Options},
  {id: 'opt1', C: Opt1},
  {id: 'opt2', C: Opt2},
  {id: 'opt3', C: Opt3},
  {id: 'push', C: PushWood},
  {id: 'walk', C: Walk},
  {id: 'spam', C: SpamShot},
  {id: 'night', C: NightShot},
  {id: 'calm', C: Calm},
  {id: 'end', C: End},
];

const span = (id: string) => {
  const s = TL.shots.find((x) => x.id === id);
  if (!s) throw new Error(`qrpromo: no shot ${id}`);
  return s;
};

/** the frames where the picture cuts (every block's first frame, and an insert's last: the picture cuts back) */
const CUTS = [...BLOCKS.map((b) => fr(span(b.id).from)), ...BLOCKS.filter((b) => (span(b.id) as {insert?: boolean}).insert).map((b) => fr(span(b.id).to))];

const Fade: React.FC<{n: number; children: React.ReactNode}> = ({n, children}) => {
  const t = useCurrentFrame();
  return <AbsoluteFill style={{opacity: n > 0 ? Math.min(1, (t + 1) / (n + 1)) : 1}}>{children}</AbsoluteFill>;
};

export const QrPromo: React.FC<{audio?: boolean}> = ({audio = true}) => (
  <AbsoluteFill style={{background: '#000'}}>
    {BLOCKS.map((b) => {
      const from = fr(span(b.id).from);
      const to = fr(span(b.id).to);
      const Comp = b.C;
      return (
        <Sequence key={b.id} from={from} durationInFrames={to - from} layout="none">
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
