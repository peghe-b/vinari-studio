// V139WrongAdapter: the wrong adapter, drawn as a diagram. "lost": a phone hunts for the adapter in the socket, its
// search rings pulse, the dashed link between them snaps open on the hit. "pick": the phone above, two adapters below:
// the classic one's link breaks under a cross and it dims, the Wi-Fi / LE one's link fills in the accent and lights.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, PictureBand, Sfx} from '../common';
import {C, F, rgba, toneLine} from '../../tokens';
import {ease, prog, spr} from '../../lib/anim';
import {CameraLayer, Hud, useKick} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import {OBJ, TXT} from '../../lib/layer';
import {mtav} from '../../lib/format';
import {Sym} from '../kit/icons';
import {Glow} from '../kit/glow';
import type {SceneCtx} from '../../types';

type P = {
  look?: 'diagram';
  shot?: 'lost' | 'pick';
  hitAt?: number | string;
  line?: string; // the punch word(s) on the hit, from the spec
  pin?: string; // the classic adapter's tag
};

const Phone: React.FC<{x: number; y: number; w: number; h: number; icon: string; iconCol: string; glow: number}> = ({x, y, w, h, icon, iconCol, glow}) => (
  <div className={OBJ} style={{position: 'absolute', left: x - w / 2, top: y - h / 2, width: w, height: h, borderRadius: w * 0.17, border: `6px solid ${C.ink}`, backgroundColor: C.surface, boxShadow: `0 0 ${40 * glow}px ${rgba(C.ink, 0.25 * glow)}`}}>
    <div style={{position: 'absolute', left: w * 0.34, top: h * 0.035, width: w * 0.32 - 12, height: h * 0.045, borderRadius: 20, backgroundColor: C.ink}} />
    <Sym name={icon} size={w * 0.42} color={iconCol} x={w / 2 - 6} y={h / 2 - 6} />
  </div>
);

const Adapter: React.FC<{x: number; y: number; s: number; led: string; ledOn: number; dim: number; icons: string[]; tag?: string}> = ({x, y, s, led, ledOn, dim, icons, tag}) => {
  const w = 300 * s;
  const h = 190 * s;
  return (
    <div className={OBJ} style={{position: 'absolute', left: x - w / 2, top: y - h / 2, width: w, height: h, opacity: 1 - 0.55 * dim}}>
      <div style={{position: 'absolute', inset: 0, borderRadius: 34 * s, backgroundColor: C.surface, border: `6px solid ${C.ink2}`}} />
      <div style={{position: 'absolute', left: w * 0.12, right: w * 0.12, bottom: -34 * s, height: 40 * s, borderRadius: `0 0 ${16 * s}px ${16 * s}px`, backgroundColor: C.ink2}} />
      <Sym name="obd_port" size={86 * s} color={C.ink} x={w * 0.28} y={h * 0.5} />
      {icons.map((n, i) => (
        <Sym key={i} name={n} size={60 * s} color={C.ink} x={w * 0.62 + i * 64 * s} y={h * 0.5} />
      ))}
      <div style={{position: 'absolute', right: 20 * s, top: 20 * s, width: 22 * s, height: 22 * s, borderRadius: 99, backgroundColor: ledOn > 0.5 ? led : C.rule}} />
      {tag ? (
        <div className={TXT} style={{position: 'absolute', left: 0, right: 0, top: h + 52 * s, textAlign: 'center', fontFamily: F.mono, fontSize: 40, letterSpacing: '0.06em', color: C.ink2}}>
          {mtav(tag)}
        </div>
      ) : null}
    </div>
  );
};

