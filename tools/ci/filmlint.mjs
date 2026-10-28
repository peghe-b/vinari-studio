// The safety and house lint of a Film scene (src/scenes/film/<Name>.tsx): one-off drawing code that the cloud
// Claude writes for one film (docs/scenes.md, Film scenes). The film's topic is typed on a website, so a film
// file must be pure drawing code: this reads it AS TEXT (the TypeScript parser, never import or require) and
// refuses anything else, one line per problem, each starting with "FILM".
//
//   node tools/ci/filmlint.mjs [<Name> | src/scenes/film/<Name>.tsx ...]   no argument: every film + the template
//     exit 0 = every file passes, 1 = a FILM line was printed, 2 = usage (only names inside src/scenes/film/)
//   import {lintFilm} from './ci/filmlint.mjs'   lintFilm(file, {name}) -> {errors: string[]}  (tools/build-index.mjs,
//     tools/check.mjs)
//
// The rules (the header of src/scenes/film/_template.tsx says them to the author):
// - one file a scene, at most MAX_BYTES, named <Name>.tsx (PascalCase, the film's id: v26-night-scan -> V26NightScan; a
//   film may have up to three, the others <Name><Word>.tsx, V26NightScanHook: tools/ci/visual.mjs isOwnFilm, and check.mjs
//   holds them to MAX_BYTES together), with exactly one export: the component `export const <Name>` (or `export function
//   <Name>`), no default export
// - imports: only the modules in MODULES (the exact specifiers, relative to src/scenes/film/), only names they
//   really export (a missing name would break the shared bundle), no namespace, side-effect or dynamic import
// - no browser or network API, no timer, no clock, no randomness: the names in GLOBALS may not appear as a name at
//   all, the names in PROPS not as a property; Math.random, Date, eval, Function, import(), require, this, with,
//   debugger, `declare` are refused; `ref` (a handle on the page) too
// - a computed key is a NUMBER: a[2], a[i] with i a number the film counted itself (for (let i = 0; ...), const
//   k = Math.floor(...)), a[+i] or a[i | 0]; never a string or a value of unknown kind (a key pieced together from
//   text reaches anything: ["con", "structor"].join("") -> Function)
// - strings: no URL (http:, https:, ws:, //host anywhere, blob:, javascript:, file:), no data: URL over DATA_MAX, CSS
//   url() only as url(#id), no @import, no forbidden name spelled in a string; no em dash, no "!" in text, no Mtavruli
//   code points (mtav() makes them at render time); no street word of ci/street-words.json (a banned one never, an
//   allowed one only as a prop from the spec: tools/ci/streetwords.mjs). A style key that can load a file (background, mask, borderImage,
//   content, cursor, filter, --custom ...) takes only literals, numbers, colours from C / rgba() / halo() / toneBig()
//   and consts made of those: never text pieced together ("u" + "rl(" ...)
// - JSX: no element that loads or runs anything (script, iframe, img, a, image, foreignObject ...), no event handler,
//   no src/href/srcDoc but <use href="#id">, no namespaced attribute (xlink:href), images only as
//   <Img src={staticFile('<public path>')}>; a <Capitalised> tag is an imported or a locally written component
// - nothing shared is changed: no assignment, ++, delete or mutating method (push, sort, set ...) on an imported
//   binding, a global (Math, Object ...), a const that holds one, or what an imported function returns, through any
//   cast; Object.assign / freeze / defineProperty, Reflect are refused outright (C, L and the mix are shared by every
//   scene; src/tokens.ts also freezes its tables, so a write the lint misses throws at render)
// - top level: imports, types, const/let and function declarations, the export; a top-level value is a literal, a
//   function, or an object, array or arithmetic of those (Math.* allowed): no call, new or assignment runs on load
//
// Where it runs: tools/build-index.mjs (a spec whose film fails is an ERROR for that spec only: it is left out of the
// index, and the other films still bundle), tools/check.mjs (before the voice, FILM lines), and the cloud Claude runs
// it by hand. No Node tool ever imports a film file: only the Remotion bundle does (the browser that renders the
// frames; src/generated/films.ts, written by build-index). Checked with: grep -rn "scenes/film" tools/ (only text
// reads: build-index, check, filmlint).
//
// Limits (said plainly): this is a static lint, defence in depth, with one scope for all names (a name declared twice
// must pass both ways). It does not follow values through function parameters or into arrays (a local helper that
// writes to its argument, called with C), and JavaScript has more doors than any list. The walls behind it: the
// render page holds no secret (no key or token is in the bundle or the page; the workflow's secrets live in other
// processes' env), src/index.ts puts a Content-Security-Policy on the page while rendering (only the bundle's own
// files load, nothing outside, no eval or Function), and src/tokens.ts freezes the shared tables.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {bannedHits, streetLoose} from './streetwords.mjs';
import {KIT_FROM, kitOn} from '../../src/lib/kit.mjs';
import {guardOn, META_STAGE_BOTTOM, polishOn, SUB_BAND_STAGE} from '../../src/lib/guard.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const FILM_DIR = path.join(root, 'src', 'scenes', 'film');
// 90 KB since plan step 1.3 (2026-10-26: up to three Film files a film, together at most this; it was 30 KB for one file)
export const MAX_BYTES = 90 * 1024;
const DATA_MAX = 2048;

// react and remotion: the value names a film may import (type-only imports of anything are fine)
const REACT = ['default', 'Fragment', 'useMemo', 'useCallback', 'useId', 'memo'];
const REMOTION = ['AbsoluteFill', 'Easing', 'Img', 'interpolate', 'interpolateColors', 'random', 'Sequence', 'spring', 'staticFile', 'useCurrentFrame', 'useVideoConfig'];
// our modules: every export but these (they change state every scene shares)
const NOT_FROM = {
  '../common': ['setMix'],
  '../../tokens': ['setTheme', 'setAccentMode', 'setMono', 'setAccents', 'setMotion'],
  '../illo/palette': ['deepFreeze'],
  '../illo/cam': ['Camera', 'useCam'],
  // the promo kit (src/scenes/kit/, from film KIT_FROM): its plumbing stays its own
  '../kit/symbols': ['SYMBOLS'],
  '../kit/car3d': ['canvasTex'],
  '../kit/env': ['makeEnv'],
  '../kit/scale': ['KitScale', 'useKitDpr'],
};
// why a name of NOT_FROM is refused (the default: it changes what every scene shares)
const NOT_WHY = {
  deepFreeze: 'freezes what it is given: a film never freezes a shared table (the kit freezes its own)',
  Camera: "builds a camera of its own: the film's camera is the rig's (CameraLayer, Hud and useKick from ../../lib/camera)",
  useCam: "reads the kit scenes' own camera: a film takes CameraLayer, Hud and useKick from ../../lib/camera",
  SYMBOLS: 'is the icon table every scene shares: draw an icon with <Sym name="..."/> from ../kit/icons',
  canvasTex: 'draws on a page canvas: a film draws with div, span and svg (the kit makes its own textures)',
  makeEnv: "is the 3D kit's own light: a film poses Car3 and Phone3, it never builds a renderer's light",
  KitScale: "is the kit's render scale, the studio's to set (films draw on the stage at STAGE.s)",
  useKitDpr: "is the kit's render scale, the studio's to set (films draw on the stage at STAGE.s)",
};
// (2026-10-06) the camera rig and the text motion library: a film moves its planes with CameraLayer / Hud / useKick and
// sets its words with <Words> (src/lib/camera.tsx, src/lib/textfx.tsx)
const OURS = ['../common', '../../tokens', '../../lib/format', '../../lib/layer', '../../lib/anim', '../../lib/measure', '../../types', '../../lib/camera', '../../lib/textfx'];
/** The allowed module specifiers -> the file they are (null: a package with a fixed list). Building blocks: every
 *  scene (src/scenes/<Scene>.tsx, not Film itself) and every src/scenes/staging/ module. */
export const modules = () => {
  const m = new Map([['react', null], ['remotion', null]]);
  const add = (spec, file) => fs.existsSync(file) && m.set(spec, file);
  for (const s of OURS) for (const ext of ['.tsx', '.ts']) add(s, path.join(FILM_DIR, `${s}${ext}`));
  // the frame guards' numbers and placements (src/lib/guard.mjs: footAbove, fitSpan, fitWhole, SUB_BAND_STAGE, WHOLE_STAGE)
  add('../../lib/guard.mjs', path.join(root, 'src', 'lib', 'guard.mjs'));
  for (const f of fs.readdirSync(path.join(root, 'src', 'scenes'))) if (/^[A-Z][A-Za-z0-9]*\.tsx$/.test(f) && f !== 'Film.tsx') m.set(`../${f.slice(0, -4)}`, path.join(root, 'src', 'scenes', f));
  const st = path.join(root, 'src', 'scenes', 'staging');
  if (fs.existsSync(st)) for (const f of fs.readdirSync(st)) if (/^[a-zA-Z][A-Za-z0-9]*\.tsx?$/.test(f)) m.set(`../staging/${f.replace(/\.tsx?$/, '')}`, path.join(st, f));
  // the illustrated kit (src/scenes/illo/, 2026-10-06): people, cars, phones, places ("../illo/figure", "../illo/car")
  const il = path.join(root, 'src', 'scenes', 'illo');
  if (fs.existsSync(il)) for (const f of fs.readdirSync(il)) if (/^[a-zA-Z][A-Za-z0-9]*\.tsx?$/.test(f)) m.set(`../illo/${f.replace(/\.tsx?$/, '')}`, path.join(il, f));
  // the promo kit (src/scenes/kit/, 2026-10-19): the 3D phone and car, places, silhouette people, the reveal, the explainer,
  // text motion, cuts, charts, the app's icons ("../kit/phone3d", "../kit/explain", "../kit/sil/sil")
  const kit = path.join(root, 'src', 'scenes', 'kit');
  for (const [dir, pre] of [[kit, '../kit/'], [path.join(kit, 'sil'), '../kit/sil/']])
    if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir)) if (/^[a-zA-Z][A-Za-z0-9]*\.tsx?$/.test(f)) m.set(`${pre}${f.replace(/\.tsx?$/, '')}`, path.join(dir, f));
  return m;
};

