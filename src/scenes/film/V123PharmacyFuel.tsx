// src/scenes/film/V123PharmacyFuel.tsx: v123's own picture, the 1888 Benz Patent-Motorwagen as a working drawing.
// Bertha Benz's drive: the three-rimer draws itself on in side view; it rolls with the road streaming under it and
// a distance readout counting; then the trip's three roadside fixes, each a close-up of the part: a pharmacy bottle
// filling the little tank, a hat pin pushed through a blocked fuel line until the fuel runs again, a garter wound round
// a bare wire until the sparks stop, a strip of leather nailed onto a worn wooden brake block against the rim; and
// at last the whole wagen again, ringed in the film's accent.
// Props: phase (the wagen drawing on) | ride | fuel | pin | garter | brake | sold, hitAt (chunk or "1.2s"), label (a Hud word, 2 at most),
// line (the punch, "*word*"), count (the readout's target for ride), unit (its unit).
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, MonoLabel, PictureBand, Sfx} from '../common';
import {C, F, L, rgba, toneLine} from '../../tokens';
import {ease, prog, spr} from '../../lib/anim';
import {CameraLayer, Hud, useKick} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import {OBJ, TXT} from '../../lib/layer';
import type {SceneCtx} from '../../types';

type P = {
  phase?: 'car' | 'tag' | 'ride' | 'fuel' | 'pin' | 'garter' | 'brake' | 'sold';
  hitAt?: number | string;
  label?: string;
  line?: string;
  count?: number;
  unit?: string;
};

const CX = 540;
const GROUND = 1160;
const RW = {x: 700, y: 1010, r: 150}; // the big rear rim
const FW = {x: 300, y: 1070, r: 90}; // the small front rim
const SPOKES = 12;

const inOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** a spoked rim, turning by `rot` degrees */
const Hoop: React.FC<{x: number; y: number; r: number; rot: number; ink: string; draw: number; brake?: string}> = ({x, y, r, rot, ink, draw, brake}) => (
  <g>
    <circle cx={x} cy={y} r={r} fill="none" stroke={ink} strokeWidth={10} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} />
    <circle cx={x} cy={y} r={r - 16} fill="none" stroke={rgba(C.ink, 0.35)} strokeWidth={4} opacity={draw} />
    <g transform={`rotate(${rot.toFixed(2)} ${x} ${y})`} opacity={draw}>
      {Array.from({length: SPOKES}, (_, i) => {
        const a = (i / SPOKES) * Math.PI * 2;
        return <line key={i} x1={x} y1={y} x2={x + Math.cos(a) * (r - 16)} y2={y + Math.sin(a) * (r - 16)} stroke={ink} strokeWidth={4} />;
      })}
    </g>
    <circle cx={x} cy={y} r={r * 0.14} fill={ink} opacity={draw} />
    {brake ? <rect x={x - r * 0.5} y={y - r - 26} width={r} height={22} rx={6} fill={brake} opacity={draw} /> : null}
  </g>
);

