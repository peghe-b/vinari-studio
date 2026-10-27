// Physics infographics (round 3, 2026-10-27; the owner: "make the studio AMAZINGLY stronger", data that moves like the
// viral promos). Matter.js (MIT, pinned 0.20.0) simulates a small 2D world for a data scene: coins or fuel drops filling a
// jar (a cost), blocks stacking in columns (a comparison), balls pouring into two bins (N of M people). One module, read by the render (src/scenes/Phys*.tsx) and the Node tools (the self-test, the lints
// tools/ci/physlint.mjs), so the layout and the numbers are the same in both.
//
// DETERMINISM (the render draws frames in any order, in several tabs at once, and a re-render must give the same pixels):
//   - a fixed timestep (PHYS_SUB steps of exactly 1000/60 ms per 30 fps frame), counted from the simulation's frame 0;
//     never the wall clock (no Runner, no Date, no performance.now), never Math.random: a seeded mulberry32;
//   - every world is built from its props alone, with Matter's global id counter and seed reset first, so two builds of
//     the same props are the same world whatever ran before;
//   - frame f is the state after f frames of steps from frame 0. A tab that is asked for frame 40 steps 0..40 (and keeps
//     the track, so frame 41 costs one more frame); a cold tab asked for frame 40 computes exactly the same numbers.
//   - every number a scene draws is rounded to 0.01 px (the bodies' last bits never reach the pixels).
//
//   jarLayout(p) / jarSim(p)         PhysJar: value, per, of, kind, n, at (sim frame the pour starts)
//   stackLayout(p) / stackSim(p)     PhysStack: items[{value}], per, at
//   countLayout(p) / countSim(p)     PhysCount: n, of, at
//   sim.at(f) -> Float64Array        [x, y, angle, on, speed] per body at sim frame f (on 0 before its spawn)
//   node src/lib/physics.mjs --test  the self-test (determinism, order independence, every body settles inside the stage)
import Matter from 'matter-js';

const {Engine, Bodies, Body, Composite, Common} = Matter;

/** physics steps a 30 fps frame: Matter's own base step (1000/60 ms), twice a frame */
export const PHYS_SUB = 2;
const DT = 1000 / 60;
/** the most frames a world is simulated (12 s); later frames hold the last state */
export const PHYS_MAX_FRAMES = 360;
/** gravity in Matter's units (1.6 x its default: a coin falls 150 px in about 13 frames, a promo's snap, not a moon) */
const GRAVITY = 1.6;
/** the P2 stage the scenes lay out in (src/lib/p2.mjs P2_STAGE less the text inset: stage x 136..944, y 400..1370) */
export const PHYS_STAGE = Object.freeze({left: 136, right: 944, top: 400, bottom: 1370, cx: 540});
/** bodies a world at most (the lint PHYS_COUNT; a 100-ball pour is the biggest) */
export const PHYS_MAX_BODIES = 100;
/** a random pile of equal discs fills this share of its box (measured on this module's own pours: see the self-test) */
export const PACKING = 0.7;

