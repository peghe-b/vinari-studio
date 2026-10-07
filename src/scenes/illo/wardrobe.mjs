// src/scenes/illo/wardrobe.mjs: who the kit's people are and what they wear (the owner, 2026-10-07, on v81's pair: "the
// boy and the girl, what do they look like? why is the boy in a hoodie? refine them; isn't a NEW character every time
// better, refined, in a suit?"). Plain JavaScript with no imports, so the render (figure.tsx, typed by wardrobe.d.mts)
// and the checks (tools/ci/visual.mjs: CAST_REPEAT and the brief's "Made before" looks) compute the very same people.
//
//   filmKey(id)              the number every look is drawn from: the film's own number (v81-flood-ex, its -en, its hook
//                            variants and redos, its -cover and -wide compositions, a demo named demo-...-v81 -> 81); any
//                            other id (a demo, the kit's gallery) a hash of it
//   dressOf(role, key, o)    a role's look in that film (a Dress, below); o: {variant: another person of the same role,
//                            voice: the film's voice ("me" is a woman when a woman's voice reads the film), gender, age}
//   castDress(cast, key, o)  a Figure's cast (a role, or {is, outfit, hair, ...}) as a Dress: the spec's picks win, the
//                            rest is the role's look in that film, made to fit the picks (a suit gets its shoes)
//   lookLine(d)              the look in a few English words ("man, charcoal suit with a tie, side part, stubble")
//
// The roles keep their sense: boss in a suit, mechanic in a coverall, officer in the uniform, mom and dad in their
// fifties, grandpa and grandma older; me, friend, girl and ex free and stylish. A role's outfit and hair step through
// its pools with the film's number (strides coprime with the pool's length), so "me" never wears the outfit or the hair
// of the three films before; the people of one film avoid "me"'s outfit. Deterministic: a hash, never Math.random.
// Tones are steps of the kit's grey ramp (0 lightest .. 7 darkest; "Graphite" is grey only, colour carries data).

const freeze = (o) => {
  if (o && typeof o === 'object' && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o)) freeze(v);
  }
  return o;
};

export const ROLES = freeze(['me', 'friend', 'girl', 'mom', 'grandpa', 'mechanic', 'seller', 'officer', 'boss', 'crowd', 'ex', 'man', 'woman', 'dad', 'grandma', 'buyer', 'neighbour']);
export const OUTFITS = freeze(['suit', 'suitOpen', 'blazer', 'leather', 'bomber', 'denim', 'trench', 'overcoat', 'puffer', 'shirt', 'polo', 'turtleneck', 'knit', 'hoodie', 'tee', 'cardigan', 'blouse', 'dress', 'coverall', 'uniform']);
export const HAIRS = freeze(['crop', 'side', 'quiff', 'slick', 'fade', 'buzz', 'curly', 'wavy', 'manbun', 'textured', 'receding', 'bald', 'long', 'waves', 'bob', 'lob', 'pixie', 'pony', 'bun', 'curls', 'lowbun']);
export const BEARDS = freeze(['stubble', 'short', 'full', 'tache', 'goatee']);
export const SHOES = freeze(['sneaker', 'derby', 'loafer', 'chelsea', 'boot', 'heel', 'flat']);
export const BOTTOMS = freeze(['trousers', 'jeans', 'chinos', 'skirt']);
export const GLASSES = freeze(['round', 'rect', 'shades', 'aviator', 'shadesUp']);
export const HATS = freeze(['cap', 'capBack', 'beanie', 'flatCap', 'peaked']);
/** The kit's old names, still read: an old spec's outfit or hair. */
const OUTFIT_ALIAS = {jacket: 'bomber', top: 'blouse', overalls: 'coverall', coat: 'overcoat', sweater: 'knit', jumper: 'knit', tshirt: 'tee'};
const HAIR_ALIAS = {short: 'crop', neat: 'side', grey: 'side', ponytail: 'pony', curlyTop: 'curly'};
const FEMALE_ONLY = new Set(['blouse', 'dress', 'long', 'waves', 'bob', 'lob', 'pixie', 'pony', 'bun', 'curls', 'lowbun']);
const FEM_HAIR = ['long', 'waves', 'bob', 'lob', 'pixie', 'pony', 'bun', 'curls', 'lowbun'];

