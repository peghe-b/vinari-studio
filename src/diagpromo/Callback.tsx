// The callback v2.1 (the AD on v2: the daylight callback repeated the fight's lift, car-nose and two-men composition; the owner
// held a rigid zombie arm; the mechanic's cap broke the top band and the line ran over his arm): the garage's counter in the
// day, its roll-up door open behind (soft, bright). Three set-ups, shot / reverse shot:
//   show   both men waist-up behind the counter: the owner holds his phone out over it, calm now: „ნახე: P0300, ცილინდრი
//          ტოვებს." the mechanic leans in to read, his cigarette in his lips
//   smart  close on the owner, sure of himself: a short jab of the finger on „ჯერ სანთლები შეამოწმე.", a small lean, a nod
//   ho     close on the mechanic behind the counter: „ჰო." his cigarette droops; „კი, ბატონო." he nods and looks down. A box of
//          spark plugs on the counter. The line under them always sits on the counter's plain front.
import React from 'react';
import {mtav} from '../lib/format';
import {F} from '../tokens';
import {E, lerp, prog, sp, clamp} from './lib';
import {type CarCam} from './kit/car3d';
import {Garage} from './kit/garage';
import {Mechanic, Owner} from './kit/people';
import {breath, cssCam, Svg, useShot} from './kit/stage';

/** the garage behind the counter, soft: its open roll-up door and the bright street (the side wall), or the pegboard */
const Behind: React.FC<{cam: CarCam; uid: string; blur?: number; dim?: number}> = ({cam, uid, blur = 10, dim = 1}) => (
  <div style={{position: 'absolute', inset: 0, filter: `blur(${blur}px) brightness(${dim})`, transform: 'scale(1.06)', transformOrigin: '540px 900px'}}>
    <Garage cam={cam} uid={uid} look="day" lift={0} />
  </div>
);

