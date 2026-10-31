// The OBD promo's explainers and inserts (2026-10-30): the three sellers with the same line, the cluster with its dark lamp, last
// night's quiet clearing, the x-ray (the lamp out, the fault still there), the adapter out of a pocket, the port at knee height,
// the car's own checks (they start again after a clear), the scan's ring (most checks still waiting), the app's own words on a
// paper card (clearly not a phone: no capture of that result exists), a week of evenings, every car you want. Each beat its own
// picture. Text only black or white; amber only on pictures (the lamp, a marker on a pictogram).
import React from 'react';
import {Img, staticFile} from 'remotion';
import {mtav} from '../lib/format';
import {textWidth} from '../lib/measure';
import {F} from '../tokens';
import {clamp, E, lerp, prog, sp} from './lib';
import {Car3, projectCar, type CarCam} from './kit/car3d';
import {Street} from './kit/street';
import {Seller, SellerB, SellerC} from './kit/people';
import {Cluster, CHECK_AT, CheckLamp} from './kit/cluster';
import {GripBack, GripFront} from './kit/grip';
import {AdapterBody, DAY_SKIN, FootwellDay, PortFace} from './kit/bits';
import {CheckDot, MarkArrow, MarkCircle, MarkTick} from './kit/marks';
import {Car as IlloCar, type CarBody} from '../scenes/illo/car';
import {AMBER, breath, Card, cssCam, EngineIcon, INK, jolt, Label, mixCam, personAt, punch, riseIn, Svg, useShot, WHITE} from './kit/stage';

const PAPER = '#F3F3F3';
const Paper: React.FC<{children: React.ReactNode; bg?: string}> = ({children, bg = PAPER}) => <div style={{position: 'absolute', inset: 0, background: bg, overflow: 'hidden'}}>{children}</div>;

/** a small white speech bubble with a few words in ink, its tail down-left */
const Bubble: React.FC<{x: number; y: number; k: number; text: string; size?: number}> = ({x, y, k, text, size = 34}) => {
  if (k <= 0.01) return null;
  const w = textWidth(mtav(text), `700 ${size}px ${F.sans}`) + size * 1.2;
  const h = size * 1.9;
  return (
    <div style={{position: 'absolute', left: x, top: y - h, opacity: clamp(k * 2), transform: `scale(${lerp(0.6, 1, E.outBack(clamp(k)))})`, transformOrigin: '0 100%'}}>
      <svg width={w + 4} height={h + 26} style={{position: 'absolute', left: -2, top: 0, overflow: 'visible'}}>
        <path d={`M${h / 2} 0H${w - h / 2}A${h / 2} ${h / 2} 0 0 1 ${w - h / 2} ${h}H${h * 0.9}L${h * 0.25} ${h + 22}L${h * 0.42} ${h - 2}A${h / 2} ${h / 2} 0 0 1 ${h / 2} 0Z`} fill={WHITE} style={{filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.13))'}} />
      </svg>
      <div style={{position: 'absolute', left: 0, top: 0, width: w, height: h, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.sans, fontWeight: 700, fontSize: size, color: INK, whiteSpace: 'nowrap'}}>{mtav(text)}</div>
    </div>
  );
};

