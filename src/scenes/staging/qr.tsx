// QRCard's other stagings (the default "windshield" lives in QRCard.tsx). Each is its own camera and idea, in the
// house style: hairline ink on the clean field, colour only for data (the green of a code read), text in the
// text layer (TXT) through mtav(), pictures cut by hard edges, nothing important right of stage x 850 below 1080.
//   street   a passer-by's phone rises into the foreground at a low angle, the windshield looming above it; the
//            camera view finds the card, locks, reads it, and the phone turns to the viewer with the page
//   night    the windshield in the dark: a phone torch sweeps the glass and finds the card, the code is read in
//            its circle of light, the three reasons light up under it
//   topdown  the parked car from above, the card a glowing tag on the dash; a passer-by walks the pavement,
//            stops, scans it, and the tag answers with rings
// Props as QRCard (scanAt, reasons, caption); noPlate is the windshield's own.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {ease, lerp, prog, spr} from '../../lib/anim';
import {capsLatin, mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import {textWidth} from '../../lib/measure';
import {C, F, halo, isLight, L, rgba} from '../../tokens';
import type {SceneCtx} from '../../types';
import {cueFrame, entrance, Haptic, lead, Sfx, vary} from '../common';
import {ICONS, MODULES, QN, REASONS} from './qrParts';

type P = {caption?: string; scanAt?: number; reasons?: string[]; staging?: string};
type S = React.FC<{p: P; ctx: SceneCtx}>;

/** The QR-like pattern as SVG squares, `size` px wide, drawing on from `from` in a diagonal wipe. */
const Code: React.FC<{x: number; y: number; size: number; frame: number; from: number; op?: number}> = ({x, y, size, frame, from, op = 0.9}) => {
  const m = size / QN;
  return (
    <g>
      {MODULES.map(([r, c]) => (
        <rect key={`${r}-${c}`} x={x + c * m + 0.3} y={y + r * m + 0.3} width={m - 0.6} height={m - 0.6} fill={C.ink} opacity={op * prog(frame, from + (r + c) * 0.22, 4)} />
      ))}
    </g>
  );
};

/** The card standing behind the glass: a white (or dark) A4 with a headline bar, the code and the mark's bar. */
const Card: React.FC<{x: number; y: number; w: number; frame: number; from: number}> = ({x, y, w, frame, from}) => {
  const h = w * 1.414;
  const qs = w * 0.64;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={w * 0.02} fill={C.surface} stroke={C.ink} strokeOpacity={isLight() ? 0.3 : 0.5} strokeWidth={1.5} />
      <rect x={x + w * 0.18} y={y + h * 0.08} width={w * 0.64} height={Math.max(3, w * 0.05)} rx={2} fill={C.ink} opacity={0.85} />
      <rect x={x + w * 0.28} y={y + h * 0.08 + w * 0.08} width={w * 0.44} height={Math.max(2, w * 0.035)} rx={2} fill={C.ink} opacity={0.5} />
      <Code x={x + (w - qs) / 2} y={y + h * 0.28} size={qs} frame={frame} from={from} />
      <rect x={x + w * 0.36} y={y + h * 0.9} width={w * 0.28} height={Math.max(2, w * 0.03)} rx={2} fill={C.ink} opacity={0.45} />
    </g>
  );
};

/** Viewfinder brackets around a square of side `vf` centred on (0, 0). */
const Brackets: React.FC<{vf: number; arm: number; scale: number; op: number; flash: number}> = ({vf, arm, scale, op, flash}) => (
  <g opacity={op} transform={`scale(${scale})`} fill="none" stroke={C.ink} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round">
    {[
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ].map(([sx, sy], i) => (
      <path key={i} d={`M ${(sx * vf) / 2} ${(sy * vf) / 2 - sy * arm} L ${(sx * vf) / 2} ${(sy * vf) / 2} L ${(sx * vf) / 2 - sx * arm} ${(sy * vf) / 2}`} />
    ))}
    <rect x={-vf / 2} y={-vf / 2} width={vf} height={vf} fill={C.ink} stroke="none" opacity={0.14 * flash} />
  </g>
);

