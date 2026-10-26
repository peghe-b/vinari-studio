// V133TyreAge: the tyre's own birth date, read off its sidewall. ONE tyre that the film keeps coming back to:
// the whole wheel standing in a dark workshop, its sidewall pushed in until the DOT line reads, a loupe that finds the
// last four digits, 2319 splitting into week and year, a three-digit code that is too old, an age ruler, the tread cut
// in section with its little wear bar, and five tyres in a row with the spare's date that does not match.
//   shot   wheel | ten | find | loupe | split | three | ruler | bar | five   (look: illustrated for wheel, ten, find, five)
//   hitAt  the key moment; at  a second event (a chunk or "1.2s"); mark 6 | 10 (ruler); worn (bar); side top | bottom (find)
//   line   the punch word (from the spec); tag  a small diagram label; source  a source line
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, MonoLabel, PictureBand, Sfx, SourceLine} from '../common';
import {C, F, L, rgba, toneBig, toneLine} from '../../tokens';
import {ease, prog, spr} from '../../lib/anim';
import {CameraLayer, Hud, useKick} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import {capsLatin, mtav} from '../../lib/format';
import {OBJ, TXT} from '../../lib/layer';
import {textWidth} from '../../lib/measure';
import type {SceneCtx} from '../../types';
import {Backdrop} from '../illo/backdrop';
import {IlloBand} from '../illo/scene';
import {acc, accRamp} from '../illo/palette';

type P = {
  look?: 'illustrated' | 'diagram';
  shot?: string;
  hitAt?: number | string;
  at?: number | string;
  at2?: number | string;
  mark?: number;
  worn?: boolean;
  side?: 'top' | 'bottom';
  line?: string;
  tag?: string;
  source?: string;
};
type Ctx = {p: P; ctx: SceneCtx};

const CODE = 'DOT U2LL LMLR 2319';
const DIGITS = [14, 15, 16, 17]; // the last four characters of CODE
const D2R = Math.PI / 180;
const n1 = (v: number) => +v.toFixed(1);

const useTimes = (p: P, ctx: SceneCtx) => {
  const frame = useCurrentFrame();
  const base = lead(ctx);
  const e = entrance(ctx);
  const hit = Math.max(base + 10, cueFrame(ctx, p.hitAt ?? 0));
  const at = p.at === undefined ? hit : Math.max(base + 4, cueFrame(ctx, p.at));
  const at2 = p.at2 === undefined ? hit : Math.max(base + 4, cueFrame(ctx, p.at2));
  return {frame, base, e, hit, at, at2};
};

/** Raised sidewall letters along an arc: bottom (reads upright under the hub) or top (over it). */
const ArcCode: React.FC<{cx: number; cy: number; r: number; size: number; side: 'top' | 'bottom'; lit: number; color: string; hot: string}> = ({cx, cy, r, size, side, lit, color, hot}) => {
  const chars = Array.from(CODE);
  const step = ((size * 0.64) / r) / D2R;
  const span = step * (chars.length - 1);
  return (
    <g className={TXT}>
      {chars.map((ch, i) => {
        const a = side === 'bottom' ? 90 + span / 2 - i * step : 270 - span / 2 + i * step;
        const x = cx + r * Math.cos(a * D2R);
        const y = cy + r * Math.sin(a * D2R);
        const rot = side === 'bottom' ? a - 90 : a - 270;
        const on = DIGITS.includes(i);
        return (
          <text key={i} x={n1(x)} y={n1(y)} transform={`rotate(${n1(rot)} ${n1(x)} ${n1(y)})`} textAnchor="middle" dominantBaseline="middle" fontFamily={F.mono} fontWeight={700} fontSize={size} fill={on && lit > 0 ? hot : color} opacity={on ? 0.75 + 0.25 * lit : 0.8}>
            {ch}
          </text>
        );
      })}
    </g>
  );
};

