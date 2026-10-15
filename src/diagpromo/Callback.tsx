// The callback v2: the same garage in the day (the door up, the bonnet shut), framed straight on the car's nose like a mirror of
// the night's fight: the owner, calm now, holds his phone out to the mechanic: „ნახე: P0300, ცილინდრი ტოვებს." (the mechanic
// leans in to read, his cigarette in his lips); then low on the owner, sure of himself: „ჯერ სანთლები შეამოწმე."; then close
// on the mechanic: „ჰო." his cigarette droops, „კი, ბატონო." he nods and looks down.
import React from 'react';
import {E, lerp, prog, sp, clamp} from './lib';
import {Car3, type CarCam} from './kit/car3d';
import {Garage} from './kit/garage';
import {Mechanic, Owner} from './kit/people';
import {breath, cssCam, mixCam, personAt, Svg, useShot} from './kit/stage';

const SH_CAM0: CarCam = {pos: [0.15, 1.55, 10.6], target: [0, 1.05, 2.0], fov: 42};
const SH_CAM1: CarCam = {pos: [0.1, 1.53, 10.1], target: [0, 1.05, 2.05], fov: 42};

export const ShowShot: React.FC = () => {
  const {t, len, L} = useShot('show');
  const show = L('show');
  const cam = mixCam(SH_CAM0, SH_CAM1, E.inOut(prog(t, 0, len)));
  const o = personAt(cam, -0.78, 3.7, 1.82);
  const m = personAt(cam, 0.72, 3.5, 1.74);
  const lean = 16 * E.inOut(prog(t, show + 12, 12)) * (1 - E.inOut(prog(t, show + 60, 14)));
  return (
    <div style={{position: 'absolute', inset: 0, background: '#E6E6E6', overflow: 'hidden'}}>
      <Garage cam={cam} uid="sd" look="day" lift={0} />
      <Car3 cam={cam} night={0} shadow={1} lamp={0.3} cool={0.2} />
      <Garage cam={cam} uid="sdf" look="day" layer="front" lift={0} />
      <Svg>
        {m ? <Mechanic uid="sm" x={m.x} y={m.y} size={m.size} frame={t} pose="crossArms" face="meh" turn={-0.86} light="day" bend={lean} acts={[{at: show + 10, pose: 'stand', face: 'worried'}]} /> : null}
        {o ? <Owner uid="so" x={o.x} y={o.y} size={o.size} frame={t + 30} pose="stand" face="smile" turn={0.86} hold="phone" light="day" acts={[{at: show - 8, pose: 'offer', face: 'smirk'}]} /> : null}
      </Svg>
    </div>
  );
};

// low on the owner, the garage's day behind him (the door's light), sure of himself, pointing: „ჯერ სანთლები შეამოწმე."
const SM_CAM: CarCam = {pos: [2.6, 0.9, 8.4], target: [-0.6, 1.25, 3.4], fov: 36};
export const SmartShot: React.FC = () => {
  const {t, len, L} = useShot('smart');
  const at = L('sanTlebi');
  const k = E.inOut(prog(t, 0, len));
  const cam: CarCam = {...SM_CAM, pos: [lerp(2.6, 2.45, k), 0.9, lerp(8.4, 8.1, k)]};
  const o = personAt(cam, -0.78, 3.7, 1.82);
  const b = breath(t, 0.8);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#E6E6E6', overflow: 'hidden'}}>
      <div style={cssCam(1, 540, 900, b.x, b.y, b.r)}>
        <div style={{position: 'absolute', inset: 0, filter: 'blur(9px)'}}>
          <Garage cam={cam} uid="smd" look="day" lift={0} />
        </div>
        {/* his feet stay above the subtitle's line (the line never runs over his dark trousers) */}
        <Svg>{o ? <Owner uid="smo" x={560} y={1385} size={1080} frame={t + 60} pose="offer" face="smirk" turn={-0.82} hold="phone" light="day" acts={[{at: at - 4, pose: 'point', face: 'smile'}]} /> : null}</Svg>
      </div>
    </div>
  );
};

// close on the mechanic (from the chest up), the pegboard soft behind: „ჰო." the cigarette droops; „კი, ბატონო." a small nod
export const HoShot: React.FC = () => {
  const {t, len, L} = useShot('ho');
  const ho = L('ho');
  const kb = L('kiBatono');
  const k = E.inOut(prog(t, 0, len));
  const droop = lerp(0.2, 1, E.inOut(prog(t, ho - 2, 16)));
  const nod = sp(t, kb, 160, 12);
  const cam: CarCam = {pos: [0.6, 1.45, 3.8], target: [-4.6, 1.3, 3.0], fov: 34};
  return (
    <div style={{position: 'absolute', inset: 0, background: '#E2E2E2', overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, filter: 'blur(10px)', transform: `scale(${lerp(1.1, 1.13, k)})`}}>
        <Garage cam={cam} uid="hod" look="day" lift={0} />
      </div>
      <Svg>
        <Mechanic
          uid="hom"
          x={560}
          y={lerp(2930, 2900, k) + 14 * Math.sin(Math.PI * clamp(nod))}
          size={2700}
          frame={t}
          pose="stand"
          face="worried"
          turn={0.84}
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
    </div>
  );
};

export const SHOTS: Record<string, React.FC> = {show: ShowShot, smart: SmartShot, ho: HoShot};
