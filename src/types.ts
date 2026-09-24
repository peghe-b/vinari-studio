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
  meta?: [string, string?]; // top mono bar: left label, optional right label
  scene?: SceneSpec; // omitted = the previous scene keeps running through this beat
  sfx?: SfxCue[];
};

export type VideoSpec = {
  id: string;
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
  music?: {src: string; volume?: number; duck?: number} | null; // none by default: the sound is the ASMR kit
  cutSfx?: string | null; // sound on every scene cut, default "asmr-air" (Promo, volume 0.16); null = silent cuts
  vhs?: number; // the VHS layer, 0..1 (default VHS_DEFAULT 0.38), 0 = off (src/layers/VHS.tsx)
  narration?: boolean; // false = a silent film: no voice track, the subtitle line is the primary text
  theme?: 'dark' | 'light'; // "light" = the app's light look (tokens.ts setTheme); default the black film
  /** the designed Reels cover (src/Cover.tsx, tools/covers.mjs); a bare number is the picture's frame */
  cover?: number | CoverSpec;
  /** the text posted with the video (tools/build-index.mjs lints it; the studio workflow writes it to post.json) */
  post?: PostSpec;
  beats: Beat[];
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
};
