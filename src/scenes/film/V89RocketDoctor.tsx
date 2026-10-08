// v89-rocket-doctor: the run. A rocket sled in side view races along its rails at dusk, the mountains streaming past,
// the rider strapped in behind the cowl, the readout climbing; on the key moment the rockets cut out, the water brake
// throws up a wall of spray, the landscape stops dead and the rider is thrown forward in his straps.
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, Sfx, SourceLine} from '../common';
import {C, L, toneBig, type Tone} from '../../tokens';
import {ease, prog} from '../../lib/anim';
import {CameraLayer, Hud, useKick} from '../../lib/camera';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import type {SceneCtx} from '../../types';
import {Figure, type Cast} from '../illo/figure';
import {Backdrop} from '../illo/backdrop';
import {Smoke, SpeedLines, Shockwave} from '../illo/fx';
import {dark, glow} from '../illo/palette';
import {FOOT, IlloBand, Svg, timeOf} from '../illo/scene';
import {Shadow, Solid, rr, poly, ell} from '../illo/solid';

type P = {
  hitAt?: number | string; // the stop
  value?: number; // the readout's top speed (a fact of the story)
  unit?: string;
  tone?: Tone;
  cast?: Cast;
  time?: 'day' | 'night' | 'dusk';
  source?: string;
};

const GROUND = 1180; // the rail top
const SX = 520; // the sled's centre
const TIE = 70; // the rail ties' spacing