const Lost: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const f = useCurrentFrame();
  const base = lead(ctx);
  const hit = Math.max(base + 14, cueFrame(ctx, p.hitAt ?? '0.9s'));
  const kick = useKick();
  const snap = prog(f, hit, 10, ease.whipOut);
  const blink = Math.floor(f / 9) % 2;
  const accent = toneLine('a');
  const gap = 46 * snap;
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={0.6}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          {[0, 1, 2].map((i) => {
            const k = ((f + i * 18) % 54) / 54;
            return <circle key={i} cx={320} cy={820} r={150 + 170 * k} fill="none" stroke={rgba(C.ink, 0.28 * (1 - k) * (1 - 0.7 * snap))} strokeWidth={4} />;
          })}
        </svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <line x1={440} y1={820} x2={560 - gap} y2={820 - 30 * snap} stroke={C.ink2} strokeWidth={6} strokeDasharray="14 14" strokeDashoffset={-f * 2} strokeLinecap="round" />
          <line x1={560 + gap} y1={820 + 30 * snap} x2={640} y2={820} stroke={C.ink2} strokeWidth={6} strokeDasharray="14 14" strokeDashoffset={f * 2} strokeLinecap="round" />
        </svg>
        <Phone x={320} y={820} w={230} h={460} icon={snap > 0.5 ? 'bluetooth_disabled' : 'bluetooth'} iconCol={snap > 0.5 ? C.ink2 : accent} glow={1 - snap} />
        <Adapter x={790} y={800} s={1} led={accent} ledOn={blink} dim={0} icons={['bluetooth']} tag={p.pin ?? 'PIN 1234'} />
        <Sym name="link_off" size={110 * (0.6 + 0.4 * snap) * (1 + 0.15 * kick)} color={C.ink} x={560} y={820} opacity={snap} />
      </CameraLayer>
      <Hud>
        <div style={{position: 'absolute', left: 0, right: 0, top: 1130, textAlign: 'center', whiteSpace: 'nowrap'}}>
          <Words text={p.line ?? '*ვერ* ხედავს'} at={hit} fx="slam" size={84} />
        </div>
      </Hud>
      <Sfx name="asmr-knock" at={hit} volume={0.4} />
      <Land at={hit} />
      <Haptic kind="rigid" at={hit + 2} volume={0.3} />
    </PictureBand>
  );
};

const Pick: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const f = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 14, cueFrame(ctx, p.hitAt ?? '0.8s'));
  const kick = useKick();
  const inn = spr(f, e, 'enterXL');
  const cut = prog(f, Math.max(base, hit - 14), 10, ease.whipOut);
  const fill = prog(f, hit, 14, ease.drawOn);
  const accent = toneLine('a');
  const L1 = {x1: 500, y1: 700, x2: 330, y2: 940};
  const L2 = {x1: 580, y1: 700, x2: 750, y2: 940};
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={0.6}>
        <Glow x={750} y={1030} r={300} color={accent} k={0.45 * fill} />
      </CameraLayer>
      <CameraLayer depth={1}>
        <div style={{position: 'absolute', inset: 0, opacity: inn, transform: `translateY(${(1 - inn) * 30}px)`}}>
          <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
            <line x1={L1.x1} y1={L1.y1} x2={L1.x2} y2={L1.y2} stroke={C.ink2} strokeWidth={6} strokeDasharray="14 14" strokeLinecap="round" opacity={1 - 0.6 * cut} />
            <line x1={L2.x1} y1={L2.y1} x2={L2.x1 + (L2.x2 - L2.x1) * fill} y2={L2.y1 + (L2.y2 - L2.y1) * fill} stroke={accent} strokeWidth={9} strokeLinecap="round" />
            <line x1={L2.x1} y1={L2.y1} x2={L2.x2} y2={L2.y2} stroke={rgba(C.ink, 0.25)} strokeWidth={5} strokeDasharray="14 14" strokeLinecap="round" opacity={1 - fill} />
          </svg>
          <Phone x={540} y={560} w={150} h={290} icon="smartphone" iconCol={C.ink} glow={fill} />
          <Adapter x={330} y={1040} s={0.8} led={C.rule} ledOn={0} dim={cut} icons={['bluetooth']} tag={p.pin ?? 'PIN 1234'} />
          <Adapter x={750} y={1040} s={0.8} led={accent} ledOn={fill} dim={0} icons={['wifi', 'bluetooth']} />
          <Sym name="close" size={96 * (1 + 0.12 * kick)} color={C.ink} x={415} y={820} opacity={cut} />
          <Sym name="check_circle" size={90 * (0.7 + 0.3 * fill) * (1 + 0.12 * kick)} color={accent} x={665} y={820} opacity={fill} />
        </div>
      </CameraLayer>
      <Sfx name="asmr-strike" at={Math.max(base, hit - 14)} volume={0.3} />
      <Sfx name="asmr-check" at={hit + 10} volume={0.35} />
      <Land at={hit + 12} />
      <Haptic kind="light" at={hit + 12} volume={0.3} />
    </PictureBand>
  );
};

export const V139WrongAdapter: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => (p.shot === 'pick' ? <Pick p={p} ctx={ctx} /> : <Lost p={p} ctx={ctx} />);
