// The video spec Claude writes (specs/<id>.json) and the voice timeline tools/vo.py derives.

export type SfxCue = {
  name: string; // file in public/sfx without extension, e.g. "asmr-knock" (CLAUDE.md, Sound)
  at?: number; // seconds from the beat start
  chunk?: number; // or: at the start of this subtitle chunk of the beat
  volume?: number;
};

export type SceneSpec = {type: string; [k: string]: unknown};

export type Beat = {
  say: string; // what the voice says; "|" splits subtitle chunks
  show?: string; // on-screen subtitle text, same number of "|" chunks
  gap?: number;
  hold?: number;
  voice?: string;
  rate?: string;
  pitch?: string;
  style?: string; // this beat's own Gemini direction (tools/vo.py, in Georgian): a second request
  meta?: [string, string?]; // top mono bar: left label, optional right label
  scene?: SceneSpec; // omitted = the previous scene keeps running through this beat
  /** mid-beat cuts (fx films): a new scene starts on that chunk's first frame of this beat, so one long sentence can
   *  carry two or three shots without an extra voice pause (src/Promo.tsx planScenes, tools/ci/fx.mjs) */
  cuts?: {chunk: number; scene: SceneSpec}[];
  /** this beat is the film's plot twist: the planner may crash-cut into its scene (tools/ci/fx.mjs) */
  twist?: boolean;
  sfx?: SfxCue[];
};

export type VideoSpec = {
  id: string;
  /** the studio category: an id from ci/categories.json (tools/build-index.mjs checks it). The cloud studio
   *  keeps every video of a category on its own idea by it; nothing in the film reads it. */
  category?: string;
  title?: string;
  validUntil?: string; // a spec whose facts expire (e.g. the 1 January customs step)
  lang?: 'ka' | 'en' | 'ru';
  // voice engine (tools/vo.py): Gemini model pin, delivery direction, request split, edge-tts fallback
  geminiModel?: string;
  style?: string;
  geminiSplit?: 'chunk' | 'sentence';
  chunkGap?: number;
  fallbackVoice?: string;
  translationNotes?: Record<string, string>;
  variantOf?: string; // hook variants (tools/variants.mjs)
  hook?: {n: number; name: string; fields: string[]};
  voice?: string;
  sentenceGap?: number;
  gap?: number;
  rate?: string;
  leadIn?: number; // seconds of silence before the first word (tools/vo.py, default 0.1)
  tail?: number; // seconds of silence after the last word (tools/vo.py, default 0.35)
  accent?: 'brand' | 'yellow';
  /** the bed under the film (Promo): tools/build-index.mjs puts ci/music.json's on every third film from v63 when the
   *  spec has none or null; a spec's own wins, and its "music": false reaches Promo as null (never false) */
  music?: {src: string; volume?: number; duck?: number} | null;
  cutSfx?: string | null; // sound on every scene cut, default "asmr-air" (Promo, volume 0.16); null = silent cuts
  vhs?: number; // the VHS layer, 0..1 (default VHS_DEFAULT 0.38), 0 = off (src/layers/VHS.tsx)
  narration?: boolean; // false = a silent film: no voice track, the subtitle line is the primary text
  theme?: 'dark' | 'light'; // "light" = the app's light look (tokens.ts setTheme); default the black film
  /** the designed Reels cover (src/Cover.tsx, tools/covers.mjs); a bare number is the picture's frame */
  cover?: number | CoverSpec;
  /** the text posted with the video (tools/build-index.mjs lints it; the studio workflow writes it to post.json) */
  post?: PostSpec;
  /** the motion layer (camera, transitions, openings, endings: src/lib/camera.tsx, src/lib/fx.ts, tools/ci/fx.mjs):
   *  true or false forces it; unset follows ci/fx.json (new films from a set number on). false renders as before. */
  fx?: boolean;
  /** the first 1.5 s (fx films): "cold-punch" | "rewind" | "photo-slam" | "mark-subject" | "question-slam" | "classic";
   *  unset = the planner picks one that fits scene 0 */
  opening?: string;
  /** the last seconds (fx films): "card" | "stamp" | "loop" | "callback"; unset = the planner picks */
  ending?: string;
  beats: Beat[];
};

