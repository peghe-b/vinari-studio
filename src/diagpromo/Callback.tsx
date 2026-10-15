// The callback, the same garage in the daylight (the roll-up door open, the car down off the lift): the owner holds his phone
// out to the mechanic: „ნახე: P0300, ცილინდრი ტოვებს. ჯერ სანთლები შეამოწმე." (the phone close: the real result, the code
// and the cause banded); the mechanic, small at his bench: „ჰო. კი, ბატონო."
import React from 'react';
import {E, lerp, prog, sp, clamp} from './lib';
import {useShot, mixCam, personAt} from './Act1';
import {Car3, type CarCam} from './kit/car3d';
import {Garage} from './kit/garage';
import {Mechanic, Owner} from './kit/people';
import {atFoot, bodyBox, float, Phone3} from './kit/phone3d';
import {GripBack, GripFront} from './kit/grip';
import {silPal} from './kit/sil/sil';
import {bandOf, R} from './Explain';

const D_CAM0: CarCam = {pos: [1.7, 1.3, 10.6], target: [0.0, 0.92, 0.3], fov: 36};
const D_CAM1: CarCam = {pos: [1.5, 1.28, 10.0], target: [0.0, 0.92, 0.4], fov: 36};
export const DAY_SKIN = silPal({light: true, hue: '#B89A84', b: '#6A6A6A', time: 'day', level: 1}).lit;

export const ShowShot: React.FC = () => {
  const {t, len, L} = useShot('show');
  const show = L('show');
  const cam = mixCam(D_CAM0, D_CAM1, E.inOut(prog(t, 0, len)));
  const o = personAt(cam, -0.78, 3.0, 1.8);
  const m = personAt(cam, 0.82, 3.25, 1.76);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#E6E6E6', overflow: 'hidden'}}>
      <Garage cam={cam} uid="sd" look="day" lift={0} />
      <Car3 cam={cam} night={0} shadow={1} />
      <Garage cam={cam} uid="sdf" look="day" layer="front" lift={0} />
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        {m ? <Mechanic uid="sm" x={m.x} y={m.y} size={m.size} frame={t} pose="crossArms" face="meh" turn={-0.85} light="day" acts={[{at: show + 10, pose: 'stand', face: 'worried'}]} /> : null}
        {o ? <Owner uid="so" x={o.x} y={o.y} size={o.size} frame={t + 30} pose="stand" face="smile" turn={0.85} hold="phone" light="day" acts={[{at: show - 6, pose: 'offer', face: 'smirk'}]} /> : null}
      </svg>
    </div>
  );
};

// the phone close in his hand: the real result, the band on the code row and the cause; the garage soft behind it
export const ShowPhoneShot: React.FC = () => {
  const {t, len} = useShot('showPhone');
  const k = E.inOut(prog(t, 0, len));
  const fl = float(t);
  const pose = atFoot({x: 500, w: lerp(470, 490, k), yaw: -9 + fl.roll, pitch: 5 + fl.pitch, roll: 3}, 1360);
  const b = bodyBox(pose);
  const cam: CarCam = {pos: [1.2, 1.6, 8.5], target: [0.2, 0.15, 0.3], fov: 40};
  const a1 = prog(t, 4, 6) * (1 - prog(t, len * 0.5, 6));
  const a2 = prog(t, len * 0.5, 6);
  const band = a2 > 0 ? bandOf(R.resCause, a2) : bandOf(R.resCode, a1);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#E6E6E6', overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, filter: 'blur(14px)', transform: 'scale(1.08)', opacity: 0.85}}>
        <Garage cam={cam} uid="spd" look="day" lift={0} />
        <Car3 cam={cam} night={0} shadow={1} />
      </div>
      <GripBack b={b} id="spb" skin={DAY_SKIN} />
      <Phone3 src="22-obd-result" pose={pose} band={band} veil={0.3 * clamp(a1 + a2)} />
      <GripFront b={b} id="spf" skin={DAY_SKIN} />
    </div>
  );
};

const B_CAM: CarCam = {pos: [1.0, 1.3, 6.5], target: [-3.0, 0.75, 3.2], fov: 36};
export const SmallShot: React.FC = () => {
  const {t, len, L} = useShot('small');
  const ho = L('ho');
  const kb = L('kiBatono');
  const k = E.inOut(prog(t, 0, len));
  const cam: CarCam = {...B_CAM, pos: [lerp(1.0, 0.75, k), 1.3, lerp(6.5, 6.25, k)]};
  const m = personAt(cam, -3.0, 3.4, 1.76);
  const nod = sp(t, ho, 160, 12);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#E6E6E6', overflow: 'hidden'}}>
      <Garage cam={cam} uid="smd" look="day" lift={0} />
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        {m ? (
          <Mechanic
            uid="smm"
            x={m.x}
            y={m.y + 2 * Math.sin(Math.PI * clamp(nod))}
            size={m.size}
            frame={t}
            pose="crossArms"
            face="meh"
            turn={0.85}
            light="day"
            acts={[
              {at: ho - 3, pose: 'stand', face: 'worried'},
              {at: kb - 3, pose: 'slumped', face: 'sad'},
            ]}
          />
        ) : null}
      </svg>
    </div>
  );
};