// ---- sellers: „ამ ქალს ყველა გამყიდველი იცნობს." three sellers, three modern cars, three slaps in near-sync, the same line ----
const ROWS: {y: number; body: CarBody; paint: number; who: 0 | 1 | 2}[] = [
  {y: 600, body: 'suv', paint: 3, who: 1},
  {y: 950, body: 'sedan', paint: 1, who: 0},
  {y: 1300, body: 'ev', paint: 4, who: 2},
];
export const SellersShot: React.FC = () => {
  const {t, len, Ls} = useShot('sellers');
  const slaps = Ls('slaps');
  const k = E.inOut(prog(t, 0, len));
  const drift = lerp(-24, 24, k);
  const Who = [Seller, SellerB, SellerC];
  return (
    <Paper>
      {/* v2 (the reviewers: rows 2 and 3 blinked off for single frames while fading in under an SVG <g opacity>): every row is
          its own layer, faded by CSS opacity, and it rises in rather than fading from nothing */}
      {ROWS.map((r, i) => {
        const a = E.out(prog(t, i * 2 - 2, 10));
        const cx = 360 + drift * (i % 2 ? -1 : 1);
        const S = Who[r.who];
        const hit = t >= slaps[i] && t < slaps[i] + 6 ? 4 * Math.sin(((t - slaps[i]) / 6) * Math.PI) : 0;
        return (
          <div key={i} style={{position: 'absolute', inset: 0, opacity: Math.max(0.001, a), transform: `translateY(${((1 - a) * 30).toFixed(2)}px)`}}>
            <Svg>
              <IlloCar uid={`sl${i}`} x={cx} y={r.y + hit * 0.5} len={560} body={r.body} paint={r.paint} frame={t} />
              <S uid={`sls${i}`} x={cx + 340} y={r.y + 14} size={300} frame={t} pose="offer" face="grin" turn={-0.62} light="day" />
            </Svg>
          </div>
        );
      })}
      {ROWS.map((r, i) => (
        <Bubble key={i} x={360 + drift * (i % 2 ? -1 : 1) + 410} y={r.y - 250} k={sp(t, slaps[i] + 2, 170, 14)} text="ქალს ჰყავდა" size={30} />
      ))}
    </Paper>
  );
};

// ---- cluster: „ნახე, ჩეკიც არ ანთია!" the crossover's cluster in the day, every lamp dark; an amber marker circle draws round
// the place where the check lamp lives; a slow push toward it --------------------------------------------------------------------
export const ClusterShot: React.FC = () => {
  const {t, len, L} = useShot('cluster');
  const at = L('circle');
  const k = E.inOut(prog(t, 0, len));
  const s = lerp(1.08, 1.2, k);
  const cx = 540;
  const cy = 960;
  const lx = 540 + (CHECK_AT.x - cx) * s;
  const ly = 960 + (CHECK_AT.y - cy) * s;
  return (
    <Paper bg="#2C2E33">
      <Svg>
        <Cluster uid="cl" look="day" frame={t} check={0} on={1} rpm={0.12} speed={0} cam={{s, cx, cy}} />
        <MarkCircle cx={lx} cy={ly} rx={86 * s} ry={64 * s} k={prog(t, at - 4, 12)} width={9} seed={2} />
      </Svg>
    </Paper>
  );
};

// ---- night: last night, the same street: the seller crouched at the crossover's open door with a cheap tool, the street lamp's
// warm light; in a round inset the amber lamp clicks OFF; the small kicker „წუხელ" ------------------------------------------------
const NI0: CarCam = {pos: [10.61, 1.35, 12.64], target: [0.11, 1.0, -0.1], fov: 34};
const NI1: CarCam = {pos: [10.4, 1.35, 12.38], target: [0.11, 1.0, -0.1], fov: 34};
export const NightShot: React.FC = () => {
  const {t, len, L} = useShot('night');
  const off = L('off');
  const k = E.inOut(prog(t, 0, len));
  const cam = mixCam(NI0, NI1, k);
  const sel = personAt(cam, 1.55, 0.55, 1.8) ?? {x: 600, y: 1300, size: 700};
  const lamp = t < off ? 1 : t < off + 2 ? 0.4 : 0;
  const inK = E.out(prog(t, 2, 10));
  return (
    <Paper bg="#0F0D12">
      <Street cam={cam} uid="ni" look="night" nearTree={false} />
      <Car3 cam={cam} night={1} street={0.6} lamp={0} shadow={0.9} cool={0.1} coolFrom={[6, 4, 8]} style={{filter: 'saturate(0.45) sepia(0.1)'}} />
      <Svg>
        <Seller uid="nis" x={sel.x} y={sel.y} size={sel.size} frame={t} pose="phoneLook" hold="phone" face="smirk" turn={-0.7} light="garage" level={0.85} acts={[{at: off - 4, pose: 'hold', hold: 'phone', face: 'grin'}]} />
        <g opacity={inK} transform={`translate(0 ${(1 - inK) * 20})`}>
          <circle cx={540} cy={400} r={150} fill="#08080A" stroke="#3A3A3E" strokeWidth={4} />
          <CheckLamp x={540} y={400} size={120} k={lamp} frame={t} uid="nil" />
        </g>
      </Svg>
      <Label text="წუხელ" x={540} y={580} k={inK} size={50} dark weight={600} />
    </Paper>
  );
};