/** mulberry32: a seeded generator in [0, 1) */
export const rng = (seed) => {
  let a = (Number(seed) >>> 0) || 0x9e3779b9;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
/** a stable 32-bit hash of a string (the default seed: the props themselves) */
export const hash32 = (s) => {
  let h = 0x811c9dc5;
  for (const ch of String(s)) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r2 = (v) => Math.round(v * 100) / 100;
/** a "nice" step (1, 2, 2.5, 5 x 10^k) at or above x */
export const niceStep = (x) => {
  if (!(x > 0)) return 1;
  const k = Math.pow(10, Math.floor(Math.log10(x)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * k >= x - 1e-9) return m * k;
  return 10 * k;
};

// ---- the core: a world built from its props, stepped on a fixed clock, its track kept --------------------------------

class World {
  constructor(seed, build) {
    // the same props, the same world: Matter's ids (pair order) and its own seed from zero, whatever ran before
    Common._nextId = 0;
    Common._seed = (Number(seed) >>> 0) || 1;
    this.engine = Engine.create({enableSleeping: true, positionIterations: 10, velocityIterations: 8, constraintIterations: 2});
    this.engine.gravity.x = 0;
    this.engine.gravity.y = GRAVITY;
    this.rand = rng(seed);
    /** the reported bodies, their spawn frames, a control called before every step */
    this.bodies = [];
    this.spawn = [];
    this.control = null;
    this.events = {};
    build(this);
    this.track = [];
    this.frame = -1;
    this.added = this.bodies.map(() => false);
  }
  add(body, spawnFrame = 0) {
    this.bodies.push(body);
    this.spawn.push(spawnFrame);
    return body;
  }
  fixed(...bodies) {
    Composite.add(this.engine.world, bodies.map((b) => (Body.setStatic(b, true), b)));
  }
  /** add the bodies whose spawn frame is f (in their creation order) */
  spawnAt(f) {
    this.bodies.forEach((b, i) => {
      if (!this.added[i] && this.spawn[i] <= f) {
        this.added[i] = true;
        if (this.onSpawn) this.onSpawn(b, i, f);
        Composite.add(this.engine.world, b);
      }
    });
  }
  record() {
    const n = this.bodies.length;
    const a = new Float64Array(n * 5);
    this.bodies.forEach((b, i) => {
      a[i * 5] = r2(b.position.x);
      a[i * 5 + 1] = r2(b.position.y);
      a[i * 5 + 2] = Math.round(b.angle * 10000) / 10000;
      a[i * 5 + 3] = this.added[i] ? 1 : 0;
      a[i * 5 + 4] = r2(Math.hypot(b.velocity.x, b.velocity.y));
    });
    this.track.push(a);
  }
  /** step on to frame f (each frame: spawn, PHYS_SUB fixed steps, record) */
  stepTo(f) {
    while (this.frame < f) {
      this.frame++;
      this.spawnAt(this.frame);
      if (this.frame > 0)
        for (let s = 0; s < PHYS_SUB; s++) {
          if (this.control) this.control(this.frame, s);
          Engine.update(this.engine, DT);
        }
      this.record();
    }
  }
  /** the state at sim frame f: [x, y, angle, on, speed] per body */
  at(f) {
    const k = clamp(Math.floor(Number(f) || 0), 0, PHYS_MAX_FRAMES);
    this.stepTo(k);
    return this.track[k];
  }
}

/** one world per props per tab: a frame asked again (or the next frame) costs nothing; a cold tab rebuilds it the same */
const CACHE = new Map();
const CACHE_MAX = 12;
const cached = (kind, p, make) => {
  const key = `${kind}:${JSON.stringify(p)}`;
  let w = CACHE.get(key);
  if (!w) {
    w = make();
    CACHE.set(key, w);
    if (CACHE.size > CACHE_MAX) CACHE.delete(CACHE.keys().next().value);
  }
  return w;
};
/** forget every world (the self-test: a cold build must equal a warm one) */
export const physReset = () => CACHE.clear();

const wall = (x0, y0, x1, y1) => Bodies.rectangle((x0 + x1) / 2, (y0 + y1) / 2, Math.max(1, x1 - x0), Math.max(1, y1 - y0), {friction: 0.4, restitution: 0.1});
/** the stage's own floor and walls: nothing a world throws ever leaves the frame (the guards keep things whole) */
const stageBox = (w, floorY) => {
  const S = PHYS_STAGE;
  w.fixed(wall(S.left - 200, floorY, S.right + 200, floorY + 200), wall(S.left - 200, S.top - 1200, S.left, floorY), wall(S.right, S.top - 1200, S.right + 200, floorY));
};
/** the first of a few seeded x positions in [x0, x1] that keeps 2r clear of every body already near y */
const freeX = (w, x0, x1, y, r, tries = 8) => {
  const near = w.bodies.filter((b, i) => w.added[i] && Math.abs(b.position.y - y) < 3 * r);
  let best = x0 + w.rand() * Math.max(0, x1 - x0);
  let bestD = -1;
  for (let k = 0; k < tries; k++) {
    const x = k === 0 ? best : x0 + w.rand() * Math.max(0, x1 - x0);
    const d = near.reduce((m, b) => Math.min(m, Math.hypot(b.position.x - x, b.position.y - y)), Infinity);
    if (d >= 2.2 * r) return x;
    if (d > bestD) {
      bestD = d;
      best = x;
    }
  }
  return best;
};

// ---- PhysJar: coins or fuel drops filling a jar -----------------------------------------------------------------------

/** the jar's geometry and the pour, from the props (stage px). value: the figure; per: what one coin is worth (default a
 *  nice step that gives about 36 coins); of: a budget, drawn as a line where that many coins reach (measured on its own
 *  pour, budgetY); n: a coin count instead. The coin's size fills the jar about three quarters with the bigger of the two. */
export const jarLayout = (p = {}) => {
  const S = PHYS_STAGE;
  const value = Math.max(0, Number(p.value) || 0);
  const per = Number(p.per) > 0 ? Number(p.per) : niceStep(value / 36);
  const n = clamp(Math.round(Number(p.n) > 0 ? Number(p.n) : value / per), 1, JAR_MAX);
  const of = Number(p.of) > 0 ? Number(p.of) : null;
  const nOf = of ? clamp(Math.round(of / per), 1, JAR_MAX) : 0;
  const jar = {x0: 290, x1: 690, top: 830, floor: 1290, wall: 8};
  const iw = jar.x1 - jar.x0;
  const ih = jar.floor - jar.top;
  const capN = Math.max(n, nOf) / JAR_FILL;
  const r = Number(p.rFix) > 0 ? Number(p.rFix) : clamp(Math.sqrt((PACKING * iw * ih) / (Math.PI * capN)), 12, 44);
  const pour = clamp(Math.round(n * 0.7), 16, 40);
  return {S, value, per, n, of, nOf, over: of !== null && value > of, jar, r, pour, floor: jar.floor, spawnY: [700, 780]};
};
/** coins a jar at most, and the share of its height the bigger pour fills */
export const JAR_MAX = 64;
export const JAR_FILL = 0.74;
export const jarSim = (p = {}) => {
  const L = jarLayout(p);
  const at = Math.max(0, Math.round(Number(p.at) || 0));
  const seed = Number.isFinite(Number(p.seed)) ? Number(p.seed) : hash32(`jar|${L.value}|${L.per}|${L.of}|${L.n}`);
  const key = {v: L.value, per: L.per, of: L.of, n: L.n, r: L.r, at, seed, kind: p.kind === 'drop' ? 'drop' : 'coin'};
  return cached('jar', key, () =>
    new World(seed, (w) => {
      const {jar, r} = L;
      stageBox(w, jar.floor);
      // the jar: a floor and two walls that run on up unseen, so a pour that packs a little high never spills a coin
      w.fixed(wall(jar.x0 - jar.wall, jar.floor, jar.x1 + jar.wall, jar.floor + 40), wall(jar.x0 - jar.wall, jar.top - 6 * r, jar.x0, jar.floor), wall(jar.x1, jar.top - 6 * r, jar.x1 + jar.wall, jar.floor));
      const drop = key.kind === 'drop';
      for (let i = 0; i < L.n; i++) {
        const b = Bodies.circle(0, 0, r, {restitution: drop ? 0.05 : 0.22, friction: drop ? 0.02 : 0.25, frictionAir: drop ? 0.004 : 0.008, density: 0.002, slop: 0.02});
        w.add(b, at + Math.floor((i * L.pour) / L.n));
      }
      w.onSpawn = (b, i) => {
        const y = L.spawnY[0] + ((i * 37) % 3) * ((L.spawnY[1] - L.spawnY[0]) / 3);
        const x = freeX(w, jar.x0 + r + 2, jar.x1 - r - 2, y, r);
        Body.setPosition(b, {x, y});
        Body.setVelocity(b, {x: (w.rand() - 0.5) * 2, y: 4 + w.rand() * 2});
        Body.setAngle(b, w.rand() * Math.PI * 2);
        Body.setAngularVelocity(b, (w.rand() - 0.5) * 0.2);
      };
    }),
  );
};
/** the settled surface of a jar's pour (stage y): the mean of the highest coin tops across four slices of its width */
export const pileTop = (L, a, n = L.n) => {
  const k = 4;
  const tops = Array.from({length: k}, () => L.jar.floor);
  const w = (L.jar.x1 - L.jar.x0) / k;
  for (let i = 0; i < n; i++) {
    if (!a[i * 5 + 3]) continue;
    const s = clamp(Math.floor((a[i * 5] - L.jar.x0) / w), 0, k - 1);
    tops[s] = Math.min(tops[s], a[i * 5 + 1] - L.r);
  }
  return r2(tops.reduce((x, y) => x + y, 0) / k);
};
/** where the budget's own pour settles (stage y), or null: the same coins, poured on their own */
export const budgetY = (p = {}) => {
  const L = jarLayout(p);
  if (!L.of) return null;
  const q = {value: L.of, per: L.per, rFix: L.r, kind: p.kind, seed: Number.isFinite(Number(p.seed)) ? Number(p.seed) : undefined};
  const s = jarSim(q);
  return pileTop(jarLayout(q), s.at(170));
};

// ---- PhysStack: blocks stacking in 2 or 3 columns ----------------------------------------------------------------------

export const STACK_MAX_BLOCKS = 12;
/** columns, blocks a column and the block size (stage px). items[{value}] 2..3; per: one block's worth (default: the
 *  biggest value over STACK_MAX_BLOCKS, rounded to a nice step) */
export const stackLayout = (p = {}) => {
  const S = PHYS_STAGE;
  const items = (Array.isArray(p.items) ? p.items : []).slice(0, 3).map((it) => Math.max(0, Number(it?.value) || 0));
  const k = Math.max(1, items.length);
  const max = Math.max(1e-9, ...items);
  const per = Number(p.per) > 0 ? Number(p.per) : niceStep(max / STACK_MAX_BLOCKS);
  const counts = items.map((v) => clamp(Math.round(v / per), v > 0 ? 1 : 0, STACK_MAX_BLOCKS + 2));
  const exact = items.map((v) => v / per);
  const floor = 1220;
  const gap = 48;
  const colW = (S.right - S.left - gap * (k - 1)) / k;
  const top = 760; // the tallest stack's top (its value sits above it)
  const bh = Math.min(72, Math.floor((floor - top) / Math.max(1, ...counts)));
  const bw = Math.min(230, Math.round(colW * 0.68));
  const cols = items.map((_, i) => S.left + colW * i + gap * i + colW / 2);
  return {S, items, per, counts, exact, floor, colW, bw, bh, cols, spawnY: 640, every: 3};
};
export const stackSim = (p = {}) => {
  const L = stackLayout(p);
  const at = Math.max(0, Math.round(Number(p.at) || 0));
  const seed = Number.isFinite(Number(p.seed)) ? Number(p.seed) : hash32(`stack|${L.items.join(',')}|${L.per}`);
  return cached('stack', {items: L.items, per: L.per, at, seed}, () =>
    new World(seed, (w) => {
      stageBox(w, L.floor);
      // each column's guides (unseen): a block lands square on the one below, a stack never topples into its neighbour
      for (const cx of L.cols) w.fixed(wall(cx - L.bw / 2 - 10, 300, cx - L.bw / 2 - 2, L.floor), wall(cx + L.bw / 2 + 2, 300, cx + L.bw / 2 + 10, L.floor));
      const most = Math.max(0, ...L.counts);
      for (let j = 0; j < most; j++)
        L.cols.forEach((cx, c) => {
          if (j >= L.counts[c]) return;
          const b = Bodies.rectangle(cx, L.spawnY, L.bw, L.bh, {restitution: 0.04, friction: 0.6, frictionStatic: 0.9, density: 0.002, chamfer: {radius: 6}, slop: 0.02});
          b.plugin = {col: c, j};
          w.add(b, at + j * L.every + c);
        });
      w.onSpawn = (b) => {
        Body.setPosition(b, {x: b.position.x + (w.rand() - 0.5) * 6, y: L.spawnY});
        Body.setAngle(b, (w.rand() - 0.5) * 0.12);
        Body.setVelocity(b, {x: 0, y: 7});
      };
    }),
  );
};

// ---- PhysCount: N of M balls pouring into two bins ---------------------------------------------------------------------

/** two bins (stage px): the n marked balls pour into the left, the other of - n into the right; the ball's size fills the
 *  fuller bin to about 70 % */
export const countLayout = (p = {}) => {
  const S = PHYS_STAGE;
  const of = clamp(Math.round(Number(p.of) || 100), 2, PHYS_MAX_BODIES);
  const n = clamp(Math.round(Number(p.n) || 0), 0, of);
  const gap = 56;
  const bw = Math.round((S.right - S.left - gap - 40) / 2);
  const top = 800;
  const floor = 1220;
  const bins = [
    {x0: S.cx - gap / 2 - bw, x1: S.cx - gap / 2},
    {x0: S.cx + gap / 2, x1: S.cx + gap / 2 + bw},
  ];
  const most = Math.max(1, n, of - n);
  const r = clamp(Math.sqrt((0.7 * PACKING * bw * (floor - top)) / (Math.PI * most)), 10, 46);
  const pour = clamp(Math.ceil(of / 3), 10, 36);
  return {S, n, of, bins, top, floor, r, pour, wall: 8, spawnY: [700, 760]};
};
export const countSim = (p = {}) => {
  const L = countLayout(p);
  const at = Math.max(0, Math.round(Number(p.at) || 0));
  const seed = Number.isFinite(Number(p.seed)) ? Number(p.seed) : hash32(`count|${L.n}|${L.of}`);
  return cached('count', {n: L.n, of: L.of, at, seed}, () =>
    new World(seed, (w) => {
      stageBox(w, L.floor);
      for (const b of L.bins) w.fixed(wall(b.x0 - L.wall, L.floor, b.x1 + L.wall, L.floor + 40), wall(b.x0 - L.wall, L.top - 260, b.x0, L.floor), wall(b.x1, L.top - 260, b.x1 + L.wall, L.floor));
      // the order the balls come in: the marked ones spread through the pour by the seed (a sort, not a queue)
      const order = Array.from({length: L.of}, (_, i) => (i < L.n ? 1 : 0));
      const shuf = rng(seed ^ 0x5bd1e995);
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(shuf() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
      order.forEach((mark, i) => {
        const b = Bodies.circle(0, 0, L.r, {restitution: 0.18, friction: 0.12, frictionAir: 0.006, density: 0.002, slop: 0.02});
        b.plugin = {mark};
        w.add(b, at + Math.floor((i * L.pour) / L.of));
      });
      w.onSpawn = (b, i) => {
        const bin = L.bins[b.plugin.mark ? 0 : 1];
        const y = L.spawnY[0] + (i % 2) * (L.spawnY[1] - L.spawnY[0]);
        Body.setPosition(b, {x: freeX(w, bin.x0 + L.r + 2, bin.x1 - L.r - 2, y, L.r), y});
        Body.setVelocity(b, {x: (w.rand() - 0.5) * 2, y: 5 + w.rand() * 2});
      };
    }),
  );
};

/** the first frame (>= from) on which body i's speed drops from a fall to a landing (a sound cue), or null */
export const landing = (sim, i, from = 0, to = from + 90) => {
  for (let f = Math.max(1, from); f <= to; f++) {
    const a = sim.at(f - 1);
    const b = sim.at(f);
    if (a[i * 5 + 3] && b[i * 5 + 3] && a[i * 5 + 4] > 3 && b[i * 5 + 4] < a[i * 5 + 4] * 0.5) return f;
  }
  return null;
};

// ---- the self-test ------------------------------------------------------------------------------------------------------

const selfTest = () => {
  let bad = 0;
  const ok = (cond, what) => {
    if (!cond) bad++;
    console.log(`${cond ? 'ok  ' : 'FAIL'} ${what}`);
  };
  const same = (a, b) => a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
  const S = PHYS_STAGE;
  const inside = (sim, n, f, r = 0) => {
    const a = sim.at(f);
    for (let i = 0; i < n; i++) if (a[i * 5 + 3] && (a[i * 5] - r < S.left - 1 || a[i * 5] + r > S.right + 1 || a[i * 5 + 1] + r > S.bottom || a[i * 5 + 1] - r < S.top)) return false;
    return true;
  };
  const kinds = [
    ['jar', () => jarSim({value: 650, per: 10, of: 500, at: 6})],
    ['jar budget', () => jarSim({value: 500, per: 10, rFix: jarLayout({value: 650, per: 10, of: 500}).r})],
    ['jar drop', () => jarSim({value: 45, kind: 'drop', at: 0})],
    ['stack', () => stackSim({items: [{value: 120}, {value: 900}, {value: 60}], at: 4})],
    ['count', () => countSim({n: 32, of: 100, at: 3})],
  ];
  for (const [name, make] of kinds) {
    // cold, frame by frame; cold, straight to frame 90; warm after another world ran in between: bit for bit the same
    physReset();
    const a = make();
    const walk = [];
    for (let f = 0; f <= 90; f++) walk.push(Array.from(a.at(f)));
    physReset();
    jarSim({value: 123, per: 3}).at(50); // another world first: Matter's globals moved on
    const b = make();
    const jump = Array.from(b.at(90));
    const back = Array.from(b.at(37));
    ok(same(walk[90], jump) && same(walk[37], back), `${name}: frame 90 straight from cold equals frame 90 walked frame by frame, and frame 37 asked after it (${a.bodies.length} bodies)`);
    physReset();
    const c = make();
    ok(same(Array.from(c.at(90)), walk[90]), `${name}: a rebuilt world (another tab) gives the same bits`);
    ok(inside(c, c.bodies.length, 90), `${name}: every body inside the stage at frame 90`);
    const settled = Array.from(c.at(150)).filter((_, k) => k % 5 === 4);
    ok(Math.max(...settled) < 1.5, `${name}: settled by frame 150 (fastest ${Math.max(...settled).toFixed(2)} px a step)`);
  }
  // the jar: every coin in the jar; the pour's height follows the figure; the budget line sits where the budget reaches
  {
    physReset();
    const levels = [];
    for (const p of [{value: 200, per: 10, of: 500}, {value: 500, per: 10, of: 500}, {value: 650, per: 10, of: 500}]) {
      const L = jarLayout(p);
      const a = jarSim(p).at(170);
      let out = 0;
      for (let i = 0; i < L.n; i++) if (a[i * 5] < L.jar.x0 || a[i * 5] > L.jar.x1 || a[i * 5 + 1] < L.jar.top) out++;
      levels.push({p, h: L.jar.floor - pileTop(L, a), b: L.jar.floor - budgetY(p), out, n: L.n});
    }
    ok(levels.every((x) => x.out === 0), `jar: every coin settles inside the jar (${levels.map((x) => x.n).join(', ')} coins)`);
    // a random pile's top varies a few per cent with the seed (the lint PHYS_CLOSE keeps a figure within 15 % of its budget
    // out of a jar): each pile against its own budget line
    ok(levels.every((x) => Math.abs(x.h / x.b - x.p.value / x.p.of) < 0.12), `jar: each pile's height against its budget line follows the figures (${levels.map((x) => `${x.p.value}/${x.p.of}: ${(x.h / x.b).toFixed(2)}`).join(', ')})`);
    ok(levels[0].h < levels[0].b - 60 && levels[2].h > levels[2].b + 40, 'jar: 200 sits well under its 500 line, 650 well over it');
    const L = jarLayout({value: 300, per: 10});
    const fill = (L.jar.floor - pileTop(L, jarSim({value: 300, per: 10}).at(170))) / (L.jar.floor - L.jar.top);
    ok(fill > 0.6 && fill < 0.9, `jar: a pour with no budget fills about three quarters (${Math.round(fill * 100)} %)`);
  }
  // the stack: the columns' heights are their counts (no block lost, none on a neighbour)
  {
    physReset();
    const L = stackLayout({items: [{value: 120}, {value: 900}, {value: 60}]});
    const s = stackSim({items: [{value: 120}, {value: 900}, {value: 60}]});
    const a = s.at(120);
    const tops = L.cols.map((cx, c) => {
      let t = L.floor;
      s.bodies.forEach((b, i) => {
        if (b.plugin.col === c && Math.abs(a[i * 5] - cx) < L.bw / 2) t = Math.min(t, a[i * 5 + 1] - L.bh / 2);
      });
      return Math.round((L.floor - t) / L.bh);
    });
    ok(tops.join(',') === L.counts.join(','), `stack: settled heights ${tops.join(',')} are the counts ${L.counts.join(',')} (per ${L.per})`);
  }
  // the count: the marked balls in the left bin, the rest in the right
  {
    physReset();
    const L = countLayout({n: 32, of: 100});
    const s = countSim({n: 32, of: 100});
    const a = s.at(120);
    let left = 0;
    let right = 0;
    s.bodies.forEach((b, i) => {
      const x = a[i * 5];
      if (x >= L.bins[0].x0 && x <= L.bins[0].x1 && b.plugin.mark) left++;
      if (x >= L.bins[1].x0 && x <= L.bins[1].x1 && !b.plugin.mark) right++;
    });
    ok(left === 32 && right === 68, `count: 32 marked balls in the left bin, 68 in the right (${left}, ${right})`);
  }
  console.log(bad ? `${bad} failed` : 'all ok');
  return bad ? 1 : 0;
};
if (typeof process !== 'undefined' && /physics\.mjs$/.test(process.argv?.[1] ?? '') && process.argv[2] === '--test') process.exit(selfTest());