// ---- the deterministic dice ---------------------------------------------------------------------------------------
const h32 = (s) => {
  let h = 2166136261;
  for (const ch of String(s)) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
};
const rnd = (...k) => h32(k.join('|')) / 4294967296;
const pick = (list, r) => list[Math.min(list.length - 1, Math.max(0, Math.floor(r * list.length)))];
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
/** The pool index of film `key`: a stride coprime with the pool's length, so 4 films in a row never repeat one. */
const stepOf = (key, n, salt) => {
  const stride = [5, 7, 3, 11, 13].find((s) => gcd(s, n) === 1 && s % n !== 0) ?? 1;
  return (((key * stride + h32(salt)) % n) + n) % n;
};

/** The number a film's people come from (see the header). */
export const filmKey = (id) => {
  if (typeof id === 'number' && Number.isFinite(id)) return Math.abs(Math.round(id));
  const s = String(id ?? '').replace(/-(?:wide|cover)$/, '');
  const m = /(?:^|-)v(\d+)(?=-|$)/.exec(s);
  return m ? Number(m[1]) : 100000 + (h32(s) % 900000);
};

// ---- the roles ------------------------------------------------------------------------------------------------------
// sex: the chance of a woman ('voice': the film's voice, 'other': the opposite of "me"); age: 0 young adult, 1 in the
// fifties, 2 older; pool: the outfits it draws from
const ROLE = {
  me: {sex: 'voice', age: [0], pool: 'style'},
  friend: {sex: 0.35, age: [0], pool: 'style'},
  girl: {sex: 1, age: [0], pool: 'style'},
  ex: {sex: 'other', age: [0], pool: 'coat'},
  man: {sex: 0, age: [0, 1], pool: 'smart'},
  woman: {sex: 1, age: [0, 1], pool: 'smart'},
  mom: {sex: 1, age: [1], pool: 'parent'},
  dad: {sex: 0, age: [1], pool: 'parent'},
  grandpa: {sex: 0, age: [2], pool: 'elder'},
  grandma: {sex: 1, age: [2], pool: 'elder'},
  mechanic: {sex: 0, age: [0, 1], pool: 'coverall'},
  seller: {sex: 0, age: [1, 0], pool: 'seller'},
  buyer: {sex: 0.4, age: [0, 1], pool: 'smart'},
  officer: {sex: 0.2, age: [0, 1], pool: 'uniform'},
  boss: {sex: 0.3, age: [1, 0], pool: 'suit'},
  neighbour: {sex: 0.5, age: [1, 2], pool: 'casual'},
  crowd: {sex: 0.5, age: [0, 0, 0, 1, 2], pool: 'any'},
};
const POOLS = {
  // 12 each: the stride 5 keeps "me" out of the outfits of the three films before
  style: {m: ['suitOpen', 'leather', 'bomber', 'overcoat', 'shirt', 'turtleneck', 'blazer', 'puffer', 'polo', 'denim', 'knit', 'trench'], f: ['dress', 'leather', 'trench', 'blazer', 'turtleneck', 'puffer', 'blouse', 'overcoat', 'knit', 'bomber', 'shirt', 'denim']},
  coat: {m: ['overcoat', 'trench', 'leather', 'suitOpen', 'turtleneck', 'blazer'], f: ['trench', 'overcoat', 'dress', 'leather', 'blazer', 'turtleneck']},
  smart: {m: ['shirt', 'polo', 'knit', 'overcoat', 'blazer', 'puffer', 'bomber', 'suitOpen', 'leather', 'denim', 'tee'], f: ['blouse', 'knit', 'trench', 'dress', 'blazer', 'puffer', 'turtleneck', 'overcoat', 'shirt', 'denim', 'leather']},
  parent: {m: ['shirt', 'knit', 'polo', 'overcoat', 'cardigan', 'suitOpen', 'puffer'], f: ['cardigan', 'blouse', 'knit', 'trench', 'overcoat', 'dress', 'turtleneck']},
  elder: {m: ['cardigan', 'knit', 'overcoat', 'shirt', 'suitOpen'], f: ['cardigan', 'knit', 'overcoat', 'blouse', 'dress']},
  coverall: {m: ['coverall'], f: ['coverall']},
  uniform: {m: ['uniform'], f: ['uniform']},
  suit: {m: ['suit', 'suitOpen', 'suit'], f: ['suit', 'suitOpen', 'suit']},
  seller: {m: ['leather', 'bomber', 'shirt', 'polo', 'suitOpen'], f: ['leather', 'blazer', 'blouse', 'trench']},
  casual: {m: ['knit', 'cardigan', 'tee', 'puffer', 'shirt', 'polo'], f: ['knit', 'cardigan', 'puffer', 'blouse', 'turtleneck', 'trench']},
  any: {m: ['tee', 'hoodie', 'shirt', 'knit', 'bomber', 'puffer', 'polo', 'denim', 'overcoat', 'leather', 'blazer', 'turtleneck'], f: ['blouse', 'dress', 'knit', 'puffer', 'trench', 'turtleneck', 'denim', 'leather', 'blazer', 'shirt', 'tee', 'overcoat']},
};
const HAIR_POOLS = {
  m: [
    ['crop', 'side', 'quiff', 'slick', 'fade', 'buzz', 'curly', 'wavy', 'manbun', 'textured'],
    ['side', 'slick', 'crop', 'receding', 'buzz', 'quiff', 'fade'],
    ['receding', 'side', 'bald', 'slick'],
  ],
  f: [
    ['long', 'waves', 'bob', 'lob', 'pixie', 'pony', 'bun', 'curls', 'lowbun'],
    ['bob', 'lob', 'lowbun', 'waves', 'pixie', 'bun', 'long'],
    ['bun', 'pixie', 'bob', 'curls'],
  ],
};
// a role's own hair rules
const ROLE_HAIR = {officer: {m: ['crop', 'buzz', 'side', 'fade'], f: ['lowbun', 'pony', 'bun']}, boss: {m: ['side', 'slick', 'crop', 'quiff', 'receding']}, mechanic: {m: ['crop', 'buzz', 'textured', 'curly', 'side', 'fade']}};
// Georgia: dark hair mostly, some brown, rare light; grey with age (tones of the ramp)
const HAIR_TONES = [[7, 7, 6, 6, 6, 7, 5, 4], [7, 6, 5, 6, 4, 3, 2], [1, 2, 2, 3, 1]];
const SKINS = [0, 1, 1, 2, 2, 1, 3];

