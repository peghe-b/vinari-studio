// src/scenes/film/V126BrabhamPush.tsx: v126's own picture, Sebring 1959 as a race engineer's drawing.
// Jack Brabham's last lap in six drawn shots: a chequered flag waving big (the finish he must reach); the Cooper's
// fuel tank in section draining to empty; the last stretch in elevation, the single-seater crawling up the slope on
// push chevrons to the chequered gate; the timing tower, third and fourth, the third row lighting; five counted
// result slots, a "+3" chip that knocks on the full row and drops away struck; the season's total, its bar losing
// the three points as the number rolls back.
// Props: shot flag | fuel | hill | board | points | total, hitAt (chunk or "1.2s"), line (the punch, "*word*"),
// label (a small mono Hud word), rows ([{pos, name}] for the board), from / to (the total's numbers).
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, MonoLabel, PictureBand, Sfx} from '../common';
import {accentsOn, C, F, rgba} from '../../tokens';
import {ease, prog, spr} from '../../lib/anim';
import {capsLatin} from '../../lib/format';
import {CameraLayer, Hud, useKick} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import {OBJ, TXT} from '../../lib/layer';
import type {SceneCtx} from '../../types';

type Row = {pos: number; name: string};
type P = {
  shot?: 'flag' | 'fuel' | 'hill' | 'board' | 'points' | 'total';
  hitAt?: number | string;
  line?: string;
  label?: string;
  rows?: Row[];
  from?: number;
  to?: number;
};

const CX = 540;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const inOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/** the hero colour: the film's accent when it has one, else ink */
const hero = () => (accentsOn() ? C.accA : C.ink);

/** a chequered field, `cols` x `rows` squares of `s`, waving by `ph` */
const Chequer: React.FC<{x: number; y: number; cols: number; rows: number; s: number; ph: number; amp: number; op?: number}> = ({x, y, cols, rows, s, ph, amp, op = 1}) => {
  const cells: React.ReactNode[] = [];
  for (let c = 0; c < cols; c++) {
    const dy = Math.sin(ph + c * 0.55) * amp * (c / cols);
    const sk = Math.cos(ph + c * 0.55) * 0.18;
    for (let r = 0; r < rows; r++) {
      if ((c + r) % 2 !== 0) continue;
      const shade = 0.78 + 0.22 * sk;
      cells.push(<rect key={`${c}-${r}`} x={x + c * s} y={y + r * s + dy} width={s + 0.5} height={s + 0.5} fill={rgba(C.ink, shade * op)} />);
    }
  }
  return <g>{cells}</g>;
};

/** the 1959 single-seater in side view, pointing right; origin at the rear tyre's contact patch */
const Single: React.FC<{rot: number; spin: number; paint: string}> = ({rot, spin, paint}) => {
  const ink = C.ink;
  const Rim = ({x, r}: {x: number; r: number}) => (
    <g>
      <circle cx={x} cy={-r} r={r} fill={ink} />
      <circle cx={x} cy={-r} r={r * 0.5} fill={C.bg} />
      <g transform={`rotate(${spin.toFixed(1)} ${x} ${-r})`}>
        {[0, 60, 120].map((a) => (
          <line key={a} x1={x - Math.cos((a * Math.PI) / 180) * r * 0.46} y1={-r - Math.sin((a * Math.PI) / 180) * r * 0.46} x2={x + Math.cos((a * Math.PI) / 180) * r * 0.46} y2={-r + Math.sin((a * Math.PI) / 180) * r * 0.46} stroke={ink} strokeWidth={4} />
        ))}
      </g>
    </g>
  );
  return (
    <g transform={`rotate(${rot.toFixed(2)})`}>
      {/* the cigar hull: a long low nose, the open cockpit, the engine behind it */}
      <path d="M -46 -38 Q -58 -62 -28 -74 L 88 -84 Q 104 -86 112 -100 L 150 -100 Q 160 -86 176 -82 L 268 -60 Q 290 -54 284 -42 L 262 -32 L -30 -28 Z" fill={paint} stroke={ink} strokeWidth={6} strokeLinejoin="round" />
      {/* the little windscreen and the empty seat (he is out, pushing) */}
      <path d="M 150 -100 L 166 -118" stroke={ink} strokeWidth={6} strokeLinecap="round" />
      <path d="M 112 -100 Q 130 -92 150 -100" fill="none" stroke={ink} strokeWidth={5} />
      {/* the exhaust under the tail */}
      <path d="M -40 -30 L -78 -24" stroke={ink} strokeWidth={6} strokeLinecap="round" />
      <Rim x={0} r={44} />
      <Rim x={214} r={40} />
    </g>
  );
};