// ---- xray: the crossover in profile as a pale x-ray in the white world: the lamp over it goes out, but the fault stays where
// it is: an amber pulse low by the catalyst, an ink arrow from „ხარვეზი" to it ------------------------------------------------------
const XR: CarCam = {pos: [19.5, 1.7, 0.2], target: [0, 0.85, 0.0], fov: 33};
const XR_DY = 60;
export const XrayShot: React.FC = () => {
  const {t, len, L} = useShot('xray');
  const offAt = L('lampOff');
  const faultAt = L('fault');
  const arrowAt = L('arrow');
  const k = E.inOut(prog(t, 0, len));
  const cat = projectCar(XR, [0.2, 0.35, -0.2]);
  const cx = cat.x;
  const cy = cat.y + XR_DY;
  const lampK = t < offAt ? 1 : 1 - E.out(prog(t, offAt, 6));
  const pulse = 0.55 + 0.45 * Math.sin(t / 5);
  const fk = E.out(prog(t, faultAt - 6, 10));
  return (
    <Paper bg="#F4F4F4">
      <div style={{position: 'absolute', inset: 0, transform: `translateY(${XR_DY}px) scale(${lerp(1, 1.04, k)})`, transformOrigin: `540px ${960 - XR_DY}px`, opacity: 0.34}}>
        <Car3 cam={XR} night={0} shadow={0.6} glassA={0.5} />
      </div>
      <Svg>
        <defs>
          <radialGradient id="xrGlow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor={AMBER} stopOpacity={0.75} />
            <stop offset="0.4" stopColor={AMBER} stopOpacity={0.25} />
            <stop offset="1" stopColor={AMBER} stopOpacity={0} />
          </radialGradient>
        </defs>
        {/* the lamp over the car: lit, then out */}
        <g transform="translate(540 470)">
          <circle r={96} fill={WHITE} style={{filter: 'drop-shadow(0 16px 30px rgba(0,0,0,0.12))'}} />
          <EngineIcon uid="xrl" x={0} y={0} size={120} k={lampK} glow={0.9} off="#9A9A9A" stroke={1.8} />
        </g>
        {/* the fault, still there */}
        <circle cx={cx} cy={cy} r={110 + 18 * pulse} fill="url(#xrGlow)" opacity={fk} />
        <circle cx={cx} cy={cy} r={16} fill={AMBER} opacity={fk} />
        <MarkArrow a={[cx + 300, cy - 300]} b={[cx + 40, cy - 40]} k={prog(t, arrowAt - 4, 12)} bow={-0.18} />
      </Svg>
      <Label text="ჩეკი" x={540} y={600} k={E.out(prog(t, 0, 10))} size={44} weight={600} />
      <Label text="ხარვეზი" x={cx + 230} y={cy - 390} k={E.out(prog(t, arrowAt - 6, 10))} size={52} anchor="l" />
    </Paper>
  );
};

// ---- pocket: the buyer's hand brings a small ELM327 adapter up out of his pocket, the street soft behind; its chip pops ----------
const PK: CarCam = {pos: [5.06, 1.45, 12.52], target: [-0.32, 1.0, 0.13], fov: 34};
export const PocketShot: React.FC = () => {
  const {t, len, L} = useShot('pocket');
  const chip = L('chip');
  const r = riseIn(t, L('adapter') - 8, 30);
  const k = E.inOut(prog(t, 0, len));
  const s = 1.15;
  const cx = 540;
  const top = lerp(1960, 600, Math.min(1.02, r)) + 6 * Math.sin(t / 14);
  const body = {x: cx - 200 * s, y: top + 120 * s, w: 400 * s, h: 330 * s};
  const hand = {x: body.x + 0.02 * body.w, y: body.y - 0.1 * body.h, w: body.w * 0.98, h: body.h * 1.45};
  const ck = sp(t, chip, 160, 15);
  return (
    <Paper bg="#EDEDED">
      <div style={{position: 'absolute', inset: 0, filter: 'blur(14px)', transform: `scale(${lerp(1.04, 1.08, k)})`}}>
        <Street cam={PK} uid="pk" look="day" nearTree={false} />
        <Car3 cam={PK} night={0} shadow={1} lamp={0.2} />
      </div>
      <div style={{position: 'absolute', inset: 0, transform: `rotate(${lerp(-6, -2, k)}deg)`, transformOrigin: '540px 900px'}}>
        <GripBack b={hand} id="pkb" skin={DAY_SKIN} />
        <Svg>
          <AdapterBody cx={cx} top={top} s={s} led={0} uid="pka" />
        </Svg>
        <GripFront b={hand} id="pkf" skin={DAY_SKIN} />
      </div>
      {ck > 0.01 ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: 300, display: 'flex', justifyContent: 'center', opacity: clamp(ck * 1.6), transform: `translateY(${(1 - clamp(ck)) * 16}px)`}}>
          <div style={{padding: '18px 40px 20px', borderRadius: 999, background: WHITE, fontFamily: F.sans, fontWeight: 700, fontSize: 44, color: INK, whiteSpace: 'nowrap', boxShadow: '0 16px 40px rgba(0,0,0,0.14)'}}>
            ELM327 · Wi-Fi {mtav('ან')} BLE
          </div>
        </div>
      ) : null}
    </Paper>
  );
};

