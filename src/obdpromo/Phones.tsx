// The OBD promo's real screens (all current Mercedes-Benz GLE captures, resized to 1080 x 2346; never the old Toyota or Honda
// files): the hub with „ყიდვამდე შემოწმება" tapped (his left hand, the street soft behind), the scan running in the footwell
// (his right hand, the adapter plugged), the result's lamp card lifted (240 km with the lamp on), the codes in Georgian and the
// readiness 7/8 lifted out of the result. Each phone rises slowly from below as one solid unit, whole, above the subtitle.
import React from 'react';
import {clamp, E, lerp, prog, sp} from './lib';
import {Car3, type CarCam} from './kit/car3d';
import {Street} from './kit/street';
import {atFoot, bodyBox, flatRect, float, Lift, Phone3, ScreenLayer, TapRing, type Pose, type Rect, type Region} from './kit/phone3d';
import {AdapterBody, bandOf, FootwellDay, HeldLeft, HeldRight, inPlace, mid, pad, PortFace} from './kit/bits';
import {CheckDot, MarkCircle} from './kit/marks';
import {riseFoot, riseIn, Svg, useShot, WHITE, INK} from './kit/stage';

// the regions, measured 2026-10-30 on public/screens/obd-*.jpg (capture fractions of 1080 x 2346)
const px = (x0: number, y0: number, x1: number, y1: number): Region => ({x0: x0 / 1080, y0: y0 / 2346, x1: x1 / 1080, y1: y1 / 2346});
export const R = {
  hubBuy: px(108, 1047, 972, 1170),
  scanRows: px(56, 747, 1026, 1392),
  resChip: px(200, 365, 880, 440),
  resLamp: px(55, 1466, 1025, 1659),
  rdy420: px(55, 1077, 1025, 1293),
  rdy171: px(55, 1295, 1025, 1466),
  rdyReady: px(55, 1716, 1025, 2292),
};
const LAMP_ICON = {u: 149 / 1080, v: 1528 / 2346};
const EVAP = {u: 117 / 1080, v: 2236 / 2346};
const SCAN_ROWS = [851, 966, 1096, 1226, 1341];

const toRect = (r: Region, x: number, y: number, w: number): Rect => ({x, y, w, h: (w * (r.y1 - r.y0) * 2346) / ((r.x1 - r.x0) * 1080)});

// v3 (31 Oct, the reviewers: the soft crossover behind the phones was cut by the frame's edge): the street alone behind them
const SoftStreet: React.FC<{cam: CarCam; uid: string; blur?: number}> = ({cam, uid, blur = 14}) => (
  <div style={{position: 'absolute', inset: 0, filter: `blur(${blur}px)`, transform: 'scale(1.05)'}}>
    <Street cam={cam} uid={uid} look="day" nearTree={false} />
  </div>
);
void Car3;

/** a crisp pill outline concentric with a pill on the screen (its radius plus an even gap), drawn on in amber */
const PillMark: React.FC<{pose: Pose; r: Region; gap: number; k: number; width?: number}> = ({pose, r, gap, k, width = 9}) => {
  if (k <= 0) return null;
  const x = r.x0 * 1080 - gap;
  const y = r.y0 * 2346 - gap;
  const w = (r.x1 - r.x0) * 1080 + 2 * gap;
  const h = (r.y1 - r.y0) * 2346 + 2 * gap;
  return (
    <ScreenLayer pose={pose} island={false}>
      <svg width={1080} height={2346} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <rect x={x} y={y} width={w} height={h} rx={h / 2} fill="none" stroke="#FFA51F" strokeWidth={width} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - E.out(clamp(k))} />
      </svg>
    </ScreenLayer>
  );
};

// ---- hub: his left hand brings the phone up from below (the street soft behind, the crossover in it), VINARI's diagnostics hub;
// the tap on „ყიდვამდე შემოწმება", which lifts a little -----------------------------------------------------------------------------
const HB: CarCam = {pos: [8.6, 2.4, 12.29], target: [-0.41, 1.0, 0.29], fov: 36};
export const HubShot: React.FC = () => {
  const {t, L} = useShot('hub');
  const tapAt = L('tap');
  const r = riseIn(t, 0, 30);
  const fl = float(t);
  const W = 540;
  const H = W * 2.25;
  const pose = atFoot({x: 580, w: W, yaw: lerp(14, 9, clamp(r)) + fl.roll, pitch: lerp(10, 6, clamp(r)) + fl.pitch, roll: -3}, riseFoot(r, 1330, H));
  // v3 (the reviewers: the dimmed band round the button read as a smudge): a crisp amber pill outline, concentric with the
  // button (its radius plus a 16 px gap), drawn on before the tap; no veil
  const tap = mid(R.hubBuy);
  const mk = prog(t, tapAt - 14, 10);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#EDEDED', overflow: 'hidden'}}>
      <SoftStreet cam={HB} uid="hb" />
      <HeldLeft pose={pose} uid="hb">
        <Phone3 src="obd-hub" pose={pose} taps={[{x: tap.x, y: tap.y, k: (t - tapAt) / 16}]} />
        <PillMark pose={pose} r={R.hubBuy} gap={16} k={mk} />
      </HeldLeft>
    </div>
  );
};

