// v140-shared-pin: a friend's map pin to a mountain village, opened in the navigator and carried onto the car's own screen.
// Six pictures of ONE trip, each its own "shot" (never the same picture twice):
//   pin      the shared location card rises over the mountains, the pin drops onto a serpentine road (hitAt)
//   share    the card above the share row; on hitAt it flies into VINARI's icon, which takes it with a small pop
//   dash     the cabin from the console: the phone on its mount, the car's display dark; on hitAt the map leaves the phone
//            in an accent frame and lands on the display (the real CarPlay capture), then a tap on VINARI
//   turn     closer on the display: the real turn card in Georgian, its card ringed; the door speakers breathe with the voice
//   alt      the car climbing a mountain road from the side, an altimeter beside it; on hitAt the height lands
//   arrive   the display shows the real arrival screen at the village, the road ending in front of the glass
// A picture (full bleed): sky, mountains, ground or the dash run to the frame's edges; the subtitle band holds only the
// dash's flat face or the ground. Every display, card and phone is whole and marked OBJ.
import React, {useId} from 'react';
import {Img, staticFile, useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, Sfx} from '../common';
import {C, rgba} from '../../tokens';
import {ease, prog, spr} from '../../lib/anim';
import {CameraLayer, Hud} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import {OBJ} from '../../lib/layer';
import type {SceneCtx} from '../../types';
import {Backdrop} from '../illo/backdrop';
import {Car} from '../illo/car';
import {acc, accRamp, tone} from '../illo/palette';
import {FOOT, IlloBand, Svg, TOP} from '../illo/scene';
import {AppIcon} from '../kit/ios';
import {INK, WHITE} from '../kit/stage';

type Box = {x: number; y: number; w: number; h: number};
type P = {
  look?: 'illustrated';
  shot?: 'pin' | 'share' | 'dash' | 'turn' | 'alt' | 'arrive';
  hitAt?: number | string;
  tapAt?: number | string;
  src?: string; // a CarPlay capture under public/screens/carplay (no extension)
  ring?: Box; // capture fractions of the element the voice is about
  tap?: {x: number; y: number};
  line?: string; // the punch that lands on hitAt
  word?: string; // the card's one word
};

const useTimes = (p: P, ctx: SceneCtx) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 10, cueFrame(ctx, p.hitAt ?? 1));
  const tap = p.tapAt === undefined ? -1 : Math.max(base + 10, cueFrame(ctx, p.tapAt));
  return {frame, e, base, hit, tap};
};

/** the real CarPlay capture by name (each a plain staticFile path) */
const Cap: React.FC<{name?: string; style: React.CSSProperties}> = ({name, style}) =>
  name === 'f18-03-home-car' ? (
    <Img src={staticFile('screens/carplay/f18-03-home-car.png')} style={style} />
  ) : name === 'f18-07-preview-car' ? (
    <Img src={staticFile('screens/carplay/f18-07-preview-car.png')} style={style} />
  ) : name === 'f18-14-arrived-car' ? (
    <Img src={staticFile('screens/carplay/f18-14-arrived-car.png')} style={style} />
  ) : (
    <Img src={staticFile('screens/carplay/f18-10-guid1-car.png')} style={style} />
  );
const lerpB = (a: Box, b: Box, t: number): Box => ({x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, w: a.w + (b.w - a.w) * t, h: a.h + (b.h - a.h) * t});

/** sky and mountains (depth 0.6) and the ground from `base` down to the frame's foot (depth 1) */
const World: React.FC<{uid: string; frame: number; base: number; drift?: number}> = ({uid, frame, base, drift = 0.3}) => (
  <>
    <CameraLayer depth={0.6}>
      <Svg>
        <Backdrop kind="mountains" uid={`${uid}b`} frame={frame} base={base} drift={drift} seed={4} />
      </Svg>
    </CameraLayer>
    <CameraLayer depth={1}>
      <Svg>
        <rect x={-200} y={base} width={1480} height={FOOT - base} fill={tone(1)} />
      </Svg>
    </CameraLayer>
  </>
);

