// The VINARI diagnostics promo (1080x1920, 30 fps): its shots in order, each a block of the timeline (src/diagpromo/timeline.json,
// made by build/plan.py from the measured voices), the studio's subtitle line on top (raised into the brief's safe zone),
// and the film's whole sound as one mastered track (public/vo/diagpromo/mix.wav). No meta bar, no category, no number.
import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile} from 'remotion';
import {fr, TL} from './lib';
import {Subs} from './Subs';
import {AgainShot, BinShot, CallShot, DashShot, GarageShot, MechShot, MorningShot, RageShot, ReceiptShot} from './Act1';
import {Reveal} from './Reveal';
import {AskShot, CodesShot, FlipShot, HiddenShot, LinkShot, PlugShot, PortShot, QuoteShot, RecordShot, ResultShot, ScanShot, TellShot, UrgencyShot, VerdictShot} from './Explain';
import {LotShot} from './Lot';
import {ShowPhoneShot, ShowShot, SmallShot} from './Callback';
import {CalmShot, End, MoreShot, SoonShot} from './Finale';

const Blank: React.FC = () => <AbsoluteFill style={{background: '#FFFFFF'}} />;

type Block = {id: string; C: React.FC};
const SCENES: Record<string, React.FC> = {
  garage: GarageShot,
  mech: MechShot,
  dash: DashShot,
  receipt: ReceiptShot,
  morning: MorningShot,
  rage: RageShot,
  again: AgainShot,
  call: CallShot,
  bin: BinShot,
  reveal: Reveal,
  codes: CodesShot,
  flip: FlipShot,
  port: PortShot,
  plug: PlugShot,
  link: LinkShot,
  scan: ScanShot,
  result: ResultShot,
  verdict: VerdictShot,
  lot: LotShot,
  hidden: HiddenShot,
  ask: AskShot,
  record: RecordShot,
  urgency: UrgencyShot,
  tell: TellShot,
  quote: QuoteShot,
  show: ShowShot,
  showPhone: ShowPhoneShot,
  small: SmallShot,
  calm: CalmShot,
  more: MoreShot,
  soon: SoonShot,
  end: End,
};
const BLOCKS: Block[] = TL.shots.map((s) => ({id: s.id, C: SCENES[s.id] ?? Blank}));

/** the frames where the picture cuts */
const CUTS = TL.shots.map((s) => fr(s.from));

export const DiagPromo: React.FC<{audio?: boolean}> = ({audio = true}) => (
  <AbsoluteFill style={{background: '#000'}}>
    {BLOCKS.map((b) => {
      const s = TL.shots.find((x) => x.id === b.id)!;
      const from = fr(s.from);
      const to = fr(s.to);
      const Comp = b.C;
      return (
        <Sequence key={b.id} from={from} durationInFrames={to - from} layout="none">
          <AbsoluteFill>
            <Comp />
          </AbsoluteFill>
        </Sequence>
      );
    })}
    <Subs cuts={CUTS} />
    {audio ? <Audio src={staticFile('vo/diagpromo/mix.wav')} /> : null}
  </AbsoluteFill>
);
