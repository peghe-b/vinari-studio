// V45GlassNumber: a paper note with your phone number on the windshield. Passers-by copy it (a flash, a small copy
// flying to their phone, a thin line left behind), the camera pulls back on a whole web of strangers, then they
// call back: red pulses run down the lines into your phone, which buzzes. On `tearAt` the note tears off the glass,
// every line snaps and the web goes quiet.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, lead, PictureBand, Sfx} from '../common';
import {C, F, L, rgba, toneBig} from '../../tokens';
import {ease, lerp, prog, spr} from '../../lib/anim';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import type {SceneCtx} from '../../types';

type P = {
  copyAt?: number | string; // the first strangers copy the number
  moreAt?: number | string; // the camera pulls back, more copy it
  allAt?: number | string; // the last ones
  ringAt?: number | string; // they call back
  ring2At?: number | string; // everyone calls
  tearAt?: number | string; // the note tears off
  number?: string; // the note's text (masked)
  caller?: string; // the label under your phone while it rings
};

// the note on the glass (its centre) and your phone
const NX = 690;
const NY = 760;
const YX = 540;
const YY = 1120;
// strangers' phones: x, y, wave (0 = copyAt, 1 = moreAt, 2 = allAt)
const PH = [
  [200, 450, 0], [880, 450, 0], [170, 690, 0], [910, 690, 0],
  [380, 420, 1], [700, 420, 1], [190, 930, 1], [890, 930, 1],
  [240, 1170, 2], [820, 1170, 2], [380, 1270, 2], [700, 1270, 2],
];