// names that may not appear as a name (a reference, a declaration, a shorthand property)
const GLOBALS = new Set(
  (
    'fetch XMLHttpRequest WebSocket EventSource RTCPeerConnection navigator eval Function require process globalThis global ' +
    'window self top parent frames opener document location cookie localStorage sessionStorage indexedDB caches ' +
    'postMessage setTimeout setInterval setImmediate requestAnimationFrame requestIdleCallback queueMicrotask ' +
    'importScripts Worker SharedWorker ServiceWorker Blob URL FileReader Image Audio Video Notification FontFace ' +
    'Request Response Headers FormData open alert confirm prompt Date performance crypto Proxy Reflect WebAssembly ' +
    'atob btoa unescape escape decodeURI decodeURIComponent TextDecoder Buffer console module exports __dirname ' +
    'constructor prototype __proto__ arguments ' +
    'useEffect useLayoutEffect useInsertionEffect useState useReducer useSyncExternalStore useRef createPortal ' +
    'delayRender continueRender cancelRender getInputProps getRemotionEnvironment dangerouslySetInnerHTML'
  ).split(/\s+/),
);
// names that may not appear as a property (x.name, {name: ...}): the escapes, the sinks, the clock and the dice
const PROPS = new Set(
  (
    'constructor prototype __proto__ __defineGetter__ __defineSetter__ __lookupGetter__ __lookupSetter__ ' +
    'getPrototypeOf setPrototypeOf defineProperty defineProperties getOwnPropertyDescriptor ' +
    'fetch eval cookie localStorage sessionStorage indexedDB postMessage sendBeacon createObjectURL ' +
    'innerHTML outerHTML insertAdjacentHTML srcdoc dangerouslySetInnerHTML fromCharCode fromCodePoint ' +
    'random now toUpperCase toLocaleUpperCase createElement cloneElement createFactory ' +
    'useEffect useLayoutEffect useInsertionEffect useState useReducer useSyncExternalStore useRef createPortal ' +
    'window document navigator globalThis process location Function ownerDocument defaultView getRootNode ' +
    'contentWindow contentDocument assign freeze seal preventExtensions getOwnPropertyDescriptors ' +
    'getOwnPropertyNames getOwnPropertySymbols fromEntries parse'
  ).split(/\s+/),
);
// a forbidden name spelled inside a string (a word of its own)
const IN_STRING = new RegExp(
  `(?<![A-Za-z0-9_$])(?:fetch|XMLHttpRequest|WebSocket|EventSource|navigator|eval|Function|constructor|prototype|__proto__|require|import|process|globalThis|window|document|location|cookie|localStorage|sessionStorage|indexedDB|postMessage|sendBeacon|setTimeout|setInterval|requestAnimationFrame|innerHTML|srcdoc)(?![A-Za-z0-9_$])`,
);
const URLISH = /(?:https?|wss?|ftp|file|blob|javascript|vbscript)\s*:|\/\/|\\\\|url\(\s*(?!['"]?#)|@import|image-set\(/i;
// style keys whose value can load a file (and every --custom property, which var() carries into them)
const URL_KEYS = new Set(
  'background backgroundImage border borderImage borderImageSource mask maskImage maskBorder maskBorderSource WebkitMask WebkitMaskImage WebkitMaskBoxImage WebkitBorderImage listStyle listStyleImage content cursor shapeOutside offsetPath filter backdropFilter WebkitBackdropFilter src'.split(' '),
);
const urlKey = (k) => URL_KEYS.has(k) || URL_KEYS.has(k.replace(/-([a-z])/g, (_, c) => c.toUpperCase())) || k.startsWith('--');
// imported functions whose result is a number or a colour, never the text they were given
const SAFE_CALLS = new Set('rgba halo toneBig toneText toneLine interpolate interpolateColors spring random prog spr lerp rand logZoom cueFrame entrance lead'.split(' '));
// methods that change the array, map or set they are called on
const MUTATORS = new Set('push pop shift unshift splice sort reverse fill copyWithin set add delete clear'.split(' '));
// intrinsic JSX elements that load, run or link something
const ELEMENTS = new Set('script iframe frame frameset object embed applet link meta base style form input textarea button select img video audio source track picture image a foreignObject portal template slot canvas animate set animateMotion animateTransform discard'.split(' '));
const URL_ATTRS = new Set('src srcSet srcset srcDoc srcdoc href xlinkHref xlink:href action formAction poster data background ping manifest codebase cite'.split(' '));

/** The kit modules that draw in WebGL (one canvas each): a Film that imports one is a 3D shot (tools/ci/fx.mjs never pre-rolls
 *  it, tools/build-index.mjs marks its scenes "webgl" so the drift leaves the canvas alone). */
export const KIT_3D = ['../kit/phone3d', '../kit/car3d', '../kit/reveal', '../kit/explain'];
export const uses3d = (code) => KIT_3D.some((m) => new RegExp(`from\\s+['"]${m.replace(/[./]/g, (c) => `\\${c}`)}['"]`).test(String(code ?? '')));
// From film KIT_FROM on (src/lib/kit.mjs): text a phone can read, no hairline, no pencil, only real easings
const TEXT_MIN = 34; // stage px (frame 37): the smallest text on a phone held at arm's length
const STROKE_MIN = 3; // the owner, 2026-10-19: no hairline or pen strokes
const TEXT_COMPONENTS = new Set(['Words', 'MaskUp', 'CharRise', 'TrackIn', 'BlurUp', 'Swap', 'Strike', 'PillLine', 'SlotWords', 'RollNumber', 'Label', 'StepLabel', 'MonoLabel', 'Toast']);
const EASE_KEYS = new Set(['enter', 'exit', 'camera', 'countUp', 'drawOn', 'drift', 'whipIn', 'whipOut', 'snap']);
/** The promo kit's components that show a real screen by its name (src="08-qr-card": public/screens/08-qr-card.jpg) */
const KIT_SCREEN = new Set(['Phone3', 'HeldPhone', 'StepShot', 'PhoneReveal', 'Lift']);
/** a `src` a kit phone may take: a screen's name, or a value from the spec (p.src, p.src ?? '08-qr-card', a local) */
const screenSrc = (v) => {
  const T = tsMod;
  const name = (e) => {
    if (!e) return false;
    if (T.isParenthesizedExpression(e)) return name(e.expression);
    if (T.isStringLiteral(e) || T.isNoSubstitutionTemplateLiteral(e)) return /^[0-9a-z][0-9a-z-]{0,63}$/.test(e.text);
    if (T.isIdentifier(e) || T.isPropertyAccessExpression(e)) return true;
    if (T.isBinaryExpression(e) && (e.operatorToken.kind === T.SyntaxKind.QuestionQuestionToken || e.operatorToken.kind === T.SyntaxKind.BarBarToken)) return name(e.left) && name(e.right);
    if (T.isConditionalExpression(e)) return name(e.whenTrue) && name(e.whenFalse);
    return false;
  };
  return T.isStringLiteral(v) ? name(v) : T.isJsxExpression(v) && name(v.expression);
};
// The frame guards (src/lib/guard.mjs, a film from GUARD_FROM on; the owner 2026-10-19): no thought bubble, no blurred or
// side-on phone, nobody's feet or a phone's foot in the subtitle band (the still review's probe measures the rest)
/** the kit's phones (a blur filter in a film that shows one, or a phone turned past PHONE_YAW_MAX, reads as a blurred,
 *  tilted phone) */
const PHONE_MODULES = ['../kit/phone3d', '../kit/explain', '../kit/reveal', '../illo/handset'];
const PHONE_TAGS = new Set(['Phone3', 'HeldPhone', 'StepShot', 'PhoneReveal', 'Handset', 'HandGrip']);
const PHONE_YAW_MAX = 35;
/** components whose literal `y` / `foot` / `feet` / `ground` is where they stand (stage y): never in the subtitle band */
const FOOT_TAGS = new Set(['Figure', 'SilFigure', 'Car', 'StepShot', 'Shadow', 'Owner', 'Mechanic', 'Seller', 'Man', 'Woman', 'Her', 'Passer']);
const FOOT_ATTRS = new Set(['y', 'foot', 'feet', 'ground']);
/** Whether a film file is held to the frame guards: a film from GUARD_FROM on (V110..) or the template (not a Story set:
 *  a slide has no subtitle line). */
export const guardFilm = (name) => name === 'FilmTemplate' || guardOn(Number(/^V(\d+)[A-Z]/.exec(String(name))?.[1] ?? NaN));
/** Whether a film file is held to the polish guards (src/lib/guard.mjs POLISH_FROM, 2026-10-26: v131-three-minutes' wheel
 *  marked only in some shots, its flag over the meta line): a film from POLISH_FROM on, or the template. */
export const polishFilm = (name) => name === 'FilmTemplate' || polishOn(Number(/^V(\d+)[A-Z]/.exec(String(name))?.[1] ?? NaN));
/** the SVG shapes whose literal place the polish lint reads (stage units inside a full-stage <svg> / the kit's <Svg>) */
const PLACE_TAGS = new Set(['rect', 'text', 'circle', 'ellipse', 'line', 'image', 'use', 'polygon', 'polyline']);
/** a shape at least this wide (stage px) is a full-bleed band (a sky, a ground), never a thing */
const BLEED_W = 1000;
/** Whether a film file is held to the new rules: a film from KIT_FROM on (V110..), a Story set's graphic (S..) or the template. */
export const freshFilm = (name) => name === 'FilmTemplate' || /^S\d+[A-Z]/.test(String(name)) || kitOn(Number(/^V(\d+)[A-Z]/.exec(String(name))?.[1] ?? NaN));

let tsMod = null;
const ts = async () => (tsMod ??= (await import('typescript')).default);

/** Exported names of one of our modules, read as text. */
const exportCache = new Map();
const exportsOf = (T, file) => {
  if (exportCache.has(file)) return exportCache.get(file);
  const sf = T.createSourceFile(file, fs.readFileSync(file, 'utf8'), T.ScriptTarget.ES2022, true, file.endsWith('.tsx') ? T.ScriptKind.TSX : T.ScriptKind.TS);
  const names = new Set();
  const exported = (n) => T.canHaveModifiers(n) && (T.getModifiers(n) ?? []).some((m) => m.kind === T.SyntaxKind.ExportKeyword);
  for (const st of sf.statements) {
    if (T.isVariableStatement(st) && exported(st)) for (const d of st.declarationList.declarations) T.isIdentifier(d.name) && names.add(d.name.text);
    else if ((T.isFunctionDeclaration(st) || T.isClassDeclaration(st) || T.isTypeAliasDeclaration(st) || T.isInterfaceDeclaration(st) || T.isEnumDeclaration(st)) && exported(st) && st.name) names.add(st.name.text);
    else if (T.isExportDeclaration(st) && st.exportClause && T.isNamedExports(st.exportClause)) for (const e of st.exportClause.elements) names.add(e.name.text);
  }
  exportCache.set(file, names);
  return names;
};

const lintWith = (T, file, {name} = {}) => {
  const errors = [];
  const base = path.basename(file);
  const expect = name ?? base.replace(/\.tsx$/, '');
  const fresh = freshFilm(expect);
  const guard = guardFilm(expect);
  const polish = polishFilm(expect);
  const at = (node) => {
    if (!node) return base;
    const {line} = sf.getLineAndCharacterOfPosition(node.getStart(sf));
    return `${base}:${line + 1}`;
  };
  const bad = (node, msg) => errors.push(`FILM ${at(node)}: ${msg}`);
  let sf = null;
  if (!/^[A-Za-z_][A-Za-z0-9_]*\.tsx$/.test(base)) {
    errors.push(`FILM ${base}: a film file is <Name>.tsx, PascalCase from the film's id (v26-night-scan -> V26NightScan.tsx)`);
    return {errors};
  }
  let st;
  try {
    st = fs.lstatSync(file);
  } catch {
    errors.push(`FILM ${base}: missing: write src/scenes/film/${base} (start from src/scenes/film/_template.tsx)`);
    return {errors};
  }
  if (!st.isFile()) {
    errors.push(`FILM ${base}: not a plain file`);
    return {errors};
  }
  if (st.size > MAX_BYTES) errors.push(`FILM ${base}: ${Math.round(st.size / 1024)} KB; a film scene is at most ${MAX_BYTES / 1024} KB: draw less, reuse a building block`);
  const code = fs.readFileSync(file, 'utf8');
  // syntax first: a file that does not parse would break the shared bundle
  const tr = T.transpileModule(code, {fileName: base, reportDiagnostics: true, compilerOptions: {jsx: T.JsxEmit.ReactJSX, target: T.ScriptTarget.ES2022, module: T.ModuleKind.ESNext}});
  for (const d of (tr.diagnostics ?? []).slice(0, 5)) {
    const line = d.file && d.start !== undefined ? d.file.getLineAndCharacterOfPosition(d.start).line + 1 : '?';
    errors.push(`FILM ${base}:${line}: syntax: ${T.flattenDiagnosticMessageText(d.messageText, ' ').slice(0, 160)}`);
  }
  if (errors.length) return {errors};
  sf = T.createSourceFile(base, code, T.ScriptTarget.ES2022, true, T.ScriptKind.TSX);
  const mods = modules();
  const imported = new Set(); // local names bound by imports
  const fromKit = new Map(); // local name -> its export name, for names imported from the promo kit (../kit/...)
  let reactName = null; // the default import of react (React.x may name only what REACT allows)
  const topInits = []; // the initialisers of top-level const/let: they run on load
  const exportsFound = [];
  const K = T.SyntaxKind;

  // ---- top level: imports, types, declarations, the one export ----------------------------------------------
  for (const s of sf.statements) {
    const mods_ = T.canHaveModifiers(s) ? T.getModifiers(s) ?? [] : [];
    if (mods_.some((m) => m.kind === K.DeclareKeyword)) bad(s, '`declare` is not allowed: a film uses only what it imports');
    const isExport = mods_.some((m) => m.kind === K.ExportKeyword);
    if (mods_.some((m) => m.kind === K.DefaultKeyword)) bad(s, `no default export: \`export const ${expect}\``);
    if (T.isImportDeclaration(s)) {
      const spec = T.isStringLiteral(s.moduleSpecifier) ? s.moduleSpecifier.text : '';
      if (!mods.has(spec)) {
        bad(s, `import from "${spec.slice(0, 60)}" is not allowed; only ${[...mods.keys()].filter((k) => !k.startsWith('../staging/') && !/^\.\.\/[A-Z]/.test(k)).join(', ')}, a scene ("../Wire3D") or a staging module ("../staging/qrParts")`);
        continue;
      }
      const cl = s.importClause;
      if (!cl) {
        bad(s, `a side-effect import ("${spec}") runs code on load: import a name`);
        continue;
      }
      const typeOnly = cl.isTypeOnly;
      const file_ = mods.get(spec);
      const allowed = (n) => (spec === 'react' ? REACT.includes(n) : spec === 'remotion' ? REMOTION.includes(n) : exportsOf(T, file_).has(n) && !(NOT_FROM[spec] ?? []).includes(n));
      if (cl.name) {
        imported.add(cl.name.text);
        if (spec === 'react' && !typeOnly) reactName = cl.name.text;
        if (!typeOnly && !allowed('default')) bad(s, `"${spec}" has no default import a film may use`);
      }
      if (cl.namedBindings && T.isNamespaceImport(cl.namedBindings)) bad(s, `no namespace import (import * as ...): name what you use from "${spec}"`);
      if (cl.namedBindings && T.isNamedImports(cl.namedBindings))
        for (const e of cl.namedBindings.elements) {
          imported.add(e.name.text);
          const n = (e.propertyName ?? e.name).text;
          if (spec.startsWith('../kit/')) fromKit.set(e.name.text, n);
          if (typeOnly || e.isTypeOnly) {
            if (spec !== 'react' && spec !== 'remotion' && !exportsOf(T, file_).has(n)) bad(e, `"${spec}" exports no "${n}"`);
          } else if (!allowed(n)) bad(e, spec === 'react' || spec === 'remotion' ? `"${n}" from "${spec}" is not allowed; a film may use ${(spec === 'react' ? REACT.filter((x) => x !== 'default') : REMOTION).join(', ')}` : NOT_FROM[spec]?.includes(n) ? `"${n}" ${NOT_WHY[n] ?? 'changes what every scene shares: a film never calls it'}` : `"${spec}" exports no "${n}"`);
        }
      continue;
    }
    if (T.isImportEqualsDeclaration(s)) bad(s, 'import = require(...) is not allowed');
    else if (T.isExportDeclaration(s) || T.isExportAssignment(s)) bad(s, `the only export is \`export const ${expect}\``);
    else if (T.isVariableStatement(s)) {
      if (!(s.declarationList.flags & (T.NodeFlags.Const | T.NodeFlags.Let))) bad(s, 'use const (or let), never var');
      if (isExport) for (const d of s.declarationList.declarations) exportsFound.push([d.name.getText(sf), s]);
      for (const d of s.declarationList.declarations) if (d.initializer) topInits.push(d.initializer);
    } else if (T.isFunctionDeclaration(s)) {
      if (isExport) exportsFound.push([s.name?.text ?? '(anonymous)', s]);
    } else if (T.isTypeAliasDeclaration(s) || T.isInterfaceDeclaration(s)) {
      if (isExport) bad(s, `export only the component \`${expect}\`, not a type`);
    } else if (T.isEmptyStatement(s)) {
      // a stray semicolon
    } else bad(s, `only imports, types, const and function declarations at the top level (this ${K[s.kind]} runs on load)`);
  }
  if (exportsFound.length !== 1 || exportsFound[0][0] !== expect)
    errors.push(`FILM ${base}: exactly one export, the component \`export const ${expect}\`: found ${exportsFound.length ? exportsFound.map(([n]) => n).join(', ') : 'none'}`);

  // ---- names: every declaration and every write, by name (one scope for the whole file: a name declared twice
  // must pass both ways, which errs on the safe side) ---------------------------------------------------------------
  const decls = new Map(); // name -> [{kind: 'var' | 'param' | 'fn' | 'import' | 'other', init, isConst}]
  const writes = new Map(); // name -> [{op, rhs}] (op 'destructure': a value of unknown kind)
  const push_ = (m, k, v) => (m.get(k) ?? m.set(k, []).get(k)).push(v);
  const strip = (e) => {
    while (T.isParenthesizedExpression(e) || T.isNonNullExpression(e) || T.isAsExpression(e) || T.isTypeAssertionExpression(e) || (T.isSatisfiesExpression && T.isSatisfiesExpression(e))) e = e.expression;
    return e;
  };
  const bindNames = (b, kind) => {
    if (T.isIdentifier(b)) push_(decls, b.text, {kind});
    else if (T.isObjectBindingPattern(b) || T.isArrayBindingPattern(b)) for (const el of b.elements) if (!T.isOmittedExpression(el)) bindNames(el.name, 'other');
  };
  const targetsOf = (e, out = []) => {
    e = strip(e);
    if (T.isIdentifier(e)) out.push(e.text);
    else if (T.isArrayLiteralExpression(e)) e.elements.forEach((x) => targetsOf(x, out));
    else if (T.isObjectLiteralExpression(e))
      for (const pr of e.properties) {
        if (T.isShorthandPropertyAssignment(pr)) out.push(pr.name.text);
        else if (T.isPropertyAssignment(pr)) targetsOf(pr.initializer, out);
        else if (T.isSpreadAssignment(pr)) targetsOf(pr.expression, out);
      }
    else if (T.isSpreadElement(e)) targetsOf(e.expression, out);
    else if (T.isBinaryExpression(e) && e.operatorToken.kind === K.EqualsToken) targetsOf(e.left, out);
    return out;
  };
  const isAssign = (n) => T.isBinaryExpression(n) && n.operatorToken.kind >= K.FirstAssignment && n.operatorToken.kind <= K.LastAssignment;
  const collect = (n) => {
    if (T.isVariableDeclaration(n)) {
      const list = n.parent;
      const loopVar = T.isVariableDeclarationList(list) && (T.isForInStatement(list.parent) || T.isForOfStatement(list.parent));
      if (T.isIdentifier(n.name) && !loopVar && !T.isCatchClause(list)) push_(decls, n.name.text, {kind: 'var', init: n.initializer, isConst: Boolean(list.flags & T.NodeFlags.Const)});
      else bindNames(n.name, 'other');
    } else if (T.isParameter(n)) bindNames(n.name, 'param');
    else if ((T.isFunctionDeclaration(n) || T.isFunctionExpression(n)) && n.name) push_(decls, n.name.text, {kind: 'fn'});
    else if ((T.isClassDeclaration(n) || T.isClassExpression(n)) && n.name) push_(decls, n.name.text, {kind: 'other'});
    else if (T.isImportClause(n) && n.name) push_(decls, n.name.text, {kind: 'import'});
    else if (T.isImportSpecifier(n) || T.isNamespaceImport(n)) push_(decls, n.name.text, {kind: 'import'});
    else if (isAssign(n)) {
      const l = strip(n.left);
      if (T.isIdentifier(l)) push_(writes, l.text, {op: n.operatorToken.kind, rhs: n.right});
      else if (T.isArrayLiteralExpression(l) || T.isObjectLiteralExpression(l)) for (const t of targetsOf(l)) push_(writes, t, {op: 'destructure'});
    } else if ((T.isForInStatement(n) || T.isForOfStatement(n)) && !T.isVariableDeclarationList(n.initializer)) for (const t of targetsOf(n.initializer)) push_(writes, t, {op: 'destructure'});
    T.forEachChild(n, collect);
  };
  collect(sf);
  const declared = (name) => decls.has(name);
  const isImported = (name) => (decls.get(name) ?? []).some((d) => d.kind === 'import');

  // is this expression surely a number (or a boolean, undefined): a key that can never be a name?
  const NUM_OPS = new Set([K.MinusToken, K.AsteriskToken, K.SlashToken, K.PercentToken, K.AsteriskAsteriskToken, K.AmpersandToken, K.BarToken, K.CaretToken, K.LessThanLessThanToken, K.GreaterThanGreaterThanToken, K.GreaterThanGreaterThanGreaterThanToken, K.LessThanToken, K.GreaterThanToken, K.LessThanEqualsToken, K.GreaterThanEqualsToken, K.EqualsEqualsToken, K.EqualsEqualsEqualsToken, K.ExclamationEqualsToken, K.ExclamationEqualsEqualsToken, K.InstanceOfKeyword, K.InKeyword, K.MinusEqualsToken, K.AsteriskEqualsToken, K.SlashEqualsToken, K.PercentEqualsToken, K.AsteriskAsteriskEqualsToken, K.AmpersandEqualsToken, K.BarEqualsToken, K.CaretEqualsToken, K.LessThanLessThanEqualsToken, K.GreaterThanGreaterThanEqualsToken, K.GreaterThanGreaterThanGreaterThanEqualsToken]);
  const numeric = (e, seen = new Set()) => {
    e = strip(e);
    if (T.isNumericLiteral(e) || e.kind === K.TrueKeyword || e.kind === K.FalseKeyword) return true;
    if (T.isPrefixUnaryExpression(e) || T.isPostfixUnaryExpression(e)) return true; // - + ~ ! ++ -- give a number or a boolean
    if (T.isTypeOfExpression(e)) return false;
    if (T.isVoidExpression(e)) return true;
    if (T.isConditionalExpression(e)) return numeric(e.whenTrue, seen) && numeric(e.whenFalse, seen);
    if (T.isBinaryExpression(e)) {
      const op = e.operatorToken.kind;
      if (NUM_OPS.has(op)) return true;
      if (op === K.CommaToken) return numeric(e.right, seen);
      if (op === K.EqualsToken || op === K.BarBarEqualsToken || op === K.AmpersandAmpersandEqualsToken || op === K.QuestionQuestionEqualsToken) return numeric(e.right, seen) && (op === K.EqualsToken || numeric(e.left, seen));
      return numeric(e.left, seen) && numeric(e.right, seen); // + += && || ??
    }
    if (T.isCallExpression(e)) {
      const c = strip(e.expression);
      if (T.isPropertyAccessExpression(c) && T.isIdentifier(c.expression) && c.expression.text === 'Math' && !declared('Math')) return true;
      return T.isIdentifier(c) && ['Number', 'parseInt', 'parseFloat'].includes(c.text) && !declared(c.text);
    }
    if (T.isIdentifier(e)) {
      const ds = decls.get(e.text);
      if (!ds) return ['NaN', 'Infinity', 'undefined'].includes(e.text);
      if (seen.has(e.text)) return true; // a cycle adds no new kind of value
      seen.add(e.text);
      return ds.every((d) => d.kind === 'var' && (!d.init || numeric(d.init, seen))) && (writes.get(e.text) ?? []).every((w) => w.op !== 'destructure' && (NUM_OPS.has(w.op) || numeric(w.rhs, seen)));
    }
    return false;
  };

  // may this expression be (a part of) something shared by every scene: an import, a global, what an imported
  // function returns, or a local that holds one of those?
  const shared = (e, seen = new Set()) => {
    e = strip(e);
    if (T.isPropertyAccessExpression(e) || T.isElementAccessExpression(e)) return shared(e.expression, seen);
    if (T.isConditionalExpression(e)) return shared(e.whenTrue, seen) || shared(e.whenFalse, seen);
    if (T.isBinaryExpression(e)) {
      const op = e.operatorToken.kind;
      if (op === K.CommaToken || op === K.EqualsToken) return shared(e.right, seen);
      if (op === K.BarBarToken || op === K.AmpersandAmpersandToken || op === K.QuestionQuestionToken) return shared(e.left, seen) || shared(e.right, seen);
      return false;
    }
    if (T.isCallExpression(e)) {
      let c = strip(e.expression);
      while (T.isPropertyAccessExpression(c) || T.isElementAccessExpression(c)) c = strip(c.expression);
      return T.isIdentifier(c) && isImported(c.text);
    }
    if (T.isIdentifier(e)) {
      const ds = decls.get(e.text);
      if (!ds) return e.text !== 'undefined'; // a global: Math, Object, JSON ...
      if (ds.some((d) => d.kind === 'import')) return true;
      if (seen.has(e.text)) return false;
      seen.add(e.text);
      return ds.some((d) => d.kind === 'var' && d.init && shared(d.init, seen)) || (writes.get(e.text) ?? []).some((w) => w.rhs && shared(w.rhs, seen));
    }
    return false;
  };

  // may this top-level value be computed on load without running anything: literals, functions, objects, arrays,
  // arithmetic, Math.*, memo(<a function>)?
  const pure = (e) => {
    e = strip(e);
    if (T.isStringLiteral(e) || T.isNoSubstitutionTemplateLiteral(e) || T.isNumericLiteral(e) || T.isBigIntLiteral(e) || T.isRegularExpressionLiteral(e)) return true;
    if ([K.TrueKeyword, K.FalseKeyword, K.NullKeyword].includes(e.kind) || T.isIdentifier(e)) return true;
    if (T.isArrowFunction(e) || T.isFunctionExpression(e)) return true; // not run on load
    if (T.isTemplateExpression(e)) return e.templateSpans.every((x) => pure(x.expression));
    if (T.isPropertyAccessExpression(e)) return pure(e.expression);
    if (T.isElementAccessExpression(e)) return pure(e.expression) && pure(e.argumentExpression);
    if (T.isArrayLiteralExpression(e)) return e.elements.every((x) => T.isOmittedExpression(x) || pure(T.isSpreadElement(x) ? x.expression : x));
    if (T.isObjectLiteralExpression(e))
      return e.properties.every((pr) =>
        T.isShorthandPropertyAssignment(pr) ? true : T.isSpreadAssignment(pr) ? pure(pr.expression) : T.isPropertyAssignment(pr) ? (!T.isComputedPropertyName(pr.name) || pure(pr.name.expression)) && pure(pr.initializer) : T.isMethodDeclaration(pr) || T.isGetAccessorDeclaration(pr) || T.isSetAccessorDeclaration(pr),
      );
    if (T.isPrefixUnaryExpression(e)) return e.operator !== K.PlusPlusToken && e.operator !== K.MinusMinusToken && pure(e.operand);
    if (T.isTypeOfExpression(e) || T.isVoidExpression(e)) return pure(e.expression);
    if (T.isBinaryExpression(e)) return !isAssign(e) && pure(e.left) && pure(e.right);
    if (T.isConditionalExpression(e)) return pure(e.condition) && pure(e.whenTrue) && pure(e.whenFalse);
    if (T.isCallExpression(e)) {
      const c = strip(e.expression);
      const isMath = T.isPropertyAccessExpression(c) && T.isIdentifier(c.expression) && c.expression.text === 'Math' && !declared('Math');
      const isMemo = (T.isIdentifier(c) && c.text === 'memo' && isImported('memo')) || (T.isPropertyAccessExpression(c) && T.isIdentifier(c.expression) && c.expression.text === reactName && c.name.text === 'memo');
      return (isMath || isMemo) && e.arguments.every((a) => pure(a));
    }
    return false;
  };
  for (const e of topInits) if (!pure(e)) bad(e, 'this top-level value runs code on load (a call, new, an assignment ...): compute it inside the component (or in useMemo), keep top-level values plain (literals, functions, arithmetic, Math.*)');

  // may this value go into a style key that can load a file: literals, numbers, colours, consts made of those?
  const staticVal = (e, seen = new Set()) => {
    e = strip(e);
    if (T.isStringLiteral(e) || T.isNoSubstitutionTemplateLiteral(e) || numeric(e)) return true;
    if (e.kind === K.NullKeyword) return true;
    if (T.isConditionalExpression(e)) return staticVal(e.whenTrue, seen) && staticVal(e.whenFalse, seen);
    if (T.isTemplateExpression(e)) return foldOk(e) && e.templateSpans.every((x) => staticVal(x.expression, seen));
    if (T.isBinaryExpression(e) && e.operatorToken.kind === K.PlusToken) return foldOk(e) && staticVal(e.left, seen) && staticVal(e.right, seen);
    if (T.isPropertyAccessExpression(e)) {
      let r = e;
      while (T.isPropertyAccessExpression(r)) r = strip(r.expression);
      return T.isIdentifier(r) && isImported(r.text); // C.ink, L.graphicsTop, F.sans
    }
    if (T.isCallExpression(e)) {
      const c = strip(e.expression);
      if (T.isPropertyAccessExpression(c) && T.isIdentifier(c.expression) && c.expression.text === 'Math' && !declared('Math')) return true;
      return T.isIdentifier(c) && isImported(c.text) && SAFE_CALLS.has(c.text);
    }
    if (T.isIdentifier(e)) {
      const ds = decls.get(e.text);
      if (!ds) return e.text === 'undefined';
      if (ds.some((d) => d.kind === 'import')) return ds.every((d) => d.kind === 'import');
      if (seen.has(e.text)) return true;
      seen.add(e.text);
      return ds.every((d) => d.kind === 'var' && (!d.init || staticVal(d.init, seen))) && (writes.get(e.text) ?? []).every((w) => w.op !== 'destructure' && w.rhs && staticVal(w.rhs, seen));
    }
    return false;
  };
  // the literal pieces of a + chain or a template, joined where they touch: "u" + "rl(" -> "url("
  const foldOk = (e) => {
    const runs = [''];
    const walk = (x) => {
      x = strip(x);
      if (T.isStringLiteral(x) || T.isNoSubstitutionTemplateLiteral(x)) runs[runs.length - 1] += x.text;
      else if (T.isBinaryExpression(x) && x.operatorToken.kind === K.PlusToken) {
        walk(x.left);
        walk(x.right);
      } else if (T.isTemplateExpression(x)) {
        runs[runs.length - 1] += x.head.text;
        for (const sp of x.templateSpans) {
          walk(sp.expression);
          runs[runs.length - 1] += sp.literal.text;
        }
      } else runs.push('');
    };
    walk(e);
    return !runs.some((r) => URLISH.test(r));
  };
  const checkUrlValue = (node, key, v) => {
    if (!staticVal(v)) bad(node, `the style "${key}" can load a file: give it a literal, a number, a colour (C.x, rgba(), halo(), toneBig()) or a const made of those, never text put together from pieces or passed in`);
    else if (!foldOk(v)) bad(node, `a URL pieced together for "${key}": a film loads nothing`);
  };

  // ---- every node -------------------------------------------------------------------------------------------
  const strOf = (n) => (T.isStringLiteral(n) || T.isNoSubstitutionTemplateLiteral(n) ? n.text : null);
  const hasString = (n) => {
    let found = false;
    const walk = (x) => {
      if (found) return;
      if (T.isStringLiteral(x) || T.isNoSubstitutionTemplateLiteral(x) || T.isTemplateExpression(x)) found = true;
      else T.forEachChild(x, walk);
    };
    walk(n);
    return found;
  };
  const textRules = (node, s, isText) => {
    if (URLISH.test(s)) bad(node, `a URL or a remote reference in a string ("${s.slice(0, 40)}"): a film loads nothing; images come from public/ via staticFile('<path>'), SVG references are url(#id)`);
    const dm = /data:[^'"\s)]*/i.exec(s);
    if (dm && s.length > DATA_MAX) bad(node, `a data: URL of ${s.length} characters (at most ${DATA_MAX}): draw it as SVG instead`);
    const w = IN_STRING.exec(s);
    if (w) bad(node, `"${w[0]}" spelled in a string: a film never names an API, not even in a string`);
    if (s.includes('—')) bad(node, 'an em dash (—) in text: use a comma, a colon or a full stop');
    if (isText && /\p{L}/u.test(s) && s.includes('!')) bad(node, '"!" in text: the film\'s one "!" (a hook) lives in the spec, as a prop, where build-index counts it');
    // street words (ci/street-words.json, tools/ci/streetwords.mjs): never written into a Film file. A banned one never;
    // an allowed one comes in from the spec as a prop, so the film's counts, zones and frequency see it (any Georgian
    // string: a one-word label too)
    if (/[\u10D0-\u10FF]/u.test(s)) {
      const ban = bannedHits(s)[0];
      if (ban) bad(node, `"${ban.form}" is never said or shown (${ban.why}): never in a film`);
      const st = streetLoose(s)[0];
      if (st) bad(node, `a street word ("${st.word}") written into the Film file: pass it in from the spec as a prop, so the film's street-word rules see it`);
    }
    if (/[Ა-Ჿ]/.test(s)) bad(node, 'Mtavruli code points in the code: write Mkhedruli and set it with mtav() at render time');
  };
  const rootName = (e) => {
    while (T.isPropertyAccessExpression(e) || T.isElementAccessExpression(e) || T.isParenthesizedExpression(e) || T.isNonNullExpression(e) || T.isAsExpression(e) || T.isTypeAssertionExpression(e) || (T.isSatisfiesExpression && T.isSatisfiesExpression(e))) e = e.expression;
    return T.isIdentifier(e) ? e.text : null;
  };
  // The polish lint's coordinate test: where a shape's literal y lands. {stage}: it is drawn in a full-stage picture (stage
  // units): a full-stage <svg>, the kit's <Svg>, or a component of this file used in one; {moved}: a group on the way
  // moves it down by a literal 100 px or more.
  const elOf = (q) => (T.isJsxElement(q) ? q.openingElement : T.isJsxSelfClosingElement(q) ? q : null);
  const attrText = (el, k) => el.attributes.properties.find((x) => T.isJsxAttribute(x) && T.isIdentifier(x.name) && x.name.text === k)?.getText(sf) ?? '';
  const fnName = (q) => {
    if ((T.isArrowFunction(q) || T.isFunctionExpression(q)) && T.isVariableDeclaration(q.parent) && T.isIdentifier(q.parent.name)) return q.parent.name.text;
    if (T.isCallExpression(q.parent) && (T.isArrowFunction(q) || T.isFunctionExpression(q)) && T.isVariableDeclaration(q.parent.parent) && T.isIdentifier(q.parent.parent.name)) return q.parent.parent.name.text;
    if (T.isFunctionDeclaration(q) && q.name) return q.name.text;
    return null;
  };
  /** a group's transform that puts its shapes somewhere their own y does not say: a translate by a literal 100 px or more
   *  down, or one whose x is not a plain number (translate(${x} ${y}): a tile placed by its props); a translate(0 ${...})
   *  with a plain x is an animation's small lift and keeps the shapes where they are drawn */
  const movesDown = (t) => {
    for (const m of String(t).matchAll(/translate\(\s*([^\s,)]+)(?:[\s,]+([^)]*))?\)/g)) {
      if (!/^-?[\d.]+$/.test(m[1])) return true;
      if (m[2] && /^\s*([1-9]\d{2,})/.test(m[2])) return true;
    }
    return false;
  };
  /** -> {stage: true | false | <the name of the enclosing component of this file>, moved} */
  const placeUp = (n) => {
    let moved = false;
    for (let q = n.parent; q; q = q.parent) {
      const name = fnName(q);
      if (name && /^[A-Z]/.test(name)) return {stage: name, moved};
      const el = elOf(q);
      if (!el || el === n) continue;
      const tg = el.tagName.getText(sf);
      // a clip, a mask, a pattern or a symbol is never drawn where it stands
      if (/^(defs|clipPath|mask|pattern|symbol|marker|linearGradient|radialGradient|filter)$/.test(tg)) return {stage: false, moved};
      if (movesDown(attrText(el, 'transform'))) moved = true;
      if (tg === 'Svg') return {stage: true, moved};
      if (tg === 'svg') return {stage: /\b1080\b/.test(attrText(el, 'width')) && /\b1920\b/.test(attrText(el, 'height')), moved};
    }
    return {stage: false, moved};
  };
  let stageComps = null;
  const stagePlace = (n) => {
    if (!stageComps) {
      // the file's components used inside a full-stage picture (directly, or inside another such component)
      const uses = [];
      const walk = (q) => {
        const el = T.isJsxOpeningElement(q) || T.isJsxSelfClosingElement(q) ? q : null;
        if (el && T.isIdentifier(el.tagName) && /^[A-Z]/.test(el.tagName.text) && decls.has(el.tagName.text)) uses.push([el.tagName.text, placeUp(el).stage]);
        T.forEachChild(q, walk);
      };
      walk(sf);
      stageComps = new Set();
      for (let i = 0; i < 4; i++) for (const [name, at] of uses) if (at === true || (typeof at === 'string' && stageComps.has(at))) stageComps.add(name);
    }
    const r = placeUp(n);
    return {stage: r.stage === true || (typeof r.stage === 'string' && stageComps.has(r.stage)), moved: r.moved};
  };
  const visit = (n, inType) => {
    const typeNode = inType || T.isTypeNode(n) || T.isTypeAliasDeclaration(n) || T.isInterfaceDeclaration(n);
    if (n.kind === K.ThisKeyword) bad(n, '`this` is not allowed: write a function component');
    else if (n.kind === K.DebuggerStatement) bad(n, 'no debugger');
    else if (T.isWithStatement(n)) bad(n, 'no with');
    else if (T.isCallExpression(n) && n.expression.kind === K.ImportKeyword) bad(n, 'no dynamic import()');
    else if (T.isMetaProperty(n)) bad(n, `no ${n.getText(sf)}`);
    else if (T.isJsxSpreadAttribute(n) && /^[a-z]/.test(n.parent.parent.tagName?.getText(sf) ?? '')) bad(n, 'no {...spread} on an HTML or SVG element: write each attribute');
    else if (T.isElementAccessExpression(n) && !numeric(n.argumentExpression)) bad(n, hasString(n.argumentExpression) ? 'a computed key may not be a string: write a.b (so no name hides in a string)' : 'a computed key must be a number the film counted itself: a[2], a[i] (for (let i = 0; ...)), or a[+i] / a[i | 0]; for a name write a.b');
    else if (T.isComputedPropertyName(n) && !numeric(n.expression)) bad(n, 'a computed name ({[k]: ...}) must be a number: write the name itself');
    else if (T.isPropertyAccessExpression(n) && T.isIdentifier(n.expression) && n.expression.text === 'Math' && n.name.text === 'random') bad(n, 'Math.random: a render must be the same every time; use random("<seed>") from remotion or rand(seed) from ../../lib/anim');
    else if (isAssign(n) || ((T.isPrefixUnaryExpression(n) || T.isPostfixUnaryExpression(n)) && (n.operator === K.PlusPlusToken || n.operator === K.MinusMinusToken)) || T.isDeleteExpression(n)) {
      const target = strip(isAssign(n) ? n.left : T.isDeleteExpression(n) ? n.expression : n.operand);
      const r = rootName(target) ?? '(it)';
      if (T.isIdentifier(target) ? isImported(target.text) || !declared(target.text) : !T.isArrayLiteralExpression(target) && !T.isObjectLiteralExpression(target) && shared(target))
        bad(n, `changes "${r}", which is shared by every scene (an import, a global, or what one holds): keep your own copy ({...C}, [...list])`);
      if (isAssign(n) && T.isPropertyAccessExpression(target) && urlKey(target.name.text)) checkUrlValue(n, target.name.text, n.right);
    } else if (T.isCallExpression(n) && T.isPropertyAccessExpression(strip(n.expression)) && MUTATORS.has(strip(n.expression).name.text) && shared(strip(n.expression).expression))
      bad(n, `.${strip(n.expression).name.text}() changes "${rootName(strip(n.expression).expression) ?? 'it'}", which is shared by every scene (an import, a global, or what one holds): work on your own copy ([...list])`);
    else if (T.isVariableDeclaration(n) && T.isIdentifier(n.name) && n.name.text === 'Math') bad(n, '"Math" is the global: name yours differently');
    else if (T.isPropertyAccessExpression(n) && reactName && T.isIdentifier(n.expression) && n.expression.text === reactName && !REACT.includes(n.name.text))
      bad(n, `${reactName}.${n.name.text} is not allowed; a film may use ${REACT.filter((x) => x !== 'default').join(', ')}`);
    else if (T.isPropertyAssignment(n) && (T.isIdentifier(n.name) || T.isStringLiteral(n.name)) && urlKey(n.name.text)) checkUrlValue(n, n.name.text, n.initializer);
    else if (T.isShorthandPropertyAssignment(n) && urlKey(n.name.text)) checkUrlValue(n, n.name.text, n.name);
    else if (T.isJsxNamespacedName(n) && T.isJsxAttribute(n.parent)) bad(n, `a namespaced attribute (${n.getText(sf)}): write href="#id" and plain attributes`);
    else if (T.isJsxOpeningElement(n) || T.isJsxSelfClosingElement(n)) {
      const tg = n.tagName;
      if (T.isIdentifier(tg) && /^[A-Z_$]/.test(tg.text)) {
        const ds = decls.get(tg.text) ?? [];
        const comp = (d) => {
          if (d.kind === 'import' || d.kind === 'fn') return true;
          if (d.kind !== 'var' || !d.isConst || !d.init) return false;
          const i = strip(d.init);
          if (T.isArrowFunction(i) || T.isFunctionExpression(i)) return true;
          if (T.isCallExpression(i)) {
            const c = strip(i.expression);
            const memo = (T.isIdentifier(c) && c.text === 'memo' && isImported('memo')) || (T.isPropertyAccessExpression(c) && T.isIdentifier(c.expression) && c.expression.text === reactName && c.name.text === 'memo');
            return memo && i.arguments.length >= 1 && (T.isArrowFunction(strip(i.arguments[0])) || T.isFunctionExpression(strip(i.arguments[0])));
          }
          return T.isIdentifier(i) && isImported(i.text);
        };
        if (!ds.length || !ds.every(comp)) bad(tg, `<${tg.text}> is not a component: a capitalised tag is an imported component or one written here (const ${tg.text} = (...) => ...)`);
      } else if (T.isPropertyAccessExpression(tg)) {
        const r = rootName(tg);
        if (!r || !isImported(r)) bad(tg, `<${tg.getText(sf)}>: only imported components (React.Fragment)`);
      }
    }
    if (fresh && !typeNode) {
      const num = (e) => (e && T.isNumericLiteral(strip(e)) ? Number(strip(e).text) : null);
      // ease.inOut / ease.out were never easings (src/lib/anim.ts): prog() falls back to ease.enter and the film moves wrong
      if (T.isPropertyAccessExpression(n) && T.isIdentifier(n.expression) && n.expression.text === 'ease' && isImported('ease') && !EASE_KEYS.has(n.name.text))
        bad(n, `ease.${n.name.text} is not an easing: ease has ${[...EASE_KEYS].join(', ')} (or pass your own (t) => ...)`);
      if (T.isPropertyAssignment(n) && T.isIdentifier(n.name) && n.name.text === 'fontSize' && num(n.initializer) !== null && num(n.initializer) < TEXT_MIN)
        bad(n, `fontSize ${num(n.initializer)}: text under ${TEXT_MIN} px does not read on a phone (labels 34 to 48, punch words 64 and up)`);
      if (T.isJsxAttribute(n) && T.isIdentifier(n.name) && n.initializer && T.isJsxExpression(n.initializer)) {
        const v = num(n.initializer.expression);
        const tag = n.parent.parent.tagName?.getText(sf) ?? '';
        if (v !== null && n.name.text === 'fontSize' && v < TEXT_MIN) bad(n, `fontSize={${v}}: text under ${TEXT_MIN} px does not read on a phone`);
        if (v !== null && n.name.text === 'size' && TEXT_COMPONENTS.has(tag) && v < TEXT_MIN) bad(n, `<${tag} size={${v}}>: text under ${TEXT_MIN} px does not read on a phone`);
        if (v !== null && n.name.text === 'strokeWidth' && v > 0 && v < STROKE_MIN) bad(n, `strokeWidth={${v}}: a hairline; strokes are ${STROKE_MIN} px and up (the owner: no hairline or pen strokes), or a filled shape`);
      }
      if ((T.isStringLiteral(n) || T.isNoSubstitutionTemplateLiteral(n)) && /^asmr-(?:pencil|room$)/.test(n.text)) bad(n, `"${n.text}": no pencil sounds and no room tone from film v110 on (they are silent there): a soft tap, a slide, a land`);
    }
    if (guard && !typeNode) {
      const num = (e) => {
        const x = e ? strip(e) : null;
        if (x && T.isNumericLiteral(x)) return Number(x.text);
        if (x && T.isPrefixUnaryExpression(x) && x.operator === T.SyntaxKind.MinusToken && T.isNumericLiteral(x.operand)) return -Number(x.operand.text);
        return null;
      };
      const tagOf = (node) => {
        for (let q = node.parent; q; q = q.parent) if (T.isJsxOpeningElement(q) || T.isJsxSelfClosingElement(q)) return q.tagName.getText(sf);
        return '';
      };
      const phones = PHONE_MODULES.some((m) => code.includes(`'${m}'`) || code.includes(`"${m}"`));
      // a thought bubble (the owner: "a cartoonish '?' thought bubble"): never, by any name
      if ((T.isIdentifier(n) || T.isStringLiteral(n) || T.isNoSubstitutionTemplateLiteral(n)) && /thought|think_?cloud|think_?bubble|thinkCloud|thinkBubble/i.test(n.text))
        bad(n, `"${n.text}": no thought bubble or cloud from v113 on (the owner, 2026-10-19: cartoonish): show the worry in the face and the pose, or the thing itself as its own picture`);
      // a blurred phone: a blur filter on a kit phone or on an element that holds one (a blurred background is fine)
      if (phones && (T.isStringLiteral(n) || T.isNoSubstitutionTemplateLiteral(n) || T.isTemplateHead(n) || T.isTemplateMiddle(n) || T.isTemplateTail(n)) && /blur\(/.test(n.text)) {
        let el = n.parent;
        while (el && !T.isJsxElement(el) && !T.isJsxSelfClosingElement(el)) el = el.parent;
        const holdsPhone = (node) => {
          let hit = false;
          const walk = (q) => {
            if (hit) return;
            if ((T.isJsxOpeningElement(q) || T.isJsxSelfClosingElement(q)) && PHONE_TAGS.has(q.tagName.getText(sf))) hit = true;
            else T.forEachChild(q, walk);
          };
          walk(node);
          return hit;
        };
        if (el && holdsPhone(el)) bad(n, `a blur filter on a phone: never a blurred phone from v113 on (v110's soft, tilted phone on its cut): move it sharp, or cut`);
      }
      // a phone turned side-on
      if ((T.isPropertyAssignment(n) || T.isJsxAttribute(n)) && T.isIdentifier(n.name) && n.name.text === 'yaw' && PHONE_TAGS.has(tagOf(n))) {
        const v = num(T.isJsxAttribute(n) ? (n.initializer && T.isJsxExpression(n.initializer) ? n.initializer.expression : null) : n.initializer);
        if (v !== null && Math.abs(v) > PHONE_YAW_MAX) bad(n, `yaw ${v}: a phone turned side-on reads as a tilted, blurred phone (v110): ${PHONE_YAW_MAX} degrees at most, the screen to the viewer`);
      }
      // feet, a car's wheels or a phone's foot in the subtitle band
      if (T.isJsxAttribute(n) && T.isIdentifier(n.name) && FOOT_ATTRS.has(n.name.text) && FOOT_TAGS.has(tagOf(n)) && n.initializer && T.isJsxExpression(n.initializer)) {
        const v = num(n.initializer.expression);
        if (v !== null && v > SUB_BAND_STAGE.top)
          bad(n, `<${tagOf(n)} ${n.name.text}={${v}}>: stands in the subtitle band (stage y ${SUB_BAND_STAGE.top}..${SUB_BAND_STAGE.bottom}, frame 1440..1560): the line must read, so people, cars and phones stand above stage ${SUB_BAND_STAGE.top} (src/lib/guard.mjs footAbove)`);
      }
    }
    if (polish && !typeNode) {
      // (a) a mark is never conditional: v131's wheel was className={cam.z === 1 ? OBJ : undefined}, so the probe never saw
      // it in the close shots where the frame cut it
      if (T.isJsxAttribute(n) && T.isIdentifier(n.name) && n.name.text === 'className' && n.initializer && T.isJsxExpression(n.initializer) && n.initializer.expression) {
        let cond = false;
        const marks = (q) => {
          let hit = false;
          const w = (x) => {
            if (hit) return;
            if (T.isIdentifier(x) && (x.text === 'OBJ' || x.text === 'FIG')) hit = true;
            else T.forEachChild(x, w);
          };
          w(q);
          return hit;
        };
        const walk = (q) => {
          if (cond) return;
          if ((T.isConditionalExpression(q) || (T.isBinaryExpression(q) && [T.SyntaxKind.AmpersandAmpersandToken, T.SyntaxKind.BarBarToken, T.SyntaxKind.QuestionQuestionToken].includes(q.operatorToken.kind))) && marks(q)) cond = true;
          else T.forEachChild(q, walk);
        };
        walk(n.initializer.expression);
        if (cond) bad(n, 'a mark only in some shots (className={... ? OBJ : ...}): the frame guards then never see the thing where the frame cuts it (v131\'s wheel): mark it ALWAYS, className={OBJ} (or {FIG}), and keep it whole in every shot');
      }
      // (b) BLEED is the library's own (a staging's reviewed full-bleed part); a Film's background stays unmarked
      if ((T.isIdentifier(n) && n.text === 'BLEED' && !T.isPropertyAccessExpression(n.parent)) || ((T.isStringLiteral(n) || T.isNoSubstitutionTemplateLiteral(n)) && /\bvn-bleed\b/.test(n.text)))
        bad(n, 'BLEED is for the library\'s reviewed full-bleed parts only: a Film leaves its full-bleed background unmarked and keeps every thing (a person, a wheel, a flag) whole inside the frame');
      // (c) a shape of a full-stage picture placed in the meta line's strip or in the subtitle band by a literal y
      if ((T.isJsxOpeningElement(n) || T.isJsxSelfClosingElement(n)) && T.isIdentifier(n.tagName) && PLACE_TAGS.has(n.tagName.text)) {
        const attr = (k) => {
          const a = n.attributes.properties.find((x) => T.isJsxAttribute(x) && T.isIdentifier(x.name) && x.name.text === k);
          if (!a || !a.initializer) return undefined;
          if (T.isStringLiteral(a.initializer)) return Number.isFinite(Number(a.initializer.text)) ? Number(a.initializer.text) : null;
          const e = T.isJsxExpression(a.initializer) && a.initializer.expression ? strip(a.initializer.expression) : null;
          if (e && T.isNumericLiteral(e)) return Number(e.text);
          if (e && T.isPrefixUnaryExpression(e) && e.operator === T.SyntaxKind.MinusToken && T.isNumericLiteral(e.operand)) return -Number(e.operand.text);
          return null;
        };
        // inside a full-stage <svg width={1080} height={1920}> or the kit's <Svg> (or inside a component of this file that
        // is drawn in one: v131's Track drew the flag in a <g> of its own), with no group moving it down by a literal 100
        // px or more on the way (then its own y is not where it lands)
        const {stage, moved} = stagePlace(n);
        const tag = n.tagName.text;
        const w = attr('width');
        const tall = attr('height');
        const wide = tag === 'rect' || tag === 'image' || tag === 'use' ? (typeof w === 'number' && w >= BLEED_W) || (typeof tall === 'number' && tall >= 1500) : false;
        if (stage && !moved && !wide && tag !== 'polygon' && tag !== 'polyline') {
          const ys = (tag === 'circle' || tag === 'ellipse' ? ['cy'] : tag === 'line' ? ['y1', 'y2'] : ['y']).map(attr).filter((v) => typeof v === 'number');
          const hgt = attr('height');
          const top = ys.length ? Math.min(...ys) : null;
          const foot = ys.length ? Math.max(...ys) + (tag === 'rect' && typeof hgt === 'number' ? hgt : 0) : null;
          if (top !== null && top < META_STAGE_BOTTOM && (foot === null || foot > -200))
            bad(n, `<${tag}> at stage y ${top}: stands in the meta line's strip (stage y under ${META_STAGE_BOTTOM}, frame 260..304: the film's name and the shot count): nothing covers it (v131's chequered flag): keep it under LABEL_TOP (../../lib/guard.mjs), a flag or a sign lower`);
          else if (top !== null && foot !== null && foot > SUB_BAND_STAGE.top && top < SUB_BAND_STAGE.bottom && tag !== 'text')
            bad(n, `<${tag}> at stage y ${top}..${foot}: stands in the subtitle band (stage y ${SUB_BAND_STAGE.top}..${SUB_BAND_STAGE.bottom}): the line must read: keep it above stage ${SUB_BAND_STAGE.top} (a full-width ground is fine: width ${BLEED_W} and up)`);
          else if (tag === 'text' && top !== null && top > SUB_BAND_STAGE.top && top < SUB_BAND_STAGE.bottom + 60)
            bad(n, `<text> at stage y ${top}: a word in the subtitle band (stage y ${SUB_BAND_STAGE.top}..${SUB_BAND_STAGE.bottom}): the subtitle is the only line there`);
        }
      }
    }
    if (!typeNode) {
      const s = strOf(n);
      if (s !== null && !T.isImportDeclaration(n.parent)) textRules(n, s, T.isJsxAttribute(n.parent) ? false : /\p{L}{2,}/u.test(s) && /\s/.test(s));
      if (T.isTemplateExpression(n)) for (const part of [n.head, ...n.templateSpans.map((x) => x.literal)]) textRules(n, part.text, false);
      if (T.isJsxText(n)) textRules(n, n.text, true);
      if (T.isIdentifier(n)) {
        const p = n.parent;
        const isProp =
          (T.isPropertyAccessExpression(p) && p.name === n) ||
          ((T.isPropertyAssignment(p) || T.isMethodDeclaration(p) || T.isPropertyDeclaration(p) || T.isGetAccessorDeclaration(p) || T.isSetAccessorDeclaration(p)) && p.name === n) ||
          (T.isBindingElement(p) && p.propertyName === n);
        const isAttr = T.isJsxAttribute(p) && p.name === n;
        const isTag = (T.isJsxOpeningElement(p) || T.isJsxSelfClosingElement(p) || T.isJsxClosingElement(p)) && p.tagName === n;
        const isImportName = T.isImportSpecifier(p) && p.propertyName === n;
        if (isAttr) {
          const a = n.text;
          if (/^on[A-Z]/.test(a)) bad(n, `an event handler (${a}): a film is drawn, never clicked`);
          else if (a === 'dangerouslySetInnerHTML') bad(n, 'dangerouslySetInnerHTML is not allowed');
          else if (a === 'ref') bad(n, 'ref is not allowed: a film never touches the page, it draws from the frame');
          else if (URL_ATTRS.has(a)) {
            const el = p.parent.parent; // JsxAttributes -> element
            const tag = el.tagName?.getText(sf);
            const v = p.initializer;
            const lit = v && T.isStringLiteral(v) ? v.text : v && T.isJsxExpression(v) && v.expression ? strOf(v.expression) : null;
            if ((tag === 'use' || tag === 'textPath' || tag === 'feImage') && a === 'href' && lit !== null && lit.startsWith('#')) {
              // a reference inside the same SVG
            } else if (tag === 'Img' && a === 'src' && v && T.isJsxExpression(v) && v.expression && T.isCallExpression(v.expression) && T.isIdentifier(v.expression.expression) && v.expression.expression.text === 'staticFile') {
              // checked with staticFile below
            } else if (a === 'src' && KIT_SCREEN.has(fromKit.get(tag ?? '') ?? '') && v && screenSrc(v)) {
              // the kit's phone on a real screen: a name of public/screens (the kit loads screens/<name>.jpg itself)
            } else bad(n, tag === 'Img' ? "<Img src> takes staticFile('<a path in public/>') only" : `${tag ?? 'an element'} ${a}=... loads or links something: only <use href="#id"> and <Img src={staticFile('...')}>`);
          }
        } else if (isTag) {
          if (ELEMENTS.has(n.text)) bad(n, `<${n.text}> is not allowed in a film: draw with div, span, svg shapes and <Img src={staticFile(...)}>`);
        } else if (isProp) {
          if (PROPS.has(n.text)) bad(n, n.text === 'random' || n.text === 'now' ? `.${n.text}: a render must be the same every time (the frame is the only clock; random("<seed>") from remotion)` : n.text === 'toUpperCase' || n.text === 'toLocaleUpperCase' ? 'toUpperCase: Georgian goes through mtav(), Latin through capsLatin()' : `".${n.text}" is not allowed in a film`);
        } else if (!isImportName && GLOBALS.has(n.text)) {
          bad(n, n.text === 'Date' ? 'Date: the frame is the only clock' : /^(setTimeout|setInterval|requestAnimationFrame|setImmediate|requestIdleCallback|queueMicrotask)$/.test(n.text) ? `${n.text}: animate from useCurrentFrame() only` : /^use[A-Z]/.test(n.text) ? `${n.text}: a film is a pure function of the frame (useMemo is fine)` : /^(top|parent|self|open|frames|opener|location|global)$/.test(n.text) ? `"${n.text}" is a browser global: name your value differently (e.g. ${n.text}Y)` : `"${n.text}" is not allowed in a film (network, the page, code from text, timers and the clock are off limits)`);
        }
      }
      if (T.isCallExpression(n) && T.isIdentifier(n.expression) && n.expression.text === 'staticFile') {
        const arg = n.arguments[0];
        const s = arg ? strOf(arg) : null;
        if (s === null || n.arguments.length !== 1) bad(n, "staticFile('<a path in public/>') takes one plain string");
        else if (s.includes('..') || s.startsWith('/') || /^[a-z]+:/i.test(s) || !/^(?:screens|models|photos|brand|fonts|sfx)\//.test(s)) bad(n, `staticFile('${s.slice(0, 40)}'): a file under public/screens, models, photos, brand, fonts or sfx`);
      }
    }
    T.forEachChild(n, (c) => visit(c, typeNode));
  };
  visit(sf, false);
  // one line per problem kind and place is enough: keep the list short for the reader
  return {errors: [...new Set(errors)].slice(0, 40), uses3d: uses3d(code)};
};

/** Lint one film file (absolute path, or a name inside src/scenes/film/). `name`: the export it must have (default:
 *  the file's base name). */
export const lintFilm = async (file, opts = {}) => lintWith(await ts(), path.isAbsolute(file) ? file : path.join(FILM_DIR, /\.tsx$/.test(file) ? file : `${file}.tsx`), opts);
/** The same, synchronous, once lintReady() has loaded the TypeScript parser. */
export const lintReady = async () => {
  await ts();
  return (file, opts = {}) => lintWith(tsMod, path.isAbsolute(file) ? file : path.join(FILM_DIR, /\.tsx$/.test(file) ? file : `${file}.tsx`), opts);
};
/** The template's export name (src/scenes/film/_template.tsx is not a film: it is never registered). */
export const TEMPLATE = {file: '_template.tsx', name: 'FilmTemplate'};

// ---- the self-test (node tools/ci/filmlint.mjs --test) -------------------------------------------------------------
const selfTest = async () => {
  const os = await import('node:os');
  const lint = await lintReady();
  let bad = 0;
  const ok = (cond, what) => {
    if (!cond) bad++;
    console.log(`${cond ? 'ok  ' : 'FAIL'} ${what}`);
  };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'filmlint-'));
  const film = (name, body, imports = '') => {
    const f = path.join(dir, `${name}.tsx`);
    fs.writeFileSync(f, `import React from 'react';\nimport {useCurrentFrame} from 'remotion';\n${imports}\nexport const ${name}: React.FC<{p: {src?: string}}> = ({p}) => {\n  const f = useCurrentFrame();\n  return (\n    ${body}\n  );\n};\n`);
    return lint(f).errors;
  };
  try {
    ok(lint(path.join(FILM_DIR, TEMPLATE.file), {name: TEMPLATE.name}).errors.length === 0, 'the template passes (it is held to the v113 rules)');
    const svg = (w) => `<svg width={1080} height={1920}><circle cx={540} cy={960} r={100 + f} fill="none" stroke="#000" strokeWidth={${w}} /></svg>`;
    ok(film('V113Hair', svg(1.5)).some((e) => /hairline/.test(e)), 'v113: a 1.5 px stroke is a hairline');
    ok(film('V113Bold', svg(4)).length === 0, 'v113: a 4 px stroke passes');
    ok(film('V99Hair', svg(1.5)).length === 0, 'v99: made before the rule, its thin lines stay');
    ok(film('V113Tiny', '<div style={{fontSize: 24}}>{f}</div>').some((e) => /does not read on a phone/.test(e)), 'v113: text under 34 px is refused');
    ok(film('V113Pencil', '<Sfx name="asmr-pencil" at={f} />', "import {Sfx} from '../common';").some((e) => /no pencil sounds/.test(e)), 'v113: no pencil sound');
    ok(film('V113Room', '<Sfx name="asmr-room" at={f} />', "import {Sfx} from '../common';").some((e) => /room tone/.test(e)), 'v113: no room tone');
    ok(film('V113Cloud', '<g>{f}</g>', "const thoughtCloud = 3;").some((e) => /thought bubble/.test(e)), 'the guards: no thought cloud (v113)');
    ok(film('V112Cloud', '<g>{f}</g>', "const thoughtCloud = 3;").every((e) => !/thought bubble/.test(e)), 'the guards: v112 made before them');
    ok(film('V113Blur', '<div style={{filter: \'blur(8px)\'}}><Phone3 src="08-qr-card" pose={{x: 540, y: 900, w: 420, yaw: -6, pitch: 3}} /></div>', "import {Phone3} from '../kit/phone3d';").some((e) => /blurred phone/.test(e)), 'the guards: no blur in a film with a phone');
    ok(film('V113Side', '<Phone3 src="08-qr-card" pose={{x: 540, y: 900, w: 420, yaw: 80, pitch: 3}} />', "import {Phone3} from '../kit/phone3d';").some((e) => /side-on/.test(e)), 'the guards: no side-on phone');
    ok(film('V113Feet', '<svg><Figure uid="a" cast="me" x={540} y={1460} size={700} frame={f} /></svg>', "import {Figure} from '../illo/figure';").some((e) => /subtitle band/.test(e)), 'the guards: no feet in the subtitle band');
    ok(film('V113FeetOk', '<svg><Figure uid="a" cast="me" x={540} y={1300} size={700} frame={f} /></svg>', "import {Figure} from '../illo/figure';").every((e) => !/subtitle band/.test(e)), 'the guards: feet over the band pass');
    ok(film('V113Fit', '<svg><Figure uid="a" cast="me" x={540} y={footAbove(1420)} size={700} frame={f} /></svg>', "import {Figure} from '../illo/figure';\nimport {footAbove} from '../../lib/guard.mjs';").length === 0, 'the guards: a film may place with ../../lib/guard.mjs');
    // the polish guards (src/lib/guard.mjs POLISH_FROM, 2026-10-26: v131-three-minutes)
    const layer = "import {OBJ, FIG} from '../../lib/layer';";
    const st = (inner) => `<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>${inner}{f}</svg>`;
    ok(film('V135Mark', st('<g className={f > 2 ? OBJ : undefined}><rect x={200} y={600} width={400} height={300} /></g>'), layer).some((e) => /a mark only in some shots/.test(e)), "polish: a mark only in some shots (v131's wheel) is refused");
    ok(film('V135MarkAnd', st('<g className={(f > 2 && FIG) || undefined}><rect x={200} y={600} width={400} height={300} /></g>'), layer).some((e) => /a mark only in some shots/.test(e)), 'polish: a mark behind && too');
    ok(film('V135MarkOk', st('<g className={OBJ}><rect x={200} y={600} width={400} height={300} /></g>'), layer).length === 0, 'polish: an always-on mark passes');
    ok(film('V133Mark', st('<g className={f > 2 ? OBJ : undefined}><rect x={200} y={600} width={400} height={300} /></g>'), layer).length === 0, 'polish: v133 was made before it');
    ok(film('V135Bleed', st('<g className={BLEED}><rect x={200} y={600} width={400} height={300} /></g>'), "import {BLEED} from '../../lib/layer';").some((e) => /BLEED is for the library/.test(e)), 'polish: a Film never marks BLEED');
    ok(film('V135Flag', st('<rect x={348} y={250} width={12} height={300} />')).some((e) => /meta line's strip/.test(e)), "polish: v131's flag pole at stage y 250 stands in the meta line's strip");
    ok(film('V135FlagComp', st('<Flag />'), 'const Flag: React.FC = () => <g opacity={0.9}><rect x={348} y={250} width={12} height={300} /></g>;').some((e) => /meta line's strip/.test(e)), "polish: the same flag drawn by a component of the file inside the full-stage picture (v131's Track)");
    ok(film('V135IconComp', '<div><svg width={120} height={120}><Icon /></svg>{f}</div>', 'const Icon: React.FC = () => <g><rect x={10} y={10} width={40} height={40} /></g>;').length === 0, 'polish: a component drawn only in a small svg keeps its own coordinates');
    ok(film('V135Clip', st('<defs><clipPath id="k"><rect x={-200} y={0} width={300} height={1920} /></clipPath></defs>')).length === 0, 'polish: a clip path is never drawn where it stands');
    ok(film('V135Sun', st('<circle cx={800} cy={300} r={60} />')).some((e) => /meta line's strip/.test(e)), 'polish: a sun over the meta line too');
    ok(film('V135Sky', st('<rect x={-400} y={-400} width={1880} height={1040} />')).length === 0, 'polish: a full-width sky behind it passes');
    ok(film('V135Moved', st('<g transform="translate(0 600)"><rect x={348} y={250} width={12} height={300} /></g>')).length === 0, 'polish: a shape a group moves down is not read by its own y');
    ok(film('V135Local', '<div style={{position: \'absolute\', left: 100, top: 900}}><svg width={400} height={300}><rect x={10} y={20} width={50} height={50} /></svg>{f}</div>').length === 0, 'polish: a small svg of its own (a card) keeps its own coordinates');
    ok(film('V135Band', st('<rect x={300} y={1400} width={200} height={60} />')).some((e) => /subtitle band/.test(e)), 'polish: a shape in the subtitle band');
    ok(film('V135BandText', st('<text x={540} y={1450}>x</text>')).some((e) => /a word in the subtitle band/.test(e)), 'polish: a word in the subtitle band');
    ok(film('V135Ground', st('<rect x={-400} y={1290} width={1880} height={1200} />')).length === 0, 'polish: a full-width ground through the band passes');
    ok(film('V135Ok', st('<rect x={200} y={600} width={400} height={300} /><text x={540} y={900}>x</text>')).length === 0, 'polish: shapes in the picture band pass');
    ok(film('V113Kit', '<Phone3 src={p.src ?? \'08-qr-card\'} pose={{x: 540, y: 900, w: 420, yaw: -6, pitch: 3}} />', "import {Phone3} from '../kit/phone3d';").length === 0, 'the kit: Phone3 on a real screen by its name');
    ok(film('V113KitUrl', '<Phone3 src="https://example.com/x.jpg" pose={{x: 540, y: 900, w: 420, yaw: -6, pitch: 3}} />', "import {Phone3} from '../kit/phone3d';").some((e) => /loads or links/.test(e)), 'the kit: a URL as a screen is refused');
    ok(film('V113Div', '<div src="x">{f}</div>').some((e) => /loads or links/.test(e)), 'src on a plain element is still refused');
    ok(film('V113Plumb', '<div>{f}</div>', "import {makeEnv} from '../kit/env';").some((e) => /makeEnv/.test(e)), "the kit's plumbing (makeEnv) is refused");
    ok(film('V113Ease', '<div style={{opacity: ease.inOut(0.5)}}>{f}</div>', "import {ease} from '../../lib/anim';").some((e) => /not an easing/.test(e)), 'ease.inOut is not an easing (v113)');
    ok(uses3d("import {Car3} from '../kit/car3d';") && !uses3d("import {Sym} from '../kit/icons';"), 'uses3d: the kit modules that draw in WebGL');
    ok(freshFilm('S3QrCard') && freshFilm('V113X') && !freshFilm('V112X') && freshFilm('FilmTemplate'), 'freshFilm: v113 on, the Story sets, the template');
    // the upgrade's first film is made with it: every ledger line numbered from KIT_FROM on carries "kit" (tools/ci/prompt.mjs
    // --record writes it). One without was made by the studio before the upgrade reached its branch (a film published while the
    // upgrade waited): its scene breaks the new rules, so KIT_FROM (src/lib/kit.mjs) and freeWeek.from (ci/endings.json) move
    // past it before the merge
    let led = {};
    try {
      led = JSON.parse(fs.readFileSync(path.join(root, 'specs/.studio.json'), 'utf8')) ?? {};
    } catch {}
    const early = Object.values(led).filter((e) => e && typeof e.id === 'string' && kitOn(e.id) && !e.kit).map((e) => e.id);
    ok(!early.length, `every film from v${KIT_FROM} on was made with the kit (${early.length ? `${early.join(', ')} was not: raise KIT_FROM in src/lib/kit.mjs and freeWeek.from in ci/endings.json past it` : 'none made without it'})`);
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
  console.log(bad ? `filmlint: ${bad} failed` : 'filmlint: all ok');
  return bad ? 1 : 0;
};

// ---- CLI ------------------------------------------------------------------------------------------------------
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) && process.argv[2] === '--test') process.exit(await selfTest());
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const targets = [];
  for (const a of args) {
    const m = /^(?:src\/scenes\/film\/)?([A-Za-z_][A-Za-z0-9_]*)(?:\.tsx)?$/.exec(a);
    if (!m) {
      console.error(`filmlint: "${a.slice(0, 60)}" is not a film: give its Name (V26NightScan) or src/scenes/film/<Name>.tsx`);
      process.exit(2);
    }
    targets.push(`${m[1]}.tsx`);
  }
  if (!targets.length) {
    if (fs.existsSync(FILM_DIR)) for (const f of fs.readdirSync(FILM_DIR).sort()) if (/^[A-Z][A-Za-z0-9]*\.tsx$/.test(f) || f === TEMPLATE.file) targets.push(f);
  }
  const lint = await lintReady();
  let bad = 0;
  for (const f of targets) {
    const full = path.join(FILM_DIR, f);
    // only files that really sit in src/scenes/film/ (no link out of it)
    let real = null;
    try {
      real = fs.realpathSync(full);
    } catch {}
    if (real && path.dirname(real) !== fs.realpathSync(FILM_DIR)) {
      console.log(`FILM ${f}: not a file of src/scenes/film/`);
      bad++;
      continue;
    }
    const {errors} = lint(full, f === TEMPLATE.file ? {name: TEMPLATE.name} : {});
    if (errors.length) {
      bad++;
      errors.forEach((e) => console.log(e));
    } else console.log(`film ${f}: ok`);
  }
  if (!targets.length) console.log('filmlint: no film files');
  process.exit(bad ? 1 : 0);
}
