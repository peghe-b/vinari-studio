// Types of src/lib/textfit.mjs (text measured before it is set, phase 2).
export type FitOpts = {weight?: number; mtav?: boolean; tracking?: number; min?: number};
export declare const toMtav: (s: string) => string;
export declare const textW: (text: string, px: number, opts?: FitOpts) => number;
export declare const fitLines: (text: string, maxW: number, maxLines?: number, size0?: number, opts?: FitOpts) => {lines: string[]; size: number; fits: boolean};
export declare const maxWFor: (camAmount?: number) => number;
export declare const sizeFor: (text: string, maxW: number, cap?: number, opts?: FitOpts) => number;
