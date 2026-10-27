// v135-oil-dipstick: ONE dipstick lesson, a diagram that moves on step by step (AA's advice, theaa.com).
// shots: "slope" (the sump in section tilting level, the oil's surface always flat, the stick's wet mark moving),
// "drain" (the oil running back down from the engine into the sump while a ring fills: wait a few minutes),
// "wipe" (the stick big, a cloth sweeps it clean, it dips and comes back with a true mark),
// "read" (the stick's tip with MIN and MAX, the film ending between them, the zone lit),
// "litre" (the gap between the marks is about one litre: the film rises in small steps, never past MAX),
// "black" (a drop of oil darkening from amber to black in the heat: normal).
import React, {useId} from 'react';
import {useCurrentFrame, interpolateColors} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, MonoLabel, PictureBand, Sfx, SourceLine} from '../common';
import {C, L, rgba, accentsOn} from '../../tokens';
import {ease, prog, spr} from '../../lib/anim';
import {CameraLayer, Hud, useKick} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import {OBJ} from '../../lib/layer';
import type {SceneCtx} from '../../types';

type P = {
  shot?: 'slope' | 'drain' | 'wipe' | 'read' | 'litre' | 'black' | 'topup';
  hitAt?: number | string;
  line?: string;
  label?: string;
  source?: string;
};

const OIL_DEEP = '#0B0B0B';
const CX = 540;

const oilOf = () => (accentsOn() ? C.accA : C.ink2);
const trimOf = () => (accentsOn() ? C.accB : C.ink2);

/** the stick seen big and level: handle at the left, tip at the right; MIN near the tip, MAX further in */
const STICK = {x0: 190, x1: 900, y: 800, h: 64, min: 790, max: 600};

const Stick: React.FC<{wet: number; oil: string; lit?: number; shine?: number}> = ({wet, oil, lit = 0, shine = 0}) => {
  const {x0, x1, y, h, min, max} = STICK;
  const y0 = y - h / 2;
  return (
    <g>
      <rect x={x0 - 70} y={y0 - 26} width={84} height={h + 52} rx={30} fill={trimOf()} />
      <rect x={x0} y={y0} width={x1 - x0} height={h} rx={h / 2} fill={C.surface} stroke={C.ink} strokeWidth={5} />
      {lit > 0 ? <rect x={max} y={y0 - 34} width={min - max} height={h + 68} rx={18} fill="none" stroke={C.ink} strokeWidth={5} opacity={lit} /> : null}
      {wet < x1 ? <rect x={wet} y={y0 + 4} width={x1 - wet - 4} height={h - 8} rx={(h - 8) / 2} fill={oil} /> : null}
      {shine > 0 ? <rect x={wet + 10} y={y0 + 9} width={Math.max(0, x1 - wet - 40)} height={6} rx={3} fill={C.surface} opacity={0.5 * shine} /> : null}
      {[min, max].map((m, i) => (
        <g key={i}>
          <line x1={m} y1={y0 - 18} x2={m} y2={y0 + h + 18} stroke={C.ink} strokeWidth={6} strokeLinecap="round" />
          <circle cx={m} cy={y} r={7} fill={C.ink} />
        </g>
      ))}
    </g>
  );
};

const Labels: React.FC<{at: number}> = ({at}) => (
  <>
    <MonoLabel text="MIN" at={at} size={40} color={C.ink} style={{position: 'absolute', left: STICK.min - 40, top: STICK.y + 60}} />
    <MonoLabel text="MAX" at={at + 4} size={40} color={C.ink} style={{position: 'absolute', left: STICK.max - 40, top: STICK.y + 60}} />
  </>
);

const Punch: React.FC<{text?: string; at: number; py?: number}> = ({text, at, py = 1150}) =>
  text ? (
    <div style={{position: 'absolute', left: 0, right: 0, top: py, display: 'flex', justifyContent: 'center', whiteSpace: 'nowrap'}}>
      <Words text={text} at={at} fx="slam" size={84} />
    </div>
  ) : null;

