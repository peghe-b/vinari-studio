import React from 'react';
import {useCurrentFrame} from 'remotion';
import {ease, lerp, prog, rand, spr} from '../lib/anim';
import {capsLatin} from '../lib/format';
import {C, F, isLight, L, rgba} from '../tokens';
import type {SceneCtx} from '../types';
import {BrandMark, cueFrame, entrance, Haptic, lead, Sfx, vary} from './common';

type P = {
  caption?: string; // mono line at the bottom of the content zone
  scanAt?: number; // chunk where a passer-by's phone slides in and scans the card
  reasons?: string[]; // the three reasons a passer-by can choose (the real web page's wording by default)
  noPlate?: boolean; // show a crossed-out plate with "ნომერი არსად წერია"
};

// The real page a passer-by opens (web/c/index.html): heading, host, three reasons, same icons.
const REASONS = ['მანქანა გზას მიკეტავს', 'შუქები ანთია', 'მანქანასთან რაღაც ხდება'];
const ICONS = [
  ['M3 12h11', 'M10 8l4 4-4 4', 'M19 4v16'],
  ['M10 5.5a6.5 6.5 0 0 0 0 13z', 'M13.5 12h7M13.5 8.2l5.6-2.4M13.5 15.8l5.6 2.4'],
  ['M12 4.5 21 19.5H3z', 'M12 10v4', 'M12 17h.01'],
];

// Windshield corner seen from outside (px, 1080 x 1920)
const GLASS = 'M 352 300 L 178 932 Q 170 960 200 960 L 1120 960 L 1120 300 Z';
const EDGE = 'M 352 300 L 178 932 Q 170 960 200 960 L 1120 960';
const INNER = 'M 384 308 L 216 910 Q 210 930 232 930 L 1120 930';
// A4 card behind the glass, standing on the dash
const CW = 300;
const CH = Math.round(CW * 1.414);
const CX = 540 - CW / 2;
const CY = 500;
const QN = 25; // modules per side
const QS = 196;
const QX = 540 - QS / 2;
const QY = CY + 118;
const QC = {x: 540, y: QY + QS / 2};
const VF = 236; // viewfinder side

const finder = (r: number, c: number, r0: number, c0: number) => {
  const y = r - r0;
  const x = c - c0;
  if (y < 0 || y > 6 || x < 0 || x > 6) return null;
  return y === 0 || y === 6 || x === 0 || x === 6 || (y >= 2 && y <= 4 && x >= 2 && x <= 4);
};

/** A QR-like module pattern: finder eyes, timing lines, seeded noise. Not a real code. */
const MODULES: [number, number][] = (() => {
  const out: [number, number][] = [];
  for (let r = 0; r < QN; r++)
    for (let c = 0; c < QN; c++) {
      const f = finder(r, c, 0, 0) ?? finder(r, c, 0, QN - 7) ?? finder(r, c, QN - 7, 0);
      const nearFinder = (r < 8 && c < 8) || (r < 8 && c >= QN - 8) || (r >= QN - 8 && c < 8);
      let on: boolean;
      if (f !== null) on = f;
      else if (nearFinder) on = false;
      else if (r === 6 || c === 6) on = (r + c) % 2 === 0;
      else if (r >= 16 && r <= 20 && c >= 16 && c <= 20) on = r === 16 || r === 20 || c === 16 || c === 20 || (r === 18 && c === 18);
      else on = rand(r * 31.7 + c * 17.3 + 5) > 0.53;
      if (on) out.push([r, c]);
    }
  return out;
})();