// ---- what goes with an outfit ---------------------------------------------------------------------------------------
// tones: the garment; inner: what shows under it ([kind, tones]); bottoms; shoes (m, f); sleeve: long | short | rolled
const OUT = {
  suit: {tones: [7, 6, 5, 6, 7], inner: [['shirt', [0, 0, 1]]], bottoms: ['suit'], shoes: {m: ['derby', 'loafer', 'derby'], f: ['heel', 'loafer', 'heel']}, sleeve: 'long'},
  suitOpen: {tones: [6, 5, 7, 3, 4], inner: [['shirt', [0, 1, 7]], ['tee', [0, 7]]], bottoms: ['suit'], shoes: {m: ['loafer', 'chelsea', 'derby', 'sneaker'], f: ['heel', 'loafer', 'chelsea']}, sleeve: 'long'},
  blazer: {tones: [4, 3, 5, 6, 2], inner: [['tee', [0, 7, 1]], ['turtleneck', [7, 0]]], bottoms: ['jeans', 'chinos', 'trousers'], shoes: {m: ['loafer', 'chelsea', 'sneaker'], f: ['heel', 'chelsea', 'flat', 'sneaker']}, sleeve: 'long'},
  leather: {tones: [7, 6, 7], inner: [['tee', [0, 1, 5]]], bottoms: ['jeans', 'jeans', 'trousers'], shoes: {m: ['chelsea', 'boot', 'sneaker'], f: ['chelsea', 'boot', 'heel']}, sleeve: 'long'},
  bomber: {tones: [6, 2, 5, 4, 7, 3], inner: [['tee', [0, 1, 7]]], bottoms: ['jeans', 'chinos'], shoes: {m: ['sneaker'], f: ['sneaker', 'boot']}, sleeve: 'long'},
  denim: {tones: [3, 4, 5], inner: [['tee', [0, 7, 1]]], bottoms: ['jeans', 'chinos'], shoes: {m: ['sneaker', 'boot'], f: ['sneaker', 'boot']}, sleeve: 'long'},
  trench: {tones: [1, 2, 3, 2], inner: [['turtleneck', [7, 6, 0]], ['shirt', [0]]], bottoms: ['trousers', 'jeans'], shoes: {m: ['chelsea', 'derby', 'loafer'], f: ['boot', 'heel', 'chelsea']}, sleeve: 'long', fbottoms: ['skirt', 'jeans', 'trousers']},
  overcoat: {tones: [6, 7, 5, 4, 6], inner: [['turtleneck', [7, 0, 6, 2]], ['knit', [2, 1]], ['shirt', [0]]], bottoms: ['trousers', 'jeans'], shoes: {m: ['chelsea', 'derby', 'boot'], f: ['boot', 'heel', 'chelsea']}, sleeve: 'long', fbottoms: ['skirt', 'trousers', 'jeans']},
  puffer: {tones: [7, 6, 1, 0, 3, 5], inner: [['none', [0]]], bottoms: ['jeans', 'jeans', 'chinos'], shoes: {m: ['sneaker', 'boot'], f: ['sneaker', 'boot']}, sleeve: 'long'},
  shirt: {tones: [0, 1, 2, 4, 6, 0], inner: [['none', [0]]], bottoms: ['chinos', 'trousers', 'jeans'], shoes: {m: ['loafer', 'sneaker', 'derby'], f: ['flat', 'heel', 'sneaker']}, sleeve: 'rolled', tucked: true, fbottoms: ['trousers', 'skirt', 'jeans']},
  polo: {tones: [0, 7, 5, 2, 3], inner: [['none', [0]]], bottoms: ['chinos', 'jeans'], shoes: {m: ['sneaker', 'loafer'], f: ['sneaker', 'flat']}, sleeve: 'short'},
  turtleneck: {tones: [7, 6, 0, 2, 4], inner: [['none', [0]]], bottoms: ['trousers', 'jeans', 'chinos'], shoes: {m: ['chelsea', 'loafer', 'derby'], f: ['boot', 'heel', 'flat']}, sleeve: 'long', tucked: true, fbottoms: ['skirt', 'trousers', 'jeans']},
  knit: {tones: [1, 2, 3, 4, 5, 6], inner: [['none', [0]], ['shirt', [0, 1]]], bottoms: ['chinos', 'jeans', 'trousers'], shoes: {m: ['sneaker', 'loafer', 'chelsea'], f: ['boot', 'flat', 'sneaker']}, sleeve: 'long', fbottoms: ['skirt', 'jeans', 'trousers']},
  hoodie: {tones: [3, 4, 6, 2], inner: [['none', [0]]], bottoms: ['jeans', 'chinos'], shoes: {m: ['sneaker'], f: ['sneaker']}, sleeve: 'long'},
  tee: {tones: [0, 7, 1, 6], inner: [['none', [0]]], bottoms: ['jeans', 'chinos'], shoes: {m: ['sneaker', 'sneaker', 'chelsea'], f: ['sneaker', 'flat']}, sleeve: 'short'},
  cardigan: {tones: [2, 3, 4, 5], inner: [['blouse', [0, 1]], ['shirt', [0, 1]]], bottoms: ['trousers', 'chinos'], shoes: {m: ['loafer', 'derby'], f: ['flat', 'loafer']}, sleeve: 'long', fbottoms: ['skirt', 'trousers']},
  blouse: {tones: [0, 1, 2, 6, 0], inner: [['none', [0]]], bottoms: ['skirt', 'trousers', 'jeans'], shoes: {m: ['loafer'], f: ['heel', 'flat', 'boot']}, sleeve: 'long', tucked: true},
  dress: {tones: [7, 6, 1, 2, 4, 5], inner: [['none', [0]]], bottoms: ['none'], shoes: {m: ['loafer'], f: ['heel', 'flat', 'boot', 'sneaker']}, sleeve: 'short'},
  coverall: {tones: [4, 5, 3, 6], inner: [['tee', [1, 6]]], bottoms: ['none'], shoes: {m: ['boot'], f: ['boot']}, sleeve: 'rolled'},
  uniform: {tones: [5, 6, 5], inner: [['none', [0]]], bottoms: ['trousers'], shoes: {m: ['boot', 'derby'], f: ['boot', 'derby']}, sleeve: 'long', tucked: true},
};
const LEG_TONES = {jeans: [5, 4, 6, 3, 5], chinos: [2, 1, 3, 6, 2], trousers: [6, 7, 5, 6], skirt: [7, 6, 1, 2, 4, 5]};
const BEARD_POOLS = {
  young: [null, null, null, 'stubble', 'stubble', 'short', 'full', 'tache'],
  adult: [null, null, 'stubble', 'short', 'full', 'tache', 'goatee'],
  old: [null, 'tache', 'full', 'short', 'tache'],
  officer: [null, null, 'stubble', 'tache'],
  boss: [null, null, 'stubble', 'short'],
  mechanic: ['stubble', 'full', 'short', null, 'stubble'],
  seller: ['tache', 'stubble', 'goatee', 'tache'],
};