/** the sump in section on a ground that tilts level; the oil's surface stays flat, the stick turns with the sump */
const Slope: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const f = useCurrentFrame();
  const uid = useId();
  const e = entrance(ctx);
  const hit = Math.max(lead(ctx) + 12, cueFrame(ctx, p.hitAt ?? 1));
  const appear = spr(f, e, 'enterXL');
  const level =prog(f, hit - 14, 22, ease.whipOut);
  const ang = 9 * (1 - level) + 0.6 * Math.sin(f / 14) * (1 - level);
  const SY = 800;
  const surf = SY + 40 + 6 * Math.sin(f / 11) * (1 - level);
  const stickX = CX - 150;
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={0.6}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: 0.6 * appear}}>
          <line x1={150} y1={1000} x2={930} y2={1000} stroke={C.rule} strokeWidth={5} strokeLinecap="round" transform={`rotate(${-ang * 0.9} ${CX} 1000)`} />
        </svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <svg className={OBJ} width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear}}>
          <defs>
            <clipPath id={`${uid}s`}>
              <rect x={CX - 280} y={SY - 160} width={560} height={300} rx={60} transform={`rotate(${-ang} ${CX} ${SY})`} />
            </clipPath>
          </defs>
          <g clipPath={`url(#${uid}s)`}>
            <rect x={CX - 400} y={surf} width={800} height={400} fill={oilOf()} />
            <line x1={CX - 400} y1={surf} x2={CX + 400} y2={surf} stroke={C.ink} strokeWidth={4} opacity={0.4} />
          </g>
          <g transform={`rotate(${-ang} ${CX} ${SY})`}>
            <rect x={CX - 280} y={SY - 160} width={560} height={300} rx={60} fill="none" stroke={C.ink} strokeWidth={7} />
            <rect x={stickX - 9} y={SY - 330} width={18} height={440} rx={9} fill={C.surface} stroke={C.ink} strokeWidth={5} />
            <rect x={stickX - 30} y={SY - 370} width={60} height={44} rx={18} fill={trimOf()} />
          </g>
        </svg>
      </CameraLayer>
      <Hud>
        <MonoLabel text={p.label ?? ''} at={Math.max(lead(ctx), e + 4)} size={40} color={C.ink} style={{position: 'absolute', left: L.camSafe.left, top: 430}} />
        <Punch text={p.line} at={hit} py={1110} />
      </Hud>
      <SourceLine text={p.source} at={Math.max(lead(ctx), e + 6)} y={1300} />
      <Sfx name="asmr-slide" at={Math.max(lead(ctx), hit - 12)} volume={0.26} />
      <Land at={hit + 6} />
      <Haptic kind="rigid" at={hit + 8} volume={0.3} />
    </PictureBand>
  );
};

/** the oil running back down into the sump while a ring fills: a few minutes */
const Drain: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const f = useCurrentFrame();
  const e = entrance(ctx);
  const hit = Math.max(lead(ctx) + 12, cueFrame(ctx, p.hitAt ?? 1));
  const appear = spr(f, e, 'enterXL');
  const fill = prog(f, e, Math.max(20, hit - e), ease.drift);
  const R = 96;
  const RX = 790;
  const RY = 520;
  const arc = 2 * Math.PI * R;
  const lvl = 1150 - 70 * fill;
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={0.6}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear}}>
          <circle cx={RX} cy={RY} r={R} fill="none" stroke={C.rule} strokeWidth={14} />
          <circle cx={RX} cy={RY} r={R} fill="none" stroke={C.ink} strokeWidth={14} strokeLinecap="round" strokeDasharray={`${arc * fill} ${arc}`} transform={`rotate(-90 ${RX} ${RY})`} />
        </svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <svg className={OBJ} width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear}}>
          <rect x={200} y={460} width={440} height={300} rx={30} fill="none" stroke={C.ink} strokeWidth={7} />
          {[0, 1, 2].map((i) => (
            <rect key={i} x={240 + i * 132} y={500} width={96} height={150} rx={14} fill="none" stroke={C.ink2} strokeWidth={5} />
          ))}
          <rect x={180} y={1000} width={480} height={200} rx={50} fill="none" stroke={C.ink} strokeWidth={7} />
          <rect x={186} y={lvl} width={468} height={1194 - lvl} rx={8} fill={oilOf()} />
          {Array.from({length: 9}, (_, i) => {
            const col = 270 + (i % 3) * 140;
            const cyc = ((f + i * 11) % 34) / 34;
            const y = 780 + cyc * (lvl - 800);
            const on = f > e && fill < 0.98 ? 1 : 0;
            return <ellipse key={i} cx={col} cy={y} rx={9} ry={15} fill={oilOf()} opacity={on * (1 - cyc * 0.3)} />;
          })}
        </svg>
      </CameraLayer>
      <Hud>
        <Punch text={p.line} at={hit} py={1240} />
      </Hud>
      <Sfx name="asmr-swell" at={Math.max(lead(ctx), e + 2)} volume={0.2} />
      <Land at={hit} />
      <Haptic kind="light" at={hit + 2} volume={0.3} />
    </PictureBand>
  );
};