/** The wheel face-on: tyre, tread notches on its edge, sidewall ring, an alloy rim with five twin spokes, a caliper. */
const Wheel: React.FC<{cx: number; cy: number; R: number; rot: number; lit: number; side?: 'top' | 'bottom'; code?: boolean; glint: number}> = ({cx, cy, R, rot, lit, side = 'bottom', code = true, glint}) => {
  const rubber = C.il6;
  const edge = C.il7;
  const rimR = R * 0.6;
  const ramp = accRamp(acc('b'), 3);
  const notches = 72;
  const textR = R * 0.81;
  return (
    <g>
      <circle cx={cx} cy={cy} r={R} fill={rubber} />
      <g transform={`rotate(${n1(rot)} ${cx} ${cy})`}>
        {Array.from({length: notches}, (_, i) => {
          const a = (i / notches) * 360 * D2R;
          return <line key={i} x1={n1(cx + Math.cos(a) * (R - 3))} y1={n1(cy + Math.sin(a) * (R - 3))} x2={n1(cx + Math.cos(a) * (R - R * 0.07))} y2={n1(cy + Math.sin(a) * (R - R * 0.07))} stroke={edge} strokeWidth={Math.max(4, R * 0.018)} strokeLinecap="round" />;
        })}
      </g>
      <circle cx={cx} cy={cy} r={R * 0.92} fill="none" stroke={C.il5} strokeOpacity={0.35} strokeWidth={Math.max(3, R * 0.012)} />
      <circle cx={cx} cy={cy} r={R * 0.66} fill="none" stroke={C.il5} strokeOpacity={0.5} strokeWidth={Math.max(3, R * 0.014)} />
      {code ? <ArcCode cx={cx} cy={cy} r={textR} size={Math.max(18, R * 0.07)} side={side} lit={lit} color={C.il4} hot={C.accA} /> : null}
      {/* the caliper behind the spokes, the rim and its spokes */}
      <circle cx={cx} cy={cy} r={rimR} fill={C.il5} />
      <path d={`M${n1(cx + rimR * 0.5)} ${n1(cy - rimR * 0.62)} A${n1(rimR * 0.8)} ${n1(rimR * 0.8)} 0 0 1 ${n1(cx + rimR * 0.78)} ${n1(cy + rimR * 0.1)}`} fill="none" stroke={ramp[1]} strokeWidth={n1(rimR * 0.16)} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={rimR * 0.94} fill="none" stroke={C.il2} strokeWidth={n1(rimR * 0.08)} />
      <g transform={`rotate(${n1(rot)} ${cx} ${cy})`}>
        {Array.from({length: 5}, (_, i) => {
          const a = (i / 5) * 360;
          return (
            <g key={i} transform={`rotate(${a} ${cx} ${cy})`}>
              <path d={`M${n1(cx - rimR * 0.07)} ${n1(cy - rimR * 0.2)} L${n1(cx - rimR * 0.13)} ${n1(cy - rimR * 0.9)} L${n1(cx - rimR * 0.03)} ${n1(cy - rimR * 0.9)} Z`} fill={C.il1} />
              <path d={`M${n1(cx + rimR * 0.07)} ${n1(cy - rimR * 0.2)} L${n1(cx + rimR * 0.13)} ${n1(cy - rimR * 0.9)} L${n1(cx + rimR * 0.03)} ${n1(cy - rimR * 0.9)} Z`} fill={C.il2} />
            </g>
          );
        })}
      </g>
      <circle cx={cx} cy={cy} r={rimR * 0.22} fill={C.il3} />
      <circle cx={cx} cy={cy} r={rimR * 0.09} fill={C.il6} />
      {glint > 0 ? <circle cx={cx} cy={cy} r={R * 0.97} fill="none" stroke={C.il0} strokeOpacity={0.55 * Math.sin(Math.PI * glint)} strokeWidth={10} strokeDasharray={`${n1(R * 0.9)} ${n1(R * 9)}`} strokeDashoffset={n1(-R * 6.2 * glint)} strokeLinecap="round" /> : null}
    </g>
  );
};

const Punch: React.FC<{text?: string; at: number; y?: number; size?: number}> = ({text, at, y = 400, size = 96}) =>
  text ? (
    <div style={{position: 'absolute', left: 0, width: 1080, top: y, display: 'flex', justifyContent: 'center', whiteSpace: 'nowrap'}}>
      <Words text={text} at={at} fx="slam" size={size} color={C.ink} />
    </div>
  ) : null;

