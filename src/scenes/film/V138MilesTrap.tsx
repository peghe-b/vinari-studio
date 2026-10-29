// v138-miles-trap: Nika buys his first car at the Rustavi market, a dark crossover the seller swears has 40 000 on it.
// The 2D shots of the film (the 3D lot is V138MilesTrapLot, the hook V138MilesTrapHook), every beat its own picture:
//   dash    the driver's seat: the cluster in daylight, the odometer pill rolling to 40 000 under it, drops on the glass
//   turn    the car side-on and Nika beside it, still: the envelope gone, the rain heavier, the light dropping a step
//   brain   a diagram: the engine computer's box with its own number, the listing's card with its own, a bar joins them
//   port    under the wheel at knee height: the socket, the adapter sliding up into it, its lamp lit
//   stamp   the signature: two plates, both 40 000; the km of the engine's plate peels off and a hard stamp lands mi
import React, {useId} from 'react';
import {entrance, Haptic, Land, lead, PictureBand, Sfx} from '../common';
import {C, F, rgba, toneBig} from '../../tokens';
import {prog, spr} from '../../lib/anim';
import {OBJ, TXT} from '../../lib/layer';
import {CameraLayer, useKick} from '../../lib/camera';
import type {SceneCtx} from '../../types';
import {breath, Svg, useShot, WHITE, INK} from '../kit/stage';
import {clamp, E, lerp} from '../kit/lib';
import {Cluster} from '../kit/cluster';
import {RollNumber} from '../kit/motion';
import {Figure} from '../illo/figure';
import {Drops, Rain} from '../illo/fx';
import {Car} from '../illo/car';

type P = {look?: 'illustrated' | 'diagram'; shot?: string; hitAt?: number | string};
type Ctx = {p: P; ctx: SceneCtx};

const NIKA = {is: 'buyer', outfit: 'bomber', hair: 'curly', gender: 'm', age: 'young', beard: 'none', bottom: 'jeans', shoe: 'sneaker'} as const;
const FULL = {x: 0, y: 0, w: 1080, h: 1920};

/** the driver's view: the cluster awake in daylight, the odometer pill under it rolling to 40 000; drops on the glass */
const Dash: React.FC<Ctx> = ({p, ctx}) => {
  const uid = useId();
  const {t, at} = useShot(ctx);
  const e = entrance(ctx);
  const hit = Math.max(lead(ctx) + 8, at(p.hitAt, 30));
  const b = breath(t, 0.8);
  const on = prog(t, e, 14);
  const push = 1 + 0.06 * E.inOut(prog(t, hit - 6, 30));
  return (
    <PictureBand camera={false}>
      <div style={{position: 'absolute', left: -40, right: -40, top: -40, bottom: -40, backgroundColor: '#2C2E33'}} />
      <CameraLayer depth={0.6}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <rect x={-60} y={-60} width={1200} height={560} fill="#D9DCE2" />
          <Drops frame={t} n={40} box={{x: 0, y: 0, w: 1080, h: 480}} opacity={0.7} />
        </svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <div style={{position: 'absolute', inset: 0, transform: `translate(${b.x}px, ${b.y}px) scale(${push})`, transformOrigin: '540px 1000px'}}>
          <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}} className={OBJ}>
            <Cluster uid={`${uid}c`} look="day" frame={t} check={0} on={on} rpm={0.12 * on} speed={0} />
          </svg>
          <div className={OBJ} style={{position: 'absolute', left: 290, top: 1170, width: 500, height: 150, borderRadius: 40, backgroundColor: INK, boxShadow: '0 20px 50px rgba(0,0,0,0.35)', opacity: clamp(on * 1.4)}} />
          <RollNumber value={40000} from={0} at={hit - 6} dur={26} size={96} color={WHITE} latin group align="center" style={{position: 'absolute', left: 290, top: 1192, width: 500}} />
        </div>
      </CameraLayer>
      <Sfx name="asmr-count-roll" at={hit - 6} volume={0.25} />
      <Land at={hit + 20} />
    </PictureBand>
  );
};

/** the turn: the car side-on, Nika beside it, still; the envelope goes back, the rain heavier, the light a step down */
const Turn: React.FC<Ctx> = ({p, ctx}) => {
  const uid = useId();
  const {t, at} = useShot(ctx);
  const hit = Math.max(lead(ctx) + 8, at(p.hitAt, 30));
  const dim = prog(t, 0, 30);
  return (
    <PictureBand camera={false}>
      <div style={{position: 'absolute', inset: 0, backgroundColor: C.bg}} />
      <CameraLayer depth={0.6}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <rect x={-80} y={1130} width={1240} height={880} fill={rgba(C.ink, 0.08)} />
        </svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          <g className={OBJ}>
            <Car uid={`${uid}c`} x={610} y={1130} len={620} view="side" body="suv" paint="a" frame={t} dir={-1} />
          </g>
          <Figure uid={`${uid}n`} cast={NIKA} x={250} y={1300} size={620} frame={t} time="day" face="worried" pose="hold" hold="money" turn={0.85} acts={[{at: hit, pose: 'stand', hold: null, face: 'worried'}]} />
          <Rain frame={t} n={150} slant={8} speed={1.3} box={FULL} opacity={0.6} time="day" />
        </Svg>
      </CameraLayer>
      <div style={{position: 'absolute', inset: 0, backgroundColor: rgba(C.shade, 0.1 * dim)}} />
      <Haptic kind="soft" at={hit} volume={0.25} />
    </PictureBand>
  );
};

