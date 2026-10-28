export type RollCell = {ch: string; dy: number; op: number};
export declare const WHOLE: RegExp;
export declare const isYear: (text: string) => boolean;
export declare const rollMode: (text: string, from?: string) => 'flip' | 'count' | 'rise';
export declare const rollCells: (o: {text: string; from?: string; u: number; settled?: boolean; stagger?: number}) => RollCell[];
export declare const shownAt: (o: {text: string; from?: string; u: number; settled?: boolean; stagger?: number}) => string;