export const V45GlassNumber: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const copy0 = Math.max(base + 10, cueFrame(ctx, p.copyAt ?? 1));
  const copy1 = Math.max(copy0 + 14, cueFrame(ctx, p.moreAt ?? 2));
  const copy2 = Math.max(copy1 + 12, cueFrame(ctx, p.allAt ?? 3));
  const ring0 = Math.max(copy2 + 16, cueFrame(ctx, p.ringAt ?? 4));
  const ring1 = Math.max(ring0 + 12, cueFrame(ctx, p.ring2At ?? 5));
  const tear = Math.max(ring1 + 12, cueFrame(ctx, p.tearAt ?? 6));
  const waves = [copy0, copy1, copy2];

  // camera: close on the note, pulls back as the web grows, a slow settle after the tear
  const pull = prog(frame, copy1 - 6, 40, ease.camera);
  const settle = prog(frame, tear, ctx.dur - (tear - 0), ease.camera);
  const sc = lerp(1.45, 1, pull) * lerp(1, 1.04, settle);
  const ox = lerp(NX, 540, pull);
  const oy = lerp(NY, L.contentMid, pull);

  const drawGlass = prog(frame, e, 24, ease.drawOn);
  const torn = prog(frame, tear, 22, ease.exit);
  const snap = prog(frame, tear, 10, ease.enter);
  const ringing = frame >= ring0 && frame < tear;
  const red = toneBig('down');

  // the note falls away (whole, fading out long before the band's edge)
  const noteRot = -4 + 38 * torn;
  const noteDy = 160 * torn * torn;
  const noteOp = 1 - prog(frame, tear + 4, 14, ease.exit);

  // your phone buzzes while strangers call
  const buzz = ringing ? Math.sin(frame * 2.4) * 4 * (frame >= ring1 ? 1.4 : 1) : 0;
  const callOp = frame < ring0 ? 0 : 1 - prog(frame, tear, 10, ease.exit);
  const callIn = spr(frame, ring0, 'land');

  const phones = PH.map((ph, i) => {
    const w = (ph[2] === 0 ? copy0 : ph[2] === 1 ? copy1 : copy2) + (i % 4) * 4;
    const t = prog(frame, w, 18, ease.camera);
    const on = spr(frame, w - 4, 'enter');
    return {x: ph[0], y: ph[1], w, t, on, calls: ph[2] === 0 ? ring0 + i * 3 : ring1 + i * 2};
  });

  return (
    <PictureBand>
      <div style={{position: 'absolute', inset: 0, transform: `translate(${540 - ox}px, ${L.contentMid - oy}px) scale(${sc})`, transformOrigin: `${ox}px ${oy}px`}}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
          {/* the windshield: glass outline, a reflection, the wiper, the dash */}
          <path d="M 250 560 Q 540 520 830 560 L 900 850 Q 540 875 180 850 Z" fill={rgba(C.ink, 0.03)} stroke={C.ink2} strokeWidth={2} strokeDasharray={1900} strokeDashoffset={1900 * (1 - drawGlass)} strokeLinejoin="round" />
          <path d="M 300 600 L 360 590 L 290 800 L 250 805 Z" fill={rgba(C.ink, 0.05)} opacity={drawGlass} />
          <path d="M 330 845 L 560 740" stroke={C.rule} strokeWidth={3} strokeLinecap="round" opacity={drawGlass} />
          <path d="M 170 868 Q 540 895 910 868" fill="none" stroke={C.rule} strokeWidth={1.6} opacity={drawGlass} />

          {/* the lines of copies, and the calls coming back */}
          {phones.map((ph, i) => {
            if (frame < ph.w) return null;
            const lx = lerp(NX, ph.x, ph.t);
            const ly = lerp(NY, ph.y, ph.t);
            const lineOp = (ringing ? 0.9 : 0.55) * (1 - snap);
            const pulses: React.ReactNode[] = [];
            if (ringing && frame >= ph.calls) {
              for (let k = 0; k < 2; k++) {
                const u = ((frame - ph.calls + k * 14) % 28) / 28;
                pulses.push(<circle key={k} cx={lerp(ph.x, YX, u)} cy={lerp(ph.y, YY - 60, u)} r={5} fill={red} opacity={Math.sin(u * Math.PI)} />);
              }
            }
            return (
              <g key={i}>
                <line x1={NX} y1={NY} x2={lx} y2={ly} stroke={C.ink2} strokeWidth={1.5} strokeDasharray="4 7" opacity={lineOp} />
                {ringing && frame >= ph.calls ? <line x1={ph.x} y1={ph.y} x2={YX} y2={YY - 60} stroke={red} strokeWidth={1.4} opacity={0.35} /> : null}
                {pulses}
                {/* the small copy in flight */}
                {ph.t < 1 ? <rect x={lx - 14} y={ly - 9} width={28} height={18} rx={3} fill={C.ink} opacity={0.9} /> : null}
              </g>
            );
          })}

          {/* strangers' phones */}
          {phones.map((ph, i) => {
            if (frame < ph.w - 4) return null;
            const flash = prog(frame, ph.w, 12, ease.exit);
            const got = ph.t >= 1;
            const shake = ringing && frame >= ph.calls ? Math.sin(frame * 3 + i) * 2 : 0;
            const dim = 1 - 0.55 * snap;
            return (
              <g key={i} transform={`translate(${ph.x + shake} ${ph.y}) scale(${0.6 + 0.4 * ph.on})`} opacity={Math.min(1, ph.on) * dim}>
                <rect x={-24} y={-42} width={48} height={84} rx={9} fill={C.bg} stroke={C.ink} strokeWidth={2} />
                <rect x={-8} y={-37} width={16} height={4} rx={2} fill={C.ink2} />
                {got ? <rect x={-15} y={-8} width={30} height={16} rx={3} fill={frame >= tear ? C.rule : C.ink} /> : null}
                {frame < ph.w + 12 ? <circle r={30 + 40 * flash} fill="none" stroke={C.ink} strokeWidth={2} opacity={1 - flash} /> : null}
              </g>
            );
          })}

          {/* your phone */}
          <g transform={`translate(${YX + buzz} ${YY})`} opacity={drawGlass}>
            <rect x={-52} y={-95} width={104} height={190} rx={18} fill={C.bg} stroke={C.ink} strokeWidth={2.4} />
            <rect x={-16} y={-86} width={32} height={8} rx={4} fill={C.ink2} />
            {callOp > 0 ? (
              <g opacity={callOp}>
                <circle cx={0} cy={-10} r={20 * callIn} fill="none" stroke={red} strokeWidth={2} />
                <circle cx={-26} cy={52} r={9} fill={red} />
                <circle cx={26} cy={52} r={9} fill={toneBig('up')} opacity={0.35} />
                {[0, 1].map((k) => {
                  const u = ((frame - ring0 + k * 12) % 24) / 24;
                  return <rect key={k} x={-52 - 18 * u} y={-95 - 18 * u} width={104 + 36 * u} height={190 + 36 * u} rx={18 + 10 * u} fill="none" stroke={red} strokeWidth={1.6} opacity={(1 - u) * 0.8} />;
                })}
              </g>
            ) : null}
          </g>
        </svg>

        {/* the note on the glass */}
        <div
          className={TXT}
          style={{
            position: 'absolute', left: NX - 100, top: NY - 42 + noteDy, width: 200, height: 84, borderRadius: 4,
            backgroundColor: C.ink, color: C.bg, fontFamily: F.mono, fontSize: 21, fontWeight: 600, whiteSpace: 'nowrap',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: `rotate(${noteRot}deg)`, opacity: noteOp * drawGlass,
          }}
        >
          {p.number ?? '5•• •• •• ••'}
        </div>

        {/* the caller label under your phone */}
        <div className={TXT} style={{position: 'absolute', left: YX - 200, width: 400, top: YY + 112, textAlign: 'center', fontFamily: F.mono, fontSize: 26, color: red, opacity: callOp * callIn}}>
          {mtav(p.caller ?? 'უცნობი ნომერი')}
        </div>
      </div>

      <Sfx name="asmr-pencil-short" at={base + 1} volume={0.35} />
      {waves.map((w, i) => (
        <React.Fragment key={i}>
          <Sfx name="asmr-camera" at={w} volume={0.4} />
          <Haptic kind="light" at={w} />
        </React.Fragment>
      ))}
      <Sfx name="asmr-air-long" at={copy1 - 6} volume={0.3} />
      <Sfx name="asmr-notif" at={ring0} volume={0.35} />
      <Sfx name="asmr-notif" at={ring1} volume={0.4} />
      <Haptic kind="warning" at={ring1} />
      <Sfx name="asmr-paper-tear" at={tear} volume={0.5} />
      <Haptic kind="medium" at={tear} />
    </PictureBand>
  );
};
