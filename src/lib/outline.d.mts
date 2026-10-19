// Types of src/lib/outline.mjs (the highlight follows the element's own shape: concentric outlines, from film KIT_FROM on).
export type OutlineHl = {x?: number; y: number; w?: number; h: number; r?: number | 'pill'; snap?: boolean; gap?: number};
export type Box = {x0: number; y0: number; x1: number; y1: number};
export type Shape = Box & {r: number; pill: boolean; free: number; how: 'fill' | 'frame' | 'dashed' | 'gradient'};
export type Ring = Box & {r: number; gap: number; shape: Shape | null};
export type Px = {data: Uint8ClampedArray | Uint8Array; width: number; height: number};
export declare const OUTLINE_GAP: number;
export declare const OUTLINE_GAP_MIN: number;
export declare const OUTLINE_STROKE: number;
export declare const R_DEFAULT: number;
export declare const outlineOn: (film: string | number) => boolean;
export declare const boxOf: (hl: OutlineHl, W?: number, H?: number) => Box;
export declare const shapeOf: (img: Px, box: Box) => Shape | null;
export declare const ringOf: (hl: OutlineHl, img: Px | null, W?: number, H?: number, o?: {gap?: number; stroke?: number}) => Ring;
export declare const growRing: <T extends Box & {r: number}>(g: T, d: number) => T;
export declare const mixRing: (a: Ring, b: Ring, k: number) => Ring;
export declare const laneOf: (img: Px, box: Box) => {x0: number; x1: number} | null;
