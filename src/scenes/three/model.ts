import {staticFile} from 'remotion';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {buildCarAsync, hasDesign, ProcData, Steer} from './car';

// A car with a design in car.ts (sedan, sedan-sports, suv, suv-luxury, hatchback-sports, taxi) is
// built procedurally there: a real body with glass, shut lines, lamps and rims, drawn from its smooth
// contour. Everything else (the ship, the containers, van, truck) is a CC0 Kenney GLB turned into a
// technical-drawing model:
//   1. stance: the toy proportions are reshaped (longer wheelbase, lower greenhouse, smaller
//      wheels with arches that follow), per model, before anything else;
//   2. welded mesh with face normals, every edge classified by dihedral angle and length;
//   3. a normalised space: longest horizontal side = 4 units, ground at y = 0, centred;
//   4. part boxes (front, rear, wheels, roof, engine) for highlights.
// Everything is pure data; the per-frame work happens in lines.ts.

export type Stance = {
  len: number; // stretch of the body between the wheel arches (the wheelbase)
  over: number; // stretch of the front and rear overhangs
  cabin: number; // height factor of the greenhouse (everything above the belt line)
  belt: number; // belt line as a fraction of the body height, measured from the body bottom
  wheel: number; // wheel scale; the arches shrink with the wheels
  width: number; // body width factor
};

export const TOY: Stance = {len: 1, over: 1, cabin: 1, belt: 0.6, wheel: 1, width: 1};

// Tuned by eye against side and 3/4 stills. Kenney cars are about 2 : 1 with wheels a quarter of
// the length; a real car is closer to 3.3 : 1 with wheels a seventh of the length.
export const STANCES: Record<string, Stance> = {
  'sedan-sports': {len: 1.6, over: 1.12, cabin: 0.76, belt: 0.5, wheel: 0.84, width: 1},
  'hatchback-sports': {len: 1.55, over: 1.1, cabin: 0.74, belt: 0.5, wheel: 0.84, width: 1},
  'suv-luxury': {len: 1.45, over: 1.1, cabin: 0.84, belt: 0.5, wheel: 0.9, width: 1},
  sedan: {len: 1.8, over: 1.15, cabin: 0.74, belt: 0.5, wheel: 0.84, width: 0.96},
  suv: {len: 1.45, over: 1.1, cabin: 0.84, belt: 0.5, wheel: 0.9, width: 1},
  taxi: {len: 1.6, over: 1.12, cabin: 0.76, belt: 0.5, wheel: 0.86, width: 0.96},
  van: {len: 1.3, over: 1.05, cabin: 0.92, belt: 0.5, wheel: 0.9, width: 1},
  truck: {len: 1.35, over: 1.08, cabin: 0.9, belt: 0.5, wheel: 0.9, width: 1},
};

export type StanceProp = 'real' | 'toy' | Partial<Stance>;

export const resolveStance = (name: string, s: StanceProp | undefined): Stance => {
  const base = STANCES[name] ?? TOY;
  if (s === 'toy') return TOY;
  if (s === undefined || s === 'real') return base;
  return {...base, ...s};
};

export type Part = 'front' | 'rear' | 'wheels' | 'roof' | 'engine' | 'steering' | 'vin'; // steering, vin: procedural cars only

export type Wheel = {c: THREE.Vector3; r: number; halfW: number};

export type Model = {
  key: string;
  nv: number;
  pos: Float32Array; // welded vertices, normalised space
  ne: number;
  ea: Uint32Array; // edge endpoints
  eb: Uint32Array;
  ef1: Int32Array; // adjacent faces, -1 = none (boundary) or -2 = more than two
  ef2: Int32Array;
  eAngle: Float32Array; // dihedral angle in degrees (180 for boundary edges)
  eLen: Float32Array;
  eWheel: Uint8Array; // 1 = edge of a wheel
  maxLen: number;
  nf: number;
  tri: Uint32Array; // 3 per face
  fn: Float32Array; // face normals
  fp: Float32Array; // one point per face
  occluders: THREE.BufferGeometry[];
  box: THREE.Box3;
  hull: Float32Array; // sample of vertices for camera fitting
  wheels: Wheel[];
  car: boolean;
  parts: Record<Part, THREE.Box3[]>;
  dist: Map<string, {d: Float32Array; max: number; fd?: Float32Array}>;
  proc?: ProcData; // a procedural car (car.ts): contour from vertex normals + projected design lines
  bodyTri?: number; // triangles of the body before the tyres
};

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

