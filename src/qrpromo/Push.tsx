// 8 the push: her phone, whole, on the white (her own night lock screen from act 1, so it is clearly hers), dissolving in
// as the passer-by's recedes; the REAL VINARI push lands (title „გზას უღობავ", body „მანქანა გასასვლელს კეტავს."), a short
// haptic buzz with one tight soft ring; the push lifts out of the screen, big and readable. „შენი ნომრის გარეშე." her phone
// steps back and away, her car comes up on the right (the same car, the card behind its glass) and she walks in from the
// left, calm, keys in hand (Silhouette light, inside the frame); on the fob her car blinks its lights twice.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {C} from '../tokens';
import {clamp, E, ev, fr, lerp, prog, shot, sp} from './lib';
import {atFoot, bodyBox, float, Phone3, project, ScreenLayer, zoomAbout, type Pose} from './kit/phone3d';
import {Banner, LockScreen, type Note} from './kit/ios';
import {WARM_HUE} from './kit/room';
import {Her} from './kit/her';
import {silPal, SilPalCtx} from './kit/sil/sil';
import {Car3, projectCar, type CarCam} from './kit/car3d';
import type {Time} from '../scenes/illo/palette';

// her own warm light, the same woman as at the mirror (on the white: the paper look)
const HER_PAL = (time: Time, level: number) => silPal({light: true, hue: WARM_HUE, b: '#8A6A55', time, level});

export const PUSH: Note = {icon: 'vinari', app: 'VINARI', title: 'გზას უღობავ', body: 'მანქანა გასასვლელს კეტავს.', when: 'ახლა'};
const BANNER_Y = 900; // capture px: where the push lands on her lock screen
const BIG_W = 940;
const BIG_Y = 270;
const DATE = 'ოთხშაბათი, 14 ოქტომბერი';

// her car on the right, front three-quarter, its nose toward her
const CAR_A = 0.55;
const CAR_R = 20.4;
const CAR_X = 150;
const CAR_DY = 18;
const CAR_CAM: CarCam = {pos: [Math.sin(CAR_A) * CAR_R, 3.3, Math.cos(CAR_A) * CAR_R], target: [0, 0.6, 0.2], fov: 30};
/** the headlamps' corners (metres): where the blink glows */
const LAMPS: [number, number, number][] = [
  [0.68, 0.68, 2.12],
  [-0.68, 0.68, 2.12],
];