/** WHEEL and TEN: the whole wheel standing on the workshop floor, rolling a touch. ten: ten year segments light round it. */
const WheelShot: React.FC<Ctx> = ({p, ctx}) => {
  const uid = useId();
  const {frame, base, hit, e} = useTimes(p, ctx);
  const ten = p.shot === 'ten';
  const R = ten ? 300 : 340;
  const cy = 1220 - R;
  const rot = frame * 0.35 + 20;
  const glint = ten ? 0 : prog(frame, hit, 26, ease.drift);
  const lit = 0;
  const sweep = prog(frame, Math.max(base, hit - 8), 16, ease.enter);
  const fill = prog(frame, Math.max(base, e + 6), Math.max(12, hit - e), ease.enter);
  const ring = [C.accA, C.accA, C.accA];
  return (
    <IlloBand uid={uid} time="night">
      <CameraLayer depth={0.6}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <Backdrop kind="garage" uid={uid} frame={frame} time="night" base={1220} seed={133} />
        </svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <ellipse cx={540} cy={1224} rx={R * 0.95} ry={26} fill={C.il7} opacity={0.8} />
          <g className={OBJ}>
            <Wheel cx={540} cy={cy} R={R} rot={rot} lit={lit} glint={glint} />
          </g>
          {ten
            ? Array.from({length: 10}, (_, i) => {
                const on = fill * 10 > i;
                const a0 = -90 + i * 36 + 3;
                const a1 = a0 + 30;
                const rr = R + 46;
                const pt = (a: number) => `${n1(540 + rr * Math.cos(a * D2R))} ${n1(cy + rr * Math.sin(a * D2R))}`;
                return <path key={i} d={`M${pt(a0)} A${rr} ${rr} 0 0 1 ${pt(a1)}`} fill="none" stroke={on ? ring[2] : rgba(C.ink, 0.16)} strokeWidth={18} strokeLinecap="round" />;
              })
            : null}
          {!ten && sweep > 0 ? (
            <circle cx={540} cy={n1(cy)} r={R + 34} fill="none" stroke={ring[2]} strokeWidth={14} strokeLinecap="round" strokeDasharray={`${n1(2 * Math.PI * (R + 34) * sweep)} 9999`} transform={`rotate(-90 540 ${n1(cy)})`} />
          ) : null}
        </svg>
      </CameraLayer>
      <Hud>
        <Punch text={p.line} at={hit} y={390} />
      </Hud>
      <Sfx name={ten ? 'asmr-count-roll' : 'asmr-swell'} at={Math.max(base, ten ? e + 6 : hit - 6)} volume={0.24} />
      {ten ? <Land at={hit} /> : null}
      <Haptic kind="light" at={hit} volume={0.25} />
    </IlloBand>
  );
};

/** FIND: pushed right into the sidewall, the DOT line big along its arc; at hitAt the last four digits light. */
const FindShot: React.FC<Ctx> = ({p, ctx}) => {
  const uid = useId();
  const {frame, base, hit} = useTimes(p, ctx);
  const side = p.side ?? 'bottom';
  const R = 1300;
  const textR = R * 0.81;
  const cy = side === 'bottom' ? 960 - textR : 920 + textR;
  const lit = prog(frame, hit, 10, ease.enter);
  const kick = useKick();
  const rot = side === 'bottom' ? 6 - frame * 0.05 : -4 + frame * 0.05;
  // the four digits' arc span, for the accent band behind them
  const step = ((R * 0.07 * 0.64) / textR) / D2R;
  const span = step * (CODE.length - 1);
  const a0 = side === 'bottom' ? 90 + span / 2 - 14 * step + step * 0.6 : 270 - span / 2 + 14 * step - step * 0.6;
  const a1 = side === 'bottom' ? 90 + span / 2 - 17 * step - step * 0.6 : 270 - span / 2 + 17 * step + step * 0.6;
  const pt = (a: number, r: number) => `${n1(540 + r * Math.cos(a * D2R))} ${n1(cy + r * Math.sin(a * D2R))}`;
  const band = [C.accA, C.accA, C.accA];
  return (
    <IlloBand uid={uid} time="night">
      <CameraLayer depth={0.6}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <Backdrop kind="garage" uid={uid} frame={frame} time="night" base={side === 'bottom' ? 1300 : 1200} seed={34} />
        </svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <g transform={`rotate(${n1(rot)} 540 ${n1(cy)})`}>
            <Wheel cx={540} cy={cy} R={R} rot={0} lit={0} side={side} code={false} glint={0} />
            {lit > 0 ? (
              <path d={`M${pt(a0, textR)} A${n1(textR)} ${n1(textR)} 0 0 ${side === 'bottom' ? 0 : 1} ${pt(a1, textR)}`} fill="none" stroke={band[2]} strokeOpacity={0.9 * lit} strokeWidth={n1(R * 0.07 * 1.5 + 14 * kick)} strokeLinecap="round" />
            ) : null}
            <ArcCode cx={540} cy={cy} r={textR} size={R * 0.07} side={side} lit={lit} color={C.il3} hot={C.il0} />
          </g>
        </svg>
      </CameraLayer>
      <Hud>
        <Punch text={p.line} at={hit} y={side === 'bottom' ? 420 : 1080} />
      </Hud>
      <Sfx name="asmr-camera" at={Math.max(base, hit)} volume={0.26} />
      <Haptic kind="rigid" at={hit + 1} volume={0.28} />
    </IlloBand>
  );
};

