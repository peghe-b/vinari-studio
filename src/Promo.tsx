import React, {useMemo} from 'react';
import {AbsoluteFill, Audio, getInputProps, interpolate, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {MetaBar, MetaEntry} from './layers/MetaBar';
import {SafeOverlay} from './layers/SafeOverlay';
import {Stage} from './layers/Stage';
import {buildSubs, Subtitles} from './layers/Subtitles';
import {VHS} from './layers/VHS';
import {useVoiceLevel} from './layers/voiceLevel';
import {ease} from './lib/anim';
import {capsLatin} from './lib/format';
import {GFX_CLASS, LAYER_CSS, Layer, LayerCtx, TEXT_CLASS} from './lib/layer';
import {Haptic, KIT_REF, mix, SceneStart, setMix, Sfx, TypeSfx, vary} from './scenes/common';
import {SCENES} from './scenes';
import {C, FPS, L, MIX_VOICED, setAccentMode, setMono, setTheme, VHS_DEFAULT} from './tokens';
import type {SceneCtx, SceneSpec, VideoProps} from './types';

type Plan = {spec: SceneSpec; from: number; to: number; beats: number[]};

const pad = (n: number) => String(n).padStart(2, '0');

/** Comparable words: lower case, punctuation gone, a Georgian case ending after a hyphen dropped
 *  ("App Store-ზე" -> app, store). */
const wordsOf = (t: string) =>
  t
    .toLowerCase()
    .split(/[^\p{L}\p{N}-]+/u)
    .map((w) => w.split('-')[0])
    .filter(Boolean);

export const totalFrames = (p: VideoProps) => Math.ceil(p.timeline.duration * FPS);

const planScenes = ({spec, timeline}: VideoProps): Plan[] => {
  const plans: Plan[] = [];
  spec.beats.forEach((b, i) => {
    const from = Math.round(timeline.beats[i].start * FPS);
    if (b.scene || i === 0) plans.push({spec: b.scene ?? {type: 'Title', lines: []}, from, to: 0, beats: [i]});
    else plans[plans.length - 1].beats.push(i);
  });
  const total = Math.ceil(timeline.duration * FPS);
  plans.forEach((p, k) => (p.to = k + 1 < plans.length ? plans[k + 1].from : total));
  return plans;
};

// ---- the subtitle line's haptic (audio only) -----------------------------------------------------
// Every change of the subtitle line gets one very quiet selection haptic, the pulse of the text,
// unless something already sounds there: the hook (frame 0 has its own thump), a cut (air, a
// slide, an entrance), a scene event keyed to that chunk (the scene plays its own haptic for it),
// a scene still running what its own `at` started (a countdown, a flap board, a count, a draw), or
// the end card (quiet). One haptic per change of text, never a flam against a scene's own.
const KEYS = new Set(['at', 'landAt', 'scanAt', 'outlierAt', 'markersAt', 'crossAt']);
const STREAM = 44; // frames a scene-level `at` keeps its scene busy (countdown, flaps, count-up, draw)
// scenes that start their own run shortly after the cut when the spec gives no `at` (a grid filling, a count)
const SELF_STARTING = new Set(['Calendar', 'Compare', 'Grid', 'LineChart', 'MapPin', 'Notification', 'QRCard', 'SplitFlap', 'Squares', 'Stat', 'StripPlot', 'Wave']);

const keyedFrames = (plan: Plan, cues: number[]) => {
  const points: number[] = [];
  const streams: number[] = [];
  const frameOf = (v: unknown): number | null => {
    if (typeof v === 'number') return plan.from + (cues[Math.min(Math.max(0, Math.round(v)), cues.length - 1)] ?? 0);
    if (typeof v === 'string' && /^\d+(\.\d+)?s$/.test(v)) return plan.from + Math.round(parseFloat(v) * FPS);
    return null;
  };
  const walk = (o: unknown, top: boolean) => {
    if (Array.isArray(o)) return o.forEach((x) => walk(x, false));
    if (!o || typeof o !== 'object') return;
    for (const [k, v] of Object.entries(o)) {
      if (k === 'focus') continue; // a camera push has no haptic of its own: the text change keeps its tick
      const f = KEYS.has(k) ? frameOf(v) : null;
      if (f !== null) (top ? streams : points).push(f);
      else if (v && typeof v === 'object') walk(v, false);
    }
  };
  walk(plan.spec, true);
  if (!streams.length && SELF_STARTING.has(plan.spec.type)) streams.push(plan.from);
  return {points, streams};
};

const subtitleTicks = (plans: Plan[], timeline: VideoProps['timeline'], subs: {from: number}[]) => {
  const cuts = plans.slice(1).map((p) => p.from);
  const end = plans.find((p) => p.spec.type === 'EndCard')?.from ?? Infinity;
  const keyed = plans.map((plan) =>
    keyedFrames(
      plan,
      plan.beats.flatMap((bi) => timeline.beats[bi].chunks.map((c) => Math.round(c.start * FPS) - plan.from)),
    ),
  );
  const points = keyed.flatMap((k) => k.points);
  const streams = keyed.flatMap((k) => k.streams);
  const out: number[] = [];
  for (const {from: f} of subs) {
    if (f < 8 || f >= end - 4) continue;
    if (cuts.some((c) => f >= c - 4 && f <= c + 8)) continue;
    if (points.some((p) => f >= p - 5 && f <= p + 3)) continue; // the line shows 2 frames before its chunk
    if (streams.some((a) => f >= a - 5 && f <= a + STREAM)) continue;
    if (out.length && f - out[out.length - 1] < 10) continue;
    out.push(f);
  }
  return out;
};

/** Every scene drifts a little: the camera never fully stops (pollar rule). */
const SceneHost: React.FC<{plan: Plan; ctx: SceneCtx}> = ({plan, ctx}) => {
  const frame = useCurrentFrame();
  const Comp = SCENES[plan.spec.type];
  if (!Comp) throw new Error(`Unknown scene type "${plan.spec.type}". Known: ${Object.keys(SCENES).join(', ')}`);
  const drift = plan.spec.type === 'Wire3D' ? 1 : 1 + 0.01 * ease.camera(Math.min(1, frame / Math.max(1, ctx.dur)));
  return (
    <AbsoluteFill style={{transform: `scale(${drift})`, transformOrigin: '50% 38%'}}>
      <SceneStart.Provider value={plan.from}>
        <Comp p={plan.spec} ctx={ctx} />
      </SceneStart.Provider>
    </AbsoluteFill>
  );
};

/** A film without an end card still ends cleanly: over its last END_FADE frames the whole picture
 *  (scene, meta bar, subtitle, VHS) eases into the field, while every sound's tail fades with it
 *  (scenes/common.tsx) and the room tone breathes out. The loop then cuts to frame 0, the hook,
 *  already composed. With an end card the card itself is the ending (it never freezes). */
const END_FADE = 14;
const EndFade: React.FC<{total: number}> = ({total}) => {
  const frame = useCurrentFrame();
  const k = interpolate(frame, [total - END_FADE, total - 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease.camera});
  return k > 0 ? <AbsoluteFill style={{backgroundColor: C.bg, opacity: k}} /> : null;
};

const envFlag = (name: string) => {
  const env = (globalThis as {process?: {env?: Record<string, string | undefined>}}).process?.env ?? {};
  return env[name] === '1' || env[`REMOTION_${name}`] === '1';
};

/** Input props merge over the composition's defaultProps (--props='{"silent":true}' keeps spec and
 *  timeline); getInputProps() is read too, so the flag works however the props arrive. */
const inputFlag = (props: VideoProps, key: 'silent' | 'safe') => {
  if (props[key] !== undefined) return Boolean(props[key]);
  try {
    return Boolean((getInputProps() as Record<string, unknown>)[key]);
  } catch {
    return false;
  }
};

/** Debug input prop for mix measurements, never set in a normal render: "sfx" renders the voiced
 *  film without its voice track (every sound at its voiced level: gain, dip, room), "voice" renders
 *  the voice alone. make.sh <id> --mix renders both as audio and prints the voice-vs-sound figures. */
const stemOf = (props: PromoProps): 'sfx' | 'voice' | null => {
  let s: unknown = props.stem;
  if (s === undefined) {
    try {
      s = (getInputProps() as Record<string, unknown>).stem;
    } catch {
      s = undefined;
    }
  }
  return s === 'sfx' || s === 'voice' ? s : null;
};

/** The theme: the prop, then the input props, then the spec, else the dark film. */
export const themeOf = (props: VideoProps) => {
  let t: unknown = props.theme;
  if (t === undefined) {
    try {
      t = (getInputProps() as Record<string, unknown>).theme;
    } catch {
      t = undefined;
    }
  }
  return (t ?? props.spec.theme) === 'light' ? 'light' : 'dark';
};

export type PromoProps = VideoProps & {
  /** "none": no platform UI over the film (the 16:9 frame): the subtitle centres on the content. */
  ui?: 'reels' | 'none';
  /** debug: render one stem of the voiced mix (stemOf) */
  stem?: 'sfx' | 'voice';
  /** the picture alone (src/Cover.tsx): no meta bar, no subtitle, no sound */
  bare?: boolean;
  /** black and white: the data colours drawn in ink (the cover) */
  mono?: boolean;
};

export const Promo: React.FC<PromoProps> = (props) => {
  const {spec, timeline} = props;
  // the token swap: before any layer or scene reads C (they all render after this line)
  setTheme(themeOf(props));
  if (props.mono) setMono();
  setAccentMode(spec.accent);
  // silent: no voice track; the subtitle line becomes the primary text (same timing)
  const silent = inputFlag(props, 'silent') || spec.narration === false;
  const total = totalFrames(props);
  const stem = silent ? null : stemOf(props);
  // the mix, before any scene renders a cue (scenes/common.tsx setMix): the silent film plays the kit
  // as balanced; a voiced one sets it against this voice's own loudness (measured from voice.wav, the
  // render waits for it), lifts it by MIX_VOICED and steps a ringing tail back under each chunk
  const voiceLevel = useVoiceLevel(silent ? null : spec.id, KIT_REF);
  setMix(
    silent
      ? {voice: null, end: total}
      : {
          voice: voiceLevel ?? KIT_REF,
          end: total,
          lift: MIX_VOICED.lift,
          ceil: MIX_VOICED.ceil,
          room: MIX_VOICED.room,
          dip: MIX_VOICED.dip,
          mute: stem === 'voice',
          words: timeline.beats.flatMap((b) => b.chunks.map((c) => [Math.round(c.start * FPS), Math.round(c.end * FPS)] as [number, number])),
        },
  );
  const safe = inputFlag(props, 'safe') || envFlag('SAFE_OVERLAY');
  const vhs = props.vhs ?? spec.vhs ?? VHS_DEFAULT;
  const plans = useMemo(() => planScenes(props), [props]);

  // The end card already says its words: the VINARI wordmark, the tagline and the note (there is no
  // store line: the owner wants no call to action). A subtitle there whose every word is already on
  // the card (the tagline itself, "Vinari.") would show the same words twice: drop it. A subtitle
  // that adds a word the card does not show stays.
  const subs = useMemo(() => {
    const end = plans.find((p) => p.spec.type === 'EndCard');
    const all = buildSubs(timeline.beats.flatMap((b) => b.chunks), FPS);
    if (!end) return all;
    const card = new Set(['vinari', ...[end.spec.tagline, end.spec.note].flatMap((t) => wordsOf(String(t ?? '')))]);
    return all.filter((s) => !(s.from >= end.from - 2 && wordsOf(s.text).every((w) => card.has(w))));
  }, [timeline, plans]);

  const meta: MetaEntry[] = useMemo(() => {
    const out: MetaEntry[] = [];
    const countable = plans.filter((p) => p.spec.type !== 'EndCard').length;
    let left = '';
    plans.forEach((plan, k) => {
      plan.beats.forEach((bi, j) => {
        const b = spec.beats[bi];
        if (b.meta) left = b.meta[0];
        if (j === 0 || b.meta) {
          const isEnd = plan.spec.type === 'EndCard';
          out.push({
            from: k === 0 && j === 0 ? -40 : Math.round(timeline.beats[bi].start * FPS), // typed before frame 0
            left: isEnd ? '' : left,
            right: isEnd ? '' : (b.meta?.[1] ?? `${pad(k + 1)}/${pad(countable)}`),
          });
        }
      });
    });
    return out;
  }, [plans, spec, timeline]);

  // music ducks under the voice: speech spans from the timeline, 8-frame ramps
  const spans = useMemo(() => timeline.beats.map((b) => [b.speechStart * FPS, b.speechEnd * FPS] as const), [timeline]);
  const music = spec.music;
  const musicVolume = (f: number) => {
    if (!music) return 0;
    const baseV = music.volume ?? 0.22;
    const duck = music.duck ?? 0.45;
    let k = 1;
    for (const [a, z] of silent ? [] : spans) {
      const inside = interpolate(f, [a - 8, a, z, z + 8], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
      k = Math.min(k, 1 - (1 - duck) * inside);
    }
    const fadeOut = interpolate(f, [total - 24, total], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
    return baseV * k * fadeOut;
  };

  // room tone (public/sfx/asmr-room.wav, a seamless 10 s loop): a small quiet room under the whole
  // film, so the silences between sounds are never digital. About 38 LU under the voice at 0.7, it
  // steps back 3 dB while the voice speaks and fades at both ends (frame 0 is the loop point).
  const roomVolume = (f: number) => {
    let k = 1;
    for (const [a, z] of silent ? [] : spans) {
      const inside = interpolate(f, [a - 8, a, z, z + 8], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
      k = Math.min(k, 1 - 0.3 * inside);
    }
    const ends = Math.min(interpolate(f, [0, 4], [0, 1], {extrapolateRight: 'clamp'}), interpolate(f, [total - 20, total], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
    return 0.7 * mix().room * k * ends;
  };

  // a changed meta label types on at 1.4 characters per frame (MetaBar): soft keys under it
  const metaKeys = meta.filter((e, i) => e.from >= 0 && e.left && e.left !== meta[i - 1]?.left);

  // the cut: a soft breath of air peaking on the cut frame (it starts 3 frames early)
  const cutSfx = spec.cutSfx === undefined ? 'asmr-air' : spec.cutSfx;

  // a selection haptic on every change of the subtitle line no scene event already marks; a touch
  // firmer in the silent film, where the line is the primary text (and a soft tick joins it there)
  const subTicks = useMemo(() => subtitleTicks(plans, timeline, subs), [plans, timeline, subs]);

  // The scenes render twice when the lens is on (lib/layer.ts): the graphics under the lens filter, the
  // scenes' text above it, unfiltered; the meta bar and the subtitle line sit above both, outside the
  // lens and its glitches. Without the lens (vhs 0: the cover) they render once.
  const lens = vhs > 0;
  const scenes = (layer: Layer) => (
    <LayerCtx.Provider value={layer}>
      <Stage>
        {plans.map((plan, k) => {
          const cues = plan.beats.flatMap((bi) => timeline.beats[bi].chunks.map((c) => Math.round(c.start * FPS) - plan.from));
          const beats = plan.beats.map((bi) => Math.round(timeline.beats[bi].start * FPS) - plan.from);
          // a silent film has no voice spans: a scene that plays softer under the voice (Wave) plays out
          const speech = silent ? [] : plan.beats.map((bi) => [Math.round(timeline.beats[bi].speechStart * FPS) - plan.from, Math.round(timeline.beats[bi].speechEnd * FPS) - plan.from] as [number, number]);
          const ctx: SceneCtx = {dur: plan.to - plan.from, index: k, count: plans.length, cues, beats, speech};
          return (
            <Sequence key={k} from={plan.from} durationInFrames={plan.to - plan.from} name={`${k + 1} ${plan.spec.type}${layer === 'text' ? ' (text)' : ''}`}>
              <SceneHost plan={plan} ctx={ctx} />
            </Sequence>
          );
        })}
      </Stage>
    </LayerCtx.Provider>
  );

  return (
    <AbsoluteFill style={{backgroundColor: C.bg}}>
      {lens ? <style>{LAYER_CSS}</style> : null}
      <VHS amount={vhs} total={total} cuts={plans.slice(1).map((p) => p.from)} quietFrom={plans.find((p) => p.spec.type === 'EndCard')?.from}>
        {lens ? <AbsoluteFill className={GFX_CLASS}>{scenes('gfx')}</AbsoluteFill> : scenes('all')}
      </VHS>
      {lens ? <AbsoluteFill className={TEXT_CLASS}>{scenes('text')}</AbsoluteFill> : null}
      {props.bare ? null : <MetaBar entries={meta} />}
      {props.bare ? null : <Subtitles subs={subs} silent={silent} centreX={props.ui === 'none' ? 540 : undefined} centreY={props.ui === 'none' ? L.subtitleYWide : undefined} />}
      {plans.some((p) => p.spec.type === 'EndCard') ? null : <EndFade total={total} />}
      {safe ? <SafeOverlay /> : null}
      {props.bare ? null : (
        <>
      {silent || stem === 'sfx' ? null : <Audio src={staticFile(`vo/${spec.id}/voice.wav`)} />}
      {music && stem !== 'voice' ? <Audio src={staticFile(music.src)} volume={musicVolume} loop /> : null}
      <Audio src={staticFile('sfx/asmr-room.wav')} volume={roomVolume} loop loopVolumeCurveBehavior="extend" name="room tone" />
      {/* the hook: a soft low felt thump on the first frame, felt more than heard, and the film's one
          heavy haptic, whose click a phone speaker still plays (the thump is lost there) */}
      <Sfx name="asmr-sub" at={0} volume={0.45} />
      <Haptic kind="heavy" at={0} volume={0.36} />
      {subTicks.map((f, k) => <Haptic key={`sub${k}`} kind="selection" at={f} volume={(silent ? 0.36 : 0.3) * vary(k, 0.15)} />)}
      {/* silent film: the line is the primary text, and a phone speaker loses the haptic's body, so each
          change of text also gets the softest dry tick (the voice's rhythm, kept without the voice) */}
      {silent ? subTicks.map((f, k) => <Sfx key={`subt${k}`} name="asmr-ui-tick-soft" at={f} volume={0.24 * vary(k + 3, 0.15)} />) : null}
      {/* a Phone brings its own slide on the cut: one moving sound there, not two */}
      {cutSfx ? plans.slice(1).map((p, k) => (p.spec.type === 'Phone' ? null : <Sfx key={`cut${k}`} name={cutSfx} at={p.from - 3} volume={0.16} />)) : null}
      {metaKeys.map((e, k) => <TypeSfx key={`meta${k}`} text={capsLatin(e.left)} at={e.from} cpf={1.4} volume={0.26} rolls={1} />)}
      {spec.beats.flatMap((b, bi) =>
        (b.sfx ?? []).map((c, j) => {
          const tb = timeline.beats[bi];
          const at = c.chunk !== undefined ? tb.chunks[Math.min(c.chunk, tb.chunks.length - 1)].start : tb.start + (c.at ?? 0);
          return <Sfx key={`b${bi}s${j}`} name={c.name} at={Math.round(at * FPS)} volume={c.volume ?? 0.5} />;
        }),
      )}
        </>
      )}
    </AbsoluteFill>
  );
};
