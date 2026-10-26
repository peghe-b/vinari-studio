// V135MountainDad: the son's red hatchback on one mountain road to his dad's village (v135-mountain-dad). One road, four
// pictures, each its own camera:
//   "fork"     from high behind the car: the road splits into two identical branches; the car slows, its brake lights
//              come on and it hangs there between them (the punch: which one)
//   "deadend"  side on, a narrow ledge: the car noses up to a dry-stone wall where the road ends, stops, then backs away
//              slowly, reversing lights on, the drop under the road's edge
//   "climb"    the signature: the car climbs the slope while a tall altitude gauge beside it rises past 1500 to 2000,
//              the 2000 mark ringing and blooming as the voice says it
//   "reveal"   out of the black after he kills the engine: the phone rises slowly into the light (the promo reveal)
import React, {useId} from 'react';
import {Haptic, Land, lead, PictureBand, Sfx} from '../common';
import {C, F, L} from '../../tokens';
import {OBJ, TXT} from '../../lib/layer';
import {CameraLayer, Hud} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import type {SceneCtx} from '../../types';
import {Backdrop} from '../illo/backdrop';
import {Car} from '../illo/car';
import {pt, Road, view, type View} from '../illo/road';
import {FOOT, IlloBand, Svg} from '../illo/scene';
import {ground} from '../illo/palette';
import {Glow} from '../kit/glow';
import {PhoneReveal} from '../kit/reveal';
import {E, lerp, prog} from '../kit/lib';
import {INK, useShot} from '../kit/stage';

type P = {
  shot?: 'fork' | 'deadend' | 'climb' | 'reveal';
  hitAt?: number | string;
  riseAt?: number | string;
  line?: string;
  src?: string;
};

const path = (pts: Array<[number, number]>) => `M${pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L')}Z`;

/** the road splitting: the trunk to Z 34, then two branches bending away to the horizon (each 6.4 m wide) */
const forkRoad = (v: View, side: -1 | 0 | 1) => {
  const W = 3.2;
  if (side === 0) return path([pt(v, -W, 1.2), pt(v, W, 1.2), pt(v, W, 34), pt(v, -W, 34)]);
  const left: Array<[number, number]> = [];
  const right: Array<[number, number]> = [];
  for (let z = 30; z <= 230; z += 8) {
    const q = (z - 30) / 200;
    const cx = side * (2.6 + 70 * q * q);
    left.push(pt(v, cx - W, z));
    right.push(pt(v, cx + W, z));
  }
  return path([...left, ...right.reverse()]);
};

const ForkShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, len, at} = useShot(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 12, at(p.hitAt, 30));
  const v = view({hy: 640, h: 4.2, fp: 1000});
  // the car pulls away toward the fork and slows to a stop before it
  const slow = E.out(prog(t, 0, Math.max(hit + 10, 1)));
  const Z = lerp(8.4, 12.5, slow) + 0.25 * E.inOut(prog(t, hit + 10, len - hit));
  const [cx, cy] = pt(v, 0, Z);
  const clen = 4.3 * (v.fp / Z);
  const brake = E.out(prog(t, hit - 4, 6));
  const asphalt = C.il4;
  return (
    <IlloBand uid={uid} time="day">
      <CameraLayer depth={0.6}>
        <Svg>
          <Backdrop kind="mountains" uid={uid} frame={t} time="day" base={640} drift={0.3} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          <rect x={-200} y={640} width={1480} height={FOOT - 640} fill={ground('day')} />
          <path d={forkRoad(v, -1) + forkRoad(v, 1)} fill={asphalt} />
          <path d={forkRoad(v, 0)} fill={asphalt} />
          {/* the trunk's centre dashes, streaming as the car moves */}
          {Array.from({length: 6}, (_, i) => {
            const z0 = 2 + i * 5 - ((t * 0.04) % 5);
            return <path key={i} d={path([pt(v, -0.09, z0), pt(v, 0.09, z0), pt(v, 0.09, z0 + 2.2), pt(v, -0.09, z0 + 2.2)])} fill={C.il0} />;
          })}
          <Car uid={uid} x={cx} y={cy} len={clen} view="rear" body="hatch" paint="a" frame={t} speed={0.4 * (1 - slow)} lights={{brake, tail: 0.6}} time="day" />
        </Svg>
      </CameraLayer>
      <Hud>
        <div style={{position: 'absolute', left: 0, right: 0, top: 420, display: 'flex', justifyContent: 'center', whiteSpace: 'nowrap'}}>
          {p.line ? <Words text={p.line} at={hit} fx="slam" size={78} color={INK} /> : null}
        </div>
      </Hud>
      <Sfx name="real-brake-squeak" at={Math.max(base, hit - 4)} volume={0.22} />
      <Land at={hit} />
      <Haptic kind="medium" at={Math.max(base, hit + 1)} volume={0.25} />
    </IlloBand>
  );
};