/** a diagram: the engine computer's box (its own number inside) and the listing's card (its own); a bold bar joins them */
const Brain: React.FC<Ctx> = ({p, ctx}) => {
  const {t, at} = useShot(ctx);
  const e = entrance(ctx);
  const hit = Math.max(lead(ctx) + 8, at(p.hitAt, 30));
  const kick = useKick();
  const a = spr(t, e, 'enterXL');
  const b = spr(t, hit - 8, 'enterXL');
  const join = E.out(prog(t, hit, 14));
  const pins = [0, 1, 2, 3, 4, 5, 6];
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={1}>
        <div className={OBJ} style={{position: 'absolute', left: 160, top: 470, width: 470, height: 300, borderRadius: 36, backgroundColor: INK, opacity: a, transform: `translateY(${(1 - a) * 40}px)`}}>
          {pins.map((i) => (
            <div key={i} style={{position: 'absolute', left: 50 + i * 56, top: -26, width: 18, height: 30, borderRadius: 6, backgroundColor: INK}} />
          ))}
          {pins.map((i) => (
            <div key={`b${i}`} style={{position: 'absolute', left: 50 + i * 56, bottom: -26, width: 18, height: 30, borderRadius: 6, backgroundColor: INK}} />
          ))}
          <div className={TXT} style={{position: 'absolute', left: 40, top: 40, fontFamily: F.sans, fontWeight: 600, fontSize: 40, color: rgba(WHITE, 0.6)}}>ECU</div>
          <RollNumber value={40000} from={0} at={e + 6} dur={22} size={104} color={WHITE} latin group style={{position: 'absolute', left: 40, top: 130}} />
        </div>
        <div className={OBJ} style={{position: 'absolute', left: 430, top: 900, width: 490, height: 330, borderRadius: 36, backgroundColor: C.surface, border: `5px solid ${C.ink}`, opacity: b, transform: `translateY(${(1 - b) * 40}px)`}}>
          <svg width={490} height={160} style={{position: 'absolute', left: 0, top: 10}}>
            <Car uid="v138b" x={245} y={140} len={300} view="side" body="suv" paint="a" frame={t} />
          </svg>
          <RollNumber value={40000} from={0} at={hit - 6} dur={22} size={88} color={C.ink} latin group suffix=" km" style={{position: 'absolute', left: 40, top: 196}} />
        </div>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <path d={`M395 775 V${lerp(775, 1060, join)}`} stroke={C.ink} strokeWidth={10 + 4 * kick} strokeLinecap="round" fill="none" opacity={join > 0 ? 1 : 0} />
          <path d={`M395 1060 H${lerp(395, 425, join)}`} stroke={C.ink} strokeWidth={10} strokeLinecap="round" fill="none" opacity={join > 0.95 ? 1 : 0} />
          <circle cx={395} cy={1060} r={18 + 6 * kick} fill={toneBig('neutral')} opacity={join} />
        </svg>
      </CameraLayer>
      <Sfx name="asmr-slide" at={hit} volume={0.25} />
      <Land at={hit + 12} />
    </PictureBand>
  );
};

/** under the wheel at knee height: the socket, the adapter sliding up into it, its lamp lit */
const Port: React.FC<Ctx> = ({p, ctx}) => {
  const {t, at} = useShot(ctx);
  const hit = Math.max(lead(ctx) + 10, at(p.hitAt, 30));
  const b = breath(t, 0.6);
  const ins = E.inOut(prog(t, hit - 14, 14));
  const lit = prog(t, hit + 4, 6);
  const y = lerp(1160, 900, ins);
  const pinRow = [0, 1, 2, 3, 4, 5, 6, 7];
  return (
    <PictureBand camera={false}>
      <div style={{position: 'absolute', left: -40, right: -40, top: -40, bottom: -40, backgroundColor: '#5E6168'}} />
      <CameraLayer depth={0.6}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <rect x={-60} y={1330} width={1200} height={700} fill="#D3D5DA" />
          <path d="M-40 470 Q540 330 1120 470" stroke="#24262B" strokeWidth={70} fill="none" strokeLinecap="round" />
        </svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <div style={{position: 'absolute', inset: 0, transform: `translate(${b.x}px, ${b.y}px)`}}>
          <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
            <g className={OBJ}>
              <rect x={300} y={640} width={480} height={300} rx={40} fill="#3A3C42" />
              <path d="M370 700 H710 L680 860 H400 Z" fill="#141518" stroke="#8A8E97" strokeWidth={6} strokeLinejoin="round" />
              {pinRow.map((i) => (
                <rect key={i}x={404 + i * 36} y={730} width={14} height={34} rx={4} fill="#C9CDD4" />
              ))}
              {pinRow.map((i) => (
                <rect key={`b${i}`} x={418 + i * 32} y={790} width={14} height={34} rx={4} fill="#C9CDD4" />
              ))}
            </g>
            <g className={OBJ} transform={`translate(0 ${y - 900})`}>
              <path d="M392 860 H688 L710 1010 Q712 1060 660 1060 H420 Q368 1060 370 1010 Z" fill="#101114" />
              <rect x={470} y={960} width={140} height={44} rx={22} fill="#2A2C31" />
              <circle cx={540} cy={982} r={14} fill={lit > 0 ? toneBig('up') : '#3A3C42'} opacity={0.4 + 0.6 * lit} />
            </g>
          </svg>
        </div>
      </CameraLayer>
      <Sfx name="cc0-latch" at={hit} volume={0.4} />
      <Haptic kind="rigid" at={hit} volume={0.3} />
    </PictureBand>
  );
};

