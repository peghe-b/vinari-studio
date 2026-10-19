// Types of src/slides/probe.mjs (the capture probe: an element's real box and corner radius, the words to keep off).
export type Region = {x0: number; y0: number; x1: number; y1: number};
export type Shape = Region & {r: number | null; pill: boolean; found: boolean; closed?: boolean; extended?: boolean; outlined?: boolean; fill?: number[]; ground?: number[]; why?: string};
export type CapPt = {x: number; y: number};
export type Probe = {
  w: number;
  h: number;
  shape: (region: Region) => Shape;
  clean: (x: number, y: number, rad: number) => boolean;
  edgeLine: (x: number, y: number, rad: number) => number | null;
  busy: (a: CapPt, b: CapPt) => number;
  hugs: (a: CapPt, b: CapPt, off: number) => number;
  spot: (x: number, y: number, rad: number, dirs?: number[][], reach?: number) => CapPt | null;
  outlined: (R: Region, m: number) => Shape | null;
  free: (E: Region, reach?: number) => {l: number; r: number; t: number; b: number; min: number} | null;
  edges: (E: Region, frame?: boolean, win?: number) => Region | null;
};
export declare const CAPTURE: Readonly<{w: number; h: number}>;
export declare const makeProbe: (img: {data: ArrayLike<number>; width: number; height: number; channels?: number}) => Probe;
