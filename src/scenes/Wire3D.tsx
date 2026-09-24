import {createPortal, useFrame} from '@react-three/fiber';
import {ThreeCanvas} from '@remotion/three';
import React, {useEffect, useMemo, useState} from 'react';
import {cancelRender, continueRender, delayRender, Easing, useCurrentFrame} from 'remotion';
import * as THREE from 'three';
import {ease, prog, spr} from '../lib/anim';
import {capsLatin, mtav} from '../lib/format';
import {TXT, useLayer} from '../lib/layer';
import {textWidth} from '../lib/measure';
import {C, F, isLight, L, STAGE, theme, Tone, toneBig, toneLine, toneText} from '../tokens';
import type {SceneCtx} from '../types';
import {cueFrame, entrance, Haptic, Land, lead, MonoLabel, Sfx, TypeSfx} from './common';
import {applyView, fitView, projectPoint, Rect, SHOTS, Shot, View, viewAt, ViewInput} from './three/camera';
import {makeContact} from './three/floor';
import {DynLines, fillBrackets, fillEdges, fillSlice, Layers, rgb} from './three/lines';
import {loadModel, Model, Part, penDistances, resolveStance, Seed, StanceProp} from './three/model';

// pollar-style technical drawing. The cars (sedan, sedan-sports, suv, suv-luxury, hatchback-sports,
// taxi = sedan) and the container ship (ship-cargo-a) are designed procedurally in three/car.ts: a
// real body drawn from its smooth contour plus the designer's lines (glass, shut lines, lamps,
// rims), in three weights, with the cabin (steering wheel, seats) seen through the glass. Other names
// (van, truck, the containers, building-a) are CC0 Kenney models (public/models) drawn from their
// creases. A pen reveals the drawing from a seed point along the surface, and a telephoto camera
// drifts the whole time. Every motion is a function of the frame (no useFrame, no clocks).
//
// Props (all optional except models):
//   models     ["sedan-sports"] or [{name, label, tone, at, highlight, steer}]; 2+ models stack
//              vertically. steer "left" (default) | "right": the side of the steering wheel (cars)
//   shot       "hero" | "side" | "top" | "front" | "rear"   framing preset (default hero)
//   az, el     camera azimuth / elevation in degrees, override the shot (az 0 = facing the front)
//   orbit      degrees the camera travels over the scene (default from the shot)
//   dist       fixed camera distance in the old units (default: automatic framing)
//   fill       0..1 share of the content box the model may fill (default from the shot)
//   stance     Kenney models only: "real" (default) | "toy" | {len, over, cabin, belt, wheel, width}
//   threshold  crease angle in degrees for a drawn edge (default 28)
//   ghost      Kenney models: hidden creases at this opacity (default 0.12 for vehicles, false = off)
//   seed       where the pen starts: "front" | "rear" | "top" | "center" (default: the end facing the camera)
//   draw       draw-on length in frames (default 46)
//   highlight  {part: front|rear|wheels|roof|engine|steering|vin, tone, at, label}   brackets in the
//              data colour (steering: the wheel through the glass; vin: the plate at the foot of the
//              windscreen, driver's side; both procedural cars only)
//   scan       {at, tone, dur, from: front|rear, keep, label}            a section plane sweeping the car
//   caption, flip, move, marker, tag   as before (formula line, split-flap year, slide along x,
//              the dashed 01.01 line, the price tag that flips when the model crosses it; `move`
//              keeps its old screen units, so a spec's path across the screen is unchanged)
// Sound is built in (asmr-pencil for the draw, pencil-short + a rigid haptic for brackets, air-long +
// camera + a light haptic for a scan, flap + land/medium haptic for the flip, land/medium haptic for
// the tag, key-roll for typed labels); add nothing for these.

type Highlight = {part: Part; tone?: Tone; at?: number | string; label?: string};
type Scan = {at?: number | string; tone?: Tone; dur?: number; from?: 'front' | 'rear'; keep?: boolean; label?: string};
type ModelSpec = {name: string; label?: string; tone?: Tone; at?: number | string; highlight?: Highlight; steer?: 'left' | 'right'};
type P = {
  models: (ModelSpec | string)[];
  shot?: Shot;
  orbit?: number;
  az?: number;
  el?: number;
  dist?: number;
  fill?: number;
  stance?: StanceProp;
  threshold?: number;
  ghost?: number | boolean;
  seed?: Seed;
  draw?: number;
  highlight?: Highlight;
  scan?: Scan;
  caption?: string;
  flip?: {from: string; to: string; at?: number | string; tone?: Tone};
  move?: {from: number; to: number; crossAt?: number | string};
  marker?: {label: string; tone?: Tone};
  tag?: {from: string; to: string; tone?: Tone};
};