const sexOf = (role, key, variant, voice) => {
  const s = ROLE[role]?.sex ?? 0.5;
  const meFem = /achernar|eka|female|ava|svetlana/i.test(String(voice ?? ''));
  if (s === 'voice') return meFem;
  if (s === 'other') return !meFem;
  return rnd(key, role, variant, 'sex') < s;
};

// the film's leading people, in order: each one avoids the outfits and the hair of the ones before it
const LEADS = ['me', 'friend', 'girl'];
const memo = new Map();
/** A role's look in film `key` (see the header). */
export const dressOf = (role0, key0 = 0, o = {}) => {
  const mk = `${role0}|${key0}|${o.variant ?? 0}|${o.voice ?? ''}|${o.gender ?? ''}|${o.age ?? ''}`;
  const hit = memo.get(mk);
  if (hit) return {...hit};
  const d = dressOf0(role0, key0, o);
  if (memo.size > 4000) memo.clear();
  memo.set(mk, freeze({...d}));
  return d;
};
const dressOf0 = (role0, key0 = 0, o = {}) => {
  const role = ROLE[role0] ? role0 : 'me';
  const key = Math.abs(Math.round(Number(key0) || 0));
  const variant = Math.abs(Math.round(Number(o.variant) || 0));
  const r = (salt) => rnd(key, role, variant, salt);
  const fem = typeof o.gender === 'string' ? o.gender === 'f' : sexOf(role, key, variant, o.voice);
  const g = fem ? 'f' : 'm';
  const ages = ROLE[role].age;
  const age = typeof o.age === 'number' ? Math.max(0, Math.min(2, o.age)) : pick(ages, r('age'));
  // the outfit: the role's pool stepped by the film's number; the others of the film avoid "me"'s outfit
  let pool = POOLS[ROLE[role].pool][g];
  if (role === 'crowd' && age === 2) pool = POOLS.elder[g];
  if (role === 'crowd' && age === 1) pool = POOLS.parent[g];
  // the people before this one in the film (me, friend, girl; the role's own first person for a second one): their
  // outfits and hair are not repeated
  const before = role === 'crowd' ? [] : [...LEADS.slice(0, Math.max(0, LEADS.indexOf(role) < 0 ? LEADS.length : LEADS.indexOf(role))).map((x) => dressOf(x, key, {voice: o.voice})), ...(variant > 0 ? [dressOf(role, key, {voice: o.voice})] : [])];
  let oi = stepOf(key + variant * 7, pool.length, `${role}:o:${variant}`);
  if (pool.length > 2) for (let t = 0; t < pool.length && before.some((b) => b.outfit === pool[oi]); t++) oi = (oi + 1) % pool.length;
  const outfit = pool[oi];
  // the hair
  const hp = ROLE_HAIR[role]?.[g] ?? HAIR_POOLS[g][age];
  let hi = stepOf(key + variant * 11, hp.length, `${role}:h:${variant}`);
  if (hp.length > 2) for (let t = 0; t < hp.length && before.some((b) => b.hair === hp[hi]); t++) hi = (hi + 1) % hp.length;
  const d = {
    role,
    fem,
    age,
    skin: pick(SKINS, r('skin')),
    build: fem ? 0.96 + 0.06 * r('build') : 0.97 + 0.09 * r('build'),
    hair: hp[hi],
    hairTone: pick(HAIR_TONES[age], r('hairTone')),
    beard: null,
    outfit,
    tone: 0,
    inner: 'none',
    innerTone: 0,
    tie: null,
    bottom: 'trousers',
    legs: 6,
    shoe: 'sneaker',
    shoeTone: 7,
    sole: null,
    glasses: null,
    hat: null,
    hatTone: 6,
    watch: false,
    chain: false,
    earrings: null,
    bag: false,
    scarf: null,
    sleeve: 'long',
    tucked: false,
  };
  if (!fem) {
    const bp = BEARD_POOLS[role] ?? BEARD_POOLS[age === 0 ? 'young' : age === 1 ? 'adult' : 'old'];
    d.beard = pick(bp, r('beard'));
  }
  // accessories by role
  const gl = r('glasses');
  if (role === 'seller') d.glasses = gl < 0.5 ? 'shadesUp' : gl < 0.7 ? 'aviator' : null;
  else if (role === 'boss') d.glasses = gl < 0.3 ? 'rect' : null;
  else if (age === 2) d.glasses = gl < 0.7 ? (gl < 0.35 ? 'round' : 'rect') : null;
  else if (role === 'mom' || role === 'dad') d.glasses = gl < 0.4 ? (gl < 0.2 ? 'round' : 'rect') : null;
  else d.glasses = gl < 0.12 ? (gl < 0.06 ? 'round' : 'rect') : null;
  if (role === 'officer') d.hat = 'peaked';
  const ht = r('hat');
  if (role === 'mechanic') d.hat = ht < 0.4 ? 'capBack' : ht < 0.55 ? 'beanie' : null;
  if (role === 'grandpa') d.hat = ht < 0.5 ? 'flatCap' : null;
  d.hatTone = pick([6, 7, 5, 2], r('hatTone'));
  d.watch = !fem && r('watch') < (role === 'boss' ? 0.85 : 0.4);
  d.earrings = fem && r('ear') < 0.75 ? (r('ear2') < 0.55 ? 'stud' : 'hoop') : null;
  d.bag = fem && age < 2 && role !== 'officer' && r('bag') < 0.35;
  fit(d, key, variant, true);
  return d;
};