/** the car's display: a black bezel, the real capture inside (fading up from black at `on`), an accent ring and a tap */
const Display: React.FC<{b: Box; cap?: string; on: number; ring?: Box; ringK?: number; tap?: {x: number; y: number}; tapK?: number}> = ({b, cap, on, ring, ringK = 0, tap, tapK = 0}) => {
  const bez = Math.round(b.w * 0.022);
  const iw = b.w - 2 * bez;
  const ih = b.h - 2 * bez;
  return (
    <div className={OBJ} style={{position: 'absolute', left: b.x, top: b.y, width: b.w, height: b.h, borderRadius: bez * 1.6, backgroundColor: INK, boxShadow: `0 30px 60px ${rgba(INK, 0.28)}`}}>
      <div style={{position: 'absolute', left: bez, top: bez, width: iw, height: ih, borderRadius: bez * 0.8, overflow: 'hidden', backgroundColor: INK}}>
        {on > 0 ? <Cap name={cap} style={{position: 'absolute', left: 0, top: 0, width: iw, height: ih, opacity: on, transform: `scale(${(1.04 - 0.04 * on).toFixed(4)})`}} /> : null}
        {ring && ringK > 0 ? (
          <div style={{position: 'absolute', left: ring.x * iw - 10, top: ring.y * ih - 10, width: ring.w * iw + 20, height: ring.h * ih + 20, borderRadius: 26, borderWidth: 6, borderStyle: 'solid', borderColor: acc('a'), opacity: Math.min(1, ringK), transform: `scale(${(1.08 - 0.08 * ringK).toFixed(4)})`}} />
        ) : null}
        {tap && tapK > 0 && tapK < 1 ? (
          <div style={{position: 'absolute', left: tap.x * iw - 40 - 30 * tapK, top: tap.y * ih - 40 - 30 * tapK, width: 80 + 60 * tapK, height: 80 + 60 * tapK, borderRadius: 999, borderWidth: 5, borderStyle: 'solid', borderColor: WHITE, opacity: 1 - tapK}} />
        ) : null}
      </div>
    </div>
  );
};

/** the windshield view: mountains, the road running to the horizon (its dashes streaming), the dash from `dash` down */
const Cabin: React.FC<{uid: string; frame: number; dash: number; horizon: number; bend?: number; end?: number}> = ({uid, frame, dash, horizon, bend = 0, end = 0}) => {
  const run = (frame * 9) % 120;
  const vx = 540 + bend * 160;
  const dashes = [];
  for (let i = 0; i < 6; i++) {
    const z = ((i * 120 + run) % 720) / 720; // 0 far .. 1 near
    const y0 = horizon + (dash - horizon) * z * z;
    const z1 = Math.min(1, z + 0.06);
    const y1 = horizon + (dash - horizon) * z1 * z1;
    const cx = vx + (540 - vx) * z;
    const w = 4 + 18 * z;
    if (1 - end > z) dashes.push(<path key={i} d={`M${cx - w / 2} ${y0}L${cx + w / 2} ${y0}L${cx + w} ${y1}L${cx - w} ${y1}Z`} fill={tone(0)} />);
  }
  return (
    <>
      <CameraLayer depth={0.6}>
        <Svg>
          <Backdrop kind="mountains" uid={`${uid}b`} frame={frame} base={horizon + 6} drift={0.2} seed={7} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={0.8}>
        <Svg>
          <rect x={-200} y={horizon} width={1480} height={dash - horizon + 200} fill={tone(1)} />
          <path d={`M${vx - 14} ${horizon}L${vx + 14} ${horizon}L${1240} ${dash + 40}L${-160} ${dash + 40}Z`} fill={tone(3)} />
          {dashes}
          {end > 0 ? <rect x={vx - 120} y={horizon - 4} width={240} height={12} rx={6} fill={tone(5)} opacity={end} /> : null}
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1.15}>
        <Svg>
          {/* the windshield's frame: the roof liner and the A-pillars, then the dash's soft top edge and its flat face */}
          <path d={`M-200 ${TOP}H1280V${TOP + 260}H-200Z`} fill={tone(6)} />
          <path d={`M-200 ${TOP}L80 ${TOP}L-30 ${dash}L-200 ${dash}Z`} fill={tone(6)} />
          <path d={`M1280 ${TOP}L1000 ${TOP}L1110 ${dash}L1280 ${dash}Z`} fill={tone(6)} />
          <path d={`M-200 ${dash + 30}C200 ${dash - 34} 880 ${dash - 34} 1280 ${dash + 30}V${FOOT}H-200Z`} fill={tone(5)} />
          <path d={`M-200 ${dash + 100}C200 ${dash + 44} 880 ${dash + 44} 1280 ${dash + 100}V${FOOT}H-200Z`} fill={tone(6)} />
        </Svg>
      </CameraLayer>
    </>
  );
};