const W = 1080;
const VEHICLES = /sedan|suv|hatch|taxi|van|truck/;
const pen = Easing.bezier(0.33, 0, 0.2, 1);
const sweep = Easing.bezier(0.42, 0, 0.58, 1);

const useModel = (name: string, stance: StanceProp | undefined, steer: 'left' | 'right' = 'left') => {
  const st = useMemo(() => resolveStance(name, stance), [name, stance]);
  const [model, setModel] = useState<Model | null>(null);
  const [handle] = useState(() => delayRender(`model ${name}`));
  useEffect(() => {
    loadModel(name, st, steer)
      .then(setModel)
      .catch((e) => cancelRender(e));
  }, [name, st, steer]);
  // Release the frame only once the model is COMMITTED: the render that mounts the canvas with it has
  // run by then, and the canvas holds its own handles until it has drawn. Releasing it next to
  // setModel() let a tab screenshot its first frame before that render: a frame with no drawing
  // (a blank canvas on single frames of a parallel render, v10 f126).
  useEffect(() => {
    if (model) continueRender(handle);
  }, [model, handle]);
  return model;
};

/** One model's drawing in one viewport of the shared canvas. */
type GLView = {model: Model; s: DrawState; top: number; height: number; visible: boolean};

// All the scene's models draw in ONE WebGL canvas: each model has its own THREE.Scene and camera and
// renders into its own band of the canvas (viewport + scissor), in one pass per frame. Two stacked
// models used to be two <ThreeCanvas> (two WebGL contexts per tab): the parallel render (3 tabs
// under ANGLE) then dropped the subtitle layer on single frames, every time (v9, v10; measured with
// tools/flicker.py on the Wire3D spans, see CLAUDE.md). One context per scene does not.
const Views: React.FC<{views: (GLView | null)[]; w: number; h: number; top0: number}> = ({views, w, h, top0}) => {
  const n = views.length;
  const scenes = useMemo(() => Array.from({length: n}, () => new THREE.Scene()), [n]);
  const cams = useMemo(() => Array.from({length: n}, () => new THREE.PerspectiveCamera(15, 1, 1, 100)), [n]);
  views.forEach((v, i) => {
    if (v) applyView(cams[i], v.s.view, w, v.height);
  });
  // priority 1: this callback renders the frame (R3F's own single-camera render is off)
  useFrame(({gl}) => {
    gl.autoClear = false;
    gl.setScissorTest(false);
    gl.setViewport(0, 0, w, h);
    gl.clear(true, true, true);
    gl.setScissorTest(true);
    views.forEach((v, i) => {
      if (!v || !v.visible) return;
      const y = h - (v.top - top0) - v.height; // GL counts from the bottom
      gl.setViewport(0, y, w, v.height);
      gl.setScissor(0, y, w, v.height);
      gl.clear(false, true, false); // each band has its own depth
      gl.render(scenes[i], cams[i]);
    });
    gl.setScissorTest(false);
    gl.setViewport(0, 0, w, h);
  }, 1);
  return <>{views.map((v, i) => (v ? <React.Fragment key={i}>{createPortal(<Drawing m={v.model} s={v.s} h={v.height} />, scenes[i])}</React.Fragment> : null))}</>;
};

type DrawState = {
  view: View;
  x: number; // world x of the model (move)
  R: number; // pen radius
  dist: Float32Array;
  fdist?: Float32Array;
  color: string;
  width: number;
  ghost: number;
  threshold: number;
  ground: number;
  hl?: {boxes: THREE.Box3[]; color: string; grow: number; tint: number; box: number};
  scan?: {z: number; color: string; band: number; keep: number; alpha: number; dir: number};
};

