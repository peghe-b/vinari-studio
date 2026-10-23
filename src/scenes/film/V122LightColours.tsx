// V122LightColours: the warning lamps read like a traffic signal (the AA's rule), one diagram that moves on step by step.
//   shot "signal"  a signal head whose three lenses hold dashboard lamps: red the oil can, amber the engine, green a low
//                  beam; `lit` red | amber | green lights one with its punch word, `lit` cycle runs all three in turn
//   shot "keyon"   the cluster's lamp panel at the key: every lamp lights white (`testAt`), goes dark (`outAt`), and one,
//                  the oil can, stays on in red (`stayAt`)
//   shot "steady"  the engine lamp, huge, in the film's accent, simply on: a solid bar under it
//   shot "flash"   the same lamp blinking: the bar under it breaks into pulses, the punch word lands
//   shot "code"    the engine control unit as a chip: a code tag slides into it and the chip lights (`hitAt`)
// A diagram on the clean field (look "diagram"): everything whole inside the band, strokes 4 px and up.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, PictureBand, Sfx, SourceLine} from '../common';
import {accentsOn, C, F, halo, isLight, rgba, toneLine} from '../../tokens';
import {prog, spr} from '../../lib/anim';
import {CameraLayer, Hud, useKick} from '../../lib/camera';
import {OBJ, TXT} from '../../lib/layer';
import {Words} from '../../lib/textfx';
import {capsLatin} from '../../lib/format';
import type {SceneCtx} from '../../types';
import {Icon} from '../illo/icons';

type P = {
  look?: 'diagram';
  shot?: string; // keyon | steady | flash | code; any other name is the signal head (intro, rule, red, amber, green)
  lit?: 'red' | 'amber' | 'green' | 'cycle';
  word?: string; // the punch word beside the lit lens (from the spec)
  hitAt?: number | string;
  testAt?: number | string;
  outAt?: number | string;
  stayAt?: number | string;
  source?: string;
};

// the low beam lamp on the 64 grid: the lamp's D and its five beams
const BEAM_D = 'M34 14C21 14 14 22 14 32C14 42 21 50 34 50Z';
const BEAMS = [18, 25, 32, 39, 46];

const amberOf = () => (accentsOn() ? C.accA : toneLine('accent'));
const panelOf = () => (isLight() ? C.ink : C.surface);
const glyphOf = () => (isLight() ? C.bg : C.ink);

const Beam: React.FC<{x: number; y: number; size: number; color: string}> = ({x, y, size, color}) => (
  <g transform={`translate(${x} ${y}) scale(${(size / 64).toFixed(4)}) translate(-32 -32)`}>
    <path d={BEAM_D} fill={color} />
    {BEAMS.map((by, i) => (
      <line key={i} x1={38} y1={by} x2={56} y2={by + 3} stroke={color} strokeWidth={4.5} strokeLinecap="round" />
    ))}
  </g>
);

/** the signal head: housing x 270..510, three lenses; the words on the right of the lit lens */
const LENS = [
  {key: 'red', y: 600, icon: 'oil'},
  {key: 'amber', y: 830, icon: 'engine'},
  {key: 'green', y: 1060, icon: 'beam'},
] as const;
const HX = 390;
const Signal: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const kick = useKick();
  const lit = p.lit ?? 'cycle';
  const hit = Math.max(base + 6, cueFrame(ctx, p.hitAt ?? 0, e + 16));
  const appear = spr(frame, e, 'enterXL');
  const colourOf = (k: string) => (k === 'red' ? toneLine('down') : k === 'green' ? toneLine('up') : amberOf());
  // cycle: red, amber, green in turn, 14 frames each, from the first word on
  const cyc = Math.floor(Math.max(0, frame - Math.max(base, e + 4)) / 14) % 3;
  const level = (i: number) => {
    if (lit === 'cycle') return frame >= Math.max(base, e + 4) && cyc === i ? 1 : 0;
    return LENS[+i].key === lit ? prog(frame, hit, 6) : 0;
  };
  const litIdx = LENS.findIndex((l) => l.key === lit);
  const wide = p.shot === 'rule'; // the rule's shot: the head lying across, hung from its pole
  return (
    <>
      <CameraLayer depth={0.6}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: 0.55 * appear}}>
          {wide ? <rect x={522} y={440} width={36} height={300} rx={10} fill={rgba(C.ink2, 0.5)} /> : <rect x={HX - 18} y={1190} width={36} height={170} rx={10} fill={rgba(C.ink2, 0.5)} />}
        </svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <svg className={OBJ} width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear, transform: `translateY(${(30 * (1 - appear)).toFixed(1)}px)`}}>
          {wide ? <rect x={175} y={700} width={730} height={260} rx={64} fill={panelOf()} /> : <rect x={HX - 130} y={470} width={260} height={720} rx={64} fill={panelOf()} />}
          {LENS.map((l, i) => {
            const v = level(i);
            const col = colourOf(l.key);
            const s = 1 + (lit !== 'cycle' && i === litIdx ? 0.06 * kick : 0);
            const lx = wide ? 300 + i * 240 : HX;
            const ly = wide ? 830 : l.y;
            return (
              <g key={l.key} transform={`translate(${lx} ${ly}) scale(${s.toFixed(4)}) translate(${-lx} ${-ly})`}>
                {v > 0 ? <circle cx={lx} cy={ly} r={150} fill={halo(col, 0.35 * v)} /> : null}
                <circle cx={lx} cy={ly} r={92} fill={rgba(glyphOf(), 0.1)} />
                <circle cx={lx} cy={ly} r={92} fill={col} opacity={v} />
                {l.icon === 'beam' ? (
                  <Beam x={lx} y={ly} size={110} color={v > 0.5 ? panelOf() : rgba(glyphOf(), 0.22)} />
                ) : (
                  <Icon name={l.icon} x={lx} y={ly} size={116} color={v > 0.5 ? panelOf() : rgba(glyphOf(), 0.22)} />
                )}
              </g>
            );
          })}
        </svg>
      </CameraLayer>
      <Hud>
        {lit !== 'cycle' && p.word && litIdx >= 0 ? (
          <div style={{position: 'absolute', left: HX + 160, top: LENS[+litIdx].y - 40, whiteSpace: 'nowrap'}}>
            <Words text={`*${p.word}*`} at={hit} fx="slam" size={68} />
          </div>
        ) : null}
        {p.source ? <SourceLine text={p.source} at={Math.max(base, e + 20)} y={1300} /> : null}
      </Hud>
      {lit === 'cycle' ? (
        [0, 1, 2].map((i) => <Sfx key={i} name="asmr-knock" at={Math.max(base, e + 4) + 14 * i} volume={0.18} />)
      ) : (
        <>
          <Sfx name="asmr-knock" at={hit} volume={0.3} />
          <Land at={hit + 2} />
          <Haptic kind="rigid" at={hit + 2} volume={0.3} />
        </>
      )}
    </>
  );
};

