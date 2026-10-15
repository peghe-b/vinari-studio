// No adapter? (v2): the sound diagnosis, each real screen once, each in its own place: its first question in his hand on a
// bright street („როდის გაწუხებს მანქანა?", the tap on „ორმოებზე"), the recording by the crossover parked at a white wall (the
// phone held toward its front wheel, the knocks coming off it, the waveform alive), the diagnosis on the workbench (the urgency
// lifted, the band on the likely causes), and the very sentence to say to the mechanic as a speech bubble from him. Text only
// black or white.
import React from 'react';
import {mtav} from '../lib/format';
import {F} from '../tokens';
import {clamp, E, lerp, prog, sp} from './lib';
import {Car3, projectCar, type CarCam} from './kit/car3d';
import {atFoot, bodyBox, float, Lift, Phone3, ScreenLayer, type Rect} from './kit/phone3d';
import {Owner} from './kit/people';
import {bandOf, HeldLeft, inPlace, mid, pad, R} from './Explain';
import {AMBER, Card, INK, rise, Svg, useShot, WHITE} from './kit/stage';

const DIAG = '13-diagnosis-108';

// ---- 35 nosound: a bright street behind, soft; his hand brings the phone up slowly on the first question; the tap on „ორმოებზე" -
export const NosoundShot: React.FC = () => {
  const {t, L} = useShot('nosound');
  const tapAt = L('potTap');
  const r = rise(t, 0, 28);
  const fl = float(t);
  const pose = atFoot({x: 570, w: 450, yaw: lerp(16, 9, r) + fl.roll, pitch: lerp(14, 6, r) + fl.pitch, roll: lerp(-7, -4, r)}, lerp(1560, 1390, r));
  const bandA = prog(t, tapAt - 12, 6);
  const tap = mid(R.potholes);
  const lk = sp(t, tapAt - 10, 150, 18) * (1 - E.inOut(prog(t, tapAt + 2, 6)));
  return (
    <div style={{position: 'absolute', inset: 0, background: '#EEF0F2', overflow: 'hidden'}}>
      <Svg style={{filter: 'blur(14px)'}}>
        <rect width={1080} height={1920} fill="#F2F3F5" />
        <rect x={-40} y={300} width={360} height={900} fill="#DADDE2" />
        <rect x={360} y={420} width={300} height={780} fill="#E4E6EA" />
        <rect x={700} y={340} width={420} height={860} fill="#D3D7DD" />
        {[0, 1, 2].map((i) => (
          <rect key={i} x={40 + i * 90} y={420} width={50} height={110} fill="#C4C9D0" />
        ))}
        <rect x={-40} y={1200} width={1160} height={720} fill="#C9CCD1" />
        <ellipse cx={760} cy={1150} rx={260} ry={90} fill="#8C9096" opacity={0.6} />
      </Svg>
      <HeldLeft pose={pose} uid="ns">
        <Phone3 src="11-diagnostics-start" pose={pose} band={bandOf(pad(R.potholes, 12), bandA)} veil={0.22 * bandA} taps={[{x: tap.x, y: tap.y, k: (t - tapAt) / 16}]} opacity={clamp(r * 3)} />
        {lk > 0.002 ? <Lift src="11-diagnostics-start" r={R.potholes} pose={pose} to={inPlace(pose, R.potholes, 1.08)} k={lk} radius={18} /> : null}
      </HeldLeft>
    </div>
  );
};

// ---- 36 record: the crossover parked at a white wall in the day, whole; in the foreground his hand holds the phone toward its
// front wheel, recording: the knocks come off the wheel as soft pulses and the waveform on the real screen comes alive -----------
const RC_CAM: CarCam = {pos: [-10.5, 2.4, 15.5], target: [0.0, 0.8, 0.4], fov: 30};
const RC_DY = -400;
export const RecordShot: React.FC = () => {
  const {t, len, L, Ls} = useShot('record');
  const recAt = L('rec');
  const knocks = Ls('knocks');
  const k = E.inOut(prog(t, 0, len));
  const cam: CarCam = {...RC_CAM, pos: [lerp(-10.5, -10.1, k), 2.4, lerp(15.5, 15.0, k)]};
  const wheel = projectCar(cam, [-0.99, 0.39, 1.535]);
  const fl = float(t);
  const pose = atFoot({x: 650, w: 320, yaw: -14 + fl.roll, pitch: 8 + fl.pitch, roll: 6}, 1310);
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
    <div style={{position: 'absolute', inset: 0, background: '#ECECEC', overflow: 'hidden'}}>
      <Svg>
        <defs>
          <linearGradient id="rcWall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FAFAFA" />
            <stop offset="1" stopColor="#EDEDED" />
          </linearGradient>
        </defs>
        <rect width={1080} height={1920} fill="url(#rcWall)" />
        <path d="M-40 760L1120 700L1120 1920L-40 1920Z" fill="#D8D8D8" />
        <path d="M-40 760L1120 700" stroke="#C4C4C4" strokeWidth={4} />
        {/* a parking bay's painted corner on the ground */}
        <path d="M60 1120L1040 1010" stroke={WHITE} strokeWidth={10} opacity={0.9} />
      </Svg>
      <div style={{position: 'absolute', inset: 0, transform: `translateY(${RC_DY}px)`}}>
        <Car3 cam={cam} night={0} shadow={1} lamp={0.2} />
      </div>
      <Svg>
        <defs>
          <radialGradient id="rcPulse" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor={AMBER} stopOpacity={0.4} />
            <stop offset="0.7" stopColor={AMBER} stopOpacity={0.1} />
            <stop offset="1" stopColor={AMBER} stopOpacity={0} />
          </radialGradient>
        </defs>
        {knocks.map((kn, i) => {
          const q = (t - kn) / 20;
          if (q < 0 || q > 1) return null;
          const r = 30 + 170 * E.out(q);
          return <ellipse key={i} cx={wheel.x} cy={wheel.y + RC_DY} rx={r} ry={r * 0.9} fill="url(#rcPulse)" opacity={1 - q} />;
        })}
      </Svg>
      <HeldLeft pose={pose} uid="rg">
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
      </HeldLeft>
    </div>
  );
};

