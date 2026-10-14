// 13 push (v4): a cut back home: her phone lying on the walnut where the strangers rang it all evening, dark and quiet now;
// the REAL VINARI push lands on the lock screen (title „გზას უღობავ", body „მანქანა გასასვლელს კეტავს."), one short buzz,
// and the camera pushes in on the phone so it reads, as the voice says „შენ შეტყობინება მოგივა,".
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {clamp, E, ev, fr, lerp, prog, shot, sp} from './lib';
import {Phone3, ScreenLayer, type Pose} from './kit/phone3d';
import {Banner, LockScreen, type Note} from './kit/ios';
import {PhoneShadow, Wood} from './Act1';
import {cam} from './kit/room';

export const PUSH: Note = {icon: 'vinari', app: 'VINARI', title: 'გზას უღობავ', body: 'მანქანა გასასვლელს კეტავს.', when: 'ახლა'};
const BANNER_Y = 900; // capture px: where the push lands on her lock screen, under the clock
const DATE = 'ოთხშაბათი, 14 ოქტომბერი';

// v4 fix (the art director: "the push banner is wider than the phone and sits half see-through over the clock"): the push stays
// inside the glass, under the clock, like a real iOS notification; the camera pushes in on the phone to read it (the phone
// whole, its foot above the subtitle band)
export const PushWood: React.FC = () => {
  const t = useCurrentFrame();
  const base = fr(shot('push').from);
  const len = fr(shot('push').to) - base;
  const pushAt = fr(ev('push')) - base;
  const k = E.inOut(prog(t, 0, len));
  // the screen wakes with the push; the haptic: a quick, small buzz of the whole phone (a smooth sine, no strobe)
  const buzz = t >= pushAt && t < pushAt + 9 ? 2.6 * Math.sin((t - pushAt) * 2.09) * (1 - (t - pushAt) / 9) : 0;
  const zoom = sp(t, pushAt + 3, 90, 20);
  const pose: Pose = {x: 540 + buzz, y: lerp(860, 880, zoom), w: lerp(520, 545, k) + 175 * zoom, yaw: 0, pitch: 0, roll: lerp(-4, -2, zoom) + buzz * 0.2};
  const wake = clamp((t - pushAt + 2) / 4);
  const bannerK = prog(t, pushAt, 8);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#6E4A32', overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, transform: cam(1 + 0.03 * k, 540, 900), transformOrigin: '0 0'}}>
        <Wood uid="pw" light={0.85} />
        <PhoneShadow pose={pose} />
        <Phone3 src="qrpromo/lock-night.jpg" pose={pose} look={0.3} rim={0.9} shadow={0} />
        <ScreenLayer pose={pose}>
          <LockScreen wall="qrpromo/lock-night.jpg" time="21:52" date={DATE} dim={0.82 * (1 - wake)}>
            {bannerK > 0 ? <Banner n={PUSH} y={BANNER_Y} k={bannerK} scale={1 + 0.04 * Math.sin(Math.PI * clamp((t - pushAt) / 9))} /> : null}
          </LockScreen>
        </ScreenLayer>
      </div>
    </div>
  );
};
