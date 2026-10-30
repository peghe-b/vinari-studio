// The OBD promo's real screens (all current Mercedes-Benz GLE captures, resized to 1080 x 2346; never the old Toyota or Honda
// files): the hub with „ყიდვამდე შემოწმება" tapped (his left hand, the street soft behind), the scan running in the footwell
// (his right hand, the adapter plugged), the result's lamp card lifted (240 km with the lamp on), the codes in Georgian and the
// readiness 7/8 lifted out of the result. Each phone rises slowly from below as one solid unit, whole, above the subtitle.
import React from 'react';
import {clamp, E, lerp, prog, sp} from './lib';
import {Car3, type CarCam} from './kit/car3d';
import {Street} from './kit/street';
import {atFoot, bodyBox, float, Lift, Phone3, ScreenLayer, TapRing, type Pose, type Rect, type Region} from './kit/phone3d';
import {AdapterBody, bandOf, FootwellDay, HeldLeft, HeldRight, inPlace, mid, pad, PortFace} from './kit/bits';
import {CheckDot, MarkCircle} from './kit/marks';
import {riseFoot, riseIn, Svg, useShot, WHITE, INK} from './kit/stage';

// the regions, measured 2026-10-30 on public/screens/obd-*.jpg (capture fractions of 1080 x 2346)
const px = (x0: number, y0: number, x1: number, y1: number): Region => ({x0: x0 / 1080, y0: y0 / 2346, x1: x1 / 1080, y1: y1 / 2346});
export const R = {
  hubBuy: px(90, 1050, 990, 1174),
  resLamp: px(55, 1466, 1025, 1659),
  rdy420: px(55, 1077, 1025, 1293),
  rdy171: px(55, 1295, 1025, 1466),
  rdyReady: px(55, 1716, 1025, 2346),
};
const LAMP_ICON = {u: 149 / 1080, v: 1528 / 2346};
const EVAP = {u: 117 / 1080, v: 2236 / 2346};
const SCAN_ROWS = [851, 966, 1096, 1226, 1341];

const toRect = (r: Region, x: number, y: number, w: number): Rect => ({x, y, w, h: (w * (r.y1 - r.y0) * 2346) / ((r.x1 - r.x0) * 1080)});

const SoftStreet: React.FC<{cam: CarCam; uid: string; blur?: number}> = ({cam, uid, blur = 14}) => (
  <div style={{position: 'absolute', inset: 0, filter: `blur(${blur}px)`, transform: 'scale(1.05)'}}>
    <Street cam={cam} uid={uid} look="day" nearTree={false} />
    <Car3 cam={cam} night={0} shadow={1} lamp={0.2} />
  </div>
);

// ---- hub: his left hand brings the phone up from below (the street soft behind, the crossover in it), VINARI's diagnostics hub;
// the tap on „ყიდვამდე შემოწმება", which lifts a little -----------------------------------------------------------------------------
const HB: CarCam = {pos: [8.6, 2.4, 12.29], target: [-0.41, 1.0, 0.29], fov: 36};
export const HubShot: React.FC = () => {
  const {t, L} = useShot('hub');
  const tapAt = L('tap');
  const r = riseIn(t, 0, 30);
  const fl = float(t);
  const W = 430;
  const H = W * 2.25;
  const pose = atFoot({x: 600, w: W, yaw: lerp(14, 9, clamp(r)) + fl.roll, pitch: lerp(10, 6, clamp(r)) + fl.pitch, roll: -3}, riseFoot(r, 1330, H));
  const bandA = prog(t, tapAt - 12, 6);
  const tap = mid(R.hubBuy);
  const lk = sp(t, tapAt - 10, 150, 18) * (1 - E.inOut(prog(t, tapAt + 4, 8)));
  return (
    <div style={{position: 'absolute', inset: 0, background: '#EDEDED', overflow: 'hidden'}}>
      <SoftStreet cam={HB} uid="hb" />
      <HeldLeft pose={pose} uid="hb">
        <Phone3 src="obd-hub" pose={pose} band={bandOf(pad(R.hubBuy, 14), bandA)} veil={0.24 * bandA} taps={[{x: tap.x, y: tap.y, k: (t - tapAt) / 16}]} />
        {lk > 0.002 ? <Lift src="obd-hub" r={R.hubBuy} pose={pose} to={inPlace(pose, R.hubBuy, 1.1)} k={lk} radius={40} /> : null}
      </HeldLeft>
    </div>
  );
};