/** LOUPE (diagram): the DOT line flat on a rubber strip, a loupe slides along it and stops on 2319, magnified. */
const LoupeShot: React.FC<Ctx> = ({p, ctx}) => {
  const {frame, base, e, hit} = useTimes(p, ctx);
  const size = 54;
  const font = `700 ${size}px ${F.mono}`;
  const W = textWidth(CODE, font);
  const x0 = 540 - W / 2;
  const stripY = 760;
  const lead4 = textWidth(CODE.slice(0, 14), font);
  const w4 = textWidth('2319', font);
  const target = x0 + lead4 + w4 / 2;
  const start = x0 + textWidth('DOT ', font) / 2;
  const u = spr(frame, Math.max(base, e + 8), 'enter');
  const go = prog(frame, Math.max(base, e + 8), Math.max(14, hit - e - 8), ease.camera);
  const lx = start + (target - start) * go;
  const ly = stripY + 300;
  const k = 2.6;
  const LR = 190;
  const lit = prog(frame, hit, 8, ease.enter);
  const ring = [C.accA, C.accA, C.accA];
  const kick = useKick();
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={1}>
        <div className={OBJ} style={{position: 'absolute', left: 150, width: 780, top: stripY - 70, height: 140, borderRadius: 70, backgroundColor: rgba(C.ink, 0.08), border: `4px solid ${C.rule}`, opacity: u}} />
        <div className={TXT} style={{position: 'absolute', left: x0, top: stripY - size * 0.6, font, color: C.ink2, whiteSpace: 'nowrap', opacity: u}}>
          {CODE.slice(0, 14)}
          <span style={{color: lit > 0 ? C.ink : C.ink2}}>{CODE.slice(14)}</span>
        </div>
        {/* the loupe's stem from the strip down to its glass */}
        <div style={{position: 'absolute', left: lx - 3, top: stripY + 48, width: 6, height: ly - LR - stripY - 48, backgroundColor: ring[2], opacity: u}} />
        <div className={OBJ} style={{position: 'absolute', left: lx - LR, top: ly - LR, width: LR * 2, height: LR * 2, borderRadius: LR, overflow: 'hidden', borderWidth: n1(10 + 6 * kick), borderStyle: 'solid', borderColor: ring[2], backgroundColor: C.bg, opacity: u, transform: `scale(${n1(0.9 + 0.1 * u)})`}}>
          <div className={TXT} style={{position: 'absolute', left: LR + (x0 - lx) * k - 10, top: LR - size * k * 0.62 - 10, font: `700 ${size * k}px ${F.mono}`, color: C.ink, whiteSpace: 'nowrap'}}>
            {CODE}
          </div>
        </div>
      </CameraLayer>
      <Hud>
        <MonoLabel text="DOT" at={Math.max(base, e + 4)} size={40} color={C.ink2} style={{position: 'absolute', left: 150, top: 560}} />
      </Hud>
      <Sfx name="asmr-slide" at={Math.max(base, e + 8)} volume={0.2} />
      <Land at={hit} />
      <Haptic kind="light" at={hit} volume={0.25} />
    </PictureBand>
  );
};