/** the lamp panel at the key: two rows of three lamps */
const LAMPS = ['battery', 'oil', 'engine', 'brake', 'abs', 'airbag'] as const;
const KeyOn: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const kick = useKick();
  const test = Math.max(base, cueFrame(ctx, p.testAt ?? 0, e + 8));
  const out = cueFrame(ctx, p.outAt ?? 99, 99999);
  const stay = cueFrame(ctx, p.stayAt ?? 99, 99999);
  const appear = spr(frame, e, 'enterXL');
  const on = prog(frame, test, 5) * (1 - prog(frame, out, 8));
  const red = prog(frame, stay, 6);
  const pulse = 0.85 + 0.15 * Math.sin((frame - stay) / 6);
  return (
    <>
      <CameraLayer depth={1}>
        <svg className={OBJ} width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear, transform: `scale(${(0.95 + 0.05 * appear).toFixed(4)})`, transformOrigin: '540px 830px'}}>
          <rect x={170} y={560} width={740} height={540} rx={70} fill={panelOf()} />
          {LAMPS.map((name, i) => {
            const cx = 300 + (i % 3) * 240;
            const cy = 700 + Math.floor(i / 3) * 260;
            const isOil = name === 'oil';
            const lv = isOil ? Math.max(on, red * pulse) : on;
            const col = isOil && red > 0 ? toneLine('down') : glyphOf();
            return (
              <g key={name}>
                {lv > 0.05 ? <circle cx={cx} cy={cy} r={105 + (isOil ? 10 * kick : 0)} fill={halo(col, 0.3 * lv)} /> : null}
                <Icon name={name} x={cx} y={cy} size={140} color={rgba(glyphOf(), 0.14)} />
                <Icon name={name} x={cx} y={cy} size={140} color={col} opacity={lv} />
              </g>
            );
          })}
        </svg>
      </CameraLayer>
      <Sfx name="asmr-tick-fine" at={test} volume={0.3} />
      {out < 99999 ? <Sfx name="asmr-air" at={out} volume={0.2} /> : null}
      {stay < 99999 ? (
        <>
          <Sfx name="asmr-knock" at={stay} volume={0.32} />
          <Haptic kind="rigid" at={stay + 2} volume={0.3} />
        </>
      ) : null}
    </>
  );
};