/** the whole Patent-Motorwagen in side view; `draw` 0..1 draws it on, `rot` turns the rims, `fuel` fills the tank */
const Motorwagen: React.FC<{draw: number; rot: number; fuel: number; accent: string; ring: number; kick: number; swing: number | null}> = ({draw, rot, fuel, accent, ring, kick, swing}) => {
  const ink = C.ink;
  const seg = (a: number, b: number) => clamp01((draw - a) / (b - a));
  return (
    <svg className={OBJ} width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
      {/* the ground line under it */}
      <line x1={190} y1={GROUND} x2={890} y2={GROUND} stroke={C.rule} strokeWidth={4} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - seg(0, 0.3)} />
      <Hoop x={RW.x} y={RW.y} r={RW.r} rot={rot} ink={ink} draw={seg(0.05, 0.45)} />
      <Hoop x={FW.x} y={FW.y} r={FW.r} rot={rot * (RW.r / FW.r)} ink={ink} draw={seg(0.1, 0.45)} />
      {/* the frame: a bent tube from the front fork to the rear axle */}
      <path d={`M${FW.x} ${FW.y}L${FW.x + 50} ${900}L${RW.x - 40} ${900}L${RW.x} ${RW.y}`} fill="none" stroke={ink} strokeWidth={9} strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - seg(0.25, 0.6)} />
      {/* the tiller: the column and its handle */}
      <path d={`M${FW.x + 30} ${960}L${FW.x + 70} ${720}L${FW.x + 150} ${712}`} fill="none" stroke={ink} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - seg(0.35, 0.65)} />
      {/* the bench seat with its back */}
      <path d={`M${470} ${820}L${640} ${820}L${660} ${700}`} fill="none" stroke={ink} strokeWidth={12} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - seg(0.4, 0.7)} />
      <path d={`M${480} ${822}L${480} ${900}M${630} ${822}L${630} ${900}`} fill="none" stroke={ink} strokeWidth={6} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - seg(0.45, 0.7)} />
      {/* the engine at the back: the cylinder and the flat flyrim under it */}
      <rect x={760} y={770} width={60} height={120} rx={8} fill="none" stroke={ink} strokeWidth={7} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - seg(0.5, 0.8)} />
      {Array.from({length: 4}, (_, i) => (
        <line key={i} x1={752} y1={790 + i * 24} x2={828} y2={790 + i * 24} stroke={ink} strokeWidth={4} opacity={seg(0.6, 0.85)} />
      ))}
      <ellipse cx={720} cy={900} rx={110} ry={20} fill="none" stroke={ink} strokeWidth={7} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - seg(0.55, 0.85)} />
      {/* the drive belt down to the axle */}
      <path d={`M${790} ${905}L${RW.x + 10} ${RW.y - 10}`} fill="none" stroke={rgba(C.ink, 0.6)} strokeWidth={5} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - seg(0.65, 0.9)} />
      {/* the little fuel tank under the seat, its level in the accent */}
      <rect x={520} y={840} width={90} height={50} rx={8} fill="none" stroke={ink} strokeWidth={6} opacity={seg(0.6, 0.9)} />
      {fuel > 0 ? <rect x={525} y={885 - 40 * fuel} width={80} height={40 * fuel} rx={5} fill={accent} opacity={0.85} /> : null}
      {/* the empty price tag hanging off the tiller: nobody has bought one yet */}
      {swing !== null ? (
        <g transform={`rotate(${swing.toFixed(2)} ${FW.x + 150} ${712})`} opacity={seg(0.7, 1)}>
          <line x1={FW.x + 150} y1={712} x2={FW.x + 150} y2={780} stroke={C.ink2} strokeWidth={4} />
          <path d={`M${FW.x + 110} ${800}L${FW.x + 150} ${776}L${FW.x + 190} ${800}L${FW.x + 190} ${900}L${FW.x + 110} ${900}Z`} fill="none" stroke={accent} strokeWidth={6} strokeLinejoin="round" strokeDasharray="14 10" />
          <circle cx={FW.x + 150} cy={796} r={7} fill={C.ink2} />
        </g>
      ) : null}
      {/* the ring of the payoff */}
      {ring > 0 ? <ellipse cx={CX + 20} cy={940} rx={400 + 14 * kick} ry={300 + 10 * kick} fill="none" stroke={accent} strokeWidth={7} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - ring} /> : null}
    </svg>
  );
};