const Drawing: React.FC<{m: Model; s: DrawState; h: number}> = ({m, s, h}) => {
  const L = useMemo(() => {
    // a Kenney model draws from its edges; a procedural car (car.ts) from its contour (at most a few
    // thousand segments a frame) and its design lines
    const cap = m.ne * 2;
    const feat = m.proc ? m.proc.nF + 64 : cap;
    const c1 = m.proc ? 40000 : cap;
    const cg = m.proc ? 16000 : cap;
    const o = {w: W, h};
    // the design lines a touch heavier than they were drawn (1.5 / 1.1 at 0.55): measured on v11 f100 and
    // v12 f47 at phone size (Lanczos to 924 px, x264 CRF 26), the thin lines kept 95 % of their peak but
    // sat at ~120 / 255; 1.6 / 1.25 at 0.64 lift them without thickening the contour
    const layers: Layers = {
      t1: new DynLines(c1, {...o, width: 2.3, order: 12}),
      t2: new DynLines(feat, {...o, width: 1.6, opacity: 0.92, order: 11}),
      t3: new DynLines(feat, {...o, width: 1.25, opacity: 0.64, order: 10}),
      ghost: new DynLines(feat, {...o, width: 1, depthTest: false, order: 5}),
      glowW: new DynLines(cg, {...o, width: 7, additive: true, order: 13}),
      glowC: new DynLines(cg, {...o, width: 2.6, additive: true, order: 14}),
    };
    layers.glowW.mat.color.setScalar(0.2);
    layers.glowC.mat.color.setScalar(0.55);
    return layers;
  }, [m, h]);
  const extra = useMemo(
    () => ({
      brk: new DynLines(96 * 4, {w: W, h, width: 2.2, depthTest: false, order: 20}),
      box: new DynLines(48 * 4, {w: W, h, width: 1, depthTest: false, order: 19}),
      slice: new DynLines(Math.min(m.nf, 24000), {w: W, h, width: 2.4, depthTest: false, order: 21}), // a section of a car is a few thousand segments
      frame: new DynLines(24, {w: W, h, width: 1.3, depthTest: false, order: 20}),
    }),
    [m, h],
  );
  const occluder = useMemo(
    // writes depth only: hides the lines behind the body without painting a silhouette
    () => new THREE.MeshBasicMaterial({colorWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1.5, polygonOffsetUnits: 2}),
    [],
  );
  // no floor grid and no contact shadow: the field is pure black (owner, 2026-09-24); the ground
  // line and the wheel ticks stay, they are part of the drawing
  const contact = useMemo(() => makeContact(m, C.ink, W, h), [m, h]);
  contact.tMat.color.set(C.ink); // the theme's ink (the memo outlives a theme switch in the Studio)
  contact.gMat.color.set(C.ink);
  // the pen head's glow adds light: on the black film a soft bloom, on paper it would only wash the
  // dark line out, so the light theme draws the plain line
  L.glowW.mat.visible = !isLight();
  L.glowC.mat.visible = !isLight();
  const plane = useMemo(() => {
    const mat = new THREE.MeshBasicMaterial({transparent: true, depthWrite: false, depthTest: false, side: THREE.DoubleSide, opacity: 0});
    mat.toneMapped = false;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    mesh.renderOrder = 18;
    return {mesh, mat};
  }, []);

  // ---- per frame -------------------------------------------------------------------------
  const cam = s.view.pos.clone().sub(new THREE.Vector3(s.x, 0, 0));
  const base = rgb(s.color);
  L.t1.mat.linewidth = s.width;
  L.ghost.mat.opacity = s.ghost;
  fillEdges(
    m,
    {
      cam,
      R: s.R,
      dist: s.dist,
      fdist: s.fdist,
      base,
      threshold: s.threshold,
      ghost: s.ghost > 0,
      tint: s.hl ? {boxes: s.hl.boxes, color: rgb(s.hl.color), k: s.hl.tint} : undefined,
      scan: s.scan ? {z: s.scan.z, color: rgb(s.scan.color), band: s.scan.band, keep: s.scan.keep, dir: s.scan.dir, fade: s.scan.alpha} : undefined,
    },
    L,
  );
  contact.tMat.opacity = 0.75 * s.ground;
  contact.gMat.opacity = 0.2 * s.ground;

  if (s.hl) {
    fillBrackets(s.hl.boxes, s.hl.grow, rgb(s.hl.color), extra.brk, extra.box);
    extra.box.mat.opacity = 0.32 * s.hl.box;
  } else {
    extra.brk.reset();
    extra.brk.commit();
    extra.box.reset();
    extra.box.commit();
  }
  if (s.scan && s.scan.alpha > 0) {
    const c = rgb(s.scan.color);
    fillSlice(m, s.scan.z, c, extra.slice);
    extra.slice.mat.opacity = s.scan.alpha;
    const {min, max} = m.box;
    const x0 = min.x - 0.22;
    const x1 = max.x + 0.22;
    const y0 = 0;
    const y1 = max.y + 0.22;
    const z = s.scan.z;
    const f = extra.frame;
    f.reset();
    f.seg(x0, y0, z, x1, y0, z, c);
    f.seg(x1, y0, z, x1, y1, z, c);
    f.seg(x1, y1, z, x0, y1, z, c);
    f.seg(x0, y1, z, x0, y0, z, c);
    f.commit();
    f.mat.opacity = 0.7 * s.scan.alpha;
    plane.mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, z);
    plane.mesh.scale.set(x1 - x0, y1 - y0, 1);
    plane.mat.color.set(s.scan.color);
    plane.mat.opacity = 0.07 * s.scan.alpha;
    plane.mesh.visible = true;
  } else {
    extra.slice.reset();
    extra.slice.commit();
    extra.frame.reset();
    extra.frame.commit();
    plane.mesh.visible = false;
  }

  return (
    <>
      <group position={[s.x, 0, 0]}>
        <primitive object={contact.ground} />
        <primitive object={contact.ticks} />
        {m.occluders.map((g, i) => (
          <mesh key={i} geometry={g} material={occluder} />
        ))}
        <primitive object={L.ghost.obj} />
        <primitive object={L.t3.obj} />
        <primitive object={L.t2.obj} />
        <primitive object={L.t1.obj} />
        <primitive object={L.glowW.obj} />
        <primitive object={L.glowC.obj} />
        <primitive object={extra.box.obj} />
        <primitive object={extra.brk.obj} />
        <primitive object={plane.mesh} />
        <primitive object={extra.frame.obj} />
        <primitive object={extra.slice.obj} />
      </group>
    </>
  );
};