// ---- again: a week later, back in the footwell: the adapter already in its port (its LED blinking), his right hand brings the
// phone up, the scan running: its five rows tick one by one --------------------------------------------------------------------------
const PORT_AT = {x: 300, y: 1020};
export const AgainShot: React.FC = () => {
  const {t, Ls} = useShot('again');
  const ticks = Ls('scanTicks');
  const r = riseIn(t, 0, 30);
  const fl = float(t);
  const W = 420;
  const H = W * 2.25;
  const pose = atFoot({x: 660, w: W, yaw: -10 + fl.roll, pitch: 7 + fl.pitch, roll: 4}, riseFoot(r, 1330, H));
  const PS = 0.46;
  const as = (PS * 440) / 380;
  const mouth = PORT_AT.y - (210 * PS) / 2;
  return (
    <div style={{position: 'absolute', inset: 0, background: '#2A2C31', overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, transform: 'scale(1.12)', transformOrigin: `${PORT_AT.x}px ${PORT_AT.y}px`, filter: 'blur(2px)'}}>
        <FootwellDay />
        <Svg>
          <PortFace cx={PORT_AT.x} cy={PORT_AT.y} s={PS} uid="agp" />
          <AdapterBody cx={PORT_AT.x} top={mouth + 6} s={as} led={0.75 + 0.25 * Math.sin(t / 2.2)} uid="aga" />
        </Svg>
      </div>
      <HeldRight pose={pose} uid="ag">
        <Phone3 src="obd-27-obd-scan" pose={pose} />
        <ScreenLayer pose={pose}>
          {SCAN_ROWS.map((y, i) => {
            const k = sp(t, ticks[i], 180, 14);
            return k > 0.01 ? (
              <div key={i} style={{position: 'absolute', left: 127 - 27, top: y - 27, width: 54, height: 54, borderRadius: 27, background: INK, opacity: clamp(k * 2), transform: `scale(${lerp(0.5, 1, clamp(k))})`, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <svg width={34} height={34} viewBox="-12 -12 24 24">
                  <path d="M-6 0.5L-1.8 4.6L6.5 -4.5" fill="none" stroke={WHITE} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            ) : null;
          })}
        </ScreenLayer>
      </HeldRight>
    </div>
  );
};

// ---- lamp240: the real result in his right hand at the crossover (soft behind): the lamp card lifts out big: „ანთია · 1 კოდი",
// „ჩეკით გავლილია 240 კმ"; an amber marker rings the lamp's icon ---------------------------------------------------------------------
const LP: CarCam = {pos: [7.5, 1.45, -12.99], target: [-0.26, 1.0, -0.15], fov: 34};
export const Lamp240Shot: React.FC = () => {
  const {t, len, L} = useShot('lamp240');
  const at = L('lampCard');
  const km = L('km');
  const k = E.inOut(prog(t, 0, len));
  const fl = float(t);
  const W = lerp(400, 412, k);
  const r = riseIn(t, 0, 30);
  const pose: Pose = atFoot({x: 560, w: W, yaw: -12 + fl.roll * 0.5, pitch: 8 + fl.pitch * 0.5, roll: 3}, riseFoot(r, 1330, W * 2.25));
  const lk = sp(t, at + 2, 140, 18);
  const top = bodyBox(pose).y;
  const to = toRect(R.resLamp, 70, Math.max(250, top - 30), 940);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#EDEDED', overflow: 'hidden'}}>
      <SoftStreet cam={LP} uid="lp" />
      <HeldRight pose={pose} uid="lp">
        <Phone3 src="obd-result" pose={pose} veil={0.3 * clamp(lk)} shadow={0.6} />
      </HeldRight>
      <Lift src="obd-result" r={R.resLamp} pose={pose} to={to} k={lk} radius={40} show={t >= at ? 1 : 0}>
        {({fx, fy, s}) => (
          <svg width={2000} height={2000} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
            <MarkCircle cx={fx(LAMP_ICON.u)} cy={fy(LAMP_ICON.v)} rx={66 / s} ry={58 / s} k={prog(t, km - 4, 12)} width={7} seed={3} />
          </svg>
        )}
      </Lift>
    </div>
  );
};

// ---- codes: the readiness screen in his left hand on the white world: the two codes lift out in Georgian one after the other,
// then the readiness block („ტექინსპექტირების მზადყოფნა 7/8"), an amber marker on the one check still waiting (EVAP) --------------
export const CodesShot: React.FC = () => {
  const {t, len, L} = useShot('codes');
  const c1 = L('code1');
  const c2 = L('code2');
  const rd = L('ready');
  const ev = L('evap');
  const k = E.inOut(prog(t, 0, len));
  const fl = float(t);
  const r = riseIn(t, 0, 30);
  const W = 400;
  const H = W * 2.25;
  const pose: Pose = atFoot({x: lerp(520, 540, k), w: W, yaw: lerp(10, 6, k) + fl.roll, pitch: 6 + fl.pitch, roll: -2}, riseFoot(r, 1335, H));
  const top = bodyBox(pose).y;
  const away = E.inOut(prog(t, rd - 10, 10));
  const k1 = sp(t, c1 - 4, 140, 18) * (1 - away);
  const k2 = sp(t, c2 - 4, 140, 18) * (1 - away);
  const k3 = sp(t, rd, 140, 18);
  const to1 = toRect(R.rdy420, 70, Math.max(250, top - 40), 940);
  const to2 = toRect(R.rdy171, 70, to1.y + to1.h + 22, 940);
  const to3 = toRect(R.rdyReady, 150, 250, 780);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#F3F3F3', overflow: 'hidden'}}>
      <HeldLeft pose={pose} uid="cd">
        <Phone3 src="obd-result-ready" pose={pose} veil={0.3 * clamp(Math.max(k1, k2, k3))} />
      </HeldLeft>
      {k1 > 0.002 ? <Lift src="obd-result-ready" r={R.rdy420} pose={pose} to={to1} k={k1} radius={36} /> : null}
      {k2 > 0.002 ? <Lift src="obd-result-ready" r={R.rdy171} pose={pose} to={to2} k={k2} radius={36} /> : null}
      {k3 > 0.002 ? (
        <Lift src="obd-result-ready" r={R.rdyReady} pose={pose} to={to3} k={k3} radius={40}>
          {({fx, fy, s}) => (
            <svg width={2000} height={2000} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
              <MarkCircle cx={fx(EVAP.u)} cy={fy(EVAP.v)} rx={44 / s} ry={40 / s} k={prog(t, ev - 4, 12)} width={6} seed={9} />
            </svg>
          )}
        </Lift>
      ) : null}
    </div>
  );
};

void CheckDot;
export const SHOTS: Record<string, React.FC> = {hub: HubShot, again: AgainShot, lamp240: Lamp240Shot, codes: CodesShot};