/** Everything that follows from the outfit (its tones, what shows under it, the bottoms, the shoes, the sleeves). `own`:
 *  the role's own extras (a cap with a puffer, a chain with a tee) may come too. */
const fit = (d, key, variant, own) => {
  const r = (salt) => rnd(key, d.role, variant, d.outfit, salt);
  const g = d.fem ? 'f' : 'm';
  const def = OUT[d.outfit] ?? OUT.tee;
  d.tone = pick(def.tones, r('tone'));
  const [inner, itones] = pick(def.inner, r('inner'));
  d.inner = d.fem && inner === 'shirt' && d.outfit !== 'suit' && r('blouse') < 0.5 ? 'blouse' : inner;
  d.innerTone = pick(itones, r('innerTone'));
  if (d.inner !== 'none' && Math.abs(d.innerTone - d.tone) < 2) d.innerTone = d.tone > 3 ? 0 : 7;
  d.tie = d.outfit === 'suit' && !d.fem ? pick([2, 7, 4, 5, 3], r('tie')) : null;
  if (d.tie !== null && Math.abs(d.tie - d.tone) < 1.5) d.tie = d.tone > 3 ? 2 : 6;
  const bots = (d.fem && def.fbottoms) || def.bottoms;
  const b = pick(bots, r('bottom'));
  d.bottom = b === 'suit' ? 'trousers' : b;
  d.legs = b === 'suit' ? d.tone : b === 'none' ? d.tone : pick(LEG_TONES[b] ?? [6], r('legs'));
  if (b !== 'suit' && b !== 'none' && Math.abs(d.legs - d.tone) < 1.5 && d.outfit !== 'uniform') d.legs = d.tone > 3 ? Math.max(0, d.tone - 3) : Math.min(7, d.tone + 3);
  if (d.outfit === 'uniform') d.legs = 6;
  d.shoe = pick(def.shoes[g], r('shoe'));
  d.shoeTone = d.shoe === 'sneaker' ? pick([0, 0, 7, 1, 6], r('shoeTone')) : pick([7, 6, 7, 5], r('shoeTone'));
  d.sole = d.shoe === 'sneaker' ? (d.shoeTone > 3 ? pick([0, 1], r('sole')) : 1) : null;
  d.sleeve = def.sleeve === 'rolled' ? (d.outfit === 'shirt' && r('roll') < 0.5 ? 'long' : 'rolled') : def.sleeve;
  if (d.outfit === 'dress' || d.outfit === 'blouse') d.sleeve = r('sl') < 0.5 ? 'short' : 'long';
  d.tucked = Boolean(def.tucked) && !(d.outfit === 'shirt' && r('untuck') < 0.35);
  d.scarf = (d.outfit === 'overcoat' || d.outfit === 'trench') && r('scarf') < 0.35 ? pick([0, 7, 3], r('scarfTone')) : null;
  if (own) {
    d.chain = !d.fem && (d.outfit === 'tee' || d.outfit === 'polo' || d.outfit === 'leather' || d.outfit === 'bomber') && r('chain') < (d.role === 'seller' ? 0.85 : 0.35);
    if (!d.hat && d.age === 0 && (d.outfit === 'puffer' || d.outfit === 'bomber' || d.outfit === 'hoodie' || d.outfit === 'denim')) {
      const h = r('hat2');
      d.hat = h < 0.14 ? 'cap' : h < 0.28 ? 'beanie' : null;
    }
  }
};

