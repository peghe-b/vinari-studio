// V29PhotoSmile: the auction photo. A car's front drawn as a face on a glossy print: two headlamps, a grille that
// smiles when the flash goes off. Then the print turns over: on its back the same car, the smile flat, a red bracket
// on the damaged corner, and the record's three rows (part, document, date) filling in as blank bars.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, PictureBand, Sfx} from '../common';
import {C, F, L, rgba, toneBig, type Tone} from '../../tokens';
import {ease, lerp, prog, spr} from '../../lib/anim';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import {textWidth} from '../../lib/measure';
import type {SceneCtx} from '../../types';

type P = {
  smileAt?: number | string; // chunk (or "1.2s") of the flash and the smile
  flipAt?: number | string; // chunk where the print turns over
  rows?: string[]; // the three labels on the back
  tone?: Tone; // the damage mark
  label?: string; // small mono line on the front's lower edge
};

// the print, in stage units, centred on the content box
const CX = 540;
const CW = 740;
const CH = 780;
const CY = 830;
const TOP = 830 - 390;

// the car's front, drawn around (0, 0)
const BODY = 'M -200 -58 L 200 -58 Q 246 -54 246 -8 L 246 72 Q 246 92 226 92 L -226 92 Q -246 92 -246 72 L -246 -8 Q -246 -54 -200 -58 Z';
const CABIN = 'M -128 -182 L 128 -182 Q 146 -182 154 -166 L 196 -58 L -196 -58 L -154 -166 Q -146 -182 -128 -182 Z';
const GLASS = 'M -116 -166 L 116 -166 L 168 -74 L -168 -74 Z';
const WHEEL_L = 'M -226 92 L -226 128 Q -226 136 -218 136 L -170 136 Q -162 136 -162 128 L -162 92';
const WHEEL_R = 'M 226 92 L 226 128 Q 226 136 218 136 L 170 136 Q 162 136 162 128 L 162 92';
const MIRROR_L = 'M -196 -74 L -232 -86 Q -246 -84 -244 -70 L -236 -62';
const MIRROR_R = 'M 196 -74 L 232 -86 Q 246 -84 244 -70 L 236 -62';
const PLATE = 'M -62 58 L 62 58 L 62 82 L -62 82 Z';

const smilePath = (curve: number) => `M -96 26 Q 0 ${26 + curve} 96 26`;

const Car: React.FC<{draw: number; curve: number; look: number; dim: number}> = ({draw, curve, look, dim}) => {
  const line = {fill: 'none', stroke: rgba(C.ink, dim), strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, strokeDasharray: 1, strokeDashoffset: 1 - draw};
  const eye = (x: number) => (
    <g>
      <ellipse cx={x} cy={-8} rx={46} ry={24} pathLength={1} style={line} />
      <circle cx={x + look * 12} cy={-8} r={9} fill={rgba(C.ink, dim)} opacity={draw} />
    </g>
  );
  return (
    <g>
      <path d={CABIN} pathLength={1} style={line} />
      <path d={GLASS} pathLength={1} style={{...line, stroke: rgba(C.ink, dim * 0.45), strokeWidth: 1.5}} />
      <path d={BODY} pathLength={1} style={line} />
      <path d={WHEEL_L} pathLength={1} style={line} />
      <path d={WHEEL_R} pathLength={1} style={line} />
      <path d={MIRROR_L} pathLength={1} style={line} />
      <path d={MIRROR_R} pathLength={1} style={line} />
      <path d={PLATE} pathLength={1} style={{...line, strokeWidth: 1.5}} />
      {eye(-160)}
      {eye(160)}
      <path d={smilePath(curve)} style={{fill: 'none', stroke: rgba(C.ink, dim), strokeWidth: 2.6, strokeLinecap: 'round'}} opacity={draw} />
    </g>
  );
};

