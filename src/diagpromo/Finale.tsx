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
import {atFoot, bodyBox, capUrl, flatRect, float, Lift, Phone3, TapRing, type Band, type Region} from './kit/phone3d';
import {INK, riseFoot, riseIn, Svg, useShot, WHITE} from './kit/stage';

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

// ---- 40 more: v2.1 (the AD: v1's phone-on-white-under-a-headline again): one phone rises from below the frame in the white world
// on VINARI's home, and the app's other features fly OUT of its screen as cards to their places round it (each its real screen's
// most telling part, its name under it in black): the navigator, the QR card, the deadlines' calendar, customs; then a black
// „+" card (more to come) on „ახალს მატებს". Everything inside the safe zone; the phone's foot far above the line.
type Feat = {src: string; label: string; r: Region; slot: [number, number]};
const CARD_W = 268;
const CARD_H = 300;
const FEATS: Feat[] = [
  {src: '17-nav-drive', label: 'ნავიგატორი', r: {x0: 0, y0: 0.03, x1: 1, y1: 0.03 + (1080 * CARD_H) / CARD_W / 2346}, slot: [80, 300]},
  {src: '08-qr-card', label: 'QR ბარათი', r: {x0: 0.06, y0: 0.13, x1: 0.94, y1: 0.13 + (950 * CARD_H) / CARD_W / 2346}, slot: [738, 300]},
  {src: '02-calendar', label: 'კალენდარი', r: {x0: 0.02, y0: 0.22, x1: 0.98, y1: 0.22 + (1037 * CARD_H) / CARD_W / 2346}, slot: [80, 720]},
  {src: '05-customs', label: 'განბაჟება', r: {x0: 0.02, y0: 0.15, x1: 0.98, y1: 0.15 + (1037 * CARD_H) / CARD_W / 2346}, slot: [738, 720]},
];
const FeatCard: React.FC<{f: Feat; k: number; from: {x: number; y: number}; i: number}> = ({f, k, from, i}) => {
  const q = clamp(k);
  const x = lerp(from.x - CARD_W / 2, f.slot[0], k);
  const y = lerp(from.y - CARD_H / 2, f.slot[1], k);
  const s = lerp(0.3, 1, q);
  const iw = CARD_W / (f.r.x1 - f.r.x0);
  const ih = iw * (2346 / 1080);
  const rot = (1 - q) * (i % 2 ? 9 : -9);
  return (
    <div style={{position: 'absolute', left: x, top: y, width: CARD_W, opacity: clamp(k * 3), transform: `scale(${s.toFixed(4)}) rotate(${rot.toFixed(2)}deg)`, transformOrigin: '50% 50%'}}>
      <div style={{position: 'relative', width: CARD_W, height: CARD_H, borderRadius: 30, overflow: 'hidden', background: WHITE, boxShadow: '0 24px 56px rgba(0,0,0,0.16), 0 4px 12px rgba(0,0,0,0.06)'}}>
        <Img src={capUrl(f.src)} style={{position: 'absolute', left: -f.r.x0 * iw, top: -f.r.y0 * ih, width: iw, height: ih}} />
      </div>
      <div style={{marginTop: 18, textAlign: 'center', fontFamily: F.sans, fontWeight: 700, fontSize: 36, lineHeight: 1.1, color: INK, whiteSpace: 'nowrap', opacity: clamp((q - 0.5) * 2)}}>{mtav(f.label)}</div>
    </div>
  );
};
export const MoreShot: React.FC = () => {
  const {t, len, L, Ls} = useShot('more');
  const r0 = L('moreRise');
  const turns = Ls('turns');
  const r = riseIn(t, r0, 30);
  const k = E.inOut(prog(t, 0, len));
  const fl = float(t);
  const W = 300;
  const H = W * 2.25;
  let pose = atFoot({x: 540, w: W, yaw: 3 + fl.roll, pitch: 3 + fl.pitch, roll: fl.roll * 0.5}, riseFoot(r, 1150, H));
  pose = {...pose, y: pose.y + fl.bob * clamp(r)};
  const scr = flatRect(pose, {x0: 0, y0: 0, x1: 1, y1: 1});
  const from = {x: scr.x + scr.w / 2, y: scr.y + scr.h * 0.42};
  const outAt = (i: number) => r0 + 32 + i * 13;
  const plusAt = turns[2];
  const plus = sp(t, plusAt, 160, 15);
  return (
    <div style={{position: 'absolute', inset: 0, background: '#F3F3F3', overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${lerp(1, 1.025, k)})`, transformOrigin: '540px 800px'}}>
        {r > 0.001 ? <Phone3 src="23-home-104" pose={pose} shadow={0.8} /> : null}
        {FEATS.map((f, i) => {
          const kk = sp(t, outAt(i), 120, 15);
          return kk > 0.001 ? <FeatCard key={f.src} f={f} k={kk} from={from} i={i} /> : null;
        })}
        {plus > 0.01 ? (
          <div style={{position: 'absolute', left: 540 - 62, top: lerp(from.y, 1196, clamp(plus)), width: 124, height: 124, borderRadius: 34, background: INK, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: clamp(plus * 3), transform: `scale(${lerp(0.4, 1, clamp(plus))})`, boxShadow: '0 18px 40px rgba(0,0,0,0.2)'}}>
            <svg width={60} height={60} viewBox="0 0 24 24">
              <path d="M12 4V20M4 12H20" stroke={WHITE} strokeWidth={3} strokeLinecap="round" />
            </svg>
          </div>
        ) : null}
      </div>
    </div>
  );
};

// ---- 41 soon: the car's dash in the day: its centre screen in a slim bezel between the two vents (their slats), the stitched
// dash top, the gear selector below; on the screen the two honest chips, „CarPlay · მალე", „Android Auto · მალე" (black on white)
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
    <span>·</span>
    <span style={{fontWeight: 400}}>{mtav('მალე')}</span>
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
            <stop offset="0" stopColor="#4A4D55" />
            <stop offset="0.2" stopColor="#30333A" />
            <stop offset="1" stopColor="#1C1E22" />
          </linearGradient>
          <linearGradient id="soGlass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#1B1D22" />
            <stop offset="0.5" stopColor="#121317" />
            <stop offset="1" stopColor="#0B0C0F" />
          </linearGradient>
          <linearGradient id="soShine" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FFFFFF" stopOpacity={0.09} />
            <stop offset="0.45" stopColor="#FFFFFF" stopOpacity={0.02} />
            <stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </linearGradient>
        </defs>
        {/* through the windscreen: the soft bright day */}
        <rect width={1080} height={1200} fill="#ECEEF1" />
        {/* the dash: its padded top, the stitched seam, the face */}
        <path d="M-60 1010Q540 940 1140 1010L1140 1920L-60 1920Z" fill="url(#soDash)" />
        <path d="M-60 1036Q540 966 1140 1036" stroke="#5E626B" strokeWidth={2.5} strokeDasharray="12 10" fill="none" opacity={0.8} />
        {/* the two vents flanking the screen */}
        {[74, 1006].map((x) => (
          <g key={x}>
            <rect x={x - 54} y={1180} width={108} height={210} rx={28} fill="#121316" />
            {Array.from({length: 6}, (_, i) => (
              <rect key={i} x={x - 44} y={1196 + i * 31} width={88} height={10} rx={5} fill="#3A3D44" />
            ))}
          </g>
        ))}
        {/* the centre screen standing on the dash: a slim bezel, the glass with a soft reflection */}
        <rect x={150} y={520} width={780} height={600} rx={46} fill="#08090B" />
        <rect x={162} y={532} width={756} height={576} rx={36} fill="url(#soGlass)" />
        <rect x={162} y={532} width={756} height={576} rx={36} fill="url(#soShine)" />
        <rect x={470} y={1120} width={140} height={44} rx={10} fill="#0E0F12" />
        {/* a slim brushed trim strip across the dash face */}
        <rect x={-60} y={1460} width={1200} height={22} fill="#5A5E66" opacity={0.7} />
        <rect x={-60} y={1460} width={1200} height={4} fill="#9AA0A9" opacity={0.6} />
      </Svg>
      <div style={{position: 'absolute', left: 0, right: 0, top: 660, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40}}>
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

// ---- 43 store: v2.1 (the AD: the hand rig a fourth time; a ghost fade; the only blue left in the film): a café table in the
// day, eye level: the phone rises from below the frame into its place, propped against a coffee cup, the real App Store page on
// it (its „Get" pill retinted neutral grey: no blue); the head lifts, „Get" tapped; the two store pills on the table -----------------
const STORE = '26-appstore-page-ink';
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
  const {t, len, L} = useShot('store');
  const r0 = L('storeRise');
  const getAt = L('getTap');
  const p1 = L('pill1');
  const p2 = L('pill2');
  const r = riseIn(t, r0, 30);
  const k = E.inOut(prog(t, 0, len));
  const fl = float(t);
  const W = 380;
  const H = W * 2.25;
  const pose = atFoot({x: 560, w: W, yaw: -12 + fl.roll * 0.5, pitch: 9 + fl.pitch * 0.5, roll: 2.5}, riseFoot(r, 1150, H));
  const liftK = sp(t, getAt - 12, 150, 20) * (1 - E.inOut(prog(t, getAt + 10, 12)));
  const hf = flatRect(pose, HEAD);
  const HS = 1.06;
  const headTo = {x: hf.x - (hf.w * (HS - 1)) / 2, y: hf.y - (hf.h * (HS - 1)) / 2, w: hf.w * HS, h: hf.h * HS};
  const band: Band = {x: HEAD.x0, y: HEAD.y0, w: HEAD.x1 - HEAD.x0, h: HEAD.y1 - HEAD.y0, a: clamp(liftK * 2)};
  return (
    <div style={{position: 'absolute', inset: 0, background: '#EFEDEA', overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${lerp(1, 1.025, k)})`, transformOrigin: '540px 1000px'}}>
        {/* the café behind, soft: the window's daylight, a plant, the far tables */}
        <Svg style={{filter: 'blur(16px)'}}>
          <rect width={1080} height={1920} fill="#E9E6E2" />
          <rect x={-40} y={200} width={560} height={820} fill="#F8F8F7" />
          <rect x={600} y={260} width={420} height={760} fill="#DEDAD5" />
          {[
            [760, 520, 110],
            [860, 430, 90],
            [700, 400, 80],
          ].map(([x, y, rr], i) => (
            <circle key={i} cx={x} cy={y} r={rr} fill={i % 2 ? '#A9AE9F' : '#9BA191'} />
          ))}
          <rect x={720} y={600} width={120} height={180} rx={20} fill="#8E8A84" />
          <rect x={60} y={860} width={300} height={40} rx={10} fill="#CFCAC4" />
        </Svg>
        {/* the table: a pale stone top seen at a low angle, its front edge */}
        <Svg>
          <defs>
            <linearGradient id="stTop" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#E4E1DC" />
              <stop offset="1" stopColor="#F4F2EF" />
            </linearGradient>
          </defs>
          <path d="M-60 1040L1140 1040L1140 1500L-60 1500Z" fill="url(#stTop)" />
          <path d="M-60 1500H1140V1960H-60Z" fill="#CFCAC3" />
          <path d="M-60 1500H1140" stroke="#BDB7AF" strokeWidth={6} />
          {/* the cup and its saucer behind the phone, at the right */}
          <ellipse cx={850} cy={1132} rx={150} ry={34} fill="#E9E7E4" />
          <path d="M770 960Q770 1120 850 1126Q930 1120 930 960Z" fill="#FBFBFA" />
          <ellipse cx={850} cy={960} rx={80} ry={18} fill="#6B4E36" />
          <ellipse cx={850} cy={960} rx={80} ry={18} fill="none" stroke="#FFFFFF" strokeWidth={6} />
          <path d="M930 990Q975 994 972 1036Q968 1074 926 1070" stroke="#FBFBFA" strokeWidth={14} fill="none" />
        </Svg>
        {r > 0.001 ? (
          <>
            <div style={{position: 'absolute', left: pose.x - W * 0.42, top: 1124, width: W * 0.84, height: 40, borderRadius: 30, background: 'rgba(0,0,0,0.22)', filter: 'blur(14px)'}} />
            <Phone3 src={STORE} pose={pose} bar="patch" veil={0.2 * clamp(liftK * 2)} band={band} shadow={0} />
            {liftK > 0.002 ? (
              <Lift src={STORE} r={HEAD} pose={pose} to={headTo} k={liftK} radius={30}>
                {({fx, fy, s}) => <TapRing x={fx(GET.u)} y={fy(GET.v)} k={prog(t, getAt, 16)} s={s * 0.9} />}
              </Lift>
            ) : null}
          </>
        ) : null}
        <div style={{position: 'absolute', left: 0, right: 0, top: 1236, display: 'flex', justifyContent: 'center', gap: 24}}>
          <Pill i={0} k={sp(t, p1, 190, 13)} big />
          <Pill i={1} k={sp(t, p2, 190, 13)} big />
        </div>
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