// ---- pin: the shared location card ------------------------------------------------------------------------------------
const PinShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {frame, e, base, hit} = useTimes(p, ctx);
  const k = spr(frame, e, 'enterXL');
  const drop = spr(frame, hit, 'land');
  const card: Box = {x: 200, y: 470, w: 680, h: 720};
  const map: Box = {x: 30, y: 30, w: 620, h: 500};
  const road = 'M60 470C160 420 120 330 250 320S420 360 470 270S380 150 520 110S600 60 640 40';
  const pinX = map.x + 470;
  const pinY = map.y + 270;
  return (
    <IlloBand uid={uid}>
      <World uid={uid} frame={frame} base={1010} />
      <CameraLayer depth={1}>
        <div className={OBJ} style={{position: 'absolute', left: card.x, top: card.y, width: card.w, height: card.h, borderRadius: 44, backgroundColor: C.surface, boxShadow: `0 40px 80px ${rgba(INK, 0.18)}`, opacity: Math.min(1, k * 1.4), transform: `translateY(${((1 - k) * 220).toFixed(1)}px) rotate(${(-3 * (1 - k)).toFixed(2)}deg)`}}>
          <svg width={card.w} height={card.h} style={{position: 'absolute', left: 0, top: 0}}>
            <defs>
              <clipPath id={`${uid}m`}>
                <rect x={map.x} y={map.y} width={map.w} height={map.h} rx={28} />
              </clipPath>
            </defs>
            <g clipPath={`url(#${uid}m)`}>
              <rect x={map.x} y={map.y} width={map.w} height={map.h} fill={tone(1)} />
              {[0, 1, 2, 3].map((i) => (
                <ellipse key={i} cx={map.x + 420} cy={map.y + 210} rx={90 + i * 85} ry={60 + i * 58} fill="none" stroke={tone(2)} strokeWidth={4} />
              ))}
              <g transform={`translate(${map.x} ${map.y})`}>
                <path d={road} fill="none" stroke={tone(3)} strokeWidth={30} strokeLinecap="round" />
                <path d={road} fill="none" stroke={tone(0)} strokeWidth={18} strokeLinecap="round" />
              </g>
            </g>
            <g transform={`translate(${pinX} ${(pinY - (1 - drop) * 260).toFixed(1)}) scale(${(0.9 + 0.1 * drop).toFixed(3)})`} opacity={frame >= hit ? 1 : 0}>
              <ellipse cx={0} cy={4} rx={22} ry={8} fill={rgba(INK, 0.25)} />
              <path d="M0 0C-12 -40 -46 -58 -46 -96A46 46 0 1 1 46 -96C46 -58 12 -40 0 0Z" fill={accRamp(acc('a'), 3)} />
              <circle cx={0} cy={-96} r={17} fill={tone(0)} />
            </g>
            <circle cx={map.x + 46} cy={map.y + map.h + 86} r={32} fill={tone(1)} />
            <path d={`M${map.x + 46} ${map.y + map.h + 106}c0 0-16-13-16-25a16 16 0 1 1 32 0c0 12-16 25-16 25z`} fill={tone(6)} />
          </svg>
          <div style={{position: 'absolute', left: map.x + 100, top: map.y + map.h + 50, whiteSpace: 'nowrap'}}>
            <Words text={p.word ?? 'ლოკაცია'} at={Math.max(base, e + 6)} fx="mask" size={58} color={C.ink} sound={false} />
          </div>
        </div>
      </CameraLayer>
      <Sfx name="asmr-paper" at={Math.max(base, e + 2)} volume={0.3} />
      <Sfx name="asmr-pop" at={hit} volume={0.4} />
      <Land at={hit + 6} volume={0.4} />
    </IlloBand>
  );
};

