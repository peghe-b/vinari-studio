// V111SingAlong: the phone in its dash holder, seen from the driver's seat at dusk, the road streaming behind it.
// On its screen a drawn route from above: the car's chevron climbs the road, the route bends right at a side street,
// the chevron runs straight past it (miss: the branch greys out, a laughing face pops beside the phone), then the route
// springs to the left (reroute), and at last the phone slides aside while the car's own wide screen wakes (soon).
import React, {useId} from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, Sfx} from '../common';
import {C, L} from '../../tokens';
import {ease, prog, spr} from '../../lib/anim';
import {CameraLayer, Hud, useKick} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import type {SceneCtx} from '../../types';
import {Handset} from '../illo/handset';
import {Backdrop} from '../illo/backdrop';
import {Icon} from '../illo/icons';
import {acc, accRamp, dark, ground} from '../illo/palette';
import {FOOT, IlloBand, Svg, timeOf} from '../illo/scene';
import {rr, Solid} from '../illo/solid';

type P = {
  look?: 'illustrated' | 'diagram';
  mode?: 'miss' | 'reroute' | 'soon';
  hitAt?: number | string;
  line?: string;
  time?: 'day' | 'night' | 'dusk';
};

const BASE = 1060; // the horizon behind the glass
const DASH = 1270; // the dashboard's top edge
const PX = 540; // the phone's centre
const PY = 850;
const PW = 340;

/** The drawn route on the phone's screen (screen px from its top-left). */
const RouteScreen: React.FC<{w: number; h: number; frame: number; mode: string; e: number; hit: number}> = ({w, h, frame, mode, e, hit}) => {
  const route = acc('a');
  const deep = accRamp(route, 4);
  const cx = w * 0.5;
  const branchY = h * 0.5;
  // the chevron's climb: towards the branch, then past it (miss); a slow idle in the other modes
  const climb = mode === 'miss' ? interpolate(frame, [e, hit], [h * 0.86, branchY - h * 0.1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : h * 0.8;
  const past = mode === 'miss' ? prog(frame, hit, 14, ease.enter) : 0;
  const cy = climb - past * h * 0.12;
  const missed = mode === 'miss' ? prog(frame, hit, 8, ease.enter) : 0;
  const left = mode === 'reroute' ? spr(frame, hit, 'land') : mode === 'soon' ? 1 : 0;
  // the banner's arrow turns from right to left on the reroute
  const turn = 1 - 2 * left;
  const arrow = (s: number) => `M${-s * 0.3} ${s * 0.5}V${-s * 0.05}Q${-s * 0.3} ${-s * 0.3} ${-s * 0.02} ${-s * 0.3}H${s * 0.18}`;
  const bar = mode === 'miss' ? 1 - prog(frame, e, Math.max(1, hit - e), (t: number) => t) : 0.85;
  return (
    <g>
      <rect x={0} y={0} width={w} height={h} fill={C.il6} />
      {/* blocks of the city from above */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <path key={i} d={rr(i % 2 ? w * 0.62 : w * 0.06, h * (0.3 + 0.11 * i), w * 0.3, h * 0.08, 10)} fill={C.il5} opacity={0.55} />
      ))}
      {/* the road we are on, and the side street to the right */}
      <path d={`M${cx} ${h}V${h * 0.18}`} stroke={C.il4} strokeWidth={w * 0.11} strokeLinecap="round" />
      <path d={`M${cx} ${branchY}H${w}`} stroke={C.il4} strokeWidth={w * 0.09} />
      <path d={`M${cx} ${branchY}H${w * 0.12}`} stroke={C.il4} strokeWidth={w * 0.09} opacity={0.7} />
      {/* the planned route: up and right (greys once missed), then the new one: up and left */}
      <path d={`M${cx} ${h}V${branchY}H${w}`} fill="none" stroke={missed > 0.5 || left > 0 ? C.il3 : route} strokeWidth={w * 0.045} strokeLinejoin="round" opacity={1 - 0.6 * Math.max(missed, left)} />
      {left > 0 ? (
        <path d={`M${cx} ${h}V${h * 0.3}H${cx - w * 0.38 * left}`} fill="none" stroke={route} strokeWidth={w * 0.045} strokeLinejoin="round" />
      ) : null}
      {/* the car's chevron */}
      <path d={`M${cx} ${cy - 26}L${cx + 20} ${cy + 18}L${cx} ${cy + 8}L${cx - 20} ${cy + 18}Z`} fill={C.il0} stroke={deep} strokeWidth={4} strokeLinejoin="round" />
      {/* the banner on top: the next turn's arrow and a bar that drains as it nears */}
      <path d={rr(w * 0.06, h * 0.07, w * 0.88, h * 0.14, 26)} fill={C.il7} />
      <g transform={`translate(${w * 0.24} ${h * 0.14}) scale(${turn.toFixed(3)} 1)`}>
        <path d={arrow(w * 0.24)} fill="none" stroke={C.il0} strokeWidth={w * 0.035} strokeLinecap="round" strokeLinejoin="round" />
        <path d={`M${w * 0.24 * 0.06} ${-w * 0.24 * 0.42}L${w * 0.24 * 0.18} ${-w * 0.24 * 0.3}L${w * 0.24 * 0.06} ${-w * 0.24 * 0.18}`} fill="none" stroke={C.il0} strokeWidth={w * 0.035} strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <path d={rr(w * 0.42, h * 0.135, w * 0.44, h * 0.012, 4)} fill={C.il5} />
      <path d={rr(w * 0.42, h * 0.135, Math.max(1, w * 0.44 * bar), h * 0.012, 4)} fill={route} />
    </g>
  );
};