/** the chequered flag, big, waving: the finish he must reach */
const FlagShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 10, cueFrame(ctx, p.hitAt ?? '0.6s'));
  const kick = useKick();
  const appear = spr(frame, e, 'enterXL');
  const amp = 26 + 22 * prog(frame, hit, 14, ease.whipOut);
  const ph = frame / 5;
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={0.6}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: 0.55 * appear}}>
          <line x1={180} y1={1180} x2={900} y2={1180} stroke={C.rule} strokeWidth={4} />
        </svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <svg className={OBJ} width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear}}>
          {/* the pole */}
          <rect x={232} y={540} width={14} height={640} rx={7} fill={C.ink} />
          <circle cx={239} cy={536} r={14} fill={C.ink} />
          <g transform={`translate(0 ${(-8 * kick).toFixed(2)})`}>
            <rect x={246} y={560} width={600} height={420} fill="none" stroke={rgba(C.ink, 0.25)} strokeWidth={4} />
            <Chequer x={246} y={560} cols={8} rows={6} s={75} ph={ph} amp={amp} />
          </g>
        </svg>
      </CameraLayer>
      <Hud>
        {p.label ? <MonoLabel text={p.label} at={Math.max(base, e + 4)} size={40} color={C.ink} style={{position: 'absolute', left: 246, top: 1080}} /> : null}
      </Hud>
      <Sfx name="asmr-air-long" at={Math.max(base, hit - 6)} volume={0.22} />
      <Haptic kind="light" at={hit} volume={0.25} />
    </PictureBand>
  );
};

/** the fuel tank in section, draining to empty */
const FuelShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 16, cueFrame(ctx, p.hitAt ?? 1));
  const kick = useKick();
  const appear = spr(frame, e, 'enterXL');
  const drain = inOut(clamp01((frame - e) / Math.max(1, hit - e)));
  const level = 0.34 * (1 - drain);
  const T = {x: 380, y: 520, w: 320, h: 600};
  const lvlY = T.y + T.h * (1 - level);
  const wave = Math.sin(frame / 4) * 6 * (1 - drain * 0.8);
  const empty = prog(frame, hit, 10);
  const marks = [
    {f: 1, t: 'F'},
    {f: 0.5, t: '1/2'},
    {f: 0, t: 'E'},
  ];
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={0.6}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: 0.5 * appear}}>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <line key={i} x1={T.x - 70} y1={T.y + (T.h * i) / 6} x2={T.x - 40} y2={T.y + (T.h * i) / 6} stroke={C.rule} strokeWidth={4} />
          ))}
        </svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <svg className={OBJ} width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear}}>
          <defs>
            <clipPath id="v126tank">
              <rect x={T.x} y={T.y} width={T.w} height={T.h} rx={60} />
            </clipPath>
          </defs>
          <g clipPath="url(#v126tank)">
            <path d={`M ${T.x} ${lvlY + wave} Q ${T.x + T.w / 2} ${lvlY - wave} ${T.x + T.w} ${lvlY + wave} L ${T.x + T.w} ${T.y + T.h} L ${T.x} ${T.y + T.h} Z`} fill={rgba(hero(), 0.8)} opacity={level > 0.002 ? 1 : 0} />
          </g>
          <rect x={T.x} y={T.y} width={T.w} height={T.h} rx={60} fill="none" stroke={C.ink} strokeWidth={8} />
          {/* the filler neck and the line out to the engine */}
          <rect x={T.x + T.w / 2 - 30} y={T.y - 50} width={60} height={50} rx={10} fill="none" stroke={C.ink} strokeWidth={7} />
          <path d={`M ${T.x + T.w / 2} ${T.y + T.h} L ${T.x + T.w / 2} ${T.y + T.h + 60} L ${T.x + T.w + 160} ${T.y + T.h + 60}`} fill="none" stroke={C.ink} strokeWidth={7} strokeLinejoin="round" />
          {/* the last drops along the line, then nothing */}
          {[0, 1, 2].map((i) => {
            const u = ((frame + i * 9) % 27) / 27;
            const on = frame < hit - 4 ? 1 : 0;
            return <circle key={i} cx={T.x + T.w / 2 + 20 + u * 170} cy={T.y + T.h + 60} r={9} fill={hero()} opacity={on * (1 - u)} />;
          })}
          {/* the gauge marks beside it; E lights when it is dry */}
          {marks.map((m) => (
            <text key={m.t} className={TXT} x={T.x - 90} y={T.y + T.h * (1 - m.f) + 14} textAnchor="end" fontFamily={F.mono} fontSize={m.t === 'E' ? 52 + 10 * kick : 40} fontWeight={m.t === 'E' ? 700 : 500} fill={m.t === 'E' ? rgba(C.ink, 0.5 + 0.5 * empty) : C.ink2}>
              {m.t}
            </text>
          ))}
        </svg>
      </CameraLayer>
      <div style={{position: 'absolute', left: 560, top: 1210, whiteSpace: 'nowrap', transform: 'translateX(-50%)'}}>
        {p.line ? <Words text={p.line} at={hit} fx="slam" size={84} /> : null}
      </div>
      <Sfx name="asmr-swell" at={Math.max(base, hit - 12)} volume={0.2} />
      <Land at={hit} />
      <Haptic kind="rigid" at={hit + 2} volume={0.3} />
    </PictureBand>
  );
};