/** A Figure's cast as a Dress (see the header). */
export const castDress = (cast, key = 0, o = {}) => {
  const c = typeof cast === 'string' ? {is: cast} : cast && typeof cast === 'object' ? cast : {is: 'me'};
  const role = ROLE[c.is] ? c.is : 'me';
  const variant = Number.isFinite(c.look) ? Math.abs(Math.round(c.look)) : role === 'crowd' && Number.isFinite(c.seed) ? Math.abs(Math.round(c.seed)) : 0;
  const age = c.age === 'young' ? 0 : c.age === 'adult' ? 1 : c.age === 'old' ? 2 : undefined;
  const outfit0 = typeof c.outfit === 'string' ? OUTFIT_ALIAS[c.outfit] ?? c.outfit : null;
  const hair0 = typeof c.hair === 'string' ? HAIR_ALIAS[c.hair] ?? c.hair : null;
  // a pick that only a woman wears makes the person a woman, unless the spec says otherwise
  const gender = c.gender === 'f' || c.gender === 'm' ? c.gender : (outfit0 && FEMALE_ONLY.has(outfit0)) || (hair0 && FEM_HAIR.includes(hair0)) ? 'f' : undefined;
  const d = dressOf(role, key, {variant, voice: o.voice, gender, age});
  if (outfit0 && OUTFITS.includes(outfit0) && outfit0 !== d.outfit) {
    d.outfit = outfit0;
    fit(d, key, variant, false);
  }
  if (hair0 && HAIRS.includes(hair0)) d.hair = hair0;
  if (c.hair === 'grey' && d.hairTone > 3) d.hairTone = 2;
  const num = (v, lo, hi) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : null);
  if (num(c.hairTone, 0, 7) !== null) d.hairTone = num(c.hairTone, 0, 7);
  if (num(c.skin, 0, 3) !== null) d.skin = Math.round(num(c.skin, 0, 3));
  if (num(c.tone, 0, 7) !== null) d.tone = num(c.tone, 0, 7);
  if (num(c.legs, 0, 7) !== null) d.legs = num(c.legs, 0, 7);
  if (c.beard === null || c.beard === 'none') d.beard = null;
  else if (BEARDS.includes(c.beard) && !d.fem) d.beard = c.beard;
  if (c.glasses === null || c.glasses === 'none') d.glasses = null;
  else if (GLASSES.includes(c.glasses)) d.glasses = c.glasses;
  if (c.hat === null || c.hat === 'none') d.hat = null;
  else if (HATS.includes(c.hat)) d.hat = c.hat;
  if (SHOES.includes(c.shoe)) d.shoe = c.shoe;
  if (BOTTOMS.includes(c.bottom) && d.outfit !== 'dress' && d.outfit !== 'coverall') d.bottom = c.bottom;
  const ex = Array.isArray(c.extras) ? c.extras : [];
  for (const x of ex) {
    if (x === 'watch') d.watch = true;
    if (x === 'chain') d.chain = true;
    if (x === 'earrings') d.earrings = d.earrings ?? 'stud';
    if (x === 'hoops') d.earrings = 'hoop';
    if (x === 'bag') d.bag = true;
    if (x === 'scarf') d.scarf = d.scarf ?? (d.tone > 3 ? 0 : 7);
    if (x === 'tie') d.tie = d.tie ?? (d.tone > 3 ? 2 : 6);
  }
  return d;
};