export const V111SingAlong: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const uid = useId();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 12, cueFrame(ctx, p.hitAt ?? 1));
  const kick = useKick();
  const time = timeOf(p);
  const night = dark(time);
  const mode = p.mode ?? 'miss';
  // soon: the phone steps aside, the car's wide screen wakes
  const aside = mode === 'soon' ? spr(frame, hit, 'enter') : 0;
  const wake = mode === 'soon' ? prog(frame, hit + 4, 12, ease.enter) : 0;
  const px = PX - 210 * aside;
  const pw = PW * (1 - 0.3 * aside);
  const py = PY + 160 * aside;
  const pop = mode === 'miss' ? spr(frame, hit + 3, 'land') : 0;
  const road = night ? C.il6 : C.il3;
  const dashes = Array.from({length: 7}, (_, i) => i);
  const flow = (frame * 0.035) % 1;
  return (
    <IlloBand uid={uid} time={time}>
      {/* far: the street through the windscreen, streaming past */}
      <CameraLayer depth={0.6}>
        <Svg>
          <Backdrop kind="bridge" uid={uid} frame={frame} time={time} base={BASE} scroll={frame * 5} />
          <rect x={-200} y={BASE} width={1480} height={FOOT - BASE} fill={ground(time)} />
          <path d={`M440 ${BASE}L640 ${BASE}L1180 ${DASH + 200}L-100 ${DASH + 200}Z`} fill={road} />
          {dashes.map((i) => {
            const t = ((i + flow) / dashes.length) ** 2;
            const y = BASE + t * (DASH + 120 - BASE);
            const len = 8 + 70 * t;
            return <path key={i} d={rr(540 - 3 - 6 * t, y, 6 + 12 * t, len, 3)} fill={C.il0} opacity={0.75} />;
          })}
        </Svg>
      </CameraLayer>
      {/* subject: the dashboard, the holder and the phone */}
      <CameraLayer depth={1}>
        <Svg>
          <Solid uid={uid} d={`M-200 ${DASH + 30}Q540 ${DASH - 40} 1280 ${DASH + 30}L1280 ${FOOT}L-200 ${FOOT}Z`} tone={6} time={time} />
          {/* the car's own wide screen (dark until it wakes) */}
          <g opacity={mode === 'soon' ? 1 : 0}>
            <path d={rr(560, 940, 400, 250, 26)} fill={C.il7} />
            <g opacity={wake}>
              <path d={rr(576, 956, 368, 218, 18)} fill={C.il6} />
              <path d="M760 1160V1030H640" fill="none" stroke={acc('a')} strokeWidth={14} strokeLinejoin="round" />
              <path d="M760 1060l-26 -30h52z" fill={C.il0} />
            </g>
          </g>
          {/* the holder: an arm from the dash and two side clamps */}
          <path d={rr(px - 14, py + pw * 0.9, 28, DASH - (py + pw * 0.9) + 20, 12)} fill={C.il5} />
          <path d={rr(px - pw * 0.56, py - 40, 26, 120, 10) + rr(px + pw * 0.56 - 26, py - 40, 26, 120, 10)} fill={C.il5} />
          <Handset uid={uid} x={px} y={py} w={pw} tilt={-2} frame={frame} time={time} lit={mode === 'miss' ? 0.3 + 0.7 * prog(frame, base + 2, 8, ease.enter) : 1} screen={(w, h) => <RouteScreen w={w} h={h} frame={frame} mode={mode} e={e} hit={hit} />} />
          {mode === 'miss' ? (
            <g opacity={Math.min(1, pop * 1.2)} transform={`translate(${px + pw * 0.62} ${py - pw * 0.7}) scale(${(0.6 + 0.4 * pop + 0.08 * kick).toFixed(3)})`}>
              <Icon name="laugh" x={0} y={0} size={130} color={night ? C.il0 : C.il7} />
            </g>
          ) : null}
        </Svg>
      </CameraLayer>
      <Hud>
        <div style={{position: 'absolute', left: L.camSafe.left, top: 372, whiteSpace: 'nowrap'}}>
          {p.line ? <Words text={p.line} at={hit} fx="slam" size={76} punchTone="a" /> : null}
        </div>
      </Hud>
      <Sfx name={mode === 'soon' ? 'asmr-screen' : 'asmr-swell'} at={Math.max(base, hit - 6)} volume={0.26} />
      <Land at={hit} />
      <Haptic kind="rigid" at={hit + 2} volume={0.3} />
    </IlloBand>
  );
};