/** SPLIT (diagram): 2319 huge; it splits into 23 and 19, each with its word; at `at` the year reads 2019, at `at2` the week rings. */
const SplitShot: React.FC<Ctx> = ({p, ctx}) => {
  const {frame, base, e, hit, at, at2} = useTimes(p, ctx);
  const size = 250;
  const font = `700 ${size}px ${F.sans}`;
  const w2 = textWidth('23', font);
  const s = spr(frame, hit, 'land');
  const gap = 40 + 180 * s;
  const y = 640;
  const xL = 540 - gap / 2 - w2;
  const xR = 540 + gap / 2;
  const appear = spr(frame, Math.max(base, e), 'enterXL');
  const year = prog(frame, at, 12, ease.enter);
  const week = prog(frame, at2, 12, ease.enter);
  const ring = [C.accA, C.accA, C.accA];
  const lab = prog(frame, hit + 6, 10, ease.enter);
  const pre = textWidth('20', `600 ${size * 0.42}px ${F.sans}`);
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={1}>
        <div className={OBJ} style={{position: 'absolute', left: 140, top: y - 40, width: 800, height: size + 300, opacity: 0}} />
        <div className={TXT} style={{position: 'absolute', left: xL, top: y, font, color: C.ink, opacity: appear, lineHeight: 1}}>
          23
        </div>
        <div className={TXT} style={{position: 'absolute', left: xR, top: y, font, color: C.ink, opacity: appear, lineHeight: 1}}>
          19
        </div>
        <div className={TXT} style={{position: 'absolute', left: xR - pre - 6, top: y + size * 0.05, font: `600 ${size * 0.42}px ${F.sans}`, color: C.ink2, opacity: year, lineHeight: 1}}>
          20
        </div>
        {/* the brackets under the halves */}
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: lab}}>
          <path d={`M${n1(xL + 6)} ${y + size + 30} v24 h${n1(w2 - 12)} v-24`} fill="none" stroke={week > 0 ? ring[2] : C.ink2} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
          <path d={`M${n1(xR + 6)} ${y + size + 30} v24 h${n1(w2 - 12)} v-24`} fill="none" stroke={year > 0 ? ring[2] : C.ink2} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
          {week > 0 ? <circle cx={n1(xL + w2 / 2)} cy={y + size * 0.52} r={n1(size * 0.62)} fill="none" stroke={ring[2]} strokeWidth={8} strokeDasharray={`${n1(week * 2 * Math.PI * size * 0.62)} 4000`} transform={`rotate(-90 ${n1(xL + w2 / 2)} ${n1(y + size * 0.52)})`} /> : null}
        </svg>
      </CameraLayer>
      <Hud>
        <div className={TXT} style={{position: 'absolute', left: xL, width: w2, top: y + size + 80, textAlign: 'center', font: `600 50px ${F.sans}`, color: C.ink, opacity: lab}}>
          {mtav('კვირა')}
        </div>
        <div className={TXT} style={{position: 'absolute', left: xR, width: w2, top: y + size + 80, textAlign: 'center', font: `600 50px ${F.sans}`, color: C.ink, opacity: lab}}>
          {mtav('წელი')}
        </div>
      </Hud>
      <Sfx name="asmr-paper-tear" at={Math.max(base, hit - 2)} volume={0.22} />
      <Land at={hit} />
      <Sfx name="asmr-knock" at={Math.max(base, at)} volume={0.2} />
      <Sfx name="asmr-knock" at={Math.max(base, at2)} volume={0.2} />
      <Haptic kind="rigid" at={hit} volume={0.28} />
    </PictureBand>
  );
};