/** the stick big: wet and muddled, a cloth sweeps it clean, it dips and comes back with a true mark */
const Wipe: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const f = useCurrentFrame();
  const e = entrance(ctx);
  const hit = Math.max(lead(ctx) + 20, cueFrame(ctx, p.hitAt ?? 1));
  const appear = spr(f, e, 'enterXL');
  const sweep = prog(f, e + 6, 22, ease.camera);
  const dip = prog(f, hit - 18, 12, ease.exit) - prog(f, hit - 4, 12, ease.whipOut);
  const back = prog(f, hit - 4, 14, ease.whipOut);
  const clothX = STICK.x0 + sweep * (STICK.x1 - STICK.x0 + 60);
  const smear = f < hit - 4 ? STICK.x0 + 80 + (STICK.x1 - STICK.x0) * sweep : STICK.x1 - (STICK.x1 - 680) * back;
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={1}>
        <svg className={OBJ} width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear}}>
          <g transform={`rotate(-18 ${CX} ${STICK.y})`}>
            <g transform={`translate(${dip * 180} 0)`}>
              <Stick wet={smear} oil={oilOf()} shine={back} />
            </g>
            {sweep > 0 && sweep < 1 ? (
              <g transform={`rotate(${8 * Math.sin(f / 3)} ${clothX} ${STICK.y})`}>
                <rect x={clothX - 90} y={STICK.y - 120} width={180} height={240} rx={44} fill={trimOf()} stroke={C.ink} strokeWidth={5} />
                <path d={`M ${clothX - 60} ${STICK.y - 70} Q ${clothX} ${STICK.y - 40} ${clothX + 60} ${STICK.y - 70}`} fill="none" stroke={C.ink} strokeWidth={5} strokeLinecap="round" />
              </g>
            ) : null}
          </g>
        </svg>
      </CameraLayer>
      <Hud>
        <Punch text={p.line} at={hit} />
      </Hud>
      <Sfx name="asmr-paper" at={Math.max(lead(ctx), e + 8)} volume={0.3} />
      <Sfx name="asmr-slide" at={Math.max(lead(ctx), hit - 18)} volume={0.24} />
      <Land at={hit + 8} />
      <Haptic kind="light" at={hit + 8} volume={0.3} />
    </PictureBand>
  );
};

/** the tip with MIN and MAX: the film ends between them, the zone lights */
const Read: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const f = useCurrentFrame();
  const e = entrance(ctx);
  const hit = Math.max(lead(ctx) + 12, cueFrame(ctx, p.hitAt ?? 1));
  const appear = spr(f, e, 'enterXL');
  const kick = useKick();
  const wet = STICK.x1 - (STICK.x1 - 690) * prog(f, e + 4, 26, ease.enter);
  const lit = prog(f, hit, 10, ease.whipOut);
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={1}>
        <svg className={OBJ} width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear, transform: `scale(${(1 + 0.02 * kick).toFixed(4)})`, transformOrigin: `${CX}px ${STICK.y}px`}}>
          <Stick wet={wet} oil={oilOf()} lit={lit} shine={1} />
        </svg>
      </CameraLayer>
      <Hud>
        <Labels at={Math.max(lead(ctx), e + 6)} />
        <Punch text={p.line} at={hit} />
      </Hud>
      <Sfx name="asmr-knock" at={Math.max(lead(ctx), hit)} volume={0.3} />
      <Land at={hit} />
      <Haptic kind="rigid" at={hit + 2} volume={0.3} />
    </PictureBand>
  );
};

