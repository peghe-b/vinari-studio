// V144ThreeAnswers: v144-three-answers' own picture. A tall street signpost on a Tbilisi pavement, eleven arrow plates
// stacked on its pole, each with a part's pictogram: eleven ways to go and you do not know which (shot "lost": you stand
// under it, hands to your head, the plates swaying). Then three answers (shot "fold"): the plates fold shut on their
// hinges in three waves (5, 3, 2) until ONE arrow is left, lit in the film's accent, and you point down its way.
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, PictureBand, Sfx} from '../common';
import {StepShot} from '../kit/explain';
import {C, accentsOn} from '../../tokens';
import {ease, prog} from '../../lib/anim';
import {CameraLayer, Hud, useKick} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import {OBJ} from '../../lib/layer';
import type {SceneCtx} from '../../types';
import {Backdrop} from '../illo/backdrop';
import {Figure} from '../illo/figure';
import {FOOT, IlloBand, Svg, timeOf} from '../illo/scene';
import {PartIcon, type PartName} from '../kit/parts';

type P = {
  look?: 'illustrated' | 'diagram';
  shot?: 'lost' | 'fold' | 'step';
  hitAt?: number | string;
  src?: string;
  step?: number;
  verb?: string;
  row?: {x?: number; y: number; w?: number; h: number};
  line?: string;
  time?: 'day' | 'night' | 'dusk';
};

const GROUND = 1240;
const POLE = 640;
const TOP0 = 430;
const STEP = 58;
const PH = 46;
const PW = 250;
const N = 11;
const KEEP = 6;
// the wave each plate folds in (0 = first), KEEP never
const WAVE = [0, 1, 0, 2, 0, 1, -1, 0, 2, 1, 0];
const ICONS: PartName[] = ['plug', 'belt', 'battery', 'cat', 'thermo', 'injector', 'hose', 'coil', 'o2', 'maf', 'egr'];

/** the pavement and the kerb under the post, run past the frame's foot */
const Pavement: React.FC = () => (
  <g>
    <rect x={-200} y={GROUND} width={1480} height={FOOT - GROUND} fill={C.il2} />
    <rect x={-200} y={GROUND} width={1480} height={10} fill={C.il4} />
    <rect x={-200} y={GROUND + 200} width={1480} height={14} fill={C.il4} />
    <rect x={-200} y={GROUND + 214} width={1480} height={FOOT - GROUND} fill={C.il6} />
  </g>
);

/** the hub as one step of the how-to: the real screen in a whole phone rising in a hand, the window on the tile */
const StepPicture: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => (
  <PictureBand camera={false}>
    <StepShot ctx={ctx} src={p.src ?? '26-diagnostics-hub'} n={p.step ?? 1} text={p.verb ?? 'ერთ ეკრანზე'} row={p.row ?? {x: 0.052, w: 0.432, y: 0.59, h: 0.205}} tapAt={p.hitAt ?? '0.6s'} liftAt={p.hitAt ?? '0.6s'} hold w={380} foot={1360} />
    <Sfx name="asmr-tap" at={Math.max(lead(ctx), cueFrame(ctx, p.hitAt ?? '0.6s'))} volume={0.3} />
  </PictureBand>
);

export const V144ThreeAnswers: React.FC<{p: P; ctx: SceneCtx}> = (props) =>
  props.p.shot === 'step' ? <StepPicture {...props} /> : <Signpost {...props} />;