/** THREE (diagram): four slots, only three filled; at `at` the empty slot is ringed, at hitAt the code turns red and is struck. */
const ThreeShot: React.FC<Ctx> = ({p, ctx}) => {
  const {frame, base, e, hit, at} = useTimes(p, ctx);
  const digits = ['4', '8', '9'];
  const W = 160;
  const H = 220;
  const gap = 34;
  const x0 = 540 - (4 * W + 3 * gap) / 2;
  const y = 700;
  const empty = prog(frame, at, 10, ease.enter);
  const bad = prog(frame, hit, 8, ease.enter);
  const kick = useKick();
  const ring = [C.accA, C.accA, C.accA];
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={1}>
        <div className={OBJ} style={{position: 'absolute', left: x0 - 20, top: y - 20, width: 4 * W + 3 * gap + 40, height: H + 40}}>
          {Array.from({length: 4}, (_, i) => {
            const a = spr(frame, Math.max(base, e) + i * 4, 'enter');
            const isEmpty = i === 3;
            return (
              <div key={i} style={{position: 'absolute', left: 20 + i * (W + gap), top: 20 + (1 - a) * 40, width: W, height: H, borderRadius: 26, opacity: a, borderWidth: isEmpty ? 6 : 5, borderStyle: isEmpty ? 'dashed' : 'solid', borderColor: isEmpty ? (empty > 0 ? ring[2] : C.ink2) : bad > 0 ? toneLine('down') : C.ink2, backgroundColor: isEmpty ? 'transparent' : rgba(C.ink, 0.06)}}>
                {isEmpty ? null : (
                  <div className={TXT} style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', font: `700 150px ${F.sans}`, color: bad > 0 ? toneBig('down') : C.ink}}>
                    {digits[+i]}
                  </div>
                )}
              </div>
            );
          })}
          {bad > 0 ? <div style={{position: 'absolute', left: 0, top: H / 2 + 14, width: (3 * W + 2 * gap + 40) * bad, height: 12 + 4 * kick, borderRadius: 8, backgroundColor: toneLine('down')}} /> : null}
        </div>
      </CameraLayer>
      <Hud>
        <MonoLabel text="DOT" at={Math.max(base, e + 4)} size={40} color={C.ink2} style={{position: 'absolute', left: x0, top: y - 90}} />
        <Punch text={p.line} at={hit} y={1030} size={80} />
      </Hud>
      <Sfx name="asmr-pop" at={Math.max(base, at)} volume={0.22} />
      <Sfx name="asmr-strike" at={Math.max(base, hit)} volume={0.28} />
      <Haptic kind="rigid" at={hit + 1} volume={0.3} />
    </PictureBand>
  );
};

/** RULER (diagram): ten years on a rule; a small wheel rolls along it to the mark (6 amber, 10 red), the big number above. */
const RulerShot: React.FC<Ctx> = ({p, ctx}) => {
  const {frame, base, e, hit, at2} = useTimes(p, ctx);
  const first = p.mark === 10 ? 10 : 6;
  const second = p.at2 !== undefined && first < 10 && frame >= at2;
  const mark = second ? 10 : first;
  const x0 = 170;
  const x1 = 910;
  const y = 980;
  const X = (v: number) => x0 + ((x1 - x0) * v) / 10;
  const go = prog(frame, Math.max(base, e + 4), Math.max(12, hit - e - 4), ease.camera);
  const pos = first * go + (10 - first) * (second ? prog(frame, at2, 20, ease.camera) : 0);
  const end = second ? prog(frame, at2 + 20, 10, ease.enter) : prog(frame, hit, 10, ease.enter);
  const hot = mark === 10 ? toneLine('down') : C.accA;
  const appear = spr(frame, Math.max(base, e), 'enter');
  const wx = X(pos);
  const big = mark === 10 ? toneBig('down') : C.ink;
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={1}>
        <svg className={OBJ} width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear}}>
          <line x1={x0} y1={y} x2={x1} y2={y} stroke={C.ink2} strokeWidth={6} strokeLinecap="round" />
          <line x1={x0} y1={y} x2={n1(wx)} y2={y} stroke={hot} strokeWidth={10} strokeLinecap="round" />
          {Array.from({length: 11}, (_, i) => (
            <line key={i} x1={X(i)} y1={y + 14} x2={X(i)} y2={y + (i % 5 === 0 ? 56 : 38)} stroke={i <= pos + 0.01 ? hot : C.ink2} strokeWidth={i === mark ? 8 : 5} strokeLinecap="round" />
          ))}
          <g transform={`translate(${n1(wx)} ${y - 66}) rotate(${n1(pos * 120)})`}>
            <circle r={52} fill={C.ink} />
            <circle r={30} fill={C.bg} />
            <circle r={30} fill="none" stroke={hot} strokeWidth={6} />
            <circle r={8} fill={C.ink} />
          </g>
        </svg>
        <div className={TXT} style={{position: 'absolute', left: X(mark) - 200, width: 400, top: 560, textAlign: 'center', font: `700 ${n1(250 + 20 * end)}px ${F.sans}`, color: big, opacity: end, lineHeight: 1}}>
          {String(mark)}
        </div>
      </CameraLayer>
      <Hud>
        {[0, 5, 10].map((v) => (
          <div key={v} className={TXT} style={{position: 'absolute', left: X(v) - 60, width: 120, top: y + 70, textAlign: 'center', font: `600 40px ${F.mono}`, color: C.ink2, opacity: appear}}>
            {String(v)}
          </div>
        ))}
        {p.tag && !second ? <MonoLabel text={p.tag} at={hit + 8} size={40} color={C.ink} style={{position: 'absolute', left: x0, top: 470}} /> : null}
        <SourceLine text={p.source} at={Math.max(base, e + 10)} y={1240} />
      </Hud>
      <Sfx name="asmr-count-roll" at={Math.max(base, e + 4)} volume={0.2} />
      <Land at={hit} />
      {p.at2 !== undefined ? <Land at={at2 + 20} /> : null}
      <Haptic kind="rigid" at={hit} volume={0.28} />
    </PictureBand>
  );
};

