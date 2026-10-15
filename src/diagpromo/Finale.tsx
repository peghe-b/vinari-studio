// ACT 4 v2: the calm after (the crossover from straight above, gliding along a sunny road: „მანქანაში თუ არ ერკვევი, აღარც
// დაგჭირდება."), what comes next (one phone rising slowly in the white world, and each half turn it shows another of the app's
// real features, its name above; then a car's centre screen with the two honest chips, „CarPlay · მალე", „Android Auto · მალე",
// in black and white), „გაემზადე მომავლისთვის." (the headline is the line: the crossover drives toward us under it), the store
// (the real App Store page in his hand, „Get" tapped, the two store pills) and the end card (the mark, the wordmark, the last
// line built word by word in black, the two store pills; no „7 დღე უფასოდ": the owner, 2026-10-15).
import React from 'react';
import {Img, staticFile} from 'remotion';
import {mtav} from '../lib/format';
import {textWidth} from '../lib/measure';
import {C, F} from '../tokens';
import {clamp, E, lerp, prog, sp} from './lib';
import {Car3, type CarCam} from './kit/car3d';
import {atFoot, bodyBox, flatRect, float, Lift, Phone3, TapRing, type Band, type Region} from './kit/phone3d';
import {HeldLeft} from './Explain';
import {GREY, INK, rise, Svg, useShot, WHITE} from './kit/stage';

// ---- 39 out: from straight above, the crossover glides down a sunny road, its lane's dashes and the plane trees' shade passing --
export const OutShot: React.FC = () => {
  const {t, len} = useShot('out');
  const k = E.inOut(prog(t, 0, len));
  const cam: CarCam = {pos: [0, lerp(15.5, 14.6, k), 2.2], target: [0, 0, 0.3], fov: 34};
  const flow = (t * 9) % 240;
  return (
    <div style={{position: 'absolute', inset: 0, background: '#CFCFCF', overflow: 'hidden'}}>
      <Svg>
        <defs>
          <radialGradient id="ouShade" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#7E8A78" stopOpacity={0.5} />
            <stop offset="1" stopColor="#7E8A78" stopOpacity={0} />
          </radialGradient>
        </defs>
        {/* the asphalt, the kerbs and pavements at both sides, the lane's dashes flowing up (the car drives down the frame) */}
        <rect width={1080} height={1920} fill="#BDBDBD" />
        <rect x={0} y={0} width={150} height={1920} fill="#E4E4E4" />
        <rect x={930} y={0} width={150} height={1920} fill="#E4E4E4" />
        <rect x={146} y={0} width={10} height={1920} fill="#F2F2F2" />
        <rect x={924} y={0} width={10} height={1920} fill="#F2F2F2" />
        {Array.from({length: 10}, (_, i) => (
          <rect key={i} x={272} y={((i * 240 - flow + 2400) % 2400) - 240} width={12} height={120} rx={6} fill={WHITE} opacity={0.9} />
        ))}
        {Array.from({length: 10}, (_, i) => (
          <rect key={`b${i}`} x={796} y={((i * 240 - flow + 2400) % 2400) - 240} width={12} height={120} rx={6} fill={WHITE} opacity={0.9} />
        ))}
        {/* the plane trees' round shade sliding over the pavements and the road's edge */}
        {[0, 1, 2, 3].map((i) => (
          <circle key={i} cx={i % 2 ? 980 : 90} cy={((i * 600 - t * 9 * 1.0 + 2400) % 2400) - 300} r={240} fill="url(#ouShade)" />
        ))}
      </Svg>
      <Car3 cam={cam} night={0} shadow={1} lamp={0.4} />
    </div>
  );
};