// ---- share: the card flies into VINARI ----------------------------------------------------------------------------------
const ShareShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {frame, e, base, hit} = useTimes(p, ctx);
  const k = spr(frame, e, 'enterXL');
  const fly = prog(frame, hit, 16, ease.whipIn);
  const pop = spr(frame, hit + 14, 'land');
  const sheet: Box = {x: 150, y: 1000, w: 780, h: 300};
  const icons: {kind: 'msg' | 'vinari' | 'phone'; x: number}[] = [
    {kind: 'msg', x: 300},
    {kind: 'vinari', x: 540},
    {kind: 'phone', x: 780},
  ];
  const iy = sheet.y + 150;
  const cardW = 520;
  const cardH = 400;
  const cy0 = 700;
  const s = 1 - 0.86 * fly;
  const cy = cy0 + (iy - cy0) * fly;
  return (
    <IlloBand uid={uid}>
      <World uid={uid} frame={frame} base={1060} />
      <CameraLayer depth={1}>
        <div className={OBJ} style={{position: 'absolute', left: sheet.x, top: sheet.y, width: sheet.w, height: sheet.h, borderRadius: 48, backgroundColor: C.surface, boxShadow: `0 30px 70px ${rgba(INK, 0.16)}`, transform: `translateY(${((1 - k) * 160).toFixed(1)}px)`}}>
          {icons.map((ic, i) => {
            const isV = ic.kind === 'vinari';
            const sc = isV ? 1 + 0.16 * pop * (1 - prog(frame, hit + 24, 14)) : 1;
            return (
              <div key={i} style={{position: 'absolute', left: ic.x - sheet.x - 75, top: 75, width: 150, height: 150, borderRadius: 36, transform: `scale(${sc.toFixed(4)})`, boxShadow: isV && pop > 0 ? `0 0 0 ${(7 * Math.min(1, pop)).toFixed(1)}px ${acc('a')}` : undefined}}>
                <AppIcon kind={ic.kind} size={150} />
              </div>
            );
          })}
        </div>
        {fly < 1 ? (
          <div className={OBJ} style={{position: 'absolute', left: 540 - cardW / 2, top: cy - cardH / 2, width: cardW, height: cardH, borderRadius: 40, backgroundColor: C.surface, boxShadow: `0 30px 70px ${rgba(INK, 0.18)}`, opacity: Math.min(1, k * 1.4) * (1 - fly * 0.6), transform: `scale(${s.toFixed(4)})`}}>
            <svg width={cardW} height={cardH} style={{position: 'absolute', left: 0, top: 0}}>
              <rect x={24} y={24} width={cardW - 48} height={cardH - 48} rx={26} fill={tone(1)} />
              <path d="M60 330C150 290 130 220 230 210S360 240 400 170S340 90 460 60" fill="none" stroke={tone(3)} strokeWidth={26} strokeLinecap="round" />
              <path d="M60 330C150 290 130 220 230 210S360 240 400 170S340 90 460 60" fill="none" stroke={tone(0)} strokeWidth={15} strokeLinecap="round" />
              <g transform="translate(400 175)">
                <path d="M0 0C-9 -30 -34 -44 -34 -72A34 34 0 1 1 34 -72C34 -44 9 -30 0 0Z" fill={accRamp(acc('a'), 3)} />
                <circle cx={0} cy={-72} r={12} fill={tone(0)} />
              </g>
            </svg>
          </div>
        ) : null}
      </CameraLayer>
      <Hud>
        <div style={{position: 'absolute', left: 170, top: 520, whiteSpace: 'nowrap'}}>
          <Words text={p.line ?? '*ვინარი*'} at={hit + 16} fx="slam" size={96} color={C.ink} />
        </div>
      </Hud>
      <Sfx name="asmr-air" at={Math.max(base, hit - 2)} volume={0.32} />
      <Sfx name="asmr-tap" at={hit + 14} volume={0.4} />
      <Haptic kind="light" at={hit + 14} />
    </IlloBand>
  );
};

