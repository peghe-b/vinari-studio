// No adapter? (v2.1: the AD on v2: the same hand-from-the-left rig four times, twice back to back; phones fading in as ghosts;
// props under the subtitle): the sound diagnosis, each real screen once, each in its own place and staging:
//   nosound  from straight above, his phone lying on the graphite car's bonnet; it slides up from below the frame onto the paint
//            (one opaque unit, eased, a soft settle) on the first question; the tap on „ორმოებზე"
//   record   over his shoulder on the street: the car parked whole, his RIGHT hand holds the phone out toward its front wheel,
//            recording: the knocks come off the wheel as soft pulses and the waveform on the real screen comes alive
//   diag     the phone lying on the workbench's oak (from above, at a slant), the diagnosis on it; its urgency lifts („ორ
//            კვირაში"), then the light window walks down onto the likely causes; nothing else on the bench
//   tell     at the garage's open door in the day: he walks up reading his phone, the mechanic at his bench inside; the very
//            sentence for the mechanic lifts as a speech bubble (the capture's own words)
// Text only black or white.
import React from 'react';
import {mtav} from '../lib/format';
import {F} from '../tokens';
import {clamp, E, lerp, prog, sp} from './lib';
import {Car3, projectCar, type CarCam} from './kit/car3d';
import {atFoot, bodyBox, float, Lift, Phone3, ScreenLayer, type Pose, type Rect} from './kit/phone3d';
import {GripBack, GripFront} from './kit/grip';
import {Mechanic, Owner} from './kit/people';
import {Street} from './kit/street';
import {bandOf, DAY_SKIN, inPlace, mid, pad, R} from './Explain';
import {AMBER, Card, INK, riseFoot, riseIn, Svg, useShot, WHITE} from './kit/stage';

const DIAG = '13-diagnosis-108';

/** a phone in his RIGHT hand, the arm leaving by the frame's right side (the grip as built, not mirrored) */
const HeldRight: React.FC<{pose: Pose; uid: string; children: React.ReactNode}> = ({pose, uid, children}) => {
  const b = bodyBox(pose);
  return (
    <>
      <GripBack b={b} id={`${uid}b`} skin={DAY_SKIN} />
      {children}
      <GripFront b={b} id={`${uid}f`} skin={DAY_SKIN} />
    </>
  );
};

// ---- 35 nosound: high over the crossover's nose in the day, looking down its bonnet (the real car: the paint, the windscreen
// beyond, the grille and the lamps below); his phone slides up the bonnet from below the frame and settles lying on the paint (one
// opaque unit, eased, a soft settle) on the first question; the tap on „ორმოებზე" ---------------------------------------------
const NS_CAM0: CarCam = {pos: [0.35, 4.3, 3.9], target: [0.0, 0.9, 0.95], fov: 40};
const NS_CAM1: CarCam = {pos: [0.3, 4.15, 3.75], target: [0.0, 0.9, 0.95], fov: 40};
export const NosoundShot: React.FC = () => {
  const {t, len, L} = useShot('nosound');
  const riseAt = L('askRise');
  const tapAt = L('potTap');
  const r = riseIn(t, riseAt, 30);
  const k = E.inOut(prog(t, 0, len));
  const cam: CarCam = {pos: [lerp(NS_CAM0.pos[0], NS_CAM1.pos[0], k), lerp(NS_CAM0.pos[1], NS_CAM1.pos[1], k), lerp(NS_CAM0.pos[2], NS_CAM1.pos[2], k)], target: NS_CAM0.target, fov: 40};
  const W = 440;
  const PITCH = 36;
  const ratio = bodyBox({x: 540, y: 960, w: 100, yaw: 0, pitch: PITCH, roll: 0}).h / 100;
  const H = W * ratio;
  const pose = atFoot({x: lerp(556, 540, clamp(r)), w: W, yaw: 0, pitch: PITCH, roll: lerp(-12, -5, clamp(r))}, riseFoot(r, 1240, H));
  const bb = bodyBox(pose);
  const bandA = prog(t, tapAt - 12, 6);
  const tap = mid(R.potholes);
  const lk = sp(t, tapAt - 10, 150, 18) * (1 - E.inOut(prog(t, tapAt + 2, 6)));
  return (
    <div style={{position: 'absolute', inset: 0, background: '#D9DADC', overflow: 'hidden'}}>
      <Svg>
        <defs>
          <linearGradient id="nsGround" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#CFD0D2" />
            <stop offset="1" stopColor="#B9BABC" />
          </linearGradient>
        </defs>
        <rect width={1080} height={1920} fill="url(#nsGround)" />
      </Svg>
      <Car3 cam={cam} night={0} shadow={1} lamp={0.25} paint="#5E5B57" style={{filter: 'brightness(0.86)'}} />
      {/* the phone's soft contact shadow on the paint, with it */}
      {r > 0.001 ? <div style={{position: 'absolute', left: bb.x + bb.w * 0.04, top: bb.y + bb.h * 0.08, width: bb.w * 0.94, height: bb.h * 0.94, borderRadius: bb.w * 0.16, background: 'rgba(0,0,0,0.45)', filter: 'blur(22px)', transform: `translate(10px, 16px) rotate(${-(pose.roll ?? 0)}deg)`}} /> : null}
      {r > 0.001 ? (
        <>
          <Phone3 src="11-diagnostics-start" pose={pose} rim={0.9} shadow={0} band={bandOf(pad(R.potholes, 12), bandA)} veil={0.22 * bandA} taps={[{x: tap.x, y: tap.y, k: (t - tapAt) / 16}]} />
          {lk > 0.002 ? <Lift src="11-diagnostics-start" r={R.potholes} pose={pose} to={inPlace(pose, R.potholes, 1.08)} k={lk} radius={18} /> : null}
        </>
      ) : null}
    </div>
  );
};