export const V89RocketDoctor: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const uid = useId();
  const kick = useKick();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 20, cueFrame(ctx, p.hitAt ?? 2));
  const time = timeOf({time: p.time ?? 'dusk'});
  const night = dark(time);
  const tone = p.tone ?? 'down';
  const topV = p.value ?? 1017;

  // speed 0..1: already fast on the cut, faster still, then a dead stop in a few frames
  const run = prog(frame, e, Math.max(8, hit - e), ease.inOut);
  const stop = prog(frame, hit, 7, ease.out);
  const v = (0.55 + 0.45 * run) * (1 - stop);
  // the distance travelled (integrated by hand: the speed is smooth, so its mean over the frames is close enough)
  const fRun = Math.min(frame, hit) - e;
  const dist = Math.max(0, fRun) * 34 * (0.55 + 0.225 * run) + Math.min(7, Math.max(0, frame - hit)) * 12;
  // the jolt: the rider thrown forward, the sled rocking back
  const jolt = frame >= hit ? Math.exp(-(frame - hit) / 7) * Math.sin((frame - hit) / 2.2) : 0;
  const lean = frame >= hit ? Math.max(0, Math.exp(-(frame - hit) / 10)) : 0;
  const shake = frame < hit ? Math.sin(frame * 2.7) * 2.2 * v : jolt * 8;

  const shown = Math.round(topV * Math.min(1, (frame - e) / Math.max(1, hit - e)) ** 1.6);
  const flame = frame < hit ? 1 : 0;
  const fl = 0.85 + 0.15 * Math.sin(frame * 3.1) + 0.08 * Math.sin(frame * 7.3);

  const ties: React.ReactNode[] = [];
  const off = -(dist % TIE);
  for (let i = -1; i < 18; i++) {
    const x = off + i * TIE;
    ties.push(<rect key={i} x={x} y={GROUND + 18} width={22} height={14} rx={3} fill={night ? C.il5 : C.il3} />);
  }
  const marks: React.ReactNode[] = [];
  const off2 = -((dist * 1.35) % 260);
  for (let i = -1; i < 7; i++) marks.push(<ellipse key={i} cx={off2 + i * 260 + 90} cy={GROUND + 150} rx={60} ry={6} fill={night ? C.il6 : C.il3} opacity={0.6} />);

  // the sled, drawn around (0, 0) = the rail top under its centre
  const hull = poly([
    [-300, -20],
    [-300, -120],
    [-170, -130],
    [-60, -150],
    [180, -110],
    [330, -40],
    [330, -20],
  ]);
  const cowl = poly([
    [-60, -150],
    [20, -150],
    [180, -110],
    [60, -110],
  ]);
  return (
    <IlloBand uid={uid} time={time}>
      <CameraLayer depth={0.6}>
        <Svg>
          <Backdrop kind="mountains" uid={uid} frame={0} time={time} scroll={dist * 0.08} drift={0} base={GROUND - 40} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          <rect x={-120} y={GROUND - 40} width={1320} height={FOOT - GROUND + 40} fill={night ? C.il7 : C.il2} />
          {marks}
          {/* the rails */}
          <rect x={-120} y={GROUND} width={1320} height={10} fill={night ? C.il3 : C.il5} />
          <rect x={-120} y={GROUND + 12} width={1320} height={4} fill={night ? C.il5 : C.il4} />
          {ties}
          <SpeedLines frame={frame} n={12} box={{x: 0, y: 760, w: 1080, h: 380}} speed={1.6 * v} dir={-1} time={time} opacity={Math.min(1, v * 1.4)} />
          <Shadow uid={uid} cx={SX} cy={GROUND + 4} rx={360} ry={16} />
          <g transform={`translate(${SX} ${(GROUND + shake * 0.4).toFixed(1)}) rotate(${(-jolt * 1.4).toFixed(2)}) scale(1.12)`}>
            {/* the rocket flames behind (gone on the stop) and the smoke they leave */}
            {flame ? (
              <g>
                <ellipse cx={-360 - 70 * fl} cy={-70} rx={90 * fl} ry={26} fill={glow(tone, 0.55)} />
                <ellipse cx={-340 - 40 * fl} cy={-70} rx={50 * fl} ry={14} fill={toneBig(tone)} />
                <ellipse cx={-330} cy={-70} rx={26} ry={8} fill={C.il0} opacity={0.9} />
              </g>
            ) : null}
            {/* the rider: strapped in behind the cowl, thrown forward on the stop */}
            <g transform={`rotate(${(14 * lean).toFixed(2)} -40 -150)`}>
              <Figure
                uid={uid}
                cast={p.cast ?? {is: 'man', outfit: 'bomber', hair: 'side', age: 'adult'}}
                x={-30}
                y={70}
                size={400}
                frame={frame}
                time={time}
                pose="sitDrive"
                turn={0.6}
                acts={[
                  {at: e, face: 'cool'},
                  {at: hit, face: 'shock'},
                ]}
              />
            </g>
            <Solid uid={uid} d={hull} tone={night ? 2 : 1} time={time} rim outline />
            <Solid uid={uid} d={cowl} tone={night ? 4 : 5} time={time} outline />
            <Solid uid={uid} d={rr(-310, -110, 40, 80, 6)} tone={night ? 5 : 6} time={time} />
            <path d={`M-280 -70H300`} stroke={toneBig(tone)} strokeWidth={4} opacity={0.85} />
            {/* the skids on the rails */}
            <Solid uid={uid} d={rr(-260, -22, 150, 22, 6)} tone={night ? 5 : 4} time={time} />
            <Solid uid={uid} d={rr(140, -22, 150, 22, 6)} tone={night ? 5 : 4} time={time} />
            <Solid uid={uid} d={ell(300, -10, 16, 10)} tone={night ? 6 : 5} time={time} />
          </g>
          {/* the water brake's spray, ahead of the sled on the stop */}
          <Smoke frame={frame} x={SX + 360} y={GROUND - 10} n={10} kind="steam" rise={1.4} spread={2.2} size={1.6} at={hit} time={time} uid={uid} />
          <Smoke frame={frame} x={SX + 300} y={GROUND} n={8} kind="steam" rise={0.8} spread={1.6} size={1.2} at={hit + 2} seed={21} time={time} uid={uid} />
          <Shockwave frame={frame} x={SX + 340} y={GROUND - 20} r={200} at={hit} dur={12} color={night ? C.il3 : C.il4} width={6} />
          {frame < hit ? <Smoke frame={frame} x={SX - 420} y={GROUND - 60} n={8} kind="smoke" rise={0.3} spread={2.5} size={1.1} at={e - 60} seed={31} time={time} uid={uid} /> : null}
        </Svg>
      </CameraLayer>
      <Hud>
        <div className={TXT} style={{position: 'absolute', left: L.camSafe.left, top: 470, display: 'flex', alignItems: 'baseline', gap: 18, whiteSpace: 'nowrap', transform: `scale(${(1 + 0.06 * kick).toFixed(3)})`, transformOrigin: 'left center'}}>
          <span style={{fontFamily: 'FiraGO, NotoGeo, sans-serif', fontWeight: 700, fontSize: frame >= hit ? 168 : 150, lineHeight: 1, color: frame >= hit ? toneBig(tone) : night ? C.il0 : C.ink, fontVariantNumeric: 'tabular-nums'}}>{String(shown)}</span>
          <span style={{fontFamily: 'FiraGO, NotoGeo, sans-serif', fontWeight: 600, fontSize: 52, color: night ? C.il1 : C.ink2}}>{mtav(p.unit ?? 'კმ/სთ')}</span>
        </div>
      </Hud>
      <SourceLine text={p.source} at={Math.max(base, hit + 6)} />
      <Sfx name="asmr-swell" at={Math.max(base, e + 2)} volume={0.26} />
      <Sfx name="asmr-paper-tear" at={hit} volume={0.4} />
      <Land at={hit} />
      <Haptic kind="rigid" at={hit + 1} volume={0.32} />
    </IlloBand>
  );
};