/** BAR (diagram): the tread cut in section, three grooves; a small raised bar in the middle groove, 1.5 mm. worn: the
 *  surface sinks to the bar's top by hitAt and both turn red. */
const BarShot: React.FC<Ctx> = ({p, ctx}) => {
  const {frame, base, e, hit, at} = useTimes(p, ctx);
  const kick = useKick();
  const top0 = 700;
  const floor = 1000;
  const barTop = 940;
  // worn: the surface sinks from hitAt to the bar's top in about a second, then both turn red
  const wear = p.worn ? prog(frame, hit, 30, ease.camera) : 0;
  const topY = top0 + (barTop - top0) * wear;
  const flush = p.worn ? prog(frame, hit + 30, 8, ease.enter) : 0;
  const grooves = [300, 540, 780];
  const gw = 70;
  const x0 = 150;
  const x1 = 930;
  let d = `M${x0} 1160 L${x0} ${n1(topY)}`;
  for (const g of grooves) {
    const dep = Math.max(topY, floor);
    d += ` L${g - gw} ${n1(topY)} L${g - gw + 10} ${dep} L${g + gw - 10} ${dep} L${g + gw} ${n1(topY)}`;
  }
  d += ` L${x1} ${n1(topY)} L${x1} 1160 Z`;
  const ring = [C.accA, C.accA, C.accA];
  const barCol = flush > 0 ? toneLine('down') : ring[2];
  const show = prog(frame, Math.max(base, at), 10, ease.enter);
  const appear = spr(frame, Math.max(base, e), 'enter');
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={1}>
        <svg className={OBJ} width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear}}>
          <path d={d} fill={rgba(C.ink, 0.12)} stroke={flush > 0 ? toneLine('down') : C.ink} strokeWidth={n1(6 + 4 * kick)} strokeLinejoin="round" />
          {/* the cords inside the rubber */}
          <line x1={x0 + 20} y1={1110} x2={x1 - 20} y2={1110} stroke={C.ink2} strokeWidth={5} strokeDasharray="22 14" />
          <rect x={540 - gw + 14} y={barTop} width={2 * gw - 28} height={floor - barTop} rx={8} fill={barCol} />
          {wear < 0.05 ? (
            <g opacity={show}>
              <line x1={540 + gw + 40} y1={barTop} x2={540 + gw + 40} y2={floor} stroke={C.ink} strokeWidth={5} />
              <line x1={540 + gw + 26} y1={barTop} x2={540 + gw + 54} y2={barTop} stroke={C.ink} strokeWidth={5} />
              <line x1={540 + gw + 26} y1={floor} x2={540 + gw + 54} y2={floor} stroke={C.ink} strokeWidth={5} />
            </g>
          ) : null}
        </svg>
      </CameraLayer>
      <Hud>
        {wear < 0.05 ? (
          <div className={TXT} style={{position: 'absolute', left: 540 + gw + 70, top: barTop + 2, font: `700 46px ${F.sans}`, color: C.ink, opacity: show, whiteSpace: 'nowrap'}}>
            {mtav(capsLatin(p.tag ?? '1.5 მმ'))}
          </div>
        ) : null}
        <Punch text={p.line} at={hit} y={480} size={84} />
        <SourceLine text={p.source} at={Math.max(base, e + 10)} y={1240} />
      </Hud>
      <Sfx name={p.worn ? 'asmr-swell' : 'asmr-tick-fine'} at={Math.max(base, p.worn ? e + 4 : at)} volume={0.22} />
      <Land at={hit} />
      <Haptic kind="rigid" at={hit} volume={0.28} />
    </PictureBand>
  );
};