/** The three reasons as the page shows them (icon + words), `w` wide, rows rising from `from`. */
const Reasons: React.FC<{reasons: string[]; w: number; fs: number; frame: number; from: number; pad?: number}> = ({reasons, w, fs, frame, from, pad = 20}) => {
  const shown = reasons.map((r) => mtav(r));
  const room = w - 2 * pad - 40 - 18;
  const size = Math.min(fs, Math.floor((fs * room) / Math.max(1, ...shown.map((r) => textWidth(r, `500 ${fs}px ${F.sans}`)))));
  return (
    <>
      {shown.map((r, i) => {
        const s = spr(frame, from + i * 5);
        return (
          <div
            key={i}
            style={{
              margin: '0 0 14px',
              padding: `${Math.round(size * 0.8)}px ${pad}px`,
              borderRadius: 24,
              border: `1.5px solid ${rgba(C.ink, isLight() ? 0.14 : 0.22)}`,
              background: isLight() ? C.surface : rgba(C.ink, 0.04),
              display: 'flex',
              alignItems: 'center',
              gap: 18,
              opacity: s,
              transform: `translateY(${(1 - s) * 22}px)`,
            }}
          >
            <svg width={40} height={40} viewBox="0 0 24 24" style={{flex: 'none'}} fill="none" stroke={C.ink} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
              {(ICONS[i] ?? ICONS[2]).map((d, k) => (
                <path key={k} d={d} />
              ))}
            </svg>
            <div className={TXT} style={{fontFamily: F.sans, fontWeight: 500, fontSize: size, lineHeight: 1.2, color: C.ink, whiteSpace: 'nowrap'}}>
              {r}
            </div>
          </div>
        );
      })}
    </>
  );
};

const Caption: React.FC<{text?: string; frame: number; at: number}> = ({text, frame, at}) =>
  text ? (
    <div className={TXT} style={{position: 'absolute', top: L.contentBottom + 20 - 32, left: 1080 - L.lowRight, right: 1080 - L.lowRight, textAlign: 'center', fontFamily: F.mono, fontSize: 25, letterSpacing: '0.05em', color: C.ink3, whiteSpace: 'nowrap', opacity: prog(frame, at, 12)}}>
      {mtav(capsLatin(text))}
    </div>
  ) : null;

/** The scan's sounds: lock, read, and (optionally) the page opening with its three rows. */
const ScanSounds: React.FC<{slide?: number; lock: number; ok: number; open?: number; rows?: number[]}> = ({slide, lock, ok, open, rows = []}) => (
  <>
    {slide !== undefined ? <Sfx name="asmr-slide" at={slide} volume={0.44} /* event: the phone comes up */ /> : null}
    <Sfx name="asmr-tick-fine" at={lock} volume={0.36} /* event: the viewfinder locks on */ />
    <Haptic kind="rigid" at={lock} />
    <Sfx name="asmr-camera" at={ok} volume={0.5} /* event: the code is read */ />
    <Haptic kind="light" at={ok} volume={0.36} />
    {open !== undefined ? <Sfx name="asmr-screen" at={open} volume={0.42} /* event: the page opens */ /> : null}
    {rows.map((a, i) => (
      <React.Fragment key={i}>
        <Sfx name="asmr-ui-tick-soft" at={a} volume={0.4 * vary(i, 0.2)} /* event: a reason row appears */ />
        <Haptic kind="selection" at={a} volume={0.26 * vary(i + 7, 0.2)} />
      </React.Fragment>
    ))}
  </>
);