// ---- the motion plan (tools/ci/fx.mjs writes it, build-index embeds it; Promo reads it) ---------------------------
export type TransitionId = 'cut' | 'glitch' | 'whip' | 'push' | 'match' | 'pull' | 'stack' | 'wipe' | 'flash' | 'crash' | 'dip' | 'stamp';
export type CamMove = 'push' | 'pull' | 'drift-l' | 'drift-r' | 'rise' | 'sink' | 'arc-l' | 'arc-r' | 'still';
export type CamClass = 'band' | 'free' | 'self' | 'legacy';
export type CameraSpec = {
  move?: CamMove;
  amount?: number; // push/pull scale gain (band 0.035, free 0.008)
  travel?: number; // stage px for a drift, rise, sink or arc (band 22, free 4)
  roll?: number; // degrees over the scene for an arc (band 0.7)
  shake?: number; // 0..1 handheld micro-shake (band only)
  origin?: {x: number; y: number}; // stage px pivot (540, L.contentMid)
  kicks?: (number | string)[]; // chunk indexes or "1.2s": impact kicks (merged with the scene's own)
  settle?: {dx?: number; dy?: number; ds?: number; frames: number}; // velocity carried in from a transition or an opening
};
export type FxCut = {
  at: number; // the cut's film frame (= the incoming plan's from)
  type: TransitionId;
  dir?: 1 | -1;
  pre: number; // frames the incoming scene shows (frozen on its frame 0) before the cut
  post: number; // frames the outgoing scene keeps playing (muted) after the cut
  order: 'in-over' | 'out-over';
  from?: {x: number; y: number}; // match: the outgoing's point (stage px)
  to?: {x: number; y: number}; // match: the incoming's point
  sfx: {name: string; at: number; volume: number; len?: number}[]; // the transition's sounds (film frames), instead of the cut's air
};
export type FxCamera = CameraSpec & {cls: CamClass; kicks: number[]}; // kicks in scene frames (the spec's own; the scene adds its built-ins)
export type FxPlan = {
  v: 1;
  seed: string;
  on: boolean;
  opening: string;
  ending: string;
  openLead?: number; // scene 0's lead(ctx) (default -45)
  scenes: {from: number; to: number}[]; // the plan's scene boundaries (Promo checks they match its own)
  cuts: (FxCut | null)[]; // index = into plan k (cuts[0] is null)
  cameras: FxCamera[];
  glitches: {at: number; len: number; k: number}[]; // film frames, for the lens (layers/VHS.tsx)
  flashes: {at: number; curve: number[]}[]; // film frames, for layers/FxOverlay.tsx
  whips?: {at: number; len: number}[]; // film frames where the whip blur runs (whip cuts, a Twist's whip)
  windows: [number, number][]; // tools/flicker.py's allowlist
  heavy: number;
  overlap: number;
  credits?: string[]; // the photo credit lines the film shows (public/photos/photos.json "credit")
  notes?: string[]; // what the planner changed or refused (build-index prints them)
};

/** The Reels/TikTok post text: one or two friendly lines like a friend talking (never a quote, no emoji,
 *  no "!", no call to action, no app name, no URL) and exactly 3 tags: 2 Georgian, 1 English. */
export type PostSpec = {
  description: string; // at most 220 characters
  tags: [string, string, string]; // "#მანქანა", "#ვინკოდი", "#carhacks"
};

export type CoverSpec = {
  frame?: number; // the film frame the picture shows (default: 70% into the hook scene)
  title?: string; // the headline: "|" breaks a line (default: the first spoken line); black and white only
  tag?: string; // the small tag top right (default: the first meta label)
  sub?: string; // an optional quieter line under the headline
  zoom?: number; // the picture's scale (default 1.15 on a Wire3D scene, else 1)
  y?: number; // nudge the picture down (+) or up (-), frame pixels
};

export type Chunk = {text: string; start: number; end: number};
export type TimelineBeat = {i: number; src?: string; start: number; end: number; speechStart: number; speechEnd: number; chunks: Chunk[]};
export type Timeline = {id: string; voice: string; model?: string; duration: number; beats: TimelineBeat[]};

export type VideoProps = {
  spec: VideoSpec;
  timeline: Timeline;
  /** input prop (--props='{"silent":true}', make.sh --silent): no voice track, the subtitle line is
   *  the primary text. The same as spec "narration": false. */
  silent?: boolean;
  /** input prop (--props='{"safe":true}') or env REMOTION_SAFE_OVERLAY=1: draw the Reels safe zone. */
  safe?: boolean;
  /** input prop: overrides spec "vhs" (0..1), for A/B stills and render benchmarks. */
  vhs?: number;
  /** input prop (--props='{"theme":"light"}', make.sh --light): overrides spec "theme". */
  theme?: 'dark' | 'light';
  /** the motion plan (tools/ci/fx.mjs, embedded by build-index); absent = the film as it always rendered */
  fx?: FxPlan;
};

/** What every scene component receives besides its own props. */
export type SceneCtx = {
  dur: number; // frames
  index: number; // scene number, 0-based
  count: number;
  /** subtitle chunk start frames relative to the scene start, across all beats of the scene */
  cues: number[];
  /** beat start frames relative to the scene start */
  beats: number[];
  /** [first word, last word] frames of every beat of the scene, relative to the scene start:
   *  a scene that makes its own rhythm (Wave) plays it softer under the voice */
  speech: [number, number][];
  /** scene 0 of an fx film: its opening template and lead (scenes/common.tsx lead()) */
  open?: {id: string; lead: number};
};