// ---- plug: in the footwell, at knee height under the wheel: an amber dashed line marks the height, the adapter slides home
// with a click, its LED wakes -----------------------------------------------------------------------------------------------------------
const PORT_AT = {x: 300, y: 1020};
export const PlugShot: React.FC = () => {
  const {t, len, L} = useShot('plug');
  const knee = L('knee');
  const click = L('click');
  const ledAt = L('led');
  const inAt = click - 30;
  const k = E.inOut(prog(t, 0, len));
  const S = lerp(1.22, 1.3, k);
  const PS = 0.46;
  const mouth = PORT_AT.y - (210 * PS) / 2;
  const as = (PS * 440) / 380;
  const across = E.out(prog(t, inAt - 2, Math.max(8, click - inAt - 6)));
  const up = E.in2(prog(t, click - 8, 8));
  const snap = t >= click ? 1 : 0;
  const bounce = 5 * Math.sin(Math.max(0, t - click) * 2.4) * Math.exp(-Math.max(0, t - click) / 3) * snap;
  const ax = PORT_AT.x + lerp(360, 0, across);
  const top = lerp(mouth + 58, mouth + 6, up) - 4 * snap + bounce;
  const body = {x: ax - 200 * as, y: top + 120 * as, w: 400 * as, h: 330 * as};
  const away = E.inOut(prog(t, click + 6, 14));
  const hand = {x: body.x + 0.02 * body.w + 520 * away, y: body.y - 0.1 * body.h + 40 * away, w: body.w * 0.98, h: body.h * 1.45};
  const ledK = t < ledAt ? 0 : 0.75 + 0.25 * Math.sin((t - ledAt) / 2.2);
  const shake = t >= click && t < click + 6 ? 2.5 * Math.sin((t - click) * 3) : 0;
  const dash = E.out(prog(t, knee - 6, 16));
  const lk = sp(t, knee, 150, 16);
  return (
    <Paper bg="#2A2C31">
      <div style={cssCam(S, PORT_AT.x, PORT_AT.y, 120, -40 + shake)}>
        <FootwellDay />
        <Svg>
          <path d={`M-60 ${PORT_AT.y}H1140`} stroke={AMBER} strokeWidth={6} strokeDasharray="22 16" strokeLinecap="round" fill="none" pathLength={1} opacity={0.9} style={{strokeDasharray: `${dash} 1`}} />
          <PortFace cx={PORT_AT.x} cy={PORT_AT.y} s={PS} uid="pp" glow={0.35 * (1 - snap)} />
        </Svg>
        <GripBack b={hand} id="plb" skin={DAY_SKIN} />
        <Svg>
          <AdapterBody cx={ax} top={top} s={as} led={ledK} uid="pla" />
        </Svg>
        <GripFront b={hand} id="plf" skin={DAY_SKIN} />
      </div>
      {lk > 0.01 ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: 300, display: 'flex', justifyContent: 'center', opacity: clamp(lk * 1.6), transform: `translateY(${(1 - clamp(lk)) * 16}px)`}}>
          <div style={{padding: '18px 40px 20px', borderRadius: 999, background: WHITE, fontFamily: F.sans, fontWeight: 700, fontSize: 44, color: INK, whiteSpace: 'nowrap'}}>OBD {mtav('ბუდე')}</div>
        </div>
      ) : null}
    </Paper>
  );
};

