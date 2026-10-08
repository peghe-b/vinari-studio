// V91NewChapter: "you asked for it?" Clean, no people: blank request cards drift in and pile around a dark phone, each
// one knocking the glass; on the key moment they all fold into the screen, the phone wakes and the Vinari mark lights.
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {BrandMark, cueFrame, entrance, Haptic, Land, lead, Sfx} from '../common';
import {C, L, halo, rgba, type Tone} from '../../tokens';
import {ease, lerp, prog, spr} from '../../lib/anim';
import {CameraLayer, Hud, useKick} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import type {SceneCtx} from '../../types';
import {Handset} from '../illo/handset';
import {Shockwave} from '../illo/fx';
import {IlloBand, Svg, TOP, FOOT} from '../illo/scene';
import {rr} from '../illo/solid';

type P = {look?: 'illustrated'; hitAt?: number | string; line?: string; tone?: Tone};

const PX = 540;
const PY = 820;
const PW = 290;
// the cards: where each one rests (stage px), its tilt and width
const CARDS = [
  {x: 250, y: 560, r: -8, w: 300},
  {x: 830, y: 640, r: 7, w: 280},
  {x: 220, y: 900, r: 5, w: 270},
  {x: 860, y: 980, r: -6, w: 290},
  {x: 300, y: 1180, r: -4, w: 300},
  {x: 790, y: 1240, r: 9, w: 260},
  {x: 540, y: 470, r: 3, w: 320},
];

export const V91NewChapter: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const uid = useId();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 18, cueFrame(ctx, p.hitAt ?? 1));
  const kick = useKick();
  const fold = prog(frame, hit - 6, 12, ease.enter);
  const lit = prog(frame, hit, 10, ease.enter);
  const mark = spr(frame, hit + 2, 'land');
  const glow = lit * (1 + 0.25 * kick);
  return (
    <IlloBand uid={uid} time="day">
      {/* the field, edge to edge: plain, with one soft light behind the phone */}
      <CameraLayer depth={0.6}>
        <Svg>
          <rect x={-120} y={TOP} width={1320} height={FOOT - TOP} fill={C.bg} />
          <circle cx={PX} cy={PY} r={520} fill={halo(C.ink, 0.025 + 0.04 * glow)} />
          <circle cx={PX} cy={PY} r={330} fill={halo(C.ink, 0.02 + 0.06 * glow)} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          <Handset uid={uid} x={PX} y={PY} w={PW} frame={frame} tilt={lerp(-4, 0, fold)} ring={frame < hit - 6 ? {from: e + 20, until: hit - 6} : null} lit={1} screen={(w, h) => <rect x={0} y={0} width={w} height={h} fill={rgba(C.ink, 0.04 + 0.1 * lit)} />} />
          <Shockwave frame={frame} x={PX} y={PY} r={420} at={hit} dur={16} color={rgba(C.ink, 0.5)} width={10} />
        </Svg>
        {/* the mark wakes on the glass */}
        <div style={{position: 'absolute', left: PX - 90, top: PY - 80, width: 180, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: lit, transform: `scale(${(0.6 + 0.4 * mark).toFixed(4)})`}}>
          <BrandMark kind="mark" width={170} />
        </div>
      </CameraLayer>
      {/* the request cards, foreground: they drift in, settle, then fold into the screen on the hit */}
      <CameraLayer depth={1.3}>
        <Svg>
          {CARDS.map((c, i) => {
            const t0 = e + 4 + i * 5;
            const k = spr(frame, t0, 'enter');
            const bob = Math.sin((frame + i * 11) / 17) * 6;
            const cx = lerp(lerp(c.x + (c.x < PX ? -240 : 240), c.x, k), PX, fold);
            const cy = lerp(c.y + bob, PY, fold);
            const s = lerp(1, 0.08, fold);
            const h = c.w * 0.36;
            return (
              <g key={i} transform={`translate(${cx.toFixed(1)} ${cy.toFixed(1)}) rotate(${(c.r * (1 - fold)).toFixed(2)}) scale(${s.toFixed(3)})`} opacity={Math.min(1, k * 1.4) * (1 - prog(frame, hit + 4, 4))}>
                <path d={rr(-c.w / 2, -h / 2, c.w, h, 22)} fill={C.surface} stroke={rgba(C.ink, 0.18)} strokeWidth={1.5} />
                <circle cx={-c.w / 2 + 34} cy={0} r={18} fill={rgba(C.ink, 0.35)} />
                <path d={rr(-c.w / 2 + 66, -16, c.w * 0.55, 10, 5)} fill={rgba(C.ink, 0.42)} />
                <path d={rr(-c.w / 2 + 66, 6, c.w * 0.36, 10, 5)} fill={rgba(C.ink, 0.22)} />
                <Sfx name="asmr-knock" at={Math.max(base, t0 + 4)} volume={0.16} />
              </g>
            );
          })}
        </Svg>
      </CameraLayer>
      <Hud>
        <div style={{position: 'absolute', left: 0, width: 1080, top: 1150, display: 'flex', justifyContent: 'center', whiteSpace: 'nowrap'}}>
          <Words text={p.line ?? '*მორჩა*'} at={hit + 2} fx="slam" size={92} punchTone={p.tone ?? 'up'} />
        </div>
      </Hud>
      <Sfx name="asmr-swell" at={Math.max(base, hit - 12)} volume={0.24} />
      <Sfx name="asmr-screen" at={Math.max(base, hit)} volume={0.3} />
      <Land at={hit} />
      <Haptic kind="rigid" at={hit + 2} volume={0.3} />
    </IlloBand>
  );
};