type RawMesh = {pos: Float32Array; index: ArrayLike<number> | null; wheel: number}; // wheel: index into wheels or -1

const cache = new Map<string, Promise<Model>>();

export const loadModel = (name: string, stance: Stance, steer: Steer = 'left'): Promise<Model> => {
  if (hasDesign(name)) return buildCarAsync(name, steer); // the stance is designed in; built in slices
  const key = `${name}|${JSON.stringify(stance)}`;
  if (!cache.has(key)) {
    cache.set(
      key,
      new Promise<Model>((resolve, reject) => {
        new GLTFLoader().load(
          staticFile(`models/${name}.glb`),
          (gltf) => {
            try {
              resolve(build(key, gltf.scene, stance));
            } catch (e) {
              reject(e);
            }
          },
          undefined,
          (err) => reject(err),
        );
      }),
    );
  }
  return cache.get(key)!;
};

const isWheelName = (o: THREE.Object3D | null): boolean => {
  for (let p = o; p; p = p.parent) if (/^wheel/i.test(p.name)) return true;
  return false;
};

const build = (key: string, scene: THREE.Object3D, st: Stance): Model => {
  scene.updateMatrixWorld(true);
  const raws: RawMesh[] = [];
  const wheelsRaw: {box: THREE.Box3}[] = [];
  const bodyBox = new THREE.Box3();
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const g = m.geometry.clone();
    g.applyMatrix4(m.matrixWorld);
    g.computeBoundingBox();
    const b = g.boundingBox!;
    const pos = new Float32Array(g.getAttribute('position').array as ArrayLike<number>);
    // a wheel touches the ground; the spare wheel on the tailgate is part of the body
    if (isWheelName(m) && b.min.y < 0.05) {
      wheelsRaw.push({box: b.clone()});
      raws.push({pos, index: g.index ? g.index.array : null, wheel: wheelsRaw.length - 1});
    } else {
      bodyBox.union(b);
      raws.push({pos, index: g.index ? g.index.array : null, wheel: -1});
    }
  });

  // ---- stance --------------------------------------------------------------------------
  const car = wheelsRaw.length >= 4;
  const wheels0 = wheelsRaw.map((w) => {
    const c = w.box.getCenter(new THREE.Vector3());
    const size = w.box.getSize(new THREE.Vector3());
    return {c, r: size.y / 2, halfW: size.x / 2};
  });
  const s = car ? st : TOY;
  let zf = 0;
  let zr = 0;
  let r0 = 0;
  if (car) {
    const front = wheels0.filter((w) => w.c.z > 0);
    const rear = wheels0.filter((w) => w.c.z <= 0);
    zf = front.reduce((a, w) => a + w.c.z, 0) / Math.max(1, front.length);
    zr = rear.reduce((a, w) => a + w.c.z, 0) / Math.max(1, rear.length);
    r0 = wheels0.reduce((a, w) => a + w.r, 0) / wheels0.length;
  }
  const ws = s.wheel;
  const drop = r0 * (1 - ws); // the body sinks with the smaller wheels
  const archR = r0 * ws * 1.5; // half-width of the rigid zone around an axle (after the arch scale)
  const mid = (zf + zr) / 2;
  const inner = Math.max(0, zf - archR - mid); // half-length of the part between the arches
  const zfN = mid + inner * s.len + archR;
  const zrN = mid - inner * s.len - archR;
  const mapZ = (z: number) => {
    if (!car) return z;
    if (z > zf + archR) return zfN + archR + (z - zf - archR) * s.over;
    if (z >= zf - archR) return zfN + (z - zf);
    if (z > zr + archR) return mid + (z - mid) * s.len;
    if (z >= zr - archR) return zrN + (z - zr);
    return zrN - archR + (z - zr + archR) * s.over;
  };
  const beltY = bodyBox.min.y + s.belt * (bodyBox.max.y - bodyBox.min.y) - drop;
  const deformBody = (x: number, y: number, z: number, out: number[]) => {
    let y1 = y - drop;
    let z1 = z;
    if (car && ws !== 1) {
      for (const zA of [zf, zr]) {
        const d = Math.hypot(y - r0, z - zA);
        const w = 1 - smooth(r0 * 1.2, r0 * 1.85, d);
        if (w > 0) {
          y1 = y1 + w * (r0 * ws + (y - r0) * ws - y1);
          z1 = z1 + w * (zA + (z - zA) * ws - z1);
        }
      }
    }
    z1 = mapZ(z1);
    if (car && y1 > beltY) y1 = beltY + (y1 - beltY) * s.cabin;
    out[0] = x * s.width;
    out[1] = y1;
    out[2] = z1;
  };
  const deformWheel = (wi: number, x: number, y: number, z: number, out: number[]) => {
    const w = wheels0[wi];
    const cz = w.c.z > 0 ? zfN + (w.c.z - zf) : zrN + (w.c.z - zr);
    out[0] = w.c.x * s.width + (x - w.c.x) * ws;
    out[1] = r0 * ws + (y - w.c.y) * ws;
    out[2] = cz + (z - w.c.z) * ws;
  };

  const tmp = [0, 0, 0];
  for (const m of raws) {
    for (let i = 0; i < m.pos.length; i += 3) {
      if (m.wheel >= 0) deformWheel(m.wheel, m.pos[i], m.pos[i + 1], m.pos[i + 2], tmp);
      else deformBody(m.pos[i], m.pos[i + 1], m.pos[i + 2], tmp);
      m.pos[i] = tmp[0];
      m.pos[i + 1] = tmp[1];
      m.pos[i + 2] = tmp[2];
    }
  }

  // ---- normalise -----------------------------------------------------------------------
  const box0 = new THREE.Box3();
  for (const m of raws) for (let i = 0; i < m.pos.length; i += 3) box0.expandByPoint(new THREE.Vector3(m.pos[i], m.pos[i + 1], m.pos[i + 2]));
  const size0 = box0.getSize(new THREE.Vector3());
  const k = 4 / Math.max(size0.x, size0.z);
  const cx = (box0.min.x + box0.max.x) / 2;
  const cz = (box0.min.z + box0.max.z) / 2;
  const miny = box0.min.y;
  for (const m of raws) {
    for (let i = 0; i < m.pos.length; i += 3) {
      m.pos[i] = (m.pos[i] - cx) * k;
      m.pos[i + 1] = (m.pos[i + 1] - miny) * k;
      m.pos[i + 2] = (m.pos[i + 2] - cz) * k;
    }
  }
  const wheels: Wheel[] = wheels0.map((w) => {
    const czN = w.c.z > 0 ? zfN + (w.c.z - zf) : zrN + (w.c.z - zr);
    return {
      c: new THREE.Vector3((w.c.x * s.width - cx) * k, (r0 * ws - miny) * k, (czN - cz) * k),
      r: w.r * ws * k,
      halfW: w.halfW * ws * k,
    };
  });

  // ---- weld + edges --------------------------------------------------------------------
  // Vertices are welded per mesh (a wheel never joins the body). Tiny separate pieces of the
  // body (the licence-plate blocks) are dropped: they are what makes a Kenney car read as a toy.
  const P: number[] = [];
  const T: number[] = [];
  const VW: number[] = [];
  const q = (v: number) => Math.round(v * 2e4);
  const bodyLen = Math.max(box0.max.x - box0.min.x, box0.max.z - box0.min.z) * k;
  for (const m of raws) {
    const map = new Map<string, number>();
    const local: number[] = [];
    const first = P.length / 3;
    const nIn = m.pos.length / 3;
    for (let i = 0; i < nIn; i++) {
      const x = m.pos[i * 3];
      const y = m.pos[i * 3 + 1];
      const z = m.pos[i * 3 + 2];
      const h = `${q(x)},${q(y)},${q(z)}`;
      let id = map.get(h);
      if (id === undefined) {
        id = P.length / 3;
        P.push(x, y, z);
        VW.push(m.wheel >= 0 ? 1 : 0);
        map.set(h, id);
      }
      local.push(id);
    }
    const idx = m.index ?? Array.from({length: nIn}, (_, i) => i);
    const tris: number[] = [];
    for (let i = 0; i + 2 < idx.length; i += 3) {
      const a = local[idx[i]];
      const b = local[idx[i + 1]];
      const c = local[idx[i + 2]];
      if (a === b || b === c || a === c) continue;
      tris.push(a, b, c);
    }
    let keep = tris;
    if (m.wheel < 0 && car) {
      const n = P.length / 3 - first;
      const par = Array.from({length: n}, (_, i) => i);
      const find = (x: number): number => {
        while (par[x] !== x) {
          par[x] = par[par[x]];
          x = par[x];
        }
        return x;
      };
      for (let i = 0; i < tris.length; i += 3) {
        const a = find(tris[i] - first);
        par[find(tris[i + 1] - first)] = a;
        par[find(tris[i + 2] - first)] = a;
      }
      const ext = new Map<number, THREE.Box3>();
      for (let i = 0; i < n; i++) {
        const r = find(i);
        if (!ext.has(r)) ext.set(r, new THREE.Box3());
        ext.get(r)!.expandByPoint(new THREE.Vector3(P[(first + i) * 3], P[(first + i) * 3 + 1], P[(first + i) * 3 + 2]));
      }
      const small = (r: number) => {
        const sz = ext.get(r)!.getSize(new THREE.Vector3());
        return Math.max(sz.x, sz.y, sz.z) < bodyLen * 0.16;
      };
      keep = [];
      for (let i = 0; i < tris.length; i += 3) if (!small(find(tris[i] - first))) keep.push(tris[i], tris[i + 1], tris[i + 2]);
    }
    for (const t of keep) T.push(t);
  }
  const pos = new Float32Array(P);
  const nv = pos.length / 3;
  const tri = new Uint32Array(T);
  const occ = new THREE.BufferGeometry();
  occ.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  occ.setIndex(new THREE.BufferAttribute(tri, 1));
  const occluders = [occ];
  const vWheel = new Uint8Array(VW);
  const nf = tri.length / 3;
  const fn = new Float32Array(nf * 3);
  const fp = new Float32Array(nf * 3);
  const va = new THREE.Vector3();
  const vb = new THREE.Vector3();
  const vc = new THREE.Vector3();
  const faceArea = new Float32Array(nf);
  for (let f = 0; f < nf; f++) {
    va.fromArray(pos, tri[f * 3] * 3);
    vb.fromArray(pos, tri[f * 3 + 1] * 3);
    vc.fromArray(pos, tri[f * 3 + 2] * 3);
    vb.sub(va);
    vc.sub(va);
    vb.cross(vc);
    faceArea[f] = vb.length() / 2;
    vb.normalize();
    fn[f * 3] = vb.x;
    fn[f * 3 + 1] = vb.y;
    fn[f * 3 + 2] = vb.z;
    fp[f * 3] = va.x;
    fp[f * 3 + 1] = va.y;
    fp[f * 3 + 2] = va.z;
  }
  const emap = new Map<number, number>();
  const EA: number[] = [];
  const EB: number[] = [];
  const F1: number[] = [];
  const F2: number[] = [];
  for (let f = 0; f < nf; f++) {
    if (faceArea[f] < 1e-9) continue;
    for (let j = 0; j < 3; j++) {
      const a = tri[f * 3 + j];
      const b = tri[f * 3 + ((j + 1) % 3)];
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      const h = lo * 1048576 + hi;
      const e = emap.get(h);
      if (e === undefined) {
        emap.set(h, EA.length);
        EA.push(lo);
        EB.push(hi);
        F1.push(f);
        F2.push(-1);
      } else if (F2[e] === -1) F2[e] = f;
      else F2[e] = -2;
    }
  }
  const ne = EA.length;
  const ea = new Uint32Array(EA);
  const eb = new Uint32Array(EB);
  const ef1 = new Int32Array(F1);
  const ef2 = new Int32Array(F2);
  const eAngle = new Float32Array(ne);
  const eLen = new Float32Array(ne);
  for (let e = 0; e < ne; e++) {
    const a = ea[e] * 3;
    const b = eb[e] * 3;
    eLen[e] = Math.hypot(pos[a] - pos[b], pos[a + 1] - pos[b + 1], pos[a + 2] - pos[b + 2]);
    if (ef2[e] < 0) {
      eAngle[e] = 180;
      continue;
    }
    const f1 = ef1[e] * 3;
    const f2 = ef2[e] * 3;
    const d = fn[f1] * fn[f2] + fn[f1 + 1] * fn[f2 + 1] + fn[f1 + 2] * fn[f2 + 2];
    eAngle[e] = (Math.acos(Math.min(1, Math.max(-1, d))) * 180) / Math.PI;
  }

  const box = new THREE.Box3();
  const used = new Uint8Array(nv);
  for (let i = 0; i < tri.length; i++) used[tri[i]] = 1;
  for (let i = 0; i < nv; i++) if (used[i]) box.expandByPoint(va.fromArray(pos, i * 3));
  const eWheel = new Uint8Array(ne);
  for (let e = 0; e < ne; e++) eWheel[e] = vWheel[ea[e]];
  const step = Math.max(1, Math.floor(nv / 700));
  const H: number[] = [];
  for (let i = 0; i < nv; i += step) if (used[i]) H.push(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
  // the bounding corners too, so a sparse sample never under-frames
  H.push(box.min.x, box.min.y, box.min.z, box.max.x, box.max.y, box.max.z);

  return {
    key,
    nv,
    pos,
    ne,
    ea,
    eb,
    ef1,
    ef2,
    eAngle,
    eLen,
    eWheel,
    maxLen: eLen.reduce((a, b) => Math.max(a, b), 0),
    nf,
    tri,
    fn,
    fp,
    occluders,
    box,
    hull: new Float32Array(H),
    wheels,
    car,
    parts: parts(box, wheels, car, beltFrac(beltY, miny, k, box)),
    dist: new Map(),
  };
};