/** the last stretch in elevation: the Cooper crawls up the slope on push chevrons to the chequered gate */
const HillShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 16, cueFrame(ctx, p.hitAt ?? 1));
  const kick = useKick();
  const appear = spr(frame, e, 'enterXL');
  const A = {x: 150, y: 1180};
  const B = {x: 930, y: 860};
  const ang = (Math.atan2(B.y - A.y, B.x - A.x) * 180) / Math.PI;
  // a slow crawl with a heave on every push (a step every 14 frames)
  const steps = (frame - e) / 14;
  const heave = Math.floor(Math.max(0, steps)) + ease.enter(clamp01(steps - Math.floor(steps)) * 1.6 > 1 ? 1 : clamp01(steps - Math.floor(steps)) * 1.6);
  const u = Math.min(0.62, 0.08 + heave * 0.028);
  const px = A.x + (B.x - A.x) * u;
  const py = A.y + (B.y - A.y) * u;
  const gateU = 0.86;
  const gx = A.x + (B.x - A.x) * gateU;
  const gy = A.y + (B.y - A.y) * gateU;
  const push = 0.5 + 0.5 * Math.sin((frame - e) * ((Math.PI * 2) / 14));
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={0.6}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: 0.6 * appear}}>
          {/* the level, so the slope reads as a climb */}
          <line x1={A.x} y1={A.y} x2={B.x} y2={A.y} stroke={C.rule} strokeWidth={4} strokeDasharray="14 14" />
          <path d={`M ${B.x - 120} ${A.y} A 120 120 0 0 0 ${B.x - 120 + 120 * Math.cos((ang * Math.PI) / 180)} ${A.y + 120 * Math.sin((ang * Math.PI) / 180)}`} fill="none" stroke={C.rule} strokeWidth={4} />
        </svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <svg className={OBJ} width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear}}>
          {/* the road */}
          <path d={`M ${A.x} ${A.y} L ${B.x} ${B.y} L ${B.x} ${A.y + 40} L ${A.x} ${A.y + 40} Z`} fill={rgba(C.ink, 0.08)} />
          <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={C.ink} strokeWidth={8} strokeLinecap="round" />
          {/* the chequered gate at the top */}
          <g transform={`translate(${gx} ${gy}) rotate(${ang.toFixed(2)})`}>
            <rect x={-6} y={-260} width={12} height={260} fill={C.ink} />
            <g transform={`translate(0 ${(-6 * kick).toFixed(1)})`}>
              <Chequer x={6} y={-260} cols={4} rows={3} s={30} ph={frame / 6} amp={8} />
            </g>
          </g>
          {/* the push: chevrons behind the Cooper pulse with each heave */}
          <g transform={`translate(${px} ${py}) rotate(${ang.toFixed(2)})`}>
            {[0, 1, 2].map((i) => (
              <path key={i} d={`M ${-120 - i * 40} -96 L ${-96 - i * 40} -62 L ${-120 - i * 40} -28`} fill="none" stroke={hero()} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" opacity={clamp01(push * 1.2 - i * 0.25)} />
            ))}
            <Single rot={0} spin={heave * 40} paint={C.surface} />
          </g>
        </svg>
      </CameraLayer>
      <Hud>
        {p.label ? <MonoLabel text={p.label} at={Math.max(base, e + 4)} size={40} color={C.ink} style={{position: 'absolute', left: 160, top: 470}} /> : null}
      </Hud>
      <div style={{position: 'absolute', left: 160, top: 1250, whiteSpace: 'nowrap'}}>{p.line ? <Words text={p.line} at={hit} fx="slam" size={84} /> : null}</div>
      <Sfx name="asmr-paper" at={Math.max(base, e + 14)} volume={0.2} />
      <Land at={hit} />
      <Haptic kind="heavy" at={hit + 2} volume={0.3} />
    </PictureBand>
  );
};

