// V132AuctionWords: an auction lot card read word by word. The card (a pretty car in its photo, four rows of the lot's own
// words) stands whole in the band; on the key moment a highlighter in the film's accent sweeps across ONE row and the
// Georgian meaning slams in under the card, the earlier rows keeping a faint mark. Its second shot is an odometer: six
// drums creeping up to all nines, then rolling over to zero on the hit.
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, MonoLabel, PictureBand, Sfx} from '../common';
import {C, F, L, rgba, toneLine} from '../../tokens';
import {ease, prog, spr} from '../../lib/anim';
import {CameraLayer, Hud, useKick} from '../../lib/camera';
import {capsLatin} from '../../lib/format';
import {OBJ, TXT} from '../../lib/layer';
import {Words} from '../../lib/textfx';
import type {SceneCtx} from '../../types';
import {Car} from '../illo/car';

type P = {
  look?: 'diagram';
  shot?: 'card' | 'odo';
  mark?: number; // the row the highlighter sweeps (0..3); -1 = none
  hitAt?: number | string;
  line?: string; // the meaning, "*word*" punches (1 to 3 words)
};

const ROWS = [
  ['HIGHLIGHTS', 'RUN AND DRIVE'],
  ['TITLE', 'CLEAN'],
  ['ODOMETER', 'ACTUAL'],
  ['EST. RETAIL VALUE', ''],
];
const CX = 160;
const CW = 760;
const CY = 410;
const CH = 760;
const ROW0 = 800;
const ROWH = 88;