const beltFrac = (beltY: number, miny: number, k: number, box: THREE.Box3) => ((beltY - miny) * k - box.min.y) / Math.max(1e-6, box.max.y - box.min.y);

const parts = (box: THREE.Box3, wheels: Wheel[], car: boolean, belt: number): Record<Part, THREE.Box3[]> => {
  const {min, max} = box;
  const H = max.y - min.y;
  const zs = wheels.map((w) => w.c.z);
  const zf = car ? Math.max(...zs) : max.z - (max.z - min.z) * 0.25;
  const zr = car ? Math.min(...zs) : min.z + (max.z - min.z) * 0.25;
  const r = car ? wheels[0].r : H * 0.25;
  const yb = min.y + H * Math.min(0.8, Math.max(0.35, belt));
  const B = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => new THREE.Box3(new THREE.Vector3(x0, y0, z0), new THREE.Vector3(x1, y1, z1));
  return {
    front: [B(min.x, min.y, zf - r * 1.25, max.x, yb, max.z)],
    rear: [B(min.x, min.y, min.z, max.x, yb, zr + r * 1.25)],
    roof: [B(min.x * 0.86, yb, zr + r * 0.6, max.x * 0.86, max.y, zf - r * 0.4)],
    engine: [B(min.x * 0.8, min.y + H * 0.18, zf - r * 1.1, max.x * 0.8, yb, max.z - (max.z - zf) * 0.12)],
    wheels: car
      ? wheels.map((w) => {
          const side = Math.sign(w.c.x) || 1;
          return B(
            w.c.x - w.halfW - (side < 0 ? w.halfW * 0.2 : 0),
            0,
            w.c.z - w.r,
            w.c.x + w.halfW + (side > 0 ? w.halfW * 0.2 : 0),
            w.r * 2,
            w.c.z + w.r,
          );
        })
      : [B(min.x, min.y, min.z, max.x, min.y + H * 0.25, max.z)],
    steering: [],
    vin: [],
  };
};