// Hairline windshield corner with its dotted frit band and drifting reflections; an A4 card
// behind the glass (headline, QR-like pattern, mark). A passer-by's phone slides in, its
// viewfinder locks onto the code, a line scans it, and the phone comes forward, the glass
// going soft behind it, to open the page with the three reasons.
export const QRCard: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const base = lead(ctx);
  const reasons = (p.reasons?.length ? p.reasons : REASONS).slice(0, 3);

  // the windshield and the card enter before the cut, so the cut lands on them (sounds stay on base)
  const e = entrance(ctx);
  const edge = prog(frame, e, 20, ease.drawOn);
  const cardIn = spr(frame, e + 4, 'enterXL');
  const scan = Math.max(base + 22, p.scanAt !== undefined ? cueFrame(ctx, p.scanAt) : base + 30);
  const phoneIn = spr(frame, scan, 'enterXL');
  const lockS = spr(frame, scan + 12, 'land');
  const sweep = frame >= scan + 14 && frame <= scan + 34 ? (frame - scan - 14) / 20 : -1;
  const okAt = scan + 34;
  const flash = frame >= okAt ? Math.max(0, 1 - (frame - okAt) / 12) : 0;
  const openAt = scan + 40;
  const g = spr(frame, openAt, 'enterXL');
  const gl = Math.min(1, g);
  const rowAt = (i: number) => openAt + 14 + i * 5;

  // phone box: small over the code, then big in the middle; stroke stays a hairline
  const small = {w: 344, h: 700, cx: 540, cy: QC.y};
  const big = {w: 560, h: 1080, cx: 540, cy: 390 + 540};
  const float = 3 * Math.sin(frame / 28);
  const pw = lerp(small.w, big.w, gl);
  const ph = lerp(small.h, big.h, gl);
  const pcx = lerp(small.cx, big.cx, gl) + (1 - phoneIn) * 760;
  const pcy = lerp(small.cy, big.cy, gl) + float * gl;
  const rot = (1 - phoneIn) * 9; // tilted while it swings in, upright once it reads the code
  const pr = lerp(46, 80, gl);
  const px = pcx - pw / 2;
  const py = pcy - ph / 2;

  // reflections drift across the glass all the time
  const drift = frame * 1.1;
  const bgSoft = gl; // windshield steps back when the phone comes forward

  const plateAt = base + 16;
  const strike = prog(frame, plateAt + 12, 12, ease.drawOn);
  const plateY = 1000;

  return (
    <>
      {/* windshield + card, softened when the phone opens the page */}
      <div style={{position: 'absolute', inset: 0, opacity: 1 - 0.72 * bgSoft, filter: bgSoft > 0.02 ? `blur(${4 * bgSoft}px)` : undefined, transform: `scale(${1 - 0.03 * bgSoft})`, transformOrigin: '50% 45%'}}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, WebkitMaskImage: 'linear-gradient(to bottom, transparent 330px, #000 470px)'}}>
          <defs>
            <clipPath id={`qrGlass${ctx.index}`}>
              <path d={GLASS} />
            </clipPath>
            <linearGradient id={`qrRefl${ctx.index}`} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor={C.ink} stopOpacity={0} />
              <stop offset="0.5" stopColor={C.ink} stopOpacity={0.07} />
              <stop offset="1" stopColor={C.ink} stopOpacity={0} />
            </linearGradient>
          </defs>
          {/* the card */}
          <g opacity={cardIn} transform={`translate(0 ${(1 - cardIn) * 24})`}>
            <rect x={CX} y={CY} width={CW} height={CH} rx={6} fill={C.surface} stroke={C.ink} strokeOpacity={isLight() ? 0.3 : 0.5} strokeWidth={1.5} />
            {MODULES.map(([r, c]) => {
              const t = prog(frame, e + 6 + (r + c) * 0.22, 4);
              const m = QS / QN;
              return <rect key={`${r}-${c}`} x={QX + c * m + 0.4} y={QY + r * m + 0.4} width={m - 0.8} height={m - 0.8} fill={C.ink} opacity={0.88 * t} />;
            })}
          </g>
          {/* glass reflections, clipped to the glass, over the card */}
          <g clipPath={`url(#qrGlass${ctx.index})`} opacity={edge}>
            <rect x={220 + drift} y={120} width={90} height={1200} fill={`url(#qrRefl${ctx.index})`} transform={`rotate(18 ${265 + drift} 700)`} />
            <rect x={380 + drift} y={120} width={34} height={1200} fill={`url(#qrRefl${ctx.index})`} transform={`rotate(18 ${397 + drift} 700)`} />
            <rect x={900 + drift * 0.7} y={120} width={140} height={1200} fill={`url(#qrRefl${ctx.index})`} opacity={0.7} transform={`rotate(18 ${970 + drift * 0.7} 700)`} />
          </g>
          {/* frit dots along the lower edge and the pillar */}
          <g fill={C.ink} opacity={0.3 * edge}>
            {Array.from({length: 66}, (_, i) => (
              <circle key={`b${i}`} cx={238 + i * 12} cy={946} r={1.9} />
            ))}
            {Array.from({length: 66}, (_, i) => (
              <circle key={`c${i}`} cx={244 + i * 12} cy={938} r={1.1} />
            ))}
            {Array.from({length: 50}, (_, i) => {
              const t = i / 50;
              return <circle key={`a${i}`} cx={lerp(368, 198, t)} cy={lerp(306, 922, t)} r={1.8} />;
            })}
          </g>
          <path d={EDGE} fill="none" stroke={C.ink} strokeOpacity={0.9} strokeWidth={2.4} strokeDasharray={1800} strokeDashoffset={1800 * (1 - edge)} strokeLinejoin="round" />
          <path d={INNER} fill="none" stroke={C.ink} strokeOpacity={0.35} strokeWidth={1.2} strokeDasharray={1800} strokeDashoffset={1800 * (1 - edge)} />
        </svg>
        {/* card text + mark (HTML for Georgian shaping) */}
        <div style={{position: 'absolute', left: CX, top: CY + (1 - cardIn) * 24, width: CW, opacity: cardIn}}>
          <div style={{marginTop: 30, textAlign: 'center', fontFamily: F.sans, fontWeight: 600, fontSize: 29, lineHeight: 1.12, color: C.ink, padding: '0 26px'}}>მანქანა გიშლით ხელს?</div>
          <div style={{position: 'absolute', top: QY - CY + QS + 18, left: 0, right: 0, textAlign: 'center', fontFamily: F.sans, fontWeight: 500, fontSize: 15, color: C.ink2}}>დაასკანერეთ და აირჩიეთ მიზეზი</div>
          <div style={{position: 'absolute', top: CH - 46, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, opacity: 0.7}}>
            <BrandMark kind="mark" width={20} />
            <BrandMark kind="wordmark" height={13} />
          </div>
        </div>
      </div>

      {/* the passer-by's phone */}
      {frame >= scan ? (
        <div style={{position: 'absolute', inset: 0, WebkitMaskImage: `linear-gradient(to bottom, #000 ${lerp(900, 936, gl)}px, transparent ${lerp(978, 996, gl)}px)`}}>
          <div style={{position: 'absolute', left: px, top: py, width: pw, height: ph, transform: `rotate(${rot}deg)`, transformOrigin: '50% 50%'}}>
            <svg width={pw} height={ph} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
              {/* camera view dimmed around the viewfinder, then the page */}
              <path
                d={`M ${10} ${10 + pr - 10} Q 10 10 ${pr} 10 L ${pw - pr} 10 Q ${pw - 10} 10 ${pw - 10} ${pr} L ${pw - 10} ${ph - pr} Q ${pw - 10} ${ph - 10} ${pw - pr} ${ph - 10} L ${pr} ${ph - 10} Q 10 ${ph - 10} 10 ${ph - pr} Z M ${pw / 2 - VF / 2} ${ph / 2 - VF / 2} v ${VF} h ${VF} v ${-VF} Z`}
                fill={C.shade}
                fillRule="evenodd"
                opacity={(isLight() ? 0.22 : 0.55) * (1 - gl)}
              />
              <rect x={10} y={10} width={pw - 20} height={ph - 20} rx={pr - 10} fill={C.screen} opacity={gl} />
              <rect x={0} y={0} width={pw} height={ph} rx={pr} fill="none" stroke={C.ink} strokeOpacity={0.92} strokeWidth={2} />
              <rect x={pw / 2 - 52} y={24} width={104} height={30} rx={15} fill={C.island} stroke={C.ink} strokeOpacity={0.25} strokeWidth={1.2} />
              {/* viewfinder brackets lock on */}
              <g opacity={(1 - gl) * Math.min(1, phoneIn * 1.4)} transform={`translate(${pw / 2} ${ph / 2}) scale(${1 + 0.16 * (1 - lockS) - 0.03 * flash})`} fill="none" stroke={C.ink} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round">
                {[
                  [-1, -1],
                  [1, -1],
                  [1, 1],
                  [-1, 1],
                ].map(([sx, sy], i) => (
                  <path key={i} d={`M ${(sx * VF) / 2} ${(sy * VF) / 2 - sy * 36} L ${(sx * VF) / 2} ${(sy * VF) / 2} L ${(sx * VF) / 2 - sx * 36} ${(sy * VF) / 2}`} />
                ))}
                <rect x={-VF / 2} y={-VF / 2} width={VF} height={VF} fill={C.ink} stroke="none" opacity={0.14 * flash} />
              </g>
              {/* scan line: down and back up */}
              {sweep >= 0 ? (
                <g opacity={Math.sin(sweep * Math.PI) * 0.9 + 0.1}>
                  {(() => {
                    const q = sweep < 0.5 ? sweep * 2 : 2 - sweep * 2;
                    const y = ph / 2 - VF / 2 + 12 + q * (VF - 24);
                    return (
                      <>
                        <rect x={pw / 2 - VF / 2 + 10} y={y - 14} width={VF - 20} height={28} fill={C.ink} opacity={0.08} />
                        <line x1={pw / 2 - VF / 2 + 10} x2={pw / 2 + VF / 2 - 10} y1={y} y2={y} stroke={C.ink} strokeWidth={2} />
                      </>
                    );
                  })()}
                </g>
              ) : null}
            </svg>
            {/* the page: host, heading, three reasons */}
            {gl > 0.35 ? (
              <div style={{position: 'absolute', left: 10, right: 10, top: 10, opacity: prog(frame, openAt + 8, 10)}}>
                <div style={{margin: '70px auto 0', width: 200, height: 42, borderRadius: 21, background: rgba(C.ink, 0.07), display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.mono, fontSize: 21, letterSpacing: '0.04em', color: C.ink2}}>
                  vinari.ge
                </div>
                <div style={{margin: '36px 30px 24px', fontFamily: F.sans, fontWeight: 600, fontSize: 50, lineHeight: 1.1, color: C.ink}}>რა ხდება?</div>
                {reasons.map((r, i) => {
                  const s = spr(frame, rowAt(i));
                  return (
                    <div
                      key={i}
                      style={{
                        margin: '0 20px 14px',
                        padding: '24px 20px',
                        borderRadius: 24,
                        border: `1.5px solid ${rgba(C.ink, isLight() ? 0.12 : 0.2)}`,
                        background: rgba(C.ink, 0.035),
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
                      <div style={{fontFamily: F.sans, fontWeight: 500, fontSize: 28, lineHeight: 1.2, color: C.ink, whiteSpace: 'nowrap'}}>{r}</div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* the plate is nowhere on the card */}
      {p.noPlate ? (
        <div style={{position: 'absolute', top: plateY, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 22, opacity: spr(frame, plateAt), transform: `translateY(${(1 - spr(frame, plateAt)) * 14}px)`}}>
          <svg width={178} height={52} style={{flex: 'none', overflow: 'visible'}}>
            <rect x={1} y={1} width={176} height={50} rx={9} fill="none" stroke={C.ink2} strokeWidth={1.8} />
            <line x1={34} x2={34} y1={1} y2={51} stroke={C.ink2} strokeWidth={1.2} />
            <text x={17.5} y={32} textAnchor="middle" fontFamily="VinariMono" fontSize={14} fill={C.ink3}>
              GE
            </text>
            {[0, 1, 2, 3, 4, 5, 6].map((k) => (
              <circle key={k} cx={53 + k * 15.5 + (k >= 2 ? 7 : 0) + (k >= 5 ? 7 : 0)} cy={26} r={3.6} fill={C.ink3} />
            ))}
            <line x1={-8} y1={48} x2={-8 + 194 * strike} y2={48 - 44 * strike} stroke={C.ink} strokeWidth={2.6} strokeLinecap="round" />
          </svg>
          <div style={{fontFamily: F.sans, fontWeight: 500, fontSize: 34, color: C.ink}}>ნომერი არსად წერია</div>
        </div>
      ) : null}
      {p.caption ? (
        <div style={{position: 'absolute', top: p.noPlate ? plateY + 70 : plateY + 10, left: L.side, right: L.side, textAlign: 'center', fontFamily: F.mono, fontSize: 25, letterSpacing: '0.05em', color: C.ink3, opacity: prog(frame, base + 26, 12)}}>
          {capsLatin(p.caption)}
        </div>
      ) : null}

      <Sfx name="asmr-paper" at={base + 4} volume={0.4} /* event: the card settles behind the glass */ />
      <Haptic kind="soft" at={base + 15} volume={0.36} /* event: the card comes to rest (the paper's pat, 360 ms) */ />
      {p.noPlate ? <Sfx name="asmr-strike" at={plateAt + 12} volume={0.44} /* event: the plate is struck out (12 frames) */ /> : null}
      <Sfx name="asmr-slide" at={scan} volume={0.44} /* event: the phone slides in (enterXL) */ />
      <Sfx name="asmr-tick-fine" at={scan + 12} volume={0.36} /* event: the viewfinder locks on */ />
      <Haptic kind="rigid" at={scan + 12} /* event: the viewfinder locks on */ />
      <Sfx name="asmr-camera" at={okAt} volume={0.5} /* event: the code is read */ />
      <Haptic kind="light" at={okAt} volume={0.36} /* event: the code is read */ />
      <Sfx name="asmr-screen" at={openAt} volume={0.42} /* event: the page opens */ />
      {reasons.map((_, i) => (
        <React.Fragment key={i}>
          <Sfx name="asmr-ui-tick-soft" at={rowAt(i)} volume={0.4 * vary(i, 0.2)} /* event: a reason row appears */ />
          <Haptic kind="selection" at={rowAt(i)} volume={0.26 * vary(i + 7, 0.2)} />
        </React.Fragment>
      ))}
    </>
  );
};