// ---- again: a week later, back in the footwell: the adapter already in its port (its LED blinking), his right hand brings the
// phone up, the scan running: its five rows tick one by one --------------------------------------------------------------------------
const PORT_AT = {x: 300, y: 1020};
// v3 (the reviewers: the 0/5 screen sat dead and small, tilted; the sample chip showed in the header): the real capture one step
// on (1/5: the lamp ticked, the codes reading), the phone straight and bigger, and the five checks lifted out big over its header
export const AgainShot: React.FC = () => {
  const {t, L} = useShot('again');
  // it is already rising under the cut (the shot is short): settled before the line's first word
  const r = riseIn(t, -6, 28.5);
  const fl = float(t);
  const W = 540;
  const H = W * 2.25;
  const pose = atFoot({x: 540, w: W, yaw: -3 + fl.roll * 0.5, pitch: 4 + fl.pitch * 0.5, roll: 0}, riseFoot(r, 1330, H));
  const lk = sp(t, L('scanLift') - 2, 140, 18);
  const to = toRect(R.scanRows, 60, 236, 960);
  const PS = 0.46;
  const as = (PS * 440) / 380;
  const mouth = PORT_AT.y - (210 * PS) / 2;
  return (
    <div style={{position: 'absolute', inset: 0, background: '#2A2C31', overflow: 'hidden'}}>
      {/* v2 (the reviewers: the same footwell picture as the plug shot): seen from the passenger side (mirrored), closer, softer */}
      <div style={{position: 'absolute', inset: 0, transform: 'scaleX(-1) scale(1.4)', transformOrigin: `${PORT_AT.x + 240}px ${PORT_AT.y - 120}px`, filter: 'blur(5px) brightness(0.9)'}}>
        <FootwellDay />
        <Svg>
          <PortFace cx={PORT_AT.x} cy={PORT_AT.y} s={PS} uid="agp" />
          <AdapterBody cx={PORT_AT.x} top={mouth + 6} s={as} led={0.75 + 0.25 * Math.sin(t / 2.2)} uid="aga" />
        </Svg>
      </div>
      <HeldRight pose={pose} uid="ag">
        <Phone3 src="obd-scan-1" pose={pose} veil={0.3 * clamp(lk)} />
      </HeldRight>
      {lk > 0.002 ? <Lift src="obd-scan-1" r={R.scanRows} pose={pose} to={to} k={lk} radius={48} /> : null}
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
  const W = lerp(470, 482, k);
  // v2 (the reviewers: the first word sat on the rising phone): it comes in from the right at its parked height, above the line
  const sl = 1 - E.out(prog(t, 0, 16));
  const pose: Pose = atFoot({x: 560 + 760 * sl, w: W, yaw: -12 - 14 * sl + fl.roll * 0.5, pitch: 8 + fl.pitch * 0.5, roll: 3 + 6 * sl}, 1330);
  const lk = sp(t, at + 2, 140, 18);
  // v3 (the reviewers: the sample chip „ნიმუში: ჩანაწერი, არა შენი მანქანა" showed under the header while the story scans the
  // seller's car): the lifted lamp card lands right over that line on the parked phone (never painted over the screen)
  const parked: Pose = atFoot({x: 560, w: 482, yaw: -12, pitch: 8, roll: 3}, 1330);
  const chip = flatRect(parked, R.resChip);
  const h0 = toRect(R.resLamp, 70, 0, 940).h;
  const to = toRect(R.resLamp, 70, chip.y + chip.h / 2 - h0 / 2, 940);
  void bodyBox;
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
  const sl = 1 - E.out(prog(t, 0, 16));
  const W = 520;
  const pose: Pose = atFoot({x: lerp(530, 545, k) - 760 * sl, w: W, yaw: lerp(10, 6, k) + 14 * sl + fl.roll, pitch: 6 + fl.pitch, roll: -2 - 6 * sl}, 1335);
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
              <MarkCircle cx={fx(EVAP.u)} cy={fy(EVAP.v)} rx={27 / s} ry={33 / s} k={prog(t, ev - 4, 12)} width={5} seed={9} />
            </svg>
          )}
        </Lift>
      ) : null}
    </div>
  );
};

void CheckDot;
export const SHOTS: Record<string, React.FC> = {hub: HubShot, again: AgainShot, lamp240: Lamp240Shot, codes: CodesShot};
