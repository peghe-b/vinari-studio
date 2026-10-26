// Types of src/cover/kinds.mjs (the cover's kinds, shared by the render and the lint).
export declare const COVER_KINDS: readonly ['card', 'screen', 'carplay', 'polaroid'];
export declare const CARD_TYPES: readonly ['bars', 'numbers'];
export declare const MARKS: readonly ['circle', 'underline', 'strike', 'arrow', 'tick'];
export declare const TILTS: readonly ['left', 'right', 'flat'];
export declare const CARPLAY_SCREENS: readonly string[];
export declare const CARD_ROWS: number;
export declare const LABEL_MAX: number;
export declare const VALUE_MAX: number;
export declare const NOTE_MAX: number;
export declare const PILL: string;
export declare const coverKind: (cover: unknown) => 'card' | 'screen' | 'carplay' | 'polaroid' | null;
export declare const coverProblems: (
  cover: unknown,
  ctx?: {screens?: Set<string>; retired?: Set<string>; photo?: (src: string) => boolean; syms?: Set<string>; needKind?: boolean},
) => string[];
