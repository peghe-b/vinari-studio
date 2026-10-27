// V136WinterDigit (v136-winter-digit): the oil label "5W-30" read the right way. Three shots, phase 2 (paper and ink):
//   glow    the drop's glow-up: me in strict profile, chin up, the label "5W-30" hanging over her like her aura
//   label   the signature: the label alone on a white card, the hand bracket under the 5 (the winter digit), then a circle
//   hurt    the uncle in profile points at me, his "10W-30" sliding over to me while I slump
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, PictureBand, Sfx} from '../common';
import {C, F} from '../../tokens';
import {ease, prog, spr} from '../../lib/anim';
import {TXT} from '../../lib/layer';
import {textWidth} from '../../lib/measure';
import {CameraLayer, Hud} from '../../lib/camera';
import {Ink} from '../kit/ink';
import {Card, S} from '../kit/p2';
import {SilFigure, SilPalCtx, silPal} from '../kit/sil/sil';
import type {SceneCtx} from '../../types';

type P = {
  shot?: 'glow' | 'label' | 'hurt';
  hitAt?: number | string;
  at2?: number | string;
  word?: string; // the punch label under the bracket (from the spec)
  word2?: string; // the label of the second mark
};

// me: a young woman, camel ski puffer, high ponytail (the treatment's hero); the uncle: fifties, a knit jumper, a beanie
const ME = {role: 'me', fem: true, age: 0, skin: 1, build: 0.97, hair: 'pony', hairTone: 6, beard: null, outfit: 'puffer', tone: 2, inner: 'turtleneck', innerTone: 1, tie: null, bottom: 'trousers', legs: 6, shoe: 'boot', shoeTone: 7, sole: null, glasses: null, hat: null, hatTone: 0, watch: false, chain: false, earrings: 'stud', bag: false, scarf: null, sleeve: 'long', tucked: false} as const;
const UNCLE = {role: 'man', fem: false, age: 1, skin: 2, build: 1.04, hair: 'receding', hairTone: 4, beard: 'tache', outfit: 'knit', tone: 5, inner: 'shirt', innerTone: 1, tie: null, bottom: 'trousers', legs: 6, shoe: 'boot', shoeTone: 7, sole: null, glasses: null, hat: 'beanie', hatTone: 6, watch: false, chain: false, earrings: null, bag: false, scarf: null, sleeve: 'long', tucked: false} as const;

const LATIN = (px: number) => `800 ${px}px ${F.sans}`;

/** a Latin label set big in ink, centred on x */
const Label: React.FC<{text: string; x: number; y: number; px: number; k?: number}> = ({text, x, y, px, k = 1}) => {
  const w = textWidth(text, LATIN(px));
  return (
    <div className={TXT} style={{position: 'absolute', left: x - w / 2, top: y, fontFamily: F.sans, fontWeight: 800, fontSize: px, lineHeight: `${px}px`, color: C.ink, whiteSpace: 'nowrap', opacity: k, transform: `translateY(${(1 - k) * 24}px)`}}>
      {text}
    </div>
  );
};

/** glow: the drop's glow-up. Me in strict profile facing right, chin lifting into the light, the label over her */
const Glow: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const hit = Math.max(lead(ctx) + 6, cueFrame(ctx, p.hitAt ?? '0.3s'));
  const k = spr(frame, e, 'enterXL');
  const lift = prog(frame, hit, 14, ease.enter);
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={0.6}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <circle cx={520} cy={900} r={330 + 40 * lift} fill={C.ink} opacity={0.05 + 0.05 * lift} />
        </svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <SilFigure uid="v136g" look={ME as never} seed={136} x={500} y={1350} size={720} pose="stand" turn={1} acts={[{at: hit, pose: 'confident'}]} frame={frame} />
        </svg>
      </CameraLayer>
      <Hud>
        <Label text="5W-30" x={540} y={430} px={150} k={k} />
      </Hud>
      <Sfx name="asmr-swell" at={Math.max(lead(ctx), hit - 6)} volume={0.22} />
      <Haptic kind="light" at={hit} />
    </PictureBand>
  );
};

/** label: the signature. The label on a white card; the bracket lands under the 5 on hitAt, a circle on it on at2 */
const LabelCard: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const hit = Math.max(lead(ctx) + 10, cueFrame(ctx, p.hitAt ?? 1));
  const at2 = Math.max(hit + 20, cueFrame(ctx, p.at2 ?? 2));
  const k = spr(frame, e, 'enter');
  const px = 230;
  const text = '5W-30';
  const w = textWidth(text, LATIN(px));
  const x0 = 540 - w / 2;
  const five = textWidth('5', LATIN(px));
  const cardY = 560;
  const textY = cardY + 120;
  const push = 1 + 0.05 * prog(frame, at2, 30, ease.camera);
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={1}>
        <div style={{position: 'absolute', inset: 0, transform: `scale(${push.toFixed(4)})`, transformOrigin: `${x0 + five / 2}px ${textY + px / 2}px`}}>
          <Card x={S.left} y={cardY} w={S.right - S.left} h={560}>
            {null}
          </Card>
          <Label text={text} x={540} y={textY} px={px} k={k} />
          <Ink
            marks={[
              {kind: 'underline', box: {x: x0 - 6, y: textY + px + 6, w: five + 12, h: 30}, at: hit, label: p.word},
              {kind: 'circle', box: {x: x0 - 30, y: textY - 24, w: five + 60, h: px + 48}, at: at2},
            ]}
            end={ctx.dur}
          />
        </div>
      </CameraLayer>
      <Land at={hit} />
      <Haptic kind="rigid" at={at2} volume={0.3} />
    </PictureBand>
  );
};

/** hurt: the uncle (left, facing right) points at me (right, facing left, slumping); his 10W-30 slides over towards me */
const Hurt: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const hit = Math.max(lead(ctx) + 4, cueFrame(ctx, p.hitAt ?? '0.2s'));
  const k = spr(frame, e, 'enter');
  const go = prog(frame, hit, 20, ease.enter);
  const push = 320 + 380 * go;
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={1}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <SilFigure uid="v136u" look={UNCLE as never} seed={36} x={300} y={1350} size={640} pose="crossArms" turn={1} acts={[{at: hit, pose: 'point'}]} frame={frame} />
          <SilFigure uid="v136m" look={ME as never} seed={136} x={790} y={1350} size={600} pose="stand" turn={-1} acts={[{at: hit + 8, pose: 'slumped'}]} frame={frame} />
        </svg>
      </CameraLayer>
      <Hud>
        <Label text="10W-30" x={push} y={470} px={110} k={k} />
      </Hud>
      <Sfx name="asmr-slide" at={Math.max(lead(ctx), hit)} volume={0.3} />
      <Haptic kind="light" at={hit + 20} />
    </PictureBand>
  );
};

/** the people in grey light only (phase 2: paper and ink, no hue on a figure) */
const greyPal = (time: 'day' | 'dusk' | 'night', level: number) => silPal({light: true, hue: null, time, level});

export const V136WinterDigit: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => (
  <SilPalCtx.Provider value={greyPal}>
    {p.shot === 'label' ? <LabelCard p={p} ctx={ctx} /> : p.shot === 'hurt' ? <Hurt p={p} ctx={ctx} /> : <Glow p={p} ctx={ctx} />}
  </SilPalCtx.Provider>
);
