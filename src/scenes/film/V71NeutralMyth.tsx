// V71NeutralMyth: the gear gate, the throttle pedal and the fuel injector, one diagram. The knob sits in N and the
// nozzle sprays; the knob slides into 3, the pedal comes up, the spray stops and a big 0 lands beside the nozzle (as a
// rule, an injection engine in gear with the foot off the gas takes no fuel at all).
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, PictureBand, Sfx, SourceLine} from '../common';
import {C, F, L, rgba, toneBig, toneText, type Tone} from '../../tokens';
import {ease, lerp, prog, spr} from '../../lib/anim';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import {textWidth} from '../../lib/measure';
import type {SceneCtx} from '../../types';

type P = {
  lineAt?: number | string; // chunk: the fuel line lights
  shiftAt?: number | string; // chunk: the knob slides N -> 3
  pedalAt?: number | string; // chunk: the foot comes off the gas
  cutAt?: number | string; // chunk: the spray stops
  landAt?: number | string; // chunk: the 0 lands
  fuel?: string; // label of the flow meter
  hedge?: string; // the quiet line under the 0
  engine?: string; // label beside the injector
  pedal?: string; // label under the pedal
  source?: string;
  tone?: Tone;
};

// gear gate (stage units)
const GX = [230, 380, 530];
const GTOP = 490;
const GBOT = 790;
const GMID = 640;
// pedal: hangs from its pivot
const PX = 760;
const PY = 470;
const ARM = 280;
// injector
const IX = 330;
const ITOP = 900;
const ITIP = 1140;
const SPRAY = 150;
// meter and readout column
const MX = 730;
const DROPS = 54;