export const Push: React.FC = () => {
  const t = useCurrentFrame();
  const base = fr(shot('push').from);
  const len = fr(shot('push').to) - base;
  const L = (n: string) => fr(ev(n)) - base;
  const pushAt = L('push');
  const walkAt = L('walk');
  const fobAt = L('fob');
  // her phone grows into place (the dissolve brings it in), then on the walk steps back and away
  const inK = E.out(prog(t, 0, 14));
  const fl = float(t);
  const lift = sp(t, pushAt + 14, 130, 18);
  const away = E.inOut(prog(t, walkAt - 6, 16));
  let pose: Pose = atFoot({x: 540, w: lerp(460, 400, clamp(lift)), yaw: -10 + fl.roll, pitch: 4 + fl.pitch, roll: 0}, 1390);
  pose = {...pose, y: pose.y + fl.bob};
  pose = zoomAbout(pose, lerp(0.94, 1, inK) * lerp(1, 0.82, away), 540, 1390);
  // the haptic: a quick, small buzz of the whole phone
  const buzz = t >= pushAt && t < pushAt + 10 ? 3 * (t % 2 ? 1 : -1) * (1 - (t - pushAt) / 10) : 0;
  pose = {...pose, x: pose.x + buzz};
  const b = bodyBox(pose);
  const bannerK = prog(t, pushAt, 8);
  // the push lifted out: from its place on the screen to a big card at the top, its dark glass turning to paper
  const tl = project(pose, 40 / 1080, BANNER_Y / 2346);
  const tr = project(pose, 1040 / 1080, BANNER_Y / 2346);
  const onW = Math.hypot(tr.x - tl.x, tr.y - tl.y);
  const sc = lerp(onW / 1000, BIG_W / 1000, lift);
  const bx = lerp(tl.x, 540 - BIG_W / 2, lift);
  const by = lerp(tl.y, BIG_Y, lift);
  const paper = clamp(lift * 1.4);
  // her car and her walk
  const carK = E.out(prog(t, walkAt, 16));
  const wk = prog(t, walkAt + 2, len - walkAt - 2);
  const herX = lerp(196, 272, E.out(wk));
  const herA = clamp((t - walkAt - 2) / 8);
  const fob = t - fobAt;
  const blink = fob >= 0 && fob < 20 ? ((fob >= 0 && fob < 5) || (fob >= 9 && fob < 14) ? 1 : 0) : 0;
  const lampPts = LAMPS.map((p) => projectCar(CAR_CAM, p));
  return (
    <div style={{position: 'absolute', inset: 0, background: C.surface, overflow: 'hidden'}}>
      {/* the haptic: one tight soft ring hugging the phone */}
      {(() => {
        const k = prog(t, pushAt, 14);
        if (k <= 0 || k >= 1) return null;
        const g = 6 + 34 * E.out(k);
        return <div style={{position: 'absolute', left: b.x - g, top: b.y - g, width: b.w + 2 * g, height: b.h + 2 * g, borderRadius: b.w * 0.17 + g, border: `2px solid ${C.accA}`, opacity: 0.3 * (1 - k)}} />;
      })()}
      {/* her car on the right, its lights blinking on the fob */}
      {carK > 0.001 ? (
        <div style={{position: 'absolute', left: CAR_X, top: CAR_DY + 40 * (1 - carK), width: 1080, height: 1920, opacity: carK}}>
          <Car3 cam={CAR_CAM} night={0} card cardK={1} glassA={0.7} lamp={blink} />
          {blink > 0
            ? lampPts.map((p, i) => (
                <div key={i} style={{position: 'absolute', left: p.x - 60, top: p.y - 34, width: 120, height: 68, borderRadius: '50%', background: 'radial-gradient(ellipse at center, rgba(255,190,90,0.85) 0%, rgba(255,170,60,0.35) 40%, rgba(255,170,60,0) 72%)'}} />
              ))
            : null}
        </div>
      ) : null}
      <div style={{position: 'absolute', inset: 0, opacity: 1 - away}}>
        <Phone3 src="qrpromo/lock-night.jpg" pose={pose} look={1} rim={1} shadow={1} />
        <ScreenLayer pose={pose}>
          <LockScreen wall="qrpromo/lock-night.jpg" time="21:52" date={DATE}>
            {bannerK > 0 && lift < 0.05 ? <Banner n={PUSH} y={BANNER_Y} k={bannerK} /> : null}
          </LockScreen>
        </ScreenLayer>
      </div>
      {lift > 0.02 ? (
        <div style={{position: 'absolute', left: bx, top: by, width: 1000, transform: `scale(${sc})`, transformOrigin: '0 0', filter: `drop-shadow(0 ${30 * clamp(lift)}px ${50 * clamp(lift)}px rgba(20,30,60,${0.18 * clamp(lift)}))`}}>
          <div style={{position: 'relative', width: 1080, height: 300, marginLeft: -40}}>
            <div style={{position: 'absolute', inset: 0, opacity: 1 - paper}}>
              <Banner n={PUSH} y={0} k={1} />
            </div>
            <div style={{position: 'absolute', inset: 0, opacity: paper}}>
              <Banner n={PUSH} y={0} k={1} dark={false} />
            </div>
          </div>
        </div>
      ) : null}
      {/* she walks in, calm, keys in hand */}
      {herA > 0 ? (
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: herA}}>
          <SilPalCtx.Provider value={HER_PAL}>
            <Her uid="pw" x={herX} y={1342} size={470} frame={t} pose="walk" face="smile" turn={0.85} hold="keys" time="day" />
          </SilPalCtx.Provider>
        </svg>
      ) : null}
    </div>
  );
};