/** the road streaming under the rolling wagen: ground marks moving left */
const Road: React.FC<{frame: number; speed: number}> = ({frame, speed}) => {
  const off = (frame * speed) % 120;
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
      {Array.from({length: 9}, (_, i) => {
        const x = 170 + i * 120 - off;
        return x > 160 && x < 880 ? <line key={i} x1={x} y1={GROUND + 34} x2={x + 56} y2={GROUND + 34} stroke={rgba(C.ink, 0.4)} strokeWidth={6} strokeLinecap="round" /> : null;
      })}
      {Array.from({length: 4}, (_, i) => {
        const x = 880 - ((frame * speed * 0.6 + i * 200) % 720);
        return <circle key={`s${i}`} cx={x} cy={GROUND + 70} r={5} fill={rgba(C.ink, 0.3)} />;
      })}
    </svg>
  );
};

/** fuel: the pharmacy bottle tips and pours into the tank; the level climbs to the brim on the hit */
const Fuel: React.FC<{frame: number; e: number; hit: number; accent: string; kick: number}> = ({frame, e, hit, accent, kick}) => {
  const appear = spr(frame, e, 'enterXL');
  const tip = inOut(prog(frame, e + 6, Math.max(12, hit - e - 16)));
  const pour = prog(frame, e + 14, Math.max(14, hit - e - 10));
  const lvl = 0.12 + 0.82 * inOut(pour);
  const ang = -62 * tip;
  return (
    <svg className={OBJ} width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear}}>
      {/* the bottle, pivoting at its shoulder */}
      <g transform={`rotate(${ang.toFixed(2)} 430 620)`}>
        <path d="M380 560L380 520L404 520L404 470L456 470L456 520L480 520L480 560Q520 580 520 640L520 820Q520 850 490 850L370 850Q340 850 340 820L340 640Q340 580 380 560Z" fill={rgba(C.ink, 0.06)} stroke={C.ink} strokeWidth={7} strokeLinejoin="round" />
        <rect x={398} y={455} width={64} height={22} rx={6} fill={C.ink} />
        {/* the label: a pharmacy cross */}
        <rect x={360} y={680} width={140} height={110} rx={10} fill="none" stroke={C.ink2} strokeWidth={5} />
        <path d="M430 702V768M397 735H463" stroke={C.ink} strokeWidth={12} strokeLinecap="round" />
        <rect x={348} y={820 - 150 * (1 - pour * 0.8)} width={164} height={150 * (1 - pour * 0.8)} rx={10} fill={accent} opacity={0.45} />
      </g>
      {/* the stream */}
      {pour > 0 && pour < 1 ? <path d={`M${560} ${640}Q${600} ${760} ${612} ${900}`} fill="none" stroke={accent} strokeWidth={10} strokeLinecap="round" opacity={0.8} /> : null}
      {/* the tank, close up */}
      <rect x={480} y={900} width={300} height={220} rx={22} fill="none" stroke={C.ink} strokeWidth={8} />
      <rect x={590} y={872} width={60} height={32} rx={6} fill={C.ink} />
      <rect x={490} y={1110 - 200 * lvl} width={280} height={200 * lvl} rx={16} fill={accent} opacity={0.85} />
      {[0.25, 0.5, 0.75].map((m) => (
        <line key={m} x1={790} y1={1110 - 200 * m} x2={820} y2={1110 - 200 * m} stroke={C.ink2} strokeWidth={5} />
      ))}
      <circle cx={630} cy={1010} r={150 + 8 * kick} fill="none" stroke={rgba(C.ink, 0.12 * prog(frame, hit, 10))} strokeWidth={4} />
    </svg>
  );
};

