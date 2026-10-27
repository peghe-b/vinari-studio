// Types of src/lib/r3.mjs (the r3 kit scenes: CodeAnatomy, StakeCounter, ScreenTour, RangeScale, TimeRace).
export declare const R3_SCENES: readonly string[];
export declare const r3SceneProblems: (sc: {type?: string} | null | undefined, film: string | number) => string[];
export declare const codeParts: <T extends {part: string}>(code: string, parts: T[]) => (T & {start: number; end: number})[];
export declare const CODE_MAX_CHARS: number;
export declare const groupNum: (v: number) => string;
export declare const stakeSteps: <T extends {value: number}>(steps: T[]) => T[];
export declare const decimalsOf: (v: number | string) => number;
export declare const fmtReading: (v: number, dec?: number) => string;
export declare const rangeTicks: (min: number, max: number, step?: number) => number[];
export declare const RANGE_X: readonly [number, number];
export declare const zoneRoom: (min: number, max: number, from: number, to: number) => number;
export declare const zoneLabelFits: (label: string, room: number) => boolean;
export declare const zoneOf: (zones: {to: number}[], v: number, min: number) => number;
export declare const RACE_LAPS_MAX: number;
export declare const raceLap: (slowSecs: number) => number;
export declare const raceTime: (f: number, fastSecs: number, slowSecs: number, fastF?: number, slowF?: number, gap?: number) => number;
export declare const clockText: (secs: number, lap: number) => string;
export declare const r3Problems: (sc: Record<string, unknown> | null | undefined, where?: string) => string[];