/** about one litre between the marks: the film rises in small steps, never past MAX */
const Litre: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const f = useCurrentFrame();
  const e = entrance(ctx);
  const hit = Math.max(lead(ctx) + 12, cueFrame(ctx, p.hitAt ?? 1));
  const appear = spr(f, e, 'enterXL');
  const steps = [0, 1, 2].reduce((s, i) => s + prog(f, hit + i * 16, 10, ease.whipOut), 0);
  const wet = STICK.min + 10 - steps * 52;
  const brace = prog(f, e + 6, 16, ease.enter);
  const by = STICK.y - 120;
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={1}>
        <svg className={OBJ} width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear}}>
          <Stick wet={wet} oil={oilOf()} shine={1} />
          <path d={`M ${STICK.max} ${by + 30} L ${STICK.max} ${by} L ${STICK.min} ${by} L ${STICK.min} ${by + 30}`} fill="none" stroke={C.ink} strokeWidth={6} strokeLinejoin="round" opacity={brace} />
          {[0, 1, 2].map((i) => {
            const d = prog(f, hit + i * 16 - 10, 12, ease.enter);
            return d > 0 && d < 1 ? <ellipse key={i} cx={720 - i * 50} cy={by - 140 + d * 150} rx={12} ry={18} fill={oilOf()} /> : null;
          })}
        </svg>
      </CameraLayer>
      <Hud>
        <Labels at={Math.max(lead(ctx), e + 4)} />
        <div style={{position: 'absolute', left: 0, right: 0, top: by - 110, display: 'flex', justifyContent: 'center', paddingLeft: 2 * ((STICK.min + STICK.max) / 2 - CX)}}>
          <MonoLabel text={p.label ?? ''} at={Math.max(lead(ctx), e + 8)} size={52} color={C.ink} />
        </div>
        <Punch text={p.line} at={hit + 32} />
      </Hud>
      <SourceLine text={p.source} at={Math.max(lead(ctx), e + 6)} y={1300} />
      {[0, 1, 2].map((i) => (
        <Sfx key={i} name="asmr-tick-fine" at={Math.max(lead(ctx), hit + i * 16)} volume={0.3} />
      ))}
      <Land at={hit + 32} />
      <Haptic kind="light" at={hit + 34} volume={0.3} />
    </PictureBand>
  );
};