export type Seed = 'front' | 'rear' | 'top' | 'center';

/** Distance of every vertex from the seed, travelling along the surface (Dijkstra over the
 *  mesh edges); separate pieces start when a sphere around the seed reaches them. */
export const penDistances = (m: Model, seed: Seed) => {
  const hit = m.dist.get(seed);
  if (hit) return hit;
  const {min, max} = m.box;
  const H = max.y - min.y;
  const sp =
    seed === 'rear'
      ? [0, min.y + H * 0.35, min.z]
      : seed === 'top'
        ? [0, max.y, (min.z + max.z) / 2 + (max.z - min.z) * 0.08]
        : seed === 'center'
          ? [0, min.y + H * 0.5, (min.z + max.z) / 2]
          : [0, min.y + H * 0.35, max.z];
  const d = new Float32Array(m.nv);
  const jump = 1.35;
  for (let i = 0; i < m.nv; i++) d[i] = jump * Math.hypot(m.pos[i * 3] - sp[0], m.pos[i * 3 + 1] - sp[1], m.pos[i * 3 + 2] - sp[2]);
  // adjacency (CSR)
  const deg = new Uint32Array(m.nv + 1);
  for (let e = 0; e < m.ne; e++) {
    deg[m.ea[e] + 1]++;
    deg[m.eb[e] + 1]++;
  }
  for (let i = 0; i < m.nv; i++) deg[i + 1] += deg[i];
  const adj = new Uint32Array(deg[m.nv]);
  const adjE = new Uint32Array(deg[m.nv]);
  const fill = deg.slice(0, m.nv);
  for (let e = 0; e < m.ne; e++) {
    adj[fill[m.ea[e]]] = m.eb[e];
    adjE[fill[m.ea[e]]++] = e;
    adj[fill[m.eb[e]]] = m.ea[e];
    adjE[fill[m.eb[e]]++] = e;
  }
  // binary heap of (dist, vertex) with lazy deletion
  const hv: number[] = [];
  const hd: number[] = [];
  const push = (v: number, dv: number) => {
    let i = hv.length;
    hv.push(v);
    hd.push(dv);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (hd[p] <= hd[i]) break;
      [hv[p], hv[i]] = [hv[i], hv[p]];
      [hd[p], hd[i]] = [hd[i], hd[p]];
      i = p;
    }
  };
  const pop = () => {
    const v = hv[0];
    const dv = hd[0];
    const lv = hv.pop()!;
    const ld = hd.pop()!;
    if (hv.length) {
      hv[0] = lv;
      hd[0] = ld;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let s = i;
        if (l < hv.length && hd[l] < hd[s]) s = l;
        if (r < hv.length && hd[r] < hd[s]) s = r;
        if (s === i) break;
        [hv[s], hv[i]] = [hv[i], hv[s]];
        [hd[s], hd[i]] = [hd[i], hd[s]];
        i = s;
      }
    }
    return [v, dv] as const;
  };
  for (let i = 0; i < m.nv; i++) push(i, d[i]);
  while (hv.length) {
    const [v, dv] = pop();
    if (dv > d[v]) continue;
    for (let j = deg[v]; j < deg[v + 1]; j++) {
      const u = adj[j];
      // compared as stored (float32): with a float64 sum, a zero-length edge could re-queue two
      // vertices forever (a rounded-up store is never reached again)
      const nd = Math.fround(dv + m.eLen[adjE[j]]);
      if (nd < d[u]) {
        d[u] = nd;
        push(u, nd);
      }
    }
  }
  let mx = 0;
  for (let i = 0; i < m.nv; i++) mx = Math.max(mx, d[i]);
  // a design line takes the distance of the surface under it (its nearest vertex)
  let fd: Float32Array | undefined;
  if (m.proc) {
    fd = new Float32Array(m.proc.nF * 2);
    for (let i = 0; i < fd.length; i++) fd[i] = d[m.proc.fNear[i]];
  }
  const out = {d, max: mx, fd};
  m.dist.set(seed, out);
  return out;
};