/** a dry-stone wall: courses of rounded stones, each a step of the kit's greys */
const Wall: React.FC<{x: number; y: number; w: number; rows: number}> = ({x, y, w, rows}) => {
  const out: React.ReactNode[] = [];
  const RH = 46;
  for (let r = 0; r < rows; r++) {
    let sx = x + (r % 2 ? -22 : 0);
    let k = 0;
    while (sx < x + w) {
      const sw = 70 + ((r * 37 + k * 53) % 46);
      const x0 = Math.max(x, sx);
      const x1 = Math.min(x + w, sx + sw - 6);
      if (x1 - x0 > 20) {
        const tones = [C.il3, C.il4, C.il3, C.il5, C.il4];
        out.push(<rect key={`${r}-${k}`} x={x0} y={y - (r + 1) * RH + 3} width={x1 - x0} height={RH - 6} rx={12} fill={tones[(r + k) % 5]} />);
      }
      sx += sw;
      k++;
    }
  }
  return (
    <g className={OBJ}>
      <rect x={x - 4} y={y - rows * RH - 2} width={w + 8} height={rows * RH + 4} rx={14} fill={C.il6} />
      {out}
    </g>
  );
};

const DeadEndShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, len, at} = useShot(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 12, at(p.hitAt, 30));
  const RY = 1110;
  // up to the wall, the stop, then slowly back
  const fwd = E.out(prog(t, 0, hit));
  const back = E.inOut(prog(t, hit + 10, Math.max(20, len - hit - 10)));
  const x = 360 + 60 * fwd - 80 * back;
  const moving = t < hit ? 0.25 * (1 - fwd) : back > 0 && back < 1 ? 0.12 : 0;
  const reverse = E.out(prog(t, hit + 4, 6));
  return (
    <IlloBand uid={uid} time="day">
      <CameraLayer depth={0.6}>
        <Svg>
          <Backdrop kind="mountains" uid={uid} frame={t} time="day" base={RY - 30} drift={0.15} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          {/* the ledge: the road, its pale edge, and the slope falling away under it */}
          <rect x={-200} y={RY - 6} width={1480} height={44} fill={C.il4} />
          <rect x={-200} y={RY + 36} width={1480} height={8} fill={C.il1} />
          <path d={`M-200 ${RY + 44}H1280V${FOOT}H-200Z`} fill={ground('day')} />
          <path d={`M-200 ${RY + 44}C200 ${RY + 140} 600 ${RY + 230} 1280 ${RY + 300}V${FOOT}H-200Z`} fill={C.il2} opacity={0.6} />
          <Wall x={670} y={RY + 2} w={220} rows={5} />
          <Car uid={uid} x={x} y={RY + 4} len={460} view="side" body="hatch" paint="a" frame={t} speed={moving} lights={{tail: 0.4 + 0.6 * reverse, brake: t >= hit - 3 && t < hit + 12 ? 1 : 0}} time="day" />
        </Svg>
      </CameraLayer>
      <Hud>
        <div style={{position: 'absolute', left: L.camSafe.left, top: 430, whiteSpace: 'nowrap'}}>
          {p.line ? <Words text={p.line} at={hit + 12} fx="slam" size={80} color={INK} /> : null}
        </div>
      </Hud>
      <Sfx name="real-handbrake" at={Math.max(base, hit)} volume={0.3} />
      <Haptic kind="heavy" at={Math.max(base, hit + 1)} volume={0.3} />
    </IlloBand>
  );
};

// the altitude gauge, beside the climbing road (stage px)
const GX = 860;
const GW = 58;
const GTOP = 450;
const GBOT = 1010;
const MIN = 1000;
const MAX = 2500;
const gy = (m: number) => GBOT - ((m - MIN) / (MAX - MIN)) * (GBOT - GTOP);
const MARKS = [1000, 1500, 2000, 2500];

const ClimbShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, len, at} = useShot(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 16, at(p.hitAt, 40));
  // the road rises left to right
  const y0 = 1250;
  const y1 = 1070;
  const ry = (x: number) => y0 + ((y1 - y0) * (x + 200)) / 1480;
  const ang = (Math.atan2(y1 - y0, 1480) * 180) / Math.PI;
  const cx = lerp(330, 420, E.inOut(prog(t, 0, len)));
  const cy = ry(cx);
  // the gauge's level: 1500 to 2000 by the hit, a little on after it
  const m = lerp(1450, 2000, E.inOut(prog(t, 0, hit))) + 60 * E.out(prog(t, hit, Math.max(10, len - hit)));
  const ringK = E.out(prog(t, hit, 14)) * (1 - 0.6 * E.inOut(prog(t, hit + 14, 30)));
  const lit = (mk: number) => (m >= mk - 2 ? 1 : 0);
  const road = `M-200 ${ry(-200)}L1280 ${ry(1280)}L1280 ${ry(1280) + 40}L-200 ${ry(-200) + 40}Z`;
  return (
    <IlloBand uid={uid} time="day">
      <CameraLayer depth={0.6}>
        <Svg>
          <Backdrop kind="mountains" uid={uid} frame={t} time="day" base={1100} drift={0.9} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          <path d={`M-200 ${ry(-200) + 30}L1280 ${ry(1280) + 30}V${FOOT}H-200Z`} fill={ground('day')} />
          <path d={road} fill={C.il4} />
          {Array.from({length: 9}, (_, i) => {
            const x = -120 + i * 180 - ((t * 5) % 180);
            return <path key={i} d={`M${x} ${ry(x) + 18}L${x + 70} ${ry(x + 70) + 18}`} stroke={C.il0} strokeWidth={6} strokeLinecap="round" />;
          })}
          <g transform={`rotate(${ang.toFixed(2)} ${cx.toFixed(1)} ${cy.toFixed(1)})`}>
            <Car uid={uid} x={cx} y={cy + 4} len={520} view="side" body="hatch" paint="a" frame={t} speed={0.45} time="day" />
          </g>
        </Svg>
      </CameraLayer>
      <Hud>
        {/* the altitude gauge: a tall capsule filling with the climb, a mark for every 500 m */}
        <div className={OBJ} style={{position: 'absolute', left: GX - 190, top: GTOP - 40, width: 190 + GW + 20, height: GBOT - GTOP + 80}}>
          <svg width={190 + GW + 20} height={GBOT - GTOP + 80} viewBox={`${GX - 190} ${GTOP - 40} ${190 + GW + 20} ${GBOT - GTOP + 80}`} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
            <rect x={GX} y={GTOP - 20} width={GW} height={GBOT - GTOP + 40} rx={GW / 2} fill={C.surface} stroke={C.ink} strokeWidth={5} />
            <rect x={GX + 9} y={gy(m)} width={GW - 18} height={Math.max(0, GBOT + 11 - gy(m))} rx={(GW - 18) / 2} fill={C.accA} />
            {MARKS.map((mk) => (
              <rect key={mk} x={GX - 26} y={gy(mk) - 3} width={22} height={6} rx={3} fill={C.ink} opacity={0.4 + 0.6 * lit(mk)} />
            ))}
            <circle cx={GX + GW / 2} cy={gy(2000)} r={GW * (0.7 + 0.9 * ringK)} fill="none" stroke={C.accA} strokeWidth={5} opacity={ringK} />
          </svg>
          {MARKS.map((mk) => (
            <div key={mk} className={TXT} style={{position: 'absolute', right: GW + 20 + 34, top: gy(mk) - (GTOP - 40) - 22, fontFamily: F.sans, fontWeight: mk === 2000 && ringK > 0.05 ? 800 : 600, fontSize: mk === 2000 ? 44 + 8 * ringK : 38, lineHeight: '44px', color: C.ink, opacity: 0.45 + 0.55 * lit(mk), whiteSpace: 'nowrap'}}>
              {String(mk)}
            </div>
          ))}
        </div>
        <Glow x={GX + GW / 2} y={gy(2000)} r={180} color={C.accA} k={0.7 * ringK} />
        <div style={{position: 'absolute', left: L.camSafe.left, top: 430, whiteSpace: 'nowrap'}}>
          {p.line ? <Words text={p.line} at={hit} fx="slam" size={80} color={INK} /> : null}
        </div>
      </Hud>
      <Sfx name="asmr-detent" at={Math.max(base, hit)} volume={0.35} />
      <Land at={hit} />
      <Haptic kind="rigid" at={Math.max(base, hit + 1)} volume={0.3} />
    </IlloBand>
  );
};

const RevealShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const {at} = useShot(ctx);
  const base = lead(ctx);
  const riseAt = Math.max(base, at(p.riseAt, 24));
  const {t} = useShot(ctx);
  // the dash's last glow after the engine dies: a warm pool low in the dark, where the phone will rise from
  const pool = 0.55 * (1 - E.inOut(prog(t, riseAt + 30, 20)));
  return (
    <PictureBand camera={false}>
      <PhoneReveal ctx={ctx} src={p.src ?? '23-home-104'} rise={`${(riseAt / 30).toFixed(2)}s`} foot={1300} />
      <Glow x={540} y={1180} r={520} color={C.accA} k={pool} />
      <Sfx name="asmr-swell" at={Math.max(base, riseAt)} volume={0.3} />
      <Haptic kind="soft" at={Math.max(base, riseAt + 40)} volume={0.25} />
    </PictureBand>
  );
};

export const V135MountainDad: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) =>
  p.shot === 'deadend' ? <DeadEndShot p={p} ctx={ctx} /> : p.shot === 'climb' ? <ClimbShot p={p} ctx={ctx} /> : p.shot === 'reveal' ? <RevealShot p={p} ctx={ctx} /> : <ForkShot p={p} ctx={ctx} />;