// ---- selfcheck: the car keeps checking itself: eight checks tick on round it, one by one; on „წაშლი" an ink wipe sweeps across
// and every check starts again (an hourglass) -----------------------------------------------------------------------------------------
const NODE = (i: number) => {
  const a = -Math.PI / 2 + (i / 8) * Math.PI * 2;
  return {x: 540 + 400 * Math.cos(a), y: 860 + 330 * Math.sin(a)};
};
export const SelfcheckShot: React.FC = () => {
  const {t, len, L, Ls} = useShot('selfcheck');
  const ticks = Ls('ticks');
  const wipe = L('wipe');
  const k = E.inOut(prog(t, 0, len));
  const wx = lerp(-80, 1160, E.inOut(prog(t, wipe, 16)));
  return (
    <Paper>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${lerp(1, 1.05, k)})`, transformOrigin: '540px 880px'}}>
        <Svg>
          {Array.from({length: 8}, (_, i) => {
            const n = NODE(i);
            const a = E.out(prog(t, ticks[i] - 4, 8));
            return <path key={`l${i}`} d={`M540 ${930}L${n.x} ${n.y}`} stroke={INK} strokeWidth={2} opacity={0.14 * a} strokeDasharray="6 8" />;
          })}
          <IlloCar uid="sc" x={540} y={1000} len={620} body="suv" paint={3} frame={t} />
          {Array.from({length: 8}, (_, i) => {
            const n = NODE(i);
            const a = sp(t, ticks[i], 170, 15);
            const done = t < wipe || wx < n.x - 20 ? 1 : 0;
            return <CheckDot key={i} x={n.x} y={n.y} r={44} done={done} k={a} />;
          })}
          {t >= wipe && wx < 1150 ? <rect x={wx - 10} y={420} width={20} height={880} rx={10} fill={INK} opacity={0.85} /> : null}
        </Svg>
      </div>
    </Paper>
  );
};

// ---- ring: VINARI reads it, usually in half a minute: the scan's ring fills (10-30 წმ); round it the eight checks: two done, six
// still waiting; the amber marker rings the waiting ones -------------------------------------------------------------------------------
const DONE_FIRST = [0, 3];
export const RingShot: React.FC = () => {
  const {t, len, L} = useShot('ring');
  const r0 = L('ring');
  const half = L('half');
  const k = E.inOut(prog(t, 0, len));
  const fill = E.inOut(prog(t, r0, Math.max(10, half - r0 + 8)));
  const C = {x: 540, y: 840};
  const R = 280;
  const dots = Array.from({length: 8}, (_, i) => {
    const a = -Math.PI / 2 + (i / 8) * Math.PI * 2 + Math.PI / 8;
    return {x: C.x + (R + 110) * Math.cos(a), y: C.y + (R + 110) * Math.sin(a), i};
  });
  const show = (i: number) => sp(t, half + 4 + i * 2, 170, 15);
  return (
    <Paper>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${lerp(1.02, 0.98, k)})`, transformOrigin: `${C.x}px ${C.y}px`}}>
        <Svg>
          <circle cx={C.x} cy={C.y} r={R} fill="none" stroke="#E2E2E2" strokeWidth={30} />
          <circle cx={C.x} cy={C.y} r={R} fill="none" stroke={INK} strokeWidth={30} strokeLinecap="round" pathLength={1} strokeDasharray={`${fill} 1`} transform={`rotate(-90 ${C.x} ${C.y})`} />
          <AdapterBody cx={C.x} top={C.y - 200} s={0.82} led={0.8 + 0.2 * Math.sin(t / 2.2)} uid="rga" />
          {dots.map((d) => (
            <CheckDot key={d.i} x={d.x} y={d.y} r={40} done={DONE_FIRST.includes(d.i) ? 1 : 0} k={show(d.i)} />
          ))}
          <MarkCircle cx={dots[5].x} cy={dots[5].y} rx={70} ry={64} k={prog(t, half + 26, 12)} width={8} seed={5} />
        </Svg>
        {/* the stopwatch: 10-30 წმ */}
        <div style={{position: 'absolute', left: 0, right: 0, top: 290, display: 'flex', justifyContent: 'center', opacity: E.out(prog(t, r0, 8))}}>
          <div style={{display: 'flex', alignItems: 'center', gap: 16, padding: '14px 36px 16px 26px', borderRadius: 999, background: WHITE, fontFamily: F.sans, fontWeight: 700, fontSize: 44, color: INK, whiteSpace: 'nowrap', boxShadow: '0 14px 34px rgba(0,0,0,0.1)'}}>
            <svg width={48} height={48} viewBox="0 0 24 24">
              <circle cx={12} cy={13.5} r={8} fill="none" stroke={INK} strokeWidth={2.2} />
              <path d="M12 13.5V9M10 3H14M18.5 6.5L17 8" stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
            </svg>
            10-30 {mtav('წმ')}
          </div>
        </div>
      </div>
    </Paper>
  );
};