/** the signature: the listing's plate (its car) and the engine's plate (ECU), both 40 000; the engine's km peels, mi lands */
const Plate: React.FC<{y: number; k: number; children?: React.ReactNode}> = ({y, k, children}) => (
  <div className={OBJ} style={{position: 'absolute', left: 140, top: y, width: 800, height: 250, borderRadius: 40, backgroundColor: C.surface, border: `5px solid ${C.ink}`, opacity: k, transform: `translateY(${(1 - k) * 40}px)`}}>
    {children}
  </div>
);
const Num: React.FC<{}> = () => (
  <div className={TXT} style={{position: 'absolute', left: 44, top: 96, fontFamily: F.sans, fontWeight: 700, fontSize: 120, lineHeight: 1, color: C.ink}}>
    40 000
  </div>
);
const Stamp: React.FC<Ctx> = ({p, ctx}) => {
  const {t, at} = useShot(ctx);
  const e = entrance(ctx);
  const hit = Math.max(lead(ctx) + 10, at(p.hitAt, 30));
  const a = spr(t, e, 'enterXL');
  const b = spr(t, e + 6, 'enterXL');
  const peel = E.in(prog(t, hit - 10, 12));
  const slam = prog(t, hit, 7, E.out);
  const big = 1 + 0.9 * (1 - slam);
  const unit: React.CSSProperties = {position: 'absolute', left: 560, top: 126, fontFamily: F.sans, fontWeight: 700, fontSize: 84, lineHeight: 1, color: C.ink};
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={1}>
        <Plate y={500} k={a}>
          <svg width={240} height={80} style={{position: 'absolute', left: 36, top: 10}}>
            <Car uid="v138s" x={110} y={74} len={190} view="side" body="suv" paint="a" frame={t} />
          </svg>
          <Num />
          <div className={TXT} style={unit}>km</div>
        </Plate>
        <Plate y={860} k={b}>
          <div className={TXT} style={{position: 'absolute', left: 44, top: 26, fontFamily: F.sans, fontWeight: 600, fontSize: 40, color: C.ink2}}>ECU</div>
          <Num />
          <div className={TXT} style={{...unit, opacity: 1 - peel, transform: `translate(${40 * peel}px, ${260 * peel}px) rotate(${50 * peel}deg)`, transformOrigin: '0 0'}}>km</div>
          {t >= hit ? (
            <div style={{position: 'absolute', left: 540, top: 100, width: 210, height: 136, borderRadius: 30, backgroundColor: INK, opacity: slam, transform: `scale(${big}) rotate(${-6 * slam}deg)`, transformOrigin: '105px 68px'}}>
              <div className={TXT} style={{position: 'absolute', left: 0, right: 0, top: 22, textAlign: 'center', fontFamily: F.sans, fontWeight: 800, fontSize: 92, lineHeight: 1, color: WHITE}}>
                mi
              </div>
            </div>
          ) : null}
        </Plate>
      </CameraLayer>
      <Sfx name="asmr-paper-tear" at={hit - 10} volume={0.3} />
      <Sfx name="asmr-whoomp" at={hit} volume={0.4} />
      <Land at={hit} />
      <Haptic kind="heavy" at={hit + 1} volume={0.35} />
    </PictureBand>
  );
};

export const V138MilesTrap: React.FC<Ctx> = ({p, ctx}) =>
  p.shot === 'turn' ? <Turn p={p} ctx={ctx} /> : p.shot === 'brain' ? <Brain p={p} ctx={ctx} /> : p.shot === 'port' ? <Port p={p} ctx={ctx} /> : p.shot === 'stamp' ? <Stamp p={p} ctx={ctx} /> : <Dash p={p} ctx={ctx} />;
