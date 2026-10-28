// Types of src/cover/layout.mjs (the cover's one layout).
/* eslint-disable @typescript-eslint/no-explicit-any */
export type LBox = {x: number; y: number; w: number; h: number};
export type LEl = {role: string; tier: string; px: number; box: LBox; text?: string};
export type Layout = {
  comp: string;
  head: {lines: string[]; size: number; top: number; bottom: number; ST: number; problems: string[]};
  ST: number;
  oneLine: boolean;
  els: LEl[];
  draw: Array<{t: string} & Record<string, any>>;
  problems: string[];
  hero: LBox | null;
  picture: LBox | null;
  variant: string | null;
  pose: string | null;
  look: 'card' | 'dark' | 'type' | 'photo' | 'screen' | null;
};
export declare const W: number;
export declare const H: number;
export declare const FRAME: Readonly<{pad: number; top: number; rowH: number; rule: number; headTop: number; headMax: number; headMin: number; headLH: number; maxW: number; gridTop: number; gridBottom: number; side: number; paBottom: number}>;
export declare const TIER: Readonly<Record<string, number>>;
export declare const CROP: Readonly<LBox>;
export declare const CAPTURE: Readonly<{w: number; h: number}>;
export declare const POSES: Readonly<Record<string, readonly [number, number, number]>>;
export declare const PHONE_PERSPECTIVE: number;
export declare const CARPLAY_PERSPECTIVE: number;
export declare const CARPLAY_ANGLES: readonly [number, number, number];
export declare const FOCAL: Readonly<{picArea: number; picWidth: number; heroArea: number}>;
export declare const projectPoint: (x: number, y: number, t: readonly number[], d: number) => [number, number];
export declare const projectedBox: (w: number, h: number, t: readonly number[], d: number) => {x0: number; x1: number; y0: number; y1: number};
export declare const fitDevice: (
  w: number,
  h: number,
  t: readonly number[],
  d: number,
  room: {x0: number; x1: number; y0: number; y1: number},
  lift?: number,
) => {k: number; cx: number; cy: number; box: LBox; bottom: number};
export declare const headOf: (title: unknown, opts?: {floor?: boolean; comp?: string}) => Layout['head'];
export declare const CARPLAY_HEAD_MIN: number;
export declare const SHARP: number;
export declare const STRIP: Readonly<{w: number; h: number}>;
export declare const keyFloor: (text: unknown) => number;
export declare const detailFit: (reg: any) => null | {E: number[]; S: number[]; holds: boolean; z: number; keyPx: number; floor: number; reads: boolean};
export declare const RING_OUT: number;
export declare const ringFor: (w: number, h: number, opts?: {stroke?: number; seed?: number; t?: number}) => {rx: number; ry: number; rot: number; pad: [number, number]; out: [number, number]};
export declare const layoutChecks: (L: any) => void;
export declare const coverLayout: (cover: any, ctx?: Record<string, any>) => Layout;