/** FIVE: four tyres and the spare standing in a row in the workshop, each with its date tag; the spare's comes last. */
const FiveShot: React.FC<Ctx> = ({p, ctx}) => {
  const uid = useId();
  const {frame, base, e, hit, at} = useTimes(p, ctx);
  const codes = ['2319', '2419', '2219', '2319', '0912'];
  const xs = [200, 330, 460, 590, 760];
  const floorY = 1160;
  const tw = 104;
  const th = 330;
  const kick = useKick();
  const ring = [C.accA, C.accA, C.accA];
  return (
    <IlloBand uid={uid} time="night">
      <CameraLayer depth={0.6}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <Backdrop kind="garage" uid={uid} frame={frame} time="night" base={floorY} seed={77} />
        </svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          {xs.map((x, i) => {
            const spare = i === 4;
            const a = spr(frame, Math.max(base, e) + i * 3, 'enter');
            const y = floorY - th;
            const hot = spare && frame >= hit;
            return (
              <g key={i} className={OBJ} opacity={a}>
                <ellipse cx={x} cy={floorY + 4} rx={tw * 0.7} ry={12} fill={C.il7} opacity={0.8} />
                <rect x={x - tw / 2} y={y} width={tw} height={th} rx={tw * 0.42} fill={C.il6} stroke={hot ? toneLine('down') : C.il5} strokeWidth={hot ? n1(6 + 4 * kick) : 4} />
                {Array.from({length: 9}, (_, k) => (
                  <path key={k} d={`M${x - tw / 2 + 14} ${n1(y + 36 + k * 32)} l${n1(tw / 2 - 14)} 12 l${n1(tw / 2 - 14)} -12`} fill="none" stroke={C.il7} strokeWidth={6} strokeLinecap="round" />
                ))}
              </g>
            );
          })}
        </svg>
      </CameraLayer>
      <Hud>
        {xs.map((x, i) => {
          const spare = i === 4;
          const t0 = spare ? hit : at + i * 7;
          const a = spr(frame, t0, 'enter');
          const hot = spare && frame >= hit;
          return (
            <div key={i} className={TXT} style={{position: 'absolute', left: x - 66, width: 132, top: floorY - th - 96 - (1 - a) * 24, height: 64, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', font: `700 38px ${F.mono}`, color: hot ? toneBig('down') : C.ink, backgroundColor: rgba(C.bg, 0.82), borderWidth: 4, borderStyle: 'solid', borderColor: hot ? toneLine('down') : spare ? ring[2] : C.rule, opacity: a}}>
              {codes[+i]}
            </div>
          );
        })}
        <Punch text={p.line} at={hit} y={420} size={84} />
      </Hud>
      <Sfx name="asmr-knock" at={Math.max(base, at)} volume={0.2} />
      <Land at={hit} />
      <Haptic kind="rigid" at={hit + 1} volume={0.28} />
    </IlloBand>
  );
};

export const V133TyreAge: React.FC<Ctx> = ({p, ctx}) => {
  switch (p.shot) {
    case 'find':
      return <FindShot p={p} ctx={ctx} />;
    case 'loupe':
      return <LoupeShot p={p} ctx={ctx} />;
    case 'split':
      return <SplitShot p={p} ctx={ctx} />;
    case 'three':
      return <ThreeShot p={p} ctx={ctx} />;
    case 'ruler':
      return <RulerShot p={p} ctx={ctx} />;
    case 'bar':
      return <BarShot p={p} ctx={ctx} />;
    case 'five':
      return <FiveShot p={p} ctx={ctx} />;
    default:
      return <WheelShot p={p} ctx={ctx} />;
  }
};