/** pin: the fuel line, blocked in the middle; the hat pin slides in, the plug breaks, the fuel runs on to the end */
const Pin: React.FC<{frame: number; e: number; hit: number; accent: string; kick: number}> = ({frame, e, hit, accent, kick}) => {
  const appear = spr(frame, e, 'enterXL');
  const y = 860;
  const x0 = 180;
  const x1 = 900;
  const plug = 560;
  const push = inOut(prog(frame, e + 4, Math.max(12, hit - e - 4)));
  const pinX = 600 - (600 - 470) * push; // the pin's tip
  const free = prog(frame, hit, 22, ease.drift);
  const reach = plug + (x1 - 20 - plug) * free;
  const crack = prog(frame, hit, 8);
  return (
    <svg className={OBJ} width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear}}>
      {/* the pipe, drawn as two walls */}
      <rect x={x0} y={y - 46} width={x1 - x0} height={92} rx={46} fill={rgba(C.ink, 0.05)} stroke={C.ink} strokeWidth={8} />
      {/* the fuel: up to the plug, then on through it */}
      <rect x={x0 + 12} y={y - 30} width={plug - x0 - 40} height={60} rx={30} fill={accent} opacity={0.85} />
      {free > 0 ? <rect x={plug - 40} y={y - 30} width={reach - plug + 40} height={60} rx={30} fill={accent} opacity={0.85} /> : null}
      {/* the plug: dirt that cracks apart */}
      {crack < 1 ? (
        <g opacity={1 - crack}>
          <rect x={plug - 40 - 30 * crack} y={y - 34} width={40} height={68} rx={12} fill={C.ink2} />
          <rect x={plug + 30 * crack} y={y - 34} width={40} height={68} rx={12} fill={C.ink2} />
        </g>
      ) : null}
      {/* the hat pin: a long needle with a pearl knob, coming in from the right */}
      <g opacity={1 - prog(frame, hit + 16, 14)}>
        <line x1={pinX} y1={y} x2={pinX + 290} y2={y - 150} stroke={C.ink} strokeWidth={6} strokeLinecap="round" />
        <circle cx={pinX + 300} cy={y - 156} r={30 + 4 * kick} fill={C.ink} />
        <circle cx={pinX + 290} cy={y - 166} r={9} fill={rgba(C.bg, 0.4)} />
      </g>
      {/* the two ends: from the tank, to the engine */}
      <rect x={x0 - 20} y={y - 70} width={34} height={140} rx={8} fill={C.ink} />
      <rect x={x1 - 14} y={y - 70} width={34} height={140} rx={8} fill={C.ink} />
    </svg>
  );
};

/** garter: a bare wire throws sparks; the band winds round it, coil by coil, and the sparks stop */
const Garter: React.FC<{frame: number; e: number; hit: number; accent: string; accent2: string}> = ({frame, e, hit, accent, accent2}) => {
  const appear = spr(frame, e, 'enterXL');
  const y = 860;
  const wind = inOut(prog(frame, e + 8, Math.max(14, hit - e - 8)));
  const coils = 7;
  const bareL = 390;
  const bareR = 690;
  const spark = 1 - wind;
  return (
    <svg className={OBJ} width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear}}>
      {/* the wire: its sleeve to the left and right, the bare copper in the middle */}
      <path d={`M180 ${y}L${bareL} ${y}`} stroke={C.ink} strokeWidth={34} strokeLinecap="round" />
      <path d={`M${bareR} ${y}L900 ${y}`} stroke={C.ink} strokeWidth={34} strokeLinecap="round" />
      <path d={`M${bareL} ${y}L${bareR} ${y}`} stroke={accent2} strokeWidth={14} />
      {/* the sparks off the bare copper */}
      {spark > 0.05
        ? Array.from({length: 6}, (_, i) => {
            const ph = (frame * 0.6 + i * 1.7) % 6;
            const a = -Math.PI / 2 + (i - 2.5) * 0.45;
            const len = 30 + 26 * Math.sin(frame / 2 + i);
            const sx = 540 + (i - 2.5) * 30;
            return ph < 3 ? <line key={i} x1={sx} y1={y - 12} x2={sx + Math.cos(a) * len} y2={y - 12 + Math.sin(a) * len} stroke={C.ink} strokeWidth={4} strokeLinecap="round" opacity={spark} /> : null;
          })
        : null}
      {/* the band, wound coil by coil from left to right */}
      {Array.from({length: coils}, (_, i) => {
        const k = clamp01(wind * coils - i);
        if (k <= 0) return null;
        const x = bareL + 10 + i * ((bareR - bareL - 20) / (coils - 1));
        return <rect key={i} x={x - 24} y={y - 44 * k} width={48} height={88 * k} rx={14} fill={accent} stroke={C.ink} strokeWidth={4} transform={`skewX(-14)`} style={{transformOrigin: `${x}px ${y}px`}} />;
      })}
      {/* the knot when it is done */}
      {wind > 0.98 ? <path d={`M${bareR + 10} ${y - 40}Q${bareR + 70} ${y - 110} ${bareR + 40} ${y - 30}Q${bareR + 90} ${y - 20} ${bareR + 70} ${y + 40}`} fill="none" stroke={accent} strokeWidth={10} strokeLinecap="round" opacity={prog(frame, hit, 10)} /> : null}
    </svg>
  );
};

