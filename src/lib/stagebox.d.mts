// Types of src/lib/stagebox.mjs (the paper kit's stage geometry, used by the humour scenes).
export declare const TEXT_W: number;
export declare const TEXT_INSET: number;
export declare const STAGE: Readonly<{left: number; right: number; top: number; bottom: number; cx: number; cy: number}>;
export declare const TT_FRAME: Readonly<{x: number; top: number; bottom: number}>;
export declare const TT: Readonly<{right: number; top: number; bottom: number}>;
export declare const ttFitW: (w: number, o: {x?: number | null; cx?: number | null; y0: number; y1: number}) => number;