// ---- street: the low angle ----------------------------------------------------------------------------------
// The windshield seen from the pavement, looming; the card stands on the dash at its lower left. The passer-by's
// phone rises into the foreground, its camera view finds the card, locks and reads it; the phone then turns to
// face the viewer with the page. The phone is cut by the pictures' hard foot (L.graphicsBottom).
const GLASS_S = 'M 262 430 L 818 430 Q 842 430 850 452 L 1004 918 Q 1010 940 986 940 L 94 940 Q 70 940 76 918 L 230 452 Q 238 430 262 430 Z';
const Street: S = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const base = lead(ctx);
  const e = entrance(ctx);
  const reasons = (p.reasons?.length ? p.reasons : REASONS).slice(0, 3);
  const edge = prog(frame, e, 22, ease.drawOn);
  const cardIn = spr(frame, e + 4, 'enterXL');
  const scan = Math.max(base + 18, p.scanAt !== undefined ? cueFrame(ctx, p.scanAt) : base + 26);
  const rise = spr(frame, scan - 8, 'enterXL');
  const lockAt = scan + 14;
  const lockS = spr(frame, lockAt, 'land');
  const sweep = frame >= lockAt + 2 && frame <= lockAt + 20 ? (frame - lockAt - 2) / 18 : -1;
  const okAt = lockAt + 20;
  const flash = frame >= okAt ? Math.max(0, 1 - (frame - okAt) / 12) : 0;
  const openAt = okAt + 8;
  const turn = spr(frame, openAt, 'enterXL');
  const rowAt = (i: number) => openAt + 14 + i * 5;
  // the whole street drifts up slowly (the passer-by lifts their eyes), and steps back when the page opens
  const life = Math.min(1, Math.max(0, frame / Math.max(1, ctx.dur)));
  const drift = -18 * ease.camera(life);
  const soft = Math.min(1, turn);
  // the phone: 500 x 1030, low and tilted towards the card, then turned to the viewer
  const PWd = 500;
  const PHd = 1030;
  const pcx = lerp(600, 540, soft);
  const pcy = lerp(975, 900, soft) + (1 - rise) * 640;
  const rotZ = lerp(-8, -1.5, soft);
  const rotX = lerp(16, 3, soft);
  const sc = lerp(1, 1.06, soft);
  // the camera view: the card, big, shaking gently in the hand until it locks
  const shake = (1 - Math.min(1, lockS)) * (1 - soft);
  const jx = shake * (14 * Math.sin(frame / 5.3) + 6 * Math.sin(frame / 2.1));
  const jy = shake * (10 * Math.sin(frame / 4.1 + 1) + 5 * Math.sin(frame / 1.7));
  const sw = PWd - 20;
  const sh = PHd - 20;
  const vf = 250;
  const cw = 300; // the card in the camera view
  return (
    <>
      <div style={{position: 'absolute', inset: 0, clipPath: `inset(${L.graphicsTop}px 0 ${1920 - (p.caption ? L.contentBottom + 20 - 32 - 34 : L.graphicsBottom)}px 0)`}}>
        {/* the car, from the pavement: roof edge, the glass, wipers, the bonnet's edge */}
        <div style={{position: 'absolute', inset: 0, transform: `translateY(${drift}px) scale(${1 - 0.03 * soft})`, transformOrigin: '50% 40%', opacity: 1 - 0.55 * soft, filter: soft > 0.02 ? `blur(${3 * soft}px)` : undefined}}>
          <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
            <defs>
              <clipPath id={`qsGlass${ctx.index}`}>
                <path d={GLASS_S} />
              </clipPath>
              <linearGradient id={`qsRefl${ctx.index}`} x1="0" x2="1" y1="0" y2="0">
                <stop offset="0" stopColor={C.ink} stopOpacity={0} />
                <stop offset="0.5" stopColor={C.ink} stopOpacity={0.08} />
                <stop offset="1" stopColor={C.ink} stopOpacity={0} />
              </linearGradient>
            </defs>
            <path d="M 300 392 Q 540 372 780 392" fill="none" stroke={C.ink} strokeOpacity={0.5 * edge} strokeWidth={2} />
            <g opacity={cardIn} transform={`translate(0 ${(1 - cardIn) * 20})`}>
              <Card x={150} y={676} w={168} frame={frame} from={e + 6} />
            </g>
            <g clipPath={`url(#qsGlass${ctx.index})`} opacity={edge}>
              {[
                [300, 110],
                [470, 40],
                [860, 160],
              ].map(([x, w], i) => (
                <rect key={i} x={x + frame * 0.9} y={200} width={w} height={1000} fill={`url(#qsRefl${ctx.index})`} transform={`rotate(-16 ${x + frame * 0.9 + w / 2} 700)`} />
              ))}
            </g>
            <g fill={C.ink} opacity={0.3 * edge}>
              {Array.from({length: 46}, (_, i) => (
                <circle key={i} cx={282 + i * 11.4} cy={446} r={1.8} />
              ))}
            </g>
            <path d={GLASS_S} fill="none" stroke={C.ink} strokeOpacity={0.9} strokeWidth={2.4} strokeDasharray={3000} strokeDashoffset={3000 * (1 - edge)} strokeLinejoin="round" />
            <path d="M 116 912 L 246 470 L 834 470 L 964 912" fill="none" stroke={C.ink} strokeOpacity={0.3 * edge} strokeWidth={1.2} />
            <path d="M 300 934 L 520 896 M 610 934 L 830 896" stroke={C.ink} strokeOpacity={0.7 * edge} strokeWidth={4} strokeLinecap="round" />
            <path d="M 20 1010 Q 540 968 1060 1010" fill="none" stroke={C.ink} strokeOpacity={0.55 * edge} strokeWidth={2} />
            <path d="M 60 1110 Q 540 1070 1020 1110" fill="none" stroke={C.ink} strokeOpacity={0.22 * edge} strokeWidth={1.4} />
          </svg>
        </div>

        {/* the passer-by's phone */}
        {frame >= scan - 8 ? (
          <div
            style={{
              position: 'absolute',
              left: pcx - PWd / 2,
              top: pcy - PHd / 2,
              width: PWd,
              height: PHd,
              transform: `perspective(1500px) rotateX(${rotX}deg) rotateZ(${rotZ}deg) scale(${sc})`,
              transformOrigin: '50% 60%',
            }}
          >
            <div style={{position: 'absolute', left: 10, top: 10, width: sw, height: sh, borderRadius: 62, overflow: 'hidden', background: soft > 0.3 ? C.screen : 'transparent'}}>
              {/* camera view: the card enlarged, the glass's edge behind it, dimmed around the finder */}
              <svg width={sw} height={sh} style={{position: 'absolute', inset: 0, opacity: 1 - Math.min(1, soft * 1.6)}}>
                <rect x={0} y={0} width={sw} height={sh} fill={C.bg} />
                <g transform={`translate(${jx} ${jy})`}>
                  <path d={`M ${sw * 0.02} ${sh * 0.95} L ${sw * 0.2} ${sh * 0.08}`} stroke={C.ink} strokeOpacity={0.55} strokeWidth={2.4} />
                  <Card x={(sw - cw) / 2} y={sh / 2 - cw * 1.414 * 0.28 - cw * 0.32} w={cw} frame={frame} from={scan - 8} />
                </g>
                <path
                  d={`M 0 0 H ${sw} V ${sh} H 0 Z M ${sw / 2 - vf / 2} ${sh / 2 - vf / 2} v ${vf} h ${vf} v ${-vf} Z`}
                  fill={C.shade}
                  fillRule="evenodd"
                  opacity={isLight() ? 0.08 : 0.5}
                />
                <g transform={`translate(${sw / 2} ${sh / 2})`}>
                  <Brackets vf={vf} arm={40} scale={1 + 0.18 * (1 - Math.min(1, lockS))} op={1} flash={flash} />
                  {sweep >= 0 ? (
                    <line x1={-vf / 2 + 12} x2={vf / 2 - 12} y1={-vf / 2 + 14 + (sweep < 0.5 ? sweep * 2 : 2 - sweep * 2) * (vf - 28)} y2={-vf / 2 + 14 + (sweep < 0.5 ? sweep * 2 : 2 - sweep * 2) * (vf - 28)} stroke={C.ink} strokeWidth={2} />
                  ) : null}
                </g>
              </svg>
              {/* the page */}
              {soft > 0.3 ? (
                <div style={{position: 'absolute', inset: 0, padding: '64px 24px 0', opacity: prog(frame, openAt + 6, 10)}}>
                  <div style={{margin: '0 auto', width: 190, height: 40, borderRadius: 20, background: rgba(C.ink, 0.07), display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.mono, fontSize: 20, letterSpacing: '0.04em', color: C.ink2}}>
                    <span className={TXT}>vinari.ge</span>
                  </div>
                  <div className={TXT} style={{margin: '30px 8px 22px', fontFamily: F.sans, fontWeight: 600, fontSize: 46, lineHeight: 1.1, color: C.ink}}>
                    {mtav('რა ხდება?')}
                  </div>
                  <Reasons reasons={reasons} w={sw - 48} fs={27} frame={frame} from={rowAt(0)} pad={18} />
                </div>
              ) : null}
            </div>
            <svg width={PWd} height={PHd} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
              <rect x={0} y={0} width={PWd} height={PHd} rx={72} fill="none" stroke={C.ink} strokeOpacity={0.92} strokeWidth={2.2} />
              <rect x={PWd / 2 - 54} y={26} width={108} height={32} rx={16} fill={C.island} stroke={C.ink} strokeOpacity={0.25} strokeWidth={1.2} />
            </svg>
          </div>
        ) : null}
      </div>
      <Caption text={p.caption} frame={frame} at={base + 26} />
      <Sfx name="asmr-paper" at={base + 4} volume={0.36} /* event: the card settles behind the glass */ />
      <ScanSounds slide={Math.max(0, scan - 8)} lock={lockAt} ok={okAt} open={openAt} rows={reasons.map((_, i) => rowAt(i))} />
    </>
  );
};

