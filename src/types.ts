// The video spec Claude writes (specs/<id>.json) and the voice timeline tools/vo.py derives.

export type SfxCue = {
  name: string; // file in public/sfx without extension, e.g. "asmr-knock" (docs/style.md, Sound)
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
  /** the aura drop: this beat opens on „არაუშავს!" after the hurt; the planner cuts, flashes and booms into its scene
   *  (tools/ci/fx.mjs, tools/ci/aura.mjs) */
  drop?: boolean;
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
  /** the film's OBJECT accent pair (tokens.ts ACCENT_PAIRS: cobalt, ember, saffron, aqua, violet, copper, and from v107 the
   *  promo palettes walnut-lamp, night-violet, cobalt-day, sunset-road that also tint the drawn world; "none" = no
   *  colour); unset = the film's number picks it (from ACCENT_FROM on) */
  accent2?: string;
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
  /** the written treatment (ci/prompt.md step 1, ci/promo-dna.md; tools/ci/treatment.mjs): from v131 check.mjs refuses a film
   *  without it. Nothing in the render reads it. */
  treatment?: Treatment;
  beats: Beat[];
};

/** One of the three pitches, scored on ci/promo-dna.md's rubric (0..12). */
export type TreatmentPitch = {logline: string; hook: string; score: number};
/** The written treatment (plan step 1.3, 2026-10-26: films made the way the promos were): three pitches, the best one kept
 *  and written out before a single beat. */
export type Treatment = {
  pitches: TreatmentPitch[]; // exactly 3
  picked: number; // the index of the kept pitch: the highest score, 8 or more
  logline: string; // one sentence: who wants what, what stands in the way, how it turns
  hero: string; // the ONE person (or car) the story follows, the same in the hook and the payoff
  obstacle: string;
  /** 0..2 s: what HAPPENS (never a calm question) and its sound (a public/sfx name heard in beat 0 by 2 s, or "bleep") */
  hook: {event: string; sound: string};
  act1: string[]; // the problem lived: 3 escalations or more, each worse than the last
  turn: string; // the beat before the reveal: silence, black, the twist
  reveal: {beat: number; what: string}; // the beat the answer arrives on (never a library Person, Drive or Windshield)
  /** the real captures in the order the film shows them (3 or more in a feature film; [] when the film shows no app) */
  screens: {screen: string; step: string}[];
  payoff: string; // the same hero at the end, changed
  signature?: string; // the one shot written for this idea (the film's own Film)
};

// ---- the motion plan (tools/ci/fx.mjs writes it, build-index embeds it; Promo reads it) ---------------------------
export type TransitionId = 'cut' | 'glitch' | 'whip' | 'push' | 'match' | 'pull' | 'stack' | 'wipe' | 'flash' | 'crash' | 'dip' | 'stamp' | 'fade' | 'drop' | 'slide' | 'iris';
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
  // the aura drop's hurt (tools/ci/fx.mjs): an even move, a grey dim grade, the push and darkening into the drop
  curve?: 'linear';
  grade?: 'hurt';
  inhale?: {at: number; frames: number; ds: number}; // scene frames
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
  motion?: 2; // the motion level (tokens.ts setMotion; tools/ci/fx.mjs from ci/fx.json "motion2From"): absent = 1, as made
  seed: string;
  on: boolean;
  opening: string;
  ending: string;
  openLead?: number; // scene 0's lead(ctx) (default -45)
  openSfx?: {name: string; at: number; volume: number; len?: number}[]; // the opening's own sounds (photo-slam's shutter and land), film frames
  scenes: {from: number; to: number}[]; // the plan's scene boundaries (Promo checks they match its own)
  cuts: (FxCut | null)[]; // index = into plan k (cuts[0] is null)
  cameras: FxCamera[];
  glitches: {at: number; len: number; k: number}[]; // film frames, for the lens (layers/VHS.tsx)
  // film frames, for layers/FxOverlay.tsx; `tone: "white"` (the aura drop's hit) is a white blow-out on both looks
  flashes: {at: number; curve: number[]; tone?: 'white'}[];
  whips?: {at: number; len: number}[]; // film frames where the whip blur runs (whip cuts, a Twist's whip)
  windows: [number, number][]; // tools/flicker.py's allowlist
  heavy: number;
  overlap: number;
  credits?: string[]; // the photo credit lines the film shows (public/photos/photos.json "credit")
  notes?: string[]; // what the planner changed or refused (build-index prints them)
  drop?: {beat: number; shot: number; at: number}; // the aura drop: the beat that says „არაუშავს!", its shot and its cut frame
};

/** The Reels/TikTok post text: one or two friendly lines like a friend talking (never a quote, no emoji,
 *  no "!", no call to action, no app name, no URL) and exactly 3 tags: 2 Georgian, 1 English. */