/** The auction photo smiles; turned over, the record under it. */
export const V29PhotoSmile: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const tone = p.tone ?? 'down';

  // front: the pen draws the car, the flash fires and the grille smiles
  const draw = prog(frame, e, 30, ease.drawOn);
  const smileF = Math.max(base + 10, cueFrame(ctx, p.smileAt ?? 1));
  const smile = spr(frame, smileF, 'land');
  const flash = frame >= smileF ? Math.max(0, 1 - (frame - smileF) / 9) : 0;
  const glint = prog(frame, smileF, 22, ease.camera);

  // the turn: a flat scaleX through zero, the back from the middle on
  const flipF = Math.max(smileF + 18, cueFrame(ctx, p.flipAt ?? 2));
  const turn = prog(frame, flipF - 4, 16, ease.camera);
  const back = turn >= 0.5;
  const sx = Math.max(0.004, Math.abs(Math.cos(Math.PI * turn)));
  const settled = flipF + 12;
  const mark = spr(frame, settled + 4, 'land');
  const flat = back ? lerp(40, -6, prog(frame, settled, 14, ease.camera)) : lerp(0, 40, smile);

  // the three rows on the back, one on each later moment
  const rows = (p.rows ?? ['ნაწილი', 'საბუთი', 'თარიღი']).slice(0, 3).map((s) => mtav(s));
  const rowAt = [settled + 8, settled + 18, settled + 28];
  const labelFont = `500 34px ${F.mono}`;
  const widest = Math.max(1, ...rows.map((r) => textWidth(r, labelFont)));
  const labelSize = Math.min(34, Math.floor((34 * 240) / widest));

  // the camera: a slow push over the whole scene
  const push = lerp(1, 1.05, prog(frame, e, ctx.dur, ease.camera));
  const lift = back ? 0 : lerp(14, 0, draw);
  const front = mtav(p.label ?? 'აუქციონის ფოტო');
  const frontSize = Math.min(26, Math.floor((26 * 520) / Math.max(1, textWidth(front, `500 26px ${F.mono}`))));
  const red = toneBig(tone);
  const tick = 34;

  return (
    <PictureBand>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${push})`, transformOrigin: `${CX}px ${L.contentMid}px`}}>
        <div style={{position: 'absolute', left: CX - CW / 2, top: TOP + lift, width: CW, height: CH, transform: `scaleX(${sx})`}}>
          <svg width={CW} height={CH} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
            <rect x={1} y={1} width={CW - 2} height={CH - 2} rx={22} fill={C.surface} stroke={rgba(C.ink, back ? 0.28 : 0.4)} strokeWidth={1.5} />
            {!back ? (
              <g>
                {/* viewfinder corners */}
                {[0, 1, 2, 3].map((i) => {
                  const x = i % 2 === 0 ? 40 : CW - 40;
                  const y = i < 2 ? 40 : CH - 110;
                  const dx = i % 2 === 0 ? 1 : -1;
                  const dy = i < 2 ? 1 : -1;
                  return <path key={i} d={`M ${x} ${y + dy * tick} L ${x} ${y} L ${x + dx * tick} ${y}`} fill="none" stroke={rgba(C.ink, 0.55)} strokeWidth={2} opacity={draw} />;
                })}
                <g transform={`translate(${CW / 2} ${CH / 2 - 30}) scale(1.12)`}>
                  <Car draw={draw} curve={flat} look={0} dim={1} />
                </g>
                <line x1={40} x2={CW - 40} y1={CH - 80} y2={CH - 80} stroke={rgba(C.ink, 0.3)} strokeWidth={1.5} opacity={draw} />
                {/* the glint: one thin sheen crossing the print after the flash */}
                {glint > 0 && glint < 1 ? (
                  <line x1={-200 + glint * (CW + 400)} y1={0} x2={-360 + glint * (CW + 400)} y2={CH - 90} stroke={rgba(C.ink, 0.22 * Math.sin(Math.PI * glint))} strokeWidth={26} />
                ) : null}
                <rect x={1} y={1} width={CW - 2} height={CH - 2} rx={22} fill={rgba(C.ink, 0.35 * flash)} />
              </g>
            ) : (
              <g>
                <g transform={`translate(${CW / 2} 250) scale(0.78)`}>
                  <Car draw={1} curve={flat} look={0} dim={0.55} />
                  {/* the damaged corner: brackets round the left lamp and a short crease */}
                  <g opacity={mark} transform={`translate(-160 -8) scale(${lerp(1.3, 1, mark)})`}>
                    <path d="M -86 -42 L -86 -58 L -70 -58 M 70 -58 L 86 -58 L 86 -42 M 86 42 L 86 58 L 70 58 M -70 58 L -86 58 L -86 42" fill="none" stroke={red} strokeWidth={3} strokeLinecap="round" />
                    <path d="M -58 -30 L -34 -12 L -46 4 L -20 22" fill="none" stroke={red} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
                  </g>
                </g>
                {rows.map((_, i) => {
                  const k = spr(frame, rowAt[+i], 'enter');
                  const y = 470 + i * 96;
                  return (
                    <g key={i} opacity={k} transform={`translate(${(1 - k) * 18} 0)`}>
                      <line x1={60} x2={CW - 60} y1={y + 44} y2={y + 44} stroke={rgba(C.ink, 0.16)} strokeWidth={1.5} />
                      <circle cx={78} cy={y} r={7} fill={i === 0 ? red : rgba(C.ink, 0.7)} />
                      <rect x={390} y={y - 12} width={[250, 190, 130][+i] * k} height={24} rx={12} fill={rgba(C.ink, 0.22)} />
                    </g>
                  );
                })}
              </g>
            )}
          </svg>
          {!back ? (
            <div className={TXT} style={{position: 'absolute', left: 40, width: CW - 80, top: CH - 64, textAlign: 'center', fontFamily: F.mono, fontSize: frontSize, letterSpacing: 2, color: C.ink2, opacity: draw}}>
              {front}
            </div>
          ) : (
            rows.map((r, i) => {
              const k = spr(frame, rowAt[+i], 'enter');
              return (
                <div key={i} className={TXT} style={{position: 'absolute', left: 104, top: 470 + i * 96 - labelSize * 0.62, fontFamily: F.mono, fontSize: labelSize, color: C.ink, opacity: k, transform: `translateX(${(1 - k) * 18}px)`, whiteSpace: 'nowrap'}}>
                  {r}
                </div>
              );
            })
          )}
        </div>
      </div>
      <Sfx name="asmr-pencil" at={base + 1} volume={0.35} />
      <Sfx name="asmr-camera" at={smileF} volume={0.5} />
      <Haptic kind="light" at={smileF} />
      <Sfx name="asmr-paper" at={flipF - 2} volume={0.45} />
      <Land at={settled + 4} />
      <Sfx name="asmr-knock" at={rowAt[0]} volume={0.35} />
      <Sfx name="asmr-knock" at={rowAt[1]} volume={0.3} />
      <Sfx name="asmr-knock" at={rowAt[2]} volume={0.3} />
    </PictureBand>
  );
};