// ---- dash: the map leaves the phone for the car's display --------------------------------------------------------------
const DashShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {frame, base, hit, tap} = useTimes(p, ctx);
  const dash = 1000;
  const disp: Box = {x: 170, y: 600, w: 740, h: 444};
  const phone: Box = {x: 190, y: 1100, w: 116, h: 236};
  const go = prog(frame, hit, 16, ease.whipIn);
  const on = prog(frame, hit + 12, 10);
  const fr = lerpB(phone, disp, go);
  const tapK = tap < 0 ? 0 : prog(frame, tap, 16);
  return (
    <IlloBand uid={uid}>
      <Cabin uid={uid} frame={frame} dash={dash} horizon={760} />
      <CameraLayer depth={1}>
        {/* the phone on its mount by the vents: its own little map */}
        <div className={OBJ} style={{position: 'absolute', left: phone.x, top: phone.y, width: phone.w, height: phone.h, borderRadius: 22, backgroundColor: INK}}>
          <div style={{position: 'absolute', left: 6, top: 6, width: phone.w - 12, height: phone.h - 12, borderRadius: 17, backgroundColor: tone(1), overflow: 'hidden', opacity: 1 - 0.6 * on}}>
            <svg width={phone.w - 12} height={phone.h - 12}>
              <path d="M10 200C40 170 30 120 60 110S90 70 80 20" fill="none" stroke={tone(0)} strokeWidth={9} strokeLinecap="round" />
              <circle cx={80} cy={22} r={9} fill={acc('a')} />
            </svg>
          </div>
        </div>
        <Display b={disp} cap={p.src ?? 'f18-03-home-car'} on={on} tap={p.tap} tapK={tapK} />
        {go > 0 && on < 1 ? <div style={{position: 'absolute', left: fr.x, top: fr.y, width: fr.w, height: fr.h, borderRadius: 24, borderWidth: 6, borderStyle: 'solid', borderColor: acc('a'), opacity: 1 - on}} /> : null}
      </CameraLayer>
      <Sfx name="asmr-air-long" at={Math.max(base, hit - 4)} volume={0.3} />
      <Sfx name="asmr-screen" at={hit + 12} volume={0.4} />
      <Haptic kind="light" at={hit + 12} />
      {tap >= 0 ? <Sfx name="asmr-tap" at={tap} volume={0.4} /> : null}
    </IlloBand>
  );
};

// ---- turn: the display close, the turn card ringed, the door speakers breathing --------------------------------------
const TurnShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {frame, e, base, hit} = useTimes(p, ctx);
  const k = spr(frame, e, 'enterXL');
  const disp: Box = {x: 120, y: 540, w: 840, h: 504};
  const ringK = spr(frame, hit, 'land');
  const talking = (ctx.speech ?? []).some(([a, z]) => frame >= a && frame <= z) ? 1 : 0.2;
  const grille = (cx: number, cy: number) => {
    const pulse = 1 + 0.04 * talking * Math.sin(frame / 2.3);
    const holes = [];
    for (let r = 0; r < 3; r++) {
      const n = 6 + r * 6;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        holes.push(<circle key={`${r}-${i}`} cx={cx + Math.cos(a) * (16 + r * 18)} cy={cy + Math.sin(a) * (16 + r * 18)} r={5} fill={tone(7)} />);
      }
    }
    return (
      <g transform={`translate(${cx} ${cy}) scale(${pulse.toFixed(4)}) translate(${-cx} ${-cy})`}>
        <circle cx={cx} cy={cy} r={78} fill={tone(4)} />
        <circle cx={cx} cy={cy} r={78} fill="none" stroke={tone(7)} strokeWidth={5} />
        {holes}
      </g>
    );
  };
  return (
    <IlloBand uid={uid}>
      <Cabin uid={uid} frame={frame} dash={1080} horizon={720} bend={-1} />
      <CameraLayer depth={1.15}>
        <Svg>
          {grille(260, 1210)}
          {grille(820, 1210)}
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, transform: `scale(${(0.96 + 0.04 * k).toFixed(4)})`, transformOrigin: '540px 800px'}}>
          <Display b={disp} cap={p.src ?? 'f18-10-guid1-car'} on={1} ring={p.ring ?? {x: 0.135, y: 0.03, w: 0.35, h: 0.605}} ringK={ringK} />
        </div>
      </CameraLayer>
      <Sfx name="asmr-knock" at={Math.max(base, hit)} volume={0.32} />
      <Haptic kind="light" at={hit} />
    </IlloBand>
  );
};

