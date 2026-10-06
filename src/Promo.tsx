import React, {useMemo} from 'react';
import {AbsoluteFill, Audio, Freeze, getInputProps, interpolate, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {FxOverlay} from './layers/FxOverlay';
import {MetaBar, MetaEntry} from './layers/MetaBar';
import {SafeOverlay} from './layers/SafeOverlay';
import {Stage} from './layers/Stage';
import {buildSubs, Subtitles} from './layers/Subtitles';
import {VHS} from './layers/VHS';
import {useVoiceLevel} from './layers/voiceLevel';
import {ease, prog, spr} from './lib/anim';
import {CameraCtx, camAt, camStyle, CamInfo} from './lib/camera';
import {FilmCtx, FilmInfo} from './lib/film';
import {Grain, useGrainTile} from './lib/photo';
import {capsLatin} from './lib/format';
import {presentation, uOf, whipBlur, wipeEdge} from './lib/fx';
import {sceneKicks} from './lib/kicks';
import {GFX_CLASS, LAYER_CSS, Layer, LayerCtx, TEXT_CLASS} from './lib/layer';
import {entrance, Haptic, KIT_REF, mix, MuteCtx, SceneStart, setMix, Sfx, TypeSfx, vary} from './scenes/common';
import {SCENES} from './scenes';
import {C, FPS, isLight, L, MIX_VOICED, rgba, setAccentMode, setMono, setTheme, VHS_DEFAULT} from './tokens';
import type {FxCut, FxPlan, SceneCtx, SceneSpec, Timeline, VideoProps} from './types';

/** A shot: a scene from `from` to `to`. Its beats; c0 = the first chunk of its first beat (a mid-beat cut, fx films),
 *  cEnd = where its last beat's chunks stop (the next shot starts mid-beat), null = all of them. */
type Plan = {spec: SceneSpec; from: number; to: number; beats: number[]; c0: number; cEnd: number | null};

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
    if (b.scene || i === 0) plans.push({spec: b.scene ?? {type: 'Title', lines: []}, from, to: 0, beats: [i], c0: 0, cEnd: null});
    else plans[plans.length - 1].beats.push(i);
    // mid-beat cuts (tools/ci/fx.mjs plans them the same way): a new shot from that chunk's first frame
    const chunks = timeline.beats[i].chunks;
    const cuts = (Array.isArray(b.cuts) ? b.cuts : []).filter((c) => c && c.scene && typeof c.scene.type === 'string' && Number.isInteger(c.chunk) && c.chunk >= 1 && c.chunk < chunks.length).sort((x, y) => x.chunk - y.chunk);
    let last = 0;
    for (const c of cuts) {
      if (c.chunk <= last) continue;
      plans[plans.length - 1].cEnd = c.chunk;
      plans.push({spec: c.scene, from: Math.round(chunks[c.chunk].start * FPS), to: 0, beats: [i], c0: c.chunk, cEnd: null});
      last = c.chunk;
    }
  });
  const total = Math.ceil(timeline.duration * FPS);
  plans.forEach((p, k) => (p.to = k + 1 < plans.length ? plans[k + 1].from : total));
  return plans;
};

/** The subtitle chunks of a shot (all chunks of its beats, unless a mid-beat cut starts or ends it). */
const planChunks = (plan: Plan, timeline: Timeline) =>
  plan.beats.flatMap((bi, j) => {
    const ch = timeline.beats[bi].chunks;
    const lo = j === 0 ? plan.c0 : 0;
    const hi = j === plan.beats.length - 1 && plan.cEnd !== null ? plan.cEnd : ch.length;
    return ch.slice(lo, hi);
  });

