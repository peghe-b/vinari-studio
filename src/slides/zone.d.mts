// Types of src/slides/zone.mjs (the Story slides' layout and safe zone).
export type Box = {x: number; y: number; w: number; h: number};
export type Pt = {x: number; y: number};
/** the text's width in px; caps false: plain letters (a body, a note, a callout), else the condensed Mtavruli */
export type Measure = (text: string, size: number, weight?: number, caps?: boolean) => number;
export type TypeSpec = {size?: number; max?: number; min?: number; weight: number; lh: number; w?: number; lines?: number; caps: boolean};
/** the flat phone: its body box, its display width d, its placement */
export type PhonePlace = {mode: 'whole' | 'rise'; d: number; x: number; y: number; w: number; h: number; natural: number};
export type CalloutPlace = {n: number; lines: string[]; badge: Box; box: Box; from: Pt; knee: Pt; target: Pt};
export type LoupePlace = {box: Box; crop: {x0: number; y0: number; x1: number; y1: number}; k: number; grow: number};
export declare const STORY: Readonly<{w: number; h: number; top: number; bottom: number; edge: number; side: number}>;
export declare const SLOT: number;
export declare const SETTLED: number;
export declare const FLAT: Readonly<{bez: number; r: number; sh: number}>;
export declare const bodyOf: (d: number) => {w: number; h: number};
export declare const WHOLE: Readonly<{foot: number; right: number; minH: number; maxD: number}>;
export declare const RISE: Readonly<{w: number; minVis: number; foot: number}>;
export declare const CALLOUTS_MAX: Readonly<{whole: number; rise: number}>;
export declare const BADGE: Readonly<{size: number; gap: number}>;
export declare const SLIDE_LAYOUTS: readonly string[];
export declare const PHONE_LAYOUTS: readonly string[];
export declare const PHONE_MODES: readonly string[];
export declare const TYPE: Readonly<Record<'kicker' | 'head' | 'title' | 'end' | 'ptitle' | 'body' | 'big' | 'note' | 'call', TypeSpec>>;
export declare const splitLines: (s: unknown) => string[];
export declare const estimate: Measure;
export declare const modeOf: (slide: unknown) => 'whole' | 'rise';
export declare const toFrame: (scr: Box, u: number, v: number) => Pt;
export type Layout = {
  layout: string;
  mode: 'whole' | 'rise' | null;
  boxes: Partial<Record<string, Box>>;
  sizes: {kicker?: string; head?: number; title?: number; big?: number; bodyLines?: string[]; noteLines?: string[]};
  phone: PhonePlace | null;
  screen: Box | null;
  outline: Box | null;
  tap: Pt | null;
  callouts: CalloutPlace[];
  loupe: LoupePlace | null;
  vis: number | null;
  problems: string[];
};
export declare const layoutSlide: (slide: unknown, opts?: {measure?: Measure; phoneD?: number | null; steps?: number | null}) => Layout;
export declare const layoutSet: (slides: unknown, opts?: {measure?: Measure}) => Layout[];