export type PostSpec = {
  description: string; // at most 220 characters
  tags: [string, string, string]; // "#მანქანა", "#ვინკოდი", "#carhacks"
};

/** A hand-drawn marker on the cover (src/cover/Marker.tsx): one kind, or two drawn together (["circle", "arrow"]). */
export type CoverMark = 'circle' | 'underline' | 'strike' | 'arrow' | 'tick';
/** One row of the cover's card: "bars" take an app icon and a fill 0..1, "numbers" a number as shown and its unit. */
export type CoverRow = {label: string; value: number | string; unit?: string; icon?: string; mark?: CoverMark | CoverMark[]};
/** The cover (src/Cover.tsx, src/cover/; 2026-10-26: purpose-built, black and white, NEVER a frame of the film). */
export type CoverSpec = {
  title?: string; // the headline: "|" breaks a line (default: the first spoken line); black and white only
  /** the ONE picture under the headline (src/cover/kinds.mjs): a data card, a real app capture in a tilted iPhone, a real
   *  CarPlay capture in the car's display, or the story's photos as polaroids. Left out (an older spec): the story's photo
   *  when it has one, else its last real screen, else the brand card */
  kind?: 'card' | 'screen' | 'carplay' | 'polaroid';
  card?: {type: 'bars' | 'numbers'; rows: CoverRow[]};
  /** a capture: public/screens/<src>.jpg ("screen") or public/screens/carplay/<src>.png ("carplay"); the marker on a row of it
   *  ({x, y, w, h} fractions of the capture, measured on it), the tilt (default: left on an even film number, right on odd) */
  screen?: {src: string; tilt?: 'left' | 'right' | 'flat'; mark?: {x: number; y: number; w: number; h: number; kind?: CoverMark | CoverMark[]}};
  photo?: string | string[]; // "polaroid": the photo(s) (public/photos, without .jpg); default the film's person photo
  note?: string; // one short caption line: inside the card, or under the picture
  pill?: string; // the pill top right (default „VINARI+")
  // ---- older specs (read, never written again) ----
  frame?: number; // GONE (2026-10-26): the cover never shows a film frame; ignored
  hook?: boolean; // GONE, ignored
  tag?: string; // the old topic tag (the pill now says VINARI+), ignored
  sub?: string; // the old quieter line under the headline: shown as the note when there is none
  zoom?: number; // the polaroid's push into the photo
  y?: number; // nudge the polaroids down (+) or up (-)
  polaroid?: boolean; // true: the polaroid kind (an older spec's way to ask for it)
};

/** One subtitle line of the voice (tools/vo.py). `bleep`: where a bleep cuts it off (s). `words`: when each whitespace token of
 *  `text` is first heard (s; vo.py since 2026-10-22); absent (an older timeline, a recording) = placed by letters (Subtitles.tsx). */
export type Chunk = {text: string; start: number; end: number; bleep?: number; words?: number[]};
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
  /** input prop (tools/covers.mjs, after a cover broke COVER_COLOUR or COVER_GRID): the cover takes the brand card */
  coverSafe?: boolean;
  /** the motion plan (tools/ci/fx.mjs, embedded by build-index); absent = the film as it always rendered */
  fx?: FxPlan;
  /** the subtitle's colour over the picture under it (tools/subtone.mjs; build-index embeds out/<id>.subtone.json while it
   *  matches the spec and the timeline); absent = the theme's own ink everywhere */
  subtone?: SubtoneIndex;
};

/** The subtitle's colour along the film, for one look: [frame, tone] from frame 0, each holding until the next ("white" is
 *  the dark film's ink, "ink" the light film's: tokens.ts SUB_TONE); a line takes the colour of the frame it is on.
 *  `wide`: the same for the 16:9 frame's line (L.subtitleYWide). */
export type SubtoneIndex = {
  theme: 'dark' | 'light';
  track: [number, 'white' | 'ink'][];
  wide?: [number, 'white' | 'ink'][];
  /** the frame guards (src/lib/guard.mjs, a film from GUARD_FROM on): [frame, 0 | 1] from frame 0, 1 where the line's colour
   *  reads on less than PLATE_KEEP of its box in BOTH colours (it sits on its soft plate there, rarely); `plateWide` the same for the 16:9 line */
  plate?: [number, 0 | 1][];
  plateWide?: [number, 0 | 1][];
  /** the polish guards (a film from POLISH_FROM on): the meta line's tone per side, [frame, 'own' | 'white' | 'ink'] from
   *  frame 0 ('own' the theme's grey; black or white where the grey does not read on the picture under it) */
  meta?: {l: [number, 'own' | 'white' | 'ink'][]; r: [number, 'own' | 'white' | 'ink'][]};
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
