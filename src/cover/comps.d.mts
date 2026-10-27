// Types of src/cover/comps.mjs (the cover's compositions, shared by the render, the layout and the lints).
export type CoverComp = 'stat' | 'versus' | 'bars' | 'detail' | 'phone' | 'carplay' | 'polaroid' | 'quote' | 'steps' | 'timeline';
export declare const COMPS: readonly CoverComp[];
export declare const OLD_KINDS: readonly ['card', 'screen'];
export declare const COVER_KINDS: readonly CoverComp[];
export declare const MARKS: readonly ['circle', 'underline', 'strike', 'arrow', 'tick'];
export declare const CARPLAY_SCREENS: readonly string[];
export declare const PHONE_POSES: readonly ['left-lean', 'right-lean', 'left-back', 'right-back'];
export declare const PILL: string;
export declare const NO_APP_PILL: readonly string[];
export declare const CAT_COMPS: Readonly<Record<string, CoverComp[]>>;
export declare const DEFAULT_COMPS: readonly CoverComp[];
export declare const compsFor: (cat: string) => CoverComp[];
export declare const LIMIT: Readonly<Record<string, number>>;
export declare const letters: (s: unknown) => number;
export declare const coverKind: (cover: unknown) => CoverComp | 'screen' | null;
export declare const coverAsset: (cover: unknown) => string | null;
export declare const versionAtLeast: (a: unknown, b: unknown) => boolean;
export declare const coverProblems: (
  cover: unknown,
  ctx?: {
    screens?: Set<string>;
    retired?: Set<string>;
    photo?: (src: string) => boolean;
    photoInfo?: (src: string) => unknown;
    syms?: Set<string>;
    regions?: Record<string, Record<string, unknown>>;
    screenInfo?: Record<string, {captured?: string; verified?: string | null}>;
    store?: string | null;
    needKind?: boolean;
  },
) => string[];