/** the timing tower: the third and fourth rows, the third lighting on the hit */
const BoardShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 14, cueFrame(ctx, p.hitAt ?? 1));
  const kick = useKick();
  const rows = p.rows ?? [
    {pos: 3, name: 'BROOKS'},
    {pos: 4, name: 'BRABHAM'},
  ];
  const lit = prog(frame, hit, 10);
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={0.6}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: 0.5}}>
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={170} y={520 + i * 150} width={740} height={118} rx={20} fill="none" stroke={C.rule} strokeWidth={4} opacity={i === 1 || i === 2 ? 0 : 0.6} />
          ))}
          <Chequer x={170} y={1120} cols={20} rows={2} s={37} ph={frame / 7} amp={4} op={0.5} />
        </svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <div className={OBJ} style={{position: 'absolute', left: 170, top: 670, width: 740}}>
          {rows.map((r, i) => {
            const k = spr(frame, e + 4 + i * 6, 'enter');
            const on = i === 0 ? lit : 0;
            return (
              <div key={r.pos} style={{position: 'relative', height: 118, marginBottom: 32, borderRadius: 20, backgroundColor: on > 0 ? rgba(C.ink, 0.92 * on) : 'transparent', border: `5px solid ${C.ink}`, transform: `translateX(${((1 - k) * (i % 2 ? 160 : -160)).toFixed(1)}px) scale(${(1 + 0.04 * kick * (i === 0 ? 1 : 0)).toFixed(3)})`, opacity: k}}>
                <div className={TXT} style={{position: 'absolute', left: 36, top: 22, fontFamily: F.mono, fontWeight: 700, fontSize: 64, color: on > 0.5 ? C.bg : C.ink}}>
                  {r.pos}
                </div>
                <div className={TXT} style={{position: 'absolute', left: 140, top: 26, fontFamily: F.sans, fontWeight: 600, fontSize: 60, letterSpacing: 2, color: on > 0.5 ? C.bg : C.ink}}>
                  {capsLatin(r.name)}
                </div>
                {i === 1 ? <div style={{position: 'absolute', right: 30, top: 34, width: 44, height: 44, borderRadius: 22, backgroundColor: hero()}} /> : null}
              </div>
            );
          })}
        </div>
      </CameraLayer>
      <Hud>{p.label ? <MonoLabel text={p.label} at={Math.max(base, e + 4)} size={40} color={C.ink} style={{position: 'absolute', left: 170, top: 560}} /> : null}</Hud>
      <Sfx name="asmr-flap" at={Math.max(base, e + 6)} volume={0.24} />
      <Land at={hit} />
      <Haptic kind="medium" at={hit + 2} volume={0.3} />
    </PictureBand>
  );
};