// ---- night: the torch -----------------------------------------------------------------------------------------
// The windshield in the dark, close: the glass, its frit and the card are all but gone. A phone torch sweeps the
// glass from below and settles on the card: inside its circle everything is drawn in full, outside it a ghost.
// The finder locks in the light, reads the code, and the three reasons light up under the card.
const NGLASS = 'M 300 330 L 160 940 Q 154 964 184 964 L 1120 964 L 1120 330 Z';
const Night: S = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const base = lead(ctx);
  const e = entrance(ctx);
  const reasons = (p.reasons?.length ? p.reasons : REASONS).slice(0, 3);
  const scan = Math.max(base + 30, p.scanAt !== undefined ? cueFrame(ctx, p.scanAt) : base + 34);
  // the card (340 wide) and its code's centre
  const cw = 340;
  const cx = 540 - cw / 2;
  const cy = 440;
  const qc = {x: 540, y: cy + cw * 1.414 * 0.28 + (cw * 0.64) / 2};
  // the torch: comes up from the lower left, overshoots, settles on the code, a hand's tremor on top
  const find = spr(frame, e + 2, 'enterXL');
  const bx = lerp(170, qc.x, find) + 6 * Math.sin(frame / 7.1) + 3 * Math.sin(frame / 2.9);
  const by = lerp(1260, qc.y, find) + 5 * Math.sin(frame / 6.3 + 2);
  const br = lerp(170, 300, find);
  const ghost = isLight() ? 0.2 : 0.14;
  const lockAt = scan;
  const lockS = spr(frame, lockAt, 'land');
  const lockIn = prog(frame, lockAt - 4, 6);
  const sweep = frame >= lockAt + 4 && frame <= lockAt + 24 ? (frame - lockAt - 4) / 20 : -1;
  const okAt = lockAt + 24;
  const flash = frame >= okAt ? Math.max(0, 1 - (frame - okAt) / 12) : 0;
  const rowsAt = okAt + 10;
  const rowAt = (i: number) => rowsAt + i * 5;
  const done = spr(frame, okAt, 'land');
  const world = (
    <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
      <Card x={cx} y={cy} w={cw} frame={frame} from={e} />
      <g fill={C.ink} opacity={0.4}>
        {Array.from({length: 70}, (_, i) => (
          <circle key={`b${i}`} cx={206 + i * 13} cy={952} r={2} />
        ))}
        {Array.from({length: 56}, (_, i) => {
          const t = i / 56;
          return <circle key={`a${i}`} cx={lerp(312, 176, t)} cy={lerp(338, 928, t)} r={1.9} />;
        })}
      </g>
      <path d={NGLASS} fill="none" stroke={C.ink} strokeOpacity={0.9} strokeWidth={2.4} strokeLinejoin="round" />
      <path d="M 334 340 L 198 928 Q 194 940 210 940 L 1120 940" fill="none" stroke={C.ink} strokeOpacity={0.35} strokeWidth={1.2} />
    </svg>
  );
  const mask = `radial-gradient(circle ${br}px at ${bx}px ${by}px, #000 0%, #000 62%, rgba(0,0,0,0.35) 82%, transparent 100%)`;
  return (
    <>
      <div style={{position: 'absolute', inset: 0, clipPath: `inset(${L.graphicsTop}px 0 ${1920 - L.graphicsBottom}px 0)`}}>
        {/* the ghost of the glass in the dark, then the same world lit inside the torch's circle */}
        <div style={{position: 'absolute', inset: 0, opacity: ghost * prog(frame, e, 12)}}>{world}</div>
        <div style={{position: 'absolute', inset: 0, background: `radial-gradient(circle ${br * 1.25}px at ${bx}px ${by}px, ${rgba(isLight() ? C.shade : C.ink, isLight() ? 0.05 : 0.09)} 0%, transparent 100%)`}} />
        <div style={{position: 'absolute', inset: 0, WebkitMaskImage: mask, maskImage: mask, opacity: prog(frame, e, 8)}}>{world}</div>
        {/* the finder locks inside the light */}
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <g transform={`translate(${qc.x} ${qc.y})`} opacity={lockIn * (1 - 0.6 * done)}>
            <Brackets vf={cw * 0.64 + 60} arm={42} scale={1 + 0.2 * (1 - Math.min(1, lockS))} op={1} flash={flash} />
            {sweep >= 0 ? <line x1={-cw * 0.32 - 10} x2={cw * 0.32 + 10} y1={-cw * 0.32 + (sweep < 0.5 ? sweep * 2 : 2 - sweep * 2) * cw * 0.64} y2={-cw * 0.32 + (sweep < 0.5 ? sweep * 2 : 2 - sweep * 2) * cw * 0.64} stroke={C.ink} strokeWidth={2} /> : null}
          </g>
          {frame >= okAt ? <circle cx={qc.x} cy={qc.y} r={cw * 0.45 + 90 * ease.enter(Math.min(1, (frame - okAt) / 24))} fill="none" stroke={C.upLine} strokeWidth={3} opacity={0.7 * Math.max(0, 1 - (frame - okAt) / 24)} style={{filter: `drop-shadow(0 0 8px ${halo(C.upLine, 0.6)})`}} /> : null}
        </svg>
      </div>
      {/* the page's three reasons, lit under the card (they end at stage 1300, left of the like column) */}
      <div style={{position: 'absolute', left: 250, width: 580, top: 1300 - 3 * 96 + 14, opacity: frame >= rowsAt - 2 ? 1 : 0}}>
        <Reasons reasons={reasons} w={580} fs={30} frame={frame} from={rowsAt} />
      </div>
      <Sfx name="asmr-swell" at={Math.max(0, base + 2)} volume={0.2} /* event: the torch comes on and sweeps */ />
      <ScanSounds lock={lockAt} ok={okAt} rows={reasons.map((_, i) => rowAt(i))} />
    </>
  );
};

