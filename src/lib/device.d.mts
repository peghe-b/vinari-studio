// Types of src/lib/device.mjs (the phone mockup's look: the 3D iPhone from PHONE3D_FROM, the flat device before it).
export declare const PHONE3D_FROM: number;
export declare const PHONE_MODES: readonly string[];
export declare const PHONE3D_STAGINGS: readonly string[];
export declare const phoneMode: (sc: unknown, film: string | number) => '3d' | 'flat' | null;
export declare const isWebgl3dPhone: (sc: unknown, film: string | number) => boolean;
export declare const phoneProblems: (sc: unknown) => string[];
export declare const PHONE_MIX_FROM: number;
export declare const PHONE_WHOLE_FROM: number;
export declare const phoneWhole: (sc: unknown, film: string | number) => boolean;
export declare const SCENES_UP_FROM: number;
export declare const UP_SCENES: readonly string[];
export declare const isWebglScene: (sc: unknown, film: string | number) => boolean;
export declare const upSceneProblems: (sc: unknown, film: string | number) => string[];