const Signpost: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const uid = useId();
  const time = timeOf(p);
  const base = lead(ctx);
  const e = entrance(ctx);
  const kick = useKick();
  const fold = p.shot === 'fold';
  const hit = Math.max(base + 10, cueFrame(ctx, p.hitAt ?? '0.6s'));
  // the three waves: fast, one after the other, the last arrow lights on the hit
  const waves = [Math.max(e + 4, hit - 30), Math.max(e + 12, hit - 18), Math.max(e + 20, hit - 6)];
  const accent = accentsOn() ? C.accA : C.ink;
  const plates = [];
  for (let i = 0; i < N; i++) {
    const right = i % 2 === 0;
    const y = TOP0 + i * STEP;
    const w = WAVE[i | 0];
    // folded: the plate swings shut on its hinge at the pole (its width to 0), a little drop
    const shut = fold && w >= 0 ? prog(frame, waves[w | 0], 9, ease.enter) : 0;
    const sway = fold ? 0 : 3 * Math.sin(frame / 9 + i * 1.3) * (1 + 1.5 * prog(frame, hit, 6) * (1 - prog(frame, hit + 20, 20)));
    const lit = fold && i === KEEP ? prog(frame, hit, 8) : 0;
    const sx = 1 - shut;
    if (sx <= 0.01) continue;
    const dir = right ? 1 : -1;
    const fill = lit > 0 ? accent : C.surface;
    const ink = lit > 0.5 ? C.surface : C.ink2;
    const len = PW * (1 + 0.12 * lit);
    const tip = 30;
    const d = `M0 0 L${len - tip} 0 L${len} ${PH / 2} L${len - tip} ${PH} L0 ${PH} Z`;
    plates.push(
      <g key={i} transform={`translate(${POLE} ${y + 8 * shut}) rotate(${(sway * dir).toFixed(2)}) scale(${(dir * sx).toFixed(3)} 1)`} opacity={1 - 0.4 * shut}>
        <path d={d} fill={fill} stroke={lit > 0 ? accent : C.ink} strokeWidth={4} strokeLinejoin="round" />
        <g transform={right ? undefined : `translate(${len - tip - 6} 0) scale(-1 1) translate(${-(len - tip - 6)} 0)`}>
          <PartIcon name={ICONS[i | 0]} x={60} y={PH / 2} size={34} color={ink} width={3} />
          <rect x={100} y={PH / 2 - 4} width={(len - 170) * (0.5 + 0.4 * ((i * 7) % 5) / 5)} height={8} rx={4} fill={ink} opacity={0.6} />
        </g>
      </g>,
    );
  }
  // you: under the post, lost; then pointing down the lit arrow
  const pose = fold ? (frame >= hit ? 'point' : 'stand') : frame >= hit ? 'handsHead' : 'shrug';
  const face = fold ? (frame >= hit ? 'smile' : 'neutral') : 'worried';
  const me = {is: 'me' as const, outfit: 'trench' as const, hair: 'quiff' as const};
  const hitSfx = fold ? waves : [hit];
  return (
    <IlloBand uid={uid} time={time}>
      <CameraLayer depth={0.6}>
        <Svg>
          <Backdrop kind="city" uid={uid} frame={frame} time={time} base={GROUND - 10} drift={0.4} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          <Pavement />
          <g className={OBJ}>
            <rect x={POLE - 9} y={TOP0 - 30} width={18} height={GROUND - TOP0 + 34} rx={6} fill={C.ink} />
            <circle cx={POLE} cy={TOP0 - 30} r={14} fill={C.ink} />
            {plates}
            <circle cx={POLE} cy={TOP0 + KEEP * STEP + PH / 2} r={10 + 6 * kick} fill={C.ink} />
          </g>
          <Figure uid={`${uid}me`} cast={me} x={250} y={GROUND + 40} size={700} pose={pose} face={face} turn={0.55} frame={frame} time={time} />
        </Svg>
      </CameraLayer>
      <Hud>
        <div style={{position: 'absolute', left: 170, top: 330, whiteSpace: 'nowrap'}}>
          <Words text={p.line ?? (fold ? '*ერთი*' : '*11* გზა')} at={hit} fx="slam" size={84} color={C.ink} />
        </div>
      </Hud>
      {hitSfx.map((f, i) => (
        <Sfx key={i} name="asmr-flap" at={Math.max(base, f)} volume={0.3} />
      ))}
      <Land at={hit} />
      <Haptic kind="rigid" at={hit + 2} volume={0.3} />
    </IlloBand>
  );
};