// ---- 37 diag: the phone lying on the workbench's oak (from above, at a slant), the diagnosis on it; its urgency lifts („ორ
// კვირაში"), then the light window walks down onto the likely causes ---------------------------------------------------------------
export const DiagShot: React.FC = () => {
  const {t, len, L} = useShot('diag');
  const urgent = L('urgent');
  const causes = L('causes');
  const k = E.inOut(prog(t, 0, len));
  const pose = {x: 560, y: 820, w: lerp(470, 490, k), yaw: 0, pitch: 0, roll: lerp(8, 6, k)};
  const lk = sp(t, urgent, 140, 18) * (1 - E.inOut(prog(t, causes - 8, 8)));
  const top = bodyBox(pose).y;
  const to: Rect = {x: 70, y: Math.max(250, top + 30), w: 940, h: (940 * (R.urgency.y1 - R.urgency.y0) * 2346) / ((R.urgency.x1 - R.urgency.x0) * 1080)};
  const ca = prog(t, causes - 4, 6);
  // a hard cut closer on the causes when the voice reaches them
  const closer = t >= causes - 3 ? 1.08 : 1;
  return (
    <div style={{position: 'absolute', inset: 0, background: '#8A6A4C', overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${closer})`, transformOrigin: '560px 830px'}}>
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
        {/* a few things on the bench: a socket, a rag, a bolt */}
        <circle cx={150} cy={1500} r={52} fill="#5A5C61" />
        <circle cx={150} cy={1500} r={28} fill="#2A2B2F" />
        <path d="M860 1420Q960 1380 1040 1460Q980 1560 880 1520Z" fill="#6F6A63" />
      </Svg>
      <Phone3 src={DIAG} pose={pose} band={ca > 0 ? bandOf(R.causes, ca) : null} veil={0.3 * clamp(lk) + 0.28 * ca} shadow={1} />
      {t >= urgent - 1 && lk > 0.002 ? <Lift src={DIAG} r={R.urgency} pose={pose} to={to} k={lk} radius={40} /> : null}
      </div>
    </div>
  );
};

// ---- 38 tell: in the white world, him in profile, and over his shoulder the very sentence the app gives him for the mechanic, as
// a speech bubble (the capture's own words) -----------------------------------------------------------------------------------------
export const TellShot: React.FC = () => {
  const {t, len, L} = useShot('tell');
  const q = L('quote');
  const k = E.inOut(prog(t, 0, len));
  const bk = sp(t, q, 140, 17);
  const BX = 300;
  const BY = 330;
  const BW = 700;
  const BH = 560;
  return (
    <div style={{position: 'absolute', inset: 0, background: '#F3F3F3', overflow: 'hidden'}}>
      <Svg>
        <ellipse cx={200} cy={1392} rx={150} ry={18} fill="#000" opacity={0.08} />
        <Owner uid="to" x={lerp(205, 200, k)} y={1390} size={950} frame={t + 20} pose="phoneLook" hold="phone" face="smirk" turn={0.85} light="day" acts={[{at: q - 6, pose: 'stand', face: 'smile'}]} />
      </Svg>
      {bk > 0.01 ? (
        <>
          <Svg>
            <path d={`M${BX + 40} ${BY + BH - 120}L${BX - 50} ${BY + BH - 10}L${BX + 40} ${BY + BH - 40}Z`} fill={WHITE} opacity={clamp(bk * 1.5)} />
          </Svg>
          <Card x={BX} y={BY} w={BW} h={BH} k={bk} r={48}>
            <div style={{position: 'absolute', left: 54, top: 48, display: 'flex', alignItems: 'center', gap: 14, fontFamily: F.sans, fontWeight: 600, fontSize: 32, color: '#6E6E6E', whiteSpace: 'nowrap'}}>
              <svg width={38} height={38} viewBox="0 0 24 24">
                <path d="M14.7 6.3A4 4 0 0 0 9.6 11.4L4 17L7 20L12.6 14.4A4 4 0 0 0 17.7 9.3L15.4 11.6L12.4 8.6Z" fill="none" stroke="#6E6E6E" strokeWidth={1.8} strokeLinejoin="round" />
              </svg>
              {mtav('რა უთხრა ხელოსანს')}
            </div>
            {/* the app's own sentence for the mechanic (13-diagnosis), word for word */}
            <div style={{position: 'absolute', left: 54, right: 46, top: 116, fontFamily: F.sans, fontWeight: 600, fontSize: 48, lineHeight: 1.24, color: INK}}>
              „ორმოებზე წინიდან აკაკუნებს. შარავო, სტოიკები და სუხოის რეზინები შემიმოწმეთ.“
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
};

void ScreenLayer;
void mtav;
void F;
void INK;
export const SHOTS: Record<string, React.FC> = {nosound: NosoundShot, record: RecordShot, diag: DiagShot, tell: TellShot};