// ---- alt: the climb and the altimeter ----------------------------------------------------------------------------------
const AltShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {frame, e, base, hit} = useTimes(p, ctx);
  const len = Math.max(1, ctx.dur);
  const slope = -0.3; // the road rises to the right
  const gy = (x: number) => 1150 + (x - 540) * slope;
  const climb = prog(frame, e, len - e, ease.drift);
  const carX = 470 + 200 * climb;
  const ang = (Math.atan(slope) * 180) / Math.PI;
  const mark = prog(frame, e + 4, Math.max(10, hit - e - 4), ease.enter);
  const land = spr(frame, hit, 'land');
  const rulerTop = 470;
  const rulerBot = 960;
  const my = rulerBot - (rulerBot - rulerTop) * 0.5 * mark;
  const ticks = [
    {v: '1 000', y: rulerBot},
    {v: '1 500', y: (rulerTop + rulerBot) / 2},
    {v: '2 000', y: rulerTop},
  ];
  return (
    <IlloBand uid={uid}>
      <CameraLayer depth={0.6}>
        <Svg>
          <Backdrop kind="mountains" uid={`${uid}b`} frame={frame} base={1000} drift={0.35} seed={11} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          <path d={`M-200 ${gy(-200)}L1280 ${gy(1280)}V${FOOT}H-200Z`} fill={tone(2)} />
          <path d={`M-200 ${gy(-200) - 6}L1280 ${gy(1280) - 6}`} stroke={tone(4)} strokeWidth={22} />
          <path d={`M-200 ${gy(-200) + 70}L1280 ${gy(1280) + 70}V${FOOT}H-200Z`} fill={tone(1)} />
          <g transform={`rotate(${ang.toFixed(2)} ${carX.toFixed(1)} ${(gy(carX) - 8).toFixed(1)})`}>
            <Car uid={`${uid}c`} x={carX} y={gy(carX) - 8} len={420} view="side" body="suv" paint="a" frame={frame} speed={0.35} />
          </g>
        </Svg>
      </CameraLayer>
      <Hud>
        <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
          <line x1={190} y1={rulerTop} x2={190} y2={rulerBot} stroke={tone(5)} strokeWidth={6} strokeLinecap="round" />
          {ticks.map((t, i) => (
            <line key={i} x1={170} y1={t.y} x2={214} y2={t.y} stroke={tone(5)} strokeWidth={6} strokeLinecap="round" />
          ))}
          <path d={`M224 ${my.toFixed(1)}l30 -20v40z`} fill={acc('a')} />
        </svg>
        {ticks.map((t, i) => (
          <div key={i} style={{position: 'absolute', left: 270, top: t.y - 24, whiteSpace: 'nowrap', opacity: i === 1 ? 1 - Math.min(1, land) : 0.85}}>
            <Words text={t.v} at={Math.max(base, e + 4 + i * 3)} fx="mask" size={40} color={C.ink2} sound={false} />
          </div>
        ))}
        <div style={{position: 'absolute', left: 270, top: (rulerTop + rulerBot) / 2 - 62, whiteSpace: 'nowrap'}}>
          <Words text={p.line ?? '*1 500* მ'} at={hit} fx="slam" size={104} color={C.ink} />
        </div>
      </Hud>
      <Land at={hit} volume={0.42} />
    </IlloBand>
  );
};

// ---- arrive: the arrival screen, the road ending at the village -------------------------------------------------------
const ArriveShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {frame, e, base, hit} = useTimes(p, ctx);
  const k = spr(frame, e, 'enterXL');
  const stop = prog(frame, e, Math.max(10, hit - e), ease.enter);
  const disp: Box = {x: 200, y: 640, w: 680, h: 408};
  const ringK = spr(frame, hit, 'land');
  return (
    <IlloBand uid={uid}>
      <Cabin uid={uid} frame={Math.round(frame * (1 - 0.8 * stop))} dash={1060} horizon={800} end={stop} />
      <CameraLayer depth={1}>
        <div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, transform: `translateY(${((1 - k) * 60).toFixed(1)}px)`}}>
          <Display b={disp} cap={p.src ?? 'f18-14-arrived-car'} on={1} ring={p.ring ?? {x: 0.135, y: 0.215, w: 0.35, h: 0.165}} ringK={ringK} />
        </div>
      </CameraLayer>
      <Sfx name="asmr-notif" at={Math.max(base, hit)} volume={0.32} />
      <Haptic kind="light" at={hit} />
    </IlloBand>
  );
};

export const V140SharedPin: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) =>
  p.shot === 'share' ? (
    <ShareShot p={p} ctx={ctx} />
  ) : p.shot === 'dash' ? (
    <DashShot p={p} ctx={ctx} />
  ) : p.shot === 'turn' ? (
    <TurnShot p={p} ctx={ctx} />
  ) : p.shot === 'alt' ? (
    <AltShot p={p} ctx={ctx} />
  ) : p.shot === 'arrive' ? (
    <ArriveShot p={p} ctx={ctx} />
  ) : (
    <PinShot p={p} ctx={ctx} />
  );