// ---- words ------------------------------------------------------------------------------------------------------------
const TONE_WORDS = ['white', 'light grey', 'pale grey', 'grey', 'mid grey', 'dark grey', 'charcoal', 'black'];
const OUTFIT_WORDS = {
  suit: 'suit with a tie', suitOpen: 'suit, open collar', blazer: 'blazer', leather: 'leather jacket', bomber: 'bomber', denim: 'denim jacket',
  trench: 'trench coat', overcoat: 'overcoat', puffer: 'puffer', shirt: 'shirt', polo: 'polo', turtleneck: 'turtleneck', knit: 'knit sweater',
  hoodie: 'hoodie', tee: 'tee', cardigan: 'cardigan', blouse: 'blouse', dress: 'dress', coverall: 'coverall', uniform: 'police uniform',
};
const HAIR_WORDS = {
  crop: 'short crop', side: 'side part', quiff: 'quiff', slick: 'slicked back', fade: 'fade', buzz: 'buzz cut', curly: 'curly top', wavy: 'wavy hair',
  manbun: 'man bun', textured: 'textured crop', receding: 'receding hair', bald: 'bald', long: 'long hair', waves: 'long waves', bob: 'bob', lob: 'long bob',
  pixie: 'pixie cut', pony: 'ponytail', bun: 'top bun', curls: 'curls', lowbun: 'low bun',
};
/** The look in a few English words (the brief, the checks). */
export const lookLine = (d) => {
  if (!d) return '';
  const who = `${d.age === 2 ? 'older ' : d.age === 1 ? '' : 'young '}${d.fem ? 'woman' : 'man'}`;
  const top = `${TONE_WORDS[Math.round(d.tone)] ?? ''} ${OUTFIT_WORDS[d.outfit] ?? d.outfit}`.trim();
  const inner = d.inner !== 'none' && ['blazer', 'suitOpen', 'leather', 'bomber', 'denim', 'overcoat', 'trench'].includes(d.outfit) ? ` over a ${d.inner}` : '';
  const parts = [who, top + inner, HAIR_WORDS[d.hair] ?? d.hair];
  if (d.beard) parts.push(d.beard === 'tache' ? 'moustache' : d.beard === 'stubble' ? 'stubble' : `${d.beard} beard`);
  if (d.glasses) parts.push(d.glasses === 'shadesUp' || d.glasses === 'aviator' || d.glasses === 'shades' ? 'sunglasses' : 'glasses');
  if (d.hat) parts.push(d.hat === 'peaked' ? 'peaked cap' : d.hat === 'flatCap' ? 'flat cap' : d.hat === 'capBack' ? 'cap' : d.hat);
  return parts.join(', ');
};
/** The two things CAST_REPEAT compares: the outfit and the hair. */
export const lookKey = (d) => (d ? `${d.outfit}/${d.hair}` : '');