/** The gear gate and the pedal over the injector: N sprays, 3 with the foot off the gas sprays nothing. */
export const V71NeutralMyth: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const tone = p.tone ?? 'up';
  const lineF = Math.max(base + 6, cueFrame(ctx, p.lineAt ?? 1));
  const shiftF = Math.max(base + 10, cueFrame(ctx, p.shiftAt ?? 2));
  const pedalF = Math.max(shiftF + 8, cueFrame(ctx, p.pedalAt ?? 3));
  const cutF = Math.max(pedalF + 6, cueFrame(ctx, p.cutAt ?? 4));
  const landF = Math.max(cutF + 10, cueFrame(ctx, p.landAt ?? 5));

  const draw = prog(frame, e, 24, ease.drawOn);
  const line = prog(frame, lineF, 18, ease.camera);
  // the knob: from N straight up into 3
  const shift = spr(frame, shiftF, 'land');
  const knobY = lerp(GMID, GTOP, shift);
  const inGear = frame >= shiftF + 6;
  // the pedal: pressed (pad swung forward) -> released (hanging back)
  const lift = spr(frame, pedalF, 'enter');
  const ang = lerp(24, 4, lift);
  // the spray: full, then off
  const spray = 1 - prog(frame, cutF, 14, ease.camera);
  const land = spr(frame, landF, 'land');
  const push = lerp(1, 1.04, prog(frame, e, ctx.dur, ease.camera));

  // droplets along the cone, deterministic from the frame
  const drops: React.ReactNode[] = [];
  for (let i = 0; i < DROPS; i++) {
    const spread = ((i * 37) % 23) / 11 - 1; // -1..1
    const per = 20 + ((i * 13) % 9);
    const ph = (((frame + i * 7) % per) + per) % per;
    const t = ph / per;
    const born = frame - ph; // the frame this drop left the tip
    // a drop already in the air when the spray stops finishes its fall; no new ones after the cut
    const alive = born < cutF ? 1 : 0;
    if (alive <= 0) continue;
    const y = ITIP + 10 + t * SPRAY;
    const x = IX + spread * t * 100;
    const r = 2.4 + ((i * 5) % 3) * 0.9;
    drops.push(<circle key={i} cx={x} cy={y} r={r} fill={C.ink} opacity={(1 - t * 0.8) * 0.8 * draw} />);
  }

  const fuel = mtav(p.fuel ?? 'ხარჯი');
  const hedge = mtav(p.hedge ?? 'როგორც წესი');
  const engine = mtav(p.engine ?? 'ინჟექტორი');
  const pedal = mtav(p.pedal ?? 'გაზი');
  const labFont = `500 30px ${F.mono}`;
  const hedgeSize = Math.min(34, Math.floor((34 * 250) / Math.max(1, textWidth(hedge, `500 34px ${F.sans}`))));
  const gearLabels: [string, number, number][] = [
    ['1', GX[0], GTOP - 62],
    ['3', GX[1], GTOP - 62],
    ['5', GX[2], GTOP - 62],
    ['2', GX[0], GBOT + 62],
    ['4', GX[1], GBOT + 62],
    ['R', GX[2], GBOT + 62],
  ];
  const knobCol = inGear ? toneBig(tone) : C.ink;
  // the pedal arm: from the pivot down, swung forward (to the right) by ang
  const rad = (ang * Math.PI) / 180;
  const ax = PX + Math.sin(rad) * ARM;
  const ay = PY + Math.cos(rad) * ARM;
  // the pad: a short thick bar across the arm's end
  const ux = Math.cos(rad);
  const uy = -Math.sin(rad);
  // the flow meter: full and breathing while it sprays, empty after the cut
  const flow = spray * (0.78 + 0.08 * Math.sin(frame / 3.1)) * line;

  return (
    <PictureBand>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${push})`, transformOrigin: `540px ${L.contentMid}px`}}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          {/* the gate: three slots and the neutral bar, drawn as a channel */}
          {GX.map((x, i) => (
            <line key={i} x1={x} y1={GTOP} x2={x} y2={GBOT} stroke={C.ink} strokeWidth={30} strokeLinecap="round" opacity={draw * 0.9} />
          ))}
          <line x1={GX[0]} y1={GMID} x2={GX[2]} y2={GMID} stroke={C.ink} strokeWidth={30} strokeLinecap="round" opacity={draw * 0.9} />
          {GX.map((x, i) => (
            <line key={`i${i}`} x1={x} y1={GTOP} x2={x} y2={GBOT} stroke={C.bg} strokeWidth={25} strokeLinecap="round" opacity={draw} />
          ))}
          <line x1={GX[0]} y1={GMID} x2={GX[2]} y2={GMID} stroke={C.bg} strokeWidth={25} strokeLinecap="round" opacity={draw} />
          {/* the knob's path, then the knob */}
          {frame >= shiftF ? <line x1={GX[1]} y1={GMID} x2={GX[1]} y2={knobY} stroke={rgba(toneBig(tone), 0.5)} strokeWidth={4} strokeLinecap="round" /> : null}
          <circle cx={GX[1]} cy={knobY} r={52 + 12 * shift * (1 - shift)} fill="none" stroke={rgba(knobCol, 0.4)} strokeWidth={2} opacity={draw} />
          <circle cx={GX[1]} cy={knobY} r={34} fill={knobCol} opacity={draw} />

          {/* the pedal: its bracket, the pivot, the arm and the pad, the floor */}
          <line x1={PX - 60} y1={PY} x2={PX + 60} y2={PY} stroke={C.ink} strokeWidth={2.4} strokeLinecap="round" opacity={draw} />
          <circle cx={PX} cy={PY} r={10} fill={C.bg} stroke={C.ink} strokeWidth={2.4} opacity={draw} />
          <line x1={PX} y1={PY} x2={ax} y2={ay} stroke={C.ink} strokeWidth={3} strokeLinecap="round" opacity={draw} />
          <line x1={ax - ux * 8} y1={ay - uy * 8} x2={ax + ux * 50} y2={ay + uy * 50} stroke={C.ink} strokeWidth={14} strokeLinecap="round" opacity={draw} />
          <line x1={PX - 90} y1={PY + ARM + 70} x2={PX + 170} y2={PY + ARM - 20} stroke={C.rule} strokeWidth={2} opacity={draw} />
          {frame >= pedalF ? (
            <path
              d={`M ${ax + 110} ${ay + 30} l 0 -64 m -18 20 l 18 -20 l 18 20`}
              fill="none"
              stroke={toneBig(tone)}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={lift * (1 - prog(frame, pedalF + 34, 14))}
            />
          ) : null}

          {/* the fuel line into the injector */}
          <path d={`M 140 ${ITOP - 22} H ${IX} V ${ITOP}`} fill="none" stroke={C.rule} strokeWidth={8} strokeLinejoin="round" opacity={draw} />
          <path
            d={`M 140 ${ITOP - 22} H ${IX} V ${ITOP}`}
            fill="none"
            stroke={C.ink}
            strokeWidth={3}
            strokeDasharray="14 12"
            strokeDashoffset={-frame * 2.4}
            strokeLinejoin="round"
            opacity={line * spray}
          />
          {/* the injector body: a barrel with its connector, a taper, the nozzle */}
          <rect x={IX + 40} y={ITOP + 30} width={36} height={40} rx={6} fill={C.surface} stroke={C.ink} strokeWidth={2.2} opacity={draw} />
          <path
            d={`M ${IX - 44} ${ITOP} H ${IX + 44} V ${ITOP + 140} L ${IX + 16} ${ITOP + 200} V ${ITIP - 8} Q ${IX} ${ITIP + 6} ${IX - 16} ${ITIP - 8} V ${ITOP + 200} L ${IX - 44} ${ITOP + 140} Z`}
            fill={C.surface}
            stroke={C.ink}
            strokeWidth={2.6}
            strokeLinejoin="round"
            opacity={draw}
          />
          {[44, 92].map((dy) => (
            <line key={dy} x1={IX - 44} y1={ITOP + dy} x2={IX + 44} y2={ITOP + dy} stroke={C.ink} strokeWidth={1.6} opacity={draw * 0.55} />
          ))}
          {/* the spray cone guide and the drops */}
          <path d={`M ${IX} ${ITIP + 8} L ${IX - 104} ${ITIP + SPRAY + 10} M ${IX} ${ITIP + 8} L ${IX + 104} ${ITIP + SPRAY + 10}`} stroke={rgba(C.ink, 0.2)} strokeWidth={1.5} strokeDasharray="4 8" opacity={spray * draw} />
          {drops}
          {/* the ring around the stopped tip */}
          {frame >= landF ? <circle cx={IX} cy={ITIP} r={22 + 44 * land} fill="none" stroke={toneBig(tone)} strokeWidth={2.2} opacity={1 - land * 0.7} /> : null}

          {/* the flow meter: a hairline track and its fill */}
          <rect x={MX - 120} y={968} width={240} height={14} rx={7} fill="none" stroke={C.rule} strokeWidth={1.6} opacity={draw} />
          <rect x={MX - 120} y={968} width={240 * flow} height={14} rx={7} fill={C.ink} opacity={draw} />
        </svg>

        {/* labels */}
        {gearLabels.map(([s, x, y]) => (
          <div key={s} className={TXT} style={{position: 'absolute', left: x - 30, width: 60, top: y - 22, textAlign: 'center', fontFamily: F.sans, fontWeight: 600, fontSize: 40, color: s === '3' && inGear ? toneText(tone) : C.ink2, opacity: draw}}>
            {s}
          </div>
        ))}
        <div className={TXT} style={{position: 'absolute', left: GX[1] + 40, top: GMID - 76, fontFamily: F.sans, fontWeight: 600, fontSize: 36, color: C.ink, opacity: draw * (1 - shift)}}>
          N
        </div>
        <div className={TXT} style={{position: 'absolute', left: PX - 100, width: 300, top: PY + ARM + 84, textAlign: 'center', font: labFont, color: C.ink2, opacity: draw}}>
          {pedal}
        </div>
        <div className={TXT} style={{position: 'absolute', left: IX + 90, top: ITOP + 34, font: labFont, color: C.ink2, opacity: draw}}>
          {engine}
        </div>
        <div className={TXT} style={{position: 'absolute', left: MX - 150, width: 300, top: 912, textAlign: 'center', font: labFont, color: C.ink2, opacity: draw}}>
          {fuel}
        </div>
        <div
          className={TXT}
          style={{
            position: 'absolute',
            left: MX - 130,
            width: 260,
            top: 1000,
            textAlign: 'center',
            fontFamily: F.sans,
            fontWeight: 600,
            fontSize: 210,
            lineHeight: 1,
            color: toneBig(tone),
            opacity: land,
            transform: `translateY(${(1 - land) * 24}px) scale(${0.9 + 0.1 * land})`,
          }}
        >
          0
        </div>
        <div className={TXT} style={{position: 'absolute', left: MX - 125, width: 250, top: 1222, textAlign: 'center', fontFamily: F.sans, fontWeight: 500, fontSize: hedgeSize, color: C.ink2, opacity: land}}>
          {hedge}
        </div>
      </div>
      {p.source ? <SourceLine text={p.source} at={landF + 6} y={1300} /> : null}
      <Sfx name="asmr-pencil" at={base + 2} volume={0.35} />
      <Sfx name="asmr-tick-fine" at={lineF} volume={0.3} />
      <Sfx name="asmr-knock" at={shiftF} volume={0.45} />
      <Haptic kind="light" at={shiftF + 4} />
      <Sfx name="asmr-slide" at={pedalF} volume={0.3} />
      <Sfx name="asmr-air" at={cutF} volume={0.3} />
      <Land at={landF} />
    </PictureBand>
  );
};