// ---- 40 more: one phone in the white world rises slowly; each half turn it shows another of the app's features, its name above --
const FEATURES: {src: string; label: string}[] = [
  {src: '17-nav-drive', label: 'ქართული ხმით ნავიგატორი'},
  {src: '08-qr-card', label: 'QR ბარათი'},
  {src: '02-calendar', label: 'ვადების კალენდარი'},
  {src: '05-customs', label: 'განბაჟება'},
];
export const MoreShot: React.FC = () => {
  const {t, len, L, Ls} = useShot('more');
  const r0 = L('moreRise');
  const turns = Ls('turns');
  const r = rise(t, r0, 34);
  const k = E.inOut(prog(t, 0, len));
  // which feature, and the half turn's angle round the switch
  let idx = 0;
  let yaw = 0;
  const HALF = 8;
  turns.forEach((at, i) => {
    if (t >= at) idx = i + 1;
    const q = (t - at) / HALF;
    if (q > -1 && q < 1) yaw = q < 0 ? 90 * E.in2(1 + q) : -90 * (1 - E.out(q));
  });
  const fl = float(t);
  const ratio = bodyBox({x: 540, y: 960, w: 100, yaw: 0, pitch: 3, roll: 0}).h / 100;
  const FOOT = 1400;
  const w = ((FOOT - 400) / ratio) * lerp(0.94, 1, k);
  let pose = atFoot({x: 540, w, yaw: yaw + 4 + fl.roll, pitch: 3 + fl.pitch, roll: fl.roll * 0.5}, lerp(1620, FOOT, r));
  pose = {...pose, y: pose.y + fl.bob};
  const label = mtav(FEATURES[idx].label);
  let size = 64;
  const wd = textWidth(label, `700 ${size}px ${F.sans}`);
  if (wd > 900) size = Math.floor((size * 900) / wd);
  const lk = clamp(1 - Math.abs(yaw) / 60) * E.out(prog(t, r0 + 4, 12));
  return (
    <div style={{position: 'absolute', inset: 0, background: '#F3F3F3', overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: 0, right: 0, top: 268 + (1 - lk) * 18, textAlign: 'center', fontFamily: F.sans, fontWeight: 700, fontSize: size, lineHeight: 1.2, color: INK, whiteSpace: 'nowrap', opacity: lk}}>{label}</div>
      {r > 0.001 ? <Phone3 key={FEATURES[idx].src} src={FEATURES[idx].src} pose={pose} shadow={0.8} opacity={clamp(r * 3)} /> : null}
    </div>
  );
};

// ---- 41 soon: a car's centre screen in the dash (the white world's soft light), and on it the two honest chips ---------------
const Chip: React.FC<{name: string; k: number}> = ({name, k}) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 20,
      padding: '24px 46px 26px',
      borderRadius: 999,
      background: WHITE,
      color: INK,
      fontFamily: F.sans,
      fontWeight: 600,
      fontSize: 56,
      whiteSpace: 'nowrap',
      opacity: clamp(k * 2),
      transform: `translateY(${(1 - k) * 60}px) scale(${lerp(0.9, 1, clamp(k))})`,
    }}
  >
    <span>{name}</span>
    <span style={{color: GREY}}>·</span>
    <span style={{color: GREY}}>{mtav('მალე')}</span>
  </div>
);
export const SoonShot: React.FC = () => {
  const {t, len, Ls} = useShot('soon');
  const chips = Ls('chips');
  const k = E.inOut(prog(t, 0, len));
  return (
    <div style={{position: 'absolute', inset: 0, background: '#EDEDED', overflow: 'hidden'}}>
      <Svg style={{transform: `scale(${lerp(1, 1.04, k)})`, transformOrigin: '540px 860px'}}>
        <defs>
          <linearGradient id="soDash" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3A3D44" />
            <stop offset="1" stopColor="#1E2025" />
          </linearGradient>
        </defs>
        {/* the dash's face and the centre screen standing on it */}
        <path d="M-60 1150Q540 1080 1140 1150L1140 1920L-60 1920Z" fill="url(#soDash)" />
        <rect x={120} y={540} width={840} height={600} rx={56} fill="#0C0D10" />
        <rect x={136} y={556} width={808} height={568} rx={44} fill="#16181D" />
      </Svg>
      <div style={{position: 'absolute', left: 0, right: 0, top: 650, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40}}>
        <Chip name="CarPlay" k={sp(t, chips[0], 170, 17)} />
        <Chip name="Android Auto" k={sp(t, chips[1], 170, 17)} />
      </div>
    </div>
  );
};