/** A shot's SceneCtx timing: its chunk cues, its beats and the voice spans, relative to its start. */
const planTiming = (plan: Plan, timeline: Timeline, silent: boolean) => {
  const cues = planChunks(plan, timeline).map((c) => Math.round(c.start * FPS) - plan.from);
  const beats = plan.beats.map((bi, j) => (j === 0 && plan.c0 > 0 ? plan.from : Math.round(timeline.beats[bi].start * FPS)) - plan.from);
  // a silent film has no voice spans: a scene that plays softer under the voice (Wave) plays out
  const speech = silent
    ? []
    : plan.beats.map((bi, j) => {
        const tb = timeline.beats[bi];
        const a = j === 0 && plan.c0 > 0 ? Math.max(tb.speechStart, tb.chunks[plan.c0].start) : tb.speechStart;
        const z = j === plan.beats.length - 1 && plan.cEnd !== null ? tb.chunks[plan.cEnd - 1].end : tb.speechEnd;
        return [Math.round(a * FPS) - plan.from, Math.round(z * FPS) - plan.from] as [number, number];
      });
  return {cues, beats, speech};
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
      planChunks(plan, timeline).map((c) => Math.round(c.start * FPS) - plan.from),
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

/** Every scene drifts a little: the camera never fully stops (pollar rule). In an fx film (`cam`) a band scene's camera
 *  moves inside its picture (CameraCtx), a free scene's moves the whole scene, and a self scene keeps exactly this drift. */
const SceneHost: React.FC<{plan: Plan; ctx: SceneCtx; cam?: CamInfo | null}> = ({plan, ctx, cam}) => {
  const frame = useCurrentFrame();
  const Comp = SCENES[plan.spec.type];
  if (!Comp) throw new Error(`Unknown scene type "${plan.spec.type}". Known: ${Object.keys(SCENES).join(', ')}`);
  if (cam === undefined) {
    const drift = plan.spec.type === 'Wire3D' ? 1 : 1 + 0.01 * ease.camera(Math.min(1, frame / Math.max(1, ctx.dur)));
    return (
      <AbsoluteFill style={{transform: `scale(${drift})`, transformOrigin: '50% 38%'}}>
        <SceneStart.Provider value={plan.from}>
          <Comp p={plan.spec} ctx={ctx} />
        </SceneStart.Provider>
      </AbsoluteFill>
    );
  }
  const moving = cam && (cam.cls === 'band' || cam.cls === 'free') ? cam : null;
  const drift = plan.spec.type === 'Wire3D' ? 1 : 1 + 0.01 * ease.camera(Math.min(1, frame / Math.max(1, ctx.dur)));
  const root: React.CSSProperties = !moving
    ? {transform: `scale(${drift})`, transformOrigin: '50% 38%'}
    : moving.cls === 'free'
      ? camStyle(camAt(moving, frame), 1, moving.spec.origin ?? {x: 540, y: L.contentMid})
      : {};
  return (
    <AbsoluteFill style={root}>
      <CameraCtx.Provider value={moving}>
        <SceneStart.Provider value={plan.from}>
          <Comp p={plan.spec} ctx={ctx} />
        </SceneStart.Provider>
      </CameraCtx.Provider>
    </AbsoluteFill>
  );
};

/** A shot in an fx film: its transitions in and out (lib/fx.ts), muted on its tail past the cut and while frozen. The
 *  structure never changes from frame to frame (Freeze and MuteCtx are always there), so nothing remounts (a WebGL
 *  canvas stays one canvas). `preroll`: the incoming shot shown frozen on its frame 0 before its cut. */
const ShotFrame: React.FC<{plan: Plan; ctx: SceneCtx; cam: CamInfo | null; cutIn: FxCut | null; cutOut: FxCut | null; preroll?: boolean}> = ({plan, ctx, cam, cutIn, cutOut, preroll = false}) => {
  const f = useCurrentFrame();
  let pres = null;
  if (preroll && cutIn) pres = presentation(cutIn, 'in', uOf(cutIn, f));
  else {
    if (cutIn && f < cutIn.post) pres = presentation(cutIn, 'in', uOf(cutIn, cutIn.pre + f));
    if (cutOut && cutOut.pre + cutOut.post > 0 && f >= ctx.dur - cutOut.pre) pres = presentation(cutOut, 'out', uOf(cutOut, f - (ctx.dur - cutOut.pre)));
  }
  // a crash: the outgoing holds its last frames before the cut (a beat of stillness before the hit)
  const hold = !preroll && cutOut?.type === 'crash' && f >= ctx.dur - 2;
  const muted = preroll || hold || f >= ctx.dur;
  return (
    <>
      <AbsoluteFill style={pres?.outer}>
        <AbsoluteFill style={pres?.style}>
          <MuteCtx.Provider value={muted}>
            <Freeze frame={preroll ? 0 : Math.max(0, ctx.dur - 3)} active={preroll || hold}>
              <SceneHost plan={plan} ctx={ctx} cam={cam} />
            </Freeze>
          </MuteCtx.Provider>
          {pres && pres.veil > 0 ? <AbsoluteFill style={{backgroundColor: rgba(C.bg, pres.veil)}} /> : null}
        </AbsoluteFill>
      </AbsoluteFill>
      {pres?.edge ? <div style={{...wipeEdge(pres.edge.x, pres.edge.dir), backgroundColor: C.ink}} /> : null}
      {pres?.topLine !== null && pres?.topLine !== undefined && pres.topLine >= L.graphicsTop ? (
        <div style={{position: 'absolute', left: 0, right: 0, top: pres.topLine, height: 1.5, backgroundColor: C.rule}} />
      ) : null}
    </>
  );
};

/** A frozen picture whose words are hidden in both layers (the stamp under the end card). */
const NO_TEXT = 'vn-notext';
const FX_CSS = `.${NO_TEXT} .vn-t{visibility:hidden!important}`;

/** The "stamp" and "loop" endings: the last picture before the end card, frozen on its last frame under a veil, with a
 *  short punch as it stops and the grain still moving; the card lands on it. */
const StampUnder: React.FC<{children: React.ReactNode}> = ({children}) => {
  const f = useCurrentFrame();
  const tile = useGrainTile();
  const kick = 1.04 - 0.04 * spr(f, 0, 'punch');
  const light = isLight();
  // the planner only freezes a photo here (tools/ci/fx.mjs stampUnder); it still goes soft and dim as it stops, so the
  // mark and the tagline never sit on a sharp detail (2026-10-06: the 0.6 panel alone did not hide a busy picture)
  const soft = prog(f, 0, 8);
  return (
    <>
      {/* the veil is an opacity, not a field-coloured layer: the picture's words live in the text layer above every
          graphic, and only an opacity dims both layers alike */}
      {/* NO_TEXT: the frozen picture keeps its picture, its words leave (the card says the last words) */}
      <AbsoluteFill
        className={NO_TEXT}
        style={{
          transform: `scale(${kick.toFixed(4)})`,
          transformOrigin: `540px ${L.contentMid}px`,
          opacity: 1 - (light ? 0.5 : 0.55) * soft,
          filter: soft > 0.02 ? `blur(${(9 * soft).toFixed(2)}px)` : undefined,
        }}
      >
        {children}
      </AbsoluteFill>
      {/* the grain keeps moving over the frozen picture (the dark film: on paper it would read as a grey box) */}
      {light ? null : (
        <AbsoluteFill style={{clipPath: `inset(${L.graphicsTop}px 0 ${1920 - L.graphicsBottom}px 0)`}}>
          <Grain amount={0.25} tile={tile} seed={3} />
        </AbsoluteFill>
      )}
    </>
  );
};

/** The "loop" ending's last 12 frames: everything pushes in while the hook's first frame (at its opening camera) takes
 *  over, so the replay's frame 0 follows without a seam. */
const LoopTail: React.FC<{dur: number; hook: React.ReactNode; children: React.ReactNode}> = ({dur, hook, children}) => {
  const f = useCurrentFrame();
  const k = prog(f, dur - 12, 11, ease.camera);
  return (
    <>
      <AbsoluteFill style={k > 0 ? {transform: `scale(${(1 + 0.1 * k).toFixed(4)})`, transformOrigin: `540px ${L.contentMid}px`, opacity: 1 - k} : undefined}>{children}</AbsoluteFill>
      {k > 0 ? <AbsoluteFill style={{opacity: k}}>{hook}</AbsoluteFill> : null}
    </>
  );
};

/** The whip's horizontal blur (lib/fx.ts): one film-wide SVG filter, always mounted with the same single primitive (a
 *  filter that gains primitives mid-film wrote tiled frames in parallel renders: layers/VHS.tsx), only its
 *  stdDeviation follows the whips planned at this frame (whip cuts, a Twist's whip). */
const WhipFilter: React.FC<{whips: {at: number; len: number}[]}> = ({whips}) => {
  const frame = useCurrentFrame();
  let b = 0;
  for (const w of whips) {
    const k = frame - w.at;
    if (k >= 0 && k < w.len) b = Math.max(b, whipBlur((k + 0.5) / w.len));
  }
  return (
    <svg width={0} height={0} style={{position: 'absolute'}} aria-hidden>
      <filter id="vn-whip" x="-20%" y="-2%" width="140%" height="104%" colorInterpolationFilters="sRGB">
        <feGaussianBlur stdDeviation={`${b.toFixed(2)} 0`} />
      </filter>
    </svg>
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
const inputFlag = (props: VideoProps, key: 'silent' | 'safe' | 'nofx') => {
  if ((props as Record<string, unknown>)[key] !== undefined) return Boolean((props as Record<string, unknown>)[key]);
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


// The music bed's reference voice (ci/music.json "volume" is set for it): v8-parking, a Gemini voice, -16.6 LUFS integrated by
// layers/voiceLevel.ts. At volume 0.24 / duck 0.4 the bed sits about 16 LU under the voice in a pause and 24 LU under it
// while it speaks (the audio QA of 2026-10-02 measured the four beds at -20.0 LUFS each).
const MUSIC_REF = -16.6;
const MUSIC_GAP = 18; // frames: a shorter pause between two lines keeps the bed ducked
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
  // the motion plan (tools/ci/fx.mjs, embedded by build-index): only when it was made for exactly these shots
  const nofx = inputFlag(props, 'nofx');
  const fx: FxPlan | null = useMemo(() => {
    const f = props.fx;
    if (!f || !f.on || nofx) return null;
    if (f.scenes.length !== plans.length || f.scenes.some((x, k) => x.from !== plans[k].from || x.to !== plans[k].to)) {
      console.warn(`${spec.id}: the fx plan does not match the film's shots; rendered without the motion layer (run node tools/build-index.mjs ${spec.id})`);
      return null;
    }
    return f;
  }, [props.fx, plans, nofx, spec.id]);
  // every shot's context and camera (fx films: the opening's lead on shot 0, the planned camera and its kicks)
  const shots = useMemo(
    () =>
      plans.map((plan0, k) => {
        const ending = fx && k === plans.length - 1 && k > 0 && plan0.spec.type === 'EndCard' && (fx.ending === 'stamp' || fx.ending === 'loop') ? fx.ending : null;
        const plan = ending ? {...plan0, spec: {...plan0.spec, mode: ending}} : plan0;
        const ctx: SceneCtx = {dur: plan.to - plan.from, index: k, count: plans.length, ...planTiming(plan, timeline, silent)};
        if (fx && k === 0 && fx.openLead !== undefined) ctx.open = {id: fx.opening, lead: fx.openLead};
        let cam: CamInfo | null | undefined;
        if (fx) {
          const c = fx.cameras[k];
          cam = c && (c.cls === 'band' || c.cls === 'free') ? {spec: c, cls: c.cls, seed: `${spec.id}:${k}`, kicks: sceneKicks(plan.spec, ctx, c.kicks ?? []), e: entrance(ctx), dur: ctx.dur} : null;
        }
        return {plan, ctx, cam, ending};
      }),
    [plans, timeline, silent, fx, spec.id],
  );
  const coverAt = typeof spec.cover === 'number' ? spec.cover : spec.cover?.frame;
  const film: FilmInfo | null = useMemo(
    () =>
      fx
        ? {
            frozen: (k: number, f: number) => {
              const sh = shots[Math.max(0, Math.min(shots.length - 1, k))];
              return (
                <MuteCtx.Provider value>
                  <Freeze frame={Math.max(0, Math.min(sh.ctx.dur - 1, Math.round(f)))}>
                    <SceneHost plan={sh.plan} ctx={sh.ctx} cam={sh.cam ?? null} />
                  </Freeze>
                </MuteCtx.Provider>
              );
            },
            hook: {dur: shots[0].ctx.dur, cover: typeof coverAt === 'number' && coverAt < shots[0].plan.to ? coverAt : null, webgl: shots[0].plan.spec.type === 'Wire3D'},
          }
        : null,
    [fx, shots, coverAt],
  );

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
        if (j === 0 && plan.c0 > 0) {
          // a mid-beat shot (fx films): the counter moves on, the label stays
          const isEnd = plan.spec.type === 'EndCard';
          out.push({from: plan.from, left: isEnd ? '' : left, right: isEnd ? '' : (b.meta?.[1] ?? `${pad(k + 1)}/${pad(countable)}`)});
          return;
        }
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
  // the bed (ci/music.json, every third film since 2026-10-02; the owner: always LOW, never in the way). A pause shorter
  // than MUSIC_GAP frames between two lines counts as speech, so the bed does not swell for 0.4 s at every sentence
  // break (two 8-frame ramps are longer than most gaps); it rises only in a real pause.
  const musicSpans = useMemo(() => {
    const out: [number, number][] = [];
    for (const [a, z] of [...spans].sort((x, y) => x[0] - y[0])) {
      const last = out[out.length - 1];
      if (last && a - last[1] < MUSIC_GAP) last[1] = Math.max(last[1], z);
      else out.push([a, z]);
    }
    return out;
  }, [spans]);
  const music = spec.music;
  // set against this film's own voice, as the kit is (setMix): "volume" is the level for a voice at MUSIC_REF, so a
  // quieter voice (edge-tts) gets a quieter bed, never a louder one than the reference allows
  const musicRel = silent || voiceLevel == null ? 1 : Math.min(1.25, 10 ** ((voiceLevel - MUSIC_REF) / 20));
  const musicVolume = (f: number) => {
    if (!music) return 0;
    const baseV = music.volume ?? 0.22;
    const duck = music.duck ?? 0.45;
    let k = 1;
    for (const [a, z] of silent ? [] : musicSpans) {
      const inside = interpolate(f, [a - 8, a, z, z + 8], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
      k = Math.min(k, 1 - (1 - duck) * inside);
    }
    // a 4-frame fade-in (a bed that starts mid-note would click on frame 0), the usual fade-out
    const ends = Math.min(interpolate(f, [0, 4], [0, 1], {extrapolateRight: 'clamp'}), interpolate(f, [total - 24, total], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
    return baseV * musicRel * k * ends;
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
  // the film as it always rendered (no fx plan): one Sequence a shot, cut hard on the voice
  const legacyShots = (layer: Layer) =>
    plans.map((plan, k) => (
      <Sequence key={k} from={plan.from} durationInFrames={plan.to - plan.from} name={`${k + 1} ${plan.spec.type}${layer === 'text' ? ' (text)' : ''}`}>
        <SceneHost plan={plan} ctx={shots[k].ctx} />
      </Sequence>
    ));
  // an fx film's shots: each with its transitions (a pre-roll before its cut, a tail after the next), the endings
  const fxShots = (layer: Layer) =>
    fx
      ? shots.map(({plan, ctx, cam, ending}, k) => {
          const cutIn = fx.cuts[k] ?? null;
          const cutOut = fx.cuts[k + 1] ?? null;
          const tail = cutOut && cutOut.type !== 'crash' ? cutOut.post : 0;
          const label = `${k + 1} ${plan.spec.type}${layer === 'text' ? ' (text)' : ''}`;
          const shot = <ShotFrame plan={plan} ctx={ctx} cam={cam ?? null} cutIn={cutIn} cutOut={cutOut} />;
          let body: React.ReactNode = shot;
          if (ending && k > 0) {
            const prev = shots[k - 1];
            body = (
              <>
                <StampUnder>
                  <MuteCtx.Provider value>
                    <Freeze frame={Math.max(0, prev.ctx.dur - 1)}>
                      <SceneHost plan={prev.plan} ctx={prev.ctx} cam={prev.cam ?? null} />
                    </Freeze>
                  </MuteCtx.Provider>
                </StampUnder>
                {shot}
              </>
            );
            if (ending === 'loop' && film) body = <LoopTail dur={ctx.dur} hook={film.frozen(0, 0)}>{body}</LoopTail>;
          }
          return (
            <React.Fragment key={k}>
              {cutIn && cutIn.pre > 0 ? (
                <Sequence from={plan.from - cutIn.pre} durationInFrames={cutIn.pre} name={`${label} pre-roll`}>
                  <ShotFrame plan={plan} ctx={ctx} cam={cam ?? null} cutIn={cutIn} cutOut={null} preroll />
                </Sequence>
              ) : null}
              <Sequence from={plan.from} durationInFrames={ctx.dur + tail} name={label}>
                {body}
              </Sequence>
            </React.Fragment>
          );
        })
      : null;
  const scenes = (layer: Layer) => (
    <LayerCtx.Provider value={layer}>
      <FilmCtx.Provider value={film}>
        <Stage>{fx ? fxShots(layer) : legacyShots(layer)}</Stage>
      </FilmCtx.Provider>
    </LayerCtx.Provider>
  );

  return (
    <AbsoluteFill style={{backgroundColor: C.bg}}>
      {lens ? <style>{LAYER_CSS}</style> : null}
      {fx ? <style>{FX_CSS}</style> : null}
      {fx ? <WhipFilter whips={fx.whips ?? []} /> : null}
      <VHS amount={vhs} total={total} cuts={plans.slice(1).map((p) => p.from)} quietFrom={plans.find((p) => p.spec.type === 'EndCard')?.from} glitches={fx ? fx.glitches : undefined}>
        {lens ? <AbsoluteFill className={GFX_CLASS}>{scenes('gfx')}</AbsoluteFill> : scenes('all')}
      </VHS>
      {lens ? <AbsoluteFill className={TEXT_CLASS}>{scenes('text')}</AbsoluteFill> : null}
      {fx && !props.bare ? <FxOverlay flashes={fx.flashes} /> : null}
      {props.bare ? null : <MetaBar entries={meta} />}
      {props.bare ? null : <Subtitles subs={subs} silent={silent} centreX={props.ui === 'none' ? 540 : undefined} centreY={props.ui === 'none' ? L.subtitleYWide : undefined} />}
      {plans.some((p) => p.spec.type === 'EndCard') ? null : <EndFade total={total} />}
      {safe ? <SafeOverlay /> : null}
      {props.bare ? null : (
        <>
      {silent || stem === 'sfx' ? null : <Audio src={staticFile(`vo/${spec.id}/voice.wav`)} />}
      {/* the bed stays out of both debug stems (make.sh --mix measures the voice against the kit) */}
      {music && !stem ? <Audio src={staticFile(music.src)} volume={musicVolume} loop name="music bed" /> : null}
      <Audio src={staticFile('sfx/asmr-room.wav')} volume={roomVolume} loop loopVolumeCurveBehavior="extend" name="room tone" />
      {/* the hook: a soft low felt thump on the first frame, felt more than heard, and the film's one
          heavy haptic, whose click a phone speaker still plays (the thump is lost there) */}
      <Sfx name="asmr-sub" at={0} volume={0.45} />
      <Haptic kind="heavy" at={0} volume={0.36} />
      {subTicks.map((f, k) => <Haptic key={`sub${k}`} kind="selection" at={f} volume={(silent ? 0.36 : 0.3) * vary(k, 0.15)} />)}
      {/* silent film: the line is the primary text, and a phone speaker loses the haptic's body, so each
          change of text also gets the softest dry tick (the voice's rhythm, kept without the voice) */}
      {silent ? subTicks.map((f, k) => <Sfx key={`subt${k}`} name="asmr-ui-tick-soft" at={f} volume={0.24 * vary(k + 3, 0.15)} />) : null}
      {/* a Phone brings its own slide on the cut: one moving sound there, not two. An fx film's cuts sound their
          transition instead (tools/ci/fx.mjs: a whip's long air, a push's whoomp, a stack's card ...) */}
      {fx
        ? cutSfx === null
          ? null
          : [
              ...(fx.openSfx ?? []).map((x, j) => <Sfx key={`fxopen${j}`} name={x.name} at={x.at} volume={x.volume} len={x.len} />),
              ...fx.cuts.flatMap((c, k) => (c?.sfx ?? []).map((x, j) => <Sfx key={`fxcut${k}-${j}`} name={x.name} at={x.at} volume={x.volume} len={x.len} />)),
            ]
        : cutSfx
          ? plans.slice(1).map((p, k) => (p.spec.type === 'Phone' ? null : <Sfx key={`cut${k}`} name={cutSfx} at={p.from - 3} volume={0.16} />))
          : null}
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