/** the engine lamp, huge: steady, or blinking */
const Lamp: React.FC<{p: P; ctx: SceneCtx; flash: boolean}> = ({p, ctx, flash}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const kick = useKick();
  const hit = Math.max(base + 4, cueFrame(ctx, p.hitAt ?? 0, e + 12));
  const appear = spr(frame, e, 'enterXL');
  const col = amberOf();
  // a soft blink: 18 frames a cycle, eased edges (never a hard per-frame strobe)
  const ph = ((Math.max(0, frame - hit) % 18) + 18) % 18;
  const blink = flash && frame >= hit ? 0.25 + 0.75 * Math.max(0, Math.cos((ph / 18) * Math.PI * 2)) : 1;
  const lv = prog(frame, Math.max(base, e + 2), 6) * blink;
  const s = 1 + 0.05 * kick;
  const PULSES = 7;
  return (
    <>
      <CameraLayer depth={1}>
        <svg className={OBJ} width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear}}>
          <rect x={250} y={500} width={580} height={500} rx={80} fill={panelOf()} />
          <g transform={`translate(540 750) scale(${s.toFixed(4)}) translate(-540 -750)`}>
            <circle cx={540} cy={750} r={230} fill={halo(col, 0.32 * lv)} />
            <Icon name="engine" x={540} y={750} size={340} color={rgba(glyphOf(), 0.12)} />
            <Icon name="engine" x={540} y={750} size={340} color={col} opacity={lv} />
          </g>
          {/* the signal over time: a solid bar, or pulses */}
          {flash ? (
            Array.from({length: PULSES}, (_, i) => {
              const k = prog(frame, hit + i * 4, 6);
              return <rect key={i} x={250 + i * 86} y={1080} width={56} height={26} rx={13} fill={col} opacity={k} />;
            })
          ) : (
            <rect x={250} y={1080} width={580 * prog(frame, Math.max(base, e + 4), 24)} height={26} rx={13} fill={col} />
          )}
        </svg>
      </CameraLayer>
      <Hud>
        {flash && p.word ? (
          <div style={{position: 'absolute', left: 250, top: 1150, whiteSpace: 'nowrap'}}>
            <Words text={`*${p.word}*`} at={hit + 4} fx="slam" size={84} />
          </div>
        ) : null}
      </Hud>
      {flash ? (
        [0, 1, 2].map((i) => <Sfx key={i} name="asmr-tick-fine" at={hit + i * 18} volume={0.26} />)
      ) : (
        <Sfx name="asmr-swell" at={Math.max(base, e + 2)} volume={0.2} />
      )}
      <Haptic kind="light" at={hit + 2} volume={0.25} />
    </>
  );
};

/** the control unit as a chip: the code tag slides in, the chip lights */
const PINS = 7;
const Code: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const kick = useKick();
  const hit = Math.max(base + 8, cueFrame(ctx, p.hitAt ?? 1, e + 20));
  const appear = spr(frame, e, 'enterXL');
  const slide = spr(frame, hit - 12, 'land');
  const lit = prog(frame, hit, 8);
  const col = amberOf();
  const tagX = 540 + (1 - slide) * 300;
  return (
    <>
      <CameraLayer depth={0.6}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: 0.6 * appear}}>
          <Icon name="engine" x={250} y={520} size={110} color={col} />
        </svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <svg className={OBJ} width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear}}>
          {Array.from({length: PINS}, (_, i) => (
            <g key={i}>
              <rect x={330 + i * 62} y={560} width={22} height={60} rx={6} fill={C.ink2} />
              <rect x={330 + i * 62} y={1040} width={22} height={60} rx={6} fill={C.ink2} />
            </g>
          ))}
          <rect x={290} y={600} width={500} height={460} rx={48} fill={panelOf()} />
          <rect x={290} y={600} width={500} height={460} rx={48} fill="none" stroke={col} strokeWidth={6} opacity={lit} />
          <circle cx={540} cy={830} r={150 + 12 * kick} fill={halo(col, 0.28 * lit)} />
          <rect x={tagX - 150} y={790} width={300} height={84} rx={20} fill={C.surface} stroke={C.ink} strokeWidth={4} opacity={slide} />
        </svg>
        <div className={TXT} style={{position: 'absolute', left: tagX - 150, top: 790, width: 300, height: 84, lineHeight: '84px', textAlign: 'center', fontFamily: F.mono, fontSize: 52, letterSpacing: '0.12em', color: C.ink, opacity: slide}}>
          {'P ····'}
        </div>
        <div className={TXT} style={{position: 'absolute', left: 290, top: 660, width: 500, textAlign: 'center', fontFamily: F.mono, fontSize: 44, letterSpacing: '0.2em', color: glyphOf(), opacity: 0.6 + 0.4 * lit}}>
          {capsLatin('ecu')}
        </div>
      </CameraLayer>
      <Sfx name="asmr-paper" at={hit - 12} volume={0.24} />
      <Land at={hit} />
      <Haptic kind="rigid" at={hit + 2} volume={0.3} />
    </>
  );
};

export const V122LightColours: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const shot = p.shot ?? 'signal';
  return (
    <PictureBand camera={false}>
      {shot === 'keyon' ? <KeyOn p={p} ctx={ctx} /> : shot === 'steady' ? <Lamp p={p} ctx={ctx} flash={false} /> : shot === 'flash' ? <Lamp p={p} ctx={ctx} flash /> : shot === 'code' ? <Code p={p} ctx={ctx} /> : <Signal p={p} ctx={ctx} />}
    </PictureBand>
  );
};