/** brake: the wooden block on the rim, worn; the leather strip slides onto it and three nails land */
const Brake: React.FC<{frame: number; e: number; hit: number; accent: string; kick: number}> = ({frame, e, hit, accent, kick}) => {
  const appear = spr(frame, e, 'enterXL');
  const cx = 540;
  const cy = 1020;
  const r = 250;
  const rot = frame * 2.2;
  const slide = spr(frame, Math.max(e + 6, hit - 14), 'land');
  const nails = [0, 1, 2].map((i) => spr(frame, hit + i * 6, 'tap'));
  const by = cy - r - 26; // the block's foot, on the rim
  return (
    <svg className={OBJ} width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear}}>
      {/* the top of the big rim turning under the block */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.ink} strokeWidth={12} />
      <g transform={`rotate(${rot.toFixed(2)} ${cx} ${cy})`}>
        {Array.from({length: 10}, (_, i) => {
          const a = (i / 10) * Math.PI * 2;
          return <line key={i} x1={cx + Math.cos(a) * 40} y1={cy + Math.sin(a) * 40} x2={cx + Math.cos(a) * (r - 12)} y2={cy + Math.sin(a) * (r - 12)} stroke={rgba(C.ink, 0.5)} strokeWidth={5} />;
        })}
      </g>
      {/* the lever that presses the block down */}
      <path d={`M${cx - 260} ${by - 210}L${cx} ${by - 120}`} stroke={C.ink2} strokeWidth={14} strokeLinecap="round" />
      <circle cx={cx - 260} cy={by - 210} r={16} fill={C.ink2} />
      {/* the wooden block with its grain */}
      <rect x={cx - 130} y={by - 120} width={260} height={110} rx={14} fill={rgba(C.ink, 0.1)} stroke={C.ink} strokeWidth={7} />
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M${cx - 110} ${by - 95 + i * 30}Q${cx} ${by - 108 + i * 30} ${cx + 110} ${by - 92 + i * 30}`} fill="none" stroke={C.ink2} strokeWidth={4} />
      ))}
      {/* the leather strip sliding in from the right, between the wood and the rim */}
      <rect x={cx - 130 + 220 * (1 - slide)} y={by - 12} width={260} height={30} rx={8} fill={accent} stroke={C.ink} strokeWidth={4} opacity={prog(frame, Math.max(e + 6, hit - 14), 6)} />
      {/* the nails */}
      {nails.map((k, i) => (k > 0 ? <circle key={i} cx={cx - 80 + i * 80} cy={by + 3} r={9 * k + 3 * kick} fill={C.ink} /> : null))}
    </svg>
  );
};

export const V123PharmacyFuel: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const phase = p.phase ?? 'car';
  const hit = Math.max(base + 12, cueFrame(ctx, p.hitAt ?? 1));
  const kick = useKick();
  const a = toneLine('a');
  const b = toneLine('b');
  const isWagen = phase === 'car' || phase === 'ride' || phase === 'sold' || phase === 'tag';
  // the wagen draws on in its own scene; elsewhere it is already drawn
  const draw = phase === 'car' ? ease.drawOn(prog(frame, e, Math.max(30, hit - e + 20))) : 1;
  const speed = phase === 'ride' ? 3 + 9 * prog(frame, e, 30, ease.enter) : phase === 'sold' ? 2.5 : 0.6;
  const rot = frame * speed * 0.9;
  const ring = phase === 'sold' ? prog(frame, hit, 24, ease.drift) : 0;
  const count = p.count ?? 100;
  const shown = Math.round(count * inOut(prog(frame, e + 6, Math.max(20, hit - e - 6))));
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={0.6}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: 0.6}}>
          <circle cx={CX} cy={900} r={440} fill="none" stroke={rgba(C.ink, 0.08)} strokeWidth={4} />
        </svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        {phase === 'ride' ? <Road frame={frame} speed={speed} /> : null}
        {isWagen ? (
          <div style={{position: 'absolute', inset: 0, transform: phase === 'ride' ? `translateY(${(3 * Math.sin(frame / 2.3)).toFixed(2)}px)` : undefined}}>
            <Motorwagen draw={draw} rot={rot} fuel={0.6} accent={a} ring={ring} kick={kick} swing={phase === 'tag' ? 9 * Math.sin(frame / 11) * (0.4 + 0.6 * prog(frame, hit, 12)) : null} />
          </div>
        ) : phase === 'fuel' ? (
          <Fuel frame={frame} e={e} hit={hit} accent={a} kick={kick} />
        ) : phase === 'pin' ? (
          <Pin frame={frame} e={e} hit={hit} accent={a} kick={kick} />
        ) : phase === 'garter' ? (
          <Garter frame={frame} e={e} hit={hit} accent={a} accent2={b} />
        ) : (
          <Brake frame={frame} e={e} hit={hit} accent={a} kick={kick} />
        )}
      </CameraLayer>
      <Hud>
        {p.label ? <MonoLabel text={p.label} at={Math.max(base, e + 4)} size={40} color={C.ink} style={{position: 'absolute', left: L.camSafe.left, top: L.camSafe.top - 30}} /> : null}
        {phase === 'ride' ? (
          <div className={TXT} style={{position: 'absolute', right: 1080 - L.camSafe.right, top: L.camSafe.top - 40, fontFamily: F.sans, fontWeight: 600, fontSize: 96, color: C.ink, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums'}}>
            {shown}
            {frame >= hit ? '+' : ''}
            <span style={{fontSize: 48, color: C.ink2, marginLeft: 14}}>{p.unit ?? 'km'}</span>
          </div>
        ) : null}
        {p.line ? (
          <div style={{position: 'absolute', left: 0, right: 0, top: 1210, textAlign: 'center', whiteSpace: 'nowrap'}}>
            <Words text={p.line} at={hit} fx="slam" size={84} />
          </div>
        ) : null}
      </Hud>
      {phase === 'car' ? <Sfx name="asmr-air-long" at={Math.max(base, e + 2)} volume={0.2} /> : null}
      {phase === 'fuel' ? <Sfx name="asmr-swell" at={Math.max(base, e + 14)} volume={0.24} /> : null}
      {phase === 'pin' ? <Sfx name="asmr-strike" at={Math.max(base, hit)} volume={0.26} /> : null}
      {phase === 'garter' ? <Sfx name="asmr-paper" at={Math.max(base, e + 8)} volume={0.24} /> : null}
      {phase === 'brake' ? [0, 1, 2].map((i) => <Sfx key={i} name="asmr-knock" at={Math.max(base, hit + i * 6)} volume={0.24} />) : null}
      {phase === 'ride' ? <Sfx name="asmr-count-roll-long" at={Math.max(base, e + 6)} volume={0.2} /> : null}
      <Land at={hit} />
      <Haptic kind="rigid" at={hit + 2} volume={0.3} />
    </PictureBand>
  );
};