const LotCard: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 10, cueFrame(ctx, p.hitAt ?? 0));
  const kick = useKick();
  const mark = p.mark ?? -1;
  const appear = spr(frame, e, 'enterXL');
  const sweep = prog(frame, hit, 12, ease.enter);
  const ry = ROW0 + Math.max(0, mark) * ROWH;
  const push = 1 + 0.04 * prog(frame, hit - 4, 30, ease.camera);
  const accent = toneLine('a');
  const all = mark >= ROWS.length;
  // each shot frames the same card with its own camera: wide, on the row, turned, from below, leaning, stepped back
  const settle = prog(frame, e, 40, ease.camera);
  const shot = p.shot ?? 'wide';
  const view =
    shot === 'photo'
      ? `scale(${(1.1 + 0.04 * settle).toFixed(4)})`
      : shot === 'row'
      ? `scale(${(1.06 * push).toFixed(4)})`
      : shot === 'turn'
        ? `perspective(1800px) rotateY(${(-16 + 8 * settle).toFixed(2)}deg) scale(${(0.94 * push).toFixed(4)})`
        : shot === 'close'
          ? `perspective(1800px) rotateX(${(12 - 5 * settle).toFixed(2)}deg) scale(${(0.98 * push).toFixed(4)})`
          : shot === 'lean'
            ? `rotate(${(-4 + 2 * settle).toFixed(2)}deg) scale(${(0.95 * push).toFixed(4)})`
            : shot === 'all'
              ? `scale(${(0.86 + 0.04 * settle).toFixed(4)})`
              : `scale(${(0.92 * push).toFixed(4)})`;
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={0.6}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: 0.55 * appear}}>
          {[0, 1].map((i) => (
            <rect key={i} x={CX + 50 - i * 26} y={CY - 26 + i * 14} width={CW - 100 + i * 52} height={CH} rx={30} fill={C.surface} stroke={C.rule} strokeWidth={3} opacity={0.5 - 0.2 * i} />
          ))}
        </svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <div
          className={OBJ}
          style={{
            position: 'absolute',
            left: CX,
            top: CY,
            width: CW,
            height: CH,
            borderRadius: 30,
            backgroundColor: C.surface,
            border: `3px solid ${C.rule}`,
            overflow: 'hidden',
            opacity: appear,
            transform: `translateY(${(1 - appear) * 40}px) ${view}`,
            transformOrigin: shot === 'row' ? `${CW / 2}px ${ry - CY + 40}px` : shot === 'photo' ? `${CW / 2}px 190px` : 'center',
          }}
        >
          <div style={{position: 'absolute', left: 24, top: 24, width: CW - 48, height: 330, borderRadius: 18, backgroundColor: rgba(C.ink, 0.06)}} />
          <svg width={CW} height={CH} style={{position: 'absolute', inset: 0}}>
            <Car uid={`${uid}c`} x={CW / 2} y={318} len={560} view="side" body="suv" paint="a" frame={frame} speed={0} lights={{head: shot === 'photo' ? 1 : 0}} />
          </svg>
          {ROWS.map((r, i) => {
            const y = ROW0 - CY + i * ROWH;
            const w = all ? prog(frame, hit + i * 4, 10, ease.enter) : i === mark ? sweep : i < mark ? 1 : 0;
            const a = all ? 0.3 : i === mark ? 0.34 + 0.1 * kick : 0.14;
            return (
              <React.Fragment key={i}>
                {w > 0 ? <div style={{position: 'absolute', left: 18, top: y - 6, width: (CW - 36) * w, height: ROWH - 12, borderRadius: 14, backgroundColor: rgba(accent, a)}} /> : null}
                <div style={{position: 'absolute', left: 36, right: 36, top: y + ROWH - 12, height: 3, backgroundColor: rgba(C.rule, 0.5)}} />
                <div className={TXT} style={{position: 'absolute', left: 40, top: y + 14, fontFamily: F.mono, fontSize: 34, color: C.ink2, whiteSpace: 'nowrap'}}>
                  {capsLatin(r[0])}
                </div>
                {r[1] ? (
                  <div className={TXT} style={{position: 'absolute', right: 40, top: y + 8, fontFamily: F.sans, fontWeight: 700, fontSize: 42, color: C.ink, whiteSpace: 'nowrap'}}>
                    {capsLatin(r[1])}
                  </div>
                ) : (
                  <div style={{position: 'absolute', right: 40, top: y + 22, width: 170, height: 30, borderRadius: 15, backgroundColor: rgba(C.ink, 0.18)}} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </CameraLayer>
      <Hud>
        <MonoLabel text="LOT" at={Math.max(base, e + 4)} size={36} color={C.ink2} style={{position: 'absolute', left: L.camSafe.left, top: 360}} />
      </Hud>
      {p.line ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: 1196, display: 'flex', justifyContent: 'center', whiteSpace: 'nowrap'}}>
          <Words text={p.line} at={hit + 4} fx="slam" size={66} />
        </div>
      ) : null}
      <Sfx name="asmr-paper" at={Math.max(base, e + 6)} volume={0.22} />
      {mark >= 0 ? <Sfx name="asmr-strike" at={hit} volume={0.3} /> : null}
      <Land at={hit + 4} />
      <Haptic kind="light" at={hit + 2} volume={0.3} />
    </PictureBand>
  );
};

const DIG = 6;
const DW = 118;
const DH = 170;
const OY = 760;

const drumPos = (c: number, i: number) => {
  const p10 = Math.pow(10, i);
  if (i === 0) return c % 10;
  const low = c % p10;
  return (Math.floor(c / p10) % 10) + Math.max(0, low - (p10 - 1));
};

const Odometer: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 14, cueFrame(ctx, p.hitAt ?? 0));
  const kick = useKick();
  const appear = spr(frame, e, 'enterXL');
  // creep up to the nines, then the roll-over lands on the hit
  const before = 999996 + 3 * prog(frame, e, Math.max(1, hit - 10 - e), ease.drift);
  const roll = prog(frame, hit - 10, 12, ease.enter);
  const c = before + (1000000 - 999999) * roll;
  const total = DIG * DW + (DIG - 1) * 12;
  const x0 = 540 - total / 2;
  const accent = toneLine('a');
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={0.6}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: 0.6 * appear}}>
          <circle cx={540} cy={OY + DH / 2} r={400} fill="none" stroke={C.rule} strokeWidth={4} />
          {Array.from({length: 37}, (_, i) => {
            const t = (-135 + (270 * i) / 36) * (Math.PI / 180);
            return <line key={i} x1={540 + Math.sin(t) * 360} y1={OY + DH / 2 - Math.cos(t) * 360} x2={540 + Math.sin(t) * 395} y2={OY + DH / 2 - Math.cos(t) * 395} stroke={C.ink2} strokeWidth={i % 6 === 0 ? 6 : 3} strokeLinecap="round" />;
          })}
        </svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <div className={OBJ} style={{position: 'absolute', left: x0 - 24, top: OY - 24, width: total + 48, height: DH + 48, borderRadius: 26, backgroundColor: C.ink, opacity: appear, transform: `scale(${(0.94 + 0.06 * appear + 0.03 * kick).toFixed(4)})`, transformOrigin: 'center'}}>
          {Array.from({length: DIG}, (_, k) => {
            const i = DIG - 1 - k;
            const pos = drumPos(c, i);
            return (
              <div key={k} style={{position: 'absolute', left: 24 + k * (DW + 12), top: 24, width: DW, height: DH, borderRadius: 12, overflow: 'hidden', backgroundColor: C.surface}}>
                <div className={TXT} style={{position: 'absolute', left: 0, width: DW, top: -pos * DH, fontFamily: F.sans, fontWeight: 700, fontSize: 120, color: C.ink, textAlign: 'center', lineHeight: `${DH}px`}}>
                  {Array.from({length: 11}, (_, d) => (
                    <div key={d} style={{height: DH}}>{d % 10}</div>
                  ))}
                </div>
              </div>
            );
          })}
          <div style={{position: 'absolute', left: 24, right: 24, bottom: 10, height: 6, borderRadius: 3, backgroundColor: accent, opacity: prog(frame, hit, 10)}} />
        </div>
      </CameraLayer>
      <Hud>
        <MonoLabel text="EXCEEDS MECHANICAL LIMITS" at={Math.max(base, hit)} size={36} color={C.ink} style={{position: 'absolute', left: 0, right: 0, textAlign: 'center', top: OY + DH + 70}} />
      </Hud>
      {p.line ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: 520, display: 'flex', justifyContent: 'center', whiteSpace: 'nowrap'}}>
          <Words text={p.line} at={hit + 4} fx="slam" size={72} />
        </div>
      ) : null}
      <Sfx name="asmr-count-roll" at={Math.max(base, hit - 30)} volume={0.26} />
      <Land at={hit} />
      <Haptic kind="rigid" at={hit + 1} volume={0.3} />
    </PictureBand>
  );
};