// ---- cleared: the app's own words on a paper card (an explainer card, never a phone: no capture of this result exists): the
// before-purchase check's name, an hourglass, and „კოდები ახლახან წაშლილი ჩანს." built word by word (the card is the line) ------
const CLEAR_WORDS = ['კოდები', 'ახლახან', 'წაშლილი', 'ჩანს.'];
export const ClearedShot: React.FC = () => {
  const {t, len, L, Ls} = useShot('cleared');
  const ws = Ls('cardWords');
  const inK = sp(t, L('card') - 2, 140, 17);
  const k = E.inOut(prog(t, 0, len));
  const rows = [[0, 1], [2, 3]];
  let size = 104;
  const widest = Math.max(...rows.map((r) => textWidth(mtav(r.map((i) => CLEAR_WORDS[i]).join(' ')), `700 ${size}px ${F.sans}`)));
  if (widest > 760) size = Math.floor((size * 760) / widest);
  const gap = size * 0.28;
  return (
    <Paper>
      <div style={{position: 'absolute', inset: 0, transform: `rotate(${lerp(-1.2, 0.4, k)}deg) scale(${lerp(1, 1.03, k)})`, transformOrigin: '540px 860px'}}>
        <Card x={110} y={400} w={860} h={900} k={inK} r={56}>
          <div style={{position: 'absolute', left: 60, top: 54, fontFamily: F.sans, fontWeight: 500, fontSize: 34, color: INK, whiteSpace: 'nowrap'}}>{mtav('ყიდვამდე შემოწმება')}</div>
        </Card>
        <Svg>
          <g opacity={clamp(inK * 1.6)}>
            <CheckDot x={238} y={640} r={84} done={0} />
            <MarkCircle cx={238} cy={640} rx={130} ry={118} k={prog(t, ws[1], 12)} width={9} seed={7} />
          </g>
        </Svg>
        {rows.map((r, li) => {
          const widths = r.map((i) => textWidth(mtav(CLEAR_WORDS[i]), `700 ${size}px ${F.sans}`));
          let x = 170;
          return r.map((i, n) => {
            const kk = E.out(prog(t, ws[i] - 2, 8));
            if (n > 0) x += gap;
            const left = x;
            x += widths[n];
            return (
              <div key={i} style={{position: 'absolute', left, top: 830 + li * size * 1.12, fontFamily: F.sans, fontWeight: 700, fontSize: size, lineHeight: 1.1, color: INK, whiteSpace: 'nowrap', opacity: kk, transform: `translateY(${(1 - kk) * 18}px)`}}>
                {mtav(CLEAR_WORDS[i])}
              </div>
            );
          });
        })}
      </div>
    </Paper>
  );
};