// ---- 42 future: „გაემზადე მომავლისთვის." big and black, word by word (the headline is the line, no subtitle); under it the
// crossover drives toward us out of the white, its lights on -------------------------------------------------------------------
export const FutureShot: React.FC = () => {
  const {t, len, Ls} = useShot('future');
  const words = Ls('futureWords');
  const k = E.inOut(prog(t, 0, len));
  const cam: CarCam = {pos: [0.6, 1.2, lerp(15.5, 12.6, k)], target: [0, 0.8, 0], fov: 28};
  const ws = [mtav('გაემზადე'), mtav('მომავლისთვის.')];
  let size = 132;
  const wd = Math.max(...ws.map((w) => textWidth(w, `700 ${size}px ${F.sans}`)));
  if (wd > 920) size = Math.floor((size * 920) / wd);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#F4F4F4', overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, transform: 'translateY(170px)'}}>
        <Car3 cam={cam} night={0} shadow={1} lamp={1} />
      </div>
      {ws.map((w, i) => {
        const a = E.out(prog(t, words[i] - 2, 10));
        return (
          <div key={w} style={{position: 'absolute', left: 0, right: 0, top: 330 + i * size * 1.08, textAlign: 'center', fontFamily: F.sans, fontWeight: 700, fontSize: size, lineHeight: 1, color: INK, whiteSpace: 'nowrap', opacity: a, transform: `translateY(${(1 - a) * 26}px)`}}>
            {w}
          </div>
        );
      })}
    </div>
  );
};

// ---- 43 store: the real App Store page in his hand (rising slowly), „Get" tapped; the two store pills ---------------------------
const STORE = '26-appstore-page';
const HEAD: Region = {x0: 18 / 585, y0: 328 / 1266, x1: 567 / 585, y1: 542 / 1266};
const GET = {u: 286 / 585, v: 498 / 1266};
const STORES = ['App Store', 'Google Play'];
const GLYPH = [
  'M16.4 12.6c0-2.4 2-3.5 2-3.6-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9-.7 0-1.9-.9-3-.8-1.6 0-3 .9-3.8 2.3-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.1 2.8-2.3.9-1.3 1.3-2.6 1.3-2.6s-2.5-1-2.5-3.7zM14.1 5.5c.6-.8 1.1-1.8 1-2.9-.9 0-2.1.6-2.7 1.4-.6.7-1.1 1.8-1 2.8 1 .1 2.1-.5 2.7-1.3z',
  'M5 3.2v17.6c0 .4.4.6.8.4L20 12.9c.4-.2.4-.7 0-.9L5.8 2.8c-.4-.2-.8 0-.8.4z',
];
const Pill: React.FC<{i: number; k: number; big?: boolean}> = ({i, k, big}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: big ? '18px 40px 20px 32px' : '15px 34px 17px 28px',
      borderRadius: 999,
      background: INK,
      fontFamily: F.sans,
      fontWeight: 600,
      fontSize: big ? 42 : 36,
      lineHeight: 1.1,
      color: WHITE,
      whiteSpace: 'nowrap',
      opacity: clamp(k * 2),
      transform: `translateY(${((1 - k) * 46).toFixed(2)}px) scale(${lerp(0.78, 1, k).toFixed(4)})`,
    }}
  >
    <svg width={big ? 40 : 34} height={big ? 40 : 34} viewBox="0 0 24 24" style={{display: 'block', flex: 'none', marginTop: i === 0 ? -4 : 0}}>
      <path d={GLYPH[i]} fill={WHITE} />
    </svg>
    {STORES[i]}
  </div>
);
export const StoreShot: React.FC = () => {
  const {t, L} = useShot('store');
  const getAt = L('getTap');
  const p1 = L('pill1');
  const p2 = L('pill2');
  const r = rise(t, 0, 32);
  const fl = float(t);
  const pose = atFoot({x: 600, w: 420, yaw: lerp(16, 8, r) + fl.roll, pitch: lerp(12, 5, r) + fl.pitch, roll: -3}, lerp(1300, 1160, r));
  const liftK = sp(t, getAt - 12, 150, 20) * (1 - E.inOut(prog(t, getAt + 10, 12)));
  const hf = flatRect(pose, HEAD);
  const HS = 1.06;
  const headTo = {x: hf.x - (hf.w * (HS - 1)) / 2, y: hf.y - (hf.h * (HS - 1)) / 2, w: hf.w * HS, h: hf.h * HS};
  const band: Band = {x: HEAD.x0, y: HEAD.y0, w: HEAD.x1 - HEAD.x0, h: HEAD.y1 - HEAD.y0, a: clamp(liftK * 2)};
  return (
    <div style={{position: 'absolute', inset: 0, background: '#F3F3F3', overflow: 'hidden'}}>
      <HeldLeft pose={pose} uid="st">
        <Phone3 src={STORE} pose={pose} bar="patch" veil={0.2 * clamp(liftK * 2)} band={band} opacity={clamp(r * 3)} />
        {liftK > 0.002 ? (
          <Lift src={STORE} r={HEAD} pose={pose} to={headTo} k={liftK} radius={30}>
            {({fx, fy, s}) => <TapRing x={fx(GET.u)} y={fy(GET.v)} k={prog(t, getAt, 16)} s={s * 0.9} />}
          </Lift>
        ) : null}
      </HeldLeft>
      <div style={{position: 'absolute', left: 0, right: 0, top: 1240, display: 'flex', justifyContent: 'center', gap: 24}}>
        <Pill i={0} k={sp(t, p1, 190, 13)} big />
        <Pill i={1} k={sp(t, p2, 190, 13)} big />
      </div>
    </div>
  );
};