// ---- 36 record: over his shoulder on a quiet street in the day: the crossover parked whole at the kerb; his right hand holds
// the phone out toward its front wheel, recording; the knocks come off the wheel as soft pulses, the waveform comes alive; his
// shoulder soft and dark at the right edge ---------------------------------------------------------------------------------------
const RC_CAM: CarCam = {pos: [8.6, 1.75, 11.6], target: [0.6, 0.7, 0.33], fov: 34};
const RC_DY = -330;
export const RecordShot: React.FC = () => {
  const {t, len, L, Ls} = useShot('record');
  const recAt = L('rec');
  const knocks = Ls('knocks');
  const k = E.inOut(prog(t, 0, len));
  const cam: CarCam = {...RC_CAM, pos: [lerp(8.6, 8.4, k), 1.75, lerp(11.6, 11.35, k)]};
  const wheel = projectCar(cam, [0.99, 0.39, 1.535]);
  const fl = float(t);
  // the phone reaches a little further toward the wheel as he records
  const reach = E.inOut(prog(t, 0, len));
  const pose = atFoot({x: lerp(640, 600, reach), w: 330, yaw: -18 + fl.roll, pitch: 8 + fl.pitch, roll: lerp(8, 6, reach)}, lerp(1250, 1230, reach));
  const live = t >= recAt ? 1 : 0;
  const bars = Array.from({length: 33}, (_, i) => {
    const d = Math.abs(i - 16) / 16;
    let a = 0.15 + 0.25 * (1 - d) * (0.6 + 0.4 * Math.sin(t / 2 + i * 1.3));
    for (const kn of knocks) {
      const q = (t - kn) / 9;
      if (q > 0 && q < 1) a += (1 - q) * (1 - d * 0.7) * (0.6 + 0.4 * Math.sin(i * 2.1 + kn));
    }
    return clamp(a) * live;
  });
  const micPulse = live ? 1 + 0.08 * Math.sin(t / 3) : 1;
  return (
    <div style={{position: 'absolute', inset: 0, background: '#EDEDED', overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, transform: `translateY(${RC_DY}px)`}}>
        <div style={{position: 'absolute', inset: 0, filter: 'blur(4px)'}}>
          <Street cam={cam} uid="rc" look="day" nearTree={false} />
        </div>
        <Car3 cam={cam} night={0} shadow={1} lamp={0.2} />
      </div>
      <Svg>
        <defs>
          <radialGradient id="rcPulse" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor={AMBER} stopOpacity={0.4} />
            <stop offset="0.7" stopColor={AMBER} stopOpacity={0.1} />
            <stop offset="1" stopColor={AMBER} stopOpacity={0} />
          </radialGradient>
          <linearGradient id="rcCoat" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#2A2C31" />
            <stop offset="1" stopColor="#0C0D0F" />
          </linearGradient>
        </defs>
        {knocks.map((kn, i) => {
          const q = (t - kn) / 20;
          if (q < 0 || q > 1) return null;
          const rr = 30 + 150 * E.out(q);
          return <ellipse key={i} cx={wheel.x} cy={wheel.y + RC_DY} rx={rr} ry={rr * 0.9} fill="url(#rcPulse)" opacity={1 - q} />;
        })}
      </Svg>
      {/* his shoulder and the back of his head, close and soft at the right edge (we look over it) */}
      <Svg style={{filter: 'blur(14px)'}}>
        <path d="M1160 760Q1010 760 960 900Q930 1000 990 1080Q900 1130 860 1300L840 1960H1160Z" fill="url(#rcCoat)" />
        <ellipse cx={1060} cy={880} rx={120} ry={150} fill="#16171A" />
      </Svg>
      <HeldRight pose={pose} uid="rg">
        <Phone3 src="12-diagnostics-sound" pose={pose} />
        <ScreenLayer pose={pose}>
          {live ? (
            <>
              <div style={{position: 'absolute', left: 117, top: 1105, width: 846, height: 112, background: '#FFFFFF'}} />
              {bars.map((a, i) => (
                <div key={i} style={{position: 'absolute', left: 117 + i * 26, top: 1161 - (8 + 96 * a) / 2, width: 12, height: 8 + 96 * a, borderRadius: 6, background: i % 2 ? '#0B0B0B' : '#2B2B2B', opacity: 0.85}} />
              ))}
              <div style={{position: 'absolute', left: 539 - 108 * micPulse, top: 827 - 108 * micPulse, width: 216 * micPulse, height: 216 * micPulse, borderRadius: 999, background: 'rgba(11,11,11,0.1)'}} />
              <div style={{position: 'absolute', left: 539 - 76, top: 827 - 76, width: 152, height: 152, borderRadius: 999, background: '#0B0B0B', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <div style={{width: 46, height: 46, borderRadius: 8, background: '#FFFFFF'}} />
              </div>
            </>
          ) : null}
        </ScreenLayer>
      </HeldRight>
    </div>
  );
};

// ---- 37 diag: the phone lying on the workbench's oak (from above, at a slant), the diagnosis on it; its urgency lifts („ორ
// კვირაში"), then the light window walks down onto the likely causes. v2.1 (the AD): the phone's top under y 260, nothing else on
// the bench (the subtitle sits on plain wood) -----------------------------------------------------------------------------------------
export const DiagShot: React.FC = () => {
  const {t, len, L} = useShot('diag');
  const urgent = L('urgent');
  const causes = L('causes');
  const k = E.inOut(prog(t, 0, len));
  const pose = {x: 560, y: 820, w: lerp(420, 430, k), yaw: 0, pitch: 0, roll: lerp(7, 5.5, k)};
  const lk = sp(t, urgent, 140, 18) * (1 - E.inOut(prog(t, causes - 8, 8)));
  const top = bodyBox(pose).y;
  const to: Rect = {x: 70, y: Math.max(270, top + 30), w: 940, h: (940 * (R.urgency.y1 - R.urgency.y0) * 2346) / ((R.urgency.x1 - R.urgency.x0) * 1080)};
  const ca = prog(t, causes - 4, 6);
  // a cut closer on the causes when the voice reaches them (about the phone's middle, its top still under y 260)
  const closer = t >= causes - 3 ? 1.06 : 1;
  return (
    <div style={{position: 'absolute', inset: 0, background: '#8A6A4C', overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${closer})`, transformOrigin: '560px 900px'}}>
        <Svg>
          <defs>
            <linearGradient id="dgOak" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#B08A64" />
              <stop offset="1" stopColor="#8B6844" />
            </linearGradient>
          </defs>
          <rect width={1080} height={1920} fill="url(#dgOak)" />
          {Array.from({length: 26}, (_, i) => (
            <path key={i} d={`M-40 ${i * 80 + 20}C300 ${i * 80 + 50} 700 ${i * 80 - 10} 1120 ${i * 80 + 30}`} stroke={i % 2 ? '#9C7752' : '#7E5E3E'} strokeWidth={i % 3 ? 2 : 4} fill="none" opacity={0.4} />
          ))}
        </Svg>
        <Phone3 src={DIAG} pose={pose} band={ca > 0 ? bandOf(R.causes, ca) : null} veil={0.3 * clamp(lk) + 0.28 * ca} shadow={1} />
        {t >= urgent - 1 && lk > 0.002 ? <Lift src={DIAG} r={R.urgency} pose={pose} to={to} k={lk} radius={40} /> : null}
      </div>
    </div>
  );
};

// ---- 38 tell: at the garage's open door in the day (v2.1, the AD: not an empty void): he walks up reading his phone, then
// lifts his head toward the mechanic at his bench inside; the very sentence the app gives him for the mechanic lifts over the
// door as a speech bubble (the capture's own words) --------------------------------------------------------------------------------
export const TellShot: React.FC = () => {
  const {t, len, L} = useShot('tell');
  const q = L('quote');
  const k = E.inOut(prog(t, 0, len));
  const bk = sp(t, q, 140, 17);
  const walk = E.out(prog(t, 0, 22));
  const ox = lerp(150, 236, walk);
  const BX = 330;
  const BY = 290;
  const BW = 690;
  const BH = 520;
  return (
    <div style={{position: 'absolute', inset: 0, background: '#E9E9E9', overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${lerp(1, 1.03, k)})`, transformOrigin: '540px 1300px'}}>
        <Svg>
          <defs>
            <linearGradient id="tlWall" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#F1F1F1" />
              <stop offset="1" stopColor="#E2E2E2" />
            </linearGradient>
            <linearGradient id="tlIn" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#8E8B86" />
              <stop offset="1" stopColor="#6E6B66" />
            </linearGradient>
            <linearGradient id="tlYard" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#D9D9D9" />
              <stop offset="1" stopColor="#C9C9C9" />
            </linearGradient>
          </defs>
          {/* the workshop's front wall, the open roll-up door on the right, its drum above; the forecourt */}
          <rect width={1080} height={1920} fill="url(#tlWall)" />
          <rect x={430} y={520} width={700} height={880} fill="url(#tlIn)" />
          <rect x={400} y={470} width={760} height={60} fill="#B4B4B4" />
          {Array.from({length: 4}, (_, i) => (
            <rect key={i} x={400} y={478 + i * 13} width={760} height={6} fill="#A2A2A2" />
          ))}
          <rect x={400} y={520} width={34} height={880} fill="#BDBDBD" />
          <path d="M-40 1390H1120V1960H-40Z" fill="url(#tlYard)" />
          <path d="M-40 1390H1120" stroke="#BEBEBE" strokeWidth={6} />
        </Svg>
        {/* inside, soft: the bench, the pegboard's tools, the mechanic at his bench */}
        <Svg style={{filter: 'blur(4px)'}}>
          <rect x={560} y={760} width={480} height={240} rx={6} fill="#7D7A75" />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <rect key={i} x={590 + i * 54} y={790} width={12} height={110 + (i % 3) * 30} rx={6} fill="#4A4744" />
          ))}
          <rect x={540} y={1090} width={560} height={40} fill="#5E5B57" />
          <rect x={560} y={1130} width={520} height={270} fill="#66635F" />
          <Mechanic uid="tm" x={780} y={1390} size={560} frame={t} pose="hold" hold="wrench" face="meh" turn={-0.8} light="day" bend={18} />
        </Svg>
        <Svg>
          <ellipse cx={ox} cy={1392} rx={150} ry={18} fill="#000" opacity={0.1} />
          <Owner uid="to" x={ox} y={1390} size={960} frame={t + 20} pose="walk" hold="phone" face="smirk" turn={0.82} light="day" acts={[{at: 20, pose: 'phoneLook', face: 'smirk'}, {at: q - 6, pose: 'stand', face: 'smile'}]} />
        </Svg>
      </div>
      {bk > 0.01 ? (
        <>
          <Svg>
            <path d={`M${BX + 40} ${BY + BH - 110}L${BX - 50} ${BY + BH + 10}L${BX + 70} ${BY + BH - 30}Z`} fill={WHITE} opacity={clamp(bk * 1.5)} />
          </Svg>
          <Card x={BX} y={BY} w={BW} h={BH} k={bk} r={48}>
            <div style={{position: 'absolute', left: 50, top: 44, display: 'flex', alignItems: 'center', gap: 14, fontFamily: F.sans, fontWeight: 500, fontSize: 31, color: INK, whiteSpace: 'nowrap'}}>
              <svg width={36} height={36} viewBox="0 0 24 24">
                <path d="M14.7 6.3A4 4 0 0 0 9.6 11.4L4 17L7 20L12.6 14.4A4 4 0 0 0 17.7 9.3L15.4 11.6L12.4 8.6Z" fill="none" stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />
              </svg>
              {mtav('რა უთხრა ხელოსანს')}
            </div>
            {/* the app's own sentence for the mechanic (13-diagnosis), word for word */}
            <div style={{position: 'absolute', left: 50, right: 44, top: 108, fontFamily: F.sans, fontWeight: 600, fontSize: 46, lineHeight: 1.24, color: INK}}>
              „ორმოებზე წინიდან აკაკუნებს. შარავო, სტოიკები და სუხოის რეზინები შემიმოწმეთ.“
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
};

export const SHOTS: Record<string, React.FC> = {nosound: NosoundShot, record: RecordShot, diag: DiagShot, tell: TellShot};