type RegionOut = {sounds: React.ReactNode; overlay: React.ReactNode; gl: GLView | null; top: number; height: number; start: number};

/** One model of the scene: its framing, pen, brackets, scan and labels. The 3D goes to the shared
 *  canvas (gl), the labels and sounds stay HTML. A hook, called once per model in a fixed order. */
const useRegion = (m: ModelSpec, p: P, ctx: SceneCtx, top: number, height: number, rect: Rect, stack: boolean, first: boolean): RegionOut => {
  const frame = useCurrentFrame();
  const model = useModel(m.name, p.stance, m.steer);
  const base = lead(ctx);
  // a later scene's pen is already drawing on the cut frame (entrance), so the cut lands on lines
  const start = m.at !== undefined ? cueFrame(ctx, m.at) : entrance(ctx);
  const penSound = ctx.index > 0 ? Math.max(0, start) : start; // a cue before frame 0 would be lost
  const shot = SHOTS[p.shot ?? 'hero'] ?? SHOTS.hero;
  // `move` is in the old screen units (the old lens showed about 137 px per unit, 100 when
  // stacked), so the object crosses the screen on the same path whatever the new framing.
  // The framing sees the whole path: the model stays inside its box wherever it is.
  const moveFrom = p.move?.from;
  const moveTo = p.move?.to;
  const tc = p.move ? (p.move.crossAt !== undefined ? cueFrame(ctx, p.move.crossAt) : ctx.dur / 2) / Math.max(1, ctx.dur) : 0.5;
  const slide = useMemo(() => {
    if (moveFrom === undefined || moveTo === undefined) return undefined;
    const u = stack ? 100 : 137;
    return (t: number) => u * (t < tc ? moveFrom * (1 - t / tc) : moveTo * ((t - tc) / Math.max(0.001, 1 - tc)));
  }, [moveFrom, moveTo, tc, stack]);
  const vi: ViewInput = useMemo(
    () => ({
      az: p.az ?? shot.az,
      el: p.el ?? shot.el,
      orbit: p.orbit ?? shot.orbit,
      rise: shot.rise,
      dolly: 0.05,
      fov: shot.fov,
      fill: p.fill ?? shot.fill,
      // old specs gave a distance for a 24 degree lens; keep the same apparent size
      dist: p.dist !== undefined ? (p.dist * Math.tan((12 * Math.PI) / 180)) / Math.tan(((shot.fov / 2) * Math.PI) / 180) : undefined,
      slide,
    }),
    [p.az, p.el, p.orbit, p.fill, p.dist, shot, slide],
  );
  const fit = useMemo(() => (model ? fitView(model.hull, model.box, vi, rect, W, height) : null), [model, vi, rect, height]);

  // Sound (public/sfx/asmr.json): close, soft, dry. Graphite while the pen draws, a short stroke
  // for the brackets, keys for a typed label, a breath of air under the scan and a soft shutter
  // when it has read the car. No melody, nothing loud. Scene-level props sound once (first model).
  const drawLen = p.draw ?? 46;
  const hlS = m.highlight ?? (first ? p.highlight : undefined);
  const hlAt = hlS ? (hlS.at !== undefined ? cueFrame(ctx, hlS.at) : start + drawLen + 8) : 0;
  const scS = first ? p.scan : undefined;
  const scAt = scS ? (scS.at !== undefined ? cueFrame(ctx, scS.at) : start + drawLen + 4) : 0;
  const scDur = scS?.dur ?? 42;
  // the brackets' snap gives way to a scene haptic within 4 frames of it (the flip or the tag landing,
  // the scan's read): one haptic per moment, never a flam
  const snap = hlAt + 6;
  const busy = [
    p.flip ? (p.flip.at !== undefined ? cueFrame(ctx, p.flip.at) : base + 40) + 4 : null,
    p.tag ? (p.move?.crossAt !== undefined ? cueFrame(ctx, p.move.crossAt) : Math.round(ctx.dur / 2)) : null,
    p.scan ? (p.scan.at !== undefined ? cueFrame(ctx, p.scan.at) : start + drawLen + 4) + (p.scan.dur ?? 42) - 2 : null,
  ].some((f) => f !== null && Math.abs(f - snap) <= 4);
  const sounds = (
    <>
      {p.move ? null : <Sfx name={drawLen > 50 ? 'asmr-pencil-long' : 'asmr-pencil'} at={penSound} volume={0.4} len={drawLen > 50 ? drawLen + 2 - (penSound - start) : undefined} fade={6} /* event: the pen draws the model */ />}
      {m.label && start > base ? <TypeSfx text={mtav(capsLatin(m.label))} at={start + 6} cpf={1.2} volume={0.22} /* event: the model's label types on its own cue (at the cut the meta keys sound) */ /> : null}
      {hlS ? <Sfx name="asmr-pencil-short" at={hlAt} volume={0.36} /* event: the brackets draw */ /> : null}
      {hlS && !busy ? <Sfx name="cc0-latch" at={snap} volume={0.5} /* event: the brackets snap onto the part (their grow is 90 % done): a real latch (cc0) replaces the rigid haptic */ /> : null}
      {hlS?.label ? <TypeSfx text={capsLatin(hlS.label)} at={hlAt + 16} cpf={1.2} volume={0.22} /* event: the callout types on */ /> : null}
      {scS ? <Sfx name="asmr-air-long" at={scAt - 4} volume={0.3} /* event: the section plane sweeps the car */ /> : null}
      {scS?.label ? <TypeSfx text={capsLatin(scS.label)} at={scAt} cpf={1.2} volume={0.18} /* event: the scan label types on */ /> : null}
      {scS ? <Sfx name="asmr-camera" at={scAt + scDur - 2} volume={0.46} /* event: the scan has read the car */ /> : null}
      {scS ? <Haptic kind="light" at={scAt + scDur - 2} volume={0.36} /* event: the read is captured */ /> : null}
    </>
  );
  if (!model || !fit) return {sounds, overlay: null, gl: null, top, height, start};

  const t = frame / Math.max(1, ctx.dur);
  const view = viewAt(fit, model.hull, vi, rect, W, height, t);
  const drawDur = p.draw ?? 46;
  const reveal = prog(frame, start, drawDur, pen);
  // by default the pen starts at the end of the model that faces the camera
  const seed: Seed = p.seed ?? (Math.cos((vi.az * Math.PI) / 180) < -0.2 ? 'rear' : 'front');
  const pd = penDistances(model, seed);
  const maxLen = model.maxLen;
  const R = reveal >= 1 ? Infinity : reveal * (pd.max + maxLen);
  // the floor settles in once the pen has drawn the lower body
  const ground = prog(frame, start + Math.round(drawDur * 0.45), 22);
  const tone = m.tone ?? 'neutral';
  const ghost = p.ghost === false ? 0 : typeof p.ghost === 'number' ? p.ghost : p.ghost === true || VEHICLES.test(m.name) ? 0.12 : 0;

  let x = 0;
  if (slide) {
    // screen px at the target's depth -> world units at the current camera distance
    const pxPerWorld = height / 2 / Math.tan(((vi.fov / 2) * Math.PI) / 180) / view.pos.distanceTo(view.target);
    x = slide(t) / pxPerWorld;
  }

  const hlSpec = hlS;
  let hl: DrawState['hl'];
  let hlLabel: {x: number; y: number; ly: number; text: string; at: number; color: string} | null = null;
  if (hlSpec && model.parts[hlSpec.part]) {
    const at = hlAt;
    let boxes = model.parts[hlSpec.part];
    if (hlSpec.part === 'wheels' && Math.abs(view.pos.x - x) > 1.2) boxes = boxes.filter((b) => Math.sign((b.min.x + b.max.x) / 2) === Math.sign(view.pos.x - x));
    const color = toneLine(hlSpec.tone ?? 'accent');
    hl = {boxes, color, grow: prog(frame, at, 16, ease.enter), tint: prog(frame, at + 4, 16), box: prog(frame, at + 12, 12)};
    if (hlSpec.label) {
      // anchor on the part nearest the camera, label above the whole outline so it never sits on lines
      const camDist = (b: THREE.Box3) => b.getCenter(new THREE.Vector3()).add(new THREE.Vector3(x, 0, 0)).distanceTo(view.pos);
      const near = [...boxes].sort((a, b) => camDist(a) - camDist(b))[0];
      const p3 = new THREE.Vector3((near.min.x + near.max.x) / 2 + x, near.max.y, (near.min.z + near.max.z) / 2);
      const a2 = projectPoint(view, p3, W, height);
      hlLabel = {x: a2.x, y: a2.y, ly: Math.max(rect.y0 - 34, Math.min(a2.y - 60, view.top - 30)), text: hlSpec.label, at: at + 10, color: toneText(hlSpec.tone ?? 'accent')};
    }
  }

  let scan: DrawState['scan'];
  let scanLabel: {x: number; y: number; text: string; at: number; color: string; alpha: number} | null = null;
  if (p.scan) {
    const at = p.scan.at !== undefined ? cueFrame(ctx, p.scan.at) : start + drawDur + 4;
    const dur = scDur;
    const u = prog(frame, at, dur, sweep);
    const dir = p.scan.from === 'rear' ? -1 : 1;
    const {min, max} = model.box;
    const z0 = dir > 0 ? max.z + 0.12 : min.z - 0.12;
    const z1 = dir > 0 ? min.z - 0.12 : max.z + 0.12;
    const alpha = frame < at ? 0 : Math.min(prog(frame, at, 6), 1 - prog(frame, at + dur, 10));
    const color = toneLine(p.scan.tone ?? 'up');
    scan = {z: z0 + (z1 - z0) * u, color, band: 0.9, keep: p.scan.keep && frame >= at ? 0.85 : 0, alpha, dir};
    if (p.scan.label && alpha > 0) {
      const s2 = projectPoint(view, new THREE.Vector3(x + max.x + 0.22, max.y + 0.22, scan.z), W, height);
      scanLabel = {x: s2.x, y: s2.y, text: p.scan.label, at, color: toneText(p.scan.tone ?? 'up'), alpha};
    }
  }

  const s: DrawState = {
    view,
    x,
    R,
    dist: pd.d,
    fdist: pd.fd,
    color: toneLine(tone),
    width: tone !== 'neutral' ? 2.6 : 2.3,
    ghost,
    threshold: p.threshold ?? 28,
    ground,
    hl,
    scan,
  };

  return {
    sounds,
    top,
    height,
    start,
    gl: {model, s, top, height, visible: frame >= start},
    overlay: (
      <>
        {m.label ? <MonoLabel text={m.label} at={start + 6} color={tone !== 'neutral' ? toneText(tone) : C.ink2} style={{position: 'absolute', left: L.side, top: 8}} size={28} sfx={false} /> : null}
        {hlLabel ? <Callout {...hlLabel} /> : null}
        {scanLabel ? (
          <div style={{position: 'absolute', left: Math.min(900, scanLabel.x + 10), top: scanLabel.y - 34, opacity: scanLabel.alpha}}>
            <MonoLabel text={scanLabel.text} at={scanLabel.at} color={scanLabel.color} size={24} sfx={false} />
          </div>
        ) : null}
      </>
    ),
  };
};