// ---- 44 end: the mark, the wordmark, the last line word by word (black; the card is the line: no subtitle), the two pills ----
const MARK_W = 150;
const MARK_H = (MARK_W * 671) / 768;
export const End: React.FC = () => {
  const {t, len, L, Ls} = useShot('end');
  const markAt = L('mark');
  const tags = Ls('tag');
  const hit = clamp(L('endHit'), 0, len - 1);
  const markK = sp(t, markAt - 3, 130, 15);
  const wmK = sp(t, markAt + 2, 130, 18);
  const nod = Math.sin(Math.PI * prog(t, hit, 8)) * (t >= hit ? 1 : 0);
  const words = [mtav('შენი'), mtav('მანქანა'), mtav('ქართულად'), mtav('ალაპარაკდა.')];
  const LINES = [[0, 1], [2], [3]];
  let size = 112;
  const lineText = (idx: number[]) => idx.map((i) => words[i]).join(' ');
  const widest = Math.max(...LINES.map((l) => textWidth(lineText(l), `700 ${size}px ${F.sans}`)));
  if (widest > 880) size = Math.floor((size * 880) / widest);
  const LH = size * 1.1;
  const gap = size * 0.28;
  const TAG_TOP = 720;
  const pills = sp(t, tags[3] + 6, 170, 16);
  const camK = clamp(t / Math.max(1, len));
  const s = 1 + 0.04 * E.out2(camK);
  return (
    <div style={{position: 'absolute', inset: 0, background: C.surface, overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${s})`, transformOrigin: '540px 900px'}}>
        <div style={{position: 'absolute', left: 540 - MARK_W / 2, top: 440 + (1 - markK) * 30, width: MARK_W, height: MARK_H, opacity: clamp(markK * 1.6), transform: `scale(${(lerp(0.86, 1, markK) * (1 + 0.035 * nod)).toFixed(4)})`, transformOrigin: '50% 60%'}}>
          <Img src={staticFile('brand/mark.svg')} style={{width: MARK_W, height: MARK_H, filter: 'brightness(0) invert(0.045)'}} />
        </div>
        <Img src={staticFile('brand/wordmark.svg')} style={{position: 'absolute', left: 540 - 120, top: 600 + (1 - wmK) * 22, width: 240, height: (240 * 68) / 267, filter: 'brightness(0) invert(0.045)', opacity: clamp(wmK * 1.4)}} />
        {LINES.map((idx, li) => {
          const top = TAG_TOP + li * LH;
          const ws = idx.map((i) => textWidth(words[i], `700 ${size}px ${F.sans}`));
          const lineW = ws.reduce((acc, wd, n) => acc + wd + (n > 0 ? gap : 0), 0);
          let x = 540 - lineW / 2;
          return idx.map((i, n) => {
            const k = E.out(prog(t, tags[i] - 2, 9));
            if (n > 0) x += gap;
            const left = x;
            x += ws[n];
            return (
              <div key={i} style={{position: 'absolute', left, top, whiteSpace: 'nowrap', fontFamily: F.sans, fontWeight: 700, fontSize: size, lineHeight: 1.1, color: INK, opacity: k, transform: `translateY(${((1 - k) * 24).toFixed(2)}px)`}}>
                {words[i]}
              </div>
            );
          });
        })}
        <div style={{position: 'absolute', left: 0, right: 0, top: TAG_TOP + 3 * LH + 60, display: 'flex', justifyContent: 'center', gap: 24}}>
          <Pill i={0} k={pills} />
          <Pill i={1} k={sp(t, tags[3] + 10, 170, 16)} />
        </div>
      </div>
    </div>
  );
};

void bodyBox;
export const SHOTS: Record<string, React.FC> = {out: OutShot, more: MoreShot, soon: SoonShot, future: FutureShot, store: StoreShot, end: End};