/** The yard test: on a strip of lot ground the car starts, rolls one short length forward and stops; a bracket in the
 *  accent measures how little it moved, and the punch lands on the stop. */
const YardRoll: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 16, cueFrame(ctx, p.hitAt ?? 0));
  const appear = spr(frame, e, 'enterXL');
  const go = prog(frame, base + 2, Math.max(8, hit - base - 2), ease.enter);
  const x = 420 + 200 * go;
  const moving = go > 0 && go < 1 ? 0.35 : 0;
  const accent = toneLine('a');
  const GY = 980;
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={0.6}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear}}>
          {Array.from({length: 7}, (_, i) => (
            <line key={i} x1={150 + i * 130} y1={GY + 40} x2={110 + i * 130} y2={GY + 200} stroke={C.rule} strokeWidth={4} strokeLinecap="round" />
          ))}
          <line x1={120} y1={GY} x2={960} y2={GY} stroke={C.ink2} strokeWidth={4} />
        </svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <svg className={OBJ} width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear}}>
          <Car uid={`${uid}r`} x={x} y={GY} len={520} view="side" body="suv" paint="a" frame={frame} roll={200 * go} speed={moving} lights={{head: 1, brake: prog(frame, hit - 2, 6)}} />
          <g opacity={prog(frame, hit, 10)}>
            <line x1={420 - 260} y1={GY + 70} x2={x - 260} y2={GY + 70} stroke={accent} strokeWidth={6} strokeLinecap="round" />
            <line x1={420 - 260} y1={GY + 50} x2={420 - 260} y2={GY + 90} stroke={accent} strokeWidth={6} strokeLinecap="round" />
            <line x1={x - 260} y1={GY + 50} x2={x - 260} y2={GY + 90} stroke={accent} strokeWidth={6} strokeLinecap="round" />
          </g>
        </svg>
      </CameraLayer>
      {p.line ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: 560, display: 'flex', justifyContent: 'center', whiteSpace: 'nowrap'}}>
          <Words text={p.line} at={hit + 2} fx="slam" size={76} />
        </div>
      ) : null}
      <Sfx name="asmr-swell" at={Math.max(base, base + 2)} volume={0.2} />
      <Land at={hit} />
      <Haptic kind="light" at={hit + 1} volume={0.3} />
    </PictureBand>
  );
};

export const V132AuctionWords: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) =>
  p.shot === 'odo' ? <Odometer p={p} ctx={ctx} /> : p.shot === 'roll' ? <YardRoll p={p} ctx={ctx} /> : <LotCard p={p} ctx={ctx} />;