/** Mono label at height `ly` with a thin leader down to the point (x, y); clamped to the safe width. */
const Callout: React.FC<{x: number; y: number; ly: number; text: string; at: number; color: string}> = ({x, y, ly, text, at, color}) => {
  const frame = useCurrentFrame();
  const k = prog(frame, at, 12, ease.enter);
  const lx = Math.min(L.safeRight - 60, Math.max(L.side + 60, x));
  const y0 = ly + 8;
  return (
    <>
      <svg width={W} height={Math.max(y, ly) + 8} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <line x1={x} x2={x} y1={y} y2={y + (y0 - y) * k} stroke={color} strokeWidth={1.5} />
        <circle cx={x} cy={y} r={3.5} fill={color} opacity={k} />
      </svg>
      <div style={{position: 'absolute', left: lx - 300, width: 600, top: ly - 30, textAlign: 'center'}}>
        <MonoLabel text={text} at={at + 6} color={color} size={26} sfx={false} />
      </div>
    </>
  );
};

export const Wire3D: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  // the WebGL canvas belongs to the lens layer only: one context per scene (Gotchas), the text layer
  // draws the labels
  const gl = useLayer() !== 'text';
  const base = lead(ctx);
  const models = p.models.map((m) => (typeof m === 'string' ? {name: m} : m));
  const n = models.length;
  const stack = n > 1;
  const regions = useMemo(() => {
    if (stack) {
      const h = Math.floor((L.contentBottom - L.contentTop) / n) - 8;
      // the stack runs to the content box's foot, below stage L.lowY: there the like column starts on the
      // right, so every band ends at L.lowRight (one aligned column; the bottom car of v9 and v10 ran under
      // the heart)
      const x1 = L.contentTop + n * (h + 8) - 8 > L.lowY ? L.lowRight : L.safeRight;
      return models.map((_, i) => {
        const top = L.contentTop + i * (h + 8);
        return {top, height: h, rect: {x0: L.side, y0: 50, x1, y1: h - 6}};
      });
    }
    // one model: the framing rect runs to stage 1220 (1080 before the content box grew to 1280), so the
    // model sits in the box's centre with air around it; a car in a hero shot is sized by the width
    // (840), and its lower right stays above stage L.lowY, clear of the like column
    const top = L.contentTop;
    const height = L.contentBottom - L.contentTop;
    const y0 = (p.tag ? 720 : p.caption || p.flip ? 580 : 440) - top;
    return [{top, height, rect: {x0: L.side, y0, x1: L.safeRight, y1: L.contentBottom - 60 - top}}];
  }, [n, stack, p.tag, p.caption, p.flip]); // eslint-disable-line react-hooks/exhaustive-deps
  const flipAt = p.flip ? (p.flip.at !== undefined ? cueFrame(ctx, p.flip.at) : base + 40) : 0;
  const flipT = p.flip ? spr(frame, flipAt, 'land') : 0;
  // the readout is 116 px mono at most, smaller when the longer string would pass the side margins
  const flipSize = p.flip
    ? Math.min(116, Math.floor((116 * (L.safeRight - L.side)) / Math.max(1, ...[p.flip.from, p.flip.to].map((t) => textWidth(mtav(capsLatin(t)), `400 116px ${F.mono}`, 116 * 0.04)))))
    : 116;
  const flipRow = Math.round(flipSize * 1.3);
  // the mono formula line is ONE line (the owner: "on one line"): in Mtavruli it no longer fit 840 px at 30 px
  // and wrapped a lone word (v1); it shrinks to the content width instead
  const captionSize = p.caption
    ? Math.max(20, Math.min(30, Math.floor((30 * (L.safeRight - L.side)) / Math.max(1, textWidth(mtav(capsLatin(p.caption)), `400 30px ${F.mono}`, 30 * 0.05)))))
    : 30;
  const crossAt = p.move?.crossAt !== undefined ? cueFrame(ctx, p.move.crossAt) : Math.round(ctx.dur / 2);
  // one hook per model, always the same models in the same order for a given scene
  const outs = models.map((m, i) => useRegion(m, p, ctx, regions[i].top, regions[i].height, regions[i].rect, stack, i === 0)); // eslint-disable-line react-hooks/rules-of-hooks
  const top0 = regions[0].top;
  const canvasH = regions[n - 1].top + regions[n - 1].height - top0;
  const views = outs.map((o) => o.gl);
  return (
    <>
      {p.caption ? <MonoLabel text={p.caption} at={base + 4} color={C.ink} size={captionSize} style={{position: 'absolute', top: 400 + Math.round((30 - captionSize) * 0.7), left: L.side, right: L.side, lineHeight: 1.4}} sfx={false} /> : null}
      <div style={{position: 'absolute', left: 0, top: top0, width: W, height: canvasH}}>
        {/* dpr = the stage's scale x the device's: the canvas is drawn at the pixels it finally covers
            (Promo scales the stage by STAGE.s), so a 1 px line stays one sharp line. LineMaterial reads
            its resolution from each band's viewport (CSS px): widths scale with the stage like every
            other stroke. */}
        {gl && views.some(Boolean) ? (
          <ThreeCanvas key={theme()} width={W} height={canvasH} dpr={STAGE.s * (typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1)} gl={{antialias: true, alpha: true}} camera={{fov: 15, near: 1, far: 100}} style={{background: 'transparent'}}>
            <Views views={views} w={W} h={canvasH} top0={top0} />
          </ThreeCanvas>
        ) : null}
      </div>
      {outs.map((o, i) => (
        <div key={i} style={{position: 'absolute', left: 0, top: o.top, width: W, height: o.height, opacity: frame >= o.start ? 1 : 0}}>
          {o.overlay}
        </div>
      ))}
      {outs.map((o, i) => (
        <React.Fragment key={`s${i}`}>{o.sounds}</React.Fragment>
      ))}
      {p.flip ? (
        <div style={{position: 'absolute', top: 390 + Math.round((150 - flipRow) / 2), left: 0, right: 0, height: flipRow, overflow: 'hidden', textAlign: 'center', fontFamily: F.mono, fontSize: flipSize, letterSpacing: '0.04em', whiteSpace: 'nowrap'}}>
          <div className={TXT} style={{position: 'absolute', left: 0, right: 0, color: C.ink, transform: `translateY(${-flipT * flipRow}px)`, opacity: 1 - flipT}}>{mtav(capsLatin(p.flip.from))}</div>
          <div className={TXT} style={{position: 'absolute', left: 0, right: 0, color: toneBig(p.flip.tone ?? 'accent'), transform: `translateY(${(1 - flipT) * flipRow}px)`}}>{mtav(capsLatin(p.flip.to))}</div>
        </div>
      ) : null}
      {p.marker ? (
        <>
          <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
            <line x1={540} x2={540} y1={580} y2={L.contentBottom - 60} stroke={toneLine(p.marker.tone ?? 'accent')} strokeWidth={2} strokeDasharray="8 10" opacity={prog(frame, base + 10, 14)} />
          </svg>
          {/* under the model's box (the framing keeps the whole move inside it), never on the hull */}
          <MonoLabel text={p.marker.label} at={base + 14} color={toneText(p.marker.tone ?? 'accent')} size={28} style={{position: 'absolute', top: L.contentBottom - 52, left: 0, right: 0, textAlign: 'center'}} />
        </>
      ) : null}
      {p.tag ? (
        <div style={{position: 'absolute', top: 590, left: 0, right: 0, textAlign: 'center', fontFamily: F.sans, fontWeight: 600, fontSize: 88, fontFeatureSettings: '"tnum" 1'}}>
          <span className={TXT} style={{color: frame >= crossAt ? toneBig(p.tag.tone ?? 'accent') : C.ink, opacity: prog(frame, base + 16, 12), background: C.bgCenter, padding: '0 22px'}}>{mtav(frame >= crossAt ? p.tag.to : p.tag.from)}</span>
        </div>
      ) : null}
      {/* the caption types on with the cut (the meta keys sound there); the marker label types its own keys */}
      {p.marker ? <Sfx name="asmr-pencil-short" at={base + 10} volume={0.3} /* event: the dashed marker line draws */ /> : null}
      {p.flip ? <Sfx name="asmr-flap" at={flipAt} volume={0.5} /* event: the year flips */ /> : null}
      {p.flip ? <Sfx name="asmr-flap" at={flipAt + 4} volume={0.32} /* event: the flap settles */ /> : null}
      {p.flip ? <Land at={flipAt + 4} volume={0.46} /* event: the readout lands on its new value */ /> : null}
      {p.tag ? <Land at={crossAt} volume={0.56} /* event: the price tag flips as the model crosses */ /> : null}
    </>
  );
};
