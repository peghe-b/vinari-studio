// Types of src/lib/ink.mjs (the annotation layer's geometry and rules, phase 2).
export type InkKind = 'circle' | 'underline' | 'strike' | 'tick' | 'arrow' | 'bracket' | 'badge';
export type InkBox = {x: number; y: number; w: number; h: number};
export type InkPt = [number, number];
export declare const INK_KINDS: readonly InkKind[];
export declare const INK_MAX: number;
export declare const INK_FADE: number;
export declare const polyLen: (pts: InkPt[]) => number;
export declare const inkStrokes: (kind: InkKind, b: InkBox, seed?: number, room?: InkBox) => InkPt[][];
export declare const inkFrames: (len: number) => number;
export declare const inkTone: (kind: InkKind) => 'red' | 'green' | 'ink';
export declare const inkSound: (kind: InkKind) => string;
export declare const inkDur: (strokes: InkPt[][]) => number;
export declare const inkPlan: <M extends {kind: string; box: InkBox; at: number; seed?: number}>(marks: M[], o?: {bottom?: number; room?: InkBox}) => {shown: M[]; problems: string[]};