/** five counted slots, full; a +3 chip knocks on the row and drops away, struck */
const PointsShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 20, cueFrame(ctx, p.hitAt ?? 1));
  const kick = useKick();
  const S = 128;
  const G = 20;
  const x0 = CX - (5 * S + 4 * G) / 2;
  const y0 = 720;
  const come = prog(frame, e + 6, Math.max(8, hit - e - 6), ease.enter);
  const fall = prog(frame, hit + 4, 22, (t) => t * t);
  const strike = prog(frame, hit + 2, 8);
  const cx = 930 - 210 * come + Math.sin(prog(frame, hit, 8) * Math.PI) * 30;
  const cy = y0 + S + 40 + fall * 260;
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={1}>
        <svg className={OBJ} width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          {[0, 1, 2, 3, 4].map((i) => {
            const k = spr(frame, e + i * 3, 'enter');
            return <rect key={i} x={x0 + i * (S + G)} y={y0 + (1 - k) * 60} width={S} height={S} rx={24} fill={rgba(C.ink, 0.9)} opacity={k} transform={`scale(1)`} />;
          })}
          <rect x={x0 - 24} y={y0 - 24} width={5 * S + 4 * G + 48} height={S + 48} rx={36} fill="none" stroke={C.ink} strokeWidth={6} />
          <g transform={`translate(${cx.toFixed(1)} ${cy.toFixed(1)}) rotate(${(fall * 18).toFixed(1)})`} opacity={1 - fall * 0.5}>
            <rect x={-80} y={-50} width={160} height={100} rx={50} fill={hero()} />
            <text className={TXT} x={0} y={20} textAnchor="middle" fontFamily={F.mono} fontWeight={700} fontSize={58} fill={C.bg}>
              +3
            </text>
            <line x1={-96} y1={0} x2={-96 + 192 * strike} y2={0} stroke={C.ink} strokeWidth={9} strokeLinecap="round" />
          </g>
        </svg>
      </CameraLayer>
      <Hud>
        {p.label ? <MonoLabel text={p.label} at={Math.max(base, e + 4)} size={44} color={C.ink} style={{position: 'absolute', left: x0 - 24, top: y0 - 110 - 6 * kick}} /> : null}
      </Hud>
      <Sfx name="asmr-knock" at={Math.max(base, hit)} volume={0.3} />
      <Sfx name="asmr-strike" at={Math.max(base, hit + 2)} volume={0.26} />
      <Haptic kind="rigid" at={hit + 1} volume={0.3} />
    </PictureBand>
  );
};

/** the season's total: the bar loses its last three points, the number rolls back */
const TotalShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 14, cueFrame(ctx, p.hitAt ?? 1));
  const kick = useKick();
  const from = p.from ?? 34;
  const to = p.to ?? 31;
  const W = 760;
  const x0 = CX - W / 2;
  const unit = W / from;
  const grow = prog(frame, e, 20, ease.enter);
  const brk = prog(frame, hit, 26, (t) => t * t);
  const roll = prog(frame, hit + 2, 10);
  const shown = roll < 0.5 ? from : to;
  const dy = roll < 0.5 ? -roll * 80 : (1 - roll) * 80;
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={1}>
        <div className={TXT} style={{position: 'absolute', left: 0, right: 0, top: 560 + dy, textAlign: 'center', fontFamily: F.sans, fontWeight: 700, fontSize: 300 + 20 * kick, lineHeight: 1, color: C.ink, opacity: 1 - Math.sin(roll * Math.PI) * 0.7}}>
          {shown}
        </div>
        <svg className={OBJ} width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          {Array.from({length: from + 1}, (_, i) => (
            <line key={i} x1={x0 + i * unit} y1={1046} x2={x0 + i * unit} y2={i % 5 === 0 ? 1086 : 1066} stroke={i > to ? hero() : C.ink2} strokeWidth={4} />
          ))}
          <circle cx={CX} cy={700} r={250 + 10 * kick} fill="none" stroke={rgba(C.ink, 0.14)} strokeWidth={6} />
          <rect x={x0} y={960} width={to * unit * grow} height={70} rx={16} fill={C.ink} />
          <g transform={`translate(${(x0 + to * unit + 8 + brk * 40).toFixed(1)} ${(960 + brk * 240).toFixed(1)}) rotate(${(brk * 24).toFixed(1)})`} opacity={grow * (1 - brk * 0.6)}>
            <rect x={0} y={0} width={(from - to) * unit - 8} height={70} rx={16} fill={hero()} />
          </g>
        </svg>
      </CameraLayer>
      <Hud>{p.label ? <MonoLabel text={p.label} at={Math.max(base, e + 4)} size={40} color={C.ink} style={{position: 'absolute', left: x0, top: 1070}} /> : null}</Hud>
      <Sfx name="asmr-count-roll" at={Math.max(base, hit - 4)} volume={0.22} />
      <Land at={hit + 8} />
      <Haptic kind="medium" at={hit + 8} volume={0.3} />
    </PictureBand>
  );
};

export const V126BrabhamPush: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const s = p.shot ?? 'hill';
  if (s === 'flag') return <FlagShot p={p} ctx={ctx} />;
  if (s === 'fuel') return <FuelShot p={p} ctx={ctx} />;
  if (s === 'board') return <BoardShot p={p} ctx={ctx} />;
  if (s === 'points') return <PointsShot p={p} ctx={ctx} />;
  if (s === 'total') return <TotalShot p={p} ctx={ctx} />;
  return <HillShot p={p} ctx={ctx} />;
};
