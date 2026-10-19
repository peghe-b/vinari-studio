// Types of src/slides/zone.mjs (the Story slides' layout and safe zone).
export type Box = {x: number; y: number; w: number; h: number};
export type Measure = (text: string, size: number, weight?: number) => number;
export type PhonePlace = {x: number; w: number; foot: number; natural: number; yaw: number; pitch: number; roll: number};
export declare const STORY: Readonly<{w: number; h: number; top: number; bottom: number; side: number}>;
export declare const SLOT: number;
export declare const SETTLED: number;
export declare const PHONE: Readonly<{min: number; max: number}>;
export declare const POSE_MAX: Readonly<{yaw: number; pitch: number; roll: number}>;
export declare const PHONE_K: Readonly<{h: number; w: number}>;
export declare const SLIDE_LAYOUTS: readonly string[];
export declare const PHONE_LAYOUTS: readonly string[];
export declare const TYPE: Readonly<Record<'kicker' | 'head' | 'title' | 'ptitle' | 'body' | 'big' | 'note', {size?: number; max?: number; min?: number; weight: number; lh: number; w?: number; lines?: number}>>;
export declare const splitLines: (s: unknown) => string[];
export declare const estimate: Measure;
export declare const poseOf: (slide: unknown) => {yaw: number; pitch: number; roll: number};
export type Layout = {
  layout: string;
  boxes: Partial<Record<'kicker' | 'head' | 'chip' | 'title' | 'body' | 'note' | 'phone' | 'picture' | 'icon' | 'big' | 'mark' | 'word', Box>>;
  sizes: {head?: number; title?: number; big?: number; bodyLines?: string[]; noteLines?: string[]};
  phone: PhonePlace | null;
  problems: string[];
};
export declare const layoutSlide: (slide: unknown, opts?: {measure?: Measure; phoneW?: number | null}) => Layout;
export declare const layoutSet: (slides: unknown, opts?: {measure?: Measure}) => Layout[];