/** a drop of oil darkening from amber to black in the heat */
const Black: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const f = useCurrentFrame();
  const e = entrance(ctx);
  const hit = Math.max(lead(ctx) + 12, cueFrame(ctx, p.hitAt ?? 1));
  const appear = spr(f, e, 'enterXL');
  const dark = prog(f, e + 4, Math.max(16, hit - e - 4), ease.drift);
  const col = interpolateColors(dark, [0, 1], [oilOf(), OIL_DEEP]);
  const DY = 760;
  const drop = `M ${CX} ${DY - 260} C ${CX + 40} ${DY - 160} ${CX + 200} ${DY - 20} ${CX + 200} ${DY + 120} C ${CX + 200} ${DY + 240} ${CX + 110} ${DY + 320} ${CX} ${DY + 320} C ${CX - 110} ${DY + 320} ${CX - 200} ${DY + 240} ${CX - 200} ${DY + 120} C ${CX - 200} ${DY - 20} ${CX - 40} ${DY - 160} ${CX} ${DY - 260} Z`;
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={0.6}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: 0.7 * appear}}>
          {[0, 1, 2].map((i) => {
            const x = CX - 300 + i * 300;
            const w = 14 * Math.sin(f / 7 + i);
            return <path key={i} d={`M ${x} 1110 C ${x + w} 1060 ${x - w} 1010 ${x} 960`} fill="none" stroke={C.rule} strokeWidth={6} strokeLinecap="round" />;
          })}
        </svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <svg className={OBJ} width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear}}>
          <path d={drop} fill={col} stroke={C.ink} strokeWidth={6} />
          <path d={`M ${CX - 120} ${DY + 120} C ${CX - 120} ${DY + 40} ${CX - 80} ${DY - 30} ${CX - 40} ${DY - 80}`} fill="none" stroke={rgba(C.surface, 0.55)} strokeWidth={14} strokeLinecap="round" />
        </svg>
      </CameraLayer>
      <Hud>
        <Punch text={p.line} at={hit} />
      </Hud>
      <SourceLine text={p.source} at={Math.max(lead(ctx), e + 6)} y={1300} />
      <Sfx name="asmr-swell" at={Math.max(lead(ctx), e + 2)} volume={0.22} />
      <Land at={hit} />
      <Haptic kind="light" at={hit + 2} volume={0.3} />
    </PictureBand>
  );
};

/** a bottle tilts over the filler neck, a short pour, then it rights itself: a little at a time */
const Topup: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const f = useCurrentFrame();
  const e = entrance(ctx);
  const hit = Math.max(lead(ctx) + 12, cueFrame(ctx, p.hitAt ?? 1));
  const appear = spr(f, e, 'enterXL');
  const tilt = prog(f, e + 2, 14, ease.enter) - prog(f, hit + 4, 14, ease.exit);
  const pour = tilt > 0.85 ? 1 : 0;
  const NX = 600;
  const NY = 980;
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={0.6}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear}}>
          <rect x={200} y={NY + 20} width={680} height={240} rx={40} fill="none" stroke={C.rule} strokeWidth={6} />
          {[0, 1, 2, 3].map((i) => (
            <line key={i} x1={260 + i * 150} y1={NY + 80} x2={330 + i * 150} y2={NY + 80} stroke={C.rule} strokeWidth={6} strokeLinecap="round" />
          ))}
        </svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <svg className={OBJ} width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear}}>
          <rect x={NX - 60} y={NY - 40} width={120} height={60} rx={16} fill={trimOf()} stroke={C.ink} strokeWidth={5} />
          {pour ? <rect x={NX - 7} y={760} width={14} height={NY - 790} rx={7} fill={oilOf()} /> : null}
          <g transform={`rotate(${115 * tilt} ${NX} 740)`}>
            <rect x={NX - 110} y={500} width={220} height={260} rx={36} fill={C.surface} stroke={C.ink} strokeWidth={7} />
            <rect x={NX - 110} y={620} width={220} height={140} rx={20} fill={oilOf()} opacity={0.9 - 0.3 * prog(f, hit - 10, 20)} />
            <rect x={NX - 34} y={450} width={68} height={56} rx={12} fill={C.ink} />
          </g>
        </svg>
      </CameraLayer>
      <Hud>
        <Punch text={p.line} at={hit} py={1180} />
      </Hud>
      <Sfx name="asmr-swell" at={Math.max(lead(ctx), e + 10)} volume={0.2} />
      <Land at={hit} />
      <Haptic kind="light" at={hit + 2} volume={0.3} />
    </PictureBand>
  );
};

export const V135OilDipstick: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  switch (p.shot) {
    case 'topup':
      return <Topup p={p} ctx={ctx} />;
    case 'slope':
      return <Slope p={p} ctx={ctx} />;
    case 'drain':
      return <Drain p={p} ctx={ctx} />;
    case 'wipe':
      return <Wipe p={p} ctx={ctx} />;
    case 'litre':
      return <Litre p={p} ctx={ctx} />;
    case 'black':
      return <Black p={p} ctx={ctx} />;
    default:
      return <Read p={p} ctx={ctx} />;
  }
};