/** the counter across the lower frame: its laminate top with a soft edge light, the plain front (the subtitle's calm ground) */
const Counter: React.FC<{y: number; uid: string; plugs?: number; mug?: number}> = ({y, uid, plugs, mug}) => (
  <Svg>
    <defs>
      <linearGradient id={`${uid}top`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#F2F2F2" />
        <stop offset="1" stopColor="#DADADA" />
      </linearGradient>
      <linearGradient id={`${uid}fr`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#D2D2D2" />
        <stop offset="1" stopColor="#C4C4C4" />
      </linearGradient>
    </defs>
    {plugs !== undefined ? (
      <g transform={`translate(${plugs} ${y - 96})`}>
        {/* a small box of spark plugs, its window showing two of them */}
        <rect x={0} y={0} width={150} height={100} rx={8} fill="#2B2D33" />
        <rect x={14} y={20} width={122} height={52} rx={6} fill="#E9E9E9" />
        {[44, 94].map((x) => (
          <g key={x}>
            <rect x={x - 6} y={26} width={12} height={20} rx={3} fill="#8E8E8E" />
            <rect x={x - 9} y={44} width={18} height={22} rx={4} fill="#F7F7F7" />
          </g>
        ))}
      </g>
    ) : null}
    {mug !== undefined ? (
      <g transform={`translate(${mug} ${y - 70})`}>
        <rect x={0} y={0} width={56} height={70} rx={10} fill="#F4F4F4" />
        <path d="M56 16Q78 18 78 36Q78 54 56 56" stroke="#F4F4F4" strokeWidth={9} fill="none" />
      </g>
    ) : null}
    <rect x={-40} y={y} width={1160} height={44} rx={10} fill={`url(#${uid}top)`} />
    <rect x={-40} y={y + 40} width={1160} height={1920 - y} fill={`url(#${uid}fr)`} />
    <rect x={-40} y={y + 40} width={1160} height={8} fill="#B4B4B4" opacity={0.6} />
  </Svg>
);

const DOOR_CAM: CarCam = {pos: [2.2, 1.45, 2.6], target: [2.6, 1.35, -5.4], fov: 46};
const BOARD_CAM: CarCam = {pos: [0.6, 1.45, 3.8], target: [-4.6, 1.3, 3.0], fov: 34};

export const ShowShot: React.FC = () => {
  const {t, len, L} = useShot('show');
  const show = L('show');
  const k = E.inOut(prog(t, 0, len));
  const lean = 10 * E.inOut(prog(t, show + 10, 14)) * (1 - 0.4 * E.inOut(prog(t, show + 64, 14)));
  const b = breath(t, 0.7);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#E6E6E6', overflow: 'hidden'}}>
      <div style={cssCam(lerp(1, 1.035, k), 540, 900, b.x, b.y, b.r)}>
        <Behind cam={DOOR_CAM} uid="sd" />
        <Svg>
          <Mechanic uid="sm" x={850} y={2230} size={1640} frame={t} pose="crossArms" face="meh" turn={-0.7} light="day" bend={lean} cig={0.3} acts={[{at: show + 8, pose: 'stand', face: 'worried'}]} />
          <Owner uid="so" x={262} y={2240} size={1720} frame={t + 30} pose="phoneLook" hold="phone" face="smile" turn={0.7} light="day" acts={[{at: show - 10, pose: 'offer', face: 'smirk'}]} />
        </Svg>
        <Counter y={1250} uid="sc" mug={150} />
      </div>
    </div>
  );
};

// close on the owner, the door's daylight behind him: a short jab of the finger on „ჯერ სანთლები შეამოწმე.", a lean and a nod
export const SmartShot: React.FC = () => {
  const {t, len, L} = useShot('smart');
  const at = L('sanTlebi');
  const k = E.inOut(prog(t, 0, len));
  const b = breath(t, 0.9);
  const lean = 6 * E.inOut(prog(t, at - 4, 8)) - 3 * E.inOut(prog(t, at + 10, 10));
  return (
    <div style={{position: 'absolute', inset: 0, background: '#6E6E6E', overflow: 'hidden'}}>
      <div style={cssCam(lerp(1, 1.03, k), 540, 900, b.x, b.y, b.r)}>
        {/* the reverse shot: the garage's shaded inside behind him (the line under him is white, on his jacket and the shade) */}
        <Behind cam={BOARD_CAM} uid="smd" blur={12} dim={0.5} />
        <Svg>
          <Owner uid="smo" x={lerp(505, 515, k)} y={2930} size={2600} frame={t + 60} pose="offer" hold="phone" face="smirk" turn={0.62} light="day" bend={lean} acts={[{at: at - 4, pose: 'pointYou', face: 'smile'}]} />
        </Svg>
      </div>
    </div>
  );
};

// close on the mechanic behind the counter (the pegboard soft behind): „ჰო." the cigarette droops; „კი, ბატონო." a small nod
export const HoShot: React.FC = () => {
  const {t, len, L} = useShot('ho');
  const ho = L('ho');
  const kb = L('kiBatono');
  const k = E.inOut(prog(t, 0, len));
  const droop = lerp(0.2, 1, E.inOut(prog(t, ho - 2, 16)));
  const nod = sp(t, kb, 160, 12);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#E2E2E2', overflow: 'hidden'}}>
      <Behind cam={BOARD_CAM} uid="hod" />
      <Svg>
        <Mechanic
          uid="hom"
          x={600}
          y={lerp(2560, 2540, k) + 12 * Math.sin(Math.PI * clamp(nod))}
          size={2200}
          frame={t}
          pose="stand"
          face="worried"
          turn={-0.78}
          light="day"
          cig={droop}
          smoke={0.6}
          bend={5 * E.inOut(prog(t, kb - 2, 10))}
          acts={[
            {at: ho - 3, face: 'sad'},
            {at: kb - 3, pose: 'slumped', face: 'sad'},
          ]}
        />
      </Svg>
      <Counter y={1240} uid="hc" plugs={160} />
    </div>
  );
};

void mtav;
void F;
export const SHOTS: Record<string, React.FC> = {show: ShowShot, smart: SmartShot, ho: HoShot};
