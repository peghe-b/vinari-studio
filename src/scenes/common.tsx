import React from 'react';
import {Audio, Img, interpolate, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {rand, typeOn} from '../lib/anim';
import {capsLatin} from '../lib/format';
import kit from '../../public/sfx/asmr.json';
import coherence from '../data/sfx-coherence.json';
import {C, F, isLight, L, MIX_VOICED, T} from '../tokens';
import type {SceneCtx} from '../types';

/** Frame (relative to the scene) where subtitle chunk `at` starts. Numbers index chunks
 *  across the whole scene; a string like "1.5s" is seconds from the scene start. */
export const cueFrame = (ctx: SceneCtx, at: unknown, fallback = 0): number => {
  if (typeof at === 'number') {
    const f = ctx.cues[Math.min(Math.max(0, at), ctx.cues.length - 1)] ?? fallback;
    // the video's first chunk is already on screen at frame 0 (thumbnail, loop point)
    return ctx.index === 0 && at === 0 ? Math.min(f, lead(ctx)) : f;
  }
  if (typeof at === 'string' && at.endsWith('s')) return Math.round(parseFloat(at) * 30);
  return fallback;
};

/** Frame 0 of the first scene must already be composed (it is the thumbnail and the loop
 *  point), so the first scene's entrances start slightly in the past. */
export const lead = (ctx: SceneCtx) => (ctx.index === 0 ? -45 : 0);

/** Frames a later scene's entrance is already under way on the cut frame. */
export const CUT_IN = 10;

/** Where a scene's ENTRANCE starts (visuals only). The first scene is composed at frame 0 (lead);
 *  a later scene starts its entrance CUT_IN frames before the cut, so the hard cut lands on a
 *  picture and never on a dip to black. Keep sounds on lead(ctx): the cut is the event, and a
 *  cue before frame 0 would be lost. */
export const entrance = (ctx: SceneCtx) => (ctx.index === 0 ? lead(ctx) : -CUT_IN);

/** True while frame f is inside one of the scene's voice spans (with a small margin). */
export const inSpeech = (ctx: SceneCtx, f: number, margin = 2) => (ctx.speech ?? []).some(([a, z]) => f >= a - margin && f <= z + margin);

// ---- sound -------------------------------------------------------------------------------------
// The kit is public/sfx/asmr-*.wav (tools/asmr.mjs, manifest public/sfx/asmr.json): close, soft,
// dry, no melody. Every file is balanced against the voice for volume 0.5 (asmr-air for 0.16, the
// cut) and every hit sits 3 ms into its file, so `at` is simply the frame the thing happens.
// House rules: at most ~3 sounds at once, nothing as loud as the voice, repeated hits vary a little.

// The kit was balanced against the voice file as mono (-22.7 LUFS); the film plays that voice on
// both channels, 3 dB louder. +3 dB on every asmr- cue keeps the kit's balance (measured on the mix).
const ASMR_TRIM = 1.41;

// ---- the mix -------------------------------------------------------------------------------------
// The kit's balance is written in its manifest: loudnessVsVoiceLU is a sound's loudest 100 ms at its
// suggestedVolume against the voice asmr.mjs balanced it for (VOICE_LUFS -22.7); with ASMR_TRIM that
// is a voice of KIT_REF (-19.7) LUFS as the film plays it (checked on v10's stems: the predicted and
// the measured events agree within 0.6 LU). Real voices differ (edge-tts about -23, Gemini about -17),
// so a fixed kit sat 12-29 LU under a Gemini voice: far away, where the silent cut (lifted to -20
// LUFS as a whole) had it close and clear.
// Promo calls setMix() once per render, before any scene renders (like setTheme), with the voice's
// measured loudness (layers/voiceLevel.ts). A voiced film then plays every cue (Sfx, Haptic, Land,
// TypeSfx) `lift` dB over the kit's balance measured against THIS voice, and no single cue's loudest
// 100 ms closer than `ceil` LU under the voice (a thump or the end card's hit is trimmed to it, the
// quiet sounds keep the whole lift). `dip`: a sound still ringing when a word is spoken steps back to
// this gain (its first 4 frames are never touched, so a hit ON a word keeps its attack); `room` is
// the room tone's lift in dB. The silent film plays the kit as balanced (make.sh lifts the cut).
type KitRow = {name: string; suggestedVolume?: number; loudnessVsVoiceLU?: number};
/** A sound's loudest 100 ms at volume 1 against KIT_REF (LU), from the manifest. */
const KIT_LEVEL = new Map(
  (kit as KitRow[]).filter((r) => typeof r.loudnessVsVoiceLU === 'number').map((r) => [r.name, (r.loudnessVsVoiceLU as number) - 20 * Math.log10(r.suggestedVolume ?? 0.5)]),
);
export const KIT_REF = -19.7;
type Mix = {sfx: number; room: number; dip: number; ceil: number; stack: number; lift: number; words: [number, number][]; end: number};
const MIX: Mix = {sfx: 1, room: 1, dip: 1, ceil: Infinity, stack: Infinity, lift: 0, words: [], end: Infinity};
/** voice: the voice's integrated loudness as played (LUFS), or null for the silent film (the kit as
 *  balanced). end: the film's length in frames: a cue still ringing fades out over the last END_FADE
 *  frames. mute: no kit at all (Promo's "voice" stem for make.sh --mix). */
export const setMix = (m: {voice: number | null; end?: number; lift?: number; room?: number; dip?: number; ceil?: number; stack?: number; words?: [number, number][]; mute?: boolean}) => {
  if (m.voice === null) {
    Object.assign(MIX, {sfx: 1, room: 1, dip: 1, ceil: Infinity, stack: Infinity, lift: 0, words: [], end: m.end ?? Infinity});
    return;
  }
  const lift = m.lift ?? 0;
  // the kit sits (voice - KIT_REF) dB louder to keep its balance against this voice, plus the lift
  const toVoice = m.voice - KIT_REF;
  Object.assign(MIX, {
    sfx: m.mute ? 0 : 10 ** ((toVoice + lift) / 20),
    room: m.mute ? 0 : 10 ** ((toVoice + (m.room ?? 0)) / 20),
    dip: m.dip ?? 1,
    ceil: m.ceil ?? Infinity,
    // the stack ceiling belongs to the voiced mix: Promo passes lift/ceil/dip/room, the stack comes from tokens
    stack: m.stack ?? MIX_VOICED.stack,
    lift,
    words: m.words ?? [],
    end: m.end ?? Infinity,
  });
};
export const mix = (): Readonly<Mix> => MIX;
/** The ceiling's trim for one cue (1 = none): its loudest 100 ms stays `ceil` LU under the voice. */
const ceilTrim = (name: string, volume: number) => {
  const l1 = KIT_LEVEL.get(name);
  if (!Number.isFinite(MIX.ceil) || l1 === undefined || !(volume > 0)) return 1;
  const over = l1 + 20 * Math.log10(volume) + MIX.lift + MIX.ceil; // > 0: closer than ceil
  return over > 0 ? 10 ** (-over / 20) : 1;
};
// ---- the stack ceiling ---------------------------------------------------------------------------
// `ceil` holds each cue alone; cues that land together add up. A phone tap and its haptic on one frame
// came to 2.3 LU under the voice, a flap board's last flap, detent, land thump and haptic to 3.4, and
// the hook's thump and heavy haptic to 3.5 (v11, 2026-09-24), against 5 for any one of them. So every
// voiced cue also registers itself (its film frame and its loudest 100 ms against the voice, after its
// own ceiling), and the film's loudest 100 ms is estimated at every hit: a 100 ms window starting on
// that hit takes the cues landing in it (WINDOW: the share of a cue's loudest 100 ms that falls into a
// window starting d frames before (d > 0) or after (d < 0) its hit; fitted to v11's flap board, a hit
// every 2 frames) plus, for two cues at most a frame apart, their coherence: two short hits that both
// open with a low thump 3 ms in add up in phase (src/data/sfx-coherence.json, tools/sfx-coherence.py:
// a tap and a light haptic rho 0.8, so 2.7 dB over the tap alone where a power sum says 0.7). Where a
// window comes closer than MIX.stack LU under the voice, the cues in it step back together, just
// enough: a lone cue, and every cue of a sparse passage, keeps its level.
// Determinism (three Chrome tabs render different frames, and a cue's volume must come out the same
// in each): a cue is summed only with the cues that are always mounted together with it: its own
// scene's and the film's own (Promo: the hook, the cuts, the subtitle haptics, the meta keys, spec
// "sfx"). Film cues are held among themselves only (they sound in every scene), scene cues against
// their scene plus the film's. A scene mounts all of its cues on every frame, so the registry is
// complete after one commit; each cue re-renders once when it grows (useSyncExternalStore, flushed in
// a layout effect, synchronously, before the frame is captured).
const WINDOW: Record<number, number> = {[-4]: 0.03, [-3]: 0.1, [-2]: 0.3, [-1]: 0.5, 0: 1, 1: 0.9, 2: 0.8, 3: 0.4, 4: 0.15};
const STACK_FLOOR = 0.1; // a stack never steps back more than 10 dB (power)
const pairKey = (a: string, b: string, d: number) => (a < b ? `${a}|${b}|${d}` : `${b}|${a}|${d}`);
const RHO = new Map((coherence as [string, string, number, number][]).map(([a, b, d, r]) => [pairKey(a, b, d), r]));
type Cue = {scene: number | null; name: string; at: number; level: number};
const CUES = new Map<string, Cue>();
let cueStamp = 0; // bumps on every change of the registry (read by the trims cache at once)
let cueVersion = 0; // bumps when a change is flushed (re-renders the subscribed cues)
let pending = false;
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
const cueSnapshot = () => cueVersion;
const flushCues = () => {
  if (!pending) return;
  pending = false;
  cueVersion++;
  listeners.forEach((fn) => fn());
};
const registerCue = (id: string, c: Cue) => {
  const o = CUES.get(id);
  if (o && o.scene === c.scene && o.name === c.name && o.at === c.at && Math.abs(o.level - c.level) < 1e-6) return;
  CUES.set(id, c);
  cueStamp++;
  pending = true;
};
const dropCue = (id: string) => {
  if (!CUES.delete(id)) return;
  cueStamp++;
  pending = true;
  flushCues();
};
let trimsAt = -1;
let trims = new Map<string, number>();
/** Amplitude trims for every registered cue, recomputed when the registry changed. */
const stackTrims = () => {
  if (trimsAt === cueStamp) return trims;
  trimsAt = cueStamp;
  trims = new Map();
  const T = 10 ** (-MIX.stack / 10); // the power a window may reach, relative to the voice
  const film: [string, Cue][] = [];
  const byScene = new Map<number, [string, Cue][]>();
  for (const e of CUES) {
    if (e[1].scene === null) film.push(e);
    else byScene.set(e[1].scene, [...(byScene.get(e[1].scene) ?? []), e]);
  }
  type Held = {name: string; at: number; p: number};
  const solve = (movable: [string, Cue][], fixed: Held[]) => {
    const mv: (Held & {id: string})[] = movable.map(([id, c]) => ({id, name: c.name, at: c.at, p: 10 ** (c.level / 10)}));
    const need = [...new Set([...mv, ...fixed].map((c) => c.at))].map((t) => {
      // the window starting on hit t: what lands in it, and the in-phase part of two hits at most a frame apart
      const inWin = (c: Held) => WINDOW[c.at - t] ?? 0;
      let F = 0; // the film's cues (held)
      let V = 0; // this scene's cues (they step back)
      for (const c of fixed) F += c.p * inWin(c);
      for (const c of mv) V += c.p * inWin(c);
      const all: (Held & {id?: string})[] = [...fixed, ...mv].filter((c) => c.at - t >= 0 && c.at - t <= 1);
      for (let i = 0; i < all.length; i++) {
        for (let j = i + 1; j < all.length; j++) {
          const r = RHO.get(pairKey(all[i].name, all[j].name, Math.abs(all[i].at - all[j].at))) ?? 0;
          const x = 2 * r * Math.sqrt(all[i].p * all[j].p);
          if (all[i].id !== undefined && all[j].id !== undefined) V += x;
          else F += x; // a film cue in the pair: counted as held (the safe side)
        }
      }
      return {t, g2: V > 0 && F + V > T ? Math.max(STACK_FLOOR, (T - F) / V) : 1};
    });
    for (const c of mv) {
      let g2 = 1;
      for (const n of need) if ((WINDOW[c.at - n.t] ?? 0) > 0) g2 = Math.min(g2, n.g2);
      trims.set(c.id, Math.sqrt(g2));
    }
  };
  solve(film, []);
  const held: Held[] = film.map(([id, c]) => ({name: c.name, at: c.at, p: 10 ** (c.level / 10) * (trims.get(id) ?? 1) ** 2}));
  for (const cues of byScene.values()) solve(cues, held);
  return trims;
};
/** A cue's loudest 100 ms against the voice (LU, negative = under it) at `volume`, after its own
 *  ceiling; null when the manifest does not know the sound or the mix is not voiced. */
const cueLevel = (name: string, volume: number) => {
  const l1 = KIT_LEVEL.get(name);
  if (!Number.isFinite(MIX.stack) || l1 === undefined || !(volume > 0)) return null;
  return l1 + 20 * Math.log10(volume) + MIX.lift + 20 * Math.log10(ceilTrim(name, volume));
};

const END_FADE = 12; // frames: nothing is cut off mid-ring on the last frame
const DIP_RAMP = 3; // frames: the step back fades in and out, never a click
const ATTACK = 4; // frames of a cue the dip never touches (its hit)
/** The dip at absolute frame f: 1 between phrases, MIX.dip inside a word span (3-frame ramps). */
const wordDip = (f: number) => {
  let inside = 0;
  for (const [a, z] of MIX.words) {
    if (f < a - DIP_RAMP || f > z + DIP_RAMP) continue;
    inside = Math.max(inside, interpolate(f, [a - DIP_RAMP, a, z, z + DIP_RAMP], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
    if (inside >= 1) break;
  }
  return 1 - (1 - MIX.dip) * inside;
};
/** Where the current scene starts on the film's timeline (Promo's SceneHost provides it): a cue's
 *  own frame plus this is its absolute frame, which the word dip needs. null outside a scene: the
 *  film's own cues (Promo), which the stack ceiling tells apart from a scene's. */
export const SceneStart = React.createContext<number | null>(null);

/** public/sfx file for a sound name: the app's own UI sounds are .m4a, everything made for video
 *  (asmr-, synth-, kenney-) is .wav; a name with its own extension ("kenney-x.ogg") is kept. */
export const sfxFile = (name: string) =>
  staticFile(`sfx/${name}${/\.[a-z0-9]{2,4}$/i.test(name) ? '' : name.startsWith('app-') ? '.m4a' : '.wav'}`);

/** Deterministic level spread for repeated hits (flaps, ticks, keys): 1 - spread .. 1. */
export const vary = (seed: number, spread = 0.25) => 1 - spread * rand(seed * 7.13 + 0.37);

// ---- haptics -------------------------------------------------------------------------------------
// The film's feedback language: asmr-haptic-* is what an iPhone's Taptic Engine sounds like on
// camera (a 1-4 cycle low burst stopped dead, a faint click on top, a touch of case buzz so a phone
// speaker still hears the click). Every visual event gets ONE haptic, chosen by what the event
// means, the way colour only carries data:
//   selection  a step: a subtitle chunk changes (Promo), a day counts, a row passes, a band moves on
//   light      a small thing lands: a tap on glass, a dot, a row, a highlight band, a title line
//   medium     a number or a value lands, always with asmr-land (<Land>)
//   rigid      something locks or snaps: brackets, a viewfinder, a cross
//   soft       something settles: a phone at rest, a card, the end card's mark
//   success    a green check (tone up) or a confirmed good event; the notification's double buzz
//   error      a red mark (tone down): something costs the viewer. Never on neutral content
//   heavy      once per film: the hook frame (Promo)
// They sit 16-24 LU under the voice at 0.5; these defaults keep them felt, never loud. Haptics are
// low sounds: on a phone speaker mostly their click is heard, on earbuds the body too.
export type HapticKind = 'selection' | 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' | 'success' | 'warning' | 'error';
const HAPTIC_VOL: Record<HapticKind, number> = {selection: 0.3, light: 0.4, medium: 0.46, heavy: 0.4, rigid: 0.38, soft: 0.46, success: 0.42, warning: 0.38, error: 0.36};

export const Haptic: React.FC<{kind: HapticKind; at: number; volume?: number}> = ({kind, at, volume}) => (
  <Sfx name={`asmr-haptic-${kind}`} at={at} volume={volume ?? HAPTIC_VOL[kind]} />
);

/** A number or a value lands: the felt thump with its tiny wood knock (asmr-land) and a medium
 *  haptic on the same frame. `volume` is the thump's. */
export const Land: React.FC<{at: number; volume?: number}> = ({at, volume = 0.56}) => (
  <>
    <Sfx name="asmr-land" at={at} volume={volume} />
    <Haptic kind="medium" at={at} />
  </>
);

/** The haptic of a mark in a data tone: green success, red error, anything else `fallback`. */
export const toneHaptic = (tone: unknown, fallback: HapticKind = 'light'): HapticKind => (tone === 'up' ? 'success' : tone === 'down' ? 'error' : fallback);

// SFX_AUDIT=1 (a render's envVariables) prints every cue to the browser log, so a tool can read
// the whole mix without rendering it. Never set in a normal render.
const auditing = () => (globalThis as {process?: {env?: Record<string, string | undefined>}}).process?.env?.SFX_AUDIT === '1';

type SfxProps = {
  name: string; // file in public/sfx without extension, e.g. "asmr-land"
  at: number; // frame of the event, relative to the scene (or the video, in Promo)
  volume?: number; // 0.5 = the kit's balance against the voice
  len?: number; // cut after this many frames with a short fade: a key-roll as long as its label
  fade?: number; // fade-out frames at the cut (default 3)
};

export const Sfx: React.FC<SfxProps> = ({name, at, volume = 0.5, len, fade = 3}) => {
  const frame = useCurrentFrame();
  const scene = React.useContext(SceneStart);
  const start = scene ?? 0;
  const id = React.useId();
  React.useSyncExternalStore(subscribe, cueSnapshot, cueSnapshot); // re-render when the stack around this cue changes
  React.useLayoutEffect(() => flushCues()); // after every commit: publish what registered while rendering
  React.useLayoutEffect(() => () => dropCue(id), [id]);
  const from = Math.round(at);
  const n = len === undefined ? undefined : Math.round(len);
  const sounds = from >= 0 && volume > 0 && (n === undefined || n >= 1) && MIX.sfx > 0;
  const level = sounds ? cueLevel(name, volume) : null;
  if (level !== null) registerCue(id, {scene, name, at: start + from, level});
  else if (CUES.has(id)) {
    CUES.delete(id);
    cueStamp++;
    pending = true;
  }
  const stack = level !== null ? (stackTrims().get(id) ?? 1) : 1;
  const gain = volume * (name.startsWith('asmr-') ? ASMR_TRIM : 1) * MIX.sfx * ceilTrim(name, volume) * stack;
  if (auditing()) console.log(`SFX ${JSON.stringify({name, at: from, abs: start + from, scene, frame, volume: +volume.toFixed(3), gain: +gain.toFixed(4), level: level === null ? null : +level.toFixed(2), stack: +stack.toFixed(3), len: n ?? null, fade})}`);
  if (from < 0 || !(gain > 0) || (n !== undefined && n < 1)) return null;
  const f0 = n === undefined ? 0 : n - Math.max(1, Math.min(fade, n));
  const dips = MIX.dip < 1 && MIX.words.length > 0;
  const at0 = start + from; // the cue's film frame
  const ends = MIX.end - at0 < 150; // a cue in the film's last 5 s may still ring on the last frame
  const tail = (f: number) =>
    (n === undefined ? 1 : interpolate(f, [f0, n], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})) *
    (ends ? interpolate(at0 + f, [MIX.end - END_FADE, MIX.end - 1], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 1);
  // f counts from the cue's own start: start + from + f is the film's frame. The hit itself (the
  // first ATTACK frames) never dips; what still rings under a word eases back over 3 frames.
  const dip = (f: number) => 1 - (1 - wordDip(at0 + f)) * interpolate(f, [ATTACK, ATTACK + 3], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const vol = !dips && !ends && n === undefined ? gain : (f: number) => gain * tail(f) * (dips ? dip(f) : 1);
  return (
    <Sequence from={from} durationInFrames={n} layout="none" name={name}>
      <Audio src={sfxFile(name)} volume={vol} />
    </Sequence>
  );
};

const ROLL = 13; // asmr-key-roll: 8 soft keys in 0.42 s
/** Soft keys under a label typing on at `cpf` characters per frame: one key-roll per 13 frames of
 *  typing, cut where the typing stops. A long line gets two rolls, the second softer, then types on
 *  in silence (a typewriter track under the voice is clutter). A label typed before frame 0 is silent. */
export const TypeSfx: React.FC<{text: string; at: number; cpf?: number; volume?: number; rolls?: number}> = ({text, at, cpf = 1.4, volume = 0.28, rolls: most = 2}) => {
  const dur = Math.ceil(Array.from(text).length / Math.max(0.1, cpf));
  const rolls = Math.min(most, Math.ceil(dur / ROLL));
  return (
    <>
      {Array.from({length: rolls}, (_, i) => {
        const s = Math.round(at) + i * ROLL;
        const e = Math.min(Math.round(at) + dur, s + ROLL) + 2; // the last key's release
        if (e <= 2) return null;
        const s0 = Math.max(0, s);
        return <Sfx key={i} name="asmr-key-roll" at={s0} volume={volume * (i ? 0.7 : 1)} len={e - s0} />;
      })}
    </>
  );
};

type SfxVol = number | false; // a label's typing sound: its volume, or false for silence

export const SourceLine: React.FC<{text?: string; at: number; y?: number; align?: 'left' | 'center'; sfx?: SfxVol}> = ({text, at, y = 1060, align = 'left', sfx = 0.24}) => {
  const frame = useCurrentFrame();
  if (!text) return null;
  const shown = capsLatin(text);
  return (
    <div
      style={{
        position: 'absolute',
        top: y,
        left: L.side,
        right: L.side,
        textAlign: align,
        fontFamily: F.mono,
        fontSize: T.source,
        letterSpacing: '0.04em',
        color: C.ink3,
        whiteSpace: 'nowrap',
      }}
    >
      {typeOn(shown, frame, at, 1.6)}
      {sfx ? <TypeSfx text={shown} at={at} cpf={1.6} volume={sfx} /> : null}
    </div>
  );
};

export const MonoLabel: React.FC<{text: string; at: number; style?: React.CSSProperties; color?: string; size?: number; sfx?: SfxVol}> = ({
  text,
  at,
  style,
  color = C.ink2,
  size = T.label,
  sfx = 0.28,
}) => {
  const frame = useCurrentFrame();
  const shown = capsLatin(text);
  return (
    <div style={{fontFamily: F.mono, fontSize: size, letterSpacing: '0.05em', color, whiteSpace: 'nowrap', ...style}}>
      {typeOn(shown, frame, at, 1.2)}
      {sfx ? <TypeSfx text={shown} at={at} cpf={1.2} volume={sfx} /> : null}
    </div>
  );
};

// ---- brand ----------------------------------------------------------------------------------------
// public/brand/mark.svg and wordmark.svg are one flat colour, the dark film's ink (#EDEDF2). On paper
// they turn to ink (#0B0B0E, never pure black) with a filter on the same <Img> (Remotion waits for an
// <Img> to load; a CSS mask it would not wait for).
const BRAND = {mark: {file: 'brand/mark.svg', w: 768, h: 671}, wordmark: {file: 'brand/wordmark.svg', w: 267, h: 68}} as const;
export const brandFile = (kind: keyof typeof BRAND) => staticFile(BRAND[kind].file);

export const BrandMark: React.FC<{kind: keyof typeof BRAND; width?: number; height?: number; style?: React.CSSProperties}> = ({kind, width, height, style}) => {
  const b = BRAND[kind];
  const w = width ?? (height !== undefined ? (height * b.w) / b.h : b.w);
  const h = height ?? (w * b.h) / b.w;
  return <Img src={brandFile(kind)} style={{width: w, height: h, flex: 'none', filter: isLight() ? 'brightness(0) invert(0.045)' : undefined, ...style}} />;
};