// ---- week: a week of evenings: the crossover glides along the night street under the lamps; the day counter flips 1..7, the lamp
// in the pill comes back on day 2 and the km with it lit run on ----------------------------------------------------------------------
export const WeekShot: React.FC = () => {
  const {t, len, L, Ls} = useShot('week');
  const days = Ls('days');
  const relight = L('relight');
  const z = lerp(-6, 7, t / Math.max(1, len));
  const cam: CarCam = {pos: [5.4, 1.3, z + 10.4], target: [-0.7, 0.8, z + 0.2], fov: 38};
  const day = Math.max(1, days.filter((d) => t >= d).length);
  const lampK = t < relight ? 0 : t < relight + 2 ? 1 : t < relight + 4 ? 0.4 : 1;
  // v2: the km run over the same days as the counter (day 2 .. day 7), so both reach day 7 and 240 km together
  const km = Math.round(240 * prog(t, days[1], Math.max(10, days[6] - days[1])));
  const inK = E.out(prog(t, 0, 8));
  return (
    <Paper bg="#0F0D12">
      <Street cam={cam} uid="wk" look="night" nearTree={false} farTrees={false} />
      <Car3 cam={cam} night={1} street={0.75} lamp={1} shadow={0.9} at={[-0.6, z]} cool={0.1} coolFrom={[6, 4, 8]} style={{filter: 'saturate(0.42) sepia(0.1)'}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 270, display: 'flex', justifyContent: 'center', opacity: inK}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 26, padding: '18px 40px 20px 30px', borderRadius: 999, background: 'rgba(8,8,10,0.82)', fontFamily: F.sans, fontWeight: 700, fontSize: 46, color: WHITE, whiteSpace: 'nowrap'}}>
          <svg width={64} height={64} viewBox="-32 -32 64 64" style={{overflow: 'visible'}}>
            <EngineIcon uid="wkl" x={0} y={0} size={52} k={lampK} glow={0} off="#5A5E66" stroke={1.9} />
          </svg>
          <span>
            {mtav('დღე')} {day}
          </span>
          <span style={{width: 3, height: 44, borderRadius: 2, background: 'rgba(255,255,255,0.45)'}} />
          <span style={{fontFeatureSettings: '"tnum" 1'}}>{km} {mtav('კმ')}</span>
        </div>
      </div>
    </Paper>
  );
};

// ---- fleet: with VINARI+ as many cars as you want: six modern cars in a grid, a scan ring and a tick on each in turn; the
// infinity sign over them ----------------------------------------------------------------------------------------------------------------
const GRID: {x: number; y: number; body: CarBody; paint: number}[] = [
  {x: 290, y: 690, body: 'suv', paint: 3},
  {x: 790, y: 690, body: 'sedan', paint: 1},
  {x: 290, y: 980, body: 'hatch', paint: 4},
  {x: 790, y: 980, body: 'ev', paint: 2},
  {x: 290, y: 1270, body: 'coupe', paint: 5},
  {x: 790, y: 1270, body: 'suv', paint: 1},
];
export const FleetShot: React.FC = () => {
  const {t, len, L, Ls} = useShot('fleet');
  const ticks = Ls('fleet');
  const inf = L('inf');
  const k = E.inOut(prog(t, 0, len));
  const ik = sp(t, inf, 160, 13);
  return (
    <Paper>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${lerp(1.03, 1, k)})`, transformOrigin: '540px 960px'}}>
        <Svg>
          {GRID.map((g, i) => {
            const a = E.out(prog(t, i * 1.5 - 3, 10));
            const at = ticks[Math.min(ticks.length - 1, Math.floor(i * (ticks.length / GRID.length)))] + (i % 2) * 5;
            const ring = clamp((t - at) / 16);
            return (
              <g key={i} opacity={a}>
                {ring > 0 && ring < 1 ? <ellipse cx={g.x} cy={g.y - 60} rx={180 + 80 * ring} ry={90 + 40 * ring} fill="none" stroke={INK} strokeWidth={4} opacity={0.3 * (1 - ring)} /> : null}
                <IlloCar uid={`fl${i}`} x={g.x} y={g.y} len={400} body={g.body} paint={g.paint} frame={t} />
                <MarkTick x={g.x + 150} y={g.y - 180} s={64} k={prog(t, at + 4, 8)} width={7} />
              </g>
            );
          })}
        </Svg>
        <div style={{position: 'absolute', left: 0, right: 0, top: 250, textAlign: 'center', fontFamily: F.sans, fontWeight: 700, fontSize: 210, lineHeight: 1, color: INK, opacity: clamp(ik * 1.5), transform: `scale(${lerp(0.6, 1, E.outBack(clamp(ik)))})`}}>∞</div>
      </div>
    </Paper>
  );
};

void Img;
void staticFile;
void breath;
void jolt;
void punch;
export const SHOTS: Record<string, React.FC> = {
  sellers: SellersShot,
  cluster: ClusterShot,
  night: NightShot,
  xray: XrayShot,
  pocket: PocketShot,
  plug: PlugShot,
  selfcheck: SelfcheckShot,
  ring: RingShot,
  cleared: ClearedShot,
  week: WeekShot,
  fleet: FleetShot,
};