// ---- topdown: the tag ---------------------------------------------------------------------------------------------
// The parked car from straight above, its nose up, on a street with the pavement at the left; the card is a glowing
// tag on the dash. A passer-by (a map marker with a heading) walks down the pavement, stops beside the windscreen and
// turns; a scan wedge reaches the tag, the finder locks on it, and the tag answers with green rings. The camera turns
// a few degrees over the scene.
const CAR = 'M -118 -262 Q -118 -318 -60 -326 L 60 -326 Q 118 -318 118 -262 L 124 250 Q 124 318 60 322 L -60 322 Q -124 318 -124 250 Z';
const Topdown: S = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const base = lead(ctx);
  const e = entrance(ctx);
  const scan = Math.max(base + 30, p.scanAt !== undefined ? cueFrame(ctx, p.scanAt) : base + 36);
  const life = Math.min(1, Math.max(0, frame / Math.max(1, ctx.dur)));
  const turn = lerp(-7, -2, ease.camera(life));
  const zoom = 1.04 - 0.04 * prog(frame, e, 30, ease.enter) + 0.03 * ease.camera(life);
  const draw = prog(frame, e, 22, ease.drawOn);
  const CX0 = 600;
  const CY0 = 830;
  const K = 1.3; // the car's scale: it fills the content box's height
  const tag = {x: CX0, y: CY0 - 150 * K};
  // the walker: down the pavement (x 250) to beside the windscreen, arriving just before the scan
  const walkStart = Math.max(e, scan - 46);
  const w = prog(frame, walkStart, 40, ease.enter);
  const wx = 250;
  const wy = lerp(400, tag.y + 10, w);
  const face = lerp(0, -90, prog(frame, scan - 8, 10)); // degrees: 0 = walking down, -90 = facing the car
  const step = w < 1 ? Math.sin(frame / 2.4) * 3 : 0;
  const lockAt = scan + 10;
  const lockS = spr(frame, lockAt, 'land');
  const okAt = lockAt + 16;
  const cone = prog(frame, scan, 10);
  const rings = frame >= okAt ? [0, 1, 2].map((k) => ((frame - okAt + k * 16) % 48) / 48) : [];
  const glow = 0.55 + 0.45 * Math.sin(frame / 9);
  const sDash = (len: number) => ({strokeDasharray: len, strokeDashoffset: len * (1 - draw)});
  return (
    <>
      <div style={{position: 'absolute', inset: 0, clipPath: `inset(${L.graphicsTop}px 0 ${1920 - L.graphicsBottom}px 0)`}}>
        <div style={{position: 'absolute', inset: 0, transform: `rotate(${turn}deg) scale(${zoom})`, transformOrigin: `${CX0}px ${CY0}px`}}>
          <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
            {/* the kerb, the pavement's slabs, the parking lane and the neighbours */}
            <line x1={320} x2={320} y1={-200} y2={2000} stroke={C.ink} strokeWidth={2.4} opacity={0.7} {...sDash(2200)} />
            <line x1={170} x2={170} y1={-200} y2={2000} stroke={C.ink} strokeWidth={1.2} opacity={0.3} />
            {Array.from({length: 22}, (_, i) => (
              <line key={`s${i}`} x1={170} x2={320} y1={-120 + i * 110} y2={-120 + i * 110} stroke={C.ink} strokeWidth={1} opacity={0.18 * draw} />
            ))}
            {[CY0 - 490, CY0 + 490].map((y, i) => (
              <line key={`b${i}`} x1={320} x2={440} y1={y} y2={y} stroke={C.ink} strokeWidth={2} opacity={0.4 * draw} />
            ))}
            <line x1={880} x2={880} y1={-200} y2={2000} stroke={C.ink} strokeWidth={2} strokeDasharray="30 34" opacity={0.3 * draw} />
            {[CY0 - 980, CY0 + 980].map((y, i) => (
              <path key={`n${i}`} d={CAR} transform={`translate(${CX0 - 6} ${y}) scale(${K})`} fill="none" stroke={C.ink} strokeWidth={2} opacity={0.3 * draw} />
            ))}
            {/* the car: body, bonnet creases, windscreen, roof, rear window, mirrors, wheels */}
            <g transform={`translate(${CX0} ${CY0}) scale(${K})`} fill="none" stroke={C.ink} strokeLinejoin="round">
              {[
                [-128, -230],
                [128, -230],
                [-132, 214],
                [132, 214],
              ].map(([x, y], i) => (
                <rect key={i} x={x - 10} y={y - 38} width={20} height={76} rx={6} strokeWidth={2} opacity={0.5 * draw} />
              ))}
              <path d={CAR} fill={C.bg} strokeWidth={2.8} opacity={0.95} {...sDash(1900)} />
              <path d="M -70 -300 Q -40 -250 -40 -200 M 70 -300 Q 40 -250 40 -200" strokeWidth={1.4} opacity={0.4 * draw} />
              <path d="M -100 -180 Q 0 -206 100 -180 L 90 -96 Q 0 -110 -90 -96 Z" strokeWidth={2.2} opacity={0.85 * draw} />
              <rect x={-90} y={-92} width={180} height={250} rx={26} strokeWidth={2} opacity={0.7 * draw} />
              <path d="M -88 170 Q 0 180 88 170 L 96 236 Q 0 252 -96 236 Z" strokeWidth={2} opacity={0.75 * draw} />
              <path d="M -118 -120 L -140 -128 L -138 -108 Z M 118 -120 L 140 -128 L 138 -108 Z" strokeWidth={2} opacity={0.8 * draw} />
            </g>
            {/* the tag on the dash: the card seen from above, glowing softly */}
            <g transform={`translate(${tag.x} ${tag.y})`} opacity={prog(frame, e + 8, 12)}>
              <rect x={-40} y={-26} width={80} height={52} rx={6} fill={C.surface} stroke={C.ink} strokeWidth={2} style={{filter: isLight() ? undefined : `drop-shadow(0 0 ${10 + 6 * glow}px ${rgba(C.ink, 0.45)})`}} />
              <Code x={-19} y={-19} size={38} frame={frame} from={e + 10} op={0.95} />
            </g>
            {/* the scan: a wedge from the walker to the tag, the finder, the rings */}
            <path d={`M ${wx + 18} ${wy} L ${tag.x - 40} ${tag.y - 36} L ${tag.x - 40} ${tag.y + 36} Z`} fill={C.ink} opacity={0.07 * cone * (frame < okAt + 20 ? 1 : 0.4)} />
            <path d={`M ${wx + 18} ${wy} L ${tag.x - 40} ${tag.y - 36} M ${wx + 18} ${wy} L ${tag.x - 40} ${tag.y + 36}`} stroke={C.ink} strokeWidth={1.2} strokeDasharray="4 8" opacity={0.6 * cone} />
            <g transform={`translate(${tag.x} ${tag.y})`} opacity={prog(frame, lockAt - 4, 6)}>
              <Brackets vf={124} arm={22} scale={1 + 0.3 * (1 - Math.min(1, lockS))} op={1} flash={0} />
            </g>
            {rings.map((t, k) => (
              <circle key={k} cx={tag.x} cy={tag.y} r={60 + 170 * ease.enter(t)} fill="none" stroke={C.upLine} strokeWidth={3} opacity={0.6 * (1 - t)} />
            ))}
            {/* the passer-by: a marker with a heading, a small step while walking */}
            <g transform={`translate(${wx + step * 0.3} ${wy}) rotate(${face})`} opacity={prog(frame, walkStart, 8)}>
              <path d="M 0 -44 L 22 -14 L -22 -14 Z" fill={C.ink} opacity={0.22} transform="scale(1 -1)" />
              <circle r={17} fill={C.ink} />
              <circle r={25} fill="none" stroke={C.ink} strokeWidth={1.5} opacity={0.4} />
            </g>
          </svg>
        </div>
      </div>
      <Caption text={p.caption} frame={frame} at={okAt + 10} />
      <Sfx name="asmr-pencil" at={Math.max(0, base)} volume={0.22} /* event: the street draws on */ />
      <ScanSounds lock={lockAt} ok={okAt} />
      <Sfx name="asmr-pop" at={okAt + 2} volume={0.36} /* event: the tag answers with its rings */ />
    </>
  );
};

export const QR_STAGES: Record<string, S> = {street: Street, night: Night, topdown: Topdown};
